require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed dữ liệu ML Test...\n');

  // ─── Lấy dữ liệu hiện có ───
  const customers = await prisma.user.findMany({ where: { role: 'CUSTOMER' } });
  const products = await prisma.product.findMany({ where: { isActive: true } });
  const partners = await prisma.user.findMany({ where: { role: 'PARTNER', isApproved: true } });
  const clusters = await prisma.cluster.findMany();

  console.log(`  ✔ Customers: ${customers.length}, Products: ${products.length}, Partners: ${partners.length}, Clusters: ${clusters.length}`);

  if (customers.length === 0 || products.length === 0) {
    console.error('❌ Không có dữ liệu. Chạy seed.js và seed-full.js trước.');
    return;
  }

  // ================================================================
  // 1. PRODUCT VIEWS — Cho Session-based Recommendations
  // ================================================================
  // Xoá views cũ để seed lại với dữ liệu lớn hơn
  const existingViews = await prisma.productView.count();
  if (existingViews > 0) {
    console.log(`  🗑️ Xoá ${existingViews} views cũ để tạo lại...`);
    await prisma.productView.deleteMany();
  }

  console.log('\n📊 Tạo 200+ product views với co-occurrence pattern rõ ràng...');

  // Helper: tìm sản phẩm theo từ khóa trong tên (nhiều hơn 1 sản phẩm/từ khóa)
  const findProducts = (keywords, maxItems = 12) => {
    const matched = [];
    const usedIds = new Set();
    for (const k of keywords) {
      const kLower = k.toLowerCase();
      const candidates = products.filter(x =>
        !usedIds.has(x.id) && x.name.toLowerCase().includes(kLower)
      );
      for (const p of candidates) {
        if (matched.length >= maxItems) break;
        matched.push(p);
        usedIds.add(p.id);
      }
      if (matched.length >= maxItems) break;
    }
    return matched;
  };

  // Tạo 30+ sessions, mỗi session 5-12 products từ cùng category family
  // Một số products xuất hiện ở nhiều session để tạo co-occurrence đa dạng
  const sessions = [
    // === Điện thoại & Phụ kiện (sessions 1-4) ===
    { userIdx: 0, items: findProducts(['iPhone', 'Samsung', 'Ốp lưng', 'Cáp', 'Pin sạc dự', 'Samsung Galaxy', 'iPhone 15', 'iPhone 14']) },
    { userIdx: 0, items: findProducts(['Xiaomi', 'OPPO', 'Google', 'Tai nghe', 'Loa', 'AirPods', 'Đồng hồ', 'Sạc']) },
    { userIdx: 3, items: findProducts(['Samsung', 'AirPods', 'Đồng hồ', 'Pin sạc', 'Ốp lưng', 'Loa', 'Cáp', 'Sạc']) },
    { userIdx: 10, items: findProducts(['iPhone', 'Cáp', 'Ốp lưng', 'Pin sạc dự', 'Tai nghe', 'Loa', 'Đồng hồ']) },

    // === Laptop & Phụ kiện (sessions 5-8) ===
    { userIdx: 1, items: findProducts(['MacBook Pro', 'iPad', 'Chuột', 'Bàn phím cơ', 'Webcam', 'MacBook', 'Bàn phím', 'Logitech']) },
    { userIdx: 1, items: findProducts(['Dell', 'Lenovo', 'Surface', 'Màn hình LG', 'Chuột', 'Bàn phím', 'Webcam', 'Logitech']) },
    { userIdx: 4, items: findProducts(['MacBook Air', 'iPad Air', 'Logitech', 'Keychron', 'Webcam', 'Chuột', 'Màn hình']) },
    { userIdx: 10, items: findProducts(['MacBook Pro', 'iPad', 'Chuột', 'Bàn phím', 'Webcam', 'Màn hình', 'Keychron']) },

    // === Thời trang (sessions 9-12) ===
    { userIdx: 2, items: findProducts(['Áo sơ mi', 'Quần tây', 'Giày thể thao nam', 'Áo khoác jean', 'Đồng hồ nam', 'Áo thun', 'Áo khoác']) },
    { userIdx: 2, items: findProducts(['Đầm', 'Váy hoa', 'Túi xách', 'Balo thời trang', 'Áo khoác', 'Áo sơ mi', 'Quần tây']) },
    { userIdx: 5, items: findProducts(['Áo thun', 'Giày thể thao', 'Balo', 'Áo khoác jean', 'Quần tây', 'Áo sơ mi', 'Đồng hồ']) },
    { userIdx: 11, items: findProducts(['Đầm', 'Váy hoa', 'Túi xách', 'Balo thời trang', 'Giày thể thao', 'Áo khoác']) },

    // === Đồ gia dụng (sessions 13-16) ===
    { userIdx: 3, items: findProducts(['Nồi chiên', 'Bộ nồi', 'Máy ép', 'Bộ dao', 'Máy pha cà', 'Nồi chiên không', 'Máy ép chậm']) },
    { userIdx: 3, items: findProducts(['Robot hút bụi', 'Máy lọc không', 'Bộ nồi', 'Máy ép', 'Nồi chiên', 'Bộ dao', 'Máy pha cà']) },
    { userIdx: 6, items: findProducts(['Máy pha cà', 'Bộ dao', 'Nồi chiên', 'Máy ép', 'Robot hút bụi', 'Bếp từ', 'Máy lọc']) },
    { userIdx: 11, items: findProducts(['Nồi chiên', 'Máy ép', 'Máy pha cà', 'Bộ nồi', 'Bộ dao', 'Robot hút bụi']) },

    // === Sách & VPP (sessions 17-20) ===
    { userIdx: 4, items: findProducts(['Nhà giả kim', 'Atomic Habits', 'Sổ tay', 'Sổ planner', 'Bút máy', 'Sách "Nhà', 'Sách "Atomic']) },
    { userIdx: 4, items: findProducts(['Đắc nhân tâm', 'Tư duy nhanh', 'Sổ planner', 'Bút máy', 'Sổ tay', 'Sách "Đắc', 'Sách "Tư']) },
    { userIdx: 7, items: findProducts(['Nhà giả kim', 'Sổ tay', 'Bút máy', 'Đắc nhân tâm', 'Atomic Habits', 'Sổ planner']) },
    { userIdx: 12, items: findProducts(['Đắc nhân tâm', 'Nhà giả kim', 'Sổ tay', 'Bút máy', 'Atomic Habits', 'Sổ planner', 'Tư duy nhanh']) },

    // === Mỹ phẩm & Chăm sóc da (sessions 21-24) ===
    { userIdx: 5, items: findProducts(['Kem chống nắng', 'Serum Vitamin', 'Sữa rửa mặt', 'Kem dưỡng', 'Mặt nạ', 'Nước tẩy trang', 'Phấn phủ']) },
    { userIdx: 5, items: findProducts(['Son môi', 'Phấn phủ', 'Set cọ', 'Nước hoa', 'Mặt nạ', 'Kem dưỡng', 'Sữa rửa mặt']) },
    { userIdx: 8, items: findProducts(['Kem dưỡng', 'Nước tẩy trang', 'Sữa rửa mặt', 'Serum', 'Kem chống nắng', 'Mặt nạ', 'Son môi']) },
    { userIdx: 12, items: findProducts(['Kem chống nắng', 'Serum', 'Sữa rửa mặt', 'Kem dưỡng', 'Nước tẩy trang', 'Son môi', 'Phấn phủ']) },

    // === Thể thao & Du lịch (sessions 25-28) ===
    { userIdx: 6, items: findProducts(['Giày chạy bộ', 'Bộ tạ', 'Thảm tập', 'Bộ đồ tập', 'Bình nước', 'Dây nhảy', 'Máy massage', 'Balo du lịch']) },
    { userIdx: 6, items: findProducts(['Balo du lịch', 'Bình nước', 'Máy massage', 'Bộ đồ tập', 'Giày chạy bộ', 'Bộ tạ', 'Thảm tập']) },
    { userIdx: 9, items: findProducts(['Xe đạp', 'Vợt tennis', 'Balo du lịch', 'Giày chạy bộ', 'Bình nước', 'Dây nhảy', 'Bộ đồ tập']) },
    { userIdx: 13, items: findProducts(['Giày chạy bộ', 'Thảm tập', 'Bộ đồ tập', 'Bình nước', 'Dây nhảy', 'Balo du lịch', 'Bộ tạ']) },

    // === Thú cưng (sessions 29-31) ===
    { userIdx: 7, items: findProducts(['Thức ăn cho chó', 'Bát ăn chậm', 'Vòng cổ', 'Đồ chơi', 'Dầu tắm', 'Đồ chơi cho chó', 'Đồ chơi laser']) },
    { userIdx: 7, items: findProducts(['Cát vệ sinh', 'Nhà vệ sinh', 'Đồ chơi laser', 'Balo vận chuyển', 'Lồng vận', 'Vòng cổ', 'Bát ăn']) },
    { userIdx: 13, items: findProducts(['Thức ăn cho chó', 'Cát vệ sinh', 'Đồ chơi', 'Vòng cổ', 'Bát ăn chậm', 'Dầu tắm', 'Balo vận chuyển']) },

    // === Nội thất & Trang trí (sessions 32-34) ===
    { userIdx: 8, items: findProducts(['Bàn làm việc', 'Ghế công thái', 'Đèn bàn', 'Kệ sách', 'Tranh treo', 'Thảm trải', 'Ghế ergonomic']) },
    { userIdx: 8, items: findProducts(['Giường ngủ', 'Tủ quần áo', 'Bộ sofa', 'Đèn thả', 'Thảm trải', 'Bàn làm việc', 'Kệ sách']) },
    { userIdx: 14, items: findProducts(['Bàn làm việc', 'Ghế công thái', 'Đèn bàn', 'Kệ sách', 'Tranh treo', 'Thảm trải', 'Bộ sofa']) },

    // === Mẹ & Bé (sessions 35-37) ===
    { userIdx: 9, items: findProducts(['Máy hâm sữa', 'Bình sữa', 'Máy tiệt trùng', 'Địu em bé', 'Sách vải', 'Bình sữa PPSU', 'Máy hâm']) },
    { userIdx: 9, items: findProducts(['Xe đẩy', 'Ghế ăn dặm', 'Bộ quần áo sơ', 'Máy đưa võng', 'Đồ chơi lắp ráp', 'Sách vải', 'Địu em bé']) },
    { userIdx: 14, items: findProducts(['Bình sữa', 'Máy hâm sữa', 'Máy tiệt trùng', 'Xe đẩy', 'Ghế ăn dặm', 'Sách vải', 'Đồ chơi lắp ráp']) },

    // === Cross-category sessions (38-40) — để tạo liên kết chéo ===
    { userIdx: 0, items: findProducts(['iPhone', 'MacBook Air', 'Tai nghe', 'Balo du lịch', 'Sổ tay', 'Bút máy', 'Sạc']) },
    { userIdx: 2, items: findProducts(['Giày thể thao', 'Áo thun', 'Bình nước', 'Balo du lịch', 'Sách', 'Đồng hồ', 'Áo khoác']) },
    { userIdx: 4, items: findProducts(['iPad Air', 'Sổ planner', 'Bút máy', 'Balo thời trang', 'Kem chống nắng', 'Sổ tay', 'Áo thun']) },
  ];

  let viewCount = 0;
  for (const session of sessions) {
    const user = customers[session.userIdx % customers.length];
    const items = session.items.filter(Boolean);
    if (!user || items.length < 3) continue;

    // Tạo view cách nhau 2-5 phút, tất cả trong cùng 1 phiên (< 30 phút)
    for (let i = 0; i < items.length; i++) {
      const viewTime = new Date(Date.now() - (items.length - i) * (2 + Math.floor(Math.random() * 4)) * 60 * 1000);
      await prisma.productView.create({
        data: {
          userId: user.id,
          productId: items[i].id,
          createdAt: viewTime,
        },
      });
      viewCount++;
    }
  }
  console.log(`  ✅ Tạo ${viewCount} product views (${sessions.length} sessions)`);

  // ================================================================
  // 2. ĐƠN HÀNG BỔ SUNG — Cho Collaborative Filtering
  // ================================================================
  const existingExtraOrders = await prisma.order.count();
  // Chỉ tạo nếu cần thêm (mục tiêu ~30-50 đơn hàng tổng cộng)
  const targetOrders = 50;
  const neededOrders = Math.max(0, targetOrders - existingExtraOrders);

  if (neededOrders > 0) {
    console.log(`\n📋 Tạo thêm ${neededOrders} đơn hàng (hiện có: ${existingExtraOrders}, mục tiêu: ${targetOrders})...`);

    // Các mẫu order pattern — tạo sự liên kết giữa sản phẩm
    // Pattern 1: Mua iPhone → mua ốp lưng + cáp sạc
    // Pattern 2: Mua MacBook → mua chuột + túi chống sốc
    // Pattern 3: Mua nồi chiên → mua máy ép chậm
    // Pattern 4: Mua sách A → mua sách B (Nhà giả kim + Atomic Habits)
    // Pattern 5: Mua laptop → mua webcam + bàn phím
    // Pattern 6: Mua giày thể thao → mua balo thể thao

    const findProduct = (keyword) => products.find(p =>
      p.name.toLowerCase().includes(keyword.toLowerCase())
    );

    const orderPatterns = [
      // Pattern: Điện thoại + phụ kiện
      { user: customers[0], items: [{ name: 'iPhone', qty: 1 }, { name: 'Ốp lưng', qty: 2 }, { name: 'Cáp', qty: 1 }] },
      { user: customers[3 % customers.length], items: [{ name: 'Samsung', qty: 1 }, { name: 'Pin sạc', qty: 1 }] },
      { user: customers[5 % customers.length], items: [{ name: 'iPhone', qty: 1 }, { name: 'Tai nghe', qty: 1 }, { name: 'Ốp lưng', qty: 1 }] },

      // Pattern: Laptop + phụ kiện
      { user: customers[1 % customers.length], items: [{ name: 'MacBook', qty: 1 }, { name: 'Chuột', qty: 1 }, { name: 'Bàn phím', qty: 1 }] },
      { user: customers[6 % customers.length], items: [{ name: 'Surface', qty: 1 }, { name: 'Chuột', qty: 1 }] },
      { user: customers[4 % customers.length], items: [{ name: 'MacBook Air', qty: 1 }, { name: 'Webcam', qty: 1 }] },

      // Pattern: Thời trang
      { user: customers[2 % customers.length], items: [{ name: 'Áo sơ mi', qty: 2 }, { name: 'Quần tây', qty: 1 }] },
      { user: customers[7 % customers.length], items: [{ name: 'Đầm', qty: 1 }, { name: 'Túi xách', qty: 1 }] },
      { user: customers[0], items: [{ name: 'Áo thun', qty: 3 }, { name: 'Giày thể thao', qty: 1 }] },
      { user: customers[5 % customers.length], items: [{ name: 'Áo khoác', qty: 1 }, { name: 'Balo thời trang', qty: 1 }] },

      // Pattern: Đồ gia dụng + nhà bếp
      { user: customers[3 % customers.length], items: [{ name: 'Nồi chiên', qty: 1 }, { name: 'Máy ép', qty: 1 }] },
      { user: customers[8 % customers.length], items: [{ name: 'Robot hút bụi', qty: 1 }, { name: 'Máy lọc', qty: 1 }] },
      { user: customers[1 % customers.length], items: [{ name: 'Bộ nồi', qty: 1 }, { name: 'Bộ dao', qty: 1 }] },

      // Pattern: Sách — người mua sách A cũng mua sách B
      { user: customers[4 % customers.length], items: [{ name: 'Nhà giả kim', qty: 1 }, { name: 'Atomic Habits', qty: 1 }] },
      { user: customers[9 % customers.length], items: [{ name: 'Đắc nhân tâm', qty: 1 }, { name: 'Tư duy nhanh', qty: 1 }, { name: 'Sổ planner', qty: 1 }] },
      { user: customers[2 % customers.length], items: [{ name: 'Sách "Nhà giả kim"', qty: 2 }, { name: 'Bút máy', qty: 1 }] },

      // Pattern: Mỹ phẩm — routine chăm sóc da
      { user: customers[6 % customers.length], items: [{ name: 'Kem chống nắng', qty: 1 }, { name: 'Serum Vitamin', qty: 1 }, { name: 'Sữa rửa mặt', qty: 1 }] },
      { user: customers[0], items: [{ name: 'Son môi', qty: 2 }, { name: 'Phấn phủ', qty: 1 }] },
      { user: customers[7 % customers.length], items: [{ name: 'Mặt nạ', qty: 3 }, { name: 'Kem dưỡng', qty: 1 }, { name: 'Nước tẩy trang', qty: 1 }] },

      // Pattern: Thể thao
      { user: customers[8 % customers.length], items: [{ name: 'Giày chạy bộ', qty: 1 }, { name: 'Thảm tập', qty: 1 }, { name: 'Bình nước', qty: 1 }] },
      { user: customers[3 % customers.length], items: [{ name: 'Bộ tạ', qty: 1 }, { name: 'Bộ đồ tập', qty: 2 }] },
      { user: customers[1 % customers.length], items: [{ name: 'Dây nhảy', qty: 1 }, { name: 'Bình nước', qty: 1 }] },

      // Pattern: Thú cưng
      { user: customers[9 % customers.length], items: [{ name: 'Thức ăn cho chó', qty: 2 }, { name: 'Bát ăn chậm', qty: 1 }] },
      { user: customers[5 % customers.length], items: [{ name: 'Cát vệ sinh', qty: 3 }, { name: 'Nhà vệ sinh', qty: 1 }] },
      { user: customers[4 % customers.length], items: [{ name: 'Vòng cổ', qty: 1 }, { name: 'Đồ chơi', qty: 2 }] },

      // Pattern: Nội thất
      { user: customers[2 % customers.length], items: [{ name: 'Bàn làm việc', qty: 1 }, { name: 'Đèn bàn', qty: 1 }] },
      { user: customers[7 % customers.length], items: [{ name: 'Ghế', qty: 1 }, { name: 'Kệ sách', qty: 1 }] },
      { user: customers[0], items: [{ name: 'Sofa', qty: 1 }, { name: 'Thảm trải', qty: 1 }] },

      // Pattern: Mẹ & Bé
      { user: customers[6 % customers.length], items: [{ name: 'Máy hâm sữa', qty: 1 }, { name: 'Bình sữa PPSU', qty: 2 }] },
      { user: customers[8 % customers.length], items: [{ name: 'Xe đẩy', qty: 1 }, { name: 'Địu em bé', qty: 1 }] },
      { user: customers[3 % customers.length], items: [{ name: 'Ghế ăn dặm', qty: 1 }, { name: 'Sách vải', qty: 2 }] },
    ];

    const paymentMethods = ['COD', 'BANKING', 'MOMO', 'VNPAY'];
    const cities = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Nha Trang', 'Huế', 'Đà Lạt'];
    const streets = ['Nguyễn Huệ', 'Trần Hưng Đạo', 'Lê Lợi', 'Bạch Đằng', 'Xô Viết Nghệ Tĩnh', 'Hoàng Diệu', 'Lý Thường Kiệt'];

    let orderCount = 0;
    for (const pattern of orderPatterns.slice(0, neededOrders)) {
      if (!pattern.user) continue;

      const items = pattern.items
        .map(item => ({ product: findProduct(item.name), qty: item.qty }))
        .filter(item => item.product);

      if (items.length === 0) continue;

      const totalAmount = items.reduce((sum, item) => sum + (item.product.discountPrice || item.product.price) * item.qty, 0);
      const shippingFee = totalAmount > 500000 ? 0 : 30000;
      const discountAmount = Math.round(totalAmount * 0.05);
      const finalAmount = totalAmount + shippingFee - discountAmount;
      const daysAgo = Math.floor(Math.random() * 60);
      const statuses = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'SHIPPING', 'CONFIRMED'];
      const payIdx = Math.floor(Math.random() * paymentMethods.length);

      const city = cities[Math.floor(Math.random() * cities.length)];
      const street = streets[Math.floor(Math.random() * streets.length)];
      const streetNum = Math.floor(Math.random() * 500) + 1;

      await prisma.order.create({
        data: {
          userId: pattern.user.id,
          totalAmount,
          shippingFee,
          discountAmount,
          finalAmount,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          paymentMethod: paymentMethods[payIdx],
          paymentStatus: ['PAID', 'PAID', 'PAID', 'UNPAID'][payIdx > 2 ? 3 : payIdx] || 'PAID',
          shippingAddress: `${streetNum} ${street}, ${city}`,
          phone: pattern.user.phone || '0900000000',
          createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          orderItems: {
            create: items.map(item => ({
              productId: item.product.id,
              quantity: item.qty,
              price: item.product.discountPrice || item.product.price,
            })),
          },
        },
      });
      orderCount++;

      // Cập nhật totalSpent cho user
      const userOrders = await prisma.order.aggregate({
        where: { userId: pattern.user.id, paymentStatus: 'PAID' },
        _sum: { finalAmount: true },
        _count: true,
      });
      await prisma.user.update({
        where: { id: pattern.user.id },
        data: {
          totalSpent: userOrders._sum.finalAmount || 0,
          orderCount: userOrders._count,
          lastPurchaseAt: new Date(),
        },
      });
    }
    console.log(`  ✅ Tạo ${orderCount} đơn hàng bổ sung (tổng: ${await prisma.order.count()})`);
  }

  // ================================================================
  // 3. GÁN CLUSTER CHO USER (nếu chưa có)
  // ================================================================
  const usersWithoutCluster = await prisma.user.findMany({
    where: { clusterId: null, role: 'CUSTOMER' },
  });

  if (usersWithoutCluster.length > 0 && clusters.length > 0) {
    console.log(`\n🏷️ Gán cluster cho ${usersWithoutCluster.length} user...`);

    let assigned = 0;
    for (const user of usersWithoutCluster) {
      // Xác định cluster dựa trên totalSpent
      let clusterId;
      if (user.totalSpent >= 10000000) {
        clusterId = clusters.find(c => c.name?.includes('VIP'))?.id;
      } else if (user.totalSpent >= 2000000) {
        clusterId = clusters.find(c => c.name?.includes('Tiềm Năng'))?.id;
      } else if (user.totalSpent > 0) {
        clusterId = clusters.find(c => c.name?.includes('Thân Thiết'))?.id;
      } else {
        clusterId = clusters.find(c => c.name?.includes('Mới'))?.id;
      }

      if (clusterId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { clusterId },
        });
        assigned++;
      }
    }
    console.log(`  ✅ Đã gán cluster cho ${assigned} user`);
  }

  // ================================================================
  // 4. ĐÁNH GIÁ BỔ SUNG (tăng reviewCount cho sản phẩm)
  // ================================================================
  const totalReviews = await prisma.review.count();
  const targetReviews = Math.min(products.length * 3, 200);
  const neededReviews = Math.max(0, targetReviews - totalReviews);

  if (neededReviews > 0 && customers.length > 0) {
    console.log(`\n⭐ Tạo thêm ${neededReviews} đánh giá...`);

    const reviewTexts = [
      { rating: 5, text: 'Sản phẩm tuyệt vời! Giao hàng nhanh, đóng gói cẩn thận.' },
      { rating: 5, text: 'Rất hài lòng với chất lượng. Mua lần thứ 2 rồi!' },
      { rating: 4, text: 'Chất lượng tốt, đúng mô tả. Sẽ ủng hộ shop tiếp.' },
      { rating: 4, text: 'Hàng chính hãng, giá hợp lý. Giao hàng nhanh.' },
      { rating: 5, text: 'Đã dùng thử, sản phẩm rất tốt. Cảm ơn shop!' },
      { rating: 5, text: 'Shop tư vấn nhiệt tình, sản phẩm chất lượng.' },
      { rating: 4, text: 'OK, chất lượng ổn định như lần trước.' },
      { rating: 5, text: 'Mua làm quà, người nhận rất thích. Cảm ơn shop!' },
      { rating: 3, text: 'Sản phẩm tạm được, không có gì đặc biệt.' },
      { rating: 4, text: 'Giá hơi cao nhưng chất lượng tốt.' },
    ];

    let reviewCount = 0;
    for (const product of products) {
      const numReviews = Math.min(Math.floor(Math.random() * 3) + 1, 3);
      for (let i = 0; i < numReviews && reviewCount < neededReviews; i++) {
        const user = customers[Math.floor(Math.random() * customers.length)];
        if (!user) continue;

        const existing = await prisma.review.findUnique({
          where: { userId_productId: { userId: user.id, productId: product.id } },
        });
        if (existing) continue;

        const tmpl = reviewTexts[Math.floor(Math.random() * reviewTexts.length)];
        await prisma.review.create({
          data: {
            userId: user.id,
            productId: product.id,
            rating: tmpl.rating,
            comment: tmpl.text,
          },
        });

        // Cập nhật rating cho sản phẩm
        const productReviews = await prisma.review.findMany({
          where: { productId: product.id },
          select: { rating: true },
        });
        const avgRating = productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length;

        await prisma.product.update({
          where: { id: product.id },
          data: {
            rating: Math.round(avgRating * 10) / 10,
            reviewCount: productReviews.length,
          },
        });
        reviewCount++;
      }
    }
    console.log(`  ✅ Tạo ${reviewCount} đánh giá bổ sung (tổng: ${await prisma.review.count()})`);
  }

  // ================================================================
  // 5. RECOMMENDATIONS (gợi ý sản phẩm cho user dựa trên lịch sử)
  // ================================================================
  const existingRecs = await prisma.recommendation.count();
  if (existingRecs === 0) {
    console.log('\n📌 Tạo recommendations...');
    let recCount = 0;

    for (const customer of customers.slice(0, 15)) {
      if (!customer) continue;

      // Lấy danh mục user đã mua
      const userOrders = await prisma.order.findMany({
        where: { userId: customer.id },
        include: { orderItems: { include: { product: { select: { categoryId: true } } } } },
      });

      const purchasedCategoryIds = new Set(
        userOrders.flatMap(o => o.orderItems.map(oi => oi.product.categoryId))
      );
      const purchasedProductIds = new Set(
        userOrders.flatMap(o => o.orderItems.map(oi => oi.productId))
      );

      // Gợi ý sản phẩm cùng danh mục
      const recs = products
        .filter(p =>
          !purchasedProductIds.has(p.id) &&
          purchasedCategoryIds.has(p.categoryId) &&
          p.isActive
        )
        .slice(0, 8);

      for (const product of recs) {
        await prisma.recommendation.create({
          data: {
            userId: customer.id,
            productId: product.id,
            score: Math.round((product.rating * 10 + Math.random() * 10) * 10) / 10,
            reason: 'based_on_purchase',
            isActive: true,
          },
        });
        recCount++;
      }
    }
    console.log(`  ✅ Tạo ${recCount} recommendations`);
  }

  // ================================================================
  // TỔNG KẾT
  // ================================================================
  console.log('\n' + '='.repeat(55));
  console.log('✅ Seed ML Test hoàn tất!');
  console.log('='.repeat(55));
  console.log(`   👤 Customers: ${await prisma.user.count({ where: { role: 'CUSTOMER' } })}`);
  console.log(`   📦 Products: ${await prisma.product.count()}`);
  console.log(`   📋 Orders: ${await prisma.order.count()}`);
  console.log(`   ⭐ Reviews: ${await prisma.review.count()}`);
  console.log(`   👁️  Product Views: ${await prisma.productView.count()}`);
  console.log(`   📌 Recommendations: ${await prisma.recommendation.count()}`);
  console.log(`   🏷️  Clusters: ${await prisma.cluster.count()}`);
  console.log(`   👤 Gán cluster: ${await prisma.user.count({ where: { clusterId: { not: null } } })} người dùng`);
  console.log('='.repeat(55) + '\n');
}

main()
  .catch((e) => { console.error('❌ Seed thất bại:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
