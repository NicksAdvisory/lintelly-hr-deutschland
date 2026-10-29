// Tests zur UX-Runde vom 28.10.2026 (Bericht 2026-10-28-tools-ux-review): Geld- und Pflichten-Rechner.
// Ausgleichsabgabe, Abfindung, Minijob, Entgeltfortzahlung, Urlaubsabgeltung, BEM, Schwellenwerte.
// Aufruf: node scripts/test-ux-geld.mjs (Node 22.18+ mit Type-Stripping)
import { register } from "node:module";
register("data:text/javascript," + encodeURIComponent(`export async function resolve(s, c, n) { try { return await n(s, c); } catch (e) { if (s.startsWith(".")) return n(s + ".ts", c); throw e; } }`), import.meta.url);
const assert = (await import("node:assert/strict")).default;
const { besetztText, mehrAlsPlaetze } = await import("../components/tools/ausgleichsabgabe-logik.ts");
const { berechneAbfindung, STAND_2026, KEIN_ANSPRUCH } = await import("../components/tools/abfindung-logik.ts");
const { plausiMinijob, zifferMitLeerzeichen } = await import("../components/tools/minijob-logik.ts");
const { berechneEfz, ueber78Wochen } = await import("../components/tools/entgeltfortzahlung-logik.ts");
const { anspruchImAustrittsjahr, ohneParagrafen } = await import("../components/tools/urlaubsabgeltung-logik.ts");
const { hochrechnung } = await import("../components/tools/bem-logik.ts");
const { SKALA_BESCHRIFTET, REGELN } = await import("../components/tools/schwellenwerte-logik.ts");
const { toDay } = await import("../components/tools/datum.ts");

let n = 0;
const rot = [];
const t = (name, fn) => {
  try { fn(); n++; console.log("ok", String(n).padStart(2), name); }
  catch (e) { rot.push(name); console.log("ROT", name, "\n   ", String(e.message).split("\n")[0]); }
};
const D = (s) => new Date(s + "T00:00:00Z");

/* ---------- Ausgleichsabgabe ---------- */
const nul = Array(12).fill(0);
t("Ausgleichsabgabe: 1 Person in einem Monat heißt „1 Person in 1 von 12 Monaten“, nicht 0,08", () => assert.equal(besetztText([1, ...nul.slice(1)]), "1 Person in 1 von 12 Monaten"));
t("Ausgleichsabgabe: jeden Monat 2 Personen heißt „2 Personen in jedem Monat“", () => assert.equal(besetztText(Array(12).fill(2)), "2 Personen in jedem Monat"));
t("Ausgleichsabgabe: niemand besetzt heißt „niemand“", () => assert.equal(besetztText(nul), "niemand"));
t("Ausgleichsabgabe: wechselnde Zahlen zeigen den Schnitt je Monat", () => assert.equal(besetztText([1, 2, ...nul.slice(2)]), "im Schnitt 0,25 Personen je Monat"));
t("Ausgleichsabgabe: mehr Schwerbehinderte als Plätze findet den Monat (C9)", () => {
  assert.deepEqual(mehrAlsPlaetze(Array(12).fill(30), Array(12).fill(50)).length, 12);
  assert.deepEqual(mehrAlsPlaetze([30, ...Array(11).fill(30)], [31, ...Array(11).fill(1)]), [0]);
  assert.deepEqual(mehrAlsPlaetze(Array(12).fill(80), Array(12).fill(1)), []);
});

/* ---------- Abfindung ---------- */
const abf = (o) => berechneAbfindung({ gehalt: "4.000", sonder: "", faktor: 0.5, alter: "45", klein: false, zugang: "", eintritt: "2019-03-01", austritt: "2026-12-31", ...o });
t("Abfindung: „Kein gesetzlicher Anspruch“ ist kein grüner Prüfpunkt mehr", () => {
  assert.ok(!abf({}).msgs.some((m) => m.title === "Kein gesetzlicher Anspruch"));
  assert.ok(!abf({}).msgs.some((m) => m.level === "ok"));
  assert.match(KEIN_ANSPRUCH, /§ 1a KSchG/);
});
t("Abfindung: Faktor 2,00 steht in der Spanne", () => {
  assert.ok(STAND_2026.spanne.includes(2.0));
  assert.equal(abf({}).spanne.at(-1).f, 2.0);
});
t("Abfindung: Zugehörigkeit über 50 Jahre gibt einen weichen Hinweis", () => {
  const r = abf({ eintritt: "1960-01-01" });
  assert.ok(r.msgs.some((m) => m.title === "Stimmt der Eintritt?" && m.level === "due"));
  assert.ok(!abf({}).msgs.some((m) => m.title === "Stimmt der Eintritt?"));
});
t("Abfindung: Gehalt unter 500 € gibt einen weichen Hinweis, kein Fehler", () => {
  const r = abf({ gehalt: "14,50" });
  assert.ok(r.betrag > 0);
  assert.ok(r.msgs.some((m) => m.title === "Stimmt das Gehalt?"));
  assert.ok(!abf({}).msgs.some((m) => m.title === "Stimmt das Gehalt?"));
});
t("Abfindung: bis 6 Monate steht „frei verhandelt“ nicht doppelt im Wartezeit-Hinweis", () => {
  const r = abf({ eintritt: "2026-01-01", austritt: "2026-05-31" });
  assert.equal(r.jahre, 0);
  const w = r.msgs.find((m) => m.title.includes("6 Monate"));
  assert.ok(w);
  assert.ok(!/frei verhandelt|0 Jahre/.test(w.text), w.text);
});

