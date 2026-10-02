# The state matrix of the refined B skeleton

Every surface of the skeleton (`../../app-b/`) against the states the studio adopted, so that no
surface is designed only for its typical case. The owner asked for it before the next user study
(`../../owner-feedback.md`, 2026-10-01). The decisions behind it are in `owner-questions-5.md`,
section 5; the specification is `structure-b-refined.md`, version 5.

## How to read a cell

- `section/state` -- a skeleton route that renders today: open it at
  `http://dev.ato.ms:9825/app-b/#/section/state`.
- What each route added for this matrix shows is listed under "Routes added for the matrix", at
  the end. Every one of them is built.
- `N/A: reason` -- the state does not apply to this surface, for the reason given.
- A cell may hold two routes when a surface has two forms of a state (no data, and no match).
- A cell may name another surface's route only when that route shows this surface in that state.
- No cell says "falls back to". Either the route exists, or the state does not apply.

## The states (columns)

| State | What it means here | Data used |
|---|---|---|
| Empty | Nothing to show yet, or a search or filter that matched nothing | -- |
| Loading | Reading a file, a run in progress, the layout settling | -- |
| Error | Refused or failed: what happened, and what to do | -- |
| Partial | Something happened and part of it is wrong or missing: a join matching some rows, an unread block, a run stopped at its limit | -- |
| One | One item: singular words ("1 group"), actions that need two | -- |
| Typical | The everyday case | Les Miserables, the transfers, the door entries |
| Many | Many attributes on the surfaces that list attributes; many rows, runs, notes or graphs where a surface lists those | the wide sample: 300 hosts with 69 attributes, 1,105 connections with 26 |
| Long text | Names and text that do not fit | `vuln_count_critical_unremediated_over_30_days`; `attributes.profile.metrics.citations.last_5_years`; a 60-character name; a long note |
| Narrow | A 1024 x 768 window, written `route@1024`; the study script sizes the browser from the suffix | -- |
| Waiting | A control drawn disabled because graphty-element does not have it yet, with the reason (the design-note chip) | -- |

Not columns, and why:

- **Nested JSON** is a kind of data, not a state. It has its own rows on the Data page and its own
  routes on the attribute surfaces.
- **Keyboard**: every route that opens a menu, popover or dialog puts focus inside it, and the
  matrix check fails when focus is on the page body.
- **Dark theme** and **200% text** are two more check passes over every route in this matrix.

**The Narrow column.** `study.mjs` reads the `@1024` suffix and sizes the browser to 1024 x 768
before it renders the route, in `--check`, `--shoot`, `--try` and `--matrix`.

---

## Left panel places

| Surface | Empty | Loading | Error | Partial | One | Typical | Many | Long text | Narrow | Waiting |
|---|---|---|---|---|---|---|---|---|---|---|
| Start screen | `start-screen/first-run` | N/A: opening a file goes to the Data page, which shows the reading | `start-screen/recent-missing` | N/A: the screen reads no data | N/A: nothing on it is counted | `start-screen/returning` | N/A: Recent keeps the 8 newest projects; Open... reaches the rest | `start-screen/long-name` | `start-screen/returning@1024` | N/A: nothing on it waits on graphty-element |
| Graph place: the paint tree | `graph-place/empty`; `graph-place/find-no-match` | `graph-place/running` | `graph-place/failed` | `graph-place/partial` | `graph-place/one-group` | `graph-place/at-rest` | `graph-place/many-groups` | `graph-place/long-names` | `graph-place/at-rest@1024` | `graph-place/at-rest` |
| Graphs switcher | N/A: a project always holds at least one graph | N/A: switching shows a graph that is already loaded | N/A: switching cannot fail; a graph that cannot load is refused on the Data page | N/A: a graph shows whole or not at all | `graphs-switcher/open` | `graphs-switcher/two-graphs` | `graphs-switcher/many` | `graphs-switcher/long-name` | `graphs-switcher/two-graphs@1024` | `graphs-switcher/new-graph-from` |
| Data place: Sources | `data-place/no-sources` | `data-place/refreshing` | `data-place/refresh-failed` | `data-place/url-changed` | `data-place/graph-file` | `data-place/at-rest` | N/A: no sample or persona holds more than three tables; the section's closed summary counts them | `data-place/long-source-name` | `data-place/at-rest@1024` | `context-menus/source` (the row's Remove) |
| Data place: Filters | `data-place/empty-filters` | N/A: a step's count arrives with the element's filter plan, in the same step | `data-place/step-attribute-gone` | `data-place/after-replace` | `data-place/one-step` | `data-place/filters` | N/A: steps are added one at a time, no task makes more than a few, and the list scrolls | `data-place/wide-filters` | `data-place/filters@1024` | N/A: OR and NOT between steps are not offered until graphty-element has them, so nothing is drawn waiting |
| Data place: Attributes | `data-place/attributes-no-match` | N/A: attributes appear after Load from one snapshot | N/A: an attribute always shows; a value that reads wrongly is a Read as choice | N/A: a partly filled attribute shows its fill figure on its row (`data-place/attributes-wide`) | `data-place/plain-json` | `data-place/attributes`; `data-place/attributes-nested` | `data-place/attributes-wide` | `data-place/attributes-wide-search` | `data-place/attributes-wide@1024` | `data-place/attributes` (New attribute) |
| Views place | `views-place/empty` | N/A: a view applies at once | N/A: applying a view cannot fail; what it named and is gone is Partial | `views-place/applied-missing` | `views-place/one-selected` | `views-place/at-rest` | `views-place/many` | `views-place/long-name` | `views-place/at-rest@1024` | `views-place/at-rest` |
| Notes place | `notes-place/empty`; `notes-place/find-no-match` | N/A: notes are read with the project | N/A: Save stays disabled, with its reason, until a note has text and a subject; nothing else can fail | `notes-place/missing-target` | `notes-place/one-note` | `notes-place/all` | `notes-place/many` | `notes-place/long-note` | `notes-place/all@1024` | N/A: notes are graphty-element API, so nothing in the Notes place is drawn waiting |
| Note editor (writing or editing a note in place) | `notes-place/writing` (a new note, before any text) | N/A: opens at once | N/A: Save stays disabled, with its reason, until the note has text and a subject | `notes-place/missing-target` (a chip whose target is gone) | N/A: one subject chip is Typical's | `notes-place/editing`; `notes-place/chip-removed-saved` | N/A: subject chips wrap; a note about many targets is the several-elements selection's, one chip per target | `notes-place/editing-long` | `notes-place/editing@1024` | N/A: notes are graphty-element API, so nothing in the editor is drawn waiting |
| Assistant place | `assistant-place/no-provider` | `assistant-place/streaming` | `assistant-place/failed-retry` | `assistant-place/stopped` | N/A: a project holds one conversation, which Typical shows | `assistant-place/conversation` | `assistant-place/long-conversation` | `assistant-place/long-conversation` | `assistant-place/conversation@1024` | N/A: the assistant waits on a provider set in Settings, not on graphty-element |

## Workspace pages

