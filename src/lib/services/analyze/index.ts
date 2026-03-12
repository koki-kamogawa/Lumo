import { MemoryMode, type MemoryItem, type Settings } from "@prisma/client";
import { analysisOutputSchema } from "@/lib/schemas/domain";
import { clamp } from "@/lib/utils";

interface AnalyzeInput {
  transcript: string;
  settings: Settings;
  memoryItems: MemoryItem[];
  analyzedCount: number;
  toneOverride?: "gentle" | "logical" | "specific";
}

type EmotionItem = { label: string; score: number };
type MemoryProposalItem = {
  memory_text: string;
  confidence: number;
  stability: number;
  sensitivity: "LOW" | "MEDIUM" | "HIGH";
  evidence_quote: string;
};

type ParsedAnalysis = ReturnType<typeof analysisOutputSchema.parse>;
type AnyRecord = Record<string, unknown>;

const CRISIS_KEYWORDS = ["死にたい", "消えたい", "自傷", "リストカット", "自殺", "殺したい", "もう無理"];
const FIRST_BADGES = ["TALKED", "CONTINUED", "PATTERN_FOUND"] as const;

const EMOTION_LEXICON: Record<string, string[]> = {
  喜び: ["嬉しい", "楽しい", "達成", "よかった", "最高"],
  怒り: ["イライラ", "腹が立つ", "最悪", "理不尽", "ムカつく"],
  不安: ["不安", "焦り", "緊張", "怖い", "心配"],
  落ち込み: ["落ち込む", "つらい", "しんどい", "だめ", "自己嫌悪"],
  安堵: ["ほっと", "安心", "落ち着いた", "リフレッシュ"],
};

const NEGATIVE_CUES = ["無駄", "責め", "落ち込", "つらい", "しんどい", "不安", "最悪"];
const SELF_BLAME_CUES = ["自分を責め", "自己嫌悪", "だめ", "価値がない", "情けない"];
const ANGER_CUES = ["イライラ", "腹が立つ", "最悪", "ムカつく", "理不尽", "待たされた"];
const POSITIVE_CUES = ["嬉しい", "楽しい", "達成", "よかった", "安心", "リフレッシュ"];
const RECOVERY_CUES = ["落ち着", "ほっと", "回復", "整った", "休め"];
const EXHAUSTION_CUES = ["疲れ", "消耗", "無気力", "ヘトヘト", "重い", "だるい"];

type AffectDominant = "NEGATIVE" | "POSITIVE" | "MIXED";

interface AffectProfile {
  negative: number;
  positive: number;
  selfBlame: number;
  anger: number;
  recovery: number;
  exhaustion: number;
  dominant: AffectDominant;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitSentences(text: string) {
  return text
    .split(/[。！？!?]\s*|\n+/)
    .map((v) => normalizeText(v))
    .filter(Boolean);
}

function countCueHits(text: string, cues: string[]) {
  return cues.reduce((sum, cue) => sum + (text.includes(cue) ? 1 : 0), 0);
}

function analyzeAffect(transcript: string): AffectProfile {
  const text = normalizeText(transcript);
  const negative = countCueHits(text, NEGATIVE_CUES);
  const positive = countCueHits(text, POSITIVE_CUES);
  const selfBlame = countCueHits(text, SELF_BLAME_CUES);
  const anger = countCueHits(text, ANGER_CUES);
  const recovery = countCueHits(text, RECOVERY_CUES);
  const exhaustion = countCueHits(text, EXHAUSTION_CUES);

  const negativeScore = negative + selfBlame * 1.2 + anger * 1.3 + exhaustion * 0.8;
  const positiveScore = positive + recovery * 0.8;

  let dominant: AffectDominant = "MIXED";
  if (negativeScore >= positiveScore + 1.2) {
    dominant = "NEGATIVE";
  } else if (positiveScore >= negativeScore + 1.2) {
    dominant = "POSITIVE";
  }

  return { negative, positive, selfBlame, anger, recovery, exhaustion, dominant };
}

function detectCrisis(text: string) {
  return CRISIS_KEYWORDS.some((keyword) => text.includes(keyword));
}

function pickEnergyQuote(transcript: string) {
  const sentences = splitSentences(transcript);
  if (sentences.length === 0) {
    return transcript.slice(0, 60);
  }

  const ranked = [...sentences].sort((a, b) => {
    const aSignal = /怒|イライラ|不安|つら|嬉|安心|焦|疲/.test(a) ? 1 : 0;
    const bSignal = /怒|イライラ|不安|つら|嬉|安心|焦|疲/.test(b) ? 1 : 0;
    if (aSignal !== bSignal) {
      return bSignal - aSignal;
    }
    return b.length - a.length;
  });

  return ranked[0];
}

function normalizeScorePair(items: EmotionItem[]) {
  const first = items[0] ?? { label: "不安", score: 0.55 };
  const second = items[1] ?? { label: first.label === "安堵" ? "不安" : "安堵", score: 0.45 };
  const safeA = clamp(first.score, 0.1, 0.9);
  const safeB = clamp(second.score, 0.1, 0.9);
  const sum = safeA + safeB;
  return [
    { label: first.label, score: safeA / sum },
    { label: second.label, score: safeB / sum },
  ];
}

function inferEmotions(transcript: string): EmotionItem[] {
  const text = normalizeText(transcript);
  const affect = analyzeAffect(text);
  const scored = Object.entries(EMOTION_LEXICON).map(([label, words]) => ({
    label,
    score: words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0),
  }));

