/**
 * Ein- und Austritt: Pläne mit Aufgaben relativ zum Stichtag (erster bzw. letzter Arbeitstag).
 * Vorbilder: Personably und Personio (Journeys mit relativen Fälligkeiten), Humaans und HiBob (Rollen je Aufgabe,
 * Auslöser Statuswechsel), Rippling (Zugänge aus dem Eintritt werden beim Austritt automatisch zu Entzugsaufgaben),
 * Enboarder (Hinweise an Führungskraft und Buddy). Gesetzliche Fristen mit Norm, keine Rechtsberatung.
 * Reine Funktionen ohne Datenbank, damit sie testbar sind.
 */
import type { Antrag, AustrittGrund, Person, Plan, PlanAufgabe, Rolle } from "@/lib/types";
import type { Bundesland, ISODate } from "@/lib/regeln/datum";
import { addDays, addMonths, compare, diffDays, formatDE, fristEndeWerktag } from "@/lib/regeln/datum";
import { fristTextDativ, monateText, WERTE, wochenText } from "@/lib/regeln/werte";
import type { Befund } from "@/lib/regeln/engine";
import { tagVon } from "@/lib/heute";
import { SOFORTMELDUNG_QUELLE } from "@/lib/sofortmeldung";

/** Wofür eine Vorlagenzeile gilt (Beschäftigungsart, Befristung, Grund des Austritts). Ohne `fuer` gilt sie für alle. */
type PlanKontext = { person: Person; grund?: Plan["grund"]; /** Austritt: der Vertrag enthält ein nachvertragliches Wettbewerbsverbot oder eine Kundenschutzklausel. */ wettbewerb?: boolean;
  /** Austritt durch Kündigung oder Aufhebung, aber der Tag des Zugangs fehlt noch: keine Fristzeilen, stattdessen "Zugang eintragen". */ ohneZugang?: boolean;
  /** Eintritt: die Firma arbeitet in einem Bereich mit Sofortmeldepflicht (Firmenangaben, lib/sofortmeldung.ts). */ sofortmeldung?: boolean };
type Vorlage = {
  id: string; phase: string; tage: number; text: string; wer: Rolle; pflicht?: string; hinweis?: string; automatisch?: boolean;
  /** Austritt: anderer Text je Grund (ein Aufhebungsvertrag ist keine Kündigung, Prüffund UX-13). */
  textJe?: Partial<Record<AustrittGrund, string>>;
  fuer?: (k: PlanKontext) => boolean;
  /** Austritt: Fälligkeit zählt ab dem Tag der Kenntnis (Zugang der Kündigung), nicht ab dem letzten Arbeitstag. */
  abKenntnis?: boolean;
  /** Fälligkeit = Ende der Klagefrist (§ 4 Satz 1 KSchG ab Zugang, Ende an Samstag, Sonntag oder Feiertag verschoben, § 222 Abs. 2 ZPO) plus `tage`, nicht auf den letzten Arbeitstag gekappt. */
  abKlagefrist?: boolean;
  /** Frist rechnet ab dem Zugang: ohne eingetragenen Zugang erscheint die Zeile nicht (nie mit dem letzten Arbeitstag als Ersatz). */
  brauchtZugang?: boolean;
  /** Fällig am Tag, an dem der Plan angelegt wurde. */
  abAnlage?: boolean;
  /** Zusätzlicher Hinweis je Person (z. B. Behördenzustimmung bei der Klagefrist). */
  hinweisFuer?: (k: PlanKontext) => string | undefined;
  /** Austritt: Fälligkeit zählt ab dem Vertragsende statt ab dem letzten Arbeitstag (Lohn, Abmeldung, Akte). */
  abVertragsende?: boolean;
};

/** Konten und Geräte je Team (Agentur-Standard). Grundlage für Bestellung beim Eintritt und Entzug beim Austritt. */
export const KONTEN: Record<string, string[]> = {
  alle: ["Laptop", "Google Workspace (Mail, Kalender, Drive)", "Slack", "Projekttool", "Passwortmanager", "Zeiterfassung"],
  Design: ["Figma", "Adobe Creative Cloud"],
  Entwicklung: ["GitHub", "Server- und Cloud-Zugänge", "Testgeräte"],
  Social: ["Social-Media-Konten der Kunden", "Canva"],
  Projektmanagement: ["Kundenportale", "Angebotswerkzeug"],
  Strategie: ["Marktforschungs-Zugänge"],
  Text: ["Lektorats-Werkzeuge"],
  Office: ["Buchhaltung (Lesezugriff)", "Schlüssel und Zugangskarte"],
};
export const kontenFuer = (team: string) => [...KONTEN.alle, ...(KONTEN[team] ?? [])];

export const PHASEN_EINTRITT = ["Zusage", "4 Wochen vorher", "1 Woche vorher", "Tag 1", "Woche 1", "Tag 30", "Tag 60", "Tag 90", "Probezeitende"]; // kein-recht: Namen der Planphasen
export const PHASEN_AUSTRITT = ["Kündigung eingegangen", "Bis zum letzten Tag", "Letzter Tag", "Danach"];

