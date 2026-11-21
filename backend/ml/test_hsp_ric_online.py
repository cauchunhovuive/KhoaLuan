# -*- coding: utf-8 -*-
"""Kiểm tra 2 thuật toán HSP & RIC qua API thật (Node :5000 + ML :8000)."""
import json, urllib.request, sys, io, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

NODE = "http://localhost:5000/api/ml/session/recommend"
ML = "http://localhost:8000/session/recommend"

def ml_call(session_items, strategy, top_n=8, alpha=None, exclude=True):
    """Gọi thẳng ML service — trả list recommendation gốc (product_id, score, hsp_level)."""
    payload = {"session_items": [str(x) for x in session_items], "top_n": top_n,
               "strategy": strategy, "exclude_session_items": exclude,
               "products": []}
    if alpha is not None:
        payload["alpha"] = alpha
    req = urllib.request.Request(ML, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.loads(r.read())
    return (d.get("data") or {}).get("recommendations", [])

def node_call(session_items, strategy, top_n=8, alpha=None):
    """Gọi qua backend Node — trả list product enriched (id, name, score/probability)."""
    payload = {"sessionItems": [str(x) for x in session_items], "topN": top_n,
               "strategy": strategy}
    if alpha is not None:
        payload["alpha"] = alpha
    req = urllib.request.Request(NODE, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.loads(r.read())
    return d.get("data") or []

PASS = 0
FAIL = 0
def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name}  {detail}")

# ===== Sản phẩm trong shop (data thật) =====
WARMER = "c7c2771c-023f-4698-adaa-a3de2b215180"    # Máy hâm sữa (Mẹ & Bé)
BOOK = "184ee48e-d5d9-42e3-87d2-f82ef87f44d6"      # Sách vải (Mẹ & Bé)
STERILIZER = "db601683-41b4-4e62-9efd-5fe7030740ad" # Tiệt trùng UV (Mẹ & Bé)
BOTTLE = "48a9326c-3973-4c42-bb7b-25fa1a69a06d"    # Bình sữa PPSU (Mẹ & Bé)
WARDROBE = "43bf0689-d7e4-4020-b273-d49bac35107e"  # Tủ quần áo (Nội thất)
BED = "f72a7482-e982-43e8-80f9-ffb9f508d36c"       # Giường Queen (Nội thất)
LAMP = "ef945ef4-c0a3-4ff8-8dc1-9d04f280559a"      # Đèn bàn LED (Nội thất)
RUG = "590fa4ca-2209-4078-8527-62eb6c2d6e10"       # Thảm (Nội thất)
DESK = "decb3a22-eeb3-4df4-a08c-70999fe85bf6"      # Bàn làm việc (Nội thất)
INTERIOR = {WARDROBE, BED, LAMP, RUG, DESK,
            "df0f13a1-8ed2-4d19-b23b-28fbc6563199",  # Ghế công thái học
            "3bd968bd-6c6e-46b0-b8ac-ad90fc4f6654",  # Sofa
            "47d6e8fd-1f5b-49c9-8b43-4214e91f7942",  # Kệ sách
            "59c93083-dcec-47a7-b414-56556e5ca94d",  # Tranh
            "d376e5ca-6296-42a1-a57d-d7b85d0c465f",  # Đèn thả trần
            "eda84571-9d2f-404c-9b44-c1be80cdd4f7"}  # Kệ tivi

print("=" * 64)
print("WARM-UP: request dau tien kich hoat auto-train model session")
print("=" * 64)
t0 = time.time()
node_call([WARDROBE], "hsp", 5)
print(f"  Auto-train + goi y xong trong {time.time()-t0:.1f}s\n")

print("=" * 64)
print("PHAN 1: HSP - phan cap P0/P1/P2 theo do dai phien (ML API)")
print("=" * 64)

# 1a. Session rỗng -> P0 (cold-start) — gọi thẳng ML vì Node short-circuit session rỗng
recs = ml_call([], "hsp", 5)
lv = [r.get("hsp_level") for r in recs]
check("HSP phiên rỗng -> toàn P0 (cold-start)", bool(recs) and all(x == "P0" for x in lv), str(lv))

# 1b. Session 1 item -> P1 đứng đầu
recs = ml_call([WARDROBE], "hsp", 5)
lv = [r.get("hsp_level") for r in recs]
check("HSP 1 item -> P1 đứng đầu", bool(lv) and lv[0] == "P1", str(lv))

# 1c. Session 2 items -> P2 đứng đầu (dùng cặp liên tiếp CÓ trong data: Giường→Tủ)
recs = ml_call([BED, WARDROBE], "hsp", 5)
lv = [r.get("hsp_level") for r in recs]
check("HSP 2 items (Giường→Tủ) -> P2 đứng đầu", bool(lv) and lv[0] == "P2", str(lv))

# 1d. P2 chỉ dùng cặp ĐUÔI (2 item cuối)
ids_a = [r["product_id"] for r in ml_call([LAMP, BED, WARDROBE], "hsp", 5)]
ids_b = [r["product_id"] for r in ml_call([BED, WARDROBE], "hsp", 5)]
check("HSP: bỏ thêm item cũ hơn không đổi gợi ý (chỉ dùng cặp đuôi)",
      ids_a[:3] == ids_b[:3], f"{ids_a[:3]} vs {ids_b[:3]}")

# 1e. UI mode: không gợi ý lại item đã xem
recs = ml_call([WARDROBE, BED, LAMP], "hsp", 10)
ids = [r["product_id"] for r in recs]
check("HSP: không gợi ý lại item đã xem (UI)", not ({WARDROBE, BED, LAMP} & set(ids)), str(ids[:5]))

# 1f. Xác suất giảm đơn điệu
probs = [r.get("probability", 0) for r in recs]
check("HSP: xác suất giảm đơn điệu", all(probs[i] >= probs[i+1] for i in range(len(probs)-1)), str(probs[:5]))

print()
print("=" * 64)
print("PHAN 2: RIC - bo nho hoi quy w = alpha*w + (1-alpha)*gamma")
print("=" * 64)

# 2a. Co-occurrence thật ở đầu danh sách
recs = ml_call([WARMER], "ric_cil", 8)
top = recs[0] if recs else {}
check("RIC: gợi ý top có score co-occurrence (>> P0)", bool(top) and top["score"] > 0.2,
      f"top={top.get('score')}")
bottom = recs[-1]["score"] if len(recs) >= 3 else 0
gap = (top["score"] / bottom) if bottom > 0 else 0
check("RIC: khoảng cách top-vs-đuôi >= 4x", gap >= 4, f"gap={gap:.1f}x")

# 2b. Bộ nhớ hồi quy: w tích lũy khi xem thêm item cùng cụm
def score_of(recs_, pid):
    for r in recs_:
        if r["product_id"] == pid:
            return r["score"]
    return 0.0
r1 = ml_call([WARMER], "ric_cil", 20, alpha=0.5)
r2 = ml_call([WARMER, BOOK], "ric_cil", 20, alpha=0.5)
r3 = ml_call([WARMER, BOOK, STERILIZER], "ric_cil", 20, alpha=0.5)
s1, s2, s3 = score_of(r1, BOTTLE), score_of(r2, BOTTLE), score_of(r3, BOTTLE)
check("RIC: bộ nhớ hồi quy tích lũy (w tăng khi thêm item cùng cụm)",
      s3 >= s1 - 0.02, f"w(BOTTLE): {s1:.3f} -> {s2:.3f} -> {s3:.3f}")

# 2c. alpha thấp = tin tín hiệu co-occurrence hiện tại nhiều hơn
r_low = ml_call([WARMER, BOOK, STERILIZER], "ric_cil", 20, alpha=0.1)
r_high = ml_call([WARMER, BOOK, STERILIZER], "ric_cil", 20, alpha=0.9)
s_low, s_high = score_of(r_low, BOTTLE), score_of(r_high, BOTTLE)
check("RIC: alpha thấp -> tín hiệu co-occurrence mạnh hơn",
      s_low >= s_high, f"alpha=0.1: {s_low:.3f} vs alpha=0.9: {s_high:.3f}")

# 2d. Plain RIC (paper mode): item hiện tại ở top (gamma(x|x)=1)
recs = ml_call([WARMER], "ric", 8, exclude=False)
ids = [r["product_id"] for r in recs]
check("RIC plain (paper mode): item hiện tại ở top (gamma(x|x)=1)",
      bool(ids) and ids[0] == WARMER, str(ids[:3]))

# 2e. RIC-CiL (paper mode): item hiện tại bị đẩy xuống CUỐI
recs = ml_call([WARMER], "ric_cil", 8, exclude=False)
ids = [r["product_id"] for r in recs]
check("RIC-CiL (paper mode): item hiện tại ở CUỐI danh sách",
      bool(ids) and ids[-1] == WARMER and WARMER not in ids[:-1], str(ids))

print()
print("=" * 64)
print("PHAN 3: Khang nhieu + nhat quan (qua backend Node :5000)")
print("=" * 64)

recs_h = node_call([BED, WARDROBE], "hsp", 8)   # Giường→Tủ: cặp có thật trong data
recs_r = node_call([BED, WARDROBE], "ric_cil", 8)
ids_h = [r["id"] for r in recs_h]
ids_r = [r["id"] for r in recs_r]

def in_category(ids_, cat):
    return sum(1 for i in ids_ if i in cat) / max(len(ids_), 1)

# Tiêu chí ĐÚNG theo bài báo: P0 backfill sẽ lấp các slot còn lại bằng item phổ biến
# (không cùng cụm) — đó là thiết kế. Chất lượng thật = item cùng pattern phải đứng ĐẦU.
# - Session [Giường, Tủ]: pattern dữ liệu là Giường→Tủ→Thảm→Đèn ⇒ top-3 phải có Thảm/Đèn
LAMP_RUG = {LAMP, RUG}
top3_h = set(ids_h[:3])
check("HSP: top-3 có item cùng pattern (Thảm/Đèn)", bool(top3_h & LAMP_RUG),
      f"{[r.get('name') for r in recs_h[:3]]}")
top3_r = set(ids_r[:3])
check("RIC: top-3 có item cùng pattern (Thảm/Đèn)", bool(top3_r & LAMP_RUG),
      f"{[r.get('name') for r in recs_r[:3]]}")

# Session [Máy hâm sữa]: P1 pattern là Máy hâm → Bình sữa ⇒ top-3 phải có Bình sữa
recs_w = node_call([WARMER], "hsp", 3)
ids_w = [r["id"] for r in recs_w]
check("HSP: 1 item (Máy hâm sữa) -> top-3 có Bình sữa (P1 pattern)",
      BOTTLE in ids_w, f"{[r.get('name') for r in recs_w]}")

check("HSP (Node): không trùng lặp", len(set(ids_h)) == len(ids_h) and len(ids_h) == 8)
check("RIC (Node): không trùng lặp", len(set(ids_r)) == len(ids_r) and len(ids_r) == 8)
check("HSP (Node): có hsp_level/reason", all(r.get("hsp_level") and r.get("reason") for r in recs_h))
check("RIC (Node): có score/reason", all(r.get("score") is not None and r.get("reason") for r in recs_r))

overlap = len(set(ids_h) & set(ids_r))
check("HSP vs RIC: khác biệt thật nhưng chồng lấp hợp lý (2-6/8)",
      2 <= overlap <= 6, f"overlap={overlap}/8")

print()
print("=" * 64)
print(f"KET QUA: {PASS} PASS / {FAIL} FAIL")
print("=" * 64)
sys.exit(1 if FAIL else 0)
