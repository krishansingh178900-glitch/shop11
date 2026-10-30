import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Smart Retail Assistant with rich fake demo data...");

  // 1. Clear existing records for idempotent clean execution
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.returnItem.deleteMany();
  await prisma.return.deleteMany();
  await prisma.saleItemBatchAllocation.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockReceiptItem.deleteMany();
  await prisma.stockReceipt.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryBatch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.shopMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.shop.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 2. Users (Shop Owner, Store Manager, Cashier)
  const ownerUser = await prisma.user.create({
    data: {
      name: "Ramesh Sharma",
      email: "demo@retail.com",
      phone: "+91 98220 11223",
      passwordHash,
      role: "OWNER",
    },
  });

  const cashierUser = await prisma.user.create({
    data: {
      name: "Suresh Patel",
      email: "cashier@retail.com",
      phone: "+91 98220 44556",
      passwordHash,
      role: "CASHIER",
    },
  });

  // 3. Shop Profile
  const shop = await prisma.shop.create({
    data: {
      name: "Shree Ganesh Retail & Supermarket",
      ownerName: "Ramesh Sharma",
      email: "demo@retail.com",
      phone: "+91 98220 11223",
      category: "Grocery & Supermarket",
      address: "Shop No. 14, Main Commercial Complex, MG Road, Pune, Maharashtra 411001",
      currency: "₹",
      taxRatePercent: 5.0,
      invoicePrefix: "SGR-",
      alertExpiryDays: 30,
      alertLowStockThreshold: 15,
      language: "en",
    },
  });

  // 4. Shop Memberships
  await prisma.shopMember.createMany({
    data: [
      { shopId: shop.id, userId: ownerUser.id, role: "OWNER" },
      { shopId: shop.id, userId: cashierUser.id, role: "CASHIER" },
    ],
  });

  // 5. Product Categories
  const categories = await Promise.all([
    prisma.productCategory.create({ data: { shopId: shop.id, name: "Dairy & Cold Storage", description: "Fresh milk, paneer, butter, curd, cheese" } }),
    prisma.productCategory.create({ data: { shopId: shop.id, name: "Groceries & Daily Staples", description: "Atta, premium rice, pulses, cooking oils, spices, salts" } }),
    prisma.productCategory.create({ data: { shopId: shop.id, name: "Instant Foods & Snacks", description: "Noodles, cookies, chips, namkeen, chocolates" } }),
    prisma.productCategory.create({ data: { shopId: shop.id, name: "Beverages & Cold Drinks", description: "Soft drinks, bottled juices, premium tea, roasted coffee" } }),
    prisma.productCategory.create({ data: { shopId: shop.id, name: "Personal Care & Pharmacy", description: "Soaps, antiseptics, dental care, OTC pain relief" } }),
    prisma.productCategory.create({ data: { shopId: shop.id, name: "Stationery & Office", description: "Spiral notebooks, pens, markers, desktop accessories" } }),
  ]);

  const cat = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  // 6. Suppliers with Realistic Lead Times
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        shopId: shop.id,
        name: "Amul Gujarat Co-op Federation Depot",
        phone: "+91 98220 55110",
        email: "orders.pune@amul.coop",
        address: "Hadapsar Industrial Depot, Phase 1, Pune",
        leadTimeDays: 1,
        notes: "Daily morning fresh delivery at 6:30 AM",
      },
    }),
    prisma.supplier.create({
      data: {
        shopId: shop.id,
        name: "Nestle India Wholesale Distributors",
        phone: "+91 98220 66220",
        email: "nestle.supply@retailhub.in",
        address: "Bhosari MIDC Warehouse 4, Pune",
        leadTimeDays: 2,
        notes: "Bi-weekly replenishment on Tuesdays & Fridays",
      },
    }),
    prisma.supplier.create({
      data: {
        shopId: shop.id,
        name: "ITC Consumer Goods Wholesale Hub",
        phone: "+91 98220 77330",
        email: "itc.distributors@supplynet.in",
        address: "Marketyard Wholesale Hub, Pune",
        leadTimeDays: 2,
        notes: "Bulk staples and biscuit supplier",
      },
    }),
    prisma.supplier.create({
      data: {
        shopId: shop.id,
        name: "Hindustan Unilever Retail Logistics",
        phone: "+91 98220 88440",
        email: "hul.orders@fmcgdist.com",
        address: "Chakan Logistics Park, Pune",
        leadTimeDays: 3,
        notes: "Personal care & home care distributor",
      },
    }),
    prisma.supplier.create({
      data: {
        shopId: shop.id,
        name: "Pune Stationery & Paper Wholesale Mart",
        phone: "+91 98220 99550",
        email: "stationery.pune@papermart.in",
        address: "Appa Balwant Chowk, Pune",
        leadTimeDays: 4,
        notes: "Office and school supplies",
      },
    }),
  ]);

  const supAmul = suppliers[0].id;
  const supNestle = suppliers[1].id;
  const supITC = suppliers[2].id;
  const supHUL = suppliers[3].id;
  const supPaper = suppliers[4].id;

  const now = new Date();
  const d = (daysFromNow) => {
    const target = new Date(now);
    target.setDate(target.getDate() + daysFromNow);
    return target;
  };

  // 7. Rich Catalog of Realistic Products & Multiple Batches
  const productsData = [
    // --- DAIRY & COLD STORAGE ---
    {
      name: "Amul Taaza Fresh Toned Milk 500ml",
      barcode: "8901262010012",
      sku: "AMUL-TZ-500",
      categoryId: cat["Dairy & Cold Storage"],
      brand: "Amul",
      unit: "packet",
      minStockThreshold: 25,
      purchasePrice: 24.0,
      sellingPrice: 27.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "AMUL-OCT27-A", qty: 15, cost: 24.0, sale: 27.0, exp: d(2), mfg: d(-3), sup: supAmul }, // Expiring in 2 days!
        { batchNumber: "AMUL-OCT30-B", qty: 25, cost: 24.0, sale: 27.0, exp: d(5), mfg: d(-1), sup: supAmul }, // Expiring in 5 days!
        { batchNumber: "AMUL-NOV06-C", qty: 40, cost: 24.0, sale: 27.0, exp: d(12), mfg: d(0), sup: supAmul },
      ],
    },
    {
      name: "Amul Pasteurised Salted Butter 100g",
      barcode: "8901262011026",
      sku: "AMUL-BTR-100",
      categoryId: cat["Dairy & Cold Storage"],
      brand: "Amul",
      unit: "packet",
      minStockThreshold: 15,
      purchasePrice: 48.0,
      sellingPrice: 56.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "AMUL-BTR-EXP-01", qty: 6, cost: 48.0, sale: 56.0, exp: d(-2), mfg: d(-92), sup: supAmul, isExpired: true }, // Expired 2 days ago!
        { batchNumber: "AMUL-BTR-FRESH-02", qty: 32, cost: 48.0, sale: 56.0, exp: d(65), mfg: d(-5), sup: supAmul },
      ],
    },
    {
      name: "Mother Dairy Classic Curd / Dahi 400g",
      barcode: "8901648001041",
      sku: "MD-DAHI-400",
      categoryId: cat["Dairy & Cold Storage"],
      brand: "Mother Dairy",
      unit: "tub",
      minStockThreshold: 12,
      purchasePrice: 38.0,
      sellingPrice: 45.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "MD-DAHI-OCT29", qty: 14, cost: 38.0, sale: 45.0, exp: d(4), mfg: d(-2), sup: supAmul },
      ],
    },
    {
      name: "Amul Malai Fresh Paneer 200g",
      barcode: "8901262020059",
      sku: "AMUL-PAN-200",
      categoryId: cat["Dairy & Cold Storage"],
      brand: "Amul",
      unit: "packet",
      minStockThreshold: 10,
      purchasePrice: 82.0,
      sellingPrice: 95.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "AMUL-PAN-OCT31", qty: 18, cost: 82.0, sale: 95.0, exp: d(6), mfg: d(-1), sup: supAmul },
      ],
    },

    // --- GROCERIES & DAILY STAPLES ---
    {
      name: "Aashirvaad Superior MP Shudh Chakki Atta 5kg",
      barcode: "8901725131238",
      sku: "AASHIRVAAD-5KG",
      categoryId: cat["Groceries & Daily Staples"],
      brand: "ITC",
      unit: "bag",
      minStockThreshold: 12,
      purchasePrice: 215.0,
      sellingPrice: 250.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "AASH-SEP-22", qty: 22, cost: 215.0, sale: 250.0, exp: d(85), mfg: d(-20), sup: supITC },
      ],
    },
    {
      name: "Tata Salt Vacuum Evaporated Iodised 1kg",
      barcode: "8904043901005",
      sku: "TATA-SALT-1KG",
      categoryId: cat["Groceries & Daily Staples"],
      brand: "Tata",
      unit: "packet",
      minStockThreshold: 20,
      purchasePrice: 22.0,
      sellingPrice: 28.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "TS-2026-AUG", qty: 45, cost: 22.0, sale: 28.0, exp: d(360), mfg: d(-40), sup: supITC },
      ],
    },
    {
      name: "Fortune Sunlite Refined Sunflower Oil 1L Pouch",
      barcode: "8906007281017",
      sku: "FORTUNE-OIL-1L",
      categoryId: cat["Groceries & Daily Staples"],
      brand: "Fortune",
      unit: "packet",
      minStockThreshold: 15,
      purchasePrice: 128.0,
      sellingPrice: 145.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "FORTUNE-SEP-01", qty: 26, cost: 128.0, sale: 145.0, exp: d(240), mfg: d(-30), sup: supITC },
      ],
    },
    {
      name: "India Gate Basmati Rice Feast Rozana 1kg",
      barcode: "8901537001018",
      sku: "INDIA-GATE-1KG",
      categoryId: cat["Groceries & Daily Staples"],
      brand: "India Gate",
      unit: "packet",
      minStockThreshold: 15,
      purchasePrice: 85.0,
      sellingPrice: 105.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "IG-ROZANA-26", qty: 30, cost: 85.0, sale: 105.0, exp: d(300), mfg: d(-45), sup: supITC },
      ],
    },
    {
      name: "Tata Sampann Unpolished Toor Dal 1kg",
      barcode: "8904043903023",
      sku: "TATA-DAL-1KG",
      categoryId: cat["Groceries & Daily Staples"],
      brand: "Tata",
      unit: "packet",
      minStockThreshold: 10,
      purchasePrice: 150.0,
      sellingPrice: 175.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "TD-OCT-10", qty: 19, cost: 150.0, sale: 175.0, exp: d(270), mfg: d(-25), sup: supITC },
      ],
    },

    // --- INSTANT FOODS & SNACKS ---
    {
      name: "Maggi 2-Minute Masala Noodles 70g",
      barcode: "8901058852309",
      sku: "MAGGI-70G",
      categoryId: cat["Instant Foods & Snacks"],
      brand: "Nestle",
      unit: "packet",
      minStockThreshold: 30,
      purchasePrice: 11.5,
      sellingPrice: 14.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "MAGGI-BATCH-890", qty: 6, cost: 11.5, sale: 14.0, exp: d(150), mfg: d(-30), sup: supNestle }, // LOW STOCK ALERT (qty 6, threshold 30)
      ],
    },
    {
      name: "Parle-G Gold Glucose Biscuits 100g",
      barcode: "8901719101018",
      sku: "PARLE-G-100",
      categoryId: cat["Instant Foods & Snacks"],
      brand: "Parle",
      unit: "packet",
      minStockThreshold: 25,
      purchasePrice: 8.0,
      sellingPrice: 10.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "PARLE-G-OUT", qty: 0, cost: 8.0, sale: 10.0, exp: d(90), mfg: d(-60), sup: supITC }, // OUT OF STOCK ALERT (qty 0)
      ],
    },
    {
      name: "Britannia Good Day Butter Cookies 120g",
      barcode: "8901063142211",
      sku: "BRIT-GD-120",
      categoryId: cat["Instant Foods & Snacks"],
      brand: "Britannia",
      unit: "packet",
      minStockThreshold: 20,
      purchasePrice: 24.0,
      sellingPrice: 30.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "GD-BUTTER-26", qty: 35, cost: 24.0, sale: 30.0, exp: d(130), mfg: d(-25), sup: supITC },
      ],
    },
    {
      name: "Cadbury Dairy Milk Silk Chocolate 60g",
      barcode: "8901233024501",
      sku: "CAD-SILK-60G",
      categoryId: cat["Instant Foods & Snacks"],
      brand: "Cadbury",
      unit: "bar",
      minStockThreshold: 15,
      purchasePrice: 65.0,
      sellingPrice: 80.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "CAD-SILK-OCT", qty: 24, cost: 65.0, sale: 80.0, exp: d(200), mfg: d(-15), sup: supNestle },
      ],
    },
    {
      name: "Lay's India's Magic Masala Potato Chips 50g",
      barcode: "8901491101038",
      sku: "LAYS-MASALA-50",
      categoryId: cat["Instant Foods & Snacks"],
      brand: "Lay's",
      unit: "packet",
      minStockThreshold: 20,
      purchasePrice: 16.0,
      sellingPrice: 20.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "LAYS-OCT-09", qty: 38, cost: 16.0, sale: 20.0, exp: d(110), mfg: d(-10), sup: supNestle },
      ],
    },

    // --- BEVERAGES & COLD DRINKS ---
    {
      name: "Coca-Cola Original Taste 750ml PET",
      barcode: "8901764012217",
      sku: "COCA-COLA-750",
      categoryId: cat["Beverages & Cold Drinks"],
      brand: "Coca-Cola",
      unit: "bottle",
      minStockThreshold: 18,
      purchasePrice: 32.0,
      sellingPrice: 40.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "COKE-JUL26", qty: 28, cost: 32.0, sale: 40.0, exp: d(120), mfg: d(-15), sup: supITC },
      ],
    },
    {
      name: "Thums Up Charged 250ml Can",
      barcode: "8901764021028",
      sku: "THUMS-UP-CAN",
      categoryId: cat["Beverages & Cold Drinks"],
      brand: "Thums Up",
      unit: "can",
      minStockThreshold: 15,
      purchasePrice: 28.0,
      sellingPrice: 35.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "TU-CAN-AUG", qty: 30, cost: 28.0, sale: 35.0, exp: d(140), mfg: d(-20), sup: supITC },
      ],
    },
    {
      name: "Brooke Bond Red Label Strong Tea 250g",
      barcode: "8901030012011",
      sku: "RED-LABEL-250",
      categoryId: cat["Beverages & Cold Drinks"],
      brand: "Brooke Bond",
      unit: "box",
      minStockThreshold: 12,
      purchasePrice: 110.0,
      sellingPrice: 130.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "RL-TEA-2026", qty: 24, cost: 110.0, sale: 130.0, exp: d(365), mfg: d(-30), sup: supHUL },
      ],
    },
    {
      name: "Nescafe Classic 100% Pure Coffee 50g Jar",
      barcode: "8901058841020",
      sku: "NESCAFE-50G",
      categoryId: cat["Beverages & Cold Drinks"],
      brand: "Nescafe",
      unit: "jar",
      minStockThreshold: 10,
      purchasePrice: 155.0,
      sellingPrice: 185.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "NES-OCT-50G", qty: 16, cost: 155.0, sale: 185.0, exp: d(400), mfg: d(-20), sup: supNestle },
      ],
    },

    // --- PERSONAL CARE & PHARMACY ---
    {
      name: "Dettol Antiseptic Disinfectant Liquid 250ml",
      barcode: "8901396112023",
      sku: "DETTOL-250ML",
      categoryId: cat["Personal Care & Pharmacy"],
      brand: "Dettol",
      unit: "bottle",
      minStockThreshold: 12,
      purchasePrice: 142.0,
      sellingPrice: 168.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "DTL-SEP-26", qty: 20, cost: 142.0, sale: 168.0, exp: d(450), mfg: d(-40), sup: supHUL },
      ],
    },
    {
      name: "Colgate Strong Teeth Dental Cream 200g",
      barcode: "8901314010201",
      sku: "COLGATE-200G",
      categoryId: cat["Personal Care & Pharmacy"],
      brand: "Colgate",
      unit: "tube",
      minStockThreshold: 15,
      purchasePrice: 92.0,
      sellingPrice: 110.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "CLG-AUG-200", qty: 28, cost: 92.0, sale: 110.0, exp: d(365), mfg: d(-30), sup: supHUL },
      ],
    },
    {
      name: "Dolo 650mg Paracetamol Tablets Strip (15 Tabs)",
      barcode: "8901117012345",
      sku: "DOLO-650-STRIP",
      categoryId: cat["Personal Care & Pharmacy"],
      brand: "Micro Labs",
      unit: "strip",
      minStockThreshold: 20,
      purchasePrice: 26.0,
      sellingPrice: 34.0,
      hasExpiry: true,
      imageUrl: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "DOLO-NOV26-B1", qty: 22, cost: 26.0, sale: 34.0, exp: d(20), mfg: d(-180), sup: supHUL }, // Expiring within 20 days!
        { batchNumber: "DOLO-2027-B2", qty: 45, cost: 26.0, sale: 34.0, exp: d(380), mfg: d(-20), sup: supHUL },
      ],
    },

    // --- STATIONERY & OFFICE (NON-EXPIRING DEMO) ---
    {
      name: "Classmate Long Spiral Notebook 200 Pages",
      barcode: "8901030588448",
      sku: "CLASSMATE-200P",
      categoryId: cat["Stationery & Office"],
      brand: "Classmate",
      unit: "pcs",
      minStockThreshold: 15,
      purchasePrice: 65.0,
      sellingPrice: 85.0,
      hasExpiry: false, // Stationery items do not expire!
      imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "CM-NB-2026", qty: 42, cost: 65.0, sale: 85.0, exp: null, mfg: d(-60), sup: supPaper },
      ],
    },
    {
      name: "Reynolds 045 Fine Carbure Ball Pen Pack of 5",
      barcode: "8901282100450",
      sku: "REYNOLDS-045-PK5",
      categoryId: cat["Stationery & Office"],
      brand: "Reynolds",
      unit: "pack",
      minStockThreshold: 20,
      purchasePrice: 40.0,
      sellingPrice: 50.0,
      hasExpiry: false,
      imageUrl: "https://images.unsplash.com/photo-1585336261026-77cc7c458763?w=300&auto=format&fit=crop&q=80",
      batches: [
        { batchNumber: "REYNOLDS-PEN-045", qty: 35, cost: 40.0, sale: 50.0, exp: null, mfg: d(-90), sup: supPaper },
      ],
    },
  ];

  const createdProducts = [];
  const allBatchesForMovements = [];

  for (const p of productsData) {
    const prod = await prisma.product.create({
      data: {
        shopId: shop.id,
        name: p.name,
        barcode: p.barcode,
        sku: p.sku,
        categoryId: p.categoryId,
        brand: p.brand,
        unit: p.unit,
        minStockThreshold: p.minStockThreshold,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        hasExpiry: p.hasExpiry,
        imageUrl: p.imageUrl,
      },
    });

    createdProducts.push(prod);

    for (const b of p.batches) {
      const batchRecord = await prisma.inventoryBatch.create({
        data: {
          shopId: shop.id,
          productId: prod.id,
          batchNumber: b.batchNumber,
          quantityReceived: b.qty,
          currentQuantity: b.qty,
          purchasePrice: b.cost,
          sellingPrice: b.sale,
          mfgDate: b.mfg,
          expiryDate: b.exp,
          isExpired: b.isExpired || false,
          supplierId: b.sup,
          qrCodeData: `BATCH:${b.batchNumber}|EXP:${b.exp ? b.exp.toISOString().slice(0, 10) : "NO_EXP"}`,
        },
      });

      allBatchesForMovements.push({ ...batchRecord, productName: prod.name });
    }
  }

  // 8. Initial Stock Movement Receipts
  for (const b of allBatchesForMovements) {
    await prisma.inventoryMovement.create({
      data: {
        shopId: shop.id,
        productId: b.productId,
        batchId: b.id,
        type: "PURCHASE",
        quantity: b.quantityReceived,
        unitCost: b.purchasePrice,
        unitPrice: b.sellingPrice,
        reason: `Initial stock receipt for ${b.batchNumber}`,
        createdByUserId: ownerUser.id,
        createdAt: d(-14),
      },
    });
  }

  // 9. Realistic Customer Names & Historical Sales Generator (Past 14 Days)
  const customers = [
    { name: "Rahul Verma", phone: "+91 98221 44551" },
    { name: "Pooja Sharma", phone: "+91 98222 55662" },
    { name: "Dr. Neha Kulkarni", phone: "+91 98223 66773" },
    { name: "Amit Patel", phone: "+91 98224 77884" },
    { name: "Vikram Joshi", phone: "+91 98225 88995" },
    { name: "Priya Singh", phone: "+91 98226 99006" },
    { name: "Anand Iyer", phone: "+91 98227 00117" },
    { name: "Walk-in Customer", phone: null },
  ];

  let invoiceSeq = 1001;

  // Generate 45 realistic completed sales across the past 14 days and today
  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const saleDate = d(-dayOffset);
    // Number of bills on this day (between 2 and 6)
    const billsCount = dayOffset === 0 ? 5 : Math.floor(Math.random() * 4) + 2;

    for (let b = 0; b < billsCount; b++) {
      const cust = customers[Math.floor(Math.random() * customers.length)];
      const invNum = `SGR-2026-${invoiceSeq++}`;
      const payMethod = b % 3 === 0 ? "UPI" : b % 3 === 1 ? "CASH" : "CARD";
      const upiRef = payMethod === "UPI" ? `UPI/${Date.now().toString().slice(-8)}@okhdfcbank` : null;

      // Pick 2-4 random products for this sale
      const sampleProds = [...createdProducts]
        .filter((p) => p.name !== "Parle-G Gold Glucose Biscuits 100g") // don't sell 0-stock
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 1);

      let saleSubtotal = 0;
      let saleTotalCost = 0;
      const saleItemsToInsert = [];

      for (const sp of sampleProds) {
        const qty = Math.floor(Math.random() * 3) + 1;
        const itemTotal = qty * sp.sellingPrice;
        const itemCost = qty * sp.purchasePrice;
        saleSubtotal += itemTotal;
        saleTotalCost += itemCost;

        saleItemsToInsert.push({
          productId: sp.id,
          productName: sp.name,
          quantity: qty,
          unitPrice: sp.sellingPrice,
          totalAmount: itemTotal,
          unitCost: sp.purchasePrice,
          grossProfit: itemTotal - itemCost,
        });
      }

      const discount = saleSubtotal > 300 ? Math.floor(saleSubtotal * 0.05) : 0;
      const taxable = saleSubtotal - discount;
      const tax = Number(((taxable * 5) / 100).toFixed(2));
      const grandTotal = Number((taxable + tax).toFixed(2));
      const grossProfit = Number((grandTotal - saleTotalCost).toFixed(2));

      // Hourly time spread throughout the day
      const hour = 8 + Math.floor(Math.random() * 12);
      const minute = Math.floor(Math.random() * 59);
      saleDate.setHours(hour, minute, 0, 0);

      const createdSale = await prisma.sale.create({
        data: {
          shopId: shop.id,
          invoiceNumber: invNum,
          customerName: cust.name,
          customerPhone: cust.phone,
          subtotal: saleSubtotal,
          discountAmount: discount,
          taxAmount: tax,
          taxPercent: 5.0,
          grandTotal,
          totalCost: saleTotalCost,
          grossProfit,
          paymentMethod: payMethod,
          paymentStatus: "PAID",
          upiReference: upiRef,
          cashierId: cashierUser.id,
          createdAt: new Date(saleDate),
        },
      });

      for (const item of saleItemsToInsert) {
        const sItem = await prisma.saleItem.create({
          data: {
            saleId: createdSale.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.totalAmount,
            unitCost: item.unitCost,
            grossProfit: item.grossProfit,
          },
        });

        // Find primary batch for this product
        const bMatch = allBatchesForMovements.find((x) => x.productId === item.productId && x.currentQuantity > 0);
        if (bMatch) {
          await prisma.saleItemBatchAllocation.create({
            data: {
              saleItemId: sItem.id,
              batchId: bMatch.id,
              quantity: item.quantity,
              unitCost: item.unitCost,
              unitPrice: item.unitPrice,
            },
          });
        }
      }

      // Record payment
      await prisma.payment.create({
        data: {
          saleId: createdSale.id,
          amount: grandTotal,
          paymentMethod: payMethod,
          reference: upiRef,
          createdAt: new Date(saleDate),
        },
      });
    }
  }

  // 10. Urgent Notifications Setup
  const milkProd = createdProducts.find((p) => p.name.includes("Amul Taaza"));
  const butterProd = createdProducts.find((p) => p.name.includes("Amul Pasteurised"));
  const maggiProd = createdProducts.find((p) => p.name.includes("Maggi"));
  const parleProd = createdProducts.find((p) => p.name.includes("Parle-G"));

  await prisma.notification.createMany({
    data: [
      {
        shopId: shop.id,
        type: "EXPIRING_SOON",
        priority: "CRITICAL",
        title: "Expiring in 2 Days: Amul Taaza Milk (Batch: AMUL-OCT27-A)",
        message: "15 packets of Amul Milk will reach expiry date in 2 days. FEFO priority billing recommended.",
        relatedProductId: milkProd?.id,
        link: "/dashboard/expiry",
        createdAt: d(0),
      },
      {
        shopId: shop.id,
        type: "EXPIRED",
        priority: "CRITICAL",
        title: "Expired Stock Alert: Amul Butter 100g (Batch: AMUL-BTR-EXP-01)",
        message: "6 packets of Amul Butter expired 2 days ago. Please dispose and record as wastage loss.",
        relatedProductId: butterProd?.id,
        link: "/dashboard/expiry",
        createdAt: d(0),
      },
      {
        shopId: shop.id,
        type: "LOW_STOCK",
        priority: "HIGH",
        title: "Low Stock Warning: Maggi Noodles (6 Packets Remaining)",
        message: "Stock (6 pkts) is below the minimum safety threshold (30 pkts). Wholesale order recommended.",
        relatedProductId: maggiProd?.id,
        link: "/dashboard/low-stock",
        createdAt: d(0),
      },
      {
        shopId: shop.id,
        type: "OUT_OF_STOCK",
        priority: "CRITICAL",
        title: "Out of Stock: Parle-G Gold Glucose Biscuits",
        message: "Current stock is 0 packets. Customers cannot purchase Parle-G until restocked.",
        relatedProductId: parleProd?.id,
        link: "/dashboard/low-stock",
        createdAt: d(0),
      },
      {
        shopId: shop.id,
        type: "REORDER_RECOMMENDED",
        priority: "MEDIUM",
        title: "Smart Reorder Plan Generated (Nestle & Amul Replenishment)",
        message: "AI recommendation engine suggests ordering 40 units of Maggi Noodles and 50 Amul Milk packets.",
        relatedProductId: maggiProd?.id,
        link: "/dashboard/reorder",
        createdAt: d(0),
      },
    ],
  });

  // 11. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      shopId: shop.id,
      userId: ownerUser.id,
      action: "DEMO_SEED_EXPANDED",
      entityType: "SYSTEM",
      detailsJson: JSON.stringify({
        productsCount: productsData.length,
        message: "Expanded realistic Indian retail catalog with multiple batches and 14 days of transactions seeded.",
      }),
    },
  });

  console.log("Seeding complete! 24+ products, 30+ batches, and 45+ historical sales transactions created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
