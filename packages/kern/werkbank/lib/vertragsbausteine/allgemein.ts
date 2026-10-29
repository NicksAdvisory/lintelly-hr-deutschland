/**
 * Allgemeine Prüfregeln (Katalog Abschnitt 8.1 und 8.8): Form und Unterschrift, Kanzleifreigabe, Freitext, Textform, Tatsachenbestätigung,
 * Betriebsrat, widersprüchliche Zahlen, Jugendliche, Teilzeit. Dazu K-38 und die rote Liste für freie Ergänzungen.
 * Die Regeln an einzelnen Bausteinen stehen in den Gruppendateien.
 */
import { WERTE } from "@/lib/regeln/werte";
import type { Baustein, Lage, Regel } from "./typen";
import { hat, leer, minderjaehrig, num, regel, wert, wenn } from "./hilfen";
import { antwortZuRot, findeGesperrte, ROTE_LISTE } from "./rot";
import { bausteinSchluessel } from "./kanzlei";

/** Freie Ergänzungen aller gewählten Bausteine mit Kennung. */
export const ergaenzungen = (l: Lage) => Object.entries(l.auswahl).map(([id, w]) => ({ id, text: (w.ergaenzung ?? "").trim() })).filter((x) => x.text);

/** Bausteine, die bei Jugendlichen gesperrt sind (P-100). */
export const JUGEND_GESPERRT = ["C2", "C7", "C8", "C10", "M1", "M2", "M3", "M4", "N1", "N2", "L2"];
/** Gruppen mit kollektivem Bezug, bei denen ein Betriebsrat mitbestimmt (P-008). */
const MITBESTIMMT = ["C", "D", "J"];

