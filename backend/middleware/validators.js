const { ValidationError } = require("./errorClasses");

function validateUpload(req, _res, next) {
  if (!req.file) {
    return next(new ValidationError("No PDF file provided"));
  }
  next();
}

function validateFileKey(req, _res, next) {
  const fileKey = req.params[0];
  if (!fileKey || fileKey.trim().length === 0) {
    return next(new ValidationError("Missing S3 file key"));
  }
  next();
}

function validateExtractBody(req, _res, next) {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return next(new ValidationError("Missing PDF binary in request body"));
  }
  next();
}

module.exports = {
  validateUpload,
  validateFileKey,
  validateExtractBody,
};
