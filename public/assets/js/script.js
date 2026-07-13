/* =========================================================
   MailPilot — Frontend-Logik
   Übersetzungen liegen in assets/js/i18n.js (Objekt I18N),
   das VOR dieser Datei geladen wird.
   ========================================================= */

/* ---- Unterstützte Sprachen (leicht erweiterbar) ---- */
const SUPPORTED = ['en', 'de', 'es', 'fr', 'it', 'pt-BR', 'nl', 'pl', 'sv', 'da', 'nb', 'fi', 'cs', 'sk', 'hu', 'ro', 'el', 'tr', 'ru', 'uk', 'bg', 'hr', 'sr', 'zh', 'zh-TW', 'ja', 'ko', 'hi', 'id', 'th', 'vi', 'ar', 'he'];

/* ---- Sprache bestimmen: gespeicherte Wahl > Browsersprache > Englisch ---- */
function detectLang() {
  let stored = null;
  try { stored = localStorage.getItem('ec_lang'); } catch {}
  if (stored && SUPPORTED.includes(stored)) return stored;

  const candidates = navigator.languages || [navigator.language || 'en'];
  for (const raw of candidates) {
    if (!raw) continue;
    if (SUPPORTED.includes(raw)) return raw;                 // exakt, z. B. pt-BR
    const base = raw.toLowerCase().split('-')[0];
    if (base === 'pt') return 'pt-BR';                       // jedes Portugiesisch → pt-BR
    const match = SUPPORTED.find((s) => s.toLowerCase().split('-')[0] === base);
    if (match) return match;                                 // z. B. de-AT → de
  }
  return 'en';
}

let lang = detectLang();

/* App-Modus: In der Desktop-App (URL „?app=1" oder Tauri-WebView) wird NUR das
   Tool gezeigt – das Marketing (Hero/Vorteile/Preise/FAQ/Footer) blendet die
   Klasse .app-mode per CSS aus. Login + KI laufen ganz normal über die Seite. */
try {
  const inApp = (new URLSearchParams(location.search).get('app') === '1')
    || !!(window.__TAURI__ || window.__TAURI_INTERNALS__);
  if (inApp) {
    document.documentElement.classList.add('app-mode');
    if (document.body) document.body.classList.add('app-mode');
  }
} catch {}

function t(key) {
  const dict = I18N[lang] || I18N.en;
  return (key in dict ? dict[key] : I18N.en[key]) ?? key;
}

/* ---- Elemente referenzieren ---- */
const input        = document.getElementById('input');
const output       = document.getElementById('output');
const optimizeBtn  = document.getElementById('optimizeBtn');
const copyBtn      = document.getElementById('copyBtn');
const charCount    = document.getElementById('charCount');
const outputStatus = document.getElementById('outputStatus');
const tonePills    = document.querySelectorAll('.tone__pill');
const lenRange     = document.getElementById('lenRange');
const formRange    = document.getElementById('formRange');
const lenVal       = document.getElementById('lenVal');
const formVal      = document.getElementById('formVal');
const xlateWrap    = document.getElementById('xlate');
const xlateBtn     = document.getElementById('xlateBtn');
const xlateMenu    = document.getElementById('xlateMenu');
const xlateCurrent = document.getElementById('xlateCurrent');

let activeTone = 'professionell';
let activeLength    = 50;  // Regler Länge (stufenlos 0–100, 50 = mittel)
let activeFormality = 50;  // Regler Formalität (stufenlos 0–100, 50 = neutral)
let hasRealResult = false;   // true, sobald ein echtes KI-Ergebnis im Ausgabefeld steht

/* ---- Übersetzung der Ausgabe ---- */
let baseResultText  = '';     // Original des echten KI-Ergebnisses (Quelle fürs Übersetzen)
let outputLang      = lang;   // Sprache, in der der Ausgabetext gerade angezeigt wird
let outputLangManual = false; // true, sobald der Nutzer selbst eine Zielsprache gewählt hat

// Anzeigenamen der Zielsprachen im Übersetzen-Menü
const XLATE_NAMES = { de: 'Deutsch', en: 'English', es: 'Español', fr: 'Français', it: 'Italiano', nl: 'Nederlands', pl: 'Polski', tr: 'Türkçe', zh: '中文', 'pt-BR': 'Português' };

// Beispiel-E-Mail in Sprachen ohne eigene Oberfläche – für die Sofort-Übersetzung der Vorschau
const EXTRA_EXAMPLES = {
  nl: "Geachte heer Müller,\n\nhartelijk dank voor uw bericht. Ik verzet onze afspraak graag naar volgende week en stel donderdag om 14.00 uur voor.\n\nSchikt dat u? Ik hoor graag van u.\n\nMet vriendelijke groet,\n[Uw naam]",
  pl: "Szanowny Panie Müller,\n\ndziękuję za wiadomość. Chętnie przełożę nasze spotkanie na przyszły tydzień i proponuję czwartek o godzinie 14:00.\n\nCzy taki termin Panu odpowiada? Będę wdzięczny za krótką odpowiedź.\n\nZ poważaniem\n[Imię i nazwisko]",
  tr: "Sayın Müller,\n\nmesajınız için teşekkür ederim. Görüşmemizi memnuniyetle önümüzdeki haftaya erteliyor ve perşembe saat 14.00'ü öneriyorum.\n\nBu sizin için uygun mu? Kısa bir geri dönüşünüzü rica ederim.\n\nSaygılarımla,\n[Adınız]",
  zh: "尊敬的米勒先生：\n\n感谢您的来信。我很乐意将我们的会面改到下周，并建议安排在周四下午两点。\n\n这个时间您方便吗？期待您的简短回复。\n\n顺颂商祺\n[您的姓名]",
};

// Beispieltext für eine Zielsprache holen (UI-Sprachen aus I18N, sonst aus EXTRA_EXAMPLES)
function exampleFor(code) {
  if (EXTRA_EXAMPLES[code]) return EXTRA_EXAMPLES[code];
  const dict = I18N[code] || I18N.en;
  return dict.output_example || I18N.en.output_example;
}

/* =========================================================
   Sprache anwenden & umschalten
   ========================================================= */
function applyLang(next) {
  const langChanged = next && next !== lang;
  if (next) { lang = next; try { localStorage.setItem('ec_lang', lang); } catch {} }
  document.documentElement.lang = lang;
  // Rechts-nach-links für Arabisch/Hebräisch (Textrichtung der ganzen Seite).
  document.documentElement.dir = (lang === 'ar' || lang === 'he') ? 'rtl' : 'ltr';
  document.title = t('doc_title');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  // Ausgabe-Feld mit Beispiel füllen, solange noch kein echtes Ergebnis vorliegt
  if (!hasRealResult) {
    if (!outputLangManual) outputLang = lang;   // Vorschau folgt der UI-Sprache,
    output.value = exampleFor(outputLang);      // außer der Nutzer hat selbst übersetzt
    output.classList.add('is-example');
    setStatus(t('badge_example'), 'demo');
  }
  updateCharCount();
  updateSliderLabels();   // Regler-Werte („Mittel"/„Neutral" …) in der neuen Sprache
  renderAccount();
  renderQuota();
  updateLangUI();
  updateTranslateUI();
  // Standardsprache gewechselt → echtes Ergebnis automatisch in die neue
  // Standardsprache bringen (außer der Nutzer hat für diese E-Mail manuell
  // eine andere Zielsprache gewählt).
  if (langChanged && hasRealResult && !outputLangManual) applyDefaultTranslation();
}

const langBtn     = document.getElementById('langBtn');
const langMenu    = document.getElementById('langMenu');
const langCurrent = document.getElementById('langCurrent');

function updateLangUI() {
  if (langCurrent) langCurrent.textContent = lang.split('-')[0].toUpperCase(); // en→EN, pt-BR→PT
  document.querySelectorAll('.lang__opt').forEach((o) => {
    o.classList.toggle('is-active', o.dataset.lang === lang);
  });
}

