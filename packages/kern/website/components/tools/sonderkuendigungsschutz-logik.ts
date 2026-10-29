/** Daten und reine Logik des Sonderkündigungsschutz-Checks. */

export type Antwort = "ja" | "nein" | "unklar";
export type Stufe = "zustimmung" | "ausgeschlossen" | "pruefen";

type Schutz = {
  id: string;
  frage: string;
  /** dieselbe Frage gegliedert, wenn sie mehrere Bedingungen hat (Anzeige, Design-Review 28.10.2026). frage bleibt der ganze Satz. */
  teile?: { satz: string; punkte: string[] };
  hilfe: string;
  titel: string;
  grundlage: string;
  stelle: string;
  zeitraum: string;
  stufe: Stufe;
  schritte: string[];
};

export const SCHUTZ: Schutz[] = [
  {
    id: "mutterschutz",
    frage: "Ist die Person schwanger, hat sie vor höchstens 4 Monaten entbunden, ist sie noch in der Schutzfrist nach der Geburt oder hatte sie eine Fehlgeburt nach der 12. Schwangerschaftswoche?",
    teile: { satz: "Trifft eins davon auf die Person zu?", punkte: ["Sie ist schwanger.", "Sie hat vor höchstens 4 Monaten entbunden.", "Sie ist noch in der Schutzfrist nach der Geburt.", "Sie hatte eine Fehlgeburt nach der 12. Schwangerschaftswoche."] },
    hilfe: "Gilt auch, wenn du von der Schwangerschaft nichts weißt: Sie kann sie bis 2 Wochen nach Zugang der Kündigung mitteilen.",
    titel: "Mutterschutz",
    grundlage: "§ 17 MuSchG",
    stelle: "Aufsichtsbehörde für Mutterschutz des Landes (Arbeitsschutz oder Gewerbeaufsicht)",
    zeitraum: "Schwangerschaft bis Ende der Schutzfrist nach der Entbindung, mindestens 4 Monate danach; nach einer Fehlgeburt ab der 13. Woche 4 Monate",
    stufe: "zustimmung",
    schritte: [
      "Keine Kündigung und keine Vorbereitung einer Kündigung (etwa Nachfolge suchen mit Blick auf die Trennung).",
      "Nur in besonderen Fällen, die nichts mit der Schwangerschaft zu tun haben (zum Beispiel Betriebsstilllegung), vorher die Zulässigkeitserklärung der Landesbehörde beantragen.",
    ],
  },
  {
    id: "elternzeit",
    frage: "Hat die Person Elternzeit verlangt oder ist sie in Elternzeit? Oder arbeitet sie in Teilzeit, während sie Elterngeld bezieht?",
    teile: { satz: "Trifft eins davon auf die Person zu?", punkte: ["Sie hat Elternzeit verlangt.", "Sie ist in Elternzeit.", "Sie arbeitet in Teilzeit, während sie Elterngeld bezieht."] },
    hilfe: "Der Schutz beginnt mit dem Verlangen, frühestens 8 Wochen vor Beginn der Elternzeit, bei Elternzeit zwischen dem 3. und 8. Geburtstag frühestens 14 Wochen vorher.",
    titel: "Elternzeit",
    grundlage: "§ 18 BEEG",
    stelle: "Für den Arbeitsschutz zuständige oberste Landesbehörde oder die von ihr bestimmte Stelle",
    zeitraum: "Ab Verlangen (frühestens 8 bzw. 14 Wochen vor Beginn) bis zum Ende der Elternzeit",
    stufe: "zustimmung",
    schritte: [
      "Keine Kündigung ohne vorherige Zulässigkeitserklärung der Landesbehörde.",
      "Die Erklärung gibt es nur in besonderen Fällen, etwa bei Betriebsstilllegung oder Existenzgefährdung.",
    ],
  },
  {
    id: "pflege",
    frage: "Hat die Person eine kurzzeitige Arbeitsverhinderung, Pflegezeit oder Familienpflegezeit angekündigt oder nimmt sie diese gerade?",
    teile: { satz: "Hat die Person eins davon angekündigt oder nimmt sie es gerade?", punkte: ["kurzzeitige Arbeitsverhinderung", "Pflegezeit", "Familienpflegezeit"] },
    hilfe: "Kurzzeitige Arbeitsverhinderung (bis 10 Tage) gibt es in jedem Betrieb. Pflegezeit ab mehr als 15, Familienpflegezeit ab mehr als 25 Beschäftigten.",
    titel: "Pflegezeit und Familienpflegezeit",
    grundlage: "§ 5 PflegeZG, § 2 Abs. 3 FPfZG",
    stelle: "Für den Arbeitsschutz zuständige oberste Landesbehörde oder die von ihr bestimmte Stelle",
    zeitraum: "Ab Ankündigung, höchstens 12 Wochen vor dem angekündigten Beginn, bis zum Ende der Freistellung",
    stufe: "zustimmung",
    schritte: ["Keine Kündigung ohne vorherige Zulässigkeitserklärung der Landesbehörde.", "Ankündigung mit Datum dokumentieren, damit der Schutzzeitraum klar ist."],
  },
  {
    id: "betriebsrat",
    frage: "Ist die Person Mitglied im Betriebsrat, in der Jugend- und Auszubildendenvertretung oder Vertrauensperson der Schwerbehinderten? Oder ist sie in den letzten 12 Monaten aus dem Amt ausgeschieden?",
    teile: { satz: "Trifft eins davon auf die Person zu?", punkte: ["Sie ist Mitglied im Betriebsrat.", "Sie ist Mitglied in der Jugend- und Auszubildendenvertretung.", "Sie ist Vertrauensperson der Schwerbehinderten.", "Sie ist in den letzten 12 Monaten aus einem dieser Ämter ausgeschieden."] },
    hilfe: "Auch Ersatzmitglieder, solange sie nachrücken oder vertreten haben.",
    titel: "Amtsträger der Betriebsverfassung",
    grundlage: "§ 15 Abs. 1 KSchG, § 103 BetrVG, § 179 Abs. 3 SGB IX",
    stelle: "Betriebsrat (Zustimmung), ersatzweise Arbeitsgericht",
    zeitraum: "Während der Amtszeit und 1 Jahr nach ihrem Ende",
    stufe: "ausgeschlossen",
    schritte: [
      "Ordentliche Kündigung ist ausgeschlossen (Ausnahme: Stilllegung des Betriebs oder der Abteilung).",
      "Fristlose Kündigung nur aus wichtigem Grund und während der Amtszeit nur mit Zustimmung des Betriebsrats oder deren Ersetzung durch das Arbeitsgericht.",
      "Die 2-Wochen-Frist für die fristlose Kündigung (§ 626 Abs. 2 BGB) läuft parallel. Den Zustimmungsantrag sofort stellen.",
    ],
  },
  {
    id: "wahl",
    frage: "Ist die Person im Wahlvorstand, Wahlbewerber oder hat sie zu einer Betriebsratswahl eingeladen oder eine Wahl beglaubigt vorbereitet?",
    teile: { satz: "Trifft eins davon auf die Person zu?", punkte: ["Sie ist im Wahlvorstand.", "Sie ist Wahlbewerberin oder Wahlbewerber.", "Sie hat zu einer Betriebsratswahl eingeladen.", "Sie hat eine Wahl beglaubigt vorbereitet."] },
    hilfe: "Der Schutz wirkt nach: für Wahlvorstand und Bewerber 6 Monate nach Bekanntgabe des Wahlergebnisses.",
    titel: "Betriebsratswahl",
    grundlage: "§ 15 Abs. 3, 3a, 3b KSchG, § 103 BetrVG",
    stelle: "Betriebsrat oder Arbeitsgericht (Zustimmung zur fristlosen Kündigung)",
    zeitraum: "Ab Bestellung, Aufstellung oder Einladung bis zur Bekanntgabe des Wahlergebnisses, für Wahlvorstand und Bewerber danach 6 Monate nachwirkend",
    stufe: "ausgeschlossen",
    schritte: [
      "Ordentliche Kündigung ist ausgeschlossen.",
      "Fristlose Kündigung nur aus wichtigem Grund, im Zeitraum vor der Bekanntgabe nur mit Zustimmung des Betriebsrats oder des Arbeitsgerichts.",
      "Vorfeld-Initiatoren mit beglaubigter Erklärung (§ 15 Abs. 3b KSchG) sind gegen personen- und verhaltensbedingte Kündigungen geschützt. Diesen Fall einzeln prüfen.",
    ],
  },
  {
    id: "schwerbehindert",
    frage: "Ist die Person schwerbehindert (Grad der Behinderung ab 50) oder einem schwerbehinderten Menschen gleichgestellt?",
    hilfe: "Wähle „unklar“, wenn ein Antrag läuft oder du es nicht weißt. Der Schutz kann auch ohne dein Wissen greifen.",
    titel: "Schwerbehinderung oder Gleichstellung",
    grundlage: "§§ 168 bis 175 SGB IX, § 178 Abs. 2 SGB IX",
    stelle: "Integrationsamt (Inklusionsamt) des Landes",
    zeitraum: "Ab einem Arbeitsverhältnis von mehr als 6 Monaten ohne Unterbrechung",
    stufe: "zustimmung",
    schritte: [
      "Vor der Kündigung die Zustimmung des Integrationsamts beantragen. Bei ordentlicher Kündigung soll es innerhalb eines Monats entscheiden.",
      "Die Schwerbehindertenvertretung vorher unterrichten und anhören. Ohne Anhörung ist die Kündigung unwirksam.",
      "Nach der Zustimmung die Kündigung innerhalb eines Monats zustellen. Die Kündigungsfrist beträgt mindestens 4 Wochen.",
      "Bei fristloser Kündigung den Antrag innerhalb von 2 Wochen ab Kenntnis des Grundes stellen.",
    ],
  },
  {
    id: "dsb",
    frage: "Ist die Person eure benannte Datenschutzbeauftragte, weil ihr eine benennen müsst? Oder wurde sie in den letzten 12 Monaten abberufen?",
    teile: { satz: "Trifft eins davon auf die Person zu?", punkte: ["Sie ist eure benannte Datenschutzbeauftragte, weil ihr eine benennen müsst.", "Sie wurde in den letzten 12 Monaten als Datenschutzbeauftragte abberufen."] },
    hilfe: "Pflicht in der Regel, wenn mindestens 20 Personen ständig mit der automatisierten Verarbeitung personenbezogener Daten beschäftigt sind. Bei freiwilliger Benennung gilt der Schutz nicht.",
    titel: "Datenschutzbeauftragte",
    grundlage: "§ 38 Abs. 2 in Verbindung mit § 6 Abs. 4 BDSG",
    stelle: "Keine Behörde. Nur Kündigung aus wichtigem Grund (§ 626 BGB)",
    zeitraum: "Während der Benennung und 1 Jahr nach dem Ende der Tätigkeit",
    stufe: "ausgeschlossen",
    schritte: ["Ordentliche Kündigung ist ausgeschlossen.", "Fristlose Kündigung nur aus wichtigem Grund und innerhalb von 2 Wochen ab Kenntnis."],
  },
  {
    id: "azubi",
    frage: "Ist die Person Auszubildende oder Auszubildender und ist die Probezeit vorbei?",
    hilfe: "Die Probezeit in der Ausbildung dauert 1 bis 4 Monate.",
    titel: "Ausbildung nach der Probezeit",
    grundlage: "§ 22 BBiG",
    stelle: "Keine Behörde. Gibt es bei der Kammer einen Schlichtungsausschuss, muss er vor einer Klage angerufen werden.",
    zeitraum: "Vom Ende der Probezeit bis zum Ende der Ausbildung",
    stufe: "ausgeschlossen",
    schritte: [
      "Ordentliche Kündigung durch den Betrieb ist ausgeschlossen.",
      "Fristlose Kündigung nur aus wichtigem Grund, schriftlich und mit Angabe der Gründe, innerhalb von 2 Wochen ab Kenntnis.",
    ],
  },
  {
    id: "beauftragte",
    frage: "Ist die Person bestellte Immissionsschutz-, Störfall-, Abfall- oder Gewässerschutzbeauftragte? Oder wurde sie in den letzten 12 Monaten abberufen?",
    teile: { satz: "Ist die Person für eins davon bestellt oder wurde sie in den letzten 12 Monaten abberufen?", punkte: ["Immissionsschutzbeauftragte", "Störfallbeauftragte", "Abfallbeauftragte", "Gewässerschutzbeauftragte"] },
    hilfe: "Betrifft vor allem Betriebe mit genehmigungsbedürftigen Anlagen, Abfallerzeuger und Abwassereinleiter.",
    titel: "Betriebsbeauftragte für Umweltschutz",
    grundlage: "§§ 58, 58d BImSchG, § 60 Abs. 3 KrWG, § 66 WHG",
    stelle: "Keine Behörde. Nur Kündigung aus wichtigem Grund",
    zeitraum: "Während der Bestellung und 1 Jahr nach der Abberufung",
    stufe: "ausgeschlossen",
    schritte: ["Ordentliche Kündigung ist ausgeschlossen.", "Fristlose Kündigung nur aus wichtigem Grund."],
  },
  {
    id: "wehrdienst",
    frage: "Hat die Person einen Einberufungsbescheid erhalten oder leistet sie gerade Wehrdienst oder eine Wehrübung?",
    teile: { satz: "Trifft eins davon auf die Person zu?", punkte: ["Sie hat einen Einberufungsbescheid erhalten.", "Sie leistet gerade Wehrdienst oder eine Wehrübung."] },
    hilfe: "Gilt auch für den freiwilligen Wehrdienst.",
    titel: "Wehrdienst und Wehrübung",
    grundlage: "§ 2 ArbPlSchG",
    stelle: "Keine Behörde. Nur Kündigung aus wichtigem Grund",
    zeitraum: "Ab Zustellung des Einberufungsbescheids bis zum Ende des Wehrdienstes, auch während einer Wehrübung",
    stufe: "ausgeschlossen",
    schritte: ["Ordentliche Kündigung ist ausgeschlossen.", "Die Einberufung ist kein wichtiger Grund für eine fristlose Kündigung."],
  },
  {
    id: "hinweisgeber",
    frage: "Hat die Person in letzter Zeit einen Verstoß gemeldet, intern oder bei einer externen Meldestelle?",
    hilfe: "Es gibt keinen Zustimmungsvorbehalt. Aber eine Kündigung als Reaktion auf die Meldung ist verboten.",
    titel: "Hinweisgeberschutz",
    grundlage: "§ 36 HinSchG",
    stelle: "Keine Behörde. Im Streit musst du beweisen, dass die Kündigung nichts mit der Meldung zu tun hat",
    zeitraum: "Kein fester Zeitraum. Je näher die Kündigung an der Meldung liegt, desto schwerer der Nachweis",
    stufe: "pruefen",
    schritte: [
      "Den Kündigungsgrund unabhängig von der Meldung belegen: Daten, Abmahnungen, Gesprächsnotizen von vor der Meldung.",
      "Bei zeitlicher Nähe zur Meldung vor der Kündigung rechtlich prüfen lassen.",
    ],
  },
];

