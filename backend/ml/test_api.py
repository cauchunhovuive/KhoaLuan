"""
Test script for ML Service API
Chay: python test_api.py (khi server da chay o port 8000)
"""

import json
import urllib.request
import urllib.error
import sys
import time

# Fix Windows console encoding for Vietnamese Unicode
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:8000"
PASS = 0
FAIL = 0

def request(method, path, body=None):
    global PASS, FAIL
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode() if body else None
    
    try:
        req = urllib.request.Request(
            url,
            data=data,
            method=method,
            headers={"Content-Type": "application/json"} if body else {},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            status = "OK" if result.get("success", True) else "FAIL"
            if status == "OK":
                PASS += 1
            else:
                FAIL += 1
                print(f"  [!] Response success=false: {result}")
            return result
    except urllib.error.HTTPError as e:
        FAIL += 1
        body = e.read().decode()
        print(f"  [HTTP {e.code}] {body[:200]}")
        return None
    except Exception as e:
        FAIL += 1
        print(f"  [ERROR] {e}")
        return None


# ===========================
# SAMPLE DATA
# ===========================

SAMPLE_USERS = [f"user_{i}" for i in range(20)]
SAMPLE_PRODUCTS = [
    {"id": f"prod_{i}", "name": f"San pham {i}"}
    for i in range(30)
]

SAMPLE_ORDERS = []
import random
random.seed(42)
for _ in range(100):
    user = random.choice(SAMPLE_USERS)
    product = random.choice(SAMPLE_PRODUCTS)
    qty = random.randint(1, 3)
    SAMPLE_ORDERS.append({
        "user_id": user,
        "product_id": product["id"],
        "quantity": qty,
        "created_at": f"2024-01-{random.randint(1, 28):02d}T{random.randint(0,23):02d}:00:00",
    })

SAMPLE_VIEW_LOGS = [
    {
        "user_id": random.choice(SAMPLE_USERS),
        "product_id": random.choice(SAMPLE_PRODUCTS)["id"],
        "timestamp": f"2024-06-{random.randint(1, 15):02d}T{random.randint(8,22):02d}:{random.randint(0,59):02d}:00",
    }
    for _ in range(50)
]


# ===========================
# TESTS
# ===========================

def test_health():
    print("\n[1] GET /health")
    r = request("GET", "/health")
    assert r and r.get("status") == "ok", "Health check failed"
    print("  [PASS]")

def test_info():
    print("\n[2] GET /info")
    r = request("GET", "/info")
    assert r, "Info endpoint failed"
    models = r.get("models", {})
    assert "clustering" in models, "Missing clustering"
    assert "collaborative_filtering" in models, "Missing cf"
    assert "session_based" in models, "Missing session"
    assert "evaluation" in models, "Missing evaluation"
    print(f"  Models: {list(models.keys())}")
    print("  [PASS]")

def test_cf_train():
    print("\n[3] POST /cf/train")
    r = request("POST", "/cf/train", {
        "orders": SAMPLE_ORDERS,
        "products": SAMPLE_PRODUCTS,
    })
    assert r, "CF train failed"
    models_trained = r.get("data", {}).get("models", [])
    print(f"  Models trained: {models_trained}")
    print("  [PASS]")

def test_cf_recommend():
    print("\n[4] POST /cf/recommend (hybrid)")
    r = request("POST", "/cf/recommend", {
        "user_id": "user_0",
        "orders": SAMPLE_ORDERS,
        "products": SAMPLE_PRODUCTS,
        "top_n": 5,
        "strategy": "hybrid",
    })
    assert r, "CF recommend failed"
    recs = r.get("data", {}).get("recommendations", [])
    print(f"  Top 5 recommendations: {[rec['product_id'] + ' (' + str(round(rec['score'],2)) + ')' for rec in recs[:5]]}")
    assert len(recs) > 0, "No recommendations returned"
    print("  [PASS]")

def test_cf_recommend_item_cf():
    print("\n[5] POST /cf/recommend (item_cf)")
    r = request("POST", "/cf/recommend", {
        "user_id": "user_0",
        "orders": SAMPLE_ORDERS,
        "products": SAMPLE_PRODUCTS,
        "top_n": 5,
        "strategy": "item_cf",
    })
    assert r, "Item-Item CF recommend failed"
    recs = r.get("data", {}).get("recommendations", [])
    print(f"  Top 5: {[rec['product_id'] for rec in recs[:5]]}")
    print("  [PASS]")

def test_cf_recommend_user_cf():
    print("\n[6] POST /cf/recommend (user_cf)")
    r = request("POST", "/cf/recommend", {
        "user_id": "user_1",
        "orders": SAMPLE_ORDERS,
        "products": SAMPLE_PRODUCTS,
        "top_n": 5,
        "strategy": "user_cf",
    })
    assert r, "User-User CF recommend failed"
    recs = r.get("data", {}).get("recommendations", [])
    print(f"  Top 5: {[rec['product_id'] for rec in recs[:5]]}")
    print("  [PASS]")

def test_cf_recommend_als():
    print("\n[7] POST /cf/recommend (als)")
    r = request("POST", "/cf/recommend", {
        "user_id": "user_2",
        "orders": SAMPLE_ORDERS,
        "products": SAMPLE_PRODUCTS,
        "top_n": 5,
        "strategy": "als",
    })
    assert r, "ALS recommend failed"
    recs = r.get("data", {}).get("recommendations", [])
    print(f"  Top 5: {[rec['product_id'] + ' (' + str(round(rec['score'],2)) + ')' for rec in recs[:5]]}")
    print("  [PASS]")

def test_cf_similar():
    print("\n[8] POST /cf/similar")
    r = request("POST", "/cf/similar", {
        "product_id": "prod_0",
        "orders": SAMPLE_ORDERS,
        "products": SAMPLE_PRODUCTS,
        "top_n": 5,
    })
    assert r, "Similar products failed"
    similar = r.get("data", {}).get("similar_products", [])
    print(f"  Products similar to prod_0: {[s['product_id'] + ' (' + str(round(s['similarity_score'],3)) + ')' for s in similar[:5]]}")
    print("  [PASS]")

def test_cf_hybrid():
    print("\n[9] POST /cf/recommend/hybrid")
    r = request("POST", "/cf/recommend/hybrid", {
        "user_id": "user_3",
        "orders": SAMPLE_ORDERS,
        "products": SAMPLE_PRODUCTS,
        "top_n": 8,
    })
    assert r, "Hybrid recommend failed"
    recs = r.get("data", {}).get("recommendations", [])
    print(f"  Hybrid top 8: {[rec['product_id'] for rec in recs]}")
    print("  [PASS]")

def test_cf_explain():
    print("\n[10] POST /cf/explain")
    r = request("POST", "/cf/explain", {
        "user_id": "user_4",
        "orders": SAMPLE_ORDERS,
        "products": SAMPLE_PRODUCTS,
        "top_n": 5,
    })
    assert r, "Explain failed"
    explanations = r.get("data", {}).get("recommendations", [])
    weights = r.get("data", {}).get("weights", {})
    print(f"  Weights: {weights}")
    if explanations:
        e = explanations[0]
        print(f"  Top product: {e['product_id']}")
        print(f"  Methods: {[m['method'] for m in e.get('methods', [])]}")
    print("  [PASS]")

def test_session_train():
    print("\n[11] POST /session/train")
    r = request("POST", "/session/train", {
        "view_logs": SAMPLE_VIEW_LOGS,
    })
    assert r, "Session train failed"
    data = r.get("data", {})
    print(f"  Sessions built: {data.get('n_sessions', '?')}")
    print("  [PASS]")

def test_session_recommend():
    print("\n[12] POST /session/recommend")
    session_items = ["prod_0", "prod_5", "prod_10"]
    r = request("POST", "/session/recommend", {
        "session_items": session_items,
        "products": SAMPLE_PRODUCTS,
        "top_n": 5,
        "strategy": "hybrid",
    })
    assert r, "Session recommend failed"
    recs = r.get("data", {}).get("recommendations", [])
    print(f"  Session items: {session_items}")
    print(f"  Recommendations: {[rec['product_id'] + ' (' + str(round(rec['score'],3)) + ')' for rec in recs[:5]]}")
    print("  [PASS]")

def test_session_recommend_cooccurrence():
    print("\n[13] POST /session/recommend (cooccurrence)")
    r = request("POST", "/session/recommend", {
        "session_items": ["prod_0"],
        "products": SAMPLE_PRODUCTS,
        "top_n": 5,
        "strategy": "cooccurrence",
    })
    assert r, "Session cooccurrence failed"
    recs = r.get("data", {}).get("recommendations", [])
    print(f"  Co-occurrence recs: {[rec['product_id'] for rec in recs[:5]]}")
    print("  [PASS]")

def test_evaluate_offline():
    print("\n[14] POST /evaluate/offline")
    r = request("POST", "/evaluate/offline", {
        "orders": SAMPLE_ORDERS,
        "products": SAMPLE_PRODUCTS,
        "train_ratio": 0.8,
        "top_n": 10,
    })
    assert r, "Offline evaluation failed"
    metrics = r.get("data", {}).get("metrics", {})
    details = r.get("data", {}).get("details", {})
    print(f"  Precision: {metrics.get('precision', '?'):.4f}")
    print(f"  Recall: {metrics.get('recall', '?'):.4f}")
    print(f"  F1 Score: {metrics.get('f1_score', '?'):.4f}")
    print(f"  Hit Rate: {metrics.get('hit_rate', '?'):.4f}")
    print(f"  MAP: {metrics.get('map_score', '?'):.4f}")
    print(f"  NDCG: {metrics.get('ndcg_score', '?'):.4f}")
    print(f"  Coverage: {metrics.get('coverage', '?'):.4f}")
    print(f"  Test users: {details.get('n_test_users', '?')}")
    print("  [PASS]")

def test_abtest():
    print("\n[15] POST /abtest/log (batch)")
    logs = []
    for i in range(10):
        logs.append({
            "group": "control",
            "user_id": f"user_{i}",
            "product_id": f"prod_{i}",
            "action": "impression",
        })
        if i < 5:
            logs.append({
                "group": "treatment",
                "user_id": f"user_{i}",
                "product_id": f"prod_{i}",
                "action": "impression",
            })
        if i % 3 == 0:
            logs.append({
                "group": "control",
                "user_id": f"user_{i}",
                "product_id": f"prod_{i}",
                "action": "click",
            })
        if i % 4 == 0:
            logs.append({
                "group": "control",
                "user_id": f"user_{i}",
                "product_id": f"prod_{i}",
                "action": "purchase",
                "revenue": 500000 + i * 10000,
            })
        if i % 6 == 0:
            logs.append({
                "group": "treatment",
                "user_id": f"user_{i}",
                "product_id": f"prod_{i}",
                "action": "click",
            })

    r = request("POST", "/abtest/log_batch", logs)
    assert r, "A/B batch log failed"
    print(f"  Logged: {r.get('data', {}).get('message', '?')}")
    
    print("\n[16] GET /abtest/report")
    r = request("GET", "/abtest/report")
    assert r, "A/B report failed"
    report = r.get("data", {})
    groups = report.get("groups", [])
    print(f"  Groups: {groups}")
    for group in groups:
        metrics = report.get("metrics_per_group", {}).get(group, {})
        print(f"  {group}: CTR={metrics.get('ctr', 0):.3f}, Conversions={metrics.get('overall_conversion', 0):.3f}, Revenue={metrics.get('revenue', 0):,.0f}")
    
    comparisons = report.get("comparisons", {})
    for key, comp in comparisons.items():
        ctr = comp.get("ctr", {})
        print(f"  {key}: CTR improvement={ctr.get('improvement_pct', 0):.1f}%, winner={ctr.get('winner', '?')}")
    
    print("  [PASS]")

def test_cluster_profiles():
    print("\n[17] GET /cluster/profiles")
    r = request("GET", "/cluster/profiles")
    assert r, "Cluster profiles failed"
    profiles = r.get("data", [])
    # Use repr() to avoid UnicodeEncodeError on Windows terminal
    print(f"  Profiles: {[(p['name'].encode('ascii', errors='replace').decode(), p['color']) for p in profiles]}")
    print("  [PASS]")

def test_cluster_stats():
    print("\n[18] GET /cluster/stats")
    r = request("GET", "/cluster/stats")
    assert r, "Cluster stats failed"
    stats = r.get("data", [])
    print(f"  Stats: {[(s['name'].encode('ascii', errors='replace').decode(), s.get('description', '')[:30].encode('ascii', errors='replace').decode()) for s in stats]}")
    print("  [PASS]")

def test_cold_start_user():
    """Test recommendation cho user chua co trong he thong (cold start)"""
    print("\n[19] POST /cf/recommend (cold start user)")
    r = request("POST", "/cf/recommend", {
        "user_id": "new_user_999",
        "orders": SAMPLE_ORDERS,
        "products": SAMPLE_PRODUCTS,
        "top_n": 5,
        "strategy": "hybrid",
    })
    assert r, "Cold start failed"
    recs = r.get("data", {}).get("recommendations", [])
    print(f"  Cold-start recs: {[rec['product_id'] for rec in recs[:5]]}")
    print("  [PASS]")


# ===========================
# MAIN
# ===========================

if __name__ == "__main__":
    print("=" * 60)
    print("  KhoaLuan ML Service API Test Suite")
    print("=" * 60)
    print(f"  Server: {BASE_URL}")
    
    # Check if server is running
    try:
        urllib.request.urlopen(f"{BASE_URL}/health", timeout=3)
    except Exception:
        print("\n  [!] Server is NOT running!")
        print("  Start it with:")
        print('    cd backend/ml')
        print('    python -m uvicorn clustering.api:app --host 0.0.0.0 --port 8000')
        sys.exit(1)
    
    # Run tests
    test_health()
    test_info()
    test_cf_train()
    test_cf_recommend()
    test_cf_recommend_item_cf()
    test_cf_recommend_user_cf()
    test_cf_recommend_als()
    test_cf_similar()
    test_cf_hybrid()
    test_cf_explain()
    test_session_train()
    test_session_recommend()
    test_session_recommend_cooccurrence()
    test_evaluate_offline()
    test_abtest()
    test_cluster_profiles()
    test_cluster_stats()
    test_cold_start_user()
    
    # Summary
    total = PASS + FAIL
    print("\n" + "=" * 60)
    print(f"  RESULTS: {PASS}/{total} passed, {FAIL}/{total} failed")
    print("=" * 60)
    
    sys.exit(0 if FAIL == 0 else 1)