/* ---------- Minijob ---------- */
t("Minijob: „14 50“ wird als Tippfehler erkannt, „14,50“ nicht", () => {
  assert.equal(zifferMitLeerzeichen("14 50"), true);
  assert.equal(zifferMitLeerzeichen("14,50"), false);
  assert.equal(zifferMitLeerzeichen(" 9 "), false);
});
t("Minijob: 0 Stunden geben einen Hinweis, leere Stunden nicht", () => {
  assert.match(plausiMinijob(0, 0, 2026).stunden, /0 Stunden/);
  assert.equal(plausiMinijob(null, 0, 2026).stunden, undefined);
  assert.equal(plausiMinijob(9, 0, 2026).stunden, undefined);
});
t("Minijob: Einmalzahlung über der ganzen Jahresgrenze gibt einen Hinweis", () => {
  assert.match(plausiMinijob(9, 100000, 2026).einmal, /7\.236 €/);
  assert.equal(plausiMinijob(9, 500, 2026).einmal, undefined);
});

/* ---------- Entgeltfortzahlung ---------- */
const efz = (von, bis) => berechneEfz(D("2020-01-01"), [{ nr: 1, von: D(von), bis: D(bis), gruppe: 0, angefangen: false }]);
t("Entgeltfortzahlung: über 78 Wochen krank gibt einen Hinweis", () => {
  assert.equal(ueber78Wochen(efz("2024-01-01", "2025-12-31")), true);
  assert.equal(ueber78Wochen(efz("2026-01-05", "2026-03-31")), false);
});

/* ---------- Urlaubsabgeltung ---------- */
t("Urlaubsabgeltung: Paragrafen wandern aus dem Text in die Liste", () => {
  const r = ohneParagrafen("Es gibt Teilurlaub: 1/12 je Monat (§ 5 Abs. 1 c BUrlG). Er wird abgegolten (§ 7 Abs. 4 BUrlG).");
  assert.equal(r.text, "Es gibt Teilurlaub: 1/12 je Monat. Er wird abgegolten.");
  assert.deepEqual(r.paragrafen, ["§ 5 Abs. 1 c BUrlG", "§ 7 Abs. 4 BUrlG"]);
});
t("Urlaubsabgeltung: „gezwölftelt“ steht nicht mehr im Hinweis", () => {
  const r = anspruchImAustrittsjahr({ eintritt: D("2020-01-01"), austritt: D("2026-09-30"), jahresurlaub: 28, tageWoche: 5, mehrZwoelfteln: true, schwerbehindert: false });
  assert.ok(!/zwölftel/i.test(r.begruendung), r.begruendung);
  assert.match(r.begruendung, /1\/12 je vollem Monat/);
});

/* ---------- BEM ---------- */
t("BEM: Stichtag in der Zukunft mit offenem Ende ist eine Hochrechnung", () => {
  const h = toDay("2026-10-28");
  assert.equal(hochrechnung([{ von: h - 10, bis: null }], h + 30, h), true);
  assert.equal(hochrechnung([{ von: h - 10, bis: h - 2 }], h + 30, h), false);
  assert.equal(hochrechnung([{ von: h - 10, bis: null }], h, h), false);
});

/* ---------- Schwellenwerte ---------- */
t("Schwellenwerte: beschriftete Skalenwerte sind echte Schwellen, 15 und 25 nur als Strich", () => {
  const grenzen = new Set(REGELN.map((r) => r.grenze));
  assert.ok(SKALA_BESCHRIFTET.every((g) => grenzen.has(g)));
  assert.ok(!SKALA_BESCHRIFTET.includes(15) && !SKALA_BESCHRIFTET.includes(25));
});
t("Schwellenwerte: beschriftete Werte liegen auf der Wurzel-Skala mindestens 6 % auseinander", () => {
  const pos = (v) => (Math.sqrt(v) / Math.sqrt(220)) * 100;
  for (let i = 1; i < SKALA_BESCHRIFTET.length; i++) assert.ok(pos(SKALA_BESCHRIFTET[i]) - pos(SKALA_BESCHRIFTET[i - 1]) >= 6, String(SKALA_BESCHRIFTET[i]));
});

console.log(rot.length ? `\n${rot.length} ROT, ${n} ok` : `\nAlle ${n} Tests grün.`);
if (rot.length) process.exit(1);
