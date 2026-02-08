"use server";

import { signIn } from "@/lib/auth";
import { LoginSchema } from "@/lib/zod-schema";

export async function loginWithEmail(formData: FormData) {
  const data = { email: formData.get("email") };

  const result = LoginSchema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.issues[0].message);
  }

  // Auth.js pages.verifyRequest is set to '/login?verify=1'
  // so after sending the email, it redirects back to login with query param
  await signIn("resend", { 
    email: result.data.email,
    redirectTo: "/dashboard" 
  });
}