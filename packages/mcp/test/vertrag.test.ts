import { describe, expect, it } from "vitest";
import { BAUSTEINE } from "@/lib/vertragsbausteine/katalog";
import { rufe } from "./hilfe";

describe("vertragsbausteine_suchen", () => {
  it("Homeoffice findet B3 und B4 (Wissen-Konzept Abschnitt 6), ohne Status-Kennzeichen", () => {
    const a = rufe("vertragsbausteine_suchen", { suchtext: "Homeoffice" });
    const ids = a.ergebnis.treffer.map((t: { kennung: string }) => t.kennung);
    expect(ids).toEqual(expect.arrayContaining(["B3", "B4"]));
    expect(JSON.stringify(a.ergebnis)).not.toMatch(/risiko|"grün"|"gelb"|Kanzlei prüfen/);
    expect(a).not.toHaveProperty("lintelly");
  });
  it("wer eine gesperrte Klausel sucht, bekommt Grund und sichere Alternative", () => {
    const a = rufe("vertragsbausteine_suchen", { suchtext: "Wettbewerbsverbot ohne Karenzentschädigung" });
    expect(a.ergebnis.gesperrt[0]).toMatchObject({ kennung: "R1", grund: expect.stringMatching(/§ 74 Abs\. 2 HGB/) });
  });
});

describe("vertragsbaustein", () => {
  it("B3 mit Angaben liefert den Text mit Platzhalter statt Namen", () => {
    const a = rufe("vertragsbaustein", { kennung: "B3", angaben: [{ feld: "tage", wert: "2" }] });
    expect(a.ergebnis.text).toMatch(/\[Name\] kann an bis zu 2 Tagen pro Woche mobil/);
    expect(a.ergebnis.fehlende_angaben).toEqual([]);
    expect(a.ergebnis.gruppe).toBe("Tätigkeit und Ort");
    expect(a).not.toHaveProperty("lintelly");
  });
  it("fehlt eine Pflichtangabe ohne Standard, gibt es keinen halben Text, sondern die Liste der Angaben", () => {
    const a = rufe("vertragsbaustein", { kennung: "D18" });
    expect(a.ergebnis.text).toBeNull();
    expect(a.ergebnis.fehlende_angaben.length).toBeGreaterThan(0);
  });
  it("alle 126 Bausteine gibt es, jeder mit Text, sobald die Pflichtangaben da sind, ohne undefined oder NaN", () => {
    expect(BAUSTEINE).toHaveLength(126);
    for (const b of BAUSTEINE) {
      const ohne = rufe("vertragsbaustein", { kennung: b.id }).ergebnis;
      const angaben = ohne.fehlende_angaben.filter((f: { feld: string }) => f.feld !== "gehalt_monat" && f.feld !== "wochenstunden" && f.feld !== "eintritt")
        .map((f: { feld: string; beispiel: string }) => ({ feld: f.feld, wert: f.beispiel }));
      const kontext = Object.fromEntries(ohne.fehlende_angaben.filter((f: { feld: string }) => ["gehalt_monat", "wochenstunden"].includes(f.feld)).map((f: { feld: string }) => [f.feld, f.feld === "gehalt_monat" ? 4000 : 40]));
      const eintritt = ohne.fehlende_angaben.some((f: { feld: string }) => f.feld === "eintritt") ? { eintritt: "2026-12-01" } : {};
      const mit = rufe("vertragsbaustein", { kennung: b.id, angaben, ...kontext, ...eintritt }).ergebnis;
      expect(mit.text, b.id).toBeTypeOf("string");
      expect(mit.text, b.id).not.toMatch(/undefined|NaN|\bnull\b/);
      // Ohne Status-Kennzeichen (Nick 23.10.2026). Ein Rat „Kanzlei prüfen“ im Hinweis eines Feldes bleibt Inhalt.
      expect(Object.keys(mit), b.id).not.toEqual(expect.arrayContaining(["risiko"]));
      expect(JSON.stringify(mit), b.id).not.toMatch(/"risiko"|"version"|"status"|"grün"|"gelb"/);
    }
  });
  it("unbekanntes Feld in den Angaben wird mit der Liste der Felder abgelehnt", () => {
    const a = rufe("vertragsbaustein", { kennung: "B3", angaben: [{ feld: "name", wert: "Anna" }] });
    expect(a.ergebnis.fehler).toMatch(/name/);
    expect(a.ergebnis.text).toBeUndefined();
  });
});

describe("klausel_pruefen", () => {
  it("Überstunden pauschal abgegolten: R4, Transparenzgebot, Alternative C2 oder C1 (Wissen-Konzept Abschnitt 6)", () => {
    const a = rufe("klausel_pruefen", { klausel: "Alle Überstunden sind mit dem Gehalt abgegolten." });
    expect(a.ergebnis.treffer[0]).toMatchObject({ kennung: "R4", grund: expect.stringMatching(/Transparenzgebot/) });
    expect(a.ergebnis.treffer[0].alternative).toMatch(/C2/);
    expect(a).not.toHaveProperty("lintelly");
  });
  it("ohne Treffer sagt die Antwort, dass das keine Prüfung der Wirksamkeit ist", () => {
    const a = rufe("klausel_pruefen", { klausel: "Der Arbeitsort ist Frankfurt am Main." });
    expect(a.ergebnis.treffer).toEqual([]);
    expect(a.ergebnis.einordnung).toMatch(/keine Prüfung der Wirksamkeit/);
  });
  it("Klauseln über 3.000 Zeichen werden abgelehnt", () => {
    expect(() => rufe("klausel_pruefen", { klausel: "x".repeat(3001) })).toThrow(/zu lang/);
  });
});
