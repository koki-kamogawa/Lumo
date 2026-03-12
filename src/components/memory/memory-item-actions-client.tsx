"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/client";

export function MemoryItemActionsClient({ memoryItemId }: { memoryItemId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  const remove = () => {
    if (!window.confirm("この記憶を削除しますか？")) {
      return;
    }

    startTransition(async () => {
      try {
        await fetchJson(`/api/memory/items/${memoryItemId}`, { method: "DELETE" });
        push({ title: "記憶を削除しました" });
        router.refresh();
      } catch (error) {
        push({
          title: "削除に失敗しました",
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  };

  return (
    <Button variant="danger" className="w-full" onClick={remove} disabled={pending}>
      この記憶を削除
    </Button>
  );
}
