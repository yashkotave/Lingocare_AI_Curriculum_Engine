/**
 * ExpandToggle — the chevron that opens and closes a Module or Topic.
 * Lessons are leaves and never render one.
 *
 * The chevron rotates rather than swapping icons, so the state change reads as
 * one continuous motion alongside the Collapse transition.
 *
 * `className` carries the vertical offset from the parent: each level puts its
 * small "MODULE"/"TOPIC" caption above the title, so the offset that centres
 * the chevron on the title line differs by level.
 */
function ExpandToggle({ expanded, onToggle, label, className = '' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={label}
      className={[
        className, // parent supplies the top offset that lines it up with the title
        'flex size-6 shrink-0 items-center justify-center rounded-md',
        'text-slate-400 transition-colors',
        'hover:bg-brand-orange/10 hover:text-brand-orange',
        'focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none',
      ].join(' ')}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={[
          'size-3.5 transition-transform duration-300 motion-reduce:transition-none',
          expanded ? 'rotate-90' : 'rotate-0',
        ].join(' ')}
      >
        <path d="M7 4l6 6-6 6" />
      </svg>
    </button>
  )
}

export default ExpandToggle
