/**
 * ML Service Client
 * Proxies requests to the Python ML microservice (FastAPI)
 * Provides fallback logic when ML service is unavailable
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 60000; // 60s timeout (CF train + Evaluate cần >10s)

const logger = require('../config/logger');

/**
 * Generic request to ML service with timeout and error handling
 */
async function callML(endpoint, method = 'GET', body = null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const options = {
      method,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${ML_SERVICE_URL}${endpoint}`, options);
    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.warn(`ML Service timeout: ${endpoint}`);
    } else {
      logger.warn(`ML Service error: ${endpoint} - ${error.message}`);
    }
    return { success: false, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check if ML service is healthy
 */
async function checkHealth() {
  const result = await callML('/health');
  return result?.status === 'ok';
}

/**
 * Get ML service info (available models, versions)
 */
async function getServiceInfo() {
  return callML('/info');
}

/**
 * Get collaborative filtering recommendations for a user
 * @param {Array} orders - [{user_id, product_id, quantity}]
 * @param {Array} products - [{id, name}]
 * @param {string} userId - Target user
 * @param {number} topN - Number of recommendations
 */
async function getCFRecommendations(orders, products, userId, topN = 10) {
  if (!orders.length || !products.length) return [];

  const result = await callML('/cf/recommend', 'POST', {
    user_id: userId,
    orders: orders.map(o => ({
      user_id: o.user_id,
      product_id: o.product_id,
      quantity: o.quantity || 1,
    })),
    products: products.map(p => ({ id: p.id, name: p.name || '' })),
    top_n: topN,
    strategy: 'hybrid',
  });

  if (result.success) {
    return result.data?.recommendations || [];
  }
  return [];
}

/**
 * Get similar products using Item-Item CF
 * @param {string} productId - Target product
 * @param {Array} orders - [{user_id, product_id, quantity}]
 * @param {Array} products - [{id, name}]
 * @param {number} topN - Number of similar products
 */
async function getSimilarProductsML(productId, orders, products, topN = 8) {
  if (!orders.length || !products.length) return [];

  const result = await callML('/cf/similar', 'POST', {
    product_id: productId,
    orders: orders.map(o => ({
      user_id: o.user_id,
      product_id: o.product_id,
      quantity: o.quantity || 1,
    })),
    products: products.map(p => ({ id: p.id, name: p.name || '' })),
    top_n: topN,
  });

  if (result.success) {
    return result.data?.similar_products || [];
  }
  return [];
}

/**
 * Get cluster profiles from ML service
 */
async function getClusterProfiles() {
  const result = await callML('/cluster/profiles');
  if (result.success) return result.data || [];
  return [];
}

/**
 * Get cluster stats from ML service
 */
async function getClusterStats() {
  const result = await callML('/cluster/stats');
  if (result.success) return result.data || [];
  return [];
}

/**
 * Run clustering on the ML service
 */
async function runClustering(orders) {
  const result = await callML('/cluster/run', 'POST', {
    orders: orders.map(o => ({
      user_id: o.user_id,
      total_amount: o.total_amount,
      created_at: o.created_at,
    })),
    n_clusters: 4,
  });
  return result;
}

module.exports = {
  checkHealth,
  getServiceInfo,
  getCFRecommendations,
  getSimilarProductsML,
  getClusterProfiles,
  getClusterStats,
  runClustering,
  callML,
};
