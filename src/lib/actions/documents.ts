"use server";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { and, eq } from "@/db/mongo-query";
import { requireUser } from "@/lib/session";
import { emitWebhookEvent } from "@/lib/webhooks";
import { logAudit } from "@/lib/notifications";
import { getPublicSiteUrl, sendAdminEmailAlert } from "@/lib/admin-email";
import { revalidatePath } from "next/cache";
import { putDocument, deleteDocumentObject } from "@/lib/storage";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type DocumentCategory =
  | "cv"
  | "certificate"
  | "identification"
  | "application_document"
  | "business_document"
  | "contract"
  | "other";

export async function uploadDocument(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file") as File | null;
  const category = (formData.get("category") as DocumentCategory | null) ?? "other";

  if (!file || file.size === 0) {
    return { error: "Please choose a file to upload." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "File is too large. Maximum size is 10MB." };
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return { error: "Unsupported file type. Please upload a PDF, Word document, or image." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${crypto.randomUUID()}-${safeName}`;
  const storagePath = `${user.id}/${storedName}`;

  const buffer = await file.arrayBuffer();
  await putDocument(storagePath, buffer, {
    contentType: file.type || "application/octet-stream",
    fileName: file.name,
  });

  const [doc] = await db
    .insert(documents)
    .values({
      userId: user.id,
      category,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
      storagePath,
      isPrivate: true,
    })
    .returning();

  await emitWebhookEvent("document.uploaded", {
    documentId: doc.id,
    ownerUserId: user.id,
    ownerEmail: user.email ?? null,
    category,
    fileName: doc.fileName,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
    requiresAuthorisedRetrieval: true,
  }, { type: "document", id: doc.id });
  await logAudit({ actorId: user.id, action: "document.uploaded", targetType: "document", targetId: doc.id });
  const alert = await sendAdminEmailAlert({
    subject: `StewardBridge document uploaded: ${category}`,
    text: `A document was uploaded to StewardBridge.\n\nUploader email: ${user.email ?? "not available"}\nCategory: ${category}\nFile name: ${doc.fileName}\nSize: ${doc.fileSize} bytes\nUploaded at: ${new Date().toISOString()}\n\nOpen the private document after signing in as an authorised administrator: ${getPublicSiteUrl()}/api/documents/${doc.id}\nDocument ID: ${doc.id}\n\nFor privacy, the file is not attached to this email.`,
  });
  if (!alert.sent) await logAudit({ actorId: user.id, action: "notification.document_email_not_sent", targetType: "document", targetId: doc.id, metadata: { reason: alert.reason } });

  revalidatePath("/dashboard/candidate/documents");
  revalidatePath("/dashboard/business/documents");
  return { ok: true, id: doc.id };
}

export async function deleteDocument(documentId: string) {
  const user = await requireUser();
  const [doc] = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, user.id))).limit(1);
  if (!doc) return;

  await db.delete(documents).where(eq(documents.id, documentId));
  await deleteDocumentObject(doc.storagePath).catch(() => {});
  await logAudit({ actorId: user.id, action: "document.deleted", targetType: "document", targetId: documentId });

  revalidatePath("/dashboard/candidate/documents");
  revalidatePath("/dashboard/business/documents");
}

