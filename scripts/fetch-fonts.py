#!/usr/bin/env python3
"""Scarica da Google Fonts i woff2 usati dal sito e genera un fonts.css locale.

Da rieseguire solo se cambiano le famiglie o i pesi: l'output e' committato.
"""
import re, subprocess, sys, pathlib

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

# Unione dei pesi richiesti dalla main landing e dalle sotto-landing.
CSS_URL = (
    "https://fonts.googleapis.com/css2"
    "?family=Playfair+Display:ital,wght@0,400..700;1,400"
    "&family=Inter:wght@300..700"
    "&family=Inter+Tight:wght@400..700"
    "&family=Source+Serif+4:ital,wght@1,400..500"
    "&family=JetBrains+Mono:wght@400..500"
    "&display=swap"
)

# Il sito e' in italiano e inglese: latin + latin-ext bastano. Gli altri
# subset (cyrillic, greek, vietnamese) sarebbero file mai richiesti.
KEEP = {"latin", "latin-ext"}

OUT_DIR = pathlib.Path(sys.argv[1])
FONT_DIR = OUT_DIR / "fonts"
FONT_DIR.mkdir(parents=True, exist_ok=True)


def get(url, binary=False):
    r = subprocess.run(["curl", "-sfL", "-m", "60", "-A", UA, url],
                       capture_output=True, check=True)
    return r.stdout if binary else r.stdout.decode()


css = get(CSS_URL)

blocks = re.findall(r"(/\*\s*([\w-]+)\s*\*/\s*)?@font-face\s*\{[^}]*\}", css)
# re.findall con gruppi perde il testo completo: rifaccio con finditer.
out, seen = [], {}
for m in re.finditer(r"(?:/\*\s*(?P<subset>[\w-]+)\s*\*/\s*)?"
                     r"@font-face\s*\{(?P<body>[^}]*)\}", css):
    subset = m.group("subset")
    body = m.group("body")
    if subset not in KEEP:
        continue
    url_m = re.search(r"url\((https://[^)]+\.woff2)\)", body)
    fam_m = re.search(r"font-family:\s*'([^']+)'", body)
    if not url_m or not fam_m:
        continue
    remote = url_m.group(1)
    style = "italic" if "font-style: italic" in body else "normal"
    slug = fam_m.group(1).lower().replace(" ", "-")
    name = f"{slug}-{style}-{subset}.woff2"
    if remote not in seen:
        (FONT_DIR / name).write_bytes(get(remote, binary=True))
        seen[remote] = name
        print(f"  {name}")
    local = f"/assets/fonts/{seen[remote]}"
    out.append("@font-face {%s}" % re.sub(
        r"url\(https://[^)]+\.woff2\)", f"url({local})", body).rstrip())

header = (
    "/* Font self-hosted. Generato da scripts/fetch-fonts.py, non modificare a mano.\n"
    " *\n"
    " * Sono serviti dal nostro dominio invece che da fonts.googleapis.com perche'\n"
    " * ogni richiesta a Google trasmetteva l'IP del visitatore a un terzo, a ogni\n"
    " * visita e senza alcun consenso. Qui non esce nulla dal sito.\n"
    " *\n"
    " * Solo subset latin e latin-ext: il sito e' in italiano e inglese.\n"
    " * I .woff2 sono immutabili per nome e nginx li marca cacheabili un anno. */\n\n"
)
(OUT_DIR / "fonts.css").write_text(header + "\n\n".join(out) + "\n")
print(f"\n{len(out)} @font-face -> {OUT_DIR/'fonts.css'}")