if (langBtn) {
  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = langMenu.hidden;
    langMenu.hidden = !willOpen;
    langBtn.setAttribute('aria-expanded', String(willOpen));
  });
  document.querySelectorAll('.lang__opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      applyLang(opt.dataset.lang);
      langMenu.hidden = true;
      langBtn.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', () => {
    if (langMenu && !langMenu.hidden) {
      langMenu.hidden = true;
      langBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ---- Zeichenzähler ---- */
function updateCharCount() {
  const n = input.value.length;
  charCount.textContent = t('chars').replace('{n}', n.toLocaleString(lang));
}
input.addEventListener('input', updateCharCount);

/* ---- Spracheingabe / Diktat: reinsprechen statt tippen ----
   Nutzt die Web Speech API (Edge/Chrome; Firefox unterstützt sie nicht). Das
   Gesprochene wird ans Notizfeld angehängt, in der aktuell gewählten Sprache. */
(function setupVoiceInput() {
  if (!charCount || !input) return;
  const header = charCount.closest('.panel__header');
  if (!header) return;

  const micBtn = htmlToEl(`
    <button type="button" class="mic-btn" id="micBtn" title="${t('voice_btn')}" aria-label="${t('voice_btn')}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>
      <span class="mic-btn__label" data-i18n="voice_btn">${t('voice_btn')}</span>
    </button>`);

  // Mikro + Zeichenzähler rechts gruppieren (Header ist space-between).
  const rightGroup = document.createElement('div');
  rightGroup.className = 'panel__head-right';
  header.insertBefore(rightGroup, charCount);
  rightGroup.appendChild(micBtn);
  rightGroup.appendChild(charCount);

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { micBtn.addEventListener('click', () => toast(t('voice_unsupported'))); return; }

  const LANG_MAP = { en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', 'pt-BR': 'pt-BR' };
  let recog = null, listening = false;
  function setListening(on) {
    listening = on;
    micBtn.classList.toggle('is-recording', on);
    const lbl = micBtn.querySelector('.mic-btn__label');
    if (lbl) lbl.textContent = on ? t('voice_listening') : t('voice_btn');
  }
  micBtn.addEventListener('click', () => {
    if (listening) { try { recog && recog.stop(); } catch {} return; }
    recog = new SR();
    recog.lang = LANG_MAP[lang] || 'en-US';
    recog.interimResults = false;
    recog.continuous = true;
    recog.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript;
      }
      text = text.trim();
      if (text) {
        const sep = input.value && !/\s$/.test(input.value) ? ' ' : '';
        input.value += sep + text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };
    recog.onerror = (e) => {
      setListening(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast(t('voice_denied'), 'warn');
    };
    recog.onend = () => setListening(false);
    try { recog.start(); setListening(true); input.focus(); } catch { setListening(false); }
  });
})();

/* ---- Antwort-Modus + Signatur (Helfer) ---- */
const SIG_KEY = 'mp_signature';
function getSignature() { try { return (localStorage.getItem(SIG_KEY) || '').trim(); } catch { return ''; } }
const NAME_KEY = 'mp_name';
function getName() { try { return (localStorage.getItem(NAME_KEY) || '').trim(); } catch { return ''; } }
function getReplyTo() {
  const tg = document.getElementById('replyToggle');
  const fl = document.getElementById('replyInput');
  return (tg && tg.checked && fl) ? fl.value.trim() : '';
}
// „Auf eine E-Mail antworten"-Block über das Notizfeld injizieren (Markup unberührt).
(function setupReplyMode() {
  if (!input) return;
  const box = htmlToEl(`
    <div class="reply-box" id="replyBox">
      <label class="reply-box__toggle"><input type="checkbox" id="replyToggle" /><span data-i18n="reply_toggle">${escapeHtml(t('reply_toggle'))}</span></label>
      <textarea id="replyInput" class="reply-box__field" rows="4" data-i18n-ph="reply_ph" placeholder="${escapeHtml(t('reply_ph'))}" hidden></textarea>
    </div>`);
  input.insertAdjacentElement('beforebegin', box);
  const tg = box.querySelector('#replyToggle');
  const fl = box.querySelector('#replyInput');
  tg.addEventListener('change', () => {
    fl.hidden = !tg.checked;
    box.classList.toggle('is-open', tg.checked);
    if (tg.checked) fl.focus();
  });
})();

/* =========================================================
   Erweiterte Features: Vorlagen, eigener Stil, Schnell-Buttons,
   Varianten, Betreffzeile. Alles additiv – injiziert per JS.
   ========================================================= */
let resultVariants = [];   // [{ subject, email }]
let currentVariant = 0;

const STYLE_KEY = 'mp_style';
function getStyle() { try { return (localStorage.getItem(STYLE_KEY) || '').trim(); } catch { return ''; } }
function wantsVariants() { const c = document.getElementById('variantsToggle'); return !!(c && c.checked); }

// Virale Signatur: beim Kopieren ein dezenter „Geschrieben mit MailPilot"-Hinweis (abschaltbar).
const PROMO_KEY = 'mp_promo';
function promoEnabled() { try { return localStorage.getItem(PROMO_KEY) !== '0'; } catch { return true; } }
function getPromoLine() { return t('promo_line'); }

// Signatur in die E-Mail einsetzen (ersetzt [Name], sonst angehängt).
function applySignature(email) {
  if (typeof email !== 'string') return email;
  let out = email;
  const namePh = /\[(?:ihr |dein |your )?name\]/i;
  const name = getName();
  if (name) out = out.replace(namePh, name);          // Name in die Grußformel (ersetzt [Name])
  const sig = getSignature();
  if (sig) out = namePh.test(out) ? out.replace(namePh, sig) : out.replace(/\s+$/, '') + '\n' + sig;
  return out;
}

// Betreffzeile anzeigen/verbergen.
function setSubject(subject) {
  const row = document.getElementById('subjectRow');
  const field = document.getElementById('subjectField');
  if (!row || !field) return;
  const s = (subject || '').trim();
  field.value = s;
  row.hidden = !s;
}

// Eine Variante (Signatur + Betreff + ggf. Übersetzung) ins Ausgabefeld bringen.
async function showResult(rawEmail, subject, doTranslate) {
  const email = applySignature(rawEmail);
  output.value = email;
  output.classList.remove('is-example');
  hasRealResult = true;
  baseResultText = email;
  outputLang = 'de';
  outputLangManual = false;
  updateTranslateUI();
  copyBtn.disabled = false;
  setSubject(subject);
  if (doTranslate) await applyDefaultTranslation();
}

// „In deinem gelernten Stil"-Hinweis unter der erzeugten Mail – nur bei echter KI
// UND wenn der Nutzer einen gelernten Stil hat (window.__mpHasStyle). Ausfallsicher:
// kein Flag / nicht eingeloggt / Demo → kein Badge.
function updateStyleBadge(isApi) {
  if (!output) return;
  const show = Boolean(isApi && currentUser && window.__mpHasStyle);
  let badge = document.getElementById('mpStyleBadge');
  if (!badge) {
    if (!show) return;
    badge = document.createElement('div');
    badge.id = 'mpStyleBadge';
    badge.style.cssText = 'margin:8px 0 0;font-size:13px;color:#a78bfa;display:flex;align-items:center;gap:6px;';
    output.insertAdjacentElement('afterend', badge);
  }
  badge.textContent = '✨ ' + t('result_styled');
  badge.style.display = show ? 'flex' : 'none';
}

// Varianten-Umschalter (Variante 1 / 2 / …) rendern.
function renderVariantSwitcher() {
  const row = document.getElementById('variantRow');
  if (!row) return;
  if (resultVariants.length > 1) {
    row.innerHTML = resultVariants.map((v, i) =>
      '<button type="button" class="variant-btn' + (i === currentVariant ? ' is-active' : '') + '" data-vi="' + i + '">' + escapeHtml(t('variant_label')) + ' ' + (i + 1) + '</button>').join('');
    row.hidden = false;
    row.querySelectorAll('.variant-btn').forEach((b) => b.addEventListener('click', () => {
      currentVariant = +b.dataset.vi;
      renderVariantSwitcher();
      const v = resultVariants[currentVariant];
      showResult(v.email, v.subject, false);
    }));
  } else { row.hidden = true; row.innerHTML = ''; }
}

function setRefineEnabled(on) { document.querySelectorAll('.refine-btn').forEach((b) => { b.disabled = !on; }); }

// Schnell-Button: bestehende E-Mail gemäß Anweisung überarbeiten (zählt nicht gegen das Limit).
async function doRefine(instr) {
  if (!hasRealResult || !output.value) return;
  if (!currentUser) { openAuthModal('login'); return; }
  setRefineEnabled(false);
  setLoading(true);
  setStatus(t('st_optimizing'), 'busy');
  try {
    const result = await generateEmail(output.value, activeTone, activeLength, activeFormality, { refine: instr });
    if (result.needLogin) { openAuthModal('login'); setStatus(t('st_signin'), 'warn'); return; }
    if (result.limitReached) { setRemaining(0); openAuthModal('upgrade'); setStatus(t('st_limit'), 'warn'); return; }
    if (resultVariants[currentVariant]) resultVariants[currentVariant].email = result.email;
    const sub = resultVariants[currentVariant] ? resultVariants[currentVariant].subject : '';
    await showResult(result.email, sub, false);
    setStatus(result.source === 'api' ? t('st_ready') : t('st_demo'), result.source === 'api' ? 'ok' : 'warn');
    if (typeof result.remaining === 'number') setRemaining(result.remaining, result.unlimited);
  } catch (e) { console.error(e); setStatus(t('st_error'), 'error'); }
  finally { setRefineEnabled(true); setLoading(false); }
}

const REFINE_ACTIONS = [
  { key: 'refine_friendly',  instr: 'Mach die E-Mail freundlicher und wärmer, ohne den Inhalt zu ändern.' },
  { key: 'refine_shorter',   instr: 'Fasse die E-Mail deutlich kürzer und prägnanter.' },
  { key: 'refine_formal',    instr: 'Mach die E-Mail förmlicher und höflicher (Sie-Form).' },
  { key: 'refine_assertive', instr: 'Formuliere die E-Mail bestimmter und selbstbewusster.' },
];

const TEMPLATES = {
  de: [
    { id: 'angebot',     label: 'Angebot',     body: 'Angebot für [Produkt/Leistung]\nPreis: [X] €\nLieferzeit: [X] Tage\ngültig bis [Datum]' },
    { id: 'termin',      label: 'Termin',      body: 'Terminvorschlag für [Anlass]\nDatum: [Datum] um [Uhrzeit]\nOrt: [Ort/Online]\nbitte um kurze Bestätigung' },
    { id: 'absage',      label: 'Absage',      body: 'Leider Absage zu [Anfrage/Bewerbung]\nGrund: [kurz]\nDank für das Interesse' },
    { id: 'nachfassen',  label: 'Nachfassen',  body: 'freundlich nachfassen zu [Thema/Angebot vom Datum]\nsind noch Fragen offen?\nbitte um kurze Rückmeldung' },
    { id: 'reklamation', label: 'Reklamation', body: 'Reklamation zu [Produkt/Bestellung Nr.]\nProblem: [kurze Beschreibung]\ngewünschte Lösung: [Ersatz/Erstattung]' },
  ],
  en: [
    { id: 'angebot',     label: 'Quote',     body: 'Quote for [product/service]\nPrice: [X]\nDelivery time: [X] days\nvalid until [date]' },
    { id: 'termin',      label: 'Meeting',   body: 'Proposed meeting for [topic]\nDate: [date] at [time]\nLocation: [place/online]\nplease confirm' },
    { id: 'absage',      label: 'Decline',   body: 'Unfortunately declining [request/application]\nReason: [brief]\nthank you for your interest' },
    { id: 'nachfassen',  label: 'Follow-up', body: 'friendly follow-up on [topic/quote from date]\nany open questions?\nlooking forward to your reply' },
    { id: 'reklamation', label: 'Complaint', body: 'Complaint about [product/order no.]\nIssue: [brief]\ndesired resolution: [replacement/refund]' },
  ],
};

/* ---- Branchen-Paket: Branche wählen → passende Vorlagen + Fachsprache ---- */
const INDUSTRIES = [
  { id: 'allgemein', de: 'Allgemein',                    en: 'General' },
  { id: 'makler',    de: 'Immobilien / Makler',          en: 'Real estate' },
  { id: 'handwerk',  de: 'Handwerk',                     en: 'Trades / crafts' },
  { id: 'steuer',    de: 'Steuerberatung / Kanzlei',     en: 'Tax / law firm' },
  { id: 'gastro',    de: 'Gastronomie / Hotel',          en: 'Hospitality' },
  { id: 'handel',    de: 'Einzelhandel / Onlinehandel',  en: 'Retail / e-commerce' },
  { id: 'beratung',  de: 'Beratung / Agentur',           en: 'Consulting / agency' },
  { id: 'praxis',    de: 'Gesundheit / Praxis',          en: 'Healthcare / practice' },
];
const INDUSTRY_KEY = 'mp_industry';
function getIndustry() { try { return localStorage.getItem(INDUSTRY_KEY) || 'allgemein'; } catch { return 'allgemein'; } }
function industryLabel() {
  const ind = INDUSTRIES.find((x) => x.id === getIndustry());
  if (!ind || ind.id === 'allgemein') return '';
  return lang === 'en' ? ind.en : ind.de;
}

// Branchenspezifische Vorlagen (deutsch); für „Allgemein"/EN die normalen TEMPLATES.
const INDUSTRY_TEMPLATES = {
  makler: [
    { id: 'expose',       label: 'Exposé senden',      body: 'Exposé zu [Objekt/Adresse] versenden\nEckdaten: [Zimmer], [m²], [Preis] €\nBesichtigung möglich ab [Datum]' },
    { id: 'besichtigung', label: 'Besichtigung',       body: 'Besichtigungstermin für [Objekt]\nVorschlag: [Datum] um [Uhrzeit]\nbitte um kurze Bestätigung' },
    { id: 'absage_int',   label: 'Absage Interessent', body: 'Leider Absage zu [Objekt]\nObjekt ist bereits [reserviert/verkauft]\nDank für das Interesse, melde mich bei passenden Objekten' },
    { id: 'preis',        label: 'Preisrückmeldung',   body: 'Rückmeldung zur Preisvorstellung für [Objekt]\nangebotener Preis: [X] €\nSpielraum: [kurz]' },
  ],
  handwerk: [
    { id: 'kva',     label: 'Kostenvoranschlag', body: 'Kostenvoranschlag für [Arbeit/Projekt]\ngeschätzte Kosten: [X] €\nDauer: [X] Tage\nMaterial inklusive: [ja/nein]' },
    { id: 'termin',  label: 'Terminbestätigung', body: 'Terminbestätigung für [Arbeit]\nDatum: [Datum] ab [Uhrzeit]\nbitte Zugang/Parkmöglichkeit sicherstellen' },
    { id: 'verzug',  label: 'Terminverschiebung',body: 'Termin für [Arbeit] muss leider verschoben werden\nGrund: [kurz]\nneuer Vorschlag: [Datum]' },
    { id: 'rechnung',label: 'Rechnung ankündigen',body: 'Arbeit [Projekt] ist abgeschlossen\nRechnung folgt über [X] €\nZahlungsziel: [X] Tage' },
  ],
  steuer: [
    { id: 'unterlagen', label: 'Unterlagen anfordern', body: 'Bitte um Unterlagen für [Mandant/Zeitraum]\nbenötigt: [Belege/Kontoauszüge/…]\nFrist: [Datum]' },
    { id: 'frist',      label: 'Fristerinnerung',      body: 'Erinnerung an Frist [Steuererklärung/Abgabe]\nFälligkeit: [Datum]\nbitte fehlende Unterlagen nachreichen' },
    { id: 'termin',     label: 'Besprechung',          body: 'Terminvorschlag zur Besprechung [Thema]\nDatum: [Datum] um [Uhrzeit]\nOrt: [Kanzlei/Online]' },
  ],
  gastro: [
    { id: 'reservierung', label: 'Reservierung', body: 'Bestätigung Reservierung\nfür [Personenzahl] am [Datum] um [Uhrzeit]\nbesondere Wünsche: [kurz]' },
    { id: 'event',        label: 'Event-Anfrage', body: 'Angebot für [Feier/Event]\n[Personenzahl] Personen am [Datum]\nMenü/Paket: [kurz], Preis ab [X] €' },
    { id: 'ausgebucht',   label: 'Ausgebucht',    body: 'Leider ausgebucht für [Datum]\nAlternative: [Datum/Uhrzeit]\nfreuen uns auf einen Besuch' },
  ],
  handel: [
    { id: 'bestell', label: 'Bestellbestätigung', body: 'Bestellbestätigung Nr. [X]\nArtikel: [kurz]\nLieferung voraussichtlich [Datum]' },
    { id: 'versand', label: 'Versandinfo',        body: 'Bestellung [Nr.] ist unterwegs\nSendungsnummer: [X]\nvoraussichtliche Zustellung: [Datum]' },
    { id: 'retoure', label: 'Retoure',            body: 'Rückmeldung zur Retoure [Bestellnr.]\nArtikel: [kurz]\nErstattung/Umtausch: [Option] in [X] Tagen' },
  ],
};
function currentTemplates() {
  const ind = getIndustry();
  if (ind !== 'allgemein' && INDUSTRY_TEMPLATES[ind]) return INDUSTRY_TEMPLATES[ind];
  return TEMPLATES[lang] || TEMPLATES.en;
}

/* ---- Eigene (gespeicherte) Vorlagen ---- */
const USER_TPL_KEY = 'mp_user_templates';
function getUserTemplates() { try { return JSON.parse(localStorage.getItem(USER_TPL_KEY) || '[]'); } catch { return []; } }
function setUserTemplates(arr) { try { localStorage.setItem(USER_TPL_KEY, JSON.stringify(arr)); } catch {} }
function saveCurrentAsTemplate() {
  const body = input.value.trim();
  if (!body) { toast(t('tpl_need_text'), 'warn'); return; }
  const name = (window.prompt(t('tpl_save_prompt')) || '').trim();
  if (!name) return;
  const arr = getUserTemplates().filter((x) => x.name !== name);   // gleicher Name = überschreiben
  arr.push({ name: name.slice(0, 40), body });
  setUserTemplates(arr);
  renderTemplateChips();
  toast(t('tpl_saved'), 'ok');
}
function deleteUserTemplate(name) {
  setUserTemplates(getUserTemplates().filter((x) => x.name !== name));
  renderTemplateChips();
}

// Vorlagen-Chips über das Notizfeld injizieren: Branchen-Vorlagen + eigene gespeicherte + „Speichern".
let renderTemplateChips = function () {};
(function setupTemplates() {
  if (!input) return;
  const row = htmlToEl('<div class="tpl-row" id="tplRow" role="group" aria-label="' + escapeHtml(t('tpl_label')) + '"><span class="tpl-row__label" data-i18n="tpl_label">' + escapeHtml(t('tpl_label')) + '</span><div class="tpl-row__chips" id="tplChips"></div></div>');
  const anchor = document.getElementById('replyBox') || input;
  anchor.insertAdjacentElement('beforebegin', row);
  const chipsBox = row.querySelector('#tplChips');
  renderTemplateChips = function () {
    const list = currentTemplates();
    const user = getUserTemplates();
    let html = list.map((tp) => '<button type="button" class="tpl-chip" data-tpl="' + escapeHtml(tp.id) + '">' + escapeHtml(tp.label) + '</button>').join('');
    html += user.map((tp, i) => '<span class="tpl-chip tpl-chip--user" data-uti="' + i + '" title="' + escapeHtml(tp.name) + '">' + escapeHtml(tp.name) + '<button type="button" class="tpl-chip__del" data-udel="' + i + '" aria-label="Löschen">&times;</button></span>').join('');
    html += '<button type="button" class="tpl-chip tpl-chip--save" id="tplSave">+ ' + escapeHtml(t('tpl_save')) + '</button>';
    chipsBox.innerHTML = html;
    // Branchen-/Standard-Vorlage laden
    chipsBox.querySelectorAll('.tpl-chip[data-tpl]').forEach((b) => b.addEventListener('click', () => {
      const tp = list.find((x) => x.id === b.dataset.tpl);
      if (!tp) return;
      input.value = tp.body; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus();
    }));
    // Eigene Vorlage laden (Klick auf den Chip, nicht auf das ×)
    chipsBox.querySelectorAll('.tpl-chip--user').forEach((el) => el.addEventListener('click', (e) => {
      if (e.target.closest('.tpl-chip__del')) return;
      const tp = getUserTemplates()[+el.dataset.uti];
      if (tp) { input.value = tp.body; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); }
    }));
    // Eigene Vorlage löschen
    chipsBox.querySelectorAll('.tpl-chip__del').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const tp = getUserTemplates()[+b.dataset.udel];
      if (tp) deleteUserTemplate(tp.name);
    }));
    // Aktuellen Text als eigene Vorlage speichern
    const sv = chipsBox.querySelector('#tplSave');
    if (sv) sv.addEventListener('click', saveCurrentAsTemplate);
  };
  renderTemplateChips();
})();

