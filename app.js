/**
 * app.js — Main Application Controller
 * ──────────────────────────────────────
 * Wires together Calculator, Finance, Voice, and History.
 * Handles UI events, tab switching, PWA install, and theming.
 */

'use strict';

/* ══════════════════════════════════════════════════════
   DOM References
══════════════════════════════════════════════════════ */
const DOM = {
  // Display
  expression:   document.getElementById('displayExpression'),
  result:       document.getElementById('displayResult'),
  steps:        document.getElementById('displaySteps'),
  modeBadge:    document.getElementById('displayMode'),

  // Keypad
  keypad:       document.getElementById('keypad'),

  // Voice
  micBtn:       document.getElementById('micBtn'),
  voiceWave:    document.getElementById('voiceWave'),
  voiceHint:    document.getElementById('voiceHint'),
  voiceTranscript: document.getElementById('voiceTranscript'),
  listeningBadge: document.getElementById('voiceListeningBadge'),

  // Tabs
  tabBtns:      document.querySelectorAll('.tab-btn'),
  tabPanels:    document.querySelectorAll('.tab-panel'),

  // Finance
  financeCards: document.querySelectorAll('.finance-card'),

  // History
  historyList:  document.getElementById('historyList'),
  btnClearHistory: document.getElementById('btnClearHistory'),

  // Modal
  financeModal: document.getElementById('financeModal'),
  modalTitle:   document.getElementById('modalTitle'),
  modalBody:    document.getElementById('modalBody'),
  modalResult:  document.getElementById('modalResult'),
  modalClose:   document.getElementById('modalClose'),
  modalCancel:  document.getElementById('modalCancel'),
  modalCalculate: document.getElementById('modalCalculate'),

  // Header
  btnTheme:     document.getElementById('btnTheme'),

  // Toast
  toast:        document.getElementById('toast'),

  // Install
  installBanner: document.getElementById('installBanner'),
  btnInstall:   document.getElementById('btnInstall'),
  btnDismiss:   document.getElementById('btnDismiss'),

  // Loading
  loadingScreen: document.getElementById('loadingScreen'),
};

/* ══════════════════════════════════════════════════════
   App State
══════════════════════════════════════════════════════ */
let currentTab        = 'calc';
let activeFinanceTool = null;
let deferredInstall   = null;   // PWA install event
let toastTimer        = null;

/* ══════════════════════════════════════════════════════
   Display Update
══════════════════════════════════════════════════════ */

/**
 * Render the calculator display from a snapshot object.
 * @param {{ expression, result, steps, activeOperator }} snap
 */
function updateDisplay(snap) {
  const expr = snap.expression || '0';

  // Shrink font for long expressions
  DOM.expression.classList.remove('small', 'xsmall');
  if (expr.length > 18) DOM.expression.classList.add('xsmall');
  else if (expr.length > 12) DOM.expression.classList.add('small');

  DOM.expression.textContent = expr;

  if (snap.result) {
    DOM.result.textContent = `= ${snap.result}`;
    DOM.result.classList.add('has-result');
  } else {
    DOM.result.textContent = '';
    DOM.result.classList.remove('has-result');
  }

  DOM.steps.textContent = snap.steps ? snap.steps.join('\n') : '';

  // Highlight active operator key
  document.querySelectorAll('.key-operator').forEach(k => {
    k.classList.toggle('active-op', k.dataset.value === snap.activeOperator);
  });
}

/**
 * Show a financial result in the display panel.
 * @param {string} title
 * @param {string} summary
 * @param {string[]} steps
 */
function showFinanceDisplay(title, summary, steps) {
  DOM.modeBadge.textContent = title;
  DOM.expression.classList.remove('small', 'xsmall');
  DOM.expression.classList.add('small');
  DOM.expression.textContent = summary;
  DOM.result.textContent = '';
  DOM.result.classList.remove('has-result');
  DOM.steps.textContent = steps.join('\n');
}

