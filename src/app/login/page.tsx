import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { AuthExperience } from "@/components/AuthExperience";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const auth = await getAuthContext();
  if (auth) {
    redirect("/dashboard");
  }
  return (
    <Suspense fallback={null}>
      <AuthExperience initialMode="login" />
    </Suspense>
  );
}
