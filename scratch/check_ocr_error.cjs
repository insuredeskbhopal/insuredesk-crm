const fs = require("fs");

async function main() {
  const { extractTextFromPdf } = await import("../src/lib/policies/pdf/text.js");
  const file = "organized-policies/Bajaj Allianz/Other/BANKE BIHARI WAREHOUSE -FIRE POLICY.pdf";
  const buffer = fs.readFileSync(file);
  
  process.env.OCR_MAX_PAGES = "13";
  try {
    // Let's capture the error inside renderPdfPagesToPng by running a custom render
    const canvasModule = await import("@napi-rs/canvas");
    globalThis.Path2D = canvasModule.Path2D;
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { createCanvas } = canvasModule;
    
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true,
      useSystemFonts: true,
    });
    const document = await loadingTask.promise;
    console.log("PDF pages:", document.numPages);
    
    for (let pageNumber = 1; pageNumber <= 13; pageNumber += 1) {
      console.log(`Rendering page ${pageNumber}...`);
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");
      await page.render({ canvasContext: context, viewport }).promise;
      const buf = canvas.toBuffer("image/png");
      console.log(`Page ${pageNumber} rendered, buffer size:`, buf.length);
    }
  } catch (err) {
    console.error("Rendering failed with error:", err);
  }
}

main().catch(console.error);
