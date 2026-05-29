#!/bin/sh
# KhoaLuan Backend Startup Script
# Tự động push schema và seed database khi container khởi động

echo "================================================"
echo "  KhoaLuan Backend - Khởi động..."
echo "================================================"

# Đợi database sẵn sàng (thử kết nối bằng Node.js)
echo "[1/3] Đợi PostgreSQL sẵn sàng..."
for i in $(seq 1 30); do
  node -e "
    const { PrismaClient } = require('@prisma/client');
    new PrismaClient().\$connect().then(() => process.exit(0)).catch(() => process.exit(1));
  " 2>/dev/null && break
  if [ "$i" -eq 30 ]; then
    echo "❌ Không thể kết nối database sau 30 lần thử"
    exit 1
  fi
  sleep 2
done
echo "  ✔ Database sẵn sàng"

# Push schema lên database
echo "[2/3] Push schema..."
npx prisma db push --accept-data-loss 2>&1 | grep -v "already exists"

# Seed dữ liệu mẫu
echo "[3/3] Seed dữ liệu mẫu..."
node prisma/seed.js

echo ""
echo "================================================"
echo "  ✅ Khởi động hoàn tất!"
echo "  🌐 http://localhost:5000"
echo "================================================"
echo ""

# Khởi động server
exec npm run dev
