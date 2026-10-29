/**
 * Vertragsbausteine der Gruppen O (Abtretung, Pfändung, Aufrechnung), P (Beendigung), Q (Ausschlussfristen, Tarif,
 * Schlussbestimmungen) und S (weitere Bausteine) nach dem Klauselkatalog 10.10.2026, Abschnitt 4.
 * Prüfregeln P-096 bis P-098 und Sperrkombinationen K-26 bis K-28. Q1 ersetzt § 15, Q4 ersetzt § 17 des Arbeitsvertrags.
 * Kein Text hier ist Endwortlaut: Die Kanzlei gibt jede Bausteinversion frei. Alle Rechtszahlen kommen aus lib/regeln/werte.ts.
 */
import { WERTE, monateText, monateTextDativ, zahlwort } from "@/lib/regeln/werte";
import { formatDE, isISODate } from "@/lib/regeln/datum";
import type { Baustein, Lage } from "./typen";
import { MIT_AUSBILDUNG, OHNE_WS, ARBEITNEHMER } from "./typen";
import { euro, hat, liste, num, regel, wenn, wert, zahl } from "./hilfen";
import { findeGesperrte } from "./rot";
import { anzahlEn, datumEn, euroEn, frei, zahlwortEn } from "@/lib/dokumente/englisch";

const ja = (s: string | undefined) => (s ?? "").trim().toLowerCase() === "ja";
const gesperrtIn = (l: Lage, id: string, rot: string) => findeGesperrte(wert(l, id, "ergaenzung")).some((r) => r.id === rot);

/* Englische Hilfen: Auswahlwerte auf feste englische Wörter, unbekannte Werte als freie Eingabe. */
const monEn = (n: number) => anzahlEn(n, "month", "months");
const enListe = (s: string | undefined, karte: Record<string, string>) => liste(s).map((x) => karte[x] ?? frei(x));
const GRUENDE_EN: Record<string, string> = {
  "nach Ausspruch einer Kündigung": "after notice of termination has been given",
  "bei Abschluss eines Aufhebungsvertrags": "upon conclusion of a termination agreement",
  "bei Verdacht auf Tätigkeit für einen Wettbewerber": "where there is suspicion of activity for a competitor",
  "bei schwerem Vertrauensverlust": "in the event of a serious loss of trust",
};
const ZUGRIFF_EN: Record<string, string> = {
  "im Intranet": "on the intranet",
  "als Aushändigung in Kopie": "in the copies handed over",
  "zur Einsicht in der Personalabteilung": "in the HR department",
};
const UNTERLAGEN_EN: Record<string, string> = {
  "Ausfertigung dieses Vertrags": "a signed copy of this contract",
  "Stellenbeschreibung": "job description",
  "Richtlinien": "policies",
  "Datenschutzinformation": "data protection information",
  "Betriebsvereinbarungen": "works agreements",
};
const ANGABEN_EN: Record<string, string> = {
  "Anschrift": "address",
  "Bankverbindung": "bank details",
  "Name": "name",
  "Staatsangehörigkeit und Aufenthaltstitel": "nationality and residence permit",
  "Lohnsteuermerkmale": "wage tax data",
};

/* ---------- O: Abtretung, Pfändung, Aufrechnung ---------- */

const O1: Baustein = {
  id: "O1", gruppe: "O", label: "Abtretungs- und Verpfändungsverbot", risiko: "grün", version: 1,
  passt: "Für alle Arbeitsverhältnisse, um Aufwand mit Abtretungen der Vergütung zu vermeiden.",
  fuer: ARBEITNEHMER, // Entscheidung 24: auch für Werkstudierende
  felder: [
    { id: "zustimmung", label: "Abtretung mit Zustimmung des Arbeitgebers möglich", typ: "janein", standard: "ja" },
  ],
  text: (w, k) => [
    `(1) ${k.vorname} kann Ansprüche auf Vergütung nicht an Dritte abtreten oder verpfänden${ja(w.zustimmung) ? ", es sei denn, der Arbeitgeber stimmt in Textform zu" : ""}.`,
    "(2) Pfändungen durch Gläubiger und der gesetzliche Pfändungsschutz bleiben davon unberührt.",
  ].join("\n"),
  labelEn: "Prohibition of assignment and pledging",
  textEn: (w, k) => [
    `(1) ${k.vorname} may not assign or pledge claims to remuneration to third parties${ja(w.zustimmung) ? ", unless the Employer consents in text form" : ""}.`,
    "(2) Attachments by creditors and the statutory protection against attachment remain unaffected.",
  ].join("\n"),
  normen: ["§ 399 BGB", "§ 850 ZPO"],
  quellen: ["https://www.gesetze-im-internet.de/bgb/__399.html", "https://www.gesetze-im-internet.de/zpo/__850.html", "Katalog Abschnitt 4, Baustein O1"],
  schutz: ["Das Verbot gilt nicht gegenüber Pfändungen."],
  sperren: ["Verbot, das als Verbot der Pfändung formuliert ist."],
  stichwoerter: ["Abtretung", "Verpfändung", "Lohnabtretung"],
};

const O2: Baustein = {
  id: "O2", gruppe: "O", label: "Lohnpfändung: Mitwirkung", risiko: "grün", version: 1,
  passt: "Für alle Arbeitsverhältnisse.",
  fuer: ARBEITNEHMER, // Entscheidung 24: auch für Werkstudierende
  felder: [
    { id: "mitteilung", label: "Person teilt bekannte Pfändungen mit", typ: "janein", standard: "ja" },
  ],
  text: (w, k) => [
    ja(w.mitteilung) ? `(1) ${k.vorname} teilt dem Arbeitgeber in Textform mit, wenn ${k.vorname} von einer Pfändung oder Abtretung der Vergütung erfährt.` : "",
    "(2) Der Arbeitgeber bearbeitet Pfändungen nach den gesetzlichen Vorschriften. Eine pauschale Bearbeitungsgebühr wird nicht erhoben.",
  ].filter(Boolean).join("\n"),
  labelEn: "Wage attachment: cooperation",
  textEn: (w, k) => [
    ja(w.mitteilung) ? `(1) ${k.vorname} informs the Employer in text form upon learning of an attachment or assignment of the remuneration.` : "",
    "(2) The Employer processes attachments in accordance with the statutory provisions. No flat-rate processing fee is charged.",
  ].filter(Boolean).join("\n"),
  normen: ["§ 829 ZPO", "§ 850c ZPO"],
  quellen: ["https://www.gesetze-im-internet.de/zpo/__829.html", "https://www.gesetze-im-internet.de/zpo/__850c.html", "Katalog Abschnitt 4, Baustein O2"],
  urteile: [{ az: "Linie BAG zu Kosten der Lohnpfändung", kennung: "P" }],
  schutz: ["Keine pauschale Kostenumlage."],
  sperren: ["Kostenpauschale pro Pfändung."],
  stichwoerter: ["Lohnpfändung", "Pfändung", "Gläubiger", "Drittschuldner"],
};

const O3: Baustein = {
  id: "O3", gruppe: "O", label: "Aufrechnung und Abzug vom Gehalt", risiko: "grün", version: 1,
  passt: "Für alle Arbeitsverhältnisse, wenn der Arbeitgeber eigene Forderungen verrechnen will.",
  fuer: OHNE_WS,
  felder: [
    { id: "vorab", label: "Vorabinformation vor der Verrechnung", typ: "janein", standard: "ja" },
  ],
  text: (w, k) => [
    `(1) Der Arbeitgeber kann mit eigenen Forderungen gegen die Vergütung von ${k.vorname} nur aufrechnen, soweit die Vergütung pfändbar ist.`,
    ja(w.vorab) ? `(2) Der Arbeitgeber informiert ${k.vorname} vor der Verrechnung in Textform über Grund und Höhe.` : "",
  ].filter(Boolean).join("\n"),
  labelEn: "Set-off and deductions from salary",
  textEn: (w, k) => [
    `(1) The Employer may set off its own claims against the remuneration of ${k.vorname} only to the extent that the remuneration is attachable.`,
    ja(w.vorab) ? `(2) Before any set-off, the Employer informs ${k.vorname} in text form of the reason and the amount.` : "",
  ].filter(Boolean).join("\n"),
  normen: ["§ 394 BGB", "§ 850c ZPO"],
  quellen: ["https://www.gesetze-im-internet.de/bgb/__394.html", "Katalog Abschnitt 4, Baustein O3"],
  schutz: ["Aufrechnung nur im pfändbaren Teil."],
  sperren: ["Abzug vom unpfändbaren Gehalt."],
  stichwoerter: ["Aufrechnung", "Verrechnung", "Abzug", "Gehaltsabzug"],
};

