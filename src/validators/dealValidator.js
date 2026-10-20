const Joi = require('joi');

const initiateDealSchema = Joi.object({
  propertyId: Joi.string().required(),
  buyerPhone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  finalAmount: Joi.number().positive().required(),
  tokenAmount: Joi.number().min(0).optional(),
  commissionPercent: Joi.number().min(0).max(10).optional(),
});

const verifyDealOtpSchema = Joi.object({
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  party: Joi.string().valid('buyer', 'owner').required(),
});

module.exports = {
  initiateDealSchema,
  verifyDealOtpSchema,
};
