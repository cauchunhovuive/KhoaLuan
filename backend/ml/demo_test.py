"""
Demo test AI - Test tung chuc nang voi du lieu thuc te
"""
import json, urllib.request, sys, random

# Fix Windows console encoding for Vietnamese Unicode
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:8000"

def api(method, path, body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, method=method,
        headers={"Content-Type": "application/json"} if body else {})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except Exception as e:
        return {"error": str(e)}

# ============================================================
# SAMPLE DATA
# ============================================================
random.seed(42)
products = [{"id": f"prod_{i}"} for i in range(10)]
users = [f"user_{i}" for i in range(5)]

orders = [
    {"user_id": "user_0", "product_id": "prod_1", "quantity": 2},
    {"user_id": "user_0", "product_id": "prod_3", "quantity": 1},
    {"user_id": "user_0", "product_id": "prod_5", "quantity": 1},
    {"user_id": "user_1", "product_id": "prod_1", "quantity": 1},
    {"user_id": "user_1", "product_id": "prod_2", "quantity": 3},
    {"user_id": "user_1", "product_id": "prod_4", "quantity": 2},
    {"user_id": "user_2", "product_id": "prod_2", "quantity": 1},
    {"user_id": "user_2", "product_id": "prod_6", "quantity": 1},
    {"user_id": "user_3", "product_id": "prod_1", "quantity": 1},
    {"user_id": "user_3", "product_id": "prod_7", "quantity": 2},
    {"user_id": "user_3", "product_id": "prod_8", "quantity": 1},
    {"user_id": "user_4", "product_id": "prod_9", "quantity": 1},
]

view_logs = [
    {"user_id": "user_0", "product_id": "prod_1", "timestamp": "2024-06-01T10:00:00"},
    {"user_id": "user_0", "product_id": "prod_2", "timestamp": "2024-06-01T10:05:00"},
    {"user_id": "user_0", "product_id": "prod_3", "timestamp": "2024-06-01T10:10:00"},
    {"user_id": "user_1", "product_id": "prod_1", "timestamp": "2024-06-01T11:00:00"},
    {"user_id": "user_1", "product_id": "prod_4", "timestamp": "2024-06-01T11:15:00"},
    {"user_id": "user_2", "product_id": "prod_5", "timestamp": "2024-06-01T14:00:00"},
    {"user_id": "user_2", "product_id": "prod_6", "timestamp": "2024-06-01T14:30:00"},
    {"user_id": "user_3", "product_id": "prod_1", "timestamp": "2024-06-02T09:00:00"},
    {"user_id": "user_3", "product_id": "prod_2", "timestamp": "2024-06-02T09:20:00"},
    {"user_id": "user_3", "product_id": "prod_3", "timestamp": "2024-06-02T09:30:00"},
]

print("=" * 65)
print("    DEMO TEST AI - KET QUA THUC TE")
print("=" * 65)

# ============================================================
# 1. CLUSTERING - Customer Segmentation
# ============================================================
print("\n" + "-" * 65)
print("1. PHAN CUM KHACH HANG (RFM + K-Means)")
print("-" * 65)

r = api("GET", "/cluster/profiles")
print("  Cac cum khach hang:")
for p in r.get("data", []):
    name = p.get('name','?')
    desc = p.get('description','')
    print(f"    Cum {p.get('id')}: {name}")
    print(f"      Mo ta: {desc}")

# ============================================================
# 2. COLLABORATIVE FILTERING
# ============================================================
print("\n" + "-" * 65)
print("2. COLLABORATIVE FILTERING")
print("-" * 65)

print("\n  2a. Train CF models...")
r = api("POST", "/cf/train", {"orders": orders, "products": products})
models = r.get("data",{}).get("models",[])
print(f"     -> Da train: {models}")

print("\n  2b. Goi y san pham cho user_0 (da mua: prod_1, prod_3, prod_5)...")
r = api("POST", "/cf/recommend", {
    "user_id": "user_0", "orders": orders, "products": products,
    "top_n": 5, "strategy": "hybrid"
})
recs = r.get("data",{}).get("recommendations",[])
print(f"     -> Goi y cho user_0:")
for rec in recs:
    print(f"        - {rec['product_id']} (score: {rec['score']:.3f})")
if not recs:
    print("        (khong co du lieu phu hop - can them orders)")

print("\n  2c. San pham tuong tu prod_1...")
r = api("POST", "/cf/similar", {
    "product_id": "prod_1", "orders": orders, "products": products, "top_n": 5
})
sim = r.get("data",{}).get("similar_products",[])
print(f"     -> San pham tuong tu prod_1:")
for s in sim:
    print(f"        - {s['product_id']} (do tuong tu: {s['similarity_score']:.3f})")