/* ---------- P: Beendigung ---------- */

const REGELALTER = "Regelaltersgrenze der gesetzlichen Rentenversicherung";

const P1: Baustein = {
  id: "P1", gruppe: "P", label: "Ende mit Erreichen der Regelaltersgrenze", risiko: "gelb", version: 1, nass: true, befristung: true,
  passt: "Für Firmen, die das Arbeitsverhältnis mit dem Rentenalter enden lassen wollen.",
  fuer: OHNE_WS,
  felder: [
    { id: "grenze", label: "Altersgrenze", typ: "auswahl", optionen: [REGELALTER], standard: REGELALTER, pflicht: true, hinweis: "Eine frühere Altersgrenze bietet Lintelly nicht an." },
    { id: "weiter", label: "Weiterbeschäftigung danach möglich", typ: "janein", standard: "ja" },
  ],
  text: (w, k) => [
    `(1) Das Arbeitsverhältnis endet, ohne dass es einer Kündigung bedarf, mit Ablauf des Monats, in dem ${k.vorname} die Regelaltersgrenze der gesetzlichen Rentenversicherung erreicht.`,
    ja(w.weiter) ? "(2) Beide Seiten können den Zeitpunkt der Beendigung während des Arbeitsverhältnisses durch Vereinbarung hinausschieben, auch mehrfach (§ 41 Satz 3 SGB VI)." : "",
    "Diese Vereinbarung bedarf der Schriftform.",
  ].filter(Boolean).join("\n"),
  labelEn: "Termination on reaching the standard retirement age",
  textEn: (w, k) => [
    `(1) The employment relationship ends, without the need for notice of termination, at the end of the month in which ${k.vorname} reaches the standard retirement age under the statutory pension insurance.`,
    ja(w.weiter) ? "(2) During the employment relationship, both parties may agree to postpone the date of termination, also more than once (§ 41 sentence 3 SGB VI)." : "",
    "This agreement requires written form (Schriftform).",
  ].filter(Boolean).join("\n"),
  normen: ["§ 41 SGB VI", "§ 14 TzBfG", "AGG"],
  quellen: ["https://www.gesetze-im-internet.de/sgb_6/__41.html", "https://www.gesetze-im-internet.de/tzbfg/__14.html", "Katalog Abschnitt 4, Baustein P1"],
  urteile: [{ az: "Linie BAG zur Altersgrenze bei Regelaltersgrenze", kennung: "P" }],
  schutz: ["Nur Regelaltersgrenze wählbar.", "Schriftform, Signatur Original."],
  sperren: ["Altersgrenze vor dem Regelrentenalter."],
  stichwoerter: ["Altersgrenze", "Rente", "Rentenalter", "Ruhestand"],
};

const P2: Baustein = {
  id: "P2", gruppe: "P", label: "Freistellung nach Kündigung", risiko: "gelb", version: 2,
  passt: "Für Fach- und Führungskräfte, Vertrieb und Positionen mit Zugang zu Geheimnissen.",
  fuer: ARBEITNEHMER, // Entscheidung 24: auch für Werkstudierende
  felder: [
    { id: "gruende", label: "Gründe", typ: "mehrfach", optionen: ["nach Ausspruch einer Kündigung", "bei Abschluss eines Aufhebungsvertrags", "bei Verdacht auf Tätigkeit für einen Wettbewerber", "bei schwerem Vertrauensverlust"], standard: "nach Ausspruch einer Kündigung", pflicht: true },
    { id: "art", label: "Art der Freistellung", typ: "auswahl", optionen: ["unwiderruflich", "widerruflich"], standard: "unwiderruflich", pflicht: true },
    { id: "urlaub", label: "Resturlaub wird angerechnet", typ: "janein", standard: "ja", bei: { art: ["unwiderruflich"] }, hinweis: "Urlaub lässt sich nur in einer unwiderruflichen Freistellung anrechnen." },
    { id: "urlaubFolgejahr", label: "Reicht die Freistellung ins nächste Jahr: Urlaub des Folgejahres vorsorglich mit gewähren", typ: "janein", standard: "nein", bei: { art: ["unwiderruflich"] }, hinweis: "Ob die Gewährung vor Entstehen des Anspruchs wirkt, ist nicht abschließend geklärt: Kanzlei prüfen." },
    { id: "ueberstunden", label: "Guthaben aus Überstunden wird angerechnet", typ: "janein", standard: "ja" },
    { id: "verdienst", label: "Anderweitiger Verdienst wird angerechnet", typ: "janein", standard: "ja" },
    { id: "rueckgabe", label: "Rückgabe von Arbeitsmitteln bei Freistellung", typ: "janein", standard: "ja" },
  ],
  text: (w, k) => {
    const unwider = w.art !== "widerruflich";
    return [
      `(1) Der Arbeitgeber kann ${k.vorname} ${liste(w.gruende).join(", ") || "nach Ausspruch einer Kündigung"} bis zum Ende des Arbeitsverhältnisses ${unwider ? "unwiderruflich" : "widerruflich"} von der Arbeit freistellen, wenn sein Interesse an der Freistellung das Interesse an der Beschäftigung überwiegt.`,
      "(2) Während der Freistellung zahlt der Arbeitgeber die Vergütung weiter, einschließlich der variablen Bestandteile im Durchschnitt.",
      unwider && ja(w.urlaub) ? `(3) Mit der unwiderruflichen Freistellung wird der Resturlaub gewährt; die Freistellung erfolgt zunächst unter Anrechnung des Urlaubs. Der Arbeitgeber legt die Lage des Urlaubs in der Erklärung fest.${ja(w.urlaubFolgejahr) ? " Reicht die Freistellung in das nächste Kalenderjahr, gewährt der Arbeitgeber vorsorglich auch den Urlaub des Folgejahres zu dessen Beginn." : ""}` : "",
      ja(w.ueberstunden) ? "Ein Guthaben aus Überstunden wird mit der Freistellung ausgeglichen." : "",
      ja(w.verdienst) ? `Was ${k.vorname} während der Freistellung durch anderweitige Arbeit verdient, wird nach § 615 Satz 2 BGB angerechnet.` : "",
      ja(w.rueckgabe) ? `${k.vorname} gibt auf Verlangen Arbeitsmittel zurück; für einen Dienstwagen mit privater Nutzung gilt die Regel zum Dienstwagen.` : "",
      "Das Wettbewerbsverbot während des Arbeitsverhältnisses gilt auch in der Freistellung.",
    ].filter(Boolean).join("\n");
  },
  labelEn: "Release from work after notice of termination",
  textEn: (w, k) => {
    const unwider = w.art !== "widerruflich";
    return [
      `(1) The Employer may release ${k.vorname} from work ${enListe(w.gruende, GRUENDE_EN).join(", ") || "after notice of termination has been given"} until the end of the employment relationship ${unwider ? "irrevocably" : "revocably"}, if its interest in the release outweighs the interest in continued employment.`,
      "(2) During the release, the Employer continues to pay the remuneration, including the variable components on an average basis.",
      unwider && ja(w.urlaub) ? `(3) The remaining holiday is granted with the irrevocable release; the release initially counts against the holiday entitlement. The Employer specifies the timing of the holiday in the declaration.${ja(w.urlaubFolgejahr) ? " If the release extends into the next calendar year, the Employer also grants, as a precaution, the holiday for the following year at its start." : ""}` : "",
      ja(w.ueberstunden) ? "Any credit from overtime is compensated by the release." : "",
      ja(w.verdienst) ? `Anything ${k.vorname} earns from other work during the release is credited under § 615 sentence 2 BGB.` : "",
      ja(w.rueckgabe) ? `${k.vorname} returns work equipment on request; for a company car with private use, the provision on the company car applies.` : "",
      "The prohibition of competition during the employment relationship also applies during the release.",
    ].filter(Boolean).join("\n");
  },
  normen: ["§ 106 GewO", "§ 615 BGB", "§ 11 KSchG", "§ 7 Abs. 1 BUrlG"],
  quellen: ["https://www.gesetze-im-internet.de/bgb/__615.html", "https://www.gesetze-im-internet.de/burlg/__7.html", "Katalog Abschnitt 4, Baustein P2"],
  urteile: [{ az: "BAG Großer Senat zum Beschäftigungsanspruch", kennung: "P" }, { az: "Linie BAG zur Freistellungsklausel", kennung: "P" }],
  schutz: ["Gründe benannt.", "Vergütung läuft weiter, auch variable Anteile.", "Dienstwagen nach D24."],
  sperren: ["Freistellung ohne Fortzahlung.", "Freistellung in der Berufsausbildung.", "Widerruf der Dienstwagennutzung ohne wirksamen Vorbehalt."],
  stichwoerter: ["Freistellung", "Garden Leave", "Kündigung", "Resturlaub"],
};

