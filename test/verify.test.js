const crypto = require('crypto');
const { generateVerifiedArtifact, verifyArtifactSignature } = require('../src/core.js');

function runTest() {
  console.log('--- Running Argon Attestation Verification Test ---');

  // Generate test RSA 2048 keypair
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const rawDom = '<html><body><div id="notice">DENIAL: Sanction imposed under rule 402</div></body></html>';
  const extractedData = {
    targetEntity: 'Texas HHSC - Workforce Solutions',
    cfrCitation: '7 CFR § 273.15',
    proceduralViolationDetected: true,
    remediationPayload: 'Immediate administrative fair hearing demand with Aid-Paid-Pending continuation.',
  };

  const artifact = generateVerifiedArtifact(rawDom, extractedData, privateKey);
  console.log('[SUCCESS] Artifact generated with signature:', artifact.attestationSignature.substring(0, 32) + '...');
  console.log('[SUCCESS] DOM SHA-256 Hash:', artifact.evidenceDomHash);

  const isValid = verifyArtifactSignature(artifact, publicKey);
  console.log('[TEST RESULT] Signature verification passes:', isValid);

  if (!isValid) {
    throw new Error('Signature verification failed!');
  }

  // Tamper test
  let tampered = { ...artifact, proceduralViolationDetected: false };
  let tamperedValid = false;
  try {
    tamperedValid = verifyArtifactSignature(tampered, publicKey);
  } catch (e) {
    tamperedValid = false;
  }
  console.log('[TAMPER TEST] Tampered artifact passes verification:', tamperedValid);
  if (tamperedValid) {
    throw new Error('Tampered artifact unexpectedly passed verification!');
  }

  console.log('[ALL TESTS PASSED] Argon Attestation Core is 100% verified.');
}

runTest();
