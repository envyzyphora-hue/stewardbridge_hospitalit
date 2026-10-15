import { NextResponse } from "next/server";
import { db } from "@/db";
import { savedJobs, jobs, businessProfiles } from "@/db/schema";
import { and, desc, eq } from "@/db/mongo-query";
import { bad, candidateContext } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await candidateContext();
  if ("error" in ctx) return NextResponse.json({ items: [] });
  const rows = await db
    .select({ job: jobs, business: businessProfiles })
    .from(savedJobs)
    .innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
    .leftJoin(businessProfiles, eq(jobs.businessId, businessProfiles.id))
    .where(eq(savedJobs.candidateId, ctx.profile.id))
    .orderBy(desc(savedJobs.createdAt));
  return NextResponse.json({ items: rows.map(({ job, business }) => ({ ...job, location: [job.city, job.region].filter(Boolean).join(", ") || "Nationwide", businessName: business?.orgName ?? "Employer" })) });
}

export async function POST(req: Request) {
  const ctx = await candidateContext();
  if ("error" in ctx) return ctx.error;
  const b = await req.json().catch(() => ({}));
  const jobId = typeof b.jobId === "string" ? b.jobId : "";
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return bad("Unknown job.");
  const [existing] = await db.select().from(savedJobs).where(and(eq(savedJobs.jobId, jobId), eq(savedJobs.candidateId, ctx.profile.id))).limit(1);
  if (existing) {
    await db.delete(savedJobs).where(eq(savedJobs.id, existing.id));
    return NextResponse.json({ saved: false });
  }
  await db.insert(savedJobs).values({ jobId, candidateId: ctx.profile.id });
  return NextResponse.json({ saved: true });
}
