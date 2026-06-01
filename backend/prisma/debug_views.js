require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const views = await prisma.productView.findMany({
    orderBy: [{ userId: 'asc' }, { createdAt: 'asc' }],
    include: { product: { select: { name: true } } },
  });

  console.log('ALL VIEWS (grouped by user):');
  let lastUser = null;
  for (const v of views) {
    if (v.userId !== lastUser) console.log(`\n--- User ${v.userId.substring(0,8)} ---`);
    console.log(`  ${v.productId} | ${v.product?.name} | ${new Date(v.createdAt).toISOString()}`);
    lastUser = v.userId;
  }

  // Find sessions (products viewed by same user within 30 min)
  console.log('\n=== SESSIONS (same user, < 30min apart) ===');
  let sessionProducts = {};
  for (const v of views) {
    if (!sessionProducts[v.userId]) sessionProducts[v.userId] = [];
    sessionProducts[v.userId].push({ pid: v.productId, name: v.product?.name, ts: new Date(v.createdAt) });
  }

  for (const [userId, items] of Object.entries(sessionProducts)) {
    let session = [];
    let sessionStart = items[0].ts;
    for (const item of items) {
      const diffMin = (item.ts - sessionStart) / 60000;
      if (diffMin > 30 && session.length > 0) {
        if (session.length >= 2) {
          console.log(`\nSession (${userId.substring(0,8)}):`);
          session.forEach(s => console.log(`  ${s.pid} | ${s.name}`));
        }
        session = [];
        sessionStart = item.ts;
      }
      session.push(item);
    }
    if (session.length >= 2) {
      console.log(`\nSession (${userId.substring(0,8)}):`);
      session.forEach(s => console.log(`  ${s.pid} | ${s.name}`));
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
