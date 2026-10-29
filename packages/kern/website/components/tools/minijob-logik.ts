/** Reine Logik des Minijob-Rechners. */

/**
 * Rechengrößen. Geringfügigkeitsgrenze = Mindestlohn × 130 ÷ 3, auf volle Euro aufgerundet (§ 8 Abs. 1a SGB IV).
 * 2027: Mindestlohn 14,60 € (Fünfte Mindestlohnanpassungsverordnung), Grenze 633 € laut Minijob-Zentrale
 * (magazin.minijob-zentrale.de/minijob-mindestlohn-2026-2027, abgerufen 04.10.2026).
 */
export const STAND = {
  2026: { mindestlohn: 13.9, grenze: 603 },
  2027: { mindestlohn: 14.6, grenze: 633 },
} as const;
export const MIDIJOB_OBERGRENZE = 2000;
export const WOCHEN_PRO_MONAT = 4.33;

export type Jahr = 2026 | 2027;
export type Basis = "monat" | "woche";

/**
 * Arbeitgeberabgaben im gewerblichen Minijob, Sätze 2026 laut Minijob-Zentrale (zusammen höchstens 31,17 %,
 * minijob-zentrale.de/DE/fuer-gewerbetreibende/abgaben-und-steuern, abgerufen 12.10.2026). Unfallversicherung fehlt,
 * ihr Satz hängt von der Berufsgenossenschaft ab. Ab 2027 steigt die KV-Pauschale (GKV-Beitragssatzstabilisierungsgesetz).
 */
const ABGABEN_2026 = [
  { name: "Krankenversicherung", satz: 0.13, nurGesetzlich: true },
  { name: "Rentenversicherung", satz: 0.15 },
  { name: "Pauschsteuer", satz: 0.02, nurPauschsteuer: true },
  { name: "Umlage U1 (Krankheit)", satz: 0.008 },
  { name: "Umlage U2 (Mutterschaft)", satz: 0.0022 },
  { name: "Insolvenzgeldumlage", satz: 0.0015 },
];

const cent = (x: number) => Math.round(x * 100) / 100;

export function abgabenArbeitgeber(entgelt: number, { gesetzlichVersichert, pauschsteuer }: { gesetzlichVersichert: boolean; pauschsteuer: boolean }) {
  const posten = ABGABEN_2026
    .filter((a) => (!a.nurGesetzlich || gesetzlichVersichert) && (!a.nurPauschsteuer || pauschsteuer))
    .map((a) => ({ name: a.name, satz: a.satz, betrag: cent(entgelt * a.satz) }));
  const summe = cent(posten.reduce((s, p) => s + p.betrag, 0));
  return { posten, summe, gesamtkosten: cent(entgelt + summe) };
}

export function berechneMinijob(lohn: number, stunden: number | null, basis: Basis, jahr: Jahr, einmal: number) {
  const s = STAND[jahr];
  const maxMonat = Math.floor((s.grenze / lohn) * 100) / 100;
  const maxWoche = Math.floor((maxMonat / WOCHEN_PRO_MONAT) * 100) / 100;
  const monatsStunden = stunden === null ? null : basis === "monat" ? stunden : stunden * WOCHEN_PRO_MONAT;
  const monatsEntgelt = monatsStunden === null ? null : Math.round(monatsStunden * lohn * 100) / 100;
  const jahresEntgelt = monatsEntgelt === null ? null : Math.round((monatsEntgelt * 12 + einmal) * 100) / 100;
  const jahresGrenze = s.grenze * 12;
  // Spielraum für Einmalzahlungen bei den geplanten Stunden
  const spielraum = monatsEntgelt === null ? null : Math.round((jahresGrenze - monatsEntgelt * 12) * 100) / 100;
  return {
    ...s, jahresGrenze, maxMonat, maxWoche, monatsStunden, monatsEntgelt, jahresEntgelt, spielraum,
    unterMindestlohn: lohn < s.mindestlohn,
    differenz: Math.round((s.mindestlohn - lohn) * 100) / 100,
    imMinijob: jahresEntgelt === null ? null : jahresEntgelt <= jahresGrenze,
    /** Warum kein Minijob: schon der Monat liegt über der Grenze, oder erst das Jahr mit Einmalzahlungen */
    grund: jahresEntgelt === null || jahresEntgelt <= jahresGrenze ? null : monatsEntgelt! > s.grenze ? ("monat" as const) : ("jahr" as const),
  };
}

/**
 * Weiche Hinweise und Tippfehler (UX-Review 28.10.2026, C9). "14 50" liest parseNum als 1450,
 * deshalb fängt die Oberfläche Leerzeichen zwischen Ziffern vorher ab.
 */
export const zifferMitLeerzeichen = (s: string) => /\d\s+\d/.test(s.trim());

export function plausiMinijob(stunden: number | null, einmal: number, jahr: Jahr) {
  return {
    stunden: stunden === 0 ? "0 Stunden: Stimmt das? Dann verdient die Person nichts." : undefined,
    einmal: einmal > STAND[jahr].grenze * 12 ? `Stimmt das? Das ist mehr als die ganze Jahresgrenze von ${(STAND[jahr].grenze * 12).toLocaleString("de-DE")} €.` : undefined,
  };
}
