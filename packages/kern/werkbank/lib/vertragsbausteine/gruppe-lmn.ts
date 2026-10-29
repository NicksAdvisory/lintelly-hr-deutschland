/**
 * Vertragsbausteine der Gruppen L (Fortbildung und Rückzahlung), M (Wettbewerbsverbote) und N (Vertragsstrafe)
 * nach dem Klauselkatalog 10.10.2026, Abschnitt 4. Prüfregeln P-070 bis P-088 und Sperrkombinationen K-12 bis K-21.
 * Kein Text hier ist Endwortlaut: Die Kanzlei gibt jede Bausteinversion frei. Alle Rechtszahlen kommen aus lib/regeln/werte.ts.
 */
import { WERTE, monateText, monateTextDativ } from "@/lib/regeln/werte";
import { compare, formatDE, isISODate } from "@/lib/regeln/datum";
import type { Baustein, Feld, Lage, Werte } from "./typen";
import { ARBEITNEHMER, OHNE_WS } from "./typen";
import { anzahlEn, datumEn, euroEn, frei, zahlEn } from "@/lib/dokumente/englisch";
import { anteil, euro, hat, leer, liste, minderjaehrig, num, regel, wenn, wert, zahl, zahlText } from "./hilfen";

// kein-recht: Kalenderrechnung, ein Monat zählt für das Tagesentgelt mit dreißig Tagen
const TAGE_JE_MONAT = 30;

/** Berufsausbildung: Vertragsart oder Beschäftigungsart (§ 12 BBiG). */
const azubi = (l: Lage) => l.art === "ausbildung" || l.person.beschaeftigung === "azubi";
const ergaenzung = (l: Lage, id: string) => wert(l, id, "ergaenzung");
const ja = (s: string | undefined) => (s ?? "").trim().toLowerCase() === "ja";

/** Höchste zulässige Bindung je Dauer der Fortbildung in Monaten (Faustformel aus WERTE.fortbildungBindung). */
export function hoechstBindung(dauerMonate: number): number {
  const s = WERTE.fortbildungBindung.staffel;
  return (s.find((x) => x.bisMonate === null || dauerMonate <= x.bisMonate) ?? s[s.length - 1]).bindungMonate;
}

/** Entgelt je Kalendertag aus dem Monatsfixum. */
const tagesentgelt = (gehalt: number) => gehalt / TAGE_JE_MONAT;

/** Höchstbetrag einer Vertragsstrafe: Entgelt für die Dauer der Kündigungsfrist. */
export const hoechstStrafe = (gehalt: number, fristTage: number) => tagesentgelt(gehalt) * fristTage;

/** Karenzentschädigung: Rechenbasis aus Fixum, variablem Durchschnitt und Sachbezügen, vereinbarter und gesetzlicher Mindestbetrag. */
export function karenz(gehalt: number, w: Werte | undefined) {
  const basis = gehalt + (zahl(w?.variabel) ?? 0) + (zahl(w?.sachbezuege) ?? 0);
  const a = anteil(w?.entschaedigung);
  return { basis, a, mindest: basis * WERTE.karenzMindestAnteil.wert, betrag: a === null ? null : basis * a };
}

const MINDEST_PROZENT = WERTE.karenzMindestAnteil.wert * 100;

/* ---------- L: Fortbildung, Studienförderung, Rückzahlung ---------- */

const ART_MARKTWERT = "Fortbildung mit Wert auf dem Arbeitsmarkt";
const KOSTEN_GEHALT = "Vergütung während der Freistellung";
const STAFFEL_MONATLICH = "monatlich anteilig";

const ausnahmenText = (vorname: string) =>
  `Eine Rückzahlung entfällt in jedem Fall, wenn das Arbeitsverhältnis endet durch eine Kündigung des Arbeitgebers aus betriebs- oder personenbedingten Gründen, durch eine Kündigung von ${vorname} aus Gründen, die in der Sphäre des Arbeitgebers liegen, wegen dauerhafter, unverschuldeter Arbeitsunfähigkeit oder Erwerbsminderung oder mit dem Eintritt in den Ruhestand. Während Mutterschutz und Elternzeit ruht die Bindung; sie verlängert sich um diese Zeit, eine Rückzahlung wird in dieser Zeit nicht fällig.`;

const monateEn = (n: number) => anzahlEn(n, "month", "months");

const ausnahmenTextEn = (vorname: string) =>
  `There is no repayment in any case if the employment relationship ends through dismissal by the Employer for operational or personal reasons, through resignation by ${vorname} for reasons within the Employer's sphere, because of permanent incapacity for work through no fault of the Employee or reduced earning capacity, or upon retirement. During maternity protection and parental leave the commitment period is suspended; it is extended by that time, and no repayment falls due during that time.`;

const KOSTENARTEN_EN: Record<string, string> = {
  "Lehrgangs- und Prüfungsgebühren": "course and examination fees",
  Reisekosten: "travel costs",
  Unterkunft: "accommodation",
  Lernmaterial: "learning materials",
};
const GRUENDE_EN: Record<string, string> = {
  "Eigenkündigung der Person": "resignation by the Employee",
  "verhaltensbedingte Kündigung durch den Arbeitgeber": "dismissal by the Employer for reasons of conduct",
  "Abbruch der Maßnahme durch die Person": "discontinuation of the measure by the Employee",
};

/** Felder für L2 und L3 (Fortbildungs- und Studienvereinbarung je Maßnahme). */
const fortbildungFelder = (dauerLabel: string): Feld[] => [
  { id: "titel", label: "Maßnahme (Titel)", typ: "text", pflicht: true },
  { id: "anbieter", label: "Anbieter", typ: "text", pflicht: true },
  { id: "art", label: "Art der Maßnahme", typ: "auswahl", optionen: [ART_MARKTWERT, "Pflichtfortbildung (Gesetz, Tarifvertrag, Betriebsvereinbarung)", "betriebsinterne Einarbeitung"], standard: ART_MARKTWERT, pflicht: true, hinweis: "Pflichtfortbildung und Einarbeitung trägt immer der Arbeitgeber (§ 111 GewO). Dafür gibt es keine Rückzahlung." },
  { id: "dauerMonate", label: dauerLabel, typ: "zahl", pflicht: true, min: 0, hinweis: "Wochen in Monate umrechnen (eine Woche ist etwa ein Viertel Monat). Aus der Dauer rechnet Lintelly die höchste zulässige Bindung." },
  { id: "kosten", label: "Kosten in Euro (Gesamtbetrag oder Obergrenze)", typ: "betrag", min: 0, hinweis: "Eine Zahl, kein Verweis auf „alle Kosten“." },
  { id: "kostenarten", label: "Erfasste Kostenarten", typ: "mehrfach", optionen: ["Lehrgangs- und Prüfungsgebühren", "Reisekosten", "Unterkunft", "Lernmaterial", KOSTEN_GEHALT], standard: "Lehrgangs- und Prüfungsgebühren", pflicht: true, hinweis: "Die Vergütung während der Freistellung darf nicht zurückgefordert werden." },
  { id: "freistellung", label: "Bezahlte Freistellung für die Maßnahme", typ: "janein", standard: "ja", pflicht: true },
  { id: "bindungMonate", label: "Bindungsdauer in Monaten ab Ende der Maßnahme", typ: "zahl", pflicht: true, min: 1, max: WERTE.fortbildungBindung.staffel[WERTE.fortbildungBindung.staffel.length - 1].bindungMonate },
  { id: "staffel", label: "Staffelung der Rückzahlung", typ: "auswahl", optionen: [STAFFEL_MONATLICH, "keine Staffel"], standard: STAFFEL_MONATLICH, pflicht: true },
  { id: "gruende", label: "Rückzahlungsgründe", typ: "mehrfach", optionen: ["Eigenkündigung der Person", "verhaltensbedingte Kündigung durch den Arbeitgeber", "Abbruch der Maßnahme durch die Person"], standard: "Eigenkündigung der Person|verhaltensbedingte Kündigung durch den Arbeitgeber|Abbruch der Maßnahme durch die Person", pflicht: true, hinweis: "Die Ausnahmen (Kündigung des Arbeitgebers aus anderen Gründen, Gründe beim Arbeitgeber, dauerhafte Krankheit, Erwerbsminderung, Ruhestand) stehen immer im Text." },
  { id: "faelligkeit", label: "Fälligkeit", typ: "auswahl", optionen: ["mit Ende des Arbeitsverhältnisses", "in Monatsraten"], standard: "in Monatsraten", pflicht: true },
  { id: "raten", label: "Anzahl der Monatsraten", typ: "zahl", min: 1, bei: { faelligkeit: ["in Monatsraten"] } },
  { id: "vereinbartAm", label: "Vereinbart am (Textform)", typ: "datum", pflicht: true, hinweis: "Die Vereinbarung muss vor Beginn der Maßnahme in Textform vorliegen." },
  { id: "beginn", label: "Beginn der Maßnahme", typ: "datum", pflicht: true },
];

function fortbildungTextEn(w: Werte, vorname: string, zusatz: string[]): string {
  const kosten = zahl(w.kosten);
  const arten = liste(w.kostenarten).filter((x) => x !== KOSTEN_GEHALT).map((x) => KOSTENARTEN_EN[x] ?? frei(x));
  const bindung = zahl(w.bindungMonate) ?? 0;
  const gruende = liste(w.gruende).map((x) => GRUENDE_EN[x] ?? frei(x));
  const raten = zahl(w.raten);
  const faellig = w.faelligkeit === "in Monatsraten" ? `in ${raten ? `${zahlEn(raten)} equal` : "equal"} monthly instalments, starting with the month after the end of the employment relationship` : "upon the end of the employment relationship";
  const beginn = isISODate(w.beginn) ? datumEn(w.beginn) : "[start date]";
  const vereinbart = isISODate(w.vereinbartAm) ? datumEn(w.vereinbartAm) : "[date]";
  return [
    `(1) ${vorname} takes part in the training measure “${frei(w.titel) || "[title]"}” provided by ${w.anbieter?.trim() || "[provider]"}. It begins on ${beginn}. This agreement was concluded in text form on ${vereinbart}, before the measure began.`,
    `(2) The Employer bears the costs of ${arten.length ? arten.join(", ") : "the measure"} up to a maximum of ${kosten !== null ? euroEn(kosten) : "[amount]"}. ${w.freistellung === "nein" ? "No release from work has been agreed." : `${vorname} is released from work with continued pay to take part.`} Pay during the release from work is never part of a repayment.`,
    ...zusatz,
    `(3) If the employment relationship ends within ${monateEn(bindung)} after the end of the measure${gruende.length ? ` through ${gruende.join(" or ")}` : ""}, ${vorname} repays the costs actually incurred under paragraph 2 on a pro rata basis. The repayment amount is reduced by 1/${zahlEn(bindung || 1)} for each full month of employment after the end of the measure.`,
    `(4) ${ausnahmenTextEn(vorname)}`,
    `(5) The repayment amount is due ${faellig}.`,
  ].join("\n");
}

