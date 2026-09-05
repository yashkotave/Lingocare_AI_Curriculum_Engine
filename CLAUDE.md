# Lingocare Curriculum Creation Engine

This file is the single source of truth for what this project is and is not.
Read it before making any change. If a request conflicts with the OUT OF SCOPE
section, say so instead of silently building the thing.

---

## PURPOSE

A curriculum builder with the hierarchy:

```
Curriculum → Module → Topic → Lesson
```

Nursing schools use it to structure course content.

The feel to aim for is **"Notion meets a structured document"** — a clean
surface with clear nesting. The structure should be readable at a glance, and
the chrome should stay out of the way.

---

## DATA MODEL

One nested object, held in React state. Each level keeps its children under
its own named key, and containers carry their own open/closed flag:

```js
curriculum = {
  id, title, description,
  modules: [
    {
      id, title, description, expanded,
      topics: [
        {
          id, title, description, expanded,
          lessons: [
            { id, title, description }        // leaf: no children, no expanded
          ]
        }
      ]
    }
  ]
}
```

So the content fields are always and only `id`, `title`, `description`. The
extra keys are structural, not content: `modules` / `topics` / `lessons` hold
the next level down, and `expanded` is UI state for the chevron. A Lesson is
the deepest level — it has neither.

**NOTHING ELSE.** Specifically, do not add:

- instructor / author / owner fields
- hours, duration, credits, or any time estimate
- activities, homework, assignments, assessments
- linked lessons, cross-references, prerequisites
- tags, status, ordering metadata, timestamps

Keep the model minimal. If a feature seems to need an extra field, ask first.

Ids must be unique across the whole tree, because a node is addressed by the
list of ids leading to it (see the `path` convention below). `newId()` hands
out `module-1`, `topic-2`, … so the seed's hardcoded ids are namespaced
`seed-` to stay clear of them.

---

## OUT OF SCOPE

Do not build these, ever, unless explicitly asked for later:

- **Sidebar / global navigation** — this is a single-page app with no routing.
- **Authentication** — no login, no users, no roles.
- **Database or any backend persistence** — no API layer, no localStorage, no
  file export/import as a persistence mechanism.

Everything lives in **React state only, in-memory**. State resets on refresh,
and that is the intended behaviour.

---

## INTERACTION MODEL

- **Titles are click-to-edit inline.** Clicking a title turns it into an
  editable field in place. No modals. No separate edit screens or routes.
- **Descriptions are click-to-type.** When a description is empty, show a
  subtle placeholder such as `Click to add description` — it should invite the
  click without cluttering the layout.
- **Add controls are scoped per level.** Each level has its own control:
  `+ Add Module`, `+ Add Topic`, `+ Add Lesson`. An add control belongs to the
  node whose children it appends to; there is no single global "add" button.
- **Each item has a delete control**, revealed on hover or keyboard focus,
  with a two-step inline confirm (never a modal). The armed state reverts by
  itself after ~3s, or on hovering away, moving focus, or clicking elsewhere.
- **Nesting must be visually unambiguous at a glance.** As built: a Module is
  a card, and each level below is set behind another indent plus a light
  connecting line. Modules and Topics have an expand/collapse chevron;
  Lessons, being leaves, have neither a chevron nor an add control.

### As built
- Commit keys: **Enter** commits a title; a description is multi-line, so
  there Enter inserts a newline and **Ctrl/Cmd+Enter** commits. Clicking away
  commits either. **Escape** cancels and reverts.
- Editors open autofocused with the existing text pre-selected.
- New nodes are created untitled and drop straight into edit mode, so you can
  name them without a second click. Their titles show a muted `Untitled
  module` / `topic` / `lesson` placeholder until named.
- New containers arrive **expanded**; adding into a collapsed parent expands
  it so the new child isn't added out of sight.
- Collapsed subtrees are `inert`, keeping hidden controls out of the tab order.

---

## VISUAL STYLE

- Clean, minimal, generous whitespace.
- **Brand orange `#EC8601` is an accent, used sparingly.** Reserve it for
  things that are **interactive or active**: the `+ Add …` controls, focus
  rings, hover states (chevron, module card border, the lesson bullet), and
  the one brand eyebrow above the curriculum title. It is **not** a background
  color for cards, sections, or the page, and not static decoration — the
  `MODULE` / `TOPIC` captions are deliberately neutral slate, not orange.
  Measured: orange covers under 2% of the viewport on first paint.
- Neutral base: white surfaces, slate text, light slate borders.

---

