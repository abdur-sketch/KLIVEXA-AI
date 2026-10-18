import { describe, expect, it } from "vitest";
import { detectVideoMagic, resolveStorageKey } from "./storage";

describe("media storage defenses", () => {
  it("detects MP4, MOV, and WebM magic bytes", () => {
    expect(detectVideoMagic(Uint8Array.from([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]))?.extension).toBe("mp4");
    expect(detectVideoMagic(Uint8Array.from([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]))?.extension).toBe("mov");
    expect(detectVideoMagic(Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3]))?.extension).toBe("webm");
  });

  it("rejects executable and arbitrary data", () => {
    expect(detectVideoMagic(new TextEncoder().encode("MZ executable"))).toBeNull();
    expect(detectVideoMagic(new TextEncoder().encode("PK zip archive"))).toBeNull();
  });

  it("blocks traversal and absolute storage keys", () => {
    expect(() => resolveStorageKey("../secret.mp4")).toThrow();
    expect(() => resolveStorageKey("/etc/passwd.mp4")).toThrow();
    expect(() => resolveStorageKey("media/user/project/video.mp4")).not.toThrow();
  });
});
