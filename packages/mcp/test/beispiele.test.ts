// Jedes Werkzeug hat ein Beispiel für den Rauchtest (scripts/beispiele.json), und das Beispiel rechnet ohne Fehler und ohne Feld fehler.
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { WERKZEUGE } from "../src/werkzeuge";
import { rufe } from "./hilfe";

const BEISPIELE: Record<string, Record<string, unknown>> = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../../scripts/beispiele.json"), "utf8"));

it("jedes Werkzeug hat ein Beispiel, jedes Beispiel ein Werkzeug", () => {
  expect(Object.keys(BEISPIELE).sort()).toEqual(WERKZEUGE.map((w) => w.name).sort());
});
it.each(Object.entries(BEISPIELE))("%s rechnet mit dem Beispiel, ohne Gedankenstrich", (name, eingabe) => {
  const a = rufe(name, eingabe);
  expect(a.herausgeber).toBe("Lintelly, lintelly.com");
  expect(a.ergebnis, name).not.toHaveProperty("fehler");
  expect(JSON.stringify(a)).not.toMatch(/[–—]/);
});
