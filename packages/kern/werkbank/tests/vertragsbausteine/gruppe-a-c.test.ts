/** Gruppen A, B und C der Vertragsbausteine: Texte mit Pflichtsätzen, vollständige Standardfälle ohne Sperre, jede Regel rot und grün. */
import { describe, expect, it } from "vitest";
import { WERTE, monateText } from "@/lib/regeln/werte";
import { BAUSTEIN } from "@/lib/vertragsbausteine/katalog";
import { pruefeVertrag } from "@/lib/vertragsbausteine/pruefen";
import { A3_LISTE, A6_RENTE, A6_WEGFALL, A9_OHNE, A9_ZWECK } from "@/lib/vertragsbausteine/gruppe-a";
import { befund, eingabe, lage, schlaegt, text } from "./hilfe";

const STANDARD: Record<string, Record<string, string>> = {
  A1: { nachweis: "Aufenthaltstitel, der die Beschäftigung erlaubt", hoechstdatum: "2026-12-31", folge: "Vertrag wird gegenstandslos" },
  A2: { nachweis: "Fahrerlaubnis der nötigen Klasse", hoechstdatum: "2026-12-31", folge: "Beginn verschiebt sich bis höchstens zum Höchstdatum" },
  A3: { grundlage: A3_LISTE[1], frist: "2026-10-30" },
  A4: { art: "einfaches Führungszeugnis (§ 30 BZRG)", begruendung: "Vermögensverantwortung", frist: "2026-10-30" },
  A5: { grundlage: "Zuverlässigkeitsüberprüfung nach dem Luftsicherheitsgesetz", frist: "2026-10-30" },
  A6: { bedingung: A6_RENTE },
  A7: { regel: "ausgeschlossen für beide Seiten" },
  A8: { dauerMonate: "6", fristTage: "14" },
  A9: { art: "Zeitbefristung mit Sachgrund", sachgrund: "Vertretung", ende: "2027-10-31", vorbeschaeftigung: "nein" },
  A10: { vorbeschaeftigung: "nein", nebentaetigkeiten: "Trainer im Sportverein", nebenStunden: "3" },
  B1: { rahmen: "Vertrieb und Kundenbetreuung", umfang: "nur gleichwertige Tätigkeit" },
  B2: { standort: "Frankfurt am Main", grenze: "Radius um den Standort", radiusKm: "50", ankuendigungWochen: "4", kosten: "Arbeitgeber trägt zusätzliche Fahrtkosten", andereGesellschaft: "nein" },
  B3: { umfang: "bis zu einer Zahl von Tagen pro Woche", tage: "2", ort: "Wohnung in Deutschland", anspruch: "kein Rechtsanspruch, nach Absprache", widerrufWochen: "4", ausstattung: "Firmenlaptop", kosten: "keine Erstattung" },
  B4: { adresse: "Musterweg 1, Frankfurt", ausstattung: "Laptop, Bildschirm, Stuhl", rueckkehr: "ja" },
  B5: { anteil: "30", gebiet: "Inland", verkehrsmittel: "Bahn|Pkw", ruecksicht: "ja" },
  B6: { reisezeit: "voll als Arbeitszeit", erstattung: "nach der Reisekostenrichtlinie", vorschuss: "ja", belegMonate: "3" },
  B7: { land: "Polen", dauerMonate: "3", waehrung: "Euro", sachleistungen: "Wohnung und ein Heimflug im Monat", sozialversicherung: "A1-Bescheinigung beantragt", krankenversicherung: "Auslandskrankenversicherung", rueckkehr: "Rückkehr auf die bisherige Stelle" },
  C1: { voraussetzung: "Anordnung des Arbeitgebers", grenzeMonat: "10", ausgleich: "Freizeitausgleich", ausgleichMonate: "6" },
  C2: { stunden: "10", darueber: "werden vergütet" },
  C3: { ausgleichMonate: "12", plusMax: "40", minusMax: "20", minus: "Ausgleich durch Nacharbeit im Ausgleichszeitraum" },
  C4: { erfassung: "elektronisches Zeiterfassungssystem" },
  C5: { rahmenVon: "7", rahmenBis: "20", kernVon: "10", kernBis: "15", saldo: "Ausgleich im Kalendermonat" },
  C6: { modell: "Frühschicht und Spätschicht", rhythmus: "wöchentlicher Wechsel", aenderung: "dringende betriebliche Gründe mit Ankündigung", ankuendigungTage: "14" },
  C7: { haeufigkeit: "5", reaktionMinuten: "30", pauschale: "50", einsatz: "als Arbeitszeit mit dem anteiligen Stundenlohn" },
  C8: { stundenMonat: "40", bewertung: "50" },
  C9: { mindestStunden: "10", zeitrahmen: "Montag bis Freitag, 8 bis 18 Uhr", ankuendigungTage: "4" },
  C10: { voraussetzung: "erheblicher Arbeitsausfall mit Anzeige bei der Agentur für Arbeit", ankuendigungTage: "14", hoechstMonate: "6", umfang: "teilweise Verkürzung", anpassungTage: "3" },
  C11: { nachtAusgleich: "Zuschlag", nachtZuschlag: "25" },
  C12: { art: "Sabbatical", anspar: "Ein Teil des Gehalts wird angespart", entnahme: "Freistellung nach Ankündigung", insolvenz: "doppelseitige Treuhand", bewertung: "in Geld" },
};
const IDS = Object.keys(STANDARD);
const mit = (id: string, w: Record<string, string> = {}) => ({ [id]: { ...STANDARD[id], ...w } });

