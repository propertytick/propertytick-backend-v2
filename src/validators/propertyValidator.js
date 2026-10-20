const Joi = require('joi');

const createPropertySchema = Joi.object({
  title: Joi.string().required().max(200),
  description: Joi.string().allow('').max(3000),
  propertyType: Joi.string().valid('plot', 'land', 'house', 'flat', 'shop', 'agriculture', 'commercial', 'industrial').required(),
  listingPurpose: Joi.string().valid('buy', 'rent', 'lease', 'exchange').required(),
  area: Joi.object({
    value: Joi.number().required().min(0),
    unit: Joi.string().required(),
  }).required(),
  price: Joi.object({
    amount: Joi.number().required().min(0),
    isNegotiable: Joi.boolean(),
  }).required(),
  location: Joi.object({
    state: Joi.string().allow(''),
    district: Joi.string().allow(''),
    city: Joi.string().allow(''),
    tehsil: Joi.string().allow(''),
    village: Joi.string().allow(''),
    pincode: Joi.string().allow(''),
    landmark: Joi.string().allow(''),
    address: Joi.string().allow(''),
  }),
  photos: Joi.array().items(Joi.string()),
  uploadedPhotos: Joi.array().items(Joi.string()),
  videoTour: Joi.string().allow(''),
  khasraNumber: Joi.string().allow(''),
  exchangeAvailable: Joi.boolean(),
  exchangeWanted: Joi.string().allow('').max(500),
}).unknown(true);

// 👇 YE HAI SABSE IMPORTANT — listPropertyQuerySchema
const listPropertyQuerySchema = Joi.object({
  listingPurpose: Joi.string().valid('buy', 'rent', 'lease', 'exchange'),
  type: Joi.string().valid('buy', 'rent', 'lease', 'exchange'),        // 👈 ADD
  purpose: Joi.string().valid('buy', 'rent', 'lease', 'exchange'),     // 👈 ADD
  propertyType: Joi.string().valid('plot', 'land', 'house', 'flat', 'shop', 'agriculture', 'commercial', 'industrial'),
  search: Joi.string().allow(''),
  q: Joi.string().allow(''),                                            // 👈 ADD
  city: Joi.string().allow(''),
  state: Joi.string().allow(''),
  pincode: Joi.string().allow(''),
  minPrice: Joi.number(),
  maxPrice: Joi.number(),
  minArea: Joi.number(),
  maxArea: Joi.number(),
  unit: Joi.string(),
  exchangeAvailable: Joi.string(),
  status: Joi.string(),
  page: Joi.number(),
  limit: Joi.number(),
  sortBy: Joi.string(),
  sortOrder: Joi.string(),
}).unknown(true);   // 👈 YE BAHUT ZAROORI HAI

module.exports = {
  createPropertySchema,
  listPropertyQuerySchema,
};
