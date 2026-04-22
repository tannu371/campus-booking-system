const jwt = require('jsonwebtoken');
const RevokedToken = require('../models/RevokedToken');

const extractTokenMeta = (token) => {
  const decoded = jwt.decode(token);
  if (!decoded?.jti || !decoded?.exp) {
    return null;
  }

  const tokenType = decoded.type === 'refresh' ? 'refresh' : 'access';
  return {
    jti: decoded.jti,
    type: tokenType,
    expiresAt: new Date(decoded.exp * 1000)
  };
};

const revokeToken = async ({ jti, type, expiresAt }) => {
  if (!jti || !expiresAt) return;
  await RevokedToken.updateOne(
    { jti },
    { $setOnInsert: { jti, type, expiresAt } },
    { upsert: true }
  );
};

const revokeTokenString = async (token) => {
  const meta = extractTokenMeta(token);
  if (!meta) return;
  await revokeToken(meta);
};

const isRevoked = async (jti) => {
  if (!jti) return false;
  const revoked = await RevokedToken.exists({ jti });
  return Boolean(revoked);
};

module.exports = {
  extractTokenMeta,
  revokeToken,
  revokeTokenString,
  isRevoked
};
