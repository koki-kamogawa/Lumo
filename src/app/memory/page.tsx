import { Brain, Lock } from "lucide-react";
import Link from "next/link";
import { MemoryItemActionsClient } from "@/components/memory/memory-item-actions-client";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getMemoryItems } from "@/lib/data/queries";

export default async function MemoryPage() {
  const user = await getCurrentUser();
  const items = await getMemoryItems(user.id, "ACTIVE");

  return (
    <MobileShell>
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">覚えていること</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            記憶は自動で保存されます。不要になったら、いつでも削除できます。
          </p>
        </div>

        <Card soft>
          <div className="flex items-center gap-3">
            <Lock className="size-4 text-[var(--accent)]" />
            <p className="text-sm text-[var(--accent-dark)]">
              共有されるのは洞察カードのみです。本文や固有名詞は共有されません。
            </p>
          </div>
        </Card>

        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-0">
              <details className="group">
                <summary className="flex min-h-14 list-none items-start justify-between gap-3 px-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-full bg-[var(--accent-soft)] p-2 text-[var(--accent)]">
                      <Brain className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-6 text-[var(--text-primary)]">{item.memoryText}</p>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">{item.category ?? "記憶"}</p>
                    </div>
                  </div>
                  <span className="shrink-0 pt-1 text-xs text-[var(--text-tertiary)] group-open:hidden">開く</span>
                  <span className="hidden shrink-0 pt-1 text-xs text-[var(--text-tertiary)] group-open:inline">閉じる</span>
                </summary>

                <div className="space-y-3 border-t border-[color:rgba(120,120,120,0.08)] px-4 py-4">
                  {item.evidenceLinks && item.evidenceLinks.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[var(--text-tertiary)]">根拠リンク</p>
                      {item.evidenceLinks.map((link) => (
                        <Link
                          key={link.id}
                          href={link.entryId ? `/entries/${link.entryId}` : "/entries"}
                          className="block rounded-[16px] bg-[var(--bg-page)] px-4 py-3 text-xs text-[var(--text-secondary)] shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]"
                        >
                          {link.entryTitle ?? "記録"}: 「{link.quote}」
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-tertiary)]">根拠リンクはまだありません。</p>
                  )}

                  <MemoryItemActionsClient memoryItemId={item.id} />
                </div>
              </details>
            </Card>
          ))}

          {items.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--text-secondary)]">保存されている記憶はまだありません。</p>
            </Card>
          ) : null}
        </div>
      </div>
    </MobileShell>
  );
}
