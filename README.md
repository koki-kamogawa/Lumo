# Lumo — Voice Diary AI

> Journal your thoughts by speaking. Let AI reflect back what matters.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Claude API](https://img.shields.io/badge/Claude_API-Anthropic-D97757?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

![Lumo screenshot](./docs/screenshot.png)

---

## Features

- **Voice-first journaling** — Record your thoughts by speaking; audio is transcribed automatically via local `whisper.cpp`
- **AI-powered reflection** — Claude analyzes each entry and surfaces emotions, energy peaks, follow-up questions, and actionable insights
- **Persistent memory** — Key facts about you are extracted from entries and stored as a personal memory graph, updated over time
- **Weekly reports** — Every week Lumo generates an emotion-flow summary, recurring theme tags, and a change/recovery narrative
- **Shareable cards** — Export masked quote cards from any entry or weekly report to share on social media
- **Customizable AI persona** — Choose your response style (Empathetic / Balanced / Conclusion-focused), goal mode, and advice intensity
- **Offline-first transcription** — `whisper.cpp` runs locally; no audio leaves your machine unless you choose cloud services
- **Privacy by default** — SQLite database, local audio storage, zero third-party analytics

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, React 19) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Database ORM | Prisma 6 (SQLite for local dev) |
| Auth | NextAuth v4 + Prisma Adapter |
| AI Analysis | Anthropic Claude API |
| Transcription | whisper.cpp (local) + ffmpeg |
| Animation | Framer Motion |
| UI Primitives | Radix UI, Lucide React |
| Validation | Zod |

---

## Getting Started

### Prerequisites

- Node.js 20+
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) (optional, for auto-transcription)
- [ffmpeg](https://ffmpeg.org/) (optional, required when whisper.cpp is used)
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/koki-kamogawa/Lumo.git
cd Lumo

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# → Edit .env with your actual values (see Environment Variables below)

# 4. Initialize the database
npm run prisma:generate
npm run prisma:push
npm run prisma:seed

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Copy `.env.example` and fill in the values. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite file path (e.g. `file:./prisma/dev.db`) |
| `NEXTAUTH_SECRET` | Random secret for NextAuth session signing |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `ANTHROPIC_MODEL` | Claude model ID (e.g. `claude-3-5-sonnet-20241022`) |
| `WHISPER_CPP_COMMAND` | Absolute path to `whisper-cli` binary (optional) |
| `WHISPER_CPP_MODEL_PATH` | Absolute path to GGML model file (optional) |
| `FFMPEG_COMMAND` | `ffmpeg` binary name or path (optional) |

> See `.env.example` for the full list. Never commit your actual `.env` file.

### Available Scripts

```bash
npm run dev           # Start development server
npm run build         # Production build
npm run start         # Start production server
npm run lint          # ESLint check
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:push      # Push schema to database
npm run prisma:seed      # Seed database with sample data
```

---

## Architecture

```
Lumo/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── api/                # REST API endpoints (entries, analysis, memory, etc.)
│   │   ├── entries/            # Entry list & detail views
│   │   ├── record/             # Voice recording UI
│   │   ├── memory/             # Personal memory graph viewer
│   │   ├── weekly/             # Weekly report views
│   │   ├── settings/           # User preferences
│   │   └── share/              # Public shareable cards
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # Base primitives (Radix + Tailwind)
│   │   ├── entries/            # Entry-specific components
│   │   ├── memory/             # Memory graph components
│   │   ├── record/             # Recording controls
│   │   └── weekly/             # Weekly report components
│   ├── lib/                    # Core logic
│   │   ├── ai/                 # Claude API integration & prompt engineering
│   │   ├── audio/              # whisper.cpp + ffmpeg transcription pipeline
│   │   ├── db/                 # Prisma client & query helpers
│   │   └── utils/              # Shared utilities
│   └── types/                  # Global TypeScript types
├── prisma/
│   ├── schema.prisma           # Database schema (User, Entry, Analysis, Memory…)
│   └── seed.ts                 # Sample data seeder
└── public/                     # Static assets
```

### Data Flow

```
User speaks
    │
    ▼
Audio recorded in browser (MediaRecorder API)
    │
    ▼
Uploaded to server → whisper.cpp transcribes locally
    │
    ▼
Transcript + note stored in SQLite via Prisma
    │
    ▼
Claude API analyzes: emotions, insights, memory proposals
    │
    ├──► AnalysisResult saved per entry
    └──► MemoryItem graph updated (auto or approval mode)
              │
              ▼
         Weekly aggregation → WeeklyReport generated
```

---

## Author

**koki-kamogawa**

- GitHub: [@koki-kamogawa](https://github.com/koki-kamogawa)
- Company: [Oovo](https://github.com/koki-kamogawa) — AI-driven business automation

---

## License

MIT

---

<details>
<summary>日本語の説明 (Japanese)</summary>

**Lumo** は「話す日記」アプリです。音声で日記を録音すると、ローカルの `whisper.cpp` が自動で文字起こしを行い、Anthropic の Claude API がその内容を分析します。

主な機能:
- **音声ジャーナリング** — 録音するだけで日記が完成
- **AI振り返り** — 感情・エネルギーのピーク・フォローアップ質問を自動生成
- **パーソナルメモリ** — エントリーから自分に関する記憶を蓄積・管理
- **週次レポート** — 1週間の感情の流れとテーマを可視化
- **シェアカード** — 引用文を匿名化してSNSにシェア可能

技術スタック: Next.js 16 / TypeScript / Prisma / Tailwind CSS / Claude API / whisper.cpp

</details>
