const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const HTTP_STATUS = require('../config/constants').HTTP_STATUS;

// @desc    Delete user permanently (Hard Delete)
// @route   DELETE /api/users/:id
// @access  Admin
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return ApiResponse.error(res, 'User not found', HTTP_STATUS.NOT_FOUND);
    }

    // Permanent delete from database
    await User.findByIdAndDelete(id);

    return ApiResponse.success(res, null, 'User permanently deleted');
  } catch (err) {
    next(err);
  }
};

// @desc    Soft delete user (but free up phone/email/userId)
// @route   PATCH /api/users/:id/soft-delete
// @access  Admin
const softDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const timestamp = Date.now();

    const user = await User.findById(id);
    if (!user) {
      return ApiResponse.error(res, 'User not found', HTTP_STATUS.NOT_FOUND);
    }

    // Soft delete + free up unique fields
    await User.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      isActive: false,
      isBlocked: true,
      phone: `deleted_${timestamp}_${user.phone}`, // Unique ban jayega
      email: null, // sparse: true ki wajah se allow hoga
      userId: null, // sparse: true ki wajah se allow hoga
    });

    return ApiResponse.success(res, null, 'User deactivated and data freed');
  } catch (err) {
    next(err);
  }
};

module.exports = { deleteUser, softDeleteUser };
