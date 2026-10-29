/** Reine Logik des Schwellenwerte-Checks. */
import { zahl } from "./format";

export type SwEingabe = {
  /** Arbeitnehmer nach Köpfen ohne Azubis */
  koepfe: number;
  /** davon bis 10 Wochenstunden */
  bis10: number;
  /** davon über 10 bis 20 Wochenstunden */
  bis20: number;
  /** davon über 20 bis 30 Wochenstunden */
  bis30: number;
  azubis: number;
  /** Arbeitsplätze ab 18 Wochenstunden ohne Azubis; null = aus den Stundenangaben geschätzt */
  plaetze18: number | null;
  /** schwerbehinderte Arbeitnehmer ohne Azubis */
  schwerbehindert: number;
  /** Personen, die ständig mit der automatisierten Verarbeitung personenbezogener Daten beschäftigt sind */
  datenPersonen: number | null;
  betriebsrat: boolean;
};

/** § 23 KSchG, § 622 Abs. 5 BGB, § 11 ASiG: bis 20 Std. 0,5, bis 30 Std. 0,75 */
export const gewichtet = (e: SwEingabe) => e.koepfe - e.bis10 - e.bis20 - e.bis30 + (e.bis10 + e.bis20) * 0.5 + e.bis30 * 0.75;
/** § 3 Abs. 1 AAG: bis 10 Std. 0,25, bis 20 Std. 0,5, bis 30 Std. 0,75, schwerbehinderte Menschen bleiben außer Ansatz */
export const gewichtetU1 = (e: SwEingabe) => Math.max(0, e.koepfe - e.bis10 - e.bis20 - e.bis30 + e.bis10 * 0.25 + e.bis20 * 0.5 + e.bis30 * 0.75 - e.schwerbehindert);

type Op = ">" | ">=";
export type Regel = {
  id: string;
  thema: string;
  gesetz: string;
  op: Op;
  grenze: number;
  bezug: "Betrieb" | "Unternehmen" | "Arbeitgeber";
  zaehlweise: string;
  wert: (e: SwEingabe) => number;
  /** gilt nur, wenn ein Betriebsrat besteht */
  nurMitBr?: boolean;
  /** true: Pflicht entfällt oberhalb der Grenze (z. B. U1), Text "gilt bis" */
  bis?: boolean;
  folge: string;
  /** Satz zur Zählbasis, wenn sie nicht die Kopfzahl ist (für den Satz zur nächsten Schwelle) */
  basis?: string;
};

