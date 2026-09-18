"""
DEMO TRÌNH CHIẾU BÀI BÁO — Session-Based Recommendation (HSP & RIC)

Bài báo: "Session-Based Recommendations for e-Commerce with Graph-Based
Data Modeling", Delianidi et al., Applied Sciences 13(1):394, 2023.
DOI: 10.3390/app13010394

Chạy:
    cd backend/ml
    python -m session.demo_paper

Script chạy OFFLINE (không cần server, không cần dataset lớn) — phù hợp
demo trực tiếp trên máy khi thuyết trình. Mỗi BƯỚC in ra rõ ràng để vừa
chạy vừa nói theo kịch bản trong BAI_THUYET_TRINH_BAI_BAO_SESSION.md.
"""

import os
import sys
import time

# Fix Windows console encoding for Vietnamese Unicode
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session.session_recommender import SessionRecommender, SessionConfig


# ============================================================
# DỮ LIỆU DEMO: cửa hàng điện thoại (giả lập log thực tế)
# ============================================================

PRODUCTS = {
    "ip15":       "iPhone 15",
    "ip15_case":  "Ốp lưng iPhone 15",
    "ip15_cu":    "Củ sạc iPhone 20W",
    "galaxy":     "Samsung Galaxy S24",
    "ss_case":    "Ốp lưng Galaxy S24",
    "ss_cu":      "Củ sạc Samsung 25W",
    "airpod":     "AirPods",
    "galaxy_buds": "Galaxy Buds",
}

SESSIONS = [
    {"session_id": "s1", "items": ["ip15", "ip15_case", "ip15_cu"]},
    {"session_id": "s2", "items": ["ip15", "ip15_case", "airpod"]},
    {"session_id": "s3", "items": ["ip15", "ip15_case", "ip15_cu", "airpod"]},
    {"session_id": "s4", "items": ["ip15", "ip15_cu"]},
    {"session_id": "s5", "items": ["galaxy", "ss_case", "ss_cu"]},
    {"session_id": "s6", "items": ["galaxy", "ss_case"]},
    {"session_id": "s7", "items": ["galaxy", "ss_cu", "galaxy_buds"]},
    {"session_id": "s8", "items": ["ip15", "airpod"]},
]

W = 64  # chiều rộng khung


def line(char="─"):
    print(char * W)


def title(text):
    print()
    line("═")
    print(f"  {text}")
    line("═")


def name(pid):
    return PRODUCTS.get(pid, pid)


def print_recs(recs, show_level=False):
    if not recs:
        print("     (không có gợi ý)")
        return
    for i, r in enumerate(recs, 1):
        level = f"  [{r.get('hsp_level', '')}]" if show_level and r.get("hsp_level") else ""
        score = r.get("score") or r.get("probability") or 0
        print(f"     {i}. {r['product_id']:<12} {name(r['product_id']):<22} "
              f"score={score:.4f}{level}")
        print(f"        └─ {r['reason']}")


