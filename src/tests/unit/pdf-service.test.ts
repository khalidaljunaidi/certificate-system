import { describe, expect, it } from "vitest";

import { buildCertificatePdfModel } from "@/server/services/pdf-service";

describe("buildCertificatePdfModel", () => {
  it("reduces font sizes when vendor and summary content are long", async () => {
    const model = await buildCertificatePdfModel({
      id: "cert_1",
      certificateCode: "TGCC-TG-RYD-2401-001",
      issueDate: new Date("2026-04-10"),
      completionDate: new Date("2026-04-07"),
      totalAmount: {
        toString: () => "1865000.00",
      },
      executedScopeSummary:
        "A".repeat(500),
      poNumber: "PO-RYD-1008",
      contractNumber: "CNT-RYD-2031",
      issuedAt: new Date("2026-04-12"),
      clientName: "Sara Al-Ghamdi",
      clientTitle: "Client Director",
      approverName: "Amani Al-Harbi",
      approverTitle: "Head of Procurement",
      pmName: "Mohammed Al-Saeed",
      pmTitle: "Project Manager",
      project: {
        projectName: "Riyadh Activation Campus",
        projectCode: "TG-RYD-2401",
        projectLocation: "Riyadh, KSA",
      },
      vendor: {
        vendorName:
          "Najd Event Structures and Technical Delivery Consortium Limited",
      },
    });

    expect(model.summaryFontSize).toBeLessThan(9);
    expect(model.vendorFontSize).toBeLessThan(21);
    expect(model.executedScopeSummary.endsWith("...")).toBe(true);
  });
});
