import fs from 'fs';
import path from 'path';

const dictionaries: Record<string, Set<string> | null> = { en: null, fr: null };

function loadDict(lang: string, filename: string): void {
  const p = path.join(__dirname, '../data', filename);
  try {
    if (fs.existsSync(p)) {
      const words = fs
        .readFileSync(p, 'utf-8')
        .split(/\r?\n/)
        .map((w) => w.trim().toUpperCase())
        .filter((w) => w.length >= 2 && /^[A-Z]+$/.test(w));
      dictionaries[lang] = new Set(words);
      console.log(`Dictionary [${lang}] loaded: ${dictionaries[lang]!.size} words`);
      return;
    }
  } catch {
    // fall through
  }
  console.warn(`No dictionary for [${lang}] at server/data/${filename}`);
  dictionaries[lang] = null;
}

export function loadDictionary(): void {
  loadDict('en', 'dictionary-en.txt');
  loadDict('fr', 'dictionary-fr.txt');

  // Legacy fallback
  if (!dictionaries.en) {
    const legacy = path.join(__dirname, '../data/dictionary.txt');
    if (fs.existsSync(legacy)) {
      const words = fs
        .readFileSync(legacy, 'utf-8')
        .split(/\r?\n/)
        .map((w) => w.trim().toUpperCase())
        .filter((w) => w.length >= 2 && /^[A-Z]+$/.test(w));
      dictionaries.en = new Set(words);
      console.log(`Dictionary [en] loaded from legacy: ${dictionaries.en.size} words`);
    }
  }
}

export function isValidWord(word: string, lang: string = 'en'): boolean {
  const dict = dictionaries[lang];
  if (!dict) {
    console.error(`[dictionary] No dictionary loaded for "${lang}" — rejecting word "${word}"`);
    return false;
  }
  return dict.has(word.toUpperCase());
}

/** Returns the full word set for a language (used by AI). */
export function getWordSet(lang: string = 'en'): Set<string> | null {
  return dictionaries[lang] ?? null;
}
