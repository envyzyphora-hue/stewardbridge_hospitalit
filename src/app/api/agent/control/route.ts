import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAgent } from "@/lib/agent-auth";
import { db } from "@/db";
import { agentDrafts, users, notifications, auditLogs } from "@/db/schema";
import { eq } from "@/db/mongo-query";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish_job"), businessId: z.string().uuid(), title: z.string().trim().min(2).max(160), category: z.string().max(80).optional(), description: z.string().max(8000).optional(), requirements: z.string().max(4000).optional(), skills: z.array(z.string().max(80)).max(40).optional(), workType: z.string().max(80).optional(), country: z.string().max(80).optional(), region: z.string().max(100).optional(), city: z.string().max(100).optional() }),
  z.object({ action: z.literal("publish_update"), title: z.string().trim().min(2).max(160), body: z.string().trim().min(1).max(5000) }),
  z.object({ action: z.literal("create_staffing_request"), businessId: z.string().uuid(), roleNeeded: z.string().trim().min(2).max(160), quantity: z.number().int().min(1).max(1000).optional(), skills: z.array(z.string().max(80)).max(40).optional(), experienceRequired: z.string().max(300).optional(), country: z.string().max(80).optional(), region: z.string().max(100).optional(), city: z.string().max(100).optional(), timing: z.string().max(200).optional(), notes: z.string().max(4000).optional() }),
  z.object({ action: z.literal("request_document_access"), documentId: z.string().uuid(), purpose: z.enum(["matching", "application_review", "support"]) }),
  z.object({ action: z.literal("notify_admin"), title: z.string().trim().min(2).max(160), body: z.string().trim().min(1).max(2000) }),
]);

/** Agent writes are staged as drafts. Only an explicit owner approval may trigger a business action. */
export async function POST(req: Request) {
  try {
    requireAgent(req);
    let input: unknown;
    try { input = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
    const parsed = actionSchema.safeParse(input);
    if (!parsed.success) return NextResponse.json({ error: "Invalid action payload", details: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
    const payload = parsed.data;
    if (payload.action === "notify_admin") {
      const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
      for (const admin of admins) await db.insert(notifications).values({ userId: admin.id, type: "announcement", title: payload.title, body: payload.body });
      await db.insert(auditLogs).values({ actorId: null, action: "agent.notify_admin", targetType: "agent", metadata: { recipients: admins.length } });
      return NextResponse.json({ ok: true, result: { notified: admins.length } });
    }
    const draftType = payload.action === "request_document_access" ? "read_document" : payload.action;
    const [draft] = await db.insert(agentDrafts).values({ userId: null, type: draftType, payload, status: "pending" }).returning({ id: agentDrafts.id });
    await db.insert(auditLogs).values({ actorId: null, action: `agent.${payload.action}.drafted`, targetType: "agent_draft", targetId: draft.id, metadata: { action: payload.action } });
    return NextResponse.json({ ok: true, result: { draftId: draft.id, status: "pending_approval" } }, { status: 202 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Agent action failed" }, { status: 500 });
  }
}
