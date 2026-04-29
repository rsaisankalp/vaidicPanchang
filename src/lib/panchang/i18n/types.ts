// Shape every language pack must satisfy. Each script (Devanagari, Telugu,
// Tamil, Malayalam, Kannada, Latin/English) implements this for the same
// concepts.

export type LangCode = "en" | "hi" | "te" | "ta" | "ml" | "kn";

export interface PanchangLangPack {
  // 30 tithis with paksha prefix already included (Shukla 1..15, Krishna 1..15 = Amavasya)
  tithi: string[];
  tithiDeity: string[];
  tithiSummary: string[];

  // 27 nakshatras
  nakshatra: string[];
  nakshatraRuler: string[];
  nakshatraDeity: string[];
  nakshatraSummary: string[];
  nakshatraSpecial: string[];

  // 27 yogas
  yoga: string[];
  yogaSpecial: string[];
  yogaMeaning: string[];

  // 11 unique karana names indexed [Kimstughna, Bava, Balava, Kaulava, Taitila, Gara, Vanija, Vishti, Shakuni, Chatushpada, Naga]
  karana: string[];
  karanaDeity: string[];
  karanaSpecial: string[];

  // 7 weekdays Sun..Sat
  vara: string[];

  // 12 rashis Mesha..Meena
  rashi: string[];

  // 12 lunar months Chaitra..Phalguna
  hinduMaah: string[];

  // 6 ritus Vasanta..Shishira
  ritu: string[];

  // 2 ayanas [Uttarayana, Dakshinayana]
  ayana: string[];

  // 2 pakshas [Shukla, Krishna]
  paksha: string[];

  // 7 disha-shool by weekday Sun..Sat
  dishaShool: string[];

  // 4 moon-nivas directions (East, South, West, North)
  moonNivas: string[];

  // 60-year Samvatsara cycle Prabhava..Kshaya
  samvatsara: string[];

  // localized labels for UI
  labels: {
    sunrise: string;
    sunset: string;
    moonrise: string;
    moonset: string;
    tithi: string;
    nakshatra: string;
    yoga: string;
    karana: string;
    paksha: string;
    ritu: string;
    sunSign: string;
    moonSign: string;
    ayana: string;
    abhijit: string;
    rahukaal: string;
    yamghant: string;
    gulikaal: string;
    vikramSamvat: string;
    shakaSamvat: string;
    festivals: string;
    pujas: string;
    panchangFor: string;
    selectLanguage: string;
  };
}

export const LANG_DISPLAY_NAMES: Record<LangCode, string> = {
  en: "English",
  hi: "हिन्दी",
  te: "తెలుగు",
  ta: "தமிழ்",
  ml: "മലയാളം",
  kn: "ಕನ್ನಡ",
};
