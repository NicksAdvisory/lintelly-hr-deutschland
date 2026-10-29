// Der offene Server erreicht keine Kundendaten: kein Import von Datenbank, Sitzung, Mandant, KI oder Next.js (Plan Abschnitt 4).
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const WURZEL = path.resolve(import.meta.dirname, "../..");
const dateien = (d: string): string[] => readdirSync(d).flatMap((f) => {
  const p = path.join(d, f);
  return statSync(p).isDirectory() ? (f === "node_modules" || f === "dist" ? [] : dateien(p)) : /\.(ts|mjs)$/.test(f) ? [p] : [];
});
const quellen = [...dateien(path.join(WURZEL, "mcp/src")), ...dateien(path.join(WURZEL, "kern/werkbank/lib")), ...dateien(path.join(WURZEL, "kern/website"))];
const IMPORT = /^\s*(?:import|export)\b[^;]*?\bfrom\s+"([^"]+)"|^\s*import\s+"([^"]+)"|\bimport\(\s*"([^"]+)"\s*\)/gm;
const importe = quellen.flatMap((d) => [...readFileSync(d, "utf8").matchAll(IMPORT)].map((m) => ({ datei: path.relative(WURZEL, d), ziel: m[1] ?? m[2] ?? m[3] })));

describe("Grenzen", () => {
  it("findet die Quellen und ihre Importe", () => { expect(quellen.length).toBeGreaterThan(60); expect(importe.length).toBeGreaterThan(150); });
  it("kein Import von Datenbank, Sitzung, Mandant, Akte, KI oder Next.js", () => {
    const verboten = /(^|\/)(db|sitzung|mandant|akte|claude|chat-db|werkzeuge\/(aufruf|schluessel|oauth))$|node:sqlite|@anthropic-ai|^next\b|server-only/;
    expect(importe.filter((i) => verboten.test(i.ziel))).toEqual([]);
  });
  it("diese Werkbank-Dateien gibt es hier gar nicht", () => {
    for (const f of ["db.ts", "sitzung.ts", "mandant.ts", "akte.ts"]) expect(quellen.some((q) => q.endsWith(`werkbank/lib/${f}`)), f).toBe(false);
  });
  it("Pakete von außen: nur das MCP-SDK und Node", () => {
    const fremd = importe.filter((i) => !i.ziel.startsWith(".") && !i.ziel.startsWith("@/") && !i.ziel.startsWith("node:") && !i.ziel.startsWith("@modelcontextprotocol/sdk/"));
    expect(fremd).toEqual([]);
  });
  it("Dateien schreibt nur der Zähler, und nur in ZAEHLER_ORDNER, auch nicht der Kern (beim npx-Start beim Nutzer)", () => {
    const schreiben = importe.filter((i) => /^(node:)?fs(\/promises)?$/.test(i.ziel));
    expect(schreiben.map((i) => i.datei)).toEqual(["mcp/src/zaehler.ts"]);
  });
});
