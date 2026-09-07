# GoldenHour AI — Landing Pages

## Overview

Single nginx container serving two landing pages under the same domain, managed via Docker Compose + Traefik on a VPS.

- **Main:** `https://goldenhourai.it` → GoldenHour AI corporate landing
- **Aurora:** `https://goldenhourai.it/aurora/` → product landing for school substitution management
- **Atelier:** `https://goldenhourai.it/atelier/` → product landing luxury & retail
- **GoldenHour OS:** `https://goldenhourai.it/gos/` → product landing della piattaforma, con le proprie pagine legali sotto `/gos/privacy/` e `/gos/termini/`

Il vecchio path `/sostituzioni` (nome del prodotto prima del rebrand) è servito da un 301 permanente verso `/aurora/`. Non rimuoverlo: esistono link esterni e risultati di ricerca che lo puntano.

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
  aurora/
    index.html            # Aurora product landing
    styles.css            # Aurora stylesheet
    assets/
      goldenhour-symbol.png
      goldenhour-logo.png
      logo_with_tagline.png
      demoshort.mp4        # Hero demo video
  gos/
    index.html            # GoldenHour OS product landing
    styles.css            # GoldenHour OS stylesheet
    legal.css             # Aggiunte alle pagine legali (liste, tabelle, riquadro bozza)
    privacy/index.html    # Privacy del prodotto (diversa da /privacy/, che copre il sito)
    termini/index.html    # Condizioni d'uso del prodotto
    assets/
      goldenhour-symbol.png
      logo_with_tagline.png

nginx.conf                # Nginx routing: / → main, /aurora/ → product
docker-compose.yml        # Traefik labels for goldenhourai.it
```

## Architecture

One `nginx:alpine` container mounts `./html` as webroot. Traefik (external, pre-existing on VPS) handles TLS termination and routing by hostname.

`nginx.conf` routes:
- `/sostituzioni` e `/sostituzioni/<qualsiasi cosa>` → 301 permanente → `/aurora/…` (legacy, vedi sotto)
- `/aurora` → 301 → `/aurora/`
- `/aurora/` → `try_files` against `html/aurora/`
- `/atelier/` → `try_files` against `html/atelier/`
- `/` → `try_files` against `html/`

Il redirect legacy è un `location ~ ^/sostituzioni/(.*)$` e **deve restare prima** dei `location` regex per `css|js` e per i media: nginx sceglie il primo regex che matcha in ordine di definizione, quindi spostandolo più in basso i vecchi URL degli asset finirebbero in 404 invece che sul redirect.

## Design system

### GoldenHour main landing (`html/index.html`)
- Fonts: Playfair Display (serif headings), Inter (body), Inter Tight (navbar brand), JetBrains Mono (mono)
- Palette: cream `#FAF7F0`, gold `#D4A23B`, forest `#2E6B3D`, ink `#1F1A14`
- Features: IT/EN language toggle, dark/light theme toggle, dynamic contact form
- CSS e JS inline nel file (non carica `shared.css`)
- **Source of truth:** `html/index.html` (i file `Golden Hour Landing/` sono stati rimossi)

### Sotto-landing (`html/aurora/`, `html/atelier/`)
- Fonts: Inter Tight (body), Source Serif 4 italic (usato con parsimonia, vedi Regole editoriali)
- Palette: green-based, dark/light theme toggle via `data-theme` attribute
- Caricano `../shared.css` + il proprio `styles.css`
- Struttura comune: hero → cosa fa → come funziona → sezione specifica del prodotto → contatti

## Key content alignment

The GoldenHour main landing's education product card (section `#products`) references the same product as the `/aurora` landing. Keep these in sync:
- Product name: **Aurora** (ex "Sostituzioni")
- Metrics: **1h+ → 5min** risparmiate ogni mattina / **<10 sec** per generare il piano
- Quote attribution: **Sergio Valentini, Liceo Scientifico Galileo Galilei, Siena** (placeholder, da sostituire con la citazione reale)
- CTA button links to `/aurora`
- Lo specchietto del prodotto (`.subs-*` in `html/index.html`) replica la schermata "Genera Sostituzioni" dell'app reale (`~/coding/scuola/sostituzioni`, componente `frontend/src/components/Sostituzioni/`). Se cambia la UI dell'app, aggiornare qui.

