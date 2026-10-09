// Build a quotation .xlsx with working formulas (Amount = Qty x Rate, GST, totals).
// Cached values are included so previews without recalculation still show numbers.
import { zip, xmlEscape } from "./zip.mjs";

export const FOOTER_TEXT = "Made with Quotely Pro — quotelypro.in";

// Style ids (see STYLES below)
// Colours follow the Quotely Pro PDF defaults: navy #1f2a67, teal #0ea5a4, alternate row #F1F5F9.
const S = { normal: 0, bold: 1, title: 2, money: 3, header: 4, text: 5, moneyBold: 6, footer: 7, num: 8, labelRight: 9,
  textAlt: 10, moneyAlt: 11, numAlt: 12, label: 13 };

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>
<fonts count="6">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="14"/><color rgb="FF1F2A67"/><name val="Calibri"/></font>
<font><i/><sz val="9"/><color rgb="FF64748B"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FF0EA5A4"/><name val="Calibri"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F2A67"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="14">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
<xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
<xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function cellStr(ref, text, style = S.normal) {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
}
function cellNum(ref, value, style = S.num) {
  return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
}
function cellFormula(ref, formula, value, style = S.money) {
  return `<c r="${ref}" s="${style}"><f>${xmlEscape(formula)}</f><v>${value}</v></c>`;
}

