'use client'

import { createProject } from "@/actions/project/createProject";
import { getProjects } from "@/actions/project/getProjects";
import { getProjectsWithDisplayImage } from "@/actions/project/getProjectsWithDisplayImage";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useActionState, useState, useCallback } from "react";
import { useFormStatus } from "react-dom";
import { ProjectCard } from "@/components/dashboard/project-card";

type ProjectForDashboard = Awaited<ReturnType<typeof getProjectsWithDisplayImage>>[number];

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:mt-0 sm:ml-3 sm:w-auto disabled:bg-indigo-400 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500 dark:disabled:bg-indigo-300"
    >
      {pending ? "Creating..." : "Create"}
    </button>
  );
}

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [projects, setProjects] = useState<ProjectForDashboard[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const [state, formAction] = useActionState(createProject, { message: "" });

  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    const userProjects = await getProjectsWithDisplayImage();
    setProjects(userProjects);
    setIsLoadingProjects(false);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
    if (status === 'authenticated') {
      fetchProjects();
    }
  }, [status, router, fetchProjects]);

  useEffect(() => {
    // On successful submission, the server action returns an empty message.
    if (state.message === "") {
      formRef.current?.reset();
      // Re-fetch projects to show the newly created one
      fetchProjects();
    }
  }, [state, fetchProjects]);

  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (status !== 'authenticated') {
    return null; // Render nothing while redirecting
  }
  return (
    <div className="">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
         <div className="bg-white shadow-sm sm:rounded-lg dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <div className="px-4 py-5 sm:p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Create a new project.</h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
                </div>
                <form ref={formRef} action={formAction} className="mt-5 sm:flex sm:items-center">
                <div className="w-full sm:max-w-xs">
                    <input
                   id="project-name"
                      name="project-name"
                      type="text"
                      placeholder="My awesome project"
                      aria-label="Project name"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-400 dark:focus:outline-indigo-500"
                    />
                </div>
                 <SubmitButton />
                </form>
                {state.message && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.message}</p>}
            </div>
        </div>

        {isLoadingProjects ? (
          <div className="p-8 text-center">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No projects yet. Create one above!</div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                imageUrl={project.displayImageUrl}
                onDeleted={fetchProjects}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}