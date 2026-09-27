# Interface specification

**Job.** Each template as a difference from the Figma pattern it instantiates: regions inside a
place, row types, section order, which component does which job, and a component status column
against compact-mantine. **Not here:** tokens, strings, code, behaviour. **Owner:** Figma product
designer. **Ceiling:** 60 KB. **Validated by:** every template cites its Figma pattern; every
missing component is a filed compact-mantine issue.

**Status: stub.**

## Received from the conceptual model and top tasks

Read in `research/archive/conceptual-model-long-form.md` (CM) and
`research/archive/top-tasks-long-form.md` (TT) under the section named.

- **What the inspector shows per selection** (TT, task 1). Nothing selected: the graph's
  Statistics over the filtered graph. One element: that element. Several elements selected by hand:
  their shared attributes, one "N differ" row, then their Statistics. A set, path or community
  selected as one object: its Statistics with a boundary section. Which readings sit at rest is
  settled in `principles.md` (worked conflict: the graph's inspector at rest).
- **Style-layer list rows** (CM 6.1). The Overrides row at the top of the stack once something is
  overridden; the Default look row at the bottom, shown when the list expands. **Withdrawn:** the
  "N covered" row.
- **Rows that state a definition's scope** (CM 2.4, 5.5). A rule set's Rule row shows its edge
  reading, scope and population; the Layout row always shows the layout scope in force; a Created
  from row links to what a set, path or derived graph came from; Used by counts dependents.
- **Export settings** (CM 6.3) are the last section of the exported object's inspector.

## Starting positions from the studio

- **Style channels as property groups**, as Figma's right sidebar groups Layout, Fill, Stroke and
  Effects and shows an unset group as a header with "+". Node: Fill, Size and shape, Outline,
  Label, Effects. Edge: Line, Arrows, Label, Effects, following the FigJam connector (endpoints,
  arrowheads, label, style). A new layer then rests at about five rows. graphty-element has 13 real
  node channels and 21 edge channels, 15 edge rows once arrowhead and arrowtail pairs fold
  (`document-architecture.md` 7.1). A closed card sort decides which group each channel joins. The
  edge side is designed first, because it is larger.

## Received from the information architecture

Moved out of `information-architecture.md`. The full text, with every measurement and Figma
citation, is in `research/archive/information-architecture-long-form.md` under the section named.
The rail's default panel changed when the structure was settled: a project always opens on Graph
(`information-architecture.md` 5).

- **The frame** (2). Left panel and inspector 240 px, as Figma's; the Assistant panel 280 px, as
  Figma's Agents panel. The inspector sits under two header rows: row 1 holds Export..., the one
  filled button; row 2 holds the filter chip in the slot of Figma's Design and Prototype tabs, then
  the zoom and view menu. The palette keeps Figma's 529 x 354 px panel, centred over the toolbar.
  The secondary bar sits 8 px above the toolbar, at most 546 px wide (Figma's widest). Above the
  toolbar surfaces stack as secondary bar, then notice; the palette takes the secondary bar's
  place. Minimize UI is a 32 px icon button beside the project name. The Help button is bottom
  right; the legend takes the canvas corner away from the toolbar and Help.
- **The chip's width** (9). At 11 px Inter the longest reading is about 190 px in a 240 px row
  with a 55 px zoom button; a reading too wide drops "nodes", then abbreviates counts, with the
  full reading in its tooltip. The longest workflow pipeline fits the popover at about 328 px tall.
- **Rows in lists** (rule 5). Lists of other things show 3 or 4 rows, then "N more", which opens
  the table or expands in place (style layers). Members sort by the most recently run metric, or
  degree before any run. An object's own attributes show computed values first, about 10 at rest,
  then "N more" expanding under a filter field. The inspector scrolls as one panel.
- **Type rows** (rule 6). At most three verbs by top-task rank, as icon buttons with tooltips; the
  rest in "...", the context menu and the palette; destructive verbs never among the three.
  Additional labels adds their names.
- **The Graph panel** (3). Header: project name with the chevron menu, Minimize UI. The Graphs
  section, shaped like Pages, collapsed to the graph's name when there is one; its header holds
  Find and "+"; a graph row's menu holds Compare with..., Version history, Rename, Delete. The
  object list: sets with swatch, kind icon and count, and paths.
- **The Results panel** (3). One search field over both parts; "In this project" with one
  collapsed row per result named by algorithm and its distinguishing parameter, runs one
  disclosure down; the permanent Connected components row (weak and strong variants on a
  directed graph); the catalogue by family, every family closed, each row with its (i) and any
  precondition mark, a cost word only at 10 s or more; "+" on the header focuses catalogue search.
- **The inspector's fixed order** (4). Type row; property rows (Layout, Rule, Scope, Created
  from, endpoints); Statistics; Attributes; Members; Memberships; Appearance (on the graph, Style
  layers); Notes; Used by; Export. An empty section is absent; Export alone keeps its heading.
- **Nothing selected** (4). Name row with background swatch and "..."; Layout row with method,
  Run and a settings popover (including Positions from columns); Statistics with five or six
  headline readings (nodes, edges with direction, density, components, degree distribution),
  mark rows present only while non-zero, "N more" (largest component's share, graph statistics,
  Last import), and the Attributes row; Style layers with 2 rows and "N more", Overrides at the
  top once used, Default look at the bottom when expanded; Export heading and "+". The Edges
  reading's editor holds Direction and Weight.
- **Each kind of selection** (4, table). One node, one edge, several elements, mixed, a set, a
  path, a group, a found path, two sets or items, three or more: the type row's verbs and
  overflow, and the sections in the fixed order. An item's Created from row carries a stepper
  through its siblings.
- **Used by** (4) is one counted row listing dependents not already shown above it.
- **The result editor** (4). Type row with kind, (i), name and menu; state line with Details;
  property rows (Scope, arguments, Direction and Weight, Parameters folded); summary readings then
  the top 5 items and "N more"; Appearance and Used by. The per-kind table (metric, partition,
  series, path family, pair list, node or edge list, comparison, graph statistic) says what each
  puts in the summary. At a short window it gives way: top items 5 to 3, chart folds, body scrolls
  under a fixed header. Heaviest ordinary case about 608 px at 240 px.
- **The other editors** (4): style layer, Default look, Edges reading, view, note, filter steps.
  The import report and restore report are read in Version history at full height, not in a
  popover.
- **The table** (5). Tabs Nodes, Edges and one item tab; the Between groups view on a partition's
  Groups tab; the Scatter view; a scope line above rows; item rows carry readings and item
  attributes; column headers show profile and completeness; the header menu (sort, Filter to, Color
  by, Size by, histogram, Group by, Join..., Use as group names, Compare with..., then New column
  and Column submenus), at most 8 entries above the submenus; cells edited in place; Export table
  on the tab header.
- **The attribute histogram** (5). One popover for any numeric attribute and scope: log axes, a
  selecting band by range, percentile or top N, the top 5, n, mean, SD and median in the caption,
  preset outlier bands, Fit power law, Over time...; opened on degree it has the variant row.
- **Export** (6). An object's Export section: "+" adds settings; the button names its object;
  format, scale, legend, Notes row. The Export dialog lists every exportable with a checkbox, all
  checked, as Figma's. The report takes title and authors from Project details.
- **The chevron menu and main menu** (2). Chevron: a first line saying what a copy would hold,
  then Rename, Duplicate, Project details..., Export..., Download project file, Version history,
  Close. Main menu: palette, File, Edit, View, Data, Analyze, Preferences, Help, in Figma's order.
- **The zoom and view menu** (10). Zoom, fit, zoom to selection; camera presets and Follow
  selection; the Views submenu; Show labels, Show arrows, legend, minimap, note markers; table and
  time slider toggles; Additional labels.
- **Dialogs** (2): only Connect to data source, Export, and the AI provider credential.
- **Heights and targets** (13). The graph's inspector at rest is about 432 px at an 800 px window;
  the one-node inspector about 540 px. At rest the right column carries 30 targets against Figma's
  24 (12 outside Statistics, the recorded departure); the toolbar 6 against 17; the rail 4 against 6. The heaviest transient readings: a what-if about 330 px; a scatter needs about 300 x 300 px
  and goes to the table; an import report over 700 px goes to Version history.

## Sources

- `research/archive/conceptual-model-long-form.md` 2.4, 5.5, 6.1, 6.3;
  `research/archive/top-tasks-long-form.md` task 1
- `design/ui/figma/right-sidebar-selection/README.md`
- `graphty-element/src/session/styles/channels.ts`
