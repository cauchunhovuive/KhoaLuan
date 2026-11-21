# -*- coding: utf-8 -*-
"""
Demo HSP & RIC (Delianidi et al. 2023) trên 10 dòng đầu tiên của bảng
"ProductView" trong PostgreSQL.

Cách chạy (từ backend/ml):
    python session/demo_paper.py

Script tự đọc PostgreSQL (bằng psql trong container docker), lấy 10 dòng đầu
theo createdAt ASC, dựng thành phiên theo timeout 30 phút, rồi tính TAY từng
bước theo công thức bài báo:
  - HSP: P0 (cold-start) -> P1 (pair) -> P2 (triplet), hierarchy theo bước t
  - RIC:  gamma = cooc(x,oi)/sessions(x), c_i = gamma nếu >0 else P0,
          w_i(t) = alpha*w_i(t-1) + (1-alpha)*c_i(t), w_i(0) = P0
"""
import io
import os
import subprocess
import sys
from collections import defaultdict, Counter
from datetime import datetime

# Console Windows mặc định cp1258 — ép stdout/stderr sang UTF-8 để in tiếng Việt
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ============================================================
# 0. LẤY 10 DÒNG ĐẦU TIÊN TỪ POSTGRESQL
# ============================================================
CONTAINER = os.getenv("PG_CONTAINER", "khoaluan-postgres")
DB_ARGS = ["-U", os.getenv("PG_USER", "khoaluan"), "-d", os.getenv("PG_DB", "khoaluan")]

SQL = '''
SELECT pv."userId" AS user_id, pv."productId" AS product_id, pv."createdAt" AS ts, p.name
FROM "ProductView" pv
LEFT JOIN "Product" p ON p.id = pv."productId"
ORDER BY pv."createdAt" ASC, pv."id" ASC
LIMIT 10;
'''

def fetch_first_10_rows():
    """Chạy psql trong container, trả về list dict 10 dòng đầu bảng ProductView."""
    cmd = ["docker", "exec", CONTAINER, "psql"] + DB_ARGS + ["-At", "-F", "\t", "-c", SQL]
    out = subprocess.run(cmd, capture_output=True, encoding="utf-8", timeout=30)
    if out.returncode != 0:
        raise RuntimeError(f"psql thất bại: {out.stderr}")
    rows = []
    for line in out.stdout.strip().splitlines():
        parts = line.split("\t")
        if len(parts) < 4:
            continue
        user_id, product_id, ts, name = parts[0], parts[1], parts[2], parts[3]
        rows.append({
            "user_id": user_id,
            "product_id": product_id,
            "timestamp": datetime.fromisoformat(ts),
            "name": None if name == "" else name,
        })
    return rows

def build_sessions(view_logs, timeout_minutes=30):
    """Gom view logs thành phiên: gap > 30 phút giữa 2 event liên tiếp = phiên mới."""
    by_user = defaultdict(list)
    for v in sorted(view_logs, key=lambda x: (x["user_id"], x["timestamp"])):
        by_user[v["user_id"]].append(v)

    sessions = []
    for uid, logs in by_user.items():
        cur = [logs[0]]
        for prev, v in zip(logs, logs[1:]):
            gap_min = (v["timestamp"] - prev["timestamp"]).total_seconds() / 60
            if gap_min > timeout_minutes:
                sessions.append(_mk_session(uid, cur))
                cur = []
            cur.append(v)
        sessions.append(_mk_session(uid, cur))
    return sessions

def _mk_session(uid, logs):
    return {
        "user_id": uid,
        "items": [x["product_id"] for x in logs],
        "times": [x["timestamp"] for x in logs],
        "names": [x["name"] or x["product_id"][:8] for x in logs],
    }

# ============================================================
# 1. HSP — Hierarchical Sequence Probability
#    P0(A)    = appearances(A) / total appearances
#    P1(A,B)  = count(A→B) / count(A)
#    P2(A,B,C)= count(A,B→C) / count(A,B)
# ============================================================
def hsp_counts(sessions):
    item_counts, pair_counts, triplet_counts = Counter(), defaultdict(Counter), defaultdict(Counter)
    total = 0
    for s in sessions:
        items = s["items"]
        for i in range(len(items)):
            item_counts[items[i]] += 1
            total += 1
            if i + 1 < len(items):
                pair_counts[items[i]][items[i + 1]] += 1
            if i + 2 < len(items):
                triplet_counts[(items[i], items[i + 1])][items[i + 2]] += 1
    return item_counts, pair_counts, triplet_counts, total

