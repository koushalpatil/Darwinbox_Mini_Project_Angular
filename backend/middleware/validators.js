const { ValidationError } = require("./errorClasses");

/**
 * POST /api/upload — ensure a file was actually attached.
 * (Multer's fileFilter already rejects non-PDFs; this catches "no file".)
 */
function validateUpload(req, _res, next) {
  if (!req.file) {
    return next(new ValidationError("No PDF file provided"));
  }
  next();
}

/**
 * GET/DELETE /api/pdf/:key — ensure the S3 key param is present.
 */
function validateFileKey(req, _res, next) {
  const fileKey = req.params[0];
  if (!fileKey || fileKey.trim().length === 0) {
    return next(new ValidationError("Missing S3 file key"));
  }
  next();
}

/**
 * POST /api/extract — ensure the body is a non-empty PDF buffer.
 */
function validateExtractBody(req, _res, next) {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return next(new ValidationError("Missing PDF binary in request body"));
  }
  next();
}

/**
 * POST /api/pdf/fill — ensure pdfBase64 and formData are present.
 */
function validateFillBody(req, _res, next) {
  const { pdfBase64, formData } = req.body || {};

  if (!pdfBase64) {
    return next(new ValidationError("Missing required field: pdfBase64"));
  }
  if (!formData || typeof formData !== "object") {
    return next(
      new ValidationError("Missing or invalid required field: formData"),
    );
  }
  next();
}

/**
 * POST /api/pdf/bulk-fill — ensure files array is valid and each entry
 * has the required pdfBase64 + formData fields.
 */
function validateBulkFillBody(req, _res, next) {
  const { files } = req.body || {};

  if (!Array.isArray(files) || files.length === 0) {
    return next(new ValidationError('"files" must be a non-empty array'));
  }

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (!f.pdfBase64 || !f.formData) {
      return next(
        new ValidationError(
          `File at index ${i} is missing required "pdfBase64" or "formData"`,
        ),
      );
    }
  }

  next();
}

module.exports = {
  validateUpload,
  validateFileKey,
  validateExtractBody,
  validateFillBody,
  validateBulkFillBody,
};
