import React, { Suspense } from "react";
import { AuthExperience } from "@/components/AuthExperience";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={null}>
      <AuthExperience initialMode="reset" resetToken={params.token ?? ""} />
    </Suspense>
  );
}
