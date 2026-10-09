// Node-only artwork for the downloadable templates: QR matrix (via the qrcode.react library the
// app already uses) and a tiny PNG writer so Word can embed the QR and signature as images.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import zlib from "node:zlib";
import { signatureSegments, SIG_W, SIG_H } from "../../src/marketing/sampleArt.js";

export { signatureSegments, SIG_W, SIG_H };

// ---------- QR ----------
/** Returns { size, dark: boolean[][] } for the given text (error correction level M). */
export function qrMatrix(strText) {
  const svg = renderToStaticMarkup(createElement(QRCodeSVG, { value: strText, size: 100, level: "M", marginSize: 0 }));
  const size = Number((svg.match(/viewBox="0 0 (\d+) \d+"/) || [])[1]);
  const dark = Array.from({ length: size }, () => new Array(size).fill(false));
  for (const m of svg.matchAll(/M(\d+)[ ,](\d+)\s?h(\d+)v1/g)) {
    const x = Number(m[1]), y = Number(m[2]), w = Number(m[3]);
    for (let i = 0; i < w; i++) dark[y][x + i] = true;
  }
  return { size, dark };
}

// ---------- PNG (for Word) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(strType, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(strType, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** rgba: Uint8Array length w*h*4. Returns a PNG Buffer. */
function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** QR as a crisp PNG (white background, 1 module margin). Returns { png, px }. */
export function qrPng(strText, intScale = 8) {
  const { size, dark } = qrMatrix(strText);
  const intMargin = 1;
  const px = (size + intMargin * 2) * intScale;
  const rgba = new Uint8Array(px * px * 4).fill(255);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!dark[y][x]) continue;
      for (let dy = 0; dy < intScale; dy++) {
        for (let dx = 0; dx < intScale; dx++) {
          const o = (((y + intMargin) * intScale + dy) * px + (x + intMargin) * intScale + dx) * 4;
          rgba[o] = rgba[o + 1] = rgba[o + 2] = 0;
        }
      }
    }
  }
  return { png: encodePng(px, px, rgba), px };
}

/** Signature as a transparent PNG (dark blue ink). Returns { png, w, h }. */
export function signaturePng(strSeed, intScale = 3) {
  const w = SIG_W * intScale, h = SIG_H * intScale;
  const alpha = new Float32Array(w * h);
  const R = 1.3 * intScale; // ink radius
  const stamp = (cx, cy) => {
    const x0 = Math.max(0, Math.floor(cx - R - 1)), x1 = Math.min(w - 1, Math.ceil(cx + R + 1));
    const y0 = Math.max(0, Math.floor(cy - R - 1)), y1 = Math.min(h - 1, Math.ceil(cy + R + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const a = Math.min(1, Math.max(0, R + 0.5 - d));
        if (a > alpha[y * w + x]) alpha[y * w + x] = a;
      }
    }
  };
  for (const [p0, p1, p2, p3] of signatureSegments(strSeed)) {
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      stamp(x * intScale, y * intScale);
    }
  }
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = 0x1f; rgba[i * 4 + 1] = 0x2a; rgba[i * 4 + 2] = 0x67; // navy ink
    rgba[i * 4 + 3] = Math.round(alpha[i] * 255);
  }
  return { png: encodePng(w, h, rgba), w, h };
}
