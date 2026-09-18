"""Kiểm tra nhanh (smoke test) HSP & RIC — chạy: python test_hsp_ric_smoke.py"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from session.session_recommender import SessionRecommender, SessionConfig

sessions = [
    {'session_id': 's1', 'items': ['a', 'b', 'c']},
    {'session_id': 's2', 'items': ['a', 'b', 'd']},
    {'session_id': 's3', 'items': ['b', 'c', 'd', 'e']},
    {'session_id': 's4', 'items': ['x', 'y', 'z']},
]

rec = SessionRecommender(SessionConfig(top_n=5))
rec.fit(sessions)

strategies = ['cooccurrence', 'sequence', 'hsp', 'ric', 'ric_cil', 'hybrid', 'popularity']
for strat in strategies:
    res = rec.recommend(['a', 'b'], top_n=5, strategy=strat)
    ids = [r['product_id'] for r in res]
    print(f"{strat:12s} -> {ids}")

# alpha sweep không cần fit lại
res_a = rec.recommend(['a', 'b'], top_n=5, strategy='ric_cil', alpha=0.1)
print(f"ric_cil alpha=0.1 -> {[r['product_id'] for r in res_a]}")

# Kiểm tra HSP recommend cho phiên có 1 item (cold start dùng P0)
res_cs = rec.recommend(['a'], top_n=3, strategy='hsp')
print(f"hsp cold-start ['a'] -> {[r['product_id'] for r in res_cs]}")

# Kiểm tra kết quả theo từng chiến lược (mỗi chiến lược có đặc điểm riêng):
# - hsp/ric/ric_cil: đủ top_n và không gợi ý lại item đã xem
# - cooccurrence/sequence/hybrid: có thể trả ít hơn top_n (điều kiện dữ liệu hạn chế)
# - popularity: fallback trả top sản phẩm phổ biến, có thể gồm item đã xem (đúng thiết kế)
for strat in strategies:
    res = rec.recommend(['a', 'b'], top_n=5, strategy=strat)
    ids = [r['product_id'] for r in res]
    assert len(ids) > 0, f"{strat}: không có gợi ý nào"
    assert len(set(ids)) == len(ids), f"{strat}: có gợi ý trùng lặp {ids}"
    if strat in ('hsp', 'ric', 'ric_cil'):
        assert len(ids) == 5, f"{strat}: chỉ có {len(ids)} gợi ý"
        assert not (set(ids) & {'a', 'b'}), f"{strat}: gợi ý lại item đã xem {ids}"

print("\nSMOKE TEST PASSED")
