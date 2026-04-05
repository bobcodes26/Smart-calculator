/**
 * finance.js — Financial Calculation Engine
 * ──────────────────────────────────────────
 * Pure functions for GST, Discount, Profit, EMI,
 * Percentage Change, and Simple Interest.
 * Each returns { result, summary, steps, voice }.
 */

'use strict';

const Finance = (() => {

  /* ── Formatting helpers ─────────────────────────────── */

  /**
   * Format a number as Indian currency string.
   * e.g. 150000 → "₹1,50,000.00"
   * @param {number} n
   * @returns {string}
   */
  function formatINR(n) {
    const fixed = Math.abs(n).toFixed(2);
    // Indian numbering system
    const parts = fixed.split('.');
    let intPart = parts[0];
    const decPart = parts[1];

    // First group of 3, then groups of 2
    let result = '';
    if (intPart.length > 3) {
      const last3 = intPart.slice(-3);
      const rest   = intPart.slice(0, -3);
      const restFormatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      result = restFormatted + ',' + last3;
    } else {
      result = intPart;
    }

    const sign = n < 0 ? '−' : '';
    return `${sign}₹${result}.${decPart}`;
  }

  /**
   * Round to N decimal places.
   * @param {number} n
   * @param {number} dp
   * @returns {number}
   */
  function round(n, dp = 2) {
    return parseFloat(n.toFixed(dp));
  }

  /**
   * Validate that all values are positive finite numbers.
   * @param  {...number} vals
   * @returns {boolean}
   */
  function allPositive(...vals) {
    return vals.every(v => typeof v === 'number' && isFinite(v) && v > 0);
  }

  /* ── 1. GST Calculator ──────────────────────────────── */

  /**
   * Calculate GST on an amount.
   * @param {number} amount      — Base amount (before GST)
   * @param {number} gstPercent  — GST rate (e.g. 18 for 18%)
   * @param {boolean} inclusive  — If true, amount already includes GST
   * @returns {{ result:object, summary:string, steps:string[], voice:string }}
   */
  function calculateGST(amount, gstPercent, inclusive = false) {
    if (!allPositive(amount) || gstPercent < 0) {
      return errorResult('Invalid input for GST calculation');
    }

    let baseAmount, gstAmount, totalAmount;

    if (inclusive) {
      // Extract base from inclusive amount
      baseAmount   = round(amount * 100 / (100 + gstPercent));
      gstAmount    = round(amount - baseAmount);
      totalAmount  = amount;
    } else {
      baseAmount   = amount;
      gstAmount    = round(amount * gstPercent / 100);
      totalAmount  = round(baseAmount + gstAmount);
    }

    const cgst = round(gstAmount / 2);
    const sgst = round(gstAmount / 2);

    const steps = [
      inclusive
        ? `GST-inclusive price: ${formatINR(amount)}`
        : `Base amount: ${formatINR(baseAmount)}`,
      `GST rate: ${gstPercent}%`,
      inclusive
        ? `Base = ${formatINR(amount)} × 100 / (100 + ${gstPercent}) = ${formatINR(baseAmount)}`
        : `GST = ${formatINR(baseAmount)} × ${gstPercent} / 100 = ${formatINR(gstAmount)}`,
      `CGST (${gstPercent / 2}%) = ${formatINR(cgst)}`,
      `SGST (${gstPercent / 2}%) = ${formatINR(sgst)}`,
      `Total amount = ${formatINR(totalAmount)}`,
    ];

    const result = {
      baseAmount,
      gstAmount,
      cgst,
      sgst,
      totalAmount,
      gstPercent,
    };

    const summary = inclusive
      ? `Base: ${formatINR(baseAmount)} | GST: ${formatINR(gstAmount)} | Total: ${formatINR(totalAmount)}`
      : `GST (${gstPercent}%): ${formatINR(gstAmount)} | Total: ${formatINR(totalAmount)}`;

    const voice = inclusive
      ? `${formatINR(amount)} mein se GST ${formatINR(gstAmount)} hai, aur base price ${formatINR(baseAmount)} hai`
      : `${formatINR(baseAmount)} par ${gstPercent} percent GST ${formatINR(gstAmount)} hota hai. Total ${formatINR(totalAmount)} hoga`;

    return { result, summary, steps, voice };
  }

  /* ── 2. Discount Calculator ─────────────────────────── */

  /**
   * Calculate discount on a price.
   * @param {number} originalPrice
   * @param {number} discountPercent
   * @returns {{ result:object, summary:string, steps:string[], voice:string }}
   */
  function calculateDiscount(originalPrice, discountPercent) {
    if (!allPositive(originalPrice) || discountPercent < 0 || discountPercent > 100) {
      return errorResult('Invalid input for discount calculation');
    }

    const discountAmount = round(originalPrice * discountPercent / 100);
    const finalPrice     = round(originalPrice - discountAmount);
    const savings        = discountAmount;

    const steps = [
      `Original price: ${formatINR(originalPrice)}`,
      `Discount: ${discountPercent}%`,
      `Discount amount = ${formatINR(originalPrice)} × ${discountPercent} / 100`,
      `                = ${formatINR(discountAmount)}`,
      `Final price = ${formatINR(originalPrice)} − ${formatINR(discountAmount)}`,
      `           = ${formatINR(finalPrice)}`,
      `You save: ${formatINR(savings)} (${discountPercent}% off)`,
    ];

    const result = { originalPrice, discountPercent, discountAmount, finalPrice, savings };

    const summary = `Save ${formatINR(savings)} | Pay ${formatINR(finalPrice)}`;

    const voice = `${formatINR(originalPrice)} par ${discountPercent} percent discount ke baad, aapko ${formatINR(finalPrice)} dena hoga. Aap ${formatINR(savings)} bachayenge`;

    return { result, summary, steps, voice };
  }

  /* ── 3. Profit Margin Calculator ────────────────────── */

  /**
   * Calculate profit, loss, and margin.
   * @param {number} costPrice
   * @param {number} sellingPrice
   * @returns {{ result:object, summary:string, steps:string[], voice:string }}
   */
  function calculateProfit(costPrice, sellingPrice) {
    if (!allPositive(costPrice, sellingPrice)) {
      return errorResult('Invalid input for profit calculation');
    }

    const profitLoss    = round(sellingPrice - costPrice);
    const isProfit      = profitLoss >= 0;
    const profitPct     = round((Math.abs(profitLoss) / costPrice) * 100, 2);
    const profitMargin  = round((Math.abs(profitLoss) / sellingPrice) * 100, 2);
    const markup        = round((Math.abs(profitLoss) / costPrice) * 100, 2);

    const label = isProfit ? 'Profit' : 'Loss';

    const steps = [
      `Cost Price (CP): ${formatINR(costPrice)}`,
      `Selling Price (SP): ${formatINR(sellingPrice)}`,
      `${label} = SP − CP = ${formatINR(sellingPrice)} − ${formatINR(costPrice)} = ${formatINR(profitLoss)}`,
      `${label}% = (${label} / CP) × 100`,
      `        = (${Math.abs(profitLoss)} / ${costPrice}) × 100`,
      `        = ${profitPct}%`,
      `Profit Margin = (${label} / SP) × 100 = ${profitMargin}%`,
      `Markup = ${markup}%`,
    ];

    const result = {
      costPrice,
      sellingPrice,
      profitLoss,
      isProfit,
      profitPct,
      profitMargin,
      markup,
    };

    const summary = `${label}: ${formatINR(profitLoss)} (${profitPct}%) | Margin: ${profitMargin}%`;

    const voice = isProfit
      ? `${formatINR(costPrice)} mein kharida aur ${formatINR(sellingPrice)} mein becha. ${profitPct} percent ka fayda hua — ${formatINR(profitLoss)}`
      : `${formatINR(costPrice)} mein kharida aur ${formatINR(sellingPrice)} mein becha. ${profitPct} percent ka nuksaan hua — ${formatINR(Math.abs(profitLoss))}`;

    return { result, summary, steps, voice };
  }

  /* ── 4. EMI Calculator ──────────────────────────────── */

  /**
   * Calculate Equated Monthly Installment.
   * Formula: EMI = P × r × (1+r)^n / ((1+r)^n − 1)
   * @param {number} principal  — Loan amount in ₹
   * @param {number} annualRate — Annual interest rate (e.g. 10 for 10%)
   * @param {number} months     — Loan tenure in months
   * @returns {{ result:object, summary:string, steps:string[], voice:string }}
   */
  function calculateEMI(principal, annualRate, months) {
    if (!allPositive(principal, months) || annualRate < 0) {
      return errorResult('Invalid input for EMI calculation');
    }

    let emi, totalPayment, totalInterest;

    if (annualRate === 0) {
      // Zero interest
      emi           = round(principal / months);
      totalPayment  = round(emi * months);
      totalInterest = 0;
    } else {
      const r = annualRate / 12 / 100; // monthly rate
      const n = months;
      const pow = Math.pow(1 + r, n);

      emi           = round(principal * r * pow / (pow - 1));
      totalPayment  = round(emi * months);
      totalInterest = round(totalPayment - principal);
    }

    const monthlyRate = round(annualRate / 12, 4);

    const steps = [
      `Principal (P): ${formatINR(principal)}`,
      `Annual Rate: ${annualRate}% → Monthly rate (r): ${monthlyRate}%`,
      `Tenure: ${months} months`,
      `EMI = P × r × (1+r)^n / ((1+r)^n − 1)`,
      `r = ${annualRate}% / 12 / 100 = ${round(annualRate / 12 / 100, 6)}`,
      `EMI = ${formatINR(emi)} per month`,
      `Total Payment = EMI × n = ${formatINR(emi)} × ${months} = ${formatINR(totalPayment)}`,
      `Total Interest = ${formatINR(totalPayment)} − ${formatINR(principal)} = ${formatINR(totalInterest)}`,
    ];

    const result = {
      principal,
      annualRate,
      months,
      emi,
      totalPayment,
      totalInterest,
      monthlyRate,
    };

    const years  = Math.floor(months / 12);
    const remMo  = months % 12;
    const tenure = years > 0
      ? `${years} saal${remMo > 0 ? ` ${remMo} mahine` : ''}`
      : `${months} mahine`;

    const summary = `EMI: ${formatINR(emi)}/mo | Total: ${formatINR(totalPayment)} | Interest: ${formatINR(totalInterest)}`;

    const voice = `${formatINR(principal)} ke loan par ${annualRate} percent saalaana byaaj ke saath ${tenure} ki avadhi mein maasik kist ${formatINR(emi)} hogi. Kul bhugtan ${formatINR(totalPayment)} hoga`;

    return { result, summary, steps, voice };
  }

  /* ── 5. Percentage Change Calculator ────────────────── */

  /**
   * Calculate percentage increase or decrease.
   * @param {number} oldValue
   * @param {number} newValue
   * @returns {{ result:object, summary:string, steps:string[], voice:string }}
   */
  function calculatePercentChange(oldValue, newValue) {
    if (!isFinite(oldValue) || !isFinite(newValue) || oldValue === 0) {
      return errorResult('Invalid input: old value cannot be zero');
    }

    const change       = round(newValue - oldValue);
    const changePct    = round((change / Math.abs(oldValue)) * 100, 4);
    const isIncrease   = changePct >= 0;
    const absChangePct = Math.abs(changePct);

    const steps = [
      `Old Value: ${oldValue}`,
      `New Value: ${newValue}`,
      `Change = New − Old = ${newValue} − ${oldValue} = ${change}`,
      `% Change = (Change / |Old|) × 100`,
      `         = (${change} / ${Math.abs(oldValue)}) × 100`,
      `         = ${changePct}%`,
      isIncrease
        ? `→ ${absChangePct}% increase`
        : `→ ${absChangePct}% decrease`,
    ];

    const result = { oldValue, newValue, change, changePct, isIncrease };

    const summary = isIncrease
      ? `+${changePct}% increase (${change > 0 ? '+' : ''}${change})`
      : `${changePct}% decrease (${change})`;

    const voice = isIncrease
      ? `${oldValue} se ${newValue} tak ${absChangePct} percent ki badhhotari hui`
      : `${oldValue} se ${newValue} tak ${absChangePct} percent ki kami ayi`;

    return { result, summary, steps, voice };
  }

  /* ── 6. Simple Interest ─────────────────────────────── */

  /**
   * Calculate Simple Interest.
   * @param {number} principal  — Principal amount
   * @param {number} rate       — Rate of interest per annum (%)
   * @param {number} years      — Time in years
   * @returns {{ result:object, summary:string, steps:string[], voice:string }}
   */
  function calculateSimpleInterest(principal, rate, years) {
    if (!allPositive(principal, rate, years)) {
      return errorResult('Invalid input for Simple Interest calculation');
    }

    const interest  = round(principal * rate * years / 100);
    const total     = round(principal + interest);

    const steps = [
      `Principal (P): ${formatINR(principal)}`,
      `Rate (R): ${rate}% per annum`,
      `Time (T): ${years} year${years !== 1 ? 's' : ''}`,
      `SI = (P × R × T) / 100`,
      `   = (${principal} × ${rate} × ${years}) / 100`,
      `   = ${formatINR(interest)}`,
      `Total Amount = P + SI = ${formatINR(principal)} + ${formatINR(interest)} = ${formatINR(total)}`,
    ];

    const result = { principal, rate, years, interest, total };

    const summary = `Interest: ${formatINR(interest)} | Total: ${formatINR(total)}`;

    const voice = `${formatINR(principal)} par ${rate} percent saalaana byaaj ke saath ${years} saal mein saadha byaaj ${formatINR(interest)} hoga. Kul rashi ${formatINR(total)} hogi`;

    return { result, summary, steps, voice };
  }

  /* ── Error result helper ─────────────────────────────── */

  function errorResult(message) {
    return {
      result:  null,
      summary: message,
      steps:   [message],
      voice:   'Kuch gadbad hai, sahi values daalen',
      error:   message,
    };
  }

  /* ── Tool Configs (for modal rendering) ─────────────── */

  const TOOL_CONFIGS = {
    gst: {
      title:  'GST Calculator',
      emoji:  '🧾',
      fields: [
        { id: 'amount',     label: 'Amount (₹)',  placeholder: '1000', type: 'number', min: 0 },
        { id: 'gstPercent', label: 'GST Rate (%)', placeholder: '18', type: 'number', min: 0, max: 100 },
        {
          id: 'inclusive', label: 'Amount includes GST?',
          type: 'select',
          options: [
            { value: 'false', label: 'No — exclusive (add GST on top)' },
            { value: 'true',  label: 'Yes — inclusive (extract GST)' },
          ],
        },
      ],
      calculate: (vals) => calculateGST(
        parseFloat(vals.amount),
        parseFloat(vals.gstPercent),
        vals.inclusive === 'true',
      ),
    },

    discount: {
      title:  'Discount Calculator',
      emoji:  '🏷️',
      fields: [
        { id: 'originalPrice',    label: 'Original Price (₹)',  placeholder: '2000', type: 'number', min: 0 },
        { id: 'discountPercent',  label: 'Discount (%)',         placeholder: '20',   type: 'number', min: 0, max: 100 },
      ],
      calculate: (vals) => calculateDiscount(
        parseFloat(vals.originalPrice),
        parseFloat(vals.discountPercent),
      ),
    },

    profit: {
      title:  'Profit / Loss',
      emoji:  '📈',
      fields: [
        { id: 'costPrice',    label: 'Cost Price (₹)',    placeholder: '1000', type: 'number', min: 0 },
        { id: 'sellingPrice', label: 'Selling Price (₹)', placeholder: '1500', type: 'number', min: 0 },
      ],
      calculate: (vals) => calculateProfit(
        parseFloat(vals.costPrice),
        parseFloat(vals.sellingPrice),
      ),
    },

    emi: {
      title:  'EMI Calculator',
      emoji:  '🏦',
      fields: [
        { id: 'principal',  label: 'Loan Amount (₹)',         placeholder: '500000', type: 'number', min: 0 },
        { id: 'annualRate', label: 'Annual Interest Rate (%)', placeholder: '10',     type: 'number', min: 0 },
        { id: 'months',     label: 'Tenure (months)',          placeholder: '24',     type: 'number', min: 1 },
      ],
      calculate: (vals) => calculateEMI(
        parseFloat(vals.principal),
        parseFloat(vals.annualRate),
        parseInt(vals.months, 10),
      ),
    },

    percentchange: {
      title:  '% Change',
      emoji:  '🔄',
      fields: [
        { id: 'oldValue', label: 'Old Value', placeholder: '800',  type: 'number' },
        { id: 'newValue', label: 'New Value', placeholder: '1000', type: 'number' },
      ],
      calculate: (vals) => calculatePercentChange(
        parseFloat(vals.oldValue),
        parseFloat(vals.newValue),
      ),
    },

    si: {
      title:  'Simple Interest',
      emoji:  '💹',
      fields: [
        { id: 'principal', label: 'Principal (₹)',          placeholder: '10000', type: 'number', min: 0 },
        { id: 'rate',      label: 'Rate (% per year)',      placeholder: '8',     type: 'number', min: 0 },
        { id: 'years',     label: 'Time (years)',           placeholder: '3',     type: 'number', min: 0 },
      ],
      calculate: (vals) => calculateSimpleInterest(
        parseFloat(vals.principal),
        parseFloat(vals.rate),
        parseFloat(vals.years),
      ),
    },
  };

  /* ── Expose ─────────────────────────────────────────── */
  return {
    calculateGST,
    calculateDiscount,
    calculateProfit,
    calculateEMI,
    calculatePercentChange,
    calculateSimpleInterest,
    formatINR,
    TOOL_CONFIGS,
  };

})();

window.Finance = Finance;
