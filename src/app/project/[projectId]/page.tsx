import { prisma } from "@/lib/prisma";
import { ImageUploader } from "@/components/project/image-uploader";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
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

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
          <ImageUploader projectId={project.id} />
        </div>

        {project.images.length === 0 ? (
          <div className="mt-10 text-center text-gray-500 dark:text-gray-400">
            No images yet. Upload one above.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {project.images.map((img) => (
              <div key={img.id} className="rounded-lg outline -outline-offset-1 outline-gray-200 dark:outline-white/10 overflow-hidden bg-white dark:bg-gray-800">
                <img alt={project.title} src={img.url} className="w-full h-64 object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
