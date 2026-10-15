import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, candidateProfiles, businessProfiles, agentDoorMessages, auditLogs } from "@/db/schema";
import { eq, desc } from "@/db/mongo-query";
import { guard } from "@/lib/agent-door";

const schema = z.object({
  user_id: z.string().uuid(),
  conversation_id: z.string().trim().min(1).max(128),
  purpose: z.enum(["support", "matching", "application", "general"]).optional().default("general"),
});

/** Private machine-to-machine context endpoint. The shared secret is required and never returned. */
export async function POST(req: Request) {
  try {
    guard(req);
    let input: unknown;
    try { input = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
    const parsed = schema.safeParse(input);
    if (!parsed.success) return NextResponse.json({ error: "user_id and conversation_id are required" }, { status: 400 });
    const { user_id: uid, conversation_id: conversationId, purpose } = parsed.data;
    const [u] = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, onboardingComplete: users.onboardingComplete })
      .from(users).where(eq(users.id, uid)).limit(1);
    if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const [candidate] = await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, uid)).limit(1);
    const [business] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, uid)).limit(1);
    const history = await db.select({ author: agentDoorMessages.author, text: agentDoorMessages.text, createdAt: agentDoorMessages.createdAt })
      .from(agentDoorMessages).where(eq(agentDoorMessages.conversationId, conversationId)).orderBy(desc(agentDoorMessages.createdAt)).limit(20);
    // Do not expose phone numbers, credentials, or unrestricted profile records to the agent context.
    const safeProfile = candidate ? {
      kind: "candidate", headline: candidate.headline, skills: candidate.skills,
      experienceYears: candidate.experienceYears, experienceSummary: candidate.experienceSummary,
      qualifications: candidate.qualifications, rolesWanted: candidate.rolesWanted,
      availability: candidate.availability, workType: candidate.workType,
      country: candidate.country, region: candidate.region, city: candidate.city,
      industries: candidate.industries, educationLevel: candidate.educationLevel,
    } : business ? {
      kind: "business", orgName: business.orgName, industry: business.industry,
      businessType: business.businessType, country: business.country,
      region: business.region, city: business.city, workforceNeeds: business.workforceNeeds,
      companySize: business.companySize, typicalRoles: business.typicalRoles,
    } : null;
    await db.insert(auditLogs).values({ actorId: null, action: "agent.context.read", targetType: "user", targetId: u.id, metadata: { purpose, conversationId } });
    return NextResponse.json({
      user_id: uid, name: u.name, role: u.role || "candidate",
      status: u.onboardingComplete ? "active" : "onboarding",
      purpose, profile: safeProfile,
      history: history.reverse(),
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Context unavailable" }, { status: 500 });
  }
}
