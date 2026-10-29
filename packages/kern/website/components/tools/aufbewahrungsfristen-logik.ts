/** Reine Logik des Aufbewahrungsfristen-Rechners. */
import { addDays, addMonths } from "./datum";

type Regel =
  | { art: "jahresende"; jahre: number }
  | { art: "ab-datum"; monate: number }
  | { art: "sv" }
  | { art: "keine" };

export type DokTyp = { id: string; label: string; datum: string; regel: Regel; frist: string; grundlage: string; hinweis?: string };

/** Fristen Stand 04.10.2026. Buchungsbelege 8 Jahre seit dem Bürokratieentlastungsgesetz IV (gilt ab 01.01.2025). */
export const DOKUMENTE: DokTyp[] = [
  {
    id: "lohn",
    label: "Lohn- und Gehaltsabrechnungen, Lohnlisten",
    datum: "Datum der Abrechnung",
    regel: { art: "jahresende", jahre: 8 },
    frist: "8 Jahre ab Ende des Kalenderjahres",
    grundlage: "§ 147 Abs. 1 Nr. 4, Abs. 3 und 4 AO; § 257 Abs. 1 Nr. 4, Abs. 4 und 5 HGB",
    hinweis: "Lohnabrechnungen sind Buchungsbelege. Seit 2025 gelten dafür 8 statt 10 Jahre, auch für ältere Belege, deren alte Frist Ende 2024 noch lief.",
  },
  {
    id: "reise",
    label: "Reisekosten- und Spesenabrechnungen",
    datum: "Datum der Abrechnung",
    regel: { art: "jahresende", jahre: 8 },
    frist: "8 Jahre ab Ende des Kalenderjahres",
    grundlage: "§ 147 Abs. 1 Nr. 4, Abs. 3 und 4 AO; § 257 Abs. 1 Nr. 4, Abs. 4 und 5 HGB",
  },
  {
    id: "lohnkonto",
    label: "Lohnkonto (lohnsteuerliche Aufzeichnungen)",
    datum: "Datum der letzten Eintragung",
    regel: { art: "jahresende", jahre: 6 },
    frist: "bis Ende des 6. Kalenderjahres nach der letzten Eintragung",
    grundlage: "§ 41 Abs. 1 Satz 9 EStG",
    hinweis: "Dient das Lohnkonto zugleich als Buchungsbeleg, gilt die längere Frist von 8 Jahren. Frag im Zweifel dein Lohnbüro, wie es die Unterlagen führt.",
  },
  {
    id: "sv",
    label: "Entgeltunterlagen für die Sozialversicherung",
    datum: "Datum der Unterlage (Abrechnungsmonat)",
    regel: { art: "sv" },
    frist: "bis Ende des Kalenderjahres nach der Betriebsprüfung, die den Zeitraum der Unterlage geprüft hat",
    grundlage: "§ 28f Abs. 1 SGB IV",
    hinweis: "Die Rentenversicherung prüft in der Regel alle 4 Jahre. Sind die Unterlagen zugleich Lohnbelege, gilt die längere steuerliche Frist von 8 Jahren.",
  },
  {
    id: "arbeitszeit",
    label: "Arbeitszeitnachweise (Stundenzettel, Zeiterfassung)",
    datum: "Datum der Aufzeichnung",
    regel: { art: "ab-datum", monate: 24 },
    frist: "mindestens 2 Jahre",
    grundlage: "§ 16 Abs. 2 ArbZG; § 17 Abs. 1 MiLoG für Minijobs und die Branchen nach § 2a SchwarzArbG",
    hinweis: "Sind die Stundenzettel Grundlage der Lohnabrechnung, bewahren viele Lohnbüros sie wie Lohnbelege 8 Jahre auf. Stimm das ab.",
  },
  {
    id: "vertrag",
    label: "Arbeitsvertrag und Vertragsänderungen nach Austritt",
    datum: "Austrittsdatum",
    regel: { art: "jahresende", jahre: 6 },
    frist: "6 Jahre ab Ende des Austrittsjahres",
    grundlage: "§ 147 Abs. 1 Nr. 5, Abs. 3 und 4 AO",
    hinweis: "Der Vertrag belegt, warum welcher Lohn gezahlt wurde. Viele Lohnbüros und Steuerberater bewahren ihn deshalb 6 Jahre auf. Stimm das mit deinem Lohnbüro ab.",
  },
  {
    id: "akte",
    label: "Personalakte nach Austritt (Zeugniskopie, Abmahnungen, Schriftverkehr)",
    datum: "Austrittsdatum",
    regel: { art: "jahresende", jahre: 3 },
    frist: "3 Jahre ab Ende des Austrittsjahres (Empfehlung)",
    grundlage: "regelmäßige Verjährung nach §§ 195, 199 BGB; keine gesetzliche Aufbewahrungspflicht",
    hinweis: "Die 3 Jahre sind keine Pflicht, sondern die Zeit, in der noch Ansprüche geltend gemacht werden können. Lohnunterlagen aus der Akte bleiben länger (8 Jahre), der Arbeitsvertrag 6 Jahre (§ 147 Abs. 1 Nr. 5, Abs. 3 AO).",
  },
  {
    id: "bewerbung",
    label: "Bewerbungsunterlagen abgelehnter Personen",
    datum: "Datum der Absage",
    regel: { art: "ab-datum", monate: 6 },
    frist: "6 Monate nach der Absage (Empfehlung)",
    grundlage: "§ 15 Abs. 4 AGG (2 Monate für Ansprüche) und § 61b ArbGG (3 Monate für die Klage), plus Puffer für die Zustellung",
    hinweis: "Länger nur mit Einwilligung, zum Beispiel für einen Talentpool. Ohne Einwilligung danach löschen.",
  },
  {
    id: "abmahnung",
    label: "Abmahnung im laufenden Arbeitsverhältnis",
    datum: "Datum der Abmahnung",
    regel: { art: "keine" },
    frist: "keine feste Frist",
    grundlage: "Rechtsprechung des Bundesarbeitsgerichts; Grundsatz der Speicherbegrenzung (Art. 5 Abs. 1 lit. e DSGVO)",
  },
];

