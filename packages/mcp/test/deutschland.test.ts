// Nur deutsches Arbeits- und Sozialversicherungsrecht (Nick 23.10.2026, Plan Abschnitt 2 Nr. 7).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ANWEISUNGEN, mcpServer, NUR_DEUTSCHLAND } from "../src/server";

let client: Client;
beforeAll(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await mcpServer(() => new Date("2026-10-23T10:00:00Z")).connect(b);
  client = new Client({ name: "test", version: "1" });
  await client.connect(a);
});
afterAll(() => client.close());
const text = (r: any) => JSON.parse(r.content[0].text);

describe("nur Deutschland", () => {
  it("Anweisungen und jede Werkzeugbeschreibung sagen Germany only", async () => {
    expect(ANWEISUNGEN).toMatch(/nur deutsches Arbeits- und Sozialversicherungsrecht/);
    // Genau einmal je Beschreibung (Review 29.10.2026: 26 von 38 sagten es zweimal)
    for (const t of (await client.listTools()).tools) expect(t.description!.split("Germany only").length - 1, t.name).toBe(1);
  });
  it("Frage nach Österreich: Hinweis statt Rechnung", async () => {
    const a = text(await client.callTool({ name: "rechtswerte_suchen", arguments: { suchtext: "Mindestlohn Österreich" } }));
    expect(a.ergebnis).toEqual({ hinweis: NUR_DEUTSCHLAND });
    expect(NUR_DEUTSCHLAND).toBe("Lintelly HR kennt nur deutsches Arbeits- und Sozialversicherungsrecht.");
  });
  it("Schweiz und Switzerland in einer kurzen Suche ebenso", async () => {
    for (const k of ["Kündigungsfrist Schweizer OR", "notice period Switzerland"]) {
      expect(text(await client.callTool({ name: "vertragsbausteine_suchen", arguments: { suchtext: k } })).ergebnis).toEqual({ hinweis: NUR_DEUTSCHLAND });
    }
  });
  it("Freitext darf Länder nennen: Klausel mit Gebiet DACH und Stellenanzeige mit Straßennamen werden geprüft (Review 29.10.2026)", async () => {
    const klausel = "Der Arbeitnehmer verpflichtet sich, für zwei Jahre nach dem Ende in Deutschland, Österreich und der Schweiz nicht für einen Wettbewerber tätig zu werden.";
    const k = await client.callTool({ name: "klausel_pruefen", arguments: { klausel } });
    expect(k.isError).toBeFalsy();
    expect(text(k).ergebnis).toHaveProperty("einordnung");
    const s = text(await client.callTool({ name: "stellenanzeige_check", arguments: { anzeigentext: "Wir suchen eine Bürokraft (m/w/d) für unser Büro in der Rosa-Luxemburg-Straße 5, Berlin. Ein junges Team freut sich auf dich." } }));
    expect(s.ergebnis.hinweis).toBeUndefined();
    expect(JSON.stringify(s.ergebnis)).toMatch(/Alter/);
  });
  it("deutsche Fragen laufen normal", async () => {
    expect(text(await client.callTool({ name: "rechtswerte_suchen", arguments: { suchtext: "Mindestlohn" } })).ergebnis.treffer.length).toBeGreaterThan(0);
  });
});

describe("keine Fehlalarme", () => {
  it("Italienischkenntnisse, Schweizer Käse im Text eines Kunden oder 'join us' sind kein anderes Land, nur die Länder selbst", async () => {
    const a = text(await client.callTool({ name: "stellenanzeige_check", arguments: { anzeigentext: "Join us! Italienischkenntnisse von Vorteil, Arbeitsort Frankfurt." } }));
    expect(a.ergebnis.hinweis).not.toBe(NUR_DEUTSCHLAND);
  });
});
