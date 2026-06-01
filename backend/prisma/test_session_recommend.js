require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get first session's products (same user, within 30 min)
  const views = await prisma.productView.findMany({
    orderBy: [{ userId: 'asc' }, { createdAt: 'asc' }],
    include: { product: { select: { name: true } } },
  });

  // Group into sessions
  const sessions = [];
  let currentSession = null;
  let lastUser = null;
  let lastTime = null;

  for (const v of views) {
    if (v.userId !== lastUser || (lastTime && (v.createdAt - lastTime) / 60000 > 30)) {
      if (currentSession && currentSession.products.length >= 2) sessions.push(currentSession);
      currentSession = { userId: v.userId, products: [] };
    }
    currentSession.products.push({ id: v.productId, name: v.product?.name });
    lastUser = v.userId;
    lastTime = v.createdAt;
  }
  if (currentSession && currentSession.products.length >= 2) sessions.push(currentSession);

  console.log(`Total sessions found: ${sessions.length}`);
  console.log(`Total views: ${views.length}\n`);

  // Show top 5 sessions with their products
  for (let i = 0; i < Math.min(5, sessions.length); i++) {
    const s = sessions[i];
    console.log(`Session ${i + 1} (user ${s.userId.substring(0,8)}): ${s.products.length} products`);
    s.products.forEach(p => console.log(`  ${p.id} | ${p.name}`));
    console.log('');
  }

  // Now test the ML session recommend endpoint
  const http = require('http');
  
  // Login as admin
  const loginBody = JSON.stringify({ email: 'admin@khoaluan.com', password: 'admin123' });
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: loginBody,
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token;
  
  if (!token) {
    console.error('❌ Login failed');
    await prisma.$disconnect();
    return;
  }
  console.log('✅ Token obtained\n');

  // Train session model
  const trainRes = await fetch('http://localhost:5000/api/ml/session/train', {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const trainData = await trainRes.json();
  console.log(`✅ Session train: ${JSON.stringify(trainData.data)}\n`);

  // Test with first 3 products from session 1
  if (sessions.length > 0) {
    const testProducts = sessions[0].products.slice(0, 3);
    const sessionItems = testProducts.map(p => p.id);
    console.log(`Testing with products from session 1:`);
    testProducts.forEach(p => console.log(`  ${p.id} | ${p.name}`));
    console.log('');

    const recRes = await fetch('http://localhost:5000/api/ml/session/recommend', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionItems, topN: 5 }),
    });
    const recData = await recRes.json();
    
    if (recData.success && recData.data && recData.data.length > 0) {
      console.log(`✅ Session Recommend returned ${recData.data.length} products!`);
      recData.data.forEach(p => console.log(`  ${p.id} | ${p.name} | ${(p.discountPrice || p.price).toLocaleString('vi-VN')}₫`));
    } else {
      console.log('❌ Session Recommend returned empty');
      console.log(`Full response: ${JSON.stringify(recData)}`);
      
      // Try direct ML call for debugging
      console.log('\n=== Direct ML test ===');
      const directRes = await fetch('http://localhost:8000/session/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_items: sessionItems,
          products: testProducts.map(p => ({ id: p.id, name: p.name })),
          top_n: 5,
          strategy: 'hybrid',
        }),
      });
      const directData = await directRes.json();
      console.log(`Direct ML response: ${JSON.stringify(directData)}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
