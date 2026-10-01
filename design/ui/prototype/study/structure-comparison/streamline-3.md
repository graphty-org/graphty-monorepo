# Streamlining refined B: every adopted change, by screen

The owner's third review (2026-09-30) asked the studio to go through every screen, component and
interaction and decide what to simplify, refine and polish, and where interaction patterns can be
the same. This page lists every change the studio adopted, grouped by screen, each with its
reason. All are studio decisions, reversible with an edit, except the two marked **Owner**. The
specification that carries them is `structure-b-refined.md` (version 3); the answers to the
owner's ten questions are in `owner-questions-3.md`.

A change "for the user-test build" means it is hidden when the review bar's "Hide design notes"
is on; the owner reviews with notes showing.

---

## Shared patterns (apply on every screen)

- **One tooltip component replaces every native `title`** -- name plus key, 500 ms on hover,
  immediate on focus and between neighbors, Esc dismisses, long press on touch. Reason: native
  titles cannot be timed, styled or reached by keyboard (Owner: toolbar tooltips after a delay).
- **Tooltip text is the name and key only**; a second line only for a disabled reason or a
  modifier gesture. Reason: tooltips that listed whole menus or explained in paragraphs.
- **Nothing needed to finish a task lives only in a tooltip.** Reason: touch and screen-reader users.
- **Three surfaces, one rule each**: dark menus choose a command or one item (no title); light
  popovers edit a value (title, X, apply live); modals take over the screen or confirm what cannot
  be undone. Reason: value pickers were drawn dark and light with no rule.
- **Popovers apply each change live and close on Esc or a click outside**; a footer button only
  when the popover creates something. Reason: four different commit styles.
- **Every popover opens beside its anchor through one helper** and returns focus to the control
  that opened it without redrawing the panel. Reason: lost focus and two placement methods.
- **No accordions in anything editable**; read-only blocks collapse with a one-line summary,
  remembered per kind. Reason: owner's lean to popovers; five disclosure mechanisms in one tab.
- **"+" in the header of the list or section it adds to**, nowhere else; foot buttons go. Reason:
  three ways to add in one panel.
- **Create first, then name in place**: a new thing gets a default name and opens into rename.
  Reason: three naming popovers each with their own error state.
- **Rename is double-click or F2 everywhere**, including the project name and source rows. A name
  that cannot change ignores the double-click and gives its reason in the tooltip. Reason: three
  refusal styles; F2 dead on the project name.
- **Delete acts at once and shows the Undo notice**; only Forget all keys asks first. Clear graph
  data and a layout change are single steps in graphty-element's undo history (`session.undo`).
  Reason: undoable actions asked, irreversible ones did not.
- **One notice**: centered above the lowest bar, 6 s, paused on hover, one action (Undo). Reason:
  seven placements and two styles.
- **Two-state commands swap their label** (Pin / Unpin, Lock / Unlock, Hide in list / Show in
  list); both show only for a mixed selection. Reason: inconsistent toggle labels.
- **An ellipsis only on a command that asks for more input before it acts.** Reason: used at random.
- **Eye = drawn; checkbox = applies or membership; switch = Settings only.** Reason: one mark,
  one meaning; the owner decided the eye only stops drawing.
- **Segmented control for 2 to 4 short options, dropdown for 5 or more**, System first where it
  appears; every segmented control and single-select list is one Tab stop with arrow keys.
- **One menu keyboard model** (arrows, Home, End, typeahead, Right opens a submenu, Esc closes one
  level and returns focus; hover opens a submenu after 200 ms). Reason: three menu behaviors.
- **Menus are one line per item**; the second line only says why an item is disabled; item
  explanations move to the tooltip. Reason: menus doubled in height.
- **Disabled = grayed, `aria-disabled`, still focusable, reason in the tooltip.** Reason: four
  disabled patterns.
- **Items that need graphty-element are hidden from menus in the user-test build.** Reason: about
  a dozen dead entries taught participants that menus are full of traps.
- **One annotation style** for "Open question" and "needs graphty-element", outside the control
  it describes. Reason: six styles, one of which looked like a real tooltip.
- **Empty state = one gray line naming what goes here, with the add verb as a link.** Reason:
  pseudo-rows, buttons and footnotes in empty states.
- **Blue fill = the active state of a toggle; gray fill = its flyout or popover is open.** Reason:
  Analyze looked like a second active mode.
- **Focus ring only on `:focus-visible`**, and initial focus goes to what the state opened.
  Reason: stray rings on the Camera face and Export's Image entry.
- **One icon per meaning**: bookmark = views; circle-check = sets (Create set adds a plus); layers
  = community runs; list = legend; message-square = notes (rail too); funnel = data filters only;
  ellipsis = list options; arrow-left-right = swap sides; cube and square = view mode.
  Reason: icon-only bars need unambiguous icons.
- **One field-row grid**: label column 88 px in the inspector, 96 px in popovers, 24 px rows,
  labels top-aligned. Reason: five label widths and truncated labels.
- **American spelling and one vocabulary per concept** ("view", "Frame selection", "Run as copy",
  "Show hidden elements"). Reason: one command with several names.

## Toolbar and canvas

- **Owner: icons only, tooltips after a delay.** 32 px buttons.
- **The toolbar is Analyze | Layout, View, Legend | Quick actions.** Reason: one place for every
  command that acts on the canvas as a whole.
- **Select removed** until lasso ships. Reason: always pressed, so it told the reader nothing.
- **Layout button replaces the layout chip**; its icon is its state (pause while running, play
  when paused or settled); no spin under reduced motion; state changes announced. Reason: pause
  is wanted mid-motion in a fixed place.
- **Re-run layout stays in the canvas menu and Quick actions.** Reason: a status icon should only
  pause and resume, never rearrange.
- **View replaces View mode and the Camera menu**: one flyout, frequent camera commands first,
  modes last; one click target (no split face). Reason: both answer "how am I looking"; two targets
  a few pixels apart did different things.
- **Legend becomes a toggle button**; the Legend chip and the card's own X go; open by default,
  remembered per project, never opened or closed by a hidden rule. Reason: one door whose pressed
  state is always true.
- **The canvas "?" button goes**; ? and Help > Keyboard shortcuts remain. Reason: fourth door.
- **The canvas carries no controls**: drawing, legend card, state cards only. Reason: four
  floating controls in three corners, each drawn differently.
- **Settings > Appearance > Toolbar labels, the labels-hidden state and its CSS removed.** Reason:
  nothing left to control.
- **Analyze, View and Quick actions use `aria-haspopup`/`aria-expanded`; only Legend is
  `aria-pressed`; Layout swaps its name.** Reason: popover buttons announced as toggles.
