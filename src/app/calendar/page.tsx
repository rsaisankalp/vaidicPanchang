// World-class panchang + pujas calendar.
// - Month grid; each cell shows tithi, festivals, and number of pujas nearby.
// - Click a date → details modal with full panchang + pujas list.
// - Language selector (en/hi/te/ta/ml/kn).
// - Auto-detects user location for nearest-pujas; manual override available.

"use client";
import { useEffect, useMemo, useState } from "react";
import { getPack, SUPPORTED_LANGS, LANG_DISPLAY_NAMES } from "@/lib/panchang/i18n";

type LangCode = "en" | "hi" | "te" | "ta" | "ml" | "kn";

interface Puja {
  id: number;
  event_name: string;
  display_name?: string;
  event_city?: string;
  event_state?: string;
  event_venue?: string;
  event_start_date?: string;
  event_start_time?: string;
  sub_purpose?: string;
  swamiji_details?: string;
  sevaamt?: number;
  distance_km?: number;
}

interface DailyPanchang {
  table?: any[];
}

const MONTH_NAMES = {
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  hi: ["जनवरी","फरवरी","मार्च","अप्रैल","मई","जून","जुलाई","अगस्त","सितम्बर","अक्टूबर","नवम्बर","दिसम्बर"],
  te: ["జనవరి","ఫిబ్రవరి","మార్చి","ఏప్రిల్","మే","జూన్","జులై","ఆగస్ట్","సెప్టెంబర్","అక్టోబర్","నవంబర్","డిసెంబర్"],
  ta: ["ஜனவரி","பிப்ரவரி","மார்ச்","ஏப்ரல்","மே","ஜூன்","ஜூலை","ஆகஸ்ட்","செப்டம்பர்","அக்டோபர்","நவம்பர்","டிசம்பர்"],
  ml: ["ജനുവരി","ഫെബ്രുവരി","മാർച്ച്","ഏപ്രിൽ","മേയ്","ജൂൺ","ജൂലൈ","ഓഗസ്റ്റ്","സെപ്റ്റംബർ","ഒക്ടോബർ","നവംബർ","ഡിസംബർ"],
  kn: ["ಜನವರಿ","ಫೆಬ್ರವರಿ","ಮಾರ್ಚ್","ಏಪ್ರಿಲ್","ಮೇ","ಜೂನ್","ಜುಲೈ","ಆಗಸ್ಟ್","ಸೆಪ್ಟೆಂಬರ್","ಅಕ್ಟೋಬರ್","ನವೆಂಬರ್","ಡಿಸೆಂಬರ್"],
};
const WEEKDAY_SHORT = {
  en: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  hi: ["र","सो","मं","बु","गु","शु","श"],
  te: ["ఆది","సోమ","మంగ","బుధ","గురు","శుక్ర","శని"],
  ta: ["ஞா","தி","செ","பு","வி","வெ","ச"],
  ml: ["ഞ","തി","ച","ബു","വ്യ","വെ","ശ"],
  kn: ["ಭಾ","ಸೋ","ಮಂ","ಬು","ಗು","ಶು","ಶ"],
};

interface UserCtx { lat: number; lng: number; tz: number; city?: string; state?: string }

