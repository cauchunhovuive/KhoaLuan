/**
 * Session-based Recommender client — Delianidi et al. 2023 (HSP & RIC)
 *
 * - Track các sản phẩm khách đã xem TRONG PHIÊN hiện tại (sessionStorage,
 *   tự hết hạn khi đóng tab — đúng nghĩa "phiên truy cập").
 * - Khách vãng lai (không đăng nhập) vẫn track được qua phiên trình duyệt.
 * - Gọi POST /api/ml/session/recommend với danh sách item đã xem,
 *   chọn strategy: 'hsp' | 'ric' | 'ric_cil' (mặc định hsp).
 *
 * API trả về sản phẩm + hsp_level (P0/P1/P2) + probability/score + reason
 * để UI hiển thị đúng cơ chế phân cấp của bài báo.
 */

import api from './api';

const SESSION_KEY = 'shop_session_viewed_products';
const GUEST_ID_KEY = 'shop_guest_id';
const MAX_SESSION_ITEMS = 50; // khớp SessionConfig.max_session_items

/**
 * ID định danh trình duyệt cho khách vãng lai (không đăng nhập).
 * — Lưu localStorage (khác sessionStorage): sống sót qua F5, giữ ổn định
 *   khi model chia phiên theo gap 30 phút trên server.
 * — Mỗi trình duyệt 1 ID riêng: nếu dùng chung 'anonymous' cho tất cả,
 *   thuật toán sẽ trộn hành vi của mọi khách vãng lai thành 1 "người" → P1/P2 học sai.
 * @returns {string}
 */
export function getGuestId() {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = `guest_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    // localStorage không khả dụng — ID phiên tạm, tốt hơn là gộp chung 'anonymous'
    return `guest_temp_${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Lấy danh sách sản phẩm đã xem trong phiên hiện tại (theo thứ tự thời gian).
 * @returns {string[]} product ids
 */
export function getSessionItems() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Ghi nhận 1 lượt xem sản phẩm vào phiên hiện tại (dedup liên tiếp,
 * giữ thứ tự thời gian, giới hạn độ dài phiên).
 * @param {string} productId
 */
export function trackProductView(productId) {
  if (!productId) return;
  try {
    const items = getSessionItems();
    // Vẫn lưu nếu xem lại item KHÁC item liền trước (chuỗi hành vi thật),
    // nhưng bỏ qua nếu lặp liên tiếp (double-render / re-fetch).
    if (items[items.length - 1] === productId) return;
    items.push(productId);
    while (items.length > MAX_SESSION_ITEMS) items.shift();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(items));
  } catch {
    // sessionStorage không khả dụng (private mode...) — bỏ qua
  }
}

/**
 * Gợi ý sản phẩm kế tiếp dựa trên phiên hiện tại.
 * @param {Object} opts
 * @param {string} [opts.strategy='hsp']  'hsp' | 'ric' | 'ric_cil'
 * @param {number} [opts.topN=8]
 * @param {number|null} [opts.alpha=null]  forgetting factor cho RIC (0.1–0.9)
 * @param {string[]} [opts.sessionItems]   override danh sách item phiên
 * @returns {Promise<{strategy: string, recommendations: Array}>}
 */
export async function fetchSessionRecommendations({
  strategy = 'hsp',
  topN = 8,
  alpha = null,
  sessionItems = null,
} = {}) {
  const items = sessionItems || getSessionItems();

  // Chưa xem gì trong phiên → API vẫn trả cold-start theo P0 (t=1)
  const { data } = await api.post('/ml/session/recommend', {
    sessionItems: items,
    topN,
    strategy,
    ...(alpha != null ? { alpha } : {}),
  });

  return {
    strategy: data?.meta?.strategy || strategy,
    recommendations: data?.data || [],
  };
}
