const ApiResponse = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Joi validator middleware factory
 * Usage: validate(schema, 'body')
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return ApiResponse.error(res, 'Validation failed', HTTP_STATUS.BAD_REQUEST, errors);
    }

    req[source] = value;
    next();
  };
};

module.exports = validate;
