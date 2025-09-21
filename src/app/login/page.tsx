import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h1 style={{ textAlign: "center" }}>Login / Sign Up</h1>
      <form
        action={async (formData) => {
          "use server";
          const email = formData.get("email") as string;
          // The user will be redirected to the verification page
          // and after clicking the link in the email, they will be
          // redirected to the homepage.
          await signIn("resend", { email, redirectTo: "/" });
        }}
        style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "20px" }}
      >
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" required style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }} />
        <button type="submit" style={{ padding: "10px", borderRadius: "4px", border: "none", backgroundColor: "#0070f3", color: "white", cursor: "pointer" }}>Sign in with Email</button>
      </form>
    </div>
  );
}
