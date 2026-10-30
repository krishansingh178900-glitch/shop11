-- ==============================================================================
-- SMART RETAIL ASSISTANT - SUPABASE POSTGRESQL SCHEMA
-- ==============================================================================
-- You can run this script directly in the Supabase Dashboard -> SQL Editor.
-- This script creates the complete database schema with tables, indexes,
-- foreign keys, and default extensions.

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- TABLES
-- ==============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER', -- OWNER, CASHIER, MANAGER
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Shops Table
CREATE TABLE IF NOT EXISTS "Shop" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "name" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Grocery',
    "address" TEXT,
    "currency" TEXT NOT NULL DEFAULT '₹',
    "taxRatePercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
    "alertExpiryDays" INTEGER NOT NULL DEFAULT 30,
    "alertLowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Shop Members (Join User to Shop)
CREATE TABLE IF NOT EXISTS "ShopMember" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "role" TEXT NOT NULL DEFAULT 'OWNER', -- OWNER, CASHIER, STAFF
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ShopMember_shopId_userId_key" UNIQUE ("shopId", "userId")
);

-- 4. Product Categories
CREATE TABLE IF NOT EXISTS "ProductCategory" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ProductCategory_shopId_name_key" UNIQUE ("shopId", "name")
);

-- 5. Products
CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "sku" TEXT,
    "categoryId" TEXT REFERENCES "ProductCategory"("id") ON DELETE SET NULL,
    "brand" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "minStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "hasExpiry" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Suppliers
CREATE TABLE IF NOT EXISTS "Supplier" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 3,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Inventory Batches (FEFO Tracking)
CREATE TABLE IF NOT EXISTS "InventoryBatch" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "batchNumber" TEXT NOT NULL,
    "quantityReceived" DOUBLE PRECISION NOT NULL,
    "currentQuantity" DOUBLE PRECISION NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "mfgDate" TIMESTAMPTZ,
    "expiryDate" TIMESTAMPTZ,
    "supplierId" TEXT REFERENCES "Supplier"("id") ON DELETE SET NULL,
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "isWasted" BOOLEAN NOT NULL DEFAULT false,
    "qrCodeData" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Inventory Movements (Stock Ledger)
CREATE TABLE IF NOT EXISTS "InventoryMovement" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "batchId" TEXT REFERENCES "InventoryBatch"("id") ON DELETE SET NULL,
    "type" TEXT NOT NULL, -- PURCHASE, SALE, RETURN, WASTAGE, ADJUSTMENT
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "unitPrice" DOUBLE PRECISION,
    "reason" TEXT,
    "referenceId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Stock Receipts (Goods Inward)
CREATE TABLE IF NOT EXISTS "StockReceipt" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
    "supplierId" TEXT REFERENCES "Supplier"("id") ON DELETE SET NULL,
    "receiptNumber" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Stock Receipt Items
CREATE TABLE IF NOT EXISTS "StockReceiptItem" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "receiptId" TEXT NOT NULL REFERENCES "StockReceipt"("id") ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "batchId" TEXT REFERENCES "InventoryBatch"("id") ON DELETE SET NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL
);

-- 11. Sales Table
CREATE TABLE IF NOT EXISTS "Sale" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
    "invoiceNumber" TEXT UNIQUE NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "grossProfit" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH', -- CASH, UPI, CARD, SPLIT
    "paymentStatus" TEXT NOT NULL DEFAULT 'PAID', -- PAID, PARTIAL, REFUNDED
    "upiReference" TEXT,
    "notes" TEXT,
    "cashierId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Sale Items
CREATE TABLE IF NOT EXISTS "SaleItem" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "saleId" TEXT NOT NULL REFERENCES "Sale"("id") ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "productName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "grossProfit" DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

-- 13. Sale Item Batch Allocations (FEFO deduction tracking)
CREATE TABLE IF NOT EXISTS "SaleItemBatchAllocation" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "saleItemId" TEXT NOT NULL REFERENCES "SaleItem"("id") ON DELETE CASCADE,
    "batchId" TEXT NOT NULL REFERENCES "InventoryBatch"("id") ON DELETE CASCADE,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

-- 14. Payments
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "saleId" TEXT NOT NULL REFERENCES "Sale"("id") ON DELETE CASCADE,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Returns Table
CREATE TABLE IF NOT EXISTS "Return" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
    "saleId" TEXT NOT NULL REFERENCES "Sale"("id") ON DELETE CASCADE,
    "returnNumber" TEXT UNIQUE NOT NULL,
    "returnReason" TEXT,
    "totalRefundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Return Items
CREATE TABLE IF NOT EXISTS "ReturnItem" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "returnId" TEXT NOT NULL REFERENCES "Return"("id") ON DELETE CASCADE,
    "saleItemId" TEXT NOT NULL REFERENCES "SaleItem"("id") ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "batchId" TEXT REFERENCES "InventoryBatch"("id") ON DELETE SET NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "refundAmount" DOUBLE PRECISION NOT NULL,
    "restockInventory" BOOLEAN NOT NULL DEFAULT true
);

-- 17. Purchase Orders
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
    "supplierId" TEXT REFERENCES "Supplier"("id") ON DELETE SET NULL,
    "poNumber" TEXT UNIQUE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, ORDERED, RECEIVED, CANCELLED
    "totalEstimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "expectedDeliveryDate" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Purchase Order Items
CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "poId" TEXT NOT NULL REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "quantity" DOUBLE PRECISION NOT NULL,
    "estimatedUnitCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL
);

