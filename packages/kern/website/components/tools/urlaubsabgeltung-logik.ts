/** Reine Logik des Urlaubsabgeltungs-Rechners (§§ 4, 5, 7 Abs. 4, 11 BUrlG). */
import { periodEnd, toYmd } from "./datum";
import { zahl } from "./format";
import { berechneUrlaub } from "./urlaubsanspruch-logik";

/* ---------- reine Logik ---------- */

export type AnspruchErgebnis = {
  anspruch: number;
  art: "voll" | "teil";
  monate: number;
  gesetzlich: number;
  mehr: number;
  begruendung: string;
  wartezeitEnde: Date;
  /** Teilurlaub aus dem Eintrittsjahr, wenn die Wartezeit erst im Austrittsjahr endet (§ 5 Abs. 1 a BUrlG) */
  vorjahrTeil: number;
};

/**
 * Urlaubsanspruch im Austrittsjahr nach §§ 4, 5 BUrlG. Rechnet über den Urlaubsanspruch-Rechner, damit beide Tools
 * gleich umrechnen (Jahresurlaub bei 5-Tage-Woche auf die Tage pro Woche) und gleich runden (jeder Bruchteil auf).
 */
export function anspruchImAustrittsjahr(o: {
  eintritt: Date;
  austritt: Date;
  /** vertraglicher Jahresurlaub bei Vollzeit in der 5-Tage-Woche */
  jahresurlaub: number;
  tageWoche: number;
  mehrZwoelfteln: boolean;
  /** Zusatzurlaub nach § 208 SGB IX */
  schwerbehindert: boolean;
}): AnspruchErgebnis {
  const wartezeitEnde = periodEnd(o.eintritt, 6);
  const jahr = o.austritt.getUTCFullYear();
  // Eintritt im Vorjahr, Wartezeit endet erst im Austrittsjahr: Teilurlaub des Vorjahres ist übertragbar
  // (§ 7 Abs. 3 Satz 4 BUrlG) und wird mit abgegolten (§ 7 Abs. 4 BUrlG).
  const vorjahrTeil =
    o.eintritt.getUTCFullYear() === jahr - 1 && wartezeitEnde.getUTCFullYear() === jahr
      ? berechneUrlaub({ jahresurlaub: o.jahresurlaub, bezug: 5, tage: o.tageWoche, jahr: jahr - 1, eintritt: toYmd(o.eintritt), schwerbehindert: o.schwerbehindert, mehrRegel: o.mehrZwoelfteln ? "anteilig" : "wie-gesetz" }).gesamt
      : 0;
  const r = berechneUrlaub({
    jahresurlaub: o.jahresurlaub,
    bezug: 5,
    tage: o.tageWoche,
    jahr: o.austritt.getUTCFullYear(),
    eintritt: toYmd(o.eintritt),
    austritt: toYmd(o.austritt),
    schwerbehindert: o.schwerbehindert,
    mehrRegel: o.mehrZwoelfteln ? "anteilig" : "wie-gesetz",
  });
  const teil = r.fall !== "voll" && r.fall !== "voll-mehr-anteilig";
  const umgerechnet = o.tageWoche !== 5 ? `Umgerechnet auf ${zahl(o.tageWoche)} Tage pro Woche: ${zahl(o.jahresurlaub)} × ${zahl(o.tageWoche)} ÷ 5 = ${zahl(r.mehr.jahr + r.gesetzlich.jahr)} Tage im ganzen Jahr. ` : "";
  // § 6 Abs. 1 BUrlG: Urlaub, den ein früherer Arbeitgeber im selben Jahr gewährt hat, wird angerechnet
  const sechs = !teil && toYmd(o.eintritt) > `${o.austritt.getUTCFullYear()}-01-01` ? " Hat die Person in diesem Jahr schon bei einem früheren Arbeitgeber Urlaub bekommen, wird er angerechnet (§ 6 Abs. 1 BUrlG). Lass dir die Urlaubsbescheinigung zeigen." : "";
  const grund = r.fall === "teil-erste-haelfte"
    ? "Austritt in der ersten Jahreshälfte (bis 30.06.). Es gibt Teilurlaub: 1/12 je vollem Beschäftigungsmonat im Austrittsjahr (§ 5 Abs. 1 c BUrlG)."
    : teil
    ? "Die Wartezeit von 6 Monaten (§ 4 BUrlG) ist bis zum Austritt nicht erfüllt. Es gibt Teilurlaub: 1/12 je vollem Beschäftigungsmonat (§ 5 Abs. 1 b BUrlG)."
    : o.mehrZwoelfteln
    ? `Austritt in der zweiten Jahreshälfte nach erfüllter Wartezeit: Der gesetzliche Mindesturlaub steht voll zu. Den Urlaub über dem gesetzlichen Minimum gibt es laut Vertrag nur anteilig: 1/12 je vollem Monat.${sechs}`
    : `Austritt in der zweiten Jahreshälfte nach erfüllter Wartezeit: Der volle Jahresurlaub steht zu (§ 5 Abs. 1 BUrlG greift nicht).${sechs}`;
  return {
    anspruch: r.gesamt,
    art: teil ? "teil" : "voll",
    monate: teil ? r.gesetzlich.zwoelftel : r.mehr.zwoelftel,
    gesetzlich: r.gesetzlich.wert,
    mehr: r.mehr.wert,
    begruendung: umgerechnet + grund,
    wartezeitEnde,
    vorjahrTeil,
  };
}

/** Tagessatz nach § 11 BUrlG: Verdienst der letzten 13 Wochen ÷ (13 × Arbeitstage pro Woche). */
export function tagessatz(verdienst13: number, tageWoche: number) {
  return verdienst13 / (13 * tageWoche);
}

/**
 * Paragrafen aus dem Fließtext in den Rechenweg (UX-Review 28.10.2026): Der Hinweis liest sich ohne Klammern,
 * die Fundstellen stehen gesammelt darunter. "(§ 5 Abs. 1 c BUrlG)" wird aus dem Text genommen und gemerkt.
 */
export function ohneParagrafen(t: string): { text: string; paragrafen: string[] } {
  const paragrafen: string[] = [];
  const text = t
    .replace(/\s*\((§[^()]*)\)/g, (_, p: string) => {
      if (!paragrafen.includes(p)) paragrafen.push(p);
      return "";
    })
    .replace(/\s+([.,:])/g, "$1");
  return { text, paragrafen };
}