export const REGELN: Regel[] = [
  { id: "br", thema: "Betriebsrat kann gewählt werden", gesetz: "§ 1 BetrVG", op: ">=", grenze: 5, bezug: "Betrieb", zaehlweise: "ständige wahlberechtigte Arbeitnehmer ab 16 Jahren, Azubis zählen mit, Teilzeit voll", wert: (e) => e.koepfe + e.azubis, folge: "Die Belegschaft darf einen Betriebsrat wählen. Du musst ihn nicht einrichten, darfst die Wahl aber nicht behindern. Mindestens drei Personen müssen wählbar sein (6 Monate dabei, ab 18 Jahren)." },
  { id: "pause", thema: "Pausenraum", gesetz: "ArbStättV Anhang Nr. 4.2", op: ">", grenze: 10, bezug: "Betrieb", zaehlweise: "Beschäftigte nach Köpfen, Azubis zählen mit", wert: (e) => e.koepfe + e.azubis, folge: "Du brauchst einen Pausenraum oder einen gleichwertigen Pausenbereich. Ausnahme: Büros, in denen man sich in der Pause genauso gut erholen kann." },
  { id: "kschg", thema: "Kündigungsschutzgesetz gilt", gesetz: "§ 23 Abs. 1 KSchG", op: ">", grenze: 10, bezug: "Betrieb", zaehlweise: "Arbeitnehmer ohne Azubis, bis 20 Std. = 0,5, bis 30 Std. = 0,75", wert: gewichtet, basis: "Für das Kündigungsschutzgesetz zählt Teilzeit nur anteilig, Azubis zählen nicht.", folge: "Nach 6 Monaten Betriebszugehörigkeit brauchst du für jede Kündigung einen Grund (Person, Verhalten oder Betrieb) und bei betriebsbedingten Kündigungen eine Sozialauswahl." },
  { id: "tzbfg", thema: "Anspruch auf Teilzeit", gesetz: "§ 8 Abs. 7 TzBfG", op: ">", grenze: 15, bezug: "Arbeitgeber", zaehlweise: "Arbeitnehmer nach Köpfen ohne Azubis", wert: (e) => e.koepfe, folge: "Wer länger als 6 Monate dabei ist, kann dauerhafte Teilzeit verlangen. Ablehnen darfst du nur aus betrieblichen Gründen und fristgerecht." },
  { id: "beeg", thema: "Anspruch auf Teilzeit in Elternzeit", gesetz: "§ 15 Abs. 7 BEEG", op: ">", grenze: 15, bezug: "Arbeitgeber", zaehlweise: "Arbeitnehmer nach Köpfen ohne Azubis", wert: (e) => e.koepfe, folge: "Eltern können während der Elternzeit 15 bis 32 Wochenstunden verlangen. Ablehnen nur aus dringenden betrieblichen Gründen, innerhalb von 4 bzw. 8 Wochen." },
  { id: "pflegezg", thema: "Anspruch auf Pflegezeit", gesetz: "§ 3 Abs. 1 PflegeZG", op: ">", grenze: 15, bezug: "Arbeitgeber", zaehlweise: "Beschäftigte nach Köpfen, Azubis zählen mit", wert: (e) => e.koepfe + e.azubis, folge: "Beschäftigte können sich bis zu 6 Monate ganz oder teilweise freistellen lassen, um Angehörige zu pflegen. Ab Ankündigung gilt Sonderkündigungsschutz." },
  { id: "u1", thema: "U1-Umlage (Erstattung Entgeltfortzahlung)", gesetz: "§§ 1, 3 AAG", op: ">", grenze: 30, bis: true, bezug: "Arbeitgeber", zaehlweise: "ohne Azubis und schwerbehinderte Menschen, bis 10 Std. = 0,25, bis 20 Std. = 0,5, bis 30 Std. = 0,75; maßgeblich ist das Vorjahr (mindestens 8 Monate)", wert: gewichtetU1, folge: "Bis 30 nimmst du am Umlageverfahren U1 teil: Du zahlst die Umlage und bekommst einen Teil der Entgeltfortzahlung bei Krankheit erstattet. Darüber entfällt beides." },
  { id: "kleinbetrieb", thema: "Kürzere vertragliche Kündigungsfrist erlaubt (Kleinbetrieb)", gesetz: "§ 622 Abs. 5 Satz 1 Nr. 2 BGB", op: ">", grenze: 20, bis: true, bezug: "Arbeitgeber", zaehlweise: "Arbeitnehmer ohne Azubis, bis 20 Std. = 0,5, bis 30 Std. = 0,75", wert: gewichtet, folge: "Bis 20 darfst du im Vertrag eine Grundkündigungsfrist von 4 Wochen ohne festen Endtermin (15. oder Monatsende) vereinbaren. Darüber gilt der Endtermin zwingend." },
  { id: "sgb9", thema: "Beschäftigungspflicht schwerbehinderter Menschen", gesetz: "§§ 154, 156, 157 SGB IX", op: ">=", grenze: 20, bezug: "Arbeitgeber", zaehlweise: "Arbeitsplätze im Jahresdurchschnitt, Stellen unter 18 Wochenstunden und Ausbildungsstellen zählen nicht", wert: (e) => e.plaetze18 ?? Math.max(0, e.koepfe - e.bis10 - e.bis20), basis: "Für die Schwerbehindertenquote zählen nur Arbeitsplätze ab 18 Wochenstunden ohne Ausbildungsstellen.", folge: "Mindestens 5 Prozent der Arbeitsplätze mit schwerbehinderten Menschen besetzen (20 bis 39 Plätze: 1, 40 bis 59 Plätze: 2). Für jeden unbesetzten Pflichtplatz zahlst du Ausgleichsabgabe, Anzeige bis 31. März für das Vorjahr." },
  { id: "dsb", thema: "Datenschutzbeauftragter", gesetz: "§ 38 Abs. 1 BDSG", op: ">=", grenze: 20, bezug: "Unternehmen", zaehlweise: "Personen, die in der Regel ständig mit automatisierter Verarbeitung personenbezogener Daten beschäftigt sind, egal ob Teilzeit, Azubi oder freie Mitarbeit", wert: (e) => e.datenPersonen ?? 0, basis: "Für den Datenschutzbeauftragten zählen nur Personen, die ständig mit Personendaten arbeiten.", folge: "Du musst eine Datenschutzbeauftragte oder einen Datenschutzbeauftragten benennen (intern oder extern) und der Aufsichtsbehörde melden. Unabhängig von der Zahl gilt das, wenn ihr eine Datenschutz-Folgenabschätzung braucht." },
  { id: "ass", thema: "Arbeitsschutzausschuss", gesetz: "§ 11 ASiG", op: ">", grenze: 20, bezug: "Betrieb", zaehlweise: "Beschäftigte, bis 20 Std. = 0,5, bis 30 Std. = 0,75, Azubis zählen mit", wert: (e) => gewichtet(e) + e.azubis, basis: "Für den Arbeitsschutzausschuss zählt Teilzeit nur anteilig, Azubis zählen mit.", folge: "Bilde einen Arbeitsschutzausschuss mit Fachkraft für Arbeitssicherheit, Betriebsarzt, Sicherheitsbeauftragten und, falls vorhanden, zwei Betriebsratsmitgliedern. Er tagt mindestens einmal im Quartal." },
  { id: "mel17", thema: "Massenentlassungsanzeige möglich", gesetz: "§ 17 Abs. 1 KSchG", op: ">", grenze: 20, bezug: "Betrieb", zaehlweise: "Arbeitnehmer nach Köpfen, Teilzeit zählt voll", wert: (e) => e.koepfe, folge: "Entlässt du innerhalb von 30 Tagen mehr Menschen als die Staffel erlaubt (bei 21 bis 59 Beschäftigten mehr als 5), musst du das vorher der Agentur für Arbeit anzeigen. Auch Aufhebungsverträge auf Veranlassung des Arbeitgebers zählen mit. Fehler können die Kündigungen unwirksam machen." },
  { id: "br99", thema: "Zustimmung des Betriebsrats bei Einstellung und Versetzung", gesetz: "§ 99 BetrVG", op: ">", grenze: 20, nurMitBr: true, bezug: "Unternehmen", zaehlweise: "wahlberechtigte Arbeitnehmer, Azubis zählen mit", wert: (e) => e.koepfe + e.azubis, folge: "Vor jeder Einstellung, Eingruppierung, Umgruppierung und Versetzung brauchst du die Zustimmung des Betriebsrats." },
  { id: "br111", thema: "Interessenausgleich und Sozialplan bei Betriebsänderungen", gesetz: "§ 111 BetrVG", op: ">", grenze: 20, nurMitBr: true, bezug: "Unternehmen", zaehlweise: "wahlberechtigte Arbeitnehmer, Azubis zählen mit", wert: (e) => e.koepfe + e.azubis, folge: "Bei Stilllegung, Verlegung oder größerem Personalabbau musst du mit dem Betriebsrat über einen Interessenausgleich verhandeln. Ein Sozialplan kann erzwungen werden." },
  { id: "fpfzg", thema: "Anspruch auf Familienpflegezeit", gesetz: "§ 2 Abs. 1 FPfZG", op: ">", grenze: 25, bezug: "Arbeitgeber", zaehlweise: "Beschäftigte ohne Azubis", wert: (e) => e.koepfe, folge: "Beschäftigte können für bis zu 24 Monate auf mindestens 15 Wochenstunden reduzieren, um Angehörige zu pflegen." },
  { id: "brueckentz", thema: "Anspruch auf Brückenteilzeit", gesetz: "§ 9a TzBfG", op: ">", grenze: 45, bezug: "Arbeitgeber", zaehlweise: "Arbeitnehmer nach Köpfen ohne Azubis", wert: (e) => e.koepfe, folge: "Beschäftigte können ihre Arbeitszeit für 1 bis 5 Jahre verringern und kehren danach automatisch zurück. Bei 46 bis 200 Beschäftigten darfst du ab einer gestaffelten Zahl laufender Brückenteilzeiten ablehnen." },
  { id: "sib", thema: "Sicherheitsbeauftragte", gesetz: "§ 22 Abs. 1 SGB VII", op: ">=", grenze: 50, bezug: "Unternehmen", zaehlweise: "regelmäßig Beschäftigte nach Köpfen, Azubis zählen mit", wert: (e) => e.koepfe + e.azubis, folge: "Ab 50 bestellst du Sicherheitsbeauftragte. Unter 250 Beschäftigten ohne besondere Gefährdung reicht eine Person. Bei 21 bis 49 nur, wenn die Gefährdungsbeurteilung eine besondere Gefährdung zeigt. Die Berufsgenossenschaft kann sie auch sonst anordnen." },
  { id: "hinschg", thema: "Interne Meldestelle für Hinweisgeber", gesetz: "§ 12 HinSchG", op: ">=", grenze: 50, bezug: "Arbeitgeber", zaehlweise: "Beschäftigte nach Köpfen, Azubis zählen mit", wert: (e) => e.koepfe + e.azubis, folge: "Richte eine interne Meldestelle ein (auch extern über Dienstleister möglich), bestätige Meldungen nach 7 Tagen und gib nach 3 Monaten Rückmeldung. Ein Verstoß kann ein Bußgeld kosten." },
  { id: "wa", thema: "Wirtschaftsausschuss", gesetz: "§ 106 BetrVG", op: ">", grenze: 100, nurMitBr: true, bezug: "Unternehmen", zaehlweise: "ständig beschäftigte Arbeitnehmer, Azubis zählen mit", wert: (e) => e.koepfe + e.azubis, folge: "Der Betriebsrat bildet einen Wirtschaftsausschuss. Du musst ihn rechtzeitig und umfassend über wirtschaftliche Angelegenheiten unterrichten." },
  { id: "entgtransp", thema: "Auskunftsanspruch zum Entgelt", gesetz: "§ 12 Abs. 1 EntgTranspG", op: ">", grenze: 200, bezug: "Betrieb", zaehlweise: "Beschäftigte bei demselben Arbeitgeber, Azubis zählen mit", wert: (e) => e.koepfe + e.azubis, folge: "Beschäftigte können Auskunft über das Vergleichsentgelt des anderen Geschlechts verlangen. Die EU-Entgelttransparenzrichtlinie (2023/970) weitet das auf alle Arbeitgeber aus. Ihre Umsetzungsfrist ist am 07.06.2026 abgelaufen, das deutsche Gesetz steht noch aus (Stand 05.10.2026)." },
];

