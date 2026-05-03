import { NextResponse, type NextRequest } from "next/server";

import { getVendorRegistrationCityOptions } from "@/server/queries/vendor-registration-queries";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cities = await getVendorRegistrationCityOptions({
    countryCode: searchParams.get("countryCode") ?? undefined,
    coverageScope: searchParams.get("coverageScope") ?? undefined,
  });

  return NextResponse.json({
    cities,
  });
}