const P3: Baustein = {
  id: "P3", gruppe: "P", label: "Verlängerte Kündigungsfristen", risiko: "grün", version: 2,
  passt: "Für Fach- und Führungskräfte, bei denen beide Seiten mehr Vorlauf wollen.",
  fuer: OHNE_WS,
  felder: [
    { id: "fristMonate", label: "Kündigungsfrist des Arbeitgebers in Monaten", typ: "zahl", pflicht: true, min: 1 },
    { id: "fristPersonMonate", label: "Kündigungsfrist der Person in Monaten", typ: "zahl", pflicht: true, min: 1, hinweis: "Nie länger als die Frist des Arbeitgebers." },
    { id: "termin", label: "Kündigungstermin", typ: "auswahl", optionen: ["zum Monatsende", "zum Quartalsende"], standard: "zum Monatsende", pflicht: true },
    { id: "verlaengerungBeide", label: "Gesetzliche Verlängerung nach Betriebszugehörigkeit gilt für beide Seiten", typ: "janein", standard: "nein", hinweis: "Gleiche Fristen für beide Seiten erlaubt § 622 Abs. 6 BGB. Schützt den Arbeitgeber, wenn langjährige Beschäftigte kündigen." },
  ],
  text: (w, k) => {
    const ag = zahl(w.fristMonate) ?? 0;
    const pe = zahl(w.fristPersonMonate) ?? ag;
    const termin = w.termin || "zum Monatsende";
    return [
      `(1) Nach der Probezeit kann der Arbeitgeber mit einer Frist von ${monateTextDativ(ag)} ${termin} kündigen, ${k.vorname} mit einer Frist von ${monateTextDativ(pe)} ${termin}.`,
      ja(w.verlaengerungBeide)
        ? `(2) Verlängert sich die Frist für den Arbeitgeber nach § 622 Abs. 2 BGB, gilt die längere gesetzliche Frist auch für eine Kündigung durch ${k.vorname}; für die Person gilt nie eine längere Frist als für den Arbeitgeber (§ 622 Abs. 6 BGB).`
        : "(2) Verlängert sich die Frist für den Arbeitgeber nach dem Gesetz, gilt die längere gesetzliche Frist für den Arbeitgeber; für die Person darf keine längere Frist gelten als für den Arbeitgeber (§ 622 BGB).",
    ].join("\n");
  },
  labelEn: "Extended notice periods",
  textEn: (w, k) => {
    const ag = zahl(w.fristMonate) ?? 0;
    const pe = zahl(w.fristPersonMonate) ?? ag;
    const termin = w.termin === "zum Quartalsende" ? "to the end of a calendar quarter" : "to the end of a calendar month";
    return [
      `(1) After the probationary period, the Employer may terminate with a notice period of ${monEn(ag)} ${termin}, and ${k.vorname} with a notice period of ${monEn(pe)} ${termin}.`,
      ja(w.verlaengerungBeide)
        ? `(2) If the notice period for the Employer is extended under § 622 para. 2 BGB, the longer statutory period also applies to notice given by ${k.vorname}; the Employee is never subject to a longer notice period than the Employer (§ 622 para. 6 BGB).`
        : "(2) If the notice period for the Employer is extended by law, the longer statutory period applies to the Employer; the Employee may not be subject to a longer notice period than the Employer (§ 622 BGB).",
    ].join("\n");
  },
  normen: ["§ 622 Abs. 5 BGB", "§ 622 Abs. 6 BGB", "§ 624 BGB"],
  quellen: ["https://www.gesetze-im-internet.de/bgb/__622.html", "https://www.gesetze-im-internet.de/bgb/__624.html", "Katalog Abschnitt 4, Baustein P3"],
  schutz: ["Beidseitig; die Frist der Person ist nie länger als die des Arbeitgebers."],
  sperren: ["Längere Frist nur für die Person (R14)."],
  stichwoerter: ["Kündigungsfrist", "verlängerte Frist", "Quartalsende"],
  regeln: [
    regel("P-098", "sperre", "Kündigungsfrist der Person länger als die des Arbeitgebers", "§ 622 Abs. 6 BGB (R14)", ["P3"], (l) => {
      const ag = num(l, "P3", "fristMonate");
      const pe = num(l, "P3", "fristPersonMonate");
      return wenn(ag !== null && pe !== null && pe > ag, `Die Person hätte ${monateText(pe ?? 0)} Frist, der Arbeitgeber nur ${monateText(ag ?? 0)}. Für die Person darf keine längere Frist gelten. Sicher: gleiche Frist für beide Seiten.`);
    }),
    regel("K-28", "sperre", "Verlängerte Kündigungsfrist nur für die Person", "§ 622 Abs. 6 BGB (R14)", ["P3"], (l) => {
      const nurPerson = hat(l, "P3") && num(l, "P3", "fristMonate") === null && num(l, "P3", "fristPersonMonate") !== null;
      return wenn(nurPerson || gesperrtIn(l, "P3", "R14"), "Eine verlängerte Frist nur für die Person ist unwirksam. Die Frist gilt für beide Seiten, trage auch die Frist des Arbeitgebers ein.");
    }),
  ],
};

const P4: Baustein = {
  id: "P4", gruppe: "P", label: "Zeugnis, Arbeitspapiere, Meldung als arbeitsuchend", risiko: "grün", version: 1,
  passt: "Für alle Arbeitsverhältnisse als Hinweis zum Ende.",
  fuer: OHNE_WS,
  felder: [
    { id: "zwischenzeugnis", label: "Zwischenzeugnis auf Wunsch bei triftigem Grund", typ: "janein", standard: "ja" },
  ],
  text: (w, k) => [
    `(1) ${k.vorname} erhält bei Ende des Arbeitsverhältnisses ein schriftliches Zeugnis, auf Wunsch ein qualifiziertes Zeugnis über Leistung und Verhalten (§ 109 GewO).${ja(w.zwischenzeugnis) ? " Bei einem triftigen Grund gibt es auf Wunsch ein Zwischenzeugnis." : ""}`,
    "(2) Der Arbeitgeber händigt die Arbeitspapiere und eine Bescheinigung über den im Kalenderjahr gewährten Urlaub aus (§ 6 BUrlG).",
    `(3) Hinweis: Wer arbeitsuchend wird, muss sich spätestens ${monateText(WERTE.arbeitsuchendMeldung.monate)} vor dem Ende bei der Agentur für Arbeit melden; liegen zwischen Kenntnis und Ende weniger als ${monateText(WERTE.arbeitsuchendMeldung.monate)}, innerhalb von ${zahlwort(WERTE.arbeitsuchendMeldung.tage)} Tagen nach Kenntnis (§ 38 SGB III).`,
  ].join("\n"),
  labelEn: "Reference, employment documents, registration as a jobseeker",
  textEn: (w, k) => [
    `(1) At the end of the employment relationship, ${k.vorname} receives a written reference and, on request, a qualified reference covering performance and conduct (§ 109 GewO).${ja(w.zwischenzeugnis) ? " Where there is good reason, an interim reference is issued on request." : ""}`,
    "(2) The Employer hands over the employment documents and a certificate of the holiday granted in the calendar year (§ 6 BUrlG).",
    `(3) Note: anyone who is about to become a jobseeker must register with the Federal Employment Agency no later than ${monEn(WERTE.arbeitsuchendMeldung.monate)} before the end; if less than ${monEn(WERTE.arbeitsuchendMeldung.monate)} lie between becoming aware and the end, within ${zahlwortEn(WERTE.arbeitsuchendMeldung.tage)} days of becoming aware (§ 38 SGB III).`,
  ].join("\n"),
  normen: ["§ 109 GewO", "§ 38 SGB III", "§ 2 Abs. 2 SGB III", "§ 6 BUrlG"],
  quellen: ["https://www.gesetze-im-internet.de/gewo/__109.html", "https://www.gesetze-im-internet.de/sgb_3/__38.html", "Katalog Abschnitt 4, Baustein P4"],
  schutz: ["Nur Hinweise, keine Pflichten der Person über das Gesetz hinaus."],
  sperren: ["Zeugnisverzicht im Voraus (R7)."],
  stichwoerter: ["Zeugnis", "Arbeitszeugnis", "Arbeitspapiere", "arbeitsuchend", "Agentur für Arbeit"],
};

