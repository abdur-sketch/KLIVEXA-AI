import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { ensureRedis } from "@/server/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = { database: false, redis: false };
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error("Database health check failed", error);
  }
  try {
    checks.redis = (await (await ensureRedis()).ping()) === "PONG";
  } catch (error) {
    console.error("Redis health check failed", error);
  }
  const healthy = checks.database && checks.redis;
  return NextResponse.json({ status: healthy ? "ok" : "degraded", checks }, { status: healthy ? 200 : 503 });
}
