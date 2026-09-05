# Lingocare Curriculum Creation Engine

A curriculum builder for nursing schools. Structure a program as
**Curriculum → Module → Topic → Lesson**, editing every title and description
inline, or upload a curriculum PDF and let Gemini extract the structure for you.

React 19 + Vite 8 + Tailwind v4, JavaScript only. Single page, no router.
State is in-memory — nothing is persisted, and a refresh resets it.

See [CLAUDE.md](./CLAUDE.md) for the data model, scope boundaries and
interaction rules.

---

## Setup

```bash
npm install
```

### 1. Add your Gemini API key for local development

The PDF upload calls the Gemini API. The key is read **only** inside the
serverless function at `api/parse-curriculum.js` and is never sent to the
browser.

Copy the example file and fill in your key:

```bash
cp .env.example .env.local
```

```ini
# .env.local
GEMINI_API_KEY=your_key_here
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey).

> **Do not prefix the key with `VITE_`.** Vite inlines every `VITE_*` variable
> into the client bundle, which would publish your key to anyone who opens
> devtools. `.env` and `.env.local` are gitignored; `.env.example` is the
> committed placeholder.

### 2. Run it

```bash
npm run dev
```

`npm run dev` serves the app **and** the `/api` function together, so the
upload flow works locally exactly as it does in production. (Vite has no
built-in knowledge of `/api`; a small dev plugin in `vite.config.js` mounts the
same handler the deployed function uses.)

Without a key the app runs fine — the curriculum builder is fully usable, and
an upload attempt returns a clear "no API key configured" message instead of
failing silently.

---

## Deploying to Vercel

Vercel serves any file in the top-level `/api` directory as a serverless
function, with no Next.js required. No extra configuration is needed beyond
the env var.

1. **Add the env var before deploying.** In the Vercel dashboard:
   **Settings → Environment Variables →** add `GEMINI_API_KEY` with your key,
   for the Production, Preview and Development environments as needed.
2. Deploy. `vercel.json` raises this function's `maxDuration` to 60s, because
   parsing a long PDF can take well over the 10s default.

Optional: set `GEMINI_MODEL` to override the model
(default `gemini-2.5-flash`).

---

## Commands

| Command           | What it does                     |
| ----------------- | -------------------------------- |
| `npm run dev`     | Dev server, including `/api`     |
| `npm run build`   | Production build                 |
| `npm run lint`    | oxlint                           |
| `npm run preview` | Preview the production build\*   |

\* `npm run preview` serves the built frontend only — it does not run `/api`.
Use `npm run dev` to exercise the upload flow locally.

---

## How the PDF upload works

```
UploadCurriculumButton  pick a .pdf (type + size validated client-side)
        ↓
utils/uploadCurriculum.js  → base64 → POST /api/parse-curriculum
        ↓
api/parse-curriculum.js  → _lib/handler.js   validates, maps errors
                         → _lib/gemini.js    the only file touching the SDK
        ↓                                    structured output, fixed schema
utils/curriculumTransform.js  fresh UUIDs + `??` defaults for missing fields
        ↓
appended to the same React state
```

The result renders through the **same** `ModuleItem` / `TopicItem` /
`LessonItem` / `EditableText` components as hand-built content, so uploaded
modules are editable, expandable and deletable the moment they appear. The
upload is purely additive — existing modules are never replaced or reordered,
and a failure leaves the curriculum untouched.

**Limits.** PDFs must be under 3 MB. Vercel caps a serverless request body at
4.5 MB and base64 adds about a third, so the ceiling is enforced on both the
client and the server.

**On the Gemini SDK.** `api/_lib/gemini.js` is the only file that imports
`@google/generative-ai`. That package is Google's legacy JS SDK and has not
been published since April 2025 — `@google/genai` is its maintained successor.
The legacy SDK still works against the current endpoint and current models; if
that changes, this one file is all that needs rewriting.