  const angerIndex = scored.findIndex((item) => item.label === "怒り");
  if (angerIndex >= 0) {
    scored[angerIndex].score += affect.anger * 2;
  }

  if (affect.dominant === "NEGATIVE") {
    const joyIndex = scored.findIndex((item) => item.label === "喜び");
    if (joyIndex >= 0) {
      scored[joyIndex].score = Math.max(0, scored[joyIndex].score - 1);
    }
  }

  const sorted = scored.sort((a, b) => b.score - a.score);
  const first = sorted[0];
  const second = sorted[1];

  if (!first || first.score === 0) {
    return [
      { label: "不安", score: 0.58 },
      { label: "安堵", score: 0.42 },
    ];
  }

  return normalizeScorePair([
    { label: first.label, score: clamp(0.55 + first.score * 0.08, 0.45, 0.85) },
    { label: second?.label ?? "安堵", score: 0.45 },
  ]);
}

function isPositiveEmotion(label: string) {
  return ["喜び", "安堵", "安心"].some((v) => label.includes(v));
}

function isNegativeEmotion(label: string) {
  return ["怒り", "不安", "落ち込み", "しんどさ", "悲しみ", "焦り"].some((v) => label.includes(v));
}

function shouldOverrideEmotion(raw: EmotionItem[], affect: AffectProfile) {
  const primary = raw[0]?.label ?? "";
  if (!primary) {
    return true;
  }

  if (affect.dominant === "NEGATIVE" && isPositiveEmotion(primary)) {
    return true;
  }

  if ((affect.selfBlame > 0 || affect.negative >= 2 || affect.anger > 0) && isPositiveEmotion(primary)) {
    return true;
  }

  if (affect.dominant === "POSITIVE" && isNegativeEmotion(primary) && affect.negative === 0) {
    return true;
  }

  return false;
}

function inferEmotionsFromAffect(affect: AffectProfile): EmotionItem[] {
  if (affect.dominant === "NEGATIVE") {
    if (affect.anger > 0) {
      return normalizeScorePair([
        { label: "怒り", score: 0.68 },
        { label: affect.exhaustion > 0 ? "消耗" : "不信感", score: 0.32 },
      ]);
    }
    if (affect.selfBlame > 0) {
      return normalizeScorePair([
        { label: "落ち込み", score: 0.68 },
        { label: affect.recovery > 0 ? "安堵" : "不安", score: 0.32 },
      ]);
    }

    return normalizeScorePair([
      { label: affect.exhaustion > 0 ? "しんどさ" : "不安", score: 0.64 },
      { label: affect.recovery > 0 ? "安堵" : "焦り", score: 0.36 },
    ]);
  }

  if (affect.dominant === "POSITIVE") {
    return normalizeScorePair([
      { label: "喜び", score: 0.62 },
      { label: "安堵", score: 0.38 },
    ]);
  }

  return normalizeScorePair([
    { label: "揺れ", score: 0.58 },
    { label: "安堵", score: 0.42 },
  ]);
}

