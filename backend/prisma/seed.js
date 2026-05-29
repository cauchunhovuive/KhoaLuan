require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...\n');

  // ─── Xoá dữ liệu cũ ───
  await prisma.recommendation.deleteMany();
  await prisma.clusterRule.deleteMany();
  await prisma.cluster.deleteMany();
  await prisma.review.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  console.log('  ✔ Đã xoá dữ liệu cũ');

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
    // Điện thoại (category 0)
    { name: 'iPhone 15 Pro Max 256GB', slug: 'iphone-15-pro-max-256gb', price: 34990000, discountPrice: 32990000, stock: 50, soldCount: 128, rating: 4.8, reviewCount: 256, categoryIdx: 0 },
    { name: 'Samsung Galaxy S24 Ultra', slug: 'samsung-galaxy-s24-ultra', price: 32990000, discountPrice: 30990000, stock: 35, soldCount: 95, rating: 4.7, reviewCount: 182, categoryIdx: 0 },
    { name: 'Xiaomi 14 Pro', slug: 'xiaomi-14-pro', price: 18990000, discountPrice: null, stock: 60, soldCount: 74, rating: 4.6, reviewCount: 143, categoryIdx: 0 },
    { name: 'Ốp lưng silicon iPhone 15', slug: 'op-lung-silicon-iphone-15', price: 199000, discountPrice: 149000, stock: 200, soldCount: 512, rating: 4.5, reviewCount: 89, categoryIdx: 0 },
    { name: 'Cáp sạc Type-C 2m', slug: 'cap-sac-type-c-2m', price: 99000, discountPrice: null, stock: 500, soldCount: 1024, rating: 4.4, reviewCount: 67, categoryIdx: 0 },

    // Laptop (category 1)
    { name: 'MacBook Pro M3 Pro 14"', slug: 'macbook-pro-m3-pro-14', price: 45990000, discountPrice: 43990000, stock: 20, soldCount: 56, rating: 4.9, reviewCount: 112, categoryIdx: 1 },
    { name: 'Dell XPS 15', slug: 'dell-xps-15', price: 35990000, discountPrice: 33990000, stock: 15, soldCount: 38, rating: 4.7, reviewCount: 76, categoryIdx: 1 },
    { name: 'iPad Air M2 11"', slug: 'ipad-air-m2-11', price: 18990000, discountPrice: null, stock: 40, soldCount: 89, rating: 4.8, reviewCount: 134, categoryIdx: 1 },
    { name: 'Lenovo ThinkPad X1 Carbon', slug: 'lenovo-thinkpad-x1-carbon', price: 39990000, discountPrice: 37990000, stock: 10, soldCount: 25, rating: 4.6, reviewCount: 48, categoryIdx: 1 },

    // Thời trang (category 2)
    { name: 'Áo sơ mi nam công sở', slug: 'ao-so-mi-nam-cong-so', price: 399000, discountPrice: 299000, stock: 150, soldCount: 345, rating: 4.5, reviewCount: 78, categoryIdx: 2 },
    { name: 'Đầm dự tiệc nữ cao cấp', slug: 'dam-du-tiec-nu-cao-cap', price: 899000, discountPrice: 749000, stock: 80, soldCount: 167, rating: 4.6, reviewCount: 92, categoryIdx: 2 },
    { name: 'Giày thể thao nam', slug: 'giay-the-thao-nam', price: 1599000, discountPrice: 1299000, stock: 100, soldCount: 289, rating: 4.7, reviewCount: 156, categoryIdx: 2 },
    { name: 'Túi xách nữ thời trang', slug: 'tui-xach-nu-thoi-trang', price: 699000, discountPrice: null, stock: 60, soldCount: 134, rating: 4.4, reviewCount: 45, categoryIdx: 2 },

    // Đồ gia dụng (category 3)
    { name: 'Máy hút bụi thông minh', slug: 'may-hut-bui-thong-minh', price: 5999000, discountPrice: 5499000, stock: 25, soldCount: 67, rating: 4.6, reviewCount: 89, categoryIdx: 3 },
    { name: 'Nồi chiên không dầu 5.5L', slug: 'noi-chien-khong-dau-55l', price: 1599000, discountPrice: 1399000, stock: 45, soldCount: 234, rating: 4.8, reviewCount: 178, categoryIdx: 3 },
    { name: 'Máy pha cà phê tự động', slug: 'may-pha-ca-phe-tu-dong', price: 8999000, discountPrice: null, stock: 12, soldCount: 34, rating: 4.5, reviewCount: 56, categoryIdx: 3 },
    { name: 'Bộ dao nhà bếp 5 món', slug: 'bo-dao-nha-bep-5-mon', price: 499000, discountPrice: 399000, stock: 80, soldCount: 189, rating: 4.3, reviewCount: 67, categoryIdx: 3 },

    // Sách (category 4)
    { name: 'Sách "Nhà giả kim" - Paulo Coelho', slug: 'sach-nha-gia-kim', price: 89000, discountPrice: 69000, stock: 300, soldCount: 1567, rating: 4.9, reviewCount: 892, categoryIdx: 4 },
    { name: 'Sách "Atomic Habits" - James Clear', slug: 'sach-atomic-habits', price: 149000, discountPrice: 119000, stock: 250, soldCount: 1234, rating: 4.8, reviewCount: 745, categoryIdx: 4 },
    { name: 'Sổ tay bìa da A5', slug: 'so-tay-bia-da-a5', price: 149000, discountPrice: null, stock: 400, soldCount: 678, rating: 4.5, reviewCount: 123, categoryIdx: 4 },
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
          images: [`https://picsum.photos/seed/${p.slug}/400/400`],
          stock: p.stock,
          soldCount: p.soldCount,
          rating: p.rating,
          reviewCount: p.reviewCount,
          categoryId: categories[p.categoryIdx].id,
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
  console.log('   ┌──────────────────────┬──────────────┬──────────────┐');
  console.log('   │ Email                │ Mật khẩu     │ Vai trò      │');
  console.log('   ├──────────────────────┼──────────────┼──────────────┤');
  console.log('   │ admin@khoaluan.com   │ admin123     │ ADMIN        │');
  console.log('   │ customer1@test.com   │ customer123  │ CUSTOMER     │');
  console.log('   │ customer2@test.com   │ customer123  │ CUSTOMER     │');
  console.log('   │ customer3@test.com   │ customer123  │ CUSTOMER     │');
  console.log('   └──────────────────────┴──────────────┴──────────────┘');
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
