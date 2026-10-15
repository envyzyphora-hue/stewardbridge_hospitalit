import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "@/db/mongo-query";
import { requireAdmin } from "@/lib/admin-api";

/** Return an explicit, safe admin projection. Never serialize password hashes or auth internals. */
export async function GET() {
  try {
    await requireAdmin();
    const items = await db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        name: users.name,
        image: users.image,
        role: users.role,
        onboardingComplete: users.onboardingComplete,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