function compactSummaryLines(text: string, maxLines = 3) {
  const source = splitSentences(text)
    .map((sentence) => sentence.replace(/[。！？!?]+$/g, "").trim())
    .filter(Boolean)
    .slice(0, 8);

  if (source.length === 0) {
    return "";
  }

  const lines: string[] = [];
  let index = 0;
  while (index < source.length && lines.length < maxLines) {
    let line = source[index];
    index += 1;
    while (index < source.length && line.length < 34 && source[index].length <= 18) {
      line = `${line}、${source[index]}`;
      index += 1;
    }
    lines.push(`${line}。`);
  }

  return lines.join("\n");
}

function summarizeFacts(transcript: string, affect: AffectProfile = analyzeAffect(transcript)) {
  const sentences = splitSentences(transcript);
  if (sentences.length === 0) {
    return "今日は短いながらも記録を残せました。\n言葉にしようとした時点で、前進が始まっています。";
  }

  if (affect.dominant === "NEGATIVE") {
    const lines: string[] = [];
    const waitingBurden = /待|待た|外|寒|凍え/.test(transcript);
    lines.push(
      waitingBurden
        ? "予定外の待ち時間が長引き、外での負荷が重なって消耗した一日でした。"
        : "思った通りに進まない出来事が重なり、負担の大きい一日でした。",
    );

    if (affect.anger > 0) {
      lines.push("主な感情は怒りと理不尽さで、「最悪だった」という感覚が強く残っています。");
    } else if (affect.selfBlame > 0) {
      lines.push("主な感情は落ち込みと自己批判で、自分を責める気持ちが続いています。");
    } else {
      lines.push("主な感情は不安としんどさで、余力を奪われる感覚が中心でした。");
    }

    if (/嬉しい|よかった|リフレッシュ|安心/.test(transcript)) {
      lines.push("一方で、前向きに捉えられた要素もあり、感情は一色ではありませんでした。");
    }
    return lines.slice(0, 3).join("\n");
  }

  return compactSummaryLines(transcript, 3);
}

function pickFollowupQuestion(input: AnalyzeInput, primaryEmotion?: string) {
  if (input.settings.purpose === "GOAL") {
    return "明日、10分以内でできる最小の一歩は何にしますか？";
  }
  if (input.settings.purpose === "ORGANIZE") {
    return "いま一番引っかかっている点を、ひと言で言うと何ですか？";
  }
  if (primaryEmotion?.includes("怒")) {
    return "いまの怒りは、何を守りたかった気持ちの裏返しだと思いますか？";
  }
  if (primaryEmotion?.includes("不安")) {
    return "不安が少し軽くなった瞬間は、今日のどこにありましたか？";
  }
  if (primaryEmotion?.includes("落ち込み") || primaryEmotion?.includes("しんど")) {
    return "今日は責める言葉ではなく、事実だけで自分を見たら何と言えますか？";
  }
  if (primaryEmotion?.includes("喜")) {
    return "その前向きな感覚を再現するなら、次に何を続けたいですか？";
  }
  return "今日の自分に、ひと言だけ返すなら何と言いますか？";
}

