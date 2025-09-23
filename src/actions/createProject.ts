"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectSchema } from "@/lib/zod-schema";
import { revalidatePath } from "next/cache";

export async function createProject(prevState: { message: string }, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "Not authenticated." };
  }

  const validatedFields = ProjectSchema.safeParse({
    name: formData.get("project-name"),
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields.error.flatten().fieldErrors.name?.[0] ?? "Invalid input.",
    };
  }

  await prisma.project.create({
    data: {
      title: validatedFields.data.name,
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard");
  return { message: "" }; // Success: clear message and trigger form reset
}