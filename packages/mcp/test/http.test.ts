import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { adressGruppe, bremse } from "../src/bremse";
import { httpServer, MAX_BYTES } from "../src/http";
import { clientBand, EIGEN, stand, zuruecksetzen } from "../src/zaehler";

const KOPF = { "content-type": "application/json", accept: "application/json, text/event-stream" };
const INIT = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } };
let basis = "";
const server = httpServer({ bremse: bremse({ jeAdresse: 3, gesamt: 100, fensterMs: 60_000 }), waechterMs: 0 });
const AUFRUF = { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "rechtswert", arguments: { kennung: "mindestlohn", stichtag: "2027-01-01" } } };
const post = (ip: string, body: unknown, kopf: Record<string, string> = {}) =>
  fetch(`${basis}/mcp`, { method: "POST", headers: { ...KOPF, "x-forwarded-for": ip, ...kopf }, body: JSON.stringify(body) });
beforeAll(() => new Promise<void>((ok) => server.listen(0, "127.0.0.1", () => { basis = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; ok(); })));
afterAll(() => new Promise<void>((ok) => server.close(() => ok())));

describe("HTTP", () => {
  it("/health antwortet mit Version und Zahl der Werkzeuge", async () => {
    const r = await fetch(`${basis}/health`);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, name: "lintelly-hr-deutschland" });
  });
  it("POST /mcp initialize liefert JSON mit Servernamen und Anweisungen", async () => {
    const r = await fetch(`${basis}/mcp`, { method: "POST", headers: { ...KOPF, "x-forwarded-for": "10.0.0.1" }, body: JSON.stringify(INIT) });
    expect(r.status).toBe(200);
    const j = (await r.json()) as any;
    expect(j.result.serverInfo.name).toBe("lintelly-hr-deutschland");
    expect(j.result.instructions).toMatch(/Lintelly/);
  });
  it("tools/call ohne Sitzung", async () => {
    const r = await fetch(`${basis}/mcp`, { method: "POST", headers: { ...KOPF, "x-forwarded-for": "10.0.0.2" }, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "rechtswert", arguments: { kennung: "mindestlohn", stichtag: "2027-01-01" } } }) });
    const j = (await r.json()) as any;
    expect(JSON.parse(j.result.content[0].text).ergebnis.wert).toBe("14,60 €");
  });
  it("GET /mcp ist 405, unbekannter Pfad 404", async () => {
    expect((await fetch(`${basis}/mcp`)).status).toBe(405);
    expect((await fetch(`${basis}/admin`)).status).toBe(404);
  });
  it("Anfragen über 32 KB werden abgelehnt", async () => {
    const r = await fetch(`${basis}/mcp`, { method: "POST", headers: { ...KOPF, "x-forwarded-for": "10.0.0.3" }, body: "x".repeat(MAX_BYTES + 1) });
    expect(r.status).toBe(413);
  });
  it("Bremse je Adresse: der vierte Aufruf in der Minute bekommt 429, eine andere Adresse nicht", async () => {
    const rufe = (ip: string) => fetch(`${basis}/mcp`, { method: "POST", headers: { ...KOPF, "x-forwarded-for": ip }, body: JSON.stringify(INIT) }).then((r) => r.status);
    expect([await rufe("10.0.0.9"), await rufe("10.0.0.9"), await rufe("10.0.0.9"), await rufe("10.0.0.9")]).toEqual([200, 200, 200, 429]);
    expect(await rufe("10.0.0.10")).toBe(200);
  });
  it("Bremse: Fenster leert sich nach einer Minute", () => {
    const b = bremse({ jeAdresse: 1, gesamt: 10, fensterMs: 60_000 });
    expect([b("a", 0), b("a", 1000), b("a", 61_000)]).toEqual([true, false, true]);
  });
  it("Bremse: IPv6 zählt je /64, IPv4 in IPv6 wie IPv4", () => {
    expect(adressGruppe("2001:db8:1:2:aaaa::1")).toBe("2001:db8:1:2::/64");
    expect(adressGruppe("2001:0db8:0001:0002:ffff:ffff:ffff:ffff")).toBe("2001:db8:1:2::/64");
    expect(adressGruppe("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(adressGruppe("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
    expect(adressGruppe("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(adressGruppe("203.0.113.7")).toBe("203.0.113.7");
    const b = bremse({ jeAdresse: 2 });
    expect([b("2001:db8:1:2::1", 0), b("2001:db8:1:2::2", 0), b("2001:db8:1:2:ffff::9", 0), b("2001:db8:1:3::1", 0)]).toEqual([true, true, false, true]);
  });
  it("Bremse über HTTP: wechselnde IPv6-Adressen im selben /64 bekommen 429", async () => {
    const s = [];
    for (const ip of ["2001:db8:5:5::1", "2001:db8:5:5::2", "2001:db8:5:5::3", "2001:db8:5:5::4"]) s.push((await post(ip, INIT)).status);
    expect(s).toEqual([200, 200, 200, 429]);
  });
  it("Bremse: ist die Obergrenze voll, kommen leise Adressen weiter durch, laute nicht", () => {
    const b = bremse({ jeAdresse: 100, gesamt: 10, leise: 3 });
    for (let i = 0; i < 10; i++) b("laut", 0);
    expect(b("laut", 0)).toBe(false);
    expect([b("leise", 0), b("leise", 0), b("leise", 0), b("leise", 0)]).toEqual([true, true, true, false]);
  });
  it("JSON-RPC-Batch (Array) wird mit 400 abgelehnt", async () => {
    const r = await post("10.0.1.1", [INIT, AUFRUF]);
    expect(r.status).toBe(400);
    expect(((await r.json()) as any).error.code).toBe(-32600);
  });
  it("Client-Band aus dem User-Agent", () => {
    expect(clientBand("Claude-User")).toBe("claude");
    expect(clientBand("claude-code/2.1.0")).toBe("claude");
    expect(clientBand("openai-mcp/1.0.0")).toBe("chatgpt");
    expect(clientBand("Cursor/1.7.0")).toBe("cursor");
    expect(clientBand("node")).toBe("andere");
    expect(clientBand(undefined)).toBe("andere");
    expect(clientBand("lintelly-rauchtest")).toBe("test");
  });
  it("tools/call zählt das Client-Band, eigene Tests nur unter _eigen", async () => {
    zuruecksetzen();
    await post("10.0.2.1", AUFRUF, { "user-agent": "openai-mcp/1.0.0" });
    await post("10.0.2.2", AUFRUF, { "user-agent": "lintelly-rauchtest" });
    const z = stand().zahlen;
    expect(z.rechtswert).toEqual({ aufrufe: 1, fehler: 0, baender: { client: { chatgpt: 1 } } });
    expect(z[EIGEN]).toEqual({ aufrufe: 1, fehler: 0, baender: { werkzeug: { rechtswert: 1 } } });
    expect(JSON.stringify(z)).not.toMatch(/openai-mcp|10\.0\.2/);
  });
  it("Wächter beendet einen hängenden Prozess hart", () => {
    const modul = path.resolve(import.meta.dirname, "../src/waechter.ts");
    const code = `import { waechter } from ${JSON.stringify(modul)}; waechter(1000); const t = Date.now(); while (Date.now() - t < 15000) {}`;
    const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8", timeout: 20_000 });
    expect(r.signal).toBe("SIGKILL");
    expect(r.stderr).toMatch(/hängt seit/);
    // Ohne Hänger greift er nicht ein.
    const ruhig = `import { waechter } from ${JSON.stringify(modul)}; waechter(1500); setTimeout(() => process.exit(0), 4000).ref();`;
    expect(spawnSync(process.execPath, ["--input-type=module", "-e", ruhig], { timeout: 20_000 }).status).toBe(0);
  }, 30_000);
});