// „Mehrere Varianten"-Schalter direkt über dem Notizfeld.
(function setupVariantsToggle() {
  if (!input) return;
  const box = htmlToEl('<label class="opt-check" id="variantsBox"><input type="checkbox" id="variantsToggle" /><span data-i18n="variants_toggle">' + escapeHtml(t('variants_toggle')) + '</span></label>');
  input.insertAdjacentElement('beforebegin', box);
})();

// Betreff-Zeile + Varianten-Umschalter (über der Ausgabe) und Schnell-Buttons (darunter) injizieren.
(function setupResultControls() {
  if (!output) return;
  const variantRow = htmlToEl('<div class="variant-row" id="variantRow" hidden></div>');
  const subjectRow = htmlToEl('<div class="subject-row" id="subjectRow" hidden><span class="subject-row__label" data-i18n="subject_label">' + escapeHtml(t('subject_label')) + '</span><input type="text" id="subjectField" class="subject-row__field" readonly /><button type="button" class="subject-row__copy" id="subjectCopy" aria-label="Copy"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>');
  output.insertAdjacentElement('beforebegin', variantRow);
  output.insertAdjacentElement('beforebegin', subjectRow);
  const refineBtns = REFINE_ACTIONS.map((a) => '<button type="button" class="refine-btn" data-i18n="' + a.key + '" data-instr="' + escapeHtml(a.instr) + '" disabled>' + escapeHtml(t(a.key)) + '</button>').join('');
  const refineRow = htmlToEl('<div class="refine-row" id="refineRow">' + refineBtns + '</div>');
  output.insertAdjacentElement('afterend', refineRow);
  refineRow.querySelectorAll('.refine-btn').forEach((b) => b.addEventListener('click', () => doRefine(b.dataset.instr)));
  const sc = subjectRow.querySelector('#subjectCopy');
  if (sc) sc.addEventListener('click', async () => {
    const f = document.getElementById('subjectField');
    if (!f || !f.value) return;
    try { await navigator.clipboard.writeText(f.value); } catch {}
    sc.classList.add('is-copied'); setTimeout(() => sc.classList.remove('is-copied'), 1500);
  });
})();

/* ---- Tonfall-Auswahl ---- */
tonePills.forEach((pill) => {
  pill.addEventListener('click', () => {
    tonePills.forEach((p) => { p.classList.remove('is-active'); p.setAttribute('aria-pressed', 'false'); });
    pill.classList.add('is-active');
    pill.setAttribute('aria-pressed', 'true');
    activeTone = pill.dataset.tone;
  });
});

/* ---- Regler „Länge" & „Formalität" (wie in der Desktop-App) ----
   Die ausgewählten Stufen (0–2) werden beim Optimieren ans Backend übergeben. */
// 5 Beschriftungs-Stufen über den stufenlosen Regler (0–100). Der Knopf gleitet
// flüssig; das Wort rechts zeigt die aktuelle Tendenz an.
function lenLabels()  { return [t('len_vshort'), t('len_short'), t('len_medium'), t('len_long'), t('len_vlong')]; }
function formLabels() { return [t('form_vcasual'), t('form_casual'), t('form_neutral'), t('form_formal'), t('form_vformal')]; }
function sliderBucket(v) { return Math.max(0, Math.min(4, Math.round((+v || 0) / 25))); }
function updateSliderLabels() {
  if (lenVal && lenRange)   lenVal.textContent  = lenLabels()[sliderBucket(lenRange.value)]   ?? '';
  if (formVal && formRange) formVal.textContent = formLabels()[sliderBucket(formRange.value)] ?? '';
}
if (lenRange) {
  lenRange.addEventListener('input', () => { activeLength = +lenRange.value; updateSliderLabels(); });
}
if (formRange) {
  formRange.addEventListener('input', () => { activeFormality = +formRange.value; updateSliderLabels(); });
}

/* ---- MailPilot-Gehirn: bevorzugte Regler (Ton/Länge/Förmlichkeit) merken ----
   Übernimmt gespeicherte Vorlieben in die UI und speichert Änderungen server-
   seitig (geräteübergreifend). Alles ausfallsicher – ohne Login/Server bleibt
   einfach alles beim Alten. */
function mpApplyPrefs(p) {
  try {
    if (!p) return;
    if (p.default_tone) {
      activeTone = p.default_tone;
      tonePills.forEach((pill) => {
        const on = pill.dataset.tone === p.default_tone;
        pill.classList.toggle('is-active', on);
        pill.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    if (p.default_length != null && lenRange) { lenRange.value = p.default_length; activeLength = +p.default_length; }
    if (p.default_formality != null && formRange) { formRange.value = p.default_formality; activeFormality = +p.default_formality; }
    updateSliderLabels();
  } catch {}
}
let mpPrefsTimer = null;
function mpSavePrefsSoon() { clearTimeout(mpPrefsTimer); mpPrefsTimer = setTimeout(mpSavePrefs, 1000); }
async function mpSavePrefs() {
  try {
    if (!(window.Clerk && window.Clerk.session)) return;
    const token = await window.Clerk.session.getToken();
    if (!token) return;
    await fetch(API_BASE + '/.netlify/functions/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ default_tone: activeTone, default_length: activeLength, default_formality: activeFormality }),
    });
  } catch {}
}
tonePills.forEach((pill) => pill.addEventListener('click', mpSavePrefsSoon));
if (lenRange)  lenRange.addEventListener('change', mpSavePrefsSoon);
if (formRange) formRange.addEventListener('change', mpSavePrefsSoon);

/* ---- Hauptaktion: E-Mail optimieren ---- */
optimizeBtn.addEventListener('click', runOptimize);
input.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runOptimize(); }
});

