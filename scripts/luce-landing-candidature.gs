/**
 * Riceve le candidature del modulo di /luce-landing/: aggiunge una riga al
 * foglio Google che fa da CRM, manda una email di avviso agli indirizzi di
 * DESTINATARI e una email di conferma a chi si e' candidato.
 *
 * Non gira sul nostro server: e' un progetto Google Apps Script pubblicato come
 * app web. Questo file e' la copia versionata; se lo cambi, incollalo di nuovo
 * nell'editor e pubblica una nuova versione.
 *
 * In produzione (dal 2026-10-26) e' il progetto "Luce · candidature" su
 * script.google.com, nell'account Google di GoldenHour che possiede la cartella
 * luce-aios (le email di avviso partono da li'), e scrive nel foglio
 * "Luce · candidature programma pilota" della cartella condivisa luce-aios/lead.
 * E' un progetto a se', non legato al foglio: con piu' account Google aperti,
 * Estensioni > Apps Script dal foglio dava "Impossibile aprire il file".
 *
 * Messa in opera (una volta sola):
 *  1. script.google.com > Nuovo progetto, incolla questo file al posto di
 *     Codice.gs e salva.
 *  2. Impostazioni progetto (rotella) > Proprieta' script:
 *     DESTINATARI = gli indirizzi a cui arriva l'avviso, separati da virgola;
 *     FOGLIO_ID = l'ID del foglio, il pezzo di URL fra /d/ e /edit.
 *     Stanno li' e non qui perche' il repo e' pubblico. Senza FOGLIO_ID lo
 *     script usa il foglio a cui e' legato, se lo si crea da Estensioni.
 *  3. Esegui > prova() una volta: chiede le autorizzazioni (foglio e invio
 *     email), crea la scheda "Candidature" con le intestazioni e manda una
 *     candidatura di prova. Poi cancella la riga di prova.
 *  4. Esegui il deployment > Nuovo deployment > tipo "App web".
 *     Esegui come: Me. Chi ha accesso: Chiunque.
 *  5. Copia l'URL che finisce in /exec e mettilo in DESTINAZIONE in
 *     html/luce-landing/index.html.
 *
 * Per cambiare lo script senza cambiare l'URL: Gestisci deployment > modifica
 * quello esistente > Versione: nuova. Un "Nuovo deployment" crea un URL nuovo.
 *
 * La pagina manda il corpo come text/plain: e' una richiesta "semplice", senza
 * preflight CORS, che Apps Script non saprebbe gestire. Il contenuto e' JSON.
 */

