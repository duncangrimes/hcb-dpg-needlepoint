import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { ProjectPageClient } from "./ProjectPageClient";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  noStore();
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { 
      canvases: { 
        orderBy: { createdAt: "desc" },
        include: {
          images: {
            orderBy: { createdAt: "desc" }
          }
        }
      } 
    },
  });

  if (!project) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">Project not found.</div>
    );
  }

  if (project.userId !== session.user.id) {
    redirect("/dashboard");
  }

  const projectForClient = {
    ...project,
    name: project.name,
  } satisfies Parameters<typeof ProjectPageClient>[0]["project"];

  return <ProjectPageClient project={projectForClient} />;
}
