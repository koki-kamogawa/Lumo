import { Settings } from "lucide-react";
import Link from "next/link";

export function MobileShell({
  children,
  topLeft,
  topAction,
  withTabBar = true,
}: {
  children: React.ReactNode;
  topLeft?: React.ReactNode;
  topAction?: React.ReactNode;
  withTabBar?: boolean;
}) {
  return (
    <div
      className={`app-shell mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[var(--bg-page)] ${
        withTabBar ? "app-shell-with-tab" : "app-shell-no-tab"
      }`}
    >
      <div className="app-shell-header flex items-center justify-between px-6 pb-2 pt-5">
        {topLeft ?? <div />}
        {topAction !== undefined ? topAction : (
          <Link
            href="/settings"
            className="pressable-soft pressable-soft-neutral rounded-full bg-[var(--bg-page)] p-3 text-[var(--text-secondary)] shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]"
          >
            <Settings className="size-5" />
          </Link>
        )}
      </div>
      <main className={`app-shell-main flex-1 px-6 pt-2 ${withTabBar ? "pb-28" : "pb-8"}`}>{children}</main>
    </div>
  );
}
