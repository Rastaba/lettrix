/**
 * GIF89a encoder — zero dependencies.
 * Supports animated GIFs with per-frame delay.
 * Adaptive palette (median-cut) + ordered dithering for quality.
 */

const PALETTE_SIZE = 256;
const MIN_CODE_SIZE = 8;

// ── Bayer 4×4 dithering matrix (values 0–15, normalized to ±0.5) ──
const BAYER4 = [
  [ 0, 8, 2,10],
  [12, 4,14, 6],
  [ 3,11, 1, 9],
  [15, 7,13, 5],
];
const DITHER_STRENGTH = 10; // subtle dithering to reduce banding without noise

// ── Median-cut palette builder ──

interface ColorBox {
  colors: Uint32Array; // packed RGB values
  count: number;
}

/** Build an adaptive 256-color palette from one or more frames using median cut */
export function buildAdaptivePalette(...images: ImageData[]): Uint8Array {
  // Merge pixel data from all sample frames
  const totalPixels = images.reduce((s, img) => s + img.data.length / 4, 0);

  // Reduce to 15-bit color space and count popularity across all frames
  const hist = new Map<number, number>();
  for (const imageData of images) {
    const data = imageData.data;
    const pixelCount = data.length / 4;
    for (let i = 0; i < pixelCount; i++) {
      const off = i * 4;
      const r5 = data[off] >> 3;
      const g5 = data[off + 1] >> 3;
      const b5 = data[off + 2] >> 3;
      const key = (r5 << 10) | (g5 << 5) | b5;
      hist.set(key, (hist.get(key) ?? 0) + 1);
    }
  }

  // Convert to array of unique colors (restored to 8-bit)
  const uniqueColors: { r: number; g: number; b: number; count: number }[] = [];
  for (const [key, count] of hist) {
    const r5 = (key >> 10) & 31;
    const g5 = (key >> 5) & 31;
    const b5 = key & 31;
    uniqueColors.push({
      r: (r5 << 3) | (r5 >> 2),
      g: (g5 << 3) | (g5 >> 2),
      b: (b5 << 3) | (b5 >> 2),
      count,
    });
  }

  // Median cut: recursively split color boxes
  const boxes: { colors: typeof uniqueColors }[] = [{ colors: uniqueColors }];

  while (boxes.length < PALETTE_SIZE && boxes.length > 0) {
    // Find the box with the largest range to split
    let bestIdx = 0;
    let bestRange = -1;

    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].colors.length <= 1) continue;
      const c = boxes[i].colors;
      let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
      for (const px of c) {
        if (px.r < rMin) rMin = px.r; if (px.r > rMax) rMax = px.r;
        if (px.g < gMin) gMin = px.g; if (px.g > gMax) gMax = px.g;
        if (px.b < bMin) bMin = px.b; if (px.b > bMax) bMax = px.b;
      }
      const range = Math.max(rMax - rMin, gMax - gMin, bMax - bMin);
      if (range > bestRange) { bestRange = range; bestIdx = i; }
    }

    if (bestRange <= 0) break;

    const box = boxes[bestIdx];
    const c = box.colors;
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    for (const px of c) {
      if (px.r < rMin) rMin = px.r; if (px.r > rMax) rMax = px.r;
      if (px.g < gMin) gMin = px.g; if (px.g > gMax) gMax = px.g;
      if (px.b < bMin) bMin = px.b; if (px.b > bMax) bMax = px.b;
    }
    const rRange = rMax - rMin, gRange = gMax - gMin, bRange = bMax - bMin;
    const axis = rRange >= gRange && rRange >= bRange ? 'r' : gRange >= bRange ? 'g' : 'b';

    c.sort((a, b) => a[axis] - b[axis]);
    const mid = Math.floor(c.length / 2);
    boxes.splice(bestIdx, 1, { colors: c.slice(0, mid) }, { colors: c.slice(mid) });
  }

  // Average each box to get palette colors
  const pal = new Uint8Array(PALETTE_SIZE * 3);
  for (let i = 0; i < PALETTE_SIZE; i++) {
    if (i < boxes.length && boxes[i].colors.length > 0) {
      const c = boxes[i].colors;
      let rSum = 0, gSum = 0, bSum = 0, total = 0;
      for (const px of c) {
        rSum += px.r * px.count;
        gSum += px.g * px.count;
        bSum += px.b * px.count;
        total += px.count;
      }
      pal[i * 3] = Math.round(rSum / total);
      pal[i * 3 + 1] = Math.round(gSum / total);
      pal[i * 3 + 2] = Math.round(bSum / total);
    }
  }
  return pal;
}

// ── Fast nearest-color lookup with cache ──

