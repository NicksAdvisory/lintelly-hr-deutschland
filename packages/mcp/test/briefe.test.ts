import { describe, expect, it } from "vitest";
import { WERTE } from "@/lib/regeln/werte";
// Die Rechnung der Seite (lintelly.com, components/tools/kuendigungsschreiben-generator.tsx importiert sie aus lib/fristen)
import { berechneKuendigung } from "../../kern/website/lib/fristen";
import { HINWEIS } from "../src/antwort";
import { WERKZEUGE } from "../src/werkzeuge";
import { rufe } from "./hilfe";

const STRICH = /[–—]| - /;
const KLAGE = `${WERTE.kschgKlageWochen.wert} Wochen`;

describe("kuendigungsschreiben", () => {
  const basis = { eintritt: "2023-06-19", zugang: "2026-10-26" };

  it("3 Jahre dabei: 1 Monat zum Monatsende, Ende 30.11.2026, Folgetermine mit spätestem Zugang", () => {
    const a = rufe("kuendigungsschreiben", basis);
    expect(a.ergebnis).toMatchObject({ ende: "2026-11-30", in_probezeit: false, betriebszugehoerigkeit_jahre: 3 });
    expect(a.ergebnis.regel.replace(/\s/g, " ")).toContain("§ 622 Abs. 2 BGB"); // die Werkbank setzt geschützte Leerzeichen
    expect(a.ergebnis.termine).toEqual([
      { termin: "2026-11-30", spaetester_zugang: "2026-10-31" },
      { termin: "2026-12-31", spaetester_zugang: "2026-11-30" },
      { termin: "2027-01-31", spaetester_zugang: "2026-12-31" },
    ]);
    expect(a.ergebnis.brief).toContain("ordentlich und fristgerecht zum 30.11.2026, hilfsweise zum nächstmöglichen Termin.");
    expect(a.rechenweg?.length).toBeGreaterThan(2);
  });

  it("rechnet wie die Seite: gleiche Eingabe, gleiches Ende und gleiche Termine wie berechneKuendigung auf lintelly.com", () => {
    const faelle = [
      { ein: { eintritt: "2026-09-01", zugang: "2026-10-26" }, seite: { probezeitMonate: 6 } },
      { ein: { eintritt: "2020-01-01", zugang: "2026-10-26", vertragsfrist: "quartalsende", vertragsfrist_monate: 3 }, seite: { probezeitMonate: 6, vertrag: { monate: 3, termin: "quartalsende" as const } } },
      { ein: { eintritt: "2026-01-01", zugang: "2026-10-26", kleinbetrieb_vier_wochen: true }, seite: { probezeitMonate: 6, kleinbetriebVierWochen: true } },
      { ein: { eintritt: "2024-12-01", zugang: "2026-10-03", probezeit_monate: 0 }, seite: { probezeitMonate: 0 } },
    ];
    for (const f of faelle) {
      const s = berechneKuendigung({ eintritt: f.ein.eintritt, zugang: f.ein.zugang, kuendigender: "arbeitgeber", ...f.seite });
      const a = rufe("kuendigungsschreiben", f.ein);
      expect(a.ergebnis.ende).toBe(s.ende);
      expect(a.ergebnis.termine).toEqual(s.termine.map((t) => ({ termin: t.termin, spaetester_zugang: t.spaetesterZugang })));
      expect(a.rechenweg).toEqual(s.rechenweg);
    }
    expect(rufe("kuendigungsschreiben", faelle[0].ein).ergebnis).toMatchObject({ ende: "2026-11-09", in_probezeit: true });
    expect(rufe("kuendigungsschreiben", faelle[1].ein).ergebnis.ende).toBe("2027-03-31");
    expect(rufe("kuendigungsschreiben", faelle[2].ein).ergebnis.ende).toBe("2026-11-23");
    // Zugang am Feiertag: der Hinweis der Seite steht in den Fallen
    expect(rufe("kuendigungsschreiben", faelle[3].ein).fallen?.join(" ")).toContain("Tag der Deutschen Einheit");
  });

  it("Brief nach DIN 5008 wie auf der Seite, mit Platzhaltern statt Namen und Anschriften", () => {
    const brief: string = rufe("kuendigungsschreiben", { ...basis, briefdatum: "2026-10-23" }).ergebnis.brief;
    for (const teil of ["[Firma]", "[Straße Hausnummer]", "[PLZ Ort]", "Persönliche Übergabe", "Persönlich/Vertraulich", "[Vorname Nachname]",
      "[Ort], 23.10.2026", "Kündigung des Arbeitsverhältnisses", "Guten Tag [Vorname Nachname],", "hiermit kündigen wir das zwischen Ihnen und uns",
      "bei der Agentur für Arbeit arbeitsuchend zu melden", "spätestens drei Monate vor Beendigung", "innerhalb von drei Tagen nach Zugang",
      "Ihr Arbeitszeugnis und die Arbeitspapiere erhalten Sie", "Bitte geben Sie alle Arbeitsmittel", "spätestens am letzten Arbeitstag",
      "Mit freundlichen Grüßen", "[Vor- und Nachname]", "[Funktion]"]) expect(brief).toContain(teil);
    expect(brief).not.toContain("Betriebsrat");
    expect(brief).not.toContain("Vollmacht");
  });

  it("du-Form, Bote, Betriebsrat angehört, unwiderrufliche Freistellung mit Resturlaub, Unterschrift in Vertretung", () => {
    const a = rufe("kuendigungsschreiben", {
      ...basis, anrede: "du", zustellung: "bote", betriebsrat: "angehoert", freistellung: "unwiderruflich", freistellung_ab: "2026-11-02",
      resturlaub_tage: 12, unterschrift: "in_vertretung",
    });
    const brief: string = a.ergebnis.brief;
    for (const teil of ["Per Boten", "Hallo [Vorname],", "zwischen dir und uns", "Der Betriebsrat wurde vor Ausspruch der Kündigung angehört.",
      "stellen wir dich bis zur Beendigung", "unwiderruflich von der Pflicht zur Arbeitsleistung frei", "unter Anrechnung deines restlichen Urlaubsanspruchs von 12 Arbeitstagen",
      "Ab dem 02.11.2026", "Bitte gib alle Arbeitsmittel", "spätestens zu Beginn der Freistellung am 02.11.2026", "bist du verpflichtet",
      "Dein Arbeitszeugnis und die Arbeitspapiere erhältst du", "Viele Grüße", "i. V. [Vor- und Nachname]", "Anlage\nVollmacht im Original"]) expect(brief).toContain(teil);
    expect(a.ergebnis.unterschrift).toContain("§ 174 BGB");
  });

  it("Prüfliste der Seite vor dem Versand: Schriftform, Vollmacht, Zugang, Personalakte, Klagefrist, Sonderkündigungsschutz, Meldung Arbeitsagentur", () => {
    const liste: string = rufe("kuendigungsschreiben", basis).ergebnis.pruefliste.join("\n");
    for (const teil of ["eigenhändig unterschreiben", "§ 623 BGB", "Vollmacht im Original", "§ 174 BGB", "Zeugen", "Kein Übergabe-Einschreiben",
      "Personalakte", "Lohnbüro", `${KLAGE} Zeit für eine Kündigungsschutzklage (§ 4 KSchG)`, "Sonderkündigungsschutz", "Schwangerschaft",
      "Elternzeit", "Schwerbehinderung", "§ 38 Abs. 1 SGB III"]) expect(liste).toContain(teil);
  });

  it("Betriebsrat nicht angehört: kein Brief, erst Anhörung nach § 102 BetrVG", () => {
    const a = rufe("kuendigungsschreiben", { ...basis, betriebsrat: "nicht_angehoert" });
    expect(a.ergebnis.brief).toBeNull();
    expect(a.ergebnis.betriebsrat).toContain("§ 102 Abs. 1 BetrVG");
    expect(a.ergebnis.betriebsrat).toContain("eine Woche");
    expect(a.ergebnis.ende).toBe("2026-11-30");
  });

  it("Ausbildungsverhältnis: Vorlage passt nicht, Hinweis auf § 22 BBiG", () => {
    const a = rufe("kuendigungsschreiben", { ...basis, ausbildung: true });
    expect(a.ergebnis.brief).toBeNull();
    expect(a.ergebnis.passt_nicht).toContain("§ 22 BBiG");
  });

  it("Zugang vor dem Briefdatum und Freistellung nach dem Ende werden gemeldet", () => {
    expect(rufe("kuendigungsschreiben", { ...basis, briefdatum: "2026-10-27" }).ergebnis.fehler).toBe("Zugang liegt vor dem Datum des Schreibens.");
    const a = rufe("kuendigungsschreiben", { ...basis, freistellung: "widerruflich", freistellung_ab: "2026-12-01" });
    expect(a.fallen).toContain("Die Freistellung beginnt nach dem Ende des Arbeitsverhältnisses. Prüf das Datum.");
  });

  it("Quellen mit amtlichem Link, Hinweis auf Prüfung vor dem Versand, kein Gedankenstrich", () => {
    const a = rufe("kuendigungsschreiben", basis);
    expect(a.quellen).toContainEqual(expect.objectContaining({ norm: "§ 623 BGB", url: "https://www.gesetze-im-internet.de/bgb/__623.html" }));
    expect(a.quellen.map((q) => q.norm)).toEqual(expect.arrayContaining(["§ 622 Abs. 2 BGB", "§ 174 BGB", "§ 4 Satz 1 KSchG", "§ 38 Abs. 1 SGB III"]));
    expect(a).not.toHaveProperty("lintelly");
    expect(a.hinweis).toBe(HINWEIS);
    expect(JSON.stringify(a)).not.toMatch(STRICH);
    expect(JSON.stringify(rufe("kuendigungsschreiben", { ...basis, anrede: "du", freistellung: "unwiderruflich" }))).not.toMatch(STRICH);
  });

  it("Felder für Namen gibt es nicht: unbekanntes Feld wird abgelehnt", () => {
    expect(() => rufe("kuendigungsschreiben", { ...basis, name: "Max Muster" })).toThrow("Unbekanntes Feld: name");
  });
});

