/** Reine Logik des Ausgleichsabgabe-Rechners (§ 160 SGB IX). */
import { parseNum } from "./format";

/* ---------- Rechengrößen ---------- */

export type Saetze = {
  regel: { q3: number; q2: number; q0plus: number; q0: number };
  unter40: { unter1: number; null: number };
  unter60: { unter2: number; unter1: number; null: number };
  quelle: string;
};

/**
 * Beträge je unbesetztem Pflichtarbeitsplatz und Monat, § 160 Abs. 2 SGB IX.
 * 2024: Gesetzestext. Ab 01.01.2025: Bekanntmachung nach § 160 Abs. 3 SGB IX (BAnz AT 11.12.2024 B2),
 * gilt unverändert für 2026, bis eine neue Bekanntmachung erscheint. Geprüft am 04.10.2026.
 */
export const SAETZE: Record<number, Saetze> = {
  2024: {
    regel: { q3: 140, q2: 245, q0plus: 360, q0: 720 },
    unter40: { unter1: 140, null: 210 },
    unter60: { unter2: 140, unter1: 245, null: 410 },
    quelle: "§ 160 Abs. 2 SGB IX in der Fassung ab 01.01.2024",
  },
  2025: {
    regel: { q3: 155, q2: 275, q0plus: 405, q0: 815 },
    unter40: { unter1: 155, null: 235 },
    unter60: { unter2: 155, unter1: 275, null: 465 },
    quelle: "Bekanntmachung zu § 160 Abs. 3 SGB IX, gültig ab 01.01.2025",
  },
  2026: {
    regel: { q3: 155, q2: 275, q0plus: 405, q0: 815 },
    unter40: { unter1: 155, null: 235 },
    unter60: { unter2: 155, unter1: 275, null: 465 },
    quelle: "Bekanntmachung zu § 160 Abs. 3 SGB IX, gültig ab 01.01.2025 (für 2026 keine neue Anpassung bekannt, Stand 04.10.2026)",
  },
};

export const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/* ---------- reine Logik ---------- */

/**
 * Monatstabelle lesen (UX-Review 28.10.2026): Ein leeres Feld zählt nicht still als 0, es ist der Fehler "Monat fehlt".
 * fehler hat Schlüssel wie "ap0" (Plätze Januar) oder "b11" (Schwerbehinderte Dezember).
 */
export function leseMonate(apM: string[], bM: string[]) {
  const fehler: Record<string, string> = {};
  const lies = (art: "ap" | "b") => (x: string, i: number) => {
    const n = parseNum(x);
    if (!x.trim()) fehler[art + i] = "Monat fehlt";
    else if (n === null || n < 0 || !Number.isInteger(n)) fehler[art + i] = "Ganze Zahl ab 0";
    return n ?? 0;
  };
  return { ap: apM.map(lies("ap")), b: bM.map(lies("b")), fehler };
}

export const roundHalfUp = (x: number) => Math.floor(x + 0.5 + 1e-9);

export type Ergebnis = {
  avgAP: number;
  avgB: number;
  pflichtig: boolean;
  gruppe: "unter20" | "unter40" | "unter60" | "regel";
  pflichtJeMonat: number[];
  sumP: number;
  sumB: number;
  unbesetzt: number;
  quote: number;
  satz: number;
  stufe: string;
  abgabe: number;
};

