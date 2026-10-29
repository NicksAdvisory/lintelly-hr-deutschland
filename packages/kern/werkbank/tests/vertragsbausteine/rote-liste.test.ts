/**
 * Rote Liste (lib/vertragsbausteine/rot.ts, 29.10.2026): je Klauseltyp mindestens drei echte Formulierungen in anderer Wortstellung, Beugung
 * und mit Ersatzwörtern, die anschlagen müssen; dazu alle Bausteintexte des Katalogs in allen Auswahlvarianten, die nie anschlagen dürfen
 * (die sicheren Alternativen der Liste eingeschlossen). Die ersten drei Fälle sind die, die am 29.10.2026 im MCP-Werkzeug klausel_pruefen fehlten.
 */
import { describe, expect, it } from "vitest";
import { BAUSTEINE } from "@/lib/vertragsbausteine/katalog";
import { findeGesperrte, ROTE_LISTE, vereinheitlicht } from "@/lib/vertragsbausteine/rot";
import type { Feld, Werte } from "@/lib/vertragsbausteine/typen";

const ids = (t: string) => findeGesperrte(t).map((r) => r.id);

const TREFFER: Record<string, string[]> = {
  R1: [
    "Der Arbeitnehmer verpflichtet sich, für die Dauer von zwei Jahren nach Beendigung des Arbeitsverhältnisses nicht für ein Konkurrenzunternehmen tätig zu werden.",
    "Nach seinem Ausscheiden wird der Mitarbeiter ein Jahr lang keine Tätigkeit für Wettbewerber des Arbeitgebers aufnehmen.",
    "Für ein Jahr nach dem Ende des Arbeitsverhältnisses ist es der Arbeitnehmerin untersagt, Kunden des Arbeitgebers zu betreuen.",
    "Es gilt ein nachvertragliches Wettbewerbsverbot von zwölf Monaten. Eine Karenzentschädigung wird nicht gezahlt.",
    "Für die Dauer des nachvertraglichen Wettbewerbsverbots zahlt der Arbeitgeber eine Karenzentschädigung von 25 % der zuletzt bezogenen Vergütung.",
    "Ist das Wettbewerbsverbot unwirksam, gilt es im gesetzlich zulässigen Umfang als vereinbart.",
  ],
  R2: [
    "Der Arbeitnehmer gibt sein Ehrenwort, nach dem Ausscheiden nicht für die Konkurrenz zu arbeiten.",
    "Das Wettbewerbsverbot gilt auch, wenn die Person bei Vertragsschluss minderjährig ist.",
    "Die Eltern des Auszubildenden übernehmen die Verpflichtung aus dem Wettbewerbsverbot.",
  ],
  R3: [
    "Die Zahlung des Weihnachtsgeldes erfolgt freiwillig und unter dem Vorbehalt des jederzeitigen Widerrufs.",
    "Es handelt sich um eine freiwillige, jederzeit widerrufliche Leistung.",
    "Der Arbeitgeber behält sich vor, die Zulage jederzeit zu widerrufen; die Zahlung erfolgt freiwillig.",
  ],
  R4: [
    "Mit dem vereinbarten Gehalt sind etwaige Überstunden abgegolten.",
    "Etwaige Überstunden sind mit dem Gehalt abgegolten.",
    "Durch die vereinbarte Vergütung ist eine etwaige Mehrarbeit vollständig abgegolten.",
    "Überstunden werden nicht gesondert vergütet.",
    "Die monatliche Bruttovergütung deckt sämtliche Überstunden ab.",
  ],
  R5: [
    "Bricht der Auszubildende die Ausbildung ab, hat er die Ausbildungskosten zurückzuzahlen.",
    "Für jeden Verstoß gegen den Ausbildungsvertrag zahlt die Auszubildende eine Vertragsstrafe von 500 Euro.", // kein-recht: Beispieltext im Test
    "Die Kosten der Berufsausbildung trägt der Auszubildende zur Hälfte.",
  ],
  R6: [
    "Alle beiderseitigen Ansprüche aus dem Arbeitsverhältnis verfallen, wenn sie nicht innerhalb von drei Monaten nach Fälligkeit schriftlich geltend gemacht werden.", // kein-recht: Klausel im Test
    "Ansprüche aus dem Arbeitsverhältnis erlöschen, wenn sie nicht binnen eines Monats nach Fälligkeit in Textform geltend gemacht werden. Ausgenommen sind Ansprüche aus dem Mindestlohngesetz und aus Vorsatz.",
    "Sämtliche Ansprüche beider Seiten sind innerhalb von drei Monaten nach Fälligkeit in Textform geltend zu machen, sonst verfallen sie.", // kein-recht: Klausel im Test
    "Ansprüche des Arbeitnehmers verfallen, wenn sie nicht innerhalb von sechs Monaten in Textform geltend gemacht werden. Das gilt nicht für den Mindestlohn und für Vorsatz.", // kein-recht: Klausel im Test
    "Es gilt eine Ausschlussfrist von vier Wochen.", // kein-recht: Klausel im Test
  ],
  R7: [
    "Der Arbeitnehmer verzichtet auf Entgeltfortzahlung im Krankheitsfall.",
    "Auf den gesetzlichen Mindesturlaub wird verzichtet.",
    "Krankheitstage werden nicht bezahlt.",
    "Die Mitarbeiterin hat keinen Anspruch auf ein Arbeitszeugnis.",
    "Der Urlaub ist mit dem Stundenlohn abgegolten.",
  ],
  R8: [
    "Die Provision wird nur gezahlt, wenn das Arbeitsverhältnis am Auszahlungstag ungekündigt besteht.",
    "Der Zielbonus entfällt, wenn der Mitarbeiter vor dem 31.12. ausscheidet.",
    "Anspruch auf die Tantieme hat nur, wer am 31.12. des Geschäftsjahres in einem ungekündigten Arbeitsverhältnis steht.",
    "Scheidet der Arbeitnehmer vor dem Auszahlungstermin aus, besteht kein Anspruch auf das 13. Gehalt.",
  ],
  R9: [
    "Änderungen bedürfen der Schriftform. Dies gilt auch für die Aufhebung dieser Schriftformklausel.",
    "Das Schriftformerfordernis kann nur durch eine schriftliche Vereinbarung aufgehoben werden.",
    "Änderungen und Ergänzungen bedürfen der Schriftform; das gilt auch für die Änderung dieser Klausel.",
    "Auf das Schriftformerfordernis kann nur schriftlich verzichtet werden.",
  ],
  R10: [
    "Streitigkeiten aus dem Arbeitsverhältnis entscheidet ein Schiedsgericht.",
    "Die Parteien vereinbaren eine Schiedsvereinbarung für alle Streitigkeiten.",
    "Über Streitigkeiten entscheidet ein Schiedsrichter unter Ausschluss des ordentlichen Rechtswegs.",
  ],
  R11: [
    "Der Arbeitnehmer verzichtet schon jetzt auf die Erhebung einer Kündigungsschutzklage.",
    "Die Mitarbeiterin wird gegen eine Kündigung keine Klage erheben.",
    "Der Arbeitnehmer bestätigt, den Vertrag gelesen und verstanden zu haben.",
    "Die Parteien erklären, dass alle Bedingungen im Einzelnen ausgehandelt wurden.",
  ],
  R12: [
    "Dem Arbeitnehmer ist die Mitgliedschaft in einer Gewerkschaft untersagt.",
    "Der Mitarbeiter verpflichtet sich, keiner Gewerkschaft beizutreten.",
    "Die Arbeitnehmerin darf nicht für den Betriebsrat kandidieren.",
    "Der Arbeitnehmer darf Verstöße nicht an Behörden melden.",
    "Jede öffentliche Äußerung über den Arbeitgeber ist untersagt.",
    "Die Verschwiegenheit gilt auch gegenüber Behörden.",
  ],
  R13: [
    "Der Arbeitgeber kann den Arbeitnehmer in eine andere Gesellschaft des Konzerns versetzen.",
    "Der Arbeitgeber ist berechtigt, die Mitarbeiterin auch bei verbundenen Unternehmen einzusetzen.",
    "Der Mitarbeiter ist verpflichtet, auf Anweisung auch für Tochtergesellschaften tätig zu werden.",
    "Eine Abordnung an die Muttergesellschaft ist jederzeit möglich.",
  ],
  R14: [
    "Für den Arbeitnehmer verlängert sich die Kündigungsfrist auf sechs Monate zum Quartalsende.",
    "Die Kündigungsfrist gilt nur für den Arbeitnehmer.",
    "Der Arbeitnehmer kann nur mit einer längeren Frist von sechs Monaten kündigen, für den Arbeitgeber gelten die gesetzlichen Fristen.",
  ],
  R15: [
    "Die Schutzkleidung zahlt der Mitarbeiter selbst.",
    "Die Kosten für die persönliche Schutzausrüstung trägt der Arbeitnehmer.",
    "Sicherheitsschuhe beschafft die Arbeitnehmerin auf eigene Kosten.",
    "Die Kosten der vorgeschriebenen Schulung werden vom Gehalt abgezogen.",
  ],
  R16: [
    "Das Arbeitsverhältnis endet automatisch, wenn die Arbeitnehmerin schwanger wird.",
    "Bei einer Arbeitsunfähigkeit von mehr als sechs Wochen endet das Arbeitsverhältnis, ohne dass es einer Kündigung bedarf.",
    "Der Vertrag endet mit Beginn der Elternzeit.",
    "Die Wahl in den Betriebsrat gilt als auflösende Bedingung.",
  ],
  R17: [
    "Der Arbeitnehmer haftet unabhängig vom Verschulden.",
    "Der Mitarbeiter haftet für alle von ihm verursachten Schäden in voller Höhe.",
    "Die Arbeitnehmerin ersetzt dem Arbeitgeber jeden Schaden, den sie bei der Arbeit verursacht.",
    "Für Schäden am Dienstwagen haftet der Arbeitnehmer auch ohne Verschulden.",
  ],
};