function fortbildungText(w: Werte, vorname: string, zusatz: string[]): string {
  const kosten = zahl(w.kosten);
  const arten = liste(w.kostenarten).filter((x) => x !== KOSTEN_GEHALT);
  const bindung = zahl(w.bindungMonate) ?? 0;
  const gruende = liste(w.gruende);
  const raten = zahl(w.raten);
  const faellig = w.faelligkeit === "in Monatsraten" ? `in ${raten ? `${zahlText(raten)} gleichen` : "gleichen"} Monatsraten, beginnend mit dem Monat nach dem Ende des Arbeitsverhältnisses` : "mit dem Ende des Arbeitsverhältnisses";
  const beginn = isISODate(w.beginn) ? formatDE(w.beginn) : "[Beginn]";
  const vereinbart = isISODate(w.vereinbartAm) ? formatDE(w.vereinbartAm) : "[Datum]";
  return [
    `(1) ${vorname} nimmt an der Maßnahme „${w.titel || "[Titel]"}“ bei ${w.anbieter || "[Anbieter]"} teil. Sie beginnt am ${beginn}. Diese Vereinbarung wurde am ${vereinbart} in Textform vor Beginn der Maßnahme geschlossen.`,
    `(2) Der Arbeitgeber trägt die Kosten für ${arten.length ? arten.join(", ") : "die Maßnahme"} bis höchstens ${kosten !== null ? euro(kosten) : "[Betrag]"}. ${w.freistellung === "nein" ? "Eine Freistellung ist nicht vereinbart." : "Für die Teilnahme wird " + vorname + " unter Fortzahlung der Vergütung freigestellt."} Die Vergütung während der Freistellung ist nie Teil einer Rückzahlung.`,
    ...zusatz,
    `(3) Endet das Arbeitsverhältnis innerhalb von ${monateTextDativ(bindung)} nach Ende der Maßnahme ${gruende.length ? `durch ${gruende.join(" oder ")}` : ""}, zahlt ${vorname} die tatsächlich angefallenen Kosten nach Absatz 2 anteilig zurück. Der Rückzahlungsbetrag mindert sich für jeden vollen Monat der Beschäftigung nach Ende der Maßnahme um 1/${zahlText(bindung || 1)}.`,
    `(4) ${ausnahmenText(vorname)}`,
    `(5) Der Rückzahlungsbetrag ist ${faellig} fällig.`,
  ].join("\n");
}

const L1: Baustein = {
  id: "L1", gruppe: "L", label: "Fortbildung und Freistellung", risiko: "grün", version: 1,
  passt: "Für alle Beschäftigten, die einen Anspruch auf Fortbildung oder ein Budget dafür bekommen.",
  fuer: [...OHNE_WS, "ausbildung"],
  felder: [
    { id: "budget", label: "Fortbildungsbudget je Kalenderjahr in Euro", typ: "betrag", min: 0 },
    { id: "tage", label: "Freistellungstage je Kalenderjahr", typ: "zahl", min: 0 },
    { id: "genehmigung", label: "Auswahl der Maßnahmen", typ: "auswahl", optionen: ["in Abstimmung mit der Führungskraft", "nach Genehmigung durch den Arbeitgeber"], standard: "in Abstimmung mit der Führungskraft", pflicht: true },
    { id: "nachweis", label: "Teilnahmenachweis vorlegen", typ: "janein", standard: "ja" },
  ],
  text: (w, k) => {
    const budget = zahl(w.budget);
    const tage = zahl(w.tage);
    return [
      `(1) ${k.vorname} kann sich ${w.genehmigung === "nach Genehmigung durch den Arbeitgeber" ? "nach Genehmigung durch den Arbeitgeber" : "in Abstimmung mit der Führungskraft"} beruflich fortbilden.${budget ? ` Dafür stehen je Kalenderjahr bis zu ${euro(budget)} zur Verfügung.` : ""}${tage ? ` Für die Teilnahme wird ${k.vorname} an bis zu ${zahlText(tage)} Arbeitstagen je Kalenderjahr unter Fortzahlung der Vergütung freigestellt.` : ""}`,
      "(2) Fortbildungen, die der Arbeitgeber aufgrund eines Gesetzes, einer Verordnung, eines Tarifvertrags oder einer Betriebsvereinbarung anbieten muss, sind für die Person kostenfrei und finden in der Arbeitszeit statt; ist das nicht möglich, gilt die Zeit als Arbeitszeit (§ 111 GewO).",
      ja(w.nachweis) ? `(3) ${k.vorname} legt nach der Teilnahme einen Nachweis vor.` : "",
      "Eine Pflicht zur Rückzahlung von Fortbildungskosten entsteht nur durch eine eigene Vereinbarung je Maßnahme.",
    ].filter(Boolean).join("\n");
  },
  labelEn: "Training and release from work",
  textEn: (w, k) => {
    const budget = zahl(w.budget);
    const tage = zahl(w.tage);
    return [
      `(1) ${k.vorname} may undertake professional training ${w.genehmigung === "nach Genehmigung durch den Arbeitgeber" ? "subject to approval by the Employer" : "in consultation with their line manager"}.${budget ? ` Up to ${euroEn(budget)} per calendar year is available for this.` : ""}${tage ? ` ${k.vorname} is released from work with continued pay on up to ${zahlEn(tage)} working days per calendar year to take part.` : ""}`,
      "(2) Training that the Employer must offer under a statute, a regulation, a collective agreement or a works agreement is free of charge for the Employee and takes place during working time; where this is not possible, the time counts as working time (§ 111 GewO).",
      ja(w.nachweis) ? `(3) ${k.vorname} provides proof of attendance after taking part.` : "",
      "An obligation to repay training costs arises only from a separate agreement for each measure.",
    ].filter(Boolean).join("\n");
  },
  normen: ["§ 111 GewO", "§ 2 Abs. 1 Satz 2 Nr. 12 NachwG"],
  quellen: ["https://www.gesetze-im-internet.de/gewo/__111.html", "https://www.gesetze-im-internet.de/nachwg/__2.html", "Katalog Abschnitt 4, Baustein L1"],
  schutz: ["Pflichtfortbildung ist immer kostenfrei und in der Arbeitszeit."],
  sperren: ["Kostenabwälzung für Pflichtfortbildung (R15)."],
  stichwoerter: ["Fortbildung", "Weiterbildung", "Schulung", "Budget", "Seminar", "Freistellung"],
};

