#!/usr/bin/env node
/* Generates the extension icons (PNG, no dependencies — hand-rolled encoder).
 *
 * Glyph: white ladybug (Pro's 🐞 identity — head, wing case with centre split
 * and spots) on a warm red rounded square, so the Pro add-on is visually
 * distinct from feedback-for-llm's indigo note-card icon.
 *
 * Usage: node tools/gen-icons.js
 */
const { deflateSync } = require("node:zlib");
const { writeFileSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");

const ACCENT = [220, 38, 38]; // #dc2626
const INK = [255, 255, 255];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(size, pixel) {
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const bg = [0xf4, 0xf5, 0xf7]; // flatten onto light grey
      const o = y * (1 + size * 3) + 1 + x * 3;
      raw[o] = Math.round(r * a + bg[0] * (1 - a));
      raw[o + 1] = Math.round(g * a + bg[1] * (1 - a));
      raw[o + 2] = Math.round(b * a + bg[2] * (1 - a));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function roundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x >= x1 || y < y0 || y >= y1) return false;
  const cx = Math.max(x0 + r, Math.min(x, x1 - r - 1));
  const cy = Math.max(y0 + r, Math.min(y, y1 - r - 1));
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r || (x >= x0 + r && x < x1 - r) || (y >= y0 + r && y < y1 - r);
}

/* Filled ellipse test — the ladybug's head and wing case. */
function ellipse(x, y, cx, cy, rx, ry) {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

function makeIcon(size) {
  const s = size / 96; // scale from the 96px design
  const rr = (v) => Math.round(v * s);
  return encodePNG(size, (x, y) => {
    // warm red rounded-square background
    if (!roundedRect(x, y, 0, 0, size - 1, size - 1, rr(20))) return [0, 0, 0, 0];
    let color = [...ACCENT, 1];
    // head
    if (ellipse(x, y, rr(48), rr(27), rr(9), rr(9))) color = [...INK, 1];
    // wing case (body)
    if (ellipse(x, y, rr(48), rr(57), rr(24), rr(20))) color = [...INK, 1];
    // centre split between the wings
    if (roundedRect(x, y, rr(45), rr(41), rr(51), rr(75), rr(2))) color = [...ACCENT, 1];
    // head-body join notch, so the head reads as separate
    if (roundedRect(x, y, rr(38), rr(35), rr(58), rr(38), rr(2))) color = [...ACCENT, 1];
    // spots on the wings
    if (ellipse(x, y, rr(37), rr(52), rr(5), rr(5))) color = [...ACCENT, 1];
    if (ellipse(x, y, rr(59), rr(52), rr(5), rr(5))) color = [...ACCENT, 1];
    if (ellipse(x, y, rr(43), rr(66), rr(4), rr(4))) color = [...ACCENT, 1];
    if (ellipse(x, y, rr(53), rr(66), rr(4), rr(4))) color = [...ACCENT, 1];
    return color;
  });
}

const outDir = join(__dirname, "..", "icons");
mkdirSync(outDir, { recursive: true });
for (const size of [48, 96]) {
  const file = join(outDir, `icon-${size}.png`);
  writeFileSync(file, makeIcon(size));
  console.log("wrote", file);
}