export function allgemeineRegeln(baustein: Record<string, Baustein>): Regel[] {
  const gewaehlt = (l: Lage) => Object.keys(l.auswahl).map((id) => baustein[id]).filter((b): b is Baustein => !!b);
  return [
    regel("P-001", "pflicht", "Baustein mit Schriftformpflicht: Original mit Unterschrift beider Seiten", "§ 14 Abs. 4 TzBfG, § 74 Abs. 1 HGB, § 41 SGB VI", [], (l) => {
      const nass = gewaehlt(l).filter((b) => b.nass);
      return wenn(nass.length > 0, `Unterschrift im Original nötig wegen ${nass.map((b) => `${b.id} ${b.label}`).join(", ")}. Lintelly stellt die Signatur auf „Original“${nass.some((b) => b.id === "M2" || b.id === "M3") ? " und legt ein Übergabeprotokoll für die vom Arbeitgeber unterschriebene Urkunde an" : ""}.`);
    }),
    regel("P-002", "warnung", "Gelber Baustein ohne Freigabe der Kanzlei für diese Version", "Hausregel", [], (l) => {
      const offen = gewaehlt(l).filter((b) => b.risiko === "gelb" && !l.freigaben?.[bausteinSchluessel(b.id, b.version)]);
      return wenn(offen.length > 0, `Kanzlei prüfen: ${offen.map((b) => `${b.id} (Version ${b.version})`).join(", ")} ist noch nicht von eurer Kanzlei freigegeben. Export nur nach Bestätigung.`);
    }),
    regel("P-003", "warnung", "Freitext in einem strukturierten Baustein ist ungeprüft", "Hausregel", [], (l) => {
      const frei = ergaenzungen(l);
      return wenn(frei.length > 0, `Ungeprüft: eigene Ergänzung in ${frei.map((x) => x.id).join(", ")}. Die Regeln des Bausteins laufen für diesen Text nicht.`);
    }),
    regel("P-004", "sperre", "Anzeigen und Erklärungen der Person an Schriftform gebunden", "§ 309 Nr. 13 BGB", [], (l) => {
      const f = ergaenzungen(l).find((x) => /schriftlich\s+(anzuzeigen|mitzuteilen|geltend|zu beantragen|einzureichen|zu melden)|der schriftform bedarf|bedürfen der schriftform/i.test(x.text));
      return f ? `In ${f.id}: Erklärungen der Person dürfen höchstens an die Textform gebunden werden, nicht an die Schriftform. Schreibe „in Textform“.` : null;
    }),
    regel("P-005", "hinweis", "Tatsachenbestätigung gehört auf die Empfangsseite", "§ 309 Nr. 12 BGB", [], (l) => {
      const f = ergaenzungen(l).find((x) => /(bestätigt|bestätige)[^.]{0,80}(erhalten|gelesen|ausgehändigt)/i.test(x.text));
      return f ? `In ${f.id}: Die Bestätigung, etwas erhalten zu haben, wird auf die Empfangsseite mit eigener Unterschrift verschoben (Baustein Q7).` : null;
    }),
    regel("P-006", "warnung", "Betriebsrat vorhanden, aber kein Hinweis auf Betriebsvereinbarungen", "§ 2 Abs. 1 Satz 2 Nr. 15 NachwG", [],
      (l) => wenn(l.firma.betriebsrat && !hat(l, "Q3") && !hat(l, "Q2"), "Eure Firma hat einen Betriebsrat. Der Vertrag nennt keine Betriebsvereinbarungen: Baustein Q3 ergänzen.")),
    regel("P-104", "sperre", "Betriebsrat ohne Betriebsvereinbarung: Baustein mit Mitbestimmung", "§ 87 Abs. 1 Nr. 6, 12 und 14 BetrVG", [], (l) => {
      const x = Object.keys(l.auswahl).filter((id) => l.firma.ohneBv?.includes(id));
      return wenn(l.firma.betriebsrat && x.length > 0, `Eure Firma hat einen Betriebsrat, aber noch keine Betriebsvereinbarung zu ${x.join(", ")}. Erst die Vereinbarung abschließen, dann den Baustein nehmen.`);
    }),
    regel("P-008", "hinweis", "Betriebsrat und Baustein mit Mitbestimmung", "§ 87 Abs. 1 BetrVG", [], (l) => {
      const mb = gewaehlt(l).filter((b) => MITBESTIMMT.includes(b.gruppe));
      return wenn(l.firma.betriebsrat && mb.length > 0, `Mitbestimmung des Betriebsrats prüfen bei ${mb.map((b) => b.id).join(", ")} (Arbeitszeit, Entlohnung, technische Überwachung).`);
    }),
    regel("P-009", "warnung", "Zwei Bausteine nennen für dieselbe Größe verschiedene Zahlen", "§ 305c Abs. 2 BGB", [], (l) => {
      const paare: [string, string, string, string, string][] = [
        ["C1", "ausgleichMonate", "C3", "ausgleichMonate", "Ausgleichszeitraum"],
        ["D5", "abrechnungMonate", "D13", "abrechnungMonate", "Abrechnungszeitraum der Provision"],
        ["P3", "fristMonate", "A7", "fristMonate", "Kündigungsfrist"],
      ];
      const w = paare.find(([a, fa, b, fb]) => hat(l, a) && hat(l, b) && num(l, a, fa) !== null && num(l, b, fb) !== null && num(l, a, fa) !== num(l, b, fb));
      return w ? `${w[4]}: ${w[0]} und ${w[2]} nennen verschiedene Zahlen. Unklare Klauseln gehen zu Lasten des Arbeitgebers, eine Zahl wählen.` : null;
    }),
    regel("P-100", "sperre", "Person unter 18: Bausteine mit Mehrarbeit, Bereitschaft, Wettbewerb, Strafe und Rückzahlung gesperrt", "JArbSchG, § 74a Abs. 2 HGB", [], (l) => {
      const x = Object.keys(l.auswahl).filter((id) => JUGEND_GESPERRT.includes(id));
      return wenn(minderjaehrig(l) && x.length > 0, `Die Person ist unter ${WERTE.jugendlicheBisJahre.wert} Jahre alt. Gesperrt: ${x.join(", ")}. Arbeitszeit, Pausen und Nachtruhe richten sich nach dem JArbSchG.`);
    }),
    // P-101 ist ein Entwicklungsfehler, kein Befund im Vertrag: der Test prüft, dass keine Rechtszahl außerhalb von lib/regeln/werte.ts steht.
    regel("P-101", "hinweis", "Zahl aus Rechtsprechung oder Gesetz nicht im Register (Entwicklungsfehler, Test)", "Hausregel, tests/register.test.ts", [], () => null),
    regel("P-102", "warnung", "Teilzeit: Zahlung nicht anteilig ohne sachlichen Grund", "§ 4 TzBfG", [], (l) => {
      const ids = Object.entries(l.auswahl).filter(([, w]) => (w.teilzeit ?? "").startsWith("nicht anteilig") && leer(w.teilzeitGrund)).map(([id]) => id);
      return wenn(ids.length > 0, `In ${ids.join(", ")} bekommen Teilzeitkräfte nicht den anteiligen Betrag, ohne sachlichen Grund. Das verstößt gegen das Benachteiligungsverbot.`);
    }),
    regel("K-38", "warnung", "Widersprüchliche Fristen: Ausschlussfrist und Beanstandungsfrist der Provisionsabrechnung mit Verfall", "§ 305c Abs. 2, § 307 BGB", ["Q1", "D13"],
      (l) => wenn(hat(l, "Q1") && hat(l, "D13") && wert(l, "D13", "verfall") === "ja", "Die Beanstandungsfrist in D13 lässt Rechte verfallen und läuft neben der Ausschlussfrist in Q1. Nur eine Frist mit Verfall vorsehen.")),
    ...ROTE_LISTE.map((r) => regel(r.id, "sperre", `Gesperrte Klausel: ${r.klausel}`, r.grund, [], (l) => {
      const f = ergaenzungen(l).find((x) => findeGesperrte(x.text).some((y) => y.id === r.id));
      return f ? `In ${f.id}: ${antwortZuRot(r)}` : null;
    })),
  ];
}
