require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { getProductImage } = require('./seed-images');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...\n');

  // ─── Kiểm tra nếu đã có dữ liệu thì bỏ qua ───
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const existingCategories = await prisma.category.count();

  if (existingAdmin || existingCategories > 0) {
    console.log('  ℹ Dữ liệu đã tồn tại, bỏ qua seed.');
    console.log('  Nếu muốn seed lại, chạy: docker exec khoaluan-backend sh -c "node prisma/seed.js --force"');
    return;
  }

  // ─── Tài khoản Admin ───
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@khoaluan.com',
      password: adminPassword,
      name: 'Admin KhoaLuan',
      phone: '0901234567',
      address: 'Hà Nội, Việt Nam',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`  ✔ Tạo admin: ${admin.email}`);

  // ─── Tài khoản Partner mẫu ───
  const partnerPassword = await bcrypt.hash('partner123', 12);
  const partners = await Promise.all([
    prisma.user.create({
      data: {
        email: 'partner1@shop.com',
        password: partnerPassword,
        name: 'Nguyễn Văn Kinh Doanh',
        phone: '0945678901',
        role: 'PARTNER',
        isActive: true,
        isApproved: true,
        approvedAt: new Date(),
        storeName: 'Shop Điện Tử ABC',
        storeDescription: 'Chuyên điện thoại, laptop chính hãng giá tốt',
        taxCode: '1234567890',
        businessAddress: '123 Nguyễn Huệ, Q.1, TP.HCM',
      },
    }),
    prisma.user.create({
      data: {
        email: 'partner2@fashion.com',
        password: partnerPassword,
        name: 'Trần Thị Thời Trang',
        phone: '0956789012',
        role: 'PARTNER',
        isActive: true,
        isApproved: true,
        approvedAt: new Date(),
        storeName: 'Fashion House XYZ',
        storeDescription: 'Thời trang cao cấp cho nam và nữ',
        taxCode: '0987654321',
        businessAddress: '456 Trần Hưng Đạo, Q.Hoàn Kiếm, Hà Nội',
      },
    }),
    prisma.user.create({
      data: {
        email: 'partner3@new.com',
        password: partnerPassword,
        name: 'Lê Thị Mới',
        phone: '0967890123',
        role: 'PARTNER',
        isActive: true,
        isApproved: false,
        storeName: 'Cửa hàng mới',
        storeDescription: 'Đang chờ phê duyệt',
        taxCode: '1122334455',
        businessAddress: '789 Bạch Đằng, Đà Nẵng',
      },
    }),
  ]);
  console.log(`  ✔ Tạo ${partners.length} đối tác mẫu`);

  // ─── Tài khoản Customer mẫu ───
  const customerPassword = await bcrypt.hash('customer123', 12);
  const customers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'customer1@test.com',
        password: customerPassword,
        name: 'Nguyễn Văn A',
        phone: '0912345678',
        address: 'Hồ Chí Minh, Việt Nam',
        role: 'CUSTOMER',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'customer2@test.com',
        password: customerPassword,
        name: 'Trần Thị B',
        phone: '0923456789',
        address: 'Đà Nẵng, Việt Nam',
        role: 'CUSTOMER',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'customer3@test.com',
        password: customerPassword,
        name: 'Lê Văn C',
        phone: '0934567890',
        address: 'Hải Phòng, Việt Nam',
        role: 'CUSTOMER',
        isActive: true,
      },
    }),
  ]);
  console.log(`  ✔ Tạo ${customers.length} khách hàng mẫu`);

  // ─── Danh mục sản phẩm ───
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Điện thoại & Phụ kiện',
        slug: 'dien-thoai-phu-kien',
        description: 'Điện thoại thông minh, ốp lưng, cáp sạc...',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Laptop & Máy tính bảng',
        slug: 'laptop-may-tinh-bang',
        description: 'Laptop, iPad, máy tính bảng chính hãng',
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Thời trang',
        slug: 'thoi-trang',
        description: 'Quần áo, giày dép, phụ kiện thời trang',
        image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Đồ gia dụng',
        slug: 'do-gia-dung',
        description: 'Đồ dùng nhà bếp, thiết bị gia đình',
        image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Sách & Văn phòng phẩm',
        slug: 'sach-van-phong-pham',
        description: 'Sách, dụng cụ học tập và văn phòng',
        image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400',
      },
    }),
  ]);
  console.log(`  ✔ Tạo ${categories.length} danh mục`);

  // ─── Sản phẩm mẫu ───
  const productsData = [
    { name: 'iPhone 15 Pro Max 256GB', slug: 'iphone-15-pro-max-256gb', price: 34990000, discountPrice: 32990000, stock: 50, soldCount: 128, rating: 4.8, reviewCount: 256, categoryIdx: 0, partnerIdx: 0 },
    { name: 'Samsung Galaxy S24 Ultra', slug: 'samsung-galaxy-s24-ultra', price: 32990000, discountPrice: 30990000, stock: 35, soldCount: 95, rating: 4.7, reviewCount: 182, categoryIdx: 0, partnerIdx: 0 },
    { name: 'Xiaomi 14 Pro', slug: 'xiaomi-14-pro', price: 18990000, discountPrice: null, stock: 60, soldCount: 74, rating: 4.6, reviewCount: 143, categoryIdx: 0, partnerIdx: null },
    { name: 'Ốp lưng silicon iPhone 15', slug: 'op-lung-silicon-iphone-15', price: 199000, discountPrice: 149000, stock: 200, soldCount: 512, rating: 4.5, reviewCount: 89, categoryIdx: 0, partnerIdx: null },
    { name: 'Cáp sạc Type-C 2m', slug: 'cap-sac-type-c-2m', price: 99000, discountPrice: null, stock: 500, soldCount: 1024, rating: 4.4, reviewCount: 67, categoryIdx: 0, partnerIdx: 0 },
    { name: 'MacBook Pro M3 Pro 14"', slug: 'macbook-pro-m3-pro-14', price: 45990000, discountPrice: 43990000, stock: 20, soldCount: 56, rating: 4.9, reviewCount: 112, categoryIdx: 1, partnerIdx: 0 },
    { name: 'Dell XPS 15', slug: 'dell-xps-15', price: 35990000, discountPrice: 33990000, stock: 15, soldCount: 38, rating: 4.7, reviewCount: 76, categoryIdx: 1, partnerIdx: 0 },
    { name: 'iPad Air M2 11"', slug: 'ipad-air-m2-11', price: 18990000, discountPrice: null, stock: 40, soldCount: 89, rating: 4.8, reviewCount: 134, categoryIdx: 1, partnerIdx: null },
    { name: 'Lenovo ThinkPad X1 Carbon', slug: 'lenovo-thinkpad-x1-carbon', price: 39990000, discountPrice: 37990000, stock: 10, soldCount: 25, rating: 4.6, reviewCount: 48, categoryIdx: 1, partnerIdx: 0 },
    { name: 'Áo sơ mi nam công sở', slug: 'ao-so-mi-nam-cong-so', price: 399000, discountPrice: 299000, stock: 150, soldCount: 345, rating: 4.5, reviewCount: 78, categoryIdx: 2, partnerIdx: 1 },
    { name: 'Đầm dự tiệc nữ cao cấp', slug: 'dam-du-tiec-nu-cao-cap', price: 899000, discountPrice: 749000, stock: 80, soldCount: 167, rating: 4.6, reviewCount: 92, categoryIdx: 2, partnerIdx: 1 },
    { name: 'Giày thể thao nam', slug: 'giay-the-thao-nam', price: 1599000, discountPrice: 1299000, stock: 100, soldCount: 289, rating: 4.7, reviewCount: 156, categoryIdx: 2, partnerIdx: 1 },
    { name: 'Túi xách nữ thời trang', slug: 'tui-xach-nu-thoi-trang', price: 699000, discountPrice: null, stock: 60, soldCount: 134, rating: 4.4, reviewCount: 45, categoryIdx: 2, partnerIdx: 1 },
    { name: 'Máy hút bụi thông minh', slug: 'may-hut-bui-thong-minh', price: 5999000, discountPrice: 5499000, stock: 25, soldCount: 67, rating: 4.6, reviewCount: 89, categoryIdx: 3, partnerIdx: null },
    { name: 'Nồi chiên không dầu 5.5L', slug: 'noi-chien-khong-dau-55l', price: 1599000, discountPrice: 1399000, stock: 45, soldCount: 234, rating: 4.8, reviewCount: 178, categoryIdx: 3, partnerIdx: null },
    { name: 'Máy pha cà phê tự động', slug: 'may-pha-ca-phe-tu-dong', price: 8999000, discountPrice: null, stock: 12, soldCount: 34, rating: 4.5, reviewCount: 56, categoryIdx: 3, partnerIdx: null },
    { name: 'Bộ dao nhà bếp 5 món', slug: 'bo-dao-nha-bep-5-mon', price: 499000, discountPrice: 399000, stock: 80, soldCount: 189, rating: 4.3, reviewCount: 67, categoryIdx: 3, partnerIdx: null },
    { name: 'Sách "Nhà giả kim" - Paulo Coelho', slug: 'sach-nha-gia-kim', price: 89000, discountPrice: 69000, stock: 300, soldCount: 1567, rating: 4.9, reviewCount: 892, categoryIdx: 4, partnerIdx: null },
    { name: 'Sách "Atomic Habits" - James Clear', slug: 'sach-atomic-habits', price: 149000, discountPrice: 119000, stock: 250, soldCount: 1234, rating: 4.8, reviewCount: 745, categoryIdx: 4, partnerIdx: null },
    { name: 'Sổ tay bìa da A5', slug: 'so-tay-bia-da-a5', price: 149000, discountPrice: null, stock: 400, soldCount: 678, rating: 4.5, reviewCount: 123, categoryIdx: 4, partnerIdx: null },
  ];

  const products = await Promise.all(
    productsData.map((p) =>
      prisma.product.create({
        data: {
          name: p.name,
          slug: p.slug,
          description: `Sản phẩm ${p.name} chất lượng cao, chính hãng.`,
          price: p.price,
          discountPrice: p.discountPrice,
          images: [getProductImage(p.slug, categories[p.categoryIdx].slug)],
          stock: p.stock,
          soldCount: p.soldCount,
          rating: p.rating,
          reviewCount: p.reviewCount,
          categoryId: categories[p.categoryIdx].id,
          partnerId: p.partnerIdx !== null ? partners[p.partnerIdx].id : null,
        },
      })
    )
  );
  console.log(`  ✔ Tạo ${products.length} sản phẩm mẫu`);

  // ─── Đơn hàng mẫu ───
  const orders = await Promise.all([
    prisma.order.create({
      data: {
        userId: customers[0].id,
        totalAmount: 34990000,
        shippingFee: 30000,
        discountAmount: 2000000,
        finalAmount: 33020000,
        status: 'DELIVERED',
        paymentMethod: 'MOMO',
        paymentStatus: 'PAID',
        shippingAddress: '123 Nguyễn Huệ, Q.1, Hồ Chí Minh',
        phone: '0912345678',
        orderItems: {
          create: [{ productId: products[0].id, quantity: 1, price: 32990000 }],
        },
      },
    }),
    prisma.order.create({
      data: {
        userId: customers[0].id,
        totalAmount: 18990000,
        shippingFee: 0,
        discountAmount: 0,
        finalAmount: 18990000,
        status: 'SHIPPING',
        paymentMethod: 'VNPAY',
        paymentStatus: 'PAID',
        shippingAddress: '123 Nguyễn Huệ, Q.1, Hồ Chí Minh',
        phone: '0912345678',
        orderItems: {
          create: [{ productId: products[7].id, quantity: 1, price: 18990000 }],
        },
      },
    }),
    prisma.order.create({
      data: {
        userId: customers[1].id,
        totalAmount: 1599000,
        shippingFee: 30000,
        discountAmount: 200000,
        finalAmount: 1429000,
        status: 'DELIVERED',
        paymentMethod: 'COD',
        paymentStatus: 'PAID',
        shippingAddress: '456 Bạch Đằng, Q.Hải Châu, Đà Nẵng',
        phone: '0923456789',
        orderItems: {
          create: [{ productId: products[14].id, quantity: 1, price: 1399000 }],
        },
      },
    }),
    prisma.order.create({
      data: {
        userId: customers[2].id,
        totalAmount: 238000,
        shippingFee: 0,
        discountAmount: 20000,
        finalAmount: 218000,
        status: 'PENDING',
        paymentMethod: 'COD',
        paymentStatus: 'UNPAID',
        shippingAddress: '789 Trần Hưng Đạo, Hải Phòng',
        phone: '0934567890',
        orderItems: {
          create: [
            { productId: products[17].id, quantity: 2, price: 69000 },
            { productId: products[18].id, quantity: 1, price: 119000 },
          ],
        },
      },
    }),
  ]);
  console.log(`  ✔ Tạo ${orders.length} đơn hàng mẫu`);

  // ─── Đánh giá mẫu ───
  await Promise.all([
    prisma.review.create({ data: { userId: customers[0].id, productId: products[0].id, rating: 5, comment: 'Sản phẩm tuyệt vời! Giao hàng nhanh, đóng gói cẩn thận.' } }),
    prisma.review.create({ data: { userId: customers[1].id, productId: products[0].id, rating: 4, comment: 'Hàng chính hãng, giá tốt.' } }),
    prisma.review.create({ data: { userId: customers[0].id, productId: products[14].id, rating: 5, comment: 'Nồi chiên không dầu rất tiện lợi, đồ ăn ngon.' } }),
    prisma.review.create({ data: { userId: customers[1].id, productId: products[14].id, rating: 4, comment: 'Chất lượng tốt, giá hợp lý.' } }),
    prisma.review.create({ data: { userId: customers[2].id, productId: products[17].id, rating: 5, comment: 'Cuốn sách hay, ý nghĩa.' } }),
    prisma.review.create({ data: { userId: customers[2].id, productId: products[18].id, rating: 4, comment: 'Sách rất bổ ích, nên đọc.' } }),
  ]);
  console.log('  ✔ Tạo 6 đánh giá mẫu');

  // ─── Mã giảm giá (Coupon) ───
  const now = new Date();
  const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 ngày
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);   // -30 ngày

  const coupons = await Promise.all([
    // Admin coupons (system-wide)
    prisma.coupon.create({
      data: {
        code: 'WELCOME10',
        type: 'PERCENTAGE',
        value: 10,
        minOrderValue: 200000,
        maxDiscount: 50000,
        usageLimit: 100,
        perUserLimit: 1,
        startsAt: pastDate,
        expiresAt: futureDate,
        isActive: true,
        description: 'Giảm 10% cho đơn hàng từ 200K (tối đa 50K). Dành cho khách hàng mới!',
        createdById: admin.id,
      },
    }),
    prisma.coupon.create({
      data: {
        code: 'SALE50K',
        type: 'FIXED',
        value: 50000,
        minOrderValue: 500000,
        usageLimit: 200,
        perUserLimit: 2,
        startsAt: pastDate,
        expiresAt: futureDate,
        isActive: true,
        description: 'Giảm 50K cho đơn hàng từ 500K. Áp dụng cho tất cả khách hàng.',
        createdById: admin.id,
      },
    }),
    prisma.coupon.create({
      data: {
        code: 'FREESHIP',
        type: 'FIXED',
        value: 30000,
        minOrderValue: 200000,
        usageLimit: 500,
        perUserLimit: 1,
        startsAt: pastDate,
        expiresAt: futureDate,
        isActive: true,
        description: 'Miễn phí vận chuyển (giảm 30K) cho đơn từ 200K.',
        createdById: admin.id,
      },
    }),
    prisma.coupon.create({
      data: {
        code: 'VIP100K',
        type: 'FIXED',
        value: 100000,
        minOrderValue: 1000000,
        maxDiscount: null,
        usageLimit: 50,
        perUserLimit: 3,
        startsAt: pastDate,
        expiresAt: futureDate,
        isActive: true,
        description: 'Giảm 100K cho đơn hàng từ 1 triệu. Dành cho khách hàng thân thiết.',
        createdById: admin.id,
      },
    }),

    // Partner 1 coupons (Shop Điện Tử ABC - partner1)
    prisma.coupon.create({
      data: {
        code: 'ABC20',
        type: 'PERCENTAGE',
        value: 20,
        minOrderValue: 500000,
        maxDiscount: 200000,
        usageLimit: 50,
        perUserLimit: 1,
        startsAt: pastDate,
        expiresAt: futureDate,
        isActive: true,
        description: 'Giảm 20% (tối đa 200K) cho đơn từ 500K. Áp dụng cho sản phẩm Shop Điện Tử ABC.',
        createdById: partners[0].id,
      },
    }),
    prisma.coupon.create({
      data: {
        code: 'ABC100K',
        type: 'FIXED',
        value: 100000,
        minOrderValue: 1000000,
        usageLimit: 30,
        perUserLimit: 1,
        startsAt: pastDate,
        expiresAt: futureDate,
        isActive: true,
        description: 'Giảm 100K cho đơn từ 1 triệu tại Shop Điện Tử ABC.',
        createdById: partners[0].id,
      },
    }),

    // Partner 2 coupon (Fashion House XYZ - partner2)
    prisma.coupon.create({
      data: {
        code: 'FASHION15',
        type: 'PERCENTAGE',
        value: 15,
        minOrderValue: 300000,
        maxDiscount: 150000,
        usageLimit: 50,
        perUserLimit: 1,
        startsAt: pastDate,
        expiresAt: futureDate,
        isActive: true,
        description: 'Giảm 15% (tối đa 150K) cho đơn từ 300K tại Fashion House XYZ.',
        createdById: partners[1].id,
      },
    }),

    // Expired coupon (test case)
    prisma.coupon.create({
      data: {
        code: 'EXPIRED50',
        type: 'PERCENTAGE',
        value: 50,
        minOrderValue: 100000,
        maxDiscount: 100000,
        usageLimit: 10,
        perUserLimit: 1,
        startsAt: new Date(pastDate.getTime() - 60 * 24 * 60 * 60 * 1000), // 90 ngày trước
        expiresAt: pastDate, // đã hết hạn
        isActive: true,
        description: 'Mã đã hết hạn - giảm 50% (tối đa 100K).',
        createdById: admin.id,
      },
    }),

    // Inactive coupon (test case)
    prisma.coupon.create({
      data: {
        code: 'INACTIVE20',
        type: 'PERCENTAGE',
        value: 20,
        minOrderValue: 0,
        maxDiscount: 50000,
        usageLimit: 100,
        perUserLimit: 1,
        startsAt: pastDate,
        expiresAt: futureDate,
        isActive: false, // bị tắt bởi admin
        description: 'Mã đã bị tắt - giảm 20% (tối đa 50K).',
        createdById: admin.id,
      },
    }),
  ]);
  console.log(`  ✔ Tạo ${coupons.length} mã giảm giá mẫu`);

  // ─── Lịch sử sử dụng mã giảm giá (CouponUsage) ───
  const usages = await Promise.all([
    // Customer 1 dùng WELCOME10
    prisma.couponUsage.create({
      data: {
        couponId: coupons[0].id, // WELCOME10
        userId: customers[0].id,
        orderId: orders[0].id,
        usedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 ngày trước
      },
    }),
    // Customer 2 dùng FREESHIP
    prisma.couponUsage.create({
      data: {
        couponId: coupons[2].id, // FREESHIP
        userId: customers[1].id,
        orderId: orders[2].id,
        usedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 ngày trước
      },
    }),
  ]);

  // Cập nhật usedCount cho coupon đã được dùng
  await prisma.coupon.update({
    where: { id: coupons[0].id },
    data: { usedCount: 1 },
  });
  await prisma.coupon.update({
    where: { id: coupons[2].id },
    data: { usedCount: 1 },
  });
  console.log(`  ✔ Tạo ${usages.length} lịch sử sử dụng mã giảm giá`);

  // ─── Cập nhật tổng chi tiêu ───
  const allOrders = await prisma.order.findMany({ select: { userId: true, finalAmount: true } });
  const spentByUser = {};
  allOrders.forEach((o) => {
    spentByUser[o.userId] = (spentByUser[o.userId] || 0) + o.finalAmount;
  });
  for (const [userId, total] of Object.entries(spentByUser)) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalSpent: total,
        orderCount: allOrders.filter((o) => o.userId === userId).length,
      },
    });
  }

  console.log('\n───────────────────────────────────────');
  console.log('✅ Seed hoàn tất!');
  console.log('───────────────────────────────────────');
  console.log('\n📋 Tài khoản mẫu:');
  console.log('   ┌──────────────────────────┬────────────────┬──────────────┐');
  console.log('   │ Email                    │ Mật khẩu       │ Vai trò      │');
  console.log('   ├──────────────────────────┼────────────────┼──────────────┤');
  console.log('   │ admin@khoaluan.com       │ admin123       │ ADMIN        │');
  console.log('   │ partner1@shop.com        │ partner123     │ PARTNER ✓    │');
  console.log('   │ partner2@fashion.com     │ partner123     │ PARTNER ✓    │');
  console.log('   │ partner3@new.com         │ partner123     │ PARTNER ✗    │');
  console.log('   │ customer1@test.com       │ customer123    │ CUSTOMER     │');
  console.log('   │ customer2@test.com       │ customer123    │ CUSTOMER     │');
  console.log('   │ customer3@test.com       │ customer123    │ CUSTOMER     │');
  console.log('   └──────────────────────────┴────────────────┴──────────────┘');
  console.log('\n📦 Dữ liệu: 5 danh mục, 20 sản phẩm, 4 đơn hàng, 6 đánh giá');
  console.log('───────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed thất bại:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
