import { NextResponse } from "next/server";

/** Demo payment is disabled. Only verified gateway payments may mark orders paid. */
export async function POST() {
  return NextResponse.json(
    { error: "Demo payments are disabled. No order was marked paid." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
