import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTrialBalance } from "@/lib/accounting";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("startDate");
  const end = searchParams.get("endDate");

  const result = await getTrialBalance(
    session.companyId,
    start ? new Date(start) : undefined,
    end ? new Date(end) : undefined
  );

  return NextResponse.json(result);
}
