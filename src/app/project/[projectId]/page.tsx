import { prisma } from "@/lib/prisma";
import ProjectChatClient from "@/components/project/chat/project-chat-client";
import { notFound } from "next/navigation";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });
  if (!project) return notFound();

  const canvases = await prisma.canvas.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      meshCount: true,
      width: true,
      numColors: true,
      images: { select: { id: true, url: true, type: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        {project.name}
      </h1>
      <ProjectChatClient projectId={project.id} initialCanvases={canvases} />
    </div>
  );
}


