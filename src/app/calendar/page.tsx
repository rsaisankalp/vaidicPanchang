"use client";
// World-class Panchang + Pujas calendar.
// Visual language: warm saffron/marigold gradients, glass-morphic surfaces,
// soft elevation, generous whitespace, deliberate typography.
// Mirrors the functional surface of vaidicpujas.org/vaidicpujascalendar/:
//  - per-cell paksha colour, tithi name, nakshatra+pada, rashi
//  - special icons for Purnima, Amavasya, Ekadashi
//  - click cell -> modal with panchang pills, tithi blurb, filters, puja list
//  - state/ashram/category/search filters, "Today" jump, prev/next month
//  - language switcher (en/hi/te/ta/ml/kn)

import { useEffect, useMemo, useState, useCallback } from "react";
import { getPack, SUPPORTED_LANGS, LANG_DISPLAY_NAMES } from "@/lib/panchang/i18n";
import { TITHI_BLURBS, TITHI_ENG_KEY } from "@/lib/panchang/tithi-blurbs";

type LangCode = "en" | "hi" | "te" | "ta" | "ml" | "kn";

interface Puja {
  id: number;
  wp_event_id?: number;
  event_name: string;
  display_name?: string;
  event_city?: string;
  event_state?: string;
  event_district?: string;
  event_venue?: string;
  event_start_date?: string;
  event_start_time?: string;
  event_end_time?: string;
  sub_purpose?: string;
  purpose?: string;
  swamiji_details?: string;
  sevaamt?: number;
  distance_km?: number;
  event_type?: string;
}

interface MonthlyRow {
  date_name: string;
  sort: number;
  tithi: number;
  nak: number;
  pada: number;
  moon_sign: string;
  paksha_short: "Shukla" | "Krishna";
  tithi_full: string;
  tithi_name: string;
  nakshatra_name: string;
}

const MONTH_NAMES: Record<string, string[]> = {
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  hi: ["जनवरी","फरवरी","मार्च","अप्रैल","मई","जून","जुलाई","अगस्त","सितम्बर","अक्टूबर","नवम्बर","दिसम्बर"],
  te: ["జనవరి","ఫిబ్రవరి","మార్చి","ఏప్రిల్","మే","జూన్","జులై","ఆగస్ట్","సెప్టెంబర్","అక్టోబర్","నవంబర్","డిసెంబర్"],
  ta: ["ஜனவரி","பிப்ரவரி","மார்ச்","ஏப்ரல்","மே","ஜூன்","ஜூலை","ஆகஸ்ட்","செப்டம்பர்","அக்டோபர்","நவம்பர்","டிசம்பர்"],
  ml: ["ജനുവരി","ഫെബ്രുവരി","മാർച്ച്","ഏപ്രിൽ","മേയ്","ജൂൺ","ജൂലൈ","ഓഗസ്റ്റ്","സെപ്റ്റംബർ","ഒക്ടോബർ","നവംബർ","ഡിസംബർ"],
  kn: ["ಜನವರಿ","ಫೆಬ್ರವರಿ","ಮಾರ್ಚ್","ಏಪ್ರಿಲ್","ಮೇ","ಜೂನ್","ಜುಲೈ","ಆಗಸ್ಟ್","ಸೆಪ್ಟೆಂಬರ್","ಅಕ್ಟೋಬರ್","ನವೆಂಬರ್","ಡಿಸೆಂಬರ್"],
};
const WEEKDAY_FULL: Record<string, string[]> = {
  en: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  hi: ["रवि","सोम","मंगल","बुध","गुरु","शुक्र","शनि"],
  te: ["ఆది","సోమ","మంగళ","బుధ","గురు","శుక్ర","శని"],
  ta: ["ஞாயிறு","திங்கள்","செவ்","புதன்","வியாழன்","வெள்ளி","சனி"],
  ml: ["ഞായർ","തിങ്കൾ","ചൊവ്വ","ബുധൻ","വ്യാഴം","വെള്ളി","ശനി"],
  kn: ["ಭಾನು","ಸೋಮ","ಮಂಗಳ","ಬುಧ","ಗುರು","ಶುಕ್ರ","ಶನಿ"],
};
const TODAY_LABEL: Record<string, string> = { en: "Today", hi: "आज", te: "నేడు", ta: "இன்று", ml: "ഇന്ന്", kn: "ಇಂದು" };
const NO_PUJAS_LABEL: Record<string, string> = {
  en: "No pujas listed for this date.", hi: "इस तिथि हेतु कोई पूजा सूचीबद्ध नहीं।",
  te: "ఈ తేదీకి పూజలు లేవు.", ta: "இந்த தேதிக்கு பூஜைகள் இல்லை.",
  ml: "ഈ തീയതിക്ക് പൂജകൾ ഇല്ല.", kn: "ಈ ದಿನಾಂಕಕ್ಕೆ ಪೂಜೆಗಳು ಇಲ್ಲ.",
};
const SEARCH_LABEL: Record<string, string> = { en: "Search pujas — name, city, sanyasi…", hi: "पूजा खोजें — नाम, शहर, सन्यासी…", te: "పూజ వెతకండి — పేరు, నగరం, సన్యాసి…", ta: "பூஜை தேடு — பெயர், நகரம்…", ml: "പൂജ തിരയുക — പേര്, നഗരം…", kn: "ಪೂಜೆ ಹುಡುಕಿ — ಹೆಸರು, ನಗರ…" };