-- 19. Notifications
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL, -- LOW_STOCK, OUT_OF_STOCK, EXPIRING_SOON, EXPIRED, REORDER_RECOMMENDED, DAILY_REPORT
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedProductId" TEXT REFERENCES "Product"("id") ON DELETE CASCADE,
    "relatedBatchId" TEXT REFERENCES "InventoryBatch"("id") ON DELETE CASCADE,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Audit Logs
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
    "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "detailsJson" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================

CREATE INDEX IF NOT EXISTS "idx_product_shop_barcode" ON "Product"("shopId", "barcode");
CREATE INDEX IF NOT EXISTS "idx_product_shop_name" ON "Product"("shopId", "name");

CREATE INDEX IF NOT EXISTS "idx_batch_shop_product" ON "InventoryBatch"("shopId", "productId");
CREATE INDEX IF NOT EXISTS "idx_batch_shop_expiry" ON "InventoryBatch"("shopId", "expiryDate");
CREATE INDEX IF NOT EXISTS "idx_batch_shop_quantity" ON "InventoryBatch"("shopId", "currentQuantity");

CREATE INDEX IF NOT EXISTS "idx_movement_shop_product" ON "InventoryMovement"("shopId", "productId");
CREATE INDEX IF NOT EXISTS "idx_movement_shop_type" ON "InventoryMovement"("shopId", "type");
CREATE INDEX IF NOT EXISTS "idx_movement_shop_created" ON "InventoryMovement"("shopId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_supplier_shop_name" ON "Supplier"("shopId", "name");
CREATE INDEX IF NOT EXISTS "idx_receipt_shop_number" ON "StockReceipt"("shopId", "receiptNumber");

CREATE INDEX IF NOT EXISTS "idx_sale_shop_created" ON "Sale"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_sale_shop_invoice" ON "Sale"("shopId", "invoiceNumber");
CREATE INDEX IF NOT EXISTS "idx_sale_item_sale" ON "SaleItem"("saleId");
CREATE INDEX IF NOT EXISTS "idx_sale_item_product" ON "SaleItem"("productId");

CREATE INDEX IF NOT EXISTS "idx_return_shop_created" ON "Return"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_po_shop_number" ON "PurchaseOrder"("shopId", "poNumber");
CREATE INDEX IF NOT EXISTS "idx_notification_shop_read" ON "Notification"("shopId", "isRead");
CREATE INDEX IF NOT EXISTS "idx_notification_shop_created" ON "Notification"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_audit_shop_created" ON "AuditLog"("shopId", "createdAt");

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Enable RLS on all tenant-isolated tables
ALTER TABLE "Shop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShopMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockReceipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockReceiptItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleItemAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Return" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch allowed shop IDs for authenticated user
CREATE OR REPLACE FUNCTION get_user_shop_ids(user_id_param TEXT)
RETURNS SETOF TEXT AS $$
  SELECT "shopId" FROM "ShopMember" WHERE "userId" = user_id_param;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1. Shop Access Policy: Users can view and update shops they are members of
CREATE POLICY "shop_member_select" ON "Shop"
  FOR SELECT
  USING (id IN (SELECT "shopId" FROM "ShopMember" WHERE "userId" = auth.uid()::TEXT));

CREATE POLICY "shop_member_update" ON "Shop"
  FOR UPDATE
  USING (id IN (SELECT "shopId" FROM "ShopMember" WHERE "userId" = auth.uid()::TEXT AND "role" = 'OWNER'));

-- 2. Product Access Policy: Tenant isolation by shopId
CREATE POLICY "product_tenant_isolation" ON "Product"
  FOR ALL
  USING ("shopId" IN (SELECT "shopId" FROM "ShopMember" WHERE "userId" = auth.uid()::TEXT))
  WITH CHECK ("shopId" IN (SELECT "shopId" FROM "ShopMember" WHERE "userId" = auth.uid()::TEXT));

-- 3. Inventory Batches Policy: Tenant isolation by shopId
CREATE POLICY "batch_tenant_isolation" ON "InventoryBatch"
  FOR ALL
  USING ("shopId" IN (SELECT "shopId" FROM "ShopMember" WHERE "userId" = auth.uid()::TEXT))
  WITH CHECK ("shopId" IN (SELECT "shopId" FROM "ShopMember" WHERE "userId" = auth.uid()::TEXT));

-- 4. Sales & Invoicing Policy: Tenant isolation by shopId
CREATE POLICY "sale_tenant_isolation" ON "Sale"
  FOR ALL
  USING ("shopId" IN (SELECT "shopId" FROM "ShopMember" WHERE "userId" = auth.uid()::TEXT))
  WITH CHECK ("shopId" IN (SELECT "shopId" FROM "ShopMember" WHERE "userId" = auth.uid()::TEXT));

-- 5. Notifications Policy: Tenant isolation by shopId
CREATE POLICY "notification_tenant_isolation" ON "Notification"
  FOR ALL
  USING ("shopId" IN (SELECT "shopId" FROM "ShopMember" WHERE "userId" = auth.uid()::TEXT))
  WITH CHECK ("shopId" IN (SELECT "shopId" FROM "ShopMember" WHERE "userId" = auth.uid()::TEXT));

-- 6. Suppliers Policy: Tenant isolation by shopId
CREATE POLICY "supplier_tenant_isolation" ON "Supplier"
  FOR ALL
  USING ("shopId" IN (SELECT "shopId" FROM "ShopMember" WHERE "userId" = auth.uid()::TEXT))
  WITH CHECK ("shopId" IN (SELECT "shopId" FROM "ShopMember" WHERE "userId" = auth.uid()::TEXT));

-- Note: Server-side Next.js using service role key (or Prisma directly via connection pooler)
-- operates with admin privileges and bypasses RLS, while frontend Supabase Client queries
-- strictly adhere to the above tenant policies.

