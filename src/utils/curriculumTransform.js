/**
 * curriculumTransform.js — turns Gemini's raw output into real curriculum
 * nodes and appends them to the tree.
 *
 * This is the seam between "data we did not write" and "data the whole app
 * trusts". Everything downstream — every component, every helper in
 * curriculumTree.js — assumes each node has an id, a string title, a string
 * description, and the right child array. These two functions are what make
 * that true, so they are deliberately defensive: the AI response is treated as
 * untrusted shape, not as a promise.
 *
 * Both functions are pure. Neither mutates the existing curriculum, its
 * modules array, or any node inside it — a failed or partial upload must leave
 * the user's work exactly as it was.
 */

/**
 * Give every node from the AI a fresh id and fill in anything it omitted.
 *
 * Ids come from crypto.randomUUID(), which cannot collide with the ids already
 * in the tree (`seed-*` from the seed, `module-1`, `topic-2`, ... from
 * newId()). That matters because a node is addressed by its path of ids — a
 * duplicate id would make one path match two nodes.
 *
 * The `??` defaults are the reason a missing title or description can never
 * crash a render: the components always receive a string. Note `??` and not
 * `||`, so a deliberate empty-string description survives as empty (and shows
 * the "Click to add description" placeholder) instead of being replaced.
 *
 * `expanded: true` means an uploaded curriculum arrives open, so the user sees
 * what was extracted rather than a stack of closed cards.
 *
 * @param {unknown} modulesRaw the `modules` array from the API response
 * @throws {Error} if there is nothing usable to add
 * @returns {Array} fully-formed module nodes
 */
export function assignFreshIds(modulesRaw) {
  if (!Array.isArray(modulesRaw) || modulesRaw.length === 0) {
    throw new Error('AI returned no modules')
  }

  return modulesRaw.map((m) => ({
    id: crypto.randomUUID(),
    title: m.title ?? 'Untitled Module',
    description: m.description ?? '',
    expanded: true,
    topics: (m.topics ?? []).map((t) => ({
      id: crypto.randomUUID(),
      title: t.title ?? 'Untitled Topic',
      description: t.description ?? '',
      expanded: true,
      lessons: (t.lessons ?? []).map((l) => ({
        id: crypto.randomUUID(),
        title: l.title ?? 'Untitled Lesson',
        description: l.description ?? '',
      })),
    })),
  }))
}

/**
 * Append the AI's modules to the end of the curriculum.
 *
 * Additive by design: nothing existing is replaced, reordered or removed,
 * which is why the upload needs no "are you sure?" step. The result is an
 * ordinary curriculum object — the new modules are indistinguishable from
 * hand-built ones and are immediately editable through the same components.
 *
 * If assignFreshIds throws, this throws too and the caller keeps the old
 * curriculum untouched.
 *
 * @param {object} curriculum     current state
 * @param {unknown} newModulesRaw the `modules` array from the API response
 * @returns {object} a new curriculum object
 */
export function appendModulesToCurriculum(curriculum, newModulesRaw) {
  const newModules = assignFreshIds(newModulesRaw)
  return { ...curriculum, modules: [...curriculum.modules, ...newModules] }
}