/**
 * Reset display mode badge to Calculator.
 */
function resetModeBadge() {
  DOM.modeBadge.textContent = 'Calculator';
}

/* ══════════════════════════════════════════════════════
   Keypad Events
══════════════════════════════════════════════════════ */

DOM.keypad.addEventListener('click', (e) => {
  const key = e.target.closest('[data-action]');
  if (!key) return;

  // Ripple effect
  addRipple(key, e);

  // Haptic feedback
  vibrate(15);

  const action = key.dataset.action;
  const value  = key.dataset.value;
  let snap;

  switch (action) {
    case 'digit':    snap = Calculator.inputDigit(value);    break;
    case 'decimal':  snap = Calculator.inputDecimal();       break;
    case 'operator': snap = Calculator.inputOperator(value); break;
    case 'equals':
      snap = Calculator.evaluate();
      if (snap.result) {
        History.add({
          type:       'calc',
          expression: snap.expression || DOM.expression.textContent,
          result:     snap.result,
          steps:      snap.steps.join('\n'),
        });
        refreshHistoryIfActive();
      }
      break;
    case 'clear':    snap = Calculator.reset(); resetModeBadge(); break;
    case 'percent':  snap = Calculator.percent();  break;
    case 'sign':     snap = Calculator.toggleSign(); break;
    default: return;
  }

  updateDisplay(snap);
});

/* ── Ripple helper ─────────────────────────────────── */
function addRipple(el, e) {
  const rect = el.getBoundingClientRect();
  const rx   = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
  const ry   = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
  el.style.setProperty('--rx', `${rx}%`);
  el.style.setProperty('--ry', `${ry}%`);
}

/* ── Keyboard Support ──────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (DOM.financeModal.getAttribute('hidden') === null) return; // Modal open
  // Map keyboard keys to calculator actions
  const map = {
    '0':'0','1':'1','2':'2','3':'3','4':'4',
    '5':'5','6':'6','7':'7','8':'8','9':'9',
    '+': () => Calculator.inputOperator('+'),
    '-': () => Calculator.inputOperator('−'),
    '*': () => Calculator.inputOperator('×'),
    '/': () => Calculator.inputOperator('÷'),
    '%': () => Calculator.percent(),
    'Enter': () => {
      const snap = Calculator.evaluate();
      if (snap.result) History.add({ type:'calc', expression: DOM.expression.textContent, result: snap.result, steps: snap.steps.join('\n') });
      return snap;
    },
    'Backspace': () => Calculator.backspace(),
    'Escape': () => { Calculator.reset(); resetModeBadge(); },
    '.': () => Calculator.inputDecimal(),
  };

  const handler = map[e.key];
  if (!handler) return;

  e.preventDefault();
  const snap = typeof handler === 'function'
    ? handler()
    : Calculator.inputDigit(handler);

  if (snap) updateDisplay(snap);
});

/* ══════════════════════════════════════════════════════
   Tab Navigation
══════════════════════════════════════════════════════ */

DOM.tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === currentTab) return;

    currentTab = tab;

    DOM.tabBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
      b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false');
    });

    DOM.tabPanels.forEach(panel => {
      const isActive = panel.id === `tab-${tab}`;
      panel.classList.toggle('active', isActive);
      panel.hidden = !isActive;
    });

    if (tab === 'history') refreshHistory();
  });
});

/* ══════════════════════════════════════════════════════
   Voice Engine
══════════════════════════════════════════════════════ */

// Register voice callbacks
Voice.onStateChange((listening) => {
  DOM.micBtn.classList.toggle('listening', listening);
  DOM.voiceWave.hidden  = !listening;
  DOM.listeningBadge.hidden = !listening;
  DOM.voiceHint.textContent = listening
    ? 'Speak now…'
    : 'Tap mic & say "1999 ka 3 percent" or "EMI 5 lakh 10 percent 24 months"';
  if (!listening) DOM.voiceTranscript.textContent = '';
});

