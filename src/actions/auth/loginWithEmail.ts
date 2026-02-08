"use server";

import { signIn } from "@/lib/auth";
import { LoginSchema } from "@/lib/zod-schema";

export async function loginWithEmail(formData: FormData) {
  const data = { email: formData.get("email") };

  const result = LoginSchema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.issues[0].message);
  }

  // redirect: false prevents Auth.js from redirecting to verify-request page
  // We handle the UI feedback in the login form with toast + inline hint
  await signIn("resend", { 
    email: result.data.email, 
    redirect: false,
    redirectTo: "/dashboard" 
  });

  return { success: true, email: result.data.email };
}