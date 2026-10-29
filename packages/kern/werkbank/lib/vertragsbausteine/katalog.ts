/**
 * Der Katalog: alle 127 Bausteine der Gruppen A bis S, die allgemeinen Regeln und die Sperrkombinationen an einer Stelle.
 * Jeder Baustein bekommt automatisch das Feld „Eigene Ergänzung“: Was dort steht, ist ungeprüft (P-003) und wird gegen die rote Liste gelesen.
 */
import type { Baustein, Feld, Regel } from "./typen";
import { BAUSTEINE_A } from "./gruppe-a";
import { BAUSTEINE_BC } from "./gruppe-bc";
import { BAUSTEINE_D_FEST } from "./gruppe-d-fest";
import { BAUSTEINE_D_VARIABEL } from "./gruppe-d-variabel";
import { BAUSTEINE_EFGH } from "./gruppe-efgh";
import { BAUSTEINE_IJK } from "./gruppe-ijk";
import { BAUSTEINE_LMN } from "./gruppe-lmn";
import { BAUSTEINE_OPQS } from "./gruppe-opqs";
import { allgemeineRegeln } from "./allgemein";

export const ERGAENZUNG: Feld = { id: "ergaenzung", label: "Eigene Ergänzung (optional, wird als ungeprüft markiert)", typ: "lang", hinweis: "Freier Text läuft nicht durch die Regeln des Bausteins. Lintelly liest ihn nur gegen die Liste gesperrter Klauseln." };

const sortierung = (b: Baustein) => `${b.gruppe}${String(Number(b.id.slice(1))).padStart(3, "0")}`;

export const BAUSTEINE: Baustein[] = [
  ...BAUSTEINE_A, ...BAUSTEINE_BC, ...BAUSTEINE_D_VARIABEL, ...BAUSTEINE_D_FEST, ...BAUSTEINE_EFGH, ...BAUSTEINE_IJK, ...BAUSTEINE_LMN, ...BAUSTEINE_OPQS,
].map((b) => ({ ...b, felder: b.felder.some((f) => f.id === ERGAENZUNG.id) ? b.felder : [...b.felder, ERGAENZUNG] }))
  .sort((a, b) => sortierung(a).localeCompare(sortierung(b)));

export const BAUSTEIN: Record<string, Baustein> = Object.fromEntries(BAUSTEINE.map((b) => [b.id, b]));

/** Alle Regeln: an Bausteinen und allgemein. Jede Kennung genau einmal. */
export const REGELN: Regel[] = [...allgemeineRegeln(BAUSTEIN), ...BAUSTEINE.flatMap((b) => b.regeln ?? [])];


/** Für den Dialog: Daten ohne Funktionen (Client-Komponente). */
export type BausteinInfo = Pick<Baustein, "id" | "gruppe" | "label" | "risiko" | "passt" | "felder" | "normen" | "stichwoerter" | "ersetzt" | "fuer"> & { nass: boolean; befristung: boolean };
export const bausteinInfo = (b: Baustein): BausteinInfo => ({ id: b.id, gruppe: b.gruppe, label: b.label, risiko: b.risiko, passt: b.passt, felder: b.felder, normen: b.normen, stichwoerter: b.stichwoerter, ersetzt: b.ersetzt, fuer: b.fuer, nass: !!b.nass, befristung: !!b.befristung });
