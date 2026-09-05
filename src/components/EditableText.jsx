import { useEffect, useRef, useState } from 'react'

/**
 * EditableText — the one click-to-edit primitive, used for every title and
 * every description at all four levels. There is deliberately no second
 * inline-edit implementation anywhere in the app.
 *
 * Two states, swapped in place. No modal, no separate edit screen:
 *
 *   display  a text button showing `value`, or `placeholder` when empty
 *   editing  an <input> (titles) or auto-growing <textarea> (descriptions),
 *            autofocused with its text pre-selected
 *
 * Commit / cancel:
 *   Enter          commits a title (in a description it inserts a newline)
 *   Ctrl/Cmd+Enter commits a description
 *   clicking away  commits (blur)
 *   Escape         cancels and reverts to the value we started from
 *
 * Props
 *   value       string   current text
 *   onCommit    fn       called with the new string, only when it changed
 *   variant     string   'title' | 'description' — weight and tone
 *   placeholder string   shown muted when value is empty; never an empty box
 *   className   string   size classes from the parent (levels differ in scale)
 *   label       string   accessible name for the display button
 *   autoEdit    bool     mount straight into edit mode (used for new nodes)
 */
function EditableText({
  value,
  onCommit,
  variant = 'description',
  placeholder = 'Click to add description',
  className = '',
  label,
  autoEdit = false,
}) {
  const isTitle = variant === 'title'

  // `autoEdit` is read once, at mount. A freshly added node mounts with it
  // true so the user can name it without a second click.
  const [editing, setEditing] = useState(autoEdit)
  const [draft, setDraft] = useState(value)
  const fieldRef = useRef(null)

  // On entering edit mode: focus, pre-select the text, and size the textarea
  // to its content so long descriptions don't open in a one-line box.
  useEffect(() => {
    if (!editing) return
    const field = fieldRef.current
    if (!field) return
    field.focus()
    field.select()
    if (!isTitle) resizeToContent(field)
  }, [editing, isTitle])

  function startEditing() {
    setDraft(value) // always start from the current value, not a stale draft
    setEditing(true)
  }

  function commit() {
    setEditing(false)
    const next = draft.trim()
    if (next !== value) onCommit(next)
  }

  function cancel() {
    setEditing(false)
    setDraft(value)
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
      return
    }
    // Enter commits titles outright; descriptions are multi-line, so there it
    // needs a modifier and a bare Enter stays a newline.
    if (event.key === 'Enter' && (isTitle || event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      commit()
    }
  }

  /* ---------------------------- editing ---------------------------- */

  if (editing) {
    const fieldClasses = [
      'w-full rounded-md bg-white px-2 py-1 outline-none',
      'ring-2 ring-brand-orange',
      isTitle ? 'font-medium text-slate-900' : 'text-slate-600',
      className,
    ].join(' ')

    if (isTitle) {
      return (
        <input
          ref={fieldRef}
          type="text"
          value={draft}
          aria-label={label}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          className={fieldClasses}
        />
      )
    }

    return (
      <textarea
        ref={fieldRef}
        rows={1}
        value={draft}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => {
          setDraft(event.target.value)
          resizeToContent(event.target)
        }}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        className={`${fieldClasses} resize-none overflow-hidden`}
      />
    )
  }

  /* ---------------------------- display ---------------------------- */

  const isEmpty = value.trim().length === 0

  // A real <button> gives us keyboard access and a focus ring for free, so the
  // whole flow works without a mouse.
  return (
    <button
      type="button"
      onClick={startEditing}
      aria-label={label}
      className={[
        'block w-full rounded-md px-2 py-1 text-left transition-colors',
        'hover:bg-slate-100/80',
        'focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none',
        isTitle ? 'font-medium' : 'whitespace-pre-wrap',
        isEmpty
          ? 'text-slate-400 italic'
          : isTitle
            ? 'text-slate-900'
            : 'text-slate-600',
        className,
      ].join(' ')}
    >
      {isEmpty ? placeholder : value}
    </button>
  )
}

/** Grow a textarea to fit its content instead of scrolling inside a fixed box. */
function resizeToContent(field) {
  field.style.height = 'auto'
  field.style.height = `${field.scrollHeight}px`
}

export default EditableText
