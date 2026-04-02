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
const archiver = require("archiver");

const WorkerPool = require("./workers/WorkerPool");
const { fillPdfFields } = require("./utils/pdf/pdfFiller");

// ── Middleware ─────────────────────────────────────────────────────────
const requestLogger = require("./middleware/requestLogger");
const asyncHandler = require("./middleware/asyncHandler");
const errorHandler = require("./middleware/errorHandler");
const { S3Error, NotFoundError } = require("./middleware/errorClasses");
const {
  validateUpload,
  validateFileKey,
  validateExtractBody,
  validateFillBody,
  validateBulkFillBody,
} = require("./middleware/validators");

// ── Config ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const BUCKET = process.env.S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION || "ap-south-1";

if (!BUCKET) {
  console.error("FATAL: S3_BUCKET_NAME is not set in .env");
  process.exit(1);
}

// ── AWS S3 Client ─────────────────────────────────────────────────────
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ── Express App ───────────────────────────────────────────────────────
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

// ── Multer ────────────────────────────────────────────────────────────
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

// ── Worker Pools ──────────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════

// ── Upload PDF to S3 ──────────────────────────────────────────────────
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

// ── Get presigned URL for a PDF ───────────────────────────────────────
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

// ── Delete a PDF from S3 ─────────────────────────────────────────────
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

// ── Extract fields from PDF ───────────────────────────────────────────
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

// ── Fill a single PDF ─────────────────────────────────────────────────
app.post(
  "/api/pdf/fill",
  express.json({ limit: "15mb" }),
  validateFillBody,
  asyncHandler(async (req, res) => {
    const { pdfBase64, formData, fileName } = req.body;

    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const sizeKB = (pdfBuffer.length / 1024).toFixed(1);
    console.log(
      `Filling PDF (${sizeKB} KB) with ${Object.keys(formData).length} field values`,
    );

    const filledPdfBuffer = await fillPdfFields(pdfBuffer, formData);
    const downloadName = fileName || "filled-document.pdf";

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Content-Length": filledPdfBuffer.length,
    });

    res.send(filledPdfBuffer);
  }),
);

// ── Bulk-fill PDFs → ZIP ──────────────────────────────────────────────
app.post(
  "/api/pdf/bulk-fill",
  express.json({ limit: "50mb" }),
  validateBulkFillBody,
  asyncHandler(async (req, res) => {
    const { files } = req.body;

    console.log(`Bulk-fill: processing ${files.length} PDF(s)`);

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="filled-documents.zip"',
    });

    const archive = archiver("zip", { zlib: { level: 5 } });

    archive.on("error", (err) => {
      console.error("Archiver error:", err);
      if (!res.headersSent) {
        throw new S3Error("Failed to create ZIP archive");
      }
    });

    archive.pipe(res);

    const usedNames = new Set();
    for (let i = 0; i < files.length; i++) {
      const { pdfBase64, formData, fileName } = files[i];

      try {
        const pdfBuffer = Buffer.from(pdfBase64, "base64");
        const filledBuffer = await fillPdfFields(pdfBuffer, formData);

        let name = fileName || `document-${i + 1}.pdf`;
        if (usedNames.has(name)) {
          const ext = name.endsWith(".pdf") ? ".pdf" : "";
          const base = ext ? name.slice(0, -4) : name;
          name = `${base}-${i + 1}${ext}`;
        }
        usedNames.add(name);

        archive.append(filledBuffer, { name });
        console.log(
          `  ✓ Added "${name}" (${(filledBuffer.length / 1024).toFixed(1)} KB)`,
        );
      } catch (fillErr) {
        console.warn(`  ✗ Skipping file at index ${i}: ${fillErr.message}`);
      }
    }

    await archive.finalize();
    console.log("Bulk-fill: ZIP stream finalized");
  }),
);

// ── 404 catch-all for unknown API routes ──────────────────────────────
app.all("/api/{*path}", (req, _res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
});

// ── Centralised error handler (MUST be last) ──────────────────────────
app.use(errorHandler);

// ═══════════════════════════════════════════════════════════════════════
// SERVER + GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════════════

const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`S3 Bucket: ${BUCKET} | Region: ${REGION}`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────
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

// ── Process-level error safety nets ───────────────────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  // In production, you may want to exit and let a process manager restart
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  // Uncaught exceptions leave the process in an undefined state — exit
  process.exit(1);
});
