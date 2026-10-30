# Smart Retail Assistant — Intelligent Stock, Billing & Expiry Management System

A modern, production-ready, fully functional web application engineered for small shopkeepers, grocery stores, supermarkets, pharmacies, stationery stores, electronics retailers, and general merchants.

---

## 🌟 Key Highlights & Capabilities

1. **Multi-Batch Tracking with FEFO (First Expiry, First Out)**:
   - Same product can arrive across multiple shipments with different expiry dates (e.g. Amul Milk expiring Oct 28, Oct 30, Nov 02).
   - Automatically recommends selling the earliest expiring batch first.
   - Prevents accidental selling of expired inventory while allowing shopkeepers to override batches when necessary.
2. **High-Speed POS & Billing Counter**:
   - Barcode scanning via mobile/web camera (`html5-qrcode`) and seamless hardware USB barcode scanner support.
   - Instant search (`F2` shortcut), quantity adjustment, line-item totals, and real-time subtotal calculations.
   - Discounts, configurable GST/Tax rates, and payment methods (Cash, UPI with transaction reference, Card).
   - Instant 80mm thermal receipt printing and 1-click PDF invoice downloads (`jsPDF`).
3. **Atomic Stock Updates & Audit Traceability**:
   - Every sale, purchase arrival, return, and wastage disposal runs inside an ACID database transaction.
   - Maintains a complete inventory movement log (`PURCHASE`, `SALE`, `RETURN`, `WASTAGE`, `ADJUSTMENT`).
4. **Expiry Management & Wastage Write-Off**:
   - Visual tiers: Expired, Expiring Tomorrow, Expiring in 7 Days, 15 Days, and 30 Days.
   - 1-click wastage write-off calculating exact financial loss (`quantity × purchase price`).
5. **Low Stock & Out-of-Stock Predictive Warnings**:
   - Automatic warnings when available quantity falls below configured safety thresholds or reaches zero.
   - 1-click integration into the smart replenishment pipeline.
6. **Smart Stock Reorder Recommendation Engine**:
   - Rule-based engine computing sales velocity, lead times, safety buffer, and shelf-life constraints.
   - Generates draft Purchase Orders for wholesale distributors in 1 click.
7. **Automated Daily & Monthly Business Reports**:
   - Real transaction data: Revenue, Cost of Goods Sold (COGS), Gross Profit, discounts, taxes, and valuation.
   - Excel (`.xlsx`) and PDF export for both daily and monthly reports.
8. **Bilingual English & हिन्दी Interface**:
   - 1-click switcher between English and retail Hindi terminology (किराना, बिलिंग, समाप्ति ट्रैकर, कम स्टॉक चेतावनी).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | Next.js 14 (App Router) with TypeScript & React 18 |
| **Styling** | Tailwind CSS with custom retail navy, emerald, amber, and rose themes |
| **Icons** | Lucide React |
| **Data Visualization** | Recharts (7-day trend, hourly distribution, product volume bars) |
| **Database & ORM** | Prisma ORM with SQLite (zero-config local reliability) & PostgreSQL compatibility |
| **Barcode Scanning** | HTML5-QRCode (camera) & USB keyboard wedge scanner detection |
| **Invoicing & Export** | jsPDF + AutoTable (Thermal 80mm & A4), SheetJS (`xlsx`) |
| **Authentication** | Secure stateless JWT session tokens (`jose`) with bcryptjs password hashing |
| **Automated Testing** | Vitest test suite testing business logic, FEFO, pricing, and reorder formulas |

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9+ or higher

### 2. Installation
Clone or navigate to the project directory:
```bash
cd Alpha
npm install
```

### 3. Initialize Database & Seed Demo Data
Push the Prisma schema and run the demo seed script:
```bash
npx prisma db push
npm run prisma:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Demo Accounts (Pre-configured)

For instant evaluation, 1-click login buttons are provided on the login page:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Shop Owner** | `demo@retail.com` | `password123` | Full store access, settings, reorder POs, reports |
| **Cashier** | `cashier@retail.com` | `password123` | High-speed POS billing, barcode scanning, sales |

*Note: You can also register a brand new shop account via `/register` with full tenant data isolation.*

---

## 📋 The 15 Application Pages

1. **Login & Registration** (`/login`, `/register`): Multi-tenant account registration and secure JWT session login.
2. **Main Dashboard** (`/dashboard`): 8 real-time cards, 7-day sales trend chart, top 5 selling products, recent transactions, and urgent alerts.
3. **Quick Billing / POS** (`/dashboard/billing`): Fast POS checkout, camera/USB barcode scanning, FEFO batch selection, UPI/Cash, and thermal receipt printing.
4. **Add New Stock** (`/dashboard/add-stock`): Multi-product batch arrival form, barcode scanner, purchase cost vs expected profit calculations.
5. **Product Inventory Master** (`/dashboard/inventory`): Complete product catalog with expandable batch breakdowns and Excel export.
6. **Expiry Tracker** (`/dashboard/expiry`): Tiers for 30d, 15d, 7d, tomorrow, expired stock, and wastage write-off modal.
7. **Low Stock Alerts** (`/dashboard/low-stock`): Safety threshold warnings, out-of-stock highlights, and direct reorder actions.
8. **Sales History** (`/dashboard/sales`): Transaction audit log with customer details, receipt re-printing, and return/refund processing.
9. **Daily Reports** (`/dashboard/reports/daily`): Daily revenue, COGS, gross profit, hourly distribution chart, and PDF/CSV export.
10. **Monthly Reports** (`/dashboard/reports/monthly`): Monthly business audit, inventory valuation, expired stock losses, and month-over-month growth.
11. **Sales & Product Analytics** (`/dashboard/analytics`): Top sellers, least sellers, highest revenue, fast moving items, and dead stock with AI insights.
12. **Smart Reorder Suggestions** (`/dashboard/reorder`): Rule-based replenishment engine and draft Purchase Order generator.
13. **Supplier Management** (`/dashboard/suppliers`): Vendor directory, lead times, contact details, and notes.
14. **Shop Settings** (`/dashboard/settings`): Store profile, tax rates (GST %), invoice prefix, alert thresholds, and demo reset.
15. **Shop Setup** (`/register`): Onboarding wizard for store category, currency, and address.

---

## 🧪 Running Automated Tests

Run the test suite with Vitest:
```bash
npm test
```
Verifies:
- FEFO batch sorting and allocation order
- Stock deduction across multiple shipments and shortage prevention
- Expiry categorization (tomorrow, 7d, 15d, 30d, expired)
- Invoice calculations (subtotal, discounts, GST, grand total)
- Smart Reorder velocity and safety stock formulas
- Wastage loss calculations

---

## 📦 Production Build

To build the production bundle:
```bash
npm run build
npm start
```
