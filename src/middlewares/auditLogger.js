const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const audit = (action, entity = null) => {
  return async (req, res, next) => {
    // Save original json sender
    const originalJson = res.json.bind(res);
    let responseBody;

    res.json = (body) => {
      responseBody = body;
      return originalJson(body);
    };

    res.on('finish', async () => {
      try {
        await AuditLog.create({
          user: req.user?._id,
          role: req.user?.role,
          action,
          entity,
          entityId: req.params?.id || req.body?._id,
          meta: {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            success: responseBody?.success,
          },
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          status: res.statusCode < 400 ? 'success' : 'failure',
        });
      } catch (err) {
        logger.error(`Audit log failed: ${err.message}`);
      }
    });

    next();
  };
};

module.exports = audit;
