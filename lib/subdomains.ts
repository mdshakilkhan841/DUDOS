/**
 * Multi-Subdomain Utilities for DUDOS Platform.
 * 
 * Supports dynamic subdomain resolution for:
 * - Customer Workspace: app.<domain> (e.g. app.localhost:3000, app.dudos.com, app.dudos.daffodilweb.com)
 * - Admin Panel: admin.<domain> (e.g. admin.localhost:3000, admin.dudos.com, admin.dudos.daffodilweb.com)
 * - Main Marketing/Landing: <domain> (e.g. localhost:3000, dudos.com, dudos.daffodilweb.com)
 *
 * Single-domain mode (NEXT_PUBLIC_SINGLE_DOMAIN=true) serves all three from one host,
 * for deployments with no app./admin. DNS records: the workspace at /en/app and the
 * admin panel at /en/app/tenant-admin. proxy.ts guards those paths instead of hosts.
 */

export type SubdomainType = "app" | "admin" | "main";

export const SINGLE_DOMAIN = process.env.NEXT_PUBLIC_SINGLE_DOMAIN === "true";

export function getBaseDomain(hostname: string): { subdomain: string | null; rootDomain: string; isLocalhost: boolean } {
  const hostWithoutPort = hostname.split(":")[0].toLowerCase();
  const isLocalhost = hostWithoutPort === "localhost" || hostWithoutPort.endsWith(".localhost") || hostWithoutPort === "127.0.0.1";

  if (isLocalhost) {
    if (hostWithoutPort.endsWith(".localhost")) {
      const sub = hostWithoutPort.replace(".localhost", "");
      return { subdomain: sub, rootDomain: "localhost", isLocalhost: true };
    }
    return { subdomain: null, rootDomain: "localhost", isLocalhost: true };
  }

  // 1. Check explicit environment configuration if set (e.g. NEXT_PUBLIC_ROOT_DOMAIN=dudos.com)
  const configuredRoot = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase().trim();
  if (configuredRoot && hostWithoutPort.endsWith(configuredRoot)) {
    if (hostWithoutPort === configuredRoot) {
      return { subdomain: null, rootDomain: configuredRoot, isLocalhost: false };
    }
    const prefix = hostWithoutPort.slice(0, -(configuredRoot.length + 1));
    return { subdomain: prefix, rootDomain: configuredRoot, isLocalhost: false };
  }

  // 2. Production prefix pattern detection for known subdomains: app, admin
  if (hostWithoutPort.startsWith("app.")) {
    return { subdomain: "app", rootDomain: hostWithoutPort.slice(4), isLocalhost: false };
  }
  if (hostWithoutPort.startsWith("admin.")) {
    return { subdomain: "admin", rootDomain: hostWithoutPort.slice(6), isLocalhost: false };
  }

  // 3. Fallback for custom or multi-level domains
  return { subdomain: null, rootDomain: hostWithoutPort, isLocalhost: false };
}

export function buildSubdomainUrl(
  subdomain: SubdomainType,
  path: string = "",
  currentLocation?: { protocol: string; host: string }
): string {
  const loc = currentLocation || (typeof window !== "undefined" ? window.location : null);
  if (!loc) {
    return path.startsWith("/") ? path : `/${path}`;
  }

  const protocol = loc.protocol || "https:";
  const host = loc.host;
  const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
  const hostWithoutPort = host.split(":")[0].toLowerCase();
  const isLocalhost = hostWithoutPort === "localhost" || hostWithoutPort.endsWith(".localhost") || hostWithoutPort === "127.0.0.1";

  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (SINGLE_DOMAIN) {
    return `${protocol}//${host}${cleanPath}`;
  }

  if (isLocalhost) {
    if (subdomain === "main") {
      return `${protocol}//localhost${port}${cleanPath}`;
    }
    return `${protocol}//${subdomain}.localhost${port}${cleanPath}`;
  }

  // Production domain
  const { rootDomain } = getBaseDomain(hostWithoutPort);
  if (subdomain === "main") {
    return `${protocol}//${rootDomain}${port}${cleanPath}`;
  }
  return `${protocol}//${subdomain}.${rootDomain}${port}${cleanPath}`;
}

export function getCookieDomain(hostname?: string): string | undefined {
  const host = hostname || (typeof window !== "undefined" ? window.location.hostname : "");
  if (!host) return undefined;
  // One host: nothing to share the session with, so keep cookies host-only.
  if (SINGLE_DOMAIN) return undefined;
  const hostWithoutPort = host.split(":")[0].toLowerCase();
  
  if (hostWithoutPort === "localhost" || hostWithoutPort.endsWith(".localhost") || hostWithoutPort === "127.0.0.1") {
    // In Chromium/WebKit/Firefox, setting domain to .localhost or omitting it shares with subdomains
    return undefined;
  }

  const { rootDomain } = getBaseDomain(hostWithoutPort);
  return `.${rootDomain}`;
}

/**
 * Safely parses JSON strings that may be raw, escaped, quoted, or multiple URL-encoded.
 * Returns null instead of throwing on invalid input.
 */
export function safeJsonParse<T = any>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  let str = String(raw).trim();

  // Try direct parse first
  try {
    let res = JSON.parse(str);
    if (typeof res === "string" && (res.startsWith("{") || res.startsWith("["))) {
      try { res = JSON.parse(res); } catch {}
    }
    if (typeof res === "object" && res !== null) return res;
  } catch {}

  // If failed, try decoding up to 3 times to unwrap single/double URL encoding
  for (let i = 0; i < 3; i++) {
    try {
      str = decodeURIComponent(str);
      let res = JSON.parse(str);
      if (typeof res === "string" && (res.startsWith("{") || res.startsWith("["))) {
        try { res = JSON.parse(res); } catch {}
      }
      if (typeof res === "object" && res !== null) return res;
    } catch {}
  }
  return null;
}