export function berechne(ap: number[], b: number[], jahr: number): Ergebnis {
  const s = SAETZE[jahr];
  const sumAP = ap.reduce((x, y) => x + y, 0);
  const sumB = b.reduce((x, y) => x + y, 0);
  const avgAP = sumAP / 12;
  const avgB = sumB / 12;
  const quote = sumAP > 0 ? (sumB / sumAP) * 100 : 0;
  const leer = { avgAP, avgB, sumB, quote, pflichtJeMonat: ap.map(() => 0), sumP: 0, unbesetzt: 0, satz: 0, abgabe: 0 };
  if (avgAP < 20) return { ...leer, pflichtig: false, gruppe: "unter20", stufe: "Keine Beschäftigungspflicht" };

  let gruppe: Ergebnis["gruppe"];
  let pflichtJeMonat: number[];
  if (avgAP < 40) {
    gruppe = "unter40";
    pflichtJeMonat = ap.map(() => 1);
  } else if (avgAP < 60) {
    gruppe = "unter60";
    pflichtJeMonat = ap.map(() => 2);
  } else {
    gruppe = "regel";
    pflichtJeMonat = ap.map((x) => roundHalfUp(x * 0.05));
  }
  const sumP = pflichtJeMonat.reduce((x, y) => x + y, 0);
  const unbesetzt = Math.max(0, sumP - sumB);

  let satz = 0;
  let stufe = "";
  if (gruppe === "unter40") {
    if (avgB >= 1) stufe = "Pflicht im Jahresdurchschnitt erfüllt";
    else if (sumB === 0) [satz, stufe] = [s.unter40.null, "Unter 40 Arbeitsplätze, niemand beschäftigt"];
    else [satz, stufe] = [s.unter40.unter1, "Unter 40 Arbeitsplätze, im Schnitt weniger als 1 Person"];
  } else if (gruppe === "unter60") {
    if (avgB >= 2) stufe = "Pflicht im Jahresdurchschnitt erfüllt";
    else if (sumB === 0) [satz, stufe] = [s.unter60.null, "Unter 60 Arbeitsplätze, niemand beschäftigt"];
    else if (avgB < 1) [satz, stufe] = [s.unter60.unter1, "Unter 60 Arbeitsplätze, im Schnitt weniger als 1 Person"];
    else [satz, stufe] = [s.unter60.unter2, "Unter 60 Arbeitsplätze, im Schnitt weniger als 2 Personen"];
  } else {
    if (quote >= 5) stufe = "Quote von 5 Prozent erreicht";
    else if (quote >= 3) [satz, stufe] = [s.regel.q3, "Quote 3 bis unter 5 Prozent"];
    else if (quote >= 2) [satz, stufe] = [s.regel.q2, "Quote 2 bis unter 3 Prozent"];
    else if (quote > 0) [satz, stufe] = [s.regel.q0plus, "Quote über 0 bis unter 2 Prozent"];
    else [satz, stufe] = [s.regel.q0, "Quote 0 Prozent"];
  }
  const abgabe = satz > 0 ? unbesetzt * satz : 0;
  return { avgAP, avgB, pflichtig: true, gruppe, pflichtJeMonat, sumP, sumB, unbesetzt: satz > 0 ? unbesetzt : 0, quote, satz, stufe, abgabe };
}

/**
 * Besetzung in Alltagssprache (UX-Review 28.10.2026): "0,08 im Jahresdurchschnitt" versteht niemand,
 * "1 Person in 1 von 12 Monaten" schon. Nur wenn alle besetzten Monate gleich viele Personen haben.
 */
export function besetztText(b: number[]): string {
  const voll = b.filter((x) => x > 0);
  const z = (n: number) => `${n} ${n === 1 ? "Person" : "Personen"}`;
  if (!voll.length) return "niemand";
  if (voll.every((x) => x === voll[0])) return voll.length === b.length ? `${z(voll[0])} in jedem Monat` : `${z(voll[0])} in ${voll.length} von ${b.length} Monaten`;
  const sum = b.reduce((x, y) => x + y, 0);
  return `im Schnitt ${(sum / b.length).toLocaleString("de-DE", { maximumFractionDigits: 2 })} Personen je Monat`;
}

/** Plausibilität (C9): Monate (Index), in denen mehr Schwerbehinderte als Arbeitsplätze eingetragen sind. */
export const mehrAlsPlaetze = (ap: number[], b: number[]) => b.flatMap((x, i) => (x > ap[i] ? [i] : []));
