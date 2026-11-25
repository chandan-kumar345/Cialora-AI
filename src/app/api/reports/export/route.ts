import { NextRequest, NextResponse } from "next/server";
import { withProtectedRoute } from "@/lib/auth";
import { getWorkspaceReport } from "@/lib/analytics";
import { fromMinorUnits } from "@/lib/format";
import { sanitizeCsvCell } from "@/lib/security";

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const range = request.nextUrl.searchParams.get("range");
    const format = request.nextUrl.searchParams.get("format") ?? "csv";
    const report = await getWorkspaceReport(user.id, range);

    if (format === "json") {
      return new NextResponse(
        JSON.stringify(
          {
            workspace: user.workspaceName,
            currency: user.currency,
            locale: user.locale,
            timezone: user.timezone,
            exportedAtUtc: new Date().toISOString(),
            report,
          },
          null,
          2
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="cielora-report-${report.performance.range}.json"`,
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const header = [
      "Channel",
      "Campaigns",
      "Messages Sent",
      "Delivered",
      "Clicks",
      "Leads",
      `Revenue (${user.currency})`,
    ]
      .map(sanitizeCsvCell)
      .join(",");

    const rows = report.channelBreakdown.map((ch) =>
      [
        ch.channel,
        ch.campaigns,
        ch.sent,
        ch.delivered,
        ch.clicks,
        ch.leads,
        fromMinorUnits(ch.revenueCents, user.currency),
      ]
        .map(sanitizeCsvCell)
        .join(",")
    );

    const csv = [header, ...rows].join("\r\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cielora-report-${report.performance.range}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
