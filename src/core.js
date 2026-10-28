const crypto = require('crypto');

/**
 * Strict schema validation for deterministic execution attestation.
 */
function validateStatutoryAudit(payload) {
  if (!payload.targetEntity || typeof payload.targetEntity !== 'string') {
    throw new Error('Invalid targetEntity');
  }
  if (!payload.cfrCitation || typeof payload.cfrCitation !== 'string') {
    throw new Error('Invalid cfrCitation');
  }
  if (typeof payload.proceduralViolationDetected !== 'boolean') {
    throw new Error('Invalid proceduralViolationDetected');
  }
  if (!payload.evidenceDomHash || payload.evidenceDomHash.length !== 64) {
    throw new Error('Invalid evidenceDomHash');
  }
  if (!payload.timestampUtc || typeof payload.timestampUtc !== 'string') {
    throw new Error('Invalid timestampUtc');
  }
  return true;
}

/**
 * Generates an immutable, cryptographically signed artifact proving exact DOM state at extraction.
 */
function generateVerifiedArtifact(rawDomSnapshot, extractedData, privateKeyPem) {
  const evidenceDomHash = crypto.createHash('sha256').update(rawDomSnapshot, 'utf-8').digest('hex');
  const timestampUtc = new Date().toISOString();

  const payload = {
    ...extractedData,
    evidenceDomHash,
    timestampUtc,
  };

  validateStatutoryAudit(payload);

  // Cryptographic signature proving exact runtime state at extraction
  const sign = crypto.createSign('SHA256');
  sign.update(JSON.stringify(payload));
  sign.end();
  const attestationSignature = sign.sign(privateKeyPem, 'hex');

  // Derive public key fingerprint
  const privKeyObj = crypto.createPrivateKey(privateKeyPem);
  const pubKeyObj = crypto.createPublicKey(privKeyObj);
  const pubKeyDer = pubKeyObj.export({ type: 'spki', format: 'der' });
  const publicKeyFingerprint = crypto.createHash('sha256').update(pubKeyDer).digest('hex');

  return {
    ...payload,
    attestationSignature,
    publicKeyFingerprint,
  };
}

/**
 * Verifies the cryptographic integrity of an artifact against a public key.
 */
function verifyArtifactSignature(artifact, publicKeyPem) {
  const { attestationSignature, publicKeyFingerprint, ...payload } = artifact;

  validateStatutoryAudit(payload);

  const verify = crypto.createVerify('SHA256');
  verify.update(JSON.stringify(payload));
  verify.end();

  return verify.verify(publicKeyPem, attestationSignature, 'hex');
}

module.exports = {
  generateVerifiedArtifact,
  verifyArtifactSignature,
  validateStatutoryAudit,
};
