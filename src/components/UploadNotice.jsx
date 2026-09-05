/**
 * UploadNotice — the inline success and error banners for the upload flow.
 *
 * Both sit in the flow of the page directly under the upload button. Neither
 * is a modal and neither is alert(): the curriculum stays visible and usable
 * behind them, and an error can be retried without reloading.
 *
 * Props
 *   tone      'success' | 'error'
 *   children  the message
 *   onDismiss fn  renders a dismiss button when provided
 *   action    { label, onClick }  optional inline action, used for "Try again"
 */
function UploadNotice({ tone, children, onDismiss, action }) {
  const isError = tone === 'error'

  return (
    <div
      // Errors interrupt; success can wait for a natural pause.
      role={isError ? 'alert' : 'status'}
      className={[
        'mt-4 flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm',
        isError
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-brand-orange/30 bg-brand-orange-tint text-slate-700',
      ].join(' ')}
    >
      <span aria-hidden="true" className={isError ? 'mt-0.5 text-red-500' : 'mt-0.5 text-brand-orange'}>
        {isError ? <AlertIcon /> : <CheckIcon />}
      </span>

      <p className="min-w-0 flex-1">{children}</p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={[
            'shrink-0 rounded-md px-2 py-1 text-sm font-medium transition-colors',
            'focus-visible:ring-2 focus-visible:outline-none',
            isError
              ? 'text-red-700 hover:bg-red-100 focus-visible:ring-red-500'
              : 'text-brand-orange hover:bg-brand-orange/10 focus-visible:ring-brand-orange',
          ].join(' ')}
        >
          {action.label}
        </button>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className={[
            'shrink-0 rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none',
            isError
              ? 'text-red-400 hover:bg-red-100 hover:text-red-600 focus-visible:ring-red-500'
              : 'text-slate-400 hover:bg-brand-orange/10 hover:text-slate-600 focus-visible:ring-brand-orange',
          ].join(' ')}
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
            className="size-3.5"
          >
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      )}
    </div>
  )
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-4">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6.5v4M10 13.5h.01" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M6.75 10.25l2.25 2.25 4.25-4.5" />
    </svg>
  )
}

export default UploadNotice
