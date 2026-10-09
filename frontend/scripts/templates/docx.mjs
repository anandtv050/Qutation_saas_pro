// Build a quotation .docx with the same layout as the web sample.
import { zip, xmlEscape } from "./zip.mjs";
import { FOOTER_TEXT } from "./xlsx.mjs";
import { qrPng, signaturePng } from "./art.mjs";

const fmt = (n) => new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtQty = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);

function run(text, { bold = false, size = null, color = null } = {}) {
  const rPr = [bold ? "<w:b/>" : "", color ? `<w:color w:val="${color}"/>` : "", size ? `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>` : ""].join("");
  return `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

function para(runs, { align = null, after = 60, before = 0 } = {}) {
  const pPr = `<w:pPr><w:spacing w:before="${before}" w:after="${after}"/>${align ? `<w:jc w:val="${align}"/>` : ""}</w:pPr>`;
  return `<w:p>${pPr}${Array.isArray(runs) ? runs.join("") : runs}</w:p>`;
}

// Colours follow the Quotely Pro PDF defaults: navy 1F2A67, teal 0EA5A4, alternate row F1F5F9.
const NAVY = "1F2A67";
const TEAL = "0EA5A4";
const MUTED = "64748B";

function cell(content, width, { align = null, bold = false, fill = null, color = null, span = 1 } = {}) {
  const tcPr = `<w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ""}${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ""}<w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/></w:tcMar></w:tcPr>`;
  return `<w:tc>${tcPr}${para(run(content, { bold, color }), { align, after: 0 })}</w:tc>`;
}

const EMU_PER_PT = 12700;

// Inline picture run (rId must exist in word/_rels/document.xml.rels).
function inlineImage(rId, id, name, widthPt, heightPt) {
  const cx = Math.round(widthPt * EMU_PER_PT);
  const cy = Math.round(heightPt * EMU_PER_PT);
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="${xmlEscape(name)}" descr="${xmlEscape(name)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${xmlEscape(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

export function buildDocx({ sample, meta, calc }) {
  const sig = signaturePng(meta.strSigSeed);
  const qr = qrPng(meta.strUpiLink);
  const blnLine = calc.blnLineGst;
  // Column widths in twips; total = A4 width minus 2 cm margins on each side (9638).
  const lstW = blnLine ? [450, 3900, 700, 800, 1300, 700, 1788] : [450, 4600, 700, 800, 1300, 1788];
  const lstHead = blnLine ? ["#", "Item", "Qty", "Unit", "Rate (Rs.)", "GST", "Amount (Rs.)"] : ["#", "Item", "Qty", "Unit", "Rate (Rs.)", "Amount (Rs.)"];
  const lstAlign = blnLine ? [null, null, "right", null, "right", "right", "right"] : [null, null, "right", null, "right", "right"];

  const tr = (cells) => `<w:tr>${cells.join("")}</w:tr>`;
  const lstTr = [];
  lstTr.push(tr(lstHead.map((h, i) => cell(h, lstW[i], { bold: true, fill: NAVY, color: "FFFFFF", align: lstAlign[i] }))));
  calc.lstRows.forEach((r, i) => {
    const vals = blnLine
      ? [String(i + 1), r.name, fmtQty(r.qty), r.unit, fmt(r.rate), `${r.gst}%`, fmt(r.amount)]
      : [String(i + 1), r.name, fmtQty(r.qty), r.unit, fmt(r.rate), fmt(r.amount)];
    lstTr.push(tr(vals.map((v, k) => cell(v, lstW[k], { align: lstAlign[k], fill: i % 2 === 1 ? "F1F5F9" : null }))));
  });
  const intSpan = lstW.length - 1;
  const intSpanW = lstW.slice(0, -1).reduce((a, b) => a + b, 0);
  const totalRow = (label, value, bold = false) =>
    tr([
      cell(label, intSpanW, { span: intSpan, align: "right", bold, fill: bold ? "F8FAFC" : null }),
      cell(value, lstW[lstW.length - 1], { align: "right", bold, color: bold ? NAVY : null, fill: bold ? "F8FAFC" : null }),
    ]);
  lstTr.push(totalRow("Taxable value", fmt(calc.dblTaxable)));
  for (const g of calc.lstGst) lstTr.push(totalRow(g.label, fmt(g.amt)));
  lstTr.push(totalRow("Grand Total", `Rs. ${fmt(calc.dblTotal)}`, true));

  const border = (side) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>`;
  const table = `<w:tbl><w:tblPr><w:tblW w:w="${lstW.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(border).join("")}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${lstW.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${lstTr.join("")}</w:tbl>`;

  const body = [
    para(run("QUOTATION", { bold: true, size: 40, color: NAVY }), { align: "right", after: 0 }),
    para(run(meta.strSeller.toUpperCase(), { bold: true, size: 30, color: NAVY }), { after: 40 }),
    para(run(`${sample.from.split(",").slice(1).join(",").trim()}  |  GSTIN ${meta.strGstin} (sample)`), { after: 200 }),
    para([
      run("QUOTATION NO. ", { bold: true, size: 16, color: TEAL }), run(`${meta.strNumber}     `),
      run("DATE ", { bold: true, size: 16, color: TEAL }), run(`${meta.strDate}     `),
      run("VALID TILL ", { bold: true, size: 16, color: TEAL }), run(meta.strValidTill),
    ], { after: 200 }),
    para(run("Bill To", { bold: true, color: NAVY }), { after: 20 }),
    para(run(sample.to), { after: 120 }),
    para([run("Subject: ", { bold: true, color: NAVY }), run(sample.subject)], { after: 200 }),
    table,
    para(run("Terms & Conditions", { bold: true }), { before: 240, after: 60 }),
    ...sample.terms.map((t) => para(run(`• ${t}`, { color: MUTED }), { after: 20 })),
    para(run("Bank / UPI details (sample)", { bold: true }), { before: 240, after: 40 }),
    para(run(meta.strBank), { after: 20 }),
    para(run(`UPI: ${meta.strUpi}`), { after: 240 }),
    para(run(`For ${meta.strSeller}`, { bold: true }), { align: "right", after: 20 }),
    para(inlineImage("rId3", 1, "Sample signature", 120, 36), { align: "right", after: 0 }),
    para(run("Authorised signatory", { color: MUTED }), { align: "right", after: 200 }),
    para(inlineImage("rId4", 2, "Sample payment QR code", 74, 74), { align: "right", after: 20 }),
    para(run("Scan to Pay (sample)", { size: 16, color: MUTED }), { align: "right", after: 240 }),
    para(run("Sample for reference. GSTIN, bank and UPI details are made up. Confirm GST rates with your accountant.", { size: 16, color: "666666" }), { after: 0 }),
  ].join("");

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
<w:body>${body}<w:sectPr><w:footerReference w:type="default" r:id="rId1"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body>
</w:document>`;

  const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${para(run(FOOTER_TEXT, { size: 16, color: "666666" }), { align: "center", after: 0 })}</w:ftr>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="en-IN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>`;

  return zip([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    },
    {
      name: "word/_rels/document.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/signature.png"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/qr.png"/>
</Relationships>`,
    },
    { name: "word/document.xml", data: document },
    { name: "word/styles.xml", data: styles },
    { name: "word/footer1.xml", data: footer },
    { name: "word/media/signature.png", data: sig.png },
    { name: "word/media/qr.png", data: qr.png },
  ]);
}