export const VORLAGE_EINTRITT: Vorlage[] = [
  { id: "vertrag", phase: "Zusage", tage: -35, text: "Unterschriebenen Arbeitsvertrag zurück, Probezeit und Befristung in den Stammdaten prüfen", wer: "hr" },
  { id: "fragebogen", phase: "Zusage", tage: -30, text: "Personalfragebogen an die Person: Steuer-ID, SV-Nummer, Krankenkasse, IBAN, Notfallkontakt", wer: "hr", hinweis: "Nur Angaben, die für Lohn und Meldungen nötig sind. Keine Fragen zu Religion, Familienplanung oder Gesundheit (§ 26 BDSG). Mit Betriebsrat: Zustimmung nach § 94 BetrVG." }, // kein-recht: Lintelly-Planungsziel
  { id: "fragebogen-da", phase: "Zusage", tage: -21, text: "Personalfragebogen vollständig zurück", wer: "person" },
  { id: "buddy", phase: "4 Wochen vorher", tage: -28, text: "Buddy aus dem Team benennen und kurz einweisen", wer: "fuehrung" }, // kein-recht: Planphase
  { id: "geraete", phase: "4 Wochen vorher", tage: -28, text: "Laptop und Zugänge bestellen (Liste unten)", wer: "it" },
  { id: "willkommen", phase: "4 Wochen vorher", tage: -21, text: "Willkommensseite freischalten: Ablauf Tag 1, Team, Buddy, Anfahrt (Link erstellen, Tag 1 prüfen)", wer: "hr" }, // kein-recht: Planphase
  { id: "tag1-plan", phase: "1 Woche vorher", tage: -7, text: "Tagesplan für die erste Woche und erstes kleines Projekt festlegen", wer: "fuehrung" },
  { id: "konten", phase: "1 Woche vorher", tage: -5, text: "Geräte eingerichtet, Konten angelegt, Zugangsdaten sicher bereit", wer: "it" },
  { id: "team-info", phase: "1 Woche vorher", tage: -3, text: "Team über den Start informieren, Begrüßung im Slack-Kanal vorbereiten", wer: "fuehrung" },
  { id: "nachweis-1", phase: "Tag 1", tage: 0, text: "Nachweis der wesentlichen Arbeitsbedingungen liegt vor (steht im Arbeitsvertrag)", wer: "hr", pflicht: "§ 2 Abs. 1 Satz 4 NachwG: Name und Anschrift, Entgelt und Arbeitszeit spätestens am ersten Arbeitstag" },
  { id: "unterweisung", phase: "Tag 1", tage: 0, text: "Unterweisung Arbeitsschutz vor Arbeitsaufnahme (Bildschirmarbeit, Brandschutz, Erste Hilfe), unterschreiben lassen", wer: "hr", pflicht: "§ 12 Abs. 1 ArbSchG: Unterweisung bei der Einstellung" },
  { id: "datenschutz", phase: "Tag 1", tage: 0, text: "Verpflichtung auf Vertraulichkeit und Datenschutz unterschreiben lassen", wer: "hr", pflicht: "Art. 29, Art. 32 Abs. 4 DSGVO" },
  { id: "begruessung", phase: "Tag 1", tage: 0, text: "Begrüßung, Rundgang, Mittagessen mit dem Buddy", wer: "buddy" },
  { id: "nachweis-7", phase: "Woche 1", tage: WERTE.nachwgFristen.tage, text: "Nachweis: Beginn, Befristung, Arbeitsort, Tätigkeit, Probezeit, Überstunden liegen vor", wer: "hr", pflicht: "§ 2 Abs. 1 Satz 4 NachwG: spätestens am siebten Kalendertag" },
  { id: "ziele-30", phase: "Woche 1", tage: 5, text: "Ziele für die ersten 30 Tage gemeinsam festhalten", wer: "fuehrung" }, // kein-recht: Einarbeitungsziel
  { id: "sv-anmeldung", phase: "Woche 1", tage: WERTE.planZiele.svAnmeldungTage, text: "Anmeldung zur Sozialversicherung über das Lohnbüro mit der ersten Abrechnung", wer: "hr", pflicht: `§ 6 DEÜV: mit der ersten Entgeltabrechnung, spätestens ${wochenText(WERTE.deuevMeldungWochen.wert)} nach Beginn. Eine Sofortmeldung ersetzt diese Anmeldung nicht` },
  { id: "sofortmeldung", phase: "Tag 1", tage: 0, text: "Sofortmeldung an die Datenstelle der Rentenversicherung, über das Lohnbüro oder sv.net: Name, Versicherungsnummer (sonst Tag und Ort der Geburt und Anschrift), Betriebsnummer, Tag der Arbeitsaufnahme", wer: "hr", fuer: (k) => !!k.sofortmeldung,
    pflicht: `${SOFORTMELDUNG_QUELLE}: spätestens bei Aufnahme der Beschäftigung, Pflicht im Wirtschaftsbereich der Firma (Einrichtung, Firmenangaben)` },
  { id: "nachweis-30", phase: "Tag 30", tage: WERTE.planZiele.nachweisMonatTage, text: "Nachweis: Urlaub, Fortbildung, Altersversorgung, Kündigungsverfahren, Tarif- und Betriebsvereinbarungen liegen vor", wer: "hr", pflicht: "§ 2 Abs. 1 Satz 4 NachwG: spätestens einen Monat nach Beginn" },
  { id: "checkin-30", phase: "Tag 30", tage: 30, text: "Gespräch nach 30 Tagen: Was läuft gut, was fehlt?", wer: "fuehrung" }, // kein-recht: Einarbeitungsgespräch
  { id: "buddy-60", phase: "Tag 60", tage: 60, text: "Rückmeldung vom Buddy: Ist die Person angekommen?", wer: "buddy" },
  { id: "checkin-90", phase: "Tag 90", tage: 90, text: "Gespräch nach 90 Tagen: Einarbeitung abgeschlossen? Ziele bis Probezeitende", wer: "fuehrung" }, // kein-recht: Einarbeitungsgespräch
  { id: "befristung-schrift", phase: "Zusage", tage: -7, text: "Befristung: Vertrag mit der Befristungsabrede ist von beiden Seiten im Original unterschrieben, vor dem ersten Arbeitstag", wer: "hr", fuer: (k) => !!k.person.befristung,
    pflicht: "§ 14 Abs. 4 TzBfG: Schriftform vor Arbeitsaufnahme, sonst gilt der Vertrag als unbefristet (§ 16 TzBfG)" },
  { id: "azubi-vertrag", phase: "Zusage", tage: -28, text: "Ausbildungsvertrag zur Eintragung in das Verzeichnis der Berufsausbildungsverhältnisse bei der zuständigen Stelle einreichen", wer: "hr", fuer: (k) => k.person.art === "azubi",
    pflicht: "§ 34 und § 35 BBiG: Eintragung in das Verzeichnis der Berufsausbildungsverhältnisse" },
  { id: "azubi-untersuchung", phase: "1 Woche vorher", tage: -7, text: `Ärztliche Erstuntersuchung liegt vor (nur bei Auszubildenden unter ${WERTE.jugendlicheBisJahre.wert} Jahren)`, wer: "hr", fuer: (k) => k.person.art === "azubi" && !(k.person.geburtstag > "1900-01-01" && addMonths(k.person.geburtstag, WERTE.jugendlicheBisJahre.wert * 12) <= k.person.eintritt),
    pflicht: "§ 32 JArbSchG: Beschäftigung Jugendlicher nur mit Bescheinigung über die Erstuntersuchung" },
  { id: "werkstudent-nachweis", phase: "1 Woche vorher", tage: -7, text: "Werkstudent: aktuelle Immatrikulationsbescheinigung liegt vor, Stundengrenze in der Vorlesungszeit ist vereinbart", wer: "hr", fuer: (k) => k.person.art === "werkstudent",
    pflicht: "§ 6 Abs. 1 Nr. 3 SGB V: Versicherungsfreiheit nur bei Studium im Vordergrund" },
  { id: "minijob-meldung", phase: "Woche 1", tage: 7, text: "Minijob: Verdienstgrenze und Wochenstunden gegen die Regelwerte prüfen, Anmeldung bei der Minijob-Zentrale über das Lohnbüro veranlassen", wer: "hr", fuer: (k) => k.person.art === "minijob",
    pflicht: "§ 8 und § 8a SGB IV (geringfügige Beschäftigung), § 28a SGB IV (Meldung)" },
  { id: "aufenthalt", phase: "Zusage", tage: -21, text: "Aufenthaltstitel und Arbeitserlaubnis prüfen: Art und Gültigkeit liegen vor, Ablauf ist eingetragen", wer: "hr", fuer: (k) => !!k.person.aufenthalt,
    pflicht: "§ 4a Abs. 3 AufenthG: Beschäftigung nur mit Erlaubnis (Kanzlei prüfen lassen)" },
  { id: "probezeit", phase: "Probezeitende", tage: 150, text: "Probezeit-Entscheidung vorbereiten (die Geschäftsführung entscheidet)", wer: "lintelly", automatisch: true, hinweis: "Erscheint 60 Tage vor Probezeitende als Entscheidung. Die Kündigung muss vor dem Ende zugehen (§ 622 Abs. 3 BGB)." }, // kein-recht: Lintelly-Planungsziel, Frist rechnet faelligFuer
];

