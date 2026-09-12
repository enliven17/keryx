import { NextResponse } from "next/server";
import { loadDeployment } from "@/lib/deployment";

// Exposes the public on-chain deployment (addresses only) to the client.
export const dynamic = "force-dynamic";

export function GET() {
  const d = loadDeployment();
  if (!d) return NextResponse.json({ error: "no deployment found" }, { status: 404 });
  return NextResponse.json(d);
}