- **Every toolbar button except Quick actions is disabled with "Nothing is drawn"** while a state
  card shows. Reason: live controls over an empty canvas.
- **Headset hand menu keeps text labels and loses Select.** Reason: no reliable hover with a ray;
  Select did nothing there.

## View flyout (was the Camera menu)

- **Contents**: Fit 0, Frame selection F; Standard views (3D only); Your views, Save view;
  Switch to 2D (or 3D) 5, Enter VR, Enter AR. Reason: frequency order.
- **Reset camera and Shift+0 removed.** Reason: Fit and Front cover it.
- **Export image and Record video removed.** Reason: Export is their home.
- **One noun, "view"**: Save view, Standard views, Your views. Reason: four nouns for one thing.
- **"moved" and "Unsaved view" removed**; the View tooltip names a view only while the camera is
  exactly on it. Reason: system words the reader never chose.
- **The save-view popover, its name-taken state and its toast removed**: Save view opens the
  Views place with the new row in rename. Reason: create-then-name.
- **2D items lose their second lines**; a 3D view in 2D shows a "3D" tag. Reason: menu twice as
  tall for no information.
- **Flyout opens with focus on the first item; 2D and 3D are one two-state line, "Switch to 2D
  5" or "Switch to 3D  5"; the View tooltip has no key chip.** Reason: the key appeared to jump
  between rows, and "View: Front  5" read as though Front's key were 5 (it is 1).

## Selection bar and paths

- **Icon-only, same buttons and tooltip as the toolbar.** Reason: two stacked bars must follow one rule.
- **"Analyze these..." removed**; the toolbar's Analyze takes the selection as its scope and says
  so in its first line. Reason: two Analyze buttons 8 px apart.
- **"Steps away" folded into Neighborhood** as "Add as steps". Reason: two verbs for one idea.
- **One Path popover** opened by the selection bar's Path between, P, and Analyze > Find paths;
  From and To filled from the selection or picked on the canvas. Reason: two complete interfaces
  for one job.
- **Path pick mode, its bar and its six states deleted.** Reason: replaced by the popover.
- **Path between asks only Shortest path**; Most flow and Weakest cut stay in Analyze. Reason:
  specialist questions doubled the popover.
- **Direction is hidden on an undirected graph; one vocabulary** (Out, In, Both for neighborhoods;
  Follow edges, Either way for paths). Reason: grayed options that explained themselves only on click.
- **Weight is one dropdown everywhere**, with its meaning as a two-option segmented control.
  Reason: three weight controls.
- **Popovers lose Done and Cancel** (Esc, X or outside click close). Reason: two controls for one act.
- **Create set uses circle-check with a plus; Hide on canvas uses eye-off.** Reason: icon clashes.
- **Results confirm by the selected row and the inspector only**; the notice keeps just Undo.
  Reason: a path result was confirmed four times.

## Canvas states and legend

- **One state card**: icon and title, one sentence, at most one primary and one secondary button.
  Reason: four layouts and button orders.
- **Loading: one progress bar with a running count; the inspector shows "Reading..."**; the
  Drawing step waits for an element event. Reason: finished statistics shown during a load.
- **Refused too large: "Choose another file..." plus Details**; the disabled "Filter at import"
  button goes. Reason: a disabled primary button first in the card.
- **GPU lost: one sentence and Restart viewer**; the run's error lives only on its row. Reason:
  the same failure shown three times.
- **Selection is full: one notice, one state.** Reason: two copies in two sections.
- **Dataset fixtures leave the canvas state list.** Reason: they suggested modes the canvas lacks.
- **Hidden-on-canvas is reported in the tree's footer line** ("4 nodes hidden on canvas. Select,
  Show"), not in the legend. Reason: it vanished when the legend was closed.
- **"Everything is hidden" is explained once, in the tree footer**; the legend lists only what
  paints. Reason: explained twice; "Group color group" read as a typo.
- **Legend titles read "<Property>: <row>"; overflow reads "28 more communities" everywhere.**
  Reason: four title forms, three overflow wordings.
- **Fix: the legend's rows printed "[object HTMLDivElement]"** on the transfers communities state.

## Graph place (the tree)

- **The "Graph" heading goes**; the graph switcher is the panel's title line, with a quiet
  "Graph" prefix. Reason: two title lines; the switcher read as a second project.
- **List menu cut to New folder, Show hidden rows, Collapse all**; its icon is an ellipsis.
  Reason: Rows with notes repeats Find; Show kind filters ten rows; funnel means data filters.
- **Sort moves to a run's own find line** (runs past 20 groups). Reason: it was about one run.
- **One footer line under the tree, most specific message wins** (hidden rows, hidden on canvas,
  Everything hidden, empty). Reason: stacked footers in two styles.
- **The empty tree's pseudo-row becomes the footer line** "Analyze (Shift+A) to add results here".
  Reason: a fake row looked selectable.
- **Row status is an icon in the kind slot** (spinner, clock, warning, error); the only
  line under a row is a running progress bar. Reason: three status styles and status text in the
  count column.
- **Fixed trailing slots**: count, note count, then one slot shared by lock and eye. Reason: names
  truncated so counts could move.
- **The count column always counts members; notes show only as the speech-bubble count; the
  Notes row's count is its noted elements, with a tooltip.** Reason: three meanings for bare numbers.
- **Run rows are named by algorithm** ("Louvain"); parameters live in the inspector. Reason: the
  useful part was truncated away.
- **A kept group is named "Group 2"**, not "Group 2 (kept)". Reason: the kind is in the icon.
- **Set icon is circle-check in every tree.** Reason: bookmark also meant views.
- **Several-rows and recipe states use the same tree component as the Graph place.** Reason: three
  drifting copies of one tree.
- **Rename refusals: tooltip only; Keep as set stays in the row's "..."**. Reason: three refusal
  presentations for one gesture.
- **Mod+G stays one command, "group what is selected"** (rows make a folder, elements make a set);
  the menu label names the result. Reason: resolves the reported Ctrl+G clash without a new key.
- **Focus follows the selected row after a redraw.** Reason: focus ring and selection on
  different rows.

## Graphs switcher, project menu, main menu

- **Main menu button moves into the header, left of the project name**; the rail holds only places.
  Reason: Figma UI3; three stacked dropdowns.
- **Main menu flattened to one level**: New project, Open..., Open recent >; Select where..., Select
  edges between, Show hidden elements; Settings..., Keyboard shortcuts, Help >. Reason: three
  levels to reach a recent project.
- **Edit submenu removed**: Undo and Redo have the header buttons and keys; Select all and Invert
  have keys and the canvas menu; Copy ids moves to the several-elements menu. Reason: doors only.
