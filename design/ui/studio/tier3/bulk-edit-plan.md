# Bulk edit: build plan

What the owner decided on 2026-10-15 (concept round 4, option B4): a grouping algorithm's groups
become ordinary style layers in a folder named for the run, and selecting a folder or several
layers turns the existing Style panel into a bulk editor with guard rails. Bulk edits are one-time
writes into each layer, one undo step each. "Distribute" (a value per layer from a list) is not
built.

## What already exists (do not rebuild)

- Multi-select in the layer tree: click, Shift-click (range), Ctrl/Cmd-click (toggle), Enter or
  Space with the same modifiers (compact-mantine `Tree`, `selectable`; app `StyleTree.tsx`
  `openRows`). Several rows open `MultiRowPanel.tsx`: fields read "Mixed" or "Set on N of M",
  writes go through one `session.transaction` (one undo step), locked rows are skipped, Selection
  colors swap one color for another.
- Re-run matching by shared members: `RunsApi.realignGroups` and `styles/values.ts`
  `realignPatch` already carry a layer's rule conditions (`community == 3`) and value entries to
  the group sharing most members, and report unmatched groups on the layer as codes.
- A recursive "layers under these rows" walk: `StylesApi.ts` `layersUnder` (private).
- Batched style commands: `replaceColor` builds a `{ batch }` of `style.patch` updates.

## What is missing

- A Mixed field is read-only text: it cannot be typed over or picked.
- A folder's Style tab is a list of its rows (`FolderPanel.tsx`), not a bulk editor, and
  `MultiRowPanel` drops folders from a mixed selection instead of reaching through them.
- No scope line, no per-field breakdown, no "write only where already set" rule, no receipt.
- No "Vary by data" on a Mixed field.
- A run paints one binding layer; nothing makes a folder with one layer per group.
- Keyboard can only extend a selection with Shift+Enter/Space, not Shift+Arrow; touch has no
  way to select several rows.

## Units, in order

Element units first (additive API only; `npm run api:report` in graphty-element and commit the
report with each). Each unit: tests first, then code, then lint and the package's tests.

### E1. `styles.layersUnder(rowIds)`: what a bulk edit would reach

Make the private walk public, returning per layer row: `{ row, layers, hidden, locked, sets }`,
where `hidden` and `locked` include the folders above it and `sets` lists the channels the row's
layers set or encode. Order: paint order, top first. Throws `E_UNKNOWN_LAYER` as today.

- Files: `graphty-element/src/session/styles/StylesApi.ts` (expose, add the facts),
  `session/styles/index.ts`, `api/session.api.md`.
- Tests: `test/session/styles/layers-under.test.ts` -- a folder with a nested folder, a hidden
  sub-folder and a locked layer: every layer reached once, hidden/locked inherited, `sets` right.

### E2. `styles.updateMany(patches, options)`: many layers, one step, one repaint

`updateMany(readonly { id, patch }[], { label?, keepEmpty? })`, built like `replaceColor`'s
`{ batch }`. A locked layer is refused per item and reported in the result
(`{ updated: Layer[], skipped: { id, code }[] }`), never failing the rest.

- Files: `StylesApi.ts`, `api/session.api.md`, a guide paragraph in the existing styles guide.
- Tests: `test/session/styles/update-many.test.ts` -- 12 layers written, `history` grows by one,
  one undo restores all 12, the styles lane reports ONE repaint pass (read `lastPass` / count
  passes through the repaint hook), a locked layer comes back in `skipped`.
  If a plain `session.transaction` already repaints once, the test says so and `updateMany` is
  only the simple path over it.

### E3. A run's groups as layers in a folder (`RunStyle.groups: "layers"`)