interface UserCtx { lat: number; lng: number; tz: number; city?: string; state?: string }

const VAARA_ICONS = ["☀️","🌙","🔴","💚","🟡","⚪","🪐"];

// BookMyShow-style city quick picks. Radius defaults to 250km — ashrams beyond
// that show under the "All India" toggle.
const QUICK_CITIES: { name: string; lat: number; lng: number; tz: number; state: string }[] = [
  { name: "Bengaluru",   lat: 12.9716, lng: 77.5946, tz: 5.5, state: "Karnataka" },
  { name: "Mumbai",      lat: 19.0760, lng: 72.8777, tz: 5.5, state: "Maharashtra" },
  { name: "Delhi",       lat: 28.6139, lng: 77.2090, tz: 5.5, state: "Delhi" },
  { name: "Chennai",     lat: 13.0827, lng: 80.2707, tz: 5.5, state: "Tamil Nadu" },
  { name: "Hyderabad",   lat: 17.3850, lng: 78.4867, tz: 5.5, state: "Telangana" },
  { name: "Kolkata",     lat: 22.5726, lng: 88.3639, tz: 5.5, state: "West Bengal" },
  { name: "Pune",        lat: 18.5204, lng: 73.8567, tz: 5.5, state: "Maharashtra" },
  { name: "Ahmedabad",   lat: 23.0225, lng: 72.5714, tz: 5.5, state: "Gujarat" },
  { name: "Jaipur",      lat: 26.9124, lng: 75.7873, tz: 5.5, state: "Rajasthan" },
  { name: "Lucknow",     lat: 26.8467, lng: 80.9462, tz: 5.5, state: "Uttar Pradesh" },
  { name: "Kochi",       lat: 9.9312,  lng: 76.2673, tz: 5.5, state: "Kerala" },
  { name: "Bhubaneswar", lat: 20.2961, lng: 85.8245, tz: 5.5, state: "Odisha" },
];
const DEFAULT_RADIUS_KM = 250;