- **Select by ids becomes a tab of Select where.** Reason: two items for one dialog.
- **"Select same value" removed** until its matching rule is decided; "Previous selection" becomes
  "Reselect previous" (canvas menu). Reason: unclear label, undefined command.
- **"Show start screen" removed**; Close project is the one route. Reason: two names, one place.
- **Apply recipe or style file moves to the project menu**; the inspector's recipe field goes.
  Reason: the main menu is the app; the project menu is this project.
- **Project menu**: Rename F2, Save, Save as..., Export..., Apply recipe or style file...,
  Version history, Close project. **"Show file location" removed.** Reason: a browser cannot show
  where a file lives, and the line described the data source.
- **F2 renames the project name.** Reason: it did nothing.
- **Graphs switcher: reorder chevrons removed; "New graph from" is one item** (hidden in the
  user-test build); "Compare graphs..."; a click switches at once. Reason: dead submenu; laggy
  click; ambiguous "Compare with...".

## Quick actions, Find, keyboard

- **Quick actions groups are named after the homes** (Go to, Graph tree, Analyze, Data, View,
  Layout, Selection, Project, Settings and help). Reason: groups disagreed with the homes.
- **A hint shows only when it teaches a place, written "Place > Control".** Reason: hints leaked
  design notes.
- **Esc closes the palette and returns focus to its button**; one Esc hint, in the footer.
  Reason: Esc did nothing; it was printed twice.
- **Quick actions finds commands and places; Find (/) finds rows and notes.** Reason: an open
  question in two places.
- **The time slider loses T** (its home is the dock's options menu). Reason: T and Shift+T opened
  unrelated panels.
- **Shortcuts panel**: L moves to the View group; reorder (Mod+] and Mod+[), delete and lock keys
  added to the Tree group; Done removed. Reason: wrong group; missing keys; read-and-close modals
  close with X or Esc.
- **F6 cycles the regions** (rail, left panel, canvas, toolbar, table, inspector). Kept.

## Context menus

- **One section order on every menu**: heading; Rename; select and explore; Analyze...; organize;
  Frame selection; visibility and data; Add note, Show in table; Delete. Reason: each menu ordered
  differently.
- **The heading is the target's name only, on every menu including notes.** Reason: mixed
  headings, one missing.
- **One label per command at every door**: "Frame selection F", "Fit 0", "Frame members" on rows,
  "Analyze... Shift+A". Reason: menus overrode command labels.
- **"Steps away..." removed**; Neighborhood covers it. **"Keep top N as set..." removed**; Select
  top N then Create set. **Folder: "Delete folder (keeps rows)" removed**; Ungroup. Reason:
  duplicate commands.
- **Pin / Unpin, Lock / Unlock, Hide in list / Show in list** by label swap; "(keeps painting)"
  moves to the tooltip. Reason: inconsistent toggles, Lock with no Unlock.
- **"Keep as path" shows only when edges are selected.** Reason: always grayed for nodes.
- **Attribute menu: one "Read as..." door; "Label by" added beside Color by and Size by; "Create
  rule set..." becomes "Create set where this is..." in Find; Add note leaves.** Reason: two doors
  to one section; missing family member; jargon; a command that keeps a row must not be named
  "Select" (selecting leaves nothing behind); an attribute is not a note target.
- **Canvas menu: Paste data removed (Ctrl+V still works); layout items are Re-run layout, Reshuffle
  layout seed, Unpin all; Clear graph data added.** Reason: Pause has the toolbar; Clear acts on
  the graph.
- **Delete is "Delete" (Del) everywhere, immediate, with Undo**; the run-delete dialog goes.
  Reason: its own text said Ctrl+Z works.
- **The table's row menu is the node's context menu word for word**; "Inspect" removed. Reason:
  one node, two menus.

## Inspector frame (every kind)

- **The 32 px spacer under single-body headers goes.** Reason: it read as a missing control.
- **The header mirrors the tree row**: kind icon, swatch, name, lock. Reason: different icons in
  the tree and the header.
- **Paints line, short form, count first**: "Paints 10 nodes". Reason: wrapped to two lines.
- **Paint-order line sits directly under the Paints line, one grammar**: "Covered by PageRank for
  Color on 10 of 10" or "Covers Louvain for Color". Reason: two grammars, easy to miss at the bottom.
- **State bar is one line with at most two buttons** (Rerun, Revert; Run as copy stays in "...").
  Reason: three-line bars moved the tab strip.
- **One Data vocabulary**: Summary (Size first, "N nodes, M edges"), Members, Made with, Notes.
  Reason: the same fields under five names.
- **Every read-only section is collapsible with a summary; remembered per kind.** Reason: some
  collapsed and some did not, with no visible difference.
- **Notes section on every kind that can be a note's subject (not folders, attributes, sources
  or saved views), with one empty line "No notes. Add note (N)".** Reason: a dead
  end that hid that edges take notes.
- **Made with shows settings that differ from the default and provenance only where it differs
  from the current graph**; "All options..." opens a popover. Reason: a third disclosure level and
  default values repeated on every row.
- **The remembered tab is keyed by kind.** Reason: forgotten on every state change.
- **Lists in the Data tab select what they name**; counts select what they count. Reason: three
  click behaviors.

## Style tab

- **Counts removed from section headers and the Nodes | Edges switch; a dot marks a side that
  sets something.** Reason: answer 1.
- **Sections always shown, never collapsed; empty section = header plus "+".** Reason: answer 2.
- **"+" adds directly when one property is left, opens a dark menu otherwise, disappears when none
  are left; no search.** Reason: at most seven items.
- **The Style tab's search icon removed.** Reason: "+" is the find.
- **Bind and "-" appear on hover or focus, bound lines included** (a bound value is a chip with
  its ramp or type glyph, which already says it is bound). Reason: three
  always-visible controls per line.
- **Click the value to get everything about it** (the color popover holds opacity as a percent;
  Glow holds strength; Pattern holds count; each arrow end holds type, size, color, caption).
  Reason: owner's popover lean; three lines merged on nodes, four on edges.
- **Opacity is a percent everywhere** and writes the opacity property, never a hex alpha. Reason:
  0 to 1 in one place, percent in another.
- **Arrow head and Arrow tail become one Arrows section, lines Head and Tail**; the picker's Head |
  Tail switch goes. Reason: twelve lines; the end was chosen twice.
- **Inherited gray lines and their "+" removed**; "+" pre-fills from the base style. Reason: "+"
  had two meanings on one screen.
- **Numbers and text edit inline; drag the name to scrub.** Reason: they wrongly opened the
  Overrides popover.
