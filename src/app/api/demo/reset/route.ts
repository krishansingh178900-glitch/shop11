import { NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";

export const dynamic = "force-dynamic";

const execPromise = util.promisify(exec);

export async function POST() {
  try {
    await execPromise("node scripts/seed.mjs");
    return NextResponse.json({
      success: true,
      message: "Demo database reset and seeded successfully with realistic products and batches",
    });
  } catch (error: any) {
    console.error("Demo reset error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
