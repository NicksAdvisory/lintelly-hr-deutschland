/** Reine Logik des Entgeltfortzahlungs-Rechners (§ 3 EFZG). */
import { addDays, diffDays, fmt, periodEnd } from "./datum";

export const BUDGET = 42; // 6 Wochen = 42 Kalendertage (§ 3 Abs. 1 EFZG)

export type Zeile = { key: number; von: string; bis: string; ursache: string; unsicher: boolean; angefangen: boolean };
export type Periode = { nr: number; von: Date; bis: Date; gruppe: number; angefangen: boolean };

export type FallErgebnis = {
  nrs: number[];
  von: Date;
  bis: Date;
  gruppe: number;
  zaehlStart: Date;
  bezahlt: number;
  efzVon: Date | null;
  efzBis: Date | null;
  kgAb: Date | null;
  /** Krankengeld der Krankenkasse für die Tage in der Wartezeit */
  kgWartezeit: { von: Date; bis: Date } | null;
  rest: number;
  neuerAnspruch: boolean;
  grund: string;
  wartezeitTage: number;
  zusammengefasst: boolean;
  direktAnschluss: boolean;
  naechsterVoll: Date | null;
  sechsMonateAb: Date | null;
};

/** Liegt zwischen dem Ende der einen und dem Beginn der nächsten AU kein Werktag von Montag bis Freitag? */
function ohneArbeitstag(bis: Date, von: Date): boolean {
  for (let d = addDays(bis, 1); d < von; d = addDays(d, 1)) if (d.getUTCDay() % 6 !== 0) return false;
  return true;
}

/** Reine Berechnung der Entgeltfortzahlung nach § 3 EFZG. Perioden müssen zeitlich sortiert sein. */
export function berechneEfz(beginn: Date, perioden: Periode[]): FallErgebnis[] {
  const anspruchAb = addDays(beginn, 28); // Wartezeit 4 Wochen (§ 3 Abs. 3 EFZG)
  // 1. Einheit des Verhinderungsfalls: Überschneidende Zeiträume bilden einen Fall. Eine neue AU direkt im Anschluss,
  // ohne Arbeitstag dazwischen (nur Samstag und Sonntag, Feiertage kennt der Rechner nicht), ebenfalls. Dann vermutet das BAG, dass die erste noch andauerte (11.12.2019, 5 AZR 505/18).
  type Fall = { nrs: number[]; von: Date; bis: Date; gruppe: number; angefangen: boolean; zusammengefasst: boolean; direktAnschluss: boolean };
  const faelle: Fall[] = [];
  for (const p of perioden) {
    const last = faelle[faelle.length - 1];
    if (last && ohneArbeitstag(last.bis, p.von)) {
      last.nrs.push(p.nr);
      if (p.von <= last.bis) last.zusammengefasst = true;
      else last.direktAnschluss = true;
      if (p.bis > last.bis) last.bis = p.bis;
    } else {
      faelle.push({ nrs: [p.nr], von: p.von, bis: p.bis, gruppe: p.gruppe, angefangen: p.angefangen, zusammengefasst: false, direktAnschluss: false });
    }
  }
  // 2. Fortsetzungserkrankung je Ursache: Ketten mit 42-Tage-Budget
  const ketten = new Map<number, { start: Date; letztesEnde: Date; verbraucht: number }>();
  return faelle.map((f) => {
    let kette = ketten.get(f.gruppe);
    let neuerAnspruch = false;
    let grund = "";
    if (!kette) {
      kette = { start: f.von, letztesEnde: f.bis, verbraucht: 0 };
      ketten.set(f.gruppe, kette);
      neuerAnspruch = true;
      grund = "Erste Arbeitsunfähigkeit wegen dieser Erkrankung.";
    } else {
      const zwoelf = addDays(periodEnd(kette.start, 12), 1);
      const sechs = addDays(periodEnd(addDays(kette.letztesEnde, 1), 6), 1);
      if (f.von >= zwoelf) {
        grund = `Seit Beginn der ersten Arbeitsunfähigkeit wegen dieser Erkrankung (${fmt(kette.start)}) sind 12 Monate abgelaufen: neuer Anspruch.`;
        kette.start = f.von;
        kette.verbraucht = 0;
        neuerAnspruch = true;
      } else if (f.von >= sechs) {
        grund = `Vorher mindestens 6 Monate ohne Arbeitsunfähigkeit wegen dieser Erkrankung: neuer Anspruch.`;
        kette.start = f.von;
        kette.verbraucht = 0;
        neuerAnspruch = true;
      } else {
        grund = `Fortsetzungserkrankung: Tage werden auf die 6 Wochen angerechnet (bisher ${kette.verbraucht} von 42 verbraucht).`;
      }
    }
    let zaehlStart = f.angefangen ? addDays(f.von, 1) : f.von;
    let wartezeitTage = 0;
    let kgWartezeit: FallErgebnis["kgWartezeit"] = null;
    if (zaehlStart < anspruchAb) {
      wartezeitTage = Math.max(0, Math.min(diffDays(zaehlStart, anspruchAb), diffDays(zaehlStart, f.bis) + 1));
      if (wartezeitTage > 0) kgWartezeit = { von: zaehlStart, bis: addDays(zaehlStart, wartezeitTage - 1) };
      zaehlStart = anspruchAb;
    }
    const verfuegbar = Math.max(0, BUDGET - kette.verbraucht);
    const auTage = zaehlStart > f.bis ? 0 : diffDays(zaehlStart, f.bis) + 1;
    const bezahlt = Math.min(verfuegbar, auTage);
    const efzVon = bezahlt > 0 ? zaehlStart : null;
    const efzBis = bezahlt > 0 ? addDays(zaehlStart, bezahlt - 1) : null;
    kette.verbraucht += bezahlt;
    kette.letztesEnde = f.bis;
    let kgAb: Date | null = null;
    if (efzBis && efzBis < f.bis) kgAb = addDays(efzBis, 1);
    else if (!efzBis && auTage > 0) kgAb = zaehlStart;
    // Tage in der Wartezeit: Krankengeld der Krankenkasse statt Entgeltfortzahlung (gesetzlich Versicherte)
    if (wartezeitTage > 0 && !efzVon) kgAb = f.angefangen ? addDays(f.von, 1) : f.von;
    return {
      nrs: f.nrs, von: f.von, bis: f.bis, gruppe: f.gruppe, zaehlStart, bezahlt, efzVon, efzBis, kgAb, kgWartezeit,
      rest: BUDGET - kette.verbraucht, neuerAnspruch, grund, wartezeitTage,
      zusammengefasst: f.zusammengefasst, direktAnschluss: f.direktAnschluss,
      naechsterVoll: addDays(periodEnd(kette.start, 12), 1),
      sechsMonateAb: addDays(periodEnd(addDays(f.bis, 1), 6), 1),
    };
  });
}

