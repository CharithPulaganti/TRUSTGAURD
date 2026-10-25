import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { desc, eq } from "drizzle-orm";
import OpenAI, { toFile } from "openai";
import {
  AnalyzeTextBody,
  AnalyzeTextResponse,
  AnalyzeDigitalArrestBody,
  AnalyzeDigitalArrestResponse,
  AnalyzeUrlBody,
  AnalyzeUrlResponse,
  AnalyzeImageBody,
  AnalyzeImageResponse,
  AnalyzeQrBody,
  AnalyzeQrResponse,
  AnalyzeDocumentBody,
  AnalyzeDocumentResponse,
  AnalyzeAudioBody,
  GetHealthResponse,
  ReadAnalysisQueryParams,
  ReadAnalysisResponse,
  ListHistoryQueryParams,
  ListHistoryResponse,
  ClearHistoryQueryParams,
  ClearHistoryResponse,
  CreateReportBody,
  CreateReportResponse,
  type AnalysisResult,
  type AnalysisResultInputType,
} from "@workspace/api-zod";
import { analysisCasesTable, db, pool } from "@workspace/db";
import { analyzeText, analyzeUrl, parseSafePublicUrl } from "../lib/analysis";
import { checkGoogleSafeBrowsing } from "../lib/threat-intelligence";
import { analyzeDocument, analyzeImage, analyzeQr, MAX_UPLOAD_BYTES, validateAudioFile, type UploadedFile } from "../lib/uploads";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 2, parts: 3 },
});
const rateWindows = new Map<string, { startedAt: number; count: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;
const RATE_KEY_LIMIT = 10_000;
let nextRateCleanupAt = 0;

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

function validSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function gate(sessionId: unknown, req: Request, res: Response): boolean {
  if (!validSessionId(sessionId)) {
    res.status(400).json({ error: "A valid anonymous session is required.", code: "INVALID_SESSION" });
    return false;
  }
  const now = Date.now();
  if (now >= nextRateCleanupAt) {
    for (const [key, window] of rateWindows) {
      if (now - window.startedAt >= RATE_WINDOW_MS) rateWindows.delete(key);
    }
    nextRateCleanupAt = now + RATE_WINDOW_MS;
  }
  const key = `${sessionId}:${req.path}`;
  const window = rateWindows.get(key);
  if (!window || now - window.startedAt >= RATE_WINDOW_MS) {
    if (rateWindows.size >= RATE_KEY_LIMIT) {
      const oldestKey = rateWindows.keys().next().value;
      if (oldestKey) rateWindows.delete(oldestKey);
    }
    rateWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (window.count >= RATE_LIMIT) {
    res.setHeader("Retry-After", String(Math.ceil((window.startedAt + RATE_WINDOW_MS - now) / 1000)));
    res.status(429).json({ error: "Too many requests. Please wait a moment and try again.", code: "RATE_LIMITED" });
    return false;
  }
  window.count += 1;
  return true;
}

async function saveResult(sessionId: string, result: AnalysisResult, res: Response): Promise<void> {
  const summary = result.indicators.length
    ? `${result.indicators.length} risk indicator${result.indicators.length === 1 ? "" : "s"} detected.`
    : "No strong suspicious pattern detected.";
  const [record] = await db.insert(analysisCasesTable).values({
    analysisId: result.analysis_id,
    sessionId,
    inputType: result.input_type,
    riskScore: result.risk_score,
    riskLevel: result.risk_level,
    category: result.category,
    summary,
  }).returning();
  res.json(AnalyzeTextResponse.parse({
    ...result,
    // The result schema is identical for all analysis operations.
    analysis_id: record.analysisId,
  }));
}

function handleUpload(
  operation: (file: UploadedFile, inputType?: AnalysisResultInputType) => Promise<AnalysisResult>,
  inputType?: AnalysisResultInputType,
) {
  return [
    upload.single("file"),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const file = req.file as UploadedFile | undefined;
        if (!file) throw new HttpError(400, "FILE_REQUIRED", "Choose a file to analyze.");
        const sessionId = req.body?.session_id;
        if (!gate(sessionId, req, res)) return;
        let schema: typeof AnalyzeImageBody | typeof AnalyzeQrBody | typeof AnalyzeDocumentBody | typeof AnalyzeAudioBody;
        if (inputType === "qr") schema = AnalyzeQrBody;
        else if (inputType === "document") schema = AnalyzeDocumentBody;
        else if (inputType === "audio") schema = AnalyzeAudioBody;
        else schema = AnalyzeImageBody;
        const payload = {
          session_id: sessionId,
          file: new Blob([Uint8Array.from(file.buffer)], { type: file.mimetype }),
          ...(inputType === "audio" ? { allow_external_transcription: req.body?.allow_external_transcription === "true" } : {}),
        };
        const parsed = schema.safeParse(payload);
        if (!parsed.success) throw new HttpError(400, "INVALID_UPLOAD", "The upload request is invalid.");
        if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "FILE_TOO_LARGE", `Files must be smaller than ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`);
        if (inputType === "audio") validateAudioFile(file);
        const result = await operation(file, inputType);
        await saveResult(sessionId, result, res);
      } catch (error) {
        next(error);
      }
    },
  ] as const;
}