| Surface | Empty | Loading | Error | Partial | One | Typical | Many | Long text | Narrow | Waiting |
|---|---|---|---|---|---|---|---|---|---|---|
| Data page: tables, roles and match report | `data-page/refused-empty` | `data-page/reading` | `data-page/refused-parse` | `data-page/unmatched-rows` | `data-page/edge-list` | `data-page/entries` | `data-page/wide-hosts` | `data-page/wide-find-column` | `data-page/entries@1024` | `data-page/entries` (Load) |
| Data page: the role menu under a column header | N/A: every column has a role, "Attribute" by default | N/A: opens at once | N/A: a role that does not fit is disabled with its reason (`data-page/edge-disabled`) | N/A: a role applies whole; what it matches is the match report's | N/A: the menu lists every role | `data-page/role-menu`; `data-page/json-array-menu` | `data-page/wide-link-menu` (the "by" submenu is the field list) | N/A: role words are short; column names in the "by" submenu take the middle ellipsis (`data-page/wide-link-menu`) | `data-page/role-menu@1024` | N/A: the page waits on graphty-element at Load (`data-page/entries`), not per role |
| Data page: nested JSON | `data-page/json-no-records` | N/A: a JSON document reads like any file (`data-page/reading`) | `data-page/json-invalid` | `data-page/json-report` | `data-page/json-plain` | `data-page/json-tree` | `data-page/json-researchers` | `data-page/json-researchers` | `data-page/json-tree@1024` | `data-page/json-tree` (Load) |

Six more nested JSON routes, one per decision, belong to the Data page's nested JSON row and are
checked with it: `data-page/json-keep-value`, `data-page/json-array-menu`,
`data-page/json-affiliations`, `data-page/json-any-type`,
`data-page/json-path-gone`, and on the wide sample `data-page/wide-link-menu`. One
more, `data-page/json-keyed`, shows the other document shapes on a second domain, so the
nested design is not checked against one document only; its Load lands on the loaded registry
(`canvas-and-states/registry-loading`, then `graph-place/registry`, with `data-place/registry`
and `inspector-nothing-selected/registry`). A Graphology export (`data-page/json-graphology`)
and a JGF file (`data-page/json-jgf`) load in one step, as node-link JSON does.

A Sources row of a loaded wide, nested or plain JSON project opens Edit at the table that was
clicked, and Apply returns to its Data place: `data-page/edit-wide-hosts`,
`data-page/edit-wide-connections`, `data-page/edit-json-researchers`,
`data-page/edit-json-affiliations`, `data-page/edit-json-addresses`,
`data-page/edit-json-institutions`, `data-page/edit-json-links`, `data-page/edit-plain-nodes`,
`data-page/edit-plain-links` and `data-page/edit-registry`.

| Surface | Empty | Loading | Error | Partial | One | Typical | Many | Long text | Narrow | Waiting |
|---|---|---|---|---|---|---|---|---|---|---|
| Version history and Compare | `full-canvas-modes/no-versions` | N/A: versions are read with the project | N/A: opening a version cannot fail | N/A: a version is whole; nodes that do not match between two months are part of Compare's typical view | N/A: one version is the Empty state | `full-canvas-modes/version-history` | N/A: one row per load; no sample holds more than a few loads, and the list scrolls | N/A: rows are dates and file names; the longest is in Typical | `full-canvas-modes/version-history@1024` | `full-canvas-modes/comparison` |
| Present mode | N/A: Present is disabled, with its reason, until a tour holds a view | N/A: each view applies at once | N/A: stepping cannot fail | N/A: a view shows whole | N/A: a one-view tour is the first view with Next disabled (`present-mode/first-view`) | `present-mode/presenting` | N/A: the step counter reads "view 12 of 30" in the same place | `present-mode/long-caption` | `present-mode/presenting@1024` | N/A: nothing on it waits on graphty-element |

## Inspectors (right panel)

| Surface | Empty | Loading | Error | Partial | One | Typical | Many | Long text | Narrow | Waiting |
|---|---|---|---|---|---|---|---|---|---|---|
| Nothing selected: the graph | `inspector-nothing-selected/empty-graph` | `inspector-nothing-selected/reading` | N/A: a reading that fails shows on its run row (`inspector-run-row/failed`) | `inspector-nothing-selected/filtered` | N/A: there is always one graph | `inspector-nothing-selected/overview` | `inspector-nothing-selected/transfers` | `inspector-nothing-selected/wide` | `inspector-nothing-selected/overview@1024` | `inspector-nothing-selected/canvas` |
| Layout popover (method, engine, options, pacing) | N/A: there is always a method | N/A: the popover edits settings; the layout running shows on the toolbar (`toolbar/at-rest`) | N/A: a method rated for fewer nodes carries the cost mark, shown in Many | N/A: a method applies whole | N/A: the catalog is never one method | `inspector-nothing-selected/layout-method` | `inspector-nothing-selected/transfers-methods` (three methods carry the cost mark) | N/A: method names are the catalog's short plain names | `inspector-nothing-selected/layout-method@1024` | N/A: methods come from graphty-element's layout catalog; nothing is drawn waiting |
| One node | N/A: shown only for a node that exists | N/A: reads one snapshot | `inspector-node/why-unknown-path` | `inspector-node/wide-data` (its "10 empty") | N/A: always one node; several have their own inspector | `inspector-node/why-this-look`; `inspector-node/data` | `inspector-node/wide-data`; `inspector-node/nested-data`; `inspector-node/plain-data` | `inspector-node/wide-more` | `inspector-node/why-this-look@1024` | `inspector-node/why-this-look` |
| One edge | N/A: shown only for an edge that exists | N/A: reads one snapshot | N/A: as the node's, on the node's route | `inspector-edge/wide-data` | N/A: always one edge | `inspector-edge/style`; `inspector-edge/data` | `inspector-edge/wide-data` | `inspector-edge/wide-data` | `inspector-edge/style@1024` | N/A: nothing on the edge inspector is drawn waiting |
| Why this look (in the node, edge and several-elements Style tabs) | N/A: every element has at least the Everything row's look | N/A: reads one snapshot | `inspector-node/why-unknown-path` | `inspector-several-elements/style` (coverage) | N/A: one winning row is a one-line list, as in Typical | `inspector-node/why-this-look`; `inspector-node/why-closed` | N/A: lists only rows that win a property, at most one per property, so it never grows with attributes or rows | `inspector-node/wide-why` | `inspector-node/why-this-look@1024` | `inspector-node/why-this-look` |
| Several elements | N/A: needs two or more | N/A: reads one snapshot | N/A: nothing on it can fail | `inspector-several-elements/style` | N/A: one element has its own inspector | `inspector-several-elements/data` | `inspector-several-elements/wide` | `inspector-several-elements/wide` | `inspector-several-elements/style@1024` | `inspector-several-elements/style` |
| A group, set or path row | `inspector-group-set-path-row/rule-set-empty` | N/A: a row reads its run's finished result | `inspector-group-set-path-row/invalid-value` | `inspector-group-set-path-row/overlap` | `inspector-group-set-path-row/one-member` | `inspector-group-set-path-row/style` | `inspector-group-set-path-row/label-all-used` | `inspector-group-set-path-row/long-name` | `inspector-group-set-path-row/style@1024` | `inspector-group-set-path-row/style` |
| A measure row | N/A: a measure row exists only once its run has values | N/A: the run row shows progress (`inspector-run-row/running`) | N/A: a failed run makes no measure row (`inspector-run-row/failed`) | `inspector-measure-row/scope-mark` | N/A: binds one value by nature | `inspector-measure-row/style` | N/A: binds one value; many attributes show in its pickers (the field list row) | `inspector-measure-row/long-name` | `inspector-measure-row/style@1024` | `inspector-measure-row/style` |
| A run row | N/A: a run row exists once a run starts | `inspector-run-row/running` | `inspector-run-row/failed` | `inspector-run-row/partial` | N/A: one group reads "1 group" on the tree (`graph-place/one-group`) | `inspector-run-row/style` | `inspector-run-row/many-groups` | N/A: a run is named after its algorithm; renaming waits on graphty-element | `inspector-run-row/style@1024` | `inspector-run-row/rename-disabled` |
| A folder | `inspector-folder/empty` | N/A: holds no data | N/A: holds no data | N/A: holds no data | N/A: its Paints line counts rows like any count | `inspector-folder/folder` | N/A: shows the folder's shared style, not its rows; many rows is the tree's Many | `inspector-folder/long-name` | `inspector-folder/folder@1024` | N/A: nothing on it waits on graphty-element |
| Built-in rows: Selection, Notes, Everything, Overrides | N/A: built-in rows always exist | N/A: read one snapshot | N/A: their lines take only valid values, as every Style tab | N/A: a built-in row paints whole | N/A: nothing on them is counted beyond the Paints line | `inspector-selection-and-everything/everything` | N/A: their lines are graphty-element's style channels, not attributes; binding a field uses the field list | N/A: built-in names are fixed and short | `inspector-selection-and-everything/everything@1024` | `inspector-selection-and-everything/selection` |
| Several rows | N/A: needs two or more rows | N/A: reads one snapshot | N/A: nothing on it can fail | N/A: values that differ read "Mixed", as in Typical | N/A: one row has its own inspector | `inspector-several-rows/style` | N/A: shows only shared properties; more rows read "Mixed" as two do | N/A: shows no names beyond the header's count | `inspector-several-rows/style@1024` | `inspector-several-rows/style` |
| An attribute or a filter step | N/A: an attribute exists only with values; a step always has a condition | N/A: reads one snapshot | `inspector-attribute-and-filter-step/step-attribute-gone` | `inspector-attribute-and-filter-step/sparse` | N/A: always one attribute or one step | `inspector-attribute-and-filter-step/attribute`; `inspector-attribute-and-filter-step/list-attribute` | `inspector-attribute-and-filter-step/wide-filter` | `inspector-attribute-and-filter-step/long-name` | `inspector-attribute-and-filter-step/attribute@1024` | `inspector-attribute-and-filter-step/attribute` |
| A saved view | N/A: shown only for a view that exists | N/A: a view applies at once | N/A: applying cannot fail (`views-place/applied-missing` covers what is gone) | N/A: as Error | N/A: always one view | `inspector-saved-view/view` | N/A: shows one view's fields | `inspector-saved-view/long-caption` | `inspector-saved-view/view@1024` | `inspector-saved-view/view` |
| All options of a metric | N/A: shown only for a metric that has options | N/A: options are read from the catalog | N/A: invalid values are refused in the field, as every Style tab | N/A: options apply whole | N/A: a list of options has no count | `measure-row-options/pagerank` | N/A: the algorithm's own short option list | N/A: option names are the catalog's plain names | `measure-row-options/pagerank@1024` | N/A: options come from graphty-element's catalog; nothing is drawn waiting |