export const VORLAGE_AUSTRITT: Vorlage[] = [
  { id: "schriftform", phase: "Kündigung eingegangen", tage: 0, abKenntnis: true, text: "Kündigung im Original mit Unterschrift? Eingang mit Datum bestätigen", wer: "hr", pflicht: "§ 623 BGB: Kündigung und Aufhebungsvertrag nur schriftlich wirksam", fuer: (k) => !["befristung", "vergleich", "tod"].includes(k.grund ?? ""),
    textJe: { aufhebung: "Aufhebungsvertrag im Original von beiden Seiten unterschrieben? Original in die Akte" } },
  { id: "zugang", phase: "Kündigung eingegangen", tage: 0, abAnlage: true, text: "Zugang eintragen: Tag, an dem die Kündigung zuging (bei Aufhebung der Tag der Unterschrift). Erst dann rechnet Lintelly Meldefrist und Klagefrist", wer: "hr", fuer: (k) => !!k.ohneZugang,
    pflicht: "§ 4 Satz 1 KSchG, § 38 Abs. 1 SGB III: Klagefrist und Meldefrist laufen ab dem Zugang", hinweis: "Beim Abhaken den Tag des Zugangs als Datum eintragen. Ohne ihn stehen die Fristen für arbeitsuchend und Klage nicht im Plan." },
  { id: "arbeitsuchend", phase: "Kündigung eingegangen", tage: 0, abKenntnis: true, brauchtZugang: true, text: `Hinweis auf die Meldung als arbeitsuchend geben (${monateText(WERTE.arbeitsuchendMeldung.monate)} vorher, sonst binnen ${fristTextDativ(WERTE.arbeitsuchendMeldung.tage)})`, wer: "hr", pflicht: "§ 2 Abs. 2 Satz 2 Nr. 3 SGB III, § 38 Abs. 1 SGB III" },
  { id: "klagefrist", phase: "Kündigung eingegangen", tage: 0, abKlagefrist: true, brauchtZugang: true, text: `Klagefrist läuft bis zu diesem Tag (${WERTE.kschgKlageWochen.wert} Wochen nach Zugang): Bis dahin kann die Person Kündigungsschutzklage erheben`, wer: "hr", fuer: (k) => k.grund === "arbeitgeber",
    pflicht: `${WERTE.kschgKlageWochen.quelle}; § 222 Abs. 2 ZPO: endet die Frist an einem Samstag, Sonntag oder Feiertag, läuft sie bis zum nächsten Werktag; § 23 Abs. 1 Satz 2 KSchG: gilt auch im Kleinbetrieb`, hinweis: "Hinweis für die Kanzlei-Prüfung, keine Rechtsberatung. Den Tag des Zugangs im Original der Kündigung belegen.",
    hinweisFuer: (k) => (k.person.schwerbehindert || k.person.mutterschutz || k.person.elternzeit ? "Braucht die Kündigung die Zustimmung einer Behörde (Schwerbehinderung, Mutterschutz, Elternzeit), beginnt die Frist erst mit der Bekanntgabe der Entscheidung an die Person (§ 4 Satz 4 KSchG). Den Tag mit der Kanzlei klären." : undefined) },
  { id: "klagefrist-ende", phase: "Danach", tage: 1, abKlagefrist: true, brauchtZugang: true, text: "Klagefrist abgelaufen: Nachweis des Zugangs in die Akte legen. Die Kanzlei fragen, ob eine nachträgliche Zulassung der Klage in Frage kommt (§ 5 KSchG), bevor Zeugnis, Abgeltung und Neubesetzung als sicher gelten", wer: "hr", fuer: (k) => k.grund === "arbeitgeber" },
  { id: "uebergabe-plan", phase: "Kündigung eingegangen", tage: 5, abKenntnis: true, text: "Übergabeplan: Projekte, Kunden, Zugänge, Ablage, wer übernimmt was", wer: "fuehrung" },
  { id: "uebergabe", phase: "Bis zum letzten Tag", tage: 0, text: "Übergabe: offene Anträge, Aufgaben und Genehmigerrollen an eine benannte Person umhängen", wer: "hr",
    hinweis: "Pflichtschritt vor dem Ende. Erledigt sich mit „Übergabe bestätigen“ in diesem Plan." },
  { id: "urlaub", phase: "Bis zum letzten Tag", tage: 7, abKenntnis: true, text: "Resturlaub planen. Was nicht genommen werden kann, wird abgegolten (Zahlen und Rechenweg im Plan)", wer: "hr", pflicht: "§ 7 Abs. 4 BUrlG" }, // kein-recht: Lintelly-Planungsziel
  { id: "zeugnis", phase: "Bis zum letzten Tag", tage: -14, text: "Endzeugnis entwerfen und prüfen (Neues Dokument, Anlass „Jemand geht“)", wer: "hr", pflicht: "§ 109 GewO: Anspruch auf Zeugnis bei Beendigung" },
  { id: "exit", phase: "Bis zum letzten Tag", tage: -7, text: "Austrittsgespräch führen, Ergebnis nur zusammengefasst weitergeben", wer: "hr" },
  { id: "rueckgabe-termin", phase: "Bis zum letzten Tag", tage: -5, text: "Termin für Rückgabe von Laptop, Schlüssel und Zugangskarte", wer: "it" },
  { id: "abschied", phase: "Bis zum letzten Tag", tage: -2, text: "Abschied im Team planen, Kunden informieren", wer: "fuehrung" },
  { id: "wettbewerb", phase: "Bis zum letzten Tag", tage: -14, text: "Nachvertragliches Wettbewerbsverbot oder Kundenschutz im Arbeitsvertrag: Verzicht erklären oder Karenzentschädigung einplanen", wer: "gf", fuer: (k) => !!k.wettbewerb,
    pflicht: `§ 74 Abs. 2 und § 75a HGB: Verzicht nur vor dem Ende, die Entschädigungspflicht endet erst ${monateText(WERTE.karenzVerzichtMonate.wert)} nach der Erklärung`,
    hinweis: `Wer verzichten will, erklärt es schriftlich vor dem letzten Tag. Sonst ist je Jahr des Verbots mindestens die Hälfte der zuletzt bezogenen Leistungen zu zahlen (${WERTE.karenzMindestAnteil.quelle}). Steht im Vertrag nichts davon (oder liegt er nicht in Lintelly), die Aufgabe ohne Folgen abhaken. Hinweis für die Kanzlei-Prüfung, keine Rechtsberatung.` },
  { id: "karenz-lohn", phase: "Danach", tage: WERTE.planZiele.abmeldungTage, abVertragsende: true, text: "Wurde nicht verzichtet: Karenzentschädigung für die Folgemonate in den Lohn-Input eintragen", wer: "hr", fuer: (k) => !!k.wettbewerb },
  { id: "entzug", phase: "Letzter Tag", tage: 0, text: "Alle Zugänge sperren (Liste unten), automatische Antwort mit Ansprechperson einrichten, keine Weiterleitung", wer: "it", pflicht: "Art. 5 Abs. 1 lit. c DSGVO, § 26 Abs. 1 BDSG",
    hinweis: `Vorher klären, ob die Person das Postfach privat nutzen durfte (dann gilt auch das Fernmeldegeheimnis, § 3 TDDDG). Wer trotzdem weiterleiten will, trägt Empfänger und Zweck ein und hält die Frist von höchstens ${WERTE.planZiele.postfachWeiterleitungMonate} Monaten fest. Ob das zulässig ist, prüft die Kanzlei.` },
  { id: "rueckgabe", phase: "Letzter Tag", tage: 0, text: "Arbeitsmittel zurück (Laptop, Handy, Schlüssel), Rückgabe quittieren", wer: "it", pflicht: "Art. 17 und Art. 32 DSGVO: Laptop, Handy und Tablet zurücksetzen, mit Datum und Person",
    hinweis: "Bleibt offen, bis jeder Gegenstand zurück, als verloren gemeldet oder bewusst überlassen ist. War die private Nutzung erlaubt, sichert die Person vorher ihre privaten Daten und bestätigt das in Mein Lintelly." },
  { id: "papiere", phase: "Letzter Tag", tage: 0, text: "Zeugnis aushändigen, Arbeitsbescheinigung an die Agentur für Arbeit übermitteln", wer: "hr", pflicht: "§ 109 GewO, § 312 SGB III" },
  { id: "alumni", phase: "Letzter Tag", tage: 0, text: "Fragen, ob die Person im Alumni-Kreis bleiben möchte (nur mit Einwilligung)", wer: "fuehrung" },
  { id: "abmeldung", phase: "Danach", tage: WERTE.planZiele.abmeldungTage, abVertragsende: true, text: "Abmeldung zur Sozialversicherung über das Lohnbüro", wer: "hr", pflicht: `§ 8 DEÜV: mit der nächsten Entgeltabrechnung, spätestens ${wochenText(WERTE.deuevMeldungWochen.wert)} nach Ende` },
  { id: "abrechnung", phase: "Danach", tage: 20, abVertragsende: true, text: "Schlussabrechnung mit Urlaubsabgeltung im Lohn-Input (Tage und Rechenweg stehen oben im Plan)", wer: "hr" },
  { id: "daten", phase: "Danach", tage: 30, abVertragsende: true, text: "Personalakte auf Aufbewahrungsfristen umstellen, nicht mehr nötige Daten löschen", wer: "hr", pflicht: "Art. 17 DSGVO, Aufbewahrung nach § 147 AO und § 257 HGB" }, // kein-recht: Lintelly-Planungsziel
  { id: "postfach", phase: "Danach", tage: 90, text: "Postfach der Person nach Ablauf der Frist löschen oder archivieren, Löschung dokumentieren", wer: "it", pflicht: "Art. 5 Abs. 1 lit. e und Art. 17 Abs. 1 lit. a DSGVO" },
];

