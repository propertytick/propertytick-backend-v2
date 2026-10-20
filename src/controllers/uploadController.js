const cloudinary = require('../config/cloudinary');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { HTTP_STATUS } = require('../config/constants');

/**
 * POST /api/v1/upload/image
 * Upload single image
 */
const uploadSingleImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'No file uploaded', HTTP_STATUS.BAD_REQUEST);
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'PropertyTick/properties',
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 900, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });

    return ApiResponse.success(
      res,
      {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      },
      'Image uploaded successfully',
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    logger.error(`Image upload failed: ${err.message}`);
    next(err);
  }
};

/**
 * POST /api/v1/upload/multiple
 * Upload multiple images (max 10)
 */
const uploadMultipleImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return ApiResponse.error(res, 'No files uploaded', HTTP_STATUS.BAD_REQUEST);
    }

    const uploadPromises = req.files.map(async (file) => {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataUri = `data:${file.mimetype};base64,${b64}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'PropertyTick/properties',
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 900, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      };
    });

    const uploaded = await Promise.all(uploadPromises);

    return ApiResponse.success(
      res,
      { images: uploaded, count: uploaded.length },
      `${uploaded.length} image(s) uploaded successfully`,
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    logger.error(`Multiple image upload failed: ${err.message}`);
    next(err);
  }
};

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
};
