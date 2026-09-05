import DeleteButton from './DeleteButton.jsx'
import EditableText from './EditableText.jsx'

/**
 * LessonItem — the leaf. No chevron, no add control, no children: just an
 * editable title and description, plus delete.
 *
 * A small dot stands in for the chevron so lessons still line up with the
 * levels above them; it warms to brand orange on hover, which is the only
 * decoration here that reacts to the user.
 *
 * Props
 *   lesson   { id, title, description }
 *   path     id path to this lesson: [moduleId, topicId, lessonId]
 *   actions  the four handlers from CurriculumBuilder
 *   focusId  id of the just-added node, if any (drops it into edit mode)
 */
function LessonItem({ lesson, path, actions, focusId }) {
  return (
    <div className="group/lesson flex items-start gap-2 rounded-md py-1 transition-colors hover:bg-slate-50">
      <span
        aria-hidden="true"
        className="mt-3 size-1.5 shrink-0 rounded-full bg-slate-300 transition-colors group-hover/lesson:bg-brand-orange"
      />

      <div className="min-w-0 flex-1">
        <EditableText
          value={lesson.title}
          onCommit={(value) => actions.onFieldChange(path, 'title', value)}
          variant="title"
          placeholder="Untitled lesson"
          label="Lesson title"
          className="text-sm"
          autoEdit={focusId === lesson.id}
        />
        <EditableText
          value={lesson.description}
          onCommit={(value) => actions.onFieldChange(path, 'description', value)}
          variant="description"
          placeholder="Click to add description"
          label="Lesson description"
          className="text-sm"
        />
      </div>

      <DeleteButton
        onDelete={() => actions.onDelete(path)}
        itemLabel="lesson"
        className="mt-1.5 opacity-0 transition-opacity group-hover/lesson:opacity-100 group-focus-within/lesson:opacity-100"
      />
    </div>
  )
}

export default LessonItem
