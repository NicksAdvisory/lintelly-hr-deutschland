// Testfälle aus packages/kern/website/scripts/test-geld.mjs und test-tools-logik.mjs, hier durch die Werkzeuge gerufen.
import { describe, expect, it } from "vitest";
import { rufe } from "./hilfe";

describe("entgeltfortzahlung", () => {
  it("6 Wochen = 42 Tage, danach Krankengeld; über 6 Wochen krank ist ein Ernstfall", () => {
    const a = rufe("entgeltfortzahlung", { beginn: "2024-04-01", zeitraeume: [{ von: "2026-01-05", bis: "2026-03-31" }] });
    expect(a.ergebnis.faelle[0]).toMatchObject({ bezahlte_tage: 42, entgeltfortzahlung_bis: "2026-02-15", krankengeld_ab: "2026-02-16" });
    expect(a.ergebnis.letzter_tag_entgeltfortzahlung).toBe("2026-02-15");
    expect(a).not.toHaveProperty("lintelly");
    expect(a.naechster_schritt!.join(" ")).toMatch(/U1/);
    expect(a.naechster_schritt!.join(" ")).toMatch(/Frist merken: Werkzeug frist_merken/);
    expect(a.quellen.map((q) => q.norm)).toContain("§ 3 Abs. 1 EFZG");
  });
  it("Fortsetzungserkrankung verbraucht das Budget, andere Ursache nicht", () => {
    const zwei = [{ von: "2026-01-05", bis: "2026-02-03" }, { von: "2026-03-02", bis: "2026-03-31" }];
    const gleich = rufe("entgeltfortzahlung", { beginn: "2024-04-01", zeitraeume: [zwei[0], { ...zwei[1], gleiche_erkrankung_wie: 1 }] });
    expect(gleich.ergebnis.faelle.map((f: { bezahlte_tage: number }) => f.bezahlte_tage)).toEqual([30, 12]);
    const anders = rufe("entgeltfortzahlung", { beginn: "2024-04-01", zeitraeume: zwei });
    expect(anders.ergebnis.faelle[1].bezahlte_tage).toBe(30);
    expect(anders).not.toHaveProperty("lintelly");
    expect(anders.naechster_schritt!.join(" ")).toMatch(/BEM/);
  });
  it("Wartezeit 4 Wochen ab Beginn, vorher kein Anspruch", () => {
    const a = rufe("entgeltfortzahlung", { beginn: "2026-01-01", zeitraeume: [{ von: "2026-01-10", bis: "2026-02-28" }] });
    expect(a.ergebnis.faelle[0]).toMatchObject({ wartezeit_tage: 19, entgeltfortzahlung_von: "2026-01-29", bezahlte_tage: 31 });
  });
  it("Ursache unsicher: zweite Variante als neue Erkrankung", () => {
    const a = rufe("entgeltfortzahlung", {
      beginn: "2024-04-01",
      zeitraeume: [{ von: "2026-01-05", bis: "2026-02-03" }, { von: "2026-03-02", bis: "2026-03-31", gleiche_erkrankung_wie: 1, ursache_unsicher: true }],
    });
    expect(a.ergebnis.faelle[1].bezahlte_tage).toBe(12);
    expect(a.ergebnis.variante_neue_erkrankung.faelle[1].bezahlte_tage).toBe(30);
  });
  it("neue AU direkt im Anschluss ohne Arbeitstag ist ein Verhinderungsfall (BAG 5 AZR 505/18)", () => {
    const a = rufe("entgeltfortzahlung", { beginn: "2024-04-01", zeitraeume: [{ von: "2026-01-05", bis: "2026-01-31" }, { von: "2026-02-01", bis: "2026-03-31" }] });
    expect(a.ergebnis.faelle).toHaveLength(1);
    expect(a.ergebnis.faelle[0]).toMatchObject({ zeitraeume: [1, 2], bezahlte_tage: 42, entgeltfortzahlung_bis: "2026-02-15" });
    expect(a.quellen.map((q) => q.url)).toContain("https://www.bundesarbeitsgericht.de/entscheidung/5-azr-505-18/");
  });
  it("Zeitraum vor Arbeitsbeginn wird abgelehnt", () => {
    const a = rufe("entgeltfortzahlung", { beginn: "2026-02-01", zeitraeume: [{ von: "2026-01-05", bis: "2026-01-10" }] });
    expect(a.ergebnis.fehler).toMatch(/Arbeitsbeginn/);
  });
});

