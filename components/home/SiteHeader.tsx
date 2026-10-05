"use client";

import React, { useState, useEffect } from "react";
import Link from "@/components/dudos-link";
import { Globe2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useContent } from "@/components/dudos-content-context";
import { useAuth } from "@/context/auth-context";
import { buildSubdomainUrl } from "@/lib/subdomains";
import { t } from "@/lib/i18n";

export function SiteHeader({
  lang = "en",
  path = "",
}: {
  lang?: string;
  path?: string;
}) {
  const content = useContent();
  const { isAuthenticated, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [path, lang]);

  const links: [string, string][] = (content.navigation || []).map((x: any) => [
    x.route.replace(/^\//, ""),
    t(x.label, lang),
  ]);

  const nextLang = lang === "en" ? "bn" : "en";
  const switchTarget = `/${nextLang}${path ? `/${path}` : ""}`;

  // Default server-stable values to ensure 100% hydration parity
  const defaultWorkspaceHref = `/login?return_to=${encodeURIComponent("/en/app")}`;
  const defaultWorkspaceLabel = t("nav.workspace", lang);

  const workspaceHref = mounted
    ? (isAuthenticated
        ? (() => {
            const rawUrl = user?.role === "admin"
              ? buildSubdomainUrl("admin", `/${lang}/app/tenant-admin`)
              : buildSubdomainUrl("app", `/${lang}/app`);
            if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
              const token = localStorage.getItem("dudos_jwt_token") || (user ? `token_${user.id}` : "");
              if (token && user) {
                const u = new URL(rawUrl);
                u.searchParams.delete("dudos_at");
                u.searchParams.delete("dudos_session");
                u.searchParams.set("dudos_at", token);
                u.searchParams.set("dudos_session", JSON.stringify(user));
                return u.toString();
              }
            }
            return rawUrl;
          })()
        // Not signed in here: let the workspace host decide. It opens straight
        // away when that host has the session, otherwise it sends you to sign in.
        : buildSubdomainUrl("app", `/${lang}/app`))
    : defaultWorkspaceHref;

  const workspaceLabel = mounted && isAuthenticated && user?.role === "admin"
    ? (lang === "bn" ? "অ্যাডমিন প্যানেল" : "Admin Panel")
    : defaultWorkspaceLabel;


  return (
    <>
      <a className="skip-link" href="#main">
        {t("common.skipToContent", lang)}
      </a>
      <header className="site-header">
        <Link className="brand" href={"/" + lang}>
          <span className="brand-symbol">D</span>
          <span>
            {content.brand?.name || "DUDOS"}
            <span className="brand-dot">.</span>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          {links.slice(0, 5).map(([url, label]) => (
            <Link
              key={url}
              href={`/${lang}/${url}`}
              className={path.startsWith(url) ? "active" : ""}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link
            className="language"
            href={switchTarget}
            lang={nextLang}
          >
            <Globe2 size={15} />
            <span>{t("common.switchLanguageLabel", lang)}</span>
          </Link>
          <Link className="desktop-login" href={workspaceHref}>
            {workspaceLabel}
          </Link>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mobile-menu"
                aria-label={t("nav.openNavigation", lang)}
              >
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>{content.brand?.name || "DUDOS"}</SheetTitle>
              </SheetHeader>
              <nav
                className="mobile-links"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a")) setMenuOpen(false);
                }}
              >
                {links.map(([url, label]) => (
                  <Link key={url} href={`/${lang}/${url}`}>
                    {label}
                  </Link>
                ))}
                <Link href={`/${lang}/transform`}>{t("nav.transformation", lang)}</Link>
                <Link href={workspaceHref}>{workspaceLabel}</Link>
              </nav>
            </SheetContent>
          </Sheet>

        </div>
      </header>
    </>
  );
}