/** Texte der Austrittsgründe (Paket A). Eine Kündigung durch die Firma entsteht nur im Ablauf mit Prüfung, nicht im Dialog "Austritt erfassen". */
export const GRUND_TEXT: Record<AustrittGrund, string> = {
  arbeitnehmer: "Eigenkündigung", arbeitgeber: "Kündigung durch die Firma", aufhebung: "Aufhebungsvertrag", befristung: "Ende der Befristung",
  rente: "Rente", tod: "Tod", vergleich: "Vergleich oder gerichtliche Beendigung", sonstiges: "Sonstiges",
};
/** Ab wann die Meldefristen laufen, je Grund (Feld "Kenntnis" im Plan). Ohne Eintrag (Befristung, Tod) gibt es keinen Tag der Kenntnis. */
export const KENNTNIS_TEXT: Partial<Record<AustrittGrund, string>> = {
  arbeitnehmer: "Kündigung zugegangen", arbeitgeber: "Kündigung zugegangen", aufhebung: "Aufhebungsvertrag unterschrieben", vergleich: "Vergleich geschlossen", rente: "Ende bekannt seit", sonstiges: "Ende bekannt seit",
};
/** Beim Tod der Person entfallen Aufgaben, die eine lebende Person voraussetzen. */
/** Hier ist der Tag des Zugangs Pflicht (bei Aufhebung der Tag der Unterschrift): ohne ihn keine Fristzeilen, nie ein geratener Tag. */
const ZUGANG_PFLICHT = new Set<AustrittGrund>(["arbeitnehmer", "arbeitgeber", "aufhebung"]);
export const brauchtZugang = (grund: Plan["grund"] | undefined) => !!grund && ZUGANG_PFLICHT.has(grund);
const NICHT_BEI_TOD = new Set(["arbeitsuchend", "zeugnis", "exit", "abschied", "alumni", "papiere", "wettbewerb", "karenz-lohn"]);

