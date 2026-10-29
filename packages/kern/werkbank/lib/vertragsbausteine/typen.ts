/**
 * Vertragsbausteine (Klauselkatalog 10.10.2026, 2026-10-09-modul-review/vertragsbausteine-katalog.md): Typen für alle Gruppen.
 * Rein, ohne Datenbank. Jeder Baustein ist Daten: Kennung, Gruppe, Eingaben mit Grenzen, Textbaustein in eigenem Wortlaut,
 * Normen, Quellen, Risiko und die Prüfregeln (P-001 bis P-108) und Sperrkombinationen (K-01 bis K-40), die an ihm hängen.
 * Kein Text hier ist Endwortlaut: Die Kanzlei gibt jede Bausteinversion frei, bevor eine Firma sie nutzt.
 */
import type { Beschaeftigung } from "@/lib/types";

/** Gruppen A bis S wie im Katalog (R ist die rote Liste und keine Gruppe). */
export type GruppeId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "S";

/** grün: mit Schutzgeländern ohne Einzelfallprüfung; gelb: nur in gesicherter Form, Kanzleifreigabe je Version, Hinweis „Kanzlei prüfen“ in der Prüfliste. */
export type Risiko = "grün" | "gelb";

/** Vertragsart, für die ein Baustein angeboten wird. Befristet, Teilzeit und Minijob laufen über den Arbeitsvertrag. */
export type Vertragsart = "arbeitsvertrag" | "befristet" | "teilzeit" | "minijob" | "werkstudent" | "ausbildung" | "aenderung";

/**
 * Eingabe eines Bausteins. Alle Werte kommen als Zeichenkette (wie die Angaben im Dokument-Dialog):
 * Zahl und Betrag deutsch geschrieben ("4.500,50"), Prozent als Zahl ohne Zeichen ("2,5"), Mehrfachauswahl mit "|" getrennt,
 * Staffel als JSON-Liste [{ "ab": 0, "bis": 100000, "satz": 3 }], Ja/Nein als "ja" oder "nein".
 */
export type FeldTyp = "text" | "lang" | "zahl" | "betrag" | "prozent" | "datum" | "auswahl" | "mehrfach" | "janein" | "staffel";
export type Feld = {
  id: string;
  label: string;
  typ: FeldTyp;
  optionen?: string[];
  pflicht?: boolean;
  /** Untere und obere Grenze für zahl, betrag, prozent. Rechtliche Grenzen kommen aus lib/regeln/werte.ts, nie als feste Zahl. */
  min?: number;
  max?: number;
  /** Vorbelegung (z. B. der sichere Standard aus dem Katalog). */
  standard?: string;
  hinweis?: string;
  /** Feld erscheint nur, wenn ein anderes Feld desselben Bausteins einen dieser Werte hat. */
  bei?: Record<string, string[]>;
};

export type Werte = Record<string, string>;
/** Gewählte Bausteine eines Vertrags: Kennung des Bausteins und seine Eingaben. */
export type Auswahl = Record<string, Werte>;

/** Was die Prüfung über einen Vertrag weiß: Vertragsart, Auswahl, Person, Firma, Stichtag. */
export type Lage = {
  art: Vertragsart;
  auswahl: Auswahl;
  person: {
    vorname: string;
    rolle: string;
    beschaeftigung: Beschaeftigung;
    geburtstag: string | null;
    eintritt: string;
    /** Bruttomonatsgehalt (Fixum) in Euro. */
    gehalt: number;
    wochenstunden: number;
    befristet: boolean;
    sachgrundlos: boolean;
    verlaengerungen: number;
    befristungBis: string | null;
    /** Ende einer früheren Beschäftigung bei diesem Arbeitgeber, null wenn keine oder unbekannt. */
    vorbeschaeftigungEnde: string | null;
    vorbeschaeftigungUnbekannt: boolean;
    probezeitMonate: number | null;
    /** Kündigungsfrist des Arbeitgebers in Monaten nach Vertrag, wenn bekannt (für P3 und Vertragsstrafe). */
    kuendigungsfristTage?: number | null;
  };
  /** `ohneBv`: Bausteine, deren mitbestimmte Funktion mit Betriebsrat noch keine Betriebsvereinbarung hat (Regel P-104). */
  firma: { betriebsrat: boolean; mitarbeiter: number; ohneBv?: string[] };
  /** Tag der Prüfung (Vertragsdatum). */
  heute: string;
  /** Freigabe der Kanzlei je Baustein und Version, z. B. { "D5@1+en": "2026-10-12" }. */
  freigaben?: Record<string, string>;
  /** Name der Kanzlei zu jeder Freigabe in `freigaben` (gleicher Schlüssel). */
  freigabeKanzlei?: Record<string, string>;
};

export type BefundArt = "sperre" | "warnung" | "pflicht" | "hinweis";
export type Befund = {
  /** Kennung der Regel (P-001 bis P-108, K-01 bis K-40). */
  regel: string;
  art: BefundArt;
  text: string;
  norm: string;
  bausteine: string[];
};

