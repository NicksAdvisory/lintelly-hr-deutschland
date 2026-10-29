/** Reine Logik des BEM-Rechners (§ 167 Abs. 2 SGB IX). */
import { addMonthsDay } from "./datum";

export type Periode = { id: number; von: string; bis: string };
export const TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
/** JS getUTCDay: 0 = Sonntag. Index in TAGE: Mo = 0 */
const wd = (n: number) => (new Date(n * 86_400_000).getUTCDay() + 6) % 7;

export type BemErgebnis = {
  fensterVon: number;
  fensterBis: number;
  kalendertage: number;
  arbeitstage: number;
  schwelleArbeitstage: number;
  ueberKalender: boolean;
  ueberArbeit: boolean;
  /** Tag, an dem die Grenze (aktuell durchgehend) zuletzt überschritten wurde; null, wenn sie am Stichtag nicht überschritten ist */
  erstmalsKalender: number | null;
  erstmalsArbeit: number | null;
  /** AU-Tage im Fenster, sortiert */
  tage: number[];
};

/** Alle AU-Tage (dedupliziert) bis einschließlich Stichtag. Offenes Ende = bis Stichtag. */
export function auTage(perioden: { von: number; bis: number | null }[], stichtag: number): number[] {
  const set = new Set<number>();
  for (const p of perioden) {
    const bis = Math.min(p.bis ?? stichtag, stichtag);
    for (let d = p.von; d <= bis; d++) set.add(d);
  }
  return [...set].sort((a, b) => a - b);
}

export function berechneBem(perioden: { von: number; bis: number | null }[], stichtag: number, arbeitstage: boolean[]): BemErgebnis {
  const alle = auTage(perioden, stichtag);
  const fensterVon = addMonthsDay(stichtag, -12) + 1;
  const tage = alle.filter((d) => d >= fensterVon);
  const istArbeit = (d: number) => arbeitstage[wd(d)];
  const proWoche = arbeitstage.filter(Boolean).length;
  const schwelleArbeitstage = 6 * proWoche;
  const kalendertage = tage.length;
  const at = tage.filter(istArbeit).length;

  // Rollierend: Status für jeden Kalendertag über Präfixsummen. Gesucht ist der letzte Wechsel von "unter" auf "über" bis zum Stichtag.
  let erstmalsKalender: number | null = null;
  let erstmalsArbeit: number | null = null;
  if (alle.length) {
    const lo = alle[0];
    const len = stichtag - lo + 1;
    const pk = new Int32Array(len + 1);
    const pa = new Int32Array(len + 1);
    const au = new Set(alle);
    for (let i = 0; i < len; i++) {
      const d = lo + i;
      const krank = au.has(d) ? 1 : 0;
      pk[i + 1] = pk[i] + krank;
      pa[i + 1] = pa[i] + (krank && istArbeit(d) ? 1 : 0);
    }
    let vorK = false, vorA = false;
    for (let i = 0; i < len; i++) {
      const d = lo + i;
      const s = Math.max(0, addMonthsDay(d, -12) + 1 - lo);
      const k = pk[i + 1] - pk[s];
      const a = pa[i + 1] - pa[s];
      const nk = k > 42, na = proWoche > 0 && a > schwelleArbeitstage;
      if (nk && !vorK) erstmalsKalender = d;
      if (na && !vorA) erstmalsArbeit = d;
      vorK = nk;
      vorA = na;
    }
    if (!vorK) erstmalsKalender = null;
    if (!vorA) erstmalsArbeit = null;
  }
  return {
    fensterVon,
    fensterBis: stichtag,
    kalendertage,
    arbeitstage: at,
    schwelleArbeitstage,
    ueberKalender: kalendertage > 42,
    ueberArbeit: proWoche > 0 && at > schwelleArbeitstage,
    erstmalsKalender,
    erstmalsArbeit,
    tage,
  };
}

/** Abstand zur Grenze, die näher liegt: "noch 1 Arbeitstag" oder "noch 13 Kalendertage". */
export function abstandText(r: BemErgebnis): string {
  const k = Math.max(0, 43 - r.kalendertage);
  const a = r.schwelleArbeitstage > 0 ? Math.max(0, r.schwelleArbeitstage + 1 - r.arbeitstage) : Infinity;
  return a < k ? `noch ${a} ${a === 1 ? "Arbeitstag" : "Arbeitstage"}` : `noch ${k} ${k === 1 ? "Kalendertag" : "Kalendertage"}`;
}

/** Warum es noch kein Ergebnis gibt. Der echte Grund statt immer "Noch keine Zeiten". */
export function leerGrund(o: { stichtagOk: boolean; proWoche: number; gueltig: number; fehler: string[] }): { titel: string; text: string } {
  if (!o.stichtagOk) return { titel: "Stichtag fehlt", text: "Trag einen gültigen Stichtag ein. Gezählt werden die 12 Monate davor." };
  if (o.proWoche === 0) return { titel: "Keine Arbeitstage", text: "Wähle mindestens einen Arbeitstag der Person." };
  if (o.gueltig === 0 && o.fehler.length) return { titel: "Angaben prüfen", text: o.fehler.join(" ") };
  return { titel: "Noch keine Zeiten", text: "Trag mindestens einen Zeitraum der Arbeitsunfähigkeit ein. Das Ergebnis erscheint sofort." };
}

/**
 * Stichtag in der Zukunft und ein Zeitraum ohne Ende (UX-Review 28.10.2026): Der Rechner zählt den offenen Zeitraum
 * bis zum Stichtag weiter. Das ist eine Hochrechnung, kein Ist-Stand. Tage als Zahl wie in toDay.
 */
export const hochrechnung = (perioden: { von: number; bis: number | null }[], stichtag: number, heute: number) =>
  stichtag > heute && perioden.some((p) => p.bis === null && p.von <= stichtag);
