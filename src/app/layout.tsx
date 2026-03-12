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
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = window.localStorage.getItem("lumo-theme");
                  var theme = stored === "dark" || stored === "light" ? stored : "light";
                  var storedLayout = window.localStorage.getItem("lumo-layout-mode");
                  var layoutMode = storedLayout === "desktop" || storedLayout === "mobile" ? storedLayout : "mobile";
                  document.documentElement.setAttribute("data-theme", theme);
                  document.documentElement.setAttribute("data-layout", layoutMode);
                  document.documentElement.style.colorScheme = theme;
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${zenMaruGothic.variable} antialiased`}>
        <AppProviders>
          {children}
          <BottomTab />
        </AppProviders>
      </body>
    </html>
  );
}
