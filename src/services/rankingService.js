const User = require('../models/User');
const Broker = require('../models/Broker');
const Advocate = require('../models/Advocate');
const Colonizer = require('../models/Colonizer');
const AdminSettings = require('../models/AdminSettings');
const logger = require('../utils/logger');

/**
 * Calculate star rank (0-100) based on:
 * - Average rating (0-5)
 * - Total ratings count
 * - Milestones completed
 */
const calculateStarRank = (averageRating, ratingCount, milestones = 0) => {
  const ratingScore = (averageRating / 5) * 60; // max 60
  const countScore = Math.min(ratingCount / 50, 1) * 20; // max 20
  const milestoneScore = Math.min(milestones / 100, 1) * 20; // max 20

  return Math.round(ratingScore + countScore + milestoneScore);
};

/**
 * Calculate priority score for search ranking:
 * priorityScore = (starRank × starWeight) + (paidWeight if paid) + (milestoneWeight × milestones)
 */
const calculatePriorityScore = async ({ starRank, isPaidPromotion, milestones = 0 }) => {
  const settings = await AdminSettings.getGlobal();
  const { starWeight, paidWeight, milestoneWeight } = settings.ratingWeights;

  const starComponent = starRank * starWeight;
  const paidComponent = isPaidPromotion ? 100 * paidWeight : 0;
  const milestoneComponent = Math.min(milestones / 10, 1) * 50 * milestoneWeight;

  return Math.round(starComponent + paidComponent + milestoneComponent);
};

/**
 * Recalculate star rank + priority score for a single user
 */
const recalculateUserRank = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    let milestones = 0;

    if (user.role === 'broker') {
      const broker = await Broker.findOne({ user: userId });
      milestones = broker?.milestones?.successfulDeals || 0;
    } else if (user.role === 'advocate') {
      const advocate = await Advocate.findOne({ user: userId });
      milestones = (advocate?.milestones?.verifiedTitleChecks || 0) + (advocate?.milestones?.deedsDrafted || 0);
    } else if (user.role === 'colonizer') {
      const colonizer = await Colonizer.findOne({ user: userId });
      milestones = colonizer?.agents?.length || 0;
    }

    const starRank = calculateStarRank(user.rating.average, user.rating.count, milestones);
    const priorityScore = await calculatePriorityScore({
      starRank,
      isPaidPromotion: user.promotion?.isPaid || false,
      milestones,
    });

    user.rating.starRank = starRank;
    user.promotion.priorityScore = priorityScore;
    await user.save();

    return { starRank, priorityScore };
  } catch (err) {
    logger.error(`recalculateUserRank failed for ${userId}: ${err.message}`);
    return null;
  }
};

/**
 * Recalculate star rank + priority score for a colonizer project
 */
const recalculateColonizerRank = async (colonizerId) => {
  try {
    const colonizer = await Colonizer.findById(colonizerId);
    if (!colonizer) return null;

    const milestones = colonizer.agents?.length || 0;
    const starRank = calculateStarRank(colonizer.rating.average, colonizer.rating.count, milestones);
    const priorityScore = await calculatePriorityScore({
      starRank,
      isPaidPromotion: colonizer.promotion?.isPaid || false,
      milestones,
    });

    colonizer.rating.starRank = starRank;
    colonizer.promotion.priorityScore = priorityScore;
    await colonizer.save();

    return { starRank, priorityScore };
  } catch (err) {
    logger.error(`recalculateColonizerRank failed for ${colonizerId}: ${err.message}`);
    return null;
  }
};

module.exports = {
  calculateStarRank,
  calculatePriorityScore,
  recalculateUserRank,
  recalculateColonizerRank,
};
