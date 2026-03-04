"use client";

import { SessionProvider } from "next-auth/react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
};

const ToastContext = createContext<{
  push: (toast: Omit<ToastItem, "id">) => void;
} | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((toast: Omit<ToastItem, "id">) => {
    const item = { ...toast, id: crypto.randomUUID() };
    setToasts((current) => [...current, item]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((value) => value.id !== item.id));
    }, 2600);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <SessionProvider>
      <ToastContext.Provider value={value}>
        {children}
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex w-full max-w-md flex-col gap-3 px-4">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.96 }}
                className="pointer-events-auto rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-page)] px-4 py-3 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]"
              >
                <p className="text-sm font-semibold text-[var(--text-primary)]">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{toast.description}</p>
                ) : null}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ToastContext.Provider>
    </SessionProvider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within AppProviders");
  }

  return context;
}