const L2: Baustein = {
  id: "L2", gruppe: "L", label: "Rückzahlung von Fortbildungskosten", risiko: "gelb", version: 1,
  passt: "Für Fortbildungen mit Wert auf dem Arbeitsmarkt (Zertifikat, Weiterbildung), nie für Pflichtfortbildung oder Einarbeitung.",
  fuer: OHNE_WS,
  felder: fortbildungFelder("Dauer der Maßnahme in Monaten"),
  text: (w, k) => fortbildungText(w, k.vorname, []),
  labelEn: "Repayment of training costs",
  textEn: (w, k) => fortbildungTextEn(w, k.vorname, []),
  normen: ["§ 307 BGB", "Art. 12 GG", "§ 111 GewO", "§ 12 BBiG"],
  quellen: ["https://www.gesetze-im-internet.de/bgb/__307.html", "https://www.gesetze-im-internet.de/gewo/__111.html", "https://www.gesetze-im-internet.de/bbig_2005/__12.html", "Katalog Abschnitt 4, Baustein L2"],
  urteile: [{ az: "BAG 3 AZR 900/07", kennung: "P" }, { az: "BAG 9 AZR 260/21", kennung: "V" }],
  schutz: [
    "Höchste Bindung aus der Dauer der Maßnahme nach der Faustformel, längere Eingaben sind gesperrt.",
    "Rückzahlung monatlich gestaffelt.",
    "Ausnahmenkatalog steht immer im Text und ist nicht abwählbar.",
    "Kosten als Zahl oder Obergrenze in Euro, nie die Vergütung während der Freistellung.",
    "Freistellung bezahlt.",
    "Vereinbarung in Textform vor Beginn der Maßnahme, je Maßnahme.",
    "Keine Rückzahlung bei Pflichtfortbildung, Einarbeitung oder Ausbildung.",
    "Keine Vertragsstrafe für denselben Sachverhalt.",
  ],
  sperren: ["Bindung über der Faustformel", "Rückzahlung ohne Staffel", "Rückzahlung „aller Kosten“ ohne Zahl", "Rückzahlung bei betriebs- oder personenbedingter Kündigung des Arbeitgebers", "Rückzahlung in der Berufsausbildung (R5)"],
  stichwoerter: ["Rückzahlungsklausel", "Fortbildungskosten", "Bindung", "Zertifikat", "Weiterbildung zurückzahlen"],
  regeln: [
    regel("P-070", "sperre", "Bindungsdauer über der Faustformel zur Dauer der Fortbildung", "§ 307 BGB, BAG 3 AZR 900/07 (Aktenzeichen prüfen)", ["L2", "L3"], (l) => {
      for (const id of ["L2", "L3"].filter((x) => hat(l, x))) {
        const dauer = num(l, id, "dauerMonate");
        const bindung = num(l, id, "bindungMonate");
        if (dauer === null || bindung === null) continue;
        const max = hoechstBindung(dauer);
        if (bindung > max) return `${id}: Bei einer Maßnahme von ${zahlText(dauer)} Monaten Dauer sind höchstens ${monateText(max)} Bindung zulässig, eingegeben sind ${monateText(bindung)}. Sicher: Bindung auf ${monateText(max)} setzen. Eine zu lange Bindung macht die ganze Klausel unwirksam.`;
      }
      return null;
    }),
    regel("P-071", "sperre", "Rückzahlung ohne monatliche Staffelung", "§ 307 BGB", ["L2", "L3"], (l) => {
      const id = ["L2", "L3"].find((x) => hat(l, x) && wert(l, x, "staffel") !== STAFFEL_MONATLICH);
      return id ? `${id}: Der Rückzahlungsbetrag muss mit jedem Monat der Bindung gleichmäßig sinken. Wähle „${STAFFEL_MONATLICH}“.` : null;
    }),
    regel("P-072", "pflicht", "Ausnahmenkatalog vollständig und nicht abwählbar", "§ 307 BGB, BAG 9 AZR 260/21", ["L2", "L3"],
      (l) => wenn(hat(l, "L2") || hat(l, "L3"), "Der Ausnahmenkatalog steht im Text: keine Rückzahlung bei Kündigung des Arbeitgebers aus betriebs- oder personenbedingten Gründen, bei Gründen in der Sphäre des Arbeitgebers, bei dauerhafter unverschuldeter Arbeitsunfähigkeit, Erwerbsminderung und Ruhestand.")),
    regel("P-073", "sperre", "Kosten nicht beziffert", "§ 307 Abs. 1 Satz 2 BGB (Transparenz)", ["L2", "L3"], (l) => {
      const id = ["L2", "L3"].find((x) => hat(l, x) && !((num(l, x, "kosten") ?? 0) > 0));
      return id ? `${id}: Die Kosten brauchen einen Betrag oder eine Obergrenze in Euro. Ein Verweis auf „alle Kosten“ ist intransparent und macht die Klausel unwirksam.` : null;
    }),
    regel("P-074", "sperre", "Rückzahlung bei Pflichtfortbildung, Einarbeitung oder Ausbildung", "§ 111 GewO, § 12 BBiG", ["L2", "L3"], (l) => {
      const id = ["L2", "L3"].find((x) => hat(l, x));
      if (!id) return null;
      if (azubi(l)) return `${id}: Im Berufsausbildungsverhältnis ist eine Rückzahlung von Ausbildungskosten nichtig (§ 12 BBiG). Eine Fortbildung nach der Ausbildung braucht eine eigene Vereinbarung.`;
      const art = wert(l, id, "art");
      return wenn(!!art && art !== ART_MARKTWERT, `${id}: Für „${art}“ trägt der Arbeitgeber die Kosten (§ 111 GewO). Eine Rückzahlung ist nur bei Fortbildungen mit Wert auf dem Arbeitsmarkt möglich.`);
    }),
    regel("P-075", "sperre", "Rückzahlung der Vergütung während der Freistellung", "§ 307 BGB (Linie BAG, Aktenzeichen prüfen)", ["L2", "L3"], (l) => {
      const id = ["L2", "L3"].find((x) => hat(l, x) && liste(wert(l, x, "kostenarten")).includes(KOSTEN_GEHALT));
      return id ? `${id}: Die Vergütung während der Freistellung darf nicht zurückgefordert werden. Nur Gebühren, Reise, Unterkunft und Material.` : null;
    }),
    regel("P-076", "sperre", "Vereinbarung nicht in Textform vor Beginn der Maßnahme", "§ 307 Abs. 1 Satz 2 BGB (Transparenz)", ["L2", "L3"], (l) => {
      const id = ["L2", "L3"].find((x) => {
        const v = wert(l, x, "vereinbartAm");
        const b = wert(l, x, "beginn");
        return hat(l, x) && isISODate(v) && isISODate(b) && compare(v, b) >= 0;
      });
      return id ? `${id}: Die Vereinbarung muss vor Beginn der Maßnahme in Textform vorliegen (vereinbart am ${formatDE(wert(l, id, "vereinbartAm"))}, Beginn ${formatDE(wert(l, id, "beginn"))}). Eine nachträgliche Rückzahlungspflicht ist unwirksam.` : null;
    }),
    regel("K-19", "sperre", "L2 mit Bindung über der Faustformel, ohne Staffelung oder ohne Ausnahmenkatalog", "§ 307 BGB, BAG 9 AZR 260/21", ["L2"], (l) => {
      const dauer = num(l, "L2", "dauerMonate");
      const bindung = num(l, "L2", "bindungMonate");
      const zuLang = dauer !== null && bindung !== null && bindung > hoechstBindung(dauer);
      const ohneStaffel = wert(l, "L2", "staffel") !== STAFFEL_MONATLICH;
      return wenn(hat(l, "L2") && (zuLang || ohneStaffel), `L2 ist in dieser Form unwirksam: ${[zuLang ? "Bindung über der Faustformel" : "", ohneStaffel ? "keine monatliche Staffelung" : ""].filter(Boolean).join(", ")}. Eine Teilunwirksamkeit wird nicht auf das zulässige Maß reduziert, die ganze Klausel entfällt.`);
    }),
    regel("K-20", "sperre", "L2 für Pflichtfortbildung", "§ 111 GewO", ["L2"],
      (l) => wenn(hat(l, "L2") && wert(l, "L2", "art").startsWith("Pflichtfortbildung"), "Pflichtfortbildung aus Gesetz, Tarifvertrag oder Betriebsvereinbarung ist kostenfrei. Nimm Baustein L1 statt L2.")),
    regel("K-21", "sperre", "L2 und N1 für denselben Sachverhalt", "§ 307 BGB (Doppelsicherung)", ["L2", "N1"],
      (l) => wenn(hat(l, "L2") && hat(l, "N1") && liste(wert(l, "N1", "verstoesse")).includes(N1_FORTBILDUNG), `Das Ausscheiden während der Fortbildungsbindung ist schon durch die Rückzahlung in L2 gesichert. Nimm „${N1_FORTBILDUNG}“ aus den Verstößen in N1 heraus.`)),
  ],
};

const L3: Baustein = {
  id: "L3", gruppe: "L", label: "Studienförderung und Weiterbildungsstudium", risiko: "gelb", version: 1,
  passt: "Für berufsbegleitende Studiengänge und MBA, die der Arbeitgeber fördert.",
  fuer: OHNE_WS,
  felder: [
    ...fortbildungFelder("Dauer des Studiums in Monaten"),
    { id: "studientage", label: "Freistellungstage je Semester", typ: "zahl", min: 0 },
    { id: "pruefungstage", label: "Freistellung für Prüfungen", typ: "janein", standard: "ja" },
    { id: "erfolg", label: "Förderung nur bei Bestehen", typ: "janein", standard: "nein", hinweis: "Eine Förderung, die erst nach dem Studienerfolg gezahlt wird, ist keine Rückzahlungsklausel." },
  ],
  text: (w, k) => {
    const tage = zahl(w.studientage);
    const zusatz = [
      tage ? `Für Präsenzzeiten wird ${k.vorname} an bis zu ${zahlText(tage)} Arbeitstagen je Semester bezahlt freigestellt.` : "",
      ja(w.pruefungstage) ? `Für Prüfungen wird ${k.vorname} am Prüfungstag bezahlt freigestellt.` : "",
      ja(w.erfolg) ? "Die Förderung wird nach dem erfolgreichen Abschluss gezahlt." : "",
    ].filter(Boolean);
    return fortbildungText(w, k.vorname, zusatz.length ? [zusatz.join(" ")] : []);
  },
  labelEn: "Study funding and part-time degree",
  textEn: (w, k) => {
    const tage = zahl(w.studientage);
    const zusatz = [
      tage ? `${k.vorname} is released from work with pay on up to ${zahlEn(tage)} working days per semester for attendance periods.` : "",
      ja(w.pruefungstage) ? `${k.vorname} is released from work with pay on the day of each examination.` : "",
      ja(w.erfolg) ? "The funding is paid after successful completion." : "",
    ].filter(Boolean);
    return fortbildungTextEn(w, k.vorname, zusatz.length ? [zusatz.join(" ")] : []);
  },
  normen: ["§ 307 BGB", "Art. 12 GG", "§ 111 GewO"],
  quellen: ["https://www.gesetze-im-internet.de/bgb/__307.html", "Katalog Abschnitt 4, Baustein L3"],
  urteile: [{ az: "BAG 3 AZR 900/07", kennung: "P" }, { az: "BAG 9 AZR 260/21", kennung: "V" }],
  schutz: ["Wie L2: Bindung nach Faustformel, monatliche Staffel, fester Ausnahmenkatalog, bezifferte Kosten, Vereinbarung vor Beginn."],
  sperren: ["Wie L2."],
  stichwoerter: ["Studium", "MBA", "berufsbegleitend", "Studienförderung", "Bachelor", "Master"],
};

const L4: Baustein = {
  id: "L4", gruppe: "L", label: "Rückzahlung von Umzugskosten", risiko: "gelb", version: 1,
  passt: "Für Fachkräfte, die der Arbeitgeber für den Standort gewinnt und deren Umzug er bezahlt.",
  fuer: OHNE_WS,
  felder: [
    { id: "kosten", label: "Erstattete Umzugskosten in Euro (Betrag oder Obergrenze)", typ: "betrag", pflicht: true, min: 0 },
    { id: "bindungMonate", label: "Bindung in Monaten", typ: "zahl", pflicht: true, min: 1, max: WERTE.bindungRueckzahlungMaxMonate.wert, hinweis: "Sicherer Standard ist ein Jahr." },
  ],
  text: (w, k) => {
    const b = zahl(w.bindungMonate) ?? 0;
    const kosten = zahl(w.kosten);
    return [
      `(1) Der Arbeitgeber erstattet ${k.vorname} die Kosten des Umzugs an den Arbeitsort bis höchstens ${kosten !== null ? euro(kosten) : "[Betrag]"}.`,
      `(2) Endet das Arbeitsverhältnis innerhalb von ${monateTextDativ(b)} nach dem Umzug durch Eigenkündigung von ${k.vorname} oder durch eine verhaltensbedingte Kündigung des Arbeitgebers, zahlt ${k.vorname} die Erstattung anteilig zurück. Der Betrag mindert sich für jeden vollen Monat der Beschäftigung nach dem Umzug um 1/${zahlText(b || 1)}.`,
      `(3) ${ausnahmenText(k.vorname)}`,
      "(4) Die steuerliche Behandlung der Erstattung richtet sich nach dem Gesetz.",
    ].join("\n");
  },
  labelEn: "Repayment of relocation costs",
  textEn: (w, k) => {
    const b = zahl(w.bindungMonate) ?? 0;
    const kosten = zahl(w.kosten);
    return [
      `(1) The Employer reimburses ${k.vorname} for the costs of moving to the place of work up to a maximum of ${kosten !== null ? euroEn(kosten) : "[amount]"}.`,
      `(2) If the employment relationship ends within ${monateEn(b)} after the move through resignation by ${k.vorname} or through dismissal by the Employer for reasons of conduct, ${k.vorname} repays the reimbursement on a pro rata basis. The amount is reduced by 1/${zahlEn(b || 1)} for each full month of employment after the move.`,
      `(3) ${ausnahmenTextEn(k.vorname)}`,
      "(4) The tax treatment of the reimbursement is governed by law.",
    ].join("\n");
  },
  normen: ["§ 307 BGB"],
  quellen: ["https://www.gesetze-im-internet.de/bgb/__307.html", "Katalog Abschnitt 4, Baustein L4"],
  schutz: ["Wie L2: monatliche Staffel, fester Ausnahmenkatalog, bezifferte Kosten.", "Bindung höchstens bis zur Grenze aus dem Register."],
  sperren: ["Bindung über der Höchstgrenze."],
  stichwoerter: ["Umzug", "Relocation", "Umzugskosten", "Rückzahlung"],
  regeln: [
    regel("P-077", "sperre", "Bindung bei Umzugskosten oder Einstiegsprämie zu lang", "§ 307 BGB", ["L4", "L5"], (l) => {
      const id = ["L4", "L5"].find((x) => hat(l, x) && (num(l, x, "bindungMonate") ?? 0) > WERTE.bindungRueckzahlungMaxMonate.wert);
      return id ? `${id}: Die Bindung darf höchstens ${monateText(WERTE.bindungRueckzahlungMaxMonate.wert)} betragen, eingegeben sind ${monateText(num(l, id, "bindungMonate") ?? 0)}. Sicher: kürzere Bindung mit monatlicher Staffel.` : null;
    }),
  ],
};

