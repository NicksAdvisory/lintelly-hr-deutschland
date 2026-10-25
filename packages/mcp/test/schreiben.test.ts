import { describe, expect, it } from "vitest";
import { HINWEIS } from "../src/antwort";
import { SCHREIBEN } from "../src/werkzeuge/schreiben";
import { rufe } from "./hilfe";

const STRICH = /[–—]| - /;

describe("arbeitszeugnis", () => {
  it("Gesamtnote wie die Website-Tests: 2, 2, 3, 3 ergibt gut, 2, 3, 3, 3 befriedigend, 1, 1, 1, 2 sehr gut", () => {
    const note = (b: number, f: number, w: number, e: number) =>
      rufe("arbeitszeugnis", { note_arbeitsbereitschaft: b, note_fachwissen: f, note_arbeitsweise: w, note_arbeitserfolg: e }).ergebnis.gesamtnote;
    expect(note(2, 2, 3, 3)).toMatchObject({ note: 2, name: "gut", formel: "stets zu unserer vollen Zufriedenheit" });
    expect(note(2, 3, 3, 3)).toMatchObject({ note: 3, name: "befriedigend" });
    expect(note(1, 1, 1, 2)).toMatchObject({ note: 1, formel: "stets zu unserer vollsten Zufriedenheit" });
  });

  it("Szenario 7: Zwischenzeugnis, sie ist super. Präsens, Formel sehr gut, Hinweis Dokument, § 109 GewO mit Link", () => {
    const a = rufe("arbeitszeugnis", {
      art: "zwischenzeugnis", beginn: "2023-04-01", zwischen_anlass: "wunsch",
      note_arbeitsbereitschaft: 1, note_fachwissen: 1, note_arbeitsweise: 1, note_arbeitserfolg: 1, note_verhalten: 1,
    });
    expect(a.ergebnis.titel).toBe("Zwischenzeugnis");
    const teile = a.ergebnis.aufbau.map((t: { teil: string }) => t.teil);
    expect(teile).toEqual(expect.arrayContaining(["Einleitung", "Tätigkeitsbeschreibung", "Arbeitserfolg", "Verhalten", "Anlass", "Schlussformel"]));
    const text = JSON.stringify(a.ergebnis);
    expect(text).toContain("ist seit dem 01.04.2023");
    expect(text).toContain("erledigt die [ihr/ihm] übertragenen Aufgaben stets zu unserer vollsten Zufriedenheit");
    expect(text).toContain("Dieses Zwischenzeugnis stellen wir auf Wunsch von [Frau/Herr Nachname] aus.");
    expect(a).not.toHaveProperty("lintelly");
    expect(a.hinweis).toBe(HINWEIS);
    expect(a.quellen[0]).toMatchObject({ norm: "§ 109 GewO", url: "https://www.gesetze-im-internet.de/gewo/__109.html" });
  });

  it("Führungsleistung zählt nur mit Führungsverantwortung: 2, 2, 2, 2 und Führung 5 ergibt 3", () => {
    const noten = { note_arbeitsbereitschaft: 2, note_fachwissen: 2, note_arbeitsweise: 2, note_arbeitserfolg: 2, note_fuehrung: 5 };
    expect(rufe("arbeitszeugnis", { ...noten, fuehrungsverantwortung: true }).ergebnis.gesamtnote.note).toBe(3);
    expect(rufe("arbeitszeugnis", noten).ergebnis.gesamtnote.note).toBe(2);
  });

  it("Endzeugnis: Datum ist der letzte Tag, Beendigungssatz nach Grund, Präteritum", () => {
    const a = rufe("arbeitszeugnis", { beginn: "2021-03-01", ende: "2026-09-30", grund: "eigener-wunsch" });
    expect(a.ergebnis).toMatchObject({ titel: "Arbeitszeugnis", ausstellungsdatum: "2026-09-30" });
    const text = JSON.stringify(a.ergebnis);
    expect(text).toContain("war vom 01.03.2021 bis zum 30.09.2026");
    expect(text).toContain("scheidet mit Ablauf des 30.09.2026 auf eigenen Wunsch aus unserem Unternehmen aus.");
  });

  it("einfaches Zeugnis: keine Gesamtnote, keine Leistung und kein Verhalten im Aufbau", () => {
    const a = rufe("arbeitszeugnis", { umfang: "einfach", note_arbeitsbereitschaft: 1 });
    expect(a.ergebnis.gesamtnote).toBeUndefined();
    const teile = a.ergebnis.aufbau.map((t: { teil: string }) => t.teil);
    expect(teile).not.toContain("Verhalten");
    expect(teile).not.toContain("Arbeitserfolg");
  });

  it("Note unter befriedigend: Beweislast mit BAG-Urteil in Fallen und Quellen", () => {
    const a = rufe("arbeitszeugnis", { note_arbeitsbereitschaft: 4, note_fachwissen: 4, note_arbeitsweise: 4, note_arbeitserfolg: 4 });
    expect(a.fallen?.join(" ")).toContain("9 AZR 584/13");
    expect(a.quellen.map((q) => q.url)).toContain("https://www.bundesarbeitsgericht.de/entscheidung/9-azr-584-13/");
  });

  it("Ende vor Beginn wird genannt", () => {
    expect(rufe("arbeitszeugnis", { beginn: "2026-05-01", ende: "2026-04-01" }).fallen?.join(" ")).toContain("Das Ende liegt vor dem Beginn.");
  });

  it("Felder für Namen gibt es nicht", () => {
    expect(() => rufe("arbeitszeugnis", { name: "Anna" })).toThrow(/Unbekanntes Feld/);
  });
});

