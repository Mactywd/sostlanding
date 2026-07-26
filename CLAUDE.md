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

### Sotto-landing (`html/sostituzioni/`, `html/atelier/`)
- `html/sostituzioni/` è la landing di **Aurora** (il path resta `/sostituzioni`)
- Fonts: Inter Tight (body), Source Serif 4 italic (usato con parsimonia, vedi Regole editoriali)
- Palette: green-based, dark/light theme toggle via `data-theme` attribute
- Caricano `../shared.css` + il proprio `styles.css`
- Struttura comune: hero → cosa fa → come funziona → sezione specifica del prodotto → contatti

## Key content alignment

The GoldenHour main landing's education product card (section `#products`) references the same product as the `/sostituzioni` landing. Keep these in sync:
- Product name: **Aurora** (ex "Sostituzioni"; il path resta `/sostituzioni`)
- Metrics: **1h+ → 5min** risparmiate ogni mattina / **<10 sec** per generare il piano
- Quote attribution: **Sergio Valentini, Liceo Scientifico Galileo Galilei, Siena** (placeholder, da sostituire con la citazione reale)
- CTA button links to `/sostituzioni`
- Lo specchietto del prodotto (`.subs-*` in `html/index.html`) replica la schermata "Genera Sostituzioni" dell'app reale (`~/coding/scuola/sostituzioni`, componente `frontend/src/components/Sostituzioni/`). Se cambia la UI dell'app, aggiornare qui.

## Regole editoriali

Le pagine devono **illustrare** il prodotto, non convincere. Registro da documentazione, non da brochure.

- **Niente em dash (`—`) nel testo visibile** di nessuna pagina. Usare `·` come separatore, oppure `:`/virgola nella prosa. Nei commenti di codice sono ammesse.
- **Niente titoli a due tempi in antitesi** ("Tutto il necessario, / niente di superfluo"). Un `h2` è una frase dichiarativa semplice che dice di cosa parla la sezione.
- **Niente chiuse a effetto** ("Ha pianto.", "è stata una rivoluzione", "Il ricordo non si perde"). Se una frase esiste per l'enfasi e non per l'informazione, va tolta.
- **Niente testimonianze inventate.** Le citazioni vanno usate solo se reali e attribuibili; finché non ci sono, la sezione non esiste. Un placeholder dichiarato (come sulla main landing) è accettabile, cinque nomi di fantasia no.
- **Numeri veri o niente numeri.** Evitare metriche decorative (`∞`, `0 fogli Excel`).
- Preferire il contenuto verificabile e specifico del prodotto alla persuasione.
- **Non presentare come fisso ciò che è configurabile.** La generazione delle sostituzioni (Aurora) e il listino/formati (Atelier) si definiscono cliente per cliente: le pagine descrivono *cosa* si configura, mai *quale* sia la configurazione. Niente ordini di priorità dichiarati, niente taglie o prezzi in vetrina.

### Tipografia, corsivo e colore

- **Display face: Fraunces**, variabile con assi `opsz`/`wght`/`SOFT`/`WONK`. Usata **solo** per l'`h1` dell'hero delle sotto-landing, cioè il nome del prodotto (`--font-display`, regola `.hero h1` in `shared.css`). È l'unico punto in cui la pagina alza la voce: non estenderla a `h2`, `h3` o al corpo.
- `.serif-it` (Source Serif 4 corsivo) è un inciso **discreto**: ammesso nel payoff del footer e nei nomi propri dentro i mockup (es. il nome del profumo). **Mai nei titoli di sezione.**
- `.accent` è `--text-muted`, non un colore vivo. Non colorare i titoli.
- `.eyebrow` è un'etichetta di testo maiuscoletto, non una pillola colorata.
- Verde e oro restano per gli elementi interattivi (bottoni, link, icone), non per la tipografia dei titoli.
- I "specchietti" prodotto (`.pv`) restano in italiano anche con lingua EN attiva: sono repliche di schermate reali, non copy di marketing. Non aggiungere `data-i18n` al loro interno.

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
