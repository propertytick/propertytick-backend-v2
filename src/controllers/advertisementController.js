const Project = require('../models/Project');

exports.getHomeAds = async (req, res) => {
  try {
    const { pincode } = req.query; // User ka pincode (Mobile App se aayega)
    const currentDate = new Date();

    // Filter: Sirf active ads, jinka trial khatam nahi hua, aur pincode match kare
    const filter = {
      status: 'active',
      $or: [
        { adType: 'upcoming_project', trialEndDate: { $gt: currentDate } }, // Trial active
        { adType: { $in: ['premium_banner', 'paid_project'] }, isPaymentDone: true } // Paid
      ]
    };

    if (pincode) {
      filter.pincodes = pincode; // Pincode match
    }

    // 1. Top Premium Banner (Sabse zyada payment wale)
    const premiumAds = await Project.find({ ...filter, adType: 'premium_banner' }).limit(3);

    // 2. Paid Projects (Niche wale section ke liye)
    const paidProjects = await Project.find({ ...filter, adType: 'paid_project' }).limit(10);

    // 3. Upcoming Projects (3 Din Free Trial)
    const upcomingProjects = await Project.find({ ...filter, adType: 'upcoming_project' }).limit(10);

    res.status(200).json({
      success: true,
      data: {
        premiumAds,
        paidProjects,
        upcomingProjects
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};