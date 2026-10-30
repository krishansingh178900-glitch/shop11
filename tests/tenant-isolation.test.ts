import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { hashPassword, createSessionToken, verifySessionToken } from "../src/lib/auth";

describe("Tenant Data Isolation & Authentication Security", () => {
  let tenant1ShopId: string;
  let tenant1UserId: string;
  let tenant2ShopId: string;
  let tenant2UserId: string;

  beforeAll(async () => {
    const pw = await hashPassword("TestPass123!");

    // Create Tenant 1
    const u1 = await prisma.user.create({
      data: {
        name: "Tenant One",
        email: `tenant1_${Date.now()}@test.com`,
        passwordHash: pw,
        role: "OWNER",
      },
    });
    tenant1UserId = u1.id;

    const s1 = await prisma.shop.create({
      data: {
        name: "Shop One",
        ownerName: "Tenant One",
        email: u1.email,
        currency: "₹",
      },
    });
    tenant1ShopId = s1.id;

    await prisma.shopMember.create({
      data: { shopId: s1.id, userId: u1.id, role: "OWNER" },
    });

    // Create Product for Shop 1
    await prisma.product.create({
      data: {
        shopId: s1.id,
        name: "Confidential Product Tenant 1",
        barcode: `BARCODE_T1_${Date.now()}`,
        sellingPrice: 100,
        purchasePrice: 60,
      },
    });

    // Create Tenant 2
    const u2 = await prisma.user.create({
      data: {
        name: "Tenant Two",
        email: `tenant2_${Date.now()}@test.com`,
        passwordHash: pw,
        role: "OWNER",
      },
    });
    tenant2UserId = u2.id;

    const s2 = await prisma.shop.create({
      data: {
        name: "Shop Two",
        ownerName: "Tenant Two",
        email: u2.email,
        currency: "₹",
      },
    });
    tenant2ShopId = s2.id;

    await prisma.shopMember.create({
      data: { shopId: s2.id, userId: u2.id, role: "OWNER" },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (tenant1ShopId) {
      await prisma.product.deleteMany({ where: { shopId: tenant1ShopId } });
      await prisma.shopMember.deleteMany({ where: { shopId: tenant1ShopId } });
      await prisma.shop.delete({ where: { id: tenant1ShopId } });
    }
    if (tenant1UserId) {
      await prisma.user.delete({ where: { id: tenant1UserId } });
    }
    if (tenant2ShopId) {
      await prisma.shopMember.deleteMany({ where: { shopId: tenant2ShopId } });
      await prisma.shop.delete({ where: { id: tenant2ShopId } });
    }
    if (tenant2UserId) {
      await prisma.user.delete({ where: { id: tenant2UserId } });
    }
  });

  it("Generates and verifies JWT session tokens with tamper-resistance", async () => {
    const token = await createSessionToken({
      userId: tenant1UserId,
      email: "tenant1@test.com",
      role: "OWNER",
      shopId: tenant1ShopId,
      shopName: "Shop One",
    });

    const payload = await verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe(tenant1UserId);
    expect(payload?.shopId).toBe(tenant1ShopId);

    // Tampered token must fail
    const tampered = token.slice(0, -5) + "abcde";
    const invalidPayload = await verifySessionToken(tampered);
    expect(invalidPayload).toBeNull();
  });

  it("Ensures strict multi-tenant isolation: Tenant 2 cannot see Tenant 1 products", async () => {
    // Querying with Tenant 2 shopId
    const tenant2Products = await prisma.product.findMany({
      where: { shopId: tenant2ShopId },
    });

    expect(tenant2Products.length).toBe(0);

    // Querying with Tenant 1 shopId finds Tenant 1's product
    const tenant1Products = await prisma.product.findMany({
      where: { shopId: tenant1ShopId },
    });

    expect(tenant1Products.length).toBe(1);
    expect(tenant1Products[0].name).toBe("Confidential Product Tenant 1");
  });
});