// „Ärger entschärfen": macht aus einem wütenden Entwurf eine sachliche, ruhige Mail.
(function setupDeescalate() {
  if (!optimizeBtn) return;
  const btn = htmlToEl('<button type="button" class="btn btn--ghost" id="deescalateBtn" title="' + escapeHtml(t('deescalate_btn')) + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><span class="btn__label" data-i18n="deescalate_btn">' + escapeHtml(t('deescalate_btn')) + '</span></button>');
  optimizeBtn.insertAdjacentElement('afterend', btn);
  btn.addEventListener('click', runDeescalate);
})();

async function runDeescalate() {
  const text = input.value.trim();
  if (!text) {
    input.focus();
    input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
    setStatus(t('st_need_input'), 'warn');
    return;
  }
  if (!currentUser) { openAuthModal('login'); return; }
  setLoading(true);
  setStatus(t('st_optimizing'), 'busy');
  try {
    const result = await generateEmail(text, activeTone, activeLength, activeFormality, {
      deescalate: true, subject: true, style: getStyle(), industry: industryLabel(),
    });
    if (result.needLogin) { openAuthModal('login'); setStatus(t('st_signin'), 'warn'); return; }
    if (result.limitReached) { setRemaining(0); openAuthModal('upgrade'); setStatus(t('st_limit'), 'warn'); return; }
    resultVariants = (result.variants && result.variants.length > 1)
      ? result.variants
      : [{ subject: result.subject || '', email: result.email }];
    currentVariant = 0;
    renderVariantSwitcher();
    setStatus(result.source === 'api' ? t('st_ready') : t('st_demo'), result.source === 'api' ? 'ok' : 'warn');
    if (typeof result.remaining === 'number') setRemaining(result.remaining, result.unlimited);
    await showResult(resultVariants[0].email, resultVariants[0].subject, result.source === 'api');
    updateStyleBadge(result.source === 'api');
    setRefineEnabled(true);
  } catch (err) { console.error(err); setStatus(t('st_error'), 'error'); }
  finally { setLoading(false); }
}

async function runOptimize() {
  const text = input.value.trim();

  if (!text) {
    input.focus();
    input.classList.remove('shake');
    void input.offsetWidth;           // Reflow erzwingen, damit die Animation neu startet
    input.classList.add('shake');
    setStatus(t('st_need_input'), 'warn');
    return;
  }

  // Tool ist frei sichtbar/benutzbar – erst beim Klick ohne Login → Modal
  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  setLoading(true);
  setStatus(t('st_optimizing'), 'busy');

  try {
    const result = await generateEmail(text, activeTone, activeLength, activeFormality, {
      replyTo: getReplyTo(),
      subject: true,                       // Betreffzeile (7)
      style: getStyle(),                   // eigener Stil (4)
      variants: wantsVariants() ? 2 : 1,   // mehrere Varianten (6)
      industry: industryLabel(),           // Branchen-Kontext
    });

    if (result.needLogin) { openAuthModal('login'); setStatus(t('st_signin'), 'warn'); return; }
    if (result.limitReached) { setRemaining(0); openAuthModal('upgrade'); setStatus(t('st_limit'), 'warn'); return; }

    // Ergebnis als eine oder mehrere Varianten aufbereiten (jede mit eigenem Betreff).
    resultVariants = (result.variants && result.variants.length > 1)
      ? result.variants
      : [{ subject: result.subject || '', email: result.email }];
    currentVariant = 0;
    renderVariantSwitcher();
    setStatus(result.source === 'api' ? t('st_ready') : t('st_demo'), result.source === 'api' ? 'ok' : 'warn');
    if (typeof result.remaining === 'number') setRemaining(result.remaining, result.unlimited);
    // Erste Variante anzeigen (Signatur einsetzen + ggf. in die Standardsprache übersetzen).
    await showResult(resultVariants[0].email, resultVariants[0].subject, result.source === 'api');
    updateStyleBadge(result.source === 'api');
    setRefineEnabled(true);
  } catch (err) {
    console.error(err);
    setStatus(t('st_error'), 'error');
  } finally {
    setLoading(false);
  }
}

/* ---- Button-/Status-Hilfen ---- */
function setLoading(isLoading) {
  optimizeBtn.classList.toggle('is-loading', isLoading);
  optimizeBtn.disabled = isLoading;
  const label = optimizeBtn.querySelector('.btn__label');
  label.textContent = isLoading ? t('optimize_loading') : t('optimize_btn');
}

function setStatus(text, type) {
  outputStatus.textContent = text;
  outputStatus.dataset.type = type || '';
}

/* ---- In die Zwischenablage kopieren ---- */
copyBtn.addEventListener('click', async () => {
  if (!output.value) return;
  // MailPilot-Gehirn: aus der wirklich kopierten/gesendeten Mail den Stil weiterlernen
  // (fire-and-forget; window.mpLearnFrom respektiert Login + Lern-Schalter).
  try { if (window.mpLearnFrom) window.mpLearnFrom(output.value); } catch {}
  // Beim Kopieren den (abschaltbaren) MailPilot-Hinweis anhängen → virale Verbreitung.
  let txt = output.value;
  if (promoEnabled()) txt = txt.replace(/\s+$/, '') + '\n\n' + getPromoLine();
  try {
    await navigator.clipboard.writeText(txt);
  } catch {
    const prev = output.value;
    output.value = txt;
    output.select();
    document.execCommand('copy');
    output.value = prev;
    window.getSelection()?.removeAllRanges();
  }
  const label = copyBtn.querySelector('.btn__label');
  copyBtn.classList.add('is-copied');
  label.textContent = t('copied');
  setTimeout(() => { copyBtn.classList.remove('is-copied'); label.textContent = t('copy_btn'); }, 2000);
});

/* =========================================================
   KI-Anbindung (Netlify Function + Demo-Fallback)
   ---------------------------------------------------------
   API-Basis automatisch bestimmen: Im Web (gleiche Origin – mailpilot-ai.com,
   *.netlify.app oder localhost) wird RELATIV aufgerufen. Läuft das Frontend in
   einem anderen Kontext – z. B. der Desktop-/Tauri-WebView mit tauri://- oder
   file://-Origin – wird die ABSOLUTE Produktions-URL verwendet, damit die
   Netlify-Functions überhaupt erreichbar sind.
   ========================================================= */
function apiRoot() {
  try {
    const o = (typeof location !== 'undefined' && location.origin) || '';
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|$|\/)/i.test(o) ||
        /^https?:\/\/([a-z0-9-]+\.)*mailpilot-ai\.com(:|$|\/)/i.test(o) ||
        /^https?:\/\/([a-z0-9-]+\.)*netlify\.app(:|$|\/)/i.test(o)) {
      return '';                                 // gleiche Origin → relativ (Web)
    }
  } catch {}
  return 'https://mailpilot-ai.com';             // Desktop / anderer Kontext → absolut
}
const API_BASE     = apiRoot();
const API_ENDPOINT = API_BASE + '/.netlify/functions/optimize-email';

async function generateEmail(text, tone, length, formality, opts) {
  // Identity-Token mitschicken – das Backend identifiziert den Nutzer darüber
  // und zählt das Tageslimit fälschungssicher serverseitig.
  const headers = { 'Content-Type': 'application/json' };
  try {
    if (currentUser && currentUser.jwt) {
      headers['Authorization'] = `Bearer ${await currentUser.jwt()}`;
    }
  } catch {}

  // Länge/Formalität (Regler-Stufen 0–2) gehen mit ans Backend.
  const payload = { text, tone };
  if (typeof length === 'number')    payload.length = length;
  if (typeof formality === 'number') payload.formality = formality;
  if (opts) {
    if (opts.replyTo)                       payload.replyTo  = opts.replyTo;   // Antwort-Modus
    if (opts.refine)                        payload.refine   = opts.refine;    // Schnell-Buttons
    if (opts.style)                         payload.style    = opts.style;     // eigener Stil
    if (opts.subject)                       payload.subject  = true;           // Betreffzeile
    if (opts.variants && opts.variants > 1) payload.variants = opts.variants;  // Varianten
    if (opts.deescalate)                    payload.deescalate = true;         // Ärger entschärfen
    if (opts.industry)                      payload.industry = opts.industry;  // Branchen-Kontext
  }

  // Persönlichen Namen (aus den Einstellungen) mitschicken → die KI setzt ihn
  // direkt in die Grußformel, statt einen [Name]-Platzhalter zu hinterlassen.
  // applySignature() bleibt zusätzlich als Fallback aktiv.
  const senderName = getName();
  if (senderName) payload.senderName = senderName;

  let res;
  try {
    res = await fetch(API_ENDPOINT, { method: 'POST', headers, body: JSON.stringify(payload) });
  } catch {
    return { email: simulateOptimization(text, tone), source: 'demo' };
  }

  if (res.status === 404) return { email: simulateOptimization(text, tone), source: 'demo' };
  if (res.status === 401) return { needLogin: true };
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    if (data.limitReached) return { limitReached: true };
    throw new Error(data.error || 'Rate limit');
  }
  // Backend nicht erreichbar / Serverfehler (z. B. fehlender API-Schlüssel,
  // Funktion abgestürzt) → auf den Demo-Modus zurückfallen, damit die
  // Optimierung immer reagiert und ein Ergebnis liefert.
  if (res.status >= 500) return { email: simulateOptimization(text, tone), source: 'demo' };
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `API-Fehler (${res.status})`);
  }

  const data = await res.json();
  return { email: data.email, subject: data.subject, variants: data.variants, source: 'api', remaining: data.remaining, unlimited: data.unlimited === true };
}

/* Einfache, lokale Aufbereitung als Platzhalter für die echte KI */
function simulateOptimization(text, tone) {
  const presets = {
    professionell: { greeting: 'Sehr geehrte Damen und Herren,', closing: 'Mit freundlichen Grüßen' },
    freundlich:    { greeting: 'Hallo zusammen,',                closing: 'Viele Grüße' },
    foermlich:     { greeting: 'Sehr geehrte Damen und Herren,', closing: 'Hochachtungsvoll' },
    locker:        { greeting: 'Hi,',                            closing: 'Beste Grüße' },
  };
  const preset = presets[tone] || presets.professionell;

  const cleaned = [];
  let lastBlank = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '') {
      if (!lastBlank && cleaned.length) cleaned.push('');
      lastBlank = true;
      continue;
    }
    lastBlank = false;
    let s = line.charAt(0).toUpperCase() + line.slice(1);
    if (!/[.!?:]$/.test(s)) s += '.';
    cleaned.push(s);
  }

  const body = cleaned.join('\n').trim();
  return `${preset.greeting}\n\n${body}\n\n${preset.closing}`;
}

/* =========================================================
   Anmeldestatus (Clerk) & Limit-Anzeige
   ---------------------------------------------------------
   Das Tool ist frei sichtbar; das Login-Modal erscheint erst
   beim Klick auf „E-Mail optimieren", falls nicht angemeldet.
   Das Tageslimit (5/Tag) zählt FÄLSCHUNGSSICHER serverseitig
   in optimize.mjs – hier nur die Anzeige.
   ========================================================= */
const FREE_LIMIT = 5;
let currentUser = null;
let remainingToday = FREE_LIMIT;
let unlimitedToday = false; // true bei aktivem Bezahl-Tarif (Server meldet unlimited)

const account = document.getElementById('account');

function userLabel(user) {
  return (user && (user.fullName || user.email)) || 'Account';
}

function renderAccount() {
  if (currentUser) {
    const label = userLabel(currentUser);
    // Hinweis: Das Tageslimit („Noch X heute") steht jetzt unten im
    // KI-Vorschlag-Header (siehe #quotaHint / renderQuota), nicht mehr hier oben.
    account.innerHTML = `
      <span class="account__user" title="${label}">${label}</span>
      <button class="btn-account btn-account--ghost" type="button" id="logoutBtn">${t('signout')}</button>`;
    document.getElementById('logoutBtn').addEventListener('click', () => window.Clerk && window.Clerk.signOut());
  } else {
    account.innerHTML = `<button class="btn-account" type="button" id="loginBtn">
        <span class="btn-account__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20.5a6.5 6.5 0 0 1 13 0"/></svg></span>
        <span>${t('cta_header')}</span>
      </button>`;
    document.getElementById('loginBtn').addEventListener('click', () => openAuthModal('login'));
  }
}

/* Tages-Limit-Anzeige im KI-Vorschlag-Header (links neben der Übersetzen-Auswahl).
   Nur für angemeldete Nutzer sichtbar – Gäste sehen keinen Reststand. */
const quotaHint = document.getElementById('quotaHint');
function renderQuota() {
  if (!quotaHint) return;
  // Zahlende Kunden haben praktisch kein Limit → Zähler ausblenden.
  if (currentUser && !unlimitedToday) {
    quotaHint.hidden = false;
    quotaHint.textContent = t('left_today').replace('{n}', remainingToday);
  } else {
    quotaHint.hidden = true;
    quotaHint.textContent = '';
  }
}

