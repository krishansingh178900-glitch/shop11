import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = await prisma.shop.findUnique({
      where: { id: session.shopId },
    });

    return NextResponse.json({ shop });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      ownerName,
      phone,
      category,
      address,
      currency,
      taxRatePercent,
      invoicePrefix,
      alertExpiryDays,
      alertLowStockThreshold,
      language,
    } = body;

    const updated = await prisma.shop.update({
      where: { id: session.shopId },
      data: {
        name: name ? name.trim() : undefined,
        ownerName: ownerName ? ownerName.trim() : undefined,
        phone: phone ? phone.trim() : undefined,
        category: category || undefined,
        address: address !== undefined ? address : undefined,
        currency: currency || undefined,
        taxRatePercent: taxRatePercent !== undefined ? Number(taxRatePercent) : undefined,
        invoicePrefix: invoicePrefix ? invoicePrefix.trim() : undefined,
        alertExpiryDays: alertExpiryDays !== undefined ? Number(alertExpiryDays) : undefined,
        alertLowStockThreshold: alertLowStockThreshold !== undefined ? Number(alertLowStockThreshold) : undefined,
        language: language || undefined,
      },
    });

    return NextResponse.json({ success: true, shop: updated });
  } catch (error: any) {
    console.error("Shop Setup PUT Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