describe("stellenanzeige_check", () => {
  const funde = (t: string) => rufe("stellenanzeige_check", { anzeigentext: t }).ergebnis.funde as { wort: string | null; merkmal: string; grund: string; besser: string }[];

  it("Beispiel der Seite: Muttersprache, belastbar und junges Team, je mit Merkmal, Grund und besserer Formulierung", () => {
    const f = funde("Bürokauffrau (m/w/d)\nKaufmännische Ausbildung\nDeutsch Muttersprache\nbelastbar\n30 Tage Urlaub\nJobrad\njunges Team");
    expect(f.map((x) => x.wort)).toEqual(["Muttersprache", "belastbar", "junges"]);
    expect(f[2]).toMatchObject({ merkmal: "Alter", besser: expect.stringContaining("Zusammenarbeit") });
    expect(f[0]).toMatchObject({ merkmal: "Ethnische Herkunft", grund: expect.stringContaining("Herkunft") });
  });

  it("(m/w) ohne d ist ein Fund zum Geschlecht, (m/w/d) nicht", () => {
    expect(funde("Elektroniker (m/w) gesucht")).toEqual([expect.objectContaining({ wort: "(m/w)", merkmal: "Geschlecht" })]);
    expect(funde("Elektroniker (m/w/d) gesucht")).toEqual([]);
  });

  it("ganz ohne Geschlechtszusatz: Fund ohne Wort", () => {
    expect(funde("Elektroniker gesucht")).toEqual([expect.objectContaining({ wort: null, merkmal: "Geschlecht" })]);
  });

  it("ein Fund je Wort, Groß- und Kleinschreibung zusammengefasst", () => {
    expect(funde("Jung und dynamisch (m/w/d), ein junges Team, jung geblieben").map((x) => x.wort)).toEqual(["Jung", "dynamisch", "junges"]);
  });

  it("der Anzeigentext kommt nie zurück, nur die gefundenen Wörter", () => {
    const satz = "Wir bauen Ladeinfrastruktur in Offenbach";
    const a = rufe("stellenanzeige_check", { anzeigentext: `${satz} (m/w/d), junges Team` });
    expect(JSON.stringify(a)).not.toContain(satz);
    expect(JSON.stringify(a)).toContain("junges");
  });

  it("nennt die Teile einer guten Anzeige und die AGG-Normen mit Link", () => {
    const a = rufe("stellenanzeige_check", { anzeigentext: "Koch (m/w/d)" });
    expect(a.ergebnis.aufbau.join(" ")).toContain("(m/w/d)");
    expect(a.ergebnis.aufbau.length).toBeGreaterThanOrEqual(6);
    expect(a.quellen.map((q) => q.url)).toContain("https://www.gesetze-im-internet.de/agg/__11.html");
    expect(a).not.toHaveProperty("lintelly");
  });

  it("Anzeigentext ist Pflicht und höchstens 3000 Zeichen lang", () => {
    expect(() => rufe("stellenanzeige_check", {})).toThrow(/Pflichtfeld fehlt/);
    expect(() => rufe("stellenanzeige_check", { anzeigentext: "x".repeat(3001) })).toThrow(/zu lang/);
  });
});

