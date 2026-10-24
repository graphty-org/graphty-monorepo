# Decisions waiting for the owner

Changes made locally on the studio branch that add to or change graphty-element's public API. Each
one is a contract with third-party consumers once it is published, so each needs the owner's yes
before it lands on master. Newest first.

## 2026-10-23 -- Owner approval: compact-mantine is locked to its Figma spec (compact-mantine)

Owner approved the 24 departures in figma-spec.md section 14; any other departure, or a change to one
of these, needs the owner. In the owner's words, on the design of branch
`fix/compact-mantine-figma-drift`: "I agree with your decisions ... lock in this design so that we
don't drift from it". compact-mantine draws and behaves exactly as Figma does except for those rows.
`tools/check-figma-lock.mjs` (pre-push gate and CI's Checks job) fails a push that changes the spec,
the Figma tests or their harness, or the theme's token values, unless the commit making the change
carries the owner's `Figma-Approved: <reason>` trailer.

## 2026-10-22 -- Owner rule: compact-mantine is strict Figma (compact-mantine, graphty app)

compact-mantine draws and behaves exactly as Figma does unless there is a good reason to depart,
and every departure kept is justified to the owner in writing and listed in
`compact-mantine/design/figma-spec.md` section 14. "The team decided it", "a study participant was
confused on one screen" or "a test expected it" are not reasons by themselves. A change made for
contrast belongs in the opt-in AA option (`highContrast`), never in the default theme. The team
decisions this reverted are marked "Superseded in part" below.

## 2026-10-18 -- Owner ruling: menus follow the page theme (compact-mantine)

The owner chose, for issue #3026, that menus, listboxes and context menus follow the page theme: a
light surface with dark ink in the light app, Figma's #1e1e1e menu in the dark app. Figma's
always-dark menu stays one prop away (`variant="inverse"`, or the class `cm-menu-inverse`). The
highlight, danger fill and secondary ink inside the page-following menu are Figma's in the default
theme; their darker contrast values belong to the opt-in AA option (`highContrast`), per the
owner's rule that the default theme looks exactly like Figma (recorded 2026-10-22).

## 2026-10-20 -- Decided by the team: a row that started empty takes its first rule (graphty-element)

graphty-element, non-breaking, the second half of "a row of one kind may start empty" (2026-10-19).
`styles.addRow` with target `"node"` or `"edge"` and no look adds an empty row, but the row's next
`styles.update` or `updateMany` that changes only its selector or name is refused with `E_BAD_LAYER`
("writes no channel"), because a one-kind row carries no `row` id and is re-checked as a lone
layer. The fix keeps a row the element admitted empty admissible until something writes a channel,
as an empty both-kinds row already is. Only calls that threw now succeed; an update that takes the
last value away from a layer that had one still needs `keepEmpty`, and `styles.add` still refuses
an empty layer. Without it, "New layer from selection" makes a layer whose condition cannot be
edited before a look is chosen. Recorded in `tier3/decided.md`, 2026-10-20 (pass 2).

## 2026-10-20 -- Decided by the team: a saved project reads a renamed channel, and a reload keeps picked ties (graphty-element)

graphty-element, non-breaking, both fixes of documents and loads that failed. (1) `project.open`
reads `node.haloSize` in a saved style member as `node.haloScale`, the name golden gave the
channel; the channel set is unchanged (`node.haloSize` is read only from a style document, by
`project.open` and `styles.applyTemplate`; `styles.add`, `encode` and the catalog do not accept it,
and new documents write `node.haloScale`). Without it every project saved before the golden merge opens
with no layer at all, because one unknown channel refuses the whole style member
(`E_UNKNOWN_CHANNEL`). (2) A replacing load of the same file keeps a hand-picked layer's ties: the
layer's ids follow the ties through the element's stable edge identity, as a project open already
remaps them. Today the layer is left naming session ids the reload no longer issues, and matches
nothing. Only calls that lost the reader's work change. Recorded in `tier3/decided.md`, 2026-10-20.

## 2026-10-19 -- For the owner: should a value beyond a written domain be drawn past the range's end?

graphty-element's continuous scales (linear, log, pow, sqrt and the rest) place a value between the
two ends of the binding's domain and cut the place to the ends: a value above the domain is drawn
as the range's upper end, a value below it as the lower end. This is documented
(`BindingPreview.above`: "How many elements carry a number above the domain, painted as its upper
end") and tested (`scales.test.ts`, "clamps a value outside the domain rather than running off the
end of a palette"). It is the same for every channel, so size behaves as color does.

In the graphty app, writing "Values to" sets an explicit domain, and "Clamp outliers" sets the
other way to settle the extent, percentiles; the element takes one or the other, never both. So
with "Values to" at 100,000 and "Clamp outliers" off, a node holding 250,000 is still drawn at the
upper end of the size range, the same size as 100,000 and close to one holding 90,000. The switch
being off does not mean "do not clamp"; the domain itself clamps.

Drawing past the end changes what an existing API does and returns (every continuous binding with
an explicit domain, and the documented `above` count), so it is not made. Ways forward:

- an optional binding setting, for example `beyondDomain: "end" | "extend"`, default `"end"`
  (today's behavior), where `"extend"` keeps placing a numeric channel's value on the same line
  past the domain; a palette has no color past its end, so color would stay at the end either way.
  This is additive and the team can build it if the owner wants the app to offer it; and the
  app would then decide what its switch means and what it is called; or
- keep the element as it is, and the app words its controls so that a written domain reads as the
  range values are drawn across, with values outside it drawn at the ends.

Until then a value beyond a written domain is drawn at the domain's end, as it always has been.

## 2026-10-19 -- Decided by the team: the color picker refuses text out loud, and Tab reaches every control (compact-mantine)

**Superseded in part by the owner's 2026-10-22 strict-Figma rule** (the default draws what Figma draws; contrast values live in the opt-in AA option): the refusal line under the value row is gone; refused text goes back to the color in force, as Figma's box does, and the reason is only spoken. The picker no longer opens with focus in its value box.

Additive. `ColorPickerPanelLabels` gains `refused(typed, format)` and
`refusedKept(typed, kept, format)`, overridable through the existing optional `labels` prop.
Text in the picker's value box that reads as no color in the chosen format is refused the way the
color field's own hex box refuses it: Enter keeps the text, marks the box invalid, keeps the picker
open and shows a line under the value row, an alert, saying what the box takes in that format (a
color name or a hex code, or three numbers); leaving the box puts the color in force back and says
so. Before, the text was dropped without a word and Enter closed the picker.

Pop-out panels (`Popout.Panel`) that open with focus on a field past their first stop
(`data-autofocus`) now walk every stop before Tab leaves: past either end, Tab or Shift+Tab wraps
to the other end while some stop in the panel has not had focus since it opened; once every stop
has, Tab past the end closes the panel and moves on beside what opened it, as before. A panel that
opens on its first stop is unchanged. The picker opens in its value box, so the close button, the
saturation field, the eyedropper, the sliders and the format list were never reached by Tab.

## 2026-10-19 -- Decided by the team: a list says when typed letters match nothing (compact-mantine)

**Superseded in part by the owner's 2026-10-22 strict-Figma rule** (the default draws what Figma draws; contrast values live in the opt-in AA option): the line at the list's foot is gone (Figma draws nothing while typing); the spoken status and "no match highlights nothing" stay. Tab while a list is open now does nothing, as in Figma, instead of closing it.

Additive. compact-mantine's labels gain an optional `listNoMatch(typed)`, default
`No option starts with "<typed>"`, overridable through `LabelsProvider` like every other string.
When the letters typed into an open select's list start no option, the line at the list's foot
shows it in place of the letters, and a polite status region inside the list says it; nothing is
highlighted and Enter picks nothing, as before. The words name what was typed and say "option",
not the field's own noun, so they fit every list. The list's keyboard runs on the document,
outside React, so the provider hands it the words (one set per page).

Also: a single-choice list with nothing chosen opens below its field as wide as the field (it was
16px wider, which put a field at the window's right edge on its list's edge).

## 2026-10-19 -- Decided by the team: a row of one kind may start empty, like a row of both (graphty-element)

graphty-element, non-breaking: `styles.addRow` with target `"node"` or `"edge"` and no `set` or
`encode` now adds the row, where it refused it with `E_BAD_LAYER` ("writes no channel"). A row of
both kinds could already start empty (each part carries `row`), so one verb answered the same
request two ways depending on the target. Nothing that worked before changes: only a call that
threw now succeeds, and the row paints nothing until its first write, as an empty both-kinds row
does. `styles.add` (one layer, not a row) still refuses an empty layer. The graphty app needs it so
"New layer from selection" makes the selection's layer at once: a node selection's layer paints
nodes only, and adding it as a both-kinds row would also paint the edges its rule reaches.

## 2026-10-19 -- Decided by the team: the key never moves the drawing (graphty app)

Graphty app, no API change. This reverses the arrival frame in the entry below ("the key's room
only while there is a key"): a key that arrives over a drawn node no longer frames the graph. On
the frozen build e3c5bca8e6 that frame made the drawing shrink and move right the moment the first
color was set, on 16 dry-run walks across 15 tasks, and the drawing stayed off center after Undo.
The camera moves only when the reader asks (opening a graph, Frame, Reset view); the key floats
over the canvas, and Frame keeps clear of it through the view insets. A sample still opens
centered on the whole canvas. Recorded in `tier3/decided.md`, "The drawing".

## 2026-10-18 -- Decided by the team: a layer's groups count its own elements; the key and the layer rows say what a layer draws (graphty-element, graphty app)

No API is added. `styles.groups(layer, path)` documents each group's `count` as "how many of the
layer's elements carry it", but it returned the whole graph's count, read from the binding the
repaint prepares over the whole graph (so its scale is the whole graph's). A layer that selects
some elements now counts only those, as documented, and a value none of them carries counts 0; a
layer that selects everything is unchanged. This corrects output to match the documented contract,
so it is recorded here as a fix rather than a change of behavior. The Style tab's group table now
shows a one-node layer's groups as 1, 0 and 0, not the column's counts.

In the graphty app: the key lists a category's values in the order the layer's groups come (the
Style tab table's order) and only those the layer's elements hold, so a one-node layer colored by a
column keys its one value and a recolored group keeps its place; a size or width that is the same
for every group is no key; a ramp whose elements a layer above paints in the same property says how
many ("1 node covered by s01"), as a category's rows already said. A layer row counts, and names
its kind by, the half the reader is building: the halves that set something, else the halves that
carry a condition, else every half it is on.

## 2026-10-18 -- For the owner: should turning "Hide overlapping labels" on or off be an undo step?

graphty-element documents label decluttering (`layoutBehavior.labels.declutter`, and the
`label-declutter` attribute) as a preference of the view that undo does not touch, beside pin on
drag and the throughput settings; only the layout's pacing settings and `session.config` are
project settings that undo takes back. The graphty app keeps the reader's label choices in its own
view settings for the same reason, and the app never keeps a history of its own. A reader who turns
"Hide overlapping labels" on and presses Control+Z finds "Nothing to undo".

Making it a step changes what an existing element API does (a setting undo leaves alone today
would be taken back by it), so it is not made. Two ways forward, either one the element's:

- label settings become project settings (`session.config.set({ labels })`, saved with the
  project and undone like the background), with `layoutBehavior.labels` kept as the view's
  default until a major release removes the second home; or
- the history takes a step for a view setting the consumer names as undoable, so each application
  decides which of its view preferences are steps.

Until then the toggle records no step, as it never has.

## 2026-10-18 -- Decided by the team: Undo says what it takes back, and a dimmed Undo says why (compact-mantine, graphty app)

No API is added or changed. compact-mantine's tooltips: a tooltip a press dismissed comes back when
that press turns its trigger off (Undo pressed until nothing is left), now with the reason ("Nothing
to undo"), and a second press on an off control keeps the reason showing; Mantine keeps one tooltip
element and only changes its words, so the dismissal hid the reason too. In the graphty app: a
command button's accessible name is its tooltip name ("Undo changing node color on Everything"),
and `aria-keyshortcuts` lists every key (Redo: Shift+Control+Z and Control+Y); a press on a dimmed
command clears the notice of its last run; Control+Z and Control+Y work with focus in a non-modal
panel (`aria-modal="false"`, such as a binding's "Color by" panel) unless the focused box holds
typing of its own; each finished change in the condition cards (a number committed, a handle
dragged, a match picked) is its own undo step, while typing in one box stays one step; and Undo
names a filter step as one (`the filter step "name contains GAL"`), since a layer can carry the
same words as its name.

## 2026-10-18 -- Decided by the team: a rule's columns by their names, picked find rows marked (graphty-element, compact-mantine)

Additive only; nothing existing changes what it returns.

- graphty-element `session` entry: `renamePaths(where, rename)` is exported (it was internal). It
  rewrites each path a rule reads through a callback and keeps everything else as typed, so an
  application can show a rule with each column under its own name ("Degree > 30" for
  `graphty.degree > \`30\``) without parsing the rule language itself.
- graphty-element `data.structureValues()`: the values every node carries from the graph's
  structure (`graphty.degree`, and on a directed graph `graphty.inDegree`, `graphty.outDegree`),
  each with `plainName` ("Degree", "In-degree", "Out-degree") and `technicalName`; new type
  `StructureValue`. `selection.checkRule` already suggests these paths, and nothing else named
  them, so every consumer had to hard-code the names. Kept out of `readableValues()` on purpose:
  adding entries there would change what an existing call returns.
- compact-mantine `ResultRow`: optional `picked`. A picked row shows a check at its end and is
  `aria-selected`; only the current row is filled blue (the fill now keys on `data-active`, so a
  row that is both reads the same as before).

## 2026-10-18 -- Decided by the team: an unset field takes the value it shows (compact-mantine, graphty app)

**Superseded in part by the owner's 2026-10-22 strict-Figma rule** (the default draws what Figma draws; contrast values live in the opt-in AA option): a not-set, Mixed or placeholder value is no longer gray italic: a value is drawn in ink and a placeholder in Figma's placeholder color, upright. The behavior described here stays.

compact-mantine and the graphty app. One addition to the API: `CompactMantineLabels.colorDrawn`
(optional, defaulted). The rest changes what the shared controls do, as fixes, with no option to
keep the old behavior, because the old behavior was the defect: a reader could not choose the
starting value on purpose.

- Color field (`CompactColorInput`): while nothing is set, Enter on the color shown, or typing
  exactly that color (then Enter or leaving), chooses it and calls `onChangeEnd`. Tab past an
  untouched box chooses nothing, so walking a panel sets nothing. Its name reads "Node color, not
  set, drawn #6366F1 indigo" (`colorDrawn`), where it read "not set, #6366F1, indigo", which put the
  color where a set value goes. With an empty swatch (nothing drawn) it says only "not set".
- Select (`StyleSelect`): while nothing is chosen, the field draws the default as its placeholder
  (the same gray italic) and the list checks no option, so a check always means "set here". The
  list still opens with the highlight on the value in force, and Enter or a click on it chooses
  it (Mantine skipped a pick equal to its value, so the default could not be chosen). A consumer
  that read the unset field's `value` now reads it empty, with the default in `placeholder`. This
  reverses the earlier "the value beneath carries the same check" call.
  For the owner, not blocking: the unset select's empty `value` is a change a consumer's own code
  could see; it ships as a fix in the next compact-mantine minor unless the owner wants it held
  for a major.
- Number fields (`useNumberField`: `StyleNumberInput`, numeric `ComboInput`, `PanelField`): the
  value is selected however focus arrives, including focus handed over by a script, so typing
  replaces it ("8" then "24" is 24, not 824).
- Graphty app value list: "In use" lists only what this line reads; a value other lines or layers
  read is listed under "Used elsewhere". Reopened on a label whose words are typed, the list marks
  "Fixed text" as the choice in force.

## 2026-10-18 -- Decided by the team: no dead Tab stops, and Escape always does its job (graphty app, compact-mantine)

Graphty app and compact-mantine, no API change.

- A section's "+" with nothing left to add is no longer a Tab stop. It keeps its place, its dimmed
  look and its reason ("Everything in node fill is set") in its tooltip on hover and in its
  description. A keyboard walk met two or three such stops per layer and heard nothing it could
  act on; the lines it would add are each a stop of their own. This reverses the earlier call that
  kept it a stop so a walk "hears why". A dimmed command button (Undo with nothing to undo) is a
  different case: its command is still one the reader looks for, and it says why when pressed.
- Escape in the inspector clears the selection everywhere but in a field (a box, a list, a check
  box, a slider): on the inspector's heading, a tab or a button it does what the canvas menu's
  "Clear selection Escape" says. In a field it stays the field's (close, revert, step back).
  This narrows the earlier call that kept every Escape in the inspector away from Clear selection.
- Escape in the table's grid moves focus to the toolbar's Table button, the control that opened
  the grid; a second Escape then clears the selection as anywhere else.
- Tab out of "Filter analyses" goes to the first Tab stop after the Analyze tool's toolbar in page
  order, so it never wraps to Main menu when another tool holds the toolbar's roving stop.
- compact-mantine: a tooltip on a control inside a tree row (its caret, its toggles) weighs the
  row's own words as it weighs a section's own title, so "Expand Louvain" opens below the row
  instead of over "Louvain".

## 2026-10-18 -- Decided by the team: focus put on a field by program draws its ring (compact-mantine)

`focusWithRing(element)` is a new export of `@graphty/compact-mantine` (additive). A select
trigger draws its focus ring on keyboard focus only, so a field focused for the reader after a
pointer press (a chip that opens a condition card on its first field) landed with no ring and
the reader could not see where the next key goes. The function marks focus as moved by keyboard
and focuses the element; the next pointer press hides rings again as before. A browser option
(`focus({ focusVisible: true })`) would be the natural shape, but Chromium does not support it.

## 2026-10-18 -- Decided by the team: the color picker holds the color before the edit, and Enter closes it (compact-mantine)

**Superseded in part by the owner's 2026-10-22 strict-Figma rule** (the default draws what Figma draws; contrast values live in the opt-in AA option): `CompactColorInput` no longer passes `closeOnEnter` (Enter commits and the picker stays open, as in Figma), and the picker shows exactly the swatches passed in, with no added before-edit swatch, dot or ring. The `closeOnEnter` prop stays.

compact-mantine, additive. `ColorPickerPanel` gains `closeOnEnter?: boolean` (default `false`, so
today's behavior stays): Enter in the value box applies the color and closes the enclosing
`Popout`, which gives focus back to the control that opened it. `CompactColorInput` turns it on,
since its picker is a pop-out of one field and Enter there means "done"; the gradient editor's
picker leaves it off, because Enter there must not close the whole gradient pop-out. Not a key of
its own on the popout: the picker is the only part that knows Enter in its value box is a commit.

The swatch set always holds the color the picker opened on: when the consumer's `swatches` lack
it, it joins them first, at opening only, so the set is the same on every opening of the same
field and "go back to the old color" is one click whatever the consumer passes. Its name says
what it is, "the color before this edit" (the default English of `labels.swatch`; the signature is
unchanged and a consumer's own words still replace it). "The starting color" read as the color the
drawing started with, which it is not after a second edit. The graphty app offers the document's
colors on every color field of a style row, set or not; an unset field offered the package's
default palette instead, so the same line showed two different sets.

## 2026-10-18 -- Decided by the team: the key's room only while there is a key; Frame selection keeps the angle (graphty app)

Graphty app, no API change. This revises the entry below that reserved the key's room whenever the
key is switched on. The room is now reserved only while the key shows entries, so a graph with no
key opens centered on the whole canvas; reserved up front, it left the left third of the canvas
empty on every open. When a key arrives over a drawn node, the graph is framed once clear of it,
only while the element frames on its own and the reader has not placed the camera
(`autoFrame && !cameraPlaced`, the pattern the element documents for `nodesInRect`); a key that
grows, or arrives over the reader's own zoom, still never moves the drawing. Frame selection (F)
asks the element's existing `fitToGraph` option `keepAngle`, so in 3D it moves the camera's target
and distance only and keeps the direction the reader looks from; the selection lands at the center
of the part of the canvas the view insets leave free. The element's default for `fitToGraph` is
unchanged: keeping the angle is a consumer's choice.

## 2026-10-18 -- Decided by the team: a hover ends when the pointer leaves the drawing, and is published (graphty-element)

Additive: the session publishes `selection:hover-changed` with `{ before, after }`, the node under
the pointer before and after, each a node id or null, whenever the pointer reaches a node, moves to
another or leaves (`selection.hovered` is `after` when it arrives). A
`{ match: "state", state: "hovered" }` layer's `styles.counts` already moved with the hover, but
nothing told a host when, so a count shown beside such a layer kept its last reading. The graphty
app's style tree reads its counts again on it. Named beside `selection:changed` and
`selection:origin-changed` because the hover is part of the selection surface
(`selection.hovered`, `selection.hover`).

Behavior with no API change: a hover now also ends when the pointer leaves the drawing (the canvas's
`pointerleave`), for a panel, a popover or a menu opened over the drawing. The scene hears the
pointer only over the canvas, so before this a node stayed hovered, its tooltip drawn and the
Hovered layer painting it, until the pointer came back to the drawing. A hover now ends only when
the pointer is somewhere else, which is what `selection.hovered` already said it meant.

## 2026-10-18 -- Decided by the team: a result row that wraps to two lines (compact-mantine)

Additive, in compact-mantine:

- `ResultRowProps.lines?: 1 | 2`, a new optional prop, default 1 (today's single line ending in
  "..."). With 2, the name and the path each wrap to a second line before they end in "...", for
  results read as words rather than scanned, such as a rule a search offers to run and what it
  would select. The row's tooltip opens when a two-line text is still cut.
- `EllipsizedName` (internal) now also counts a text clamped to lines as cut when it is taller than
  its box; a text that is not clamped is judged by its width only, as before.

## 2026-10-18 -- Decided by the team: a swatch named in sentence case, a search that says it found nothing (compact-mantine)

A fix of wrong output, compact-mantine: `defaultLabels.pickColor(label)` set the control's label
into a sentence with its capital ("Pick Node color" beside "Remove node color"). It now lowers the
first letter of a label word that is capitalized only at its start ("Pick node color", "Pick fill
color"); a word in capitals throughout keeps them ("Pick RGB color"). A consumer that matched the old
name, or wants it otherwise, passes its own `pickColor` to `LabelsProvider`.

Behavior with no API change: `QuickActions` keeps its empty-list message (`noResults`, or
`emptyText`) in one polite live region that is always mounted, so a search that empties the list is
spoken when "No results" appears; with results the region is empty and takes no room.

## 2026-10-18 -- Decided by the team: a tree's resting Tab stop (compact-mantine)

Additive: compact-mantine `Tree` takes an optional `restingId`, the row in the Tab order while no
row is focused or selected. Without it the first row stays the Tab stop, as before. The graphty app
passes its Everything row, so Tab into the style layers lands on the layer that draws the graph,
not on a pinned row that paints nothing until a pointer moves. A focused row, then a selected row,
still win over it, as the WAI-ARIA tree pattern asks. Changing the default instead would move
every caller's Tab stop, so it is an option.

## 2026-10-18 -- Decided by the team: true color words, keywords typed as words, a spoken discard (compact-mantine)

A fix of wrong output, compact-mantine: `colorWord(color)` (exported since 2026-10-17, not yet
published) misnamed colors. 800080 was "dark pink", the 6366F1 a field starts on was "blue" (so a
screen reader heard every node was already blue, and typing "blue" then gave 0000FF), and the
Okabe-Ito green 009E73 was "teal". It now says the CSS keyword, in words, when the color is exactly
one (800080 "purple", 0000FF "blue", 006400 "dark green"; one word where two keywords name a color:
"cyan", "magenta", "gray"), and otherwise names the hue band with new bands: green runs to 170,
then teal, blue to 235, and indigo, violet and purple are words of their own (6366F1 "indigo"). A
consumer that matched a swatch's or a field's name containing an old word sees the right one now.

Additive: `CompactMantineLabels.colorEditDiscarded(kept)`, default "Edit discarded; this stays
<kept>.", spoken from a status region when Escape takes back what was typed in the color box.
Behavior with no API change: the hex box takes a keyword written with spaces or in any case
("dark green", "Rebecca Purple"); a refusal under the row no longer squeezes the field (the message
has no width of its own in the field's grid); the hex and opacity boxes show the text cursor.

## 2026-10-18 -- Decided by the team: a run's redo brings its matches back, and `runs.answered` (graphty-element)

Not breaking, graphty-element `./session`: a new read, `runs.answered(algorithm, params?, options?)`
(since 3.33.0, not yet published), returns the finished run `runs.start()` with the same arguments
would hand back as it is, computing nothing, or undefined when start would compute (first time,
changed parameters or seed, a scope or data that moved, a failed run). A control that starts a run
can now tell beforehand whether pressing it would change anything; before, only the element knew,
so the graphty app offered "Update <name> layer" that did nothing. Shape: the same arguments as
`start()`, so a caller asks the question it would send. The graphty app keeps the button focusable
but marks it disabled and says the analysis is up to date with these settings; changing a setting
offers it again.

Bug fix, no API: undoing a run and then redoing it brought back its group layers matching 0 nodes.
A layer keeps the live scope it was compiled over; the undo stopped that scope while it held the
run's absent result, and the redo put the same layer back without compiling it again, so it read
the stopped, empty holding forever. A stopped scope that is read again now starts watching again and
resolves as things stand.

## 2026-10-18 -- Decided by the team: a key block counts only what is drawn (graphty-element)

Not breaking, graphty-element `./session`: `LegendBlock.scope` (new since 3.33.0, not yet
published) now counts the elements its layer selects among those drawn, so an element a filter step
hides is not counted, and it is present whenever that count is below the graph's (`count` can be 0
when a filter step hides every element the layer selects). `of` stays the graph's count of that
kind. Before, a key read "Color: name contains GAL, 8 of 331 nodes" with one node drawn. The graphty
app leaves out a block whose `scope.count` is 0, as it already did one that paints nothing. No new
field: what the key counts is the element's fact, and the existing one was wrong while a filter step
was on. `painted` (published since 3.26.0) is unchanged.

Graphty app (no API): the key's room is reserved as the left (or top) view inset whenever the key
is switched on, at the card's full cap, so the element's own framing keeps it clear from the start
and a key that appears or grows never moves the drawing; only the canvas changing size (the table
opening, a window resize) frames the graph again, and only while the reader has not placed the
camera. A key that scrolls says how many entries lie below ("3 more below"). A channel only one of a
run's group layers writes (one group's shape) is headed by that layer, not by the run.

## 2026-10-18 -- Decided by the team: a selection's degree range, a table's number spelling, an empty swatch (graphty-element, compact-mantine)

Additive, graphty-element `./session`:

- `SelectionStatistics.degree?: { min, max }`: the lowest and highest degree among the selected
  nodes (how many edges touch each, the value a rule reads as `graphty.degree`); absent while no
  node is selected. A node's inspector showed its degree and a selection's showed none; working it
  out from the node list would have been the application computing over the graph.

Additive, compact-mantine:

- `DataTableProps.formatNumber?: (value: number) => string`: how a number cell is written, used for
  drawing, searching and content sizing alike. Left out, the table formats as before (up to three
  fraction digits). The graphty app passes its own spelling (four significant digits, whole parts
  exact), so one score reads the same in the inspector, the key and the table; before, PageRank
  read 0.02108 in the inspector and 0.03 in the table.
- `CompactColorInputProps.emptySwatch?: boolean` (default `false`): no color is in force while the
  reader has chosen none, so the field form draws its swatch empty, as the chip form already did
  with `emptyText`. A label's background or letter outline that nothing sets draws none, and its
  swatch had shown the picker's starting white.
- A stat `DataRow`'s name now wraps onto more lines like its value, instead of being cut to an
  ellipsis ("Edges joining these no..."). It changes only how a too-long name is drawn.

Graphty app (no API): an undirected graph's edge ends are named "Node A" and "Node B" in the Edges
table and the edge's inspector, since such an edge has no first end; a directed or mixed graph keeps
From and To.

## 2026-10-18 -- Decided by the team: row headers, a row's description, a tree that shows its selection, a selection's value count (compact-mantine, graphty-element)

Additive, compact-mantine:

- `DataTableColumn.rowHeader?: boolean` (default `false`): that column's cells are
  `role="rowheader"`, so a screen reader reads each cell with its row as well as its column. The
  graphty app sets it on a record table's key columns (Id; From and To) and a group table's Group.
  Making `pinned` imply it instead would have changed what an existing option does.
- `DataRow.description?: string`: what activating the row does, as the row button's
  `aria-description`. The app's node Degree row says "Select this node and its neighbors" (and a
  tooltip says the same to the pointer); the Neighborhood command now speaks the change it makes.
- `Tree.revealSelected?: boolean` (default `false`): when the selection changes, the folders around
  each selected row open and the first one scrolls into view; a folder the reader closes afterwards
  stays closed. The app's style tree sets it, and marks a run group's own layer row while that group
  is open in the inspector.

Within an existing contract, compact-mantine: `Popout.Panel`'s `contained` panel now keeps 8 px
inside its anchor's edges and narrows to fit an anchor narrower than its width (an `InfoCircle`
bubble in a 240 px side panel was exactly as wide as the panel and touched the window's edge). The
option's documented promise, staying over the panel, is unchanged; panels without `contained` are
untouched. A stat `DataRow`'s text reading may now wrap after an @, a slash, an underscore or a dot
that is not a decimal point (`<wbr>`), before breaking inside a word.

Additive, graphty-element `./session`: `SelectionAttributeStatistics.count: number`, how many of
the selected nodes hold a value for the attribute (empty text counts as none). A column whose
values are all different, or that only some selected nodes fill, had no fact a consumer could show
besides its name; the app's selection Summary now reads "6 of 15 have a value" for it.

## 2026-10-18 -- Decided by the team: a key block says how much its layer reaches (graphty-element)

Additive, in `./session`:

- `LegendBlock.scope?: { count, of }`: how many elements of its kind the block's layer selects,
  out of how many the graph holds, present only when that is some and not all (a layer of
  hand-picked nodes, or one narrowed by a condition). A block standing for several copies of one
  binding counts what the copies select together. Without it a key entry for a layer that paints
  3 of 24 nodes read as if it painted the whole graph, and an application could only find out by
  walking the graph itself.
- `LegendSwatch.paintedOverBy?: LayerId`: on a categorical block's row, the layer a reader sees
  instead on every element carrying that value (the one shown on the most of them), so a key
  never offers a color none of its elements show. Absent while one element still shows the row's
  paint. The whole-block case keeps its existing `legend.painted-over` fact.

The graphty app words both ("Picked: 3 of 24 nodes", "covered by Agencies"). No existing field
changes.

The app also asks the element to frame the graph again when an overlay (the key card, the canvas
toolbar) now covers a node, through the existing `nodesInRect`, `cameraPlaced` and `zoomToFit`,
as `viewInsets`' own documentation describes; nothing in the element changed for it. Noted for
the owner, not a change: `getCameraState().position` is the camera's world position, which
includes the shift that centers the view on the free area, so with view insets set it differs
from the `position` of the `resolveCameraPreset` state that put it there (`target` and
`cameraDistance` agree, and a saved state restores exactly). A consumer comparing positions sees
a difference of that shift.

## 2026-10-18 -- Decided by the team: a list that opens with nothing active (compact-mantine)

Additive: compact-mantine `QuickActions` takes an optional `activeOnOpen` (`"first" | "none"`,
default `"first"`, today's behavior). With `"none"` and no `highlight`, the list opens with no
active row, and again whenever its search is emptied, so Enter runs nothing until the reader types
or arrows; typing makes the first action that can run active, never a disabled one; ArrowUp from no
row goes to the last. The graphty app's Vary by list passes `"none"`: a combobox opens with nothing
chosen, and one Enter must not color the graph by the first column. The palette keeps `"first"`,
as Figma's does. Changing the default instead would change what Enter does for every caller, so it
is an option.

## 2026-10-18 -- Decided by the team: a refusal names the column's readable kind; a table row's own name (graphty-element, compact-mantine)

All additive:

- graphty-element `./session`: every refusal `styles.proposeEncoding()` returns (and the
  `GraphtyError` details `styles.encode()` throws with) carries `valueKind` in its params, the
  column's kind as `data.readableValues()` lists it (`"number"`, `"category"`, `"text"`,
  `"yes-no"`). A column of free text (a name, an email: too many values to be groups) is
  `"text"`; without it an application could only word the refusal from `measurement`, which is
  `"categorical"` for such a column, and so told readers a name column "holds groups". The
  existing params are unchanged.
- compact-mantine `DataTable`: an optional `rowLabel(row)` gives a row its accessible name, read
  once when a screen reader moves onto the row instead of every cell's text joined (cells whose
  controls repeat the row's subject read each word several times). Left out, rows are read as
  before.
- compact-mantine `QuickActions`, no API change: only the `highlight` row (the value in force) is
  `aria-selected`; the row the arrows are on is the active one (`aria-activedescendant`) and is no
  longer also "selected". A row's description joins its accessible name when it ends the line
  (`descriptions="end"`) or says why the row cannot run ("degree, 1 to 36"; "community, Holds
  groups, not amounts"); a description drawn below a row that can run stays its description.
  Judged not breaking: these are reader-facing names and states, not values a consumer reads back.

## 2026-10-18 -- Decided by the team: a rule reads a node's degree, and find takes the words for yes and no

All additive, graphty-element `./session`:

- **Rule paths `graphty.degree`, `graphty.inDegree`, `graphty.outDegree`.** A rule, a selector or a
  filter reads the degree every node has with no run: `graphty.degree` always, in and out degree on
  a directed graph only (the snapshot's own `degree()`, `inDegree()`, `outDegree()`). They sit under
  the element's reserved `graphty.` root, where a path the release did not know already read
  nothing, so no column a consumer could name changes meaning. Edges read nothing there.
- **`selection.checkRule` offers them for a bare name.** When no column and no run's field is named
  `degree` (or `indegree`, `in_degree`, `outdegree`, ...), the candidate is the structure path, so
  `` degree > `16` `` before any run suggests `` graphty.degree > `16` ``. A column or a run's field
  of that name still wins and is the only candidate: listing both would leave the rule with no one
  rewrite, and what the reader computed is what the styles show. The shape of `RuleCheck` is
  unchanged.
- **`FindOptions.booleanWords?: { true: string; false: string }`.** `session.find` also matches a
  yes-or-no value by the words the consumer shows for it, whole and ignoring case, as "true" and
  "false" still do. The element ships no English: the graphty app passes "Yes" and "No", the words
  its table and inspector already show. Left out, find behaves as before.

Why: the find box said 'No column named "degree"' while the inspector beside it showed each node's
Degree, and typing "Yes" found nothing while every row said Yes.

## 2026-10-18 -- Decided by the team: an empty-canvas click says whether it was a right-click

Additive, graphty-element `./session`: the `canvas:empty-click` event carries `secondary: boolean`,
true for a secondary-button (right) click, and `session.emptyClick(at)` takes an optional
`at.secondary` (false when left out). The element already treats a right-click on empty canvas as
a request for a menu that clears nothing; a host could not tell it from a left click, so the
graphty app closed the inspector's open layer on a right-click too. A listener that ignores the
new field sees today's events. The `Toolbar` `startAt` option recorded below is now built.

## 2026-10-17 -- Decided by the team: color words, a box that marks its committed value, swatches that stay (compact-mantine)

**Superseded in part by the owner's 2026-10-22 strict-Figma rule** (the default draws what Figma draws; contrast values live in the opt-in AA option): the picker shows exactly the swatches passed in; it no longer keeps ones seen earlier.

All additive, in compact-mantine:

- `colorWord(color)`, a new export: a hex color as a reader says it in English ("dark green",
  "light gray"), "" for text that is not a hex color. It is the graphty app's former `colorName`,
  moved so the picker's swatches and the app say the same word; the app's `colorName` now calls it.
- `CompactMantineLabels.colorWord` and `ColorPickerPanelLabels.colorWord` / `.swatch(word, hex,
start)`: new labels, defaulting to `colorWord` and "blue 6366F1, the starting color". A swatch's
  name and tooltip were its hex string alone ("#6366F1"); a test or a screen-reader script that
  found a swatch by that name must use the new one. Judged not breaking: the name is reader-facing
  text, not a value a consumer reads back.
- `CompactColorInput`'s `valueText` now also reaches the field form: the words join the hex box's
  name after its state ("Node color, set here, red"). It was documented for the chip form only, and
  a field given it did nothing with it, so no existing use changes.
- The hex box carries `data-committed` while its text is its committed value (no typing of its own),
  so an application's Undo key can take back the last change instead of the box's empty native
  undo. The graphty app's key handler reads it.
- Behavior with no API change: a click into a box showing its value selects the whole value; Enter
  leaves the settled value selected; a refusal clears when the value changes and on the focus move
  after the one that made it; while the picker is open a swatch the set drops keeps its place and a
  new one joins the end; the swatch of the color the picker opened on is marked with a dot.

## 2026-10-17 -- For the owner: should a label be drawn over the edges in front of it by default?

A label in graphty-element sorts by depth with the nodes and edges (the owner's fix of 2026-09-23,
"only tooltips draw over the graph; labels sort by depth"), and `labelStyle.onTop` lifts one over
everything. In a 3D drawing an edge nearer the camera therefore crosses a name ("Lucy Grant" struck
through by a tie), and a label added from the app's Text list sets only its words, so it is depth
sorted. A middle default is possible: a label hidden by a NODE in front of it but never by an edge
(edges stop writing depth and are drawn after the nodes). That changes what an existing default
draws, so it is not made. Until then a consumer that wants names whole sets `onTop`, and the app
could set it on the Text list's label as it already does on "Add label line".

Made without asking (a fix, not a contract change): the selection ring and the glow are drawn at the
end of the graph's rendering group, before every label, so a ring never cuts across a name, set on
top or not; and the 3D wheel zooms by a factor per notch, so three turns out undo three turns in.

## 2026-10-17 -- Decided by the team: a tool bar entered at its first item, and a rule check that knows structure

Additive, compact-mantine: **`Toolbar` `startAt`** (optional, `"pressed" | "first"`, default
`"pressed"`). Where Tab first enters the bar. `"pressed"` keeps today's rule (the pressed tool, as in
Figma's tool bar); `"first"` enters at the first item until the reader has focused another. The
graphty app's canvas toolbar passes `"first"`: its pressed item is the Legend toggle, not a chosen
tool, so Tab entered mid-row and Analyze was three arrows away. Why an option and not a new rule: a
tool bar of exclusive tools wants the pressed one, a bar of toggles wants the first; both are
reasonable.

Additive, graphty-element `./session`: `session.selection.checkRule` lists a structural value the
session computes for every node (degree, and in and out degree on a directed graph) as a candidate
for a bare name, beside a run's result fields, so `degree > 16` before any run suggests the
structural path as it does a run's. If no rule path reads node structure yet, the engineer adds
one and records its spelling here. The shape of `RuleCheck` is unchanged. Why: the find box said
'No column named "degree"' while the inspector beside it showed a Degree section.

## 2026-10-17 -- Decided by the team: a list that opens on the value in force, and an Escape a tooltip does not use up (compact-mantine)

- `QuickActionsProps.highlight?: string` (additive): the action highlighted when the list opens,
  before anything is searched, so Enter keeps the value in force and the arrows start from it.
  Left out, the first action that can run is highlighted, as before. A search highlights its first
  result again, as before. The graphty app's value picker passes the value the row already reads,
  so a label read from `name` reopens on `name`, not on "Fixed text".
- Escape in a pop-out on a control whose tooltip is open now closes the pop-out (the
  `PopoutManager`'s Escape). Mantine's tooltip closes on Escape and stops the key on its trigger,
  so the pop-out never saw it, and a reader pressing Escape on a field's Reset got nothing they could
  see (the tooltip opened by focus is held back for a second) and left the pop-out open, so the next
  Enter reset the field. An Escape a field uses (taking back what was typed) still keeps the
  pop-out open. A fix of a defect, not a change of what the component is for: Escape closing the
  innermost thing the reader opened is what the pop-out already promised.

## 2026-10-17 -- Decided by the team: a data table that sizes its columns, names its sort and its empty cells (compact-mantine)

Additive, compact-mantine `DataTable`:

- `columnSizing?: "fixed" | "content"`, default `"fixed"` (today's one field per column). With
  `"content"`, a column without its own `width` is drawn as wide as its header and its widest
  value among the rows the table holds, between 48 and 320 pixels, and only grows as wider rows
  arrive, so it holds still while the reader scrolls. The graphty app's table dock sets it: short
  columns (an id, a number, a yes-or-no) were cut while the last column held the spare room.
- Labels `emptyCell` ("No value") and `sortedBy(descending)` ("sorted ascending" / "sorted
  descending"), both optional so a full label set written before them still type-checks.

What every table now does, with no option: a sorted header's button is named with its sort state
("Degree, sorted descending"), because a screen reader on the focused button did not reach the
cell's `aria-sort`; an empty cell reads "No value"; a cut value or header shows whole in a tooltip
while the pointer rests on it (the browser's `title`, which some pointers never show, is gone); a
Shift-click selects rows and never the page's text (`user-select: none` on the grid); the status
reads "12 of 400 rows, 3 selected" and sits after the rows, so it never runs on from the text above
the table. None changes a prop, a type or a callback. A consumer that relied on selecting a cell's
text with the pointer loses that; the whole value is in the cell's tooltip and is read in full by a
screen reader.

## 2026-10-17 -- Decided by the team: Enter in a number field submits its form (compact-mantine)

compact-mantine's number fields (`StyleNumberInput`, `PanelField`'s number box, through
`useNumberField`) held Enter back so the typed number committed first, which also stopped the
browser from submitting the form around the field: Enter in a run's setting did nothing while
Enter in any other text box ran the form. Now Enter commits, keeps focus as before, and a frame
later submits the field's form through its submit button when the form has one that is enabled.
A field outside a form, or in a form whose submit button is disabled, behaves as before. A fix to
the platform's own behavior, not a new choice: no option to turn it off, since a form that should
not submit on Enter has no submit button.

## 2026-10-17 -- Decided by the team: a pill's tooltip words, reachable refused rows, a still pointer, a caret target (compact-mantine)

**Superseded in part by the owner's 2026-10-22 strict-Figma rule** (the default draws what Figma draws; contrast values live in the opt-in AA option): the pill's tooltip opens below, Figma's default, and the tree caret has no tooltip, as in Figma. The caret's 24px pointer target stays.

Additive, compact-mantine `VariablePill`: `tooltip?: string`, the tooltip's words when they are not
the name and the value (lines break at "\n"); left out, the tooltip is the name then the value as
before. The graphty app passes "Layer" where the pill shows the set-off token, so the tooltip never
prints the token's marks. The pill's tooltip now opens above the field, so the line under it (the
values a bound field reads) stays in view.

Behavior, no API change:

- `QuickActions`: the arrow keys reach a disabled row (its reason is its accessible description,
  so a screen reader hears why), Enter there runs nothing, and the first highlight is still the
  first enabled row. A disabled row's reason goes under its name and wraps whole, also where
  `descriptions="end"` keeps other facts at the end of the line.
- `StyleSelect`: a list that opens under a pointer that has not moved (a grid opens over its own
  field) fills no option for it until the pointer moves, so it opens on the value in force.
- `Tree`: a parent's caret has a 24 x 24 pointer target and a tooltip, "Expand <name>" or
  "Collapse <name>" (the existing `expandSection` / `collapseSection` labels).

## 2026-10-17 -- Decided by the team: a draft says when its source is a graphty document, and a right-click keeps the selection

Additive, graphty-element `./session`: `LoadDraft.graphtyDocument?: "project" | "document"`. Set
when the source handed to `data.prepare` is a graphty document rather than data -- `"project"` for
a saved project, `"document"` for another graphty document -- the same values `project.open`
reports in `opened`. Absent for a data file. Such a source reads as two tables with no rows, and
`report` and `load` still refuse it with `E_EMPTY_LOAD` as before; the new property lets a host
open it with `project.open` instead of telling the reader the file holds no data. The graphty app's
Data page opens a project chosen or dropped there, as Open project or file... does.

Behavior of the drawing, no API change: a right-click (the secondary button) on a node or an edge
that is already selected keeps the whole selection, and a right-click on empty canvas no longer
clears it. A right-click on anything not selected selects it, as a left click does. A right-click is
how a reader asks for a menu about what is selected, so it must not change what it asks about. The
`node-click`, `canvas:element-click` and `canvas:empty-click` events are published as before.

## 2026-10-17 -- Decided by the team: a click on a node or an edge is published (`canvas:element-click`)

graphty-element's session publishes `canvas:element-click` with `{ node }` or `{ edge }` for every
click on a node or an edge in the drawing, also when that element was already the whole selection.
It is the twin of `canvas:empty-click` and exists for the same reason: `selection:changed` says
nothing when the selection does not change, so a host showing something else (a run, a layer) could
not learn that the reader picked the node again. Additive: a new event, nothing existing changes.
The graphty app uses it to bring the clicked node's inspector back.

## 2026-10-17 -- Decided by the team: a data column that holds the node ids says so

Additive, graphty-element `./session` (and `AttributeDescriptor` in `./catalog`):

- **`ReadableValue.holdsNodeIds?: true`** and **`AttributeDescriptor.holdsNodeIds?: true`**:
  present on a node data column whose value on every node spells that node's own id (a CSV's `id`
  column, or the `id` each node was added with, kept as data). Absent otherwise, and absent while
  any node has no value. Why: a condition list showed both "id" (Data) and "Node id" (Structure)
  for one thing; whether a column equals the node ids is a fact about the data, so the element
  says it and a picker decides what to list. The graphty app lists such a column once, as Node id.

## 2026-10-17 -- Decided by the team: a rule's unknown columns, and typed comparisons as rule leaves

Additive, graphty-element `./session`:

- **`session.selection.checkRule(where: Query): RuleCheck`**: the paths a rule reads that nothing
  in the session answers, before it is applied. `RuleCheck` is `{ unknown: UnknownRulePath[];
suggestion?: Query }`; `UnknownRulePath` is `{ path: Path; candidates: Path[] }`, where the
  candidates are the `data.readableValues()` paths whose `plainName` or `technicalName` is the
  path's last name, ignoring case. When each unknown path has exactly one candidate,
  `suggestion` is the rule rewritten to read it, everything else kept as typed (after a Degree
  run, `` degree > `16` `` suggests `` results.degree.value > `16` ``). Throws `E_BAD_SELECTOR` for a
  rule `apply` refuses. Why: a rule over a misspelt or missing column matched nothing and read
  like a correct answer of zero; `SelectionDelta.unresolvedPaths` said so only after applying, and
  with no route to what was meant.
- **`selectorRule(selector, { comparisons?: boolean })`**: with `comparisons: true`, an expression
  also reads as rule leaves through `>=` and `<=` against a number (a `range` leaf), `>` (a
  `threshold` leaf's `above`) and a bare column name (`donations` is `data.donations`). `<` and a
  text order stay without a rule form, since no leaf matches exactly the same elements. Default
  false, so every existing caller reads as before. Why: a find rule (`` donations >= `10000` ``)
  drew as "A rule set elsewhere" and its layer was named with backticks.

compact-mantine (behavior, no API): `SearchInput`'s clear button clears on Escape and returns
focus to the field, as Escape in the field already did.

## 2026-10-17 -- For the owner: should a bare name in a rule read a run's result when no column has it?

`` =degree > `16` `` after a Degree run matches nothing today: a bare name reads only a file column,
and the run's value is `results.<run>.value`. The app now says "No column named "degree". Did you
mean:" and offers the rule rewritten to the run's path, which Enter runs; the box then shows the
long path. Making the bare name itself read the run's field (when no file column has that name and
one run field does) would let the rule work as typed, but it changes what an existing rule or
layer matches after a run, so it is a breaking change. Also for the owner: whether `selectorRule`
should read comparisons by default (a changed return for existing callers), which would let the
`comparisons` option go.

## 2026-10-17 -- Decided by the team: focus never falls to the page (compact-mantine, graphty app)

Additive: **`Popout.Panel` `contained`** (optional boolean, default `false`). With `true` the panel
is kept across the `Popout.Anchor` around it (a side panel), not only across the window, so a
bubble opened near the panel's edge shifts back over the panel instead of running past it.
Without an anchor around it, or left out, the window bounds the panel as before. `InfoCircle`
passes it.

Behavior, not API (every prop, type and name unchanged; each was a keyboard defect):

- `InfoCircle` opens on Enter, Space, a click or hover, no longer on keyboard focus: Tabbing
  through a panel dropped a bubble over the rows below and the button said "expanded" for a
  bubble the reader never asked for. `aria-expanded` is `false` until it opens.
- A `Popout.Panel` that Tab leaves (Tab past its last control, Shift+Tab before its first) closes
  and moves focus on from what opened it: the next control after the trigger, or the trigger.
  Before, it stayed open and focus went to whatever followed the panel's portal (a resize
  separator behind it).
- The number field (`StyleNumberInput`, `PanelField` kind number, `ComboInput` numeric): Escape
  takes back what was typed and keeps focus with the value selected, as the color boxes already
  do; with nothing typed the key goes on to what holds the field. Before, Escape blurred to the
  page.
- A tooltip does not open when a script puts focus back on its trigger (a pop-out or menu closed
  by Escape or a pick, a panel's Run). Only a key that moves focus (Tab, an arrow, Home, End, F6)
  or the pointer opens one, so a returned focus never drops a bubble over the next control.
- `InlineRename` hands focus back to the row it sits in (a tree row, a page) on Enter or Escape,
  whatever opened it; outside a row, to what held focus before, as before.

In the graphty app (not a published API): F6 and Shift+F6 ("Next panel", "Previous panel", in the
shortcuts list under Go to) move between the left panel, the inspector, the drawing, the canvas
toolbar, the table and the Data page, back to the control each last had; the inspector comes right
after the left panel, so a layer reaches its style in one press. F6 works from a text field too.
Tab rounds the page (and an open popover) instead of leaving it, and a control removed while it
held focus hands it to the same control drawn again, else to the control that had focus before it.

## 2026-10-17 -- Decided by the team: a toast its caller speaks, and a table that speaks only a changed count (compact-mantine)

Additive: **`Toast` `alert`** (optional boolean, default `true`). With `false` the message is
not its own `role="alert"`; the caller speaks it through a status line already on the page. Left
out, a toast is an alert as before. The graphty app passes `false` for every notice that is not a
failure and writes the words into its one polite status line, so a notice such as an undo is said
once, politely, not as an alert and a status both; a failure stays an alert.

Behavior, not API: `DataTable`'s hidden status line is on the page empty from the first render and
is written only when the row count or the selection changes after it, never while the table holds
no rows. Before, it arrived holding "4 of 4 rows", which many screen readers never read, and a
table opening (or filling as its rows arrived) said "0 of 0 rows" first. The visible count, the
`labels.rowsShown` wording and every prop are unchanged.

## 2026-10-17 -- Decided by the team: a chip's color in words, Reset off at the default, a space before a tooltip's key (compact-mantine)

Additive: **`CompactColorInput` `valueText`** (optional string). In the chip form, the words a
screen reader hears for the color in force, in place of its state and hex: the chip is named
"<name> color, <valueText>". Without it the chip is named as before ("Group 1 color, not set,
#3388FF"). The graphty app passes a color's name ("teal") for a group's color in a binding's group
list, where the color is the value itself and "not set, #009E73" told the reader nothing.

Behavior, not API: `StyleSelect` and `StyleNumberInput` keep drawing Reset once a value is set,
but it is disabled while the value set equals `defaultValue`, since pressing it would change
nothing a reader can see. Its name, callback and when it is drawn are unchanged. `TipLabel` puts a
real space between a tooltip's name and its key, so its text reads "Table Shift+T" and not
"TableShift+T"; the gap stays about 12px (8px margin after the space).

Not added: `aria-expanded` on a `QuickActions` option. ARIA gives a list option no expanded state
(the lint rule `jsx-a11y/role-supports-aria-props` refuses it), so the app's folded row "5 values"
says its state in its name instead ("5 values, hidden" / "5 values, shown").

## 2026-10-17 -- Decided by the team: a color box says why it refused an entry (compact-mantine)

**Superseded in part by the owner's 2026-10-22 strict-Figma rule** (the default draws what Figma draws; contrast values live in the opt-in AA option): the refusal is no longer drawn (no sentence, no red edge); words that name no color go back to the value, as in Figma, and the reason is only spoken. Escape keeping focus in the box stays (figma-spec section 14).

Additive, in compact-mantine's labels (`CompactMantineLabels`, which a consumer overrides in part):

- **`colorRefused(typed)`**: drawn under `CompactColorInput`, and the hex box's accessible
  description, after Enter on words that name no color: `"dark green" is not a color. Type a color
name or a hex code such as 2E8B57.`
- **`colorRefusedKept(typed, kept)`**: drawn and announced (an alert) when the reader leaves the
  hex box holding such words; the box goes back to `kept`. `notAColor` is kept for consumers
  that override it but the field no longer draws it (it was a hover title only).

Behavior, not API: Escape in every color text box (the paint field's hex and opacity boxes, the
picker's value box, a gradient stop's boxes) takes back what was typed and keeps focus in the box,
with the value selected. This replaces the 2026-10-13 rule that Escape outside a pop-out leaves the
field, which left focus on the page itself. Inside a pop-out with nothing typed, Escape still
closes the pop-out. The picker's value box and a gradient stop's hex box take the same entries as
the paint field's hex box (hex digits or a CSS color name), and the picker's swatches show their
name on hover and mark the one equal to the color in force (`aria-pressed`).

## 2026-10-17 -- Decided by the team: the names and shapes of the zoom, key and palette additions

Additive, in graphty-element, built on the 2026-10-17 decision below:

- **`zoomToPointer`** on the element (attribute `zoom-to-pointer`), beside `autoFrame`, with
  `Graph.getZoomToPointer` / `setZoomToPointer`. Off by default (the wheel zooms toward the view's
  center, as before). On, the 2D view zooms about the point under the pointer exactly; the 3D view
  slides the point the camera turns about so a point on the plane through it stays put. A
  preference of the view: no undo step, not saved in a project. The graphty app turns it on.
- **`CANVAS_KEY_DESCRIPTORS`** in `./catalog` (types `CanvasKeyDescriptor`, `CanvasKeyAction`,
  `CanvasKeyView`): every key the focused canvas answers, what it does and in which view, with a
  `plainName`. The camera's input controllers read it, so the list and the keys cannot drift; the
  app's shortcuts dialog lists it and its own check of keys the element owns reads it instead of a
  copied set. "=" and "+" now zoom the 3D view as they zoom the 2D one (a new key on the canvas,
  nothing taken away), and "+" and "_" are answered with the Shift that types them.
- **The `kelly` palette** (`KELLY_COLORS` in `./schema`, "Nineteen Contrasting Colors"): Kelly's
  colors of maximum contrast without white, black and medium gray. `KNOWN_PALETTE_IDS` gains
  `"kelly"`, as it gains every built-in palette; a consumer that keeps an exhaustive record over
  that tuple (the app's palette words do) adds one entry. The element **never picks it on its
  own**: a binding that names no palette draws exactly what it drew before (the smallest other
  categorical palette that fits, else eight colors and "other"). Letting the element pick it
  for 10 to 19 groups would change what those bindings draw, so it is listed for the owner below.
- **`RunStyle.groupPalettes`**: with `groups: "layers"`, the palettes a partition's group layers
  may be colored from, in order of preference; the first with a color for every group the run
  finds, else the first continued past its end. Absent, the colors are the ones the run's single
  layer would have painted, as before. The app passes the catalog's group palettes in catalog
  order, so eight groups or fewer keep "Eight distinct colors" and ten clusters get ten distinct
  colors.

Not breaking: two optional settings, one catalog table, one palette that is offered and never
chosen by default, and one optional run style field.

## 2026-10-17 -- For the owner: should a binding that names no palette pick Kelly's for 10 to 19 groups?

Today a categorical binding with no palette named and more groups than nine draws eight colors and
folds the rest into the "other" gray (with `overflow: "extend"`, eight colors and then samples of
a ramp, which made near-identical oranges). Kelly's nineteen colors would give every group its own
color up to nineteen. It is not done because it changes what an existing binding draws (a changed
default, so a breaking change); the run path above reaches the same result without it. If yes, it
is one line: drop `"kelly"` from `OFFERED_NOT_CHOSEN` in
`graphty-element/src/session/styles/palettes.ts`, and the column-encoding guide's "fourteen
departments" example changes with it.

## 2026-10-17 -- Decided by the team: wheel zoom toward the pointer, and a palette for more than eight groups

Additive, found by the tier 3 dry run (`tier3/dry-run-r1-1.md`):

- A camera option in graphty-element that zooms the wheel toward the point under the pointer, so
  the node under it stays under it. Its default keeps today's behavior (zoom toward the view's
  center); the graphty app turns it on. Other consumers choose. The engineer names it after the
  camera options beside it.
- When a categorical binding has more groups than its palette has colors, the app picks a palette
  from the element's catalog that covers the count. If the catalog has none above eight, the
  element's catalog gains one (a new entry; existing palettes and the extension of an existing
  palette are unchanged). Reason: extending "Eight distinct colors" to ten clusters drew three
  near-identical oranges.

No change to any existing behavior or default.

## 2026-10-16 -- Decided by the team: a has-value rule and value counts for any readable value

Additive API in graphty-element (`./session`), for the Style panel's condition cards:

- **RuleTree leaf `{ kind: "present"; reads: Path }`.** The elements that carry a value for the
  path (`not` of it: those that have none). Speaks each half whose elements carry the path, as a
  `text` leaf does. RuleTree is an open union, so a new leaf kind is additive. Replaces the app's
  empty-regex stand-in.
- **`session.data.valueCounts(path, options?: { kind?: "node" | "edge" })`** returns `{ values:
readonly { value: Scalar; count: number }[]; missing: number; total: number }`, largest first,
  for any path `data.readableValues()` lists (data columns, run results, an edge's ends).
  `data.histogram` takes data columns only, so a category card on a run's groups had no counted
  list; counting in the app is forbidden.

Built (2026-10-16): `session.data.valueCounts`, with its result type `ValueCounts`, `@since
3.31.0`. Not built yet: the `present` leaf. The cards write "has a value" in the spelling the
element already uses for it (a `text` leaf with an empty `regex`, which `selectorRule` and the
expression reader produce for `has` and `!= null`), so a reader sees no difference; a new leaf
kind has to be taught to the rule parser, the filter compiler, the set signature, the dependency
walk and the offer walk, which is more than this build needs. It stays decided and waits for a
build that needs it.

Also decided by the team, no API change: each style row's node part and edge part keep their own
selector (they already do; the app stops writing one selector to both), and "edges between /
touching the picked nodes" is the edge part's rule holding the node conditions with the `clipped`
or `incident` reading, which `EdgeReading` already defines. Not built: a leaf for "same or
different value at both ends" (no study task needs it).

For the owner, not blocking: OR across fields and Exclude stay out of the cards' simple path for
this study; a rule that needs them opens as "A rule set elsewhere" and is never dropped.

## 2026-10-16 -- The owner's decision: Layer is a temporary value; a data field is copied as is

The owner approved this design for several layers edited together (a folder, recursively, or a
multi-selection):

- **At rest.** Where the layers hold different plain values for a property, its row shows the
  values themselves, one per layer in tree order (top first): a chit per color, the catalog's
  picture per shape, pattern or arrow, else the value. The first 8, then "+N", as a group list
  shows its groups. This replaces "Mixed" and "N layers set X, to N values" in that case; a layer
  that does not set the property is still named in the line under the field. A click opens them.
- **Layer is temporary.** "Layer" is a calculated value that exists only while the binding popover
  is open: one value per selected layer, in tree order, driving the same popover as any value
  (palette, sequence or range, each row's own value, overflow, No value). Opened where the layers
  hold different values, each row starts on its layer's current value, rebuilt from the layers
  every time; nothing is remembered between openings. Closing it writes each layer its own plain
  value (one undo step, the usual write rule and receipt); closed unchanged, it writes nothing.
  Nothing is saved or linked.
- **A data field is a real copy.** Picking a data field (a run's group, id, Degree, ...) on several
  layers gives each layer its own real copy of that binding, exactly as setting it on each layer
  alone would: a shortcut for doing it N times. That includes layers holding more than one group;
  the earlier rule that left those alone, and the per-layer value table written into a copy of a
  run's binding, are gone. So a re-run that renumbers groups may repaint them, as it does a single
  layer's binding.
- **No value** shows in the popover for every source, Layer included, laid out as on a single
  layer. This supersedes the entry below that kept No value off the Layer source.

The team added, to keep "set one value on every layer" once Mixed no longer takes a typed value:
the property's Vary list offers "One value for all" where the layers hold different values; it
gives every layer the top layer's value, and the field then takes a typed or picked one.

## 2026-10-16 -- Decided by the team: one node drawn alone (`element.nodeThumbnail`)

Additive API in graphty-element (the element, `.` entry): `element.nodeThumbnail({ shape, color?,
size? })` returns a PNG data URL of one node of that shape and color drawn exactly as the graph
draws its nodes (mesh, material, lighting), on a transparent background, kept per shape, color,
size, 2D or 3D and lighting; new type `NodeThumbnailOptions`. The graphty app's key uses it for
shape rows. Why: the owner asked for the 3D shape in the key; drawing it in the element means no
application keeps its own copy of a shape the element owns.

## 2026-10-16 -- Decided by the team: one binding popover; No value only for a value of the data

The binding popover is one component for every source (a value of the data on one layer or held
for several, or the selected layers). The one section the Layer source does not draw is No value:
every element of a selected layer has its layer, so the choice would do nothing. A data field
picked on several layers starts from the element's own proposal, exactly as on one layer.

## 2026-10-16 -- Decided by the team: a menu opened by a click starts on its first enabled row (compact-mantine)

**Superseded in part by the owner's 2026-10-22 strict-Figma rule** (the default draws what Figma draws; contrast values live in the opt-in AA option): a menu opened by the pointer focuses the menu itself with no row highlighted, as Figma does; ArrowDown reaches the first enabled row. A key-opened menu still starts on its first enabled row.

**What.** Every themed menu now opens with focus on its first enabled row, whether a key or the
pointer opened it; a disabled first row is still skipped (`skipDisabledFirstRow` in
`compact-mantine/src/components/overlays/overlayBehavior.ts`). This reverses the studio's
2026-10-09 rule "pointer-opened menus focus the menu itself".

**Why.** The owner hit it on the Style tab: on several layers, clicking "+" and pressing Enter did
nothing until ArrowDown, because a clicked menu held focus on itself. A reader who clicks a menu
and then reaches for the keyboard expects Enter to take the first thing on offer, as a key-opened
menu already did; one rule for both is simpler to learn. The cost the 2026-10-09 rule avoided --
a clicked menu showing its first row highlighted, as if chosen -- is accepted: the highlight is
focus, and Enter acting on it is what the owner asked for.

## 2026-10-16 -- Decided by the team: several layers as the groups of one binding (`styles.layerGroups`)

Additive API in graphty-element (`./session`): `styles.layerGroups(ids, binding, { channel })`
returns one `LayerGroup` per layer, top of the stack first. `LayerGroup` extends `ValueGroup`
(value = the layer id, name = its row's name, count = elements matched, hidden = the layer or its
row hidden, `entries` = the binding's `map` entry keyed by layer id) with `row` (the style row
holding it) and `paints` (what `styles.sequence` paints it, and the overflow's second cue). It
writes nothing. It lets a group editor built for a data value's groups list layers the same way:
the graphty app's Vary by Layer now draws Louvain's group rows for a folder's layers.

## 2026-10-13 -- For the owner: the default label font names no fallback

**What.** Not built; a question. graphty-element's default label font is the bare string
`"Verdana"` (`RichTextStyle.font` in `src/config/RichTextStyle.ts` and the renderer's own default in
`src/meshes/RichTextLabel.ts`), while its named label looks use `"Verdana, sans-serif"`. On a
machine without Verdana (most Linux desktops) the browser falls back to its default face, usually a
serif, so labels draw in a serif face while every editor, `LABEL_STYLE_DEFAULTS` included, says
Verdana. Adding a generic fallback to the default (`"Verdana, sans-serif"`) is a one-line fix, but
it changes what every label with no font set draws on those machines, which is a default change.

**Built instead.** Nothing in graphty-element. The graphty app picks a font with a generic fallback
for the labels it adds, as its own choice, so its editors name the face that is drawn.

**Why.** An editor that names one face while the canvas draws another misstates the drawing.

## 2026-10-13 -- Decided by the team: one Clear glyph, one-line value lists, and a ramp that fits 240 px (compact-mantine)

Additive API in compact-mantine:

- `QuickActions` `descriptions?: "below" | "end"` (default `"below"`, as before). `"end"` draws each
  action's description dimmed at the end of the name's line, so every row stays one line tall
  (the value picker's "1 to 36" beside "Connections"). The description stays the option's
  accessible description.
- `QuickActions` `emptyText?: string`: what an empty list says before any search, such as why it
  is empty and where to go instead. A search with no match still says "No results".

Changes, not API shape:

- The reset button of `StyleSelect`, `StyleNumberInput` and `CompactColorInput` draws a minus
  instead of an "x": Clear is one glyph on every control, as Figma's "-" on a set row. Its name
  and behavior are unchanged.
- `RampEditor`'s "Values from" and "Values to" fields no longer have a minimum width of their own
  (a text input's is about 20 characters), so the editor fits a 240 px pop-out instead of widening
  it to 376 px.

## 2026-10-13 -- Decided by the team: what a label draws when nothing sets a field, and a gradient with no colors

Additive API in graphty-element (`@graphty/graphty-element/catalog`):

- `LABEL_STYLE_DEFAULTS: Readonly<LabelStyle>`: the value a label draws for each style field no
  layer and no look sets (font Verdana, size 48, margins 5, line height 1.2, position top, size
  measured in the scene, and so on), in the label vocabulary. An editor shows these where a field
  is not set, so a reader sees the value that is drawn rather than the word "Default". The fields
  whose absence draws nothing (background, outline, badge, icon, progress) and `enabled` are left
  out.

Fixes, not API shape:

- A label whose gradient is switched on without naming colors threw in the render loop (the
  painted style passed the colors key with no value, which replaced the renderer's default). It
  now runs through the default dark gradient, which `LABEL_STYLE_DEFAULTS.gradientColors` names.
- `labelLookChanges` no longer counts `sizeUnit` as a change from a look: what a label's size is
  measured in sits beside the look, as its position does. `sizeUnit` has not been released yet,
  so no published behavior changes.

## 2026-10-13 -- Decided by the team: a tree with one Tab stop, a right-click that selects, pop-outs that open upward, menu shortcuts kept out of names (compact-mantine)

Additive API in compact-mantine:

- `Popout.Panel` `boundaryTop?: number` (default 0): the highest the panel's top may sit, in
  viewport pixels. An app passes its header's bottom so no pop-out covers the header; the panel is
  then never taller than the window below that line.
- `MenuShortcut`: a menu row's shortcut text, drawn at the row's right and hidden from assistive
  technology. The row carries `aria-keyshortcuts` with the same keys, so its name is its label
  alone ("Rename", not "Rename F2").

Changed behavior, asked for by the tier 3 review (not API shape):

- A tree row's own toggles (eye, lock) are no longer Tab stops: the tree is one Tab stop however
  many rows it holds. A pointer still reaches them. The graphty app adds Figma's row commands for
  the keyboard: Show/Hide (Shift+Ctrl/Cmd+H) and Lock/Unlock (Shift+Ctrl/Cmd+L), on the row's keys
  and in its menu.
- A right-click on a tree row that is not selected selects it alone before its menu opens; one
  inside a several-row selection keeps the selection.
- A pop-out beside its trigger that would pass the window's bottom opens upward, its bottom on the
  trigger's bottom, when the room above holds it; otherwise it moves up only as far as it must.
- A ramp's start handle stops one step below the end handle and the end handle one step above the
  start, and each says so (`aria-valuemin` / `aria-valuemax`): Home and End move a handle to the
  furthest it can go instead of being refused when the data's end lies past the other handle.

## 2026-10-13 -- Decided by the team: one look for every style field, a chip-only color, and Escape in a pop-out (compact-mantine)

**Superseded in part by the owner's 2026-10-22 strict-Figma rule** (the default draws what Figma draws; contrast values live in the opt-in AA option): the paint field is Figma's gray filled field again, and no field draws gray italic. `ComboInput` `variant="outlined"` stays as an option; the graphty app's Style tab rows use the default filled field.

Additive API in compact-mantine:

- `CompactColorInput` `variant?: "field" | "chip"` (default `"field"`). `"chip"` draws the swatch
  alone, 24 px square, for a row that names its color beside it (an effect, a category). Its name
  says the state and the color: "Group 3 color, set here, #E69F00", "Group 3 color, not set,
  #3388FF", "Group 3 color, Mixed" (a dash, no color).
- `ComboInput` `variant?: "filled" | "outlined"` (default `"filled"`, Figma's look). An empty
  ComboInput with a placeholder now takes the not-set look (gray italic).
- `Labels.fieldSet` ("set here"), spoken after a set color's name, as the app's number and select
  names already say it.

Changed looks and behavior, asked for by the tier 3 review (not API shape):

- Style fields share the select's outlined surface: `StyleNumberInput` and the paint field of
  `CompactColorInput` are no longer gray-filled (the gradient editor's stop rows, inside the
  picker, keep Figma's fill). Hover changes nothing on them, as on the select.
- An empty number field (not set with words, or Mixed) is a text box, not a spinbutton: Chromium
  reads a spinbutton with no value as 0. It also drops `aria-valuetext`, which a text box may not
  carry. It becomes a spinbutton again once it holds a number.
- A Mixed color draws the word and no swatch; it is replaced by typing a color (Figma's mixed fill).
- The glyph grid marks the value in force with the list's check (top corner), not a ring or a
  dashed outline; a list with a placeholder checks the value beneath the same way.
- A color field's label is the 9 px caption every other field label uses.
- Escape in a text field inside a pop-out closes the innermost layer: an edit in progress is taken
  back and focus stays; with nothing typed the pop-out closes and focus goes back to its trigger.
  Outside a pop-out it still reverts and leaves the field.
- Under an `aria-disabled` ancestor the color field's reset and "%" handle dim with its text.

## 2026-10-13 -- Decided by the team: readable values count numbers, mark colors, read an edge's ends, and find reads them all

**What.** graphty-element, additive:

- `ReadableValue.valueCount` is now given for a number too, while the column has 256 distinct
  values or fewer. College football's conference column (the codes 0 to 11) has 12.
- `ReadableValue.valuesAreColors` and `AttributeDescriptor.valuesAreColors` (`true` or absent):
  every value is text the element reads as a color (hex, `rgb(...)`, a CSS color name).
- `ReadableValue.end` (`"source"` or `"target"`): `data.readableValues()` now also lists every node
  value again on the edges, read at each end, under the paths `graphty.source.<node path>` and
  `graphty.target.<node path>`. The entry keeps the node value's `plainName` and `technicalName`,
  and its kind, range and count are the nodes'. Rules, filters, layer selectors and bindings read
  these paths; a rule leaf accepts them (`graphty.source.` or `graphty.target.` in front of a
  `data.` or `results.` path; any other `graphty.` path stays reserved).
- `session.find` reads every readable value, run results included: after Degree has run, typing
  `10` lists Connections = 10 with its "10 or more" offer.
- `FindResult.named` (new type `FindNamedRow`): values whose catalog name the text matched
  ("degree" or "connections" lists Connections), each number carrying `atLeast` at the value the
  top quarter of the elements reach, with its count and selection target.
- Find offers a set of elements once: two value rows, or two "contains" rows, holding the same
  elements are one offer. Between equals, a column with a name is kept over the node id. On Les
  Miserables "node id contains Mme" and "name contains Mme" are now one offer.

**Why.** "One color per value" needs the count of a number column of codes, and "paint as it is"
needs to know a column holds colors; both are facts about the data, so the element states them
and the app only offers. "Edges whose source is Bob" and "width by the source's Connections" need
a path the rule and the binding can read; reserving it under the element's own `graphty.` root
keeps every existing column name meaning what it meant. A find that ignores run results cannot
turn "degree" into a rule, and two offers that select the same elements are one choice shown twice.

**For the app, not done here.** The app's value and rule pickers skip `end` entries until they word
them ("the source's name"); `FindResult.named` is not shown yet.

## 2026-10-12 -- Decided by the team: what lies beneath a row, read over the row's own elements

**What.** graphty-element, additive: `styles.agreement(scope, channel, { below, over })`. The new
`over` names a row of the style tree; the answer is then read only over the elements of `scope`
that row matches. `{ below: row, over: row }` is what lies beneath the row on its own elements.
When the row matches no element (Selected with nothing selected, Hovered), the answer is read over
the row's kinds through only the layers whose selector matches every element (Everything and the
element's own base layers): what an element would get on entering the row. The answer says which
reading it is in a new `StyleAgreement.readOver`: `"row"` or `"everyElement"` (absent when `over`
was not given). The option bag is now the exported type `AgreementOptions`. `styles.counts` was
already right: a row that matches nothing has an empty `paintedBy` and never appears in another's.
A value that comes from the element's own base layer is told by `styles.get(layerId).source.by
=== "element"`, so no field was added for it.

**Why.** Read over the whole graph, the layers beneath "New layer for Group 3" (eleven nodes, all
painted green by the community run) read as a mix of every community's color, so the empty field
showed "Mixed" where the reader sees one green. Reading over the row's own elements gives the
answer the canvas shows; the empty-row reading gives Selected and Hovered a placeholder instead of
nothing.

## 2026-10-12 -- Decided by the team: what reads each value (`ReadableValue.usedBy`), and a value picker inside a pop-out

**What.** Two additive changes.

- graphty-element: `ReadableValue.usedBy?: readonly AttributeUse[]`, on the entries of
  `session.data.readableValues()`. It lists each style layer that selects or paints by the value
  now, in stack order (and, for a data column, the runs that weighed their edges by it, as
  `AttributeDescriptor.usedBy` already says). Absent when nothing reads it. Before this, only a
  data column said what read it; a run's field (Degree's connections) never did.
- compact-mantine: `QuickActions` takes `role?: "dialog" | "group"` (default `"dialog"`, as
  before). A palette placed inside a pop-out is a group named by the pop-out's title, so the page
  no longer holds a dialog inside a dialog with two different names.

**Why.** The vary picker lists "In use" first. With the facts split between `data.attributes()`
and nothing, the app would have had to work out from the layer stack which run fields a layer
reads, a second answer to a question the element already answers for columns.

## 2026-10-12 -- Decided by the team: a bound value's own accessible name, and its whole name on hover

**What.** compact-mantine's `VariablePill`, additive.

- An optional `aria-label` names the pill (or the bound fill row) when the field around it names
  nothing, so the Style tab's bound values say their property first: "Node size: Degree rank, 1
  to 3", "Node color: Degree, Purple to yellow". Left out, the name is as before.
- The bound fill row now has a tooltip with the variable's whole name, since a long name
  ("Edge betweenness") is cut to fit a narrow row.

**Also decided, in the graphty app (no public API).** Paired property rows (Shape and Size, Color
and Width, Head and Tail) stand side by side only when both fields fit whole, with their vary and
Clear columns; in the default 240 px inspector they stack one field per line. Reason: four
reserved 24 px columns and two whole controls do not fit in 240 px, and the owner asked that
values never be cut.

_Superseded on 2026-10-13:_ pairs no longer share a row. Every property is one line of about
28 px: its short name in a fixed left column, then the field, the vary column and the Clear
column, so every field of the Style tab starts at one left edge (Figma's property rows). The
caption over each field is gone, which is what made the stacked pairs long. A color line holds
its swatch and hex only: its opacity moved behind the line's settings button and shows as a line
of its own once set, because a swatch, a whole hex and a percent box need 121 px and a line beside
a name has 96 px once the inspector shows a scrollbar (the owner asked that values never be cut).

**Also in that change (no public API).** A bound value's Detach sits in its vary column, where the
vary glyph sat before it was bound (Figma's variable field), so the pill keeps one width when its
popover opens; the pill shows its colors at rest as a 36 px strip (a ramp, or up to six group
colors), through `VariablePill`'s new optional `swatchWidth` (compact-mantine, additive; 14, a
square chit, when left out).

## 2026-10-12 -- Decided by the team: select what a layer paints, and who paints over it

**What.** graphty-element's session, additive.

- A selection target `{ layer: LayerId }`: `selection.apply({ layer })` selects exactly the
  elements the layer's rule matches, shown or not (the elements `styles.counts(id).matched`
  counts). A layer paints one kind, so it names nodes or edges; a two-kind row is two applies.
  An unknown id is refused with `E_UNKNOWN_LAYER`. This is the app's "Select what it paints"
  (Figma's Select matching layers), in the row menu and the panel header.
- `StyleCounts.paintedBy: readonly LayerId[]`: for the channels a layer writes, the other layers
  the picture shows instead on its matched elements, the most elements first. The tree's
  "Painted over" mark names them ("Painted over by Degree").

**Not breaking.** A new member of an open union and a new field on a returned type.

**Owed, not built.** `styles.duplicateRow(id)`: the app's Duplicate rebuilds a layer row from its
parts' specs inside one transaction (`graphty/src/workspace/graph-place/actions.ts`, marked
temporary). An element verb would also duplicate folders and keep the copy's place in one command;
it was not built here because the style command definitions were being edited by another change
at the same time.

**App choice, not an element default.** The app turns on `startingRows` and `runPlacement: "top"`
for every project it opens (`graphty/src/workspace/Workspace.tsx`); the element's defaults stay
off and "beneath". The project file saves neither setting, so a reopened file gets the app's
choice again.

## 2026-10-12 -- For the owner: the breaking pieces of unified styles in the real app

**What.** Not built; questions. Building unified style layers into the graphty app (design:
`design/ui/studio/tier3/design.md`, section 8) needs these changes, each of which alters what an
existing graphty-element API does or a default, or reverses one of the owner's own rules. The build
uses an additive alternative for each, so nothing waits on the answers.

1. One layer that paints nodes and edges together widens the `target` a consumer reads back. Until
   then a both-kinds layer is a row of the new style tree that owns a node part and an edge part.
2. Turning the new `startingRows` option (Everything, Selected and Hovered as rows; the selection
   look drawn by the Selected row) and the run placement `top` on by default, and deprecating
   `selectionStyle`. They belong in one major with the model's other breaking items
   (`design/ui/unified-style-layers.md`, section 10).
3. The default selection halo measures 1.13:1 against the default background (3:1 needed), and
   with white text only one of the nine label badges passes 4.5:1. Recoloring either changes
   existing output.
4. Label animations and edge motion ignore the reader's reduced-motion setting; following it by
   default changes a default.
5. Only if the route layer still scrolls at 900 x 700 after the panel is shortened: collapsible
   Nodes and Edges groups, which reverses the "never accordions" rule.

**Why.** The owner settled the model; these are the release and default questions it leaves.

## 2026-10-12 -- Decided by the team: labels sized in screen pixels, a number format for label text, and the Selected ring

**What.** Two additive graphty-element changes and one change to unreleased starting rows.

- `LabelStyle.sizeUnit?: "world" | "screen"` (type `LabelSizeUnit`; in the renderer's schema,
  `RichTextStyle.fontSizeUnit`). `"world"`, the default, is today's size: a length in the scene
  that follows the zoom. `"screen"` makes the size (`sizePx`, and the bound size channels such as
  `node.labelSize`) CSS pixels: letters stay that tall at every zoom, in 3D and 2D. Each frame the
  label's plane is scaled from the camera before the overlap pass runs, so the overlap pass, the
  label's place beside its node or edge, and a pulse all follow the size drawn. It works on node
  labels, tooltips, edge labels and arrow captions alike, since all four are the same label.
- `format?: BindingNumberFormat` on a binding: the `Intl.NumberFormat` options
  `maximumFractionDigits` and `maximumSignificantDigits`, and a `locale`. On a channel that
  carries text, a number is written through it: `maximumSignificantDigits: 3` writes Bridging's
  129.64334674418718 as "130". Without it the output is unchanged. A format `Intl.NumberFormat`
  refuses is refused at the layer with `E_BAD_LAYER`.
- The Selected starting row's ring is now a mid-gray halo (`#868686`) with a near-black glow
  (`#111111`), was a near-black halo with a white glow. The halo stands 3.3:1 or better off
  whitesmoke, the dark backgrounds #101010 and #202020, and a black node (a route's), where the
  old ring was black on black; the glow stands 4:1 or better off every default palette color and
  the default node color. The starting rows are unreleased.

**Not breaking.** New optional fields whose absence keeps today's behavior; a new exported type.

**For the app.** The app chooses a screen size for the labels it adds and a format for number
labels; neither is an element default.

## 2026-10-12 -- For the owner: a new label is too small to read at the default framing

**Update (same day).** The additive route below is now built: `LabelStyle.sizeUnit: "screen"`
(see "labels sized in screen pixels" above). What stays the owner's is the breaking route: making
screen pixels, or a larger number, the DEFAULT label size, which changes what every existing label
draws.

**What.** Not built; a question. A label's size is a length in the scene, not on screen: a label
of size 48 (graphty-element's default) is one world unit tall per line, margins included, the
diameter of a size-1 sphere node, so it shrinks and grows with the zoom. On Les Miserables framed
whole in a 1000 x 700 canvas one world unit is about 7.6 px, so a default label's line is about 8
px tall and its letters about 5 px; the graphty app's 72 draws about 11 px and 8 px. The option is
named `sizePx`, which reads as screen pixels and is not. Either fix changes existing output:

1. A larger default label size (about 130 for 14 px letters at that framing, but any number is
   right for only one framing).
2. A label size in screen pixels: letters stay the same height at every zoom. This is the fix that
   makes "14" mean 14 px, but it changes what every existing label draws. As an additive option
   (a label style field such as "size on screen") it is new renderer work -- the plane is rescaled
   each frame from the camera, and its placement beside the node, the declutter pass and the
   pulse animation follow. Built since as `sizeUnit: "screen"`; the default is unchanged.

**Built instead (additive).** `ChannelDescriptor.perWorldUnit` states the unit: 48 on every label,
tooltip and arrow caption size channel. A consumer can show the size as what it draws (1.5 is a
line one and a half node diameters tall) and pick a size for its framing.

**Why.** A reader who types 72 and sees letters 8 px tall was told a number that does not match the
picture.

## 2026-10-12 -- Decided by the team: moving layer rows into and out of folders from the keyboard and a row menu

**What.** compact-mantine's `Tree`, additive.

- Alt+ArrowDown on a row whose next sibling is a folder (an item with a `children` array) moves it
  into that folder as its first child; Alt+ArrowUp onto a folder above makes it the last child.
  Alt+ArrowLeft moves a row out of its folder to just after it. The folder opens and focus stays
  on the row.
- `rowMenu` gets a second argument, `TreeRowActions`, whose `moveTo(parentId, index = 0)` lets a
  row menu offer "Move to folder". It is checked like a drop (`movable`, `canDrop`, never into its
  own subtree) and returns false when refused.
- Every move (keys, a drag, `moveTo`) is said in a polite live region beside the tree, worded by
  the new `labels.treeMoved(name, parent, position, count)` ("Alpha moved into Folder, 1 of 3").
- Row action buttons (eye, lock, pin) no longer overlap by 4 px: each is a whole 24 x 24 target
  (WCAG 2.5.8), so a row with three toggles is 8 px wider at its trailing end.

**Not breaking.** New optional argument, new label, new keys. One behavior shifts: Alt+ArrowDown on
a row just above a folder used to step past the folder and now goes into it. A consumer who wants
the old step refuses moves into folders with `canDrop`; the tree then steps past the folder as
before.

, a node size of 0 refused, a label size's unit, and a visible Selected ring

**What.** Additive changes in graphty-element.

- `LegendBlock.painted`: how many elements the block's layer currently paints on its channel, as
  `styles.counts(id).painted` counts them. 0 for the Selected row with nothing selected, so a
  legend can leave such a block out. Each legend read counts each listed layer once.
- `ChannelDescriptor.exclusiveMin`: `min` itself is refused. Set on `node.size` (min 0): a size of 0
  draws no node, so a control can refuse it. `min` stays 0 (raising it would change the clamp of
  every size binding that reaches 0).
- `ChannelDescriptor.perWorldUnit` (see the owner item above).
- The Selected starting row (unreleased, `startingRows`) now draws a two-tone ring: a solid
  near-black halo (`#111111`, 17:1 on the default background) with a white glow inside it, and a
  near-black edge band, at the `selectionStyle` sizes. One color cannot stand 3:1 off both the
  background and all eight default palette colors (black and yellow among them); the dark halo
  covers the background and seven colors, the white glow covers black. The `selectionStyle`
  default (pale gold halo) is untouched (owner item 3 above).
- Fixed: a halo a layer paints was drawn with both faces of its sphere, so it tinted the node it
  ringed and a solid one hid it; it now draws only the back faces, as the selection halo always
  did.
- The force layout's catalog description no longer carries the code fragment "with `dim: 2`".

**Checked, no change.** A size bound to a degree run's rank: the legend block names the field
`results.<run>.rank` with `result: { algorithm: "degree", field: "rank" }`, so the element reports
the right source. The graphty app's "Size: Degree" comes from its own key, which titles a block by
the row's name (`sectionTitle` in `graphty/src/workspace/canvas/legendWords.ts`), not by the
block's field: the app's to fix.

**Not breaking.** New optional fields; the starting rows are unreleased.

## 2026-10-12 -- Decided by the team: a run's layers behave like a reader's (one route row, readable rules, kind change in place)

**What.** Three additive changes in graphty-element, so where a layer came from never changes what
it offers.

- A run that paints nodes and edges (the shortest route) lands as one row of the style tree: its
  node part and edge part share `row` and one name ("Shortest route"; the two layers were named
  "Shortest route (nodes)" and "Shortest route (edges)"). `styles.highlight()` still returns the
  node layer first, `styles.list()` still holds one layer per kind with its own `target`, and each
  part still paints only the route's own elements.
- `selectorRule(selector)` (from `@graphty/graphty-element/session`) and the type `RuleSelector`:
  any layer's selector as an editable rule that matches the same elements. A run's `has` selector
  reads as "has a value" (a `text` leaf with an empty `regex`), a `top` selector as a `threshold`
  leaf, and the route's expression (onPath equals true) as the leaf "onPath is true". Selectors
  with no rule form (every element, named ids, a set, the selection) come back `undefined`, and the
  editor keeps drawing those its own way.
- `RowWrite.target`: `styles.writeRow(id, { target })` adds a missing part (same name, rule and
  eye, writing nothing until its first value) or drops one, in the same undo step; the row keeps
  its id and its place. A part of a row may now be empty, as a starting row may.

**Why.** The audit of the style panel's first build found the route drawn as two rows, the Which
elements editor unable to read any run layer's rule, and Nodes, Edges and Both disabled on every
layer the reader already had. Each was the element's to fix: the app would otherwise pair layers,
parse expressions, or delete and re-create a layer to change its kind.

**Checked, no change.** With `runPlacement: "top"`, Degree, then Edge betweenness, then the route
stack in run order, above a reader's layer. The route sitting below Bridge edges in the app comes
from the default placement, `"beneath"`, which the app does not change yet; setting `"top"` is the
app's to do.

**Not breaking.** Only new exports and an optional field. The route's layer names are default
words, not a contract; a consumer that wants its own name passes `name`.

## 2026-10-12 -- Decided by the team: what a layer reads, and a histogram's minimum, median and maximum

**What.** Two additive readings in graphty-element. `StyleCounts.reads`: every value a layer reads,
its selector's and its bindings', as paths (`data.age`, `results.louvain.group`), read with the
counts it already returns. And `Histogram.min`, `median` and `max` (optional): the lowest, middle
(the lower median, a value the data holds) and highest measured value, on every histogram the
element returns (`RunResult.histogram`, `data.histogram`, the degree histogram); absent when nothing
was measured.

**Why.** A layer row's Values tab lists the values the row reads and draws each one's histogram with
its minimum, median and maximum. The element already worked out both (the compiled layer's reads,
the column statistics behind every histogram) and dropped them; the app would otherwise parse
selectors and bindings, and compute a median over a column.

**Alternatives.** A separate `styles.reads(id)` (one more call for a fact the Values tab reads with
the counts anyway); `AttributeDescriptor.median` (data columns only, and it would cost every
`attributes()` call a sort).

## 2026-10-12 -- Decided by the team: one list of every value a rule or a binding can read (`data.readableValues`)

**What.** Two additive pieces in graphty-element.

- `session.data.readableValues()` returns one entry per readable value: the node id (path `id`,
  plain name "Node id", read by a rule's text leaf only), every data column (`data.<name>`) and
  every field a finished run published per node or edge (`results.<run>.<field>`). Each entry has
  its path, catalog name, technical name, which half carries it, where it comes from (`element`,
  `data`, `run`, with the run id), its kind (`number`, `category`, `text`, `yes-no`), its range
  (numbers) or value count (categories, yes-no), how complete it is, and `fits`: the kinds of
  channel it can drive (`color`, `number`, `enum`, `text`, `boolean`). New types `ReadableValue`,
  `ReadableValueKind`, `ReadableChannelKind`, exported from `./catalog` and `./session`.
- `FieldDescriptor.directedOnly`: a field published only for a directed graph. Degree's incoming
  and outgoing connections carry it, so the list leaves them out on an undirected graph, where
  both equal the total.

**How it decides.** Run fields are described by the same walk as data columns, with the run's
declared measurement, so a partition's group is a category (Louvain's group already declares
`categorical`; the list never offers a histogram of group ids). `fits` is the same decision
`styles.proposeEncoding({ column })` makes: the default-route logic was split out of
`proposeColumnBinding` into one function both read, so the two can never disagree. Any number in
the list ranks a "top N" rule (`{ kind: "threshold", path, top }`), run results included; that
already worked and is now tested from the list.

**Left as it is.** K-core's core depth stays a number: it is an ordered amount ("at least k
neighbors inside the core"), and redeclaring it categorical would change the default color and
size every existing consumer gets, a breaking change. "Top 10 by" keeps its tie policy: on Les
Miserables top 10 by degree paints 9 nodes, because the two nodes with 12 connections share 10th
place and a tie group is taken whole or not at all; a panel shows the run's `top(field, n).leftOut`
to say why.

**Why.** The rule editor and the vary-by picker each built their own list from `data.attributes()`
and `results.roots`, and the iteration review asked for one list both read.

**Not breaking.** One new method, three new types and one optional field.

## 2026-10-12 -- Decided by the team: what lies beneath a style row, a binding preview, and a binding's own colors

**What.** Three additive pieces in graphty-element.

- `styles.agreement(scope, channel, { below: rowId })`: a new optional argument. With it, the
  answer is read from only the layers beneath that row of the style tree: the shared value and the
  layer that paints it, or a breakdown by layer when they differ. Beneath the bottom row it is the
  element's own floor. Without it, `agreement` answers as before.
- `styles.preview(binding, { channel, bins? })`: for a binding not yet written, the histogram in
  the scale's own space (so a log scale bins by decade) with each bar's count and what it paints,
  the step bounds of a stepped scale, the domain, and the elements below or above a clamp, without
  a value, or with a value the scale has no place for. New types `BindingPreview` and
  `BindingPreviewBin`. It runs the preparation a repaint runs, so the written layer paints what
  the preview showed. Nothing is written.
- `Binding.stops`: a binding may carry its own colors in place of a named palette, saved with the
  layer.

**Why.** An empty field in the style panel shows what the layers beneath give (the Clear tooltip
names the value and its layer), and the ramp and category popovers draw the binding's histogram
and steps before the reader commits. Both are computations over the graph, so they are the
element's; the app would otherwise rebuild the stack's resolution and the scales.

**Not breaking.** A new optional argument whose absence keeps today's answer, a new method, two new
types and a new optional field.

**Documented** in graphty-element's guide, with the rest of the style panel's element additions:
`style-tree.md`, `style-rows-both-kinds.md`, `starting-rows.md`, `style-rules.md`,
`binding-preview.md`, `value-entries.md` and `colors-across-rows.md`. Every code block on those
pages is compiled against the published declaration files, and the first one on each page is run,
by `graphty-element/test/documentation/unified-styles-guides.test.ts`.

## 2026-10-12 -- Decided by the team: each step's count in a binding preview, and rules over a run's value

**What.** Two changes in graphty-element. `BindingPreview.stepCounts` (optional reading, additive):
for a stepped scale, how many elements each step paints, lowest step first, a value on a cut counted
in the step above it, as the scale itself places it; empty for a scale that is not stepped. And a
fix: a `range` or `categories` rule leaf over a run's value (`results.louvain.group`) now reads that
value the way a style binding does. Before, it read only the data records, so a hand layer whose
rule said "community is 3" matched nothing while the binding beside it painted five nodes.

**Why.** The binding popover lists a stepped ramp's steps with their counts and offers "New layer for
<value>" and "New layer for <step>". Counting elements is the element's job, and a layer made from a
community must hold that community.

**Alternatives.** Summing the preview's bars in the app (the bars are cut by the data's units, not
at the steps, so a quantile step would be miscounted, and the app would be computing over the graph).

**Known limit.** "New layer for <step>" writes a `range` rule, which includes both of its ends, while
the scale puts a value on a cut in the step above; a value exactly on a cut is in both layers. An
exclusive upper end on a range leaf would close it (additive).

## 2026-10-12 -- Decided by the team: the Which elements editor, and a layer's kind waits on the element

**What.** A layer's Which elements is now its rule as a sentence with the element's count ("50 of
100 nodes"); a click opens an editor in place: the kind, the find field, a Rule select (Every one,
Where a value, Top N by, Named, Members of a set, Selected, Hovered, Expression), condition rows
shared with Data > Filters, and for a layer on nodes and edges with a node rule, "between them" or
"touching them" (the element's `edges: "incident"`). Done keeps the rule; Escape restores it. No
graphty-element API changed.

**Not built.** Changing an existing layer's kind. The element refuses to retarget a row part and a
part that sets nothing, so the editor enables only the layer's own kind. The fix is additive:
`RowWrite.target`, adding or dropping a part, with an empty part allowed until its first write.

## 2026-10-12 -- Decided by the team: a color that follows another (`ChannelDescriptor.follows`), and words in an empty color field

**What.** Two optional additions. In graphty-element, `ChannelDescriptor.follows`: the channel whose
value this one takes while no layer sets it. The arrowhead and arrow tail colors name
`edge.color`, because the element draws an arrow in its edge's color until a layer gives it one.
In compact-mantine, `CompactColorInput` gains `emptyText`: while nothing is chosen, the hex box is
empty with these words as its placeholder (as `StyleNumberInput`'s `emptyText`), and typing the
default color then chooses it.

**Why.** The Style tab's arrow end color, left empty, must read "Line color" (tier 3 design,
section 2.2), not the hex of a default the element never draws. Which channel an arrow follows is
a fact about the element's drawing, so it is published by the element rather than kept in the app.

**Alternatives.** Hard-coding in the app that an arrow follows its line (the element's behavior
copied into the app); showing the element's default hex in italics (a color that is not drawn).

## 2026-10-12 -- Decided by the team: an empty select with words beneath, and a color field named without a drawn label

**What.** Three optional props in compact-mantine, all additive. `StyleSelect` gains `placeholder`:
given, a select nobody has chosen is drawn empty with those words (what the layers beneath give,
or "Mixed") instead of showing `defaultValue` as if it were chosen. `StyleSelect` gains
`showReset` (default on), as `CompactColorInput` already has, for a caller that draws its own way
back to "not set". `CompactColorInput` gains `aria-label`: its swatch, hex box and opacity box are
named from it ("Pick Node color", "Node color") as they are from `label`, and nothing is drawn.

**Why.** The Style tab's three field states (tier 3 design, decision 1.1): a field this layer does
not set is empty with the beneath value as its placeholder, and Clear is the row's minus, so a
select needs an empty state and no second reset; with the Nodes and Edges groups both on screen,
two unlabeled color fields were both "Pick color", which a screen reader cannot tell apart.

**Alternatives.** A "Not set" first option in every select (a second way to clear, beside "None",
which means the opposite); drawing each color field's label inside the field (a second name beside
the row's own).

## 2026-10-12 -- Decided by the team: find offers "contains" rules, and a selection offers its layer selector

**What.** Two additions to graphty-element, for search and selection as ways into a layer's rule.

- `FindResult.contains` (new type `FindContainsRow`): when plain text matched, one row per column
  it was found in, at most three, most elements first, each with every element whose value there
  contains the text: `kind`, `path`, `text`, `count`, a fixed-list `target`, and `rule`, the text
  leaf `{ kind: "text", reads: path, mode: "substring", text }`. Columns of numbers or yes-or-no
  values are left out (find matches those only whole), and so is an `exact:` search.
- `selection.layerSelector`: the selector that holds what is selected. The rule the selection was
  made from (`{ where }`, or text starting with `=`, with no scope) as `{ match: "expression" }`,
  while the selection is still exactly that rule; else the selected nodes and edges by id.

**Why.** "Nodes where name contains bob, 3 nodes" needs a count and a rule only the element can
give; the value rows say "is", not "contains". Turning a selection's origin into a layer selector is
what every consumer offering "New layer from selection" would otherwise write.

**Not breaking.** A new optional field on a result, a new exported type, a new read-only property.

**In the app.** The selection's own Style row (whose first value makes a layer) now uses
`layerSelector`, so a selection made by a rule makes a live rule layer instead of a fixed list of
what the rule held. "New layer from selection" in the selection's actions menu (and so the canvas
menu) opens that row; the element still refuses a layer that sets nothing, so the layer is made by
its first value, as the draft is.

## 2026-10-12 -- Decided by the team: a ramp editor in compact-mantine (`RampEditor`), and painted histogram bars

**Superseded in part by the owner's 2026-10-22 strict-Figma rule** (the default draws what Figma draws; contrast values live in the opt-in AA option): the ring around a painted histogram bar is drawn only in the AA option.

**What.** A new compact-mantine control, `RampEditor`, with its types (`RampEditorProps`,
`RampEditorBin`, `RampEditorPalette`, `RampEditorHandle`, `RampEditorLabels`), and an optional
`paint` color on `HistogramBin`, so a `HistogramRow` bar can be drawn in the color its values get.
The editor draws the value's histogram with each bar painted, handles under the bars for the
ramp's two ends and a midpoint, clamp brackets over the bars with each tail's count, step lines,
a scale select, a palette select with Reverse, a no-value chit and typed fields. It computes no
scale: the caller passes bins, paints and counts (graphty-element's `styles.preview`), a handle
lands on a bin edge, and `describe` gives each handle's spoken value. Scale and palette follow
the "empty means not set here" model: undefined shows the default and offers no reset. All
additive.

**Why.** Section 1.6 of the tier 3 design: every feature of the old degree control, made visible
on the data's own axis, in the shared library so the app writes no bespoke control.

**Alternatives.** `GradientEditor` as is (its stops sit on a color axis, not the data); text
fields alone (complete but read rather than seen).

## 2026-10-12 -- Decided by the team: where a label sits is not part of its look, and looks name a sans fallback

**What.** In graphty-element's `./catalog`: `labelLookChanges` no longer reports `location`,
`onTop` or `pickable` as changes from a look, and the Card, Dark, Pill and Callout looks set
`font: "Verdana, sans-serif"`. In the app, a new label starts on the Card look, drawn over the
graph and picking its node, at label size 72 written to the new `node.labelSize` channel instead
of the label style's own size.

**Why.** The entry shows position beside the look, so moving a label must not make its look read
"edited"; drawing over the graph and taking clicks are behavior no look sets. Without a generic
fallback, a machine without Verdana drew a look's words in the browser's default serif.

**Not breaking.** `labelLookChanges` and the looks were added on this branch and are not
released.

## 2026-10-12 -- Decided by the team: pictures for shapes, arrows and line patterns, and named label looks

**What.** All in graphty-element's `./catalog`, additive.

- `NODE_SHAPE_DESCRIPTORS`, `EDGE_ARROW_DESCRIPTORS` and `EDGE_LINE_DESCRIPTORS`: one
  `GlyphDescriptor` (`id`, `plainName`, `glyph`) for each of the 25 node shapes, 14 arrow kinds and
  9 line patterns, in the renderer's order. `glyph` is a static 24 x 24 SVG drawn in
  `currentColor`. New types `NodeShape` and `EdgeArrowKind` name the values.
- `LABEL_LOOKS` (Default, Card, Dark, Pill, Callout), `labelLook(id)`, and the new optional
  `LabelStyle.look`. A layer that names a look paints the look's fields as if it wrote them,
  beneath its own fields; `labelLookChanges(style)` lists the fields a style changes from its look
  (never `look` or `enabled`). An unknown look id is refused with `E_OPTION_RANGE` and the ids as
  candidates. Every look's text measures at least 4.5:1 against its background.

**Why.** A grid of 25 shapes needs pictures, and keeping them in the element means no application
draws its own copy of a shape the element owns. A look plus only the changed fields lets an editor
say "edited" and offer each changed field back without comparing anything itself.

**Not breaking.** New exports and one new optional label style field.

## 2026-10-12 -- Decided by the team: starting rows (Everything, Selected, Hovered) and run placement

**What.** All in graphty-element, additive; every default keeps today's behavior.

- Two project settings: `startingRows` (false by default) and `runPlacement` (`"beneath"` by
  default, or `"top"`), set with `session.config.set` and saved with the project. Turning
  `startingRows` on adds, in the same undo step, Everything (nodes and edges, pinned to the bottom,
  writing nothing), Selected (nodes and edges, pinned to the top, drawing the selection look) and
  Hovered (nodes, pinned to the top, writing nothing). With it on, the selection settings
  (`selectionStyle`) draw nothing themselves, so a node never carries two halos.
- `styles.restoreStartingRows()` adds back whichever of the three a reader deleted, as one undo
  step (nothing when all three are there). A starting row is known by its template source
  (`graphty:starting-everything`, `-selected`, `-hovered`), so renaming one keeps it found.
- A selector kind `{ match: "state", state: "selected" | "hovered" }`: the selection's nodes and
  edges, or the node under the pointer. It follows each change with no step and repaints only the
  elements whose state moved. `selection.hovered` and `selection.hover(id)`: the element writes
  the node under the pointer; any consumer may too.
- Six channels for the selection look as a style: `node.haloColor`, `node.haloSize`,
  `node.haloOpacity` and `edge.bandColor`, `edge.bandWidth`, `edge.bandOpacity`, defaults the
  selection settings' own; each color takes the effect off value `"none"`.
- With `runPlacement: "top"`, a finished run's suggested layer lands on top of the unpinned rows
  and no layer somebody wrote holds it back.

**Why.** The model's default rows (design/ui/studio/tier3/design.md, section 5) and its rule that
provenance never changes behavior: a fixed color on Everything must not stop a Louvain run from
painting its groups.

**Not breaking.** New settings, a new method, a new selector kind, six new channels and two new
selection members, all off or unused until a consumer asks. One narrow exception to an existing
refusal: a starting row may be a layer that writes nothing; every other layer that writes nothing is
still refused (`E_BAD_LAYER`). Whether to lift that refusal for every layer, so a reader can clear a
row's last value, belongs with the breaking items above.

**Rule kinds.** "Selected" and "Hovered" are selector kinds, not rule-tree leaves: a rule that
combines them with another condition ("selected and in community 3") is not built yet.

## 2026-10-12 -- Decided by the team: colors across rows (`styles.colors`, `styles.replaceColor`) and an off value for effects

**What.** All in graphty-element, additive.

- `styles.colors(rowIds)` lists the fixed colors some rows of the style tree write: set values,
  literal bindings and value-table (`map`) entries, never a palette's or a ramp's. A layer row
  counts both its node and edge parts; a folder counts every layer in it. Two spellings of one
  color (`#d55e00`, `#D55E00`) are one entry (`StyleColor`: the color as `#rrggbb`, and each
  `ColorWrite` naming the layer, the channel and, for a table entry, its value). An unknown row is
  `E_UNKNOWN_LAYER`.
- `styles.replaceColor(rowIds, from, to)` writes `to` wherever those rows write `from`, as one
  undo step, and resolves with the layers it changed. A layer the reader locked is left as it is;
  rows outside the ids are never touched. A `from` or `to` that is not a color is `E_BAD_COMMAND`.
- `ChannelDescriptor.off`: the value that draws nothing on an effect that is off until a layer
  switches it on. `"none"` for `node.outline` and `node.glow`, `0` for `edge.animationSpeed`.
  Written by a layer, it covers what the layers beneath write, as `LabelStyle.enabled: false`
  does for a label. The halo and band channels of the Selected row take the same field when they
  land.

**Why.** The panel's Selection colors on a folder or on several selected rows lists the colors
those rows write and edits one in exactly those layers; an Effects entry's eye has to cover an
effect a layer beneath writes, which an empty field (not set here) cannot do.

**Not breaking.** Two new methods, two new types and a new optional descriptor field. `"none"` was
refused on these channels before, so no layer that loaded before changes meaning.

## 2026-10-12 -- Decided by the team: hide by style, label looks that vary, and combine on numbers

**What.** All in graphty-element, additive.

- Two new channels, `node.visible` and `edge.visible` (switches, shown by default). Written false,
  the element is not drawn and cannot be clicked, yet it stays in the graph: counted by statistics,
  laid out, reachable by the selection and measured by every run. Written to the new optional
  `visible` field of the node and edge style.
- Fifteen new channels for the looks of words: size, text color and background for node labels
  (`node.labelSize`, `node.labelColor`, `node.labelBackground`), node tooltips (`node.tooltip*`),
  edge labels (`edge.label*`) and both arrow captions (`edge.arrowHeadText*`,
  `edge.arrowTailText*`). They write the same fields as the block's label style, but each can be
  bound to a value (label size by degree), which a label style cannot. Written after the label
  style, so a bound size wins over a size the style names.
- An optional `combine` on a binding (`CombineMode`: `"replace"`, the default, `"multiply"`,
  `"add"`). On a number channel, multiply and add scale or offset what the layers beneath painted
  for each element (Selected's edge width "multiply 2" doubles each edge's width); where nothing
  beneath painted, the channel's default is used, and the result is clamped to what the channel
  draws. Any other channel refuses multiply and add with `E_BAD_LAYER`.

**Why.** The unified style panel offers "hide" as an ordinary property, label looks as bindable
properties like color and size, and Selected and Hovered as layers that emphasize what is beneath
rather than overwrite it.

**Not breaking.** New channel names, a new optional binding field and type, and new optional style
fields. Code that switches over every `Channel` meets new members, as with every channel added
before.

## 2026-10-12 -- Decided by the team: per-value entries that follow their groups (`styles.categories`, `styles.setValueEntry`)

**What.** All in graphty-element, replacing the split built earlier the same day (never released).

- `styles.categories(layerId, channel)`: the values one channel of a layer paints by category (a
  community run's groups, a data column's values), largest group first, each with its count,
  whether it is hidden and its value-table entry. New exported type `ValueCategory`.
- `styles.setValueEntry(layerId, channel, value, entry)`: sets one value's entry in the binding's
  value table (`map`), or clears it with `undefined`, as one undoable step. A palette change reaches
  every value without an entry. Refused with `E_BAD_COMMAND` (`reason` `"not-bound"` or
  `"bad-entry"`).
- When a run re-runs, every layer is realigned, not only a split one: value-table entries, hidden
  values and rule conditions naming one of a partition's groups (a `categories` leaf over the run's
  value, an `item` leaf following the run's current result) move to the new group sharing the most
  members; other values match by name. Groups that match nothing are reported on the layer's
  optional `unmatched` field, `LayerUnmatchedGroup` `{ code, params: { path, value, dropped? } }`
  with codes `group.new` and `group.gone` (`GroupMatchCode`); `dropped` says the layer had named
  the lost group. Written into the re-run's own step, so undoing the re-run undoes it.
- Removed (never released): `styles.split`, `styles.unsplit`, `styles.setSplitOverride`,
  `styles.splitChildren`, `LayerSplit`, `SplitChild`, `SplitMatchCode` and the layer's `split`.

**Why.** The panel has two row kinds, layer and folder (design decision 1.7): a community is a
category row of its layer's binding, not a generated child, so the split command and split row had
no caller. Matching groups by members is a property of rules and bindings, so a hand layer whose
rule says "community is 3" keeps meaning the same nodes after a re-run.

**Limits.** A layer the reader locked is not realigned (its entries stay as written). An expression
selector naming a group is not rewritten; only rule leaves are.

**Not breaking.** New methods, an optional field on a layer and its spec, and new types. What it
removes was added on this branch and never published.

## 2026-10-12 -- Decided by the team: one style row that paints nodes and edges (`styles.addRow`)

**What.** For the unified style panel's "Nodes | Edges | Both" layers, all in graphty-element.

- `styles.addRow({ name, target: "node" | "edge" | "both", selector, set?, encode? })` adds one
  row. With `"both"` it is two layers, a node part and an edge part right under it, sharing the
  selector and carrying the node part's id as `row` (a new optional field on `Layer` and
  `LayerSpec`). One undo step.
- `set` and `encode` keys on a row are channels (`"edge.width"`) or bare properties (`"color"`); a
  bare one goes to every part whose kind has `<kind>.<property>`, so `color` paints both and `width`
  only the edges. `styles.writeRow(id, { name?, enabled?, set?, encode? })` writes that way, merging
  one key deep, as one step. A key no part has is refused with `E_BAD_COMMAND`, reason
  `row-channel-unknown`. `styles.parts(id)` reads a row back (`RowParts`: id, name, enabled, target,
  node, edge).
- `remove` and `move` on either part act on the whole row, and placing a layer above or below a
  part places it beside the row, so a row never splits. `add` and `update` refuse to set `row`; an
  update cannot change a part's kind. The style tree keys a two-kind row by its row id, so its eye,
  lock, move and delete reach both parts.
- A new edge reading, `incident` ("touching them"): the edges with at least one end among a rule's
  nodes, beside `induced` and `clipped` ("between them"). Rules only; a fixed set given it is
  refused.

**Why.** The panel shows a layer that paints both kinds as one row with one rule, and a color
written once must reach both. One element layer painting both kinds would change what `target`
reads back, which is breaking (it waits for the major, under "For the owner"); two parts sharing a
row is the additive form, and `styles.list()` keeps one layer per part with its single `target`.

**Not breaking.** New methods, types, an optional field on a layer and its spec, and a new member of
the open `EdgeReading` union.

## 2026-10-12 -- Decided by the team: the style tree (`styles.tree`, folders, pins, a reader's lock)

**What.** For the unified style panel's layer tree, all in graphty-element.

- `styles.tree()` returns the consumer's layers as rows, bottom first at every level: `StyleRow`
  (`id`, `kind` "layer" or "folder", `name`, `pin` "top" / "bottom" / "none", `locked`, `hidden`,
  `children`). A layer row's id is its layer's id (a two-kind row's id for a node-and-edge row); a
  folder's id starts with `folder:`. The element's own base and selection layers are not rows.
- `addFolder(name, at?)`, `renameRow`, `moveRow(id, { parent, index })`, `pinRow`, `lockRow`,
  `hideRow` and `deleteRow` (a folder with everything in it), each one `style.patch` step with its
  own history code (`style.add-folder`, `style.rename-row`, `style.move-row`, `style.pin-row`,
  `style.lock-row`, `style.hide-row`, `style.delete-row`) and one `style:changed` event.
- The tree order is the paint order: `list()` follows it. Rows within one folder sit in pin bands
  (bottom, unpinned, top), so a layer added later lands above a row pinned to the bottom. A hidden
  row, or one in a hidden folder, paints nothing; `list()` keeps its layers as written, and what the
  renderer, the legend and `explain` read treat them as disabled.
- The reader's lock (on a row or a folder holding it) refuses `update`, and every verb that goes
  through it, with the new error code `E_LOCKED`. Rename, move, pin, hide and delete still work, as
  in Figma. `Layer.locked` keeps its meaning (the element's own layers).
- `StyleDocument.tree` (new `StyleDocumentRow`) saves the tree, naming each layer by its place in
  `layers`, since reopening mints new ids. It is written only when the tree has a folder, a pin, a
  lock or a hidden row, so every existing document saves byte for byte as before.

**Why.** The panel's tree needs folders that change paint order, pins that keep Everything at the
bottom and Selected and Hovered at the top, and an eye and a lock that reach a folder's rows, saved
with the project and undone like any edit. Keeping the tree on the element means every consumer
gets the same paint order the panel shows.

**Not breaking.** New methods, a new error code, new history codes, new types and a new optional
document field. `list()`, `Layer.target` and `Layer.locked` are unchanged for an existing stack.

## 2026-10-12 -- Replaced: split a layer by value (`styles.split`)

**Replaced, never released.** The entry "per-value entries that follow their groups" above replaces
this one: `styles.split`, `styles.unsplit`, `LayerSplit`, `SplitChild`, `SplitMatchCode` and the
layer's `split` field are gone, and the rest lives on under neutral names. Kept here as the record.

**What.** For the unified style panel's split parents (a Louvain layer shown as one row per
community), all in graphty-element.

- `styles.split(id, by?)`, `styles.unsplit(id)`, `styles.setSplitOverride()` (an undefined
  override is "Follow parent") and `styles.splitChildren(id)`, which lists one child per value
  present: its value, size, hidden flag and overrides. Each write is one undo step. Any layer that
  paints a channel by category can be split, a run's or a data column's.
- A layer carries the optional `split: LayerSplit` (`by`, and `unmatched` codes); it is saved in the
  style document with the layer. New exported types `LayerSplit`, `SplitChild`, `SplitMatchCode`.
- A child's override is an entry in the parent binding's `map`, so a palette change reaches every
  child without one, and unsplitting leaves the overrides as value-table entries.
- When the run a split reads re-runs, a run that publishes group sizes (a partition) has its groups
  matched by shared members, so an override stays with the community holding most of its nodes; any
  other value is matched by name. Groups that match nothing are reported on the layer as
  `split.group-new` and `split.group-gone` (with `overridden`). The matching is written into the
  re-run's own step.
- A child can override only a channel the parent paints by the split's value; others are refused
  with `E_BAD_COMMAND` (`reason: "channel-not-split"`) until the panel needs more.

**Why.** The model says a scheme change on the parent reaches every child the reader has not
changed; a folder of copied layers cannot do that, and a re-run renumbering communities would move
every override to the wrong group.

**Not breaking.** New methods, a new optional field on a layer and its spec, and new types.

## 2026-10-12 -- Decided by the team: generic layer rules, a text test, and the node id as a value

**What.** For the unified style panel's "Which elements" editor, all in graphty-element.

- A layer selector `{ match: "rule", where: RuleTree, edges?: EdgeReading }`: the elements a rule
  tree holds, re-evaluated as the data changes. It is a `member` of the inline rule set
  `{ kind: "rule", where, reading: edges }`; `edges` defaults to `clipped`, the edges between the
  rule's nodes, as the visibility filter reads them.
- A `RuleTree` leaf `{ kind: "text", reads, mode, text, caseSensitive?, nodes? }`. `reads` is
  `"id"` (the node's id) or a value path such as `data.name`. `mode` is the new exported
  `TextMatchMode`: `substring`, `exact`, `starts-with`, `ends-with` or `regex`. Without
  `caseSensitive`, both sides are folded the way find folds them (case, accents, runs of spaces) and
  a pattern ignores case. The leaf works wherever a rule tree does: layers, rule sets, the
  visibility filter.
- `SelectionTextMode` gains `starts-with` and `ends-with`. A selection's text search and the leaf
  run one matcher (`textMatcher` in `session/text.ts`).
- Each `FindValueRow` carries `rule`: the exact-value text leaf that holds the row's elements, over
  the whole graph, so a find row becomes a live layer rule with no text turned into a rule by the app.
- "Top N by" any number column needs nothing new: the `threshold` leaf already ranks `data.*`
  paths, and the rule selector brings it to a layer (`{ kind: "threshold", path: "data.age", top: 10 }`).

**Why.** The owner's examples, "odd-numbered node ids" and "name contains Bob", could not be written:
the layer rule language had no text test and could not read the id. One matcher for search and rule
keeps a search and the rule made from it in agreement.

**Not breaking.** A new selector kind, a new leaf kind and a new mode in open unions, a new
exported type, and a new field on a result row. Selection's existing modes compare as before.

## 2026-10-11 -- Decided by the team: "or more" for a number inside a column's range, one rule spelling, and no refused suggestion

**What.** To build for tier 2 round 5, all in graphty-element's `./session` entry.

- `FindResult` gains an optional `atLeast: readonly FindAtLeastRow[]`, where `FindAtLeastRow` is
  `{ kind, path, value, count, target }`, built like `FindValueRow.atLeast`. It holds one row per
  number column whose lowest and highest values enclose the typed number when that number is not
  itself a value there. It is set only when the whole typed text is a finite number, and holds at
  most as many rows as `values`.
- A new export `rulePath(path)` beside `quotePath`: the shortest text a rule reads as that column
  (the bare name for a plain data column, else the quoted path). The "or more" targets use it, so
  their rule reads "minutes >= \`5\`", not "data.minutes >= \`5\`".
- The `number-needs-backticks` refusal carries `details.suggestion` only when the rewrite is a rule
  the selector accepts (it parses and reads at least one attribute), not merely one that parses.

**Why.** T22 asks for bus stops "10 minutes or more", and no stop has exactly 10. Typing "10"
offered "=\`10\`", which the selector then refused, and no "or more" row. The app must not parse
the number, scan columns or decide how a column name resolves, so the element answers all three.
`rulePath` lets the app delete its own copy of that name rule (`columnText` in `FindBox.tsx`).

**Not breaking.** Two new exports and a new optional field. `FindValueRow.atLeast` and the
`number-needs-backticks` suggestion are in no released graphty-element tag, so changing their text
or when the suggestion appears breaks no consumer.

## 2026-10-10 -- Decided by the team: a numeric find value row also offers "at least" (`FindValueRow.atLeast`)

**What.** To build for tier 2 round 4. A `FindValueRow` whose value is a number in a number column
carries an optional `atLeast: { count, target }`: how many elements in scope have that column at
or above the value, and a selection target naming them as the rule "`<column> >= N`", in the same
rule form the find box's rule option applies. Rows for text or boolean values have no `atLeast`.
Additive: a new optional property on an existing result type.

**Why.** On the Les Miserables half of round 3, 4 of 4 participants typed "10" into the find box
first, meaning "10 or more", and were offered only the ties of exactly 10. The app must not parse
the number or count matches itself, so the element, which already reads the column and counts the
exact value, also answers the "at least" question.

**Alternatives.** The app writing `>=` rule text from the typed number and asking
`selection.count` (the app parsing input, a workaround the architecture forbids); the element
accepting bare numbers in rules (changes what an existing call accepts, so it stays on the owner's
list under "Why a selector was refused, as a code").

## 2026-10-10 -- Decided by the team: Shift-click on a node adds it to the selection

**What.** To build for tier 2 round 4. A click on a node with Shift held adds the node to the
selection through `session.selection.applyNow({ nodes: [id] }, "add", "user")`, exactly as a
Shift-click on an edge already does (`Graph.ts`). A plain click still replaces, `node-click` still
fires, and the XR `select()` call keeps replacing. Ctrl and Meta are not added.

**Why.** A node click always called `selectionManager.select(node)`, which replaces the selection,
while an edge click honored Shift. All 4 sessions of round 3's "point out two people" task met the
difference, and two gave up. This is treated as a defect fix, not a breaking change: no export,
option, return value or default changes, and no graphty-element guide promises that a node click
replaces. If a consumer is shown relying on replace, this moves to the owner's list.

**Alternatives.** A modifier option on the selection manager (a second selection path beside the
session's); Ctrl and Meta as well (on macOS Ctrl-click opens the context menu, and a second key
convention is a separate decision).

**Built (2026-10-10).** One additive method, `SelectionManager.add(node)`: it adds the node to the
session's selection with cause "user" and keeps the manager's own index and highlight in step, so
the node click reaches the session through the manager it already used instead of reaching past
it. `SelectionManager.select(node)` now counts the session's whole selection (nodes and edges)
before deciding a click on the only selected node has nothing to do; it counted only the
manager's own index, so a plain click on a node that was one of several selected left the others
selected.

## 2026-10-10 -- Decided by the owner: every breaking row of #1727 ships as a minor

**What.** The owner judged every open row of #1727's breaking-changes table a minor change and a
two-way door, so the studio branch ships as a minor release, with no `!`. Two rows changed shape:

- **The export's group labels (row 5).** The old default stays: an export writes a partition's
  group as the algorithm's group id. A new export option, `groupRanks` (every format, off by
  default), writes it as its rank by size instead, 1 for the largest, in the group column and the
  sizes table. The graphty app turns it on, so its exported tables join the legend's "Group 2".
  This replaces the 2026-10-06 entry below, which changed the default.
- **A distance reader handed a strength (row 1).** It counts hops; it never converts the
  strength. The run reports that as the neutral code `caveats.weightSkipped`
  (`weight.meaning-mismatch`, with the column, its meaning and the meaning the algorithm reads),
  and the app shows it as "Each edge counts as 1". The branch already did exactly this.

**Why.** The owner's call (2026-10-10): none of these changes justifies a major release.

## 2026-10-10 -- Segmented control: Figma's face, not the inverse fill

Segmented control: the owner chose Figma's white or dark face with a 1px edge over the inverse
fill. It is more refined. Legibility of word options rests on the weight-600 label already decided
on 2026-10-08.

## 2026-10-10 -- Decided by the team: count what a selection would hold (`selection.count`)

**What.** Built on the studio branch. `session.selection.count(target)` returns `{ nodes, edges }`:
how many nodes and edges `selection.apply(target)` would select, without changing the selection. It
reads the target exactly as `apply` does, so a rule `apply` refuses is refused with the same
`GraphtyError` (`E_BAD_SELECTOR` with its `suggestion`). Additive: a new method on `SelectionApi`.

**Why.** The graphty app's find box offers plain text that finds nothing as a rule ("minutes >=
`10`" becomes the option "=minutes >= `10`") only when that rule would select something. It asked
`scope.count({ where })`, which reads a rule as a node scope, so a rule over an edge column counted
0 and the reader was told "No match" for a rule that selects three edges. Whether a typed rule
selects anything is the element's question to answer, the same way for every consumer.

**Alternatives.** Run `selection.apply` and undo it (a history step and a selection event for a
question); teach the app which columns are edge columns and pick `scope.count`'s edge form (the app
would parse the rule, which the architecture forbids).

## 2026-10-10 -- Decided by the team: a click on empty canvas has its own event (`canvas:empty-click`)

**What.** Built on the studio branch. A session publishes `canvas:empty-click` with `{ x, y }`
(where, in CSS pixels from the drawing's top left corner, as `elementAt` takes a point) for every
click that lands on no node and no edge: after the click cleared the selection, and also when
nothing was selected. `selection:changed` is unchanged. Additive: a new key in `SessionEventMap`.

**Why.** With a run selected in the graphty app (a row, not a node), a click on empty canvas did
nothing: the run stayed in the inspector and a note written next was filed "About PageRank"
(scripted on the round 3 candidate build; round 2 sessions disagreed because a selected node does
clear). The element already decides what a click is (the press, the release, the distance and the
time between them) and that it landed on nothing, but told no one when the selection was already
empty. The app now closes the inspector's row on the event, as it does on a selection change.

**Alternatives.** Fire `selection:changed` with an empty delta (breaks its "only a real movement
arrives" promise); listen for DOM clicks in the app and ask `elementAt` (copies the element's
click-versus-drag rule into the app, a workaround the architecture forbids).

## 2026-10-09 -- Decided by the team: what a highlight looks like, readable (`styles.highlightStyle`)

**What.** Built on the studio branch. `session.styles.highlightStyle(target: "node" | "edge")`
returns the static style `styles.highlight()` paints for that half when it names no style of its
own: the session's highlight color, and for an edge three times the default width. Additive: a new
read; nothing that exists changes.

**Why.** A Color or Width a reader adds to a selection's style layer started at the channel's
default, which is how every tie already draws, so adding it changed nothing (five study sessions).
The element already decides what "chosen" looks like (`DEFAULT_HIGHLIGHT`, `setHighlightColor`)
but exposes it to no reader, so the app could only copy the constant or invent a value, both of
which the architecture forbids. The app starts a selection's new line from this read.

**Alternatives.** The app doubles the width and picks a palette color (invents a graph value and
hides the open width-units question below); the "+" opens the value picker with no starting
change (held for a later round so one change is measured at a time).

## 2026-10-09 -- Decided by the team: a prepared load says how many edges repeat loaded ones

**What.** To build for tier 2 round 3. The result of `session.data.prepare()` gains a count of the
incoming edges that repeat an edge already loaded (same ends, same direction). Additive: a new
field; the load itself is unchanged.

**Why.** Opening a newer copy of a loaded file offers "Add", which turns 41 ties into 82 with only
a total to warn the reader (severity 3 in the study, one slip from a silent wrong answer). Only
the element knows which incoming rows match existing edges; the app matching file names would
guess. The app shows a line and a Replace button only when the count is above 0.

**Alternatives.** File-name matching in the app (a guess, wrong for a renamed copy); an automatic
replace (a choice the reader makes, not the element).

**As built.** No new field was needed: the load draft's report already has `repeated.seen`
("records that named an ordered pair the graph already held"), and the load itself counts it
correctly. Only the draft's report for an addition (`draft.report({ mode: "merge" })`) read 0,
because it measures in a scratch session that holds none of the graph's edges. The fix hands the
scratch session the graph's endpoint pairs (both ways on an undirected graph), so the report now
says 41 for friends-v2.csv over friends.csv, as the load does. No public type changed, so the API
report is unchanged. A record with its own edge id is still matched only by id in a real load and
not at all in a report; counting those waits for a consumer that needs it.

## 2026-10-09 -- Decided by the team: a click on a node's label can pick the node (`LabelStyle.pickable`)

**What.** graphty-element's label style (`node.labelStyle`, the `LabelStyle` type) gains
`pickable?: boolean`, and the renderer's schema `RichTextStyle` gains the same optional field.
Unset or false, a label behaves exactly as before. True, a pick that lands on a node's label
resolves to that node everywhere the element asks which node is under the pointer: a click
selects it, a hover reaches it, a drag starts on it, and `elementAt` answers it. A click on the
uncovered part of any sphere still picks that sphere's node. An edge's label is not affected.
The graphty app sets it on every label line it adds (`appLabelLook`) and on its top-degree
label layer.

**What happens today, established rather than assumed.** A label is its own plane (a Babylon
plane, pickable by Babylon's default) with no node id on it, so the pick lands on the label and
answers no node: a click on a name selects nothing, `elementAt` there answers nothing, and where
a label is drawn over a sphere (on the running-club drawing "Hana" over the lower half of Ivan)
it hides that part of the sphere from the pointer. Pinned by
`graphty-element/test/browser/label-click-picks-node.test.ts` ("the label plane takes the pick").

**Why.** On the bus-stops drawing a click inside the "Stadium" label was reported as empty
canvas: a reader points at the word they can read. Whether a label takes a click is a consumer's
choice (Cytoscape.js passes label clicks through by default; a reading app wants a name to pick
its node), so it is an option with a default that keeps today's behavior. Not breaking: a new
optional field whose default changes nothing. Named `pickable` after Babylon's `isPickable`, the
plain word for "takes a pointer". Tests: the element test above (real mouse input: a click on a
label's center selects its node and `elementAt` returns it with the option on; unchanged with it
unset or false), `test/session/styles/label-style.test.ts`, and the app's "a click on a drawn
name selects that node and opens it in the inspector" in
`graphty/src/workspace/graph-place/__tests__/tasks.real-element.test.tsx`.

**Alternatives.** Always resolve a label to its node (changes every consumer's clicks, an opinion
as a default); make labels unpickable so clicks pass through to what is behind (a click on a name
would then land on an edge or empty canvas, which is what the reader did not mean); an
element-wide switch instead of a style field (cannot differ per layer); a separate
`label-click` event (every consumer would have to wire selection, hover and `elementAt` to it
themselves).

## 2026-10-09 -- Decided by the team: a compact-mantine section title can wrap (`ControlSection` `wrapLabel`)

**What.** `ControlSection` takes an optional `wrapLabel` (default `false`). Set, a title too long
for one line wraps onto more lines instead of being cut with an ellipsis, and the header grows
past its 40px to hold it; a title that fits is drawn exactly as before. Additive: a new optional
prop whose default keeps today's drawing.

**Why.** The graphty app's neighbor list is headed by a sentence the task needs whole: "Medici and
11 connections within 2 hops". At 1440 x 900 the panel holds about 37 characters, so the hop count
was cut and readable only in a tooltip that opened over the Hops control under it. A section name
of one to three words never needs this, so the default stays one line.

**Alternatives.** Draw the heading outside `ControlSection` in the app (a second heading style for
one panel); shorten the words (the count and the reach are the answer); always wrap every section
title (changes how every existing section is drawn).

## 2026-10-09 -- Decided by the team: a selection's origin has its own event (`selection:origin-changed`)

**What.** A session publishes `selection:origin-changed` with `{ origin }` when a selection call
changes `selection.origin` while no member joins or leaves: a rule that selects exactly what is
already selected, or clearing a selection a rule left empty. `selection:changed` is unchanged and
still fires only when members move; when it does, `selection.origin` is already current, so the
new event never fires for the same call. Additive: a new key in `SessionEventMap`.

**Why.** Typing ``=minutes >= `10` ``, pressing Enter, then changing it to ``=minutes > `9` `` and
pressing Enter selects the same three edges. The origin became the new rule, but nothing told
the graphty app, so its find box kept "Rule: press Enter to select matches" under a rule that had
already run. Firing `selection:changed` with an empty delta would break its documented promise
("only a real movement arrives"), and every consumer redrawing on it would do work for nothing.

**Alternatives.** Fire `selection:changed` with an empty delta (changes what an existing event
does); have the app re-read the selection after its own `apply` resolves (works for one consumer
only, and misses an origin change made by anyone else).

## 2026-10-09 -- For the owner: a compact-mantine number box given `value` follows it even when it is undefined

**Decided by the owner (2026-10-10): ships as a minor**, with every other row of the pull request's breaking table.

**What.** `StyleNumberInput` is controlled whenever its caller passes the `value` prop, including
`value={undefined}`, which its documentation already defines as "nothing entered: show
`defaultValue`". Before, Mantine's `useUncontrolled` read an undefined `value` as uncontrolled, so
once a reader had typed a number while the caller passed undefined, the box kept showing that
number (with a reset button) after the caller went back to undefined. No prop changes. A caller
that passes `value` but never updates it from `onChange` now sees the box return to the default
after a commit, which is what "controlled" means; a caller that omits `value` is unchanged. Listed
here because it changes what an existing component does. Done on the studio branch; undoing it is
a one-line revert in `StyleNumberInput.tsx`.

**Why.** The graphty app's run settings pass no value for a setting at its default, so PageRank's
Damping factor at 0.85 draws no reset. Without this change, typing 0.9 and pressing reset left
0.9 on screen with the reset still drawn. Test:
`compact-mantine/tests/components/StyleNumberInput.test.tsx` ("shows the default and no reset
once its caller passes undefined again").

**Alternatives.** Treat a value equal to `defaultValue` as the default inside the component
(wrong for a style layer, where an explicit value equal to the default still overrides the layers
beneath it, so its reset does something); remount the box with a `key` in the app (a workaround
of the shared component in one caller).

## 2026-10-09 -- Decided by the team: a bare-number refusal carries the rule rewritten (`suggestion`)

**What.** When a selector is refused with the reason `number-needs-backticks`, the error's
details gain `suggestion`: the same selector text with every bare number put between backticks
(`minutes >= 10` gives ``minutes >= `10` ``). Additive: the code, the reason, `position` and
`character` are unchanged, and no other refusal carries it.

**Why.** The graphty app's find box answered a bare number with an example built from a column's
midpoint ("minutes > `9`", "shared_chapters > `16`"), not from what the reader typed. Two pilots
of the tier 2 rule task copied an example close to the task's own number and would have selected
the wrong ties. Only the element's tokenizer knows which characters are numbers in a selector, so
the app cannot rewrite the reader's text without parsing the grammar itself, which the
architecture forbids.

**Alternatives.** The app wraps digits in backticks itself (a second parser of the selector
grammar, wrong inside a quoted name or a column called `col2`); accepting bare numbers (changes
what an existing API accepts: already an owner question under `E_BAD_SELECTOR`); an example
number far from the data (still not the reader's rule).

**Since (2026-10-09).** `suggestion` is present only when the rewritten selector itself parses.
`shared_chapters >= 10x` would have suggested ``shared_chapters >= `10`x``, which is refused in
turn, so it now carries no suggestion and the app shows no rewrite.

## 2026-10-08 -- Decided by the team: a layer update's history step names the channels it changed (`channels`)

**What.** The fact of a `style.update-layer` history step gains one param, `channels`: the
channels whose set value or binding the update changed, in the order the layer and the update
name them, and empty when only another key changed (a rename, a selector, turning the layer off).
Additive: `layer` is still there and means the same; the fact's code is unchanged.

**Why.** Undo and Redo now name the step they take back, in their tooltip and in the status line
after they run. Binding Size to a result in the Style tab is an update of the result's layer, and
the fact said only which layer, so the best the app could say was "Undo changing PageRank" while
the drawing lost every node's size. With the channels the app says "Undo changing Size on
PageRank". The step keeps no payload, so the app could not find this out after the fact.

**Alternatives.** Keep the update payload on the step (every step would retain it, and the
history's byte budget counts it); a code per channel kind (many codes for one op); the app reading
the layer before and after the undo and diffing it (computing what the element already knows, and
impossible for a step further back than the next one).

**Built.** `graphty-element/src/session/commands/style.ts` (`changedChannels`), the code table in
`HistoryCode`'s comment. The public API report is unchanged (the params are documented, not
typed). Test in `graphty-element/test/session/history/step-facts.test.ts`, "names the channels a
layer update changes": a layer given Size reports `["node.size"]`, a rename reports `[]`.

## 2026-10-08 -- Decided by the team: a shortest path can follow edges one way (`direction`)

**What.** graphty-element's shortest-path algorithms (Dijkstra and Bellman-Ford, the two a path
run left to choose its method picks between) gain one optional option, `direction: "out" | "in" |
"all"`, the same values as the neighborhood's `SelectionDirection`. `"all"`, the default, is
today's behavior: an edge may be crossed either way. `"out"` crosses an edge only from its source
to its target, `"in"` only from target to source; on an undirected graph every value acts as
`"all"`. The run records the value it used, like every option. Additive: a run that does not set
it behaves exactly as before.

**Why.** The tier 2 design gives the app's path form a "Follow: Out | All" choice on a directed
graph, and it was never built: the element's search always ignores direction, so there was
nothing to bind it to. In the fourth dry run a path on the friends network ran against two of the
drawn arrows and nothing on screen said a path counts ties either way. With the option, the form
shows "Follow: All" and Made with records it.

**Alternatives.** Follow the graph's own direction by default (changes what every existing path
run returns: breaking, and an opinionated default); a boolean `directed` (cannot say "in", which
the neighborhood already offers); the app reversing or filtering edges itself (computing over the
graph outside the element).

**Built.** `"out"` searches the graph as declared, `"in"` searches its transpose (same node and
edge spaces, released from the accelerator after the run), and the run's `caveats.direction` reads
"directed" when either was used. The path run's catalog entry picks the option up from Dijkstra,
so a generic options view (the app's Made with "Advanced run settings") shows "Follow Edges: All"
with no app change. The public API report is unchanged: the options interfaces are not exported.
Tests in `graphty-element/test/algorithms/pathfinding/path-direction.test.ts`, for each of
Dijkstra and Bellman-Ford on the chain a -> b -> c, path c to a: "defaults to all", "all crosses
edges either way on a directed chain", "the default finds the same route as all", "out follows
edges only source to target", "in follows edges only target to source", "an undirected graph is
read either way whatever the value".

## 2026-10-08 -- Decided by the team: find counts its hits by kind (`FindResult.totals`)

**What.** graphty-element's `FindResult` gains `totals: { node: number; edge: number }`: how many
of the hits are nodes and how many are edges, in all, past the window (they add up to `total`).
compact-mantine also exports `EllipsizedName`, the name that ellipsizes and shows its whole text
as a tooltip only while it is cut short (already used inside its Tree and DataRow).

**Why.** The graphty app lists node and edge hits under their own headings, and a heading that
says "Edges 17" while six rows show tells a reader more ties are below. Only `total` came back,
and counting the listed rows gives the window's size, not the number of matches; counting the
graph again in the app would be computing over the graph outside the element. The Graph place's
title used a plain tooltip that repeated its own whole text; the shared component already does
the right thing and was not exported. Tests: `graphty-element/test/session/find.test.ts` ("counts
the hits of each kind in all, past the window"), `compact-mantine/tests/exports.test.ts`.

**Alternatives.** A `kinds` filter call per kind with `limit: 0` (two finds per keystroke, and the
app adding them up); an optional field (every consumer then handles a missing count the element
always has).

## 2026-10-08 -- For the owner: should a project file keep where the camera was looking?

**What.** Not done; a question. Today a project file saves no camera (the rule: the camera is view
state, not saved), so a reopened project is framed afresh from the saved positions. The proposal
is to save the camera beside the selection in the `graphty-view-state` member, which is already
view state that a file carries and never needs to open, and to place the camera there on open
instead of framing. An older file without it would open as today.

**Why.** A fresh framing can only match the saved picture when that picture was itself a fresh
framing of the final state. It often is not: with the Florentine families sample, the legend card
first appeared over a node, so the graph was framed clear of the card as it was then (one section
tall); the card then grew a section and hid nothing, so nothing moved. Reopened, the graph is
framed clear of the taller card, about 60 px lower and smaller than when it was saved. The app now
holds its legend card's margin until the element's first framing of an opening has landed, which
fixes the common case (the friends file reopens within 10 px), but this case needs the saved
camera. Evidence: `tmp/r1-dry4-reopen-framing/` (`fixed-florentine/`, `T19B/02.png` against
`T19B/05.png`).

## 2026-10-08 -- For the owner: a compact-mantine fold's content is no longer a named region

**What.** compact-mantine's `ControlSubGroup` drops `role="region"` and `aria-labelledby` from the
content it opens. The header button keeps `aria-expanded` and `aria-controls` pointing at the
content, so the APG accordion pattern holds (the pattern makes the region optional). No prop
changes; what changes is the accessibility tree every caller exposes, so it is listed here as a
change in behavior. Done on the studio branch; undoing it is a two-line revert.

**Why.** Named by its button, the content took the button's name ("Collapse Advanced run
settings"), so the word "Advanced" named two reachable things: a screen reader's landmark list and
the study tool both found the fold twice, and a panel of folds became a list of landmarks. Test:
`compact-mantine/tests/components/ControlSubGroup.test.tsx` ("follows the accordion pattern: an
expanded button pointing at its content, the only thing of that name").

## 2026-10-08 -- Decided by the team: a tree can leave a selected parent's children unbanded (`childBand`)

**Superseded in part by the owner's 2026-10-22 strict-Figma rule** (the default draws what Figma draws; contrast values live in the opt-in AA option): a segmented control's chosen label is weight 450 by default, as Figma draws it (600 in the AA option), and unchosen labels are Figma's secondary ink.

**What.** compact-mantine's `Tree` gains an optional `childBand?: boolean`, default `true`. True is
today's look: a selected, open parent draws a band behind its visible children (Figma's layer
list). False draws a selected parent like any other selected row and leaves its children plain.
The graphty app passes `false` on the Sources tree and the paint tree. Additive: the default keeps
every other caller's look.

**Why.** In Figma, selecting a frame selects its contents, so the band is true. In the app,
selecting a source or a paint row never selects its children, yet the band painted the three
rows under "people.csv and messages.csv" so that four rows read as selected; a stronger parent
tint did not separate them. Test: `compact-mantine/tests/components/tree/Tree.browser.test.tsx`
("childBand={false}") and `treeModel.test.ts`.

**Alternatives.** Dropping the band for every tree, which changes the look of trees whose parents
do select their children; a weaker band, already tried.

**Also changed in compact-mantine, with no API change.** A tree's type-ahead takes letters and
digits only, so "/" on a focused row reaches the page's Find shortcut. The Escape that closes a
menu is marked as used (`preventDefault`), so the page's "Escape clears the selection" skips it
and the selection stays; the next Escape clears. A disabled menu row (focusable, with its reason)
never takes the highlight, and a menu that opens with one first focuses the first enabled row. A
segmented control's chosen label is drawn at weight 600 (the unchosen stay 450, in the body color).

## 2026-10-08 -- Decided by the team: a tree row can show its description as a second line (`descriptionVisible`)

**What.** compact-mantine's `TreeNodeData` (and `TreeItem`) gains an optional `descriptionVisible`
flag. Set, the row draws its `description` as a second 16px line under the name, in the secondary
ink, and the row grows from 32 to 44 (its hover pill and focus ring from 24 to 36). Unset, the
description is only read by a screen reader, as before. Additive: no prop changes meaning and no
default changes.

**Why.** A filter step's row must show both the condition the reader set ("shared_chapters is at
least 5") and what it keeps ("77 to 26 nodes", or "off"). In the 240-wide Data list the condition
alone fills the row, so the outcome in the row's count slot cut the condition to "weight is at
least..." and the outcome to "20 to ...". A second line keeps both whole; the screen reader hears
the same words through the row's existing description. Test:
`compact-mantine/tests/components/tree/Tree.browser.test.tsx` ("draws a visible description as a
whole second line under a long name").

## 2026-10-08 -- Decided by the team: a load says what each of its tables held (`LoadedSource.tableRows`)

**What.** graphty-element adds one optional field, additive: `LoadedSource.tableRows?: readonly
("nodes" | "edges")[]`, in the same order as `tables`: whether each table the load read held node
rows or edge rows, as the load read them. It is kept with the load in `data.sources()` and saved
with the project; it is absent for a graph file (its one name holds both kinds), for a load that
read no table by name, and in a project saved before it was kept. The graphty app draws each table
under a two-file source as a node or an edge table, and a click on one opens that table in the
table dock and shows only what that table added.

**Why.** Under "people.csv and messages.csv" the Sources list showed people.csv and messages.csv,
and a click on either showed the whole load: the app could not tell which file had become nodes
and which edges, because the element knew it while loading and then dropped it. Guessing from the
order the files were added would be wrong whenever a reader adds the edge file first or flips
"Each row is". Not breaking: a new optional field. Test:
`graphty-element/test/session/data-sources.test.ts` (kept through save and reopen; absent for a
graph file).

**Alternatives.** A record keyed by table name, which two files of the same name would collide in
just as `tables` does; the full mapping each table was read with, which is far more than any
consumer asked for.

**Also fixed in the element, with no API change.** A replacing load under a seeded layout now draws
the new data exactly as opening that data draws it. The layout's rule "a seeded layout starts over
when data arrives, unless another graph write is still to come" counted the import being placed as
one of the writes still to come, so a replace never started over: the new graph was laid out from
where the old one had got to, came out deep along the line of sight, and was framed small in the
middle of the canvas. Only commands that have not started now count. Test:
`graphty-element/test/browser/replace-load-frames.test.ts`.

**Also fixed in compact-mantine, with no API change.** `Anchor`'s `size` prop was ignored (every
link was drawn at the 11px body size), so a link in a 9px caption stood out larger than its
sentence. A link now takes its size's type; the default, `sm`, is unchanged. Callers that pass
`size="xs"` (the import grid's caption, the inspector's "from" line, the usage-data card) now draw
it at the caption size they asked for.

## 2026-10-08 -- Decided by the team: a selection made by a rule says which columns the rule tested (`selection.originPaths`)

**What.** graphty-element adds one read-only property, additive: `SelectionApi.originPaths: readonly
Path[]`. While the selection is still exactly a rule (`selection.origin` is `{ where }`, or `{ text }`
starting with "="), it lists the columns that rule tests, as the attribute paths
`data.attributes()` publishes (`["data.minutes"]` for the rule ``minutes >= `10` ``); otherwise it is
empty. The graphty app lists each selected edge in the inspector by its two ends' names with the
value of each tested column under that column's name ("School -> Harbor 12").

**Why.** After a rule selected 3 slow bus links, the inspector said only "Edges 3": a reader could
not tell which links, or check them against the rule. The element already knows which columns a
rule reads (its query engine keeps them to key its cache), and the rule's own text is the only other
source; the app would have had to parse the rule to find the column, which is reimplementing the
element's parser. A bare column name in a rule is published as its attribute path, so a consumer
looks it up in `data.attributes()` without knowing that a rule may leave out `data.`. Not breaking:
a new property. Test: `graphty-element/test/session/selection-origin.test.ts`.

**Alternatives.** The paths on the `selection:changed` delta, which a panel that did not make the
call never sees and which would go stale with no change event; a general `scope.pathsOf(where)`,
which is the same fact one step further from where a panel needs it.

## 2026-10-08 -- Decided by the team: which end of a left-out row has no node (`missingEnds`)

**What.** graphty-element adds a type, `EdgeEnd = "source" | "target"`, and one optional field in
two places, additive: `LeftOutEdge.missingEnds?: readonly EdgeEnd[]` (kept with each left-out row,
saved with the project; a project saved before it still opens, with the field absent) and
`DraftRow.missingEnds?: readonly EdgeEnd[]` (present only on the rows `draft.rows(table, { only:
"unmatched" })` returns). Each lists the ends that name a node no node row holds: one end or both.
The graphty app marks that cell in the import page's unmatched grid ("s11 (no node row)", with a
warning glyph), says it in the grid's caption ("1 unmatched row: s11 has no node row"), and leads the
inspector's left-out line with it ("Line 17: s11 has no node row; from s04, to s11, passes 3").

**Why.** An unmatched row showed "s04, s11, 3" and the reader could not tell which name was the
missing one: "s11" looks like "s04". The element decides which end is missing while it reads the
rows and then dropped that fact; another consumer could only recompute it by matching ids against
the node rows itself. The ends are named, not the values, so a row whose two ends hold the same
value is still exact, and the app finds the column through the roles it already reads
(`draft.resolve`, `LoadedSource.leftOut.endColumns`). Not breaking: new optional fields and a new
type. Tests: `graphty-element/test/session/load-draft.test.ts` (source missing, target missing,
both; absent without the filter), `graphty-element/test/session/data-sources.test.ts` (kept through
undo, redo, save and reopen).

**Alternatives.** The missing values themselves (`missing: ["s11"]`), which loses which column they
came from when both ends hold the same text; the missing column names on `DraftRow`, which a
`LeftOutEdge` cannot carry the same way (its ends are not columns when read by an expression).

## 2026-10-08 -- Decided by the team: a shortest path left to choose its method says which it used, and a choice can carry its own name

**What.** Three changes in graphty-element. (1) The shortest path's `method` option, left unset,
now does what its description always said: Dijkstra when every weight the run reads is zero or
above, Bellman-Ford when one is negative. Before, an unset method always ran Dijkstra. (2) The
method that ran is the run's existing `caveats.method` ("dijkstra" or "bellman-ford"); no new field.
(3) An option's UI metadata (`defineOptions` meta) gains `choiceLabels?: Record<string, string>`,
the name of each choice by value, read into the catalog's `OptionDescriptor.values[].label`; the
method option sets "Bellman-Ford", which the catalog spelled "Bellman Ford" (the value made
readable). The graphty app shows an unset method in Made with as "Dijkstra, chosen automatically"
(the run's `caveats.method` under the app's words) and, before a run, as "Chosen automatically".

**Why.** A finished path showed an empty Method box, so a reader could not tell which method made
the result. The record already existed in `caveats.method`; what was missing was the switch the
description promised, and without it an unset method over a negative weight ran Dijkstra, whose
relaxation never ends on an undirected negative edge and froze the page. Not breaking: the switch
makes documented behavior true and only changes runs that froze before; `choiceLabels` is a new
optional field whose absence keeps today's labels, and it is not in the public API report (the
option metadata type is internal). Tests: `graphty-element/test/browser/shortest-path-method.test.ts`,
`graphty-element/test/catalog/algorithms.test.ts` ("Bellman-Ford"),
`graphty/src/workspace/analyze/__tests__/words.test.ts`.

**Alternatives.** A new `resolvedParams` record on the run (a second place for a fact
`caveats.method` already states); writing the resolved method back into the run's params (a rerun
would then pin it, and the reader's "left unset" would be lost); fixing the spelling in the app's
words only (every other consumer would still read "Bellman Ford").

## 2026-10-08 -- Decided by the team: a label can be drawn over the graph (`LabelStyle.onTop`)

**What.** graphty-element's label style (`node.labelStyle`, `edge.labelStyle`, the `LabelStyle`
type) gains `onTop?: boolean`, and the renderer's schema `RichTextStyle` gains the same optional
field. Unset or false, a label sorts by depth with the nodes and edges, exactly as before. True, the
label is drawn after the graph with the depth buffer cleared (the way a tooltip already is), so no
node, edge or selected edge's band covers it. The graphty app's label look (`appLabelLook`, written
on every label line the app adds) sets it on.

**Why.** On a drawing with names on, a nearer node's sphere hid the name of the node behind it
("Hana" read "H..a" under Ivan), and a selected tie's blue band cut "Stadium" to "Stadi m". Whether
a name may be covered is a reader's choice: a dense 3D scene may want depth cues, a reading app wants
every name whole, so it is an option with the neutral default (depth sorted, today's behavior). Not
breaking: a new optional field whose default keeps today's drawing. Named `onTop` after the
renderer's existing tooltip option, short and plain. Tests:
`graphty-element/test/browser/label-drawn-over-edges.test.ts` (a nearer edge crosses a default
label and does not cross an `onTop` one; an edge label moves to the top group only with the
option), `graphty-element/test/session/styles/label-style.test.ts`, story `Styles/Label OnTop`.

**Alternatives.** Labels always on top (changes every consumer's drawing, an opinion as a default);
an element-wide switch instead of a style field (cannot differ per layer, so a reader could not put
only some names on top); a depth offset toward the camera (still cut by any node nearer than the
offset).

## 2026-10-08 -- Decided by the team: view insets never move the drawing, and `nodesInRect` says what an overlay hides

**What.** Setting graphty-element's `viewInsets` (and `Graph.setViewInsets`) no longer moves the
camera: every node stays where it is drawn, and the next fit keeps clear of the new margins. Before,
the element framed the graph again on every change while `autoFrame` was on, and the 3D camera also
re-centered on the new free area at once. The element also gains `nodesInRect({ x, y, width,
height })`: the ids of the nodes drawn, even in part, inside a rectangle of the element, in CSS
pixels from its top-left corner. The graphty app's legend card sets its inset and calls
`zoomToFit()` only when `nodesInRect` of its own box is not empty.

**Why.** Running an analysis grows the legend card; the app reported the bigger card as a new top
margin, and the element re-framed and re-centered the whole drawing, so every node moved and shrank
after each run although the card hid none of them. A margin is a band across the canvas, and a card
in a corner covers far less than its band, so "a node lies under the margins" is the wrong test for
moving the drawing; only the consumer knows the shape of what it laid over the canvas. Not breaking:
`viewInsets` and its framing are new on this branch and not in any published release (master's
graphty-element has no `viewInsets`). `nodesInRect` is additive. Tests:
`graphty-element/test/browser/camera/view-insets.test.ts` ("changing the insets leaves every node
where it was drawn until the next fit"), `graphty/src/workspace/canvas/__tests__/CanvasOverlays.test.tsx`
("frames the graph again when the card lands on a node").

**Alternatives.** Keep the re-framing and re-frame only when a node lies under the new bands (moved
the drawing whenever a corner card's band reached a node the card did not cover); an option to turn
the re-framing off (a second switch beside `autoFrame` for behavior nobody wants by default);
rectangles instead of bands for fitting (a fit around a corner cut-out is a much larger change).

## 2026-10-08 -- Decided by the team: find an edge by its name (`FindOptions.edgeNameJoiner`)

**What.** graphty-element's `FindOptions` gains an optional `edgeNameJoiner?: string`. Set, `find`
also matches each edge against its name: its source's name, the joiner, its target's name (with
`" -> "`, "Station -> Stadium"). The name ranks with node names, so typing the whole name or either
end's name lists the edge, after the node itself; the hit's `match.path` is then `"ends"`. Absent
(the default), an edge is found by its own attribute values only, exactly as before. The graphty
app passes the same joiner its inspector titles an edge with (`edgeJoiner` in
`graphty/src/workspace/inspector/words.ts`).

**Why.** A reader who read "Station -> Stadium" at the top of the inspector, or who knew the two
stops, typed that into Find and got "No match": an edge was findable only by its own columns. The
words between the names are the application's, so the element takes them from the caller instead
of choosing an arrow; the matching over the graph is the element's. Test:
`graphty-element/test/session/find.test.ts` ("finds an edge by its name ...").

**Alternatives.** Matching ends by default (changes what `find` returns for existing calls:
breaking); the app splitting its own title and searching twice (computing over the graph in the
app); a structured `{ source, target }` query (a second way in for a typed box that has only text).

## 2026-10-08 -- Decided by the team: a run says when it assumed its weight's meaning (`WeightMeaning.assumed`)

**What.** graphty-element's `WeightMeaning` gains an optional `assumed?: true`. A run's
`caveats.weight` carries it when the loaded weight had no stated meaning and the run read it as the
meaning its algorithm reads (a strength reader reads an unstated weight as a strength). Absent when
the meaning was stated, at load or in the run's `weight` option. Nothing else changes: `attribute`
and `meaning` are what they were, and a run that read no weight still has `null`.

**Why.** A run read a weight nobody gave a meaning as "closer", and the run's own record could not
say so: `caveats.weight` looked exactly like a weight declared "closer". So the right panel said
"Weight: weight (closer)" while the Data page said "Higher means: Not set" for the same column --
two answers to one question. The only other source, the current `data.loadedWeight()`, describes the
data as it is now, not the run, and is wrong for a run made before a Replace. The fact belongs to the
run, so it is in the run's caveats. Tests: `graphty-element/test/browser/runs-loaded-weight.test.ts`,
`graphty-element/test/algorithms/metrics/metric-results.test.ts`.

**Alternatives.** A separate `caveats.weightAssumed` flag (two places to read one fact); the
declared meaning (`null`) in `meaning` itself (changes what an existing field returns: breaking).

## 2026-10-08 -- Decided by the team: a number box can be empty with words, and a table header opens its menu on a right-click

**What.** compact-mantine's `StyleNumberInput` gains an optional `emptyText` prop: while the reader
has entered nothing, the box is empty and shows these words as its placeholder instead of
`defaultValue`. Unset, nothing changes. `DataTable` now opens a column's header menu on a
right-click (the same menu the caret and the context-menu key already open), and only the primary
button sorts. A header without a menu still leaves the right-click to the browser. No prop, type
or default changes meaning.

**Why.** A sampled analysis's sample size has no default number (empty means the exact run from
every node), but the box drew "0", which a participant read as a sample of nothing. In the same
round a participant right-clicked a column header looking for its options, saw the menu caret
appear on hover and took it for a sort; the right-click did nothing. Tests:
`compact-mantine/tests/components/StyleNumberInput.test.tsx`,
`compact-mantine/tests/components/DataTable/DataTable.header.browser.test.tsx`.

**Alternatives.** A `defaultValue` of `null` (changes the type every caller reads); a separate
"Exact" checkbox beside the box (two controls for one setting).

## 2026-10-08 -- Decided by the team: StyleSelect takes an `aria-label`, and every reset button has a tooltip

**What.** compact-mantine's `StyleSelect` gains an optional `aria-label` prop, forwarded to the
field. Unset, the visible label is still the only name, as before. The reset button beside a
`StyleSelect`, `StyleNumberInput` or `CompactColorInput` now shows its name ("Reset km to
default") as a tooltip on hover. Additive: no prop changes meaning and no default changes.

**Why.** On the import page each column's role box is labeled with the column's own name, "km",
which says nothing about what the box sets and collides with the grid's "km" header; the page now
names it "Role of km", which still holds the visible word (WCAG 2.5.3). The reset is an icon-only
button, and an icon-only button must say what it does to a pointer user too, so the fix is in the
shared controls rather than one page. Tests: `compact-mantine/tests/components/StyleSelect.test.tsx`,
`compact-mantine/tests/components/ResetTooltip.browser.test.tsx`.

## 2026-10-08 -- For the owner: a compact-mantine stat row grows instead of cutting its reading

**What.** In `@graphty/compact-mantine`, a `DataRow` with `stat` whose reading does not fit beside
its name now wraps the reading onto more 16px lines and the row grows past 32px; before, the
reading was cut with an ellipsis and a tooltip. A `PageList` row's second line (`description`)
also wraps instead of cutting. A `Tree` row's `count` stays whole until it would take more than
half the row, then ellipsizes at half, and while the name or the count is cut, the name's tooltip
shows both. No prop, type or export changes, but a consumer that assumed every stat row is 32px
tall (a fixed-height virtual list) sees taller rows, so it is listed here as possibly breaking.

**Why.** At 1440 x 900 with default panel widths the inspector's Overview cut "3 to 6, mean
3.667" to "3 to 6, mean 3...." and "Undirected, set in the project" to "Undirected, set in the...",
Recent projects cut the save time, and a cut Sources row's tooltip named the file but not its
counts. A stat's reading is the half the reader came for; a tooltip is not a reading.

**Alternatives.** Cutting the name instead of the reading (a stat label cut to "Edges per n..." is
no better); trimming row padding (gains 8px, enough for one case, not for a phrase).

## 2026-10-08 -- For the owner: a ranking's histogram bins continuous values into bands

**What.** `RunResult.histogram()` (and `data.histogram()`, which shares `buildHistogram`) gives one
bar per distinct value whenever a field has no more distinct values than bins. For a field that
counts things that is the readable shape; for a continuous field such as PageRank on a 20-node
graph it gives 20 bars of height 1, which says nothing about the spread. The fix keeps one bar per
value only for integer-valued fields, or when values repeat, and bands every other field. It
changes what an existing method returns for small continuous fields, so it is listed here as
possibly breaking; it is built on the studio branch so the study does not run on equal bars.

**Why.** The tier 2 dry run drew 20, 12 and 14 equal bars on the PageRank Values chart, whose
values cluster (five between 0.11 and 0.13, the rest between 0.02 and 0.07). The function's own
documentation says the per-value shape exists "for a count metric".

**Alternatives.** An option `binning: "bands"` the app passes (additive, but every consumer meets
the same useless default first); leaving it (the chart stays on screen and misleads).

**Built rule.** One bar per value when the field is integer-typed, when every value is a whole
number, when there is only one value, or when values repeat (at least two elements per distinct
value on average); otherwise bands. In `buildHistogram`, so `RunResult.histogram()`,
`groupSizes()` and `data.histogram()` all follow it. Visible change: a decimal column with one
value per element (`data.histogram` on a five-row `score` of 0, 0.5, ... 2) now reports
`binning: "banded"` where it reported `"per-value"`.

## 2026-10-08 -- Decided by the owner: the element's highlight stays indigo; the app picks its own route color

**Decision.** The owner decided on 2026-10-08: graphty-element's default highlight color stays Paul
Tol's indigo `#332288`, and the graphty app chooses its own highlight color. An earlier studio
commit (5a7d22fd1) had changed the element default to black; that change is undone.

**Why.** Changing an existing default changes what every consumer's drawings look like, which is a
breaking change, and the element's defaults are the neutral choice while consumers make their own
(root CLAUDE.md, "graphty-element offers choices; consumers make them"). The problem the black
default fixed is real but is the app's: on the app's unranked drawings, an indigo route's nodes
measured Delta E 19.5 and 2.1:1 from the default nodes as lit spheres, and study pilots read them
as ordinary nodes (T20A). Another consumer may want a different route color, so it is a choice,
not a default.

**Built.** graphty-element adds one additive method, `session.styles.setHighlightColor(color |
undefined)`: the color every highlight that names no style of its own is painted in (a route or
chosen set a finished run paints by itself, and `styles.highlight()` without `set`); undefined goes
back to indigo. A view setting: no history step, not saved, applies to highlights painted after
the call; it refuses a color a layer would not accept with `E_BAD_COMMAND`. The app sets black
(`APP_HIGHLIGHT_COLOR` in `graphty/src/constants/highlight.ts`) on the session in both element hosts
(`workspace/frame/ElementHost.tsx` and `components/Graphty.tsx`). Black measured on the app's
screenshots: route nodes Delta E 50 and 3.0:1 from the default nodes unranked, 44 to 50 over
PageRank; its cost is that black is also the seventh default group color. Tests: the element
default and `setHighlightColor` in `graphty-element/test/session/styles/StylesApi.test.ts`; the
app's route color on the real element in
`graphty/src/workspace/frame/__tests__/Workspace.real-element.test.tsx`. Checked on a fresh build
with the study tool: the T20A bus-stops route draws black and stands out
(`design/ui/studio/tmp/highlight-owner-decision/T20A/14.png`).

## 2026-10-08 -- For the owner: a selected edge is drawn with a solid blue band behind it

**What.** A selected edge used to be drawn with the node halo's settings: a gold band at 0.4
opacity, 2.9 line widths wide, over the line. It is now drawn with a solid band of Paul Tol's
blue `#0077BB`, five line widths wide, BEHIND the line, so the line keeps its own paint down the
middle and the band shows on both sides. A changed default appearance, so listed here; built on
the studio branch.

**Why.** On the dense Les Miserables drawing the 13 marked ties of the tier 2 study were thin
pale-gold lines that could not be told from the gray edges around them. Gold at 0.4 over the
background is 1.15:1; gold itself is 1.3:1 and sits next to the oranges of the default
measurement palette.

**Alternatives.** A new shared selection color for nodes and edges (changes every selected
node's halo too, and a blue halo is too close to the default indigo node); darkening the line
itself (tried before: it turned the configured gold into an olive nobody chose).

## 2026-10-08 -- Decided by the team: three edge settings on the selection style

`GraphSelectionStyle` gains `edgeColor` (default `#0077BB`), `edgeScale` (default 2.5: the band
is that many times twice the line width) and `edgeOpacity` (default 1), beside the node halo's
`color`, `scale` and `opacity`. Additive: optional fields with defaults, so every existing
selection style still parses. Flat rather than a nested `edge` object because
`graph.setSelectionStyle` merges one level deep, so a flat field set alone keeps the others.
Reason for separate settings: a see-through ring reads around a ball but vanishes beside a
one-pixel line, so one set of values cannot serve both. The graphty app's Highlight color control
still writes only the node halo's `color`; whether it should also write `edgeColor` is the app's
choice. Test: `test/browser/element-at.test.ts` (the band is solid, beside the line, and the line
keeps its paint), `test/catalog/default-palette-quality.test.ts`.

## 2026-10-08 -- Decided by the team: a left-out row's file line and end columns

**What.** Two optional fields, additive: `LeftOutEdge.line?: number`, the row's line in the file,
numbered as the import page already numbers it, and
`LoadedSource.leftOut.endColumns?: { source: string; target: string }`, the names of the columns
the load read the ends from. A project saved without them still opens.

**Why.** After Load the app showed a left-out row as "p11, p13, 6" with no column names and no
line, though the import page had shown "Line 24, from, to, emails" a moment before. The facts
existed during the load and were dropped; only the element has them.

## 2026-10-08 -- The left-out rows themselves: `LoadedSource.leftOut.edges` and `LeftOutEdge`

**What.** One optional field on `LoadedSource.leftOut`: `edges?: readonly LeftOutEdge[]`, the
first 100 edge rows the load left out, each as `{ source, target, values }` -- its two ends as the
load read them, and its other values by column (the end columns left out when they are plain
column names). `LeftOutEdge` is a new exported type of `./session`. Kept with the load, so it is
saved in the project file and moves with undo and redo; a project saved before has no `edges`
and still opens. Additive, not breaking.

Also, a behavior fix with no API change: a draft load whose mapping names its end columns
(`from`, `to`) now reports them as the load's endpoints (`LoadReport.endpoints`, `resolvedFrom:
"declared"`), so `attributes()` no longer lists those columns as edge attributes, as it never
listed `source` and `target`.

**Why.** The tier 2 pilots found that after Load the count of left-out rows was kept but the rows
were not: a reader who wanted to know which pass did not fit had to reopen the source file, which
an application can do only while it still holds the file (never after a save and reopen). With
the rows kept, the app lists "s04, s11, 3" under the source at any time. The end columns appeared
twice in an edge's values ("From Station" and "from Station") because the report named the
configured defaults instead of the columns the load read.

**Alternatives.** Keep every left-out row (unbounded growth of the saved file for a file that
mostly does not fit; 100 is enough to show and count). Keep the row as one record with its
original keys (the app could not tell which values are the ends, and their order is not the
file's). Leave the end columns as attributes and have the app hide columns whose role is source
or target (it would hide the defect: the element's report was wrong, and every consumer reading
`lastImport()` or `attributes()` would meet it).

## 2026-10-08 -- Export variants and the Graphty JSON format in the format catalog

**What.** Four additions to the format catalog (the `./catalog` and `./extend` entry points):

- `FormatDescriptor.exportVariants`, a new optional list of `FormatExportVariant` (`id`,
  `plainName`, `extensions`, `mimeTypes`, `preset`, `options`): one entry per kind of file a
  writer produces. `json` lists seven (Node-link JSON (NetworkX), Cytoscape.js JSON, JSON Graph
  Format, graphology JSON, vis.js JSON, d3 JSON, OBO Graphs JSON); `csv` lists three (CSV, Gephi
  CSV, Neo4j CSV). `preset` is the writer options that make that kind of file, passed to
  `exportGraph` unchanged; `options` is the writer options that still apply to it. Also a new
  optional `FormatDescriptor.description`.
- A new export-only format id, `graphty` (Graphty JSON, `.graphty.json`), added to
  `KNOWN_FORMAT_IDS`. `exportGraph("graphty")` writes the document `session.project.save()`
  produces without marking the project saved; it takes no options and loses nothing.
  `session.data.import` refuses it with `E_UNKNOWN_FORMAT`, and format detection never returns
  it: the file is read back by `session.project.open`.
- Writer enum choices carry real labels ("Cytoscape.js JSON", "Gephi (Source, Target, Type,
  Weight)", "Nodes and Relationships") instead of their raw values, and the CSV and Neo4j writer
  options state the defaults the writer applies (separator, line ending, header row, list
  separator).
- Every writer option except CSV's `table` and Neo4j's `part` is marked `advanced`, so a picker
  can fold it away. "Neutralise Formulas" reads "Neutralize Formulas".

Nothing is removed or renamed; the change is additive.

**Why.** A reader choosing how to save thinks in kinds of file ("a Cytoscape.js file", "a Gephi
CSV"), not in a format id plus a dialect option. Without variants, every consumer that offers an
export list has to know which dialect values exist, what to call them and which file ending each
one gets -- knowledge that lives in graph-io and belongs to the element, not to each app. Without
the `graphty` format, the one export that reads back exactly (styles, results, layout, notes)
could not be offered in the same list as the others.

**Alternatives.** Make each variant its own format id (`json-cytoscape`, `csv-gephi`): a flatter
list, but it multiplies ids that all share one writer and one reader, and import detection would
have to choose among them. Leave variants to the app: every consumer rebuilds the same table.
Make `graphty` importable through `data.import`: a project file holds far more than a graph, and
loading it as data would silently drop its styles and results. Leave the advanced flag off: a
form shows a dozen options for a simple save.

**Owner question.** Is `graphty` the right public id for the project file in the format list,
given that `data.import` refuses it? And should `KNOWN_FORMAT_IDS` hold an id that cannot be
imported, or should export-only ids be listed separately?

## 2026-10-07 -- Why a selector was refused, as a code: `E_BAD_SELECTOR` `details.reason`

**What.** Every `E_BAD_SELECTOR` refusal now carries `details.reason`, a stable code, beside the
existing `details.position` and the other details. An expression selector (also what
`select({ where })` and Find's `=` queries use) gives one of `unclosed-quote`,
`bare-word-needs-quotes`, `bad-quoted-name`, `unsupported-syntax`, `pipe-not-supported`,
`expression-reference-not-supported`, `number-needs-backticks`, `bad-character`, `dot-needs-name`,
`name-contains-dot`, `function-not-supported`, `unclosed-parenthesis`, `missing-operand`,
`not-needs-parentheses`, `trailing-input`, `quoted-whole-expression` or `reads-no-attribute`. A
selector of the wrong shape gives `bare-string`, `not-a-selector`, `where-missing`,
`has-path-missing`, `ids-not-a-list`, `not-an-id`, `top-path-not-a-result`, `top-n-not-whole`,
`bad-member-scope` or `unknown-kind`. One existing detail moves: a refused `member` selector used to
put the scope parser's own details under `details.reason`; they are now under `details.scope`. The
query language itself is unchanged. `weight > 3` is refused with `reason: "number-needs-backticks"`,
`position: 9`. The codes are documented on the error code and in the source, not exported as a type.

**Why.** The element returns facts and the app writes the words. Until now the only way for a
consumer to tell a reader what was wrong with a query was to parse the English message. The app's
Find box shows nothing at all for `=weight > 3` today (the refusal escapes as an uncaught error);
with a code it can say "put the 3 in backticks" in its own words.

**Alternatives.** Export the codes as a union type: a stronger contract, but every new refusal
would then be a type change; easy to add later. Keep only the message: every consumer parses
English. Use a separate error code per mistake: too many top-level codes for one kind of failure.

**Owner question.** Should the query language accept a bare number (`weight > 3`) instead of
refusing it and asking for backticks (`` weight > `3` ``)? JMESPath, which the language is a subset
of, does not, so accepting it would make an accepted selector mean something JMESPath would refuse;
but nearly every person who types a comparison writes the bare number first.

## 2026-10-07 -- Every run reads the loaded weight: `descriptor.weightMeaning` and one `weight` option

**What.** Every algorithm with a weighted form now reads the weight the graph was loaded with, unless
its run says otherwise. The catalog states, per algorithm, which meaning of weight it reads: new
field `AlgorithmDescriptor.weightMeaning`, `"strength"` (PageRank, Louvain, Leiden, label
propagation, Girvan-Newman, Markov and spectral clustering, min cut), `"distance"` (shortest path,
A*, all-pairs distance, Kruskal, Prim), `"capacity"` (max flow), or `null` (degree and every other
algorithm with no weighted form). Each algorithm that reads one takes one uniform `weight` option
(it appears in `descriptor.options`, type `attribute`, on edges): absent means the loaded weight,
`null` means unweighted, a column name or `{ attribute, meaning }` overrides it for that run.
A strength reader reads a strength or a weight nobody gave a meaning; a distance reader reads only
a distance; a capacity reader only a capacity. A weight of another meaning is left unread -- the run
counts edges -- and the run says so in a new caveat `caveats.weightSkipped`, a coded fact (new
exported type `WeightSkip`): `{ code: "weight.meaning-mismatch", params: { attribute, meaning,
reads } }`, where `meaning` is null when nobody said. `caveats.weight` now names the column the run
actually read (it was a hardcoded `"weight"` on thirteen algorithms, and `"capacity"` read as a
strength on max flow), or null. Breaking for PageRank: its default changes from unweighted to the
loaded weight, and its old `weight` option (a string, default null) becomes the uniform one, moved
to the end of its options. `WeightMeaning.meaning` gains `"capacity"` (recorded with the weight
meaning at load). On messages.csv (weight column `emails`, no meaning): PageRank and Louvain read
`emails` as a strength with no option; shortest path counts hops and reports
`weight.meaning-mismatch` naming `emails`; told `{ attribute: "emails", meaning: "distance" }`,
or loaded with that meaning, it reads it (p01 to p12 costs 6, not 1 hop).

**Why.** The owner's rule: every run uses the weight chosen at load. Before, community and path runs
read the loaded weights silently, PageRank ignored them unless told, and the same column was a
strength to Louvain and a distance to Dijkstra -- a graph fact the app would otherwise have to
decide per algorithm. Reading a similarity as a distance gives a wrong path, not a worse one, so the
element refuses that reading and says so instead of guessing.

**Alternatives.** Keep per-algorithm weight options: every consumer must learn which algorithm
takes which name. Convert a strength into a distance automatically: see the question below.
Refuse the run instead of counting hops: a reader asking "shortest path" on an email graph gets
nothing, where hops are a true answer the caveat qualifies. A plugin's descriptor states no
`weightMeaning` yet (its own `weights` declaration still applies); extending `defineAlgorithm` is
left for when a plugin needs the uniform option.

**Owner question.** A distance reader given a strength (emails, friendship strength) counts hops
today. Should it convert instead -- `1/w`, `1 - w` (for a weight in 0..1), or `-log w` (for a
probability) -- and if so, which, chosen by whom? This build counts hops and says so, because
any conversion silently picks one of three different answers.

## 2026-10-07 -- A filter on an edge attribute narrows the edges: `nodes: "all" | "ends"`

**What.** A `range` or `categories` rule (in `visibility.set`, a rule set or any rule tree) now
speaks about each half whose elements carry the attribute. Before, both always read nodes only, so
a rule on an edge column such as `{ kind: "range", attribute: "data.weight", min: 4 }` found no
node with a weight, hid every node, and with them every edge: 0 nodes and 0 edges. Now that rule
keeps the edges of weight 4 or more. Both leaves gain an optional field `nodes` (new exported type
`AttributeLeafNodes`): `"all"`, the default, says nothing about nodes, so every node stays (on the
friends sample: 20 nodes, 12 edges); `"ends"` keeps only the nodes at the ends of a kept edge (19
nodes, 12 edges). A rule on a column both halves carry narrows both; with `"ends"` a node must pass
and be an end. A column neither half carries still holds no node and is reported in
`unresolvedPaths`, as before. The value source a session builds gains an optional `halvesOf(path)`
on the exported `FilterValueSource`, so a rule asked about one element still reads one element.

**Why.** "Show only the strong friendships" is a tier 2 task, and the element's documented rule
model (each leaf speaks nodes, edges or both, and is silent about the rest) already covers it; the
two attribute leaves simply ignored the edge half. Readers ask two different questions of an edge
filter -- "which ties are strong, among everyone" and "who has a strong tie" -- and the second
cannot be built from the first without a neighborhood walk the app must not do, hence the option.

**Alternatives.** A new leaf kind (`edge-range`): a second spelling of the same rule, and every
consumer must pick the right one by knowing where a column lives. A required `on: "nodes" |
"edges"` field: explicit, but it breaks every stored rule and asks the consumer for a fact the
element already knows. Defaulting to `"ends"`: matches some readers' first guess, but contradicts
the documented silent-half rule and makes `any` / `all` groups with node leaves behave
surprisingly. Expressing "ends" as `{ any: [...] }` of an `edges` leaf and a neighborhood: not
possible today without listing seed nodes.

## 2026-10-07 -- A run goes out of date when its data changes, and says why: `StaleNote.reason`

**What.** `run.stale` (and `run.record.stale`) is no longer null after a load or an edit changes
the data the run read while its scope still holds the same nodes and edges. The note gains
`reason: "data-changed" | "scope-changed"` (new exported type `StaleReason`): `data-changed` when
the graph's node and edge records, endpoints or weights differ from when the run started (a
reload of the same people with new weights), `scope-changed` when the same data resolves to other
elements (a filter, the selection or a set changed). Data wins when both happened. The run record
carries the digest it compares, as a new optional field `scope.data` on `RunScopeRecord`, so a
saved project keeps it; a record without it (an older file) compares scopes only, as before.
Starting a run again under an id whose data changed now re-runs it instead of returning the old
result. A replacing load keeps runs, style layers and notes (checked; no change needed).

**Why.** Staleness compared the scope's membership only, so replacing a file with one holding the
same nodes and new weights left every PageRank, community and path run looking current while its
numbers described the old data. The tier 2 design shows such a run as out of date with a reason
the reader can act on ("the data changed" means re-run; "the filter changed" may be intended), and
the app must not compute that itself.

**Alternatives.** Compare an input counter instead of a content digest: cheaper, but reloading the
same file would mark every run out of date. Track only the columns a run read: exact, but the
element does not yet record which attributes an algorithm read (weight, node weight). Put the
digest inside the scope digest: the scope digest is documented as membership only, and merging
them loses the reason. Edge ids are left out of the digest, because the element assigns them per
load; an edge-metric run's values after a reload of the same file are therefore not flagged even
though they are keyed by the old edge ids (open).

## 2026-10-07 -- Filter steps: `visibility.steps` and `visibility.setSteps()`

**What.** The visibility filter can be an ordered list of steps `{ id, on, rule }` (new exported
type `FilterStep`; `rule` is the existing `RuleTree`). The steps that are on combine with AND, in
order, and with the existing single filter (`visibility.set`), which keeps working unchanged.
`session.visibility.steps` reads the list; `session.visibility.setSteps(steps)` replaces it and is
one undoable step (new op `visibility.steps` in `COMMANDS`). The step's history fact names what
changed by diffing the list: `visibility.step-add`, `-edit`, `-on`, `-off`, `-remove` with
`{ id }`, or `visibility.steps` with no params for a reorder or several changes at once.
`plan({ op: "visibility.steps", steps })` returns a new `PlanEffect` kind `"steps"`:
`{ start: { nodes, edges }, steps: [{ id, nodes, edges }] }`, the counts before the first step
and after each step that is on. The project file's `graphty-session` member saves `steps` beside
`filter` only when there are some, so a project without steps saves exactly as before; a step
that is off is saved and reopened off.

**Why.** The tier 2 design shows a filter as a list of steps a reader ticks on and off, each with
its own "n left" count. The element had one filter value: the app would have had to combine
rules itself, keep the unticked ones in its own state (lost on undo and on reopen) and count each
prefix itself, which is graph computation in the app.

**Alternatives.** Four verbs (`addStep`, `editStep`, `toggleStep`, `removeStep`): more surface for
the same thing, and a consumer editing a list in a form already holds the whole list. Fold steps
into the single filter as `{ kind: "all", of: [...] }`: loses which rules are off. Per-step counts
on `visibility.summary` (live, always computed): a pass per step on every change, paid by every
consumer; `plan` computes them only when asked. Not decided by the design and not built: OR or NOT
between steps (only AND), and merging a dragged step's edits into one history step (every call
is its own step; a consumer dragging a slider can wrap the drag in a transaction).

## 2026-10-07 -- Every load is kept as a source: `data.sources()`

**What.** `session.data.sources()` returns one entry per load still in the graph, oldest first:
the `DataSourceDescriptor` fields (`type`, `name`, `size`, `config`) plus `tables` (the names of
the tables the load read) and `added` (`{ nodes, edges }` it added). A replacing load resets the
list to itself; a `{ mode: "merge" }` load appends. The list is a graph value, so undo and redo
move it, and the project file's `graphty-data` member saves it as `sources` beside `source`
(an older file without it opens with an empty list). `data.source()` is unchanged and still
describes the last load; `renameSource` also renames the last entry. New exported type
`LoadedSource`; `data.import` commands carry an optional `tables`, `data.setSource` an optional
`sources`.

**Why.** Each load overwrote the graph's one source descriptor, so after adding messages.csv to
friends.csv the app could list only the last file (Sources showed one row, the header named the
last file). A consumer cannot rebuild the list itself without recounting what each load added.

**Alternatives.** Keep only `source()` and let the app keep its own list (state the app would
own, lost on undo and on reopen). Make `source()` return an array (breaking). Record the list in
the load report (`lastImport()` describes only the last load, and is not saved).

## 2026-10-07 -- Focusing the element focuses its drawing (`delegatesFocus`)

**Update 2026-10-21: the `render()` change is withdrawn, not deferred.** Changing what `render()`
returns is breaking, and the grouped major release is on hold, so `render()` is back to
`render(): Element` (it returns the graph container, as before). The element instead overrides the
protected `update` so Lit never renders the container, which keeps it where `connectedCallback`
put it and keeps the focus fix. Nothing about this waits for a major release. `delegatesFocus` is
unchanged and non-breaking.

**What.** `<graphty-element>`'s shadow root is now opened with `delegatesFocus: true`, so
`element.focus()` puts keyboard focus on the canvas inside it, and a dialog or menu that returns
focus to the element (as Mantine's do, to whatever had focus when they opened) lands on the
drawing. The API report gains `static shadowRootOptions: ShadowRootInit` on `Graphty`. With it,
`render()` now returns nothing instead of the graph container (`render(): unknown`, was
`render(): Element`): the container is already in the shadow root from `connectedCallback`, and
returning it made Lit move it on the first update, which took focus off the canvas when a page
focused the drawing as it mounted the element.

**Why.** The drawing stopped taking focus on its own (the canvas has no `autofocus`), so a page
must be able to hand focus to it after a graph opens, and a dialog opened from the drawing must be
able to give focus back. Without this, both dropped focus to the page body (WCAG 2.4.3): the host
has no tab stop of its own, so focusing it did nothing. A consumer cannot reach the canvas without
reaching into the shadow root.

**Alternatives.** A public `focusDrawing()` method (a second way to say `focus()`). Making the
host itself focusable with `tabindex` (two tab stops for one drawing, and the host is not what
takes keys). Leaving `render()` as it was and asking pages to wait for `updateComplete` before
focusing (every consumer would have to know about Lit's first update).

## 2026-10-07 -- A 2D camera's `zoom` is documented as relative to a half-width of 5 units

**What.** `CameraState.zoom` (2D) now has a doc comment: zoom 1 shows 5 world units either side
of `pan` across, zoom 2 shows half that, so a half-width of `h` units is `5 / h`. That is how
`setCameraState`, `getCameraState`, `setCameraZoom` and `zoomStep` have always read it. The
built-in `fitToGraph` view now answers in that unit too; it used to answer in pixels per world
unit, with the aspect ratio inverted, so in 2D Fit, Frame selection and `zoomToNodes` zoomed into
a single edge on any graph more than a few units across. The custom-cameras guide's 2D example
used the same wrong unit and is corrected. No exported name or type changes.

**Why.** The camera and the view disagreed about what the number meant, and nothing said which
was right. A third party writing a 2D camera view needs to know the unit.

**Alternatives.** Redefine `zoom` as pixels per world unit (changes what every saved camera
state and every `setCameraZoom` call means; a breaking change). Pass the half-width at zoom 1 to
a view in `CameraViewInput` (a new field for a number that never changes). Let a 2D view answer
with `orthoLeft`/`orthoRight` instead of a zoom (two ways to say one thing).

## 2026-10-07 -- The element's `aria-label` names its canvas

**What.** `<graphty-element>` now watches its own standard `aria-label` attribute and copies it onto
the canvas inside its shadow root, the one part of the element that takes keyboard focus; changing
or removing the attribute changes or removes the canvas's name. The attribute is a new entry in
`observedAttributes`, so the API report lists `observedAttributes` and `attributeChangedCallback`
on `Graphty`, and the generated JSX props gain `"aria-label"`. Two behavior changes ship with it
and add no API: the canvas no longer carries `autofocus`, so mounting the element never pulls the
page's focus into the drawing, and the browser's own focus ring is drawn just inside the canvas
(`outline-offset: -2px`), so a page that clips the box the element fills no longer hides it.

**Why.** The canvas is in every keyboard walk through a page, and a screen reader announced it as
"Canvas" with no name (WCAG 4.1.2); its focus ring was drawn outside its box and cut off by the
app's clipped canvas panel (WCAG 2.4.7). A consumer cannot reach into the shadow root to fix
either, and the words belong to the page, so the page's standard attribute is the door.

**Alternatives.** A new `canvas-label` attribute or property (a second, element-specific name for
what `aria-label` already means). `role="img"` plus a label on the host with the canvas taken out
of the tab order (the canvas's keyboard camera controls need focus). A built-in English default
name (the element would be writing words; the app owns them). A themable focus-ring color (a new
CSS variable; the browser's ring already meets the need).

## 2026-10-07 -- `catalog.optionsFor` lists the columns a grouping layout can group by

**What.** `session.catalog.optionsFor(key)` now fills `values` on a "partition" option on nodes
(the `groupBy` of the Rings by group, Two columns and Columns by group layouts: catalog ids
`shell`, `bipartite`, `layers`), as it already did for "node-id" and "node-set" options. There is
one choice per column that can group the nodes: each categorical node attribute (value: its
name, label: its `plainName`), then each finished run's categorical node field (value: its
`results.<run>.<field>` path, label: the run's label). Key and label columns, and any column with
a value per node, are left out. No exported name or type changes; a partition option that used to
come back without `values` now comes back with them. `layout.set` already accepted a run's path as
`groupBy`, so nothing else changed.

**Why.** After a community run, the graphty app kept the grouping layouts disabled with "Needs a
node attribute to group by", because the app decided which columns can group by reading only the
graph's attributes. Which columns can group a layout is a fact about the data, so the element
answers it, run results included, and the app shows the element's list.

**Alternatives.** A new method such as `data.groupings()` (a new exported name for one question
`optionsFor` already exists to answer). Leave the decision in the app and add run results there
(graph logic in the app, which a third-party consumer would have to rewrite). Fill `values` for
every "attribute" option too (no consumer needs it yet).

## 2026-10-06 -- An export writes a partition's group as its rank, not the algorithm's group id

**What.** When a community-detection result (Louvain, label propagation, connected components and
the other "community"-shaped results) is exported, the `results.<run>.group` column now holds the
group's rank by size -- 1 for the largest group, ties ordered by group id -- instead of the
algorithm's own group id, and the graph-level `results.<run>.sizes` table's `group` values are
the same ranks. Every export format gets this, CSV first among them. No exported name or type
changes, and the live result (`session.results.get(run)`) still carries the algorithm's ids;
only what a file holds changes. Files exported earlier keep their old numbers, so a reader who
compares an old file with a new one sees different group numbers for the same partition.

**Why.** The run summary, the legend and the data page all name a group by this rank ("Group 2,
17 members"), while the CSV wrote the raw id ("5"). A report writer could not join the exported
table to the picture or the legend. The algorithm's ids carry no meaning of their own, so the rank
loses nothing a reader could use.

**Alternatives.** Keep the raw id and add a second column, `results.<run>.groupRank` (two
numbers for one group, and the one a reader sees first is still the wrong one). Write the
app's words ("Group 2") into the cell (the element would be writing English; the app owns the
words). Leave the file alone and have the app relabel the legend with raw ids (the summary's
largest-first numbering is what makes "Group 1" mean something).

## 2026-10-06 -- The force layout's seed default is `null` again (no change from master)

**What.** The studio branch had changed the published default of the default force layout's
`seed` option (`ngraph`, catalog id `force`) from `null` to `1`, and seeded that layout by default
on both of its drivers (the processor and an attached accelerator). That change is undone: the
option's default is `null` again, the default force layout starts from ngraph's own placement, and
the element exports no default-seed constant. The published contract is master's again, so there
is nothing to approve; it is listed because the held pull request that seeded the default (issue
#801) must not land as it stands. The random layout keeps the default seed of `1` it already had on
master.

**Why.** The owner decided on 2026-10-06 that graphty-element imposes no default layout seed: a
consumer that wants the same drawing every load passes a seed. The graphty app does so: it
declares the force layout with seed 1 on the element's tag, so every project starts seeded (as
where the project starts, not an undoable step), and it passes the same seed with every method the
reader picks in the Layout group.

**Alternatives.** Keep the element's default seed (the reverted change; overruled by the owner).
Give the random layout no default seed either (would make the element's own "same every time"
recommendation for large graphs untrue unless a consumer passes a seed; not asked for).

## 2026-10-06 -- `captureScreenshot({ legend })`: a key drawn into the exported image

**What.** `ScreenshotOptions` gains one optional field, `legend?: readonly
ScreenshotLegendSection[]`, and the root entry point exports one new type:

```ts
interface ScreenshotLegendSection {
    title: string;
    rows?: readonly { label: string; color?: string; value?: string }[];
    ramp?: { min: string; max: string; colors?: readonly string[] }; // no colors: a size wedge
    note?: string;
}
```

When the field holds sections, the element draws them as a light card at the image's top left,
sized as it would be on the canvas (it scales with the 2x and 4x sizes), after any supersampling
and before the download or the clipboard write. Absent or empty, nothing changes. Not breaking.

**Why.** An exported picture had no key, so a reader of the report could not tell what the colors
or sizes meant (issue #133). The image is drawn by the element, and the clipboard copy has to be
started from the element's own capture, so only the element can put the key into the file. The
element draws exactly the words it is given: the app builds the sections from the same
`styles.legend()` blocks and the same words as its legend card, and passes them only while the
card is shown, so there is one legend switch and no export-only option.

**Alternatives considered.**

- `legend: true`, with the element writing the section titles itself from `styles.legend()`.
  Simpler for a consumer, but the element would write reader-facing words ("Color: PageRank"),
  which the presentation-neutral rule forbids.
- The app composites its own card onto the returned image. Breaks the clipboard path (the copy
  must start inside the capture to keep the browser's user gesture) and leaves every other
  consumer without a key.
- Accept a rendered image (a canvas or bitmap of the consumer's own legend) and only place it.
  Most flexible, but a consumer must render HTML to a bitmap, which browsers do not offer simply.

**Open points for the owner.** The field and type names; whether the card's place (top left) or
its look (light card, system font) should be options -- today they are fixed.

## 2026-10-06 -- An undirected graph draws its edges without arrowheads

**What.** graphty-element's default edge look now depends on the graph: an edge of a directed graph
draws a `normal` arrowhead as before, and an edge of an undirected graph draws none. A style layer
that sets the arrowhead type still wins either way (a reader can put arrows on an undirected graph,
or take them off a directed one). The exported `defaultEdgeStyle` object no longer carries an
`arrowHead` entry (its type is unchanged), and the `edge.arrowHead` channel descriptor's default is
stated as `"normal"`, the head a directed graph draws. The element's own "Edge defaults" layer no
longer writes the arrowhead type; the renderer adds the head when the graph is directed. Not a type
change; a change to the default picture. One new public read: `DataManager.directed` (a boolean
getter) that the renderer uses to decide; it is in the graphty-element API report.

**Why.** Every sample in the app is undirected (marriages, shared chapters, club ties, games) and
was drawn with arrows while the Graph panel said "Undirected". Arrows on a graph whose ties have no
direction invite a wrong reading: asked whether one node can reach another, a reader follows the
arrows and answers "no".

**Alternatives considered.**

- Leave the default and have the app add a "no arrows" layer on undirected graphs. An app
  workaround: every other consumer would still draw arrows on undirected graphs, and the layer
  would sit in the reader's layer list as something they did not add.
- Keep the arrowhead in the element's "Edge defaults" layer and rewrite that layer whenever the
  graph's direction changes. The layer is part of the undo baseline, so undo would bring back the
  old direction's arrows.
- A new arrow type such as `"auto"`. Adds a public enum value that every style editor and every
  saved style would have to understand.

**Open points for the owner.** Whether `explain()` and the layer list should name the arrowhead a
directed graph draws (today they do not list it, since no layer writes it).

## 2026-10-07 -- A covered legend block is left out by the app (no change from master)

**What.** The studio branch had changed `styles.legend()` to stop returning a block whose channel
a higher, enabled layer paints on every element the block's layer reaches. That change is undone:
the element returns master's contract again, where such a block is still returned and carries the
neutral fact `{ code: "legend.painted-over", params: { layerId, name } }` in `facts`. The graphty
app leaves every block carrying that fact out of its legend card and out of the key drawn into an
exported image. The published contract is master's, so there is nothing to approve.

**Why.** After Degree and then Louvain, every node shows its group color, and a "Color:
Connections" key for paint no node shows is a false claim. Master now reports the cover as a coded
fact, which is the option this entry used to list as the alternative: the element states the fact,
and each consumer decides what to show. A layer panel that wants to grey a covered layer can read
the same fact.

**Alternatives.** Keep the branch's element change and drop covered blocks inside the element
(changes what an existing call returns, and hides the fact from a consumer that wants to show it).

## 2026-10-07 -- A history code for moving a run's layers: `algo.move`

**What.** `HistoryCode` gains one member, `"algo.move"`, with the params `run` (the run's id) and
`algorithm` (its algorithm, or null when unknown) -- the same params as `algo.remove`. It is the
fact on the history step the `algo.move` command records (`session.runs.move(id, before)`, which
moves a run's style layers in the stack). Not breaking: the type documents that new codes may be
added in a minor release.

**Why.** Every history step now carries a coded fact, and the app words each code itself. The
studio branch's `algo.move` command predates that rule and had no code; without one the step
could only be worded from a generic code.

**Alternatives.** Record it as `style.move-layer` (that code names one layer, and a run moves
several); record it as the generic `transaction` (the app could not say what moved).

## 2026-10-07 -- A GraphML or GEXF file that breaks off is refused, not loaded in part

**What.** Master (issue #1218) and the studio branch settled the same defect two opposite ways. On
master, a recognisable GraphML or GEXF file that breaks off -- a stray end tag, a tag or quote left
open, garbage after the last tag, a file cut off mid-tag -- keeps every node and edge read before
the break, and `LoadReport.errors` gets a `"parse-error"` entry with the line. On the studio branch
the load is refused with `E_PARSE_FAILED`, with the line in `details.line`, and nothing is added.
The merged branch keeps the refusal. `LoadReport.errors` stays as master built it for everything
else (a CSV row a reader skipped, a refused row); a broken GraphML or GEXF file just never reaches
it. The data sources and load preview guides and the `LoadReport` documentation say so. No type
changes; a change in what an existing call does compared with master.

**Why.** A graph built from part of a file looks like a whole one. In the study, a reader handed
a GraphML file cut at 55% saw 5 nodes and 0 edges and no sign of trouble; with the refusal, the
broken-file task passed in every round. Master's report entry only helps a consumer that knows to
read `lastImport().errors` after a load that appeared to succeed, and the graphty app does not read
it today. GML, DOT and Pajek already refuse a file that cannot be read whole, so the refusal also
makes every graph format behave the same way.

**Alternatives.** Keep master's partial load and have the app read `lastImport().errors` and warn
(every other consumer still gets a partial graph by default). Add a load option such as
`partial: "keep" | "refuse"` (new public API; the default still has to be chosen).

## 2026-10-07 -- "Fit to graph" can keep the current angle: `keepAngle`

**What.** The built-in camera view `fitToGraph` declares one option, `keepAngle` (boolean, default
false), in its catalog descriptor. With it on, in 3D the view frames every node from the direction
the camera looks from now -- the pivot rotation, roll included, is kept and only the target and the
distance change -- instead of jumping to the fixed diagonal. It has no effect in 2D. The screenshot
option `camera` also accepts `{ preset, params }`, so a capture can pass a named view's options:
`captureScreenshot({ camera: { preset: "fitToGraph", params: { keepAngle: true } } })`. The graphty
app asks for it when the Export dialog's View is "Whole graph". The distance puts every corner of the
graph's box, padded 10 percent, inside the narrower field of view, so every node is in shot from
any angle. Without the option every number is unchanged to the digit, so no saved picture moves.

**Why.** "Whole graph" in 3D exported a picture turned to an angle the reader never chose, with a
quarter of it empty: the drawing on screen and the drawing in the file did not match. A third-party
consumer exporting "everything, as I see it" had no way to ask for it except computing the camera
itself, which is graph functionality the element owns.

**Alternatives.** A new built-in view, such as `fitFromHere` (a second name for nearly the same
rule, and one more entry in every picker). Change `fitToGraph` to always keep the angle (moves every
saved picture and every "Fit" press). Have the app compute the camera from the bounds (a workaround
of exactly the kind the repository forbids). Name the option differently (`fromCurrent`,
`preserveDirection`).

## 2026-10-07 -- A capture can leave the selection highlight out: `showSelection`

**What.** `ScreenshotOptions` gains `showSelection?: boolean`, default `true` (the image shows what
the canvas shows, as before). With `false`, the selection halo is left out of that one capture
only: the selection itself does not change, no `selection-changed` event fires, and the halo is
drawn again when the capture ends, whether it succeeded or failed. `UpdateManager` (exported from
the main entry) also gains `meshesShownOrHidden()`, which tells the next frame to re-read what is
drawn instead of drawing its frozen list; the capture needs it, because a hidden halo otherwise
stays on screen. The graphty app passes `false`
for every image export and its preview; the Export dialog gets no new control.

**Why.** A node selected before exporting kept its yellow ring in the file, and the ring tinted the
node off its key color, so the picture said something the data did not. Whether a picture shows
the selection is a consumer's choice, so it is an option with a neutral default rather than a
change of behavior. Clearing the selection around the capture would have fired two selection
events and made every consumer restore it.

**Alternatives.** Change the default to leave the selection out (moves every existing caller's
picture). A broader option such as `overlays: false` that also hides context points (nothing asks
for that yet). Name it `hideSelection` or `selection` (`selection: false` reads as "no selection",
not "not drawn"). Have the app deselect and reselect around the export (a workaround that fires
events and loses a multi-node selection).

## 2026-10-07 -- Margins a fit keeps clear: `viewInsets`

**What.** `<graphty-element>` gains a property `viewInsets` (`{ top?, right?, bottom?, left? }` in
CSS pixels, type `ViewInsets`, exported from the root and from `./extend`): the margins of the
canvas that something laid over it covers, such as a key or a toolbar. Every fit keeps the nodes
out of them -- the element's own framing after a load or a layout change, `zoomToFit()`, and the
built-in `fitToGraph` view (so Fit, Frame selection and `zoomToNodes` too). In 3D the camera is
also shifted sideways so the point it orbits sits at the center of the free part, and stays there
while the reader turns and zooms. Changing the insets refits when `autoFrame` is on. A side left
out, negative or not finite is 0; the getter returns every side. `Graph` gains `getViewInsets()`
and `setViewInsets()`, and `CameraViewInput` gains `insets` (the same margins in device pixels,
like `viewport`), so a third-party camera view can honor them too. A capture that draws a key
(`captureScreenshot({ legend, camera: { preset } })`) reserves the key's own measured box on top
of the screen's insets, on the side that costs less, and gives the screen its insets back after.
A preference of the view: not saved in a project file, records no undo step. With no insets
every number is unchanged, so no saved picture moves.

The graphty app's legend card reports its own box (to the right of a tall card, below a wide one,
plus a 12 px gap) on mount, on every resize of the card or the canvas, and clears it when the card
goes.

**Why.** The key card covered the Pazzi family completely on Florentine families after any run,
and the camera never refit around it; the same card was drawn into exported pictures. Where a
node lands on screen is the element's to decide, and an app cannot keep a node out from under its
own chrome without computing the camera itself.

**Alternatives.** Grow an existing option: none takes a margin (`autoFrame` is a boolean,
`startingCameraDistance` a distance), and a padding percentage on the fit cannot be one-sided. A
rectangle to avoid instead of per-side margins (the element would have to choose a side; margins
are the shape map libraries use for the same job). Move the card (the canvas has no free corner on
a graph that fills it). Shrink the graph symmetrically in 3D instead of shifting the camera (wastes
the free side; no new behavior to explain). Name it `fitPadding` or `padding`.

**Known limit.** A "Current view" export keeps the screen's camera, so it is protected by the
screen's insets only; the exported key is drawn at the top left in its own size, which is smaller
than the app's card in practice but is not checked.

## 2026-10-07 -- Why something cannot run, as a code: `CostEstimate.refusal`

**What.** `CostEstimate` (what `session.estimate()` returns, and the `cost` of a plan) gains
`refusal?: CodedFact<EstimateRefusalCode>`, present exactly when `available` is false: a code and
its values, with no words. `EstimateRefusalCode` is a new exported type in `./session`, a union of
16 codes: `layout.not-planar`, `layout.needs-node`, `layout.node-missing`,
`layout.needs-grouping`, `layout.grouping-absent`, `layout.needs-two-groups`, `layout.unknown`,
`layout.needs-accelerator`, `algorithm.unknown`, `algorithm.needs-directed`,
`algorithm.needs-undirected`, `algorithm.needs-weighted`, `algorithm.needs-connected`,
`algorithm.needs-accelerator`, `estimate.not-costed` and `estimate.scope-unresolved`. Each
code's values are documented on the type: the layout id, the option name, the node, the grouping
attribute, the run that made that attribute (its run id, or null for a data column), the number
of groups or pieces, the engine. `reason` keeps its English sentence unchanged and is marked
`@deprecated` (removed at the next major). The graphty app now words every layout refusal itself
(`graphty/src/workspace/layout/refusalWords.ts`), naming a run's grouping by the run's name and
the community algorithm by the app's name for it.

**Why.** Refused layouts reached the screen in the element's English: 'the layout "planar" cannot
draw this graph without crossings: G is not planar.', and a raw field path such as
`results.louvain.group` for Two columns after a community run. The element must return neutral
facts and the app must write the words; the app cannot reword a sentence without parsing it.

**Alternatives.** A code on layout estimates only, named `LayoutRefusalCode` (but `CostEstimate`
is shared with algorithm runs, whose refusals are English too, and one field with two meanings is
harder to document). The `GraphtyErrorCode` already on a plan's `blocked` (too coarse: every
layout refusal is `E_OPTION_RANGE`). Codes without a namespace prefix (the legend facts use
`legend.*`, so this follows them). Removing `reason` now (a breaking change; it waits for the next
major).

**Known limits.** `MetricAvailability.reason` (from `catalog.metrics()`) still passes the English
sentence on; it has no coded refusal yet. The app's Analyze popover still shows algorithm
refusals in the element's words: the codes exist now, the app's words for them do not. The
inspector's Method select disables a layout that cannot run but does not say why (the Layout
popover does).

## 2026-10-07 -- Node size that ignores depth: `layoutBehavior.node.depthIndependentSize`

**What.** A new optional field in graphty-element's layout behavior (the `layoutBehavior`
property, `GraphBehaviorConfig`): `node.depthIndependentSize`, a boolean, unset (off) by default.
On, in the 3D orbit view, every node is drawn at the size it would have at the depth of the point
the camera turns about, so two drawn sizes compare as the two sizes the style gave them, at any
angle. Zooming still scales everything; the 2D view and an XR session ignore it. Edges and arrows
stop at the redrawn surfaces, and labels follow their node. The graphty app turns it on while a
node size is bound to data (a `node.size` legend block that reads a field) and off otherwise.

**Why.** On the running club with size bound to PageRank, Ava (0.06423) was drawn larger than
Farah (0.06608) in the default 3D view, and a study participant named Ava the most influential
person. The style sizes were right for every pair; the perspective camera divided each by its
depth, Farah sat 16% deeper while her size was only 6% larger, and 20 of 190 pairs were drawn in
the wrong order (trace: `design/ui/studio/next-steps/traces/3d-size.md`). With the option on,
0 of 190 pairs are inverted at both orbit angles and Farah is drawn larger on screen and in the
exported picture.

**Alternatives.** On by default (it changes every existing 3D picture, and a reader exploring a
space expects nearer things to look bigger: a consumer's choice, so off). Turning it on inside the
element whenever a size is bound (an opinion about presentation the element should not hold). A
camera option instead of a node behavior (the effect is on node meshes, not the view). A fixed
pixel size that ignores zoom too (loses zoom). Pushing the camera back (only shrinks the error),
hiding sizes in 3D, or a warning in the app (rejected by the studio).

**Known limits.** It costs a pass over the nodes on every frame while on, and re-trims every edge
whenever a node's scale changes (each orbit drag), which may show on very large graphs.

## 2026-10-07 -- A weight's meaning chosen at load: `TableMapping.weightMeaning` and `loadedWeight()`

**What.** Four additions to graphty-element's public API, none breaking:

- `TableMapping.weightMeaning` (the load mapping an edge table takes in `session.data.import` and
  `LoadDraft.load`): `"strength"`, `"distance"`, `"capacity"` or `null`. Refused on a node table
  or for any other word (`E_BAD_COMMAND`).
- `data.knownFields.edgeWeightMeaning` in the config, default `null`, written by a load that names
  a weight or a meaning. Being config, it is saved in the project file and undo and redo move it.
  A load that names a weight but no meaning writes `null`, so an earlier file's meaning never
  describes a new weight.
- `WeightMeaning.meaning` (the caveat on a run and a neighbor page) grows from
  `"distance" | "strength"` to also take `"capacity"`. Marked as an open union.
- `session.data.loadedWeight()`: `{ attribute, meaning }` for the weight the last load read
  (`meaning` null when none was chosen), or `null` when the last load read no weight. New type
  `LoadedWeight`.

**Why.** One weight column is read as "strength" by community detection and as "distance" by
shortest paths (tier 2 audit), because nothing records what the number means. Tier 2 lets the
reader say it once, when loading, and every run and every screen has to read the same answer.
This change records the answer and exposes it; making each run use it is separate work.

**Alternatives.** A `{ column, meaning }` object as the `weight` role, like `source` and
`target` take `{ column }` (every reader of `weight` as a string would change). Keeping the
meaning in the load report (not certainly saved or undone the way config is). A separate graph
value (a new command and save format for one field). Renaming `WeightMeaning` (asked not to).

**Known limits.** A load with no mapping at all leaves the last meaning in place; the attribute
comes from the last load's report, so the pair can only disagree if a load without a mapping
reads a different weight column. Runs still choose their own meaning.

## 2026-10-07 -- Each load keeps the edge rows it left out: `LoadedSource.leftOut`

**What.** One optional field on `LoadedSource`, the entry `session.data.sources()` returns for
each load still in the graph: `leftOut?: { rows, values }`. `rows` is how many edge rows the load
left out because they named a node no node row held (`unmatched: "leave-out"`), and `values` how
many distinct such names, counted exactly as `LoadReport.unmatched`. Present only when the load
left at least one row out; a load that left nothing out, or that added unmatched rows as new
nodes, has no such field. It is part of the entry, so it is saved in the project file and undo and
redo move it with the load. Additive, not breaking.

**Why.** After a load that leaves rows out, nothing says so once the load report closes:
`sources()` holds only names, tables and added counts, and `lastImport()` is replaced by the next
load. A tier 2 participant who loaded players.csv and passes.csv could name the left-out pass
(line 17, a player not in players.csv) only by comparing 17 edges with the file's 18 rows. With
the count kept on the source, the app can say "1 row left out" under that source at any time.

**Alternatives.** Keep the whole `LoadReport` on each source (much larger, and most of it, such as
repeated-edge counts and errors, has no reader after the load; it would also freeze the report's
shape into the project file format). Keep the left-out rows themselves, with their lines and
values (the reader could see which row, not just how many, but it grows the saved file with data
the graph does not hold; can be added later as a separate field). Always present with zeros
(every saved source would carry a field that is almost always empty). Name it `unmatched` like
the report (it would then suggest rows that were added, which this does not count).

## 2026-10-09 -- For the owner: what an edge's line width measures

**What.** Not done; a question. A solid edge's `line.width` of W, drawn d units from the camera,
is 10 x W / d pixels thick, at every width and distance (measured by
`graphty-element/test/browser/edge-width-units.test.ts`). The line tapers with distance like the
nodes do, and the width is pixels only at distance 10. On a graph framed from 50 units away the
default width of 8 draws under 2 pixels, and three tier 2 participants read "8" as broken. Two
ways to make the number readable, both breaking: draw the width in screen pixels whatever the
distance (every line on every graph changes thickness, and lines stop tapering), or keep the
taper and change the default and the documented unit. Either changes what an existing setting
does, so neither goes in before the owner decides; the study app does not shrink or scale widths
to hide it.

**Why.** Code comments in `EdgeMesh.ts` and `CustomLineRenderer.ts` call the width pixels, which
it is not, and the app's Width control shows the bare number with no unit.
