const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

// If a Groq key is configured, generate a sharper executive summary of the
// decision trail. Falls back to the deterministic template on missing key or
// any API error, so the pipeline always works offline with zero setup.
export async function generateExecutiveSummary(trail, fallback) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return fallback;

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        // gpt-oss is a reasoning model: it spends tokens thinking before it
        // writes, so the budget has to cover both or the summary gets cut off.
        max_tokens: 1200,
        reasoning_effort: 'low',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'You are the executive summary layer of an autonomous supply chain agent. Given a decision trail as JSON, write 2-3 sentences of plain English for a procurement manager. Be concrete about numbers and state clearly whether the order was auto-approved or escalated, and why. All monetary amounts are Indian rupees — write them with the ₹ symbol, never $. No preamble, no markdown.',
          },
          { role: 'user', content: JSON.stringify(trail) },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Groq API ${res.status}: ${await res.text()}`);

    const body = await res.json();
    return body.choices?.[0]?.message?.content?.trim() || fallback;
  } catch (err) {
    console.error('Groq summary generation failed, using fallback:', err.message);
    return fallback;
  }
}
