import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/db";
import { siteContent } from "@/db/schema";
import { sendAdminEmailAlert } from "@/lib/admin-email";

export const dynamic = "force-dynamic";

const DEFAULT_CONTACT_EMAIL = "elubodetimothy@gmail.com";
const DEFAULT_CONTACT_WHATSAPP = "2347066510205";
const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(32).optional().default(""),
  subject: z.string().trim().max(160).optional(),
  type: z.string().trim().max(160).optional(),
  message: z.string().trim().min(5).max(4000),
}).strict();
const recent = new Map<string, number[]>();
function rateLimited(key: string) {
  const now = Date.now();
  const timestamps = (recent.get(key) || []).filter((time) => now - time < 10 * 60_000);
  timestamps.push(now);
  recent.set(key, timestamps);
  if (recent.size > 3000) recent.clear();
  return timestamps.length > 5;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "Too many enquiries. Please wait and try again." }, { status: 429 });
  let input: unknown;
  try { input = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Please check your name, email, and message." }, { status: 400 });
  try {
    const key = `enquiry:${randomUUID()}`;
    const createdAt = new Date().toISOString();
    await db.insert(siteContent).values({
      key, title: parsed.data.subject || parsed.data.type || "Website enquiry",
      body: JSON.stringify({ ...parsed.data, source: "website", createdAt }),
    });
    const alert = await sendAdminEmailAlert({
      subject: `StewardBridge website enquiry: ${parsed.data.subject || parsed.data.type || "Contact us"}`,
      text: `A new contact form was submitted.\n\nName: ${parsed.data.name}\nEmail: ${parsed.data.email}\nPhone: ${parsed.data.phone || "not provided"}\nSubject: ${parsed.data.subject || parsed.data.type || "Contact us"}\nTime: ${createdAt}\n\nMessage:\n${parsed.data.message}\n\nReply directly to the sender's email address.`,
    });
    return NextResponse.json({ ok: true, message: alert.sent ? "Your enquiry has been received and the team has been notified." : "Your enquiry has been saved. Email notification is not configured yet.", adminNotifiedByEmail: alert.sent }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "We could not save your enquiry. Please try again later." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    email: process.env.PUBLIC_CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL,
    whatsapp: (process.env.PUBLIC_CONTACT_WHATSAPP || DEFAULT_CONTACT_WHATSAPP).replace(/\D/g, ""),
    coverage: process.env.PUBLIC_COVERAGE || "Nationwide",
  }, { headers: { "cache-control": "public, max-age=300" } });
}