def main():
    print()
    print("╔" + "═" * (W - 2) + "╗")
    print("║  DEMO BÀI BÁO: SESSION-BASED RECOMMENDATION (HSP & RIC)".ljust(W - 1) + "║")
    print("║  Delianidi et al., Applied Sciences 13(1):394, 2023".ljust(W - 1) + "║")
    print("╚" + "═" * (W - 2) + "╝")

    # --------------------------------------------------------
    title("BƯỚC 1 — DỮ LIỆU: các phiên (session) lịch sử")
    # --------------------------------------------------------
    print("""
  Input của bài báo KHÔNG phải lịch sử mua của user,
  mà là CHUỖI sản phẩm được xem trong mỗi phiên (30 phút).""")
    for s in SESSIONS:
        items = " → ".join(name(p) for p in s["items"])
        print(f"   {s['session_id']}: {items}")
    print(f"""
  ➜ {len(SESSIONS)} phiên, {sum(len(s['items']) for s in SESSIONS)} lượt xem
  ➜ Quan hệ dựng từ dữ liệu:
     - Next (có thứ tự):  ip15 → ip15_case → ip15_cu   (HSP dùng)
     - InSameSession:     ip15 ↔ ip15_case              (RIC dùng)""")

    # --------------------------------------------------------
    title("BƯỚC 2 — HUẤN LUYỆN: fit 4 sub-models cùng lúc")
    # --------------------------------------------------------
    rec = SessionRecommender(SessionConfig(top_n=5))
    t0 = time.perf_counter()
    rec.fit(SESSIONS)
    train_ms = (time.perf_counter() - t0) * 1000
    print(f"""
  ➜ Huấn luyện xong trong {train_ms:.1f} ms (không cần GPU)
     - Co-occurrence  : ma trận "xem cùng phiên"
     - Sequence       : Markov P(next | current)
     - HSP            : P0 / P1 / P2  (quan hệ Next)
     - RIC            : gamma + P0    (quan hệ InSameSession)""")

    # --------------------------------------------------------
    title("BƯỚC 3 — HSP: học 3 cấp xác suất theo thứ tự")
    # --------------------------------------------------------
    hsp = rec.hsp
    print("""
  P0 — xác suất xuất hiện đơn (dùng cho cold-start):
     P0(A) = appearances(A) / total""")
    top_p0 = sorted(hsp.p0.items(), key=lambda x: x[1], reverse=True)[:4]
    for pid, p in top_p0:
        print(f"     P0({pid:<10}) = {p:.4f}")

    print("""
  P1 — xác suất cặp liền kề:  P1(B | A) = count(A→B) / count(A)""")
    for a in ["ip15", "galaxy"]:
        trans = sorted(hsp.p1.get(a, {}).items(), key=lambda x: x[1], reverse=True)
        items = ", ".join(f"{b}={p:.2f}" for b, p in trans[:3])
        print(f"     từ {name(a)}: {items}")

    print("""
  P2 — xác suất bộ ba liền kề:  P2(C | A,B) = count(A,B→C) / count(A,B)""")
    key = ("ip15", "ip15_case")
    for c, p in sorted(hsp.p2.get(key, {}).items(), key=lambda x: x[1], reverse=True):
        print(f"     sau ({name(key[0])}, {name(key[1])}): {name(c)} = {p:.4f}")

    # --------------------------------------------------------
    title("BƯỚC 4 — HSP: gợi ý THEO TỪNG BƯỚC của phiên (hierarchy)")
    # --------------------------------------------------------
    print("""
  Quy tắc của bài báo (Figure 2): P2 ưu tiên → P1 → P0, không trùng lặp.
  Giả lập khách đang duyệt:  iPhone 15 → Ốp lưng iPhone 15 → Củ sạc …
""")
    for t in range(1, 4):
        prefix = ["ip15", "ip15_case", "ip15_cu"][:t]
        path = " → ".join(name(p) for p in prefix)
        recs = rec.recommend(prefix, top_n=3, strategy="hsp")
        print(f"   t={t}  khách đã xem: {path}")
        levels = {r.get("hsp_level") for r in recs}
        priority = [lv for lv in ("P2", "P1", "P0") if lv in levels]
        used = " → ".join(priority) if priority else "-"
        print(f"   {recs[0]['reason'] if recs else ''}")
        print(f"   ➜ Top-3 gợi ý (dùng cấp: {used}):")
        print_recs(recs, show_level=True)
        print()

    # --------------------------------------------------------
    title("BƯỚC 5 — RIC: bộ nhớ hồi quy theo từng bước của phiên")
    # --------------------------------------------------------
    print("""
  Công thức (mục RIC của bài báo):
     gamma(oᵢ|x) = cooc(x, oᵢ) / sessions(x)      (độ tin cậy)
     wᵢ(t) = α·wᵢ(t−1) + (1−α)·cᵢ(t)              (hồi quy bậc 1, α=0.5)

  Cùng một phiên tăng dần — chú ý điểm số THAY ĐỔI sau mỗi lần xem:""")
    ric = rec.ric
    for t in range(1, 5):
        prefix = ["ip15", "ip15_case", "ip15_cu", "ip15_case"][:t]
        current = prefix[-1]
        path = " → ".join(name(p) for p in prefix)
        recs = rec.recommend(prefix, top_n=3, strategy="ric_cil", alpha=0.5)
        print(f"   t={t}  khách vừa xem: {name(current)}")
        print(f"        (phiên: {path})")
        # gamma của item vừa xem với gợi ý đầu tiên
        if recs:
            top = recs[0]["product_id"]
            g = ric._confidence(current, top)
            print(f"        gamma({top} | {current}) = {g:.4f}")
        print_recs(recs)
        print()

    # --------------------------------------------------------
    title("BƯỚC 6 — TÁC ĐỘNG CỦA α (forgetting factor) trong RIC")
    # --------------------------------------------------------
    prefix = ["ip15", "ip15_case", "ip15_cu"]
    print(f"  Cùng phiên: {' → '.join(name(p) for p in prefix)}\n")
    print(f"   {'α':<6} | Top-3 gợi ý (score)")
    print("   " + "-" * (W - 4))
    for alpha in [0.1, 0.5, 0.9]:
        recs = rec.recommend(prefix, top_n=3, strategy="ric_cil", alpha=alpha)
        ids = ", ".join(f"{r['product_id']} ({r['score']:.3f})" for r in recs)
        print(f"   {alpha:<6} | {ids}")
    print("""
  ➜ α nhỏ = "quên nhanh", chỉ nhớ vài item cuối
  ➜ α lớn = nhớ cả phiên, ảnh hưởng sớm vẫn giữ được
  ➜ (Bài báo tune α từ 0.1–0.9 trên Yoochoose/Diginetica)""")

    # --------------------------------------------------------
    title("BƯỚC 7 — SO SÁNH 5 CHIẾN LƯỢC trên cùng một phiên")
    # --------------------------------------------------------
    print(f"  Phiên: {' → '.join(name(p) for p in prefix)}\n")
    for strat in ["cooccurrence", "sequence", "hsp", "ric_cil", "hybrid"]:
        recs = rec.recommend(prefix, top_n=3, strategy=strat)
        ids = ", ".join(r["product_id"] for r in recs) or "-"
        print(f"   {strat:<14} → {ids}")
    print("""
  ➜ HSP & RIC luôn đủ kết quả (có fallback P0 cho cold-start)
  ➜ Mỗi gợi ý đều kèm REASON — giải thích được với người dùng""")

    # --------------------------------------------------------
    title("BƯỚC 8 — ĐÁNH GIÁ THẬT TRÊN YOOCHOOSE (benchmark bài báo)")
    # --------------------------------------------------------
    print("""
  Dataset chuẩn của bài báo: Yoochoose (e-commerce, ~9M sessions).
  Protocol: mỗi phiên test → prefix làm input, item kế tiếp là target.
  Đo MRR@K và Recall@K (K = 10, 20, 30) — y hệt bài báo.

  Chạy benchmark thật (đã có trong repo):
     cd backend/ml
     python -m session.benchmark_hsp_ric --dataset yoochoose --max_test 5000
     python -m session.benchmark_hsp_ric --dataset diginetica --max_test 5000

  Kết quả chi tiết: backend/ml/benchmark_yoochoose_results.txt""")

    # --------------------------------------------------------
    title("TỔNG KẾT DEMO")
    # --------------------------------------------------------
    print("""
  ✅ HSP: gợi ý theo hierarchy P2 → P1 → P0, đủ kết quả ở mọi bước t
  ✅ RIC: trọng số hồi quy thích nghi theo phiên, α điều khiển bộ nhớ
  ✅ Cả hai đều chạy bằng Python thuần + dict, train vài chục ms
  ✅ Đánh giá công bằng trên dataset công khai theo đúng protocol bài báo
""")



if __name__ == "__main__":
    main()
