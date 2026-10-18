import { describe, expect, it } from "vitest";
import { can } from "./rbac";

describe("default-deny RBAC", () => {
  it("allows users to manage their own project capability", () => {
    expect(can("USER", "project:update")).toBe(true);
  });

  it("does not grant cross-user access to a regular user", () => {
    expect(can("USER", "project:read:any")).toBe(false);
    expect(can("USER", "project:delete:any")).toBe(false);
  });

  it("grants administrators explicit any-project permissions", () => {
    expect(can("ADMIN", "project:read:any")).toBe(true);
  });
});
