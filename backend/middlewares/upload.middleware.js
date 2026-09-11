const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function createUploader({ destination, fieldName, maxCount = 1, maxSizeMB = 5 }) {
  const storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, path.join(__dirname, '..', 'uploads', destination));
    },
    filename(req, file, cb) {
      const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new AppError('Only JPEG, PNG, and WEBP images are allowed', 422, 'VALIDATION_ERROR'));
      return;
    }
    cb(null, true);
  };

  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
  });

  const handler = maxCount > 1 ? upload.array(fieldName, maxCount) : upload.single(fieldName);

  return function uploadMiddleware(req, res, next) {
    handler(req, res, (err) => {
      if (!err) {
        return next();
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError(`File too large. Max size is ${maxSizeMB}MB`, 422, 'VALIDATION_ERROR'));
        }
        return next(new AppError(err.message, 422, 'VALIDATION_ERROR'));
      }

      return next(err);
    });
  };
}

module.exports = { createUploader };
