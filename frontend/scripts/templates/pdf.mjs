// Build a one-page A4 quotation PDF with no dependencies (standard Helvetica fonts).
// Layout mirrors the Quotely Pro quotation PDF (backend/app/api/pdf/service.py) with the
// default print-settings colours: navy #1f2a67, teal accent #0ea5a4.
// Standard fonts use WinAnsi encoding, so ₹ is written as "Rs." and dashes/quotes are mapped.
import zlib from "node:zlib";
import { FOOTER_TEXT } from "./xlsx.mjs";
import { qrMatrix, signatureSegments, SIG_W, SIG_H } from "./art.mjs";

const W = 595.28;
const H = 841.89;
const M = 40; // margin

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const C = {
  navy: hex("#1f2a67"),
  teal: hex("#0ea5a4"),
  text: hex("#1E293B"),
  muted: hex("#64748B"),
  border: hex("#CBD5E1"),
  alt: hex("#F1F5F9"),
  light: hex("#F8FAFC"),
  white: [1, 1, 1],
};

const fmt = (n) => new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtQty = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);

const WINANSI = { "—": 0x97, "–": 0x96, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "…": 0x85, "×": 0xd7 };

// Text -> PDF literal string body (escaped, WinAnsi bytes as octal escapes).
function pdfText(s) {
  let out = "";
  for (const ch of String(s).replace(/₹\s?/g, "Rs. ")) {
    let code = WINANSI[ch] ?? ch.charCodeAt(0);
    if (code > 0xff) code = 0x3f; // "?"
    if (ch === "(" || ch === ")" || ch === "\\") out += "\\" + ch;
    else if (code < 0x20 || code > 0x7e) out += "\\" + code.toString(8).padStart(3, "0");
    else out += ch;
  }
  return out;
}

// Helvetica advance widths (per 1000 em) for printable ASCII, from the standard AFM metrics.
const HELV = (() => {
  const t = {};
  const set = (chars, w) => { for (const c of chars) t[c] = w; };
  set(" .,:;/!|[]", 278); set("'", 191); set("\"", 355); set("-()`", 333); set("0123456789", 556);
  set("#$?_", 556); set("%", 889); set("&", 667); set("*", 389); set("+<=>~", 584); set("@", 1015); set("^", 469);
  set("{}", 334); set("\\", 278);
  set("abdeghnopqu", 556); set("cksvxyz", 500); set("fKt", 278); set("ijl", 222); set("m", 833); set("r", 333); set("w", 722);
  set("ABEHKNPRSUVXY", 667); set("CDHNRU", 722); set("FTZ", 611); set("GOQ", 778); set("IJ", 278); set("L", 556); set("M", 833); set("W", 944);
  set("ABEKPSVXY", 667); set("DHNRUC", 722); set("I", 278); set("J", 500);
  return t;
})();
const charWidth = (ch) => HELV[ch] ?? 556;
const textWidth = (s, size, bold = false) =>
  [...String(s).replace(/₹\s?/g, "Rs. ")].reduce((w, ch) => w + charWidth(ch), 0) * size / 1000 * (bold ? 1.11 : 1);

function wrap(s, size, maxW, bold = false) {
  const lstLines = [];
  let line = "";
  for (const word of String(s).split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (textWidth(test, size, bold) <= maxW || !line) line = test;
    else {
      lstLines.push(line);
      line = word;
    }
  }
  if (line) lstLines.push(line);
  return lstLines;
}

