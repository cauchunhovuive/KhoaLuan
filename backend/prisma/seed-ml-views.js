require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================
// CẤU HÌNH
//    node prisma/seed-ml-views.js            → 300 phiên (~2000 views)
//    node prisma/seed-ml-views.js 600        → 600 phiên
//    node prisma/seed-ml-views.js 300 --keep → giữ views cũ, chỉ thêm
// ============================================================
const args = process.argv.slice(2);
const TARGET_SESSIONS = Math.max(50, parseInt(args[0]) || 300);
const KEEP_OLD = args.includes('--keep');

// Nhóm ngành hàng: [tên nhóm, [keywords tìm sản phẩm, ưu tiên theo thứ tự]]
const GROUPS = [
  ['Điện thoại & phụ kiện', ['iPhone 15', 'iPhone 14', 'Samsung Galaxy', 'Ốp lưng iPhone', 'Ốp lưng Galaxy', 'Củ sạc', 'Pin sạc dự phòng', 'Cáp sạc', 'AirPods', 'Tai nghe', 'Xiaomi', 'OPPO']],
  ['Laptop & phụ kiện', ['MacBook Pro', 'MacBook Air', 'Dell', 'Lenovo', 'Surface', 'iPad', 'Chuột', 'Bàn phím cơ', 'Bàn phím', 'Webcam', 'Màn hình', 'Logitech', 'Keychron']],
  ['Thời trang nam', ['Áo sơ mi', 'Quần tây', 'Áo thun', 'Áo khoác jean', 'Giày thể thao nam', 'Đồng hồ nam', 'Áo khoác']],
  ['Thời trang nữ', ['Đầm', 'Váy hoa', 'Túi xách', 'Balo thời trang', 'Giày cao gót', 'Áo khoác']],
  ['Đồ gia dụng & nhà bếp', ['Nồi chiên không dầu', 'Bộ nồi', 'Máy ép chậm', 'Bộ dao', 'Máy pha cà phê', 'Robot hút bụi', 'Máy lọc không khí', 'Bếp từ']],
  ['Sách & văn phòng phẩm', ['Nhà giả kim', 'Atomic Habits', 'Đắc nhân tâm', 'Tư duy nhanh', 'Sổ tay', 'Sổ planner', 'Bút máy']],
  ['Mỹ phẩm & chăm sóc da', ['Kem chống nắng', 'Serum Vitamin', 'Sữa rửa mặt', 'Kem dưỡng', 'Mặt nạ', 'Nước tẩy trang', 'Son môi', 'Phấn phủ', 'Nước hoa']],
  ['Thể thao & du lịch', ['Giày chạy bộ', 'Bộ tạ', 'Thảm tập', 'Bộ đồ tập', 'Bình nước', 'Dây nhảy', 'Máy massage', 'Balo du lịch', 'Xe đạp', 'Vợt tennis']],
  ['Đồ chơi thú cưng', ['Thức ăn cho chó', 'Bát ăn chậm', 'Vòng cổ', 'Đồ chơi cho chó', 'Dầu tắm', 'Cát vệ sinh', 'Balo vận chuyển']],
  ['Nội thất & trang trí', ['Bàn làm việc', 'Ghế công thái học', 'Đèn bàn', 'Kệ sách', 'Tranh treo', 'Thảm trải', 'Bộ sofa', 'Giường ngủ', 'Tủ quần áo']],
  ['Mẹ & bé', ['Máy hâm sữa', 'Bình sữa', 'Máy tiệt trùng', 'Địu em bé', 'Xe đẩy', 'Ghế ăn dặm', 'Sách vải', 'Đồ chơi lắp ráp']],
];

// Chuỗi "hành vi" chuẩn trong 1 phiên: xem xa nhất → gần nhất
// (thiết kế để HSP học được quan hệ Next, RIC học co-occurrence)
const PATH_TEMPLATES = [
  // Điện thoại: xem máy → xem ốp → xem sạc → tai nghe
  { group: 0, seq: [0, 3, 5, 9] },
  { group: 0, seq: [1, 4, 6, 9] },
  { group: 0, seq: [2, 4, 7, 10] },
  { group: 0, seq: [0, 3, 8, 9] },
  // Laptop: máy → chuột → bàn phím → webcam
  { group: 1, seq: [0, 6, 7, 10] },
  { group: 1, seq: [1, 6, 8, 11] },
  { group: 1, seq: [3, 9, 6, 12] },
  { group: 1, seq: [2, 9, 10, 6] },
  // Thời trang
  { group: 2, seq: [0, 1, 5, 6] },
  { group: 3, seq: [0, 2, 3, 4] },
  { group: 2, seq: [2, 3, 6, 5] },
  { group: 3, seq: [1, 3, 2, 4] },
  // Gia dụng
  { group: 4, seq: [0, 3, 4, 6] },
  { group: 4, seq: [2, 4, 1, 7] },
  { group: 4, seq: [5, 6, 0, 3] },
  // Sách
  { group: 5, seq: [0, 3, 4, 6] },
  { group: 5, seq: [1, 2, 5, 4] },
  { group: 5, seq: [0, 1, 4, 5] },
  // Mỹ phẩm
  { group: 6, seq: [2, 4, 5, 3] },
  { group: 6, seq: [0, 1, 3, 4] },
  { group: 6, seq: [6, 7, 4, 8] },
  // Thể thao
  { group: 7, seq: [0, 2, 4, 6] },
  { group: 7, seq: [1, 3, 4, 5] },
  { group: 7, seq: [7, 4, 2, 5] },
  // Thú cưng
  { group: 8, seq: [0, 1, 3, 4] },
  { group: 8, seq: [5, 6, 3, 2] },
  // Nội thất
  { group: 9, seq: [0, 1, 2, 4] },
  { group: 9, seq: [7, 8, 5, 2] },
  // Mẹ & bé
  { group: 10, seq: [0, 1, 2, 6] },
  { group: 10, seq: [4, 5, 7, 6] },
];