function setRemaining(n, unlimited) {
  if (typeof n === 'number') remainingToday = Math.max(0, n);
  if (typeof unlimited === 'boolean') unlimitedToday = unlimited;
  renderAccount();
  renderQuota();
}

/* Clerk-Login: die echten Auth-Seiten liegen unter /sign-in bzw. /sign-up
   (Next.js + ClerkProvider, siehe app/layout.jsx & app/sign-in). Clerk leitet
   nach erfolgreicher Anmeldung automatisch zurück auf die Startseite. */
function openLogin()  { window.location.assign('/sign-in'); }
function openSignup() { window.location.assign('/sign-up'); }

async function fetchRemaining() {
  if (!currentUser) return;
  try {
    const headers = {};
    if (currentUser.jwt) headers['Authorization'] = `Bearer ${await currentUser.jwt()}`;
    const res = await fetch(API_ENDPOINT, { headers });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.remaining === 'number') setRemaining(data.remaining, data.unlimited === true);
    }
  } catch {}
}

/* =========================================================
   Clerk-Session (Anmeldestatus & Token für Backend-Aufrufe)
   ---------------------------------------------------------
   @clerk/nextjs stellt im Browser window.Clerk bereit. Wir spiegeln den
   Anmeldestatus in currentUser und holen für die Backend-Aufrufe (optimize-
   email) ein kurzlebiges Session-Token via Clerk.session.getToken().
   ========================================================= */
function clerkToCurrentUser() {
  const c = window.Clerk;
  if (!c || !c.user) return null;
  const u = c.user;
  return {
    sub: u.id,
    email: u.primaryEmailAddress?.emailAddress || '',
    fullName: u.fullName || '',
    jwt: () => (c.session ? c.session.getToken() : Promise.resolve(null)),
  };
}

function syncClerkUser() {
  const wasLoggedIn = !!currentUser;
  currentUser = clerkToCurrentUser();
  if (!currentUser) remainingToday = FREE_LIMIT;
  if (currentUser && !wasLoggedIn) closeAuthModal(); // Modal nach erfolgreichem Login schließen
  renderAccount();
  renderQuota();                                     // Tages-Limit-Anzeige (unten) aktualisieren
  if (typeof renderSettingsAccount === 'function') renderSettingsAccount(); // Settings-Konto mitziehen
  fetchRemaining();
}

(function initClerkSession() {
  function attach() {
    const c = window.Clerk;
    if (!c) return;
    c.addListener(syncClerkUser); // feuert bei Load und bei jeder Statusänderung
    syncClerkUser();              // sofortiger erster Abgleich
  }
  if (window.Clerk) { attach(); return; }
  // Clerk wird vom ClerkProvider asynchron nachgeladen → kurz darauf warten.
  let tries = 0;
  const iv = setInterval(() => {
    if (window.Clerk) { clearInterval(iv); attach(); }
    else if (++tries > 100) clearInterval(iv); // nach ~10 s aufgeben → Gast-/Demo-Modus
  }, 100);
})();

/* =========================================================
   Modals: Auth, Impressum, Datenschutz
   ========================================================= */
function openModal(el)  { if (!el) return; el.hidden = false; document.body.classList.add('modal-open'); }
function closeModal(el) {
  if (!el) return;
  el.hidden = true;
  if (!document.querySelector('.modal:not([hidden])')) document.body.classList.remove('modal-open');
}

// --- Auth-Modal ---
const authModal     = document.getElementById('authModal');
const authTitle     = document.getElementById('authTitle');
const authSubtitle  = document.getElementById('authSubtitle');
const authPrimary   = document.getElementById('authPrimary');
const authSecondary = document.getElementById('authSecondary');
const authNote      = document.getElementById('authNote');

// reason: 'login' (nicht eingeloggt) | 'upgrade' (eingeloggt am Limit)
function openAuthModal(reason) {
  if (reason === 'upgrade') {
    authTitle.textContent     = t('auth_upgrade_title');
    authSubtitle.textContent  = t('auth_upgrade_sub');
    authPrimary.textContent   = t('auth_upgrade_primary');
    authPrimary.onclick       = () => { closeAuthModal(); document.getElementById('preise').scrollIntoView({ behavior: 'smooth' }); };
    authSecondary.textContent = t('auth_upgrade_secondary');
    authSecondary.onclick     = closeAuthModal;
    authNote.textContent      = t('auth_upgrade_note');
  } else {
    authTitle.textContent     = t('auth_login_title');
    authSubtitle.textContent  = t('auth_login_sub');
    authPrimary.textContent   = t('auth_login_primary');
    authPrimary.onclick       = () => { closeAuthModal(); openSignup(); };
    authSecondary.textContent = t('auth_login_secondary');
    authSecondary.onclick     = () => { closeAuthModal(); openLogin(); };
    authNote.textContent      = t('auth_login_note');
  }
  openModal(authModal);
}
function closeAuthModal() { closeModal(authModal); }

// --- Rechts-Modals (Footer) ---
const legalModal   = document.getElementById('legalModal');
const privacyModal = document.getElementById('privacyModal');
document.getElementById('legalLink')?.addEventListener('click', () => openModal(legalModal));
document.getElementById('privacyLink')?.addEventListener('click', () => openModal(privacyModal));

// Schließen: ×-Button / Hintergrund (data-close), Escape-Taste
document.querySelectorAll('[data-close]').forEach((el) => {
  el.addEventListener('click', () => closeModal(el.closest('.modal')));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('.modal:not([hidden])').forEach(closeModal);
});

/* ---- Preis-Buttons → Stripe Checkout (Testmodus) ----
   Erstellt serverseitig eine Checkout-Session und leitet den
   Browser zur sicheren, von Stripe gehosteten Bezahlseite weiter.
   Der Geheimschlüssel bleibt dabei ausschließlich serverseitig. */
const CHECKOUT_ENDPOINT = API_BASE + '/.netlify/functions/create-checkout-session';

async function startCheckout(plan, btn) {
  if (!plan) return;
  const original = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = t('checkout_starting'); }
  try {
    const payload = { plan };
    if (currentUser && currentUser.email) payload.email = currentUser.email;
    const headers = { 'Content-Type': 'application/json' };
    // Clerk-Token mitschicken → Stripe-Abo wird dem Konto zugeordnet (Webhook/Portal).
    try { if (currentUser && currentUser.jwt) headers['Authorization'] = `Bearer ${await currentUser.jwt()}`; } catch {}
    const res = await fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.error || 'Checkout-Fehler');
    window.location.href = data.url;          // Weiterleitung zu Stripe Checkout
  } catch (err) {
    console.error(err);
    alert(err.message || t('checkout_error'));   // echten Fehlertext anzeigen
    if (btn) { btn.disabled = false; btn.textContent = original; }
  }
}

document.querySelectorAll('[data-plan]').forEach((btn) => {
  btn.addEventListener('click', () => startCheckout(btn.dataset.plan, btn));
});
document.querySelectorAll('[data-scroll-tool]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => input.focus({ preventScroll: true }), 450);
  });
});

/* ---- Kopfzeile beim Scrollen abheben ---- */
const appHeader = document.querySelector('.app-header');
if (appHeader) {
  const onScroll = () => appHeader.classList.toggle('is-stuck', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* =========================================================
   Übersetzen-Auswahl im KI-Vorschlag (Ausgabe-Header)
   - Vorschau (Beispiel): sofort clientseitig umschalten
   - echtes Ergebnis: über die KI übersetzen (Netlify Function)
   ========================================================= */
function updateTranslateUI() {
  if (xlateCurrent) {
    // Button heißt standardmäßig „Übersetzen" (Auslöser zum Wechsel der Sprache).
    // Hat der Nutzer für diese E-Mail manuell eine andere Sprache gewählt, zeigt
    // der Button stattdessen diese Sprache an.
    xlateCurrent.textContent = outputLangManual ? (XLATE_NAMES[outputLang] || t('translate_label')) : t('translate_label');
  }
  if (xlateWrap) xlateWrap.classList.toggle('is-active', outputLangManual);
  // Aktuelle Zielsprache im Menü hervorheben – egal ob Standard oder manuell.
  document.querySelectorAll('.xlate__opt').forEach((o) => {
    o.classList.toggle('is-active', o.dataset.tl === outputLang);
  });
}

/* Standard-Übersetzung: das echte Ergebnis automatisch in der oben eingestellten
   Standardsprache anzeigen – ohne dass der Nutzer „Übersetzen" klicken muss.
   Wird nach jeder Optimierung und bei jedem Sprachwechsel aufgerufen, solange der
   Nutzer für diese E-Mail keine abweichende Zielsprache manuell gewählt hat. */
async function applyDefaultTranslation() {
  if (!hasRealResult || outputLangManual) return;
  // MailPilot-Gehirn: gemerkte Lieblings-Zielsprache hat Vorrang vor der UI-Sprache.
  const pref = window.__mpPrefLang;
  const target = (pref && XLATE_NAMES[pref]) ? pref : (SUPPORTED.includes(lang) ? lang : 'de');
  outputLang = target;
  updateTranslateUI();
  await translateResult(target);   // 'de' = Original wiederherstellen, sonst per KI übersetzen
}

async function selectTargetLang(code) {
  if (!code || !XLATE_NAMES[code]) return;
  outputLang = code;
  outputLangManual = true;
  updateTranslateUI();

  // MailPilot-Gehirn: die manuell gewählte Zielsprache als Vorliebe merken
  // (sofort für diese Sitzung + serverseitig fürs nächste Mal, fire-and-forget).
  window.__mpPrefLang = code;
  (async () => {
    try {
      if (!(window.Clerk && window.Clerk.session)) return;
      const token = await window.Clerk.session.getToken();
      if (!token) return;
      await fetch(API_BASE + '/.netlify/functions/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ preferred_lang: code }),
      });
    } catch {}
  })();

  // Noch kein echtes Ergebnis → Vorschau sofort in die Zielsprache umschalten
  if (!hasRealResult) {
    output.value = exampleFor(code);
    output.classList.add('is-example');
    setStatus(t('badge_example'), 'demo');
    return;
  }
  await translateResult(code);
}

async function translateResult(code) {
  // Deutsch = Originalsprache der erzeugten E-Mail → ohne API wiederherstellen
  if (code === 'de') {
    output.value = baseResultText;
    setStatus(t('st_ready'), 'ok');
    return;
  }
  output.classList.add('is-translating');
  setStatus(t('st_translating'), 'busy');
  try {
    const res = await translateEmail(baseResultText, code);
    if (res.needLogin) { openAuthModal('login'); setStatus(t('st_signin'), 'warn'); return; }
    if (res.offline)   { setStatus(t('st_translate_offline'), 'warn'); return; }
    output.value = res.email;
    setStatus(t('st_ready'), 'ok');
  } catch (err) {
    console.error(err);
    setStatus(t('st_error'), 'error');
  } finally {
    output.classList.remove('is-translating');
  }
}

// Übersetzungs-Anfrage ans Backend (zählt NICHT gegen das Tageslimit)
async function translateEmail(text, targetLang) {
  const headers = { 'Content-Type': 'application/json' };
  try {
    if (currentUser && currentUser.jwt) headers['Authorization'] = `Bearer ${await currentUser.jwt()}`;
  } catch {}

  let res;
  try {
    res = await fetch(API_ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ text, targetLang }) });
  } catch {
    return { offline: true };           // keine Verbindung / lokale Vorschau
  }
  if (res.status === 404) return { offline: true };
  if (res.status === 401) return { needLogin: true };
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `API-Fehler (${res.status})`);
  }
  const data = await res.json();
  return { email: data.email };
}

