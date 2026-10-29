// Testfälle aus den Website-Tests (packages/kern/website/scripts/test-tools.mjs und test-tools-logik.mjs), durch die Werkzeuge gerufen.
import { describe, expect, it } from "vitest";
import { rufe } from "./hilfe";

const merken = (a: { naechster_schritt?: string[] }) => a.naechster_schritt?.find((s) => s.startsWith("Frist merken: Werkzeug frist_merken"));

describe("Eingaben", () => {
  it("unbekanntes Feld wird abgelehnt, auch ein Name", () => {
    expect(() => rufe("probezeit", { beginn: "2026-10-01", dauer: 6, name: "Lea" })).toThrow(/Unbekanntes Feld: name/);
  });
});

describe("probezeit", () => {
  it("6 Monate ab 01.10.2026: Ende 31.03.2027, Kündigung mit 2 Wochen bis 14.04.2027", () => {
    const a = rufe("probezeit", { beginn: "2026-10-01", dauer: 6, beschaeftigte: 20 });
    expect(a.ergebnis).toMatchObject({ probezeit_ende: "2027-03-31", ende_bei_kuendigung_am_letzten_tag: "2027-04-14", kuendigungsschutz_ab: "2027-04-01" });
    expect(a.quellen[0]).toMatchObject({ norm: "§ 622 Abs. 3 BGB", url: "https://www.gesetze-im-internet.de/bgb/__622.html", status: "bestätigt" });
    expect(merken(a)).toContain("2027-03-31");
    expect(a).not.toHaveProperty("lintelly");
  });
  it("Azubi 4 Monate ab 01.08.2026: Ende 30.11.2026, Kündigung ohne Frist, keine Lücke zum KSchG", () => {
    const a = rufe("probezeit", { beginn: "2026-08-01", dauer: 4, ausbildung: true });
    expect(a.ergebnis).toMatchObject({ probezeit_ende: "2026-11-30", ende_bei_kuendigung_am_letzten_tag: "2026-11-30", kuendigungsfrist_tage: 0, luecke_bis_kuendigungsschutz: false });
    expect(a.quellen.map((q) => q.norm)).toContain("§ 20 Satz 2 BBiG");
    expect(a).not.toHaveProperty("lintelly");
  });
  it("Azubi 5 Monate ist ein Fehler (§ 20 BBiG)", () => {
    expect(rufe("probezeit", { beginn: "2026-10-01", dauer: 5, ausbildung: true }).ergebnis.fehler[0]).toMatch(/4 Monate/);
  });
  it("Kleinbetrieb: KSchG gilt nicht, Wochenende am letzten Tag wird gemeldet", () => {
    const a = rufe("probezeit", { beginn: "2026-05-01", dauer: 6, beschaeftigte: 5 });
    expect(a.ergebnis.probezeit_ende).toBe("2026-10-31");
    expect(a.ergebnis.kuendigungsschutz_ab).toBeNull();
    expect(a.ergebnis.zugang_empfohlen_bis).toBe("2026-10-30");
    expect(a.fallen?.join(" ")).toMatch(/Wochenende/);
  });
});

