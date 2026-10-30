async function runApiAudit() {
  console.log("=== STARTING FULL END-TO-END API & BILLING AUDIT ===");
  const base = "http://localhost:3000";

  // 1. Test Login
  console.log("[1] Testing POST /api/auth/login (Shop Owner)...");
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "demo@retail.com", password: "password123" }),
  });

  if (!loginRes.ok) throw new Error(`Login failed with HTTP ${loginRes.status}`);
  const cookieHeader = loginRes.headers.get("set-cookie") || "";
  const tokenMatch = cookieHeader.match(/retail_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : "";
  if (!token) throw new Error("No retail_token cookie found in login response");
  console.log("    -> Login SUCCESS, JWT cookie acquired.");

  const authHeaders = {
    Cookie: `retail_token=${token}`,
    "Content-Type": "application/json",
  };

  // 2. Test /api/auth/me
  console.log("[2] Testing GET /api/auth/me...");
  const meRes = await fetch(`${base}/api/auth/me`, { headers: authHeaders });
  const meData = await meRes.json();
  if (!meRes.ok || !meData.user) throw new Error("Auth me failed");
  console.log(`    -> Current user: ${meData.user.name} (${meData.user.email}) | Role: ${meData.role} | Shop: ${meData.shop.name}`);

  // 3. Test /api/products
  console.log("[3] Testing GET /api/products...");
  const prodRes = await fetch(`${base}/api/products`, { headers: authHeaders });
  const prodData = await prodRes.json();
  if (!prodRes.ok || !Array.isArray(prodData.products)) throw new Error("Products fetch failed");
  console.log(`    -> Products count: ${prodData.products.length}`);

  // 4. Test /api/batches
  console.log("[4] Testing GET /api/batches...");
  const batchRes = await fetch(`${base}/api/batches`, { headers: authHeaders });
  const batchData = await batchRes.json();
  if (!batchRes.ok || !Array.isArray(batchData.batches)) throw new Error("Batches fetch failed");
  console.log(`    -> Batches count: ${batchData.batches.length}`);

  // 5. Test /api/dashboard
  console.log("[5] Testing GET /api/dashboard...");
  const dashRes = await fetch(`${base}/api/dashboard`, { headers: authHeaders });
  const dashData = await dashRes.json();
  if (!dashRes.ok || !dashData.cards) throw new Error("Dashboard fetch failed");
  console.log(`    -> Dashboard cards: Today Sales: ₹${dashData.cards.todaySalesRevenue}, Products: ${dashData.cards.totalProducts}`);

  // 6. Test /api/reorder
  console.log("[6] Testing GET /api/reorder...");
  const reorderRes = await fetch(`${base}/api/reorder`, { headers: authHeaders });
  const reorderData = await reorderRes.json();
  if (!reorderRes.ok || !Array.isArray(reorderData.recommendations)) throw new Error("Reorder fetch failed");
  console.log(`    -> Reorder recommendations: ${reorderData.recommendations.length} items`);

  // 7. Test /api/reports/daily
  console.log("[7] Testing GET /api/reports/daily...");
  const dailyRes = await fetch(`${base}/api/reports/daily`, { headers: authHeaders });
  const dailyData = await dailyRes.json();
  if (!dailyRes.ok || !dailyData.summary) throw new Error("Daily report fetch failed");
  console.log(`    -> Daily Revenue: ₹${dailyData.summary.totalRevenue}, Bills: ${dailyData.summary.totalBills}`);

  // 8. Test /api/reports/monthly
  console.log("[8] Testing GET /api/reports/monthly...");
  const monthlyRes = await fetch(`${base}/api/reports/monthly`, { headers: authHeaders });
  const monthlyData = await monthlyRes.json();
  if (!monthlyRes.ok || !monthlyData.summary) throw new Error("Monthly report fetch failed");
  console.log(`    -> Monthly Revenue: ₹${monthlyData.summary.monthlyRevenue}, Inventory Valuation: ₹${monthlyData.summary.inventoryValuation}`);

  // 9. Test POS Sale Checkout
  console.log("[9] Testing POST /api/sales (POS Billing Checkout)...");
  const targetProd = prodData.products.find(p => p.totalStock >= 2);
  if (!targetProd) throw new Error("No product with >=2 stock found for test checkout");

  const saleRes = await fetch(`${base}/api/sales`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      items: [{ productId: targetProd.id, quantity: 1, unitPrice: targetProd.sellingPrice }],
      customerName: "Audit Test Customer",
      customerPhone: "+91 99999 00000",
      discountAmount: 0,
      taxPercent: 5.0,
      paymentMethod: "UPI",
      upiReference: "AUDIT-UPI-TEST-1234",
    }),
  });

  const saleData = await saleRes.json();
  if (!saleRes.ok || !saleData.sale) throw new Error(`Sale failed: ${JSON.stringify(saleData)}`);
  console.log(`    -> Sale created! Invoice: ${saleData.sale.invoiceNumber}, Grand Total: ₹${saleData.sale.grandTotal}`);

  // 10. Test Sale Return / Refund
  console.log("[10] Testing POST /api/sales/[id]/return (Customer Return Workflow)...");
  const returnRes = await fetch(`${base}/api/sales/${saleData.sale.id}/return`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      returnReason: "Audit Test Refund",
      restockInventory: true,
    }),
  });

  const returnData = await returnRes.json();
  if (!returnRes.ok || !returnData.data) throw new Error(`Sale return failed: ${JSON.stringify(returnData)}`);
  console.log(`    -> Return processed! Return Number: ${returnData.data.returnRecord.returnNumber}, Refund Amount: ₹${returnData.data.totalRefund}`);

  // 11. Test Wastage Write-Off
  console.log("[11] Testing POST /api/wastage (Expired Stock Disposal)...");
  const expiredBatch = batchData.batches.find(b => b.currentQuantity > 0);
  if (expiredBatch) {
    const wasteRes = await fetch(`${base}/api/wastage`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        batchId: expiredBatch.id,
        quantity: 1,
        reason: "Audit Test Spoilage",
      }),
    });
    const wasteData = await wasteRes.json();
    if (!wasteRes.ok) throw new Error(`Wastage failed: ${JSON.stringify(wasteData)}`);
    console.log(`    -> Wastage recorded! Loss: ₹${wasteData.estimatedLoss}, Remaining Qty: ${wasteData.remainingQuantity}`);
  }

  // 12. Test Notifications
  console.log("[12] Testing GET /api/notifications...");
  const notifRes = await fetch(`${base}/api/notifications`, { headers: authHeaders });
  const notifData = await notifRes.json();
  if (!notifRes.ok || !Array.isArray(notifData.notifications)) throw new Error("Notifications fetch failed");
  console.log(`    -> Notifications count: ${notifData.notifications.length}`);

  // 13. Test Suppliers
  console.log("[13] Testing GET /api/suppliers...");
  const supRes = await fetch(`${base}/api/suppliers`, { headers: authHeaders });
  const supData = await supRes.json();
  if (!supRes.ok || !Array.isArray(supData.suppliers)) throw new Error("Suppliers fetch failed");
  console.log(`    -> Suppliers count: ${supData.suppliers.length}`);

  console.log("\n=== ALL END-TO-END API & BILLING AUDIT CHECKS PASSED ===");
}

runApiAudit().catch(err => {
  console.error("AUDIT FAILED:", err);
  process.exit(1);
});
