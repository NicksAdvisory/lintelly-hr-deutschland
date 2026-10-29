import { describe, expect, it } from "vitest";
import { abgabenArbeitgeber } from "../../kern/website/components/tools/minijob-logik";
import { mindestlohnLuecke } from "@/lib/regeln/mindestlohn";
import { midijob } from "@/lib/regeln/midijob";
import { rufe } from "./hilfe";

describe("arbeitgeberkosten", () => {
  it("Vollzeit 4.000 € im November 2026: Arbeitgeberanteil KV/PV 422 €, RV/AV 424 €", () => {
    const e = rufe("arbeitgeberkosten", { art: "vollzeit", brutto_monat: 4000, stichtag: "2026-11-01" }).ergebnis;
    expect(e.posten).toEqual([
      { name: "Kranken- und Pflegeversicherung (Hälfte, mit durchschnittlichem Zusatzbeitrag)", satz: 0.1055, basis: 4000, betrag: 422 },
      { name: "Renten- und Arbeitslosenversicherung (Hälfte)", satz: 0.106, basis: 4000, betrag: 424 },
    ]);
    expect(e).toMatchObject({ summe_arbeitgeber: 846, gesamtkosten_monat: 4846, gesamtkosten_jahr: 58152 });
  });
  it("über der Beitragsbemessungsgrenze zählt nur der Teil bis zur Grenze", () => {
    const e = rufe("arbeitgeberkosten", { art: "vollzeit", brutto_monat: 9000, stichtag: "2026-11-01" }).ergebnis;
    expect(e.posten.map((p: { basis: number; betrag: number }) => [p.basis, p.betrag])).toEqual([[5812.5, 613.22], [8450, 895.7]]);
  });
  it("Teilzeit 1.800 € im Übergangsbereich 2026: genauer Arbeitgeberanteil mit Faktor F, wie midijob() der Werkbank", () => {
    const a = rufe("arbeitgeberkosten", { art: "teilzeit", brutto_monat: 1800, stichtag: "2026-11-01" });
    const m = midijob(1800, "2026-11-01");
    if (!m.berechnet) throw new Error(m.grund);
    expect(a.ergebnis).toMatchObject({ uebergangsbereich: true, faktor_f: m.faktorF, summe_arbeitgeber: m.arbeitgeber, gesamtkosten_monat: 1800 + m.arbeitgeber });
    expect(m.arbeitgeber).toBeGreaterThan(380.7);
    expect(a.rechenweg).toEqual(m.rechenweg);
    expect(a.quellen.map((q) => q.norm).join(" ")).toMatch(/§ 20 Abs\. 2a SGB IV/);
  });
  it("Übergangsbereich 2027 ohne amtlichen Faktor F: Untergrenze mit ehrlichem Hinweis", () => {
    const a = rufe("arbeitgeberkosten", { art: "teilzeit", brutto_monat: 1800, stichtag: "2027-02-01" });
    expect(a.ergebnis).toMatchObject({ uebergangsbereich: true, summe_arbeitgeber: null });
    expect(a.fallen.join(" ")).toMatch(/Genauer Anteil nicht berechnet: Faktor F für 2027/);
  });
  it("Minijob rechnet wie der Minijob-Rechner auf lintelly.com", () => {
    const e = rufe("arbeitgeberkosten", { art: "minijob", brutto_monat: 603, stichtag: "2026-11-01" }).ergebnis;
    const w = abgabenArbeitgeber(603, { gesetzlichVersichert: true, pauschsteuer: true });
    expect(e.summe_arbeitgeber).toBe(w.summe);
    expect(e.gesamtkosten_monat).toBe(w.gesamtkosten);
  });
  it("Minijob über der Grenze ist kein Minijob", () => {
    const a = rufe("arbeitgeberkosten", { art: "minijob", brutto_monat: 700, stichtag: "2026-11-01" });
    expect(a.ergebnis.summe_arbeitgeber).toBeNull();
    expect(a.fallen.join(" ")).toMatch(/603/);
  });
  it("Minijob 2027: keine Zahl mit der KV-Pauschale von 2026, ehrlicher Hinweis (Review 29.10.2026)", () => {
    const a = rufe("arbeitgeberkosten", { art: "minijob", brutto_monat: 500, stichtag: "2027-02-01" });
    expect(a.ergebnis).toMatchObject({ summe_arbeitgeber: null });
    expect(a.ergebnis).not.toHaveProperty("posten");
    expect(a.fallen.join(" ")).toMatch(/rechnet Lintelly HR noch nicht/);
    expect(a.fallen.join(" ")).not.toMatch(/erst im Herbst/);
  });
  it("2027: vorläufige Werte einmal je Hinweis und mit Namen", () => {
    const f: string[] = rufe("arbeitgeberkosten", { art: "vollzeit", brutto_monat: 3000, stichtag: "2027-02-01" }).fallen;
    const v = f.filter((x) => x.startsWith("Vorläufig"));
    expect(v.length).toBeGreaterThan(0);
    expect(new Set(v).size).toBe(v.length);
    expect(v.join(" ")).toMatch(/Beitragssatz Kranken- und Pflegeversicherung/);
    expect(f.filter((x) => /^Wert /.test(x))).toEqual([]);
  });
  it("Werkstudent 2.500 €: nur Rentenversicherung, 9,3 % = 232,50 €", () => {
    const e = rufe("arbeitgeberkosten", { art: "werkstudent", brutto_monat: 2500, stichtag: "2026-11-01" }).ergebnis;
    expect(e.posten).toEqual([{ name: "Rentenversicherung (Hälfte)", satz: 0.093, basis: 2500, betrag: 232.5 }]);
  });
});

