"use server";

import { db } from "@/db";
import { notifications, calendarEvents, ratings } from "@/db/schema";
import { and, eq } from "@/db/mongo-query";
import { requireUser } from "@/lib/session";
import { emitWebhookEvent } from "@/lib/webhooks";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(id: string) {
  const user = await requireUser();
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  revalidatePath("/dashboard/candidate/notifications");
  revalidatePath("/dashboard/business/notifications");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, user.id));
  revalidatePath("/dashboard/candidate/notifications");
  revalidatePath("/dashboard/business/notifications");
}

export type CalendarEventInput = {
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  type: "interview" | "meeting" | "training" | "deployment" | "reminder" | "appointment";
};

export async function createCalendarEvent(input: CalendarEventInput) {
  const user = await requireUser();
  const [row] = await db
    .insert(calendarEvents)
    .values({
      userId: user.id,
      title: input.title,
      description: input.description,
      startTime: new Date(input.startTime),
      endTime: input.endTime ? new Date(input.endTime) : null,
      type: input.type,
    })
    .returning();

  await emitWebhookEvent("calendar_event.created", { eventId: row.id, title: row.title }, { type: "calendar_event", id: row.id });
  revalidatePath("/dashboard/candidate/calendar");
  revalidatePath("/dashboard/business/calendar");
}

export async function submitRating(input: {
  category: "website" | "job_application" | "service" | "business_assignment" | "hiring_process";
  score: number;
  comment?: string;
}) {
  const user = await requireUser();
  const [row] = await db
    .insert(ratings)
    .values({ userId: user.id, category: input.category, score: input.score, comment: input.comment })
    .returning();

  await emitWebhookEvent("rating.created", { ratingId: row.id, category: input.category, score: input.score }, { type: "rating", id: row.id });
  revalidatePath("/dashboard/candidate/feedback");
  revalidatePath("/dashboard/business/feedback");
}
