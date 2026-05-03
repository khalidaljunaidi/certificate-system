import { NextResponse, type NextRequest } from "next/server";

import { getVendorRegistrationSubcategoryOptions } from "@/server/queries/vendor-registration-queries";

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("categoryId")?.trim();

  if (!categoryId) {
    return NextResponse.json({
      subcategories: [],
    });
  }

  const subcategories = await getVendorRegistrationSubcategoryOptions(categoryId);

  return NextResponse.json({
    subcategories,
  });
}
