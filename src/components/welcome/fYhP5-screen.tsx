"use client";

import { Check, Leaf, Mic } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fetchJson } from "@/lib/client";
import { useToast } from "@/components/providers/app-providers";

type ResponseStyleValue = "EMPATHETIC" | "BALANCED" | "CONCLUSION_FOCUSED";
type PurposeValue = "MOOD" | "ORGANIZE" | "GOAL" | "SELF_UNDERSTANDING";
type AdviceValue = "LOW" | "MEDIUM" | "HIGH";

type OnboardingSelections = {
  responseStyle: ResponseStyleValue;
  purpose: PurposeValue;
  adviceIntensity: AdviceValue;
};

type StepConfig =
  | {
      key: "responseStyle";
      title: string;
      description: string;
      options: Array<{ value: ResponseStyleValue; label: string }>;
    }
  | {
      key: "purpose";
      title: string;
      description: string;
      options: Array<{ value: PurposeValue; label: string }>;
    }
  | {
      key: "adviceIntensity";
      title: string;
      description: string;
      options: Array<{ value: AdviceValue; label: string }>;
    };

const steps: StepConfig[] = [
  {
    key: "responseStyle",
    title: "Q1. AIの返し方は？",
    description: "あとからいつでも変えられます",
    options: [
      { value: "EMPATHETIC", label: "共感多め" },
      { value: "BALANCED", label: "バランス" },
      { value: "CONCLUSION_FOCUSED", label: "結論多め" },
    ],
  },
  {
    key: "purpose",
    title: "Q2. いまの主な目的は？",
    description: "いちばん近いものを選んでください",
    options: [
      { value: "MOOD", label: "気分を整えたい" },
      { value: "ORGANIZE", label: "悩みを整理したい" },
      { value: "GOAL", label: "目標を進めたい" },
      { value: "SELF_UNDERSTANDING", label: "自分を理解したい" },
    ],
  },
  {
    key: "adviceIntensity",
    title: "Q3. アドバイスの強さは？",
    description: "迷ったら「中」でOKです",
    options: [
      { value: "LOW", label: "低め（寄り添い中心）" },
      { value: "MEDIUM", label: "中（バランス）" },
      { value: "HIGH", label: "高め（具体提案多め）" },
    ],
  },
];

const outerShadow = "6px 6px 14px var(--shadow-dark), -6px -6px 14px var(--shadow-light)";
const softShadow = "4px 4px 10px var(--shadow-dark), -4px -4px 10px var(--shadow-light)";

export function FYhP5Screen() {
  const router = useRouter();
  const { push } = useToast();
  const [stepIndex, setStepIndex] = useState(0);
  const [selections, setSelections] = useState<OnboardingSelections>({
    responseStyle: "EMPATHETIC",
    purpose: "SELF_UNDERSTANDING",
    adviceIntensity: "MEDIUM",
  });
  const [pending, startTransition] = useTransition();

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const updateSelection = (value: string) => {
    setSelections((current) => ({ ...current, [step.key]: value }));
  };

  const handleNext = () => {
    if (!isLastStep) {
      setStepIndex((current) => current + 1);
      return;
    }

    startTransition(async () => {
      try {
        await fetchJson("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(selections),
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
          <h1 className="text-[56px] font-bold leading-[1.1] tracking-[-1px] text-[var(--text-primary)]">Lumo</h1>
          <p className="whitespace-pre-line text-center text-sm leading-[1.5] text-[var(--text-secondary)]">
            {"話すだけで、自分が見えてくる\nAIがあなたの思考パターンを学んで\n「自分の変化」を映してくれる日記"}
          </p>
          <Leaf className="h-7 w-7 text-[var(--accent)]" />
        </div>

        <div className="flex justify-center gap-[6px]" aria-label="オンボーディング進捗">
          {steps.map((_, index) => {
            const active = index === stepIndex;
            return (
              <motion.span
                key={index}
                layout
                transition={{ type: "spring", stiffness: 460, damping: 30 }}
                className={`relative block h-2 rounded-full ${active ? "w-6 bg-[var(--accent)]" : "w-[6px] bg-[var(--bg-muted)]"}`}
                animate={{
                  opacity: active ? 1 : 0.65,
                  scale: active ? 1 : 0.9,
                }}
              >
                {active ? (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-[var(--accent)]"
                    initial={{ opacity: 0.45, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.9 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  />
                ) : null}
              </motion.span>
            );
          })}
        </div>

        <div
          className="flex w-full flex-col gap-4 rounded-[20px] bg-[var(--bg-page)] p-5"
          style={{ boxShadow: outerShadow }}
        >
          <div className="space-y-1">
            <p className="text-base font-semibold tracking-[-0.2px] text-[var(--text-primary)]">{step.title}</p>
            <p className="text-xs text-[var(--text-tertiary)]">{step.description}</p>
          </div>

          <div className="flex flex-col gap-[10px]">
            {step.options.map((option) => {
              const active = selections[step.key] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateSelection(option.value)}
                  className={`pressable-soft pressable-soft-neutral flex h-12 w-full items-center gap-[10px] rounded-[14px] px-4 ${
                    active
                      ? "bg-[var(--accent-soft)] shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)]"
                      : "bg-[var(--bg-page)] shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]"
                  }`}
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
            onClick={handleNext}
            disabled={pending}
            className="pressable-soft pressable-soft-accent flex h-[52px] flex-1 items-center justify-center rounded-2xl bg-[var(--accent)] px-8 text-[15px] font-semibold text-[var(--text-on-accent)] shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] disabled:opacity-50"
          >
            {isLastStep ? "はじめる" : "次へ"}
          </button>
        </div>
      </div>
    </div>
  );
}
