import { generateCurriculumFromPdf } from './gemini.js'

/**
 * handler.js — request handling, validation and error mapping for
 * POST /api/parse-curriculum.
 *
 * Kept apart from the Vercel entry point (../parse-curriculum.js) so the whole
 * request/response cycle can be exercised with a stubbed Gemini call. Files
 * under api/_lib are not routed by Vercel — the leading underscore excludes
 * them.
 *
 * The response contract, in both directions:
 *   200  { modules: [...] }                       at least one module
 *   4xx  { error: { code, message } }             caller's fault
 *   5xx  { error: { code, message } }             ours or Gemini's
 *
 * `message` is always safe to show a user verbatim, and never contains the API
 * key, a stack trace, or raw upstream payloads.
 */

/**
 * Vercel caps a serverless request body at 4.5 MB, and base64 inflates a file
 * by about a third. 3 MB of PDF lands near 4 MB encoded, leaving room for the
 * JSON envelope.
 *
 * The client enforces the same ceiling before uploading so the user gets an
 * instant message instead of a slow round-trip — keep the two in step
 * (src/utils/uploadCurriculum.js).
 */
export const MAX_PDF_BYTES = 3 * 1024 * 1024

/** Every `%PDF-1.x` file begins with these five bytes. */
const PDF_MAGIC = '%PDF'

/** One place to build the error body, so the shape never drifts. */
function fail(res, status, code, message) {
  res.status(status).json({ error: { code, message } })
}

/**
 * Read and JSON-parse the request body.
 *
 * Some environments (Vercel's Node runtime, most dev servers) pre-parse JSON
 * onto `req.body`; others hand over a raw stream. Handling both keeps local
 * dev and production on identical code, and lets us enforce our own size limit
 * rather than inheriting whatever the platform's parser happens to default to.
 */
