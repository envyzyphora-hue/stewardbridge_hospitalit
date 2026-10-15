import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, applicationEvents, candidateProfiles, jobs, users, documents } from "@/db/schema";
import { and, desc, eq, inArray } from "@/db/mongo-query";
import { bad, businessContext } from "@/lib/api-helpers";
import { scoreCandidateForJob } from "@/lib/matching";
import { createNotification } from "@/lib/notifications";
import { stageLabel, APPLICATION_STAGES } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

// Employer: applicants across my jobs, best match first. Contact details are shared only once shortlisted.
export async function GET(req: Request) {
  const ctx = await businessContext();
  if ("error" in ctx) return ctx.error;
  const jobFilter = new URL(req.url).searchParams.get("jobId");
  const mine = await db.select().from(jobs).where(eq(jobs.businessId, ctx.profile.id));
  const jobIds = mine.map((j) => j.id).filter((id) => !jobFilter || id === jobFilter);
  if (!jobIds.length) return NextResponse.json({ items: [] });

  const rows = await db
    .select({ application: applications, candidate: candidateProfiles, user: users })
    .from(applications)
    .innerJoin(candidateProfiles, eq(applications.candidateId, candidateProfiles.id))
    .innerJoin(users, eq(candidateProfiles.userId, users.id))
    .where(inArray(applications.jobId, jobIds))
    .orderBy(desc(applications.createdAt))
    .limit(300);

  // Latest CV per applicant. /api/documents/[id] already allows an employer to open it once the person applied to one of their jobs.
  const cvRows = rows.length ? await db.select({ id: documents.id, userId: documents.userId, createdAt: documents.createdAt }).from(documents).where(and(eq(documents.category, "cv"), inArray(documents.userId, rows.map((r) => r.user.id)))).orderBy(desc(documents.createdAt)) : [];
  const cvByUser = new Map<string, string>();
  for (const d of cvRows) if (!cvByUser.has(d.userId)) cvByUser.set(d.userId, d.id);
  const jobById = new Map(mine.map((j) => [j.id, j]));

  const items = rows.map(({ application, candidate, user }) => {
    const job = jobById.get(application.jobId)!;
    const m = scoreCandidateForJob(candidate, job);
    const revealed = ["shortlisted", "interview", "accepted"].includes(application.status);
    return {
      id: application.id,
      jobId: job.id,
      jobTitle: job.title,
      status: application.status,
      coverNote: application.coverNote,
      appliedAt: application.createdAt,
      name: user.name || "Candidate",
      headline: candidate.headline,
      city: candidate.city,
      region: candidate.region,
      skills: candidate.skills ?? [],
      experienceYears: candidate.experienceYears,
      experienceSummary: candidate.experienceSummary,
      qualifications: candidate.qualifications,
      certifications: candidate.certifications ?? [],
      languages: candidate.languages ?? [],
      availability: candidate.availability,
      workType: candidate.workType,
      shiftPreferences: candidate.shiftPreferences ?? [],
      cvId: cvByUser.get(user.id) ?? null,
      match: { score: m.score, reasons: m.reasons },
      email: revealed ? user.email : null,
      phone: revealed ? user.phone : null,
    };
  });
  items.sort((a, b) => b.match.score - a.match.score);
  return NextResponse.json({ items });
}

// Employer: move an applicant through the pipeline
export async function PATCH(req: Request) {
  const ctx = await businessContext();
  if ("error" in ctx) return ctx.error;
  const b = await req.json().catch(() => ({}));
  const status = APPLICATION_STAGES.map((s) => s.key).find((k) => k === b.status && k !== "withdrawn");
  if (!status || typeof b.id !== "string") return bad("Invalid request.");

  const [row] = await db
    .select({ application: applications, job: jobs, candidate: candidateProfiles })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(candidateProfiles, eq(applications.candidateId, candidateProfiles.id))
    .where(and(eq(applications.id, b.id), eq(jobs.businessId, ctx.profile.id)))
    .limit(1);
  if (!row) return bad("Applicant not found.", 404);
  if (row.application.status === "withdrawn") return bad("The candidate withdrew this application.", 409);

  await db.update(applications).set({ status, updatedAt: new Date() }).where(eq(applications.id, b.id));
  await db.insert(applicationEvents).values({ applicationId: b.id, actorId: ctx.user.id, event: status });
  await createNotification({
    userId: row.candidate.userId,
    type: status === "interview" ? "interview" : "application_update",
    title: `${row.job.title}: ${stageLabel(status)}`,
    body: `${ctx.profile.orgName ?? "An employer"} updated your application.`,
    link: "/#/workspace/applications",
  });
  return NextResponse.json({ ok: true });
}
