require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const WorkerPool = require("./workers/WorkerPool");

const requestLogger = require("./middleware/requestLogger");
const asyncHandler = require("./middleware/asyncHandler");
const errorHandler = require("./middleware/errorHandler");
const { S3Error, NotFoundError } = require("./middleware/errorClasses");
const {
  validateUpload,
  validateFileKey,
  validateExtractBody,
} = require("./middleware/validators");
const { fillPdf } = require("./utils/pdf/pdfFiller");

const PORT = process.env.PORT || 5000;
const BUCKET = process.env.S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION || "ap-south-1";

if (!BUCKET) {
  console.error("FATAL: S3_BUCKET_NAME is not set in .env");
  process.exit(1);
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
    exposedHeaders: ["X-Request-Id"],
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(requestLogger);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

const POOL_SIZE = 2;

const fieldPool = new WorkerPool(
  path.join(__dirname, "workers", "fieldExtractWorker.js"),
  POOL_SIZE,
);

const jsPool = new WorkerPool(
  path.join(__dirname, "workers", "jsExtractWorker.js"),
  POOL_SIZE,
);

const cleanPool = new WorkerPool(
  path.join(__dirname, "workers", "pdfCleanWorker.js"),
  POOL_SIZE,
);

app.post(
  "/api/upload",
  upload.single("pdf"),
  validateUpload,
  asyncHandler(async (req, res) => {
    const file = req.file;
    const fileKey = `pdfs/${uuidv4()}-${file.originalname}`;

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: fileKey,
          Body: file.buffer,
          ContentType: "application/pdf",
          ServerSideEncryption: "AES256",
        }),
      );
    } catch (err) {
      throw new S3Error(`Failed to upload "${file.originalname}" to S3`, err);
    }

    let presignedUrl;
    try {
      presignedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: fileKey }),
        { expiresIn: 3600 },
      );
    } catch (err) {
      throw new S3Error("Failed to generate presigned URL after upload", err);
    }

    console.log(`Uploaded "${file.originalname}" → s3://${BUCKET}/${fileKey}`);

    res.json({
      success: true,
      file: {
        key: fileKey,
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        uploadedAt: new Date().toISOString(),
        presignedUrl,
      },
    });
  }),
);

app.get(
  /^\/api\/pdf\/(.+)/,
  validateFileKey,
  asyncHandler(async (req, res) => {
    const fileKey = req.params[0];

    let presignedUrl;
    try {
      presignedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: fileKey }),
        { expiresIn: 3600 },
      );
    } catch (err) {
      throw new S3Error("Failed to generate download URL", err);
    }

    res.json({ presignedUrl });
  }),
);

app.delete(
  /^\/api\/pdf\/(.+)/,
  validateFileKey,
  asyncHandler(async (req, res) => {
    const fileKey = req.params[0];

    try {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fileKey }));
    } catch (err) {
      throw new S3Error("Failed to delete file from S3", err);
    }

    console.log(`Deleted s3://${BUCKET}/${fileKey}`);
    res.json({ success: true, message: "File deleted" });
  }),
);

app.post(
  "/api/extract",
  express.raw({ type: "application/octet-stream", limit: "10mb" }),
  validateExtractBody,
  asyncHandler(async (req, res) => {
    const pdfBuffer = req.body;
    const sizeKB = (pdfBuffer.length / 1024).toFixed(1);
    console.log(
      `Extracting from uploaded buffer (${sizeKB} KB) using 3 parallel workers`,
    );

    const taskData = { pdfBuffer };

    const [fieldResult, jsResult, cleanResult] = await Promise.all([
      fieldPool.runTask(taskData),
      jsPool.runTask(taskData),
      cleanPool.runTask(taskData),
    ]);

    console.log(`Extracted ${fieldResult.fields.length} fields`);

    res.json({
      success: true,
      fields: fieldResult.fields,
      documentJS: jsResult.documentJS,
      cleanedPdfBase64: cleanResult.cleanedPdfBase64,
    });
  }),
);

app.post(
  "/api/fill-pdf",
  asyncHandler(async (req, res) => {
    const { pdfBuffer, fieldValues, signatureFields } = req.body;

    if (!pdfBuffer || typeof pdfBuffer !== "string") {
      return res.status(400).json({
        error: "Missing or invalid pdfBuffer (expected base64 string)",
      });
    }
    if (!fieldValues || typeof fieldValues !== "object") {
      return res.status(400).json({ error: "Missing or invalid fieldValues" });
    }

    const rawBuffer = Buffer.from(pdfBuffer, "base64");
    const sizeKB = (rawBuffer.length / 1024).toFixed(1);
    const sigCount = Array.isArray(signatureFields)
      ? signatureFields.length
      : 0;
    console.log(
      `Filling PDF (${sizeKB} KB) with ${Object.keys(fieldValues).length} field values and ${sigCount} signature(s)`,
    );

    const filledBuffer = await fillPdf(
      rawBuffer,
      fieldValues,
      Array.isArray(signatureFields) ? signatureFields : [],
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": filledBuffer.length,
      "Content-Disposition": 'attachment; filename="filled.pdf"',
    });
    res.send(filledBuffer);
  }),
);

app.all("/api/{*path}", (req, _res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`S3 Bucket: ${BUCKET} | Region: ${REGION}`);
});

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully…`);

  server.close(() => {
    console.log("HTTP server closed");
  });

  try {
    await Promise.all([
      fieldPool.shutdown(),
      jsPool.shutdown(),
      cleanPool.shutdown(),
    ]);
    console.log("Worker pools terminated");
  } catch (err) {
    console.error("Error shutting down worker pools:", err);
  }

  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});
