"use server";

import { db } from "@/db";
import { jobs, applications, savedJobs, businessProfiles, candidateProfiles } from "@/db/schema";
import { and, eq } from "@/db/mongo-query";
import { requireBusinessProfile, requireCandidateProfile } from "@/lib/session";
import { emitWebhookEvent } from "@/lib/webhooks";
import { createNotification, logAudit } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type JobInput = {
  title: string;
  category: string;
  description: string;
  responsibilities?: string;
  skills: string[];
  experienceRequired?: string;
  qualifications?: string;
  workType: string;
  country: string;
  region: string;
  city: string;
  availability?: string;
  requirements?: string;
};

export async function createJob(input: JobInput, publish: boolean) {
  const { profile } = await requireBusinessProfile();

  const [job] = await db
    .insert(jobs)
    .values({
      businessId: profile.id,
      ...input,
      status: publish ? "published" : "draft",
      publishedAt: publish ? new Date() : null,
    })
    .returning();

  await emitWebhookEvent(
    "job.created",
    { jobId: job.id, title: job.title, status: job.status, businessId: profile.id },
    { type: "job", id: job.id },
  );
  if (publish) {
    await emitWebhookEvent("job.published", { jobId: job.id, title: job.title }, { type: "job", id: job.id });
  }
  await logAudit({ actorId: profile.userId, action: publish ? "job.published" : "job.draft_created", targetType: "job", targetId: job.id });

  revalidatePath("/dashboard/business/jobs");
  redirect(`/dashboard/business/jobs/${job.id}`);
}

export async function updateJob(jobId: string, input: Partial<JobInput>) {
  const { profile } = await requireBusinessProfile();
  await db.update(jobs).set({ ...input, updatedAt: new Date() }).where(and(eq(jobs.id, jobId), eq(jobs.businessId, profile.id)));
  await emitWebhookEvent("job.updated", { jobId, changes: input }, { type: "job", id: jobId });
  revalidatePath(`/dashboard/business/jobs/${jobId}`);
}

export async function setJobStatus(jobId: string, status: "draft" | "pending_review" | "published" | "paused" | "filled" | "closed") {
  const { profile } = await requireBusinessProfile();
  const updates: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === "published") updates.publishedAt = new Date();

  await db.update(jobs).set(updates).where(and(eq(jobs.id, jobId), eq(jobs.businessId, profile.id)));

  const eventMap = {
    draft: "job.updated",
    pending_review: "job.updated",
    published: "job.published",
    paused: "job.paused",
    filled: "job.closed",
    closed: "job.closed",
  } as const;
  await emitWebhookEvent(eventMap[status], { jobId, status }, { type: "job", id: jobId });
  await logAudit({ actorId: profile.userId, action: `job.status_${status}`, targetType: "job", targetId: jobId });
  revalidatePath(`/dashboard/business/jobs/${jobId}`);
  revalidatePath("/dashboard/business/jobs");
  revalidatePath("/jobs");
}

export async function toggleSaveJob(jobId: string) {
  const { profile } = await requireCandidateProfile();
  const [existing] = await db
    .select()
    .from(savedJobs)
    .where(and(eq(savedJobs.jobId, jobId), eq(savedJobs.candidateId, profile.id)))
    .limit(1);

  if (existing) {
    await db.delete(savedJobs).where(eq(savedJobs.id, existing.id));
  } else {
    await db.insert(savedJobs).values({ jobId, candidateId: profile.id });
  }
  revalidatePath("/jobs");
  revalidatePath("/dashboard/candidate/saved");
}

export async function applyToJob(jobId: string, coverNote: string) {
  const { profile, user } = await requireCandidateProfile();

  const [existing] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.jobId, jobId), eq(applications.candidateId, profile.id)))
    .limit(1);
  if (existing) redirect(`/dashboard/candidate/applications`);

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return;

  const [application] = await db.insert(applications).values({ jobId, candidateId: profile.id, coverNote }).returning();

  const [business] = await db.select().from(businessProfiles).where(eq(businessProfiles.id, job.businessId)).limit(1);
  if (business) {
    await createNotification({
      userId: business.userId,
      type: "application_update",
      title: `New application for ${job.title}`,
      body: `${user.name ?? "A candidate"} applied to your opportunity.`,
      link: `/dashboard/business/applicants?job=${job.id}`,
    });
  }

  await emitWebhookEvent(
    "application.created",
    { applicationId: application.id, jobId, candidateId: profile.id },
    { type: "application", id: application.id },
  );

  revalidatePath("/dashboard/candidate/applications");
  redirect("/dashboard/candidate/applications?submitted=1");
}

export async function getCandidateIdForUser(userId: string) {
  const [profile] = await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)).limit(1);
  return profile?.id ?? null;
}
