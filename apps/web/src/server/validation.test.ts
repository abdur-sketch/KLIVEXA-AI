import { describe, expect, it } from "vitest";
import { createProjectSchema, registerSchema, updateProjectSchema } from "./validation";

describe("Phase 1 validation", () => {
  it("accepts a strong registration payload", () => {
    expect(registerSchema.safeParse({ name: "Alya", email: "ALYA@example.com", password: "Strong!Pass123" }).success).toBe(true);
  });

  it.each(["short", "alllowercase123!", "NOLOWERCASE123!", "NoNumber!Password"])("rejects weak password %s", (password) => {
    expect(registerSchema.safeParse({ name: "Alya", email: "alya@example.com", password }).success).toBe(false);
  });

  it("trims project input and rejects empty updates", () => {
    expect(createProjectSchema.parse({ title: "  Podcast  " }).title).toBe("Podcast");
    expect(updateProjectSchema.safeParse({}).success).toBe(false);
  });
});
