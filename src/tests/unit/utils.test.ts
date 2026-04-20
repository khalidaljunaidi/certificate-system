import { describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://certificates.thegatheringksa.com");

const { buildPmApprovalUrl, buildVerifyUrl, compactText } = await import(
  "@/lib/utils"
);

describe("URL builders", () => {
  it("builds a public verification URL", () => {
    expect(buildVerifyUrl("TGCC-TG-RYD-2401-001")).toBe(
      "https://certificates.thegatheringksa.com/verify/TGCC-TG-RYD-2401-001",
    );
  });

  it("builds a PM approval URL", () => {
    expect(buildPmApprovalUrl("secure-token")).toBe(
      "https://certificates.thegatheringksa.com/pm-approval/secure-token",
    );
  });
});

describe("compactText", () => {
  it("returns the same value when text fits", () => {
    expect(compactText("Short text", 40)).toBe("Short text");
  });

  it("truncates long text with ellipsis", () => {
    expect(compactText("abcdefghijklmnopqrstuvwxyz", 12)).toBe("abcdefghi...");
  });
});
