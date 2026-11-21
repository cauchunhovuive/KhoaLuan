import csv
from datetime import datetime, timedelta
from collections import defaultdict

# Read the CSV file
rows = []
with open('sql.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows.append(row)

# Parse timestamps - handle both with and without microseconds
def parse_timestamp(ts):
    try:
        return datetime.strptime(ts, '%Y-%m-%d %H:%M:%S.%f')
    except ValueError:
        return datetime.strptime(ts, '%Y-%m-%d %H:%M:%S')

# Parse timestamps and group by user
user_events = defaultdict(list)
for row in rows:
    user_id = row['userId']
    product_id = row['productId']
    product_name = row['productName']
    created_at = parse_timestamp(row['createdAt'])
    user_events[user_id].append({
        'productId': product_id,
        'productName': product_name,
        'createdAt': created_at
    })

# Sort events by time for each user
for user_id in user_events:
    user_events[user_id].sort(key=lambda x: x['createdAt'])

# Group into 30-minute sessions
sessions = []

for user_id, events in user_events.items():
    if not events:
        continue
    
    session_id = 1
    session_products = []
    last_time = None
    
    for event in events:
        if last_time is not None:
            gap = event['createdAt'] - last_time
            if gap > timedelta(minutes=30):
                if session_products:
                    sessions.append({
                        'userId': user_id,
                        'sessionId': session_id,
                        'products': session_products.copy(),
                        'productCount': len(session_products),
                    })
                session_id += 1
                session_products = []
        
        session_products.append({
            'productId': event['productId'],
            'productName': event['productName']
        })
        last_time = event['createdAt']
    
    if session_products:
        sessions.append({
            'userId': user_id,
            'sessionId': session_id,
            'products': session_products.copy(),
            'productCount': len(session_products)
        })

print(f"Total sessions: {len(sessions)}")
print()

# Analyze products that appear together in sessions
product_pair_counts = defaultdict(int)
product_session_counts = defaultdict(int)

for session in sessions:
    products = session['products']
    
    for p in products:
        product_session_counts[p['productName']] += 1
    
    for i in range(len(products)):
        for j in range(i+1, len(products)):
            pair_key = (products[i]['productName'], products[j]['productName'])
            product_pair_counts[pair_key] += 1

# Display product pairs top 30 (encode as ASCII to avoid Unicode issues)
sorted_pairs = sorted(product_pair_counts.items(), key=lambda x: x[1], reverse=True)
print("=== PRODUCT PAIRS THAT APPEAR TOGETHER IN SESSIONS (top 30) ===")
for pair, count in sorted_pairs[:30]:
    p1 = pair[0].encode('ascii', 'replace').decode()
    p2 = pair[1].encode('ascii', 'replace').decode()
    print(f"  {count:3d} sessions: {p1[:40]}... + {p2[:40]}...")

print()
print("=== PRODUCTS BY SESSION COUNT (top 30) ===")
sorted_products = sorted(product_session_counts.items(), key=lambda x: x[1], reverse=True)
for product, count in sorted_products[:30]:
    p = product.encode('ascii', 'replace').decode()
    print(f"  {count:3d} sessions: {p[:50]}...")
