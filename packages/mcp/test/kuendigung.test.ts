import { describe, expect, it } from "vitest";
import { rufe } from "./hilfe";

describe("kuendigungsfrist_rechnen", () => {
  it("Wissen-Konzept: Eintritt 01.03.2019, Zugang So 15.11.2026: Ende 31.01.2027, spätester Zugang 30.11.2026, Sonntag-Warnung", () => {
    const a = rufe("kuendigungsfrist_rechnen", { eintritt: "2019-03-01", zugang: "2026-11-15" });
    expect(a.ergebnis).toMatchObject({ ende: "2027-01-31", spaetester_zugang: "2026-11-30", regel: "2 Monate zum Monatsende", norm: expect.stringMatching(/^§\s622\sAbs\.\s2\sBGB$/) });
    expect(a.fallen.join(" ")).toMatch(/Sonntag/);
    // Quelle der angewandten Regel aus dem Register, mit Prüfdatum und Status (Review 29.10.2026)
    expect(a.quellen[0]).toMatchObject({ norm: "§ 622 Abs. 2 BGB", url: "https://www.gesetze-im-internet.de/bgb/__622.html", status: "bestätigt" });
    expect(a).not.toHaveProperty("lintelly");
  });
  it("Website-Test: Grundfrist, Zugang 19.10. endet 30.11.", () => {
    expect(rufe("kuendigungsfrist_rechnen", { eintritt: "2025-06-01", zugang: "2026-10-19" }).ergebnis.ende).toBe("2026-11-30");
  });
  it("Website-Test: Probezeit, Zugang am letzten Probezeittag, Ende 28.10.", () => {
    const e = rufe("kuendigungsfrist_rechnen", { eintritt: "2026-04-15", zugang: "2026-10-14", probezeit_monate: 6 }).ergebnis;
    expect(e).toMatchObject({ ende: "2026-10-28", in_probezeit: true, probezeit_ende: "2026-10-14" });
  });
  it("Website-Test: Staffel 20 Jahre, 7 Monate", () => {
    expect(rufe("kuendigungsfrist_rechnen", { eintritt: "2005-03-01", zugang: "2026-10-04" }).ergebnis).toMatchObject({ ende: "2027-05-31", beschaeftigungsjahre: 21 });
  });
  it("Website-Test: Kleinbetrieb mit 4 Wochen zu jedem Tag und Vertrag 3 Monate zum Quartalsende", () => {
    expect(rufe("kuendigungsfrist_rechnen", { eintritt: "2025-01-01", zugang: "2026-10-07", kleinbetrieb_vier_wochen: true }).ergebnis.ende).toBe("2026-11-04");
    expect(rufe("kuendigungsfrist_rechnen", { eintritt: "2023-01-01", zugang: "2026-10-04", vertrag_monate: 3, vertrag_termin: "quartalsende" }).ergebnis.ende).toBe("2027-03-31");
  });
  it("Kündigung durch Mitarbeitende: nur Grundfrist", () => {
    const a = rufe("kuendigungsfrist_rechnen", { eintritt: "2016-08-01", zugang: "2026-10-04", wer_kuendigt: "arbeitnehmer" });
    expect(a.ergebnis.ende).toBe("2026-11-15");
    expect(a).not.toHaveProperty("lintelly");
  });
  it("lehnt Namen ab", () => {
    expect(() => rufe("kuendigungsfrist_rechnen", { eintritt: "2025-01-01", zugang: "2026-10-07", name: "Tom" })).toThrow(/Unbekanntes Feld/);
  });
});

describe("klagefrist", () => {
  it("3 Wochen nach Zugang, Ende am Samstag verschiebt auf Montag (§ 222 Abs. 2 ZPO)", () => {
    // Zugang Sa 07.11.2026 plus 21 Tage = Sa 28.11.2026, verschoben auf Mo 30.11.2026.
    const a = rufe("klagefrist", { zugang: "2026-11-07" });
    expect(a.ergebnis.ende).toBe("2026-11-30");
    expect(a).not.toHaveProperty("lintelly");
  });
  it("Feiertag im Bundesland verschiebt: Zugang 11.12.2026 endet rechnerisch 01.01.2027, dann Montag 04.01.2027", () => {
    expect(rufe("klagefrist", { zugang: "2026-12-11", bundesland: "HE" }).ergebnis.ende).toBe("2027-01-04");
  });
});

describe("kein Hinweis auf Lintelly-Angebote", () => {
  it("auch bei Kündigung steht im Feld hinweis nur der Satz zur Auskunft", () => {
    expect(rufe("kuendigungsfrist_rechnen", { eintritt: "2024-10-01", zugang: "2026-11-16" }).hinweis).toBe("Allgemeine Auskunft, keine Rechtsberatung im Einzelfall.");
    expect(rufe("klagefrist", { zugang: "2026-11-16" }).hinweis).not.toMatch(/lintelly/);
    expect(rufe("rechtswert", { kennung: "mindestlohn" }).hinweis).toBe("Allgemeine Auskunft, keine Rechtsberatung im Einzelfall.");
  });
});
