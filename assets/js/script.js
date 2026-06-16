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
const xlateWrap    = document.getElementById('xlate');
const xlateBtn     = document.getElementById('xlateBtn');
const xlateMenu    = document.getElementById('xlateMenu');
const xlateCurrent = document.getElementById('xlateCurrent');

let activeTone = 'professionell';
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
  renderAccount();
  updateLangUI();
  updateTranslateUI();
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
    const result = await generateEmail(text, activeTone);

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
   ========================================================= */
const API_ENDPOINT = '/.netlify/functions/optimize-email';

async function generateEmail(text, tone) {
  // Identity-Token mitschicken – das Backend identifiziert den Nutzer darüber
  // und zählt das Tageslimit fälschungssicher serverseitig.
  const headers = { 'Content-Type': 'application/json' };
  try {
    if (currentUser && currentUser.jwt) {
      headers['Authorization'] = `Bearer ${await currentUser.jwt()}`;
    }
  } catch {}

  let res;
  try {
    res = await fetch(API_ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ text, tone }) });
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
   Netlify Identity (Login bei Bedarf) & Limit-Anzeige
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
  return (user && (user.user_metadata?.full_name || user.email)) || 'Account';
}

function renderAccount() {
  if (currentUser) {
    const label = userLabel(currentUser);
    account.innerHTML = `
      <span class="account__hint">${t('left_today').replace('{n}', remainingToday)}</span>
      <span class="account__user" title="${label}">${label}</span>
      <button class="btn-account btn-account--ghost" type="button" id="logoutBtn">${t('signout')}</button>`;
    document.getElementById('logoutBtn').addEventListener('click', () => identity && identity.logout());
  } else {
    account.innerHTML = `<button class="btn-account" type="button" id="loginBtn">
        <span class="btn-account__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20.5a6.5 6.5 0 0 1 13 0"/></svg></span>
        <span>${t('cta_header')}</span>
      </button>`;
    document.getElementById('loginBtn').addEventListener('click', () => openAuthModal('login'));
  }
}

function setRemaining(n) {
  if (typeof n === 'number') remainingToday = Math.max(0, n);
  renderAccount();
}

const identity = window.netlifyIdentity;

function openLogin()  { identity ? identity.open('login')  : identityHint(); }
function openSignup() { identity ? identity.open('signup') : identityHint(); }
function identityHint() { alert(t('identity_hint')); }

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

if (identity) {
  identity.on('init',   (user) => { currentUser = user || null; renderAccount(); fetchRemaining(); });
  identity.on('login',  (user) => { currentUser = user; identity.close(); closeAuthModal(); renderAccount(); fetchRemaining(); });
  identity.on('logout', ()     => { currentUser = null; remainingToday = FREE_LIMIT; renderAccount(); });
  identity.init();
}

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
const CHECKOUT_ENDPOINT = '/.netlify/functions/create-checkout-session';

async function startCheckout(plan, btn) {
  if (!plan) return;
  const original = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = t('checkout_starting'); }
  try {
    const payload = { plan };
    if (currentUser && currentUser.email) payload.email = currentUser.email;
    const res = await fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    xlateCurrent.textContent = outputLangManual ? (XLATE_NAMES[outputLang] || t('translate_label')) : t('translate_label');
  }
  if (xlateWrap) xlateWrap.classList.toggle('is-active', outputLangManual);
  document.querySelectorAll('.xlate__opt').forEach((o) => {
    o.classList.toggle('is-active', outputLangManual && o.dataset.tl === outputLang);
  });
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
      const res = await fetch('/__forms.html', {   // Netlify Forms (Next.js): an die statische Form-Datei posten
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

/* ---- Start ---- */
applyLang();

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
