/**
 * Gruppe D, feste Vergütung und Nebenleistungen: Grundvergütung (D1), Sonderzahlungen und Bindung (D16 bis D19), Zulagen und Vorbehalte
 * (D20 bis D23), Dienstwagen, Dienstrad, Geräte, Zuschüsse (D24 bis D27), Beteiligung (D28), Altersversorgung (D29, D30), Darlehen (D31),
 * Prämien (D32), Überzahlung (D33). Mindestlohn, Widerrufsgrenze und Bindungsdauer kommen aus dem Register.
 */
import { WERTE } from "@/lib/regeln/werte";
import type { Baustein, Lage } from "./typen";
import { OHNE_WS, ARBEITNEHMER } from "./typen";
import { euro, hat, ja, leer, liste, monatsstunden, mindestlohnAm, num, prozent, regel, wenn, wert, zahl } from "./hilfen";
import { FAHRERKREIS, METHODE_TEXT } from "@/lib/regeln/dienstwagen";
import { dienstradVorteil, KFZ_GRUND } from "@/lib/regeln/dienstrad";
import { zahl as dezimal } from "@/lib/format";
import { datumEn, euroEn, frei, zahlEn } from "@/lib/dokumente/englisch";

const BGB_307 = "https://www.gesetze-im-internet.de/bgb/__307.html";
const BGB_308 = "https://www.gesetze-im-internet.de/bgb/__308.html";
const ZWECK = ["Vergütung für die Arbeit im Jahr", "Betriebstreue", "beides (Vergütung und Betriebstreue)"];
const WIDERRUF = WERTE.widerrufAnteil;
const SZ = WERTE.sonderzahlungBindung;
/** Leistungen, die als laufendes Entgelt gelten: hier kein Freiwilligkeitsvorbehalt (BAG 5 AZR 627/06, P). */
export const LAUFEND = ["Grundgehalt", "Provision", "Zielbonus mit Zielvereinbarung", "regelmäßige Zulage"];
const FREIWILLIG_OPTIONEN = ["Ermessensbonus (D4)", "13. Gehalt (D16)", "Urlaubsgeld (D17)", "Weihnachtsgeld (D18)", "Prämien (D32)", "Zuschüsse (D27)", ...LAUFEND];
const WIDERRUF_OPTIONEN = ["Zulage (D20)", "Private Nutzung Dienstwagen (D24)", "Zuschüsse (D27)", "Homeoffice-Zuschuss", "Grundgehalt"];
const STICHTAG_PFLICHTIG = ["13. Gehalt (D16)", "Zielbonus (D2)", "Provision (D5)", "Tantieme (D15)"];

/* Englische Fassung (Zweisprachigkeit 23.10.2026): Auswahlwerte auf feste englische Formulierungen, Unbekanntes als freie Eingabe. */
const en = (m: Record<string, string>, s: string | undefined) => m[s ?? ""] ?? frei(s);
const prozentEn = (a: number) => `${zahlEn(a * 100)} per cent`;
/** "31.03." ergibt "31 March". */
const stichtagEn = (s: string) => { const [t, m] = s.split(".").map(Number); return datumEn(`2000-${String(m).padStart(2, "0")}-${String(t).padStart(2, "0")}`).replace(/ 2000$/, ""); };
const MONAT_EN: Record<string, string> = { November: "November", Dezember: "December", Juni: "June" };
const ZWECK_EN: Record<string, string> = { [ZWECK[0]]: "remuneration for work performed in the year", [ZWECK[1]]: "loyalty to the company", [ZWECK[2]]: "both (remuneration and loyalty to the company)" };
const BINDUNG_EN: Record<string, string> = { [`${SZ.bisMonatsgehaltStichtag} des Folgejahres`]: `${stichtagEn(SZ.bisMonatsgehaltStichtag)} of the following year`, [`${SZ.abMonatsgehaltStichtag} des Folgejahres`]: `${stichtagEn(SZ.abMonatsgehaltStichtag)} of the following year` };
const GILT_EN: Record<string, string> = {
  Eigenkündigung: "resignation by the Employee", "verhaltensbedingter Kündigung durch den Arbeitgeber": "dismissal by the Employer for conduct-related reasons",
  "betriebsbedingter Kündigung": "dismissal for operational reasons", "Aufhebungsvertrag auf Wunsch des Arbeitgebers": "termination agreement at the request of the Employer",
};
/** Leistungen aus D19, D21 und D22. */
const LEISTUNG_EN: Record<string, string> = {
  "Weihnachtsgeld (D18)": "Christmas bonus (D18)", "Treueprämie (D32)": "loyalty bonus (D32)", "13. Gehalt (D16)": "13th-month salary (D16)", "Zielbonus (D2)": "target bonus (D2)",
  "Provision (D5)": "commission (D5)", "Tantieme (D15)": "profit-related bonus (D15)", "Ermessensbonus (D4)": "discretionary bonus (D4)", "Urlaubsgeld (D17)": "holiday pay (D17)",
  "Prämien (D32)": "bonuses (D32)", "Zuschüsse (D27)": "subsidies (D27)", Grundgehalt: "basic salary", Provision: "commission",
  "Zielbonus mit Zielvereinbarung": "target bonus with target agreement", "regelmäßige Zulage": "regular allowance", "Zulage (D20)": "allowance (D20)",
  "Private Nutzung Dienstwagen (D24)": "private use of the company car (D24)", "Homeoffice-Zuschuss": "home office allowance",
};
const WIDERRUFSGRUND_EN: Record<string, string> = {
  "wirtschaftliche Notlage des Unternehmens": "economic hardship of the company", "erheblicher Leistungsabfall": "a significant decline in performance",
  Pflichtverletzung: "breach of duty", "Wegfall der Funktion": "cessation of the function",
};
const ZULAGE_EN: Record<string, string> = { Funktionszulage: "function allowance", Leitungszulage: "management allowance", Erschwerniszulage: "hardship allowance", Schichtzulage: "shift allowance" };
const METHODE_EN: Record<string, string> = { [METHODE_TEXT.pauschal]: "flat rate per month", [METHODE_TEXT.einzel]: "individual valuation per journey", [METHODE_TEXT.fahrtenbuch]: "logbook" };
const FAHRERKREIS_EN: Record<string, string> = { [FAHRERKREIS[0]]: "the Employee only", [FAHRERKREIS[1]]: "the Employee and relatives living in the same household who hold a valid driving licence" };
const RUECKGABE_EN: Record<string, string> = {
  "Ende des Arbeitsverhältnisses": "end of the employment relationship", Freistellung: "release from work", Elternzeit: "parental leave",
  "Arbeitsunfähigkeit nach Ende der Entgeltfortzahlung": "incapacity for work after continued remuneration has ended",
  "Arbeitsunfähigkeit während der Entgeltfortzahlung": "incapacity for work during continued remuneration",
};
const ZUSCHUSS_EN: Record<string, string> = {
  "Zuschuss zum Deutschlandticket": "subsidy towards the Deutschlandticket", Essenszuschuss: "meal allowance", Kinderbetreuung: "childcare",
  "Gesundheit und Sport": "health and sport", Gutschein: "voucher",
};
const WEG_EN: Record<string, string> = { Direktversicherung: "direct insurance", Pensionskasse: "Pensionskasse", Pensionsfonds: "pension fund", Unterstützungskasse: "support fund" };

/** Wert der privaten Dienstwagennutzung im Monat, wenn gewählt. */
const dienstwagenWert = (l: Lage) => (hat(l, "D24") && ja(l.auswahl.D24, "privat") ? num(l, "D24", "wertMonat") ?? 0 : 0);
/** Widerruflicher Anteil am Gesamtverdienst mit Rechenweg (P-064, K-03, K-29). */
export function widerrufAnteilVon(l: Lage) {
  const w = l.auswahl.D22;
  const leistungen = liste(w?.leistungen);
  const betrag = (zahl(w?.betragMonat) ?? 0) + (leistungen.includes("Private Nutzung Dienstwagen (D24)") ? dienstwagenWert(l) : 0);
  const gesamt = l.person.gehalt + betrag + (leistungen.includes("Private Nutzung Dienstwagen (D24)") ? 0 : dienstwagenWert(l));
  const grenze = ja(w, "aufwendung") ? WIDERRUF.maxAufwendung : WIDERRUF.max;
  return { betrag, gesamt, anteil: gesamt > 0 ? betrag / gesamt : 0, grenze };
}