/** Wann die Krankenkasse Krankengeld zahlt, Wartezeit und Zeit nach den 6 Wochen zusammen. */
export function krankengeldText(f: FallErgebnis): string {
  const w = f.kgWartezeit;
  if (!w) return f.kgAb ? `ab ${fmt(f.kgAb)}` : "nicht nötig";
  // ohne Entgeltfortzahlung durchgehend Krankengeld
  if (!f.efzVon && f.bis > w.bis) return `ab ${fmt(w.von)}`;
  const t = `${fmt(w.von)} bis ${fmt(w.bis)} (Wartezeit)`;
  return f.efzVon && f.kgAb ? `${t}, wieder ab ${fmt(f.kgAb)}` : t;
}

/** Text zu "Wieder volle 6 Wochen", mit "seit" für Daten, die schon vorbei sind. */
export function wiederVollText(f: FallErgebnis, heute: Date): string {
  const zwoelf = f.naechsterVoll!;
  const sechs = f.sechsMonateAb && f.sechsMonateAb < zwoelf ? f.sechsMonateAb : null;
  if (zwoelf <= heute) return `Eine neue Arbeitsunfähigkeit wegen dieser Erkrankung bekommt wieder volle 6 Wochen: Seit dem ${fmt(zwoelf)} sind 12 Monate seit Beginn der ersten vergangen.`;
  if (sechs && sechs <= heute) return `Seit dem ${fmt(sechs)} bekommt eine neue Arbeitsunfähigkeit wegen dieser Erkrankung wieder volle 6 Wochen, wenn seit dem ${fmt(f.bis)} keine weitere dazukam. Sonst spätestens ab ${fmt(zwoelf)} (12 Monate nach Beginn der ersten).`;
  return `Spätestens bei einer neuen Arbeitsunfähigkeit ab ${fmt(zwoelf)} (12 Monate nach Beginn der ersten).${sechs ? ` Früher, wenn bis ${fmt(addDays(sechs, -1))} keine Arbeitsunfähigkeit wegen dieser Erkrankung dazukommt: dann ab ${fmt(sechs)}.` : ""}`;
}

/**
 * Plausibilität (UX-Review 28.10.2026, C9): Krankengeld gibt es wegen derselben Krankheit höchstens 78 Wochen
 * innerhalb von 3 Jahren (§ 48 Abs. 1 SGB V). Ein einzelner Fall darüber ist selten und oft ein Tippfehler im Jahr.
 */
export const ueber78Wochen = (faelle: FallErgebnis[]) => faelle.some((f) => diffDays(f.von, f.bis) + 1 > 78 * 7);
