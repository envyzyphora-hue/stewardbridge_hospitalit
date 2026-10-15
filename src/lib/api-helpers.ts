import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { candidateProfiles, businessProfiles } from "@/db/schema";
import { eq } from "@/db/mongo-query";

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export function str(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
}
export function strList(v: unknown, maxItems = 30, maxLen = 60): string[] {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  const out: string[] = [];
  for (const x of raw) {
    const t = typeof x === "string" ? x.trim().slice(0, maxLen) : "";
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
    if (out.length >= maxItems) break;
  }
  return out;
}
export function intOrNull(v: unknown, min = 0, max = 1_000_000_000): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function sessionUser() {
  const s = await auth();
  return s?.user?.id ? s.user : null;
}

export async function candidateContext() {
  const user = await sessionUser();
  if (!user) return { error: bad("Please sign in first.", 401) } as const;
  const [profile] = await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, user.id)).limit(1);
  if (user.role !== "candidate" || !profile) return { error: bad("This action is for job seeker accounts.", 403) } as const;
  return { user, profile } as const;
}

export async function businessContext() {
  const user = await sessionUser();
  if (!user) return { error: bad("Please sign in first.", 401) } as const;
  const [profile] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, user.id)).limit(1);
  if (user.role !== "business" || !profile) return { error: bad("This action is for employer accounts.", 403) } as const;
  return { user, profile } as const;
}