function reportHtml(result: AnalysisResult, includeEvidence: boolean): string {
  const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
  const indicators = result.indicators.map((item) => `<li><strong>${esc(item.label)}</strong> — ${esc(item.description)}</li>`).join("");
  const evidence = includeEvidence
    ? `<h2>Evidence excerpts</h2><ul>${result.evidence.map((item) => `<li>“${esc(item.text)}” — ${esc(item.indicator_label)}</li>`).join("")}</ul>`
    : `<p>Evidence excerpts are omitted to avoid including sensitive message content.</p>`;
  const actions = result.recommendations.map((item) => `<li>${esc(item)}</li>`).join("");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TrustGuard AI report</title><style>body{font:16px/1.55 system-ui,sans-serif;max-width:760px;margin:36px auto;padding:0 20px;color:#15202b}h1{margin-bottom:4px}.meta{color:#526170}.score{font-size:28px;font-weight:700;margin:20px 0}.disclaimer{border-top:1px solid #ccd3d9;margin-top:28px;padding-top:14px;font-size:13px}@media print{button{display:none}body{margin:0}}</style><body><h1>TrustGuard AI</h1><p class="meta">Analysis report · ${esc(result.analysis_id)} · ${new Date().toISOString()}</p><p class="score">${esc(result.risk_level)} — ${result.risk_score}/100</p><p><strong>Category:</strong> ${esc(result.category)} · <strong>Input type:</strong> ${esc(result.input_type)} · <strong>Evidence quality:</strong> ${esc(result.evidence_quality)}</p><h2>Assessment</h2><p>${esc(result.explanation)}</p><h2>Detected indicators</h2><ul>${indicators || "<li>No indicators were detected.</li>"}</ul>${evidence}<h2>Recommended actions</h2><ul>${actions}</ul><p class="disclaimer">${esc(result.disclaimer)} The original submitted content is not included in this report unless evidence excerpts were explicitly selected.</p><button onclick="window.print()">Print or save as PDF</button></body></html>`;
}

async function transcribeAudio(file: UploadedFile): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new HttpError(503, "TRANSCRIPTION_UNAVAILABLE", "OpenAI transcription is not configured. No transcript or assessment was fabricated.");
  }
  const client = new OpenAI({ apiKey, timeout: 90_000, maxRetries: 0 });
  let transcript: string;
  try {
    const response = await client.audio.transcriptions.create({
      file: await toFile(file.buffer, file.originalname, { type: file.mimetype }),
      model: "gpt-4o-mini-transcribe",
      response_format: "json",
    });
    transcript = response.text;
  }   catch (error: unknown) {
    if (error instanceof Error) {
      console.error("[Audio transcription] OpenAI request failed:", {
        name: error.name,
        message: error.message,
        status: "status" in error ? error.status : undefined,
        code: "code" in error ? error.code : undefined,
      });
    } else {
      console.error("[Audio transcription] OpenAI request failed with an unknown error.");
    }

    throw new HttpError(
      503,
      "TRANSCRIPTION_UNAVAILABLE",
      "OpenAI transcription is unavailable for this request. No transcript or assessment was generated.",
    );
  }
  if (!transcript.trim()) {
    throw new HttpError(422, "TRANSCRIPTION_EMPTY", "No readable speech was returned. No risk assessment was generated.");
  }
  const result = analyzeText(transcript.trim(), "audio");
  result.extracted_text = transcript.trim();
  result.technical_analysis = {
    ...result.technical_analysis,
    engine: "OpenAI gpt-4o-mini-transcribe + TrustGuard local rules",
    audio_transcription: "Transcribed by OpenAI after explicit user opt-in; risk indicators were evaluated locally.",
    extracted_text_available: true,
  };
  return result;
}

