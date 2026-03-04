"use client";

import { BatteryFull, Check, Leaf, Mic, Signal, Wifi } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fetchJson } from "@/lib/client";
import { useToast } from "@/components/providers/app-providers";

const options = [
  { value: "EMPATHETIC", label: "共感多め" },
  { value: "BALANCED", label: "バランス" },
  { value: "CONCLUSION_FOCUSED", label: "結論多め" },
] as const;

const outerShadow = "6px 6px 14px var(--shadow-dark), -6px -6px 14px var(--shadow-light)";
const softShadow = "4px 4px 10px var(--shadow-dark), -4px -4px 10px var(--shadow-light)";
export function FYhP5Screen() {
  const router = useRouter();
  const { push } = useToast();
  const [selected, setSelected] = useState<(typeof options)[number]["value"]>("EMPATHETIC");
  const [pending, startTransition] = useTransition();

  const saveAndContinue = () => {
    startTransition(async () => {
      try {
        await fetchJson("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responseStyle: selected }),
        });
        router.push("/");
        router.refresh();
      } catch (error) {
        push({
          title: "初期設定の保存に失敗しました",
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[402px] flex-col overflow-hidden bg-[var(--bg-page)]">
      <div className="flex h-[62px] items-center justify-between bg-[var(--bg-page)] px-6">
        <p className="text-[15px] font-semibold text-[var(--text-primary)]">9:41</p>
        <div className="flex items-center gap-[6px] text-[var(--text-primary)]">
          <Signal className="size-4" strokeWidth={2} />
          <Wifi className="size-4" strokeWidth={2} />
          <BatteryFull className="h-4 w-[22px]" strokeWidth={2} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-8 px-6 pb-8 pt-8">
        <div
          className="flex w-full flex-col items-center gap-[6px] rounded-2xl bg-[var(--accent)] px-4 py-[14px] text-center"
          style={{ boxShadow: softShadow }}
        >
          <p className="text-base font-bold text-[var(--text-on-accent)]">🔒 あなた専用の空間です</p>
          <p className="text-xs font-semibold text-[color:rgba(255,255,255,0.8)]">
            データは端末内のみ。安心して話せます
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-page)]"
            style={{ boxShadow: "5px 5px 12px var(--shadow-dark), -5px -5px 12px var(--shadow-light)" }}
          >
            <Mic className="h-9 w-9 text-[var(--accent)]" />
          </div>
          <h1 className="text-[36px] font-bold leading-[1.2] tracking-[-1px] text-[var(--text-primary)]">Lumo</h1>
          <p className="whitespace-pre-line text-center text-sm leading-[1.5] text-[var(--text-secondary)]">
            {"話すだけで、自分が見えてくる\nAIがあなたの思考パターンを学んで\n「自分の変化」を映してくれる日記"}
          </p>
          <Leaf className="h-7 w-7 text-[#5CAD5C]" />
        </div>

        <div className="flex justify-center gap-[6px]">
          <span className="h-2 w-6 rounded-full bg-[var(--accent)]" />
          <span className="h-2 w-[6px] rounded-full bg-[var(--bg-muted)]" />
          <span className="h-2 w-[6px] rounded-full bg-[var(--bg-muted)]" />
          <span className="h-2 w-[6px] rounded-full bg-[var(--bg-muted)]" />
          <span className="h-2 w-[6px] rounded-full bg-[var(--bg-muted)]" />
        </div>

        <div
          className="flex w-full flex-col gap-4 rounded-[20px] bg-[var(--bg-page)] p-5"
          style={{ boxShadow: outerShadow }}
        >
          <div className="space-y-1">
            <p className="text-base font-semibold tracking-[-0.2px] text-[var(--text-primary)]">Q1. AIの返し方は？</p>
            <p className="text-xs text-[var(--text-tertiary)]">あとからいつでも変えられます</p>
          </div>

          <div className="flex flex-col gap-[10px]">
            {options.map((option) => {
              const active = selected === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelected(option.value)}
                  className={`flex h-12 w-full items-center gap-[10px] rounded-[14px] px-4 ${
                    active ? "bg-[var(--accent-soft)]" : "bg-[var(--bg-page)]"
                  }`}
                  style={{
                    boxShadow: active
                      ? "3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light)"
                      : "3px 3px 8px var(--shadow-dark), -3px -3px 8px var(--shadow-light)",
                  }}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      active ? "bg-[var(--accent)] text-[#FDF8EC]" : "border-[1.5px] border-[var(--text-tertiary)]"
                    }`}
                  >
                    {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-auto flex items-center gap-3">
          <Link href="/" className="flex h-10 items-center px-2 text-sm font-medium text-[var(--text-tertiary)]">
            スキップ
          </Link>
          <button
            type="button"
            onClick={saveAndContinue}
            disabled={pending}
            className="flex h-[52px] flex-1 items-center justify-center rounded-2xl bg-[var(--accent)] px-8 text-[15px] font-semibold text-[var(--text-on-accent)] disabled:opacity-50"
            style={{ boxShadow: softShadow }}
          >
            次へ
          </button>
        </div>
      </div>
    </div>
  );
}
