import AddButton from './AddButton.jsx'
import Collapse from './Collapse.jsx'
import DeleteButton from './DeleteButton.jsx'
import EditableText from './EditableText.jsx'
import ExpandToggle from './ExpandToggle.jsx'
import LessonItem from './LessonItem.jsx'

/**
 * TopicItem — the middle level. Owns a list of Lessons.
 *
 * Its lessons sit behind another indent and connecting line, so a Lesson is
 * never mistakable for a Topic even when scanning quickly. "+ Add Lesson"
 * lives inside this topic and only exists while it is expanded.
 *
 * Props
 *   topic    { id, title, description, expanded, lessons }
 *   path     id path to this topic: [moduleId, topicId]
 *   actions  the four handlers from CurriculumBuilder
 *   focusId  id of the just-added node, if any
 */
function TopicItem({ topic, path, actions, focusId }) {
  return (
    <div className="rounded-lg">
      {/* `group/topic` is scoped to this row so a hovered lesson below does not
          also reveal this topic's delete control. */}
      <div className="group/topic flex items-start gap-2 py-1">
        <ExpandToggle
          expanded={topic.expanded}
          onToggle={() => actions.onToggle(path)}
          label={`${topic.expanded ? 'Collapse' : 'Expand'} topic ${topic.title || 'untitled'}`}
          className="mt-3"
        />

        <div className="min-w-0 flex-1">
          <p className="px-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Topic
          </p>
          <h3>
            <EditableText
              value={topic.title}
              onCommit={(value) => actions.onFieldChange(path, 'title', value)}
              variant="title"
              placeholder="Untitled topic"
              label="Topic title"
              className="text-[15px]"
              autoEdit={focusId === topic.id}
            />
          </h3>
          <EditableText
            value={topic.description}
            onCommit={(value) => actions.onFieldChange(path, 'description', value)}
            variant="description"
            placeholder="Click to add description"
            label="Topic description"
            className="text-sm"
          />
        </div>

        <DeleteButton
          onDelete={() => actions.onDelete(path)}
          itemLabel="topic"
          className="mt-1 opacity-0 transition-opacity group-hover/topic:opacity-100 group-focus-within/topic:opacity-100"
        />
      </div>

      <Collapse open={topic.expanded}>
        {/* Third indent + connecting line: this is the Lesson tier. */}
        <div className="mt-1 mb-2 ml-3 space-y-0.5 border-l border-slate-200 pl-5">
          {topic.lessons.map((lesson) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              path={[...path, lesson.id]}
              actions={actions}
              focusId={focusId}
            />
          ))}

          {topic.lessons.length === 0 && (
            <p className="px-2 py-1 text-sm text-slate-400 italic">No lessons yet.</p>
          )}

          <AddButton label="Add Lesson" onClick={() => actions.onAdd(path)} />
        </div>
      </Collapse>
    </div>
  )
}

export default TopicItem
