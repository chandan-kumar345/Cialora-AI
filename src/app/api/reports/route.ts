import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/lib/auth";
import { getWorkspaceReport } from "@/lib/analytics";
import { apiOk } from "@/lib/security";

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const range = request.nextUrl.searchParams.get("range");
    const report = await getWorkspaceReport(user.id, range);
    return apiOk(report);
  });
}