function pickWeekHint(input: AnalyzeInput, primaryEmotion?: string) {
  if (input.memoryItems.length === 0) {
    return "今週の傾向は、あと数回の記録でよりはっきり見えてきます。";
  }
  if (primaryEmotion?.includes("怒")) {
    return "今週は理不尽さを感じる場面で怒りが強まりやすく、境界線を引く工夫が鍵になりそうです。";
  }
  if (primaryEmotion?.includes("不安")) {
    return "今週は負荷の高い場面で不安が立ち上がりやすい一方、言語化で落ち着きを取り戻せています。";
  }
  if (primaryEmotion?.includes("落ち込み") || primaryEmotion?.includes("しんど")) {
    return "今週は自己評価が厳しくなりやすい傾向がありますが、記録で回復の糸口もつかめています。";
  }
  if (primaryEmotion?.includes("喜")) {
    return "今週は前向きな手応えが増え、自己効力感の芽が育っています。";
  }
  return "今週は感情の波を観察しながら、言葉で整える力が安定してきています。";
}

function buildPraiseLine(entryCount: number, evidenceQuote: string, affect?: AffectProfile) {
  if (affect?.dominant === "NEGATIVE") {
    if (affect.anger > 0) {
      return `「${evidenceQuote.slice(0, 24)}」と理不尽さを具体的に言語化できたのは、感情整理の大きな一歩です。`;
    }
    if (entryCount <= 3) {
      return `「${evidenceQuote.slice(0, 24)}」と、しんどさを正直に言葉にできたこと自体が今日の前進です。`;
    }
    return "しんどい日でも事実を言葉にできていて、立て直すための土台が続いています。";
  }

  if (entryCount <= 3) {
    return `「${evidenceQuote.slice(0, 22)}」と具体的に言語化できたのが、今日の強さです。`;
  }
  return "今日も感情を言葉に変える習慣が続いていて、自己理解の精度が上がっています。";
}

function normalizeMemoryText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[「」『』（）()［］【】、。,.!！?？:：;；・…ー\-]/g, "");
}

function buildMemoryProposals(transcript: string, evidenceQuote: string): MemoryProposalItem[] {
  const proposals: MemoryProposalItem[] = [];

  if (/不安|焦り|緊張/.test(transcript)) {
    proposals.push({
      memory_text: "負荷が高い場面では、不安や焦りが先に立ちやすい。",
      confidence: 0.72,
      stability: 0.64,
      sensitivity: "MEDIUM",
      evidence_quote: evidenceQuote,
    });
  }
  if (/話す|相談|友人|同僚/.test(transcript)) {
    proposals.push({
      memory_text: "人に話して言語化すると、感情の整理が進みやすい。",
      confidence: 0.75,
      stability: 0.66,
      sensitivity: "LOW",
      evidence_quote: evidenceQuote,
    });
  }
  if (/疲れ|寝不足|体調|寒/.test(transcript)) {
    proposals.push({
      memory_text: "コンディション負荷が高い日は、思考が悲観寄りになりやすい。",
      confidence: 0.68,
      stability: 0.61,
      sensitivity: "MEDIUM",
      evidence_quote: evidenceQuote,
    });
  }
  if (proposals.length === 0) {
    proposals.push({
      memory_text: "言葉にした直後は、気持ちが整理されやすい。",
      confidence: 0.63,
      stability: 0.58,
      sensitivity: "LOW",
      evidence_quote: evidenceQuote,
    });
  }

  const seen = new Set<string>();
  const unique = proposals.filter((p) => {
    const key = normalizeMemoryText(p.memory_text);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return unique.slice(0, 3);
}

function buildCrisisResult(entryCount: number, quote: string, memoryMode: MemoryMode) {
  const parsed = analysisOutputSchema.parse({
    summary_facts:
      "強いしんどさや危機につながる表現が見られました。\n今は分析よりも安全確保を最優先にしてください。",
    emotion_top: [
      { label: "強い負荷", score: 0.74 },
      { label: "不安", score: 0.26 },
    ],
    energy_peak_quote: quote,
    followup_question:
      "今この瞬間の安全のために、連絡できる人や窓口へつながれますか？（答えなくても大丈夫です）",
    week_hint_line: "安全確保を最優先にする週です。必要なら専門窓口の支援を使ってください。",
    praise_line: "助けを求める選択は、状況を守るための大切な行動です。",
    praise_evidence_quote: quote,
    micro_badge: entryCount <= 3 ? "SAFETY_FIRST" : null,
    next_teaser: "次回は「今すぐできる安全行動」を1つだけ記録してみましょう。",
    memory_proposals: [],
  });

  return { ...parsed, crisisDetected: true, memoryMode };
}

function asRecord(value: unknown): AnyRecord | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as AnyRecord;
  }
  return null;
}

