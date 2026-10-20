const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    fees: {
  brokerWelcomeFree: { type: Number, default: 3 },
  brokerGrowthPackSize: { type: Number, default: 10 },
  brokerGrowthPackPrice: { type: Number, default: 3000 },
  brokerRegularPackSize: { type: Number, default: 10 },
  brokerRegularPackPrice: { type: Number, default: 5000 },

  advocateWelcomeFree: { type: Number, default: 3 },
  advocatePackSize: { type: Number, default: 10 },
  advocatePackPrice: { type: Number, default: 500 },

  colonizerAdPackSize: { type: Number, default: 1000 },
  colonizerAdPackPrice: { type: Number, default: 1000 },
  colonizerGrowthPackSize: { type: Number, default: 5000 },
  colonizerGrowthPackPrice: { type: Number, default: 5000 },

  topRankingBroker: { type: Number, default: 999 },
  topRankingAdvocate: { type: Number, default: 799 },
  topRankingColonizer: { type: Number, default: 1499 },
  topRankingBuyerProperty: { type: Number, default: 499 },
    // AD PRICING
  adPricing: {
    homepageBanner: { type: Number, default: 3000 },
    searchTop: { type: Number, default: 1000 },
    featuredBadge: { type: Number, default: 5000 },
    homepageSpotlight: { type: Number, default: 5000 },
  },

  // 👇 RENT PRICING — YEH ADD KARO
  rentFreeLimit: { type: Number, default: 3 },
  rentPerPropertyPrice: { type: Number, default: 100 },
  rentStarterPackSize: { type: Number, default: 10 },
  rentStarterPackPrice: { type: Number, default: 1000 },
  rentGrowthPackSize: { type: Number, default: 20 },
  rentGrowthPackPrice: { type: Number, default: 3000 },
},
    ratingWeights: {
      starWeight: { type: Number, default: 1.0 },
      paidWeight: { type: Number, default: 1.0 },
      milestoneWeight: { type: Number, default: 1.0 },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

adminSettingsSchema.statics.getGlobal = async function () {
  let doc = await this.findOne({ key: 'global' });
  if (!doc) doc = await this.create({ key: 'global' });
  return doc;
};

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);
