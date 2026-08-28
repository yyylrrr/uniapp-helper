const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = path.join(__dirname, '../src/static/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Helper to create a valid PNG file buffer from raw RGBA pixels
function createPng(width, height, rgbaBuffer) {
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const scanlines = [];
  for (let y = 0; y < height; y++) {
    scanlines.push(Buffer.from([0])); // filter type None
    const row = rgbaBuffer.subarray(y * width * 4, (y + 1) * width * 4);
    scanlines.push(row);
  }
  const idatRaw = Buffer.concat(scanlines);
  const idatCompressed = zlib.deflateSync(idatRaw);
  const idatChunk = makeChunk('IDAT', idatCompressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// 2. Generate Pin PNG with smooth anti-aliased gradient
function generatePinPng(mainColor, innerColor, filename) {
  const width = 64;
  const height = 80;
  const buf = Buffer.alloc(width * height * 4);

  const cx = width / 2;
  const cy = 26;
  const r = 22;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      // Check pin shape
      let inShape = false;
      let alpha = 0;

      if (dist <= r) {
        inShape = true;
        alpha = Math.min(1, Math.max(0, r - dist + 0.5));
      } else if (y >= cy && y <= 72) {
        // Triangle tapering down to (cx, 72)
        const t = (y - cy) / (72 - cy);
        const halfW = (1 - t) * r * 0.95;
        if (Math.abs(dx) <= halfW) {
          inShape = true;
          alpha = Math.min(1, Math.max(0, halfW - Math.abs(dx) + 0.5));
        }
      }

      if (inShape && alpha > 0) {
        // Shading
        const gradT = y / height;
        let [cr, cg, cb] = mainColor;
        cr = Math.round(cr * (1 - gradT * 0.25));
        cg = Math.round(cg * (1 - gradT * 0.25));
        cb = Math.round(cb * (1 - gradT * 0.25));

        // Inner white/accent circle
        const innerDist = Math.hypot(dx, dy);
        if (innerDist <= 9.5) {
          const innerAlpha = Math.min(1, Math.max(0, 9.5 - innerDist + 0.5));
          if (innerDist <= 4.5) {
            const dotAlpha = Math.min(1, Math.max(0, 4.5 - innerDist + 0.5));
            cr = Math.round(cr * (1 - dotAlpha) + innerColor[0] * dotAlpha);
            cg = Math.round(cg * (1 - dotAlpha) + innerColor[1] * dotAlpha);
            cb = Math.round(cb * (1 - dotAlpha) + innerColor[2] * dotAlpha);
          } else {
            cr = Math.round(cr * (1 - innerAlpha) + 255 * innerAlpha);
            cg = Math.round(cg * (1 - innerAlpha) + 255 * innerAlpha);
            cb = Math.round(cb * (1 - innerAlpha) + 255 * innerAlpha);
          }
        }

        buf[idx] = cr;
        buf[idx + 1] = cg;
        buf[idx + 2] = cb;
        buf[idx + 3] = Math.round(alpha * 255);
      }
    }
  }

  const png = createPng(width, height, buf);
  fs.writeFileSync(path.join(outDir, filename), png);
  console.log('Created PNG:', filename);
}

// 3. Generate Star Badge PNG
function generateStarPng(filename) {
  const width = 64;
  const height = 64;
  const buf = Buffer.alloc(width * height * 4);
  const cx = 32;
  const cy = 32;
  const r = 28;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist <= r) {
        const alpha = Math.min(1, Math.max(0, r - dist + 0.5));
        // Golden Orange gradient
        const t = y / height;
        const cr = Math.round(245 * (1 - t * 0.1));
        const cg = Math.round(158 * (1 - t * 0.2));
        const cb = Math.round(11 * (1 - t * 0.2));

        buf[idx] = cr;
        buf[idx + 1] = cg;
        buf[idx + 2] = cb;
        buf[idx + 3] = Math.round(alpha * 255);

        // White border ring
        if (dist >= 24 && dist <= 26.5) {
          buf[idx] = 255;
          buf[idx + 1] = 255;
          buf[idx + 2] = 255;
        }
      }
    }
  }

  const png = createPng(width, height, buf);
  fs.writeFileSync(path.join(outDir, filename), png);
  console.log('Created PNG:', filename);
}