router.get("/health", async (_req, res): Promise<void> => {
  await pool.query("SELECT 1");
  res.json(GetHealthResponse.parse({ status: "ok" }));
});

router.get("/version", (_req, res): void => {
  res.json({
    version: "1.0.0",
    analysis_engine: "TrustGuard local weighted rules v1",
    external_reputation_available: false,
    llm_available: false,
    audio_transcription_available: Boolean(process.env.OPENAI_API_KEY),
  });
});

router.post("/analyze/text", async (req, res, next): Promise<void> => {
  try {
    const parsed = AnalyzeTextBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT", "Enter a message of 1 to 50,000 characters.");
    if (!gate(parsed.data.session_id, req, res)) return;
    const result = analyzeText(parsed.data.text, "text");
    await saveResult(parsed.data.session_id, result, res);
  } catch (error) {
    next(error);
  }
});

router.post("/digital-arrest/analyze", async (req, res, next): Promise<void> => {
  try {
    const parsed = AnalyzeDigitalArrestBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT", "Enter a message of 1 to 50,000 characters.");
    if (!gate(parsed.data.session_id, req, res)) return;
    const result = analyzeText(parsed.data.text, "digital_arrest");
    await saveResult(parsed.data.session_id, result, res);
  } catch (error) {
    next(error);
  }
});

router.post("/analyze/url", async (req, res, next): Promise<void> => {
  try {
    const parsed = AnalyzeUrlBody.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        "INVALID_INPUT",
        "Enter a valid http:// or https:// URL.",
      );
    }

    if (!gate(parsed.data.session_id, req, res)) return;

    try {
      parseSafePublicUrl(parsed.data.url);
    } catch (error) {
      throw new HttpError(
        400,
        "URL_BLOCKED",
        error instanceof Error
          ? error.message
          : "This URL was rejected for safety.",
      );
    }

    const localResult = analyzeUrl(parsed.data.url);
    const result = await checkGoogleSafeBrowsing(
      localResult,
      parsed.data.url,
    );

    await saveResult(parsed.data.session_id, result, res);
  } catch (error) {
    next(error);
  }
});

router.post("/analyze/image", ...handleUpload(analyzeImage, "image"));
router.post("/analyze/qr", ...handleUpload(analyzeQr, "qr"));
router.post("/analyze/document", ...handleUpload(analyzeDocument, "document"));
router.post("/analyze/audio", ...handleUpload(async (file) => transcribeAudio(file), "audio"));

router.get("/analysis", async (req, res, next): Promise<void> => {
  try {
    const parsed = ReadAnalysisQueryParams.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, "INVALID_QUERY", "A valid analysis ID and anonymous session are required.");
    if (!gate(parsed.data.session_id, req, res)) return;
    const [record] = await db.select().from(analysisCasesTable)
      .where(eq(analysisCasesTable.analysisId, parsed.data.analysis_id));
    if (!record || record.sessionId !== parsed.data.session_id) throw new HttpError(404, "ANALYSIS_NOT_FOUND", "Analysis was not found for this session.");
    res.json(ReadAnalysisResponse.parse({
      analysis_id: record.analysisId,
      created_at: record.createdAt.toISOString(),
      input_type: record.inputType,
      risk_score: record.riskScore,
      risk_level: record.riskLevel,
      category: record.category,
      summary: record.summary,
    }));
  } catch (error) {
    next(error);
  }
});