## Canvas, toolbar and table

| Surface | Empty | Loading | Error | Partial | One | Typical | Many | Long text | Narrow | Waiting |
|---|---|---|---|---|---|---|---|---|---|---|
| Canvas and its state cards | `canvas-and-states/empty` | `canvas-and-states/loading` | `canvas-and-states/refused-too-large`; `canvas-and-states/gpu-lost` | `canvas-and-states/hidden-on-canvas` | N/A: a graph of one node draws like any graph | `canvas-and-states/drawn` | `canvas-and-states/less-detail`; `canvas-and-states/hosts` | N/A: the canvas draws no text but labels, whose width waits on graphty-element | `canvas-and-states/drawn@1024` | `canvas-and-states/hidden-on-canvas` |
| Legend card | `canvas-and-states/door-entries` (nothing colored or sized yet) | N/A: drawn from the rows | N/A: drawn from the rows | N/A: a row it lists paints whole | N/A: one entry is a one-line card | `canvas-and-states/drawn` | `canvas-and-states/transfers-communities` ("28 more") | `canvas-and-states/hosts-legend` | `canvas-and-states/drawn@1024` | N/A: drawing the legend into exports waits, on the export rows |
| Toolbar | `toolbar/nothing-drawn` | `toolbar/export-waiting` | N/A: its buttons cannot fail; a failed run shows on its row | N/A: nothing on it is partial | N/A: a fixed set of buttons | `toolbar/at-rest` | N/A: a fixed set of icon buttons | N/A: icons only; tooltips are a name and a key | `toolbar/at-rest@1024` | `toolbar/xr-hand-menu` |
| Selection bar | N/A: shown only with a selection | N/A: acts on a selection already made | N/A: its commands report in their own popovers | N/A: a selection is whole | `selection-bar/one-node` | `selection-bar/two-nodes` | `selection-bar/five-nodes` | `selection-bar/long-name` | `selection-bar/two-nodes@1024` | `selection-bar/two-nodes` |
| Time slider | `table-dock/table-options` (no time attribute: Time slider disabled with its reason) | N/A: moves a window over loaded times | N/A: moving the window cannot fail | N/A: a window shows the rows inside it whole | N/A: one time value is the Empty state's reason | `table-dock/time-slider` | N/A: the track and readout are the same at any number of rows | N/A: the readout is two dates | `table-dock/time-slider@1024` | N/A: nothing on it is drawn waiting |
| Table dock | `table-dock/no-match` | N/A: rows come from one snapshot, drawn as they scroll | `table-dock/edit-refused` | `table-dock/members-of-row` | N/A: one row reads "1 node" in the count, as the tree does | `table-dock/nodes` | `table-dock/wide` | `table-dock/wide-columns` | `table-dock/nodes@1024` | `table-dock/column-menu` |

## Popovers, pickers and menus

| Surface | Empty | Loading | Error | Partial | One | Typical | Many | Long text | Narrow | Waiting |
|---|---|---|---|---|---|---|---|---|---|---|
| Field list, menu size (bind, Label, Color by, Size by, filter step, link "by", Go to column) | `style-pickers/wide-no-match` | N/A: lists one snapshot's attributes | N/A: picking cannot fail; a bound path that reads nothing is the Binding popover's Error | N/A: fill figures show on rows in Many | N/A: a one-attribute list is the short list without Find, as in Typical | `style-pickers/bind`; `style-pickers/wide-size-by` | `style-pickers/wide-color-by` | `style-pickers/wide-search` | `style-pickers/wide-color-by@1024` | `style-pickers/bind` |
| Field list, panel size (Data > Attributes, "N more attributes", table columns) | `data-place/attributes-no-match` | N/A: as the menu size | N/A: as the menu size | N/A: as the menu size | `data-place/plain-json` | `data-place/attributes` | `data-place/attributes-wide` | `inspector-node/wide-more` | `data-place/attributes-wide@1024` | `data-place/attributes` |

Every field picker also has its own wide route, so each is seen with 69 attributes: Color by
(`style-pickers/wide-color-by`), Size by (`style-pickers/wide-size-by`), bind
(`style-pickers/wide-bind`), the Label "+" (`style-pickers/wide-label`), a filter step
(`inspector-attribute-and-filter-step/wide-filter`), the table's columns
(`table-dock/wide-columns`), a link's "by" column (`data-page/wide-link-menu`) and Go
to column (`data-page/wide-find-column`), the Weight line of Analyze, the Path popover and a
run's Made with (`analyze-popover/wide-weight`), Select where's Insert attribute
(`select-where/wide`) and a recipe's binding choice (`recipe-apply/wide-mismatch`).
On Les Miserables the same pickers are the same component with four rows and no Find
(`style-pickers/bind`), so a picker never changes form when the data grows. On the nested sample
Color by (`style-pickers/nested-color-by`) shows the parent subheads and the two values
that are not one value, `tags` and a sub-object kept whole, listed last and disabled with their
reasons.

