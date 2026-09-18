"""
Benchmark HSP & RIC trên các dataset công khai (theo bài báo Delianidi et al. 2023).

Chạy:
    python -m session.benchmark_hsp_ric --dataset yoochoose
    python -m session.benchmark_hsp_ric --dataset diginetica
    python -m session.benchmark_hsp_ric --dataset all --max_test 5000

Giao thức đánh giá giống bài báo:
- Train trên tập train, dựng đồ thị (co-occurrence, sequence, P0/P1/P2).
- Trên tập test: với mỗi phiên prefix, gợi ý top-K và kiểm tra xem
  item mục tiêu (next item) có nằm trong danh sách không.
- Metrics: MRR@K và Recall@K với K = 10, 20, 30.
"""

import os
import sys
import time
import pickle
import argparse
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

import numpy as np

# Đảm bảo import được module session
_ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ML_DIR not in sys.path:
    sys.path.insert(0, _ML_DIR)

from session.session_recommender import (
    SessionRecommender, SessionConfig,
)

# pandas chỉ cần cho Diginetica — import lười để Yoochoose chạy được dù thiếu pandas
try:
    import pandas as pd
except ImportError:
    pd = None

DATASET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'datasets')


# ============================================================
# Data loaders
# ============================================================

def load_yoochoose() -> Tuple[List[Dict], List[Dict]]:
    """
    Load Yoochoose dataset (RecoHut format: pickle (prefixes, targets)).

    Ghi chú phương pháp: mỗi prefix (tiền tố của session) được coi như một
    session độc lập để train — khác với việc dựng lại đầy đủ session gốc.
    Điều này làm tăng nhẹ thống kê pair/triplet nhưng là cách tiếp cận hợp lệ
    cho benchmark (tương tự cách SR-GNN tiền xử lý dataset).

    Returns:
        (train_sessions, test_samples)
        train_sessions: [{session_id, items, created_at}]
        test_samples:   [{prefix: [...], target: item_id}]
    """
    train_path = os.path.join(DATASET_DIR, 'yoochoose', 'train.txt')
    test_path = os.path.join(DATASET_DIR, 'yoochoose', 'test.txt')

    if not os.path.exists(train_path) or not os.path.exists(test_path):
        raise FileNotFoundError(
            f"Không tìm thấy Yoochoose dataset trong {DATASET_DIR}/yoochoose/.\n"
            "Tải về từ: https://github.com/RecoHut-Datasets/yoochoose"
        )

    with open(train_path, 'rb') as f:
        train_data = pickle.load(f)
    with open(test_path, 'rb') as f:
        test_data = pickle.load(f)

    train_prefixes, train_targets = train_data  # (list[list], list[int])
    test_prefixes, test_targets = test_data

    # Mỗi prefix là một chuỗi item hợp lệ từ session — dùng làm session để fit
    train_sessions = [
        {'session_id': f'yc_{i}', 'items': [str(x) for x in seq], 'created_at': None}
        for i, seq in enumerate(train_prefixes)
    ]

    test_samples = [
        {'prefix': [str(x) for x in seq], 'target': str(tgt)}
        for seq, tgt in zip(test_prefixes, test_targets)
    ]

    return train_sessions, test_samples


def load_diginetica() -> Tuple[List[Dict], List[Dict]]:
    """
    Load Diginetica dataset (CIKM Cup 2016) từ train-item-views.csv.

    Returns:
        (train_sessions, test_samples) — chia 80/20 theo session.
    """
    if pd is None:
        raise RuntimeError("Diginetica cần pandas. Cài bằng: pip install pandas")

    path = os.path.join(DATASET_DIR, 'diginetica', 'train-item-views.csv')
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Không tìm thấy Diginetica dataset trong {DATASET_DIR}/diginetica/.\n"
            "Tải về từ: https://github.com/RecoHut-Datasets/diginetica"
        )
    df = pd.read_csv(path, sep=';', usecols=['sessionId', 'itemId', 'timeframe'])

    # Sắp theo session + thời gian, gộp itemId thành danh sách theo session (vectorized)
    df = df.sort_values(['sessionId', 'timeframe'])
    grouped = df.groupby('sessionId')['itemId'].agg(list)

    session_items = []
    for sid, items in grouped.items():
        items_str = [str(x) for x in items]
        if len(items_str) >= 2:  # Bỏ session chỉ có 1 item
            session_items.append({'session_id': str(sid), 'items': items_str, 'created_at': None})

    # Chia train/test 80/20 (giống bài báo)
    n = len(session_items)
    split = int(n * 0.8)
    rng = np.random.RandomState(42)
    idx = rng.permutation(n)
    train_sessions = [session_items[i] for i in idx[:split]]
    test_sessions = [session_items[i] for i in idx[split:]]

    # Test samples: với mỗi phiên test, prefix = tất cả trừ item cuối, target = item cuối
    test_samples = [
        {'prefix': s['items'][:-1], 'target': s['items'][-1]}
        for s in test_sessions
    ]

    return train_sessions, test_samples


# ============================================================
# Metrics (MRR@K, Recall@K theo bài báo)
# ============================================================