describe("urlaubsabgeltung", () => {
  it("Teilzeit 3 Tage: 30 Tage Vollzeit werden 18, Tagessatz 3.900 € ÷ 39 = 100 €", () => {
    const a = rufe("urlaubsabgeltung", { eintritt: "2020-01-01", austritt: "2026-09-30", jahresurlaub: 30, tage_pro_woche: 3, verdienst_13_wochen: 3900 });
    expect(a.ergebnis).toMatchObject({ anspruch_austrittsjahr: 18, gesetzlicher_anteil: 12, offene_tage: 18, tagessatz: 100, abgeltung_brutto: 1800 });
  });
  it("Austritt 31.05.: Teilurlaub 5/12 von 30 = 12,5, aufgerundet 13", () => {
    const a = rufe("urlaubsabgeltung", { eintritt: "2020-01-01", austritt: "2026-05-31", jahresurlaub: 30, tage_pro_woche: 5, monatsgehalt_brutto: 3000 });
    expect(a.ergebnis).toMatchObject({ art: "teil", volle_monate: 5, anspruch_austrittsjahr: 13, verdienst_13_wochen: 9000, abgeltung_brutto: 1800 });
  });
  it("offene Tage direkt: 6.500 € in 13 Wochen bei 5 Tagen = 100 € je Tag", () => {
    const a = rufe("urlaubsabgeltung", { offene_tage: 10, tage_pro_woche: 5, verdienst_13_wochen: 6500 });
    expect(a.ergebnis).toMatchObject({ offene_tage: 10, tagessatz: 100, abgeltung_brutto: 1000 });
  });
  it("Eintritt 01.11.2025, Austritt 28.02.2026: 5 Tage plus 5 Tage Teilurlaub 2025", () => {
    const a = rufe("urlaubsabgeltung", { eintritt: "2025-11-01", austritt: "2026-02-28", jahresurlaub: 30, tage_pro_woche: 5, monatsgehalt_brutto: 3000 });
    expect(a.ergebnis).toMatchObject({ anspruch_austrittsjahr: 5, rest_vorjahr: 5, offene_tage: 10 });
  });
  it("Zusatzurlaub bei Schwerbehinderung wird abgegolten", () => {
    const a = rufe("urlaubsabgeltung", { eintritt: "2020-01-01", austritt: "2026-12-31", jahresurlaub: 30, tage_pro_woche: 5, schwerbehindert: true, monatsgehalt_brutto: 3000 });
    expect(a.ergebnis.anspruch_austrittsjahr).toBe(35);
  });
  it("mehr genommen als zusteht: nichts abgegolten, Warnung", () => {
    const a = rufe("urlaubsabgeltung", { eintritt: "2020-01-01", austritt: "2026-05-31", jahresurlaub: 30, tage_pro_woche: 5, schon_genommen: 15, monatsgehalt_brutto: 3000 });
    expect(a.ergebnis.offene_tage).toBe(0);
    expect(a.fallen!.join(" ")).toMatch(/zu viel gezahltes Urlaubsentgelt/i);
  });
  it("ohne Daten und ohne offene Tage gibt es einen Hinweis statt einer Zahl", () => {
    expect(rufe("urlaubsabgeltung", { tage_pro_woche: 5, verdienst_13_wochen: 6500 }).ergebnis.fehler).toMatch(/Eintritt/);
  });
});

