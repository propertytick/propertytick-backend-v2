const Superviser = require('../models/Superviser');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../config/constants');

const applyForPartnership = async (req, res, next) => {
  try {
    const { name, mobile, email, profession, experience } = req.body;

    if (!name || !mobile || !email || !profession) {
      return ApiResponse.error(res, 'All fields are required', HTTP_STATUS.BAD_REQUEST);
    }

    // ✅ Check karein ki user already registered hai ya nahi
    const existingUser = await User.findOne({
      $or: [{ phone: mobile }, { email: email.toLowerCase() }],
    });

    const application = await Superviser.create({
      name,
      mobile,
      email: email.toLowerCase(),
      profession,
      isRegistered: !!existingUser,
      registeredUserId: existingUser ? existingUser._id : null,
      registeredRole: existingUser ? existingUser.role : null,
      status: 'Pending',
    });

    return ApiResponse.success(res, { application }, 'Application submitted successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

module.exports = { applyForPartnership };