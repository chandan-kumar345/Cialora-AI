import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/lib/auth";
import { apiOk } from "@/lib/security";

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    return apiOk({ user });
  });
}
