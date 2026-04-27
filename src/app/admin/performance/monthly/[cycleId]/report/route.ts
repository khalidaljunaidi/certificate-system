import { NextResponse } from "next/server";

import { getCurrentAuthenticatedUser } from "@/lib/auth";
import { canEvaluateTeamPerformance } from "@/lib/permissions";
import { getMonthlyGovernanceDashboard } from "@/server/queries/performance-queries";
import { generateMonthlyPerformancePdfBuffer } from "@/server/services/monthly-performance-report-service";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      cycleId: string;
    }>;
  },
) {
  const user = await getCurrentAuthenticatedUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!canEvaluateTeamPerformance(user)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { cycleId } = await context.params;
  const dashboard = await getMonthlyGovernanceDashboard(
    {
      id: user.id,
      role: user.role,
      email: user.email,
      permissions: user.permissions,
    },
    cycleId,
  );

  if (!dashboard.selectedCycle) {
    return new NextResponse("Not found", { status: 404 });
  }

  const pdfBuffer = await generateMonthlyPerformancePdfBuffer(dashboard);

  return new NextResponse(Buffer.from(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${dashboard.selectedCycle.label.replaceAll(" ", "-")}-monthly-report.pdf"`,
    },
  });
}