New optional field on `RunStyle`: `groups?: "layers"`, plus `groupName?: (g: { value, rank,
size }) => string` (default `String(value)`, so the element writes no English). Default
unchanged (one binding layer). For a partition suggestion, the run's step adds a folder named
`RunStyle.name` (else the run's catalog `plainName`) and, largest group first, one node layer per
group: selector `<path> == <value>`, `set.color` from the run's categorical palette by rank,
source `{ by: "run" }`. Non-partition suggestions ignore the option. On re-run: existing layers
follow their groups (already done by `realignPatch`); a new group gets a layer at the folder's
end; a layer whose group vanished keeps its place and its unmatched code. Removing the run
removes its layers and the folder when it is left empty.

- Files: `session/runs/types.ts` (`RunStyle`), `session/styles/autoApply.ts` and `derive.ts`
  (plan the folder and layers into the run's step), `session/runs/RunsApi.ts` (re-run adds new
  groups' layers), `api/session.api.md`.
- Tests: `test/session/runs/groups-as-layers.test.ts` -- Les Miserables + Louvain: one folder,
  one layer per community, counts sum to 77, one undo removes run, folder and layers; recolor
  group layer "Valjean's" then re-run with another resolution: the layer still holds Valjean
  and its color; a new group gets a new layer; Leiden on College football the same way.

### E4. `styles.preview(binding, { within })`: what a binding paints inside one layer

New optional `within: LayerId` on `preview`'s options: the bins are counted only over the
elements that layer matches (the scale is still the whole graph's, so colors match the copied
rule). Lets the app show "each layer gets this color" and tell whether a folder's layers share
a data value (each layer's preview within it has one bin).

- Files: `StylesApi.ts`, `session/styles/encoding.ts` (count over the layer's matches).
- Tests: in `test/session/styles/preview.test.ts` -- a community layer's preview `within` it
  has one bin with its community's color; a hand-made "Hubs" layer has several.

### E5. The legend folds identical copied bindings

After Vary by data, each group layer holds the same `fill by community` rule. `legend()` lists one
block for identical bindings (same path, scale, palette, map) instead of one per layer, naming
every layer it came from (`layers: LayerId[]` on the block, additive).

- Files: `session/styles/legend.ts`, `api/session.api.md`.
- Tests: `test/session/styles/legend.test.ts` -- 8 copies give one block listing 8 layers; a
  copy with one changed entry gives its own block.

### A1. Selecting several layers by keyboard and by touch

compact-mantine `Tree`: Shift+ArrowUp/Down extends the selection from the anchor; a new
`checkboxes` prop draws a checkbox per row and makes a plain click toggle (the touch path). App:
a "Select..." item in the tree's "+"-side menu turns checkbox mode on; Escape or "Done" turns it
off.

- Files: `compact-mantine/src/components/tree/Tree.tsx`, its stories and tests;
  `graphty/src/workspace/graph-place/StyleTree.tsx`.
- Tests: compact-mantine `Tree` browser test with `userEvent` (Shift+ArrowDown twice selects 3;
  checkbox clicks select 2 without modifiers); app
  `graph-place/__tests__/MultiSelect.real-element.test.tsx` (Cmd-click, Shift-click,
  Shift+Arrow, "Select..." then taps: the inspector heads "N layers").

### A2. The bulk panel: folders, scope line, writable Mixed, write rule, receipt

One panel for a folder or several rows (folders reached recursively through E1); `FolderPanel`'s
row list goes (the tree already shows those rows), its Selection colors stay. Pieces:

- Scope line: "12 layers in Louvain: 2 in Fantine's, 2 hidden, 1 locked and skipped. Layers
  added later are not changed."
- Mixed field: shows "Mixed" but takes a typed value or a pick (color chit, select, number), and
  opens a breakdown ("5 set their own color; 1 not set: Top 10 labels").
- Write rule: a write goes to layers that already set the property; if none do, to all. Through
  E2, one undo step.
- Receipt under the field: "Fill: 5 changed, 1 left unset, 1 locked skipped", with "Also set those
  1" (a second E2 write) and Undo (`history.undo`).

- Files: `graphty/src/workspace/style/MultiRowPanel.tsx` (becomes the bulk panel),
  `FolderPanel.tsx` (delegates), `PropertyRow.tsx` (Mixed control writable, breakdown),
  `inspector/Inspector.tsx` (folder Style tab), `style/words.ts` (all the words).
- Tests: `style/__tests__/BulkEdit.real-element.test.tsx` with real clicks and keys -- select
  the Louvain folder, pick blue on Fill: every unlocked group layer that set a color is blue
  (read `styles.get`), the label-only layer is untouched, the receipt counts, "Also set those"
  sets it, one Ctrl+Z restores everything; a nested sub-folder's layers are reached; a hidden
  layer is counted in the scope line.

### A3. Vary by data on a Mixed field

The vary glyph shows on Mixed fields. It opens the existing `BindingPopover` in a "many layers"
mode: pick a field and a palette (or ramp for size/opacity, shape list, line pattern, arrows);
the popover lists each layer with what it will paint (E4 `within`), and Apply copies the binding
into each layer as its own rule through E2. When the layers share no data value (some layer's
preview within it has more than one bin), the vary entry is off with the reason.

- Files: `style/PropertyRow.tsx`, `style/BindingPopover.tsx`, `style/MultiRowPanel.tsx`.
- Tests: `style/__tests__/BulkVary.real-element.test.tsx` -- Louvain folder, Fill > Vary >
  community, Apply: each group layer holds a `by` binding and its nodes draw distinct colors; Shape
  vary by community gives each layer one shape; Size ramp copied; the "Story highlights"
  hand-made folder shows Vary off with its reason; one undo restores.

### A4. Running a grouping algorithm makes the folder

Analyze passes `style: { groups: "layers", groupName }` (the app's names: the reader's own value
name, else "Group N" by rank, as `Groups.tsx` `groupNames` does today). The per-group popover
route for a run (`GroupDetail` in `StylePanel.tsx`, the group list in the run's binding popover)
is no longer reached; `Groups.tsx` stays only for a hand-made binding on a data column.

- Files: `graphty/src/workspace/analyze/AnalyzePopover.tsx`, `style/StylePanel.tsx`.
- Tests: `analyze/__tests__/GroupsAsLayers.real-element.test.tsx` -- click Analyze, Louvain,
  Run: the tree shows a "Louvain" folder whose layer rows carry group names and node counts;
  re-run from its menu keeps a recolored group's color on the same members.

### A5. Stories, gates, freeze

Stories in `StylePanel.stories.tsx` for: the Louvain folder selected (scope line, Mixed), the
receipt after a write, Vary by data on Fill. Run lint, build, and the `graphty`,
`graphty-storybook`, `graphty-element-default` shards (`./tools/run-tests.sh <shard>`). Freeze
`.study-builds/tier3-bulk-<sha>` and restart servherd `design-studio-tier3` on it.

## Walk script (try every feature)

Les Miserables + Louvain:

1. Open Les Miserables. Analyze > Louvain > Run. The tree shows a "Louvain" folder with one layer
   per community, largest first, each colored.
2. Click the Louvain folder. The Style tab shows the scope line ("N layers in Louvain") and Fill
   reading Mixed. Open Fill's breakdown.
3. Lock one group layer, hide another, drag two group layers into a new sub-folder "Fantine's";
   add a label-only layer "Top 10 labels" (Text only) into Louvain. Click Louvain again: the
   scope line counts the hidden, the locked and the sub-folder.
4. On Fill pick blue. Every color-setting layer turns blue, the locked one does not, Top 10
   labels is left unset; the receipt says so. Press "Also set those 1", then Undo, then Ctrl+Z
   until the original colors are back (one step per edit).
5. Fill > Vary > by community, Okabe-Ito: the preview lists each layer's color; Apply. Each
   community paints its own color; the key shows one block.
6. Shape > Vary > by community: a shape per community. Size: type 2 into the Mixed field.
7. Cmd/Ctrl-click three group layers; Shift-click to extend; then select by keyboard (focus the
   tree, Shift+ArrowDown). Change Opacity: only those layers change.
8. Tree menu > Select...: tap two layers' checkboxes, change Fill, Done.
9. Recolor one group layer by hand (its own Style tab). Re-run Louvain with a new resolution from
   the folder's menu: the recolored layer still covers the same characters; any new group gets a
   new layer at the folder's end.

College football + Leiden:

10. Open College football. Analyze > Leiden > Run: a "Leiden" folder with one layer per group.
11. Select the folder: Fill > Vary > by conference (a data column, not the run's value):
    layers whose teams span several conferences make the preview show several colors per layer.
12. Make a hand-made folder "Story highlights" with two layers on unrelated rules; select it:
    Vary is off and says why; a typed Fill still writes to both.

## Owner feedback 2026-10-16: Vary by Layer

Selection colors is removed (bulk-only, color-only). In its place, the Vary list of any property
on a folder or several layers offers "Layer": the property's per-value control spread over the
layers in list order (graphty-element `styles.sequence`), a preview line per layer, Apply writes
each layer its own plain value in one undo step under the usual write rule and receipt.

Revised the same day: "Layer" opens the binding popover a value of the data opens (palette, one row
per layer with the property's own control, overflow, range), held unwritten while open; closing it
writes each layer its own plain value in one undo step. The vary list's heading is "Vary by".

Revised again the same day ("I should be able to do the EXACT same with the Layer field"): the
per-layer rows are Louvain's group rows themselves -- one component, the same field, name, count,
eye and actions menu, the same first 8 then "N more" with search and sort -- fed by graphty-element's
`styles.layerGroups`, each layer one group, top first. Rows leave out what a layer already is (New
layer for) and what a list of layers has no use for (fold into Other, a group's detail).

## Not built now

- Edge layers per group ("edges inside a community"): needs the element to read an edge's
  endpoints' values; add when a walk needs a group's edges styled.
