/**
 * domIds.js — DOM ids that more than one module needs to agree on.
 *
 * Kept out of the component files so those export only components (which is
 * what React Fast Refresh needs to work reliably).
 */

/**
 * Anchor for a module card. CurriculumBuilder scrolls to this after an upload
 * appends new modules; ModuleItem renders it.
 */
export const moduleDomId = (id) => `module-card-${id}`
