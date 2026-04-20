import { describe, expect, it } from "vitest";

import { hashToken } from "@/server/services/token-service";

describe("hashToken", () => {
  it("returns a deterministic sha256 hash", () => {
    expect(hashToken("demo-token")).toBe(
      "7c43ef5ae21d43ce2743f770c68e24def1a43ee2f416d2438410c8af7af2ff2c",
    );
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });
});
