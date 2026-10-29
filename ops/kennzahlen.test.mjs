// Kennzahlen-Bericht (Plan Abschnitt 7): fasst die Tagesdateien eines Monats zusammen, ohne Rohwerte.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bericht, EIGEN, lesen, vormonat } from "./kennzahlen.mjs";

const tage = [
  { ablauf: { aufrufe: 3, fehler: 0, baender: { ablauf: { krankheit: 2, erste_einstellung: 1 }, groesse: { "5-9": 3 } } }, rechtswert: { aufrufe: 5, fehler: 1, baender: {} } },
  { ablauf: { aufrufe: 2, fehler: 1, baender: { ablauf: { krankheit: 1, kuendigung_vorbereiten: 1 }, groesse: { "2-4": 1 }, land: { HE: 2 } } }, minijob: { aufrufe: 1, fehler: 0, baender: {} } },
];

test("Vormonat am 1. Januar ist der Dezember davor", () => {
  assert.equal(vormonat("2027-01-01"), "2026-12");
  assert.equal(vormonat("2026-11-01"), "2026-10");
});

test("Summen, Top-Werkzeuge, häufigste Abläufe und Bänder", () => {
  const t = bericht("2026-10", tage, { sterne: 12 });
  assert.match(t, /Aufrufe: 11 an 2 Tagen/);
  assert.match(t, /Fehler: 2/);
  assert.match(t, /1\. ablauf 5\n2\. rechtswert 5\n3\. minijob 1/);
  assert.match(t, /krankheit 3/);
  assert.match(t, /Firmengröße: 5-9 3, 2-4 1/);
  assert.match(t, /Bundesland: HE 2/);
  assert.match(t, /GitHub-Sterne: 12/);
});

test("ohne Daten sagt der Bericht das", () => {
  assert.match(bericht("2026-10", [], {}), /keine Aufrufe/);
});

test("Kanal-Band, eigene Tests nicht mitgezählt, Fehler gezählt", () => {
  const t = bericht("2026-11", [
    { rechtswert: { aufrufe: 3, fehler: 2, baender: { client: { claude: 2, chatgpt: 1 } } }, [EIGEN]: { aufrufe: 38, fehler: 0, baender: { werkzeug: { rechtswert: 1 } } } },
    { minijob: { aufrufe: 1, fehler: 0, baender: { client: { claude: 1 } } } },
  ], {});
  assert.match(t, /Aufrufe: 4 an 2 Tagen\. Fehler: 2\./);
  assert.match(t, /Kanal: claude 3, chatgpt 1/);
  assert.match(t, /Eigene Tests \(nicht mitgezählt\): 38/);
  assert.doesNotMatch(t, /_eigen/);
});

test("nur eigene Tests: keine Aufrufe, Tests werden trotzdem genannt", () => {
  const t = bericht("2026-11", [{ [EIGEN]: { aufrufe: 38, fehler: 0, baender: {} } }], {});
  assert.match(t, /keine Aufrufe\.\nEigene Tests \(nicht mitgezählt\): 38/);
});

test("kaputte Tagesdatei wird übersprungen und genannt, der Rest zählt", () => {
  const ordner = mkdtempSync(path.join(tmpdir(), "lhr-kz-"));
  writeFileSync(path.join(ordner, "2026-11-01.json"), JSON.stringify({ minijob: { aufrufe: 2, fehler: 0, baender: {} } }));
  writeFileSync(path.join(ordner, "2026-11-02.json"), "{kaputt");
  writeFileSync(path.join(ordner, "2026-11-03.json"), "null");
  writeFileSync(path.join(ordner, "2026-10-31.json"), "{kaputt");
  const { tage, kaputt } = lesen(ordner, "2026-11");
  assert.equal(tage.length, 1);
  assert.deepEqual(kaputt, ["2026-11-02.json", "2026-11-03.json"]);
  const t = bericht("2026-11", tage, { kaputt });
  assert.match(t, /Aufrufe: 2 an 1 Tag\./);
  assert.match(t, /Kaputte Tagesdateien übersprungen: 2026-11-02\.json, 2026-11-03\.json/);
});
