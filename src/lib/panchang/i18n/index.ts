// Public entry: pick language pack at runtime.
import { en } from "./en";
import { hi } from "./hi";
import { te } from "./te";
import { ta } from "./ta";
import { ml } from "./ml";
import { kn } from "./kn";
import type { LangCode, PanchangLangPack } from "./types";

export { LANG_DISPLAY_NAMES } from "./types";
export type { LangCode, PanchangLangPack };

const PACKS: Record<LangCode, PanchangLangPack> = { en, hi, te, ta, ml, kn };

export function getPack(lang: string | undefined | null): PanchangLangPack {
  if (lang && (PACKS as any)[lang]) return (PACKS as any)[lang];
  return PACKS.hi;
}

export const SUPPORTED_LANGS: LangCode[] = ["en", "hi", "te", "ta", "ml", "kn"];
