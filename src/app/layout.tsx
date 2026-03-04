import type { Metadata } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import { BottomTab } from "@/components/layout/bottom-tab";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Lumo",
  description: "音声日記AI Lumo の MVP",
  applicationName: "Lumo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${zenMaruGothic.variable} antialiased`}>
        <AppProviders>
          {children}
          <BottomTab />
        </AppProviders>
      </body>
    </html>
  );
}
