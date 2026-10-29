// Tests für die Tool-Logik aus dem Review vom 15.10.2026: Befristung, Mutterschutz, Elternzeit, BEM, Pausen,
// Schwellenwerte, Sonderkündigungsschutz, Aufbewahrung, Urlaubsabgeltung, Abfindung.
// Aufruf: node scripts/test-tools-logik.mjs (Node 22.18+ mit Type-Stripping)
import { register } from "node:module";
register("data:text/javascript," + encodeURIComponent(`export async function resolve(s, c, n) { try { return await n(s, c); } catch (e) { if (s.startsWith(".")) return n(s + ".ts", c); throw e; } }`), import.meta.url);
const assert = (await import("node:assert/strict")).default;
const { pruefeBefristung } = await import("../components/tools/befristung-logik.ts");
const { berechneGeburt, berechneFehlgeburt } = await import("../components/tools/mutterschutz-logik.ts");
const { berechneElternzeit } = await import("../components/tools/elternzeit-logik.ts");
const { berechneBem } = await import("../components/tools/bem-logik.ts");
const { pruefeTage } = await import("../components/tools/pausen-logik.ts");
const { pruefeSwEingabe, gewichtetU1, koepfeAusRegler, reglerAusKoepfen, REGLER_MAX, mitKoepfen } = await import("../components/tools/schwellenwerte-logik.ts");
const { auswerten } = await import("../components/tools/sonderkuendigungsschutz-logik.ts");
const { DOKUMENTE, berechneFrist, jetztLoeschen, loeschplan } = await import("../components/tools/aufbewahrungsfristen-logik.ts");
const { anspruchImAustrittsjahr } = await import("../components/tools/urlaubsabgeltung-logik.ts");
const { berechneAbfindung } = await import("../components/tools/abfindung-logik.ts");
const { toDay } = await import("../components/tools/datum.ts");
const Z = await import("../components/tools/arbeitszeugnis-logik.ts");

let n = 0;
const rot = [];
const t = (name, fn) => {
  try { fn(); n++; console.log("ok", String(n).padStart(2), name); }
  catch (e) { rot.push(name); console.log("ROT", name, "\n   ", String(e.message).split("\n")[0]); }
};
const D = (s) => new Date(s + "T00:00:00Z");
const iso = (d) => d && d.toISOString().slice(0, 10);

/* ---------- Befristung (§ 14 TzBfG, § 41 Abs. 2 SGB VI) ---------- */
const bf = (o) => pruefeBefristung({ beginn: "2026-01-01", ende1: "2026-03-31", verl: [], vorbesch: "nein", vorbeschEnde: "", gruendung: "", ab52: false, rente: false, schrift: "ja", heute: D("2025-12-01"), ...o });
const v = (id, am, bis) => ({ id, am, bis, geaendert: false });
t("Befristung: 01.03.2026 ergibt spätestes Ende 29.02.2028", () => assert.equal(iso(bf({ beginn: "2026-03-01", ende1: "2026-12-31" }).maxEnde), "2028-02-29"));
t("Befristung: leere Verlängerungszeile zählt nicht mit, 3 Verlängerungen sind zulässig", () => {
  const r = bf({ verl: [v(1, "2026-03-20", "2026-06-30"), v(2, "", ""), v(3, "2026-06-20", "2026-09-30"), v(4, "2026-09-20", "2027-12-31")] });
  assert.equal(r.nVerl, 3); assert.equal(r.verlUebrig, 0); assert.equal(r.ampel, "ok");
  assert.ok(!r.msgs.some((m) => /mehr als 3/.test(m.title)), r.msgs.map((m) => m.title).join(" | "));
});
t("Befristung: vierte ausgefüllte Verlängerung ist unzulässig und heißt Verlängerung 4", () => {
  const r = bf({ verl: [v(1, "2026-03-20", "2026-06-30"), v(3, "2026-06-20", "2026-09-30"), v(4, "2026-09-20", "2026-12-31"), v(5, "2026-12-20", "2027-12-31")] });
  assert.ok(r.msgs.some((m) => m.title === "Verlängerung 4: mehr als 3 Verlängerungen"));
});
t("Befristung: Vorbeschäftigung ohne Regelaltersgrenze bleibt unzulässig", () => assert.equal(bf({ vorbesch: "arbeit" }).ampel, "late"));
t("Befristung: Vorbeschäftigung ab Regelaltersgrenze zulässig (§ 41 Abs. 2 SGB VI)", () => {
  const r = bf({ vorbesch: "arbeit", rente: true });
  assert.equal(r.ampel, "ok");
  assert.ok(r.msgs.some((m) => /§ 41 Abs\. 2 SGB VI/.test(m.text) && /8 Jahre/.test(m.text) && /12/.test(m.text)));
});
t("Befristung: Neugründung genau 4 Jahre vor Beginn ist keine Neugründung mehr", () => assert.equal(bf({ gruendung: "2022-01-01" }).basis.key, "regel"));