if (xlateBtn) {
  xlateBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = xlateMenu.hidden;
    xlateMenu.hidden = !willOpen;
    xlateBtn.setAttribute('aria-expanded', String(willOpen));
  });
  document.querySelectorAll('.xlate__opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      selectTargetLang(opt.dataset.tl);
      xlateMenu.hidden = true;
      xlateBtn.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', () => {
    if (xlateMenu && !xlateMenu.hidden) {
      xlateMenu.hidden = true;
      xlateBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

/* =========================================================
   Enterprise-Anfrageformular (Netlify Forms via AJAX)
   ---------------------------------------------------------
   Sendet die Anfrage an Netlify Forms (kein eigenes Backend
   nötig). Lokal ohne Netlify zeigt es eine freundliche
   Fehlermeldung mit der Kontakt-E-Mail.
   ========================================================= */
const enterpriseForm  = document.getElementById('enterpriseForm');
const entStatus       = document.getElementById('entStatus');
const enterpriseModal = document.getElementById('enterpriseModal');

// „Jetzt anfragen" in der Enterprise-Box öffnet das Pop-up.
// Schließen (X-Button / Hintergrund / Escape) übernimmt das bestehende
// data-close-System weiter unten – kein Extra-Code nötig.
document.getElementById('enterpriseOpen')?.addEventListener('click', (e) => {
  e.preventDefault();              // verhindert den Sprung der Seite (#-Link)
  openModal(enterpriseModal);
});

if (enterpriseForm) {
  enterpriseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit  = enterpriseForm.querySelector('.ent-form__submit');
    const payload = new URLSearchParams(new FormData(enterpriseForm)).toString();
    submit.disabled = true;
    submit.textContent = t('enterprise_sending');
    if (entStatus) { entStatus.textContent = ''; entStatus.dataset.type = ''; }
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      enterpriseForm.reset();
      if (entStatus) { entStatus.textContent = t('enterprise_success'); entStatus.dataset.type = 'ok'; }
    } catch (err) {
      if (entStatus) { entStatus.textContent = t('enterprise_error'); entStatus.dataset.type = 'error'; }
    } finally {
      submit.disabled = false;
      submit.textContent = t('enterprise_submit');
    }
  });
}

/* =========================================================
   Einstellungen, Theme (Dark/Light), Account & Abo, Download
   ---------------------------------------------------------
   Wird per JavaScript in die Seite injiziert (Zahnrad oben rechts
   + Settings-Modal), damit das vorhandene Markup unberührt bleibt.
   ========================================================= */

/* ---- UI-Texte (EN vollständig; DE; übrige Sprachen fallen via t() auf EN zurück) ---- */
const SET_EN = {
  set_open: 'Settings', set_title: 'Settings',
  set_appearance: 'Appearance', set_theme: 'Theme', set_dark: 'Dark', set_light: 'Light',
  set_account: 'Account', set_not_signed_in: 'You are not signed in.',
  set_manage_account: 'Manage account & password', set_signin: 'Sign in',
  set_signout: 'Sign out', set_signed_out: 'You have been signed out.',
  set_unavailable: 'This feature is currently unavailable.',
  set_subscription: 'Subscription', set_plan: 'Plan', set_status: 'Status',
  set_price: 'Price', set_renews: 'Next billing', set_manage_sub: 'Manage subscription',
  set_upgrade: 'View plans', set_sub_signin: 'Sign in to see your subscription.',
  set_sub_loading: 'Loading…', set_sub_free: 'Free — no active subscription.',
  set_sub_error: 'Could not load subscription data.',
  set_sub_none_yet: 'No active subscription to manage yet.',
  set_sub_cancels: 'Cancels on {date} — active until then.',
  set_month: 'monthly', set_year: 'yearly',
  dl_checking: 'Preparing…',
  dl_unavailable: 'The download isn’t available yet — it launches soon. Questions? info@mailpilot-ai.com',
  set_signature: 'Signature', set_signature_ph: 'e.g. Kind regards, Hans Müller, Example Ltd.',
  set_signature_hint: 'Replaces [Name] in the email, otherwise added at the end.',
  set_style: 'My style', set_style_ph: 'Paste 1–3 of your own emails here. MailPilot will match your tone.',
  set_style_hint: 'Optional — emails are then written in your personal style.',
  tpl_label: 'Templates', variants_toggle: 'Generate 2 variants', variant_label: 'Variant', subject_label: 'Subject',
  refine_friendly: 'friendlier', refine_shorter: 'shorter', refine_formal: 'more formal', refine_assertive: 'more assertive',
  deescalate_btn: 'Calm it down', promo_line: 'Written with MailPilot · mailpilot-ai.com',
  set_promo: 'Add a "Written with MailPilot" line when copying',
  set_industry: 'Industry', set_industry_hint: 'Templates and wording adapt to your industry.',
  tpl_save: 'Save', tpl_save_prompt: 'Name for this template:', tpl_saved: 'Template saved.',
  tpl_need_text: 'Please enter some notes first.',
  set_name: 'Your name', set_name_ph: 'e.g. Hans Müller', set_name_hint: 'Used under the closing — replaces [Name] automatically.',
};
const SET_DE = {
  set_open: 'Einstellungen', set_title: 'Einstellungen',
  set_appearance: 'Darstellung', set_theme: 'Design', set_dark: 'Dunkel', set_light: 'Hell',
  set_account: 'Konto', set_not_signed_in: 'Du bist nicht angemeldet.',
  set_manage_account: 'Konto & Passwort verwalten', set_signin: 'Anmelden',
  set_signout: 'Abmelden', set_signed_out: 'Du wurdest abgemeldet.',
  set_unavailable: 'Diese Funktion ist derzeit nicht verfügbar.',
  set_subscription: 'Abonnement', set_plan: 'Tarif', set_status: 'Status',
  set_price: 'Preis', set_renews: 'Nächste Abbuchung', set_manage_sub: 'Abonnement verwalten',
  set_upgrade: 'Tarife ansehen', set_sub_signin: 'Melde dich an, um dein Abo zu sehen.',
  set_sub_loading: 'Lädt…', set_sub_free: 'Gratis — kein aktives Abo.',
  set_sub_error: 'Abo-Daten konnten nicht geladen werden.',
  set_sub_none_yet: 'Noch kein aktives Abo zum Verwalten.',
  set_sub_cancels: 'Kündigung zum {date} — bis dahin aktiv.',
  set_month: 'monatlich', set_year: 'jährlich',
  dl_checking: 'Wird vorbereitet…',
  dl_unavailable: 'Der Download ist noch nicht verfügbar — Start in Kürze. Fragen? info@mailpilot-ai.com',
  set_signature: 'Signatur', set_signature_ph: 'z. B. Mit freundlichen Grüßen, Hans Müller, Musterfirma GmbH',
  set_signature_hint: 'Ersetzt [Name] in der E-Mail, sonst wird sie ans Ende gesetzt.',
  set_style: 'Mein Stil', set_style_ph: 'Füge hier 1–3 eigene E-Mails ein. MailPilot übernimmt deinen Ton.',
  set_style_hint: 'Optional — E-Mails werden dann in deinem persönlichen Stil geschrieben.',
  tpl_label: 'Vorlagen', variants_toggle: '2 Varianten erzeugen', variant_label: 'Variante', subject_label: 'Betreff',
  refine_friendly: 'freundlicher', refine_shorter: 'kürzer', refine_formal: 'förmlicher', refine_assertive: 'bestimmter',
  deescalate_btn: 'Ärger entschärfen', promo_line: 'Geschrieben mit MailPilot · mailpilot-ai.com',
  set_promo: 'Beim Kopieren „Geschrieben mit MailPilot" anhängen',
  set_industry: 'Branche', set_industry_hint: 'Vorlagen und Formulierungen passen sich deiner Branche an.',
  tpl_save: 'Speichern', tpl_save_prompt: 'Name für die Vorlage:', tpl_saved: 'Vorlage gespeichert.',
  tpl_need_text: 'Bitte zuerst Stichpunkte eingeben.',
  set_name: 'Dein Name', set_name_ph: 'z. B. Hans Müller', set_name_hint: 'Wird unter die Grußformel gesetzt — ersetzt automatisch [Name].',
};
if (typeof I18N !== 'undefined') { Object.assign(I18N.en, SET_EN); Object.assign(I18N.de, SET_DE); }

/* ---- kleine Helfer ---- */
function htmlToEl(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function toast(msg, type) {
  let el = document.getElementById('mpToast');
  if (!el) { el = document.createElement('div'); el.id = 'mpToast'; el.className = 'mp-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.dataset.type = type || ''; el.classList.add('is-show');
  // Längere Hinweise (z. B. die Firefox-Anleitung) bleiben länger stehen, damit man sie lesen kann.
  const dur = Math.min(12000, Math.max(5200, msg.length * 90));
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('is-show'), dur);
}

/* ---- Theme (Dark/Light) – dauerhaft in localStorage ---- */
const THEME_KEY = 'mp_theme';
function getTheme() { try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; } }
function applyTheme(theme) {
  const t2 = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t2;
  try { localStorage.setItem(THEME_KEY, t2); } catch {}
  document.querySelectorAll('[data-theme-set]').forEach((b) => b.classList.toggle('is-active', b.dataset.themeSet === t2));
}

/* ---- Outlook-Hinweisbanner ganz oben → /outlook (abweisbar, im App-Modus aus) ---- */
(function mpOutlookBanner() {
  try {
    if (document.documentElement.classList.contains('app-mode')) return;     // im Tool-/PWA-Modus kein Marketing
    if (localStorage.getItem('mp_outlook_banner') === 'off') return;          // schon weggeklickt
  } catch (e) {}
  const bar = htmlToEl(
    '<div id="mpOutlookBar" style="background:linear-gradient(90deg,#170d2b,#241640);border-bottom:1px solid #2c2148;padding:9px 42px 9px 16px;display:flex;align-items:center;justify-content:center;position:relative;font-family:Inter,Segoe UI,system-ui,sans-serif;">'
    + '<a href="/outlook" style="color:#cdbdf5;font-size:14px;font-weight:600;text-decoration:none;">✈ New: MailPilot works right inside Outlook — see how →</a>'
    + '<button type="button" aria-label="Close" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:#8b7fb0;font-size:18px;line-height:1;cursor:pointer;padding:2px 6px;">&times;</button>'
    + '</div>'
  );
  document.body.insertBefore(bar, document.body.firstChild);
  const x = bar.querySelector('button');
  if (x) x.addEventListener('click', function () {
    bar.remove();
    try { localStorage.setItem('mp_outlook_banner', 'off'); } catch (e) {}
  });
})();

/* ---- Zahnrad in die Kopfzeile + Settings-Modal in den Body injizieren ---- */
const gearBtn = htmlToEl(`
  <button class="set-gear" id="settingsBtn" type="button" title="${t('set_open')}" aria-label="${t('set_open')}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  </button>`);
const headerRight = document.querySelector('.header-right');
// Zahnrad ganz nach rechts: als letztes Element (rechts neben dem Konto-/Abmelden-Button).
if (headerRight) headerRight.appendChild(gearBtn);

