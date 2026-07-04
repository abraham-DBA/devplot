"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { checkIns, blockerLogs, modules, projects, activityLogs } from "@/lib/schema";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { BlockerType } from "@/lib/blocker-types";

export async function submitCheckIn(input: {
  shipped: string;
  next: string;
  blockerModuleId?: string;
  blockerDescription?: string;
  blockerType?: BlockerType;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  const todayStr = new Date().toISOString().slice(0, 10);

  const [existing] = await db
    .select({ id: checkIns.id })
    .from(checkIns)
    .where(
      and(
        eq(checkIns.organizationId, orgId),
        eq(checkIns.userId, session.user.id),
        eq(checkIns.date, todayStr),
      ),
    );

  if (existing) return { success: false, error: "Already checked in today." };

  const hasBlocker =
    typeof input.blockerModuleId === "string" &&
    input.blockerModuleId.length > 0 &&
    typeof input.blockerDescription === "string" &&
    input.blockerDescription.trim().length > 0;

  // Captured inside try so revalidatePaths can use them after the catch block.
  let createdBlockerModuleId: string | null = null;
  let createdBlockerProjectId: string | null = null;

  try {
    await db.insert(checkIns).values({
      id: randomUUID(),
      organizationId: orgId,
      userId: session.user.id,
      date: todayStr,
      shipped: input.shipped.trim(),
      next: input.next.trim(),
    });

    if (hasBlocker) {
      // Verify the module belongs to this org before inserting a blocker
      const orgProjectIds = (
        await db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.organizationId, orgId))
      ).map((p) => p.id);

      const [targetModule] = orgProjectIds.length > 0
        ? await db
            .select({ id: modules.id, projectId: modules.projectId })
            .from(modules)
            .where(
              and(
                eq(modules.id, input.blockerModuleId!),
                inArray(modules.projectId, orgProjectIds),
              ),
            )
        : [];

      if (targetModule) {
        await db.insert(blockerLogs).values({
          id: randomUUID(),
          moduleId: input.blockerModuleId!,
          reportedBy: session.user.id,
          description: input.blockerDescription!.trim(),
          type: input.blockerType ?? "external",
          resolved: false,
        });

        await db
          .update(modules)
          .set({ status: "blocked" })
          .where(eq(modules.id, input.blockerModuleId!));

        createdBlockerModuleId = input.blockerModuleId!;
        createdBlockerProjectId = targetModule.projectId;
      }
    }

    await db.insert(activityLogs).values({
      id: randomUUID(),
      organizationId: orgId,
      message: `${session.user.name} checked in`,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[actions/checkins] submitCheckIn", error);
    return { success: false, error: "Failed to submit check-in. Please try again." };
  }

  revalidatePath("/my-work");
  revalidatePath("/dashboard");
  if (createdBlockerProjectId && createdBlockerModuleId) {
    revalidatePath(`/projects/${createdBlockerProjectId}`);
    revalidatePath(`/projects/${createdBlockerProjectId}/modules/${createdBlockerModuleId}`);
  }
  return { success: true };
}
