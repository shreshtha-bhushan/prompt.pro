const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// CRC32 implementation for PNG chunks
const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  table[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcInput = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(crcInput) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Check if a point (x, y) is inside the rounded rectangle of size W x H with radius R
function isInsideRoundedRect(px, py, W, H, R) {
  const cx = Math.abs(px - W / 2) - (W / 2 - R);
  const cy = Math.abs(py - H / 2) - (H / 2 - R);
  if (cx <= 0 && cy <= 0) return true;
  if (cx > 0 && cy > 0) {
    return Math.sqrt(cx * cx + cy * cy) <= R;
  }
  return (cx <= 0 && cy <= R) || (cy <= 0 && cx <= R);
}

// Check if a point (px, py) is inside the sparkle star centered at (W/2, H/2)
function isInsideSparkle(px, py, W, H) {
  // Sparkle tips extend to 37.5% of W from center (matching icon.svg: 16 +- 12 out of 32)
  const radius = W * 0.375;
  const dx = Math.abs(px - W / 2) / radius;
  const dy = Math.abs(py - H / 2) / radius;
  if (dx >= 1.0 || dy >= 1.0) return false;
  // Astroid curve matching icon.svg cubic Bezier path
  return Math.pow(dx, 0.52) + Math.pow(dy, 0.52) <= 1.0;
}

function createPNG(size) {
  const width = size;
  const height = size;
  const scanlineLen = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineLen);

  const R = width * 0.25; // rx="8" for size 32 -> 25% corner radius
  const SUB = 8; // 8x8 = 64 subpixels per pixel for professional smooth anti-aliasing

  for (let y = 0; y < height; y++) {
    rawData[y * scanlineLen] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const idx = y * scanlineLen + 1 + x * 4;

      let bgCount = 0;
      let sparkleCount = 0;

      for (let sy = 0; sy < SUB; sy++) {
        for (let sx = 0; sx < SUB; sx++) {
          const px = x + (sx + 0.5) / SUB;
          const py = y + (sy + 0.5) / SUB;

          if (isInsideRoundedRect(px, py, width, height, R)) {
            bgCount++;
            if (isInsideSparkle(px, py, width, height)) {
              sparkleCount++;
            }
          }
        }
      }

      const totalSamples = SUB * SUB;
      const alpha = bgCount / totalSamples;

      if (alpha === 0) {
        rawData[idx] = 0;
        rawData[idx + 1] = 0;
        rawData[idx + 2] = 0;
        rawData[idx + 3] = 0;
      } else {
        // Background color #0A0A0A (10, 10, 10), Sparkle color #FFFFFF (255, 255, 255)
        const sparkleRatio = sparkleCount / bgCount;
        const r = Math.round(10 * (1 - sparkleRatio) + 255 * sparkleRatio);
        const g = Math.round(10 * (1 - sparkleRatio) + 255 * sparkleRatio);
        const b = Math.round(10 * (1 - sparkleRatio) + 255 * sparkleRatio);
        const a = Math.round(alpha * 255);

        rawData[idx] = r;
        rawData[idx + 1] = g;
        rawData[idx + 2] = b;
        rawData[idx + 3] = a;
      }
    }
  }

  const idatData = zlib.deflateSync(rawData);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type RGBA
  ihdr[10] = 0; // Compression method
  ihdr[11] = 0; // Filter method
  ihdr[12] = 0; // Interlace method

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

[16, 32, 48, 128].forEach(size => {
  const pngBuf = createPNG(size);
  const outPath = path.join(__dirname, `icon${size}.png`);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`Generated professional smooth icon: ${outPath}`);
});
