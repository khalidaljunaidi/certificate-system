import { NextResponse } from "next/server";

import { getCurrentAuthenticatedUser } from "@/lib/auth";
import { canEvaluateTeamPerformance, canViewOwnPerformance } from "@/lib/permissions";
import { getQuarterlyPerformanceReviewDetail } from "@/server/queries/performance-queries";
import { generatePerformanceReviewPdfBuffer } from "@/server/services/performance-report-service";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      reviewId: string;
    }>;
  },
) {
  const user = await getCurrentAuthenticatedUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (
    !canEvaluateTeamPerformance(user.role, user.email) &&
    !canViewOwnPerformance(user.email)
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { reviewId } = await context.params;
  const review = await getQuarterlyPerformanceReviewDetail(
    {
      id: user.id,
      role: user.role,
      email: user.email,
    },
    reviewId,
  );

  if (!review) {
    return new NextResponse("Not found", { status: 404 });
  }

  const pdfBuffer = await generatePerformanceReviewPdfBuffer(review);

  return new NextResponse(Buffer.from(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${review.employee.name.replaceAll(" ", "-")}-Q${review.quarter}-${review.year}.pdf"`,
    },
  });
}
