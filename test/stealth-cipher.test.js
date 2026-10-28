// argon-attestation/test/stealth-cipher.test.js
const assert = require('node:assert');
const {
  encryptPayload,
  decryptPayload,
  encodeToZeroWidth,
  decodeFromZeroWidth,
  injectStealthWatermark,
  extractAndAuthenticateWatermark,
  shapeNaturalEntropy,
} = require('../src/stealth-cipher.js');

console.log('--- STARTING STEALTH CIPHER ENGINE INTEGRITY TESTS ---');

const MASTER_SECRET = 'GG_LOOP_SOVEREIGN_CTO_KEY_2026_PRODUCTION';

// 1. Encryption and Decryption Roundtrip
const samplePayload = {
  provenance: 'GG_LOOP_SOVEREIGN_CORE',
  author: 'Jayson Quindao',
  contextId: 'B2B_PARTNERSHIP_DEAL_008',
  dealRoomUrl: 'https://argonaut.ggloop.io/deal/enterprise-preview',
  stripeRail: 'https://buy.stripe.com/28EaEZgIc2rTan1gVG0Fi06',
  timestampUtc: new Date().toISOString(),
  entropyHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  statutoryProtection: 'PROPRIETARY_TRADE_SECRET',
};

const cipherText = encryptPayload(samplePayload, MASTER_SECRET);
assert(typeof cipherText === 'string', 'Ciphertext must be a base64 string');
assert(cipherText.length > 50, 'Ciphertext must have valid envelope');

const decrypted = decryptPayload(cipherText, MASTER_SECRET);
assert.deepStrictEqual(decrypted, samplePayload, 'Decrypted payload must match original exactly');
console.log('✓ PASS: AES-256-GCM authenticated encryption/decryption roundtrip succeeded.');

// 2. Tampering Detection
let tamperedBuffer = Buffer.from(cipherText, 'base64');
tamperedBuffer[tamperedBuffer.length - 1] ^= 0x01; // flip 1 bit
const tamperedCipherText = tamperedBuffer.toString('base64');

assert.throws(() => {
  decryptPayload(tamperedCipherText, MASTER_SECRET);
}, /Unsupported state or unable to authenticate data/, 'Tampered payload must trigger authentication failure');
console.log('✓ PASS: Cryptographic integrity verification strictly rejected tampered ciphertext.');

// 3. Zero-Width Unicode Encoding and Invisibility
const sampleAscii = 'ARGON_STEALTH_PAYLOAD_TOKEN_X99';
const zwEncoded = encodeToZeroWidth(sampleAscii);

// Verify that it only consists of zero-width glyphs + boundary markers
for (const char of zwEncoded) {
  const code = char.charCodeAt(0);
  assert([0x200b, 0x200c, 0x200d, 0xfeff, 0x200e, 0x200f].includes(code), `Unexpected visible char: ${code}`);
}
assert.strictEqual(decodeFromZeroWidth(zwEncoded), sampleAscii, 'Decoded zero-width must match ASCII');
console.log('✓ PASS: Zero-width steganographic encoding produces 100% invisible Unicode glyphs.');

// 4. Host Text Watermarking & Extraction
const hostDocument = `EXECUTIVE ARCHITECTURAL SUMMARY: HIGH-PERFORMANCE STREAMING PIPELINE

Our real-time distributed ingestion layer processes 500,000 events/second using deterministic Ring 3 user-space probes. Memory overhead is strictly bounded under 12MB with zero kernel driver dependencies.

System latency p99 is clocked at 1.4 milliseconds across all live nodes.`;

const watermarkedDoc = injectStealthWatermark(hostDocument, samplePayload, MASTER_SECRET);

// Verify document looks identical to text parsers
assert(watermarkedDoc.includes('EXECUTIVE ARCHITECTURAL SUMMARY'), 'Host document text must remain intact');
assert(watermarkedDoc.includes('1.4 milliseconds'), 'Host document trailing text must remain intact');

// Extract and verify
const extractedPayload = extractAndAuthenticateWatermark(watermarkedDoc, MASTER_SECRET);
assert.notStrictEqual(extractedPayload, null, 'Must extract watermark successfully');
assert.strictEqual(extractedPayload.author, 'Jayson Quindao');
assert.strictEqual(extractedPayload.contextId, 'B2B_PARTNERSHIP_DEAL_008');
assert.strictEqual(extractedPayload.stripeRail, 'https://buy.stripe.com/28EaEZgIc2rTan1gVG0Fi06');
console.log('✓ PASS: Host text watermarking, invisible injection, and extraction succeeded.');

// 5. Wrong Secret Fails Extraction
const badExtracted = extractAndAuthenticateWatermark(watermarkedDoc, 'WRONG_UNAUTHORIZED_SECRET');
assert.strictEqual(badExtracted, null, 'Extracting with incorrect secret must return null');
console.log('✓ PASS: Unauthorized secret extraction rejected safely without data leakage.');

// 6. Natural Entropy Shaper
const rawLLMText = 'In addition, we utilize optimal algorithms. Furthermore, it is important to note that this plays a vital role in operations.';
const humanShaped = shapeNaturalEntropy(rawLLMText);
assert(!humanShaped.includes('In addition,'), 'Should replace In addition');
assert(!humanShaped.includes('Furthermore,'), 'Should replace Furthermore');
assert(!humanShaped.includes('utilize'), 'Should replace utilize');
console.log('✓ PASS: Natural Entropy & Perplexity Shaper successfully eliminated detectable AI patterns.');

console.log('\n======================================================');
console.log('🔥 ALL 6 CRYPTOGRAPHIC INTEGRITY TESTS PASSED (EXIT 0)');
console.log('======================================================\n');
