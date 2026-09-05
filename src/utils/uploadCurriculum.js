/**
 * uploadCurriculum.js — the browser half of the upload: validate the file,
 * encode it, call the API, and turn anything that goes wrong into one
 * human-readable sentence.
 *
 * The component that calls this only has to render `error.message`; it never
 * has to know about status codes or SDK failures.
 *
 * The Gemini key is not here and must never be. It lives only in
 * /api/parse-curriculum.js on the server.
 */

/**
 * Must match MAX_PDF_BYTES in api/_lib/handler.js. Checked here as well so an
 * oversized file is rejected instantly instead of after a slow upload that the
 * platform would reject anyway (Vercel caps request bodies at 4.5 MB, and
 * base64 adds about a third).
 */
export const MAX_PDF_BYTES = 3 * 1024 * 1024

const MAX_PDF_LABEL = `${Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB`

/** An error carrying a message that is safe and sensible to show the user. */
class UploadError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'UploadError'
    this.code = code
  }
}

/**
 * Client-side gate. The server re-checks all of this — this exists to give
 * instant feedback, not to be the security boundary.
 *
 * @returns {string|null} an error message, or null if the file is acceptable
 */
export function validatePdfFile(file) {
  if (!file) return 'No file was selected.'

  // Check the extension as well as the MIME type: some browsers and systems
  // report an empty or generic type for a perfectly good PDF.
  const looksLikePdf =
    file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')

  if (!looksLikePdf) {
    return 'That file is not a PDF. Please choose a .pdf file.'
  }
  if (file.size === 0) {
    return 'That file is empty. Please choose a different PDF.'
  }
  if (file.size > MAX_PDF_BYTES) {
    return `That PDF is ${formatBytes(file.size)}. Please choose a file under ${MAX_PDF_LABEL}.`
  }
  return null
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/**
 * Read a File into base64 without the `data:...;base64,` prefix.
 *
 * Done in chunks rather than String.fromCharCode(...bytes), which blows the
 * call-stack argument limit on multi-megabyte files.
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new UploadError('That file could not be read.', 'READ_FAILED'))
    reader.onload = () => {
      const result = String(reader.result || '')
      const comma = result.indexOf(',')
      resolve(comma === -1 ? result : result.slice(comma + 1))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Validate, encode, and POST the PDF; resolve with the raw `modules` array.
 *
 * Always rejects with an UploadError whose `message` can be shown as-is.
 *
 * @param {File} file
 * @returns {Promise<unknown[]>} the AI's modules, still untransformed
 */
export async function parseCurriculumPdf(file) {
  const validationError = validatePdfFile(file)
  if (validationError) throw new UploadError(validationError, 'INVALID_FILE')

  const pdfBase64 = await fileToBase64(file)

  let response
  try {
    response = await fetch('/api/parse-curriculum', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pdfBase64 }),
    })
  } catch {
    // fetch only rejects on a transport failure, never on a 4xx/5xx.
    throw new UploadError(
      'Could not reach the server. Check your connection and try again.',
      'NETWORK',
    )
  }

  // Read the body defensively: a platform-level failure (a gateway timeout, a
  // rejected oversized body) can return HTML or nothing at all.
  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new UploadError(
      payload?.error?.message || fallbackMessageForStatus(response.status),
      payload?.error?.code || `HTTP_${response.status}`,
    )
  }

  const modules = payload?.modules
  if (!Array.isArray(modules) || modules.length === 0) {
    throw new UploadError(
      'No curriculum structure could be found in that PDF. Try a different file, or add modules manually.',
      'EMPTY_RESULT',
    )
  }

  return modules
}

/** Used when the server failed before it could send our JSON error shape. */
function fallbackMessageForStatus(status) {
  if (status === 404) {
    return 'The upload endpoint was not found. If you are running locally, restart the dev server.'
  }
  if (status === 413) {
    return `That PDF is too large. Please choose a file under ${MAX_PDF_LABEL}.`
  }
  if (status === 504) {
    return 'Parsing took too long and timed out. Try again, or upload a shorter document.'
  }
  return 'Something went wrong while parsing that PDF. Please try again.'
}
