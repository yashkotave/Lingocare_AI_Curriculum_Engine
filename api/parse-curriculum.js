import { createParseCurriculumHandler } from './_lib/handler.js'

/**
 * POST /api/parse-curriculum
 *
 * Vercel serves every file in this top-level /api directory as a serverless
 * function (Node runtime) — no Next.js involved. This file is only the entry
 * point; the logic lives in ./_lib/handler.js and the Gemini call in
 * ./_lib/gemini.js.
 *
 * Request   { pdfBase64: string }   base64 PDF, no data: prefix
 * Response  { modules: [...] }      on success (always at least one module)
 *           { error: { code, message } }  otherwise
 *
 * GEMINI_API_KEY is read from the environment inside this function and never
 * leaves the server.
 */
export default createParseCurriculumHandler()
