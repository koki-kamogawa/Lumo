"use client";

import { BookOpen, Brain, Home, Mic, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/record", label: "Record", icon: Mic },
  { href: "/entries", label: "Entries", icon: BookOpen },
  { href: "/weekly", label: "Weekly", icon: Sparkles },
  { href: "/memory", label: "Memory", icon: Brain },
];

export function BottomTab() {
  const pathname = usePathname();

  if (
    pathname === "/welcome" ||
    pathname.startsWith("/memory/proposals/") ||
    pathname === "/share"
  ) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[430px] justify-center px-4 pb-4">
      <div className="flex w-full items-center justify-between rounded-[28px] bg-[var(--bg-page)] px-3 py-3 shadow-[10px_10px_22px_var(--shadow-dark),-10px_-10px_22px_var(--shadow-light)]">
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "pressable-soft flex min-w-14 flex-col items-center gap-1 rounded-[20px] px-3 py-2 text-[11px] font-medium",
                active
                  ? "pressable-soft-accent bg-[var(--accent)] text-[var(--text-on-accent)]"
                  : "pressable-soft-neutral text-[var(--icon-inactive)]",
              )}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