router.get("/history", async (req, res, next): Promise<void> => {
  try {
    const parsed = ListHistoryQueryParams.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, "INVALID_QUERY", "A valid anonymous session is required.");
    if (!gate(parsed.data.session_id, req, res)) return;
    const rows = await db.select().from(analysisCasesTable)
      .where(eq(analysisCasesTable.sessionId, parsed.data.session_id))
      .orderBy(desc(analysisCasesTable.createdAt))
      .limit(50);
    res.json(ListHistoryResponse.parse({
      items: rows.map((record) => ({
        analysis_id: record.analysisId,
        created_at: record.createdAt.toISOString(),
        input_type: record.inputType,
        risk_score: record.riskScore,
        risk_level: record.riskLevel,
        category: record.category,
        summary: record.summary,
      })),
    }));
  } catch (error) {
    next(error);
  }
});

router.delete("/history", async (req, res, next): Promise<void> => {
  try {
    const parsed = ClearHistoryQueryParams.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, "INVALID_QUERY", "A valid anonymous session is required.");
    if (!gate(parsed.data.session_id, req, res)) return;
    const deleted = await db.delete(analysisCasesTable)
      .where(eq(analysisCasesTable.sessionId, parsed.data.session_id))
      .returning({ analysisId: analysisCasesTable.analysisId });
    res.json(ClearHistoryResponse.parse({ deleted: deleted.length }));
  } catch (error) {
    next(error);
  }
});

router.post("/report", async (req, res, next): Promise<void> => {
  try {
    const parsed = CreateReportBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT", "A valid analysis and anonymous session are required.");
    if (!gate(parsed.data.session_id, req, res)) return;
    const result = AnalyzeTextResponse.parse(parsed.data.analysis);
    if (result.analysis_id !== parsed.data.analysis_id) throw new HttpError(400, "INVALID_REPORT", "The report result does not match the requested analysis.");
    const [record] = await db.select().from(analysisCasesTable)
      .where(eq(analysisCasesTable.analysisId, parsed.data.analysis_id));
    if (!record || record.sessionId !== parsed.data.session_id ||
      record.riskScore !== result.risk_score || record.riskLevel !== result.risk_level || record.category !== result.category) {
      throw new HttpError(404, "REPORT_NOT_FOUND", "Analysis was not found for this session.");
    }
    const reportResult = {
      ...result,
      extracted_text: null,
      evidence: parsed.data.include_evidence ? result.evidence : [],
    };
    res.json(CreateReportResponse.parse({
      html: reportHtml(reportResult, parsed.data.include_evidence ?? false),
      filename: `trustguard-report-${result.analysis_id}.html`,
    }));
  } catch (error) {
    next(error);
  }
});

export function trustguardErrorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    res.status(tooLarge ? 413 : 400).json({
      error: tooLarge ? `Files must be smaller than ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` : "The upload could not be processed.",
      code: tooLarge ? "FILE_TOO_LARGE" : "INVALID_UPLOAD",
    });
    return;
  }
  if (error instanceof HttpError) {
    if (error.status >= 500) req.log.warn({ code: error.code }, "Optional analysis provider unavailable");
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  if (error instanceof Error && /image|PDF|DOCX|QR|file|audio|text|URL/i.test(error.message)) {
    res.status(400).json({ error: error.message, code: "ANALYSIS_INPUT_ERROR" });
    return;
  }
  req.log.error({ errorType: error instanceof Error ? error.name : "unknown" }, "TrustGuard analysis failed");
  res.status(500).json({ error: "The analysis could not be completed. Please try again.", code: "ANALYSIS_FAILED" });
}

export default router;