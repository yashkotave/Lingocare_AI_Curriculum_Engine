import { useMemo, useState } from 'react'

import { createSeedCurriculum } from '../data/seedCurriculum.js'
import {
  addChild,
  createChildFor,
  deleteNode,
  setNodeField,
  toggleExpanded,
} from '../utils/curriculumTree.js'
import AddButton from './AddButton.jsx'
import EditableText from './EditableText.jsx'
import ModuleItem from './ModuleItem.jsx'

/**
 * CurriculumBuilder — the only stateful component in the app.
 *
 * HOW DATA FLOWS
 * The whole curriculum is one nested object in one useState. It flows *down*
 * as props, and every level receives its own `path` (the array of ids that
 * locates it in the tree — see utils/curriculumTree.js).
 *
 * Changes flow *up* through `actions`. A child never knows how the tree is
 * shaped; it only says "field changed at my path" or "add a child at my
 * path". This component hands that to a pure helper, which returns a new
 * tree, and setState swaps it in. One direction down, one direction up, and
 * all the tree-shaping rules in a single file.
 *
 * Nothing is persisted — state is in-memory and resets on refresh, by design.
 */
function CurriculumBuilder() {
  const [curriculum, setCurriculum] = useState(createSeedCurriculum)

  // The node that was just added. Passed down so its title mounts straight
  // into edit mode — you add a Topic and can immediately type its name.
  const [focusId, setFocusId] = useState(null)

  // Stable object so the item components aren't handed new callbacks on every
  // keystroke. Each handler is a one-liner: pick the helper, pass the path.
  const actions = useMemo(
    () => ({
      /** Edit a title or description at any depth. */
      onFieldChange: (path, field, value) =>
        setCurriculum((current) => setNodeField(current, path, field, value)),

      /** Open or close a Module or Topic. */
      onToggle: (path) =>
        setCurriculum((current) => toggleExpanded(current, path)),

      /**
       * Add a child to the node at `parentPath`. Which kind of child that is
       * follows from the path's depth, so the caller doesn't specify it.
       */
      onAdd: (parentPath) => {
        const child = createChildFor(parentPath)
        setCurriculum((current) => addChild(current, parentPath, child))
        setFocusId(child.id)
      },

      /** Remove a node and, with it, everything nested underneath. */
      onDelete: (path) => setCurriculum((current) => deleteNode(current, path)),
    }),
    [],
  )

  const hasModules = curriculum.modules.length > 0

  return (
    <div className="min-h-full bg-slate-50/60">
      <div className="mx-auto max-w-3xl px-6 py-14">
        {/* The curriculum root is editable like any other node — it just gets
            the largest type and sits above a dividing rule. */}
        <header className="mb-10 border-b border-slate-200 pb-8">
          <p className="px-2 text-xs font-semibold tracking-widest text-brand-orange uppercase">
            Lingocare Curriculum
          </p>
          <h1 className="mt-2">
            <EditableText
              value={curriculum.title}
              onCommit={(value) => actions.onFieldChange([], 'title', value)}
              variant="title"
              placeholder="Untitled curriculum"
              label="Curriculum title"
              className="text-3xl tracking-tight"
            />
          </h1>
          <div className="mt-1 max-w-2xl">
            <EditableText
              value={curriculum.description}
              onCommit={(value) => actions.onFieldChange([], 'description', value)}
              variant="description"
              placeholder="Click to add description"
              label="Curriculum description"
              className="text-base"
            />
          </div>
        </header>

        {hasModules ? (
          <>
            <div className="space-y-4">
              {curriculum.modules.map((module) => (
                <ModuleItem
                  key={module.id}
                  module={module}
                  path={[module.id]}
                  actions={actions}
                  focusId={focusId}
                />
              ))}
            </div>

            {/* Top-level add lives on the container, not inside any module. */}
            <div className="mt-5">
              <AddButton
                label="Add Module"
                onClick={() => actions.onAdd([])}
                variant="primary"
              />
            </div>
          </>
        ) : (
          <EmptyState onAddModule={() => actions.onAdd([])} />
        )}
      </div>
    </div>
  )
}

/**
 * Shown when the curriculum has no modules. The point is that an empty
 * curriculum still reads as a starting point rather than a blank void, with
 * the one obvious next action front and centre.
 */
function EmptyState({ onAddModule }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <h2 className="text-base font-medium text-slate-900">
        This curriculum is empty
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
        Start with a module — the broad unit of the program. Topics and lessons
        nest inside it.
      </p>
      <div className="mt-6 flex justify-center">
        <AddButton label="Add Module" onClick={onAddModule} variant="primary" />
      </div>
    </div>
  )
}

export default CurriculumBuilder