export function buildXlsx({ sample, meta, calc }) {
  const lstRows = [];
  let r = 0;
  const row = (cells) => {
    r += 1;
    lstRows.push(`<row r="${r}">${cells.map((fn) => fn(r)).join("")}</row>`);
    return r;
  };
  const blank = () => row([]);

  // Columns: A # | B Item | C Qty | D Unit | E Rate | F GST % | G Amount | H GST amount   (line GST)
  //          A # | B Item | C Qty | D Unit | E Rate | F Amount                               (contract split)
  const blnLine = calc.blnLineGst;
  const colAmt = blnLine ? "G" : "F";
  const colLabel = blnLine ? "F" : "E";

  row([(n) => cellStr(`A${n}`, meta.strSeller.toUpperCase(), S.title)]);
  row([(n) => cellStr(`A${n}`, sample.from)]);
  row([(n) => cellStr(`A${n}`, `GSTIN: ${meta.strGstin} (sample)`)]);
  blank();
  row([(n) => cellStr(`A${n}`, "QUOTATION", S.title)]);
  row([(n) => cellStr(`A${n}`, "Quotation No.", S.label), (n) => cellStr(`B${n}`, meta.strNumber)]);
  row([(n) => cellStr(`A${n}`, "Date", S.label), (n) => cellStr(`B${n}`, meta.strDate)]);
  row([(n) => cellStr(`A${n}`, "Valid till", S.label), (n) => cellStr(`B${n}`, meta.strValidTill)]);
  blank();
  row([(n) => cellStr(`A${n}`, "Bill To", S.label), (n) => cellStr(`B${n}`, sample.to)]);
  row([(n) => cellStr(`A${n}`, "Subject", S.bold), (n) => cellStr(`B${n}`, sample.subject)]);
  blank();

  const lstHead = blnLine
    ? ["#", "Item", "Qty", "Unit", "Rate (Rs.)", "GST %", "Amount (Rs.)", "GST (Rs.)"]
    : ["#", "Item", "Qty", "Unit", "Rate (Rs.)", "Amount (Rs.)"];
  row(lstHead.map((h, i) => (n) => cellStr(`${String.fromCharCode(65 + i)}${n}`, h, S.header)));

  const intFirst = r + 1;
  calc.lstRows.forEach((it, i) => {
    const blnAlt = i % 2 === 1; // alternate row shading, like the PDF
    const st = blnAlt ? { text: S.textAlt, money: S.moneyAlt, num: S.numAlt } : { text: S.text, money: S.money, num: S.num };
    row([
      (n) => cellNum(`A${n}`, i + 1, st.num),
      (n) => cellStr(`B${n}`, it.name, st.text),
      (n) => cellNum(`C${n}`, it.qty, st.num),
      (n) => cellStr(`D${n}`, it.unit, st.text),
      (n) => cellNum(`E${n}`, it.rate, st.money),
      ...(blnLine
        ? [
            (n) => cellNum(`F${n}`, it.gst, st.num),
            (n) => cellFormula(`G${n}`, `C${n}*E${n}`, it.amount, st.money),
            (n) => cellFormula(`H${n}`, `G${n}*F${n}/100`, Math.round(it.amount * it.gst) / 100, st.money),
          ]
        : [(n) => cellFormula(`F${n}`, `C${n}*E${n}`, it.amount, st.money)]),
    ]);
  });
  const intLast = r;

  const rTaxable = row([
    (n) => cellStr(`${colLabel}${n}`, "Taxable value", S.labelRight),
    (n) => cellFormula(`${colAmt}${n}`, `SUM(${colAmt}${intFirst}:${colAmt}${intLast})`, calc.dblTaxable, S.moneyBold),
  ]);
  const lstGstRefs = [];
  for (const g of calc.lstGst) {
    const strFormula = blnLine
      ? `ROUND(SUMIF($F$${intFirst}:$F$${intLast},${g.rate},$H$${intFirst}:$H$${intLast}),2)`
      : `ROUND(${colAmt}${rTaxable}*${g.share}*${g.rate}/100,2)`;
    const n = row([
      (k) => cellStr(`${colLabel}${k}`, g.label, S.labelRight),
      (k) => cellFormula(`${colAmt}${k}`, strFormula, g.amt),
    ]);
    lstGstRefs.push(`${colAmt}${n}`);
  }
  row([
    (n) => cellStr(`${colLabel}${n}`, "Grand Total", S.labelRight),
    (n) => cellFormula(`${colAmt}${n}`, `ROUND(${colAmt}${rTaxable}+${lstGstRefs.join("+")},0)`, calc.dblTotal, S.moneyBold),
  ]);
  blank();

  row([(n) => cellStr(`A${n}`, "Terms & Conditions", S.bold)]);
  for (const t of sample.terms) row([(n) => cellStr(`A${n}`, `• ${t}`)]);
  blank();
  row([(n) => cellStr(`A${n}`, "Bank / UPI details (sample)", S.bold)]);
  row([(n) => cellStr(`A${n}`, meta.strBank)]);
  row([(n) => cellStr(`A${n}`, `UPI: ${meta.strUpi}`)]);
  blank();
  row([(n) => cellStr(`A${n}`, `For ${meta.strSeller}`, S.bold)]);
  blank();
  row([(n) => cellStr(`A${n}`, "Authorised signatory")]);
  blank();
  row([(n) => cellStr(`A${n}`, "Sample for reference. GSTIN, bank and UPI details are made up. Confirm GST rates with your accountant.", S.footer)]);
  row([(n) => cellStr(`A${n}`, FOOTER_TEXT, S.footer)]);

  const strCols = blnLine
    ? '<col min="1" max="1" width="6" customWidth="1"/><col min="2" max="2" width="46" customWidth="1"/><col min="3" max="3" width="9" customWidth="1"/><col min="4" max="4" width="9" customWidth="1"/><col min="5" max="5" width="13" customWidth="1"/><col min="6" max="6" width="24" customWidth="1"/><col min="7" max="7" width="15" customWidth="1"/><col min="8" max="8" width="13" customWidth="1"/>'
    : '<col min="1" max="1" width="6" customWidth="1"/><col min="2" max="2" width="50" customWidth="1"/><col min="3" max="3" width="9" customWidth="1"/><col min="4" max="4" width="9" customWidth="1"/><col min="5" max="5" width="36" customWidth="1"/><col min="6" max="6" width="15" customWidth="1"/>';

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<cols>${strCols}</cols>
<sheetData>${lstRows.join("")}</sheetData>
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>
<headerFooter><oddFooter>&amp;C${xmlEscape(FOOTER_TEXT)}</oddFooter></headerFooter>
</worksheet>`;

  return zip([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Quotation" sheetId="1" r:id="rId1"/></sheets>
<calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: "xl/worksheets/sheet1.xml", data: sheet },
    { name: "xl/styles.xml", data: STYLES },
  ]);
}
