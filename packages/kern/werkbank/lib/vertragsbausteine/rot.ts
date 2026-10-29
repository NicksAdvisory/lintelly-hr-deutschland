/**
 * Rote Liste (Katalog Abschnitt 6): 17 Klauseltypen, die in jeder Form unwirksam oder verboten sind. Lintelly bietet sie nicht an.
 * Wer danach fragt (Suche im Dialog, Frag Lintelly, eigene Ergänzung im Baustein), bekommt den Grund und die sichere Alternative.
 * Rein, ohne Datenbank.
 */
export type RoteKlausel = { id: string; klausel: string; grund: string; alternative: string; bausteine: string[]; muster: RegExp[] };

export const ROTE_LISTE: RoteKlausel[] = [
  { id: "R1", klausel: "Nachvertragliches Wettbewerbsverbot ohne oder mit zu niedriger Karenzentschädigung oder mit salvatorischer Ersatzklausel", grund: "§ 74 Abs. 2 HGB, BAG 10 AZR 448/15", alternative: "Wettbewerbsverbot mit fester Karenzentschädigung von mindestens der Hälfte der letzten Bezüge (Baustein M2) oder Kundenschutz mit Karenz (M3)", bausteine: ["M2", "M3"],
    muster: [/wettbewerbsverbot[^.]{0,80}(ohne|keine)[^.]{0,30}(entschädigung|karenz)/i, /(ohne|keine)[^.]{0,30}karenz/i, /mandantenschutz[^.]{0,60}ohne/i, /kundenschutz[^.]{0,60}ohne[^.]{0,20}(entschädigung|karenz)/i] },
  { id: "R2", klausel: "Wettbewerbsverbot bei Minderjährigen, per Ehrenwort oder durch Übernahme durch Dritte", grund: "§ 74a Abs. 2 HGB", alternative: "Kein nachvertragliches Verbot; während des Arbeitsverhältnisses gilt das Wettbewerbsverbot ohnehin (M1)", bausteine: ["M1"],
    muster: [/ehrenwort/i, /wettbewerbsverbot[^.]{0,60}(minderjährig|azubi|auszubildend)/i] },
  { id: "R3", klausel: "Freiwilligkeitsvorbehalt und Widerrufsvorbehalt für dieselbe Leistung", grund: "intransparent, BAG 10 AZR 526/10", alternative: "Eine Wahl je Leistung: Freiwilligkeitsvorbehalt (D21) oder Widerrufsvorbehalt (D22)", bausteine: ["D21", "D22"],
    muster: [/freiwillig[^.]{0,60}(und|sowie)[^.]{0,20}widerruf/i, /widerruf[^.]{0,40}(und|sowie)[^.]{0,20}freiwillig/i] },
  { id: "R4", klausel: "Erforderliche Überstunden sind mit dem Gehalt abgegolten (ohne Zahl)", grund: "Transparenzgebot, BAG 5 AZR 406/10 und 5 AZR 517/09", alternative: "Überstundenpauschale mit fester Stundenzahl (C2) oder Ausgleich nach C1", bausteine: ["C2", "C1"],
    muster: [/überstunden[^.]{0,60}(mit dem gehalt|durch das gehalt|pauschal)[^.]{0,30}abgegolten/i, /(alle|sämtliche) überstunden[^.]{0,40}abgegolten/i] },
  { id: "R5", klausel: "Rückzahlung von Ausbildungskosten, Vertragsstrafe oder nachvertragliches Wettbewerbsverbot in der Berufsausbildung", grund: "§ 12 BBiG", alternative: "Keine. Weiterbildung nach der Ausbildung über eine eigene Fortbildungsvereinbarung (L2)", bausteine: ["L2"],
    muster: [/(azubi|auszubildend|ausbildung)[^.]{0,60}(rückzahl|vertragsstrafe|wettbewerbsverbot)/i, /(rückzahl|vertragsstrafe)[^.]{0,60}(azubi|auszubildend|ausbildungskosten)/i] },
  { id: "R6", klausel: "Ausschlussfrist ohne Ausnahme für Mindestlohn und Vorsatz, unter drei Monaten, mit Schriftform oder nur für die Person", grund: "§ 3 MiLoG, § 202 BGB, § 309 Nr. 13 BGB, BAG 9 AZR 162/18", alternative: "Ausschlussfrist in Textform, beidseitig, mit allen Ausnahmen (Q1)", bausteine: ["Q1"], // kein-recht: Name der Klausel aus dem Katalog
    muster: [/ausschlussfrist[^.]{0,80}(schriftlich|schriftform)/i, /ausschlussfrist[^.]{0,60}(ohne|kein)[^.]{0,20}(mindestlohn|ausnahme)/i, /verfall(en|frist)[^.]{0,60}(einen monat|vier wochen|zwei wochen)/i] },
  { id: "R7", klausel: "Verzicht im Voraus auf Entgeltfortzahlung, Mindesturlaub, Mindestlohn, Zeugnis oder Kündigungsschutz", grund: "§ 12 EFZG, § 13 BUrlG, § 3 MiLoG, § 109 GewO, § 4 KSchG", alternative: "Keine. Die gesetzlichen Ansprüche bleiben, freiwillige Mehrleistungen lassen sich eigenständig regeln (E1, F2)", bausteine: ["E1", "F2"],
    muster: [/verzicht[^.]{0,60}(entgeltfortzahlung|mindesturlaub|urlaub|mindestlohn|zeugnis|kündigungsschutz)/i, /(ohne|kein) anspruch auf (entgeltfortzahlung|urlaub|zeugnis)/i] },
  { id: "R8", klausel: "Stichtags- oder Bindungsklausel bei Zahlungen, die Arbeit vergüten (Provision, Zielbonus, 13. Gehalt mit Mischcharakter, Tantieme)", grund: "BAG 10 AZR 612/10, 10 AZR 848/12", alternative: "Anteilige Zahlung bei Ein- und Austritt (Pro rata); Stichtag nur bei reiner Betriebstreue (D18 mit D19)", bausteine: ["D18", "D19"],
    muster: [/(provision|bonus|tantieme|13\.\s*gehalt|dreizehnt)[^.]{0,80}(ungekündigt|stichtag|nur wer am)/i, /ungekündigt[^.]{0,60}(provision|bonus|tantieme)/i, /stichtagsklausel/i] },
  { id: "R9", klausel: "Doppelte Schriftformklausel", grund: "BAG 9 AZR 382/07 (Aktenzeichen prüfen), § 305b BGB", alternative: "Änderungen in Textform mit Vorrang der Individualabrede (Q4)", bausteine: ["Q4"],
    // Entscheidung 24: auch "Aufhebung dieses Formerfordernisses" und "Aufhebung des Schriftformerfordernisses".
    muster: [/(auch|selbst) (für )?(die )?aufhebung (dieser|der) (schriftform|klausel)/i, /aufhebung (dieses|des|eines) (schrift)?form(erfordernisses|zwangs)/i, /doppelte schriftform/i, /schriftformklausel[^.]{0,40}(selbst|auch)/i] },
  { id: "R10", klausel: "Schiedsabrede für Streitigkeiten aus dem Arbeitsverhältnis", grund: "§ 101 ArbGG (aus bekannter Fassung, Kanzlei prüfen)", alternative: "Gesetzlicher Gerichtsstand vor dem Arbeitsgericht (Q5)", bausteine: ["Q5"],
    muster: [/schiedsgericht|schiedsabrede|schiedsverfahren|schiedsklausel/i] },
  { id: "R11", klausel: "Verzicht auf Kündigungsschutzklage im Voraus; Tatsachenbestätigung, die die Beweislast ändert", grund: "§ 4 KSchG, § 309 Nr. 12 BGB", alternative: "Empfangsbestätigung auf eigener Seite mit eigener Unterschrift (Q7)", bausteine: ["Q7"],
    muster: [/verzicht[^.]{0,40}(kündigungsschutzklage|klage)/i, /bestätigt[^.]{0,60}(alles|vollständig) (gelesen|verstanden)/i] },
  { id: "R12", klausel: "Verbot von Gewerkschaft, Betriebsratskandidatur, Meldung an Behörden oder jeder Äußerung über den Arbeitgeber", grund: "Art. 9 GG, § 78 BetrVG, HinSchG", alternative: "Hinweisgeberschutz (H3) und Regel für soziale Medien ohne Meinungsverbot (H4)", bausteine: ["H3", "H4"],
    muster: [/(verbot|untersagt|darf nicht)[^.]{0,60}(gewerkschaft|betriebsrat|behörde|äußerung)/i, /(gewerkschaft|betriebsrat)[^.]{0,40}(verboten|untersagt)/i, /keine (meldung|anzeige) an behörden/i] },
  { id: "R13", klausel: "Einseitige Versetzung in eine andere Gesellschaft des Konzerns", grund: "Arbeitgeberwechsel braucht Zustimmung, § 106 GewO reicht nicht", alternative: "Versetzung nur an Standorte desselben Arbeitgebers (B2), Wechsel per Änderungsvertrag", bausteine: ["B2"],
    muster: [/(versetz|abordn)[^.]{0,60}(konzern|andere gesellschaft|verbundene[ns]? unternehmen|tochtergesellschaft)/i] },
  { id: "R14", klausel: "Kündigungsfrist nur für die Person verlängert", grund: "§ 622 Abs. 6 BGB", alternative: "Verlängerte Fristen für beide Seiten (P3)", bausteine: ["P3"],
    muster: [/(arbeitnehmer|person|mitarbeiter)[^.]{0,40}längere kündigungsfrist/i, /kündigungsfrist[^.]{0,40}nur für (den arbeitnehmer|die person|die mitarbeiter)/i] },
  { id: "R15", klausel: "Abwälzung von Kosten, die das Gesetz dem Arbeitgeber auferlegt (Schutzausrüstung, Pflichtfortbildung)", grund: "§ 3 Abs. 3 ArbSchG, § 111 GewO", alternative: "Schutzausrüstung stellt der Arbeitgeber (K2), Pflichtfortbildung kostenfrei in der Arbeitszeit (L1)", bausteine: ["K2", "L1"],
    muster: [/(schutzausrüstung|schutzkleidung|psa|pflichtfortbildung|pflichtschulung)[^.]{0,60}(trägt|zahlt|kosten)[^.]{0,30}(arbeitnehmer|person|mitarbeiter|selbst)/i] },
  { id: "R16", klausel: "Auflösende Bedingung, die an Krankheit, Schwangerschaft, Elternzeit oder Betriebsratsamt anknüpft", grund: "§ 14 TzBfG, § 17 MuSchG, § 18 BEEG, § 612a BGB", alternative: "Auflösende Bedingung nur aus der zulässigen Liste (A6)", bausteine: ["A6"],
    muster: [/(endet|auflösend)[^.]{0,60}(krankheit|arbeitsunfähig|schwanger|elternzeit|betriebsrat)/i] },
  { id: "R17", klausel: "Verschuldensunabhängige Haftung der Beschäftigten (außer Mankoabrede)", grund: "innerbetrieblicher Schadensausgleich, § 619a BGB", alternative: "Haftung nach den gesetzlichen Grundsätzen (K3) oder Mankoabrede mit Mankogeld (K4)", bausteine: ["K3", "K4"],
    muster: [/(haftet|haftung)[^.]{0,40}(unabhängig vom verschulden|ohne verschulden|verschuldensunabhängig|für jeden schaden|in voller höhe)/i] },
];

/** Gesperrte Klauseltypen, die im Text vorkommen (Freitext, Frage an Frag Lintelly, Suche). */
export function findeGesperrte(text: string): RoteKlausel[] {
  if (!text?.trim()) return [];
  return ROTE_LISTE.filter((r) => r.muster.some((m) => m.test(text)));
}

/** Antwort für Dialog und Chat: Grund und sichere Alternative. */
export const antwortZuRot = (r: RoteKlausel) => `Diese Klausel bietet Lintelly nicht an: ${r.klausel}. Grund: ${r.grund}. Sicher ist stattdessen: ${r.alternative}.`;