Voice.onTranscript((text) => {
  DOM.voiceTranscript.textContent = `"${text}"`;
});

Voice.onError((msg) => {
  showToast(msg, 'error');
  DOM.voiceTranscript.textContent = '';
});

Voice.onResult((cmd, rawText) => {
  vibrate([30, 20, 30]);
  handleVoiceCommand(cmd, rawText);
});

/**
 * Process a parsed voice command.
 * @param {object} cmd
 * @param {string} rawText
 */
function handleVoiceCommand(cmd, rawText) {
  if (cmd.type === 'unknown') {
    showToast('Command not understood. Try: "1999 ka 3 percent"', 'error');
    Voice.speak('Samajh nahi aaya, dobara bolein');
    return;
  }

  if (cmd.type === 'arithmetic' || cmd.type === 'percent_of') {
    const snap = Calculator.calculateExpression(cmd.expression);
    updateDisplay({
      expression:  cmd.expression,
      result:      cmd.result.toFixed ? String(parseFloat(cmd.result.toFixed(6))) : String(cmd.result),
      steps:       snap.steps,
      activeOperator: null,
    });
    DOM.modeBadge.textContent = 'Voice';

    History.add({
      type:       'voice',
      expression: cmd.expression,
      result:     String(parseFloat(cmd.result.toFixed ? cmd.result.toFixed(6) : cmd.result)),
      steps:      snap.steps.join('\n'),
    });
    refreshHistoryIfActive();

    Voice.speak(cmd.voice || `${cmd.result} hota hai`);
    showToast('✓ ' + cmd.expression, 'success');
    return;
  }

  if (cmd.type === 'finance') {
    const config = Finance.TOOL_CONFIGS[cmd.tool];
    if (!config) return;

    let finRes;
    switch (cmd.tool) {
      case 'gst':
        finRes = Finance.calculateGST(cmd.amount, cmd.gstPercent, false);
        break;
      case 'discount':
        finRes = Finance.calculateDiscount(cmd.originalPrice, cmd.discountPercent);
        break;
      case 'emi':
        finRes = Finance.calculateEMI(cmd.principal, cmd.annualRate, cmd.months);
        break;
      case 'profit':
        finRes = Finance.calculateProfit(cmd.costPrice, cmd.sellingPrice);
        break;
    }

    if (!finRes || finRes.error) {
      showToast(finRes?.summary || 'Calculation failed', 'error');
      return;
    }

    showFinanceDisplay(config.title, finRes.summary, finRes.steps);
    DOM.modeBadge.textContent = 'Voice · Finance';

    History.add({
      type:       'voice',
      tool:       cmd.tool,
      expression: rawText,
      result:     finRes.summary,
      steps:      finRes.steps.join('\n'),
    });
    refreshHistoryIfActive();

    Voice.speak(finRes.voice);
    showToast(`✓ ${config.title}`, 'success');
    return;
  }

  if (cmd.type === 'number') {
    const snap = Calculator.seedValue(cmd.value);
    updateDisplay(snap);
    Voice.speak(`${cmd.value}`);
  }
}

/* ── Mic Button ─────────────────────────────────────── */
DOM.micBtn.addEventListener('click', () => {
  if (!Voice.isSupported()) {
    showToast('Voice not supported in this browser', 'error');
    return;
  }
  vibrate(25);
  Voice.toggle();
});

/* ══════════════════════════════════════════════════════
   Finance Modal
══════════════════════════════════════════════════════ */

DOM.financeCards.forEach(card => {
  card.addEventListener('click', () => {
    const tool = card.dataset.tool;
    openFinanceModal(tool);
  });
});

/**
 * Open a finance tool modal.
 * @param {string} toolKey
 */
