/**
 * ParsingSkeleton — what the curriculum area shows while a PDF is being
 * parsed.
 *
 * The bars are laid out in the shape of the real thing: module cards, each
 * with indented topic rows and lesson rows behind the same connecting line.
 * That way the wait previews the structure that is coming instead of just
 * saying "loading", and the page never appears frozen.
 *
 * Marked aria-busy with a live status message so a screen reader announces the
 * wait rather than sitting silent.
 */
function ParsingSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
        <span className="size-2 animate-pulse rounded-full bg-brand-orange" aria-hidden="true" />
        Parsing your curriculum…
      </p>

      <div className="space-y-4">
        {[0, 1].map((card) => (
          <div
            key={card}
            className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            style={{ animationDelay: `${card * 150}ms` }}
          >
            {/* module title + description */}
            <Bar className="h-2 w-14" />
            <Bar className="mt-3 h-3.5 w-2/3" />
            <Bar className="mt-2.5 h-2.5 w-11/12" />

            {/* topic tier, behind the same indent and connecting line */}
            <div className="mt-4 ml-3 space-y-4 border-l border-slate-200 pl-5">
              {[0, 1].map((topic) => (
                <div key={topic}>
                  <Bar className="h-2 w-10" />
                  <Bar className="mt-2.5 h-3 w-1/2" />
                  <Bar className="mt-2 h-2.5 w-4/5" />

                  {/* lesson tier */}
                  <div className="mt-3 ml-3 space-y-2.5 border-l border-slate-200 pl-5">
                    <Bar className="h-2.5 w-2/5" />
                    <Bar className="h-2.5 w-3/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Bar({ className }) {
  return <div className={`rounded bg-slate-200/80 ${className}`} />
}

export default ParsingSkeleton
