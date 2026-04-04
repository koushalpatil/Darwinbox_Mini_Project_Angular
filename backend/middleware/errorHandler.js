const multer = require("multer");
const {
  AppError,
  ValidationError,
  PayloadTooLargeError,
} = require("./errorClasses");

function errorHandler(err, req, res, _next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      err = new PayloadTooLargeError("File too large (max 10 MB)");
    } else {
      err = new ValidationError(err.message);
    }
  }

  if (err.message === "Only PDF files are allowed") {
    err = new ValidationError(err.message);
  }

  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : "INTERNAL_ERROR";
  const message = isAppError ? err.message : "Internal server error";

  if (statusCode >= 500) {
    console.error(
      `[${req.requestId || "no-id"}] ${req.method} ${req.originalUrl} → ${statusCode} ${code}`,
      err.stack || err,
    );
  } else {
    console.warn(
      `[${req.requestId || "no-id"}] ${req.method} ${req.originalUrl} → ${statusCode} ${code}: ${err.message}`,
    );
  }

  const body = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (req.requestId) {
    body.error.requestId = req.requestId;
  }

  if (process.env.NODE_ENV !== "production" && err.stack) {
    body.error.stack = err.stack;
  }

  if (res.headersSent) {
    return;
  }

  res.status(statusCode).json(body);
}

module.exports = errorHandler;