function pick(obj: AnyRecord, keys: string[]) {
  for (const key of keys) {
    if (Object.hasOwn(obj, key)) {
      return obj[key];
    }
  }
  return undefined;
}

function toStringValue(value: unknown) {
  if (typeof value === "string") {
    return normalizeText(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function toScore(value: unknown, fallback = 0.5) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clamp(value > 1 ? value / 100 : value, 0, 1);
  }
  if (typeof value === "string") {
    const cleaned = value.replace("%", "").trim();
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) {
      return clamp(parsed > 1 ? parsed / 100 : parsed, 0, 1);
    }
  }
  return clamp(fallback, 0, 1);
}

function toSensitivity(value: unknown): MemoryProposalItem["sensitivity"] {
  if (typeof value === "string") {
    const upper = value.toUpperCase();
    if (upper === "LOW" || upper === "MEDIUM" || upper === "HIGH") {
      return upper;
    }
    if (upper.includes("低")) {
      return "LOW";
    }
    if (upper.includes("高")) {
      return "HIGH";
    }
  }
  return "MEDIUM";
}

function toEmotionArray(value: unknown): EmotionItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed = value
    .map((item) => asRecord(item))
    .filter((item): item is AnyRecord => Boolean(item))
    .map((item) => ({
      label: toStringValue(pick(item, ["label", "name", "emotion"])),
      score: toScore(pick(item, ["score", "value", "ratio"]), 0.5),
    }))
    .filter((item) => item.label.length > 0);

  return parsed.slice(0, 2);
}

function toMemoryProposals(value: unknown, fallbackQuote: string): MemoryProposalItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asRecord(item))
    .filter((item): item is AnyRecord => Boolean(item))
    .map((item) => ({
      memory_text: toStringValue(pick(item, ["memory_text", "memoryText", "text"])),
      confidence: toScore(pick(item, ["confidence", "score"]), 0.63),
      stability: toScore(pick(item, ["stability", "consistency"]), 0.58),
      sensitivity: toSensitivity(pick(item, ["sensitivity", "level"])),
      evidence_quote: toStringValue(pick(item, ["evidence_quote", "evidenceQuote", "quote"])) || fallbackQuote,
    }))
    .filter((item) => item.memory_text.length > 0)
    .slice(0, 3);
}

function extractCandidateObject(raw: unknown): AnyRecord {
  const direct = asRecord(raw);
  if (!direct) {
    return {};
  }

  const expectedKeys = [
    "summary_facts",
    "summaryFacts",
    "emotion_top",
    "emotionTop",
    "followup_question",
    "followupQuestion",
  ];

  if (expectedKeys.some((key) => Object.hasOwn(direct, key))) {
    return direct;
  }

  const nestedKeys = ["analysis", "result", "output", "data", "response"];
  for (const key of nestedKeys) {
    const nested = asRecord(direct[key]);
    if (nested && expectedKeys.some((k) => Object.hasOwn(nested, k))) {
      return nested;
    }
  }

  return direct;
}

