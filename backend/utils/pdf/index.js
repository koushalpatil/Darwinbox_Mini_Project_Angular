const {
  extractFormatFromJS,
  classifyTextField,
  extractFieldJSActions,
} = require("./fieldClassifier");
const {
  extractFieldsFromDocument,
  buildAnnotPageMap,
} = require("./fieldExtractor");
const { createCleanedPdf } = require("./pdfCleaner");

module.exports = {
  extractFormatFromJS,
  classifyTextField,
  extractFieldJSActions,
  extractFieldsFromDocument,
  buildAnnotPageMap,
  createCleanedPdf,
};
