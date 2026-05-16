# GoldenHour AI — Landing Pages

## Overview

Single nginx container serving two landing pages under the same domain, managed via Docker Compose + Traefik on a VPS.

- **Main:** `https://goldenhourai.it` → GoldenHour AI corporate landing
- **Sostituzioni:** `https://goldenhourai.it/sostituzioni/` → product landing for school substitution management

## File structure

```
html/
  index.html              # GoldenHour AI main landing (standalone, production-ready)
  shared.css              # Design system condiviso (token, navbar, footer, pulsanti)
  template.html           # Template base per nuove sotto-landing
  assets/
    logo.png              # GoldenHour logo (square)
    logo_tagline.png      # Logo with tagline
    config.js             # Configurazione centralizzata (email, URL, link social)
  sostituzioni/
    index.html            # Sostituzioni product landing
    styles.css            # Sostituzioni stylesheet
    assets/
      goldenhour-symbol.png
      goldenhour-logo.png
      logo_with_tagline.png
      demoshort.mp4        # Hero demo video

nginx.conf                # Nginx routing: / → main, /sostituzioni/ → product
docker-compose.yml        # Traefik labels for goldenhourai.it
```

## Architecture

One `nginx:alpine` container mounts `./html` as webroot. Traefik (external, pre-existing on VPS) handles TLS termination and routing by hostname.

`nginx.conf` routes:
- `/sostituzioni` → 301 → `/sostituzioni/`
- `/sostituzioni/` → `try_files` against `html/sostituzioni/`
- `/` → `try_files` against `html/`

## Design system

### GoldenHour main landing (`html/index.html`)
- Fonts: Playfair Display (serif headings), Inter (body), Inter Tight (navbar brand), JetBrains Mono (mono)
- Palette: cream `#FAF7F0`, gold `#D4A23B`, forest `#2E6B3D`, ink `#1F1A14`
- Features: IT/EN language toggle, dark/light theme toggle, dynamic contact form
- CSS e JS inline nel file (non carica `shared.css`)
- **Source of truth:** `html/index.html` (i file `Golden Hour Landing/` sono stati rimossi)

### Sostituzioni landing (`html/sostituzioni/index.html`)
- Fonts: Inter Tight (body), Source Serif 4 italic (accents)
- Palette: green-based, dark/light theme toggle via `data-theme` attribute
- Carica `../shared.css` + `styles.css` propri

## Key content alignment

The GoldenHour main landing's sostituzioni product card (section `#products`) references the same product as the Sostituzioni landing. Keep these in sync:
- Product name: **Sostituzioni** (not "Galileo")
- Metrics: **1h+ → 5min** risparmiate ogni mattina / **<10 sec** per generare il piano
- Quote attribution: **Elena Marchetti, DSGA · IIS Galileo Galilei, Bologna**
- CTA button links to `/sostituzioni`

## Deploying

```bash
# First deploy
docker compose up -d

# After updating html/ files
docker compose exec web nginx -s reload
# or full restart
docker compose restart web
```

The VPS must have a pre-existing `web` Docker network and a running Traefik instance with `letsencrypt` certresolver.

## Email

Contact address for Sostituzioni product: `sostituzioni@goldenhourai.it`

## Color hierarchy

### Rule 1 — Colore primario per pagina
- **Main landing** (`html/index.html`): **oro** come accento primario (`--gold: #D4A23B`). CTA, pulsanti, focus ring usano oro.
- **Sub-landing** (`html/sostituzioni/` e future pagine prodotto): **verde** come accento primario (`--green: #186628` in `shared.css`). In dark mode, `shared.css` inverte automaticamente a `--gold-soft` tramite `[data-theme="dark"] { --primary: var(--gold-soft) }`.

### Rule 2 — CTA verso sotto-landing usano il verde
I CTA sulla main landing che **linkano a una sotto-landing** devono usare verde, non oro. In `html/index.html`, aggiungere la classe `btn-to-product` insieme a `btn-gold` per attivare l'override verde. Non usare oro per CTA verso prodotti esterni.

### Rule 3 — Dark mode
Tutte le pagine supportano dark/light tramite attributo `data-theme` su `<html>`. Il theme toggle (`#themeToggle`) è presente in tutti i navbar e salva la preferenza in `localStorage` sotto la chiave `'gh-theme'` (condivisa tra le pagine per coerenza). La main landing usa i propri token (`--cream`, `--ink`, ecc.); le sotto-landing usano i token di `shared.css` (`--bg`, `--text`, ecc.).

### Rule 4 — Configurazione centralizzata
Tutti i link, email e URL esterni vivono in `html/assets/config.js` (`window.SITE_CONFIG`). Non hardcodare email, URL Calendly, link LinkedIn o path di sotto-landing direttamente nell'HTML. Aggiungere `data-config="<chiave>"` agli elementi e popolarli via `applyConfig()` in ogni pagina.

### Rule 5 — Nuove sotto-landing
1. Partire da `html/template.html`.
2. Caricare `shared.css` e `/assets/config.js`.
3. Usare `--primary: var(--green)` (default in `shared.css`) come accento primario della pagina.
4. Aggiungere voce corrispondente in `SITE_CONFIG` per URL e email del prodotto.
5. Aggiungere CTA verde con classe `btn-gold btn-to-product` sulla main landing.
