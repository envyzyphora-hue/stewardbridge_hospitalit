"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, X, Bell, LogOut, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn, initials } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export function DashboardShell({
  navItems,
  roleLabel,
  userName,
  unreadCount,
  children,
}: {
  navItems: NavItem[];
  roleLabel: string;
  userName: string;
  unreadCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/">
          <Logo />
        </Link>
        <button className="rounded-lg p-1.5 text-brand-500 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 custom-scrollbar">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50 hover:text-brand-900",
                active && "bg-brand-600 text-white hover:bg-brand-600 hover:text-white",
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
              {item.label === "Notifications" && unreadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-brand-100 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            {initials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-900">{userName}</p>
            <p className="text-xs text-brand-400">{roleLabel}</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded-lg p-2 text-brand-400 hover:bg-brand-50 hover:text-brand-700" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-brand-50/30">
      <aside className="hidden w-64 shrink-0 border-r border-brand-100 bg-white lg:block">{SidebarContent}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">{SidebarContent}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-brand-100 bg-white px-4 sm:px-6 lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-brand-700" aria-label="Open menu">
            <Menu className="h-5.5 w-5.5" />
          </button>
          <Logo />
          <Link href={navItems.find((n) => n.label === "Notifications")?.href ?? "#"} className="relative rounded-lg p-2 text-brand-700">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent-500" />}
          </Link>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
