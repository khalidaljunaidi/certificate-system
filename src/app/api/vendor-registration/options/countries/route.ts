import { NextResponse } from "next/server";

import { getVendorRegistrationCountryOptions } from "@/server/queries/vendor-registration-queries";

export async function GET() {
  const countries = await getVendorRegistrationCountryOptions();

  return NextResponse.json({
    countries,
  });
}
