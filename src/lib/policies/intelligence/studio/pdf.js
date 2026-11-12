import { existsSync } from 'node:fs';
import { join } from 'node:path';
export const ocrDirectory = existsSync(join(process.cwd(), 'policy-intelligence-module', 'vendor', 'tessdata'))
    ? join(process.cwd(), 'policy-intelligence-module', 'vendor', 'tessdata')
    : existsSync(join(process.cwd(), 'eng.traineddata'))
      ? process.cwd()
      : join(process.cwd(), 'vendor', 'tessdata');
export function ocrAvailable() {
    return existsSync(join(ocrDirectory, 'eng.traineddata.gz')) || existsSync(join(ocrDirectory, 'eng.traineddata'));
}
const round2 = (n) => Math.round(n * 100) / 100;
function unionBox(boxes) {
    if (!boxes.length)
        return [0, 0, 0, 0];
    let x0 = boxes[0][0], y0 = boxes[0][1], x1 = boxes[0][2], y1 = boxes[0][3];
    for (let i = 1; i < boxes.length; i++) {
        if (boxes[i][0] < x0)
            x0 = boxes[i][0];
        if (boxes[i][1] < y0)
            y0 = boxes[i][1];
        if (boxes[i][2] > x1)
            x1 = boxes[i][2];
        if (boxes[i][3] > y1)
            y1 = boxes[i][3];
    }
    return [round2(x0), round2(y0), round2(x1), round2(y1)];
}
export function organizePage(raw, number, width, height, source, warning) {
    const cleaned = raw
        .map(w => ({
        text: w.text.trim(),
        box: [
            round2(Math.max(0, Math.min(width, w.box[0]))),
            round2(Math.max(0, Math.min(height, w.box[1]))),
            round2(Math.max(0, Math.min(width, Math.max(w.box[0] + 0.5, w.box[2])))),
            round2(Math.max(0, Math.min(height, Math.max(w.box[1] + 0.5, w.box[3])))),
        ],
    }))
        .filter(w => w.text.length > 0)
        .sort((a, b) => a.box[1] - b.box[1] || a.box[0] - b.box[0]);
    const rows = [];
    for (const word of cleaned) {
        const wordHeight = Math.max(4, word.box[3] - word.box[1]);
        const center = (word.box[1] + word.box[3]) / 2;
        const row = rows
            .slice(-10)
            .reverse()
            .find(r => Math.abs(r.center - center) < Math.max(3, Math.min(r.height, wordHeight) * 0.5));
        if (!row) {
            rows.push({ center, height: wordHeight, words: [word] });
        }
        else {
            const n = row.words.length;
            row.center = (row.center * n + center) / (n + 1);
            row.height = (row.height * n + wordHeight) / (n + 1);
            row.words.push(word);
        }
    }
    const words = [];
    const lines = [];
    const segments = [];
    for (const [lineIdx, row] of rows.sort((a, b) => a.center - b.center).entries()) {
        const sorted = row.words.sort((a, b) => a.box[0] - b.box[0]);
        const heights = sorted.map(w => w.box[3] - w.box[1]).sort((a, b) => a - b);
        const medianH = heights[Math.floor(heights.length / 2)] || 10;
        const gapThreshold = Math.max(16, medianH * 1.65);
        const lineWordIds = [];
        const lineSegmentIds = [];
        let currentSegmentWords = [];
        const flushSegment = () => {
            if (!currentSegmentWords.length)
                return;
            const segId = segments.length;
            for (const w of currentSegmentWords)
                w.segment = segId;
            segments.push({
                id: segId,
                line: lineIdx,
                text: currentSegmentWords.map(w => w.text).join(' '),
                wordIds: currentSegmentWords.map(w => w.id),
                box: unionBox(currentSegmentWords.map(w => w.box)),
            });
            lineSegmentIds.push(segId);
            currentSegmentWords = [];
        };
        for (let i = 0; i < sorted.length; i++) {
            const rw = sorted[i];
            if (currentSegmentWords.length > 0) {
                const prev = currentSegmentWords[currentSegmentWords.length - 1];
                if (rw.box[0] - prev.box[2] > gapThreshold) {
                    flushSegment();
                }
            }
            const token = {
                id: words.length,
                text: rw.text,
                box: rw.box,
                line: lineIdx,
                segment: segments.length,
            };
            words.push(token);
            lineWordIds.push(token.id);
            currentSegmentWords.push(token);
        }
        flushSegment();
        lines.push({
            id: lineIdx,
            text: words.slice(words.length - lineWordIds.length).map(t => t.text).join(' '),
            wordIds: lineWordIds,
            segmentIds: lineSegmentIds,
            box: unionBox(lineWordIds.map(id => words[id].box)),
        });
    }
    return { number, width: round2(width), height: round2(height), source, warning, words, lines, segments };
}
export async function parsePdf(buffer) {
    const canvas = await import('@napi-rs/canvas');
    Object.assign(globalThis, { DOMMatrix: canvas.DOMMatrix, ImageData: canvas.ImageData, Path2D: canvas.Path2D });
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdfRoot = join(process.cwd(), 'node_modules', 'pdfjs-dist');
    const task = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        standardFontDataUrl: join(pdfRoot, 'standard_fonts') + '/',
        cMapUrl: join(pdfRoot, 'cmaps') + '/',
        cMapPacked: true,
        wasmUrl: join(pdfRoot, 'wasm') + '/',
    });
    const pdf = await task.promise;
    let ocrWorker = null;
    try {
        if (pdf.numPages > 100)
            throw new Error('PDFs must contain at most 100 pages.');
        const pages = [];
        let scannedPages = 0;
        for (let number = 1; number <= pdf.numPages; number++) {
            const page = await pdf.getPage(number);
            const viewport = page.getViewport({ scale: 1 });
            const content = await page.getTextContent();
            let raw = [];
            let warning = null;
            let source = 'text';
            for (const item of content.items) {
                if (!('str' in item) || !item.str.trim())
                    continue;
                const transform = pdfjs.Util.transform(viewport.transform, item.transform);
                const height = Math.hypot(transform[2], transform[3]) || item.height || 10;
                const totalLen = Math.max(1, item.str.length);
                for (const match of item.str.matchAll(/\S+/g)) {
                    const idx = match.index ?? 0;
                    const token = match[0];
                    // Split leading ':' from glued value tokens like ":3205003125" so the value is cleanly selectable.
                    const subMatches = token.length > 1 && token.startsWith(':') && /^:[\p{L}\p{N}]/u.test(token)
                        ? [
                            { text: ':', offset: idx, len: 1 },
                            { text: token.slice(1), offset: idx + 1, len: token.length - 1 },
                        ]
                        : [{ text: token, offset: idx, len: token.length }];
                    for (const sub of subMatches) {
                        const start = sub.offset / totalLen;
                        const end = (sub.offset + sub.len) / totalLen;
                        raw.push({
                            text: sub.text,
                            box: [
                                transform[4] + item.width * start,
                                transform[5] - height * 0.85,
                                transform[4] + item.width * end,
                                transform[5] + height * 0.2,
                            ],
                        });
                    }
                }
            }
            const charCount = raw.reduce((acc, w) => acc + w.text.length, 0);
            if (raw.length < 5 || charCount < 15) {
                if (ocrAvailable()) {
                    if (++scannedPages > 20) {
                        throw new Error('Split scanned PDFs into batches of 20 pages or fewer for local OCR.');
                    }
                    const scaled = page.getViewport({ scale: Math.min(3, 2400 / Math.max(viewport.width, viewport.height)) });
                    const image = canvas.createCanvas(Math.ceil(scaled.width), Math.ceil(scaled.height));
                    const context = image.getContext('2d');
                    context.fillStyle = '#ffffff';
                    context.fillRect(0, 0, image.width, image.height);
                    await page.render({ canvas: image, canvasContext: context, viewport: scaled }).promise;
                    if (!ocrWorker) {
                        const { createWorker } = await import('tesseract.js');
                        const workerPath = join(process.cwd(), 'node_modules', 'tesseract.js', 'src', 'worker-script', 'node', 'index.js');
                        const corePath = join(process.cwd(), 'node_modules', 'tesseract.js-core', 'index.js');
                        ocrWorker = await createWorker('eng', 1, {
                            langPath: ocrDirectory,
                            cachePath: ocrDirectory,
                            workerPath,
                            corePath,
                        });
                    }
                    const result = await ocrWorker.recognize(image.toBuffer('image/png'), {}, { blocks: true, text: true });
                    const scale = scaled.scale;
                    raw = (result.data.blocks ?? []).flatMap(b => b.paragraphs.flatMap(p => p.lines.flatMap(l => l.words
                        .filter(w => w.text.trim().length > 0)
                        .map(w => ({
                        text: w.text,
                        box: [w.bbox.x0 / scale, w.bbox.y0 / scale, w.bbox.x1 / scale, w.bbox.y1 / scale],
                    })))));
                    source = 'ocr';
                    if (!raw.length)
                        warning = 'OCR found no readable text on this page. Review the original document.';
                }
                else {
                    warning = 'Little or no text found. Run npm run ocr:setup to enable local OCR.';
                }
            }
            pages.push(organizePage(raw, number, viewport.width, viewport.height, source, warning));
            page.cleanup();
        }
        return pages;
    }
    finally {
        if (ocrWorker)
            await ocrWorker.terminate();
        await pdf.destroy();
    }
}
