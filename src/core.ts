import crypto from 'crypto';
import { z } from 'zod';

/**
 * Strict schema enforcement — zero hallucination tolerance.
 */
export const StatutoryAuditSchema = z.object({
  targetEntity: z.string().min(1),
  cfrCitation: z.string().min(1),
  proceduralViolationDetected: z.boolean(),
  evidenceDomHash: z.string().length(64),
  remediationPayload: z.string(),
  timestampUtc: z.string().datetime(),
});

export type StatutoryAudit = z.infer<typeof StatutoryAuditSchema>;

export type VerifiedArtifact = StatutoryAudit & {
  attestationSignature: string;
  publicKeyFingerprint: string;
};

/**
 * Generates an immutable, cryptographically signed artifact proving exact DOM state at extraction.
 */
export function generateVerifiedArtifact(
  rawDomSnapshot: string,
  extractedData: Omit<StatutoryAudit, 'evidenceDomHash' | 'timestampUtc'>,
  privateKeyPem: string
): VerifiedArtifact {
  const evidenceDomHash = crypto.createHash('sha256').update(rawDomSnapshot, 'utf-8').digest('hex');
  const timestampUtc = new Date().toISOString();

  const payload = StatutoryAuditSchema.parse({
    ...extractedData,
    evidenceDomHash,
    timestampUtc,
  });

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
export function verifyArtifactSignature(
  artifact: VerifiedArtifact,
  publicKeyPem: string
): boolean {
  const { attestationSignature, publicKeyFingerprint, ...payload } = artifact;

  // Validate schema
  StatutoryAuditSchema.parse(payload);

  const verify = crypto.createVerify('SHA256');
  verify.update(JSON.stringify(payload));
  verify.end();

  return verify.verify(publicKeyPem, attestationSignature, 'hex');
}