describe("befristung", () => {
  // Website-Test rechnet mit heute = 01.12.2025
  const bf = (o: Record<string, unknown>) => rufe("befristung", { beginn: "2026-01-01", ende: "2026-03-31", schriftform: "ja", ...o }, "2025-12-01");
  const v = (vereinbart_am: string, neues_ende: string) => ({ vereinbart_am, neues_ende });
  it("Beginn 01.03.2026 ergibt spätestes Ende 29.02.2028", () => {
    const a = bf({ beginn: "2026-03-01", ende: "2026-12-31" });
    expect(a.ergebnis).toMatchObject({ spaetestes_ende: "2028-02-29", grundlage: "Regelfall", hoechstdauer_jahre: 2 });
    expect(a.quellen[0]).toMatchObject({ norm: "§ 14 Abs. 2 Satz 1 TzBfG", url: "https://www.gesetze-im-internet.de/tzbfg/__14.html" });
    expect(a.naechster_schritt?.some((s) => s.startsWith("Frist merken: Werkzeug frist_merken (Ende des befristeten Vertrags, 2026-12-31)"))).toBe(true);
    expect(a).not.toHaveProperty("lintelly");
  });
  it("3 Verlängerungen sind zulässig, keine übrig", () => {
    const a = bf({ verlaengerungen: [v("2026-03-20", "2026-06-30"), v("2026-06-20", "2026-09-30"), v("2026-09-20", "2027-12-31")] });
    expect(a.ergebnis).toMatchObject({ verlaengerungen_genutzt: 3, verlaengerungen_uebrig: 0, ampel: "grün", aktuelles_ende: "2027-12-31" });
  });
  it("vierte Verlängerung ist unzulässig und heißt Verlängerung 4", () => {
    const a = bf({ verlaengerungen: [v("2026-03-20", "2026-06-30"), v("2026-06-20", "2026-09-30"), v("2026-09-20", "2026-12-31"), v("2026-12-20", "2027-12-31")] });
    expect(a.ergebnis.ampel).toBe("rot");
    expect(a.ergebnis.pruefpunkte.map((p: { titel: string }) => p.titel)).toContain("Verlängerung 4: mehr als 3 Verlängerungen");
  });
  it("Vorbeschäftigung ohne Regelaltersgrenze bleibt unzulässig, mit Regelaltersgrenze zulässig (§ 41 Abs. 2 SGB VI)", () => {
    expect(bf({ vorbeschaeftigung: "arbeit" }).ergebnis.ampel).toBe("rot");
    const a = bf({ vorbeschaeftigung: "arbeit", regelaltersgrenze: true });
    expect(a.ergebnis.ampel).toBe("grün");
    expect(a.quellen.map((q) => q.norm)).toContain("§ 41 Abs. 2 SGB VI");
  });
  it("Neugründung genau 4 Jahre vor Beginn ist keine Neugründung mehr", () => {
    expect(bf({ gruendung: "2022-01-01" }).ergebnis.grundlage).toBe("Regelfall");
  });
  it("ohne Angabe zur Schriftform gibt es einen offenen Punkt", () => {
    const a = rufe("befristung", { beginn: "2026-01-01", ende: "2026-03-31" }, "2025-12-01");
    expect(a.ergebnis.ampel).toBe("gelb");
    expect(a.fallen?.join(" ")).toMatch(/Schriftform prüfen/);
  });
});

describe("elternzeit_fristen", () => {
  const ez = (o: Record<string, unknown>) => rufe("elternzeit_fristen", { geburt: "2026-03-01", beginn: "2026-06-01", ende: "2027-05-31", jahresurlaub: 30, ...o }, "2026-01-15");
  it("7 Wochen: sicher rechtzeitig bis Beginn minus 50 Tage, Textform reicht", () => {
    const a = ez({});
    expect(a.ergebnis).toMatchObject({ antrag_spaetestens: "2026-04-12", antrag_frist_wochen: 7, kuendigungsschutz_fruehestens: "2026-04-06", kuendigungsschutz_bis: "2027-05-31" });
    expect(a.ergebnis.antrag_form).toMatch(/Textform/);
    expect(a.quellen[0]).toMatchObject({ norm: "§ 16 Abs. 1 BEEG", url: "https://www.gesetze-im-internet.de/beeg/__16.html" });
    expect(a.naechster_schritt?.some((s) => s.startsWith("Frist merken: Werkzeug frist_merken (Spätester Eingang des Elternzeit-Antrags, 2026-04-12)"))).toBe(true);
  });
  it("Mutter, Frühgeburt 6 Wochen vor ET: Mutterschutz bis 05.07.2026", () => {
    const a = ez({ elternteil: "mutter", mutterschutz_12_wochen: true, errechneter_termin: "2026-04-12", beginn: "2026-07-06" });
    expect(a.ergebnis.mutterschutz_ende).toBe("2026-07-05");
  });
  it("Beginn im verlängerten Mutterschutz gibt eine Warnung", () => {
    const a = ez({ elternteil: "mutter", mutterschutz_12_wochen: true, errechneter_termin: "2026-04-12", beginn: "2026-05-25" });
    expect(a.fallen?.some((f) => f.includes("05.07.2026"))).toBe(true);
  });
  it("Urlaubskürzung nach vollen Kalendermonaten: 15.03. bis 14.09. ergibt 5", () => {
    const a = ez({ beginn: "2026-03-15", ende: "2026-09-14" });
    expect(a.ergebnis.urlaubskuerzung).toEqual([{ jahr: 2026, monate: 5, tage: 12.5 }]);
  });
  it("mehr als 3 Jahre ist ein Fehler", () => {
    expect(ez({ ende: "2029-06-30" }).ergebnis.fehler[0]).toMatch(/höchstens 3 Jahre/);
  });
});

