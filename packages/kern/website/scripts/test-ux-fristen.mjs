// Tests zur UX-Runde vom 28.10.2026 (Bericht 2026-10-28-tools-ux-review): Probezeit (A4), Urlaubsanspruch (A9),
// Elternzeit (A15), Entgeltfortzahlung (A12), Minijob (A11).
// Aufruf: node scripts/test-ux-fristen.mjs (Node 22.18+ mit Type-Stripping)
import { register } from "node:module";
register("data:text/javascript," + encodeURIComponent(`export async function resolve(s, c, n) { try { return await n(s, c); } catch (e) { if (s.startsWith(".")) return n(s + ".ts", c); throw e; } }`), import.meta.url);
const assert = (await import("node:assert/strict")).default;
const { berechneProbezeit } = await import("../components/tools/probezeit-logik.ts");
const { pruefeWechsel } = await import("../components/tools/urlaubsanspruch-logik.ts");
const { berechneElternzeit, dauerText, volleMonateText } = await import("../components/tools/elternzeit-logik.ts");
const { berechneEfz, krankengeldText, wiederVollText } = await import("../components/tools/entgeltfortzahlung-logik.ts");
const { berechneMinijob } = await import("../components/tools/minijob-logik.ts");
const { toDay } = await import("../components/tools/datum.ts");

let n = 0;
const rot = [];
const t = (name, fn) => {
  try { fn(); n++; console.log("ok", String(n).padStart(2), name); }
  catch (e) { rot.push(name); console.log("ROT", name, "\n   ", String(e.message).split("\n")[0]); }
};
const D = (s) => new Date(s + "T00:00:00Z");
const iso = (d) => d && d.toISOString().slice(0, 10);

/* ---------- A4 Probezeit ---------- */
const pz = (o) => berechneProbezeit({ beginn: "2026-10-01", einheit: "monate", dauer: 6, befristet: false, befristetBis: "", groesse: "gross", azubi: false, ...o });
t("Probezeit 3 Wochen: kein Gespräch vor dem Beginn, Entscheidung nach dem Beginn", () => {
  const r = pz({ einheit: "wochen", dauer: 3 }).ergebnis;
  assert.equal(r.gespraech, null);
  assert.equal(iso(r.entscheidung), "2026-10-07");
});
t("Probezeit 1 Woche: weder Gespräch noch Entscheidung vor dem Beginn", () => {
  const r = pz({ einheit: "wochen", dauer: 1 }).ergebnis;
  assert.equal(r.gespraech, null); assert.equal(r.entscheidung, null);
});
t("Probezeit 6 Monate: Gespräch und Entscheidung wie bisher", () => {
  const r = pz({}).ergebnis;
  assert.equal(iso(r.gespraech), "2027-03-03"); assert.equal(iso(r.entscheidung), "2027-03-17");
});
t("Probezeit länger als die Befristung ist ein Fehler", () => {
  assert.match(pz({ befristet: true, befristetBis: "2027-01-31" }).fehler.dauer, /^Die Probezeit endet nach dem Vertragsende\./);
});
t("Probezeit so lang wie die Befristung bleibt ein Ergebnis", () => assert.equal(pz({ befristet: true, befristetBis: "2027-03-31" }).ergebnis.anteil, 1));
t("Probezeit 0 Monate: Meldung nennt 1 bis 6 Monate", () => assert.match(pz({ dauer: 0 }).fehler.dauer, /1 bis 6 Monate/));
t("Probezeit -1 Wochen: Meldung nennt 1 bis 26 Wochen", () => assert.match(pz({ einheit: "wochen", dauer: -1 }).fehler.dauer, /1 bis 26 Wochen/));
t("Ausbildung 0 Monate: Meldung nennt 1 bis 4 Monate", () => assert.match(pz({ dauer: 0, azubi: true }).fehler.dauer, /1 bis 4 Monate/));

/* ---------- A9 Urlaubsanspruch: Wechsel der Arbeitstage ---------- */
t("Wechsel vor dem Eintritt ist ein Fehler", () => assert.match(pruefeWechsel("2026-05-01", 2026, "2026-07-02", null), /nach dem Eintritt am 02\.07\.2026/));
t("Wechsel am Eintrittstag ist ein Fehler", () => assert.match(pruefeWechsel("2026-07-02", 2026, "2026-07-02", null), /nach dem Eintritt/));
t("Wechsel außerhalb des Urlaubsjahres ist ein Fehler", () => assert.match(pruefeWechsel("2025-05-01", 2026, null, null), /im Urlaubsjahr 2026/));
t("Wechsel nach dem Austritt ist ein Fehler", () => assert.match(pruefeWechsel("2026-08-01", 2026, null, "2026-06-30"), /vor dem Austritt am 30\.06\.2026/));
t("Wechsel zum 01.01. sagt, dass er fürs ganze Jahr gilt", () => assert.match(pruefeWechsel("2026-01-01", 2026, null, null), /ganze Jahr/));
t("Wechsel im Jahr nach dem Eintritt ist in Ordnung", () => assert.equal(pruefeWechsel("2026-09-01", 2026, "2026-07-02", null), undefined));

