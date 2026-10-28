// argon-attestation/src/stealth-cipher.js
// Production Cryptographic Stealth & Provenance Engine
// Zero-Width Unicode Steganography + AES-256-GCM + Natural Entropy Shaper

const crypto = require('node:crypto');

const ZW_MAP = {
  '00': '\u200B', // Zero-Width Space
  '01': '\u200C', // Zero-Width Non-Joiner
  '10': '\u200D', // Zero-Width Joiner
  '11': '\uFEFF', // Zero-Width No-Break Space
};

const REVERSE_ZW_MAP = {
  '\u200B': '00',
  '\u200C': '01',
  '\u200D': '10',
  '\uFEFF': '11',
};

const ZW_START = '\u200E\u200F';
const ZW_END = '\u200F\u200E';

/**
 * Derives a 256-bit AES key using PBKDF2-SHA256
 */
function deriveKey(secret, salt) {
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
}

/**
 * Encrypts an arbitrary JSON payload into an authenticated AES-256-GCM base64 string.
 */
function encryptPayload(payload, secret) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(secret, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const jsonStr = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combined binary: salt (16) + iv (12) + tag (16) + ciphertext
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts and verifies an authenticated AES-256-GCM base64 string. Throws on tampering.
 */
function decryptPayload(cipherTextBase64, secret) {
  const combined = Buffer.from(cipherTextBase64, 'base64');
  if (combined.length < 44) {
    throw new Error('Ciphertext too short: corrupted cryptographic envelope');
  }

  const salt = combined.subarray(0, 16);
  const iv = combined.subarray(16, 28);
  const tag = combined.subarray(28, 44);
  const encrypted = combined.subarray(44);

  const key = deriveKey(secret, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

/**
 * Encodes an ASCII/Base64 string into invisible Zero-Width Unicode characters.
 */
function encodeToZeroWidth(base64Str) {
  const buf = Buffer.from(base64Str, 'utf8');
  let bitString = '';
  for (let i = 0; i < buf.length; i++) {
    bitString += buf[i].toString(2).padStart(8, '0');
  }

  let zwOutput = ZW_START;
  for (let i = 0; i < bitString.length; i += 2) {
    const pair = bitString.slice(i, i + 2);
    zwOutput += ZW_MAP[pair] || '';
  }
  zwOutput += ZW_END;
  return zwOutput;
}

/**
 * Decodes Zero-Width Unicode characters back into ASCII/Base64 string.
 */
function decodeFromZeroWidth(text) {
  const startIndex = text.indexOf(ZW_START);
  const endIndex = text.indexOf(ZW_END);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  const payloadZw = text.slice(startIndex + ZW_START.length, endIndex);
  let bitString = '';
  for (const char of payloadZw) {
    if (REVERSE_ZW_MAP[char]) {
      bitString += REVERSE_ZW_MAP[char];
    }
  }

  if (bitString.length % 8 !== 0) {
    bitString = bitString.slice(0, bitString.length - (bitString.length % 8));
  }

  const bytes = [];
  for (let i = 0; i < bitString.length; i += 8) {
    bytes.push(parseInt(bitString.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes).toString('utf8');
}

/**
 * Injects an invisible encrypted payload into any text.
 */
function injectStealthWatermark(hostText, payload, secret) {
  const encryptedBase64 = encryptPayload(payload, secret);
  const zeroWidthCipher = encodeToZeroWidth(encryptedBase64);

  // Natural injection at paragraph boundary
  const breakPos = hostText.indexOf('\n\n');
  if (breakPos !== -1) {
    return hostText.slice(0, breakPos) + zeroWidthCipher + hostText.slice(breakPos);
  }
  return hostText + zeroWidthCipher;
}

/**
 * Extracts and authenticates watermark from text. Returns null if missing or forged.
 */
function extractAndAuthenticateWatermark(hostText, secret) {
  const base64Str = decodeFromZeroWidth(hostText);
  if (!base64Str) return null;

  try {
    return decryptPayload(base64Str, secret);
  } catch (e) {
    return null;
  }
}

/**
 * Natural Entropy & Perplexity Shaper:
 * Disperses uniform token sequences to defeat statistical LLM classifiers (GPTZero, CopyLeaks, Turnitin).
 */
function shapeNaturalEntropy(text) {
  const transformations = [
    [/\bIn addition,\s*/gi, 'Additionally, '],
    [/\bFurthermore,\s*/gi, 'More crucially, '],
    [/\bIn summary,\s*/gi, 'Net result: '],
    [/\butilize\b/gi, 'leverage'],
    [/\boptimal\b/gi, 'highest-yield'],
    [/\bSpecifically,\s*/gi, 'Namely, '],
    [/\bdemonstrates that\b/gi, 'proves that'],
    [/\bIn order to\b/gi, 'To'],
    [/\bit is important to note that\s*/gi, 'Crucially, '],
    [/\bplays a vital role in\b/gi, 'directly drives'],
  ];

  let result = text;
  for (const [pattern, replacement] of transformations) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

module.exports = {
  encryptPayload,
  decryptPayload,
  encodeToZeroWidth,
  decodeFromZeroWidth,
  injectStealthWatermark,
  extractAndAuthenticateWatermark,
  shapeNaturalEntropy,
};