/* ---------- Q: Ausschlussfristen, Tarif, Betriebsvereinbarungen, Schlussbestimmungen ---------- */

const MIN_AUSSCHLUSS = WERTE.ausschlussfristMonate.wert;

const Q1: Baustein = {
  id: "Q1", gruppe: "Q", label: "Ausschlussfrist", risiko: "grün", version: 1, ersetzt: "§ 15",
  passt: "Standard für alle Verträge: Ansprüche werden zügig geklärt.",
  fuer: MIT_AUSBILDUNG,
  felder: [
    { id: "dauerMonate", label: "Frist der ersten Stufe in Monaten ab Fälligkeit", typ: "zahl", pflicht: true, min: MIN_AUSSCHLUSS, standard: String(MIN_AUSSCHLUSS) },
    { id: "stufen", label: "Stufen", typ: "auswahl", optionen: ["zweistufig", "einstufig"], standard: "zweistufig", pflicht: true },
    { id: "zweiteMonate", label: "Frist der zweiten Stufe (Klage) in Monaten", typ: "zahl", min: MIN_AUSSCHLUSS, standard: String(MIN_AUSSCHLUSS), bei: { stufen: ["zweistufig"] } },
  ],
  text: (w) => {
    const m = zahl(w.dauerMonate) ?? MIN_AUSSCHLUSS;
    const z = zahl(w.zweiteMonate) ?? MIN_AUSSCHLUSS;
    const reaktion = zahlwort(WERTE.ausschlussfristMonate.zweiteStufeWochen);
    const zweite = w.stufen === "einstufig" ? "" : ` Lehnt die andere Seite den Anspruch ab oder äußert sie sich nicht innerhalb von ${reaktion} Wochen nach der Geltendmachung, verfällt er, wenn er nicht innerhalb von weiteren ${monateTextDativ(z)} gerichtlich geltend gemacht wird.`;
    return [
      `(1) Ansprüche beider Seiten aus dem Arbeitsverhältnis und solche, die damit zusammenhängen, verfallen, wenn sie nicht innerhalb von ${monateTextDativ(m)} nach Fälligkeit in Textform gegenüber der anderen Seite geltend gemacht werden.${zweite}`,
      "(2) Die Fristen gelten nicht für Ansprüche auf den gesetzlichen Mindestlohn, für Haftung wegen Vorsatzes oder grober Fahrlässigkeit, für Schäden aus der Verletzung von Leben, Körper oder Gesundheit und für Ansprüche, die nach dem Gesetz nicht ausgeschlossen werden können.",
    ].join("\n");
  },
  labelEn: "Exclusion period",
  textEn: (w) => {
    const m = zahl(w.dauerMonate) ?? MIN_AUSSCHLUSS;
    const z = zahl(w.zweiteMonate) ?? MIN_AUSSCHLUSS;
    const reaktion = zahlwortEn(WERTE.ausschlussfristMonate.zweiteStufeWochen);
    const zweite = w.stufen === "einstufig" ? "" : ` If the other party rejects the claim or does not respond within ${reaktion} weeks of it being asserted, the claim lapses unless it is asserted in court within a further ${monEn(z)}.`;
    return [
      `(1) Claims of both parties arising from the employment relationship and claims connected with it lapse unless they are asserted against the other party in text form within ${monEn(m)} of falling due.${zweite}`,
      "(2) These periods do not apply to claims to the statutory minimum wage, to liability for intent or gross negligence, to damage arising from injury to life, body or health, or to claims that cannot be excluded by law.",
    ].join("\n");
  },
  normen: ["§ 3 MiLoG", "§ 202 BGB", "§ 309 Nr. 7 BGB", "§ 309 Nr. 13 BGB", "§ 307 BGB", "§ 12 EFZG"],
  quellen: ["https://www.gesetze-im-internet.de/milog/__3.html", "https://www.gesetze-im-internet.de/bgb/__309.html", "https://www.gesetze-im-internet.de/bgb/__202.html", "Katalog Abschnitt 4, Baustein Q1"],
  urteile: [{ az: "BAG 5 AZR 572/04", kennung: "P" }, { az: "BAG 5 AZR 52/05", kennung: "P" }, { az: "BAG 9 AZR 162/18", kennung: "B" }],
  schutz: ["Dauer mindestens der Wert aus dem Register.", "Nur Textform.", "Gilt für beide Seiten.", "Ausnahmen für Mindestlohn, Vorsatz, Leben, Körper und Gesundheit und nicht ausschließbare Ansprüche stehen immer im Text."],
  sperren: ["Schriftform für die Geltendmachung (R6).", "Frist unter dem Mindestwert (R6).", "Ohne Ausnahme für Mindestlohn (R6)."],
  stichwoerter: ["Ausschlussfrist", "Verfallfrist", "Verfall", "Verfallklausel"],
  regeln: [
    regel("P-096", "sperre", "Ausschlussfrist zu kurz, ohne Pflichtausnahmen oder mit Schriftform", `${WERTE.ausschlussfristRecht.quelle} (R6)`, ["Q1"], (l) => {
      if (!hat(l, "Q1")) return null;
      const m = num(l, "Q1", "dauerMonate");
      const z = wert(l, "Q1", "stufen") === "einstufig" ? null : num(l, "Q1", "zweiteMonate");
      if ((m !== null && m < MIN_AUSSCHLUSS) || (z !== null && z < MIN_AUSSCHLUSS)) return `Jede Stufe der Ausschlussfrist braucht mindestens ${monateText(MIN_AUSSCHLUSS)}. Kürzere Fristen machen die ganze Klausel unwirksam.`;
      return wenn(/schriftlich|schriftform|ohne (die )?ausnahme|nur für (den arbeitnehmer|die person|ansprüche der person)/i.test(wert(l, "Q1", "ergaenzung")), "Die Ergänzung verlangt Schriftform, streicht Ausnahmen oder macht die Frist einseitig. Erlaubt ist nur Textform, für beide Seiten und mit allen Ausnahmen.");
    }),
    regel("K-26", "sperre", "Ausschlussfrist ohne Mindestlohn- und Vorsatzausnahme, unter dem Mindestwert oder mit Schriftform", "§ 3 MiLoG, § 202 BGB, § 309 Nr. 13 BGB (R6)", ["Q1"],
      (l) => wenn(hat(l, "Q1") && gesperrtIn(l, "Q1", "R6"), `Die Ergänzung in Q1 enthält eine gesperrte Form der Ausschlussfrist. Sicher: Textform, beidseitig, mindestens ${monateText(MIN_AUSSCHLUSS)}, mit Ausnahme für Mindestlohn und Vorsatz.`)),
  ],
};

