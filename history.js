/**
 * history.js — Calculation History Manager
 * ──────────────────────────────────────────
 * Stores and retrieves the last 5 calculations using localStorage.
 * Supports calc, finance, and voice result types.
 */

'use strict';

const History = (() => {

  const STORAGE_KEY = 'voicecalc_history';
  const MAX_ENTRIES = 10; // Keep last 10

  /* ── Read / Write ─────────────────────────────────────── */

  /**
   * Load all history entries from localStorage.
   * @returns {object[]}
   */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  /**
   * Persist entries to localStorage.
   * @param {object[]} entries
   */
  function save(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (_) {
      // localStorage quota exceeded — ignore
    }
  }

  /* ── Public API ───────────────────────────────────────── */

  /**
   * Add a new calculation entry.
   * @param {object} entry
   * @param {string} entry.type       — 'calc' | 'finance' | 'voice'
   * @param {string} entry.expression — Human-readable expression
   * @param {string} entry.result     — Human-readable result
   * @param {string} [entry.steps]    — Optional step explanation
   * @param {string} [entry.tool]     — Finance tool name if applicable
   */
  function add(entry) {
    const entries = load();

    const record = {
      id:         Date.now(),
      type:       entry.type || 'calc',
      expression: entry.expression || '',
      result:     entry.result || '',
      steps:      entry.steps || '',
      tool:       entry.tool || null,
      timestamp:  new Date().toISOString(),
    };

    // Prepend newest first
    entries.unshift(record);

    // Trim to max
    if (entries.length > MAX_ENTRIES) {
      entries.splice(MAX_ENTRIES);
    }

    save(entries);
    return record;
  }

  /**
   * Get the last N entries.
   * @param {number} limit — defaults to 5
   * @returns {object[]}
   */
  function getRecent(limit = 5) {
    return load().slice(0, limit);
  }

  /**
   * Get all entries.
   * @returns {object[]}
   */
  function getAll() {
    return load();
  }

  /**
   * Clear all history.
   */
  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  /**
   * Remove a single entry by id.
   * @param {number} id
   */
  function remove(id) {
    const entries = load().filter(e => e.id !== id);
    save(entries);
  }

  /* ── UI Rendering ─────────────────────────────────────── */

  /**
   * Format a timestamp into a relative or absolute string.
   * @param {string} iso
   * @returns {string}
   */
  function formatTime(iso) {
    const date = new Date(iso);
    const now  = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60)     return 'just now';
    if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  /**
   * Build the HTML string for a history item.
   * @param {object} entry
   * @returns {string}
   */
  function renderItem(entry) {
    const typeLabel = { calc: 'Calc', finance: 'Finance', voice: 'Voice' }[entry.type] || 'Calc';
    const toolLabel = entry.tool
      ? ` · ${entry.tool.charAt(0).toUpperCase() + entry.tool.slice(1)}`
      : '';

    return `
      <div class="history-item" data-id="${entry.id}" role="button" tabindex="0"
           aria-label="Restore: ${entry.expression} = ${entry.result}">
        <span class="history-item-type type-${entry.type}">${typeLabel}${toolLabel}</span>
        <div class="history-item-expr">${escapeHTML(entry.expression)}</div>
        <div class="history-item-result">${escapeHTML(entry.result)}</div>
        <div class="history-item-time">${formatTime(entry.timestamp)}</div>
      </div>
    `;
  }

  /**
   * Render all history items into the provided container.
   * @param {HTMLElement} container
   * @param {Function}    onSelect — Callback when item is tapped
   */
  function renderAll(container, onSelect) {
    const entries = getRecent(MAX_ENTRIES);

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="history-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5" opacity="0.3">
            <circle cx="12" cy="12" r="10"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          <p>No history yet</p>
        </div>
      `;
      return;
    }

    container.innerHTML = entries.map(renderItem).join('');

    // Attach click listeners
    container.querySelectorAll('.history-item').forEach(el => {
      const id    = parseInt(el.dataset.id, 10);
      const entry = entries.find(e => e.id === id);
      if (!entry) return;

      const activate = () => onSelect && onSelect(entry);
      el.addEventListener('click', activate);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    });
  }

  /* ── Helpers ─────────────────────────────────────────── */

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Expose ─────────────────────────────────────────── */
  return {
    add,
    getRecent,
    getAll,
    clear,
    remove,
    renderAll,
  };

})();

window.History = History;