def compute_mrr_recall(
    recommendations_list: List[List[str]],
    targets: List[str],
    ks: List[int] = (10, 20, 30),
) -> Dict[str, Dict[str, float]]:
    """
    Tính MRR@K và Recall@K.

    MRR@K = mean(1 / rank(target)) — rank bắt đầu từ 1, nếu không có trong top-K thì = 0.
    Recall@K = tỷ lệ target nằm trong top-K.
    """
    n = len(targets)
    results = {f'mrr@{k}': 0.0 for k in ks}
    results.update({f'recall@{k}': 0.0 for k in ks})

    for recs, target in zip(recommendations_list, targets):
        for k in ks:
            top_k = recs[:k]
            if target in top_k:
                results[f'recall@{k}'] += 1
                rank = top_k.index(target) + 1
                results[f'mrr@{k}'] += 1.0 / rank

    # Tránh chia cho 0 khi không có sample nào được đánh giá
    if n == 0:
        return results

    for key in results:
        results[key] = round(results[key] / n, 4)

    return results


# ============================================================
# Evaluation
# ============================================================

def evaluate_model(
    model,
    method_name: str,
    test_samples: List[Dict],
    max_test: int,
    ks: List[int] = (10, 20, 30),
    alpha: Optional[float] = None,
) -> Dict:
    """Đánh giá một model trên test samples."""
    recs_list = []
    targets = []

    for sample in test_samples[:max_test]:
        prefix = sample['prefix']
        target = sample['target']
        if not prefix:
            continue

        kwargs = {'top_n': max(ks), 'strategy': method_name}
        if alpha is not None and method_name in ('ric', 'ric_cil'):
            kwargs['alpha'] = alpha
        recs = model.recommend(prefix, **kwargs)
        recs_list.append([r['product_id'] for r in recs])
        targets.append(target)

    metrics = compute_mrr_recall(recs_list, targets, ks)
    metrics['n_evaluated'] = len(targets)
    return metrics


def run_benchmark(dataset_name: str, max_test: int = 5000, ks: List[int] = (10, 20, 30)):
    """Chạy benchmark cho một dataset."""
    print(f"\n{'='*70}")
    print(f"  DATASET: {dataset_name.upper()}")
    print(f"{'='*70}")

    if dataset_name == 'yoochoose':
        train_sessions, test_samples = load_yoochoose()
    elif dataset_name == 'diginetica':
        train_sessions, test_samples = load_diginetica()
    else:
        raise ValueError(f"Unknown dataset: {dataset_name}")

    print(f"Train sessions: {len(train_sessions)}, Test samples: {len(test_samples)}")

    # Huấn luyện
    t0 = time.time()
    rec = SessionRecommender(SessionConfig(top_n=30))
    rec.fit(train_sessions)
    train_time = time.time() - t0
    print(f"Training time: {train_time:.2f}s")

    # Đánh giá từng phương pháp
    methods = [
        'cooccurrence',  # Pair Popularity (baseline gần giống bài báo)
        'sequence',      # Markov chain (baseline hiện có)
        'hsp',           # Hierarchical Sequence Probability
        'ric',           # Recurrent Item Co-occurrence (plain)
        'ric_cil',       # RIC — Current-item-Last
    ]

    print(f"\n{'Method':<14} | {'MRR@10':<8} {'MRR@20':<8} {'MRR@30':<8} | {'Rec@10':<8} {'Rec@20':<8} {'Rec@30':<8}")
    print('-' * 84)

    for method in methods:
        t1 = time.time()
        metrics = evaluate_model(rec, method, test_samples, max_test, ks)
        elapsed = time.time() - t1

        print(
            f"{method:<14} | "
            f"{metrics['mrr@10']:<8.4f} {metrics['mrr@20']:<8.4f} {metrics['mrr@30']:<8.4f} | "
            f"{metrics['recall@10']:<8.4f} {metrics['recall@20']:<8.4f} {metrics['recall@30']:<8.4f} "
            f"| n={metrics['n_evaluated']} ({elapsed:.1f}s)"
        )

    # Test thử RIC với các giá trị alpha khác nhau (bài báo test 0.1–0.9)
    # Không cần fit lại: alpha chỉ ảnh hưởng lúc recommend nên dùng chung model đã fit
    print(f"\n--- Tuning alpha cho RIC trên {dataset_name} ---")
    for alpha in [0.1, 0.3, 0.5, 0.7, 0.9]:
        metrics = evaluate_model(rec, 'ric_cil', test_samples, min(max_test, 2000), [10, 20], alpha=alpha)
        print(f"alpha={alpha:.1f}: MRR@10={metrics['mrr@10']:.4f}, Rec@10={metrics['recall@10']:.4f}, "
              f"MRR@20={metrics['mrr@20']:.4f}, Rec@20={metrics['recall@20']:.4f}")

    print()


def main():
    parser = argparse.ArgumentParser(description='Benchmark HSP & RIC trên dataset công khai')
    parser.add_argument('--dataset', choices=['yoochoose', 'diginetica', 'all'], default='yoochoose')
    parser.add_argument('--max_test', type=int, default=5000, help='Số lượng test samples tối đa')
    args = parser.parse_args()

    if args.dataset == 'all':
        for ds in ['yoochoose', 'diginetica']:
            run_benchmark(ds, args.max_test)
    else:
        run_benchmark(args.dataset, args.max_test)


if __name__ == '__main__':
    main()