| Surface | Empty | Loading | Error | Partial | One | Typical | Many | Long text | Narrow | Waiting |
|---|---|---|---|---|---|---|---|---|---|---|
| Style pickers (Color, Shape, Binding, Label and the other popovers) | N/A: a popover edits a value that exists | N/A: applies each change live | `style-pickers/binding-unknown-path` | N/A: a value applies whole | N/A: edits one value | `style-pickers/color` | `style-pickers/color-libraries` | `style-pickers/binding-long` | `style-pickers/color@1024` | `style-pickers/label-style` |
| Everything and a group row side by side (a review page) | N/A: a review comparison of two Style tabs; their states are the inspectors' | N/A: as Empty | N/A: as Empty | N/A: as Empty | N/A: as Empty | `style-tab-same-panel/nodes` | N/A: as Empty | N/A: as Empty | N/A: a review page, read at review width only | `style-tab-same-panel/nodes` |
| View flyout | `view-flyout/no-saved-views` | N/A: a mode switches at once | N/A: VR and AR that cannot start are drawn disabled with the reason (Waiting) | N/A: nothing on it is partial | N/A: one saved view is a one-row list | `view-flyout/3d` | `view-flyout/many-views` | `view-flyout/many-views` | `view-flyout/3d@1024` | `view-flyout/3d` |
| Path popover | `path-popover/from-analyze` | N/A: a path is found in one step | `path-popover/no-path` | N/A: a path is found whole or not at all | N/A: From and To are always two | `path-popover/from-selection` | N/A: two fields | N/A: From and To use the end ellipsis, as the selection bar (`selection-bar/long-name`) | `path-popover/from-selection@1024` | `path-popover/transfers-directed` |
| Neighborhood popover | N/A: opens only with a selection | N/A: neighbors are found in one step | N/A: finding neighbors cannot fail | N/A: a neighborhood is found whole | N/A: one selected node is Typical's | `selection-bar/neighborhood`; `selection-bar/neighborhood-directed` | N/A: a depth and a direction, whatever the graph | N/A: no names in it | `selection-bar/neighborhood@1024` | N/A: nothing on it is drawn waiting |
| Analyze popover | `analyze-popover/no-match` | `analyze-popover/running` | N/A: a run that fails shows on its row | N/A: a scoped run is Typical's choice | N/A: the catalog is never one entry | `analyze-popover/open` | `analyze-popover/search` | N/A: entries are the catalog's short plain names | `analyze-popover/open@1024` | `analyze-popover/essentials` |
| Main menu | N/A: fixed commands | N/A: fixed commands; nothing in it loads, fails or is counted | N/A: commands report where they act | N/A: fixed commands; nothing in it loads, fails or is counted | N/A: fixed commands; nothing in it loads, fails or is counted | `main-menu/open` | N/A: fixed commands | N/A: recent names use the end ellipsis (`start-screen/long-name`) | `main-menu/open@1024` | `main-menu/two-selected` |
| Project-name menu and header | N/A: a project always has a name | N/A: fixed commands on the one open project | N/A: fixed commands on the one open project | N/A: fixed commands on the one open project | N/A: fixed commands on the one open project | `project-menu/open` | N/A: fixed commands | `project-menu/long-name` | `project-menu/open@1024` | N/A: nothing on it waits on graphty-element |
| Context menus | N/A: fixed commands per kind | N/A: fixed commands per kind; nothing in them loads or is counted | N/A: commands report where they act | N/A: fixed commands per kind; nothing in them loads or is counted | `context-menus/node` | `context-menus/row` | `context-menus/several` | N/A: menus have no title; items are fixed words | `context-menus/node@1024` | `context-menus/run-row` |
| Quick actions, Find and shortcuts | `commands-and-search/find-no-match` | N/A: searches what is loaded | N/A: a command that cannot run is disabled with its reason | N/A: searches what is already loaded; nothing in it is partial or counted | N/A: searches what is already loaded; nothing in it is partial or counted | `commands-and-search/quick-actions` | `commands-and-search/quick-actions-results` | N/A: results use the field list's middle ellipsis for attributes (`style-pickers/wide-search`) | `commands-and-search/quick-actions@1024` | N/A: element-dependent commands carry their reason in the results, as in Typical |
| Select where | `select-where/no-match` | N/A: counts as you type | `select-where/where-error` | N/A: a query selects whole | N/A: one match reads "1 node" in the count | `select-where/where` | `select-where/selection-full` | `select-where/wide` | `select-where/where@1024` | N/A: nothing on it waits on graphty-element |

## Dialogs

| Surface | Empty | Loading | Error | Partial | One | Typical | Many | Long text | Narrow | Waiting |
|---|---|---|---|---|---|---|---|---|---|---|
| Export dialog | N/A: there is always a graph to export | N/A: each body shows its own waiting (Image, Video) | N/A: each body shows its own failure | N/A: a frame around one output; each output body has its own row below | N/A: a frame around one output; each output body has its own row below | `export-dialog/data` | N/A: a fixed set of formats | N/A: the file name is a text field | `export-dialog/data@1024` | `export-dialog/report` |
| Export: Image | N/A: one capture of a canvas that always exists, with a fixed set of settings | `export-image/waiting-to-settle` | `export-image/failed`; `export-image/clipboard-refused` | `export-image/size-refused` | N/A: one capture of a canvas that always exists, with a fixed set of settings | `export-image/image` | N/A: one capture of a canvas that always exists, with a fixed set of settings | N/A: the file name is a text field | `export-image/image@1024` | `export-image/image` |
| Export: Video | N/A: one recording of a canvas that always exists, with a fixed set of settings | `export-video/recording` | `export-video/failed` | `export-video/estimate-warning` | N/A: one recording of a canvas that always exists, with a fixed set of settings | `export-video/still` | N/A: one recording of a canvas that always exists, with a fixed set of settings | N/A: the file name is a text field | `export-video/still@1024` | `export-video/tour` |
| Apply recipe or style file | N/A: opened with a file | N/A: a recipe reads at once | `recipe-apply/style-unbound` | `recipe-apply/mismatch` | N/A: one file applied whole; its states are the binding and mismatch routes | `recipe-apply/binding` | `recipe-apply/wide-mismatch` | `recipe-apply/wide-mismatch` | `recipe-apply/binding@1024` | N/A: restoring results without running waits on the element, and is drawn on `export-dialog/recipe` |
| Settings | N/A: every setting has a value | N/A: fixed settings, each holding a valid value | N/A: a setting takes only valid values | N/A: fixed settings, each holding a valid value | N/A: fixed settings, each holding a valid value | `settings/general` | N/A: Settings' own search (`settings/search`) | N/A: setting names are short | `settings/general@1024` | `settings/accessibility` |
| Keyboard shortcuts | N/A: a fixed, read-only list | N/A: a fixed, read-only list | N/A: a fixed, read-only list | N/A: a fixed, read-only list | N/A: a fixed, read-only list | `commands-and-search/shortcuts` | N/A: a fixed list | N/A: a fixed, read-only list | `commands-and-search/shortcuts@1024` | N/A: a fixed, read-only list |

## Shared components

Each is checked once on the route that shows it best; its hosts' rows above show it in their own
states.