/* immer, unabhängig von der Größe */
export const AB_EINS = [
  "Gefährdungsbeurteilung mit Dokumentation (§§ 5, 6 ArbSchG)",
  "Fachkraft für Arbeitssicherheit und Betriebsarzt (ASiG, DGUV Vorschrift 2)",
  "Ersthelfer im Betrieb (DGUV Vorschrift 1)",
  "Arbeitszeit erfassen (BAG, 13.09.2022, 1 ABR 22/21)",
  "Beschwerdestelle nach § 13 AGG",
  "Nachweis der Arbeitsbedingungen (NachwG)",
  "BEM nach mehr als 6 Wochen Arbeitsunfähigkeit (§ 167 Abs. 2 SGB IX)",
  "Mutterschutz, Elternzeit, kurzzeitige Arbeitsverhinderung bei Pflege (§ 2 PflegeZG)",
];

export type Status = "gilt" | "giltNicht" | "ohneBr" | "bisGrenze" | "ueberGrenze";
export function pruefe(r: Regel, e: SwEingabe): { status: Status; wert: number; fehlt: number } {
  const w = r.wert(e);
  const erfuellt = r.op === ">" ? w > r.grenze : w >= r.grenze;
  // wie viel fehlt bis zur Grenze (bei ">" muss die Grenze überschritten werden; Köpfe sind ganzzahlig)
  const fehlt = r.op === ">" ? Math.max(0, r.grenze - w) + (Number.isInteger(w) ? 1 : 0.25) : Math.max(0, r.grenze - w);
  if (r.bis) return { status: erfuellt ? "ueberGrenze" : "bisGrenze", wert: w, fehlt };
  if (!erfuellt) return { status: "giltNicht", wert: w, fehlt };
  if (r.nurMitBr && !e.betriebsrat) return { status: "ohneBr", wert: w, fehlt: 0 };
  return { status: "gilt", wert: w, fehlt: 0 };
}