def hsp_recommend(session_items, item_counts, pair_counts, triplet_counts, total, top_n=5):
    """Hierarchy đúng bài báo: n>=2 -> P2 -> P1 -> P0; n=1 -> P1 -> P0; n=0 -> P0."""
    results, included = [], set()

    def add(pid, prob, level, formula):
        if pid in included:
            return
        included.add(pid)
        results.append({"product_id": pid, "probability": prob, "level": level,
                        "formula": formula, "name": _NAME_OF(pid)})

    n = len(session_items)
    if n >= 2:
        a, b = session_items[-2], session_items[-1]
        denom_ab = pair_counts[a][b]
        for c, cnt in sorted(triplet_counts[(a, b)].items(), key=lambda x: -x[1]):
            add(c, cnt / denom_ab, "P2",
                f"P2({short(a)},{short(b)} → {short(c)}) = {cnt}/{denom_ab}")
        if len(results) >= top_n:
            return results[:top_n]
    if n >= 1:
        a = session_items[-1]
        denom_a = item_counts[a]
        for b, cnt in sorted(pair_counts[a].items(), key=lambda x: -x[1]):
            add(b, cnt / denom_a, "P1",
                f"P1({short(a)} → {short(b)}) = {cnt}/{denom_a}")
        if len(results) >= top_n:
            return results[:top_n]
    for pid, cnt in item_counts.most_common():
        add(pid, cnt / max(total, 1), "P0", f"P0({short(pid)}) = {cnt}/{total}")
        if len(results) >= top_n:
            break
    return results[:top_n]

# ============================================================
# 2. RIC — Recurrent Item Co-occurrence
#    gamma(o|x) = cooc(x,o) / sessions(x)   (γ(x|x)=1)
#    c_i        = gamma nếu gamma > 0, ngược lại P0
#    w_i(t)     = alpha*w_i(t-1) + (1-alpha)*c_i(t),  w_i(0) = P0
# ============================================================
def ric_counts(sessions):
    sess_counts, cooc = Counter(), defaultdict(Counter)
    for s in sessions:
        uniq = list(dict.fromkeys(s["items"]))
        for it in uniq:
            sess_counts[it] += 1
        for i in range(len(uniq)):
            for j in range(i + 1, len(uniq)):
                a, b = uniq[i], uniq[j]
                cooc[a][b] += 1
                cooc[b][a] += 1
    return sess_counts, cooc

def ric_recommend(session_items, sess_counts, cooc, p0, alpha=0.3, top_n=5):
    def gamma(x, oi):
        if x == oi:
            return 1.0
        den = sess_counts.get(x, 0)
        if den == 0:
            return 0.0
        return cooc.get(x, {}).get(oi, 0) / den

    candidates = set()
    for x in session_items:
        candidates.update(cooc.get(x, {}).keys())
    candidates.update(session_items)

    weights, traces = {}, {}
    for oi in sorted(candidates):
        w = p0[oi]  # w_i(0) = P0
        trace = [f"w(0)=P0={w:.4f}"]
        for t, x in enumerate(session_items, start=1):
            g = gamma(x, oi)
            ci = g if g > 0 else p0[oi]
            w_new = alpha * w + (1 - alpha) * ci
            src = f"γ={g:.3f}" if g > 0 else f"c=P0={p0[oi]:.3f}"
            trace.append(f"w({t})={alpha:.1f}·{w:.4f}+{1-alpha:.1f}·{src}={w_new:.4f}")
            w = w_new
        weights[oi] = w
        traces[oi] = " ; ".join(trace)

    ranked = sorted(weights.items(), key=lambda kv: -kv[1])
    return [{"product_id": oi, "score": w, "name": _NAME_OF(oi), "trace": traces[oi]}
            for oi, w in ranked[:top_n]]

# ============================================================
# MAIN
# ============================================================
_NAME_OF = lambda pid: pid
def short(pid):
    return _NAME_OF(pid)[:18]

