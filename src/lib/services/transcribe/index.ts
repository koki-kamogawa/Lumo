import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface TranscribeInput {
  entryId: string;
  note?: string | null;
  existingTranscript?: string | null;
  audioFilePath?: string | null;
  audioMimeType?: string | null;
}

export interface TranscribeResult {
  content: string;
  confidence: number;
  source: string;
}

export interface Transcriber {
  transcribe(input: TranscribeInput): Promise<TranscribeResult>;
}

function resolveAudioPath(filePath: string) {
  const isDriveAbsolute = /^[a-zA-Z]:[\\/]/.test(filePath);
  const isUncPath = /^\\\\/.test(filePath);

  // "/uploads/..." は公開URL由来の保存パスなので public 配下へ解決する
  if (isDriveAbsolute || isUncPath) {
    return filePath;
  }

  const sanitized = filePath.replace(/^[/\\]+/, "");
  return path.join(process.cwd(), "public", sanitized);
}

function parseWhisperText(raw: string) {
  const payload = JSON.parse(raw) as {
    result?: Array<{ text?: string }>;
    transcription?: Array<{ text?: string }>;
    text?: string;
  };

  if (typeof payload.text === "string" && payload.text.trim()) {
    return payload.text.trim();
  }

  const list = Array.isArray(payload.result)
    ? payload.result
    : Array.isArray(payload.transcription)
      ? payload.transcription
      : [];
  const text = list
    .map((item) => item.text ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

class LocalFallbackTranscriber implements Transcriber {
  async transcribe(input: TranscribeInput): Promise<TranscribeResult> {
    if (input.existingTranscript?.trim()) {
      return {
        content: input.existingTranscript.trim(),
        confidence: 1,
        source: "manual-transcript",
      };
    }

    if (input.note?.trim()) {
      return {
        content: input.note.trim(),
        confidence: 0.75,
        source: "note-fallback",
      };
    }

    return {
      content: "音声の自動文字起こしに失敗しました。メモ入力または文字起こし編集を使って再解析してください。",
      confidence: 0.5,
      source: "local-fallback",
    };
  }
}

class WhisperCppTranscriber implements Transcriber {
  constructor(
    private readonly whisperCommand: string,
    private readonly modelPath: string,
    private readonly ffmpegCommand: string,
    private readonly fallback: Transcriber,
  ) {}

  async transcribe(input: TranscribeInput): Promise<TranscribeResult> {
    if (input.existingTranscript?.trim()) {
      return {
        content: input.existingTranscript.trim(),
        confidence: 1,
        source: "manual-transcript",
      };
    }

    if (!input.audioFilePath) {
      return this.fallback.transcribe(input);
    }

    const absoluteInputPath = resolveAudioPath(input.audioFilePath);
    const tempDir = await mkdtemp(path.join(tmpdir(), "lumo-whisper-"));
    const wavPath = path.join(tempDir, `${input.entryId}.wav`);
    const outPrefix = path.join(tempDir, `${input.entryId}-out`);
    const jsonOutPath = `${outPrefix}.json`;

    try {
      await execFileAsync(this.ffmpegCommand, [
        "-y",
        "-loglevel",
        "error",
        "-i",
        absoluteInputPath,
        "-ac",
        "1",
        "-ar",
        "16000",
        wavPath,
      ], { maxBuffer: 10 * 1024 * 1024 });

      await execFileAsync(this.whisperCommand, [
        "-m",
        this.modelPath,
        "-f",
        wavPath,
        "-l",
        "ja",
        "-oj",
        "-of",
        outPrefix,
        "-np",
      ], { maxBuffer: 10 * 1024 * 1024 });

      const raw = await readFile(jsonOutPath, "utf8");
      const content = parseWhisperText(raw);

      if (!content) {
        throw new Error("Whisper output was empty");
      }

      return {
        content,
        confidence: 0.88,
        source: "whispercpp",
      };
    } catch {
      return this.fallback.transcribe(input);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

function createTranscriber(): Transcriber {
  const fallback = new LocalFallbackTranscriber();
  const whisperCommand = process.env.WHISPER_CPP_COMMAND;
  const modelPath = process.env.WHISPER_CPP_MODEL_PATH;
  const ffmpegCommand = process.env.FFMPEG_COMMAND || "ffmpeg";

  if (whisperCommand && modelPath) {
    return new WhisperCppTranscriber(whisperCommand, modelPath, ffmpegCommand, fallback);
  }

  return fallback;
}

export const transcriber: Transcriber = createTranscriber();