/* ---------- Mutterschutz (§§ 3, 17 MuSchG) ---------- */
const geb = (o) => berechneGeburt({ et: "2027-03-15", geb: "", frueh: false, mehr: false, beh: false, ...o });
t("Mutterschutz: ET 15.03.2027 ergibt 01.02. bis 10.05.2027, 99 Tage", () => {
  const r = geb({}); assert.equal(iso(r.vorBeginn), "2027-02-01"); assert.equal(iso(r.nachEnde), "2027-05-10"); assert.equal(r.gesamt, 99);
});
t("Mutterschutz: Frühgeburt 4 Wochen vor ET bis 07.06.2027, Kündigungsverbot bis 15.06.2027", () => {
  const r = geb({ geb: "2027-02-15", frueh: true }); assert.equal(iso(r.nachEnde), "2027-06-07"); assert.equal(iso(r.kEnde), "2027-06-15");
});
t("Mutterschutz: Totgeburt 02.11.2026 in der 25. Woche, ET 22.02.2027, Schutzfrist bis 08.02.2027", () => {
  const r = berechneFehlgeburt({ datum: "2026-11-02", ssw: "25", ab500: false, et: "2027-02-22" });
  assert.equal(r.totgeburt, true); assert.equal(iso(r.ende), "2027-02-08"); assert.equal(iso(r.kEnde), "2027-03-02");
});
t("Mutterschutz: Totgeburt ohne ET zeigt 8 Wochen als Mindestfrist", () => {
  const r = berechneFehlgeburt({ datum: "2026-11-02", ssw: "25", ab500: false, et: "" });
  assert.equal(iso(r.ende), "2026-12-28"); assert.equal(r.mindestens, true);
});
t("Mutterschutz: Fehlgeburt in der 12. Woche hat keine Schutzfrist", () => assert.equal(berechneFehlgeburt({ datum: "2026-05-10", ssw: "12", ab500: false }).stufe, null));

/* ---------- Elternzeit (§§ 15 bis 18 BEEG) ---------- */
const ez = (o) => berechneElternzeit({ geburt: toDay("2026-03-01"), et: null, elternteil: "anderer", mutterschutz12: false, beginn: toDay("2026-06-01"), ende: toDay("2027-05-31"), zugang: null, teilzeit: false, urlaub: 30, ...o });
t("Elternzeit: Frühgeburt 6 Wochen vor ET, Mutterschutz der Mutter bis 05.07.2026", () => {
  const r = ez({ elternteil: "mutter", mutterschutz12: true, et: toDay("2026-04-12"), beginn: toDay("2026-07-06") });
  assert.equal(r.mutterschutzEnde, toDay("2026-07-05"));
});
t("Elternzeit: Beginn im verlängerten Mutterschutz gibt eine Warnung", () => {
  const r = ez({ elternteil: "mutter", mutterschutz12: true, et: toDay("2026-04-12"), beginn: toDay("2026-05-25") });
  assert.ok(r.warnungen.some((w) => w.includes("05.07.2026")));
});
t("Elternzeit: 7 Wochen, sicher rechtzeitig bis Beginn minus 50 Tage", () => assert.equal(ez({}).abschnitte[0].spaetesterZugang, toDay("2026-06-01") - 50));
t("Elternzeit: Urlaubskürzung nach vollen Kalendermonaten (15.03. bis 14.09. ergibt 5)", () => {
  const r = ez({ beginn: toDay("2026-03-15"), ende: toDay("2026-09-14") });
  assert.deepEqual(r.kuerzung.map((k) => k.monate), [5]);
});

