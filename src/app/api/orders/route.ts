import { NextResponse } from "next/server";

/**
 * Order submission stays closed until the Razorpay flow can verify a captured
 * payment before inserting an order. Checkout itself is client-only meanwhile.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Online payment is not set up yet. No order was submitted." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
