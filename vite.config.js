import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * Serve the /api folder during `npm run dev`.
 *
 * On Vercel, files in the top-level /api directory are deployed as serverless
 * functions automatically. Vite's dev server knows nothing about that, so
 * without this plugin `npm run dev` would 404 on /api/parse-curriculum and the
 * upload flow could only be tested by deploying.
 *
 * The plugin runs the *same* handler module the deployed function uses, so
 * there is no separate dev implementation to drift out of sync. It only adds
 * the two things Vercel's runtime provides on top of Node's http objects:
 * the `res.status().json()` helpers, and env vars loaded from .env.local.
 */
function devApiPlugin() {
  return {
    name: 'dev-api-routes',
    apply: 'serve', // dev only; production is Vercel's own runtime

    configureServer(server) {
      // Vercel injects env vars into the function; locally they come from
      // .env.local. Loaded with an empty prefix so unprefixed server-side
      // names like GEMINI_API_KEY are included (VITE_-prefixed vars are the
      // ones exposed to the browser — the key must never be one of those).
      const env = loadEnv(server.config.mode, process.cwd(), '')
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value
      }

      server.middlewares.use('/api/parse-curriculum', async (req, res, next) => {
        try {
          // ssrLoadModule re-reads the module on change, so editing the
          // handler hot-reloads the API the same way the UI hot-reloads.
          const mod = await server.ssrLoadModule('/api/parse-curriculum.js')
          await mod.default(req, withVercelResponseHelpers(res))
        } catch (error) {
          server.config.logger.error(`[dev-api] ${error?.stack || error}`)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(
              JSON.stringify({
                error: {
                  code: 'DEV_HANDLER_CRASH',
                  message: 'The local API handler threw. See the dev server console.',
                },
              }),
            )
            return
          }
          next(error)
        }
      })
    },
  }
}

/** Add the `res.status(n).json(obj)` sugar that Vercel's runtime provides. */
function withVercelResponseHelpers(res) {
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (payload) => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(payload))
    return res
  }
  return res
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devApiPlugin()],
})
