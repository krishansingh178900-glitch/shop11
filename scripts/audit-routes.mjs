const routes = [
  '/',
  '/login',
  '/register',
  '/links',
  '/dashboard',
  '/dashboard/billing',
  '/dashboard/inventory',
  '/dashboard/add-stock',
  '/dashboard/expiry',
  '/dashboard/low-stock',
  '/dashboard/reorder',
  '/dashboard/sales',
  '/dashboard/reports/daily',
  '/dashboard/reports/monthly',
  '/dashboard/analytics',
  '/dashboard/suppliers',
  '/dashboard/settings'
];

async function run() {
  console.log("--- STARTING ROUTE AUDIT ON http://localhost:3000 ---");
  let passed = 0;
  let failed = 0;

  for (const route of routes) {
    try {
      const res = await fetch('http://localhost:3000' + route);
      const isOk = res.status === 200;
      if (isOk) passed++; else failed++;
      console.log(`[HTTP ${res.status}] ${route} - ${isOk ? 'OK' : 'FAIL'}`);
    } catch (err) {
      failed++;
      console.error(`[ERROR] ${route} - ${err.message}`);
    }
  }

  console.log(`\nROUTE AUDIT COMPLETE: ${passed} passed, ${failed} failed out of ${routes.length}`);
}

run();
