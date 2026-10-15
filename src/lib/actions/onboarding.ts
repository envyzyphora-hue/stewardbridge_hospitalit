"use server";

import { db } from "@/db";
import { users, candidateProfiles, businessProfiles } from "@/db/schema";
import { eq } from "@/db/mongo-query";
import { requireUser } from "@/lib/session";
import { createNotification, logAudit } from "@/lib/notifications";
import { redirect } from "next/navigation";

export async function chooseRole(role: "candidate" | "business") {
  const user = await requireUser();
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, user.id));

  if (role === "candidate") {
    await db
      .insert(candidateProfiles)
      .values({ userId: user.id })
      .onConflictDoNothing({ target: candidateProfiles.userId });
  } else {
    await db
      .insert(businessProfiles)
      .values({ userId: user.id })
      .onConflictDoNothing({ target: businessProfiles.userId });
  }

  await logAudit({ actorId: user.id, action: "role.selected", metadata: { role } });
  redirect("/#/workspace/onboarding");
}

export type CandidateOnboardingInput = {
  photoUrl?: string;
  gender?: string;
  country: string;
  region: string;
  city: string;
  skills: string[];
  experienceYears?: number;
  experienceSummary?: string;
  qualifications?: string;
  rolesWanted: string[];
  rolesNotWanted: string[];
  availability: string;
  workType: string;
  preferredLocations: string[];
  distancePreferenceKm?: number;
  openToFuture: boolean;
  bio?: string;
};

export async function saveCandidateOnboarding(input: CandidateOnboardingInput) {
  const user = await requireUser();
  await db
    .update(candidateProfiles)
    .set({
      ...input,
      onboardingStep: 99,
      updatedAt: new Date(),
    })
    .where(eq(candidateProfiles.userId, user.id));

  await db.update(users).set({ onboardingComplete: true, updatedAt: new Date() }).where(eq(users.id, user.id));
  await createNotification({
    userId: user.id,
    type: "announcement",
    title: "Welcome to StewardBridge",
    body: "Your candidate profile is live. Start exploring opportunities that match your skills.",
    link: "/dashboard/candidate",
  });
  await logAudit({ actorId: user.id, action: "candidate.onboarding_completed" });
  redirect("/#/workspace");
}

export type BusinessOnboardingInput = {
  orgName: string;
  industry: string;
  businessType: string;
  country: string;
  region: string;
  city: string;
  contactName: string;
  contactPhone: string;
  workforceNeeds?: string;
  description?: string;
};

export async function saveBusinessOnboarding(input: BusinessOnboardingInput) {
  const user = await requireUser();
  await db
    .update(businessProfiles)
    .set({ ...input, onboardingStep: 99, updatedAt: new Date() })
    .where(eq(businessProfiles.userId, user.id));

  await db.update(users).set({ onboardingComplete: true, updatedAt: new Date() }).where(eq(users.id, user.id));
  await createNotification({
    userId: user.id,
    type: "announcement",
    title: "Welcome to StewardBridge",
    body: "Your business workspace is ready. Post your first opportunity or staffing request.",
    link: "/dashboard/business",
  });
  await logAudit({ actorId: user.id, action: "business.onboarding_completed" });
  redirect("/#/workspace");
}
