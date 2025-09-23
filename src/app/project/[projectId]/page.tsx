import { prisma } from "@/lib/prisma";
import { ImageUploader } from "@/components/project/image-uploader";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  noStore();
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { images: { orderBy: { id: "desc" } } },
  });

  if (!project) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">Project not found.</div>
    );
  }

  if (project.userId !== session.user.id) {
    redirect("/dashboard");
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-start gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
          <ImageUploader projectId={project.id} />
        </div>

        {project.images.length === 0 ? (
          <div className="mt-6 text-left text-gray-500 dark:text-gray-400">
            No images yet. Upload one above.
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {project.images.map((img) => (
              <div key={img.id} className="w-full rounded-lg outline -outline-offset-1 outline-gray-200 dark:outline-white/10 overflow-hidden bg-white dark:bg-gray-800">
                <img alt={project.title} src={img.url} className="w-full h-auto max-h-[28rem] object-contain bg-gray-50 dark:bg-gray-900" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
