const { PDFName, PDFDict } = require("pdf-lib");

const KNOWN_ACTION_KEYS = ["K", "F", "V", "C", "E", "X", "D", "U", "Fo", "Bl"];

function createEmptyActions() {
  const actions = {};
  for (const key of KNOWN_ACTION_KEYS) {
    actions[key] = [];
  }
  actions.A = [];
  actions._unknown = [];
  return actions;
}

function resolveLookup(obj, context) {
  if (!obj) return null;
  if (obj instanceof PDFDict) return obj;
  if (context) {
    try {
      return context.lookup(obj);
    } catch {
      return null;
    }
  }
  return null;
}

module.exports = { KNOWN_ACTION_KEYS, createEmptyActions, resolveLookup };