def main():
    global _NAME_OF
    rows = fetch_first_10_rows()
    print("=" * 76)
    print("10 DÒNG ĐẦU TIÊN CỦA BẢNG ProductView (ORDER BY createdAt ASC, LIMIT 10)")
    print("=" * 76)
    for i, r in enumerate(rows, 1):
        print(f"{i:2d}. {r['timestamp']}  user={r['user_id'][:8]}…  {r['name']}")

    sessions = build_sessions(rows, timeout_minutes=30)
    print(f"\n→ Ghép thành {len(sessions)} phiên (gap > 30 phút = phiên mới):")
    for s in sessions:
        seq = " → ".join(s["names"])
        print(f"   user {s['user_id'][:8]}… : {seq}")

    name_map = {r["product_id"]: (r["name"] or r["product_id"][:8]) for r in rows}
    _NAME_OF = lambda pid: name_map.get(pid, pid[:8])

    # ---------- HSP ----------
    item_counts, pair_counts, triplet_counts, total = hsp_counts(sessions)
    print("\n" + "=" * 76)
    print("HSP — Hierarchical Sequence Probability (học từ 10 dòng này)")
    print("=" * 76)

    print("\n• P0 (cold-start) — theo lượt xuất hiện:  P0(A) = lần xuất hiện / tổng lượt")
    for pid, cnt in item_counts.most_common():
        print(f"    P0({_NAME_OF(pid)[:30]:30s}) = {cnt}/{total} = {cnt/total:.4f}")

    print("\n• P1 (pair):  P1(A,B) = count(A→B liền nhau) / count(A)")
    any_p1 = False
    for a, trans in pair_counts.items():
        for b, c in trans.items():
            any_p1 = True
            print(f"    P1({_NAME_OF(a)[:22]:22s} → {_NAME_OF(b)[:22]:22s}) = {c}/{item_counts[a]} = {c/item_counts[a]:.4f}")
    if not any_p1:
        print("    (không có cặp liền nhau trong 10 dòng này)")

    print("\n• P2 (triplet):  P2(A,B,C) = count(A,B→C) / count(A→B)")
    any_p2 = False
    for (a, b), cands in triplet_counts.items():
        for c, cnt in cands.items():
            any_p2 = True
            print(f"    P2({_NAME_OF(a)[:16]:16s},{_NAME_OF(b)[:16]:16s} → {_NAME_OF(c)[:16]:16s}) = {cnt}/{pair_counts[a][b]} = {cnt/pair_counts[a][b]:.4f}")
    if not any_p2:
        print("    (không có triplet trong 10 dòng này)")

    print("\n" + "-" * 76)
    print("HSP recommend theo từng bước t (hierarchy P2 → P1 → P0):")
    first = sessions[0]["items"]
    demo_states = [
        ([], "t=1 — phiên rỗng (cold-start)"),
        (first[:1], f"t=2 — đã xem: {short(first[0]) if first else '-'}"),
        (first[:2], f"t=3 — đã xem: {' → '.join(short(x) for x in first[:2]) if len(first) >= 2 else '-'}"),
    ]
    for items, label in demo_states:
        recs = hsp_recommend(items, item_counts, pair_counts, triplet_counts, total, top_n=5)
        print(f"\n  {label}")
        for r in recs:
            print(f"     [{r['level']}] {r['formula']:52s} → {r['name'][:26]:26s} p={r['probability']:.4f}")

    # ---------- RIC ----------
    sess_counts, cooc = ric_counts(sessions)
    p0_ric = {pid: c / max(sum(sess_counts.values()), 1) for pid, c in sess_counts.items()}
    print("\n" + "=" * 76)
    print("RIC — Recurrent Item Co-occurrence (học từ 10 dòng này)")
    print("=" * 76)

    print(f"\n• ItemInSession — sessions(x) = số phiên chứa x (tổng phiên={len(sessions)}):")
    for pid, c in sess_counts.most_common():
        print(f"    sessions({_NAME_OF(pid)[:30]:30s}) = {c}")

    print("\n• Co-occurrence InSameSession (cặp item cùng phiên):")
    seen_pairs = set()
    any_cooc = False
    for x in sorted(cooc):
        for oi in sorted(cooc[x]):
            if (oi, x) in seen_pairs:
                continue
            seen_pairs.add((x, oi))
            any_cooc = True
            print(f"    cooc({_NAME_OF(x)[:22]:22s}, {_NAME_OF(oi)[:22]:22s}) = {cooc[x][oi]}")
    if not any_cooc:
        print("    (không có cặp cùng phiên — mỗi phiên chỉ 1 item)")

    print("\n• gamma(o|x) = cooc(x,o)/sessions(x)   [γ(x|x)=1]")
    all_pids = sorted(sess_counts)
    any_gamma = False
    for x in all_pids:
        for oi in all_pids:
            if x == oi:
                continue  # γ(x|x)=1 luôn đúng, bỏ để gọn
            g = cooc.get(x, {}).get(oi, 0) / sess_counts[x] if sess_counts[x] else 0.0
            if g > 0:
                any_gamma = True
                print(f"    γ({_NAME_OF(oi)[:24]:24s} | x={_NAME_OF(x)[:20]:20s}) = {cooc[x][oi]}/{sess_counts[x]} = {g:.4f}")
    if not any_gamma:
        print("    (không có gamma > 0 ngoài γ(x|x)=1)")

    print("\n• Bộ nhớ hồi quy:  w(t) = α·w(t-1) + (1-α)·c(t),  w(0)=P0, α=0.3")
    demo_session = sessions[0]["items"]
    print(f"  Demo với phiên: {' → '.join(_NAME_OF(x) for x in demo_session)}")
    recs = ric_recommend(demo_session, sess_counts, cooc, p0_ric, alpha=0.3, top_n=5)
    for r in recs:
        print(f"\n     {r['name'][:34]:34s} w={r['score']:.4f}")
        print(f"        {r['trace']}")

    print("\n" + "=" * 76)
    print("DONE — HSP & RIC đã chạy đúng công thức trên 10 dòng đầu của ProductView")
    print("=" * 76)

if __name__ == "__main__":
    main()
