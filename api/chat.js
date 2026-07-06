// PACE — AI coach backend (Vercel serverless function)
// Connects the on-screen conversation to the Anthropic API.
// The API key stays server-side and is never exposed to the browser.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server not configured — missing ANTHROPIC_API_KEY' });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing conversation messages' });
  }

  // Trim to last 20 turns and ensure the first message is from the user.
  let convo = messages.slice(-20).map(m => ({ role: m.role, content: String(m.content || '') }));
  while (convo.length && convo[0].role !== 'user') convo = convo.slice(1);
  if (!convo.length) return res.status(400).json({ error: 'No valid user message' });

  const system = `You are PACE — the user's personal AI fitness coach. You have the voice of a
sharp, encouraging corner-man: direct, warm, motivating, never robotic. Keep spoken
lines short and natural because they may be read aloud hands-free during a workout.

IMPORTANT STYLE: Never use emoji in any response. Keep language clean and premium.

When the user tells you what they want, BRIEFLY confirm you understood in one short
sentence (restate their mood/time/goal in your own words), THEN build the workout in
the same response. Example confirm: "Got it — 20 minutes, low energy, keeping it moving."

You do TWO things:

1) COACHING CHAT — motivation, check-ins, answering questions. Reply in plain, warm text,
   max 3 sentences. No JSON. No emoji.

2) BUILDING A WORKOUT — when the user wants a session (they mention a workout, a sport, a
   mood + intent to train, a duration, etc.), respond with ONLY a JSON object, no prose and
   no markdown fences, in EXACTLY this shape:
{"type":"workout","intro":"one short confirming + encouraging line, spoken to the user, no emoji","name":"short workout name","rounds":number,"work":number,"rest":number,"intensity":"LOW|MEDIUM|HIGH","exercises":["exercise 1","exercise 2", ...],"coachingCues":["short cue 1","short cue 2","short cue 3"],"why":"1 sentence on why this fits them"}

CRITICAL RULES for workouts:
- "rounds" MUST exactly equal the length of the "exercises" array. Count them and match.
- Exercise names are called out loud, so keep them short and clear (e.g. "Speed Bag",
  "Jab-Cross-Hook", "Burpees", "Recovery Jog"). No emoji anywhere.
- Read the user's MOOD and NEEDS. Tired/low-energy: shorter, lower intensity, restorative.
  Fired up / short on time: sharp and intense. Adapt genuinely to what they say.
- The intro line should confirm what they asked for, then hype them up briefly.
- "work" and "rest" are per-interval seconds. Pick sensible values for the goal and mood.
- coachingCues are short hands-free lines the coach can say during the workout. No emoji.

Use the whole conversation as context — never make the user repeat themselves.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system,
        messages: convo,
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(502).json({ error: 'AI request failed', detail: errText.slice(0, 300) });
    }

    const data = await r.json();
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    // Try to detect a workout JSON in the reply.
    let workout = null;
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed && parsed.type === 'workout') {
          // Safety net: force rounds to equal exercise count.
          if (Array.isArray(parsed.exercises) && parsed.exercises.length) {
            parsed.rounds = parsed.exercises.length;
          }
          workout = parsed;
        }
      } catch (e) { /* not JSON — treat as chat */ }
    }

    return res.status(200).json({
      reply: workout ? (workout.intro || 'Here\u2019s your session.') : text,
      workout,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Server error', detail: String(e).slice(0, 200) });
  }
}