function normalizeModelOutput(raw: unknown, input: AnalyzeInput): ParsedAnalysis {
  const candidate = extractCandidateObject(raw);
  const transcript = normalizeText(input.transcript);
  const affect = analyzeAffect(transcript);
  const fallbackEnergyQuote = pickEnergyQuote(transcript);
  const fallbackEmotions = shouldOverrideEmotion(inferEmotions(transcript), affect)
    ? inferEmotionsFromAffect(affect)
    : inferEmotions(transcript);

  const emotionRaw = toEmotionArray(pick(candidate, ["emotion_top", "emotionTop"]));
  const emotionTop =
    emotionRaw.length > 0
      ? normalizeScorePair(emotionRaw)
      : normalizeScorePair(fallbackEmotions);

  const primaryEmotion = emotionTop[0]?.label;
  const energyQuote =
    toStringValue(pick(candidate, ["energy_peak_quote", "energyPeakQuote", "energy_quote"])) || fallbackEnergyQuote;
  const summary =
    toStringValue(pick(candidate, ["summary_facts", "summaryFacts", "summary"])) ||
    summarizeFacts(transcript, affect);
  const followupQuestion =
    toStringValue(pick(candidate, ["followup_question", "followupQuestion", "question"])) ||
    pickFollowupQuestion(input, primaryEmotion);
  const weekHint =
    toStringValue(pick(candidate, ["week_hint_line", "weekHintLine", "week_hint"])) ||
    pickWeekHint(input, primaryEmotion);
  const evidenceQuote =
    toStringValue(pick(candidate, ["praise_evidence_quote", "praiseEvidenceQuote", "evidence_quote"])) || energyQuote;
  const praiseLine =
    toStringValue(pick(candidate, ["praise_line", "praiseLine"])) ||
    buildPraiseLine(input.analyzedCount + 1, evidenceQuote, affect);
  const nextTeaser =
    toStringValue(pick(candidate, ["next_teaser", "nextTeaser"])) ||
    "次回は、少し楽だった瞬間を1つ拾ってみましょう。";

  const rawMicroBadge = pick(candidate, ["micro_badge", "microBadge"]);
  const microBadge =
    rawMicroBadge == null
      ? null
      : toStringValue(rawMicroBadge) || null;

  const memoryProposals = toMemoryProposals(
    pick(candidate, ["memory_proposals", "memoryProposals"]),
    evidenceQuote,
  );

  return analysisOutputSchema.parse({
    summary_facts: summary,
    emotion_top: emotionTop,
    energy_peak_quote: energyQuote,
    followup_question: followupQuestion,
    week_hint_line: weekHint,
    praise_line: praiseLine,
    praise_evidence_quote: evidenceQuote,
    micro_badge: microBadge,
    next_teaser: nextTeaser,
    memory_proposals: memoryProposals,
  });
}

function qualityPostProcess(raw: ParsedAnalysis, input: AnalyzeInput): ParsedAnalysis {
  const entryCount = input.analyzedCount + 1;
  const transcript = normalizeText(input.transcript);
  const affect = analyzeAffect(transcript);

  let emotionTop = normalizeScorePair(raw.emotion_top);
  if (shouldOverrideEmotion(emotionTop, affect)) {
    emotionTop = inferEmotionsFromAffect(affect);
  }

  const primaryEmotion = emotionTop[0]?.label;
  const energyQuote = normalizeText(raw.energy_peak_quote || pickEnergyQuote(transcript));

  let summary = normalizeText(raw.summary_facts);
  if (!summary || summary.length < 30) {
    summary = summarizeFacts(transcript, affect);
  } else {
    summary = compactSummaryLines(summary, 3);
  }

  const followupQuestion = normalizeText(
    raw.followup_question || pickFollowupQuestion(input, primaryEmotion),
  );
  const weekHint = normalizeText(raw.week_hint_line || pickWeekHint(input, primaryEmotion));

  let evidenceQuote = normalizeText(raw.praise_evidence_quote || "");
  if (!evidenceQuote || !transcript.includes(evidenceQuote.slice(0, Math.min(8, evidenceQuote.length)))) {
    evidenceQuote = energyQuote;
  }

  const praiseLineRaw = normalizeText(raw.praise_line || "");
  const generatedPraise = buildPraiseLine(entryCount, evidenceQuote, affect);
  const praiseLine = affect.dominant === "NEGATIVE" ? generatedPraise : praiseLineRaw || generatedPraise;

  const microBadge = entryCount <= 3 ? raw.micro_badge ?? FIRST_BADGES[entryCount - 1] : null;
  const nextTeaser = normalizeText(
    raw.next_teaser ||
      (affect.dominant === "NEGATIVE"
        ? "次回は、責める言葉ではなく「少しマシだった瞬間」を1つだけ記録してみましょう。"
        : "次回は、少し楽だった瞬間を1つ拾ってみましょう。"),
  );

  const proposals = (raw.memory_proposals ?? [])
    .map((p) => ({
      ...p,
      memory_text: normalizeText(p.memory_text),
      evidence_quote: normalizeText(p.evidence_quote || evidenceQuote),
      confidence: clamp(p.confidence, 0, 1),
      stability: clamp(p.stability, 0, 1),
      sensitivity: p.sensitivity,
    }))
    .filter((p) => p.memory_text.length >= 8);

  const fallbackProposals = buildMemoryProposals(transcript, evidenceQuote);
  const merged = [...proposals, ...fallbackProposals];
  const seen = new Set<string>();
  const deduped = merged.filter((p) => {
    const key = normalizeMemoryText(p.memory_text);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return analysisOutputSchema.parse({
    summary_facts: summary,
    emotion_top: emotionTop,
    energy_peak_quote: energyQuote,
    followup_question:
      followupQuestion.endsWith("？") || followupQuestion.endsWith("?")
        ? followupQuestion
        : `${followupQuestion}？`,
    week_hint_line: weekHint,
    praise_line: praiseLine,
    praise_evidence_quote: evidenceQuote,
    micro_badge: microBadge,
    next_teaser: nextTeaser,
    memory_proposals: deduped.slice(0, 3),
  });
}

function buildSystemPrompt(input: AnalyzeInput) {
  const styleMap = {
    EMPATHETIC: "共感多め",
    BALANCED: "バランス",
    CONCLUSION_FOCUSED: "結論多め",
  } as const;
  const purposeMap = {
    MOOD: "気分整理",
    ORGANIZE: "悩み整理",
    GOAL: "目標達成",
    SELF_UNDERSTANDING: "自己理解",
  } as const;
  const adviceMap = {
    LOW: "低",
    MEDIUM: "中",
    HIGH: "高",
  } as const;
  const toneMap = {
    gentle: "もっと優しく",
    logical: "もっと論理的に",
    specific: "もっと具体的に",
  } as const;

  const memoryHints = input.memoryItems
    .slice(0, 20)
    .map((memory) => `- ${memory.memoryText}`)
    .join("\n");

  return [
    "あなたは音声日記アプリ Lumo の分析AIです。必ず JSON オブジェクトのみ返してください。",
    "出力に必須なキーは以下です: summary_facts, emotion_top, energy_peak_quote, followup_question, week_hint_line, praise_line, praise_evidence_quote, micro_badge, next_teaser, memory_proposals",
    "summary_facts は2-3行。本文の抜粋ではなく、出来事→感情→変化を要約してください。",
    "emotion_top は最大2件、scoreは0-1の実数。",
    "memory_proposals は最大3件、重複禁止。",
    "医療診断や断定は避け、『傾向』『かもしれない』表現にしてください。",
    `返し方: ${styleMap[input.settings.responseStyle]}`,
    `目的: ${purposeMap[input.settings.purpose]}`,
    `アドバイス強度: ${adviceMap[input.settings.adviceIntensity]}`,
    `一時トーン指定: ${input.toneOverride ? toneMap[input.toneOverride] : "なし"}`,
    `メモリ方式: ${input.settings.memoryMode}`,
    "既存メモリ（要約）:",
    memoryHints || "- なし",
  ].join("\n");
}

function buildUserPrompt(input: AnalyzeInput) {
  return [`entry_count: ${input.analyzedCount + 1}`, "transcript:", input.transcript].join("\n");
}

function parseJsonFromContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Empty response content");
  }

  const withoutCodeFence = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutCodeFence);
  } catch {
    const jsonStart = withoutCodeFence.indexOf("{");
    const jsonEnd = withoutCodeFence.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      return JSON.parse(withoutCodeFence.slice(jsonStart, jsonEnd + 1));
    }
  }

  throw new Error("JSON payload was not found in model output");
}

