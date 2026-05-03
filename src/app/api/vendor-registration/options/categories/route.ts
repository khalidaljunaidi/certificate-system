import { NextResponse } from "next/server";

import { getVendorRegistrationCategoryOptions } from "@/server/queries/vendor-registration-queries";

export async function GET() {
  const categories = await getVendorRegistrationCategoryOptions();

  return NextResponse.json({
    categories,
  });
}
