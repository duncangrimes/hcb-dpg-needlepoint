"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Fetches projects for the authenticated user.
 * Designed with pagination for future scalability.
 * @param {object} params - The parameters for fetching projects.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=12] - The number of items per page.
 */
export async function getProjects({ page = 1, limit = 12 }: { page?: number, limit?: number }) {
    const session = await auth();

    if (!session?.user?.id) {
        return [];
    }

    const projects = await prisma.project.findMany({
        where: {
            userId: session.user.id,
        },
        include: {
          canvases: {
              take: 1,
              orderBy: {
                  createdAt: 'desc',
              },
          },
        },
        orderBy: {
            name: 'asc',
        },
        // For actual pagination in the future:
        // take: limit,
        // skip: (page - 1) * limit,
    });

    return projects;
}