/* ---------- BEM (§ 167 Abs. 2 SGB IX) ---------- */
const woche5 = [true, true, true, true, true, false, false];
t("BEM: 42 Kalendertage reichen nicht, 43 schon", () => {
  const von = toDay("2026-03-01");
  assert.equal(berechneBem([{ von, bis: von + 41 }], toDay("2026-10-01"), woche5).ueberKalender, false);
  assert.equal(berechneBem([{ von, bis: von + 42 }], toDay("2026-10-01"), woche5).ueberKalender, true);
});
t("BEM: überschneidende Zeiträume zählen einmal", () => {
  const von = toDay("2026-03-02");
  assert.equal(berechneBem([{ von, bis: von + 9 }, { von: von + 5, bis: von + 14 }], toDay("2026-10-01"), woche5).kalendertage, 15);
});

/* ---------- Pausen (ArbZG, JArbSchG) ---------- */
const tag = (id, datum, von, bis, pausen) => ({ id, datum, von, bis, pausen: pausen.map(([a, b], i) => ({ id: id * 10 + i, von: a, bis: b })) });
const jugTag = (id, datum) => tag(id, datum, "08:00", "17:00", [["11:00", "11:30"], ["13:30", "14:00"]]);
t("Pausen: Jugendliche, 7 Tage über zwei Kalenderwochen mit je 8 Stunden sind kein Wochenverstoß", () => {
  const tage = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-12", "2026-10-13"].map((d, i) => jugTag(i + 1, d));
  const r = pruefeTage(tage, { jugend: true, ausnahme: false, vortagEnde: "" });
  assert.equal(r.wocheMsg, null, r.wocheMsg?.text);
});
t("Pausen: Jugendliche, 6 Tage in einer Kalenderwoche mit je 8 Stunden überschreiten 40 Stunden", () => {
  const tage = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"].map((d, i) => jugTag(i + 1, d));
  assert.equal(pruefeTage(tage, { jugend: true, ausnahme: false, vortagEnde: "" }).wocheMsg?.level, "late");
});
t("Pausen: 6:00 Stunden ohne Pause sind erlaubt, 6:01 nicht", () => {
  const p = (bis) => pruefeTage([tag(1, "2026-10-05", "08:00", bis, [])], { jugend: false, ausnahme: false, vortagEnde: "" }).gesamt;
  assert.equal(p("14:00"), "ok"); assert.equal(p("14:01"), "late");
});

