/**
 * Rote Liste (Katalog Abschnitt 6): 17 Klauseltypen, die in jeder Form unwirksam oder verboten sind. Lintelly bietet sie nicht an.
 * Wer danach fragt (Suche im Dialog, Frag Lintelly, eigene Ergänzung im Baustein, MCP-Werkzeug klausel_pruefen), bekommt den Grund und die
 * sichere Alternative. Rein, ohne Datenbank.
 *
 * Erkennung (29.10.2026): Der Text wird vereinheitlicht (klein, ein Leerzeichen, Punkte in Abkürzungen und Zahlen entfernt), damit "[^.]"
 * nur an echten Satzenden hält. Die Muster nehmen jede Wortstellung, Beugung und die gängigen Ersatzwörter. Typen, die erst ein fehlendes
 * Pflichtelement unzulässig macht (Wettbewerbsverbot ohne Karenz, Ausschlussfrist ohne Ausnahme für Mindestlohn und Vorsatz, Überstunden ohne
 * Zahl, längere Frist nur für die Person), prüft `pruefe` auf das Pflichtelement, und zwar nur in Aussagesätzen: eine Frage ist keine Klausel.
 * Die sicheren Bausteine des Katalogs schlagen nicht an (tests/vertragsbausteine/rote-liste.test.ts).
 */
import { WERTE } from "@/lib/regeln/werte";

export type RoteKlausel = {
  id: string; klausel: string; grund: string; alternative: string; bausteine: string[];
  /** Wortmuster auf dem vereinheitlichten Text, eines genügt. */
  muster: RegExp[];
  /** Eigene Prüfung auf den vereinheitlichten Aussagesätzen: fehlt ein Pflichtelement, oder hebt eine Verneinung den Treffer auf? */
  pruefe?: (t: string) => boolean;
};

