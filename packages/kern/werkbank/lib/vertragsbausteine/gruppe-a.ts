/**
 * Gruppe A: Beginn und Bedingungen (Katalog Abschnitt 4 A1 bis A10, Prüfregeln P-010 bis P-019, K-22 bis K-25).
 * Kein Text hier ist Endwortlaut: Die Kanzlei gibt jede Bausteinversion frei. Alle Rechtszahlen kommen aus lib/regeln/werte.ts.
 */
import { WERTE, fristWort, monateText, monateTextDativ, zahlwort } from "@/lib/regeln/werte";
import { addDays, addMonths, compare, formatDE, isISODate } from "@/lib/regeln/datum";
import type { Baustein, Lage } from "./typen";
import { ARBEITNEHMER } from "./typen";
import { hat, innerhalbMonate, leer, num, regel, wenn, wert, zahl } from "./hilfen";
import { anzahlEn, datumEn, frei, fristWortEn, zahlwortEn } from "@/lib/dokumente/englisch";

const datumText = (s: string | undefined) => (s && isISODate(s) ? formatDE(s) : "[Datum]");
const datumTextEn = (s: string | undefined) => (s && isISODate(s) ? datumEn(s) : "[date]");
const monateEn = (n: number) => anzahlEn(n, "month", "months");
/** Englische Fassung eines Auswahlwerts; unbekannte Werte gehen als freie Eingabe an die Übersetzung. */
const en = (karte: Record<string, string>, v: string | undefined, platzhalter: string) => (v ? karte[v] ?? frei(v) : platzhalter);
const katalog = (id: string) => `Katalog Abschnitt 4, Baustein ${id}`;

/* A6: Bedingungen nur aus dieser Liste (§ 14 Abs. 1 TzBfG über § 21 TzBfG). */
export const A6_WEGFALL = "Wegfall der für die Tätigkeit gesetzlich nötigen Erlaubnis";
export const A6_RENTE = "Bewilligung einer unbefristeten Rente wegen voller Erwerbsminderung";
const A6_LISTE = [A6_WEGFALL, A6_RENTE];
/** Anknüpfungen, die R16 sperrt (Krankheit, Schwangerschaft, Elternzeit, Betriebsratsamt, Alter ohne Rente). */
const A6_VERBOTEN = /krank|arbeitsunfähig|schwanger|mutterschutz|elternzeit|betriebsrat|gewerkschaft|\balter\b|altersgrenze|lebensjahr/i;

/* A3: feste Liste gesetzlicher Untersuchungen. */
export const A3_LISTE = [
  "Erstuntersuchung für Jugendliche (§ 32 JArbSchG)",
  "Belehrung beim Umgang mit Lebensmitteln (§ 43 IfSG)",
  "Pflichtvorsorge nach der ArbMedVV",
  "gesetzlich vorgeschriebene Eignungsfeststellung (Fahr-, Steuer- und Überwachungstätigkeit)",
];

/* A4: Begründungen aus der Stelle. */
const A4_KINDER = "Kinder und Jugendliche";
const A4_GESETZ = "gesetzliche Pflicht";
const A4_SONSTIGE = "sonstige Stelle ohne besonderen Bezug";
const A4_LISTE = ["Vermögensverantwortung", "Sicherheitsbezug", "Zugang zu besonders schutzwürdigen Daten", A4_KINDER, A4_GESETZ, A4_SONSTIGE];
const A4_ERWEITERT = "erweitertes Führungszeugnis (§ 30a BZRG)";

/* Englische Fassungen der Auswahlwerte. */
const A1_EN: Record<string, string> = {
  "Aufenthaltstitel, der die Beschäftigung erlaubt": "a residence title that permits employment",
  "Zustimmung der Bundesagentur für Arbeit": "approval of the Federal Employment Agency",
  "Visum zur Beschäftigung": "a visa for the purpose of employment",
};
const A2_EN: Record<string, string> = {
  "Approbation oder Berufserlaubnis": "licence to practise (Approbation) or professional permit",
  "staatliche Anerkennung des Berufsabschlusses": "state recognition of the professional qualification",
  "Fahrerlaubnis der nötigen Klasse": "a driving licence of the required class",
  "Gefahrgut- oder Fachkundenachweis": "a dangerous goods or specialist competence certificate",
  "Prüfbescheinigung (z. B. Schweißerprüfung)": "a test certificate (e.g. welder qualification test)",
};
const A3_EN: Record<string, string> = {
  [A3_LISTE[0]]: "initial medical examination for young persons (§ 32 JArbSchG)",
  [A3_LISTE[1]]: "instruction on the handling of food (§ 43 IfSG)",
  [A3_LISTE[2]]: "mandatory occupational health screening under the ArbMedVV",
  [A3_LISTE[3]]: "statutory fitness assessment (driving, control and monitoring activities)",
};
const A5_EN: Record<string, string> = {
  "Zuverlässigkeitsüberprüfung nach dem Luftsicherheitsgesetz": "background check under the Aviation Security Act (LuftSiG)",
  "Sicherheitsüberprüfung nach dem Sicherheitsüberprüfungsgesetz": "security clearance under the Security Clearance Act (SÜG)",
  "Zuverlässigkeitsprüfung im Bewachungsgewerbe (GewO)": "reliability check for the security services trade (GewO)",
  "Zuverlässigkeitsüberprüfung nach dem Atomgesetz": "background check under the Atomic Energy Act (AtG)",
};

/* A7 */
const A7_AUS = "ausgeschlossen für beide Seiten";
const A7_FRIST = "zulässig mit Frist";

/* A9 */
export const A9_SACHGRUND = "Zeitbefristung mit Sachgrund";
export const A9_OHNE = "Zeitbefristung ohne Sachgrund";
export const A9_ZWECK = "Zweckbefristung";
const A9_GRUENDE_EN: Record<string, string> = {
  "vorübergehender betrieblicher Bedarf": "temporary operational need",
  "Anschluss an Ausbildung oder Studium": "transition following vocational training or university studies",
  "Vertretung": "temporary cover for another employee",
  "Eigenart der Arbeitsleistung": "nature of the work",
  "Erprobung": "trial employment",
  "Gründe in der Person": "reasons relating to the Employee personally",
  "Vergütung aus befristeten Haushaltsmitteln": "remuneration from fixed-term budget funds",
  "gerichtlicher Vergleich": "court settlement",
};
const A9_GRUENDE = [
  "vorübergehender betrieblicher Bedarf", "Anschluss an Ausbildung oder Studium", "Vertretung", "Eigenart der Arbeitsleistung",
  "Erprobung", "Gründe in der Person", "Vergütung aus befristeten Haushaltsmitteln", "gerichtlicher Vergleich",
];

/** Sachgrundlose Befristung: Feld in A9, sonst die Angabe in der Personalakte. */
const sachgrundlos = (l: Lage) => hat(l, "A9") && (wert(l, "A9", "art") === A9_OHNE || (leer(wert(l, "A9", "art")) && l.person.sachgrundlos));
/** Liegt eine frühere Beschäftigung im Fenster vor dem Eintritt (§ 14 Abs. 2 Satz 2 TzBfG, Auslegung BVerfG)? */
const imFenster = (ende: string, l: Lage) => isISODate(ende) && innerhalbMonate(ende, l.person.eintritt, WERTE.vorbeschaeftigungAbstandMonate.wert);
const fenster = () => monateTextDativ(WERTE.vorbeschaeftigungAbstandMonate.wert);

