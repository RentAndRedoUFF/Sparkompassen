/* Delas av webbläsaren och Node.js-testerna. Inga personuppgifter sparas. */
(function (root) {
  'use strict';
  const MAX_AMOUNT = 10000000;
  const FREQUENCIES = ['monthly', 'quarterly', 'yearly'];

  // Gränser visas på svenska, men numeriska data behålls oförändrade.
  function formatRangeValue(value, unit) {
    const formatted = new Intl.NumberFormat('sv-SE', {maximumFractionDigits: 3}).format(value);
    return unit ? `${formatted} ${unit}` : formatted;
  }

  function validateNumber(raw, label, options) {
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      return { error: `Ange ${label.toLowerCase()}.` };
    }
    const input = String(raw).trim();
    // Number('') och Number('  ') blir 0 – därför måste tomma fält kontrolleras först.
    const value = Number(input);
    if (!Number.isFinite(value)) {
      return { error: `${label} måste vara ett giltigt tal.` };
    }
    if (value < options.min || value > options.max) {
      return { error: `Ange ${label.toLowerCase()} mellan ${formatRangeValue(options.min, options.unit)} och ${formatRangeValue(options.max, options.unit)}.` };
    }
    if (options.integer && !Number.isInteger(value)) {
      return { error: `${label} måste anges i hela år.` };
    }
    return { value };
  }

  function validateLoan(values) {
    const errors = {};
    const clean = {};
    const rules = {
      loanAmount: { label: 'Studieskuld', min: 1, max: MAX_AMOUNT, unit: 'kr' },
      interestRate: { label: 'Årsränta', min: 0, max: 100, unit: '%' },
      repaymentYears: { label: 'Återbetalningstid', min: 1, max: 25, integer: true, unit: 'år' }
    };
    for (const [field, rule] of Object.entries(rules)) {
      const outcome = validateNumber(values[field], rule.label, rule);
      if (outcome.error) errors[field] = outcome.error;
      else clean[field] = outcome.value;
    }
    if (!FREQUENCIES.includes(values.paymentFrequency)) {
      errors.paymentFrequency = 'Välj ett giltigt betalningsintervall.';
    } else {
      clean.paymentFrequency = values.paymentFrequency;
    }
    return { valid: Object.keys(errors).length === 0, errors, data: clean };
  }

  const api = { validateLoan };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SparkompassenValidation = api;
}(typeof window !== 'undefined' ? window : null));