/* ---------- Schwellenwerte ---------- */
const sw = (o) => pruefeSwEingabe({ koepfe: "31", bis10: "", bis20: "", bis30: "", azubis: "1", plaetze18: "", schwerbehindert: "", daten: "", ...o }, false);
t("Schwellenwerte: 31 Vollzeit und ein Azubi, U1 entfällt", () => assert.equal(gewichtetU1(sw({}).e), 31));
t("Schwellenwerte: Schwerbehinderte nur unter den Arbeitnehmern ohne Azubis", () => {
  assert.ok(sw({ koepfe: "2", azubis: "3", schwerbehindert: "3" }).fehler.schwerbehindert);
  assert.equal(sw({ schwerbehindert: "1" }).fehler.schwerbehindert, undefined);
});
t("Schwellenwerte: Teilzeit über der Gesamtzahl ist ein Fehler", () => assert.ok(sw({ koepfe: "3", bis10: "2", bis20: "2" }).fehler.bis30));
t("Schwellenwerte-Regler: jede Kopfzahl von 0 bis zum Maximum ist erreichbar und hin und zurück gleich", () => {
  const erreicht = new Set();
  for (let p = 0; p <= 1000; p++) erreicht.add(koepfeAusRegler(p));
  for (let k = 0; k <= REGLER_MAX; k++) { assert.ok(erreicht.has(k), `Kopfzahl ${k} fehlt`); assert.equal(koepfeAusRegler(reglerAusKoepfen(k)), k); }
  assert.equal(reglerAusKoepfen(REGLER_MAX + 300), 1000);
});
t("Schwellenwerte-Regler: weniger Köpfe kürzen Teilzeit von oben und Schwerbehinderte, nie unter 0", () => {
  const f = { koepfe: "32", bis10: "4", bis20: "3", bis30: "4", azubis: "2", plaetze18: "", schwerbehindert: "6", daten: "18" };
  assert.deepEqual(mitKoepfen(f, 9), { ...f, koepfe: "9", bis30: "2", schwerbehindert: "6" });
  assert.deepEqual(mitKoepfen(f, 5), { ...f, koepfe: "5", bis10: "4", bis20: "1", bis30: "0", schwerbehindert: "5" });
  assert.deepEqual(mitKoepfen(f, 40), { ...f, koepfe: "40" });
  assert.equal(sw(mitKoepfen({ ...f, azubis: "1" }, 0)).ok, true);
});

/* ---------- Sonderkündigungsschutz ---------- */
t("Sonderkündigungsschutz: Schwerbehinderung unter 6 Monaten wird gelb", () => assert.equal(auswerten({ schwerbehindert: "ja" }, "nein")[0].effektiv, "pruefen"));
t("Sonderkündigungsschutz: unklar wird gelb, Rot steht vorn", () => {
  const r = auswerten({ elternzeit: "unklar", betriebsrat: "ja" }, "ja");
  assert.deepEqual(r.map((x) => x.effektiv), ["ausgeschlossen", "pruefen"]);
});
t("Sonderkündigungsschutz: Frage Mutterschutz deckt die verlängerte Schutzfrist ab", () => assert.match(auswerten({ mutterschutz: "ja" }, "ja")[0].frage, /Schutzfrist/));

/* ---------- Aufbewahrung ---------- */
const typ = (id) => DOKUMENTE.find((d) => d.id === id);
t("Aufbewahrung: SV-Unterlage nach dem geprüften Zeitraum ist nicht erfasst", () => assert.equal(berechneFrist(typ("sv"), D("2024-03-31"), { bis: D("2023-12-31"), am: D("2024-05-10") }), null));
t("Aufbewahrung: SV-Unterlage im geprüften Zeitraum bis Ende des Jahres nach der Prüfung", () => assert.equal(iso(berechneFrist(typ("sv"), D("2023-01-31"), { bis: D("2023-12-31"), am: D("2024-05-10") }).bis), "2025-12-31"));
t("Aufbewahrung: SV-Unterlage nicht jetzt löschen, solange sie als Lohnbeleg 8 Jahre bleibt", () => {
  assert.equal(jetztLoeschen(typ("sv"), D("2023-01-31"), { bis: D("2023-12-31"), am: D("2024-05-10") }, D("2026-10-15")), false);
  assert.equal(jetztLoeschen(typ("sv"), D("2017-03-31"), { bis: D("2017-12-31"), am: D("2018-05-10") }, D("2026-10-15")), true);
});
t("Aufbewahrung: Löschplan führt den Arbeitsvertrag mit 6 Jahren, die übrige Akte mit 3", () => {
  const p = loeschplan(D("2026-06-30"));
  assert.equal(iso(p.find((r) => r.typ === "vertrag").f.ab), "2033-01-01");
  assert.equal(iso(p.find((r) => r.typ === "akte").f.ab), "2030-01-01");
});
t("Aufbewahrung: Bewerbung 6 Monate ab 31.08. ergibt 28.02.", () => assert.equal(iso(berechneFrist(typ("bewerbung"), D("2026-08-31")).bis), "2027-02-28"));