// Create PNG icons
generatePinPng([59, 130, 246], [29, 78, 216], 'pin-blue.png');
generatePinPng([239, 68, 68], [185, 28, 28], 'pin-red.png');
generatePinPng([16, 185, 129], [4, 120, 87], 'pin-green.png');
generatePinPng([139, 92, 246], [109, 40, 217], 'pin-purple.png');
generateStarPng('marker-star.png');

// 4. Create SVG icons
const svgs = {
  'landmark.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <defs>
    <linearGradient id="gLandmark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="22" fill="url(#gLandmark)"/>
  <circle cx="24" cy="24" r="20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.6"/>
  <path d="M24 10 L12 18 L36 18 Z" fill="#ffffff"/>
  <rect x="15" y="20" width="3" height="12" rx="1" fill="#ffffff"/>
  <rect x="22.5" y="20" width="3" height="12" rx="1" fill="#ffffff"/>
  <rect x="30" y="20" width="3" height="12" rx="1" fill="#ffffff"/>
  <rect x="11" y="32" width="26" height="3" rx="1.5" fill="#ffffff"/>
</svg>`,

  'camera.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <defs>
    <linearGradient id="gCam" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="22" fill="url(#gCam)"/>
  <circle cx="24" cy="24" r="20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.6"/>
  <path d="M14 19 C14 17.5 15.5 16 17 16 L20 16 L22 13 L26 13 L28 16 L31 16 C32.5 16 34 17.5 34 19 L34 31 C34 32.5 32.5 34 31 34 L17 34 C15.5 34 14 32.5 14 31 Z" fill="#ffffff"/>
  <circle cx="24" cy="25" r="5" fill="#1d4ed8"/>
  <circle cx="24" cy="25" r="3" fill="#ffffff"/>
</svg>`,

  'restaurant.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <defs>
    <linearGradient id="gRest" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#b91c1c"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="22" fill="url(#gRest)"/>
  <circle cx="24" cy="24" r="20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.6"/>
  <path d="M17 13 L17 22 C17 24 19 25 21 25 L21 34 L23 34 L23 13 M19 13 L19 20 M21 13 L21 20" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M29 13 C26 15 26 21 26 24 L26 34 L28 34 L28 13 Z" fill="#ffffff"/>
</svg>`,

  'metro.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <defs>
    <linearGradient id="gMetro" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="22" fill="url(#gMetro)"/>
  <circle cx="24" cy="24" r="20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.6"/>
  <path d="M15 14 L33 14 C35 14 36 15.5 36 17 L36 30 C36 32 34.5 33 33 33 L31 36 L29 33 L19 33 L17 36 L15 33 C13.5 33 12 32 12 30 L12 17 C12 15.5 13 14 15 14 Z" fill="#ffffff"/>
  <rect x="15" y="17" width="18" height="7" rx="1.5" fill="#047857"/>
  <circle cx="17" cy="28" r="2" fill="#047857"/>
  <circle cx="31" cy="28" r="2" fill="#047857"/>
</svg>`,

  'pin-gradient.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="36" height="48">
  <defs>
    <linearGradient id="gPinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <path d="M18 2 C9.16 2 2 9.16 2 18 C2 29 18 46 18 46 C18 46 34 29 34 18 C34 9.16 26.84 2 18 2 Z" fill="url(#gPinGrad)"/>
  <circle cx="18" cy="18" r="7" fill="#ffffff"/>
  <circle cx="18" cy="18" r="4" fill="#6366f1"/>
</svg>`,

  'hotel.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <defs>
    <linearGradient id="gHotel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#be185d"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="22" fill="url(#gHotel)"/>
  <circle cx="24" cy="24" r="20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.6"/>
  <path d="M13 32 L13 20 L35 20 L35 32 M13 27 L35 27 M13 34 L13 30 M35 34 L35 30" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="19" cy="16" r="2.5" fill="#ffffff"/>
  <path d="M23 18 L33 18" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
</svg>`
};

for (const [filename, content] of Object.entries(svgs)) {
  fs.writeFileSync(path.join(outDir, filename), content.trim());
  console.log('Created SVG:', filename);
}