describe("Gruppen A bis C: Aufbau", () => {
  it("alle Bausteine A1 bis A10, B1 bis B7, C1 bis C12 sind im Katalog", () => {
    expect(IDS.length).toBe(29);
    for (const id of IDS) expect(BAUSTEIN[id], id).toBeTruthy();
  });

  it("vollständig ausgefüllter Standardfall: keine Eingabefehler und keine Sperre", () => {
    for (const id of IDS) {
      expect(eingabe({ [id]: STANDARD[id] }), id).toEqual([]);
      expect(pruefeVertrag(lage({ [id]: STANDARD[id] })).befunde.filter((b) => b.art === "sperre"), id).toEqual([]);
    }
  });

  it("Texte ohne offene Platzhalter, ohne Gedankenstrich und ohne Ausrufezeichen", () => {
    for (const id of IDS) {
      const t = text(id, STANDARD[id]);
      expect(t, id).not.toMatch(/\[[A-ZÄÖÜ][^\]]*\]/);
      expect(t, id).not.toMatch(/[–—!]/);
      expect(t, id).toContain("(1) ");
    }
  });

  it("Schriftform (nass) bei A6 und A9, ersetzt nur bei C1", () => {
    expect(BAUSTEIN.A6.nass).toBe(true);
    expect(BAUSTEIN.A9.nass).toBe(true);
    expect(IDS.filter((id) => BAUSTEIN[id].ersetzt)).toEqual(["C1"]);
    expect(BAUSTEIN.C1.ersetzt).toBe("§ 5");
    expect(IDS.every((id) => !BAUSTEIN[id].fuer.includes("ausbildung"))).toBe(true);
  });
});