var SCHEDA = 'Candidature';
// Le colonne utm sono in fondo perche' sono arrivate dopo: le righe gia'
// scritte restano allineate. scheda_() aggiunge le intestazioni che mancano.
var INTESTAZIONI = ['Ricevuta', 'Nome e cognome', 'Email', 'Sito', 'Persone',
                    'Brand D2C', 'Slack', 'Informativa letta', 'Inviata dal browser',
                    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
var MAX_LUNGHEZZA = 300;

function doPost(e) {
  var dati;
  try {
    dati = JSON.parse(e.postData.contents);
  } catch (err) {
    return risposta_({ ok: false, errore: 'formato' });
  }

  // Il campo trappola e' invisibile alle persone: se e' pieno, l'ha compilato
  // un bot. Rispondiamo ok, cosi' il bot non impara niente, e non salviamo.
  // Fino al 2026-10-26 si chiamava "indirizzo": l'autocompletamento di Chrome
  // lo riempiva e le candidature vere sparivano in silenzio. Il log serve a
  // vedere nelle Esecuzioni se succede ancora.
  if (dati.trappola) {
    console.log('Scartata dal campo trappola: ' + pulisci_(dati.email));
    return risposta_({ ok: true });
  }

  var c = {
    nome: pulisci_(dati.nome),
    email: pulisci_(dati.email),
    sito: pulisci_(dati.sito),
    persone: pulisci_(dati.persone),
    brand: pulisci_(dati.brand),
    slack: pulisci_(dati.slack),
    informativa: dati.informativa === true,
    inviata: pulisci_(dati.inviata),
    utm_source: pulisci_(dati.utm_source),
    utm_medium: pulisci_(dati.utm_medium),
    utm_campaign: pulisci_(dati.utm_campaign),
    utm_content: pulisci_(dati.utm_content)
  };

  var mancanti = ['nome', 'email', 'sito', 'persone', 'brand', 'slack'].filter(function (k) {
    return !c[k];
  });
  if (mancanti.length || !c.informativa || !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(c.email)) {
    return risposta_({ ok: false, errore: 'campi' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    scheda_().appendRow([new Date(), c.nome, c.email, c.sito, c.persone, c.brand,
                         c.slack, 'Sì', c.inviata, c.utm_source, c.utm_medium,
                         c.utm_campaign, c.utm_content].map(cella_));
  } finally {
    lock.releaseLock();
  }

  // La riga e' gia' salvata: se un'email non parte, la candidatura non e'
  // persa. Rispondere errore farebbe solo reinviare il modulo, con un doppione.
  try {
    avvisa_(c);
  } catch (err) {
    console.error('Avviso email non inviato: ' + err);
  }
  try {
    conferma_(c);
  } catch (err) {
    console.error('Conferma al candidato non inviata: ' + err);
  }
  return risposta_({ ok: true });
}

// Una candidatura finta, da lanciare dall'editor per autorizzare lo script
// e controllare che riga ed email arrivino.
function prova() {
  doPost({ postData: { contents: JSON.stringify({
    nome: 'Prova Prova', email: 'prova@example.com', sito: 'example.com',
    persone: 'Da 4 a 10', brand: 'Da 1 a 3', slack: 'Sì', informativa: true,
    utm_source: 'prova', utm_campaign: 'prova',
    inviata: new Date().toISOString()
  }) } });
}

function destinatari_() {
  var destinatari = PropertiesService.getScriptProperties().getProperty('DESTINATARI');
  if (!destinatari) {
    throw new Error('Manca la proprieta\' script DESTINATARI');
  }
  return destinatari;
}

function avvisa_(c) {
  var foglio = file_().getUrl();
  MailApp.sendEmail({
    to: destinatari_(),
    subject: 'Nuova candidatura Luce: ' + c.nome + ' (' + c.sito + ')',
    body: [
      'È arrivata una candidatura al programma pilota di Luce.',
      '',
      'Nome e cognome: ' + c.nome,
      'Email: ' + c.email,
      'Sito: ' + c.sito,
      'Persone: ' + c.persone,
      'Brand D2C: ' + c.brand,
      'Slack: ' + c.slack,
      'Da dove arriva: ' + provenienza_(c),
      '',
      'Il foglio delle candidature: ' + foglio
    ].join('\n')
  });
}

// La conferma a chi si e' candidato. Parte dall'account che esegue lo script,
// ma le risposte vanno ai DESTINATARI, che leggono la posta di goldenhourai.it.
function conferma_(c) {
  var nome = c.nome.split(/\s+/)[0];
  MailApp.sendEmail({
    to: c.email,
    name: 'Golden Hour AI',
    replyTo: destinatari_(),
    subject: 'Luce: abbiamo ricevuto la tua richiesta di demo',
    body: [
      'Ciao ' + nome + ',',
      '',
      'grazie per il tuo interesse in Luce!',
      '',
      'Abbiamo ricevuto la tua richiesta di demo. Ti ricontatteremo entro 48 ore per conoscere meglio la tua agenzia e capire se ci sono i presupposti per avviare un progetto pilota insieme.',
      '',
      'Stiamo selezionando 5 agenzie di marketing per questa prima fase, quindi la demo verrà confermata dopo una prima valutazione della richiesta.',
      '',
      'Nel frattempo, se vuoi aggiungere qualche informazione sulla tua agenzia o su come lavora il tuo team, puoi rispondere direttamente a questa email.',
      '',
      'A presto,',
      '',
      'Simone e Mattia',
      'Golden Hour AI · https://goldenhourai.it'
    ].join('\n')
  });
}

// Una riga leggibile sui parametri utm, per l'avviso
function provenienza_(c) {
  var parti = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].filter(function (k) {
    return c[k];
  }).map(function (k) {
    return k.replace('utm_', '') + ' ' + c[k];
  });
  return parti.length ? parti.join(', ') : 'nessun parametro utm (pagina aperta direttamente)';
}

function file_() {
  var id = PropertiesService.getScriptProperties().getProperty('FOGLIO_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function scheda_() {
  var file = file_();
  var scheda = file.getSheetByName(SCHEDA);
  if (!scheda) {
    scheda = file.insertSheet(SCHEDA);
    scheda.appendRow(INTESTAZIONI);
    scheda.setFrozenRows(1);
    scheda.getRange(1, 1, 1, INTESTAZIONI.length).setFontWeight('bold');
  } else if (scheda.getLastColumn() < INTESTAZIONI.length) {
    // Il foglio e' stato creato prima delle colonne nuove
    scheda.getRange(1, 1, 1, INTESTAZIONI.length).setValues([INTESTAZIONI]).setFontWeight('bold');
  }
  return scheda;
}

function pulisci_(valore) {
  return String(valore == null ? '' : valore).trim().slice(0, MAX_LUNGHEZZA);
}

// Un valore che comincia con = + - @ verrebbe letto dal foglio come formula:
// l'apostrofo davanti lo fa restare testo.
function cella_(valore) {
  return typeof valore === 'string' && /^[=+\-@]/.test(valore) ? "'" + valore : valore;
}

function risposta_(oggetto) {
  return ContentService.createTextOutput(JSON.stringify(oggetto))
    .setMimeType(ContentService.MimeType.JSON);
}