/**
 * Eine Prüfregel. `pruefe` gibt den Text des Befunds zurück, wenn die Regel anschlägt, sonst null.
 * Pflichtregeln (art "pflicht") schlagen an, wenn der Baustein gewählt ist, und melden, was der Textbaustein ergänzt hat.
 */
export type Regel = {
  id: string;
  art: BefundArt;
  norm: string;
  /** Kurzbeschreibung der Bedingung (aus dem Katalog), erscheint in der Regelübersicht. */
  titel: string;
  /** Bausteine, an denen die Regel hängt. Leer: gilt für jeden Vertrag. */
  bausteine: string[];
  pruefe: (l: Lage) => string | null;
};

/** Was der Textbaustein über Person und Vertrag weiß. */
export type TextKontext = {
  vorname: string;
  gehalt: number;
  wochenstunden: number;
  eintritt: string;
  heute: string;
  /** Alle gewählten Bausteine, damit ein Text auf andere verweisen kann (z. B. D24 auf D22). */
  auswahl: Auswahl;
};

/** Urteil mit Kennzeichen aus dem Katalog: V über Suchtreffer bestätigt, P Aktenzeichen prüfen, B im Bestand der Werkbank gelesen. */
export type Urteil = { az: string; kennung: "V" | "P" | "B" };

export type Baustein = {
  id: string;
  gruppe: GruppeId;
  label: string;
  risiko: Risiko;
  /** Wann passt er (ein Satz aus dem Katalog). */
  passt: string;
  /** Vertragsarten, für die er angeboten wird. */
  fuer: Vertragsart[];
  felder: Feld[];
  /** Text in eigenem Wortlaut, ohne Überschrift. Pflichtsätze (Schutzgeländer) stehen immer drin. */
  text: (w: Werte, k: TextKontext) => string;
  /** Feste englische Überschrift für zweisprachige Verträge (Nick 23.10.2026). */
  labelEn: string;
  /**
   * Feste englische Fassung von `text`, Absatz für Absatz gleich gegliedert. Freie Eingaben (Felder "text" und "lang") mit `frei()` aus
   * lib/dokumente/englisch.ts markieren, die übersetzt die KI. Maßgeblich bleibt der deutsche Text, Prüfregeln laufen nur auf ihm.
   */
  textEn: (w: Werte, k: TextKontext) => string;
  normen: string[];
  /** Amtliche Fundstellen oder Abschnitt des Katalogs. */
  quellen: string[];
  urteile?: Urteil[];
  /** Was die Software erzwingt (Schutzgeländer). */
  schutz: string[];
  /** Was die Software blockiert. */
  sperren: string[];
  regeln?: Regel[];
  /** Schriftform mit Originalunterschrift nötig (P-001). */
  nass?: boolean;
  /** Bringt eine Befristung oder auflösende Bedingung in den Vertrag: Schriftform nach § 14 Abs. 4 TzBfG (mit § 21 TzBfG), Warnung im Dokument. */
  befristung?: true;
  /** Ersetzt den Text dieses festen Paragrafen des Arbeitsvertrags (z. B. "§ 5"), statt als Zusatzparagraf zu erscheinen. */
  ersetzt?: string;
  /** Suchwörter für die Suche im Dialog und in Frag Lintelly. */
  stichwoerter?: string[];
  /** Version des Bausteintexts, deutsch und englisch zusammen: jede Änderung an `text` oder `textEn` erhöht sie. Die Freigabe der Kanzlei gilt je Version. */
  version: number;
};

export const GRUPPEN: Record<GruppeId, string> = {
  A: "Beginn und Bedingungen", B: "Tätigkeit und Ort", C: "Arbeitszeit", D: "Vergütung, Provision und Bonus", E: "Urlaub und Abwesenheit", F: "Krankheit",
  G: "Nebentätigkeit", H: "Geheimhaltung", I: "Erfindungen und Arbeitsergebnisse", J: "Datenschutz und IT", K: "Arbeitsmittel und Haftung",
  L: "Fortbildung und Rückzahlung", M: "Wettbewerbsverbote", N: "Vertragsstrafe", O: "Abtretung und Aufrechnung", P: "Beendigung",
  Q: "Ausschlussfristen und Schlussbestimmungen", S: "Weitere Bausteine",
};

/** Alle Vertragsarten außer Ausbildung (Standard für Bausteine, die § 12 BBiG nicht berührt, aber Arbeitnehmerbausteine sind). */
export const ARBEITNEHMER: Vertragsart[] = ["arbeitsvertrag", "befristet", "teilzeit", "minijob", "werkstudent", "aenderung"];
/** Ohne Werkstudium und Ausbildung (z. B. Provision und Zielbonus, Katalog Abschnitt 9 Nr. 3). */
export const OHNE_WS: Vertragsart[] = ["arbeitsvertrag", "befristet", "teilzeit", "minijob", "aenderung"];
/** Auch im Berufsausbildungsvertrag zulässig (Katalog Abschnitt 9 Nr. 3: nur L1, K und Q). */
export const MIT_AUSBILDUNG: Vertragsart[] = [...ARBEITNEHMER, "ausbildung"];