describe("Pflichtsätze im Text", () => {
  it("A1: keine Beschäftigung vor dem Titel, Kopie aufbewahren", () => {
    const t = text("A1", STANDARD.A1);
    expect(t).toContain("beschäftigt der Arbeitgeber Paul nicht");
    expect(t).toContain("31.12.2026");
    expect(t).toContain("Kopie des Titels");
  });
  it("A3: nur geeignet oder nicht geeignet, keine Diagnose, Kosten Arbeitgeber", () => {
    const t = text("A3", STANDARD.A3);
    expect(t).toContain("geeignet oder nicht geeignet");
    expect(t).toContain("Diagnosen und Befunde erfährt er nicht");
    expect(t).toContain("Die Kosten trägt der Arbeitgeber");
  });
  it("A4: erweitertes Zeugnis mit schriftlicher Aufforderung, keine Kopie", () => {
    const t = text("A4", { ...STANDARD.A4, art: "erweitertes Führungszeugnis (§ 30a BZRG)", begruendung: "Kinder und Jugendliche" });
    expect(t).toContain("§ 30a Abs. 1 BZRG");
    expect(t).toContain("keine Kopie");
  });
  it("A5: Einwilligung getrennt vom Vertrag", () => expect(text("A5", STANDARD.A5)).toContain("getrennt von diesem Vertrag"));
  it("A6: Ende frühestens zwei Wochen nach schriftlicher Unterrichtung", () => {
    expect(text("A6", STANDARD.A6)).toContain("frühestens zwei Wochen nach Zugang der schriftlichen Unterrichtung");
    expect(text("A6", { bedingung: A6_WEGFALL, erlaubnis: "Fahrerlaubnis Klasse CE" })).toContain("Fahrerlaubnis Klasse CE");
  });
  it("A7: Ausschluss für beide Seiten, wichtiger Grund bleibt", () => {
    const t = text("A7", STANDARD.A7);
    expect(t).toContain("für beide Seiten gleich");
    expect(t).toContain("§ 626 BGB");
    expect(text("A7", { regel: "zulässig mit Frist" })).toContain("zwei Wochen");
  });
  it("A8: Probezeit ab tatsächlichem Beginn, keine einseitige Verlängerung", () => {
    const t = text("A8", STANDARD.A8);
    expect(t).toContain("6 Monate ab dem tatsächlichen Arbeitsbeginn");
    expect(t).toContain("Eine einseitige Verlängerung durch den Arbeitgeber gibt es nicht");
  });
  it("A9: Schriftform, Zweckbefristung mit Auslauffrist, Meldepflicht", () => {
    expect(text("A9", STANDARD.A9)).toContain("Schriftform");
    expect(text("A9", STANDARD.A9)).toContain("arbeitsuchend melden");
    const z = text("A9", { art: A9_ZWECK, sachgrund: "Vertretung", zweck: "Rückkehr von Frau Meier aus der Elternzeit", vorbeschaeftigung: "nein" });
    expect(z).toContain("frühestens zwei Wochen nach Zugang der schriftlichen Unterrichtung");
    expect(text("A9", { art: A9_OHNE, ende: "2028-06-30", vorbeschaeftigung: "nein" })).toContain("nur vor Ablauf der Befristung");
  });
  it("A10: Mitteilungspflicht, Erklärung ersetzt Prüfung nicht", () => {
    const t = text("A10", STANDARD.A10);
    expect(t).toContain("unverzüglich in Textform");
    expect(t).toContain("ersetzt nicht die eigene Prüfung");
  });
  it("B1: gleichwertig, Interessen, Entgelt bleibt", () => {
    const t = text("B1", { ...STANDARD.B1, umfang: "vorübergehend auch niedriger bewertete Tätigkeit", dauerMonate: "3", entgeltschutz: "ja" });
    expect(t).toContain("Interessen");
    expect(t).toContain("Das Entgelt bleibt gleich");
    expect(t).toContain("3 Monate");
  });
  it("B2: Wechsel der Gesellschaft nur mit Zustimmung", () => expect(text("B2", STANDARD.B2)).toContain("nur mit Zustimmung von Paul"));
  it("B3: Zeiterfassung, Datenschutz, Widerruf mit Grund", () => {
    const t = text("B3", STANDARD.B3);
    expect(t).toContain("Die Arbeitszeit wird auch beim mobilen Arbeiten vollständig erfasst");
    expect(t).toContain("schützt Daten");
    expect(t).toContain("nennt den Grund");
    expect(text("B3", { ...STANDARD.B3, ort: "außerhalb der EU und des EWR", auslandPruefung: "Steuerbüro Muster, 01.10.2026" })).toContain("Steuerbüro Muster");
  });
  it("B4: Zutritt nur mit Zustimmung", () => expect(text("B4", STANDARD.B4)).toContain("Zustimmung kann jederzeit verweigert"));
  it("B5 und B6: Ruhezeiten, Mindestlohn bei Reisezeit", () => {
    expect(text("B5", STANDARD.B5)).toContain("Ruhezeiten");
    expect(text("B6", STANDARD.B6)).toContain("mindestens den gesetzlichen Mindestlohn");
  });
  it("B7: Pflichtangaben bei Auslandseinsatz", () => {
    const t = text("B7", STANDARD.B7);
    expect(t).toContain("Euro");
    expect(t).toContain("Rückkehr");
  });
  it("C1 ersetzt § 5: Überstunden und Anordnung, Standardzeitraum", () => {
    const t = text("C1", STANDARD.C1);
    expect(t).toContain("Überstunden");
    expect(t).toContain("Anordnung");
    expect(text("C1", { ...STANDARD.C1, ausgleichMonate: "" })).toContain(`innerhalb von ${monateText(WERTE.vertragStandards.ueberstundenAusgleichMonate)}`);
  });
  it("C2: feste Zahl, Erfassung, Mindestlohn", () => {
    const t = text("C2", STANDARD.C2);
    expect(t).toContain("bis zu 10 Überstunden");
    expect(t).toContain("Die Arbeitszeit wird vollständig erfasst");
    expect(t).toContain("Mindestlohn");
  });
  it("C3: Auszahlung bei Ende, kein Verfall", () => {
    const t = text("C3", STANDARD.C3);
    expect(t).toContain("zahlt der Arbeitgeber offene Plusstunden");
    expect(t).toContain("sie verfallen nicht");
  });
  it("C4: Die Arbeitszeit wird erfasst", () => expect(text("C4", STANDARD.C4)).toContain("Die Arbeitszeit wird erfasst"));
  it("C6: Nachtzuschlag bei Nachtschicht", () => expect(text("C6", { ...STANDARD.C6, modell: "feste Nachtschicht", nachtausgleich: "Zuschlag", nachtZuschlag: "25" })).toContain("25 Prozent"));
  it("C7: Ruhezeit beginnt neu", () => expect(text("C7", STANDARD.C7)).toContain("beginnt die Ruhezeit"));
  it("C8: Bereitschaftsdienst ist Arbeitszeit", () => expect(text("C8", STANDARD.C8)).toContain("Bereitschaftsdienst ist Arbeitszeit"));
  it("C9: Ankündigung", () => expect(text("C9", STANDARD.C9)).toContain("4 Tage im Voraus"));
  it("C12: Insolvenzsicherung", () => expect(text("C12", STANDARD.C12)).toContain("gegen Insolvenz gesichert"));
});

