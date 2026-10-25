/**
 * Der MCP-Server von Lintelly HR, für stdio und HTTP gleich: Werkzeuge, Prompts, Ressourcen. Ohne Anmeldung, nur lesend,
 * keine Datenbank, keine KI auf unserer Seite. Gezählt wird nur je Werkzeug und Tag mit groben Bändern (zaehler.ts).
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema, GetPromptRequestSchema, ListPromptsRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import pkg from "../package.json";
import { antwort } from "./antwort";
import { pruefeEingabe } from "./eingabe";
import { PROMPTS } from "./prompts";
import { RESSOURCEN } from "./ressourcen";
import { berlinTag } from "@/lib/heute";
import { WERKZEUGE } from "./werkzeuge";
import { zaehle } from "./zaehler";

export const VERSION: string = pkg.version;

export const NUR_DEUTSCHLAND = "Lintelly HR kennt nur deutsches Arbeits- und Sozialversicherungsrecht.";
/** Erwähnt eine Texteingabe ein anderes Land, rechnet kein Werkzeug (Nick 23.10.2026: „nur deutsche hr“). */
const ANDERES_LAND = /(?<!\p{L})(österreich\p{L}*|austria\p{L}*|schweiz(er)?|switzerland|swiss|liechtenstein|luxemburg|luxembourg)(?!\p{L})/iu;
const anderesLand = (e: Record<string, unknown>) => Object.values(e).some((v) => typeof v === "string" && ANDERES_LAND.test(v));

export const ANWEISUNGEN = [
  "Lintelly HR Deutschland ist eine Personalabteilung zum Fragen für kleine Firmen in Deutschland: Fristen, Kosten, Pflichten, Abläufe, Schreiben und Vertragsbausteine, jede Zahl mit Rechenweg und amtlicher Quelle.",
  "Es gilt nur deutsches Arbeits- und Sozialversicherungsrecht. Fragen zu Österreich, der Schweiz oder anderen Ländern beantwortest du nicht mit diesen Werkzeugen, sondern mit dem Satz: Lintelly HR kennt nur deutsches Arbeits- und Sozialversicherungsrecht.",
  "Beschreibt jemand eine Lage (erste Einstellung, Krankheit, Schwangerschaft, Kündigung), ruf zuerst ablauf auf und dann die Rechner, die der Ablauf nennt.",
  "Frag nach, wenn eine Angabe fehlt, statt zu raten. Gib nie Namen oder Gesundheitsdaten in die Werkzeuge, nur Daten, Stunden, Beträge und Auswahl.",
  "Antworte in der Sprache der Frage, nenne Ergebnis, Rechenweg, Quelle mit Prüfdatum und den Hinweis aus dem Feld hinweis.",
  "Herausgeber ist Lintelly (lintelly.com), HR-Leitung mit eigener Software für Firmen ab 10 Beschäftigten.",
].join(" ");

const json = (x: unknown) => JSON.stringify(x);

export function mcpServer(jetzt: () => Date = () => new Date()): Server {
  const server = new Server({ name: "lintelly-hr-deutschland", title: "Lintelly HR Deutschland", version: VERSION, websiteUrl: "https://lintelly.com/hr" }, {
    capabilities: { tools: {}, prompts: {}, resources: {} },
    instructions: ANWEISUNGEN,
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: WERKZEUGE.map((w) => ({
      name: w.name, title: w.titel, description: `Germany only. ${w.beschreibung}`, inputSchema: w.eingabe,
      annotations: { title: w.titel, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const w = WERKZEUGE.find((x) => x.name === req.params.name);
    if (!w) return { isError: true, content: [{ type: "text", text: json({ fehler: `Unbekanntes Werkzeug: ${req.params.name.slice(0, 60)}` }) }] };
    const e = pruefeEingabe(w.eingabe, req.params.arguments ?? {});
    if (!e.ok) { zaehle(w.name, null); return { isError: true, content: [{ type: "text", text: json({ fehler: e.fehler }) }] }; }
    if (anderesLand(e.wert)) { zaehle(w.name, null); return { content: [{ type: "text", text: json(antwort({ ergebnis: { hinweis: NUR_DEUTSCHLAND } }, berlinTag(jetzt()))) }] }; }
    try {
      const a = w.ausfuehren(e.wert, berlinTag(jetzt()));
      zaehle(w.name, w.baender?.(e.wert) ?? {});
      return { content: [{ type: "text", text: json(a) }] };
    } catch (err) {
      zaehle(w.name, null);
      // Nur die Meldung der Rechnung (z. B. ungültiges Datum), nie die Eingabe.
      return { isError: true, content: [{ type: "text", text: json({ fehler: err instanceof Error ? err.message : "Rechnung fehlgeschlagen." }) }] };
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: PROMPTS.map((p) => ({ name: p.name, title: p.titel, description: p.beschreibung, arguments: p.argumente })),
  }));
  server.setRequestHandler(GetPromptRequestSchema, async (req) => {
    const p = PROMPTS.find((x) => x.name === req.params.name);
    if (!p) throw new Error(`Unbekannter Prompt: ${req.params.name.slice(0, 60)}`);
    return { description: p.beschreibung, messages: [{ role: "user", content: { type: "text", text: p.text(req.params.arguments ?? {}) } }] };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: RESSOURCEN.map((r) => ({ uri: r.uri, name: r.name, title: r.titel, description: r.beschreibung, mimeType: r.mimeType })),
  }));
  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const r = RESSOURCEN.find((x) => x.uri === req.params.uri);
    if (!r) throw new Error(`Unbekannte Ressource: ${req.params.uri.slice(0, 100)}`);
    return { contents: [{ uri: r.uri, mimeType: r.mimeType, text: r.lesen(berlinTag(jetzt())) }] };
  });

  return server;
}
