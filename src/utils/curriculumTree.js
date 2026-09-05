/**
 * curriculumTree.js — every rule for changing the curriculum tree lives here.
 *
 * WHY THIS FILE EXISTS
 * Components never reach into the tree and splice arrays themselves. They say
 * *what* changed — this node, this field, this value — and these functions
 * return a brand-new tree with that one change applied. Everything here is
 * pure: no mutation, no React, no side effects. That keeps the components
 * about layout and keeps the data rules in one readable place.
 *
 * HOW A NODE IS ADDRESSED — the "path"
 * A path is an array of ids running from the root down to the node:
 *
 *   []                            -> the curriculum itself
 *   [moduleId]                    -> a module
 *   [moduleId, topicId]           -> a topic
 *   [moduleId, topicId, lessonId] -> a lesson
 *
 * `path.length` is therefore the node's depth, and depth is all we need to
 * know which key holds that node's children. That is what lets a single
 * recursive walk serve every level instead of three near-identical copies.
 */

/**
 * The tree is heterogeneous — each level keeps its children under a different
 * key — so we look the key up by depth. Index === depth.
 */
const LEVELS = [
  { name: 'curriculum', childKey: 'modules', childLabel: 'Module' },
  { name: 'module', childKey: 'topics', childLabel: 'Topic' },
  { name: 'topic', childKey: 'lessons', childLabel: 'Lesson' },
  { name: 'lesson', childKey: null, childLabel: null }, // leaf: nothing below
]

/* ------------------------------------------------------------------ *
 * Creating nodes
 * ------------------------------------------------------------------ */

let idCounter = 0

/**
 * Session-unique id, e.g. "module-4". Ids only need to be stable while the
 * page is open.
 *
 * INVARIANT: because a path is a list of ids, two nodes sharing an id would
 * make one path match both. Any hardcoded id (see data/seedCurriculum.js)
 * must therefore stay out of the `<prefix>-<number>` space this produces.
 */
export function newId(prefix) {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

// New nodes start untitled (the UI drops straight into edit mode on the title)
// and, per the brief, containers start EXPANDED so the child you just added is
// visible immediately.
export const createModule = () => ({
  id: newId('module'),
  title: '',
  description: '',
  expanded: true,
  topics: [],
})

export const createTopic = () => ({
  id: newId('topic'),
  title: '',
  description: '',
  expanded: true,
  lessons: [],
})

export const createLesson = () => ({
  id: newId('lesson'),
  title: '',
  description: '',
})

const FACTORIES = [createModule, createTopic, createLesson]

/**
 * Which kind of child belongs under this parent? Driven entirely by depth, so
 * callers just say "add a child here" and pass the parent's path.
 */
export function createChildFor(parentPath) {
  const factory = FACTORIES[parentPath.length]
  if (!factory) throw new Error(`Nothing can be added below depth ${parentPath.length}`)
  return factory()
}

/** "Module" | "Topic" | "Lesson" — used for the scoped "+ Add …" button text. */
export function childLabelFor(parentPath) {
  return LEVELS[parentPath.length].childLabel
}

/** "curriculum" | "module" | "topic" | "lesson" — used for aria labels. */
export function levelNameFor(path) {
  return LEVELS[path.length].name
}

/* ------------------------------------------------------------------ *
 * The one recursive primitive
 * ------------------------------------------------------------------ */

/**
 * Walk `path` down from `node` and replace the node it points at with
 * `transform(node, depth)`. Every ancestor along the way is shallow-copied;
 * every untouched sibling subtree is reused by reference.
 *
 * This is the only function that knows how to traverse the tree. All four
 * public operations below are written in terms of it.
 */
function mapNodeAtPath(node, path, transform, depth = 0) {
  // Arrived: hand the node to the caller's transform and stop.
  if (path.length === 0) return transform(node, depth)

  const { childKey } = LEVELS[depth]
  const [nextId, ...restOfPath] = path

  return {
    ...node,
    [childKey]: node[childKey].map((child) =>
      child.id === nextId
        ? mapNodeAtPath(child, restOfPath, transform, depth + 1)
        : child,
    ),
  }
}

/* ------------------------------------------------------------------ *
 * The four operations the UI actually performs
 * ------------------------------------------------------------------ */

/**
 * Edit a `title` or `description` at any depth, including the curriculum root.
 */
export function setNodeField(curriculum, path, field, value) {
  return mapNodeAtPath(curriculum, path, (node) => ({ ...node, [field]: value }))
}

/** Open/close a container. Lessons are leaves and never call this. */
export function toggleExpanded(curriculum, path) {
  return mapNodeAtPath(curriculum, path, (node) => ({
    ...node,
    expanded: !node.expanded,
  }))
}

/**
 * Append `child` to the node at `parentPath`.
 *
 * Adding into a collapsed parent also expands it — otherwise the new item
 * lands out of sight and the click looks like it did nothing.
 */
export function addChild(curriculum, parentPath, child) {
  return mapNodeAtPath(curriculum, parentPath, (parent, depth) => {
    const { childKey } = LEVELS[depth]
    return {
      ...parent,
      // The curriculum root has no `expanded` field; don't invent one for it.
      ...('expanded' in parent ? { expanded: true } : null),
      [childKey]: [...parent[childKey], child],
    }
  })
}

/**
 * Remove the node at `path`.
 *
 * Deleting is a change to the node's *parent* (its child list shrinks), so we
 * walk to the parent and filter. Dropping the node drops its whole subtree
 * with it, which is the intended behaviour for Modules and Topics.
 */
export function deleteNode(curriculum, path) {
  const parentPath = path.slice(0, -1)
  const targetId = path[path.length - 1]

  return mapNodeAtPath(curriculum, parentPath, (parent, depth) => {
    const { childKey } = LEVELS[depth]
    return {
      ...parent,
      [childKey]: parent[childKey].filter((child) => child.id !== targetId),
    }
  })
}