export default function CalendarPage() {
  const [lang, setLangRaw] = useState<LangCode>("en");
  const setLang = (l: LangCode) => { setLangRaw(l); if (typeof window !== "undefined") localStorage.setItem("panchang_lang", l); };
  const pack = useMemo(() => getPack(lang), [lang]);
  const months = MONTH_NAMES[lang];
  const wkdays = WEEKDAY_FULL[lang];

  const [date, setDate] = useState(() => new Date());
  const [user, setUser] = useState<UserCtx>({ lat: 12.9716, lng: 77.5946, tz: 5.5, city: "Bengaluru", state: "Karnataka" });
  const [autoDetected, setAutoDetected] = useState(false);
  // Server still returns all-India pujas; the UI groups them by proximity so
  // the user always sees Bangalore-Ashram-style local events first. The
  // toggle only changes the calendar-cell badge counts.
  const [showAllIndia, setShowAllIndia] = useState(true);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const persistUser = (u: UserCtx, auto: boolean) => {
    setUser(u); setAutoDetected(auto);
    if (typeof window !== "undefined") {
      localStorage.setItem("panchang_user", JSON.stringify({ ...u, auto }));
    }
  };

  const [monthlyByDate, setMonthlyByDate] = useState<Record<string, MonthlyRow>>({});
  const [pujasByDate, setPujasByDate] = useState<Record<string, Puja[]>>({});

  const [selected, setSelected] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Single global puja search — no per-modal filters.
  const [filterSearch, setFilterSearch] = useState("");

  // ------ language hydration ------
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("panchang_lang")) || null;
    if (saved && SUPPORTED_LANGS.includes(saved as LangCode) && saved !== lang) setLangRaw(saved as LangCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore previously-saved user + (re)try geolocation on mount.
  // Sequence: localStorage → geolocation upgrade.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("panchang_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.lat && parsed?.lng) {
          setUser({ lat: parsed.lat, lng: parsed.lng, tz: parsed.tz || 5.5, city: parsed.city, state: parsed.state });
          setAutoDetected(!!parsed.auto);
        }
      }
    } catch { /* ignore */ }

    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetch("/api/panchang/Donor/get_Place_by_lat_log", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ latitude: String(latitude), longitude: String(longitude) }),
        }).then(r => r.json()).then((data) => {
          const r0 = data?.results?.[0];
          const tzStr = (r0?.timezone?.offset_STD || "+05:30") as string;
          const m = tzStr.match(/([+-])(\d{1,2}):(\d{2})/);
          const tz = m ? (m[1] === "-" ? -1 : 1) * (parseInt(m[2]) + parseInt(m[3]) / 60) : 5.5;
          persistUser({ lat: latitude, lng: longitude, tz, city: r0?.city || "Detected", state: r0?.state }, true);
        }).catch(() => persistUser({ lat: latitude, lng: longitude, tz: 5.5, city: "Detected" }, true));
      },
      () => { /* permission denied — keep default/saved */ },
      { timeout: 8000, enableHighAccuracy: false, maximumAge: 1000 * 60 * 60 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------ load monthly panchang for visible month ------
  useEffect(() => {
    const y = date.getFullYear(); const m = date.getMonth() + 1;
    const firstDay = `01-${m.toString().padStart(2, "0")}-${y}`;
    fetch("/api/panchang/ExternalApi/SavePanchangDetails", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        birth_date_: firstDay, birth_time_: "07:00:00",
        lat_: String(user.lat), lon_: String(user.lng), tzone_: String(user.tz),
        place_: user.city || "", country_: "India", state_: user.state || "",
        city_: String(user.lng), lang_: lang, panchang_type: "2",
      }),
    }).then(r => r.json()).then((data) => {
      const map: Record<string, MonthlyRow> = {};
      for (const row of data.table || []) {
        if (row.sort === 1) map[row.date_name] = row as MonthlyRow;
      }
      setMonthlyByDate(map);
    }).catch(() => setMonthlyByDate({}));
  }, [user.lat, user.lng, user.tz, date.getMonth(), date.getFullYear(), lang]);

  // ------ load pujas for visible month ------
  useEffect(() => {
    const y = date.getFullYear(); const m = date.getMonth();
    const from = isoDate(new Date(y, m, 1));
    const to = isoDate(new Date(y, m + 1, 0));
    const radiusParam = showAllIndia ? "" : `&radius=${DEFAULT_RADIUS_KM}`;
    fetch(`/api/pujas?lat=${user.lat}&lng=${user.lng}&from=${from}&to=${to}&max=500${radiusParam}`)
      .then(r => r.json())
      .then((data) => {
        const grouped: Record<string, Puja[]> = {};
        for (const p of data.pujas || []) {
          const d = (p.event_start_date || "").slice(0, 10);
          if (!d) continue;
          (grouped[d] ??= []).push(p);
        }
        setPujasByDate(grouped);
      }).catch(() => setPujasByDate({}));
  }, [user.lat, user.lng, date.getMonth(), date.getFullYear(), showAllIndia]);

  // ------ load detail for selected date ------
  useEffect(() => {
    if (!selected) { setSelectedDetail(null); return; }
    const [yy, mm, dd] = selected.split("-").map(n => parseInt(n, 10));
    setLoadingDetail(true);
    fetch("/api/panchang/ExternalApi/SavePanchangDetails", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        birth_date_: `${dd.toString().padStart(2,"0")}-${mm.toString().padStart(2,"0")}-${yy}`,
        birth_time_: "07:00:00",
        lat_: String(user.lat), lon_: String(user.lng), tzone_: String(user.tz),
        place_: user.city || "", country_: "India", state_: user.state || "",
        city_: String(user.lng), lang_: lang, panchang_type: "1",
      }),
    }).then(r => r.json()).then((data) => {
      const detail = data.table?.[0];
      try { detail.parsed_json_data = JSON.parse(detail.json_data); } catch {}
      setSelectedDetail(detail);
    }).finally(() => setLoadingDetail(false));
  }, [selected, user.lat, user.lng, user.tz, lang, user.city, user.state]);

  // The global search filters the entire month — also affects calendar cell counts.
  const matchesSearch = (p: Puja, q: string) => {
    if (!q) return true;
    const hay = `${p.display_name || ""} ${p.event_name || ""} ${p.sub_purpose || ""} ${p.event_city || ""} ${p.event_state || ""} ${p.event_venue || ""} ${p.purpose || ""}`.toLowerCase();
    return hay.includes(q);
  };
  const pujasByDateFiltered = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return pujasByDate;
    const out: Record<string, Puja[]> = {};
    for (const [k, v] of Object.entries(pujasByDate)) {
      const f = v.filter((p) => matchesSearch(p, q));
      if (f.length) out[k] = f;
    }
    return out;
  }, [pujasByDate, filterSearch]);
  const selectedPujasFiltered = useMemo(
    () => (selected ? pujasByDateFiltered[selected] || [] : []),
    [selected, pujasByDateFiltered]
  );

  // Group selected-date pujas into 3 buckets so the user always sees their
  // ashram first: same-city, same-state (within ~250km), then "across India".
  const groupedPujas = useMemo(() => {
    const local: Puja[] = [], state: Puja[] = [], rest: Puja[] = [];
    const userCity = (user.city || "").toLowerCase().trim();
    const userState = (user.state || "").toLowerCase().trim();
    for (const p of selectedPujasFiltered) {
      const c = (p.event_city || "").toLowerCase().trim();
      const s = (p.event_state || "").toLowerCase().trim();
      const venue = (p.event_venue || "").toLowerCase();
      const localMatch = userCity && (c.includes(userCity) || userCity.includes(c) || venue.includes(userCity));
      const stateMatch = userState && (s === userState || (p.distance_km != null && p.distance_km <= 250));
      if (localMatch) local.push(p);
      else if (stateMatch) state.push(p);
      else rest.push(p);
    }
    return { local, state, rest };
  }, [selectedPujasFiltered, user.city, user.state]);

  // ------ helpers ------
  const cells = useMemo(() => {
    const y = date.getFullYear(); const m = date.getMonth();
    const first = new Date(y, m, 1);
    const startOfWeek = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const grid: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < startOfWeek; i++) grid.push({ date: new Date(y, m, 1 - (startOfWeek - i)), inMonth: false });
    for (let d = 1; d <= daysInMonth; d++) grid.push({ date: new Date(y, m, d), inMonth: true });
    while (grid.length < 42) {
      const last = grid[grid.length - 1].date;
      const next = new Date(last); next.setDate(last.getDate() + 1);
      grid.push({ date: next, inMonth: false });
    }
    return grid;
  }, [date]);
  const todayISO = isoDate(new Date());

  const blurbForSelected = useMemo(() => {
    if (!selected) return null;
    const row = monthlyByDate[selected];
    if (!row) return null;
    const key = TITHI_ENG_KEY[(row.tithi - 1 + 30) % 30];
    return TITHI_BLURBS[lang]?.[key] || TITHI_BLURBS.en[key] || null;
  }, [selected, monthlyByDate, lang]);

  const onSelectDate = useCallback((iso: string) => { setSelected(iso); }, []);

  return (
    <div className="min-h-screen bg-[#fdf6ec] text-[#2b1d10] selection:bg-amber-300/40 overflow-x-hidden">
      {/* Decorative gradient backdrop */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full bg-gradient-to-br from-amber-200/60 via-orange-300/40 to-rose-300/30 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] md:w-[700px] h-[400px] md:h-[700px] rounded-full bg-gradient-to-br from-rose-200/50 via-orange-200/40 to-amber-100/30 blur-3xl" />
      </div>

      {/* Floating glass header. Two-row stack on mobile, one-row on md+. */}
      <header className="sticky top-2 md:top-3 z-30 mx-2 md:mx-6 mb-3 md:mb-4">
        <div className="backdrop-blur-xl bg-white/80 border border-amber-200/60 shadow-[0_8px_32px_rgba(180,83,9,0.08)] rounded-2xl px-3 md:px-6 py-2.5 md:py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://i.postimg.cc/W3ghSQLw/vds-aol-transparent.png"
              alt="Vaidic Dharma Sansthan"
              className="h-8 md:h-12 w-auto shrink-0 object-contain"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-sm md:text-xl font-serif font-semibold leading-tight tracking-tight text-amber-950 truncate">
                {pack.labels.panchangFor.replace(/—/g, "").trim()} · {months[date.getMonth()]} {date.getFullYear()}
              </h1>
              {(user.city || user.state) && (
                <p className="text-[10px] md:text-xs text-amber-900/60 truncate">
                  📍 {[user.city, user.state].filter(Boolean).join(", ")} · Lahiri Ayanamsa
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as LangCode)}
              className="flex-1 md:flex-none rounded-xl bg-white border border-amber-200/70 px-2.5 py-1.5 text-xs md:text-sm font-medium hover:bg-amber-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 max-w-[110px]"
              aria-label={pack.labels.selectLanguage}
            >
              {SUPPORTED_LANGS.map((l) => <option key={l} value={l}>{LANG_DISPLAY_NAMES[l]}</option>)}
            </select>
            <div className="flex rounded-xl overflow-hidden border border-amber-200/70 bg-white shadow-sm shrink-0">
              <button onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))} aria-label="Previous month" className="px-2.5 py-1.5 hover:bg-amber-50">‹</button>
              <button onClick={() => setDate(new Date())} className="px-2.5 py-1.5 hover:bg-amber-50 text-xs md:text-sm font-medium border-x border-amber-200/70">{TODAY_LABEL[lang]}</button>
              <button onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))} aria-label="Next month" className="px-2.5 py-1.5 hover:bg-amber-50">›</button>
            </div>
          </div>
        </div>
      </header>

      {/* Location strip — BookMyShow style. City picker + global puja search. */}
      <div className="max-w-7xl mx-auto px-2 md:px-6 mb-3 md:mb-4">
        <div className="rounded-2xl bg-white/85 backdrop-blur border border-amber-200/60 shadow-sm px-3 md:px-4 py-2.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <button onClick={() => setShowCityPicker((v) => !v)} className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-amber-950 hover:text-orange-700 transition shrink-0">
              <span className="text-base">📍</span>
              <span className="truncate max-w-[140px] md:max-w-none">{user.city || "Choose city"}</span>
              {autoDetected && (
                <span className="text-[9px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Auto</span>
              )}
              <span className="text-amber-700/60">▾</span>
            </button>
            <span className="text-amber-300 hidden md:inline">|</span>
            <button
              onClick={() => setShowAllIndia((v) => !v)}
              className={[
                "text-[10px] md:text-xs font-semibold px-2.5 py-1 rounded-full border transition shrink-0",
                showAllIndia
                  ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600"
                  : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50",
              ].join(" ")}
            >
              {showAllIndia ? "● All India" : `Within ${DEFAULT_RADIUS_KM} km`}
            </button>
          </div>
          {/* Global puja search */}
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-700/60 text-sm pointer-events-none">🔎</span>
            <input
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder={SEARCH_LABEL[lang]}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-amber-200 bg-white/90 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
          </div>
        </div>
        {showCityPicker && (
          <div className="mt-2 rounded-2xl bg-white border border-amber-200 shadow-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-amber-700/70 tracking-wider mb-2">Quick pick</div>
            <div className="flex flex-wrap gap-2">
              {QUICK_CITIES.map((c) => (
                <button
                  key={c.name}
                  onClick={() => { persistUser({ lat: c.lat, lng: c.lng, tz: c.tz, city: c.name, state: c.state }, false); setShowCityPicker(false); }}
                  className={[
                    "px-3 py-1.5 rounded-full text-xs md:text-sm font-medium border transition",
                    user.city === c.name
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100",
                  ].join(" ")}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const { latitude, longitude } = pos.coords;
                      fetch("/api/panchang/Donor/get_Place_by_lat_log", {
                        method: "POST", headers: { "content-type": "application/json" },
                        body: JSON.stringify({ latitude: String(latitude), longitude: String(longitude) }),
                      }).then(r => r.json()).then((data) => {
                        const r0 = data?.results?.[0];
                        const tzStr = (r0?.timezone?.offset_STD || "+05:30") as string;
                        const m = tzStr.match(/([+-])(\d{1,2}):(\d{2})/);
                        const tz = m ? (m[1] === "-" ? -1 : 1) * (parseInt(m[2]) + parseInt(m[3]) / 60) : 5.5;
                        persistUser({ lat: latitude, lng: longitude, tz, city: r0?.city || "Detected", state: r0?.state }, true);
                        setShowCityPicker(false);
                      }).catch(() => setShowCityPicker(false));
                    },
                    () => setShowCityPicker(false),
                  );
                }
              }}
              className="mt-3 text-xs text-orange-700 font-medium hover:underline flex items-center gap-1"
            >
              📡 Detect my location
            </button>
          </div>
        )}
      </div>

      {/* Calendar */}
      <main className="max-w-7xl mx-auto px-2 md:px-6 pb-12">
        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-1 md:mb-2">
          {wkdays.map((d, i) => (
            <div key={i} className={[
              "text-center text-[9px] md:text-xs font-semibold uppercase tracking-wider py-1.5 md:py-2 truncate",
              i === 0 ? "text-rose-600" : i === 6 ? "text-amber-700" : "text-amber-900/70",
            ].join(" ")}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {cells.map(({ date: d, inMonth }, i) => {
            const iso = isoDate(d);
            const row = monthlyByDate[iso];
            const isToday = iso === todayISO;
            const isSel = iso === selected;
            const pujas = pujasByDateFiltered[iso] || [];
            const isShukla = row?.paksha_short === "Shukla";
            const isKrishna = row?.paksha_short === "Krishna";
            const isPurnima = row?.tithi === 15;
            const isAmavasya = row?.tithi === 30;
            const isEkadashi = row?.tithi === 11 || row?.tithi === 26;
            const tithiName = row?.tithi_full ? extractTithi(row.tithi_full) : "";
            const nakName = (row?.nakshatra_name || "").trim();
            const moonRashi = row?.moon_sign;

            const palette = !inMonth
              ? "bg-stone-50/50 text-stone-400"
              : isPurnima
                ? "bg-gradient-to-br from-amber-100 via-yellow-50 to-white border-amber-300/60 ring-1 ring-amber-300/40"
                : isAmavasya
                  ? "bg-gradient-to-br from-slate-200 via-stone-100 to-white border-stone-300/60 ring-1 ring-stone-400/30"
                  : isShukla
                    ? "bg-gradient-to-br from-white via-amber-50/70 to-orange-50 border-amber-200/50"
                    : isKrishna
                      ? "bg-gradient-to-br from-stone-100 via-stone-50 to-white border-stone-200/70"
                      : "bg-white border-stone-200";

            return (
              <button
                key={i}
                onClick={() => onSelectDate(iso)}
                className={[
                  "group relative aspect-[1/1.25] md:aspect-[1/1.1] rounded-lg md:rounded-2xl border p-1.5 md:p-3 text-left flex flex-col transition-all duration-200 overflow-hidden min-w-0",
                  "active:scale-95 md:hover:scale-[1.02] md:hover:shadow-[0_12px_28px_rgba(180,83,9,0.18)] md:hover:border-amber-400/60",
                  palette,
                  isToday ? "outline outline-2 outline-amber-500 outline-offset-0 md:outline-offset-1" : "",
                  isSel ? "ring-2 ring-orange-500 shadow-[0_16px_40px_rgba(234,88,12,0.25)]" : "",
                ].join(" ")}
              >
                {/* Top row: date + paksha dot + special + count */}
                <div className="flex items-start justify-between gap-0.5 w-full">
                  <div className="flex items-center gap-1 min-w-0">
                    {/* Tiny paksha dot — yellow=shukla, slate=krishna. Visible everywhere. */}
                    {inMonth && row && (
                      <span className={[
                        "inline-block rounded-full shrink-0 w-1.5 h-1.5 md:hidden",
                        isShukla ? "bg-amber-500" : "bg-stone-500",
                      ].join(" ")} />
                    )}
                    <span className={[
                      "text-sm md:text-lg font-bold leading-none",
                      isToday ? "text-orange-600" : !inMonth ? "text-stone-400" : "text-amber-950",
                    ].join(" ")}>{d.getDate()}</span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {isPurnima && <span className="text-[11px] md:text-base leading-none">🌕</span>}
                    {isAmavasya && <span className="text-[11px] md:text-base leading-none">🌑</span>}
                    {isEkadashi && <span className="text-[11px] md:text-sm leading-none">⭐</span>}
                    {pujas.length > 0 && (
                      <span className="text-[8px] md:text-[10px] font-bold bg-orange-600/90 text-white rounded-full px-1 md:px-1.5 py-px md:py-0.5 shadow-sm">{pujas.length}</span>
                    )}
                  </div>
                </div>

                {inMonth && row && (
                  <>
                    {/* Mobile: tithi name (Saptami/Purnima…) — most useful info. + nakshatra abbrev on sm+. */}
                    <div className="md:hidden mt-0.5 flex-1 min-h-0 w-full overflow-hidden">
                      <div className="text-[10px] font-semibold text-amber-950 leading-tight truncate">{tithiName}</div>
                      <div className="hidden xs:block sm:block text-[9px] text-amber-900/60 leading-tight truncate">
                        {nakName.slice(0, 8)}
                      </div>
                    </div>

                    {/* Desktop: full data block */}
                    <div className="hidden md:flex md:flex-col md:gap-0.5 mt-1 flex-1 min-h-0 w-full">
                      <span className={[
                        "self-start text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                        isShukla ? "bg-amber-200/70 text-amber-900" : "bg-stone-300/60 text-stone-700",
                      ].join(" ")}>
                        {isShukla ? "Shukla" : "Krishna"}
                      </span>
                      <div className="text-xs font-semibold text-amber-950 leading-tight line-clamp-1 mt-0.5">{tithiName}</div>
                      <div className="text-[11px] text-amber-900/70 leading-tight line-clamp-1">{nakName}{row.pada ? ` · P${row.pada}` : ""}</div>
                      <div className="text-[10px] text-amber-800/60 leading-tight line-clamp-1 italic">{moonRashi}</div>
                    </div>
                  </>
                )}

                {/* Mobile puja indicator — single chip */}
                {pujas.length > 0 && inMonth && (
                  <div className="md:hidden mt-auto pt-0.5 w-full">
                    <div className="text-[8px] font-medium text-orange-700 truncate leading-tight">🪔 {(pujas[0].display_name || pujas[0].sub_purpose || "").slice(0, 12)}</div>
                  </div>
                )}

                {/* Desktop puja preview */}
                {pujas.length > 0 && inMonth && (
                  <div className="hidden md:block mt-auto pt-1 text-[10px] font-medium text-orange-700 border-t border-amber-200/40 line-clamp-1 group-hover:text-orange-800 w-full">
                    🪔 {pujas[0].display_name || pujas[0].sub_purpose}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-center text-[10px] md:text-[11px] text-amber-900/50 mt-4 md:mt-6 italic px-2">
          Panchang calculated at sunrise · Lahiri Ayanamsa
        </p>
      </main>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-amber-950/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in" onClick={() => setSelected(null)}>
          <div
            className="bg-gradient-to-br from-amber-50 to-white rounded-t-3xl md:rounded-3xl shadow-[0_40px_80px_rgba(120,53,15,0.4)] max-w-4xl w-full max-h-[92vh] overflow-y-auto overflow-x-hidden border border-amber-200/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal head */}
            <div className="sticky top-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-4 md:px-6 py-4 md:py-5 rounded-t-3xl shadow-md z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] md:text-xs uppercase tracking-widest text-white/80 font-semibold truncate">{formatLongDate(selected, lang)}</div>
                  <h2 className="font-serif text-lg md:text-2xl font-bold leading-tight mt-1 break-words">{titleFromBlurb(blurbForSelected) || extractTithi(monthlyByDate[selected]?.tithi_full || "")}</h2>
                  <p className="text-xs md:text-sm text-white/85 mt-0.5 truncate">{monthlyByDate[selected]?.tithi_full || ""}</p>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Close" className="text-white/90 hover:text-white text-3xl leading-none -mt-1 active:scale-90 shrink-0 px-2">×</button>
              </div>

              {/* Panchang pills */}
              {monthlyByDate[selected] && (() => {
                const row = monthlyByDate[selected];
                const dow = parseISODate(selected).getDay();
                const isShukla = row.paksha_short === "Shukla";
                return (
                  <div className="flex flex-wrap gap-1.5 md:gap-2 mt-3 md:mt-4">
                    <Pill icon={VAARA_ICONS[dow]} label="Vaara" value={pack.vara[dow]} />
                    <Pill icon="🌓" label={pack.labels.tithi} value={extractTithi(row.tithi_full)} />
                    <Pill icon={isShukla ? "🌓" : "🌗"} label={pack.labels.paksha} value={isShukla ? "Shukla" : "Krishna"} />
                    <Pill icon="⭐" label={pack.labels.nakshatra} value={`${(row.nakshatra_name || "").trim()} P${row.pada}`} />
                    <Pill icon="♈" label={pack.labels.moonSign} value={row.moon_sign} />
                  </div>
                );
              })()}
            </div>

            {/* Tithi blurb */}
            {blurbForSelected && (
              <div className="px-4 md:px-6 pt-4 pb-1">
                <div className="rounded-2xl bg-amber-100/60 border border-amber-200 px-3 md:px-4 py-3 text-sm text-amber-950 leading-relaxed">
                  <span className="text-lg md:text-xl mr-2">{blurbForSelected.icon}</span>
                  <span dangerouslySetInnerHTML={{ __html: blurbForSelected.html }} />
                </div>
              </div>
            )}

            <div className="px-4 md:px-6 py-5 space-y-6">
              {/* Detailed panchang grid */}
              {selectedDetail && (
                <section>
                  <SectionTitle>Panchang</SectionTitle>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Field label={pack.labels.sunrise} value={selectedDetail.sunrise} icon="🌅" />
                    <Field label={pack.labels.sunset} value={selectedDetail.sunset} icon="🌇" />
                    <Field label={pack.labels.moonrise} value={selectedDetail.moonrise} icon="🌙" />
                    <Field label={pack.labels.moonset} value={selectedDetail.moonset} icon="🌘" />
                    <Field label={pack.labels.sunSign} value={selectedDetail.sun_sign} icon="☀️" />
                    <Field label={pack.labels.moonSign} value={selectedDetail.moon_sign} icon="🌝" />
                    <Field label={pack.labels.ayana} value={selectedDetail.ayana} icon="🧭" />
                    <Field label={pack.labels.ritu} value={selectedDetail.ritu} icon="🍃" />
                    <Field label={pack.labels.yoga} value={selectedDetail.parsed_json_data?.yog?.details?.yog_name} icon="🪷" />
                    <Field label={pack.labels.karana} value={selectedDetail.parsed_json_data?.karan?.details?.karan_name} icon="🎴" />
                    <Field label={pack.labels.abhijit} value={`${selectedDetail.abhijit_muhurta_start}–${selectedDetail.abhijit_muhurta_end}`} icon="✨" />
                    <Field label={pack.labels.rahukaal} value={`${shortTime(selectedDetail.rahukaal_start_start)}–${shortTime(selectedDetail.rahukaal_start_end)}`} icon="⚠️" highlight />
                    <Field label={pack.labels.yamghant} value={`${shortTime(selectedDetail.yamghant_kaal_start)}–${shortTime(selectedDetail.yamghant_kaal_end)}`} icon="⏳" />
                    <Field label={pack.labels.gulikaal} value={`${shortTime(selectedDetail.guliKaal_start)}–${shortTime(selectedDetail.guliKaal_end)}`} icon="🌫️" />
                    <Field label={pack.labels.vikramSamvat} value={`${selectedDetail.vikram_samvat} (${selectedDetail.vkram_samvat_name?.trim()})`} icon="📜" />
                  </div>
                </section>
              )}
              {loadingDetail && !selectedDetail && (
                <div className="text-center text-amber-700/60 text-sm py-4">Loading panchang…</div>
              )}

              {/* Pujas section */}
              <section>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <SectionTitle>{pack.labels.pujas}</SectionTitle>
                  <span className="text-xs text-amber-700/70 font-medium shrink-0">{selectedPujasFiltered.length} listed</span>
                </div>

                {selectedPujasFiltered.length === 0 ? (
                  <div className="text-center py-8 rounded-2xl bg-amber-50/60 border border-dashed border-amber-200">
                    <div className="text-3xl mb-2">🪔</div>
                    <p className="text-sm text-amber-800/70">{NO_PUJAS_LABEL[lang]}</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {groupedPujas.local.length > 0 && (
                      <PujaGroup
                        title={`${user.city || "Your"} Ashram`}
                        subtitle="At your location"
                        accent="primary"
                        pujas={groupedPujas.local}
                      />
                    )}
                    {groupedPujas.state.length > 0 && (
                      <PujaGroup
                        title={user.state ? `Other pujas in ${user.state}` : "Nearby (within 250 km)"}
                        subtitle="Within driving distance"
                        accent="secondary"
                        pujas={groupedPujas.state}
                      />
                    )}
                    {groupedPujas.rest.length > 0 && (
                      <PujaGroup
                        title="Across India"
                        subtitle={`${groupedPujas.rest.length} more pujas elsewhere`}
                        accent="muted"
                        pujas={groupedPujas.rest}
                        collapsible
                      />
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}
function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(n => parseInt(n, 10));
  return new Date(y, m - 1, d);
}
function shortTime(t?: string): string {
  if (!t) return "";
  return t.slice(0, 5);
}
function extractTithi(full?: string): string {
  if (!full) return "";
  // Strip the paksha prefix "शुक्ल "/"कृष्ण "/"Shukla "/"Krishna " etc. for compact display.
  return full.replace(/^(Shukla|Krishna|शुक्ल|कृष्ण|శుక్ల|కృష్ణ|சுக்ல|கிருஷ்ண|ശുക്ല|കൃഷ്ണ|ಶುಕ್ಲ|ಕೃಷ್ಣ)\s+/u, "").trim();
}
function formatLongDate(iso: string, lang: string): string {
  const d = parseISODate(iso);
  const m = MONTH_NAMES[lang] || MONTH_NAMES.en;
  const wk = WEEKDAY_FULL[lang] || WEEKDAY_FULL.en;
  return `${wk[d.getDay()]} · ${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
}
function titleFromBlurb(b: { html: string } | null | undefined): string {
  if (!b) return "";
  const m = b.html.match(/<strong>([^<]+)<\/strong>/);
  return m ? m[1] : "";
}

// ─── primitives ─────────────────────────────────────────────────────────────

function Pill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-1 md:gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-medium text-white max-w-full">
      <span className="shrink-0">{icon}</span>
      <span className="text-white/80 hidden sm:inline">{label}:</span>
      <span className="font-semibold truncate">{value}</span>
    </div>
  );
}

function Field({ label, value, icon, highlight }: { label: string; value?: string; icon?: string; highlight?: boolean }) {
  if (!value) return null;
  return (
    <div className={[
      "rounded-xl px-2.5 md:px-3 py-2 md:py-2.5 border min-w-0",
      highlight ? "bg-rose-50/80 border-rose-200/70" : "bg-white/70 border-amber-200/50",
    ].join(" ")}>
      <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] uppercase tracking-wider font-semibold text-amber-700/70 truncate">
        {icon && <span className="text-xs md:text-sm">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-xs md:text-sm font-semibold text-amber-950 mt-0.5 truncate">{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-serif text-lg font-bold text-amber-950 mb-2 flex items-center gap-2">{children}</h3>;
}

function PujaGroup({ title, subtitle, accent, pujas, collapsible }: {
  title: string; subtitle?: string;
  accent: "primary" | "secondary" | "muted";
  pujas: Puja[]; collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  const accentBar =
    accent === "primary" ? "bg-orange-500" :
    accent === "secondary" ? "bg-amber-400" : "bg-stone-400";
  const accentText =
    accent === "primary" ? "text-orange-700" :
    accent === "secondary" ? "text-amber-700" : "text-stone-600";
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 mb-2 group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1 h-5 rounded-full shrink-0 ${accentBar}`} />
          <div className="text-left min-w-0">
            <div className={`text-sm md:text-base font-bold ${accentText} truncate`}>{title}</div>
            {subtitle && <div className="text-[10px] md:text-xs text-amber-900/60 truncate">{subtitle}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-amber-700/70">{pujas.length}</span>
          {collapsible && <span className={`text-amber-600 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>}
        </div>
      </button>
      {open && (
        <ul className="space-y-2.5">
          {pujas.map((p) => <PujaCard key={p.id} p={p} />)}
        </ul>
      )}
    </div>
  );
}

function PujaCard({ p }: { p: Puja }) {
  // wp_event_id is the WordPress post id used by vaidicpujas.org registration page.
  const regUrl = p.wp_event_id ? `https://vaidicpujas.org/sevadetails/?transid=${p.wp_event_id}` : null;
  const Tag: any = regUrl ? "a" : "div";
  return (
    <li>
      <Tag
        {...(regUrl ? { href: regUrl, target: "_blank", rel: "noopener noreferrer" } : {})}
        className="block rounded-2xl border border-amber-200/60 bg-white/80 hover:bg-white p-3 md:p-4 transition-all hover:shadow-lg hover:border-orange-300 active:scale-[0.99] cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <h4 className="font-serif font-bold text-sm md:text-base text-amber-950 leading-tight flex items-center gap-1.5 flex-wrap">
              {p.display_name || p.sub_purpose || p.event_name}
              {regUrl && <span className="text-[10px] font-medium text-orange-600">↗</span>}
            </h4>
            <p className="text-[11px] md:text-xs text-amber-900/60 mt-0.5 truncate">
              📍 {[p.event_venue || p.event_city, p.event_state].filter(Boolean).join(", ")}
            </p>
          </div>
          {p.distance_km != null && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded-full whitespace-nowrap shrink-0">
              {p.distance_km < 1 ? "Local" : `${p.distance_km} km`}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] md:text-[11px] text-amber-900/70">
          {p.event_start_time && <span>🕐 {p.event_start_time}{p.event_end_time ? `–${p.event_end_time}` : ""}</span>}
          {p.swamiji_details && <span className="truncate max-w-[200px]">🧘 {p.swamiji_details}</span>}
          {p.purpose && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md font-medium">{p.purpose}</span>}
          {p.sevaamt ? <span className="font-semibold text-orange-700">₹{p.sevaamt}</span> : null}
          {regUrl && <span className="ml-auto font-semibold text-orange-700 underline">Register →</span>}
        </div>
      </Tag>
    </li>
  );
}

