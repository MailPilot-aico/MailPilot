/* =========================================================
   MailPilot — Frontend-Logik
   Übersetzungen liegen in assets/js/i18n.js (Objekt I18N),
   das VOR dieser Datei geladen wird.
   ========================================================= */

/* ---- Unterstützte Sprachen (leicht erweiterbar) ---- */
const SUPPORTED = ['en', 'de', 'es', 'fr', 'it', 'pt-BR'];

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
let activeLength    = 1;   // Regler Länge:     0 = kurz, 1 = mittel, 2 = ausführlich
let activeFormality = 1;   // Regler Formalität: 0 = locker, 1 = neutral, 2 = förmlich
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
function lenLabels()  { return [t('len_short'), t('len_medium'), t('len_long')]; }
function formLabels() { return [t('form_casual'), t('form_neutral'), t('form_formal')]; }
function updateSliderLabels() {
  if (lenVal && lenRange)   lenVal.textContent  = lenLabels()[+lenRange.value]   ?? '';
  if (formVal && formRange) formVal.textContent = formLabels()[+formRange.value] ?? '';
}
if (lenRange) {
  lenRange.addEventListener('input', () => { activeLength = +lenRange.value; updateSliderLabels(); });
}
if (formRange) {
  formRange.addEventListener('input', () => { activeFormality = +formRange.value; updateSliderLabels(); });
}

/* ---- Hauptaktion: E-Mail optimieren ---- */
optimizeBtn.addEventListener('click', runOptimize);
input.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runOptimize(); }
});

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
    const result = await generateEmail(text, activeTone, activeLength, activeFormality);

    if (result.needLogin) { openAuthModal('login'); setStatus(t('st_signin'), 'warn'); return; }
    if (result.limitReached) { setRemaining(0); openAuthModal('upgrade'); setStatus(t('st_limit'), 'warn'); return; }

    output.value = result.email;
    output.classList.remove('is-example');
    hasRealResult = true;
    baseResultText = result.email;   // Original als Quelle für spätere Übersetzungen
    outputLang = 'de';               // Backend erzeugt deutsche E-Mails
    outputLangManual = false;        // Übersetzen-Auswahl für das neue Ergebnis zurücksetzen
    updateTranslateUI();
    copyBtn.disabled = false;
    setStatus(result.source === 'api' ? t('st_ready') : t('st_demo'), result.source === 'api' ? 'ok' : 'warn');
    if (typeof result.remaining === 'number') setRemaining(result.remaining);
    // Standardmäßig die oben eingestellte Sprache verwenden: das echte Ergebnis
    // automatisch in die Standardsprache übersetzen (kein extra Klick auf
    // „Übersetzen" nötig). Im Demo-Modus bleibt der Beispieltext deutsch.
    if (result.source === 'api') await applyDefaultTranslation();
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
  try {
    await navigator.clipboard.writeText(output.value);
  } catch {
    output.select();
    document.execCommand('copy');
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

async function generateEmail(text, tone, length, formality) {
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
  return { email: data.email, source: 'api', remaining: data.remaining };
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
  if (currentUser) {
    quotaHint.hidden = false;
    quotaHint.textContent = t('left_today').replace('{n}', remainingToday);
  } else {
    quotaHint.hidden = true;
    quotaHint.textContent = '';
  }
}

function setRemaining(n) {
  if (typeof n === 'number') remainingToday = Math.max(0, n);
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
      if (typeof data.remaining === 'number') setRemaining(data.remaining);
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
  const target = SUPPORTED.includes(lang) ? lang : 'de';
  outputLang = target;
  updateTranslateUI();
  await translateResult(target);   // 'de' = Original wiederherstellen, sonst per KI übersetzen
}

async function selectTargetLang(code) {
  if (!code || !XLATE_NAMES[code]) return;
  outputLang = code;
  outputLangManual = true;
  updateTranslateUI();

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
};
if (typeof I18N !== 'undefined') { Object.assign(I18N.en, SET_EN); Object.assign(I18N.de, SET_DE); }

/* ---- kleine Helfer ---- */
function htmlToEl(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function toast(msg, type) {
  let el = document.getElementById('mpToast');
  if (!el) { el = document.createElement('div'); el.id = 'mpToast'; el.className = 'mp-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.dataset.type = type || ''; el.classList.add('is-show');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('is-show'), 5200);
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

/* ---- Zahnrad in die Kopfzeile + Settings-Modal in den Body injizieren ---- */
const gearBtn = htmlToEl(`
  <button class="set-gear" id="settingsBtn" type="button" title="${t('set_open')}" aria-label="${t('set_open')}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  </button>`);
const headerRight = document.querySelector('.header-right');
const accountEl = document.getElementById('account');
if (headerRight) { accountEl ? headerRight.insertBefore(gearBtn, accountEl) : headerRight.appendChild(gearBtn); }

const settingsModal = htmlToEl(`
  <div class="modal" id="settingsModal" hidden>
    <div class="modal__backdrop" data-close></div>
    <div class="modal__card modal__card--settings" role="dialog" aria-modal="true" aria-labelledby="setTitle">
      <button class="modal__close" type="button" data-close aria-label="Close">&times;</button>
      <h2 class="modal__title" id="setTitle" data-i18n="set_title">Settings</h2>
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
        <div class="set-section__title" data-i18n="set_account">Account</div>
        <div id="setAccountBody"></div>
      </section>
      <section class="set-section">
        <div class="set-section__title" data-i18n="set_subscription">Subscription</div>
        <div id="setSubBody"></div>
      </section>
    </div>
  </div>`);
document.body.appendChild(settingsModal);

// Zahnrad öffnet das Panel und lädt Konto + Abo frisch.
gearBtn.addEventListener('click', () => { renderSettingsAccount(); renderSubscription(); openModal(settingsModal); });
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

/* ---- Download starten: echter Datei-Download mit Dateinamen-Hinweis ---- */
function triggerDownload(href) {
  const link = document.createElement('a');
  link.href = href;
  link.download = href.split('/').pop() || '';   // Dateiname für den „Speichern unter"-Dialog
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/* ---- Download-Buttons: Datei prüfen, dann herunterladen oder Hinweis zeigen ---- */
document.querySelectorAll('.btn--download').forEach((a) => {
  a.addEventListener('click', async (e) => {
    e.preventDefault();
    const href = a.getAttribute('href');
    if (!href) return;
    const label = a.querySelector('.btn__label');
    const orig = label ? label.textContent : '';
    if (label) label.textContent = t('dl_checking');
    // Datei fehlt eindeutig (404 u. Ä.) → freundlicher Hinweis. Erlaubt der Server
    // kein HEAD (405) oder gibt es einen Netzwerkfehler, wird der Download einfach
    // versucht – das behebt das fälschliche „nicht verfügbar" der alten Logik.
    let available = true;
    try {
      const res = await fetch(href, { method: 'HEAD' });
      if (!res.ok && res.status !== 405) available = false;
    } catch { /* HEAD nicht möglich → Download trotzdem versuchen */ }
    if (available) triggerDownload(href);
    else toast(t('dl_unavailable'), 'warn');
    if (label) label.textContent = orig;
  });
});

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
