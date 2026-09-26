# Storybook review: a third-party developer building a property panel

The compact-mantine Storybook is published at https://graphty.app/storybook/compact-mantine/.
This review reads it as a React developer who has never seen this repository and wants to build
a compact property panel. It was done against a static build of the `feat/compact-mantine-figma`
branch on 2026-09-26: 118 docs pages and 494 stories, every docs page screenshotted at full
length, every story rendered once and checked for a render error, every deep link checked
against the story index, and the Getting started and Tree snippets type-checked.

Screenshots and raw data are under `tmp/sb-review-shots/`, `tmp/sb-review-crawl.json` (per-page
stats and render errors) and `tmp/sb-review-text.json` (the rendered text of every docs page).

## Verdict

The structure is right. The sidebar reads top to bottom in the order a newcomer needs it
(Introduction, Foundations, Components grouped by job, Patterns, Themed Mantine), every
package component has exactly one page, every component page follows the same what / when /
usage / keyboard / measurements / props / stories shape, and every component page shows its
states in light and dark side by side. Select now has one page (Mantine `Select` and
`StyleSelect` together). `IconGroupRow` is gone and the SegmentedControl page carries the
replacement recipe.

What stops it being publishable today is a short list: every Markdown table in the
Introduction pages renders as raw pipe characters, seven stale sidebar sections from the old
layout are still indexed, the ComboInput page is still under a "Figma" section and one of its
stories fails, and the published text is full of pointers to a repository file
(`design/figma-spec.md`) that a reader cannot open.

## The five tasks

| Task | Found? | Where | Notes |
|---|---|---|---|
| A number with a unit | Yes | Components / Inputs / PanelField, story "With Unit" | Sidebar search "unit" finds it. "Choosing a component" also sends you to `CompoundRow` for "a width and its unit" -- but that page's tables are unreadable (finding 1). |
| Pick one of five icons | Only through an Overview | Themed Mantine / Selection / SegmentedControl, stories "Five Options" and "Pictures In A Panel Row" | Not under Components / Selection, where you would look first. The Selection and Inputs Overviews both point to it, and the Selection link works. Searching "icon" returns ToggleIconButton, ActionIcon and ThemeIcon first. |
| Search a list | Yes | Components / Inputs / SearchInput; Lists and trees / ResultRow "Driven From A Search Field" | Good. |
| A colour with opacity | Yes | Components / Colour / CompactColorInput | The first sentence of the page says exactly this. Searching "opacity" only finds "Without Opacity", which still lands on the right page. |
| A tree of layers I can reorder | Yes | Components / Lists and trees / Tree, stories "Flat Reorderable List" and "Dragging" | The usage snippet calls two helpers that do not exist (finding 5). Searching "layer" finds nothing. |

## Getting started

Introduction / Getting started takes you from `npm install` to a themed panel: install line,
peer dependencies, a complete `App` with `MantineProvider`, `ControlSection`, `FieldRow`,
`PanelField` and `ToggleRow`, then light and dark, high contrast, the bundled typeface and the
optional wrappers. The snippet type-checks against the package source. Two gaps: the page has no
rendered preview of what that snippet produces, and its "Three optional wrappers" and "How this
Storybook is organised" tables are raw pipes (finding 1).

## Findings

Ranked most severe first.

### 1. Every Markdown table in the MDX pages renders as raw text (blocker)

The MDX compiler Storybook 8 uses does not include GitHub-flavoured Markdown, and `remark-gfm` is
not configured in `.storybook/main.ts`. Every pipe table in an `.mdx` file is printed as one
paragraph of `| If you have | Use | Not | |---|---|---| ...`. Affected:
`stories/introduction/ChoosingAComponent.mdx` (65 table lines -- the whole page is tables, so the
page whose one job is "which component do I use" is unreadable), `GettingStarted.mdx` (10),
`EventsAndProps.mdx` (12) and `Upgrading.mdx` (10).

Tables inside story JSDoc (the component pages) render correctly, because those go through
Storybook's own Markdown renderer, which does support tables.

Fix: add `remark-gfm` as a devDependency and pass it to the docs addon in
`.storybook/main.ts` (`{ name: "@storybook/addon-essentials", options: { docs: false } }` plus
`{ name: "@storybook/addon-docs", options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } } }`).
Then re-screenshot the four pages.

### 2. Seven stale sidebar sections from the old layout (blocker)

Below Themed Mantine the sidebar still shows "Building a Panel / Overview", "Compact Theme /
Overview", "Editing a Value / Overview", "Floating Panels / Overview", "Getting Started /
Introduction", "Showing Data / Overview", and "Figma / Inputs / ComboInput". The first six come
from the tracked files `stories/docs/*.mdx`, which the new Introduction and Components Overview
pages replace. "Getting Started / Introduction" duplicates "Introduction / Getting started" with
older text; "Editing a Value / Overview" still recommends `IconGroupRow`.

Fix: delete `stories/docs/` (all six files) and move the ComboInput story (finding 3).

### 3. ComboInput is still in a "Figma" section and one of its stories fails (blocker)

`stories/figma/inputs/ComboInput.stories.tsx` is titled "Figma/Inputs/ComboInput". The Inputs
Overview, Choosing a component, the README and the Select page all describe ComboInput as an
input, and the Inputs Overview links to `components-inputs-comboinput--docs`, which does not
exist -- the only dead deep link in the site (README line 316 has the same dead link).

