import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/lib/auth";
import { getCampaignOverview } from "@/lib/analytics";
import { apiOk } from "@/lib/security";

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const overview = await getCampaignOverview(user.id);
    return apiOk(overview);
  });
}
