# Changelog

Versionen nach SemVer. Jede Version geht über die Release-Pipeline auf npm, ghcr.io und hr.lintelly.com.

## Unveröffentlicht (Zweig mcp-fixes-29-10)

### Kern auf Stand 29.10.2026 (Werkbank main, lintelly.com main)

- `packages/kern` wieder gleich mit den Quellen (`node scripts/abgleich.mjs --pruefen`: 0 Abweichungen). Neu auf der Kopierliste: `lib/dokumente/englisch`, `lib/vertragsbausteine/kanzlei`, `lib/vertragsbausteine/eingabe`, `lib/workflows/bauen`, `components/tools/sensibel` und die Website-Tests `test-ux-fristen`, `test-ux-geld`, `test-ux-pflichten`, `test-ux-trennung`.
- `lib/fehler.ts` der Werkbank kommt nur als Auszug (`logFehler` auf stderr): Das Original legt `data/logs/fehler.log` an, der MCP schreibt beim Nutzer keine Dateien. Der Grenztest prüft das jetzt auch für `packages/kern`.
- Rechtswerte-Register mit 217 öffentlichen Werten, 127 Vertragsbausteine.
- Übernommen aus den Korrekturen von lintelly.com vom 28.10.2026 (stille Fehlergebnisse):
  - Probezeit: Gespräch und Entscheidung nie vor dem ersten Arbeitstag, Probezeit länger als die Befristung ist ein Fehler, Meldung nennt den erlaubten Bereich.
  - Sonderkündigungsschutz: Schwerbehinderung unter 6 Monaten ohne Zustimmungsschritte, nur Anhörung und Anzeige.
  - Abfindung: Faktor 2,0 in der Spanne, Höchstbetrag ohne Alter als Hinweis statt als Tatsache, weiche Hinweise bei über 50 Jahren Zugehörigkeit und Gehalt unter 500 €, „Kein gesetzlicher Anspruch“ als neutraler Hinweis.
  - Elternzeit: Hinweis, wenn die Antragsfrist schon vorbei ist, mit frühestem Beginn ab heute.
  - Entgeltfortzahlung: Krankengeld auch für die Wartezeit, „wieder volle 6 Wochen“ mit „seit“ für vergangene Daten, Hinweis bei mehr als 78 Wochen.
  - Minijob: sagt, ob der Monat oder erst die Einmalzahlung die Grenze reißt.
  - Ausgleichsabgabe: Besetzung in Worten, Hinweis bei mehr Schwerbehinderten als Arbeitsplätzen.
  - Aufbewahrung: nur ein Datum der Betriebsprüfung ist ein Fehler, bei Entgeltunterlagen gilt die längere steuerliche Frist, die SV-Frist steht im Rechenweg.
  - BEM: Abstand zur näheren Grenze („noch 1 Arbeitstag“ statt Kalendertage), Hinweis auf Hochrechnung bei Stichtag in der Zukunft.
  - Schwellenwerte: Zählbasis zur nächsten Schwelle, wenn sie nicht die Kopfzahl ist.
  - Pausen: Beginn gleich Ende wird abgelehnt, Tage mit Eingabefehler fallen nicht mehr still weg.
  - Urlaubsanspruch: Wechsel der Arbeitstage außerhalb des Beschäftigungszeitraums ist ein Fehler.
  - Stellenanzeige: keine Fehlalarme mehr bei „Kein Foto nötig“, „junge Familien“, „Kinder unter 12 Jahren“.

## 0.2.2

- Werkzeugbeschreibungen ohne Verweise auf andere Werkzeuge und ohne Anweisungen an das Modell (Richtlinie des Anthropic-Verzeichnisses). Die Reihenfolge steht weiter in den Server-Anweisungen und in den Skills des Plugins.

## 0.2.1

- Kein Hinweis mehr auf Lintelly-Angebote in den Antworten: das Feld `lintelly`, die Sätze im Feld `hinweis` und die Server-Anweisung dazu sind entfernt (Vorgabe des Anthropic-Verzeichnisses gegen werbliche Inhalte). Der Herausgeber steht weiter in jeder Antwort.

## 0.2.0

- Neuer Name: Lintelly HR Deutschland. Repo NicksAdvisory/lintelly-hr-deutschland, npm @lintelly/hr-deutschland (vorher @lintelly/hr-mcp), MCP Registry com.lintelly/hr-deutschland (vorher com.lintelly/hr), Docker ghcr.io/nicksadvisory/lintelly-hr-deutschland. Die Adresse hr.lintelly.com/mcp bleibt.
- Nur deutsches Arbeits- und Sozialversicherungsrecht: jede Werkzeugbeschreibung beginnt mit „Germany only“, Fragen zu Österreich, der Schweiz und anderen Nachbarländern beantwortet der Server mit einem Hinweis statt einer Rechnung.
- Rechtswerte aus dem Rechtsradar vom 23.10.2026 übernommen (Minijob-Pauschale ab 2027 ausstehend, Mindestausbildung geprüft).

## 0.1.3

- Erstes npm-Paket `@lintelly/hr-mcp` (0.1.2 kam wegen des Tokens nicht auf npm).
- GitHub Actions auf neue Versionen, Stammdaten und HR-Icon für Verzeichnisse.

## 0.1.2

- npm-Paket `@lintelly/hr-mcp` für den lokalen Start über stdio (`npx -y @lintelly/hr-mcp`).
- Monatlicher Abgleich mit Werkbank und lintelly.com und Kennzahlen per Telegram (ops/).

## 0.1.1

- Der Hinweis auf menschliche Prüfung bei Vertrag, Kündigung und Abmahnung steht jetzt auch im Feld `hinweis`, das Assistenten zuverlässig weitergeben.

## 0.1.0

Erste Version von Lintelly HR (23.10.2026).

- Offener MCP-Server ohne Anmeldung, über stdio (Docker, ghcr.io) und Streamable HTTP (`https://hr.lintelly.com/mcp`).
- Alle 24 Werkzeuge von lintelly.com/tools, die Werkzeuge aus dem Wissen-Konzept, zehn Abläufe mit Daten, alle 126 Vertragsbausteine mit Text,
  Generatoren für Kündigungsschreiben, Abmahnung und Arbeitszeugnis, Rechtswerte mit Quelle und Prüfdatum.
- Vier Prompts (HR-Sprechstunde, Erste Einstellung, Jemand ist krank, Kündigung vorbereiten), Ressourcen (Rechtswerte als JSON, Abläufe als Markdown).
- Claude-Plugin mit fünf Skills und dem Befehl `/hr-woche`.
- Keine Personendaten: nur Zähler je Werkzeug und Tag mit groben Bändern.