describe("mutterschutz", () => {
  it("ET 15.03.2027 ergibt 01.02. bis 10.05.2027, 99 Tage, mit Pflichten als nächster Schritt", () => {
    const a = rufe("mutterschutz", { errechneter_termin: "2027-03-15" });
    expect(a.ergebnis).toMatchObject({ vorlaeufig: true, schutzfrist_vor_geburt_ab: "2027-02-01", schutzfrist_nach_geburt_bis: "2027-05-10", tage_gesamt: 99, kuendigungsverbot_bis: "2027-07-15" });
    const schritte = a.naechster_schritt?.join(" ") ?? "";
    expect(schritte).toMatch(/Aufsichtsbehörde/);
    expect(schritte).toMatch(/U2/);
    expect(schritte).toMatch(/Kündigungsverbot/);
    expect(merken(a)).toBe("Frist merken: Werkzeug frist_merken (Beginn der Schutzfrist vor der Geburt, 2027-02-01)");
    expect(a.quellen[0]).toMatchObject({ norm: "§ 3 Abs. 1 MuSchG", url: "https://www.gesetze-im-internet.de/muschg_2018/__3.html" });
  });
  it("Frühgeburt 4 Wochen vor ET: Schutzfrist bis 07.06.2027, Kündigungsverbot bis 15.06.2027", () => {
    const a = rufe("mutterschutz", { errechneter_termin: "2027-03-15", geburt: "2027-02-15", fruehgeburt: true });
    expect(a.ergebnis).toMatchObject({ schutzfrist_nach_geburt_bis: "2027-06-07", kuendigungsverbot_bis: "2027-06-15", wochen_nach_geburt: 12, verlaengert_um_tage: 28 });
  });
  it("Totgeburt 02.11.2026 in der 25. Woche, ET 22.02.2027: Schutzfrist bis 08.02.2027, Kündigungsverbot bis 02.03.2027", () => {
    const a = rufe("mutterschutz", { fall: "fehlgeburt", fehlgeburt_am: "2026-11-02", schwangerschaftswoche: 25, errechneter_termin: "2027-02-22" });
    expect(a.ergebnis).toMatchObject({ totgeburt: true, schutzfrist_bis: "2027-02-08", kuendigungsverbot_bis: "2027-03-02" });
  });
  it("Fehlgeburt in der 12. Woche hat keine Schutzfrist, ab 500 Gramm ist es eine Totgeburt", () => {
    expect(rufe("mutterschutz", { fall: "fehlgeburt", fehlgeburt_am: "2026-05-10", schwangerschaftswoche: 12 }).ergebnis).toMatchObject({ totgeburt: false, schutzfrist_bis: null, kuendigungsverbot_bis: null });
    expect(rufe("mutterschutz", { fall: "fehlgeburt", fehlgeburt_am: "2026-05-10", schwangerschaftswoche: 22, ab_500_gramm: true }).ergebnis.totgeburt).toBe(true);
  });
  it("ohne Termin gibt es einen Fehler statt einer Rechnung", () => {
    expect(rufe("mutterschutz", {}).ergebnis.fehler[0]).toMatch(/Entbindungstermin/);
  });
});

