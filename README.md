# PACE — AI Coach. Every rep. Every day.

A fully working AI-coached interval trainer. Talk to your coach, it builds a
session for your mood and needs, then coaches you through it hands-free with voice.

## Flow
Home → "Talk to your coach" → conversation → coach builds a real workout →
Start → data-driven timer with hands-free voice (announces exercises, counts down,
calls next move, gives cues) → confetti completion → progress with smart streak.

## Tech
- `index.html` — single-file front end (HTML/CSS/JS)
- `api/chat.js` — Vercel serverless function → Anthropic API (key server-side)
- `manifest.json` + `sw.js` — installable PWA
- Model: `claude-sonnet-4-6` (swap in api/chat.js)

## Deploy (GitHub → Vercel)
1. Push this folder to a GitHub repo (files at ROOT — index.html at top level).
2. Import the repo at vercel.com/new.
3. Add Environment Variable: `ANTHROPIC_API_KEY` = your key (sk-ant-...).
4. Deploy. Every push auto-deploys.

Never commit your API key. It lives only in Vercel Environment Variables.
