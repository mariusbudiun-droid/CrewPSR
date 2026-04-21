// Vercel Serverless Function — api/import-roster.js
// Receives base64 image, calls Claude Vision, returns structured roster JSON
 
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });
 
  const { imageBase64, mediaType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });
 
  const prompt = `You are extracting roster data from a Ryanair Connect screenshot.
 
Analyze this roster screenshot and extract ALL visible duty days.
 
IMPORTANT: Times in Ryanair Connect are in UTC (Zulu time). Return them EXACTLY as shown — do NOT convert. The app will handle timezone conversion.
 
For each day return:
- date: "YYYY-MM-DD"
- type: one of "flight", "hsby", "ad", "off", "al", "vto", "sick", "ul"
- assignment: one of "A1E", "A1L", "A2E", "A2L", "HSBY", "AD", "OFF", "AL", "VTO", "SICK", "UL"
  (A1E = Aereo 1 Early, A1L = Aereo 1 Late, A2E = Aereo 2 Early, A2L = Aereo 2 Late)
  If you cannot determine A1/A2 or Early/Late, use "CUSTOM"
- flights: array of flight objects (only if type is "flight"):
  { from: "PSR", to: "STN", dep: "06:25", arr: "08:05", flightNum: "FR1234" }
- hsbyStart: "HH:MM" in UTC (only if HSBY or AD, if visible)
- hsbyEnd: "HH:MM" in UTC (only if HSBY or AD, if visible)
 
Rules:
- Departure airport is almost always PSR (Pescara)
- Return ALL times exactly as shown in UTC — do not adjust for timezone
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
 
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageBase64,
              },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });
 
    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', response.status, err);
      return res.status(500).json({ error: `Claude API error ${response.status}`, detail: err });
    }
 
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
 
    // Strip markdown fences if present
    const clean = text.replace(/```json|```/g, '').trim();
    const days = JSON.parse(clean);
 
    return res.status(200).json({ success: true, days });
 
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
 
