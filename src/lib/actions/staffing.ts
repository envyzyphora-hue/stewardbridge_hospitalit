"use server";

import { db } from "@/db";
import { staffingRequests } from "@/db/schema";
import { and, eq } from "@/db/mongo-query";
import { requireBusinessProfile } from "@/lib/session";
import { emitWebhookEvent } from "@/lib/webhooks";
import { logAudit } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export type StaffingInput = {
  roleNeeded: string;
  quantity: number;
  skills: string[];
  experienceRequired?: string;
  country: string;
  region: string;
  city: string;
  timing?: string;
  notes?: string;
};

export async function createStaffingRequest(input: StaffingInput) {
  const { profile, user } = await requireBusinessProfile();
  const [row] = await db.insert(staffingRequests).values({ businessId: profile.id, ...input }).returning();

  await emitWebhookEvent("staffing_request.created", { staffingRequestId: row.id, ...input }, { type: "staffing_request", id: row.id });
  await logAudit({ actorId: user.id, action: "staffing_request.created", targetType: "staffing_request", targetId: row.id });
  revalidatePath("/dashboard/business/staffing");
}

export async function updateStaffingStatus(id: string, status: "open" | "matching" | "fulfilled" | "closed") {
  const { profile, user } = await requireBusinessProfile();
  await db.update(staffingRequests).set({ status, updatedAt: new Date() }).where(and(eq(staffingRequests.id, id), eq(staffingRequests.businessId, profile.id)));

  await emitWebhookEvent("staffing_request.updated", { staffingRequestId: id, status }, { type: "staffing_request", id });
  await logAudit({ actorId: user.id, action: `staffing_request.${status}`, targetType: "staffing_request", targetId: id });
  revalidatePath("/dashboard/business/staffing");
}
