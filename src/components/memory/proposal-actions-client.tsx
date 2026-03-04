"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/client";

export function ProposalActionsClient({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  const run = (action: "apply" | "dismiss") => {
    startTransition(async () => {
      try {
        await fetchJson(`/api/memory/proposals/${proposalId}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        push({
          title: action === "apply" ? "メモリを保存しました" : "今回はスキップしました",
        });
        router.push("/memory");
        router.refresh();
      } catch (error) {
        push({
          title: "処理に失敗しました",
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button onClick={() => run("apply")} disabled={pending}>
        保存する
      </Button>
      <Button variant="secondary" onClick={() => run("dismiss")} disabled={pending}>
        今回はスキップ
      </Button>
    </div>
  );
}
