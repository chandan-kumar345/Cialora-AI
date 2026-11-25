import React, { Suspense } from "react";
import { AuthExperience } from "@/components/AuthExperience";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <AuthExperience initialMode="forgot" />
    </Suspense>
  );
}
