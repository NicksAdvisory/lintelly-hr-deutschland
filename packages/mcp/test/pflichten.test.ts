// Testfälle aus packages/kern/website/scripts/test-tools-logik.mjs, hier durch die Werkzeuge gerufen.
import { describe, expect, it } from "vitest";
import { WERKZEUGE } from "../src/werkzeuge";
import { rufe } from "./hilfe";

type Zeile = { thema: string };
const themen = (x: Zeile[]) => x.map((z) => z.thema);

describe("schwellen_check", () => {
  it("31 Vollzeit und ein Azubi: U1 entfällt (gewichtet 31)", () => {
    const a = rufe("schwellen_check", { koepfe: 31, azubis: 1 });
    expect(a.ergebnis.gewichtet_u1).toBe(31);
    expect(themen(a.ergebnis.gilt_nicht).join(" ")).toMatch(/U1-Umlage/);
    expect(a.ergebnis.ab_dem_ersten_beschaeftigten.length).toBeGreaterThan(5);
  });
  it("Schwerbehinderte nur unter den Arbeitnehmern ohne Azubis", () => {
    expect(() => rufe("schwellen_check", { koepfe: 2, azubis: 3, schwerbehinderte: 3 })).toThrow(/ohne Azubis/);
    expect(rufe("schwellen_check", { koepfe: 31, azubis: 1, schwerbehinderte: 1 }).ergebnis.gilt.length).toBeGreaterThan(0);
  });
  it("Teilzeit über der Gesamtzahl und halbe Köpfe sind Fehler", () => {
    expect(() => rufe("schwellen_check", { koepfe: 3, teilzeit_bis_10_stunden: 2, teilzeit_11_bis_20_stunden: 2 })).toThrow(/Teilzeit/);
    expect(() => rufe("schwellen_check", { koepfe: 2.5 })).toThrow(/koepfe muss eine ganze Zahl sein/);
  });
  it("21 bis 49 Beschäftigte: Sicherheitsbeauftragter bei besonderer Gefährdung (§ 22 Abs. 1 Satz 3 SGB VII)", () => {
    expect(rufe("schwellen_check", { koepfe: 25 }).fallen.join(" ")).toMatch(/§ 22 Abs\. 1 Satz 3 SGB VII/);
    expect(rufe("schwellen_check", { koepfe: 15 }).fallen.join(" ")).not.toMatch(/§ 22/);
  });
  it("5 Köpfe: Betriebsrat möglich, kein Hinweis auf Lintelly", () => {
    const a = rufe("schwellen_check", { koepfe: 5 });
    expect(themen(a.ergebnis.gilt)).toContain("Betriebsrat kann gewählt werden");
    expect(a).not.toHaveProperty("lintelly");
  });
  it("9 Köpfe: nächste Schwelle 10, es fehlen 2, Hinweis Wachstum", () => {
    const a = rufe("schwellen_check", { koepfe: 9 });
    expect(a.ergebnis.naechste_schwelle).toMatchObject({ schwelle: "mehr als 10", fehlt: 2 });
    expect(a).not.toHaveProperty("lintelly");
  });
  it("12 Köpfe: Kündigungsschutzgesetz gilt, Hinweis Wachstum", () => {
    const a = rufe("schwellen_check", { koepfe: 12 });
    expect(themen(a.ergebnis.gilt)).toContain("Kündigungsschutzgesetz gilt");
    expect(a.quellen.map((q) => q.norm)).toContain("§ 23 Abs. 1 KSchG");
    expect(a).not.toHaveProperty("lintelly");
  });
  it("zählt nur die Firmengröße als Band", () => {
    expect(WERKZEUGE.find((w) => w.name === "schwellen_check")!.baender!({ koepfe: 7, azubis: 2 })).toEqual({ groesse: 7 });
  });
});

describe("sonderkuendigungsschutz_check", () => {
  it("Schwerbehinderung unter 6 Monaten wird gelb", () => {
    const a = rufe("sonderkuendigungsschutz_check", { schwerbehindert: "ja", laenger_als_6_monate: "nein" });
    expect(a.ergebnis.treffer[0]).toMatchObject({ schutz: "Schwerbehinderung oder Gleichstellung", stufe: "pruefen", ampel: "gelb" });
    expect(a.ergebnis.treffer[0].hinweis).toMatch(/4 Tagen/);
  });
  it("unklar wird gelb, Rot steht vorn", () => {
    const a = rufe("sonderkuendigungsschutz_check", { elternzeit: "unklar", betriebsrat: "ja" });
    expect(a.ergebnis.treffer.map((t: { stufe: string }) => t.stufe)).toEqual(["ausgeschlossen", "pruefen"]);
    expect(a.ergebnis).toMatchObject({ ergebnis: "Ordentliche Kündigung ausgeschlossen", ampel: "rot", rot: 1, gelb: 1 });
  });
  it("Mutterschutz: ohne Zustimmung der Aufsichtsbehörde keine Kündigung", () => {
    const a = rufe("sonderkuendigungsschutz_check", { mutterschutz: "ja" });
    expect(a.ergebnis.ergebnis).toBe("Ohne Zustimmung keine Kündigung");
    expect(a.ergebnis.treffer[0].zustaendig).toMatch(/Aufsichtsbehörde/);
    expect(a.quellen.map((q) => q.norm)).toContain("§ 17 MuSchG");
  });
  it("nichts beantwortet: nicht grün, sondern gelb mit allen offenen Fragen (Review 29.10.2026)", () => {
    const a = rufe("sonderkuendigungsschutz_check", {});
    expect(a.ergebnis).toMatchObject({ ergebnis: "Noch nicht vollständig, 11 Fragen offen", ampel: "gelb", offene_fragen: 11 });
    expect(a.fallen!.join(" ")).toMatch(/11 Fragen sind offen: mutterschutz, elternzeit/);
    expect(a).not.toHaveProperty("lintelly");
  });
  it("alle Fragen nein: grün; eine offen: gelb mit 1 Frage offen", () => {
    const nein = Object.fromEntries(["mutterschutz", "elternzeit", "pflege", "betriebsrat", "wahl", "schwerbehindert", "dsb", "azubi", "beauftragte", "wehrdienst", "hinweisgeber"].map((k) => [k, "nein"]));
    expect(rufe("sonderkuendigungsschutz_check", nein).ergebnis).toMatchObject({ ampel: "gruen", ergebnis: "Kein Sonderschutz erkennbar", offene_fragen: 0 });
    const { wehrdienst: _w, ...ohne } = nein;
    expect(rufe("sonderkuendigungsschutz_check", ohne).ergebnis).toMatchObject({ ampel: "gelb", ergebnis: "Noch nicht vollständig, 1 Frage offen" });
  });
  it("mit Betriebsrat: Anhörung vor jeder Kündigung", () => {
    expect(rufe("sonderkuendigungsschutz_check", { betriebsrat_vorhanden: "ja" }).naechster_schritt!.join(" ")).toMatch(/§ 102 BetrVG/);
  });
});