const jahresendeFrist = (d: Date, jahre: number) => new Date(Date.UTC(d.getUTCFullYear() + jahre, 11, 31));

/** Betriebsprüfung der Rentenversicherung: geprüfter Zeitraum bis (laut Prüfbescheid) und Tag der Prüfung. */
export type Pruefung = { bis: Date; am: Date };

/**
 * Aufbewahren bis und frühestens löschen ab. null, wenn es kein Fristende gibt: bei Abmahnungen und bei Entgeltunterlagen,
 * deren Zeitraum noch keine Betriebsprüfung geprüft hat (§ 28f Abs. 1 SGB IV zählt erst ab der Prüfung, die sie erfasst).
 * Maßgeblich ist der geprüfte Zeitraum, nicht der Tag der Prüfung: Eine Prüfung im Mai 2024 deckt meist nur bis 31.12.2023.
 */
export function berechneFrist(typ: DokTyp, datum: Date, pruefung: Pruefung | null = null) {
  const r = typ.regel;
  if (r.art === "jahresende") {
    const bis = jahresendeFrist(datum, r.jahre);
    return { bis, ab: addDays(bis, 1) };
  }
  if (r.art === "sv") {
    if (!pruefung || datum > pruefung.bis) return null;
    const bis = new Date(Date.UTC(pruefung.am.getUTCFullYear() + 1, 11, 31));
    return { bis, ab: addDays(bis, 1) };
  }
  if (r.art === "ab-datum") {
    const bis = addMonths(datum, r.monate);
    return { bis, ab: addDays(bis, 1) };
  }
  return null;
}

/** Liest die Angaben zur Betriebsprüfung. Beide leer heißt: noch nie geprüft. */
export function pruefungLesen(bis: Date | null, am: Date | null): { pruefung: Pruefung | null; fehler?: string } {
  if (!bis && !am) return { pruefung: null };
  if (!bis || !am) return { pruefung: null, fehler: "Trag beide Daten der Betriebsprüfung ein oder lass beide leer." };
  if (bis > am) return { pruefung: null, fehler: "Der geprüfte Zeitraum kann nicht nach dem Tag der Prüfung enden. Schau im Prüfbescheid nach." };
  return { pruefung: { bis, am } };
}

/**
 * Verbindliche Frist. Entgeltunterlagen der Sozialversicherung sind meist zugleich Lohnbelege. Dann gilt die spätere
 * von SV-Frist und steuerlicher Frist (8 Jahre). `sv` ist die kürzere SV-Frist, wenn die steuerliche länger läuft.
 */
export function verbindlicheFrist(typ: DokTyp, datum: Date, pruefung: Pruefung | null = null): { bis: Date; ab: Date; sv?: { bis: Date; ab: Date } } | null {
  const f = berechneFrist(typ, datum, pruefung);
  if (!f || typ.regel.art !== "sv") return f;
  const steuer = jahresendeFrist(datum, 8);
  return steuer > f.bis ? { bis: steuer, ab: addDays(steuer, 1), sv: f } : f;
}

/** Darf das Dokument heute weg? Bei Entgeltunterlagen erst, wenn auch die steuerliche Frist abgelaufen ist. */
export function jetztLoeschen(typ: DokTyp, datum: Date, pruefung: Pruefung | null, heute: Date) {
  const f = verbindlicheFrist(typ, datum, pruefung);
  return !!f && f.ab <= heute;
}

/** Löschplan nach dem Austritt: je Unterlage aufbewahren bis und löschen ab. */
export function loeschplan(austritt: Date) {
  return [
    { label: "Personalakte (Zeugniskopie, Abmahnungen, Schriftverkehr)", typ: "akte", note: "Empfehlung, keine Pflicht" },
    { label: "Arbeitszeitnachweise", typ: "arbeitszeit", note: "die letzten; ältere entsprechend früher" },
    { label: "Arbeitsvertrag und Vertragsänderungen", typ: "vertrag", note: "als Grundlage der Lohnabrechnung" },
    { label: "Lohnkonto", typ: "lohnkonto", note: "letzte Eintragung meist mit der Schlussabrechnung" },
    { label: "Lohnabrechnungen des Austrittsjahres", typ: "lohn", note: "ältere je 8 Jahre nach ihrem Jahresende" },
  ].map((r) => {
    const t = DOKUMENTE.find((x) => x.id === r.typ)!;
    return { ...r, t, f: berechneFrist(t, austritt)! };
  });
}
