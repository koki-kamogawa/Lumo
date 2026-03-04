"use client";

import { Download, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/app-providers";

export function ShareCardClient({ text }: { text: string }) {
  const { push } = useToast();

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    push({ title: "共有カードの文面をコピーしました" });
  };

  const download = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "lumo-share-card.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="secondary" onClick={copy}>
        <Link2 className="mr-2 size-4" />
        コピー
      </Button>
      <Button variant="secondary" onClick={download}>
        <Download className="mr-2 size-4" />
        ダウンロード
      </Button>
    </div>
  );
}

