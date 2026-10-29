// Testfälle aus packages/kern/website/scripts/test-urlaub.mjs, durch die Werkzeuge gerufen. Der Hinweis zum Urlaubsverfall
// hat auf der Website keinen eigenen Test, seine Fälle folgen der Seite urlaubsverfall-hinweis-generator.tsx.
import { describe, expect, it } from "vitest";
import { rufe } from "./hilfe";

describe("Eingaben", () => {
  it("unbekanntes Feld wird abgelehnt, auch ein Name", () => {
    expect(() => rufe("urlaubsanspruch", { jahresurlaub: 30, arbeitstage_pro_woche: 5, name: "Tom" })).toThrow(/Unbekanntes Feld: name/);
  });
});

describe("urlaubsanspruch", () => {
  const u = (o: Record<string, unknown>) => rufe("urlaubsanspruch", { jahresurlaub: 30, arbeitstage_pro_woche: 5, jahr: 2026, ...o });
  const teile = (a: { ergebnis: any }) => [a.ergebnis.gesetzlich_tage, a.ergebnis.mehrurlaub_tage, a.ergebnis.gesamt_tage];
  it("Vollzeit ganzes Jahr: 20 gesetzlich + 10 Mehrurlaub = 30, mit Quelle und Rechenweg", () => {
    const a = u({});
    expect(teile(a)).toEqual([20, 10, 30]);
    expect(a.quellen[0]).toMatchObject({ norm: "§ 3 Abs. 1 BUrlG", url: "https://www.gesetze-im-internet.de/burlg/__3.html" });
    expect(a.rechenweg?.[0]).toMatch(/24 Werktage/);
    expect(a.naechster_schritt?.join(" ")).toMatch(/urlaubsverfall_hinweis/);
  });
  it("Teilzeit 3 Tage: 12 + 6 = 18", () => expect(teile(u({ arbeitstage_pro_woche: 3 }))).toEqual([12, 6, 18]));
  it("Eintritt 02.07.: 5/12, gesetzlich 8,33 wird 9, gesamt 12,5 wird 13", () => {
    const a = u({ eintritt: "2026-07-02" });
    expect(teile(a)).toEqual([9, 4, 13]);
    expect(a.rechenweg?.some((x) => x.includes("12,5 Tage, aufgerundet auf 13"))).toBe(true);
  });
  it("Wechsel 5 auf 3 Tage ab 01.07.: im Schnitt 4 Tage, 16 + 8 = 24", () => {
    expect(teile(u({ wechsel_ab: "2026-07-01", wechsel_tage: 3 }))).toEqual([16, 8, 24]);
  });
  it("Schwerbehinderung Vollzeit: +5", () => expect(u({ schwerbehindert: true }).ergebnis.gesamt_tage).toBe(35));
  it("Austritt vor Eintritt ist ein Fehler, 7 Arbeitstage lehnt schon die Eingabe ab", () => {
    expect(() => u({ eintritt: "2026-05-01", austritt: "2026-04-01" })).toThrow(/vor dem Eintritt/);
    expect(() => u({ arbeitstage_pro_woche: 7 })).toThrow();
  });
});

describe("urlaubsverfall_hinweis", () => {
  const h = (o: Record<string, unknown>) => rufe("urlaubsverfall_hinweis", { jahr: 2026, datum: "2026-10-23", anspruch: 30, genommen: 18, geplant: 5, ...o });
  it("Herbst-Erinnerung: 7 Tage offen, Verfall 31.12.2026, fertiger Brief mit Platzhaltern statt Namen", () => {
    const a = h({});
    expect(a.ergebnis).toMatchObject({ offen_tage: 7, verfall_am: "2026-12-31", uebertragung_bis: "2027-03-31", arbeitstage_bis_verfall: 48, schreiben_kommt_spaet: false, art: "erinnerung" });
    const t: string = a.ergebnis.text;
    expect(t).toContain("Erinnerung: Ihr Resturlaub 2026 und sein Verfall");
    expect(t).toContain("Guten Tag [Vorname Nachname],");
    expect(t).toContain("Noch offen (Stand 23.10.2026): 7 Arbeitstage");
    expect(t).toContain("verfällt mit Ablauf dieses Tages ersatzlos. Das gilt nach § 7 Abs. 3 Bundesurlaubsgesetz.");
    expect(t).toContain("Empfangsbestätigung");
    expect(t.startsWith("[Firma]\n[Straße Hausnummer]\n[PLZ Ort]\n\nPersönlich\n\n[Vorname Nachname]\n[Abteilung oder Anschrift]\n\n[Ort], 23.10.2026")).toBe(true);
    expect(a.quellen[0]).toMatchObject({ norm: "§ 7 Abs. 3 BUrlG", url: "https://www.gesetze-im-internet.de/burlg/__7.html" });
    expect(a.naechster_schritt).toContain("Frist merken: Werkzeug frist_merken (Verfall des Resturlaubs, 2026-12-31)");
    expect(a).not.toHaveProperty("lintelly");
  });
  it("Schreiben im Dezember kommt zu spät, wenn die offenen Tage kaum noch nehmbar sind", () => {
    const a = h({ datum: "2026-12-15", genommen: 10, geplant: 0 });
    expect(a.ergebnis).toMatchObject({ offen_tage: 20, arbeitstage_bis_verfall: 11, schreiben_kommt_spaet: true });
    expect(a.fallen?.[0]).toMatch(/kommt spät/);
  });
  it("du-Ansprache, Jahresbeginn, Vorjahresrest und vertragliche Übertragung bis 30.06.", () => {
    const a = h({ datum: "2026-01-15", genommen: 0, geplant: 0, vorjahr: 3, ansprache: "du", uebertragung: "vertraglich", uebertragung_bis: "2027-06-30" });
    const t: string = a.ergebnis.text;
    expect(a.ergebnis).toMatchObject({ art: "jahresbeginn", uebertragung_bis: "2027-06-30", vorjahr_verfall_am: "2026-06-30" });
    expect(t).toContain("Hallo [Vorname],");
    expect(t).toContain("Außerdem hast du noch 3 Arbeitstage Resturlaub aus 2025. Diese Tage musst du bis zum 30.06.2026 nehmen.");
    expect(t).toContain("verfällt nach deinem Arbeitsvertrag mit Ablauf des 30.06.2027 ersatzlos");
    expect(a.naechster_schritt?.join(" ")).toMatch(/Erinnerung im Kalender: 01\.10\.2026/);
  });
  it("Fehler: vertraglich ohne Datum, Schreiben außerhalb des Urlaubsjahres, mehr verplant als Anspruch", () => {
    expect(() => h({ uebertragung: "vertraglich" })).toThrow(/Übertragung/);
    expect(() => h({ datum: "2025-12-01" })).toThrow(/Urlaubsjahr 2026/);
    expect(() => h({ genommen: 28, geplant: 5 })).toThrow(/über dem Anspruch/);
  });
});
