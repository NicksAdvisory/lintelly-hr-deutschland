/**
 * Urlaubsanspruch nach BUrlG und § 208 SGB IX. Reine Funktionen, getestet in scripts/test-urlaub.mjs.
 * Neu gebaut 05.10.2026 (Nick: "Trennung gesetzlich und vertraglich fehlt. Halbe Arbeitstage zählen als voller Urlaubstag.").
 *
 * Grundsätze:
 * - Urlaub wird in Arbeitstagen gerechnet. Jeder Tag mit Arbeit zählt voll, auch ein kurzer Tag. Stunden spielen keine Rolle.
 * - Gesetzlicher Mindesturlaub (§ 3 BUrlG): 24 Werktage bei 6-Tage-Woche, also 4 × Arbeitstage pro Woche.
 * - Teilurlaub (§ 5 Abs. 1 BUrlG): 1/12 je vollem Monat.
 * - Rundung (Nick 05.10.2026: "immer aufrunden"): Jeder Bruchteil wird auf den nächsten vollen Tag aufgerundet,
 *   auch unter 0,5 und auch beim Jahresanspruch in Teilzeit (16,8 → 17). § 5 Abs. 2 BUrlG verlangt das nur ab
 *   einem halben Tag; kleinere Bruchteile rundet der Rechner freiwillig zugunsten der Mitarbeitenden auf.
 * - Mehrurlaub folgt ohne eigene Vertragsregel dem Gesetz (ein Teilurlaub auf den ganzen Jahresurlaub, einmal aufgerundet).
 *   Mit eigener Regel wird er getrennt anteilig gerechnet und ebenfalls aufgerundet.
 */
import { compare, daysInMonth, formatDE, iso, isISODate, parts, addDays, zeitraumEnde, type ISODate } from "../../lib/fristen";

export type MehrRegel = "wie-gesetz" | "anteilig";

export type UrlaubEingabe = {
  /** vertraglicher Jahresurlaub bei Vollzeit in Tagen der Bezugswoche */
  jahresurlaub: number;
  /** Bezugsgröße des Vertrags: 5-Tage-Woche (Arbeitstage) oder 6-Tage-Woche (Werktage) */
  bezug: 5 | 6;
  /** Arbeitstage pro Woche (jeder Tag mit Arbeit zählt voll; Durchschnitt nur bei wechselnden Wochen, z. B. 2,5) */
  tage: number;
  jahr: number;
  eintritt?: ISODate | null;
  austritt?: ISODate | null;
  /** Wechsel der Arbeitstage im Jahr */
  wechsel?: { ab: ISODate; tage: number } | null;
  schwerbehindert?: boolean;
  /** Schwerbehinderung erst ab diesem Datum im Jahr anerkannt */
  schwerbehindertAb?: ISODate | null;
  /** Regel des Vertrags für den Mehrurlaub bei Ein- oder Austritt im Jahr */
  mehrRegel?: MehrRegel;
};

export type Teil = {
  /** Anspruch bei ganzem Jahr in Arbeitstagen (ungerundet) */
  jahr: number;
  /** angesetzte Zwölftel (12 = ganzes Jahr) */
  zwoelftel: number;
  /** anteilig, vor Rundung */
  exakt: number;
  /** Anspruch nach Aufrundung auf volle Tage */
  wert: number;
};

export type UrlaubErgebnis = {
  gesamt: number;
  gesetzlich: Teil;
  mehr: Teil;
  zusatz: Teil | null;
  fall: "voll" | "teil-wartezeit" | "teil-vor-wartezeit" | "teil-erste-haelfte" | "voll-mehr-anteilig";
  tageEffektiv: number;
  /** Wartezeit-Ende, falls im Betrachtungsjahr relevant */
  wartezeitEnde: ISODate | null;
  rechenweg: string[];
  hinweise: { typ: "info" | "warnung"; text: string }[];
};

const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
const r2 = (x: number) => Math.round(x * 100) / 100;
const z = (n: number) => r2(n).toLocaleString("de-DE", { maximumFractionDigits: 2 });

/** Jeder Bruchteil wird auf den nächsten vollen Tag aufgerundet (0,49 → 1, 8,33 → 9, 12,5 → 13). */
export function rundeAuf(x: number): number {
  return Math.ceil(r6(x));
}

