/**
 * voice.js — Voice Input & Output Engine
 * ────────────────────────────────────────
 * Uses Web Speech API for recognition (hi-IN / en-US)
 * and SpeechSynthesis for Hindi voice output.
 *
 * Supported commands:
 *   "1999 ka 3 percent"
 *   "2500 plus 200"
 *   "1000 minus 350"
 *   "GST 1000 par 18 percent"
 *   "discount 2000 par 20 percent"
 *   "loan EMI 5 lakh 10 percent 12 months"
 *   "profit 1000 selling 1500"
 *   "500 times 4"
 *   "800 divided by 5"
 */

'use strict';

const Voice = (() => {

  /* ── State ───────────────────────────────────────────── */
  let recognition  = null;
  let isListening  = false;
  let onResult     = null;   // Callback: (parsedCommand) => void
  let onTranscript = null;   // Callback: (rawText) => void
  let onStateChange = null;  // Callback: (listening: boolean) => void
  let onError      = null;   // Callback: (message) => void

  /* ── Number Word Map (Hindi + English) ──────────────── */
  const WORD_NUMBERS = {
    // Hindi cardinal words
    'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5,
    'chhe': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10,
    'gyarah': 11, 'barah': 12, 'terah': 13, 'chaudah': 14, 'pandrah': 15,
    'solah': 16, 'satrah': 17, 'atharah': 18, 'unnis': 19, 'bees': 20,
    'pachhees': 25, 'tees': 30, 'chaalis': 40, 'pachaas': 50,
    'saath': 60, 'sattar': 70, 'assi': 80, 'nabbe': 90,
    // English
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
    'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
    'hundred': 100, 'thousand': 1000,
    // Scale words (Hindi)
    'sau': 100, 'hazaar': 1000, 'lakh': 100000, 'lakhs': 100000,
    'crore': 10000000, 'crores': 10000000,
    // Scale words (English)
    'million': 1000000, 'billion': 1000000000,
  };

  /* ── Normalise Text ──────────────────────────────────── */

  /**
   * Clean and normalise raw transcript text.
   * @param {string} text
   * @returns {string}
   */
  function normalise(text) {
    return text
      .toLowerCase()
      .trim()
      // Hindi/Devanagari → transliterated equivalents (basic)
      .replace(/\s+/g, ' ')
      // common ASR noise
      .replace(/[,؟?!।]/g, '')
      .replace(/rupees?/gi, '')
      .replace(/₹/g, '');
  }

  /* ── Number Extraction ───────────────────────────────── */

  /**
   * Extract a number from a token or word sequence.
   * Handles: "5 lakh", "50000", "ek hazaar", "pach lakh"
   * @param {string[]} tokens
   * @param {number}   startIndex
   * @returns {{ value: number, nextIndex: number } | null}
   */
  function extractNumber(tokens, startIndex = 0) {
    let i = startIndex;
    let total = 0;
    let current = 0;
    let found = false;

    while (i < tokens.length) {
      const token = tokens[i];

      // Pure numeric
      const numVal = parseFloat(token.replace(/,/g, ''));
      if (!isNaN(numVal)) {
        current = numVal;
        found = true;
        i++;
        // Check for scale word immediately after
        if (i < tokens.length) {
          const scale = WORD_NUMBERS[tokens[i]];
          if (scale >= 100) {
            current *= scale;
            i++;
          }
        }
        total += current;
        current = 0;
        continue;
      }

      // Word number
      const wordVal = WORD_NUMBERS[token];
      if (wordVal !== undefined) {
        found = true;
        if (wordVal >= 100) {
          // Scale multiplier
          if (current === 0) current = 1;
          current *= wordVal;
          if (wordVal >= 100000) {
            total += current;
            current = 0;
          }
        } else {
          current += wordVal;
        }
        i++;
        continue;
      }

      break; // Unknown token — stop
    }

    if (!found) return null;
    total += current;
    return { value: total, nextIndex: i };
  }

  /* ── Command Parsers ──────────────────────────────────── */

  /**
   * Try to parse a basic arithmetic command.
   * Patterns:
   *   "<num> plus/aur <num>"
   *   "<num> minus/minus <num>"
   *   "<num> times/guna <num>"
   *   "<num> divided by/bhaag <num>"
   *   "<num> ka <num> percent"
   * @param {string[]} tokens
   * @returns {object|null} Parsed command or null
   */
  function parseArithmetic(tokens) {
    const numRes = extractNumber(tokens, 0);
    if (!numRes) return null;

    const { value: a, nextIndex: ni } = numRes;
    if (ni >= tokens.length) return null;

    const opToken = tokens[ni];

    // Percentage shorthand: "<num> ka <num> percent"
    if (opToken === 'ka') {
      const numRes2 = extractNumber(tokens, ni + 1);
      if (numRes2) {
        const afterNum = tokens[numRes2.nextIndex];
        if (afterNum === 'percent' || afterNum === '%' || afterNum === 'pratishat') {
          return {
            type: 'percent_of',
            a,
            b: numRes2.value,
            expression: `${a} × ${numRes2.value} / 100`,
            result: (a * numRes2.value) / 100,
            voice: `${a} ka ${numRes2.value} percent ${(a * numRes2.value / 100).toFixed(2)} hota hai`,
          };
        }
      }
    }

    // Map operator tokens
    const OP_MAP = {
      'plus': '+', 'add': '+', 'aur': '+', 'jod': '+', 'jodo': '+',
      'minus': '−', 'subtract': '−', 'ghatao': '−', 'kam': '−',
      'times': '×', 'multiply': '×', 'guna': '×', 'into': '×', 'multiplied': '×',
      'divided': '÷', 'divide': '÷', 'bhaag': '÷', 'by': null, // 'by' consumed with 'divided'
    };

    let op = OP_MAP[opToken];
    let nextStart = ni + 1;

    // Handle "divided by" as two tokens
    if (opToken === 'divided' && tokens[ni + 1] === 'by') {
      op = '÷';
      nextStart = ni + 2;
    }
    if (opToken === 'multiplied' && tokens[ni + 1] === 'by') {
      op = '×';
      nextStart = ni + 2;
    }

    if (!op) return null;

    const numRes2 = extractNumber(tokens, nextStart);
    if (!numRes2) return null;

    const b = numRes2.value;
    let result;
    switch (op) {
      case '+': result = a + b; break;
      case '−': result = a - b; break;
      case '×': result = a * b; break;
      case '÷': result = b !== 0 ? a / b : null; break;
    }

    if (result === null) return { type: 'error', message: 'Division by zero' };

    return {
      type: 'arithmetic',
      a, b, op,
      expression: `${a} ${op} ${b}`,
      result: parseFloat(result.toFixed(10)),
      voice: `${a} ${opToken} ${b} ${parseFloat(result.toFixed(4))} hota hai`,
    };
  }

  /**
   * Try to parse a GST command.
   * Patterns:
   *   "GST <amount> par <rate> percent"
   *   "<amount> par <rate> percent GST"
   * @param {string[]} tokens
   * @returns {object|null}
   */
  function parseGST(tokens) {
    const hasGST = tokens.includes('gst');
    if (!hasGST) return null;

    const gstIdx = tokens.indexOf('gst');
    // Find first number after or before 'gst'
    const startSearch = gstIdx === 0 ? 1 : 0;
    const numRes1 = extractNumber(tokens, startSearch);
    if (!numRes1) return null;

    // Find 'par' then rate
    const parIdx = tokens.indexOf('par', numRes1.nextIndex);
    const afterPar = parIdx !== -1 ? parIdx + 1 : numRes1.nextIndex;
    const numRes2 = extractNumber(tokens, afterPar);
    if (!numRes2) return null;

    return {
      type:      'finance',
      tool:      'gst',
      amount:    numRes1.value,
      gstPercent: numRes2.value,
      inclusive: false,
    };
  }

  /**
   * Try to parse a Discount command.
   * Pattern: "discount <price> par <percent> percent"
   * @param {string[]} tokens
   * @returns {object|null}
   */
  function parseDiscount(tokens) {
    if (!tokens.includes('discount')) return null;

    const discIdx = tokens.indexOf('discount');
    const numRes1 = extractNumber(tokens, discIdx + 1);
    if (!numRes1) return null;

    const parIdx = tokens.indexOf('par', numRes1.nextIndex);
    const afterPar = parIdx !== -1 ? parIdx + 1 : numRes1.nextIndex;
    const numRes2 = extractNumber(tokens, afterPar);
    if (!numRes2) return null;

    return {
      type:            'finance',
      tool:            'discount',
      originalPrice:   numRes1.value,
      discountPercent: numRes2.value,
    };
  }

  /**
   * Try to parse an EMI command.
   * Patterns:
   *   "EMI <principal> <rate> percent <months> months"
   *   "loan EMI 5 lakh 10 percent 24 months"
   * @param {string[]} tokens
   * @returns {object|null}
   */
  function parseEMI(tokens) {
    if (!tokens.includes('emi') && !tokens.includes('loan')) return null;

    const emiIdx = Math.max(tokens.indexOf('emi'), tokens.indexOf('loan'));
    const numRes1 = extractNumber(tokens, emiIdx + 1);
    if (!numRes1) return null;

    // Skip 'percent', 'par', 'at'
    let nextIdx = numRes1.nextIndex;
    while (['par', 'at', 'on', 'per'].includes(tokens[nextIdx])) nextIdx++;

    const numRes2 = extractNumber(tokens, nextIdx);
    if (!numRes2) return null;

    // Skip 'percent', '%'
    nextIdx = numRes2.nextIndex;
    while (['percent', '%', 'pratishat'].includes(tokens[nextIdx])) nextIdx++;

    const numRes3 = extractNumber(tokens, nextIdx);
    if (!numRes3) return null;

    return {
      type:       'finance',
      tool:       'emi',
      principal:  numRes1.value,
      annualRate: numRes2.value,
      months:     Math.round(numRes3.value),
    };
  }

  /**
   * Try to parse a Profit command.
   * Pattern: "profit <cost> selling <sell>" or "buy <cost> sell <sell>"
   * @param {string[]} tokens
   * @returns {object|null}
   */
  function parseProfit(tokens) {
    const hasTrigger = ['profit', 'loss', 'margin', 'buy', 'kharida'].some(w => tokens.includes(w));
    if (!hasTrigger) return null;

    const tIdx = ['profit', 'loss', 'margin', 'buy', 'kharida']
      .map(w => tokens.indexOf(w)).find(i => i !== -1) ?? 0;

    const numRes1 = extractNumber(tokens, tIdx + 1);
    if (!numRes1) return null;

    const sellIdx = ['selling', 'sell', 'becha', 'bikri'].map(w => tokens.indexOf(w)).find(i => i !== -1);
    const afterSell = sellIdx !== undefined ? sellIdx + 1 : numRes1.nextIndex;
    const numRes2 = extractNumber(tokens, afterSell);
    if (!numRes2) return null;

    return {
      type:         'finance',
      tool:         'profit',
      costPrice:    numRes1.value,
      sellingPrice: numRes2.value,
    };
  }

  /**
   * Master parser — try all parsers in priority order.
   * @param {string} rawText
   * @returns {object} Parsed command object
   */
  function parseCommand(rawText) {
    const norm   = normalise(rawText);
    const tokens = norm.split(/\s+/).filter(Boolean);

    // Finance commands (higher priority)
    const gstCmd      = parseGST(tokens);
    if (gstCmd)      return gstCmd;

    const discountCmd = parseDiscount(tokens);
    if (discountCmd) return discountCmd;

    const emiCmd      = parseEMI(tokens);
    if (emiCmd)      return emiCmd;

    const profitCmd   = parseProfit(tokens);
    if (profitCmd)   return profitCmd;

    // Arithmetic
    const arithCmd    = parseArithmetic(tokens);
    if (arithCmd)    return arithCmd;

    // Fallback: try to parse as a raw number
    const numOnly = extractNumber(tokens, 0);
    if (numOnly && numOnly.value > 0) {
      return {
        type:  'number',
        value: numOnly.value,
      };
    }

    return {
      type:    'unknown',
      rawText: norm,
      message: 'Command not recognised',
    };
  }

  /* ── Speech Recognition Setup ────────────────────────── */

  /**
   * Initialise Web Speech API recognition.
   * @returns {boolean} Whether speech recognition is supported
   */
  function init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;

    recognition = new SR();
    recognition.continuous    = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    // Try Hindi first, fall back to English
    recognition.lang = 'hi-IN';

    recognition.onstart = () => {
      isListening = true;
      onStateChange && onStateChange(true);
    };

    recognition.onend = () => {
      isListening = false;
      onStateChange && onStateChange(false);
    };

    recognition.onerror = (event) => {
      isListening = false;
      onStateChange && onStateChange(false);

      const messages = {
        'not-allowed':     'Microphone permission denied. Please allow mic access.',
        'no-speech':       'No speech detected. Please try again.',
        'audio-capture':   'No microphone found.',
        'network':         'Network error during voice recognition.',
        'aborted':         'Voice input cancelled.',
        'service-not-allowed': 'Voice service not allowed.',
      };
      onError && onError(messages[event.error] || `Voice error: ${event.error}`);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Show interim transcript
      const display = finalTranscript || interimTranscript;
      onTranscript && onTranscript(display);

      // Only process final result
      if (finalTranscript) {
        const parsed = parseCommand(finalTranscript);
        onResult && onResult(parsed, finalTranscript);
      }
    };

    return true;
  }

  /**
   * Start listening.
   * @returns {boolean} Whether started successfully
   */
  function startListening() {
    if (!recognition) {
      const ok = init();
      if (!ok) {
        onError && onError('Speech recognition is not supported in this browser.');
        return false;
      }
    }
    if (isListening) return true;

    try {
      recognition.start();
      return true;
    } catch (e) {
      // Already started — stop first
      try { recognition.stop(); } catch (_) {}
      setTimeout(() => {
        try { recognition.start(); } catch (_) {}
      }, 300);
      return true;
    }
  }

  /**
   * Stop listening.
   */
  function stopListening() {
    if (recognition && isListening) {
      try { recognition.stop(); } catch (_) {}
    }
  }

  /**
   * Toggle listening state.
   */
  function toggle() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  /* ── Speech Synthesis (Voice Output) ────────────────── */

  /**
   * Speak a text string using SpeechSynthesis.
   * Prefers Hindi (hi-IN) voice, falls back to any available.
   * @param {string} text
   * @param {object} options
   */
  function speak(text, options = {}) {
    if (!window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Find best voice
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v =>
      v.lang === 'hi-IN' || v.lang.startsWith('hi')
    );
    const englishVoice = voices.find(v =>
      v.lang === 'en-IN' || v.lang === 'en-US'
    );

    utterance.voice  = hindiVoice || englishVoice || voices[0] || null;
    utterance.lang   = hindiVoice ? 'hi-IN' : 'en-US';
    utterance.rate   = options.rate  ?? 0.9;
    utterance.pitch  = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 0.95;

    // Retry if voices not loaded yet
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.speak(utterance);
      };
    } else {
      window.speechSynthesis.speak(utterance);
    }
  }

  /**
   * Check if speech recognition is supported.
   * @returns {boolean}
   */
  function isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /* ── Event Registration ──────────────────────────────── */

  function onResultCallback(fn)      { onResult      = fn; }
  function onTranscriptCallback(fn)  { onTranscript  = fn; }
  function onStateChangeCallback(fn) { onStateChange = fn; }
  function onErrorCallback(fn)       { onError       = fn; }

  /* ── Expose ─────────────────────────────────────────── */
  return {
    init,
    startListening,
    stopListening,
    toggle,
    speak,
    parseCommand,     // Exposed for testing
    isSupported,
    isListening: () => isListening,
    onResult:         onResultCallback,
    onTranscript:     onTranscriptCallback,
    onStateChange:    onStateChangeCallback,
    onError:          onErrorCallback,
  };

})();

window.Voice = Voice;
