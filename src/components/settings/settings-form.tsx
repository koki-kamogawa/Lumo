"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchJson } from "@/lib/client";
import { useToast } from "@/components/providers/app-providers";

type SettingsData = {
  responseStyle: string;
  purpose: string;
  adviceIntensity: string;
  memoryMode: string;
  shareByDefault: boolean;
  reminderFrequency: string | null;
  reminderTime: string | null;
};

const optionMap = {
  responseStyle: [
    { value: "EMPATHETIC", label: "共感多め" },
    { value: "BALANCED", label: "バランス" },
    { value: "CONCLUSION_FOCUSED", label: "結論多め" },
  ],
  purpose: [
    { value: "MOOD", label: "気分" },
    { value: "ORGANIZE", label: "悩み整理" },
    { value: "GOAL", label: "目標" },
    { value: "SELF_UNDERSTANDING", label: "自己理解" },
  ],
  adviceIntensity: [
    { value: "LOW", label: "低" },
    { value: "MEDIUM", label: "中" },
    { value: "HIGH", label: "高" },
  ],
  memoryMode: [
    { value: "AUTO", label: "自動" },
    { value: "APPROVAL", label: "承認制" },
  ],
} as const;

export function SettingsForm({ initial }: { initial: SettingsData }) {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();

  const update = (key: keyof SettingsData, value: string | boolean | null) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    startTransition(async () => {
      try {
        await fetchJson("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        push({ title: "設定を保存しました" });
        router.refresh();
      } catch (error) {
        push({
          title: "設定の保存に失敗しました",
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  };

  const exportData = async (format: "json" | "md") => {
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format }),
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = format === "json" ? "lumo-export.json" : "lumo-export.md";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {(
        [
          ["返し方", "responseStyle"],
          ["目的", "purpose"],
          ["アドバイス強度", "adviceIntensity"],
          ["メモリ方式", "memoryMode"],
        ] as const
      ).map(([label, key]) => (
        <Card key={key}>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
            <div className="grid grid-cols-2 gap-2">
              {optionMap[key].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update(key, option.value)}
                  className={`rounded-[18px] px-4 py-3 text-sm ${
                    form[key] === option.value
                      ? "bg-[var(--accent)] text-[var(--text-on-accent)]"
                      : "bg-[var(--bg-page)] text-[var(--text-secondary)] shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </Card>
      ))}

      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">シェア初期設定</p>
              <p className="text-xs text-[var(--text-secondary)]">初期値は OFF</p>
            </div>
            <button
              type="button"
              onClick={() => update("shareByDefault", !form.shareByDefault)}
              className={`flex h-9 w-16 items-center rounded-full p-1 transition ${
                form.shareByDefault ? "bg-[var(--accent)]" : "bg-[var(--bg-inset)]"
              }`}
            >
              <span
                className={`size-7 rounded-full bg-white transition ${form.shareByDefault ? "translate-x-7" : ""}`}
              />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-[var(--text-secondary)]">
              頻度
              <input
                value={form.reminderFrequency ?? ""}
                onChange={(event) => update("reminderFrequency", event.target.value || null)}
                className="mt-2 w-full rounded-[18px] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)] outline-none"
              />
            </label>
            <label className="text-sm text-[var(--text-secondary)]">
              時間
              <input
                value={form.reminderTime ?? ""}
                onChange={(event) => update("reminderTime", event.target.value || null)}
                className="mt-2 w-full rounded-[18px] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)] outline-none"
              />
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">データ管理</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => exportData("json")}>
              JSON
            </Button>
            <Button variant="secondary" onClick={() => exportData("md")}>
              MD
            </Button>
          </div>
          <Button variant="danger" className="w-full" onClick={() => push({ title: "MVP では未実装です" })}>
            全データ削除
          </Button>
        </div>
      </Card>

      <Button className="w-full" onClick={save} disabled={pending}>
        保存
      </Button>
    </div>
  );
}
