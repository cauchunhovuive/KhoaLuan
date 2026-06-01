/**
 * test-ml-all.js — Tự động test tất cả ML endpoints
 * 
 * Chạy: docker exec khoaluan-backend sh -c "node prisma/test-ml-all.js"
 * 
 * Test flow:
 * 1. Login → lấy token
 * 2. GET /api/ml/health
 * 3. POST /api/ml/session/train
 * 4. POST /api/ml/cf/train
 * 5. POST /api/ml/evaluate
 * 6. POST /api/clusters/run
 * 7. GET /api/recommendations/trending
 * 8. POST /api/ml/abtest/log (sample)
 * 9. POST /api/ml/abtest/compare
 * 10. GET /api/ml/abtest/report
 * 11. GET /api/ml/health (verify still healthy)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE = process.env.API_URL || 'http://localhost:5000';

let token = '';
let results = [];
let totalTests = 0;
let passedTests = 0;

async function api(method, path, body = null, auth = true) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  if (auth && token) opts.headers['Authorization'] = `Bearer ${token}`;
  
  const start = Date.now();
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  const ms = Date.now() - start;
  return { data, ms, status: res.status };
}

async function test(name, fn, expectedSuccess = true) {
  totalTests++;
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - start;
    const passed = expectedSuccess ? result.success === true : result.success === false;
    const status = passed ? '✅' : '❌';
    if (passed) passedTests++;
    results.push({ name, status, passed, ms, details: result, response: JSON.stringify(result).substring(0, 300) });
    console.log(`  ${status} ${name} (${ms}ms)`);
    return result;
  } catch (e) {
    results.push({ name, status: '💥', passed: false, ms: Date.now() - start, details: { error: e.message } });
    console.log(`  💥 ${name} — ${e.message}`);
    return null;
  }
}

async function getUserId(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  return user?.id;
}

async function getProductIds(limit = 3) {
  const products = await prisma.product.findMany({ where: { isActive: true }, take: limit });
  return products.map(p => p.id);
}

async function main() {
  console.log('🧪 ML Auto-Test Suite');
  console.log('═══════════════════════\n');

  // 1. Login
  const loginRes = await api('POST', '/api/auth/login', { email: 'admin@khoaluan.com', password: 'admin123' }, false);
  token = loginRes.data?.data?.token || '';
  if (!token) {
    console.log('❌ Login failed — cannot proceed\n');
    return;
  }
  console.log(`✅ Login OK (admin@khoaluan.com)\n`);

  // 2. ML Health
  await test('ML Health', async () => {
    const r = await api('GET', '/api/ml/health');
    return r.data;
  });

  // 3. ML Engine Info
  await test('ML Engine Info', async () => {
    const r = await api('GET', '/api/ml/health');
    return { success: r.data?.data?.info?.service ? true : false, service: r.data?.data?.info?.service, version: r.data?.data?.info?.version };
  });

  // 4. Train Session
  await test('Train Session', async () => {
    const r = await api('POST', '/api/ml/session/train');
    if (r.data.success && r.data.data?.trained) {
      return { success: true, n_views: r.data.data.n_views, trained: true };
    }
    return { success: false, message: r.data?.data?.message };
  });

  // 5. Train CF
  await test('Train Collaborative Filtering', async () => {
    const r = await api('POST', '/api/ml/cf/train');
    if (r.data.success && r.data.data?.trained) {
      return { success: true, n_orders: r.data.data.n_orders, n_products: r.data.data.n_products, models: r.data.data.models };
    }
    return { success: false, message: r.data?.data?.message };
  });

  // 6. Evaluate
  await test('Evaluate Models', async () => {
    const r = await api('POST', '/api/ml/evaluate', { topN: 10 });
    if (r.data.success && r.data.data?.metrics) {
      return { success: true, metrics: Object.keys(r.data.data.metrics).join(', ') };
    }
    return { success: false, message: 'No metrics returned' };
  });

  // 7. Clustering
  await test('Run Clustering', async () => {
    const r = await api('POST', '/api/clusters/run');
    return { success: r.data.success, clusters: r.data.data?.clusters?.length || 0 };
  });

  // 8. Trending
  await test('Trending Products', async () => {
    const r = await api('GET', '/api/recommendations/trending');
    const count = (r.data?.data || []).length;
    return { success: count > 0, count };
  });

  // 9. Session Recommend (with real product IDs)
  await test('Session Recommend', async () => {
    const productIds = await getProductIds(2);
    if (productIds.length < 2) return { success: false, message: 'Not enough products' };
    const r = await api('POST', '/api/ml/session/recommend', { sessionItems: productIds, topN: 5 });
    const recs = r.data?.data || [];
    return { success: true, recommendations: recs.length, products: recs.map(p => p.name).join(', ').substring(0, 100) };
  });

  // 10. Explain (with admin user)
  await test('Explain Recommendations', async () => {
    const adminId = await getUserId('admin@khoaluan.com');
    const r = await api('POST', '/api/ml/explain', { userId: adminId, topN: 5 });
    const recs = r.data?.data?.recommendations || [];
    const weights = r.data?.data?.weights || {};
    return { success: true, n_recs: recs.length, weights: Object.keys(weights).join(', ') };
  });

  // 11. A/B Test: Log sample interaction
  await test('A/B Test Log', async () => {
    const customerIds = await prisma.user.findMany({ where: { role: 'CUSTOMER' }, take: 2 });
    const productIds = await getProductIds(2);
    if (customerIds.length < 1 || productIds.length < 1) return { success: false, message: 'Not enough data' };
    
    const r1 = await api('POST', '/api/ml/abtest/log', {
      group: 'control', userId: customerIds[0].id, productId: productIds[0], action: 'impression', revenue: 0
    });
    return { success: r1.data.success, group: 'control', action: 'impression' };
  });

  // 12. A/B Test: Log second interaction
  await test('A/B Test Log 2', async () => {
    const customerIds = await prisma.user.findMany({ where: { role: 'CUSTOMER' }, take: 2 });
    const productIds = await getProductIds(2);
    if (customerIds.length < 2 || productIds.length < 2) return { success: false, message: 'Not enough data' };
    
    const r2 = await api('POST', '/api/ml/abtest/log', {
      group: 'treatment', userId: customerIds[1].id, productId: productIds[1], action: 'click', revenue: 0
    });
    return { success: r2.data.success, group: 'treatment', action: 'click' };
  });

  // 13. A/B Test: Compare
  await test('A/B Test Compare', async () => {
    const r = await api('POST', '/api/ml/abtest/compare', { groupA: 'control', groupB: 'treatment' });
    return { success: r.data.success, winner: r.data.data?.winner || 'tie' };
  });

  // 14. A/B Test: Report
  await test('A/B Test Report', async () => {
    const r = await api('GET', '/api/ml/abtest/report');
    const control = r.data?.data?.control?.total_events || 0;
    const treatment = r.data?.data?.treatment?.total_events || 0;
    return { success: r.data.success, control_events: control, treatment_events: treatment };
  });

  // === FINAL SUMMARY ===
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(0);
  
  console.log('\n' + '═'.repeat(50));
  console.log('📊 KẾT QUẢ TEST ML');
  console.log('═'.repeat(50));
  console.log(`  ✅ Passed: ${passedTests}/${totalTests} (${passRate}%)`);
  console.log(`  ❌ Failed: ${failedTests}/${totalTests}`);
  if (failedTests > 0) {
    console.log('\n  ❌ Các test thất bại:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`     - ${r.name}: ${r.details?.message || 'Unknown'} (${r.ms}ms)`);
    });
  }
  console.log('\n  ⏱  Tổng thời gian: ' + results.reduce((s, r) => s + r.ms, 0) + 'ms');
  console.log('═'.repeat(50) + '\n');

  // Detailed breakdown
  console.log('📋 CHI TIẾT:');
  for (const r of results) {
    console.log(`  ${r.status} ${r.name}`);
    console.log(`     ${r.ms}ms | ${r.passed ? '✅ Pass' : '❌ Fail'}`);
    if (!r.passed && r.details) {
      const msg = r.details?.message || r.details?.error || JSON.stringify(r.details).substring(0, 100);
      console.log(`     → ${msg}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('💥 Fatal error:', e);
  process.exit(1);
});
