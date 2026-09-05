import { useEffect, useRef, useState } from 'react'

/** How long the armed confirm state survives before quietly reverting. */
const CONFIRM_WINDOW_MS = 3000

/**
 * DeleteButton — two-step delete that never opens a modal.
 *
 *   1st click  the trash icon becomes a small red "Confirm delete?" pill
 *   2nd click  the node (and its whole subtree) is removed
 *
 * The armed state is deliberately fragile. It reverts silently if the user
 * hovers away, moves focus elsewhere, clicks anywhere else on the page, or
 * simply waits — so a half-finished delete never lingers on screen.
 *
 * Props
 *   onDelete   fn      performs the delete
 *   itemLabel  string  used in the accessible name, e.g. "module"
 *   className  string  hover/focus reveal classes, passed in by the parent so
 *                      each level can scope them to its own Tailwind group
 */
function DeleteButton({ onDelete, itemLabel, className = '' }) {
  const [armed, setArmed] = useState(false)
  const wrapperRef = useRef(null)

  // Everything that disarms the button, in one place.
  useEffect(() => {
    if (!armed) return

    const timer = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS)

    // A click anywhere outside this control cancels. Attached after the
    // arming click has already been handled, so it can't cancel itself.
    const handleOutsidePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setArmed(false)
    }
    document.addEventListener('pointerdown', handleOutsidePointerDown)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', handleOutsidePointerDown)
    }
  }, [armed])

  return (
    <span
      ref={wrapperRef}
      // Hovering away or tabbing out of the control also cancels.
      onMouseLeave={() => setArmed(false)}
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget)) setArmed(false)
      }}
      // Armed state must stay visible even if the parent hides this on hover.
      className={armed ? 'shrink-0 opacity-100' : `shrink-0 ${className}`}
    >
      {armed ? (
        <button
          type="button"
          onClick={onDelete}
          className={[
            'rounded-md border border-red-200 bg-red-50 px-2 py-1',
            'text-xs font-medium whitespace-nowrap text-red-600 transition-colors',
            'hover:bg-red-100',
            'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none',
          ].join(' ')}
        >
          Confirm delete?
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          aria-label={`Delete ${itemLabel}`}
          className={[
            'flex size-7 items-center justify-center rounded-md',
            'text-slate-300 transition-colors',
            'hover:bg-red-50 hover:text-red-500',
            'focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none',
          ].join(' ')}
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="size-4"
          >
            <path d="M4 6h12M8 6V4.5A.5.5 0 018.5 4h3a.5.5 0 01.5.5V6M6.5 6l.5 9a1 1 0 001 1h4a1 1 0 001-1l.5-9" />
          </svg>
        </button>
      )}
    </span>
  )
}

export default DeleteButton
