import { cn } from "@/lib/utils";

export function Card({
  className,
  inset = false,
  soft = false,
  children,
}: {
  className?: string;
  inset?: boolean;
  soft?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] p-4",
        soft ? "bg-[var(--accent-soft)]" : "bg-[var(--bg-page)]",
        inset
          ? "shadow-[inset_5px_5px_12px_var(--shadow-dark),inset_-5px_-5px_12px_var(--shadow-light)]"
          : "shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_var(--shadow-light)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

