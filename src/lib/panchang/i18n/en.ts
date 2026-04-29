// English (Latin) language pack. Names are standard transliterations.
import type { PanchangLangPack } from "./types";

const TITHI_BASE = [
  "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami",
  "Ekadashi","Dwadashi","Trayodashi","Chaturdashi",
];

export const en: PanchangLangPack = {
  tithi: [
    ...TITHI_BASE.map(n => `Shukla ${n}`), "Purnima",
    ...TITHI_BASE.map(n => `Krishna ${n}`), "Amavasya",
  ],
  tithiDeity: [
    "Agni","Brahma","Gauri","Ganesha","Naga","Kartikeya","Surya","Shiva","Durga","Yama",
    "Vishvadeva","Vishnu","Kamadeva","Shiva","Chandra",
    "Agni","Brahma","Gauri","Ganesha","Naga","Kartikeya","Indra","Vasu","Rudra","Yama",
    "Pitru","Aditi","Rati","Shiva","Pitr",
  ],
  tithiSummary: Array(30).fill("Auspicious for new beginnings and worship."),
  nakshatra: [
    "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu",
    "Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra",
    "Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha",
    "Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati",
  ],
  nakshatraRuler: [
    "Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter",
    "Saturn","Mercury","Ketu","Venus","Sun","Moon","Mars",
    "Rahu","Jupiter","Saturn","Mercury","Ketu","Venus","Sun",
    "Moon","Mars","Rahu","Jupiter","Saturn","Mercury",
  ],
  nakshatraDeity: [
    "Ashwini Kumaras","Yama","Agni","Brahma","Chandra","Rudra","Aditi",
    "Brihaspati","Naga","Pitr","Bhaga","Aryaman","Savitr","Tvashtr",
    "Vayu","Indragni","Mitra","Indra","Nirriti","Apas","Vishvadeva",
    "Vishnu","Vasus","Varuna","Aja Ekapada","Ahirbudhnya","Pushan",
  ],
  nakshatraSummary: Array(27).fill("Favorable for auspicious activities."),
  nakshatraSpecial: (() => { const a = Array(27).fill(""); a[0]="Mula Nakshatra"; a[8]="Gandamoola"; a[9]="Gandamoola"; a[17]="Gandamoola"; a[18]="Gandamoola"; a[26]="Gandamoola"; return a; })(),
  yoga: [
    "Vishkambha","Priti","Ayushman","Saubhagya","Shobhana","Atiganda","Sukarma","Dhriti","Shula","Ganda",
    "Vriddhi","Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyan","Parigha","Shiva",
    "Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti",
  ],
  yogaSpecial: Array(27).fill(""),
  yogaMeaning: Array(27).fill(""),
  karana: ["Kimstughna","Bava","Balava","Kaulava","Taitila","Gara","Vanija","Vishti","Shakuni","Chatushpada","Naga"],
  karanaDeity: ["Marut","Indra","Brahma","Mitra","Aryaman","Bhumi","Lakshmi","Mrityu","Kali","Vrisha","Naga"],
  karanaSpecial: [
    "Auspicious for new ventures.","Auspicious for stable work.","Auspicious for learning.","Good for friendships.",
    "Good for affectionate matters.","Good for agriculture.","Good for trade.",
    "Also called Bhadra; inauspicious for important works.",
    "Inauspicious; only special tasks.","For animal-related matters.","For Naga worship.",
  ],
  vara: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  rashi: ["Mesha","Vrishabha","Mithuna","Karka","Simha","Kanya","Tula","Vrishchika","Dhanu","Makara","Kumbha","Meena"],
  hinduMaah: ["Chaitra","Vaishakha","Jyeshtha","Ashadha","Shravana","Bhadrapada","Ashwin","Kartika","Margashirsha","Pausha","Magha","Phalguna"],
  ritu: ["Vasanta","Greeshma","Varsha","Sharad","Hemanta","Shishira"],
  ayana: ["Uttarayana","Dakshinayana"],
  paksha: ["Shukla Paksha","Krishna Paksha"],
  dishaShool: ["West","East","North","North","South","West","East"],
  moonNivas: ["East","South","West","North"],
  samvatsara: [
    "Prabhava","Vibhava","Shukla","Pramoda","Prajapati","Angirasa","Shrimukha","Bhava","Yuva","Dhata","Ishvara","Bahudhanya",
    "Pramathi","Vikrama","Vrisha","Chitrabhanu","Subhanu","Tarana","Parthiva","Vyaya","Sarvajit","Sarvadhari","Virodhi","Vikriti",
    "Khara","Nandana","Vijaya","Jaya","Manmatha","Durmukhi","Hevilambi","Vilambi","Vikari","Sharvari","Plava","Shubhakrit",
    "Shobhakrit","Krodhi","Vishvavasu","Parabhava","Plavanga","Kilaka","Saumya","Sadharana","Virodhakrit","Paridhavi","Pramadi","Ananda",
    "Rakshasa","Nala","Pingala","Kalayukta","Siddharthi","Raudra","Durmati","Dundubhi","Rudhirodgari","Raktakshi","Krodhana","Kshaya",
  ],
  labels: {
    sunrise:"Sunrise", sunset:"Sunset", moonrise:"Moonrise", moonset:"Moonset",
    tithi:"Tithi", nakshatra:"Nakshatra", yoga:"Yoga", karana:"Karana",
    paksha:"Paksha", ritu:"Ritu", sunSign:"Sun Sign", moonSign:"Moon Sign", ayana:"Ayana",
    abhijit:"Abhijit Muhurta", rahukaal:"Rahu Kaal", yamghant:"Yamghanta Kaal", gulikaal:"Gulika Kaal",
    vikramSamvat:"Vikram Samvat", shakaSamvat:"Shaka Samvat",
    festivals:"Festivals", pujas:"Pujas", panchangFor:"Panchang —", selectLanguage:"Select Language",
  },
};