describe("abfindung_faustformel", () => {
  it("6 volle Jahre × 0,5 × 4.000 € = 12.000 €, mit Hinweis auf menschliche Prüfung", () => {
    const a = rufe("abfindung_faustformel", { monatsgehalt_brutto: 4000, eintritt: "2020-01-01", austritt: "2025-12-31" });
    expect(a.ergebnis).toMatchObject({ gerechnete_jahre: 6, faktor: 0.5, abfindung_brutto: 12000 });
    expect(a).not.toHaveProperty("lintelly");
  });
  it("genau 6 Monate Rest werden nicht aufgerundet, ein Tag mehr schon", () => {
    expect(rufe("abfindung_faustformel", { monatsgehalt_brutto: 4000, eintritt: "2020-01-01", austritt: "2026-06-30" }).ergebnis.gerechnete_jahre).toBe(6);
    expect(rufe("abfindung_faustformel", { monatsgehalt_brutto: 4000, eintritt: "2020-01-01", austritt: "2026-07-01" }).ergebnis.gerechnete_jahre).toBe(7);
  });
  it("Sonderzahlungen gehen mit 1/12 ins Monatsgehalt", () => {
    const a = rufe("abfindung_faustformel", { monatsgehalt_brutto: 4000, sonderzahlungen_jahr: 12000, eintritt: "2020-01-01", austritt: "2025-12-31" });
    expect(a.ergebnis.monatsverdienst).toBe(5000);
  });
  it("unter 6 Monaten 0 Jahre und Hinweis Wartezeit", () => {
    const a = rufe("abfindung_faustformel", { monatsgehalt_brutto: 4000, eintritt: "2026-01-01", austritt: "2026-05-31" });
    expect(a.ergebnis.abfindung_brutto).toBe(0);
    expect(a.fallen!.join(" ")).toMatch(/6 Monate/);
  });
  it("Höchstbetrag 18 Monatsverdienste ab 55 Jahren und 20 Jahren", () => {
    const a = rufe("abfindung_faustformel", { monatsgehalt_brutto: 4000, eintritt: "2000-01-01", austritt: "2025-12-31", alter: 56 });
    expect(a.ergebnis.hoechstbetrag_gericht).toEqual({ monatsverdienste: 18, betrag: 72000 });
  });
  it("Jahresgehalt statt Monatsgehalt wird abgefangen", () => {
    expect(rufe("abfindung_faustformel", { monatsgehalt_brutto: 120000, eintritt: "2020-01-01", austritt: "2025-12-31" }).ergebnis.fehler).toMatch(/Monatsgehalt/);
  });
});

describe("ausgleichsabgabe", () => {
  it("2026: 80 Plätze, 1 besetzt = 36 unbesetzte Pflichtplatz-Monate × 405 € = 14.580 €", () => {
    const a = rufe("ausgleichsabgabe", { jahr: "2026", arbeitsplaetze: [80], schwerbehinderte: [1] });
    expect(a.ergebnis).toMatchObject({ unbesetzte_pflichtplatz_monate: 36, satz_je_platz_und_monat: 405, ausgleichsabgabe: 14580, faellig_am: "2027-03-31" });
    expect(a.naechster_schritt!.join(" ")).toMatch(/Frist merken: Werkzeug frist_merken/);
  });
  it("2026: 30 Plätze niemand besetzt = 2.820 €, 50 Plätze 1 besetzt = 1.860 €", () => {
    expect(rufe("ausgleichsabgabe", { jahr: "2026", arbeitsplaetze: [30] }).ergebnis.ausgleichsabgabe).toBe(2820);
    expect(rufe("ausgleichsabgabe", { jahr: "2026", arbeitsplaetze: [50], schwerbehinderte: [1] }).ergebnis.ausgleichsabgabe).toBe(1860);
  });
  it("12 Monatswerte rechnen wie ein gleicher Wert", () => {
    const a = rufe("ausgleichsabgabe", { jahr: "2026", arbeitsplaetze: Array(12).fill(80), schwerbehinderte: Array(12).fill(1) });
    expect(a.ergebnis.ausgleichsabgabe).toBe(14580);
  });
  it("unter 20 Plätzen keine Pflicht", () => {
    const a = rufe("ausgleichsabgabe", { jahr: "2026", arbeitsplaetze: [19] });
    expect(a.ergebnis).toMatchObject({ pflichtig: false, ausgleichsabgabe: 0 });
  });
  it("5 Monatswerte sind weder einer noch zwölf", () => {
    expect(rufe("ausgleichsabgabe", { arbeitsplaetze: [20, 20, 20, 20, 20] }).ergebnis.fehler).toMatch(/12/);
  });
});

