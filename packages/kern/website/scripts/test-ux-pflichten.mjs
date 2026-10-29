// Tests für die UX-Funde aus dem Review vom 28.10.2026 (bericht.md, A7, A8, A13, A14, B1/B2).
// Aufruf: node scripts/test-ux-pflichten.mjs (Node 22.18+ mit Type-Stripping)
import { register } from "node:module";
register("data:text/javascript," + encodeURIComponent(`export async function resolve(s, c, n) { try { return await n(s, c); } catch (e) { if (s.startsWith(".")) return n(s + ".ts", c); throw e; } }`), import.meta.url);
const assert = (await import("node:assert/strict")).default;
const A = await import("../components/tools/aufbewahrungsfristen-logik.ts");
const S = await import("../components/tools/schwellenwerte-logik.ts");
const P = await import("../components/tools/pausen-logik.ts");
const B = await import("../components/tools/bem-logik.ts");
const { toDay } = await import("../components/tools/datum.ts");
const SE = await import("../components/tools/sensibel.ts");

let n = 0;
const rot = [];
const t = (name, fn) => {
  try { fn(); n++; console.log("ok", String(n).padStart(2), name); }
  catch (e) { rot.push(name); console.log("ROT", name, "\n   ", String(e.message).split("\n")[0]); }
};
const D = (s) => new Date(s + "T00:00:00Z");
const iso = (d) => d && d.toISOString().slice(0, 10);

/* ---------- A7 Aufbewahrung ---------- */
const sv = A.DOKUMENTE.find((d) => d.id === "sv");
t("A7: Zeitraum bis nach dem Tag der Prüfung ist ein Fehler mit richtigem Text", () => {
  const r = A.pruefungLesen(D("2025-12-31"), D("2024-05-10"));
  assert.equal(r.pruefung, null);
  assert.match(r.fehler, /kann nicht nach dem Tag der Prüfung enden/);
});
t("A7: Zeitraum vor dem Tag der Prüfung ist in Ordnung, beide leer auch", () => {
  assert.equal(A.pruefungLesen(D("2023-12-31"), D("2024-05-10")).fehler, undefined);
  assert.deepEqual(A.pruefungLesen(null, null), { pruefung: null });
});
t("A7: nur ein Prüfdatum ist ein Fehler, keine Behauptung ohne Prüfung", () => assert.ok(A.pruefungLesen(null, D("2024-05-10")).fehler));
t("A7: SV 31.03.2019, geprüft bis 31.12.2023: verbindlich ist die steuerliche Frist bis 31.12.2027", () => {
  const f = A.verbindlicheFrist(sv, D("2019-03-31"), { bis: D("2023-12-31"), am: D("2024-05-10") });
  assert.equal(iso(f.bis), "2027-12-31"); assert.equal(iso(f.ab), "2028-01-01"); assert.equal(iso(f.sv.ab), "2026-01-01");
});
t("A7: SV-Frist später als die steuerliche bleibt die SV-Frist", () => {
  const f = A.verbindlicheFrist(sv, D("2015-03-31"), { bis: D("2023-12-31"), am: D("2024-05-10") });
  assert.equal(iso(f.bis), "2025-12-31"); assert.equal(f.sv, undefined);
});

