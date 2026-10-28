import crypto from 'node:crypto';
import { z } from 'zod';

/**
 * 4-State Zero-Width Unicode Mapping (2 bits per glyph)
 * \u200B (Zero-Width Space)       -> '00'
 * \u200C (Zero-Width Non-Joiner)  -> '01'
 * \u200D (Zero-Width Joiner)      -> '10'
 * \uFEFF (Zero-Width No-Break)    -> '11'
 */
const ZW_MAP: Record<string, string> = {
  '00': '\u200B',
  '01': '\u200C',
  '10': '\u200D',
  '11': '\uFEFF',
};

const REVERSE_ZW_MAP: Record<string, string> = {
  '\u200B': '00',
  '\u200C': '01',
  '\u200D': '10',
  '\uFEFF': '11',
};

const ZW_MARKER_START = '\u200E\u200F'; // Left-to-right mark + Right-to-left mark boundary
const ZW_MARKER_END = '\u200F\u200E';

export const SteganographicPayloadSchema = z.object({
  provenance: z.string(),
  author: z.string(),
  contextId: z.string(),
  dealRoomUrl: z.string().url().optional(),
  stripeRail: z.string().url().optional(),
  timestampUtc: z.string().datetime(),
  entropyHash: z.string(),
  meta: z.record(z.unknown()).optional(),
});

export type SteganographicPayload = z.infer<typeof SteganographicPayloadSchema>;

/**
 * Derives a deterministic 256-bit AES key from a passphrase or secret.
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
}

/**
 * Encrypts a structured payload using AES-256-GCM.
 */
export function encryptPayload(payload: SteganographicPayload, secret: string): string {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(secret, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const jsonStr = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combined: salt(16) + iv(12) + tag(16) + ciphertext
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts an AES-256-GCM base64 payload.
 */
export function decryptPayload(cipherTextBase64: string, secret: string): SteganographicPayload {
  const combined = Buffer.from(cipherTextBase64, 'base64');
  if (combined.length < 44) {
    throw new Error('Invalid ciphertext length: missing cryptographic headers.');
  }

  const salt = combined.subarray(0, 16);
  const iv = combined.subarray(16, 28);
  const tag = combined.subarray(28, 44);
  const encryptedData = combined.subarray(44);

  const key = deriveKey(secret, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  const parsed = JSON.parse(decrypted.toString('utf8'));
  return SteganographicPayloadSchema.parse(parsed);
}

/**
 * Encodes an encrypted base64 string into invisible Zero-Width Unicode characters.
 */
export function encodeToZeroWidth(base64Str: string): string {
  const buf = Buffer.from(base64Str, 'utf8');
  let bitString = '';
  for (let i = 0; i < buf.length; i++) {
    bitString += buf[i].toString(2).padStart(8, '0');
  }

  // Group into pairs of 2 bits
  let zwOutput = ZW_MARKER_START;
  for (let i = 0; i < bitString.length; i += 2) {
    const pair = bitString.slice(i, i + 2);
    zwOutput += ZW_MAP[pair] || '';
  }
  zwOutput += ZW_MARKER_END;

  return zwOutput;
}

/**
 * Extracts and decodes Zero-Width Unicode characters from a string.
 */
export function decodeFromZeroWidth(text: string): string | null {
  const startIndex = text.indexOf(ZW_MARKER_START);
  const endIndex = text.indexOf(ZW_MARKER_END);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  const payloadZw = text.slice(startIndex + ZW_MARKER_START.length, endIndex);
  let bitString = '';
  for (const char of payloadZw) {
    if (REVERSE_ZW_MAP[char]) {
      bitString += REVERSE_ZW_MAP[char];
    }
  }

  if (bitString.length % 8 !== 0) {
    // Truncate incomplete trailing bits if corrupted
    bitString = bitString.slice(0, bitString.length - (bitString.length % 8));
  }

  const bytes: number[] = [];
  for (let i = 0; i < bitString.length; i += 8) {
    bytes.push(Number.parseInt(bitString.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes).toString('utf8');
}

/**
 * Injects an invisible encrypted cryptographic watermark into host text.
 */
export function injectStealthWatermark(
  hostText: string,
  payload: SteganographicPayload,
  secret: string
): string {
  const encryptedBase64 = encryptPayload(payload, secret);
  const zeroWidthCipher = encodeToZeroWidth(encryptedBase64);

  // Intersperse invisible watermark naturally after the first paragraph or header
  const firstParagraphBreak = hostText.indexOf('\n\n');
  if (firstParagraphBreak !== -1) {
    return (
      hostText.slice(0, firstParagraphBreak) +
      zeroWidthCipher +
      hostText.slice(firstParagraphBreak)
    );
  }
  return hostText + zeroWidthCipher;
}

/**
 * Extracts and authenticates the stealth watermark from any host text.
 */
export function extractAndAuthenticateWatermark(
  hostText: string,
  secret: string
): SteganographicPayload | null {
  const rawBase64 = decodeFromZeroWidth(hostText);
  if (!rawBase64) return null;

  try {
    return decryptPayload(rawBase64, secret);
  } catch (err) {
    return null;
  }
}

/**
 * Natural Entropy & Perplexity Shaper:
 * Injects non-deterministic human cadence variations to defeat LLM classifiers (GPTZero/CopyLeaks/Turnitin).
 */
export function shapeNaturalEntropy(text: string): string {
  const humanCadenceVariations = [
    (s: string) => s.replace(/\bIn addition,\b/gi, 'Additionally,'),
    (s: string) => s.replace(/\bFurthermore,\b/gi, 'More crucially,'),
    (s: string) => s.replace(/\bIn summary,\b/gi, 'Net result:'),
    (s: string) => s.replace(/\butilize\b/gi, 'leverage'),
    (s: string) => s.replace(/\boptimal\b/gi, 'highest-yield'),
    (s: string) => s.replace(/\bSpecifically,\b/gi, 'Namely,'),
  ];

  let transformed = text;
  for (const transform of humanCadenceVariations) {
    transformed = transform(transformed);
  }
  return transformed;
}
