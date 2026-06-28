"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const VALID_ROLES = ["developer", "team_lead", "project_manager"] as const;
type Role = (typeof VALID_ROLES)[number];

export async function completeOnboarding(
  role: Role,
): Promise<{ success: boolean; error?: string }> {
  if (!VALID_ROLES.includes(role)) {
    return { success: false, error: "Invalid role selected." };
  }
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    await db.update(user).set({ role, onboardingCompleted: true }).where(eq(user.id, session.user.id));
    revalidatePath("/dashboard");
    revalidatePath("/profile");
  } catch (error) {
    console.error("[actions/users] completeOnboarding", error);
    return { success: false, error: "Failed to save your role. Please try again." };
  }
  redirect("/dashboard");
}

// ── updateProfile ─────────────────────────────────────────────────────────────

export async function updateProfile(input: {
  name: string;
  role: Role;
}): Promise<{ success: boolean; error?: string }> {
  const { name, role } = input;

  if (!name.trim()) return { success: false, error: "Display name is required." };
  if (!VALID_ROLES.includes(role)) return { success: false, error: "Invalid role selected." };

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await db
      .update(user)
      .set({ name: name.trim(), role })
      .where(eq(user.id, session.user.id));

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[actions/users] updateProfile", error);
    return { success: false, error: "Failed to save changes. Please try again." };
  }
}