/* ---------- A8 Schwellenwerte ---------- */
const BSP = { koepfe: "32", bis10: "4", bis20: "3", bis30: "4", azubis: "2", plaetze18: "", schwerbehindert: "1", daten: "18" };
t("A8: 8 Köpfe getippt passen die Beispiel-Teilzeit an, Ergebnis kommt", () => {
  const f = S.setzeKoepfe(BSP, 8);
  assert.equal(S.pruefeSwEingabe(f, false).ok, true);
  assert.equal(Number(f.bis10) + Number(f.bis20) + Number(f.bis30), 8);
});
t("A8: 0 Köpfe getippt geben ein Ergebnis", () => assert.equal(S.pruefeSwEingabe(S.setzeKoepfe(BSP, 0), false).ok, true));
t("A8: Personen mit Personendaten höchstens Köpfe plus Azubis", () => {
  assert.equal(S.setzeKoepfe(BSP, 8).daten, "10");
  assert.equal(S.setzeKoepfe(BSP, 200).daten, "18");
});
t("A8: Zählbasis zur nächsten Schwelle nennen, wenn sie nicht die Kopfzahl ist", () => {
  const dsb = S.REGELN.find((r) => r.id === "dsb");
  assert.match(dsb.basis, /^Für den Datenschutzbeauftragten zählen nur Personen, die ständig mit Personendaten arbeiten\.$/);
  assert.equal(S.REGELN.find((r) => r.id === "tzbfg").basis, undefined);
});
t("A8: Einzahl bei 1 Kopf, Mehrzahl sonst, Bruchteile gewichtet", () => {
  assert.equal(S.fehltText(1), "1 Kopf"); assert.equal(S.fehltText(2), "2 Köpfe"); assert.equal(S.fehltText(0.5), "0,5 gewichtete Köpfe");
});
t("A8: Kurzfassung trennt nicht bei „(15. oder Monatsende)“", () => {
  const r = S.REGELN.find((r) => r.id === "kleinbetrieb");
  assert.equal(S.kurzfassung(r.folge), "Bis 20 darfst du im Vertrag eine Grundkündigungsfrist von 4 Wochen ohne festen Endtermin (15. oder Monatsende) vereinbaren.");
  assert.equal(S.kurzfassung("Ein Satz. Noch einer."), "Ein Satz.");
});

/* ---------- A13 Pausen ---------- */
const tg = (id, datum, von, bis, pausen = []) => ({ id, datum, von, bis, pausen: pausen.map(([a, b], k) => ({ id: id * 10 + k, von: a, bis: b })) });
const po = { jugend: false, ausnahme: false, vortagEnde: "" };
t("A13: Tag mit fehlerhafter Pause fällt nicht still weg, er steht in nichtGeprueft", () => {
  const r = P.pruefeTage([tg(1, "", "08:00", "16:00", [["12:00", "12:30"]]), tg(2, "", "22:00", "06:00", [["12:00", "12:30"]])], po);
  assert.equal(r.voll.length, 1);
  assert.deepEqual(r.nichtGeprueft.map((x) => x.label), ["Tag 2"]);
  assert.match(r.nichtGeprueft[0].fehler, /außerhalb der Arbeitszeit/);
});
t("A13: leere Tage zählen nicht als nicht geprüft", () => assert.equal(P.pruefeTage([tg(1, "", "08:00", "12:00"), tg(2, "", "", "")], po).nichtGeprueft.length, 0));
t("A13: Beginn gleich Ende wird abgelehnt statt als 24-Stunden-Schicht gerechnet", () => {
  const r = P.pruefeTage([tg(1, "", "08:00", "08:00")], po);
  assert.equal(r.voll.length, 0); assert.match(r.nichtGeprueft[0].fehler, /Beginn und Ende sind gleich/);
});
t("A13: Nachtschicht 22 bis 6 Uhr ohne Pause ergibt Pause zu kurz, keinen Eingabefehler", () => {
  const r = P.pruefeTage([tg(1, "", "22:00", "06:00", [["", ""]])], po);
  assert.equal(r.voll.length, 1); assert.equal(r.nichtGeprueft.length, 0);
});

