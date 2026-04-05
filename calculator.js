/**
 * calculator.js — Core Calculator Engine
 * ──────────────────────────────────────
 * Handles expression building, evaluation, and step generation.
 * No external dependencies — pure vanilla JS.
 */

'use strict';

const Calculator = (() => {

  /* ── Internal State ─────────────────────────────────── */
  const state = {
    currentValue:   '0',   // Number being entered
    previousValue:  '',    // Number before operator
    operator:       null,  // Pending operator symbol (+, −, ×, ÷)
    expression:     '',    // Full expression string shown in display
    result:         null,  // Last computed result
    steps:          [],    // Step-by-step explanation array
    justEvaled:     false, // Did we just press "="?
    hasDecimal:     false, // Decimal guard
    activeOperator: null,  // For UI highlight
  };

  /* ── Operator Map ───────────────────────────────────── */
  const OPS = {
    '+': (a, b) => a + b,
    '−': (a, b) => a - b,
    '×': (a, b) => a * b,
    '÷': (a, b) => {
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    },
  };

  /* ── Helpers ─────────────────────────────────────────── */

  /**
   * Format a number for display — avoids floating-point noise.
   * @param {number} n
   * @returns {string}
   */
  function formatNum(n) {
    if (!isFinite(n)) return n > 0 ? '∞' : '−∞';
    // Round to 10 decimal places to drop floating-point dust
    const rounded = parseFloat(n.toFixed(10));
    // Use locale for large numbers but keep it compact
    if (Math.abs(rounded) >= 1e12) return rounded.toExponential(4);
    return String(rounded);
  }

  /**
   * Abbreviate a display string if it is very long.
   * @param {string} str
   * @param {number} max
   * @returns {string}
   */
  function abbrev(str, max = 12) {
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  /**
   * Build the full expression label.
   * @returns {string}
   */
  function buildExpression() {
    if (state.operator && state.previousValue !== '') {
      return `${state.previousValue} ${state.operator} ${state.currentValue}`;
    }
    return state.currentValue;
  }

  /**
   * Compute the result and generate step explanations.
   * @returns {{ result: number, steps: string[] }}
   */
  function computeResult() {
    const prev = parseFloat(state.previousValue);
    const curr = parseFloat(state.currentValue);
    const op   = state.operator;

    if (isNaN(prev) || isNaN(curr) || !op) return null;

    const fn = OPS[op];
    if (!fn) return null;

    const result = fn(prev, curr);

    const steps = [];
    steps.push(`${formatNum(prev)} ${op} ${formatNum(curr)}`);

    // Verbose step explanations per operator
    switch (op) {
      case '+':
        steps.push(`= ${formatNum(prev)} plus ${formatNum(curr)}`);
        break;
      case '−':
        steps.push(`= ${formatNum(prev)} minus ${formatNum(curr)}`);
        break;
      case '×':
        steps.push(`= ${formatNum(prev)} times ${formatNum(curr)}`);
        // Show intermediary for % calculations
        if (curr > 0 && curr < 1) {
          steps.push(`  (${formatNum(curr * 100)}% of ${formatNum(prev)})`);
        }
        break;
      case '÷':
        steps.push(`= ${formatNum(prev)} divided by ${formatNum(curr)}`);
        if (curr !== 0) {
          const pct = (result * 100).toFixed(4);
          steps.push(`  ≈ ${pct}% of original`);
        }
        break;
    }
    steps.push(`= ${formatNum(result)}`);

    return { result, steps };
  }

  /* ── Public API ──────────────────────────────────────── */

  /**
   * Handle a digit input (0–9).
   * @param {string} digit
   * @returns {object} Updated display values
   */
  function inputDigit(digit) {
    if (state.justEvaled) {
      // Start fresh after a result
      reset();
    }

    if (state.currentValue === '0' && digit !== '.') {
      state.currentValue = digit;
    } else {
      // Limit display length
      if (state.currentValue.length >= 12) return getDisplay();
      state.currentValue += digit;
    }

    state.justEvaled = false;
    return getDisplay();
  }

  /**
   * Handle decimal point.
   * @returns {object}
   */
  function inputDecimal() {
    if (state.justEvaled) { state.currentValue = '0'; state.justEvaled = false; }
    if (!state.currentValue.includes('.')) {
      state.currentValue += '.';
    }
    return getDisplay();
  }

  /**
   * Handle an operator key.
   * @param {string} op — One of: +  −  ×  ÷
   * @returns {object}
   */
  function inputOperator(op) {
    // If we have a pending operation and a new value, chain-compute first
    if (state.operator && state.previousValue !== '' && !state.justEvaled) {
      const res = computeResult();
      if (res) {
        state.previousValue  = formatNum(res.result);
        state.steps          = res.steps;
        state.result         = res.result;
      }
    } else {
      state.previousValue = state.currentValue;
    }

    state.operator      = op;
    state.currentValue  = '0';
    state.hasDecimal    = false;
    state.justEvaled    = false;
    state.activeOperator = op;

    return getDisplay();
  }

  /**
   * Evaluate the current expression and produce a result.
   * @returns {object}
   */
  function evaluate() {
    if (!state.operator || state.previousValue === '') return getDisplay();

    const res = computeResult();
    if (!res) return getDisplay();

    state.steps         = res.steps;
    state.result        = res.result;
    state.expression    = `${state.previousValue} ${state.operator} ${state.currentValue}`;
    state.currentValue  = formatNum(res.result);
    state.previousValue = '';
    state.operator      = null;
    state.justEvaled    = true;
    state.hasDecimal    = false;
    state.activeOperator = null;

    return getDisplay();
  }

  /**
   * Percentage key — converts current number to percent of previous.
   * @returns {object}
   */
  function percent() {
    const n = parseFloat(state.currentValue);
    if (isNaN(n)) return getDisplay();

    if (state.operator && state.previousValue !== '') {
      // x% of y → compute y * x/100
      const prev = parseFloat(state.previousValue);
      state.currentValue = formatNum((prev * n) / 100);
      state.steps = [
        `${formatNum(prev)} × ${formatNum(n)}%`,
        `= ${formatNum(prev)} × ${formatNum(n / 100)}`,
        `= ${state.currentValue}`,
      ];
    } else {
      state.currentValue = formatNum(n / 100);
      state.steps = [`${formatNum(n)}% = ${state.currentValue}`];
    }

    return getDisplay();
  }

  /**
   * Toggle sign of current number.
   * @returns {object}
   */
  function toggleSign() {
    const n = parseFloat(state.currentValue);
    if (!isNaN(n)) {
      state.currentValue = formatNum(-n);
    }
    return getDisplay();
  }

  /**
   * Backspace — remove last character.
   * @returns {object}
   */
  function backspace() {
    if (state.justEvaled) return reset();
    if (state.currentValue.length <= 1 || state.currentValue === '0') {
      state.currentValue = '0';
    } else {
      state.currentValue = state.currentValue.slice(0, -1);
    }
    return getDisplay();
  }

  /**
   * Clear all — reset to initial state.
   * @returns {object}
   */
  function reset() {
    state.currentValue   = '0';
    state.previousValue  = '';
    state.operator       = null;
    state.expression     = '';
    state.result         = null;
    state.steps          = [];
    state.justEvaled     = false;
    state.hasDecimal     = false;
    state.activeOperator = null;
    return getDisplay();
  }

  /**
   * Directly evaluate a mathematical expression string.
   * Supports +, -, *, /, %, parentheses.
   * @param {string} exprStr
   * @returns {{ expression:string, result:string, steps:string[], error?:string }}
   */
  function calculateExpression(exprStr) {
    try {
      // Normalise fancy operators to JS equivalents
      let cleaned = exprStr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/,/g, '');          // remove thousands commas

      // Safety: allow only numbers and math operators
      if (!/^[\d\s+\-*/%.()]+$/.test(cleaned)) {
        throw new Error('Invalid characters in expression');
      }

      // Evaluate safely using Function constructor
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + cleaned + ')')();

      if (!isFinite(result)) throw new Error('Result is not finite');

      const steps = buildExpressionSteps(exprStr, result);

      return {
        expression: exprStr,
        result:     formatNum(result),
        steps,
      };
    } catch (err) {
      return {
        expression: exprStr,
        result:     'Error',
        steps:      [],
        error:      err.message,
      };
    }
  }

  /**
   * Build human-readable steps for a raw expression string.
   * @param {string} expr
   * @param {number} result
   * @returns {string[]}
   */
  function buildExpressionSteps(expr, result) {
    const steps = [];
    steps.push(`Expression: ${expr}`);

    // Identify tokens for commentary
    const hasMul = expr.includes('×') || expr.includes('*');
    const hasDiv = expr.includes('÷') || expr.includes('/');
    const hasAdd = expr.includes('+');
    const hasSub = /[^e]−/.test(expr) || /[^e]-/.test(expr);

    if (hasMul && (hasAdd || hasSub)) {
      steps.push('Step 1: Apply multiplication/division (BODMAS)');
    }
    if (hasAdd || hasSub) {
      steps.push(`Step ${hasMul || hasDiv ? '2' : '1'}: Apply addition/subtraction`);
    }

    steps.push(`= ${formatNum(result)}`);
    return steps;
  }

  /**
   * Return the current display snapshot.
   * @returns {{
   *   expression: string,
   *   result: string,
   *   steps: string[],
   *   activeOperator: string|null
   * }}
   */
  function getDisplay() {
    return {
      expression:     buildExpression(),
      result:         state.result !== null && state.justEvaled
                        ? formatNum(state.result)
                        : '',
      steps:          [...state.steps],
      activeOperator: state.activeOperator,
    };
  }

  /**
   * Seed the calculator from an external result (e.g. voice / finance).
   * @param {number} value
   */
  function seedValue(value) {
    reset();
    state.currentValue = formatNum(value);
    return getDisplay();
  }

  /* ── Expose Public Methods ───────────────────────────── */
  return {
    inputDigit,
    inputDecimal,
    inputOperator,
    evaluate,
    percent,
    toggleSign,
    backspace,
    reset,
    calculateExpression,
    seedValue,
    getDisplay,
    formatNum,
  };

})();

// Make globally available
window.Calculator = Calculator;
