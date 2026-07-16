"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { KeyRound, LogOut, Shuffle, Upload, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavHeaderProps {
  username?: string;
}

const NAV_ITEMS: {
  href: string;
  label: string;
  icon?: LucideIcon;
  isActive: (pathname: string) => boolean;
}[] = [
  {
    href: "/",
    label: "密码库",
    isActive: (pathname) =>
      pathname === "/" || pathname.startsWith("/items"),
  },
  {
    href: "/generator",
    label: "生成密码",
    icon: Shuffle,
    isActive: (pathname) => pathname.startsWith("/generator"),
  },
  {
    href: "/import-export",
    label: "导入导出",
    icon: Upload,
    isActive: (pathname) => pathname.startsWith("/import-export"),
  },
];

export function NavHeader({ username }: NavHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

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
            {NAV_ITEMS.map(({ href, label, icon: Icon, isActive }) => {
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
                    {label}
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
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-1 h-4 w-4" />
            退出
          </Button>
        </div>
      </div>
    </header>
  );
}
