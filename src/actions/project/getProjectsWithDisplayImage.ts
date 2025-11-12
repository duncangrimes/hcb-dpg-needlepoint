"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImageType } from "@prisma/client";

/**
 * Fetch projects with a display image (latest MANUFACTURER image) for the authenticated user.
 */
export async function getProjectsWithDisplayImage() {
	const session = await auth();

	if (!session?.user?.id) {
		return [] as Array<{ id: string; name: string; displayImageUrl: string | null }>;
	}

	const projects = await prisma.project.findMany({
		where: {
			userId: session.user.id,
		},
		select: {
			id: true,
			name: true,
			images: {
				take: 1,
				orderBy: { createdAt: "desc" },
				where: { type: ImageType.MANUFACTURER },
				select: { url: true },
			},
		},
		orderBy: { name: "asc" },
	});

	return projects.map((p) => ({
		id: p.id,
		name: p.name,
		displayImageUrl: p.images[0]?.url ?? null,
	}));
}