describe("aufbewahrungsfristen", () => {
  it("Lohnabrechnung 31.03.2026: 8 Jahre ab Jahresende, bis 31.12.2034", () => {
    const a = rufe("aufbewahrungsfristen", { dokument: "lohn", datum: "2026-03-31" });
    expect(a.ergebnis).toMatchObject({ aufbewahren_bis: "2034-12-31", loeschen_ab: "2035-01-01", jetzt_loeschen: false });
    expect(a.quellen[0]).toMatchObject({ url: "https://www.gesetze-im-internet.de/ao_1977/__147.html" });
    expect(merken(a)).toBe("Frist merken: Werkzeug frist_merken (Ende der Aufbewahrungsfrist, 2034-12-31)");
  });
  it("SV-Unterlage im geprüften Zeitraum: verbindlich ist die längere steuerliche Frist, die SV-Frist steht im Rechenweg", () => {
    const pruefung = { pruefung_zeitraum_bis: "2023-12-31", pruefung_am: "2024-05-10" };
    const a = rufe("aufbewahrungsfristen", { dokument: "sv", datum: "2023-01-31", ...pruefung });
    expect(a.ergebnis).toMatchObject({ aufbewahren_bis: "2031-12-31", loeschen_ab: "2032-01-01", jetzt_loeschen: false });
    expect(a.rechenweg!.join(" ")).toMatch(/§ 28f SGB IV allein: aufbewahren bis 31\.12\.2025/);
    expect(rufe("aufbewahrungsfristen", { dokument: "sv", datum: "2026-03-31", ...pruefung }).ergebnis).toMatchObject({ aufbewahren_bis: null, loeschen_ab: null });
  });
  it("Bewerbung 6 Monate ab 31.08. ergibt 28.02.", () => {
    expect(rufe("aufbewahrungsfristen", { dokument: "bewerbung", datum: "2026-08-31" }).ergebnis.aufbewahren_bis).toBe("2027-02-28");
  });
  it("Löschplan nach Austritt 30.06.2026: Arbeitsvertrag ab 2033, übrige Akte ab 2030", () => {
    const plan = rufe("aufbewahrungsfristen", { modus: "austritt", datum: "2026-06-30" }).ergebnis.loeschplan;
    expect(plan.find((r: { unterlage: string }) => r.unterlage.startsWith("Arbeitsvertrag")).loeschen_ab).toBe("2033-01-01");
    expect(plan.find((r: { unterlage: string }) => r.unterlage.startsWith("Personalakte")).loeschen_ab).toBe("2030-01-01");
  });
  it("laufender Rechtsstreit: nicht löschen, kein Frist merken", () => {
    const a = rufe("aufbewahrungsfristen", { dokument: "lohn", datum: "2015-03-31", verfahren_laeuft: true });
    expect(a.fallen?.join(" ")).toMatch(/Nicht löschen/);
    expect(merken(a)).toBeUndefined();
  });
});

describe("pausen", () => {
  const tag = (datum: string, beginn: string, ende: string, pausen: [string, string][] = []) => ({ ...(datum ? { datum } : {}), beginn, ende, pausen: pausen.map(([von, bis]) => ({ von, bis })) });
  const jug = (d: string) => tag(d, "08:00", "17:00", [["11:00", "11:30"], ["13:30", "14:00"]]);
  it("6:00 Stunden ohne Pause sind erlaubt, 6:01 nicht", () => {
    expect(rufe("pausen", { tage: [tag("2026-10-05", "08:00", "14:00")] }).ergebnis.ampel).toBe("grün");
    const a = rufe("pausen", { tage: [tag("2026-10-05", "08:00", "14:01")] });
    expect(a.ergebnis.ampel).toBe("rot");
    expect(a.ergebnis.tage[0]).toMatchObject({ arbeit_minuten: 361, pause_minuten: 0, pause_noetig_minuten: 30 });
    expect(a.quellen[0]).toMatchObject({ norm: "§ 4 Satz 1 ArbZG", url: "https://www.gesetze-im-internet.de/arbzg/__4.html" });
  });
  it("Jugendliche: 6 Tage in einer Kalenderwoche mit je 8 Stunden überschreiten 40 Stunden", () => {
    const a = rufe("pausen", { jugendlich: true, tage: ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"].map(jug) });
    expect(a.ergebnis.ampel).toBe("rot");
    expect(a.fallen?.join(" ")).toMatch(/40 Stunden/);
  });
  it("Jugendliche: 7 Tage über zwei Kalenderwochen mit je 8 Stunden sind kein Wochenverstoß", () => {
    const a = rufe("pausen", { jugendlich: true, tage: ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-12", "2026-10-13"].map(jug) });
    expect(a.fallen?.join(" ") ?? "").not.toMatch(/40 Stunden/);
  });
  it("Ruhezeit nach Spätschicht am Vortag zu kurz", () => {
    const a = rufe("pausen", { vortag_ende: "23:00", tage: [tag("", "07:00", "12:00")] });
    expect(a.ergebnis.tage[0].ruhezeit_davor_minuten).toBe(480);
    expect(a.fallen?.join(" ")).toMatch(/11 Stunden/);
  });
});
