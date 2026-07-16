"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { KeyRound, LogOut, Shuffle, Upload, type LucideIcon } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";

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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <KeyRound className="h-5 w-5 text-primary" />
            LockPass
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
        <div className="flex items-center gap-3">
          {username && (
            <span className="text-sm text-muted-foreground">{username}</span>
          )}
          <LocaleSwitcher compact />
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-1 h-4 w-4" />
            {t("nav.logout")}
          </Button>
        </div>
      </div>
    </header>
  );
}