const settingsModal = htmlToEl(`
  <div class="modal" id="settingsModal" hidden>
    <div class="modal__backdrop" data-close></div>
    <div class="modal__card modal__card--settings" role="dialog" aria-modal="true" aria-labelledby="setTitle">
      <button class="modal__close" type="button" data-close aria-label="Close">&times;</button>
      <h2 class="modal__title" id="setTitle" data-i18n="set_title">Settings</h2>
      <section class="set-section">
        <div class="set-section__title" data-i18n="set_name">Your name</div>
        <input id="setName" type="text" class="set-input" data-i18n-ph="set_name_ph" placeholder="e.g. Hans Müller" />
        <p class="set-hint" data-i18n="set_name_hint">Used under the closing — replaces [Name] automatically.</p>
      </section>
      <section class="set-section">
        <div class="set-section__title" data-i18n="set_appearance">Appearance</div>
        <div class="set-row">
          <span data-i18n="set_theme">Theme</span>
          <div class="set-theme">
            <button type="button" data-theme-set="dark" data-i18n="set_dark">Dark</button>
            <button type="button" data-theme-set="light" data-i18n="set_light">Light</button>
          </div>
        </div>
      </section>
      <section class="set-section">
        <div class="set-section__title" data-i18n="set_industry">Industry</div>
        <select id="setIndustry" class="set-select"></select>
        <p class="set-hint" data-i18n="set_industry_hint">Templates and wording adapt to your industry.</p>
      </section>
      <section class="set-section">
        <div class="set-section__title" data-i18n="set_account">Account</div>
        <div id="setAccountBody"></div>
      </section>
      <section class="set-section">
        <div class="set-section__title" data-i18n="set_subscription">Subscription</div>
        <div id="setSubBody"></div>
      </section>
      <section class="set-section">
        <div class="set-section__title" data-i18n="set_signature">Signature</div>
        <textarea id="setSignature" class="set-sign" rows="3" data-i18n-ph="set_signature_ph" placeholder="Mit freundlichen Grüßen, …"></textarea>
        <p class="set-hint" data-i18n="set_signature_hint">Appended to the end of each generated email.</p>
      </section>
      <section class="set-section">
        <div class="set-section__title" data-i18n="set_style">My style</div>
        <textarea id="setStyle" class="set-sign" rows="4" data-i18n-ph="set_style_ph" placeholder="Paste 1–3 of your own emails …"></textarea>
        <p class="set-hint" data-i18n="set_style_hint">Optional — emails are written in your personal style.</p>
      </section>
      <section class="set-section">
        <div class="set-section__title" data-i18n="set_brain">My learned style</div>
        <p class="set-hint" data-i18n="set_brain_hint">MailPilot learns your writing style from the emails you send — and uses it automatically.</p>
        <div id="setBrainSummary" class="set-sign" style="min-height:56px;white-space:pre-wrap;overflow:auto;opacity:.92;"></div>
        <label class="opt-check" style="margin-top:10px;"><input type="checkbox" id="setLearning" /><span data-i18n="set_brain_learning">Learn from the emails I send</span></label>
        <button type="button" id="setBrainReset" data-i18n="set_brain_reset" style="display:none;margin-top:8px;background:none;border:none;color:#a78bfa;cursor:pointer;padding:0;font:inherit;text-decoration:underline;">Reset learned style</button>
      </section>
      <section class="set-section">
        <label class="opt-check" style="margin:0;"><input type="checkbox" id="setPromo" /><span data-i18n="set_promo">Add a "Written with MailPilot" line when copying</span></label>
      </section>
    </div>
  </div>`);
document.body.appendChild(settingsModal);

// Signatur laden + bei jeder Änderung sofort speichern (localStorage).
const sigField = document.getElementById('setSignature');
if (sigField) {
  sigField.value = getSignature();
  sigField.addEventListener('input', () => { try { localStorage.setItem(SIG_KEY, sigField.value); } catch {} });
}
const styleField = document.getElementById('setStyle');
if (styleField) {
  styleField.value = getStyle();
  styleField.addEventListener('input', () => { try { localStorage.setItem(STYLE_KEY, styleField.value); } catch {} });
}
const promoBox = document.getElementById('setPromo');
if (promoBox) {
  promoBox.checked = promoEnabled();
  promoBox.addEventListener('change', () => { try { localStorage.setItem(PROMO_KEY, promoBox.checked ? '1' : '0'); } catch {} });
}
const nameField = document.getElementById('setName');
if (nameField) {
  nameField.value = getName();
  nameField.addEventListener('input', () => { try { localStorage.setItem(NAME_KEY, nameField.value); } catch {} });
}
const industrySel = document.getElementById('setIndustry');
if (industrySel) {
  industrySel.innerHTML = INDUSTRIES.map((x) => '<option value="' + x.id + '">' + escapeHtml(lang === 'en' ? x.en : x.de) + '</option>').join('');
  industrySel.value = getIndustry();
  industrySel.addEventListener('change', () => {
    try { localStorage.setItem(INDUSTRY_KEY, industrySel.value); } catch {}
    renderTemplateChips();
  });
}

// MailPilot-Gehirn im Panel: gelernten Stil anzeigen + Lern-Schalter (ausfallsicher).
async function mpBrainToken() {
  try { if (window.Clerk && window.Clerk.session) return await window.Clerk.session.getToken(); } catch {}
  return null;
}
async function renderBrain() {
  const box = document.getElementById('setBrainSummary');
  const toggle = document.getElementById('setLearning');
  const resetBtn = document.getElementById('setBrainReset');
  const hideReset = () => { if (resetBtn) resetBtn.style.display = 'none'; };
  if (!box) return;
  const token = await mpBrainToken();
  if (!token) {
    box.textContent = t('set_brain_empty');
    if (toggle) { toggle.checked = true; toggle.disabled = true; }
    hideReset();
    return;
  }
  try {
    const res = await fetch(API_BASE + '/.netlify/functions/profile', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) { box.textContent = t('set_brain_empty'); hideReset(); return; }
    const p = await res.json();
    window.__mpHasStyle = Boolean(p.style_summary && p.style_summary.trim());
    const n = p.sample_count || 0;
    if (p.style_summary && p.style_summary.trim()) {
      const learned = lang === 'en' ? ('Learned from ' + n + ' email' + (n === 1 ? '' : 's')) : ('Gelernt aus ' + n + ' Mail' + (n === 1 ? '' : 's'));
      box.textContent = p.style_summary + (n ? '\n\n(' + learned + ')' : '');
      if (resetBtn) resetBtn.style.display = '';
    } else {
      box.textContent = t('set_brain_empty');
      hideReset();
    }
    if (toggle) { toggle.disabled = false; toggle.checked = p.learning !== false; }
  } catch { box.textContent = t('set_brain_empty'); hideReset(); }
}
// Lern-Schalter: Änderung serverseitig speichern (fire-and-forget).
(function () {
  const toggle = document.getElementById('setLearning');
  if (!toggle) return;
  toggle.addEventListener('change', async () => {
    const token = await mpBrainToken();
    if (!token) return;
    try {
      await fetch(API_BASE + '/.netlify/functions/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ learning: toggle.checked }) });
    } catch {}
  });
})();

// "Gelernten Stil zurücksetzen": nach Rückfrage per DELETE leeren, dann neu rendern.
(function () {
  const btn = document.getElementById('setBrainReset');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!confirm(t('set_brain_reset_confirm'))) return;
    const token = await mpBrainToken();
    if (!token) return;
    try {
      const res = await fetch(API_BASE + '/.netlify/functions/profile', { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
      if (res.ok) { toast(t('set_brain_reset_done'), 'ok'); renderBrain(); }
    } catch {}
  });
})();

// Zahnrad öffnet das Panel und lädt Konto + Abo + Gehirn frisch.
gearBtn.addEventListener('click', () => { renderSettingsAccount(); renderSubscription(); renderBrain(); openModal(settingsModal); });
// Schließen (×/Hintergrund) – Escape übernimmt der globale Handler weiter oben.
settingsModal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => closeModal(settingsModal)));
// Theme-Umschalter
settingsModal.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => applyTheme(b.dataset.themeSet)));

/* ---- Account-Bereich (über Clerk) ---- */
function renderSettingsAccount() {
  const box = document.getElementById('setAccountBody');
  if (!box) return;
  if (currentUser) {
    const name = userLabel(currentUser);
    const email = currentUser.email || '';
    const img = (window.Clerk && window.Clerk.user && window.Clerk.user.imageUrl) || '';
    const avatar = (typeof img === 'string' && img.startsWith('https://'))
      ? `<img class="set-user__avatar" src="${escapeHtml(img)}" alt="" referrerpolicy="no-referrer" />`
      : `<span class="set-user__avatar set-user__avatar--ph">${escapeHtml((name[0] || '?').toUpperCase())}</span>`;
    box.innerHTML = `
      <div class="set-user">${avatar}
        <div class="set-user__meta">
          <span class="set-user__name">${escapeHtml(name)}</span>
          ${email ? `<span class="set-user__email">${escapeHtml(email)}</span>` : ''}
        </div>
      </div>
      <button class="btn btn--ghost set-btn" id="setManageBtn">${t('set_manage_account')}</button>
      <button class="btn btn--ghost set-btn set-btn--danger" id="setSignoutBtn">${t('set_signout')}</button>`;
    // Clerk-UserProfile deckt Profil, Passwort ändern, verbundene Konten & Konto löschen ab.
    document.getElementById('setManageBtn').onclick = () => {
      if (window.Clerk && typeof window.Clerk.openUserProfile === 'function') window.Clerk.openUserProfile();
      else toast(t('set_unavailable'), 'warn');
    };
    document.getElementById('setSignoutBtn').onclick = async () => {
      try { if (window.Clerk) await window.Clerk.signOut(); } catch (e) { console.error(e); }
      closeModal(settingsModal); toast(t('set_signed_out'), 'ok');
    };
  } else {
    box.innerHTML = `<p class="set-hint">${t('set_not_signed_in')}</p>
      <button class="btn btn--primary set-btn" id="setSigninBtn">${t('set_signin')}</button>`;
    document.getElementById('setSigninBtn').onclick = () => openLogin();
  }
}

/* ---- Abonnement-Bereich (Status + Stripe-Portal) ---- */
const SUBSCRIPTION_ENDPOINT = API_BASE + '/.netlify/functions/subscription-status';
const PORTAL_ENDPOINT       = API_BASE + '/.netlify/functions/create-portal-session';

function planLabel(plan) { return plan && plan !== 'free' ? plan.charAt(0).toUpperCase() + plan.slice(1) : t('set_sub_free'); }
function fmtMoney(amount, currency) {
  if (amount == null || !currency) return '—';
  try { return new Intl.NumberFormat(lang, { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100); }
  catch { return (amount / 100) + ' ' + String(currency).toUpperCase(); }
}
function fmtDate(ms) {
  if (!ms) return '—';
  try { return new Date(ms).toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return new Date(ms).toLocaleDateString(); }
}
function statusBadge(status) { const s = status || 'free'; return `<span class="sub-badge sub-badge--${escapeHtml(s)}">${escapeHtml(s)}</span>`; }

function renderSubHtml(data) {
  const sub = data.subscription;
  const plan = data.plan || 'free';
  if (plan === 'free' || !sub) {
    return `<dl class="sub-grid"><dt>${t('set_plan')}</dt><dd>${t('set_sub_free')}</dd></dl>
      <button class="btn btn--primary set-btn" data-sub-action="upgrade">${t('set_upgrade')}</button>`;
  }
  const interval = sub.interval === 'year' ? t('set_year') : t('set_month');
  const rows =
    `<dt>${t('set_plan')}</dt><dd>${escapeHtml(planLabel(plan))}</dd>` +
    `<dt>${t('set_price')}</dt><dd>${fmtMoney(sub.amount, sub.currency)} / ${interval}</dd>` +
    `<dt>${t('set_status')}</dt><dd>${statusBadge(sub.cancelAtPeriodEnd ? 'canceling' : sub.status)}</dd>` +
    `<dt>${t('set_renews')}</dt><dd>${fmtDate(sub.currentPeriodEnd)}</dd>`;
  const note = (sub.cancelAtPeriodEnd && sub.currentPeriodEnd)
    ? `<p class="set-hint">${t('set_sub_cancels').replace('{date}', fmtDate(sub.currentPeriodEnd))}</p>` : '';
  return `<dl class="sub-grid">${rows}</dl>${note}
    <button class="btn btn--ghost set-btn" data-sub-action="manage">${t('set_manage_sub')}</button>`;
}

function wireSubButtons(box) {
  box.querySelectorAll('[data-sub-action]').forEach((b) => {
    b.addEventListener('click', () => {
      if (b.dataset.subAction === 'upgrade') {
        closeModal(settingsModal);
        document.getElementById('preise')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else { openPortal(b); }
    });
  });
}

async function renderSubscription() {
  const box = document.getElementById('setSubBody');
  if (!box) return;
  if (!currentUser) { box.innerHTML = `<p class="set-hint">${t('set_sub_signin')}</p>`; return; }
  box.innerHTML = `<p class="set-hint">${t('set_sub_loading')}</p>`;
  try {
    const headers = {};
    if (currentUser.jwt) headers['Authorization'] = `Bearer ${await currentUser.jwt()}`;
    const res = await fetch(SUBSCRIPTION_ENDPOINT, { headers });
    if (res.status === 404) { box.innerHTML = renderSubHtml({ plan: 'free' }); wireSubButtons(box); return; } // Funktion (noch) nicht deployt
    if (!res.ok) throw new Error('status ' + res.status);
    const data = await res.json();
    box.innerHTML = renderSubHtml(data);
    wireSubButtons(box);
  } catch (e) {
    console.error('Abo-Status:', e);
    box.innerHTML = `<p class="set-hint">${t('set_sub_error')}</p>`;
  }
}

async function openPortal(btn) {
  if (!currentUser) return;
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = t('set_sub_loading');
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (currentUser.jwt) headers['Authorization'] = `Bearer ${await currentUser.jwt()}`;
    const res = await fetch(PORTAL_ENDPOINT, { method: 'POST', headers });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) { window.location.href = data.url; return; }
    toast(data.noCustomer ? t('set_sub_none_yet') : (data.error || t('set_sub_error')), 'warn');
  } catch (e) {
    console.error(e); toast(t('set_sub_error'), 'warn');
  } finally { btn.disabled = false; btn.textContent = orig; }
}

