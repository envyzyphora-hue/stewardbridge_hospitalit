"use server";

import { db } from "@/db";
import { applications, applicationEvents, jobs, candidateProfiles, businessProfiles, teamMembers } from "@/db/schema";
import { eq } from "@/db/mongo-query";
import { requireBusinessProfile, requireCandidateProfile } from "@/lib/session";
import { emitWebhookEvent } from "@/lib/webhooks";
import { createNotification, logAudit } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

const STATUS_LABEL: Record<string, string> = {
  submitted: "submitted",
  under_review: "moved to review",
  shortlisted: "shortlisted",
  interview: "invited to interview",
  accepted: "accepted",
  rejected: "not selected",
  withdrawn: "withdrawn",
};

export async function updateApplicationStatus(
  applicationId: string,
  status: "under_review" | "shortlisted" | "interview" | "accepted" | "rejected",
  note?: string,
) {
  const { profile: business, user } = await requireBusinessProfile();

  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1);
  if (!application) return;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, application.jobId)).limit(1);
  if (!job || job.businessId !== business.id) return;

  await db.update(applications).set({ status, updatedAt: new Date() }).where(eq(applications.id, applicationId));
  await db.insert(applicationEvents).values({ applicationId, actorId: user.id, event: status, note });

  const [candidate] = await db.select().from(candidateProfiles).where(eq(candidateProfiles.id, application.candidateId)).limit(1);
  if (candidate) {
    await createNotification({
      userId: candidate.userId,
      type: "application_update",
      title: `Your application for ${job.title} was ${STATUS_LABEL[status]}`,
      body: note,
      link: "/dashboard/candidate/applications",
    });
  }

  if (status === "accepted") {
    await db.insert(teamMembers).values({
      candidateId: application.candidateId,
      businessId: business.id,
      jobId: job.id,
      applicationId: application.id,
      status: "team_member",
    });
  }

  await emitWebhookEvent("application.updated", { applicationId, status }, { type: "application", id: applicationId });
  await logAudit({ actorId: user.id, action: `application.${status}`, targetType: "application", targetId: applicationId });

  revalidatePath("/dashboard/business/applicants");
  revalidatePath("/dashboard/candidate/applications");
}

export async function withdrawApplication(applicationId: string) {
  const { profile, user } = await requireCandidateProfile();
  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1);
  if (!application || application.candidateId !== profile.id) return;

  await db.update(applications).set({ status: "withdrawn", updatedAt: new Date() }).where(eq(applications.id, applicationId));
  await db.insert(applicationEvents).values({ applicationId, actorId: user.id, event: "withdrawn" });
  await emitWebhookEvent("application.updated", { applicationId, status: "withdrawn" }, { type: "application", id: applicationId });
  revalidatePath("/dashboard/candidate/applications");
}

export async function markDeployed(teamMemberId: string) {
  const { profile, user } = await requireBusinessProfile();
  const [tm] = await db.select().from(teamMembers).where(eq(teamMembers.id, teamMemberId)).limit(1);
  if (!tm || tm.businessId !== profile.id) return;

  await db.update(teamMembers).set({ status: "deployed", deployedAt: new Date() }).where(eq(teamMembers.id, teamMemberId));

  const [candidate] = await db.select().from(candidateProfiles).where(eq(candidateProfiles.id, tm.candidateId)).limit(1);
  if (candidate) {
    await createNotification({
      userId: candidate.userId,
      type: "deployment",
      title: "You've been deployed",
      body: "Your deployment has been confirmed by the business. Check your calendar for details.",
      link: "/dashboard/candidate/calendar",
    });
  }

  await emitWebhookEvent("deployment.created", { teamMemberId }, { type: "team_member", id: teamMemberId });
  await logAudit({ actorId: user.id, action: "team_member.deployed", targetType: "team_member", targetId: teamMemberId });
  revalidatePath("/dashboard/business/team");
}

export async function getBusinessIdForUser(userId: string) {
  const [profile] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1);
  return profile?.id ?? null;
}
