import { MemoryMode, type MemoryItem, type Settings } from "@prisma/client";
import { DANGER_KEYWORDS } from "@/lib/constants";
import { analysisOutputSchema } from "@/lib/schemas/domain";
import { clamp } from "@/lib/utils";

interface AnalyzeInput {
  transcript: string;
  settings: Settings;
  memoryItems: MemoryItem[];
  analyzedCount: number;
  toneOverride?: "gentle" | "logical" | "specific";
}

function detectCrisis(text: string) {
  return DANGER_KEYWORDS.some((keyword) => text.includes(keyword));
}

function scoreEmotion(text: string, positiveWords: string[], negativeWords: string[]) {
  const positiveHits = positiveWords.filter((word) => text.includes(word)).length;
  const negativeHits = negativeWords.filter((word) => text.includes(word)).length;
  return clamp((positiveHits + 1) / (positiveHits + negativeHits + 2), 0.15, 0.85);
}

function topQuote(text: string) {
  const sentences = text
    .split(/[。！？\n]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  return sentences[0] ?? text.slice(0, 48);
}

function summarize(text: string) {
  const sentences = text
    .split(/[。！？\n]/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return "今日は話した内容がまだ短いため、次の記録で少しずつ形にしていきましょう。";
  }

  const base = sentences.slice(0, 2).join("。\n");
  return `${base}${base.endsWith("。") ? "" : "。"}`;
}

function inferEmotions(text: string) {
  const anxious = scoreEmotion(text, ["安心", "落ち着", "軽く", "嬉しい"], ["不安", "焦り", "疲れ", "緊張"]);
  const positive = scoreEmotion(text, ["嬉しい", "安心", "感謝", "軽く"], ["悲しい", "不安", "焦り"]);

  if (text.includes("安心") || text.includes("軽く")) {
    return [
      { label: "安心", score: clamp(anxious, 0.34, 0.68) },
      { label: "感謝", score: clamp(1 - anxious, 0.22, 0.5) },
    ];
  }

  if (text.includes("嬉しい") || text.includes("褒め")) {
    return [
      { label: "不安", score: clamp(1 - positive, 0.44, 0.72) },
      { label: "嬉しさ", score: clamp(positive, 0.28, 0.56) },
    ];
  }

  return [
    { label: "焦り", score: 0.57 },
    { label: "疲れ", score: 0.43 },
  ];
}

function toneSuffix(toneOverride?: "gentle" | "logical" | "specific") {
  switch (toneOverride) {
    case "gentle":
      return "やさしく見ても、十分にがんばっていた一日です。";
    case "logical":
      return "要因と反応がつながって見えてきています。";
    case "specific":
      return "次回は場面と体の反応を一つずつ分けて話すと、さらに具体化できます。";
    default:
      return "次の一歩が見えるところまで整理できています。";
  }
}

function buildMemoryProposals(text: string, quote: string) {
  const proposals = [];

  if (text.includes("友人") || text.includes("話")) {
    proposals.push({
      memory_text: "人と落ち着いて話せると、気持ちが整理されやすい。",
      confidence: 0.71,
      stability: 0.62,
      sensitivity: "LOW" as const,
      evidence_quote: quote,
    });
  }

  if (text.includes("不安") || text.includes("焦")) {
    proposals.push({
      memory_text: "期待や締め切りが重なると、焦りが体の緊張として出やすい。",
      confidence: 0.69,
      stability: 0.66,
      sensitivity: "MEDIUM" as const,
      evidence_quote: quote,
    });
  }

  if (text.includes("褒め") || text.includes("評価")) {
    proposals.push({
      memory_text: "評価される場面では、喜びと次への不安が同時に出やすい。",
      confidence: 0.74,
      stability: 0.68,
      sensitivity: "MEDIUM" as const,
      evidence_quote: quote,
    });
  }

  if (proposals.length === 0) {
    proposals.push({
      memory_text: "気持ちを言葉にすると、次の行動が見えやすくなる。",
      confidence: 0.63,
      stability: 0.55,
      sensitivity: "LOW" as const,
      evidence_quote: quote,
    });
  }

  return proposals.slice(0, 3);
}

export interface AnalyzeResult extends ReturnType<typeof analysisOutputSchema.parse> {
  crisisDetected: boolean;
  memoryMode: MemoryMode;
}

export interface Analyzer {
  analyze(input: AnalyzeInput): Promise<AnalyzeResult>;
}

class DummyAnalyzer implements Analyzer {
  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const crisisDetected = detectCrisis(input.transcript);
    const quote = topQuote(input.transcript);
    const emotionTop = inferEmotions(input.transcript);
    const entryCount = input.analyzedCount + 1;

    const base = crisisDetected
      ? {
          summary_facts:
            "つらさの強いサインが含まれているかもしれません。\n今は分析より、安全を優先してよい状態です。",
          emotion_top: [
            { label: "切迫感", score: 0.72 },
            { label: "孤立感", score: 0.28 },
          ],
          energy_peak_quote: quote,
          followup_question:
            "いま一人なら、信頼できる人や窓口につなげそうですか。答えなくても大丈夫です。",
          week_hint_line: "今週は負荷が高く、ひとりで抱え込みやすいサインが見えます。",
          praise_line: "ここに言葉を残したこと自体が、とても大切な行動です。",
          praise_evidence_quote: quote,
          micro_badge: entryCount <= 3 ? "SAFETY_FIRST" : null,
          next_teaser:
            "必要なら、より安全な支援先を一緒に確認しましょう。日本では よりそいホットライン などの相談先があります。",
          memory_proposals: [],
        }
      : {
          summary_facts: `${summarize(input.transcript)}\n${toneSuffix(input.toneOverride)}`,
          emotion_top: emotionTop,
          energy_peak_quote: quote,
          followup_question:
            input.settings.purpose === "GOAL"
              ? "明日に持ち越したい一つの行動は何ですか？"
              : "この場面で本当はどんな気持ちを一番わかってほしかった？",
          week_hint_line:
            input.memoryItems.length > 0
              ? "今週は、すでに話してきたパターンが少しずつ言葉としてつながっています。"
              : "今週の傾向は、あと数回の記録でよりはっきり見えてきます。",
          praise_line:
            entryCount <= 3
              ? "言いにくい感情まで残せたのは、ちゃんと自分に向き合えている証拠です。"
              : "今日の観察も、前より輪郭がはっきりしています。",
          praise_evidence_quote: quote,
          micro_badge:
            entryCount <= 3 ? ["TALKED", "CONTINUED", "PATTERN_FOUND"][entryCount - 1] ?? null : null,
          next_teaser:
            input.toneOverride === "logical"
              ? "次は、出来事と感情を分けてみると流れがさらに見えます。"
              : "次は、少し楽だった瞬間も一緒に拾っていきましょう。",
          memory_proposals: buildMemoryProposals(input.transcript, quote),
        };

    const parsed = analysisOutputSchema.parse(base);

    return {
      ...parsed,
      crisisDetected,
      memoryMode: input.settings.memoryMode,
    };
  }
}

export const analyzer: Analyzer = new DummyAnalyzer();