export const SW_FELDER = ["koepfe", "bis10", "bis20", "bis30", "azubis", "plaetze18", "schwerbehindert", "daten"] as const;
export type SwFeld = (typeof SW_FELDER)[number];

/** Liest die Formularwerte, prüft sie und baut die Eingabe. Schwerbehinderte zählen nur unter den Arbeitnehmern ohne Azubis. */
export function pruefeSwEingabe(f: Record<SwFeld, string>, betriebsrat: boolean) {
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
  const vals = Object.fromEntries(SW_FELDER.map((k) => [k, num(f[k])])) as Record<SwFeld, number | null>;
  const fehler: Partial<Record<SwFeld, string>> = {};
  for (const k of SW_FELDER) {
    const v = vals[k];
    if (v !== null && (!Number.isFinite(v) || v < 0 || !Number.isInteger(v))) fehler[k] = "Ganze Zahl ab 0.";
  }
  if (vals.koepfe === null) fehler.koepfe = "Zahl der Beschäftigten angeben.";
  const k = vals.koepfe ?? 0;
  if (!fehler.koepfe && (vals.bis10 ?? 0) + (vals.bis20 ?? 0) + (vals.bis30 ?? 0) > k) fehler.bis30 = "Teilzeitgruppen größer als die Gesamtzahl.";
  if (!fehler.koepfe && (vals.schwerbehindert ?? 0) > k) fehler.schwerbehindert = "Mehr als die Arbeitnehmer ohne Azubis.";
  const e: SwEingabe = {
    koepfe: k,
    bis10: vals.bis10 ?? 0,
    bis20: vals.bis20 ?? 0,
    bis30: vals.bis30 ?? 0,
    azubis: vals.azubis ?? 0,
    plaetze18: vals.plaetze18,
    schwerbehindert: vals.schwerbehindert ?? 0,
    datenPersonen: vals.daten,
    betriebsrat,
  };
  return { fehler, e, ok: Object.keys(fehler).length === 0 };
}