const Q2: Baustein = {
  id: "Q2", gruppe: "Q", label: "Bezugnahme auf einen Tarifvertrag", risiko: "gelb", version: 1, ersetzt: "§ 14",
  passt: "Für tarifgebundene und tarifnahe Firmen.",
  fuer: MIT_AUSBILDUNG,
  felder: [
    { id: "tarifvertrag", label: "Tarifvertrag (genaue Bezeichnung)", typ: "text", pflicht: true, hinweis: "Nie „der jeweils einschlägige Tarifvertrag“." },
    { id: "fassung", label: "Fassung (Datum)", typ: "text", pflicht: true },
    { id: "art", label: "Art der Bezugnahme", typ: "auswahl", optionen: ["dynamisch", "statisch"], standard: "dynamisch", pflicht: true, hinweis: "Dynamisch folgt jeder neuen Fassung, statisch bleibt beim genannten Stand. Bei Tarifwechsel oder Firmentarif Kanzlei prüfen." },
    { id: "umfang", label: "Umfang", typ: "auswahl", optionen: ["vollständig", "nur einzelne Teile"], standard: "vollständig", pflicht: true },
    { id: "teile", label: "Welche Teile", typ: "text", pflicht: true, bei: { umfang: ["nur einzelne Teile"] } },
  ],
  text: (w, k) => [
    `(1) Auf das Arbeitsverhältnis findet ${w.umfang === "nur einzelne Teile" ? `mit folgenden Teilen (${w.teile || "[Teile]"}) ` : ""}der ${w.tarifvertrag || "[Tarifvertrag]"} ${w.art === "statisch" ? `in der Fassung vom ${w.fassung || "[Datum]"}` : `in seiner jeweils geltenden Fassung, derzeit in der Fassung vom ${w.fassung || "[Datum]"},`} Anwendung.`,
    `(2) Diese Bezugnahme gilt auch dann, wenn der Arbeitgeber nicht oder nicht mehr tarifgebunden ist. Günstigere Vereinbarungen in diesem Vertrag zugunsten von ${k.vorname} gehen vor.`,
  ].join("\n"),
  labelEn: "Reference to a collective agreement",
  textEn: (w, k) => {
    const teile = w.umfang === "nur einzelne Teile";
    const tv = frei(w.tarifvertrag) || "[collective agreement]";
    const fassung = w.fassung ? (isISODate(w.fassung) ? datumEn(w.fassung) : w.fassung) : "[date]";
    const stand = w.art === "statisch" ? `in the version of ${fassung}` : `as amended from time to time, currently in the version of ${fassung},`;
    return [
      `(1) ${teile ? `The following parts (${frei(w.teile) || "[parts]"}) of the` : "The"} ${tv} ${stand} ${teile ? "apply" : "applies"} to the employment relationship.`,
      `(2) This reference also applies if the Employer is not, or is no longer, bound by collective agreements. More favourable arrangements in this contract in favour of ${k.vorname} take precedence.`,
    ].join("\n");
  },
  normen: ["§ 2 Abs. 1 Satz 2 Nr. 15 NachwG", "§ 3 TVG", "§ 4 TVG", "§ 305c BGB", "§ 307 BGB"],
  quellen: ["https://www.gesetze-im-internet.de/nachwg/__2.html", "https://www.gesetze-im-internet.de/tvg/__4.html", "Katalog Abschnitt 4, Baustein Q2"],
  urteile: [{ az: "BAG 4 AZR 652/05", kennung: "P" }],
  schutz: ["Tarifvertrag und Fassung genannt.", "Wahl dynamisch oder statisch mit Hinweis auf die Folgen."],
  sperren: ["Verweis auf „den jeweils einschlägigen Tarifvertrag“ ohne Bezeichnung.", "Verweis auf nicht vorliegende Regelwerke."],
  stichwoerter: ["Tarifvertrag", "Tarif", "Bezugnahmeklausel", "dynamisch"],
};

const Q3: Baustein = {
  id: "Q3", gruppe: "Q", label: "Betriebsvereinbarungen und Richtlinien", risiko: "grün", ersetzt: "§ 14",
  version: 2,
  passt: "Für Firmen mit Betriebsrat oder internen Richtlinien (Reisekosten, Homeoffice).",
  fuer: MIT_AUSBILDUNG,
  felder: [
    { id: "regelwerke", label: "Betriebsvereinbarungen und Richtlinien (Liste)", typ: "lang", pflicht: true },
    { id: "zugriff", label: "Zugang", typ: "auswahl", optionen: ["im Intranet", "als Aushändigung in Kopie", "zur Einsicht in der Personalabteilung"], standard: "im Intranet", pflicht: true },
    { id: "offen", label: "Betriebsvereinbarungsoffen: spätere Betriebsvereinbarungen gehen dem Vertrag vor, auch wenn sie ungünstiger sind", typ: "janein", standard: "nein", hinweis: "Nur mit Betriebsrat sinnvoll. Gehalt und Arbeitszeit aus diesem Vertrag bleiben ausgenommen. Reichweite von der Kanzlei prüfen lassen." },
  ],
  text: (w, k) => [
    `(1) Für das Arbeitsverhältnis gelten die Betriebsvereinbarungen und Richtlinien in ihrer jeweiligen Fassung, derzeit: ${w.regelwerke?.trim() || "[Liste]"}. ${k.vorname} kann sie ${w.zugriff || "im Intranet"} einsehen.`,
    ja(w.offen)
      ? `(2) Betriebsvereinbarungen gelten unmittelbar und zwingend. Regelt eine Betriebsvereinbarung denselben Gegenstand wie dieser Vertrag, geht sie vor, auch wenn sie für ${k.vorname} ungünstiger ist. Ausgenommen sind Gehalt und Arbeitszeit, die in diesem Vertrag einzeln vereinbart sind.`
      : `(2) Betriebsvereinbarungen gelten unmittelbar und zwingend. Günstigere Regeln in diesem Vertrag zugunsten von ${k.vorname} gehen vor.`,
  ].join("\n"),
  labelEn: "Works agreements and policies",
  textEn: (w, k) => [
    `(1) The works agreements (Betriebsvereinbarungen) and policies as amended from time to time apply to the employment relationship, currently: ${frei(w.regelwerke) || "[list]"}. ${k.vorname} can view them ${ZUGRIFF_EN[w.zugriff ?? ""] ?? "on the intranet"}.`,
    ja(w.offen)
      ? `(2) Works agreements apply directly and with binding effect. If a works agreement governs the same matter as this contract, it takes precedence, even if it is less favourable for ${k.vorname}. Salary and working hours individually agreed in this contract are excluded.`
      : `(2) Works agreements apply directly and with binding effect. More favourable rules in this contract in favour of ${k.vorname} take precedence.`,
  ].join("\n"),
  normen: ["§ 77 BetrVG", "§ 2 Abs. 1 Satz 2 Nr. 15 NachwG"],
  quellen: ["https://www.gesetze-im-internet.de/betrvg/__77.html", "Katalog Abschnitt 4, Baustein Q3"],
  schutz: ["Verweis ohne Verschlechterung einer Betriebsvereinbarung."],
  sperren: ["Klausel, die eine Betriebsvereinbarung zu Lasten der Person ändert."],
  stichwoerter: ["Betriebsvereinbarung", "Richtlinie", "Policy", "Betriebsrat", "betriebsvereinbarungsoffen"],
  regeln: [
    regel("P-107", "warnung", "Q3 betriebsvereinbarungsoffen", "§ 77 Abs. 4 BetrVG, § 307 BGB (BAG 1 AZR 417/12, Aktenzeichen prüfen)", ["Q3"], (l) =>
      wenn(hat(l, "Q3") && wert(l, "Q3", "offen") === "ja", `Spätere Betriebsvereinbarungen sollen auch zu Lasten der Person vorgehen. Ob die Öffnung so weit und so klar genug ist, entscheidet die Kanzlei.${l.firma.betriebsrat ? "" : " Ohne Betriebsrat gibt es keine Betriebsvereinbarung, die Klausel läuft dann ins Leere."}`)),
  ],
};

const DOPPELT = "doppelte Schriftform (auch für die Aufhebung dieser Klausel)";

const Q4: Baustein = {
  id: "Q4", gruppe: "Q", label: "Schlussbestimmungen", risiko: "grün", version: 1, ersetzt: "§ 17",
  passt: "Standard für alle Verträge.",
  fuer: MIT_AUSBILDUNG,
  felder: [
    { id: "form", label: "Form für Änderungen", typ: "auswahl", optionen: ["Textform", DOPPELT], standard: "Textform", pflicht: true, hinweis: "Die doppelte Schriftform ist unwirksam und gesperrt." },
    { id: "salvatorisch", label: "Salvatorische Klausel", typ: "janein", standard: "ja" },
  ],
  text: (w) => [
    "(1) Änderungen und Ergänzungen dieses Vertrags bedürfen der Textform.",
    "(2) Individuelle Vereinbarungen haben Vorrang, auch wenn sie mündlich getroffen werden (§ 305b BGB).",
    ja(w.salvatorisch) || !w.salvatorisch ? "(3) Sollte eine Bestimmung unwirksam sein, bleibt der Vertrag im Übrigen wirksam. Das gilt nicht als Ersatz für eine fehlende Karenzentschädigung." : "",
  ].filter(Boolean).join("\n"),
  labelEn: "Final provisions",
  textEn: (w) => [
    "(1) Amendments and additions to this contract require text form.",
    "(2) Individual agreements take precedence, even if they are made orally (§ 305b BGB).",
    ja(w.salvatorisch) || !w.salvatorisch ? "(3) Should any provision be invalid, the remainder of the contract remains valid. This does not replace missing compensation for a post-contractual non-competition covenant (Karenzentschädigung)." : "",
  ].filter(Boolean).join("\n"),
  normen: ["§ 305b BGB", "§ 309 Nr. 13 BGB", "§ 125 BGB"],
  quellen: ["https://www.gesetze-im-internet.de/bgb/__305b.html", "https://www.gesetze-im-internet.de/bgb/__309.html", "Katalog Abschnitt 4, Baustein Q4"],
  urteile: [{ az: "BAG 9 AZR 382/07", kennung: "P" }, { az: "BAG 10 AZR 448/15", kennung: "V" }],
  schutz: ["Nur Textform, mit Satz zum Vorrang der Individualabrede."],
  sperren: ["Doppelte Schriftformklausel (R9)."],
  stichwoerter: ["Schlussbestimmungen", "Schriftform", "Textform", "salvatorische Klausel"],
  regeln: [
    regel("P-097", "sperre", "Doppelte Schriftform gewählt", "§ 305b BGB, BAG 9 AZR 382/07 (R9)", ["Q4"],
      (l) => wenn(wert(l, "Q4", "form") === DOPPELT, "Die doppelte Schriftformklausel ist unwirksam, weil sie den Vorrang mündlicher Abreden verschleiert. Wähle „Textform“.")),
    regel("K-27", "sperre", "Doppelte Schriftform in der Ergänzung", "§ 305b BGB (R9)", ["Q4"],
      (l) => wenn(hat(l, "Q4") && gesperrtIn(l, "Q4", "R9"), "Die Ergänzung in Q4 enthält eine doppelte Schriftformklausel. Sicher: Textform mit Vorrang der Individualabrede.")),
  ],
};

