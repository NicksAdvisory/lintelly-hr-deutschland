// Tests zur UX-Runde vom 28.10.2026 (Bericht 2026-10-28-tools-ux-review): Sonderkündigungsschutz, Abfindung.
// Aufruf: node scripts/test-ux-trennung.mjs (Node 22.18+ mit Type-Stripping)
import { register } from "node:module";
register("data:text/javascript," + encodeURIComponent(`export async function resolve(s, c, n) { try { return await n(s, c); } catch (e) { if (s.startsWith(".")) return n(s + ".ts", c); throw e; } }`), import.meta.url);
const assert = (await import("node:assert/strict")).default;
const { auswerten, stand } = await import("../components/tools/sonderkuendigungsschutz-logik.ts");
const { berechneAbfindung } = await import("../components/tools/abfindung-logik.ts");

let n = 0;
const rot = [];
const t = (name, fn) => {
  try { fn(); n++; console.log("ok", String(n).padStart(2), name); }
  catch (e) { rot.push(name); console.log("ROT", name, "\n   ", String(e.message).split("\n")[0]); }
};

/* ---------- A1 Sonderkündigungsschutz: kein Grün mit offenen Fragen ---------- */
t("A1: 0 von 11 beantwortet ist nicht grün, sondern offen", () => {
  const s = stand([], 11);
  assert.equal(s.ampel, "aus");
  assert.equal(s.titel, "Noch nicht vollständig, 11 Fragen offen");
});
t("A1: eine offene Frage in Einzahl", () => assert.equal(stand([], 1).titel, "Noch nicht vollständig, 1 Frage offen"));
t("A1: alle beantwortet ohne Treffer ist grün", () => assert.deepEqual(stand([], 0), { titel: "Kein Sonderschutz erkennbar", ampel: "gruen" }));
t("A1: Treffer zeigt Rot schon vor der letzten Antwort", () => assert.equal(stand(auswerten({ elternzeit: "ja" }, "ja"), 10).ampel, "rot"));
t("A1: nur unklar ist gelb", () => assert.equal(stand(auswerten({ elternzeit: "unklar" }, "ja"), 0).ampel, "gelb"));

/* ---------- A2 Schwerbehinderung unter 6 Monaten ---------- */
t("A2: unter 6 Monaten keine Schritte zur Zustimmung", () => {
  const s = auswerten({ schwerbehindert: "ja" }, "nein")[0].schritte.join(" ");
  assert.doesNotMatch(s, /Zustimmung des Integrationsamts beantragen/);
  assert.doesNotMatch(s, /Nach der Zustimmung/);
  assert.match(s, /4 Tagen/); assert.match(s, /§ 173 Abs\. 4 SGB IX/); assert.match(s, /§ 178 Abs\. 2 SGB IX/);
});
t("A2: über 6 Monate bleiben die Zustimmungsschritte", () => assert.match(auswerten({ schwerbehindert: "ja" }, "ja")[0].schritte[0], /Zustimmung des Integrationsamts beantragen/));

/* ---------- A6 Abfindung ---------- */
const abf = (o) => berechneAbfindung({ gehalt: "4.000", sonder: "", faktor: 1.0, alter: "", klein: false, zugang: "", eintritt: "1996-01-01", austritt: "2026-12-31", ...o });
t("A6: ohne Alter keine Höchstbetrag-Warnung als Tatsache, sondern Hinweis", () => {
  const titel = abf({}).msgs.map((m) => m.title);
  assert.ok(!titel.includes("Über dem gesetzlichen Höchstbetrag"), titel.join(" | "));
  assert.ok(abf({}).msgs.some((m) => m.text.startsWith("Alter fehlt, wir rechnen mit der Grenze für unter 50 Jahre (12 Monatsverdienste).")));
});
t("A6: mit Alter bleibt die Warnung", () => assert.ok(abf({ alter: "45" }).msgs.some((m) => m.title === "Über dem gesetzlichen Höchstbetrag")));
t("A6: unter 15 Jahren ist das Alter egal, kein Alter-Hinweis", () => assert.ok(!abf({ eintritt: "2020-01-01" }).msgs.some((m) => /Alter fehlt/.test(m.text))));
t("A6: Zugang nach dem Ende heißt „Der Zugang muss vor dem Ende liegen.“", () => assert.equal(abf({ eintritt: "2020-01-01", zugang: "2026-08-01", austritt: "2026-07-31" }).errors.zugang, "Der Zugang muss vor dem Ende liegen."));
t("A6: Alter „45,5“ wird nicht zu 455, sondern ist ein Fehler", () => assert.ok(abf({ alter: "45,5" }).errors.alter));

console.log(rot.length ? `\n${rot.length} ROT, ${n} ok` : `\nAlle ${n} Tests grün.`);
if (rot.length) process.exit(1);