describe("mindestlohn_check", () => {
  it("2.000 € für 40 Stunden im November 2026 liegt unter dem Mindestlohn, gleiche Rechnung wie die Werkbank", () => {
    const e = rufe("mindestlohn_check", { brutto_monat: 2000, wochenstunden: 40, stichtag: "2026-11-01" }).ergebnis;
    const w = mindestlohnLuecke(2000, 40, "2026-11-01");
    expect(e).toMatchObject({ mindestlohn: 13.9, stundenlohn: w.stundenlohn, soll_monat: w.soll, fehlt_monat: w.fehlt, reicht: false });
  });
  it("Mindestlohn 2027 ist 14,60 €", () => {
    expect(rufe("mindestlohn_check", { brutto_monat: 3000, wochenstunden: 40, stichtag: "2027-01-01" }).ergebnis).toMatchObject({ mindestlohn: 14.6, reicht: true });
  });
});

describe("sofortmeldepflicht", () => {
  it("Gastronomie: Sofortmeldung spätestens bei Arbeitsaufnahme (§ 28a Abs. 4 SGB IV)", () => {
    const a = rufe("sofortmeldepflicht", { branche: "gastro" });
    expect(a.ergebnis).toMatchObject({ pflicht: true, bereich: "Gaststätten- und Beherbergungsgewerbe" });
    expect(a.quellen[0].norm).toBe("§ 28a Abs. 4 SGB IV");
  });
  it("andere Branche: keine Sofortmeldung, normale Anmeldung", () => {
    expect(rufe("sofortmeldepflicht", { branche: "keine" }).ergebnis.pflicht).toBe(false);
  });
});

describe("frist_merken", () => {
  it("Probezeitende: Link auf den Rechner mit „Frist merken“ und Kalendereintrag, ohne Daten bei uns", () => {
    const e = rufe("frist_merken", { datum: "2026-12-31", frist: "Ende der Probezeit" }).ergebnis;
    expect(e.link).toBe("https://lintelly.com/tools/probezeit-rechner");
    expect(e.kalender_ics).toMatch(/DTSTART;VALUE=DATE:20261231/);
    expect(e.erinnerung_moeglich).toEqual([7, 1, 0]);
    expect(e.kalender_ics).toMatch(/BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-P6DT15H\r\nDESCRIPTION:In 7 Tagen: Ende der Probezeit\r\nEND:VALARM\r\nEND:VEVENT/);
  });
  it("Frist in der Vergangenheit: keine Erinnerung mehr möglich", () => {
    expect(rufe("frist_merken", { datum: "2026-10-01", frist: "Ende der Probezeit" }).ergebnis.erinnerung_moeglich).toEqual([]);
  });
});
