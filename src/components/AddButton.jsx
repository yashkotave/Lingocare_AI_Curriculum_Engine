/**
 * AddButton — the scoped "+ Add …" control.
 *
 * Every level renders its own, and each one is passed the path of the parent
 * it appends to, so there is never a single global "add" that has to guess
 * where the new node belongs.
 *
 *   variant 'primary'  filled brand orange — the top-level "+ Add Module"
 *   variant 'subtle'   orange text on a tint — nested adds, quieter
 *
 * Brand orange lives on these buttons because they are the primary action.
 */
function AddButton({ label, onClick, variant = 'subtle' }) {
  const base = [
    'inline-flex items-center gap-1.5 rounded-md text-sm font-medium',
    'transition-colors focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-brand-orange focus-visible:ring-offset-2',
  ].join(' ')

  const byVariant = {
    primary:
      'bg-brand-orange px-3.5 py-2 text-white shadow-sm hover:bg-brand-orange-dark',
    subtle:
      'px-2 py-1.5 text-brand-orange hover:bg-brand-orange-tint',
  }

  return (
    <button type="button" onClick={onClick} className={`${base} ${byVariant[variant]}`}>
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
        className="size-3.5"
      >
        <path d="M10 4v12M4 10h12" />
      </svg>
      {label}
    </button>
  )
}

export default AddButton