| Surface | Empty | Loading | Error | Partial | One | Typical | Many | Long text | Narrow | Waiting |
|---|---|---|---|---|---|---|---|---|---|---|
| Tooltip | N/A: a name and a key for a fixed control; its hosts show it in their own states | N/A: a name and a key for a fixed control; its hosts show it in their own states | N/A: a name and a key for a fixed control; its hosts show it in their own states | N/A: a name and a key for a fixed control; its hosts show it in their own states | N/A: a name and a key for a fixed control; its hosts show it in their own states | `toolbar/tooltip-hover`; `toolbar/tooltip-focus` | N/A: a name and a key for a fixed control; its hosts show it in their own states | N/A: a name and a key, never a sentence | `toolbar/tooltip-hover@1024` | `inspector-run-row/rename-disabled` |
| Notice | N/A: one message raised by its host; the host's row shows it in this state | N/A: one message raised by its host; the host's row shows it in this state | N/A: one message raised by its host; the host's row shows it in this state | N/A: one message raised by its host; the host's row shows it in this state | N/A: one message raised by its host; the host's row shows it in this state | `data-place/undo-notice` | N/A: one notice at a time | N/A: one line; the thing it names uses the end ellipsis | `data-place/undo-notice@1024` | N/A: one message raised by its host; the host's row shows it in this state |
| Empty line and no match | `notes-place/empty`; `style-pickers/wide-no-match` | N/A: the empty line exists only for the Empty state | N/A: the empty line exists only for the Empty state | N/A: the empty line exists only for the Empty state | N/A: the empty line exists only for the Empty state | N/A: the empty line is itself the Empty state | N/A: the empty line exists only for the Empty state | N/A: the empty line exists only for the Empty state | `notes-place/empty@1024` | N/A: the empty line exists only for the Empty state |
| Problem block (new: what happened, what to do) | N/A: shown only for Error and Partial | N/A: shown only for Error and Partial | `data-page/refused-parse` | `data-page/unmatched-rows` | N/A: shown only for Error and Partial | N/A: shown only for Error and Partial | N/A: shown only for Error and Partial | N/A: shown only for Error and Partial | `data-page/refused-parse@1024` | N/A: shown only for Error and Partial |
| Confirmation (the one that cannot be undone) | N/A: one fixed question; today only Forget all keys asks one | N/A: one fixed question; today only Forget all keys asks one | N/A: one fixed question; today only Forget all keys asks one | N/A: one fixed question; today only Forget all keys asks one | N/A: one fixed question; today only Forget all keys asks one | `settings/forget-keys-confirm` | N/A: one fixed question; today only Forget all keys asks one | N/A: one fixed question; today only Forget all keys asks one | `settings/forget-keys-confirm@1024` | N/A: one fixed question; today only Forget all keys asks one |
| Light popover | N/A: a frame; each popover's own row shows it in this state | N/A: a frame; each popover's own row shows it in this state | N/A: a frame; each popover's own row shows it in this state | N/A: a frame; each popover's own row shows it in this state | N/A: a frame; each popover's own row shows it in this state | `style-pickers/color` | N/A: a frame; each popover's own row shows it in this state | N/A: a frame; each popover's own row shows it in this state | `style-pickers/color@1024` | N/A: a frame; each popover's own row shows it in this state |
| Modal | N/A: a frame; each dialog's own row shows it in this state | N/A: a frame; each dialog's own row shows it in this state | N/A: a frame; each dialog's own row shows it in this state | N/A: a frame; each dialog's own row shows it in this state | N/A: a frame; each dialog's own row shows it in this state | `export-dialog/data` | N/A: a frame; each dialog's own row shows it in this state | N/A: a frame; each dialog's own row shows it in this state | `export-dialog/data@1024` | N/A: a frame; each dialog's own row shows it in this state |
| Inspector frame and Data tab | N/A: a frame; each inspector's own row shows it in this state | N/A: a frame; each inspector's own row shows it in this state | N/A: a frame; each inspector's own row shows it in this state | N/A: a frame; each inspector's own row shows it in this state | N/A: a frame; each inspector's own row shows it in this state | `inspector-measure-row/data` | `inspector-node/wide-data` | `inspector-node/wide-more` | `inspector-measure-row/data@1024` | `inspector-run-row/data` |
| Notes section (every inspector's last) | `inspector-edge/no-notes` | N/A: a count and one link, read with the project | N/A: a count and one link, read with the project | N/A: a count and one link, read with the project | N/A: a count and one link, read with the project | `inspector-node/data` | N/A: a count, one link | N/A: a count and one link, read with the project | `inspector-node/data@1024` | N/A: a count and one link, read with the project |
| Role tag | N/A: one short fixed word read from the Data page | N/A: one short fixed word read from the Data page | N/A: one short fixed word read from the Data page | N/A: one short fixed word read from the Data page | N/A: one short fixed word read from the Data page | `inspector-attribute-and-filter-step/link-key` | N/A: one short fixed word read from the Data page | N/A: role words are short | `inspector-attribute-and-filter-step/link-key@1024` | N/A: one short fixed word read from the Data page |
| The "+" menu (Add) | N/A: with nothing left to add the "+" disappears, so no empty menu is drawn | N/A: lists fixed items | N/A: adding cannot fail; a value refused is the line's own Error | N/A: an item adds whole | `style-pickers/plus-one-left` (one item: "+" adds it at once) | `style-pickers/plus-menu` | `style-pickers/wide-label` (past 15 items it is the field list, menu size) | N/A: items are channel and command names, short by design | `style-pickers/plus-menu@1024` | `style-pickers/label-show` |
| Design-note chip ("needs graphty-element", "Open question") | N/A: a fixed annotation; its text is in its tooltip | N/A: a fixed annotation; its text is in its tooltip | N/A: a fixed annotation; its text is in its tooltip | N/A: a fixed annotation; its text is in its tooltip | N/A: a fixed annotation; its text is in its tooltip | `graphs-switcher/new-graph-from` | N/A: one chip per control it qualifies | N/A: the text is in its tooltip | `graphs-switcher/new-graph-from@1024` | `graphs-switcher/new-graph-from` (the chip is the Waiting state) |

---

## Regressions: one route each, so they cannot return

| Problem | Status in the source today | Route | How it is checked |
|---|---|---|---|
| (a) Shift+Arrow on the canvas does not walk between nodes (owner decision) | Fixed in `app.js`: the walk steps through the node rows of the project on screen, on every dataset; confirmed 2026-10-01 on both datasets (Les Miserables to Napoleon, door entries to Tomas Lindqvist), the inspector naming and showing the walked node | `canvas-and-states/walked` | `study.mjs --try` from `canvas-and-states/drawn` with `--click "Les Miserables colored by PageRank"` (a click on the drawing, which keeps focus there) and then `--key Shift+ArrowRight` twice (Myriel, then Napoleon), then again from `canvas-and-states/door-entries` and `graph-place/plain-json` (which stays in the Coauthors project, `inspector-node/plain-data`): a different node each time on both datasets, the selection bar showing, the node announced |
| (b) The note editor dropped a removed subject chip on Save | Fixed in `notes-place.js` (Save compares and applies the chips); confirmed 2026-10-01: the Javert chip removed, the note saved with Valjean alone | `notes-place/chip-removed-saved` | `--try` from `notes-place/editing`: remove a chip, Save; the note shows one chip fewer |
| (c) A canvas click selects a node but shows no selection bar | Fixed: confirmed 2026-10-01 on the edge inspector and the door-entries person; the edge's bar drops Neighborhood and disables Path between, which need nodes | `inspector-node/door-ana`; `inspector-edge/style` (both must show the bar) | `--check` on both routes and `--try` a click on the canvas: the bar shows with Add note, Path between, Create set and Hide |
| (d) Choosing "person by badge" changed the header but not the counts or the report | Fixed in `data-page.js`; confirmed 2026-10-01: the model strip reads 0 edges, the report says why and offers Match person by id, and Load is off with its reason | `data-page/link-by-badge` | `--check`; the model strip, the edge count and the match report all change |
| (e) Every context menu opened inside the app came up empty: the Data page's hash listener hid the overlay layer before the menu was added | Fixed in `data-page.js`: the listener closes only what the Data page itself has open; confirmed 2026-10-01 on the inspector's More actions, a canvas right-click, a tree row right-click and the readings link | `inspector-nothing-selected/overview`; `canvas-and-states/drawn` | `study.mjs --try` from `inspector-node/why-this-look` with `--click "More actions" --expect role=menu`, and from `canvas-and-states/drawn` with `--rclick Valjean --expect role=menu` (exit 1 when no menu shows) |
| (f) A click on a Les Miserables node did not move the walk: Shift+Arrow started from Myriel | Fixed: the canvas hot spot, the shell's canvas and table, and the table dock's rows all select through `AB.selectNode`, as the hosts do | `graph-place/at-rest` | `--try` from `graph-place` with `--click Valjean --key Shift+ArrowRight --expect Marguerite` (Valjean is node 11, Marguerite node 12) |
| (g) The Data rail button on Les Miserables opened the transfers project | Fixed in `app.js`: the rail and a click on empty canvas open `data-place/graph-file` for Les Miserables | `data-place/graph-file` | `--try` from `graph-place` with `--click Data --expect miserables.gexf --expect-not "Transfers, March 2026"` |
| (h) Add note in the wide, nested and plain JSON projects listed Les Miserables' notes and drew its graph inspector | Fixed in `notes-place.js` and `lib.js`: a just-loaded project lists only the notes written in it, and its graph inspector is `inspector-nothing-selected/wide` | `notes-place/writing` | `--try` from `table-dock/wide` with `--key n --expect-not Myriel --expect-not Co-appearances`; again from `inspector-node/nested-data` |
| (i) The type glyph under a Data page header opened the transfers' attribute and dropped the load | Fixed in `data-page.js`: before Load the glyph is a mark (the attribute does not exist yet); it links only while editing a loaded source whose attribute has a state | `data-page/json-researchers`; `data-page/wide-hosts` | `--try` from `data-page/json-researchers` with `--click "attributes.profile.h_index: Number" --expect-not "Transfers, March 2026"` |
| (j) A link set by hand on a nested column (advisor_id) changed the header but not the strip or the report | Fixed in `data-page.js`: a one-value column set to Links to makes its own strip line, report line and edge count, and Load carries it to the Data place and the graph inspector | `data-page/json-researchers` | set relationships.advisor_id to Links to -> researcher by id: the strip reads "researcher --advisor (58)-- researcher" and the report adds 58 advisor edges |
| (k) Removing the package registry document on the Data page blanked the page (a script error) | Fixed in `data-page.js`: the registry's model strip reads nothing once its tables are gone, and Load turns off with "Add a file: there is nothing to load" when no table is left | `data-page/json-keyed` | `--try` from `data-page/json-keyed` with `--hover registry-2026-03.json --click "Remove registry-2026-03.json" --expect "No tables"`; from `data-page/json-tree`, removing network-export-2026-03.json shows "nothing to load" |
| (l) Shift+Arrow on the transfers walked into Les Miserables | Fixed: each transfers step opens `inspector-node/transfers-node`, which keeps the transfers place and canvas it opened beside | `inspector-node/transfers-node` | `--try` from `data-place/at-rest` with `--click "3,000 accounts shown as density" --key Shift+ArrowRight --expect ACC-633005 --expect-not "Les Miserables"` |
| (m) The ordinary click paths on the wide, nested and plain JSON projects showed Les Miserables' data: Everything's counts, the bind icon's PageRank binding, the selection bar's verbs, List options, Table options and the View flyout's saved views | Fixed in `inspector-selection-and-everything.js`, `lib.js`, `style-pickers.js` (`bind-prop`), `selection-bar.js`, `path-popover.js`, `graph-place.js`, `table-dock.js` and `view-flyout.js` | `style-pickers/bind-prop`; `graph-place/wide` | `--try` from `graph-place/wide` with `--click Everything --expect "Paints 300 nodes, 1,105 edges" --hover Size --click "Use a field or result for Size" --expect "Size from data" --expect-not PageRank`; from `inspector-node/wide-data` with `--click "Path between" --expect monitor-prod-iad-03 --expect-not Valjean` |
| (n) The Graph tree's Find rows and notes opened Les Miserables from every other project | Fixed in `graph-place.js`: outside Les Miserables the find filters the project's own tree in place, and no matching row shows the field list's no-match line with Clear | `graph-place/nested`; `graph-place/many-groups` | `--try` from `graph-place/nested` with `--click "Find rows and notes" --key j --key a --key v --key Enter --expect-not "Les Miserables" --expect "No match"`; again from `graph-place/wide`, `graph-place/door-entries` and `graph-place/many-groups` |
| (o) An attribute's menu on the wide, nested, plain JSON and Les Miserables projects opened the transfers' amount (Read as..., Filter to..., Select where <attribute> is..., and the attribute inspector's More actions, headed "amount" with Width by on a node attribute) | Fixed: one attribute menu, `AB.attributeMenu` in `lib.js`, for the Data place's rows, the attribute inspector's More actions and the table's column menu; Read as... opens `AB.openField` (Les Miserables gets `inspector-attribute-and-filter-step/lesmis-field`), Filter to... adds a step on the attribute in the project's own Data place, Select where <attribute> is... opens `select-where/attribute` with the attribute in the query | `inspector-attribute-and-filter-step/wide-field`; `inspector-attribute-and-filter-step/lesmis-field`; `select-where/attribute` | `--try` from `data-place/attributes-wide` with `--rclick cpu_cores --click "Read as..." --expect cpu_cores --expect-not amount`; the same with `--click "Filter to..." --expect "cpu_cores is at least"` and `--click "Select where cpu_cores is..." --expect-not 2,610`; from `inspector-attribute-and-filter-step/wide-field` with `--click "More actions" --expect-not "Width by"`; from `data-place/graph-file` with `--rclick group --click "Read as..." --expect-not transfers` |
| (p) Color by on an attribute colored nothing: four paths (the Data place menu, the inspector's More actions, the table's column menu, the bind icon on Everything's Color line) only showed a notice, forgot the column, or dropped the binding on Esc | Fixed: Color by and Size by add a measure row named after the attribute (`AB.paintRow`, `graph-place/painted`, `inspector-measure-row/painted-color`), and a source picked in a Binding popover on a loaded project is kept (`AB.paintBy`); the canvas, the legend, the tree and the field lists' In use read it | `graph-place/painted`; `inspector-measure-row/painted-color`; `style-pickers/painted-color` | `--try` from `data-place/attributes-wide` with `--rclick cpu_cores --click "Color by" --expect "Paints 300 hosts" --expect-not amount`; from `table-dock/wide` with `--rclick hostname --click "Color by" --expect-not "Pick a field"`; from `graph-place/wide` with `--click Everything --hover 6366F1 --click "Use a field or result for Color"`, then `cpu p95`, Enter and Escape, `--expect "Orange to brown"`; from `style-pickers/wide-color-by` with `env`, Enter and Escape, `--expect-not 808080` |
| (q) A filter step opened the transfers' step (amount >= 1,000) in every other project | Fixed in `data-place.js`: Add filter step opens the new step at once in its own project, its field list open and empty (`inspector-attribute-and-filter-step/step`); every step row opens its own rule | `inspector-attribute-and-filter-step/step` | `--try` from `data-place/attributes-wide` with `--click "Add filter step" --click "New step" --expect-not amount --expect "Pick a field"`; the same from `data-place/attributes-nested`, `data-place/plain-json` and `data-place/graph-file` |

Version 4's own checks stay in the matrix through these cells: notes with no name
(`notes-place/all`), empty and multiple labels (`inspector-group-set-path-row/label-empty`,
`label-two`), the full Data page and door entries in both Row and Pair (`data-page/entries`,
`data-page/entries-pair`, `data-page/entries-as-nodes`), and weight at load
(`data-page/buildings`, `analyze-popover/essentials`).

---

## Routes added for the matrix

All built. They rest on three shell changes (`structure-b-refined.md` section 13): `study.mjs`
reads the `@1024` suffix and has `--matrix`, which fails on a section of `--list` with no row, a
blank cell, an N/A with no reason, or a route that does not exist or does not pass `--check`; the
wide, nested and plain JSON projects have their own canvas, graph inspector, table and paint tree;
and every route below uses the one field list (`AB.fieldList`, `AB.openFieldList`) and the one
problem block (`AB.problem`).

| Route | Dataset | What it shows |
|---|---|---|
| `start-screen/recent-missing` | -- | A recent project whose file was moved: "Not found" on its row; Locate... and Remove from list in its menu |
| `start-screen/long-name` | -- | A 60-character project name and a deep folder path in Recent, end ellipsis, the full text in the tooltip |
| `graph-place/find-no-match` | lesmis | The tree's find with `No match for "xyz"` |
| `graph-place/one-group` | lesmis | A run that found one group: "1 group" |
| `graph-place/long-names` | lesmis | A 60-character row name and folder name |
| `graphs-switcher/many` | transactions | A graph per month of transfers: the list scrolls; Find past 15 |
| `graphs-switcher/long-name` | transactions | A 60-character graph name in the switcher and the header |
| `data-place/no-sources` | -- | No data: "No data. Add data" in Sources |
| `data-place/refreshing` | transactions | A URL source refreshing, its row's progress |
| `data-place/refresh-failed` | transactions | Refresh failed: the address did not answer; the row keeps the last copy |
| `data-place/long-source-name` | transactions | A 60-character file name on a Sources row |
| `data-place/step-attribute-gone` | transactions | After Replace, a step reads an attribute the new file lacks |
| `data-place/one-step` | transactions | One filter step: "1 step, 1 on" |
| `data-place/wide-filters` | wide | A step on `vuln_count_critical_unremediated_over_30_days`, middle ellipsis |
| `data-place/attributes-no-match` | wide | Find typed "xyz": the empty line and Clear |
| `data-place/plain-json` | plainJson | The twelve co-authors: a short list, no Find |
| `data-place/attributes-nested` | nested | The tables the last Load made (by default researchers with co-author edges, institutions, links weighted by `weight`): dotted subheads (`profile.contact`), a list attribute (`tags`), arrays kept whole as `{ }`; a row opens its attribute inspector |
| `data-place/attributes-wide` | wide | 69 host and 26 connection attributes: Find (a typed snake_case name matches too), groups open, "In use" first with what uses each (Key, Name, From, To, Weight: the roles set at load), fill figures; a row opens its attribute inspector |
| `data-place/attributes-wide-search` | wide | Find typed "vu cr": two matches, bold parts, the 46-character name middle-truncated, the count announced |
| `views-place/applied-missing` | lesmis | A view that named a deleted row: applied, the notice names what was gone |
| `views-place/many` | lesmis | A 20-view tour: the list scrolls; Find past 15 |
| `views-place/long-name` | lesmis | A 60-character view name |
| `notes-place/find-no-match` | lesmis | Notes' find with no match |
| `notes-place/one-note` | lesmis | One note: "1 note" |
| `notes-place/many` | transactions | Forty notes on the transfers: the list scrolls; Find past 15 |
| `notes-place/long-note` | lesmis | A 600-character note and a long subject chip |
| `notes-place/editing-long` | lesmis | The note editor holding a 600-character note and a 60-character subject chip |
| `notes-place/chip-removed-saved` | lesmis | Regression (b): a note saved after a subject chip was removed |
| `assistant-place/stopped` | lesmis | An answer stopped part way: what streamed stays, marked stopped |
| `assistant-place/long-conversation` | lesmis | Thirty turns, a long answer with a table; the list scrolls |
| `data-page/reading` | transactions | A large file reading, with graph-io's row count |
| `data-page/wide-hosts` | wide | hosts and connections: 69 and 26 columns; the default role in quiet text; Key frozen; role columns pinned left; Go to column above the grid |
| `data-page/wide-find-column` | wide | Go to column typed "vu cr": the header scrolled to and focused |
| `data-page/wide-link-menu` | wide | A connection's link "by" menu: host by its Key, then its other unique columns, in the field list |
| `data-page/link-by-badge` | doorEntries | Regression (d): person_id linked to person by badge; the counts and the report change |
| `data-page/json-plain` | plainJson | Node-link JSON: one row, roles set by the file (its `weight` column proposed as the weight), every check green, focus on Load; the strip says a graphology or JGF file loads the same way |
| `data-page/json-tree` | nested | The document's tree of objects and arrays with counts; researchers, institutions and links proposed and ticked, `coauthor_ids` proposed as Several edges and links' `weight` as the weight; `meta` unread. Load records every choice, and the Data place, graph inspector and canvas show what was chosen. Also opened from the start screen's samples |
| `data-page/json-researchers` | nested | The researchers table: flattened columns grouped under their parents, seven-segment headers middle-truncated, array columns showing `[3]` |
| `data-page/json-keep-value` | nested | `attributes.profile.contact` set to Keep as one value from its parent header's menu |
| `data-page/json-array-menu` | nested | The role menu on `coauthor_ids`, Several edges checked (graphty-element's proposal): One value, Several values, Several edges (514 edges), Several rows disabled with its reason; its trigger closes it |
| `data-page/json-affiliations` | nested | `affiliations` as Several rows: a child table under researchers, its locked parent column, Each row is: an edge, researcher to institution |
| `data-page/json-any-type` | nested | `links[].target` linked to Any of these types: researcher and institution ticked |
| `data-page/json-report` | nested | The match report: `meta` not read; 4 co-author pairs listed by both researchers, with One edge per: Item or Pair on the line; 118 links to researcher and 42 to institution |
| `data-page/json-invalid` | -- | Not valid JSON: the line and column; Choose another file... |
| `data-page/json-no-records` | -- | Valid JSON with no array of records: the tree still shown; Choose another file... is primary |
| `data-page/json-keyed` | registry (a small package registry built in `data-page.js`) | The other document shapes: `packages {1,204}` keyed by name (Key: `key`), `dependencies` as an object keyed by package name with the array role menu (Several edges to package, the range as the edge's `value`), `maintainers` as an array of records |
| `data-page/json-graphology` | plainJson | The same coauthors graph as a Graphology export (`key`, `attributes.*`): one row, roles set by the file, Load in one step |
| `data-page/json-jgf` | plainJson | The same coauthors graph as JGF (nodes keyed by id, `label`, `metadata.*`): one row, roles set by the file, Load in one step |
| `data-page/edit-json-links` | nested | Edit source from the Data place's links row: the load as it was, links selected, Apply back to the Data place |
| `canvas-and-states/registry` | registry | The package registry as loaded from `data-page/json-keyed`: 1,204 packages and their dependencies, unstyled |
| `data-page/json-path-gone` | nested | Edit source after the document changed: a ticked array no longer exists, the refusal on its tree row |
| `full-canvas-modes/no-versions` | transactions | Version history with only the first load |
| `present-mode/long-caption` | lesmis | A 300-character caption, wrapped |
| `inspector-nothing-selected/empty-graph` | -- | The graph's inspector with no data |
| `inspector-nothing-selected/wide` | wide | The hosts graph: its weight line naming `bytes_total_24h` |
| `inspector-node/why-unknown-path` | lesmis | Why this look with a row bound to a path that reads nothing: the error on its line, from graphty-element |
| `inspector-node/wide-data` | wide | A host's Data tab: the 2 fields in use, each tagged with what uses it, "67 more attributes", "10 empty" |
| `inspector-node/wide-more` | wide | The same with "67 more" open and searched "vu cr"; a row opens that attribute's inspector |
| `inspector-node/wide-why` | wide | A host in the project after a Size row on `vuln_count_critical_unremediated_over_30_days` was added (`graph-place/wide-sized`): Why this look with the middle ellipsis |
| `inspector-node/nested-data` | nested | A researcher: dotted attributes under their parents; a value kept whole shown as a collapsed tree; `tags` as a list |
| `inspector-node/plain-data` | plainJson | A node of the plain JSON graph (Coauthors): its Data tab, Key and Name in use; the canvas hot spot and the Shift+Arrow walk land here, so the reader stays in the Coauthors project |
| `inspector-edge/wide-data` | wide | A connection's Data tab: in use, then the node inspector's "N more attributes" (one row per attribute, its value at the row's end), empty values counted |
| `inspector-several-elements/wide` | wide | Five hosts selected: ranges of the in-use attributes, then "67 more" |
| `inspector-group-set-path-row/rule-set-empty` | lesmis | A rule set that matches no nodes |
| `inspector-group-set-path-row/one-member` | lesmis | A kept set of one node: "Paints 1 node" |
| `inspector-group-set-path-row/long-name` | nested | A 60-character set name; a label bound to a long field; the set is a row of `graph-place/nested-set` and the canvas paints its 23 members |
| `inspector-measure-row/long-name` | wide | A measure row painted from the 46-character attribute: the row of `graph-place/wide-sized`, drawn by `canvas-and-states/hosts-legend` |
| `inspector-folder/empty` | lesmis | A folder with no rows |
| `inspector-folder/long-name` | lesmis | A 60-character folder name |
| `inspector-attribute-and-filter-step/step-attribute-gone` | transactions | A step whose attribute is gone after Replace |
| `inspector-attribute-and-filter-step/sparse` | wide | `legacy_asset_tag`, partly filled: its fill and the count with no value |
| `inspector-attribute-and-filter-step/list-attribute` | nested | `tags` as a list attribute: Several values, its filter reading "contains" |
| `inspector-attribute-and-filter-step/wide-filter` | wide | A filter step's attribute picker on the hosts: the field list, menu size |
| `inspector-attribute-and-filter-step/long-name` | wide | The inspector of the 46-character attribute |
| `inspector-attribute-and-filter-step/step` | transactions (or the project its Data place hands over) | Any project's filter step; a new one binds nothing until a field is picked, its field list open |
| `inspector-attribute-and-filter-step/lesmis-field` | lesmis | A Les Miserables attribute's inspector, read from its 77 rows |
| `graph-place/painted` | wide (or the project Color by was used in) | The tree after Color by or Size by on an attribute: a measure row named after it |
| `inspector-measure-row/painted-color` | wide | The measure row Color by made, its values read from the attribute |
| `inspector-measure-row/painted-size` | wide | The measure row Size by made |
| `style-pickers/painted-color` | wide | That row's Binding popover; a new source repaints the row |
| `style-pickers/painted-size` | wide | The Size by row's Binding popover |
| `style-pickers/bound` | lesmis (or the project of the line clicked) | A line bound with its bind icon (Everything's Color), its Binding popover |
| `select-where/attribute` | wide (or the attribute's project) | Select where <attribute> is...: the one Select where dialog with the attribute in the query, counted over that project's rows |
| `inspector-saved-view/long-caption` | lesmis | A long caption in the view's inspector |
| `canvas-and-states/hosts` | wide | The hosts graph drawn unstyled (also the nested and plain JSON projects' canvas); monitor-prod-iad-03 (and on the nested project the first researcher) is a click target that selects it; a click on empty canvas stays in the project |
| `canvas-and-states/hosts-legend` | wide | The legend titled with the 46-character attribute |
| `canvas-and-states/walked` | lesmis | Regression (a): after Shift+Arrow, the next node selected, the selection bar showing |
| `selection-bar/long-name` | lesmis | One node with a 60-character name selected |
| `table-dock/no-match` | lesmis | The table filtered to no rows |
| `table-dock/edit-refused` | lesmis | A cell edit graphty-element refused: reverted, the reason in the notice |
| `table-dock/wide` | wide | The hosts table: Key frozen, the key and in-use columns, "Columns: 2 of 69"; a row selects that host; a column's menu is the attribute's menu |
| `table-dock/wide-columns` | wide | The column chooser open: the field list with checkboxes, searched |
| `style-pickers/wide-no-match` | wide | A field picker typed "xyz" |
| `style-pickers/wide-size-by` | wide | Size by: the number attributes, then "Not a number (45)", disabled with the reason |
| `style-pickers/wide-color-by` | wide | Color by on the Size row of `graph-place/wide-sized`: Find, In use first, groups by table |
| `style-pickers/wide-search` | wide | Color by typed "cpu p95": the match bold, the count announced |
| `style-pickers/nested-color-by` | nested | Color by on the researchers: `profile` and `profile.metrics` subheads, collapsed unless in use; `tags` and `attributes.profile.contact` (kept whole) last, disabled: "tags holds several values; use Show as groups" |
| `style-pickers/wide-bind` | wide | Bind on a line: the same list |
| `style-pickers/wide-label` | wide | The Label "+": Typed text first, the attributes, then Notes |
| `style-pickers/binding-unknown-path` | lesmis | The Binding popover with a path that reads nothing: the element's error and what to do |
| `style-pickers/binding-long` | nested | A binding to `attributes.profile.metrics.citations.last_5_years` |
| `view-flyout/many-views` | lesmis | Twenty saved views, one with a 60-character name |
| `path-popover/no-path` | lesmis | No path between the two nodes |
| `analyze-popover/wide-weight` | wide | Analyze's Weight line on the connections: the field list, menu size, number attributes first, "Not a number" disabled with the reason |
| `analyze-popover/no-match` | lesmis | The catalog searched with no match |
| `project-menu/long-name` | lesmis | A 60-character project name in the header and its menu |
| `commands-and-search/find-no-match` | lesmis | Find with no match |
| `select-where/no-match` | transactions | A query that matches nothing |
| `select-where/wide` | wide | The Query tab's Insert attribute... open on the hosts (the field list, menu size), then the query holding the 46-character attribute |
| `export-video/failed` | lesmis | Recording stopped: the reason and Try again |
| `recipe-apply/wide-mismatch` | wide | A recipe naming six attributes, each matched against the 69 through the field list |
| `graph-place/wide-sized` | wide | The hosts with the first row a reader adds: Size by the 46-character attribute; the field lists tag it "Size" only here |
| `graph-place/nested` | nested | The research network as loaded: the rail's Graph and a click on empty canvas land here |
| `graph-place/nested-set` | nested | The research network with a kept set of 23 researchers, painted green on the canvas |
| `graph-place/plain-json` | plainJson | The plain JSON graph as loaded |
| `canvas-and-states/nested-set` | nested | The research network with the set's 23 members green and the legend naming the set |
| `inspector-attribute-and-filter-step/wide-field` | wide | Any other host or connection attribute, opened from a list: name, fill, what uses it, its values |
| `inspector-attribute-and-filter-step/nested-field` | nested | Any other researcher, institution or link attribute, opened from a list |
| `inspector-attribute-and-filter-step/plain-field` | plainJson | Any attribute of the plain JSON graph, opened from Data > Attributes (`data-place/plain-json`) |