/** Klein, ein Leerzeichen, ohne Anführungszeichen; Punkte in Abkürzungen und Zahlen fallen weg ("Abs. 2", "z. B.", "1.000", "13. Gehalt"). */
export function vereinheitlicht(text: string): string {
  return text.toLowerCase().replace(/­/g, "").replace(/[„“”"‚‘’«»]/g, "").replace(/\s+/g, " ")
    .replace(/(?<![a-zäöüß])(abs|nr|ziff|bzw|ca|vgl|ggf|inkl|zzgl|evtl|usw|bspw|lit|art|[a-zäöü])\./g, "$1")
    .replace(/(\d)\.(?=\d|\s?[a-zäöüß])/g, "$1");
}
const saetze = (t: string) => t.split(/(?<=[.!?])\s+/);
/** Wortanfang auch vor Umlauten (\b kennt nur a bis z). */
const W = "(?<![a-zäöüß])";
const re = (s: string) => new RegExp(s);
/** a und b im selben Satz, in beliebiger Reihenfolge, höchstens n Zeichen auseinander. */
const beide = (a: string, b: string, n = 80) => re(`(?:${a})[^.]{0,${n}}(?:${b})|(?:${b})[^.]{0,${n}}(?:${a})`);

/* R1, R2: nachvertragliches Wettbewerbsverbot */
const NACH_ENDE = re("nachvertraglich|nach vertragsende|nach (?:der |dem |seinem |ihrem )?(?:beendigung|ausscheiden|austritt)|nach (?:dem |der )?(?:ende|ablauf|auflösung) (?:des|der|seines|ihres) (?:arbeits|anstellungs|dienst|beschäftigungs)?(?:verhältnis|vertrag|zusammenarbeit|tätigkeit)");
const WETTBEWERBSVERBOT = "(?:wettbewerbs|konkurrenz)(?:verbot|klausel|abrede)|kundenschutz|mandantenschutz";
const VERBOT_BENANNT = re("(?<!kein |keine |keinem |keinen |keiner )(?:wettbewerbs|konkurrenz)(?:verbot|klausel|abrede|vereinbarung)|(?<!kein |keine |keinen )(?:kunden|mandanten)schutz");
const UNTERLASSEN = re(`${W}(?:nicht|kein|untersagt|verboten|unterl[aä]ss|enth[aä]lt sich|zu enthalten)`);
const TAETIG = re("tätig|beschäftig|arbeite|angestellt|anstellung|beteilig|gründ|betreib|betreu|beliefer|abwerb|geschäftsbeziehung|aufträge|dienste");
const GEGENUEBER = re("konkurren|wettbewerb|mitbewerber|kunden|mandanten");
const KARENZ = re("karenz|entschädigung|ausgleichszahlung|hälfte der[^.]{0,40}(?:bezüge|leistungen|vergütung)");
const KARENZ_ANTEIL = /(?:karenz\w*|entschädigung)[^.]{0,80}?(\d+(?:,\d+)?) ?(?:prozent|%) (?:der|des|vom|von)/g;
const KARENZ_BRUCH = /(?:karenz\w*|entschädigung)[^.]{0,60}(?:ein|einem|eines) (?:drittel|viertel|fünftel|sechstel|achtel|zehntel)/;

/* R3: Freiwilligkeits- und Widerrufsvorbehalt */
const FREIWILLIG_WIDERRUF = /freiwillig[^.]{0,80}(?<!nie |nicht |kein |keinen |ohne )widerr|(?<!nie |nicht |kein |keinen |ohne )widerr\w*[^.]{0,80}freiwillig/;

/* R4: Überstunden pauschal abgegolten */
const UEBERSTUNDEN = re("überstunde|mehrarbeit|überzeit|mehrstunde|über die (?:regelmäßige|vereinbarte|vertragliche|betriebliche)[^.]{0,30}arbeitszeit hinaus|zusätzliche (?:arbeits)?stunden");
const ABGOLTEN = re("abgegolten|abgelten|abgedeckt|deckt[^.]{0,40} ab|inbegriffen|enthalten|eingeschlossen|einbezogen|mitvergütet|mit vergütet|umfasst|als vergütet|sind vergütet|vergütet sind");
const VERGUETUNG = re(`${W}(?:monats|jahres|grund|brutto|fest|arbeits)?(?:gehalt|gehälter|lohn|vergütung|bezüge|entgelt|bezahlung|fixum)`);
const NICHT_BEZAHLT = re("(?:nicht|keine?) (?:gesondert |zusätzlich |extra |besonders |separat |eigens )?(?:vergütet|bezahlt|entlohnt|ausgezahlt|ausbezahlt|vergütung|bezahlung)");
const STUNDENZAHL = /\d+ ?(?:über|mehrarbeits|arbeits)?(?:stunden|std)|(?:eine?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|fünfzehn|zwanzig|dreißig|vierzig) (?:über|mehrarbeits)?stunden|\d+ ?(?:prozent|%) der (?:regelmäßigen |vereinbarten |vertraglichen )?arbeitszeit/;

/* R6: Ausschlussfrist */
const VERFALL = re("verf[aä]ll|erl[oö]sch|erlisch|ausgeschlossen|untergeh|als verzichtet");
const GELTEND = re("geltend (?:zu )?(?:gemacht|machen|macht)|geltendmachung|anzumelden|angemeldet|einzufordern");
const ZAHLWORT: Record<string, number> = { ein: 1, eine: 1, einem: 1, einen: 1, einer: 1, eines: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12 };
const DAUER = "(\\d+|ein(?:e[mnrs]?|e)?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf) (tag|woche|monat|jahr)";
/** Fristen, die an der Geltendmachung oder am Verfall hängen (nicht die Frist der Gegenseite, sich zu äußern). */
const FRISTEN = [
  re(`(?:innerhalb|binnen|spätestens|längstens)(?: von)?(?: einer frist von)?(?: weiteren)? ${DAUER}\\w*(?:(?!innerhalb|binnen)[^.]){0,100}?geltend (?:zu )?(?:gemacht|machen|macht)`),
  re(`(?:ausschluss|verfall)s?frist\\w*(?: beträgt| von| in höhe von)+ ${DAUER}`),
  re(`verf[aä]ll\\w*(?: nach| mit ablauf von| nach ablauf von)+ ${DAUER}`),
].map((r) => new RegExp(r.source, "g"));
const TAGE_JE: Record<string, number> = { tag: 1, woche: 7 };
/** Fristen in Monaten: Tage und Wochen über 30 Tage je Monat, Jahre mal 12. */
function fristMonate(t: string): number[] {
  return FRISTEN.flatMap((r) => [...t.matchAll(r)]).map((m) => {
    const n = /\d/.test(m[1]) ? Number(m[1]) : ZAHLWORT[m[1]] ?? 1;
    return m[2] === "monat" ? n : m[2] === "jahr" ? n * 12 : (n * TAGE_JE[m[2]]) / 30; // kein-recht: Umrechnung Kalender
  });
}

/* R7: Verzicht auf unverzichtbare Ansprüche */
const UNVERZICHTBAR = re(`entgeltfortzahlung|lohnfortzahlung|gehaltsfortzahlung|${W}fortzahlung|mindesturlaub|${W}urlaub(?!sgeld)|mindestlohn|${W}(?:arbeits)?zeugnis|kündigungsschutz`);
const VERZICHT_VERNEINT = re("(?:nicht|kein\\w*|nie|un) ?verzicht|verzicht\\w*[^.]{0,80}(?:ausgeschlossen|unwirksam|nichtig|nicht möglich|unzulässig)");

/* R8: Stichtag bei Zahlungen, die Arbeit vergüten */
const ARBEITSLOHN = "provision|bonus|tantieme|13 ?(?:monats)?gehalt|dreizehnte[sn]? (?:monats)?gehalt|zielvereinbarung|variable[nr]? vergütung|erfolgsbeteiligung|gewinnbeteiligung|umsatzbeteiligung|leistungsprämie";
const BINDUNG = "(?<!ohne |kein |keinen |keine )stichtag|ungekündigt|nur wer am"
  + "|(?:am|zum|bis zum) (?:auszahlungstag|auszahlungszeitpunkt|zeitpunkt der auszahlung|auszahlungstermin|jahresende|3112|ende des (?:geschäfts|kalender)?jahres)[^.]{0,60}(?:besteht|bestehen|bestehendem|beschäftigt|noch im|angestellt|nicht gekündigt)"
  + "|ausgeschieden[^.]{0,40}(?:entfällt|verfällt|kein|nicht)|scheidet[^.]{0,60} aus[^.]{0,60}(?:entfällt|verfällt|kein(?:en)? anspruch)|(?:vor|bis zum)[^.]{0,40}ausscheid\\w*[^.]{0,60}(?:entfällt|verfällt|kein(?:en)? anspruch|nicht (?:aus)?gezahlt|zurückzu?zahlen)"
  + "|(?:entfällt|verfällt|kein(?:en)? anspruch)[^.]{0,60}(?:ausscheid|ausgeschieden|(?:gekündigte|beendete)[nms]? arbeitsverhältnis|kündigung des arbeitsverhältnisses|eigenkündigung)";

/* R12: Gewerkschaft, Betriebsrat, Behörden, Äußerungen */
const BEHOERDE = "behörde|staatsanwalt|polizei|zoll|finanzamt|gewerbeaufsicht";
const ARBEITGEBER_ALS_THEMA = "(?:den arbeitgeber|das unternehmen|die firma|die gesellschaft)";

/* R13: Versetzung in den Konzern */
const VERSETZEN = "versetz|abordn|entsend|abstell|zuweis|einzusetzen|(?:tätig|eingesetzt|beschäftigt) zu werden|(?:verpflichtet|muss|kann|darf)[^.]{0,80}(?:tätig|eingesetzt|beschäftigt) (?:zu )?werden";
const KONZERN = "konzern|andere[nrs]? gesellschaft|verbundene[nrs]? unternehmen|(?:tochter|schwester|mutter|gruppen)(?:gesellschaft|unternehmen)|unternehmen der gruppe";
const ZUSTIMMUNG = re("zustimmung|einverständnis|einvernehm|änderungsvertrag|auf (?:eigenen |seinen |ihren )?wunsch|einwilligung");

/* R14: längere Kündigungsfrist nur für die Person */
const PERSON = re("arbeitnehmer|mitarbeiter|beschäftigte|angestellte");
const BEIDE_SEITEN = /arbeitgeber|beide|beiderseit|jede (?:partei|seite|vertragspartei)|vertragsparteien|gleichermaßen|wechselseitig|gegenseitig/;

/* R15: Kosten des Arbeitsschutzes */
const SCHUTZ = `schutzausrüstung|schutzkleidung|${W}psa(?![a-zäöüß])|sicherheitsschuh|schutzschuh|schutzbrille|schutzhelm|gehörschutz|schutzhandschuh|arbeitsschutz|bildschirmarbeitsplatzbrille|pflichtfortbildung|pflichtschulung|unterweisung|arbeitsmedizinische vorsorge|(?:gesetzlich )?vorgeschriebene[nr]? (?:fortbildung|schulung|weiterbildung)`;
const PERSON_ZAHLT = "auf eigene kosten|auf (?:seine|ihre) kosten|(?:auf kosten|zu lasten) (?:des|der) (?:arbeitnehmer|mitarbeiter|beschäftigt)|selbst (?:zu )?(?:beschaffen|bezahlen|zahlen|tragen|finanzieren|kaufen)"
  + "|(?:kosten|anschaffung|beschaffung|gebühr)\\w*[^.]{0,40}(?:trägt|tragen|zahlt|zahlen|übernimmt|übernehmen|erstattet|erstatten) (?:der |die )?(?:arbeitnehmer|mitarbeiter|beschäftigte|person)"
  + "|(?:arbeitnehmer|mitarbeiter|beschäftigte|person)\\w*[^.]{0,20}(?:trägt|zahlt|übernimmt|erstattet|bezahlt)[^.]{0,30}(?:die )?(?:kosten|anschaffung)|(?:zahlt|bezahlt) (?:der |die )?(?:arbeitnehmer|mitarbeiter|beschäftigte)"
  + "|vom (?:gehalt|lohn|entgelt|nettolohn|nettogehalt)[^.]{0,20}(?:abgezogen|einbehalten)|(?:abgezogen|einbehalten|verrechnet)[^.]{0,30}(?:gehalt|lohn|entgelt)|eigenanteil|eigenbeteiligung|kostenbeteiligung";

/* R16: auflösende Bedingung */
const VERTRAG = "arbeitsverhältnis|arbeitsvertrag|vertrag|beschäftigung|anstellung|dienstverhältnis";
const ENDET = "endet|endigt|erlischt|aufgelöst|beendet|sein ende";
const ANLASS = "krank|arbeitsunfähig|schwanger|mutterschutz|mutterschaft|entbindung|elternzeit|betriebsrat|wahlvorstand";

/* R17: Haftung ohne Verschulden */
const HAFTET = "haftet|haften|haftung|einzustehen|einstehen|ersatzpflichtig|aufzukommen|zu ersetzen|ersetzt";
const STRIKT = "unabhängig (?:vom|von (?:einem|seinem|ihrem|jedem)) verschulden|ohne (?:eigenes |jedes |ein )?verschulden|verschuldensunabhängig|leichtester fahrlässigkeit|(?:bei|für) jede[rn]? (?:form von |art von )?fahrlässigkeit|für jeden (?:verursachten )?schaden|für (?:alle|sämtliche) (?:von (?:ihm|ihr) )?(?:verursachten )?schäden|(?:jeden|alle|sämtliche) (?:\\w+ )?sch[aä]den";
const HAFTUNG_STRIKT = beide(HAFTET, STRIKT, 60);
const HAFTUNG_VOLL = beide(HAFTET, "in voller höhe|uneingeschränkt|unbeschränkt|vollumfänglich", 40);

export const ROTE_LISTE: RoteKlausel[] = [
  { id: "R1", klausel: "Nachvertragliches Wettbewerbsverbot ohne oder mit zu niedriger Karenzentschädigung oder mit salvatorischer Ersatzklausel", grund: "§ 74 Abs. 2 HGB, BAG 10 AZR 448/15", alternative: "Wettbewerbsverbot mit fester Karenzentschädigung von mindestens der Hälfte der letzten Bezüge (Baustein M2) oder Kundenschutz mit Karenz (M3)", bausteine: ["M2", "M3"],
    muster: [
      re(`(?:${WETTBEWERBSVERBOT})[^.]{0,80}(?:ohne|keine?[nr]?)[^.]{0,30}(?:entschädigung|karenz)`), /(?:ohne|keine?[nr]?)[^.]{0,30}karenz/, /mandantenschutz[^.]{0,60}ohne/,
      /(?:karenz\w*|entschädigung)[^.]{0,40}(?:wird|ist|besteht|erfolgt)[^.]{0,20}(?:nicht|keine?)[^.]{0,20}(?:gezahlt|geschuldet|gewährt|vereinbart)/,
      beide("salvatorisch|geltungserhaltend", "wettbewerb|konkurrenz|karenz|entschädigung", 120), /(?:wettbewerbs|konkurrenz)verbot[^.]{0,120}zulässigen (?:umfang|maß)/,
    ],
    // Zu wenig (unter der Hälfte) oder gar keine Entschädigung bei einem Verbot für die Zeit nach dem Ende.
    pruefe: (t) => {
      if ([...t.matchAll(KARENZ_ANTEIL)].some((m) => Number(m[1].replace(",", ".")) / 100 < WERTE.karenzMindestAnteil.wert) || KARENZ_BRUCH.test(t)) return true;
      if (KARENZ.test(t)) return false;
      // Ein Satz, der nur auf das Verbot verweist (Vertragsstrafe bei Verstoß, N2), vereinbart es nicht.
      return saetze(t).some((s) => NACH_ENDE.test(s) && !/verst[oö]ß|vertragsstrafe/.test(s) && (VERBOT_BENANNT.test(s) || (UNTERLASSEN.test(s) && TAETIG.test(s) && GEGENUEBER.test(s))));
    } },
  { id: "R2", klausel: "Wettbewerbsverbot bei Minderjährigen, per Ehrenwort oder durch Übernahme durch Dritte", grund: "§ 74a Abs. 2 HGB", alternative: "Kein nachvertragliches Verbot; während des Arbeitsverhältnisses gilt das Wettbewerbsverbot ohnehin (M1)", bausteine: ["M1"],
    muster: [
      /ehrenwort|ehrenwörtlich|auf ehre und gewissen|bei (?:seiner|ihrer) ehre/,
      beide(WETTBEWERBSVERBOT, "minderjährig|noch nicht volljährig|unter 18|jugendlich|azubi|auszubildend"),
      beide(WETTBEWERBSVERBOT, "(?:dritte[rn]?|eltern|vater|mutter|erziehungsberechtigt|bürg)[^.]{0,60}(?:übernimmt|übernehmen|verpflichte|einstehen|steht|stehen|garantier|haftet|haften)", 120),
    ] },
  { id: "R3", klausel: "Freiwilligkeitsvorbehalt und Widerrufsvorbehalt für dieselbe Leistung", grund: "intransparent, BAG 10 AZR 526/10", alternative: "Eine Wahl je Leistung: Freiwilligkeitsvorbehalt (D21) oder Widerrufsvorbehalt (D22)", bausteine: ["D21", "D22"],
    muster: [],
    // Eine Einwilligung (Datenschutz, I6) ist freiwillig und widerruflich, das ist kein Vorbehalt bei einer Leistung.
    pruefe: (t) => saetze(t).some((s) => FREIWILLIG_WIDERRUF.test(s) && !s.includes("einwillig")) },
  { id: "R4", klausel: "Erforderliche Überstunden sind mit dem Gehalt abgegolten (ohne Zahl)", grund: "Transparenzgebot, BAG 5 AZR 406/10 und 5 AZR 517/09", alternative: "Überstundenpauschale mit fester Stundenzahl (C2) oder Ausgleich nach C1", bausteine: ["C2", "C1"],
    muster: [],
    // Abgegolten oder nicht bezahlt, ohne dass irgendwo eine Stundenzahl steht (C2 nennt sie, C1 gleicht in Freizeit aus).
    pruefe: (t) => !STUNDENZAHL.test(t) && saetze(t).some((s) => UEBERSTUNDEN.test(s) && ((ABGOLTEN.test(s) && VERGUETUNG.test(s)) || (NICHT_BEZAHLT.test(s) && !s.includes("freizeit")))) },
  { id: "R5", klausel: "Rückzahlung von Ausbildungskosten, Vertragsstrafe oder nachvertragliches Wettbewerbsverbot in der Berufsausbildung", grund: "§ 12 BBiG", alternative: "Keine. Weiterbildung nach der Ausbildung über eine eigene Fortbildungsvereinbarung (L2)", bausteine: ["L2"],
    muster: [
      /(?:azubi|auszubildend|ausbildung)[^.]{0,60}(?:rückzahl|vertragsstrafe|wettbewerbsverbot)/, /(?:rückzahl|vertragsstrafe)[^.]{0,60}(?:azubi|auszubildend|ausbildungskosten)/,
      beide("ausbildungskosten|kosten der (?:berufs)?ausbildung|lehrgeld|ausbildungsgebühr", "zurückzu?zahl|zu erstatten|(?:erstattet|trägt|zahlt|übernimmt) (?:der |die )?(?:auszubildende|azubi)|beteilig"),
      beide("auszubildende|azubi|lehrling|berufsausbildung|ausbildungsverhältnis|ausbildungsvertrag", "konventionalstrafe|schadenspauschale|pauschalierte[nr]? schadensersatz|konkurrenzverbot|nicht für (?:ein )?(?:konkurrenz|wettbewerb)"),
    ] },
  { id: "R6", klausel: "Ausschlussfrist ohne Ausnahme für Mindestlohn und Vorsatz, unter drei Monaten, mit Schriftform oder nur für die Person", grund: "§ 3 MiLoG, § 202 BGB, § 309 Nr. 13 BGB, BAG 9 AZR 162/18", alternative: "Ausschlussfrist in Textform, beidseitig, mit allen Ausnahmen (Q1)", bausteine: ["Q1"], // kein-recht: Name der Klausel aus dem Katalog
    muster: [/ausschlussfrist[^.]{0,80}(?:schriftlich|schriftform)/, /ausschlussfrist[^.]{0,60}(?:ohne|kein)[^.]{0,20}(?:mindestlohn|ausnahme)/, /verfall(?:en|frist)[^.]{0,60}(?:einen monat|vier wochen|zwei wochen)/],
    // Verfallklausel (Ansprüche verfallen, wenn nicht geltend gemacht): zu kurz, Schriftform, ohne Ausnahme für Mindestlohn und Vorsatz oder nur für die Person.
    pruefe: (t) => {
      if (fristMonate(t).some((m) => m < WERTE.ausschlussfristMonate.wert)) return true;
      if (!t.includes("ansprüch") || !saetze(t).some((s) => VERFALL.test(s) && GELTEND.test(s))) return false;
      const schriftlich = saetze(t).some((s) => /schriftlich|schriftform/.test(s) && GELTEND.test(s) && !s.includes("textform"));
      const ausnahmen = /mindestlohn|milog|mindestentgelt/.test(t) && /vorsatz|vorsätzlich/.test(t);
      const nurPerson = /ansprüche (?:des|der|von) (?:arbeitnehmer|mitarbeiter|beschäftigt|angestellt)/.test(t) && !/arbeitgeber|beide|beiderseit|gegenseitig|wechselseitig|vertragspartei|seiten/.test(t);
      return schriftlich || !ausnahmen || nurPerson;
    } },
  { id: "R7", klausel: "Verzicht im Voraus auf Entgeltfortzahlung, Mindesturlaub, Mindestlohn, Zeugnis oder Kündigungsschutz", grund: "§ 12 EFZG, § 13 BUrlG, § 3 MiLoG, § 109 GewO, § 4 KSchG", alternative: "Keine. Die gesetzlichen Ansprüche bleiben, freiwillige Mehrleistungen lassen sich eigenständig regeln (E1, F2)", bausteine: ["E1", "F2"],
    muster: [
      /(?:ohne|kein|keinen) anspruch auf (?:entgeltfortzahlung|lohnfortzahlung|urlaub|(?:ein )?(?:arbeits)?zeugnis|mindestlohn)/,
      /(?:krankheit|krankheitsfall|krankheitstage|arbeitsunfähig)\w*[^.]{0,60}(?:nicht|keine?|unbezahlt)[^.]{0,20}(?:bezahlt|vergütet|gezahlt|fortgezahlt|vergütung|lohn|gehalt|entgelt)/,
      /urlaub\w*[^.]{0,40}(?:im|mit dem|durch den|durch das) (?:stunden)?(?:lohn|gehalt|entgelt)[^.]{0,30}(?:abgegolten|enthalten|inbegriffen)/,
    ],
    // Verzicht auf einen unverzichtbaren Anspruch, außer der Satz sagt gerade, dass man nicht verzichten kann.
    pruefe: (t) => saetze(t).some((s) => re(`${W}verzicht`).test(s) && UNVERZICHTBAR.test(s) && !VERZICHT_VERNEINT.test(s)) },
  { id: "R8", klausel: "Stichtags- oder Bindungsklausel bei Zahlungen, die Arbeit vergüten (Provision, Zielbonus, 13. Gehalt mit Mischcharakter, Tantieme)", grund: "BAG 10 AZR 612/10, 10 AZR 848/12", alternative: "Anteilige Zahlung bei Ein- und Austritt (Pro rata); Stichtag nur bei reiner Betriebstreue (D18 mit D19)", bausteine: ["D18", "D19"],
    muster: [beide(ARBEITSLOHN, BINDUNG, 100), /stichtagsklausel/] },
  { id: "R9", klausel: "Doppelte Schriftformklausel", grund: "BAG 9 AZR 382/07 (Aktenzeichen prüfen), § 305b BGB", alternative: "Änderungen in Textform mit Vorrang der Individualabrede (Q4)", bausteine: ["Q4"],
    // Entscheidung 24: auch "Aufhebung dieses Formerfordernisses" und "Aufhebung des Schriftformerfordernisses".
    muster: [
      /(?:auch|selbst) (?:für )?(?:die )?aufhebung (?:dieser|der) (?:schriftform|klausel)/, /aufhebung (?:dieses|des|eines) (?:schrift)?form(?:erfordernisses|zwangs)/, /doppelte schriftform/, /schriftformklausel[^.]{0,40}(?:selbst|auch)/,
      /(?:gilt|gelten) (?:auch|ebenso|gleichermaßen) (?:für|bei) (?:die |eine |jede )?(?:änderung|aufhebung|abbedingung|abänderung|verzicht)[^.]{0,40}(?:schriftform|formerfordernis|formvorschrift|dieser (?:klausel|bestimmung|regelung))/,
      /(?:schriftform|formerfordernis)\w*[^.]{0,60}(?:kann|darf|können)[^.]{0,30}nur[^.]{0,30}(?:schriftlich|in schriftform|durch schriftliche)[^.]{0,40}(?:aufgehoben|abbedungen|geändert|verzichtet)/,
      /verzicht auf (?:das |die |dieses )?(?:schriftform|formerfordernis)\w*[^.]{0,40}(?:bedarf|bedürfen|nur)[^.]{0,30}schrift/,
    ] },
  { id: "R10", klausel: "Schiedsabrede für Streitigkeiten aus dem Arbeitsverhältnis", grund: "§ 101 ArbGG (aus bekannter Fassung, Kanzlei prüfen)", alternative: "Gesetzlicher Gerichtsstand vor dem Arbeitsgericht (Q5)", bausteine: ["Q5"],
    muster: [/schieds(?:gericht|abrede|verfahren|klausel|vereinbarung|spruch|richter)/, /unter ausschluss (?:des|der) (?:ordentlichen )?(?:rechtsweg|gerichtsbarkeit|arbeitsgericht)/] },
  { id: "R11", klausel: "Verzicht auf Kündigungsschutzklage im Voraus; Tatsachenbestätigung, die die Beweislast ändert", grund: "§ 4 KSchG, § 309 Nr. 12 BGB", alternative: "Empfangsbestätigung auf eigener Seite mit eigener Unterschrift (Q7)", bausteine: ["Q7"],
    muster: [
      /verzicht[^.]{0,40}(?:kündigungsschutzklage|klage)/, /bestätigt[^.]{0,60}(?:alles|vollständig) (?:gelesen|verstanden)/,
      /(?:nicht|keine?)[^.]{0,40}(?:kündigungsschutz)?klage\w*[^.]{0,30}(?:erheben|einreichen|einzureichen|anstrengen)/,
      /(?:bestätig|erklär|versicher)\w*[^.]{0,80}(?:gelesen|verstanden|zur kenntnis genommen|ausführlich (?:erläutert|besprochen)|ausgehandelt|ausreichend (?:zeit|gelegenheit))/,
    ] },
  { id: "R12", klausel: "Verbot von Gewerkschaft, Betriebsratskandidatur, Meldung an Behörden oder jeder Äußerung über den Arbeitgeber", grund: "Art. 9 GG, § 78 BetrVG, HinSchG", alternative: "Hinweisgeberschutz (H3) und Regel für soziale Medien ohne Meinungsverbot (H4)", bausteine: ["H3", "H4"],
    muster: [
      /(?:verbot|untersagt|darf nicht)[^.]{0,60}(?:gewerkschaft|betriebsrat|behörde|äußerung)/, /(?:gewerkschaft|betriebsrat)[^.]{0,40}(?:verboten|untersagt)/, /keine (?:meldung|anzeige) an behörden/,
      /gewerkschaft\w*[^.]{0,60}(?:nicht|kein\w*)[^.]{0,20}(?:bei(?:zu)?tret|beitritt|mitglied|ein(?:zu)?tret|engagier|betätig)|(?:nicht|kein\w*)[^.]{0,30}gewerkschaft\w*[^.]{0,30}(?:bei(?:zu)?tret|beitritt|mitglied|ein(?:zu)?tret)|austritt aus der gewerkschaft/,
      /(?:nicht|kein\w*)[^.]{0,60}(?:betriebsrat|wahlvorstand)\w*[^.]{0,40}(?:kandidier|aufstellen|zur wahl stell)|(?:kandidatur|kandidieren)[^.]{0,60}betriebsrat[^.]{0,40}(?:nicht|ausgeschlossen|untersagt|verboten|unzulässig)/,
      re(`(?:darf|dürfen|wird|werden)[^.]{0,30}(?:nicht|kein\\w*)[^.]{0,60}(?:${BEHOERDE})\\w*[^.]{0,40}(?:melden|wenden|anzeigen|informieren|mitteilen|weitergeben|einschalten)`),
      re(`(?:${BEHOERDE})\\w*[^.]{0,60}(?:untersagt|verboten|nur mit (?:vorheriger )?zustimmung|nur nach (?:vorheriger )?(?:rücksprache|genehmigung|freigabe)|bedürfen der (?:vorherigen )?(?:zustimmung|genehmigung))`),
      re(`verschwiegenheit[^.]{0,80}(?:auch|insbesondere) gegenüber (?:den )?(?:${BEHOERDE})`),
      re(`(?:jede|jegliche|sämtliche|keinerlei)[^.]{0,30}(?:äußerung|aussage|stellungnahme|kommentar|kritik|bewertung)\\w*[^.]{0,60}(?:arbeitgeber|unternehmen|firma|gesellschaft)[^.]{0,60}(?:untersagt|verboten|unterl|nicht gestattet|nicht erlaubt|bedarf|bedürfen)`),
      re(`(?:nicht|keine?)[^.]{0,20}(?:öffentlich |negativ |kritisch )?über ${ARBEITGEBER_ALS_THEMA}[^.]{0,40}äußer|äußerungen? über ${ARBEITGEBER_ALS_THEMA}[^.]{0,40}(?:untersagt|verboten|nicht gestattet|nicht erlaubt|zu unterlassen)`),
    ] },
  { id: "R13", klausel: "Einseitige Versetzung in eine andere Gesellschaft des Konzerns", grund: "Arbeitgeberwechsel braucht Zustimmung, § 106 GewO reicht nicht", alternative: "Versetzung nur an Standorte desselben Arbeitgebers (B2), Wechsel per Änderungsvertrag", bausteine: ["B2"],
    muster: [],
    // Einseitig: ohne Zustimmung der Person im selben Satz (B2 verlangt sie).
    pruefe: (t) => saetze(t).some((s) => beide(VERSETZEN, KONZERN).test(s) && !ZUSTIMMUNG.test(s)) },
  { id: "R14", klausel: "Kündigungsfrist nur für die Person verlängert", grund: "§ 622 Abs. 6 BGB", alternative: "Verlängerte Fristen für beide Seiten (P3)", bausteine: ["P3"],
    muster: [/(?:arbeitnehmer|person|mitarbeiter)[^.]{0,40}längere kündigungsfrist/, /(?:kündigungsfrist|frist)[^.]{0,60}(?:nur|lediglich|ausschließlich|allein) für (?:den |die )?(?:arbeitnehmer|mitarbeiter|beschäftigten|person)/],
    // Verlängerte Frist für die Person, und für den Arbeitgeber gilt nur das Gesetz oder er kommt gar nicht vor.
    pruefe: (t) => saetze(t).some((s) => PERSON.test(s) && s.includes("kündig") && /verlänger|länger/.test(s))
      && (/für den arbeitgeber gelten (?:die |nur die )?gesetzlich/.test(t) || !BEIDE_SEITEN.test(t)) },
  { id: "R15", klausel: "Abwälzung von Kosten, die das Gesetz dem Arbeitgeber auferlegt (Schutzausrüstung, Pflichtfortbildung)", grund: "§ 3 Abs. 3 ArbSchG, § 111 GewO", alternative: "Schutzausrüstung stellt der Arbeitgeber (K2), Pflichtfortbildung kostenfrei in der Arbeitszeit (L1)", bausteine: ["K2", "L1"],
    muster: [beide(SCHUTZ, PERSON_ZAHLT, 100), re(`(?:kosten|anschaffung)\\w*[^.]{0,40}(?:${SCHUTZ})[^.]{0,40}(?:trägt|zahlt|übernimmt|erstattet) (?:der |die )?(?:arbeitnehmer|mitarbeiter|beschäftigte|person)`)] },
  { id: "R16", klausel: "Auflösende Bedingung, die an Krankheit, Schwangerschaft, Elternzeit oder Betriebsratsamt anknüpft", grund: "§ 14 TzBfG, § 17 MuSchG, § 18 BEEG, § 612a BGB", alternative: "Auflösende Bedingung nur aus der zulässigen Liste (A6)", bausteine: ["A6"],
    muster: [
      re(`(?:${VERTRAG})\\w*[^.]{0,60}(?:${ENDET})[^.]{0,60}(?:${ANLASS})`), re(`(?:${ANLASS})\\w*[^.]{0,60}(?:${ENDET}) (?:das |der |die )?(?:${VERTRAG})`),
      re(`auflösend\\w*[^.]{0,80}(?:${ANLASS})|(?:${ANLASS})\\w*[^.]{0,80}auflösend`),
    ] },
  { id: "R17", klausel: "Verschuldensunabhängige Haftung der Beschäftigten (außer Mankoabrede)", grund: "innerbetrieblicher Schadensausgleich, § 619a BGB", alternative: "Haftung nach den gesetzlichen Grundsätzen (K3) oder Mankoabrede mit Mankogeld (K4)", bausteine: ["K3", "K4"],
    muster: [],
    // Mankoabrede (K4) ist erlaubt; "in voller Höhe" nur ohne Bezug auf Vorsatz und grobe Fahrlässigkeit (K3).
    pruefe: (t) => !t.includes("manko") && saetze(t).some((s) => HAFTUNG_STRIKT.test(s) || (HAFTUNG_VOLL.test(s) && !/vorsatz|vorsätzlich|grob/.test(s))) },
];

/** Gesperrte Klauseltypen, die im Text vorkommen (Freitext, Frage an Frag Lintelly, Suche, MCP klausel_pruefen). */
export function findeGesperrte(text: string): RoteKlausel[] {
  if (!text?.trim()) return [];
  const t = vereinheitlicht(text);
  const aussagen = saetze(t).filter((s) => !s.trimEnd().endsWith("?")).join(" ");
  return ROTE_LISTE.filter((r) => r.muster.some((m) => m.test(t)) || (!!aussagen && !!r.pruefe?.(aussagen)));
}

/** Antwort für Dialog und Chat: Grund und sichere Alternative. */
export const antwortZuRot = (r: RoteKlausel) => `Diese Klausel bietet Lintelly nicht an: ${r.klausel}. Grund: ${r.grund}. Sicher ist stattdessen: ${r.alternative}.`;