async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body)

  // Cap the stream itself: a client can otherwise stream unbounded bytes at us.
  const maxBytes = Math.ceil(MAX_PDF_BYTES * 1.4) + 64 * 1024
  const chunks = []
  let total = 0

  for await (const chunk of req) {
    total += chunk.length
    if (total > maxBytes) {
      const overflow = new Error('Request body too large')
      overflow.code = 'PDF_TOO_LARGE'
      throw overflow
    }
    chunks.push(chunk)
  }

  if (total === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/**
 * Turn an SDK/network failure into a status code and a sentence a user can act
 * on. Gemini surfaces most problems as an HTTP status on the error object.
 */
function describeUpstreamError(error) {
  const status = error?.status
  const text = String(error?.message || '')

  if (status === 400 && /api key not valid/i.test(text)) {
    return {
      status: 500, // the user cannot fix this; it is a server misconfiguration
      code: 'GEMINI_AUTH',
      message:
        'The server\'s Gemini API key was rejected. Check GEMINI_API_KEY in your environment settings.',
    }
  }
  if (status === 401 || status === 403) {
    return {
      status: 500,
      code: 'GEMINI_AUTH',
      message:
        'The server is not authorised to call Gemini. Check that GEMINI_API_KEY is valid and has access to the model.',
    }
  }
  if (status === 429) {
    return {
      status: 429,
      code: 'GEMINI_RATE_LIMIT',
      message: 'Gemini is rate-limiting requests right now. Wait a moment and try again.',
    }
  }
  if (status === 413 || /too large|exceeds/i.test(text)) {
    return {
      status: 413,
      code: 'PDF_TOO_LARGE',
      message: 'Gemini rejected this PDF as too large. Try a smaller file.',
    }
  }
  if (/abort|timeout|timed out/i.test(text) || error?.name === 'AbortError') {
    return {
      status: 504,
      code: 'GEMINI_TIMEOUT',
      message:
        'Parsing took too long and timed out. Try again, or upload a shorter document.',
    }
  }
  if (status >= 500 || /fetch failed|network|ENOTFOUND|ECONNRESET/i.test(text)) {
    return {
      status: 502,
      code: 'GEMINI_UNAVAILABLE',
      message: 'Could not reach Gemini. Check your connection and try again.',
    }
  }
  if (/not valid json/i.test(text)) {
    return {
      status: 502,
      code: 'GEMINI_BAD_JSON',
      message:
        'Gemini returned a malformed response. Try again — this is usually transient.',
    }
  }
  return {
    status: 502,
    code: 'GEMINI_FAILED',
    message: 'Could not parse this PDF. Try again, or upload a different file.',
  }
}

/**
 * Build the request handler.
 *
 * @param {object} [deps]
 * @param {Function} [deps.generate] swapped out in tests; defaults to the real
 *                                   Gemini call
 */
export function createParseCurriculumHandler({ generate = generateCurriculumFromPdf } = {}) {
  return async function parseCurriculumHandler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return fail(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST to upload a PDF.')
    }

    // Read the key per-request, not at module load, so a key added after cold
    // start (or in a test) is picked up.
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return fail(
        res,
        500,
        'MISSING_API_KEY',
        'The server has no Gemini API key configured. Add GEMINI_API_KEY to .env.local for local development, or to the project\'s environment variables when deployed.',
      )
    }

    /* ---------------------------- validate ---------------------------- */

    let body
    try {
      body = await readJsonBody(req)
    } catch (error) {
      if (error.code === 'PDF_TOO_LARGE') {
        return fail(
          res,
          413,
          'PDF_TOO_LARGE',
          `That PDF is too large. Please upload a file under ${Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB.`,
        )
      }
      return fail(res, 400, 'INVALID_BODY', 'The request body was not valid JSON.')
    }

    const pdfBase64 = body?.pdfBase64
    if (typeof pdfBase64 !== 'string' || pdfBase64.length === 0) {
      return fail(res, 400, 'MISSING_PDF', 'No PDF was included in the request.')
    }

    let pdfBuffer
    try {
      pdfBuffer = Buffer.from(pdfBase64, 'base64')
    } catch {
      return fail(res, 400, 'INVALID_PDF', 'The uploaded file could not be decoded.')
    }

    if (pdfBuffer.length === 0) {
      return fail(res, 400, 'INVALID_PDF', 'The uploaded file was empty.')
    }
    if (pdfBuffer.length > MAX_PDF_BYTES) {
      return fail(
        res,
        413,
        'PDF_TOO_LARGE',
        `That PDF is too large. Please upload a file under ${Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB.`,
      )
    }
    // Trust the bytes, not the file extension: a renamed .docx must not reach
    // Gemini and come back as a confusing upstream error.
    if (pdfBuffer.subarray(0, PDF_MAGIC.length).toString('latin1') !== PDF_MAGIC) {
      return fail(
        res,
        400,
        'NOT_A_PDF',
        'That file is not a PDF. Please upload a .pdf file.',
      )
    }

    /* ------------------------------ parse ------------------------------ */

    let parsed
    try {
      parsed = await generate({
        apiKey,
        pdfBase64,
        model: process.env.GEMINI_MODEL,
      })
    } catch (error) {
      // Log server-side for debugging; the client only sees the safe sentence.
      console.error('[parse-curriculum] Gemini call failed:', error)
      const mapped = describeUpstreamError(error)
      return fail(res, mapped.status, mapped.code, mapped.message)
    }

    // A syntactically valid but empty result is a FAILURE, not a success: the
    // prompt's whole job is to always produce something usable, so an empty
    // array means the extraction did not work.
    const modules = parsed?.modules
    if (!Array.isArray(modules) || modules.length === 0) {
      console.error('[parse-curriculum] Gemini returned no modules:', JSON.stringify(parsed)?.slice(0, 500))
      return fail(
        res,
        502,
        'EMPTY_RESULT',
        'No curriculum structure could be found in that PDF. Try a different file, or add modules manually.',
      )
    }

    return res.status(200).json({ modules })
  }
}
