import { useRef } from 'react'

/**
 * UploadCurriculumButton — "Upload Curriculum", the primary action in the
 * curriculum header.
 *
 * Wraps a hidden <input type="file"> so the control can be styled like the
 * rest of the app while still being a real file picker. `accept=".pdf"` filters
 * the OS dialog; it is a convenience, not a guarantee, so the file is validated
 * again in uploadCurriculum.js and once more on the server.
 *
 * Props
 *   onFileSelected  fn    called with the chosen File
 *   busy            bool  a parse is in flight
 */
function UploadCurriculumButton({ onFileSelected, busy }) {
  const inputRef = useRef(null)

  function handleChange(event) {
    const file = event.target.files?.[0]
    // Clear the input so picking the *same* file again still fires a change
    // event — otherwise a retry after an error silently does nothing.
    event.target.value = ''
    if (file) onFileSelected(file)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleChange}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Upload curriculum PDF"
        className={[
          'inline-flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2',
          'text-sm font-medium text-white shadow-sm transition-colors',
          'bg-brand-orange hover:bg-brand-orange-dark',
          'focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand-orange',
        ].join(' ')}
      >
        {busy ? (
          <Spinner />
        ) : (
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="size-4"
          >
            <path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5" />
            <path d="M4 13v2a1 1 0 001 1h10a1 1 0 001-1v-2" />
          </svg>
        )}
        {busy ? 'Parsing…' : 'Upload Curriculum'}
      </button>
    </>
  )
}

function Spinner() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 animate-spin">
      <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
      <path
        d="M10 2.5a7.5 7.5 0 017.5 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default UploadCurriculumButton
