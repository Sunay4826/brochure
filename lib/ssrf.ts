/**
 * Allow only public HTTP(S) URLs to reduce SSRF risk when fetching user-supplied links.
 */
export function assertPublicHttpUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error("Invalid URL");
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }

  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0"
  ) {
    throw new Error("Local addresses are not allowed");
  }

  if (host === "[::1]" || host === "::1") {
    throw new Error("Local addresses are not allowed");
  }

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = host.match(ipv4);
  if (m) {
    const octets = [m[1], m[2], m[3], m[4]].map(Number);
    const [a, b] = octets;
    if (a === 10) throw new Error("Private network addresses are not allowed");
    if (a === 127) throw new Error("Private network addresses are not allowed");
    if (a === 0) throw new Error("Private network addresses are not allowed");
    if (a === 169 && b === 254)
      throw new Error("Private network addresses are not allowed");
    if (a === 192 && b === 168)
      throw new Error("Private network addresses are not allowed");
    if (a === 172 && b >= 16 && b <= 31)
      throw new Error("Private network addresses are not allowed");
  }

  return u;
}
