'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SparkompassenInsights = api;
})(typeof window !== 'undefined' ? window : null, () => {
  const frequencies = { monthly: 12, quarterly: 4, yearly: 1 };
  const roundMoney = value => Math.round((value + Number.EPSILON) * 100) / 100;

  function getInputs(data) {
    const amount = Number(data.loanAmount);
    const rate = Number(data.interestRate);
    const years = Number(data.repaymentYears);
    const extra = Number(data.extraPayment ?? 0);
    const annualFee = Number(data.annualFee ?? 0);
    if (!Number.isFinite(amount) || amount < 1 || amount > 1e7 ||
        !Number.isFinite(rate) || rate < 0 || rate > 100 ||
        !Number.isInteger(years) || years < 1 || years > 25 ||
        !Number.isFinite(extra) || extra < 0 || extra > 1e7 ||
        !Number.isFinite(annualFee) || annualFee < 0 || annualFee > 10000 ||
        !Object.hasOwn(frequencies, data.paymentFrequency)) {
      throw new RangeError('Ogiltiga beräkningsvärden.');
    }
    return { amount, rate, years, extra, annualFee, perYear: frequencies[data.paymentFrequency] };
  }

  function paymentFor(amount, annualRate, years, perYear) {
    const rate = annualRate / 100 / perYear;
    const count = years * perYear;
    return rate === 0 ? amount / count : (amount * (rate / -Math.expm1(-count * Math.log1p(rate))));
  }

  function buildSchedule(data) {
    const { amount, rate, years, extra, annualFee, perYear } = getInputs(data);
    const scheduledPeriods = years * perYear;
    const periodicRate = rate / 100 / perYear;
    const basePayment = paymentFor(amount, rate, years, perYear);
    const plannedPayment = basePayment + extra;
    const yearly = [];
    const points = [{ year: 0, balance: amount }];
    let balance = amount;
    let periods = 0;
    let totalInterest = 0;
    let finalPayment = 0;
    let yearPaid = 0;
    let yearInterest = 0;

    while (periods < scheduledPeriods && balance > 0) {
      periods++;
      const interest = balance * periodicRate;
      const due = balance + interest;
      const settle = periods === scheduledPeriods || due - plannedPayment < 1e-7;
      finalPayment = settle ? due : plannedPayment;
      balance = settle ? 0 : due - finalPayment;
      totalInterest += interest;
      yearInterest += interest;
      yearPaid += finalPayment;

      if (periods % perYear === 0 || balance === 0) {
        const elapsed = periods / perYear;
        points.push({ year: elapsed, balance: roundMoney(balance) });
        yearly.push({
          year: Math.ceil(elapsed),
          paid: roundMoney(yearPaid + annualFee),
          interest: roundMoney(yearInterest),
          fee: roundMoney(annualFee),
          balance: roundMoney(balance),
        });
        yearPaid = 0;
        yearInterest = 0;
      }
    }

    return {
      years: periods / perYear,
      perYear,
      periods,
      regular: roundMoney(Math.min(plannedPayment, amount * (1 + periodicRate))),
      finalPayment: roundMoney(finalPayment),
      interest: roundMoney(totalInterest),
      fees: roundMoney(annualFee * yearly.length),
      total: roundMoney(amount + totalInterest + annualFee * yearly.length),
      points,
      yearly,
    };
  }

  function compareTerms(data, yearsList = [10, 15, 20, 25]) {
    const { years } = getInputs(data);
    const terms = [...new Set([...yearsList, years])]
      .filter(year => Number.isInteger(year) && year >= 1 && year <= 25)
      .sort((a, b) => a - b);
    return terms.map(term => {
      const schedule = buildSchedule({ ...data, repaymentYears: term });
      return { years: term, payment: schedule.regular, interest: schedule.interest, total: schedule.total, selected: term === years };
    });
  }

  function compareRates(data, step = 1) {
    const { rate } = getInputs(data);
    return [...new Set([Math.max(0, rate - step), rate, Math.min(100, rate + step)])].map(interestRate => {
      const schedule = buildSchedule({ ...data, interestRate });
      return { rate: interestRate, payment: schedule.regular, interest: schedule.interest, total: schedule.total, selected: interestRate === rate };
    });
  }

  function csvYearly(schedule) {
    const lines = ['År;Inbetalt under året (kr);Ränta under året (kr);Årsavgift (kr);Skuld kvar (kr)'];
    const cell = value => Number(value).toFixed(2).replace('.', ',');
    for (const row of schedule.yearly) {
      lines.push([row.year, cell(row.paid), cell(row.interest), cell(row.fee ?? 0), cell(row.balance)].join(';'));
    }
    return '\ufeff' + lines.join('\r\n') + '\r\n';
  }

  return { buildSchedule, compareTerms, compareRates, csvYearly, paymentFor };
});
