"""Smoke test LightGCN-CF & Graph CF nhẹ — chạy: python test_lightgcn_cf_smoke.py"""
import os
import sys

# Console Windows (cp1258) không in được tiếng Việt — force UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from collaborative.lightgcn_cf import LightGCNCFRecommender, LightGCNCFDataset, load_benchmark_dataset
from collaborative.graph_cf import GraphCFRecommender

# ---- 1. Dataset Gowalla (nhỏ nhất) ----
print("=== Load dataset Gowalla ===")
dataset = load_benchmark_dataset('gowalla')
print(f"Users: {dataset.n_users}, Items: {dataset.n_items}")

# ---- 2. Graph CF nhẹ ----
print("\n=== Graph CF nhẹ (no PyTorch) ===")
graph_cf = GraphCFRecommender(n_layers=3, latent_dim=32)
graph_cf.fit(dataset)
res = graph_cf.evaluate(ks=[10, 20], n_eval_users=500)
print(f"Recall@10={res['recall@10']}, Recall@20={res['recall@20']}, "
      f"NDCG@10={res['ndcg@10']}, NDCG@20={res['ndcg@20']}")

demo_user = next(iter(dataset.test_dict.keys()))
recs = graph_cf.recommend(demo_user, top_n=5)
print(f"Recommend user {demo_user}: {[r['product_id'] for r in recs]}")
assert len(recs) <= 5 and all(r['score'] > 0 for r in recs), "Graph CF recommend lỗi"

# ---- 3. LightGCN-CF (PyTorch, ít epochs để test nhanh) ----
print("\n=== LightGCN-CF (PyTorch, 2 epochs) ===")
rec = LightGCNCFRecommender(
    latent_dim=16, n_layers=2, epochs=2, batch_size=2048,
    lr=0.01, reg=1e-4, sim_k=5,
)
rec.fit(dataset)
res2 = rec.evaluate(ks=[10, 20], n_eval_users=200)
print(f"Recall@10={res2['recall@10']}, Recall@20={res2['recall@20']}, "
      f"NDCG@10={res2['ndcg@10']}, NDCG@20={res2['ndcg@20']}, "
      f"fusion_w={res2['fusion_weight']}")

recs2 = rec.recommend(demo_user, top_n=5)
print(f"Recommend user {demo_user}: {[r['product_id'] for r in recs2]}")
assert len(recs2) <= 5, "LightGCN-CF recommend lỗi"
assert all(r['score'] > 0 for r in recs2), "LightGCN-CF score <= 0"
if recs2:
    assert 0.0 <= recs2[0]['fusion_weight'] <= 1.0, "fusion weight ngoài [0,1]"

print("\nSMOKE TEST PASSED")