/** Letzter Arbeitstag: bei Freistellung vor dem Vertragsende, sonst das Vertragsende (`austritt`). */
export const letzterArbeitstag = (p: Pick<Person, "austritt" | "letzterArbeitstag">) => p.letzterArbeitstag ?? p.austritt;

export const ROLLE_TEXT: Record<Rolle, string> = { hr: "HR-Leitung", fuehrung: "Führungskraft", it: "IT", buddy: "Buddy", person: "Neue Person", gf: "Geschäftsführung", lintelly: "Lintelly" };

/**
 * Meldung als arbeitsuchend (§ 38 Abs. 1 SGB III): spätestens drei Monate vor dem Ende; erfährt die Person weniger als drei Monate
 * vorher davon, innerhalb von drei Tagen nach Kenntnis. Ohne Kenntnisdatum (Befristung, von Anfang an bekannt) gilt drei Monate vor dem Ende.
 * Nie vor der Kenntnis: am Monatsende kappt die Monatsrechnung (Zugang 31.03., Ende 30.06. ergäbe 30.03.), dann gelten die drei Tage (Prüffund T-2).
 * Nicht spaetestensVor (Review 23.10.2026, B1): Bezug ist das Ende des letzten Tags, nicht ein Beginn. Drei Monate vor dem letzten Tag sind
 * nach §§ 187, 188 BGB rückwärts derselbe Tag oder, am Monatsende, einen Tag früher, nie später.
 */
export function arbeitsuchendFrist(letzterTag: ISODate, kenntnis: ISODate | null): ISODate {
  const m = WERTE.arbeitsuchendMeldung;
  const frueh = addMonths(letzterTag, -m.monate);
  return !kenntnis || compare(frueh, kenntnis) >= 0 ? frueh : addDays(kenntnis, m.tage);
}

/** Ziele nach dem Stichtag liegen nie auf Wochenende oder Feiertag, sondern am nächsten Werktag (Prüffund UX-18). Frühere Ziele bleiben. */
const ziel = (ab: ISODate, tage: number, land?: Bundesland) => (tage > 0 ? fristEndeWerktag(ab, tage, land) : addDays(ab, tage));

