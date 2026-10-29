# Datenschutz bei Lintelly HR

Entwurf für den Abschnitt in https://lintelly.com/datenschutz (bindend ist die Datenschutzerklärung dort; die Kanzlei prüft nachträglich).

**Was Lintelly HR verarbeitet.** Wenn ein Assistent (Claude, ChatGPT oder ein anderer) ein Werkzeug von Lintelly HR aufruft, schickt er
die Eingaben des Werkzeugs an https://hr.lintelly.com/mcp: Daten, Stunden, Beträge und Auswahlfelder. Die Werkzeuge haben keine Felder für
Namen. Zwei Werkzeuge lesen längeren Text (Klausel, Stellenanzeige): Der Text wird nur im Arbeitsspeicher gelesen und weder gespeichert noch geloggt.

**Was gespeichert wird.** Je Tag und Werkzeug die Zahl der Aufrufe und Fehler und grobe Bänder: Firmengröße (1, 2 bis 4, 5 bis 9, 10+),
Beschäftigungsart, Bundesland, Art des Ablaufs. Keine Eingaben, keine Beträge, keine Daten, keine Adressen. Die IP-Adresse steht höchstens
60 Sekunden im Arbeitsspeicher der Bremse (Schutz vor Überlastung) und wird nicht geschrieben. Der Webserver führt für hr.lintelly.com kein Zugriffslog.

**Wo.** Server in Deutschland (Hetzner, ops-01). Keine Weitergabe, keine KI auf unserer Seite.

**Rechtsgrundlage.** Art. 6 Abs. 1 lit. f DSGVO (Betrieb und Schutz des Dienstes, anonyme Nutzungszahlen).

**Frist merken.** Wer sich per Mail erinnern lässt, tut das auf lintelly.com mit Double-Opt-in; dafür gilt der Abschnitt „Frist merken“.

**Der Assistent.** Was du in Claude oder ChatGPT schreibst, verarbeitet der Anbieter des Assistenten nach seinen eigenen Bedingungen.