/**
 * Text zur Aufrundung für den Rechenweg. Ab einem halben Tag ist sie im Teilurlaub Pflicht (§ 5 Abs. 2 BUrlG),
 * darunter und beim Jahresanspruch freiwillig zugunsten der Mitarbeitenden.
 */
function aufText(exakt: number, wert: number, teilurlaub: boolean, vertraglich = false): string {
  const ex = r6(exakt);
  if (wert === ex) return "";
  const frac = r6(ex - Math.floor(ex));
  if (teilurlaub && frac >= 0.5)
    return vertraglich
      ? `, aufgerundet auf ${z(wert)} (wie § 5 Abs. 2 BUrlG ab einem halben Tag)`
      : `, aufgerundet auf ${z(wert)} (ab einem halben Tag Pflicht nach § 5 Abs. 2 BUrlG)`;
  return teilurlaub
    ? `, freiwillig aufgerundet auf ${z(wert)} (das Gesetz verlangt das erst ab einem halben Tag)`
    : `, freiwillig aufgerundet auf ${z(wert)} (das Gesetz schreibt hier keine Rundung vor)`;
}

/** Volle Monate des Bestehens ab `von` (Beginn zählt mit) bis einschließlich `bis`. */
export function volleMonate(von: ISODate, bis: ISODate): number {
  if (compare(bis, von) < 0) return 0;
  let k = 0;
  while (k < 24 && compare(zeitraumEnde(von, k + 1), bis) <= 0) k++;
  return k;
}

/**
 * Durchschnittliche Arbeitstage im Zeitraum bei einem Wechsel. Jeder Kalendertag wiegt 1/Tage des Monats,
 * damit ein Wechsel zum Monatsersten genau in Zwölfteln aufgeht (5 → 3 Tage ab 01.07. = 4 Tage im Schnitt).
 */
export function tageGewichtet(von: ISODate, bis: ISODate, tage1: number, ab: ISODate, tage2: number): number {
  let summe = 0, gewicht = 0;
  for (let d = von; compare(d, bis) <= 0; d = addDays(d, 1)) {
    const p = parts(d);
    const w = 1 / daysInMonth(p.y, p.m);
    summe += w * (compare(d, ab) < 0 ? tage1 : tage2);
    gewicht += w;
  }
  return gewicht ? r6(summe / gewicht) : tage1;
}

/** Fehlermeldung zum Datum des Wechsels, wenn es nicht im Beschäftigungszeitraum des Jahres liegt, sonst undefined. */
export function pruefeWechsel(ab: ISODate, jahr: number, eintritt: ISODate | null, austritt: ISODate | null): string | undefined {
  if (parts(ab).y !== jahr) return `Der Wechsel muss im Urlaubsjahr ${jahr} liegen.`;
  if (eintritt && compare(ab, eintritt) <= 0) return `Der Wechsel muss nach dem Eintritt am ${formatDE(eintritt)} liegen.`;
  if (austritt && compare(ab, austritt) > 0) return `Der Wechsel muss vor dem Austritt am ${formatDE(austritt)} liegen.`;
  if (compare(ab, iso(jahr, 1, 1)) === 0) return "Ein Wechsel zum 01.01. gilt fürs ganze Jahr. Trag die neuen Arbeitstage dann oben im Wochenplan ein.";
  return undefined;
}

