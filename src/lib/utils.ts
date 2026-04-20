import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

import { getAppUrl } from "@/lib/env";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  return format(new Date(value), "dd MMM yyyy");
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  return format(new Date(value), "dd MMM yyyy, hh:mm a");
}

export function formatSarAmount(value: number | string) {
  const numericValue = typeof value === "number" ? value : Number(value);

  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(numericValue);
}

export function absoluteUrl(pathname: string) {
  return new URL(pathname, getAppUrl()).toString();
}

export function buildVerifyUrl(certificateCode: string) {
  return absoluteUrl(`/verify/${certificateCode}`);
}

export function buildPmApprovalUrl(token: string) {
  return absoluteUrl(`/pm-approval/${token}`);
}

export function parsePositiveInt(value: string | null | undefined, fallback = 1) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function compactText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function nullableString(value: FormDataEntryValue | null) {
  if (!value) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}
