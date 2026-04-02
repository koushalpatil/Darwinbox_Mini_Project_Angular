/**
 * Wraps an async route handler so that rejected promises are
 * automatically forwarded to Express's `next(err)` instead of
 * requiring manual try/catch in every route.
 *
 * Usage:
 *   app.get("/route", asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