/** Fälligkeit einer Vorlagenzeile. Austritt: ab Kenntnis, davor liegende Zeilen nie vor der Kenntnis (sonst wären sie beim Anlegen überfällig). */
type Faellig = { art: Plan["art"]; stichtag: ISODate; kenntnis: ISODate | null; probezeitMonate?: number | null; vertragsende?: ISODate; erstellt: ISODate; land?: Bundesland; ohneZugang?: boolean };
function faelligFuer(v: Vorlage, o: Faellig): ISODate {
  if (v.id === "probezeit" && o.probezeitMonate) return addDays(addDays(o.stichtag, Math.round(o.probezeitMonate * WERTE.planZiele.tageJeMonat)), -WERTE.planZiele.probezeitVorlaufTage);
  if (o.art === "austritt") {
    if (v.abAnlage) return o.erstellt;
    if (v.id === "arbeitsuchend") return arbeitsuchendFrist(o.vertragsende ?? o.stichtag, o.kenntnis);
    if (v.abVertragsende) return ziel(o.vertragsende ?? o.stichtag, v.tage, o.land);
    // Zeilen mit brauchtZugang gibt es nur mit Zugang; der Tag des Anlegens steht nur für den Typprüfer da, nie der letzte Arbeitstag.
    if (v.abKlagefrist) return addDays(fristEndeWerktag(o.kenntnis ?? o.erstellt, WERTE.kschgKlageWochen.wert * 7, o.land), v.tage);
    // Fehlt der Zugang einer Kündigung, ist die Zeile ab dem Anlegen fällig, nie vor der Kündigung selbst (Prüffund UX-18).
    if (v.abKenntnis) { const f = addDays(o.kenntnis ?? (o.ohneZugang ? o.erstellt : addMonths(o.stichtag, -WERTE.arbeitsuchendMeldung.monate)), v.tage); return compare(f, o.stichtag) > 0 ? o.stichtag : f; }
    const f = ziel(o.stichtag, v.tage, o.land);
    return o.kenntnis && v.tage < 0 && compare(f, o.kenntnis) < 0 ? o.kenntnis : f;
  }
  return ziel(o.stichtag, v.tage, o.land);
}

const vorlageFuer = (art: Plan["art"]) => (art === "eintritt" ? VORLAGE_EINTRITT : VORLAGE_AUSTRITT);
const gilt = (v: Vorlage, k: PlanKontext) => (!v.fuer || v.fuer(k)) && !(k.grund === "tod" && NICHT_BEI_TOD.has(v.id)) && !(v.brauchtZugang && k.ohneZugang);
const textFuer = (v: Vorlage, grund: Plan["grund"]) => (grund && v.textJe?.[grund]) || v.text;
const hinweisFuer = (v: Vorlage, k: PlanKontext) => [v.hinweis, v.hinweisFuer?.(k)].filter(Boolean).join(" ") || undefined;
const zuAufgabe = (v: Vorlage, faellig: ISODate, k: PlanKontext): PlanAufgabe => ({ id: v.id, phase: v.phase, text: textFuer(v, k.grund ?? null), wer: v.wer, pflicht: v.pflicht, hinweis: hinweisFuer(v, k), automatisch: v.automatisch, erledigt: false, faellig });

/** Aufgaben, die vor Arbeitsbeginn erledigt sein müssen: stehen zuerst in ihrem Abschnitt und tragen eine Marke (Prüffund UX-32). */
const VOR_ARBEITSBEGINN = new Set(["sofortmeldung"]);
export const markeFuer = (aufgabeId: string) => (VOR_ARBEITSBEGINN.has(aufgabeId) ? "Muss vor Arbeitsbeginn passieren" : null);
/** Aufgaben eines Abschnitts in Anzeigereihenfolge. Auch ältere Pläne, in denen der Abgleich die Sofortmeldung hinten angefügt hat. */
export const aufgabenDerPhase = (plan: Pick<Plan, "aufgaben">, phase: string) =>
  plan.aufgaben.filter((x) => x.phase === phase).sort((a, b) => Number(VOR_ARBEITSBEGINN.has(b.id)) - Number(VOR_ARBEITSBEGINN.has(a.id)));

/** Abschnitt im Plan: der erste Austrittsabschnitt heißt nur bei einer Kündigung "Kündigung eingegangen" (Prüffund UX-13). */
export const phaseText = (phase: string, grund: Plan["grund"]) =>
  phase !== "Kündigung eingegangen" || grund === "arbeitnehmer" || grund === "arbeitgeber" ? phase : grund === "aufhebung" ? "Aufhebungsvertrag unterschrieben" : "Ende steht fest";

/**
 * Plan aus der Vorlage erzeugen. Aufgaben richten sich nach Beschäftigungsart und Befristung. Beim Austritt rechnen die
 * Meldefristen ab `kenntnis` (Zugang der Kündigung). Was vor heute fällig gewesen wäre, ist offen und damit sofort sichtbar.
 */
export function erzeugePlan(o: { id: string; art: Plan["art"]; person: Person; stichtag: ISODate; buddyId?: string | null; grund?: Plan["grund"]; erstellt: string; probezeitMonate?: number | null; kenntnis?: ISODate | null; wettbewerb?: boolean; vertragsende?: ISODate; kuendigungsArt?: Plan["kuendigungsArt"]; sofortmeldung?: boolean; /** Bundesland der Firma: Feiertage beim Ende der Klagefrist. */ land?: Bundesland }): Plan {
  // Kündigung und Aufhebung: der Zugang wird nie geraten (Nachtprüfung 18./19.10. Nr. 7). Sonst gilt ohne Angabe der Tag des Anlegens als Kenntnis.
  const kenntnis = o.art === "austritt" ? (o.kenntnis ?? (o.grund === "befristung" || o.grund === "tod" || brauchtZugang(o.grund) ? null : tagVon(o.erstellt))) : null;
  const k: PlanKontext = { person: o.person, grund: o.grund, wettbewerb: o.wettbewerb, sofortmeldung: o.sofortmeldung, ohneZugang: o.art === "austritt" && brauchtZugang(o.grund) && !kenntnis };
  const vertragsende = o.art === "austritt" && o.vertragsende && compare(o.vertragsende, o.stichtag) > 0 ? o.vertragsende : undefined;
  const fo: Faellig = { art: o.art, stichtag: o.stichtag, kenntnis, probezeitMonate: o.probezeitMonate, vertragsende, erstellt: tagVon(o.erstellt), land: o.land, ohneZugang: k.ohneZugang };
  const aufgaben = vorlageFuer(o.art)
    .filter((v) => gilt(v, k) && !(v.id === "probezeit" && !o.probezeitMonate))
    .map((v) => zuAufgabe(v, faelligFuer(v, fo), k));
  return {
    id: o.id, art: o.art, personId: o.person.id, stichtag: o.stichtag, buddyId: o.buddyId ?? null, grund: o.grund ?? null, aufgaben, status: "laeuft", erstellt: o.erstellt,
    ...(o.art === "austritt" ? { kenntnis } : {}), ...(o.wettbewerb ? { wettbewerb: true } : {}), ...(vertragsende ? { vertragsende } : {}), ...(o.kuendigungsArt ? { kuendigungsArt: o.kuendigungsArt } : {}),
  };
}