/* ---------- Urlaubsabgeltung ---------- */
const ua = (o) => anspruchImAustrittsjahr({ jahresurlaub: 30, tageWoche: 5, mehrZwoelfteln: false, schwerbehindert: false, ...o });
t("Urlaubsabgeltung: Eintritt 01.11.2025, Austritt 28.02.2026, dazu 5 Tage Teilurlaub 2025", () => {
  const r = ua({ eintritt: D("2025-11-01"), austritt: D("2026-02-28") });
  assert.equal(r.anspruch, 5); assert.equal(r.vorjahrTeil, 5);
});
t("Urlaubsabgeltung: kein Vorjahres-Teilurlaub, wenn die Wartezeit im Vorjahr endete", () => assert.equal(ua({ eintritt: D("2025-03-01"), austritt: D("2026-02-28") }).vorjahrTeil, 0));
t("Urlaubsabgeltung: Zusatzurlaub bei Schwerbehinderung wird abgegolten", () => assert.equal(ua({ eintritt: D("2020-01-01"), austritt: D("2026-12-31"), schwerbehindert: true }).anspruch, 35));

/* ---------- Abfindung ---------- */
const abf = (o) => berechneAbfindung({ gehalt: "4.000", sonder: "", faktor: 0.5, alter: "", klein: false, zugang: "", ...o });
t("Abfindung: 30.01.2020 bis 28.02.2026 sind 6 Jahre, 1 Monat, 0 Tage", () => assert.deepEqual(abf({ eintritt: "2020-01-30", austritt: "2026-02-28" }).dauer, { y: 6, m: 1, d: 0 }));
t("Abfindung: 31.08.2019 bis 28.02.2026 sind genau 6 Jahre, 6 Monate, gerechnet 6 Jahre", () => {
  const r = abf({ eintritt: "2019-08-31", austritt: "2026-02-28" });
  assert.deepEqual(r.dauer, { y: 6, m: 6, d: 0 }); assert.equal(r.jahre, 6);
});
t("Abfindung: Wartezeit zählt bis zum Zugang der Kündigung, nicht bis zum Ende", () => {
  const r = abf({ eintritt: "2026-01-01", zugang: "2026-06-25", austritt: "2026-07-09" });
  assert.ok(r.msgs.some((m) => m.title.includes("6 Monate")));
});
t("Abfindung: Zugang am letzten Tag der 6 Monate liegt noch in der Wartezeit", () => {
  const r = abf({ eintritt: "2026-01-01", zugang: "2026-06-30", austritt: "2026-07-31" });
  assert.ok(r.msgs.some((m) => m.title.includes("6 Monate")));
});
t("Abfindung: Zugang nach dem Ende ist ein Fehler", () => assert.ok(abf({ eintritt: "2020-01-01", zugang: "2026-08-01", austritt: "2026-07-31" }).errors.zugang));

/* ---------- Arbeitszeugnis ---------- */
t("Zeugnis: Teilnoten 2, 2, 3, 3 ergeben bei Gleichstand die bessere Note 2", () => assert.equal(Z.gesamtNote([2, 2, 3, 3]).note, 2));
t("Zeugnis: 2, 3, 3, 3 ergeben 3, 1, 1, 1, 2 ergeben 1", () => { assert.equal(Z.gesamtNote([2, 3, 3, 3]).note, 3); assert.equal(Z.gesamtNote([1, 1, 1, 2]).note, 1); });

const Dat = await import("../components/tools/datum.ts");
t("Zeitraum: Ende im Jahr 2199 rechnet zu Ende statt endlos (Review 29.10.2026)", () => {
  const r = Dat.ymd(D("2015-01-01"), D("2199-12-31"));
  assert.ok(r.y >= 184);
});

console.log(`\n${n} Tests bestanden${rot.length ? `, ${rot.length} rot` : ""}.`);
if (rot.length) process.exit(1);