describe("abmahnung", () => {
  const basis = { verstoss: "Unpünktlichkeit", datum_vorfall: "2026-09-15", uhrzeit: "09:40" };

  it("Pflichtteile Rüge, verletzte Pflicht, Hinweis und Warnung, jeder mit eigenem Teil", () => {
    const teile = rufe("abmahnung", basis).ergebnis.pflichtteile;
    expect(teile.map((t: { teil: string }) => t.teil)).toEqual(["Rüge", "Verletzte Pflicht", "Hinweis", "Warnung"]);
    const text = JSON.stringify(teile);
    for (const teil of ["Datum", "Uhrzeit", "Dritter", "Fundstelle", "unterlassen", "Kündigung"]) expect(text).toContain(teil);
  });

  it("Vorlage als Brief nach DIN 5008 mit Datum, Uhrzeit, Warnung und Platzhaltern statt Namen", () => {
    const v: string = rufe("abmahnung", { ...basis, briefdatum: "2026-09-18" }).ergebnis.vorlage;
    for (const teil of ["[Firma]", "[Straße Hausnummer]", "Persönliche Übergabe", "Persönlich/Vertraulich", "[Vorname Nachname]", "[Ort], 18.09.2026",
      "Abmahnung wegen Unpünktlichkeit am 15.09.2026", "Guten Tag [Vorname Nachname],", "wir müssen Sie auf folgendes Fehlverhalten hinweisen: Am 15.09.2026 um 9:40 Uhr",
      "Damit haben Sie Ihre Pflicht aus [Fundstelle] des Arbeitsvertrags verletzt, die Arbeit zu Beginn der vereinbarten Arbeitszeit aufzunehmen.",
      "Wir fordern Sie auf, dieses Verhalten künftig zu unterlassen",
      "Wir weisen Sie ausdrücklich darauf hin, dass Sie im Wiederholungsfall mit der Kündigung Ihres Arbeitsverhältnisses rechnen müssen.",
      "Gegendarstellung", "Personalakte", "Mit freundlichen Grüßen", "[Vor- und Nachname]"]) expect(v).toContain(teil);
    expect(rufe("abmahnung", { verstoss: "Unentschuldigtes Fehlen", datum_vorfall: "2026-09-12" }).ergebnis.vorlage).toContain("Abmahnung wegen unentschuldigten Fehlens am 12.09.2026");
  });

  it("frühere gleichartige Abmahnung steht in der Warnung, du-Form durchgehend", () => {
    const v: string = rufe("abmahnung", { ...basis, fruehere_abmahnung: "gleich", datum_fruehere_abmahnung: "2026-06-03", anrede: "du" }).ergebnis.vorlage;
    for (const teil of ["Hallo [Vorname],", "wir müssen dich auf", "Wir haben dich bereits am 03.06.2026 wegen Unpünktlichkeit abgemahnt.",
      "dass du im Wiederholungsfall mit der Kündigung deines Arbeitsverhältnisses rechnen musst.", "deiner Personalakte", "Viele Grüße"]) expect(v).toContain(teil);
    expect(v).not.toMatch(/\b(Sie|Ihre|Ihres|Ihnen)\b/);
  });

  it("Prüfliste und Regeln für den Text aus Seite und KI-Vorgaben", () => {
    const e = rufe("abmahnung", basis).ergebnis;
    expect(e.pruefliste.length).toBeGreaterThanOrEqual(5);
    const liste = e.pruefliste.join("\n");
    for (const teil of ["Zeugen oder Belegen", "Hör die Person vorher", "Empfangsbestätigung", "Personalakte", "weisungsbefugt", "Betriebsrat"]) expect(liste).toContain(teil);
    const regeln = e.regeln.join("\n");
    for (const teil of ["Ein Sachverhalt pro Abmahnung", "Nur Tatsachen", "Keine Namen", "Erfinde keine Fundstelle", "Rückfrage"]) expect(regeln).toContain(teil);
  });

  it("Fallen je nach Fall: Krankheit nicht abmahnbar, frühere Abmahnung anderer Art, schwerer Verstoß mit Frist aus dem Register", () => {
    const krank = rufe("abmahnung", { verstoss: "Verspätete Krankmeldung oder fehlende AU-Bescheinigung", datum_vorfall: "2026-09-15" });
    expect(krank.fallen?.join(" ")).toContain("Krankheit ist nicht abmahnbar");
    expect(krank.fallen?.join(" ")).toContain("§ 5 EFZG");
    const andere = rufe("abmahnung", { ...basis, fruehere_abmahnung: "andere" });
    expect(andere.fallen?.join(" ")).toContain("gleichartigen Verstoßes");
    expect(andere.ergebnis.vorlage).not.toContain("bereits am");
    const a = rufe("abmahnung", basis);
    expect(a.fallen?.join(" ")).toContain(`Frist ${WERTE.fristloseKenntnisWochen.wert} Wochen ab Kenntnis (§ 626 Abs. 2 BGB)`);
    expect(a.fallen?.join(" ")).not.toContain("Krankheit");
  });

  it("Quellen, Hinweis auf Prüfung vor dem Versand, kein Gedankenstrich", () => {
    const a = rufe("abmahnung", basis);
    expect(a.quellen.map((q) => q.norm)).toEqual(expect.arrayContaining(["§ 314 Abs. 2 BGB", "§ 626 Abs. 2 BGB", "§ 83 BetrVG", "§ 5 EFZG"]));
    expect(a.quellen.find((q) => q.norm === "§ 626 Abs. 2 BGB")).toHaveProperty("status"); // aus dem Register, mit Prüfstand
    expect(a).not.toHaveProperty("lintelly");
    expect(a.hinweis).toBe(HINWEIS);
    for (const v of ["Unpünktlichkeit", "Unentschuldigtes Fehlen", "Verspätete Krankmeldung oder fehlende AU-Bescheinigung", "Arbeitsverweigerung",
      "Verstoß gegen eine Anweisung", "Verhalten gegenüber Kollegen oder Kunden", "Sonstiges"])
      for (const anrede of ["sie", "du"]) expect(JSON.stringify(rufe("abmahnung", { verstoss: v, datum_vorfall: "2026-09-15", anrede, fruehere_abmahnung: "gleich" }))).not.toMatch(STRICH);
  });

  it("kein Freitext über die Person: Schilderung und Name werden abgelehnt, Art des Verstoßes nur aus der Liste", () => {
    expect(() => rufe("abmahnung", { ...basis, schilderung: "Herr Muster kam zu spät" })).toThrow("Unbekanntes Feld: schilderung");
    expect(() => rufe("abmahnung", { ...basis, verstoss: "Herr Muster kam zu spät" })).toThrow("verstoss muss einer dieser Werte sein");
  });
});

