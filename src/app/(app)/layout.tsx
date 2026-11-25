import React from "react";
import { redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { WorkspaceProvider } from "@/components/WorkspaceProvider";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let auth;
  try {
    auth = await requireAuthContext();
  } catch {
    redirect("/login");
  }

  return (
    <WorkspaceProvider
      initialUser={{
        ...auth.user,
        createdAt: auth.user.createdAt.toISOString(),
      }}
    >
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