## STACK & CONVENTIONS

- **React 19** + **Vite 8**, **JavaScript only — no TypeScript.** All component
  files are `.jsx`.
- **TailwindCSS v4.** Tailwind v4 is CSS-first: there is **no
  `tailwind.config.js`**. The theme is declared in `src/index.css` inside the
  `@theme` block, and Tailwind is wired in through the `@tailwindcss/vite`
  plugin in `vite.config.js`.
- Brand color utilities available from the theme:
  - `brand-orange` → `#EC8601` (e.g. `bg-brand-orange`, `text-brand-orange`)
  - `brand-orange-dark` → `#D17700` (hover state for orange buttons)
  - `brand-orange-tint` → `#FDF3E6` (faint wash for active/selected rows)
- Single-page app. **No router** — do not add `react-router` or any routing.

### Files

```
src/
  main.jsx                        React entry, imports index.css
  index.css                       Tailwind import + @theme (brand color)
  App.jsx                         renders <CurriculumBuilder />
  data/
    seedCurriculum.js             the one sample curriculum loaded on start
  utils/
    curriculumTree.js             ALL tree read/write rules; pure, no React
  components/
    CurriculumBuilder.jsx         the only stateful component; owns the tree
    ModuleItem.jsx                Module level; children are Topics
    TopicItem.jsx                 Topic level; children are Lessons
    LessonItem.jsx                Lesson level; leaf
    EditableText.jsx              the one reusable inline-edit primitive,
                                  used by BOTH titles and descriptions
    ExpandToggle.jsx              the chevron (Modules and Topics only)
    AddButton.jsx                 the scoped "+ Add …" control
    DeleteButton.jsx              delete + its two-step inline confirm
    Collapse.jsx                  animated show/hide wrapper
```

### How data flows

Read `utils/curriculumTree.js` first — it explains the whole model in one
file. The short version:

- **One `useState`** in `CurriculumBuilder.jsx` holds the entire curriculum.
  Nothing else in the app holds tree state.
- A node is addressed by its **`path`**: the array of ids from the root down
  to it. `[]` is the curriculum, `[moduleId]` a module, `[moduleId, topicId]`
  a topic, `[moduleId, topicId, lessonId]` a lesson. `path.length` is the
  depth, which is how one recursive walk serves every level.
- The tree flows **down** as props; each item also receives its own `path`.
  Changes flow **up** through the `actions` object —
  `onFieldChange(path, field, value)`, `onToggle(path)`, `onAdd(parentPath)`,
  `onDelete(path)`.
- Each handler is a one-liner: it calls a **pure** helper from
  `curriculumTree.js`, which returns a **new** tree, and hands it to
  `setCurriculum`. Untouched sibling subtrees are reused by reference.
- Components never splice the tree themselves, and they never need to know
  how it is shaped. Keep it that way — new tree rules belong in
  `curriculumTree.js`, not in a component.

`EditableText.jsx` is deliberately the only place inline-editing behaviour
lives. Do not write a second inline-edit implementation.

### Commands

```
npm run dev       # dev server
npm run build     # production build
npm run lint      # oxlint
```

---

## CURRENT STATE

**Phase 1 — scaffold.** Done. Vite + React 19 + Tailwind v4, brand color in
the theme, component files in place.

**Phase 2 — manual creation flow (Part 1 of the brief).** Done and verified:

- Single nested `useState` tree, seeded with one realistic nursing Module →
  Topic → Lesson.
- Pure recursive helpers for edit / add / delete / toggle at any depth.
- `EditableText` click-to-edit on every title and description at all four
  levels, including the curriculum header itself.
- Scoped `+ Add Module / Topic / Lesson`, two-step inline delete, animated
  expand/collapse, empty state, visible focus rings throughout.

**Not built yet — do not add without being asked:**

- **the AI upload feature** (Part 2 of the brief)
- persistence, auth, sidebar/navigation, routing (all permanently out of scope
  per the section above)

### Verification

Behaviour was checked end-to-end, not just eyeballed:

- 20 groups of assertions over `curriculumTree.js` (every operation at every
  depth, immutability, id uniqueness, subtree deletion).
- 46 browser checks driving the real UI (editing all 8 title/description
  fields, commit/cancel keys, add and delete at every level, collapse
  clipping, hover/focus reveal scoping, keyboard-only operation, empty state,
  and no console errors or warnings).

These live outside the repo, in the session scratch dir — there is no test
runner wired into the project. If you change tree logic or the interaction
model, re-verify by hand or ask for a suite to be added.