export function buildPdf({ sample, meta, calc }) {
  const ops = [];
  const rgb = (c) => c.map((v) => v.toFixed(3)).join(" ");
  const text = (s, x, y, size = 9, bold = false, color = C.text) => {
    ops.push(`${rgb(color)} rg BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfText(s)}) Tj ET`);
  };
  const textRight = (s, xRight, y, size = 9, bold = false, color = C.text) =>
    text(s, xRight - textWidth(s, size, bold), y, size, bold, color);
  const line = (x1, y1, x2, y2, color = C.border, width = 0.5) =>
    ops.push(`${rgb(color)} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  const fillRect = (x, y, w, h, color) => ops.push(`${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  const strokeRect = (x, y, w, h, color = C.border) =>
    ops.push(`${rgb(color)} RG 0.6 w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);

  const strCity = sample.from.split(",").slice(1).join(",").trim();
  const [strCustomer, ...lstAddress] = sample.to.split(",").map((s) => s.trim());

  // Accent top line
  let y = H - M;
  fillRect(M, y - 4, W - 2 * M, 4, C.teal);
  y -= 30;

  // Header: seller (uppercase, navy) left; QUOTATION (navy) right
  text(meta.strSeller.toUpperCase(), M, y, 15, true, C.navy);
  textRight("QUOTATION", W - M, y - 2, 22, true, C.navy);
  y -= 15;
  text(`${strCity}  |  GSTIN ${meta.strGstin} (sample)`, M, y, 8.5, false, C.text);
  y -= 18;

  // Meta: compact 3-column row
  const boxW = (W - 2 * M) / 3;
  const boxH = 30;
  [["QUOTATION NO.", meta.strNumber], ["DATE", meta.strDate], ["VALID TILL", meta.strValidTill]].forEach(([label, value], i) => {
    const x = M + i * boxW;
    fillRect(x, y - boxH, boxW, boxH, C.light);
    strokeRect(x, y - boxH, boxW, boxH);
    text(label, x + 8, y - 11, 6.8, true, C.teal);
    text(value, x + 8, y - 23, 9, false, C.text);
  });
  y -= boxH + 18;

  // Bill To, then subject
  text("Bill To", M, y, 9, true, C.navy);
  y -= 13;
  text(strCustomer, M, y, 9.5, true, C.text);
  if (lstAddress.length) {
    y -= 12;
    text(lstAddress.join(", "), M, y, 9, false, C.muted);
  }
  y -= 16;
  text("Subject:", M, y, 9, true, C.navy);
  const xSub = M + textWidth("Subject:", 9, true) + 4;
  const lstSub = wrap(sample.subject, 9, W - M - xSub);
  lstSub.forEach((l, i) => text(l, xSub, y - i * 11, 9));
  y -= 11 * lstSub.length + 6;
  line(M, y, W - M, y);
  y -= 14;

  // Items table
  const blnLine = calc.blnLineGst;
  const cols = blnLine
    ? { no: [M, 62], item: [62, 296], qty: [296, 340], unit: [344, 392], rate: [392, 452], gst: [452, 488], amt: [488, W - M] }
    : { no: [M, 62], item: [62, 334], qty: [334, 378], unit: [382, 432], rate: [432, 492], amt: [492, W - M] };
  const pad = 5;
  const headH = 22;
  fillRect(M, y - headH, W - 2 * M, headH, C.navy);
  const hy = y - 14.5;
  text("#", cols.no[0] + pad, hy, 8.5, true, C.white);
  text("Item", cols.item[0] + pad, hy, 8.5, true, C.white);
  textRight("Qty", cols.qty[1] - pad, hy, 8.5, true, C.white);
  text("Unit", cols.unit[0] + pad, hy, 8.5, true, C.white);
  textRight("Rate (Rs.)", cols.rate[1] - pad, hy, 8.5, true, C.white);
  if (blnLine) textRight("GST", cols.gst[1] - pad, hy, 8.5, true, C.white);
  textRight("Amount (Rs.)", cols.amt[1] - pad, hy, 8.5, true, C.white);
  y -= headH;

  calc.lstRows.forEach((r, i) => {
    const lstName = wrap(r.name, 8.5, cols.item[1] - cols.item[0] - 2 * pad);
    const rowH = 11 * lstName.length + 9;
    if (i % 2 === 1) fillRect(M, y - rowH, W - 2 * M, rowH, C.alt);
    const ty = y - 12.5;
    text(String(i + 1), cols.no[0] + pad, ty, 8.5, false, C.muted);
    lstName.forEach((l, k) => text(l, cols.item[0] + pad, ty - k * 11, 8.5));
    textRight(fmtQty(r.qty), cols.qty[1] - pad, ty, 8.5);
    text(r.unit, cols.unit[0] + pad, ty, 8.5, false, C.muted);
    textRight(fmt(r.rate), cols.rate[1] - pad, ty, 8.5);
    if (blnLine) textRight(`${r.gst}%`, cols.gst[1] - pad, ty, 8.5);
    textRight(fmt(r.amount), cols.amt[1] - pad, ty, 8.5);
    y -= rowH;
    line(M, y, W - M, y, C.border, 0.3);
  });
  y -= 12;

  // Totals box (right), like the PDF's grand-total box
  const lstTot = [["Taxable value", fmt(calc.dblTaxable)], ...calc.lstGst.map((g) => [g.label, fmt(g.amt)])];
  const boxRight = W - M;
  const totW = Math.max(230, ...lstTot.map(([l, v]) => textWidth(l, 9) + textWidth(v, 9) + 40));
  const rowT = 15;
  const totH = rowT * lstTot.length + 22;
  const boxX = boxRight - totW;
  strokeRect(boxX, y - totH, totW, totH);
  let ty2 = y - 11;
  for (const [l, v] of lstTot) {
    text(l, boxX + 10, ty2, 9, false, C.muted);
    textRight(v, boxRight - 10, ty2, 9);
    ty2 -= rowT;
  }
  fillRect(boxX, y - totH, totW, 22, C.light);
  line(boxX, y - totH + 22, boxRight, y - totH + 22);
  strokeRect(boxX, y - totH, totW, totH);
  text("Grand Total", boxX + 10, y - totH + 7.5, 10, true, C.text);
  textRight(`Rs. ${fmt(calc.dblTotal)}`, boxRight - 10, y - totH + 7.5, 10, true, C.navy);
  y -= totH + 22;

  // Footer: terms left; signatory + bank/UPI right
  const yFoot = y;
  const leftW = 300;
  text("Terms & Conditions", M, y, 8.5, true);
  y -= 13;
  for (const t of sample.terms) {
    const lst = wrap(t, 8.5, leftW - 12);
    text("•", M + 1, y, 8.5, false, C.muted);
    lst.forEach((l, k) => text(l, M + 10, y - k * 11, 8.5, false, C.muted));
    y -= 11 * lst.length + 2;
  }
  let yr = yFoot;
  textRight(`For ${meta.strSeller}`, W - M, yr, 9, true);
  yr -= 6;

  // Sample signature, drawn as a vector stroke
  const sigScale = 0.6;
  const sigW = SIG_W * sigScale;
  const sigH = SIG_H * sigScale;
  const sigX0 = W - M - sigW;
  const sigPt = ([px, py]) => `${(sigX0 + px * sigScale).toFixed(2)} ${(yr - py * sigScale).toFixed(2)}`;
  const lstSeg = signatureSegments(meta.strSigSeed);
  ops.push(`${rgb(C.navy)} RG 1.2 w 1 J 1 j ${sigPt(lstSeg[0][0])} m ${lstSeg.map((sg) => `${sigPt(sg[1])} ${sigPt(sg[2])} ${sigPt(sg[3])} c`).join(" ")} S`);
  yr -= sigH + 4;
  line(W - M - 130, yr, W - M, yr);
  yr -= 11;
  textRight("Authorised signatory", W - M, yr, 8.5, false, C.muted);
  yr -= 20;

  textRight("Bank / UPI (sample)", W - M, yr, 8, true);
  yr -= 11;
  textRight(meta.strBank, W - M, yr, 8, false, C.muted);
  yr -= 11;
  textRight(`UPI: ${meta.strUpi}`, W - M, yr, 8, false, C.muted);
  yr -= 12;

  // Sample "Scan to Pay" QR (encodes a fake UPI link), drawn as vector squares
  const qr = qrMatrix(meta.strUpiLink);
  const mod = 2; // whole points per module keeps the edges crisp (and the code scannable)
  const qrPad = 4;
  const qrBox = qr.size * mod + 2 * qrPad;
  const qrX = W - M - qrBox;
  const qrTop = yr;
  strokeRect(qrX, qrTop - qrBox, qrBox, qrBox);
  for (let row = 0; row < qr.size; row++) {
    let col = 0;
    while (col < qr.size) {
      if (!qr.dark[row][col]) { col++; continue; }
      let run = 1;
      while (col + run < qr.size && qr.dark[row][col + run]) run++;
      fillRect(qrX + qrPad + col * mod, qrTop - qrPad - (row + 1) * mod, run * mod, mod, [0, 0, 0]);
      col += run;
    }
  }
  yr = qrTop - qrBox - 11;
  textRight("Scan to Pay (sample)", W - M, yr, 8, false, C.muted);
  y = Math.min(y, yr) - 20;

  text("Sample for reference. GSTIN, bank and UPI details are made up. Confirm GST rates with your accountant.", M, y, 7.5, false, C.muted);
  if (y < 64) throw new Error(`PDF content overflows the page for "${sample.heading}"`);

  // Page footer: thin line + "Made with Quotely Pro"
  line(M, 52, W - M, 52);
  const fw = textWidth(FOOTER_TEXT, 8);
  text(FOOTER_TEXT, (W - fw) / 2, 38, 8, false, C.muted);

  // Assemble the PDF
  const content = zlib.deflateSync(Buffer.from(ops.join("\n"), "latin1"));
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    null, // content stream, written separately
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Producer (Quotely Pro - quotelypro.in) /Title (${pdfText(sample.heading)}) >>`,
  ];
  const parts = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  const offsets = [];
  let pos = parts[0].length;
  objects.forEach((obj, i) => {
    const head = Buffer.from(`${i + 1} 0 obj\n`, "latin1");
    const body = obj === null
      ? Buffer.concat([Buffer.from(`<< /Length ${content.length} /Filter /FlateDecode >>\nstream\n`, "latin1"), content, Buffer.from("\nendstream", "latin1")])
      : Buffer.from(obj, "latin1");
    const tail = Buffer.from("\nendobj\n", "latin1");
    offsets.push(pos);
    parts.push(head, body, tail);
    pos += head.length + body.length + tail.length;
  });
  const xref = [`xref\n0 ${objects.length + 1}\n`, "0000000000 65535 f \n", ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)].join("");
  parts.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${pos}\n%%EOF\n`, "latin1"));
  return Buffer.concat(parts);
}
