"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Shuffle, Upload, X, type LucideIcon } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LockPassMark } from "@/components/lockpass-mark";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface NavHeaderProps {
  username?: string;
}

const NAV_ITEMS: {
  href: string;
  labelKey: "nav.vault" | "nav.generator" | "nav.importExport";
  icon?: LucideIcon;
  isActive: (pathname: string) => boolean;
}[] = [
  {
    href: "/",
    labelKey: "nav.vault",
    isActive: (pathname) =>
      pathname === "/" || pathname.startsWith("/items"),
  },
  {
    href: "/generator",
    labelKey: "nav.generator",
    icon: Shuffle,
    isActive: (pathname) => pathname.startsWith("/generator"),
  },
  {
    href: "/import-export",
    labelKey: "nav.importExport",
    icon: Upload,
    isActive: (pathname) => pathname.startsWith("/import-export"),
  },
];

export function NavHeader({ username }: NavHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
            <LockPassMark className="h-5 w-5" />
            <span className="truncate">LockPass</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map(({ href, labelKey, icon: Icon, isActive }) => {
              const active = isActive(pathname);
              return (
                <Button
                  key={href}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                >
                  <Link href={href} aria-current={active ? "page" : undefined}>
                    {Icon && <Icon className="mr-1 h-4 w-4" />}
                    {t(labelKey)}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {username && (
            <span className="hidden max-w-[8rem] truncate text-sm text-muted-foreground md:inline">
              {username}
            </span>
          )}
          <LocaleSwitcher compact className="hidden sm:inline-flex" />
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={handleLogout}
          >
            <LogOut className="mr-1 h-4 w-4" />
            {t("nav.logout")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="sm:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden">
          <button
            type="button"
            className="fixed inset-0 top-14 z-40 bg-black/40"
            aria-label={t("nav.closeMenu")}
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id="mobile-nav"
            className="absolute inset-x-0 top-14 z-50 border-b border-border bg-card px-4 py-3 shadow-md"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {username && (
                <p className="truncate px-3 py-2 text-sm text-muted-foreground">
                  {username}
                </p>
              )}
              {NAV_ITEMS.map(({ href, labelKey, icon: Icon, isActive }) => {
                const active = isActive(pathname);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted",
                      active && "bg-muted font-medium"
                    )}
                    onClick={() => setMenuOpen(false)}
                  >
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    {t(labelKey)}
                  </Link>
                );
              })}
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-border px-1 pt-3">
                <LocaleSwitcher />
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="mr-1 h-4 w-4" />
                  {t("nav.logout")}
                </Button>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
