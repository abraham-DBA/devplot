"use server";

import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";

export type NotificationType = "blocker_assigned" | "sent_to_review" | "dependency_blocked" | "milestone_at_risk";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  message: string;
  resourceId: string | null;
  read: boolean;
  createdAt: string;
};

export async function getMyNotifications(): Promise<NotificationItem[]> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return [];

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      message: notifications.message,
      resourceId: notifications.resourceId,
      read: notifications.read,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  return rows.map((r) => ({
    id: r.id,
    type: r.type as NotificationType,
    message: r.message,
    resourceId: r.resourceId,
    read: r.read,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function markNotificationRead(id: string): Promise<{ success: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false };
  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)));
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function dismissNotification(id: string): Promise<{ success: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false };
  try {
    await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)));
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function markAllRead(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return;

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, session.user.id), eq(notifications.read, false)));
}
