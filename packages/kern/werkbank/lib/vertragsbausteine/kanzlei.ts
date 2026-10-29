/**
 * Die fünf wichtigsten Fragen an die Kanzlei zu den Vertragsbausteinen (Katalog Abschnitt 10) und die Bausteine, an denen sie hängen.
 * Erscheinen auf der Seite Rechtswerte unter „Für die Kanzlei“. Keine Rechtsberatung.
 */
export const KANZLEI_FRAGEN: { titel: string; frage: string; bausteine: string[] }[] = [
  { titel: "Provision bei Arbeitnehmern", bausteine: ["D5", "D6", "D8", "D9", "D13"],
    frage: "Gilt § 65 HGB mit §§ 87 bis 87c HGB auch für Arbeitnehmer, die keine Handlungsgehilfen sind (zum Beispiel Recruiter oder Account Manager in der Dienstleistung)? Welche Teile sind unabdingbar (Abrechnung, Buchauszug, Fälligkeit, Schutz bei Storno)? Wie lang darf die Haftungszeit bei Storno sein?" },
  { titel: "Zielvereinbarung und Zielvorgabe", bausteine: ["D2", "D3", "D14"],
    frage: "Ist die Ersatzregel „Fortschreibung der Vorjahresziele“ oder „volle Zielerreichung“ bei fehlender Zielvereinbarung nach BAG 10 AZR 171/23 (Aktenzeichen prüfen) und 10 AZR 57/24 sicher? Wie ist ein Wechsel auf Zielvorgabe zu fassen, falls der Arbeitgeber ihn braucht?" },
  { titel: "Freiwilligkeits- und Widerrufsvorbehalt", bausteine: ["D21", "D22", "D24"],
    frage: "Welche Grenze gilt für den widerruflichen Anteil an der Gesamtvergütung (ein Viertel, bei Aufwendungsersatz knapp ein Drittel), und wie zählen Dienstwagen und Homeoffice-Zuschuss? Wie lautet der Satz zu Individualabreden nach BAG 10 AZR 109/22?" },
  { titel: "Nachvertragliches Wettbewerbsverbot und Kundenschutz", bausteine: ["M2", "M3", "N2", "H2"],
    frage: "Wie wird die Karenzentschädigung bei schwankenden variablen Bezügen, Sachbezügen und Beteiligungen berechnet? Wie ist der Verzicht des Arbeitgebers zu fassen, wie die Vertragsstrafe nach § 75c HGB, und wann wird eine Verschwiegenheitsklausel zum verdeckten Wettbewerbsverbot?" },
  { titel: "Rückzahlung von Fortbildungskosten", bausteine: ["L2", "L3", "L4", "L5"],
    frage: "Welche Staffel der Bindungsdauer ist verbindlich (Faustformel mit Aktenzeichen), ist der Ausnahmenkatalog nach BAG 9 AZR 260/21 vollständig, und wie werden Studiengänge, Umzugskosten und Einstiegsprämien behandelt?" },
];

/* ---------- Bestätigung durch die Kanzlei (10.10.2026) ---------- */

/** Was die Kanzlei bestätigt hat: ein gelber Baustein in genau einer Version oder ein Wert aus dem Register der Rechtswerte. */
export type KanzleiFreigabe = { id: string; art: "baustein" | "register"; kennung: string; kanzlei: string; datum: string; notiz: string; von: string };
/** Schlüssel einer Freigabe: Baustein, Version und "+en", weil die Version die englische Fassung einschließt (Nick 23.10.2026). Ältere Freigaben "D5@1" galten nur dem deutschen Text. */
export const bausteinSchluessel = (id: string, version: number) => `${id}@${version}+en`;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
/** Eingabe der Bestätigung prüfen: Name der Kanzlei, Datum (nicht in der Zukunft), Notiz. Gibt den Fehlertext oder null zurück. */
export function pruefeKanzleiEingabe(e: { kanzlei: string; datum: string; notiz: string }, heute: string): string | null {
  if (e.kanzlei.trim().length < 2 || e.kanzlei.trim().length > 80) return "Bitte den Namen der Kanzlei eintragen (2 bis 80 Zeichen).";
  if (!ISO.test(e.datum) || Number.isNaN(Date.parse(e.datum))) return "Bitte das Datum der Bestätigung angeben.";
  if (e.datum > heute) return "Das Datum der Bestätigung darf nicht in der Zukunft liegen.";
  if (e.notiz.length > 400) return "Die Notiz ist zu lang (höchstens 400 Zeichen).";
  return null;
}