export type Treffer = Schutz & { antwort: Antwort; effektiv: Stufe; zusatz?: string };

export function auswerten(a: Record<string, Antwort>, sechsMonate: Antwort): Treffer[] {
  const out: Treffer[] = [];
  for (const s of SCHUTZ) {
    const ant = a[s.id];
    if (ant !== "ja" && ant !== "unklar") continue;
    let effektiv: Stufe = ant === "unklar" ? "pruefen" : s.stufe;
    let zusatz: string | undefined;
    let schritte = s.schritte;
    if (s.id === "schwerbehindert") {
      if (ant === "unklar") {
        zusatz =
          "Wenn ein Antrag läuft: Der Schutz greift, wenn der Antrag mindestens 3 Wochen vor Zugang der Kündigung gestellt wurde und später positiv beschieden wird. Im Zweifel die Zustimmung vorsorglich beantragen (das Integrationsamt erteilt dann ein Negativattest, wenn sie nicht nötig ist).";
      } else if (sechsMonate === "nein") {
        effektiv = "pruefen";
        schritte = [
          "Die Zustimmung des Integrationsamts ist nicht nötig. Es gilt die normale Kündigungsfrist.",
          "Die Schwerbehindertenvertretung vorher unterrichten und anhören, falls es eine gibt (§ 178 Abs. 2 SGB IX). Ohne Anhörung ist die Kündigung unwirksam.",
          "Die Kündigung dem Integrationsamt innerhalb von 4 Tagen anzeigen (§ 173 Abs. 4 SGB IX).",
        ];
        zusatz =
          "Das Arbeitsverhältnis besteht noch keine 6 Monate. Die Zustimmung des Integrationsamts ist dann nicht nötig. Die Schwerbehindertenvertretung musst du trotzdem anhören, und die Kündigung musst du dem Integrationsamt innerhalb von 4 Tagen anzeigen.";
      } else if (sechsMonate === "unklar") {
        zusatz = "Kläre, ob das Arbeitsverhältnis länger als 6 Monate ohne Unterbrechung besteht. Ab dann ist die Zustimmung Pflicht.";
      }
    } else if (ant === "unklar") {
      zusatz = "Kläre den Sachverhalt vor jeder Kündigung. Behandle den Fall bis dahin so, als bestünde der Schutz.";
    }
    out.push({ ...s, schritte, antwort: ant, effektiv, zusatz });
  }
  const rank = { zustimmung: 0, ausgeschlossen: 1, pruefen: 2 } as const;
  return out.sort((x, y) => rank[x.effektiv] - rank[y.effektiv]);
}

