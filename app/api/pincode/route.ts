import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin")?.trim();

  if (!pin || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "Invalid pincode" }, { status: 400 });
  }

  try {
    // Use postal API for India pincode lookup
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();

    if (data && Array.isArray(data) && data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
      const postOffice = data[0].PostOffice[0];
      // Use Block (taluk/town) rather than the post office Name, which can be a
      // different village. District + State are always accurate.
      const block = postOffice.Block && postOffice.Block !== "NA" ? postOffice.Block : "";
      const parts = [block, postOffice.District, postOffice.State].filter(Boolean);
      const location = parts.join(", ");
      return NextResponse.json({ location, pincode: pin });
    }

    return NextResponse.json({ error: "Pincode not found" }, { status: 404 });
  } catch (error) {
    console.error("Pincode lookup error:", error);
    return NextResponse.json({ error: "Failed to fetch location" }, { status: 500 });
  }
}