- **One Binding popover** for measure and run rows (source, scale, palette, values from, no value,
  Detach); the inline binding block and the unbind dialog go. Reason: accordion inside accordion;
  "-" meant something else on one line.
- **A bound line shows the ramp and palette name** ("Orange to Brown"), not the row's own name.
  Reason: "Edge betw..." told the reader nothing.
- **Run row: Level moves to the Data tab's Made with; "Also by" removed.** Reason: Level changes
  the result, not the paint; "+" already adds Shape.
- **Everything uses this same tab and is editable today** (the element's base style as lines;
  edits go into one `match: "everything"` layer kept just above the element's locked defaults;
  "-" on a changed line brings the default back). Reason: answer 3; the element's defaults are
  locked by design and an everything-layer is its intended door, so no element change is needed.
- **Selection row: two plain lines, Color (its opacity inside, as a percent) and Size** (not
  "scale"), no section wrapper.
  Reason: a section and a count for three fields.
- **Overrides is a list of edits** (element, property, value, "-"), no tabs. Reason: one shared
  value cannot describe per-element edits.
- **Folder: Paints line "Paints nothing itself..." then Members**; About, Own look and Covers
  removed. Reason: it repeated the tree.

## Style pickers

- **One palette popover**, pre-filtered by the binding's type, marking only palettes that are not
  color-blind safe; the kind filter and descriptions go. Reason: two palette pickers.
- **On a single-color row the Libraries tab lists single swatches only.** Reason: palettes set
  only their first color.
- **The custom palette's "Color-blind safe" switch removed.** Reason: asked the reader to vouch
  for what the app cannot check.
- **Label style popover: preview, the fields this row sets, "+" grouped and searchable; no tabs,
  no "Show label" switch; Placement and depth fade first in "+".** Reason: 45 "default" fields
  across six tabs. Turning labels off is a **Show** checkbox line offered by Label's and Tooltip's
  "+" (the element's label `enabled: false`), because "-" only stops a row supplying words and
  labels from rows beneath would still show. Maximum width and "same size at any distance" are not
  label fields yet (needs graphty-element).
- **The "now" line at the top of shape, arrow and pattern pickers removed; the duplicate "choice"
  state removed; the arrow caption removed.** Reason: the checked item is the current value.
- **Filter field only on lists longer than 15 items** (shapes). Reason: arrows and patterns are short.
- **Shape grid uses three columns so names fit.** Reason: truncated names.
- **The bind popover's scale-id caption removed**; the type icon gets a tooltip. Reason: internal
  ids in the plain-name UI.

## Node, edge and several elements

- **Owner: "Why this look" is collapsible**, with a summary when closed.
- **Its covered-rows fold removed**; Memberships is their home. Reason: one level of disclosure.
- **Tokens use Style tab names; Selection shows Color, Size, Opacity.** Reason: "highlight" is not
  a property.
- **A token opens its property's own popover, live, headed "Valjean only -- writes to
  Overrides"; the token editor's Apply, Cancel and "Now" row go.** Reason: two editors per value.
- **An Overrides line gets "-"**. Reason: an override could be set but never cleared.
- **A hidden row shows the eye-off glyph.** Reason: words where the tree uses a glyph.
- **One grid for every Why this look line** (swatch, name, tokens right-aligned, coverage column).
  Reason: zig-zag tokens.
- **Node: the Neighbors section goes; Degree is the link that selects neighbors.** Reason: one
  line repeating Summary.
- **Edge: direction moves into Summary; the weight attribute is marked in its row; Results hidden
  until there are any; "Opened from the table" removed.** Reason: repeated and empty rows.
- **Several elements: the names list appears once, in Summary; both summaries use the same rows
  in the same order.** Reason: duplicated on both tabs; two vocabularies.
- **Memberships' trailing number shows only for several elements ("3 of 5").** Reason: three
  meanings in one column.

## Measure, run and attribute rows

- **Measure Data: the four readings become one caption under the histogram; Top 10 for every
  kind, cut to 5 with "Show all in table" in "...".** Reason: Highest repeated rank 1; the table
  holds long lists.
- **Run Data: one size histogram for any number of communities; "Edges within and between"
  removed until the element reports it.** Reason: two forms for one content; a link posing as a value.
- **Run header uses the tree's kind icon.** Reason: two icons for one run.
- **The run's finished and readings-only meta lines removed.** Reason: they repeated Summary.
- **The run opens on the last chosen tab, not a per-state default.** Reason: the frame's own rule.
- **Attribute: "Read as" and "Role" are two dropdown rows in Summary**; the Read as section, its
  uppercase subheads and captions go; the disabled Ordered option goes. Reason: half the panel for
  two choices.
- **Roles are Name and Time; the weight role goes** (each run asks for its weight); Position is
  chosen once, under the load dialog's sample columns.
  Reason: the weight belongs to each run, where the element records its meaning.
- **The role "label" is renamed Name.** Reason: it names a node; it draws nothing.
- **A run's result attribute opens its measure row.** Reason: two inspectors for one result.
- **The attribute histogram is the measure row's histogram.** Reason: two components for one data.
- **Filter step: the condition is one sentence row; on/off is a checkbox "Apply this step";
  Order and the caption go; its "..." comes from the shared menu list.** Reason: Tableau's filter
  shelf; repeated controls; a hand-built menu.

## Saved views and Present

- **Views header: "+" (Save view), play (Present), "..."**; no second row of labeled buttons.
  Reason: one header pattern for every place.
- **Tour membership: a checkbox in the row's trailing slot; list order is tour order**; the
  inspector's "In tour" and the video export's checkboxes go. Reason: three controls for one fact.
- **Views row menu: Rename, Update to current camera, Delete** (the shared menu order); export items go. Reason: Export
  is their home.
- **The 2D banner and the footer caption go** (reasons move to tooltips). Reason: permanent prose.
- **Saved-view inspector: thumbnail, Mode, Caption, "Keeps: Camera" with one needs mark**; the
  seven radio-looking Keeps lines and the raw coordinates go. Reason: six disabled lines for one fact.
- **A saved view is still the working state** (conceptual model); Present shows current paint
  until the element can store more. Reason: the concept does not shrink to fit an element gap.
- **Present: one full-canvas header (back arrow, title, Esc), auto-hidden; the view name once, in
  the caption; Lock the canvas is a checkbox with no notice; the last-view line and the no-views
  state go** (Present is disabled with "Save a view first"). Reason: names, notices and exits
  repeated.

## Full-canvas modes (version history, compare)

- **Version history: two columns** (the drawing, and one log whose data versions are heading
  rows); Applied recipes section, "Back to the graph", "Select the 26" and the header export go;
  the log filter is a segmented control. Reason: the left column repeated the log.
- **Version history is the one home for data versions**; Data > Versions goes. Reason: two homes.
- **A comparison stays transient until "Keep as row"**, one button in its panel (one undo step);
  leaving without keeping asks nothing. Save comparison (twice), the Not saved badge, the
  leave-without-saving modal, the mini tree and mini inspector go. Reason: one click to keep, and
  the conceptual model's "looking leaves nothing behind" (top task 10: transient until saved);
  saving every look would fill the tree with comparisons nobody chose to keep.
- **Comparison panel: Agreement, Communities, Grew the most**; the legend is the shared card;
  swap uses arrow-left-right. Reason: five prose sections in 320 px.

## Data place

- **Three sections, Sources, Filters, Attributes, each with "+" in its header and the shared
  collapsible section.** Reason: answer 6.
- **Versions and Sent and saved leave the panel.** Reason: each already had another home.
- **The header is the shared graph switcher row.** Reason: two graphs could not switch here.
- **Source rows: name and counts, one quiet line, the shared out-of-date mark; double-click
  renames.** Reason: four wrapped lines repeating the inspector.
- **The paired node file is a label under its source, with no menu.** Reason: it invited a
  partial replace that cannot happen.
- **Source row menu: Rename, Replace with file..., Edit source... (and Refresh for a URL)**;
  Re-map columns... and Show import report go. Reason: Re-map was a second door to Edit source;
  the report repeated a click. Replace with file... opens the file picker first so top task 12
  (reuse an analysis on new data) stays the command, the file and Load.
- **The Sources header "..." goes; Clear graph data moves to the graph's menu.** Reason: one item,
  acting on the graph.
- **"Table matched by key..." and every needs-element item hidden in the user-test build.**
- **Filter steps: checkbox in the trailing slot, no grip (drag the row), outcome only while on,
  no "off" or "undone" sentences; menu is Move up, Move down, Add note, Delete.** Reason: repeated
  explanations and menu items that repeated row controls.
- **"+" on Filters opens the step editor directly**; its first field lists the step kinds; the
  separate weight-threshold kind goes; costly kinds carry the cost mark. Reason: a menu that
  added no choice.
- **Attribute rows: one line (glyph, name, role tag, mark)**; sparklines, second lines, paint dot,
  per-file subheads, empty Expression subhead and the two table icons go; Find appears only past
  one screen; the glyph is a mark, not a button. Reason: six marks in 240 px.
- **One glyph set and one word set for types everywhere** (Data, table headers, Read as).
  Reason: three glyph sets.
- **The Filters caption becomes the empty state and then the header's tooltip.** Reason: three
  permanent lines.
- **Every left-panel list uses the tree's keyboard model** (arrows, Enter, Space, F2, Delete,
  Shift+F10, Mod+] and Mod+[). Reason: rows announced as tree items implemented no keys.