export const BAUSTEINE_D_FEST: Baustein[] = [
  {
    id: "D1", gruppe: "D", label: "Grundvergütung: Überprüfung und Entgeltgruppe", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Alle. Ergänzt § 6 um Gehaltsüberprüfung und Entgeltgruppe.",
    stichwoerter: ["Gehalt", "Grundgehalt", "Gehaltsüberprüfung", "Entgeltgruppe", "Gehaltsband"],
    felder: [
      { id: "ueberpruefung", label: "Gehaltsüberprüfung", typ: "auswahl", optionen: ["jährlich, ohne Anspruch auf Erhöhung", "keine feste Überprüfung"], pflicht: true, standard: "jährlich, ohne Anspruch auf Erhöhung" },
      { id: "gruppe", label: "Entgeltgruppe oder Gehaltsband (optional)", typ: "text" },
    ],
    text: (w, k) => `${w.ueberpruefung?.startsWith("jährlich") ? `Der Arbeitgeber überprüft das Gehalt von ${k.vorname} einmal im Jahr im Gespräch. Ein Anspruch auf Erhöhung folgt daraus nicht; die Überprüfung ist kein Vorbehalt, das Gehalt zu senken.` : "Eine regelmäßige Überprüfung des Gehalts ist nicht vereinbart."}${w.gruppe ? ` Das Gehalt gehört zur Entgeltgruppe ${w.gruppe}.` : ""}`,
    labelEn: "Basic pay: review and pay grade",
    textEn: (w, k) => `${w.ueberpruefung?.startsWith("jährlich") ? `The Employer reviews the salary of ${k.vorname} once a year in a meeting. This gives no entitlement to an increase; the review is not a reservation to reduce the salary.` : "No regular salary review is agreed."}${w.gruppe ? ` The salary belongs to pay grade ${frei(w.gruppe)}.` : ""}`,
    normen: ["§ 611a Abs. 2 BGB", "§ 614 BGB", "MiLoG", "EntgTranspG"], quellen: ["https://www.gesetze-im-internet.de/milog/__1.html", "Katalog Abschnitt 4, Baustein D1"],
    schutz: ["Überprüfung nie als Anspruch und nie als Widerruf"], sperren: ["Gehalt unter Mindestlohn", "Gehalt nur nach Vereinbarung"],
    regeln: [
      regel("P-042", "sperre", "Stundenlohn einschließlich abgegoltener Überstunden unter dem Mindestlohn", "MiLoG", ["C2"], (l) => {
        const extra = num(l, "C2", "stunden") ?? 0;
        const h = monatsstunden(l.person.wochenstunden) + extra;
        const ml = mindestlohnAm(l.person.eintritt > l.heute ? l.person.eintritt : l.heute);
        return wenn(h > 0 && l.person.gehalt / h < ml, `${euro(l.person.gehalt)} geteilt durch ${dezimal(h, 1)} Stunden einschließlich Pauschale ergibt ${euro(l.person.gehalt / h)} je Stunde, unter dem Mindestlohn von ${euro(ml)}.`);
      }),
      regel("P-043", "sperre", "Gehaltsumwandlung oder unbezahlte Reisezeit senkt den Stundenlohn unter den Mindestlohn", "MiLoG, § 850c ZPO", ["D25", "D29", "B6"], (l) => {
        const umwandlung = (wert(l, "D25", "modell") === "Gehaltsumwandlung" ? num(l, "D25", "rate") ?? 0 : 0) + (num(l, "D29", "betrag") ?? 0);
        const reise = hat(l, "B6") && wert(l, "B6", "reisezeit").includes("nicht als Arbeitszeit") ? num(l, "B6", "reisestundenMonat") ?? 0 : 0;
        const h = monatsstunden(l.person.wochenstunden) + reise;
        const ml = mindestlohnAm(l.person.eintritt > l.heute ? l.person.eintritt : l.heute);
        const rest = l.person.gehalt - umwandlung;
        return wenn((umwandlung > 0 || reise > 0) && h > 0 && rest / h < ml, `Nach Umwandlung oder mit unbezahlter Reisezeit bleiben ${euro(rest / h)} je Stunde, unter dem Mindestlohn von ${euro(ml)}.`);
      }),
    ],
  },
  {
    id: "D16", gruppe: "D", label: "Dreizehntes Gehalt und feste Sonderzahlung", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Firmen mit tarifnaher Vergütung.",
    stichwoerter: ["13. Gehalt", "Sonderzahlung", "dreizehntes Monatsgehalt", "Jahressonderzahlung"],
    felder: [
      { id: "bruchteil", label: "Höhe als Anteil eines Monatsgehalts (Prozent)", typ: "prozent", min: 0, standard: "100" },
      { id: "betrag", label: "oder fester Betrag in €", typ: "betrag", min: 0 },
      { id: "zweck", label: "Zweck", typ: "auswahl", optionen: ZWECK },
      { id: "monat", label: "Auszahlung mit dem Gehalt für", typ: "auswahl", optionen: ["November", "Dezember", "Juni"], pflicht: true, standard: "November" },
      { id: "teilzeit", label: "Teilzeit", typ: "auswahl", optionen: ["anteilig", "nicht anteilig"], standard: "anteilig" },
      { id: "teilzeitGrund", label: "Sachlicher Grund, wenn nicht anteilig", typ: "text", bei: { teilzeit: ["nicht anteilig"] } },
    ],
    text: (w, k) => `(1) ${k.vorname} erhält jährlich eine Sonderzahlung von ${w.betrag ? euro(zahl(w.betrag)!) : `${prozent((zahl(w.bruchteil) ?? 0) / 100)} eines Bruttomonatsgehalts`}, ausgezahlt mit dem Gehalt für ${w.monat}. Zweck: ${w.zweck}.\n` +
      (w.zweck === "Betriebstreue" ? `(2) Die Zahlung belohnt allein die Betriebstreue, ohne Bezug zur geleisteten Arbeit.` : `(2) Beginnt oder endet das Arbeitsverhältnis im Jahr, besteht der Anspruch anteilig für jeden vollen Monat der Beschäftigung. Ein Stichtag oder eine Rückzahlung bei Ausscheiden gilt nicht.`) +
      `\n(3) Kürzungen wegen Krankheit nur im Rahmen des § 4a EFZG; Mutterschutz führt nicht zur Kürzung.${w.teilzeit !== "nicht anteilig" ? " Bei Teilzeit gilt der Betrag im Verhältnis der Arbeitszeit." : ""}`,
    labelEn: "Thirteenth-month salary and fixed special payment",
    textEn: (w, k) => `(1) ${k.vorname} receives an annual special payment of ${w.betrag ? euroEn(zahl(w.betrag)!) : `${prozentEn((zahl(w.bruchteil) ?? 0) / 100)} of one gross monthly salary`}, paid with the salary for ${en(MONAT_EN, w.monat)}. Purpose: ${en(ZWECK_EN, w.zweck)}.\n` +
      (w.zweck === "Betriebstreue" ? `(2) The payment rewards loyalty to the company only, without reference to the work performed.` : `(2) If the employment relationship begins or ends during the year, the entitlement is pro rata for each full month of employment. No reference date and no repayment on leaving applies.`) +
      `\n(3) Reductions for illness only within the limits of § 4a EFZG; maternity protection does not lead to a reduction.${w.teilzeit !== "nicht anteilig" ? " For part-time work, the amount applies in proportion to working time." : ""}`,
    normen: ["§ 307 BGB", "§ 4a EFZG", "§ 612a BGB"], quellen: [BGB_307, "Katalog Abschnitt 4, Baustein D16"],
    urteile: [{ az: "BAG 10 AZR 612/10", kennung: "V" }, { az: "BAG 10 AZR 848/12", kennung: "P" }, { az: "BAG 10 AZR 266/14", kennung: "V" }, { az: "BAG 10 AZR 290/17", kennung: "V" }],
    schutz: ["Zweck Pflicht", "Bei Vergütung oder beidem anteilig, ohne Stichtag und Rückzahlung"], sperren: ["Stichtag bei Vergütungscharakter (R8)"],
    regeln: [
      regel("P-060", "pflicht", "Sonderzahlung mit Vergütungszweck: anteilige Regel ergänzt", "BAG 10 AZR 612/10", ["D16"], (l) => wenn(hat(l, "D16") && wert(l, "D16", "zweck") !== "Betriebstreue", "Die Sonderzahlung vergütet auch Arbeit: Lintelly hat die anteilige Zahlung bei Ein- und Austritt ergänzt.")),
      regel("K-04", "sperre", "Sonderzahlung mit Vergütungszweck, Zielbonus, Provision oder Tantieme mit Stichtag oder Bindung", "BAG 10 AZR 612/10, R8", ["D19"], (l) => {
        const lst = wert(l, "D19", "leistung");
        const pflichtig = STICHTAG_PFLICHTIG.includes(lst) && !(lst === "13. Gehalt (D16)" && wert(l, "D16", "zweck") === "Betriebstreue");
        return wenn(pflichtig, `Bindung oder Stichtag für „${lst}“ ist unwirksam, weil die Zahlung auch Arbeit vergütet. Stattdessen anteilige Zahlung.`);
      }),
    ],
  },
  {
    id: "D17", gruppe: "D", label: "Urlaubsgeld", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Tarifnahe Firmen.",
    stichwoerter: ["Urlaubsgeld"],
    felder: [
      { id: "betrag", label: "Betrag in €", typ: "betrag", min: 0 },
      { id: "voraussetzung", label: "Voraussetzung", typ: "auswahl", optionen: ["pauschal im Juni", "mit Antritt des Haupturlaubs"], pflicht: true, standard: "pauschal im Juni" },
    ],
    text: (w, k) => `${k.vorname} erhält ein zusätzliches Urlaubsgeld von ${euro(zahl(w.betrag) ?? 0)}, ${w.voraussetzung}. Es ist eine Zusatzleistung zum Urlaub und kein Teil des Urlaubsentgelts nach § 11 BUrlG. Der gesetzliche Urlaub bleibt unberührt. Im Ein- und Austrittsjahr anteilig.`,
    labelEn: "Holiday pay",
    textEn: (w, k) => `${k.vorname} receives additional holiday pay of ${euroEn(zahl(w.betrag) ?? 0)}, ${en({ "pauschal im Juni": "as a lump sum in June", "mit Antritt des Haupturlaubs": "when the main annual leave begins" }, w.voraussetzung)}. It is a benefit in addition to leave and not part of holiday remuneration under § 11 BUrlG. The statutory leave entitlement remains unaffected. Pro rata in the year of joining and the year of leaving.`,
    normen: ["§ 11 BUrlG", "§ 307 BGB"], quellen: ["https://www.gesetze-im-internet.de/burlg/__11.html", "Katalog Abschnitt 4, Baustein D17"],
    schutz: ["Name und Zweck klar", "Keine Kürzung des Mindesturlaubs"], sperren: ["Verknüpfung mit Verzicht auf Urlaub"],
  },
  {
    id: "D18", gruppe: "D", label: "Weihnachtsgeld und Gratifikation (Betriebstreue)", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Firmen, die Treue honorieren wollen.",
    stichwoerter: ["Weihnachtsgeld", "Gratifikation", "Treue"],
    felder: [
      { id: "betrag", label: "Betrag in €", typ: "betrag", min: 0 },
      { id: "zweck", label: "Zweck", typ: "auswahl", optionen: ["Betriebstreue"], standard: "Betriebstreue" },
      { id: "stichtag", label: "Stichtag (Arbeitsverhältnis besteht am)", typ: "text", pflicht: true, standard: "01.12. des Jahres" },
    ],
    text: (w, k) => `${k.vorname} erhält ein Weihnachtsgeld von ${euro(zahl(w.betrag) ?? 0)}, wenn das Arbeitsverhältnis am ${w.stichtag} besteht. Die Zahlung belohnt allein die Betriebstreue, ohne Bezug zur geleisteten Arbeit; sie wird deshalb nicht nach Arbeitsleistung gekürzt.`,
    labelEn: "Christmas bonus and gratuity (loyalty)",
    textEn: (w, k) => `${k.vorname} receives a Christmas bonus of ${euroEn(zahl(w.betrag) ?? 0)} if the employment relationship exists on ${frei(w.stichtag)}. The payment rewards loyalty to the company only, without reference to the work performed; it is therefore not reduced according to work performance.`,
    normen: ["§ 307 BGB", "§ 611a BGB"], quellen: [BGB_307, "Katalog Abschnitt 4, Baustein D18"],
    schutz: ["Pflichtsatz ohne Bezug zur geleisteten Arbeit", "Keine Kürzung nach Leistung"], sperren: ["Betriebstreue und Kürzung nach Leistung zugleich"],
  },
  {
    id: "D19", gruppe: "D", label: "Rückzahlungs- und Bindungsklausel für Sonderzahlungen", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Nur Zahlungen mit reinem Betriebstreuecharakter (D18).",
    stichwoerter: ["Rückzahlung Weihnachtsgeld", "Bindung", "Stichtag", "Rückzahlungsklausel"],
    felder: [
      { id: "leistung", label: "Für welche Zahlung?", typ: "auswahl", optionen: ["Weihnachtsgeld (D18)", "Treueprämie (D32)", ...STICHTAG_PFLICHTIG], pflicht: true, standard: "Weihnachtsgeld (D18)" },
      { id: "betrag", label: "Höhe der Zahlung in €", typ: "betrag", pflicht: true, min: 0 },
      { id: "bindungBis", label: "Bindung bis", typ: "auswahl", optionen: [`${SZ.bisMonatsgehaltStichtag} des Folgejahres`, `${SZ.abMonatsgehaltStichtag} des Folgejahres`], pflicht: true },
      { id: "gilt", label: "Rückzahlung bei", typ: "mehrfach", optionen: ["Eigenkündigung", "verhaltensbedingter Kündigung durch den Arbeitgeber", "betriebsbedingter Kündigung", "Aufhebungsvertrag auf Wunsch des Arbeitgebers"], pflicht: true, standard: "Eigenkündigung|verhaltensbedingter Kündigung durch den Arbeitgeber" },
    ],
    text: (w, k) => `Scheidet ${k.vorname} bis zum ${w.bindungBis} aus (${liste(w.gilt).join(" oder ")}), ist die Zahlung „${w.leistung}“ zurückzuzahlen. Bei Kündigung durch den Arbeitgeber aus betrieblichen oder personenbedingten Gründen und bei einem Aufhebungsvertrag auf Wunsch des Arbeitgebers entfällt die Rückzahlung.`,
    labelEn: "Repayment and retention clause for special payments",
    textEn: (w, k) => `If ${k.vorname} leaves by ${en(BINDUNG_EN, w.bindungBis)} (${liste(w.gilt).map((x) => en(GILT_EN, x)).join(" or ")}), the payment “${en(LEISTUNG_EN, w.leistung)}” must be repaid. In the event of dismissal by the Employer for operational reasons or for reasons relating to the person, and in the event of a termination agreement at the request of the Employer, there is no repayment.`,
    normen: ["§ 307 BGB", "Art. 12 GG"], quellen: [BGB_307, "Katalog Abschnitt 4, Baustein D19"],
    schutz: ["Bindungsdauer nach Verhältnis zu Monatsgehalt", "nur Eigenkündigung oder verhaltensbedingte Kündigung"], sperren: ["Bindung bei Mischcharakter", "über das zulässige Maß", "bei Betriebsschließung"],
    regeln: [
      regel("P-067", "sperre", "Bindung länger als nach Höhe zulässig, oder Bagatellbetrag mit Bindung", "Linie BAG (Aktenzeichen prüfen)", ["D19"], (l) => {
        const b = num(l, "D19", "betrag") ?? 0;
        if (b <= SZ.bagatellEuro) return `Zahlungen bis ${euro(SZ.bagatellEuro)} dürfen nicht binden.`;
        const lang = wert(l, "D19", "bindungBis").startsWith(SZ.abMonatsgehaltStichtag);
        return wenn(lang && b < l.person.gehalt, `Unter einem Monatsgehalt (${euro(l.person.gehalt)}) bindet die Zahlung höchstens bis ${SZ.bisMonatsgehaltStichtag} des Folgejahres.`);
      }),
      regel("P-068", "sperre", "Rückzahlung auch bei betriebsbedingter Kündigung", "§ 307 BGB", ["D19"], (l) => wenn(liste(wert(l, "D19", "gilt")).some((x) => /betriebsbedingt|Wunsch des Arbeitgebers/.test(x)), "Keine Rückzahlung bei betriebsbedingter Kündigung oder einem Aufhebungsvertrag auf Wunsch des Arbeitgebers.")),
    ],
  },
  {
    id: "D20", gruppe: "D", label: "Zulagen (Funktion, Erschwernis, Schicht, Leitung)", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Alle.",
    stichwoerter: ["Zulage", "Funktionszulage", "Leitungszulage", "Erschwerniszulage"],
    felder: [
      { id: "art", label: "Art", typ: "auswahl", optionen: ["Funktionszulage", "Leitungszulage", "Erschwerniszulage", "Schichtzulage"], pflicht: true },
      { id: "betrag", label: "Betrag je Monat in €", typ: "betrag", min: 0 },
      { id: "funktion", label: "Gebunden an die Funktion", typ: "text", pflicht: true },
      { id: "ankuendigung", label: "Ankündigung beim Wegfall der Funktion", typ: "auswahl", optionen: ["einen Monat zum Monatsende", "zum Ende des Folgemonats"], pflicht: true, standard: "einen Monat zum Monatsende" },
    ],
    text: (w, k) => `${k.vorname} erhält eine ${w.art} von ${euro(zahl(w.betrag) ?? 0)} im Monat, solange die Funktion „${w.funktion}“ ausgeübt wird. Entfällt die Funktion, endet die Zulage mit einer Ankündigung von ${w.ankuendigung}.`,
    labelEn: "Allowances (function, hardship, shift, management)",
    textEn: (w, k) => `${k.vorname} receives a ${en(ZULAGE_EN, w.art)} of ${euroEn(zahl(w.betrag) ?? 0)} per month for as long as the function “${frei(w.funktion)}” is performed. If the function ceases, the allowance ends ${en({ "einen Monat zum Monatsende": "with one month's notice to the end of a month", "zum Ende des Folgemonats": "with notice to the end of the following month" }, w.ankuendigung)}.`,
    normen: ["§ 2 Abs. 1 Satz 2 Nr. 7 NachwG"], quellen: ["https://www.gesetze-im-internet.de/nachwg/__2.html", "Katalog Abschnitt 4, Baustein D20"],
    schutz: ["Entfall nur bei Wegfall der Funktion mit Ankündigung"], sperren: ["Zulage freiwillig und jederzeit widerruflich (R3)"],
  },
  {
    id: "D21", gruppe: "D", label: "Freiwilligkeitsvorbehalt", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Sonderzahlungen, die der Arbeitgeber nach Lage zahlen will, ohne Anspruch.",
    stichwoerter: ["Freiwilligkeitsvorbehalt", "freiwillig", "kein Rechtsanspruch", "betriebliche Übung"],
    felder: [{ id: "leistungen", label: "Für welche Leistungen?", typ: "mehrfach", optionen: FREIWILLIG_OPTIONEN, pflicht: true }],
    text: (w) => `Die Leistungen ${liste(w.leistungen).join(", ")} zahlt der Arbeitgeber freiwillig. Auch eine wiederholte Zahlung begründet keinen Anspruch für die Zukunft. Dieser Vorbehalt gilt nicht für ausdrücklich zugesagte Leistungen und nicht für individuelle Vereinbarungen, gleich ob vorher oder nachher getroffen (§ 305b BGB).`,
    labelEn: "Voluntary payment reservation",
    textEn: (w) => `The Employer pays the benefits ${liste(w.leistungen).map((x) => en(LEISTUNG_EN, x)).join(", ")} voluntarily. Even repeated payment gives no entitlement for the future. This reservation does not apply to expressly promised benefits or to individual agreements, whether made before or after (§ 305b BGB).`,
    normen: ["§ 307 BGB", "§ 305b BGB", "§ 308 Nr. 4 BGB"], quellen: [BGB_307, "Katalog Abschnitt 4, Baustein D21"],
    urteile: [{ az: "BAG 10 AZR 526/10", kennung: "V" }, { az: "BAG 10 AZR 109/22", kennung: "V" }, { az: "BAG 5 AZR 627/06", kennung: "P" }],
    schutz: ["Nur für Sonderzahlungen", "Pflichtsatz zu individuellen Vereinbarungen"], sperren: ["zusammen mit Widerrufsvorbehalt (R3)", "auf Provision, Zielbonus, Grundgehalt", "Pauschalvorbehalt für alle Leistungen"],
    regeln: [
      regel("P-061", "sperre", "Freiwilligkeitsvorbehalt auf laufendes Entgelt", "BAG 5 AZR 627/06 (Aktenzeichen prüfen)", ["D21"], (l) => {
        const x = liste(wert(l, "D21", "leistungen")).filter((y) => LAUFEND.includes(y));
        return wenn(x.length > 0, `Kein Freiwilligkeitsvorbehalt für laufendes Entgelt: ${x.join(", ")}.`);
      }),
      regel("K-02", "sperre", "D21 auf Grundgehalt, Provision, Zielbonus mit Vereinbarung oder regelmäßige Zulage", "Katalog K-02", ["D21"], (l) => wenn(liste(wert(l, "D21", "leistungen")).some((y) => LAUFEND.includes(y)), "Freiwilligkeit passt nicht zu laufendem Entgelt.")),
      regel("P-062", "pflicht", "Satz zu individuellen Vereinbarungen ergänzt", "BAG 10 AZR 109/22", ["D21"], () => "Der Vorbehalt nimmt ausdrücklich zugesagte Leistungen und individuelle Vereinbarungen aus."),
      regel("K-01", "sperre", "Freiwilligkeit und Widerruf für dieselbe Leistung", "BAG 10 AZR 526/10, R3", ["D21", "D22"], (l) => {
        const n = (s: string) => s.replace(/\s*\(D\d+\)/, "");
        const a = new Set(liste(wert(l, "D21", "leistungen")).map(n));
        const b = liste(wert(l, "D22", "leistungen")).map(n).filter((x) => a.has(x));
        return wenn(b.length > 0, `${b.join(", ")} steht unter Freiwilligkeits- und Widerrufsvorbehalt. Eine Wahl je Leistung.`);
      }),
    ],
  },
  {
    id: "D22", gruppe: "D", label: "Widerrufsvorbehalt", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Zusatzleistungen (Zulagen, Dienstwagen, Zuschüsse), nicht das Grundgehalt.",
    stichwoerter: ["Widerrufsvorbehalt", "widerruflich", "Widerruf"],
    felder: [
      { id: "leistungen", label: "Welche Leistungen?", typ: "mehrfach", optionen: WIDERRUF_OPTIONEN, pflicht: true },
      { id: "betragMonat", label: "Wert der widerruflichen Leistungen je Monat in € (ohne Dienstwagen, der wird aus D24 gerechnet)", typ: "betrag", min: 0, standard: "0" },
      { id: "aufwendung", label: "Ersetzen die Leistungen Aufwendungen der Person?", typ: "janein", standard: "nein" },
      { id: "gruende", label: "Widerrufsgründe", typ: "mehrfach", optionen: ["wirtschaftliche Notlage des Unternehmens", "erheblicher Leistungsabfall", "Pflichtverletzung", "Wegfall der Funktion"] },
      { id: "ankuendigung", label: "Ankündigungsfrist", typ: "auswahl", optionen: ["einen Monat zum Monatsende", "zum Ende des Quartals"], standard: "einen Monat zum Monatsende" },
    ],
    text: (w, k) => `Der Arbeitgeber kann ${liste(w.leistungen).join(", ")} aus folgenden Gründen widerrufen: ${liste(w.gruende).join(", ")}. Er übt den Widerruf nach billigem Ermessen aus und kündigt ihn mit einer Frist von ${w.ankuendigung ?? "einen Monat zum Monatsende"} in Textform an. Das Grundgehalt und der Mindestlohn von ${k.vorname} sind nie widerruflich.`,
    labelEn: "Revocation reservation",
    textEn: (w, k) => `The Employer may revoke ${liste(w.leistungen).map((x) => en(LEISTUNG_EN, x)).join(", ")} for the following reasons: ${liste(w.gruende).map((x) => en(WIDERRUFSGRUND_EN, x)).join(", ")}. It exercises the revocation at its reasonable discretion and announces it in text form ${en({ "einen Monat zum Monatsende": "with one month's notice to the end of a month", "zum Ende des Quartals": "with notice to the end of the quarter" }, w.ankuendigung ?? "einen Monat zum Monatsende")}. The basic salary and the minimum wage of ${k.vorname} are never revocable.`,
    normen: ["§ 308 Nr. 4 BGB", "§ 307 BGB", "§ 315 BGB"], quellen: [BGB_308, "Katalog Abschnitt 4, Baustein D22"],
    urteile: [{ az: "BAG 5 AZR 364/04", kennung: "V" }],
    schutz: [`Widerruflicher Anteil höchstens ${prozent(WIDERRUF.max)} der Gesamtvergütung (Aufwendungsersatz ${prozent(WIDERRUF.maxAufwendung)})`, "Gründe Pflicht", "Ankündigung Pflicht"], sperren: ["Widerruf jederzeit ohne Grund", "Grundgehalt", "zusammen mit D21 (R3)", "unter Mindestlohn"],
    regeln: [
      regel("P-064", "sperre", "Widerruflicher Anteil über der Grenze", "BAG 5 AZR 364/04 (Prozent prüfen)", ["D22"], (l) => {
        const a = widerrufAnteilVon(l);
        return wenn(a.anteil > a.grenze, `Widerruflich sind ${euro(a.betrag)} von ${euro(a.gesamt)} im Monat, also ${prozent(Math.round(a.anteil * 1000) / 1000)}. Höchstens ${prozent(a.grenze)}.`);
      }),
      regel("K-03", "sperre", "D22 über der Widerrufsgrenze", "Katalog K-03", ["D22"], (l) => { const a = widerrufAnteilVon(l); return wenn(a.anteil > a.grenze, `Rechenweg: ${euro(a.betrag)} geteilt durch ${euro(a.gesamt)}.`); }),
      regel("P-065", "sperre", "Widerruf ohne Gründe oder Ankündigung", "§ 308 Nr. 4 BGB", ["D22"], (l) => wenn(!liste(wert(l, "D22", "gruende")).length || leer(wert(l, "D22", "ankuendigung")), "Widerrufsgründe und Ankündigungsfrist sind Pflicht.")),
      regel("P-066", "sperre", "Widerruf auf Grundgehalt, Tariflohn oder Mindestlohn", "Rechtsprechung", ["D22"], (l) => wenn(liste(wert(l, "D22", "leistungen")).includes("Grundgehalt"), "Das Grundgehalt ist nicht widerruflich.")),
    ],
  },
  {
    id: "D23", gruppe: "D", label: "Anrechnungsvorbehalt bei Gehaltserhöhungen", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Firmen mit übertariflicher Zulage.",
    stichwoerter: ["Anrechnung", "übertarifliche Zulage"],
    felder: [
      { id: "zulage", label: "Welche Zulage?", typ: "text", pflicht: true },
      { id: "auf", label: "Anrechenbar auf", typ: "auswahl", optionen: ["Erhöhungen des Tarifgehalts", "allgemeine Erhöhungen des Grundgehalts"], pflicht: true },
    ],
    text: (w) => `Die Zulage „${w.zulage}“ kann auf ${w.auf} angerechnet werden. Persönliche Leistungszulagen sind davon ausgenommen.`,
    labelEn: "Offsetting reservation for pay increases",
    textEn: (w) => `The allowance “${frei(w.zulage)}” may be offset against ${en({ "Erhöhungen des Tarifgehalts": "increases in the collectively agreed salary", "allgemeine Erhöhungen des Grundgehalts": "general increases in the basic salary" }, w.auf)}. Personal performance allowances are excluded from this.`,
    normen: ["§ 307 BGB", "§ 87 Abs. 1 Nr. 10 BetrVG"], quellen: [BGB_307, "Katalog Abschnitt 4, Baustein D23"],
    schutz: ["Nur auf Tarif- oder Grundgehaltserhöhungen"], sperren: ["Anrechnung ohne Bezug"],
  },
  {
    // Version 2 (Strang 29, F13): Listenpreis, Methode, Fahrerkreis, Führerschein mit Meldepflicht, keine Ortung, Auslandsfahrten.
    id: "D24", gruppe: "D", label: "Dienstwagen mit privater Nutzung", risiko: "gelb", version: 2, fuer: OHNE_WS,
    passt: "Außendienst, Führungskräfte, Beratung.",
    stichwoerter: ["Dienstwagen", "Firmenwagen", "Auto", "Leasing", "Privatnutzung"],
    felder: [
      { id: "fahrzeug", label: "Fahrzeugklasse oder Modell", typ: "text", pflicht: true },
      { id: "privat", label: "Private Nutzung erlaubt?", typ: "janein", pflicht: true, standard: "ja" },
      { id: "wertMonat", label: "Geldwerter Vorteil je Monat in € (für die Prüfung der Widerrufsgrenze)", typ: "betrag", min: 0, bei: { privat: ["ja"] } },
      { id: "listenpreis", label: "Listenpreis bei Erstzulassung mit Sonderausstattung in € (aus den Fahrzeugunterlagen)", typ: "betrag", min: 0, bei: { privat: ["ja"] } },
      { id: "methode", label: "Methode für den geldwerten Vorteil", typ: "auswahl", optionen: Object.values(METHODE_TEXT), standard: METHODE_TEXT.pauschal, bei: { privat: ["ja"] } },
      { id: "fahrerkreis", label: "Wer darf fahren?", typ: "auswahl", optionen: FAHRERKREIS, standard: FAHRERKREIS[0] },
      { id: "ausland", label: "Fahrten ins Ausland", typ: "auswahl", optionen: ["nein", "ja, nach vorheriger Zustimmung"], standard: "nein" },
      { id: "kosten", label: "Kosten", typ: "text", pflicht: true, standard: "Leasing, Kraftstoff, Versicherung und Wartung trägt der Arbeitgeber" },
      { id: "rueckgabe", label: "Rückgabe bei", typ: "mehrfach", optionen: ["Ende des Arbeitsverhältnisses", "Freistellung", "Elternzeit", "Arbeitsunfähigkeit nach Ende der Entgeltfortzahlung", "Arbeitsunfähigkeit während der Entgeltfortzahlung"], pflicht: true, standard: "Ende des Arbeitsverhältnisses|Elternzeit|Arbeitsunfähigkeit nach Ende der Entgeltfortzahlung" },
    ],
    text: (w, k) => `(1) ${k.vorname} erhält einen Dienstwagen (${w.fahrzeug}). ${ja(w, "privat") ? "Die private Nutzung ist erlaubt; sie ist Teil der Vergütung und wird nach den steuerlichen Regeln versteuert." : "Der Wagen ist nur dienstlich zu nutzen."} ${w.kosten}.\n(2) Der Wagen ist zurückzugeben bei ${liste(w.rueckgabe).join(", ")}. Während der Entgeltfortzahlung im Krankheitsfall und im Mutterschutz bleibt die private Nutzung erhalten.${ja(w, "privat") ? " Entzieht der Arbeitgeber die private Nutzung ohne wirksamen Widerrufsvorbehalt, schuldet er eine Nutzungsentschädigung." : ""}\n(3) Für Schäden haftet ${k.vorname} nach den Grundsätzen des innerbetrieblichen Schadensausgleichs: bei leichter Fahrlässigkeit nicht, bei mittlerer anteilig, bei grober Fahrlässigkeit und Vorsatz in der Regel voll. Bußgelder für eigene Verstöße trägt die Person.${ja(w, "privat") ? `\n(4) Grundlage des geldwerten Vorteils ist der Listenpreis${zahl(w.listenpreis) !== null ? ` von ${euro(zahl(w.listenpreis)!)}` : ""}, im Kalenderjahr nach der Methode „${w.methode || METHODE_TEXT.pauschal}“.` : ""}\n(5) Fahren dürfen ${w.fahrerkreis || FAHRERKREIS[0]}. ${k.vorname} zeigt den Führerschein vor der ersten Übergabe und danach regelmäßig vor und meldet den Entzug der Fahrerlaubnis oder ein Fahrverbot sofort; dann wird nicht mehr gefahren.\n(6) Ein Ortungs- oder Telematiksystem ist nicht eingebaut; ein späterer Einbau nur nach vorheriger Information und, wo ein Betriebsrat besteht, mit Betriebsvereinbarung. Fahrten ins Ausland ${w.ausland && w.ausland !== "nein" ? "sind nach vorheriger Zustimmung in Textform erlaubt" : "sind nicht erlaubt"}.`,
    labelEn: "Company car with private use",
    textEn: (w, k) => `(1) ${k.vorname} receives a company car (${frei(w.fahrzeug)}). ${ja(w, "privat") ? "Private use is permitted; it is part of the remuneration and is taxed under the tax rules." : "The car may be used for business purposes only."} ${frei(w.kosten)}.\n(2) The car must be returned in the event of ${liste(w.rueckgabe).map((x) => en(RUECKGABE_EN, x)).join(", ")}. During continued remuneration in case of illness and during maternity protection, private use continues.${ja(w, "privat") ? " If the Employer withdraws private use without an effective revocation reservation, it owes compensation for loss of use." : ""}\n(3) ${k.vorname} is liable for damage under the principles of limited employee liability (innerbetrieblicher Schadensausgleich): not liable for slight negligence, liable pro rata for moderate negligence, and as a rule fully liable for gross negligence and intent. Fines for own offences are borne by the Employee.${ja(w, "privat") ? `\n(4) The taxable benefit is based on the list price${zahl(w.listenpreis) !== null ? ` of ${euroEn(zahl(w.listenpreis)!)}` : ""}, in the calendar year using the method “${en(METHODE_EN, w.methode || METHODE_TEXT.pauschal)}”.` : ""}\n(5) The car may be driven by ${en(FAHRERKREIS_EN, w.fahrerkreis || FAHRERKREIS[0])}. ${k.vorname} presents the driving licence before the first handover and regularly thereafter, and reports any withdrawal of the driving licence or any driving ban immediately; the car is then no longer driven.\n(6) No tracking or telematics system is installed; it may be installed later only after prior notice and, where a works council exists, under a works agreement. Trips abroad ${w.ausland && w.ausland !== "nein" ? "are permitted with prior consent in text form" : "are not permitted"}.`,
    normen: ["§ 6 Abs. 1 Nr. 4 EStG", "§ 8 EStG", "§ 3 EFZG", "§ 21 StVG", "§ 26 BDSG", "§ 87 Abs. 1 Nr. 6 BetrVG"], quellen: ["https://www.gesetze-im-internet.de/entgfg/__3.html", "Katalog Abschnitt 4, Baustein D24"],
    urteile: [{ az: "BAG GS 1/89", kennung: "P" }, { az: "BAG 5 AZR 651/10", kennung: "P" }],
    schutz: ["Wert der Privatnutzung zählt für die Widerrufsgrenze", "keine Rückgabe während der Entgeltfortzahlung"], sperren: ["Entzug bei Krankheit vor Ende der Entgeltfortzahlung", "Ausschluss der Nutzungsentschädigung ohne Widerrufsvorbehalt", "Haftung für leichte Fahrlässigkeit (R17)"],
    regeln: [
      regel("P-069", "sperre", "Entzug des Dienstwagens bei Krankheit vor Ende der Entgeltfortzahlung", "§ 3 EFZG", ["D24"], (l) => wenn(liste(wert(l, "D24", "rueckgabe")).includes("Arbeitsunfähigkeit während der Entgeltfortzahlung"), `Während der ersten ${WERTE.entgeltfortzahlungTage.wert} Tage der Arbeitsunfähigkeit gehört die private Nutzung zur fortzuzahlenden Vergütung.`)),
      regel("K-29", "hinweis", "Privatnutzung ohne Widerrufsregel: Wert zählt zur Gesamtvergütung", "Katalog K-29", ["D24"], (l) => wenn(ja(l.auswahl.D24, "privat") && !liste(wert(l, "D22", "leistungen")).includes("Private Nutzung Dienstwagen (D24)"), "Ohne Widerrufsvorbehalt für den Dienstwagen kann die private Nutzung nur per Vertrag enden. Ihr Wert zählt zur Gesamtvergütung in der Prüfung der Widerrufsgrenze.")),
      regel("K-30", "warnung", "Herausgabe bei Freistellung ohne wirksamen Widerrufsvorbehalt", "BAG 5 AZR 651/10 (Aktenzeichen prüfen)", ["D24"], (l) => wenn(ja(l.auswahl.D24, "privat") && liste(wert(l, "D24", "rueckgabe")).includes("Freistellung") && !liste(wert(l, "D22", "leistungen")).includes("Private Nutzung Dienstwagen (D24)"), "Rückgabe bei Freistellung ohne Widerrufsvorbehalt (D22) führt zu Nutzungsausfallentschädigung.")),
    ],
  },
  {
    // Version 2 (Strang 30, F16): Preisempfehlung für den geldwerten Vorteil aus lib/regeln/dienstrad.ts, E-Bike mit Kennzeichen gesperrt (P-105, P-106).
    id: "D25", gruppe: "D", label: "Dienstrad (Zuschuss oder Gehaltsumwandlung)", risiko: "gelb", version: 2, fuer: ARBEITNEHMER,
    passt: "Firmen mit Leasingangebot.",
    stichwoerter: ["Dienstrad", "Jobrad", "Fahrradleasing", "E-Bike"],
    felder: [
      { id: "modell", label: "Modell", typ: "auswahl", optionen: ["Zuschuss des Arbeitgebers", "Gehaltsumwandlung"], pflicht: true },
      { id: "rate", label: "Monatliche Rate in €", typ: "betrag", pflicht: true, min: 0 },
      { id: "ende", label: "Bei Ende des Arbeitsverhältnisses", typ: "auswahl", optionen: ["Rückgabe, Restkosten trägt der Arbeitgeber", "Übernahme durch die Person zum Restwert"], pflicht: true },
      { id: "uvp", label: "Unverbindliche Preisempfehlung des Rads in € (für den geldwerten Vorteil)", typ: "betrag", min: 0, bei: { modell: ["Gehaltsumwandlung"] } },
      { id: "kfz", label: "E-Bike über 25 km/h mit Kennzeichen?", typ: "janein", standard: "nein" },
    ],
    text: (w, k) => `${k.vorname} erhält ein Dienstrad über einen Leasingvertrag des Arbeitgebers. ${w.modell === "Gehaltsumwandlung" ? `Dafür wird das Bruttogehalt um ${euro(zahl(w.rate) ?? 0)} im Monat gekürzt; der Stundenlohn bleibt dabei über dem Mindestlohn.` : `Der Arbeitgeber trägt die Rate von ${euro(zahl(w.rate) ?? 0)} zusätzlich zum Gehalt.`} Ruht das Arbeitsverhältnis ohne Entgelt (Elternzeit, Krankheit nach Ende der Entgeltfortzahlung), trägt der Arbeitgeber die Rate weiter oder nimmt das Rad zurück, ohne Kosten für die Person. Bei Ende des Arbeitsverhältnisses: ${w.ende}.`,
    labelEn: "Company bicycle (subsidy or salary conversion)",
    textEn: (w, k) => `${k.vorname} receives a company bicycle under a leasing contract of the Employer. ${w.modell === "Gehaltsumwandlung" ? `For this, the gross salary is reduced by ${euroEn(zahl(w.rate) ?? 0)} per month; the hourly wage remains above the minimum wage.` : `The Employer pays the instalment of ${euroEn(zahl(w.rate) ?? 0)} in addition to the salary.`} If the employment relationship is suspended without pay (parental leave, illness after continued remuneration has ended), the Employer continues to pay the instalment or takes back the bicycle, at no cost to the Employee. At the end of the employment relationship: ${en({ "Rückgabe, Restkosten trägt der Arbeitgeber": "return of the bicycle, the Employer bears the remaining costs", "Übernahme durch die Person zum Restwert": "the Employee takes over the bicycle at its residual value" }, w.ende)}.`,
    normen: ["§ 3 Nr. 37 EStG", "§ 6 Abs. 1 Nr. 4 EStG", "MiLoG"], quellen: ["https://www.gesetze-im-internet.de/estg/__3.html", "Katalog Abschnitt 4, Baustein D25"],
    schutz: ["Netto nach Umwandlung über Mindestlohn", "Regel für das Ende Pflicht"], sperren: ["Umwandlung unter Mindestlohn", "Rückforderung gezahlter Raten ohne Regel"],
    regeln: [regel("K-39", "sperre", "Gehaltsumwandlung Dienstrad unter Mindestlohn", "MiLoG, Katalog K-39", ["D25"], (l) => {
      if (wert(l, "D25", "modell") !== "Gehaltsumwandlung") return null;
      const h = monatsstunden(l.person.wochenstunden);
      const rest = l.person.gehalt - (num(l, "D25", "rate") ?? 0);
      const ml = mindestlohnAm(l.person.eintritt > l.heute ? l.person.eintritt : l.heute);
      return wenn(h > 0 && rest / h < ml, `Nach der Umwandlung bleiben ${euro(rest / h)} je Stunde, unter dem Mindestlohn von ${euro(ml)}.`);
    }),
    // Derselbe Rechner wie in der Entgeltumwandlung (lib/module/umwandlung.ts): erste Überlassung ist der Beginn des Vertrags.
    regel("P-105", "hinweis", "Dienstrad aus Gehaltsumwandlung: geldwerter Vorteil als Sachbezug", "Ländererlasse vom 09.01.2020", ["D25"], (l) => {
      if (wert(l, "D25", "modell") !== "Gehaltsumwandlung" || ja(l.auswahl.D25, "kfz")) return null;
      const ab = l.person.eintritt > l.heute ? l.person.eintritt : l.heute;
      const v = dienstradVorteil({ uvp: num(l, "D25", "uvp"), ersteUeberlassung: ab, monat: ab.slice(0, 7), kfz: false });
      return v.berechnet ? `Geldwerter Vorteil ${euro(v.wert)} im Monat, als Sachbezug an das Lohnbüro melden: ${v.schritte.join("; ")}.` : `Geldwerter Vorteil nicht berechnet: ${v.grund}`;
    }),
    regel("P-106", "sperre", "E-Bike mit Kennzeichen ist kein Dienstrad", "BMF-Schreiben vom 03.03.2022, Rn. 3", ["D25"], (l) => wenn(ja(l.auswahl.D25, "kfz"), `${KFZ_GRUND} Im Vertrag dafür den Baustein D24 nehmen.`)),
    ],
  },
  {
    id: "D26", gruppe: "D", label: "Diensthandy, Laptop und Arbeitsmittel mit privater Nutzung", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Alle.",
    stichwoerter: ["Diensthandy", "Laptop", "Handy privat"],
    felder: [
      { id: "geraete", label: "Geräte", typ: "text", pflicht: true, standard: "Laptop und Smartphone" },
      { id: "privat", label: "Private Nutzung erlaubt?", typ: "janein", pflicht: true, standard: "nein" },
    ],
    text: (w, k) => `${k.vorname} erhält für die Arbeit: ${w.geraete}. ${ja(w, "privat") ? "Die private Nutzung ist in angemessenem Umfang erlaubt; es gelten die Regeln zur privaten Nutzung von Internet und E-Mail (J2). Die Geräte bleiben Eigentum des Arbeitgebers." : "Die Geräte dienen nur der Arbeit und bleiben Eigentum des Arbeitgebers."} Rückgabe mit Ende des Arbeitsverhältnisses.`,
    labelEn: "Work phone, laptop and work equipment with private use",
    textEn: (w, k) => `${k.vorname} receives the following for work: ${frei(w.geraete)}. ${ja(w, "privat") ? "Private use is permitted to a reasonable extent; the rules on private use of internet and e-mail (J2) apply. The devices remain the property of the Employer." : "The devices are for work only and remain the property of the Employer."} They are to be returned at the end of the employment relationship.`,
    normen: ["§ 3 Nr. 45 EStG", "§ 26 BDSG"], quellen: ["https://www.gesetze-im-internet.de/estg/__3.html", "Katalog Abschnitt 4, Baustein D26"],
    schutz: ["Bei privater Nutzung folgen die Regeln aus J2"], sperren: ["private Nutzung ohne Regeln"],
  },
  {
    id: "D27", gruppe: "D", label: "Zuschüsse, Gutscheine und Sachbezüge", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Alle.",
    stichwoerter: ["Zuschuss", "Deutschlandticket", "Essenszuschuss", "Gutschein", "Sachbezug", "Benefits"],
    felder: [
      { id: "art", label: "Art", typ: "auswahl", optionen: ["Zuschuss zum Deutschlandticket", "Essenszuschuss", "Kinderbetreuung", "Gesundheit und Sport", "Gutschein"], pflicht: true },
      { id: "betrag", label: "Betrag je Monat in €", typ: "betrag", min: 0 },
      { id: "vorbehalt", label: "Vorbehalt (genau eine Wahl)", typ: "auswahl", optionen: ["keiner", "freiwillig (D21)", "widerruflich (D22)"], pflicht: true, standard: "keiner" },
    ],
    text: (w, k) => `${k.vorname} erhält zusätzlich zum ohnehin geschuldeten Arbeitslohn: ${w.art}, ${euro(zahl(w.betrag) ?? 0)} im Monat.${w.vorbehalt === "keiner" ? "" : ` Die Leistung ist ${w.vorbehalt?.replace(/\s*\(D\d+\)/, "")}.`} Sachbezüge zählen nicht zum Mindestlohn. Steuerliche Hinweise sind keine Rechtsberatung.`,
    labelEn: "Subsidies, vouchers and benefits in kind",
    textEn: (w, k) => `${k.vorname} receives, in addition to the wages already owed: ${en(ZUSCHUSS_EN, w.art)}, ${euroEn(zahl(w.betrag) ?? 0)} per month.${w.vorbehalt === "keiner" ? "" : ` The benefit is ${en({ "freiwillig (D21)": "voluntary", "widerruflich (D22)": "revocable" }, w.vorbehalt)}.`} Benefits in kind do not count towards the minimum wage. Tax notes are not legal advice.`,
    normen: ["§ 8 Abs. 1 und 4 EStG", "§ 3 Nr. 34a EStG", "§ 107 Abs. 2 GewO"], quellen: ["https://www.gesetze-im-internet.de/estg/__8.html", "Katalog Abschnitt 4, Baustein D27"],
    schutz: ["Zusätzlichkeit als Pflichttext"], sperren: ["Gutscheine statt Mindestlohn", "Gehaltsumwandlung in Sachbezüge ohne Hinweis"],
  },
  {
    id: "D28", gruppe: "D", label: "Mitarbeiterbeteiligung (VSOP, ESOP, Phantom Stock)", risiko: "gelb", version: 1, fuer: OHNE_WS,
    passt: "Start-ups und wachsende GmbH, Schlüsselpositionen.",
    stichwoerter: ["VSOP", "ESOP", "Phantom Stock", "Beteiligung", "Anteile", "Vesting"],
    felder: [
      { id: "modell", label: "Modell", typ: "auswahl", optionen: ["virtuelle Anteile (VSOP)", "echte Anteile (ESOP)", "Phantom Stock"], pflicht: true },
      { id: "plan", label: "Name und Datum der Planurkunde", typ: "text", pflicht: true },
    ],
    text: (w, k) => `${k.vorname} nimmt am Beteiligungsprogramm „${w.plan}“ teil (${w.modell}). Umfang, Vesting, Ausübung und Leaver-Regeln stehen allein in der Planurkunde. Bereits erdiente Rechte werden beim Ausscheiden nicht entschädigungslos entzogen.${w.modell === "echte Anteile (ESOP)" ? " Echte Geschäftsanteile werden nur in notarieller Form übertragen (§ 15 GmbHG)." : ""}`,
    labelEn: "Employee participation (VSOP, ESOP, phantom stock)",
    textEn: (w, k) => `${k.vorname} participates in the participation programme “${frei(w.plan)}” (${en({ "virtuelle Anteile (VSOP)": "virtual shares (VSOP)", "echte Anteile (ESOP)": "real shares (ESOP)", "Phantom Stock": "phantom stock" }, w.modell)}). Scope, vesting, exercise and leaver rules are set out exclusively in the plan document. Rights already vested are not withdrawn without compensation on leaving.${w.modell === "echte Anteile (ESOP)" ? " Real shares in the company are transferred only in notarised form (§ 15 GmbHG)." : ""}`,
    normen: ["§§ 305 ff. BGB", "§ 138 BGB", "§ 19a EStG", "§ 3 Nr. 39 EStG", "§ 15 GmbHG"], quellen: ["https://www.gesetze-im-internet.de/estg/__19a.html", "Katalog Abschnitt 4, Baustein D28"],
    urteile: [{ az: "BAG 10 AZR 351/07", kennung: "P" }],
    schutz: ["Nur mit gesonderter Planurkunde", "Kanzlei und Steuerberatung Pflicht"], sperren: ["Bad-Leaver-Entzug erdienter Anteile", "echte GmbH-Anteile nur im Arbeitsvertrag"],
    regeln: [regel("P-099", "pflicht", "Mitarbeiterbeteiligung: Planurkunde, Kanzlei und Steuerberatung", "§ 19a EStG, § 15 GmbHG", ["D28"], () => "Vermerk „nicht freigegeben“, bis Kanzlei und Steuerberatung die Planurkunde geprüft haben.")],
  },
  {
    id: "D29", gruppe: "D", label: "Entgeltumwandlung zur betrieblichen Altersversorgung", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Alle. Ergänzt § 12.",
    stichwoerter: ["bAV", "Altersversorgung", "Entgeltumwandlung", "Direktversicherung", "Betriebsrente"],
    felder: [
      { id: "weg", label: "Durchführungsweg", typ: "auswahl", optionen: ["Direktversicherung", "Pensionskasse", "Pensionsfonds", "Unterstützungskasse"], pflicht: true },
      { id: "traeger", label: "Versorgungsträger mit Anschrift", typ: "text", pflicht: true },
      { id: "betrag", label: "Umwandlungsbetrag je Monat in €", typ: "betrag", pflicht: true, min: 0 },
    ],
    text: (w, k) => `${k.vorname} wandelt ${euro(zahl(w.betrag) ?? 0)} im Monat in eine betriebliche Altersversorgung um (${w.weg}). Versorgungsträger ist ${w.traeger}. Der Arbeitgeber leitet ${prozent(WERTE.bavZuschussAnteil.wert)} des umgewandelten Betrags als Zuschuss weiter, soweit er Sozialversicherungsbeiträge spart (§ 1a Abs. 1a BetrAVG). Die Anwartschaft aus Entgeltumwandlung ist sofort unverfallbar (§ 1b Abs. 5 BetrAVG). Die Umwandlung kann die gesetzliche Rente mindern.`,
    labelEn: "Salary conversion for an occupational pension",
    textEn: (w, k) => `${k.vorname} converts ${euroEn(zahl(w.betrag) ?? 0)} per month into an occupational pension (${en(WEG_EN, w.weg)}). The pension provider is ${w.traeger}. The Employer passes on ${prozentEn(WERTE.bavZuschussAnteil.wert)} of the converted amount as a subsidy, to the extent that it saves social security contributions (§ 1a para. 1a BetrAVG). The entitlement from salary conversion vests immediately (§ 1b para. 5 BetrAVG). The conversion may reduce the statutory pension.`,
    normen: ["§ 1a BetrAVG", "§ 1b Abs. 5 BetrAVG", "§ 2 Abs. 1 Satz 2 Nr. 13 NachwG"], quellen: ["https://www.gesetze-im-internet.de/betravg/__1a.html", "Katalog Abschnitt 4, Baustein D29"],
    schutz: ["Versorgungsträger und Zuschuss Pflicht", "Hinweis zur Wirkung auf die Rente"], sperren: ["Umwandlung unter Mindestlohn"],
  },
  {
    id: "D30", gruppe: "D", label: "Arbeitgeberfinanzierte betriebliche Altersversorgung", risiko: "gelb", version: 1, fuer: OHNE_WS,
    passt: "Firmen mit Versorgungszusage.",
    stichwoerter: ["Versorgungszusage", "Betriebsrente", "Pensionszusage"],
    felder: [
      { id: "art", label: "Art der Zusage", typ: "auswahl", optionen: ["Beitragszusage mit Mindestleistung", "beitragsorientierte Leistungszusage"], pflicht: true },
      { id: "beitrag", label: "Beitrag des Arbeitgebers je Monat in €", typ: "betrag", pflicht: true, min: 0 },
      { id: "traeger", label: "Versorgungsträger mit Anschrift", typ: "text", pflicht: true },
    ],
    text: (w, k) => `Der Arbeitgeber zahlt für ${k.vorname} ${euro(zahl(w.beitrag) ?? 0)} im Monat in eine betriebliche Altersversorgung (${w.art}) beim Versorgungsträger ${w.traeger}. Unverfallbarkeit, Anpassung und Insolvenzsicherung richten sich nach dem Betriebsrentengesetz; eine Wartezeit verlängert die gesetzliche Unverfallbarkeit nicht.`,
    labelEn: "Employer-funded occupational pension",
    textEn: (w, k) => `The Employer pays ${euroEn(zahl(w.beitrag) ?? 0)} per month for ${k.vorname} into an occupational pension (${en({ "Beitragszusage mit Mindestleistung": "defined contribution commitment with minimum benefit", "beitragsorientierte Leistungszusage": "contribution-based defined benefit commitment" }, w.art)}) with the pension provider ${w.traeger}. Vesting, adjustment and insolvency protection are governed by the Company Pensions Act (BetrAVG); a waiting period does not extend statutory vesting.`,
    normen: ["§§ 1, 1b, 2, 7, 16 BetrAVG"], quellen: ["https://www.gesetze-im-internet.de/betravg/__1b.html", "Katalog Abschnitt 4, Baustein D30"],
    schutz: ["Unverfallbarkeit nach § 1b BetrAVG", "Hinweis Insolvenzsicherung"], sperren: ["Wartezeit, die die Unverfallbarkeit unterläuft"],
  },
  {
    id: "D31", gruppe: "D", label: "Arbeitgeberdarlehen und Gehaltsvorschuss", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Firmen mit Mitarbeiterdarlehen.",
    stichwoerter: ["Darlehen", "Gehaltsvorschuss", "Kredit"],
    felder: [
      { id: "betrag", label: "Betrag in €", typ: "betrag", pflicht: true, min: 0 },
      { id: "rate", label: "Tilgung je Monat in €", typ: "betrag", pflicht: true, min: 0 },
      { id: "zins", label: "Zins (Prozent im Jahr, 0 für zinslos)", typ: "prozent", min: 0, standard: "0" },
    ],
    text: (w, k) => `Der Arbeitgeber gewährt ${k.vorname} ein Darlehen von ${euro(zahl(w.betrag) ?? 0)}, verzinst mit ${prozent((zahl(w.zins) ?? 0) / 100)} im Jahr. Die Tilgung von ${euro(zahl(w.rate) ?? 0)} im Monat wird nur mit dem pfändbaren Teil des Gehalts verrechnet. Endet das Arbeitsverhältnis, wird der Rest in denselben Raten weiter getilgt; eine sofortige Fälligkeit gibt es nicht. Ein zinsgünstiges Darlehen kann ein geldwerter Vorteil sein.`,
    labelEn: "Employer loan and salary advance",
    textEn: (w, k) => `The Employer grants ${k.vorname} a loan of ${euroEn(zahl(w.betrag) ?? 0)}, bearing interest at ${prozentEn((zahl(w.zins) ?? 0) / 100)} per year. The repayment of ${euroEn(zahl(w.rate) ?? 0)} per month is set off only against the attachable part of the salary. If the employment relationship ends, the remainder continues to be repaid in the same instalments; the loan does not become due immediately. A low-interest loan may be a taxable benefit.`,
    normen: ["§ 488 BGB", "§ 394 BGB", "§ 850c ZPO", "§§ 491 ff. BGB"], quellen: ["https://www.gesetze-im-internet.de/bgb/__488.html", "Katalog Abschnitt 4, Baustein D31"],
    schutz: ["Rückzahlung in Raten im pfändbaren Rahmen"], sperren: ["sofortige Fälligkeit mit voller Aufrechnung"],
  },
  {
    id: "D32", gruppe: "D", label: "Prämien (Empfehlung, Jubiläum, Treue)", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Alle.",
    stichwoerter: ["Empfehlungsprämie", "Jubiläum", "Treueprämie", "Referral"],
    felder: [
      { id: "art", label: "Art", typ: "auswahl", optionen: ["Empfehlungsprämie", "Jubiläumsprämie", "Treueprämie"], pflicht: true },
      { id: "betrag", label: "Betrag in €", typ: "betrag", min: 0 },
      { id: "zweck", label: "Zweck und Voraussetzung", typ: "text" },
    ],
    text: (w, k) => `${k.vorname} erhält eine ${w.art} von ${euro(zahl(w.betrag) ?? 0)}. Voraussetzung: ${w.zweck}. Die Prämie wird mit dem nächsten Gehalt ausgezahlt, nachdem die Voraussetzung erfüllt ist.`,
    labelEn: "Bonuses (referral, anniversary, loyalty)",
    textEn: (w, k) => `${k.vorname} receives a ${en({ Empfehlungsprämie: "referral bonus", Jubiläumsprämie: "long-service bonus", Treueprämie: "loyalty bonus" }, w.art)} of ${euroEn(zahl(w.betrag) ?? 0)}. Condition: ${frei(w.zweck)}. The bonus is paid with the next salary after the condition is met.`,
    normen: ["§ 307 BGB"], quellen: [BGB_307, "Katalog Abschnitt 4, Baustein D32"],
    schutz: ["Zweck und Voraussetzung nennen"], sperren: ["Stichtag bei Leistungsprämien"],
  },
  {
    id: "D33", gruppe: "D", label: "Rückforderung von Überzahlungen", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Alle.",
    stichwoerter: ["Überzahlung", "Rückforderung"],
    felder: [{ id: "raten", label: "Rückzahlung", typ: "auswahl", optionen: ["in angemessenen Raten nach Absprache", "in einer Summe, auf Wunsch in Raten"], pflicht: true, standard: "in angemessenen Raten nach Absprache" }],
    text: (w, k) => `Zahlt der Arbeitgeber versehentlich zu viel, teilt er das ${k.vorname} in Textform mit. Die Rückzahlung erfolgt ${w.raten}, Aufrechnung nur im pfändbaren Teil. Der Einwand, nicht mehr bereichert zu sein (§ 818 Abs. 3 BGB), bleibt unberührt.`,
    labelEn: "Recovery of overpayments",
    textEn: (w, k) => `If the Employer pays too much by mistake, it informs ${k.vorname} in text form. Repayment is made ${en({ "in angemessenen Raten nach Absprache": "in reasonable instalments as agreed", "in einer Summe, auf Wunsch in Raten": "in one sum, or in instalments on request" }, w.raten)}, with set-off only against the attachable part. The defence of no longer being enriched (§ 818 para. 3 BGB) remains unaffected.`,
    normen: ["§ 812 BGB", "§ 818 Abs. 3 BGB", "§ 394 BGB", "§ 850c ZPO"], quellen: ["https://www.gesetze-im-internet.de/bgb/__818.html", "Katalog Abschnitt 4, Baustein D33"],
    schutz: ["Raten", "Entreicherungseinwand bleibt"], sperren: ["Verzicht auf den Entreicherungseinwand"],
  },
];

