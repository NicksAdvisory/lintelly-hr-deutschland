/**
 * Englische Fassung der Dokumente (Zweisprachigkeit, Nick 23.10.2026): Datum, Beträge und Zahlwörter auf Englisch und die Markierung
 * freier Eingaben. Feste englische Texte stehen bei der Vorlage oder beim Baustein selbst; nur was ein Mensch frei eingetippt hat,
 * kommt mit `frei()` markiert in den englischen Text und wird später von der KI übersetzt (lib/dokumente/sprachfassung.ts).
 * Maßgeblich bleibt immer der deutsche Text. Rein, ohne Datenbank.
 */
import type { ISODate } from "@/lib/regeln/datum";

const MONATE = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-11-01" ergibt "1 November 2026" (britische Schreibweise, ohne Verwechslung von Tag und Monat). */
export function datumEn(d: ISODate | string): string {
  const [y, m, t] = d.slice(0, 10).split("-").map(Number);
  return `${t} ${MONATE[m - 1]} ${y}`;
}

/** 4500.5 ergibt "EUR 4,500.50". */
export const euroEn = (n: number) => `EUR ${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Zahl englisch ohne Einheit: 2.5 ergibt "2.5", 1200 ergibt "1,200". */
export const zahlEn = (n: number, stellen = 2) => n.toLocaleString("en-GB", { maximumFractionDigits: stellen });

const ZAHLWORTE = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
/** Zahl als Wort bis zwölf ("three"), darüber als Ziffer. */
export const zahlwortEn = (n: number): string => ZAHLWORTE[n] ?? zahlEn(n);
/** "1 month", "6 months", "2.5 days". */
export const anzahlEn = (n: number, einzahl: string, mehrzahl: string) => `${zahlEn(n)} ${n === 1 ? einzahl : mehrzahl}`;
/** Frist in Worten: 14 ergibt "two weeks", 3 ergibt "three days". */
export const fristWortEn = (tage: number) => (tage % 7 === 0 ? (tage === 7 ? "one week" : `${zahlwortEn(tage / 7)} weeks`) : tage === 1 ? "one day" : `${zahlwortEn(tage)} days`);
/** "one month", "three months". */
export const monateWortEn = (n: number) => (n === 1 ? "one month" : `${zahlwortEn(n)} months`);
/** "one year", "two years". */
export const jahreWortEn = (n: number) => (n === 1 ? "one year" : `${zahlwortEn(n)} years`);

/** Klammern um freie Eingaben im englischen Text. Kommen in festen Texten nicht vor. */
export const FREI_AUF = "⟦";
export const FREI_ZU = "⟧";
const FREI = /⟦([\s\S]*?)⟧/g;

/**
 * Freie Eingabe (deutsch getippt) im englischen Text: wird markiert und später übersetzt. Leer bleibt leer.
 * Nicht für Namen, Anschriften, Zahlen und Daten: die bleiben, wie sie sind.
 */
export const frei = (s: string | undefined | null): string => {
  const t = (s ?? "").trim();
  return t ? `${FREI_AUF}${t}${FREI_ZU}` : "";
};

/** Alle freien Eingaben eines Textes in der Reihenfolge ihres Vorkommens. */
export const freieStellen = (t: string): string[] => [...t.matchAll(FREI)].map((m) => m[1]);

/** Ersetzt jede freie Eingabe über `ersetze` (Übersetzung oder Originaltext ohne Klammern). */
export const ersetzeFrei = (t: string, ersetze: (deutsch: string) => string): string => t.replace(FREI, (_, de: string) => ersetze(de));
