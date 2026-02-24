"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Home,
  Calendar,
  Activity,
  Dumbbell,
  User,
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const clientNav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/track", label: "Track", icon: Activity },
  { href: "/workouts", label: "Benchmarks", icon: Dumbbell },
  { href: "/profile", label: "Profile", icon: User },
];

const adminNav = [
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/admin/clients", label: "Clients", icon: User },
  { href: "/admin/schedule", label: "Schedule", icon: Calendar },
  { href: "/admin/announcements", label: "Announce", icon: Activity },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "TRAINER";

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Image
            src="/logo.png"
            alt="BodyByBucu"
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="text-lg font-bold">BodyByBucu</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {clientNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-brand text-white"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <>
              <div className="my-3 border-t border-border" />
              <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">
                Admin
              </p>
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname === item.href ||
                      pathname.startsWith(item.href + "/")
                      ? "bg-brand text-white"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card transition-transform md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="BodyByBucu"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="font-bold">BodyByBucu</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="space-y-1 p-3">
          {clientNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-brand text-white"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <>
              <div className="my-3 border-t border-border" />
              <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">
                Admin
              </p>
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname === item.href ||
                      pathname.startsWith(item.href + "/")
                      ? "bg-brand text-white"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="flex items-center justify-between border-b border-border p-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Image
            src="/logo.png"
            alt="BodyByBucu"
            width={32}
            height={32}
            className="rounded-full"
          />
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-border bg-card md:hidden">
          {clientNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "text-brand"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
