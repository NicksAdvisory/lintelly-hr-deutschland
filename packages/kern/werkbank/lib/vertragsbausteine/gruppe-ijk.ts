/**
 * Vertragsbausteine der Gruppen I (Erfindungen und Arbeitsergebnisse), J (Datenschutz und IT) und K (Arbeitsmittel und Haftung).
 * Grundlage: Klauselkatalog 10.10.2026, Abschnitt 4 I bis K, Prüfregeln P-089 bis P-093 und Kombinationen K-31, K-36.
 * Kein Text hier ist Endwortlaut: Die Kanzlei gibt jede Bausteinversion frei. Alle Rechtszahlen kommen aus lib/regeln/werte.ts.
 */
import { WERTE, zahlwort } from "@/lib/regeln/werte";
import type { Baustein, Lage, Werte } from "./typen";
import { ARBEITNEHMER, MIT_AUSBILDUNG } from "./typen";
import { ergaenzungen } from "./allgemein";
import { euro, hat, ja, liste, regel, wenn, wert, zahl } from "./hilfen";
import { euroEn, frei, monateWortEn, zahlEn } from "@/lib/dokumente/englisch";

const KATALOG = (id: string) => `Katalog Abschnitt 4, Baustein ${id}`;
const GII = "https://www.gesetze-im-internet.de";
const ARBNERFG = `${GII}/arbnerfg`;
const v = (w: Werte, feld: string, standard = "") => (w[feld] ?? "").trim() || standard;
const monateDativ = (n: number) => (n === 1 ? "einem Monat" : `${zahlwort(n)} Monaten`);
const monateAkk = (n: number) => (n === 1 ? "einen Monat" : `${zahlwort(n)} Monate`);

/** I1: einzige zulässige Form einer Pauschale (P-089, K-31). Die anderen Optionen sind gesperrt und nur auswählbar, damit die Prüfung den Grund nennt. */
export const PAUSCHALE_SICHER = "nach Meldung, zusätzlich zur gesetzlichen Vergütung";
export const PAUSCHALE_VOR_MELDUNG = "im Vertrag vor der Meldung festgelegt, anstelle der gesetzlichen Vergütung";
export const PAUSCHALE_GEHALT = "mit dem Gehalt abgegolten";

/** P-090: Elemente, die der Text von I1 immer enthält. */
export const I1_PFLICHT = ["Meldung unverzüglich in Textform", "Inanspruchnahme durch Erklärung in Textform", "Vergütung nach § 9 ArbnErfG", "Geheimhaltung (§ 24)", "Fortgeltung nach Ende (§ 26)"];
/** P-091: Pflichtsatz in I4. */
export const SATZ_32A = "soweit nicht § 32a UrhG zwingend etwas anderes vorsieht";
/** P-092: Rolle mit Entwicklungsbezug. */
const ENTWICKLUNG = /entwickl|software|engineer|data|technik|developer|programm|informatik|devops|\bIT\b/i;

/** K-31: Klausel in einer freien Ergänzung, die Erfindervergütung abgilt oder ausschließt. */
const ERFINDUNG_ABGELTUNG = /(erfind|erfinder)[^.]{0,120}(abgegolten|verzicht|pauschal|keine vergütung|ohne vergütung|gehört dem arbeitgeber)/i;

/** J2: Kontrollstufen. */
const KONTROLLE_KEINE = "keine Kontrolle von Inhalten oder Verbindungsdaten";
const KONTROLLE_ANLASS = "Verbindungsdaten nur bei konkretem Verdacht, mit Beteiligung der Person";
const KONTROLLE_LAUFEND = "laufende Auswertung von Verbindungsdaten";
const KONTROLLE_TOTAL = "Einsicht in Inhalte und Verlauf jederzeit";

/** Englische Fassungen der Auswahlwerte in J4 und J6. */
const SICHERHEIT_EN: Record<string, string> = {
  "Verschlüsselung": "encryption",
  "Gerätesperre mit PIN oder Biometrie": "device lock with PIN or biometrics",
  "Verwaltung mit getrenntem Arbeitsbereich": "management with a separate work area",
};
const ZWECK_EN: Record<string, string> = {
  "Schutz vor Diebstahl und Verlust": "protection against theft and loss",
  "Fahrtenbuch": "logbook",
  "Einsatzplanung": "deployment planning",
  "Arbeitssicherheit bei Alleinarbeit": "occupational safety when working alone",
};

const kontrolleJ2 = (l: Lage) => wert(l, "J2", "kontrolle") || KONTROLLE_KEINE;