describe("interviewfragen_check", () => {
  it("Prüfliste der Seite: Schwangerschaft, Religion, Gewerkschaft, Gesundheit, Herkunft, Alter, sexuelle Identität, Vorstrafen, Vermögen, dazu bisheriges Gehalt", () => {
    const a = rufe("interviewfragen_check", {});
    const themen = a.ergebnis.nicht_fragen.map((x: { thema: string }) => x.thema);
    expect(themen).toEqual([
      "Schwangerschaft und Familienplanung", "Religion und Weltanschauung", "Gewerkschaftszugehörigkeit", "Krankheiten und Behinderung",
      "Herkunft und Staatsangehörigkeit", "Alter", "Sexuelle Identität, Partnerschaft, Kinder", "Vorstrafen", "Vermögen und Schulden", "Bisheriges Gehalt",
    ]);
    expect(a.ergebnis.nicht_fragen[0].grund).toContain("§§ 1, 7 AGG");
    expect(a.ergebnis.erlaubt.join(" ")).toMatch(/Arbeitserlaubnis/);
    expect(a.ergebnis.erlaubt.join(" ")).toMatch(/Gehaltsvorstellung/);
  });

  it("Methode: zwei Fragen und eine Nachfrage je Anforderung, Anker 1, 3 und 5, belastbar nie als Gesundheit", () => {
    const m = rufe("interviewfragen_check", {}).ergebnis.methode.join(" ");
    expect(m).toContain("Je Anforderung 2 Fragen und 1 Nachfrage");
    expect(m).toContain('"Die Person"');
    expect(m).toContain("nie Gesundheit");
  });

  it("Seniorität Ausbildung: Situationen aus Schule, Nebenjob, Verein oder Praktikum; Telefon: kürzerer Einstieg", () => {
    const a = rufe("interviewfragen_check", { senioritaet: "ausbildung", form: "telefon_video" });
    expect(a.ergebnis.hinweis_senioritaet).toContain("Schule, Nebenjob, Verein oder Praktikum");
    expect(a.ergebnis.ablauf.join(" ")).toContain("kürzerer Einstieg");
    expect(rufe("interviewfragen_check", { senioritaet: "berufserfahren" }).ergebnis.hinweis_senioritaet).toBeUndefined();
  });

  it("Quellen: AGG und Koalitionsfreiheit mit amtlichem Link, kein Hinweis auf Lintelly", () => {
    const a = rufe("interviewfragen_check", {});
    expect(a.quellen.map((q) => q.url)).toEqual(expect.arrayContaining([
      "https://www.gesetze-im-internet.de/agg/__1.html", "https://www.gesetze-im-internet.de/agg/__7.html", "https://www.gesetze-im-internet.de/gg/art_9.html",
    ]));
    expect(a).not.toHaveProperty("lintelly");
  });

  it("kein Freitext: unbekanntes Feld und unbekannte Seniorität werden abgelehnt", () => {
    expect(() => rufe("interviewfragen_check", { frage: "Planen Sie Kinder?" })).toThrow(/Unbekanntes Feld/);
    expect(() => rufe("interviewfragen_check", { senioritaet: "junior" })).toThrow(/einer dieser Werte/);
  });
});

