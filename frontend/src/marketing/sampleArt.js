// Sample artwork for the quotation samples: a fake UPI link (for the "Scan to Pay" QR) and a
// handwritten-style signature. Pure JS, no imports: safe for the browser bundle and Node scripts.
// Everything is made up: the QR encodes a fake UPI id, so no payment can happen.

/** Fake UPI payment link for a sample seller (not a real handle). */
export const sampleUpiLink = (strUpi, strSeller) =>
  `upi://pay?pa=${strUpi}&pn=${encodeURIComponent(strSeller)}&cu=INR`;

// ---------- Signature ----------
// A deterministic flowing stroke from a seed string: list of cubic Beziers in a 200 x 60 box,
// plus an underline flourish. Looks like a quick signature; different for each seller.
function rng(strSeed) {
  let h = 2166136261;
  for (const ch of strSeed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

export const SIG_W = 200;
export const SIG_H = 60;

/** Returns an array of cubic segments [[x0,y0],[x1,y1],[x2,y2],[x3,y3]] (y down). */
export function signatureSegments(strSeed) {
  const r = rng(strSeed);
  const segs = [];
  let x = 8, y = 38;
  const n = 7 + Math.floor(r() * 3);
  const step = (SIG_W - 40) / n;
  for (let i = 0; i < n; i++) {
    const x1 = x + step * (0.3 + r() * 0.2), y1 = 8 + r() * 44;
    const x2 = x + step * (0.6 + r() * 0.2), y2 = 8 + r() * 44;
    const nx = x + step, ny = 22 + r() * 24;
    segs.push([[x, y], [x1, y1], [x2, y2], [nx, ny]]);
    x = nx; y = ny;
  }
  // tail + underline flourish
  segs.push([[x, y], [x + 14, y + 10], [x + 24, y - 2], [SIG_W - 6, 40]]);
  segs.push([[SIG_W - 6, 40], [SIG_W * 0.7, 54 + r() * 3], [SIG_W * 0.35, 52 + r() * 4], [12, 53]]);
  return segs;
}

export function signaturePathD(strSeed) {
  const f = (n) => n.toFixed(1);
  const segs = signatureSegments(strSeed);
  return segs
    .map((s, i) => `${i === 0 ? `M${f(s[0][0])} ${f(s[0][1])} ` : ""}C${s.slice(1).map((p) => `${f(p[0])} ${f(p[1])}`).join(" ")}`)
    .join(" ");
}

