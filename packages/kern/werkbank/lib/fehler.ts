/** Auszug aus lib/fehler.ts der Werkbank: nur logFehler, ohne Log-Datei, nur stderr (scripts/abgleich.mjs). */
export function logFehler(ort: string, e: unknown) {
  const status = (e as { status?: number })?.status;
  ausgeben(`[${ort}] ${art(e)}${status ? ` ${status}` : ""} ${stelle(e)}`);
}

const art = (e: unknown) => (e instanceof Error ? e.name : typeof e);
const stelle = (e: unknown) => (e instanceof Error ? (e.stack ?? "").split("\n")[1]?.trim().replace(/\(.*[\\/](lib|app|components)[\\/]/, "($1/") ?? "" : "");
const ausgeben = (zeile: string) => console.error(zeile);