/* ---------- A14 BEM ---------- */
const woche5 = [true, true, true, true, true, false, false];
t("A14: 6 Wochen Mo bis Fr krank (30 von 30 Arbeitstagen) heißt noch 1 Arbeitstag, nicht 13 Kalendertage", () => {
  const von = toDay("2026-08-03"); // Montag
  const r = B.berechneBem([{ von, bis: von + 39 }], von + 39, woche5); // bis Freitag der 6. Woche
  assert.equal(r.arbeitstage, 30); assert.equal(r.kalendertage, 40);
  assert.equal(B.abstandText(r), "noch 1 Arbeitstag");
});
t("A14: bei Gleichstand der Abstand in Kalendertagen, Einzahl und Mehrzahl richtig", () => {
  const von = toDay("2026-08-03"), woche7 = Array(7).fill(true);
  assert.equal(B.abstandText(B.berechneBem([{ von, bis: von + 6 }], von + 6, woche7)), "noch 36 Kalendertage");
  assert.equal(B.abstandText(B.berechneBem([{ von, bis: von + 41 }], von + 41, woche7)), "noch 1 Kalendertag");
});
t("A14: Ergebnisfeld nennt den echten Grund", () => {
  assert.match(B.leerGrund({ stichtagOk: false, proWoche: 5, gueltig: 1, fehler: [] }).text, /Stichtag/);
  assert.match(B.leerGrund({ stichtagOk: true, proWoche: 0, gueltig: 1, fehler: [] }).text, /Arbeitstag/);
  assert.match(B.leerGrund({ stichtagOk: true, proWoche: 5, gueltig: 0, fehler: ["Zeitraum 1: Ende liegt vor dem Beginn."] }).text, /Ende liegt vor dem Beginn/);
  assert.equal(B.leerGrund({ stichtagOk: true, proWoche: 5, gueltig: 0, fehler: [] }).titel, "Noch keine Zeiten");
});

/* ---------- B1/B2 Datenschutz vor dem Absenden an die KI (sensibel.ts) ---------- */
t("B1: Name und Diagnose im Mitarbeitergespräch werden erkannt", () => {
  assert.deepEqual(SE.sensibel("Frau Schmidt kommt oft zu spät, hat Depressionen und nimmt Medikamente"), { name: true, gesundheit: true });
  assert.ok(SE.sensiblerHinweis("Herr Meier war im Burnout"));
});
t("B2: „Lagerist Herr Müller, 58, Diabetiker“ wird erkannt", () => assert.deepEqual(SE.sensibel("Lagerist Herr Müller, 58, Diabetiker"), { name: true, gesundheit: true }));
t("B1: Gesundheitswörter, Groß und klein egal", () => {
  for (const w of ["DIAGNOSE Rücken", "diabetes typ 2", "hatte krebs", "ist schwanger", "Schwangerschaft angekündigt", "Behinderung", "schwerbehindert", "in therapie", "medikamente", "burn-out", "psychisch belastet"]) assert.equal(SE.sensibel(w).gesundheit, true, w);
});
t("B1/B2 Fehlalarme vermeiden: Frau allein, Krankenhaus als Branche, Berufe mit Therapie, Abwesenheit ohne Diagnose", () => {
  // Bewusst ohne Warnung: Anrede ohne Namen, Branchen und Berufe, Dauer der Arbeitsunfähigkeit (der Rückkehr-Leitfaden braucht sie,
  // der Hinweis im Tool sagt ausdrücklich: Dauer der Abwesenheit reicht). Gewarnt wird erst bei Diagnose oder Krankheit.
  for (const w of ["Eine Frau aus dem Team hat sich beschwert", "Pflegefachkraft im Krankenhaus", "Physiotherapeut in einer Praxis", "Arbeit mit Menschen mit Behinderung", "8 Wochen arbeitsunfähig", "3 Wochen krankgeschrieben", "Kommt seit 6 Wochen zu spät, Frau am Empfang übernimmt"]) {
    assert.deepEqual(SE.sensibel(w), { name: false, gesundheit: false }, w);
  }
  assert.equal(SE.sensiblerHinweis("Tourenplanung mit Software"), null);
});
t("B1: Mindestlänge für Stichpunkte: 2 Zeilen oder 60 Zeichen", () => {
  assert.equal(SE.genugText("kommt zu spät"), false);
  assert.equal(SE.genugText("kommt zu spät\nschon angesprochen"), true);
  assert.equal(SE.genugText("Kommt seit 6 Wochen an 11 Tagen 15 bis 30 Minuten nach Schichtbeginn"), true);
  assert.equal(SE.genugText("a\n\n   \n"), false);
});

console.log(`\n${n} Tests bestanden${rot.length ? `, ${rot.length} rot` : ""}.`);
if (rot.length) process.exit(1);