### "sostituzioni" come nome comune

Il rebrand riguarda il **nome del prodotto**, non la parola italiana. Nel copy delle pagine "sostituzioni" resta corretto quando indica la cosa ("genera il piano di sostituzioni della giornata", "3 classi · 5 sostituzioni"), così come restano invariati i nomi delle schermate replicate dall'app reale ("Genera Sostituzioni") e le classi CSS `.subs-*`. Non sostituire meccanicamente la parola con "Aurora".

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

- **Display face: Playfair Display**, la stessa famiglia dei titoli della landing principale: è ciò che tiene insieme le tre pagine. Usata **solo** per l'`h1` dell'hero delle sotto-landing, cioè il nome del prodotto (`--font-display`, regola `.hero h1` in `shared.css`), a peso 700 perché lì è un wordmark. Sulla main landing resta a peso 500 per i titoli, che sono frasi. È l'unico punto in cui le sotto-landing alzano la voce: non estenderla a `h2`, `h3` o al corpo, che restano Inter Tight.
- `.serif-it` (Source Serif 4 corsivo) è un inciso **discreto**: ammesso nel payoff del footer e nei nomi propri dentro i mockup (es. il nome del profumo). **Mai nei titoli di sezione.**
- `.accent` è `--text-muted`, non un colore vivo. Non colorare i titoli.
- `.eyebrow` è un'etichetta di testo maiuscoletto, non una pillola colorata.
- Verde e oro restano per gli elementi interattivi (bottoni, link, icone), non per la tipografia dei titoli.
- I "specchietti" prodotto (`.pv`) restano in italiano anche con lingua EN attiva: sono repliche di schermate reali, non copy di marketing. Non aggiungere `data-i18n` al loro interno.

## Deploying

Produzione: host **gn1**, repo in `/home/gh/sites/ghlanding`, container `goldenhourai`. Il dominio sta dietro Cloudflare.

```bash
# 1. In locale, se hai toccato un .css
./stamp-assets.sh          # aggiorna ?v=<hash> nei <link>, poi committa

# 2. Push
git push origin master

# 3. Sul server
ssh gn1 'cd /home/gh/sites/ghlanding && git pull --ff-only origin master'
ssh gn1 'docker exec goldenhourai nginx -t && docker exec goldenhourai nginx -s reload'
```

Il VPS deve avere la rete Docker `web` gia' esistente e un Traefik attivo con certresolver `letsencrypt`.

### Due trappole, entrambe gia' costate un deploy rotto

**1. Se cambi `nginx.conf`, il reload non basta: serve `docker compose restart web`.**
`nginx.conf` e' montato come *singolo file*. `git pull` non modifica il file sul posto, lo sostituisce creando un nuovo inode, e il bind mount del container resta agganciato a quello vecchio. Risultato: `nginx -s reload` rilegge una config che non e' piu' quella su disco, in silenzio. `html/` invece e' montata come directory, quindi le modifiche ai contenuti passano sempre.
Verifica: `docker exec goldenhourai stat -c %i /etc/nginx/conf.d/default.conf` deve coincidere con `stat -c %i /home/gh/sites/ghlanding/nginx.conf`.

**2. Cambiando un CSS, esegui `./stamp-assets.sh` prima di committare.**
Le pagine HTML sono servite `no-store` (sempre fresche), i CSS no. Senza una query string nuova, Cloudflare e i browser continuano a servire il CSS precedente: si ottiene **HTML nuovo con CSS vecchio**, cioe' pagine senza stile, non semplicemente pagine diverse. Lo script mette `?v=<hash del contenuto>` nei `<link>`, cambiando la chiave di cache. E' idempotente: se il CSS non e' cambiato, l'hash resta lo stesso.
Verifica dopo il deploy: `curl -s https://goldenhourai.it/aurora/ | grep stylesheet` deve mostrare gli hash correnti dei file locali.

## Email

Le email vivono in `html/assets/config.js`, non nell'HTML (vedi Rule 4).

- Aurora: `aurora@goldenhourai.it` (chiave `emailAurora`) · ex `sostituzioni@goldenhourai.it`
- Atelier: `atelier@goldenhourai.it` (chiave `emailAtelier`)
- Generale: `info@goldenhourai.it` (chiave `emailMain`)

