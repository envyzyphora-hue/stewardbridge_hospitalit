import { NextResponse } from "next/server";
import { db } from "@/db";
import { candidateProfiles, users, jobs } from "@/db/schema";
import { and, eq } from "@/db/mongo-query";
import { businessContext } from "@/lib/api-helpers";
import { scoreCandidateForJob, textRelevance } from "@/lib/matching";

export const dynamic = "force-dynamic";

// Employer: search visible candidates. Only first name + initial and non-contact profile data are returned.
export async function GET(req: Request) {
  const ctx = await businessContext();
  if ("error" in ctx) return ctx.error;
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") || "").slice(0, 120);
  const city = (sp.get("city") || "").toLowerCase().slice(0, 80);
  const minYears = Number(sp.get("minYears") || 0) || 0;
  const availability = sp.get("availability") || "";
  const jobId = sp.get("jobId") || "";

  let job: typeof jobs.$inferSelect | null = null;
  if (jobId) {
    const [j] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.businessId, ctx.profile.id))).limit(1);
    job = j ?? null;
  }

  const rows = await db
    .select({ c: candidateProfiles, u: users })
    .from(candidateProfiles)
    .innerJoin(users, eq(candidateProfiles.userId, users.id))
    .where(and(eq(candidateProfiles.openToFuture, true), eq(users.onboardingComplete, true)))
    .limit(500);

  const items = rows
    .map(({ c, u }) => {
      const parts = (u.name || "Candidate").trim().split(/\s+/);
      const displayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
      const loc = [c.city, c.region].filter(Boolean).join(", ");
      const rel = textRelevance(q, { title: `${c.headline ?? ""} ${(c.rolesWanted ?? []).join(" ")}`, category: (c.industries ?? []).join(" "), location: loc, skills: c.skills, description: `${c.experienceSummary ?? ""} ${c.qualifications ?? ""}` });
      const m = job ? scoreCandidateForJob(c, job) : null;
      return {
        id: c.id, displayName, headline: c.headline, city: c.city, region: c.region,
        skills: c.skills ?? [], rolesWanted: c.rolesWanted ?? [], experienceYears: c.experienceYears,
        availability: c.availability, workType: c.workType, shiftPreferences: c.shiftPreferences ?? [],
        languages: c.languages ?? [], certifications: c.certifications ?? [],
        match: m && !m.excluded ? { score: m.score, reasons: m.reasons } : null,
        _rel: rel, _excluded: Boolean(m?.excluded),
      };
    })
    .filter((i) => i._rel > 0 && !i._excluded
      && (!city || (i.city || "").toLowerCase().includes(city) || (i.region || "").toLowerCase().includes(city))
      && (!minYears || (i.experienceYears ?? 0) >= minYears)
      && (!availability || i.availability === availability))
    .sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0) || b._rel - a._rel)
    .slice(0, 60)
    .map(({ _rel, _excluded, ...rest }) => rest);

  return NextResponse.json({ items, total: items.length });
}
