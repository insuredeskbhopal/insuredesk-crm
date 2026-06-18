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
  const canvasModule = await import("@napi-rs/canvas");
  global.Path2D = canvasModule.Path2D;
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = canvasModule;
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    useSystemFonts: true,
  });
  const document = await loadingTask.promise;
  const maxPages = Math.min(document.numPages || 0, Number(process.env.OCR_MAX_PAGES || 3));
  const images = [];

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: Number(process.env.OCR_SCALE || 2) });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport }).promise;
    images.push(canvas.toBuffer("image/png"));
  }

  return images;
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