export function berechneUrlaub(e: UrlaubEingabe): UrlaubErgebnis {
  const rechenweg: string[] = [];
  const hinweise: UrlaubErgebnis["hinweise"] = [];
  const mehrRegel: MehrRegel = e.mehrRegel ?? "wie-gesetz";
  if (!(e.tage > 0 && e.tage <= 6)) throw new Error("Arbeitstage pro Woche: mehr als 0 und höchstens 6.");
  if (!(e.jahresurlaub > 0)) throw new Error("Der Jahresurlaub fehlt.");

  const jStart = iso(e.jahr, 1, 1);
  const jEnde = iso(e.jahr, 12, 31);
  const halb = iso(e.jahr, 6, 30);
  const eintritt = e.eintritt && isISODate(e.eintritt) ? e.eintritt : null;
  const austritt = e.austritt && isISODate(e.austritt) ? e.austritt : null;
  if (eintritt && compare(eintritt, jEnde) > 0) throw new Error(`Der Eintritt liegt nach dem Jahr ${e.jahr}.`);
  if (austritt && compare(austritt, jStart) < 0) throw new Error(`Der Austritt liegt vor dem Jahr ${e.jahr}.`);
  if (eintritt && austritt && compare(austritt, eintritt) < 0) throw new Error("Der Austritt liegt vor dem Eintritt.");

  const von = eintritt && compare(eintritt, jStart) > 0 ? eintritt : jStart;
  const bis = austritt && compare(austritt, jEnde) < 0 ? austritt : jEnde;
  const eintrittImJahr = compare(von, jStart) > 0;
  const austrittImJahr = !!austritt && compare(austritt, jEnde) < 0;

  // 1. Arbeitstage pro Woche, bei Wechsel gewichtet
  let tage = e.tage;
  if (e.wechsel && isISODate(e.wechsel.ab) && compare(e.wechsel.ab, von) > 0 && compare(e.wechsel.ab, bis) <= 0) {
    tage = tageGewichtet(von, bis, e.tage, e.wechsel.ab, e.wechsel.tage);
    rechenweg.push(`Wechsel am ${formatDE(e.wechsel.ab)} von ${z(e.tage)} auf ${z(e.wechsel.tage)} Arbeitstage pro Woche. Anteilig nach Monaten ergibt das im Schnitt ${z(tage)} Arbeitstage pro Woche.`);
    hinweise.push({ typ: "info", text: "Urlaub, der vor einem Wechsel in Teilzeit entstanden ist, darf nicht nachträglich gekürzt werden. Resttage aus der Zeit davor bleiben in voller Höhe bestehen, auch wenn die Person jetzt weniger Tage arbeitet." });
  } else if (e.wechsel) {
    hinweise.push({ typ: "warnung", text: "Das Wechseldatum liegt nicht im Beschäftigungszeitraum dieses Jahres und wurde nicht berücksichtigt." });
  }

  // 2. Jahreswerte
  const gesetzJahr = r6((24 * tage) / 6);
  let vertragJahr = r6((e.jahresurlaub * tage) / e.bezug);
  rechenweg.push(`Gesetzlicher Mindesturlaub (§ 3 BUrlG): 24 Werktage × ${z(tage)} ÷ 6 = ${z(gesetzJahr)} Arbeitstage im ganzen Jahr.`);
  rechenweg.push(`Vertraglicher Jahresurlaub: ${z(e.jahresurlaub)} Tage bei ${e.bezug}-Tage-Woche × ${z(tage)} ÷ ${e.bezug} = ${z(vertragJahr)} Arbeitstage im ganzen Jahr.`);
  if (vertragJahr < gesetzJahr - 1e-9) {
    hinweise.push({ typ: "warnung", text: `Der Vertrag liegt unter dem gesetzlichen Minimum. Diese Regel ist unwirksam, es gelten mindestens ${z(gesetzJahr)} Tage.` });
    vertragJahr = gesetzJahr;
  }
  const mehrJahr = r6(vertragJahr - gesetzJahr);
  rechenweg.push(`Davon Mehrurlaub aus dem Vertrag: ${z(vertragJahr)} − ${z(gesetzJahr)} = ${z(mehrJahr)} Tage.`);

  // 3. Wartezeit (§ 4 BUrlG) und Fall nach § 5 Abs. 1 BUrlG
  const wzEnde = eintritt ? zeitraumEnde(eintritt, 6) : null;
  const wzErfuellt = !wzEnde || compare(wzEnde, bis) <= 0;
  const wzRelevant = !!(eintritt && wzEnde && compare(wzEnde, jStart) >= 0);
  if (wzRelevant) rechenweg.push(`Wartezeit von 6 Monaten (§ 4 BUrlG) ab ${formatDE(eintritt!)}: erfüllt mit Ablauf des ${formatDE(wzEnde!)}${wzErfuellt ? "." : `, also nicht mehr im Zeitraum bis ${formatDE(bis)}.`}`);

  let fall: UrlaubErgebnis["fall"] = "voll";
  let m = 12;
  if (!wzErfuellt) {
    m = volleMonate(von, bis);
    fall = austrittImJahr ? "teil-vor-wartezeit" : "teil-wartezeit";
    rechenweg.push(
      austrittImJahr
        ? `Austritt vor erfüllter Wartezeit (§ 5 Abs. 1 b BUrlG): 1/12 je vollem Monat. Volle Monate in ${e.jahr}: ${m}.`
        : `Wartezeit wird in ${e.jahr} nicht erfüllt (§ 5 Abs. 1 a BUrlG): 1/12 je vollem Monat. Volle Monate ab Eintritt: ${m}.`,
    );
  } else if (austrittImJahr && compare(bis, halb) <= 0) {
    m = volleMonate(von, bis);
    fall = "teil-erste-haelfte";
    rechenweg.push(`Austritt in der ersten Jahreshälfte, also bis einschließlich 30.06. (§ 5 Abs. 1 c BUrlG): 1/12 je vollem Monat. Volle Monate in ${e.jahr}: ${m}.`);
  } else if (eintrittImJahr || austrittImJahr) {
    rechenweg.push(
      eintrittImJahr && !austrittImJahr
        ? `Die Wartezeit endet noch in ${e.jahr}. Deshalb entsteht trotz Eintritt im Lauf des Jahres der volle gesetzliche Urlaub.`
        : "Austritt nach dem 30.06. und nach erfüllter Wartezeit: Der gesetzliche Urlaub bleibt voll erhalten.",
    );
  } else {
    rechenweg.push(`Beschäftigung über das ganze Jahr ${e.jahr}: voller Jahresurlaub.`);
  }

  // 4. Gesetzlich und Mehrurlaub getrennt, jeder Bruchteil wird aufgerundet
  const teilJahr = eintrittImJahr || austrittImJahr;
  const gExakt = r6((gesetzJahr * m) / 12);
  const gWert = rundeAuf(gExakt);
  const gesetzlich: Teil = { jahr: gesetzJahr, zwoelftel: m, exakt: gExakt, wert: gWert };
  let gerundet = gWert !== gExakt;
  if (m < 12) rechenweg.push(`Gesetzlicher Teilurlaub: ${z(gesetzJahr)} × ${m}/12 = ${z(gExakt)} Tage${aufText(gExakt, gWert, true)}.`);
  else if (gerundet) rechenweg.push(`Gesetzlicher Urlaub im ganzen Jahr: ${z(gExakt)} Tage${aufText(gExakt, gWert, false)}.`);

  let mehr: Teil;
  if (mehrRegel === "wie-gesetz") {
    // Ein Anspruch auf den ganzen Jahresurlaub, einmal aufgerundet. Der gesetzliche Teil ist darin enthalten.
    const gesamtExakt = r6((vertragJahr * m) / 12);
    const gesamtWert = Math.max(rundeAuf(gesamtExakt), gWert);
    mehr = { jahr: mehrJahr, zwoelftel: m, exakt: r6((mehrJahr * m) / 12), wert: r6(gesamtWert - gWert) };
    if (gesamtWert !== gesamtExakt) gerundet = true;
    if (m < 12) {
      rechenweg.push(`Der Vertrag regelt den Mehrurlaub nicht eigens, er folgt deshalb dem Gesetz. Teilurlaub auf den ganzen Jahresurlaub: ${z(vertragJahr)} × ${m}/12 = ${z(gesamtExakt)} Tage${aufText(gesamtExakt, gesamtWert, true)}. Davon gesetzlich ${z(gWert)}, Mehrurlaub ${z(mehr.wert)}.`);
    } else {
      if (teilJahr) rechenweg.push("Der Vertrag regelt den Mehrurlaub nicht eigens, er folgt deshalb dem Gesetz und bleibt ebenfalls voll.");
      if (gesamtWert !== gesamtExakt || gWert !== gExakt) rechenweg.push(`Jahresurlaub gesamt: ${z(vertragJahr)} Tage${aufText(vertragJahr, gesamtWert, false)}. Davon gesetzlich ${z(gWert)}, Mehrurlaub ${z(mehr.wert)}.`);
    }
  } else {
    const mV = teilJahr ? volleMonate(von, bis) : 12;
    const mExakt = r6((mehrJahr * mV) / 12);
    const mWert = rundeAuf(mExakt);
    mehr = { jahr: mehrJahr, zwoelftel: mV, exakt: mExakt, wert: mWert };
    if (mWert !== mExakt) gerundet = true;
    if (mV < 12) {
      rechenweg.push(`Der Vertrag kürzt den Mehrurlaub anteilig: ${z(mehrJahr)} × ${mV}/12 = ${z(mExakt)} Tage${aufText(mExakt, mWert, true, true)}.`);
      if (m === 12) fall = "voll-mehr-anteilig";
    } else if (mWert !== mExakt) {
      rechenweg.push(`Mehrurlaub im ganzen Jahr: ${z(mExakt)} Tage${aufText(mExakt, mWert, false)}.`);
    }
  }

  // 5. Zusatzurlaub § 208 SGB IX
  let zusatz: Teil | null = null;
  if (e.schwerbehindert) {
    const zJahr = tage; // 5 Tage bei 5-Tage-Woche, entsprechend mehr oder weniger
    let zm = m;
    const sbAb = e.schwerbehindertAb && isISODate(e.schwerbehindertAb) ? e.schwerbehindertAb : null;
    if (sbAb && compare(sbAb, von) > 0) {
      zm = compare(sbAb, bis) > 0 ? 0 : Math.min(m, volleMonate(sbAb, bis));
      rechenweg.push(`Schwerbehinderung ab ${formatDE(sbAb)}: 1/12 des Zusatzurlaubs je vollem Monat (§ 208 Abs. 2 SGB IX), ${zm} volle Monate.`);
    }
    const zExakt = r6((zJahr * zm) / 12);
    const zWert = rundeAuf(zExakt);
    zusatz = { jahr: zJahr, zwoelftel: zm, exakt: zExakt, wert: zWert };
    if (zWert !== zExakt) gerundet = true;
    rechenweg.push(`Zusatzurlaub (§ 208 SGB IX): 5 Tage bei 5-Tage-Woche, umgerechnet ${z(zJahr)} Tage${zm < 12 ? `, anteilig ${z(zExakt)} Tage` : ""}${aufText(zExakt, zWert, zm < 12)}.`);
  }

  const gesamt = r2(gesetzlich.wert + mehr.wert + (zusatz?.wert ?? 0));
  rechenweg.push(`Gesamt: ${z(gesetzlich.wert)} gesetzlich + ${z(mehr.wert)} Mehrurlaub${zusatz ? ` + ${z(zusatz.wert)} Zusatzurlaub` : ""} = ${z(gesamt)} Arbeitstage.`);

  // 6. Hinweise
  if (gerundet) {
    hinweise.push({ typ: "info", text: "Der Rechner rundet jeden Bruchteil auf einen vollen Tag auf. Pflicht ist das nur im Teilurlaub ab einem halben Tag (§ 5 Abs. 2 BUrlG). Kleinere Bruchteile und Bruchteile beim Jahresurlaub in Teilzeit rundet der Rechner freiwillig auf. Das ist günstiger für die Mitarbeitenden und erspart dir das Abrechnen von Bruchteilen in Stunden." });
  }
  if (eintrittImJahr) {
    hinweise.push({ typ: "info", text: "Hat die Person im selben Jahr schon bei einem früheren Arbeitgeber Urlaub bekommen, wird er angerechnet (§ 6 Abs. 1 BUrlG). Lass dir die Urlaubsbescheinigung des Vorarbeitgebers zeigen." });
  }
  if (austrittImJahr) {
    hinweise.push({ typ: "info", text: "Beim Austritt stellst du eine Urlaubsbescheinigung aus (§ 6 Abs. 2 BUrlG). Urlaub, der bis zum Ende nicht mehr genommen werden kann, wird ausgezahlt (§ 7 Abs. 4 BUrlG)." });
    if (fall === "teil-erste-haelfte") hinweise.push({ typ: "info", text: "Hat die Person schon mehr Urlaub genommen, als ihr nach der Kürzung zusteht, darfst du das Urlaubsentgelt nicht zurückfordern (§ 5 Abs. 3 BUrlG)." });
  }
  hinweise.push({ typ: "info", text: "Verfall: Urlaub verfällt am Jahresende (bei Übertragung am 31.03. des Folgejahres) nur, wenn du die Person vorher rechtzeitig und konkret auf ihren Resturlaub und den drohenden Verfall hingewiesen hast. Ohne diesen Hinweis bleibt der Urlaub bestehen." });

  return { gesamt, gesetzlich, mehr, zusatz, fall, tageEffektiv: tage, wartezeitEnde: wzRelevant ? wzEnde : null, rechenweg, hinweise };
}
