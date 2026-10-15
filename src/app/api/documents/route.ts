import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { desc, eq } from "@/db/mongo-query";
import { putDocument } from "@/lib/storage";
import { emitWebhookEvent } from "@/lib/webhooks";
import { logAudit } from "@/lib/notifications";
import { getPublicSiteUrl, sendAdminEmailAlert } from "@/lib/admin-email";

export const runtime = "nodejs";
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
function matchesFileSignature(type: string, bytes: Uint8Array) {
  if (type === "application/pdf") return bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (type === "image/png") return bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v);
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/webp") return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (type === "application/msword") return bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  return false;
}
const ALLOWED_CATEGORIES = new Set(["cv", "certificate", "identification", "application_document", "business_document", "contract", "other"]);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ items: await db.select().from(documents).where(eq(documents.userId, session.user.id)).orderBy(desc(documents.createdAt)) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in before uploading documents." }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    const categoryValue = String(form.get("category") || "other");
    if (!(file instanceof File) || file.size < 1) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Maximum file size is 10 MB." }, { status: 413 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Unsupported file type. Upload PDF, Word or an image file." }, { status: 415 });
    if (!ALLOWED_CATEGORIES.has(categoryValue)) return NextResponse.json({ error: "Invalid document category." }, { status: 400 });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "upload";
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesFileSignature(file.type, bytes)) return NextResponse.json({ error: "The file contents do not match the selected file type." }, { status: 415 });
    const storagePath = `${session.user.id}/${randomUUID()}-${safeName}`;
    await putDocument(storagePath, bytes, { contentType: file.type, fileName: safeName });
    const [doc] = await db.insert(documents).values({ userId: session.user.id, category: categoryValue as "cv" | "certificate" | "identification" | "application_document" | "business_document" | "contract" | "other", fileName: safeName, fileType: file.type, fileSize: file.size, storagePath, isPrivate: true }).returning();
    await emitWebhookEvent("document.uploaded", {
      documentId: doc.id,
      ownerUserId: session.user.id,
      ownerEmail: session.user.email ?? null,
      category: categoryValue,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      requiresAuthorisedRetrieval: true,
    }, { type: "document", id: doc.id });
    await logAudit({ actorId: session.user.id, action: "document.uploaded", targetType: "document", targetId: doc.id });
    const alert = await sendAdminEmailAlert({
      subject: `StewardBridge document uploaded: ${categoryValue}`,
      text: `A document was uploaded to StewardBridge.\n\nUploader email: ${session.user.email ?? "not available"}\nCategory: ${categoryValue}\nFile name: ${doc.fileName}\nSize: ${doc.fileSize} bytes\nUploaded at: ${new Date().toISOString()}\n\nOpen the private document after signing in as an authorised administrator: ${getPublicSiteUrl()}/api/documents/${doc.id}\nDocument ID: ${doc.id}\n\nFor privacy, the file is not attached to this email. Do not forward this notification to unauthorised people.`,
    });
    if (!alert.sent) await logAudit({ actorId: session.user.id, action: "notification.document_email_not_sent", targetType: "document", targetId: doc.id, metadata: { reason: alert.reason } });
    return NextResponse.json({ ok: true, id: doc.id, adminNotifiedByEmail: alert.sent }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Upload failed. Check private storage configuration and try again." }, { status: 500 });
  }
}
