import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { documents, candidateProfiles, businessProfiles, jobs, applications, auditLogs } from "@/db/schema";
import { eq, and, inArray } from "@/db/mongo-query";
import { getDocument } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  // Use the same response for missing and unauthorized documents to reduce enumeration.
  if (!doc) return NextResponse.json({ error: "Document unavailable" }, { status: 404 });

  const user = session.user;
  const allowlistedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const authorizedAdmin = user.role === "admin" && user.isAdminAuthorized === true && user.authProvider === "google" && Boolean(allowlistedEmail && user.email?.trim().toLowerCase() === allowlistedEmail);
  let allowed = doc.userId === user.id || authorizedAdmin;
  let accessReason = doc.userId === user.id ? "owner" : authorizedAdmin ? "authorized_admin" : "denied";

  // Employers may only view candidate files once an application is shortlisted,
  // in interview, or accepted. Merely applying to one of their jobs is not enough.
  if (!allowed && user.role === "business") {
    const [business] = await db.select({ id: businessProfiles.id }).from(businessProfiles).where(eq(businessProfiles.userId, user.id)).limit(1);
    const [candidate] = await db.select({ id: candidateProfiles.id }).from(candidateProfiles).where(eq(candidateProfiles.userId, doc.userId)).limit(1);
    if (business && candidate) {
      const rows = await db
        .select({ id: applications.id })
        .from(applications)
        .innerJoin(jobs, eq(jobs.id, applications.jobId))
        .where(and(
          eq(applications.candidateId, candidate.id),
          eq(jobs.businessId, business.id),
          inArray(applications.status, ["shortlisted", "interview", "accepted"]),
        ))
        .limit(1);
      allowed = rows.length > 0;
      if (allowed) accessReason = "approved_application_stage";
    }
  }

  if (!allowed) return NextResponse.json({ error: "Document unavailable" }, { status: 404 });

  try {
    // Audit the access decision without logging the file contents or storage credentials.
    await db.insert(auditLogs).values({
      actorId: user.id,
      action: "document.read",
      targetType: "document",
      targetId: doc.id,
      metadata: { reason: accessReason, category: doc.category },
    });
    const object = await getDocument(doc.storagePath);
    if (!object?.body) return NextResponse.json({ error: "File unavailable" }, { status: 404 });
    return new NextResponse(object.body, {
      headers: {
        "content-type": doc.fileType ?? object.httpMetadata?.contentType ?? "application/octet-stream",
        "content-disposition": `attachment; filename="${doc.fileName.replace(/["\\\r\n]/g, "_")}"`,
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
      },
    });
  } catch {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }
}
