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
const { fillPdfFields } = require("./utils/pdf/pdfFiller");

const PORT = process.env.PORT || 5000;
const BUCKET = process.env.S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION || "ap-south-1";

if (!BUCKET) {
  console.error("S3_BUCKET_NAME is not set in .env");
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
  }),
);

app.use(express.json({ limit: "50mb" }));

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

app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file provided" });
    }

    const file = req.file;
    const fileKey = `pdfs/${uuidv4()}-${file.originalname}`;

    const putCommand = new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
      Body: file.buffer,
      ContentType: "application/pdf",
      ServerSideEncryption: "AES256",
    });

    await s3.send(putCommand);

    const getCommand = new GetObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
    });

    const presignedUrl = await getSignedUrl(s3, getCommand, {
      expiresIn: 3600,
    });

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
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to upload file to S3" });
  }
});

app.get(/^\/api\/pdf\/(.+)/, async (req, res) => {
  try {
    const fileKey = req.params[0];

    if (!fileKey) {
      return res.status(400).json({ error: "Missing S3 key" });
    }

    const getCommand = new GetObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
    });

    const presignedUrl = await getSignedUrl(s3, getCommand, {
      expiresIn: 3600,
    });

    res.json({ presignedUrl });
  } catch (err) {
    console.error("Presigned URL error:", err);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
});

app.delete(/^\/api\/pdf\/(.+)/, async (req, res) => {
  try {
    const fileKey = req.params[0];

    if (!fileKey) {
      return res.status(400).json({ error: "Missing S3 key" });
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
    });

    await s3.send(deleteCommand);

    console.log(`Deleted s3://${BUCKET}/${fileKey}`);

    res.json({ success: true, message: "File deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete file from S3" });
  }
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
  "/api/extract",
  express.raw({ type: "application/octet-stream", limit: "10mb" }),
  async (req, res) => {
    try {
      const pdfBuffer = req.body;

      if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
        return res
          .status(400)
          .json({ error: "Missing PDF binary in request body" });
      }

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
    } catch (err) {
      console.error("Extract error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to extract fields" });
    }
  },
);

app.post("/api/pdf/fill", express.json({ limit: "15mb" }), async (req, res) => {
  try {
    const { pdfBase64, formData, fileName } = req.body;

    if (!pdfBase64 || !formData) {
      return res
        .status(400)
        .json({ error: "Missing pdfBase64 or formData in request body" });
    }

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
  } catch (err) {
    console.error("PDF fill error:", err);
    res.status(500).json({ error: "Failed to fill PDF fields" });
  }
});

const archiver = require("archiver");

app.post(
  "/api/pdf/bulk-fill",
  express.json({ limit: "50mb" }),
  async (req, res) => {
    try {
      const { files } = req.body;

      if (!Array.isArray(files) || files.length === 0) {
        return res
          .status(400)
          .json({ error: '"files" must be a non-empty array' });
      }

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (!f.pdfBase64 || !f.formData) {
          return res.status(400).json({
            error: `File at index ${i} is missing required "pdfBase64" or "formData"`,
          });
        }
      }

      console.log(`Bulk-fill: processing ${files.length} PDF(s)`);

      res.set({
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="filled-documents.zip"',
      });

      const archive = archiver("zip", { zlib: { level: 5 } });

      archive.on("error", (err) => {
        console.error("Archiver error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to create ZIP archive" });
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
    } catch (err) {
      console.error("Bulk-fill error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process bulk download" });
      }
    }
  },
);

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large (max 10 MB)" });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err.message === "Only PDF files are allowed") {
    return res.status(400).json({ error: err.message });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`S3 Bucket: ${BUCKET} | Region: ${REGION}`);
});
