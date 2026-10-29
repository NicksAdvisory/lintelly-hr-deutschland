/**
 * Vertragsbausteine der Gruppen E (Urlaub und Abwesenheit), F (Krankheit), G (Nebentätigkeit) und H (Geheimhaltung).
 * Grundlage: Klauselkatalog 10.10.2026, Abschnitt 4 E bis H, Prüfregeln P-094, P-095, P-103 und Kombination K-37.
 * Kein Text hier ist Endwortlaut: Die Kanzlei gibt jede Bausteinversion frei. Alle Rechtszahlen kommen aus lib/regeln/werte.ts.
 */
import { WERTE, zahlwort } from "@/lib/regeln/werte";
import type { Baustein, Werte } from "./typen";
import { ARBEITNEHMER } from "./typen";
import { anteil, hat, liste, num, prozent, regel, wenn, wert, zahl, zahlText } from "./hilfen";
import { datumEn, frei, jahreWortEn, monateWortEn, zahlEn, zahlwortEn } from "@/lib/dokumente/englisch";

const KATALOG = (id: string) => `Katalog Abschnitt 4, Baustein ${id}`;
const GII = "https://www.gesetze-im-internet.de";
const v = (w: Werte, feld: string, standard = "") => (w[feld] ?? "").trim() || standard;
const monateDativ = (n: number) => (n === 1 ? "einem Monat" : `${zahlwort(n)} Monaten`);
const wochen = (n: number) => (n === 1 ? "eine Woche" : `${zahlwort(n)} Wochen`);
const monateAkk = (n: number) => (n === 1 ? "einen Monat" : `${zahlwort(n)} Monate`);
const wochenDativ = (n: number) => (n === 1 ? "einer Woche" : `${zahlwort(n)} Wochen`);
const jahre = (n: number) => (n === 1 ? "ein Jahr" : `${zahlwort(n)} Jahre`);

/** Übertragungsstichtag des gesetzlichen Urlaubs (§ 7 Abs. 3 BUrlG) als "31.03.". */
const UEBERTRAG = [WERTE.urlaubUebertragBis.tag, WERTE.urlaubUebertragBis.monat].map((x) => String(x).padStart(2, "0")).join(".") + ".";
const EFZ_WOCHEN = WERTE.entgeltfortzahlungTage.wert / 7;
const KUERZUNG_MAX_PROZENT = WERTE.efzKuerzungAnteil.wert * 100;
const BETRIEBSFERIEN_MAX_PROZENT = Math.floor(WERTE.vertragStandards.betriebsferienAnteil * 100);

/** Englische Helfer: "31 March", "two weeks", "5 per cent". */
const UEBERTRAG_EN = datumEn(`2000-${String(WERTE.urlaubUebertragBis.monat).padStart(2, "0")}-${String(WERTE.urlaubUebertragBis.tag).padStart(2, "0")}`).replace(/ 2000$/, "");
const wochenEn = (n: number) => (n === 1 ? "one week" : `${zahlwortEn(n)} weeks`);
const prozentEn = (a: number) => `${zahlEn(a * 100)} per cent`;
/** Auswahlwert auf Englisch; unbekannte Werte (alte Eingaben) gehen als freie Eingabe an die KI. */
const auf = (tabelle: Record<string, string>) => (s: string) => tabelle[s] ?? frei(s);

/** Pflichtsatz aus H3 (Katalog: wird an H1 und H2 automatisch angehängt, K-37, P-094). */
export const HINWEISGEBER_SATZ = "Gesetzliche Meldungen und Hinweise nach dem Hinweisgeberschutzgesetz bleiben unberührt, ebenso Offenlegungen, die das Gesetz zum Schutz von Geschäftsgeheimnissen zum Aufdecken rechtswidriger Handlungen erlaubt.";
export const HINWEISGEBER_SATZ_EN = "Statutory reports and notices under the Whistleblower Protection Act (HinSchG) remain unaffected, as do disclosures that the Trade Secrets Act (GeschGehG) permits for uncovering unlawful acts.";

const GEHEIM_KATEGORIEN = [
  "Geschäfts- und Betriebsgeheimnisse",
  "Kundendaten und Kundenlisten",
  "interne Zahlen wie Umsätze, Kalkulationen und Preise",
  "Personaldaten",
  "Quellcode und technische Unterlagen",
];
const ZAEHLT_KRANK = "Arbeitsunfähigkeit wegen Krankheit";
const ZAEHLT_MUTTERSCHUTZ = "Mutterschutz und Beschäftigungsverbote";
const GEHEIM_EN = auf({
  "Geschäfts- und Betriebsgeheimnisse": "business and trade secrets",
  "Kundendaten und Kundenlisten": "customer data and customer lists",
  "interne Zahlen wie Umsätze, Kalkulationen und Preise": "internal figures such as revenue, calculations and prices",
  "Personaldaten": "personnel data",
  "Quellcode und technische Unterlagen": "source code and technical documents",
});