Its story "Open Over The Field" fails on render in the static build: its play function expects
the list to open at 32 but it opens at 24 (`expect(element).toHaveValue(32)`, received 24). A
reader opening that story sees Storybook's red error screen.

Fix (after the listbox fix lands): move the story to `stories/components/inputs/ComboInput.stories.tsx`,
title "Components/Inputs/ComboInput", with a `States` story in `BOTH_SCHEMES`; move `StateGrid`
into `stories/helpers/`; then delete `stories/figma/`. The other three files left there
(`chrome/StoryPanel.ts`, `color/ForceState.ts`, `selection/StateGrid.ts`) are already imported
by nothing.

### 4. Published text points at a repository file the reader cannot open (major)

87 of the 118 docs pages say "From design/figma-spec.md section N.N." under their Measurements
table, and several describe the Figma audit. A third party on graphty.app has no such file. Five
props tables also carry an internal changelog note in capitals, "THE DEFECT THIS REPAIRS: ...",
in the `disabledReason` / `onColorChange` descriptions of `StyleSelect`, `StyleNumberInput`,
`CompactColorInput` and `ToggleWithContent` (`src/components/*.tsx`, JSDoc lines 83, 113, 89,
153, 92).

Fix: drop the "From design/figma-spec.md ..." lines (the measurements stand on their own) or make
them a link to the file on GitHub; rewrite the five JSDoc paragraphs to say what the prop does,
without the history.

### 5. The Tree usage snippet calls helpers that do not exist (major)

The Tree page's Usage block, the first code a reader copies for "a list of layers I can reorder",
calls `rename(items, id, name)` and `applyMove(items, move)`. Neither is exported. The working
versions are `renameItem` and `applyMove` in `stories/components/lists/fixtures.ts`, which the
reader cannot import. Moving an item in a nested list is the one non-trivial thing every Tree
consumer must write, and the graphty app has its own copy of the logic in
`graphty/src/components/shell/panel/StyleLayerList.tsx`.

Fix: export the two helpers from the package (for example `moveTreeItem` and `renameTreeItem`,
next to `Tree`), use them in the snippet, the stories and the graphty app, and list the new
exports in `CHANGELOG-figma.md`. If the export is not wanted, put the helper bodies in the
snippet so it compiles as written.

### 6. "Show code" shows test code and story plumbing, not usage (major)

Stories set no `docs.source.code`, so "Show code" prints the whole story object: in 92 snippets
that includes `parameters: BOTH_SCHEMES`, in 58 the `play:` test function, and throughout
story-local wrappers (`Panel`, `RowPanel`, `StateGrid`, `forceState`) and fixtures a reader
cannot import. On the four Lists and trees pages, the Default story's source is wrapped in
`<g> ... </g>`: the `Panel` fixture has no `displayName`, so the minified build calls it `g`.

Separately, 31 pages describe the play function in the visible story text ("The play function
replaces the name and presses Enter ..."), which is test commentary, not documentation.

Fix: give `Panel` (and every story wrapper component) a `displayName`; for the Default story on
each page, set `parameters.docs.source.code` to the same snippet as the Usage block; move
"The play function ..." sentences into code comments.

### 7. Components with no page, and exports documented nowhere (minor)

Every component has a home, but these exports appear on no page at all: `PopoutRegion`,
`usePopoutRegion`, `useActualColorScheme`, `useDirection`, `getActivationMeta`,
`ensureCompactStyles`, `mixHex`, `isLightColor`. `PageRow` and `TreeItem` are mentioned once each.
0.9.0 is already a breaking release, so this is the cheap moment to either document them (one
"Utilities and hooks" page under Introduction) or stop exporting them.

### 8. Props tables with wrong defaults or unusable controls (minor)

- Tree's props table shows a default of `false` for `selected` and `expanded`, which are string
  arrays; the value is `TreeItem`'s boolean default leaking across because both live in
  `src/components/tree/Tree.tsx`.
- PopoutButton (`icon`), ActionRow and ToggleWithContent render a React element as a JSON control,
  dumping `$$typeof` and minified function source into the table. Set `control: false` on those
  props.
- SegmentedControl's table lists only `data` and `aria-label`, with no descriptions; the page
  links to mantine.dev, which is enough, but the two rows add nothing.

### 9. Sample data unrelated to property panels (minor)

Select, Radio and Slider use "Current Mood: Sleepy" style sample data. Every other page uses
panel vocabulary (stroke, size, layers). Use a panel property (for example "Stroke align:
Center / Inside / Outside").

### 10. Small presentation issues (minor)

- InfoCircle's and PopoutButton's Default stories draw a tall empty dark block with one small
  control in the corner; `layout: "padded"` with a fixed small height would read better.
- Getting started has no live preview of its snippet; adding the same panel as a rendered story
  under the code would let a reader compare their result.
- The Default story on every page renders in the toolbar's scheme (dark by default) on a light
  docs page. States already shows both schemes, so this is only a first impression, but a light
  default would match the page chrome.

## What is already good

- One page per component, grouped by job, each group opening with an Overview that says when to
  reach for which, and pointing at the nearest alternative outside the group.
- Every component page shows its States in light and dark side by side (verified for all 49
  component pages; InfoCircle, Popout and PopoutButton included).
- Select is one page, GradientEditor's picker is `ColorPickerPanel`, `IconGroupRow` is gone with
  a migration recipe on the SegmentedControl page and in "Upgrading to 0.9".
- Every internal deep link resolves except the ComboInput one, and links from MDX into stories
  navigate correctly in the manager.
- 493 of 494 stories render without error.