print("\n  2d. Giai thich recommend cho admin...")
r = api("POST", "/cf/explain", {
    "user_id": "user_0", "orders": orders, "products": products, "top_n": 3
})
weights = r.get("data",{}).get("weights",{})
print(f"     -> Trong so: Item-Item={weights.get('item_cf',0)}, User-User={weights.get('user_cf',0)}, ALS={weights.get('als',0)}")
for rec in r.get("data",{}).get("recommendations",[])[:3]:
    methods = [f"{m['method']}: {m['score']:.2f}" for m in rec.get('methods',[])]
    print(f"     -> {rec['product_id']}: {', '.join(methods)}")

print("\n  2e. Cold-start: user moi (chua co lich su mua)...")
r = api("POST", "/cf/recommend", {
    "user_id": "new_user_999", "orders": orders, "products": products,
    "top_n": 5, "strategy": "hybrid"
})
recs = r.get("data",{}).get("recommendations",[])
print(f"     -> Goi y cho user moi:")
for rec in recs:
    print(f"        - {rec['product_id']} (score: {rec['score']:.3f}) (ALS fallback)")

# ============================================================
# 3. SESSION-BASED
# ============================================================
print("\n" + "-" * 65)
print("3. SESSION-BASED RECOMMENDATIONS")
print("-" * 65)

r = api("POST", "/session/train", {"view_logs": view_logs})
ns = r.get("data",{}).get("n_sessions",0)
print(f"  -> Da xay dung {ns} sessions tu view logs")

r = api("POST", "/session/recommend", {
    "session_items": ["prod_1", "prod_2"],
    "products": products, "top_n": 5, "strategy": "hybrid"
})
recs = r.get("data",{}).get("recommendations",[])
print(f"  -> Goi y khi dang xem prod_1, prod_2:")
for rec in recs:
    print(f"     - {rec['product_id']} (score: {rec['score']:.3f})")

# ============================================================
# 4. EVALUATION
# ============================================================
print("\n" + "-" * 65)
print("4. DANH GIA CHAT LUONG AI")
print("-" * 65)

r = api("POST", "/evaluate/offline", {
    "orders": orders, "products": products, "train_ratio": 0.8, "top_n": 5
})
metrics = r.get("data",{}).get("metrics",{})
details = r.get("data",{}).get("details",{})
if metrics:
    print(f"  Du lieu: {details.get('n_train_samples',0)} train / {details.get('n_test_samples',0)} test")
    print(f"  So user danh gia: {details.get('n_users_evaluated',0)}")
    for k, v in metrics.items():
        print(f"  {k}: {v:.4f}" if isinstance(v, float) else f"  {k}: {v}")

# ============================================================
# 5. A/B TESTING
# ============================================================
print("\n" + "-" * 65)
print("5. A/B TESTING")
print("-" * 65)

logs = []
for i in range(8):
    logs.append({"group": "control", "user_id": f"user_{i}", "product_id": f"prod_{i}", "action": "impression"})
    logs.append({"group": "treatment", "user_id": f"user_{i}", "product_id": f"prod_{i}", "action": "impression"})
for i in range(0, 8, 2):
    logs.append({"group": "control", "user_id": f"user_{i}", "product_id": f"prod_{i}", "action": "click"})
    if i % 4 == 0:
        logs.append({"group": "control", "user_id": f"user_{i}", "product_id": f"prod_{i}", "action": "purchase", "revenue": 200000})
for i in range(0, 8, 3):
    logs.append({"group": "treatment", "user_id": f"user_{i}", "product_id": f"prod_{i}", "action": "click"})

r = api("POST", "/abtest/log_batch", logs)
print(f"  -> {r.get('data',{}).get('message','')}")

r = api("GET", "/abtest/report")
report = r.get("data",{})
for g in report.get("groups",[]):
    m = report.get("metrics_per_group",{}).get(g,{})
    print(f"  Nhom {g}:")
    print(f"     Impressions: {m.get('impressions',0)}")
    print(f"     Clicks: {m.get('clicks',0)}")
    print(f"     Purchases: {m.get('purchases',0)}")
    print(f"     CTR: {m.get('ctr',0):.3f}")
    print(f"     Revenue: {m.get('revenue',0):,.0f}")

for key, comp in report.get("comparisons",{}).items():
    print(f"  So sanh {key}:")
    ctr = comp.get("ctr",{})
    print(f"     CTR: control={ctr.get('control',0):.3f}, treatment={ctr.get('treatment',0):.3f}")
    print(f"     Winner: {ctr.get('winner','?')}")
    rev = comp.get("revenue",{})
    print(f"     Revenue: control={rev.get('control',0):,.0f}, treatment={rev.get('treatment',0):,.0f}")

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "=" * 65)
print("  HOAN TAT: Tat ca chuc nang AI da duoc test!")
print("  Server dang chay tai: http://localhost:8000")
print("  Swagger UI: http://localhost:8000/docs")
print("=" * 65)
