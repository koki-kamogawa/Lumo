"use client";

import { Lightbulb, Mic, Square, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useToast } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchJson } from "@/lib/client";

const BAR_COUNT = 20;
const IDLE_BARS = new Array(BAR_COUNT).fill(10);

function formatClock(seconds: number) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(seconds % 60).padStart(2, "0");
  return `${mins}:${rest}`;
}

export function RecordClient() {
  const router = useRouter();
  const { push } = useToast();

  const [memo, setMemo] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [bars, setBars] = useState<number[]>(IDLE_BARS);
  const [pending, startTransition] = useTransition();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousBarsRef = useRef<number[]>(IDLE_BARS);

  const stopWaveform = () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    sourceNodeRef.current?.disconnect();
    analyserRef.current?.disconnect();
    sourceNodeRef.current = null;
    analyserRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;

    previousBarsRef.current = IDLE_BARS;
    setBars(IDLE_BARS);
  };

  const startWaveform = async (stream: MediaStream) => {
    const audioContext = new window.AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    const sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceNodeRef.current = sourceNode;

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const render = () => {
      if (!analyserRef.current) {
        return;
      }

      analyserRef.current.getByteFrequencyData(frequencyData);

      const nextBars = new Array(BAR_COUNT).fill(0).map((_, index) => {
        const start = Math.floor((index / BAR_COUNT) * frequencyData.length);
        const end = Math.floor(((index + 1) / BAR_COUNT) * frequencyData.length);
        const range = frequencyData.slice(start, Math.max(end, start + 1));
        const avg = range.reduce((sum, value) => sum + value, 0) / range.length;
        const scaled = 8 + (avg / 255) * 44;
        const smoothed = previousBarsRef.current[index] * 0.62 + scaled * 0.38;
        return Math.max(6, Math.min(52, smoothed));
      });

      previousBarsRef.current = nextBars;
      setBars(nextBars);
      animationFrameRef.current = window.requestAnimationFrame(render);
    };

    animationFrameRef.current = window.requestAnimationFrame(render);
  };

  useEffect(() => {
    if (!recording) {
      return;
    }

    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current >= 300) {
          mediaRecorderRef.current?.stop();
          setRecording(false);
          return 300;
        }
        return current + 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    return () => {
      stopWaveform();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      await startWaveform(stream);

      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        stopWaveform();
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setAudioBlob(null);
      setSeconds(0);
      setRecording(true);
    } catch {
      push({
        title: "録音を開始できませんでした",
        description: "マイクの使用を許可してください。",
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const discard = () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
    } else {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      stopWaveform();
    }

    setRecording(false);
    setSeconds(0);
    setAudioBlob(null);
    chunksRef.current = [];
  };

  const submit = () => {
    startTransition(async () => {
      try {
        const entry = await fetchJson<{ id: string }>("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: memo ? memo.slice(0, 20) : "今日の記録",
            note: memo || null,
          }),
        });

        if (audioBlob) {
          const file = new File([audioBlob], "recording.webm", { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", file);
          formData.append("durationSec", String(seconds));
          await fetch(`/api/entries/${entry.id}/audio`, {
            method: "POST",
            body: formData,
          });
        }

        await fetchJson(`/api/entries/${entry.id}/transcribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ overrideText: memo || undefined }),
        });

        await fetchJson(`/api/entries/${entry.id}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        push({ title: "今日の鏡を作成しました" });
        router.push(`/entries/${entry.id}`);
        router.refresh();
      } catch (error) {
        push({
          title: "送信に失敗しました",
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  };

  return (
    <div className="space-y-7 pt-10">
      <Card soft className="w-full rounded-[18px] px-4 py-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <Lightbulb className="size-4" />
            <p className="text-[13px] font-semibold">先に結論はなくて大丈夫</p>
          </div>
          <p className="whitespace-pre-line text-[13px] leading-6 text-[var(--accent-dark)]">
            {"思いついた順で話してください。\n言い切れないことも、そのままで大丈夫です。"}
          </p>
        </div>
      </Card>

      <div className="space-y-2 text-center">
        <p className="text-6xl font-bold tracking-[-0.08em] text-[var(--text-primary)]">{formatClock(seconds)}</p>
        <p className="text-sm text-[var(--text-tertiary)]">最大 5分まで</p>
      </div>

      <div className="flex h-[60px] items-center justify-center gap-[3px]" aria-hidden="true">
        {bars.map((height, index) => (
          <span
            key={index}
            className={`w-[3px] rounded-full ${index < 14 ? "bg-[var(--accent)]" : "bg-[var(--bg-muted)]"}`}
            style={{ height: `${Math.max(6, Math.min(height, 52))}px` }}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={discard}
          aria-label="録音を破棄する"
          className="pressable-soft pressable-soft-neutral flex size-12 items-center justify-center rounded-full bg-[var(--bg-page)] text-[var(--accent-red)] shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]"
        >
          <Trash2 className="size-5" />
        </button>
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          aria-label={recording ? "録音を停止する" : "録音を開始する"}
          className="pressable-soft pressable-soft-warm flex size-[72px] items-center justify-center rounded-full bg-[var(--accent-coral)] text-[var(--text-on-accent)] shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]"
        >
          {recording ? <Square className="size-6 fill-current" /> : <Mic className="size-6" />}
        </button>
      </div>

      <input
        id="record-memo-input"
        value={memo}
        onChange={(event) => setMemo(event.target.value)}
        placeholder="話したいことを一言だけ"
        aria-label="補足メモ"
        className="h-12 w-full rounded-[14px] bg-[var(--bg-page)] px-4 text-sm text-[var(--text-primary)] outline-none shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]"
      />

      <Button className="w-full" onClick={submit} disabled={pending || recording}>
        話し終わった
      </Button>
    </div>
  );
}