Il vecchio indirizzo `sostituzioni@` va tenuto come alias verso `aurora@`: è pubblicato da mesi sul sito e nei contatti già presi.

**Dove va quale indirizzo:** nel **footer** di ogni pagina va sempre `emailMain` (`info@`), identico ovunque. Le email di prodotto (`aurora@`, `atelier@`) stanno solo nella **sezione contatti in pagina** della rispettiva sotto-landing, dove sono il canale dedicato a quel prodotto.

## Footer

Il footer è **identico su tutte le pagine** per contenuto: stesse voci, stessi link, stessa riga in basso. Il markup differisce (la main landing ha CSS e i18n propri, le sotto-landing usano `shared.css`), il contenuto no. Toccando il footer di una pagina, allinea le altre tre: `html/index.html`, `html/aurora/`, `html/atelier/`, `html/template.html`.

Contenuto canonico, in quest'ordine di colonne:
1. **Brand**: logo, payoff, descrizione
2. **Community** (SAINET, link a `sainetUrl`) e sotto **Navigazione** (Metodo, Prodotti, Prenota una call)
3. **Prodotti**: Cezànne · Hospitality, Aurora · Education, Atelier · Luxury & Retail, Workshop
4. **Contatti**: sede legale + `info@goldenhourai.it`

GoldenHour OS **non** è nella colonna Prodotti. La pagina esiste ed è pubblica (serve anche alla verifica OAuth di Google, che richiede una homepage dell'app sullo stesso dominio con il link alla privacy), ma il prodotto non è ancora in vendita al pubblico: metterlo in vetrina insieme ad Aurora e Atelier prometterebbe qualcosa che oggi non si può comprare. Quando lo sarà, la voce va aggiunta in tutte e cinque le pagine insieme.

Workshop sta fra i **prodotti**, non in Community: è una futura linea di attività di GoldenHour, non un'iniziativa esterna a cui si partecipa. Oggi è **testo semplice, non un link**, perché `/workshop` non esiste ancora. Il path è già deciso e registrato in `workshopsUrl`: quando la pagina ci sarà, si rimette `<a href="/workshop" data-config="workshops">` nelle quattro pagine.

Attenzione al motivo, che non è estetico: `nginx.conf` ha `try_files $uri $uri/ /index.html` più `error_page 404 /index.html`, quindi **qualsiasi URL inesistente serve la main landing con status 200**, non un 404. Un link a una pagina non ancora creata non porterebbe a un errore, porterebbe alla homepage: clic apparentemente inerte per chi naviga, contenuto duplicato su due URL per i motori di ricerca. Vale per qualsiasi link che si volesse aggiungere in anticipo su una pagina futura.
- Riga in basso: `© 2026 Golden Hour AI · P.IVA in fase di registrazione` / EN `VAT registration pending`, e un link a `/privacy/`

La riga legale dice solo **Privacy**. Diceva "Privacy · Cookie · Termini" come testo non cliccabile: tre parole che sembravano un footer legale e non portavano da nessuna parte. I Termini non servono (non si vende nulla online, non ci sono account né contenuti utente) e non c'è una cookie policy perché il sito non usa cookie.

**Niente P.IVA inventata.** Finché la registrazione non è conclusa la riga dice "in fase di registrazione". Un numero segnaposto tipo `IT00000000000` è un dato legale falso pubblicato, non un placeholder innocuo.

Il blocco `applyConfig` è **lo stesso identico codice** in tutte e cinque le pagine (`index`, `aurora`, `atelier`, `privacy`, `template`): è generico sulle chiavi, quindi va copiato senza adattarlo. Salta gli URL a `'#'`, che sono segnaposto di link non ancora decisi. Usa `data-config`, mai `id`.

## Terze parti: la regola è zero al caricamento

Aprendo una pagina, il browser **non deve contattare nessun host oltre al nostro**. È la ragione per cui non serve un banner cookie, e va mantenuta.

- **Font self-hosted** in `html/assets/fonts/`, dichiarati in `html/assets/fonts.css`. Non reintrodurre `fonts.googleapis.com`: ogni visita trasmetteva l'IP a Google. Per cambiare famiglie o pesi si modifica `CSS_URL` in `scripts/fetch-fonts.py` e lo si riesegue (`python3 scripts/fetch-fonts.py html/assets`), poi `./stamp-assets.sh`.
- **Calendly a due clic.** Il widget non è nel markup: c'è un segnaposto `.cal-consent` che spiega cosa comporta caricarlo, e solo al clic il JS inietta `widget.js` e l'iframe. I cookie di Calendly non si possono negare dall'esterno (same-origin policy: `sandbox` senza `allow-same-origin` li bloccherebbe ma romperebbe il widget), quindi l'unica leva reale è non caricarlo finché non lo si chiede. `hide_gdpr_banner=1` resta perché l'informativa la dà il segnaposto, prima della richiesta invece che dopo.

Verifica dopo ogni modifica, sulla pagina aperta nel browser:

```js
[...new Set(performance.getEntriesByType('resource').map(r => new URL(r.name).host))]
```

Deve contenere solo il proprio host. Se compare altro, o è tornata una dipendenza esterna o ne è stata aggiunta una nuova, e la pagina privacy non è più accurata.

Nota per chi misura stili nel browser: `.btn` ha una `transition` su `background` e `color`. Se si legge `getComputedStyle` subito dopo aver cambiato `data-theme`, o se la pagina non sta compositando, si ottiene il valore di partenza e sembra che il dark mode non funzioni. Azzerare le transizioni prima di misurare.

## Pagine legali

Ce ne sono tre, e coprono due cose diverse. Non vanno confuse.

`html/privacy/` riguarda **il sito**: cosa succede aprendo goldenhourai.it e scrivendo a un nostro indirizzo. Descrive cosa fa davvero il sito, quindi **va riletta ogni volta che si tocca una terza parte o si aggiunge una raccolta di dati** (un form, un analytics, un embed): se il codice cambia e la pagina no, la pagina diventa una dichiarazione falsa.

`html/gos/privacy/` e `html/gos/termini/` riguardano **il prodotto** GoldenHour OS, cioè i dati delle aziende clienti che passano dentro al sistema. Il footer del sito continua a linkare solo `/privacy/`: quelle due sono documenti contrattuali del prodotto, non informative di navigazione, e si raggiungono da `/gos/`.

Nota storica: questo file diceva che i Termini non servivano, "non si vende nulla online, non ci sono account né contenuti utente". Era vero del sito e resta vero del sito. Non è più vero del prodotto, che ha clienti, credenziali di terzi collegate e output su cui qualcuno prende decisioni.

Le tre pagine hanno un blocco visibile con quello che manca ancora: `.todo` sulla privacy del sito (denominazione esatta, indirizzo completo, P.IVA), `.nota-bozza` sulle due del prodotto. Vanno tolti quando i punti che elencano sono chiusi, non prima: sono deliberatamente vistosi perché una pagina legale pubblicata con dentro un segnaposto è peggio di una pagina assente. Nessuno dei tre testi è stato rivisto da un legale.

Le due pagine del prodotto caricano `shared.css`, poi `privacy/styles.css` (gli stili del testo lungo, riusati) e infine `gos/legal.css`, che aggiunge solo liste, tabelle e il riquadro di bozza. Toccando `privacy/styles.css` si toccano anche loro.

`/gos/` non ha un `location` in `nginx.conf` e non ne ha bisogno: `location /` fa `try_files $uri $uri/`, che serve `html/gos/index.html` e reindirizza `/gos` a `/gos/`. È lo stesso motivo per cui `/privacy/` funziona senza un blocco proprio. Meglio così: cambiare `nginx.conf` costringe a `docker compose restart web` per via del bind mount su file singolo (vedi sopra).

## Color hierarchy

### Rule 1 — Colore primario per pagina
- **Main landing** (`html/index.html`): **oro** come accento primario (`--gold: #D4A23B`). CTA, pulsanti, focus ring usano oro.
- **Sub-landing** (`html/aurora/`, `html/atelier/` e future pagine prodotto): **verde** come accento primario (`--green: #186628` in `shared.css`). In dark mode, `shared.css` inverte automaticamente a `--gold-soft` tramite `[data-theme="dark"] { --primary: var(--gold-soft) }`.

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
