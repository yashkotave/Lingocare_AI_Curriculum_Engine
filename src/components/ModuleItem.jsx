import AddButton from './AddButton.jsx'
import Collapse from './Collapse.jsx'
import DeleteButton from './DeleteButton.jsx'
import EditableText from './EditableText.jsx'
import ExpandToggle from './ExpandToggle.jsx'
import TopicItem from './TopicItem.jsx'

/**
 * ModuleItem — the first level under the Curriculum. Owns a list of Topics.
 *
 * A Module is the only level drawn as a full card, which gives the outermost
 * tier a hard boundary; everything nested inside is separated by indentation
 * and a light connecting line instead. The card border warms toward brand
 * orange on hover/focus — an interactive accent, not a static one.
 *
 * Props
 *   module   { id, title, description, expanded, topics }
 *   path     id path to this module: [moduleId]
 *   actions  the four handlers from CurriculumBuilder
 *   focusId  id of the just-added node, if any
 */
function ModuleItem({ module, path, actions, focusId }) {
  return (
    <section
      className={[
        'rounded-xl border border-slate-200 bg-white shadow-sm',
        'transition-colors hover:border-brand-orange/40 focus-within:border-brand-orange/40',
      ].join(' ')}
    >
      {/* `group/module` sits on this row, not the whole card: hovering a nested
          lesson must not reveal this module's delete control too. */}
      <div className="group/module flex items-start gap-2 p-4">
        <ExpandToggle
          expanded={module.expanded}
          onToggle={() => actions.onToggle(path)}
          label={`${module.expanded ? 'Collapse' : 'Expand'} module ${module.title || 'untitled'}`}
          className="mt-4"
        />

        <div className="min-w-0 flex-1">
          <p className="px-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Module
          </p>
          <h2>
            <EditableText
              value={module.title}
              onCommit={(value) => actions.onFieldChange(path, 'title', value)}
              variant="title"
              placeholder="Untitled module"
              label="Module title"
              className="text-lg"
              autoEdit={focusId === module.id}
            />
          </h2>
          <EditableText
            value={module.description}
            onCommit={(value) => actions.onFieldChange(path, 'description', value)}
            variant="description"
            placeholder="Click to add description"
            label="Module description"
            className="text-sm"
          />
        </div>

        <DeleteButton
          onDelete={() => actions.onDelete(path)}
          itemLabel="module"
          className="mt-1 opacity-0 transition-opacity group-hover/module:opacity-100 group-focus-within/module:opacity-100"
        />
      </div>

      <Collapse open={module.expanded}>
        {/* Second indent + connecting line: this is the Topic tier. */}
        <div className="px-4 pb-3">
          <div className="ml-3 space-y-1 border-l border-slate-200 pl-5">
            {module.topics.map((topic) => (
              <TopicItem
                key={topic.id}
                topic={topic}
                path={[...path, topic.id]}
                actions={actions}
                focusId={focusId}
              />
            ))}

            {module.topics.length === 0 && (
              <p className="px-2 py-1 text-sm text-slate-400 italic">No topics yet.</p>
            )}

            <AddButton label="Add Topic" onClick={() => actions.onAdd(path)} />
          </div>
        </div>
      </Collapse>
    </section>
  )
}

export default ModuleItem
