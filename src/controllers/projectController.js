const Project = require('../models/Project');
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

module.exports = { createProject, getProjectById, getMyProjects };