import { NextResponse } from "next/server";
import { suppressAnalyticsAttempts } from "@/lib/payments/repository";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid consent request." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "attemptRefs")) {
    return NextResponse.json({ error: "Unknown consent field." }, { status: 400 });
  }
  if (!Array.isArray(record.attemptRefs) || record.attemptRefs.length > 20) {
    return NextResponse.json({ error: "Invalid attempt refs." }, { status: 400 });
  }

  const attemptRefs = record.attemptRefs.filter(
    (value): value is string => typeof value === "string" && UUID_REGEX.test(value)
  );
  if (attemptRefs.length !== record.attemptRefs.length) {
    return NextResponse.json({ error: "Invalid attempt refs." }, { status: 400 });
  }

  try {
    await suppressAnalyticsAttempts(attemptRefs);
  } catch {
    return NextResponse.json({ error: "Withdrawal could not be stored." }, { status: 503 });
  }

  return new NextResponse(null, { status: 204 });
}