const L5: Baustein = {
  id: "L5", gruppe: "L", label: "Einstiegsprämie mit Rückzahlung", risiko: "gelb", version: 1,
  passt: "Für die Gewinnung von Fachkräften mit einer Prämie zum Start.",
  fuer: OHNE_WS,
  felder: [
    { id: "betrag", label: "Einstiegsprämie brutto in Euro", typ: "betrag", pflicht: true, min: 0 },
    { id: "auszahlung", label: "Auszahlung", typ: "auswahl", optionen: ["mit dem ersten Gehalt", "in Raten"], standard: "mit dem ersten Gehalt", pflicht: true },
    { id: "raten", label: "Anzahl der Raten", typ: "zahl", min: 1, bei: { auszahlung: ["in Raten"] } },
    { id: "bindungMonate", label: "Bindung in Monaten", typ: "zahl", pflicht: true, min: 1, max: WERTE.bindungRueckzahlungMaxMonate.wert, hinweis: "Unter einem Monatsgehalt kurz binden. Rückzahlung nur bei Eigenkündigung oder verhaltensbedingter Kündigung." },
  ],
  text: (w, k) => {
    const b = zahl(w.bindungMonate) ?? 0;
    const betrag = zahl(w.betrag);
    const raten = zahl(w.raten);
    return [
      `(1) ${k.vorname} erhält eine Einstiegsprämie von ${betrag !== null ? euro(betrag) : "[Betrag]"} brutto, ${w.auszahlung === "in Raten" ? `ausgezahlt in ${raten ? zahlText(raten) : "[Anzahl]"} gleichen Raten mit den ersten Gehältern` : "ausgezahlt mit dem ersten Gehalt"}.`,
      `(2) Endet das Arbeitsverhältnis innerhalb von ${monateTextDativ(b)} nach Beginn durch Eigenkündigung von ${k.vorname} oder durch eine verhaltensbedingte Kündigung des Arbeitgebers, zahlt ${k.vorname} die ausgezahlte Prämie anteilig zurück. Der Betrag mindert sich für jeden vollen Monat der Beschäftigung um 1/${zahlText(b || 1)}.`,
      `(3) ${ausnahmenText(k.vorname)}`,
    ].join("\n");
  },
  labelEn: "Signing bonus with repayment",
  textEn: (w, k) => {
    const b = zahl(w.bindungMonate) ?? 0;
    const betrag = zahl(w.betrag);
    const raten = zahl(w.raten);
    return [
      `(1) ${k.vorname} receives a signing bonus of ${betrag !== null ? euroEn(betrag) : "[amount]"} gross, ${w.auszahlung === "in Raten" ? `paid in ${raten ? zahlEn(raten) : "[number]"} equal instalments with the first salary payments` : "paid with the first salary"}.`,
      `(2) If the employment relationship ends within ${monateEn(b)} after it begins through resignation by ${k.vorname} or through dismissal by the Employer for reasons of conduct, ${k.vorname} repays the bonus paid out on a pro rata basis. The amount is reduced by 1/${zahlEn(b || 1)} for each full month of employment.`,
      `(3) ${ausnahmenTextEn(k.vorname)}`,
    ].join("\n");
  },
  normen: ["§ 307 BGB"],
  quellen: ["https://www.gesetze-im-internet.de/bgb/__307.html", "Katalog Abschnitt 4, Baustein L5 und D19"],
  schutz: ["Bindung nach Höhe, unter einem Monatsgehalt kürzer.", "Rückzahlung nur bei Eigenkündigung oder verhaltensbedingter Kündigung.", "Monatliche Staffel und Ausnahmenkatalog."],
  sperren: ["Bindung über der Höchstgrenze."],
  stichwoerter: ["Signing Bonus", "Einstiegsprämie", "Willkommensprämie", "Rückzahlung"],
};

/* ---------- M: Wettbewerbsverbote ---------- */

const ZAHLUNG_MONATLICH = "monatlich zum Monatsende";
const karenzFelder: Feld[] = [
  {
    id: "entschaedigung", label: "Karenzentschädigung in Prozent der zuletzt bezogenen vertragsmäßigen Leistungen", typ: "prozent", pflicht: true,
    min: MINDEST_PROZENT, max: 100, standard: String(MINDEST_PROZENT),
    hinweis: "Gesetzliches Minimum ist die Hälfte (§ 74 Abs. 2 HGB). Lintelly zeigt den Betrag in Euro.",
  },
  { id: "variabel", label: "Variable Vergütung je Monat im Durchschnitt (Euro)", typ: "betrag", min: 0, standard: "0", hinweis: "Bonus und Provision im Durchschnitt des Bezugszeitraums nach § 74b Abs. 2 HGB." },
  { id: "sachbezuege", label: "Sachbezüge je Monat (Euro), z. B. Privatnutzung des Dienstwagens", typ: "betrag", min: 0, standard: "0" },
  { id: "auszahlung", label: "Auszahlung der Entschädigung", typ: "auswahl", optionen: [ZAHLUNG_MONATLICH, "vierteljährlich", "einmalig bei Ende"], standard: ZAHLUNG_MONATLICH, pflicht: true },
];

function karenzText(w: Werte, vorname: string, gehalt: number): string[] {
  const k = karenz(gehalt, w);
  const p = k.a !== null ? zahlText(k.a * 100) : "[Prozent]";
  const beispiel = k.betrag !== null ? ` Bei den heutigen Bezügen von ${euro(k.basis)} im Monat sind das ${euro(k.betrag)} im Monat.` : "";
  const zehntel = zahlText(WERTE.karenzAnrechnung.zehntel * 100);
  const viertel = zahlText(WERTE.karenzAnrechnung.viertelBeiUmzug * 100);
  const zahlung = w.auszahlung === ZAHLUNG_MONATLICH || !w.auszahlung ? "monatlich zum Ende jedes Monats" : w.auszahlung === "vierteljährlich" ? "vierteljährlich" : "in einem Betrag";
  return [
    `Der Arbeitgeber zahlt ${vorname} für jedes Jahr des Verbots eine Karenzentschädigung von ${p} Prozent der zuletzt bezogenen vertragsmäßigen Leistungen. Dazu gehören das Fixum, die variable Vergütung im Durchschnitt und die Sachbezüge.${beispiel} Die Entschädigung wird ${zahlung} gezahlt.`,
    `Die Entschädigung ist fest zugesagt. Sie hängt von keiner Bedingung und von keiner Wahl des Arbeitgebers ab.`,
    `Auf die Entschädigung wird angerechnet, was ${vorname} während des Verbots durch anderweitige Verwertung der Arbeitskraft erwirbt oder böswillig zu erwerben unterlässt, soweit Entschädigung und Erwerb zusammen die zuletzt bezogenen Leistungen um mehr als ${zehntel} Prozent übersteigen; muss ${vorname} wegen des Verbots den Wohnsitz verlegen, gilt eine Grenze von ${viertel} Prozent (§ 74c HGB). ${vorname} gibt auf Verlangen Auskunft über den Erwerb.`,
  ];
}

function karenzTextEn(w: Werte, vorname: string, gehalt: number): string[] {
  const k = karenz(gehalt, w);
  const p = k.a !== null ? zahlEn(k.a * 100) : "[percentage]";
  const beispiel = k.betrag !== null ? ` Based on current remuneration of ${euroEn(k.basis)} per month, this amounts to ${euroEn(k.betrag)} per month.` : "";
  const zehntel = zahlEn(WERTE.karenzAnrechnung.zehntel * 100);
  const viertel = zahlEn(WERTE.karenzAnrechnung.viertelBeiUmzug * 100);
  const zahlung = w.auszahlung === ZAHLUNG_MONATLICH || !w.auszahlung ? "monthly at the end of each month" : w.auszahlung === "vierteljährlich" ? "quarterly" : "in a single sum";
  return [
    `For each year of the restriction, the Employer pays ${vorname} compensation (Karenzentschädigung) of ${p} per cent of the contractual remuneration last received. This includes the fixed salary, the average variable remuneration and benefits in kind.${beispiel} The compensation is paid ${zahlung}.`,
    `The compensation is firmly promised. It does not depend on any condition or on any choice by the Employer.`,
    `Anything ${vorname} earns during the restriction from other use of their working capacity, or maliciously fails to earn, is set off against the compensation, insofar as compensation and earnings together exceed the remuneration last received by more than ${zehntel} per cent; if ${vorname} has to move residence because of the restriction, a limit of ${viertel} per cent applies (§ 74c HGB). ${vorname} provides information about such earnings on request.`,
  ];
}

const N1_FORTBILDUNG = "Ausscheiden während einer Fortbildungsbindung";

/** Gemeinsame Prüfung der Karenz für M2 und M3. */
const karenzFehlt = (l: Lage, id: string) => {
  const k = karenz(l.person.gehalt, l.auswahl[id]);
  return k.a === null || k.a < WERTE.karenzMindestAnteil.wert;
};

