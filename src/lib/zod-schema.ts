import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});

export const ProjectSchema = z.object({
  name: z.string().min(1, { message: "Project name is required." }).max(24, { message: "Project name must be 24 characters or less." }),
});