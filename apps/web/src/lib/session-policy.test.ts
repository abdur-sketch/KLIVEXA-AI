import { describe, expect, it } from "vitest";
import { isSessionActive, sessionTtlSeconds } from "./session-policy";

describe("session policy", () => {
  const now = new Date("2026-10-18T12:00:00.000Z");

  it("accepts a live, non-revoked session", () => {
    expect(isSessionActive(new Date("2026-10-18T12:01:00.000Z"), null, now)).toBe(true);
  });

  it("rejects an expired session", () => {
    expect(isSessionActive(new Date("2026-10-18T11:59:59.000Z"), null, now)).toBe(false);
  });

  it("rejects a revoked session", () => {
    expect(isSessionActive(new Date("2026-10-19T12:00:00.000Z"), now, now)).toBe(false);
  });

  it("enforces a safe minimum TTL", () => {
    expect(sessionTtlSeconds("10")).toBe(604_800);
    expect(sessionTtlSeconds("3600")).toBe(3_600);
  });
});
