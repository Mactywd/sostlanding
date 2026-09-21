#!/bin/sh
# Rotazione dei log di nginx, da cron sull'host.
#
# Perche' non logrotate: i file dentro ./logs sono scritti da nginx come root
# nel container, e l'utente gh non ha sudo. Questo script fa lo stesso lavoro
# passando da "docker exec", che gh puo' gia' eseguire.
#
# I 30 giorni non sono una scelta di comodo: sono il termine dichiarato in
# /privacy/ ("i log sono conservati 30 giorni, poi vengono cancellati"). Se
# cambia qui, va cambiato anche nell'informativa e nel commento in nginx.conf.
#
# Crontab dell'utente gh:
#   17 4 * * * /home/gh/sites/ghlanding/scripts/rotate-logs.sh >/dev/null 2>&1

set -eu

CONTAINER=goldenhourai
GIORNI=30
STAMP=$(date +%Y%m%d)

docker exec "$CONTAINER" sh -c "
  set -e
  cd /var/log/nginx

  # Un file vuoto non si ruota: eviterebbe di accumulare archivi inutili nei
  # giorni senza traffico.
  for f in access.log error.log; do
    [ -s \"\$f\" ] && mv \"\$f\" \"\$f-$STAMP\" || true
  done

  # reopen, non reload: nginx richiude i descrittori e ricrea i file senza
  # rileggere la configurazione e senza far cadere le connessioni in corso.
  nginx -s reopen

  # I vecchi archivi spariscono qui. -mtime +$GIORNI e' 'modificato piu' di
  # $GIORNI giorni fa', che per un log ruotato coincide con la data in cui e'
  # stato chiuso.
  find . -name '*.log-*' -type f -mtime +$GIORNI -delete
"
