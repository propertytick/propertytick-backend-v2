const Joi = require('joi');

const createRatingSchema = Joi.object({
  toUserId: Joi.string().required(),
  stars: Joi.number().integer().min(1).max(5).required(),
  review: Joi.string().max(1000).optional().allow(''),
  dealId: Joi.string().optional(),
  propertyId: Joi.string().optional(),
});

module.exports = { createRatingSchema };
