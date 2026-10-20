const Joi = require('joi');

const listUsersQuerySchema = Joi.object({
  role: Joi.string().valid('buyer', 'broker', 'advocate', 'colonizer', 'typist', 'stamp_vendor', 'admin').optional().allow('', null),
search: Joi.string().max(100).optional().allow('', null),
  kycStatus: Joi.string().valid('pending', 'verified', 'rejected').optional(),
  isBlocked: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'rating.average', 'promotion.priorityScore', 'fullName').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const updateFeesSchema = Joi.object({
  // BROKER
  brokerWelcomeFree: Joi.number().min(0),
  brokerGrowthPackSize: Joi.number().min(1),
  brokerGrowthPackPrice: Joi.number().min(0),
  brokerRegularPackSize: Joi.number().min(1),
  brokerRegularPackPrice: Joi.number().min(0),

  // ADVOCATE
  advocateWelcomeFree: Joi.number().min(0),
  advocatePackSize: Joi.number().min(1),
  advocatePackPrice: Joi.number().min(0),

  // COLONIZER
  colonizerAdPackSize: Joi.number().min(1),
  colonizerAdPackPrice: Joi.number().min(0),
  colonizerGrowthPackSize: Joi.number().min(1),
  colonizerGrowthPackPrice: Joi.number().min(0),

  // TOP RANKING
  topRankingBroker: Joi.number().min(0),
  topRankingAdvocate: Joi.number().min(0),
  topRankingColonizer: Joi.number().min(0),
  topRankingBuyerProperty: Joi.number().min(0),

  // 👇 YEH NAYE FIELDS ADD KAREIN 👇
  rentFreeLimit: Joi.number().min(0),
  rentPerPropertyPrice: Joi.number().min(0),
  rentStarterPackSize: Joi.number().min(1),
  rentStarterPackPrice: Joi.number().min(0),
  rentGrowthPackSize: Joi.number().min(1),
  rentGrowthPackPrice: Joi.number().min(0),
  // 👆 YAHAN TAK 👆

  // AD PRICING
  adPricing: Joi.object({
    homepageBanner: Joi.number().min(0),
    searchTop: Joi.number().min(0),
    featuredBadge: Joi.number().min(0),
    homepageSpotlight: Joi.number().min(0),
  }),
}).unknown(false);

const kycActionSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  remarks: Joi.string().max(500).optional().allow(''),
});

const blockUserSchema = Joi.object({
  isBlocked: Joi.boolean().required(),
  reason: Joi.string().max(500).optional().allow(''),
});

const promoteUserSchema = Joi.object({
  isPaid: Joi.boolean().required(),
  paidUntil: Joi.date().iso().optional(),
});

module.exports = {
  listUsersQuerySchema,
  updateFeesSchema,
  kycActionSchema,
  blockUserSchema,
  promoteUserSchema,
  updateFeesSchema,
};
