import { Slot } from "@radix-ui/react-slot";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { asChild = false, className, variant = "primary", ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold transition-transform duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--accent)] text-[var(--text-on-accent)] shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]",
        variant === "secondary" &&
          "bg-[var(--bg-page)] text-[var(--text-primary)] shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]",
        variant === "ghost" && "bg-transparent text-[var(--accent)]",
        variant === "danger" &&
          "bg-[var(--accent-red)] text-[var(--text-on-accent)] shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]",
        className,
      )}
      {...props}
    />
  );
});
