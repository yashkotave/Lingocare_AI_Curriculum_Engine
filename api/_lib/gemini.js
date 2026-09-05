import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

/**
 * gemini.js — the ONLY file in the project that talks to the Gemini SDK.
 *
 * Everything else (the HTTP handler, the frontend) deals in plain objects, so
 * swapping SDKs or providers later means rewriting this file and nothing else.
 *
 * Note on the SDK: `@google/generative-ai` is Google's legacy JS SDK and has
 * not been published since April 2025; `@google/genai` is its maintained
 * successor. The legacy SDK still reaches the live v1beta endpoint and still
 * resolves current models, so it works — but when it stops, this file is the
 * only thing that needs to change.
 */

/** Default model. Override per-deployment with GEMINI_MODEL. */
export const DEFAULT_MODEL = 'gemini-2.5-flash'

/**
 * Leave headroom under the platform's function timeout so we return a clean
 * error instead of being killed mid-flight (see maxDuration in vercel.json).
 */
const REQUEST_TIMEOUT_MS = 55_000

/**
 * The exact shape Gemini must return — enforced by the API, not by us parsing
 * prose. It intentionally mirrors the app's node shape minus `id` and
 * `expanded`, which are assigned on the client (see curriculumTransform.js).
 *
 * Every field is listed in `required` so the model cannot omit one and hand us
 * a half-built node. `propertyOrdering` keeps generation in a stable order,
 * which measurably improves adherence for nested schemas.
 */
export const CURRICULUM_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    modules: {
      type: SchemaType.ARRAY,
      description: 'Every module in the curriculum, in document order.',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description:
              'Module title. Keep the document\'s own numbering and wording when it has any, e.g. "Module 1 — Becoming a Nursing Assistant".',
          },
          description: {
            type: SchemaType.STRING,
            description:
              'One or two sentences describing what this module covers.',
          },
          topics: {
            type: SchemaType.ARRAY,
            description:
              'Topics inside this module. Must never be empty — infer topics when the document does not state them.',
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING, description: 'Topic title.' },
                description: {
                  type: SchemaType.STRING,
                  description: 'One or two sentences describing the topic.',
                },
                lessons: {
                  type: SchemaType.ARRAY,
                  description:
                    'Lessons inside this topic. Must never be empty — infer lessons when the document does not state them.',
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      title: {
                        type: SchemaType.STRING,
                        description: 'Lesson title.',
                      },
                      description: {
                        type: SchemaType.STRING,
                        description:
                          'One or two sentences describing the lesson.',
                      },
                    },
                    required: ['title', 'description'],
                    propertyOrdering: ['title', 'description'],
                  },
                },
              },
              required: ['title', 'description', 'lessons'],
              propertyOrdering: ['title', 'description', 'lessons'],
            },
          },
        },
        required: ['title', 'description', 'topics'],
        propertyOrdering: ['title', 'description', 'topics'],
      },
    },
  },
  required: ['modules'],
  propertyOrdering: ['modules'],
}

/**
 * The extraction prompt.
 *
 * Written to hold three lines at once, in priority order:
 *
 *   1. EXTRACT what the document actually says. Real headings and real
 *      wording beat anything we could invent.
 *   2. INFER when the document is only partly structured. A module with no
 *      stated topics still has subject matter; derive topics from it rather
 *      than emitting an empty array, which would render as a dead-end node.
 *   3. ORGANISE when the document has no curriculum structure at all. A
 *      wall of prose must still come back as at least one usable
 *      Module -> Topic -> Lesson breakdown. Returning nothing is never an
 *      acceptable answer — the caller treats an empty result as a failure.
 *
 * It also states the expected scale up front, because the failure mode on long
 * documents is quietly stopping after the first few modules.
 */