describe("kuendigung_pflichtangaben", () => {
  const S = WERTE.kschgSchwelle.wert;
  const punkte = (a: { ergebnis: { pruefliste: { punkt: string; norm: string; text: string }[] } }) => a.ergebnis.pruefliste;

  it("6 Beschäftigte ohne Betriebsrat: Kleinbetrieb ohne KSchG, jede Formalie mit Norm, keine Anhörung", () => {
    const a = rufe("kuendigung_pflichtangaben", { beschaeftigte: 6 });
    expect(a.ergebnis.kschg_gilt).toBe(false);
    const p = punkte(a);
    for (const x of p) { expect(x.norm).toMatch(/§/); expect(x.text.length).toBeGreaterThan(20); }
    const normen = p.map((x) => x.norm).join(" | ");
    for (const n of ["§ 623 BGB", "§ 174 BGB", "§ 130 BGB", "§ 622 BGB", "§ 17 MuSchG", "§ 23 Abs. 1 KSchG", "§ 4 KSchG", "§ 38 Abs. 1 SGB III", "§ 312 SGB III", "§ 109 GewO", "§ 7 Abs. 4 BUrlG"]) expect(normen).toContain(n);
    expect(normen).not.toContain("BetrVG");
    const text = p.map((x) => x.text).join("\n");
    expect(text).toContain(`erst bei mehr als ${S}`);
    expect(text).toContain(`${WERTE.kleinbetriebKuendigung.hoechstBeschaeftigte} Beschäftigten`);
    expect(text).toContain(WERTE.kschgAltfall.beginnVor.slice(0, 4));
    expect(a.rechenweg?.join(" ")).toContain("Kein Betriebsrat");
  });

  it("Zahlen aus WERTE: Klagefrist, Meldung Arbeitsagentur, Fristen nach § 622 BGB", () => {
    const text = punkte(rufe("kuendigung_pflichtangaben", { beschaeftigte: 4 })).map((x) => x.text).join("\n");
    expect(text).toContain(`${WERTE.kschgKlageWochen.wert} Wochen`);
    expect(text).toContain(`${WERTE.arbeitsuchendMeldung.monate} Monate vor dem Ende`);
    expect(text).toContain(`${WERTE.arbeitsuchendMeldung.tage} Tagen`);
    expect(text).toContain("4 Wochen zum 15. oder zum Monatsende");
    expect(text).not.toContain(WERTE.kschgAltfall.beginnVor.slice(0, 4)); // bis 5 Beschäftigte kein Altfall möglich
  });

  it(`Grenze ${S}: bei ${S} gilt das KSchG nicht, darüber schon; mit Betriebsrat kommt die Anhörung dazu`, () => {
    expect(rufe("kuendigung_pflichtangaben", { beschaeftigte: S }).ergebnis.kschg_gilt).toBe(false);
    const a = rufe("kuendigung_pflichtangaben", { beschaeftigte: S + 0.5, betriebsrat: true });
    expect(a.ergebnis.kschg_gilt).toBe(true);
    const p = punkte(a);
    const br = p.find((x) => x.norm.includes("§ 102 BetrVG"));
    expect(br?.text).toContain("eine Woche");
    expect(p.map((x) => x.text).join("\n")).toContain(`länger als ${WERTE.kschgWartezeitMonate.wert} Monate`);
  });

  it("Quellen aus dem Register, Band Firmengröße, Hinweis vor dem Versand, kein Gedankenstrich, unbekanntes Feld abgelehnt", () => {
    const a = rufe("kuendigung_pflichtangaben", { beschaeftigte: 7, betriebsrat: true });
    expect(a.quellen.map((q) => q.norm)).toEqual(expect.arrayContaining(["§ 623 BGB", "§ 23 Abs. 1 KSchG", "§ 4 Satz 1 KSchG", "§ 102 BetrVG", "§ 109 GewO"]));
    expect(a).not.toHaveProperty("lintelly");
    expect(a.hinweis).toBe(HINWEIS);
    expect(JSON.stringify(a)).not.toMatch(STRICH);
    expect(JSON.stringify(rufe("kuendigung_pflichtangaben", { beschaeftigte: 15 }))).not.toMatch(STRICH);
    expect(() => rufe("kuendigung_pflichtangaben", { beschaeftigte: 7, name: "Max" })).toThrow("Unbekanntes Feld: name");
    expect(WERKZEUGE.find((w) => w.name === "kuendigung_pflichtangaben")?.baender?.({ beschaeftigte: 7 })).toEqual({ groesse: 7 });
  });
});
