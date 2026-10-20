const ApiResponse = require('../utils/apiResponse');
const { convert, convertToAll, pricePerUnit } = require('../services/landConverter');
const { calculate, getSupportedStates } = require('../services/stampDutyService');

/**
 * POST /api/v1/tools/land-convert
 */
const landConvert = async (req, res, next) => {
  try {
    const { value, fromUnit, toUnit } = req.body;

    if (toUnit) {
      const result = convert(value, fromUnit, toUnit);
      return ApiResponse.success(res, { value, fromUnit, toUnit, result }, 'Converted');
    }

    const all = convertToAll(value, fromUnit);
    return ApiResponse.success(res, { value, fromUnit, allUnits: all }, 'All conversions');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/tools/stamp-duty
 */
const stampDuty = async (req, res, next) => {
  try {
    const result = calculate(req.body);
    return ApiResponse.success(res, result, 'Stamp duty calculated');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tools/states
 */
const states = async (req, res, next) => {
  try {
    return ApiResponse.success(res, { states: getSupportedStates() }, 'Supported states');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/tools/price-per-unit
 */
const pricePer = async (req, res, next) => {
  try {
    const { totalPrice, area, unit } = req.body;
    const result = pricePerUnit(totalPrice, area, unit);
    return ApiResponse.success(res, { pricePerSqft: result }, 'Calculated');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  landConvert,
  stampDuty,
  states,
  pricePer,
};
