#!/bin/bash
# Health-Ping für hr.lintelly.com (cron alle 5 Minuten). Seit 29.10.2026 (Prüfung Punkt 10) heilt er selbst:
# Geprüft wird der Dienst direkt (POST tools/list an 127.0.0.1:3610/mcp, höchstens 5 s) und von außen (https://hr.lintelly.com/health).
# Zwei Fehlschläge in Folge: hängt der Dienst selbst, startet der Ping ihn neu (sudo -n systemctl restart), danach bei jedem
# zweiten weiteren Fehlschlag wieder. Telegram nur einmal je Ausfall und einmal, wenn alles wieder antwortet.
# Stand in health.stand: Zahl der Fehlschläge in Folge (0 = in Ordnung).
set -uo pipefail
D=${LINTELLY_HR_ORDNER:-$HOME/lintelly-hr}
S=$D/health.stand
. "${TELEGRAM_ENV:-$HOME/n8n/telegram.env}"
melde() { curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" -d chat_id="$TELEGRAM_CHAT_ID" --data-urlencode text="$1" >/dev/null || true; }

# Während ausrollen.sh läuft (gleiche Sperre), startet der Dienst ohnehin neu: dann nicht prüfen.
exec 9>"$D/.sperre"
flock -n 9 || exit 0

dienst() {
  curl -sf --max-time 5 -X POST http://127.0.0.1:3610/mcp -A lintelly-health-ping -H 'content-type: application/json' \
    -H 'accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | grep -q '"tools"'
}
aussen() { curl -sf --max-time 10 https://hr.lintelly.com/health | grep -q '"ok":true'; }

n=$(cat "$S" 2>/dev/null)
case "$n" in ''|*[!0-9]*) n=0 ;; esac
dienst && d=ok || d=aus
[ "$d" = ok ] && aussen && a=ok || a=aus

if [ "$d" = ok ] && [ "$a" = ok ]; then
  [ "$n" -ge 2 ] && melde "Lintelly HR ist wieder erreichbar (https://hr.lintelly.com/health und tools/list)."
  echo 0 > "$S"
  exit 0
fi

n=$((n + 1))
echo "$n" > "$S"
[ "$n" -lt 2 ] && exit 0   # ein einzelner Aussetzer: abwarten
if [ "$d" = aus ]; then
  [ $((n % 2)) -eq 0 ] || exit 0
  sudo -n systemctl restart lintelly-hr && neu="neu gestartet" || neu="Neustart gescheitert (sudo -n), bitte von Hand"
  [ "$n" -eq 2 ] && melde "Nick, Lintelly HR hing: MCP auf ops-01 antwortet zweimal in Folge nicht. Dienst $neu. Log: journalctl -u lintelly-hr auf ops-01."
elif [ "$n" -eq 2 ]; then
  melde "Nick, hr.lintelly.com ist von außen nicht erreichbar, der Dienst auf ops-01 antwortet aber. Caddy oder DNS prüfen."
fi
exit 0
