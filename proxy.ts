import { NextRequest, NextResponse } from "next/server";
import { getBaseDomain, getCookieDomain, safeJsonParse, SINGLE_DOMAIN } from "@/lib/subdomains";

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // Skip static assets, Next.js internal chunks, images, API routes, and static files
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/static") ||
    url.pathname.startsWith("/api") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Parse subdomain and root domain reliably
  const { subdomain, rootDomain, isLocalhost } = getBaseDomain(hostname);
  const port = hostname.includes(":") ? `:${hostname.split(":")[1]}` : "";
  const protocol = req.nextUrl.protocol || (isLocalhost ? "http:" : "https:");
  const mainHost = isLocalhost ? `localhost${port}` : `${rootDomain}${port}`;
  const mainOrigin = `${protocol}//${mainHost}`;
  const cookieDomain = getCookieDomain(hostname);

  // Read query params and existing cookies
  const paramToken = url.searchParams.get("dudos_at");
  const paramSession = url.searchParams.get("dudos_session");
  const dudosAt = req.cookies.get("dudos_at")?.value;
  const dudosSessionRaw = req.cookies.get("dudos_session")?.value;

  // Extract user role safely without throwing SyntaxErrors on encoded cookies
  let userRole: string | null = null;
  const effectiveSessionRaw = paramSession || dudosSessionRaw;
  if (effectiveSessionRaw) {
    const parsed = safeJsonParse(effectiveSessionRaw);
    if (parsed && parsed.role) {
      userRole = parsed.role;
    }
  }

  function clearAuthCookies(res: NextResponse) {
    const epoch = new Date(0);
    // 1. Host-only cookies
    res.cookies.delete("dudos_at");
    res.cookies.delete("dudos_session");
    res.cookies.set("dudos_at", "", { path: "/", maxAge: 0, expires: epoch });
    res.cookies.set("dudos_session", "", { path: "/", maxAge: 0, expires: epoch });

    // 2. Explicit domain scoped cookies if configured
    if (cookieDomain) {
      res.cookies.set("dudos_at", "", { path: "/", domain: cookieDomain, maxAge: 0, expires: epoch });
      res.cookies.set("dudos_session", "", { path: "/", domain: cookieDomain, maxAge: 0, expires: epoch });
    }

    // 3. Localhost domain variations
    if (isLocalhost) {
      res.cookies.set("dudos_at", "", { path: "/", domain: "localhost", maxAge: 0, expires: epoch });
      res.cookies.set("dudos_session", "", { path: "/", domain: "localhost", maxAge: 0, expires: epoch });
      res.cookies.set("dudos_at", "", { path: "/", domain: ".localhost", maxAge: 0, expires: epoch });
      res.cookies.set("dudos_session", "", { path: "/", domain: ".localhost", maxAge: 0, expires: epoch });
    }
  }

  // ─── 0. Universal Logout Interceptor ──────────────────────────────────────
  if (url.pathname === "/logout" || url.pathname.startsWith("/logout/")) {
    const returnTo = url.searchParams.get("return_to") || "/login";
    const targetPath = returnTo.startsWith("/") ? returnTo : `/${returnTo}`;
    const loginDest = isLocalhost
      ? `${protocol}//localhost${port}${targetPath}`
      : `${protocol}//${rootDomain}${port}${targetPath}`;

    // On localhost every host keeps its own cookies, so visit app, admin and the
    // main host in turn, clearing each one, before landing on the login page.
    // (Production cookies share the parent domain, so one hop clears them all.)
    const hosts = isLocalhost && !SINGLE_DOMAIN ? ["app", "admin", "main"] : [];
    const visited = new Set(
      (url.searchParams.get("cleared") || "").split(",").filter(Boolean)
    );
    visited.add(subdomain || "main");
    const nextHost = hosts.find((host) => !visited.has(host));

    let destination = new URL(loginDest);
    if (nextHost) {
      const nextBase =
        nextHost === "main" ? `localhost${port}` : `${nextHost}.localhost${port}`;
      destination = new URL(`${protocol}//${nextBase}/logout`);
      destination.searchParams.set("return_to", targetPath);
      destination.searchParams.set("cleared", Array.from(visited).join(","));
    }

    // Forward with a tiny page instead of a 307: Next rewrites any Location on
    // the dev server's own origin (localhost) into a relative path, which would
    // keep the browser on the subdomain.
    const href = JSON.stringify(destination.toString());
    const response = new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Signing out…</title>` +
        `<meta http-equiv="refresh" content="0;url=${destination.toString().replace(/"/g, "&quot;")}">` +
        `</head><body><script>location.replace(${href.replace(/</g, "\\u003c")})</script></body></html>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    );
    clearAuthCookies(response);
    return response;
  }

  // ─── 1. Main Domain: Strict Subdomain Routing ─────────────────────────────
  // Redirect /app and /tenant-admin on main domain to dedicated subdomains immediately
  const pathArea = workspaceArea(url.pathname);
  const isAppRoute = pathArea !== null;
  const isTenantAdmin = pathArea === "admin";

  // Which workspace this request is for. Normally the host says so; in single-domain
  // mode there is one host, so the path does — and sections 3 and 4 below apply the
  // same login and role checks to /…/app and /…/tenant-admin instead of app./admin.
  const area = SINGLE_DOMAIN ? pathArea : subdomain;
  const workspaceOrigin = (sub: "app" | "admin") =>
    SINGLE_DOMAIN
      ? `${protocol}//${hostname}`
      : isLocalhost
        ? `${protocol}//${sub}.localhost${port}`
        : `${protocol}//${sub}.${rootDomain}${port}`;

  if (!SINGLE_DOMAIN && subdomain !== "app" && subdomain !== "admin" && isAppRoute) {
    const targetSub = isTenantAdmin ? "admin" : "app";
    const subBase = isLocalhost ? `${protocol}//${targetSub}.localhost${port}` : `${protocol}//${targetSub}.${rootDomain}${port}`;
    const destUrl = new URL(`${subBase}${url.pathname}${url.search}`);

    const token = paramToken || dudosAt;
    const session = paramSession || dudosSessionRaw;
    if (token) {
      destUrl.searchParams.set("dudos_at", token);
    }
    if (session) {
      const parsed = safeJsonParse(session);
      destUrl.searchParams.set("dudos_session", parsed ? JSON.stringify(parsed) : session);
    }
    return NextResponse.redirect(destUrl);
  }

  // ─── 2. SSO Token Handshake on Subdomains ─────────────────────────────────
  // If redirected with ?dudos_at=... and ?dudos_session=..., store cookies cleanly on this subdomain
  if (paramToken && paramSession) {
    const cleanUrl = new URL(req.url);
    cleanUrl.searchParams.delete("dudos_at");
    cleanUrl.searchParams.delete("dudos_session");

    const response = NextResponse.redirect(cleanUrl);
    const cookieOpts: { path: string; maxAge: number; sameSite: "lax"; domain?: string } = {
      path: "/",
      maxAge: 2592000,
      sameSite: "lax",
    };
    if (cookieDomain) {
      cookieOpts.domain = cookieDomain;
    }

    response.cookies.set("dudos_at", paramToken, cookieOpts);

    const parsed = safeJsonParse(paramSession);
    const sessionToStore = parsed ? JSON.stringify(parsed) : paramSession;
    response.cookies.set("dudos_session", sessionToStore, cookieOpts);
    return response;
  }

  // Already signed in: /login and /register go straight to the workspace
  // (the admin panel for admins), so a stale tab never asks to log in again.
  const isAuthPage = url.pathname.startsWith("/login") || url.pathname.startsWith("/register");
  if (isAuthPage && hasLiveToken(dudosAt) && dudosSessionRaw) {
    const targetSub = userRole === "admin" ? "admin" : "app";
    const subBase = workspaceOrigin(targetSub);
    const returnTo = url.searchParams.get("return_to") || "";
    // On one host "/" is the landing page, not the workspace root.
    let path = SINGLE_DOMAIN ? (targetSub === "admin" ? "/en/app/tenant-admin" : "/en/app") : "/";
    try {
      const wanted = new URL(returnTo, subBase);
      // Only follow return_to within the right workspace, never back to an auth page.
      // On one host the origin always matches, so the path has to name the workspace.
      if (
        wanted.origin === subBase &&
        (!SINGLE_DOMAIN || workspaceArea(wanted.pathname) === targetSub) &&
        !/^\/(login|register|logout)/.test(wanted.pathname)
      ) {
        path = wanted.pathname + wanted.search;
      }
    } catch {}
    const destination = new URL(`${subBase}${path}`);
    if (!SINGLE_DOMAIN && subdomain !== targetSub) {
      // Different host: hand the session over, as the /app redirect above does.
      destination.searchParams.set("dudos_at", dudosAt as string);
      const parsed = safeJsonParse(dudosSessionRaw);
      destination.searchParams.set("dudos_session", parsed ? JSON.stringify(parsed) : dudosSessionRaw);
    }
    // Forward with a page, not a 307: the dev server rewrites Location headers
    // on its own origin into relative paths (see the logout interceptor).
    return forwardPage(destination.toString());
  }

  // Sign in on the main host only. On localhost each host keeps its own
  // cookies and storage, so a login on app./admin. would leave the main site
  // (and its Workspace button) thinking you are signed out.
  if (isAuthPage && isLocalhost && (subdomain === "app" || subdomain === "admin")) {
    return forwardPage(`${mainOrigin}${url.pathname}${url.search}`);
  }

  // Allow public auth routes (/login, /register, /logout) on all domains
  if (isAuthPage || url.pathname.startsWith("/logout")) {
    return NextResponse.next();
  }

  const targetUrl = `${protocol}//${hostname}${url.pathname}${url.search}`;

  // ─── 3. Admin Subdomain: admin.<domain> ─────────────────────────────────────
  if (area === "admin") {
    // If not authenticated, redirect to login on main domain
    if (!dudosAt && !paramToken) {
      const loginUrl = new URL(`${mainOrigin}/login`);
      loginUrl.searchParams.set("return_to", targetUrl);
      return NextResponse.redirect(loginUrl);
    }

    // Role check: Only admin allowed
    if (userRole && userRole !== "admin") {
      const appUrl = SINGLE_DOMAIN ? `${workspaceOrigin("app")}/en/app` : workspaceOrigin("app");
      const adminName = SINGLE_DOMAIN ? "the admin panel" : `admin.${mainHost}`;
      const appName = SINGLE_DOMAIN ? "Go to Customer Workspace" : `Go to Customer Workspace (app.${mainHost})`;
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>403 Forbidden - DUDOS</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #18181b; border: 1px solid #27272a; padding: 2.5rem; border-radius: 12px; max-width: 460px; text-align: center; }
            h2 { font-size: 1.5rem; color: #ef4444; margin-bottom: 0.75rem; }
            p { font-size: 0.95rem; color: #a1a1aa; line-height: 1.5; margin-bottom: 1.5rem; }
            a { display: inline-block; background: #2563eb; color: #fff; padding: 0.6rem 1.2rem; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 0.9rem; }
            a:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>403 Forbidden</h2>
            <p>Administrative privileges are required to access <strong>${adminName}</strong>.<br>You are currently logged in as a Client.</p>
            <a href="${appUrl}">${appName}</a>
          </div>
        </body>
        </html>`,
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Rewrite admin root and alias paths to Admin Panel view (/en/app/tenant-admin)
    if (
      url.pathname === "/" ||
      url.pathname === "/en" ||
      url.pathname === "/bn" ||
      url.pathname === "/app" ||
      url.pathname === "/tenant-admin" ||
      url.pathname === "/admin"
    ) {
      url.pathname = "/en/app/tenant-admin";
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // ─── 4. Customer Workspace Subdomain: app.<domain> ──────────────────────────
  if (area === "app") {
    // If not authenticated, redirect to login on main domain
    if (!dudosAt && !paramToken) {
      const loginUrl = new URL(`${mainOrigin}/login`);
      loginUrl.searchParams.set("return_to", targetUrl);
      return NextResponse.redirect(loginUrl);
    }

    // Role check: If admin user accesses client workspace, redirect to admin portal
    if (userRole === "admin") {
      return NextResponse.redirect(new URL(`${workspaceOrigin("admin")}/en/app/tenant-admin`));
    }

    // Client user trying to access admin paths on app subdomain: redirect to client root
    if (url.pathname.includes("tenant-admin") || url.pathname.includes("/admin")) {
      url.pathname = "/en/app";
      return NextResponse.redirect(url);
    }

    // Rewrite app root to customer workspace (/en/app)
    if (url.pathname === "/" || url.pathname === "/en" || url.pathname === "/bn" || url.pathname === "/app") {
      url.pathname = "/en/app";
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

/** The workspace a path belongs to: "admin" (admin panel), "app" (customer workspace), or null (public). */
function workspaceArea(pathname: string): "app" | "admin" | null {
  const isAppRoute =
    pathname.startsWith("/app") ||
    pathname.startsWith("/en/app") ||
    pathname.startsWith("/bn/app") ||
    pathname.startsWith("/tenant-admin") ||
    pathname.startsWith("/admin");
  if (!isAppRoute) return null;
  return pathname.includes("tenant-admin") || pathname.includes("/admin") ? "admin" : "app";
}

/** A real (non-placeholder) JWT that hasn't expired. Signature is checked by the API. */
function hasLiveToken(token?: string): boolean {
  if (!token || token.startsWith("token_")) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp !== "number" || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function forwardPage(destination: string): NextResponse {
  const href = JSON.stringify(destination).replace(/</g, "\\u003c");
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Opening your workspace…</title>` +
      `<meta http-equiv="refresh" content="0;url=${destination.replace(/"/g, "&quot;")}">` +
      `</head><body><script>location.replace(${href})</script></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
