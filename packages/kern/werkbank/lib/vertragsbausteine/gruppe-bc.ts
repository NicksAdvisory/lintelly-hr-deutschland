/**
 * Gruppe B (Tätigkeit und Ort, B1 bis B7) und C (Arbeitszeit, C1 bis C12) aus dem Katalog Abschnitt 4.
 * Prüfregeln P-020 bis P-039 und K-05, K-06, K-07, K-35, K-40. C1 ersetzt den festen § 5 des Arbeitsvertrags.
 * Kein Text hier ist Endwortlaut: Die Kanzlei gibt jede Bausteinversion frei. Alle Rechtszahlen kommen aus lib/regeln/werte.ts.
 */
import { BBG_RV_MONAT, MINDESTLOHN, WERTE, monateText, wertZu, wochenText } from "@/lib/regeln/werte";
import { compare, formatDE } from "@/lib/regeln/datum";
import type { Baustein, Lage } from "./typen";
import { ARBEITNEHMER } from "./typen";
import { anteil, euro, hat, leer, liste, mindestlohnAm, monatsstunden, num, prozent, regel, stundenlohn, wenn, wert, zahl, zahlText } from "./hilfen";
import { uhr } from "@/lib/format";
import { anzahlEn, euroEn, frei, zahlEn } from "@/lib/dokumente/englisch";

const katalog = (id: string) => `Katalog Abschnitt 4, Baustein ${id}`;

/* B */
const B1_GLEICH = "nur gleichwertige Tätigkeit";
const B1_NIEDRIGER = "vorübergehend auch niedriger bewertete Tätigkeit";
/** Absätze mit laufender Nummer "(1)", "(2)" …, damit bedingte Absätze keine Lücke reißen. */
const nummeriert = (absaetze: string[]) => absaetze.map((t, i) => `(${i + 1}) ${t}`).join("\n");
const B2_RADIUS = "Radius um den Standort";
const B2_ORTE = "genannte Standorte";
/** Entscheidung 24 (Nick 23.10.2026): Versetzung an jeden Standort desselben Arbeitgebers im Inland, wie § 106 GewO es erlaubt. Warnung statt Sperre (P-021). */
const B2_INLAND = "alle Standorte des Arbeitgebers in Deutschland";
const B2_GRENZENLOS = /bundesweit|weltweit|europaweit|überall|jeden ort|jeden standort/i;
const B2_KONZERN = /konzern|andere gesellschaft|verbundene[ns]? unternehmen|tochtergesellschaft|schwestergesellschaft/i;
const B3_AUSLAND = "außerhalb der EU und des EWR";
const B3_ORTE = ["Wohnung in Deutschland", "Deutschland", "EU und EWR", B3_AUSLAND];

/* C */
const C1_FREIZEIT = "Freizeitausgleich";
const C1_VERGUETUNG = "Vergütung";
const C1_WAHL = "Wahl des Arbeitgebers zwischen Freizeit und Vergütung";
const C6_NACHT = ["Drei-Schicht mit Nachtschicht", "feste Nachtschicht", "Wechselschicht mit Nachtschicht"];
const KEIN_AUSGLEICH = "kein Ausgleich";

/** Ausgleichszeitraum für C1: eingetragen, sonst Standard; bei Stundenlohn nahe am Mindestlohn höchstens der Zeitraum des § 2 Abs. 2 MiLoG. */
function c1Zeitraum(eingabe: string | undefined, gehalt: number, wochenstunden: number, grenze: number, datum: string): { monate: number; gesetzt: boolean; nah: boolean } {
  const nah = stundenlohn(gehalt, wochenstunden, grenze) < mindestlohnAm(datum);
  const n = zahl(eingabe);
  if (n) return { monate: n, gesetzt: false, nah };
  const standard = WERTE.vertragStandards.ueberstundenAusgleichMonate;
  return { monate: nah ? Math.min(standard, WERTE.milogKonto.ausgleichMonate) : standard, gesetzt: true, nah };
}

/** Rechnerischer Stundenlohn mit Überstundenpauschale (C2) am Datum unter dem Mindestlohn? */
const c2Lohn = (l: Lage) => stundenlohn(l.person.gehalt, l.person.wochenstunden, num(l, "C2", "stunden") ?? 0);
/** Mindestlohnbezug des Arbeitszeitkontos: Minijob oder das feste Gehalt deckt die Plusstunden nicht zum Mindestlohn (§ 2 Abs. 2 Satz 3 MiLoG). */
const c3Mindestlohn = (l: Lage) => l.person.beschaeftigung === "minijob" || stundenlohn(l.person.gehalt, l.person.wochenstunden, num(l, "C3", "plusMax") ?? 0) < mindestlohnAm(l.person.eintritt);

/* Englische Fassung (Zweisprachigkeit, Nick 23.10.2026): Auswahlwerte über diese Tabellen, nie den deutschen Wert einsetzen. */
const monateEn = (n: number) => anzahlEn(n, "month", "months");
const wochenEn = (n: number) => anzahlEn(n, "week", "weeks");
const prozentEn = (a: number) => `${zahlEn(a * 100)} per cent`;
/** 6 ergibt "06:00", 19.5 ergibt "19:30". */
const uhrEn = (stunden: number) => {
  const min = Math.round(stunden * 60);
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
};
/** Englische Formulierung zum Auswahlwert; unbekannter Wert als freie Eingabe, leer als Platzhalter. */
const wahlEn = (tabelle: Record<string, string>, wert: string | undefined, platzhalter: string) => tabelle[wert ?? ""] ?? (frei(wert) || platzhalter);
const B2_KOSTEN_EN: Record<string, string> = {
  "Arbeitgeber trägt Umzugskosten und zusätzliche Fahrtkosten": "the Employer bears the removal costs and any additional travel costs",
  "Arbeitgeber trägt zusätzliche Fahrtkosten": "the Employer bears any additional travel costs",
  "keine Kostenübernahme": "costs are not reimbursed",
};
const B3_AUSSTATTUNG_EN: Record<string, string> = {
  Firmenlaptop: "company laptop", "Bildschirm und Zubehör": "monitor and accessories", Firmenhandy: "company mobile phone", "Zuschuss zur Einrichtung": "allowance towards setting up the workspace",
};
const B5_GEBIET_EN: Record<string, string> = { Inland: "within Germany", EU: "within the EU", weltweit: "worldwide" };
const B5_VERKEHR_EN: Record<string, string> = { Pkw: "car", Bahn: "rail", Flug: "air" };
const B6_ERSTATTUNG_EN: Record<string, string> = {
  "nach der Reisekostenrichtlinie": "in accordance with the travel expenses policy",
  "nach den steuerlichen Pauschalen": "in accordance with the flat rates permitted under tax law",
};
const B7_SV_EN: Record<string, string> = {
  "A1-Bescheinigung beantragt": "A1 certificate applied for",
  "Sozialversicherungsabkommen geprüft": "social security agreement reviewed",
  "Prüfung durch Kanzlei oder Lohnbüro": "review by a law firm or payroll office",
};
const C4_ERFASSUNG_EN: Record<string, string> = {
  "elektronisches Zeiterfassungssystem": "electronic time recording system",
  "Selbsterfassung durch die Person, wöchentliche Abgabe": "self-recording by the employee, submitted weekly",
};
const C6_MODELL_EN: Record<string, string> = {
  "Frühschicht und Spätschicht": "early shift and late shift",
  "Drei-Schicht mit Nachtschicht": "three-shift system including night shift",
  "feste Nachtschicht": "permanent night shift",
  "Wechselschicht mit Nachtschicht": "rotating shifts including night shift",
};
const C10_VORAUSSETZUNG_EN: Record<string, string> = {
  "erheblicher Arbeitsausfall mit Anzeige bei der Agentur für Arbeit": "a significant loss of work, notified to the Federal Employment Agency",
  "Betriebsvereinbarung über Kurzarbeit und Anzeige bei der Agentur für Arbeit": "a works agreement on short-time work and notification to the Federal Employment Agency",
};
const C10_UMFANG_EN: Record<string, string> = { "teilweise Verkürzung": "partial reduction", "Verkürzung bis auf null": "reduction to zero" };
const C12_ART_EN: Record<string, string> = {
  "Wertguthaben (Zeitwertkonto)": "long-term value credit account (Wertguthaben)",
  Jahresarbeitszeitkonto: "annual working time account",
  Sabbatical: "sabbatical account",
};
const C12_BEWERTUNG_EN: Record<string, string> = { "in Zeit": "in hours", "in Geld": "in money" };
const C12_INSOLVENZ_EN: Record<string, string> = {
  "doppelseitige Treuhand": "two-way trust arrangement (doppelseitige Treuhand)",
  Versicherungsmodell: "insurance model",
  Bankbürgschaft: "bank guarantee",
};

