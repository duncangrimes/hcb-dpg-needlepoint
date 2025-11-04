import { prisma } from "@/lib/prisma";
import ProjectChatClient from "@/components/project/chat/project-chat-client";
import { notFound } from "next/navigation";
import { getProjectCanvases } from "@/actions/getProjectCanvases";

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

  // Use the server action to fetch initial canvases (no cursor = initial load)
  const result = await getProjectCanvases(projectId);
  
  // The oldest canvas (first in asc order) is used as cursor for loading older canvases
  const oldestCanvasCreatedAt = result.canvases.length > 0 
    ? result.canvases[0].createdAt || null
    : null;

  // Remove createdAt from the response as it's not in the CanvasRecord type used by client
  const canvasesForClient = result.canvases.map(({ createdAt, ...canvas }) => canvas);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        {project.name}
      </h1>
      <ProjectChatClient 
        projectId={project.id} 
        initialCanvases={canvasesForClient}
        hasMore={result.hasMore}
        oldestCanvasCreatedAt={oldestCanvasCreatedAt}
      />
    </div>
  );
}


