"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { user, organizations, organizationMembers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { randomBytes, randomUUID } from "crypto";

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

const VALID_MEMBER_ROLES = ["developer", "team_lead", "project_manager"] as const;
type MemberRole = (typeof VALID_MEMBER_ROLES)[number];

const VALID_PROFILE_ROLES = ["developer", "team_lead", "project_manager"] as const;
type ProfileRole = (typeof VALID_PROFILE_ROLES)[number];

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
  const inviteCode = randomBytes(8).toString("hex");

  try {
    await db.transaction(async (tx) => {
      await tx.insert(organizations).values({
        id: orgId,
        name: name.trim(),
        description: description.trim(),
        industry,
        size,
        ownerId: session.user.id,
        inviteCode,
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
  role: MemberRole,
): Promise<{ success: boolean; error?: string }> {
  if (!VALID_MEMBER_ROLES.includes(role)) {
    return { success: false, error: "Invalid role selected." };
  }

  // Session and pre-checks outside try/catch so redirect() propagates correctly.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (session.user.onboardingCompleted) {
    return { success: false, error: "You are already part of an organization." };
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.inviteCode, code));

  if (!org) return { success: false, error: "Invalid invite link." };

  // Check for existing membership scoped to THIS org — not just any org.
  const [existing] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, session.user.id),
        eq(organizationMembers.organizationId, org.id),
      ),
    );

  if (existing) {
    redirect("/dashboard");
  }

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
  role: ProfileRole;
}): Promise<{ success: boolean; error?: string }> {
  const { name, role } = input;

  if (!name.trim()) return { success: false, error: "Display name is required." };
  if (!VALID_PROFILE_ROLES.includes(role)) return { success: false, error: "Invalid role selected." };

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    if (session.user.role === "owner") {
      return { success: false, error: "Owner role cannot be changed." };
    }

    const orgId = session.user.organizationId;

    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({ name: name.trim(), role })
        .where(eq(user.id, session.user.id));

      // Keep organizationMembers.role in sync so team page reflects the change.
      if (orgId) {
        await tx
          .update(organizationMembers)
          .set({ role })
          .where(
            and(
              eq(organizationMembers.userId, session.user.id),
              eq(organizationMembers.organizationId, orgId),
            ),
          );
      }
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("[actions/users] updateProfile", error);
    return { success: false, error: "Failed to save changes. Please try again." };
  }
}
