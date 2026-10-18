import { describe, expect, it } from "vitest";
import { extractYouTubeVideoId, isValidYouTubeUrl } from "./youtube";

describe("isValidYouTubeUrl", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://m.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
  ])("accepts a supported YouTube URL: %s", (url) => expect(isValidYouTubeUrl(url)).toBe(true));

  it.each(["", "not-a-url", "https://example.com/video", "javascript:alert(1)", "http://youtu.be/dQw4w9WgXcQ", "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ", "https://youtube.com/watch?v=short"])(
    "rejects an unsupported URL: %s",
    (url) => expect(isValidYouTubeUrl(url)).toBe(false),
  );

  it("extracts a normalized video ID without retaining user-controlled URL parts", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=evil#fragment")).toBe("dQw4w9WgXcQ");
  });
});