const UMFANG_STANDARD = "jede Tätigkeit für ein Unternehmen, das mit dem Arbeitgeber im Wettbewerb steht";

const M1: Baustein = {
  id: "M1", gruppe: "M", label: "Wettbewerbsverbot während des Arbeitsverhältnisses", risiko: "grün", version: 1,
  passt: "Für alle Beschäftigten; das Verbot gilt ohnehin kraft Gesetzes und wird hier klar beschrieben.",
  fuer: ARBEITNEHMER, // Entscheidung 24: auch für Werkstudierende
  felder: [
    { id: "umfang", label: "Umfang", typ: "lang", standard: UMFANG_STANDARD },
    { id: "beteiligung", label: "Beteiligungen an Wettbewerbern anzeigen", typ: "janein", standard: "ja" },
    { id: "beteiligungGrenze", label: "Anzeige ab Anteil in Prozent", typ: "prozent", min: 0, max: 100, bei: { beteiligung: ["ja"] }, hinweis: "Beispielwert, frei wählbar. Reine Geldanlage in börsennotierte Anteile darunter bleibt frei." },
    { id: "ausnahmen", label: "Ausnahmen", typ: "lang" },
  ],
  text: (w, k) => {
    const g = zahl(w.beteiligungGrenze);
    return [
      `(1) Während des Arbeitsverhältnisses unterlässt ${k.vorname} ${w.umfang?.trim() || "jede Tätigkeit für ein Unternehmen, das mit dem Arbeitgeber im Wettbewerb steht"}.`,
      ja(w.beteiligung) ? `(2) ${k.vorname} zeigt Beteiligungen an Wettbewerbern in Textform an${g ? `, sobald der Anteil ${zahlText(g)} Prozent erreicht` : ""}.` : "",
      w.ausnahmen?.trim() ? `(3) Ausgenommen ist: ${w.ausnahmen.trim()}` : "",
      "Das Verbot endet mit dem Ende des Arbeitsverhältnisses. Ein Verbot für die Zeit danach gilt nur mit einer eigenen Vereinbarung mit Karenzentschädigung.",
    ].filter(Boolean).join("\n");
  },
  labelEn: "Non-competition during employment",
  textEn: (w, k) => {
    const g = zahl(w.beteiligungGrenze);
    const umfang = w.umfang?.trim();
    return [
      `(1) During the employment relationship, ${k.vorname} refrains from ${!umfang || umfang === UMFANG_STANDARD ? "any activity for a business that competes with the Employer" : frei(umfang)}.`,
      ja(w.beteiligung) ? `(2) ${k.vorname} notifies the Employer in text form of any shareholdings in competitors${g ? `, as soon as the share reaches ${zahlEn(g)} per cent` : ""}.` : "",
      w.ausnahmen?.trim() ? `(3) The following is excluded: ${frei(w.ausnahmen)}` : "",
      "The restriction ends when the employment relationship ends. A restriction for the period afterwards applies only under a separate agreement with compensation (Karenzentschädigung).",
    ].filter(Boolean).join("\n");
  },
  normen: ["§ 60 HGB", "§ 241 Abs. 2 BGB"],
  quellen: ["https://www.gesetze-im-internet.de/hgb/__60.html", "https://www.gesetze-im-internet.de/bgb/__241.html", "Katalog Abschnitt 4, Baustein M1"],
  schutz: ["Keine Karenzentschädigung nötig, weil das Verbot mit dem Arbeitsverhältnis endet."],
  sperren: ["Verlängerung über das Ende hinaus ohne Baustein M2."],
  stichwoerter: ["Wettbewerbsverbot", "Konkurrenz", "Konkurrenzverbot", "Beteiligung"],
};

