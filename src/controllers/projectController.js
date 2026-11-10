const Project = require('../models/Project');
const Colonizer = require('../models/Colonizer');
const ApiResponse = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../config/constants');

const createProject = async (req, res, next) => {
  try {
    const {
      title, projectType, description, projectAddress,
      city, state, landmark,
      totalArea, totalPlots, priceRange, reraNumber,
      photos, naksha, contacts,
      // 👇 NAYE FIELDS
      adType, targetPincodes 
    } = req.body;

    const colonizer = await Colonizer.findOne({ user: req.user._id });
    if (!colonizer) {
      return ApiResponse.error(res, 'Colonizer profile not found', HTTP_STATUS.NOT_FOUND);
    }

    // 1. Pincode Limit Check (Max 10)
    if (targetPincodes && targetPincodes.length > 10) {
      return ApiResponse.error(res, 'Aap maximum 10 pincodes hi daal sakte hain.', HTTP_STATUS.BAD_REQUEST);
    }

    // 2. Duplicate Project Check (Same Colonizer ID + Same Title)
    const existingProject = await Project.findOne({ colonizer: colonizer._id, title: title });
    if (existingProject) {
      return ApiResponse.error(res, 'Aapne is naam ka project pehle hi upload kar rakha hai.', HTTP_STATUS.BAD_REQUEST);
    }

    // 3. Ad Type ke hisaab se data set karein
    let projectData = {
      colonizer: colonizer._id,
      title,
      projectType,
      description,
      projectAddress,
      location: { city, state, landmark }, // Pincode ab targetPincodes mein jayega
      targetPincodes, // 👈 10 Pincodes array
      totalArea,
      totalPlots,
      priceRange,
      reraNumber,
      photos,
      naksha,
      contacts,
      adType: adType || 'upcoming_project', // Default
    };

    // 4. Free Trial ya Payment Logic
    if (projectData.adType === 'upcoming_project') {
      // 3 Din Ka Free Trial Setup
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 3); // +3 Days

      projectData.trialStartDate = startDate;
      projectData.trialEndDate = endDate;
      projectData.isPaymentDone = false;
      projectData.status = 'active';
    } else {
      // Premium ya Paid Project (Payment Pending)
      projectData.isPaymentDone = false;
      projectData.status = 'pending_payment'; // Jab tak payment na ho, active nahi hoga
    }

    // 5. Database mein save karein
    const project = await Project.create(projectData);

    return ApiResponse.success(res, { project }, 'Project created successfully', HTTP_STATUS.CREATED);

  } catch (err) {
    // Agar Unique Index ki wajah se error aaya (Duplicate Title)
    if (err.code === 11000) {
      return ApiResponse.error(res, 'Ye project title pehle se maujood hai. Kripya naya title dein.', HTTP_STATUS.BAD_REQUEST);
    }
    next(err);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('colonizer', 'companyName contactNumber');

    if (!project) {
      return ApiResponse.error(res, 'Project not found', HTTP_STATUS.NOT_FOUND);
    }

    return ApiResponse.success(res, { project }, 'Project fetched');
  } catch (err) {
    next(err);
  }
};

const getMyProjects = async (req, res, next) => {
  try {
    const colonizer = await Colonizer.findOne({ user: req.user._id });
    if (!colonizer) {
      return ApiResponse.error(res, 'Colonizer profile not found', HTTP_STATUS.NOT_FOUND);
    }

    const projects = await Project.find({ colonizer: colonizer._id }).sort({ createdAt: -1 });
    return ApiResponse.success(res, { projects }, 'My projects fetched');
  } catch (err) {
    next(err);
  }
};

// 👇 NAYA FUNCTION: HomeScreen ke liye Ads Fetch Karna (Pincode Filter ke saath)
const getHomeAds = async (req, res, next) => {
  try {
    const { pincode } = req.query; // User ka pincode (App se aayega)
    const currentDate = new Date();

    // Base Filter: Sirf active aur valid ads
    const baseFilter = {
      status: 'active',
      $or: [
        { adType: 'upcoming_project', trialEndDate: { $gt: currentDate } }, // Trial active
        { adType: { $in: ['premium_banner', 'paid_project'] }, isPaymentDone: true } // Paid
      ]
    };

    // Pincode Filter (Agar user ne pincode bheja hai)
    if (pincode) {
      baseFilter.targetPincodes = pincode; 
    }

    // 1. Premium Banner (Sabse zyada payment wale)
    const premiumAds = await Project.find({ ...baseFilter, adType: 'premium_banner' }).limit(3);

    // 2. Paid Projects (Niche wale section ke liye)
    const paidProjects = await Project.find({ ...baseFilter, adType: 'paid_project' }).limit(10);

    // 3. Upcoming Projects (3 Din Free Trial)
    const upcomingProjects = await Project.find({ ...baseFilter, adType: 'upcoming_project' }).limit(10);

    return ApiResponse.success(res, { premiumAds, paidProjects, upcomingProjects }, 'Home ads fetched');

  } catch (err) {
    next(err);
  }
};

module.exports = { createProject, getProjectById, getMyProjects, getHomeAds };