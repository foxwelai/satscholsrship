import { NextRequest, NextResponse } from "next/server";

// Looks up bank & branch details from an IFSC code via the free Razorpay IFSC API
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ifsc = code.trim().toUpperCase();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    return NextResponse.json({ error: "Invalid IFSC format" }, { status: 400 });
  }
  try {
    const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "IFSC code not found" }, { status: 404 });
    }
    const data = await res.json();
    return NextResponse.json({
      bank: data.BANK,
      branch: data.BRANCH,
      address: data.ADDRESS,
      city: data.CITY,
      state: data.STATE,
    });
  } catch {
    return NextResponse.json(
      { error: "Lookup service unavailable — enter bank details manually" },
      { status: 502 }
    );
  }
}
