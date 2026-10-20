// Land unit conversion — North India (UP, Bihar, MP, Rajasthan)
// Base unit: Square Feet (sqft)
//
// 1 Bigha (UP) = 27,000 sqft (varies by state; standard used here)
// 1 Biswa = 1/20 Bigha = 1,350 sqft
// 1 Gaj (Square Yard) = 9 sqft
// 1 Murabba = 25 Acres = 10,89,000 sqft
// 1 Kattha (UP) = 1/20 Bigha = 1,350 sqft (same as Biswa in some regions)
// 1 Acre = 43,560 sqft
// 1 Hectare = 1,07,639 sqft

const CONVERSION_TO_SQFT = {
  sqft: 1,
  gaz: 9,
  biswa: 1350,
  kattha: 1350,
  bigha: 27000,
  acre: 43560,
  hectare: 107639,
  murabba: 1089000,
};

/**
 * Convert any value from one unit to another
 */
const convert = (value, fromUnit, toUnit) => {
  if (!CONVERSION_TO_SQFT[fromUnit] || !CONVERSION_TO_SQFT[toUnit]) {
    throw new Error(`Unknown unit: ${fromUnit} or ${toUnit}`);
  }

  const sqft = value * CONVERSION_TO_SQFT[fromUnit];
  const result = sqft / CONVERSION_TO_SQFT[toUnit];

  return Math.round(result * 100) / 100;
};

/**
 * Convert to all units (useful for display)
 */
const convertToAll = (value, fromUnit) => {
  if (!CONVERSION_TO_SQFT[fromUnit]) {
    throw new Error(`Unknown unit: ${fromUnit}`);
  }

  const sqft = value * CONVERSION_TO_SQFT[fromUnit];
  const result = {};

  for (const unit of Object.keys(CONVERSION_TO_SQFT)) {
    result[unit] = Math.round((sqft / CONVERSION_TO_SQFT[unit]) * 100) / 100;
  }

  return result;
};

/**
 * Get price per unit
 */
const pricePerUnit = (totalPrice, area, unit) => {
  const sqft = area * CONVERSION_TO_SQFT[unit];
  if (sqft === 0) return 0;
  return Math.round((totalPrice / sqft) * 100) / 100;
};

module.exports = {
  convert,
  convertToAll,
  pricePerUnit,
  CONVERSION_TO_SQFT,
};
