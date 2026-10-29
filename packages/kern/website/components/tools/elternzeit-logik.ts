/** Reine Logik des Elternzeit-Fristenrechners (§§ 15 bis 18 BEEG). */
import { addMonthsDay, addYearsDay, fmtDay, partsDay, toDay } from "./datum";
import { nachfristTage } from "./mutterschutz-logik";
import { plural } from "./format";

export type EzEingabe = {
  geburt: number;
  /** errechneter Termin, falls das Kind früher kam (verlängert den Mutterschutz) */
  et: number | null;
  elternteil: "mutter" | "anderer";
  mutterschutz12: boolean;
  beginn: number;
  ende: number;
  zugang: number | null;
  teilzeit: boolean;
  urlaub: number | null;
  /** heutiger Tag, für den Hinweis auf eine schon verpasste Antragsfrist */
  heute?: number;
};

export type Abschnitt = { von: number; bis: number; ab3: boolean; fristWochen: 7 | 13; spaetesterZugang: number; schutzFruehestens: number };

export type EzErgebnis = {
  dritterGeb: number;
  achterGeb: number;
  mutterschutzEnde: number | null;
  fruehesterBeginn: number;
  abschnitte: Abschnitt[];
  spaetesterZugang: number;
  schutzAb: number | null;
  zuSpaet: boolean;
  fruehesterBeginnBeiZugang: number | null;
  /** Ohne eingetragenen Antrag: Die Frist für den sicher rechtzeitigen Antrag liegt vor heute */
  fristVorbei: boolean;
  /** Geht der Antrag heute zu, beginnt die Elternzeit ohne Einigung frühestens an diesem Tag */
  fruehesterBeginnAbHeute: number | null;
  monateGesamt: { monate: number; tage: number };
  kuerzung: { jahr: number; monate: number; tage: number }[];
  fehler: string[];
  warnungen: string[];
};

/** Dauer als Text: "1 Tag", "1 Monat", "12 Monate, 3 Tage" */
export function dauerText(d: { monate: number; tage: number }) {
  return [d.monate ? plural(d.monate, "Monat", "Monate") : "", d.tage ? plural(d.tage, "Tag", "Tage") : ""].filter(Boolean).join(", ") || "0 Tage";
}

export const volleMonateText = (n: number) => (n === 1 ? "1 voller Monat" : `${n} volle Monate`);

/** volle Monate und Resttage zwischen a und b (b inklusive) */
export function dauer(a: number, b: number) {
  let m = 0;
  while (addMonthsDay(a, m + 1) - 1 <= b) m++;
  const rest = b - (addMonthsDay(a, m) - 1);
  return { monate: m, tage: rest };
}

