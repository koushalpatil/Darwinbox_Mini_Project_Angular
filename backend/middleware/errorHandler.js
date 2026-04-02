const multer = require("multer");
const {
  AppError,
  ValidationError,
  PayloadTooLargeError,
} = require("./errorClasses");

/**
 * Centralised Express error-handling middleware.
 *
 * Must be registered LAST with `app.use(errorHandler)`.
 * Catches every error — both custom AppError subclasses and unexpected ones —
 * and returns a consistent JSON envelope.
 */
function errorHandler(err, req, res, _next) {
  // ── Multer errors ──────────────────────────────────────────────────
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      err = new PayloadTooLargeError("File too large (max 10 MB)");
    } else {
      err = new ValidationError(err.message);
    }
  }

  // Map the well-known "Only PDF files are allowed" multer fileFilter error
  if (err.message === "Only PDF files are allowed") {
    err = new ValidationError(err.message);
  }

  // ── Determine response values ──────────────────────────────────────
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : "INTERNAL_ERROR";
  const message = isAppError ? err.message : "Internal server error";

  // ── Log ────────────────────────────────────────────────────────────
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

  // ── Build response body ────────────────────────────────────────────
  const body = {
    success: false,
    error: {
      code,
      message,
    },
  };

  // Attach request ID when available
  if (req.requestId) {
    body.error.requestId = req.requestId;
  }

  // In development, include the stack trace for debugging
  if (process.env.NODE_ENV !== "production" && err.stack) {
    body.error.stack = err.stack;
  }

  // Guard against headers already sent (e.g. streaming responses)
  if (res.headersSent) {
    return;
  }

  res.status(statusCode).json(body);
}

module.exports = errorHandler;
