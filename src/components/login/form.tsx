'use client'

import { loginWithEmail } from "@/actions/auth/loginWithEmail";
import { LoginSchema } from "@/lib/zod-schema";
import { useState } from "react";

export function LoginForm() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h1 style={{ textAlign: "center" }}>Login / Sign Up</h1>
      <form action={loginWithEmail} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "20px" }}>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
          onChange={(e) => {
            const result = LoginSchema.safeParse({ email: e.target.value });
            if (!result.success) {
              setErrorMessage(result.error.issues[0].message);
            } else {
              setErrorMessage(null);
            }
          }}
        />
        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
        <button type="submit" style={{ padding: "10px", borderRadius: "4px", border: "none", backgroundColor: "#0070f3", color: "white", cursor: "pointer" }}>Sign in with Email</button>
      </form>
    </div>
  );
}