export const BAUSTEINE_EFGH: Baustein[] = [
  // E1 Mehrurlaub
  {
    id: "E1", gruppe: "E", label: "Mehrurlaub mit eigenen Regeln", labelEn: "Additional leave with separate rules", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Firmen, die mehr als den gesetzlichen Urlaub geben und für den Mehrurlaub eigene Regeln wollen.",
    felder: [
      { id: "tageGesamt", label: "Urlaubstage im Jahr gesamt (Arbeitstage)", typ: "zahl", pflicht: true, min: 1 },
      { id: "tageGesetzlich", label: "davon gesetzlicher Mindesturlaub (Arbeitstage)", typ: "zahl", pflicht: true, min: 0, standard: String(WERTE.mindesturlaub.arbeitstage), hinweis: `Kommt aus der Urlaubsaufteilung. Bei ${zahlwort(WERTE.mindesturlaub.bezugArbeitstage)} Arbeitstagen pro Woche sind es ${WERTE.mindesturlaub.arbeitstage} Tage, sonst anteilig.` },
      { id: "verfallMehr", label: "Verfall des Mehrurlaubs", typ: "auswahl", pflicht: true, optionen: [`am ${UEBERTRAG} des Folgejahres, auch bei Krankheit`, "wie der gesetzliche Urlaub"], standard: `am ${UEBERTRAG} des Folgejahres, auch bei Krankheit` },
      { id: "abgeltungMehr", label: "Mehrurlaub bei Ende auszahlen", typ: "janein", pflicht: true, standard: "ja", hinweis: "Der gesetzliche Urlaub wird bei Ende immer abgegolten. Die Wahl betrifft nur den Mehrurlaub." },
      { id: "wartezeitMehr", label: "Wartezeit für den Mehrurlaub in Monaten (optional)", typ: "zahl", min: 0 },
    ],
    text: (w, k) => {
      const gesamt = zahl(w.tageGesamt) ?? 0;
      const gesetzlich = zahl(w.tageGesetzlich) ?? WERTE.mindesturlaub.arbeitstage;
      const mehr = Math.max(gesamt - gesetzlich, 0);
      const wz = zahl(w.wartezeitMehr);
      const verfall = v(w, "verfallMehr").startsWith("wie")
        ? "Für den Mehrurlaub gelten dieselben Regeln zu Übertragung und Verfall wie für den gesetzlichen Urlaub."
        : `Der Mehrurlaub verfällt am ${UEBERTRAG} des Folgejahres, auch wenn er wegen Arbeitsunfähigkeit nicht genommen werden konnte. Der Arbeitgeber weist auch auf diesen Verfall rechtzeitig hin.`;
      return [
        `(1) ${k.vorname} erhält ${zahlText(gesamt)} Arbeitstage Urlaub im Kalenderjahr. Davon sind ${zahlText(gesetzlich)} Arbeitstage gesetzlicher Mindesturlaub und ${zahlText(mehr)} Arbeitstage vertraglicher Mehrurlaub.`,
        `(2) Für den gesetzlichen Mindesturlaub gelten die Regeln des Bundesurlaubsgesetzes. Er wird auf das Folgejahr übertragen, wenn dringende betriebliche oder persönliche Gründe es rechtfertigen, und ist dann bis zum ${UEBERTRAG} zu nehmen. Er verfällt nur, wenn der Arbeitgeber ${k.vorname} rechtzeitig aufgefordert hat, ihn zu nehmen, und auf den Verfall hingewiesen hat.`,
        `(3) ${verfall} Gewährter Urlaub wird zuerst auf den gesetzlichen Mindesturlaub angerechnet.`,
        `(4) Bei Ende des Arbeitsverhältnisses wird nicht genommener gesetzlicher Urlaub abgegolten. ${v(w, "abgeltungMehr") === "nein" ? "Nicht genommener Mehrurlaub wird nicht abgegolten." : "Nicht genommener Mehrurlaub wird ebenfalls abgegolten."}`,
        ...(wz ? [`(5) Den Mehrurlaub erwirbt ${k.vorname} erstmals nach ${monateDativ(wz)} Beschäftigung. Die Wartezeit für den gesetzlichen Urlaub bleibt unberührt.`] : []),
      ].join("\n");
    },
    textEn: (w, k) => {
      const gesamt = zahl(w.tageGesamt) ?? 0;
      const gesetzlich = zahl(w.tageGesetzlich) ?? WERTE.mindesturlaub.arbeitstage;
      const mehr = Math.max(gesamt - gesetzlich, 0);
      const wz = zahl(w.wartezeitMehr);
      const verfall = v(w, "verfallMehr").startsWith("wie")
        ? "The same rules on carry-over and forfeiture apply to the additional leave as to the statutory leave."
        : `The additional leave is forfeited on ${UEBERTRAG_EN} of the following year, even if it could not be taken because of incapacity for work. The Employer also gives timely notice of this forfeiture.`;
      return [
        `(1) ${k.vorname} receives ${zahlEn(gesamt)} working days of leave per calendar year. Of these, ${zahlEn(gesetzlich)} working days are statutory minimum leave and ${zahlEn(mehr)} working days are contractual additional leave.`,
        `(2) The statutory minimum leave is governed by the Federal Leave Act (BUrlG). It is carried over to the following year if urgent operational or personal reasons justify this, and must then be taken by ${UEBERTRAG_EN}. It is forfeited only if the Employer has asked ${k.vorname} in good time to take it and has pointed out the forfeiture.`,
        `(3) ${verfall} Leave granted is set off first against the statutory minimum leave.`,
        `(4) On termination of the employment, untaken statutory leave is paid in lieu. ${v(w, "abgeltungMehr") === "nein" ? "Untaken additional leave is not paid in lieu." : "Untaken additional leave is also paid in lieu."}`,
        ...(wz ? [`(5) ${k.vorname} first acquires the additional leave after ${monateWortEn(wz)} of employment. The waiting period for the statutory leave remains unaffected.`] : []),
      ].join("\n");
    },
    normen: [
      "§§ 1 bis 7 BUrlG",
      "§ 7 Abs. 3 BUrlG",
      "§ 7 Abs. 4 BUrlG",
      "§ 13 BUrlG",
    ],
    quellen: [`${GII}/burlg/__7.html`, `${GII}/burlg/__13.html`, KATALOG("E1")],
    urteile: [
      { az: "BAG 9 AZR 423/16", kennung: "B" },
      { az: "BAG, Linie zur getrennten Verfallregel für vertraglichen Mehrurlaub (Aktenzeichen prüfen)", kennung: "P" },
    ],
    schutz: ["Trennung von gesetzlichem und vertraglichem Urlaub aus den Zahlen", "Eigene Verfallregel nur im Absatz für den Mehrurlaub", "Hinweis vor dem Verfall auch beim Mehrurlaub"],
    sperren: ["Verfall des gesetzlichen Urlaubs ohne Hinweis", "Abgeltungsausschluss für den gesetzlichen Urlaub (R7)"],
    stichwoerter: ["Urlaub", "Mehrurlaub", "Urlaubstage", "Resturlaub", "Verfall", "Urlaubsabgeltung", "Zusatzurlaub"],
  },
  // E2 Sonderurlaub bezahlt
  {
    id: "E2", gruppe: "E", label: "Bezahlte Freistellung bei persönlichen Anlässen", labelEn: "Paid time off for personal occasions", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Viele Firmen, die bei Hochzeit, Geburt, Todesfall, Umzug oder Arztbesuch bezahlt freistellen.",
    felder: [
      { id: "anlaesse", label: "Anlässe", typ: "mehrfach", pflicht: true, optionen: [
        "eigene Hochzeit oder Eintragung der Lebenspartnerschaft",
        "Geburt eines eigenen Kindes",
        "Tod des Ehe- oder Lebenspartners, eines Kindes oder Elternteils",
        "Umzug aus betrieblichem Anlass",
        "Arztbesuch, der außerhalb der Arbeitszeit nicht möglich ist",
      ], standard: "eigene Hochzeit oder Eintragung der Lebenspartnerschaft|Geburt eines eigenen Kindes|Tod des Ehe- oder Lebenspartners, eines Kindes oder Elternteils" },
      { id: "tageJeAnlass", label: "Freistellung je Anlass (Arbeitstage)", typ: "zahl", pflicht: true, min: 0.5, standard: "1", hinweis: "Arztbesuche werden für die nötige Zeit freigestellt, nicht in ganzen Tagen." },
      { id: "nachweis", label: "Nachweis auf Verlangen", typ: "janein", pflicht: true, standard: "ja" },
      { id: "p616", label: "Verhältnis zu § 616 BGB", typ: "auswahl", pflicht: true, optionen: ["§ 616 BGB gilt neben der Liste weiter", "Liste ist abschließend, § 616 BGB gilt nicht"], standard: "§ 616 BGB gilt neben der Liste weiter" },
    ],
    text: (w, k) => {
      const anl = liste(w.anlaesse);
      const tage = zahl(w.tageJeAnlass) ?? 1;
      const ohneArzt = anl.filter((a) => !a.startsWith("Arztbesuch"));
      return [
        `(1) ${k.vorname} wird unter Fortzahlung der Vergütung von der Arbeit freigestellt: ${ohneArzt.length ? `für ${zahlText(tage)} ${tage === 1 ? "Arbeitstag" : "Arbeitstage"} je Anlass bei ${ohneArzt.join("; ")}` : "bei keinem weiteren Anlass"}${anl.some((a) => a.startsWith("Arztbesuch")) ? "; für die nötige Zeit bei einem Arztbesuch, der außerhalb der Arbeitszeit nicht möglich ist" : ""}.`,
        `(2) Die Freistellung ist rechtzeitig vorher in Textform zu beantragen, bei unvorhersehbaren Anlässen unverzüglich anzuzeigen.${v(w, "nachweis") === "nein" ? "" : " Auf Verlangen weist " + k.vorname + " den Anlass nach."}`,
        `(3) ${v(w, "p616").startsWith("Liste") ? "Die Liste in Absatz 1 ist abschließend. Ein weitergehender Anspruch nach § 616 BGB besteht nicht. Ansprüche nach anderen Gesetzen, etwa bei Erkrankung eines Kindes, bleiben unberührt." : "Ansprüche nach § 616 BGB und nach anderen Gesetzen bleiben neben dieser Liste bestehen."}`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const anl = liste(w.anlaesse);
      const tage = zahl(w.tageJeAnlass) ?? 1;
      const ohneArzt = anl.filter((a) => !a.startsWith("Arztbesuch")).map(auf({
        "eigene Hochzeit oder Eintragung der Lebenspartnerschaft": "their own wedding or registration of a civil partnership",
        "Geburt eines eigenen Kindes": "the birth of their own child",
        "Tod des Ehe- oder Lebenspartners, eines Kindes oder Elternteils": "the death of a spouse or partner, a child or a parent",
        "Umzug aus betrieblichem Anlass": "a relocation for operational reasons",
      }));
      return [
        `(1) ${k.vorname} is released from work with continued pay: ${ohneArzt.length ? `for ${zahlEn(tage)} working ${tage === 1 ? "day" : "days"} per occasion in the event of ${ohneArzt.join("; ")}` : "on no further occasion"}${anl.some((a) => a.startsWith("Arztbesuch")) ? "; for the time needed for a medical appointment that is not possible outside working hours" : ""}.`,
        `(2) The time off must be requested in text form in good time beforehand; unforeseeable occasions must be reported without delay.${v(w, "nachweis") === "nein" ? "" : " On request, " + k.vorname + " provides evidence of the occasion."}`,
        `(3) ${v(w, "p616").startsWith("Liste") ? "The list in paragraph 1 is exhaustive. There is no further entitlement under § 616 BGB. Entitlements under other statutes, for example when a child is ill, remain unaffected." : "Entitlements under § 616 BGB and under other statutes continue to exist alongside this list."}`,
      ].join("\n");
    },
    normen: ["§ 616 BGB", "§ 3 EFZG"],
    quellen: [`${GII}/bgb/__616.html`, `${GII}/entgfg/__3.html`, KATALOG("E2")],
    schutz: ["Genaue Anlässe und Tage", "Eine Wahl, ob § 616 BGB neben der Liste weiter gilt oder ausgeschlossen ist"],
    sperren: ["Unklare Formulierung „in wichtigen Fällen“"],
    stichwoerter: ["Sonderurlaub", "Freistellung", "Hochzeit", "Geburt", "Todesfall", "Umzug", "Arzttermin", "§ 616"],
  },
  // E3 Unbezahlter Sonderurlaub
  {
    id: "E3", gruppe: "E", label: "Unbezahlter Sonderurlaub", labelEn: "Unpaid special leave", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Wünsche nach Auszeit, Weiterbildung oder Pflege ohne Bezahlung.",
    felder: [
      { id: "anspruch", label: "Anspruch", typ: "auswahl", pflicht: true, optionen: ["nach Ermessen des Arbeitgebers", "Anspruch, wenn die Voraussetzungen erfüllt sind"], standard: "nach Ermessen des Arbeitgebers" },
      { id: "hoechstMonate", label: "Höchstdauer am Stück (Monate)", typ: "zahl", pflicht: true, min: 1 },
      { id: "zugehoerigkeitMonate", label: "Betriebszugehörigkeit vorher (Monate)", typ: "zahl", pflicht: true, min: 0, bei: { anspruch: ["Anspruch, wenn die Voraussetzungen erfüllt sind"] } },
      { id: "antragWochen", label: "Antrag spätestens vorher (Wochen)", typ: "zahl", min: 0 },
      { id: "urlaubKuerzung", label: "Urlaub für volle Monate der Freistellung anteilig kürzen", typ: "janein", pflicht: true, standard: "nein", hinweis: "Kanzlei prüfen: Kürzung des gesetzlichen Urlaubs nur, soweit die Rechtsprechung sie zulässt. Wegen Krankheit wird nie gekürzt." },
    ],
    text: (w, k) => {
      const max = zahl(w.hoechstMonate) ?? 1;
      const anspruch = v(w, "anspruch").startsWith("Anspruch");
      const zug = zahl(w.zugehoerigkeitMonate);
      const antrag = zahl(w.antragWochen);
      return [
        `(1) ${anspruch ? `${k.vorname} hat Anspruch auf unbezahlten Sonderurlaub bis zu ${monateAkk(max)} am Stück${zug ? `, wenn das Arbeitsverhältnis vorher mindestens ${monateAkk(zug)} bestanden hat` : ""}.` : `Der Arbeitgeber kann ${k.vorname} auf Antrag unbezahlten Sonderurlaub bis zu ${monateAkk(max)} am Stück gewähren. Er entscheidet nach billigem Ermessen und berücksichtigt die Gründe von ${k.vorname}.`}${antrag ? ` Der Antrag ist spätestens ${wochen(antrag)} vor Beginn in Textform zu stellen.` : " Der Antrag ist in Textform zu stellen."}`,
        `(2) Während des Sonderurlaubs ruhen die Pflicht zur Arbeit und die Pflicht zur Vergütung. Danach kehrt ${k.vorname} auf den bisherigen oder einen gleichwertigen Arbeitsplatz zurück.`,
        `(3) Dauert die unbezahlte Freistellung länger als einen Monat, endet die Versicherung als Beschäftigte:r in der Sozialversicherung (§ 7 Abs. 3 SGB IV). ${k.vorname} klärt die Kranken- und Pflegeversicherung vorher mit der Krankenkasse.`,
        `(4) ${v(w, "urlaubKuerzung") === "ja" ? "Für jeden vollen Monat der Freistellung wird der Urlaub anteilig gekürzt, soweit das Gesetz dies zulässt." : "Der Urlaubsanspruch wird wegen des Sonderurlaubs nicht gekürzt."} Eine Kürzung des Urlaubs wegen Krankheit findet nicht statt.`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const max = zahl(w.hoechstMonate) ?? 1;
      const anspruch = v(w, "anspruch").startsWith("Anspruch");
      const zug = zahl(w.zugehoerigkeitMonate);
      const antrag = zahl(w.antragWochen);
      return [
        `(1) ${anspruch ? `${k.vorname} is entitled to unpaid special leave of up to ${monateWortEn(max)} at a time${zug ? `, provided the employment has existed for at least ${monateWortEn(zug)} beforehand` : ""}.` : `On application, the Employer may grant ${k.vorname} unpaid special leave of up to ${monateWortEn(max)} at a time. It decides at its reasonable discretion and takes the reasons of ${k.vorname} into account.`}${antrag ? ` The application must be made in text form at least ${wochenEn(antrag)} before the start.` : " The application must be made in text form."}`,
        `(2) During the special leave, the obligation to work and the obligation to pay are suspended. Afterwards, ${k.vorname} returns to the previous position or an equivalent one.`,
        `(3) If the unpaid leave lasts longer than one month, insurance as an employee in the social security system ends (§ 7 para. 3 SGB IV). ${k.vorname} clarifies health and long-term care insurance with the health insurance fund beforehand.`,
        `(4) ${v(w, "urlaubKuerzung") === "ja" ? "For each full month of the leave, the annual leave is reduced pro rata, insofar as the law permits." : "The leave entitlement is not reduced because of the special leave."} Leave is never reduced because of illness.`,
      ].join("\n");
    },
    normen: ["§ 7 Abs. 3 SGB IV", "BUrlG", "§ 87 Abs. 1 Nr. 5 BetrVG"],
    quellen: [`${GII}/sgb_4/__7.html`, `${GII}/burlg/`, KATALOG("E3")],
    schutz: ["Hinweis zur Krankenversicherung, wenn die Freistellung länger als einen Monat dauert", "Kürzung des Urlaubs nur, wenn vereinbart und zulässig"],
    sperren: ["Kürzung des gesetzlichen Urlaubs bei Krankheit"],
    stichwoerter: ["unbezahlter Urlaub", "Sabbatical", "Auszeit", "Freistellung ohne Gehalt", "Pflege", "Ruhen"],
  },
  // E4 Bildungsurlaub
  {
    id: "E4", gruppe: "E", label: "Bildungsurlaub (Hinweis)", labelEn: "Educational leave (note)", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Firmen in Ländern mit Bildungsurlaubsgesetz, etwa Hessen.",
    felder: [
      { id: "bundesland", label: "Bundesland des Arbeitsorts", typ: "text", pflicht: true, standard: "Hessen" },
    ],
    text: (w, k) => {
      const land = v(w, "bundesland", "Hessen");
      const hessen = /^hessen$/i.test(land);
      return [
        `(1) Der Anspruch von ${k.vorname} auf bezahlten Bildungsurlaub nach dem Gesetz des Landes ${land} bleibt unberührt. Dieser Vertrag schränkt ihn nicht ein.`,
        hessen
          ? `(2) Nach dem Hessischen Bildungsurlaubsgesetz sind es ${zahlwort(WERTE.bildungsurlaubTage.wert)} Arbeitstage im Jahr bei einer Fünftagewoche, erstmals nach ${monateDativ(WERTE.bildungsurlaubWartezeitMonate.wert)} Beschäftigung. Der Antrag ist spätestens ${wochen(WERTE.bildungsurlaubMitteilungWochen.wert)} vor Beginn in Textform zu stellen. Lehnt der Arbeitgeber nicht binnen ${zahlwort(WERTE.bildungsurlaubAblehnungWochen.wert)} Wochen ab, gilt die Freistellung als erteilt.`
          : "(2) Umfang, Wartezeit und Antragsfristen richten sich nach dem Landesgesetz. Besteht im Land kein Bildungsurlaubsgesetz, gilt dieser Absatz nicht. Kanzlei prüfen.",
      ].join("\n");
    },
    textEn: (w, k) => {
      const land = v(w, "bundesland", "Hessen");
      const hessen = /^hessen$/i.test(land);
      return [
        `(1) The entitlement of ${k.vorname} to paid educational leave under the law of the federal state of ${hessen ? "Hesse" : land} remains unaffected. This contract does not restrict it.`,
        hessen
          ? `(2) Under the Hessian Educational Leave Act (HBUG), this amounts to ${zahlwortEn(WERTE.bildungsurlaubTage.wert)} working days per year based on a five-day week, for the first time after ${monateWortEn(WERTE.bildungsurlaubWartezeitMonate.wert)} of employment. The application must be made in text form at least ${wochenEn(WERTE.bildungsurlaubMitteilungWochen.wert)} before the start. If the Employer does not refuse within ${zahlwortEn(WERTE.bildungsurlaubAblehnungWochen.wert)} weeks, the leave is deemed granted.`
          : "(2) Scope, waiting period and application deadlines are governed by the state law. If the state has no educational leave act, this paragraph does not apply. Law firm to check.",
      ].join("\n");
    },
    normen: ["HBUG (Hessen)", "Bildungsurlaubsgesetze der Länder"],
    quellen: ["https://www.rv.hessen.de/bshe/document/jlr-BiUrlGHErahmen", KATALOG("E4")],
    schutz: ["Reiner Hinweis, kein Verzicht", "Der Vertrag schließt den Anspruch nicht aus"],
    sperren: ["Verzicht im Voraus (R7)"],
    stichwoerter: ["Bildungsurlaub", "Bildungszeit", "Weiterbildung", "Seminar", "HBUG"],
  },
  // E5 Betriebsferien
  {
    id: "E5", gruppe: "E", label: "Betriebsferien und Urlaubsplanung", labelEn: "Company holidays and leave planning", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Produktion und kleine Firmen mit fester Schließzeit.",
    felder: [
      { id: "zeitraum", label: "Zeitraum der Betriebsferien", typ: "text", pflicht: true, hinweis: "Zum Beispiel: zwischen Weihnachten und Neujahr, Sommerpause im August." },
      { id: "anteilProzent", label: "Höchstens gebundener Anteil des Jahresurlaubs (Prozent)", typ: "prozent", pflicht: true, min: 0, max: BETRIEBSFERIEN_MAX_PROZENT, standard: String(BETRIEBSFERIEN_MAX_PROZENT), hinweis: "Betriebsferien dürfen nur einen Teil des Urlaubs binden. Den Rest plant die Person selbst." },
      { id: "wuenscheBis", label: "Urlaubswünsche für das Jahr bis", typ: "text", standard: "Ende Januar" },
      { id: "sperrzeiten", label: "Sperrzeiten mit erhöhtem Bedarf (optional)", typ: "text" },
    ],
    text: (w, k) => {
      const a = (zahl(w.anteilProzent) ?? BETRIEBSFERIEN_MAX_PROZENT) / 100;
      return [
        `(1) Der Betrieb schließt ${v(w, "zeitraum", "[Zeitraum]")}. Für diese Zeit nimmt ${k.vorname} Urlaub. Betriebsferien binden höchstens ${prozent(a)} des Jahresurlaubs, über den Rest entscheidet ${k.vorname} nach den Regeln des Bundesurlaubsgesetzes.`,
        `(2) ${k.vorname} teilt Urlaubswünsche für das Kalenderjahr bis ${v(w, "wuenscheBis", "Ende Januar")} in Textform mit. Der Arbeitgeber berücksichtigt die Wünsche, soweit keine dringenden betrieblichen Belange oder Wünsche anderer, die sozial Vorrang haben, entgegenstehen.${v(w, "sperrzeiten") ? ` In folgenden Zeiten wird Urlaub nur ausnahmsweise gewährt: ${v(w, "sperrzeiten")}.` : ""}`,
        "(3) Später geäußerte Wünsche werden berücksichtigt, soweit es die Planung zulässt.",
      ].join("\n");
    },
    textEn: (w, k) => {
      const a = (zahl(w.anteilProzent) ?? BETRIEBSFERIEN_MAX_PROZENT) / 100;
      const bis = v(w, "wuenscheBis", "Ende Januar");
      return [
        `(1) The business closes ${frei(v(w, "zeitraum")) || "[period]"}. ${k.vorname} takes leave for this period. Company holidays bind at most ${prozentEn(a)} of the annual leave; ${k.vorname} decides on the rest in accordance with the Federal Leave Act (BUrlG).`,
        `(2) ${k.vorname} submits leave requests for the calendar year in text form by ${bis === "Ende Januar" ? "the end of January" : frei(bis)}. The Employer takes the requests into account unless urgent operational needs or requests of others that take priority on social grounds stand in the way.${v(w, "sperrzeiten") ? ` In the following periods, leave is granted only by way of exception: ${frei(v(w, "sperrzeiten"))}.` : ""}`,
        "(3) Requests made later are taken into account as far as planning permits.",
      ].join("\n");
    },
    normen: ["§ 7 Abs. 1 BUrlG", "§ 87 Abs. 1 Nr. 5 BetrVG"],
    quellen: [`${GII}/burlg/__7.html`, `${GII}/betrvg/__87.html`, KATALOG("E5")],
    schutz: ["Betriebsferien binden höchstens einen Teil des Jahresurlaubs (Grenze aus dem Register)", "Planungsfristen nicht länger als nötig"],
    sperren: ["Sperrzeit für den gesamten Jahresurlaub"],
    stichwoerter: ["Betriebsferien", "Betriebsurlaub", "Schließzeit", "Urlaubsplanung", "Urlaubssperre"],
  },
  // F1 Anzeige und Nachweis
  {
    id: "F1", gruppe: "F", label: "Krankmeldung: Anzeige und Nachweis", labelEn: "Sick notification: notice and evidence", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Alle Arbeitsverträge (heute § 8), mit Wahl des Meldewegs und des Nachweises.",
    felder: [
      { id: "anzeigeWeg", label: "Anzeige über", typ: "mehrfach", pflicht: true, optionen: ["telefonisch", "in Textform (E-Mail, Chat)"], standard: "telefonisch|in Textform (E-Mail, Chat)" },
      { id: "anzeigeBis", label: "Anzeige bis", typ: "text", pflicht: true, standard: "vor Beginn der Arbeitszeit" },
      { id: "meldungAn", label: "Meldung an", typ: "text", pflicht: true, standard: "die Führungskraft und die Personalabteilung" },
      { id: "nachweisAb", label: "Ärztliche Feststellung", typ: "auswahl", pflicht: true, optionen: ["nach Gesetz", "ab dem ersten Tag, für alle Beschäftigten"], standard: "nach Gesetz", hinweis: `Nach Gesetz: wenn die Arbeitsunfähigkeit länger als ${zahlwort(WERTE.krankAuAbTag.wert)} Kalendertage dauert. Früher nur als allgemeine Regel für alle (Gleichbehandlung).` },
    ],
    text: (w, k) => {
      const wege = liste(w.anzeigeWeg).join(" oder ") || "telefonisch oder in Textform";
      const frueh = v(w, "nachweisAb").startsWith("ab dem ersten");
      return [
        `(1) ${k.vorname} zeigt eine Arbeitsunfähigkeit und ihre voraussichtliche Dauer unverzüglich ${wege} an, möglichst ${v(w, "anzeigeBis", "vor Beginn der Arbeitszeit")}, und zwar gegenüber ${v(w, "meldungAn", "der Führungskraft")}. Dasselbe gilt, wenn die Arbeitsunfähigkeit länger dauert als angezeigt.`,
        `(2) ${frueh ? `Die Arbeitsunfähigkeit ist ab dem ersten Tag ärztlich feststellen zu lassen. Diese Regel gilt für alle Beschäftigten.` : `Dauert die Arbeitsunfähigkeit länger als ${zahlwort(WERTE.krankAuAbTag.wert)} Kalendertage, ist sie spätestens am darauffolgenden Arbeitstag ärztlich feststellen zu lassen. Der Arbeitgeber kann die Feststellung früher verlangen.`} Der Arbeitgeber ruft die elektronische Arbeitsunfähigkeitsbescheinigung bei der Krankenkasse ab. Bei Ärztinnen und Ärzten ohne elektronisches Verfahren legt ${k.vorname} die Bescheinigung vor.`,
        `(3) Die Diagnose muss ${k.vorname} nicht mitteilen.`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const wege = liste(w.anzeigeWeg).map(auf({ "telefonisch": "by telephone", "in Textform (E-Mail, Chat)": "in text form (email, chat)" })).join(" or ") || "by telephone or in text form";
      const frueh = v(w, "nachweisAb").startsWith("ab dem ersten");
      const bis = v(w, "anzeigeBis", "vor Beginn der Arbeitszeit");
      const an = v(w, "meldungAn", "der Führungskraft");
      const anEn = an === "die Führungskraft und die Personalabteilung" ? "the line manager and the HR department" : an === "der Führungskraft" ? "the line manager" : frei(an);
      return [
        `(1) ${k.vorname} reports any incapacity for work and its expected duration without delay ${wege}, if possible ${bis === "vor Beginn der Arbeitszeit" ? "before the start of working hours" : frei(bis)}, namely to ${anEn}. The same applies if the incapacity lasts longer than reported.`,
        `(2) ${frueh ? "The incapacity for work must be certified by a doctor from the first day. This rule applies to all employees." : `If the incapacity for work lasts longer than ${zahlwortEn(WERTE.krankAuAbTag.wert)} calendar days, it must be certified by a doctor no later than the following working day. The Employer may require certification earlier.`} The Employer retrieves the electronic certificate of incapacity for work from the health insurance fund. Where a doctor does not use the electronic procedure, ${k.vorname} submits the certificate.`,
        `(3) ${k.vorname} does not have to disclose the diagnosis.`,
      ].join("\n");
    },
    normen: ["§ 5 EFZG", "§ 109 SGB IV (elektronische Arbeitsunfähigkeitsbescheinigung)"],
    quellen: [`${GII}/entgfg/__5.html`, KATALOG("F1")],
    schutz: ["Frist für die ärztliche Feststellung aus dem Register", "Frühere Feststellung nur als allgemeine Regel für alle"],
    sperren: ["Nachweis zur Diagnose"],
    stichwoerter: ["krank", "Krankmeldung", "AU", "eAU", "Arbeitsunfähigkeit", "Krankschreibung", "gelber Schein"],
  },
  // F2 Zuschuss zum Krankengeld
  {
    id: "F2", gruppe: "F", label: "Zuschuss zum Krankengeld", labelEn: "Supplement to sickness benefit", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Firmen mit Sozialleistungen, die über die gesetzliche Entgeltfortzahlung hinaus zahlen.",
    felder: [
      { id: "art", label: "Leistung", typ: "auswahl", pflicht: true, optionen: ["Zuschuss zum Krankengeld", "Fortzahlung über den gesetzlichen Zeitraum hinaus"], standard: "Zuschuss zum Krankengeld" },
      { id: "dauerWochen", label: "Dauer nach Ende der gesetzlichen Fortzahlung (Wochen)", typ: "zahl", pflicht: true, min: 1 },
      { id: "hoehe", label: "Höhe (Prozent des Nettoentgelts, Krankengeld wird angerechnet)", typ: "prozent", pflicht: true, min: 1, max: 100, standard: "100" },
      { id: "zugehoerigkeitMonate", label: "Betriebszugehörigkeit vorher (Monate, optional)", typ: "zahl", min: 0 },
      { id: "vorbehalt", label: "Bindung", typ: "auswahl", pflicht: true, optionen: ["fester Anspruch", "widerruflich aus wirtschaftlichen Gründen", "freiwillig, ohne Anspruch für die Zukunft"], standard: "fester Anspruch", hinweis: "Nur eine Wahl. Widerruf und Freiwilligkeit für dieselbe Leistung sind gesperrt." },
    ],
    text: (w, k) => {
      const dauer = zahl(w.dauerWochen) ?? 1;
      const h = (zahl(w.hoehe) ?? 100) / 100;
      const zug = zahl(w.zugehoerigkeitMonate);
      const vb = v(w, "vorbehalt", "fester Anspruch");
      const leistung = v(w, "art").startsWith("Fortzahlung")
        ? `zahlt der Arbeitgeber das Entgelt für weitere ${wochen(dauer)} in Höhe von ${prozent(h)} des Nettoentgelts weiter; Krankengeld und andere Sozialleistungen werden angerechnet`
        : `zahlt der Arbeitgeber für weitere ${wochen(dauer)} einen Zuschuss zum Krankengeld in Höhe des Unterschieds zwischen dem Krankengeld und ${prozent(h)} des Nettoentgelts`;
      return [
        `(1) Der Anspruch von ${k.vorname} auf gesetzliche Entgeltfortzahlung im Krankheitsfall bis zur Dauer von ${zahlwort(EFZ_WOCHEN)} Wochen bleibt unberührt.`,
        `(2) Nach Ende der gesetzlichen Entgeltfortzahlung ${leistung}${zug ? `, wenn das Arbeitsverhältnis bei Beginn der Arbeitsunfähigkeit mindestens ${monateAkk(zug)} bestanden hat` : ""}. Die Leistung endet spätestens mit dem Ende des Arbeitsverhältnisses.`,
        `(3) ${vb === "fester Anspruch" ? "Auf die Leistung besteht ein Anspruch." : vb.startsWith("widerruflich") ? "Der Arbeitgeber kann die Leistung für künftige Fälle aus wirtschaftlichen Gründen mit einer Ankündigung von einem Monat widerrufen. Laufende Fälle sind nicht betroffen." : "Die Leistung ist freiwillig. Auch bei wiederholter Zahlung entsteht kein Anspruch für die Zukunft. Individuelle Vereinbarungen haben Vorrang (§ 305b BGB)."}`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const dauer = zahl(w.dauerWochen) ?? 1;
      const h = (zahl(w.hoehe) ?? 100) / 100;
      const zug = zahl(w.zugehoerigkeitMonate);
      const vb = v(w, "vorbehalt", "fester Anspruch");
      const leistung = v(w, "art").startsWith("Fortzahlung")
        ? `the Employer continues to pay remuneration for a further ${wochenEn(dauer)} at ${prozentEn(h)} of net pay; sickness benefit and other social security benefits are set off`
        : `the Employer pays, for a further ${wochenEn(dauer)}, a supplement to sickness benefit equal to the difference between the sickness benefit and ${prozentEn(h)} of net pay`;
      return [
        `(1) The entitlement of ${k.vorname} to statutory continued pay in case of illness for up to ${zahlwortEn(EFZ_WOCHEN)} weeks remains unaffected.`,
        `(2) After statutory continued pay ends, ${leistung}${zug ? `, provided the employment has existed for at least ${monateWortEn(zug)} when the incapacity begins` : ""}. The benefit ends at the latest when the employment ends.`,
        `(3) ${vb === "fester Anspruch" ? "There is an entitlement to the benefit." : vb.startsWith("widerruflich") ? "The Employer may revoke the benefit for future cases for economic reasons by giving one month's notice. Ongoing cases are not affected." : "The benefit is voluntary. Even repeated payment does not create an entitlement for the future. Individual agreements take precedence (§ 305b BGB)."}`,
      ].join("\n");
    },
    normen: ["§ 3 EFZG", "§ 12 EFZG", "§ 49 SGB V"],
    quellen: [`${GII}/entgfg/__3.html`, `${GII}/entgfg/__12.html`, KATALOG("F2")],
    schutz: ["Die gesetzliche Fortzahlung bleibt unberührt und steht getrennt im Text"],
    sperren: ["Kürzung der gesetzlichen Fortzahlung (R7)"],
    stichwoerter: ["Krankengeldzuschuss", "Krankengeld", "Entgeltfortzahlung", "lange Krankheit", "Zuschuss"],
  },
  // F3 BEM
  {
    id: "F3", gruppe: "F", label: "Rückkehrgespräch und BEM (Hinweis)", labelEn: "Return-to-work meeting and integration management (note)", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Praktisch alle Firmen, weil das Eingliederungsmanagement für jede Größe gilt.",
    felder: [
      { id: "ansprechperson", label: "Ansprechperson für das BEM (optional)", typ: "text" },
    ],
    text: (w, k) => [
      `(1) Ist ${k.vorname} innerhalb von ${monateDativ(WERTE.bemSchwelleTage.zeitraumMonate)} länger als ${zahlwort(WERTE.bemSchwelleTage.wert / 7)} Wochen ununterbrochen oder wiederholt arbeitsunfähig, bietet der Arbeitgeber ein betriebliches Eingliederungsmanagement an (§ 167 Abs. 2 SGB IX).${v(w, "ansprechperson") ? ` Ansprechperson ist ${v(w, "ansprechperson")}.` : ""}`,
      `(2) Die Teilnahme ist freiwillig. ${k.vorname} kann jederzeit ablehnen oder abbrechen, ohne dass daraus Nachteile entstehen.`,
      `(3) Gesundheitsdaten werden nur mit Einwilligung und nur für das Eingliederungsmanagement verarbeitet und getrennt von der Personalakte aufbewahrt. Ein Gespräch nach der Rückkehr dient der Wiedereingliederung; ${k.vorname} muss dabei keine Diagnose nennen.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) If ${k.vorname} is unable to work for more than ${zahlwortEn(WERTE.bemSchwelleTage.wert / 7)} weeks, continuously or repeatedly, within ${monateWortEn(WERTE.bemSchwelleTage.zeitraumMonate)}, the Employer offers occupational integration management (betriebliches Eingliederungsmanagement, § 167 para. 2 SGB IX).${v(w, "ansprechperson") ? ` The contact person is ${v(w, "ansprechperson")}.` : ""}`,
      `(2) Participation is voluntary. ${k.vorname} may decline or stop at any time without suffering any disadvantage.`,
      `(3) Health data are processed only with consent and only for the integration management, and are kept separately from the personnel file. A meeting after the return serves reintegration; ${k.vorname} does not have to state a diagnosis.`,
    ].join("\n"),
    normen: ["§ 167 Abs. 2 SGB IX", "Art. 9 DSGVO"],
    quellen: [`${GII}/sgb_9_2018/__167.html`, "https://eur-lex.europa.eu/eli/reg/2016/679/oj", KATALOG("F3")],
    schutz: ["Teilnahme freiwillig", "Rückkehrgespräch ohne Pflicht zur Offenbarung von Diagnosen"],
    sperren: ["Pflicht zum Rückkehrgespräch mit Diagnoseangabe"],
    stichwoerter: ["BEM", "Eingliederung", "Rückkehrgespräch", "Wiedereingliederung", "lange krank"],
  },
  // F4 Kürzung von Sondervergütungen
  {
    id: "F4", gruppe: "F", label: "Kürzung von Sondervergütungen wegen Fehlzeiten", labelEn: "Reduction of special payments for absences", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Firmen mit Anwesenheitsprämie oder Kürzungsregel für Sonderzahlungen.",
    felder: [
      { id: "zahlung", label: "Betroffene Sondervergütung", typ: "text", pflicht: true, hinweis: "Zum Beispiel: Anwesenheitsprämie, Weihnachtsgeld." },
      { id: "kuerzungProzent", label: "Kürzung je Fehltag (Prozent des durchschnittlichen Tagesverdienstes)", typ: "prozent", pflicht: true, min: 0, max: KUERZUNG_MAX_PROZENT, standard: String(KUERZUNG_MAX_PROZENT) },
      { id: "zaehlt", label: "Fehlzeiten, die zählen", typ: "mehrfach", pflicht: true, optionen: [ZAEHLT_KRANK, "unentschuldigtes Fehlen", ZAEHLT_MUTTERSCHUTZ], standard: ZAEHLT_KRANK, hinweis: "Mutterschutz und Beschäftigungsverbote dürfen nie zählen." },
    ],
    text: (w, k) => {
      const a = anteil(w.kuerzungProzent) ?? WERTE.efzKuerzungAnteil.wert;
      const zaehlt = liste(w.zaehlt).filter((x) => x !== ZAEHLT_MUTTERSCHUTZ);
      return [
        `(1) Die Sondervergütung „${v(w, "zahlung", "[Sondervergütung]")}“ wird für jeden Tag, an dem ${k.vorname} wegen ${zaehlt.length ? zaehlt.join(" oder ") : ZAEHLT_KRANK} fehlt, um ${prozent(a)} des durchschnittlichen Arbeitsentgelts je Arbeitstag gekürzt.`,
        `(2) Die Kürzung beträgt je Krankheitstag höchstens ${prozent(WERTE.efzKuerzungAnteil.wert)} des durchschnittlichen Arbeitsentgelts je Arbeitstag (§ 4a EFZG) und höchstens den Betrag der Sondervergütung.`,
        "(3) Nicht gekürzt wird für Zeiten des Mutterschutzes und von Beschäftigungsverboten, für Elternzeit, Pflegezeit, stufenweise Wiedereingliederung, Arbeitsunfälle, Urlaub und bezahlte Freistellung.",
      ].join("\n");
    },
    textEn: (w, k) => {
      const a = anteil(w.kuerzungProzent) ?? WERTE.efzKuerzungAnteil.wert;
      const zaehltEn = auf({ [ZAEHLT_KRANK]: "incapacity for work due to illness", "unentschuldigtes Fehlen": "unexcused absence" });
      const zaehlt = liste(w.zaehlt).filter((x) => x !== ZAEHLT_MUTTERSCHUTZ).map(zaehltEn);
      return [
        `(1) The special payment “${frei(v(w, "zahlung")) || "[special payment]"}” is reduced by ${prozentEn(a)} of the average remuneration per working day for each day on which ${k.vorname} is absent due to ${zaehlt.length ? zaehlt.join(" or ") : zaehltEn(ZAEHLT_KRANK)}.`,
        `(2) For each day of illness, the reduction is at most ${prozentEn(WERTE.efzKuerzungAnteil.wert)} of the average remuneration per working day (§ 4a EFZG) and at most the amount of the special payment.`,
        "(3) No reduction is made for periods of maternity protection and employment bans, parental leave, care leave, gradual reintegration, accidents at work, holiday or paid time off.",
      ].join("\n");
    },
    normen: ["§ 4a EFZG", "§ 612a BGB", "MuSchG"],
    quellen: [`${GII}/entgfg/__4a.html`, `${GII}/bgb/__612a.html`, KATALOG("F4")],
    schutz: ["Kürzung je Fehltag höchstens bis zur gesetzlichen Grenze aus dem Register", "Mutterschutz, Beschäftigungsverbote und Wiedereingliederung sind ausgenommen"],
    sperren: ["Kürzung über das gesetzliche Maß", "Kürzung wegen Mutterschutz (R7)"],
    regeln: [
      regel("P-103", "sperre", "Fehlzeiten-Kürzung höher als die gesetzliche Grenze je Fehltag oder bei Mutterschutz", "§ 4a EFZG (Aktenzeichen und Wortlaut prüfen), MuSchG", ["F4"], (l) => {
        const a = anteil(wert(l, "F4", "kuerzungProzent"));
        const zuHoch = a !== null && a > WERTE.efzKuerzungAnteil.wert;
        const mutterschutz = liste(wert(l, "F4", "zaehlt")).includes(ZAEHLT_MUTTERSCHUTZ);
        const teile = [
          zuHoch ? `Die Kürzung von ${prozent(a!)} je Fehltag liegt über der Grenze von ${prozent(WERTE.efzKuerzungAnteil.wert)} des durchschnittlichen Tagesverdienstes (§ 4a EFZG). Setze höchstens ${zahlText(KUERZUNG_MAX_PROZENT)} ein.` : "",
          mutterschutz ? "Zeiten des Mutterschutzes und Beschäftigungsverbote dürfen nicht zu einer Kürzung führen (MuSchG, § 612a BGB). Nimm sie aus der Liste." : "",
        ].filter(Boolean);
        return teile.length ? teile.join(" ") : null;
      }),
    ],
    stichwoerter: ["Anwesenheitsprämie", "Fehlzeiten", "Kürzung", "Krankheitstage", "Sonderzahlung kürzen"],
  },
  // G1 Nebentätigkeit
  {
    id: "G1", gruppe: "G", label: "Nebentätigkeit: Anzeige oder Genehmigung", labelEn: "Secondary employment: notification or approval", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Alle Arbeitsverträge; heute Teil von „Nebentätigkeit und Fortbildung“.",
    felder: [
      { id: "modell", label: "Modell", typ: "auswahl", pflicht: true, optionen: ["Anzeige in Textform", "Genehmigung mit Anspruch auf Erteilung"], standard: "Anzeige in Textform" },
      { id: "fristWochen", label: "Frist für die Entscheidung (Wochen)", typ: "zahl", pflicht: true, min: 1, bei: { modell: ["Genehmigung mit Anspruch auf Erteilung"] }, hinweis: "Katalog-Standard: kurz halten. Ohne Entscheidung in der Frist gilt die Genehmigung als erteilt." },
    ],
    text: (w, k) => {
      const gen = v(w, "modell").startsWith("Genehmigung");
      const frist = zahl(w.fristWochen) ?? 1;
      return [
        `(1) ${k.vorname} zeigt jede entgeltliche Nebentätigkeit vor ihrer Aufnahme in Textform an und nennt Art, Auftraggeber oder Arbeitgeber und zeitlichen Umfang.`,
        gen
          ? `(2) Die Nebentätigkeit bedarf der Genehmigung. Der Arbeitgeber erteilt sie, wenn keine berechtigten Interessen entgegenstehen. Er darf sie nur versagen, wenn die Nebentätigkeit die Arbeitsleistung beeinträchtigt, in Wettbewerb zum Arbeitgeber steht oder zusammen mit dieser Tätigkeit die Höchstgrenzen des Arbeitszeitgesetzes überschreitet. Er entscheidet binnen ${wochenDativ(frist)} nach Eingang der Anzeige in Textform; entscheidet er nicht, gilt die Genehmigung als erteilt.`
          : "(2) Der Arbeitgeber kann einer angezeigten Nebentätigkeit nur widersprechen, wenn sie die Arbeitsleistung beeinträchtigt, in Wettbewerb zum Arbeitgeber steht oder zusammen mit dieser Tätigkeit die Höchstgrenzen des Arbeitszeitgesetzes überschreitet.",
        "(3) Arbeitszeiten bei mehreren Arbeitgebern werden zusammengerechnet (§ 2 Abs. 1 ArbZG). Ehrenamtliche und private Tätigkeiten ohne Entgelt bleiben frei.",
      ].join("\n");
    },
    textEn: (w, k) => {
      const gen = v(w, "modell").startsWith("Genehmigung");
      const frist = zahl(w.fristWochen) ?? 1;
      return [
        `(1) ${k.vorname} gives notice in text form of any paid secondary employment before taking it up, stating its nature, the client or employer, and the time involved.`,
        gen
          ? `(2) Secondary employment requires approval. The Employer grants it unless legitimate interests stand in the way. It may refuse it only if the secondary employment impairs work performance, competes with the Employer or, together with this employment, exceeds the maximum limits of the Working Hours Act (ArbZG). It decides within ${wochenEn(frist)} of receiving the notice in text form; if it does not decide, approval is deemed granted.`
          : "(2) The Employer may object to notified secondary employment only if it impairs work performance, competes with the Employer or, together with this employment, exceeds the maximum limits of the Working Hours Act (ArbZG).",
        "(3) Working hours with several employers are added together (§ 2 para. 1 ArbZG). Voluntary and private activities without pay remain unrestricted.",
      ].join("\n");
    },
    normen: ["Art. 12 GG", "§ 2 Abs. 1 ArbZG", "§ 307 BGB"],
    quellen: [`${GII}/gg/art_12.html`, `${GII}/arbzg/__2.html`, KATALOG("G1")],
    urteile: [{ az: "BAG 9 AZR 464/00", kennung: "P" }],
    schutz: ["Nur zwei Modelle: Anzeige oder Genehmigung mit Anspruch auf Erteilung", "Versagungsgründe benannt", "Frist für die Entscheidung"],
    sperren: ["Totalverbot jeder Nebentätigkeit", "Genehmigung nach freiem Ermessen"],
    stichwoerter: ["Nebenjob", "Nebentätigkeit", "Zweitjob", "Selbstständigkeit nebenbei", "Genehmigung"],
  },
  // H1 Verschwiegenheit
  {
    id: "H1", gruppe: "H", label: "Verschwiegenheit", labelEn: "Confidentiality", risiko: "grün", version: 1, fuer: ARBEITNEHMER, ersetzt: "§ 10",
    passt: "Alle Arbeitsverträge; ersetzt den festen § 10.",
    felder: [
      { id: "kategorien", label: "Was ist geschützt", typ: "mehrfach", pflicht: true, optionen: GEHEIM_KATEGORIEN, standard: GEHEIM_KATEGORIEN.slice(0, 2).join("|") },
      { id: "herausgabe", label: "Unterlagen bei Ende herausgeben", typ: "janein", pflicht: true, standard: "ja" },
    ],
    text: (w, k) => {
      const kat = liste(w.kategorien).length ? liste(w.kategorien) : GEHEIM_KATEGORIEN.slice(0, 2);
      return [
        `(1) ${k.vorname} behandelt folgende Informationen vertraulich, soweit sie als vertraulich bezeichnet oder als solche erkennbar sind: ${kat.join("; ")}. Geschäftsgeheimnisse sind Informationen im Sinne von § 2 Nr. 1 GeschGehG, die der Arbeitgeber durch angemessene Maßnahmen schützt.`,
        `(2) ${v(w, "herausgabe") === "nein" ? "Unterlagen und Daten werden nur zu dienstlichen Zwecken genutzt." : `Unterlagen und Daten mit solchen Informationen nutzt ${k.vorname} nur dienstlich und gibt sie bei Ende des Arbeitsverhältnisses oder auf Verlangen heraus, Kopien eingeschlossen.`}`,
        `(3) ${"H2" in k.auswahl ? "Für die Zeit nach dem Ende gilt die gesonderte Regel zur nachvertraglichen Verschwiegenheit." : "Nach dem Ende bleiben Geschäftsgeheimnisse im Sinne von Absatz 1 geschützt. Die Verwertung des allgemeinen Erfahrungswissens bleibt frei."}`,
        `(4) ${HINWEISGEBER_SATZ}`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const kat = (liste(w.kategorien).length ? liste(w.kategorien) : GEHEIM_KATEGORIEN.slice(0, 2)).map(GEHEIM_EN);
      return [
        `(1) ${k.vorname} treats the following information as confidential, insofar as it is marked as confidential or recognisable as such: ${kat.join("; ")}. Trade secrets are information within the meaning of § 2 no. 1 GeschGehG that the Employer protects by appropriate measures.`,
        `(2) ${v(w, "herausgabe") === "nein" ? "Documents and data are used only for business purposes." : `${k.vorname} uses documents and data containing such information only for business purposes and returns them, including copies, at the end of the employment or on request.`}`,
        `(3) ${"H2" in k.auswahl ? "For the period after termination, the separate rule on post-contractual confidentiality applies." : "After termination, trade secrets within the meaning of paragraph 1 remain protected. The use of general experience and knowledge remains unrestricted."}`,
        `(4) ${HINWEISGEBER_SATZ_EN}`,
      ].join("\n");
    },
    normen: ["§ 2 Nr. 1 GeschGehG", "§ 241 Abs. 2 BGB", "§ 5 GeschGehG", "HinSchG"],
    quellen: [`${GII}/geschgehg/__2.html`, `${GII}/bgb/__241.html`, KATALOG("H1")],
    urteile: [{ az: "Instanzrechtsprechung zur Auffangklausel über alle Angelegenheiten (Aktenzeichen prüfen)", kennung: "P" }],
    schutz: ["Klausel nennt die Kategorien, keine Auffangformel", "Satz zum Hinweisgeberschutz wird immer angehängt (H3)"],
    sperren: ["Pauschale Auffangklausel über alle Angelegenheiten"],
    regeln: [
      regel("P-094", "pflicht", "Verschwiegenheit ohne Hinweisgeberschutz: H3-Satz angehängt", "HinSchG, § 5 GeschGehG", ["H1", "H2"],
        (l) => wenn((hat(l, "H1") || hat(l, "H2")) && !hat(l, "H3"), `Ergänzt: An die Verschwiegenheit (${["H1", "H2"].filter((id) => hat(l, id)).join(", ")}) ist der Satz angehängt, dass gesetzliche Meldungen nach dem Hinweisgeberschutzgesetz unberührt bleiben.`)),
      regel("K-37", "pflicht", "H1 oder H2 ohne H3", "HinSchG", ["H1", "H2"],
        (l) => wenn((hat(l, "H1") || hat(l, "H2")) && !hat(l, "H3"), `H3 wird automatisch an die Verschwiegenheit angehängt. ${l.firma.mitarbeiter >= WERTE.radarHinweisgeber.wert ? `Eure Firma hat ${l.firma.mitarbeiter} Beschäftigte und braucht ab ${WERTE.radarHinweisgeber.wert} eine interne Meldestelle: Wähle H3, damit der Vertrag sie nennt.` : `Ab ${WERTE.radarHinweisgeber.wert} Beschäftigten braucht ihr eine interne Meldestelle; dann H3 wählen, damit der Vertrag sie nennt.`}`)),
    ],
    stichwoerter: ["Verschwiegenheit", "Geheimhaltung", "Vertraulichkeit", "Geschäftsgeheimnis", "NDA", "Schweigepflicht"],
  },
  // H2 Nachvertragliche Verschwiegenheit
  {
    id: "H2", gruppe: "H", label: "Nachvertragliche Verschwiegenheit", labelEn: "Post-contractual confidentiality", risiko: "gelb", version: 1, fuer: ARBEITNEHMER,
    passt: "Positionen mit Zugang zu echten Geschäftsgeheimnissen.",
    felder: [
      { id: "kategorien", label: "Geschützte Geheimnisse", typ: "mehrfach", pflicht: true, optionen: GEHEIM_KATEGORIEN, standard: GEHEIM_KATEGORIEN[0] },
      { id: "dauerJahre", label: "Dauer nach dem Ende (Jahre)", typ: "zahl", pflicht: true, min: 1, standard: String(WERTE.vertragStandards.verschwiegenheitJahre) },
    ],
    text: (w, k) => {
      const kat = liste(w.kategorien).length ? liste(w.kategorien) : [GEHEIM_KATEGORIEN[0]];
      const dauer = zahl(w.dauerJahre) ?? WERTE.vertragStandards.verschwiegenheitJahre;
      return [
        `(1) ${k.vorname} hält folgende Geschäftsgeheimnisse des Arbeitgebers auch nach Ende des Arbeitsverhältnisses für ${jahre(dauer)} geheim: ${kat.join("; ")}. Geschützt sind nur Informationen im Sinne von § 2 Nr. 1 GeschGehG.`,
        `(2) Ausgenommen sind das allgemeine Erfahrungswissen von ${k.vorname}, Kenntnisse und Fähigkeiten, die ${k.vorname} im Arbeitsverhältnis erworben hat, sowie Informationen, die öffentlich bekannt sind oder ohne Verstoß bekannt werden. Diese Regel ist kein Wettbewerbsverbot: ${k.vorname} darf nach dem Ende für andere Arbeitgeber und Kunden tätig werden.`,
        `(3) Gesetzliche Auskunfts- und Aussagepflichten bleiben unberührt. ${HINWEISGEBER_SATZ}`,
      ].join("\n");
    },
    textEn: (w, k) => {
      const kat = (liste(w.kategorien).length ? liste(w.kategorien) : [GEHEIM_KATEGORIEN[0]]).map(GEHEIM_EN);
      const dauer = zahl(w.dauerJahre) ?? WERTE.vertragStandards.verschwiegenheitJahre;
      return [
        `(1) ${k.vorname} keeps the following trade secrets of the Employer secret for ${jahreWortEn(dauer)} after the end of the employment as well: ${kat.join("; ")}. Only information within the meaning of § 2 no. 1 GeschGehG is protected.`,
        `(2) Excluded are the general experience and knowledge of ${k.vorname}, knowledge and skills that ${k.vorname} acquired in the employment, and information that is publicly known or becomes known without a breach. This rule is not a non-compete clause: after termination, ${k.vorname} may work for other employers and clients.`,
        `(3) Statutory duties to provide information and to give evidence remain unaffected. ${HINWEISGEBER_SATZ_EN}`,
      ].join("\n");
    },
    normen: ["§§ 2, 3, 4 GeschGehG", "§ 74 HGB (Abgrenzung zum Wettbewerbsverbot)", "HinSchG"],
    quellen: [`${GII}/geschgehg/__2.html`, `${GII}/geschgehg/__3.html`, `${GII}/geschgehg/__4.html`, KATALOG("H2")],
    urteile: [{ az: "BAG, Linie zur nachvertraglichen Geheimhaltung echter Betriebsgeheimnisse (Aktenzeichen prüfen)", kennung: "P" }],
    schutz: ["Pflichtausnahme für allgemeines Erfahrungswissen", "Dauer begrenzt, Warnung über dem Registerwert", "Satz zum Hinweisgeberschutz wird immer angehängt"],
    sperren: ["Verschwiegenheit „zeitlich unbegrenzt über alle Kundenbeziehungen“ (verdecktes Wettbewerbsverbot)"],
    regeln: [
      regel("P-095", "warnung", "Nachvertragliche Verschwiegenheit länger als der Warnwert", "Verhältnismäßigkeit, § 307 BGB", ["H2"], (l) => {
        const j = num(l, "H2", "dauerJahre");
        return wenn(j !== null && j > WERTE.vertragStandards.verschwiegenheitWarnJahre, `Die nachvertragliche Verschwiegenheit läuft ${zahlText(j ?? 0)} Jahre. Über ${zahlwort(WERTE.vertragStandards.verschwiegenheitWarnJahre)} Jahre wird sie schnell unverhältnismäßig und kann wie ein verdecktes Wettbewerbsverbot wirken. Kürzer fassen oder Kanzlei prüfen.`);
      }),
    ],
    stichwoerter: ["nachvertraglich", "Geheimhaltung nach Ende", "Verschwiegenheit nach Austritt", "Betriebsgeheimnis"],
  },
  // H3 Hinweisgeberschutz
  {
    id: "H3", gruppe: "H", label: "Hinweisgeberschutz und gesetzliche Ausnahmen", labelEn: "Whistleblower protection and statutory exceptions", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Immer als Zusatz zu H1 und H2; Pflicht zur internen Meldestelle ab der Schwelle aus dem Register.",
    felder: [
      { id: "meldestelle", label: "Interne Meldestelle (optional)", typ: "text", hinweis: `Pflicht ab ${WERTE.radarHinweisgeber.wert} Beschäftigten (${WERTE.radarHinweisgeber.quelle}). Name oder Kontaktweg eintragen.` },
    ],
    text: (w, k) => [
      `(1) ${HINWEISGEBER_SATZ} Keine Regel dieses Vertrags hindert ${k.vorname}, Verstöße an eine interne oder externe Meldestelle oder an Behörden zu melden.`,
      `(2) ${v(w, "meldestelle") ? `Interne Meldestelle ist ${v(w, "meldestelle")}.` : "Über eine interne Meldestelle informiert der Arbeitgeber gesondert, sobald er eine eingerichtet hat."} Externe Meldestellen des Bundes und der Länder stehen daneben offen.`,
      `(3) Wer im guten Glauben meldet, erleidet dadurch keine Nachteile.`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${HINWEISGEBER_SATZ_EN} No provision of this contract prevents ${k.vorname} from reporting violations to an internal or external reporting channel or to public authorities.`,
      `(2) ${v(w, "meldestelle") ? `The internal reporting channel is ${frei(v(w, "meldestelle"))}.` : "The Employer provides separate information about an internal reporting channel as soon as it has set one up."} External reporting channels of the Federal Government and the federal states are also available.`,
      "(3) Anyone who reports in good faith suffers no disadvantage as a result.",
    ].join("\n"),
    normen: ["§ 6 HinSchG", "§ 36 HinSchG", "§ 5 GeschGehG"],
    quellen: [`${GII}/hinschg/__6.html`, `${GII}/hinschg/__36.html`, `${GII}/geschgehg/__5.html`, KATALOG("H3")],
    schutz: ["Der Satz zu gesetzlichen Meldungen steht immer im Text"],
    sperren: ["Klausel, die Meldungen an Behörden untersagt (R12)"],
    stichwoerter: ["Hinweisgeber", "Whistleblower", "Meldestelle", "HinSchG", "Meldung an Behörden"],
  },
  // H4 Soziale Medien
  {
    id: "H4", gruppe: "H", label: "Soziale Medien und Äußerungen über das Unternehmen", labelEn: "Social media and statements about the company", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Firmen mit Außenwirkung.",
    felder: [
      { id: "richtlinie", label: "Es gibt eine Richtlinie für soziale Medien", typ: "janein", pflicht: true, standard: "nein" },
      { id: "privatNutzung", label: "Private Nutzung in der Arbeitszeit", typ: "auswahl", pflicht: true, optionen: ["nur in Pausen", "in geringem Umfang, ohne die Arbeit zu beeinträchtigen"], standard: "nur in Pausen" },
    ],
    text: (w, k) => [
      `(1) ${k.vorname} darf sich privat in sozialen Medien äußern, auch über die eigene Arbeit. Wer sich erkennbar als Beschäftigte:r des Arbeitgebers äußert, macht deutlich, dass es eine persönliche Meinung ist.`,
      `(2) Geschäftsgeheimnisse, Kundendaten und personenbezogene Daten von Kolleginnen und Kollegen werden nicht veröffentlicht. Schmähkritik und bewusst falsche Tatsachenbehauptungen über den Arbeitgeber, Kunden oder Kollegen unterbleiben. Sachliche Kritik bleibt erlaubt.`,
      `(3) Private Nutzung sozialer Medien in der Arbeitszeit ist ${v(w, "privatNutzung").startsWith("in geringem") ? "in geringem Umfang erlaubt, wenn die Arbeit nicht beeinträchtigt wird" : "nur in den Pausen erlaubt"}.${v(w, "richtlinie") === "ja" ? " Im Übrigen gilt die Richtlinie für soziale Medien in ihrer jeweils mitgeteilten Fassung, soweit sie diesen Absätzen nicht widerspricht." : ""}`,
      `(4) ${HINWEISGEBER_SATZ}`,
    ].join("\n"),
    textEn: (w, k) => [
      `(1) ${k.vorname} may express views privately on social media, including about their own work. Anyone who comments as an identifiable employee of the Employer makes clear that it is a personal opinion.`,
      "(2) Trade secrets, customer data and personal data of colleagues are not published. Abusive criticism and knowingly false statements of fact about the Employer, customers or colleagues are not made. Objective criticism remains permitted.",
      `(3) Private use of social media during working hours is ${v(w, "privatNutzung").startsWith("in geringem") ? "permitted to a small extent, provided work is not impaired" : "permitted only during breaks"}.${v(w, "richtlinie") === "ja" ? " Otherwise, the social media policy applies in the version communicated from time to time, insofar as it does not contradict these paragraphs." : ""}`,
      `(4) ${HINWEISGEBER_SATZ_EN}`,
    ].join("\n"),
    normen: ["Art. 5 GG", "§ 241 Abs. 2 BGB", "§ 87 Abs. 1 Nr. 1 BetrVG"],
    quellen: [`${GII}/gg/art_5.html`, `${GII}/betrvg/__87.html`, KATALOG("H4")],
    schutz: ["Beschränkung auf Geschäftsgeheimnisse, Kundendaten und Schmähkritik", "Kein Verbot jeder Meinungsäußerung"],
    sperren: ["Verbot jeder Äußerung über den Arbeitgeber (R12)"],
    stichwoerter: ["Social Media", "LinkedIn", "Instagram", "Äußerungen", "Meinungsfreiheit", "Ruf"],
  },
  // H5 KI-Werkzeuge
  {
    id: "H5", gruppe: "H", label: "Nutzung von KI-Werkzeugen", labelEn: "Use of AI tools", risiko: "grün", version: 1, fuer: ARBEITNEHMER,
    passt: "Alle, besonders Wissensarbeit mit Sprachmodellen und Assistenten.",
    felder: [
      { id: "werkzeuge", label: "Freigegebene Werkzeuge", typ: "lang", pflicht: true, standard: "Liste in der Anlage „Freigegebene KI-Werkzeuge“", hinweis: "Liste der freigegebenen Werkzeuge als Anlage. Bei Betriebsrat: Mitbestimmung bei technischen Einrichtungen prüfen." },
      { id: "kennzeichnung", label: "KI-Ergebnisse nach außen kennzeichnen", typ: "janein", pflicht: true, standard: "ja" },
    ],
    text: (w, k) => [
      `(1) ${k.vorname} darf für die Arbeit KI-Werkzeuge nutzen, die der Arbeitgeber freigegeben hat: ${v(w, "werkzeuge", "Liste in der Anlage")}.`,
      "(2) Personenbezogene Daten, Geschäftsgeheimnisse und vertrauliche Kundendaten werden nur in freigegebene Werkzeuge eingegeben und nur, soweit die Freigabe das erlaubt.",
      `(3) Die Verantwortung für Arbeitsergebnisse bleibt bei ${k.vorname}. KI-Ergebnisse werden vor der Verwendung auf Richtigkeit und Rechte Dritter geprüft.${v(w, "kennzeichnung") === "nein" ? "" : " Inhalte, die nach außen gehen und überwiegend von einem KI-Werkzeug stammen, werden nach den Vorgaben des Arbeitgebers gekennzeichnet."}`,
      "(4) Der Arbeitgeber sorgt für die nötige Schulung zur KI-Kompetenz (Art. 4 KI-Verordnung).",
    ].join("\n"),
    textEn: (w, k) => {
      const wz = v(w, "werkzeuge", "Liste in der Anlage");
      const wzEn = wz === "Liste in der Anlage „Freigegebene KI-Werkzeuge“" ? "list in the annex “Approved AI tools”" : wz === "Liste in der Anlage" ? "list in the annex" : frei(wz);
      return [
        `(1) ${k.vorname} may use AI tools approved by the Employer for work: ${wzEn}.`,
        "(2) Personal data, trade secrets and confidential customer data are entered only into approved tools and only insofar as the approval permits.",
        `(3) Responsibility for work results remains with ${k.vorname}. AI output is checked for accuracy and third-party rights before use.${v(w, "kennzeichnung") === "nein" ? "" : " Content that goes outside the company and originates predominantly from an AI tool is labelled in accordance with the Employer's requirements."}`,
        "(4) The Employer provides the necessary training on AI literacy (Art. 4 AI Act).",
      ].join("\n");
    },
    normen: ["Art. 4 KI-Verordnung (EU) 2024/1689", "DSGVO", "GeschGehG", "§ 87 Abs. 1 Nr. 6 BetrVG"],
    quellen: ["https://eur-lex.europa.eu/eli/reg/2024/1689/oj", `${GII}/betrvg/__87.html`, KATALOG("H5")],
    urteile: [{ az: "Instanzentscheidung zur Mitbestimmung bei der Nutzung von Sprachmodellen (Aktenzeichen prüfen)", kennung: "P" }],
    schutz: ["Verantwortung für Ergebnisse bleibt bei der Person", "Liste freigegebener Werkzeuge als Anlage", "Schulung zur KI-Kompetenz"],
    sperren: ["Pauschales Totalverbot ohne Hinweis, wenn der Arbeitgeber selbst Werkzeuge einsetzt"],
    stichwoerter: ["KI", "ChatGPT", "Claude", "Copilot", "künstliche Intelligenz", "KI-Richtlinie", "Sprachmodell"],
  },
];