/**
 * Plan an die aktuellen Personendaten anpassen (Ein- und Austritt Nr. 5): neuer Stichtag aus Eintritts- oder Austrittsdatum, offene Aufgaben
 * neu gerechnet, fehlende Aufgaben (Probezeit, Befristung, Sofortmeldung) ergänzt. Erledigtes bleibt, wie es ist. Liefert true, wenn sich etwas geändert hat.
 * `sofortmeldung` gilt nur für Eintrittspläne und kommt aus den Firmenangaben (lib/module/plan-abgleich.ts).
 */
export function planAbgleichen(plan: Plan, person: Person, sofortmeldung = false, land?: Bundesland): boolean {
  const stichtag = plan.art === "eintritt" ? person.eintritt : letzterArbeitstag(person) ?? plan.stichtag;
  const k: PlanKontext = { person, grund: plan.grund, wettbewerb: plan.wettbewerb, sofortmeldung, ohneZugang: plan.art === "austritt" && brauchtZugang(plan.grund) && !plan.kenntnis };
  const probe = plan.art === "eintritt" ? person.probezeitMonate : null;
  const ende = plan.art === "austritt" ? person.austritt ?? plan.vertragsende : undefined;
  const vertragsende = ende && compare(ende, stichtag) > 0 ? ende : undefined;
  let geaendert = stichtag !== plan.stichtag || vertragsende !== plan.vertragsende;
  plan.stichtag = stichtag;
  if (vertragsende) plan.vertragsende = vertragsende; else delete plan.vertragsende;
  const fo: Faellig = { art: plan.art, stichtag, kenntnis: plan.kenntnis ?? null, probezeitMonate: probe, vertragsende, erstellt: tagVon(plan.erstellt), land, ohneZugang: k.ohneZugang };
  for (const v of vorlageFuer(plan.art)) {
    const da = plan.aufgaben.find((a) => a.id === v.id);
    const soll = gilt(v, k) && !(v.id === "probezeit" && !probe);
    if (!da) { if (soll) { plan.aufgaben.push(zuAufgabe(v, faelligFuer(v, fo), k)); geaendert = true; } continue; }
    if (da.erledigt) continue;
    if (!soll) { plan.aufgaben = plan.aufgaben.filter((a) => a !== da); geaendert = true; continue; }
    const text = textFuer(v, plan.grund ?? null);
    if (text !== da.text) { da.text = text; geaendert = true; }
    const hinweis = hinweisFuer(v, k);
    if (v.hinweisFuer && hinweis !== da.hinweis) { da.hinweis = hinweis; geaendert = true; }
    const f = faelligFuer(v, fo);
    if (f !== da.faellig) { da.faellig = f; geaendert = true; }
  }
  if (geaendert) plan.status = plan.aufgaben.every((a) => a.erledigt) ? "fertig" : "laeuft";
  return geaendert;
}

export type PlanStand = { gesamt: number; erledigt: number; prozent: number; ueberfaellig: PlanAufgabe[]; naechste: PlanAufgabe[]; tageBis: number };

export function stand(p: Plan, heute: ISODate): PlanStand {
  const offen = p.aufgaben.filter((a) => !a.erledigt).sort((a, b) => compare(a.faellig, b.faellig));
  const erledigt = p.aufgaben.length - offen.length;
  return {
    gesamt: p.aufgaben.length, erledigt, prozent: p.aufgaben.length ? Math.round((erledigt / p.aufgaben.length) * 100) : 0,
    ueberfaellig: offen.filter((a) => compare(a.faellig, heute) < 0),
    naechste: offen.filter((a) => compare(a.faellig, heute) >= 0).slice(0, 4),
    tageBis: diffDays(heute, p.stichtag),
  };
}

/** Überfällige Pflichtaufgaben und nahe Pflichtfristen werden Befunde in Fristen und HR-Tag. */
export function planBefunde(plaene: Plan[], personen: Person[], heute: ISODate): Befund[] {
  const out: Befund[] = [];
  for (const p of plaene.filter((x) => x.status === "laeuft")) {
    const pers = personen.find((x) => x.id === p.personId);
    if (!pers) continue;
    const name = `${pers.vorname} ${pers.nachname}`;
    for (const a of p.aufgaben.filter((x) => !x.erledigt && (x.pflicht || x.id === "uebergabe"))) {
      const t = diffDays(heute, a.faellig);
      // Die Übergabe steht in den Fristen, solange sie offen ist (Paket A), Pflichtfristen erst eine Woche vorher.
      if (t > 7 && a.id !== "uebergabe") continue;
      out.push({
        id: `plan-${a.id}:${pers.id}:${a.faellig}`, regel: `plan-${p.art}`, kategorie: "frist", personId: pers.id, href: `/ein-austritt/${p.id}`,
        titel: `${p.art === "eintritt" ? "Eintritt" : "Austritt"} ${name}: ${a.text.split(/[:(]/)[0].trim()}`, datum: a.faellig, tageBis: t,
        dringlichkeit: t < 0 ? "ueberfaellig" : t <= 3 ? "bald" : "demnaechst",
        rechenweg: [`${p.art === "eintritt" ? "Erster" : "Letzter"} Arbeitstag ${formatDE(p.stichtag)}`, `Aufgabe fällig am ${formatDE(a.faellig)}, zuständig: ${ROLLE_TEXT[a.wer]}`],
        quelle: a.pflicht ?? "Lintelly: Übergabe vor dem letzten Arbeitstag", vorschlag: "Im Plan abhaken, sobald erledigt. Lintelly erinnert die zuständige Person.", zustaendig: "hr",
      });
    }
  }
  return out;
}