export const BAUSTEINE_A: Baustein[] = [
  {
    id: "A1", gruppe: "A", label: "Aufschiebende Bedingung: Aufenthaltstitel und Arbeitserlaubnis", labelEn: "Condition precedent: residence title and work permit", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Bei Beschäftigten ohne EU-, EWR- oder Schweizer Staatsangehörigkeit, solange der Titel zu Vertragsbeginn noch nicht vorliegt.",
    felder: [
      { id: "nachweis", label: "Art des Nachweises", typ: "auswahl", pflicht: true, standard: "Aufenthaltstitel, der die Beschäftigung erlaubt",
        optionen: ["Aufenthaltstitel, der die Beschäftigung erlaubt", "Zustimmung der Bundesagentur für Arbeit", "Visum zur Beschäftigung"] },
      { id: "hoechstdatum", label: "Höchstdatum für die Vorlage", typ: "datum", pflicht: true, hinweis: "Ohne Höchstdatum ist die Bedingung unklar. Trag das Ablaufdatum des Titels später in die Fristenliste ein." },
      { id: "folge", label: "Folge, wenn der Nachweis bis dahin fehlt", typ: "auswahl", pflicht: true, standard: "Vertrag wird gegenstandslos",
        optionen: ["Vertrag wird gegenstandslos", "Beginn verschiebt sich bis höchstens zum Höchstdatum"] },
    ],
    text: (w, k) => [
      `(1) Dieser Vertrag wird erst wirksam, wenn ${k.vorname} dem Arbeitgeber spätestens bis zum ${datumText(w.hoechstdatum)} folgenden Nachweis vorlegt: ${w.nachweis || "[Nachweis]"}.`,
      `(2) Vor Eintritt dieser Bedingung beschäftigt der Arbeitgeber ${k.vorname} nicht, und es besteht kein Anspruch auf Beschäftigung oder Vergütung. Eine vereinbarte Probezeit beginnt erst mit dem tatsächlichen Arbeitsbeginn.`,
      w.folge === "Beginn verschiebt sich bis höchstens zum Höchstdatum"
        ? `(3) Liegt der Nachweis zum vereinbarten Beginn noch nicht vor, verschiebt sich der Beginn auf den Tag nach der Vorlage, höchstens bis zum ${datumText(w.hoechstdatum)}. Liegt er auch dann nicht vor, kann jede Seite den Vertrag ohne Frist als gegenstandslos erklären.`
        : `(3) Liegt der Nachweis bis zum ${datumText(w.hoechstdatum)} nicht vor, kann jede Seite den Vertrag ohne Frist als gegenstandslos erklären.`,
      `(4) Der Arbeitgeber bewahrt für die Dauer der Beschäftigung eine Kopie des Titels auf. ${k.vorname} teilt jede Änderung, Verlängerung oder das Ende des Titels unverzüglich mit.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) This contract only takes effect when ${k.vorname} presents the following proof to the Employer no later than ${datumTextEn(w.hoechstdatum)}: ${en(A1_EN, w.nachweis, "[proof]")}.`,
      `(2) Until this condition is met, the Employer will not employ ${k.vorname}, and there is no entitlement to employment or remuneration. Any agreed probationary period only begins with the actual start of work.`,
      w.folge === "Beginn verschiebt sich bis höchstens zum Höchstdatum"
        ? `(3) If the proof is not available on the agreed start date, the start is postponed to the day after it is presented, but no later than ${datumTextEn(w.hoechstdatum)}. If it is still not available by then, either party may declare the contract void without notice.`
        : `(3) If the proof is not available by ${datumTextEn(w.hoechstdatum)}, either party may declare the contract void without notice.`,
      `(4) The Employer keeps a copy of the title for the duration of the employment. ${k.vorname} reports any change, extension or expiry of the title without undue delay.`,
    ].join("\n"),
    normen: ["§ 158 Abs. 1 BGB", "§ 4a Abs. 5 AufenthG"],
    quellen: ["https://www.gesetze-im-internet.de/bgb/__158.html", "https://www.gesetze-im-internet.de/aufenthg_2004/__4a.html", katalog("A1")],
    schutz: ["Bedingung nennt den Nachweis und ein Höchstdatum.", "Keine Beschäftigung vor Eintritt der Bedingung.", "Hinweis an HR: Kopie des Titels aufbewahren, Ablaufdatum in die Fristenliste."],
    sperren: ["Bedingung ohne Höchstdatum.", "Beschäftigungsbeginn vor Eintritt der Bedingung.", "Probezeit ab Vertragsdatum statt ab tatsächlichem Beginn."],
    stichwoerter: ["Aufenthaltstitel", "Arbeitserlaubnis", "Visum", "Ausländer", "Drittstaat", "Blaue Karte", "Zustimmung Arbeitsagentur", "Bedingung"],
    regeln: [
      regel("P-010", "sperre", "A1 oder A2 ohne Höchstdatum", "§ 307 Abs. 1 Satz 2 BGB (Transparenz)", ["A1", "A2"], (l) => {
        const ohne = ["A1", "A2"].filter((id) => hat(l, id) && !isISODate(wert(l, id, "hoechstdatum")));
        return wenn(ohne.length > 0, `${ohne.join(", ")}: Die Bedingung braucht ein Höchstdatum. Ohne Datum bleibt offen, wie lange der Vertrag in der Schwebe ist. Trag ein Datum ein.`);
      }),
      regel("P-011", "pflicht", "A1 gewählt: kein Beschäftigungsbeginn vor dem Titel, Kopie aufbewahren, Ablauf überwachen", "§ 4a Abs. 5 AufenthG", ["A1"],
        (l) => wenn(hat(l, "A1"), `Ergänzt: Keine Beschäftigung vor Vorlage des Titels. Aufgabe für dich: Kopie des Titels für die Dauer der Beschäftigung aufbewahren und das Ablaufdatum in die Fristenliste eintragen${isISODate(wert(l, "A1", "hoechstdatum")) ? ` (Vorlage spätestens ${formatDE(wert(l, "A1", "hoechstdatum"))})` : ""}.`)),
    ],
  },
  {
    id: "A2", gruppe: "A", label: "Aufschiebende Bedingung: Qualifikation, Erlaubnis oder Approbation", labelEn: "Condition precedent: qualification, permit or licence to practise", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Reglementierte Berufe und Stellen, für die ein Nachweis zwingend ist (Pflege, Ärzte, Steuerberatung, Fahrerlaubnis, Gefahrgut, Schweißerprüfung).",
    felder: [
      { id: "nachweis", label: "Nachweis", typ: "auswahl", pflicht: true,
        optionen: ["Approbation oder Berufserlaubnis", "staatliche Anerkennung des Berufsabschlusses", "Fahrerlaubnis der nötigen Klasse", "Gefahrgut- oder Fachkundenachweis", "Prüfbescheinigung (z. B. Schweißerprüfung)", "anderer Nachweis"],
        hinweis: "Der Nachweis muss objektiv zur Stelle gehören. Verknüpf die Stellenbeschreibung." },
      { id: "nachweisText", label: "Welcher Nachweis genau", typ: "text", pflicht: true, bei: { nachweis: ["anderer Nachweis"] }, hinweis: "Kein Bestehen der Probezeit und keine Entscheidung nach Ermessen des Arbeitgebers." },
      { id: "hoechstdatum", label: "Höchstdatum für die Vorlage", typ: "datum", pflicht: true },
      { id: "folge", label: "Folge, wenn der Nachweis bis dahin fehlt", typ: "auswahl", pflicht: true, standard: "Vertrag wird gegenstandslos",
        optionen: ["Vertrag wird gegenstandslos", "Beginn verschiebt sich bis höchstens zum Höchstdatum"] },
    ],
    text: (w, k) => {
      const n = w.nachweis === "anderer Nachweis" ? w.nachweisText || "[Nachweis]" : w.nachweis || "[Nachweis]";
      return [
        `(1) Dieser Vertrag wird erst wirksam, wenn ${k.vorname} dem Arbeitgeber spätestens bis zum ${datumText(w.hoechstdatum)} folgenden Nachweis vorlegt, der für die vereinbarte Tätigkeit zwingend ist: ${n}.`,
        `(2) Vor Eintritt dieser Bedingung besteht kein Anspruch auf Beschäftigung oder Vergütung. Eine vereinbarte Probezeit beginnt erst mit dem tatsächlichen Arbeitsbeginn.`,
        w.folge === "Beginn verschiebt sich bis höchstens zum Höchstdatum"
          ? `(3) Liegt der Nachweis zum vereinbarten Beginn noch nicht vor, verschiebt sich der Beginn auf den Tag nach der Vorlage, höchstens bis zum ${datumText(w.hoechstdatum)}. Danach kann jede Seite den Vertrag ohne Frist als gegenstandslos erklären.`
          : `(3) Liegt der Nachweis bis zum ${datumText(w.hoechstdatum)} nicht vor, kann jede Seite den Vertrag ohne Frist als gegenstandslos erklären.`,
        `(4) Fällt der Nachweis später weg, teilt ${k.vorname} das dem Arbeitgeber unverzüglich mit.`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const n = w.nachweis === "anderer Nachweis" ? frei(w.nachweisText) || "[proof]" : en(A2_EN, w.nachweis, "[proof]");
      return [
        `(1) This contract only takes effect when ${k.vorname} presents the following proof to the Employer no later than ${datumTextEn(w.hoechstdatum)}, which is mandatory for the agreed work: ${n}.`,
        `(2) Until this condition is met, there is no entitlement to employment or remuneration. Any agreed probationary period only begins with the actual start of work.`,
        w.folge === "Beginn verschiebt sich bis höchstens zum Höchstdatum"
          ? `(3) If the proof is not available on the agreed start date, the start is postponed to the day after it is presented, but no later than ${datumTextEn(w.hoechstdatum)}. After that, either party may declare the contract void without notice.`
          : `(3) If the proof is not available by ${datumTextEn(w.hoechstdatum)}, either party may declare the contract void without notice.`,
        `(4) If the proof later ceases to be valid, ${k.vorname} informs the Employer without undue delay.`,
      ].join("\n");
    },
    normen: ["§ 158 Abs. 1 BGB", "Berufsgesetze", "§ 21 TzBfG (nur bei auflösender Bedingung)"],
    quellen: ["https://www.gesetze-im-internet.de/bgb/__158.html", katalog("A2")],
    schutz: ["Bedingung muss objektiv zur Stelle gehören (Stellenbeschreibung verknüpft).", "Höchstdatum ist Pflicht."],
    sperren: ["Bestehen der Probezeit als aufschiebende Bedingung (das ist Probezeit, § 622 Abs. 3 BGB).", "Bedingung nach Ermessen des Arbeitgebers (Potestativbedingung)."],
    stichwoerter: ["Approbation", "Berufserlaubnis", "Anerkennung", "Führerschein", "Fahrerlaubnis", "Qualifikation", "Nachweis", "Pflege", "Bedingung"],
  },
  {
    id: "A3", gruppe: "A", label: "Aufschiebende Bedingung: Einstellungsuntersuchung (nur gesetzlich vorgeschrieben)", labelEn: "Condition precedent: pre-employment medical examination (statutory only)", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Nur wo ein Gesetz die Untersuchung vor Beginn vorschreibt: Jugendliche, Lebensmittel, Pflichtvorsorge, gesetzliche Eignungsfeststellung.",
    felder: [
      { id: "grundlage", label: "Rechtsgrundlage", typ: "auswahl", pflicht: true, optionen: A3_LISTE, hinweis: "Ein freier Grund wird nicht angeboten. Eine allgemeine Einstellungsuntersuchung ohne Gesetz geht nur mit freiwilliger, getrennter Einwilligung." },
      { id: "frist", label: "Frist für die Untersuchung", typ: "datum", pflicht: true },
    ],
    text: (w, k) => [
      `(1) Voraussetzung für den Beginn der Beschäftigung ist die gesetzlich vorgeschriebene Untersuchung oder Belehrung: ${w.grundlage || "[Rechtsgrundlage]"}. Sie findet bis zum ${datumText(w.frist)} statt.`,
      `(2) Der Arbeitgeber erfährt nur, ob ${k.vorname} für die Tätigkeit geeignet oder nicht geeignet ist oder ob gesundheitliche Bedenken bestehen. Diagnosen und Befunde erfährt er nicht. Bei arbeitsmedizinischer Vorsorge erhält er nur die Bescheinigung, dass die Vorsorge stattgefunden hat.`,
      `(3) Die Kosten trägt der Arbeitgeber.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) Employment begins only after the following statutory examination or instruction: ${en(A3_EN, w.grundlage, "[legal basis]")}. It takes place by ${datumTextEn(w.frist)}.`,
      `(2) The Employer is only told whether ${k.vorname} is fit or unfit for the work or whether there are health concerns. The Employer is not told any diagnoses or findings. For occupational health screening, the Employer only receives confirmation that the screening has taken place.`,
      `(3) The Employer bears the costs.`,
    ].join("\n"),
    normen: ["§ 158 Abs. 1 BGB", "ArbMedVV", "§ 32 JArbSchG", "§ 43 IfSG", "Art. 9 DSGVO", "§ 26 Abs. 3 BDSG"],
    quellen: ["https://www.gesetze-im-internet.de/arbmedvv/__6.html", "https://www.gesetze-im-internet.de/jarbschg/__32.html", "https://www.gesetze-im-internet.de/ifsg/__43.html", katalog("A3")],
    urteile: [{ az: "BAG-Linie zum Fragerecht nach der Gesundheit (nur soweit für die Tätigkeit wesentlich), Aktenzeichen prüfen", kennung: "P" }],
    schutz: ["Rechtsgrundlage nur aus der festen Liste.", "Ergebnis an den Arbeitgeber nur als geeignet oder nicht geeignet, nie die Diagnose.", "Kosten trägt der Arbeitgeber."],
    sperren: ["Untersuchung ohne Rechtsgrundlage als Bedingung.", "Abfrage von Diagnosen.", "Gentests (GenDG).", "Bedingung für Bestandsmitarbeitende."],
    stichwoerter: ["Einstellungsuntersuchung", "Gesundheitszeugnis", "Arzt", "Betriebsarzt", "Vorsorge", "Jugendarbeitsschutz", "Lebensmittel", "Belehrung", "G26"],
    regeln: [
      regel("P-012", "sperre", "A3 mit Rechtsgrundlage nicht aus der festen Liste", "Art. 9 DSGVO, ArbMedVV", ["A3"],
        (l) => wenn(hat(l, "A3") && !A3_LISTE.includes(wert(l, "A3", "grundlage")), "Eine Untersuchung als Bedingung geht nur mit gesetzlicher Grundlage aus der Liste. Gesundheitsdaten sind besonders geschützt. Ohne Gesetz bleibt nur eine freiwillige, getrennte Einwilligung außerhalb des Vertrags.")),
    ],
  },
  {
    id: "A4", gruppe: "A", label: "Aufschiebende Bedingung: Führungszeugnis", labelEn: "Condition precedent: certificate of good conduct", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Stellen mit Geld und Vermögen in verantwortlicher Stellung, schutzwürdigen Daten, Sicherheitsberufen oder Arbeit mit Kindern und Jugendlichen.",
    felder: [
      { id: "art", label: "Art des Führungszeugnisses", typ: "auswahl", pflicht: true, standard: "einfaches Führungszeugnis (§ 30 BZRG)", optionen: ["einfaches Führungszeugnis (§ 30 BZRG)", A4_ERWEITERT] },
      { id: "begruendung", label: "Begründung aus der Stelle", typ: "auswahl", pflicht: true, optionen: A4_LISTE,
        hinweis: "Die Begründung kommt in die Personalakte, nicht in den Vertrag. Das erweiterte Zeugnis nur bei Kindern und Jugendlichen oder gesetzlicher Pflicht." },
      { id: "frist", label: "Vorlage bis", typ: "datum", pflicht: true },
    ],
    text: (w, k) => [
      `(1) Voraussetzung für den Beginn der Beschäftigung ist, dass ${k.vorname} bis zum ${datumText(w.frist)} ein ${w.art === A4_ERWEITERT ? "erweitertes " : ""}Führungszeugnis vorlegt, das keine für die Stelle einschlägigen Eintragungen enthält.`,
      ...(w.art === A4_ERWEITERT ? [`(2) Der Arbeitgeber fordert das erweiterte Führungszeugnis schriftlich an und bestätigt darin, dass die Voraussetzungen nach § 30a Abs. 1 BZRG vorliegen.`] : []),
      `(${w.art === A4_ERWEITERT ? 3 : 2}) Der Arbeitgeber nimmt keine Kopie zur Akte. Er vermerkt nur, dass er das Zeugnis eingesehen hat und ob einschlägige Eintragungen bestehen, und löscht den Vermerk, sobald er nicht mehr gebraucht wird.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) Employment begins only if ${k.vorname} presents ${w.art === A4_ERWEITERT ? "an extended" : "a"} certificate of good conduct (${w.art === A4_ERWEITERT ? "erweitertes Führungszeugnis" : "Führungszeugnis"}) by ${datumTextEn(w.frist)} that contains no entries relevant to the position.`,
      ...(w.art === A4_ERWEITERT ? [`(2) The Employer requests the extended certificate in writing and confirms in that request that the requirements of § 30a para. 1 BZRG are met.`] : []),
      `(${w.art === A4_ERWEITERT ? 3 : 2}) The Employer does not keep a copy on file. It only notes that it has inspected the certificate and whether relevant entries exist, and deletes this note as soon as it is no longer needed.`,
    ].join("\n"),
    normen: ["§ 30 BZRG", "§ 30a BZRG", "Art. 10 DSGVO", "§ 26 BDSG"],
    quellen: ["https://www.gesetze-im-internet.de/bzrg/__30.html", "https://www.gesetze-im-internet.de/bzrg/__30a.html", katalog("A4")],
    urteile: [{ az: "BAG-Linie zum Fragerecht nach Vorstrafen (nur soweit der Arbeitsplatz es erfordert), Aktenzeichen prüfen", kennung: "P" }],
    schutz: ["Begründung wird verlangt und in der Akte festgehalten.", "Erweitertes Zeugnis nur bei Kindern und Jugendlichen oder gesetzlicher Pflicht.", "Nur Vermerk der Einsicht, Hinweis auf Löschung."],
    sperren: ["Führungszeugnis als pauschale Bedingung für alle Stellen.", "Erweitertes Zeugnis ohne Kinder- oder Jugendbezug.", "Kopie des Zeugnisses ablegen."],
    stichwoerter: ["Führungszeugnis", "polizeiliches Führungszeugnis", "erweitertes Führungszeugnis", "Vorstrafen", "Kita", "Jugendarbeit", "Kasse", "Buchhaltung"],
    regeln: [
      regel("P-013", "sperre", "A4 erweitertes Zeugnis ohne Kinder-/Jugendbezug oder gesetzliche Pflicht", "§ 30a BZRG", ["A4"],
        (l) => wenn(hat(l, "A4") && wert(l, "A4", "art") === A4_ERWEITERT && ![A4_KINDER, A4_GESETZ].includes(wert(l, "A4", "begruendung")),
          "Das erweiterte Führungszeugnis darf nur verlangt werden, wenn ein Gesetz es vorsieht oder die Stelle mit Kindern und Jugendlichen zu tun hat. Wähle das einfache Führungszeugnis.")),
      regel("P-014", "warnung", "A4 und Stelle ohne Vermögens- oder Sicherheitsbezug", "Art. 5 Abs. 1 lit. c DSGVO (Datenminimierung)", ["A4"],
        (l) => wenn(hat(l, "A4") && wert(l, "A4", "begruendung") === A4_SONSTIGE, "Die Stelle hat keinen Bezug zu Vermögen, Sicherheit, schutzwürdigen Daten oder Kindern. Ein Führungszeugnis ist dann kaum zu rechtfertigen. Lass den Baustein weg oder begründe ihn.")),
    ],
  },
  {
    id: "A5", gruppe: "A", label: "Aufschiebende Bedingung: Zuverlässigkeits- oder Sicherheitsüberprüfung", labelEn: "Condition precedent: background check or security clearance", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Luftsicherheit, Sicherheitsgewerbe, Sicherheitsbereiche mit gesetzlicher Überprüfungspflicht.",
    felder: [
      { id: "grundlage", label: "Rechtsgrundlage", typ: "auswahl", pflicht: true,
        optionen: ["Zuverlässigkeitsüberprüfung nach dem Luftsicherheitsgesetz", "Sicherheitsüberprüfung nach dem Sicherheitsüberprüfungsgesetz", "Zuverlässigkeitsprüfung im Bewachungsgewerbe (GewO)", "Zuverlässigkeitsüberprüfung nach dem Atomgesetz"],
        hinweis: "Die Überprüfung führt die zuständige Stelle nach dem Gesetz durch. Kanzlei prüfen, ob die Grundlage für die Stelle passt." },
      { id: "frist", label: "Abschluss der Überprüfung bis", typ: "datum", pflicht: true },
    ],
    text: (w, k) => [
      `(1) Voraussetzung für den Beginn der Beschäftigung ist der erfolgreiche Abschluss folgender Überprüfung bis zum ${datumText(w.frist)}: ${w.grundlage || "[Rechtsgrundlage]"}.`,
      `(2) Die Überprüfung führt die zuständige Stelle nach dem Gesetz durch. Eine dafür nötige Einwilligung erklärt ${k.vorname} freiwillig und getrennt von diesem Vertrag. Sie ist nicht Bestandteil dieses Vertrags.`,
      `(3) Der Arbeitgeber erfährt nur das Ergebnis der Überprüfung.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) Employment begins only after the following check has been successfully completed by ${datumTextEn(w.frist)}: ${en(A5_EN, w.grundlage, "[legal basis]")}.`,
      `(2) The check is carried out by the competent authority under the applicable law. ${k.vorname} gives any consent required for it voluntarily and separately from this contract. That consent does not form part of this contract.`,
      `(3) The Employer is only told the result of the check.`,
    ].join("\n"),
    normen: ["§ 158 Abs. 1 BGB", "LuftSiG", "SÜG", "Art. 7 DSGVO", "§ 26 Abs. 2 BDSG"],
    quellen: ["https://www.gesetze-im-internet.de/luftsig/__7.html", "https://www.gesetze-im-internet.de/bdsg_2018/__26.html", katalog("A5")],
    schutz: ["Nur mit Rechtsgrundlage aus der Liste.", "Einwilligung getrennt, nicht im Arbeitsvertrag."],
    sperren: ["Einwilligung als Vertragsbestandteil."],
    stichwoerter: ["Sicherheitsüberprüfung", "Zuverlässigkeitsüberprüfung", "Flughafen", "Luftsicherheit", "Bewachung", "Sicherheitsdienst", "Geheimschutz"],
  },
  {
    id: "A6", gruppe: "A", label: "Auflösende Bedingung: Wegfall der Erlaubnis oder volle Erwerbsminderungsrente", labelEn: "Condition subsequent: loss of permit or full disability pension", risiko: "gelb", version: 1, fuer: ARBEITNEHMER, nass: true, befristung: true,
    passt: "Stellen mit zwingender Erlaubnis oder Beendigung bei Bewilligung einer unbefristeten vollen Erwerbsminderungsrente.",
    felder: [
      { id: "bedingung", label: "Bedingung", typ: "auswahl", pflicht: true, optionen: A6_LISTE, hinweis: "Keine Bedingung, die an Krankheit, Schwangerschaft, Elternzeit oder Betriebsratsamt anknüpft." },
      { id: "erlaubnis", label: "Welche Erlaubnis", typ: "text", pflicht: true, bei: { bedingung: [A6_WEGFALL] }, hinweis: "Zum Beispiel Fahrerlaubnis Klasse CE, Approbation, Aufenthaltstitel." },
    ],
    text: (w, k) => {
      const bed = w.bedingung === A6_WEGFALL ? `die für die Tätigkeit gesetzlich nötige Erlaubnis (${w.erlaubnis || "[Erlaubnis]"}) dauerhaft wegfällt` : w.bedingung === A6_RENTE ? `${k.vorname} ein Bescheid über eine unbefristete Rente wegen voller Erwerbsminderung zugeht` : "[Bedingung]";
      return [
        `(1) Das Arbeitsverhältnis endet, ohne dass es einer Kündigung bedarf, wenn ${bed}.`,
        `(2) Es endet frühestens ${fristWort(WERTE.zweckbefristungAuslaufTage.wert)} nach Zugang der schriftlichen Unterrichtung von ${k.vorname} durch den Arbeitgeber über den Eintritt der Bedingung.`,
        `(3) ${k.vorname} teilt den Eintritt der Bedingung unverzüglich in Textform mit. Ist ${k.vorname} schwerbehindert oder gleichgestellt, endet das Arbeitsverhältnis erst mit Zustimmung des Integrationsamts.`,
        `(4) Diese Vereinbarung bedarf der Schriftform und wird vor Arbeitsbeginn im Original unterschrieben.`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const bed = w.bedingung === A6_WEGFALL ? `the permit required by law for the work (${frei(w.erlaubnis) || "[permit]"}) is permanently lost` : w.bedingung === A6_RENTE ? `${k.vorname} receives a decision granting an unlimited pension for full reduction in earning capacity` : "[condition]";
      return [
        `(1) The employment ends without notice of termination being required if ${bed}.`,
        `(2) It ends no earlier than ${fristWortEn(WERTE.zweckbefristungAuslaufTage.wert)} after ${k.vorname} receives written notice from the Employer that the condition has been met.`,
        `(3) ${k.vorname} reports the occurrence of the condition in text form without undue delay. If ${k.vorname} is severely disabled or has equivalent status, the employment only ends with the consent of the Integration Office (Integrationsamt).`,
        `(4) This agreement must be in written form and is signed in the original before work begins.`,
      ].join("\n");
    },
    normen: ["§ 158 Abs. 2 BGB", "§ 21 TzBfG", "§ 14 Abs. 1 und 4 TzBfG", "§ 15 Abs. 2 TzBfG", "§ 17 TzBfG", "§ 175 SGB IX"],
    quellen: ["https://www.gesetze-im-internet.de/tzbfg/__21.html", "https://www.gesetze-im-internet.de/tzbfg/__15.html", "https://www.gesetze-im-internet.de/tzbfg/__14.html", "https://www.gesetze-im-internet.de/sgb_9_2018/__175.html", katalog("A6")],
    urteile: [{ az: "BAG-Linie: auflösende Bedingungen an den Sachgrundkatalog des § 14 Abs. 1 TzBfG gebunden, Aktenzeichen prüfen", kennung: "P" }],
    schutz: ["Pflichtsatz: Ende frühestens nach der Auslauffrist ab schriftlicher Unterrichtung.", "Schriftform mit Originalunterschrift.", "Bedingung nur aus der Liste."],
    sperren: ["Bedingung, die an Krankheit, Schwangerschaft, Betriebsratsarbeit oder Alter ohne Rentenbezug anknüpft.", "Bedingung ohne Sachgrund aus der Liste."],
    stichwoerter: ["auflösende Bedingung", "Erwerbsminderung", "Rente", "Führerschein weg", "Erlaubnis entzogen", "Ende ohne Kündigung"],
    regeln: [
      regel("P-015", "sperre", "A6 mit Bedingung außer Liste", "§ 21, § 14 Abs. 1 TzBfG", ["A6"], (l) => {
        const b = wert(l, "A6", "bedingung");
        return wenn(hat(l, "A6") && !leer(b) && !A6_LISTE.includes(b), `Die Bedingung „${b}“ steht nicht in der Liste. Eine auflösende Bedingung braucht einen Sachgrund. Zulässig sind: ${A6_LISTE.join("; ")}.`);
      }),
      regel("P-016", "pflicht", "A6 gewählt: Satz zum Ende nach schriftlicher Unterrichtung", "§ 15 Abs. 2, § 21 TzBfG", ["A6"],
        (l) => wenn(hat(l, "A6"), `Ergänzt: Das Arbeitsverhältnis endet frühestens ${fristWort(WERTE.zweckbefristungAuslaufTage.wert)} nach Zugang der schriftlichen Unterrichtung über den Eintritt der Bedingung.`)),
      regel("K-22", "sperre", "A1 oder A6 ohne Höchstdatum oder Sachgrund", "§ 307 Abs. 1 Satz 2 BGB, § 14 Abs. 1 TzBfG", ["A1", "A6"], (l) => {
        const a1 = hat(l, "A1") && !isISODate(wert(l, "A1", "hoechstdatum"));
        const a6 = hat(l, "A6") && (leer(wert(l, "A6", "bedingung")) || (wert(l, "A6", "bedingung") === A6_WEGFALL && leer(wert(l, "A6", "erlaubnis"))));
        return wenn(a1 || a6, [a1 ? "A1 nennt kein Höchstdatum" : "", a6 ? "A6 nennt keinen Sachgrund (Bedingung oder Erlaubnis fehlt)" : ""].filter(Boolean).join(". ") + ". So ist die Bedingung unklar und unwirksam.");
      }),
      regel("K-23", "sperre", "A6 mit Bedingung an Krankheit, Schwangerschaft, Elternzeit oder Betriebsratsamt", "§ 14 TzBfG, § 17 MuSchG, § 18 BEEG, § 612a BGB (R16)", ["A6"], (l) => {
        const t = `${wert(l, "A6", "bedingung")} ${wert(l, "A6", "erlaubnis")}`;
        return wenn(hat(l, "A6") && A6_VERBOTEN.test(t), "Eine Beendigung, die an Krankheit, Schwangerschaft, Elternzeit, Betriebsratsamt oder Alter ohne Rente anknüpft, ist gesperrt. Zulässig ist nur eine Bedingung aus der Liste.");
      }),
    ],
  },
  {
    id: "A7", gruppe: "A", label: "Kündigung vor Dienstantritt", labelEn: "Termination before commencement of work", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Immer, wenn geregelt werden soll, ob vor Beginn ordentlich gekündigt werden kann.",
    felder: [
      { id: "regel", label: "Ordentliche Kündigung vor Dienstantritt", typ: "auswahl", pflicht: true, standard: A7_AUS, optionen: [A7_AUS, A7_FRIST],
        hinweis: "Ein Ausschluss gilt immer für beide Seiten (§ 622 Abs. 6 BGB)." },
      { id: "fristMonate", label: "Kündigungsfrist vor Dienstantritt in Monaten (leer: Frist der Probezeit)", typ: "zahl", min: 1, bei: { regel: [A7_FRIST] } },
    ],
    text: (w, k) => {
      const n = zahl(w.fristMonate);
      const frist = n ? monateText(n) : fristWort(WERTE.probezeitKuendigungTage.wert);
      return [
        w.regel === A7_FRIST
          ? `(1) Vor Beginn des Arbeitsverhältnisses können der Arbeitgeber und ${k.vorname} mit einer Frist von ${frist} ordentlich kündigen. Die Frist beginnt mit Zugang der Kündigung.`
          : `(1) Der Arbeitgeber und ${k.vorname} können das Arbeitsverhältnis vor seinem Beginn nicht ordentlich kündigen. Der Ausschluss gilt für beide Seiten gleich.`,
        `(2) Die Kündigung aus wichtigem Grund (§ 626 BGB) bleibt jederzeit möglich. Jede Kündigung bedarf der Schriftform (§ 623 BGB).`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const n = zahl(w.fristMonate);
      const frist = n ? monateEn(n) : fristWortEn(WERTE.probezeitKuendigungTage.wert);
      return [
        w.regel === A7_FRIST
          ? `(1) Before the employment begins, the Employer and ${k.vorname} may give ordinary notice of termination with a notice period of ${frist}. The period begins when the notice is received.`
          : `(1) The Employer and ${k.vorname} may not give ordinary notice of termination before the employment begins. This exclusion applies equally to both parties.`,
        `(2) Termination for good cause (§ 626 BGB) remains possible at any time. Any termination must be in written form (§ 623 BGB).`,
      ].join("\n");
    },
    normen: ["§ 622 Abs. 6 BGB", "§ 623 BGB", "§ 626 BGB"],
    quellen: ["https://www.gesetze-im-internet.de/bgb/__622.html", "https://www.gesetze-im-internet.de/bgb/__626.html", katalog("A7")],
    urteile: [{ az: "BAG-Linie: Kündigung vor Dienstantritt zulässig, wenn nicht ausdrücklich ausgeschlossen, Aktenzeichen prüfen", kennung: "P" }],
    schutz: ["Ausschluss gilt für beide Seiten.", "Kündigung aus wichtigem Grund bleibt immer."],
    sperren: ["Einseitiger Ausschluss nur für die Person.", "Ausschluss mit einer Vertragsstrafe über der Grenze von N1."],
    stichwoerter: ["Kündigung vor Arbeitsbeginn", "Dienstantritt", "nicht angetreten", "Absprung", "vor Beginn kündigen"],
    regeln: [
      regel("P-019", "sperre", "A7 mit Ausschluss nur für die Person", "§ 622 Abs. 6 BGB", ["A7"], (l) => {
        const r = wert(l, "A7", "regel");
        return wenn(hat(l, "A7") && /nur|einseitig/i.test(r) && !/beide/i.test(r), "Die Kündigung vor Dienstantritt darf nicht nur für die Person ausgeschlossen werden. Für den Arbeitnehmer darf keine längere Frist gelten als für den Arbeitgeber. Wähle den Ausschluss für beide Seiten.");
      }),
    ],
  },
  {
    id: "A8", gruppe: "A", label: "Probezeit (Varianten)", labelEn: "Probationary period (variants)", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Standard. Der Baustein regelt Dauer und Frist der Probezeit genauer, auch kürzere Probezeit bei Befristung.",
    felder: [
      { id: "dauerMonate", label: "Dauer der Probezeit in Monaten", typ: "zahl", pflicht: true, min: 1, max: WERTE.probezeitHoechstMonate.wert, standard: String(WERTE.probezeitHoechstMonate.wert),
        hinweis: "Bei Befristung im Verhältnis zur Laufzeit und Tätigkeit (§ 15 Abs. 3 TzBfG). Ein fester Verhältniswert ist nicht bestätigt, Kanzlei prüfen." },
      { id: "fristTage", label: "Kündigungsfrist in der Probezeit in Tagen", typ: "zahl", pflicht: true, min: WERTE.probezeitKuendigungTage.wert, standard: String(WERTE.probezeitKuendigungTage.wert) },
    ],
    text: (w, k) => {
      const m = zahl(w.dauerMonate) ?? WERTE.probezeitHoechstMonate.wert;
      const t = zahl(w.fristTage) ?? WERTE.probezeitKuendigungTage.wert;
      return [
        `(1) Die ersten ${monateText(m)} ab dem tatsächlichen Arbeitsbeginn gelten als Probezeit.`,
        `(2) Während der Probezeit können beide Seiten mit einer Frist von ${fristWort(t)} kündigen. Es genügt, wenn die Kündigung am letzten Tag der Probezeit zugeht.`,
        `(3) Die Probezeit kann nur durch eine Vereinbarung beider Seiten vor ihrem Ablauf verlängert werden, höchstens bis zur gesetzlichen Höchstdauer. Eine einseitige Verlängerung durch den Arbeitgeber gibt es nicht.`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const m = zahl(w.dauerMonate) ?? WERTE.probezeitHoechstMonate.wert;
      const t = zahl(w.fristTage) ?? WERTE.probezeitKuendigungTage.wert;
      return [
        `(1) The first ${monateEn(m)} from the actual start of work are a probationary period.`,
        `(2) During the probationary period, either party may terminate with a notice period of ${fristWortEn(t)}. It is sufficient if the notice is received on the last day of the probationary period.`,
        `(3) The probationary period can only be extended by agreement of both parties before it expires, and at most up to the statutory maximum. The Employer cannot extend it unilaterally.`,
      ].join("\n");
    },
    normen: ["§ 622 Abs. 3 BGB", "§ 15 Abs. 3 TzBfG"],
    quellen: ["https://www.gesetze-im-internet.de/bgb/__622.html", "https://www.gesetze-im-internet.de/tzbfg/__15.html", katalog("A8")],
    schutz: ["Dauer höchstens bis zum Höchstwert aus dem Register.", "Bei Befristung im Verhältnis zur Laufzeit."],
    sperren: ["Probezeit über der Höchstdauer.", "Einseitige Verlängerung der Probezeit durch den Arbeitgeber."],
    stichwoerter: ["Probezeit", "Probezeit verlängern", "Kündigungsfrist Probezeit", "Einarbeitung"],
  },
  {
    id: "A9", gruppe: "A", label: "Befristung (Sachgrund, sachgrundlos, Zweckbefristung)", labelEn: "Fixed term (with objective reason, without objective reason, purpose-based)", risiko: "gelb", version: 1, fuer: ARBEITNEHMER, nass: true, befristung: true,
    passt: `Projekt, Vertretung, Saison oder sachgrundlos bis ${monateTextDativ(WERTE.befristungSachgrundlosMonate.wert)}.`,
    felder: [
      { id: "art", label: "Art der Befristung", typ: "auswahl", pflicht: true, optionen: [A9_SACHGRUND, A9_OHNE, A9_ZWECK] },
      { id: "sachgrund", label: "Sachgrund", typ: "auswahl", pflicht: true, optionen: A9_GRUENDE, bei: { art: [A9_SACHGRUND, A9_ZWECK] } },
      { id: "ende", label: "Ende der Befristung", typ: "datum", pflicht: true, bei: { art: [A9_SACHGRUND, A9_OHNE] } },
      { id: "zweck", label: "Bestimmter Zweck (wann ist er erreicht?)", typ: "lang", pflicht: true, bei: { art: [A9_ZWECK] }, hinweis: "So genau, dass beide Seiten erkennen, wann er erreicht ist. Zum Beispiel: Rückkehr von Frau X aus der Elternzeit." },
      { id: "verlaengerungen", label: "Bisherige Verlängerungen", typ: "zahl", min: 0, max: WERTE.befristungVerlaengerungenMax.wert, standard: "0", bei: { art: [A9_OHNE] } },
      { id: "vorbeschaeftigung", label: "Früher schon bei diesem Arbeitgeber beschäftigt (egal wie lange her)", typ: "janein", pflicht: true, standard: "nein",
        hinweis: "Lintelly gleicht mit der Personalakte ab. Lass dir die Erklärung der Person geben (Baustein A10)." },
      { id: "vorbeschaeftigungEnde", label: "Ende der früheren Beschäftigung", typ: "datum", bei: { vorbeschaeftigung: ["ja"] } },
    ],
    text: (w, k) => {
      const abs1 = w.art === A9_ZWECK
        ? `(1) Das Arbeitsverhältnis ist zweckbefristet (${w.sachgrund || "[Sachgrund]"}, § 14 Abs. 1 TzBfG). Es endet, ohne dass es einer Kündigung bedarf, wenn folgender Zweck erreicht ist: ${w.zweck || "[Zweck]"}. Es endet frühestens ${fristWort(WERTE.zweckbefristungAuslaufTage.wert)} nach Zugang der schriftlichen Unterrichtung von ${k.vorname} durch den Arbeitgeber über den Zeitpunkt der Zweckerreichung.`
        : w.art === A9_OHNE
          ? `(1) Das Arbeitsverhältnis ist ohne sachlichen Grund befristet (§ 14 Abs. 2 TzBfG) und endet am ${datumText(w.ende)}, ohne dass es einer Kündigung bedarf. ${k.vorname} erklärt, mit dem Arbeitgeber zuvor in keinem Arbeitsverhältnis gestanden zu haben, das die sachgrundlose Befristung ausschließt.`
          : `(1) Das Arbeitsverhältnis ist aus sachlichem Grund befristet (${w.sachgrund || "[Sachgrund]"}, § 14 Abs. 1 TzBfG) und endet am ${datumText(w.ende)}, ohne dass es einer Kündigung bedarf.`;
      return [
        abs1,
        `(2) Das Recht beider Seiten zur ordentlichen Kündigung nach diesem Vertrag bleibt unberührt.`,
        `(3) Die Befristung bedarf der Schriftform. Beide Seiten unterschreiben sie im Original vor Arbeitsbeginn.`,
        ...(w.art === A9_OHNE ? [`(4) Eine Verlängerung ist nur vor Ablauf der Befristung und ohne Änderung der übrigen Arbeitsbedingungen möglich.`] : []),
        `(${w.art === A9_OHNE ? 5 : 4}) ${k.vorname} muss sich spätestens ${zahlwort(WERTE.arbeitsuchendMeldung.monate)} Monate vor dem Ende bei der Agentur für Arbeit arbeitsuchend melden; liegen zwischen Kenntnis und Ende weniger als ${zahlwort(WERTE.arbeitsuchendMeldung.monate)} Monate, innerhalb von ${zahlwort(WERTE.arbeitsuchendMeldung.tage)} Tagen nach Kenntnis.`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const grund = en(A9_GRUENDE_EN, w.sachgrund, "[objective reason]");
      const abs1 = w.art === A9_ZWECK
        ? `(1) The employment is limited to a specific purpose (${grund}, § 14 para. 1 TzBfG). It ends without notice of termination being required when the following purpose has been achieved: ${frei(w.zweck) || "[purpose]"}. It ends no earlier than ${fristWortEn(WERTE.zweckbefristungAuslaufTage.wert)} after ${k.vorname} receives written notice from the Employer of the date on which the purpose is achieved.`
        : w.art === A9_OHNE
          ? `(1) The employment is fixed-term without an objective reason (§ 14 para. 2 TzBfG) and ends on ${datumTextEn(w.ende)} without notice of termination being required. ${k.vorname} declares that there has been no previous employment relationship with the Employer that rules out a fixed term without an objective reason.`
          : `(1) The employment is fixed-term for an objective reason (${grund}, § 14 para. 1 TzBfG) and ends on ${datumTextEn(w.ende)} without notice of termination being required.`;
      return [
        abs1,
        `(2) The right of either party to give ordinary notice of termination under this contract remains unaffected.`,
        `(3) The fixed term must be in written form. Both parties sign it in the original before work begins.`,
        ...(w.art === A9_OHNE ? [`(4) An extension is only possible before the fixed term expires and without changing the other terms of employment.`] : []),
        `(${w.art === A9_OHNE ? 5 : 4}) ${k.vorname} must register as a jobseeker with the Federal Employment Agency no later than ${zahlwortEn(WERTE.arbeitsuchendMeldung.monate)} months before the end; if there are fewer than ${zahlwortEn(WERTE.arbeitsuchendMeldung.monate)} months between becoming aware of the end and the end itself, within ${zahlwortEn(WERTE.arbeitsuchendMeldung.tage)} days of becoming aware.`,
      ].join("\n");
    },
    normen: ["§ 14 Abs. 1, 2 und 4 TzBfG", "§ 15 Abs. 2 TzBfG", "§ 38 Abs. 1 SGB III"],
    quellen: ["https://www.gesetze-im-internet.de/tzbfg/__14.html", "https://www.gesetze-im-internet.de/tzbfg/__15.html", "https://www.gesetze-im-internet.de/sgb_3/__38.html", katalog("A9")],
    urteile: [{ az: "BVerfG 1 BvL 7/14 (Vorbeschäftigungsverbot, Auslegung des § 14 Abs. 2 Satz 2 TzBfG)", kennung: "B" }, { az: "BAG 7 AZR 733/16 (Urteil vom 23.01.2019, Aufgabe der Dreijahresgrenze)", kennung: "B" }],
    schutz: ["Vorbeschäftigung aus der Personalakte geprüft, Erklärung der Person verlangt.", "Schriftform erzwungen (Signatur nass).", "Zweckbefristung endet frühestens nach der Auslauffrist ab schriftlicher Unterrichtung."],
    sperren: ["Sachgrundlos bei früherer Beschäftigung im Fenster.", "Sachgrundlos über Höchstdauer oder mit zu vielen Verlängerungen.", "Verlängerung nach Ende.", "Zweckbefristung ohne bestimmten Zweck."],
    stichwoerter: ["Befristung", "befristet", "Zeitvertrag", "sachgrundlos", "Sachgrund", "Elternzeitvertretung", "Projekt", "Saison", "Zweckbefristung", "Verlängerung"],
    regeln: [
      regel("P-017", "sperre", "A9 sachgrundlos und Vorbeschäftigung im Fenster (Personalakte)", "§ 14 Abs. 2 Satz 2 TzBfG", ["A9"], (l) => {
        const ende = l.person.vorbeschaeftigungEnde;
        // Erst prüfen, dann den Text bauen: wenn() rechnet den Text auch ohne Datum und warf hier (Review 23.10.2026 B10).
        if (!sachgrundlos(l) || !ende || !imFenster(ende, l)) return null;
        return `Laut Personalakte war die Person bis ${formatDE(ende)} beschäftigt, also innerhalb von ${fenster()} vor dem Eintritt. Eine Befristung ohne Sachgrund ist dann gesperrt. Sicher ist eine Befristung mit Sachgrund oder ein unbefristeter Vertrag.`;
      }),
      regel("P-018", "sperre", "A9 sachgrundlos über Höchstdauer oder mit zu vielen Verlängerungen", "§ 14 Abs. 2 Satz 1 TzBfG", ["A9"], (l) => {
        if (!sachgrundlos(l)) return null;
        const ende = isISODate(wert(l, "A9", "ende")) ? wert(l, "A9", "ende") : l.person.befristungBis;
        const grenze = addDays(addMonths(l.person.eintritt, WERTE.befristungSachgrundlosMonate.wert), -1);
        const zuLang = !!ende && isISODate(ende) && compare(ende, grenze) > 0;
        const verl = Math.max(num(l, "A9", "verlaengerungen") ?? 0, l.person.verlaengerungen);
        const zuOft = verl > WERTE.befristungVerlaengerungenMax.wert;
        return wenn(zuLang || zuOft, [
          zuLang ? `Ohne Sachgrund darf die Befristung höchstens ${monateText(WERTE.befristungSachgrundlosMonate.wert)} dauern, also ab Eintritt ${formatDE(l.person.eintritt)} bis spätestens ${formatDE(grenze)}. Das Ende ${formatDE(ende!)} liegt danach.` : "",
          zuOft ? `Höchstens ${zahlwort(WERTE.befristungVerlaengerungenMax.wert)} Verlängerungen sind erlaubt, angegeben sind ${verl}.` : "",
        ].filter(Boolean).join(" ") + " Sicher ist eine Befristung mit Sachgrund oder ein unbefristeter Vertrag.");
      }),
      regel("P-017b", "warnung", "A9 sachgrundlos und Vorbeschäftigung vor längerer Zeit (keine feste Frist mehr)", "§ 14 Abs. 2 Satz 2 TzBfG, BVerfG 1 BvL 7/14, BAG 7 AZR 733/16", ["A9"], (l) => {
        if (!sachgrundlos(l)) return null;
        const erklaert = ["A9", "A10"].find((id) => hat(l, id) && wert(l, id, "vorbeschaeftigung") === "ja");
        const ende = (erklaert && wert(l, erklaert, "vorbeschaeftigungEnde")) || l.person.vorbeschaeftigungEnde || "";
        return wenn(isISODate(ende) && !imFenster(ende, l), `Die Person war schon beim Arbeitgeber beschäftigt (bis ${formatDE(ende)}). Auch nach vielen Jahren ist eine Befristung ohne Sachgrund dann in der Regel unwirksam: hohes Risiko. Ausnahme nur bei sehr lange zurückliegender, ganz anders gearteter oder sehr kurzer Vorbeschäftigung. Rechtlich prüfen lassen (${WERTE.vorbeschaeftigungVerbot.url}). Sicher ist eine Befristung mit Sachgrund oder ein unbefristeter Vertrag.`);
      }),
      regel("K-24", "sperre", "A9 sachgrundlos bei Vorbeschäftigung im Fenster (Erklärung in A9 oder A10)", "§ 14 Abs. 2 Satz 2 TzBfG", ["A9", "A10"], (l) => {
        if (!sachgrundlos(l)) return null;
        const quelle = ["A9", "A10"].find((id) => hat(l, id) && wert(l, id, "vorbeschaeftigung") === "ja");
        if (!quelle) return null;
        const ende = wert(l, quelle, "vorbeschaeftigungEnde") || l.person.vorbeschaeftigungEnde || "";
        const drin = !isISODate(ende) || imFenster(ende, l);
        return wenn(drin, `Laut Erklärung in ${quelle} war die Person schon beim Arbeitgeber beschäftigt${isISODate(ende) ? ` (bis ${formatDE(ende)})` : ", ohne Datum"}. Liegt das Ende innerhalb von ${fenster()} vor dem Eintritt, ist die Befristung ohne Sachgrund gesperrt. Wähle einen Sachgrund oder einen unbefristeten Vertrag.`);
      }),
      regel("K-25", "pflicht", "A9 oder A6 mit elektronischer Signatur: Signatur auf Original gestellt", "§ 14 Abs. 4 TzBfG", ["A6", "A9"], (l) => {
        const ids = ["A6", "A9"].filter((id) => hat(l, id));
        return wenn(ids.length > 0, `${ids.join(" und ")} brauchen die Schriftform. Eine elektronische Signatur reicht nicht. Lintelly stellt die Signatur auf „Original“: beide Seiten unterschreiben vor Arbeitsbeginn auf Papier.`);
      }),
    ],
  },
  {
    id: "A10", gruppe: "A", label: "Erklärung zu Vorbeschäftigung und Nebenbeschäftigung", labelEn: "Declaration on prior employment and secondary employment", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Immer sinnvoll, bei sachgrundloser Befristung zwingend.",
    felder: [
      { id: "vorbeschaeftigung", label: "Früher schon bei diesem Arbeitgeber beschäftigt (egal wie lange her)", typ: "janein", pflicht: true, standard: "nein" },
      { id: "vorbeschaeftigungEnde", label: "Ende der früheren Beschäftigung", typ: "datum", pflicht: true, bei: { vorbeschaeftigung: ["ja"] } },
      { id: "nebentaetigkeiten", label: "Laufende Nebentätigkeiten (eine je Zeile, leer: keine)", typ: "lang" },
      { id: "nebenStunden", label: "Wochenstunden bei anderen Arbeitgebern", typ: "zahl", min: 0, hinweis: "Arbeitszeiten bei mehreren Arbeitgebern werden zusammengerechnet (§ 2 Abs. 1 ArbZG)." },
    ],
    text: (w, k) => {
      const neben = (w.nebentaetigkeiten ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
      return [
        `(1) ${k.vorname} erklärt wahrheitsgemäß, ${w.vorbeschaeftigung === "ja" ? `bis zum ${datumText(w.vorbeschaeftigungEnde)} beim Arbeitgeber beschäftigt gewesen zu sein` : "in den letzten Jahren nicht beim Arbeitgeber beschäftigt gewesen zu sein, auch nicht als Aushilfe, Werkstudent oder im Minijob"}.`,
        `(2) Laufende Nebentätigkeiten: ${neben.length ? neben.join("; ") : "keine"}${zahl(w.nebenStunden) ? ` mit zusammen ${w.nebenStunden} Wochenstunden` : ""}.`,
        `(3) ${k.vorname} teilt Änderungen dieser Angaben unverzüglich in Textform mit, weil Arbeitszeiten bei mehreren Arbeitgebern zusammengerechnet werden.`,
        `(4) Diese Erklärung ersetzt nicht die eigene Prüfung des Arbeitgebers.`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const neben = (w.nebentaetigkeiten ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
      return [
        `(1) ${k.vorname} truthfully declares ${w.vorbeschaeftigung === "ja" ? `having been employed by the Employer until ${datumTextEn(w.vorbeschaeftigungEnde)}` : "not having been employed by the Employer in recent years, including as a temporary worker, working student or in a mini-job"}.`,
        `(2) Current secondary employment: ${neben.length ? neben.map(frei).join("; ") : "none"}${zahl(w.nebenStunden) ? ` totalling ${w.nebenStunden} hours per week` : ""}.`,
        `(3) ${k.vorname} reports any changes to this information in text form without undue delay, because working hours with several employers are added together.`,
        `(4) This declaration does not replace the Employer's own review.`,
      ].join("\n");
    },
    normen: ["§ 14 Abs. 2 TzBfG", "§ 2 Abs. 1 ArbZG"],
    quellen: ["https://www.gesetze-im-internet.de/tzbfg/__14.html", "https://www.gesetze-im-internet.de/arbzg/__2.html", katalog("A10")],
    schutz: ["Wahrheitsgemäße Erklärung mit Mitteilungspflicht bei Änderung.", "Die Erklärung ersetzt nicht die Prüfung des Arbeitgebers."],
    sperren: ["Fragen nach Schwangerschaft, Religion, Gewerkschaft oder Familienplanung."],
    stichwoerter: ["Vorbeschäftigung", "früher beschäftigt", "Nebenjob", "Nebentätigkeit", "zweiter Arbeitgeber", "Erklärung"],
  },
];
