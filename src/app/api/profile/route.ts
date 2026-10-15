import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, candidateProfiles, businessProfiles } from "@/db/schema";
import { eq } from "@/db/mongo-query";
import { bad, str, strList, intOrNull } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [u] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });
  let profile: Record<string, unknown> = { userId: u.id, email: u.email, name: u.name, phone: u.phone ?? "", role: u.role, onboardingComplete: u.onboardingComplete };
  if (u.role === "candidate") {
    const [p] = await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, u.id)).limit(1);
    profile = { ...profile, ...p };
  } else if (u.role === "business") {
    const [p] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, u.id)).limit(1);
    profile = { ...profile, ...p };
  }
  return NextResponse.json({ profile });
}

// Saves the account basics plus the role-specific profile. Safe to call repeatedly (wizard steps, settings page).
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request.");
  const uid = session.user.id;

  const [u] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (!u) return bad("User not found", 404);

  // The role can be chosen once. Admin accounts never change role here.
  const requested = b.role === "hotel" ? "business" : b.role === "candidate" || b.role === "business" ? (b.role as "candidate" | "business") : null;
  const role = u.role ?? requested;
  if (u.role && requested && requested !== u.role) return bad("This account is already set up as " + (u.role === "business" ? "an employer" : "a job seeker") + ".", 409);
  if (!role || role === "admin") return bad("Choose whether you are a job seeker or an employer.");

  const name = str(b.name, 120) ?? u.name;
  const phone = str(b.phone, 32) ?? u.phone;

  if (role === "candidate") {
    const [existing] = await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, uid)).limit(1);
    const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k);
    const next = {
      country: has("country") ? str(b.country, 80) : existing?.country ?? null,
      region: has("region") ? str(b.region, 80) : existing?.region ?? null,
      city: has("city") ? str(b.city, 80) : existing?.city ?? null,
      headline: has("headline") ? str(b.headline, 120) : existing?.headline ?? null,
      bio: has("bio") ? str(b.bio, 1500) : existing?.bio ?? null,
      gender: has("gender") ? str(b.gender, 20) : existing?.gender ?? null,
      skills: has("skills") ? strList(b.skills) : existing?.skills ?? [],
      experienceYears: has("experienceYears") ? intOrNull(b.experienceYears, 0, 60) : existing?.experienceYears ?? null,
      experienceSummary: has("experienceSummary") ? str(b.experienceSummary, 2000) : existing?.experienceSummary ?? null,
      qualifications: has("qualifications") ? str(b.qualifications, 1000) : existing?.qualifications ?? null,
      educationLevel: has("educationLevel") ? str(b.educationLevel, 60) : existing?.educationLevel ?? null,
      certifications: has("certifications") ? strList(b.certifications, 20, 80) : existing?.certifications ?? [],
      languages: has("languages") ? strList(b.languages, 12, 30) : existing?.languages ?? [],
      rolesWanted: has("rolesWanted") ? strList(b.rolesWanted, 15) : existing?.rolesWanted ?? [],
      rolesNotWanted: has("rolesNotWanted") ? strList(b.rolesNotWanted, 15) : existing?.rolesNotWanted ?? [],
      industries: has("industries") ? strList(b.industries, 10) : existing?.industries ?? [],
      workType: has("workType") ? str(b.workType, 40) : existing?.workType ?? null,
      availability: has("availability") ? str(b.availability, 60) : existing?.availability ?? null,
      shiftPreferences: has("shiftPreferences") ? strList(b.shiftPreferences, 10, 30) : existing?.shiftPreferences ?? [],
      preferredLocations: has("preferredLocations") ? strList(b.preferredLocations, 15, 60) : existing?.preferredLocations ?? [],
      distancePreferenceKm: has("distancePreferenceKm") ? intOrNull(b.distancePreferenceKm, 0, 1000) : existing?.distancePreferenceKm ?? null,
      willingToRelocate: has("willingToRelocate") ? Boolean(b.willingToRelocate) : existing?.willingToRelocate ?? false,
      hasOwnTransport: has("hasOwnTransport") ? Boolean(b.hasOwnTransport) : existing?.hasOwnTransport ?? false,
      salaryMin: has("salaryMin") ? intOrNull(b.salaryMin) : existing?.salaryMin ?? null,
      salaryMax: has("salaryMax") ? intOrNull(b.salaryMax) : existing?.salaryMax ?? null,
      salaryPeriod: has("salaryPeriod") ? str(b.salaryPeriod, 20) : existing?.salaryPeriod ?? null,
      openToFuture: has("openToFuture") ? Boolean(b.openToFuture) : existing?.openToFuture ?? true,
    };
    if (next.salaryMin != null && next.salaryMax != null && next.salaryMin > next.salaryMax) return bad("Minimum pay cannot be higher than maximum pay.");
    await db.insert(candidateProfiles).values({ userId: uid, ...next, onboardingStep: 1 }).onConflictDoUpdate({ target: candidateProfiles.userId, set: { ...next, updatedAt: new Date() } });
    const complete = Boolean(name && phone && next.country && next.region && next.city && next.skills.length > 0);
    await db.update(users).set({ name, phone, role, onboardingComplete: complete, updatedAt: new Date() }).where(eq(users.id, uid));
    return NextResponse.json({ ok: true, onboardingComplete: complete });
  }

  // business
  const [existing] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, uid)).limit(1);
  const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k);
  const next = {
    orgName: has("orgName") ? str(b.orgName, 140) : existing?.orgName ?? null,
    industry: has("industry") ? str(b.industry, 80) : existing?.industry ?? null,
    businessType: has("businessType") ? str(b.businessType, 80) : existing?.businessType ?? null,
    companySize: has("companySize") ? str(b.companySize, 40) : existing?.companySize ?? null,
    website: has("website") ? str(b.website, 200) : existing?.website ?? null,
    description: has("description") ? str(b.description, 2000) : existing?.description ?? null,
    country: has("country") ? str(b.country, 80) : existing?.country ?? null,
    region: has("region") ? str(b.region, 80) : existing?.region ?? null,
    city: has("city") ? str(b.city, 80) : existing?.city ?? null,
    contactName: has("contactName") ? str(b.contactName, 120) : existing?.contactName ?? name,
    contactPhone: has("contactPhone") ? str(b.contactPhone, 32) : existing?.contactPhone ?? phone,
    workforceNeeds: has("workforceNeeds") ? str(b.workforceNeeds, 2000) : existing?.workforceNeeds ?? null,
    hiringUrgency: has("hiringUrgency") ? str(b.hiringUrgency, 60) : existing?.hiringUrgency ?? null,
    typicalRoles: has("typicalRoles") ? strList(b.typicalRoles, 15) : existing?.typicalRoles ?? [],
    benefitsOffered: has("benefitsOffered") ? strList(b.benefitsOffered, 12) : existing?.benefitsOffered ?? [],
  };
  await db.insert(businessProfiles).values({ userId: uid, ...next, onboardingStep: 1 }).onConflictDoUpdate({ target: businessProfiles.userId, set: { ...next, updatedAt: new Date() } });
  const complete = Boolean(next.orgName && next.contactName && (next.contactPhone || phone) && next.country && next.region && next.city);
  await db.update(users).set({ name, phone: phone ?? next.contactPhone, role, onboardingComplete: complete, updatedAt: new Date() }).where(eq(users.id, uid));
  return NextResponse.json({ ok: true, onboardingComplete: complete });
}

export async function POST() {
  return GET();
}