function createQuantizer(palette: Uint8Array) {
  const cache = new Map<number, number>();

  return function quantize(r: number, g: number, b: number, x: number, y: number): number {
    // Apply Bayer dithering offset
    const bayerVal = BAYER4[y & 3][x & 3]; // 0–15
    const offset = ((bayerVal / 15) - 0.5) * DITHER_STRENGTH;
    const rd = Math.max(0, Math.min(255, Math.round(r + offset)));
    const gd = Math.max(0, Math.min(255, Math.round(g + offset)));
    const bd = Math.max(0, Math.min(255, Math.round(b + offset)));

    // Cache key: reduce to 15-bit
    const key = ((rd >> 3) << 10) | ((gd >> 3) << 5) | (bd >> 3);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    // Find nearest palette color
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < PALETTE_SIZE; i++) {
      const pr = palette[i * 3], pg = palette[i * 3 + 1], pb = palette[i * 3 + 2];
      const d = (rd - pr) ** 2 + (gd - pg) ** 2 + (bd - pb) ** 2;
      if (d < bestDist) { best = i; bestDist = d; if (d === 0) break; }
    }
    cache.set(key, best);
    return best;
  };
}

/** Indexed frame from ImageData */
function quantizeImage(data: Uint8ClampedArray, width: number, height: number, quantize: ReturnType<typeof createQuantizer>): Uint8Array {
  const len = width * height;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const off = i * 4;
    const x = i % width;
    const y = (i / width) | 0;
    out[i] = quantize(data[off], data[off + 1], data[off + 2], x, y);
  }
  return out;
}

/** LZW encoder for GIF */
function lzwEncode(pixels: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const maxTableSize = 4096;

  const buf: number[] = [];
  let curByte = 0;
  let curBit = 0;

  function emit(code: number) {
    curByte |= (code << curBit);
    curBit += codeSize;
    while (curBit >= 8) {
      buf.push(curByte & 0xff);
      curByte >>= 8;
      curBit -= 8;
    }
  }

  const table = new Map<number, number>();

  function resetTable() {
    table.clear();
    for (let i = 0; i < clearCode; i++) table.set(i, i);
    nextCode = eoiCode + 1;
    codeSize = minCodeSize + 1;
  }

  emit(clearCode);
  resetTable();

  let prefix = pixels[0];
  for (let i = 1; i < pixels.length; i++) {
    const suffix = pixels[i];
    const key = (prefix << 12) | suffix;
    if (table.has(key)) {
      prefix = table.get(key)!;
    } else {
      emit(prefix);
      if (nextCode < maxTableSize) {
        table.set(key, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        emit(clearCode);
        resetTable();
      }
      prefix = suffix;
    }
  }
  emit(prefix);
  emit(eoiCode);

  if (curBit > 0) buf.push(curByte & 0xff);

  // Pack into sub-blocks
  const subBlocks: number[] = [];
  let pos = 0;
  while (pos < buf.length) {
    const chunkLen = Math.min(255, buf.length - pos);
    subBlocks.push(chunkLen);
    for (let j = 0; j < chunkLen; j++) subBlocks.push(buf[pos++]);
  }
  subBlocks.push(0);
  return new Uint8Array(subBlocks);
}

export interface GifFrame {
  /** Delay in centiseconds (1/100s). e.g. 150 = 1.5s */
  delay: number;
  imageData: ImageData;
}

/**
 * Encode an animated GIF from canvas frames.
 * Uses adaptive palette from first frame + ordered dithering.
 */
export function encodeGif(width: number, height: number, frames: GifFrame[]): Blob {
  if (frames.length === 0) return new Blob([], { type: 'image/gif' });

  // Build adaptive palette from multiple frames for best color coverage
  const sampleFrames = [
    frames[0].imageData,
    frames[Math.floor(frames.length / 2)]?.imageData,
    frames[Math.max(0, frames.length - 2)]?.imageData,
  ].filter(Boolean) as ImageData[];
  const palette = buildAdaptivePalette(...sampleFrames);
  const quantize = createQuantizer(palette);

  const parts: Uint8Array[] = [];

  function writeBytes(...bytes: number[]) { parts.push(new Uint8Array(bytes)); }
  function writeString(s: string) {
    const a = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    parts.push(a);
  }
  function writeU16(v: number) { writeBytes(v & 0xff, (v >> 8) & 0xff); }

  // Header
  writeString('GIF89a');

  // Logical Screen Descriptor
  writeU16(width);
  writeU16(height);
  writeBytes(0xf7, 0x00, 0x00); // GCT flag, 256 colors

  // Global Color Table
  parts.push(palette);

  // NETSCAPE2.0 looping extension
  writeBytes(0x21, 0xff, 0x0b);
  writeString('NETSCAPE2.0');
  writeBytes(0x03, 0x01);
  writeU16(0); // loop forever
  writeBytes(0x00);

  // Frames
  for (const frame of frames) {
    const indexed = quantizeImage(frame.imageData.data, width, height, quantize);

    // Graphic Control Extension
    writeBytes(
      0x21, 0xf9, 0x04,
      0x04, // disposal=1, no transparency
      frame.delay & 0xff, (frame.delay >> 8) & 0xff,
      0x00, 0x00,
    );

    // Image Descriptor
    writeBytes(0x2c);
    writeU16(0); writeU16(0);
    writeU16(width); writeU16(height);
    writeBytes(0x00);

    // Image Data
    writeBytes(MIN_CODE_SIZE);
    parts.push(lzwEncode(indexed, MIN_CODE_SIZE));
  }

  // Trailer
  writeBytes(0x3b);

  return new Blob(parts as BlobPart[], { type: 'image/gif' });
}