function openFinanceModal(toolKey) {
  const config = Finance.TOOL_CONFIGS[toolKey];
  if (!config) return;

  activeFinanceTool = toolKey;
  DOM.modalTitle.textContent = `${config.emoji} ${config.title}`;
  DOM.modalResult.hidden = true;
  DOM.modalResult.innerHTML = '';

  // Build form fields
  DOM.modalBody.innerHTML = config.fields.map(field => {
    if (field.type === 'select') {
      const opts = field.options
        .map(o => `<option value="${o.value}">${o.label}</option>`)
        .join('');
      return `
        <div class="field-group">
          <label class="field-label" for="field_${field.id}">${field.label}</label>
          <select class="field-input" id="field_${field.id}" name="${field.id}">
            ${opts}
          </select>
        </div>`;
    }
    return `
      <div class="field-group">
        <label class="field-label" for="field_${field.id}">${field.label}</label>
        <input
          class="field-input"
          id="field_${field.id}"
          name="${field.id}"
          type="${field.type}"
          placeholder="${field.placeholder}"
          ${field.min !== undefined ? `min="${field.min}"` : ''}
          ${field.max !== undefined ? `max="${field.max}"` : ''}
          inputmode="decimal"
        />
      </div>`;
  }).join('');

  DOM.financeModal.hidden = false;
  // Focus first field
  setTimeout(() => {
    const first = DOM.modalBody.querySelector('.field-input');
    if (first) first.focus();
  }, 350);
}

function closeFinanceModal() {
  DOM.financeModal.hidden = true;
  activeFinanceTool = null;
}

DOM.modalClose.addEventListener('click', closeFinanceModal);
DOM.modalCancel.addEventListener('click', closeFinanceModal);

// Close on backdrop click
DOM.financeModal.addEventListener('click', (e) => {
  if (e.target === DOM.financeModal) closeFinanceModal();
});

// Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !DOM.financeModal.hidden) closeFinanceModal();
});

/* ── Calculate button ──────────────────────────────── */
DOM.modalCalculate.addEventListener('click', () => {
  if (!activeFinanceTool) return;
  vibrate(20);

  const config = Finance.TOOL_CONFIGS[activeFinanceTool];
  if (!config) return;

  // Collect field values
  const vals = {};
  config.fields.forEach(field => {
    const el = document.getElementById(`field_${field.id}`);
    if (el) vals[field.id] = el.value;
  });

  // Run calculation
  const res = config.calculate(vals);

  if (res.error) {
    showToast(res.summary || 'Invalid input', 'error');
    return;
  }

  // Show result inside modal
  DOM.modalResult.hidden = false;
  DOM.modalResult.innerHTML = `
    <div class="result-main">${escapeHTML(res.summary)}</div>
    <div class="result-steps">${escapeHTML(res.steps.join('\n'))}</div>
  `;

  // Also update main display
  showFinanceDisplay(config.title, res.summary, res.steps);

  // Save to history
  History.add({
    type:       'finance',
    tool:       activeFinanceTool,
    expression: config.title,
    result:     res.summary,
    steps:      res.steps.join('\n'),
  });
  refreshHistoryIfActive();

  // Speak result
  Voice.speak(res.voice);
  showToast(`✓ ${config.title} done`, 'success');
});

/* ══════════════════════════════════════════════════════
   History
══════════════════════════════════════════════════════ */

function refreshHistory() {
  History.renderAll(DOM.historyList, onHistorySelect);
}

function refreshHistoryIfActive() {
  if (currentTab === 'history') refreshHistory();
}

function onHistorySelect(entry) {
  // Switch to calc tab and restore the expression
  switchTab('calc');
  DOM.modeBadge.textContent = entry.type === 'finance' ? 'Finance' : 'Calculator';
  DOM.expression.textContent = entry.expression;
  DOM.result.textContent     = entry.result ? `= ${entry.result}` : '';
  DOM.result.classList.toggle('has-result', !!entry.result);
  DOM.steps.textContent = entry.steps || '';
  showToast('Restored from history', 'success');
}

