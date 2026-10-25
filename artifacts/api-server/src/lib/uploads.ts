import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { createWorker } from "tesseract.js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import mammoth from "mammoth";
import sharp from "sharp";
import jsQR from "jsqr";
import type { AnalysisResult, AnalysisResultInputType } from "@workspace/api-zod";
import { analyzeText, analyzeUrl } from "./analysis";
import { checkGoogleSafeBrowsing } from "./threat-intelligence";
const require = createRequire(import.meta.url);
const TESSERACT_WORKER_PATH = require.resolve("tesseract.js/src/worker-script/node/index.js");
const PDFJS_ENTRY_URL = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.mjs"));
const PDF_STANDARD_FONT_DATA_URL = new URL("../../standard_fonts/", PDFJS_ENTRY_URL).href;

const configuredUploadLimit = process.env.MAX_UPLOAD_SIZE_MB;
const uploadLimitMb = configuredUploadLimit === undefined ? 8 : Number(configuredUploadLimit);
if (!Number.isInteger(uploadLimitMb) || uploadLimitMb < 1 || uploadLimitMb > 25) {
  throw new Error("MAX_UPLOAD_SIZE_MB must be an integer between 1 and 25.");
}
export const MAX_UPLOAD_BYTES = uploadLimitMb * 1024 * 1024;

export type UploadedFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

