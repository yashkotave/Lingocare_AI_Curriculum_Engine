import { useEffect, useMemo, useRef, useState } from 'react'

import { createSeedCurriculum } from '../data/seedCurriculum.js'
import { assignFreshIds } from '../utils/curriculumTransform.js'
import {
  addChild,
  createChildFor,
  deleteNode,
  setNodeField,
  toggleExpanded,
} from '../utils/curriculumTree.js'
import { moduleDomId } from '../utils/domIds.js'
import { parseCurriculumPdf } from '../utils/uploadCurriculum.js'
import AddButton from './AddButton.jsx'
import EditableText from './EditableText.jsx'
import ModuleItem from './ModuleItem.jsx'
import ParsingSkeleton from './ParsingSkeleton.jsx'
import UploadCurriculumButton from './UploadCurriculumButton.jsx'
import UploadNotice from './UploadNotice.jsx'

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
 * PDF UPLOAD
 * The upload is just another way to produce modules. Once parsed, the AI's
 * modules are turned into ordinary nodes (utils/curriculumTransform.js) and
 * appended to the same state — so they render through the same ModuleItem /
 * TopicItem / LessonItem / EditableText components and are editable and
 * deletable immediately. There is no separate "AI content" mode or branch.
 *
 * Nothing is persisted — state is in-memory and resets on refresh, by design.
 */
function CurriculumBuilder() {
  const [curriculum, setCurriculum] = useState(createSeedCurriculum)

  // The node that was just added. Passed down so its title mounts straight
  // into edit mode — you add a Topic and can immediately type its name.
  const [focusId, setFocusId] = useState(null)

  /* ------------------------- upload flow state ------------------------- */

  const [isParsing, setIsParsing] = useState(false)
  // { message, retryable } — retryable is decided when the error is caught, so
  // render never has to inspect a ref to know whether to offer "Try again".
  const [uploadError, setUploadError] = useState(null)
  const [addedCount, setAddedCount] = useState(null) // success note, null = hidden

  // Kept so the error banner's "Try again" can re-send the same file without
  // making the user find it in the file picker again. A ref, not state: it is
  // only ever read from an event handler.
  const lastFileRef = useRef(null)

  // Module to scroll to once React has painted it. A ref rather than state so
  // consuming it doesn't trigger another render.
  const pendingScrollRef = useRef(null)

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

  /**
   * Scroll to the first module that just arrived, once React has painted it.
   * Moving the viewport is a genuine external side effect, so it belongs in an
   * effect — and running it after commit is what guarantees the element exists.
   */
  useEffect(() => {
    const moduleId = pendingScrollRef.current
    if (!moduleId) return
    pendingScrollRef.current = null
    document
      .getElementById(moduleDomId(moduleId))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [curriculum])

  /**
   * Parse a PDF and append whatever comes back.
   *
   * The existing curriculum is only ever touched on success, and then only by
   * appending — so a failure at any stage leaves the user's work exactly as it
   * was.
   */
  async function handlePdfSelected(file) {
    lastFileRef.current = file
    setUploadError(null)
    setAddedCount(null)
    setIsParsing(true)

    try {
      const rawModules = await parseCurriculumPdf(file)

      // assignFreshIds mints UUIDs, so it must run exactly once — outside the
      // state updater. React invokes updaters twice in development; minting
      // inside one would put one set of ids in the committed tree and leave us
      // holding a different set to scroll to.
      //
      // The append itself is the same pure operation as
      // appendModulesToCurriculum(), but written against `current` so an edit
      // made to the header while parsing was in flight is not clobbered.
      const newModules = assignFreshIds(rawModules)
      setCurriculum((current) => ({
        ...current,
        modules: [...current.modules, ...newModules],
      }))

      pendingScrollRef.current = newModules[0].id
      setAddedCount(newModules.length)
    } catch (error) {
      // Every error reaching here already carries a message written for a
      // human (see utils/uploadCurriculum.js).
      setUploadError({
        message: error?.message || 'Something went wrong. Please try again.',
        // Retrying a file that failed validation would fail the same way, so
        // only offer it when the problem might be transient.
        retryable: error?.code !== 'INVALID_FILE',
      })
    } finally {
      setIsParsing(false)
    }
  }

  function retryLastUpload() {
    if (lastFileRef.current) handlePdfSelected(lastFileRef.current)
  }

  const hasModules = curriculum.modules.length > 0

  return (
    <div className="min-h-full bg-slate-50/60">
      <div className="mx-auto max-w-3xl px-6 py-14">
        {/* The curriculum root is editable like any other node — it just gets
            the largest type and sits above a dividing rule. */}
        <header className="mb-10 border-b border-slate-200 pb-8">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
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
            </div>

            <div className="mt-7">
              <UploadCurriculumButton
                onFileSelected={handlePdfSelected}
                busy={isParsing}
              />
            </div>
          </div>

          {/* Both notices sit inline, right under the button that produced
              them. Never a modal, never alert(). */}
          {uploadError && (
            <UploadNotice
              tone="error"
              onDismiss={() => setUploadError(null)}
              action={
                uploadError.retryable
                  ? { label: 'Try again', onClick: retryLastUpload }
                  : undefined
              }
            >
              {uploadError.message}
            </UploadNotice>
          )}

          {addedCount !== null && (
            <UploadNotice tone="success" onDismiss={() => setAddedCount(null)}>
              {addedCount} new {addedCount === 1 ? 'module' : 'modules'} added from
              your PDF — everything below is editable.
            </UploadNotice>
          )}
        </header>

        {/* While parsing, the curriculum area becomes a skeleton of itself.
            The page stays responsive throughout. */}
        {isParsing ? (
          <ParsingSkeleton />
        ) : hasModules ? (
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
        nest inside it. You can also upload a curriculum PDF to build one
        automatically.
      </p>
      <div className="mt-6 flex justify-center">
        <AddButton label="Add Module" onClick={onAddModule} variant="primary" />
      </div>
    </div>
  )
}

export default CurriculumBuilder