## Source inspector

- **Summary**: counts at load as separate rows, "Read Sep 28", "Kept: a copy of the file";
  Direction leaves (it is one setting of the whole graph, read in the Overview and set in the load
  dialog); fingerprints become "Changed since last read: Yes (Sep 29)". Reason: wrapped values,
  raw hashes; with two sources a per-source Direction showed one value twice.
- **Made with replaces Read with and Import report**: warnings first, then the match line ("9,113
  edges; 0 with an unknown end"), then only non-default read settings, in the load dialog's
  words; its values open Edit source... at that field. Reason: two sections describing the same
  facts twice, with two vocabularies.
- **The state bar carries the button**: "The data at this address changed since Sep 29 --
  Refresh"; "Refresh failed after 3 tries -- Try again". Reason: a bar that pointed at a menu.
- **No History section**: the Summary's Read line ("Read Sep 28, replaced Sep 30") links to Version history. Reason: the Versions section left, and a one-row History section repeated the Read line.
- **Derived graph: the self-contradicting "Kept" row removed.**

## Load dialog

- **One dialog for every door** (File, URL, Paste as its source choices; Edit source...; a drop).
  The small drop variant, the replace and remap states, the start screen's URL modal go. Reason:
  three dialogs for one job.
- **Structural roles are chosen under the sample columns' headers** (node id, edge start, edge
  end, edge id, position, attribute); the six mapping dropdowns go; label and weight are not
  roles here. Reason: the mapping was shown twice; each fact gets one home.
- **The left column holds Format, Separator, Direction and "More options"** (a popover: edge id,
  positions and scale, repeated pairs, ids, stop reading). Reason: twelve dropdowns on the happy path.
- **Field labels come from the element's format catalog (`plainName`).** Reason: the dialog and
  inspector had drifted into two vocabularies.
- **Single-value and permanently disabled fields become text or are hidden**; Tries goes.
- **Helper lines only for warnings**; detected values carry a small "auto" mark. Reason: real
  warnings lost among explanations.
- **Each problem in two places only**: under the field that fixes it and in the footer reason.
  The format radio cards go (Format lists the candidates first). Reason: one problem in four places.
- **Load into appears only on a drop or paste into an open graph: This graph | New graph**
  (segmented); "Replace this graph" goes. Reason: "replace" now means one source.
- **The door strip and the "After the load" note go.** Reason: design-review information.
- **Before Apply on a Replace or Refresh, the footer lists lost attributes and what they break.**
  Reason: Tableau's removed-field warning.
- **Terminal refusals: "Choose another file..." is the primary button; no dead "Load again".**
- **A second load while one reads is refused with the shared notice**, not a modal.
- **Initial focus: the first field that needs a choice, else Load** (a clean drop is one Enter).

## Table dock

