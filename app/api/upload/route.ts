import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const kind = (formData.get("kind") as string) || "doc"; // "photo" | "passbook"
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, WEBP or PDF files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400 });
  }

  const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
  const safeKind = kind === "photo" ? "photo" : "passbook";
  const name = `${safeKind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ path: `/uploads/${name}` }, { status: 201 });
}
