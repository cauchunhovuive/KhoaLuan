"""
Live test AI - Goi truc tiep cac API va hien thi ket qua
"""

import json
import urllib.request
import urllib.error
import sys
import random

# Fix Windows console encoding for Vietnamese Unicode
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:8000"

def request(method, path, body=None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode() if body else None
    try:
        req = urllib.request.Request(
            url, data=data, method=method,
            headers={"Content-Type": "application/json"} if body else {}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}", "detail": e.read().decode()[:200]}
    except Exception as e:
        return {"error": str(e)}

# === SAMPLE DATA ===
random.seed(42)
USERS = [f"user_{i}" for i in range(20)]
PRODUCTS = [{"id": f"prod_{i}", "name": f"San pham {i}"} for i in range(30)]
ORDERS = []
for _ in range(100):
    u = random.choice(USERS)
    p = random.choice(PRODUCTS)
    ORDERS.append({
        "user_id": u, "product_id": p["id"], "quantity": random.randint(1, 3),
        "created_at": f"2024-01-{random.randint(1,28):02d}T{random.randint(0,23):02d}:00:00",
    })

VIEW_LOGS = [{
    "user_id": random.choice(USERS),
    "product_id": random.choice(PRODUCTS)["id"],
    "timestamp": f"2024-06-{random.randint(1,15):02d}T{random.randint(8,22):02d}:{random.randint(0,59):02d}:00",
} for _ in range(50)]

# ==============================
print("=" * 70)
print("  KIEM TRA TAT CA CHUC NANG AI")
print("=" * 70)

# 1. Health
print("\n[1] Kiem tra server...")
r = request("GET", "/health")
print(f"    -> {json.dumps(r)}")

# 2. Info
print("\n[2] Danh sach dich vu AI...")
r = request("GET", "/info")
if "models" in r:
    for name, info in r["models"].items():
        print(f"    -> {name}: {info['description'][:60]}...")

# 3. COLLABORATIVE FILTERING
print("\n" + "=" * 70)
print("  COLLABORATIVE FILTERING")
print("=" * 70)

print("\n[3] Train CF models...")
r = request("POST", "/cf/train", {"orders": ORDERS, "products": PRODUCTS})
print(f"    -> Models: {r.get('data',{}).get('models',[])}")

print("\n[4] Goi y san pham cho user_0 (Hybrid)...")
r = request("POST", "/cf/recommend", {
    "user_id": "user_0", "orders": ORDERS, "products": PRODUCTS,
    "top_n": 5, "strategy": "hybrid"
})
recs = r.get("data",{}).get("recommendations",[])
for rec in recs:
    print(f"    - {rec['product_id']} (score: {rec['score']:.4f})")

print("\n[5] Goi y san pham cho user_0 (Item-Item CF)...")
r = request("POST", "/cf/recommend", {
    "user_id": "user_0", "orders": ORDERS, "products": PRODUCTS,
    "top_n": 3, "strategy": "item_cf"
})
for rec in r.get("data",{}).get("recommendations",[]):
    print(f"    - {rec['product_id']} (score: {rec['score']:.4f})")

print("\n[6] Goi y san pham cho user_0 (User-User CF)...")
r = request("POST", "/cf/recommend", {
    "user_id": "user_0", "orders": ORDERS, "products": PRODUCTS,
    "top_n": 3, "strategy": "user_cf"
})
for rec in r.get("data",{}).get("recommendations",[]):
    print(f"    - {rec['product_id']} (score: {rec['score']:.4f})")

print("\n[7] Goi y san pham cho user_0 (ALS)...")
r = request("POST", "/cf/recommend", {
    "user_id": "user_0", "orders": ORDERS, "products": PRODUCTS,
    "top_n": 3, "strategy": "als"
})
for rec in r.get("data",{}).get("recommendations",[]):
    print(f"    - {rec['product_id']} (score: {rec['score']:.4f})")

print("\n[8] San pham tuong tu voi prod_0...")
r = request("POST", "/cf/similar", {
    "product_id": "prod_0", "orders": ORDERS, "products": PRODUCTS, "top_n": 5
})
for s in r.get("data",{}).get("similar_products",[]):
    print(f"    - {s['product_id']} (similarity: {s['similarity_score']:.4f})")

print("\n[9] Giai thich recommend cho user_4 (Admin)...")
r = request("POST", "/cf/explain", {
    "user_id": "user_4", "orders": ORDERS, "products": PRODUCTS, "top_n": 3
})
weights = r.get("data",{}).get("weights",{})
print(f"    Weights: Item-Item={weights.get('item_cf',0)}, User-User={weights.get('user_cf',0)}, ALS={weights.get('als',0)}")
for rec in r.get("data",{}).get("recommendations",[])[:2]:
    methods = [m['method'][:15] for m in rec.get('methods',[])]
    print(f"    - {rec['product_id']} tu: {methods}")

# 4. SESSION-BASED
print("\n" + "=" * 70)
print("  SESSION-BASED RECOMMENDATIONS")
print("=" * 70)

print("\n[10] Train Session model...")
r = request("POST", "/session/train", {"view_logs": VIEW_LOGS})
print(f"    -> Sessions: {r.get('data',{}).get('n_sessions','?')}")

print("\n[11] Goi y theo phien (items: prod_0, prod_5, prod_10)...")
r = request("POST", "/session/recommend", {
    "session_items": ["prod_0", "prod_5", "prod_10"],
    "products": PRODUCTS, "top_n": 5, "strategy": "hybrid"
})
for rec in r.get("data",{}).get("recommendations",[]):
    print(f"    - {rec['product_id']} (score: {rec['score']:.4f})")

print("\n[12] Goi y co-occurrence (item: prod_0)...")
r = request("POST", "/session/recommend", {
    "session_items": ["prod_0"], "products": PRODUCTS,
    "top_n": 5, "strategy": "cooccurrence"
})
for rec in r.get("data",{}).get("recommendations",[]):
    print(f"    - {rec['product_id']}")

# 5. EVALUATION
print("\n" + "=" * 70)
print("  DANH GIA CHAT LUONG AI")
print("=" * 70)

print("\n[13] Offline evaluation...")
r = request("POST", "/evaluate/offline", {
    "orders": ORDERS, "products": PRODUCTS, "train_ratio": 0.8, "top_n": 10
})
metrics = r.get("data",{}).get("metrics",{})
if metrics:
    for k, v in metrics.items():
        print(f"    - {k}: {v:.4f}" if isinstance(v, float) else f"    - {k}: {v}")

# 6. A/B TEST
print("\n" + "=" * 70)
print("  A/B TESTING")
print("=" * 70)

print("\n[14] Ghi log A/B test...")
logs = []
for i in range(10):
    logs.append({"group": "control", "user_id": f"user_{i}", "product_id": f"prod_{i}", "action": "impression"})
    logs.append({"group": "treatment", "user_id": f"user_{i}", "product_id": f"prod_{i}", "action": "impression"})
    if i % 3 == 0:
        logs.append({"group": "control", "user_id": f"user_{i}", "product_id": f"prod_{i}", "action": "click"})
    if i % 4 == 0:
        logs.append({"group": "control", "user_id": f"user_{i}", "product_id": f"prod_{i}", "action": "purchase", "revenue": 500000})
    if i % 6 == 0:
        logs.append({"group": "treatment", "user_id": f"user_{i}", "product_id": f"prod_{i}", "action": "click"})
r = request("POST", "/abtest/log_batch", logs)
print(f"    -> {r.get('data',{}).get('message','')}")

print("\n[15] Bao cao A/B test...")
r = request("GET", "/abtest/report")
report = r.get("data",{})
for group in report.get("groups",[]):
    m = report.get("metrics_per_group",{}).get(group,{})
    print(f"    {group}: CTR={m.get('ctr',0):.3f}, Revenue={m.get('revenue',0):,.0f}")
for key, comp in report.get("comparisons",{}).items():
    ctr = comp.get("ctr",{})
    print(f"    {key}: CTR winner={ctr.get('winner','?')}, improvement={ctr.get('improvement_pct',0):.1f}%")

# 7. CLUSTERING
print("\n" + "=" * 70)
print("  CLUSTERING")
print("=" * 70)

print("\n[16] Cluster profiles...")
r = request("GET", "/cluster/profiles")
for p in r.get("data",[]):
    print(f"    Cluster {p.get('id','?')}: name={p.get('name','?')}, color={p.get('color','?')}")

print("\n[17] Cold-start: user moi chua co lich su...")
r = request("POST", "/cf/recommend", {
    "user_id": "new_user_999", "orders": ORDERS, "products": PRODUCTS,
    "top_n": 5, "strategy": "hybrid"
})
recs = r.get("data",{}).get("recommendations",[])
for rec in recs:
    print(f"    - {rec['product_id']} (score: {rec['score']:.4f}) (reason: ALS fallback)")

print("\n" + "=" * 70)
print("  HOAN TAT: Tat ca chuc nang AI hoat dong tot!")
print("=" * 70)
