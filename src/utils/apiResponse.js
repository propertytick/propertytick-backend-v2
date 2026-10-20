const { HTTP_STATUS } = require('../config/constants');

class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = HTTP_STATUS.OK) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static error(res, message = 'Something went wrong', statusCode = HTTP_STATUS.SERVER_ERROR, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  static paginated(res, data, page, limit, total, message = 'Success') {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = ApiResponse;