export interface AnalyzeResult extends ParsedAnalysis {
  crisisDetected: boolean;
  memoryMode: MemoryMode;
}

export interface Analyzer {
  analyze(input: AnalyzeInput): Promise<AnalyzeResult>;
}

class DummyAnalyzer implements Analyzer {
  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const entryCount = input.analyzedCount + 1;
    const quote = pickEnergyQuote(input.transcript);
    const crisisDetected = detectCrisis(input.transcript);

    if (crisisDetected) {
      return buildCrisisResult(entryCount, quote, input.settings.memoryMode);
    }

    const base = analysisOutputSchema.parse({
      summary_facts: summarizeFacts(input.transcript),
      emotion_top: inferEmotions(input.transcript),
      energy_peak_quote: quote,
      followup_question: pickFollowupQuestion(input, inferEmotions(input.transcript)[0]?.label),
      week_hint_line: pickWeekHint(input, inferEmotions(input.transcript)[0]?.label),
      praise_line: buildPraiseLine(entryCount, quote, analyzeAffect(input.transcript)),
      praise_evidence_quote: quote,
      micro_badge: entryCount <= 3 ? FIRST_BADGES[entryCount - 1] : null,
      next_teaser: "次回は、少し楽だった瞬間を1つ拾ってみましょう。",
      memory_proposals: buildMemoryProposals(input.transcript, quote),
    });

    const polished = qualityPostProcess(base, input);
    return { ...polished, crisisDetected: false, memoryMode: input.settings.memoryMode };
  }
}

class ClaudeAnalyzer implements Analyzer {
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.ANTHROPIC_MODEL || "",
    private readonly baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
    private readonly fallback = new DummyAnalyzer(),
  ) {}

  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    if (!this.model) {
      throw new Error("ANTHROPIC_MODEL is not configured.");
    }

    const entryCount = input.analyzedCount + 1;
    const crisisDetected = detectCrisis(input.transcript);
    const quote = pickEnergyQuote(input.transcript);

    if (crisisDetected) {
      return buildCrisisResult(entryCount, quote, input.settings.memoryMode);
    }

    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1600,
          temperature: 0.15,
          system: `${buildSystemPrompt(input)}\n必ずJSONのみを返してください。コードブロックは禁止です。`,
          messages: [{ role: "user", content: buildUserPrompt(input) }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 404) {
          throw new Error(`Claude model not found: ${this.model}. Check ANTHROPIC_MODEL.`);
        }
        throw new Error(`Claude analyze failed (${response.status}): ${errorText}`);
      }

      const payload = (await response.json()) as {
        content?: Array<{ type?: string; text?: string }>;
      };

      const content = (payload.content ?? [])
        .filter((item) => item.type === "text" && typeof item.text === "string")
        .map((item) => item.text ?? "")
        .join("\n");

      const rawModelJson = parseJsonFromContent(content);
      const normalized = normalizeModelOutput(rawModelJson, input);
      const polished = qualityPostProcess(normalized, input);

      return { ...polished, crisisDetected: false, memoryMode: input.settings.memoryMode };
    } catch (error) {
      if (process.env.ALLOW_DUMMY_ANALYZE_FALLBACK === "true") {
        return this.fallback.analyze(input);
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Anthropic analyze failed without fallback: ${message}`);
    }
  }
}

class AnthropicRequiredAnalyzer implements Analyzer {
  async analyze(): Promise<AnalyzeResult> {
    throw new Error("ANTHROPIC_API_KEY is not configured. Dummy analyzer is disabled.");
  }
}

function createAnalyzer(): Analyzer {
  if (process.env.ANTHROPIC_API_KEY) {
    return new ClaudeAnalyzer(process.env.ANTHROPIC_API_KEY);
  }
  if (process.env.ALLOW_DUMMY_ANALYZE_FALLBACK === "true") {
    return new DummyAnalyzer();
  }
  return new AnthropicRequiredAnalyzer();
}

export const analyzer: Analyzer = createAnalyzer();