DOM.btnClearHistory.addEventListener('click', () => {
  if (confirm('Clear all history?')) {
    History.clear();
    refreshHistory();
    showToast('History cleared');
  }
});

/* ── Also wire header history button ──────────────── */
document.getElementById('btnHistory').addEventListener('click', () => {
  switchTab('history');
});

function switchTab(tabId) {
  currentTab = tabId;
  DOM.tabBtns.forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
    b.setAttribute('aria-selected', b.dataset.tab === tabId);
  });
  DOM.tabPanels.forEach(p => {
    const active = p.id === `tab-${tabId}`;
    p.classList.toggle('active', active);
    p.hidden = !active;
  });
  if (tabId === 'history') refreshHistory();
}

/* ══════════════════════════════════════════════════════
   Theme Toggle
══════════════════════════════════════════════════════ */

(function initTheme() {
  const saved = localStorage.getItem('voicecalc_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

DOM.btnTheme.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('voicecalc_theme', next);
  showToast(next === 'light' ? '☀️ Light mode' : '🌙 Dark mode');
});

/* ══════════════════════════════════════════════════════
   Toast Notification
══════════════════════════════════════════════════════ */

/**
 * Show a brief toast message.
 * @param {string} message
 * @param {'success'|'error'|''} type
 * @param {number} duration — ms
 */
function showToast(message, type = '', duration = 2800) {
  clearTimeout(toastTimer);
  DOM.toast.textContent = message;
  DOM.toast.className   = `toast${type ? ' ' + type : ''}`;
  DOM.toast.classList.add('show');

  toastTimer = setTimeout(() => {
    DOM.toast.classList.remove('show');
  }, duration);
}

/* ══════════════════════════════════════════════════════
   Haptic Feedback
══════════════════════════════════════════════════════ */

/**
 * Trigger device vibration if available.
 * @param {number|number[]} pattern
 */
function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (_) {}
}

/* ══════════════════════════════════════════════════════
   PWA — Service Worker + Install Banner
══════════════════════════════════════════════════════ */

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(() => console.log('[SW] Registered'))
      .catch(err => console.warn('[SW] Registration failed:', err));
  });
}

// Capture install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;

  const dismissed = sessionStorage.getItem('voicecalc_install_dismissed');
  if (!dismissed) {
    DOM.installBanner.hidden = false;
  }
});

DOM.btnInstall.addEventListener('click', async () => {
  if (!deferredInstall) return;
  DOM.installBanner.hidden = true;
  deferredInstall.prompt();
  const { outcome } = await deferredInstall.userChoice;
  if (outcome === 'accepted') {
    showToast('✓ App installed!', 'success');
  }
  deferredInstall = null;
});

DOM.btnDismiss.addEventListener('click', () => {
  DOM.installBanner.hidden = true;
  sessionStorage.setItem('voicecalc_install_dismissed', '1');
});

window.addEventListener('appinstalled', () => {
  DOM.installBanner.hidden = true;
  showToast('✓ VoiceCalc installed!', 'success');
  deferredInstall = null;
});

/* ══════════════════════════════════════════════════════
   Loading Screen
══════════════════════════════════════════════════════ */

window.addEventListener('load', () => {
  // Minimum visible time for brand feel
  setTimeout(() => {
    DOM.loadingScreen.classList.add('hidden');
  }, 900);
});

/* ══════════════════════════════════════════════════════
   Utility
══════════════════════════════════════════════════════ */

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════════════════════
   Init
══════════════════════════════════════════════════════ */

(function init() {
  // Set initial display
  updateDisplay(Calculator.getDisplay());

  // Check voice support
  if (!Voice.isSupported()) {
    DOM.micBtn.style.opacity = '0.4';
    DOM.micBtn.title = 'Voice not supported in this browser';
  }

  // Initial history render
  refreshHistory();

  console.log('%c🎙️ VoiceCalc ready', 'color:#6ee7ff;font-weight:bold;font-size:14px');
})();
