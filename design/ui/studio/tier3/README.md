# Design studio, tier 3: unified styles

Tier 3 brings unified style layers into the real graphty app: one style layer that can style
nodes and edges together, edited in one panel, replacing the separate node and edge style rows.
The style panel mock is the starting concept, not the final design.

## How it runs

1. **Build.** The studio builds the unified style panel in the real app, iterating on the open
   questions below, and sends the owner screenshots along the way. The owner approves the UI
   before anything else happens.
2. **Study.** Only after that approval does the studio run its simulated user studies, expert
   walkthroughs and screenshot audits on the approved UI, and fix what they find.

## Open questions for the build

- When an option can have only one value (node shape, size, edge style, arrowheads), is "add"
  the right control, or a toggle, or something else? Where adding is right, what should the add
  menu look like (a color picker, a menu with icons, something else)?
- How to keep the panel short when a layer styles both nodes and edges (accordions, tabs).
- Whether to hide or disable the node or edge section when a layer does not touch it.
- How the "vary by" field picker works on data sets with many fields, and which properties can
  vary (color, size, shape, labels).
- A visual way to set a gradient that keeps every feature of the current degree control.
- Whether a group (such as a community folder) is itself a style layer, and what that means for
  folders in general.
- How a reader picks which elements a layer applies to: generically (by field value, by search,
  by selection, by expression), not only through a few favored algorithms; and whether nodes and
  edges are picked separately or together.
- Whether the mock covers every style graphty-element supports (see the style catalog below).
- How to handle the many text label options (a pop-out panel, presets, something else).

## Inputs

- The agreed model for unified style layers: `design/ui/unified-style-layers.md`, pull request
  #2065 (branch `docs/unified-style-layers-design`).
- The style panel organization and its live mock: `design/ui/style-panel-organization.md`,
  `graphty/src/stories/mocks/StylePanelMock.stories.tsx` and `stylePanelMockData.ts`, pull
  request #2098 (branch `mock/style-panel`).
- Every style graphty-element has today: [style-catalog.md](style-catalog.md), a reference copy.
  Its citations are to graphty-element source at the commit it names.

This branch builds on the tier 1 and 2 app (pull request #1727), which is not merged yet; once it
merges, this branch is updated from master.
