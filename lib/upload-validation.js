export const MAX_UPLOAD_FILES = Number(process.env.MAX_UPLOAD_FILES || 8);
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024);
const PDF_SIGNATURE = "%PDF-";

export function validateUploadList(files) {
  if (!files.length) {
    throw new UploadValidationError("No PDF files provided.", 400);
  }

  if (files.length > MAX_UPLOAD_FILES) {
    throw new UploadValidationError(`Upload at most ${MAX_UPLOAD_FILES} PDFs at a time.`, 413);
  }
}

export async function validatePdfFile(file) {
  if (file.type && file.type !== "application/pdf" && file.type !== "application/octet-stream") {
    throw new UploadValidationError("Only PDF files can be uploaded.", 415);
  }

  if (typeof file.size === "number" && file.size > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError(`PDF exceeds the ${formatBytes(MAX_UPLOAD_BYTES)} limit.`, 413);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!buffer.length) {
    throw new UploadValidationError("PDF file is empty.", 400);
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError(`PDF exceeds the ${formatBytes(MAX_UPLOAD_BYTES)} limit.`, 413);
  }

  if (buffer.subarray(0, PDF_SIGNATURE.length).toString("utf8") !== PDF_SIGNATURE) {
    throw new UploadValidationError("File does not look like a valid PDF.", 415);
  }

  return buffer;
}

export class UploadValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "UploadValidationError";
    this.status = status;
  }
}

function formatBytes(value) {
  return `${Math.round(value / 1024 / 1024)} MB`;
}