const M2: Baustein = {
  id: "M2", gruppe: "M", label: "Nachvertragliches Wettbewerbsverbot", risiko: "gelb", version: 1, nass: true,
  passt: "Für Vertrieb, Führungskräfte und Wissensträger mit Zugang zu Kunden oder Know-how, nicht für Einstiegsstellen.",
  fuer: OHNE_WS,
  felder: [
    { id: "dauerMonate", label: "Dauer nach Ende in Monaten", typ: "zahl", pflicht: true, min: 1, max: WERTE.wettbewerbsverbotHoechstMonate.wert },
    { id: "gegenstand", label: "Gegenstand (Branche, Tätigkeiten)", typ: "lang", pflicht: true, hinweis: "Konkret, nicht „jede Tätigkeit“." },
    { id: "gebiet", label: "Gebiet (Region, Länder)", typ: "text", pflicht: true },
    { id: "interesse", label: "Berechtigtes geschäftliches Interesse (Kunden, Know-how)", typ: "lang", pflicht: true },
    ...karenzFelder,
    { id: "verzicht", label: "Verzicht des Arbeitgebers vor Ende vorsehen", typ: "janein", standard: "ja", hinweis: "Nach einem Verzicht zahlt der Arbeitgeber noch ein Jahr lang (§ 75a HGB)." },
  ],
  text: (w, k) => {
    const d = zahl(w.dauerMonate) ?? 0;
    const karenzSaetze = karenzText(w, k.vorname, k.gehalt);
    const strafe = "N2" in k.auswahl ? "Für Verstöße gilt die vereinbarte Vertragsstrafe bei Wettbewerbsverstoß." : "";
    return [
      `(1) ${k.vorname} ist für die Dauer von ${monateTextDativ(d)} nach Ende des Arbeitsverhältnisses nicht für ein Unternehmen tätig, das im folgenden Bereich mit dem Arbeitgeber im Wettbewerb steht, weder angestellt noch selbständig noch durch eine wesentliche Beteiligung. Gegenstand: ${w.gegenstand?.trim() || "[Gegenstand]"}. Gebiet: ${w.gebiet?.trim() || "[Gebiet]"}.`,
      `(2) Das Verbot schützt folgendes berechtigtes geschäftliches Interesse des Arbeitgebers: ${w.interesse?.trim() || "[Interesse]"}`,
      `(3) ${karenzSaetze.join(" ")}`,
      ja(w.verzicht) || !w.verzicht ? `(4) Der Arbeitgeber kann vor dem Ende des Arbeitsverhältnisses durch Erklärung in Schriftform auf das Verbot verzichten. Er wird dann mit Ablauf von ${monateTextDativ(WERTE.karenzVerzichtMonate.wert)} seit der Erklärung von der Pflicht zur Entschädigung frei (§ 75a HGB).` : "(4) Ein Verzicht des Arbeitgebers richtet sich nach § 75a HGB.",
      "(5) Das Verbot wird unverbindlich, wenn die Voraussetzungen des § 75 HGB vorliegen, insbesondere bei einer Kündigung durch die Person wegen vertragswidrigen Verhaltens des Arbeitgebers.",
      `(6) Die Vereinbarung bedarf der Schriftform. Der Arbeitgeber händigt ${k.vorname} eine von ihm unterschriebene Urkunde mit diesen Bestimmungen aus (§ 74 Abs. 1 HGB). ${strafe}`.trim(),
    ].join("\n");
  },
  labelEn: "Post-contractual non-competition covenant",
  textEn: (w, k) => {
    const d = zahl(w.dauerMonate) ?? 0;
    const karenzSaetze = karenzTextEn(w, k.vorname, k.gehalt);
    const strafe = "N2" in k.auswahl ? "The agreed contractual penalty for breach of the non-competition covenant applies to any breach." : "";
    return [
      `(1) For ${monateEn(d)} after the end of the employment relationship, ${k.vorname} will not work for a business that competes with the Employer in the following field, whether as an employee, as a self-employed person or through a substantial shareholding. Scope: ${frei(w.gegenstand) || "[scope]"}. Territory: ${frei(w.gebiet) || "[territory]"}.`,
      `(2) The restriction protects the following legitimate business interest of the Employer: ${frei(w.interesse) || "[interest]"}`,
      `(3) ${karenzSaetze.join(" ")}`,
      ja(w.verzicht) || !w.verzicht ? `(4) Before the employment relationship ends, the Employer may waive the restriction by declaration in written form. The Employer is then released from the obligation to pay compensation on expiry of ${monateEn(WERTE.karenzVerzichtMonate.wert)} from the declaration (§ 75a HGB).` : "(4) A waiver by the Employer is governed by § 75a HGB.",
      "(5) The restriction becomes non-binding where the conditions of § 75 HGB are met, in particular where the Employee resigns because of a breach of contract by the Employer.",
      `(6) The agreement must be in written form. The Employer hands ${k.vorname} a document signed by the Employer containing these provisions (§ 74 para. 1 HGB). ${strafe}`.trim(),
    ].join("\n");
  },
  normen: ["§ 74 HGB", "§ 74a HGB", "§ 74b HGB", "§ 74c HGB", "§ 75 HGB", "§ 75a HGB", "§ 110 GewO"],
  quellen: ["https://www.gesetze-im-internet.de/hgb/__74.html", "https://www.gesetze-im-internet.de/hgb/__74a.html", "https://www.gesetze-im-internet.de/hgb/__74c.html", "https://www.gesetze-im-internet.de/hgb/__75a.html", "https://www.gesetze-im-internet.de/gewo/__110.html", "Katalog Abschnitt 4, Baustein M2"],
  urteile: [{ az: "BAG 10 AZR 448/15", kennung: "V" }],
  schutz: [
    "Schriftform mit Originalunterschrift, Übergabeprotokoll für die unterschriebene Urkunde.",
    "Dauer höchstens bis zur gesetzlichen Grenze.",
    "Entschädigung mindestens die Hälfte der letzten Bezüge, Rechnung in Euro.",
    "Feste Zusage ohne Bedingung, Wahl oder salvatorische Ersatzregel.",
    "Berechtigtes Interesse, Gegenstand und Gebiet konkret.",
    "Volljährigkeit bei Vertragsschluss.",
    "Verzicht mit Hinweis auf das Ende der Zahlungspflicht nach einem Jahr.",
    "Nicht für Auszubildende.",
  ],
  sperren: ["Entschädigung unter der Hälfte oder ohne Zahl (R1)", "Dauer über der gesetzlichen Grenze", "Minderjährige oder Auszubildende (R2, R5)", "Ehrenwort oder Dritthaftung (R2)", "Wahlrecht des Arbeitgebers nach Ende"],
  stichwoerter: ["Wettbewerbsverbot", "nachvertraglich", "Karenzentschädigung", "Karenz", "Konkurrenzklausel"],
  regeln: [
    regel("P-078", "sperre", "Karenzentschädigung unter der Hälfte der zuletzt bezogenen Leistungen", "§ 74 Abs. 2 HGB", ["M2"], (l) => {
      if (!hat(l, "M2")) return null;
      const k = karenz(l.person.gehalt, l.auswahl.M2);
      if (k.a !== null && k.a >= WERTE.karenzMindestAnteil.wert) return null;
      const variabel = num(l, "M2", "variabel") ?? 0;
      const sach = num(l, "M2", "sachbezuege") ?? 0;
      const ist = k.betrag !== null && k.a !== null ? `vereinbart sind ${zahlText(k.a * 100)} Prozent, also ${euro(k.betrag)}` : "es ist keine Entschädigung angegeben";
      return `Rechnung: Fixum ${euro(l.person.gehalt)} plus variable Vergütung ${euro(variabel)} plus Sachbezüge ${euro(sach)} ergibt ${euro(k.basis)} im Monat. Mindestens ${zahlText(MINDEST_PROZENT)} Prozent sind ${euro(k.mindest)} im Monat, ${ist}. Ohne diese Zusage ist das Verbot unverbindlich.`;
    }),
    regel("P-079", "sperre", "Dauer des Verbots über der gesetzlichen Grenze", "§ 74a Abs. 1 HGB", ["M2"], (l) => {
      const d = num(l, "M2", "dauerMonate");
      return wenn(d !== null && d > WERTE.wettbewerbsverbotHoechstMonate.wert, `Das Verbot darf höchstens ${monateText(WERTE.wettbewerbsverbotHoechstMonate.wert)} nach Ende gelten, eingegeben sind ${monateText(d ?? 0)}.`);
    }),
    regel("P-080", "sperre", "Person bei Vertragsschluss minderjährig", "§ 74a Abs. 2 HGB", ["M2"],
      (l) => wenn(hat(l, "M2") && minderjaehrig(l), `Die Person ist am Vertragsdatum unter ${WERTE.jugendlicheBisJahre.wert} Jahre alt. Ein nachvertragliches Wettbewerbsverbot ist dann nichtig. Während des Arbeitsverhältnisses gilt M1.`)),
    regel("P-081", "sperre", "Gegenstand, Gebiet oder berechtigtes Interesse fehlen oder sind pauschal", "§ 74a Abs. 1 HGB", ["M2"], (l) => {
      if (!hat(l, "M2")) return null;
      const fehlt = [["gegenstand", "Gegenstand"], ["gebiet", "Gebiet"], ["interesse", "berechtigtes Interesse"]].filter(([f]) => leer(wert(l, "M2", f))).map(([, n]) => n);
      const pauschal = /\b(jede|jegliche|sämtliche|alle)\s+(tätigkeit|tätigkeiten|beschäftigung)/i.test(wert(l, "M2", "gegenstand"));
      return wenn(fehlt.length > 0 || pauschal, `${fehlt.length ? `Es fehlt: ${fehlt.join(", ")}.` : ""}${pauschal ? " Der Gegenstand ist pauschal („jede Tätigkeit“)." : ""} Ein Verbot ohne konkreten Gegenstand, Gebiet und berechtigtes Interesse erschwert das Fortkommen unbillig und ist insoweit unverbindlich.`.trim());
    }),
    regel("P-082", "sperre", "Bedingung, Wahlrecht, salvatorische Ersatzklausel oder Ehrenwort", "§ 74a Abs. 2 HGB, BAG 10 AZR 448/15", ["M2"], (l) => {
      const t = ergaenzung(l, "M2");
      return wenn(/wahlrecht|nach (dem )?ende[^.]{0,40}entscheid|vorbehalt|bedingung|bedingt|salvatorisch|ersatzentschädigung|angemessene entschädigung|ehrenwort|versichert|dritte[rn]?[^.]{0,40}(übernimmt|verpflichtet)/i.test(t), "Die Ergänzung macht die Entschädigung oder das Verbot von einer Wahl, Bedingung, Ersatzregel oder Versicherung abhängig. Das Verbot braucht eine feste Zusage der Entschädigung; Ehrenwort und Übernahme durch Dritte machen es nichtig. Ergänzung streichen.");
    }),
    regel("P-083", "warnung", "Entschädigung nicht monatlich zum Monatsende", "§ 74b Abs. 1 HGB (Kanzlei prüfen)", ["M2"],
      (l) => wenn(hat(l, "M2") && wert(l, "M2", "auszahlung") !== "" && wert(l, "M2", "auszahlung") !== ZAHLUNG_MONATLICH, "Das Gesetz sieht die Zahlung am Schluss jedes Monats vor. Wähle „monatlich zum Monatsende“.")),
    regel("P-084", "pflicht", "Verzicht des Arbeitgebers mit Hinweis auf die Jahresfrist", "§ 75a HGB (Kanzlei prüfen)", ["M2"],
      (l) => wenn(hat(l, "M2") && wert(l, "M2", "verzicht") !== "nein", `Der Text enthält den Satz zum Verzicht: Die Pflicht zur Entschädigung endet ${monateText(WERTE.karenzVerzichtMonate.wert)} nach der Verzichtserklärung.`)),
    regel("K-12", "sperre", "Wettbewerbsverbot oder Kundenschutz ohne Karenzentschädigung oder unter der Hälfte", "§ 74 Abs. 2 HGB (R1)", ["M2", "M3"], (l) => {
      const id = ["M2", "M3"].find((x) => hat(l, x) && karenzFehlt(l, x));
      return id ? `${id}: Ohne Karenzentschädigung von mindestens ${zahlText(MINDEST_PROZENT)} Prozent der letzten Bezüge ist das Verbot nicht verbindlich. Eine salvatorische Ersatzklausel heilt das nicht.` : null;
    }),
    regel("K-13", "sperre", "Wettbewerbsverbot oder Kundenschutz über der Höchstdauer", "§ 74a Abs. 1 HGB", ["M2", "M3"], (l) => {
      const id = ["M2", "M3"].find((x) => hat(l, x) && (num(l, x, "dauerMonate") ?? 0) > WERTE.wettbewerbsverbotHoechstMonate.wert);
      return id ? `${id}: höchstens ${monateText(WERTE.wettbewerbsverbotHoechstMonate.wert)} nach Ende.` : null;
    }),
    regel("K-14", "sperre", "Wettbewerbsverbot oder Kundenschutz bei Minderjährigen oder Auszubildenden", "§ 74a Abs. 2 HGB, § 12 BBiG (R2, R5)", ["M2", "M3"], (l) => {
      const ids = ["M2", "M3"].filter((x) => hat(l, x));
      return wenn(ids.length > 0 && (minderjaehrig(l) || azubi(l)), `${ids.join(", ")}: Bei ${azubi(l) ? "Auszubildenden" : "Minderjährigen"} ist ein nachvertragliches Verbot nichtig. Nur M1 während des Arbeitsverhältnisses.`);
    }),
    regel("K-15", "sperre", "Wettbewerbsverbot mit Vertragsstrafe über der Staffel oder ohne Obergrenze", "§ 75c HGB, § 307 BGB", ["M2", "N2"], (l) => {
      if (!hat(l, "M2") || !hat(l, "N2")) return null;
      const ober = num(l, "N2", "obergrenze");
      const warn = l.person.gehalt * 12 * WERTE.vertragStandards.strafeWarnJahresgehaelter;
      const schwer = num(l, "N2", "schwer") ?? 0;
      if (ober === null) return "Die Vertragsstrafe zum Wettbewerbsverbot braucht eine Gesamtobergrenze.";
      if (ober > warn) return `Die Obergrenze ${euro(ober)} liegt über dem Warnwert von ${euro(warn)} (das ${WERTE.vertragStandards.strafeWarnJahresgehaelter}-fache des Jahresgehalts). Kanzlei prüfen oder Obergrenze senken.`;
      return wenn(schwer > ober, `Der Betrag für schwere Verstöße (${euro(schwer)}) liegt über der Obergrenze (${euro(ober)}).`);
    }),
    regel("K-16", "pflicht", "Wettbewerbsverbot braucht Schriftform: Signatur auf Original", "§ 74 Abs. 1 HGB", ["M2"],
      (l) => wenn(hat(l, "M2"), "Eine elektronische Signatur reicht nicht. Lintelly stellt die Signatur auf „Original“ und legt das Übergabeprotokoll für die unterschriebene Urkunde an.")),
  ],
};

const M3: Baustein = {
  id: "M3", gruppe: "M", label: "Kundenschutzklausel", risiko: "gelb", version: 1, nass: true,
  passt: "Für Beratung, Vertrieb und Agenturen mit festen Kundenbeziehungen.",
  fuer: OHNE_WS,
  felder: [
    { id: "kunden", label: "Geschützte Kunden", typ: "auswahl", optionen: ["Kunden, die die Person im Rückblickzeitraum betreut hat", "Kundenliste als Anlage"], standard: "Kunden, die die Person im Rückblickzeitraum betreut hat", pflicht: true },
    { id: "rueckblickMonate", label: "Rückblickzeitraum in Monaten", typ: "zahl", min: 1, standard: String(WERTE.vertragStandards.kundenschutzRueckblickMonate), bei: { kunden: ["Kunden, die die Person im Rückblickzeitraum betreut hat"] } },
    { id: "dauerMonate", label: "Dauer nach Ende in Monaten", typ: "zahl", pflicht: true, min: 1, max: WERTE.wettbewerbsverbotHoechstMonate.wert },
    ...karenzFelder,
  ],
  text: (w, k) => {
    const d = zahl(w.dauerMonate) ?? 0;
    const r = zahl(w.rueckblickMonate) ?? WERTE.vertragStandards.kundenschutzRueckblickMonate;
    const kreis = w.kunden === "Kundenliste als Anlage" ? "die Kunden, die in der Anlage zu diesem Vertrag aufgeführt sind" : `die Kunden, die ${k.vorname} in den letzten ${monateTextDativ(r)} vor dem Ende des Arbeitsverhältnisses betreut hat`;
    return [
      `(1) ${k.vorname} ist für die Dauer von ${monateTextDativ(d)} nach Ende des Arbeitsverhältnisses nicht für ${kreis} tätig, weder angestellt noch selbständig.`,
      `(2) ${karenzText(w, k.vorname, k.gehalt).join(" ")}`,
      `(3) Die Vereinbarung bedarf der Schriftform. Der Arbeitgeber händigt ${k.vorname} eine von ihm unterschriebene Urkunde aus (§ 74 Abs. 1 HGB).`,
    ].join("\n");
  },
  labelEn: "Customer protection clause",
  textEn: (w, k) => {
    const d = zahl(w.dauerMonate) ?? 0;
    const r = zahl(w.rueckblickMonate) ?? WERTE.vertragStandards.kundenschutzRueckblickMonate;
    const kreis = w.kunden === "Kundenliste als Anlage" ? "the customers listed in the annex to this contract" : `the customers whom ${k.vorname} looked after in the last ${monateEn(r)} before the end of the employment relationship`;
    return [
      `(1) For ${monateEn(d)} after the end of the employment relationship, ${k.vorname} will not work for ${kreis}, whether as an employee or as a self-employed person.`,
      `(2) ${karenzTextEn(w, k.vorname, k.gehalt).join(" ")}`,
      `(3) The agreement must be in written form. The Employer hands ${k.vorname} a document signed by the Employer (§ 74 para. 1 HGB).`,
    ].join("\n");
  },
  normen: ["§ 74 HGB", "§ 74a HGB", "§ 74c HGB", "§ 110 GewO"],
  quellen: ["https://www.gesetze-im-internet.de/hgb/__74.html", "https://www.gesetze-im-internet.de/hgb/__74a.html", "Katalog Abschnitt 4, Baustein M3"],
  urteile: [{ az: "BAG Linie zur Kundenschutzklausel als Wettbewerbsverbot", kennung: "P" }],
  schutz: ["Wie M2: Schriftform, Karenz, Höchstdauer.", "Kundenkreis konkret."],
  sperren: ["Kundenschutz ohne Karenz (R1)."],
  stichwoerter: ["Kundenschutz", "Mandantenschutz", "Kunden mitnehmen", "Karenz"],
};

