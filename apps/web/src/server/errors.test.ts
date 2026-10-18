import { describe, expect, it } from "vitest";
import { AppError, assertSameOrigin } from "./errors";

describe("same-origin protection", () => {
  it("accepts the browser host when a development proxy rewrites request.url", () => {
    const request = new Request("http://localhost:3000/api/projects", { headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" } });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  it("rejects a foreign origin", () => {
    const request = new Request("http://localhost:3000/api/projects", { headers: { origin: "https://evil.example", host: "localhost:3000" } });
    expect(() => assertSameOrigin(request)).toThrowError(AppError);
  });
});
