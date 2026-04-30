import type { OdooSyncStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { compactText } from "@/lib/utils";
import {
  syncVendorPartnerToOdoo,
  type OdooVendorSyncPayload,
  type OdooVendorSyncResult,
} from "@/server/services/odoo-service";
import { logSystemError } from "@/server/services/system-error-service";

type VendorSyncTarget = {
  vendorId: string;
  registrationRequestId?: string | null;
  userId?: string | null;
};

type VendorSyncRecord = {
  vendor: {
    id: string;
    vendorName: string;
    vendorEmail: string;
    vendorPhone: string | null;
    vendorId: string;
    odooPartnerId: number | null;
  };
  registrationRequest:
    | {
        id: string;
        requestNumber: string;
        vatNumber: string;
        countryCode: string;
        district: string;
        region: string | null;
        country: {
          name: string;
        };
        selectedCities: Array<{
          city: {
            name: string;
          };
        }>;
      }
    | null;
};

function buildPayload(record: VendorSyncRecord): OdooVendorSyncPayload {
  const registration = record.registrationRequest;
  const city =
    registration?.selectedCities[0]?.city.name ??
    registration?.region ??
    registration?.district ??
    null;

  return {
    name: record.vendor.vendorName,
    email: record.vendor.vendorEmail,
    phone: record.vendor.vendorPhone,
    vat: registration?.vatNumber ?? null,
    countryCode: registration?.countryCode ?? null,
    countryName: registration?.country.name ?? null,
    city,
    existingPartnerId: record.vendor.odooPartnerId,
  };
}

function buildSyncData(result: OdooVendorSyncResult) {
  if (result.status === "SYNCED") {
    return {
      odooSyncStatus: "SYNCED" as OdooSyncStatus,
      odooPartnerId: result.partnerId,
      odooSyncError: null,
      odooSyncedAt: result.syncedAt,
    };
  }

  return {
    odooSyncStatus: "FAILED" as OdooSyncStatus,
    odooSyncError: compactText(result.error, 1000),
  };
}

async function loadVendorSyncRecord(
  target: VendorSyncTarget,
): Promise<VendorSyncRecord | null> {
  const vendor = await prisma.vendor.findUnique({
    where: {
      id: target.vendorId,
    },
    select: {
      id: true,
      vendorName: true,
      vendorEmail: true,
      vendorPhone: true,
      vendorId: true,
      odooPartnerId: true,
      registrationRequests: {
        where: target.registrationRequestId
          ? {
              id: target.registrationRequestId,
            }
          : undefined,
        orderBy: {
          submittedAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          requestNumber: true,
          vatNumber: true,
          countryCode: true,
          district: true,
          region: true,
          country: {
            select: {
              name: true,
            },
          },
          selectedCities: {
            orderBy: {
              createdAt: "asc",
            },
            take: 1,
            select: {
              city: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!vendor) {
    return null;
  }

  return {
    vendor,
    registrationRequest: vendor.registrationRequests[0] ?? null,
  };
}

async function updateSyncStatus(
  target: VendorSyncTarget,
  result: OdooVendorSyncResult,
) {
  const data = buildSyncData(result);

  await prisma.$transaction([
    prisma.vendor.update({
      where: {
        id: target.vendorId,
      },
      data,
    }),
    ...(target.registrationRequestId
      ? [
          prisma.vendorRegistrationRequest.update({
            where: {
              id: target.registrationRequestId,
            },
            data,
          }),
        ]
      : []),
  ]);
}

async function markPending(target: VendorSyncTarget) {
  const data = {
    odooSyncStatus: "PENDING" as OdooSyncStatus,
    odooSyncError: null,
  };

  await prisma.$transaction([
    prisma.vendor.update({
      where: {
        id: target.vendorId,
      },
      data,
    }),
    ...(target.registrationRequestId
      ? [
          prisma.vendorRegistrationRequest.update({
            where: {
              id: target.registrationRequestId,
            },
            data,
          }),
        ]
      : []),
  ]);
}

async function logOdooSyncFailure(
  target: VendorSyncTarget,
  record: VendorSyncRecord | null,
  result: OdooVendorSyncResult,
) {
  if (result.status !== "FAILED") {
    return;
  }

  await logSystemError({
    action: "OdooVendorSync",
    error: new Error(result.error),
    userId: target.userId ?? null,
    severity: "WARNING",
    context: {
      vendorId: target.vendorId,
      registrationRequestId: target.registrationRequestId ?? null,
      requestNumber: record?.registrationRequest?.requestNumber ?? null,
      vendorName: record?.vendor.vendorName ?? null,
      odooDiagnostics: result.diagnostics ?? null,
    },
  });
}

export async function syncVendorToOdoo(
  target: VendorSyncTarget,
): Promise<OdooVendorSyncResult> {
  const record = await loadVendorSyncRecord(target);

  if (!record) {
    return {
      status: "FAILED",
      partnerId: null,
      syncedAt: null,
      error: "Vendor record not found for Odoo sync.",
    };
  }

  const result = await syncVendorPartnerToOdoo(buildPayload(record));

  await updateSyncStatus(
    {
      ...target,
      registrationRequestId:
        target.registrationRequestId ?? record.registrationRequest?.id ?? null,
    },
    result,
  );
  await logOdooSyncFailure(target, record, result);

  return result;
}

export async function retryVendorOdooSync(
  target: VendorSyncTarget,
): Promise<OdooVendorSyncResult> {
  const record = await loadVendorSyncRecord(target);

  if (!record) {
    return {
      status: "FAILED",
      partnerId: null,
      syncedAt: null,
      error: "Vendor record not found for Odoo sync.",
    };
  }

  const normalizedTarget = {
    ...target,
    registrationRequestId:
      target.registrationRequestId ?? record.registrationRequest?.id ?? null,
  };

  await markPending(normalizedTarget);
  const result = await syncVendorPartnerToOdoo(buildPayload(record));
  await updateSyncStatus(normalizedTarget, result);
  await logOdooSyncFailure(normalizedTarget, record, result);

  return result;
}
