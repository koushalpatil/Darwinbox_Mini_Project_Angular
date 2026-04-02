const {
  KNOWN_ACTION_KEYS,
  createEmptyActions,
  resolveLookup,
} = require("./helpers");
const { extractJSFromAction, extractAllJSActions } = require("./extractors");
const {
  extractDocumentLevelJS,
  extractPageLevelJS,
  extractOpenActionJS,
  extractCalculationOrderJS,
} = require("./documentExtractors");
const { scanDictForJS, mergeJSActions } = require("./mergeUtils");
const { extractAllDocumentJS } = require("./masterExtractor");

module.exports = {
  KNOWN_ACTION_KEYS,
  createEmptyActions,
  resolveLookup,
  extractJSFromAction,
  extractAllJSActions,
  extractDocumentLevelJS,
  extractPageLevelJS,
  extractOpenActionJS,
  extractCalculationOrderJS,
  scanDictForJS,
  mergeJSActions,
  extractAllDocumentJS,
};
