const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../config/constants');

// GET /api/v1/notifications/my
const getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = { user: req.user._id };
    if (unreadOnly === 'true') filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user._id, isRead: false })
    ]);

    return ApiResponse.paginated(res, notifications, page, limit, total, 'Notifications fetched', { unreadCount });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true }
    );
    return ApiResponse.success(res, null, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/notifications/read-all
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );
    return ApiResponse.success(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead };