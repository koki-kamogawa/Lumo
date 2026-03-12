import { clamp } from "@/lib/utils";

type EmotionSignal = { label: string; score: number };

export interface WeeklyMetricEntry {
  occurredAt: Date;
  title?: string | null;
  note?: string | null;
  transcript?: { content?: string | null; editedContent?: string | null } | null;
  analysis?: { emotionTopJson?: string | null; summaryFacts?: string | null } | null;
}

function parseJsonArray<T>(value: unknown): T[] {
  if (typeof value !== "string") {
    return Array.isArray(value) ? (value as T[]) : [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function dateKeyInJst(date: Date) {
  const jst = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const year = jst.getFullYear();
  const month = String(jst.getMonth() + 1).padStart(2, "0");
  const day = String(jst.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parsePrimaryEmotion(entry: WeeklyMetricEntry) {
  const list = parseJsonArray<EmotionSignal>(entry.analysis?.emotionTopJson ?? []);
  if (list.length > 0 && typeof list[0].label === "string") {
    return {
      label: list[0].label,
      score: clamp(typeof list[0].score === "number" ? list[0].score : 0.55, 0, 1),
    };
  }
  return { label: "未分類", score: 0.55 };
}

function isNegativeEmotion(label: string) {
  return ["怒", "イライラ", "不安", "焦", "落ち込", "悲", "しんど", "消耗", "不信"].some((word) =>
    label.includes(word),
  );
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractEntryText(entry: WeeklyMetricEntry) {
  const transcriptText = entry.transcript?.editedContent || entry.transcript?.content || "";
  return normalizeText(
    [entry.title ?? "", entry.note ?? "", transcriptText, entry.analysis?.summaryFacts ?? ""].join(" "),
  );
}

export function calculateCurrentStreak(dates: Date[], today = new Date()) {
  if (dates.length === 0) {
    return 0;
  }

  const dateSet = new Set(dates.map((date) => dateKeyInJst(date)));
  const cursor = new Date(today);
  let streak = 0;

  while (true) {
    const key = dateKeyInJst(cursor);
    if (!dateSet.has(key)) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function topEmotionLabels(entries: WeeklyMetricEntry[]) {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const label = parsePrimaryEmotion(entry).label;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function buildThemeTags(entries: WeeklyMetricEntry[]) {
  const texts = entries.map(extractEntryText).join("\n");
  const keywordTags = [
    { regex: /仕事|会議|業務|上司|部下/, tag: "仕事" },
    { regex: /友人|家族|恋人|人間関係|会話/, tag: "人間関係" },
    { regex: /睡眠|寝不足|眠い/, tag: "睡眠" },
    { regex: /運動|散歩|ジム/, tag: "運動" },
    { regex: /将来|目標|成長|キャリア/, tag: "将来" },
    { regex: /疲れ|体調|だるい|寒い|暑い/, tag: "体調" },
  ]
    .filter((item) => item.regex.test(texts))
    .map((item) => item.tag);

  const emotionTags = topEmotionLabels(entries)
    .slice(0, 2)
    .map(([label]) => label);

  const merged = [...emotionTags, ...keywordTags];
  const unique = Array.from(new Set(merged)).filter((tag) => tag.length > 0);
  return unique.length > 0 ? unique.slice(0, 4) : ["記録", "気づき"];
}

function buildRecoveryList(entries: WeeklyMetricEntry[]) {
  const texts = entries.map(extractEntryText).join("\n");
  const recoveryMap = [
    { regex: /散歩|歩く/, label: "短い散歩" },
    { regex: /会話|相談|話す/, label: "信頼できる相手に話す" },
    { regex: /休憩|休む|リフレッシュ/, label: "短い休憩でリセットする" },
    { regex: /深呼吸|呼吸/, label: "深呼吸で身体を落ち着かせる" },
    { regex: /睡眠|寝る/, label: "睡眠時間を確保する" },
    { regex: /書く|日記|言語化/, label: "言語化して整理する" },
  ];

  const hits = recoveryMap.filter((item) => item.regex.test(texts)).map((item) => item.label);
  if (hits.length > 0) {
    return hits.slice(0, 3);
  }

  const [topEmotion] = topEmotionLabels(entries);
  const label = topEmotion?.[0] ?? "";
  if (label.includes("怒")) {
    return ["一度その場を離れる", "深呼吸で身体を落ち着かせる", "境界線を言葉にする"];
  }
  if (label.includes("不安") || label.includes("焦")) {
    return ["最小の次アクションを1つ決める", "5分だけ休憩する", "言語化して整理する"];
  }
  return ["言語化して整理する", "短い休憩でリセットする", "できたことを1つ書く"];
}

function buildChangeSummary(entries: WeeklyMetricEntry[]) {
  if (entries.length < 2) {
    return "今週の記録はまだ少なめです。あと数回で変化がより明確になります。";
  }

  const emotions = entries.map((entry) => parsePrimaryEmotion(entry).label);
  const half = Math.floor(emotions.length / 2);
  const first = emotions.slice(0, half);
  const second = emotions.slice(half);

  const negativeRatio = (labels: string[]) =>
    labels.length === 0 ? 0 : labels.filter((label) => isNegativeEmotion(label)).length / labels.length;

  const firstRatio = negativeRatio(first);
  const secondRatio = negativeRatio(second);
  const diff = secondRatio - firstRatio;

  if (diff <= -0.2) {
    return "週の後半にかけて負荷の高い感情が減り、整え直しが進んでいます。";
  }
  if (diff >= 0.2) {
    return "週の後半で負荷が高まりやすく、回復行動を早めに入れる工夫が必要です。";
  }
  return "週を通じて感情の波はありつつも、記録しながら一定のバランスを保てています。";
}

function buildLoopSummary(entries: WeeklyMetricEntry[]) {
  if (entries.length === 0) {
    return "まだ十分な記録がないため、繰り返しパターンは次週に見えてきます。";
  }

  const top = topEmotionLabels(entries)[0];
  if (!top) {
    return "今週はまだ傾向を判定できるだけのデータがありません。";
  }

  const [emotion, count] = top;
  return `今週は「${emotion}」が${count}回見られ、似た場面で気持ちが動きやすい傾向があります。`;
}

export function buildWeeklyLiveMetrics(entries: WeeklyMetricEntry[], weekStart: Date) {
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const byDay = new Map<string, WeeklyMetricEntry[]>();

  for (const entry of entries) {
    const key = dateKeyInJst(entry.occurredAt);
    const list = byDay.get(key) ?? [];
    list.push(entry);
    byDay.set(key, list);
  }

  const emotionFlowJson = dayLabels.map((day, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = dateKeyInJst(date);
    const dayEntries = byDay.get(key) ?? [];

    if (dayEntries.length === 0) {
      return { day, value: 24 };
    }

    const avgScore =
      dayEntries.reduce((sum, entry) => sum + parsePrimaryEmotion(entry).score, 0) / dayEntries.length;
    const value = clamp(24 + dayEntries.length * 9 + Math.round(avgScore * 20), 24, 88);
    return { day, value };
  });

  const changeSummary = buildChangeSummary(entries);
  const loopSummary = buildLoopSummary(entries);
  const recoveryListJson = buildRecoveryList(entries);
  const themeTagsJson = buildThemeTags(entries);
  const shareLine = `${changeSummary.split("。")[0] || changeSummary}。`;

  return {
    emotionFlowJson,
    themeTagsJson,
    changeSummary,
    loopSummary,
    recoveryListJson,
    shareLine,
  };
}