describe("bem_pflicht", () => {
  it("42 Kalendertage reichen nicht, 43 schon", () => {
    expect(rufe("bem_pflicht", { stichtag: "2026-10-01", zeitraeume: [{ von: "2026-03-01", bis: "2026-04-11" }] }).ergebnis).toMatchObject({ au_kalendertage: 42, bem_pflicht: false });
    const a = rufe("bem_pflicht", { stichtag: "2026-10-01", zeitraeume: [{ von: "2026-03-01", bis: "2026-04-12" }] });
    expect(a.ergebnis).toMatchObject({ au_kalendertage: 43, bem_pflicht: true });
    expect(a.naechster_schritt!.join(" ")).toMatch(/Schriftlich einladen/);
  });
  it("überschneidende Zeiträume zählen einmal", () => {
    const a = rufe("bem_pflicht", { stichtag: "2026-10-01", zeitraeume: [{ von: "2026-03-02", bis: "2026-03-11" }, { von: "2026-03-07", bis: "2026-03-16" }] });
    expect(a.ergebnis.au_kalendertage).toBe(15);
    expect(a.ergebnis.zeitraeume).toEqual([{ von: "2026-03-02", bis: "2026-03-16", tage: 15 }]);
  });
  it("offenes Ende läuft bis zum Stichtag, Grenze am 43. Tag überschritten", () => {
    const a = rufe("bem_pflicht", { stichtag: "2026-10-01", zeitraeume: [{ von: "2026-08-01" }] });
    expect(a.ergebnis).toMatchObject({ bem_pflicht: true, grenze_ueberschritten_am: "2026-09-12", gezaehlt_nach: "Kalendertage" });
  });
  it("noch keine Pflicht: Wiedervorlage in einem Monat merken", () => {
    const a = rufe("bem_pflicht", { stichtag: "2026-10-01", zeitraeume: [{ von: "2026-09-01", bis: "2026-09-10" }] });
    expect(a.ergebnis).toMatchObject({ bem_pflicht: false, bis_zur_grenze: "noch 23 Arbeitstage" });
    expect(a.naechster_schritt!.join(" ")).toMatch(/Frist merken: Werkzeug frist_merken.*2026-11-01/);
  });
  it("3-Tage-Woche: Grenze nach Arbeitstagen ist 18", () => {
    const a = rufe("bem_pflicht", { stichtag: "2026-10-01", zeitraeume: [{ von: "2026-09-01", bis: "2026-09-10" }], arbeitstage: ["Mo", "Mi", "Fr"] });
    expect(a.ergebnis.grenze_arbeitstage).toBe(18);
  });
  it("Ende vor Beginn ist ein Fehler, Beginn nach dem Stichtag zählt nicht", () => {
    expect(() => rufe("bem_pflicht", { stichtag: "2026-10-01", zeitraeume: [{ von: "2026-05-10", bis: "2026-05-01" }] })).toThrow(/vor dem Beginn/);
    const a = rufe("bem_pflicht", { stichtag: "2026-10-01", zeitraeume: [{ von: "2026-09-01", bis: "2026-09-10" }, { von: "2026-10-05", bis: "2026-10-09" }] });
    expect(a.ergebnis.au_kalendertage).toBe(10);
    expect(a.fallen!.join(" ")).toMatch(/nach dem Stichtag/);
  });
});

describe("Eingaben", () => {
  it("unbekannte Felder wie Name oder Diagnose werden abgelehnt", () => {
    expect(() => rufe("schwellen_check", { koepfe: 5, firma: "Muster GmbH" })).toThrow(/Unbekanntes Feld/);
    expect(() => rufe("bem_pflicht", { zeitraeume: [{ von: "2026-01-01", diagnose: "Rücken" }] })).toThrow(/Unbekanntes Feld/);
    expect(() => rufe("sonderkuendigungsschutz_check", { name: "Anna" })).toThrow(/Unbekanntes Feld/);
  });
});