/* ---------- Eigene Aufgaben in der Personen-Ansicht (08.10.2026) ---------- */

export type EigeneAufgabe = { plan: Plan; aufgabe: Plan["aufgaben"][number]; als: "buddy" | "person" | "fuehrung" | "it" };
/** Wer die IT-Aufgaben der Pläne macht (Einstellung der HR-Leitung). Ohne Eintrag liegen sie bei der HR-Leitung. */
export type PlanZustaendige = { it?: string | null };

/**
 * Ist diese Person für die Aufgabe zuständig? Buddy: als Buddy im Plan eingetragen. Person: die neue (oder gehende) Person selbst.
 * Führungskraft: direkte Führungskraft der Person aus dem Plan. HR-, IT- und GF-Aufgaben erledigt die Firmenansicht.
 * (Nick 08.10.2026: "Warum hat Jan bei sich kein Todo für Onboarding-Buddy?")
 */
export function zustaendigAls(ichId: string, plan: Plan, aufgabe: Plan["aufgaben"][number], personen: Person[], zust: PlanZustaendige = {}): EigeneAufgabe["als"] | null {
  if (aufgabe.wer === "it" && zust.it === ichId && plan.personId !== ichId) return "it";
  if (aufgabe.wer === "buddy" && plan.buddyId === ichId) return "buddy";
  if (aufgabe.wer === "person" && plan.personId === ichId) return "person";
  if (aufgabe.wer === "fuehrung" && personen.find((p) => p.id === plan.personId)?.fuehrung === ichId) return "fuehrung";
  return null;
}

/** Offene Aufgaben aus laufenden Plänen, für die die Person zuständig ist, nach Fälligkeit. */
export function aufgabenFuer(ichId: string, plaene: Plan[], personen: Person[], zust: PlanZustaendige = {}): EigeneAufgabe[] {
  return plaene.filter((p) => p.status === "laeuft" && planSichtbarFuer(p, { personId: ichId })).flatMap((plan) => plan.aufgaben.filter((a) => !a.erledigt).flatMap((aufgabe) => {
    const als = zustaendigAls(ichId, plan, aufgabe, personen, zust);
    return als ? [{ plan, aufgabe, als }] : [];
  })).sort((a, b) => a.aufgabe.faellig.localeCompare(b.aufgabe.faellig));
}

/* ---------- Vertraulicher Austritt und Übergabe (Paket A, 18.10.2026) ---------- */

/**
 * Bis "Austritt kommunizieren" sieht einen Austritt nur, wer den Bereich Austritt sehen darf (`austrittRecht`, Paket G: Geschäftsführung und
 * HR-Leitung, nie Assistenz): nicht die Person, nicht Buddy oder IT. Die Führungskraft sieht ihn, wenn Geschäftsführung oder HR-Leitung sie
 * bewusst einbezogen haben.
 */
export const planSichtbarFuer = (plan: Plan, wer: { personId?: string | null; austrittRecht?: boolean }): boolean =>
  plan.art !== "austritt" || !!plan.kommuniziert || !!wer.austrittRecht || (!!wer.personId && plan.einbezogen?.personId === wer.personId);

/** Was die gehende Person hält: direkte Berichte (Genehmigerrolle), Anträge, die auf sie warten, Buddy-Rollen in laufenden Plänen, IT-Zuständigkeit. */
export function uebergabeListe(geht: Person, personen: Person[], plaene: Plan[], antraege: Antrag[], zust: PlanZustaendige) {
  const berichte = personen.filter((p) => p.fuehrung === geht.id && p.status !== "ausgetreten");
  const ids = new Set(berichte.map((p) => p.id));
  return {
    berichte,
    antraege: antraege.filter((a) => ids.has(a.personId) && (a.status === "offen" || a.status === "gespraech" || !!a.stornoAngefragt)),
    buddy: plaene.filter((p) => p.status === "laeuft" && p.buddyId === geht.id),
    it: zust.it === geht.id,
  };
}

/**
 * Wer übernehmen kann: aktive Personen außer der gehenden, allen unter ihren direkten Berichten (sonst entstünde ein Kreis im Organigramm)
 * und allen mit eigenem laufendem Austritt.
 */
export function uebergabeZiele(geht: Person, personen: Person[], plaene: Plan[]): Person[] {
  const gehen = new Set(plaene.filter((p) => p.art === "austritt" && p.status === "laeuft").map((p) => p.personId));
  const tiefer = new Set<string>();
  let rand = personen.filter((p) => p.fuehrung === geht.id).map((p) => p.id);
  while (rand.length) { rand = personen.filter((p) => p.fuehrung && rand.includes(p.fuehrung) && !tiefer.has(p.id)).map((p) => p.id); rand.forEach((id) => tiefer.add(id)); }
  // Nur wer schon arbeitet und nicht Organ ist (die Geschäftsführung übernimmt als "an: null"), auch auf dem Server (Prüffund T-26).
  return personen.filter((p) => p.id !== geht.id && p.status === "aktiv" && !p.organ && !tiefer.has(p.id) && !gehen.has(p.id));
}
