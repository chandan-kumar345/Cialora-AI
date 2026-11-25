import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { fromMinorUnits } from "@/lib/format";
import { sanitizeCsvCell } from "@/lib/security";

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const leads = await prisma.lead.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const header = [
      "Full Name",
      "Email",
      "Phone",
      "Company",
      "Country",
      "Source Channel",
      "Stage",
      `Estimated Value (${user.currency})`,
      "Tags",
      "Created At (UTC)",
    ]
      .map(sanitizeCsvCell)
      .join(",");

    const lines = leads.map((lead) =>
      [
        lead.fullName,
        lead.email ?? "",
        lead.phone ?? "",
        lead.company ?? "",
        lead.country ?? "",
        lead.sourceChannel,
        lead.stage,
        fromMinorUnits(lead.estimatedValueCents, user.currency),
        lead.tags,
        lead.createdAt.toISOString(),
      ]
        .map(sanitizeCsvCell)
        .join(",")
    );

    const csv = [header, ...lines].join("\r\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="cielora-leads-export.csv"',
        "Cache-Control": "no-store",
      },
    });
  });
}
