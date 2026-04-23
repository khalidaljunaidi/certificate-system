import { describe, expect, it } from "vitest";

import {
  canFinalizeVendorEvaluation,
  canManageProjectStatus,
  canManageVendorGovernance,
  canRequestVendorEvaluation,
} from "@/lib/permissions";

describe("governance permissions", () => {
  it("allows administrators and procurement leadership roles", () => {
    expect(canManageProjectStatus("ADMIN")).toBe(true);
    expect(canManageProjectStatus("PROCUREMENT_DIRECTOR")).toBe(true);
    expect(canManageVendorGovernance("PROCUREMENT_LEAD")).toBe(true);
    expect(canRequestVendorEvaluation("PROCUREMENT_DIRECTOR")).toBe(true);
    expect(canFinalizeVendorEvaluation("PROCUREMENT_LEAD")).toBe(true);
  });

  it("keeps procurement specialist read-only for governance actions", () => {
    expect(canManageProjectStatus("PROCUREMENT_SPECIALIST")).toBe(false);
    expect(canManageVendorGovernance("PROCUREMENT_SPECIALIST")).toBe(false);
    expect(canRequestVendorEvaluation("PROCUREMENT_SPECIALIST")).toBe(false);
    expect(canFinalizeVendorEvaluation("PROCUREMENT_SPECIALIST")).toBe(false);
  });

  it("keeps the base procurement role read-only for governance actions", () => {
    expect(canManageProjectStatus("PROCUREMENT")).toBe(false);
    expect(canManageVendorGovernance("PROCUREMENT")).toBe(false);
    expect(canRequestVendorEvaluation("PROCUREMENT")).toBe(false);
    expect(canFinalizeVendorEvaluation("PROCUREMENT")).toBe(false);
  });
});
