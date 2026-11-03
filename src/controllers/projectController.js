const Project = require('../models/Project'); // Agar model alag hai toh path check karein
const Colonizer = require('../models/Colonizer');
const ApiResponse = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../config/constants');

const createProject = async (req, res, next) => {
  try {
    const {
      title, projectType, description, projectAddress,
      city, state, pincode, landmark,
      totalArea, totalPlots, priceRange, reraNumber,
      photos, naksha, contacts,
    } = req.body;

    const colonizer = await Colonizer.findOne({ user: req.user._id });
    if (!colonizer) {
      return ApiResponse.error(res, 'Colonizer profile not found', HTTP_STATUS.NOT_FOUND);
    }

    const project = await Project.create({
      colonizer: colonizer._id,
      title,
      projectType,
      description,
      projectAddress,
      location: { city, state, pincode, landmark },
      totalArea,
      totalPlots,
      priceRange,
      reraNumber,
      photos,
      naksha,
      contacts,
    });

    return ApiResponse.success(res, { project }, 'Project created successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

   

module.exports = { createProject };