describe("minijob", () => {
  it("2026: 30 h × 20,10 € = 603 € liegt genau auf der Grenze, Abgaben 187,95 €", () => {
    const a = rufe("minijob", { jahr: "2026", stundenlohn: 20.1, stunden: 30, stunden_je: "monat" });
    expect(a.ergebnis.geplant).toMatchObject({ entgelt_monat: 603, im_minijob: true });
    expect(a.ergebnis.kosten_arbeitgeber).toMatchObject({ abgaben: 187.95, gesamtkosten: 790.95 });
    expect(a.ergebnis.kosten_arbeitgeber.posten.map((p: { betrag: number }) => p.betrag)).toEqual([78.39, 90.45, 12.06, 4.82, 1.33, 0.9]);
  });
  it("1 Cent darüber ist kein Minijob mehr", () => {
    const a = rufe("minijob", { jahr: "2026", stundenlohn: 20.11, stunden: 30, stunden_je: "monat" });
    expect(a.ergebnis.geplant.im_minijob).toBe(false);
    expect(a.fallen!.join(" ")).toMatch(/Übergangsbereich/);
  });
  it("Mindestlohn 13,90 €: höchstens 43,38 Stunden; 13 € ist zu wenig", () => {
    expect(rufe("minijob", { jahr: "2026", stundenlohn: 13.9 }).ergebnis.hoechststunden_monat).toBe(43.38);
    const a = rufe("minijob", { jahr: "2026", stundenlohn: 13 });
    expect(a.ergebnis.mindestlohn_eingehalten).toBe(false);
    expect(a.fallen!.join(" ")).toMatch(/unter dem Mindestlohn/);
  });
  it("2027: Grenze 633 €, Jahresgrenze 7.596 €", () => {
    const a = rufe("minijob", { jahr: "2027", stundenlohn: 14.6, stunden: 10, stunden_je: "monat" });
    expect(a.ergebnis).toMatchObject({ verdienstgrenze_monat: 633, jahresgrenze: 7596 });
  });
  it("Einmalzahlung über dem Jahresspielraum kippt den Minijob", () => {
    expect(rufe("minijob", { jahr: "2026", stundenlohn: 20, stunden: 30, stunden_je: "monat" }).ergebnis.geplant.spielraum_einmalzahlungen).toBe(36);
    expect(rufe("minijob", { jahr: "2026", stundenlohn: 20, stunden: 30, stunden_je: "monat", einmalzahlungen_jahr: 37 }).ergebnis.geplant.im_minijob).toBe(false);
  });
  it("privat versichert ohne KV-Pauschale, ohne Pauschsteuer ohne 2 %", () => {
    const a = rufe("minijob", { jahr: "2026", stundenlohn: 20, stunden: 25, stunden_je: "monat", gesetzlich_krankenversichert: false, pauschsteuer: false });
    expect(a.ergebnis.kosten_arbeitgeber.posten.map((p: { name: string }) => p.name)).toEqual(["Rentenversicherung", "Umlage U1 (Krankheit)", "Umlage U2 (Mutterschaft)", "Insolvenzgeldumlage"]);
    expect(a.ergebnis.kosten_arbeitgeber.abgaben).toBe(80.85);
  });
});

describe("Eingaben", () => {
  it("unbekannte Felder wie ein Name werden abgelehnt", () => {
    expect(() => rufe("minijob", { stundenlohn: 15, name: "Tom" })).toThrow(/Unbekanntes Feld/);
    expect(() => rufe("entgeltfortzahlung", { beginn: "2024-04-01", zeitraeume: [{ von: "2026-01-05", bis: "2026-01-09", diagnose: "x" }] })).toThrow(/Unbekanntes Feld/);
  });
});
