import { Brain } from "lucide-react";
import { ProposalActionsClient } from "@/components/memory/proposal-actions-client";
import { ModalSheet } from "@/components/ui/modal-sheet";
import { getCurrentUser } from "@/lib/auth/user";
import { getMemoryProposal } from "@/lib/data/queries";

export default async function ProposalModalPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  const user = await getCurrentUser();
  const proposal = await getMemoryProposal(user.id, proposalId);

  return (
    <ModalSheet title="メモリ候補" href="/memory">
      <div className="space-y-4">
        <div className="rounded-[20px] bg-[var(--accent-soft)] px-4 py-4 text-sm text-[var(--accent-dark)] shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]">
          後で見返したくなる記憶候補です。必要なものだけ保存できます。
        </div>
        {proposal.proposedItemsJson.map((item, index) => (
          <div
            key={`${item.memory_text}-${index}`}
            className="rounded-[22px] bg-[var(--bg-page)] p-4 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_var(--shadow-light)]"
          >
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-[var(--accent-soft)] p-2 text-[var(--accent)]">
                <Brain className="size-4" />
              </div>
              <p className="text-xs font-semibold text-[var(--accent-dark)]">候補 {index + 1}</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--text-primary)]">{item.memory_text}</p>
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">根拠: 「{item.evidence_quote}」</p>
          </div>
        ))}
        <ProposalActionsClient proposalId={proposal.id} />
      </div>
    </ModalSheet>
  );
}