export const BAUSTEINE_IJK: Baustein[] = [
  // I1 Diensterfindungen
  {
    id: "I1", gruppe: "I", label: "Diensterfindungen", labelEn: "Service inventions", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Firmen mit technischer Entwicklung, Software mit Hardwarebezug, Produktion oder Labor.",
    felder: [
      { id: "meldestelle", label: "Stelle für Erfindungsmeldungen", typ: "text", pflicht: true, standard: "die Geschäftsführung", hinweis: "Person oder Abteilung, die Meldungen annimmt und den Eingang bestätigt." },
      { id: "pauschale", label: "Zusätzliche Erfinderprämie vereinbaren", typ: "janein", pflicht: true, standard: "nein", hinweis: "Nur zusätzlich zur gesetzlichen Vergütung. Eine Abgeltung im Gehalt oder eine feste Pauschale vor der Meldung ist unwirksam (§ 22 ArbnErfG)." },
      { id: "pauschaleZeitpunkt", label: "Art der Prämie", typ: "auswahl", pflicht: true, optionen: [PAUSCHALE_SICHER, PAUSCHALE_VOR_MELDUNG, PAUSCHALE_GEHALT], standard: PAUSCHALE_SICHER, bei: { pauschale: ["ja"] } },
      { id: "pauschaleBetrag", label: "Prämie je ordnungsgemäßer Meldung", typ: "betrag", pflicht: true, min: 0.01, bei: { pauschale: ["ja"] } },
    ],
    text: (w, k) => {
      const praemie = ja(w, "pauschale") && v(w, "pauschaleZeitpunkt", PAUSCHALE_SICHER) === PAUSCHALE_SICHER && zahl(w.pauschaleBetrag);
      const absaetze = [
        `(1) Für Erfindungen von ${k.vorname} gilt das Gesetz über Arbeitnehmererfindungen. Diensterfindungen sind patent- oder gebrauchsmusterfähige Erfindungen, die während des Arbeitsverhältnisses entstehen und aus der Tätigkeit im Betrieb hervorgehen oder maßgeblich auf dessen Erfahrungen oder Arbeiten beruhen (§ 4 ArbnErfG).`,
        `(2) ${k.vorname} meldet jede Diensterfindung unverzüglich gesondert in Textform an ${v(w, "meldestelle", "[Stelle]")} und kennzeichnet sie als Erfindungsmeldung. Die Meldung beschreibt die technische Aufgabe, ihre Lösung und das Zustandekommen der Erfindung und nennt Miterfinder (§ 5 ArbnErfG). Der Arbeitgeber bestätigt den Eingang unverzüglich in Textform. Verlangt er nicht binnen ${monateDativ(WERTE.erfindungBeanstandungMonate.wert)} nach Eingang eine Ergänzung, gilt die Meldung als ordnungsgemäß.`,
        `(3) Der Arbeitgeber kann die Diensterfindung durch Erklärung in Textform gegenüber ${k.vorname} in Anspruch nehmen oder freigeben. Gibt er sie nicht binnen ${monateDativ(WERTE.erfindungInanspruchnahmeMonate.wert)} nach Eingang der ordnungsgemäßen Meldung in Textform frei, gilt die Inanspruchnahme als erklärt (§ 6 ArbnErfG). Mit der Inanspruchnahme gehen alle vermögenswerten Rechte an der Diensterfindung auf den Arbeitgeber über (§ 7 ArbnErfG).`,
        `(4) Der Arbeitgeber meldet eine in Anspruch genommene Diensterfindung unverzüglich im Inland zur Erteilung eines Schutzrechts an, soweit das Gesetz keine Ausnahme vorsieht (§ 13 ArbnErfG). Im Ausland kann er sie anmelden; für Staaten, in denen er das nicht will, gibt er sie auf Verlangen frei (§ 14 ArbnErfG). Will er eine Anmeldung oder ein Schutzrecht aufgeben, teilt er das ${k.vorname} mit und überträgt das Recht auf Verlangen (§ 16 ArbnErfG).`,
        `(5) Für eine in Anspruch genommene Diensterfindung hat ${k.vorname} Anspruch auf eine angemessene Vergütung nach § 9 ArbnErfG. Sie richtet sich nach der wirtschaftlichen Verwertbarkeit, den Aufgaben und der Stellung im Betrieb und dem Anteil des Betriebs an der Erfindung; Grundlage sind die Richtlinien für die Vergütung von Arbeitnehmererfindungen im privaten Dienst (Vergütungsrichtlinien). Die Vergütung ist nicht mit dem Gehalt abgegolten.`,
        `(6) Art und Höhe der Vergütung werden durch Vereinbarung festgestellt. Eine Vereinbarung über die Höhe wird erst nach der Meldung der Diensterfindung geschlossen (§ 22 ArbnErfG). Kommt keine Vereinbarung zustande, setzt der Arbeitgeber die Vergütung durch begründete Erklärung in Textform fest, spätestens ${monateAkk(WERTE.erfindungFestsetzungMonate.wert)} nach Erteilung des Schutzrechts. ${k.vorname} kann der Festsetzung binnen ${monateDativ(WERTE.erfindungWiderspruchMonate.wert)} in Textform widersprechen (§ 12 ArbnErfG).`,
      ];
      if (praemie) absaetze.push(`(7) Zusätzlich zahlt der Arbeitgeber nach Eingang jeder ordnungsgemäßen Meldung einer Diensterfindung eine Prämie von ${euro(praemie)}. Die Prämie wird auf die Vergütung nach § 9 ArbnErfG nicht angerechnet.`);
      const n = absaetze.length;
      absaetze.push(
        `(${n + 1}) Vereinbarungen über Diensterfindungen, die in erheblichem Maße unbillig sind, sind unwirksam. Beide Seiten können sich darauf in Textform berufen, spätestens ${monateAkk(WERTE.erfindungUnbilligkeitMonate.wert)} nach Ende des Arbeitsverhältnisses (§ 23 ArbnErfG).`,
        `(${n + 2}) Beide Seiten halten eine gemeldete Diensterfindung geheim, solange berechtigte Belange der anderen Seite das erfordern; für eine frei gewordene Erfindung gilt das, soweit der Arbeitgeber berechtigte Belange hat (§ 24 ArbnErfG).`,
        `(${n + 3}) Die Rechte und Pflichten aus dem Gesetz über Arbeitnehmererfindungen bleiben nach Ende des Arbeitsverhältnisses bestehen (§ 26 ArbnErfG). Von den Vorschriften des Gesetzes wird nicht zu Ungunsten von ${k.vorname} abgewichen (§ 22 ArbnErfG).`,
      );
      return absaetze.join("\n");
    },
    textEn: (w, k) => {
      const praemie = ja(w, "pauschale") && v(w, "pauschaleZeitpunkt", PAUSCHALE_SICHER) === PAUSCHALE_SICHER && zahl(w.pauschaleBetrag);
      const stelle = frei(w.meldestelle) || "[office]";
      const absaetze = [
        `(1) The Employee Inventions Act (ArbnErfG) applies to inventions made by ${k.vorname}. Service inventions are inventions capable of protection by a patent or utility model that are made during the employment relationship and either arise from the work in the business or are based to a significant extent on its experience or work (§ 4 ArbnErfG).`,
        `(2) ${k.vorname} reports each service invention separately and without undue delay in text form to ${stelle} and marks it as an invention report. The report describes the technical problem, its solution and how the invention came about, and names any co-inventors (§ 5 ArbnErfG). The Employer confirms receipt in text form without undue delay. If the Employer does not request additions within ${monateWortEn(WERTE.erfindungBeanstandungMonate.wert)} of receipt, the report is deemed to be in proper form.`,
        `(3) The Employer may claim or release the service invention by a declaration in text form to ${k.vorname}. If the Employer does not release it in text form within ${monateWortEn(WERTE.erfindungInanspruchnahmeMonate.wert)} of receipt of the proper report, the claim is deemed to have been declared (§ 6 ArbnErfG). Upon the claim, all property rights in the service invention pass to the Employer (§ 7 ArbnErfG).`,
        `(4) The Employer applies for a protective right for a claimed service invention in Germany without undue delay, unless the Act provides an exception (§ 13 ArbnErfG). The Employer may apply abroad; for countries in which it does not wish to do so, it releases the invention on request (§ 14 ArbnErfG). If the Employer wishes to abandon an application or a protective right, it informs ${k.vorname} and transfers the right on request (§ 16 ArbnErfG).`,
        `(5) For a claimed service invention, ${k.vorname} is entitled to reasonable remuneration under § 9 ArbnErfG. It depends on the commercial usability, the duties and position in the business and the share of the business in the invention; it is based on the Guidelines for the Remuneration of Employee Inventions in Private Employment (Vergütungsrichtlinien). The remuneration is not covered by the salary.`,
        `(6) The type and amount of the remuneration are determined by agreement. An agreement on the amount is concluded only after the service invention has been reported (§ 22 ArbnErfG). If no agreement is reached, the Employer sets the remuneration by a reasoned declaration in text form, no later than ${monateWortEn(WERTE.erfindungFestsetzungMonate.wert)} after the protective right is granted. ${k.vorname} may object to this determination in text form within ${monateWortEn(WERTE.erfindungWiderspruchMonate.wert)} (§ 12 ArbnErfG).`,
      ];
      if (praemie) absaetze.push(`(7) In addition, the Employer pays a bonus of ${euroEn(praemie)} after receipt of each proper report of a service invention. The bonus is not set off against the remuneration under § 9 ArbnErfG.`);
      const n = absaetze.length;
      absaetze.push(
        `(${n + 1}) Agreements on service inventions that are unfair to a considerable extent are invalid. Either party may rely on this in text form, no later than ${monateWortEn(WERTE.erfindungUnbilligkeitMonate.wert)} after the end of the employment relationship (§ 23 ArbnErfG).`,
        `(${n + 2}) Both parties keep a reported service invention secret as long as the legitimate interests of the other party require this; for an invention that has become free, this applies insofar as the Employer has legitimate interests (§ 24 ArbnErfG).`,
        `(${n + 3}) The rights and obligations under the Employee Inventions Act continue after the end of the employment relationship (§ 26 ArbnErfG). The provisions of the Act are not departed from to the detriment of ${k.vorname} (§ 22 ArbnErfG).`,
      );
      return absaetze.join("\n");
    },
    normen: [
      "§§ 4, 5, 6, 7 ArbnErfG",
      "§ 9 ArbnErfG",
      "§ 12 ArbnErfG",
      "§§ 13, 14, 16 ArbnErfG",
      "§§ 22, 23, 24, 26 ArbnErfG",
      "Vergütungsrichtlinien für Arbeitnehmererfindungen im privaten Dienst",
    ],
    quellen: [`${ARBNERFG}/__5.html`, `${ARBNERFG}/__6.html`, `${ARBNERFG}/__9.html`, `${ARBNERFG}/__12.html`, `${ARBNERFG}/__22.html`, `${ARBNERFG}/__23.html`, `${GII}/arbnerfgrl/`, "https://www.dpma.de/patente/arbeitnehmererfindungen/", KATALOG("I1")],
    urteile: [{ az: "Linie zur Pauschalabgeltung der Erfindervergütung nur nach Meldung und in angemessener Höhe (Aktenzeichen prüfen)", kennung: "P" }],
    schutz: ["Gibt das Gesetz wieder und regelt Verfahren und optionale Prämie", "Pflicht: Meldung in Textform, Inanspruchnahme, Vergütung nach § 9, Geheimhaltung, Fortgeltung nach Ende", "Prämie nur zusätzlich zur gesetzlichen Vergütung"],
    sperren: ["„Erfindungen gehören dem Arbeitgeber, die Vergütung ist im Gehalt abgegolten“ (§ 22)", "Pauschalvergütung vor Meldung", "Verkürzung der Meldepflicht"],
    regeln: [
      regel("P-089", "sperre", "Diensterfindung: Pauschalvergütung vor Meldung oder Abgeltung im Gehalt", "§ 22 ArbnErfG", ["I1"], (l) => {
        if (!ja(l.auswahl.I1, "pauschale")) return null;
        const z = wert(l, "I1", "pauschaleZeitpunkt");
        if (z === PAUSCHALE_GEHALT) return "Erfindervergütung kann nicht mit dem Gehalt abgegolten werden. Das weicht vor der Meldung zu Lasten der Person vom Gesetz ab und ist unwirksam (§ 22 ArbnErfG). Sicher: Vergütung nach § 9 ArbnErfG, auf Wunsch zusätzlich eine Prämie nach Meldung.";
        if (z === PAUSCHALE_VOR_MELDUNG) return "Eine Pauschale anstelle der gesetzlichen Vergütung darf erst nach der Meldung vereinbart werden (§ 22 Satz 2 ArbnErfG). Sicher: Prämie nach Meldung, zusätzlich zur gesetzlichen Vergütung.";
        return null;
      }),
      regel("K-31", "sperre", "I1 mit Pauschalvergütung vor Meldung oder Verzicht auf Vergütung", "§ 22 ArbnErfG", ["I1"], (l) => {
        const f = ergaenzungen(l).find((x) => ERFINDUNG_ABGELTUNG.test(x.text));
        return f ? `In ${f.id}: Die Ergänzung schließt die Erfindervergütung aus oder gilt sie pauschal ab. Neben I1 ist das unwirksam (§ 22 ArbnErfG). Ergänzung streichen; die Vergütung richtet sich nach § 9 ArbnErfG.` : null;
      }),
      regel("P-090", "pflicht", "Diensterfindungen: Pflichtelemente im Text", "ArbnErfG", ["I1"],
        (l) => wenn(hat(l, "I1"), `Der Text von I1 enthält: ${I1_PFLICHT.join(", ")}.`)),
    ],
    stichwoerter: ["Erfindung", "Patent", "Gebrauchsmuster", "Erfindervergütung", "ArbnErfG", "Erfindungsmeldung", "Diensterfindung"],
  },
  // I2 Freie Erfindungen
  {
    id: "I2", gruppe: "I", label: "Freie Erfindungen: Mitteilung und Angebot", labelEn: "Free inventions: notification and offer", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Wie I1: Firmen mit technischer Entwicklung.",
    felder: [
      { id: "meldestelle", label: "Stelle für Mitteilungen", typ: "text", pflicht: true, standard: "die Geschäftsführung" },
    ],
    text: (w, k) => [
      `(1) Macht ${k.vorname} während des Arbeitsverhältnisses eine freie Erfindung, teilt ${k.vorname} sie unverzüglich in Textform ${v(w, "meldestelle", "dem Arbeitgeber")} mit. Die Mitteilung enthält so viel über die Erfindung und ihre Entstehung, dass der Arbeitgeber beurteilen kann, ob sie frei ist (§ 18 ArbnErfG). Die Pflicht entfällt, wenn die Erfindung offensichtlich im Arbeitsbereich des Betriebs nicht verwendbar ist.`,
      `(2) Bestreitet der Arbeitgeber nicht binnen ${monateDativ(WERTE.erfindungFreiMonate.wert)} nach Eingang der Mitteilung in Textform, dass die Erfindung frei ist, kann er sie nicht mehr als Diensterfindung in Anspruch nehmen.`,
      `(3) Fällt die freie Erfindung in den vorhandenen oder vorbereiteten Arbeitsbereich des Betriebs, bietet ${k.vorname} dem Arbeitgeber vor einer anderen Verwertung während des Arbeitsverhältnisses ein nicht ausschließliches Recht zur Benutzung zu angemessenen Bedingungen an. Nimmt der Arbeitgeber das Angebot nicht binnen ${monateDativ(WERTE.erfindungAnbietungMonate.wert)} an, erlischt sein Vorrecht (§ 19 ArbnErfG).`,
      `(4) Eine Pflicht, freie Erfindungen ohne Entgelt zu übertragen, besteht nicht.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) If ${k.vorname} makes a free invention during the employment relationship, ${k.vorname} notifies ${frei(w.meldestelle) || "the Employer"} of it in text form without undue delay. The notification contains enough information about the invention and how it came about for the Employer to judge whether it is free (§ 18 ArbnErfG). This obligation does not apply if the invention is obviously not usable in the field of work of the business.`,
      `(2) If the Employer does not dispute in text form within ${monateWortEn(WERTE.erfindungFreiMonate.wert)} of receipt of the notification that the invention is free, it can no longer claim it as a service invention.`,
      `(3) If the free invention falls within the existing or planned field of work of the business, ${k.vorname}, before using it otherwise during the employment relationship, offers the Employer a non-exclusive right of use on reasonable terms. If the Employer does not accept the offer within ${monateWortEn(WERTE.erfindungAnbietungMonate.wert)}, its priority right lapses (§ 19 ArbnErfG).`,
      `(4) There is no obligation to transfer free inventions without payment.`,
    ].join("\n"),
    normen: ["§ 4 Abs. 3 ArbnErfG", "§ 18 ArbnErfG", "§ 19 ArbnErfG"],
    quellen: [`${ARBNERFG}/__18.html`, `${ARBNERFG}/__19.html`, KATALOG("I2")],
    schutz: ["Fristen wie im Gesetz, aus dem Register"],
    sperren: ["Pflicht, freie Erfindungen ohne Entgelt zu übertragen"],
    stichwoerter: ["freie Erfindung", "Erfindung privat", "Anbietungspflicht", "Mitteilung"],
  },
  // I3 Verbesserungsvorschläge
  {
    id: "I3", gruppe: "I", label: "Technische Verbesserungsvorschläge", labelEn: "Technical improvement suggestions", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Produktion, Technik und Firmen mit Ideenmanagement.",
    felder: [
      { id: "stelle", label: "Zuständig für Vorschläge", typ: "text", pflicht: true, standard: "das Ideenmanagement" },
      { id: "praemie", label: "Prämie für einfache Vorschläge", typ: "auswahl", pflicht: true, optionen: ["einmalige Prämie nach Entscheidung im Einzelfall", "Anteil am Nutzen im ersten Jahr", "nach Betriebsvereinbarung"], standard: "einmalige Prämie nach Entscheidung im Einzelfall" },
    ],
    text: (w, k) => [
      `(1) ${k.vorname} kann technische Verbesserungsvorschläge an ${v(w, "stelle", "den Arbeitgeber")} richten. Der Eingang wird in Textform bestätigt.`,
      `(2) Qualifizierte Verbesserungsvorschläge, die dem Arbeitgeber eine ähnliche Vorzugsstellung wie ein Patent oder Gebrauchsmuster geben, vergütet der Arbeitgeber angemessen, sobald er sie verwertet (§ 20 Abs. 1 ArbnErfG). Für die Vergütung gelten § 9 und § 12 ArbnErfG entsprechend.`,
      `(3) Für einfache Verbesserungsvorschläge gilt: ${v(w, "praemie") === "nach Betriebsvereinbarung" ? "Prämien richten sich nach der Betriebsvereinbarung über das Vorschlagswesen." : v(w, "praemie").startsWith("Anteil") ? "Wird der Vorschlag umgesetzt, erhält " + k.vorname + " einen Anteil am nachweisbaren Nutzen im ersten Jahr nach der Umsetzung, den der Arbeitgeber in Textform mitteilt." : "Wird der Vorschlag umgesetzt, entscheidet der Arbeitgeber über eine einmalige Prämie und teilt die Entscheidung in Textform mit."} Tarifverträge und Betriebsvereinbarungen gehen vor (§ 20 Abs. 2 ArbnErfG).`,
      "(4) Eine Pflicht, qualifizierte Vorschläge ohne Vergütung abzutreten, besteht nicht.",
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${k.vorname} may submit technical improvement suggestions to ${frei(w.stelle) || "the Employer"}. Receipt is confirmed in text form.`,
      `(2) The Employer pays reasonable remuneration for qualified improvement suggestions that give the Employer a preferential position similar to that of a patent or utility model as soon as it uses them (§ 20 para. 1 ArbnErfG). § 9 and § 12 ArbnErfG apply accordingly to the remuneration.`,
      `(3) The following applies to simple improvement suggestions: ${v(w, "praemie") === "nach Betriebsvereinbarung" ? "Bonuses are governed by the works agreement (Betriebsvereinbarung) on the suggestion scheme." : v(w, "praemie").startsWith("Anteil") ? "If the suggestion is implemented, " + k.vorname + " receives a share of the demonstrable benefit in the first year after implementation, which the Employer notifies in text form." : "If the suggestion is implemented, the Employer decides on a one-off bonus and notifies the decision in text form."} Collective agreements and works agreements take precedence (§ 20 para. 2 ArbnErfG).`,
      "(4) There is no obligation to assign qualified suggestions without remuneration.",
    ].join("\n"),
    normen: ["§ 20 ArbnErfG", "§ 87 Abs. 1 Nr. 12 BetrVG"],
    quellen: [`${ARBNERFG}/__20.html`, `${GII}/betrvg/__87.html`, KATALOG("I3")],
    schutz: ["Unterscheidung qualifiziert und einfach", "Verweis auf Betriebsvereinbarung, falls vorhanden"],
    sperren: ["Pflicht zur kostenlosen Abtretung qualifizierter Vorschläge"],
    stichwoerter: ["Verbesserungsvorschlag", "Ideenmanagement", "Vorschlagswesen", "Prämie", "Idee"],
  },
  // I4 Urheber- und Nutzungsrechte
  {
    id: "I4", gruppe: "I", label: "Urheberrechte und Nutzungsrechte", labelEn: "Copyright and rights of use", risiko: "grün", fuer: ARBEITNEHMER, ersetzt: "§ 9",
    version: 2,
    passt: "Alle Arbeitsverträge; ersetzt den festen § 9.",
    felder: [
      { id: "umfang", label: "Umfang der Rechte", typ: "auswahl", pflicht: true, optionen: ["ausschließlich, zeitlich, räumlich und inhaltlich unbeschränkt", "einfach (nicht ausschließlich), zeitlich und räumlich unbeschränkt"], standard: "ausschließlich, zeitlich, räumlich und inhaltlich unbeschränkt" },
      { id: "weitergabe", label: "Übertragung an Dritte, insbesondere Kunden", typ: "janein", pflicht: true, standard: "ja" },
      { id: "bearbeitung", label: "Bearbeitung und Umgestaltung", typ: "janein", pflicht: true, standard: "ja" },
    ],
    text: (w, k) => [
      `(1) ${k.vorname} räumt dem Arbeitgeber an allen urheberrechtlich geschützten Werken und Leistungen, die ${k.vorname} in Erfüllung der Pflichten aus dem Arbeitsverhältnis schafft (§ 43 UrhG), ${v(w, "umfang").startsWith("einfach") ? "einfache, zeitlich und räumlich unbeschränkte" : "ausschließliche, zeitlich, räumlich und inhaltlich unbeschränkte"} Nutzungsrechte für alle bekannten Nutzungsarten ein.`,
      `(2) Die Nutzungsrechte umfassen ${[v(w, "bearbeitung") === "nein" ? "" : "das Recht zur Bearbeitung und Umgestaltung", v(w, "weitergabe") === "nein" ? "" : "das Recht, sie ganz oder teilweise auf Dritte, insbesondere Kunden, zu übertragen oder Dritten Rechte einzuräumen, ohne dass es einer weiteren Zustimmung bedarf"].filter(Boolean).join(" sowie ") || "die Nutzung im Betrieb des Arbeitgebers"}.`,
      `(3) Werke, die ${k.vorname} außerhalb der Arbeitspflicht und ohne Mittel des Arbeitgebers schafft, erfasst diese Regel nicht. Rechte für unbekannte Nutzungsarten (§ 31a UrhG) bedürfen einer gesonderten schriftlichen Vereinbarung; für eine solche Nutzung hat ${k.vorname} Anspruch auf eine gesonderte angemessene Vergütung (§ 32c UrhG).`,
      "(4) Die eingeräumten Rechte bleiben nach Ende des Arbeitsverhältnisses beim Arbeitgeber.",
      `(5) Die Einräumung ist mit der Vergütung abgegolten, ${SATZ_32A}. Steht die Vergütung in einem auffälligen Missverhältnis zu den Erträgen aus der Nutzung, kann ${k.vorname} eine weitere angemessene Beteiligung verlangen (§ 32a UrhG).`,
      `(6) Für Computerprogramme gilt § 69b UrhG.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${k.vorname} grants the Employer ${v(w, "umfang").startsWith("einfach") ? "non-exclusive rights of use, unlimited in time and territory," : "exclusive rights of use, unlimited in time, territory and content,"} for all known types of use in all works and performances protected by copyright that ${k.vorname} creates in performing the duties under the employment relationship (§ 43 UrhG).`,
      `(2) The rights of use include ${[v(w, "bearbeitung") === "nein" ? "" : "the right to edit and adapt the works", v(w, "weitergabe") === "nein" ? "" : "the right to transfer them in whole or in part to third parties, in particular customers, or to grant rights to third parties, without any further consent being required"].filter(Boolean).join(" as well as ") || "use in the business of the Employer"}.`,
      `(3) This provision does not cover works that ${k.vorname} creates outside the duty to work and without the resources of the Employer. Rights for unknown types of use (§ 31a UrhG) require a separate written agreement; for such use, ${k.vorname} is entitled to separate reasonable remuneration (§ 32c UrhG).`,
      "(4) The rights granted remain with the Employer after the end of the employment relationship.",
      `(5) The grant is covered by the remuneration, unless § 32a UrhG mandatorily provides otherwise. If the remuneration is conspicuously disproportionate to the income from the use, ${k.vorname} may demand further reasonable participation (§ 32a UrhG).`,
      `(6) § 69b UrhG applies to computer programs.`,
    ].join("\n"),
    normen: ["§ 43 UrhG", "§ 31 Abs. 5 UrhG", "§ 31a UrhG", "§ 32 UrhG", "§ 32a UrhG", "§ 32c UrhG"],
    quellen: [`${GII}/urhg/__43.html`, `${GII}/urhg/__31.html`, `${GII}/urhg/__31a.html`, `${GII}/urhg/__32a.html`, `${GII}/urhg/__32c.html`, KATALOG("I4")],
    schutz: ["Rechte nur an Werken, die in Erfüllung der Arbeitspflicht entstehen", "Pflichttext „soweit nicht § 32a UrhG zwingend etwas anderes vorsieht“", "Rechte bleiben nach Ende beim Arbeitgeber"],
    sperren: ["Rechteeinräumung für alle Werke, auch privat geschaffene"],
    regeln: [
      regel("P-091", "pflicht", "Nutzungsrechte: Satz zu § 32a UrhG", "§ 32a UrhG", ["I4"],
        (l) => wenn(hat(l, "I4"), "Ergänzt: Die Abgeltung der Nutzungsrechte gilt nur, soweit § 32a UrhG nichts anderes vorsieht; bei auffälligem Missverhältnis besteht Anspruch auf weitere Beteiligung.")),
    ],
    stichwoerter: ["Urheberrecht", "Nutzungsrechte", "Rechte an Arbeitsergebnissen", "Texte", "Design", "Fotos", "geistiges Eigentum"],
  },
  // I5 Software
  {
    id: "I5", gruppe: "I", label: "Software und Computerprogramme", labelEn: "Software and computer programs", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Entwicklung, Technik und Data Science.",
    felder: [
      { id: "openSource", label: "Einsatz von Open-Source-Komponenten", typ: "auswahl", pflicht: true, optionen: ["Freigabe vor dem Einsatz in Textform", "nur Komponenten aus der freigegebenen Liste (Anlage)"], standard: "Freigabe vor dem Einsatz in Textform" },
      { id: "dokumentation", label: "Pflicht zur Dokumentation", typ: "janein", pflicht: true, standard: "ja" },
      { id: "eigenprojekte", label: "Private Projekte", typ: "auswahl", pflicht: true, optionen: ["erlaubt, Anzeige in Textform bei Bezug zum Arbeitsgebiet", "erlaubt ohne Anzeige"], standard: "erlaubt, Anzeige in Textform bei Bezug zum Arbeitsgebiet" },
    ],
    text: (w, k) => [
      `(1) An Computerprogrammen, die ${k.vorname} in Wahrnehmung der Aufgaben oder nach Anweisung des Arbeitgebers schafft, ist ausschließlich der Arbeitgeber zur Ausübung aller vermögensrechtlichen Befugnisse berechtigt (§ 69b UrhG). Einer gesonderten Rechtseinräumung bedarf es nicht. Das gilt auch für Quellcode, Dokumentation und Entwurfsmaterial.`,
      `(2) Open-Source-Komponenten setzt ${k.vorname} ${v(w, "openSource").startsWith("nur") ? "nur aus der freigegebenen Liste in der Anlage ein" : "erst nach Freigabe des Arbeitgebers in Textform ein"} und beachtet deren Lizenzbedingungen.`,
      `(3) Quellcode wird in den Systemen des Arbeitgebers gespeichert.${v(w, "dokumentation") === "nein" ? "" : " Der Code wird so dokumentiert, dass andere ihn weiterführen können."}`,
      `(4) Programme, die ${k.vorname} außerhalb der Arbeitszeit, ohne Mittel und ohne Geschäftsgeheimnisse des Arbeitgebers und nicht in Wahrnehmung der Aufgaben schafft, stehen ${k.vorname} zu.${v(w, "eigenprojekte").startsWith("erlaubt, Anzeige") ? " Private Projekte mit Bezug zum Arbeitsgebiet zeigt " + k.vorname + " in Textform an." : ""}`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) The Employer alone is entitled to exercise all economic rights in computer programs that ${k.vorname} creates in performing their duties or on the instructions of the Employer (§ 69b UrhG). No separate grant of rights is required. This also applies to source code, documentation and design material.`,
      `(2) ${k.vorname} uses open source components ${v(w, "openSource").startsWith("nur") ? "only from the approved list in the annex" : "only after approval by the Employer in text form"} and complies with their licence terms.`,
      `(3) Source code is stored in the systems of the Employer.${v(w, "dokumentation") === "nein" ? "" : " The code is documented so that others can continue to work on it."}`,
      `(4) Programs that ${k.vorname} creates outside working hours, without the resources or trade secrets of the Employer and not in performing their duties belong to ${k.vorname}.${v(w, "eigenprojekte").startsWith("erlaubt, Anzeige") ? " " + k.vorname + " notifies private projects related to the field of work in text form." : ""}`,
    ].join("\n"),
    normen: ["§ 69b UrhG"],
    quellen: [`${GII}/urhg/__69b.html`, KATALOG("I5")],
    schutz: ["Erinnert, dass für Programme keine gesonderte Rechtseinräumung nötig ist", "Regelt nur Ausnahmen (Eigenprojekte)", "Open-Source-Regel als Pflicht"],
    sperren: ["Verbot jeder privaten Programmiertätigkeit"],
    regeln: [
      regel("P-092", "hinweis", "Software-Baustein bei Rolle ohne Entwicklungsbezug", "§ 69b UrhG", ["I5"],
        (l) => wenn(hat(l, "I5") && !ENTWICKLUNG.test(l.person.rolle), `Die Rolle „${l.person.rolle}“ hat keinen erkennbaren Bezug zur Softwareentwicklung. § 69b UrhG gilt nur für Programme, die in Wahrnehmung der Aufgaben entstehen. Prüfe, ob I4 genügt.`)),
    ],
    stichwoerter: ["Software", "Programm", "Quellcode", "Open Source", "Code", "Entwickler", "Nebenprojekt"],
  },
  // I6 Namensnennung und Portfolio
  {
    id: "I6", gruppe: "I", label: "Namensnennung, Bildnis und Portfolio", labelEn: "Attribution, likeness and portfolio", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Kreative und Beratende mit Referenzen.",
    felder: [
      { id: "nennung", label: "Nennung als Urheber:in", typ: "auswahl", pflicht: true, optionen: ["ja, bei Veröffentlichung", "nur auf Wunsch der Person", "nach Branchenübung"], standard: "ja, bei Veröffentlichung" },
      { id: "referenzArbeitgeber", label: "Arbeitgeber nennt Arbeiten als Referenz", typ: "janein", pflicht: true, standard: "ja" },
      { id: "portfolio", label: "Person darf Arbeiten im eigenen Portfolio zeigen", typ: "janein", pflicht: true, standard: "ja" },
    ],
    text: (w, k) => [
      `(1) ${v(w, "nennung").startsWith("nur") ? `${k.vorname} wird bei der Veröffentlichung eines Werks als Urheber:in genannt, wenn ${k.vorname} das wünscht.` : v(w, "nennung").startsWith("nach") ? `Ob ${k.vorname} als Urheber:in genannt wird, richtet sich nach der Übung der Branche. Das Recht auf Anerkennung der Urheberschaft (§ 13 UrhG) bleibt unberührt.` : `${k.vorname} wird bei der Veröffentlichung eines Werks als Urheber:in genannt, soweit das praktisch möglich ist.`}`,
      `(2) ${v(w, "referenzArbeitgeber") === "nein" ? "Der Arbeitgeber nennt Arbeiten von " + k.vorname + " nicht als Referenz." : "Der Arbeitgeber darf Arbeitsergebnisse als Referenz zeigen."} ${v(w, "portfolio") === "nein" ? "" : `${k.vorname} darf veröffentlichte Arbeitsergebnisse im eigenen Portfolio zeigen, ohne Geschäftsgeheimnisse und vertrauliche Kundendaten und mit Zustimmung des Kunden, wo sie nötig ist.`}`.trim(),
      `(3) Fotos, Videos und Tonaufnahmen von ${k.vorname} nutzt der Arbeitgeber nur mit gesonderter Einwilligung. Die Einwilligung ist freiwillig, nicht Teil dieses Vertrags und jederzeit für die Zukunft widerruflich. Eine Ablehnung hat keine Nachteile.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${v(w, "nennung").startsWith("nur") ? `${k.vorname} is named as author when a work is published if ${k.vorname} so wishes.` : v(w, "nennung").startsWith("nach") ? `Whether ${k.vorname} is named as author depends on industry practice. The right to recognition of authorship (§ 13 UrhG) remains unaffected.` : `${k.vorname} is named as author when a work is published, as far as this is practicable.`}`,
      `(2) ${v(w, "referenzArbeitgeber") === "nein" ? "The Employer does not name work by " + k.vorname + " as a reference." : "The Employer may show work results as references."} ${v(w, "portfolio") === "nein" ? "" : `${k.vorname} may show published work results in their own portfolio, without trade secrets and confidential customer data and with the consent of the customer where this is required.`}`.trim(),
      `(3) The Employer uses photos, videos and sound recordings of ${k.vorname} only with separate consent. Consent is voluntary, not part of this contract and may be withdrawn at any time with effect for the future. Refusal has no disadvantages.`,
    ].join("\n"),
    normen: ["§ 13 UrhG", "§§ 22, 23 KUG", "Art. 6 und 7 DSGVO", "§ 26 Abs. 2 BDSG"],
    quellen: [`${GII}/urhg/__13.html`, `${GII}/kunsturhg/__22.html`, "https://eur-lex.europa.eu/eli/reg/2016/679/oj", KATALOG("I6")],
    schutz: ["Einwilligung in Bildnisse nicht im Arbeitsvertrag, sondern gesondert und widerruflich"],
    sperren: ["Einwilligung als Vertragsbestandteil (Freiwilligkeit fehlt)"],
    stichwoerter: ["Portfolio", "Referenz", "Namensnennung", "Foto", "Bild", "Website", "Credits"],
  },
  // I7 Mitgebrachte Rechte
  {
    id: "I7", gruppe: "I", label: "Mitgebrachte Rechte und fremde Geschäftsgeheimnisse", labelEn: "Rights brought in and third-party trade secrets", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Bei Wechsel aus der Konkurrenz oder aus einem Umfeld mit Geheimnissen.",
    felder: [
      { id: "bestehendePflichten", label: "Bestehende Pflichten aus früheren Verträgen (optional)", typ: "lang", hinweis: "Zum Beispiel nachvertragliches Wettbewerbsverbot oder Geheimhaltung beim früheren Arbeitgeber." },
    ],
    text: (w, k) => [
      `(1) ${k.vorname} nutzt und bringt keine Geschäftsgeheimnisse früherer Arbeitgeber oder Dritter in die Arbeit ein und bringt keine Unterlagen oder Daten mit, die ${k.vorname} nicht verwenden darf. Rechte Dritter an Software, Texten und anderen Werken werden beachtet.`,
      `(2) ${v(w, "bestehendePflichten") ? `Bekannt sind folgende Pflichten aus früheren Verträgen: ${v(w, "bestehendePflichten")}. Der Arbeitgeber setzt ${k.vorname} so ein, dass diese Pflichten eingehalten werden können.` : `Pflichten aus früheren Verträgen, die die Tätigkeit beschränken, teilt ${k.vorname} dem Arbeitgeber vor Beginn mit.`}`,
      "(3) Für Pflichtverletzungen gelten die gesetzlichen Regeln einschließlich der Grundsätze zur Haftung im Arbeitsverhältnis. Eine Vertragsstrafe oder eine Übernahme von Ansprüchen früherer Arbeitgeber ist nicht vereinbart.",
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${k.vorname} does not use or bring into the work any trade secrets of former employers or third parties and does not bring any documents or data that ${k.vorname} is not permitted to use. Third-party rights in software, texts and other works are respected.`,
      `(2) ${v(w, "bestehendePflichten") ? `The following obligations from previous contracts are known: ${frei(w.bestehendePflichten)}. The Employer deploys ${k.vorname} in such a way that these obligations can be met.` : `${k.vorname} informs the Employer before starting work of any obligations from previous contracts that restrict the activity.`}`,
      "(3) Breaches of duty are governed by the statutory rules, including the principles of liability in the employment relationship. No contractual penalty and no assumption of claims of former employers is agreed.",
    ].join("\n"),
    normen: ["§§ 3, 4, 6 GeschGehG"],
    quellen: [`${GII}/geschgehg/__4.html`, `${GII}/geschgehg/__6.html`, KATALOG("I7")],
    schutz: ["Reine Pflicht zur Rücksicht, keine Vertragsstrafe"],
    sperren: ["Haftungsübernahme der Person für alle Ansprüche des früheren Arbeitgebers"],
    stichwoerter: ["früherer Arbeitgeber", "Konkurrenz", "Geschäftsgeheimnisse Dritter", "Wechsel", "Altlasten"],
  },
  // J1 Datenschutz
  {
    id: "J1", gruppe: "J", label: "Datenschutz und Information", labelEn: "Data protection and information", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Alle Arbeitsverträge (heute Teil von § 16).",
    felder: [
      { id: "ansprechpartner", label: "Ansprechperson für Datenschutz (optional)", typ: "text" },
    ],
    text: (w, k) => [
      `(1) Der Arbeitgeber verarbeitet personenbezogene Daten von ${k.vorname}, soweit sie für die Begründung, Durchführung und Beendigung des Arbeitsverhältnisses erforderlich sind (§ 26 BDSG, Art. 88 DSGVO).`,
      `(2) Die Informationen nach Art. 13 DSGVO erhält ${k.vorname} gesondert.${v(w, "ansprechpartner") ? ` Ansprechperson für Datenschutzfragen ist ${v(w, "ansprechpartner")}.` : ""}`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) The Employer processes personal data of ${k.vorname} insofar as this is necessary for establishing, performing and terminating the employment relationship (§ 26 BDSG, Art. 88 DSGVO).`,
      `(2) ${k.vorname} receives the information under Art. 13 DSGVO separately.${v(w, "ansprechpartner") ? ` The contact person for data protection matters is ${frei(w.ansprechpartner)}.` : ""}`,
    ].join("\n"),
    normen: ["§ 26 BDSG", "Art. 13 DSGVO", "Art. 88 DSGVO"],
    quellen: [`${GII}/bdsg_2018/__26.html`, "https://eur-lex.europa.eu/eli/reg/2016/679/oj", KATALOG("J1")],
    schutz: ["Informationen nach Art. 13 DSGVO gesondert"],
    sperren: [],
    stichwoerter: ["Datenschutz", "DSGVO", "personenbezogene Daten", "Datenschutzinformation"],
  },
  // J2 Private Nutzung erlaubt
  {
    id: "J2", gruppe: "J", label: "Private Nutzung von Internet und E-Mail erlaubt", labelEn: "Private use of internet and email permitted", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Firmen, die private Nutzung dulden oder gestatten.",
    felder: [
      { id: "umfang", label: "Umfang", typ: "auswahl", pflicht: true, optionen: ["nur in Pausen und außerhalb der Arbeitszeit", "in geringem Umfang, ohne die Arbeit zu beeinträchtigen"], standard: "nur in Pausen und außerhalb der Arbeitszeit" },
      { id: "kanal", label: "Private E-Mails", typ: "auswahl", pflicht: true, optionen: ["nur über private Konten oder Webmail, nicht über das dienstliche Postfach", "auch über das dienstliche Postfach"], standard: "nur über private Konten oder Webmail, nicht über das dienstliche Postfach", hinweis: "Empfehlung: getrennte Postfächer. Sonst greift das Fernmeldegeheimnis für das dienstliche Postfach." },
      { id: "kontrolle", label: "Kontrolle", typ: "auswahl", pflicht: true, optionen: [KONTROLLE_KEINE, KONTROLLE_ANLASS, KONTROLLE_LAUFEND, KONTROLLE_TOTAL], standard: KONTROLLE_KEINE },
      { id: "einwilligung", label: "Getrennte Einwilligung in die Kontrolle liegt vor", typ: "janein", pflicht: true, standard: "nein", bei: { kontrolle: [KONTROLLE_ANLASS, KONTROLLE_LAUFEND, KONTROLLE_TOTAL] } },
      { id: "vertretung", label: "Abwesenheit", typ: "auswahl", pflicht: true, optionen: ["Abwesenheitsnotiz mit Vertretung, keine Weiterleitung", "Weiterleitung dienstlicher E-Mails an die Vertretung"], standard: "Abwesenheitsnotiz mit Vertretung, keine Weiterleitung" },
    ],
    text: (w, k) => {
      const kontrolle = v(w, "kontrolle", KONTROLLE_KEINE);
      const kontrollText = kontrolle === KONTROLLE_KEINE
        ? "Der Arbeitgeber kontrolliert die private Nutzung nicht, weder Inhalte noch Verbindungsdaten."
        : kontrolle === KONTROLLE_ANLASS
          ? `Verbindungsdaten werden nur bei konkretem Verdacht auf eine Pflichtverletzung oder Straftat ausgewertet, verhältnismäßig und unter Beteiligung von ${k.vorname}. Inhalte privater Nachrichten werden nicht eingesehen.`
          : `Kontrollen erfolgen nur mit gesonderter, freiwilliger Einwilligung von ${k.vorname} und nur im Rahmen der Verhältnismäßigkeit. Inhalte privater Nachrichten werden nicht eingesehen. Kanzlei prüfen.`;
      return [
        `(1) ${k.vorname} darf Internet und E-Mail privat nutzen, ${v(w, "umfang").startsWith("in geringem") ? "in geringem Umfang, wenn die Arbeit nicht beeinträchtigt wird" : "in den Pausen und außerhalb der Arbeitszeit"}. ${v(w, "kanal").startsWith("auch") ? "Private E-Mails dürfen auch über das dienstliche Postfach laufen und werden in einem eigenen Ordner „Privat“ abgelegt." : "Private E-Mails laufen nur über private Konten oder Webmail, nicht über das dienstliche Postfach."}`,
        "(2) Verboten sind rechtswidrige, pornografische, gewaltverherrlichende und diskriminierende Inhalte, das Herunterladen von Software ohne Freigabe und jede Nutzung, die die Sicherheit der Systeme gefährdet.",
        `(3) ${kontrollText}`,
        `(4) ${v(w, "vertretung").startsWith("Weiterleitung") ? `Bei Abwesenheit werden dienstliche E-Mails an die Vertretung weitergeleitet; als privat erkennbare Nachrichten werden nicht geöffnet.` : "Bei Abwesenheit richtet " + k.vorname + " eine Abwesenheitsnotiz mit Vertretung ein. Das Postfach wird nicht weitergeleitet."}`,
        `(5) Private Daten löscht ${k.vorname} vor dem Ende des Arbeitsverhältnisses. Danach löscht der Arbeitgeber verbliebene private Daten, ohne sie einzusehen.`,
        "(6) Der Arbeitgeber kann die Erlaubnis aus sachlichem Grund mit einer Ankündigung von einem Monat für die Zukunft widerrufen.",
      ].join("\n");
    },
    textEn: (w, k) => {
      const kontrolle = v(w, "kontrolle", KONTROLLE_KEINE);
      const kontrollText = kontrolle === KONTROLLE_KEINE
        ? "The Employer does not monitor private use, neither content nor connection data."
        : kontrolle === KONTROLLE_ANLASS
          ? `Connection data are evaluated only where there is a specific suspicion of a breach of duty or a criminal offence, proportionately and with the involvement of ${k.vorname}. The content of private messages is not viewed.`
          : `Monitoring takes place only with the separate, voluntary consent of ${k.vorname} and only within the limits of proportionality. The content of private messages is not viewed. Law firm to review.`;
      return [
        `(1) ${k.vorname} may use the internet and email privately, ${v(w, "umfang").startsWith("in geringem") ? "to a small extent, provided that work is not impaired" : "during breaks and outside working hours"}. ${v(w, "kanal").startsWith("auch") ? "Private emails may also go through the work mailbox and are filed in a separate folder named “Private”." : "Private emails go only through private accounts or webmail, not through the work mailbox."}`,
        "(2) Unlawful, pornographic, violence-glorifying and discriminatory content, downloading software without approval and any use that endangers the security of the systems are prohibited.",
        `(3) ${kontrollText}`,
        `(4) ${v(w, "vertretung").startsWith("Weiterleitung") ? `During absence, work emails are forwarded to the deputy; messages recognisable as private are not opened.` : "During absence, " + k.vorname + " sets up an out-of-office notice naming a deputy. The mailbox is not forwarded."}`,
        `(5) ${k.vorname} deletes private data before the end of the employment relationship. After that, the Employer deletes any remaining private data without viewing it.`,
        "(6) The Employer may revoke this permission for the future for an objective reason with one month's notice.",
      ].join("\n");
    },
    normen: ["TDDDG (Fernmeldegeheimnis, Stand prüfen)", "§ 26 BDSG", "Art. 88 DSGVO", "§ 87 Abs. 1 Nr. 6 BetrVG"],
    quellen: [`${GII}/ttdsg/`, `${GII}/bdsg_2018/__26.html`, `${GII}/betrvg/__87.html`, KATALOG("J2")],
    schutz: ["Regeln zu Vertretung und Einsicht werden ergänzt", "Hinweis auf getrennte Einwilligung", "Empfehlung: getrennte Postfächer oder Webmail"],
    sperren: ["Erlaubnis kombiniert mit unbegrenzter Kontrolle des Postfachs"],
    regeln: [
      regel("P-093", "warnung", "Private Nutzung erlaubt und Kontrolle ohne Einwilligung oder Verhältnismäßigkeit", "TDDDG (Stand prüfen), § 26 BDSG", ["J2"], (l) => {
        const k = kontrolleJ2(l);
        if (k === KONTROLLE_KEINE) return null;
        const ohneEinwilligung = !ja(l.auswahl.J2, "einwilligung");
        const unverhaeltnis = k === KONTROLLE_LAUFEND || k === KONTROLLE_TOTAL;
        return wenn(ohneEinwilligung || unverhaeltnis, `Bei erlaubter Privatnutzung kann das Fernmeldegeheimnis gelten. ${ohneEinwilligung ? "Für die gewählte Kontrolle fehlt die gesonderte Einwilligung der Person. " : ""}${unverhaeltnis ? "Laufende Kontrolle ist ohne konkreten Anlass kaum verhältnismäßig. " : ""}Sicher: keine Kontrolle oder nur bei konkretem Verdacht mit Beteiligung der Person.`);
      }),
      regel("K-36", "warnung", "J2 (Privatnutzung erlaubt) mit Totalüberwachung", "Fernmeldegeheimnis, TDDDG (Stand prüfen), § 26 BDSG", ["J2"],
        (l) => wenn(hat(l, "J2") && kontrolleJ2(l) === KONTROLLE_TOTAL, "Privatnutzung erlaubt und zugleich jederzeitige Einsicht in Inhalte und Verlauf: Das verletzt bei erlaubter Privatnutzung das Fernmeldegeheimnis und ist unverhältnismäßig. Entweder Privatnutzung verbieten (J3) oder Kontrolle auf konkrete Verdachtsfälle beschränken.")),
    ],
    stichwoerter: ["private Nutzung", "Internet", "E-Mail privat", "Surfen", "Postfach", "Kontrolle"],
  },
  // J3 Private Nutzung verboten
  {
    id: "J3", gruppe: "J", label: "Private Nutzung von Internet und E-Mail verboten", labelEn: "Private use of internet and email prohibited", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Standard in vielen Firmen; heute Absatz 3 in „Datenschutz und Arbeitsmittel“.",
    felder: [
      { id: "notfall", label: "Ausnahme in Notfällen", typ: "janein", pflicht: true, standard: "ja" },
      { id: "kontrolle", label: "Kontrolle", typ: "auswahl", pflicht: true, optionen: ["nur bei konkretem Anlass, mit Beteiligung der Person", "stichprobenartig, vorher angekündigt, ohne Inhalte"], standard: "nur bei konkretem Anlass, mit Beteiligung der Person" },
    ],
    text: (w, k) => [
      `(1) Internet, E-Mail und andere Kommunikationsdienste des Arbeitgebers dienen nur dienstlichen Zwecken. Eine private Nutzung bedarf der vorherigen Zustimmung in Textform.${v(w, "notfall") === "nein" ? "" : " Kurze private Kommunikation in dringenden Fällen bleibt erlaubt."}`,
      `(2) ${v(w, "kontrolle").startsWith("stichproben") ? `Der Arbeitgeber kann die dienstliche Nutzung stichprobenartig und nach vorheriger Ankündigung kontrollieren, ohne Inhalte privater Nachrichten einzusehen.` : `Der Arbeitgeber kontrolliert die Nutzung nur bei konkretem Anlass, verhältnismäßig und unter Beteiligung von ${k.vorname}.`} Eine dauerhafte Überwachung findet nicht statt.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) Internet, email and other communication services of the Employer are for business purposes only. Private use requires prior consent in text form.${v(w, "notfall") === "nein" ? "" : " Brief private communication in urgent cases remains permitted."}`,
      `(2) ${v(w, "kontrolle").startsWith("stichproben") ? `The Employer may check business use on a random basis after prior notice, without viewing the content of private messages.` : `The Employer checks use only where there is a specific reason, proportionately and with the involvement of ${k.vorname}.`} There is no permanent monitoring.`,
    ].join("\n"),
    normen: ["§ 26 BDSG", "Art. 88 DSGVO"],
    quellen: [`${GII}/bdsg_2018/__26.html`, KATALOG("J3")],
    schutz: ["Kontrolle nur bei konkretem Anlass und mit Beteiligung der Betroffenen"],
    sperren: ["Dauerüberwachung"],
    stichwoerter: ["private Nutzung verboten", "Internetverbot", "dienstliche E-Mail", "Kontrolle"],
  },
  // J4 BYOD
  {
    id: "J4", gruppe: "J", label: "Private Geräte für die Arbeit (BYOD)", labelEn: "Private devices for work (BYOD)", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Firmen ohne eigene Geräte für alle.",
    felder: [
      { id: "sicherheit", label: "Sicherheitsstandard", typ: "mehrfach", pflicht: true, optionen: ["Verschlüsselung", "Gerätesperre mit PIN oder Biometrie", "Verwaltung mit getrenntem Arbeitsbereich"], standard: "Verschlüsselung|Gerätesperre mit PIN oder Biometrie|Verwaltung mit getrenntem Arbeitsbereich" },
      { id: "kosten", label: "Kostenerstattung", typ: "auswahl", pflicht: true, optionen: ["monatliche Pauschale", "Erstattung nach Nachweis"], standard: "monatliche Pauschale" },
      { id: "pauschale", label: "Monatliche Pauschale", typ: "betrag", pflicht: true, min: 0.01, bei: { kosten: ["monatliche Pauschale"] } },
    ],
    text: (w, k) => [
      `(1) ${k.vorname} kann freiwillig ein privates Gerät für die Arbeit nutzen. Eine Pflicht dazu besteht nicht.`,
      `(2) Auf dem Gerät gelten diese Sicherheitsvorgaben: ${(liste(w.sicherheit).length ? liste(w.sicherheit) : ["Verschlüsselung"]).join("; ")}. Dienstliche und private Daten werden getrennt gehalten.`,
      `(3) Der Arbeitgeber darf aus der Ferne nur dienstliche Daten im Arbeitsbereich löschen, nie das ganze Gerät. Auf private Daten greift er nicht zu.`,
      `(4) ${v(w, "kosten").startsWith("Erstattung") ? `Der Arbeitgeber erstattet die nachgewiesenen dienstlich veranlassten Kosten (§ 670 BGB).` : `Für die dienstliche Nutzung zahlt der Arbeitgeber eine Pauschale von ${euro(zahl(w.pauschale) ?? 0)} im Monat (§ 670 BGB).`}`,
      `(5) ${k.vorname} kann die Nutzung mit einer Ankündigung von einem Monat beenden. Bei Ende des Arbeitsverhältnisses oder der Nutzung werden dienstliche Daten gelöscht.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${k.vorname} may voluntarily use a private device for work. There is no obligation to do so.`,
      `(2) The following security requirements apply on the device: ${(liste(w.sicherheit).length ? liste(w.sicherheit) : ["Verschlüsselung"]).map((s) => SICHERHEIT_EN[s] ?? frei(s)).join("; ")}. Business and private data are kept separate.`,
      `(3) The Employer may remotely delete only business data in the work area, never the entire device. It does not access private data.`,
      `(4) ${v(w, "kosten").startsWith("Erstattung") ? `The Employer reimburses the proven costs incurred for business purposes (§ 670 BGB).` : `For business use, the Employer pays a flat rate of ${euroEn(zahl(w.pauschale) ?? 0)} per month (§ 670 BGB).`}`,
      `(5) ${k.vorname} may end the use with one month's notice. At the end of the employment relationship or of the use, business data are deleted.`,
    ].join("\n"),
    normen: ["Art. 32 DSGVO", "§ 670 BGB", "§ 87 Abs. 1 Nr. 6 BetrVG"],
    quellen: ["https://eur-lex.europa.eu/eli/reg/2016/679/oj", `${GII}/bgb/__670.html`, KATALOG("J4")],
    schutz: ["Kostenerstattung Pflicht (Pauschale oder Nachweis)", "Keine Gesamtlöschung des Geräts"],
    sperren: ["Nutzung privater Geräte ohne Kostenregel", "Totalzugriff auf das Gerät"],
    stichwoerter: ["BYOD", "privates Handy", "eigenes Gerät", "Smartphone", "Laptop privat"],
  },
  // J5 Vertraulichkeit Datenschutz
  {
    id: "J5", gruppe: "J", label: "Verpflichtung auf Vertraulichkeit und Datenschutzregeln", labelEn: "Commitment to confidentiality and data protection rules", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Alle, die personenbezogene Daten verarbeiten.",
    felder: [
      { id: "schulung", label: "Schulung bei Beginn und regelmäßig", typ: "janein", pflicht: true, standard: "ja" },
    ],
    text: (w, k) => [
      `(1) ${k.vorname} verarbeitet personenbezogene Daten nur auf Weisung des Arbeitgebers und nur, soweit es für die Aufgaben nötig ist (Art. 29 DSGVO, Art. 32 Abs. 4 DSGVO).`,
      `(2) ${k.vorname} behandelt personenbezogene Daten vertraulich. Diese Pflicht gilt auch nach Ende des Arbeitsverhältnisses.`,
      `(3) ${v(w, "schulung") === "nein" ? "" : "Der Arbeitgeber schult zu Beginn und danach regelmäßig zum Datenschutz. "}Für Verstöße haftet ${k.vorname} nur nach den gesetzlichen Regeln und den Grundsätzen zur Haftung im Arbeitsverhältnis.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${k.vorname} processes personal data only on the instructions of the Employer and only insofar as this is necessary for their duties (Art. 29 DSGVO, Art. 32 para. 4 DSGVO).`,
      `(2) ${k.vorname} treats personal data confidentially. This obligation continues after the end of the employment relationship.`,
      `(3) ${v(w, "schulung") === "nein" ? "" : "The Employer provides data protection training at the start and regularly thereafter. "}${k.vorname} is liable for breaches only under the statutory rules and the principles of liability in the employment relationship.`,
    ].join("\n"),
    normen: ["Art. 29 DSGVO", "Art. 32 Abs. 4 DSGVO"],
    quellen: ["https://eur-lex.europa.eu/eli/reg/2016/679/oj", KATALOG("J5")],
    schutz: ["Verpflichtung auf Weisungen und Vertraulichkeit, kein Datengeheimnis nach altem BDSG"],
    sperren: ["Haftung der Person für Verstöße ohne Verschulden"],
    stichwoerter: ["Vertraulichkeit", "Datenschutzverpflichtung", "Datengeheimnis", "Schulung Datenschutz"],
  },
  // J6 Ortung
  {
    id: "J6", gruppe: "J", label: "Ortung von Fahrzeugen und Geräten", labelEn: "Tracking of vehicles and devices", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Außendienst und Logistik.",
    felder: [
      { id: "zweck", label: "Zweck", typ: "mehrfach", pflicht: true, optionen: ["Schutz vor Diebstahl und Verlust", "Fahrtenbuch", "Einsatzplanung", "Arbeitssicherheit bei Alleinarbeit"], standard: "Schutz vor Diebstahl und Verlust" },
      { id: "umfang", label: "Umfang", typ: "auswahl", pflicht: true, optionen: ["nur bei Diebstahl oder Verlust", "nur während der Arbeitszeit, in der Freizeit abschaltbar"], standard: "nur bei Diebstahl oder Verlust" },
      { id: "speicherTage", label: "Speicherdauer der Standortdaten (Tage)", typ: "zahl", pflicht: true, min: 1, hinweis: "So kurz wie für den Zweck nötig. Kanzlei prüfen." },
      { id: "betriebsvereinbarung", label: "Betriebsvereinbarung vorhanden", typ: "janein", pflicht: true, standard: "nein" },
    ],
    text: (w, k) => {
      const tage = zahl(w.speicherTage) ?? 1;
      return [
        `(1) Fahrzeuge und Geräte, die ${k.vorname} nutzt, können geortet werden, ausschließlich zu diesen Zwecken: ${(liste(w.zweck).length ? liste(w.zweck) : ["Schutz vor Diebstahl und Verlust"]).join("; ")}.`,
        `(2) ${v(w, "umfang").startsWith("nur während") ? `Die Ortung läuft nur während der Arbeitszeit. ${k.vorname} kann sie in der Freizeit abschalten.` : "Die Ortung wird nur bei Diebstahl oder Verlust aktiviert."} Eine Leistungs- und Verhaltenskontrolle findet nicht statt.`,
        `(3) Standortdaten werden nach ${tage === 1 ? "einem Tag" : `${tage} Tagen`} gelöscht, soweit sie nicht für einen konkreten Vorfall gebraucht werden. ${k.vorname} kann Auskunft über die gespeicherten Daten verlangen.${v(w, "betriebsvereinbarung") === "ja" ? " Im Übrigen gilt die Betriebsvereinbarung." : ""}`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const tage = zahl(w.speicherTage) ?? 1;
      return [
        `(1) Vehicles and devices used by ${k.vorname} may be located, exclusively for these purposes: ${(liste(w.zweck).length ? liste(w.zweck) : ["Schutz vor Diebstahl und Verlust"]).map((s) => ZWECK_EN[s] ?? frei(s)).join("; ")}.`,
        `(2) ${v(w, "umfang").startsWith("nur während") ? `Tracking runs only during working hours. ${k.vorname} can switch it off during free time.` : "Tracking is activated only in the event of theft or loss."} There is no monitoring of performance or conduct.`,
        `(3) Location data are deleted after ${tage === 1 ? "one day" : `${zahlEn(tage)} days`}, unless they are needed for a specific incident. ${k.vorname} may request information about the stored data.${v(w, "betriebsvereinbarung") === "ja" ? " In all other respects, the works agreement (Betriebsvereinbarung) applies." : ""}`,
      ].join("\n");
    },
    normen: ["§ 26 BDSG", "Art. 15 DSGVO", "§ 87 Abs. 1 Nr. 6 BetrVG"],
    quellen: [`${GII}/bdsg_2018/__26.html`, `${GII}/betrvg/__87.html`, KATALOG("J6")],
    schutz: ["Zweckbindung", "Löschfrist im Text"],
    sperren: ["Dauerhafte Ortung bei erlaubter Privatnutzung"],
    stichwoerter: ["GPS", "Ortung", "Tracking", "Fahrzeug", "Standort", "Telematik"],
  },
  // K1 Rückgabe
  {
    id: "K1", gruppe: "K", label: "Rückgabe von Arbeitsmitteln", labelEn: "Return of work equipment", risiko: "grün", version: 2, fuer: MIT_AUSBILDUNG,
    passt: "Alle Verträge; heute Absatz 2 in „Datenschutz und Arbeitsmittel“.",
    felder: [
      { id: "anlage", label: "Liste der Arbeitsmittel als Anlage", typ: "janein", pflicht: true, standard: "ja" },
      { id: "zeitpunkt", label: "Rückgabe", typ: "auswahl", pflicht: true, optionen: ["bei Ende des Arbeitsverhältnisses", "bei Ende oder auf Verlangen bei Freistellung"], standard: "bei Ende oder auf Verlangen bei Freistellung" },
    ],
    text: (w, k) => [
      `(1) Arbeitsmittel, Zugangsdaten, Schlüssel und Unterlagen${v(w, "anlage") === "nein" ? "" : " nach der Liste in der Anlage"} bleiben Eigentum des Arbeitgebers. ${k.vorname} gibt sie ${v(w, "zeitpunkt").startsWith("bei Ende oder") ? "bei Ende des Arbeitsverhältnisses und auf Verlangen bei einer Freistellung" : "bei Ende des Arbeitsverhältnisses"} unaufgefordert zurück.`,
      `(2) Private Daten auf Geräten des Arbeitgebers löscht ${k.vorname} vor der Rückgabe. Dienstliche Daten auf privaten Geräten löscht ${k.vorname} bei Ende des Arbeitsverhältnisses vollständig und bestätigt auf Verlangen in Textform, dass alle Unterlagen zurückgegeben und diese Daten gelöscht sind.`,
      `(3) An Arbeitsmitteln des Arbeitgebers besteht kein Zurückbehaltungsrecht. Der Arbeitgeber behält wegen einer ausstehenden Rückgabe keine Vergütung ein.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) Work equipment, access data, keys and documents${v(w, "anlage") === "nein" ? "" : " as listed in the annex"} remain the property of the Employer. ${k.vorname} returns them without being asked ${v(w, "zeitpunkt").startsWith("bei Ende oder") ? "at the end of the employment relationship and, on request, during a release from work" : "at the end of the employment relationship"}.`,
      `(2) ${k.vorname} deletes private data on devices of the Employer before returning them. Work data on private devices is deleted completely by ${k.vorname} at the end of the employment relationship, and ${k.vorname} confirms in text form on request that all documents have been returned and this data has been deleted.`,
      `(3) There is no right of retention in respect of work equipment of the Employer. The Employer does not withhold any remuneration because of an outstanding return.`,
    ].join("\n"),
    normen: ["§ 985 BGB", "§ 273 BGB"],
    quellen: [`${GII}/bgb/__985.html`, `${GII}/bgb/__273.html`, KATALOG("K1")],
    schutz: ["Zurückbehaltungsrecht nur an Arbeitsmitteln ausgeschlossen, nicht am Gehalt"],
    sperren: ["Zurückbehaltung des Gehalts bis zur Rückgabe"],
    stichwoerter: ["Rückgabe", "Laptop zurück", "Schlüssel", "Arbeitsmittel", "Austritt"],
  },
  // K2 Arbeitskleidung
  {
    id: "K2", gruppe: "K", label: "Arbeitskleidung und Schutzausrüstung", labelEn: "Work clothing and protective equipment", risiko: "grün", version: 1, fuer: MIT_AUSBILDUNG,
    passt: "Handwerk, Produktion, Pflege und Gastronomie.",
    felder: [
      { id: "dienstkleidung", label: "Vorgeschriebene Dienstkleidung", typ: "janein", pflicht: true, standard: "nein" },
      { id: "reinigung", label: "Reinigung der Dienstkleidung", typ: "auswahl", pflicht: true, optionen: ["Arbeitgeber", "Person gegen Pflegepauschale"], standard: "Arbeitgeber", bei: { dienstkleidung: ["ja"] } },
      { id: "pflegepauschale", label: "Pflegepauschale im Monat", typ: "betrag", pflicht: true, min: 0.01, bei: { dienstkleidung: ["ja"], reinigung: ["Person gegen Pflegepauschale"] } },
    ],
    text: (w, k) => {
      return [
        "(1) Persönliche Schutzausrüstung stellt der Arbeitgeber kostenlos, hält sie instand und ersetzt sie. Die Kosten des Arbeitsschutzes trägt der Arbeitgeber (§ 3 Abs. 3 ArbSchG).",
        `(2) ${k.vorname} trägt die Schutzausrüstung bei den Tätigkeiten, für die sie vorgeschrieben ist, und meldet Mängel unverzüglich.`,
        ...(ja(w, "dienstkleidung")
          ? [`(3) Die vorgeschriebene Dienstkleidung stellt der Arbeitgeber. ${v(w, "reinigung").startsWith("Person") ? `${k.vorname} reinigt sie selbst und erhält dafür eine Pauschale von ${euro(zahl(w.pflegepauschale) ?? 0)} im Monat.` : "Der Arbeitgeber reinigt sie."}`]
          : []),
      ].join("\n");
    },
    textEn: (w, k) => {
      return [
        "(1) The Employer provides personal protective equipment free of charge, maintains it and replaces it. The Employer bears the costs of occupational safety and health (§ 3 para. 3 ArbSchG).",
        `(2) ${k.vorname} wears the protective equipment for the activities for which it is required and reports defects without undue delay.`,
        ...(ja(w, "dienstkleidung")
          ? [`(3) The Employer provides the required uniform. ${v(w, "reinigung").startsWith("Person") ? `${k.vorname} cleans it and receives a flat rate of ${euroEn(zahl(w.pflegepauschale) ?? 0)} per month for this.` : "The Employer cleans it."}`]
          : []),
      ].join("\n");
    },
    normen: ["§ 3 Abs. 3 ArbSchG", "PSA-Benutzungsverordnung"],
    quellen: [`${GII}/arbschg/__3.html`, `${GII}/psa-bv/`, KATALOG("K2")],
    schutz: ["Persönliche Schutzausrüstung stellt der Arbeitgeber kostenlos (R15)", "Dienstkleidung mit Pflegepauschale möglich"],
    sperren: ["Kosten der Schutzausrüstung auf die Person (R15)"],
    stichwoerter: ["Arbeitskleidung", "Schutzkleidung", "PSA", "Dienstkleidung", "Uniform", "Sicherheitsschuhe"],
  },
  // K3 Haftung
  {
    id: "K3", gruppe: "K", label: "Haftung und Schäden an Arbeitsmitteln", labelEn: "Liability and damage to work equipment", risiko: "grün", version: 1, fuer: MIT_AUSBILDUNG,
    passt: "Alle Verträge.",
    felder: [
      { id: "meldung", label: "Meldung von Schäden", typ: "auswahl", pflicht: true, optionen: ["unverzüglich in Textform", "unverzüglich mündlich und danach in Textform"], standard: "unverzüglich in Textform" },
    ],
    text: (w, k) => [
      `(1) ${k.vorname} meldet Schäden an Arbeitsmitteln und Schäden, die bei der Arbeit entstehen, ${v(w, "meldung", "unverzüglich in Textform")}.`,
      "(2) Für Schäden bei betrieblich veranlasster Tätigkeit gelten die Grundsätze des innerbetrieblichen Schadensausgleichs: Bei leichter Fahrlässigkeit besteht keine Haftung, bei mittlerer Fahrlässigkeit wird der Schaden nach den Umständen geteilt, bei grober Fahrlässigkeit und Vorsatz besteht in der Regel volle Haftung, im Einzelfall begrenzt.",
      "(3) Der Arbeitgeber trägt die Beweislast für eine Pflichtverletzung und das Verschulden (§ 619a BGB).",
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${k.vorname} reports damage to work equipment and damage occurring at work ${v(w, "meldung").includes("mündlich") ? "without undue delay orally and then in text form" : "without undue delay in text form"}.`,
      "(2) For damage caused in the course of work for the business, the principles of internal allocation of loss (innerbetrieblicher Schadensausgleich) apply: there is no liability for slight negligence, for medium negligence the loss is shared according to the circumstances, and for gross negligence and intent there is generally full liability, limited in individual cases.",
      "(3) The Employer bears the burden of proof for a breach of duty and for fault (§ 619a BGB).",
    ].join("\n"),
    normen: ["Grundsätze des innerbetrieblichen Schadensausgleichs", "§ 619a BGB"],
    quellen: [`${GII}/bgb/__619a.html`, KATALOG("K3")],
    urteile: [{ az: "BAG GS 1/89", kennung: "P" }],
    schutz: ["Gibt nur Meldepflicht und das geltende Recht wieder"],
    sperren: ["Haftung ohne Verschulden (R17)"],
    stichwoerter: ["Haftung", "Schaden", "kaputt", "Fahrlässigkeit", "Laptop beschädigt", "Dienstwagen Unfall"],
  },
  // K4 Mankoabrede
  {
    id: "K4", gruppe: "K", label: "Mankoabrede und Kassenführung", labelEn: "Shortfall agreement and cash handling", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Kasse oder Lager mit Warenbestand, auf den die Person allein zugreift.",
    felder: [
      { id: "bereich", label: "Kasse oder Bestand", typ: "text", pflicht: true, hinweis: "Nur ein Bereich, auf den die Person allein Zugriff hat." },
      { id: "mankogeld", label: "Mankogeld im Monat", typ: "betrag", pflicht: true, min: 0.01 },
      { id: "vorgaben", label: "Vorgaben für die Kassenführung (optional)", typ: "lang" },
    ],
    text: (w, k) => {
      const geld = zahl(w.mankogeld) ?? 0;
      return [
        `(1) ${k.vorname} führt ${v(w, "bereich", "[Kasse oder Bestand]")} und hat darauf allein Zugriff. ${k.vorname} erhält dafür ein Mankogeld von ${euro(geld)} im Monat zusätzlich zur Vergütung.`,
        `(2) Für Fehlbeträge in diesem Bereich haftet ${k.vorname} auch ohne Verschulden, aber nur bis zur Höhe des Mankogelds, das für den Zeitraum gezahlt wurde, in dem der Fehlbetrag entstanden ist. Darüber hinaus gelten die gesetzlichen Regeln und die Grundsätze zur Haftung im Arbeitsverhältnis.`,
        `(3) Die Haftung nach Absatz 2 entfällt für Zeiten, in denen andere Zugriff hatten.${v(w, "vorgaben") ? ` Für die Kassenführung gilt: ${v(w, "vorgaben")}.` : ""}`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const geld = zahl(w.mankogeld) ?? 0;
      return [
        `(1) ${k.vorname} manages ${frei(w.bereich) || "[cash desk or stock]"} and has sole access to it. For this, ${k.vorname} receives a shortfall allowance (Mankogeld) of ${euroEn(geld)} per month in addition to the remuneration.`,
        `(2) ${k.vorname} is liable for shortfalls in this area even without fault, but only up to the amount of the shortfall allowance paid for the period in which the shortfall arose. Beyond that, the statutory rules and the principles of liability in the employment relationship apply.`,
        `(3) Liability under paragraph 2 does not apply to periods in which others had access.${v(w, "vorgaben") ? ` The following applies to cash handling: ${frei(w.vorgaben)}.` : ""}`,
      ].join("\n");
    },
    normen: ["§ 619a BGB", "Grundsätze zur Mankohaftung"],
    quellen: [`${GII}/bgb/__619a.html`, KATALOG("K4")],
    urteile: [{ az: "BAG, Linie zur Mankoabrede mit Mankogeld bei alleinigem Zugriff (Aktenzeichen prüfen)", kennung: "P" }],
    schutz: ["Mankoabrede nur zusammen mit Mankogeld und Begrenzung auf dessen Höhe", "Nur bei alleinigem Zugriff"],
    sperren: ["Verschuldensunabhängige Haftung ohne Mankogeld (R17)"],
    stichwoerter: ["Manko", "Kassendifferenz", "Fehlbetrag", "Kasse", "Lager", "Mankogeld"],
  },
];