const M4: Baustein = {
  id: "M4", gruppe: "M", label: "Abwerbeverbot", risiko: "gelb", version: 1,
  passt: "Für Teams mit Wissen und Kunden, die nicht gezielt abgeworben werden sollen.",
  fuer: OHNE_WS,
  felder: [
    { id: "dauerMonate", label: "Dauer nach Ende in Monaten", typ: "zahl", pflicht: true, min: 1, max: WERTE.vertragStandards.abwerbeWarnMonate, standard: String(WERTE.vertragStandards.abwerbeMonate), hinweis: `Standard ist ${monateText(WERTE.vertragStandards.abwerbeMonate)}. Länger nur mit Kanzlei.` },
    { id: "karenz", label: "Mit Entschädigung", typ: "janein", standard: "nein" },
    { id: "entschaedigung", label: "Entschädigung je Monat in Euro", typ: "betrag", min: 0, bei: { karenz: ["ja"] } },
  ],
  text: (w, k) => {
    const d = zahl(w.dauerMonate) ?? 0;
    const e = zahl(w.entschaedigung);
    return [
      `(1) ${k.vorname} wirbt für die Dauer von ${monateTextDativ(d)} nach Ende des Arbeitsverhältnisses keine Beschäftigten des Arbeitgebers aktiv ab, weder für sich noch für Dritte.`,
      `(2) Nicht erfasst ist, wenn Beschäftigte von sich aus anfragen oder auf eine allgemeine Stellenanzeige reagieren. Ein Verbot, solche Personen einzustellen, besteht nicht.`,
      ja(w.karenz) ? `(3) Der Arbeitgeber zahlt für die Dauer des Verbots eine Entschädigung von ${e !== null ? euro(e) : "[Betrag]"} im Monat.` : "",
    ].filter(Boolean).join("\n");
  },
  labelEn: "Non-solicitation of employees",
  textEn: (w, k) => {
    const d = zahl(w.dauerMonate) ?? 0;
    const e = zahl(w.entschaedigung);
    return [
      `(1) For ${monateEn(d)} after the end of the employment relationship, ${k.vorname} will not actively solicit employees of the Employer, whether for themselves or for third parties.`,
      "(2) This does not cover cases where employees enquire on their own initiative or respond to a general job advertisement. There is no prohibition on hiring such persons.",
      ja(w.karenz) ? `(3) For the duration of the restriction, the Employer pays compensation of ${e !== null ? euroEn(e) : "[amount]"} per month.` : "",
    ].filter(Boolean).join("\n");
  },
  normen: ["§ 74 HGB", "§ 75f HGB", "§ 307 BGB"],
  quellen: ["https://www.gesetze-im-internet.de/hgb/__75f.html", "Katalog Abschnitt 4, Baustein M4"],
  urteile: [{ az: "Linie zur Abwerbung als Wettbewerbsbeschränkung", kennung: "P" }],
  schutz: ["Nur aktives Abwerben.", "Kein Einstellungsverbot gegenüber Dritten.", "Dauer begrenzt."],
  sperren: ["Verbot, Kollegen zu beschäftigen, die selbst anfragen."],
  stichwoerter: ["Abwerbung", "Abwerbeverbot", "Kollegen mitnehmen", "No-Hire"],
};

/* ---------- N: Vertragsstrafe ---------- */

const N1_VERSTOESSE_EN: Record<string, string> = {
  "Nichtantritt der Stelle": "fails to take up the position",
  "Beendigung ohne Einhaltung der Kündigungsfrist": "ends the employment relationship without observing the notice period",
  [N1_FORTBILDUNG]: "leaves in breach of contract during a training commitment period",
};

const N1: Baustein = {
  id: "N1", gruppe: "N", label: "Vertragsstrafe bei Vertragsbruch", risiko: "gelb", version: 1,
  passt: "Für Stellen, deren Nichtantritt oder Abbruch einen erheblichen Schaden verursacht (Saison, Projekte, lange Suche).",
  fuer: OHNE_WS,
  felder: [
    { id: "verstoesse", label: "Verstoßfälle", typ: "mehrfach", optionen: ["Nichtantritt der Stelle", "Beendigung ohne Einhaltung der Kündigungsfrist", N1_FORTBILDUNG], standard: "Nichtantritt der Stelle|Beendigung ohne Einhaltung der Kündigungsfrist", pflicht: true },
    { id: "fristTage", label: "Kündigungsfrist der Person nach der Probezeit in Tagen", typ: "zahl", pflicht: true, min: 1, standard: String(WERTE.grundkuendigungsfristTage.wert) },
    { id: "betrag", label: "Strafe je Fall in Euro", typ: "betrag", pflicht: true, min: 0, hinweis: "Höchstens das Entgelt für die Dauer der Kündigungsfrist. Lintelly rechnet den Höchstbetrag." },
    { id: "betragProbezeit", label: "Strafe in der Probezeit und bei Nichtantritt in Euro", typ: "betrag", min: 0, hinweis: "Höchstens das Entgelt für die Probezeit-Kündigungsfrist." },
    { id: "obergrenze", label: "Obergrenze aller Strafen in Euro", typ: "betrag", min: 0, hinweis: "Pflicht, wenn mehrere Verstoßfälle gewählt sind." },
  ],
  text: (w, k) => {
    const v = liste(w.verstoesse);
    const betrag = zahl(w.betrag);
    const probe = zahl(w.betragProbezeit);
    const ober = zahl(w.obergrenze);
    return [
      `(1) ${k.vorname} zahlt eine Vertragsstrafe, wenn ${k.vorname} schuldhaft ${v.length ? v.join(" oder ").replace("Nichtantritt der Stelle", "die Stelle nicht antritt").replace("Beendigung ohne Einhaltung der Kündigungsfrist", "das Arbeitsverhältnis ohne Einhaltung der Kündigungsfrist beendet").replace(N1_FORTBILDUNG, "während einer Fortbildungsbindung vertragswidrig ausscheidet") : "[Verstoßfall]"}.`,
      `(2) Die Strafe beträgt je Fall ${betrag !== null ? euro(betrag) : "[Betrag]"}${probe !== null ? `, beim Nichtantritt und in der Probezeit ${euro(probe)}` : ""}. Sie ist höchstens so hoch wie das Entgelt, das bis zum Ablauf der jeweils geltenden Kündigungsfrist zu zahlen wäre.${ober !== null ? ` Alle Strafen zusammen betragen höchstens ${euro(ober)}.` : ""}`,
      "(3) Die Strafe wird auf einen weitergehenden Schadensersatz angerechnet. Eine Kündigung unter Einhaltung der Frist löst keine Strafe aus.",
    ].join("\n");
  },
  labelEn: "Contractual penalty for breach of contract",
  textEn: (w, k) => {
    const v = liste(w.verstoesse).map((x) => N1_VERSTOESSE_EN[x] ?? frei(x));
    const betrag = zahl(w.betrag);
    const probe = zahl(w.betragProbezeit);
    const ober = zahl(w.obergrenze);
    return [
      `(1) ${k.vorname} pays a contractual penalty if ${k.vorname} culpably ${v.length ? v.join(" or ") : "[breach]"}.`,
      `(2) The penalty is ${betrag !== null ? euroEn(betrag) : "[amount]"} per case${probe !== null ? `, or ${euroEn(probe)} for failure to take up the position and during the probationary period` : ""}. It is no higher than the pay that would be due until the end of the applicable notice period.${ober !== null ? ` All penalties together amount to no more than ${euroEn(ober)}.` : ""}`,
      "(3) The penalty is credited against any further claim for damages. Resignation with due notice does not trigger a penalty.",
    ].join("\n");
  },
  normen: ["§ 339 BGB", "§ 340 BGB", "§ 343 BGB", "§ 307 BGB", "§ 12 BBiG"],
  quellen: ["https://www.gesetze-im-internet.de/bgb/__339.html", "https://www.gesetze-im-internet.de/bgb/__343.html", "https://www.gesetze-im-internet.de/bgb/__307.html", "Katalog Abschnitt 4, Baustein N1"],
  urteile: [{ az: "BAG 8 AZR 665/14", kennung: "V" }, { az: "BAG 8 AZR 65/05", kennung: "V" }, { az: "BAG 8 AZR 897/08", kennung: "V" }],
  schutz: ["Höchststrafe aus Gehalt und Kündigungsfrist, höhere Beträge gesperrt.", "In der Probezeit höchstens das Entgelt der Probezeitfrist.", "Verstoßfälle aus fester Liste.", "Obergrenze bei mehreren Fällen.", "Feste Zahl, kein Ermessen.", "Anrechnung auf Schadensersatz.", "Strafe nur bei Verschulden, Kanzlei prüfen, ob Vorsatz oder grobe Fahrlässigkeit verlangt wird."],
  sperren: ["Strafe über der Höchstgrenze", "Strafe für leichte Pflichtverletzungen", "Strafe für fristgerechte Kündigung", "Strafe in der Berufsausbildung (R5)"],
  stichwoerter: ["Vertragsstrafe", "Nichtantritt", "Vertragsbruch", "Strafe", "Kündigungsfrist"],
  regeln: [
    regel("P-085", "sperre", "Vertragsstrafe über dem Entgelt der Kündigungsfrist, in der Probezeit über dem Entgelt der Probezeitfrist", "§ 307 BGB, BAG 8 AZR 65/05, BAG 8 AZR 897/08", ["N1"], (l) => {
      if (!hat(l, "N1")) return null;
      const gehalt = l.person.gehalt;
      const frist = num(l, "N1", "fristTage") ?? l.person.kuendigungsfristTage ?? WERTE.grundkuendigungsfristTage.wert;
      const betrag = num(l, "N1", "betrag");
      const max = hoechstStrafe(gehalt, frist);
      if (betrag !== null && betrag > max) return `Höchstbetrag: ${euro(gehalt)} geteilt durch ${TAGE_JE_MONAT} mal ${frist} Tage Kündigungsfrist ergibt ${euro(max)}. Eingegeben sind ${euro(betrag)}.`;
      if (!l.person.probezeitMonate) return null;
      const probe = num(l, "N1", "betragProbezeit") ?? betrag;
      const maxProbe = hoechstStrafe(gehalt, WERTE.probezeitKuendigungTage.wert);
      return wenn(probe !== null && probe > maxProbe, `In der Probezeit und beim Nichtantritt gilt die Frist von ${WERTE.probezeitKuendigungTage.wert} Tagen: ${euro(gehalt)} geteilt durch ${TAGE_JE_MONAT} mal ${WERTE.probezeitKuendigungTage.wert} ergibt höchstens ${euro(maxProbe)}. Eingegeben sind ${euro(probe ?? 0)}. Sicher: eigenen Betrag für die Probezeit eintragen.`);
    }),
    regel("P-086", "sperre", "Vertragsstrafe ohne feste Verstoßliste oder ohne Obergrenze bei mehreren Fällen", "§ 307 BGB", ["N1", "N2"], (l) => {
      for (const id of ["N1", "N2"].filter((x) => hat(l, x))) {
        const v = liste(wert(l, id, "verstoesse"));
        if (!v.length) return `${id}: Die Verstöße müssen aus der festen Liste gewählt sein.`;
        if (/jede[nr]?\s+(pflichtverletzung|verstoß|fall der zuwiderhandlung)|jeglich/i.test(ergaenzung(l, id))) return `${id}: „Jede Pflichtverletzung“ ist zu unbestimmt. Nur die Verstöße aus der Liste.`;
        if (v.length > 1 && num(l, id, "obergrenze") === null) return `${id}: Bei mehreren Verstoßfällen braucht es eine Obergrenze aller Strafen.`;
      }
      return null;
    }),
    regel("K-17", "sperre", "Vertragsstrafe über dem Entgelt der Kündigungsfrist", "BAG 8 AZR 65/05", ["N1"], (l) => {
      const betrag = num(l, "N1", "betrag");
      const frist = num(l, "N1", "fristTage") ?? l.person.kuendigungsfristTage ?? WERTE.grundkuendigungsfristTage.wert;
      const max = hoechstStrafe(l.person.gehalt, frist);
      return wenn(betrag !== null && betrag > max, `Die Strafe darf höchstens ${euro(max)} betragen (Entgelt für die Kündigungsfrist).`);
    }),
    regel("P-088", "sperre", "Vertragsstrafe in der Berufsausbildung", "§ 12 BBiG (R5)", ["N1", "N2"], (l) => {
      const ids = ["N1", "N2"].filter((x) => hat(l, x));
      return wenn(ids.length > 0 && azubi(l), `${ids.join(", ")}: Vertragsstrafen sind im Berufsausbildungsverhältnis nichtig (§ 12 BBiG).`);
    }),
  ],
};