const Q5: Baustein = {
  id: "Q5", gruppe: "Q", label: "Anwendbares Recht, Gerichtsstand, Vertragssprache", risiko: "grün", version: 1,
  passt: "Für alle Verträge, Eingaben vor allem bei Auslandsbezug.",
  fuer: MIT_AUSBILDUNG,
  felder: [
    { id: "sprache", label: "Vertragssprache", typ: "auswahl", optionen: ["Deutsch", "Deutsch mit Übersetzung"], standard: "Deutsch", pflicht: true },
    { id: "uebersetzung", label: "Sprache der Übersetzung", typ: "text", pflicht: true, bei: { sprache: ["Deutsch mit Übersetzung"] } },
  ],
  text: (w) => [
    "(1) Für das Arbeitsverhältnis gilt deutsches Recht. Zwingende Schutzvorschriften des Staates, in dem gewöhnlich gearbeitet wird, bleiben unberührt (Art. 8 Rom-I-VO).",
    "(2) Für Streitigkeiten sind die Arbeitsgerichte nach den gesetzlichen Regeln zuständig.",
    w.sprache === "Deutsch mit Übersetzung" ? `(3) Der Vertrag ist in deutscher Sprache geschlossen. Die Übersetzung in ${w.uebersetzung || "[Sprache]"} dient dem Verständnis; maßgeblich ist die deutsche Fassung.` : "",
  ].filter(Boolean).join("\n"),
  labelEn: "Applicable law, place of jurisdiction, contract language",
  textEn: (w) => [
    "(1) German law applies to the employment relationship. Mandatory protective provisions of the state in which the work is habitually carried out remain unaffected (Art. 8 Rom-I-VO).",
    "(2) Disputes fall within the jurisdiction of the labour courts in accordance with the statutory rules.",
    w.sprache === "Deutsch mit Übersetzung" ? `(3) The contract is concluded in German. The translation into ${frei(w.uebersetzung) || "[language]"} is provided for information; the German version prevails.` : "",
  ].filter(Boolean).join("\n"),
  normen: ["§ 38 ZPO", "§ 48 ArbGG", "Art. 8 Rom-I-VO", "§ 101 ArbGG"],
  quellen: ["https://www.gesetze-im-internet.de/arbgg/__48.html", "https://eur-lex.europa.eu/eli/reg/2008/593/oj", "Katalog Abschnitt 4, Baustein Q5"],
  schutz: ["Kein Gerichtsstand außerhalb des gesetzlichen.", "Bei Beschäftigung im Ausland Hinweis auf B7."],
  sperren: ["Schiedsabrede (R10)."],
  stichwoerter: ["Gerichtsstand", "anwendbares Recht", "Vertragssprache", "Übersetzung"],
};

const Q6: Baustein = {
  id: "Q6", gruppe: "Q", label: "Ausschluss betrieblicher Übung", risiko: "gelb", version: 1,
  passt: "Für Firmen, die bei freiwilligen Leistungen Ansprüche aus Wiederholung vermeiden wollen.",
  fuer: ARBEITNEHMER,
  felder: [
    { id: "leistungen", label: "Freiwillige Leistungen, für die der Vorbehalt gilt", typ: "lang", pflicht: true, hinweis: "Nur Leistungen mit Freiwilligkeitsvorbehalt (D21), nie laufendes Entgelt." },
  ],
  text: (w, k) => [
    `(1) Für folgende Leistungen gilt der Freiwilligkeitsvorbehalt${"D21" in k.auswahl ? " nach der Regel zu freiwilligen Leistungen in diesem Vertrag" : " (Baustein D21)"}: ${w.leistungen?.trim() || "[Leistungen]"}. Auch eine wiederholte Zahlung begründet für diese Leistungen keinen Anspruch für die Zukunft, wenn der Arbeitgeber bei jeder Zahlung auf die Freiwilligkeit hinweist.`,
    "(2) Für laufendes Entgelt gilt dieser Absatz nicht.",
  ].join("\n"),
  labelEn: "Exclusion of company practice",
  textEn: (w, k) => [
    `(1) The reservation of voluntariness${"D21" in k.auswahl ? " under the provision on voluntary benefits in this contract" : " (clause D21)"} applies to the following benefits: ${frei(w.leistungen) || "[benefits]"}. Even repeated payment does not give rise to a claim to these benefits for the future, provided the Employer points out the voluntary nature with each payment.`,
    "(2) This paragraph does not apply to regular remuneration.",
  ].join("\n"),
  normen: ["§ 305b BGB", "§ 307 BGB"],
  quellen: ["https://www.gesetze-im-internet.de/bgb/__305b.html", "Katalog Abschnitt 4, Baustein Q6 und D21"],
  schutz: ["Nur mit Verweis auf den Freiwilligkeitsvorbehalt D21, kein pauschaler Ausschluss."],
  sperren: ["Pauschalklausel „aus wiederholter Zahlung entsteht kein Anspruch“ für laufendes Entgelt."],
  stichwoerter: ["betriebliche Übung", "Wiederholung", "freiwillige Leistung"],
};

const Q7: Baustein = {
  id: "Q7", gruppe: "Q", label: "Empfangsbestätigung für Unterlagen", risiko: "grün", version: 1,
  passt: "Für alle Verträge, wenn Unterlagen mit ausgehändigt werden.",
  fuer: MIT_AUSBILDUNG,
  felder: [
    { id: "unterlagen", label: "Ausgehändigte Unterlagen", typ: "mehrfach", optionen: ["Ausfertigung dieses Vertrags", "Stellenbeschreibung", "Richtlinien", "Datenschutzinformation", "Betriebsvereinbarungen"], standard: "Ausfertigung dieses Vertrags|Datenschutzinformation", pflicht: true },
  ],
  // Überschrift und Zeile für Ort, Datum und Unterschrift setzen Anlage und Layout (lib/vertragsbausteine/vertrag.ts, lib/dokumente/layout.ts, Prüfung 23.10.2026 A4.8).
  text: (w, k) => [
    `${k.vorname} bestätigt, folgende Unterlagen erhalten zu haben: ${liste(w.unterlagen).join(", ") || "[Unterlagen]"}.`,
    "Diese Bestätigung steht auf einer eigenen Seite und wird gesondert unterschrieben. Sie bestätigt nur den Erhalt, nicht das Verständnis oder die Richtigkeit des Inhalts.",
  ].join("\n"),
  labelEn: "Acknowledgement of receipt of documents",
  textEn: (w, k) => [
    `${k.vorname} confirms having received the following documents: ${enListe(w.unterlagen, UNTERLAGEN_EN).join(", ") || "[documents]"}.`,
    "This confirmation is on a separate page and is signed separately. It confirms receipt only, not understanding or the accuracy of the content.",
  ].join("\n"),
  normen: ["§ 309 Nr. 12 BGB", "§ 2 NachwG", "§ 3 NachwG"],
  quellen: ["https://www.gesetze-im-internet.de/bgb/__309.html", "https://www.gesetze-im-internet.de/nachwg/__2.html", "Katalog Abschnitt 4, Baustein Q7"],
  schutz: ["Eigene Seite mit eigener Unterschrift."],
  sperren: ["Bestätigung im Fließtext des Vertrags."],
  stichwoerter: ["Empfangsbestätigung", "erhalten", "Unterlagen", "Quittung"],
};

