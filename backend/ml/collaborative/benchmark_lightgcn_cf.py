"""
Benchmark LightGCN-CF và Graph CF nhẹ trên dataset benchmark công khai.

Chạy:
    python -m collaborative.benchmark_lightgcn_cf --dataset gowalla --epochs 30
    python -m collaborative.benchmark_lightgcn_cf --dataset yelp2018 --epochs 20
    python -m collaborative.benchmark_lightgcn_cf --dataset amazon-book --epochs 10 --n_eval 2000

Tham khảo bài báo:
    Benli Li, Hainian Zhang, "LightGCN-CF Hybrid Recommendation Algorithm...",
    ACM BDEIM 2025, DOI 10.1145/3800000.3800213
"""

import os
import sys
import time
import argparse

# Console Windows (cp1258) không in được tiếng Việt — force UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Đảm bảo import được module collaborative
_ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ML_DIR not in sys.path:
    sys.path.insert(0, _ML_DIR)

from collaborative.lightgcn_cf import load_benchmark_dataset, LightGCNCFRecommender
from collaborative.graph_cf import GraphCFRecommender


def run_benchmark(
    dataset_name: str,
    epochs: int = 30,
    n_eval: int = 3000,
    latent_dim: int = 64,
    sim_k: int = 50,
):
    print(f"\n{'='*70}")
    print(f"  DATASET: {dataset_name.upper()}")
    print(f"{'='*70}")

    dataset = load_benchmark_dataset(dataset_name)
    print(
        f"Users: {dataset.n_users}, Items: {dataset.n_items}, "
        f"Train interactions: {len(dataset.train_user)}, "
        f"Test users: {len(dataset.test_dict)}"
    )

    # Cảnh báo: item-similarity (sparse product R^T R) rất nặng với dataset lớn
    if dataset.n_items > 60000:
        print(
            "⚠️  Dataset rất lớn ("
            f"{dataset.n_items} items): bước xây item-similarity "
            "(sparse product R^T @ R) có thể chậm/ngốn bộ nhớ. "
            "Nên subsample user hoặc dùng --sim_k nhỏ để giảm tải "
            "các bước CF phía sau."
        )

    # ============ 1. Graph CF nhẹ (no PyTorch, scipy) ============
    print("\n--- Graph CF nhẹ (LightGCN-like, numpy/scipy) ---")
    t0 = time.time()
    graph_cf = GraphCFRecommender(n_layers=3, latent_dim=latent_dim)
    graph_cf.fit(dataset)
    fit_time = time.time() - t0
    print(f"Training time: {fit_time:.1f}s")
    res_graph = graph_cf.evaluate(ks=[10, 20], n_eval_users=n_eval)
    print(
        f"  Recall@10={res_graph.get('recall@10', 0):.4f}, "
        f"Recall@20={res_graph.get('recall@20', 0):.4f}, "
        f"NDCG@10={res_graph.get('ndcg@10', 0):.4f}, "
        f"NDCG@20={res_graph.get('ndcg@20', 0):.4f} "
        f"(n={res_graph.get('n_eval_users', 0)})"
    )

    # ============ 2. LightGCN-CF (PyTorch) ============
    print(f"\n--- LightGCN-CF (PyTorch, {epochs} epochs) ---")
    t0 = time.time()
    rec = LightGCNCFRecommender(
        latent_dim=latent_dim,
        n_layers=3,
        epochs=epochs,
        batch_size=2048,
        lr=0.001,
        reg=1e-4,
        fusion_init=0.5,
        sim_k=sim_k,
    )
    rec.fit(dataset)
    fit_time = time.time() - t0
    print(f"Training time: {fit_time:.1f}s")
    res_lgcn = rec.evaluate(ks=[10, 20], n_eval_users=n_eval)
    print(
        f"  Recall@10={res_lgcn.get('recall@10', 0):.4f}, "
        f"Recall@20={res_lgcn.get('recall@20', 0):.4f}, "
        f"NDCG@10={res_lgcn.get('ndcg@10', 0):.4f}, "
        f"NDCG@20={res_lgcn.get('ndcg@20', 0):.4f}, "
        f"fusion_w={res_lgcn.get('fusion_weight', '?')} "
        f"(n={res_lgcn.get('n_eval_users', 0)})"
    )

    # ============ 3. Demo recommend ============
    print("\n--- Demo gợi ý ---")
    demo_user = next(iter(dataset.test_dict.keys()))
    recs = rec.recommend(demo_user, top_n=5)
    print(f"User {demo_user} (đã mua {len(dataset.test_dict[demo_user])} item trong test):")
    for r in recs[:5]:
        print(f"  - item {r['product_id']} (score={r['score']:.4f}, "
              f"gcn={r['gcn_score']:.4f}, cf={r['cf_score']:.4f})")

    # ============ Tổng kết ============
    print("\n--- TỔNG KẾT ---")
    print(f"{'Method':<14} | {'Recall@10':<10} {'Recall@20':<10} {'NDCG@10':<10} {'NDCG@20':<10}")
    print('-' * 55)
    print(f"{'GraphCF (nhẹ)':<14} | "
          f"{res_graph.get('recall@10', 0):<10.4f} {res_graph.get('recall@20', 0):<10.4f} "
          f"{res_graph.get('ndcg@10', 0):<10.4f} {res_graph.get('ndcg@20', 0):<10.4f}")
    print(f"{'LightGCN-CF':<14} | "
          f"{res_lgcn.get('recall@10', 0):<10.4f} {res_lgcn.get('recall@20', 0):<10.4f} "
          f"{res_lgcn.get('ndcg@10', 0):<10.4f} {res_lgcn.get('ndcg@20', 0):<10.4f}")


def main():
    parser = argparse.ArgumentParser(description='Benchmark LightGCN-CF & Graph CF')
    parser.add_argument('--dataset', choices=['gowalla', 'yelp2018', 'amazon-book'],
                        default='gowalla')
    parser.add_argument('--epochs', type=int, default=30)
    parser.add_argument('--n_eval', type=int, default=3000,
                        help='Số user tối đa dùng đánh giá (test set)')
    parser.add_argument('--latent_dim', type=int, default=64)
    parser.add_argument('--sim_k', type=int, default=50,
                        help='Số hàng xóm top-k cho item similarity (nhỏ hơn = nhẹ hơn)')
    args = parser.parse_args()

    run_benchmark(args.dataset, epochs=args.epochs, n_eval=args.n_eval,
                  latent_dim=args.latent_dim, sim_k=args.sim_k)


if __name__ == '__main__':
    main()
