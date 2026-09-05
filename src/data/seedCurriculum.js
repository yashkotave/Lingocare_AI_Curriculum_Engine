/**
 * seedCurriculum.js — the single sample the page loads with.
 *
 * The brief asks that the app never look empty on first load: one realistic
 * nursing-education Module -> Topic -> Lesson chain is enough to show the
 * hierarchy and invite the first click.
 *
 * Ids are literal strings here so the seed stays stable and easy to read, and
 * they are all namespaced `seed-` to keep them out of the way of the ids that
 * newId() hands out at runtime ("module-1", "topic-2", ...). Without that
 * namespace the first module you added would collide with the seed's, and a
 * path would match two nodes at once.
 *
 * This is in-memory only — nothing is persisted, and a refresh resets it.
 */
export function createSeedCurriculum() {
  return {
    id: 'seed-curriculum',
    title: 'Certified Nursing Assistant — Program 1',
    description:
      'Foundational program preparing students for the CNA certification exam and supervised clinical practice.',
    modules: [
      {
        id: 'seed-module-1',
        title: 'Module 1 — Becoming a Nursing Assistant',
        description:
          'Orientation to the role, its boundaries, and the professional standards that govern daily practice.',
        expanded: true,
        topics: [
          {
            id: 'seed-topic-1',
            title: 'Topic 1 — Professional Self-Understanding',
            description:
              'How nursing assistants see themselves within the wider care team.',
            expanded: true,
            lessons: [
              {
                id: 'seed-lesson-1',
                title: 'Lesson 1.1 — History & Professional Identity',
                description:
                  'Origins of the nursing assistant role and what professional identity means at the bedside.',
              },
            ],
          },
        ],
      },
    ],
  }
}
