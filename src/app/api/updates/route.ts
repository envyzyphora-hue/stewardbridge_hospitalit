import { NextResponse } from "next/server";
import { desc, like } from "@/db/mongo-query";
import { db } from "@/db";
import { siteContent } from "@/db/schema";

export async function GET() {
  try {
    const rows = await db.select().from(siteContent).where(like(siteContent.key, "update:%")).orderBy(desc(siteContent.updatedAt)).limit(50);
    return NextResponse.json({ items: rows.map((row) => ({ id: row.id, title: row.title || "StewardBridge update", text: row.body || "", updatedAt: row.updatedAt })) });
  } catch {
    return NextResponse.json({ items: [], error: "Updates are temporarily unavailable." }, { status: 503 });
  }
}
