import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, applicationEvents, jobs, businessProfiles } from "@/db/schema";
import { and, desc, eq } from "@/db/mongo-query";
import { bad, candidateContext, str } from "@/lib/api-helpers";
import { createNotification } from "@/lib/notifications";
import { emitWebhookEvent } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

// Job seeker: my applications
export async function GET() {
  const ctx = await candidateContext();
  if ("error" in ctx) {
    // keep old behaviour for non-candidates: empty list instead of an error screen
    return NextResponse.json({ items: [] });
  }
  const rows = await db
    .select({ application: applications, job: jobs, business: businessProfiles })
    .from(applications)
    .leftJoin(jobs, eq(applications.jobId, jobs.id))
    .leftJoin(businessProfiles, eq(jobs.businessId, businessProfiles.id))
    .where(eq(applications.candidateId, ctx.profile.id))
    .orderBy(desc(applications.createdAt));
  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.application.id,
      jobId: r.application.jobId,
      status: r.application.status,
      coverNote: r.application.coverNote,
      createdAt: r.application.createdAt,
      updatedAt: r.application.updatedAt,
      title: r.job?.title ?? "Job no longer available",
      category: r.job?.category ?? null,
      location: [r.job?.city, r.job?.region].filter(Boolean).join(", "),
      businessName: r.business?.orgName ?? "Employer",
    })),
  });
}

// Job seeker: apply
export async function POST(req: Request) {
  const ctx = await candidateContext();
  if ("error" in ctx) return ctx.error;
  const b = await req.json().catch(() => ({}));
  const jobId = typeof b.jobId === "string" ? b.jobId : "";
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return bad("Unknown job.");
  if (!ctx.user.onboardingComplete) return bad("Finish your profile first so employers can see who you are.", 409);

  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.status, "published"))).limit(1);
  if (!job) return bad("This job is no longer open.", 404);
  if (job.deadline && job.deadline.getTime() < Date.now()) return bad("The deadline for this job has passed.", 410);

  const [existing] = await db.select().from(applications).where(and(eq(applications.jobId, jobId), eq(applications.candidateId, ctx.profile.id))).limit(1);
  if (existing) return bad("You have already applied to this job.", 409);

  const [app] = await db.insert(applications).values({ jobId, candidateId: ctx.profile.id, coverNote: str(b.coverNote, 2000) }).returning();
  await db.insert(applicationEvents).values({ applicationId: app.id, actorId: ctx.user.id, event: "submitted" });

  const [biz] = await db.select().from(businessProfiles).where(eq(businessProfiles.id, job.businessId)).limit(1);
  if (biz) {
    await createNotification({ userId: biz.userId, type: "application_update", title: `New applicant for ${job.title}`, body: `${ctx.user.name ?? "A candidate"} applied.`, link: "/#/workspace/applicants" });
  }
  await emitWebhookEvent("application.created", { applicationId: app.id, jobId, candidateId: ctx.profile.id }, { type: "application", id: app.id }).catch(() => {});
  return NextResponse.json({ ok: true, id: app.id }, { status: 201 });
}

// Job seeker: withdraw
export async function PATCH(req: Request) {
  const ctx = await candidateContext();
  if ("error" in ctx) return ctx.error;
  const b = await req.json().catch(() => ({}));
  const id = typeof b.id === "string" ? b.id : "";
  const [app] = await db.select().from(applications).where(and(eq(applications.id, id), eq(applications.candidateId, ctx.profile.id))).limit(1);
  if (!app) return bad("Application not found.", 404);
  if (["accepted", "rejected", "withdrawn"].includes(app.status)) return bad("This application is already closed.", 409);
  await db.update(applications).set({ status: "withdrawn", updatedAt: new Date() }).where(eq(applications.id, id));
  await db.insert(applicationEvents).values({ applicationId: id, actorId: ctx.user.id, event: "withdrawn" });
  return NextResponse.json({ ok: true });
}
