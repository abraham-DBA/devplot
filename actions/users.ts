"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { user, organizations, organizationMembers, inviteLinks } from "@/lib/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { randomUUID } from "crypto";

type OrgSize = "1-10" | "11-50" | "51-200" | "201-500" | "500+";
const VALID_SIZES: OrgSize[] = ["1-10", "11-50", "51-200", "201-500", "500+"];

const VALID_INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "E-commerce",
  "Marketing",
  "Retail",
  "Other",
] as const;

// ── completeOnboarding ────────────────────────────────────────────────────────

type OnboardingInput = {
  name: string;
  description: string;
  industry: string;
  size: OrgSize;
};

export async function completeOnboarding(
  input: OnboardingInput,
): Promise<{ success: boolean; error?: string }> {
  const { name, description, industry, size } = input;

  if (!name.trim()) return { success: false, error: "Company name is required." };
  if (!description.trim()) return { success: false, error: "Description is required." };
  if (!VALID_INDUSTRIES.includes(industry as (typeof VALID_INDUSTRIES)[number])) {
    return { success: false, error: "Invalid industry." };
  }
  if (!VALID_SIZES.includes(size)) {
    return { success: false, error: "Invalid team size." };
  }

  // Session and idempotent guard live OUTSIDE the try/catch so redirect() propagates correctly.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (session.user.onboardingCompleted) {
    redirect("/dashboard");
  }

  const orgId = randomUUID();
  const memberId = randomUUID();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(organizations).values({
        id: orgId,
        name: name.trim(),
        description: description.trim(),
        industry,
        size,
        ownerId: session.user.id,
      });

      await tx.insert(organizationMembers).values({
        id: memberId,
        organizationId: orgId,
        userId: session.user.id,
        role: "owner",
      });

      await tx
        .update(user)
        .set({ organizationId: orgId, role: "owner", onboardingCompleted: true })
        .where(eq(user.id, session.user.id));
    });

    revalidatePath("/dashboard");
    revalidatePath("/profile");
  } catch (error) {
    console.error("[actions/users] completeOnboarding", error);
    return { success: false, error: "Failed to create workspace. Please try again." };
  }

  redirect("/dashboard");
}

// ── joinOrganization ──────────────────────────────────────────────────────────

export async function joinOrganization(
  code: string,
): Promise<{ success: boolean; error?: string }> {
  // Session and pre-checks outside try/catch so redirect() propagates correctly.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (session.user.onboardingCompleted) {
    return { success: false, error: "You are already part of an organization." };
  }

  const now = new Date();

  const [invite] = await db
    .select()
    .from(inviteLinks)
    .where(and(eq(inviteLinks.code, code), isNull(inviteLinks.usedAt)));

  if (!invite) return { success: false, error: "Invalid invite link." };
  if (invite.expiresAt <= now) return { success: false, error: "This invite link has expired. Ask your workspace owner for a new one." };
  if (invite.email !== session.user.email?.toLowerCase())
    return { success: false, error: "This invite was sent to a different email address." };

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, invite.organizationId));

  if (!org) return { success: false, error: "Organization not found." };

  // Check for existing membership — redirect outside try/catch so it propagates correctly.
  const [existing] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, session.user.id),
        eq(organizationMembers.organizationId, org.id),
      ),
    );

  if (existing) redirect("/dashboard");

  const role = invite.role;

  try {
    await db.transaction(async (tx) => {
      await tx.insert(organizationMembers).values({
        id: randomUUID(),
        organizationId: org.id,
        userId: session.user.id,
        role,
      });

      await tx
        .update(user)
        .set({ organizationId: org.id, role, onboardingCompleted: true })
        .where(eq(user.id, session.user.id));

      await tx
        .update(inviteLinks)
        .set({ usedAt: now })
        .where(eq(inviteLinks.id, invite.id));
    });

    revalidatePath("/dashboard");
  } catch (error) {
    console.error("[actions/users] joinOrganization", error);
    return { success: false, error: "Failed to join workspace. Please try again." };
  }

  redirect("/dashboard");
}

// ── updateProfile ─────────────────────────────────────────────────────────────

export async function updateProfile(input: {
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  const { name } = input;

  if (!name.trim()) return { success: false, error: "Display name is required." };

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await db.update(user).set({ name: name.trim() }).where(eq(user.id, session.user.id));

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[actions/users] updateProfile", error);
    return { success: false, error: "Failed to save changes. Please try again." };
  }
}
