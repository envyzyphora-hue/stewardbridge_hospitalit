import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { aiMessages, aiConversations } from "@/db/schema";
import { eq } from "@/db/mongo-query";
import { getOrCreateAiConversation, listAiMessages, callAiProvider } from "@/lib/ai";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const message = (body?.message as string | undefined)?.trim();
  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });

  const conversation = await getOrCreateAiConversation(session.user.id, body?.conversationId);
  await db.insert(aiMessages).values({ conversationId: conversation.id, role: "user", content: message, status: "completed" });

  if (conversation.title === "New conversation") {
    await db.update(aiConversations).set({ title: message.slice(0, 60), updatedAt: new Date() }).where(eq(aiConversations.id, conversation.id));
  }

  const history = (await listAiMessages(conversation.id)).map((m) => ({ role: m.role, content: m.content }));
  const result = await callAiProvider(history);

  const [assistantMessage] = await db
    .insert(aiMessages)
    .values({ conversationId: conversation.id, role: "assistant", content: result.content, status: result.status })
    .returning();

  await db.update(aiConversations).set({ updatedAt: new Date() }).where(eq(aiConversations.id, conversation.id));

  return NextResponse.json({ conversationId: conversation.id, message: assistantMessage });
}
