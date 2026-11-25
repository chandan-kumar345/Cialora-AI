import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const auth = await getAuthContext();
  if (auth) {
    redirect("/dashboard");
  }
  redirect("/login");
}
