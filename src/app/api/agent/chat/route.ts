import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
const schema = z.object({
  message: z.string().trim().min(1).max(2000),
  channel: z.enum(["website", "dashboard"]).optional(),
  conversation_id: z.string().trim().min(1).max(128).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a message of up to 2,000 characters." }, { status: 400 });

  const webhookUrl = process.env.STEWARD_BRIDGE_AGENT_WEBHOOK_URL;
  const webhookSecret = process.env.STEWARD_BRIDGE_AGENT_WEBHOOK_SECRET;
  if (!webhookUrl) return NextResponse.json({ reply: "The StewardBridge assistant is not connected yet. Please contact the team for help.", configured: false }, { status: 503 });
  let url: URL;
  try { url = new URL(webhookUrl); } catch { return NextResponse.json({ error: "Agent connection is misconfigured." }, { status: 503 }); }
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") return NextResponse.json({ error: "Agent connection must use HTTPS." }, { status: 503 });

  const conversationId = parsed.data.conversation_id || randomUUID();
  const user = session.user;
  // Preserve the n8n workflow's expected contract (user.id + conversation_id),
  // while also sending the newer userId field for compatible agent services.
  const payload = {
    type: "chat",
    channel: parsed.data.channel || "website",
    conversation_id: conversationId,
    user: { id: user.id, userId: user.id, email: user.email, name: user.name, role: user.role || "candidate" },
    message: parsed.data.message,
    source: "stewardbridge",
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(webhookSecret ? { "x-stewardbridge-agent-secret": webhookSecret } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
    const raw = await response.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(raw) as Record<string, unknown>; } catch { /* handled below */ }
    if (!response.ok) return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
    const reply = typeof data.reply === "string" ? data.reply : typeof data.message === "string" ? data.message : null;
    // A workflow that only acknowledges receipt is not misrepresented as an AI answer.
    if (!reply || data.status === "working" || data.status === "accepted") {
      return NextResponse.json({
        reply: "Your message was received, but the assistant has not returned an answer yet. Please try again shortly or contact the team.",
        conversation_id: conversationId,
        pending: true,
        configured: true,
      }, { status: 202 });
    }
    return NextResponse.json({ reply, conversation_id: conversationId, configured: true });
  } catch {
    return NextResponse.json({ error: "Could not reach the StewardBridge assistant. Please try again." }, { status: 502 });
  }
}
