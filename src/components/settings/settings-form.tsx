"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchJson } from "@/lib/client";

type SettingsData = {
  responseStyle: string;
  purpose: string;
  adviceIntensity: string;
  memoryMode: string;
  reminderFrequency: string | null;
  reminderTime: string | null;
};

type ThemeMode = "light" | "dark";
type LayoutMode = "mobile" | "desktop";

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
} as const;

const reminderFrequencyOptions = [
  { value: "", label: "未設定" },
  { value: "daily", label: "毎日" },
  { value: "weekday", label: "平日" },
  { value: "weekend", label: "週末" },
  { value: "weekly", label: "週1回" },
];

const reminderTimeOptions = [
  { value: "", label: "未設定" },
  ...Array.from({ length: 18 }).map((_, index) => {
    const hour = String(index + 6).padStart(2, "0");
    return { value: `${hour}:00`, label: `${hour}:00` };
  }),
];

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", mode);
  document.documentElement.style.colorScheme = mode;
  window.localStorage.setItem("lumo-theme", mode);
}

function applyLayoutMode(mode: LayoutMode) {
  document.documentElement.setAttribute("data-layout", mode);
  window.localStorage.setItem("lumo-layout-mode", mode);
}

export function SettingsForm({ initial }: { initial: SettingsData }) {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState(initial);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof document === "undefined") {
      return "light";
    }
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  });
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    if (typeof document === "undefined") {
      return "mobile";
    }
    return document.documentElement.getAttribute("data-layout") === "desktop" ? "desktop" : "mobile";
  });
  const [pending, startTransition] = useTransition();

  const update = (key: keyof SettingsData, value: string | null) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const changeTheme = (nextMode: ThemeMode) => {
    setThemeMode(nextMode);
    applyTheme(nextMode);
  };

  const changeLayoutMode = (nextMode: LayoutMode) => {
    setLayoutMode(nextMode);
    applyLayoutMode(nextMode);
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
      <Card>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">表示テーマ</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => changeTheme("light")}
              aria-pressed={themeMode === "light"}
              className={`pressable-soft rounded-[18px] px-4 py-3 text-sm ${
                themeMode === "light"
                  ? "pressable-soft-accent bg-[var(--accent)] text-[var(--text-on-accent)]"
                  : "pressable-soft-neutral bg-[var(--bg-page)] text-[var(--text-secondary)] shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]"
              }`}
            >
              ライトモード
            </button>
            <button
              type="button"
              onClick={() => changeTheme("dark")}
              aria-pressed={themeMode === "dark"}
              className={`pressable-soft rounded-[18px] px-4 py-3 text-sm ${
                themeMode === "dark"
                  ? "pressable-soft-accent bg-[var(--accent)] text-[var(--text-on-accent)]"
                  : "pressable-soft-neutral bg-[var(--bg-page)] text-[var(--text-secondary)] shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]"
              }`}
            >
              ダークモード
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">画面レイアウト</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => changeLayoutMode("mobile")}
              aria-pressed={layoutMode === "mobile"}
              className={`pressable-soft rounded-[18px] px-4 py-3 text-sm ${
                layoutMode === "mobile"
                  ? "pressable-soft-accent bg-[var(--accent)] text-[var(--text-on-accent)]"
                  : "pressable-soft-neutral bg-[var(--bg-page)] text-[var(--text-secondary)] shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]"
              }`}
            >
              スマホ版
            </button>
            <button
              type="button"
              onClick={() => changeLayoutMode("desktop")}
              aria-pressed={layoutMode === "desktop"}
              className={`pressable-soft rounded-[18px] px-4 py-3 text-sm ${
                layoutMode === "desktop"
                  ? "pressable-soft-accent bg-[var(--accent)] text-[var(--text-on-accent)]"
                  : "pressable-soft-neutral bg-[var(--bg-page)] text-[var(--text-secondary)] shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]"
              }`}
            >
              PC版
            </button>
          </div>
          <p className="text-xs leading-6 text-[var(--text-secondary)]">
            いつでもここでスマホ版に戻せます。切替は即時反映され、次回起動時も保持されます。
          </p>
        </div>
      </Card>

      {(
        [
          ["返し方", "responseStyle"],
          ["目的", "purpose"],
          ["アドバイス強度", "adviceIntensity"],
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
                  className={`pressable-soft rounded-[18px] px-4 py-3 text-sm ${
                    form[key] === option.value
                      ? "pressable-soft-accent bg-[var(--accent)] text-[var(--text-on-accent)]"
                      : "pressable-soft-neutral bg-[var(--bg-page)] text-[var(--text-secondary)] shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </Card>
      ))}

      <Card soft>
        <p className="text-sm font-semibold text-[var(--accent-dark)]">メモリの扱い</p>
        <p className="mt-2 text-sm leading-6 text-[var(--accent-dark)]">
          メモリは自動で保存されます。不要な記憶は Memory 画面からいつでも削除できます。
        </p>
      </Card>

      <Card>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">リマインド通知</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-[var(--text-secondary)]">
              頻度
              <select
                value={form.reminderFrequency ?? ""}
                onChange={(event) => update("reminderFrequency", event.target.value || null)}
                className="mt-2 h-12 w-full rounded-[18px] bg-[var(--bg-page)] px-4 text-[var(--text-primary)] shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)] outline-none"
              >
                {reminderFrequencyOptions.map((option) => (
                  <option key={option.value || "none"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-[var(--text-secondary)]">
              時間
              <select
                value={form.reminderTime ?? ""}
                onChange={(event) => update("reminderTime", event.target.value || null)}
                className="mt-2 h-12 w-full rounded-[18px] bg-[var(--bg-page)] px-4 text-[var(--text-primary)] shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)] outline-none"
              >
                {reminderTimeOptions.map((option) => (
                  <option key={option.value || "none"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">データ出力</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => exportData("json")}>
              JSON
            </Button>
            <Button variant="secondary" onClick={() => exportData("md")}>
              MD
            </Button>
          </div>
          <Button variant="danger" className="w-full" onClick={() => push({ title: "MVPでは未実装です" })}>
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
