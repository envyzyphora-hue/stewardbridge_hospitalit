import { db } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema";
import { eq, asc } from "@/db/mongo-query";

export const isAiProviderConfigured = Boolean(process.env.OPENROUTER_API_KEY);

const SYSTEM_PROMPT = `You are the StewardBridge AI Assistant, embedded in a Nigeria-based, nationwide workforce and recruitment platform that connects job seekers ("candidates") with businesses that need workers, across many industries (not just hospitality).
Be concise, practical and professional. You can help candidates improve their profile, prepare for interviews, and understand application status. You can help businesses draft job posts, staffing requests, and review applicant summaries.
You cannot take consequential actions yourself (such as publishing a job, closing a staffing request, or messaging another user) — you can only prepare drafts and suggestions that a human must approve inside the platform. Never claim an action has been completed unless the user tells you it already happened.
If asked about something outside the platform's scope, politely redirect to what StewardBridge can help with.`;

export async function getOrCreateAiConversation(userId: string, conversationId?: string | null) {
  if (conversationId) {
    const [existing] = await db.select().from(aiConversations).where(eq(aiConversations.id, conversationId)).limit(1);
    if (existing && existing.userId === userId) return existing;
  }
  const [created] = await db.insert(aiConversations).values({ userId, title: "New conversation" }).returning();
  return created;
}

export async function listAiMessages(conversationId: string) {
  return db.select().from(aiMessages).where(eq(aiMessages.conversationId, conversationId)).orderBy(asc(aiMessages.createdAt));
}

export async function callAiProvider(history: { role: "user" | "assistant" | "system"; content: string }[]) {
  if (!isAiProviderConfigured) {
    return {
      content:
        "The external StewardBridge AI agent isn't connected in this environment yet. Once an OpenRouter API key is configured, I'll be able to respond here. In the meantime, every core feature of StewardBridge — jobs, applications, messaging, documents — works independently of me.",
      status: "needs_approval" as const,
    };
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "content-type": "application/json",
        "X-Title": "StewardBridge",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      return { content: "The AI provider could not be reached right now. Please try again shortly.", status: "failed" as const };
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "I wasn't able to generate a response. Please try rephrasing.";
    return { content, status: "answer" as const };
  } catch {
    return { content: "The AI provider timed out. Please try again shortly.", status: "failed" as const };
  }
}
