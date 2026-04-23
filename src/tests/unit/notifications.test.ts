import { describe, expect, it } from "vitest";

import { getNotificationHref } from "@/lib/notifications";

describe("getNotificationHref", () => {
  it("prefers the certificate detail page when project and certificate are present", () => {
    expect(
      getNotificationHref({
        id: "n1",
        type: "CERTIFICATE_CREATED",
        eventKey: null,
        severity: "INFO",
        title: "Created",
        message: "Created",
        createdAt: new Date(),
        read: false,
        actionedAt: null,
        relatedProjectId: "project-1",
        relatedCertificateId: "certificate-1",
        relatedVendorId: "vendor-1",
        relatedProjectVendorId: null,
        relatedTaskId: null,
        href: null,
      }),
    ).toBe("/admin/projects/project-1/certificates/certificate-1");
  });

  it("routes vendor-governance notifications to the vendor workspace", () => {
    expect(
      getNotificationHref({
        id: "n2",
        type: "VENDOR_EVALUATION_REQUESTED",
        eventKey: null,
        severity: "INFO",
        title: "Evaluation requested",
        message: "Vendor evaluation requested",
        createdAt: new Date(),
        read: false,
        actionedAt: null,
        relatedProjectId: null,
        relatedCertificateId: null,
        relatedVendorId: "vendor-2",
        relatedProjectVendorId: null,
        relatedTaskId: null,
        href: null,
      }),
    ).toBe("/admin/vendors/vendor-2");
  });
});