export const EXTRACTION_PROMPT = `You are an expert nursing-education curriculum analyst.

The attached PDF is a nursing-education curriculum document. Your job is to read it in full and extract its curriculum structure as a three-level hierarchy:

  Module  ->  Topic  ->  Lesson

A MODULE is a broad unit of the program (for example "Module 1 — Becoming a Nursing Assistant").
A TOPIC is a distinct subject area inside a module.
A LESSON is a single teachable session inside a topic.

Follow these rules in order.

1. EXTRACT WHAT IS THERE.
   Prefer the document's own structure, headings, numbering and wording over anything you invent. If the document titles something "Module 1 — Becoming a Nursing Assistant" or "Unit 3: Infection Control", keep that exact title, including its numbering. Preserve the document's ordering.

2. INFER WHAT IS MISSING.
   Documents are often only partly structured. If a module lists no clear topics, or a topic lists no clear lessons, you must INFER and GENERATE sensible ones from the surrounding context and from standard nursing-education subject matter for that material.
   Every module must contain at least one topic. Every topic must contain at least one lesson. NEVER return an empty "topics" or "lessons" array — an empty array is a broken result. When you infer rather than copy, still make the titles specific and plausible for the material at hand, not generic filler like "Topic 1" or "Introduction".

3. ORGANISE WHEN THERE IS NO STRUCTURE AT ALL.
   If the document has no recognisable curriculum structure — it is a leaflet, an article, notes, a policy, a transcript, or unrelated prose — do NOT fail and do NOT return an empty result. Instead, read the subject matter and organise it yourself into a sensible curriculum: at minimum one module, containing at least one topic, containing at least one lesson, that a nursing instructor could actually teach from. Base it on whatever the document is genuinely about.

4. BE THOROUGH — DO NOT TRUNCATE.
   The document may be long. Expect up to roughly 20 modules, each with 10-15 topics, each with several lessons. Work all the way to the end of the document and include every module you find. Do not stop early, do not summarise "and so on", and do not collapse several modules into one.

5. DESCRIPTIONS.
   Give every module, topic and lesson a description of one or two plain sentences saying what it covers. If the document supplies a description, base yours on it. If it does not, write one from the title and its context. Never leave a description empty.

Return ONLY the JSON object matching the required schema. No markdown, no code fences, no commentary.`

/**
 * Send the PDF to Gemini and return the parsed `{ modules: [...] }` object.
 *
 * Throws on transport, auth, timeout or malformed-JSON failures. It does NOT
 * judge whether the result is *useful* — the handler decides that, so the
 * "empty modules counts as a failure" rule lives in one place.
 *
 * @param {object}  args
 * @param {string}  args.apiKey     server-side key; never reaches the browser
 * @param {string}  args.pdfBase64  the PDF, base64, no data: prefix
 * @param {string} [args.model]
 * @returns {Promise<{ modules: unknown[] }>}
 */
export async function generateCurriculumFromPdf({ apiKey, pdfBase64, model }) {
  const client = new GoogleGenerativeAI(apiKey)

  const generativeModel = client.getGenerativeModel(
    {
      model: model || DEFAULT_MODEL,
      generationConfig: {
        // Structured output: the API validates against the schema for us, so
        // we never have to scrape JSON out of prose or strip code fences.
        responseMimeType: 'application/json',
        responseSchema: CURRICULUM_SCHEMA,
        // Extraction, not creative writing: keep it close to the source.
        temperature: 0.2,
      },
    },
    { timeout: REQUEST_TIMEOUT_MS },
  )

  const result = await generativeModel.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          // The PDF goes first: Gemini attends to document context better when
          // the instructions follow the material they describe.
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
          { text: EXTRACTION_PROMPT },
        ],
      },
    ],
  })

  const raw = result?.response?.text?.()

  if (!raw || raw.trim().length === 0) {
    // A blocked or truncated generation lands here rather than throwing.
    const reason = result?.response?.promptFeedback?.blockReason
    throw new Error(
      reason
        ? `Gemini returned no content (blocked: ${reason}).`
        : 'Gemini returned an empty response.',
    )
  }

  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('Gemini returned a response that was not valid JSON.')
  }
}