export const BAUSTEINE_BC: Baustein[] = [
  {
    id: "B1", gruppe: "B", label: "Erweiterte Tätigkeit und Umsetzung", labelEn: "Extended duties and reassignment", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Teams mit wechselnden Aufgaben und kleine Firmen, in denen Beschäftigte flexibel eingesetzt werden.",
    felder: [
      { id: "rahmen", label: "Rahmen der Tätigkeit (Berufsbild oder Entgeltgruppe)", typ: "text", pflicht: true },
      { id: "umfang", label: "Was darf zugewiesen werden", typ: "auswahl", pflicht: true, standard: B1_GLEICH, optionen: [B1_GLEICH, B1_NIEDRIGER] },
      { id: "dauerMonate", label: "Höchstdauer der niedriger bewerteten Tätigkeit in Monaten", typ: "zahl", pflicht: true, min: 1, standard: String(WERTE.vertragStandards.voruebergehendMonate), bei: { umfang: [B1_NIEDRIGER] } },
      { id: "entgeltschutz", label: "Entgelt bleibt in voller Höhe", typ: "janein", pflicht: true, standard: "ja", bei: { umfang: [B1_NIEDRIGER] } },
    ],
    text: (w, k) => [
      `(1) Der Arbeitgeber kann ${k.vorname} im Rahmen des Berufsbilds ${w.rahmen || "[Berufsbild]"} auch andere gleichwertige Aufgaben zuweisen. Er berücksichtigt dabei die Fähigkeiten und die Interessen von ${k.vorname} nach billigem Ermessen. Das Entgelt bleibt gleich.`,
      ...(w.umfang === B1_NIEDRIGER ? [`(2) Aus dringenden betrieblichen Gründen kann der Arbeitgeber vorübergehend, höchstens für ${monateText(zahl(w.dauerMonate) ?? WERTE.vertragStandards.voruebergehendMonate)}, auch eine niedriger bewertete Tätigkeit zuweisen. Das Entgelt und der Status bleiben in dieser Zeit unverändert.`] : []),
      `(${w.umfang === B1_NIEDRIGER ? 3 : 2}) Eine dauerhafte Änderung der Tätigkeit mit geringerem Entgelt ist nur durch Vereinbarung oder Änderungskündigung möglich. Rechte eines Betriebsrats bleiben unberührt.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) The Employer may assign ${k.vorname} other equivalent duties within the job profile ${frei(w.rahmen) || "[job profile]"}. In doing so, it takes into account the skills and interests of ${k.vorname} at its reasonable discretion. The pay remains the same.`,
      ...(w.umfang === B1_NIEDRIGER ? [`(2) For urgent operational reasons, the Employer may also assign a lower-graded activity on a temporary basis, for no longer than ${monateEn(zahl(w.dauerMonate) ?? WERTE.vertragStandards.voruebergehendMonate)}. Pay and status remain unchanged during this period.`] : []),
      `(${w.umfang === B1_NIEDRIGER ? 3 : 2}) A permanent change of duties with lower pay is only possible by agreement or by notice of termination with an offer of amended terms (Änderungskündigung). The rights of a works council remain unaffected.`,
    ].join("\n"),
    normen: ["§ 106 GewO", "§ 307 BGB", "§ 308 Nr. 4 BGB", "§ 99 BetrVG"],
    quellen: ["https://www.gesetze-im-internet.de/gewo/__106.html", "https://www.gesetze-im-internet.de/bgb/__307.html", "https://www.gesetze-im-internet.de/betrvg/__99.html", katalog("B1")],
    urteile: [{ az: "BAG 9 AZR 36/09 (13.04.2010)", kennung: "P" }, { az: "BAG 10 AZR 275/09 (25.08.2010)", kennung: "P" }],
    schutz: ["Zuweisung nur gleichwertiger Tätigkeit bei gleicher Vergütung.", "Niedriger bewertete Tätigkeit nur vorübergehend mit Höchstdauer und vollem Entgelt.", "Interessen der Person werden berücksichtigt."],
    sperren: ["Zuweisung jeder Tätigkeit oder geringerwertiger ohne Entgeltschutz.", "Verlust von Entgelt oder Status ohne Änderungskündigung."],
    stichwoerter: ["Versetzung", "Umsetzung", "andere Aufgaben", "Tätigkeit ändern", "Weisungsrecht", "flexibel einsetzen"],
    regeln: [
      regel("P-020", "sperre", "B1 mit geringerwertiger Tätigkeit ohne Frist oder Entgeltschutz", "§ 106 GewO, § 307 BGB", ["B1"],
        (l) => wenn(hat(l, "B1") && (/jede/i.test(wert(l, "B1", "umfang")) || (wert(l, "B1", "umfang") === B1_NIEDRIGER && (!num(l, "B1", "dauerMonate") || wert(l, "B1", "entgeltschutz") !== "ja"))),
          `Eine niedriger bewertete Tätigkeit darf nur vorübergehend und mit vollem Entgelt zugewiesen werden. Trag eine Höchstdauer ein (Standard ${monateText(WERTE.vertragStandards.voruebergehendMonate)}) und lass das Entgelt unverändert.`)),
    ],
  },
  {
    id: "B2", gruppe: "B", label: "Versetzung an einen anderen Ort oder Standort", labelEn: "Transfer to another place or site", risiko: "gelb", version: 2, fuer: ARBEITNEHMER,
    passt: "Firmen mit mehreren Standorten und Außendienst.",
    felder: [
      { id: "standort", label: "Arbeitsort (Standort)", typ: "text", pflicht: true },
      { id: "grenze", label: "Räumliche Grenze der Versetzung", typ: "auswahl", pflicht: true, optionen: [B2_RADIUS, B2_ORTE, B2_INLAND], hinweis: "Ohne Radius oder Standortliste hängt jede Versetzung am billigen Ermessen im Einzelfall. Radius oder Liste sind sicherer." },
      { id: "radiusKm", label: "Radius in Kilometern", typ: "zahl", pflicht: true, min: 1, bei: { grenze: [B2_RADIUS] } },
      { id: "orte", label: "Standorte, an die versetzt werden kann", typ: "lang", pflicht: true, bei: { grenze: [B2_ORTE] } },
      { id: "ankuendigungWochen", label: "Ankündigung in Wochen", typ: "zahl", pflicht: true, min: 1, standard: String(WERTE.vertragStandards.versetzungAnkuendigungWochen) },
      { id: "kosten", label: "Kosten", typ: "auswahl", pflicht: true, standard: "Arbeitgeber trägt Umzugskosten und zusätzliche Fahrtkosten",
        optionen: ["Arbeitgeber trägt Umzugskosten und zusätzliche Fahrtkosten", "Arbeitgeber trägt zusätzliche Fahrtkosten", "keine Kostenübernahme"] },
      { id: "andereGesellschaft", label: "Versetzung auch in eine andere Gesellschaft (Konzern)", typ: "janein", standard: "nein", hinweis: "Ein Wechsel des Arbeitgebers geht nur mit Zustimmung der Person per Änderungsvertrag." },
    ],
    text: (w, k) => {
      const gebiet = w.grenze === B2_ORTE ? `an einen der folgenden Standorte: ${(w.orte ?? "").split("\n").map((s) => s.trim()).filter(Boolean).join("; ") || "[Standorte]"}` : w.grenze === B2_INLAND ? "an einen anderen Standort des Arbeitgebers in Deutschland" : `an einen anderen Standort im Umkreis von ${w.radiusKm || "[Radius]"} km um ${w.standort || "[Standort]"}`;
      return [
        `(1) Arbeitsort ist ${w.standort || "[Standort]"}.`,
        `(2) Der Arbeitgeber kann ${k.vorname} ${gebiet} versetzen, wenn es betrieblich nötig ist und die Interessen von ${k.vorname}, auch familiäre und soziale Belange, angemessen berücksichtigt sind. Die Tätigkeit bleibt gleichwertig.`,
        `(3) Der Arbeitgeber kündigt die Versetzung mindestens ${wochenText(zahl(w.ankuendigungWochen) ?? WERTE.vertragStandards.versetzungAnkuendigungWochen)} vorher in Textform an.`,
        `(4) Kosten: ${w.kosten || "[Kostenregel]"}.`,
        `(5) Ein Wechsel zu einer anderen Gesellschaft, auch innerhalb eines Konzerns, ist nur mit Zustimmung von ${k.vorname} in einem Änderungsvertrag möglich.`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const gebiet = w.grenze === B2_ORTE ? `to one of the following sites: ${(w.orte ?? "").split("\n").map((s) => s.trim()).filter(Boolean).join("; ") || "[sites]"}` : w.grenze === B2_INLAND ? "to another site of the Employer in Germany" : `to another site within a radius of ${w.radiusKm || "[radius]"} km of ${w.standort || "[site]"}`;
      return [
        `(1) The place of work is ${w.standort || "[site]"}.`,
        `(2) The Employer may transfer ${k.vorname} ${gebiet} if this is operationally necessary and the interests of ${k.vorname}, including family and social concerns, are reasonably taken into account. The activity remains equivalent.`,
        `(3) The Employer gives at least ${wochenEn(zahl(w.ankuendigungWochen) ?? WERTE.vertragStandards.versetzungAnkuendigungWochen)} notice of the transfer in text form.`,
        `(4) Costs: ${wahlEn(B2_KOSTEN_EN, w.kosten, "[cost rule]")}.`,
        `(5) A move to another company, including within a group of companies, is only possible with the consent of ${k.vorname} in an amendment agreement.`,
      ].join("\n");
    },
    normen: ["§ 106 GewO", "§ 307 BGB", "§ 2 Abs. 1 Satz 2 Nr. 4 NachwG"],
    quellen: ["https://www.gesetze-im-internet.de/gewo/__106.html", "https://www.gesetze-im-internet.de/nachwg/__2.html", katalog("B2")],
    urteile: [{ az: "BAG 9 AZR 36/09 (13.04.2010)", kennung: "P" }],
    schutz: ["Arbeitsort festgelegt, Versetzung auf Standorte oder Radius begrenzt.", "Wechsel in andere Gesellschaft nur mit Zustimmung (R13).", "Ankündigungsfrist ist Pflicht."],
    sperren: ["Versetzung ins Ausland über diesen Baustein (dafür B7).", "Versetzung ins Ausland ohne Kostenregel.", "Versetzung in eine andere Gesellschaft."],
    stichwoerter: ["Versetzung", "Standort", "Arbeitsort", "Umzug", "Filiale", "Niederlassung", "Außendienst", "Ortswechsel"],
    regeln: [
      // Entscheidung 24 (Nick 23.10.2026): Warnung statt Sperre. Eine Versetzungsklausel im Rahmen von § 106 GewO hält die BAG-Linie für wirksam (Aktenzeichen prüfen).
      regel("P-021", "warnung", "B2 ohne räumliche Grenze (Radius oder Orte)", "§ 106 GewO, § 307 BGB", ["B2"], (l) => {
        const g = wert(l, "B2", "grenze");
        const ohne = leer(g) || g === B2_INLAND || (g === B2_RADIUS && !num(l, "B2", "radiusKm")) || (g === B2_ORTE && leer(wert(l, "B2", "orte"))) || B2_GRENZENLOS.test(`${wert(l, "B2", "orte")} ${wert(l, "B2", "standort")}`);
        return wenn(hat(l, "B2") && ohne, "Die Versetzung hat keine räumliche Grenze. Das trägt nur, solange jede einzelne Versetzung billigem Ermessen entspricht (§ 106 GewO). Ein Radius in Kilometern oder eine Liste von Standorten ist sicherer. Ins Ausland geht es so nicht (dafür B7).");
      }),
      regel("P-022", "sperre", "B2 mit Versetzung in eine andere Gesellschaft", "§ 613 BGB, § 106 GewO (R13)", ["B2"],
        (l) => wenn(hat(l, "B2") && (wert(l, "B2", "andereGesellschaft") === "ja" || B2_KONZERN.test(wert(l, "B2", "orte"))),
          "Eine Versetzung in eine andere Gesellschaft ist ein Wechsel des Arbeitgebers und braucht die Zustimmung der Person. Versetze nur an Standorte desselben Arbeitgebers. Für einen Wechsel nutze einen Änderungsvertrag.")),
    ],
  },
  {
    id: "B3", gruppe: "B", label: "Mobiles Arbeiten und Homeoffice", labelEn: "Mobile work and working from home", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Büro-, Wissens- und Verwaltungsarbeit.",
    felder: [
      { id: "umfang", label: "Umfang", typ: "auswahl", pflicht: true, standard: "bis zu einer Zahl von Tagen pro Woche", optionen: ["bis zu einer Zahl von Tagen pro Woche", "feste Tage", "nach Absprache"] },
      { id: "tage", label: "Tage pro Woche", typ: "zahl", pflicht: true, min: 1, bei: { umfang: ["bis zu einer Zahl von Tagen pro Woche"] } },
      { id: "festeTage", label: "Feste Tage", typ: "text", pflicht: true, bei: { umfang: ["feste Tage"] } },
      { id: "ort", label: "Ort", typ: "auswahl", pflicht: true, standard: "Wohnung in Deutschland", optionen: B3_ORTE },
      { id: "auslandPruefung", label: "Prüfung durch Steuerberatung und Kanzlei (Steuer, Sozialversicherung, Datenschutz)", typ: "lang", pflicht: true, bei: { ort: [B3_AUSLAND] },
        hinweis: "Wer und mit welchem Ergebnis geprüft hat. Ohne diese Angabe sperrt Lintelly den Vertrag." },
      { id: "anspruch", label: "Anspruch", typ: "auswahl", pflicht: true, standard: "kein Rechtsanspruch, nach Absprache", optionen: ["kein Rechtsanspruch, nach Absprache", "Anspruch im vereinbarten Umfang"] },
      { id: "widerrufWochen", label: "Ankündigung bei Änderung oder Widerruf in Wochen", typ: "zahl", pflicht: true, min: 1, standard: String(WERTE.vertragStandards.versetzungAnkuendigungWochen) },
      { id: "ausstattung", label: "Ausstattung", typ: "mehrfach", standard: "Firmenlaptop", optionen: ["Firmenlaptop", "Bildschirm und Zubehör", "Firmenhandy", "Zuschuss zur Einrichtung"] },
      { id: "kosten", label: "Kosten", typ: "auswahl", pflicht: true, standard: "keine Erstattung", optionen: ["keine Erstattung", "monatliche Pauschale"] },
      { id: "pauschale", label: "Pauschale pro Monat", typ: "betrag", pflicht: true, min: 0, bei: { kosten: ["monatliche Pauschale"] }, hinweis: "Die Pauschale kommt zum Gehalt dazu und mindert es nie." },
      { id: "erreichbarkeit", label: "Erreichbarkeit", typ: "text" },
    ],
    text: (w, k) => {
      const umfang = w.umfang === "feste Tage" ? `an folgenden Tagen: ${w.festeTage || "[Tage]"}` : w.umfang === "nach Absprache" ? "nach Absprache mit der Führungskraft" : `an bis zu ${w.tage || "[Zahl]"} Tagen pro Woche`;
      const ort = w.ort === "Wohnung in Deutschland" ? "der eigenen Wohnung in Deutschland" : w.ort === B3_AUSLAND ? "einem Ort außerhalb der EU und des EWR" : w.ort === "EU und EWR" ? "einem Ort in der EU oder im EWR" : "einem Ort in Deutschland";
      const ausst = liste(w.ausstattung);
      return [
        `(1) ${k.vorname} kann ${umfang} mobil von ${ort} aus arbeiten.${w.anspruch === "Anspruch im vereinbarten Umfang" ? " Darauf besteht im vereinbarten Umfang ein Anspruch." : " Ein Rechtsanspruch darauf besteht nicht."}`,
        `(2) Der Arbeitgeber kann Umfang und Ort aus sachlichen betrieblichen Gründen ändern oder die Erlaubnis widerrufen. Er nennt den Grund und kündigt die Änderung mindestens ${wochenText(zahl(w.widerrufWochen) ?? WERTE.vertragStandards.versetzungAnkuendigungWochen)} vorher in Textform an.`,
        `(3) Ausstattung: ${ausst.length ? ausst.join(", ") : "nach Absprache"}. Kosten: ${w.kosten === "monatliche Pauschale" ? `der Arbeitgeber zahlt zusätzlich zum Gehalt eine Pauschale von ${euro(zahl(w.pauschale) ?? 0)} im Monat` : "eine Erstattung erfolgt nicht"}.${w.erreichbarkeit ? ` Erreichbarkeit: ${w.erreichbarkeit}.` : ""}`,
        `(4) Die Arbeitszeit wird auch beim mobilen Arbeiten vollständig erfasst. Höchstarbeitszeit, Pausen und Ruhezeiten nach dem Arbeitszeitgesetz gelten unverändert.`,
        `(5) ${k.vorname} schützt Daten und Unterlagen vor dem Zugriff Dritter, nutzt nur die vom Arbeitgeber freigegebenen Geräte und Verbindungen und sperrt den Bildschirm beim Verlassen des Arbeitsplatzes.`,
        `(6) Der Arbeitgeber bezieht das mobile Arbeiten in die Gefährdungsbeurteilung ein und unterweist ${k.vorname} dazu.`,
        ...(w.ort === B3_AUSLAND ? [`(7) Die Arbeit von außerhalb der EU und des EWR ist nur nach folgender Prüfung erlaubt: ${w.auslandPruefung || "[Prüfung]"}.`] : w.ort === "EU und EWR" ? [`(7) Arbeit aus einem anderen Staat zeigt ${k.vorname} vorher in Textform an, damit Steuer und Sozialversicherung geprüft werden können.`] : []),
      ].join("\n");
    },
    textEn: (w, k) => {
      const umfang = w.umfang === "feste Tage" ? `on the following days: ${frei(w.festeTage) || "[days]"}` : w.umfang === "nach Absprache" ? "as agreed with the line manager" : `on up to ${w.tage || "[number]"} days per week`;
      const ort = w.ort === "Wohnung in Deutschland" ? "their own home in Germany" : w.ort === B3_AUSLAND ? "a place outside the EU and the EEA" : w.ort === "EU und EWR" ? "a place in the EU or the EEA" : "a place in Germany";
      const ausst = liste(w.ausstattung).map((a) => wahlEn(B3_AUSSTATTUNG_EN, a, ""));
      return [
        `(1) ${k.vorname} may work remotely ${umfang} from ${ort}.${w.anspruch === "Anspruch im vereinbarten Umfang" ? " There is an entitlement to this to the agreed extent." : " There is no legal entitlement to this."}`,
        `(2) The Employer may change the extent and the place for objective operational reasons or revoke the permission. It states the reason and gives at least ${wochenEn(zahl(w.widerrufWochen) ?? WERTE.vertragStandards.versetzungAnkuendigungWochen)} notice of the change in text form.`,
        `(3) Equipment: ${ausst.length ? ausst.join(", ") : "as agreed"}. Costs: ${w.kosten === "monatliche Pauschale" ? `the Employer pays a flat rate of ${euroEn(zahl(w.pauschale) ?? 0)} per month in addition to the salary` : "no reimbursement is made"}.${w.erreichbarkeit ? ` Availability: ${frei(w.erreichbarkeit)}.` : ""}`,
        `(4) Working time is recorded in full, including when working remotely. Maximum working hours, breaks and rest periods under the Working Hours Act (Arbeitszeitgesetz) remain unchanged.`,
        `(5) ${k.vorname} protects data and documents from access by third parties, uses only devices and connections approved by the Employer and locks the screen when leaving the workstation.`,
        `(6) The Employer includes mobile work in the risk assessment and instructs ${k.vorname} accordingly.`,
        ...(w.ort === B3_AUSLAND ? [`(7) Work from outside the EU and the EEA is only permitted after the following review: ${frei(w.auslandPruefung) || "[review]"}.`] : w.ort === "EU und EWR" ? [`(7) ${k.vorname} notifies the Employer in text form in advance of any work from another state, so that tax and social security can be reviewed.`] : []),
      ].join("\n");
    },
    normen: ["§ 106 GewO", "ArbSchG", "§ 8 Abs. 1a SGB VII", "§ 87 Abs. 1 Nr. 14 BetrVG", "Art. 32 DSGVO"],
    quellen: ["https://www.gesetze-im-internet.de/gewo/__106.html", "https://www.gesetze-im-internet.de/sgb_7/__8.html", "https://www.gesetze-im-internet.de/betrvg/__87.html", katalog("B3")],
    urteile: [{ az: "Linie der Instanzgerichte: kein genereller Anspruch auf Homeoffice, Widerruf braucht sachlichen Grund, Aktenzeichen prüfen", kennung: "P" }],
    schutz: ["Widerruf mit Ankündigungsfrist und Grund.", "Ort außerhalb der EU nur mit Zusatzfeld zur Prüfung.", "Pflichtsätze zu Zeiterfassung, Datenschutz und Arbeitsschutz."],
    sperren: ["Ort außerhalb der EU ohne Prüfung.", "Kostenpauschale, die den Mindestlohn mindert.", "Verzicht auf Arbeitsschutz."],
    stichwoerter: ["Homeoffice", "mobiles Arbeiten", "remote", "von zu Hause", "Remote Work", "Workation", "Ausland arbeiten", "Telearbeit"],
    regeln: [
      regel("P-023", "pflicht", "B3 gewählt: Standardsätze zu Zeiterfassung, Datenschutz und Widerruf", "ArbSchG, Art. 32 DSGVO", ["B3"],
        (l) => wenn(hat(l, "B3"), "Ergänzt: Die Arbeitszeit wird auch mobil erfasst, Datenschutz beim mobilen Arbeiten, Widerruf nur aus sachlichem Grund mit Ankündigung, Gefährdungsbeurteilung und Unterweisung.")),
      regel("P-024", "sperre", "B3 mit Arbeitsort außerhalb EU/EWR ohne Prüfung", "Steuerrecht, Sozialversicherung (Art. 11 ff. VO (EG) 883/2004), Art. 44 ff. DSGVO", ["B3"],
        (l) => wenn(hat(l, "B3") && wert(l, "B3", "ort") === B3_AUSLAND && leer(wert(l, "B3", "auslandPruefung")),
          "Arbeit außerhalb der EU und des EWR kann Steuerpflicht, Sozialversicherung und Datenübermittlung ändern. Trag ein, wer das geprüft hat (Steuerberatung und Kanzlei). Bis dahin bleibt der Vertrag gesperrt.")),
      regel("K-40", "pflicht", "B3 Homeoffice im Ausland: Zusatzprüfung als Pflichtfeld", "Steuer, Sozialversicherung", ["B3"],
        (l) => wenn(hat(l, "B3") && wert(l, "B3", "ort") === B3_AUSLAND, "Ort außerhalb der EU und des EWR: Das Feld zur Prüfung durch Steuerberatung und Kanzlei ist jetzt Pflicht und steht im Vertragstext.")),
    ],
  },
  {
    id: "B4", gruppe: "B", label: "Telearbeitsplatz (fester Arbeitsplatz zu Hause)", labelEn: "Telework station (fixed workplace at home)", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Dauerhafter, vom Arbeitgeber eingerichteter Bildschirmarbeitsplatz in der Wohnung.",
    felder: [
      { id: "adresse", label: "Adresse des Telearbeitsplatzes", typ: "text", pflicht: true },
      { id: "ausstattung", label: "Ausstattung durch den Arbeitgeber", typ: "lang", pflicht: true },
      { id: "pauschale", label: "Kostenpauschale pro Monat (Strom, Heizung, Raum)", typ: "betrag", min: 0 },
      { id: "rueckkehr", label: "Rückkehrrecht an einen Arbeitsplatz im Betrieb", typ: "janein", pflicht: true, standard: "ja" },
    ],
    text: (w, k) => [
      `(1) ${k.vorname} arbeitet an einem vom Arbeitgeber eingerichteten Telearbeitsplatz in der Wohnung unter folgender Adresse: ${w.adresse || "[Adresse]"}.`,
      `(2) Der Arbeitgeber stellt folgende Ausstattung und hält sie instand: ${w.ausstattung || "[Ausstattung]"}. Er erstellt vorher eine Gefährdungsbeurteilung und unterweist ${k.vorname}.`,
      `(3) Der Arbeitgeber oder von ihm beauftragte Personen betreten die Wohnung nur nach vorheriger Ankündigung und mit Zustimmung von ${k.vorname}. Die Zustimmung kann jederzeit verweigert oder widerrufen werden.`,
      w.pauschale ? `(4) Für die Kosten des Arbeitsplatzes zahlt der Arbeitgeber zusätzlich eine Pauschale von ${euro(zahl(w.pauschale) ?? 0)} im Monat.` : "(4) Für Kosten des Arbeitsplatzes gilt § 670 BGB.",
      `(5) Die Arbeitszeit wird erfasst. Daten und Unterlagen schützt ${k.vorname} vor dem Zugriff Dritter.${w.rueckkehr === "ja" ? ` ${k.vorname} kann mit einer Ankündigung in Textform an einen Arbeitsplatz im Betrieb zurückkehren.` : ""}`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${k.vorname} works at a telework station set up by the Employer in their home at the following address: ${w.adresse || "[address]"}.`,
      `(2) The Employer provides and maintains the following equipment: ${frei(w.ausstattung) || "[equipment]"}. It carries out a risk assessment beforehand and instructs ${k.vorname}.`,
      `(3) The Employer or persons engaged by it enter the home only after prior notice and with the consent of ${k.vorname}. Consent may be refused or withdrawn at any time.`,
      w.pauschale ? `(4) To cover the costs of the workstation, the Employer additionally pays a flat rate of ${euroEn(zahl(w.pauschale) ?? 0)} per month.` : "(4) § 670 BGB applies to the costs of the workstation.",
      `(5) Working time is recorded. ${k.vorname} protects data and documents from access by third parties.${w.rueckkehr === "ja" ? ` ${k.vorname} may return to a workstation on the Employer's premises by giving notice in text form.` : ""}`,
    ].join("\n"),
    normen: ["§ 2 Abs. 7 ArbStättV", "Art. 13 GG", "§ 670 BGB", "ArbSchG"],
    quellen: ["https://www.gesetze-im-internet.de/bgb/__670.html", "https://www.gesetze-im-internet.de/arbst_ttv_2004/__2.html", katalog("B4")],
    schutz: ["Zutritt nur nach Ankündigung und mit widerruflicher Zustimmung.", "Gefährdungsbeurteilung ist Pflicht."],
    sperren: ["Pflicht zum Zutritt ohne Ankündigung."],
    stichwoerter: ["Telearbeit", "Telearbeitsplatz", "Heimarbeitsplatz", "fester Homeoffice-Platz", "Arbeitsstättenverordnung"],
  },
  {
    id: "B5", gruppe: "B", label: "Reisetätigkeit", labelEn: "Travel", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Außendienst, Beratung, Vertrieb und Projektarbeit.",
    felder: [
      { id: "anteil", label: "Anteil der Arbeitszeit auf Reisen (Prozent)", typ: "prozent", pflicht: true, min: 0, max: 100 },
      { id: "naechte", label: "Übernachtungen pro Monat (ungefähr)", typ: "zahl", min: 0 },
      { id: "gebiet", label: "Reisegebiet", typ: "auswahl", pflicht: true, optionen: ["Inland", "EU", "weltweit"] },
      { id: "verkehrsmittel", label: "Verkehrsmittel", typ: "mehrfach", optionen: ["Pkw", "Bahn", "Flug"] },
      { id: "ruecksicht", label: "Rücksicht auf Pflege und Kinderbetreuung", typ: "janein", standard: "ja" },
    ],
    text: (w, k) => [
      `(1) Zur Tätigkeit gehören Dienstreisen (${w.gebiet || "[Gebiet]"}) im Umfang von etwa ${prozent(anteil(w.anteil) ?? 0)} der Arbeitszeit${zahl(w.naechte) ? ` mit etwa ${w.naechte} Übernachtungen im Monat` : ""}.${liste(w.verkehrsmittel).length ? ` Verkehrsmittel: ${liste(w.verkehrsmittel).join(", ")}.` : ""}`,
      `(2) Reisen werden vorher abgestimmt.${w.ruecksicht === "ja" ? ` Der Arbeitgeber nimmt dabei Rücksicht auf Pflege- und Betreuungspflichten von ${k.vorname}.` : ""}`,
      `(3) Ruhezeiten und Höchstarbeitszeit nach dem Arbeitszeitgesetz gelten auch auf Reisen. Reisezeit außerhalb der regelmäßigen Arbeitszeit wird vergütet oder ausgeglichen${"B6" in k.auswahl ? " wie in der Regelung zu Dienstreisen vereinbart" : ""}.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) The duties include business travel (${wahlEn(B5_GEBIET_EN, w.gebiet, "[area]")}) amounting to about ${prozentEn(anteil(w.anteil) ?? 0)} of working time${zahl(w.naechte) ? ` with about ${zahlEn(zahl(w.naechte)!)} overnight stays per month` : ""}.${liste(w.verkehrsmittel).length ? ` Means of transport: ${liste(w.verkehrsmittel).map((v) => wahlEn(B5_VERKEHR_EN, v, "")).join(", ")}.` : ""}`,
      `(2) Travel is agreed in advance.${w.ruecksicht === "ja" ? ` In doing so, the Employer takes into account the care and childcare responsibilities of ${k.vorname}.` : ""}`,
      `(3) Rest periods and maximum working hours under the Working Hours Act also apply when travelling. Travel time outside regular working hours is paid or compensated${"B6" in k.auswahl ? " as agreed in the provision on business travel" : ""}.`,
    ].join("\n"),
    normen: ["§ 106 GewO", "ArbZG", "§ 87 Abs. 1 Nr. 2 BetrVG"],
    quellen: ["https://www.gesetze-im-internet.de/gewo/__106.html", "https://www.gesetze-im-internet.de/arbzg/__5.html", katalog("B5")],
    schutz: ["Umfang wird genannt.", "Reisen außerhalb der Normalarbeitszeit nach B6 vergütet oder ausgeglichen."],
    sperren: ["Unbegrenzte Reisetätigkeit als Nebenpflicht ohne Angabe."],
    stichwoerter: ["Reisen", "Reisetätigkeit", "Außendienst", "Kundentermine", "unterwegs", "Übernachtung"],
  },
  {
    id: "B6", gruppe: "B", label: "Dienstreisen: Reisezeit, Kosten, Vorschuss", labelEn: "Business travel: travel time, expenses, advance", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Alle, die reisen.",
    felder: [
      { id: "reisezeit", label: "Reisezeit als Arbeitszeit", typ: "auswahl", pflicht: true, standard: "voll als Arbeitszeit", optionen: ["voll als Arbeitszeit", "teilweise als Arbeitszeit", "außerhalb der regelmäßigen Arbeitszeit nicht als Arbeitszeit"],
        hinweis: "Unbezahlte Reisezeit darf den Stundenschnitt nicht unter den Mindestlohn drücken." },
      { id: "anteil", label: "Anteil, der als Arbeitszeit zählt (Prozent)", typ: "prozent", pflicht: true, min: 0, max: 100, bei: { reisezeit: ["teilweise als Arbeitszeit"] } },
      { id: "reisestundenMonat", label: "Geschätzte Reisestunden je Monat außerhalb der Arbeitszeit (für die Mindestlohnprüfung)", typ: "zahl", min: 0, bei: { reisezeit: ["außerhalb der regelmäßigen Arbeitszeit nicht als Arbeitszeit"] } },
      { id: "erstattung", label: "Kostenerstattung", typ: "auswahl", pflicht: true, standard: "nach der Reisekostenrichtlinie", optionen: ["nach der Reisekostenrichtlinie", "nach den steuerlichen Pauschalen"] },
      { id: "vorschuss", label: "Vorschuss auf Antrag", typ: "janein", standard: "ja" },
      { id: "belegMonate", label: "Frist für Belege in Monaten", typ: "zahl", pflicht: true, min: WERTE.vertragStandards.reiseBelegMinMonate, standard: String(WERTE.vertragStandards.reiseBelegMinMonate) },
    ],
    text: (w, k) => {
      const rz = w.reisezeit === "teilweise als Arbeitszeit" ? `zu ${prozent(anteil(w.anteil) ?? 0)} als Arbeitszeit` : w.reisezeit === "voll als Arbeitszeit" ? "voll als Arbeitszeit" : "nur innerhalb der regelmäßigen Arbeitszeit als Arbeitszeit";
      return [
        `(1) Reisezeit für angeordnete Dienstreisen gilt ${rz}. In jedem Fall erhält ${k.vorname} für alle Arbeits- und Reisestunden zusammen mindestens den gesetzlichen Mindestlohn.`,
        `(2) Notwendige Reisekosten erstattet der Arbeitgeber ${w.erstattung || "[Regel]"}.${w.vorschuss === "ja" ? " Auf Antrag zahlt er einen angemessenen Vorschuss." : ""}`,
        `(3) ${k.vorname} reicht die Belege innerhalb von ${monateText(zahl(w.belegMonate) ?? WERTE.vertragStandards.reiseBelegMinMonate)} nach Ende der Reise in Textform ein.`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const rz = w.reisezeit === "teilweise als Arbeitszeit" ? `as working time at a rate of ${prozentEn(anteil(w.anteil) ?? 0)}` : w.reisezeit === "voll als Arbeitszeit" ? "in full as working time" : "as working time only within regular working hours";
      return [
        `(1) Travel time for business trips ordered by the Employer counts ${rz}. In any event, ${k.vorname} receives at least the statutory minimum wage for all working and travel hours combined.`,
        `(2) The Employer reimburses necessary travel expenses ${wahlEn(B6_ERSTATTUNG_EN, w.erstattung, "[rule]")}.${w.vorschuss === "ja" ? " On request, it pays a reasonable advance." : ""}`,
        `(3) ${k.vorname} submits the receipts in text form within ${monateEn(zahl(w.belegMonate) ?? WERTE.vertragStandards.reiseBelegMinMonate)} after the end of the trip.`,
      ].join("\n");
    },
    normen: ["§ 670 BGB", "§ 1 MiLoG", "EStG Reisekosten"],
    quellen: ["https://www.gesetze-im-internet.de/bgb/__670.html", "https://www.gesetze-im-internet.de/milog/__1.html", katalog("B6")],
    urteile: [{ az: "BAG 5 AZR 553/17 (17.10.2018)", kennung: "P" }],
    schutz: ["Unbezahlte Reisezeit nur, wenn der Stundenschnitt den Mindestlohn hält (P-043).", "Belegfrist nicht unter dem Standard."],
    sperren: ["Reisezeit unbezahlt bei Beschäftigten im Mindestlohnbereich."],
    stichwoerter: ["Dienstreise", "Reisekosten", "Reisezeit", "Spesen", "Vorschuss", "Belege", "Hotel"],
  },
  {
    id: "B7", gruppe: "B", label: "Auslandseinsatz und Entsendung", labelEn: "Assignment abroad and posting", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Einsätze im Ausland über einen Monat, Fachkräfte.",
    felder: [
      { id: "land", label: "Land", typ: "text", pflicht: true },
      { id: "dauerMonate", label: "Dauer in Monaten", typ: "zahl", pflicht: true, min: 1 },
      { id: "waehrung", label: "Währung der Vergütung", typ: "text", pflicht: true, standard: "Euro" },
      { id: "zulage", label: "Entsendezulage pro Monat", typ: "betrag", min: 0 },
      { id: "sachleistungen", label: "Wohnung, Heimflüge und weitere Leistungen", typ: "lang", pflicht: true },
      { id: "sozialversicherung", label: "Sozialversicherung", typ: "auswahl", pflicht: true, optionen: ["A1-Bescheinigung beantragt", "Sozialversicherungsabkommen geprüft", "Prüfung durch Kanzlei oder Lohnbüro"] },
      { id: "krankenversicherung", label: "Krankenversicherung im Ausland", typ: "text", pflicht: true },
      { id: "rueckkehr", label: "Bedingungen der Rückkehr", typ: "lang", pflicht: true },
    ],
    text: (w, k) => [
      `(1) ${k.vorname} wird für ${monateText(zahl(w.dauerMonate) ?? 1)} nach ${w.land || "[Land]"} entsandt.`,
      `(2) Die Vergütung wird in ${w.waehrung || "[Währung]"} gezahlt.${zahl(w.zulage) ? ` Für die Dauer des Einsatzes zahlt der Arbeitgeber eine Entsendezulage von ${euro(zahl(w.zulage)!)} im Monat.` : ""} Weitere Leistungen: ${w.sachleistungen || "[Leistungen]"}.`,
      `(3) Sozialversicherung: ${w.sozialversicherung || "[Stand]"}. Krankenversicherung im Ausland: ${w.krankenversicherung || "[Versicherung]"}.`,
      `(4) Rückkehr: ${w.rueckkehr || "[Bedingungen]"}.`,
      `(5) Die zwingenden Schutzvorschriften des Ziellandes bleiben unberührt. Eine Rückzahlung von Kosten gilt nur, soweit sie gesondert nach den Regeln zur Rückzahlung vereinbart ist.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${k.vorname} is posted to ${frei(w.land) || "[country]"} for ${monateEn(zahl(w.dauerMonate) ?? 1)}.`,
      `(2) Remuneration is paid in ${frei(w.waehrung) || "[currency]"}.${zahl(w.zulage) ? ` For the duration of the assignment, the Employer pays a posting allowance of ${euroEn(zahl(w.zulage)!)} per month.` : ""} Further benefits: ${frei(w.sachleistungen) || "[benefits]"}.`,
      `(3) Social security: ${wahlEn(B7_SV_EN, w.sozialversicherung, "[status]")}. Health insurance abroad: ${frei(w.krankenversicherung) || "[insurance]"}.`,
      `(4) Return: ${frei(w.rueckkehr) || "[conditions]"}.`,
      `(5) The mandatory protective provisions of the host country remain unaffected. Any repayment of costs applies only to the extent that it is agreed separately under the rules on repayment.`,
    ].join("\n"),
    normen: ["Rom-I-VO", "§ 2 Abs. 2 NachwG", "Entsenderecht des Ziellandes", "VO (EG) 883/2004 (A1-Bescheinigung)"],
    quellen: ["https://www.gesetze-im-internet.de/nachwg/__2.html", "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32008R0593", katalog("B7")],
    schutz: ["Pflichtangaben nach § 2 Abs. 2 NachwG werden verlangt.", "Rückzahlungen nur nach L4."],
    sperren: ["Entsendung ohne Prüfung der Sozialversicherung."],
    stichwoerter: ["Entsendung", "Auslandseinsatz", "Expat", "A1-Bescheinigung", "Ausland", "Abordnung"],
  },
  {
    id: "C1", gruppe: "C", label: "Überstunden: Anordnung und Ausgleich", labelEn: "Overtime: instruction and compensation", risiko: "grün", version: 1, fuer: ARBEITNEHMER, ersetzt: "§ 5",
    passt: "Alle. Ersetzt die Überstundenregel im Arbeitsvertrag.",
    felder: [
      { id: "voraussetzung", label: "Voraussetzung", typ: "auswahl", pflicht: true, standard: "Anordnung des Arbeitgebers", optionen: ["Anordnung des Arbeitgebers", "Anordnung oder vorherige Zustimmung der Führungskraft"] },
      { id: "grenzeMonat", label: "Höchstens Überstunden pro Monat", typ: "zahl", pflicht: true, min: 1 },
      { id: "ausgleich", label: "Ausgleich", typ: "auswahl", pflicht: true, standard: C1_FREIZEIT, optionen: [C1_FREIZEIT, C1_VERGUETUNG, C1_WAHL] },
      { id: "ausgleichMonate", label: "Ausgleichszeitraum in Monaten", typ: "zahl", min: 1, bei: { ausgleich: [C1_FREIZEIT, C1_WAHL] },
        hinweis: `Leer: Standard ${monateText(WERTE.vertragStandards.ueberstundenAusgleichMonate)}. Bei Stundenlohn nahe am Mindestlohn höchstens ${monateText(WERTE.milogKonto.ausgleichMonate)} (§ 2 Abs. 2 MiLoG).` },
      { id: "zuschlag", label: "Zuschlag auf vergütete Überstunden (Prozent)", typ: "prozent", min: 0 },
    ],
    text: (w, k) => {
      const grenze = zahl(w.grenzeMonat) ?? 0;
      const z = c1Zeitraum(w.ausgleichMonate, k.gehalt, k.wochenstunden, grenze, k.eintritt);
      const zu = zahl(w.zuschlag) ? ` zuzüglich eines Zuschlags von ${prozent(anteil(w.zuschlag)!)}` : "";
      const verg = `mit dem anteiligen Stundenlohn (Monatsgehalt geteilt durch die vertraglichen Monatsstunden)${zu} vergütet`;
      const ausgleich = w.ausgleich === C1_VERGUETUNG
        ? `(3) Überstunden werden ${verg}, spätestens mit der Abrechnung des Folgemonats.`
        : `(3) Überstunden werden ${w.ausgleich === C1_WAHL ? "nach Wahl des Arbeitgebers in Freizeit ausgeglichen oder vergütet" : "in Freizeit ausgeglichen"}. Der Freizeitausgleich erfolgt innerhalb von ${monateText(z.monate)} nach ihrer Entstehung. Was in diesem Zeitraum nicht ausgeglichen ist, wird ${verg}.`;
      return [
        `(1) Überstunden leistet ${k.vorname} nur auf Anordnung des Arbeitgebers${w.voraussetzung?.startsWith("Anordnung oder") ? " oder mit vorheriger Zustimmung der Führungskraft" : ""}. Die Anordnung ist nur im Rahmen des Arbeitszeitgesetzes und bis zu ${grenze ? zahlText(grenze) : "[Zahl]"} Überstunden im Monat zulässig.`,
        `(2) Überstunden sind Arbeitsstunden über die vertraglich vereinbarte regelmäßige Arbeitszeit hinaus.`,
        ausgleich,
        `(4) Die gesamte Arbeitszeit einschließlich der Überstunden wird erfasst. Der gesetzliche Mindestlohn für jede Arbeitsstunde bleibt unberührt.`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const grenze = zahl(w.grenzeMonat) ?? 0;
      const z = c1Zeitraum(w.ausgleichMonate, k.gehalt, k.wochenstunden, grenze, k.eintritt);
      const zu = zahl(w.zuschlag) ? ` plus a premium of ${prozentEn(anteil(w.zuschlag)!)}` : "";
      const verg = `paid at the pro rata hourly rate (monthly salary divided by the contractual monthly hours)${zu}`;
      const ausgleich = w.ausgleich === C1_VERGUETUNG
        ? `(3) Overtime is ${verg}, no later than with the payroll for the following month.`
        : `(3) Overtime is ${w.ausgleich === C1_WAHL ? "compensated by time off or paid, at the Employer's choice" : "compensated by time off"}. Time off in lieu is granted within ${monateEn(z.monate)} after the overtime arises. Any overtime not compensated within this period is ${verg}.`;
      return [
        `(1) ${k.vorname} works overtime only on the instruction of the Employer${w.voraussetzung?.startsWith("Anordnung oder") ? " or with the prior consent of the line manager" : ""}. Overtime may only be instructed within the limits of the Working Hours Act and up to ${grenze ? zahlEn(grenze) : "[number]"} hours of overtime per month.`,
        `(2) Overtime means hours worked in excess of the regular working time agreed in the contract.`,
        ausgleich,
        `(4) All working time, including overtime, is recorded. The statutory minimum wage for every hour worked remains unaffected.`,
      ].join("\n");
    },
    normen: ["§ 612 BGB", "§ 3 ArbZG", "§ 16 Abs. 2 ArbZG", "§ 87 Abs. 1 Nr. 3 BetrVG", "§ 2 MiLoG"],
    quellen: ["https://www.gesetze-im-internet.de/arbzg/__3.html", "https://www.gesetze-im-internet.de/arbzg/__16.html", "https://www.gesetze-im-internet.de/milog/__2.html", "https://www.gesetze-im-internet.de/bgb/__612.html", katalog("C1")],
    urteile: [{ az: "BAG 1 ABR 22/21 (13.09.2022)", kennung: "P" }, { az: "BAG 5 AZR 122/18 (04.05.2022)", kennung: "P" }, { az: "BAG 5 AZR 359/21", kennung: "P" }],
    schutz: ["„Überstunden“ und „Anordnung“ stehen im Text.", "Freizeitausgleich nur mit Zeitraum; was nicht ausgeglichen ist, wird vergütet.", "Anordnung nur im Rahmen des ArbZG."],
    sperren: ["Anordnung ohne Grenze.", "Überstundenrahmen, der über die Höchstarbeitszeit im Wochenschnitt führt."],
    stichwoerter: ["Überstunden", "Mehrarbeit", "Freizeitausgleich", "Überstundenvergütung", "Anordnung", "Zuschlag"],
    regeln: [
      regel("P-025", "pflicht", "C1 ohne Ausgleichszeitraum für Freizeitausgleich: Standard gesetzt", "§ 2 Abs. 2 MiLoG", ["C1"], (l) => {
        if (!hat(l, "C1") || wert(l, "C1", "ausgleich") === C1_VERGUETUNG || num(l, "C1", "ausgleichMonate")) return null;
        const z = c1Zeitraum(undefined, l.person.gehalt, l.person.wochenstunden, num(l, "C1", "grenzeMonat") ?? 0, l.person.eintritt);
        return `Kein Ausgleichszeitraum angegeben: Lintelly setzt ${monateText(z.monate)}${z.nah ? `, weil der Stundenlohn mit Überstunden nahe am Mindestlohn liegt (höchstens ${monateText(WERTE.milogKonto.ausgleichMonate)})` : ""}. Was danach nicht ausgeglichen ist, wird vergütet.`;
      }),
      regel("P-038", "sperre", "Wochenarbeitszeit über der Höchstarbeitszeit im Schnitt bei Überstundenrahmen", "§ 3 ArbZG", ["C1", "C2"], (l) => {
        const ueber = Math.max(num(l, "C1", "grenzeMonat") ?? 0, num(l, "C2", "stunden") ?? 0);
        const neben = num(l, "A10", "nebenStunden") ?? 0;
        const woche = l.person.wochenstunden + neben + ueber / WERTE.wochenJeMonat.wert;
        return wenn(woche > WERTE.hoechstarbeitszeitWoche.wert, `Vertragliche Arbeitszeit ${zahlText(l.person.wochenstunden)}${neben ? ` plus ${zahlText(neben)} bei anderen Arbeitgebern` : ""} plus ${zahlText(ueber)} Überstunden im Monat ergibt im Schnitt ${zahlText(Math.round(woche * 10) / 10)} Stunden pro Woche. Erlaubt sind höchstens ${WERTE.hoechstarbeitszeitWoche.wert} Stunden im Schnitt. Senke die Überstundengrenze auf höchstens ${zahlText(Math.max(0, Math.floor((WERTE.hoechstarbeitszeitWoche.wert - l.person.wochenstunden - neben) * WERTE.wochenJeMonat.wert)))} im Monat.`);
      }),
    ],
  },
  {
    id: "C2", gruppe: "C", label: "Überstundenpauschale (Abgeltung durch das Gehalt)", labelEn: "Overtime flat rate (covered by the salary)", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Führungskräfte und gut verdienende Fachkräfte. Nicht für Beschäftigte im Mindestlohnbereich.",
    felder: [
      { id: "stunden", label: "Mit dem Gehalt abgegoltene Überstunden pro Monat", typ: "zahl", pflicht: true, min: 1,
        hinweis: `Feste Zahl ist Pflicht. Mehr als ${WERTE.ueberstundenPauschaleMaxMonat.wert} nur bei Gehalt über der Beitragsbemessungsgrenze der Rentenversicherung, dann Kanzlei prüfen.` },
      { id: "darueber", label: "Überstunden darüber hinaus", typ: "auswahl", pflicht: true, standard: "werden vergütet", optionen: ["werden vergütet", "werden in Freizeit ausgeglichen"] },
    ],
    text: (w, k) => {
      const n = zahl(w.stunden);
      return [
        `(1) Mit dem Monatsgehalt sind bis zu ${n ? zahlText(n) : "[Zahl]"} Überstunden im Monat abgegolten. Überstunden leistet ${k.vorname} nur auf Anordnung des Arbeitgebers und im Rahmen des Arbeitszeitgesetzes.`,
        `(2) Überstunden über diese Zahl hinaus ${w.darueber === "werden in Freizeit ausgeglichen" ? "werden in Freizeit ausgeglichen" : "werden mit dem anteiligen Stundenlohn vergütet"}.`,
        `(3) Die Arbeitszeit wird vollständig erfasst, auch die abgegoltenen Überstunden.`,
        `(4) Für jede geleistete Stunde einschließlich der abgegoltenen Überstunden erhält ${k.vorname} mindestens den gesetzlichen Mindestlohn. Reicht das Gehalt dafür nicht, zahlt der Arbeitgeber die Differenz.`,
        `(5) Zuschläge für Nacht-, Sonn- und Feiertagsarbeit nach Gesetz, Tarifvertrag oder Betriebsvereinbarung bleiben unberührt.`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const n = zahl(w.stunden);
      return [
        `(1) Up to ${n ? zahlEn(n) : "[number]"} hours of overtime per month are covered by the monthly salary. ${k.vorname} works overtime only on the instruction of the Employer and within the limits of the Working Hours Act.`,
        `(2) Overtime beyond this number ${w.darueber === "werden in Freizeit ausgeglichen" ? "is compensated by time off" : "is paid at the pro rata hourly rate"}.`,
        `(3) Working time is recorded in full, including the overtime covered by the salary.`,
        `(4) For every hour worked, including the overtime covered by the salary, ${k.vorname} receives at least the statutory minimum wage. If the salary is not sufficient for this, the Employer pays the difference.`,
        `(5) Premiums for night, Sunday and public holiday work under statute, collective agreement or works agreement remain unaffected.`,
      ].join("\n");
    },
    normen: ["§ 307 Abs. 1 Satz 2 BGB", "§ 612 BGB", "§ 1 MiLoG", "§ 16 Abs. 2 ArbZG"],
    quellen: ["https://www.gesetze-im-internet.de/bgb/__307.html", "https://www.gesetze-im-internet.de/bgb/__612.html", "https://www.gesetze-im-internet.de/milog/__1.html", katalog("C2")],
    urteile: [{ az: "BAG 5 AZR 406/10 (17.08.2011)", kennung: "V" }, { az: "BAG 5 AZR 517/09", kennung: "V" }, { az: "BAG 5 AZR 331/11 (15./16.05.2012)", kennung: "V" }, { az: "BAG 5 AZR 765/10 (22.02.2012)", kennung: "P" }],
    schutz: ["Feste Stundenzahl ist Pflicht.", "Mehr als der Standardwert nur bei Gehalt über der Beitragsbemessungsgrenze.", "Gehalt geteilt durch Vertragsstunden plus Pauschalstunden mindestens Mindestlohn.", "Arbeitszeiterfassung bleibt Pflicht."],
    sperren: ["„Überstunden sind mit dem Gehalt abgegolten“ ohne Zahl (R4).", "Pauschale unter der Schwelle.", "Pauschale zusammen mit Arbeitszeitkonto für dieselben Stunden.", "Ausschluss tariflicher Sonn- und Feiertagszuschläge."],
    stichwoerter: ["Überstundenpauschale", "Überstunden abgegolten", "All-in", "mit dem Gehalt abgegolten", "Pauschale", "Führungskraft"],
    regeln: [
      regel("P-026", "sperre", "C2 ohne feste Stundenzahl (Angabe fehlt)", "§ 307 Abs. 1 Satz 2 BGB (R4)", ["C2"],
        (l) => wenn(hat(l, "C2") && leer(wert(l, "C2", "stunden")), "Die Zahl der abgegoltenen Überstunden fehlt. Ohne Zahl ist die Abgeltung intransparent und unwirksam. Trag eine feste Zahl pro Monat ein.")),
      regel("K-06", "sperre", "C2 ohne feste Stundenzahl (keine Zahl, sondern „alle“ oder „erforderliche“)", "§ 307 Abs. 1 Satz 2 BGB (R4)", ["C2"], (l) => {
        const s = wert(l, "C2", "stunden");
        const n = zahl(s);
        return wenn(hat(l, "C2") && !leer(s) && (n === null || n <= 0), `„${s}“ ist keine feste Stundenzahl. „Alle“ oder „erforderliche“ Überstunden mit dem Gehalt abzugelten ist unwirksam (R4). Trag eine feste Zahl pro Monat ein.`);
      }),
      regel("P-027", "sperre", "C2 mit mehr Überstunden als dem Standardwert und Gehalt unter der Beitragsbemessungsgrenze", "§ 307 BGB, BAG 5 AZR 331/11, 5 AZR 765/10", ["C2"], (l) => {
        const n = num(l, "C2", "stunden") ?? 0;
        const bbg = wertZu(BBG_RV_MONAT, l.heute);
        return wenn(hat(l, "C2") && n > WERTE.ueberstundenPauschaleMaxMonat.wert && l.person.gehalt <= bbg.wert,
          `${zahlText(n)} abgegoltene Überstunden pro Monat sind nur bei einem Gehalt über der Beitragsbemessungsgrenze der Rentenversicherung (${euro(bbg.wert)}) vertretbar. Bei ${euro(l.person.gehalt)} höchstens ${WERTE.ueberstundenPauschaleMaxMonat.wert} pro Monat.${bbg.hinweis ? ` Beitragsbemessungsgrenze: ${bbg.hinweis}` : ""}`);
      }),
      regel("P-028", "sperre", "C2: rechnerischer Stundenlohn mit Pauschalstunden unter Mindestlohn (zum Eintritt)", "§ 1 MiLoG", ["C2"], (l) => {
        if (!hat(l, "C2")) return null;
        const ml = mindestlohnAm(l.person.eintritt);
        const n = num(l, "C2", "stunden") ?? 0;
        const sl = c2Lohn(l);
        return wenn(sl < ml, `${euro(l.person.gehalt)} geteilt durch ${zahlText(Math.round(monatsstunden(l.person.wochenstunden) * 10) / 10)} Vertragsstunden plus ${zahlText(n)} Pauschalstunden ergibt ${euro(sl)} je Stunde, weniger als der Mindestlohn von ${euro(ml)} ab ${formatDE(l.person.eintritt)}. Senke die Pauschalstunden oder erhöhe das Gehalt auf mindestens ${euro(Math.ceil(ml * (monatsstunden(l.person.wochenstunden) + n)))}.`);
      }),
      regel("K-05", "sperre", "C2 mit rechnerischem Stundenlohn unter dem Mindestlohn (auch bei bekannten künftigen Mindestlöhnen)", "MiLoG", ["C2"], (l) => {
        if (!hat(l, "C2")) return null;
        const sl = c2Lohn(l);
        const stufe = MINDESTLOHN.filter((m) => compare(m.gueltigAb, l.person.eintritt) > 0).find((m) => sl < m.wert);
        if (!stufe) return null;
        return `Ab ${formatDE(stufe.gueltigAb)} gilt ein Mindestlohn von ${euro(stufe.wert)}. Mit der Pauschale liegt der rechnerische Stundenlohn dann bei ${euro(sl)}. Die Pauschale wird damit unwirksam. Senke die Pauschalstunden oder vereinbare die Gehaltsanpassung gleich mit.`;
      }),
      regel("K-07", "warnung", "C2 und C3 für dieselben Stunden (Doppelabgeltung)", "§ 307 Abs. 1 Satz 2 BGB", ["C2", "C3"],
        (l) => wenn(hat(l, "C2") && hat(l, "C3"), "Überstundenpauschale (C2) und Arbeitszeitkonto (C3) gleichen womöglich dieselben Stunden aus. Wähle eins oder lege fest, dass erst die Stunden über der Pauschale ins Konto gehen.")),
    ],
  },
  {
    id: "C3", gruppe: "C", label: "Arbeitszeitkonto", labelEn: "Working time account", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Schwankender Bedarf, Gleitzeit, Teilzeit mit Ausgleich.",
    felder: [
      { id: "ausgleichMonate", label: "Ausgleichszeitraum in Monaten", typ: "zahl", pflicht: true, min: 1,
        hinweis: `Bei Mindestlohnbezug höchstens ${monateText(WERTE.milogKonto.ausgleichMonate)} (§ 2 Abs. 2 MiLoG).` },
      { id: "plusMax", label: "Höchstens Plusstunden", typ: "zahl", pflicht: true, min: 1, hinweis: `Bei Mindestlohnbezug höchstens ${prozent(WERTE.milogKonto.hoechstAnteil)} der vertraglichen Monatsarbeitszeit.` },
      { id: "minusMax", label: "Höchstens Minusstunden", typ: "zahl", pflicht: true, min: 0 },
      { id: "minus", label: "Minusstunden", typ: "auswahl", pflicht: true, standard: "Ausgleich durch Nacharbeit im Ausgleichszeitraum", optionen: ["Ausgleich durch Nacharbeit im Ausgleichszeitraum", "Verrechnung bei Ende nur, wenn selbst zu vertreten"] },
    ],
    text: (w, k) => {
      const m = zahl(w.ausgleichMonate);
      return [
        `(1) Für ${k.vorname} wird ein Arbeitszeitkonto geführt. Darauf werden Abweichungen der tatsächlichen von der vertraglichen Arbeitszeit gebucht.`,
        `(2) Das Konto darf höchstens ${w.plusMax ? zahlText(zahl(w.plusMax) ?? 0) : "[Zahl]"} Plusstunden und höchstens ${w.minusMax ? zahlText(zahl(w.minusMax) ?? 0) : "[Zahl]"} Minusstunden aufweisen. Plusstunden werden innerhalb von ${m ? monateText(m) : "[Zeitraum]"} ausgeglichen; sie verfallen nicht.`,
        `(3) Urlaub, Krankheit und Feiertage werden mit der vertraglichen Arbeitszeit gebucht. An Tagen mit Entgeltfortzahlung wird nichts vom Entgelt abgezogen.`,
        `(4) Minusstunden entstehen nicht, wenn der Arbeitgeber ${k.vorname} nicht beschäftigt. ${w.minus === "Verrechnung bei Ende nur, wenn selbst zu vertreten" ? `Bei Ende des Arbeitsverhältnisses werden Minusstunden nur verrechnet, soweit ${k.vorname} sie selbst zu vertreten hat und der Arbeitgeber sie nicht angeordnet hat.` : "Minusstunden werden im Ausgleichszeitraum nachgearbeitet."}`,
        `(5) Bei Ende des Arbeitsverhältnisses zahlt der Arbeitgeber offene Plusstunden mit dem anteiligen Stundenlohn aus. Für Stunden, die nicht durch das feste Gehalt mit dem Mindestlohn abgedeckt sind, gelten die Grenzen des § 2 Abs. 2 MiLoG.`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const m = zahl(w.ausgleichMonate);
      return [
        `(1) A working time account is kept for ${k.vorname}. Differences between actual and contractual working time are recorded in it.`,
        `(2) The account may show no more than ${w.plusMax ? zahlEn(zahl(w.plusMax) ?? 0) : "[number]"} plus hours and no more than ${w.minusMax ? zahlEn(zahl(w.minusMax) ?? 0) : "[number]"} minus hours. Plus hours are balanced within ${m ? monateEn(m) : "[period]"}; they do not lapse.`,
        `(3) Holiday, sickness and public holidays are recorded at the contractual working time. No deduction is made from pay on days with continued payment of remuneration.`,
        `(4) Minus hours do not arise if the Employer does not provide ${k.vorname} with work. ${w.minus === "Verrechnung bei Ende nur, wenn selbst zu vertreten" ? `When the employment ends, minus hours are only set off to the extent that ${k.vorname} is responsible for them and the Employer did not instruct them.` : "Minus hours are made up by working additional hours within the balancing period."}`,
        `(5) When the employment ends, the Employer pays out any outstanding plus hours at the pro rata hourly rate. For hours not covered at the minimum wage by the fixed salary, the limits of § 2 para. 2 MiLoG apply.`,
      ].join("\n");
    },
    normen: ["§ 87 Abs. 1 Nr. 2 und 3 BetrVG", "§ 2 Abs. 2 MiLoG", "§ 4 EFZG", "§ 11 BUrlG"],
    quellen: ["https://www.gesetze-im-internet.de/milog/__2.html", "https://www.gesetze-im-internet.de/betrvg/__87.html", "https://www.gesetze-im-internet.de/entgfg/__4.html", katalog("C3")],
    urteile: [{ az: "BAG-Linie: Arbeitgeber trägt das Beschäftigungsrisiko, keine Minusstunden bei fehlender Beschäftigung, Aktenzeichen prüfen", kennung: "P" }],
    schutz: ["Plus- und Minusgrenzen Pflicht.", "Ausgleichszeitraum Pflicht, bei Mindestlohn begrenzt.", "Auszahlung der Plusstunden bei Ende Pflicht.", "Minusstunden bei Ende nur, wenn selbst zu vertreten."],
    sperren: ["Minusstunden ohne Obergrenze.", "Automatischer Verfall von Plusstunden.", "Abzug vom Entgelt an Tagen der Entgeltfortzahlung."],
    stichwoerter: ["Arbeitszeitkonto", "Gleitzeitkonto", "Plusstunden", "Minusstunden", "Stundenkonto", "Zeitkonto"],
    regeln: [
      regel("P-029", "sperre", "C3 ohne Plus-/Minusgrenzen oder Ausgleichszeitraum", "§ 2 Abs. 2 MiLoG, § 307 BGB", ["C3"], (l) => {
        const fehlt = [["plusMax", "Grenze für Plusstunden"], ["minusMax", "Grenze für Minusstunden"], ["ausgleichMonate", "Ausgleichszeitraum"]].filter(([f]) => num(l, "C3", f) === null).map(([, t]) => t);
        return wenn(hat(l, "C3") && fehlt.length > 0, `Im Arbeitszeitkonto fehlt: ${fehlt.join(", ")}. Ohne diese Grenzen ist das Konto unklar.`);
      }),
      regel("P-030", "sperre", "C3 mit Mindestlohnbezug und zu langem Ausgleich oder zu vielen Plusstunden", "§ 2 Abs. 2 MiLoG", ["C3"], (l) => {
        if (!hat(l, "C3") || !c3Mindestlohn(l)) return null;
        const m = num(l, "C3", "ausgleichMonate") ?? 0;
        const plus = num(l, "C3", "plusMax") ?? 0;
        const grenze = monatsstunden(l.person.wochenstunden) * WERTE.milogKonto.hoechstAnteil;
        const fehler = [
          m > WERTE.milogKonto.ausgleichMonate ? `Ausgleich höchstens innerhalb von ${monateText(WERTE.milogKonto.ausgleichMonate)}, eingetragen ${monateText(m)}` : "",
          plus > grenze ? `höchstens ${zahlText(Math.floor(grenze))} Plusstunden (${prozent(WERTE.milogKonto.hoechstAnteil)} der vertraglichen Monatsarbeitszeit), eingetragen ${zahlText(plus)}` : "",
        ].filter(Boolean);
        return wenn(fehler.length > 0, `Das feste Gehalt deckt die Stunden nicht zum Mindestlohn ab. Dann gilt: ${fehler.join("; ")}.`);
      }),
    ],
  },
  {
    id: "C4", gruppe: "C", label: "Vertrauensarbeitszeit", labelEn: "Trust-based working time", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Wissensarbeit und Führungskräfte.",
    felder: [
      { id: "erfassung", label: "Erfassung der Arbeitszeit", typ: "auswahl", standard: "elektronisches Zeiterfassungssystem",
        optionen: ["elektronisches Zeiterfassungssystem", "Selbsterfassung durch die Person, wöchentliche Abgabe"], hinweis: "Die Arbeitszeit wird auch bei Vertrauensarbeitszeit erfasst." },
      { id: "kernzeit", label: "Kernzeiten oder Termine mit Anwesenheit", typ: "text" },
      { id: "erreichbarkeit", label: "Erreichbarkeit", typ: "text" },
    ],
    text: (w, k) => [
      `(1) ${k.vorname} bestimmt Beginn und Ende der täglichen Arbeitszeit selbst. Der Arbeitgeber verzichtet auf die Kontrolle der Lage der Arbeitszeit, nicht auf ihre Dauer.${w.kernzeit ? ` Anwesenheit: ${w.kernzeit}.` : ""}${w.erreichbarkeit ? ` Erreichbarkeit: ${w.erreichbarkeit}.` : ""}`,
      `(2) Die Arbeitszeit wird erfasst: ${w.erfassung || "[Erfassung]"}. Der Arbeitgeber prüft die Aufzeichnungen stichprobenweise.`,
      `(3) Höchstarbeitszeit, Pausen und Ruhezeiten nach dem Arbeitszeitgesetz gelten unverändert.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${k.vorname} determines the start and end of daily working time. The Employer waives control over when the work is done, not over how long.${w.kernzeit ? ` Attendance: ${frei(w.kernzeit)}.` : ""}${w.erreichbarkeit ? ` Availability: ${frei(w.erreichbarkeit)}.` : ""}`,
      `(2) Working time is recorded: ${wahlEn(C4_ERFASSUNG_EN, w.erfassung, "[recording method]")}. The Employer checks the records on a sample basis.`,
      `(3) Maximum working hours, breaks and rest periods under the Working Hours Act remain unchanged.`,
    ].join("\n"),
    normen: ["§ 3 Abs. 2 Nr. 1 ArbSchG", "ArbZG", "§ 16 Abs. 2 ArbZG"],
    quellen: ["https://www.gesetze-im-internet.de/arbschg/__3.html", "https://www.gesetze-im-internet.de/arbzg/__16.html", katalog("C4")],
    urteile: [{ az: "BAG 1 ABR 22/21", kennung: "P" }, { az: "EuGH C-55/18 (CCOO)", kennung: "P" }],
    schutz: ["Pflichtsatz: Die Arbeitszeit wird erfasst.", "Vertrauensarbeitszeit heißt Verzicht auf Kontrolle der Lage, nicht der Dauer."],
    sperren: ["Vertrauensarbeitszeit ohne Erfassung.", "Verzicht auf Ruhezeit und Pause."],
    stichwoerter: ["Vertrauensarbeitszeit", "freie Zeiteinteilung", "keine Stechuhr", "Zeiterfassung", "flexible Arbeitszeit"],
    regeln: [
      regel("P-031", "sperre", "C4 ohne Zeiterfassung", "§ 3 Abs. 2 Nr. 1 ArbSchG, BAG 1 ABR 22/21", ["C4"],
        (l) => wenn(hat(l, "C4") && (leer(wert(l, "C4", "erfassung")) || /kein|ohne/i.test(wert(l, "C4", "erfassung"))), "Auch bei Vertrauensarbeitszeit muss die Arbeitszeit erfasst werden. Wähle ein Erfassungssystem oder die Selbsterfassung.")),
    ],
  },
  {
    id: "C5", gruppe: "C", label: "Gleitzeit und Kernzeit", labelEn: "Flexitime and core time", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Büroarbeit.",
    felder: [
      { id: "rahmenVon", label: "Rahmenzeit ab (Uhr)", typ: "zahl", pflicht: true, min: 0, max: 24, standard: String(WERTE.vertragStandards.gleitzeitVon) },
      { id: "rahmenBis", label: "Rahmenzeit bis (Uhr)", typ: "zahl", pflicht: true, min: 0, max: 24, standard: String(WERTE.vertragStandards.gleitzeitBis) },
      { id: "kernVon", label: "Kernzeit ab (Uhr)", typ: "zahl", min: 0, max: 24 },
      { id: "kernBis", label: "Kernzeit bis (Uhr)", typ: "zahl", min: 0, max: 24 },
      { id: "saldo", label: "Zeitsalden", typ: "auswahl", pflicht: true, standard: "Ausgleich im Kalendermonat", optionen: ["Ausgleich im Kalendermonat", "Übertrag auf das Arbeitszeitkonto"] },
    ],
    text: (w, k) => {
      const kern = zahl(w.kernVon) !== null && zahl(w.kernBis) !== null ? ` In der Kernzeit von ${uhr(zahl(w.kernVon)!)} bis ${uhr(zahl(w.kernBis)!)} ist ${k.vorname} anwesend oder erreichbar.` : "";
      return [
        `(1) ${k.vorname} kann Beginn und Ende der Arbeitszeit innerhalb der Rahmenzeit von ${uhr(zahl(w.rahmenVon) ?? WERTE.vertragStandards.gleitzeitVon)} bis ${uhr(zahl(w.rahmenBis) ?? WERTE.vertragStandards.gleitzeitBis)} selbst wählen.${kern}`,
        `(2) Zeitsalden: ${w.saldo === "Übertrag auf das Arbeitszeitkonto" ? "Sie werden auf das Arbeitszeitkonto übertragen." : "Sie werden im laufenden Kalendermonat ausgeglichen."}`,
        `(3) Die Arbeitszeit wird erfasst. Höchstarbeitszeit, Pausen und Ruhezeiten nach dem Arbeitszeitgesetz gelten.`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const kern = zahl(w.kernVon) !== null && zahl(w.kernBis) !== null ? ` During the core time from ${uhrEn(zahl(w.kernVon)!)} to ${uhrEn(zahl(w.kernBis)!)}, ${k.vorname} is present or available.` : "";
      return [
        `(1) ${k.vorname} may choose the start and end of working time within the flexitime band from ${uhrEn(zahl(w.rahmenVon) ?? WERTE.vertragStandards.gleitzeitVon)} to ${uhrEn(zahl(w.rahmenBis) ?? WERTE.vertragStandards.gleitzeitBis)}.${kern}`,
        `(2) Time balances: ${w.saldo === "Übertrag auf das Arbeitszeitkonto" ? "They are transferred to the working time account." : "They are balanced within the current calendar month."}`,
        `(3) Working time is recorded. Maximum working hours, breaks and rest periods under the Working Hours Act apply.`,
      ].join("\n");
    },
    normen: ["§ 87 Abs. 1 Nr. 2 BetrVG", "§ 2 Abs. 3 ArbZG"],
    quellen: ["https://www.gesetze-im-internet.de/arbzg/__2.html", "https://www.gesetze-im-internet.de/betrvg/__87.html", katalog("C5")],
    schutz: ["Rahmenzeit innerhalb des Standardrahmens, sonst Warnung wegen Nachtarbeit."],
    sperren: [],
    stichwoerter: ["Gleitzeit", "Kernzeit", "Rahmenzeit", "flexible Arbeitszeit", "Gleitzeitkonto"],
    regeln: [
      regel("P-039", "warnung", "Gleitzeit-Rahmen außerhalb des Standardrahmens", "§ 2 Abs. 3 ArbZG", ["C5"], (l) => {
        const von = num(l, "C5", "rahmenVon");
        const bis = num(l, "C5", "rahmenBis");
        const raus = (von !== null && von < WERTE.vertragStandards.gleitzeitVon) || (bis !== null && bis > WERTE.vertragStandards.gleitzeitBis);
        return wenn(hat(l, "C5") && raus, `Die Rahmenzeit reicht über ${uhr(WERTE.vertragStandards.gleitzeitVon)} bis ${uhr(WERTE.vertragStandards.gleitzeitBis)} hinaus. Arbeit zwischen ${uhr(WERTE.arbzgNachtzeit.vonStunde)} und ${uhr(WERTE.arbzgNachtzeit.bisStunde)} ist Nachtzeit mit eigenen Schutzregeln. Prüfe, ob du den Rahmen brauchst.`);
      }),
    ],
  },
  {
    id: "C6", gruppe: "C", label: "Schichtarbeit", labelEn: "Shift work", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Produktion, Pflege, Gastronomie, Logistik.",
    felder: [
      { id: "modell", label: "Schichtmodell", typ: "auswahl", pflicht: true, optionen: ["Frühschicht und Spätschicht", ...C6_NACHT] },
      { id: "rhythmus", label: "Schichtrhythmus", typ: "text", pflicht: true, hinweis: "Zum Beispiel: wöchentlicher Wechsel Früh, Spät, Nacht." },
      { id: "aenderung", label: "Voraussetzungen für Schichtänderungen", typ: "lang", pflicht: true },
      { id: "ankuendigungTage", label: "Schichtplan wird bekannt gegeben (Tage vorher)", typ: "zahl", pflicht: true, min: 1 },
      { id: "nachtausgleich", label: "Ausgleich für Nachtarbeit", typ: "auswahl", pflicht: true, optionen: ["Zuschlag", "bezahlte freie Tage", KEIN_AUSGLEICH], bei: { modell: C6_NACHT } },
      { id: "nachtZuschlag", label: "Nachtzuschlag (Prozent)", typ: "prozent", pflicht: true, min: 0, bei: { nachtausgleich: ["Zuschlag"] } },
      { id: "schichtzulage", label: "Schichtzulage pro Monat", typ: "betrag", min: 0 },
    ],
    text: (w, k) => {
      const nacht = C6_NACHT.includes(w.modell ?? "");
      return [
        `(1) ${k.vorname} arbeitet im Schichtsystem: ${w.modell || "[Modell]"}. Rhythmus: ${w.rhythmus || "[Rhythmus]"}.`,
        `(2) Der Arbeitgeber gibt den Schichtplan mindestens ${zahl(w.ankuendigungTage) ? zahlText(zahl(w.ankuendigungTage)!) : "[Zahl]"} Kalendertage vorher bekannt. Schichtänderungen sind nur unter folgenden Voraussetzungen möglich: ${w.aenderung || "[Voraussetzungen]"}.`,
        ...(nacht ? [`(3) Für Arbeit in der Nachtzeit (${uhr(WERTE.arbzgNachtzeit.vonStunde)} bis ${uhr(WERTE.arbzgNachtzeit.bisStunde)}) erhält ${k.vorname} ${w.nachtausgleich === "bezahlte freie Tage" ? "eine angemessene Zahl bezahlter freier Tage" : `einen Zuschlag von ${prozent(anteil(w.nachtZuschlag) ?? 0)} auf den Grundstundenlohn`}. ${k.vorname} kann sich vor Beginn und danach regelmäßig arbeitsmedizinisch untersuchen lassen; die Kosten trägt der Arbeitgeber.`] : []),
        ...(zahl(w.schichtzulage) ? [`(${nacht ? 4 : 3}) Zusätzlich zahlt der Arbeitgeber eine Schichtzulage von ${euro(zahl(w.schichtzulage)!)} im Monat.`] : []),
      ].join("\n");
    },
    textEn: (w, k) => {
      const nacht = C6_NACHT.includes(w.modell ?? "");
      return [
        `(1) ${k.vorname} works in a shift system: ${wahlEn(C6_MODELL_EN, w.modell, "[model]")}. Rotation: ${frei(w.rhythmus) || "[rotation]"}.`,
        `(2) The Employer announces the shift schedule at least ${zahl(w.ankuendigungTage) ? zahlEn(zahl(w.ankuendigungTage)!) : "[number]"} calendar days in advance. Changes to shifts are only possible under the following conditions: ${frei(w.aenderung) || "[conditions]"}.`,
        ...(nacht ? [`(3) For work during night time (${uhrEn(WERTE.arbzgNachtzeit.vonStunde)} to ${uhrEn(WERTE.arbzgNachtzeit.bisStunde)}), ${k.vorname} receives ${w.nachtausgleich === "bezahlte freie Tage" ? "an appropriate number of paid days off" : `a premium of ${prozentEn(anteil(w.nachtZuschlag) ?? 0)} on the basic hourly rate`}. ${k.vorname} may undergo occupational health examinations before starting and regularly thereafter; the Employer bears the costs.`] : []),
        ...(zahl(w.schichtzulage) ? [`(${nacht ? 4 : 3}) In addition, the Employer pays a shift allowance of ${euroEn(zahl(w.schichtzulage)!)} per month.`] : []),
      ].join("\n");
    },
    normen: ["§ 2 Abs. 1 Satz 2 Nr. 8 NachwG", "§ 6 ArbZG", "§ 87 Abs. 1 Nr. 2 BetrVG"],
    quellen: ["https://www.gesetze-im-internet.de/nachwg/__2.html", "https://www.gesetze-im-internet.de/arbzg/__6.html", katalog("C6")],
    schutz: ["Angaben zu Schichtsystem, Rhythmus und Änderungsvoraussetzungen sind Pflicht.", "Nachtarbeit: Zuschlag oder Freizeitausgleich Pflicht."],
    sperren: ["Schichtplanänderung ohne Ankündigungsfrist."],
    stichwoerter: ["Schicht", "Schichtarbeit", "Wechselschicht", "Nachtschicht", "Schichtplan", "Frühschicht", "Spätschicht"],
    regeln: [
      regel("P-032", "sperre", "C6 ohne Angaben zu Schichtsystem, Rhythmus, Änderungsvoraussetzungen", "§ 2 Abs. 1 Satz 2 Nr. 8 NachwG", ["C6"], (l) => {
        const fehlt = [["modell", "Schichtsystem"], ["rhythmus", "Rhythmus"], ["aenderung", "Voraussetzungen für Änderungen"]].filter(([f]) => leer(wert(l, "C6", f))).map(([, t]) => t);
        return wenn(hat(l, "C6") && fehlt.length > 0, `Für Schichtarbeit verlangt das Nachweisgesetz: ${fehlt.join(", ")}. Ergänze die Angaben.`);
      }),
      regel("P-033", "warnung", "Nachtarbeit ohne Zuschlag oder Freizeitausgleich", "§ 6 Abs. 5 ArbZG", ["C6", "C11"], (l) => {
        const c6 = hat(l, "C6") && C6_NACHT.includes(wert(l, "C6", "modell")) && (leer(wert(l, "C6", "nachtausgleich")) || wert(l, "C6", "nachtausgleich") === KEIN_AUSGLEICH || (wert(l, "C6", "nachtausgleich") === "Zuschlag" && !num(l, "C6", "nachtZuschlag")));
        const c11 = hat(l, "C11") && (wert(l, "C11", "nachtAusgleich") === "bezahlte freie Tage" ? !num(l, "C11", "freieTage") : !num(l, "C11", "nachtZuschlag"));
        const ausgeglichen = hat(l, "C11") && !c11;
        return wenn((c6 && !ausgeglichen) || c11, `Für Arbeit in der Nachtzeit (${uhr(WERTE.arbzgNachtzeit.vonStunde)} bis ${uhr(WERTE.arbzgNachtzeit.bisStunde)}) braucht es einen angemessenen Zuschlag oder bezahlte freie Tage. Trag einen Zuschlag ein oder wähle freie Tage.`);
      }),
    ],
  },
  {
    id: "C7", gruppe: "C", label: "Rufbereitschaft", labelEn: "On-call duty", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "IT-Betrieb, Technik, Pflege, Notdienste.",
    felder: [
      { id: "haeufigkeit", label: "Rufbereitschaftstage pro Monat (höchstens)", typ: "zahl", pflicht: true, min: 1 },
      { id: "reaktionMinuten", label: "Reaktionszeit in Minuten", typ: "zahl", pflicht: true, min: 1, hinweis: `Unter ${WERTE.rufbereitschaftReaktionMinuten.wert} Minuten kann es Bereitschaftsdienst sein (Arbeitszeit).` },
      { id: "pauschale", label: "Pauschale pro Rufbereitschaftstag", typ: "betrag", pflicht: true, min: 0 },
      { id: "einsatz", label: "Vergütung der Einsätze", typ: "auswahl", pflicht: true, standard: "als Arbeitszeit mit dem anteiligen Stundenlohn", optionen: ["als Arbeitszeit mit dem anteiligen Stundenlohn", "als Arbeitszeit mit Zuschlag"] },
      { id: "zuschlag", label: "Zuschlag auf Einsätze (Prozent)", typ: "prozent", pflicht: true, min: 0, bei: { einsatz: ["als Arbeitszeit mit Zuschlag"] } },
    ],
    text: (w, k) => [
      `(1) ${k.vorname} übernimmt an höchstens ${w.haeufigkeit || "[Zahl]"} Tagen im Monat Rufbereitschaft. ${k.vorname} wählt den Aufenthaltsort frei und nimmt die Arbeit nach einem Abruf innerhalb von ${w.reaktionMinuten || "[Zahl]"} Minuten auf.`,
      `(2) Für jeden Tag Rufbereitschaft zahlt der Arbeitgeber eine Pauschale von ${euro(zahl(w.pauschale) ?? 0)}.`,
      `(3) Einsätze einschließlich der Wege sind Arbeitszeit und werden zusätzlich ${w.einsatz === "als Arbeitszeit mit Zuschlag" ? `mit dem anteiligen Stundenlohn und einem Zuschlag von ${prozent(anteil(w.zuschlag) ?? 0)}` : "mit dem anteiligen Stundenlohn"} vergütet, mindestens mit dem gesetzlichen Mindestlohn.`,
      `(4) Nach einem Einsatz beginnt die Ruhezeit von ${WERTE.arbzgRuhezeit.stunden} Stunden neu, soweit das Arbeitszeitgesetz keine Ausnahme zulässt.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${k.vorname} is on call on no more than ${w.haeufigkeit || "[number]"} days per month. ${k.vorname} is free to choose where to stay and starts work within ${w.reaktionMinuten || "[number]"} minutes of being called.`,
      `(2) For each day on call, the Employer pays a flat rate of ${euroEn(zahl(w.pauschale) ?? 0)}.`,
      `(3) Call-outs, including travel to and from work, are working time and are paid additionally ${w.einsatz === "als Arbeitszeit mit Zuschlag" ? `at the pro rata hourly rate plus a premium of ${prozentEn(anteil(w.zuschlag) ?? 0)}` : "at the pro rata hourly rate"}, and at least at the statutory minimum wage.`,
      `(4) After a call-out, the rest period of ${WERTE.arbzgRuhezeit.stunden} hours starts again, unless the Working Hours Act permits an exception.`,
    ].join("\n"),
    normen: ["§ 5 ArbZG", "§ 1 MiLoG", "§ 87 Abs. 1 Nr. 2 und 3 BetrVG"],
    quellen: ["https://www.gesetze-im-internet.de/arbzg/__5.html", "https://www.gesetze-im-internet.de/milog/__1.html", katalog("C7")],
    urteile: [{ az: "EuGH C-518/15 (Matzak)", kennung: "P" }],
    schutz: ["Reaktionszeit ist Pflicht, Warnung bei sehr kurzer Reaktionszeit.", "Pauschale und Einsatzvergütung getrennt."],
    sperren: ["Rufbereitschaft mit dem Gehalt abgegolten ohne Grenze."],
    stichwoerter: ["Rufbereitschaft", "Bereitschaft", "On-Call", "Notdienst", "Pikett", "erreichbar sein"],
    regeln: [
      regel("P-034", "warnung", "C7 mit sehr kurzer Reaktionszeit: Bereitschaftsdienst prüfen", "EuGH C-518/15 (Matzak)", ["C7"], (l) => {
        const r = num(l, "C7", "reaktionMinuten");
        if (!hat(l, "C7") || r === null || r >= WERTE.rufbereitschaftReaktionMinuten.wert) return null;
        return `Eine Reaktionszeit von ${zahlText(r)} Minuten schränkt die Freizeit stark ein. Das kann Bereitschaftsdienst sein, der voll als Arbeitszeit zählt (C8). Kanzlei prüfen.`;
      }),
    ],
  },
  {
    id: "C8", gruppe: "C", label: "Bereitschaftsdienst", labelEn: "Stand-by duty on site", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Pflege, Rettung, Technik am Ort.",
    felder: [
      { id: "stundenMonat", label: "Bereitschaftsdienst in Stunden pro Monat (höchstens)", typ: "zahl", pflicht: true, min: 1 },
      { id: "bewertung", label: "Vergütung der Bereitschaftsstunde (Prozent des Stundenlohns)", typ: "prozent", pflicht: true, min: 0, max: 100 },
    ],
    text: (w, k) => [
      `(1) ${k.vorname} leistet Bereitschaftsdienst im Umfang von höchstens ${w.stundenMonat || "[Zahl]"} Stunden im Monat. Bereitschaftsdienst ist Arbeitszeit.`,
      `(2) Jede Stunde Bereitschaftsdienst wird mit ${prozent(anteil(w.bewertung) ?? 0)} des anteiligen Stundenlohns vergütet, tatsächliche Arbeit voll. Für alle Stunden zusammen erhält ${k.vorname} im Monat mindestens den gesetzlichen Mindestlohn.`,
      `(3) Höchstarbeitszeit und Ruhezeiten richten sich nach dem Arbeitszeitgesetz. Abweichungen sind nur durch Tarifvertrag oder Betriebsvereinbarung möglich (§ 7 ArbZG).`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${k.vorname} performs stand-by duty of no more than ${w.stundenMonat || "[number]"} hours per month. Stand-by duty is working time.`,
      `(2) Each hour of stand-by duty is paid at ${prozentEn(anteil(w.bewertung) ?? 0)} of the pro rata hourly rate, and actual work in full. For all hours combined, ${k.vorname} receives at least the statutory minimum wage each month.`,
      `(3) Maximum working hours and rest periods are governed by the Working Hours Act. Deviations are only possible by collective agreement or works agreement (§ 7 ArbZG).`,
    ].join("\n"),
    normen: ["§ 2 Abs. 1 ArbZG", "§ 7 ArbZG", "§ 1 MiLoG"],
    quellen: ["https://www.gesetze-im-internet.de/arbzg/__7.html", "https://www.gesetze-im-internet.de/milog/__1.html", katalog("C8")],
    urteile: [{ az: "EuGH C-303/98 (Simap)", kennung: "P" }, { az: "EuGH C-151/02 (Jaeger)", kennung: "P" }],
    schutz: ["Mindestlohnprüfung für die volle Zeit.", "Hinweis auf § 7 ArbZG."],
    sperren: ["Bewertung unter Mindestlohn."],
    stichwoerter: ["Bereitschaftsdienst", "Nachtdienst", "Dienst vor Ort", "Bereitschaftszeit", "Klinik"],
    regeln: [
      regel("P-035", "sperre", "C8 mit Vergütung unter Mindestlohn für die volle Zeit", "§ 1 MiLoG", ["C8"], (l) => {
        if (!hat(l, "C8")) return null;
        const h = num(l, "C8", "stundenMonat") ?? 0;
        const a = anteil(wert(l, "C8", "bewertung")) ?? 0;
        const sl = stundenlohn(l.person.gehalt, l.person.wochenstunden);
        const schnitt = (l.person.gehalt + h * a * sl) / (monatsstunden(l.person.wochenstunden) + h);
        const ml = mindestlohnAm(l.person.eintritt);
        return wenn(schnitt < ml, `Bereitschaftsdienst zählt voll für den Mindestlohn. Gehalt plus Bereitschaftsvergütung geteilt durch alle Stunden ergibt ${euro(schnitt)} je Stunde, weniger als ${euro(ml)}. Erhöhe die Bewertung oder senke die Stunden.`);
      }),
    ],
  },
  {
    id: "C9", gruppe: "C", label: "Arbeit auf Abruf", labelEn: "Work on demand", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Aushilfen und Teilzeit mit schwankendem Bedarf.",
    felder: [
      { id: "mindestStunden", label: "Wöchentliche Mindestarbeitszeit (Stunden)", typ: "zahl", pflicht: true, min: 1,
        hinweis: `Fehlt sie, gelten kraft Gesetzes ${WERTE.abruf.ohneFestlegungStunden} Stunden pro Woche.` },
      { id: "zeitrahmen", label: "Zeitrahmen für Abrufe (Tage und Uhrzeiten)", typ: "text", pflicht: true },
      { id: "ankuendigungTage", label: "Ankündigung des Abrufs (Tage vorher)", typ: "zahl", pflicht: true, min: WERTE.abruf.ankuendigungTage, standard: String(WERTE.abruf.ankuendigungTage) },
      { id: "mehrProzent", label: "Zusätzlicher Abruf über die Mindestzeit (Prozent)", typ: "prozent", min: 0, max: WERTE.abruf.mehrAnteil * 100 },
      { id: "wenigerProzent", label: "Weniger als die Höchstzeit (Prozent)", typ: "prozent", min: 0, max: WERTE.abruf.wenigerAnteil * 100 },
    ],
    text: (w, k) => [
      `(1) ${k.vorname} arbeitet auf Abruf. Die wöchentliche Mindestarbeitszeit beträgt ${w.mindestStunden || "[Zahl]"} Stunden.${zahl(w.mehrProzent) ? ` Der Arbeitgeber kann zusätzlich bis zu ${prozent(anteil(w.mehrProzent)!)} davon abrufen.` : ""}${zahl(w.wenigerProzent) ? ` Ist eine Höchstarbeitszeit vereinbart, ruft er mindestens ${prozent(1 - anteil(w.wenigerProzent)!)} davon ab.` : ""}`,
      `(2) Abrufe sind nur in folgendem Zeitrahmen möglich: ${w.zeitrahmen || "[Zeitrahmen]"}. Der Arbeitgeber teilt die Lage der Arbeitszeit mindestens ${zahlText(zahl(w.ankuendigungTage) ?? WERTE.abruf.ankuendigungTage)} Tage im Voraus mit; sonst muss ${k.vorname} nicht arbeiten.`,
      `(3) Für jeden Abruf gilt die gesetzliche Mindestdauer der Beschäftigung am Stück. Entgeltfortzahlung bei Krankheit und an Feiertagen richtet sich nach dem Durchschnitt der letzten Monate.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${k.vorname} works on demand. The minimum weekly working time is ${w.mindestStunden || "[number]"} hours.${zahl(w.mehrProzent) ? ` The Employer may call up to an additional ${prozentEn(anteil(w.mehrProzent)!)} of this.` : ""}${zahl(w.wenigerProzent) ? ` If a maximum working time is agreed, the Employer calls at least ${prozentEn(1 - anteil(w.wenigerProzent)!)} of it.` : ""}`,
      `(2) Work may only be called within the following time frame: ${frei(w.zeitrahmen) || "[time frame]"}. The Employer notifies the timing of the working hours at least ${zahlEn(zahl(w.ankuendigungTage) ?? WERTE.abruf.ankuendigungTage)} days in advance; otherwise ${k.vorname} is not obliged to work.`,
      `(3) For each call, the statutory minimum period of consecutive work applies. Continued pay during sickness and on public holidays is based on the average of the preceding months.`,
    ].join("\n"),
    normen: ["§ 12 TzBfG", "§ 2 Abs. 1 Satz 2 Nr. 9 NachwG"],
    quellen: ["https://www.gesetze-im-internet.de/tzbfg/__12.html", "https://www.gesetze-im-internet.de/nachwg/__2.html", katalog("C9")],
    schutz: ["Wochenstunden Pflicht.", "Schwankung nur in den gesetzlichen Grenzen.", "Ankündigungsfrist mindestens wie im Gesetz."],
    sperren: ["Abruf ohne feste Mindeststundenzahl.", "Kürzere Ankündigung als im Gesetz."],
    stichwoerter: ["Abruf", "Arbeit auf Abruf", "Aushilfe", "flexible Stunden", "KAPOVAZ", "Springer"],
    regeln: [
      regel("P-036", "sperre", "C9 ohne Mindeststunden oder mit zu kurzer Ankündigung", "§ 12 Abs. 1 und 3 TzBfG", ["C9"], (l) => {
        if (!hat(l, "C9")) return null;
        const t = num(l, "C9", "ankuendigungTage");
        const fehler = [
          num(l, "C9", "mindestStunden") ? "" : "Die wöchentliche Mindestarbeitszeit fehlt",
          t !== null && t < WERTE.abruf.ankuendigungTage ? `Der Abruf muss mindestens ${WERTE.abruf.ankuendigungTage} Tage vorher angekündigt werden, eingetragen sind ${zahlText(t)}` : "",
        ].filter(Boolean);
        return wenn(fehler.length > 0, `${fehler.join(". ")}.`);
      }),
      regel("K-35", "sperre", "C9 mit Schwankung über den gesetzlichen Grenzen", "§ 12 Abs. 2 TzBfG", ["C9"], (l) => {
        const mehr = anteil(wert(l, "C9", "mehrProzent")) ?? 0;
        const weniger = anteil(wert(l, "C9", "wenigerProzent")) ?? 0;
        return wenn(hat(l, "C9") && (mehr > WERTE.abruf.mehrAnteil || weniger > WERTE.abruf.wenigerAnteil), `Der Arbeitgeber darf höchstens ${prozent(WERTE.abruf.mehrAnteil)} über der Mindestzeit zusätzlich abrufen und höchstens ${prozent(WERTE.abruf.wenigerAnteil)} unter einer Höchstzeit bleiben. Senke die Werte.`);
      }),
    ],
  },
  {
    id: "C10", gruppe: "C", label: "Kurzarbeit", labelEn: "Short-time work", risiko: "gelb", version: 2, fuer: ARBEITNEHMER,
    passt: "Firmen mit schwankender Auslastung, für den Fall der Krise.",
    felder: [
      { id: "voraussetzung", label: "Voraussetzung", typ: "auswahl", pflicht: true,
        optionen: ["erheblicher Arbeitsausfall mit Anzeige bei der Agentur für Arbeit", "Betriebsvereinbarung über Kurzarbeit und Anzeige bei der Agentur für Arbeit"] },
      { id: "ankuendigungTage", label: "Ankündigung (Kalendertage vorher)", typ: "zahl", pflicht: true, min: 1 },
      { id: "hoechstMonate", label: "Höchstdauer in Monaten", typ: "zahl", pflicht: true, min: 1, hinweis: "Nicht länger als Kurzarbeitergeld gezahlt wird." },
      { id: "umfang", label: "Umfang der Verkürzung", typ: "auswahl", pflicht: true, optionen: ["teilweise Verkürzung", "Verkürzung bis auf null"] },
      { id: "aufstockung", label: "Aufstockung des Kurzarbeitergelds (Prozent des ausfallenden Nettoentgelts)", typ: "prozent", min: 0, max: 100 },
      { id: "anpassungTage", label: "Ankündigung einer Änderung oder des vorzeitigen Endes (Kalendertage vorher)", typ: "zahl", pflicht: true, min: 1, standard: "3" },
      { id: "urlaubKuerzung", label: "Urlaub für Zeiten ohne Arbeit (Kurzarbeit null) anteilig kürzen", typ: "janein", standard: "nein", bei: { umfang: ["Verkürzung bis auf null"] }, hinweis: "Nach der Rechtsprechung zulässig (Aktenzeichen prüfen). Ohne Wahl bleibt der Urlaub voll." },
    ],
    // Entscheidung 24: Nachzahlung, Anpassung mit Ankündigung und wahlweise Urlaubskürzung bei Kurzarbeit null, Nummern laufen mit.
    text: (w, k) => nummeriert([
      `Der Arbeitgeber kann Kurzarbeit nur einführen, wenn folgende Voraussetzung vorliegt: ${w.voraussetzung || "[Voraussetzung]"}. Kurzarbeit setzt voraus, dass für ${k.vorname} Kurzarbeitergeld gezahlt werden kann.`,
      `Der Arbeitgeber kündigt Kurzarbeit mindestens ${w.ankuendigungTage || "[Zahl]"} Kalendertage vorher in Textform an. Sie dauert höchstens ${monateText(zahl(w.hoechstMonate) ?? 1)} und endet früher, wenn kein Kurzarbeitergeld mehr gezahlt wird.`,
      `Umfang: ${w.umfang || "[Umfang]"}. Das Entgelt sinkt im Verhältnis der ausfallenden Arbeitszeit.${zahl(w.aufstockung) ? ` Der Arbeitgeber stockt das Kurzarbeitergeld um ${prozent(anteil(w.aufstockung)!)} des ausfallenden Nettoentgelts auf.` : ""}`,
      "Lehnt die Agentur für Arbeit das Kurzarbeitergeld aus Gründen ab, die der Arbeitgeber zu vertreten hat, gilt die Kurzarbeit als nicht eingeführt; der Arbeitgeber zahlt das ausgefallene Entgelt nach.",
      `Ändert sich der Arbeitsausfall, kann der Arbeitgeber Umfang und Lage der Kurzarbeit anpassen oder sie vorzeitig beenden. Er kündigt das mindestens ${w.anpassungTage || "[Zahl]"} Kalendertage vorher in Textform an.`,
      ...(w.umfang === "Verkürzung bis auf null" && w.urlaubKuerzung === "ja" ? ["Für Zeiten, in denen die Arbeit wegen Kurzarbeit vollständig ausfällt, verringert sich der Urlaubsanspruch im Verhältnis der ausgefallenen Arbeitstage."] : []),
      "Rechte eines Betriebsrats bleiben unberührt.",
    ]),
    textEn: (w, k) => nummeriert([
      `The Employer may only introduce short-time work if the following condition is met: ${wahlEn(C10_VORAUSSETZUNG_EN, w.voraussetzung, "[condition]")}. Short-time work requires that short-time allowance (Kurzarbeitergeld) can be paid for ${k.vorname}.`,
      `The Employer gives at least ${w.ankuendigungTage || "[number]"} calendar days' notice of short-time work in text form. It lasts no longer than ${monateEn(zahl(w.hoechstMonate) ?? 1)} and ends earlier if short-time allowance is no longer paid.`,
      `Extent: ${wahlEn(C10_UMFANG_EN, w.umfang, "[extent]")}. Pay is reduced in proportion to the working time lost.${zahl(w.aufstockung) ? ` The Employer tops up the short-time allowance by ${prozentEn(anteil(w.aufstockung)!)} of the net pay lost.` : ""}`,
      "If the Federal Employment Agency refuses short-time allowance for reasons for which the Employer is responsible, short-time work is deemed not to have been introduced; the Employer pays the lost remuneration retrospectively.",
      `If the loss of work changes, the Employer may adjust the extent and timing of short-time work or end it early. It gives at least ${w.anpassungTage || "[number]"} calendar days' notice of this in text form.`,
      ...(w.umfang === "Verkürzung bis auf null" && w.urlaubKuerzung === "ja" ? ["For periods in which work is lost entirely due to short-time work, the holiday entitlement is reduced in proportion to the working days lost."] : []),
      "The rights of a works council remain unaffected.",
    ]),
    normen: ["§§ 95 ff. SGB III", "§ 87 Abs. 1 Nr. 3 BetrVG", "§ 615 BGB"],
    quellen: ["https://www.gesetze-im-internet.de/sgb_3/__95.html", "https://www.gesetze-im-internet.de/betrvg/__87.html", katalog("C10")],
    urteile: [{ az: "BAG-Linie: Kurzarbeitsklauseln nur mit klaren Voraussetzungen, Ankündigungsfrist und Begrenzung, Aktenzeichen prüfen", kennung: "P" }, { az: "EuGH C-229/11 und BAG 9 AZR 225/21 (Urlaub bei Kurzarbeit null)", kennung: "P" }],
    schutz: ["Voraussetzung, Ankündigungsfrist und Höchstdauer sind Pflicht.", "Hinweis: Kurzarbeit wirkt nur mit Zustimmung der Person (dieser Vertrag) oder kollektiver Grundlage."],
    sperren: ["Kurzarbeit nach Ermessen ohne Voraussetzungen.", "Verkürzung auf null ohne Kurzarbeitergeld."],
    stichwoerter: ["Kurzarbeit", "Kurzarbeitergeld", "Kug", "Arbeitsausfall", "Krise", "Auftragsmangel"],
    regeln: [
      regel("P-037", "sperre", "C10 ohne Ankündigungsfrist, Höchstdauer oder Voraussetzung", "§§ 95 ff. SGB III, § 307 BGB", ["C10"], (l) => {
        const fehlt = [
          leer(wert(l, "C10", "voraussetzung")) ? "Voraussetzung" : "",
          num(l, "C10", "ankuendigungTage") ? "" : "Ankündigungsfrist",
          num(l, "C10", "hoechstMonate") ? "" : "Höchstdauer",
        ].filter(Boolean);
        return wenn(hat(l, "C10") && fehlt.length > 0, `Für Kurzarbeit fehlt: ${fehlt.join(", ")}. Ohne diese Angaben ist die Klausel unwirksam.`);
      }),
    ],
  },
  {
    id: "C11", gruppe: "C", label: "Nacht-, Sonn- und Feiertagsarbeit, Zuschläge", labelEn: "Night, Sunday and public holiday work, premiums", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Schicht, Pflege, Gastronomie, Veranstaltungen.",
    felder: [
      { id: "nachtAusgleich", label: "Ausgleich für Nachtarbeit", typ: "auswahl", pflicht: true, standard: "Zuschlag", optionen: ["Zuschlag", "bezahlte freie Tage"] },
      { id: "nachtZuschlag", label: "Nachtzuschlag (Prozent)", typ: "prozent", pflicht: true, min: 0, bei: { nachtAusgleich: ["Zuschlag"] } },
      { id: "freieTage", label: "Bezahlte freie Tage pro Jahr für Nachtarbeit", typ: "zahl", pflicht: true, min: 1, bei: { nachtAusgleich: ["bezahlte freie Tage"] } },
      { id: "sonntagZuschlag", label: "Sonntagszuschlag (Prozent)", typ: "prozent", min: 0 },
      { id: "feiertagZuschlag", label: "Feiertagszuschlag (Prozent)", typ: "prozent", min: 0 },
    ],
    text: (w, k) => [
      `(1) Für Arbeit in der Nachtzeit (${uhr(WERTE.arbzgNachtzeit.vonStunde)} bis ${uhr(WERTE.arbzgNachtzeit.bisStunde)}) erhält ${k.vorname} ${w.nachtAusgleich === "bezahlte freie Tage" ? `${w.freieTage || "[Zahl]"} bezahlte freie Tage im Jahr` : `einen Zuschlag von ${prozent(anteil(w.nachtZuschlag) ?? 0)} auf den Grundstundenlohn`}.`,
      `(2) Sonn- und Feiertagsarbeit leistet ${k.vorname} nur, soweit das Arbeitszeitgesetz sie erlaubt. Dafür gibt es einen Ersatzruhetag.${zahl(w.sonntagZuschlag) ? ` Für Sonntagsarbeit zahlt der Arbeitgeber einen Zuschlag von ${prozent(anteil(w.sonntagZuschlag)!)}.` : ""}${zahl(w.feiertagZuschlag) ? ` Für Feiertagsarbeit zahlt er einen Zuschlag von ${prozent(anteil(w.feiertagZuschlag)!)}.` : ""}`,
      `(3) Bezugsgröße der Zuschläge ist der Grundstundenlohn. Ob Zuschläge steuerfrei sind, richtet sich nach dem Steuerrecht und ist nicht Inhalt dieses Vertrags.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) For work during night time (${uhrEn(WERTE.arbzgNachtzeit.vonStunde)} to ${uhrEn(WERTE.arbzgNachtzeit.bisStunde)}), ${k.vorname} receives ${w.nachtAusgleich === "bezahlte freie Tage" ? `${w.freieTage || "[number]"} paid days off per year` : `a premium of ${prozentEn(anteil(w.nachtZuschlag) ?? 0)} on the basic hourly rate`}.`,
      `(2) ${k.vorname} works on Sundays and public holidays only to the extent permitted by the Working Hours Act. A substitute rest day is granted for such work.${zahl(w.sonntagZuschlag) ? ` For Sunday work, the Employer pays a premium of ${prozentEn(anteil(w.sonntagZuschlag)!)}.` : ""}${zahl(w.feiertagZuschlag) ? ` For public holiday work, it pays a premium of ${prozentEn(anteil(w.feiertagZuschlag)!)}.` : ""}`,
      `(3) The premiums are calculated on the basic hourly rate. Whether premiums are tax-free is governed by tax law and is not part of this contract.`,
    ].join("\n"),
    normen: ["§ 6 Abs. 5 ArbZG", "§§ 9 bis 11 ArbZG", "§ 3b EStG (Hinweis)"],
    quellen: ["https://www.gesetze-im-internet.de/arbzg/__6.html", "https://www.gesetze-im-internet.de/arbzg/__10.html", "https://www.gesetze-im-internet.de/arbzg/__11.html", katalog("C11")],
    schutz: ["Nachtzuschlag oder Freizeitausgleich ist Pflicht, Warnung wenn er fehlt."],
    sperren: ["Sonn- und Feiertagsarbeit ohne Rechtsgrundlage (§ 10 ArbZG)."],
    stichwoerter: ["Nachtzuschlag", "Sonntagszuschlag", "Feiertagszuschlag", "Zuschläge", "Nachtarbeit", "Wochenende"],
  },
  {
    id: "C12", gruppe: "C", label: "Jahresarbeitszeit, Langzeitkonto, Sabbatical", labelEn: "Annual working time, long-term account, sabbatical", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Firmen mit Saisongeschäft und Zeitwertkonten.",
    felder: [
      { id: "art", label: "Art", typ: "auswahl", pflicht: true, optionen: ["Wertguthaben (Zeitwertkonto)", "Jahresarbeitszeitkonto", "Sabbatical"] },
      { id: "anspar", label: "Ansparphase (was, wie viel, wie lange)", typ: "lang", pflicht: true },
      { id: "entnahme", label: "Entnahme (Freistellung, Zeitpunkt, Ankündigung)", typ: "lang", pflicht: true },
      { id: "insolvenz", label: "Insolvenzsicherung", typ: "auswahl", pflicht: true, optionen: ["doppelseitige Treuhand", "Versicherungsmodell", "Bankbürgschaft"] },
      { id: "bewertung", label: "Führung des Kontos", typ: "auswahl", pflicht: true, standard: "in Geld", optionen: ["in Zeit", "in Geld"] },
    ],
    text: (w, k) => [
      `(1) Für ${k.vorname} wird ein Konto geführt: ${w.art || "[Art]"}. Das Konto wird ${w.bewertung || "in Geld"} geführt.`,
      `(2) Ansparphase: ${w.anspar || "[Ansparphase]"}.`,
      `(3) Entnahme: ${w.entnahme || "[Entnahme]"}. Während der Freistellung zahlt der Arbeitgeber das Entgelt aus dem Guthaben, mindestens den gesetzlichen Mindestlohn für die angesparten Stunden.`,
      `(4) Das Guthaben ist gegen Insolvenz gesichert: ${w.insolvenz || "[Sicherung]"}. Ein Verfall von Guthaben ist ausgeschlossen. Endet das Arbeitsverhältnis, wird das Guthaben ausgezahlt oder übertragen.`,
      `(5) Steuerliche und sozialversicherungsrechtliche Fragen klärt der Arbeitgeber mit seiner Steuerberatung.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) An account is kept for ${k.vorname}: ${wahlEn(C12_ART_EN, w.art, "[type]")}. The account is kept ${wahlEn(C12_BEWERTUNG_EN, w.bewertung, "in money")}.`,
      `(2) Saving phase: ${frei(w.anspar) || "[saving phase]"}.`,
      `(3) Withdrawal: ${frei(w.entnahme) || "[withdrawal]"}. During the release from work, the Employer pays remuneration from the credit balance, and at least the statutory minimum wage for the hours saved.`,
      `(4) The credit balance is protected against insolvency: ${wahlEn(C12_INSOLVENZ_EN, w.insolvenz, "[protection]")}. Credit balances do not lapse. If the employment ends, the credit balance is paid out or transferred.`,
      `(5) The Employer clarifies tax and social security questions with its tax adviser.`,
    ].join("\n"),
    normen: ["§ 7b SGB IV", "§ 7e SGB IV", "§ 2 MiLoG"],
    quellen: ["https://www.gesetze-im-internet.de/sgb_4/__7b.html", "https://www.gesetze-im-internet.de/sgb_4/__7e.html", katalog("C12")],
    schutz: ["Insolvenzsicherung ist Pflicht.", "Hinweis auf Steuerberatung."],
    sperren: ["Langzeitkonto ohne Insolvenzsicherung."],
    stichwoerter: ["Langzeitkonto", "Zeitwertkonto", "Sabbatical", "Jahresarbeitszeit", "Auszeit", "Wertguthaben"],
  },
];
