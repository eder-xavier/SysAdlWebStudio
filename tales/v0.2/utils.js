// helpers for v0.2 transformer

function sanitizeId(s) {
  return String(s).replace(/[^A-Za-z0-9_]/g, '_');
}

function qualify(name, pathParts) {
  if (!pathParts || pathParts.length === 0) return sanitizeId(name);
  return sanitizeId(name) + '__' + pathParts.map(p => sanitizeId(p)).join('_');
}

module.exports = { sanitizeId, qualify };
