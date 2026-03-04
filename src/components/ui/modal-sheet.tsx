import { X } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export function ModalSheet({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-4 pt-12 backdrop-blur-sm">
      <Card className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-[32px] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="mx-auto h-1.5 w-14 rounded-full bg-[var(--border-subtle)]" />
        </div>
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">{title}</h1>
          <Link
            href={href}
            className="rounded-full bg-[var(--bg-page)] p-2 text-[var(--text-secondary)] shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]"
          >
            <X className="size-4" />
          </Link>
        </div>
        {children}
      </Card>
    </div>
  );
}