const Q8: Baustein = {
  id: "Q8", gruppe: "Q", label: "Mitteilung geänderter Personaldaten", risiko: "grün", version: 1,
  passt: "Für alle Verträge.",
  fuer: MIT_AUSBILDUNG,
  felder: [
    { id: "angaben", label: "Mitzuteilende Angaben", typ: "mehrfach", optionen: ["Anschrift", "Bankverbindung", "Name", "Staatsangehörigkeit und Aufenthaltstitel", "Lohnsteuermerkmale"], standard: "Anschrift|Bankverbindung|Name|Staatsangehörigkeit und Aufenthaltstitel|Lohnsteuermerkmale", pflicht: true },
  ],
  text: (w, k) => [
    `(1) ${k.vorname} teilt Änderungen folgender Angaben unverzüglich in Textform mit: ${liste(w.angaben).join(", ") || "[Angaben]"}.`,
    "(2) Angaben zur Gesundheit oder zur Familienplanung muss niemand mitteilen.",
  ].join("\n"),
  labelEn: "Notification of changed personal data",
  textEn: (w, k) => [
    `(1) ${k.vorname} notifies changes to the following details in text form without undue delay: ${enListe(w.angaben, ANGABEN_EN).join(", ") || "[details]"}.`,
    "(2) Nobody is required to disclose information on health or family planning.",
  ].join("\n"),
  normen: ["§ 241 Abs. 2 BGB", "Art. 5 DSGVO"],
  quellen: ["https://www.gesetze-im-internet.de/bgb/__241.html", "https://eur-lex.europa.eu/eli/reg/2016/679/oj", "Katalog Abschnitt 4, Baustein Q8"],
  schutz: ["Textform."],
  sperren: ["Mitteilung zur Gesundheit oder Familienplanung."],
  stichwoerter: ["Adresse", "Bankverbindung", "Umzug", "Namensänderung", "Personaldaten"],
};

/* ---------- S: Weitere Bausteine ---------- */

const S1: Baustein = {
  id: "S1", gruppe: "S", label: "Compliance, Geschenke, Interessenkonflikte", risiko: "grün", version: 1,
  passt: "Für Firmen mit Kundenkontakt, Einkauf oder Vertrieb.",
  fuer: OHNE_WS,
  felder: [
    { id: "wertgrenze", label: "Wertgrenze für Geschenke in Euro", typ: "betrag", min: 0 },
    { id: "kodex", label: "Verhaltenskodex als Anlage", typ: "janein", standard: "ja" },
  ],
  text: (w, k) => {
    const g = zahl(w.wertgrenze);
    return [
      `(1) ${k.vorname} nimmt im Zusammenhang mit der Arbeit keine Geschenke oder Vorteile an und gewährt keine${g !== null ? `, die über ${euro(g)} im Einzelfall hinausgehen` : ", die über übliche Gelegenheitsgeschenke hinausgehen"}.`,
      `(2) ${k.vorname} zeigt Interessenkonflikte und Beteiligungen an Geschäftspartnern in Textform an.`,
      ja(w.kodex) ? "(3) Der Verhaltenskodex des Arbeitgebers liegt als Anlage bei." : "",
    ].filter(Boolean).join("\n");
  },
  labelEn: "Compliance, gifts, conflicts of interest",
  textEn: (w, k) => {
    const g = zahl(w.wertgrenze);
    return [
      `(1) In connection with the work, ${k.vorname} neither accepts nor grants gifts or benefits${g !== null ? ` exceeding ${euroEn(g)} in the individual case` : " beyond customary occasional gifts"}.`,
      `(2) ${k.vorname} discloses conflicts of interest and holdings in business partners in text form.`,
      ja(w.kodex) ? "(3) The Employer's code of conduct is attached as an annex." : "",
    ].filter(Boolean).join("\n");
  },
  normen: ["§ 299 StGB", "§ 331 StGB", "§ 241 Abs. 2 BGB", "§ 87 Abs. 1 Nr. 1 BetrVG"],
  quellen: ["https://www.gesetze-im-internet.de/stgb/__299.html", "Katalog Abschnitt 4, Baustein S1"],
  schutz: ["Kodex als Anlage."],
  sperren: [],
  stichwoerter: ["Compliance", "Geschenke", "Interessenkonflikt", "Bestechung", "Kodex"],
};

const S2: Baustein = {
  id: "S2", gruppe: "S", label: "Alkohol, Drogen, Rauchen, Ordnung im Betrieb", risiko: "grün", version: 1,
  passt: "Für Produktion, Fahrdienst und Pflege.",
  fuer: OHNE_WS,
  felder: [
    { id: "regel", label: "Regel", typ: "auswahl", optionen: ["Verweis auf die Betriebsordnung", "kein Alkohol und keine Drogen während der Arbeit"], standard: "Verweis auf die Betriebsordnung", pflicht: true },
  ],
  text: (w, k) => w.regel === "kein Alkohol und keine Drogen während der Arbeit"
    ? `${k.vorname} tritt die Arbeit nicht unter dem Einfluss von Alkohol oder Drogen an und nimmt sie während der Arbeit nicht zu sich. Im Übrigen gilt die Betriebsordnung.`
    : `Für Alkohol, Drogen, Rauchen und die Ordnung im Betrieb gilt die Betriebsordnung in ihrer jeweiligen Fassung.`,
  labelEn: "Alcohol, drugs, smoking, workplace rules",
  textEn: (w, k) => w.regel === "kein Alkohol und keine Drogen während der Arbeit"
    ? `${k.vorname} does not start work under the influence of alcohol or drugs and does not consume them during work. Otherwise, the workplace rules apply.`
    : "The workplace rules as amended from time to time apply to alcohol, drugs, smoking and order in the workplace.",
  normen: ["DGUV Vorschrift 1", "§ 87 Abs. 1 Nr. 1 BetrVG"],
  quellen: ["https://www.gesetze-im-internet.de/betrvg/__87.html", "Katalog Abschnitt 4, Baustein S2"],
  schutz: ["Verweis auf Betriebsordnung, keine Strafen."],
  sperren: [],
  stichwoerter: ["Alkohol", "Drogen", "Rauchen", "Betriebsordnung"],
};

const S3: Baustein = {
  id: "S3", gruppe: "S", label: "Arbeitsschutz, Vorsorge, Unterweisung", risiko: "grün", version: 1,
  passt: "Für alle Arbeitsverhältnisse.",
  fuer: OHNE_WS,
  felder: [
    { id: "pflichtvorsorge", label: "Tätigkeit löst Pflichtvorsorge aus (Gefährdungsbeurteilung)", typ: "janein", standard: "nein" },
    { id: "ersthelfer", label: "Einsatz als Ersthelfer:in", typ: "janein", standard: "nein" },
  ],
  text: (w, k) => [
    `(1) ${k.vorname} nimmt an den Unterweisungen zum Arbeitsschutz teil, befolgt die Anweisungen zur Sicherheit und meldet Mängel und Gefahren unverzüglich (§§ 15, 16 ArbSchG).`,
    ja(w.pflichtvorsorge) ? `(2) Die Tätigkeit setzt eine arbeitsmedizinische Pflichtvorsorge voraus. ${k.vorname} nimmt an ihr teil. Der Arbeitgeber erhält nur die Bescheinigung über die Teilnahme, nicht das Ergebnis.` : "",
    ja(w.ersthelfer) ? `${k.vorname} wird nach Ausbildung als Ersthelfer:in eingesetzt; die Ausbildung zahlt der Arbeitgeber und sie findet in der Arbeitszeit statt.` : "",
  ].filter(Boolean).join("\n"),
  labelEn: "Occupational safety, health checks, instruction",
  textEn: (w, k) => [
    `(1) ${k.vorname} takes part in occupational safety instruction, follows the safety instructions and reports defects and hazards without undue delay (§§ 15, 16 ArbSchG).`,
    ja(w.pflichtvorsorge) ? `(2) The work requires mandatory occupational health checks (Pflichtvorsorge). ${k.vorname} takes part in them. The Employer receives only the certificate of attendance, not the result.` : "",
    ja(w.ersthelfer) ? `After training, ${k.vorname} is deployed as a first aider; the Employer pays for the training and it takes place during working time.` : "",
  ].filter(Boolean).join("\n"),
  normen: ["§ 12 ArbSchG", "§ 15 ArbSchG", "§ 16 ArbSchG", "ASiG", "ArbMedVV"],
  quellen: ["https://www.gesetze-im-internet.de/arbschg/__15.html", "https://www.gesetze-im-internet.de/arbmedvv/", "Katalog Abschnitt 4, Baustein S3"],
  schutz: ["Pflichtvorsorge nur, wenn die Tätigkeit sie auslöst.", "Ergebnis geht nicht an den Arbeitgeber."],
  sperren: [],
  stichwoerter: ["Arbeitsschutz", "Unterweisung", "Vorsorge", "Ersthelfer", "Betriebsarzt"],
};

