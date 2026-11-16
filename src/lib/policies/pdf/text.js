import { createRequire } from "node:module";
import { createWorker } from "tesseract.js";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

export async function extractTextFromPdf(buffer) {
  const textExtraction = await extractPdfText(buffer);
  const rawText = cleanText(textExtraction.rawText);

  if (isTextQualityAcceptable(rawText)) {
    return {
      rawText,
      extractionMethod: "pdf_text",
      ocrAttempted: false,
      extractionLog: {
        method: "pdf_text",
        pages: textExtraction.pages,
        textLength: rawText.length,
      },
    };
  }

  const ocr = await runOcrFallback(buffer, rawText);
  const mergedText = cleanText([rawText, ocr.rawText].filter(Boolean).join("\n\n"));

  return {
    rawText: mergedText,
    extractionMethod: rawText && ocr.rawText ? "mixed" : ocr.extractionMethod,
    ocrAttempted: true,
    extractionLog: {
      method: rawText && ocr.rawText ? "mixed" : ocr.extractionMethod,
      pdfTextLength: rawText.length,
      ocrTextLength: ocr.rawText.length,
      pages: textExtraction.pages,
      ocrPages: ocr.pages,
      warnings: ocr.warnings,
    },
  };
}

async function extractPdfText(buffer) {
  try {
    const parsed = await pdf(buffer);
    return { rawText: parsed.text || "", pages: parsed.numpages || null };
  } catch (error) {
    throw new Error(
      `PDF text extraction failed: ${error instanceof Error ? error.message : "Corrupt or unreadable PDF."}`,
    );
  }
}

async function runOcrFallback(buffer) {
  const remoteResult = await requestRemoteRenderOcr(buffer);
  if (remoteResult && remoteResult.rawText) {
    return remoteResult;
  }

  try {
    const pageImages = await renderPdfPagesToPng(buffer);
    if (!pageImages.length) {
      return {
        rawText: "",
        extractionMethod: "failed",
        pages: 0,
        warnings: ["No PDF pages could be rendered for OCR."],
      };
    }

    const worker = await createWorker("eng");
    const chunks = [];

    try {
      for (const image of pageImages) {
        const result = await worker.recognize(image);
        chunks.push(result.data.text || "");
      }
    } finally {
      await worker.terminate();
    }

    return {
      rawText: cleanText(chunks.join("\n\n")),
      extractionMethod: "ocr",
      pages: pageImages.length,
      warnings: [],
    };
  } catch (error) {
    return {
      rawText: "",
      extractionMethod: "failed",
      pages: 0,
      warnings: [error instanceof Error ? error.message : "OCR failed."],
    };
  }
}

async function renderPdfPagesToPng(buffer) {
  if (!globalThis.pdfjsWorker) {
    try {
      globalThis.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    } catch {
      // In environments where pdf.worker.mjs is loaded externally
    }
  }
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const maxPages = Number(process.env.OCR_MAX_PAGES || 2);
  const images = [];

  try {
    const canvasModule = await import("@napi-rs/canvas");
    globalThis.Path2D = canvasModule.Path2D;
    const { createCanvas } = canvasModule;
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true,
      useSystemFonts: true,
    });
    const document = await loadingTask.promise;
    const totalPages = Math.min(document.numPages || 0, maxPages);

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      try {
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: Number(process.env.OCR_SCALE || 2) });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext("2d");
        await page.render({ canvasContext: context, viewport }).promise;
        images.push(canvas.toBuffer("image/png"));
      } catch (err) {
        console.warn(`[OCR] Canvas page render failed for page ${pageNumber}: ${err.message}`);
      }
    }
    if (images.length > 0) return images;
  } catch (canvasError) {
    console.warn(`[OCR] @napi-rs/canvas unavailable (${canvasError.message}). Falling back to pure JS image stream extraction.`);
  }

  // Pure JavaScript Fallback for Vercel Serverless (Zero native C++ binary dependencies)
  try {
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true,
      useSystemFonts: true,
    });
    const document = await loadingTask.promise;
    const totalPages = Math.min(document.numPages || 0, maxPages);

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      try {
        const page = await document.getPage(pageNumber);
        const ops = await page.getOperatorList();
        for (let j = 0; j < ops.fnArray.length; j += 1) {
          const fn = ops.fnArray[j];
          const args = ops.argsArray[j];
          if (fn === 82 || fn === 83 || fn === 85) {
            const imgName = args[0];
            const img = page.objs.get(imgName);
            if (img && img.width > 200 && img.height > 100 && img.data) {
              const bmpBuffer = rgbaToBmpBuffer(img.data, img.width, img.height);
              images.push(bmpBuffer);
            }
          }
        }
      } catch (pageErr) {
        console.warn(`[OCR] Pure JS image extraction failed for page ${pageNumber}: ${pageErr.message}`);
      }
    }
  } catch (pureJsErr) {
    console.warn(`[OCR] Pure JS PDF extraction failed: ${pureJsErr.message}`);
  }

  return images;
}

function rgbaToBmpBuffer(rgbaData, width, height) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  buf.write("BM", 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);

  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(-height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelArraySize, 34);

  let srcOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x += 1) {
      const r = rgbaData[srcOffset];
      const g = rgbaData[srcOffset + 1];
      const b = rgbaData[srcOffset + 2];
      buf[rowOffset + x * 3] = b;
      buf[rowOffset + x * 3 + 1] = g;
      buf[rowOffset + x * 3 + 2] = r;
      srcOffset += 4;
    }
  }
  return buf;
}

function isTextQualityAcceptable(text) {
  const normalized = String(text || "").trim();
  if (normalized.length < 80) return false;
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const policySignals = ["policy", "insured", "premium", "sum insured", "expiry"].filter((signal) =>
    normalized.toLowerCase().includes(signal),
  ).length;
  return wordCount >= 20 && policySignals >= 1;
}

function cleanText(text) {
  return String(text || "")
    .replace(/\r/g, " ")
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

async function requestRemoteRenderOcr(buffer) {
  if (process.env.IS_RENDER_OCR_SERVICE === "true") {
    return null;
  }
  try {
    const { callGateway } = await import("../../whatsapp/whatsapp-client.js");
    const pdfBase64 = buffer.toString("base64");
    const res = await callGateway("POST", "ocr", { pdfBase64 });
    if (res && res.success && res.rawText && isTextQualityAcceptable(res.rawText)) {
      console.log(`[OCR Client] Received ${res.rawText.length} characters from remote Render OCR microservice.`);
      return {
        rawText: cleanText(res.rawText),
        extractionMethod: res.extractionMethod || "ocr",
        pages: null,
        warnings: [],
      };
    }
  } catch (err) {
    console.warn(`[OCR Client] Remote Render OCR call skipped: ${err.message}`);
  }
  return null;
}