const extension = (name: string) => name.toLowerCase().split(".").at(-1) ?? "";
const isPng = (buffer: Buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
const isJpeg = (buffer: Buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
const isWebp = (buffer: Buffer) => buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";

function assertImage(file: UploadedFile): void {
  const ext = extension(file.originalname);
  const allowed = (ext === "png" && file.mimetype === "image/png" && isPng(file.buffer)) ||
    ((ext === "jpg" || ext === "jpeg") && file.mimetype === "image/jpeg" && isJpeg(file.buffer)) ||
    (ext === "webp" && file.mimetype === "image/webp" && isWebp(file.buffer));
  if (!allowed) throw new Error("The image extension, MIME type, and file contents must agree. Supported formats: PNG, JPG, JPEG, WEBP.");
}

async function extractImageText(file: UploadedFile): Promise<string> {
  assertImage(file);
  const normalized = await sharp(file.buffer, { limitInputPixels: 16_000_000 })
    .rotate()
    .resize({ width: 3500, height: 3500, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  try {
    worker = await createWorker("eng", 1, { workerPath: TESSERACT_WORKER_PATH });
    const { data } = await worker.recognize(normalized);
    return data.text.trim();
  } finally {
    await worker?.terminate();
  }
}

export async function analyzeImage(file: UploadedFile, inputType: AnalysisResultInputType): Promise<AnalysisResult> {
  const text = await extractImageText(file);
  if (!text) throw new Error("Unable to reliably extract text from this image. No assessment was generated.");
  const result = analyzeText(text, inputType);
  result.technical_analysis = {
    ...result.technical_analysis,
    engine: "Local weighted rules + Tesseract OCR",
    extracted_text_available: true,
    semantic_analysis: "OCR text was analyzed with local context and phrase rules; no external LLM was used.",
  };
  result.extracted_text = text;
  return result;
}


export async function analyzeQr(file: UploadedFile): Promise<AnalysisResult> {
  assertImage(file);

  const image = await sharp(file.buffer, {
    limitInputPixels: 16_000_000,
  })
    .resize({
      width: 1800,
      height: 1800,
      fit: "inside",
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const decoded = jsQR(
    new Uint8ClampedArray(image.data),
    image.info.width,
    image.info.height,
    { inversionAttempts: "attemptBoth" },
  );

  if (!decoded?.data) {
    throw new Error("No readable QR code was found in this image.");
  }

  const content = decoded.data.trim();
  let result: AnalysisResult;

  if (/^https?:\/\//i.test(content)) {
    result = analyzeUrl(content);
    result.input_type = "qr";
    result.technical_analysis = {
      ...result.technical_analysis,
      engine: "Local QR decoder + URL structure checks",
      extracted_text_available: true,
    };

    result = await checkGoogleSafeBrowsing(result, content);
    result.input_type = "qr";
  } else {
    result = analyzeText(content, "qr");
    result.technical_analysis.engine = "Local QR decoder + weighted rules";
  }

  result.extracted_text = content;
  return result;
}

function assertDocument(file: UploadedFile): "pdf" | "docx" | "text" {
  const ext = extension(file.originalname);
  if (ext === "pdf" && file.mimetype === "application/pdf" && file.buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "pdf";
  if (ext === "docx" && file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
      file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) return "docx";
  if (ext === "txt" && file.mimetype === "text/plain") return "text";
  throw new Error("The document extension, MIME type, and file contents must agree. Supported formats: PDF, DOCX, and TXT.");
}

export async function analyzeDocument(file: UploadedFile): Promise<AnalysisResult> {
  const kind = assertDocument(file);
  let text = "";
  if (kind === "pdf") {
    const loadingTask = getDocument({
      data: new Uint8Array(file.buffer),
      useSystemFonts: false,
      standardFontDataUrl: PDF_STANDARD_FONT_DATA_URL,
    });
    let ocrWorker: Awaited<ReturnType<typeof createWorker>> | undefined;
    let usedOcr = false;
    try {
      const document = await loadingTask.promise;
      const pageText: string[] = [];
      const pagesToRead = Math.min(document.numPages, 30);
      for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        let extracted = content.items.flatMap((item) => "str" in item ? [item.str] : []).join(" ").trim();
        if (!extracted && pageNumber <= 5) {
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(1.5, Math.sqrt(3_000_000 / (baseViewport.width * baseViewport.height)));
          if (scale >= 0.25) {
            const viewport = page.getViewport({ scale });
            const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
            await page.render({
              canvas: canvas as unknown as Parameters<typeof page.render>[0]["canvas"],
              viewport,
              background: "rgb(255, 255, 255)",
            }).promise;
            ocrWorker ??= await createWorker("eng", 1, { workerPath: TESSERACT_WORKER_PATH });
            const { data } = await ocrWorker.recognize(canvas.toBuffer("image/png"));
            extracted = data.text.trim();
            usedOcr ||= Boolean(extracted);
          }
        }
        if (extracted) pageText.push(extracted);
      }
      text = pageText.join("\n").trim();
    } finally {
      await ocrWorker?.terminate();
      await loadingTask.destroy();
    }
    if (!text) throw new Error("No reliably extractable text was found in this PDF. Text extraction and local OCR did not recover any content; no text was invented.");
    if (usedOcr) {
      const result = analyzeText(text, "document");
      result.extracted_text = text.slice(0, 30000);
      result.technical_analysis = {
        ...result.technical_analysis,
        engine: "PDF text extraction + local Tesseract OCR + weighted rules",
        semantic_analysis: "Up to 30 pages were checked; blank pages among the first 5 were rendered and OCRed locally.",
        extracted_text_available: true,
      };
      return result;
    }
  } else if (kind === "docx") {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    text = parsed.value.trim();
    if (!text) throw new Error("No readable text was found in this DOCX file.");
  } else {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(file.buffer).trim();
    } catch {
      throw new Error("The text file is not valid UTF-8.");
    }
    if (!text || text.includes("\u0000")) throw new Error("No readable text was found in this TXT file.");
  }
  const result = analyzeText(text, "document");
  result.extracted_text = text.slice(0, 30000);
  result.technical_analysis = {
    ...result.technical_analysis,
    engine: kind === "pdf" ? "PDF text extraction + local weighted rules" : kind === "docx" ? "DOCX text extraction + local weighted rules" : "UTF-8 text extraction + local weighted rules",
    extracted_text_available: true,
  };
  return result;
}

export function validateAudioFile(file: UploadedFile): void {
  const ext = extension(file.originalname);
  const mime = file.mimetype.toLowerCase();
  const allowedExt: Record<string, string[]> = {
    mp3: ["audio/mpeg", "audio/mp3"],
    wav: ["audio/wav", "audio/x-wav", "audio/wave"],
    webm: ["audio/webm", "video/webm"],
    m4a: ["audio/mp4", "audio/x-m4a", "video/mp4"],
    mp4: ["audio/mp4", "video/mp4"],
  };
  const validSignature =
    (ext === "wav" && file.buffer.toString("ascii", 0, 4) === "RIFF" && file.buffer.toString("ascii", 8, 12) === "WAVE") ||
    (ext === "mp3" && (file.buffer.toString("ascii", 0, 3) === "ID3" || (file.buffer[0] === 0xff && (file.buffer[1] & 0xe0) === 0xe0))) ||
    (ext === "webm" && file.buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) ||
    ((ext === "m4a" || ext === "mp4") && file.buffer.toString("ascii", 4, 8) === "ftyp");
  if (!allowedExt[ext]?.includes(mime) || !validSignature) {
    throw new Error("The audio extension, MIME type, and file contents must agree. Supported formats: MP3, WAV, WEBM, M4A, MP4.");
  }
}