/**
 * seed-images.js — Category-specific Unsplash image mapping
 * 
 * Mỗi danh mục có 2-3 ảnh Unsplash verified (HTTP 200 confirmed).
 * Dùng hash từ slug sản phẩm để chọn ảnh nhất quán.
 */

// Các ID ảnh Unsplash đã verify (HTTP 200)
// Format: https://images.unsplash.com/photo-{ID}?w=400&h=400&fit=crop
const CATEGORY_IMAGES = {
  'dien-thoai-phu-kien': [
    '1511707171634-5f897ff02aa9',  // 📱 Smartphone (chính)
    '1496181133206-80ce9b88a853',  // 💻 Laptop (đồ công nghệ)
    '1571019613454-1cb2f99b2d8b',  // 🏋️ Sports (phụ kiện)
  ],
  'laptop-may-tinh-bang': [
    '1496181133206-80ce9b88a853',  // 💻 Laptop (chính)
    '1511707171634-5f897ff02aa9',  // 📱 Smartphone (công nghệ)
    '1445205170230-053b83016050',  // 👗 Fashion (lifestyle)
  ],
  'thoi-trang': [
    '1445205170230-053b83016050',  // 👗 Fashion (chính)
    '1495446815901-a7297e633e8d',  // 📚 Books (lifestyle)
    '1596462502278-27bfdc403348',  // 🧴 Skincare (làm đẹp)
  ],
  'do-gia-dung': [
    '1556228453-efd6c1ff04f6',    // 🍳 Kitchen (chính)
    '1555041469-a586c61ea9bc',    // 🛋️ Furniture (nội thất)
    '1583511655857-d19b40a7a54e',  // 🐕 Pet (gia đình)
  ],
  'sach-van-phong-pham': [
    '1495446815901-a7297e633e8d',  // 📚 Books (chính)
    '1445205170230-053b83016050',  // 👗 Fashion (lifestyle)
    '1511707171634-5f897ff02aa9',  // 📱 Smartphone (văn phòng)
  ],
  'my-pham-cham-soc-da': [
    '1596462502278-27bfdc403348',  // 🧴 Skincare (chính)
    '1515488042361-ee00e0ddd4e4',  // 👶 Baby (dịu nhẹ)
    '1445205170230-053b83016050',  // 👗 Fashion (làm đẹp)
  ],
  'the-thao-du-lich': [
    '1571019613454-1cb2f99b2d8b',  // 🏋️ Sports (chính)
    '1511707171634-5f897ff02aa9',  // 📱 Smartphone (công nghệ)
    '1556228453-efd6c1ff04f6',    // 🍳 Kitchen (du lịch)
  ],
  'thu-cung': [
    '1583511655857-d19b40a7a54e',  // 🐕 Dog (chính)
    '1555041469-a586c61ea9bc',    // 🛋️ Furniture (nhà cửa)
    '1495446815901-a7297e633e8d',  // 📚 Books (thư giãn)
  ],
  'noi-that-trang-tri': [
    '1555041469-a586c61ea9bc',    // 🛋️ Sofa (chính)
    '1556228453-efd6c1ff04f6',    // 🍳 Kitchen (nhà bếp)
    '1583511655857-d19b40a7a54e',  // 🐕 Pet (gia đình)
  ],
  'me-va-be': [
    '1515488042361-ee00e0ddd4e4',  // 👶 Baby (chính)
    '1596462502278-27bfdc403348',  // 🧴 Skincare (chăm sóc)
    '1495446815901-a7297e633e8d',  // 📚 Books (giáo dục)
  ],
};

// Fallback images cho danh mục không xác định
const FALLBACK_IMAGES = [
  '1496181133206-80ce9b88a853',
  '1445205170230-053b83016050',
  '1495446815901-a7297e633e8d',
];

/**
 * Lấy 1 ảnh Unsplash phù hợp với danh mục sản phẩm
 * @param {string} productSlug — slug của sản phẩm
 * @param {string} categorySlug — slug của danh mục
 * @returns {string} — URL ảnh Unsplash
 */
function getProductImage(productSlug, categorySlug) {
  const images = CATEGORY_IMAGES[categorySlug] || FALLBACK_IMAGES;
  const hash = productSlug.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const idx = Math.abs(hash) % images.length;
  return `https://images.unsplash.com/photo-${images[idx]}?w=400&h=400&fit=crop`;
}

/**
 * Lấy nhiều ảnh cho 1 sản phẩm (dùng hash khác nhau)
 * @param {string} productSlug
 * @param {string} categorySlug
 * @param {number} count — số lượng ảnh (mặc định 1)
 * @returns {string[]} — mảng URL ảnh
 */
function getProductImages(productSlug, categorySlug, count = 1) {
  const images = CATEGORY_IMAGES[categorySlug] || FALLBACK_IMAGES;
  const result = [];
  const baseHash = productSlug.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let i = 0; i < count; i++) {
    const idx = Math.abs(baseHash + i * 31) % images.length;
    result.push(`https://images.unsplash.com/photo-${images[idx]}?w=400&h=400&fit=crop`);
  }
  return result;
}

module.exports = { getProductImage, getProductImages, CATEGORY_IMAGES };