describe("mitarbeitergespraech_leitfaden", () => {
  type Phase = { phase: string; ziel: string; fragen: string[] };
  const fragen = (a: { ergebnis: { ablauf: Phase[] } }) => a.ergebnis.ablauf.flatMap((p) => p.fragen);

  it("vier Gesprächsarten der Seite, je mit Ablauf, offenen Fragen und Protokoll-Raster", () => {
    for (const art of ["kritik", "probezeit", "jahr", "rueckkehr"]) {
      const a = rufe("mitarbeitergespraech_leitfaden", { art });
      expect(a.ergebnis.ablauf.length, art).toBeGreaterThanOrEqual(4);
      expect(fragen(a).length, art).toBeGreaterThan(0);
      expect(a.ergebnis.protokoll, art).toEqual(expect.arrayContaining(["Datum", "Teilnehmende", "Anlass", "Vereinbarungen mit Verantwortlichen und Termin", "Folgetermin"]));
      expect(a, art).not.toHaveProperty("lintelly");
    }
  });

  it("Kritikgespräch: Beobachtung statt Bewertung, Protokoll mit Beobachtung und Erwartung, keine Abmahnung", () => {
    const a = rufe("mitarbeitergespraech_leitfaden", { art: "kritik" });
    expect(a.ergebnis.titel).toBe("Kritikgespräch");
    expect(a.ergebnis.protokoll).toEqual(expect.arrayContaining(["Konkrete Beobachtung mit Datum", "Erwartung"]));
    expect(JSON.stringify(a.ergebnis.ablauf)).toContain("an elf Tagen nach 8 Uhr");
    expect(a.fallen?.join(" ")).toContain("Ein Kritikgespräch ist keine Abmahnung.");
  });

  it("Rückkehrgespräch: nie nach Diagnose fragen, BEM nach 6 Wochen in 12 Monaten mit § 167 Abs. 2 SGB IX", () => {
    const a = rufe("mitarbeitergespraech_leitfaden", { art: "rueckkehr" });
    for (const f of fragen(a)) expect(f).not.toMatch(/diagnose|ursache|behandlung|krank/i);
    expect(a.fallen?.join(" ")).toContain("länger als 6 Wochen arbeitsunfähig");
    expect(a.quellen).toEqual(expect.arrayContaining([expect.objectContaining({ url: "https://www.gesetze-im-internet.de/sgb_9_2018/__167.html" })]));
  });

  it("Probezeitgespräch: Kündigungsfrist 2 Wochen aus dem Register (§ 622 Abs. 3 BGB)", () => {
    const a = rufe("mitarbeitergespraech_leitfaden", { art: "probezeit" });
    expect(a.fallen?.join(" ")).toContain("2 Wochen (§ 622 Abs. 3 BGB)");
    expect(a.quellen.map((q) => q.norm)).toContain("§ 622 Abs. 3 BGB");
  });

  it("Betriebsrat: § 82 Abs. 2 BetrVG bei Probezeit und Jahr, § 87 Abs. 1 Nr. 1 BetrVG bei Rückkehr, ohne Betriebsrat keins", () => {
    const norm = (art: string, betriebsrat?: boolean) => rufe("mitarbeitergespraech_leitfaden", { art, ...(betriebsrat === undefined ? {} : { betriebsrat }) }).quellen.map((q) => q.norm);
    expect(norm("jahr", true)).toContain("§ 82 Abs. 2 BetrVG");
    expect(norm("probezeit", true)).toContain("§ 82 Abs. 2 BetrVG");
    expect(norm("rueckkehr", true)).toContain("§ 87 Abs. 1 Nr. 1 BetrVG");
    expect(norm("jahr").join(" ")).not.toContain("BetrVG");
  });

  it("Gesprächsart ist Pflicht und kommt aus der Liste der Seite", () => {
    expect(() => rufe("mitarbeitergespraech_leitfaden", {})).toThrow(/Pflichtfeld fehlt/);
    expect(() => rufe("mitarbeitergespraech_leitfaden", { art: "trennung" })).toThrow(/einer dieser Werte/);
  });
});