// Xáo trộn nhẹ nhưng giữ xác suất cao
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

async function main() {
  console.log('🌱 Seed ProductView cho Session-based ML...\n');
  console.log(`   Mục tiêu: ${TARGET_SESSIONS} phiên ${KEEP_OLD ? '(giữ views cũ)' : '(xoá views cũ)'}\n`);

  const customers = await prisma.user.findMany({ where: { role: 'CUSTOMER' } });
  const products = await prisma.product.findMany({ where: { isActive: true } });

  console.log(`   ✔ Customers: ${customers.length}, Products: ${products.length}`);
  if (customers.length < 3 || products.length < 20) {
    console.error('❌ Cần ít nhất 3 customers và 20 products. Chạy seed.js + seed-full.js trước.');
    return;
  }

  if (!KEEP_OLD) {
    const existing = await prisma.productView.count();
    if (existing > 0) {
      console.log(`   🗑️ Xoá ${existing} views cũ...`);
      await prisma.productView.deleteMany();
    }
  }

  // Map: keyword → products (mỗi keyword lấy tối đa 3 sp để đa dạng)
  const groupProducts = GROUPS.map(([, keywords]) => {
    const byKeyword = keywords.map(k => {
      const kl = k.toLowerCase();
      return products.filter(p => p.name.toLowerCase().includes(kl)).slice(0, 3);
    });
    return byKeyword; // byKeyword[i] = products cho keyword i
  });

  // Tạo phiên: 90% theo template hành vi, 10% nhiễu ngẫu nhiên
  const views = [];
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  // lastSessionEnd[userId] — đảm bảo 2 phiên cùng user cách nhau > 30 phút (timeout rule)
  const lastEnd = {};

  for (let s = 0; s < TARGET_SESSIONS; s++) {
    const isNoise = Math.random() < 0.1;
    let sessionProducts = [];

    if (isNoise) {
      // Phiên nhiễu: 3-5 sản phẩm ngẫu nhiên toàn shop
      sessionProducts = shuffle([...products]).slice(0, 3 + rand(3));
    } else {
      const tpl = pick(PATH_TEMPLATES);
      const kwProducts = groupProducts[tpl.group];
      const used = new Set();
      for (const idx of tpl.seq) {
        const candidates = (kwProducts[idx] || []).filter(p => !used.has(p.id));
        if (candidates.length) {
          const p = pick(candidates);
          used.add(p.id);
          sessionProducts.push(p);
        }
      }
      // Thiếu sản phẩm template (keyword không khớp DB) → bổ sung từ cùng nhóm
      if (sessionProducts.length < 3) {
        const extra = shuffle(kwProducts.flat()).filter(p => !used.has(p.id));
        sessionProducts.push(...extra.slice(0, 5 - sessionProducts.length));
      }
    }

    if (sessionProducts.length < 2) continue;

    // Chọn user + thời gian bắt đầu (trong 14 ngày qua), tránh đụng phiên cũ của user
    const user = pick(customers);
    let base = now - rand(14) * DAY - rand(10) * 60 * 60 * 1000;
    if (lastEnd[user.id] && base < lastEnd[user.id] + 45 * 60 * 1000 && base > lastEnd[user.id] - DAY) {
      base = lastEnd[user.id] + 2 * 60 * 60 * 1000; // dời ra sau 2 giờ
    }

    let t = base;
    for (const p of sessionProducts) {
      views.push({
        userId: user.id,
        productId: p.id,
        createdAt: new Date(t),
      });
      t += (2 + rand(4)) * 60 * 1000; // 2-5 phút giữa các lượt xem
    }
    lastEnd[user.id] = t;
  }

  // Chèn theo lô để nhanh
  console.log(`\n📊 Chèn ${views.length} views...`);
  const BATCH = 500;
  for (let i = 0; i < views.length; i += BATCH) {
    await prisma.productView.createMany({ data: views.slice(i, i + BATCH), skipDuplicates: false });
  }

  const total = await prisma.productView.count();
  console.log('\n' + '='.repeat(55));
  console.log('✅ Seed ProductView hoàn tất!');
  console.log(`   👁️  Tổng views trong DB: ${total}`);
  console.log(`   🎬 Phiên vừa tạo: ~${TARGET_SESSIONS} (90% theo mẫu hành vi, 10% nhiễu)`);
  console.log('='.repeat(55));
  console.log('\n➜ Bước tiếp theo:');
  console.log('   1. Vào /admin/recommendations → bấm "Huấn luyện Session"');
  console.log('   2. Hoặc vào /admin/paper-demo → chọn sản phẩm thật → "Chạy gợi ý"');
  console.log('      (model tự train từ view logs mới)\n');
}

main()
  .catch((e) => { console.error('❌ Seed thất bại:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
