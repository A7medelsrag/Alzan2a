export function resolvePublicImageUrl(imageUrl: string): string {
  if (typeof window === "undefined" || window.location.protocol !== "http:") return imageUrl;

  try {
    const parsed = new URL(imageUrl);
    const isLocalApiMedia =
      parsed.protocol === "https:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      parsed.port === "4000" &&
      parsed.pathname.startsWith("/api/v1/media/");

    return isLocalApiMedia
      ? `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`
      : imageUrl;
  } catch {
    return imageUrl;
  }
}
