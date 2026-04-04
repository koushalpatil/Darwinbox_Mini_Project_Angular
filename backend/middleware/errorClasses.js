class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = "Invalid request data") {
    super(message, 400, "VALIDATION_ERROR");
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

class PayloadTooLargeError extends AppError {
  constructor(message = "Payload too large") {
    super(message, 413, "PAYLOAD_TOO_LARGE");
  }
}

class S3Error extends AppError {
  constructor(message = "S3 operation failed", cause) {
    super(message, 502, "S3_ERROR");
    if (cause) this.cause = cause;
  }
}

class WorkerError extends AppError {
  constructor(message = "Worker processing failed", isTimeout = false) {
    super(message, 500, isTimeout ? "WORKER_TIMEOUT" : "WORKER_ERROR");
    this.isTimeout = isTimeout;
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  PayloadTooLargeError,
  S3Error,
  WorkerError,
};
