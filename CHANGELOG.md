# Changelog

Versionen nach SemVer. Jede Version geht über die Release-Pipeline auf npm, ghcr.io und hr.lintelly.com.

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
