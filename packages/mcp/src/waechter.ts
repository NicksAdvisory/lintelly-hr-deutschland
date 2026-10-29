/**
 * Wächter gegen Hänger (Prüfung 29.10.2026 Punkt 10): Node rechnet eine Anfrage nach der anderen. Hängt eine Rechnung in einer
 * Schleife, steht der ganze Dienst, und kein Zeitlimit im selben Thread kommt mehr dran. Darum zählt der Hauptthread jede Sekunde
 * einen Puls hoch, ein eigener Thread schaut zu. Steht der Puls länger als grenzeMs, beendet er den Prozess hart (SIGKILL,
 * die Behandlung von SIGTERM liefe im hängenden Thread nie), systemd startet ihn nach 3 Sekunden neu (Restart=always).
 * Verloren geht höchstens die Zählung der letzten Minute. Zweite Linie: ops/health-ping.sh startet nach zwei Fehlschlägen neu.
 */
import { Worker } from "node:worker_threads";

// process.getBuiltinModule statt require: der Code läuft so als CommonJS und als ES-Modul (Node ab 22.3).
const CODE = `
const { workerData } = process.getBuiltinModule("node:worker_threads");
const { writeSync } = process.getBuiltinModule("node:fs");
const puls = new Int32Array(workerData.puls);
let zuletzt = Atomics.load(puls, 0), seit = Date.now();
setInterval(() => {
  const n = Atomics.load(puls, 0);
  if (n !== zuletzt) { zuletzt = n; seit = Date.now(); return; }
  if (Date.now() - seit > workerData.grenzeMs) {
    writeSync(2, "Lintelly HR hängt seit " + Math.round((Date.now() - seit) / 1000) + " s, Prozess wird beendet (Neustart durch systemd).\\n");
    process.kill(process.pid, "SIGKILL");
  }
}, 500);
`;

/** Startet den Wächter, gibt die Funktion zum Anhalten zurück. Hält den Prozess nicht am Leben. */
export function waechter(grenzeMs = 30_000): () => void {
  const puls = new SharedArrayBuffer(4);
  const takt = new Int32Array(puls);
  const t = setInterval(() => Atomics.add(takt, 0, 1), 1000);
  t.unref();
  const w = new Worker(CODE, { eval: true, workerData: { puls, grenzeMs } });
  w.unref();
  // Ein Fehler im Wächter darf den Dienst nie mitreißen.
  w.on("error", () => {});
  return () => { clearInterval(t); void w.terminate(); };
}
