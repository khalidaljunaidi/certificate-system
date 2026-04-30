export function formatSupplierCertificateCode(year: number, sequence: number) {
  return `TG-SUP-CERT-${year}-${String(sequence).padStart(6, "0")}`;
}

export function formatCountryLabel(countryCode: string, countryName?: string | null) {
  const normalizedCode = countryCode.trim().toUpperCase();

  if (normalizedCode === "SA") {
    return "Kingdom of Saudi Arabia";
  }

  const normalizedName = countryName?.trim();

  if (!normalizedName || /^all country$/i.test(normalizedName)) {
    return normalizedCode;
  }

  return normalizedName;
}

export function sanitizeBaseUrl(baseUrl?: string | null) {
  const trimmedBaseUrl = baseUrl?.trim();

  if (!trimmedBaseUrl) {
    return null;
  }

  return trimmedBaseUrl.replace(/\/+$/, "");
}

export function getFallbackBaseUrl() {
  return (
    sanitizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    sanitizeBaseUrl(process.env.NEXTAUTH_URL) ??
    "http://localhost:3000"
  );
}

export function resolveBaseUrlFromRequestHeaders(headers: {
  get(name: string): string | null;
}) {
  const origin = sanitizeBaseUrl(headers.get("origin"));
  const host = headers.get("host")?.trim();
  const forwardedProto = headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol = forwardedProto || "http";
  const headerBaseUrl = origin ?? (host ? `${protocol}://${host}` : null);

  return sanitizeBaseUrl(headerBaseUrl) ?? getFallbackBaseUrl();
}

export function formatVerificationUrl(requestNumber: string, baseUrl?: string | null) {
  const safeBaseUrl = sanitizeBaseUrl(baseUrl) ?? getFallbackBaseUrl();

  return new URL(
    `/verify/vendor-registration/${encodeURIComponent(requestNumber)}`,
    safeBaseUrl,
  ).toString();
}

export function formatCoverageScope(input: {
  coverageScope: string;
  countryCode: string;
  countryName?: string | null;
  selectedCities: Array<{
    name: string;
    region?: string | null;
  }>;
}) {
  const countryLabel = formatCountryLabel(input.countryCode, input.countryName);
  const normalizedScope = input.coverageScope.trim().toUpperCase();

  if (normalizedScope === "ALL_COUNTRY") {
    if (input.countryCode.trim().toUpperCase() === "SA") {
      return {
        title: "Kingdom-wide Coverage",
        locations: ["All regions within the Kingdom of Saudi Arabia"],
        additionalLocationCount: 0,
      };
    }

    return {
      title: `Nationwide Coverage – ${countryLabel}`,
      locations: [`All regions within ${countryLabel}`],
      additionalLocationCount: 0,
    };
  }

  if (normalizedScope === "SPECIFIC_CITIES") {
    const locations = input.selectedCities.map((city) =>
      city.region ? `${city.name} - ${city.region}` : city.name,
    );

    return {
      title: "Selected Operating Locations",
      locations: locations.slice(0, 10),
      additionalLocationCount: Math.max(0, locations.length - 10),
    };
  }

  const namedScopes: Record<string, string> = {
    GCC: "GCC Coverage",
    MENA: "MENA Coverage",
    EU: "EU Coverage",
    GLOBAL: "Global Coverage",
  };

  return {
    title:
      namedScopes[normalizedScope] ??
      normalizedScope
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    locations: ["Approved operating coverage as submitted"],
    additionalLocationCount: 0,
  };
}
