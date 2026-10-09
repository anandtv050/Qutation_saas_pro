// Build-time: write /templates/<slug>.xlsx|.docx|.pdf for every page with a sample quotation.
// No runtime or build dependencies: zip/xlsx/docx/pdf are generated with Node built-ins.
import fs from "node:fs";
import path from "node:path";
import { buildXlsx } from "./xlsx.mjs";
import { buildDocx } from "./docx.mjs";
import { buildPdf } from "./pdf.mjs";

export function generateTemplates({ pages, sampleMeta, computeSample, outDir }) {
  fs.mkdirSync(outDir, { recursive: true });
  const lstWritten = [];
  for (const page of pages) {
    const input = { sample: page.sample, meta: sampleMeta(page), calc: computeSample(page.sample) };
    for (const [ext, build] of [["xlsx", buildXlsx], ["docx", buildDocx], ["pdf", buildPdf]]) {
      const strFile = path.join(outDir, `${page.slug}.${ext}`);
      fs.writeFileSync(strFile, build(input));
      lstWritten.push(strFile);
    }
  }
  return lstWritten;
}