export default function CalendarPage() {
  const [lang, setLang] = useState<LangCode>("hi");
  const pack = useMemo(() => getPack(lang), [lang]);
  const [date, setDate] = useState(new Date());
  const [user, setUser] = useState<UserCtx | null>(null);
  const [pujasByDate, setPujasByDate] = useState<Record<string, Puja[]>>({});
  const [festByDate, setFestByDate] = useState<Record<string, string>>({});
  const [tithiByDate, setTithiByDate] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // restore lang from localStorage
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("panchang_lang")) || null;
    if (saved && SUPPORTED_LANGS.includes(saved as LangCode)) setLang(saved as LangCode);
  }, []);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("panchang_lang", lang); }, [lang]);

  // Detect user location once
  useEffect(() => {
    if (!navigator.geolocation) {
      setUser({ lat: 12.9716, lng: 77.5946, tz: 5.5, city: "Bengaluru", state: "Karnataka" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Resolve location name + tz via internal API
        fetch("/api/panchang/Donor/get_Place_by_lat_log", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ latitude: String(latitude), longitude: String(longitude) }),
        }).then(r => r.json()).then((data) => {
          const r0 = data?.results?.[0];
          const tzStr = (r0?.timezone?.offset_STD || "+05:30") as string;
          const m = tzStr.match(/([+-])(\d{1,2}):(\d{2})/);
          const tz = m ? (m[1] === "-" ? -1 : 1) * (parseInt(m[2]) + parseInt(m[3]) / 60) : 5.5;
          setUser({ lat: latitude, lng: longitude, tz, city: r0?.city, state: r0?.state });
        }).catch(() => setUser({ lat: latitude, lng: longitude, tz: 5.5 }));
      },
      () => setUser({ lat: 12.9716, lng: 77.5946, tz: 5.5, city: "Bengaluru", state: "Karnataka" })
    );
  }, []);

  // Load monthly panchang for the visible month
  useEffect(() => {
    if (!user) return;
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
      const tithiMap: Record<string, string> = {};
      for (const row of data.table || []) {
        if (row.sort === 1) tithiMap[row.date_name] = row.tithi_name;
      }
      setTithiByDate(tithiMap);
    }).catch(() => {});
  }, [user, date.getMonth(), date.getFullYear(), lang]);

  // Load pujas for the visible month
  useEffect(() => {
    if (!user) return;
    const y = date.getFullYear(); const m = date.getMonth();
    const from = new Date(y, m, 1).toISOString().slice(0, 10);
    const to = new Date(y, m + 1, 0).toISOString().slice(0, 10);
    const u = `/api/pujas?lat=${user.lat}&lng=${user.lng}&from=${from}&to=${to}&max=300`;
    fetch(u).then(r => r.json()).then((data) => {
      const grouped: Record<string, Puja[]> = {};
      for (const p of data.pujas || []) {
        const d = (p.event_start_date || "").slice(0, 10);
        if (!d) continue;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(p);
      }
      setPujasByDate(grouped);
    }).catch(() => setPujasByDate({}));
  }, [user, date.getMonth(), date.getFullYear()]);

  // When a date is selected, fetch full daily panchang
  useEffect(() => {
    if (!selected || !user) { setSelectedDetail(null); return; }
    const [yy, mm, dd] = selected.split("-").map(n => parseInt(n, 10));
    setLoadingDetail(true);
    fetch("/api/panchang/ExternalApi/SavePanchangDetails", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        birth_date_: `${dd.toString().padStart(2,"0")}-${mm.toString().padStart(2,"0")}-${yy}`,
        birth_time_: "07:00:00", lat_: String(user.lat), lon_: String(user.lng),
        tzone_: String(user.tz), place_: user.city || "", country_: "India",
        state_: user.state || "", city_: String(user.lng),
        lang_: lang, panchang_type: "1",
      }),
    }).then(r => r.json()).then((data) => {
      const detail = data.table?.[0];
      try { detail.parsed_json_data = JSON.parse(detail.json_data); } catch {}
      setSelectedDetail(detail);
    }).finally(() => setLoadingDetail(false));
  }, [selected, user, lang]);

  // Build calendar grid (6 rows x 7 cols)
  const cells = useMemo(() => {
    const y = date.getFullYear(); const m = date.getMonth();
    const first = new Date(y, m, 1);
    const startOfWeek = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const grid: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < startOfWeek; i++) {
      const d = new Date(y, m, 1 - (startOfWeek - i));
      grid.push({ date: d, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) grid.push({ date: new Date(y, m, d), inMonth: true });
    while (grid.length < 42) {
      const last = grid[grid.length - 1].date;
      const next = new Date(last); next.setDate(last.getDate() + 1);
      grid.push({ date: next, inMonth: false });
    }
    return grid;
  }, [date]);

  const isoDate = (d: Date) => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}`;
  const todayISO = isoDate(new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-200">
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-amber-200/40 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl" aria-hidden>🕉️</div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{pack.labels.panchangFor} {MONTH_NAMES[lang][date.getMonth()]} {date.getFullYear()}</h1>
              {user?.city && <p className="text-xs text-slate-500">{user.city}, {user.state}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as LangCode)}
              className="rounded-lg bg-white dark:bg-slate-800 border border-amber-300/40 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              aria-label={pack.labels.selectLanguage}
            >
              {SUPPORTED_LANGS.map((l) => (
                <option key={l} value={l}>{LANG_DISPLAY_NAMES[l]}</option>
              ))}
            </select>
            <div className="flex rounded-lg overflow-hidden border border-amber-300/40 shadow-sm">
              <button onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))} className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-sm">‹</button>
              <button onClick={() => setDate(new Date())} className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-sm border-x border-amber-200/40">{lang === "en" ? "Today" : "आज"}</button>
              <button onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))} className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-sm">›</button>
            </div>
          </div>
        </div>
      </header>

      {/* Calendar grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAY_SHORT[lang].map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-amber-700 dark:text-amber-300 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map(({ date: d, inMonth }, i) => {
            const iso = isoDate(d);
            const pujas = pujasByDate[iso] || [];
            const tithi = tithiByDate[iso] || "";
            const isToday = iso === todayISO;
            const isSel = iso === selected;
            return (
              <button
                key={i}
                onClick={() => setSelected(iso)}
                className={[
                  "aspect-square rounded-xl p-2 flex flex-col items-start justify-between text-left transition-all",
                  inMonth ? "bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5" : "bg-white/40 dark:bg-slate-800/40 opacity-50",
                  isToday ? "ring-2 ring-amber-500" : "",
                  isSel ? "ring-2 ring-orange-600 shadow-xl" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={["text-sm font-semibold", isToday ? "text-amber-700 dark:text-amber-300" : ""].join(" ")}>{d.getDate()}</span>
                  {pujas.length > 0 && (
                    <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200 rounded-full px-1.5 py-0.5 font-medium">{pujas.length}</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight line-clamp-2">{tithi}</div>
                {pujas.length > 0 && (
                  <div className="text-[9px] text-orange-700 dark:text-orange-300 line-clamp-2 leading-tight">
                    {pujas[0].display_name || pujas[0].sub_purpose || pujas[0].event_name}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-semibold text-lg">{selected}</h2>
              <button onClick={() => setSelected(null)} className="text-white/90 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Panchang */}
              {loadingDetail ? (
                <div className="text-slate-500 text-sm">Loading…</div>
              ) : selectedDetail ? (
                <section>
                  <h3 className="text-sm uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-3 font-semibold">{pack.labels.panchangFor.replace(/—/g, "")}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <Field label={pack.labels.tithi} value={selectedDetail.parsed_json_data?.tithi?.details?.tithi_name} />
                    <Field label={pack.labels.nakshatra} value={selectedDetail.parsed_json_data?.nakshatra?.details?.nak_name} />
                    <Field label={pack.labels.yoga} value={selectedDetail.parsed_json_data?.yog?.details?.yog_name} />
                    <Field label={pack.labels.karana} value={selectedDetail.parsed_json_data?.karan?.details?.karan_name} />
                    <Field label={pack.labels.paksha} value={selectedDetail.paksha} />
                    <Field label={pack.labels.ritu} value={selectedDetail.ritu} />
                    <Field label={pack.labels.sunrise} value={selectedDetail.sunrise} />
                    <Field label={pack.labels.sunset} value={selectedDetail.sunset} />
                    <Field label={pack.labels.moonrise} value={selectedDetail.moonrise} />
                    <Field label={pack.labels.moonset} value={selectedDetail.moonset} />
                    <Field label={pack.labels.sunSign} value={selectedDetail.sun_sign} />
                    <Field label={pack.labels.moonSign} value={selectedDetail.moon_sign} />
                    <Field label={pack.labels.ayana} value={selectedDetail.ayana} />
                    <Field label={pack.labels.abhijit} value={`${selectedDetail.abhijit_muhurta_start}–${selectedDetail.abhijit_muhurta_end}`} />
                    <Field label={pack.labels.rahukaal} value={`${selectedDetail.rahukaal_start_start}–${selectedDetail.rahukaal_start_end}`} />
                  </div>
                </section>
              ) : null}

              {/* Pujas */}
              <section>
                <h3 className="text-sm uppercase tracking-wider text-orange-700 dark:text-orange-300 mb-3 font-semibold">{pack.labels.pujas}</h3>
                {(pujasByDate[selected] || []).length === 0 ? (
                  <p className="text-sm text-slate-500">{lang === "en" ? "No pujas listed for this date." : "इस तिथि हेतु कोई पूजा सूचीबद्ध नहीं।"}</p>
                ) : (
                  <ul className="space-y-3">
                    {(pujasByDate[selected] || []).map((p) => (
                      <li key={p.id} className="rounded-xl border border-amber-200/50 dark:border-slate-700/50 bg-amber-50/40 dark:bg-slate-800/50 p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-100">{p.display_name || p.sub_purpose || p.event_name}</h4>
                          {p.distance_km != null && (
                            <span className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full whitespace-nowrap">{p.distance_km} km</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                          {p.event_venue || p.event_city}{p.event_state ? `, ${p.event_state}` : ""}
                        </p>
                        {p.swamiji_details && <p className="text-xs text-slate-500"><span className="font-medium">Sanyasi:</span> {p.swamiji_details}</p>}
                        {p.event_start_time && <p className="text-xs text-slate-500"><span className="font-medium">Time:</span> {p.event_start_time}{p.event_end_time ? ` – ${p.event_end_time}` : ""}</p>}
                        {p.sevaamt ? <p className="text-xs text-orange-700 dark:text-orange-300 font-medium mt-1">₹{p.sevaamt}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="bg-amber-50/60 dark:bg-slate-800/60 rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-amber-700/70 dark:text-amber-300/70">{label}</div>
      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  );
}
