'use strict';

const { validateLoan } = require('../public/validation');
const { buildSchedule } = require('../public/insights');

function calculateLoan(input) {
  const { valid, errors, data } = validateLoan(input ?? {});
  if (!valid) return { valid, errors };

  const schedule = buildSchedule(data);
  const baseline = data.extraPayment === 0 ? schedule : buildSchedule({ ...data, extraPayment: 0 });
  return {
    valid,
    data,
    result: {
      payment: schedule.regular,
      total: schedule.total,
      interest: schedule.interest,
      periods: schedule.periods,
      perYear: schedule.perYear,
      finalPayment: schedule.finalPayment,
      periodsSaved: baseline.periods - schedule.periods,
      interestSaved: Math.max(0, Math.round((baseline.interest - schedule.interest) * 100) / 100),
    },
    model: 'förenklad-annuitet',
    notice: 'Illustrativ beräkning med fast ränta. CSN beräknar årsbelopp enligt särskilda regler och räntan kan ändras.',
  };
}

module.exports = { calculateLoan };
