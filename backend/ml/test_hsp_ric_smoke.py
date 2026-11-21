"""Kiểm tra nhanh (smoke test) HSP & RIC — chạy: python test_hsp_ric_smoke.py"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from session.session_recommender import SessionRecommender, SessionConfig

# Data toy có SUPPORT >= 2 (khớp min_support=2): pattern a→b→c lặp lại,
# một số cặp/triplet chỉ xuất hiện 1 lần (nhiễu) phải bị lọc bỏ.
sessions = [
    {'session_id': 's1', 'items': ['a', 'b', 'c']},   # a→b→c (lần 1)
    {'session_id': 's1b', 'items': ['a', 'b', 'c']},  # a→b→c (lần 2)
    {'session_id': 's2', 'items': ['a', 'b', 'd']},   # a→b→d (triplet nhiễu, count=1)
    {'session_id': 's3', 'items': ['b', 'c', 'd', 'e']},
    {'session_id': 's4', 'items': ['x', 'y', 'z']},   # cụm nhiễu độc lập
]

rec = SessionRecommender(SessionConfig(top_n=5))
rec.fit(sessions)

# Metadata auto-retrain (mới): model phải ghi nhận số phiên + thời điểm train
assert getattr(rec, 'sessions_used', 0) == len(sessions), \
    f"sessions_used={getattr(rec, 'sessions_used', 0)} phải = {len(sessions)}"
assert getattr(rec, 'trained_at', None) is not None, "trained_at phải được ghi"

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
# - hsp/ric/ric_cil: đủ top_n và không gợi ý lại item đã xem khi exclude_session_items=True
#   (chế độ benchmark mặc định False: đúng bài báo, item đã xem vẫn có thể xuất hiện lại)
# - cooccurrence/sequence/hybrid: có thể trả ít hơn top_n (điều kiện dữ liệu hạn chế)
# - popularity: fallback trả top sản phẩm phổ biến, có thể gồm item đã xem (đúng thiết kế)
for strat in strategies:
    res = rec.recommend(['a', 'b'], top_n=5, strategy=strat)
    ids = [r['product_id'] for r in res]
    assert len(ids) > 0, f"{strat}: không có gợi ý nào"
    assert len(set(ids)) == len(ids), f"{strat}: có gợi ý trùng lặp {ids}"
    if strat in ('hsp', 'ric', 'ric_cil'):
        assert len(ids) == 5, f"{strat}: chỉ có {len(ids)} gợi ý"
        # Chế độ benchmark (mặc định): không trùng lặp, nhưng có thể gợi ý lại item đã xem
        # Chế độ production UI: loại MỌI item đã xem khỏi kết quả
        res_prod = rec.recommend(['a', 'b'], top_n=5, strategy=strat, exclude_session_items=True)
        ids_prod = [r['product_id'] for r in res_prod]
        assert len(set(ids_prod)) == len(ids_prod), f"{strat}: có gợi ý trùng lặp {ids_prod}"
        assert not (set(ids_prod) & {'a', 'b'}), f"{strat}: gợi ý lại item đã xem ở chế độ UI {ids_prod}"

# Kiểm tra hierarchy HSP theo bước t (đúng bài báo):
# t=1 (phiên rỗng) -> P0 ; t=2 (1 item) -> P1 ; t>=3 (2 item) -> P2 -> P1 -> P0
res_t1 = rec.recommend([], top_n=5, strategy='hsp')
assert all(r['hsp_level'] == 'P0' for r in res_t1), f"t=1 phải dùng P0: {[r['hsp_level'] for r in res_t1]}"
res_t2 = rec.recommend(['a'], top_n=5, strategy='hsp')
levels_t2 = [r['hsp_level'] for r in res_t2]
assert levels_t2[0] == 'P1', f"t=2 phải bắt đầu bằng P1: {levels_t2}"
res_t3 = rec.recommend(['a', 'b'], top_n=5, strategy='hsp')
levels_t3 = [r['hsp_level'] for r in res_t3]
assert levels_t3[0] == 'P2', f"t>=3 phải bắt đầu bằng P2: {levels_t3}"
assert 'P0' in levels_t3 or len(res_t3) < 5, f"t>=3 phải bổ sung P0 khi thiếu: {levels_t3}"

# Min-support: triplet nhiễu count=1 (a,b,d) phải bị lọc — 'd' không được đứng
# trong nhóm P2 của cặp (a,b) (chỉ 'c' có support 2)
p2_ids = [r['product_id'] for r in rec.hsp.recommend(['a', 'b'], top_n=5) if r['hsp_level'] == 'P2']
assert 'd' not in p2_ids, f"triplet count=1 phải bị lọc bởi min_support: {p2_ids}"
assert 'c' in p2_ids, f"triplet count=2 phải được giữ: {p2_ids}"

# Kiểm tra RIC-CiL: item hiện tại ('b') phải bị đẩy xuống CUỐI danh sách
res_cil = rec.recommend(['a', 'b'], top_n=5, strategy='ric_cil')
ids_cil = [r['product_id'] for r in res_cil]
assert 'b' not in ids_cil or ids_cil[-1] == 'b', f"RIC-CiL phải đẩy item hiện tại xuống cuối: {ids_cil}"

# Plain RIC: item hiện tại ở đầu (gamma(x|x)=1, đúng bài báo)
res_plain = rec.recommend(['a', 'b'], top_n=5, strategy='ric')
assert res_plain[0]['product_id'] == 'b', \
    f"plain RIC phải đặt item hiện tại ('b') ở đầu: {[r['product_id'] for r in res_plain]}"

print("\nSMOKE TEST PASSED")
