// Localized blurbs for the 16 lunar tithi types (Pratipada..Chaturdashi + Purnima/Amavasya).
// Mirrors the educational content shown by vaidicpujas.org/vaidicpujascalendar.
// Keys are English transliterations; pick by `pack.tithi[idx]` parsed.

export interface TithiBlurb { icon: string; html: string }

// Map English tithi name (no paksha prefix) to entry per language.
type Map = Record<string, Record<string, TithiBlurb>>;

const EN: Record<string, TithiBlurb> = {
  "Pratipada":   { icon: "🌱", html: "<strong>Pratipada</strong> marks the auspicious first day of the lunar fortnight — a time of new beginnings and fresh Sankalpas. Starting a ritual or participating in a Puja today sets a pure and positive tone for the entire Paksha." },
  "Dwitiya":     { icon: "🌒", html: "<strong>Dwitiya</strong> is associated with Lord Brahma and is auspicious for Yagna and devotional offerings. Participating in a Homa today amplifies creative energy and helps fulfil heartfelt wishes." },
  "Tritiya":     { icon: "🌒", html: "<strong>Tritiya</strong> is associated with Goddess Gauri, ideal for Pujas seeking health, happiness and marital harmony." },
  "Chaturthi":   { icon: "🐘", html: "<strong>Chaturthi</strong> is the sacred day of Lord Ganesha — the remover of obstacles. A Ganapati Puja or Homa today clears hurdles and brings wisdom." },
  "Panchami":    { icon: "🐍", html: "<strong>Panchami</strong> is linked to the Pancha Bhutas and Naga deities. Pujas today strengthen life force and remove fears." },
  "Shashthi":    { icon: "⚔",  html: "<strong>Shashthi</strong> is dedicated to Lord Kartikeya, deity of victory and courage. Especially beneficial for children's health." },
  "Saptami":     { icon: "☀",  html: "<strong>Saptami</strong> is the Tithi of the Sun. Surya Puja and Homas today bestow vitality, clear ancestral karma and bring recognition." },
  "Ashtami":     { icon: "⚡",  html: "<strong>Ashtami</strong> is ruled by Lord Shiva and Goddess Durga. Pujas today are potent for spiritual transformation and protection." },
  "Navami":      { icon: "🏹", html: "<strong>Navami</strong> is a deeply sacred Tithi of the Divine Mother. Devi Puja today invokes Her blessings for strength and abundance." },
  "Dashami":     { icon: "🏆", html: "<strong>Dashami</strong> is associated with the victory of Dharma. Auspicious for Vishnu Puja and ancestor rituals." },
  "Ekadashi":    { icon: "⭐", html: "<strong>Ekadashi</strong> is one of the holiest Tithis, dedicated to Lord Vishnu. Fasting and Vishnu Puja today cleanse sins and bring liberation." },
  "Dwadashi":    { icon: "🌸", html: "<strong>Dwadashi</strong> follows Ekadashi and is auspicious for Vishnu Puja and family welfare." },
  "Trayodashi":  { icon: "🔱", html: "<strong>Trayodashi</strong> is the Tithi of Pradosha Vrata. Rudra Abhishekam today invokes Shiva-Parvati's grace." },
  "Chaturdashi": { icon: "🌑", html: "<strong>Chaturdashi</strong> is associated with Shiva, Kali and Hanuman. Pujas today destroy negative energies." },
  "Purnima":     { icon: "🌕", html: "<strong>Purnima</strong> — the Full Moon — most auspicious of Shukla Paksha. Any Puja or Homa today multiplies in potency." },
  "Amavasya":    { icon: "🌑", html: "<strong>Amavasya</strong> — New Moon — sacred for Pitru Tarpan. Liberates ancestors and brings family peace." },
};

const HI: Record<string, TithiBlurb> = {
  "Pratipada":   { icon: "🌱", html: "<strong>प्रतिपदा</strong> — चन्द्रपक्ष का प्रथम दिवस, नवीन संकल्प एवं शुभ आरम्भ हेतु अनुकूल।" },
  "Dwitiya":     { icon: "🌒", html: "<strong>द्वितीया</strong> — ब्रह्मा से सम्बन्धित, यज्ञ एवं भक्ति के लिए शुभ।" },
  "Tritiya":     { icon: "🌒", html: "<strong>तृतीया</strong> — गौरी का पर्व, स्वास्थ्य एवं वैवाहिक सौख्य हेतु उत्तम।" },
  "Chaturthi":   { icon: "🐘", html: "<strong>चतुर्थी</strong> — गणेश तिथि, विघ्न-नाश एवं नवारम्भ हेतु पावन।" },
  "Panchami":    { icon: "🐍", html: "<strong>पंचमी</strong> — पंच भूतों एवं नाग देवताओं से सम्बन्धित।" },
  "Shashthi":    { icon: "⚔",  html: "<strong>षष्ठी</strong> — कार्तिकेय तिथि, साहस एवं संतान-स्वास्थ्य हेतु शुभ।" },
  "Saptami":     { icon: "☀",  html: "<strong>सप्तमी</strong> — सूर्य तिथि, ऊर्जा एवं समृद्धि देती है।" },
  "Ashtami":     { icon: "⚡",  html: "<strong>अष्टमी</strong> — शिव-दुर्गा का दिन, परिवर्तन एवं रक्षा हेतु पुण्य।" },
  "Navami":      { icon: "🏹", html: "<strong>नवमी</strong> — देवी का दिन, शक्ति एवं विजय हेतु पावन।" },
  "Dashami":     { icon: "🏆", html: "<strong>दशमी</strong> — विष्णु एवं पितृ कार्य हेतु अनुकूल।" },
  "Ekadashi":    { icon: "⭐", html: "<strong>एकादशी</strong> — विष्णु को समर्पित, उपवास एवं मोक्षदायिनी।" },
  "Dwadashi":    { icon: "🌸", html: "<strong>द्वादशी</strong> — विष्णु पूजन एवं कुटुम्ब कल्याण हेतु शुभ।" },
  "Trayodashi":  { icon: "🔱", html: "<strong>त्रयोदशी</strong> — प्रदोष व्रत, रुद्राभिषेक हेतु पावन।" },
  "Chaturdashi": { icon: "🌑", html: "<strong>चतुर्दशी</strong> — शिव/काली/हनुमान, नकारात्मकता का नाश।" },
  "Purnima":     { icon: "🌕", html: "<strong>पूर्णिमा</strong> — पूर्ण चन्द्र, सर्वाधिक शुभ तिथि।" },
  "Amavasya":    { icon: "🌑", html: "<strong>अमावस्या</strong> — पितृ तर्पण, श्राद्ध हेतु पावन।" },
};

const _stub = (lang: string): Record<string, TithiBlurb> => {
  const out: Record<string, TithiBlurb> = {};
  for (const k of Object.keys(EN)) out[k] = { icon: EN[k].icon, html: EN[k].html };
  return out;
};

export const TITHI_BLURBS: Map = {
  en: EN, hi: HI,
  // Telugu/Tamil/Malayalam/Kannada fall back to English copy with same icons.
  // Replace with native translations as they become available.
  te: _stub("te"), ta: _stub("ta"), ml: _stub("ml"), kn: _stub("kn"),
};

// Tithi ordering used by external API: 1..15 = Shukla Pratipada..Purnima,
// 16..30 = Krishna Pratipada..Amavasya. Map to English key for blurb lookup.
export const TITHI_ENG_KEY = [
  "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima",
  "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Amavasya",
];
