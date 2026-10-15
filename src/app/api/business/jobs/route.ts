import { NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, applications } from "@/db/schema";
import { and, desc, eq, inArray, sql } from "@/db/mongo-query";
import { bad, businessContext } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// Employer: my jobs with applicant counts
export async function GET() {
  const ctx = await businessContext();
  if ("error" in ctx) return ctx.error;
  const mine = await db.select().from(jobs).where(eq(jobs.businessId, ctx.profile.id)).orderBy(desc(jobs.createdAt));
  const counts = mine.length
    ? await db.select({ jobId: applications.jobId, n: sql<number>`count(*)::int` }).from(applications).where(inArray(applications.jobId, mine.map((j) => j.id))).groupBy(applications.jobId)
    : [];
  const byJob = new Map(counts.map((c) => [c.jobId, c.n]));
  return NextResponse.json({ items: mine.map((j) => ({ ...j, applicants: byJob.get(j.id) ?? 0 })) });
}

// Employer: change status (publish / pause / filled / closed)
export async function PATCH(req: Request) {
  const ctx = await businessContext();
  if ("error" in ctx) return ctx.error;
  const b = await req.json().catch(() => ({}));
  const allowed = ["draft", "published", "paused", "filled", "closed"] as const;
  const status = allowed.find((s) => s === b.status);
  if (!status || typeof b.id !== "string") return bad("Invalid request.");
  const set: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === "published") set.publishedAt = new Date();
  const res = await db.update(jobs).set(set).where(and(eq(jobs.id, b.id), eq(jobs.businessId, ctx.profile.id))).returning({ id: jobs.id });
  if (!res.length) return bad("Job not found.", 404);
  return NextResponse.json({ ok: true });
}
