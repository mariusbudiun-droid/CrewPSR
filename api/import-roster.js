// Vercel Serverless Function — api/import-roster.js
// Receives base64 image, calls Gemini 2.5 Pro Vision, returns structured roster JSON.
//
// Migrated from Anthropic Claude → Google Gemini on v1.10.0.
// Why: Gemini has a free tier (100 RPD on 2.5 Pro) sufficient for this app's
// usage pattern (~60 users × 1 import/week = ~9/day average, with picks up
// to ~30-50 around new roster releases). If we hit RPD, users retry next day.
//
// Required env var: GEMINI_API_KEY (set on Vercel — Settings → Environment Variables).
// Get one at https://aistudio.google.com/ (no credit card required).

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });

  const { imageBase64, mediaType, role } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  const isPilot = role === 'pilot';
  const roleContext = isPilot
    ? `This is a PILOT roster from Ryanair Connect. Pilots at PSR follow an 18-day cycle: 5 Early + 4 Off + 5 Late + 4 Off. Flight numbers and routes are typically visible alongside duties.`
    : `This is a CABIN CREW roster from Ryanair Connect. Cabin crew at PSR follow a 16-day cycle: 5 Early + 3 Off + 5 Late + 3 Off.`;

  const prompt = `You are extracting roster data from a Ryanair Connect screenshot.

${roleContext}

Analyze this roster screenshot and extract ALL visible duty days.

IMPORTANT: Times in Ryanair Connect are in UTC (Zulu time). Return them EXACTLY as shown — do NOT convert. The app will handle timezone conversion.

For each day return:
- date: "YYYY-MM-DD"
- type: one of "flight", "hsby", "ad", "off", "al", "vto", "sick", "ul", "pl"
- assignment: one of "A1E", "A1L", "A2E", "A2L", "HSBY", "AD", "OFF", "AL", "VTO", "SICK", "UL", "PL", "CUSTOM"
  (A1E = Aereo 1 Early, A1L = Aereo 1 Late, A2E = Aereo 2 Early, A2L = Aereo 2 Late)
  If you cannot determine A1/A2 or Early/Late, use "CUSTOM"
- flights: array of flight objects (only if type is "flight"):
  { from: "PSR", to: "STN", dep: "06:25", arr: "08:05", flightNum: "FR1234" }
- hsbyStart: "HH:MM" in UTC (only if HSBY or AD, if visible)
- hsbyEnd: "HH:MM" in UTC (only if HSBY or AD, if visible)

Rules:
- Departure airport is almost always PSR (Pescara)
- Return ALL times exactly as shown in UTC — do not adjust for timezone
- Time format MUST be "HH:MM" exactly — no "Z", no "UTC", no seconds, no AM/PM. Examples: "06:25", "14:50", "23:10". WRONG: "06:25 Z", "06:25 UTC", "6:25am".
- If a day shows flight numbers and routes, it's a flight day
- HSBY = Home Standby, AD = Airport Duty
- OFF = day off (including rest days)
- Only include days clearly visible in the screenshot

Respond ONLY with a valid JSON array, no markdown, no explanation:
[
  {
    "date": "2026-04-21",
    "type": "flight",
    "assignment": "A1E",
    "flights": [
      {"from": "PSR", "to": "STN", "dep": "04:25", "arr": "06:05", "flightNum": "FR1234"},
      {"from": "STN", "to": "PSR", "dep": "06:45", "arr": "08:30", "flightNum": "FR1235"}
    ]
  }
]`;

  // Gemini endpoint — using 2.5 Flash. We initially tried 2.5 Pro but new
  // Google Cloud projects often get 0 RPD on Pro until usage history builds up.
  // Flash has a more generous free tier (250 RPD standard, sometimes restricted
  // to 25 RPD on new accounts — should auto-increase after a few weeks of usage).
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mediaType || 'image/jpeg',
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        }],
        generationConfig: {
          temperature: 0.1,        // deterministic extraction
          maxOutputTokens: 32768,  // raised from 8192 — long roster screenshots (full month, multi-day) can exceed 8k tokens
          responseMimeType: 'application/json',  // ask Gemini to enforce JSON output
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', response.status, errText);

      // Friendly message for the most common failure modes
      if (response.status === 429) {
        return res.status(429).json({
          error: 'Limite giornaliero raggiunto. Riprova domani.',
          detail: errText,
        });
      }
      if (response.status === 403 || response.status === 401) {
        return res.status(500).json({
          error: 'API key non valida o quota esaurita. Contatta il supporto.',
          detail: errText,
        });
      }
      return res.status(500).json({
        error: `Gemini API error ${response.status}`,
        detail: errText,
      });
    }

    const data = await response.json();

    // Gemini response structure:
    // data.candidates[0].content.parts[0].text — contains the model's output
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      console.error('Gemini returned empty text. Full response:', JSON.stringify(data).slice(0, 500));
      return res.status(500).json({ error: 'Gemini returned empty response', detail: data });
    }

    // Strip markdown fences just in case (responseMimeType=application/json should prevent them,
    // but defensive parsing never hurts).
    const clean = text.replace(/```json|```/g, '').trim();

    // Log the finish reason — "MAX_TOKENS" means we hit the output token limit
    // and the JSON is truncated.
    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
      console.warn('Gemini finished with reason:', finishReason);
    }

    let days;
    try {
      days = JSON.parse(clean);
    } catch (parseErr) {
      console.error('JSON parse failed. Finish reason:', finishReason, 'Raw text length:', clean.length);
      console.error('Raw text head:', clean.slice(0, 300));
      console.error('Raw text tail:', clean.slice(-300));

      const truncated = finishReason === 'MAX_TOKENS';
      return res.status(500).json({
        error: truncated
          ? 'Risposta troppo lunga. Prova un screenshot di meno giorni alla volta.'
          : 'AI returned invalid JSON. Try again with a clearer screenshot.',
        finishReason,
        detail: clean.slice(0, 200),
      });
    }

    if (!Array.isArray(days)) {
      return res.status(500).json({
        error: 'AI did not return an array. Try again with a clearer screenshot.',
      });
    }

    // Defensive sanitisation: strip any stray time suffixes that some models add
    // despite the explicit prompt instructions (e.g. "15:40 Z", "06:25 UTC").
    // Returns "HH:MM" or null/undefined if the input wasn't a parsable time.
    function sanitiseTime(t) {
      if (!t || typeof t !== 'string') return t;
      // Match "HH:MM" anywhere in the string and return just that portion
      const m = t.match(/(\d{1,2}):(\d{2})/);
      if (!m) return t;
      return `${m[1].padStart(2, '0')}:${m[2]}`;
    }

    for (const day of days) {
      if (day.hsbyStart) day.hsbyStart = sanitiseTime(day.hsbyStart);
      if (day.hsbyEnd)   day.hsbyEnd   = sanitiseTime(day.hsbyEnd);
      if (Array.isArray(day.flights)) {
        for (const f of day.flights) {
          if (f.dep) f.dep = sanitiseTime(f.dep);
          if (f.arr) f.arr = sanitiseTime(f.arr);
        }
      }
    }

    return res.status(200).json({ success: true, days });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}