describe("Rote Liste: echte Formulierungen schlagen an", () => {
  it("jeder der 17 Typen hat mindestens drei Formulierungen", () => {
    expect(Object.keys(TREFFER)).toEqual(ROTE_LISTE.map((r) => r.id));
    expect(Object.values(TREFFER).every((l) => l.length >= 3)).toBe(true);
  });
  it.each(Object.entries(TREFFER).flatMap(([id, l]) => l.map((t) => [id, t])))("%s: „%s“", (id, t) => expect(ids(t)).toContain(id));
});

describe("Rote Liste: sichere Texte bleiben frei", () => {
  /** Jeder Baustein in jeder Auswahl und Ja/Nein-Variante, Pflichtfelder mit Beispielwerten. */
  const beispiel = (f: Feld): string => {
    if (f.standard !== undefined) return f.standard;
    const n = (lo: number, hi: number, x: number) => String(Math.max(f.min ?? lo, Math.min(f.max ?? hi, x)));
    return { text: "Frankfurt am Main", lang: "Vertrieb von Software an Unternehmenskunden", zahl: n(1, 12, 6), betrag: "1.000", prozent: n(1, 50, 5), datum: "2026-12-31",
      auswahl: f.optionen?.[0] ?? "", mehrfach: (f.optionen ?? []).join("|"), janein: "ja", staffel: JSON.stringify([{ ab: 0, bis: 30000, satz: 4 }, { ab: 30000, bis: null, satz: 6 }]) }[f.typ];
  };
  const texte = BAUSTEINE.flatMap((b) => {
    const basis: Werte = Object.fromEntries(b.felder.filter((f) => f.id !== "ergaenzung").map((f) => [f.id, beispiel(f)]));
    const varianten = [basis, ...b.felder.flatMap((f) => (f.typ === "janein" ? ["ja", "nein"] : f.typ === "auswahl" ? f.optionen ?? [] : []).map((o) => ({ ...basis, [f.id]: o })))];
    return varianten.map((w) => ({ id: b.id, text: b.text(w, { vorname: "Paul", gehalt: 4500, wochenstunden: 40, eintritt: "2026-11-01", heute: "2026-10-10", auswahl: { [b.id]: w } }) }));
  });

  it("alle Bausteintexte (mit den Alternativen der roten Liste) ohne Treffer", () => {
    expect(texte.length).toBeGreaterThan(500);
    expect(ROTE_LISTE.flatMap((r) => r.bausteine).every((id) => texte.some((x) => x.id === id))).toBe(true);
    expect(texte.map((x) => ({ id: x.id, treffer: ids(x.text) })).filter((x) => x.treffer.length)).toEqual([]);
  });

  it.each([
    "Provision auf Neukunden mit monatlicher Abrechnung", "Der Arbeitsort ist Frankfurt am Main.", "Die Erfindervergütung ist mit dem Gehalt abgegolten.",
    "Während des Arbeitsverhältnisses ist jede Tätigkeit für ein Konkurrenzunternehmen untersagt.",
    "Nach Beendigung des Arbeitsverhältnisses gibt der Arbeitnehmer alle Unterlagen zurück.",
    "Mit dem Monatsgehalt sind bis zu zehn Überstunden im Monat abgegolten.",
    "Überstunden werden nicht ausbezahlt, sondern durch Freizeit ausgeglichen.",
    "Auf den gesetzlichen Mindesturlaub kann nicht verzichtet werden.",
    "Die Kündigungsfrist verlängert sich für beide Seiten auf drei Monate zum Monatsende.",
    "Die Schutzkleidung trägt der Mitarbeiter während der Arbeit.",
    "Bei Vorsatz und grober Fahrlässigkeit haftet der Arbeitnehmer in voller Höhe.",
    "Wie lange muss eine Ausschlussfrist mindestens sein?",
  ])("frei: „%s“", (t) => expect(ids(t)).toEqual([]));

  it("eine Frage ist keine Klausel, ein ausdrücklich gesperrter Inhalt in der Frage schon", () => {
    expect(ids("Verlängert sich die Kündigungsfrist des Mitarbeiters nach fünf Jahren?")).toEqual([]);
    expect(ids("Kann ich ein Wettbewerbsverbot ohne Karenzentschädigung vereinbaren?")).toContain("R1");
  });

  it("Vereinheitlichung: Abkürzungen und Zahlen ohne Punkt, damit Sätze nicht zerfallen", () => {
    expect(vereinheitlicht("Gem. § 3 Abs. 3 ArbSchG, z. B. 1.000 € und das 13. Gehalt.")).toBe("gem. § 3 abs 3 arbschg, z b 1000 € und das 13 gehalt.");
  });
});
