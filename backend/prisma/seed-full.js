require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed mở rộng dữ liệu...\n');

  // Kiểm tra đã seed chưa (kiểm tra sản phẩm mới)
  const existingExtraProducts = await prisma.product.count({ where: { slug: { contains: 'extra-' } } });
  if (existingExtraProducts > 0) {
    console.log('  ℹ Dữ liệu mở rộng đã tồn tại, bỏ qua.');
    return;
  }

  // ─── LẤY DỮ LIỆU HIỆN CÓ ───
  const admin = await prisma.user.findUnique({ where: { email: 'admin@khoaluan.com' } });
  const existingPartners = await prisma.user.findMany({ where: { role: 'PARTNER', isApproved: true } });
  const existingCustomers = await prisma.user.findMany({ where: { role: 'CUSTOMER' } });
  const existingCategories = await prisma.category.findMany();

  console.log(`  ✔ Đã tìm thấy: ${existingCustomers.length} customers, ${existingPartners.length} partners, ${existingCategories.length} danh mục`);

  const partner1 = existingPartners.find(p => p.email === 'partner1@shop.com');
  const partner2 = existingPartners.find(p => p.email === 'partner2@fashion.com');
  const customer1 = existingCustomers.find(c => c.email === 'customer1@test.com');
  const customer2 = existingCustomers.find(c => c.email === 'customer2@test.com');
  const customer3 = existingCustomers.find(c => c.email === 'customer3@test.com');

  // ─── 1. THÊM NHIỀU KHÁCH HÀNG HƠN ───
  const customerPassword = await bcrypt.hash('customer123', 12);
  const newCustomersData = [
    { email: 'customer4@test.com', name: 'Phạm Thị D', phone: '0945678901', address: 'Cần Thơ, Việt Nam' },
    { email: 'customer5@test.com', name: 'Hoàng Văn E', phone: '0956789012', address: 'Nha Trang, Khánh Hòa' },
    { email: 'customer6@test.com', name: 'Đỗ Thị F', phone: '0967890123', address: 'Huế, Thừa Thiên Huế' },
    { email: 'customer7@test.com', name: 'Vũ Văn G', phone: '0978901234', address: 'Buôn Ma Thuột, Đắk Lắk' },
    { email: 'customer8@test.com', name: 'Đặng Thị H', phone: '0989012345', address: 'Vinh, Nghệ An' },
    { email: 'customer9@test.com', name: 'Bùi Văn K', phone: '0990123456', address: 'Quy Nhơn, Bình Định' },
    { email: 'customer10@test.com', name: 'Lý Thị L', phone: '0901122334', address: 'Thái Nguyên, Việt Nam' },
    { email: 'customer11@test.com', name: 'Mai Văn M', phone: '0902233445', address: 'Hạ Long, Quảng Ninh' },
    { email: 'customer12@test.com', name: 'Tạ Thị N', phone: '0903344556', address: 'Phan Thiết, Bình Thuận' },
    { email: 'customer13@test.com', name: 'Đinh Văn P', phone: '0904455667', address: 'Rạch Giá, Kiên Giang' },
    { email: 'customer14@test.com', name: 'Lương Thị Q', phone: '0905566778', address: 'Tuy Hòa, Phú Yên' },
    { email: 'customer15@test.com', name: 'Trịnh Văn R', phone: '0906677889', address: 'Sóc Trăng, Việt Nam' },
  ];

  const newCustomers = [];
  for (const c of newCustomersData) {
    const existing = await prisma.user.findUnique({ where: { email: c.email } });
    if (!existing) {
      const user = await prisma.user.create({
        data: {
          ...c,
          password: customerPassword,
          role: 'CUSTOMER',
          isActive: true,
        },
      });
      newCustomers.push(user);
    }
  }
  console.log(`  ✔ Thêm ${newCustomers.length} khách hàng mới`);

  // ─── 2. THÊM ĐỐI TÁC MỚI ───
  const partnerPassword = await bcrypt.hash('partner123', 12);
  const newPartnersData = [
    { email: 'partner4@sport.com', name: 'Phạm Văn Thể Thao', phone: '0912345001', storeName: 'Sports Zone Việt Nam', storeDescription: 'Chuyên dụng cụ thể thao, đồ tập gym chính hãng', taxCode: '9988776655', businessAddress: '88 Nguyễn Văn Linh, Q.7, TP.HCM' },
    { email: 'partner5@beauty.com', name: 'Trần Thị Đẹp', phone: '0923456002', storeName: 'Beauty House', storeDescription: 'Mỹ phẩm chính hãng Hàn Quốc, Nhật Bản', taxCode: '8877665544', businessAddress: '55 Lê Văn Sỹ, Q.3, TP.HCM' },
    { email: 'partner6@pet.com', name: 'Lê Văn Pet', phone: '0934567003', storeName: 'Pet Mart Việt Nam', storeDescription: 'Thức ăn, phụ kiện cho chó mèo', taxCode: '7766554433', businessAddress: '22 Xô Viết Nghệ Tĩnh, Đà Nẵng' },
    { email: 'partner7@furniture.com', name: 'Hoàng Thị Nội Thất', phone: '0945678004', storeName: 'Nội Thất Xinh', storeDescription: 'Đồ nội thất gia đình, văn phòng', taxCode: '6655443322', businessAddress: '77 Nguyễn Trãi, Hà Nội' },
    { email: 'partner8@mebebe.com', name: 'Nguyễn Văn Bé', phone: '0956789013', storeName: 'Mẹ & Bé Shop', storeDescription: 'Đồ dùng mẹ và bé, đồ chơi trẻ em chính hãng', taxCode: '5544332211', businessAddress: '99 Lê Đại Hành, Q.11, TP.HCM' },
  ];

  const newPartners = [];
  for (const p of newPartnersData) {
    const existing = await prisma.user.findUnique({ where: { email: p.email } });
    if (!existing) {
      const { isApproved, ...partnerInfo } = p;
      const user = await prisma.user.create({
        data: {
          ...partnerInfo,
          password: partnerPassword,
          role: 'PARTNER',
          isActive: true,
          isApproved: isApproved !== undefined ? isApproved : true,
          approvedAt: isApproved !== false ? new Date() : null,
        },
      });
      newPartners.push(user);
    }
  }
  console.log(`  ✔ Thêm ${newPartners.length} đối tác mới`);

  // Gộp danh sách partner/customer
  const allPartners = [...existingPartners, ...newPartners];
  const allCustomers = [...existingCustomers, ...newCustomers];
  const p1 = partner1 || allPartners[0];
  const p2 = partner2 || allPartners[1];
  // Partner mới từ seed-full
  const p4 = allPartners.find(p => p.email === 'partner4@sport.com');
  const p5 = allPartners.find(p => p.email === 'partner5@beauty.com');
  const p6 = allPartners.find(p => p.email === 'partner6@pet.com');
  const p7 = allPartners.find(p => p.email === 'partner7@furniture.com');
  const p8 = allPartners.find(p => p.email === 'partner8@mebebe.com');
  const c1 = customer1 || allCustomers[0];
  const c2 = customer2 || allCustomers[1];
  const c3 = customer3 || allCustomers[2];
  const c4 = newCustomers[0] || allCustomers[3];
  const c5 = newCustomers[1] || allCustomers[4];
  const c6 = newCustomers[2] || allCustomers[5];
  const c7 = newCustomers[3] || allCustomers[6];
  const c8 = newCustomers[4] || allCustomers[7];

  // ─── 3. THÊM DANH MỤC MỚI ───
  const newCategoriesData = [
    { name: 'Mỹ phẩm & Chăm sóc da', slug: 'my-pham-cham-soc-da', description: 'Mỹ phẩm, skincare, makeup chính hãng', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400' },
    { name: 'Thể thao & Du lịch', slug: 'the-thao-du-lich', description: 'Dụng cụ thể thao, đồ dã ngoại, balo', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400' },
    { name: 'Thú cưng', slug: 'thu-cung', description: 'Thức ăn, phụ kiện cho chó mèo và thú cưng', image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400' },
    { name: 'Nội thất & Trang trí', slug: 'noi-that-trang-tri', description: 'Đồ nội thất, đèn trang trí, thảm', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400' },
    { name: 'Mẹ & Bé', slug: 'me-va-be', description: 'Đồ dùng mẹ và bé, đồ chơi trẻ em', image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400' },
  ];

  const allCategories = [...existingCategories];
  for (const cat of newCategoriesData) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (!existing) {
      const newCat = await prisma.category.create({ data: cat });
      allCategories.push(newCat);
    }
  }
  console.log(`  ✔ Thêm danh mục mới (tổng: ${allCategories.length})`);

  // Helper: tìm category
  const catIdx = (slug) => allCategories.find(c => c.slug === slug);
  const cDienThoai = catIdx('dien-thoai-phu-kien');
  const cLaptop = catIdx('laptop-may-tinh-bang');
  const cThoiTrang = catIdx('thoi-trang');
  const cDoGiaDung = catIdx('do-gia-dung');
  const cSach = catIdx('sach-van-phong-pham');
  const cMyPham = catIdx('my-pham-cham-soc-da');
  const cTheThao = catIdx('the-thao-du-lich');
  const cThuCung = catIdx('thu-cung');
  const cNoiThat = catIdx('noi-that-trang-tri');
  const cMeBe = catIdx('me-va-be');

  // ─── 4. THÊM NHIỀU SẢN PHẨM ───
  const extraProductsData = [
    // --- Điện thoại & Phụ kiện (thêm) ---
    { name: 'Samsung Galaxy Z Fold5', slug: 'extra-samsung-galaxy-z-fold5', price: 38990000, discountPrice: 35990000, stock: 15, soldCount: 42, rating: 4.7, reviewCount: 68, category: cDienThoai, partner: p1 },
    { name: 'OPPO Find N3 Flip', slug: 'extra-oppo-find-n3-flip', price: 19990000, discountPrice: null, stock: 30, soldCount: 56, rating: 4.5, reviewCount: 47, category: cDienThoai, partner: p1 },
    { name: 'Google Pixel 8 Pro', slug: 'extra-google-pixel-8-pro', price: 24990000, discountPrice: 22990000, stock: 20, soldCount: 33, rating: 4.6, reviewCount: 55, category: cDienThoai, partner: null },
    { name: 'Tai nghe AirPods Pro 2', slug: 'extra-airpods-pro-2', price: 5999000, discountPrice: 5499000, stock: 80, soldCount: 234, rating: 4.8, reviewCount: 189, category: cDienThoai, partner: p1 },
    { name: 'Đồng hồ thông minh Apple Watch S9', slug: 'extra-apple-watch-s9', price: 11990000, discountPrice: 10990000, stock: 30, soldCount: 78, rating: 4.7, reviewCount: 112, category: cDienThoai, partner: p1 },
    { name: 'Loa bluetooth JBL Charge 5', slug: 'extra-jbl-charge-5', price: 2999000, discountPrice: 2699000, stock: 45, soldCount: 167, rating: 4.6, reviewCount: 93, category: cDienThoai, partner: null },
    { name: 'Pin sạc dự phòng 20000mAh', slug: 'extra-pin-sac-du-phong', price: 449000, discountPrice: 399000, stock: 150, soldCount: 456, rating: 4.4, reviewCount: 78, category: cDienThoai, partner: null },

    // --- Laptop & Máy tính bảng (thêm) ---
    { name: 'MacBook Air M3 15\"', slug: 'extra-macbook-air-m3-15', price: 33990000, discountPrice: 31990000, stock: 18, soldCount: 47, rating: 4.8, reviewCount: 84, category: cLaptop, partner: p1 },
    { name: 'Surface Pro 10', slug: 'extra-surface-pro-10', price: 28990000, discountPrice: null, stock: 12, soldCount: 29, rating: 4.5, reviewCount: 38, category: cLaptop, partner: null },
    { name: 'Chuột không dây Logitech MX Master 3S', slug: 'extra-logitech-mx-master-3s', price: 1799000, discountPrice: 1599000, stock: 60, soldCount: 189, rating: 4.7, reviewCount: 123, category: cLaptop, partner: p1 },
    { name: 'Bàn phím cơ Keychron K8 Pro', slug: 'extra-keychron-k8-pro', price: 2599000, discountPrice: 2299000, stock: 40, soldCount: 98, rating: 4.6, reviewCount: 67, category: cLaptop, partner: null },
    { name: 'Màn hình LG UltraFine 27\" 4K', slug: 'extra-lg-ultrafine-27-4k', price: 12990000, discountPrice: 11990000, stock: 10, soldCount: 23, rating: 4.7, reviewCount: 34, category: cLaptop, partner: null },
    { name: 'Webcam Logitech C920 HD', slug: 'extra-webcam-logitech-c920', price: 1499000, discountPrice: 1299000, stock: 70, soldCount: 234, rating: 4.5, reviewCount: 89, category: cLaptop, partner: null },

    // --- Thời trang (thêm) ---
    { name: 'Áo khoác jean nam', slug: 'extra-ao-khoac-jean-nam', price: 599000, discountPrice: 499000, stock: 80, soldCount: 156, rating: 4.5, reviewCount: 67, category: cThoiTrang, partner: p2 },
    { name: 'Váy hoa nữ dáng dài', slug: 'extra-vay-hoa-nu-dang-dai', price: 499000, discountPrice: 399000, stock: 60, soldCount: 123, rating: 4.6, reviewCount: 55, category: cThoiTrang, partner: p2 },
    { name: 'Áo thun nam cotton', slug: 'extra-ao-thun-nam-cotton', price: 199000, discountPrice: 149000, stock: 200, soldCount: 567, rating: 4.4, reviewCount: 123, category: cThoiTrang, partner: p2 },
    { name: 'Quần tây nam công sở', slug: 'extra-quan-tay-nam-cong-so', price: 499000, discountPrice: 399000, stock: 90, soldCount: 234, rating: 4.5, reviewCount: 78, category: cThoiTrang, partner: p2 },
    { name: 'Balo thời trang nữ', slug: 'extra-balo-thoi-trang-nu', price: 399000, discountPrice: 349000, stock: 100, soldCount: 345, rating: 4.6, reviewCount: 89, category: cThoiTrang, partner: p2 },
    { name: 'Đồng hồ nam cơ', slug: 'extra-dong-ho-nam-co', price: 2999000, discountPrice: 2499000, stock: 30, soldCount: 67, rating: 4.7, reviewCount: 45, category: cThoiTrang, partner: null },

    // --- Đồ gia dụng (thêm) ---
    { name: 'Robot hút bụi lau nhà', slug: 'extra-robot-hut-bui-lau-nha', price: 7999000, discountPrice: 6999000, stock: 20, soldCount: 45, rating: 4.6, reviewCount: 67, category: cDoGiaDung, partner: null },
    { name: 'Bếp từ đôi âm', slug: 'extra-bep-tu-doi-am', price: 5999000, discountPrice: 5499000, stock: 15, soldCount: 34, rating: 4.5, reviewCount: 43, category: cDoGiaDung, partner: null },
    { name: 'Máy lọc không khí', slug: 'extra-may-loc-khong-khi', price: 4999000, discountPrice: 4499000, stock: 18, soldCount: 56, rating: 4.7, reviewCount: 78, category: cDoGiaDung, partner: null },
    { name: 'Bộ nồi chống dính 5 món', slug: 'extra-bo-noi-chong-dinh', price: 1299000, discountPrice: 999000, stock: 40, soldCount: 189, rating: 4.5, reviewCount: 67, category: cDoGiaDung, partner: null },
    { name: 'Máy ép chậm', slug: 'extra-may-ep-cham', price: 2599000, discountPrice: 2299000, stock: 25, soldCount: 78, rating: 4.6, reviewCount: 56, category: cDoGiaDung, partner: null },

    // --- Sách & VPP (thêm) ---
    { name: 'Sách \"Đắc nhân tâm\" - Dale Carnegie', slug: 'extra-sach-dac-nhan-tam', price: 99000, discountPrice: 79000, stock: 300, soldCount: 2345, rating: 4.8, reviewCount: 1234, category: cSach, partner: null },
    { name: 'Sách \"Tư duy nhanh và chậm\"', slug: 'extra-sach-tu-duy-nhanh-cham', price: 179000, discountPrice: 149000, stock: 200, soldCount: 987, rating: 4.7, reviewCount: 567, category: cSach, partner: null },
    { name: 'Bút máy cao cấp', slug: 'extra-but-may-cao-cap', price: 299000, discountPrice: 249000, stock: 150, soldCount: 456, rating: 4.5, reviewCount: 89, category: cSach, partner: null },
    { name: 'Sổ planner 2024', slug: 'extra-so-planner-2024', price: 199000, discountPrice: 149000, stock: 250, soldCount: 678, rating: 4.6, reviewCount: 134, category: cSach, partner: null },

    // --- Mỹ phẩm & Chăm sóc da (danh mục mới) - Beauty House ---
    { name: 'Kem chống nắng Anessa SPF50+', slug: 'extra-kem-chong-nang-anessa', price: 499000, discountPrice: 449000, stock: 100, soldCount: 345, rating: 4.8, reviewCount: 234, category: cMyPham, partner: p5 },
    { name: 'Serum Vitamin C Dear Klairs', slug: 'extra-serum-vitamin-c', price: 399000, discountPrice: 349000, stock: 80, soldCount: 234, rating: 4.7, reviewCount: 156, category: cMyPham, partner: p5 },
    { name: 'Sữa rửa mặt La Roche-Posay', slug: 'extra-sua-rua-mat-la-roche', price: 349000, discountPrice: null, stock: 120, soldCount: 456, rating: 4.6, reviewCount: 189, category: cMyPham, partner: p5 },
    { name: 'Son môi MAC Matte', slug: 'extra-son-moi-mac-matte', price: 699000, discountPrice: 599000, stock: 60, soldCount: 189, rating: 4.7, reviewCount: 98, category: cMyPham, partner: p5 },
    { name: 'Nước hoa Chanel No.5', slug: 'extra-nuoc-hoa-chanel-no5', price: 3999000, discountPrice: 3599000, stock: 15, soldCount: 34, rating: 4.9, reviewCount: 56, category: cMyPham, partner: p5 },
    { name: 'Set cọ trang điểm 12 món', slug: 'extra-set-co-trang-diem', price: 299000, discountPrice: 249000, stock: 100, soldCount: 345, rating: 4.4, reviewCount: 67, category: cMyPham, partner: p5 },

    // --- Thể thao & Du lịch (danh mục mới) - Sports Zone ---
    { name: 'Máy chạy bộ điện', slug: 'extra-may-chay-bo-dien', price: 15990000, discountPrice: 13990000, stock: 8, soldCount: 18, rating: 4.6, reviewCount: 23, category: cTheThao, partner: p4 },
    { name: 'Bộ tạ đa năng 20kg', slug: 'extra-bo-ta-da-nang', price: 2999000, discountPrice: 2699000, stock: 25, soldCount: 56, rating: 4.5, reviewCount: 34, category: cTheThao, partner: p4 },
    { name: 'Balo du lịch chống nước 60L', slug: 'extra-balo-du-lich-60l', price: 899000, discountPrice: 749000, stock: 50, soldCount: 123, rating: 4.6, reviewCount: 67, category: cTheThao, partner: p4 },
    { name: 'Vợt tennis cao cấp', slug: 'extra-vot-tennis', price: 2599000, discountPrice: 2299000, stock: 20, soldCount: 34, rating: 4.5, reviewCount: 28, category: cTheThao, partner: p4 },
    { name: 'Bộ đồ tập gym nam', slug: 'extra-bo-do-tap-gym', price: 599000, discountPrice: 499000, stock: 80, soldCount: 234, rating: 4.5, reviewCount: 78, category: cTheThao, partner: p4 },
    { name: 'Xe đạp thể thao MTB', slug: 'extra-xe-dap-the-thao', price: 7999000, discountPrice: 6999000, stock: 10, soldCount: 23, rating: 4.7, reviewCount: 34, category: cTheThao, partner: p4 },

    // --- Thú cưng (danh mục mới) - Pet Mart ---
    { name: 'Thức ăn cho chó Royal Canin 15kg', slug: 'extra-thuc-an-cho-royal', price: 899000, discountPrice: 799000, stock: 60, soldCount: 345, rating: 4.7, reviewCount: 156, category: cThuCung, partner: p6 },
    { name: 'Cát vệ sinh cho mèo 10kg', slug: 'extra-cat-ve-sinh-meo', price: 149000, discountPrice: 129000, stock: 200, soldCount: 678, rating: 4.5, reviewCount: 89, category: cThuCung, partner: p6 },
    { name: 'Đồ chơi cho chó gặm xương', slug: 'extra-do-choi-cho-cho', price: 99000, discountPrice: null, stock: 300, soldCount: 1234, rating: 4.3, reviewCount: 56, category: cThuCung, partner: p6 },
    { name: 'Nhà vệ sinh cho mèo', slug: 'extra-nha-ve-sinh-meo', price: 399000, discountPrice: 349000, stock: 40, soldCount: 89, rating: 4.4, reviewCount: 34, category: cThuCung, partner: p6 },
    { name: 'Balo vận chuyển thú cưng', slug: 'extra-balo-van-chuyen-thu-cung', price: 599000, discountPrice: 499000, stock: 30, soldCount: 78, rating: 4.5, reviewCount: 45, category: cThuCung, partner: p6 },

    // --- Nội thất & Trang trí (danh mục mới) - Nội Thất Xinh ---
    { name: 'Bàn làm việc thông minh', slug: 'extra-ban-lam-viec-thong-minh', price: 4999000, discountPrice: 4499000, stock: 12, soldCount: 28, rating: 4.6, reviewCount: 34, category: cNoiThat, partner: p7 },
    { name: 'Ghế công thái học Ergonomic', slug: 'extra-ghe-ergonomic', price: 7999000, discountPrice: 6999000, stock: 10, soldCount: 22, rating: 4.7, reviewCount: 31, category: cNoiThat, partner: p7 },
    { name: 'Đèn bàn LED thông minh', slug: 'extra-den-ban-led-thong-minh', price: 899000, discountPrice: 749000, stock: 40, soldCount: 134, rating: 4.5, reviewCount: 56, category: cNoiThat, partner: p7 },
    { name: 'Tranh treo tường nghệ thuật', slug: 'extra-tranh-treo-tuong', price: 599000, discountPrice: 499000, stock: 25, soldCount: 89, rating: 4.4, reviewCount: 34, category: cNoiThat, partner: p7 },
    { name: 'Thảm trải sàn phòng khách', slug: 'extra-tham-trai-san', price: 2599000, discountPrice: 2299000, stock: 20, soldCount: 45, rating: 4.5, reviewCount: 28, category: cNoiThat, partner: p7 },
    { name: 'Kệ sách treo tường', slug: 'extra-ke-sach-treo-tuong', price: 899000, discountPrice: 749000, stock: 35, soldCount: 78, rating: 4.4, reviewCount: 45, category: cNoiThat, partner: p7 },

    // --- Mẹ & Bé (danh mục mới) - Mẹ & Bé Shop ---
    { name: 'Máy hâm sữa thông minh', slug: 'extra-may-ham-sua', price: 699000, discountPrice: 599000, stock: 50, soldCount: 234, rating: 4.6, reviewCount: 89, category: cMeBe, partner: p8 },
    { name: 'Xe đẩy em bé gấp gọn', slug: 'extra-xe-day-em-be', price: 2999000, discountPrice: 2699000, stock: 20, soldCount: 56, rating: 4.7, reviewCount: 45, category: cMeBe, partner: p8 },
    { name: 'Bình sữa PPSU chống sặc', slug: 'extra-binh-sua-ppsu', price: 199000, discountPrice: 169000, stock: 150, soldCount: 678, rating: 4.5, reviewCount: 123, category: cMeBe, partner: p8 },
    { name: 'Đồ chơi lắp ráp giáo dục', slug: 'extra-do-choi-lap-rap', price: 499000, discountPrice: 399000, stock: 80, soldCount: 234, rating: 4.6, reviewCount: 67, category: cMeBe, partner: p8 },
    { name: 'Ghế ăn dặm em bé', slug: 'extra-ghe-an-dam', price: 1599000, discountPrice: 1399000, stock: 30, soldCount: 89, rating: 4.7, reviewCount: 56, category: cMeBe, partner: p8 },
  ];

  const extraProducts = [];
  for (const p of extraProductsData) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (!existing) {
      const product = await prisma.product.create({
        data: {
          name: p.name,
          slug: p.slug,
          description: `Sản phẩm ${p.name} chất lượng cao, chính hãng. Giá tốt nhất thị trường.`,
          price: p.price,
          discountPrice: p.discountPrice,
          images: [`https://picsum.photos/seed/${p.slug}/400/400`],
          stock: p.stock,
          soldCount: p.soldCount,
          rating: p.rating,
          reviewCount: p.reviewCount,
          categoryId: p.category?.id,
          partnerId: p.partner ? p.partner.id : null,
        },
      });
      extraProducts.push(product);
    }
  }
  console.log(`  ✔ Thêm ${extraProducts.length} sản phẩm mới (tổng: ${await prisma.product.count()})`);

  // ─── 4b. SẢN PHẨM RIÊNG CHO TỪNG PARTNER MỚI ───
  const newPartnerProductsData = [
    // Sports Zone (p4) - Thể thao
    { name: 'Giày chạy bộ Nike Air Zoom Pegasus 40', slug: 'extra-nike-air-zoom-pegasus', price: 3499000, discountPrice: 2999000, stock: 30, soldCount: 89, rating: 4.7, reviewCount: 56, category: cTheThao, partner: p4 },
    { name: 'Máy massage cầm tay thông minh', slug: 'extra-may-massage-cam-tay', price: 899000, discountPrice: 749000, stock: 50, soldCount: 156, rating: 4.5, reviewCount: 45, category: cTheThao, partner: p4 },
    { name: 'Thảm tập yoga cao su TPE 6mm', slug: 'extra-tham-tap-yoga', price: 499000, discountPrice: 399000, stock: 80, soldCount: 234, rating: 4.6, reviewCount: 78, category: cTheThao, partner: p4 },
    { name: 'Dây nhảy thể thao chuyên nghiệp', slug: 'extra-day-nhay-the-thao', price: 199000, discountPrice: 149000, stock: 150, soldCount: 456, rating: 4.4, reviewCount: 34, category: cTheThao, partner: p4 },
    { name: 'Bình nước thể thao 1L cao cấp', slug: 'extra-binh-nuoc-the-thao-1l', price: 249000, discountPrice: 199000, stock: 200, soldCount: 678, rating: 4.3, reviewCount: 56, category: cTheThao, partner: p4 },

    // Beauty House (p5) - Mỹ phẩm
    { name: 'Mặt nạ giấy đa năng COSRX 10 miếng', slug: 'extra-mat-na-giay-cosrx', price: 199000, discountPrice: 169000, stock: 120, soldCount: 345, rating: 4.6, reviewCount: 123, category: cMyPham, partner: p5 },
    { name: 'Kem dưỡng ẩm Hada Labo Premium', slug: 'extra-kem-duong-am-hada-labo', price: 299000, discountPrice: 259000, stock: 90, soldCount: 567, rating: 4.7, reviewCount: 234, category: cMyPham, partner: p5 },
    { name: 'Nước tẩy trang Bioderma Sensibio 500ml', slug: 'extra-tay-trang-bioderma', price: 399000, discountPrice: 349000, stock: 70, soldCount: 456, rating: 4.8, reviewCount: 189, category: cMyPham, partner: p5 },
    { name: 'Phấn phủ kiềm dầu Innisfree No-Sebum', slug: 'extra-phan-phu-innisfree', price: 249000, discountPrice: 199000, stock: 100, soldCount: 789, rating: 4.5, reviewCount: 156, category: cMyPham, partner: p5 },
    { name: 'Dầu gội dược liệu Thái Dương 500ml', slug: 'extra-dau-goi-thai-duong', price: 159000, discountPrice: 129000, stock: 150, soldCount: 1234, rating: 4.4, reviewCount: 89, category: cMyPham, partner: p5 },

    // Pet Mart (p6) - Thú cưng
    { name: 'Vòng cổ chó chống rận thông minh', slug: 'extra-vong-co-cho-chong-ran', price: 299000, discountPrice: 249000, stock: 60, soldCount: 178, rating: 4.5, reviewCount: 67, category: cThuCung, partner: p6 },
    { name: 'Lồng vận chuyển thú cưng gấp gọn', slug: 'extra-long-van-chuyen-thu-cung', price: 799000, discountPrice: 699000, stock: 25, soldCount: 67, rating: 4.6, reviewCount: 34, category: cThuCung, partner: p6 },
    { name: 'Bát ăn chậm chống sặc cho chó', slug: 'extra-bat-an-cham-cho-cho', price: 179000, discountPrice: 149000, stock: 100, soldCount: 345, rating: 4.4, reviewCount: 56, category: cThuCung, partner: p6 },
    { name: 'Đồ chơi laser tương tác cho mèo', slug: 'extra-do-choi-laser-meo', price: 99000, discountPrice: 79000, stock: 200, soldCount: 567, rating: 4.3, reviewCount: 45, category: cThuCung, partner: p6 },
    { name: 'Dầu tắm cho chó lông dài 500ml', slug: 'extra-dau-tam-cho-long-dai', price: 199000, discountPrice: 169000, stock: 80, soldCount: 234, rating: 4.5, reviewCount: 67, category: cThuCung, partner: p6 },

    // Nội Thất Xinh (p7) - Nội thất
    { name: 'Giường ngủ gỗ tự nhiên Queen size', slug: 'extra-giuong-ngu-go-tu-nhien', price: 14990000, discountPrice: 12990000, stock: 6, soldCount: 18, rating: 4.8, reviewCount: 22, category: cNoiThat, partner: p7 },
    { name: 'Tủ quần áo 4 cánh gỗ công nghiệp', slug: 'extra-tu-quan-ao-4-canh', price: 9999000, discountPrice: 8999000, stock: 8, soldCount: 15, rating: 4.6, reviewCount: 18, category: cNoiThat, partner: p7 },
    { name: 'Đèn thả trần trang trí phòng khách', slug: 'extra-den-tha-tran-trang-tri', price: 1599000, discountPrice: 1399000, stock: 20, soldCount: 56, rating: 4.5, reviewCount: 34, category: cNoiThat, partner: p7 },
    { name: 'Bộ sofa phòng khách da cao cấp', slug: 'extra-bo-sofa-da-cao-cap', price: 25990000, discountPrice: 22990000, stock: 4, soldCount: 12, rating: 4.7, reviewCount: 16, category: cNoiThat, partner: p7 },
    { name: 'Kệ tivi gỗ công nghiệp 1m8', slug: 'extra-ke-tivi-go-cong-nghiep', price: 3999000, discountPrice: 3499000, stock: 12, soldCount: 34, rating: 4.5, reviewCount: 23, category: cNoiThat, partner: p7 },

    // Mẹ & Bé Shop (p8) - Mẹ & Bé
    { name: 'Máy tiệt trùng bình sữa UV 5 trong 1', slug: 'extra-may-tiet-trung-binh-sua', price: 1999000, discountPrice: 1799000, stock: 25, soldCount: 78, rating: 4.7, reviewCount: 45, category: cMeBe, partner: p8 },
    { name: 'Địu em bé thông minh Ergonomic', slug: 'extra-diu-em-be-thong-minh', price: 899000, discountPrice: 749000, stock: 30, soldCount: 123, rating: 4.6, reviewCount: 56, category: cMeBe, partner: p8 },
    { name: 'Bộ quần áo sơ sinh cao cấp 5 món', slug: 'extra-bo-quan-ao-so-sinh', price: 499000, discountPrice: 399000, stock: 60, soldCount: 234, rating: 4.6, reviewCount: 78, category: cMeBe, partner: p8 },
    { name: 'Máy đưa võng tự động thông minh', slug: 'extra-may-dua-vong-tu-dong', price: 1499000, discountPrice: 1299000, stock: 15, soldCount: 45, rating: 4.5, reviewCount: 34, category: cMeBe, partner: p8 },
    { name: 'Sách vải tương tác giáo dục cho bé', slug: 'extra-sach-vai-cho-be', price: 149000, discountPrice: 119000, stock: 120, soldCount: 456, rating: 4.4, reviewCount: 67, category: cMeBe, partner: p8 },
  ];

  let newPartnerProductCount = 0;
  for (const p of newPartnerProductsData) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: p.name,
          slug: p.slug,
          description: `Sản phẩm ${p.name} chất lượng cao, chính hãng. Giá tốt nhất thị trường.`,
          price: p.price,
          discountPrice: p.discountPrice,
          images: [`https://picsum.photos/seed/${p.slug}/400/400`],
          stock: p.stock,
          soldCount: p.soldCount,
          rating: p.rating,
          reviewCount: p.reviewCount,
          categoryId: p.category?.id,
          partnerId: p.partner ? p.partner.id : null,
        },
      });
      newPartnerProductCount++;
    }
  }
  console.log(`  ✔ Thêm ${newPartnerProductCount} sản phẩm cho partner mới (tổng: ${await prisma.product.count()})`);

  // Lấy tất cả sản phẩm (cũ + mới)
  const allProducts = await prisma.product.findMany({ orderBy: { createdAt: 'asc' } });
  
  // Lấy các sản phẩm partner mới từ DB
  const newPartnerSlugs = newPartnerProductsData.map(p => p.slug);
  const allNewPartnerProducts = await prisma.product.findMany({
    where: { slug: { in: newPartnerSlugs.filter(Boolean) } },
  });
  const getProductBySlug = (slug) => allProducts.find(p => p.slug === slug || p.slug === `extra-${slug}`);

  // ─── 5. BIẾN THỂ SẢN PHẨM (ProductVariant) ───
  const variantProducts = allProducts.filter(p => p.name.includes('iPhone') || p.name.includes('MacBook') || p.name.includes('Áo thun') || p.name.includes('Váy'));
  const variantData = [];
  for (const p of variantProducts.slice(0, 6)) {
    if (p.name.includes('iPhone') || p.name.includes('Phone')) {
      variantData.push(
        { productId: p.id, name: '128GB', type: 'storage', price: p.price - 3000000, stock: Math.floor(p.stock * 0.3) },
        { productId: p.id, name: '256GB', type: 'storage', price: p.price, stock: Math.floor(p.stock * 0.4) },
        { productId: p.id, name: '512GB', type: 'storage', price: p.price + 4000000, stock: Math.floor(p.stock * 0.3) },
      );
    } else if (p.name.includes('MacBook') || p.name.includes('MacBook')) {
      variantData.push(
        { productId: p.id, name: '14" M3 Pro', type: 'size', price: p.price, stock: Math.floor(p.stock * 0.4), sku: 'MBP-14-M3P' },
        { productId: p.id, name: '16" M3 Max', type: 'size', price: p.price + 10000000, stock: Math.floor(p.stock * 0.3), sku: 'MBP-16-M3M' },
      );
    } else if (p.name.includes('Áo thun')) {
      variantData.push(
        { productId: p.id, name: 'S', type: 'size', stock: Math.floor(p.stock * 0.2) },
        { productId: p.id, name: 'M', type: 'size', stock: Math.floor(p.stock * 0.3) },
        { productId: p.id, name: 'L', type: 'size', stock: Math.floor(p.stock * 0.3) },
        { productId: p.id, name: 'XL', type: 'size', stock: Math.floor(p.stock * 0.2) },
      );
    } else if (p.name.includes('Váy') || p.name.includes('Đầm')) {
      variantData.push(
        { productId: p.id, name: 'S', type: 'size', stock: Math.floor(p.stock * 0.25) },
        { productId: p.id, name: 'M', type: 'size', stock: Math.floor(p.stock * 0.35) },
        { productId: p.id, name: 'L', type: 'size', stock: Math.floor(p.stock * 0.25) },
        { productId: p.id, name: 'Đen', type: 'color', stock: Math.floor(p.stock * 0.4) },
        { productId: p.id, name: 'Đỏ', type: 'color', stock: Math.floor(p.stock * 0.3) },
        { productId: p.id, name: 'Trắng', type: 'color', stock: Math.floor(p.stock * 0.3) },
      );
    }
  }
  for (const v of variantData) {
    await prisma.productVariant.upsert({
      where: { productId_name_type: { productId: v.productId, name: v.name, type: v.type } },
      update: {},
      create: v,
    });
  }
  console.log(`  ✔ Thêm ${variantData.length} biến thể sản phẩm`);

  // ─── 6. CLUSTERS (nếu chưa đủ) ───
  let existingClusters = await prisma.cluster.findMany();
  if (existingClusters.length < 5) {
    const clusterNames = [
      { name: 'Khách VIP', description: 'Khách hàng chi tiêu cao, mua nhiều', color: '#dc2626' },
      { name: 'Khách Tiềm Năng', description: 'Khách hàng thường xuyên, chi tiêu trung bình', color: '#2563eb' },
      { name: 'Khách Mới', description: 'Khách hàng mới đăng ký, ít tương tác', color: '#16a34a' },
      { name: 'Khách Thân Thiết', description: 'Khách hàng trung thành, mua đều đặn', color: '#9333ea' },
      { name: 'Khách Mùa Vụ', description: 'Khách mua theo mùa, chi tiêu thấp', color: '#f59e0b' },
    ];

    for (const c of clusterNames) {
      const exists = existingClusters.find(ec => ec.name === c.name);
      if (!exists) {
        const cluster = await prisma.cluster.create({ data: c });
        existingClusters.push(cluster);
      }
    }

    // Tạo ClusterRules cho từng cluster
    const rules = [
      { clusterName: 'Khách VIP', metrics: [
        { metricName: 'monetary', minValue: 10000000, priority: 1 },
        { metricName: 'frequency', minValue: 10, priority: 2 },
        { metricName: 'recency', minValue: 0, maxValue: 30, priority: 3 },
      ]},
      { clusterName: 'Khách Tiềm Năng', metrics: [
        { metricName: 'monetary', minValue: 2000000, maxValue: 10000000, priority: 1 },
        { metricName: 'frequency', minValue: 3, maxValue: 10, priority: 2 },
      ]},
      { clusterName: 'Khách Mới', metrics: [
        { metricName: 'frequency', minValue: 0, maxValue: 1, priority: 1 },
        { metricName: 'recency', minValue: 0, maxValue: 90, priority: 2 },
      ]},
      { clusterName: 'Khách Thân Thiết', metrics: [
        { metricName: 'frequency', minValue: 5, priority: 1 },
        { metricName: 'monetary', minValue: 500000, maxValue: 5000000, priority: 2 },
      ]},
      { clusterName: 'Khách Mùa Vụ', metrics: [
        { metricName: 'recency', minValue: 60, maxValue: 365, priority: 1 },
        { metricName: 'frequency', minValue: 1, maxValue: 3, priority: 2 },
      ]},
    ];

    let ruleCount = 0;
    for (const r of rules) {
      const cluster = existingClusters.find(c => c.name === r.clusterName);
      if (cluster) {
        for (const m of r.metrics) {
          const existingRule = await prisma.clusterRule.findFirst({
            where: { clusterId: cluster.id, metricName: m.metricName },
          });
          if (!existingRule) {
            await prisma.clusterRule.create({
              data: { clusterId: cluster.id, ...m },
            });
            ruleCount++;
          }
        }
      }
    }
    console.log(`  ✔ Thêm ${ruleCount} quy tắc phân cụm`);
    console.log(`  ✔ Tổng số cluster: ${existingClusters.length}`);
  }

  // ─── 7. GÁN USER VÀO CLUSTER ───
  const clusters = await prisma.cluster.findMany();
  const vipCluster = clusters.find(c => c.name === 'Khách VIP');
  const potentialCluster = clusters.find(c => c.name === 'Khách Tiềm Năng');
  const newCluster = clusters.find(c => c.name === 'Khách Mới');
  const loyalCluster = clusters.find(c => c.name === 'Khách Thân Thiết');

  // Gán cluster cho user dựa trên totalSpent
  let clusterAssignCount = 0;
  for (const user of [c1, c2, c3, c4, c5, c6, c7, c8].filter(Boolean)) {
    if (user && !user.clusterId) {
      let clusterId = null;
      if (user.email === 'customer1@test.com' && vipCluster) clusterId = vipCluster.id;
      else if (['customer2@test.com', 'customer3@test.com'].includes(user.email) && potentialCluster) clusterId = potentialCluster.id;
      else if (newCluster) clusterId = newCluster.id;

      if (clusterId) {
        await prisma.user.update({ where: { id: user.id }, data: { clusterId } });
        clusterAssignCount++;
      }
    }
  }
  console.log(`  ✔ Gán ${clusterAssignCount} user vào cluster`);

  // ─── 8. NHIỀU ĐƠN HÀNG HƠN ───
  const existingOrderCount = await prisma.order.count();
  const orderStatuses = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'SHIPPING', 'CONFIRMED', 'PENDING', 'CANCELLED'];
  const paymentMethods = ['COD', 'BANKING', 'MOMO', 'VNPAY', 'COD'];
  const paymentStatuses = ['PAID', 'PAID', 'PAID', 'PAID', 'UNPAID', 'UNPAID', 'REFUNDED'];

  const orderData = [
    // --- Đơn hàng cho khách mới ---
    {
      user: c4, statusIdx: 0, payIdx: 0, ship: 30000, items: [
        { product: getProductBySlug('kem-chong-nang-anessa'), qty: 2 },
        { product: getProductBySlug('serum-vitamin-c'), qty: 1 },
      ]
    },
    {
      user: c4, statusIdx: 3, payIdx: 1, ship: 0, items: [
        { product: getProductBySlug('ao-thun-nam-cotton'), qty: 3 },
      ]
    },
    {
      user: c5, statusIdx: 1, payIdx: 2, ship: 30000, items: [
        { product: getProductBySlug('xe-day-em-be'), qty: 1 },
      ]
    },
    {
      user: c5, statusIdx: 4, payIdx: 3, ship: 0, items: [
        { product: getProductBySlug('do-choi-lap-rap'), qty: 2 },
      ]
    },
    {
      user: c6, statusIdx: 2, payIdx: 0, ship: 30000, items: [
        { product: getProductBySlug('may-chay-bo-dien'), qty: 1 },
      ]
    },
    {
      user: c6, statusIdx: 5, payIdx: 4, ship: 30000, items: [
        { product: getProductBySlug('thuc-an-cho-royal'), qty: 2 },
        { product: getProductBySlug('cat-ve-sinh-meo'), qty: 1 },
      ]
    },
    {
      user: c7, statusIdx: 0, payIdx: 2, ship: 0, items: [
        { product: getProductBySlug('sach-dac-nhan-tam'), qty: 2 },
        { product: getProductBySlug('sach-tu-duy-nhanh-cham'), qty: 1 },
        { product: getProductBySlug('so-planner-2024'), qty: 1 },
      ]
    },
    {
      user: c7, statusIdx: 6, payIdx: 0, ship: 0, items: [
        { product: getProductBySlug('ban-lam-viec-thong-minh'), qty: 1 },
      ]
    },
    {
      user: c1, statusIdx: 2, payIdx: 1, ship: 30000, items: [
        { product: getProductBySlug('extra-samsung-galaxy-z-fold5'), qty: 1 },
      ]
    },
    {
      user: c2, statusIdx: 0, payIdx: 2, ship: 0, items: [
        { product: getProductBySlug('nuoc-hoa-chanel-no5'), qty: 1 },
        { product: getProductBySlug('son-moi-mac-matte'), qty: 2 },
      ]
    },
    {
      user: c3, statusIdx: 3, payIdx: 1, ship: 30000, items: [
        { product: getProductBySlug('robot-hut-bui-lau-nha'), qty: 1 },
      ]
    },
    {
      user: c8, statusIdx: 1, payIdx: 3, ship: 0, items: [
        { product: getProductBySlug('balo-du-lich-60l'), qty: 1 },
        { product: getProductBySlug('bo-do-tap-gym'), qty: 2 },
      ]
    },
    {
      user: c4, statusIdx: 2, payIdx: 4, ship: 30000, items: [
        { product: getProductBySlug('ghe-ergonomic'), qty: 1 },
        { product: getProductBySlug('den-ban-led-thong-minh'), qty: 1 },
      ]
    },
    {
      user: c5, statusIdx: 0, payIdx: 2, ship: 0, items: [
        { product: getProductBySlug('giay-the-thao-nam'), qty: 1 },
        { product: getProductBySlug('balo-thoi-trang-nu'), qty: 1 },
      ]
    },
    {
      user: c6, statusIdx: 6, payIdx: 0, ship: 30000, items: [
        { product: getProductBySlug('pin-sac-du-phong'), qty: 3 },
      ]
    },
    // --- Đơn hàng cho sản phẩm partner mới ---
    {
      user: c1, statusIdx: 0, payIdx: 2, ship: 30000, items: [
        { product: getProductBySlug('nike-air-zoom-pegasus'), qty: 1 },
        { product: getProductBySlug('tham-tap-yoga'), qty: 1 },
      ]
    },
    {
      user: c2, statusIdx: 1, payIdx: 1, ship: 0, items: [
        { product: getProductBySlug('kem-duong-am-hada-labo'), qty: 2 },
        { product: getProductBySlug('tay-trang-bioderma'), qty: 1 },
      ]
    },
    {
      user: c3, statusIdx: 3, payIdx: 3, ship: 30000, items: [
        { product: getProductBySlug('thuc-an-cho-royal'), qty: 2 },
        { product: getProductBySlug('bat-an-cham-cho-cho'), qty: 1 },
      ]
    },
    {
      user: c4, statusIdx: 2, payIdx: 0, ship: 0, items: [
        { product: getProductBySlug('giuong-ngu-go-tu-nhien'), qty: 1 },
      ]
    },
    {
      user: c5, statusIdx: 0, payIdx: 2, ship: 30000, items: [
        { product: getProductBySlug('may-tiet-trung-binh-sua'), qty: 1 },
        { product: getProductBySlug('bo-quan-ao-so-sinh'), qty: 2 },
      ]
    },
  ];

  let newOrders = [];
  for (const o of orderData) {
    if (!o.user) continue;
    const validItems = o.items.filter(item => item.product);
    if (validItems.length === 0) continue;

    const totalAmount = validItems.reduce((sum, item) => sum + item.product.price * item.qty, 0);
    const discountAmount = Math.round(totalAmount * 0.05); // Giảm 5%
    const finalAmount = totalAmount + o.ship - discountAmount;
    const status = orderStatuses[o.statusIdx];
    const paymentMethod = paymentMethods[o.payIdx];
    const paymentStatus = paymentStatuses[o.payIdx];
    const city = o.user.address?.split(',')[0]?.trim() || 'Hà Nội';

    const order = await prisma.order.create({
      data: {
        userId: o.user.id,
        totalAmount,
        shippingFee: o.ship,
        discountAmount,
        finalAmount,
        status,
        paymentMethod,
        paymentStatus,
        shippingAddress: `Số ${Math.floor(Math.random() * 500) + 1} ${['Nguyễn Huệ', 'Trần Hưng Đạo', 'Lê Lợi', 'Bạch Đằng', 'Xô Viết Nghệ Tĩnh', 'Hoàng Diệu', 'Lý Thường Kiệt'][Math.floor(Math.random() * 7)]}, ${city}`,
        phone: o.user.phone || '0900000000',
        orderItems: {
          create: validItems.map(item => ({
            productId: item.product.id,
            quantity: item.qty,
            price: item.product.discountPrice || item.product.price,
          })),
        },
      },
    });
    newOrders.push(order);
  }
  console.log(`  ✔ Thêm ${newOrders.length} đơn hàng mới (tổng: ${existingOrderCount + newOrders.length})`);

  // ─── 9. NHIỀU ĐÁNH GIÁ HƠN ───
  const reviewTemplates = [
    { rating: 5, comment: 'Sản phẩm tuyệt vời! Chất lượng vượt mong đợi.' },
    { rating: 5, comment: 'Giao hàng nhanh, đóng gói cẩn thận. Sẽ ủng hộ shop tiếp!' },
    { rating: 4, comment: 'Hàng đẹp, chất lượng tốt. Giá hơi cao nhưng xứng đáng.' },
    { rating: 4, comment: 'Chất lượng ổn, đúng mô tả. Giao hàng hơi chậm.' },
    { rating: 5, comment: 'Rất hài lòng với sản phẩm. Shop tư vấn nhiệt tình!' },
    { rating: 3, comment: 'Sản phẩm tạm ổn, không có gì đặc biệt.' },
    { rating: 5, comment: 'Đã mua lần thứ 2, chất lượng vẫn rất tốt!' },
    { rating: 4, comment: 'OK, đúng hàng chính hãng. Cảm ơn shop.' },
    { rating: 5, comment: 'Mua làm quà, người nhận rất thích. Cảm ơn!' },
    { rating: 4, comment: 'Tốt, giá hợp lý so với chất lượng.' },
  ];

  const reviewUsers = [c1, c2, c3, c4, c5, c6].filter(Boolean);

  let newReviewCount = 0;
  // Review cho sản phẩm cũ
  for (const product of extraProducts.slice(0, 20)) {
    const numReviews = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < numReviews; i++) {
      const user = reviewUsers[Math.floor(Math.random() * reviewUsers.length)];
      if (!user) continue;
      const existingReview = await prisma.review.findUnique({
        where: { userId_productId: { userId: user.id, productId: product.id } },
      });
      if (!existingReview) {
        const tmpl = reviewTemplates[Math.floor(Math.random() * reviewTemplates.length)];
        await prisma.review.create({
          data: {
            userId: user.id,
            productId: product.id,
            rating: tmpl.rating,
            comment: tmpl.comment,
          },
        });
        newReviewCount++;
      }
    }
  }
  // Review cho sản phẩm partner mới
  for (const product of allNewPartnerProducts.slice(0, 15)) {
    const numReviews = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < numReviews; i++) {
      const user = reviewUsers[Math.floor(Math.random() * reviewUsers.length)];
      if (!user) continue;
      const existingReview = await prisma.review.findUnique({
        where: { userId_productId: { userId: user.id, productId: product.id } },
      });
      if (!existingReview) {
        const tmpl = reviewTemplates[Math.floor(Math.random() * reviewTemplates.length)];
        await prisma.review.create({
          data: {
            userId: user.id,
            productId: product.id,
            rating: tmpl.rating,
            comment: tmpl.comment,
          },
        });
        newReviewCount++;
      }
    }
  }
  console.log(`  ✔ Thêm ${newReviewCount} đánh giá mới (tổng: ${await prisma.review.count()})`);

  // ─── 10. CART ITEMS ───
  const cartUsers = [c1, c2, c3, c6, c7].filter(Boolean);
  let cartCount = 0;
  for (const user of cartUsers) {
    const productCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < productCount; i++) {
      const product = allProducts[Math.floor(Math.random() * allProducts.length)];
      if (!product) continue;
      const existing = await prisma.cartItem.findUnique({
        where: { userId_productId: { userId: user.id, productId: product.id } },
      });
      if (!existing) {
        await prisma.cartItem.create({
          data: { userId: user.id, productId: product.id, quantity: Math.floor(Math.random() * 3) + 1 },
        });
        cartCount++;
      }
    }
  }
  console.log(`  ✔ Thêm ${cartCount} mục giỏ hàng`);

  // ─── 11. WISHLIST ITEMS ───
  const wishUsers = [c1, c2, c4, c5, c8].filter(Boolean);
  let wishCount = 0;
  for (const user of wishUsers) {
    const productCount = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < productCount; i++) {
      const product = extraProducts[Math.floor(Math.random() * extraProducts.length)];
      if (!product) continue;
      const existing = await prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId: user.id, productId: product.id } },
      });
      if (!existing) {
        await prisma.wishlistItem.create({
          data: { userId: user.id, productId: product.id },
        });
        wishCount++;
      }
    }
  }
  console.log(`  ✔ Thêm ${wishCount} mục yêu thích`);

  // ─── 12. RECOMMENDATIONS ───
  let recCount = 0;
  for (const user of [c1, c2, c3, c4, c5].filter(Boolean)) {
    // Lấy sản phẩm từ các đơn hàng của user
    const userOrders = await prisma.order.findMany({
      where: { userId: user.id },
      include: { orderItems: { take: 5 } },
    });
    const purchasedProductIds = new Set(
      userOrders.flatMap(o => o.orderItems.map(oi => oi.productId))
    );

    // Gợi ý sản phẩm từ cùng danh mục
    const recProducts = allProducts
      .filter(p => !purchasedProductIds.has(p.id) && p.isActive)
      .slice(0, 6);

    for (const rp of recProducts) {
      const existing = await prisma.recommendation.findFirst({
        where: { userId: user.id, productId: rp.id },
      });
      if (!existing) {
        await prisma.recommendation.create({
          data: {
            userId: user.id,
            productId: rp.id,
            score: Math.round((rp.rating * 10 + Math.random() * 10) * 10) / 10,
            reason: 'similar_product',
            isActive: true,
          },
        });
        recCount++;
      }
    }
  }
  console.log(`  ✔ Thêm ${recCount} gợi ý sản phẩm`);

  // ─── 13. NOTIFICATIONS ───
  const newOrderList = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });

  const notificationData = newOrderList.length > 0 ? [
    { type: 'ORDER', title: `Đơn hàng #${newOrderList[0].id.substring(0, 8)} đã được xác nhận`, message: 'Đơn hàng của bạn đang được chuẩn bị.', refId: newOrderList[0].id },
    { type: 'ORDER', title: `Đơn hàng #${newOrderList[1 % newOrderList.length].id.substring(0, 8)} đang giao`, message: 'Đơn hàng đang trên đường đến bạn.', refId: newOrderList[1 % newOrderList.length].id },
    { type: 'ORDER', title: `Đơn hàng #${newOrderList[2 % newOrderList.length].id.substring(0, 8)} giao thành công`, message: 'Cảm ơn bạn đã mua hàng! Đánh giá ngay.', refId: newOrderList[2 % newOrderList.length].id },
    { type: 'SYSTEM', title: 'Flash Sale sắp diễn ra!', message: 'Siêu sale cuối tuần giảm đến 50%. Chuẩn bị sẵn sàng!', refId: null },
    { type: 'SYSTEM', title: 'Mã giảm giá mới', message: 'Nhận ngay mã WELCOME10 giảm 10% cho đơn đầu tiên.', refId: null },
    { type: 'SYSTEM', title: 'Cập nhật ứng dụng', message: 'Phiên bản mới đã có, cập nhật để trải nghiệm tốt hơn.', refId: null },
    { type: 'SYSTEM', title: 'Chương trình VIP', message: 'Bạn đã đạt hạng VIP! Nhận ưu đãi độc quyền.', refId: null },
    { type: 'ORDER', title: `Yêu cầu hoàn trả #${newOrderList[0].id.substring(0, 8)} đã được xử lý`, message: 'Đơn hoàn trả đã được xử lý thành công.', refId: newOrderList[0].id },
  ] : [];

  let notifCount = 0;
  for (const n of notificationData) {
    const existing = await prisma.notification.findFirst({ where: { title: n.title } });
    if (!existing) {
      await prisma.notification.create({
        data: {
          type: n.type,
          title: n.title,
          message: n.message,
          referenceId: n.refId,
          isRead: false,
        },
      });
      notifCount++;
    }
  }
  console.log(`  ✔ Thêm ${notifCount} thông báo`);

  // ─── 14. SITE SETTINGS ───
  const settingsData = [
    { key: 'site_name', value: JSON.stringify('KhoaLuan E-Commerce') },
    { key: 'site_description', value: JSON.stringify('Nền tảng thương mại điện tử với phân cụm khách hàng thông minh') },
    { key: 'default_shipping_fee', value: JSON.stringify(30000) },
    { key: 'free_shipping_threshold', value: JSON.stringify(500000) },
    { key: 'max_cart_items', value: JSON.stringify(50) },
    { key: 'max_wishlist_items', value: JSON.stringify(100) },
    { key: 'default_page_size', value: JSON.stringify(20) },
    { key: 'enable_partner_registration', value: JSON.stringify(true) },
    { key: 'support_phone', value: JSON.stringify('1900-123-456') },
    { key: 'support_email', value: JSON.stringify('support@khoaluan.com') },
    { key: 'flash_sale_notification', value: JSON.stringify(true) },
    { key: 'recommendation_enabled', value: JSON.stringify(true) },
    { key: 'clustering_enabled', value: JSON.stringify(true) },
    { key: 'maintenance_mode', value: JSON.stringify(false) },
    { key: 'currency', value: JSON.stringify('VND') },
  ];

  let settingCount = 0;
  for (const s of settingsData) {
    const existing = await prisma.siteSetting.findUnique({ where: { key: s.key } });
    if (!existing) {
      await prisma.siteSetting.create({ data: s });
      settingCount++;
    }
  }
  console.log(`  ✔ Thêm ${settingCount} cài đặt hệ thống`);

  // ─── 15. THÊM FOLLOW SHOP ───
  const followPairs = [
    [c3, p1], [c4, p2], [c5, p1], [c6, p2], [c7, p1], [c8, p2], [c4, p1], [c5, p2],
    // Follow shop mới
    [c1, p4], [c2, p5], [c3, p6], [c4, p7], [c5, p8],
    [c6, p4], [c7, p5], [c8, p6], [c1, p7], [c3, p8],
  ];
  let followCount = 0;
  for (const [user, partner] of followPairs) {
    if (!user || !partner) continue;
    const existing = await prisma.followedShop.findUnique({
      where: { userId_partnerId: { userId: user.id, partnerId: partner.id } },
    });
    if (!existing) {
      await prisma.followedShop.create({ data: { userId: user.id, partnerId: partner.id } });
      followCount++;
    }
  }
  console.log(`  ✔ Thêm ${followCount} lượt theo dõi shop (tổng: ${await prisma.followedShop.count()})`);

  // ─── 16. THÊM ĐỊA CHỈ ───
  const extraAddresses = [
    { userId: c4?.id, label: 'Nhà', fullName: c4?.name || 'Phạm Thị D', phone: c4?.phone || '0945678901', street: '15 Nguyễn Văn Linh', ward: 'Phường An Khánh', district: 'Q. Ninh Kiều', city: 'Cần Thơ', isDefault: true },
    { userId: c5?.id, label: 'Nhà', fullName: c5?.name || 'Hoàng Văn E', phone: c5?.phone || '0956789012', street: '88 Trần Phú', ward: 'Phường Xương Huân', district: 'TP. Nha Trang', city: 'Khánh Hòa', isDefault: true },
    { userId: c6?.id, label: 'Cơ quan', fullName: c6?.name || 'Đỗ Thị F', phone: c6?.phone || '0967890123', street: '25 Nguyễn Huệ', ward: 'Phường Phú Nhuận', district: 'TP. Huế', city: 'Thừa Thiên Huế', isDefault: true },
    { userId: c7?.id, label: 'Nhà', fullName: c7?.name || 'Vũ Văn G', phone: c7?.phone || '0978901234', street: '333 Nguyễn Tất Thành', ward: 'Phường Tự An', district: 'TP. Buôn Ma Thuột', city: 'Đắk Lắk', isDefault: true },
    { userId: c8?.id, label: 'Nhà', fullName: c8?.name || 'Đặng Thị H', phone: c8?.phone || '0989012345', street: '77 Nguyễn Du', ward: 'Phường Hà Huy Tập', district: 'TP. Vinh', city: 'Nghệ An', isDefault: true },
  ];

  let addrCount = 0;
  for (const a of extraAddresses) {
    if (!a.userId) continue;
    const existing = await prisma.address.findFirst({
      where: { userId: a.userId, street: a.street },
    });
    if (!existing) {
      await prisma.address.create({ data: a });
      addrCount++;
    }
  }
  console.log(`  ✔ Thêm ${addrCount} địa chỉ mới (tổng: ${await prisma.address.count()})`);

  // ─── 17. THÊM COUPON ───
  const newCoupons = [
    { code: 'SUMMER20', type: 'PERCENTAGE', value: 20, minOrderValue: 300000, maxDiscount: 100000, usageLimit: 100, perUserLimit: 1, description: 'Giảm 20% (tối đa 100K) cho đơn từ 300K. Mùa hè ưu đãi!', createdById: admin.id },
    { code: 'MEGA500K', type: 'FIXED', value: 500000, minOrderValue: 5000000, usageLimit: 20, perUserLimit: 1, description: 'Giảm 500K cho đơn hàng từ 5 triệu. Siêu ưu đãi!', createdById: admin.id },
    { code: 'SPORT10', type: 'PERCENTAGE', value: 10, minOrderValue: 200000, maxDiscount: 80000, usageLimit: 50, perUserLimit: 2, description: 'Giảm 10% (tối đa 80K) cho đồ thể thao.', createdById: admin.id },
    { code: 'BEAUTY15', type: 'PERCENTAGE', value: 15, minOrderValue: 500000, maxDiscount: 150000, usageLimit: 50, perUserLimit: 1, description: 'Giảm 15% (tối đa 150K) cho mỹ phẩm.', createdById: admin.id },
    { code: 'PETCARE', type: 'FIXED', value: 50000, minOrderValue: 300000, usageLimit: 30, perUserLimit: 2, description: 'Giảm 50K cho đơn hàng đồ thú cưng từ 300K.', createdById: admin.id },
    { code: 'FURNI200K', type: 'FIXED', value: 200000, minOrderValue: 2000000, usageLimit: 20, perUserLimit: 1, description: 'Giảm 200K cho đơn nội thất từ 2 triệu.', createdById: admin.id },
    { code: 'ABC50K', type: 'FIXED', value: 50000, minOrderValue: 0, usageLimit: 100, perUserLimit: 3, description: 'Giảm 50K cho tất cả đơn hàng tại Shop Điện Tử ABC.', createdById: p1?.id || admin.id },
    { code: 'FASHION50K', type: 'FIXED', value: 50000, minOrderValue: 500000, usageLimit: 30, perUserLimit: 1, description: 'Giảm 50K cho đơn từ 500K tại Fashion House.', createdById: p2?.id || admin.id },
    // Coupon cho partner mới
    { code: 'SPORTS20K', type: 'FIXED', value: 20000, minOrderValue: 200000, usageLimit: 50, perUserLimit: 2, description: 'Giảm 20K cho đơn từ 200K tại Sports Zone Việt Nam.', createdById: p4?.id || admin.id },
    { code: 'BEAUTY10', type: 'PERCENTAGE', value: 10, minOrderValue: 300000, maxDiscount: 100000, usageLimit: 50, perUserLimit: 1, description: 'Giảm 10% (tối đa 100K) tại Beauty House.', createdById: p5?.id || admin.id },
    { code: 'PET30K', type: 'FIXED', value: 30000, minOrderValue: 150000, usageLimit: 80, perUserLimit: 2, description: 'Giảm 30K cho đơn từ 150K tại Pet Mart Việt Nam.', createdById: p6?.id || admin.id },
    { code: 'FURNI100K', type: 'FIXED', value: 100000, minOrderValue: 1000000, usageLimit: 20, perUserLimit: 1, description: 'Giảm 100K cho đơn từ 1 triệu tại Nội Thất Xinh.', createdById: p7?.id || admin.id },
    { code: 'MEBE50K', type: 'FIXED', value: 50000, minOrderValue: 500000, usageLimit: 40, perUserLimit: 2, description: 'Giảm 50K cho đơn từ 500K tại Mẹ & Bé Shop.', createdById: p8?.id || admin.id },
  ];

  let couponCount = 0;
  const now = new Date();
  const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  for (const c of newCoupons) {
    const existing = await prisma.coupon.findUnique({ where: { code: c.code } });
    if (!existing) {
      await prisma.coupon.create({
        data: {
          ...c,
          startsAt: now,
          expiresAt: futureDate,
          isActive: true,
        },
      });
      couponCount++;
    }
  }
  console.log(`  ✔ Thêm ${couponCount} mã giảm giá mới (tổng: ${await prisma.coupon.count()})`);

  // ─── 18. CẬP NHẬT THỐNG KÊ CHO USER ───
  const allOrderStats = await prisma.order.findMany({
    where: { paymentStatus: 'PAID' },
    select: { userId: true, finalAmount: true },
  });
  const spentMap = {};
  const orderCountMap = {};
  for (const o of allOrderStats) {
    spentMap[o.userId] = (spentMap[o.userId] || 0) + o.finalAmount;
    orderCountMap[o.userId] = (orderCountMap[o.userId] || 0) + 1;
  }
  for (const [userId, total] of Object.entries(spentMap)) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalSpent: Math.round(total),
        orderCount: orderCountMap[userId],
        lastPurchaseAt: new Date(),
      },
    });
  }
  console.log('  ✔ Cập nhật thống kê người dùng');

  // ─── KẾT THÚC ───
  console.log('\n' + '='.repeat(55));
  console.log('✅ Seed mở rộng hoàn tất!');
  console.log('='.repeat(55));
  console.log(`\n📊 Tổng kết dữ liệu:`);
  console.log(`   👤 Users: ${await prisma.user.count()} (khách hàng: ${await prisma.user.count({ where: { role: 'CUSTOMER' } })})`);
  console.log(`   📁 Danh mục: ${await prisma.category.count()}`);
  console.log(`   📦 Sản phẩm: ${await prisma.product.count()}`);
  console.log(`   📋 Đơn hàng: ${await prisma.order.count()}`);
  console.log(`   ⭐ Đánh giá: ${await prisma.review.count()}`);
  console.log(`   🛒 Giỏ hàng: ${await prisma.cartItem.count()}`);
  console.log(`   ❤️  Yêu thích: ${await prisma.wishlistItem.count()}`);
  console.log(`   🏷️  Mã giảm giá: ${await prisma.coupon.count()}`);
  console.log(`   🔖 Biến thể SP: ${await prisma.productVariant.count()}`);
  console.log(`   📌 Gợi ý SP: ${await prisma.recommendation.count()}`);
  console.log(`   🔔 Thông báo: ${await prisma.notification.count()}`);
  console.log(`   ⚙️  Cài đặt: ${await prisma.siteSetting.count()}`);
  console.log(`   📍 Địa chỉ: ${await prisma.address.count()}`);
  console.log(`   🏪 Theo dõi: ${await prisma.followedShop.count()}`);
  console.log(`   💬 Hội thoại: ${await prisma.conversation.count()}`);
  console.log(`   📊 Cluster: ${await prisma.cluster.count()}`);
  console.log('='.repeat(55) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed thất bại:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
