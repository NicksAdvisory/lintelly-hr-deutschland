#!/usr/bin/env node
// Rauchtest gegen einen laufenden Server: initialize, tools/list, jedes Werkzeug einmal mit dem Beispiel aus
// scripts/beispiele.json, Antwortzeit je Aufruf unter 2 Sekunden, kein Fehler und kein Feld fehler im Ergebnis.
// Aufruf: node scripts/rauchtest.mjs https://hr.lintelly.com/mcp. User-Agent aus RAUCHTEST_USER_AGENT, damit der Zähler Testaufrufe erkennt.
import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.argv[2] ?? "http://127.0.0.1:8787/mcp";
const beispiele = JSON.parse(readFileSync(new URL("./beispiele.json", import.meta.url), "utf8"));
const client = new Client({ name: "lintelly-hr-rauchtest", version: "1" });
const headers = { "User-Agent": process.env.RAUCHTEST_USER_AGENT ?? "lintelly-rauchtest" };
await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } }));

const fehler = [];
const { tools } = await client.listTools();
for (const t of tools) {
  const eingabe = beispiele[t.name];
  if (!eingabe) { fehler.push(`${t.name}: kein Beispiel`); continue; }
  const start = performance.now();
  const r = await client.callTool({ name: t.name, arguments: eingabe });
  const ms = Math.round(performance.now() - start);
  const a = r.isError ? null : JSON.parse(r.content[0].text);
  if (!a || a.herausgeber !== "Lintelly, lintelly.com") fehler.push(`${t.name}: ${r.isError ? r.content[0].text : "Antwortformat"}`);
  else if (a.ergebnis?.fehler !== undefined) fehler.push(`${t.name}: Fehler im Ergebnis ${JSON.stringify(a.ergebnis.fehler)}`);
  if (ms > 2000) fehler.push(`${t.name}: ${ms} ms`);
}
await client.close();
console.log(`${tools.length} Werkzeuge geprüft gegen ${url}`);
if (fehler.length) { console.error(fehler.join("\n")); process.exit(1); }