describe("nachweis_pflichtangaben", () => {
  type Punkt = { nr: number; frist: string; faellig_am: string | null; entfaellt_wenn?: string; stand?: string; ueberfaellig?: boolean };
  const liste = (e: Record<string, unknown>) => rufe("nachweis_pflichtangaben", e).ergebnis.pflichtangaben as Punkt[];
  const nr = (xs: Punkt[]) => xs.map((x) => x.nr);
  // Beispiel der Seite (arbeitsvertrag-check.tsx BEISPIEL)
  const BEISPIEL = Object.entries({ 1: "drin", 2: "drin", 3: "entfaellt", 4: "drin", 5: "drin", 6: "drin", 7: "drin", 8: "drin", 9: "entfaellt", 10: "fehlt", 11: "drin", 12: "entfaellt", 13: "entfaellt", 14: "fehlt", 15: "entfaellt" })
    .map(([n, stand]) => ({ nr: Number(n), stand }));

  it("ohne Angaben: alle 15 Pflichtangaben mit Frist ab Beginn (erster Arbeitstag, 7. Kalendertag, 1 Monat)", () => {
    const l = liste({ beginn: "2026-12-01" });
    expect(nr(l)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(nr(l.filter((p) => p.faellig_am === "2026-12-01"))).toEqual([1, 7, 8]);
    expect(nr(l.filter((p) => p.faellig_am === "2026-12-08"))).toEqual([2, 3, 4, 5, 6, 9, 10]);
    expect(nr(l.filter((p) => p.faellig_am === "2027-01-01"))).toEqual([11, 12, 13, 14, 15]);
    expect(l[0].frist).toBe("Erster Arbeitstag");
    expect(nr(l.filter((p) => p.entfaellt_wenn))).toEqual([3, 6, 9, 10, 12, 13, 15]);
    expect(l.some((p) => p.stand)).toBe(false);
  });

  it("Quellen aus dem Register: Fristen § 2 Abs. 1 Satz 4 NachwG, Bußgeld 2.000 Euro nach § 4 Abs. 2 NachwG", () => {
    const a = rufe("nachweis_pflichtangaben", {});
    expect(a.quellen.map((q) => q.norm)).toEqual(expect.arrayContaining(["§ 2 Abs. 1 Satz 4 NachwG", "§ 4 Abs. 2 NachwG"]));
    expect(a.quellen.find((q) => q.norm.startsWith("§ 2 Abs. 1"))?.url).toBe("https://www.gesetze-im-internet.de/nachwg/__2.html");
    expect(a.fallen?.join(" ")).toContain("bis 2.000 Euro Bußgeld je Fall (§ 4 NachwG)");
    expect(a.ergebnis.formregeln.join(" ")).toContain("Seit dem 1. Januar 2025 darfst du den Nachweis auch in Textform erteilen");
    expect(a).not.toHaveProperty("lintelly");
  });

  it("Beispiel der Seite: Nr. 10 und 14 fehlen, 12 von 14 erfüllt, Lücken schließen", () => {
    const a = rufe("nachweis_pflichtangaben", { beginn: "2026-11-02", form: "textform", empfangsbestaetigung: true, angaben: BEISPIEL });
    expect(a.ergebnis).toMatchObject({ ampel: "Lücken schließen", erfuellt: "12 von 14", fehlend: [10, 14] });
    expect(a.ergebnis.pflichtangaben.find((p: Punkt) => p.nr === 3).stand).toBe("entfaellt");
  });

  it("Frist abgelaufen: überfällig und Handlungsbedarf", () => {
    const a = rufe("nachweis_pflichtangaben", { beginn: "2026-09-01", form: "papier", angaben: [{ nr: 7, stand: "fehlt" }] });
    expect(a.ergebnis.ampel).toBe("Handlungsbedarf");
    expect(a.ergebnis.pflichtangaben.find((p: Punkt) => p.nr === 7)).toMatchObject({ stand: "fehlt", ueberfaellig: true });
    expect(a.ergebnis.pflichtangaben.find((p: Punkt) => p.nr === 2)).toMatchObject({ stand: "offen" });
  });

  it("entfällt gilt nur für Punkte, die nur bei Vereinbarung gelten; Nr. 3 entfällt nicht bei Befristung", () => {
    const a = rufe("nachweis_pflichtangaben", { befristet: true, form: "papier", angaben: [{ nr: 7, stand: "entfaellt" }, { nr: 3, stand: "entfaellt" }, { nr: 6, stand: "entfaellt" }] });
    expect(a.ergebnis.fehlend).toEqual(expect.arrayContaining([3, 7]));
    expect(a.ergebnis.fehlend).not.toContain(6);
  });

  it("Form: Textform in Papierpflicht-Branche und Befristung per PDF sind rot", () => {
    const titel = (e: Record<string, unknown>) => rufe("nachweis_pflichtangaben", e).ergebnis.form.map((f: { titel: string }) => f.titel);
    expect(titel({ form: "textform", papierpflicht_branche: true })).toContain("Textform hier nicht erlaubt");
    expect(titel({ form: "textform", befristet: true, empfangsbestaetigung: true })).toEqual(["Befristung unwirksam"]);
    expect(titel({ form: "textform" })).toEqual(["Empfangsnachweis fehlt"]);
    expect(titel({ form: "nichts" })).toContain("Kein schriftlicher Nachweis");
    expect(rufe("nachweis_pflichtangaben", { form: "nichts", angaben: [{ nr: 1, stand: "drin" }] }).ergebnis.ampel).toBe("Handlungsbedarf");
  });

  it("Altvertrag vor dem 01.08.2022: Nachweis nur auf Verlangen, keine Fälligkeitsdaten", () => {
    const a = rufe("nachweis_pflichtangaben", { beginn: "2020-01-01", angaben: [{ nr: 7, stand: "fehlt" }] });
    expect(a.ergebnis.altvertrag).toBe(true);
    expect(a.ergebnis.pflichtangaben.every((p: Punkt) => p.faellig_am === null && !p.ueberfaellig)).toBe(true);
    expect(a.fallen?.join(" ")).toContain("§ 5 NachwG");
  });

  it("Angaben nur als Nummer und Stand", () => {
    expect(() => rufe("nachweis_pflichtangaben", { angaben: [{ nr: 16, stand: "drin" }] })).toThrow(/außerhalb/);
    expect(() => rufe("nachweis_pflichtangaben", { angaben: [{ nr: 1, stand: "drin", text: "Max Muster" }] })).toThrow(/Unbekanntes Feld/);
  });
});

describe("alle Schreib-Werkzeuge", () => {
  const beispiele: Record<string, Record<string, unknown>> = {
    arbeitszeugnis: { art: "zwischenzeugnis", note_arbeitsbereitschaft: 4, note_verhalten: 5 },
    stellenanzeige_check: { anzeigentext: "Junges Team sucht Koch (m/w), Foto erwünscht, max. 35 Jahre" },
    interviewfragen_check: { senioritaet: "ausbildung", form: "vor_ort" },
    mitarbeitergespraech_leitfaden: { art: "rueckkehr", betriebsrat: true },
    nachweis_pflichtangaben: { beginn: "2020-01-01", befristet: true, form: "nichts", angaben: [{ nr: 3, stand: "fehlt" }] },
  };
  it("fünf Werkzeuge, kein Gedankenstrich in Titel, Beschreibung und Antwort", () => {
    expect(SCHREIBEN.map((w) => w.name)).toEqual(["arbeitszeugnis", "stellenanzeige_check", "interviewfragen_check", "mitarbeitergespraech_leitfaden", "nachweis_pflichtangaben"]);
    for (const w of SCHREIBEN) {
      expect(`${w.titel} ${w.beschreibung}`, w.name).not.toMatch(STRICH);
      expect(JSON.stringify(rufe(w.name, beispiele[w.name] ?? {})), w.name).not.toMatch(STRICH);
    }
  });
});