describe("Regeln Gruppe A", () => {
  it("P-010 A1 oder A2 ohne Höchstdatum", () => {
    expect(schlaegt(mit("A1", { hoechstdatum: "" }), "P-010")).toBe(true);
    expect(schlaegt(mit("A2", { hoechstdatum: "" }), "P-010")).toBe(true);
    expect(schlaegt(mit("A1"), "P-010")).toBe(false);
  });
  it("P-011 A1 gewählt: Aufgabe Titel", () => {
    expect(befund(mit("A1"), "P-011")[0]?.text).toContain("Fristenliste");
    expect(schlaegt(mit("A2"), "P-011")).toBe(false);
  });
  it("P-012 A3 mit freiem Grund", () => {
    expect(schlaegt(mit("A3", { grundlage: "allgemeine Einstellungsuntersuchung" }), "P-012")).toBe(true);
    expect(schlaegt(mit("A3"), "P-012")).toBe(false);
  });
  it("P-013 erweitertes Zeugnis für Buchhaltung", () => {
    expect(schlaegt(mit("A4", { art: "erweitertes Führungszeugnis (§ 30a BZRG)", begruendung: "Vermögensverantwortung" }), "P-013")).toBe(true);
    expect(schlaegt(mit("A4", { art: "erweitertes Führungszeugnis (§ 30a BZRG)", begruendung: "Kinder und Jugendliche" }), "P-013")).toBe(false);
  });
  it("P-014 Führungszeugnis ohne Bezug", () => {
    expect(schlaegt(mit("A4", { begruendung: "sonstige Stelle ohne besonderen Bezug" }), "P-014")).toBe(true);
    expect(schlaegt(mit("A4"), "P-014")).toBe(false);
  });
  it("P-015 A6 Bedingung außer Liste", () => {
    expect(schlaegt(mit("A6", { bedingung: "Dauerhafte Krankheit" }), "P-015")).toBe(true);
    expect(schlaegt(mit("A6"), "P-015")).toBe(false);
  });
  it("P-016 A6 Pflichtsatz", () => {
    expect(befund(mit("A6"), "P-016")[0]?.text).toContain("zwei Wochen");
    expect(schlaegt(mit("A7"), "P-016")).toBe(false);
  });
  const a9ohne = { art: A9_OHNE, ende: "2028-06-30", vorbeschaeftigung: "nein", verlaengerungen: "0", sachgrund: "" };
  it("P-017 sachgrundlos mit Vorbeschäftigung im Fenster (Personalakte)", () => {
    expect(schlaegt({ A9: a9ohne }, "P-017", { person: { vorbeschaeftigungEnde: "2025-06-30" } })).toBe(true);
    expect(schlaegt({ A9: a9ohne }, "P-017", { person: { vorbeschaeftigungEnde: "2020-01-31" } })).toBe(false);
    expect(schlaegt(mit("A9"), "P-017", { person: { vorbeschaeftigungEnde: "2025-06-30" } })).toBe(false);
  });
  it("P-018 sachgrundlos über Höchstdauer oder mit zu vielen Verlängerungen", () => {
    expect(schlaegt({ A9: { ...a9ohne, ende: "2029-03-31" } }, "P-018")).toBe(true);
    expect(schlaegt({ A9: a9ohne }, "P-018", { person: { verlaengerungen: 4 } })).toBe(true);
    expect(schlaegt({ A9: { ...a9ohne, ende: "2028-10-31" } }, "P-018")).toBe(false);
  });
  it("P-019 Ausschluss nur für die Person", () => {
    expect(schlaegt(mit("A7", { regel: "nur für die Person ausgeschlossen" }), "P-019")).toBe(true);
    expect(schlaegt(mit("A7"), "P-019")).toBe(false);
  });
  it("K-22 A1 oder A6 ohne Höchstdatum oder Sachgrund", () => {
    expect(schlaegt(mit("A6", { bedingung: "" }), "K-22")).toBe(true);
    expect(schlaegt(mit("A6", { bedingung: A6_WEGFALL, erlaubnis: "" }), "K-22")).toBe(true);
    expect(schlaegt(mit("A1", { hoechstdatum: "" }), "K-22")).toBe(true);
    expect(schlaegt(mit("A6"), "K-22")).toBe(false);
  });
  it("K-23 A6 mit Bedingung an Krankheit", () => {
    expect(schlaegt(mit("A6", { bedingung: A6_WEGFALL, erlaubnis: "Arbeitsfähigkeit nach längerer Krankheit" }), "K-23")).toBe(true);
    expect(schlaegt(mit("A6", { bedingung: A6_WEGFALL, erlaubnis: "Fahrerlaubnis Klasse CE" }), "K-23")).toBe(false);
  });
  it("K-24 sachgrundlos und Erklärung zur Vorbeschäftigung im Fenster", () => {
    expect(schlaegt({ A9: a9ohne, A10: { vorbeschaeftigung: "ja", vorbeschaeftigungEnde: "2025-01-31" } }, "K-24")).toBe(true);
    expect(schlaegt({ A9: { ...a9ohne, vorbeschaeftigung: "ja", vorbeschaeftigungEnde: "" } }, "K-24")).toBe(true);
    expect(schlaegt({ A9: a9ohne, A10: { vorbeschaeftigung: "ja", vorbeschaeftigungEnde: "2021-01-31" } }, "K-24")).toBe(false);
    expect(schlaegt({ ...mit("A9"), A10: { vorbeschaeftigung: "ja", vorbeschaeftigungEnde: "2025-01-31" } }, "K-24")).toBe(false);
  });
  it("K-25 A9 oder A6: Signatur Original", () => {
    expect(schlaegt(mit("A9"), "K-25")).toBe(true);
    expect(schlaegt(mit("A6"), "K-25")).toBe(true);
    expect(schlaegt(mit("A7"), "K-25")).toBe(false);
  });
});

