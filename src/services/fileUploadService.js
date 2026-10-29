const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

/**
 * Single file ko Cloudinary par upload karo
 */
const uploadToCloudinary = async (fileBuffer, folder = 'propertytick') => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );

      // Buffer ko stream mein convert karo
      const { Readable } = require('stream');
      const stream = new Readable();
      stream.push(fileBuffer);
      stream.push(null);
      stream.pipe(uploadStream);
    });
  } catch (err) {
    logger.error('Upload service error:', err.message);
    throw err;
  }
};

/**
 * Multiple files ko Cloudinary par upload karo
 */
const uploadMultipleFiles = async (files, folder = 'propertytick') => {
  try {
    const uploadPromises = files.map((file) => uploadToCloudinary(file.buffer, folder));
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (err) {
    logger.error('Multiple upload error:', err.message);
    throw err;
  }
};

module.exports = { uploadToCloudinary, uploadMultipleFiles };