/** Regler für die Kopfzahl: Wurzel-Skala, damit die vielen Schwellen zwischen 5 und 50 Platz haben. Stellung 0 bis 1000. */
export const REGLER_MAX = 250;
export const koepfeAusRegler = (p: number) => Math.round((p / 1000) ** 2 * REGLER_MAX);
export const reglerAusKoepfen = (k: number) => Math.round(Math.sqrt(Math.min(Math.max(k, 0), REGLER_MAX) / REGLER_MAX) * 1000);

/** Setzt die Kopfzahl und kürzt Teilzeitgruppen (von 30 Std. abwärts) und Schwerbehinderte, damit die Eingabe gültig bleibt. */
export function mitKoepfen(f: Record<SwFeld, string>, k: number): Record<SwFeld, string> {
  const n = (s: string) => Number(s) || 0;
  const neu = { ...f, koepfe: String(k) };
  let zuViel = n(f.bis10) + n(f.bis20) + n(f.bis30) - k;
  for (const g of ["bis30", "bis20", "bis10"] as const) {
    if (zuViel <= 0) break;
    const weg = Math.min(n(f[g]), zuViel);
    neu[g] = String(n(f[g]) - weg);
    zuViel -= weg;
  }
  if (n(f.schwerbehindert) > k) neu.schwerbehindert = String(k);
  return neu;
}

/** Wie mitKoepfen, begrenzt zusätzlich die Personen mit Personendaten auf Köpfe plus Azubis. Für Regler, Schnellwahl und Tippen. */
export function setzeKoepfe(f: Record<SwFeld, string>, k: number): Record<SwFeld, string> {
  const neu = mitKoepfen(f, k);
  const max = k + (Number(f.azubis) || 0);
  if ((Number(f.daten) || 0) > max) neu.daten = String(max);
  return neu;
}

/** "1 Kopf", "2 Köpfe", "0,5 gewichtete Köpfe" */
export const fehltText = (n: number) => `${zahl(n)} ${!Number.isInteger(n) ? "gewichtete Köpfe" : n === 1 ? "Kopf" : "Köpfe"}`;

/** Erster Satz eines Textes. Trennt nur vor einem Großbuchstaben, damit "(15. oder Monatsende)" ganz bleibt. */
export const kurzfassung = (t: string) => t.split(/(?<=\.)\s+(?=[A-ZÄÖÜ])/)[0];

/**
 * Beschriftete Werte der Skala (UX-Review 28.10.2026): Zwischen 5 und 30 lagen die Zahlen übereinander,
 * am Handy fielen 15 und 25 weg. Jetzt überall dieselbe Auswahl, die übrigen Schwellen nur als Strich.
 */
export const SKALA_BESCHRIFTET = [5, 10, 20, 30, 50, 100, 200];
