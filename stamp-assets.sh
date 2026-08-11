#!/usr/bin/env bash
# Marca i CSS locali con ?v=<hash del contenuto> dentro gli <link> delle pagine.
#
# Perche' serve: i file CSS non sono content-hashed e vengono serviti sempre
# con lo stesso nome. Anche con Cache-Control corretto all'origine, una CDN o
# un browser che ha gia' in cache la versione precedente continua a servirla,
# e il risultato e' HTML nuovo con CSS vecchio, cioe' pagine senza stile.
# Cambiando la query string cambia la chiave di cache: il nuovo CSS viene
# richiesto subito, senza dover purgare nulla.
#
# Da eseguire prima di ogni commit che tocca un .css. Idempotente.
set -euo pipefail
cd "$(dirname "$0")"

hash_of() { md5sum "$1" | cut -c1-8; }

stamp() {           # stamp <file html> <href del css> <percorso del css>
  local html="$1" href="$2" file="$3" v
  [[ -f $file ]] || { echo "  manca $file" >&2; return 1; }
  v=$(hash_of "$file")
  python3 - "$html" "$href" "$v" <<'PY'
import re, sys
html, href, v = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(html, encoding='utf-8').read()
pat = re.compile(r'(href=")' + re.escape(href) + r'(?:\?v=[0-9a-f]+)?(")')
s2, n = pat.subn(lambda m: m.group(1) + href + '?v=' + v + m.group(2), s)
if n:
    open(html, 'w', encoding='utf-8').write(s2)
print(f"  {html}: {href}?v={v} ({n})")
PY
}

echo "Marcatura asset:"
for page in html/aurora/index.html html/atelier/index.html; do
  stamp "$page" "../shared.css" "html/shared.css"
  stamp "$page" "styles.css" "$(dirname "$page")/styles.css"
done
stamp html/template.html "../shared.css" "html/shared.css"

# La privacy sta in una sottocartella ma referenzia shared.css dalla radice.
stamp html/privacy/index.html "/shared.css" "html/shared.css"
stamp html/privacy/index.html "styles.css" "html/privacy/styles.css"

# fonts.css e' referenziato con un path assoluto, uguale su tutte le pagine.
# I .woff2 non hanno bisogno di versione: il nome cambia solo se cambia il
# font, e nginx li serve immutabili.
for page in html/index.html html/aurora/index.html html/atelier/index.html html/template.html html/privacy/index.html; do
  stamp "$page" "/assets/fonts.css" "html/assets/fonts.css"
done
echo "Fatto."
