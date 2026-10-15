import { NextResponse } from "next/server";
import { db } from "@/db";
import { candidateProfiles, jobs } from "@/db/schema";
import { and, eq } from "@/db/mongo-query";
import { bad, businessContext } from "@/lib/api-helpers";
import { createNotification } from "@/lib/notifications";

// Employer invites a candidate to apply. Contact details are never exposed; the candidate gets an in-app notification.
export async function POST(req: Request) {
  const ctx = await businessContext();
  if ("error" in ctx) return ctx.error;
  const b = await req.json().catch(() => ({}));
  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, String(b.jobId || "")), eq(jobs.businessId, ctx.profile.id), eq(jobs.status, "published"))).limit(1);
  if (!job) return bad("Choose one of your published jobs.");
  const [cand] = await db.select().from(candidateProfiles).where(and(eq(candidateProfiles.id, String(b.candidateId || "")), eq(candidateProfiles.openToFuture, true))).limit(1);
  if (!cand) return bad("Candidate not available.", 404);
  await createNotification({
    userId: cand.userId,
    type: "message",
    title: `${ctx.profile.orgName ?? "An employer"} invited you to apply`,
    body: `${job.title}${job.city ? " \u00b7 " + job.city : ""}`,
    link: "/#/workspace/opportunities",
  });
  return NextResponse.json({ ok: true });
}
