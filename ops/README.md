# Betrieb auf ops-01

hr.lintelly.com läuft auf ops-01 (nie auf dem Kunden-Server), hinter Caddy, als systemd-Dienst `lintelly-hr` auf 127.0.0.1:3610.

| Datei | Ziel auf ops-01 |
|---|---|
| `lintelly-hr.service` | `/etc/systemd/system/lintelly-hr.service` |
| `lintelly-hr.caddy` | `/etc/caddy/lintelly-hr.caddy`, im Caddyfile `import /etc/caddy/lintelly-hr.caddy` |
| `ausrollen.sh` | `~/lintelly-hr/ausrollen.sh`, cron `*/10 * * * *`; gescheiterte Releases in `gescheitert` (übersprungen bis zum nächsten Release, zum erneuten Versuch Zeile löschen) |
| `health-ping.sh` | `~/lintelly-hr/health-ping.sh`, cron `*/5 * * * *`: prüft tools/list direkt und /health von außen, startet nach zwei Fehlschlägen neu |
| `abgleich.sh` | `~/lintelly-hr/abgleich.sh`, cron `10 5 * * *` (täglich, seit 29.10.2026): Werkbank und Website holen, Kern abgleichen, Patch-Version; grün (npm ci, check, build) wird jede Kern-Änderung gemergt, rot bleibt der PR offen. Probelauf: `abgleich.sh --probe` |
| `kennzahlen.mjs` | `~/lintelly-hr/kennzahlen.mjs`, cron `0 9 1 * *` (1. des Monats): Kennzahlen des Vormonats per Telegram, mit Kanal, ohne eigene Tests |

Ordner `~/lintelly-hr/`: `releases/<tag>/` (die letzten fünf), `aktuell` (Verweis), `zaehler/<tag>.json` (Zähler je Tag), `env` (optional,
z. B. `OPENAI_APPS_CHALLENGE=...` für den Domain-Nachweis bei OpenAI).

Ausrollen: Ein Release auf GitHub (`.github/workflows/release.yml`) legt `lintelly-hr-mcp-server.mjs` und die Prüfsumme an.
`ausrollen.sh` holt es, prüft die Prüfsumme, schaltet um, startet neu, prüft `/health` und springt sonst zurück. Telegram meldet beides.
Kein Zugriffslog in Caddy, der Dienst schreibt keine Eingaben. Bremse im Dienst: 300 je Minute je Adresse (IPv6 je /64), Obergrenze
6.000 je Minute, die nur Adressen mit mehr als 60 Aufrufen bremst. JSON-RPC-Sammelanfragen bekommen 400.

Hänger: der Wächter im Dienst beendet den Prozess nach 30 s ohne Puls, systemd startet ihn neu (`Restart=always`); zweite Linie ist
`health-ping.sh`. Eigene Tests schicken einen User-Agent, der mit `lintelly-` beginnt (Rauchtest: `lintelly-rauchtest`), sie zählen
unter `_eigen` in der Tagesdatei und nicht als Nutzung.