const S4: Baustein = {
  id: "S4", gruppe: "S", label: "Dienstwohnung, Werkswohnung", risiko: "gelb", version: 1,
  passt: "Für Hausmeister, Pflege und Gastronomie mit Wohnung beim Arbeitgeber.",
  fuer: OHNE_WS,
  felder: [
    { id: "art", label: "Art", typ: "auswahl", optionen: ["Werkmietwohnung (eigener Mietvertrag)", "Werkdienstwohnung (Teil des Arbeitsverhältnisses)"], standard: "Werkmietwohnung (eigener Mietvertrag)", pflicht: true },
    { id: "wohnung", label: "Wohnung (Anschrift)", typ: "text", pflicht: true },
    { id: "sachbezug", label: "Sachbezugswert oder Miete je Monat in Euro", typ: "betrag", min: 0 },
  ],
  text: (w, k) => {
    const s = zahl(w.sachbezug);
    const miet = w.art?.startsWith("Werkmietwohnung");
    return [
      `(1) ${k.vorname} ${miet ? "mietet" : "nutzt"} die Wohnung ${w.wohnung || "[Anschrift]"}${miet ? " auf Grund eines eigenen Mietvertrags" : " als Teil des Arbeitsverhältnisses"}.${s !== null ? ` ${miet ? "Die Miete" : "Der Sachbezugswert"} beträgt ${euro(s)} im Monat.` : ""}`,
      `(2) Nach dem Ende des Arbeitsverhältnisses gelten für die Räumung die gesetzlichen Kündigungsfristen und der Mieterschutz (${miet ? "§ 576 BGB" : "§ 576b BGB"}).`,
    ].join("\n");
  },
  labelEn: "Company housing",
  textEn: (w, k) => {
    const s = zahl(w.sachbezug);
    const miet = w.art?.startsWith("Werkmietwohnung");
    return [
      `(1) ${k.vorname} ${miet ? "rents" : "uses"} the flat at ${w.wohnung || "[address]"}${miet ? " under a separate tenancy agreement" : " as part of the employment relationship"}.${s !== null ? ` ${miet ? "The rent" : "The non-cash benefit value"} is ${euroEn(s)} per month.` : ""}`,
      `(2) After the end of the employment relationship, the statutory notice periods and tenant protection apply to vacating the flat (${miet ? "§ 576 BGB" : "§ 576b BGB"}).`,
    ].join("\n");
  },
  normen: ["§ 576 BGB", "§ 576b BGB"],
  quellen: ["https://www.gesetze-im-internet.de/bgb/__576.html", "https://www.gesetze-im-internet.de/bgb/__576b.html", "Katalog Abschnitt 4, Baustein S4"],
  schutz: ["Arbeits- und Mietvertrag getrennt.", "Räumungsfristen nach Gesetz."],
  sperren: ["Räumung ohne Frist."],
  stichwoerter: ["Dienstwohnung", "Werkswohnung", "Wohnung", "Hausmeister"],
};

const AUFSTOCKUNG_STANDARD = "in gesetzlicher Höhe nach dem AltTZG";

const S5: Baustein = {
  id: "S5", gruppe: "S", label: "Altersteilzeit", risiko: "gelb", version: 1,
  passt: "Für Firmen mit Altersteilzeit als Übergang in den Ruhestand.",
  fuer: OHNE_WS,
  felder: [
    { id: "modell", label: "Modell", typ: "auswahl", optionen: ["Blockmodell", "kontinuierlich"], standard: "kontinuierlich", pflicht: true },
    { id: "beginn", label: "Beginn", typ: "datum", pflicht: true },
    { id: "ende", label: "Ende", typ: "datum", pflicht: true },
    { id: "aufstockung", label: "Aufstockung (Beschreibung)", typ: "text", standard: AUFSTOCKUNG_STANDARD },
  ],
  text: (w, k) => [
    `(1) ${k.vorname} arbeitet vom ${isISODate(w.beginn) ? formatDE(w.beginn) : "[Beginn]"} bis zum ${isISODate(w.ende) ? formatDE(w.ende) : "[Ende]"} in Altersteilzeit im ${w.modell === "Blockmodell" ? "Blockmodell (Arbeitsphase, dann Freistellungsphase)" : "kontinuierlichen Modell (gleichmäßig verringerte Arbeitszeit)"}.`,
    `(2) Der Arbeitgeber stockt das Entgelt ${w.aufstockung?.trim() || "in gesetzlicher Höhe nach dem AltTZG"} auf.`,
    "(3) Wertguthaben sind gegen Insolvenz des Arbeitgebers gesichert (§ 8a AltTZG). Der Arbeitgeber weist die Sicherung in Textform nach.",
  ].join("\n"),
  labelEn: "Partial retirement",
  textEn: (w, k) => {
    const auf = w.aufstockung?.trim();
    return [
      `(1) ${k.vorname} works in partial retirement (Altersteilzeit) from ${isISODate(w.beginn) ? datumEn(w.beginn) : "[start]"} to ${isISODate(w.ende) ? datumEn(w.ende) : "[end]"} under the ${w.modell === "Blockmodell" ? "block model (work phase, then release phase)" : "continuous model (evenly reduced working time)"}.`,
      `(2) The Employer tops up the pay ${!auf || auf === AUFSTOCKUNG_STANDARD ? "at the statutory rate under the AltTZG" : frei(auf)}.`,
      "(3) Value credits are protected against the insolvency of the Employer (§ 8a AltTZG). The Employer provides evidence of this protection in text form.",
    ].join("\n");
  },
  normen: ["AltTZG", "§ 8a AltTZG"],
  quellen: ["https://www.gesetze-im-internet.de/alttzg_1996/__8a.html", "Katalog Abschnitt 4, Baustein S5"],
  schutz: ["Insolvenzsicherung Pflicht und immer im Text."],
  sperren: ["Blockmodell ohne Insolvenzsicherung."],
  stichwoerter: ["Altersteilzeit", "Blockmodell", "Ruhestand", "Übergang"],
};

const S6: Baustein = {
  id: "S6", gruppe: "S", label: "Teilzeit, Aufstockung und Rückkehr zur Vollzeit", risiko: "grün", version: 1,
  passt: "Für Teilzeitbeschäftigte.",
  fuer: OHNE_WS,
  felder: [
    { id: "vorrang", label: "Hinweis auf Vorrang bei freien Stellen", typ: "janein", standard: "ja" },
  ],
  text: (w, k) => [
    ja(w.vorrang) ? `(1) Wünscht ${k.vorname} eine längere Arbeitszeit, berücksichtigt der Arbeitgeber das bei der Besetzung eines passenden freien Arbeitsplatzes bevorzugt (§ 9 TzBfG).` : "",
    `(2) Die gesetzlichen Rechte auf Verringerung der Arbeitszeit (§ 8 TzBfG) und auf Brückenteilzeit (§ 9a TzBfG) bleiben unberührt. ${k.vorname} teilt Wünsche zur Arbeitszeit in Textform mit.`,
  ].filter(Boolean).join("\n"),
  labelEn: "Part-time, increase in hours and return to full-time",
  textEn: (w, k) => [
    ja(w.vorrang) ? `(1) If ${k.vorname} wishes to work longer hours, the Employer gives preference to this when filling a suitable vacant position (§ 9 TzBfG).` : "",
    `(2) The statutory rights to reduce working time (§ 8 TzBfG) and to bridge part-time work (§ 9a TzBfG) remain unaffected. ${k.vorname} communicates wishes regarding working time in text form.`,
  ].filter(Boolean).join("\n"),
  normen: ["§ 8 TzBfG", "§ 9 TzBfG", "§ 9a TzBfG"],
  quellen: ["https://www.gesetze-im-internet.de/tzbfg/__9.html", "https://www.gesetze-im-internet.de/tzbfg/__9a.html", "Katalog Abschnitt 4, Baustein S6"],
  schutz: ["Hinweis auf gesetzliche Rechte, keine Einschränkung."],
  sperren: [],
  stichwoerter: ["Teilzeit", "Aufstockung", "Vollzeit", "Brückenteilzeit"],
};

export const BAUSTEINE_OPQS: Baustein[] = [O1, O2, O3, P1, P2, P3, P4, Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, S1, S2, S3, S4, S5, S6];
