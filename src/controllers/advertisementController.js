const Project = require('../models/Project');
const Property = require('../models/Property');

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

    const premiumAdsRaw = await Project.find({ ...filter, adType: 'premium_banner' }).limit(3);
    const paidProjectsRaw = await Project.find({ ...filter, adType: 'paid_project' }).limit(10);
    const upcomingProjectsRaw = await Project.find({ ...filter, adType: 'upcoming_project' }).limit(10);

    // Format data for frontend
    const formatData = (arr) => arr.map(item => ({
      _id: item._id,
      image: item.photos?.[0] || 'https://via.placeholder.com/400',
      title: item.title,
      project: item, 
    }));

    res.status(200).json({
      success: true,
      data: {
        premiumAds: formatData(premiumAdsRaw),
        paidProjects: formatData(paidProjectsRaw),
        upcomingProjects: formatData(upcomingProjectsRaw),
        }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUpcomingProjectAd = async (req, res) => {
  try {
    const { projectId, pincodes, location } = req.body;
    
    const project = await Project.findByIdAndUpdate(
      projectId,
      {
        adType: 'upcoming_project',
        pincodes: pincodes,
        location: location,
        trialEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days free trial
        status: 'active'
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.status(200).json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};