/** volle Kalendermonate (1. bis Monatsletzter) innerhalb [a, b], nach Jahr gruppiert */
export function volleKalendermonate(a: number, b: number): Map<number, number> {
  const out = new Map<number, number>();
  let { y, m } = partsDay(a);
  for (;;) {
    const erster = Math.round(Date.UTC(y, m, 1) / 86_400_000);
    const letzter = Math.round(Date.UTC(y, m + 1, 0) / 86_400_000);
    if (erster > b) break;
    if (erster >= a && letzter <= b) out.set(y, (out.get(y) ?? 0) + 1);
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return out;
}

export function berechneElternzeit(e: EzEingabe): EzErgebnis {
  const fehler: string[] = [];
  const warnungen: string[] = [];
  const dritterGeb = addYearsDay(e.geburt, 3);
  const achterGeb = addYearsDay(e.geburt, 8);
  // § 3 Abs. 2 MuSchG: 8 bzw. 12 Wochen nach der Entbindung, bei Geburt vor dem Termin verlängert (Satz 3)
  const mutterschutzEnde = e.elternteil === "mutter" ? e.geburt + nachfristTage(e.mutterschutz12, e.et === null ? 0 : e.et - e.geburt) : null;
  const fruehesterBeginn = mutterschutzEnde !== null ? mutterschutzEnde + 1 : e.geburt;

  if (e.ende < e.beginn) fehler.push("Das Ende liegt vor dem Beginn.");
  if (e.ende >= achterGeb) fehler.push(`Elternzeit ist nur bis zum Tag vor dem 8. Geburtstag möglich, also bis ${fmtDay(achterGeb - 1)}.`);
  if (e.beginn < e.geburt) fehler.push("Elternzeit beginnt frühestens am Tag der Geburt.");
  else if (e.beginn < fruehesterBeginn)
    warnungen.push(`Bis ${fmtDay(mutterschutzEnde!)} läuft die Mutterschutzfrist nach der Geburt. Elternzeit schließt meist am ${fmtDay(fruehesterBeginn)} an. Die Mutterschutzfrist wird auf die drei Jahre angerechnet (§ 15 Abs. 2 BEEG).`);

  // § 15 Abs. 2 BEEG: insgesamt höchstens 3 Jahre je Elternteil. Bei der Mutter wird die Mutterschutzfrist
  // nach der Geburt angerechnet, soweit sie vor dem Beginn der Elternzeit liegt.
  if (!fehler.length) {
    const msTage = mutterschutzEnde !== null ? Math.max(0, Math.min(mutterschutzEnde, e.beginn - 1) - e.geburt) : 0;
    const d0 = partsDay(e.beginn);
    const zielLetzter = partsDay(Math.round(Date.UTC(d0.y, d0.m + 37, 0) / 86_400_000)).d;
    const dreiJahreEnde = d0.d > zielLetzter ? Math.round(Date.UTC(d0.y, d0.m + 36, zielLetzter) / 86_400_000) : Math.round(Date.UTC(d0.y, d0.m + 36, d0.d) / 86_400_000) - 1;
    const maxEnde = dreiJahreEnde - msTage;
    if (e.ende > maxEnde) fehler.push(`Insgesamt sind höchstens 3 Jahre Elternzeit je Elternteil möglich (§ 15 Abs. 2 BEEG)${msTage ? ", die Mutterschutzfrist nach der Geburt wird angerechnet" : ""}. Ab ${fmtDay(e.beginn)} reicht das bis ${fmtDay(maxEnde)}.`);
  }

  const abschnitte: Abschnitt[] = [];
  if (!fehler.length) {
    if (e.beginn < dritterGeb) {
      const bis = Math.min(e.ende, dritterGeb - 1);
      abschnitte.push({ von: e.beginn, bis, ab3: false, fristWochen: 7, spaetesterZugang: e.beginn - 7 * 7 - 1, schutzFruehestens: e.beginn - 8 * 7 });
    }
    if (e.ende >= dritterGeb) {
      const von = Math.max(e.beginn, dritterGeb);
      abschnitte.push({ von, bis: e.ende, ab3: true, fristWochen: 13, spaetesterZugang: von - 13 * 7 - 1, schutzFruehestens: von - 14 * 7 });
      if (e.ende > addMonthsDay(von, 24) - 1) fehler.push(`Zwischen 3. und 8. Geburtstag sind höchstens 24 Monate möglich. Ab ${fmtDay(von)} reicht das bis ${fmtDay(addMonthsDay(von, 24) - 1)}.`);
    }
  }

  const spaetesterZugang = abschnitte.length ? Math.min(...abschnitte.map((a) => a.spaetesterZugang)) : e.beginn - 50;
  const ersterSchutz = abschnitte.length ? abschnitte[0].schutzFruehestens : e.beginn - 56;
  const zuSpaet = e.zugang !== null && abschnitte.length > 0 && e.zugang > abschnitte[0].spaetesterZugang;
  const fruehesterBeginnBeiZugang = e.zugang !== null ? e.zugang + (abschnitte[0]?.fristWochen ?? 7) * 7 + 1 : null;
  const fristVorbei = e.zugang === null && e.heute !== undefined && abschnitte.length > 0 && e.heute > abschnitte[0].spaetesterZugang;
  const fruehesterBeginnAbHeute = fristVorbei ? e.heute! + abschnitte[0].fristWochen * 7 + 1 : null;
  const schutzAb = e.zugang !== null ? Math.max(e.zugang, ersterSchutz) : null;

  if (e.zugang !== null && e.zugang > e.beginn) warnungen.push("Der Antrag ist erst nach dem gewünschten Beginn eingegangen.");

  // Urlaubskürzung § 17 Abs. 1 BEEG: 1/12 je vollem Kalendermonat, nicht bei Teilzeit beim selben Arbeitgeber
  const kuerzung: EzErgebnis["kuerzung"] = [];
  if (!fehler.length && !e.teilzeit) {
    for (const [jahr, monate] of volleKalendermonate(e.beginn, e.ende)) kuerzung.push({ jahr, monate, tage: e.urlaub ? (e.urlaub * monate) / 12 : 0 });
  }

  return {
    dritterGeb,
    achterGeb,
    mutterschutzEnde,
    fruehesterBeginn,
    abschnitte,
    spaetesterZugang,
    schutzAb,
    zuSpaet,
    fruehesterBeginnBeiZugang,
    fristVorbei,
    fruehesterBeginnAbHeute,
    monateGesamt: fehler.length ? { monate: 0, tage: 0 } : dauer(e.beginn, e.ende),
    kuerzung,
    fehler,
    warnungen,
  };
}

/** Textform für Elternzeit-Anträge gilt für Geburten ab dem 01.05.2025 (BEG IV). */
export const TEXTFORM_AB = toDay("2025-05-01");
