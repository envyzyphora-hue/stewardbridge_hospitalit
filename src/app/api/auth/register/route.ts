import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "@/db/mongo-query";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

// Standard email + password registration for the two public account types:
//   candidate = job seeker / staff, business = employer / organization.
// Admin accounts can never be created here.
const bodySchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().max(254).email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128)
    .regex(/[A-Za-z]/, "Include at least one letter.")
    .regex(/[0-9]/, "Include at least one number."),
  role: z.enum(["candidate", "business"]),
  phone: z.string().trim().max(32).optional(),
});

// Best-effort throttle (per server instance). A shared store such as Upstash
// is the proper production control; this stops trivial scripted abuse.
const hits = new Map<string, number[]>();
function limited(key: string, max = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your details and try again." }, { status: 400 });
  }
  const { name, password, role, phone } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail && email === adminEmail) {
    return NextResponse.json({ error: "This address must sign in with Google." }, { status: 403 });
  }

  try {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists. Please sign in instead." }, { status: 409 });
    }
    const passwordHash = await hashPassword(password);
    await db.insert(users).values({
      email,
      name,
      phone: phone || null,
      passwordHash,
      role,
      onboardingComplete: false,
      isAdminAuthorized: false,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const unique = error instanceof Error && /unique|duplicate/i.test(error.message);
    if (unique) {
      return NextResponse.json({ error: "An account with this email already exists. Please sign in instead." }, { status: 409 });
    }
    return NextResponse.json({ error: "We could not create your account right now. Please try again shortly." }, { status: 500 });
  }
}