describe("Regeln Gruppe B", () => {
  it("P-020 geringerwertige Tätigkeit ohne Frist", () => {
    expect(schlaegt(mit("B1", { umfang: "vorübergehend auch niedriger bewertete Tätigkeit", dauerMonate: "", entgeltschutz: "ja" }), "P-020")).toBe(true);
    expect(schlaegt(mit("B1", { umfang: "vorübergehend auch niedriger bewertete Tätigkeit", dauerMonate: "3", entgeltschutz: "nein" }), "P-020")).toBe(true);
    expect(schlaegt(mit("B1", { umfang: "vorübergehend auch niedriger bewertete Tätigkeit", dauerMonate: "3", entgeltschutz: "ja" }), "P-020")).toBe(false);
  });
  it("P-021 Versetzung ohne räumliche Grenze: Warnung statt Sperre (Entscheidung 24, § 106 GewO)", () => {
    expect(schlaegt(mit("B2", { radiusKm: "" }), "P-021")).toBe(true);
    expect(schlaegt(mit("B2", { grenze: "genannte Standorte", orte: "bundesweit alle Standorte" }), "P-021")).toBe(true);
    expect(befund(mit("B2", { grenze: "alle Standorte des Arbeitgebers in Deutschland" }), "P-021")[0]?.art).toBe("warnung");
    expect(schlaegt(mit("B2"), "P-021")).toBe(false);
  });
  it("B2 bundesweit an Standorte desselben Arbeitgebers, nicht ins Ausland", () => {
    const t = text("B2", { standort: "Köln", grenze: "alle Standorte des Arbeitgebers in Deutschland" });
    expect(t).toContain("an einen anderen Standort des Arbeitgebers in Deutschland");
    expect(BAUSTEIN.B2.textEn({ standort: "Köln", grenze: "alle Standorte des Arbeitgebers in Deutschland" }, { vorname: "Paul", gehalt: 4500, wochenstunden: 40, eintritt: "2026-11-01", heute: "2026-10-10", auswahl: {} })).toContain("to another site of the Employer in Germany");
  });
  it("P-022 Versetzung in andere Gesellschaft", () => {
    expect(schlaegt(mit("B2", { andereGesellschaft: "ja" }), "P-022")).toBe(true);
    expect(schlaegt(mit("B2"), "P-022")).toBe(false);
  });
  it("P-023 B3 Standardsätze ergänzt", () => {
    expect(schlaegt(mit("B3"), "P-023")).toBe(true);
    expect(schlaegt(mit("B4"), "P-023")).toBe(false);
  });
  it("P-024 und K-40 Homeoffice außerhalb der EU", () => {
    const ausland = { ort: "außerhalb der EU und des EWR" };
    expect(schlaegt(mit("B3", ausland), "P-024")).toBe(true);
    expect(schlaegt(mit("B3", { ...ausland, auslandPruefung: "Steuerbüro Muster und Kanzlei, 01.10.2026" }), "P-024")).toBe(false);
    expect(schlaegt(mit("B3", ausland), "K-40")).toBe(true);
    expect(schlaegt(mit("B3"), "K-40")).toBe(false);
  });
});

