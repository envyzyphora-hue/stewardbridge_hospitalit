import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { agentDrafts, auditLogs, jobs, siteContent, staffingRequests, businessProfiles, documents } from "@/db/schema";
import { eq, and } from "@/db/mongo-query";
import { guard } from "@/lib/agent-door";
import { randomUUID } from "node:crypto";

const schema = z.object({ draft_id: z.string().uuid(), decision: z.enum(["approve", "reject"]), acting_user_id: z.string().uuid() });

export async function POST(req: Request) {
  try {
    guard(req);
    let input: unknown;
    try { input = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
    const parsed = schema.safeParse(input);
    if (!parsed.success) return NextResponse.json({ error: "Invalid decision payload" }, { status: 400 });
    const { draft_id, decision, acting_user_id } = parsed.data;
    const [draft] = await db.select().from(agentDrafts).where(eq(agentDrafts.id, draft_id)).limit(1);
    if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    if (draft.status !== "pending") return NextResponse.json({ error: "This draft has already been decided" }, { status: 409 });
    // The n8n workflow must validate its Telegram owner ID before calling this endpoint.
    // Website admins are independently checked against the same canonical admin identity.
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const webAdmin = Boolean(session?.user?.id === acting_user_id && session.user.role === "admin" && session.user.isAdminAuthorized === true && session.user.authProvider === "google" && adminEmail && session.user.email?.trim().toLowerCase() === adminEmail);
    if (!webAdmin) {
      // The agent's Telegram owner is verified by the private workflow, not by this API alone.
      // Require an explicit server-side owner ID allowlist before accepting non-web decisions.
      const ownerIds = (process.env.STEWARD_BRIDGE_AGENT_OWNER_USER_IDS || "").split(",").map((v) => v.trim()).filter(Boolean);
      if (!ownerIds.includes(acting_user_id)) return NextResponse.json({ error: "Approver is not authorized" }, { status: 403 });
    }
    const [claimed] = await db.update(agentDrafts).set({ status: "processing" }).where(and(eq(agentDrafts.id, draft.id), eq(agentDrafts.status, "pending"))).returning({ id: agentDrafts.id });
    if (!claimed) return NextResponse.json({ error: "This draft has already been decided" }, { status: 409 });
    const status = decision === "approve" ? "approved" : "rejected";
    let execution: Record<string, unknown> | null = null;
    if (decision === "approve") {
      const payload = draft.payload as Record<string, unknown>;
      if (draft.type === "publish_job") {
        const businessId = String(payload.businessId || "");
        const [business] = await db.select({ id: businessProfiles.id }).from(businessProfiles).where(eq(businessProfiles.id, businessId)).limit(1);
        if (!business) return NextResponse.json({ error: "The target employer no longer exists" }, { status: 409 });
        const [job] = await db.insert(jobs).values({ businessId, title: String(payload.title), category: String(payload.category || "General"), description: String(payload.description || ""), requirements: String(payload.requirements || ""), skills: Array.isArray(payload.skills) ? payload.skills.map(String) : [], workType: String(payload.workType || "Full-time"), country: String(payload.country || "Nigeria"), region: String(payload.region || ""), city: String(payload.city || "Nationwide"), status: "pending_review" }).returning({ id: jobs.id });
        execution = { jobId: job.id, status: "pending_review" };
      } else if (draft.type === "read_document") {
        const documentId = String(payload.documentId || "");
        const [document] = await db.select({ id: documents.id, isPrivate: documents.isPrivate }).from(documents).where(eq(documents.id, documentId)).limit(1);
        if (!document || !document.isPrivate) {
          await db.update(agentDrafts).set({ status: "rejected", decisionBy: acting_user_id }).where(eq(agentDrafts.id, draft.id));
          return NextResponse.json({ error: "The requested private document does not exist" }, { status: 409 });
        }
        execution = { documentId, access: "approved_for_agent_review" };
      } else if (draft.type === "publish_update") {
        const key = `agent-update:${randomUUID()}`;
        await db.insert(siteContent).values({ key, title: String(payload.title), body: String(payload.body) });
        execution = { contentKey: key };
      } else if (draft.type === "create_staffing_request") {
        const businessId = String(payload.businessId || "");
        const [business] = await db.select({ id: businessProfiles.id }).from(businessProfiles).where(eq(businessProfiles.id, businessId)).limit(1);
        if (!business) return NextResponse.json({ error: "The target employer no longer exists" }, { status: 409 });
        const [request] = await db.insert(staffingRequests).values({ businessId, roleNeeded: String(payload.roleNeeded), quantity: Number(payload.quantity || 1), skills: Array.isArray(payload.skills) ? payload.skills.map(String) : [], experienceRequired: payload.experienceRequired ? String(payload.experienceRequired) : null, country: String(payload.country || "Nigeria"), region: String(payload.region || ""), city: String(payload.city || ""), timing: payload.timing ? String(payload.timing) : null, notes: payload.notes ? String(payload.notes) : null, status: "open" }).returning({ id: staffingRequests.id });
        execution = { staffingRequestId: request.id };
      } else {
        return NextResponse.json({ error: "Unsupported draft type" }, { status: 409 });
      }
    }
    const [updated] = await db.update(agentDrafts).set({ status, decisionBy: acting_user_id }).where(eq(agentDrafts.id, draft.id)).returning({ id: agentDrafts.id, status: agentDrafts.status });
    await db.insert(auditLogs).values({ actorId: acting_user_id, action: `agent.draft.${status}`, targetType: "agent_draft", targetId: draft.id, metadata: { type: draft.type, execution } });
    return NextResponse.json({ ok: true, status: updated.status, execution });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Decision failed" }, { status: 500 });
  }
}