/* ---- „Als App installieren" (PWA) über die Hero-Buttons „Für Windows" / „Für Mac" ----
   Beide Buttons lösen denselben warnungsfreien Browser-Install aus – KEIN .exe/.dmg-
   Download, daher KEINE SmartScreen-/Gatekeeper-Warnung und KEIN Code-Signing-Zertifikat
   nötig. Funktioniert auf Windows UND macOS (Edge/Chrome, auf dem Mac auch Safari).
   Das Design bleibt unverändert – die zwei vorhandenen Buttons werden nur umgehängt.
   Das beforeinstallprompt-Event wird bereits früh im <head> (layout.jsx) in
   window.__mpInstallPrompt zwischengespeichert, damit es nicht verloren geht. */
let deferredInstallPrompt = window.__mpInstallPrompt || null;
const installButtons = [
  document.getElementById('pwaInstallBtn'),
  ...document.querySelectorAll('.btn--download'),
].filter(Boolean);

// Läuft MailPilot bereits als installierte App? Dann sind die Buttons sinnlos → ausblenden.
function isPwaInstalled() {
  try {
    return window.__mpInstalled === true
      || window.navigator.standalone === true
      || window.matchMedia('(display-mode: standalone)').matches;
  } catch { return false; }
}
if (isPwaInstalled()) { installButtons.forEach((b) => { b.hidden = true; }); }

// Erkennt eine bereits installierte MailPilot-PWA auch aus einem normalen Tab
// (über die Manifest-Selbst-Referenz in app/manifest.js). Nur Chromium kann das.
async function relatedAppInstalled() {
  try {
    if (navigator.getInstalledRelatedApps) {
      const apps = await navigator.getInstalledRelatedApps();
      return Array.isArray(apps) && apps.length > 0;
    }
  } catch {}
  return false;
}

// Wählt die passende Install-Anleitung je nach Browser/Gerät, falls der direkte
// Dialog nicht verfügbar ist (Safari/iPhone/Firefox brauchen eigene Schritte).
function installHintKey() {
  const ua = navigator.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isFirefox = /firefox|fxios/i.test(ua);
  const isChromium = /chrome|chromium|crios|edg/i.test(ua);
  const isSafari = /safari/i.test(ua) && !isChromium && !isFirefox;
  if (isIOS) return 'install_hint_ios';
  if (isFirefox) return 'install_hint_firefox';
  if (isSafari) return 'install_hint_mac';
  return 'install_hint';
}

async function doPwaInstall() {
  // Zum Klick-Zeitpunkt erneut aus dem globalen Speicher holen (Event kann spät kommen).
  const promptEvent = deferredInstallPrompt || window.__mpInstallPrompt;
  if (promptEvent) {
    promptEvent.prompt();
    try { await promptEvent.userChoice; } catch {}
    deferredInstallPrompt = null; window.__mpInstallPrompt = null;
    installButtons.forEach((b) => { b.hidden = true; });
    return;
  }
  // Kein Install-Dialog verfügbar → entweder schon installiert ODER Browser ohne Support.
  if (isPwaInstalled() || await relatedAppInstalled()) {
    installButtons.forEach((b) => { b.hidden = true; });
    toast(t('install_done'), 'ok');           // bereits installiert → freundlicher Hinweis
  } else {
    toast(t(installHintKey()));               // Browser ohne Dialog → passende Anleitung je Gerät (Win/Mac/iPhone/Firefox)
  }
}

installButtons.forEach((btn) => {
  btn.removeAttribute('href');      // .exe/.dmg-Download entfernen → stattdessen PWA-Install (warnungsfrei)
  btn.removeAttribute('download');
  btn.addEventListener('click', (e) => { e.preventDefault(); doPwaInstall(); });
});

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstallPrompt = e; window.__mpInstallPrompt = e; });
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; window.__mpInstallPrompt = null; window.__mpInstalled = true; installButtons.forEach((b) => { b.hidden = true; }); });

/* ---- Theme initial anwenden (Buttons synchronisieren) ---- */
applyTheme(getTheme());

/* ---- Start ---- */
applyLang();
renderSettingsAccount();

/* ---- Rückkehr von Stripe Checkout: kurze Rückmeldung anzeigen ---- */
(() => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('checkout');
  if (!status) return;
  params.delete('checkout');                  // URL säubern (keine Wiederholung bei Reload)
  const query = params.toString();
  window.history.replaceState({}, '', window.location.pathname + (query ? '?' + query : ''));
  if (status === 'success') alert(t('checkout_success'));
  else if (status === 'cancel') alert(t('checkout_canceled'));
})();

/* =========================================================
   MailPilot-Gehirn — Stil-Profil mit dem Server synchronisieren.
   ---------------------------------------------------------
   - Login: gespeichertes Profil laden → ein neues Gerät erbt Name/
     Signatur/Branche des Nutzers (leere lokale Felder werden gefüllt).
   - Einstellungen ändern: Profil serverseitig speichern.
   - "Mein Stil"-Beispiele werden zum Lernen an den Server geschickt,
     der daraus einen kompakten Stil destilliert (Endpunkt: /functions/profile).
   Alles ausfallsicher (try/catch, fire-and-forget): schlägt der Server
   fehl (z. B. Profil-Tabelle noch nicht angelegt), läuft die App
   UNVERÄNDERT weiter.
   ========================================================= */
(() => {
  const PROFILE_ENDPOINT = API_BASE + '/.netlify/functions/profile';

  function loggedIn() { return Boolean(currentUser && currentUser.jwt); }
  async function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    try { if (loggedIn()) h['Authorization'] = `Bearer ${await currentUser.jwt()}`; } catch {}
    return h;
  }

  // Server-Profil laden und LEERE lokale Felder daraus füllen (lokal hat Vorrang).
  async function profilePull() {
    if (!loggedIn()) return;
    let data;
    try {
      const res = await fetch(PROFILE_ENDPOINT, { headers: await authHeaders() });
      if (!res.ok) return;
      data = await res.json();
    } catch { return; }
    if (!data) return;
    window.__mpHasStyle = Boolean(data.has_style);
    const setIfEmpty = (key, val) => {
      if (!val) return;
      try { if (!localStorage.getItem(key)) localStorage.setItem(key, val); } catch {}
    };
    setIfEmpty(NAME_KEY, data.sender_name);
    setIfEmpty(SIG_KEY, data.signature);
    setIfEmpty(INDUSTRY_KEY, data.industry);
    // Bevorzugte Regler (Ton/Länge/Förmlichkeit) aus dem Profil in die UI übernehmen.
    if (typeof mpApplyPrefs === 'function') mpApplyPrefs(data);
    // Gemerkte Lieblings-Zielsprache übernehmen (greift bei der nächsten Optimierung).
    if (data.preferred_lang && XLATE_NAMES[data.preferred_lang]) window.__mpPrefLang = data.preferred_lang;
    // Onboarding: EINMALIG aufs lernende Gehirn hinweisen – nur bei Nutzern,
    // die noch keinen gelernten Stil haben (alte Hasen kennen es schon).
    try {
      if (!localStorage.getItem('mp_brain_intro')) {
        localStorage.setItem('mp_brain_intro', '1');
        if (!data.has_style) toast(t('brain_intro'));
      }
    } catch {}
    // Offene Einstellungsfelder aktualisieren, falls das Panel schon gebaut ist.
    const nf = document.getElementById('setName');
    if (nf && !nf.value && data.sender_name) nf.value = data.sender_name;
    const sf = document.getElementById('setSignature');
    if (sf && !sf.value && data.signature) sf.value = data.signature;
    const isel = document.getElementById('setIndustry');
    if (isel && data.industry) isel.value = data.industry;
  }

  // Aktuelle Einstellungen serverseitig speichern (verzögert, um nicht bei jedem
  // Tastendruck zu senden) und Beispiel-Mails zum Lernen schicken.
  let pushTimer = null;
  function profilePushSoon() { clearTimeout(pushTimer); pushTimer = setTimeout(profilePush, 1200); }
  async function profilePush() {
    if (!loggedIn()) return;
    const headers = await authHeaders();
    const body = { sender_name: getName(), signature: getSignature(), industry: getIndustry() };
    try { await fetch(PROFILE_ENDPOINT, { method: 'PUT', headers, body: JSON.stringify(body) }); } catch {}
    const style = (getStyle() || '').trim();
    if (style) {
      try { await fetch(PROFILE_ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ learnFrom: style }) }); } catch {}
    }
  }

  // Aus einer wirklich verschickten/eingefügten E-Mail lernen – global aufrufbar,
  // damit der Einfügen-/Kopieren-Knopf das später auslösen kann.
  window.mpLearnFrom = async function (text) {
    if (!loggedIn() || !text || !String(text).trim()) return;
    try {
      const res = await fetch(PROFILE_ENDPOINT, { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ learnFrom: String(text) }) });
      if (res.ok) {
        const d = await res.json().catch(() => null);
        if (d && d.has_style) window.__mpHasStyle = true;
        // Signatur automatisch gelernt → lokal übernehmen (nur wenn dort noch leer) + Hinweis.
        if (d && d.signature_learned && d.signature) {
          try {
            if (!(localStorage.getItem(SIG_KEY) || '').trim()) {
              localStorage.setItem(SIG_KEY, d.signature);
              const sf = document.getElementById('setSignature');
              if (sf && !sf.value) sf.value = d.signature;
              toast(t('sig_learned'));
            }
          } catch {}
        }
      }
    } catch {}
  };

  // Einstellungsfelder beobachten → verzögert speichern (zusätzlich zu den
  // bestehenden localStorage-Handlern, nicht störend).
  function wireFields() {
    ['setName', 'setSignature', 'setIndustry', 'setStyle'].forEach((id) => {
      const el = document.getElementById(id);
      if (el && !el.dataset.mpSync) {
        el.dataset.mpSync = '1';
        el.addEventListener('change', profilePushSoon);
        el.addEventListener('blur', profilePushSoon);
      }
    });
  }
  wireFields();

  // Auf Login warten: einmalig Profil laden, sobald der Nutzer gesetzt ist.
  let pulled = false;
  const iv = setInterval(() => {
    if (loggedIn() && !pulled) { pulled = true; clearInterval(iv); profilePull(); wireFields(); }
  }, 1500);
  setTimeout(() => clearInterval(iv), 60000); // nach 1 Minute nicht mehr warten
})();