describe("Regeln Gruppe C", () => {
  it("P-025 C1 ohne Ausgleichszeitraum: Standard gesetzt", () => {
    expect(befund(mit("C1", { ausgleichMonate: "" }), "P-025")[0]?.text).toContain(monateText(WERTE.vertragStandards.ueberstundenAusgleichMonate));
    expect(befund(mit("C1", { ausgleichMonate: "" }), "P-025", { person: { gehalt: 2300 } })[0]?.text).toContain("nahe am Mindestlohn");
    expect(schlaegt(mit("C1"), "P-025")).toBe(false);
    expect(schlaegt(mit("C1", { ausgleich: "Vergütung", ausgleichMonate: "" }), "P-025")).toBe(false);
  });
  it("P-038 Überstundenrahmen über der Höchstarbeitszeit", () => {
    expect(schlaegt(mit("C1", { grenzeMonat: "45" }), "P-038")).toBe(true);
    expect(schlaegt({ ...mit("C1"), A10: { vorbeschaeftigung: "nein", nebenStunden: "10" } }, "P-038")).toBe(true);
    expect(schlaegt(mit("C1"), "P-038")).toBe(false);
  });
  it("P-026 C2 ohne Stundenzahl", () => {
    expect(schlaegt(mit("C2", { stunden: "" }), "P-026")).toBe(true);
    expect(schlaegt(mit("C2"), "P-026")).toBe(false);
  });
  it("K-06 C2 ohne feste Stundenzahl", () => {
    expect(schlaegt(mit("C2", { stunden: "alle erforderlichen" }), "K-06")).toBe(true);
    expect(schlaegt(mit("C2"), "K-06")).toBe(false);
  });
  it("P-027 mehr Pauschalstunden bei Gehalt unter der Beitragsbemessungsgrenze", () => {
    expect(schlaegt(mit("C2", { stunden: "30" }), "P-027", { person: { gehalt: 4000 } })).toBe(true);
    expect(schlaegt(mit("C2", { stunden: "30" }), "P-027", { person: { gehalt: 9000 } })).toBe(false);
    expect(schlaegt(mit("C2", { stunden: "20" }), "P-027", { person: { gehalt: 4000 } })).toBe(false);
  });
  it("P-028 Stundenlohn mit Pauschale unter Mindestlohn zum Eintritt", () => {
    expect(schlaegt(mit("C2", { stunden: "20" }), "P-028", { person: { gehalt: 2500 } })).toBe(true);
    expect(schlaegt(mit("C2"), "P-028")).toBe(false);
  });
  it("K-05 Stundenlohn mit Pauschale unter künftigem Mindestlohn", () => {
    expect(schlaegt(mit("C2", { stunden: "20" }), "K-05", { person: { gehalt: 2750 } })).toBe(true);
    expect(schlaegt(mit("C2", { stunden: "20" }), "P-028", { person: { gehalt: 2750 } })).toBe(false);
    expect(schlaegt(mit("C2"), "K-05")).toBe(false);
  });
  it("K-07 C2 und C3 zusammen", () => {
    expect(schlaegt({ ...mit("C2"), ...mit("C3") }, "K-07")).toBe(true);
    expect(schlaegt(mit("C2"), "K-07")).toBe(false);
  });
  it("P-029 C3 ohne Grenzen", () => {
    expect(schlaegt(mit("C3", { plusMax: "" }), "P-029")).toBe(true);
    expect(schlaegt(mit("C3"), "P-029")).toBe(false);
  });
  it("P-030 C3 mit Mindestlohnbezug", () => {
    const minijob = { person: { beschaeftigung: "minijob" as const, gehalt: 600, wochenstunden: 10 } };
    expect(schlaegt(mit("C3", { ausgleichMonate: "18", plusMax: "10", minusMax: "5" }), "P-030", minijob)).toBe(true);
    expect(schlaegt(mit("C3", { ausgleichMonate: "12", plusMax: "30", minusMax: "5" }), "P-030", minijob)).toBe(true);
    expect(schlaegt(mit("C3", { ausgleichMonate: "12", plusMax: "10", minusMax: "5" }), "P-030", minijob)).toBe(false);
    expect(schlaegt(mit("C3", { ausgleichMonate: "18" }), "P-030")).toBe(false);
  });
  it("P-031 C4 ohne Zeiterfassung", () => {
    expect(schlaegt(mit("C4", { erfassung: "" }), "P-031")).toBe(true);
    expect(schlaegt(mit("C4"), "P-031")).toBe(false);
  });
  it("P-032 C6 ohne Rhythmus", () => {
    expect(schlaegt(mit("C6", { rhythmus: "" }), "P-032")).toBe(true);
    expect(schlaegt(mit("C6"), "P-032")).toBe(false);
  });
  it("P-033 Nachtarbeit ohne Zuschlag", () => {
    expect(schlaegt(mit("C6", { modell: "feste Nachtschicht", nachtausgleich: "kein Ausgleich" }), "P-033")).toBe(true);
    expect(schlaegt(mit("C11", { nachtZuschlag: "" }), "P-033")).toBe(true);
    expect(schlaegt({ ...mit("C6", { modell: "feste Nachtschicht", nachtausgleich: "kein Ausgleich" }), ...mit("C11") }, "P-033")).toBe(false);
    expect(schlaegt(mit("C6", { modell: "feste Nachtschicht", nachtausgleich: "Zuschlag", nachtZuschlag: "25" }), "P-033")).toBe(false);
  });
  it("P-034 Rufbereitschaft mit kurzer Reaktionszeit", () => {
    expect(schlaegt(mit("C7", { reaktionMinuten: "10" }), "P-034")).toBe(true);
    expect(schlaegt(mit("C7"), "P-034")).toBe(false);
  });
  it("P-035 Bereitschaftsdienst unter Mindestlohn", () => {
    expect(schlaegt(mit("C8", { stundenMonat: "100", bewertung: "50" }), "P-035", { person: { gehalt: 2500 } })).toBe(true);
    expect(schlaegt(mit("C8"), "P-035")).toBe(false);
  });
  it("P-036 Abruf mit zu kurzer Ankündigung oder ohne Mindeststunden", () => {
    expect(schlaegt(mit("C9", { ankuendigungTage: "2" }), "P-036")).toBe(true);
    expect(schlaegt(mit("C9", { mindestStunden: "" }), "P-036")).toBe(true);
    expect(schlaegt(mit("C9"), "P-036")).toBe(false);
  });
  it("K-35 Abruf mit Schwankung über den Grenzen", () => {
    expect(schlaegt(mit("C9", { mehrProzent: "30" }), "K-35")).toBe(true);
    expect(schlaegt(mit("C9", { wenigerProzent: "25" }), "K-35")).toBe(true);
    expect(schlaegt(mit("C9", { mehrProzent: "25", wenigerProzent: "20" }), "K-35")).toBe(false);
  });
  it("P-037 Kurzarbeit ohne Höchstdauer", () => {
    expect(schlaegt(mit("C10", { hoechstMonate: "" }), "P-037")).toBe(true);
    expect(schlaegt(mit("C10"), "P-037")).toBe(false);
  });
  it("P-039 Gleitzeit bis 23 Uhr", () => {
    expect(schlaegt(mit("C5", { rahmenBis: "23" }), "P-039")).toBe(true);
    expect(schlaegt(mit("C5"), "P-039")).toBe(false);
  });
});
