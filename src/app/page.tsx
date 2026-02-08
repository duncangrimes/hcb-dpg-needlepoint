import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  
  if (session?.user) {
    // Logged in users go to their dashboard
    redirect("/dashboard");
  } else {
    // Anonymous users go straight to the editor (try before signup)
    redirect("/editor");
  }
}
