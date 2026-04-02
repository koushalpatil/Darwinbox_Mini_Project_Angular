const { v4: uuidv4 } = require("uuid");

/**
 * Attach a unique request ID and log request lifecycle.
 *
 * - Inbound:  logs method + URL + requestId
 * - Outbound: logs statusCode + duration
 */
function requestLogger(req, res, next) {
  const id = uuidv4();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);

  const start = Date.now();

  console.log(`[${id}] → ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? "warn" : "log";
    console[level](
      `[${id}] ← ${res.statusCode} ${req.method} ${req.originalUrl} (${duration}ms)`,
    );
  });

  next();
}

module.exports = requestLogger;
