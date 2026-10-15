import { NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, businessProfiles, candidateProfiles, savedJobs } from "@/db/schema";
import { eq, desc, and } from "@/db/mongo-query";
import { auth } from "@/lib/auth";
import { scoreJobForCandidate, textRelevance } from "@/lib/matching";
import { bad, str, strList, intOrNull } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// GET /api/jobs?q=&category=&workType=&location=&minSalary=&shift=&level=&sort=relevance|newest|salary
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").slice(0, 120);
  const category = url.searchParams.get("category") || "";
  const workType = url.searchParams.get("workType") || "";
  const location = (url.searchParams.get("location") || "").toLowerCase().slice(0, 80);
  const minSalary = intOrNull(url.searchParams.get("minSalary")) ?? 0;
  const shift = url.searchParams.get("shift") || "";
  const level = url.searchParams.get("level") || "";
  const sortParam = url.searchParams.get("sort") || "";

  const rows = await db
    .select({ job: jobs, business: businessProfiles })
    .from(jobs)
    .leftJoin(businessProfiles, eq(jobs.businessId, businessProfiles.id))
    .where(eq(jobs.status, "published"))
    .orderBy(desc(jobs.createdAt))
    .limit(500);

  // Personalised match score for signed-in job seekers
  let candidate: typeof candidateProfiles.$inferSelect | null = null;
  let savedIds = new Set<string>();
  try {
    const session = await auth();
    if (session?.user?.id && session.user.role === "candidate") {
      const [c] = await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, session.user.id)).limit(1);
      candidate = c ?? null;
      if (c) {
        const saved = await db.select({ jobId: savedJobs.jobId }).from(savedJobs).where(eq(savedJobs.candidateId, c.id));
        savedIds = new Set(saved.map((s) => s.jobId));
      }
    }
  } catch {
    /* anonymous browsing still works */
  }

  const now = Date.now();
  let items = rows.map(({ job, business }) => {
    const loc = [job.city, job.region, job.country].filter(Boolean).join(", ") || "Nationwide";
    const businessName = business?.orgName || "StewardBridge partner";
    const m = candidate ? scoreJobForCandidate(candidate, job) : null;
    return {
      ...job,
      location: loc,
      workType: job.workType,
      openings: job.openings ?? 1,
      description: job.description || "",
      requirements: job.requirements || "",
      businessName,
      businessIndustry: business?.industry ?? null,
      saved: savedIds.has(job.id),
      match: m && !m.excluded ? { score: m.score, reasons: m.reasons } : null,
      _excluded: Boolean(m?.excluded),
      _rel: textRelevance(q, { title: job.title, category: job.category, business: businessName, location: loc, skills: job.skills, description: job.description }),
      _expired: job.deadline ? job.deadline.getTime() < now : false,
    };
  });

  // Facets are computed on text-matched results BEFORE the facet filters, so counts stay useful.
  const textMatched = items.filter((i) => i._rel > 0 && !i._expired);
  const count = (pick: (i: (typeof items)[number]) => string | null | undefined) => {
    const m = new Map<string, number>();
    for (const i of textMatched) { const k = pick(i); if (k) m.set(k, (m.get(k) || 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([value, n]) => ({ value, count: n }));
  };
  const facets = {
    categories: count((i) => i.category),
    workTypes: count((i) => i.workType),
    cities: count((i) => i.city),
    levels: count((i) => i.experienceLevel),
  };

  items = textMatched.filter((i) =>
    !i._excluded &&
    (!category || i.category === category) &&
    (!workType || i.workType === workType) &&
    (!level || i.experienceLevel === level) &&
    (!location || i.location.toLowerCase().includes(location)) &&
    (!shift || (i.shiftPattern || "").toLowerCase().includes(shift.toLowerCase())) &&
    (!minSalary || (i.salaryMax ?? i.salaryMin ?? 0) >= minSalary),
  );

  const sort = sortParam || (candidate && !q ? "match" : q ? "relevance" : "newest");
  items.sort((a, b) => {
    if (sort === "match") return (b.match?.score ?? -1) - (a.match?.score ?? -1) || b._rel - a._rel;
    if (sort === "relevance") return b._rel - a._rel || (b.match?.score ?? 0) - (a.match?.score ?? 0);
    if (sort === "salary") return (b.salaryMax ?? 0) - (a.salaryMax ?? 0);
    if (sort === "urgent") return Number(b.urgent) - Number(a.urgent);
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return NextResponse.json({
    total: items.length,
    personalised: Boolean(candidate),
    facets,
    jobs: items.slice(0, 100).map(({ _excluded, _rel, _expired, ...rest }) => rest),
  });
}

// Employers publish a job (admins use /api/admin/jobs).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "business") return bad("Employer sign-in required.", 403);
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request.");
  const [bp] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, session.user.id)).limit(1);
  if (!bp) return bad("Complete your company profile first.");
  const title = str(b.title, 120);
  if (!title) return bad("Add a job title.");
  const salaryMin = intOrNull(b.salaryMin), salaryMax = intOrNull(b.salaryMax);
  if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) return bad("Minimum pay cannot be higher than maximum pay.");
  const deadline = b.deadline ? new Date(String(b.deadline)) : null;
  const publish = b.publish !== false;
  const [job] = await db.insert(jobs).values({
    businessId: bp.id,
    title,
    category: str(b.category, 80) || "Other",
    description: str(b.description, 5000) || "",
    responsibilities: str(b.responsibilities, 3000),
    requirements: str(b.requirements, 3000) || "",
    skills: strList(b.skills),
    experienceLevel: str(b.experienceLevel, 60),
    workType: str(b.workType, 40) || "Full-time",
    shiftPattern: str(b.shiftPattern, 60),
    country: str(b.country, 80) || bp.country || "Nigeria",
    region: str(b.region, 80) || bp.region || "",
    city: str(b.city, 80) || bp.city || "",
    salaryMin, salaryMax,
    salaryPeriod: str(b.salaryPeriod, 20),
    salaryCurrency: str(b.salaryCurrency, 6) || "NGN",
    openings: intOrNull(b.openings, 1, 500) ?? 1,
    benefits: strList(b.benefits, 12),
    urgent: Boolean(b.urgent),
    deadline: deadline && !isNaN(deadline.getTime()) ? deadline : null,
    status: publish ? "published" : "draft",
    publishedAt: publish ? new Date() : null,
  }).returning();
  return NextResponse.json({ ok: true, id: job.id, status: job.status });
}
