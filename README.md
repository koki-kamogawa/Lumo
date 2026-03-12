# Lumo (Voice Diary AI)

Lumo is a Next.js + Prisma MVP for voice journaling and AI reflection.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev
```

## Anthropic (Analysis)

```env
ANTHROPIC_API_KEY="your-key"
# Use a valid model id available in your Anthropic account
ANTHROPIC_MODEL="your-claude-model-id"
ANTHROPIC_BASE_URL="https://api.anthropic.com"
ALLOW_DUMMY_ANALYZE_FALLBACK="false"
```

Analysis provider priority:
- `Claude only` (strict mode by default)
- If `ALLOW_DUMMY_ANALYZE_FALLBACK=true`, only then falls back to dummy analyzer.

## Automatic Speech Transcription (Local)

This project now supports automatic transcription using local `whisper.cpp` + `ffmpeg`.

Configure `.env`:

```env
WHISPER_CPP_COMMAND="C:\\tools\\whisper.cpp\\build\\bin\\Release\\whisper-cli.exe"
WHISPER_CPP_MODEL_PATH="C:\\tools\\whisper.cpp\\models\\ggml-large-v3.bin"
FFMPEG_COMMAND="ffmpeg"
```

Transcription behavior:
- `whisper.cpp` configured: audio file is transcribed automatically.
- Not configured or failed: fallback to manual transcript / note text / local placeholder.

## Commands

```bash
npm run dev
npm run lint
npm run build
```
