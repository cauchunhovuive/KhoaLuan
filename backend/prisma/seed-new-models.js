require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed dữ liệu bổ sung...\n');

  // Kiểm tra idempotent: nếu đã có banner thì bỏ qua
  const existingBanners = await prisma.banner.count();
  if (existingBanners > 0) {
    console.log('  ℹ Dữ liệu bổ sung đã tồn tại, bỏ qua.');
    return;
  }

  // ─── Lấy người dùng hiện có ───
  const admin = await prisma.user.findUnique({ where: { email: 'admin@khoaluan.com' } });
  const partners = {
    p1: await prisma.user.findUnique({ where: { email: 'partner1@shop.com' } }),
    p2: await prisma.user.findUnique({ where: { email: 'partner2@fashion.com' } }),
    p3: await prisma.user.findUnique({ where: { email: 'partner3@new.com' } }),
  };
  const customers = {
    c1: await prisma.user.findUnique({ where: { email: 'customer1@test.com' } }),
    c2: await prisma.user.findUnique({ where: { email: 'customer2@test.com' } }),
    c3: await prisma.user.findUnique({ where: { email: 'customer3@test.com' } }),
  };

  if (!admin || !partners.p1 || !customers.c1) {
    console.error('❌ Không tìm thấy dữ liệu người dùng. Chạy seed.js trước.');
    process.exit(1);
  }
  console.log('  ✔ Đã tìm thấy người dùng hiện có');

  const products = await prisma.product.findMany({ take: 10 });
  console.log(`  ✔ Đã tìm thấy ${products.length} sản phẩm`);

  // ─── 1. Address ───
  const addressData = [
    { userId: customers.c1.id, label: 'Nhà', fullName: 'Nguyễn Văn A', phone: '0912345678', street: '123 Nguyễn Huệ', ward: 'Phường Bến Nghé', district: 'Quận 1', city: 'Hồ Chí Minh', isDefault: true },
    { userId: customers.c1.id, label: 'Cơ quan', fullName: 'Nguyễn Văn A', phone: '0912345678', street: '456 Lê Lợi', ward: 'Phường Bến Thành', district: 'Quận 1', city: 'Hồ Chí Minh', isDefault: false },
    { userId: customers.c2.id, label: 'Nhà', fullName: 'Trần Thị B', phone: '0923456789', street: '789 Bạch Đằng', ward: 'Phường Hải Châu', district: 'Q. Hải Châu', city: 'Đà Nẵng', isDefault: true },
    { userId: customers.c3.id, label: 'Nhà', fullName: 'Lê Văn C', phone: '0934567890', street: '111 Trần Hưng Đạo', ward: 'Phường Hồng Bàng', district: 'Q. Hồng Bàng', city: 'Hải Phòng', isDefault: true },
    { userId: customers.c3.id, label: 'Cơ quan', fullName: 'Lê Văn C', phone: '0934567890', street: '222 Lạch Tray', ward: 'Phường Lạch Tray', district: 'Q. Ngô Quyền', city: 'Hải Phòng', isDefault: false },
  ];
  const addresses = await Promise.all(addressData.map(a => prisma.address.create({ data: a })));
  console.log(`  ✔ Tạo ${addresses.length} địa chỉ`);

  // ─── 2. Banner ───
  const banners = await Promise.all([
    prisma.banner.create({ data: { title: 'Flash Sale Mùa Hè', subtitle: 'Giảm đến 50% cho điện thoại & laptop', imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop', linkUrl: '/products?category=dien-thoai-phu-kien', linkText: 'Mua ngay', position: 0, isActive: true, bgColor: '#1e3a5f' } }),
    prisma.banner.create({ data: { title: 'Bộ Sưu Tập Thời Trang Mới', subtitle: 'Cập nhật xu hướng Thu - Đông 2024', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=400&fit=crop', linkUrl: '/products?category=thoi-trang', linkText: 'Khám phá', position: 1, isActive: true, bgColor: '#2d1b4e' } }),
    prisma.banner.create({ data: { title: 'Đồ Gia Dụng Chính Hãng', subtitle: 'Giá ưu đãi - Giao nhanh trong 2h', imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1200&h=400&fit=crop', linkUrl: '/products?category=do-gia-dung', linkText: 'Xem thêm', position: 2, isActive: true, bgColor: '#0f3b3e' } }),
    prisma.banner.create({ data: { title: 'Sách Hay Mỗi Ngày', subtitle: 'Giảm 20% đầu sách best-seller', imageUrl: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=1200&h=400&fit=crop', linkUrl: '/products?category=sach-van-phong-pham', linkText: 'Mua sách', position: 3, isActive: true, bgColor: '#3d2c1a' } }),
  ]);
  console.log(`  ✔ Tạo ${banners.length} banner`);

  // ─── 3. FlashSale ───
  const now = new Date();
  const flashSales = await Promise.all([
    prisma.flashSale.create({ data: { title: 'Siêu Sale Cuối Tuần', description: 'Giảm sốc đến 40% hàng công nghệ', bannerUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=300&fit=crop', startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), endTime: new Date(now.getTime() + 22 * 60 * 60 * 1000), isActive: true, products: { create: products.slice(0, 3).map((p, i) => ({ productId: p.id, salePrice: Math.round(p.discountPrice || p.price * 0.7), maxQuantity: 20 + i * 10, soldCount: 5 + i * 3 })) } } }),
    prisma.flashSale.create({ data: { title: 'Flash Sale Thời Trang', description: 'Giảm đến 30% thời trang nam nữ', bannerUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=300&fit=crop', startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), endTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), isActive: true, products: { create: products.slice(3, 6).map((p, i) => ({ productId: p.id, salePrice: Math.round(p.discountPrice || p.price * 0.75), maxQuantity: 15 + i * 5, soldCount: 0 })) } } }),
  ]);
  console.log(`  ✔ Tạo ${flashSales.length} flash sale`);

  // ─── 4. AuditLog ───
  const auditLogs = await Promise.all([
    prisma.auditLog.create({ data: { userId: admin.id, action: 'APPROVE', entity: 'PARTNER', entityId: partners.p1.id, details: 'Phê duyệt đối tác Shop Điện Tử ABC', ipAddress: '192.168.1.1' } }),
    prisma.auditLog.create({ data: { userId: admin.id, action: 'APPROVE', entity: 'PARTNER', entityId: partners.p2.id, details: 'Phê duyệt đối tác Fashion House XYZ', ipAddress: '192.168.1.1' } }),
    prisma.auditLog.create({ data: { userId: admin.id, action: 'CREATE', entity: 'COUPON', details: 'Tạo mã giảm giá WELCOME10, SALE50K, FREESHIP, VIP100K', ipAddress: '192.168.1.1' } }),
    prisma.auditLog.create({ data: { userId: admin.id, action: 'UPDATE', entity: 'PRODUCT', entityId: products[0]?.id, details: 'Cập nhật sản phẩm iPhone 15 Pro Max', ipAddress: '192.168.1.1' } }),
    prisma.auditLog.create({ data: { userId: partners.p1.id, action: 'CREATE', entity: 'PRODUCT', details: 'Thêm sản phẩm mới vào shop', ipAddress: '10.0.0.5' } }),
    prisma.auditLog.create({ data: { userId: admin.id, action: 'UPDATE', entity: 'SETTINGS', details: 'Cập nhật phí ship mặc định: 30000', ipAddress: '192.168.1.1' } }),
  ]);
  console.log(`  ✔ Tạo ${auditLogs.length} audit log`);

  // ─── 5. Refund ───
  const orders = await prisma.order.findMany({ take: 3, include: { orderItems: { take: 1 } } });
  if (orders.length > 0) {
    const refunds = await Promise.all([
      prisma.refund.create({ data: { orderId: orders[0].id, userId: orders[0].userId, reason: 'Sản phẩm bị lỗi', description: 'iPhone nhận được bị màn hình có điểm chết.', images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400'], amount: orders[0].finalAmount, status: 'REFUNDED', adminReply: 'Xác nhận lỗi từ nhà sản xuất. Hoàn tiền.', resolvedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) } }),
      orders[1] ? prisma.refund.create({ data: { orderId: orders[1].id, userId: orders[1].userId, reason: 'Sai kích cỡ', description: 'Sản phẩm nhận được không đúng kích cỡ.', images: ['https://images.unsplash.com/photo-1546868871-af0de0ae72e5?w=400'], amount: orders[1].finalAmount, status: 'PENDING' } }) : null,
    ].filter(Boolean));
    console.log(`  ✔ Tạo ${refunds.length} yêu cầu hoàn tiền`);
  }

  // ─── 6. Violation ───
  const violations = await Promise.all([
    prisma.violation.create({ data: { reportedById: customers.c1.id, targetId: partners.p1.id, targetType: 'SHOP', reason: 'Sản phẩm kém chất lượng', description: 'Cửa hàng bán hàng giả mạo.', evidence: ['https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400'], status: 'RESOLVED', penalty: 'WARNING', resolvedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) } }),
    prisma.violation.create({ data: { reportedById: customers.c2.id, targetType: 'PRODUCT', targetId: products[3]?.id || 'unknown', reason: 'Hàng giả, hàng nhái', description: 'Sản phẩm không rõ nguồn gốc, nghi ngờ hàng giả.', evidence: [], status: 'PENDING' } }),
    prisma.violation.create({ data: { reportedById: customers.c1.id, targetId: partners.p1.id, targetType: 'SHOP', reason: 'Spam quảng cáo', description: 'Shop gửi tin nhắn quảng cáo sau khi mua.', evidence: [], status: 'DISMISSED', resolvedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) } }),
  ]);
  console.log(`  ✔ Tạo ${violations.length} vi phạm`);

  // ─── 7. FollowedShop ───
  const follows = await Promise.all([
    prisma.followedShop.create({ data: { userId: customers.c1.id, partnerId: partners.p1.id } }),
    prisma.followedShop.create({ data: { userId: customers.c1.id, partnerId: partners.p2.id } }),
    prisma.followedShop.create({ data: { userId: customers.c2.id, partnerId: partners.p1.id } }),
    prisma.followedShop.create({ data: { userId: customers.c3.id, partnerId: partners.p2.id } }),
  ]);
  console.log(`  ✔ Tạo ${follows.length} lượt theo dõi shop`);

  // ─── 8. Conversation & Message ───
  const conversations = await Promise.all([
    prisma.conversation.create({ data: { userId: customers.c1.id, partnerId: partners.p1.id, orderId: orders[0]?.id || null, messages: { create: [
      { senderId: customers.c1.id, content: 'Chào shop, cho tôi hỏi về iPhone 15 Pro Max còn hàng không?', isRead: true },
      { senderId: partners.p1.id, content: 'Dạ chào anh/chị, iPhone 15 Pro Max 256GB còn hàng ạ!', isRead: true },
      { senderId: customers.c1.id, content: 'Có giảm giá gì không shop?', isRead: true },
      { senderId: partners.p1.id, content: 'Hiện tại có mã ABC20 giảm 20% cho đơn từ 500K ạ.', isRead: false },
    ] } } }),
    prisma.conversation.create({ data: { userId: customers.c2.id, partnerId: partners.p2.id, messages: { create: [
      { senderId: customers.c2.id, content: 'Shop ơi, đầm dự tiệc size M còn không?', isRead: true },
      { senderId: partners.p2.id, content: 'Dạ còn ạ! Chị muốn đặt bao nhiêu cái?', isRead: true },
      { senderId: customers.c2.id, content: 'Cho tôi 2 cái, màu đen nhé.', isRead: false },
    ] } } }),
  ]);
  console.log(`  ✔ Tạo ${conversations.length} cuộc hội thoại (kèm tin nhắn)`);

  console.log('\n───────────────────────────────────────');
  console.log('✅ Seed dữ liệu model mới hoàn tất!');
  console.log(`   ${addresses.length} địa chỉ, ${banners.length} banner, ${flashSales.length} flash sale`);
  console.log(`   ${auditLogs.length} audit log, ${violations.length} vi phạm, ${follows.length} follow`);
  console.log(`   ${conversations.length} hội thoại`);
  console.log('───────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('❌ Seed thất bại:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
