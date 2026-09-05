/**
 * Collapse — animates its children open and closed.
 *
 * Uses the grid-template-rows 0fr -> 1fr technique so the height transition
 * works against the content's natural height. A plain `height: auto` cannot
 * be transitioned, and hard-coding a max-height would clip long modules.
 *
 * `inert` while closed keeps collapsed content out of the tab order, so
 * keyboard users can't land on a control they can't see.
 */
function Collapse({ open, children }) {
  return (
    <div
      inert={!open || undefined}
      className={[
        'grid transition-all duration-300 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      ].join(' ')}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}

export default Collapse
