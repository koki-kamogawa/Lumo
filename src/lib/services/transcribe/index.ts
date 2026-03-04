export interface TranscribeInput {
  entryId: string;
  note?: string | null;
  existingTranscript?: string | null;
}

export interface TranscribeResult {
  content: string;
  confidence: number;
  source: string;
}

export interface Transcriber {
  transcribe(input: TranscribeInput): Promise<TranscribeResult>;
}

class DummyTranscriber implements Transcriber {
  async transcribe(input: TranscribeInput): Promise<TranscribeResult> {
    const content =
      input.existingTranscript ||
      input.note ||
      "今日は少し疲れていたけれど、話しながら整理したい気持ちがありました。";

    return {
      content,
      confidence: 0.72,
      source: "dummy-transcriber",
    };
  }
}

export const transcriber: Transcriber = new DummyTranscriber();
