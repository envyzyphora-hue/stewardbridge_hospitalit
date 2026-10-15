"use server";

import { db } from "@/db";
import { webhookEndpoints, siteContent, staffingRequests, users } from "@/db/schema";
import { eq } from "@/db/mongo-query";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function saveWebhookEndpoint(name: string, url: string) {
  const admin = await requireRole("admin");
  await db.update(webhookEndpoints).set({ isActive: false });
  const [row] = await db
    .insert(webhookEndpoints)
    .values({ name, url, secret: crypto.randomBytes(24).toString("hex"), isActive: true })
    .returning();

  await logAudit({ actorId: admin.id, action: "webhook_endpoint.configured", targetType: "webhook_endpoint", targetId: row.id });
  revalidatePath("/admin/webhooks");
}

export async function deactivateWebhookEndpoint(id: string) {
  const admin = await requireRole("admin");
  await db.update(webhookEndpoints).set({ isActive: false }).where(eq(webhookEndpoints.id, id));
  await logAudit({ actorId: admin.id, action: "webhook_endpoint.deactivated", targetType: "webhook_endpoint", targetId: id });
  revalidatePath("/admin/webhooks");
}

export async function upsertSiteContent(key: string, title: string, body: string) {
  const admin = await requireRole("admin");
  await db
    .insert(siteContent)
    .values({ key, title, body })
    .onConflictDoUpdate({ target: siteContent.key, set: { title, body, updatedAt: new Date() } });

  await logAudit({ actorId: admin.id, action: "content.updated", targetType: "site_content", metadata: { key } });
  revalidatePath("/admin/content");
  revalidatePath("/faq");
  revalidatePath("/about");
}

export async function adminCloseStaffingRequest(id: string) {
  const admin = await requireRole("admin");
  await db.update(staffingRequests).set({ status: "closed", updatedAt: new Date() }).where(eq(staffingRequests.id, id));
  await logAudit({ actorId: admin.id, action: "staffing_request.admin_closed", targetType: "staffing_request", targetId: id });
  revalidatePath("/admin/staffing");
}

export async function setUserAdminAuthorization(userId: string, authorized: boolean) {
  const admin = await requireRole("admin");
  await db.update(users).set({ isAdminAuthorized: authorized, role: authorized ? "admin" : null }).where(eq(users.id, userId));
  await logAudit({ actorId: admin.id, action: authorized ? "user.admin_granted" : "user.admin_revoked", targetType: "user", targetId: userId });
  revalidatePath("/admin/settings");
}
