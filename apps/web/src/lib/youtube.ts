const allowedHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);
const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !allowedHosts.has(url.hostname) || url.username || url.password) return null;
    let candidate: string | null = null;
    if (url.hostname === "youtu.be") candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
    else if (url.pathname === "/watch") candidate = url.searchParams.get("v");
    else {
      const [kind, id] = url.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(kind ?? "")) candidate = id ?? null;
    }
    return candidate && videoIdPattern.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function isValidYouTubeUrl(value: string): boolean {
  return extractYouTubeVideoId(value) !== null;
}

export function canonicalYouTubeUrl(videoId: string): string {
  if (!videoIdPattern.test(videoId)) throw new Error("Invalid YouTube video ID");
  return `https://www.youtube.com/watch?v=${videoId}`;
}