/** Gesamturteil: Grün erst, wenn alle Fragen beantwortet sind (Review 28.10.2026, A1). Treffer zeigen schon vorher Rot oder Gelb. */
export function stand(treffer: Treffer[], offen: number): { titel: string; ampel: "rot" | "gelb" | "gruen" | "aus" } {
  const rot = treffer.filter((t) => t.effektiv !== "pruefen").length;
  if (treffer.some((t) => t.effektiv === "zustimmung")) return { titel: "Ohne Zustimmung keine Kündigung", ampel: "rot" };
  if (rot > 0) return { titel: "Ordentliche Kündigung ausgeschlossen", ampel: "rot" };
  if (treffer.length > 0) return { titel: "Vor der Kündigung klären", ampel: "gelb" };
  if (offen > 0) return { titel: `Noch nicht vollständig, ${offen} ${offen === 1 ? "Frage" : "Fragen"} offen`, ampel: "aus" };
  return { titel: "Kein Sonderschutz erkennbar", ampel: "gruen" };
}

/** Roving Tabindex der Antwort-Gruppen: Ziel-Index für eine Taste, null, wenn die Taste nichts tut. Pfeile laufen im Kreis. */
export function pfeilZiel(i: number, taste: string, n: number): number | null {
  if (taste === "ArrowRight" || taste === "ArrowDown") return (i + 1) % n;
  if (taste === "ArrowLeft" || taste === "ArrowUp") return (i - 1 + n) % n;
  if (taste === "Home") return 0;
  if (taste === "End") return n - 1;
  return null;
}
