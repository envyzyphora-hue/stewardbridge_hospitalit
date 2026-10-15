"use server";

import { db } from "@/db";
import { conversations, conversationParticipants, messages, users } from "@/db/schema";
import { and, eq, inArray } from "@/db/mongo-query";
import { requireUser } from "@/lib/session";
import { createNotification, logAudit } from "@/lib/notifications";
import { emitWebhookEvent } from "@/lib/webhooks";
import { revalidatePath } from "next/cache";

export async function startConversation(otherUserId: string, subject: string, firstMessage: string) {
  const user = await requireUser();
  if (otherUserId === user.id) return { error: "You can't message yourself." };

  // Reuse an existing 1:1 conversation with the same subject if present.
  const myConvos = await db.select({ id: conversationParticipants.conversationId }).from(conversationParticipants).where(eq(conversationParticipants.userId, user.id));
  const theirConvos = await db.select({ id: conversationParticipants.conversationId }).from(conversationParticipants).where(eq(conversationParticipants.userId, otherUserId));
  const shared = myConvos.map((c) => c.id).filter((id) => theirConvos.some((t) => t.id === id));

  let conversationId: string;
  if (shared.length > 0) {
    conversationId = shared[0];
  } else {
    const [conversation] = await db.insert(conversations).values({ subject }).returning();
    conversationId = conversation.id;
    await db.insert(conversationParticipants).values([
      { conversationId, userId: user.id },
      { conversationId, userId: otherUserId },
    ]);
  }

  await db.insert(messages).values({ conversationId, senderId: user.id, body: firstMessage });
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));

  await createNotification({
    userId: otherUserId,
    type: "message",
    title: "New message",
    body: firstMessage.slice(0, 120),
    link: `/dashboard/candidate/messages/${conversationId}`,
  });
  await emitWebhookEvent("message.created", { conversationId, senderId: user.id }, { type: "conversation", id: conversationId });

  revalidatePath("/dashboard/candidate/messages");
  revalidatePath("/dashboard/business/messages");
  return { ok: true, conversationId };
}

export async function sendMessage(conversationId: string, body: string) {
  const user = await requireUser();
  if (!body.trim()) return;

  const participants = await db.select().from(conversationParticipants).where(eq(conversationParticipants.conversationId, conversationId));
  if (!participants.some((p) => p.userId === user.id)) return;

  await db.insert(messages).values({ conversationId, senderId: user.id, body });
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));

  const others = participants.filter((p) => p.userId !== user.id).map((p) => p.userId);
  const recipients = others.length ? await db.select().from(users).where(inArray(users.id, others)) : [];
  for (const r of recipients) {
    await createNotification({
      userId: r.id,
      type: "message",
      title: "New message",
      body: body.slice(0, 120),
      link: `/dashboard/${r.role === "business" ? "business" : "candidate"}/messages/${conversationId}`,
    });
  }

  await emitWebhookEvent("message.created", { conversationId, senderId: user.id }, { type: "conversation", id: conversationId });
  await logAudit({ actorId: user.id, action: "message.sent", targetType: "conversation", targetId: conversationId });

  revalidatePath(`/dashboard/candidate/messages/${conversationId}`);
  revalidatePath(`/dashboard/business/messages/${conversationId}`);
}

export async function getOrCreateConversationWithAdmin(subject: string, firstMessage: string) {
  const [admin] = await db.select().from(users).where(and(eq(users.role, "admin"))).limit(1);
  const user = await requireUser();
  if (!admin) return { error: "No administrator is available right now." };
  if (admin.id === user.id) return { error: "You are the administrator." };
  return startConversation(admin.id, subject, firstMessage);
}
