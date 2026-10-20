// Stamp duty + registration calculator
// State-wise rates (approximate, adjustable via admin later)

const STATE_RATES = {
  'Uttar Pradesh': { stampDutyMale: 7, stampDutyFemale: 6, registration: 2, urbanCess: 0 },
  'Bihar': { stampDutyMale: 6.5, stampDutyFemale: 5.7, registration: 2, urbanCess: 0 },
  'Madhya Pradesh': { stampDutyMale: 7.5, stampDutyFemale: 6, registration: 3, urbanCess: 0 },
  'Rajasthan': { stampDutyMale: 6, stampDutyFemale: 5, registration: 2, urbanCess: 0 },
  'Maharashtra': { stampDutyMale: 6, stampDutyFemale: 5, registration: 1, urbanCess: 1 },
  'Delhi': { stampDutyMale: 6, stampDutyFemale: 4, registration: 1, urbanCess: 0 },
  'Haryana': { stampDutyMale: 7, stampDutyFemale: 5, registration: 2, urbanCess: 0 },
  'Punjab': { stampDutyMale: 7, stampDutyFemale: 5, registration: 2, urbanCess: 0 },
};

const DEFAULT_STATE = 'Uttar Pradesh';

/**
 * Calculate stamp duty + registration charges
 */
const calculate = ({ propertyValue, state = DEFAULT_STATE, buyerGender = 'male', isUrban = true }) => {
  const rates = STATE_RATES[state] || STATE_RATES[DEFAULT_STATE];

  const stampDutyPercent = buyerGender === 'female' ? rates.stampDutyFemale : rates.stampDutyMale;
  const registrationPercent = rates.registration;
  const urbanCessPercent = isUrban ? rates.urbanCess : 0;

  const stampDuty = Math.round((propertyValue * stampDutyPercent) / 100);
  const registration = Math.round((propertyValue * registrationPercent) / 100);
  const urbanCess = Math.round((propertyValue * urbanCessPercent) / 100);

  const total = stampDuty + registration + urbanCess;

  return {
    state,
    rates: {
      stampDutyPercent,
      registrationPercent,
      urbanCessPercent,
    },
    breakup: {
      stampDuty,
      registration,
      urbanCess,
    },
    total,
    totalPercent: stampDutyPercent + registrationPercent + urbanCessPercent,
  };
};

/**
 * Get list of supported states
 */
const getSupportedStates = () => Object.keys(STATE_RATES);

module.exports = {
  calculate,
  getSupportedStates,
  STATE_RATES,
};