const N2_VERSTOESSE_EN: Record<string, string> = {
  "Verrat von Geschäftsgeheimnissen": "disclosure of trade secrets",
  "Verstoß gegen das nachvertragliche Wettbewerbsverbot": "breach of the post-contractual non-competition covenant",
  "Verstoß gegen die Kundenschutzklausel": "breach of the customer protection clause",
  "Verstoß gegen das Abwerbeverbot": "breach of the non-solicitation clause",
};

const N2: Baustein = {
  id: "N2", gruppe: "N", label: "Vertragsstrafe bei Geheimnisverrat und Wettbewerbsverstoß", risiko: "gelb", version: 1,
  passt: "In Verbindung mit nachvertraglicher Verschwiegenheit (H2) und Wettbewerbsverbot (M2).",
  fuer: OHNE_WS,
  felder: [
    { id: "verstoesse", label: "Verstoßfälle", typ: "mehrfach", optionen: ["Verrat von Geschäftsgeheimnissen", "Verstoß gegen das nachvertragliche Wettbewerbsverbot", "Verstoß gegen die Kundenschutzklausel", "Verstoß gegen das Abwerbeverbot"], pflicht: true },
    { id: "leicht", label: "Betrag bei leichtem Verstoß (Euro)", typ: "betrag", pflicht: true, min: 0 },
    { id: "mittel", label: "Betrag bei mittlerem Verstoß (Euro)", typ: "betrag", pflicht: true, min: 0 },
    { id: "schwer", label: "Betrag bei schwerem Verstoß (Euro)", typ: "betrag", pflicht: true, min: 0 },
    { id: "dauerMonat", label: "Bei Dauerverstoß je angefangenem Monat (Euro)", typ: "betrag", min: 0 },
    { id: "obergrenze", label: "Gesamtobergrenze (Euro)", typ: "betrag", pflicht: true, min: 0, hinweis: `Warnwert: das ${WERTE.vertragStandards.strafeWarnJahresgehaelter}-fache Jahresgehalt.` },
  ],
  text: (w, k) => {
    const b = (s: string | undefined) => (zahl(s) !== null ? euro(zahl(s)!) : "[Betrag]");
    return [
      `(1) Verstößt ${k.vorname} schuldhaft gegen eine der folgenden Pflichten, zahlt ${k.vorname} eine Vertragsstrafe: ${liste(w.verstoesse).join(", ") || "[Verstoß]"}.`,
      `(2) Die Strafe beträgt bei einem leichten Verstoß ${b(w.leicht)}, bei einem mittleren Verstoß ${b(w.mittel)} und bei einem schweren Verstoß ${b(w.schwer)}.${zahl(w.dauerMonat) !== null ? ` Bei einem Dauerverstoß fällt die Strafe für jeden angefangenen Monat des Verstoßes einmal an, je Monat ${b(w.dauerMonat)}.` : ""} Alle Strafen zusammen betragen höchstens ${b(w.obergrenze)}.`,
      "(3) Die Strafe wird auf einen weitergehenden Schadensersatz angerechnet. Die Höhe steht fest und wird nicht nach Ermessen des Arbeitgebers bestimmt.",
    ].join("\n");
  },
  labelEn: "Contractual penalty for disclosure of secrets and breach of non-competition",
  textEn: (w, k) => {
    const b = (s: string | undefined) => (zahl(s) !== null ? euroEn(zahl(s)!) : "[amount]");
    const v = liste(w.verstoesse).map((x) => N2_VERSTOESSE_EN[x] ?? frei(x));
    return [
      `(1) If ${k.vorname} culpably breaches one of the following obligations, ${k.vorname} pays a contractual penalty: ${v.join(", ") || "[breach]"}.`,
      `(2) The penalty is ${b(w.leicht)} for a minor breach, ${b(w.mittel)} for a moderate breach and ${b(w.schwer)} for a serious breach.${zahl(w.dauerMonat) !== null ? ` In the case of a continuing breach, the penalty is incurred once for each month or part of a month of the breach, at ${b(w.dauerMonat)} per month.` : ""} All penalties together amount to no more than ${b(w.obergrenze)}.`,
      "(3) The penalty is credited against any further claim for damages. The amount is fixed and is not determined at the Employer's discretion.",
    ].join("\n");
  },
  normen: ["§ 75c HGB", "§ 307 BGB", "§ 343 BGB", "GeschGehG"],
  quellen: ["https://www.gesetze-im-internet.de/hgb/__75c.html", "https://www.gesetze-im-internet.de/geschgehg/", "Katalog Abschnitt 4, Baustein N2"],
  urteile: [{ az: "Linie BAG zur Verhältnismäßigkeit von Vertragsstrafen bei Wettbewerbsverstoß", kennung: "P" }, { az: "Instanzrecht zum Hamburger Brauch im Formularvertrag", kennung: "P" }],
  schutz: ["Feste Staffel nach Schwere.", "Gesamtobergrenze, Warnwert ein Vielfaches des Jahresgehalts.", "Dauerverstoß je Monat ein Betrag."],
  sperren: ["Höhe nach Ermessen des Arbeitgebers (Hamburger Brauch).", "Strafe ohne Staffel."],
  stichwoerter: ["Vertragsstrafe", "Geheimnisverrat", "Wettbewerbsverstoß", "Hamburger Brauch"],
  regeln: [
    regel("P-087", "sperre", "Vertragsstrafe nach Ermessen des Arbeitgebers", "§ 307 Abs. 1 Satz 2 BGB (Transparenz)", ["N2"], (l) => {
      const t = ergaenzung(l, "N2");
      return wenn(hat(l, "N2") && /ermessen|angemessene\s+(vertrags)?strafe|hamburger brauch|bestimmt der arbeitgeber/i.test(t), "Die Höhe der Strafe muss feststehen. Eine Strafe nach Ermessen des Arbeitgebers bietet Lintelly im Formularvertrag nicht an. Nutze die Staffel leicht, mittel, schwer.");
    }),
    regel("K-18", "sperre", "Vertragsstrafe im Berufsausbildungsverhältnis", "§ 12 BBiG (R5)", ["N1", "N2"],
      (l) => wenn((hat(l, "N1") || hat(l, "N2")) && azubi(l), "Im Berufsausbildungsverhältnis ist keine Vertragsstrafe möglich. Baustein entfernen.")),
  ],
};

export const BAUSTEINE_LMN: Baustein[] = [L1, L2, L3, L4, L5, M1, M2, M3, M4, N1, N2];
