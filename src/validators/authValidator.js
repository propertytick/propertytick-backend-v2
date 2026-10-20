const Joi = require('joi');

const phoneSchema = Joi.string().pattern(/^[6-9]\d{9}$/).required()
  .messages({ 'string.pattern.base': 'Enter valid 10-digit Indian mobile number' });

const registerBuyerSchema = Joi.object({
  fullName: Joi.string().min(2).max(80).required(),
  phone: phoneSchema,
  email: Joi.string().email().optional(),
  role: Joi.string().valid('buyer', 'seller').default('buyer'),
  password: Joi.string().min(8).max(64).optional(),
});

const registerBrokerSchema = Joi.object({
  fullName: Joi.string().min(2).max(80).required(),
  phone: phoneSchema,
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(64).required(),
  agencyName: Joi.string().max(120).optional(),
  experienceYears: Joi.number().integer().min(0).max(70).optional(),
  operatingAreas: Joi.array().items(Joi.string().max(80)).optional(),
  reraNumber: Joi.string().max(50).optional().allow(''),
});

const registerAdvocateSchema = Joi.object({
  fullName: Joi.string().min(2).max(80).required(),
  phone: phoneSchema,
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(64).required(),
  barCouncilNumber: Joi.string().max(50).required(),
  enrollmentYear: Joi.number().integer().min(1950).max(new Date().getFullYear()).optional(),
  courtName: Joi.string().max(150).optional().allow(''),
  services: Joi.array()
    .items(Joi.string().valid('legal_verification', 'deed_drafting', 'both'))
    .min(1)
    .required(),
});

const registerColonizerSchema = Joi.object({
  fullName: Joi.string().min(2).max(80).required(),
  phone: phoneSchema,
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(64).required(),
  projectName: Joi.string().max(120).required(),
  projectAddress: Joi.string().max(300).optional().allow(''),
  pincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).optional(),
  landmark: Joi.string().max(200).optional().allow(''),
  contactNumber: phoneSchema,
  agents: Joi.array()
    .items(Joi.object({
      name: Joi.string().max(80).required(),
      mobile: phoneSchema,
    }))
    .optional(),
});

const registerSimpleSchema = Joi.object({
  fullName: Joi.string().min(2).max(80).required(),
  phone: phoneSchema,
  email: Joi.string().email().optional(),
  shopName: Joi.string().max(120).optional().allow(''),
});

const loginWithOtpSchema = Joi.object({
  phone: phoneSchema,
  purpose: Joi.string().valid('login', 'registration', 'password_reset').default('login'),
});

const verifyOtpSchema = Joi.object({
  phone: phoneSchema,
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  purpose: Joi.string().valid('login', 'registration', 'password_reset').required(),
});

module.exports = {
  registerBuyerSchema,
  registerBrokerSchema,
  registerAdvocateSchema,
  registerColonizerSchema,
  registerSimpleSchema,
  loginWithOtpSchema,
  verifyOtpSchema,
};
