import fs from "node:fs";
import { extractTextFromPdf } from "../lib/policies/pdf/text.js";

async function run() {
  const file = "tests/Warehouse/IFFCO/KISHAN WAREHOUSE UNIT TARAIYA NO.2 0 2 CO MPWLC -FIRE POLICY.pdf";
  const buffer = fs.readFileSync(file);
  
  const canvasModule = await import("@napi-rs/canvas");
  global.Path2D = canvasModule.Path2D;
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = canvasModule;
  
  try {
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true,
      useSystemFonts: true,
    });
    const document = await loadingTask.promise;
    console.log("PDF pages:", document.numPages);
    const page = await document.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport }).promise;
    console.log("Page 1 rendered successfully. Canvas size:", canvas.width, canvas.height);
  } catch (err) {
    console.error("Detailed error in PDF rendering:", err);
  }
}

run().catch(console.error);
