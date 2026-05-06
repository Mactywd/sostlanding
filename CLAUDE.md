# GoldenHour AI — Landing Pages

## Overview

Single nginx container serving two landing pages under the same domain, managed via Docker Compose + Traefik on a VPS.

- **Main:** `https://goldenhourai.it` → GoldenHour AI corporate landing
- **Sostituzioni:** `https://goldenhourai.it/sostituzioni/` → product landing for school substitution management

## File structure

```
html/
  index.html              # GoldenHour AI main landing (standalone, production-ready)
  assets/
    logo.png              # GoldenHour logo (square)
    logo_tagline.png      # Logo with tagline
  sostituzioni/
    index.html            # Sostituzioni product landing
    styles.css            # Sostituzioni stylesheet
    assets/
      goldenhour-symbol.png
      goldenhour-logo.png
      logo_with_tagline.png
      demoshort.mp4        # Hero demo video

Golden Hour Landing/      # Source/design files for the main landing (not served)
  Golden Hour Landing.html
  Golden Hour Landing - standalone.html
  tweaks-panel.jsx        # Dev-only tweaks panel (not included in html/index.html)
  assets/
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
- Fonts: Playfair Display (serif headings), Inter (body), JetBrains Mono (mono)
- Palette: cream `#FAF7F0`, gold `#D4A23B`, forest `#2E6B3D`, ink `#1F1A14`
- Features: morphing logo on scroll, IT/EN language toggle, dynamic contact form
- **Source of truth for edits:** `Golden Hour Landing/Golden Hour Landing.html` (design file with tweaks panel). Copy changes to `html/index.html` and strip the tweaks panel (React/Babel/tweaks-root div).

### Sostituzioni landing (`html/sostituzioni/index.html`)
- Fonts: Inter Tight (body), Source Serif 4 italic (accents)
- Palette: green-based, dark/light theme toggle via `data-theme` attribute
- Standalone CSS in `sostituzioni/styles.css`

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
