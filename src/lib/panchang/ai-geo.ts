// AI-assisted geo resolution. When Nominatim returns nothing for a city/state
// (typo, alternate spelling, transliteration), fall back to Gemini Flash to
// produce a clean "City, State, India" string we can re-query.
//
// Requires GOOGLE_API_KEYS env (comma-separated). Mirrors the rotation pattern
// used by marketing.vaidicpujas.in.

const MODEL = "gemini-2.0-flash";

function pickKey(): string | null {
  const list = (process.env.GOOGLE_API_KEYS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export async function aiNormalizeLocation(input: { city?: string; state?: string; venue?: string }): Promise<string | null> {
  const key = pickKey();
  if (!key) return null;
  const prompt = `Given this Indian event venue:
city: ${input.city || ""}
state: ${input.state || ""}
venue: ${input.venue || ""}

Output ONLY a single line in the form "City, State, India" with the most accurate, geocodable Indian place name. If you cannot determine, output "UNKNOWN".`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const out = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    if (!out || out === "UNKNOWN") return null;
    return out.split("\n")[0].trim();
  } catch {
    return null;
  }
}

// AI pincode lookup — used when wa_events row has no pincode but we need one.
// Mirrors marketing.vaidicpujas.in's "lookup_pincode" flow but in reverse:
// given an address, derive the 6-digit Indian PIN code.
export async function aiLookupPincode(address: string): Promise<string | null> {
  const key = pickKey();
  if (!key) return null;
  const prompt = `Indian postal address: "${address}"
Output ONLY the 6-digit Indian PIN code (just digits, no other text) for this address. If unknown, output "UNKNOWN".`;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const out = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    const m = out.match(/\b(\d{6})\b/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