/* ---------- A15 Elternzeit ---------- */
const ez = (o) => berechneElternzeit({ geburt: toDay("2026-12-15"), et: null, elternteil: "anderer", mutterschutz12: false, beginn: toDay("2026-12-15"), ende: toDay("2027-12-14"), zugang: null, teilzeit: false, urlaub: 30, ...o });
t("Elternzeit: Antragsfrist vor heute ist vorbei, Beginn frühestens heute plus 7 Wochen", () => {
  const r = ez({ heute: toDay("2026-10-28") });
  assert.equal(r.spaetesterZugang, toDay("2026-10-26"));
  assert.equal(r.fristVorbei, true); assert.equal(r.fruehesterBeginnAbHeute, toDay("2026-12-17"));
});
t("Elternzeit: Antragsfrist ab heute ist nicht vorbei", () => assert.equal(ez({ heute: toDay("2026-10-26") }).fristVorbei, false));
t("Elternzeit: mit eingetragenem Antrag zählt der Antrags-Check, nicht heute", () => assert.equal(ez({ heute: toDay("2026-10-28"), zugang: toDay("2026-10-20") }).fristVorbei, false));
t("Elternzeit: Dauer in Einzahl und Mehrzahl", () => {
  assert.equal(dauerText({ monate: 0, tage: 1 }), "1 Tag");
  assert.equal(dauerText({ monate: 1, tage: 0 }), "1 Monat");
  assert.equal(dauerText({ monate: 12, tage: 3 }), "12 Monate, 3 Tage");
});
t("Elternzeit: volle Monate in Einzahl und Mehrzahl", () => {
  assert.equal(volleMonateText(1), "1 voller Monat"); assert.equal(volleMonateText(5), "5 volle Monate");
});

/* ---------- A12 Entgeltfortzahlung ---------- */
const P = (nr, von, bis, gruppe = nr - 1) => ({ nr, von: D(von), bis: D(bis), gruppe, angefangen: false });
t("EFZ: Krankheit in der Wartezeit nennt das Krankengeld für die Wartezeit", () => {
  const [f] = berechneEfz(D("2026-10-01"), [P(1, "2026-10-10", "2026-11-20")]);
  assert.equal(f.wartezeitTage, 19);
  assert.equal(iso(f.kgWartezeit.von), "2026-10-10"); assert.equal(iso(f.kgWartezeit.bis), "2026-10-28");
  assert.equal(krankengeldText(f), "10.10.2026 bis 28.10.2026 (Wartezeit)");
});
t("EFZ: Wartezeit und danach mehr als 6 Wochen nennt beide Krankengeld-Zeiten", () => {
  const [f] = berechneEfz(D("2026-01-01"), [P(1, "2026-01-10", "2026-04-30")]);
  assert.equal(krankengeldText(f), "10.01.2026 bis 28.01.2026 (Wartezeit), wieder ab 12.03.2026");
});
t("EFZ: ohne Wartezeit und innerhalb von 6 Wochen ist kein Krankengeld nötig", () => {
  const [f] = berechneEfz(D("2024-04-01"), [P(1, "2026-01-05", "2026-01-30")]);
  assert.equal(f.kgWartezeit, null); assert.equal(krankengeldText(f), "nicht nötig");
});
t("EFZ: Wieder volle 6 Wochen mit Daten in der Zukunft", () => {
  const [f] = berechneEfz(D("2024-04-01"), [P(1, "2026-01-05", "2026-01-30")]);
  const s = wiederVollText(f, D("2026-03-01"));
  assert.match(s, /^Spätestens bei einer neuen Arbeitsunfähigkeit ab 05\.01\.2027/); assert.match(s, /Früher/);
});
t("EFZ: Wieder volle 6 Wochen, wenn die 6 Monate schon vorbei sind", () => {
  const [f] = berechneEfz(D("2024-04-01"), [P(1, "2026-01-05", "2026-01-30")]);
  const s = wiederVollText(f, D("2026-10-28"));
  assert.match(s, /^Seit dem 31\.07\.2026/); assert.doesNotMatch(s, /Früher/);
});
t("EFZ: Wieder volle 6 Wochen, wenn auch die 12 Monate vorbei sind", () => {
  const [f] = berechneEfz(D("2024-04-01"), [P(1, "2025-01-06", "2025-01-30")]);
  assert.match(wiederVollText(f, D("2026-10-28")), /^Eine neue Arbeitsunfähigkeit wegen dieser Erkrankung bekommt wieder volle 6 Wochen/);
});

/* ---------- A11 Minijob ---------- */
t("Minijob: kippt nur durch die Einmalzahlung, Grund ist das Jahr", () => {
  const r = berechneMinijob(15, 40, "monat", 2026, 500);
  assert.equal(r.monatsEntgelt, 600); assert.equal(r.imMinijob, false); assert.equal(r.grund, "jahr");
});
t("Minijob: über der Monatsgrenze, Grund ist der Monat", () => assert.equal(berechneMinijob(20.11, 30, "monat", 2026, 0).grund, "monat"));
t("Minijob: innerhalb der Grenze kein Grund", () => assert.equal(berechneMinijob(15, 40, "monat", 2026, 0).grund, null));

console.log(rot.length ? `\n${rot.length} ROT: ${rot.join(" | ")}` : `\n${n} Tests bestanden.`);
if (rot.length) process.exit(1);