- **The scope line is the count only** ("77 nodes"); hints go to tooltips; edge cells are editable
  (the element's `updateEdges`). Reason: permanent instructions above every table.
- **One-line column headers**; the profile moves to the header tooltip; sort uses arrows, the menu
  caret keeps the chevron. Reason: a row of height; two identical glyphs.
- **The Notes column shows only when a row has a note, blank at zero, with the tree's badge.**
- **The search icon goes; Find (Ctrl+F) searches the table when it has focus.** Reason: it opened
  the app-wide Find under another name.
- **Item tabs use the run row's name and icon.** Reason: names that did not match the tree.
- **Remove from data acts at once with Undo.** Reason: three paragraphs for an undoable act.
- **Members-of-row: the chip and "10 of 77 nodes", the tree row selected.** Reason: 25-word sentence.
- **Time slider: play, track, window readout, window length, close.** Reason: eleven controls.
- **"joined" corrected to "from the node file".** Reason: graphty-element has no join.
- **Modularity leaves the communities tab** (its home is the run). **New attribute and Merge nodes
  leave Table options.** Reason: one home.
- **In-window rows get an accent bar, never the selection tint.**

## Notes place

- **Header and list use the Graph place's treebar** (Find plus a filter icon); "About Valjean"
  shows as the filter label. Reason: three rows of controls.
- **Targets and cited runs are the same chips**; an earlier run gets a history icon; the Cites
  line and "Open that run's settings" go. Reason: two reference styles.
- **The crosshair button goes; a click selects every target.** Reason: two near-identical actions;
  the spec said all targets.
- **Edit turns the note into an editor in place.** Reason: Edit opened an empty new note.
- **Delete with Undo; hover actions in the meta line's trailing slot.** Reason: no undo; overlap.
- **Editor: targets from the selection, each chip with an x; Mod+Enter in the Save tooltip.**
  Reason: an open question settled; keyboard hints in text.
- **One fixture note is about the edge Valjean - Javert.** Reason: answer 9.
- **Empty state is one line with the Add note link.**
- **Counts count notes; the fixtures agree everywhere.** Reason: 1, 2, 3 and 7 for one graph.

## Assistant place

- **No provider: only the empty state with its Settings link**; the list, "+" and composer hide.
  Reason: six dead controls.
- **Conversations become a switcher row at the top.** Reason: the list pushed the answer down.
- **Tool lines are one sentence with the shared object chip; boilerplate and the truncated
  caption go.** Reason: ragged columns; repeated text.
- **On failure, Retry only inside the failed answer; the composer stays empty.** Reason: two ways
  to resend.

## Analyze popover

- **Essentials show Weight and the one key option; Scope only when something is selected; Direction
  only on a directed graph; cost as one line beside Run; Exact or Sampled only for costly entries;
  Stop after in Made with.** Reason: seven rows and a clipped Cost.
- **The After row and every repeated "adds a measure row" go.** Reason: said four times.
- **Weight meaning is one segmented control, "Higher = stronger | Higher = farther"**, generated
  from one state. Reason: the label and its sentence contradicted each other.
- **Revising: buttons "Update Louvain row" and "Run as copy"; the notice goes.** Reason: two
  names for one element call; buttons that needed a notice.
- **The All algorithms sheet goes; each entry's second line is its "answers" sentence; the family
  moves to the tooltip; marks are bare icons.** Reason: a second view of one catalog.
- **Recent: three entries, no rerun icons; a click opens prefilled essentials.** Reason: the icon
  did two things.
- **Prim leaves the list (a method of Minimum spanning tree); "Find paths and edge sets";
  depth-first order sits with breadth-first levels.** Reason: groups that did not match contents.
- **No toast on run; the new row is the feedback.** Reason: two Cancel homes.
- **Footer keyboard hints go; Enter is in Run's tooltip.**

## Export dialog

- **Five outputs: Image (SVG as a disabled format), Video, Report (with "Methods text only"),
  Recipe (with "Only the style"), Data (every format the element writes, CSV first, through `exportGraph`, with its loss notes as the warning callout)**; Project
  leaves (Save as... is its home). Reason: ten entries, several the same thing.
- **List entries are one line, one Tab stop with arrow keys; extensions only in the Format row.**
- **Video uses the shared frame**; its copied list goes. Reason: the two lists had drifted.
- **One summary line under each title** ("Full graph - legend not drawn - 3 MB"); Masked only for
  privacy. Reason: labels changed per output.
- **"Opened from ..." removed; a door only fills a field.** Reason: navigation notes in the product.
- **Image: Preset dropdown (Custom after an edit), Size dropdown (1x, 2x, 4x, Custom...), Format,
  View, Background (Canvas color, White, Transparent, disabled with a reason when the format cannot
  hold it); Advanced popover (quality, sharper rendering, custom pixels and print width).** Reason:
  seven controls for one value; a switch that changed the format behind the reader's back.
- **Destination and File name rows removed; footer Copy and Export.** Reason: a setting decided
  what the main button did.
- **Refused sizes are disabled with the reason; one message.** Reason: a refused size drawn
  selected, explained twice.
- **One callout, three tones, above the preview; the memory line only near the limit.**
- **"Capture now" in both waiting and failed states; Cancel always closes.**
- **Video: the same View dropdown with "Tour of saved views"; Length, Size, Frame rate (24, 30,
  60); Advanced popover (format, bitrate, transparency, easing); stops are name plus Hold
  seconds; "Use 24 fps" inside the warning; one progress bar; Done is one line with Close,
  "Record again at 24 fps", Export.** Reason: two size models, hidden overrides, double progress.
- **A disabled output shows its title, one sentence and the needs mark only.**
- **After export the dialog closes where the reader was, with one notice naming the file.**
- **Footer note: "Saved to this computer only; nothing is uploaded."** Reason: three wordings.
- **Dialog about 760 x 560.** Reason: nearly full-screen for four settings.
- **"Recent exports" lists past exports with Export again.** Reason: Sent and saved left Data.

## Apply recipe or style file

- **One "Apply file" dialog**: file header, one list of the rows it adds with each binding inline
  (matched, or a picker for a missing attribute); Apply waits until every mismatch has a choice.
  Reason: three layouts; the style file skipped mismatches silently.
- **Replace my style removed**; a file always lands on top as one undo step. Reason: an app-side
  workaround for a missing element option.
- **Older 1.x file: one notice and "Apply these settings".** Reason: a whole dialog for a rare case.
- **Fetches from only when it fetches; precedence paragraphs and "Choose another" links go;
  include-choices are checkboxes; the title is "Apply <kind>: <name>".**

## Settings

- **Six sections plus Diagnostics**: General (your name, theme, number format), Privacy,
  Accessibility and input (reduced motion, single-key shortcuts, override selection highlight on
  this device, pin on drag), Performance, Assistant, Headset. Reason: five sections held one row.
- **Keyboard and Projects sections removed**; the overview recipe concept leaves the UI (one
  General overview). Reason: duplicate door; a setting for a concept nobody asked for.
- **Switches for on/off, System first in segmented controls.** Reason: two controls for one job.
- **"Override selection highlight on this device" uses the Style tab's color and number fields.**
- **Forget all keys asks first.** Reason: it cannot be undone.
- **The privacy chip opens Settings > Privacy everywhere.** Reason: one chip, two destinations.
- **Settings > Privacy holds "Where your data goes"** (files read here, the project saved where you
  save it, keys kept only when remembered, masked usage data sent only while on), and "Files you
  exported" links to Recent exports. Reason: the owner asked for that page to match the telemetry
  decision; the old link called saved exports "sent".

## Start screen

- **Two rows and a hint**: "Open project or file..." (Ctrl+O), "New from data..." (the load
  dialog, File, URL or Paste), then "or drop a file anywhere in this window". Reason: five rows,
  one of them an instruction drawn as a command.
- **The connectors open question moves to the design notes.**

## graphty-element needs added by this round

- Switching the element's default layers off (`addDefaultStyle`), for Everything's eye; editing
  Everything needs nothing (an everything-layer).
- A switch to stop drawing the selection highlight, for the Selection row's eye.
- A label maximum width with wrapping, and a "same size at any distance" label option.
- A notes store with a `notes.*` path a binding can read (note count, latest note), followed by
  the dependency tracker.
- Number formatting on text bindings; label templates (lower priority).
- Re-deriving values when a known field (`knownFields`) changes after load.
- An attribute type ("read as") in `knownFields` or the schema.
- Confirm that Overrides can be an id-keyed binding.
- Confirm that resuming a settled layout continues from current positions.

---

## Corrections after the skeleton review (studio decisions; they supersede the lines above and the matching lines in `structure-b-refined.md`)

Six reviews of the skeleton (interaction, visual, design professor, product designer,
accessibility, ontology) found jobs still done two ways. Each change below is reversible with an
edit.

- **The funnel means data filters only.** "Computed before the current filter" uses the shared
  out-of-date mark (triangle). In the Data place the attribute's kind glyph never changes; the
  mark sits in the row's trailing slot. Reason: one icon, one meaning.
- **The header's filter chip shows only while a filter is on, with no caret**; a click opens
  Data > Filters. Reason: a caret promised a menu that never opened.
- **No note bubble beside the graph name.** The graph's notes are in its Data tab. Reason: the
  bubble (notes about the graph) sat 100 px from the Notes row's count (noted elements).
- **Tree counts:** a run row counts its members (Louvain 77), never "6 groups"; the Notes row's
  count is its noted elements and says so in its tooltip and accessible name.
- **"Hidden" is the eye's word.** The tree footer reads "1 row hidden from this list. Show"; in
  Why this look a row hidden from the list is drawn as the tree draws it (dimmed italic), and the
  eye-off glyph only ever means "not drawn".
- **Why this look tokens stay on one line**: at most two, else the first and "+N" (the rest in its
  tooltip and accessible name); one fixed mark slot; design notes open the section.
- **Value fields have one look**: no chevron on a value that opens a popover; fields are
  borderless until hover or focus, in the panel and in popovers. A bound text value is a field
  chip (type glyph and field name), never typed text.
- **One design note per Style tab, under its sections**, never in a section header where "+"
  goes.
- **The Paints line has one grammar**: "Paints 14 nodes, 28 edges".
- **Arrow popovers are titled by the line that opened them**: "Head", "Tail".
- **Data > Attributes: Nodes and Edges are plain subheads** (one level of disclosure); its "+"
  sits right-aligned like every header "+", grayed with its reason while it needs graphty-element.
  The paired node file is its own label row under its source.
- **Graph Data tab vocabulary: Summary** (not Overview); with a filter on, its Nodes line reads
  "812 of 3,000" and a state bar says the readings are for all nodes. The measure row's kind word
  is "Measure".
- **Canvas and table menus: "Delete" (Del)**, not "Remove from data"; "Filter to neighbors" lives
  only in the Neighborhood popover. Neighborhood has no key (G read as Ctrl+G's twin).
- **Icons**: Everything uses a base-layer glyph (a frame with its bottom band filled), never a
  second swatch; "Local only" uses a laptop (the padlock means a locked row); Quick actions uses
  zap (the Cmd glyph read wrong on Windows and Linux).
- **Navigation keeps labels; command bars are icon-only.** The rail is navigation, so its text
  labels stay; the toolbar and selection bar carry icons and tooltips only.
- **The color popover keeps Custom | Libraries tabs**, the one exception to "no tabs in a
  popover": the owner pointed at Figma's color picker, Custom and Libraries, as the home of style
  libraries (2026-09-28).
- **One keyboard model for every list and button**: buttons answer Enter and Space; Tab closes a
  dark menu and focus returns to its opener; a disabled reason reaches screen readers
  (`aria-description`); a tooltip opened by keyboard focus lets Esc through, so a popover closes on
  one Esc; the Views list is one Tab stop and Space flips In tour (no grip; drag the row); bind and
  "-" always show on touch screens; a pressed control's focus ring sits outside its fill.
- **Review-only text on the canvas and toolbar** (the selection-bar hint, the hand-menu caption)
  hides with the design notes.
- **The collapsed table dock lays out only its tab strip.**
- **A saved view keeps the legend's on or off** (needs graphty-element, in the Keeps note);
  outside a view the legend is remembered per project.

Kept as specified, with the reason: the selection bar stays a second bar over the toolbar (it
appears only with a selection, and merging would make the toolbar's width jump); "Hide in list"
stays (owner decision, 2026-09-30); Mod+G stays one "group what is selected" command; the tree's
fixed trailing slots keep their width so counts line up; a node's Style tab stays Why this look
(an element is styled through rows, and Overrides is the one per-element door).

## Corrections after the second skeleton review (studio decisions; they supersede the matching lines above)

Each is reversible with an edit.

- **One Label popover.** Clicking a Label or Tooltip value, its bind icon, or an arrow end's
  Caption opens one popover, "Label": the text source on top (typed text, a node field, a result,
  or a note count or latest note, the last two marked as needing graphty-element), then the
  style fields under a "Style" header with "+". The "Aa" button and the separate dark field menu
  are gone. Reason: two chips that looked alike opened different editors.
- **Bind opens a popover, never a pressed toggle**: the Label popover on a label line, the
  Binding popover on any other line.
- **One color field everywhere** (swatch, hex, percent in one borderless field). In a popover it
  opens the Color popover, which alone holds the hex and percent editors. A label-style color is
  unset with "-", like every other field. Reason: color was edited four ways.
- **Arrows: no "None" cell.** "-" on the Head or Tail line turns an end off. The arrow's Size is
  an editable number with drag-to-scrub on its name.
- **Plain names for every choice value** ("Faceted sphere", "Arrow", "Open arrow", "Solid",
  "Light / Regular / Medium / Bold"). graphty-element's descriptors carry the value ids but no
  plain name per value; that is filed as an element need, and the app's list is a stand-in.
- **Units:** node Size, Selection Size, label Size and edge Width are unitless numbers, as the
  element declares them (no "px", no "scale"). Opacity is a percent everywhere.
- **The paint-order line is one line**: "Covered for Color by PageRank". The counts and scope
  ("on 10 of 10") are its tooltip.
- **Selection uses the shared Style tab** (Fill: Color; Shape: Size; nodes only), with "Paints 0
  nodes". Reason: it was the one painting row with its own layout, the same mismatch as the
  owner's Everything-versus-"For the report" question.
- **Everything:** the base-layer glyph only, in the tree, the inspector header and Why this look;
  its order line is "Default look, under every other row"; its Paints line is plain text.
- **Out of date has one mark**, the triangle, in the inspector header too, and only where a
  result no longer matches its settings or data. A filter state bar ("Readings: all 3,000") has
  no header mark: the filter chip already says a filter is on.
- **Filter outcome in one form**: "812 of 3,000" (chip, filter step, Summary).
- **Why this look:** at most one design note per list; the "-" column takes room only on a line
  with an override, so names like "Everything" do not truncate. The list is one Tab stop.
- **Analyze's "Steps away" entry is now "Neighborhood"** and opens the Neighborhood popover, the
  one door for "one group per hop" (Add as steps). Searching "bfs" or "steps away" still finds it.
- **Path between has no Scope.** A path runs on what the graph draws; its ends are the selection.
  The command is "Path between..." at every door (the catalog group keeps "Find paths and edge
  sets" as a heading).
- **"Neighborhood..." takes an ellipsis** (it asks for hops before it acts) and has no key.
  Direction is hidden on an undirected graph.
- **The selection bar shows whenever something is selected**, whatever popover is open.
- **"1 node not drawn" is said once**, in the tree footer; the drawing leaves the hidden node out.
- **Show only this row** is a row-menu command with Alt+Space; Alt-click is its accelerator.
- **Data place sections never collapse** (they are editable); "+" on Filters adds a step in place.
- **The table's column menu is the attribute menu**, word for word, except its last "Show in Data".
- **Views place has no "..."**: its one item, the tour video, lives in Export > Video.
- **Segmented controls have one look**, the tab's gray fill; a five-way choice (the version
  history log) is a dropdown.
- **Dark theme:** a light popover is one step lighter than a dark menu.
- **Header chips share one style**; in-panel object links underline on hover only.
- **A pressed Legend always draws a card**; with nothing bound it reads "Nothing is colored or
  sized by a row". The card is read-only.
- **Focus:** Tab wraps inside a modal (Quick actions is modal); Tab off either end of a popover
  closes it and returns focus to its opener; F6 includes the header.
- **Disabled reasons:** the second line in a menu, the tooltip on a button (as written above);
  kept, because a menu item's tooltip is not reachable by touch.

Kept as specified, with the reason: "Javert -- Valjean" stays in the file's order (the edge's own
data), while "Valjean to Javert" is the path row's name, not the edge's; the tree's Notes row
keeps its name (its count's tooltip says "noted nodes and edges"); field fills stay (Figma's
fields are filled and borderless; "borderless" meant no outline); Hide on canvas stays its own
command (moving it into Overrides is a model change for the owner's next review, not a polish).

## Corrections after the third skeleton review (studio decisions; they supersede the matching lines above)

Each is reversible with an edit.

- **Selection has Style and Data tabs** like Everything and Notes (its Data tab says what is
  selected). Overrides keeps one body, its list of edits, drawn on the shared style line (88 px
  name, the one color field with its percent, "-" on hover or focus). Reason: three built-in rows
  in three layouts.
- **The Paints line counts a side only when the row sets something on it** ("Paints 14 nodes"
  for a group that sets only node color; "Paints 10 nodes, 30 edges" once it sets a line color).
  Overrides reads "Paints 1 node"; the kind word already says where the row comes from.
- **The selection bar follows the node menu's order**: Neighborhood, Path between | Create set,
  Hide on canvas | Add note.
- **Focus rings for the keyboard only**: after a pointer input, focus moved by script (a menu
  opened with the mouse focusing its first item) draws no ring and shows no tooltip; the next key
  press brings both back.
- **Links**: a link that is a whole line or value underlines on hover; a link inside a sentence
  (the paint-order line's row, the inspector subtitle's source, "Show", "Add note") is always
  underlined, so it is never marked by color alone (WCAG 1.4.1).
- **Inspector subtitles have one grammar, "<Kind> from <source>"**, with no dates or parameters
  (they are in Data > Made with); a long source name is in the subtitle's tooltip.
- **"Save view" is a plain menu item** (no "+", no ellipsis: it creates, then names in place).
- **The label popover's "-" uses the panel's rule**: one 24 px slot at the row's end, shown on
  hover or focus. Its colors use the one color field (swatch, hex, percent).
- **Palette names are sentence case and short** ("Orange to brown", "Eight distinct").
- **State bars state; they do not act.** The graph's filtered state bar reads "Readings are for
  all 77 nodes"; recomputing is the graph menu's Compute the overview, and a row's Rerun stays on
  its row.
- **A value that opens a popover has no chevron** (the graph's Background and Method too); a true
  dropdown keeps it.
- **Every popover fits the frame**: capped to the overlay's height, its body scrolls.
- **Design notes name what they qualify** ("Sections and their order:", "Field list:", "Rows,
  filters, hidden elements:"); the words hide with the notes.
- **One Tab stop per list** in the Notes place and the table dock's tab strip (arrows move; a
  closable tab closes with Delete; its x is a 24 px pointer target, not a control inside the
  tab). A Views row is one control: the row carries "in tour", Space flips it.
- **The canvas edge marker is an annotation, not a button** (graphty-element cannot pick edges);
  it hides with the design notes.
- **A disabled icon button is grayed**, like a disabled toolbar button.
- **A run row keeps its member count while it is open** (fixed trailing slots).

Kept as specified, with the reason:
- The bind icon stays beside a Label or Tooltip value: the second correction names it as a door
  to the one Label popover (bind always opens a popover, never a toggle).
- Overrides has no tabs: one shared value cannot describe per-element edits.
- The context menu keeps its heading (the target's name, on every menu).
- The node's Style tab stays "Why this look" and the graph's tab stays "Style" (section 5.3).
- "Show filtered-out nodes faintly" stays: it is graphty-element configuration
  (`visibility.showContext`) the reader turns on, not a paint an algorithm chooses.
- The filter step keeps its outcome line ("812 of 3,000", one form in chip, step and Summary).
- Data > Attributes keeps run results such as PageRank (a result attribute opens its measure row).
- The arrow end's Caption already opens the Label popover and shows its effective value in gray.
- The Label chip reads "Abc label" because the field in the Les Miserables file is named "label";
  its Name role is a tag on the Data row.
- Isometric has no key: graphty-element's camera catalog defines none.
- Hide on canvas stays its own command; whether it moves into Overrides goes to the owner.

Open for the studio: a single node or edge cannot get a property that no row sets ("label only
Valjean"), because "Why this look" offers tokens only for properties some row already sets. A "+"
that writes a new Overrides line is the likely answer; it is a model change, not a polish.
