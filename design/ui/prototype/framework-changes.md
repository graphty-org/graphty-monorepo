# Proposed changes to the design framework

Changes to the documents in design/ui/framework/ that the mocks and the study motivate. Each names the document, the section, the old text, the new text and the evidence. Nothing here is in force until the framework is edited.

**Message keys (owner decision, 2026-09-28, applied here, not proposed):** reader messages are published as { key, params, text }, and the published key is `graphty.` plus the key shown in `message-catalog.md`. Every key in proposed text below is written in that published form; keys inside quoted old text and graphty-element API names (such as `session.styles.update`) are left as written.

**Decided by the owner (2026-09-28), applied here, not proposed:** the findings report is one self-contained HTML file (figures embedded, notes and tables as real text, opens offline, prints to PDF; a native PDF may follow as a second format). graphty-element publishes SVG figure export now and PDF later, and the Print look keeps its grey check. Each note records its author and time, and a recipe records who saved it and when; both come from the project's author setting as given (blank if unset), and the author is shown only when a project holds more than one. The keyboard walk is Shift+Arrow. **Decided on the owner's behalf (reversible):** the project file saves the selection when it closes; undo follows version B; there is no separate Note tool. Entries below that still say "proposed" or ask the owner about any of these are superseded by this paragraph.

## The hidden line counts edges, in one wording

- **Document and section:** `message-catalog.md`, row `drawn.not`; `interaction-pattern-entries.md` 6.9, Hide; `principles.md`, the example "412 hidden".
- **Old text:** the catalog's `{N} {kind} not drawn[; {M} hidden]`, and 6.9's example "40 nodes, 112 edges hidden". The two disagree: the catalog has one kind and one hidden count, 6.9 counts nodes and edges.
- **New text:** `{N} nodes[, {E} edges] not drawn[; {M} hidden]` when elements are not drawn for size, and `{M} nodes[, {E} edges] hidden` when only hidden elements are not drawn -- where {E} counts every edge not drawn because an end is hidden. On the March transfers, hiding the 60 merchants reads "60 nodes, 5,302 edges hidden" (5,302 transfers have a merchant end; `kit/fixtures.json`, `transactions.withoutMerchants`). Update 6.9's example to the same shape.
- **To test, not proposed yet:** ending the line with "; still counted". Hypothesis H2 in `study/hypotheses/narrow-hide-paint.md` compares the two wordings. Until sessions report, the published message keeps its short form.
- **Why:** hiding 60 nodes stops drawing 5,302 edges; a line that counts only the nodes understates what vanished from the canvas by almost ninety times. The message key is published, so the wording is the owner's call; the key does not change. Drawn in flows/narrow-hide-paint.html.

## Hidden, then filtered out: what the hidden line counts

- **Document and section:** `interaction-pattern-entries.md` 6.9, Hide; `output-homes.md` 3, the Hide on canvas and Show on canvas row.
- **Old text:** "What is drawn is the filtered graph minus the hidden elements." (silent on the count)
- **New text (decision owed):** say whether a hidden element that a filter step also leaves out is counted on the hidden line. Proposed: it is not counted while the step is on, because it is not in the graph being read, and it comes back into the count when the step is turned off. Also give Show all an undo label, "Show 60 nodes on canvas", in the command register, which today has one only for Hide.
- **Why:** the recovery route in the flow is "Show all, then Filter out" because an analyst who filters and leaves a hide on, then turns the filter step off to compare, sees the chip return to Full graph while the merchants stay invisible -- a canvas that looks filtered and is not. The design does not say what the hidden line reads in between.

## Statistics and the chip: a question for the study, not a change

- **Document and section:** `principles.md` principle 1, "Marks only on departure" and "Scope is marked once"; `content-design.md` section 5 (a scope named only when it differs from the full graph); `interface-specification.md`, the Statistics row.
- **Old text:** "A value in that state carries no mark." "A value whose scope is the chip's carries nothing more."
- **Proposed change:** none yet. An earlier version of the flow put "Full graph, 3,000 nodes" above Statistics at all times. That contradicts both rules above, and an always-present line reads the same filtered or not, so readers learn to skip it. The mock now follows the principle: Statistics carries no scope line, and the chip is its only scope mark.
- **To test:** hypothesis H3 in `study/hypotheses/narrow-hide-paint.md` compares the chip as designed, the chip in a stronger treatment, and an always-on scope line. Only if the always-on line clearly wins would this become a proposal to change principle 1, with its old and new text.
- **Why it is worth testing:** the chip sits in the left panel header and Statistics in the inspector on the right, across the canvas. That is design reasoning, not evidence.

## Flow 4 draws its failure question and recovery route

- **Document and section:** `task-flows.md` 4, the diagram and "First failure".
- **Old text:** "First failure: choosing the hide exit when later numbers should have excluded the other nodes, or the reverse; the chip, moved or not, shows which happened."
- **New text:** add a failure diamond after the hide exit's trust check and flow 5.1's "Chip does not move", "Did the chip move the way I meant?", with the exits "yes" (rest) and "no, they should not count: Show all if they were hidden, then Filter out" (to the filter step). Draw the recovery edge with a non-color cue (a double line) and add it to section 1's shape table. To First failure add: "The recovery is Show all if hidden, then Filter out; a layer can stay."
- **Why:** section 1 puts a named failure in a diamond and says every diamond draws all its exits; the named first failure had no drawn route, and an edge leaving a trust check is not a decision. The earlier recovery edge differed only by a danger color, which disappears in grayscale print. Drawn in flows/narrow-hide-paint.html.

## Flow 4: a selection is a fixed list, and the paint exit follows 5.1

- **Document and section:** `task-flows.md` 4, the diagram, the step table and the header's Record.
- **Old text:** the diagram merges "Canvas: a selection of type X" into the same Filter to step as a set or a column value, and the step table gives one undo label, "Filter to Type = X". The paint exit points at flow 5.1 as a single box.
- **New text:** the narrow step names both labels the command register (`output-homes.md` 3) already gives: from a value, a legend entry or a set, "Filter out kind = merchant" (a rule); from a selection, "Filter out 60 nodes" (a fixed list). Record: "a rule step catches the same kind after Replace data; a list step does not." The paint exit is a diamond, "Paint every kind, or just these?", with three exits: Color by kind (a layer bound to the attribute; undo "Color by kind"), Create set then a color (a layer scoped to the set), and a color on the selection (the Overrides layer; undo "Override color of 60 nodes").
- **Not proposed:** letting Select same value carry its rule into a later step, so that a canvas start also makes a rule. If the studio wants that, it is a change to `output-homes.md` 3 and `task-flows.md` 5.1, and it is not drawn as current behavior.
- **Why:** a rule and a fixed list behave differently next month, which the flow's Record depends on; and 5.1 already sends several selected nodes to Overrides, the exact Figma habit (select, then change the fill). Drawn in flows/narrow-hide-paint.html.

## Flow 4: an undo label follows the step's outcome

- **Document and section:** `task-flows.md` 4, the extract row's undo label.
- **Old text:** "Extract Type X as graph"
- **New text:** name the result: "Extract filtered graph (2,940 nodes) as graph". The label names what was extracted, whichever step made it.
- **Why:** "Extract Type X as graph" only reads right after Filter to. After Filter out kind = merchant, the filtered graph holds the 2,940 non-merchants, and "Extract kind = merchant as graph" reads as extracting the 60 merchants.

## Flow 4: Figma's route is counted honestly

- **Document and section:** `task-flows.md` 4 and 4.1, the header's Figma route and the desk count.
- **Old text (4):** "the layers panel's filter with a type filter, then select and hide with the eye or the hide chord ..., 2 steps." (4.1): "the layers panel's filter with a type filter, 2 steps".
- **New text (4):** "select one layer; Select matching layers (or Edit > Select all with same); the hide chord: 3 steps. From one node, graphty's route is also 3 steps (the node; Select same value; Hide on canvas or Filter out)." (4.1): "Figma has no filter by a property value; the nearest route is the same 3-step selection, which changes nothing about what is computed."
- **Why:** Figma's layers-panel type filter filters by layer type (frame, text, component), not by a property value (`research/figma.md`, the Select matching layers and Select all with same rows). A Figma user would dispute the 2-step claim.

## Flow 4: the filter call's name

- **Document and section:** `task-flows.md` 4 and 4.1, the Element need column.
- **Old text:** "`session.visibility.set`"
- **New text:** "`session.filters.steps` (recommended, `element-contract.md`; published today as `session.visibility.set`, which door 86 recommends deprecating)"
- **Why:** the flows still name the call the contract is moving away from.

## Export: what the dialog opens with, and where its scope sits

- **Document and section:** `task-flows.md` 9, the diagram node "Export dialog, every row checked" (drawn as a gap), the Desk count and the Stall line; `interface-templates.md` 20, the Export... row.
- **Old text:** `ED(["Export dialog, every row checked"]):::gap`; "a recipe, 1 step, 1 travel (Recipes; Export recipe...), plus its name"; "Stall: does "Export" in the header mean the current view or the whole project?"
- **New text:** "The Export dialog opens with its Scope row first, set to the filter chip's scope and changeable there (full graph, a filter step, a set, a path). Below it, one section per kind in this order: Figures, Methods text, Graph data (a graph-io format and the dialog's scope; blocked until graphty-element writes graph files), Tables, Starting point (Recipe, Style file), Findings report (blocked), Project. Two sections are additions to the template's list: Methods text (see the next entry) and Project (Download project file, which `output-homes.md` 3 already routes to the Export dialog as well as the chevron menu). Every row that carries an export setting is checked (the current view and each saved view with a setting); every other kind is listed unchecked. The commit button counts the files it will write ("Export 3 files") and is disabled while nothing is checked. Export recipe..., Export style... and Export table open the same dialog with that row checked and the others unchecked. The Recipe row carries a name field, filled with the project's name. Desk count: a recipe, 1 travel, 2 steps (Recipes; Export recipe...; Export 1 file), plus its name; a table from a table tab, 2 steps."
- **Why:** two departures from Figma and from flow 9 as written, each for a graph reason. First, Figma checks every row because every row of its dialog is an export setting; graphty's other kinds (a project file, a findings report) have none, so checking them all would write files nobody asked for. Opening with only the views checked, and the rest visible below, also answers the stall question on sight. Second, flow 9 writes a recipe at once from Recipes, in 1 step; routing it (and Export table) through the dialog adds 1 step, and that step is the trust check itself: a recipe's manifest (what travels, what the recipient binds, what stays behind) and a table's headers (scope, method, freshness) must be seen before the file is written, or the check comes after the fact. The extra recipe step is not yet tested: it should be tried with the recipe persona (study/personas/recipe-recipient.md) before it is settled. Pattern 6.11 already says one dialog picks the profile and its scope; the scope sits once above every kind because a figure, a table and a report of one export must describe the same graph. Drawn in screens/export-dialog.html and flows/export.html.

## A figure's methods text is a sibling file, one per export

- **Document and section:** `files-and-recipes.md` 3, Outputs; `interface-templates.md` 20.
- **Old text:** "Outputs change nothing and carry a methods text written from their records." (silent on how a raster image carries it)
- **New text:** add: "A figure's methods text is written beside it as one plain-text file per export, covering every figure and table the export writes: the data source and its load date, the scope and its filter steps, each run with its method (exact, or approximated with its sampling parameters) and freshness, each style layer that paints. It is a checked row of its own (Methods text) so it can be left out; the findings report always carries its own and shows the row checked and disabled."
- **Why:** a PNG has no reliable place for a paragraph (metadata is stripped by most tools that paste images into slides and manuscripts), and the weekly-return journey's pain is "hunting through dialogs to recover the parameters used weeks ago". One file per export, not per figure, keeps a four-figure export from writing four near-identical texts.

## The export form shows what will be written before it is written

- **Document and section:** `element-needs.md`, a new row beside "Exported figures" and "Export a project as a recipe".
- **Old text:** (none)
- **New text:** "An export preview: for a figure, the rendered image at preview size with its legend and caption drawn in, under the export's settings; for a recipe or style file, its manifest before writing -- the parts that travel, the slots the recipient will bind (with the weight slot marked as always confirmed), and what is left behind, counted. The app draws both; it never computes them."
- **Why:** the trust checks of task flow 9 ("legend and scope drawn in", "a recipe holds only definitions") must be visible before the analyst commits, not discovered in the file afterwards. Only graphty-element knows which blocks paint on the exported scope and what a recipe closes over, so computing either in the app would be the workaround the architectural principles forbid.

## A figure past the drawing limit is disabled, not reduced

- **Document and section:** `state-matrix.md`, the Canvas / Export form rows; `task-flows.md` 9, the diagram; `message-catalog.md`, row `cause.E_UNSUPPORTED.export`.
- **Old text:** only "Partial | an exported view whose drawn elements exceed a drawing limit: the reduction stated in the form and in the file's caption"; the cause template `{format} not supported over {N} {kind}`.
- **New text:** add a row "Canvas | Export form | Too large | past the node drawing limit nothing is drawn, so each figure row is disabled with `cause.E_UNSUPPORTED.export` and the export-other verb (Export as table); the other kinds stay available | Export as table; narrow". Reword the cause, keeping its key, to `{format} needs a drawing: {count} {kind} not drawn, more than this browser draws at once ({N})` -- "PNG needs a drawing: 124,318 nodes not drawn, more than this browser draws at once (50,000)" -- where {count} is the graph's own size (the not-drawn line's number) and {N} is the limit the element measured on this machine, never a constant in the app. In flow 9's diagram, draw the figure branch's failure to the table branch, and draw the write failure (`graphty.export.failed`, in the dialog, with its verb) and Cancel (nothing written, no notice, focus returns) as exits, since every diamond draws all its exits.
- **Why:** there is no drawing to reduce past the limit, so "Partial" does not cover it, and a disabled row with a reason is the rule of `options-and-encodings.md` 1 (the routing table's Export row, rule 5) for a setting a format lacks. The old template put the graph's own size where the limit goes ("PNG not supported over 124,318 nodes"), which reads as if the limit happened to equal this graph. The new one states both numbers and matches the not-drawn line proposed above ("Past the drawing limit: the not-drawn line names its reason and the limit"). The message key is published; its wording is the owner's call. Drawn in screens/export-dialog.html, state 7.

## The findings report's file format (one-way door: owner's decision)

- **Document and section:** `one-way-doors.md`, a new door beside 1 (The file's container and media type) and 61.
- **Old text:** (none: the findings report's format is not named anywhere)
- **New text (decided by the owner, 2026-09-28):** "The findings report is one self-contained HTML file: its pages as images with their captions, notes as text with their quotes and citations, the boundary's members as a table, the methods text last. It opens in any browser without graphty and prints to PDF. A PDF writer can be added later as a second format of the same report."
- **Why:** an investigator hands the evidence file to someone who has no graphty and may have no network; HTML is readable everywhere and keeps tables as text (copyable, accessible), where a PDF writer in the browser is heavy. It is a door because other tools and case systems will ingest the file. The mock has no format field for the report; its file name ends in .html only to show the recommendation, and is labeled as the owner's decision.

## Where a scripting path starts (not in the Export dialog)

- **Document and section:** `output-homes.md` 4, the rows "An in-app script console" and "An executable script export of the history"; `files-and-recipes.md` 3 (the methods text).
- **Old text:** "An in-app script console | rejected: graphty-element's session API is the scripting surface, documented under Help"
- **New text:** keep both rejections. Add nothing to the Export dialog. "Once graphty-element publishes calls that write the same exports, the methods text ends with one line naming the documentation page for those calls, and Help links to the same page. Until then there is no scripting entry anywhere in the app."
- **Why:** analysts who export the same figure every week ask for automation, and the framework's answer (the session API) belongs to graphty-element. A button in the Export dialog would cost every analyst a Tab stop and a promise the product cannot keep yet, to serve the few who automate; an earlier mock drew one, and it reads as a broken control. The methods text is where an automating analyst already looks for how the file was made. The calls it would name are graphty-element's published API, so their names are not designed here.

## Export: a figure's settings open under its selected row

- **Document and section:** `interface-specification.md` 3, the Export paragraph; `interface-templates.md` 20, the Export... row (figure).
- **Old text:** "Export copies Figma's Export section: a setting row of scale and format, "..." Advanced, remove, and the export button below"; the template: "each item with a checkbox and its own setting row".
- **New text:** add: "In the Export dialog a checked figure row shows its setting as read-only text ("2x PNG"); an unchecked row shows only its name and one line. The selected row opens its settings under it, joined to it and titled with its name ("Current view settings"): the setting row (scale, format, "..." settings, remove), then Copy as PNG. The "..." settings hold background (the view's own, otherwise Transparent; White and Light canvas as options), include legend (on or off) and the file-name suffix. There is no selection option: a figure never writes state marks; a reader who wants an element emphasized keeps it as a highlight, which is an object mark and is written. Default file names join the project and the suffix with an underscore and use no spaces (proteostasis-screen_current-view.png)."
- **Why:** settings drawn as a free block under the list could not say which figure they belonged to, and editable format fields on every row put about ten dropdowns in a list where a reader checks one or two things. Figma shows each row's setting read-only in its Export dialog and edits it in the Export section; the dialog cannot reach the inspector while it is open, so the selected row takes the Export section's place. `canvas-drawing.md` 13 says state marks are dropped "unless asked" but names no control that asks; an earlier mock offered "Selection: As on screen" and defaulted to it, which writes a momentary selection into a manuscript figure, and Figma exports highlights but never selection (`figma-crosswalk.md`). This entry proposes deleting "unless asked" from `canvas-drawing.md` 13. Spaces in file names break LaTeX includes and shell scripts. Drawn in screens/export-dialog.html, states 1 and 12.

## Export: the dialog's size, and its size on a small screen

- **Document and section:** `interface-templates.md` 20, Regions and rows.
- **Old text:** "Mantine `Modal`; body of rows; `ModalFooter` with the commit button." (no size)
- **New text:** add: "The Export dialog is up to 1200 wide and 860 tall, never more than the window less 16 at each side and 20 above and below. The kind list and the preview scroll on their own; the scope row and the footer with the commit stay in view."
- **Why:** the figure preview has to be near the size a reader will see the figure, or the legend and labels cannot be checked, which is the export's trust check (`task-flows.md` 9). A fixed 860 height would push the commit off a 1366 by 768 or 1280 by 800 laptop, common among the academic personas. Drawn in screens/export-dialog.html, state 10, at 1366 by 768.

## Undo and the other ways back: Undo history: each entry says how far it goes

- **Document and section:** `interaction-patterns.md` 3.4, the bullet "Until the element restores a canceled run on Redo, Edit carries an Undo history submenu"; `glossary.md` 13, Undo history.
- **Old text:** "the labels of the steps undo would reverse, newest first, where choosing one undoes back to it."
- **New text:** "the labels of the steps undo would reverse, newest first; choosing one reverses that step and every newer one. Under each label, in the menu item's description line, the entry says how far it goes: 'Undo back to here (3 steps)'."
- **Why:** "undoes back to it" reads both ways: stop before the entry, or include it. With three filter steps, choosing "Filter to degree >= 5" either keeps it or undoes it along with "Filter out group = 8"; the inclusive reading matches what Undo pressed that many times would do. This entry replaces three earlier proposals that each added chrome to the submenu -- a "Reverses 2 steps" line on hover, a dimmed Redo list below a separator, and a "-15 nodes" change on each filter-step entry (the last filed under "Failure and recovery: Undo history shows what each filter step changed", below, now withdrawn). The submenu is a recorded departure scheduled for removal, so it should not grow; the per-step counts in the steps popover ("Filter chip and its steps: the step row carries one count, and names what it took out on hover") carry "which step did it" permanently. The submenu also makes losing a good step a single click (flows/undo-and-ways-back.html, loss point 2b), which is a cost, not a route. Two-way door.
- **Revised after round 1 of the study:** the description line is added after all. In round 1 a participant hovered "Filter to degree >= 5" in Undo history and did not click, because nothing said whether it would also take back the good step after it; she guessed right only from Google Docs. "Undo back to here (3 steps)" answers that in the entry itself. It is one line of text in the existing item, not a new control (compact-mantine Menu item with a description). Drawn in screens/undo.html, Edit menu open, Undo history.

## Undo and the other ways back: a visible control that shows the change settles when Undo shows a notice

- **Document and section:** `interaction-patterns.md` 3.4, the bullet "Undo shows a notice only when its effect is out of sight"; 3.5, level 4 ("No notice confirms a state change the canvas or a visible control already shows").
- **Old text:** "decided by step kind: the step's owning panel is closed; the step canceled a run; or every id the step touched lies outside what is drawn."
- **New text:** "decided by step kind: no control in view shows the change (for a filter step, the filter chip in the left panel header; for a style layer, its row in the Styles list); the step canceled a run; or every id the step touched lies outside what is drawn. A popover or editor being closed does not by itself make a change out of sight when a control in the panel header or a list row shows it; 3.5's rule wins."
- **Why:** the two rules disagree on undoing a filter step with the steps popover closed. 3.4 says the owning panel (the popover) is closed, so show a notice; 3.5 says the chip, a visible control, already shows the change (28 turning to 41 of 77) and group 8 repaints on the canvas, so show none. The chip is the steps' home in view, and Figma gives Undo no feedback of its own, so the quiet undo holds; the notice stays for the case where the chip cannot be seen (left panel closed). Whether a chord user who presses Undo twice notices the chip's count change is loss point 1 of the study in flows/undo-and-ways-back.html; if it fails, the notice returns for filter steps with the count ("Undo notice: a filter step's notice carries the count left", below). Two-way door. Round 1 answered the question: five of five participants lost the good last step on their first Ctrl+Z. The quiet rule stays as version A of screens/undo.html, and "Undo of a filter step: one line that points to Filter steps" (below) is version B; round 2 decides between them.

## Undo and the other ways back: what clears Redo

- **Document and section:** `interaction-patterns.md` 3.4; `conceptual-model.md` 2 (selection is outside undo).
- **Old text:** (silent on what clears Redo)
- **New text:** add to 3.4: "Redo is cleared by the next undoable change and by nothing else. A selection change, Previous selection, a camera move, opening or closing a panel, and a hover do not clear it, so an analyst who pressed Undo too often while looking for a lost selection can press Previous selection and Redo in either order. Once cleared, Edit > Redo reads 'Redo' and is disabled, and a notice on screen drops its Redo."
- **Why:** the recovery from pressing Undo twice to get a selection back (flows/undo-and-ways-back.html, loss point 3) is Redo twice plus Previous selection, and neither the flow nor the framework said whether the order matters. Selection being outside undo implies it cannot clear Redo; stating it removes the doubt for developers and for the Redo-disabled state. Two-way door.

## Undo and the other ways back: the line's "Open Filter steps" puts the undone step back first

- **Document and section:** `interaction-patterns.md` 3.4 (the notice); `message-catalog.md`, the `undo.done` row. Applies only if the one-line version wins the round-2 comparison (see "Pending the round-2 comparison: a line when a filter step is undone", below).
- **Old text:** the round-1 decision gives the line's words, "Undone: {name}. Wrong step earlier? Open Filter steps", and says focus moves to the step list. It does not say what state the list opens in; the round-2 mock (screens/undo.html, state 2b) opens it at 41 of 77 with focus on the newest step, the degree step.
- **New text:** "The action first redoes every filter step undone since the line appeared, then opens Filter steps with focus on the row of the step just before the one it put back. The line itself never takes focus: it is announced politely, and focus moves only when the action is chosen (click, or Tab into the notice and Enter). A line with an action stays about 6 seconds, or until the next action; Redo stays on Edit and its keys, and the chip opens the list as always."
- **Why:** opened at 41 of 77, the list shows two steps, and unticking the wrong one there is a new change, which clears Redo (see "what clears Redo", above): the good step the analyst just undid by reflex is lost for good. That is exactly the round-1 failure (5 of 5 pressed Ctrl+Z first and lost the good last step), moved one click later. Putting the step back first makes the line's route two presses from the undo to the fix (the action, then Space). Moving focus without being asked would break the analyst's place and WCAG 3.2.2. The 6 seconds (as the round-2 mock already has it) is because the line now holds a question and an action to read, where "Undone: {name}" alone took about 3. Whether "Open" must say "put back" is a round-2 measure (flows/undo-and-ways-back.html, "What round 2 should watch"). Two-way door.

## Undo and the other ways back: turning off or deleting a step while Redo holds filter steps

- **Document and section:** `interaction-pattern-entries.md` 6.9 (Turn off) and 6.4 (Delete); `interaction-patterns.md` 3.4.
- **Old text:** (silent)
- **New text, only if round 2 shows the loss:** "While Redo holds filter steps, the steps list shows them below the applied steps as undone rows, in secondary ink with no checkbox and one action, Redo. Turning off or deleting an applied step still clears Redo, as any new change does." Until then: no change, and the flow marks the loss.
- **Why:** the flow's loss point 1. Undo once, open the chip, untick the wrong middle step: group 8, the step undone by the reflex, is gone, and the list gave no sign it was still recoverable a moment before. This is the most likely path for a quiet-undo participant who works out the fix after pressing Ctrl+Z. The rows would add chrome to the list for a state that should be rare, so the study decides. Two-way door.

## Undo and the other ways back: Ctrl+Y is also Redo, off macOS (published keymap: owner's decision)

- **Document and section:** `interaction-patterns.md` 3.4; the command register in `output-homes.md` 3 (Redo's keys); the key sheet graphty-element publishes.
- **Old text:** Redo is Mod+Shift+Z only.
- **New text:** "Redo: Mod+Shift+Z everywhere; Ctrl+Y as well on Windows, Linux and ChromeOS. The Edit menu shows Mod+Shift+Z; the key sheet lists both. On macOS Cmd+Y is not bound, because browsers there use it for history."
- **Why:** in round 1, two of five participants pressed Ctrl+Y to redo and nothing happened -- the key Google Sheets, Excel, Word and most Windows software use. Adding it breaks nothing: no graphty command uses Ctrl+Y. Drawn and wired in screens/undo.html. A default key binding is part of the published keymap, so the owner decides.

## Undo of a filter step: one line that points to Filter steps (to be decided by round 2)

- **Document and section:** `interaction-patterns.md` 3.4, the bullet "Undo shows a notice only when its effect is out of sight"; `principles.md` ("undo is silent and exact"); `message-catalog.md`, a new row beside `undo.done` and `redo.done`; `content-design.md` 4, the notice cap.
- **Old text:** undo is silent while a visible control shows the change (the entry "a visible control that shows the change settles when Undo shows a notice", above).
- **New text, if version B wins:** "When Undo or Redo reverses a filter step and the steps list is closed, one notice shows: 'Undone: {name}. Wrong step earlier?' (or 'Redone: ...') with one action, Open Filter steps, which opens the list and puts focus on its newest step. It times out after about 6 s, the longer-message timing of 3.5 level 4. No other undo gains a notice." Proposed key: `graphty.undo.filterStep`, parameters {verb}, {name}.
- **Not used:** an action that turns off "this step". The step just undone is usually the good one -- in round 1 the step a first Ctrl+Z took back was the good last step every time -- so "Turn off just this step instead" would point at the wrong step.
- **Departures to record if B wins:** the line is 8 words before its action, over the 6-word notice cap of `content-design.md` 4 (Figma's toasts run 2 to 8); and it breaks "undo is silent" for one step kind.
- **Why:** five of five participants lost the good last step on their first Ctrl+Z and had nothing but the chip's count to tell them; the only fix that kept the good step was turning the middle step off in Filter steps, and only the participants who opened the chip found it. Whether a notice is worth breaking "undo is silent" is disputed, so screens/undo.html builds both: version A (silent while the chip is in view) and version B (this line). Round 2 compares first-Ctrl+Z recovery and time to the steps list across the two. Two-way door until the message key is published.

## Keyboard walk: Shift+Arrow walks, and what each of the four does

- **Document and section:** `interaction-pattern-entries.md` 9.2 (Entry, "The arrow keys move focus", Camera keys) and 9.3 ("The walk takes the arrows only with the camera step controls"); `interaction-patterns.md` 3.6, the dispatch table rows "the canvas, no walk" and "the canvas walk", Arrows column; `element-needs.md`, "The plain arrow keys moved from the camera to the walk"; `one-way-doors.md` 40 and 65.
- **Old text:** "The first arrow press on the canvas starts the walk" ... "The arrow keys move focus to a neighbor of the focused node, in the element's stable neighbor order" ... "The arrows walk; the camera has no arrow binding." Dispatch rows: "the first press starts the walk"; "move to a neighbor".
- **New text:** "Plain arrows move the camera (pan in 2D, orbit in 3D), as they do today. Shift+Arrow walks. The first Shift+Down or Shift+Right starts the walk at the anchor and steps to its first neighbor. Shift+Down steps into the focused node's own neighbors (the focused node becomes the node stepped from). Shift+Right and Shift+Left move to the next and previous neighbor of the node stepped from, without wrapping; at either end the polite region says 'last neighbor' or 'first neighbor'. Shift+Up is the walk-back key: it retraces the path actually walked, one Shift+Down per press, and restores the position among that node's neighbors, so Shift+Down returns to where the analyst was. Shift+Home is the walk-home key: back to the anchor, path kept. At the anchor, Shift+Up says 'At the start, {label}'." Dispatch rows: "the canvas, no walk" Arrows: "move the camera; Shift+Down or Shift+Right starts the walk"; "the canvas walk" Arrows: "move the camera; Shift+Arrow as 9.2".
- **Why:** the owner decided on 2026-09-28 that plain arrows keep orbiting and panning and Shift+Arrow walks (owner-feedback.md). The framework also never said which of four arrows goes where; a graph walk has two axes (along the neighbor list, and deeper), so this uses the tree-view convention screen-reader users already know (Right and Left among siblings, Down in, Up back out). It is also Figma's own layer-navigation model (Enter goes to children, Shift+Enter to the parent, Tab to the next sibling) moved onto Shift and the arrows, because on graphty's canvas Tab must leave (9.2, WCAG 2.1.2) and Enter selects. Drawn frame by frame in storyboards/keyboard-only.html and as a state diagram in flows/keyboard-walk.html. **Conflict with the list rule:** in every list, tree and grid of the app Shift+Arrow extends a row selection (9.1, the WAI-ARIA multi-select convention); on the canvas it moves focus and never extends. The same chord means "extend" one Tab stop away, which is the inconsistency a screen-reader user is most likely to trip on when Tab takes them from the canvas to the Nodes table. The owner decided the walk keys knowing this; the keyboard-only study should watch for it, and the walk-back key is already a separate decision below. **Conflict to settle:** today Shift+Arrow pans the 3D camera (`graphty/src/components/shell/bindings.ts`, `panOrOrbit`); that binding must move (a suggestion: Ctrl+Arrow pans in 3D, never Alt+Arrow, which is browser Back). The keymap is published behavior (door 65), so the owner decides.

## Keyboard walk: the neighbor order is stated and spoken

- **Document and section:** `interaction-pattern-entries.md` 9.2, "in the element's stable neighbor order"; `message-catalog.md`, row `walk.position`.
- **Old text:** "in the element's stable neighbor order"; `walk.position`: "{label}, neighbor {i} of {N}[, {direction}]".
- **New text:** "Neighbors are ordered by a stated key: the graph's declared edge weight, highest first, then label; with no weight declared, by label. The first announcement after each Shift+Down names the key and the node's measure: `graphty.walk.position.first` '{label}, neighbor {i} of {N} of {from}[ in filtered graph], by {key} {value}. {measure} {m}, rank {r} of {total}.' The measure is the one the node size encodes, else the one the color encodes, read from the element's style explanation; with neither, degree. The rank uses the one rank format (`content-design.md` 5), spoken 'rank 3 of 77', a tie 'rank 12 to 17 of 77'. Every other step is `graphty.walk.position` '{label}, {i} of {N}, {value}.' with no measure; the walk-position line shows the measure on every step. The walk's very first announcement appends the exits, and the member-walk keys when anything is selected, as 9.2's Entry requires: 'Shift+Up goes back, Esc ends the walk, Tab leaves the canvas. ] and [ step through the selection.' A walk that starts with nothing selected names the member-walk keys once, after the announcement of the first node Space adds ('RPA2 added. 1 selected on canvas. ] and [ step through the selection.'), because until then they have nothing to step through." Example from the protein fixture: "PALB2, neighbor 1 of 32 of TP53, by confidence 0.98. Degree 5, rank 247 of 300."
- **Why:** a spoken list whose order is secret cannot be reasoned about, and the screen-reader persona distrusts any number without its definition. Ordering by the evidence (confidence) puts the strongest partner first, which is what an analyst would have sorted by. The repeat form stays short and fixed in shape because a fast-speech user hears it hundreds of times; a measure on every step adds about a second of speech per step, and a fixed "degree" is a number the analyst did not ask for once they have sized or colored by PageRank or betweenness. A bare "rank 12" breaks the one rank format and is ambiguous out loud (rank among what?). **Untested, for the keyboard-only study:** whether the bare order value after the first step ("Javert, 3 of 36, 17.") is understood or needs its unit ("17 shared"), and whether the measure is wanted on every step or behind a describe-the-focused-node key (a new published key, so not proposed here). Drawn in flows/keyboard-walk.html; storyboards/keyboard-only.html and screens/keyboard-walk.html still speak degree and a bare rank on every step. Message keys and texts are published (PR #586), so the wording is the owner's call.

## Keyboard walk: counts inside a filter say so

- **Document and section:** `interaction-pattern-entries.md` 9.2, "Each move fills the walk-position slot".
- **Old text:** (silent on whether the neighbor count is over the filtered or the full graph)
- **New text:** "The walk moves within the filtered graph. When a filter step is on and a node has neighbors outside it, the count says 'in filtered graph'. Degree and rank read the degree column, over the full graph."
- **Why:** in the storyboard RPA2 has 6 neighbors in the TP53 slice but degree 11. Without the qualifier the two numbers contradict each other out loud.
- **Superseded in part:** the last sentence, by "Filter chip and its steps, FOR DECISION (element filter-step contract)": with a step on, degree reads the filtered graph, and the full-graph degree follows, named, where it differs.

## Keyboard walk: where the walk-position slot is drawn, what it holds, and the fit that keeps nodes clear of it

- **Document and section:** `interaction-pattern-entries.md` 9.2 ("Each move fills the walk-position slot"); `interface-specification.md` 2, "Above the toolbar, surfaces stack as secondary bar, then notice", and the compact-mantine row for `SecondaryToolbar`; `interaction-patterns.md` 3.1, "The camera" (fit).
- **Old text:** (the walk-position slot is named but never placed, and nothing says what it holds; `SecondaryToolbar` is the armed tool's options bar)
- **New text:** "While the walk is active, the walk-position slot is a one-row status bar in the secondary bar's place above the toolbar, `role=status` but silent, because the polite region already speaks. It holds three things only: the focused node's label, its position as '{i} of {N} from {label stepped from}' (or 'selected {k} of {n}' on the member walk, 'start of the walk' at the anchor), and the walk-back key as a key cap. The confidence value, the measure and the full sentence stay in the live region; the path walked is not drawn. It never shows when the walk is off. An armed tool's secondary bar and the notice stack above it. It is a new compact-mantine part, a status bar sized like `SecondaryToolbar`, not `SecondaryToolbar` itself, whose role stays the armed tool's options. **The fit keeps nodes clear of canvas chrome:** the host tells graphty-element the insets its canvas overlays take (the toolbar dock with the slot's row above it, whether or not the walk is on, so starting a walk never moves the drawing), and fit places the drawing inside them; keeping the focused node in view uses the same insets."
- **Why:** the first version put the path walked, the full position sentence with the confidence and two key caps in a two-row bar up to 860 px wide; at 1440 x 900 it covered four of TP53's neighbors that the walk visits next (SMAD5, WRN, SNRPD3, PCNA), and the toolbar covered a fifth (LTBP1) in every state, because the drawing was fitted to the whole canvas and only the focused node was kept in view. A sighted keyboard user could not see the nodes they were about to reach. Cut to three items the slot is about 280 px, fits beside the legend card, and the fit inset (116 px at the bottom: the dock's 60, an 8 px gap, the slot's 32 and 16 clear) leaves every one of the 33 nodes visible in every state, walking or not (checked in screens/keyboard-walk.html, all held states). `SecondaryToolbar` carries an armed tool's controls; putting status text in it would give one component two meanings. Fit is graphty-element's (it owns the camera), so the insets are an element need: a fit padding the host can set, which the app would otherwise work around by shrinking the canvas.

## Keyboard walk: one hint for a plain arrow

- **Document and section:** `interaction-pattern-entries.md` 9.2; `message-catalog.md` (new row).
- **Old text:** (none)
- **New text:** "The first plain arrow press on the canvas in a session, with no walk active, says once in the polite region: `graphty.walk.hint` 'View moved. Shift+Arrow walks the graph.' Later camera moves say nothing."
- **Why:** with arrows on the camera, a screen-reader user's first instinctive press moves a picture they cannot see and hears nothing. One hint costs one utterance per session. The canvas's description on arrival already says 'Shift+Arrow walks the graph', so the hint is heard twice in a session on purpose: the arrival text is the first thing a fast user talks over with their next key, and the second copy comes at the moment of the mistake, where it is needed (storyboard frames 1 and 2).

## Tab to and from the canvas, and the table after it

- **Document and section:** `interaction-pattern-entries.md` 9.1 ("Tab moves only inside a region, except on the canvas, which Tab leaves", and the region-cycle order in its first sentence).
- **Old text:** "The region-cycle chord and its reverse cycle Figma's measured regions in its order: the rail and left panel, the right sidebar, the toolbar, the bottom dock (graphty's addition), Help, the canvas." (silent on where Tab lands when it leaves the canvas, and on how Tab reaches it)
- **New text:** "The region-cycle chord and its reverse cycle the regions in this order: the rail and left panel, the right sidebar, Help, the toolbar, the canvas, the bottom dock (graphty's addition). Tab follows the same order at the three places it crosses a region: Tab from the toolbar reaches the canvas, Tab from the canvas lands on the bottom dock's table, Shift+Tab from the table returns to the canvas and Shift+Tab from the canvas to the toolbar. Tab from the canvas lands on the row of the first selected node in the selection's own order (the order the member-walk keys use), scrolled into view, and the announcement adds '{k} of {n} selected' when several are selected; with nothing selected, it lands on the table's last-focused cell, else the first row."
- **Why:** the table is the drawing's text equivalent. Leaving the drawing should land on the same data as rows, not wrap to the rail, and on the row of what the analyst was just working on rather than wherever the grid was last left (the two differ whenever the selection changed on the canvas). With the dock placed before the canvas, as 9.1 has it, Tab and the region chord would move through the same regions in two different orders. Figma's measured order has no dock and ends at the canvas; graphty added the dock, so where it sits is graphty's choice, and after the canvas is the only place that agrees with Tab. Help moves before the toolbar so the toolbar and the canvas are adjacent in both orders. The brief for the keyboard storyboard also has Morgan Tab onto the canvas, which the "Tab stays in a region" rule does not allow without this. Drawn in flows/keyboard-walk.html.

## A default key for Previous selection

- **Document and section:** `interaction-pattern-entries.md` 4.4 and 9.4; `message-catalog.md` `selection.cleared` ("{chord}: Previous selection").
- **Old text:** (Previous selection has "its chord" but no default is named anywhere)
- **New text:** "Previous selection's default chord is {Mod+Alt+Z or Mod+Shift+D, the owner's choice}, in the element keymap, matched by physical key (`code`)."
- **Why:** the selection-cleared announcement must speak a real key, and a second Esc is the easiest way to lose a hand-built selection. Mod+Alt+Z sits beside undo, which is where analysts look for "get it back", and is not reserved by Chrome, Firefox, NVDA or JAWS on the canvas. Published keymap (door 65): the owner decides.
- **Check before the owner decides (Windows AltGr layouts):** on Windows, Ctrl+Alt is AltGr, and 9.2 already guards `]` and `[` against AltGr layouts; this default gets the same check. On the Polish (Programmers) layout AltGr+Z types z with a dot above (&#380;) and AltGr+X types z with an acute, so in a text field Ctrl+Alt+Z cannot be Previous selection, and on the canvas the key event arrives with key "&#380;" rather than "z". German (T1) and French (AZERTY) have no AltGr character on the Z key in the layout tables, which needs confirming on a real machine. The proposal therefore adds: "Previous selection matches the physical Z key (`code` KeyZ) with Mod+Alt, on the canvas and in lists only; in a text field the layout's AltGr character wins." If that is judged too subtle, the alternative is Mod+Shift+Alt+Z, which needs the same layout check. On macOS the chord is Cmd+Option+Z; no conflict with Safari, Chrome or VoiceOver is known, and it has not been tried with VoiceOver running.
- **Against Mod+Alt+Z (Photoshop):** the precedent this command cites, Photoshop's Select > Reselect, is bound to Ctrl+Shift+D (Cmd+Shift+D). Photoshop binds Ctrl+Alt+Z to Step Backward, which walks back through history, that is, undo. So Mod+Alt+Z puts "Previous selection, which is not undo" on the chord Photoshop-trained hands read as undo: the exact confusion the command exists to prevent. Together with the AltGr problem above, that makes Mod+Alt+Z the weaker candidate.
- **The alternative to decide between: Mod+Shift+D**, Reselect's own chord, carried over for the same meaning. It needs its own checks: Chrome and Firefox bind Ctrl+Shift+D to "bookmark all tabs" on Windows and Linux, and whether a page may take it with preventDefault must be confirmed in each browser (Chrome reserves only a short list of chords, but this has not been tried); Cmd+Shift+D in Safari is "add to reading list" on some versions. D carries no AltGr character on Polish, German or French layouts in the layout tables, to be confirmed on a real machine. Match it by `code` KeyD, as for Z.
- **Decision owed (owner, published keymap):** Mod+Alt+Z or Mod+Shift+D. screens/undo.html shows either (a setting in its bar) and marks the key "proposed" in the Edit menu itself; the participant view hides that word.
- **Superseded** by "Ctrl+Z restores a cleared selection (replaces 'Selection stays out of undo')" below. The Previous selection command and its key are gone, so no key is owed and nothing here is asked of the owner.

## Take a note: a note is written in the Note editor beside its targets, where it is also read

- **Document and section:** `task-flows.md` 7 (the diagram's node "Inspector: Notes, a new note focused" and the step table's "write" row); `interaction-patterns.md` 2, note [c]; `interface-specification.md` 3, the Notes row.
- **Old text:** task-flows.md 7: `NS["Inspector: Notes, a new note focused"]`; write row: "the note | typing | Edit in the inspector and one popover (6.2)". interaction-patterns.md 2 [c]: "A click on a note selects its targets, brings them into view and opens the note editor beside them". interface-specification.md 3: "Notes | `Tree` rows; absent when no note targets the object, which is reached by the Note tool or Add note".
- **New text:** task-flows.md 7: `NS["Note editor beside its targets, a new note focused"]`; write row: "the Note editor | typing | the Note editor, one popover (6.2)". interaction-patterns.md 2 [c], append: "The same Note editor is where a new note is written: Add note, the '+' of a Notes section and a Note-tool click all open it beside the note's targets, as Figma's comment composer opens at its pin and the posted thread opens in the same spot. It is placed clear of its targets, never over them. A note about something with no place on the canvas opens it beside the row or editor it was started from (a result's editor, its Notes row); a note about the graph opens it at the canvas's top right, beside the inspector that shows the graph." interface-specification.md 3, the Notes row: "`Tree` rows, clamped to two lines, and '+', which opens the Note editor beside the object; absent when no note targets the object. A row click opens the note in the Note editor."
- **Why:** the framework wrote a note in one place (the inspector's Notes section) and read it in another (the editor beside the targets, note [c]), with no graph reason for the split. One place for both is Figma's paved path, keeps the note next to what it is about while it is written, and frees the Note tool from having to change the selection (next entry). Drawn in flows/take-a-note.html and screens/take-a-note.html, states 2 to 8.

## [Withdrawn 2026-09-28: there is no Note tool] Take a note: a Note-tool click targets without selecting (withdraws "A Note-tool click selects what it targets")

- **Document and section:** `interaction-pattern-entries.md` 5, the paragraph "The Note tool stays armed".
- **Old text:** "While it is armed, a click on an element targets it, Shift+click adds targets, a click on empty canvas targets the graph, and typing starts once the first target is chosen."
- **New text:** "While it is armed, a click on an element targets it without changing the selection, Shift+click adds targets, a click on empty canvas targets the graph, and the Note editor opens beside the targets with its text focused. The target keeps the hover hairline while its note is open. A click on a new target while a note is open first ends that note, adding it if it has text or dropping it with no undo entry if it is empty, then starts the next. In the Note editor the first Esc adds the note (or drops it if empty) and closes the editor, because its text is its only field; the next Esc is rung 2 and disarms the tool. The secondary bar reads 'About {targets}', 'Shift+click adds. Esc: done with this note.'"
- **Why:** an earlier version of this file proposed that a Note-tool click also select what it targets, because the new note was written in the inspector, which shows only the selection. With the note written in the Note editor (previous entry) that reason is gone, and the cost was real: a fraud analyst annotating three accounts in a row with the tool threw away the 14-account selection she had built. Figma's Comment tool never changes the selection either. The rule for a pending note answers the case the tool exists for, several notes in a row. The Esc order matches the field rule (`interaction-patterns.md` 3.6: "multi-line prose (a note) keeps what was typed and leaves"), and the bar's hint says what Esc will do so no analyst expects it to throw the text away. Drawn in screens/take-a-note.html, state 4.

## [Withdrawn 2026-09-28: there is no Note tool; the chart's Note-tool line is deleted instead] Take a note: the pointer-tool chart says a Note-tool click commits nothing

- **Document and section:** `interaction-patterns.md` 3.8, the pointer-tool state chart and the paragraph under it.
- **Old text:** chart: "Armed --> Armed : click with the Path or Note tool (each click is one committed step)"; paragraph: "With the Path or Note tool, each click is already a committed step, so Esc only disarms and keeps what was added; a note's text is a field and follows the field rule (3.6)."
- **New text:** chart: "Armed --> Armed : click with the Path tool (one committed step); click with the Note tool (starts a note, committed with its first text)"; paragraph: "With the Path tool each click is already a committed step, so Esc only disarms and keeps what was added. With the Note tool a click only chooses targets and opens an empty note; the note is committed by its first text (`interaction-pattern-entries.md` 6.1), and its text follows the field rule (3.6)."
- **Why:** the framework contradicts itself. `task-flows.md` 7 ("no undo entry until text is committed") and `interaction-pattern-entries.md` 6.1 ("A note is added only when its first text is committed") follow Figma, whose comment exists only once Enter posts it; the chart gives every Note-tool click an undo entry. Built from the chart, an analyst who clicks an account and changes her mind would leave an empty note and an undo entry behind. flows/take-a-note.html follows 6.1 and names the contradiction.

## Take a note: Enter adds a note; Shift+Enter starts a new line

- **Document and section:** `interaction-pattern-entries.md` 6.1, Exceptions, the sentence on "A note".
- **Old text:** "A note is added only when its first text is committed, and Esc on an empty note leaves nothing and no undo entry, as Figma's comment composer creates nothing until Enter posts it"
- **New text:** append: "In the Note editor, Enter commits and Shift+Enter starts a new line, as in Figma's comment composer; Esc with text typed commits it (`interaction-patterns.md` 3.6). Discarding an empty note is part of the notes collection's commit rule and belongs to graphty-element."
- **Why:** the framework says a note is committed but not by which key. Figma's composer is the paved path. It has a known cost: in a chat-style composer, Enter posts half-written text by accident, and a note that runs to several lines is more exposed than a short Figma comment. So it is a study question (flows/take-a-note.html, Open questions): if the personas' notes run to several lines, the proposal becomes Mod+Enter to add and Enter for a new line, a stated departure from Figma. Seen in screens/take-a-note.html, states 2, 4 and 6.

## Take a note: how a note cites a run and quotes a value

- **Document and section:** `conceptual-model.md` 6 (the model), and a new sentence in `interaction-pattern-entries.md` 6.1 or 6.2 (the behavior).
- **Old text:** "It cites runs and filter steps, may quote values, and stores target ids, never coordinates." (nothing says how a citation or a quote is made)
- **New text:** "A note about a result cites that result when it is created; every other new note starts with no citation. In the Note editor, the Cites row offers 'Cite a run...' (a picker of the project's runs and filter steps, each with its scope) and removes a citation with its x; the Quotes row offers 'Quote a value...', a search over the values of the note's own targets: their attributes, and the values of the runs the note cites. Both pickers live inside the Note editor, so nothing is selected or opened and the draft never loses focus to another object."
- **Why:** task flow 7's trust check is "the note names its targets and cited runs, with their scope", and the freshness pattern marks a quote whose live value differs, but no step makes either. An earlier version of this file proposed 'Quote in note' on the context menu of every reading. That cannot work: the inspector shows only the selection, so quoting another element's value means selecting it, which moves focus off the draft and commits it by the field rule. Limiting the picker to the note's targets and cited runs covers the case that matters (the mule ring note quotes one ring member's PageRank) without a second route. Guessing citations from the target would cite runs the analyst never read. Shown in screens/take-a-note.html, state 2. The published names of these commands are the owner's call.

## Take a note: a quote whose live value differs is marked "now {value}"

- **Document and section:** `glossary.md` 10, the Marks table (new row).
- **Old text:** (no mark for a quote; `element-contract.md` records "whether each live value differs")
- **New text:** "| **now <value>** | a note's quoted value differs from the live value; the quote keeps the value as written |"
- **Why:** the marks are closed and none says that a quoted number changed. A note used as an audit trail must keep what it said and show the difference beside it, never overwrite it. In the kit's data, the mule ring's ACC-753261 quoted at 0.000551 in March is 0.000428 in April, where ACC-946224 now ranks highest in the ring: the note's claim needs checking, and only the mark says so. Drawn in screens/take-a-note.html, state 8, beside the citation's "Earlier data" and its one verb, Use current (`glossary.md` 10).

## Take a note: the About line (published key: owner's decision)

- **Document and section:** `message-catalog.md` (new row) and `content-design.md` (the note's labels).
- **Old text:** (none)
- **New text:** a key `graphty.note.about`, "About {targets}", where one target is its name, a set adds ", {N} {member kind}" ("About Mule ring, 14 accounts"), several targets read "{N} nodes" or "{N} elements", and the graph reads "About the graph {graph name}" ("About the graph Transfers"). Shown as the first line of the Note editor, before a word is typed, after the glyph of the target's kind; the Notes panel row shows the same text without "About".
- **Why:** flow 7's first failure is a note written with nothing selected landing on the graph instead of the set the analyst meant. The About line is the check that catches it before typing, so it needs one fixed wording, used character for character on every page. Shown in screens/take-a-note.html, states 2, 4 and 6. The key is published, so the wording is the owner's call.

## Take a note: correcting and deleting a note are undo steps

- **Document and section:** `output-homes.md` 3.7, the command table (new rows beside Add note).
- **Old text:** (only Add note is listed)
- **New text:** "| Edit note | `edit-note` | the Note editor (a click in a posted note's text) | note edit | 'Edit note' | -- | E |" and "| Delete note | `delete-note` | the Note editor's overflow; a Notes row's context menu | note delete | 'Delete note' | Delete on a focused Notes row | E |". Each is one undo entry. A deleted note takes its citations and quotes with it; the runs it cited are untouched. Use current on a stale citation is an Edit note.
- **Why:** a note kept as the audit trail for a suspicious-activity report needs a correction path and a deletion path the undo history can show and reverse, and the framework names neither. Retargeting a note is not proposed: it is an open question on flows/take-a-note.html.

## [Withdrawn 2026-09-28: there is no Note tool, so no key C] Take a note, FOR DECISION (published keymap): the note tool key is C

- **Document and section:** `output-homes.md`, the Add note row ("note tool key (E)", where E is the owner marker, graphty-element); `interaction-pattern-entries.md` 5, the Note tool row ("the note tool key").
- **Old text:** "the note tool key" (no key named)
- **New text:** "the note tool key, C by default, in the element keymap"
- **Why:** C is Figma's Comment key, so a Figma user finds the tool where they expect it; E, the obvious letter for a note, is Figma's Ellipse key and would teach the wrong reflex. A published shortcut is part of graphty-element's contract, so the owner decides. Check against the element keymap before deciding: if C is already bound, this entry has to name the conflict.

## [Answered 2026-09-28, on the owner's behalf: no Note tool for now; test the several-notes-in-a-row case first] Take a note, QUESTION FOR THE OWNER: keep the Note tool, or leave notes to Add note

- **Document and section:** `interaction-pattern-entries.md` 5, the Note tool row and paragraph; the toolbar in `interface-templates.md` 14.
- **Old text:** (the Note tool is a toolbar mode)
- **New text:** (none yet: a question)
- **Why:** Add note already has six ways in (an object's overflow, a result editor's menu, the graph's type-row menu, Quick actions, the context menu, and a Notes section's "+"), and by the flow's own count the tool saves nothing for one note (Add note: 1 step and 1 travel; the tool: 2 steps). The tool's only extra value is writing several notes in a row without changing the selection, and no persona evidence yet says analysts do that. Before deciding, the study should put the several-notes-in-a-row case to the fraud and bioinformatics personas. Until it is settled, nothing here makes the tool more capable than the entries above need.

## The start screen says, before anything loads, that files stay on this computer

- **Document and section:** `interface-templates.md` 19, Start screen, "Regions and rows"; `message-catalog.md`, a new row after `start.empty`.
- **Old text:** (none: the start screen lists recents, samples, Open... and Connect to data source... and says nothing about where a file goes)
- **New text:** "Under the title, one `Text` line in secondary ink, which is also the title's accessible description: `graphty.start.local`, 'Files stay on this computer. graphty reads them in this browser and uploads nothing.' Owner: app. It is true only while no Assistant provider is set; with one set, the line adds 'The Assistant sends what you ask it about to {provider}.'"
- **Why:** four of the study's personas, each built from public sources, name "where does my data go" as a condition before any of their own data goes in: the recipe recipient asks it outright, citing university guidance that uploading research data to a public tool discloses it (study/personas/recipe-recipient.md, "Where does my data go?"); the genomics user will not upload unpublished data to a server she cannot vouch for (study/personas/genomics-cytoscape-user.md); the Gephi holdout has IRB-bound datasets (study/personas/gephi-holdout.md); the recommender engineer says a privacy review would kill a tool that uploads (study/personas/ml-engineer-recsys.md). The design has no place that answers it; a privacy page one click away is not read at that moment. For the first-time business user the evidence is weaker (her persona is suspicious of tools that want an account or an install, and her data is a company export), so for her this is **a hypothesis for the study**: does she read the line, and does it change what she loads? The wording is chrome, so it stays the app's, like `graphty.start.empty`. Drawn in screens/start-screen.html and screens/first-look.html, state 1. **Evidence status: a hypothesis.** Every quote behind it so far comes from simulated personas (first-look storyboard; study/personas/fraud-analyst.md, voice 12; study/personas/recipe-recipient.md), and they agree on the wording more closely than real people would. It needs real sources (forum posts or interviews about uploading data to web graph tools) or the owner's own review before it is decided. **Budget:** it is the one sentence on this empty surface, an exception to `content-design.md` 4's "no sentence" that needs a ledger row in `principles.md` naming it; with it the start screen carries 24 words of app text at first run (title 3, this line 15, Samples 1, Open... 1, Connect to data source... 4), 28 with recents, 34 with an Assistant provider set, all within principle 5's 50. The fallback, if the owner rejects the exception, is to put the line under an (i) on Open.... Drawn in screens/start-screen.html, every state; state 9 draws the Assistant sentence.
- **Revised after the first study round:** the lock line ends in a link, "Where your data goes", to a plain page written to be forwarded (what stays in the browser, what a data-source query or the Assistant sends and to whom, what the page does not promise). A second line follows it, `graphty.start.projects`, 'Projects are kept in this browser.', with a database icon; while the browser keeps no projects, the existing "This browser is not saving projects." caution takes its place. **Why:** in the study, people learned that projects live only in this browser from an error message (a recent that no longer opens), and IT reviewers could neither check nor forward "uploads nothing". **Budget:** the link adds 4 words and the line 6, so app text at first run is 34 words (50 with the sample names and sizes), 38 with recents and 44 with an Assistant provider set, still within principle 5's 50; the recipe card state carries 50 words of app text, at the limit. Drawn in screens/start-screen.html, every state.

## The load step names numbers stored as text as its own issue

- **Superseded in part:** the "{K} of {N} values are numbers" variant (some values not numbers) now blocks Load, and the every-value case defaults to reading as a number; see "Load and characterize: which load issues block Load".
- **Document and section:** `interface-templates.md` 20a, the issues list; `message-catalog.md`, a new row after `load.parallelEdges`; `task-flows.md` 2, "First failure".
- **Old text:** `task-flows.md` 2 names "a weight column read as text" as a first failure, but no issue, message or policy exists for it.
- **New text:** "`graphty.load.textNumbers`: heading '{column} is read as text, so it cannot {role}' ('value is read as text, so it cannot weigh edges'), a line 'Every one of the {N} values is a {number kind} written in quotes ("8")' or '{K} of {N} values are numbers', and a `StyleSelect` of two policies each stating its result in counts: 'Keep as text: edges unweighted' and 'Read as number: {K} weighted edges' ({N-K} left empty, when K is less than N). Listed first among warnings with the warning glyph; committed by the footer; the chosen policy is written to the import report, and the Last import row reads '{column} read as number'."
- **Why:** `task-flows.md` 2 already names "a weight column read as text" as the first failure and `top-tasks.md` lists "a weight read as text" among the broken imports a first look must catch; both call it silent, because every weighted measure afterwards runs as if all edges were equal and nothing on screen says so. Newcomers meet import traps like it often and blame themselves: a CSV that "sometimes will work and sometimes won't", a stray space that makes one person two, rows that silently do not appear (study/personas/explorer-elena.md, "Import is a trap", with its sources). Stating it before the load, with the quotes visible in the sample rows, lets the reader see the cause in her own data. **Superseded in part:** which policy is preselected is settled by the later entry "A weight column that is not all numbers blocks Load until the analyst chooses" (no default; Load is off until the reader chooses) and the placement of the fix by "Load and characterize: which issues block Load, and where the fix sits" (on the issue's row); screens/first-look.html, states 3a and 3b, draw both. The two message keys proposed across these entries (`graphty.load.textNumbers`, `graphty.load.notNumber`, `graphty.load.blocked`) are one message and need one key, the owner's call. The detection is the element's (its load preview).

## A file chip names the file the graph was read from

- **Document and section:** `interface-templates.md` 2, Graph panel, header; `interface-specification.md` 1.2 (the left panel header).
- **Old text:** "header (project name with Not saved and View only beside it, chevron `Menu` ...; the filter chip under the name, section 7)"
- **New text:** "...; under the name, the file chip then the filter chip, wrapping. The file chip (a Mantine `Pill`, file glyph, the file name with the identifier face, ellipsized from the middle) names the file the current graph's data version was read from, from the load on; its tooltip gives the load date and row counts, and it opens the Last import report. Absent for a sample or a graph built in the app."
- **Why:** after Replace data or a drop, the project name no longer says which data is on screen, and the Last import row answers it only with nothing selected. That a reader checks the file name first when a number looks wrong ("is this the March file?") is the design team's expectation, not yet evidenced by a source or a session: **a hypothesis for the study**, to be checked in the weekly-return and first-look sessions (does a participant look at the chip, or anywhere, to tell which file is loaded?). Drawn in screens/first-look.html, states 4 to 7.
- **Superseded in part:** the chip does not open the Last import report, and its tooltip carries no date or counts; see "Main frame at rest: the file chip's popover holds the data file only".

## Quick actions marks a measure a style layer already shows

- **Document and section:** `interface-templates.md` 15, Quick actions, "Regions and rows"; `task-flows.md` 3, the "choose" step.
- **Old text:** "input; one list of recents, commands, then catalog entries (`ResultRow`)."
- **New text:** add: "A catalog entry whose value a style layer already paints shows 'already shown as {channel}' in place of its cost word, and still runs."
- **Why:** the project's persona record says the first-time user "relies heavily on visual cues like node size and color to understand importance" (design/designloom/personas/explorer-elena.yaml, behaviors), and her study persona reads a big dot as a big customer without checking the legend (study/personas/explorer-elena.md, Voice 19, marked there as a behavioral assumption). The one moment the reader compares measures is Quick actions, so saying there that degree is what the size already shows might correct the reading at the point of choice, without a tutorial. Whether it does is **a hypothesis for the study** (the first-look session's first watch item); if participants still read size as importance after seeing it, the size channel needs to name itself on the canvas. The fact (which layer writes which channel from which attribute) is the element's `graphty.styles.explain`; the app only draws it.


## Run and read: a result editor's state line always names its scope

- **Document and section:** `glossary.md` 10, the paragraph above the states table; `task-flows.md` 3, the trust check "Scope, edge reading and method named on the run's state line".
- **Old text:** "A state line shows one state, then the scope when it differs from the filtered graph."
- **New text:** "A state line shows one state, then the scope when it differs from the filtered graph. **The result editor's state line always names the scope with its counts** ("on: full graph, 300 nodes, 3 components"), then exact or estimated, the edge reading and the engine, because it is where the number is read and quoted. A result's row in a list names the scope only when it differs."
- **Why:** the two rules disagree on the most common case, a run on the full graph with no filter: the glossary hides the scope, the task flow's trust check requires it. A number copied from the editor with no scope beside it fails the flow's own claim ("on this scope"). Keeping the list row terse holds the principle-5 word budget where many rows stack. Drawn in screens/run-and-read.html (states 3 and 7, where the finished rows carry no second line on the full graph) and flows/run-and-read.html.

## Run and read: where focus goes after Cancel in the running notice

- **Document and section:** `interaction-patterns.md` 3.6, item 7.
- **Old text:** "After Redo or Cancel focus stays where it is: Run becomes the row's primary command and the polite region names it (WCAG 3.2.2)."
- **New text:** add: "Cancel pressed in the running notice removes the notice, so focus cannot stay where it is: it moves to the result's row when the Results panel is open, and otherwise returns to the control that held focus before the notice took it. The polite region names the result and Run either way."
- **Why:** the notice is the one place Cancel lives while the panel is closed (`interaction-pattern-entries.md` 7.1), and a keyboard user who reaches it would otherwise lose focus to the page when it disappears, which item 6 forbids. The notice shows only while the Results panel is closed (`figma-crosswalk.md`, "A toast is transient"), so this is the only Cancel on screen when it is pressed. Drawn in screens/run-and-read.html, state 11 ("Keep working"); states 6 and 10 draw Cancel on the row.

## Run and read: the order of the choices when a run is refused

- **Superseded** by "The over-budget refusal: order, focus and one commit" below, which keeps this entry's order (cheapest first, focus on the first) and adds the grouping and the commit. Both screens/run-and-read.html (state 5) and screens/option-form-cost.html draw that order.

## Run and read: how often a running run's progress is spoken

- **Document and section:** `interaction-pattern-entries.md` 9.4, Announcements; `message-catalog.md`, `run.running`.
- **Old text:** (none: `run.running` has no Spoken value, and 9.4 does not say how often progress is read)
- **New text:** "`graphty.run.running` is spoken politely when the run starts ("Running Betweenness (sampled), under a minute") and then at most once every 10 s while it runs, never per percent; its finish is `graphty.run.done` or the row's state."
- **Why:** a progress bar that updates every frame would flood a screen reader, and silence for a minute-long run leaves a blind analyst unsure anything is happening. Ten seconds is the background line of `interaction-patterns.md` 3.3, so a run spoken about at all is one that crosses it. Drawn as the "Screen reader hears" note in screens/run-and-read.html (state 6).

## Load and characterize: the weight's meaning is not asked in the load step (withdrawn proposal)

- **Document and section:** none changed. This withdraws this flow's earlier proposal, "the load step asks what a bigger weight means, in plain words".
- **Old text / new text:** no change to the framework. The role stays where `information-architecture.md` 4 puts "the weight's meaning" (the Edges row of the graph's Statistics, where "weight: unknown" sits with its role control, `principles.md` ledger) and where `graph-conventions.md` 2, "Similarity as distance", asks it (in the import report, or inline the first time a distance algorithm meets the attribute). The words are `glossary.md` 11's exactly: the roles similarity, distance, capacity and unknown, each with its gloss as the select item's description; unknown keeps its full gloss, "paths ignore it; PageRank and communities read it as a similarity".
- **Why:** asking in the load step made three homes for one fact (the load step, the Edges row, the first distance run), put the question on screen while other issues still needed attention, and its default is exactly what most analysts would leave alone. **This disagrees with the entry "The load step asks what a weight column means, on the weight row"** (drawn in screens/load-step.html). The two are alternatives, not additions: the owner should adopt at most one. Hypothesis H1 in study/hypotheses/load-and-characterize.md runs both and says what result would favor the load-step version. Drawn in screens/load-transfers.html, state 4.

## Load and characterize: which load issues block Load (replaces two earlier entries)

- **Replaces:** this flow's earlier entry "Load and characterize: which issues block Load, and where the fix sits" (withdrawn: it blocked Load on a column whose every value could be read), and the "{K} of {N} values are numbers" variant of "The load step names numbers stored as text as its own issue". **Agrees with** "A weight column that is not all numbers blocks Load until the analyst chooses", which it generalises.
- **Document and section:** `interface-templates.md` 20a, "Regions and rows", the issues list; `message-catalog.md`, the load rows.
- **Old text:** "the issues list, one `DataRow` per issue with a severity glyph, blocking issues first, each routing to its rows in the sample, and an issue with a policy (parallel edges, `load.parallelEdges`) carrying a `StyleSelect` of its policies, each stating its result in counts, committed by the footer"
- **New text:** add: "**An issue blocks Load only when no policy keeps every value**, so any default would lose or invent data (a weight column where 150 of 2,298 values are `NA`: `graphty.load.notNumber`). It is listed first with the danger glyph, has no preselected policy, and the footer's reason slot names the choice to make. **Every other issue is a warning whose default is the policy that keeps every value**, and Load stays on: a column whose every value is a number written as text -- in quotes, with a currency sign or thousands separators -- defaults to 'Read as {kind}: {N} weighted edges' (`graphty.load.textNumbers`, extended to currency: '{column} is written as currency text', 'Read as Currency (USD): 9,113 weighted edges' / 'Keep as text: 9,113 unweighted edges'); repeated pairs default to 'Keep all' (`graphty.load.parallelEdges`). **The fix sits on the issue row as its policy select**; the column's Read as select shows the same choice. 'Load without {role}' is not a separate button: it is the 'Keep as text' policy. A text column with no role never raises an issue."
- **Why:** three mocks had given three rules for the same case (a warning in screens/first-look.html state 3, a block here, a block only for mixed values in screens/load-step.html state 2). The framework prefers Undo to asking (`interaction-patterns.md` 3.4), and a lossless reading is safe to default. It asks only where a default would silently change what "weighted" means for some edges. Undo cannot help there, because after the load nothing on screen shows the loss that would prompt it. first-look state 3 and load-step state 2 already follow this rule; screens/load-transfers.html states 1 and 2 draw the currency case. Message keys are published, so the key names are the owner's call.

## Load and characterize: where focus lands in the load step

- **Document and section:** `interface-templates.md` 20a, "Tab order"; `interaction-patterns.md` 3.6.
- **Old text:** "Tab order: format; mapping rows; issues; sample; footer."
- **New text:** keep the order, and add: "Focus opens on Cancel while the step is Reading. When the preview arrives, and only if focus is still on Cancel, it moves once: to the first blocking issue's policy select, else to Load. Choosing the last blocking issue's policy leaves focus on that select and announces 'Load is available' (polite). Esc closes the step at any state and keeps nothing: opening the file again reads it again."
- **Why:** no framework document says where focus goes when a dialog's content arrives after it opens, and a focus jump while the analyst is already working fails WCAG 2.4.3 and 3.2.1. Moving once, only from the placeholder control, gives a keyboard user the problem first without pulling focus from something they chose. Esc keeps nothing because Figma's dialogs keep nothing, and the file is re-read in seconds at this scale. Drawn in screens/load-transfers.html, state 1 (focus on Load).

## Load and characterize: Read as... only when the file's name and content disagree

- **Document and section:** `task-flows.md` 2, the diagram's "Could it open the file?" exits; `message-catalog.md`, `open.failed`.
- **Old text:** `OF -->|"no: Read as... / Choose another file"| L`
- **New text:** "no: Choose another file... (and Read as... when the element reports that the content looks like a format other than the name says)". For a format graphty does not read at all (an Excel workbook), the step offers Choose another file... and Cancel, and its cause says how to get a readable file ("In Excel, save the sheet as CSV").
- **Why:** choosing another text format for a binary workbook is a dead end; Read as... helps only when the name misleads (a CSV saved as .txt). Whether the content disagrees with the name is the element's to report (format sniffing belongs to graphty-element). Drawn in screens/load-transfers.html, state 3.

## Load and characterize: undoing a first load

- **Document and section:** `interaction-patterns.md` 3.4; `information-architecture.md` 6.
- **Old text:** (silent on what undoing the load that created a project leaves)
- **New text:** "Undoing the load that opened a new project leaves that project empty, its canvas asking for data (the Blank state), not the start screen: the project already exists, and Redo reloads. Opening a sample records no undo entry."
- **Why:** Open always lands in a new project (`information-architecture.md` 6); returning to the start screen would make undo close a project, which no other undo does. Two-way door, decided.

## Load and characterize: nothing is added beside the project name after a reopen (withdrawn proposal)

- **Document and section:** none changed. This withdraws this flow's earlier proposal that the save state read "Last edited 7 days ago" after a reopen, turning into "Saved".
- **Why withdrawn:** only Not saved and View only ever sit beside the project name (`interface-specification.md` 1.2), and Figma shows nothing there at rest; there is no "Saved" word to return to. `task-flows.md` 2.2 already answers "what changed" with Version history and the Last import row. Whether a transient "Last edited 7 days ago" line, cleared on the first interaction, earns its departure from Figma is hypothesis H4 in study/hypotheses/load-and-characterize.md; nothing is proposed unless the study supports it.

## Load and characterize, FOR DECISION (one-way door, untested): the selection saved in the project file

- **Document and section:** `files-and-recipes.md` (the project profile); `task-flows.md` 2.2; `message-catalog.md` `selection.cleared`.
- **Old text:** 2.2: "Rest: the graph that was on screen"; the check "nothing selected".
- **New text (decided on the owner's behalf, 2026-09-28; reversible, an optional additive field):** "The project file saves the selection at close. Reopening still starts with nothing selected; Previous selection restores the saved one, as one selection change with no undo entry."
- **Why:** an analyst who closed mid-investigation (the 14 flagged accounts selected) loses that working set on reopen. **No session supports this yet**, and it adds a field to a published file format, so it is the owner's decision and is not drawn in the flow. Hypothesis H5 in study/hypotheses/load-and-characterize.md tests whether analysts try to get the selection back.

## Load and characterize: the dashed boxes and what they wait on

- **Document and section:** `task-flows.md` 2 and 2.2 (no text change; each gap is already a row of `element-needs.md`).
- **Old text / new text:** none; this entry only lists them in plain words.
- **The gaps:** graphty-element cannot yet show a load preview before committing, or read a file's size before loading it, or filter at import; it cannot yet say what kind of file was dropped before opening it; it cannot yet record a weight's role on the attribute (the role's published values are still an open owner decision); it cannot yet re-map the columns of loaded data; it refuses a graph past the drawing limit instead of opening it undrawn; projects, data versions and Version history are not yet in graphty-element at all; nor is a notes collection; and results do not yet say why they went out of date.

## Replace data: a slow result waits for Re-run instead of replaying

- **Document and section:** `interaction-patterns.md` 3.3, the cost table's last row; `principles.md`, "An act that replays runs shows their combined cost first"; `task-flows.md` 8, the "read the replay" step.
- **Old text:** "several Catalog rows run together; Apply recipe | the choice step shows the combined band, then each run follows the single-click line" (Replace data is not named); principles: "Replace data replays every run; its command carries the band word for the whole replay."
- **New text:** the row reads "several Catalog rows run together; Apply recipe; **Replace data's replay**". Add to the principle: "Each replayed run then follows the single-click line: a run estimated at a few minutes or more is not started, and its result reads Out of date with its band and Re-run, pinned in the Results panel and counted on the Results rail button."
- **Why:** swapping in a weekly file must not silently start an hour of work behind the analyst's back, and "replays every run" says nothing about a slow one. Out of date is already the state for "an input the run read changed" (`glossary.md` 10), so no new state word is needed. Drawn in flows/replace-and-recipe.html and screens/replace-and-recipe.html (states 4 to 6), on a transaction graph whose cycle search is estimated at a few minutes.

## Replace data: the replay report is kept on the data version

- **Document and section:** `task-flows.md` 8, the "read the replay" row and trust check T1; `interface-templates.md` 17, Version history; `message-catalog.md`, a new row.
- **Old text:** "Results panel | -- | Freshness (7.2) | ... | runs forked to the new version; under Replace data, hand-made sets and notes carried over by id"; no message for the end of a replay.
- **New text:** "The replay's report is the new data version's entry in Version history: accounts (elements) found by id, new and gone; each attribute matched by name, bound by hand, read at another level or left unbound; each result replayed, failed or not run with its band; sets and notes carried over by id, with missing members named; positions kept. It is opened from the replay's notice and from the Data section's Last import line." New message `graphty.data.replaced`: "Data replaced: {done} of {total} results replayed[; {K} failed]", notice, verb Show report, fires when the replay ends.
- **Why:** the trust check "N of M matched, these did not; unbound slots and the steps they block" needs one home the analyst can reopen next week; the Results panel rows each say what happened to them but nothing says it all at once. Version history already holds each data version's import report (`information-architecture.md` 83). The message key is published, so the wording is the owner's call. Screen 5 of screens/replace-and-recipe.html.

## The load step's commit reads "Continue to binding" when a binding step follows

- **Document and section:** `task-flows.md` 8, the "commit" row ("Load; Apply"); `interface-templates.md` 20a, the footer.
- **Old text:** commit "Load" on the load step, "Apply" on the binding step.
- **New text:** "When the binding step will open, the load step's button reads Continue to binding and commits nothing; the binding step's Apply commits the whole change as one undo entry, and the back arrow in its header returns to the load step with every choice kept (Esc is Cancel; see the entry on Esc below). When nothing needs binding, the load step's button reads Load and commits."
- **Why:** a button labeled Load that does not load, followed by a Cancel that undoes it, breaks the rule that Cancel means nothing happened. Screens 2 and 3.

## Cancel on a running replay stops the replay, not the data change

- **Document and section:** `interaction-patterns.md` 3.4 (Undo instead of asking) or `task-flows.md` 8, a new branch.
- **Old text:** (none)
- **New text:** "Cancel on the replay's running notice stops the runs still queued or running; the data stays replaced and each result not finished reads Out of date with Re-run. Undo takes back the Replace data as a whole, and the runs with it."
- **Why:** the notice's Cancel and the undo chord would otherwise both claim to reverse the same act. Drawn as a branch in flows/replace-and-recipe.html.

## The binding step names what an unbound attribute switches off, before Apply

- **Document and section:** `interface-templates.md` 20, the Binding step row; `message-catalog.md`, `file.binding`.
- **Old text:** "one row per unresolved reference: its name, then a picker ...; unbound rows stay listed with what they block"; template "{N} attributes to bind; per slot "{slot}: needs {level}""
- **New text:** each row also carries "Used by: {objects}" and, while the picker reads Leave unbound, "Left unbound, {objects} are kept and switched off". Identifiers of a fixed set that match nothing are counted and listed in the same step ("Q1 mule watchlist: 37 of 40 accounts found; 3 are not in this data", then the ids).
- **Why:** the flow's stall question asks whether the analyst can say how many matched and which did not without opening anything; the first failure is an attribute left unbound unnoticed. Screens 3 and 8.

## A comparison surface shows the re-run agreement beside the statistic, labeled in words

- **Document and section:** `task-flows.md` 8.2, the three trust checks; `interface-templates.md` 18.
- **Old text:** "Statistic named: AMI for partitions, Spearman for scores"; "Agreement of a re-run on the same data, beside it" (drawn as gaps).
- **New text:** the surface's first section reads, in order: "agreement (AMI) 0.45, over the 2,961 accounts in both", "a re-run on the same March data, another seed: 0.76", one sentence saying what AMI means and that the algorithm is random, then "only in March 39" and "only in April 132". A partition-level score is never used for one group: each group in the difference list carries its own line, how firmly it holds across the seeded re-runs ("holds in 5 of 5 re-runs"). The surface never states the verdict; the analyst draws it. In `task-flows.md` 8.2 the Claim becomes: "The April grouping differs from March's more than two runs on the same data do (AMI 0.45 against 0.76); Community 33 grew from 22 to 32 accounts and holds together in every re-run."
- **Why:** the claim is a comparison of two numbers, so they sit on adjacent rows; a verdict computed by the app would be a threshold the framework does not own. The old claim ("Community 4 grew by 30 nodes, and that change is larger than a re-run produces (AMI 0.71 against 0.93)") drew a conclusion about one group from a whole-partition score, and left out that AMI covers only accounts present on both sides. `graph-conventions.md` 4 runs five seeded runs with a cheap result, so the baseline needs no run of its own. Drawn in flows/compare-versions.html on the weekly-return screens, from the kit's March and April data.

- **Amendment, deterministic methods:** the re-run row is shown only for a method that takes a seed (Louvain, Leiden, a sampled estimate). For a deterministic method (PageRank, exact betweenness, degree) a re-run always agrees fully, so a numeric row would read 1.00 beside every statistic and tell the reader that every difference is real. There the surface says it in words -- "PageRank gives the same result every run, so a re-run cannot tell change from noise." -- and offers Compare with randomized baseline... as the route to a noise baseline. The catalog's determinism flag decides which, so the app never guesses. Drawn in screens/comparison.html, state 2.
## Replace data and Apply recipe end in different places

- **Document and section:** `task-flows.md` 8, the diagram and the "read the replay" row.
- **Old text:** both routes join at `C1[/"Applied: one undo entry"/]`, then `T1{{"N of M matched, these did not; unbound slots and the steps they block"}}`, then `RES["Results: rows note what replayed and what changed"]`.
- **New text:** after the commit the diagram splits. Replace data: canvas redrawn with positions kept, runs replay under one notice, `T1` "Data replaced: {done} of {total} results replayed" on the notice, Show report to the replay report in Version history, then Results with out-of-date rows and Re-run. Apply recipe: `T1r{{"Recipe applied: added sets and layers marked; unbound layers listed, switched off; the notice carries Undo"}}`, then Results, where the recipe's runs queue under the cost rule. Only Replace data has a replay report.
- **Why:** a recipe changes no data and matches no elements by id, so drawing it through the replay chain tells a reader something false. The recipe branch is Figma's Swap library outcome: instances updated, a notice with Undo, no report page. Drawn in flows/replace-and-recipe.html.

## Esc in a binding step is Cancel; Back is the header's arrow

- **Document and section:** `interaction-pattern-entries.md` 6.10, Grammar.
- **Old text:** "Esc in the binding step goes back to the picker; Esc in the picker closes it with no change and returns focus to its trigger."
- **New text:** "Esc in the picker, the load step or the binding step is Cancel: it closes the whole step, applies nothing, and returns focus to the trigger (`interaction-patterns.md` 3.6). Going back one step is the back arrow in the binding step's header, which returns to the load step, the recipe picker or preview, or a dropped file's choices with every choice kept. A binding step opened straight from a command has no back arrow."
- **Why:** Figma's stepped dialogs (Swap library, Missing Fonts) close on Esc with nothing changed and step back only through an explicit back arrow in the header. The framework's Esc-goes-back differs from Figma for no graph reason, and one key meaning "cancel" in one dialog and "back" in the next is a trap. Drawn in screens/replace-and-recipe.html, states 3, 8 and 11.

## A style file from Recipes: the menu command is the choice

- **Document and section:** `task-flows.md` 8.1, the diagram and the desk count.
- **Old text:** `RC["Main menu: Recipes: Apply recipe..."] --> RP(["Recipe picker: a style file"])`, `RP --> CS(["Choice step"]):::gap`; "from Recipes, 3 steps, 1 travel".
- **New text:** two entries, `Main menu: Recipes: Apply style file on top...` and `Main menu: Recipes: Replace style stack with style file...`, each followed by the file picker and then `M{"Every layer's attributes matched by name?"}`. The choice step node is deleted. Desk count: "from Recipes, 2 steps (the command; the file), the same as a drop".
- **Why:** `information-architecture.md` already lists both commands under Recipes. In Figma the verb is the command; a dialog that asks again which verb adds a step and an undesigned node for no graph reason. Drawn in flows/replace-and-recipe.html.

## A dropped recipe opens its preview, where Apply sits

- **Document and section:** `task-flows.md` 8, the diagram.
- **Old text:** `DRP -->|"Apply recipe..."| M`.
- **New text:** `DRP -->|"Apply recipe..."| PV(["Recipe preview: what it carries and needs"])`, `PV --> M`. The preview is the recipe picker without its list; its button reads Apply when everything matched and Continue to binding when a step follows.
- **Why:** `interaction-pattern-entries.md` 6.10 shows what a recipe carries and needs before it is applied; a drop skips the list, not that trust check. The preview holds the commit button, so the step count does not change (the drop; Apply recipe...; Apply). Drawn in flows/replace-and-recipe.html.

## The Replace data command names what will wait, not a band for work it will not start

- **Document and section:** `principles.md`, "An act that replays runs shows their combined cost first"; the entry "Replace data: a slow result waits for Re-run instead of replaying" above.
- **Old text:** "Replace data replays every run; its command carries the band word for the whole replay."
- **New text:** "Replace data's command carries, as a description line under its label (never in the shortcut column, which holds only key chords; exposed as the item's accessible description, not aria-keyshortcuts), the band of the runs it will start, or nothing when all of them are under the smallest band; when a result will wait for Re-run, the line says so ('1 slow result will wait for Re-run'). The load step's footer counts what replays and names what waits, with its band ('4 results replay at once; Cycles up to 6 transfers waits for Re-run (a few minutes)'). The total is published by graphty-element; the app never sums estimates."
- **Why:** a band summed over every run named a cost for a run the flow then does not start, so the analyst was shown the wrong count and cost before she committed. Drawn in screens/replace-and-recipe.html, states 1 and 2.

## Undo after a replay takes back the Re-run first

- **Document and section:** `interaction-patterns.md` 3.4, or `task-flows.md` 8, a new branch.
- **Old text:** (none)
- **New text:** "Undo stays linear across a replay. A Re-run made after Replace data is its own, newer entry: the first Undo discards the re-run result, the second takes back the Replace data, and the earlier data version returns with its results current."
- **Why:** the earlier draft said one Undo discarded the Replace data together with a finished Re-run, which only holds if undo is not linear, and nothing in the framework says so. Drawn in flows/replace-and-recipe.html, Errors.

## One-way doors this flow touches (owner's decision, not decided here)

- **Recipe and style file extensions** (`one-way-doors.md` 1 and 19): the mocks show files by name only ("Mule ring triage", "fraud-team-colors: style file") so as not to imply an extension.
- **The key `graphty.data.replaced`** proposed above is a published reader message key.

## Recipe travels: a pending recipe answers where the data will go

- **Document and section:** `interface-templates.md` 19, Start screen, "Regions and rows" (the binding-summary `ProseBlock` with a recipe pending); `message-catalog.md`, new rows beside the proposed `start.local`.
- **Old text:** "With a recipe pending, a binding-summary `ProseBlock` heads the list (`task-flows.md`, Apply a recipe)."
- **New text:** "With a recipe pending, a `ProseBlock` card heads the list, under the title and its `graphty.start.local` line: the section header 'Recipe waiting for data' (sentence case, section-header weight), the recipe's name; one sentence of what it does, in the recipe's own terms (colors, filters, readings); 'It carries no data. To use it, open {what its slots need}.'; then one data sentence, `graphty.recipe.local` when the recipe names no source ('This recipe names no server, so graphty contacts none.') or `graphty.recipe.source` when it does ('This recipe will read from {host} when you confirm.'); then Open... and Close recipe. The card shows no author or version line unless the owner decides the recipe records who saved it (the entry below)." The data sentence is one sentence because `graphty.start.local` above it already says files stay on this computer; together they read as one message. (Revised: the card no longer repeats the file promise in other words, and its button is Open..., not Add data...; screens/recipe-apply.html, state 2, still draws the earlier wording.)
- **Why:** the recipient persona stops before adding unpublished results and refuses when nothing on screen says where they go (study/personas/recipe-recipient.md, "Before any of his own data goes in"). Door 19 already promises no contact before the host is named; this makes the promise visible at the moment the doubt arises. It extends the start-screen line proposed above rather than replacing it. Drawn in screens/recipe-apply.html, state 2, and storyboards/recipe-travels.html, frame 3.

## Recipe travels, FOR DECISION (one-way door): a recipe records who saved it

- **Document and section:** `one-way-doors.md` 19, "Identity"; `files-and-recipes.md` 1.
- **Old text:** "Each recipe carries a stable id, a version and an optional canonical source URL"
- **New text:** "Each recipe carries a stable id, a version, an optional canonical source URL, and an optional author name and saved date, written by Export recipe... from the project's metadata and shown wherever the recipe is previewed."
- **Why:** the recipient reads "the title of the file and who made it" carefully and trusts the colleague, not the tool (recipe-recipient.md). A recipe that says "Saved by Maren on 26 Sep 2026" is recognisably hers. It is a field in a published file format, so it is the owner's decision; the mock shows it marked as proposed.

## Recipe travels: a signed column is asked about only when it disagrees with the recipe (replaces "the meaning of a signed column is confirmed like a weight")

- **Document and section:** `task-flows.md` 8, the decision "Anything unmatched, a level changed, or a weight role undeclared?"; `files-and-recipes.md` 1. No change to `one-way-doors.md` 19.
- **Old text:** (task-flows.md 8) "the binding step opens only when a slot fails to match, a measurement level changed, or a weight column has no declared role."
- **New text:** add after it: "A column's sign counts as part of its level. When the recipe draws a need on a diverging scale and the bound column is never below 0 (or the recipe draws a one-sided scale and the column is signed), the row asks one question in the reader's words, with the column's own range: 'The recipe expects values below and above 0; log2FC is never below 0. Read it as an amount?' When the column's sign agrees with the recipe's scale, nothing is asked: the row shows what the column will do on the reader's numbers ('36 up, 48 down')."
- **Withdrawn:** the earlier proposal that every signed number bound to color is confirmed like a weight, Apply waiting for the answer.
- **Why:** `options-and-encodings.md` 5, rule 1 already decides a signed column on color: linear, diverging at 0, from the element's per-column verdict `{ signed, ... }`, and the recipe's author chose the diverging scale. Asking every recipient how to read a log2 fold change adds a stop to the best path (everything matched) and offers only one way to be wrong ("an amount"). The case that is truly ambiguous is a mismatch, such as a raw ratio from 0.5 to 4 bound to a need the recipe drew as signed; the element sees it from its verdict, so no domain knowledge is needed. Drawn in screens/binding-step.html, states 1 and 3 (nothing asked). screens/recipe-apply.html, state 4, and storyboards/recipe-travels.html, frame 5, still draw the withdrawn confirm and need the same change.

## Recipe travels: the join report says why each value did not match

- **Document and section:** `one-way-doors.md` 27 ("reports matched, unmatched and duplicate values as a Join does"); `message-catalog.md` `file.report`; `element-needs.md`, "Files, notes, recipes and history".
- **Old text:** `file.report`: "per part: applied or skipped; per slot: bound, matched by hand, missing attribute"
- **New text:** add: "per unmatched join value: its value and one reason the element detects from the value alone, in words that claim nothing the element cannot know: `date-shaped` ('looks like a date; a spreadsheet may have converted an id'), `case-only` ('differs only in letter case from {id}'; offered as a hand match, recorded as matched by hand; reported only when matching is case-exact, since with Match case off such a value has already matched), or `absent` ('no node with this id'). The element never names a symbol it would need a gene dictionary to know, and never says 'not in this network': an id with no node may be an alias or former name of one that is there. The binding step lists every unmatched value by name with its reason, and Copy puts the list on the clipboard."
- **Why:** the success line of the travelling journey is "user can state how many genes matched and which did not", and the recipient's first doubt about "not found" is "is it my fault or the file's?". Excel's date conversion of gene symbols is common and silent; saying 'looks like a date' answers that doubt from the value's shape alone, without domain alias tables, which a general graph element should not carry. The fixture holds two cases the element cannot see: TP53BP1, whose protein the network names by its alias 53BP1, and H2AFX, the former symbol of H2AX; both honestly read 'no node with this id', and whether a reader catches them is a study question. The reasons are element work (the element owns matching), never computed in the app.

## Recipe travels: the count outlives the notice

- **Document and section:** `message-catalog.md` `file.applied`; `interface-specification.md`, the graph's Statistics ("Nothing" notes); `task-flows.md` 8, stall "without opening anything".
- **Old text:** `file.applied`: "{file} applied: {contents}[; {M} missing attribute]"; Statistics has a Last import row and no row for an applied recipe.
- **New text:** `graphty.file.applied`: "{recipe} applied[: {matched} of {total} {idKind} matched][; {M} missing attribute]", with actions "Show the {U}" and Undo. The graph's Statistics gains an `ActionRow` after the headline readings while a recipe applied in this session or recorded in Version history carries a join: "{recipe}: {matched} of {total} {idKind} matched; {U} did not", opening the report.
- **Why:** pattern 6.10 says the report is "never in a toast alone", but after the dialog closes nothing on screen holds the count. The recipient has to answer "how many of ours are in there?" in a meeting, from the screen in front of him. Drawn in screens/recipe-apply.html, state 5.

## Recipe travels: the binding step's words

- **Document and section:** `message-catalog.md` `file.binding`; `interface-templates.md` 20, Binding step.
- **Old text:** `file.binding`: "{N} attributes to bind; per slot "{slot}: needs {level}""
- **New text:** dialog title "Apply {recipe} to your data"; a section "What the recipe reads from the data" with one row per slot as "{what it does}" (for example "Fold change, for color"), the column picked, and what that column will do in the recipient's numbers ("keeps 1,059 of 1,262 interactions"). The words bind, slot, attribute and measurement level do not appear.
- **Why:** task flow 8's own stall note says "slot", "measurement level" and "weight role" are not the analyst's words, and the recipient persona stops at words that sound like the file will change ("What does 'bind' mean? Is that going to change her file?").

## Keyboard walk: the three passages that still say plain arrows walk

- **Document and section:** (1) `interaction-pattern-entries.md` 9.2 and 9.3, plus the mode table's "Canvas walk" row (section 8's table) and 4.2's Behavior; (2) `interaction-patterns.md` 3.6, the dispatch rows "the canvas, no walk" and "the canvas walk", and 3.8, the canvas-focus chart; (3) `figma-crosswalk.md` 4.3, the row "The arrow keys nudge the selection". The entry "Keyboard walk: Shift+Arrow walks, and what each of the four does" above covers the 9.2 prose and the dispatch rows; this entry adds the passages it does not list.
- **Old text:** mode table: "an arrow press on the canvas, or Enter there with elements or nothing selected (9.2)". 4.2: "the first arrow press after entering starts the walk on the first member." 3.8 chart: "Idle --> Walk : arrow; Enter with elements or nothing selected" and "Walk --> Walk : arrow (neighbor); ...". Crosswalk 4.3: "The arrow keys nudge the selection | the arrows walk from the focused node to a neighbor".
- **New text:** mode table: "Shift+Down or Shift+Right on the canvas while something is drawn (9.2); never focus arriving, never a plain arrow, never Enter, never a pointer". 4.2: "the first Shift+Down after entering starts the walk on the first member." 3.8 chart: "Idle --> Idle : arrow (camera; the first in a session speaks the hint); Enter with nodes or nothing selected (says how to start)", "Idle --> Walk : Shift+Down or Shift+Right [something drawn]", "Walk --> Walk : Shift+Arrow (neighbor, back); Shift+Enter (back); Shift+Home; arrow (camera, focus kept); ...". Crosswalk 4.3: the row's Figma column widens from "The arrow keys nudge the selection" to "The arrow keys, and Shift with them, nudge the selection (Shift: 10 px)"; graphty column "plain arrows move the camera and Shift with the arrows walks from the focused node to a neighbor"; reason "ontology | positions have no units, so neither nudge applies; a graph is walked along its edges, and the camera keeps the arrows it has today". The same widening applies in 4.1's list of ontology departures ("The arrow keys nudge the selection").
- **Why:** the owner decided on 2026-09-28 that plain arrows keep the camera and Shift+Arrow walks (owner-feedback.md); a chart edge or a table row that still says "arrow" would be read as normative (3.6 says the table and 3.8's charts are the normative statement). Drawn in flows/keyboard-walk.html.

## Keyboard walk: Shift+Up, Shift+Left and Shift+Home before a walk say how to start one

- **Document and section:** `interaction-pattern-entries.md` 9.2, Entry; `message-catalog.md` (new row `walk.notStarted`).
- **Old text:** (silent: only Shift+Down and Shift+Right start the walk; the other three do nothing)
- **New text:** "With no walk active, Shift+Up, Shift+Left and Shift+Home move nothing and say once per press: `graphty.walk.notStarted` 'Shift+Down walks from {start node}.'"
- **Why:** a screen-reader user who presses one of the other three hears silence and cannot tell a dead key from a broken one. Naming the start node also tells them where the walk would begin. Message keys and texts are published (PR #586), so the wording is the owner's call.

## Keyboard walk: the walk-position message says "selected" and "where you came from"

- **Document and section:** `message-catalog.md`, `walk.position` (and `walk.position.first` as proposed above).
- **Old text:** "{label}, neighbor {i} of {N}[, {direction}]"
- **New text:** append "[, selected][, where you came from]" after Degree and rank: "Valjean, neighbor 1 of 17 of Javert, by co-appearances 17. Degree 36, rank 1, selected, where you came from."
- **Why:** after Shift+Down the first neighbor is often the node just left (in Les Miserables, Javert's strongest tie is Valjean), and hearing it again without a marker sounds like the walk went nowhere. "Selected" lets a Space-built selection be checked without ] and [. Both are short and only spoken when true. Used in storyboards/keyboard-only.html frame 9 ("TP53, 4 of 6, 0.86. Degree 32, rank 2, selected, where you came from."). Pending the keyboard-only study: a real screen-reader user must confirm both are wanted and do not become noise after an hour.

## Keyboard walk: the focused node's context menu

- **Document and section:** `interaction-patterns.md` 3.6, dispatch row "the canvas walk" (no Shift+F10 column today); `interaction-pattern-entries.md` 6.7.
- **Old text:** (silent on Shift+F10 and the Menu key during the walk)
- **New text:** "During the walk, Shift+F10 and the Menu key open the context menu for the focused node, drawn at the node. Every command in that menu acts on the focused node alone, as Figma's right-click acts on what is under the pointer, and the menu's header names it ('Javert, not selected' or 'Javert, selected'). Opening the menu does not change the selection. A command that selects (Select, Select neighbors) replaces the selection; Hide on canvas and Remove act on the focused node only, whatever else is selected. Esc closes the menu (rung 1) and focus returns to the same node with the walk still on; an item that runs also returns focus there, and the polite region says what it did and the selection count, for example 'Javert hidden on canvas. 2 selected on canvas.' or 'Selected Javert's 17 neighbors. 17 selected on canvas.' The Delete key keeps its own rule: on a focused node outside the selection it removes nothing (`interaction-patterns.md` 3.6)."
- **Why:** a pointer user right-clicks the node under the pointer; the keyboard equivalent is the node under focus, not the selection, which may be elsewhere in the graph. Figma avoids the question by selecting what was right-clicked; the walk cannot, because it keeps focus and selection apart on purpose. Without a stated subject a keyboard user choosing Remove could delete the wrong nodes. Naming the node in the header and the count after the item make the subject audible before and after. Returning to the node keeps rung 1 from also costing the walk. Drawn in flows/keyboard-walk.html.

## Keyboard walk: when the focused node stops being drawn

- **Document and section:** `interaction-pattern-entries.md` 9.2, Exit.
- **Old text:** (silent)
- **New text:** "If an undo, a filter step or a hide removes the focused node from the drawing, focus moves back along the walked path to the nearest node still drawn and the polite region says '{label} is no longer drawn; back to {label}.' If no node on the path is drawn, the walk ends ('Walk ended.')."
- **Why:** the walk must never leave focus on something that is not there, and the path is the one route the analyst already knows.

## Keyboard walk: the camera follows focus; a window switch keeps the walk

- **Document and section:** `interaction-pattern-entries.md` 9.2 and 9.1 ("Focus is never obscured").
- **Old text:** (silent on a step that lands off screen; "focus leaving the canvas" does not say whether a window switch counts)
- **New text:** "A step that lands on a node outside the view pans the camera just enough to bring it in, without zooming and without animation under reduced motion. Switching to another window or app does not end the walk: the canvas still holds focus when the window returns."
- **Why:** WCAG 2.4.11 applies to the canvas as much as to rows; and a screen-reader user who checks notes in another window and comes back should not have to find their place again.

## Sets and shortest path: Freeze as fixed set makes a new set and leaves the rule set alone

- **Document and section:** `task-flows.md` 10.1, the step table's "freeze" row and the diagram's `K -->|"yes: Create set"| C4[/"Fixed set"/]`.
- **Old text:** "| freeze | the rule set's type row | Create set | Add with defaults (6.1) | "Create set Watchlist and Hubs" | the kind glyph turns fixed | ..."
- **New text:** "| freeze | the rule set's type row | Freeze as fixed set | Add with defaults (6.1) | "Freeze Watchlist and Hubs as fixed set" | a second row, kind fixed, selected; the rule set's row unchanged | ...", and the edge reads `K -->|"yes: Freeze as fixed set"| C4[/"New fixed set; the rule set unchanged"/]`.
- **Why:** the glossary defines Freeze as fixed set as keeping a rule set's current members "as a new fixed set; the rule set is unchanged", and the command register (`output-homes.md` 3) and the Set kind's verbs (`interface-specification.md` 4.2) name the command Freeze as fixed set. The task flow is the one place that says Create set and implies the row changes kind in place. Drawn in flows/sets-and-paths.html (step 7) and screens/sets-and-paths.html (state 7).

## Sets and shortest path: the automatic names of a combined set and a frozen set

- **Document and section:** `content-design.md`, the Names bullet ("automatic names are kind plus counter ("Set 1")").
- **Old text:** "automatic names are kind plus counter ("Set 1");"
- **New text:** "automatic names are kind plus counter ("Set 1"), except two: a set operation's result is named from its operands (Intersect "A and B", Union "A or B", Subtract "A without B", Exclude "A or B, not both"; past about 40 characters the operands are counted instead, "3 sets combined"), and a set frozen from a rule set is named with the day first, "{day}: {rule set name}" ("28 Sep: High risk and Paid ACC-893168"), so the two rows differ where a truncated row still shows them."
- **Why:** an intersection called "Set 4" in a list of four sets cannot be told apart without opening it, and a frozen copy that repeats its rule set's name would break the unique-name rule (`graphty.name.duplicate`) and truncate to the same text in a 240-pixel list. Names are a rename away from anything else. Drawn in screens/sets-and-paths.html (states 2 and 7).

## Sets and shortest path: naming in place belongs to the create step

- **Document and section:** `interaction-patterns.md` 3.2 (Commit) or `interaction-pattern-entries.md` 6.1, Undo.
- **Old text:** (none: nothing says whether typing a name into a just-created row is its own undo entry)
- **New text:** "A new set, path or rule set opens its name in place. A name typed there before focus leaves the row is part of the create step, and the undo label carries it ("Create set Paid ACC-893168"); Esc keeps the automatic name ("Create set Set 1"). A later rename is its own entry, "Rename set Set 1 to Paid ACC-893168"."
- **Why:** Figma names a new layer in place and one undo removes it; two entries for one act would make the first undo leave a nameless set behind. Drawn in flows/sets-and-paths.html (steps 2 and 3, and Errors and cancellations).

## Sets and shortest path: focused set rows show their operations in a bar

- **Document and section:** `interaction-patterns.md` 3.1, "Several rows of one type"; `interaction-pattern-entries.md` 6.8; `interface-specification.md` 4.2, the closing paragraph ("the set operations are in the context menu of focused set rows").
- **Old text:** "the set operations are in the context menu of focused set rows."
- **New text:** "While two or more set, path or item rows are focused, a bar appears at the top of their list, inside the section: "{N} focused", then Union, Subtract, Intersect and Exclude as `ActionIcon`s with tooltips, a divider, and Select members. It goes when the focus drops to one row. The focused rows' context menu carries the same commands as the second route; with one row focused its set operations are disabled with the reason "Focus two or more sets". An operation whose result is empty still makes the set, with 0 members; its row reads 0."
- **Why:** the inspector stays on the selection while rows are focused, so a menu-only home leaves a novice who has focused two rows with no cue that anything can now be done with them. Figma shows its boolean operations in the right sidebar and toolbar as soon as two layers are selected, with the context menu and shortcuts as further routes; the bar is that visible home in the place the rows already are. Refusing an empty result would lose a real answer ("these two lists share no one"). Drawn in screens/sets-and-paths.html (state 1) and flows/sets-and-paths.html (step 4). This replaces the earlier proposal to keep the operations only in the menu.

## Sets and shortest path: the Path tool's bar shows the weight by name, and has one scope control

- **Document and section:** `interface-templates.md` 14, "Regions and rows"; `information-architecture.md` 4.1, the outline's "[the Path tool's bar] From / To / Scope / Parameters / Run"; `interaction-pattern-entries.md` 6.9, "Search scope".
- **Old text:** "the Path tool's holds From, To, Scope, Parameters and Run"; 6.9: "When an endpoint lies outside the filtered graph the bar offers Full graph;"
- **New text:** "the Path tool's bar holds From, To and Run on its first row, Scope and Weight on its second, and a state line under them while it has something to say. Weight shows the attribute and its meaning in the glossary's words ("amount (unknown role)") and opens the attribute's meaning editor. Scope is the bar's one control for where the search runs. When an endpoint lies outside the filtered graph, the Scope field takes a warning mark, the state line names the endpoint ("From is outside the filtered graph. Set Scope to Full graph to search it."), and Run waits until Scope reads Full graph; setting Scope only sets it, and the person presses Run. Search full graph appears only on a result that found nothing inside the filtered graph, where it sets Scope to Full graph and runs again as one step."
- **Why:** the weight's meaning is the flow's trust check (`task-flows.md` 10.2) and must be readable before Run without opening anything. Two controls that both set the scope, a field and a button, made it unclear whether the button only switched or also ran; Figma has no counterpart for this bar, so every extra control is invented chrome. On one row the five controls need about 690 px, and at 1440 by 900 with both side panels open the canvas column is 901 px, so the bar would cover the legend; two rows fit in about 400 px. Seen with real data: ACC-271813 has riskScore 1 and falls outside a "riskScore 20 or more" step (1,071 of 3,000 accounts). Drawn in screens/sets-and-paths.html (states 3 and 6).

## Sets and shortest path: From and To the same account

- **Document and section:** `interaction-pattern-entries.md` 5, the Path tool.
- **Old text:** (none)
- **New text:** "With From and To the same node, Run is unavailable with the reason "Choose a To other than From" (`graphty.command.disabledReason`)."
- **Why:** a zero-hop path answers nothing, and running it would add an undo entry for no result. Listed in flows/sets-and-paths.html (Errors and cancellations).

## Sets and shortest path: where focus goes when the Path tool ends

- **Document and section:** `interaction-pattern-entries.md` 5, "Tool sequence"; `interaction-patterns.md` 3.6.
- **Old text:** "A run started from an armed tool hands back its selection (... the Path tool the path itself, whose members are one Enter away, 4.2)"
- **New text:** add: "When a Path tool run finds a path, the tool returns to Select and its bar closes, so keyboard focus moves to Create path on the found path's type row and the polite region reads the selection count ("4 selected", `graphty.selection.count`). Create path stays a type-row `ActionIcon`: being next is shown by focus, not by a filled button, and the view's one primary action stays in the header. Esc before a run disarms the tool and returns focus to the control that armed it."
- **Why:** focus inside the bar would be lost to the page when the bar closes; Create path is the step the flow names next. Drawn in flows/sets-and-paths.html ("Keyboard and focus") and screens/sets-and-paths.html (state 4).

## Sets and shortest path: a converted similarity's distance is never shown bare

- **Document and section:** `interface-specification.md` 4.2, the Path and "Path, offered" rows ("N hops, distance D (weight attribute)").
- **Old text:** ""N hops, distance D (weight attribute)" on a weighted path"
- **New text:** ""N hops, distance D (weight attribute)" on a path whose weight is a distance; when the weight is a similarity converted for the search, line 2 reads "N hops" alone and the Weight row reads "{attribute} (similarity, {conversion}): distance D per {unit}"; when the weight's role is unknown or a capacity, the name carries "(unweighted)" and line 2 reads "N hops"."
- **Why:** with the March transfers read as a similarity by 1/w, the path from ACC-271813 to ACC-233575 has distance 0.000489 per dollar, a number that means nothing to the analyst and invites being quoted. The hops and the named conversion are what the claim needs. The unknown-role mark follows `graph-conventions.md` ("a variant mark at the result's name"). Worked through in flows/sets-and-paths.html ("What the path length counted").

## Sets and shortest path: line 2 of a set's type row starts with the kind word

- **Document and section:** `interface-specification.md` 4.2, the table's Set row.
- **Old text:** "| Set | its name | its size; Fixed set or Rule set | ..."
- **New text:** "| Set | its name | Fixed set or Rule set, then its size ("Fixed set, 37") | ..."
- **Why:** the paragraph above the table puts the kind word first on line 2 ("line 2, the kind word and the columns below, then three verbs"), and every other kind's line 2 starts with its kind; the Set row is the one that disagrees. Drawn in screens/sets-and-paths.html (states 1, 2 and 7).

## Sets and shortest path, FOR DECISION (one-way door 21): the meaning editor names the attribute

- **Document and section:** `graph-conventions.md` 1, "Weight roles on the attribute"; `interface-templates.md`, the editor popover; `one-way-doors.md` 21 (still open).
- **Old text:** "The role ... belongs to the attribute, set once, and every run records the role it read." (no editor is specified)
- **New text:** "The meaning of a weight attribute is set in an editor titled "{attribute}: what it means", opened from a path bar's Weight field or a result's Weight row. Its lead line reads "Applies to every result that reads {attribute}." Its one field, "A bigger {attribute} means", lists the four roles with their glossary glosses (similarity: larger = closer; distance: smaller = closer; capacity: how much can flow; unknown: paths ignore it). A similarity states its conversion as a sentence ("Read as a distance by 1/w"); 1 - w and -log w are behind "Other conversions". The change is one undo entry, "Set amount as similarity, 1/w", and every result that read the attribute becomes out of date (`interaction-pattern-entries.md` 7.2)."
- **Why:** a popover titled "Weight" hid that the choice changes the attribute for every result, not a setting of this run; Figma's style and variable editors are titled with the thing being edited. The conversions are math a fraud analyst should not meet by default. Whether the meaning lives on the attribute or on each run is door 21, the owner's decision; graphty-element records it on each run only today (`element-needs.md`, "The weight role on the attribute"), so the mock draws the editor dashed. Drawn in screens/sets-and-paths.html (state 5).

## Start screen: Connect to data source... says what does leave the machine

- **Document and section:** `interface-templates.md` 19, Start screen, "Regions and rows"; `message-catalog.md`, a new row beside the proposed `start.local`.
- **Old text:** "Open... and Connect to data source... (`ActionRow`s; the list is `information-architecture.md` 4.1's)."
- **New text:** add: "Connect to data source... carries an (i) (`InfoCircle`), `graphty.start.connect`, 'Sends only your query, to the source you name.'" (Revised: an earlier draft put this on the row as an inline note; `principles.md` 5 puts a row's description under its (i).)
- **Why:** the proposed line under the title ("Files stay on this computer ... uploads nothing") is true of files but not of a connection, which sends a query out. A privacy line that is contradicted one row lower is worse than none for the reader who is checking (study/personas/recipe-recipient.md, "Before any of his own data goes in"; simulated evidence). Under the (i) it costs the empty surface no words. Drawn in screens/start-screen.html, every state.

## Start screen: say before any work that this browser will not keep projects

- **Document and section:** `interface-templates.md` 19, "States"; `state-matrix.md` 3, a new Start screen row beside "Graph panel | Project name | Error | Not saved"; `message-catalog.md`, a new row.
- **Old text:** "States: first run (no recents, so the section is absent); recipe pending." The Not saved state appears only on the project name, after an autosave has already failed.
- **New text:** add a state: "Start screen | Partial | the browser will not keep projects, detected only as storage blocked or a failed test write: under the privacy line one warning line, `graphty.start.noAutosave` 'This browser is not saving projects.', with (i) 'Site data is blocked, so nothing is kept after this tab closes. Download project file (File menu) keeps your work.' No Recent projects section. Owner: app (whether the browser keeps anything is a fact about the browser, not about a graph, so the app may probe it)." A private window is not detected and gets no warning: current browsers hide private browsing from pages, and storage works there until the window closes.
- **Why:** `principles.md` 5 lets a failed autosave appear unasked; saying it at the start, where it costs nothing, beats saying it on the project name after an hour of work. It is also the one honest reason a returning person sees no recents. The line promises only what a page can detect. Drawn in screens/start-screen.html, state 2.

## Start screen with a recipe pending: what the rest of the list does

- **Document and section:** `interface-templates.md` 19, "Regions and rows" and "Tab order"; `task-flows.md` 8, the "choose" and "pending" rows.
- **Old text:** "With a recipe pending, a binding-summary `ProseBlock` heads the list." (silent on what the recents, samples and Open... below it do while a recipe waits)
- **New text:** "With a recipe pending, the card's Open... replaces the Open... row (a drop anywhere still counts as Open...); it lands in a new project, as Open always does, and the recipe's binding step follows. Recent projects stay, as data to apply the recipe to: choosing one opens it and goes straight to the binding step, which names any input it cannot fill. Samples are listed only when the element's recipe preview reports that a sample fills every input the recipe requires; when none does, the Samples section is absent. Connect to data source... stays. Tab order: the card's Open... and Close recipe; recents; samples when present; Connect to data source...."
- **Why:** keeping the row beside the card's button would offer the same command twice, and a different verb (the earlier draft's Add data...) would name a File-menu command that adds to an open project when none is open. Offering every sample was a promise the samples could not keep: the expression overlay needs a protein network plus a fold-change table, and no sample has one, so each would end in a binding step with nothing bound. Whether a dataset fills a recipe's inputs is a graph question, so the answer is the element's (an element need, below), not an app filter. Two-way door, decided here. Drawn in screens/start-screen.html, state 4.

## Start screen: the drop while a file is dragged over the window

- **Document and section:** `interface-templates.md` 19; `interaction-pattern-entries.md` 4.5 (Paste and drop).
- **Old text:** "one Open... that also accepts a drop" (silent on what the drag-over state says)
- **New text:** "While a file is dragged over the start screen, the whole window is the drop target and the Open... row takes its selected state, its label reading `graphty.start.dropHint` 'Drop to open'. The hint never names the file or its kind: a page cannot read either until the drop, and after it a data file goes to the load step, a project opens and a recipe waits for data. There is no drop box and no drop choice step here, because no project is open to add to." (Revised: an earlier draft drew a dashed drop box, which would have needed a Dropzone compact-mantine does not have, and a hint about columns that was false for projects, recipes, GraphML and GEXF.)
- **Why:** the drop is the recipient persona's first move ("dragging it onto the browser window"; simulated), and the hint answers "what will happen" before he lets go. Figma's file browser also takes a drop anywhere on the window and draws no drop target. Drawn in screens/start-screen.html, state 5.

## Start screen: samples as a thumbnail grid; recents stay rows

- **Document and section:** `interface-templates.md` 19, "Departures" and "Regions and rows"; `figma-crosswalk.md`, the recorded departures; compact-mantine `design/figma-spec.md` 11.11 (cards and tiles, not built).
- **Old text:** "Departures: none"; "samples (`ActionRow` with a thumbnail)".
- **New text:** "Departures: samples are a grid of thumbnail tiles, four across, each the sample's picture over its name, size and (i), as Figma's file browser draws files in its grid view. Built from a thumbnail tile added to compact-mantine (figma-spec 11.11), not drawn locally. Recents stay `ActionRow`s, because a recent is found by its name and date, not its picture."
- **Why:** the thumbnail is the one picture `visual-language.md` (Imagery) allows on this screen, and a graph's shape is how people recognize a sample; at row height the picture is too small to show a shape. Two-way door, decided here; the component must land in compact-mantine before the app uses it. Drawn in screens/start-screen.html, every state with samples.

## Start screen: keyboard order is one Tab stop per list

- **Document and section:** `task-flows.md`, Re-enter, "Keyboard" ("The start screen's list is one Tab stop"); `interface-templates.md` 19, "Tab order".
- **Old text:** task-flows: "The start screen's list is one Tab stop"; the template: "recents; samples; Open...; Connect to data source....". The two disagree.
- **New text:** task-flows: "Each list on the start screen (recents, samples) is one Tab stop with roving focus: Up and Down in the recents, the arrow keys across the sample grid, Enter opens. Open... and Connect to data source... are a stop each, which gives the template's order." The template adds: "A focused sample tile shows its (i) description as a tooltip and carries it as its accessible description; a tap on (i) opens it on touch."
- **Why:** the template's four stops and the roving lists are both kept; only the ambiguous sentence changes. Drawn in screens/start-screen.html, state 8.

## Start screen: "N more" lengthens the recents in place

- **Document and section:** `interface-templates.md` 19, "Regions and rows"; `principles.md` 5 ("three or four before N more").
- **Old text:** (silent on what "N more" does here)
- **New text:** "'N more' under the recents is an `ActionRow` that lengthens the list in place to every kept recent, focus moving to the first new row; File, Open recent, is the second route."
- **Why:** sending the reader into a menu for the rest of a list already on screen is a change of place with no gain; Figma's recents lengthen or scroll where they are. Drawn in screens/start-screen.html, state 8.

## Start screen: the Error states, an unreadable drop and a recent that no longer opens

- **Document and section:** `state-matrix.md` 3 (new Start screen rows; the grid marks Start screen Error "follow the default"); `message-catalog.md`, `open.failed`, and a new verb.
- **Old text:** (no Start screen Error row)
- **New text:** two rows. "Start screen | Error | a dropped or chosen file the element cannot read: `graphty.open.failed` under the Open... row, 'Could not open {file}: {cause}', the cause the element's; its verb is Open... (the row above); the line stays until the next open or drop." And: "Start screen | Error | a recent whose saved copy is gone (site data cleared or evicted): the saved copy is looked up when the row is chosen, before the start screen gives way, and `graphty.open.failed` shows under that row, 'Could not open {project}: its saved copy is no longer in this browser', with Remove from recents (a secondary Button)." Loading stays "follow the default": a recent that opens leaves the start screen at once and its progress is the canvas's first-load card.
- **Why:** these are the two likeliest first-visit and return-visit failures, and the default did not say where the error sits or what its one verb is. "Remove from recents" is a new app verb (chrome, not a graph fact). Drawn in screens/start-screen.html, states 6 and 7.

## Element need: a recipe preview says which datasets fill its inputs

- **Document and section:** `implementation-mapping.md`, the element needs; `task-flows.md` 8, the pending step.
- **Old text:** (the recipe preview reports what a recipe carries and needs, not whether a given dataset fills it)
- **New text:** "graphty-element's recipe preview answers, for a registered sample or a saved project, whether it fills every input the recipe requires. The start screen lists only samples that do."
- **Why:** deciding whether a graph has what a recipe needs is graph logic; if the app filtered samples itself it would re-implement the binding step. Every consumer that offers "try it on a sample" needs the same answer. Drawn in screens/start-screen.html, state 4.

## Start screen: the recipe-pending state is over the empty-screen word budget

- **Document and section:** `principles.md`, the conflict ledger (a new row); principle 5, the empty screen's 50 words.
- **Old text:** (none)
- **New text:** a ledger row: "The start screen with a recipe pending | 5 against 1 | 90 words of text, of which 50 are the recipe's own preview (its name, what it does, what it needs) and 40 the app's. Allowed while a recipe waits, because what the recipe does and that it carries no data are caveats the recipient needs before giving it data (principle 1)."
- **Why:** principle 5 says only a caveat principle 1 requires may raise a budget, in the open, with a ledger row. Every other state is within the 50 (24 at first run). Counted in screens/start-screen.html, the table under the states.

## Main frame at rest: the file chip opens a popover that says where the data came from and where the work is kept

- **Document and section:** `interface-templates.md` 2, Graph panel, header (extends "A file chip names the file the graph was read from" above); `message-catalog.md`, new rows.
- **Old text:** (the chip proposal above) "...its tooltip gives the load date and row counts, and it opens the Last import report."
- **New text:** "A click on the file chip opens a light popover titled with the file name: 'Opened from' (this computer, or the source's host for a connected source), 'Read' (date and time), 'Read as' (the report line, `graphty.load.report`), then a divider and 'Project kept' ('in this browser, saved {time}', or Not saved with its cause). Its footer holds Replace data... and Download project file. The tooltip on hover is one line: '{file}, opened from this computer'. The chip stays in the left header whichever rail panel is open, and past the narrow breakpoint it stays in the file-name pill with the filter chip."
- **Why:** a reader asks two different "where" questions and today neither has one answer on screen: which file is on screen (the chip's name) and where the work lives once the tab closes (the project autosaves to browser storage, which a first-time user does not assume). A web page cannot see the file's folder, so the honest answer is "this computer"; saying so beats showing nothing. The privacy-sensitive personas ask this before loading anything (study/personas/screen-reader-analyst.md, "ask where the file goes"; analyst-alex.md, "your data stays in this browser"). Drawn in screens/frame-at-rest.html, state 5. The row names become message keys, so their wording is the owner's call.
- **Superseded** by "Main frame at rest: the file chip's popover holds the data file only" below: the popover mixed the data file with the project, and Figma keeps the project's facts in the file name's chevron menu.

## Main frame at rest: the graph's property section is headed "Graph"

- **Document and section:** `interface-specification.md` 4.1, the Nothing row and its note.
- **Old text:** "Look (the header's icon) B, Background, Layout" -- the section's header carries the Look icon but has no name.
- **New text:** "The property section is headed **Graph** (Figma's Page section), with the Look icon as its trailing action."
- **Why:** every other inspector section has a heading, and a header with only an icon reads as a stray button. "Graph" is the word the rail and the Graphs list already use for the same object, so it adds one word and no new term. Drawn in screens/frame-at-rest.html.

## Main frame at rest: a reading still being measured at load

- **Document and section:** `interface-specification.md` 4.1, the Nothing note; `state-matrix.md` 3 (the Inspector's Loading cell).
- **Old text:** (none: the glossary gives "not yet measured" for a count still being computed, but no surface says where it shows or what else happens)
- **New text:** "While the element is still filling a floor reading after Load, its row keeps its place and height and reads **not yet measured** in tertiary ink, with a progress glyph in the row's (i) slot, so the row itself says work is under way (a row-level mark, not a notice); a chart row shows the same words in place of the chart. A reading whose name and value cannot share one line (Connected components) keeps its value on a second line in every state, so nothing moves when the value arrives. No running notice appears, because the reader did not ask for a run; the notice is for requested work. Readings the file itself states (nodes, edges) and those computed from them (density) show at once."
- **Why:** on a large file the drawing and the counts arrive before components and the degree distribution. Without a stated in-between the rows would either jump in or show zeros, and a zero component count is the wrong conclusion task 1 exists to prevent. Drawn in screens/frame-at-rest.html, state 4.

## Main frame at rest: the blank project's header, Graphs row and Export

- **Document and section:** `state-matrix.md` 2, Inspector Blank and Graph panel Object list Blank; `interface-templates.md` 2 and 6.
- **Old text:** "Inspector | Blank | a project with no graph: one command | Add data" and "the Graphs section always has a row" -- which disagree about whether a graph exists.
- **New text:** "A new project holds one empty graph, 'Graph 1', with no count. The header shows the project name ('Untitled') and no chips: no file chip, since nothing was read, and no filter chip, since there is nothing to compute on. The inspector holds Add data... (primary, full width) above the Graph section, which stays as Figma's empty file keeps its Page section: Background is editable, because it does not depend on data; Layout is absent, because there is nothing to arrange, and appears with the first data. The Export section keeps its heading with "+" disabled, and Export... is disabled until the graph has data."
- **Why:** the two cells contradict each other; an empty graph row keeps Figma's rule that Pages always holds a page and gives Add data a place to put the data. A "Full graph" chip over nothing would state a scope for numbers that do not exist. Drawn in screens/frame-at-rest.html, state 3.

## Main frame at rest: the left panel's 8-word budget does not survive two style layers

- **Document and section:** `principles.md` 5, "The whole screen at rest" (the left panel's 8).
- **Old text:** "the left panel 8, Figma's measured count and a limit the information architecture must meet"
- **New text:** either raise the left panel to 12 in the conflict ledger, naming the source word on each style row (`information-architecture.md`, Styles) and the count word on the Graphs row as the reason; or show a style row's source word only when the stack holds layers from more than one source.
- **Why:** counted on the at-rest mock with two layers the analyst made: Graphs, Sets and paths, Styles, Base style, Views, "nodes" and two "made here" come to 13 (an earlier count of 11 missed Base style, an app-defined row name). The screen total was 46 against 50, so the question is only where the left panel's limit sits. Counted in screens/frame-at-rest.html (annotation layer). The choice is the owner's or the next study's; the second option loses the source on a single-source stack, which the recipe persona relies on.
- **Superseded** by "Only a layer that was not made here carries an origin word" below, which follows Figma's rule instead of raising the budget. With it, and the Graphs row's count removed (it was never in `interface-templates.md` 2), the left panel carries 8 against its 8.

## Only a layer that was not made here carries an origin word

- **Document and section:** `visual-language.md` A7, the style-layer row; `interface-templates.md` 9, the Styles list's rows; `content-design.md` 3 (the origin words).
- **Old text:** "the chip (`canvas-drawing.md` 3), the name, the origin word (made here, run, recipe) in secondary text, and the eye" (A7); "name, its origin word from `LayerSource.by` in secondary text" (templates 9).
- **New text:** "the chip, the name, and, only for a layer that was not made in this project, its origin word in secondary text (run, recipe); a layer the analyst made carries none, as Figma marks a library style or component with a glyph and a local one with nothing. The row's tooltip always names the origin, made here included." The words in `content-design.md` 3 stay; "made here" is used only in the tooltip and the Source facet.
- **Why:** the default case was labeled on every row. On the resting frame (two layers the analyst made) the two "made here" words were most of the left panel's overrun: 13 words of app text against a budget of 8. A source word carries information only once a second source is present, and then it marks exactly the rows that differ. Drawn in screens/frame-at-rest.html; screens/styles-list.html still draws "made here" and should follow. Two-way door.

## Main frame at rest: the file chip's popover holds the data file only

- **Document and section:** `interface-templates.md` 2, Graph panel, header (replaces the popover in "Main frame at rest: the file chip opens a popover..." above); `message-catalog.md`, new rows; `load.report`.
- **Old text:** (that proposal) "'Opened from' ..., 'Read' ..., 'Read as' ..., then a divider and 'Project kept' ... Its footer holds Replace data... and Download project file."
- **New text:** "A click on the file chip opens a light popover titled with the file name: 'Opened from' (this computer, or the source's host for a connected source) and 'Read' (date and time), with Replace data... in its footer. Counts are Statistics'. The tooltip on hover is one line: '{file}, opened from this computer'. Where the project is kept lives in the project name's chevron menu, as Figma keeps a file's facts in its file-name menu: its first line, not a command, reads 'Kept in this browser, saved {time}', or while the autosave fails 'Not saved: {cause}', then Download project file, a divider, Project info... and Minimize UI. Not saved sits beside the name while it is true (`interface-templates.md` 2 already says so)." And in `graphty.load.report`, `{counts}` renders "{N} nodes, {N} edges", never "links" (a glossary alias of edge).
- **Why:** the popover mixed two objects: the data file, which is a real graph-specific thing a Figma file does not have, and the project, whose facts Figma keeps in the file name's chevron menu, which this header already has. Two menus both answered "where is my work". The load date also showed three times (tooltip, popover, Last import row) and the counts four times. The alert-triage extension ("the file chip's popover also says what left the machine") keeps its rows, which are about the data; they follow 'Read'. Drawn in screens/frame-at-rest.html, states 5 and 6. The row names become message keys, so their wording is the owner's call.

## Main frame at rest: the Last import row is shown only while it has something the chip cannot say

- **Document and section:** `interface-specification.md` 4.1, the Nothing note ("then the headline readings, the Last import row, the Edges row ...").
- **Old text:** "then the headline readings, the Last import row, the Edges row"
- **New text:** "then the headline readings, the Last import row only while it carries {N} unmatched or {N} rows dropped (section 3's marks table), the Edges row". The file's name is the file chip's and the read date its popover's.
- **Why:** at rest the row repeated what the file chip says one glance away, and cost two words and a target. The marks it exists for are still shown whenever they are non-zero. Depends on the file chip being adopted; without the chip the row stays. Drawn in screens/frame-at-rest.html.

## Main frame at rest: an unset Background reads "Theme" and shows both canvases

- **Document and section:** `interface-specification.md` 4.1, the Nothing note, Background.
- **Old text:** "**Background** is Figma's Page color row (`CompactColorInput`), writing `GraphStyle.background`, never a style layer; unset, the canvas is `canvas-drawing.md` 1's"
- **New text:** "...; unset, the row's value reads **Theme** and its swatch is split between the light and the dark canvas, because the unset background follows the theme (`canvas-drawing.md` 1) and no single hex is right; set, it shows the hex as Figma's page color row does, with Reset."
- **Why:** Figma's page color row always shows the actual value. A "Default" label over a near-empty swatch read as "no fill". "Theme" is one word, as "Default" was. Drawn in screens/frame-at-rest.html.

## Main frame at rest: a collapsed section with nothing in it shows no count

- **Document and section:** `interface-templates.md` 2, Views ("collapsed to its header by default with its count").
- **Old text:** "collapsed to its header by default with its count"
- **New text:** "collapsed to its header by default with its count once it holds a view; with none, the header alone, in the empty-header ink (`content-design.md` 4, empty surface)".
- **Why:** the two rules meet at zero and the framework does not say which wins. A "0" is data and costs no word, but an empty list's header is blank everywhere else (Sets and paths, Export). Drawn in screens/frame-at-rest.html. Two-way door.

## Main frame at rest: the Export header's Copy as PNG, and the resting count

- **Document and section:** `interface-specification.md` 3 (the Export row: "header with '+' and a Copy as PNG `TrailingSlot`") and 4.1a ("the Export header's '+' 1").
- **Old text:** the two passages above, which disagree about what the Export header carries at rest.
- **New text:** (for the owner) either 4.1a counts Copy as PNG (the resting count with nothing selected becomes 8, still under 24), or section 3 puts Copy as PNG on the header's hover slot, as Figma shows a section's secondary actions on hover.
- **Why:** the mock had to choose and followed the count, drawing only "+". Recorded rather than chosen silently. The Statistics header's Menu (Over time...) and the Styles header's Menu (Export style..., Source) are drawn as hover-only in the mock, as Figma's are; the specification does not say whether they show at rest.

## Main frame at rest: a legend title per bound block, and the 10-word allowance

- **Document and section:** `principles.md` 5, "The whole screen at rest" (the 10 words for "the header, the toolbar, the filter chip, a legend title and the not-drawn line"); `options-and-encodings.md` 6 (block titles).
- **Old text:** "and 10 for the header, the toolbar, the filter chip, a legend title and the not-drawn line"
- **New text:** "...the filter chip, the legend's block titles and the not-drawn line; a legend block is titled by what it encodes, '{Channel} by {attribute}' ('Color by group', 'Size by degree'), with the layer's name in its tooltip, and each block title beyond the first may take the allowance over 10, as a principle-1 caveat with a conflict-ledger row."
- **Why:** options-and-encodings.md 6 requires one block per bound channel per layer, so a stack of a color layer and a size layer needs two titles; dropping the size key leaves the size encoding unexplained, which principle 1 forbids. Counted on the resting frame: rail labels 4, filter chip 2, two block titles 4, the view-mode face "2D" 1 = 11 against 10; the screen is 43 against 50. The title form also removes the stutter of a layer name followed by its attribute ("Group color group"). Drawn in screens/frame-at-rest.html.

## Main frame at rest: questions for the study, not changes

- **Document and section:** `research/study-schedule.md` (new tasks); no framework text changes until they are run.
- **Old text:** (none)
- **New text:** five checks on the resting frame, each put to the skeptical and first-time personas and scored on behavior, not on agreement: (1) the filter chip reads "Full graph" and is read-only until filter steps exist: does anyone click it, and are they confused when nothing opens? If so, hide the chip until the first filter step, the scope being implied. (2) The disabled Assistant on the rail: same test. (3) "Overview: General" with Replace on the first Statistics row: ask "what would Replace do here?" and accept only a correct answer; if it fails, move the overview choice into the Statistics header's menu. (4) "not yet measured" with a progress glyph: shown a still frame, can a participant tell "still coming" from "never computed"? (5) In a blank project, does the newcomer find that a file can be dropped on the canvas, without being told?
- **Why:** each control is sanctioned by the framework, but together they are targets on the first screen a new user sees that do nothing or lead to blocked work, and simulated participants agree too readily to settle wording. Drawn in screens/frame-at-rest.html, states 1, 3 and 4.

## Past the drawing limit: the not-drawn line names its reason and the limit

- **Document and section:** `message-catalog.md`, row `drawn.not`; `state-matrix.md` 4.2, first bullet.
- **Old text:** `{N} {kind} not drawn[; {M} hidden]` (while 4.2 says the line "states the count and the concern")
- **New text:** `{N} {kind} not drawn[: {reason}][; {M} hidden]`, the reason read from the element's node drawing level: "124,318 nodes not drawn: more than this browser draws at once (50,000)". The limit is the one the element measured on this machine, never a constant written into the app.
- **Why:** the template has no slot for the concern that 4.2 requires, and a bare count after a successful load reads as a failed load (`figma-crosswalk.md` 4.1). Saying "this browser" and the number tells the reader it is a capacity, not an error, and that narrowing is the way out. Drawn in screens/past-drawing-limit.html, state 1. The message key is published; the key does not change.

## Past the drawing limit: an offered step that would still not draw is shown, disabled, with its count (withdrawn)

- **Withdrawn.** The framework's rule stands: "Largest component" is offered only when it fits the limit (`state-matrix.md` 4.2). On a real network the largest component is nearly always past the limit (here 116,905 of 124,318 patents), so a disabled row would sit first in the popover on almost every large graph, pushing the one usable offer down. The reason given for it, that it is "the first idea most people have", was a guess, not a finding. The 94.0% row in Statistics already answers "why not the largest component". Bring it back only if study sessions show readers looking for it. screens/past-drawing-limit.html no longer draws it.

## Past the drawing limit: the dock goes back to one third once the scope draws

- **Document and section:** `state-matrix.md` 4.2, "The bottom dock opens at two thirds".
- **Old text:** "The bottom dock opens at two thirds of the canvas column, never under five rows, as the working surface; a height the reader set still wins." (silent on what happens after a filter step brings the scope under the limit)
- **New text:** add: "When a committed change brings the drawn scope under the node drawing limit, the dock returns to its default third, unless the reader set its height; undoing the step reopens it at two thirds."
- **Why:** once something draws, the canvas is the point of the step; keeping two thirds of the column for the table hides the result the reader just asked for. Two-way door. Drawn in screens/past-drawing-limit.html, states 1 and 3.

## Past the drawing limit: the graph's Layout row says why Run layout is off

- **Document and section:** `state-matrix.md` 4.2 ("No whole-graph layout runs") and the Inspector / Layout editor rows.
- **Old text:** (none: no state for the Layout row while nothing is drawn)
- **New text:** add a row "Inspector | Layout editor | Unsupported | past the node drawing limit with no step: the method named, 'waits for a narrower graph', Run layout disabled | Narrow the graph... | rule 4.2".
- **Why:** the rule forbids the whole-graph layout but the row that would start one has no state for it; a live Run layout button there invites a click that must fail. Drawn in screens/past-drawing-limit.html, state 1.

## The component-size list opens with a share strip (withdrawn)

- **Withdrawn.** The strip needed a component compact-mantine does not have and Figma does not show, and it repeated the one fact the next row already prints ("116,905 nodes, 94.0%"). Its first drawing also had segment widths that did not match the rows under it. If the study shows readers miss the proportion, add it back with widths computed from the element's component sizes.

## Past the drawing limit: offered steps are rows of the empty steps list, and open in the rule editor

- **Document and section:** `interface-templates.md` 7, Regions and rows; `state-matrix.md` 4.2, "Routes that need no prior knowledge".
- **Old text:** "Its popover, opening right of the left panel: header with Create rule set; the ordered steps ...; "+". The rule editor (section 10) takes the list's place in the same popover, headed by a back row." (silent on where the offered steps appear and how one is committed)
- **New text:** add: "While no step exists and the graph is past a drawing limit, the list shows graphty-element's offered steps as its rows, under 'Suggested for this graph', each with the node count it would keep and its caution ('a sample: favors hubs'). A row never commits on click: choosing it opens the step in the rule editor in the same popover, prefilled, with N editable and the count following it; '+' (Add step) opens the kinds of step, and Rule... opens an empty editor. The editor's Filter to is the popover's only commit. Narrow the graph... on the canvas opens this same popover at the chip, so there is one popover with one anchor; while it is open it covers the not-drawn line, so its empty-list text repeats the count."
- **Why:** a menu-like row that commits on click and an inline form that commits through a footer on the same surface leave the reader unsure which model applies. The template's drill-in keeps one model: the list chooses, the editor commits. Two-way door. Drawn in screens/past-drawing-limit.html, states 2 and 3.

## Past the drawing limit: the rule editor's count line, and whether Filter to commits a step that still will not draw

- **Document and section:** `interface-templates.md` 10, the Rule editor row; `state-matrix.md` 4.4.
- **Old text:** Rule: "predicate with AND, OR, NOT and membership; Scope; Population; Notes (on a filter step or rule set)". 4.4 says a neighborhood command's count "names any capacity limit the result would cross ... and offers one hop fewer or a filter by attribute", and is silent on a rule.
- **New text:** add to the Rule row: "In the steps popover (320 wide) each condition puts its attribute on one line and its operator and value on the next, so the values read in full; AND or OR sits between conditions. Above the footer, a count line from the element: '{N} nodes, {E} edges' and 'will draw', or 'will not draw: more than this browser draws at once ({limit}). Add a condition to narrow it further.' Past the limit **Filter to stays enabled**: the step still narrows every number, and the canvas stays undrawn with the new count, as Load still commits past a limit (4.3). With no match the line reads 'No nodes match' and names the highest value of the attribute within the other conditions, and Filter to is disabled, because an empty graph answers nothing."
- **Why:** a developer cannot build the count line from its happy case alone, and the framework does not say whether a step past the limit may commit. Enabling it keeps a filter step's meaning (it narrows the analysis) separate from drawing; the question for the owner is whether a step that leaves the canvas undrawn should also ask for confirmation. Numbers from `kit/fixtures.json` (`citations.ruleCounts`). Drawn in screens/past-drawing-limit.html, state 3 and its insets.

## Past the drawing limit: canvas controls while nothing is drawn

- **Document and section:** `interface-templates.md` 14 (Floating toolbar) and 6 (Header rows); `state-matrix.md` 4.2.
- **Old text:** (silent on the toolbar and the zoom menu while nothing is drawn)
- **New text:** add to 4.2: "While nothing is drawn, the Path and Note tools are disabled (both act on drawn nodes); Select stays live, because rows selected in the table are the selection; Quick actions and the view mode stay live. The zoom menu in header row 2 is disabled and shows no level; it shows the percentage again once something draws."
- **Why:** live tools on an empty canvas invite a click that can do nothing, and a zoom level with nothing to zoom is a number about nothing. Two-way door. Drawn in screens/past-drawing-limit.html, states 1 to 3.

## Past the drawing limit: a sampled step names itself on the chip

- **Document and section:** `message-catalog.md`, row `filter.chip`; `state-matrix.md` 4.2 ("each carries the caution in its name and every statistic on its scope says it describes a sample").
- **Old text:** `Filtered: {kept} of {total} {kind}`
- **New text:** `Sample: {kept} of {total} {kind}` while any step in force is a sample (an offered degree step, or any later sampling step), with the step count as for `Filtered:`. The graph's Statistics open with one line, "Describes a sample: {step name}. It favors hubs, so density and clustering read high.", and each reading the sample inflates carries its own mark.
- **Why:** the chip is the one scope mark every number reads (`principles.md` 1), so a sample that says "Filtered:" there hides its bias from every panel. The message key is published, so the wording is the owner's call; the key does not change. Drawn in screens/past-drawing-limit.html, state 5.

## Past the drawing limit: how N is sized for "Top N by degree, with neighbors"

- **Document and section:** `element-needs.md`, "Named filter steps offered past the drawing limit"; `state-matrix.md` 4.2.
- **Old text:** "N sized by the element from its legibility level so the first view reads at the fitted zoom, not merely draws, and editable on the step"
- **New text:** add: "N is the largest whose result (hubs plus neighbors) stays under the element's legibility node count at the fitted zoom. When even N = 1 is past it (a hub with thousands of neighbors), the step is not offered."
- **Why:** on a citation graph each hub brings hundreds of neighbors, so N is small and the result size, not N, is what the rule must bound. The mock uses 650 nodes as a stand-in for a legibility level that has no value yet (N = 3 keeps 586 nodes, N = 4 keeps 734; `kit/fixtures.json`, `citations.degreeSample`). The real figure is the element's to measure.

## Past the drawing limit: with nothing drawn, the not-drawn message takes the middle of the canvas

- **Document and section:** `state-matrix.md` 4.2, first bullet, and the Canvas / Partial row ("over the node drawing limit, whole place"); `interface-templates.md` 13 (Canvas furniture, the not-drawn line); `message-catalog.md`, row `drawn.not`.
- **Old text:** 4.2 and the Partial row place the not-drawn line in the legend ("the not-drawn line gives the count and concern and one action, Narrow the graph..."), bottom left, whatever is or is not drawn.
- **New text:** add to 4.2: "When nothing at all is drawn, graphty-element shows the not-drawn message centred on the empty canvas above the toolbar, as the canvas's empty state: the count as its title ('124,318 nodes not drawn'), the reason with the measured limit ('More than this browser draws at once (50,000).'), one line that nothing was lost ('Every node is counted in Statistics and listed in the table.') and one Button, Narrow the graph..., which opens the filter chip's popover. As soon as anything draws, the same words return to the legend's not-drawn line." The catalog row gains the third sentence as an optional part, `{N} {kind} not drawn[: {reason}][; {M} hidden][. Every {kind} is counted in Statistics and listed in the table.]`, shown only in the centred form.
- **Why:** in round 1 the legend-corner line was found on a second look, not the first: "My gut says it's hung ... I found that line on my second look" (a threat hunter), and "the start was an empty black box with a small line in the corner". On a large blank canvas the corner is the last place the eye goes; the middle is where an empty state is read. The message is graphty-element's, not the app's, so the placement is an element behavior that every consumer gets, and the catalog key does not change; the extra sentence is new published wording, so it is the owner's call. Drawn in screens/past-drawing-limit.html, states 1 and 1b.

## Past the drawing limit: the degree distribution is in Statistics at rest, and the sample step names its degree

- **Document and section:** `interface-specification.md`, the Statistics row and the notes on the Nothing column; `state-matrix.md` 4.2, "Routes that need no prior knowledge"; `element-needs.md`, "Named filter steps offered past the drawing limit".
- **Old text:** the Nothing column lists the General overview's readings; the degree distribution is specified (`options-and-encodings.md` 5, `interface-templates.md` 12) but not placed in the at-rest Statistics. The offered step is "Top N by degree, with neighbors".
- **New text:** add to the Nothing column: "After the component-size list, the degree distribution in `HistogramRow`'s taller form: a variant row In, Out, Total on a directed graph (In first; degree alone on an undirected one), the complementary cumulative count on log-log axes with its maximum marked, and below it the count at degree 0, which the log axis cannot show, with what 0 means for this graph." Rename the offered step on a directed graph to "Top N by {in-degree | out-degree | total degree}, with neighbors", the kind in its name.
- **Why:** past the drawing limit the distribution is the first thing a network scientist looks for ("What I actually want first is the degree distribution. In-degree, log-log."); the mock had left the specified chart out. "Which degree? This is a directed graph ... I am not clicking a sample I cannot describe in a methods section" -- the same session, on the offered step. The mock names total degree, because the fixture's hubs are ranked by it; whether graphty-element should offer in-degree instead on a citation graph is open. The distribution's bins are blocked on graphty-element (`interface-specification.md` 7.4). The full graph's distribution in `kit/fixtures.json` is modelled, not computed. Drawn in screens/past-drawing-limit.html, states 1, 4 and 5.

## Past the drawing limit: component and isolate counts are links, and components say weak

- **Document and section:** `interface-specification.md`, notes on the Nothing column; `interaction-pattern-entries.md` 4.3 (see "A count selects what it counts: decided", above).
- **Old text:** "isolates", "components" and the component-size rows are plain readings.
- **New text:** "The isolates count, the components count and each component size in the list are links (Anchor): a click selects what it counts and opens it in the table under the Selected scope; the components count opens a Components tab with one row per component. On a directed graph the row reads 'weak components'."
- **Why:** "Isolates 2,406. That is worth a look already ... I would want to click that number and get those rows in the table. Can I? The row does not look clickable." Counts that look like plain text were dead ends. The same session asked for the word "weak" on a directed graph. Two-way door. Drawn in screens/past-drawing-limit.html, state 1b.


## Past the drawing limit: the table lists every row, and the offered steps are "Top N by this result, with neighbors" and "Around a node"

- **Document and section:** `interface-templates.md` 16, Departures (the block on rows past the drawing limit); `state-matrix.md` 4.2, "Routes that need no prior knowledge"; `element-needs.md`, "Named filter steps offered past the drawing limit" and the paged-listing row.
- **Old text:** 16: "Blocked (`interface-specification.md` 7.4): rows past the drawing limit (the paged-listing row)". 4.2: "the element offers named steps from its own statistics: 'Largest component' when it fits the limit; 'Top N by degree with neighbors' ... Neither sample is neutral ... each carries the caution in its name and every statistic on its scope says it describes a sample".
- **New text:** 16: the table never waits on the drawing limit. Past it, every row in scope is listed, read from graphty-element a page at a time in the table's sort order, in the virtualized `DataTable` (scroll thumb sized for every row); after a run the table sorts by that run's result. The paged listing stays an element need, but it is the table's ordinary data path, not a departure that hides rows. 4.2: the offered steps are ordinary Filter to steps, listed under "Suggested for this graph" in the empty steps list: "Top N by {what the table is sorted by}, with neighbors" (before any run, the sort column; after a run, its result, e.g. "Top 10 by betweenness, with neighbors"), with the count it keeps and "favors hubs"; and "Around a node...", which is Filter to neighbors on a picked row or a node found by name (1 hop, both directions, editable), with its count. "Largest component" is still offered when it fits the limit. Neither is called a sample: the chip reads "Filtered:" as for any step, and Statistics open with one line saying what the step keeps ("Describes the 3 most cited patents and all their neighbors, not a random sample. It favors hubs, so density and clustering read high."), with a mark on each reading it inflates.
- **Withdraws:** "a sampled step names itself on the chip" (no "Sample:" chip form; `filter.chip` keeps its wording) and the "sample" wording in "how N is sized for Top N by degree, with neighbors" (the sizing rule itself stands).
- **Why:** round 2, severity 3 (top-50-to-excel, 3 of 3 sessions; too-big-to-draw, 3 sessions; the code-first focus group): past the limit the rows were blocked, so the top 50 could not be read or confirmed before export, and the only offered subset was hubs by degree, "the least interesting view". A network scientist in the same study: "Calling it a 'sample' is wrong vocabulary. A sample means random. This is the union of three ego networks." Both offers are existing steps (Filter to, Filter to neighbors), so no new command. Two-way door for the app; the offered-step names are graphty-element's, so their wording is proposed. Drawn in screens/past-drawing-limit.html, states 1, 2, 3 (insets) and 5.
## The load step asks what a weight column means, on the weight row

- **Superseded** by "The weight-meaning question moves from loading to the first run that needs it", after round 1 of the study; screens/load-step.html no longer draws the question.
- **Status:** one of two alternatives for where the weight's meaning is asked; the other is "Load and characterize: the weight's meaning is not asked in the load step (withdrawn proposal)", above. Both use `glossary.md` 11's words exactly (similarity, distance, capacity, unknown, with their glosses), so only the placement is open, and H1 in study/hypotheses/load-and-characterize.md decides it with half the sessions on each. The plain-words labels of the withdrawn "A bigger {column} means" proposal are used by neither. This text replaces this entry's earlier version, which labeled the fourth role "Not set" and stated the similarity conversion as a fixed fact.
- **Document and section:** `interface-templates.md` 20a, Regions and rows.
- **Old text:** "the mapping rows: source, target and id columns as `ComboInput` type slots, and each column's kind and role as `StyleSelect`;"
- **New text:** add after it: "When a column's role is Weight, follow-on rows sit under it, indented as Figma indents a property's sub-rows. First a legend '{column} as a weight means' with an (i), and a segmented control of the four roles: Similarity, Distance, Capacity, Unknown. One secondary line under it gives the chosen role's gloss only ('Larger is closer.'); the (i) tooltip holds all four glosses and 'Nothing is guessed from the column's name.' The default is Unknown; it never blocks Load, and Statistics keeps reading 'weight: unknown' with its role control. When Similarity is chosen, one more row appears: 'As a distance', a `StyleSelect` of 1 - w, 1/w, -log w and 'Ask when a path first needs it', with a line saying why the first option is first ('Offered first because every value is between 0 and 1.'). 1 - w is offered first only when every value lies in [0, 1]; -log w only when every value lies in (0, 1]; otherwise 1/w. For Add data and Join, the roles of attributes the project already has are shown as text ('weight: unknown'), not asked again: after the first load the role's home is Statistics."
- **Why:** `top-tasks.md` ranks declaring what a weight means with checking the import as the tasks whose cost of error overrides their rank, and the load step is the one moment the analyst is certainly looking at the column. `graph-conventions.md` 2 makes the similarity conversion part of the declared role, "chosen in the import report, or inline the first time a distance algorithm meets the attribute", so the step offers the choice, including the deferral, instead of stating 1 - w as a fact; the extra row has a graph reason Figma has no counterpart for, since a similarity fed to a path search unconverted reverses every path. Showing only the chosen gloss follows Figma's progressive disclosure (definitions in (i) tooltips) and keeps the clean file short.
- **Drawn in:** screens/load-step.html, frames 1 (Unknown), 3 (Similarity with its conversion row) and 7 (Add data, shown as text).

## A weight column that is not all numbers blocks Load until the analyst chooses

- **Status:** folded into "Load and characterize: which load issues block Load (replaces two earlier entries)", above, which is the one blocking rule: an issue blocks only when no reading keeps every value; its fix is a policy select on the issue row, and the column's Read as field shows the same setting. `graphty.load.blocked` and `graphty.load.blockedReason` are withdrawn with it. This entry now adds only what that rule leaves open, so the blocking case has one message key and one footer string.
- **Document and section:** `message-catalog.md`, a row after `load.parallelEdges`; `interface-templates.md` 20a; `state-matrix.md` 3.
- **Old text:** (none: nothing names the blocking message, its options or its footer)
- **New text:** "`graphty.load.notNumber`: heading '{column} is read as text, so it cannot {verb}' (weigh edges; place nodes; order by time), facts '{K} of {N} values are {token}; the rest are numbers {range}', a policy select with no default whose options state their results in counts -- 'Number, {token} as missing: {N} edges; {K} of them without a weight', 'Number, drop the rows with {token}: {N-K} edges; the {K} rows are not loaded', 'Text: cannot weigh edges; Load stays off while its role is Weight'. Footer reason `graphty.load.notNumber.reason`: 'Load is off: choose how to read {column}'. The column is sorted to the top of the mapping with the danger glyph (the crosswalk's 'unsettled columns first'). When the chosen option leaves some edges without a value, the counts say so ('without a weight: 150'), not the footer. The issue row's select and the column's Read as field are one value shown twice; either writes it. State fixture `State/Canvas/LoadStepBlocked`."
- **Why:** the merged rule says this case blocks but not what the analyst reads or chooses. Each option has to state its cost in counts, because the choice is between changing what "weighted" means for 150 edges and not loading 150 rows; real interaction exports (STRING, BioGRID) mix NA into score columns routinely. Message keys are published, so the key names are the owner's call.
- **Drawn in:** screens/load-step.html, frame 2 (the list open from the column, the NA rows in view) and frame 3 (after "Number, NA as missing").

## Each parallel-edge policy says what happens to the other columns

- **Document and section:** `message-catalog.md`, row `load.parallelEdges`; `graph-conventions.md` 2, Reductions.
- **Old text:** policies "Keep all: {E} edges", "Merge into one, {reduction} of {attribute}: {E} edges"
- **New text:** keep both labels and add a second line to each option: Keep all -- "One edge per row, so degree counts every {row noun}. A measure that needs one edge per pair merges them by {reduction} of {attribute} and says so on its result." Merge -- "One edge per pair. {columns} are not kept, because a merged edge has several." And in `graph-conventions.md` 2, Reductions: "A non-weight edge attribute with differing values across merged edges is dropped from the merged edge and named in the import report; it is never set to one row's value."
- **Why:** the reduction rule covers weights only. The protein evidence file carries a `source` column (experiments, databases, coexpression, textmining) whose four values cannot be summed or maxed; taking the last row's value would invent a fact. The analyst deciding between 2,298 and 1,262 edges needs to see that cost before choosing. Drawn in screens/load-step.html, frame 3 (the list open, drawn as the dark menu with a description line per option).

## Filter at import appears only while a size concern is crossed, as a link at the footer's left

- **Status:** replaces this entry's earlier text (a ghost button in every state, promoted to secondary).
- **Document and section:** `interface-templates.md` 20a, Regions and rows (the footer); "Load and characterize: where focus lands in the load step", above (the refusal case).
- **Old text:** "`ModalFooter` with a reason slot beside the commit."
- **New text:** "`ModalFooter`: at the left, Filter at import... as an `Anchor`, present only while the step names a size concern (will not be drawn, will not be autosaved); then the reason slot, used only while Load is off and left empty when an issue row already says the same thing; at the right, Cancel (secondary) and the commit (primary: Load, Add data, Join). On a refusal (`State/Canvas/LoadStepError`) there is no commit: Filter at import is the primary button beside Cancel, and focus lands on it."
- **Why:** graphty-element has no filter at import (`element-needs.md`, "Filter at import": "none; a load reads the whole file"), so showing it on every file advertises a feature that does not exist and adds a third action to the common case. Figma's modal footer is one secondary and one primary; a detour belongs at the left as a quieter action. On a refusal it is the only way forward. A reason slot repeating an issue heading said the same thing twice.
- **Drawn in:** screens/load-step.html, frames 4 and 6. Until the element need is met the link is absent and a refusal offers Cancel only.

## Color by a value: a layer with an automatic name takes its name from its first binding

- **Document and section:** `content-design.md` 3, Copy conventions, the "Names" item.
- **Old text:** "automatic names are kind plus counter ("Set 1")"
- **New text:** add: "A style layer that still carries its automatic name takes its name from its first binding, attribute then channel ("log2FoldChange color", "degree size"), until the analyst renames it. A verb (Color by, Size by) names the layer it makes the same way. A layer with no binding keeps kind plus counter ("Layer 1")."
- **Why:** the Styles row, the layer editor's header and the legend block title all show the layer's name. "Layer 1" in a legend tells a reader of the figure nothing, and the legend is what gets exported. Drawn in screens/colour-by-value.html, states 1 and 2, and the flow flows/colour-by-value.html.

## Color by a value: the style-layer editor's selector row is labeled "Applies to"

- **Document and section:** `interface-templates.md` 10, the Style layer row of the editor table.
- **Old text:** "selector (its inline rule, or the kept set it references)"
- **New text:** "selector, labeled **Applies to** (its inline rule, or the kept set it references), reading "All nodes", a set's name, or for a run's own layer the result it selects ("on this path: 4 nodes, 3 edges")"
- **Why:** the row has no label anywhere in the framework, and "selector" is a rejected developer word on screen. "Applies to" says what the row decides in the reader's words, and the same row carries the rule that a run's layer paints only its result. Drawn in screens/colour-by-value.html, states 1, 2 and 5.

## Color by a value: Move to Other on a category's row

- **Document and section:** `options-and-encodings.md` 5, "Categories past the palette".
- **Old text:** "past the palette's `capacity`, the rest fold into one gray "Other" entry that opens its members, decided once, when the layer is made."
- **New text:** add: "Each value row in the encoding popover has a menu with **Move to Other** (and, on Other's members, **Move out of Other**), one undoable command each, written into the layer's `map` like a swatch override. Moving a placeholder value ("Unassigned", "unknown", "NA") into Other frees its palette slot for the next real category."
- **Status:** proposed and untested. It is shown on screens/colour-by-value.html state 4 as a proposal and must be tested in the study (does an analyst look for a way to send "Unassigned" to gray, and which of the two routes below does she find?) before any screen shows it as shipped. **The smaller alternative**, which needs no new command: the overflow sort skips a value once its swatch has been set to Other's gray, so an ordinary swatch override frees the palette slot. If the study finds the swatch route, this entry is withdrawn in favor of it.
- **Why:** the kit's protein network has nine module values against eight colors. Folding by count sends the smallest real module (TGF-beta, 21 proteins) into Other and gives "Unassigned" (26 proteins) a palette color, so a placeholder is drawn as if it were a pathway and a real pathway is drawn gray. The fix must stay one explicit, recorded choice, not a guess by name. It is an element need if `map` cannot assign a value to the overflow group. Drawn in screens/colour-by-value.html, state 4.

## Color by a value: a single layer that paints nothing keeps its own row

- **Document and section:** `interface-templates.md` 9, Styles list; `interaction-pattern-entries.md` 6.8.
- **Old text:** "a run of layers that paint nothing collapses in place into one "N layers paint nothing" row"
- **New text:** "a run of two or more layers that paint nothing collapses in place into one "N layers paint nothing" row; a single such layer keeps its row, with "paints nothing" as its secondary text"
- **Why:** collapsing one layer into "1 layer paints nothing" hides its name and saves no space. The case is common: every time an analyst puts a second color layer on top, the one beneath paints nothing, and the reader needs to see which one to switch back on. Drawn in screens/colour-by-value.html, state 4.

## Color by a value: a run's own layer states its reach in its editor

- **Status:** questioned. A review of screens/styles-list.html found that the sentence restates the repository's developer rule to an end user, and that the painted row with its denominator ("paints 4 of 300 proteins, 3 of 1,262 interactions") already states the reach. screens/styles-list.html no longer draws the sentence; screens/colour-by-value.html still does. One of the two should change once this is decided.

- **Document and section:** `interface-templates.md` 10, the Style layer editor body; `message-catalog.md` (a new message).
- **Old text:** (none: an automatic layer's editor shows its rows read-only and offers Edit a copy)
- **New text:** add to the Style layer body, for an automatic layer: "a sentence of reach, from the element: "This layer writes only to the {n} {kind} on this {result}. The other {m} keep the paint of the layers beneath it."", with a new message key for the owner to word.
- **Why:** that an algorithm's layers write only to its own result is the rule that makes stacking runs work (root CLAUDE.md, "Algorithm Styles"), and today nothing on screen shows it. The painted count alone ("4") has no denominator. The flow's side-by-side of the correct path layer and a layer that grays everything else shows what is at stake. Drawn in screens/colour-by-value.html, state 5, and flows/colour-by-value.html section 3.

## Color by a value: a refused attribute shows its reason under the row, not only in a tooltip

- **Document and section:** `message-catalog.md`, row `style.cannotBind`, its form column.
- **Old text:** form: `tooltip`
- **New text:** form: `secondary line under the disabled row, and tooltip`
- **Why:** a disabled row in the binding picker takes no keyboard focus and a touch screen has no hover, so a tooltip-only reason is never seen by a keyboard, screen-reader or touch user (WCAG 1.3.1, 2.1.1). The line is short ("Shape takes categories; bin degree first") and the picker has room for it. Drawn in screens/colour-by-value.html, state 6.

## Color by a value: the default diverging palette is blue to orange, with a mid-tone midpoint

- **Document and section:** `options-and-encodings.md` 5, rule 1 ("Signed values on a color channel"); `canvas-drawing.md` 3 (the diverging midpoint); `element-needs.md`, the palette-defects row.
- **Old text:** "Until a default diverging palette is measured (`canvas-drawing.md` 3, which states that red-blue fails its midpoint rule), the shipped `red-blue` is used and the legend names the midpoint in words."
- **New text:** "The default diverging palette is **Blue to orange**: blue below the midpoint, orange above, through a mid-tone sand, proposed as `#1f5b99 #2f74c0 #5a93dc #a7b4c4 #bfae5a #d0973f #c77a22 #ad5a0f #8f3f06`. Its midpoint `#bfae5a` clears 2:1 on both canvases (2.05 on `#F5F5F5`, 7.48 on `#1E1E1E`) and sits 18 and 33 (OKLab distance times 100) from the unstyled and Other grays. The legend states the direction in words ("blue below 0, orange above"), and the encoding popover shows the scale's Reverse as a button beside the palette field. graphty-element's shipped `BLUE_ORANGE_COLORS` is red-blue reversed (it ends in `#b2182b`) with the same `#f7f7f7` midpoint, so this is a new palette, not a rename; the element's palette-quality test measures it before it ships."
- **Why:** the shipped red-blue puts red below 0; biologists bring the expression-heatmap habit of red for up (Eisen et al., PNAS 1998), finance the opposite, so any red-green or red-blue default reads backwards for one of the personas. Blue and orange carry no up or down meaning in either field and stay apart under the common color-vision deficiencies. The shipped midpoint `#f7f7f7` is 0.6 from the light canvas `#F5F5F5`, so a protein with almost no change is carried by its outline alone and reads as "no value"; a mid-tone midpoint fixes that. The default is a two-way door (a palette default, changed by one edit and one release note), so it is decided rather than left to the study; the study still records which way participants read the figure. A biology-specific default was rejected as a persona-specific feature. Drawn in flows/colour-by-value.html, section 3 (the kit drawing `ppi-foldchange-bo-path`); the screens page still draws the shipped red-blue until it is redrawn.

## Color by a value: the encoding popover is wider than the editor popover

- **Document and section:** `interface-templates.md` 10, "Width `PANEL_GRID.POPOVER_WIDTH`".
- **Old text:** "Width `PANEL_GRID.POPOVER_WIDTH`"
- **New text:** "Width `PANEL_GRID.POPOVER_WIDTH`, except the encoding popover, which takes 272 so its header fits the attribute, the channel and Fix at <value>, and its domain histogram has room for a readable ramp"
- **Why:** at 240 the header "log2FoldChange to Color" plus "Fix at current value" wraps to two lines, and the named-value form ("Fix at #E69F00, the largest group") cannot fit at all. Drawn in screens/colour-by-value.html, states 2 and 4. A compact-mantine `Popout` width variant, not a bespoke popover.

## Color by a value: four ways in, and the level check is the picker, not a step after it

- **Document and section:** `task-flows.md` 5, the header's Start, the diagram and the step table.
- **Old text:** "**Start:** a result selected, or the table." The diagram has two doors, "Result editor: Appearance" and "Table, Nodes or Edges: column header", both going straight to "Style layer added with defaults".
- **New text:** "**Start:** a result, an attribute (a table column header, an inspector value row, or a Graph panel attribute row, all opening the attribute's menu), or the Styles list." Add to the diagram: `ST["Styles list"] -->|"Add style layer"| E1[/"Empty layer added on top, its editor open"/] -->|"Fill's four-dot button"| AP(["Attribute picker: fitting rows first, the rest disabled with the reason"]) -->|"an attribute that fits"| C1`, with `AP -.->|"Esc: no binding; the empty layer stays"| E1`; relabel the column door "An attribute: table header, inspector value row, or Graph panel attribute row" and its edge "Color by / Size by: a verb the attribute's level refuses is disabled, with the reason"; relabel the result edge "Color by / Size by: only the verbs its result allows". No decision node follows the choice. Desk count adds: "From the Styles list: 2 steps ("+", the attribute), 1 travel (the four-dot button), the same as Figma's."
- **Why:** `figma-crosswalk.md` 4.2 ("A binding is made from the property row") and `output-homes.md` 3 (`encode`, starting places "an Attributes row's menu") already name the value row and the Graph panel attribute row as doors, and `options-and-encodings.md` 4 makes the four-dot picker the Figma-faithful way to bind; flow 5 drew neither. Drawing a "does it fit?" decision after the choice would be unreachable, because the picker and the menus already list a misfit disabled with its reason (`options-and-encodings.md` 4; pattern 6.6, "an attribute past the unique-value cap is offered as a label, never a color"). The Styles route is not longer than Figma's: an empty section header carries the four-dot button, so no Fill "+" is needed. Drawn in flows/colour-by-value.html, section 1.

## Color by a value: "tune" means the scale's popover; Fix at is its exit

- **Document and section:** `task-flows.md` 5, the diagram (`Q -->|"yes: the section's four-dot picker, or a number row's Apply variable"| B`) and the step table's "tune" row.
- **Old text:** tune | a channel row | the section's four-dot picker, or a number row's Apply variable | Bind a property to an attribute (6.6) | "Size by degree" | the bound pill | Surfaced | `session.styles.update`
- **New text:** two rows. "bind | the layer's Fill four-dot button; the attribute picker | an attribute | Bind a property to an attribute (6.6) | ..." and "tune the scale | the encoding popover, from the bound row's settings button | scale, palette, Reverse, midpoint, steps | Edit in the inspector and one popover (6.2) | "Change palette of log2FoldChange color" | the legend repaints | Surfaced | `session.styles.update`". Add a third: "fix at one value | the encoding popover's header | Fix at <value> | Bind a property to an attribute (6.6) | "Fix degree size at 8.2 px" | the row is a constant and the legend block disappears | Surfaced | `StylesApi.resolveToStatic`; naming the value first **missing**: "a preview of a static resolution"". In the diagram: `Q -->|"yes: the bound row's settings button"| EP(["Encoding popover"])`, `EP -->|"Fix at <value>"| FX[/"One value kept: the row is a constant, its legend gone"/]`.
- **Why:** a layer made by a verb is already bound, so its "tune" step is changing the scale, which the framework puts in the encoding popover behind the bound row's settings button (`options-and-encodings.md` 4); the four-dot picker binds a channel and is the Styles route's second step. Without Fix at the flow has no way back from a binding to a constant, and pattern 6.6 is validated by exactly "bind size to degree, then fix it". Drawn in flows/colour-by-value.html, section 1.

## Color by a value: a run's "Color set by <layer>" is a conditional trust check, pending an owner decision

- **Document and section:** `task-flows.md` 5, the diagram and the step table.
- **Old text:** (none: the flow does not mention a run's suppressed paint)
- **New text:** add a dashed trust check hanging off "Style layer added", on an edge labeled "only if a run's layer writes this channel": `{{"The run's editor reads 'Color set by <layer>', with Apply anyway"}}:::gap`, and a step row "yield | that run's editor, Appearance | Apply anyway (optional) | Edit in the inspector and one popover (6.2) | "Apply Degree color anyway" | "Color set by log2FoldChange color" | Surfaced | **missing**: "A per-run outcome for each suggested channel"; the check's defect **missing**: "Automatic paint suppressed only for elements a higher authored layer paints" (issue #551)". The flow says in one line that the step follows the recommended answer to door 26, Whether a finished run paints.
- **Why:** binding a channel that a run's automatic layer also writes is the commonest way a run stops repainting, and the analyst sees it in another panel, not at the point of adding. Door 26 is still open, so the step is drawn dashed and never as settled design.

## Color by a value: a multi-selection binds without a set-first question (task-flows 5.1 against pattern 6.6)

- **Document and section:** `task-flows.md` 5.1, the diagram (`SEL --> Q{"Keep these as a set first?"}`) and the "hand edit" row.
- **Old text:** `SEL["Inspector, several nodes: Appearance"] --> Q{"Keep these as a set first?"}`; `Q -->|"yes: Create set"| S`; `Q -->|no| PK2(["Color picker"])`; `PK2 --> OV[/"Overrides layer written"/]:::gap`
- **New text:** `SEL --> Q2{"A constant, or follow a value?"}`; `Q2 -->|"a constant: the fill swatch"| PK2(["Color picker"]) --> OV[/"Overrides written; its row offers Create set"/]:::gap`; `Q2 -->|"a value: the four-dot button"| AP2(["Attribute picker for a selection"])`; `AP2 -->|"Create set and color by <attribute>"| CS[/"Set and its layer added; the set's name in rename"/]:::gap`; `AP2 -->|"Color by <attribute> (all nodes)"| ALL[/"Layer added for all nodes, and says so"/]`. Step rows: "bind a selection | ... | Create set and color by degree | 6.6 | "Create set and color by degree" | the new set's name opens in rename" and "bind every node | attribute picker, lower group | Color by degree (all nodes) | 6.6 | "Add degree color" | the row says all nodes".
- **Why:** the two documents disagree. Pattern 6.6 says an element selection's Appearance row is "Figma's most habitual move, where the picker's first choice is labeled 'Create set and color by Degree' ... one element command and one undo step", and `figma-crosswalk.md` 4.2 sends a constant typed on a multi-selection straight into Overrides. Flow 5.1 asks a blocking question before every hand paint, which Figma never does and which the undo-instead-of-asking rule forbids; its "no" branch offers only a color, so a binding silently requires "yes". Pattern 6.6 and the crosswalk win; keeping the selection as a set becomes a label on the picker's first choice and a non-blocking Create set on the Overrides row. Drawn in flows/colour-by-value.html, section 2.

## Color by a value: an undo label names the layer it adds or changes

- **Document and section:** `output-homes.md` 3, the command register row "Color by, Size by, Width by, Label with" (Undo label column); `content-design.md` 3, "Undo labels".
- **Old text:** Undo label: "Color by log fold change"; "Size by degree"
- **New text:** Undo label: "Add log fold change color"; "Add degree size" -- the verb Add and the name the new layer takes. Edits on a layer name it as the object ("Change palette of log fold change color", "Fix degree size at 8.2 px"). Binding an existing layer names it as it was ("Color Layer 1 by log2FoldChange"). Add to `content-design.md` 3: "An undo label's object is the name the analyst sees on the row it changes."
- **Why:** the Styles row, the legend and the layer editor all show "log fold change color" (the automatic-name proposal above), while the undo label read "Color by log fold change", so a Figma user reading "Undo Color by log fold change" sees a different noun from the row it removes. Content-design already makes Add the verb for a layer. The alternative, naming the layer "Color by log fold change", was rejected: it makes the suppression line read "Color set by Color by log fold change", and the framework's own examples name layers "<result> color" ("Degree color"). The suppression line stays "Color set by log2FoldChange color", which is the glossary's template filled in; a shorter hand-written name ("Fold change") cannot be derived from an attribute name. Drawn in flows/colour-by-value.html, sections 1 and 2.

## Color by a value: a binding whose values are all equal says so

- **Document and section:** `options-and-encodings.md` 6, Legends, item 2 ("The form follows the binding's scale"); `message-catalog.md` (a new legend departure).
- **Old text:** (none: the legend has no form for a domain of zero width)
- **New text:** add: "When every bound value is the same, the scale has no width: the element paints one color (the palette's midpoint for a diverging palette, its middle step otherwise) and the legend block is one chit with the departure `graphty.legend.singleValue`, "all {count} values {value}" ("all 300 values 0.42"), instead of a ramp."
- **Why:** a ramp over a domain of zero width divides by zero or paints an arbitrary end, and a reader shown a ramp believes the values vary. It happens after a filter narrows to one value or on a constant column. The key is a published message, so its wording is the owner's. Drawn in flows/colour-by-value.html, section 5.

## Color by a value: a size layer is named "Size: {attribute}", and its key draws true-size circles

- **Document and section:** `options-and-encodings.md` 6, Legends (the size block); `content-design.md` 3, the "Names" item and "Undo labels" (amending the proposals "a layer with an automatic name takes its name from its first binding" and "an undo label names the layer it adds or changes", above, for size layers); `output-homes.md` 3, the command register row "Color by, Size by, Width by, Label with".
- **Old text:** automatic name "degree size"; undo labels "Add degree size", "Fix degree size at 8.2 px"; the size block drew five binned marks ("0 to 1, 2 to 3, 4 to 7, 8 to 16, 17 to 34") with "Square root of area, 5 steps".
- **New text:** "A size layer's automatic name is 'Size: {attribute}' ('Size: degree'), the same on its Styles row, its legend block title, its editor header and its undo labels ('Add Size: degree', 'Fix Size: degree at 5.1 px'). Its legend block draws five circles at their true size on the canvas at the current zoom, at round values from the bound values' own distribution: the 10th, 25th, 50th and 90th percentiles and the largest (on the 300 proteins: 4, 6, 8, 12 and 34), with one line naming them. A second line says the mapping in words, 'Area proportional to {attribute}' (the default, square root of the value) or 'Diameter proportional to {attribute}' (Linear), and, for a count over edges, whether repeated edges between one pair count ('Each partner counted once' or 'Repeats counted'). Hovering or selecting an element adds a line with its own circle at true size and its value ('MAPK1: degree 34'); the canvas tooltip reads the same. On a filtered graph the percentiles are of what is drawn and the block says so ('of the filtered graph (56 of 300)'). The circles, the percentiles and the repeat rule are graphty-element's legend output; the app draws them and never computes them."
- **Why:** round-3 study, "Size is one layer with two names, and a dot's value cannot be read": the same layer read "Degree size" in the list and "degree" in the key, participants could not tell whether size meant area or radius or whether a repeated connection counted, and could not read one protein's value off the key. Binned steps hid the value too: a degree-32 protein and a degree-17 one drew the same. True-size circles at the data's own percentiles keep the key readable without implying steps the canvas does not draw. The color layer's name ("log2FoldChange color") is not changed by this entry; whether every layer takes the "{Channel}: {attribute}" form is left to the owner. Drawn in flows/colour-by-value.html, section 1, "The size key".

## The over-budget refusal: order, focus and one commit

- **Document and section:** `interaction-patterns.md` 3.3, "Always created unrun, with Run focused, whatever the band"; `interface-templates.md` 10, the Result editor's header; `state-matrix.md` 3, Results panel, Result row, Error (row); `content-design.md` 4, the over-budget row.
- **Old text:** "Always created unrun, with Run focused, whatever the band: ... a run the gate refuses"; "the result editor carries Run, and Cancel while running"; state matrix: "refused by the gate: Run exactly and the sampled method, each with its band word, then the fitting scopes"; content design: "a choice: Run exactly, the sampled method, a fitting scope, each with its band".
- **New text:** "While the gate refuses a result, its editor shows the error slot and the routes, and nothing else: no option rows and no Run line, because the routes already are the scope choice. The routes are ActionRows (the route on the left, its band as trailing state, its description in the tooltip), cheapest first and grouped under two headers by the gate's verdict: 'Fits the budget' (the sampled method, 'Sampled, {k} sources'; then each kept set that fits, 'Exact on {set}'), then 'Over the budget' ('Exact on the full graph'). Arrow keys choose; focus lands on the first row. The header's TrailingSlot carries one Button naming the chosen route -- Run sampled, Run on set or Run exactly -- and Enter on a row does the same. Run sampled creates the sibling result '{Algorithm} (sampled)' and runs it at once, as a catalog click under the budget does, with Cancel and the undo chord as the safety net; its sample size and seed are then edited like any result that has run, held for Run. It is created unrun only when the sampled estimate is itself 'a few minutes' or longer. With no sampled method the set is first; with no fitting set either, only Exact on the full graph remains, focused."
- **Why:** focus lands on the first choice and Enter is a reflex, so the first row must be the safe one; putting Run exactly first and focusing the second row is a special case to build and to explain, makes reading order and focus order disagree for a screen-reader user ("2 of 3"), and a focus ring on a middle row reads as "recommended". Grouping by verdict gives every row its verdict without widening a 240 px row: the band alone cannot say whether an "under a minute" route passes a 30-second cap (`state-matrix.md` 4.10). One commit in the header is Figma's popover model; three outlined buttons in one popover are not. A second commit for the sampled route (Create, then Run) added a click and no evidence, since the error it was meant to show is not stated. Drawn in screens/option-form-cost.html (states 1 and 4); screens/run-and-read.html state 5 has the same order. To test in the refused-run recovery task (`state-matrix.md` 9).

## A sampled method states its error before it runs

- **Document and section:** `element-contract.md` 3, "The cost estimate" and "The cost gate"; `element-needs.md` (new entry).
- **Old text:** "over it, the run is refused and offers Run exactly and, where the algorithm has one, the sampled method, each with its band, and the scopes that fit."
- **New text:** add: "The sampled method carries a stated error at its sample size, in words the analyst can act on (for a centrality: whether the top of the ranking can be trusted, and how far a single score may be from the exact one). It shows in the route's description and in the sampled result's readings, beside the caveat 'Scores are estimated from {k} sources'. Until the element states one, only the caveat shows: the product never shows a missing statement as a row, and never an app-computed figure."
- **Why:** the choice between an exact number that takes hours and an estimate that takes under a minute cannot be made on evidence without the estimate's error. graphty-element's gate today returns only the sample size and the sentence "Sampled rather than exact: ... over 100 of 124,318 nodes" (`src/session/cost/estimate.ts`), and `@graphty/algorithms` documents `k` only as "how many sources to draw". A row reading "error: not stated yet" would be read by participants as a bug, so the gap lives in this entry and the mock's annotations, not in the pixels. The field would be published API: proposed, the owner's decision. Drawn as a proposed row in screens/option-form-cost.html (states 2 and 3), with a toggle that hides it.

## Betweenness declares its sampled method, so the gate can offer it

- **Document and section:** `element-needs.md` (new entries), citing `element-contract.md` 3, "The cost gate"; `interface-templates.md` 11, the `seed` row.
- **Old text:** (none)
- **New text:** "Betweenness declares `approximable` (method, plain name, default sample size, seeded) and passes the sample size to `@graphty/algorithms` as `k`. `@graphty/algorithms` betweennessCentrality takes a seed for its k-sample, and graphty-element takes the seed as an option and records it on the run, so a sampled result can be reproduced. Today no built-in algorithm declares `approximable`, graphty-element's betweenness calls the library without `k` or `sources`, and neither the library nor the element accepts a seed."
- **Why:** the refusal the framework designs can only show two of its three routes on the shipped element (drawn as screens/option-form-cost.html state 4). `grep approximable graphty-element/src/algorithms` finds nothing; `BetweennessCentralityAlgorithm.measure` calls `betweennessCentrality(graphData)`; `algorithms/src/algorithms/centrality/betweenness.ts` has `k` and `sources` but no seed, so a Seed row with New seed could not be honoured. The proposed default sample size is 50: 14.8 s in the element's model, about half the 30-second budget, so a model error of a few seconds does not flip the verdict (100 sits at 29.6 s). The default is a published default: the owner's call.

## The sample-size field says how large a sample fits the budget

- **Document and section:** `interface-templates.md` 11, the `min` or `max` as an `OptionBound` row; `interface-specification.md` 7.4; `glossary.md` 6, "source nodes", and 14, Collisions.
- **Old text:** "`min` or `max` as an `OptionBound` -- blocked on graph-dependent bounds"
- **New text:** add: "A sample-size option shows, under its field, the largest value the exact budget allows on this scope, rounded as coarsely as the estimate's error ('About 100 fits the budget'), read from the element, which publishes the bound with its error. A value past it keeps the field, marks it as an error with the value's band and the cap ('500 sources take a few minutes; runs stop at 30 seconds'), repeats the bound, and disables Run with that reason. The app never computes the bound." Glossary: the field is labeled 'Sample size', with `k` named in its InfoCircle; 'source nodes' keeps its meaning (the nodes an algorithm reads as an argument), and the pair is added to section 14, because betweenness has both `sources` (which nodes) and `k` (how many).
- **Why:** the only lever on a sampled run's cost is the sample size, and the analyst otherwise finds the budget by trial. On the citation graph each source costs 1,480,221 pairs, so about 100 fit a 30-second budget and 500 take a few minutes. The model is uncalibrated, so an exact "101" claims a precision it lacks. "Source nodes: 100" reads as a node picker, not a count. Drawn in screens/option-form-cost.html, states 2 and 3.

## The over-budget cause names the time, not a distance past the budget

- **Document and section:** `message-catalog.md`, row `cause.E_CAP_EXCEEDED`.
- **Old text:** "{band} over the exact budget"
- **New text:** "Takes {band}; exact runs stop at {cap}" -- "Takes hours; exact runs stop at 30 seconds." The cap is a setting, not an estimate, so it may be a clock time.
- **Why:** with a real band the old template reads as a distance ("hours over the exact budget" says the run overshoots by hours), and it leaves the reader to compare a band with a cap they cannot see. The message key is published, so the wording is the owner's call. To test in the refused-run recovery task against the current wording, not assumed understood. Drawn in screens/option-form-cost.html.

## A refused result is an Error row carrying its band

- **Document and section:** `state-matrix.md` 3, Results panel, Result row, Error (row); `glossary.md` 10, Not run.
- **Old text:** (silent on the row's drawing; mocks drew "Not run" with a warning glyph)
- **New text:** "A result the gate refused shows the error glyph and its band as trailing text ('hours'); the short cause is its tooltip and is read on focus. It never reads 'Not run', which glossary 10 keeps for a result created unrun, whose verb is Run."
- **Why:** the refusal's verbs are the routes, not Run, so the Not run word promises a verb the row does not have. Drawn in screens/option-form-cost.html.

## A directed graph read as undirected says so on the state line

- **Document and section:** `interface-templates.md` 10, the Result editor body; `principles.md`, variants are always named.
- **Old text:** (Direction and Weight as rows of the Result body)
- **New text:** add: "When the algorithm reads a directed graph as undirected, the state line and the refusal's second line say 'Undirected'; a Direction or Weight row that does not apply to the algorithm is absent (`interaction-patterns.md` 3.7), and 'weight not read' goes in the run's caveats."
- **Why:** graphty-element's betweenness calls `algorithmGraph("undirected")` and records `direction: "undirected"`; on a patent citation graph that answers a different question, and a read-only row "direction: ignored" was easy to miss. Drawn in screens/option-form-cost.html.

## Find, inspect, expand, next seed: the size check names what makes a hop large

- **Document and section:** `state-matrix.md` 4.4, Neighborhood commands; `element-needs.md` (new entry).
- **Old text:** "The count names any capacity limit the result would cross, from the element's level ("12,400 nodes: will not be drawn"), and offers one hop fewer or a filter by attribute; a 2-hop neighborhood of a hub is the usual case."
- **New text:** "The count names any capacity limit the result would cross, from the element's level ("12,400 nodes: will not be drawn"; "612,944 edges: the edges will not be drawn"), and counts one hop fewer and each direction on a directed graph, or offers a filter by attribute; choosing one only sets it, nothing commits until a command. When one node contributes most of a hop, the warning names it ("975 is a third of the graph. Two hops pass through merchants: ACC-393859 alone has 907 counterparties"), read from the element."
- **Why:** in the transaction sample, ACC-233575 (risk score 98) has 9 accounts within 1 hop and 975 within 2 hops, a third of the graph, while 2 hops along outgoing transfers is 14 accounts. The choice that saves the analyst is the direction, which the current text omits, and the reason (one merchant with 907 counterparties) is what makes the choice obvious. Naming the contributor is graph work, so it is an element need: "Name the node that contributes most to a neighborhood count". Seen in screens/find-and-expand.html, states 3 and 13.

## Find: a hit or a node outside the filter says so in the same words everywhere, with the verb that brings it back

(Merges two earlier entries for the same passage, one from the find-and-expand flow and one from the Find mock, which disagreed about where the recovery verb lives.)

- **Document and section:** `interface-templates.md` 2a, Regions and rows ("a hit a filter step leaves out carries that step's mark"); `interaction-patterns.md` 3.1, "Selecting what the filter leaves out" ("**Add selection to step** is its type row's first verb"); `interface-specification.md` 4.1 (the one-node inspector); `glossary.md`, the row "filtered out"; `message-catalog.md` (three new rows).
- **Old text:** 2a: "a hit a filter step leaves out carries that step's mark". 3.1: "the inspector shows it with the "filtered out" mark and the step that excludes it, it is not drawn and the not-drawn line says so, and **Add selection to step** is its type row's first verb." Glossary: "| **filtered out** | a Find hit a filter step leaves out, naming the step |".
- **New text:** 2a: "a hit a filter step leaves out carries that step's mark and, as its second line, 'Filtered out by "{step}"', which wraps rather than being cut. On the selected, hovered or focused hit, the row's trailing action (on the name line, so the second line is never cut) is the verb that brings the node back: **Add selection to step** when the step that excludes it is the newest Filter to step, which that command grows; otherwise **Edit step...**, which opens the filter chip's popover at that step's rule editor (`interface-templates.md` 7), where the step can be turned off or its rule changed. The label is a command label, so it is the owner's call." 3.1: "the inspector shows it with a state line, 'Filtered out by "{step}". Not drawn and not in any count.', and the same verb as the hit row, as a secondary text `Button` in the type row before the overflow; its rank and its Connections name their scope ("on: full graph"). The legend's not-drawn line says why nothing is ringed, '{N} selected {kind} not drawn: filtered out by "{step}"', and carries no verb: the verb has two homes, the hit row and the inspector." Glossary: "| **filtered out** | a Find hit or a selected element a filter step leaves out; on screen always 'Filtered out by "{step}"', the step's name quoted. Not 'left out by', not 'not in the filtered graph'. |". Proposed keys: `graphty.find.outsideStep` ('Filtered out by "{step}"'), `graphty.inspector.outsideScope` ('Filtered out by "{step}". Not drawn and not in any count.'), `graphty.drawn.outOfScope` ('{N} selected {kind} not drawn: filtered out by "{step}"'; report line, no action, polite, in the legend card; it clears with the out-of-scope selection).
- **The gap this closes:** the pattern in 3.1 assumes the step that excludes the node can be grown. It can only when that step is the newest Filter to (element-needs, "Ordered filter steps": Add selection to step edits the newest Filter to step in place). In Les Miserables after three steps, Marius is removed by "Filter out group 8", the newest step and a Filter out: adding him to it would exclude him again, and adding him to the earlier "Filter to degree >= 5" leaves him removed by the later step. Marguerite is removed by a rule step, and adding a node to a rule is undefined. For those, the only honest verbs are to turn off or edit the step; an "except this node" operand on a step would be a new element capability and is not proposed here.
- **Why the wording:** step names begin with a verb ("Filter out group 8"), so "Left out by Filter out group 8" read as a double "out"; quoting the name makes it read as a name. One template in three places (hit, inspector, legend) means one fact is worded once; the glossary's own word for it is "filtered out". The keys would be published (reader messages are published as { key, params, text }), so their wording is the owner's call. screens/find-and-expand.html still shows the older "Left out by" wording and should take this one when next revised.
- **Why two homes, not three:** the hit row is where the analyst is looking when the hit is committed; the inspector is where the selection is described afterwards. A third copy on the legend line put the same verb three times on one screen. The type row's kind word ("Node") yields to the verbs when they need the room; the icon still names the kind.
- **Drawn in:** screens/find.html, state 3 (Marius, Edit step...); screens/find-and-expand.html (the newest Filter to, Add selection to step).

## Find, inspect, expand, next seed: a step made from a neighborhood is named after its seed

- **Document and section:** `interaction-pattern-entries.md` 6.9, Behavior, Grow.
- **Old text:** "Each addition is listed on the step, labeled by its command."
- **New text:** "Each addition is listed on the step, labeled by its command, under a first line that states what made the step ("9 by Filter to neighbors, all, 1 hop, from ACC-233575"). A step made from one node's neighborhood is named after that node ("ACC-233575 and neighbors") until renamed, so its undo label, its kept set and its Delete read as the case, not as "Filter to 9 nodes"."
- **Why:** after growth the step holds 34 nodes and a default label "Filter to 9 nodes" is wrong; task flow 6.2's own undo label ("Delete step Alert 4471") assumes a step named for its case. Seen in screens/find-and-expand.html, states 7 and 9.

## Find, inspect, expand, next seed: a step's record lines and undo labels carry their arguments

- **Document and section:** `interaction-pattern-entries.md` 6.9, Undo; `task-flows.md` 6, the undo labels of the "grow the boundary" and "include" rows; `message-catalog.md`, `step.added`.
- **Old text:** undo labels "Filter to neighbors, 2 hops" and "Add 3 nodes to step"; the step's addition lines "labeled by its command"
- **New text:** undo labels "Filter to neighbors, out, 2 hops" (direction, then hops) and "Add selection to step, 3 nodes"; each line on the step reads "{count} by {command}, {direction}, {hops}, from {what}" ("+24 by Filter to neighbors, out, 1 hop, from 10 nodes"; "+1 by Add selection to step, from 1 node"), and the hit row's tooltip reads "Add selection to step" over "1 node, to {step}".
- **Why:** the record is what lets someone else rebuild the claim. "+24 by Filter to neighbors, from 10 nodes" does not say whether the hop followed the money out or took in the merchants' customers too (34 accounts against 977 in the transfer sample), and the undo label left the direction out. The same command also appeared under three wordings ("Add 1 node to step", "Add selection to step", "+1 node to ..."); the register has one label per command. The step.added parameters are published message params, so their shape is the owner's call. Seen in screens/find-and-expand.html, states 5 to 7.

## Select neighbors: one menu, replacing the two earlier forms

- **Document and section:** `interface-specification.md` 4.2, One node ("Select neighbors (split: hops, direction, edge type, Filter to neighbors)"); `interaction-pattern-entries.md` 4.6, Feedback; `state-matrix.md` 4.4.
- **Old text:** "The exact count is on the command before it acts: the split button's hop field and the menu item show it on hover and on focus"
- **New text:** "The split button's caret opens a dark `Menu`, titled 'Select neighbors of {selection}'. Rows, in order: 1 hop, 2 hops, 3 hops, then More hops... (a typed number); then Follow (glossary 6: "direction" is the graph's declared property), in the order In, Out, All, worded from the edge's role on a directed graph ('In: paid by', 'Out: paid to', 'All'; 'In: cited by', 'Out: cites', 'All'); then edge type, only on a graph with more than one; then the two commands, Select neighbors and Filter to neighbors. Hop and direction rows are checkable, keep the menu open, and each shows the size its choice would give. Each command shows its own result ('975 nodes'; inside a filter step 'Filter to neighbors: 34 nodes, +24', and Select neighbors counts inside the filter, 'none inside the filter' when nothing is left to add). Nothing is emphasized: no command is primary, and a warning (a limit crossed, a hub) is a line above the commands, never a default. A count still being computed reads 'not yet measured' with a progress line; the commands stay usable and name their hops; Esc closes the menu and stops the count. A direction with no neighbors reads 'none', with the reason in words, and both commands are off. A plain press of the main part grows one hop with the direction last used, as each press grows one more hop; its tooltip carries that count."
- **Why:** two prototype screens drew the menu two ways: screens/inspector.html, state 2, with hop rows that commit and "+32 nodes" (entry "Select neighbors: the split button's menu lists hops with their counts"), and screens/alert-triage.html, states 3 and 5, with checkable rows and the result size (entry "Alert triage: hop counts sit in the Select neighbors menu rows"). This entry replaces both. Checkable rows let the analyst compare hops and directions before any commit; committing rows would select on the first click, which is the large result when the analyst was only looking. An earlier popover of this flow had a Hops field beside a per-hop list (two controls for one value), a close button like a dialog, and a filled primary Select 975 under a warning that 975 was a third of the graph; a trust check that then invites the risky commit is a warning in name only. Figma's split-button options are a light menu committed by one click, with no primary. The direction order is 4.6's. Drawn in screens/find-and-expand.html, states 3, 4, 6, 12 and 13; screens/inspector.html state 2 still shows the committing form and needs the Select neighbors command row added.

## Find, inspect, expand, next seed: Connections name their scope only when it differs from the chip

- **Document and section:** `interface-specification.md` 3, the Connections row (extends "Alert triage: Connections inside a filter step, with the full-graph count beside it").
- **Old text:** "two `ActionRow` counts, N neighbors and N edges, each split In, Out and All on a directed graph"
- **New text:** add: "Drawn as a small grid, neighbors and edges by In, Out and All. The counts read the chip's scope, as the rank does, and add no words; for a selected node the filter leaves out they read the full graph and the section header says 'on: full graph' (`content-design.md` 5's state-line rule)."
- **Why:** a node outside the filter has no connections in the filtered graph, so its counts must come from the full graph, and the analyst must be told, as the rank beside its value already is ("#2 to #3 of 3,000, on: full graph"). Before this, a filtered inspector read '#1 of 34' beside 'Out 5, In 3', with nothing saying whether the 5 and 3 counted the 34 or the 3,000. Seen in screens/find-and-expand.html, states 2, 4, 5, 7 and 8.

## Find, inspect, expand, next seed: after a filter change the view fits once

- **Document and section:** `interaction-pattern-entries.md` 6.9, Behavior, Narrow.
- **Old text:** (silent on the view)
- **New text:** "After a filter step is added, grown or deleted, the view fits what is drawn once, as an instant cut; node positions never move. A view the analyst has moved since is left alone until the next filter change."
- **Why:** filtering 3,000 accounts to 9 leaves 9 dots scattered over the old extent, each a few pixels across. Positions stay put so the arrangement is kept; only the camera moves, which is Zoom to selection's instant cut (4.1). Seen in screens/find-and-expand.html, states 4 to 7.

## Find, inspect, expand, next seed: the next seed starts with Filter to neighbors, and the step count on one basis

- **Document and section:** `task-flows.md` 6.2, the diagram, the "replace" row and the Desk count.
- **Old text:** diagram edge "Delete; Filter to", chip "Filtered: 1 of 5,310 nodes"; undo label "Filter to ACC-9921"; "**Desk count:** 4 steps, 1 travel (Delete; Find; the name; Filter to), plus 2 steps to keep the previous one"
- **New text:** diagram edges "Delete", then "Find", "Select", then the Select neighbors menu's size check (a hexagon), then "Filter to neighbors" to "A new step on the new seed"; chip "Filtered: 4 of 3,000 nodes" in the prototype's numbers; undo label "Filter to neighbors, all, 1 hop". "**Desk count:** 4 steps, 4 travel (Delete; the name; the hit; Filter to neighbors; travel: the step's menu, Find, the caret, the chip), plus 2 steps and 2 travel to keep the previous one (Create set; Add note): 6 steps with the note, 5 without. The budget of 3 counts the keep-and-clear steps (Create set; Add note; Delete), which the route meets; picking the new seed (the name; the hit) is outside it, because no design can avoid it."
- **Why:** Filter to on the seed alone makes a scope of one node ("#1 of 1" beside its risk score), which the next move always grows; Filter to neighbors from the full graph makes the new step at its first useful size in one command, with the size shown first. The old count listed opening Find as a step and left out picking the hit; the two cancel, so the total (6 with the note) is unchanged, but the list now follows section 1's rules. The budget's wording ("to keep the previous boundary and start the next") does not say whether picking the seed counts; read as the whole route no design meets 3, since the seed alone takes 2. That reading is the owner's to confirm. Drawn in flows/find-and-expand.html, "The next seed"; screens/find-and-expand.html, states 9 and 10.

## Find, inspect, expand, next seed: Next finding stops at the end

- **Document and section:** `interaction-pattern-entries.md` 4.8, Exceptions.
- **Old text:** "over the drawing limit, a finding outside what is drawn is still selected and counted (4.1)."
- **New text:** add: "At the last finding, Next finding keeps it selected and announces "Last of 34"; it does not wrap, so the count of findings reviewed stays true. Previous finding at the first does the same."
- **Why:** the triage claim is "I looked at the top 40"; a list that wraps silently lets the analyst review the first findings twice and believe they reached the end.

## Find, inspect, expand, next seed, AWAITING STUDY: a "Create set, then delete" entry on the filter step's menu

- **Document and section:** `task-flows.md` 6.2, "over it, one undoable macro is the fallback"; `output-homes.md` 3 (the command register).
- **Old text:** "over it, one undoable macro is the fallback, not a new persona verb."
- **New text:** (only if the prototype sessions measure a stall) "The fallback is one entry on the filter step's menu, **Create set, then delete**: it creates a fixed set from the step, named after it, asks for the note in its own field, and deletes the step, as one undo entry ("Create set, then delete ACC-233575 and neighbors")."
- **Why:** held, not proposed. Measured on paper, today's route meets the budget as the flow reads it (keep and clear in 3 steps with the note), so the macro would save steps only if analysts stall or delete before keeping, which a session must show first. Its label uses only the two command names it runs, so it adds no second noun for a step (`glossary.md`, working set) and no persona verb. A command label is published in the register, so if it is ever needed its wording is the owner's call. The study task that measures it is in flows/find-and-expand.html, "For the study sessions", task 5. This replaces the earlier proposal "New boundary from this node", which is dropped.

## Find, inspect, expand, next seed: a rank over one node falls back to the full graph (withdrawn)

Withdrawn. The case that motivated it, a new seed filtered to itself, no longer occurs: the next seed now starts with Filter to neighbors, so its step is never a scope of one node (see "the next seed starts with Filter to neighbors" above). No other flow reaches a one-node scope.

## Undo notice: a filter step's notice carries the count left

- **Document and section:** `message-catalog.md`, the `undo.done`, `redo.done` row; `content-design.md` 3 (undo labels).
- **Old text:** `undo.done`, `redo.done`: "Undone: {name}; Redone: {name}"
- **New text:** "Undone: {name}; Redone: {name}. When the step changed the filtered graph, the notice adds, after the name and in secondary ink, the scope the filter chip now states: '{kept} of {total}' (for example 'Undone: Filter out group = 8   41 of 77'). The announcement reads the same words."
- **Why:** the notice shows only when the filter chip is out of sight (the left panel closed; see "a visible control that shows the change settles when Undo shows a notice", above), so the count it would have shown must travel in the notice. The count is the one fact that tells whether the press went one step too far: 41 means group 8 is back, 76 means the degree step went with it. Without it the second notice ("Undone: Filter to degree >= 5") is easy to read as confirmation of the first. Drawn in flows/undo-and-ways-back.html (edge state "Left panel closed"); screens/undo.html draws it only with the left panel closed (states 2 and 3 with "Left panel open" off); with the panel open under the rule as written the notice carries the name only, because the chip beside it already shows the count. The mock for that flow is screens/filter-steps-and-undo.html. Two-way door (a notice's wording); decided here, pending the study.

## Previous selection: the Edit menu says what it brings back (withdrawn)

- **Document and section:** `interaction-pattern-entries.md` 4.4 (Trigger); `output-homes.md` 3, the Previous selection row.
- **Old text:** "Trigger: Edit > Previous selection, Quick actions and its chord." (the item is a bare label)
- **New text:** add: "In Edit, Previous selection sits in the selection group, below a separator from Undo and Redo, and carries a one-line caption under it: 'Brings back {N} selected nodes. Not an undo step.', or 'Nothing to bring back.' with the item disabled when the slot is empty."
- **Why:** the loss this entry exists to prevent is an analyst reaching for Undo to get a selection back. Both items sit in the same menu, one under the other; a bare "Previous selection" does not say it is the one that brings a selection back, and "Undo Filter out group = 8" does not say it will not. The caption costs one line in a menu opened rarely. Drawn in screens/undo.html (Edit menu open). If the moderated Previous selection task in `research/study-schedule.md` shows analysts find it without the caption, drop it. Two-way door.
- **Withdrawn:** no menu row in Figma or in compact-mantine's Menu carries a description line; the one recorded departure in a menu row is the band word for long commands (`figma-crosswalk.md` 4.3). A bespoke caption would break "use the default components", and its words ("Not an undo step") speak the system model to the reader and tell a study participant the answer. The item stays a bare label with its key; the moment-of-loss words stay in the selection-cleared announcement and the table's scope line, which already name Previous selection. If the moderated Previous selection task fails, propose a menu-item description variant in compact-mantine first, then the words. screens/undo.html no longer draws the caption.

## Failure and recovery: a weighted result names its reading on its row

- **Document and section:** `principles.md` 1, the bullet "Provenance is not a caveat"; `interface-templates.md` 3, the Results panel's result rows.
- **Old text:** "Provenance is not a caveat. The engine, the seed, the sampler and the weight attribute are under Details."
- **New text:** "Provenance is not a caveat. The engine, the seed and the sampler are under Details. **A run that read a weight names it on its row, under the result's name, in the words of its role: '{attribute} as distance', or '{attribute} as similarity, 1 / {attribute}' when it was converted.** It is not a mark (it shows in the reference state too) and takes no verb; the result editor's Weight row carries the same words and the role's gloss ('smaller = closer')."
- **Why:** a similarity read as a distance is the one wrong reading that produces no error and a believable answer. On Les Miserables, co-appearance counts read as lengths put Fantine second and Marius sixth in betweenness (0.327, 0.103); read as a similarity, Marius is second and Fantine fifth (0.439, 0.191). The load step's question prevents it only if the analyst answers it right, and Details is where nobody looks after a plausible result. The row is the one place the analyst certainly looks. Drawn in storyboards/failure-and-recovery.html, frames A2 and A6; screens/weight-role-trap.html. The study should check whether analysts read the line (frame A2) or only the editor (A3); if neither, the load question needs work instead.
- **Status:** pending the study, and not to be promoted out of Details until sessions show analysts catch the wrong reading from the row. It adds a permanent line to every weighted result's row, where it competes with the state line; the load question (or the Statistics role question) stays the main guard, and the bound Weight value in the editor ("Failure and recovery: a result's Weight is a value bound to the column", below) is the second.

## Failure and recovery: the Weight row counts edges read as length 0

- **Document and section:** `graph-conventions.md` 2, the "Similarity as distance" and "Negative weights" rows.
- **Old text:** "A zero similarity becomes an infinite distance (no edge), and the record counts those edges."
- **New text:** add: "**A zero distance is a free hop.** When a distance attribute has edges of value 0, the result editor's Weight row counts them ('4 edges of value 0 are read as length 0'), and the record does too. It is not refused: a zero-cost transfer or a co-located pair is real data."
- **Why:** the Les Miserables corpus has 4 edges of value 0, one of them Valjean to Fantine. Read as distances, they are free shortcuts, and that is why Fantine ranks second in the wrong betweenness. The conventions state what a zero similarity becomes but say nothing about a zero distance, which is where a mistaken role does its damage. Drawn in screens/weight-role-trap.html, state A3.

## Failure and recovery: each filter step shows what is left after it, and whom it left out

- **Document and section:** `interaction-pattern-entries.md` 6.9, Feedback; `interface-specification.md` 7.3, the filter chip; `implementation-mapping.md` 6 ("per-step membership").
- **Old text:** "Feedback: the filter chip's count ("Filtered: 2,140 of 5,310 nodes") and the table's scope line"
- **New text:** add: "The chip's popover lists the steps in order, each with the count left after it, and '--' for a step turned off. Pointing at or focusing a step names what it removed: 'Leaves out 15: Myriel, Mlle.Baptistine, Mme.Magloire, Napoleon, OldMan and 10 more' (the first five by degree, then the count)."
- **Why:** a step's effect depends on the steps before it. Largest component on the full Les Miserables drops 1 character (OldMan); after Filter out Valjean it drops 15, the bishop's whole household. The chip gives away that something is wrong (60 of 77, where the analyst expected 75); only per-step counts say which step did it. Drawn in storyboards/failure-and-recovery.html, frames C1 and C2; screens/filter-step-recovery.html. The counts are the element's (`element-needs.md`, "Ordered filter steps"); the app only draws them.
- **Merged:** into "Filter chip and its steps: the step row carries one count, and names what it took out on hover", which keeps this entry's one count, "--" and hover names.

## Failure and recovery: Undo history shows what each filter step changed (withdrawn)

- **Status:** withdrawn in favor of "Undo and the other ways back: Undo history: one entry, no added chrome", above: the submenu is interim and should not grow; the steps popover's per-step counts carry the same fact. screens/filter-step-recovery.html, state C3, no longer draws the change figures, and its annotation marks Undo history as temporary.

- **Document and section:** `interaction-patterns.md` 3.4, the Undo history bullet (see also "Undo and the other ways back: say what choosing an Undo history entry reverses", above).
- **Old text:** "the labels of the steps undo would reverse, newest first, where choosing one undoes back to it."
- **New text:** add: "A filter-step entry carries, after its label, the node change it made ('-15 nodes'), read from the step's own count."
- **Why:** with three steps, the entry that went wrong is the one with the surprising number. "Filter to largest component, -15 nodes" beside two "-1 node" entries answers "which one?" at the moment the analyst is deciding whether to undo. It also shows that undoing back to it would lose the good step above it. Drawn in screens/filter-step-recovery.html, state C3.

## Failure and recovery: a failed run's row says whose values it still shows

- **Document and section:** `state-matrix.md` 3.3, "run Failed: Error (row), the previous value kept and marked"; `glossary.md` 10, marks.
- **Old text:** "the previous value kept and marked" (no mark word is named)
- **New text:** "the previous value kept, and the result's editor says whose values are on screen, with the option that differs: 'Showing the run before: damping 0.85'. The same line shows while a re-run is in progress. The row keeps its one state line (Running, Failed); the words are in the editor and in the table column header's state, not on a third row line."
- **Why:** after a WebGPU loss mid-run, the table still holds numbers, and nothing says they are from the damping-0.85 run rather than the 0.5 run the analyst asked for. "Earlier run" is taken (a reference to a non-current run), so this needs its own words. Drawn in screens/gpu-lost-run.html, states D1 and D2.

## Failure and recovery: a result's Weight is a value bound to the column, with Detach for one run

- **Document and section:** `interface-templates.md` 10, the Result editor body ("Direction and Weight after the scope"); `graph-conventions.md` 2, "Where it lives" ("on the graph, set on import, overridable per run"); `figma-crosswalk.md` 4.1, "A bound row has hover Detach" and "A variable row click opens its editor".
- **Old text:** (Weight is a row of the Result body; the documents say the role is on the graph and overridable per run, but not which of the two places the editor's row edits)
- **New text:** "The Result editor's Weight row shows the reading as a value bound to the graph's column: a variable pill ('value as distance') under the legend 'Weight -- from Edges', with the role's gloss beneath it. Clicking the pill opens the Edges editor, where the role is changed for every result that reads it. Detach, on hover and focus, is the deliberate per-run override: it replaces the pill with the attribute and role fields for this run only, and the row then reads 'Detached from Edges'. The graph's role governs every result that is not detached."
- **Why:** with two editable dropdowns in the result editor, the analyst who finds the wrong reading fixes it there, which repairs one run and leaves every other weighted result wrong; graph-conventions allows both places without saying which one the editor edits. Figma's bound variable answers exactly this: the value names its source, a click goes to the source, and Detach is a separate, visible act. Drawn in screens/weight-role-trap.html, state A3; storyboards/failure-and-recovery.html, frame A3. The study checks whether analysts change the role on the column (pass) or detach (the miss path). Two-way door.

## Failure and recovery: in Statistics the weight's meaning has its own row, Weight

- **Document and section:** `interface-specification.md` 4.1, "the Edges row (direction and the weight role, opening the Edges editor)"; `information-architecture.md` 4, "the weight's meaning: the Edges row there".
- **Old text:** "the Edges row (direction and the weight role, opening the Edges editor)"
- **New text:** "a Direction row and a Weight row ('value as distance', or 'weight: unknown' with its role control), each opening the Edges editor; the Edges row is the edge count alone"
- **Why:** Statistics already has an Edges row for the count, so a second row labeled Edges for direction and role puts two rows of the same name one above the other, and the mocks drew exactly that. Splitting it gives each fact its own label and keeps the count row a plain number. Drawn in every Les Miserables state of screens/weight-role-trap.html, closeness-variant.html and filter-step-recovery.html. Two-way door.

## Failure and recovery: a result row takes the selected fill only while its editor is open

- **Document and section:** `interface-templates.md` 3, the Results panel's rows; `interaction-pattern-entries.md` 6.2.
- **Old text:** (silent on a result row's selected state; mocks drew the fill on the last-run result with no editor open)
- **New text:** "A result row shows the selected fill only while its editor popover is open (Figma's 'the inspector is showing this'); otherwise it is a plain row, with hover and focus states only. A result is a definition, and definitions do not take the canvas selection, so the fill never means 'selected on the canvas'."
- **Why:** in Figma the selected-layer fill always means that the properties on screen belong to that row. A fill on a result row while the inspector shows the graph teaches the opposite. Drawn in screens/weight-role-trap.html (state A2 plain, A3 filled) and gpu-lost-run.html. Two-way door.

## Failure and recovery: while a result's editor is open, its one verb is in the editor's header

- **Document and section:** `state-matrix.md` 3, Results panel, Result row (Running, Error (row)); `interface-templates.md` 10, the Result editor header.
- **Old text:** "the result editor carries Run, and Cancel while running"; the Result row, Running: "progress, Cancel and the engine"; Failed: "Re-run, on the named path"
- **New text:** add: "While a result's editor is open, the state's one verb (Run, Cancel, Re-run on CPU, Run sampled) is the Button in the editor header's trailing slot, and the row shows the state only, so the verb is never drawn twice. With the editor closed, the verb is on the row. A verb's band is its tooltip ('Takes a few minutes on the CPU')."
- **Why:** the GPU-lost mock showed two identical Re-run on CPU buttons at once, one on the row and one in the editor, and the band on a third row line cut off from its button. Figma's popovers put the one commit in the header. Drawn in screens/gpu-lost-run.html, states D1, D2, D3 and D6. Two-way door.

## Alert triage: whether a large graph opens as density is an open question, not a default

- **Document and section:** `scale-levels.md` 2, the Node drawing row, Reduced column; `state-matrix.md` 3, Canvas, Partial; `message-catalog.md`, row `drawn.not`; `element-needs.md` (new entry).
- **Old text:** "| Node drawing | `renderCeiling` | all drawn | -- (a node is never silently undrawn) | nothing drawn until a filter step narrows it (`state-matrix.md` rule 4.2) |"
- **Proposed change:** none to the default yet. Two openings are drawn for the study: every node a point with the marking layers on top (screens/alert-triage.html, state 1b), and unmarked nodes as neutral binned density with every marked node (selected, hovered, focused, a member of the selected set, or painted by a layer whose selector is not the whole graph) drawn over it as a point, the not-drawn line counting what is density ("2,950 nodes drawn as density. Narrow the graph..."; points plus density always equal the node count). Only if the study favors density would the Reduced column read as above, and then only past a node legibility level that graphty-element publishes, like the label budget, never a number in the app. Element need, recorded now so the question can be answered: "A node legibility level the element publishes", with the count of nodes it would draw as density.
- **Why it is open:** a graph of 3,000 nodes and 9,000 edges is drawn as points by Gephi and Cytoscape every day, and density hides the structure an analyst opened the file to see; the case for density rests on one persona line ("Great, a hairball", study/personas/fraud-analyst.md, voice 8). To test with the Gephi holdout, the fraud investigator and the level-1 reviewer: which opening finds the queue faster, and which one's count is trusted. Drawn in screens/alert-triage.html, states 1 and 1b; storyboards/alert-triage.html, frames 1 and 2.

## Alert triage: the file chip's popover also says what left the machine

- **Document and section:** `interface-templates.md` 2, Graph panel, header (extends "Main frame at rest: the file chip opens a popover..." above); `message-catalog.md`, new rows.
- **Old text:** (that proposal) "'Opened from' ..., 'Read' ..., 'Read as' ..., then a divider and 'Project kept' ..."
- **New text:** add, after Project kept: "'Uploaded': 'nothing, this session' (the app has no server; the row exists so the answer is stated, not inferred); 'Written out': the count and times of this session's exports, expanding to their file names; 'Assistant': 'off', or the provider's name with one line saying what it sends ('each question and the rows it reads'). Titled 'Where the data is' (no 'your': content-design.md 2 keeps 'you' to Details and (i)). The file chip sits on the project's title line, so the filter chip has the second line to itself."
- **Why:** the question comes back mid-session, after exports, not only before the load: "Does this upload anything? Because if customer data leaves the building I'm the one explaining it" (study/personas/fraud-analyst.md, voice 12). After six files have been written, the reviewer wants the list of what went where. The Assistant is the one route by which data does leave, so it is named even when off. Drawn in screens/alert-triage.html, state 12.

## Alert triage: the Select neighbors menu states each hop's size, in the same shape in every state

- **Document and section:** `interface-specification.md` 4.2, the One node row (Select neighbors split: hops, direction, edge type, Filter to neighbors); `interaction-pattern-entries.md` 4.6, Feedback; `element-needs.md` (the contributor entry proposed under "Find, inspect, expand, next seed" above). Supersedes the hover wording of "Select neighbors: the split button's menu lists hops with their counts" below for this menu.
- **Old text:** "Select neighbors (split: hops, direction, edge type, Filter to neighbors)"; 4.6: "the split button's hop field and the menu item show it on hover and on focus"
- **New text:** "Select neighbors (split, a neighborhood glyph). Its menu, anchored under the split's chevron and right-aligned to the inspector, always has the same groups: a label naming the node ('Hops from ACC-365386'); one checkable row per hop count from the selected node, 1 to 3, each reading '{k} hops' followed by its size as secondary text ('2 hops -- 283 nodes, 470 edges'), every row with the same fields; a second line on a row when most of that hop comes through one or two nodes, naming them ('Mostly through ACC-597001 (Pharmacy, 152 neighbors) and ACC-512219 (Streaming, 109)'), or when the row would cross a capacity limit ('Will not be drawn: past the drawing limit'); a Follow submenu row showing what it follows; then Select neighbors and Filter to neighbors, each naming the checked count. Counts are always total hops from the selected node, never 'more hops'; inside a filter step the menu is the same and a row that the step already holds says so. The right column holds only shortcuts. The second lines are part of the row, so arrow keys and screen readers reach them; nothing is on hover only."
- **Why:** the trust check "count and hops shown before committing" (task-flows 6) had no place; the menu is where the choice is made. An earlier draft put the explanation in a tooltip, which the framework's own divergence from Figma rules out ("Tooltips are hidden from assistive technology": a tooltip only repeats a fact found elsewhere), and changed the menu's shape between states ("1 more hop" beside "2 hops"). Naming the contributors is graph work: the element reports them with the count (element need "Name the node that contributes most to a neighborhood count"); the app never computes them, and the line never picks an attribute such as a flag to mention, because nothing generic says which attribute matters. Drawn in screens/alert-triage.html, states 6, 14 and 24.

## Alert triage: a found path says what ignoring direction would have found

- **Document and section:** `task-flows.md` 10.2, the trust check after the run ("Where it leaves the filtered graph is marked; ties named"); `interface-specification.md` 4.1, Path, offered.
- **Old text:** "Where it leaves the filtered graph is marked; ties named: 1 of N equally short, how it was chosen"
- **New text:** add: "On a directed graph searched along edge direction, when the undirected shortest route is shorter, the found path's inspector says so in one `ProseBlock`: 'Ignoring direction, the shortest route is 2 hops, through ACC-465572. It is not a flow from one to the other.' The comparison is the element's (a second search reported with the first), never computed by the app."
- **Why:** in money-flow work, two accounts that both pay one service look connected; a reader who toggles direction to get a shorter path draws a flow that does not exist. In the fixture, ACC-365386 reaches ACC-580664 in 5 transfers along direction, and in 2 hops ignoring it, through the money transfer service both use. Element need: "A shortest-path result that reports the undirected length when direction was followed". Drawn in screens/alert-triage.html, state 18.

## Alert triage: a filter step's row says what was kept from it and when it was exported

- **Document and section:** `interface-templates.md` 7, Filter chip and its steps, Regions and rows; `user-journeys.md` 3, The next alert's trust question.
- **Old text:** "the ordered steps (`Tree` rows with a checkbox in `actions`; ...)"
- **New text:** add: "Under the step list, a `ProseBlock` for the selected step: what was made from it (sets, notes, found paths) and its last export ('Kept from this step: set Referred AL-40122, 1 note. Evidence exported 10:31.'), or 'Nothing kept or exported from this step' in the caution ink. Delete step takes no confirmation; the line is the check."
- **Why:** the journey's trust question ("Was the previous boundary kept, or its evidence exported, before it is replaced?") has no place to be answered, so the reviewer either remembers or loses work. Complements "one command to keep the boundary and start the next" above: the command saves steps, this line shows that nothing is lost. Drawn in screens/alert-triage.html, state 10.

## Alert triage: a Find hit names the kept sets that hold it

- **Document and section:** `information-architecture.md` 7, the Find column, and `interface-templates.md` 2a, Regions and rows.
- **Old text:** "the hits as `ResultRow`s under one group header per kind ...; a hit a filter step leaves out carries that step's mark"
- **New text:** add: "A node or edge hit held by a kept set shows the set's name in its secondary text ('personal, US; in Alerts'), the most recent set first, '+N' for more. The secondary text wraps to a second line rather than truncating, and a set name that must be shortened is shortened in the middle, keeping its end ('Ring around ...365386'), per `content-design.md`'s order for identifiers."
- **Why:** the reviewer wants to know, before building a boundary, whether an account is already part of something kept. Truncating the end removes the part of an account-named set that tells two apart. Reads `sets.containing(element)`, which master has. Drawn in screens/alert-triage.html, states 2 and 5.

## Alert triage: Connections inside a filter step, with the full-graph count beside it

- **Document and section:** `interface-specification.md` 3, the Connections row.
- **Old text:** "two `ActionRow` counts, N neighbors and N edges, each split In, Out and All on a directed graph"
- **New text:** add: "When the two counts are equal (no parallel edges), one row. While a filter step is on, the counts are within the filtered graph and one `DataRow` under them gives the full-graph count ('full graph: 8 neighbors: in 3, out 5')."
- **Why:** inside a rule step on transfers of 9,000 to 9,999 USD, ACC-365386 has 5 neighbors; in the full graph it has 8, and a lookalike account has 1 inside and 3 outside. Either number alone misleads. Two identical rows ("8 neighbors In 3 Out 5", "8 edges In 3 Out 5") said one thing twice. Drawn in screens/alert-triage.html, states 16 and 21.

## Alert triage: the Export dialog's footer says where files go

- **Document and section:** `interface-templates.md` 20, the Export... row (extends "Export: what the dialog opens with" above).
- **Old text:** (none: the footer holds only the buttons)
- **New text:** "The footer's left side, beside the commit: '{N} files go to your Downloads folder. Nothing is uploaded.' (the browser's download location; the app cannot name a folder it does not know, so it names the browser's)."
- **Why:** an export is the one moment files leave the app; answering where they go at the button stops the "did that just upload?" question before it is asked. Drawn in screens/alert-triage.html, states 4 and 19.

## Alert triage: with a set selected, the evidence file is scoped to the set and says whom it names

- **Document and section:** `interface-templates.md` 20, the Export dialog's findings report row; `files-and-recipes.md` 3, the evidence file; `glossary.md`, findings report.
- **Old text:** (the report's scope follows the current filter step)
- **New text:** "The report's scope is a select: the selected set when one is selected, else the current filter step; the wider scopes (the step, both steps off) are offered with their counts. Under it, a 'names' row counts the accounts the file will contain and how many are people ('46 accounts: the 12 members and 34 counterparties (18 people, 16 merchants)'), and updates before the click when the scope changes. When no view is saved, the report places the current view as its figure, so a report always stands alone as a case file."
- **Why:** a report scoped to a two-hop step put hundreds of unrelated customers into a SAR case file by default (in the fixture, 283 accounts, 253 of them people, when the ring is 12); SAR content is confidential by law and the fraud persona's manager wants no customer data leaked. And a report whose figure is a separate loose file, because no view was saved, is not a case file. The head count is a count over the element's scope, read from it. Drawn in screens/alert-triage.html, state 19. The report's file format is decided: one self-contained HTML file (see "The findings report's file format").

## Alert triage: a marking layer gives its nodes a shape as well as a color

- **Document and section:** `canvas-drawing.md` (marks and fills); `options-and-encodings.md` (the recipe's default layers); the team triage recipe's Alerts layer.
- **Old text:** (the flagged layer set color only: vermillion #D55E00)
- **New text:** "A recipe layer that marks a subset (alerts, flags, watchlists) sets two channels, a fill and a shape (a diamond), so the distinction survives grayscale printing and color-blindness; the legend's chit draws the same shape. The Export dialog's figure row shows a grayscale print check of the figure."
- **Why:** the fraud persona's case files are printed or pasted in grayscale ("Colour alone is never enough for her"); vermillion over mid-gray density, and vermillion beside gray points, collapse to similar grays. Shape is a style-layer property, so this is a recipe choice, not new element work. Drawn throughout screens/alert-triage.html; the print check in state 19.

## Alert triage: two personas, two clocks

- **Document and section:** `user-journeys.md` 3, the opening paragraph and the main line's Stage "The next alert".
- **Old text:** "the fraud analyst handles "50+ alerts daily" (`personas/fraud-analyst.yaml`) with a target of "Under 30 minutes per alert""
- **New text:** "the level-1 alert reviewer (study/personas/alert-reviewer.md) handles dozens of alerts a day, each cleared or escalated in minutes; the complex-case investigator (the fraud persona) works what level 1 escalates, over days. The main line, the triage, is the level-1 reviewer's, and only it is timed per alert. The extension, the case that runs over days, is the investigator's."
- **Why:** the study's fraud persona was built from practitioner sources and says she is not a per-alert reviewer, and warns against judging graph features on a per-alert clock. The storyboard now gives the main line to a level-1 reviewer persona, built from practitioner and vendor sources (five to ten minutes per level-1 pass, 90-95 percent false positives), and gives Sarah the extension. The next-seed budget (task-flows 6.2: at most 3 steps to keep the previous boundary and start the next) belongs to the level-1 reviewer; the storyboard counts 6 by that flow's rules (Create set, Add note, Delete step, Find, the hit, Filter to), so it is over budget and the single-command proposal is what her sessions test.

## Alert triage: an alert's evidence is "Export the selection's edges"

- **Document and section:** `interface-templates.md` 20, the Export dialog's scope select; `interface-specification.md` 3, the Export section's "+"; `files-and-recipes.md` 3, the evidence file.
- **Old text:** (the scope select offers the current filter step, or the selected set; an evidence file for one account is the step's nodes and edges as two CSVs)
- **New text:** "With one node selected, the Export section's '+' opens a menu: 'Export the selection's edges...' (secondary line: '{N} transfers: time and amount', the edge noun from the load) and 'Export the selection...' ('1 node and its attributes'). Both open the one Export dialog with that scope; its scope select reads 'The selection's edges: {id}, {N} {edges}' and offers the node alone, the current step and any kept set holding the node, each with its counts. The dialog previews the rows before anything is written (source, target, time, amount). It writes two files: the findings report (.html), carrying the notes on the selection and on any kept set that holds it, the node's attributes each with the file it came from, the current view as its figure and the method; and the edges as one CSV (source, target, time, amount). The 'names' row counts the accounts the file mentions: the node and its counterparties, and how many are people."
- **Why:** in the flagged-account task the investigator's evidence is the account's own money: "I need the transfers: from, to, amount, timestamp", and a list of accounts is not evidence ("I can't write riskScore 92 in a SAR"). Exporting the step wrote every edge among the counterparties too (13, of which 8 are the account's) and two CSVs of nodes and edges the reader had to join. The selection's edges are exactly the account's statement for the window, which is what goes into a referral. The export is a read of the element's edges for the selection (`data.edges` over a node's incident edges); no new element capability. The round-3 result on this task (0 of 3) came from a page set with no transfers screens and is void until rerun on these screens. Drawn in screens/alert-triage.html, states 4, 8b and 9b.

## Alert triage: each group of attributes names the file it came from

- **Document and section:** `interface-specification.md` 3, the Attributes row of the sections table; `content-design.md` (attribute names).
- **Old text:** "Attributes | `DataRow`, computed values first, a bound attribute's row with a chit of what it paints (`canvas-drawing.md` 7), a metric's row with its rank as a second line; a filter field in the header once expanded past its cap"
- **New text:** "Attributes | `DataRow`, computed values first, then loaded values grouped by the file they came from, each group ending in one caption line: 'From {file}.' A value delivered by another system and not computed by graphty says so on that line ('riskScore is the bank's customer risk rating as delivered; not computed by graphty.'). An attribute a join added ('alertId', 'alertScenario', 'alertTime' from the alerts file) is an ordinary attribute in its own group; there is no section for one domain's columns. A node with no row in a joined file says so ('From tm-alerts-2026-08.csv: no alert row for this account.'). The rest as before: a bound attribute's chit, a metric's rank line, a filter field once expanded past its cap."
- **Why:** the round-3 fraud investigator could not use a score whose origin she could not name ("A risk score -- from where? Which model?"), and the alert's rule and time were not on screen. An Alert section would serve one persona; provenance serves every attribute of every dataset. The source of each attribute is part of the element's load record (the file an attribute column was read from), read by the app, not decided by it: element need 'Name the source file of each attribute column' where the load does not already keep it. Drawn in screens/alert-triage.html on every node inspector.

## Alert triage: the Edges tab follows the selection

- **Document and section:** `interface-templates.md` 16, the table dock's scope line.
- **Old text:** (the Edges tab lists the current filter step's edges; a selection only highlights rows)
- **New text:** "With a node selected, the Edges tab lists the selection's edges, and its scope line says so: 'Edges of the selection, {id}: {N} of {M} edges in the filtered graph.' Clearing the selection returns it to the step's edges. Time, where the data has one, is the column after the endpoints (as in the sets-and-paths decision), and the reader sorts by it."
- **Why:** the investigator's first question about a flagged account is its own money in against out, in time order; the step's edge list mixes in the counterparties' transfers to each other. Drawn in screens/alert-triage.html, states 8b and 9b.

## Binding step: when everything matched, Apply commits from the recipe preview (withdraws "it opens even when everything matched")

- **Document and section:** `task-flows.md` 8 (no change: the decision's "no" branch already goes to Applied); `interaction-pattern-entries.md` 6.10, Behavior.
- **Old text:** (6.10) "Choosing one shows what it carries before it is applied: style layers, runs with their cost bands, overview readings, set slots and the attributes it needs."
- **New text:** add: "When every need is found by name, with no second candidate and no level or sign disagreement, the preview lists each need as a read-only line (need, the column found, what it does on the reader's data, what uses it) under 'Matched by name (N)', names the file it reads with Add a table... beside it, and its Apply commits. The binding step does not open."
- **Withdrawn:** the earlier proposal that the binding step opens even when everything matched, to ask how a signed color column reads (see "a signed column is asked about only when it disagrees with the recipe").
- **Why:** task flow 8 already skips the step when nothing needs the reader; pattern 6.10's pass condition ("say, before Apply, which of their attributes each part will read") is met by the preview's lines, so the everything-matched path stays the shortest. Drawn in screens/binding-step.html, state 1.

## Binding step: the match key and its case rule are one line; the controls open on request

- **Document and section:** `interface-templates.md` 20, the Binding step row; `element-contract.md`, "Key matching".
- **Old text:** "one row per unresolved reference: its name, then a picker ..." (silent on which column a table is joined by and how).
- **New text:** add: "When the recipe joins a table, the matched count is followed by one line naming what was matched against what and the case rule in force ('Your table's {column} against the network's {id name}; letter case must match, as the recipe sets'), with Change matching..., which opens the key column picker and Match case. The join itself is also a row of 'What the recipe reads from the data' (see 'the join key is a row with a picker'); when fewer than half the rows matched, that row moves to 'Needs your choice' and takes focus."
- **Replaces:** the earlier version of this entry, which drew the key picker and a Match case checkbox always visible.
- **Why:** the key is the first thing to check when the count is low, but when 84 of 96 matched it is settled and the controls are clutter in a step whose job is to fix what did not bind. Drawn in screens/binding-step.html, states 2 to 4.

## Binding step: when nothing matched, it says why from the values' shape and offers the two ways out

- **Document and section:** `interface-templates.md` 20, Binding step; `message-catalog.md`, `file.report`; `element-needs.md`, "Files, notes, recipes and history".
- **Old text:** (none: the step has no zero-match case)
- **New text:** "When no key value matched, the headline reads 'None of your {N} {idKind} matched' with the warning mark and no field carries an error outline. When the key values and the network's ids differ in shape (character classes, length, a shared prefix), a note says so with one example from each side, and no name for either kind: 'Your table's values look like a different kind of ID from the network's {id name}: {table example} in the table, {network example} in the network. They never match as written.' Then Match through a mapping table... and Change table.... No per-value list: when every value fails for the same reason the list says nothing the note has not; Copy all {N} IDs stays. Apply stays enabled: a part that would read nothing is kept, switched off, and the footer says what Apply will still add ('Apply adds the module colors and the filter now')." The new reason is `other-shape`, reported by graphty-element from the values alone, never guessed by the app. Match through a mapping table... asks for a two-column table pairing the two kinds of ID; that step is not drawn yet.
- **Replaces:** the earlier version of this entry, which had the element recognize named identifier kinds (Ensembl gene IDs, UniProt accessions) and listed eight unmatched IDs.
- **Why:** an all-zero join is the most common failure of bringing a gene table to a network, and a bare "0 of 96" does not say whether the file, the network or the tool is at fault. Naming identifier kinds would put a domain registry into a general graph element that serves fraud and IT readers as well; the shape difference answers the same doubt for everyone. Named kinds are a separate decision below. Blocking Apply would be a modal error, which `interaction-patterns.md` 3.4 rules out. Drawn in screens/binding-step.html, state 4.

## Binding step, FOR DECISION (one-way door): named identifier kinds as an optional extension

- **Document and section:** `one-way-doors.md` (new entry beside 27); `element-needs.md`, "Files, notes, recipes and history".
- **Old text:** (none)
- **New text:** "graphty-element carries no identifier registry. A registered, optional extension may name identifier kinds (for example Ensembl gene IDs) and supply a mapping, and the join report then names the kind in the note."
- **Why:** a lab reader would recognize "Ensembl ID" at once, but the name only helps one domain, and the extension's registration shape would be published API. The owner decides whether it exists; the mock draws only the shape-based note.

## Binding step: every need shown, unresolved first (a departure from Missing Fonts)

- **Document and section:** `interface-templates.md` 20, the Binding step row; `figma-crosswalk.md` (the Missing Fonts row, recorded departures); `content-design.md`, the Choice step row.
- **Old text:** (template 20) "one row per unresolved reference: its name, then a picker ...; unbound rows stay listed with what they block"; (content-design.md) "6 words a row".
- **New text:** (template 20) "one row per need the recipe reads, in four columns (need, your column, on your data, used by). Rows that need a choice come first under 'Needs a choice (N)', each with its picker, and initial focus on the first of them; needs found by name follow as compact read-only lines under 'Matched by name (N)', each still showing its column, its effect and what uses it. Unbound rows read 'Leave unbound' in the picker and 'kept, switched off' as their effect." (content-design.md) "6 words a row, per column; the 'on your data' column states a count ('84 of 96 matched', 'keeps 1,059 of 1,262'), and the footer carries any longer consequence."
- **Why:** Figma's Missing Fonts lists only what is unresolved, and options-and-encodings.md 10 already folds settled import columns behind "Show all columns". The binding step shows the settled ones because pattern 6.10's pass condition is that the reader can say, before Apply, which column each part reads; a hidden match cannot be checked. They are drawn below the questions, read-only, so the one question is never sandwiched between answers. Drawn in screens/binding-step.html, all states.

## Binding step, FOR DECISION (one-way door): a recipe records how its join matches

- **Document and section:** `one-way-doors.md` 19 (the recipe format); `element-contract.md`, "Key matching".
- **Old text:** "a Match case option off by default"
- **New text:** "A recipe that joins a table records its key-matching options (Match case) as its author set them; applying it uses them, and the binding step's key line says so ('letter case must match, as the recipe sets'). With no recorded option, Match case is off."
- **Why:** gene symbols are case-meaningful (Mdm2 is the mouse spelling of human MDM2), so a lab recipe needs exact case, and only then can a case-only near miss exist to be offered as a hand match. It is a field in a published file format, so the owner decides. If the owner declines, Match case stays off, Mdm2 matches MDM2 silently, the count in the mock becomes 85 of 96 with 11 unmatched, and the case-only reason and Use MDM2 disappear. Drawn in screens/binding-step.html, states 2 and 3.

## Filter chip and its steps: the step row carries one count, and names what it took out on hover

- **Document and section:** `interface-templates.md` 7, Regions and rows; `interaction-pattern-entries.md` 6.9, Feedback; `state-matrix.md` 7, the Filter steps row. Replaces three earlier proposals about the same row, which disagreed ("off" against "--", one number against two, a paragraph under the list): "each step row shows what is left and what the step took out" and "the steps popover is 320 wide" (both withdrawn), "Failure and recovery: each filter step shows what is left after it, and whom it left out" and "Alert triage: a filter step's row says what was kept from it and when it was exported" (both merged here).
- **Old text:** "the ordered steps (`Tree` rows with a checkbox in `actions`; ...)" (silent on what a row shows besides its rule)
- **New text:** "Each step is a `Tree` row: the checkbox (Turn off step); the outcome word (Filter to, Filter out) in secondary text at the rule's weight; the rule; then in the trailing slot the number of nodes left after the step, in the text color, or '--' while the step is off. The row's tooltip, on hover and on focus, says what the step removed: '61 left. Took out 15: Myriel, Mlle.Baptistine, Mme.Magloire, Champtercier, Count and 10 more' (the first five by degree, then the count). The row's accessible name carries both numbers ('Step 2 of 3: Filter to largest component, took out 15, 61 left'). The overflow button takes the count's place on hover and focus, so the row fits the default popover width (`PANEL_GRID.POPOVER_WIDTH`, 240) with 'Largest component' untruncated. No explanatory line under the list. What was kept or exported from a step (sets, notes, found paths, the last export) is a row of the step's rule editor, not a paragraph under the list."
- **Why:** a footnote explaining a row's numbers is the sign that the row is not legible, and two unlabeled numbers in 240 px needed a wider popover. One count, what is left, reads on its own down the list (76, 61, 60), and the drop between two rows is what the step did; the names are one hover away for the reader who asks "who?". The alert-triage paragraph answered a question about one step, so it belongs where one step is edited. Seen in screens/filter-chip.html, all states. Pending the study: `study/hypotheses/filter-step-order.md`, H2, asks readers what the number means with no footnote; if most misread it, a quiet column label ("left") goes above the list first. Needs the element's per-step membership (`element-needs.md`, "Per-step filter membership").
- **Superseded in part (round 2):** the row now reads "took out N &middot; M left" on its own line under the rule, and the overflow button no longer takes the count's place; see "Filter chip and its steps: each step row reads 'took out N, M left'", below. The hover names stay.

## Filter chip and its steps: the chip carries both counts, and drops words to fit

- **Document and section:** `message-catalog.md`, row `filter.chip`; `interface-templates.md` 7 ("its truncation order `content-design.md`'s"); `content-design.md` 5 (compact form at "the filter chip's last width step"). Replaces the earlier "the chip says when steps are off", which hid how many steps were on ("63 of 77 nodes &middot; 1 step off" does not say two are on).
- **Old text:** `filter.chip`: `Filtered: {kept} of {total} {kind}`, "the filter chip while any step is on"; content-design names a last width step but no order.
- **New text:** `graphty.filter.chip`: `Filtered: {kept} of {total} {kind}[ &middot; {N} steps]` when every step is on; `Filtered: {kept} of {total} {kind} &middot; {on} of {N} steps` when some are off; `Full graph &middot; 0 of {N} steps` when every step is off; `Full graph` with no steps; `Counting... &middot; {N} steps` while a recount has not returned. Width steps, tried in order until the text fits the chip's slot (216 px in the left panel header): (1) all words; (2) without "Filtered:", since the funnel glyph says it; (3) compact numbers ("2.9K of 3K accounts"); (4) compact numbers without the unit. The tooltip and the accessible name always carry form 1.
- **Why:** the chip is the only scope mark in view above every panel, so it must say both how much of the graph is read and how many steps make it; a count of steps off alone loses the second. Measured in screens/filter-chip.html: on Les Miserables "Filtered: 63 of 77 nodes &middot; 2 of 3 steps" is already too wide and falls to step 2 ("63 of 77 nodes &middot; 2 of 3 steps"); on the March transfers only step 4 fits ("2.9K of 3K &middot; 1 of 2 steps"), measured live below the screen. Whether readers still read step 2 as a filtered scope without the word is for the chip treatment test (`study/hypotheses/narrow-hide-paint.md`, H3). The message key is published, so the wording is the owner's call; the key does not change.

## Filter chip and its steps, FOR DECISION (element filter-step contract): every step reads the graph the steps above it leave, degree included

- **Document and section:** `element-needs.md`, "Ordered filter steps" and "Per-step filter membership"; `conceptual-model.md` 3, Live attributes; `interaction-pattern-entries.md` 6.9, Narrow.
- **Old text:** "Live attributes (the degree family, components) are read on the filtered graph and labeled so" (conceptual-model 3); the element need says a growing step reads the graph before itself, and is silent on what a narrowing rule over a live attribute reads.
- **New text (proposed):** "Every filter step reads the graph the ON steps above it leave. A rule over a live attribute (degree and its family) is evaluated on that input graph, as a structural step (largest component, k-core) is, so one ordered list follows one evaluation rule. The step's rule editor states its input in its Scope row ('After step 1: 76 nodes'). A rule that should read the full graph binds a run on the full graph by name ('degree on: full graph'), never silently."
- **Why:** the earlier mock filtered 'degree >= 5' on full-graph degree while 'Largest component' read the steps above it, so one list ran two data models and the per-step counts mixed them. The conceptual model already says live attributes read the filtered graph; this states it for steps. A Gephi user expects a chained degree filter to recount after its parent (`study/personas/gephi-holdout.md`, "Statistics follow the filter"). Published behavior of graphty-element's steps API, so a one-way door: proposed, not decided. The mock follows the conceptual model. It also supersedes the last sentence of "Keyboard walk: counts inside a filter say so" ("Degree and rank read the degree column, over the full graph"): with a step on, degree is the filtered graph's, and where a node's full-graph degree differs it follows, named ("degree 6, 11 on: full graph").

## Filter chip and its steps: the table shows the filtered degree, and the full graph's beside it

- **Document and section:** `interface-templates.md` 16, the table; `content-design.md` 5 (a scope is named when it differs from the chip's).
- **Old text:** (silent on which graph a degree column reads while a step is on)
- **New text:** "While a filter step is on, a column of a live attribute reads the filtered graph and carries no qualifier, since its scope is the chip's. Beside it, the full graph's value, headed with its scope in secondary text ('degree on: full graph') and the same words in the header's tooltip. With no step on, the second column is not shown."
- **Why:** a column headed 'degree' showing Valjean at 36 under 'Filtered graph: 28 of 77 nodes' reads as an impossible number (no node in 28 has 36 neighbors), exactly the 'which graph is this number about' failure the chip exists to prevent. Showing both follows conceptual-model 3 ("both are shown"). Drawn in screens/filter-chip.html (Valjean 18, 36 on the full graph).

## Filter chip and its steps: a step whose place changes its result carries a warning glyph

- **Document and section:** `interface-templates.md` 7, Regions and rows; `element-needs.md`, "Per-step filter membership".
- **Old text:** (none)
- **New text (proposed, pending the study):** "A step that reads the graph (largest component, k-core, a rule over a live attribute) carries the warning mark in its trailing slot when its result differs from what it would take out of the full graph. The mark's tooltip names the earlier steps it reads after and both counts: 'Reads the graph left by step 1 (Filter out label = Valjean). On the full graph this step takes out 1; here it takes out 15.' The rule editor repeats the second sentence under Result. The comparison is graphty-element's, reported with each step's membership."
- **Why:** the order dependence of a structural step is silent and changes every number; the per-step count alone makes it visible only to a reader who already suspected it (`study/insights/open-design-questions.md`). Showing the mark only when the place actually changed the result keeps it off the ordinary case (in 'Three steps', degree >= 5 after Largest component takes out the same nodes either way, so no mark). Tested by `study/hypotheses/filter-step-order.md`, H1, with the Gephi holdout first; the address `#after-removal&bare&closed&noglyph` is the arm without the mark. New behavior, a two-way door; not in force until the study passes it.
- **Withdrawn (round 2):** replaced by "Filter chip and its steps: a step's note says what it keeps, in secondary text", below. The mark read as an error in the study; the fact it carried is now a neutral line.

## Filter chip and its steps: the checkbox sits in the leading slot

- **Document and section:** `interface-templates.md` 7 ("`Tree` rows with a checkbox in `actions`"); `interaction-pattern-entries.md` 6.9, Inherits ("`Tree` rows with a checkbox in `actions`"); `interface-specification.md` 2.2 (the leading slot).
- **Old text:** "`Tree` rows with a checkbox in `actions`"
- **New text:** "`Tree` rows with a checkbox in the leading slot, before the outcome"
- **Why:** the documents disagree. The leading slot is where Figma's layer row puts its one mark, and a checkbox read before the rule says "this step is on" before the reader parses what it does; the trailing slot is taken by the count and, on hover, the overflow. The departure from Figma is the control, not the place: Figma's eye sits at the trailing end of a layer row. screens/filter-chip.html is the canonical mock of this device; screens/filter-steps-and-undo.html and screens/undo.html now match it.

## Filter chip and its steps: Space turns a focused step off and on; the hide chord does not

- **Document and section:** `interaction-pattern-entries.md` 6.5, Trigger; 9.3 ("the hide chord toggles the eye of the focused row").
- **Old text:** "the hide chord toggles the eye of the focused row (9.3)" (silent on the filter step's checkbox)
- **New text:** add: "On a focused filter step, Space toggles the checkbox, as on any checkbox. The hide chord does nothing there, because turning a step off changes every number and the hide chord never leads to a verb that changes a number (9.3)."
- **Why:** neither document says which key turns a step off, and the obvious reuse of the hide chord would break 9.3's own rule. Drawn in screens/filter-chip.html.

## Filter chip and its steps: Move up and Move down take Figma's Bring forward and Send backward chords

- **Document and section:** `interaction-pattern-entries.md` 6.3 (Inherits: "`Tree`'s `onMove`, drag and Alt+Arrow") and 9.3, "Figma's chord where Figma's verb matches".
- **Old text:** (no chord for Move up and Move down; 6.3 inherits the Tree's Alt+Arrow)
- **New text:** add to 9.3's list: "Move up and Move down on a reorderable row (a filter step, a style layer, a view): Mod+] and Mod+[, Figma's Bring forward and Send backward, which move a layer one place in the same kind of stack. The Tree's Alt+Arrow keeps working and is not printed." The row menus print "Ctrl+]" and "Ctrl+[" (Cmd on macOS).
- **Why:** the earlier mock printed "Alt Up" and "Alt Down", which the framework defines nowhere and Figma does not use; a chord printed in a menu reads as decided. Row keys are the app's (9.3, "row focus is the app's"), so this is a two-way door; it does not touch the element's published keymap.

## Filter chip and its steps: Create rule set moves from the popover header to the step's menu

- **Document and section:** `interface-templates.md` 7 ("Its popover ...: header with Create rule set").
- **Old text:** "header with Create rule set"
- **New text:** "header with the title and a close button, as Figma's light popover has; each step's row menu holds Create rule set from step, which keeps that step's rule as a rule set in Sets and paths."
- **Why:** in the header, with three steps, the command did not say whether it kept one step's rule or all of them combined; on the row its subject is the row. Drawn in screens/filter-chip.html (the row menu).

## Filter chip and its steps: the rule editor's rows for a filter step

- **Document and section:** `interface-templates.md` 10, the Rule row ("predicate with AND, OR, NOT and membership; Scope; Population; Notes").
- **Old text:** as above.
- **New text:** for a filter step: "header: a back row, '< Filter steps', and the close button; a title naming the step ('Step 2: Filter to degree >= 5'); Outcome (Filter to, Filter out; a structural step is Filter to only); the predicate; Scope, the graph the step reads ('Full graph: 77 nodes' for step 1, else 'After step 1: 76 nodes'); Result ('Leaves 41; takes out 35.'), with the order warning under it when it applies; Population only for a relative threshold; what was kept or exported from the step; Notes. Edits apply as they are made, each field's change one undo step. Esc closes the popover, like any other top-most overlay; the back row returns to the list."
- **Why:** the template names the rows for a rule set, not for a step, whose input graph and result are what the reader checks. Drawn in screens/filter-chip.html, state "Editing a step".

## Filter chip and its steps: the chip is a button with a caret

- **Document and section:** `interface-templates.md` 7, Regions and rows ("the chip, under the project name in the left panel header"); `interface-specification.md` 7.3 (the filter chip, missing); `visual-language.md` (the chip's look).
- **Old text:** "the chip, under the project name in the left panel header, showing the scope and the filter steps' count"
- **New text:** "the chip, under the project name in the left panel header, drawn as a button with a caret: compact-mantine `Button`, default variant (1 px strong border), height 24, the funnel as its left section and a chevron-down as its right section, as the trigger of the steps `Popover`; while the popover is open it takes the selected fill. It shows the scope and the filter steps' count, its truncation order `content-design.md`'s; the caret never truncates."
- **Why:** round 2, finding 9 (severity 3): the grey pill read as a label, and in 9 sessions participants found it last or by accident, after undo had failed them -- although it is the one-click route to the steps. A bordered button with a caret is the shape every participant already reads as "opens something" (Figma's own dropdown buttons, Google Sheets' filter button). Drawn in screens/filter-chip.html (kit class `k-chip-btn`); other mocks still draw the pill until they are revised. A look, not a name: two-way door, decided.

## Filter chip and its steps: each step row reads "took out N, M left"

- **Document and section:** `interface-templates.md` 7, Regions and rows; `state-matrix.md` 7, the Filter steps row; `message-catalog.md` (one new key).
- **Old text:** "the number of nodes left after the step, in the text color, or '--' while the step is off" (this file, "the step row carries one count, and names what it took out on hover")
- **New text:** "Each step is a `Tree` row of up to three lines. First: the checkbox, the outcome word in secondary text, the rule (wrapping, never cut), and the overflow button on hover and focus. Second, in the text color: 'took out {took} &middot; {left} left', or 'off &middot; takes nothing out' in secondary text while the step is off. Its tooltip names who the step took out, the first five by degree and the count. Third, only when the step has one: its note (next entry). The row's accessible name carries all three." New key `graphty.filter.stepCounts`: `took out {took} &middot; {left} left`, and `graphty.filter.stepOff`: `off &middot; takes nothing out`.
- **Why:** round 2, finding 9: with only what is left (60, 40, 27), readers had to subtract to see what a step did, and the column had no heading. Both numbers in words need no heading and no subtraction. They fit the default popover width (240) because they have their own line. The message keys are published, so the wording is the owner's call; the mock follows it. Drawn in screens/filter-chip.html, every state.

## Filter chip and its steps: a step's note says what it keeps, in secondary text

- **Document and section:** `interface-templates.md` 7, Regions and rows; `element-needs.md`, "Per-step filter membership"; `message-catalog.md` (replaces the proposed `graphty.filter.stepChangedLater`).
- **Old text:** the warning mark on a step whose place changes its result, and the line "{N} dropped below degree {k} by "{step}"" (both proposed in this file, both withdrawn above)
- **New text:** "A step that reads the graph's structure (largest component, k-core, a rule over degree) carries one line under its counts when it reads a graph that earlier steps changed, or, for Largest component, a graph in more than one piece. The line is secondary text, never a warning mark or color, and is worded from the reader's side as what the step keeps of the graph it reads: 'keeps only nodes with at least 5 neighbors among the 60 it reads'; 'keeps only the largest of the 7 connected pieces it reads'; 'keeps only nodes with at least {k} neighbors among the kept, of the {n} it reads'. It never names or explains a step below it. It is hidden while the step is off, and repeated under Result in the step's rule editor." Keys `graphty.filter.stepNote.degree`, `.component`, `.core`, with `{op}`, `{k}`, `{n}`, `{pieces}`.
- **Why:** round 2, finding 9: in 8 sessions the note that explained an earlier step by a later one ("3 dropped below degree 5 by Filter out group 8") read as a contradiction or an error, and one participant nearly turned off the step she meant to keep. The steps apply top to bottom, so a row can only be explained by what is above it. What the reader needs from the wrong middle step -- Largest component took out 15, because it reads a graph in 7 pieces -- is on its own row, in words, with nothing styled as a fault. The numbers come from graphty-element's per-step record; the app only prints them. Drawn in screens/filter-chip.html, states "Three steps" and "Wrong middle step".

## Filter chip and its steps: a time window is an ordinary step, and what it keeps

- **Document and section:** `interface-templates.md` 7 ("the **Window** step while the time slider is on"); `interface-templates.md` 16 (the time slider strip); `information-architecture.md` 171 (Time windows). Details the placement in "Information architecture: four placements", above.
- **Old text:** "the ordered steps (`Tree` rows with a checkbox in `actions`; the **Window** step while the time slider is on)"
- **New text:** "the ordered steps (`Tree` rows, the checkbox in the leading slot). A time window is one of them, of the ordinary rule kind: 'Filter to {date attribute} {from} to {to}' ('Filter to timestamp Mar 8 to Mar 14'). Three routes write the same step, appended at the end: Filter to this window, a secondary `Button` on the dock's time slider strip; Filter to {from} to {to}, under a band dragged across a date column's histogram (the table header's profile); and a date rule in the step editor (attribute, 'between', two date fields). The slider itself changes no count and writes nothing until Filter to this window is pressed; the step does not move when the slider does. A window step keeps the edges dated inside the window and the nodes at either end of one; its note says so: 'keeps only the {N} transfers in the window and the accounts that sent or received one'."
- **Why:** round 2 asked for a time-range filter step (finding on time and paths); time already has a home (`information-architecture.md` 171), so a window reuses the step list rather than adding a control, and a window that is a step can be turned off, moved and undone like any other. "Keeps the nodes at either end of a kept edge" is decided here because the window's question is who was active in it: an account with no transfer in the window would otherwise stay, and count as isolated in Statistics. Numbers on the March transfers: 1,852 of 3,000 accounts and 2,065 of 9,113 transfers (`kit/fixtures.json`, `scenarios.filterChipWindow`, from `screens/filter-chip-window-numbers.mjs`). Whether a window step also offers "keep every node" is left to the next study. Drawn below the screen in screens/filter-chip.html. Two-way door.

## Filter chip and its steps: Statistics says its scope while a step is on

- **Document and section:** `interface-templates.md` 8; the entry "Statistics and the chip: a question for the study, not a change" above.
- **Old text:** (the mock showed "nodes 28 of 77" and no scope)
- **New text (to test, not proposed yet):** "While a filter step is on, Statistics opens with the table's scope words ('Filtered graph: 28 of 77 nodes'); with no step on it shows nothing extra." A fourth condition for H3 in `study/hypotheses/narrow-hide-paint.md`: (d) a scope line only while filtered.
- **Why:** it is a mark on departure (principle 1), unlike the always-on line that entry rejected, and it answers the same question the table's scope line does, in the same words. The Statistics row "filter steps" is removed: the chip, always in view, says it.

## Filter chip and its steps: the chip stays a trigger when the last step is deleted

- **Document and section:** `interface-specification.md`, the Filter chip row ("read-only ("Full graph", no menu) until filter steps exist"); `information-architecture.md`, the chip's menu (Filter to / Largest component / k-core / Create rule set).
- **Old text:** "compact-mantine; read-only ("Full graph", no menu) until filter steps exist"
- **New text:** "compact-mantine; reads "Full graph" when no step exists and still opens the steps popover, which then says 'No filter steps. Every number reads the full graph.' above its '+' (Largest component, k-core..., Rule...)."
- **Why:** the two documents disagree: the information architecture puts Largest component and k-core behind the chip, and the specification makes the chip inert until a step exists. Deleting the last step in the interactive mock left the popover open with nothing to say; an inert chip would also hide the presets that are the fastest way to a first step. Decided for the mock as above.

## Results panel: the Catalog is one list with its family names as headings

- **Document and section:** `interface-templates.md` 3, Results panel, "Regions and rows".
- **Old text:** "the Catalog, one flat list of `ActionRow`s with (i), a precondition mark and a cost word (its threshold `principles.md`'s), narrowed by the search field and the Source and Family filters at every count"
- **New text:** "the Catalog, one list of `ActionRow`s under the element's family names as plain headings (Centrality, Community, Path, Structure, Flow, Prediction; not collapsible), each row with (i), a precondition or variant mark and a cost word (its threshold `principles.md`'s), narrowed by the search field and the Source and Family filters at every count. Its section heading is Catalog."
- **Why:** the template says "flat" while `information-architecture.md` 3 orders the Catalog "by topic: the element's families as headings", and `principles.md` counts the family names as the only way to find an algorithm without its name. Headings that do not fold keep both: one list, one Tab stop, and the families visible. Earlier mocks used collapsible families and the heading "All algorithms"; `glossary.md` names the section Catalog. Drawn in screens/results-panel.html (every state).

## Results panel: a variant word and a violated precondition look different on a Catalog row

- **Document and section:** `principles.md` 1, "A caveat is one of five kinds", the mark form; `interface-templates.md` 3.
- **Old text:** "Exactness, variant and a violated precondition take the mark form: one glyph or at most three words at the value or the name, each kind with its own word so that no two read alike."
- **New text:** add: "On a Catalog row before a run, a variant is its plain word, dotted-underlined because it is a control ('WF-corrected'); a violated precondition is the warning glyph plus its phrase ('3 components'), because only the second means the result would mislead."
- **Why:** on the protein network (3 components) both apply at once: Closeness will use the Wasserman-Faust correction, which `graph-conventions.md` 2 says is not a violated precondition, and Eigenvector is degenerate and offers PageRank. With one look for both, the analyst learns to ignore the warning, or avoids closeness for no reason. The run-and-read mock drew Closeness with the yellow warning phrase, which is the misreading this prevents. Drawn in screens/results-panel.html (states 8, 10 and 14).

## Results panel: the pinned strip's heading and its command

- **Document and section:** `interface-templates.md` 3, "pinned strip of failed or out-of-date results"; `information-architecture.md` 3, the Results row; `message-catalog.md` (a new label).
- **Old text:** (none: the strip has no heading, and `interaction-pattern-entries.md` 7.2 places Review out of date "wherever an out-of-date mark shows" without naming a spot in the panel)
- **New text:** "The strip is a section headed 'Needs action' with its count; while any pinned row is out of date its header carries Review out of date, whose Re-run all shows the combined band. Each pinned row keeps its own one verb on its state line. The strip is on a secondary background so it does not read as part of In this project."
- **Why:** without a heading the strip reads as the first rows of In this project sorted oddly, and the same result appears twice. `principles.md` puts the bulk Re-run on the Results panel header; the strip header is the one place in the panel that is about exactly those rows. The label is a two-way door; it joins `glossary.md` only if the comprehension test tells it apart from "Out of date". Drawn in screens/results-panel.html (states 7, 10 and 11).

## Result editor: a metric shows its distribution before its top nodes

- **Document and section:** `interface-templates.md` 10, the Result editor row, "then its readings".
- **Old text:** "headline readings; for a partition, top and bottom items (opening the item tab); for a metric, **Top nodes**, its top N with values"
- **New text:** "headline readings; for a partition, top and bottom items (opening the item tab); for a metric, **Distribution** (a `ChartRow` histogram over the result's scope, the selected node's bin marked, then middle, highest and the count of zeros), then **Top nodes**, its top N with values"
- **Why:** a top-5 list alone hides the shape: on the protein network 269 of 300 proteins sit in the lowest twelfth of betweenness, so the top values are outliers, not a scale. For closeness (WF-corrected) the distribution is what shows the 2 isolated proteins at 0, apart from everyone else. Both mocks of reading a result already draw it. Drawn in screens/results-panel.html (states 8 and 14), with bar heights on a square-root scale so that bins of 1 and 4 differ.
- **Second document and section:** `figma-crosswalk.md` 4.1, the row "Figma's popovers hold no chart".
- **Old text:** "| Figma's popovers hold no chart | the histogram popover | 1 | a distribution is read, not guessed |"
- **New text:** "| Figma's popovers hold no chart | the histogram popover; a metric result editor's Distribution | 1 | a distribution is read, not guessed |"
- **Why (second pair):** the same evidence: 269 of 300 proteins sit in the lowest twelfth of betweenness, so a result editor without its distribution misleads, and the crosswalk must list every popover that departs from Figma's no-chart rule.

## After WebGPU is lost, the Catalog's cost words are for the CPU

- **Document and section:** `state-matrix.md` 3, Results panel, Result row, Error (row), "the GPU failed mid-run"; `glossary.md` 10, Cost bands.
- **Old text:** "the GPU failed mid-run: the previous value kept and marked; the row says the GPU run failed and names the path Re-run will take now"
- **New text:** add: "Every cost word in the panel, the Catalog's included, is the element's estimate for the path a run would take now, so after the loss they may all move (PageRank on 124,318 patents: under a minute on WebGPU, a few minutes on the CPU)."
- **Why:** Re-run on CPU names its path, but a Catalog click after the loss starts on the CPU too, and a band left over from the GPU would understate it by a whole band. The estimate is the element's (`session.estimate`), so this is a statement about what the app reads, not new app logic. Drawn in screens/results-panel.html (state 11).

## Results panel: the running notice shows only while the running row is out of sight

- **Document and section:** `interaction-pattern-entries.md` 7.1, Behavior; `interaction-patterns.md` 3.5, level 4; `figma-crosswalk.md` 4.1, the row "A toast is transient".
- **Old text:** entries 7.1: "the one running notice, a persistent toast with progress and Cancel, carries the earliest run's progress (`interaction-patterns.md` 3.5), so the state is on screen while the Results panel is closed." Crosswalk: "the one running notice stays, with progress and Cancel, while the Results panel is closed".
- **New text:** entries 7.1: "the one running notice, a persistent toast with progress and Cancel, carries the earliest run's progress **while that run's row is out of sight** (the Results panel closed, or the row scrolled out of view); with the row in view the notice is hidden and the row carries the run, because no notice repeats what a visible control shows (`interaction-patterns.md` 3.5). The Results rail button carries a running indicator while any run is in progress." Crosswalk: "the one running notice stays, with progress and Cancel, while the running result's row is out of sight".
- **Why:** with the panel open the old rule put the same run on screen three times, each with its own Cancel: on the row, in the editor header and in the notice. 3.5 already forbids a notice that confirms what a visible control shows, and the crosswalk's own reason ("work in progress out of sight must stay cancelable") only applies while the row is out of sight. `principles.md` names the notice in its closed list without a condition; that line stays, since the notice is still one of the things that may appear unasked. Figma shows a plugin's run once, in its toast. Drawn in screens/results-panel.html (states 1 and 2).

## Result editor: the Run line, and a held edit while a run is in progress

- **Document and section:** `interface-templates.md` 10, the Result row ("header: Run or Cancel; the state line; ..."); `state-matrix.md` 3, Result editor, Running.
- **Old text:** "header: Run or Cancel; the state line; Scope ..."; state matrix: "options editable; an edit is held and Run queues a run with it".
- **New text:** "header: Run or Cancel; **the Run line** ('Options wait for Run', `message-catalog.md` `graphty.edit.runLine`) directly under the header, in every state but a refusal; the state line; Scope ...". State matrix: "options editable; an edited field carries a changed mark, and while the header's slot holds Cancel, a line under the options says '<Option> <value> has not run. Run queues it after this run.' with Run, the band, and Reset (back to the value the run in progress uses)."
- **Why:** `interaction-patterns.md` 3.3 says every result editor always shows its Run line, but the template never placed it, and the first mock drew none: its Damping field read 0.5 while the run in progress used 0.85, with only Cancel in the header. This is the one place graphty departs from Figma's live property edits, so the departure has to be on screen, and the held edit needs its own Run while the header's only command is Cancel. After Cancel the edit stays held and the header's Run returns. Drawn in screens/results-panel.html (states 1, 3 and every editor).

## Result editor: Run is quiet on a current result; Re-run is for Failed and Out of date

- **Document and section:** `interface-templates.md` 10, the Result row header; `interaction-patterns.md` 3.3, "a current result is opened and not re-run (Re-run stays explicit)".
- **Old text:** "header: Run or Cancel" (silent on the current case); 3.3: "(Re-run stays explicit)".
- **New text:** add to the template: "On a current result Run is disabled until an option differs from the run shown, as in Figma, where nothing needs applying until something changes. The header never reads Re-run on a current result: Re-run, which repeats the recorded options, is the verb of Failed (labeled with its path) and Out of date (`glossary.md` 9 and 10). Repeating a current run unchanged (a new seed, for one) is in the header's menu." 3.3: "(repeating it stays explicit, in the result's menu)".
- **Why:** the first mock labeled a current result's header Re-run, which blurred the one distinction the Needs action strip and Review out of date depend on. Drawn in screens/results-panel.html (states 8, 12, 13 and 14 disabled; 3 enabled after an edit; 11 Re-run on CPU).

## Result editor: the values shown are named on the state line while a run is pending

- **Document and section:** `interface-templates.md` 10, the Result row, "the state line"; extends "Failure and recovery: a failed run's row says whose values it still shows" above.
- **Old text:** (that entry names the line only for a failed run)
- **New text:** "While a run is in progress, failed, or canceled with an edit held, the state line ends 'Values shown: run {N}, {the option that differs} {value}', so the analyst can tell the numbers in the table and on the layers from the run they asked for. It replaces the separate 'Values shown' section an early mock drew."
- **Why:** the running state's editor showed Damping 0.5 above values computed with 0.85; one line of the state line says so without adding a template section. Drawn in screens/results-panel.html (states 1, 3 and 11).

## Results panel: a pinned result is shown once, and Review out of date carries only Re-run all

- **Document and section:** `information-architecture.md` 3, the Results row ("the strip holds what the element reports failed or not current and never reorders the list"); `interaction-pattern-entries.md` 7.2, Review out of date.
- **Old text:** "the strip holds what the element reports failed or not current and never reorders the list"; 7.2: "lists every out-of-date object with its band ... Its Re-run all ... The per-row Re-run stays."
- **New text:** IA: "the strip holds what the element reports failed or not current; a pinned result leaves In this project while it is pinned and returns to its place when it is current, so the rest of the list never reorders." 7.2: add: "The popover lists the objects and the cause with no per-row verb; each object's one Re-run stays on its own row."
- **Why:** the first mock drew each out-of-date result twice (strip and list), each with the warning mark, plus a Re-run on every strip row, a Re-run on every popover row and Re-run all: six entry points for two results, against 7.2's "one recovery verb, and only one". Drawn in screens/results-panel.html (states 7, 10 and 11).

## Result editor, FOR DECISION: does a finished run paint the graph by default?

- **Document and section:** `interaction-pattern-entries.md` 6.1 and 7.1; `options-and-encodings.md` 4 (automatic layers); `interface-templates.md` 10, Appearance ("its automatic layer with its eye").
- **Old text:** (the documents give a run an automatic layer with an eye, and `interaction-patterns.md` 3.5 makes the repaint the default feedback, but none says whether the layer is on when the run lands)
- **New text, option A (drawn as the main answer):** "A finished run's automatic layer is on: the canvas repaints, which is the run's level-1 feedback; the eye turns it off." **Option B:** "It is added off: the row reads 'not shown' with the eye closed, and the canvas does not change until the analyst turns it on."
- **Why:** the first mock drew the eye open over an unpainted canvas, which is neither. A reads as Figma does (an open eye means drawn) and gives the run visible feedback; B keeps the canvas quiet when several runs land in a row, at the cost of a run that changes nothing on screen. This is the default of graphty-element's suggested styles for every consumer, so it is the owner's call. Drawn both ways in screens/results-panel.html (states 8 and 9); the study's task is "run betweenness and tell me which proteins bridge modules".

## The cost gate, FOR DECISION: which runs does it refuse, and is "created unrun" reachable?

- **Document and section:** `state-matrix.md` 4.10 (row 1, "a gated algorithm entry"); `interaction-patterns.md` 3.3, "a single Catalog click" ("'a few minutes' or longer: created unrun with Run focused and its band"); `state-matrix.md` 3, GpuLost.
- **Old text:** row 1: "a gated algorithm entry whose estimate is past `exactComputationSeconds` ... this row wins over the band"; 3.3: "'a few minutes' or longer: created unrun with Run focused and its band".
- **New text (proposed; the default is door 42's):** state which entries are gated. graphty-element's `gateRun` (`src/session/cost/estimate.ts`) refuses every algorithm whose exact estimate passes the 30-second budget, with or without a sampled method, so at the default budget row 1 always wins and 3.3's "a few minutes or longer: created unrun" is unreachable. Either the budget's default rises past the background line, or 3.3 drops that clause and says a costly click is refused with its routes.
- **Why:** two mocks would otherwise draw states the element cannot produce: a costly Catalog click arriving unrun, and "Re-run on CPU, a few minutes" after WebGPU is lost, which the gate would refuse as E_CAP_EXCEEDED for PageRank on 124,318 patents. The results-panel mock therefore draws Not run from Redo (reachable today) and keeps Re-run on CPU, marked as this open question. The gate's default is published element behavior: the owner's call.

## Closeness names its variant with an (i), not a menu

- **Document and section:** supersedes part of "Results panel: a variant word and a violated precondition look different on a Catalog row" above; `principles.md` 1, "The variant is part of the name".
- **Old text:** "a variant is its plain word, dotted-underlined because it is a control ('WF-corrected')", and the first mock opened a one-item context menu holding a paragraph of definition above "Harmonic centrality".
- **New text:** "A variant is its plain word, dotted-underlined because it has a definition: hover or focus shows it in a light info popover, never a menu. The result editor spells it out on a Variant row with an InfoCircle ('Wasserman-Faust corrected'), and offers the alternative as a plain command in the body ('Run harmonic centrality', a sibling result)."
- **Why:** Figma never puts prose in a menu, and a one-item menu is a command in disguise; the menu also covered the editor's own fields. The definition must also be true of the data: on the protein network the correction multiplies the main component's scores by 297/299 and changes no ranking, and the 2 isolated proteins score 0 with or without it. The first mock's "score 0, not 1.0" applies only to a node in a two-node component, which this graph does not have. The values are now in `kit/fixtures.json` (`ppi.closeness`). Drawn in screens/results-panel.html (state 14).

## Error codes stay in the run's record, not in the error slot

- **Document and section:** `interaction-pattern-entries.md` 8.1; `content-design.md` 4 (codes through Report problem).
- **Old text:** (8.1's error slot is silent on the code; the refusal mock shows `E_CAP_EXCEEDED` in the slot)
- **New text:** "The error slot shows the headline and cause in words and a Details link to the run's record; the error code is in the record, copyable, and on screen only through Report problem for a programming fault."
- **Why:** the content rules offer a code only through Report problem and only for faults; a lost GPU device or a refusal over budget is an environment or policy outcome, not a fault, and a code in the slot is the one thing an analyst cannot act on. Drawn in screens/results-panel.html (states 7 and 11); screens/option-form-cost.html still shows the code.

## The device-lost cause: plainer words, to test against the current ones

- **Document and section:** `message-catalog.md`, `cause.E_DEVICE_LOST` (after "Notices and errors: the device-lost cause drops its instruction to the designer" above).
- **Old text:** "WebGPU lost; new runs use the CPU"
- **New text (for the study to compare, not decided):** "the graphics card stopped responding; new runs use the CPU". The band never sits beside the word Failed: it is on the command ("Re-run on CPU, a few minutes") and on a line of its own in the editor ("Re-run on CPU takes a few minutes").
- **Why:** "WebGPU" is a word most analysts have never needed, and the first mock's state line "Failed . a few minutes on the CPU" read as "failed after a few minutes". The message key is published, so the wording is the owner's call after the study. The mock draws the current proposed wording, so it agrees with screens/notices-errors.html.

## Version history: what an entry row says, and the current version's mark

- **Document and section:** `information-architecture.md` 3, the Version history row; `interface-templates.md` 17, Regions and rows.
- **Old text:** "data version, applied recipe, operation | many | newest first; operations fold beneath data versions | opened filtered to the current graph"; "entries (`ActionRow`); an entry's report at full height."
- **New text:** add to 17: "An entry row has two lines, as a Figma version entry does: its name, then its time. A data version's name starts as its source file's name ('transfers-2026-03.csv') and is changed with Rename... in the entry's menu, as Figma's 'Name this version' is; the app never invents one. The latest data version always carries the word 'current', whichever version is on screen, and its report has no Restore; the selection highlight, not a word, marks the entry being read. An applied recipe row reads the recipe's name with the kind word 'recipe'. A folded operation row reads its verb in the past tense and its subject ('Re-ran Modularity vs randomized baseline', 'Declared amount as weight'), and a run is named as the Results panel names it. Times read 'Today 09:14' for today, 'Apr 2' for an earlier day this year and 'Dec 1, 2025' for an earlier year; the report gives the full ISO date and time ('2026-04-02 10:12'), as the Restore version undo name does. The entry menu holds Rename..., Restore version (an old data version only) and Copy methods. The graph filter the list opens with is shown only while the project has more than one graph, in the slot above the entries where Figma puts its 'Show autosave versions' filter."
- **Why:** the framework names what the entries are but not what a row says, and without it the list reads as a log of file names. A name the app made up from a file's dates would be the app computing about the data; the file's own name is what the element already records, and Rename keeps the naming the analyst's. "Current" on the latest data version, never on "the version on screen", keeps the word stable while an old version is open. A single-line row could not hold name, kind word, time and menu at 241 px without truncating the name. The filter follows `interaction-patterns.md` 3.7: a control no action on this project could make useful is hidden. Drawn in screens/version-history.html (states 1, 2, 3 and 6).

## Read-only hides the canvas tools that create, rather than disabling them

- **Document and section:** `interaction-patterns.md` 3.7, Read-only.
- **Old text:** "The canvas shows the project without editing tools"
- **New text:** "The canvas shows the project without editing tools: Path and Note leave the toolbar and each list's '+' leaves its header, rather than showing disabled, because the one action that brings them back, Edit current version, is stated once beside the project name. Select (with Lasso and Hand), Quick actions and the view mode stay."
- **Why:** 3.7's hide-or-disable rule would otherwise show them disabled, since an action (Edit current version) makes them apply; that would repeat the read-only reason on every tool, which is exactly the per-panel statement the Read-only rule forbids. Drawn in screens/version-history.html (every state: the mode is view-only throughout).

## Version history is a viewing mode: the current version is view-only too

- **Document and section:** `interaction-patterns.md` 3.7, Read-only; `figma-crosswalk.md` 4 (no departure recorded, so none is proposed).
- **Old text:** "Read-only has two triggers: an old version opened by a click or Enter on its data version row ... and a second tab opened while another tab holds the project's autosave lease."
- **New text:** "Read-only has two triggers: Version history open, whichever version is on screen (Figma's version history is a viewing mode; editing starts after Done), and a second tab opened while another tab holds the project's autosave lease. While Version history is open the View only chip sits on the chip row under the project name; Edit current version is added under it only while an old version is on screen."
- **Why:** 3.7 said an old version is read-only but was silent on the current version inside the mode, and an editable canvas there would be a departure from Figma with no graph reason recorded. It also avoids a question the editable version could not answer well: an edit made in the mode would add an entry above the one the analyst is reading. Re-running while reading the methods text is served by Done, then Re-run; the report stays one click away. The chip moves to the chip row so the project name, which the read-only statement anchors to, is never truncated. Drawn in screens/version-history.html (every state).

## Version history: opens are entries, grouped as Figma groups autosaves

- **Document and section:** `information-architecture.md` 3, the Version history row; `figma-crosswalk.md` 4.1, "Version history lists autosaves". The two disagree: the crosswalk lists "data versions, applied recipes and opens", information architecture lists "data version, applied recipe, operation".
- **Old text:** information-architecture.md 3: "data version, applied recipe, operation".
- **New text:** "data version, applied recipe, opens, operation". Add to `interface-templates.md` 17: "Consecutive opens between two other entries are one row, 'Opened 22 times', with its span of dates; its chevron lists each open with its time."
- **Why:** "when did someone last look at this project" is a question the weekly-return analyst asks, and the crosswalk already promised it. One row per open would bury the data versions (a project reopened daily makes 20 to 30 opens a month); Figma solves the same flood by collapsing autosaves. Drawn in screens/version-history.html (states 1 and 4).
- **Element need:** project-open records belong to graphty-element's version record, alongside the data versions (`element-needs.md`, the Version history row).

## Version history: the selected entry's report expands in place

- **Document and section:** `interface-templates.md` 17, Regions and rows.
- **Old text:** "entries (`ActionRow`); an entry's report at full height."
- **New text:** "entries (`ActionRow` in a `Tree`); the selected entry expands in place, and its report sits directly under its own row, above its folded operations, so a report is never pushed off screen by a long list. A click or Enter on a data version opens it read-only and expands it; the chevron (or Right and Left) folds without opening; a click on a recipe, an opens row or an operation expands its report under it and leaves the canvas as it is. The report has no heading: its first line is the source ('Replace data from transfers-2026-04.csv, 2026-05-04 09:14'), since the row above already names the entry."
- **Why:** with the report below the list, the "many entries" state the template lists (200 entries, `interaction-patterns.md`) puts the report of the selected entry off screen, which fails "at full height". Figma's version entry already expands in place with its caret, and the object table assigns the caret that job. Drawn in screens/version-history.html (states 1, 4 and 5).

## Version history: header row 2 keeps zoom; Export log moves to the list head

- **Document and section:** `interface-templates.md` 6 (row 2: the mode tab "then the zoom and view Menu") and 17 ("header with Done and Export (the operation log)"). Read together they put four controls in 241 px.
- **Old text:** 17: "replaces the inspector column: header with Done and Export (the operation log)".
- **New text:** 17: "replaces the inspector column. Header row 1 keeps Export...; row 2 holds the Version history tab, the zoom menu and Done. Above the entries a list head names whose history this is (or holds the graph filter) and carries Export log, a labeled button that writes the operation log as a file."
- **Why:** the canvas stays navigable in the mode, so zoom has no reason to leave row 2, and Figma keeps zoom while version history is open. An icon-only export beside Export... is two exports a first-time reader cannot tell apart. Drawn in screens/version-history.html (every state).

## Version history: Restore version comes first, says its cost and what it will not do

- **Document and section:** `message-catalog.md` (a new row); `output-homes.md` 3, Restore version; `principles.md`, "An act that replays runs shows their combined cost first".
- **Old text:** (none: the command's undo name is "Restore version of 2026-05-12"; nothing is said before it runs)
- **New text:** Restore version is the first thing in an old data version's report. Under it, the replay's combined cost in the words Replace data uses ("1 slow result will wait for Re-run"; nothing when every replay takes seconds), then "Adds a new version on top. {current version name} stays in the history." After it runs, a new top entry named "Restored {name}" carries 'current', its report reads like an import's (found by id, back, not in, what replayed and what waits), and the notice reads "Restored {name}: {done} of {total} results replayed" with Undo.
- **Why:** restoring March makes a new data version, so every run replays as under Replace data; without the cost the button reads as instant and free. "Restore" in most tools overwrites; here it appends, and one sentence at the button says so without a confirmation dialog. At the bottom of a report with one methods sentence per run the button would scroll out of view. Drawn in screens/version-history.html (states 2 and 7). The message keys are published, so the wording is the owner's call.

## Version history: a failed restore, and a browser that keeps no versions

- **Document and section:** `state-matrix.md`, the Version history Error and Unsupported rows; `message-catalog.md` (new rows).
- **Old text:** Error: "a restore that failed, with its report | the error's one verb; keep current". Unsupported: "the store is unavailable: restore disabled with the reason | Download project file".
- **New text:** Error: the error row takes Restore version's place at the top of the old version's report: "Restore version failed. The stored copy of {name} could not be read from this browser's storage. Nothing changed: {current name} is still the current version." with Try again (recovery class retry); no entry is added. Unsupported: Restore version shown disabled and focusable, its reason "This browser is not keeping versions for this project (a private window, or site storage turned off), so a restored version could not be kept. Download project file saves a copy with its whole history.", and Download project file beside it; the history stays readable for the session.
- **Why:** the state matrix names both states without their words or their place. Both errors and their verbs come from graphty-element (`content-design.md` 4). Drawn in screens/version-history.html (states 8 and 9). The message keys are published, so the wording is the owner's call.

## Version history: one noun for elements across the chrome

- **Document and section:** `content-design.md` (the element noun); `interface-specification.md`, the Graphs row.
- **Old text:** the Graphs row's count has no noun rule; mocks wrote "3,000 nodes" beside reports that say "accounts".
- **New text:** "A graph row's count uses the element noun the data declares ('3,093 accounts'), as the reports and the methods text do; 'nodes' only when nothing is declared."
- **Why:** one screen said "nodes" in the left panel and "accounts" in the report for the same 3,000 things. Drawn in screens/version-history.html.

## Version history: community names are matched across data versions, and a restore keeps its own

- **Document and section:** `conceptual-model.md` 7.3, Forwarding and matching; `interface-templates.md` 17 (the legend while a version is open); `options-and-encodings.md` 6 (the legend).
- **Old text:** 7.3: "Matching across versions, windows and graphs is one mechanism: elements by id, groups by overlap, splits and joins reported." Nothing says what a restored version's groups are called, or that the legend says how its groups were named.
- **New text:** add to 7.3, after the Replace data rule below: "Restore version brings back the group names and colors the restored version had; it does not renumber them against the version it replaces." Add to the legend: "Under a partition's title, one secondary line says how its groups are named: 'Names and colors kept from {previous version} by overlap; {n} new communities numbered {a} to {b}' for a replayed run, 'Numbered by size, largest first' for the first version, 'Names and colors as {version} had them' after a restore." The replay report's results line counts the same: "{m} keep their {previous version} name and color by overlap; {n} are new, numbered {a} to {b}."
- **Why:** in round 1, participants returning weekly read a renumbered community as a changed community: opening March beside April, a participant took "Community 1, 297" and "Community 1, 359" to be the same group that grew, which is only true if numbers are matched. Matching by overlap makes that reading correct; the legend line makes it visible, so nobody has to assume it. A restore that renumbered against April would break every note and figure made on the restored version. Drawn in screens/version-history.html, states 1, 2 and 7.
- **Element need:** the matching, the names and the counts are graphty-element's partition group identity across runs; graphty-element does not do it today (filed below as a defect). The app only shows the line the element supplies.

## Version history: the list moves to Data > Versions; reading a past version stays a mode

- **Document and section:** `interface-templates.md` 17, Version history (regions, rows, states); `information-architecture.md` 3, the Version history row; `interaction-patterns.md` 3.7, Read-only (the first trigger). Supersedes, in this file: "Version history is a viewing mode: the current version is view-only too", "opens are entries, grouped as Figma groups autosaves", "the selected entry's report expands in place", "header row 2 keeps zoom; Export log moves to the list head", "Read-only hides the canvas tools that create" (its Edit current version clause) and the two-graph filter. Kept as proposed: Restore version first with its cost, the failed restore and the no-storage states, community names matched across versions, and a restored version keeping its own names.
- **Old text:** 17: "replaces the inspector column. Header row 1 keeps Export...; row 2 holds the Version history tab, the zoom menu and Done. Above the entries a list head names whose history this is ... and carries Export log"; entries are data versions, applied recipes, opens and operations, and the selected entry expands in place with its report. 3.7: "Read-only has two triggers: Version history open, whichever version is on screen ... Edit current version is added under it only while an old version is on screen." The Data panel entry: "Versions (data versions newest first; a click on a past version opens the Version history mode on it; 'Version history...' opens the whole list)".
- **New text:**
  - 17: "The version list is the Data panel's Versions section: every data version, newest first, as a row with its name (the source file's until Rename...), when and from what it was loaded, and *current* on the latest. There is no second, fuller list. Applied recipes and style files are listed in their own Data sections; the runs on a version are listed in its report; project opens are not listed. Under the rows, Export the operation log... writes the log (loads, runs, restores and every send) as a file."
  - 17: "A version after the first carries What changed on its row (the wording is in 'Update with new data' below). The row on screen, or the one the reader unfolds, shows every line with Select or List where the element can pick the items, then Show replay report and Compare with...; a folded row keeps one line naming its large changes ('2 large changes: components, communities'), so folding never hides a jump. The first version says 'The first version: nothing to compare with.'"
  - 17 and 3.7: "Reading a past version is a mode. A click or Enter on a past version's row opens it read-only: View only on the chip row, the file chip naming that version's file, the toolbar without Path, every list without '+'. The mode holds the right column: one header row with the mode's tab ('Past version'), the zoom menu and Done; a type row naming the version ('March data, Data version'); then its report -- Restore version with its cost first, the source line, its counts, what ran on it, and one methods sentence per run with Copy. Done, Esc (which moves focus to Done) or a click on the current version's row leaves the mode. The current version is never read-only: opening Data > Versions does not start the mode and does not take the right column. Restore version closes the mode, since the restored data is current."
  - 3.7, first trigger: "a past data version opened from Data > Versions" (replacing "Version history open, whichever version is on screen").
- **Why:** the owner's data-management direction (owner-feedback.md, 2026-09-28): data coming in, its versions, refreshes, joins and exports are one area, the Data panel, not a right-column mode copied from Figma's slot. Round 3 finding 11 (severity 3, 7 sessions) needs What changed where the reader meets the version, and the Data panel already lists versions, so a second list in the right column would be the same objects twice. The study showed working, and this keeps: the view-only mode for a past version, Restore first with its cost, the error and no-storage states, and community numbers matched across versions. Dropped because the new home makes them redundant: the separate list head and graph filter (the Data panel is per project; a second graph's versions are open), opens as entries (not a data concern, and no participant asked for them in round 3), Edit current version (Done and the current row already return; two exits drew no use), and the in-place report expansion in the list (the report now has the right column). Drawn in `screens/version-history.html`, six states.
- **graphty-element (proposed, not decided):** unchanged from "Update with new data": the data versions, their import reports, the count split between two versions and the large-change flag are the element's; the app lays them out.
- **Open:** whether a project with two graphs lists each graph's versions in one Versions section with a graph name on each row, or one section per graph. Not drawn.

## Weekly return: Replace data carries a partition's group names and colors to the replayed run

- **Document and section:** `glossary.md` 9, "Use current, Carry over to new run"; `conceptual-model.md` 7.3, Forwarding and matching; `task-flows.md` 8, the "read the replay" row; `message-catalog.md`, `legend.colorsMatched`.
- **Old text:** glossary 9: "Carry over to new run: ... move a partition's group names and notes to a new run by matching groups" (a verb the analyst issues); 7.3: "Matching across versions, windows and graphs is one mechanism: elements by id, groups by overlap, splits and joins reported."
- **New text:** add to 7.3: "Under Replace data the replayed run of a partition carries over its group names, colors and notes automatically: each new group that is the mutual best match by overlap of an earlier group takes that group's name and palette slot; a group with no mutual match takes the next unused number and a new slot. The replay report counts both ('26 communities keep their March name and color; 39 are new')." `graphty.legend.colorsMatched` reads "names and colors matched to {run}" when names carried too. The message key is published, so that wording is the owner's call.
- **Why:** Louvain numbers its communities by size, so without this every monthly replay renumbers them and the legend's "Community 4" is a different group from last month's, while its color (fixed by `conceptual-model.md` 5.1's palette-slot rule) stays with the old number. In the kit's April data 26 of 65 April communities match a March one; the ring's community is "Community 33" in both months only because of this rule. The comparison, the note and the Watchlist all name it, so a renumbering would break every reference the analyst wrote on Wednesday. Carry over stays as the explicit verb for a re-run the analyst starts. Drawn in storyboards/weekly-return.html, frames 4 and 7; screens/weekly-return.html, states 4 and 7.
- **Element need:** matching and carrying names is graphty-element's (`element-needs.md`, a new row: "partition group identity across runs by overlap").

## Weekly return: the difference list of a partition comparison, and how firmly each group holds

- **Document and section:** `interaction-pattern-entries.md` 4.9, Behavior ("The difference list's rows are content rows"); `task-flows.md` 8.2, the "read" row; `interface-templates.md` 18.
- **Old text:** 4.9 names a difference list and says its rows select their elements; nothing says what its rows and columns are.
- **New text:** "For two runs of a partition the difference list has three tabs: Grew, Shrank and New in {side B}. A row is one matched pair of groups (mutual best overlap), with columns: group, size on A, size on B, change, change %, elements new on B, and **holds in {B}'s re-runs**: the mean best Jaccard match of the group's members across the five seeded re-runs made with side B's run (`graph-conventions.md` 4), 0 to 1. The column reads those runs; opening the comparison runs nothing. The scope line counts the matched pairs. Sorted by change."
- **Why:** AMI and the re-run agreement are statistics of the whole partition, but the analyst's claim is about one group ("the ring's community grew"). In the kit's data the partition agreement is 0.449 between months against 0.759 for a re-run, yet individual groups range from 0.44 to 1.00 in how firmly they hold: the largest growth (+62, Community 1) holds at 0.88, the second (+55) at only 0.59, and the ring's community at 1.00. Without a per-group figure the analyst either trusts every row or none. Drawn in screens/weekly-return.html, state 7.
- **Element need:** `element-needs.md`, "A partition-similarity measure" gains a per-group stability; the re-runs use the catalog's seed handling.

## Weekly return: a fixed set whose members are not in the current data version

- **Document and section:** `glossary.md` 10, the marks table; `state-matrix.md` 7 (collection by count); `interface-specification.md`, the set row.
- **Old text:** (none) -- 7.3 carries fixed sets over by id, and the mark list has no word for members the current data does not hold.
- **New text:** add a mark: "**{present} of {members}**, with the warning glyph: a fixed set some of whose members are not in the current data version. Its tooltip and the set's Members section name the missing ids. No verb: the members are kept, so a later data version that holds them again counts them again. Counts and statistics of the set are over the present members and say so."
- **Why:** in the kit's April data two of the nine Watchlist accounts closed. Removing them silently would lose the analyst's own list; keeping them uncounted would make "9" a lie. Either way the analyst must see it on the row. Whether analysts read the mark as news or as noise is untested: the weekly-return sessions should check it. Drawn in screens/weekly-return.html (the replay report, the follow-up and the note).

## Weekly return: Create set and Add note on the selected group, inside the comparison surface

- **Document and section:** `information-architecture.md` 4.1, "[comparison surface, a mode] Save comparison / Export / Done"; `interaction-pattern-entries.md` 4.9.
- **Old text:** the surface offers Save comparison, Export and Done.
- **New text:** add: "The surface's section for the selected group offers Create set and Add note on that group; both are the ordinary commands on the selection, stay in the surface and are each one undo step. Done remains the only exit."
- **Why:** the reason to open the comparison is to find the group worth keeping; making the analyst leave, reselect the same accounts and then create the set loses the match the surface just made. Both commands already exist on any selection, so this adds no command, only two doors. Drawn in screens/weekly-return.html, state 7.

## Weekly return: Color by on a result's row menu, beside the editor's Appearance

- **Document and section:** `output-homes.md` 3.6, the "Color by, Size by, Width by, Label with" row, Starting places.
- **Old text:** "a result editor's Appearance; a column header's menu on Nodes and Edges; an Attributes row's menu"
- **New text:** "a result editor's Appearance; a result row's context menu; a column header's menu on Nodes and Edges; an Attributes row's menu"
- **Why:** the weekly return's analyst colors by a result just run, from the Results list; the editor route is one open more. The command and its undo entry are unchanged. The storyboard draws the editor route, the framework's today; the study should check whether analysts look for it on the row first.

## Styles list: a heavy tail between 0 and 1 is divided by its smallest nonzero value before the log

- **Document and section:** `options-and-encodings.md` 5, rule 3 and the default-scale table (the "Heavy-tailed, with zeros" column).
- **Old text:** "3. **Heavy tails are compressed**: log when every value is above 0, log(1 + x) when zeros are present, so zeros are painted."
- **New text:** "3. **Heavy tails are compressed**: log when every value is above 0; with zeros present, log(1 + x / c), where c is the smallest value above 0, so zeros are painted and a measure that lives between 0 and 1 is compressed at all. The legend and the encoding popover print c. For counts (c = 1) this is log(1 + x) unchanged." The table's "log(1 + x)" cells read "log(1 + x / c)".
- **Why:** betweenness, closeness, PageRank and clustering coefficient are normalized to [0, 1], where log(1 + x) is a straight line to within a few percent. On the kit's 300-protein network, 289 of 300 proteins fall in the lightest of the ramp's 5 colors on a straight scale, so the default gives them one color and the ramp says nothing; divided by c = 0.000077 first, the same values spread over the whole ramp. Drawn in screens/styles-list.html, frame 1. The verdict and c are graphty-element's (the element need "One scale default on both write paths"); the app only prints them.
- **Risk, and the alternatives to weigh before adopting:** c taken from the data makes every color depend on the single smallest nonzero value. A filter step, a re-run on changed data, or one tiny outlier moves c, and every protein's color moves with it, although no value changed. Three ways to keep the benefit without that: (a) a fixed constant per measure, declared by the element with the measure (for normalized betweenness, 1e-4); (b) c set from a low percentile (the 5th of the nonzero values), which one outlier cannot move; (c) a symmetric-log scale whose constant is set once, at the layer's first paint, and kept with the layer until the analyst resets it. (c) keeps colors stable across filters and re-runs and is the one this entry recommends; the encoding popover shows the kept constant and a Reset.
- **Reader-facing words:** the legend never prints the formula. It says what the scale does ("Log scale; the 10 proteins at 0 are lightest"); the constant appears only in the encoding popover, in a sentence ("Each value is divided by 0.000077, the smallest above 0, before the log"), per `content-design.md`'s rule against developer terms.

## Styles list: the encoding popover opens read only from a run's layer

- **Document and section:** `interface-templates.md` 10, the Encoding row of the editor table.
- **Old text:** "header: the attribute and channel, then Fix at <value> when opened from a layer editor, or the layer it will write when opened by a verb (Size by, Color by); ..."
- **New text:** add: "Opened from a run's automatic layer, which is read only, it opens read only: the header says so in place of Fix at, every field shows its value disabled, and Edit a copy in the layer editor is the one way to change it."
- **Why:** a reader checking what the colors of a run mean needs the scale, the domain on its histogram and the zero count, and a run's layer is the most common layer to be checked. Without this the only route to the scale is to make a copy, which adds a layer just to read one. Drawn in screens/styles-list.html, state 1.

## Styles list: the origin word yields to the trailing slot on hover

- **Document and section:** `visual-language.md` A7, the style-layer row.
- **Old text:** "The eye, Select painted, the channels it writes and the count it paints sit in the hover and focus trailing slot, the last two folding into the row's tooltip when `PANEL_GRID.CONTENT` cannot hold them."
- **New text:** "The eye, Select painted and the count it paints sit in the hover and focus trailing slot, which covers the origin word; the channels it writes and the origin word are in the row's tooltip."
- **Why:** measured on the mock: at 224 px of row, a chip, "Shortest path TP53 to SMAD3" and "made here" leave no room for a count and two icon buttons; keeping the origin word beside the slot cuts the name to four or five characters, the one thing the reader is scanning for. Drawn in screens/styles-list.html, frames 3 and 14.
- **Also:** a layer that paints nothing shows "paints nothing" in the origin word's place, not beside it: "Betweenness color run, paints nothing" cut the name to eleven characters. The origin moves to the tooltip, as on hover. Drawn in screens/styles-list.html, frames 9 and 10.

## Styles list: the default measurement ramp needs a form for the dark canvas

- **Document and section:** `canvas-drawing.md` 4 (every palette is checked against both canvases); `element-needs.md`, the palette-defects row.
- **Old text:** (none: the check is required, and the shipped measurement ramp is described as "trimmed for a light background")
- **New text:** add to the palette-defects row: "The measurement ramp (YlOrBr, five steps) ends dark brown, which is its least visible step on the dark canvas. On the dark canvas the element draws a ramp whose high end is light (the same hues, lightness reversed, or a ramp measured for it), and the legend draws the one in use."
- **Why, measured** (WCAG contrast of the element's five YlOrBr steps against the canvas; kit/fixtures.json, `ppi.encodings.betweenness.contrast`): on the dark canvas (#1E1E1E) the steps read 5.85, 4.28, 3.03, 2.06 and 1.45 to 1, so the two highest steps, the highest betweenness, fall under the 3:1 floor for non-text marks. On the light canvas (#F5F5F5) they read 2.61, 3.58, 5.04, 7.43 and 10.51, so only the lowest step falls under it. Both canvases therefore draw every node with the fill edge (5.92:1 dark, 4.17:1 light, as the kit draws it for these ramps), which is why MAPK1, TP53 and CDK1 are still visible in screens/styles-list.html frame 14. The asymmetry is the finding: on the light canvas the edge carries the least important values; on the dark canvas it carries the proteins the layer exists to point out, whose fill is at 1.45:1. The palette is graphty-element's, so the fix is there.

## Where the style stack lives: the material, one added task, and no route either arm lacks

- **Status:** replaces this entry's earlier text, which proposed rewording "turn off every run layer" to "with this node still selected, turn off every layer a run added". That rewording is withdrawn: it was chosen after drawing both arms, because it is where they differ most, which selects a task for the answer it favors; its added clause tells the participant which constraint matters; and it reuses the interface's own words ("layer", "run"), so it tests matching words against labels.
- **Document and section:** `research/study-schedule.md`, the "Where the style stack lives" row, Material and tasks.
- **Old text:** "tasks: "12 hubs are selected in the table; move the community colors under the degree sizes", "switch off the layer painting this node", "which layer makes the hubs red", "turn off every run layer", "after eight runs, move your own community-color layer above the degree layer""
- **New text:** keep all five tasks as written, and add a sixth, set up by the scenario rather than instructed: the participant starts with TP53 selected and reading its values, and is asked "Show the network the way it looked before you ran any analyses." Add: "Both arms use identical material: study/style-stack-arm-a.html and study/style-stack-arm-b.html (grayscale, 1366 by 768, 5 sets, 3 paths, 19 layers after eight runs, TP53 selected, then nothing selected, then the list expanded). Arm (b) has no Styles section and no other list of layers while something is selected; its only route to one layer is the Appearance row's layer name. The prototype adds no route either arm would not ship."
- **Why this task, by frequency, not by where the arms differ:** the workflows run several analyses in one sitting and read the network with and without them. W23 ("Compute several rankings": degree, betweenness, closeness, eigenvector, clustering in its first three minutes) and W03 (its Explore phase: "multiple centrality measures, community structures") each leave a run layer per analysis; the genomics persona "ranks hub genes by several centralities at once"; W20 describes the expression colors as "a weather overlay" on a map the analyst also reads bare. Returning to the network as it was before those runs, while still reading one protein, is the step those workflows imply after each run. **The evidence is indirect**: no workflow or persona names the step in so many words, so the task is added, and none is removed, and the adoption rule's task set is not narrowed toward either arm.
- **Why the material changed:** the design-review page (screens/styles-list.html) argues for the build default in its notes, and material shown to participants must not embody the preferred answer (Rubin and Chisnell). The review page keeps its two laptop frames (12 and 13) for the design team; participants see only the neutral pages, which carry no notes and name the arms "prototype A" and "prototype B". At 4 layers neither arm's cost of room appears, so the material uses the schedule's 19. Sessions with fewer than 50 per arm are a pilot and report direction only.
- **An open question for the study's owner:** the task "which layer makes the hubs red" depends on color, and the schedule asks for grayscale material. The material draws the hubs in vermillion through a "Hub color" layer, which reads as a darker gray. Either the task is reworded to a property visible in grayscale, or the material is in color.

## Notes panel: what a note's row shows

- **Document and section:** `interface-templates.md` 4, Regions and rows; `visual-language.md` A7 (one leading mark) is kept, not amended.
- **Old text:** "a `Tree` row per note, newest first."
- **New text:** "a `Tree` row per note, newest first. **One leading mark**: the glyph of the kind of what the note is about (a style layer's chit in its place), as every other list row has. **Line 1**: 'About {targets}', the same words as the Note editor's About line (message `graphty.note.about`), wrapping to at most two lines, with the time at its end: short and relative under a week ('2h', '1d'), then the date ('Sep 24'). The author's name follows the time only while the project holds notes by more than one author. **Then** the note's text, clamped to three lines. **Then**, when the note cites a run, one line 'Cites {run}, {scope}'. When a note is about a run and cites that same run, the row folds the two into its About line, which keeps the scope ('About Betweenness, full graph'), and shows no Cites line. Quoted values are not on the row; they are in the note when it opens. **Marks**: a state from `glossary.md` 10 (Earlier run, Earlier data, Detached) or the mark 'filtered out, {step}' sits on its own line directly under the line it qualifies -- a citation's under the Cites line, a target's under the About line -- with its one verb; when a row has several, only the most urgent shows. **Hover and keyboard focus** show the row's overflow in the trailing slot, over the time. The row is a `Tree` row with a multi-line body, which compact-mantine's `Tree` does not have: a variant to add to compact-mantine before this panel is built."
- **Why:** a panel that lists every note in the project is useful only if a row answers 'about what, on the strength of what' without opening it -- task flow 7's trust check -- and the conceptual model makes targets and citations the two things a note carries. Both lines lead with a word ('About', 'Cites'), so a reader tells target from evidence without learning glyphs, and the About line is character for character the Note editor's. The leading slot keeps the kind glyph, so A7 holds: Figma's comments list leads with an avatar because every comment there is by a person among many, while a graphty project's notes are mostly one analyst's; the author is shown once there are several (the schedule's task 14 reads "everything the team has written"). Three lines instead of two keep a quoted number in view in typical notes (the TP53 note's "0.114, after MAPK1" was cut at two); the cost is about one row fewer on screen, and a longer note is still cut after about 105 characters, one click from the full text. Measured in screens/notes-panel.html at 1440 by 900 rows are 66 to 114 px tall, so 7 to 9 notes fit; at 1366 by 768, 6 to 8. A mark under the line it qualifies is how a re-run or a deleted target shows on the list rather than only in the opened note; the same rule places "filtered out". Shown in screens/notes-panel.html, states 2, 7 and 8. Not yet tested with users, and no state yet shows 40 or more notes.

## Notes panel: the target filter's choices (withdrawn)

- **Document and section:** `interface-templates.md` 4, Regions and rows ("with a target filter").
- **Old text:** "`SearchInput` (Find over notes, with a target filter)"
- **New text:** "`SearchInput` (Find over notes: a note's text, the names of what it is about and the runs it cites)". An earlier version of this file proposed a `Menu` of target kinds; it is withdrawn.
- **Why:** a kind filter is a second control over a list that holds a few dozen notes, and typing a run's, a set's or a protein's name already narrows by what notes are about ("Betweenness" finds the note about the run and the note citing it). Its only support was one persona sentence. Sitting 40 px from the filter chip, a second funnel-like control also reads as "filter these notes" when the chip scopes the graph. Revisit only if a study session shows readers failing to find notes by kind at 50 or more notes. Shown in screens/notes-panel.html, state 5.

## Notes panel: Find appears with the first note

- **Document and section:** `state-matrix.md` 7 (a new row, Notes); `content-design.md` 4, Empty surface, is kept.
- **Old text:** (no row for notes; the matrix's rule "Organization never changes with count" applies)
- **New text:** "| Notes (the Notes panel) | with no notes the panel is its header only: no Find, no rows, no sentence; Find appears with the first note | A | proposed | `Count/Notes/Zero`, `Count/Notes/Forty` |"
- **Why:** content-design.md 4 allows an empty surface its title and at most one command; a search field over nothing is a live-looking control with nothing to act on, and Figma shows no search over an empty comments list. Find is not organization, so the rule "organization never changes with count" still holds. A search with no hits is different: the field stays, holding the query, and the list under it is blank with no sentence. Shown in screens/notes-panel.html, states 1 and 6.

## Notes panel: the filter chip does not hide notes

- **Document and section:** `interface-templates.md` 4, Regions and rows; `glossary.md` 10, the Marks table, the row "filtered out".
- **Old text:** glossary: "| **filtered out** | a Find hit a filter step leaves out, naming the step |"; the template is silent on the chip.
- **New text:** template, add: "The filter chip in the header scopes the graph, not the list: every note is listed whatever the filter. A note whose element targets the filter leaves out entirely carries 'filtered out, {step}' and reads in secondary ink; a click still opens it, and its marker is not drawn. A note about a definition (a run, a filter step, a style layer, the graph) is never filtered out, and a set partly left out carries no mark." Glossary: "| **filtered out** | a Find hit, or a note's element targets, that a filter step leaves out, naming the step |".
- **Why:** the crosswalk says the chip governs what is drawn, listed, computed and read, while the panel lists every note in the project, and nothing said which wins. Hiding notes behind a filter step would make evidence vanish silently while the analyst narrows the graph, which is exactly when she is reading her notes. Shown in screens/notes-panel.html, state 8 (the graph filtered to TP53 and its neighbors; the CDK1 note marked).

## Notes panel: a row's overflow holds Edit note and Delete note

- **Document and section:** `output-homes.md` 3.7, the Edit note and Delete note rows proposed above ("Take a note: correcting and deleting a note are undo steps").
- **Old text:** Edit note: "the Note editor (a click in a posted note's text)"; Delete note: "the Note editor's overflow; a Notes row's context menu".
- **New text:** Edit note: "the Note editor (a click in a posted note's text); a Notes row's overflow, which opens the note in the Note editor with its text focused"; Delete note: "the Note editor's overflow; a Notes row's overflow and context menu; Delete on a focused Notes row". Under View only neither appears: the overflow leaves the row.
- **Why:** Figma's comment row offers its verbs on hover; without them the panel is a list the analyst cannot correct from, and a developer has nothing to build the trailing slot from. Shown in screens/notes-panel.html, states 2 and 4.

## The inspector's Notes section is always there, with its "+"

- **Document and section:** `interface-specification.md` 3, the Notes row; 4.1a, the resting counts; `output-homes.md` 2, the row "the graph's own notes".
- **Old text:** interface-specification.md 3: "`Tree` rows; absent when no note targets the object, which is reached by the Note tool or Add note (`principles.md` 5)" (and the proposed wording above in "Take a note: a note is written in the Note editor", "... absent when no note targets the object"). 4.1a: "Notes is absent until a note targets the node" and "a Notes section adds its rows once the graph has notes". output-homes.md 2: "the Notes section of the graph's inspector, present once one exists".
- **New text:** interface-specification.md 3: "`Tree` rows, time and text clamped to two lines, under a header with '+', which opens the Note editor beside the object. With no note the section is its header and '+' only, as `state-matrix.md` 4.9 draws every empty collection. A row click opens the note in the Note editor." 4.1a: the one-node count adds the Notes header's '+' (1): total 22 against 24; the nothing-selected count adds it too: 8 outside Statistics. output-homes.md 2: "the Notes section of the graph's inspector".
- **Why:** the framework contradicts itself: `state-matrix.md` 4.9 gives every empty collection its header and '+', as Figma's Export and Effects sections rest, while the specification hides Notes until a note exists. Hidden, the first note on an object is made from one place (the Note tool or the overflow) and the second from another (the section's '+'), and the crosswalk's own reason for the section -- taking a note is an every-session task -- argues for a home that is always there. The cost is one target per inspector, inside the 24 budget. Shown in screens/notes-panel.html, state 1 (nothing selected) and state 3 (a set).

## Where a set's note marker sits

- **Document and section:** `canvas-drawing.md` 6, the callout row ("at targets"); 12, Hulls, collapsed sets and notes.
- **Old text:** 6: "| -- | callout, note ink | at targets | at targets | a note | 2 | -- |"; 12: "A note is a callout in note ink, never a data color."
- **New text:** 12, append: "A note's callout is drawn once per target that has a place on the canvas: at a node or an edge's midpoint; for a set, group or path, at its anchor member, the member with the most edges to other members (ties by name), because a hull can span most of the canvas and has no point of its own. Callouts at one anchor merge into one with their count. Hovering a note's row or its callout draws the linked hover (ring 5) on every target, a set's members included, and fills the callout in note ink. A marked node keeps its label (section 9). A note about a definition or the graph has no callout."
- **Why:** "at targets" does not say where one callout for 33 targets goes. The TP53 neighborhood's members spread over about 40% of the protein drawing, so a hull or a centroid lands on unrelated proteins; one callout per member would bury the canvas. The member with the most edges inside the set is found from the set alone, never from its name: for an ego neighborhood it is the ego (TP53, joined to all 32), for a community its internal hub. The linked hover then shows the whole set when the reader asks. Shown in screens/notes-panel.html, states 2 and 3 (callouts at TP53 and CDK1). Needs graphty-element: callouts are drawn by the element (`element-needs.md`, the notes row).

## Study schedule: can a first-time reader take a note from an empty Notes panel

- **Document and section:** `research/study-schedule.md`, Tree-test tasks (a new row after 12).
- **Old text:** (no task starts from a project with no notes)
- **New text:** "| 12a | 5, first-run | nothing; the project has no notes; the Notes panel open | You want to remember why TP53 matters for next week's meeting. Record that in graphty. | 3: Add note | toolbar > Note; RP > nothing selected > Notes > + (then the About line names the graph: a correct route only if the reader then targets TP53); main menu > Selection > Add note | RP > one node selected > Notes > + | Notes (the empty panel itself) |". Record first click and time on the empty panel as a finding, separately from what participants say.
- **Why:** the empty Notes panel follows the framework (no sentence, no command), and nothing on it says how a note is made. That is a design opinion until measured. Simulated participants tend to know about the Note tool, so the owner, or a real first-time user, should also try this cold. If readers stall on the panel, the one command the empty-surface rule allows becomes a button that arms the Note tool. Shown in screens/notes-panel.html, state 1.

## Export dialog: a figure is written on a white ground with its legend beside the drawing

- **Document and section:** `interface-specification.md` 3 (the Export section's setting row); `canvas-drawing.md` 13 (exported figures).
- **Old text:** none. The setting row names format and scale; where the legend sits in the file and what ground the file has are not said. An earlier mock showed "Transparent background; legend drawn in", with the legend over the top-left of the drawing.
- **New text:** "A figure's setting row adds Background (White, the default; Canvas; Transparent), Legend (Beside, right, the default; Beside, below; Over the drawing; Off, which also leaves a caption line) and Selection (As on screen; Not drawn). With the legend beside, the file is wider than the drawing by the legend's column, and the dialog states the file's pixel size before it is written."
- **Why:** a legend over the drawing covers nodes (on the protein network it sits on the Complex I cluster's labels), and a transparent PNG pasted into a dark slide or a journal template loses its gray edges. Journal figures are almost always placed on white. A legend beside the drawing never hides data and survives cropping of the drawing. Drawn in screens/export-dialog.html, state 1. The setting names are chrome; the figure's layout is drawn by graphty-element, so the element's export options need these three settings (a companion row for `element-needs.md`, "Exported figures").

## Export dialog: the scripting entry is shown disabled (withdrawn)

- **Document and section:** none now; this proposal is withdrawn.
- **Old text:** "Until graphty-element publishes its export calls, Use in a script... is shown disabled in the footer's left slot with a Not yet available badge."
- **New text:** (withdrawn) the footer's left slot says where the files go ("3 files go to your Downloads folder. Nothing is uploaded."), as proposed under "Alert triage: the Export dialog's footer says where files go"; scripting is the entry "Where a scripting path starts (not in the Export dialog)".
- **Why:** a disabled button for a feature that does not exist is still a promise, and still a stop for every keyboard user. Drawn in screens/export-dialog.html, all states.

## Export dialog: wide enough to read the figure preview

- **Document and section:** `interface-templates.md` 20 (Export...).
- **Old text:** none (earlier mocks used the 720-wide modal).
- **New text:** "The Export dialog is 1200 wide (the viewport minus 32 on each side below that), 320 for the list of kinds and the rest for the preview, so a figure is previewed at about the size a reader sees it in a two-column paper and its legend text is legible."
- **Why:** the trust check of task flow 9 ("legend and scope drawn in") only works if the analyst can read the legend in the preview; at 720 wide the preview is 250 px and the legend text is 7 px. Drawn in screens/export-dialog.html.

## The table's scope line has a wording for the full graph

- **Document and section:** `message-catalog.md`, row `table.scope`; `information-architecture.md` 8.1, "The table's scope".
- **Old text:** `Filtered graph; Selected: {N}; Members of {object}; Selected: none, showing the previous selection`
- **New text:** `Full graph: {N} {kind}` while no filter step is on; `Filtered graph: {kept} of {total} {kind}` while one is; the other scopes unchanged.
- **Why:** with no step on, the filter chip reads "Full graph"; a table that says "Filtered graph" at the same moment makes the reader look for a filter that is not there. The two places that state the scope should use the same words. Drawn in screens/table-dock.html, state 1.

## The table's scope line counts the selected rows

- **Document and section:** `message-catalog.md`, row `table.scope`; `interface-templates.md` 16, the scope line.
- **Old text:** (none: the scope line names the scope only)
- **New text:** "While the selection holds elements of the tab's kind and the scope is not Selected, the scope line adds their count: 'Full graph: 3,000 nodes, 14 selected.'"
- **Why:** in a virtualized table most selected rows are off screen; with 14 flagged accounts selected among 3,000, nothing in the visible rows says whether the selection is 14 or 140. The inspector's title carries the count, but it sits across the canvas from the table. Drawn in screens/table-dock.html, state 2.

## A virtualized table states its full row count to assistive technology

- **Document and section:** `interaction-pattern-entries.md` 9.1, Focus regions; `interface-templates.md` 16, Tab order.
- **Old text:** "the grid (one stop, a WAI-ARIA grid)"
- **New text:** "the grid (one stop, a WAI-ARIA grid). Because the grid is virtualized, it sets `aria-rowcount` to the scope's full count plus the header row and each built row its `aria-rowindex`, so a screen reader says 'row 1 of 3,000' rather than the count of rows in the page."
- **Why:** the table is the canvas's text equivalent (`information-architecture.md` 8.1). A virtualized grid without these attributes tells a screen-reader user the graph has as many rows as happen to be built (about a dozen), which is the one number they cannot check another way. It is a `DataTable` requirement (compact-mantine), not app code. Drawn in screens/table-dock.html, state 2.

## The empty table says what is left and opens the steps list; the scope line's command is in the tab order

- **Document and section:** `state-matrix.md` 3, the Bottom dock Table Blank row; `message-catalog.md`, row `table.scope`; `interface-templates.md` 16, Tab order.
- **Old text:** state matrix: "the scope resolves to nothing: headers and the scope that emptied it | Turn off step"; tab order: "slider strip; tabs; the grid".
- **New text:** state matrix: "the scope resolves to nothing: headers with the whole graph's profiles, and the scope line as an empty surface, its title the count ('Filtered graph: 0 of {total} {kind}') and its one command Show filter steps, which opens the filter chip's popover | Show filter steps". Tab order: "slider strip; tabs; the scope line's command when it has one (Show filtered graph, Show filter steps); the grid". This replaces an earlier version of this entry that named the step that emptied the table ("emptied by {step}") with Turn off step.
- **Why:** naming one step only works when one step empties the table on its own. In the common hard case every step keeps something and only their combination keeps nothing: Les Miserables with Largest component (76), degree >= 5 (41), Filter out group 8 (28) and then Filter to group 8, which alone keeps 13 but after step 3 keeps 0. "The first step after which nothing remains" would name step 4, yet turning off step 3 is just as valid a fix, so any single name misleads. The steps popover already shows the count after each step (the "Filter chip and its steps" proposal), so it answers the question without the table choosing a culprit, and the line stays an empty surface -- a title and one command, no sentence (`content-design.md` 4). The template's tab order had no stop for the scope line's command, so a keyboard user could not reach Show filtered graph or Show filter steps from the dock. Drawn in screens/table-dock.html, "Empty after a filter step" and "Selected scope".

## The table's column header: one form, two row pitches tall (a DataTable header variant)

- **Document and section:** `interface-templates.md` 16, Regions and rows ("Column headers carry the profile and completeness ..."); `information-architecture.md` 8.1 ("An attribute's distribution sits in its column header"); `implementation-mapping.md` 10.1 (a new `DataTable` row).
- **Old text:** "Column headers carry the profile and completeness (over the whole graph, `data.attributes()`), and an encoding strip when a layer reads the column, drawn with `RampRow`'s mini form"; implementation mapping: no header variant.
- **New text:** "Every column header has one form, 64 px (two row pitches) where compact-mantine's DataTable header is 32: line 1, the channel glyph when a layer reads the column (stacked chits for a color layer, the graduated glyph for size and width, the highlight glyph for a membership column), the name, and DataTable's 5 x 3 sort caret when sorted; line 2, the profile, one grammar per column kind -- numbers 'min to max', categories '{n} values', booleans '{n} true', a membership column '{n} members', and completeness ('71 of 77') only when values are missing; line 3, the distribution -- a mini histogram (`HistogramRow`'s mini form: 12 bins, a log scale when the maximum is over 20 times the median, the outlier band as a bracket over the bars past Tukey's upper fence) for a number, a count strip with segments sized by count for a category, colored by the layer that reads it with Other in `#505050`, in two alternating grays otherwise; line 4, the channel's scale when a size or width layer reads the column (3 to 5 graduated circles). An identifier column has no distribution. While a load streams, line 2 reads 'counting' and sorting is off. The histogram is absent, not replaced, for any column that is not a result's field until the element publishes bins (`element-needs.md`, the histogram-bins row)." Implementation mapping 10.1, new row: "`DataTable` | a header variant 64 tall holding a glyph slot, a profile line, `HistogramRow`'s and `RampRow`'s mini forms, and a hover-revealed menu button | the table (`interface-templates.md` 16) | 2".
- **Why:** the mock's first headers used five profile grammars ('mean 6.08, max 907', 'max 0.046', '0 to 98', '3 values', '14 true'), printed '77 of 77' on every column of a complete graph and drew a gray ramp under a column that sets size, so a reader could not learn the header and could not tell which channel read which column. One grammar per kind, completeness only when it carries news, and the channel's own glyph fix all three. 32 px holds only the name; the distribution is the attribute's home (`output-homes.md` 2, "header with histogram and completeness") and the outlier band is where anomalies are found (`information-architecture.md` 3), so the header needs the room, and two pitches keep the table on its grid. Drawn in screens/table-dock.html, every state.

## What each part of a column header does, in Figma's terms

- **Document and section:** `interface-templates.md` 16 (Regions and rows; Tab order); `interaction-pattern-entries.md` 9.1.
- **Old text:** (none: the template hangs the sort, the column header menu and the histogram popover on the header without saying which gesture reaches which)
- **New text:** "A click on a header's label sorts: descending first for a number, then ascending, then back to the default order (the column a visible layer reads, else the label); the sort shows as DataTable's 5 x 3 caret after the label, never a chevron. A chevron button appears on the side away from the label while the pointer is on the header (Figma's hover-reveal of row controls); it, a right-click anywhere on the header, or Shift+F10 on a focused header opens the column header menu. A click on the distribution opens the histogram popover (section 12). The menu on a number column: Sort descending, Sort ascending, Filter to..., Compare with..., Color by, Size by (Width by on the Edges tab), New column (submenu), Join... -- eight, the cap of `interface-specification.md` 4.1a; on a category column Partition by takes Compare with...'s place. An encoding the column already drives carries a check."
- **Why:** in Figma a chevron after a label means "opens a menu", so a chevron used as the sort mark misreads; and with three things hung on one header a builder could not tell whether a click sorts, opens the menu or opens the histogram. Drawn in screens/table-dock.html, "The column header: what each part does".

## Export table... and the dock's tab row

- **Document and section:** `interface-templates.md` 16, the tab header ("Export table").
- **Old text:** "The tab header (Mantine `Tabs`, pills: Nodes, Edges, one item tab; a type facet when a type role is declared; Export table)"
- **New text:** "... Export table..., which opens the Export dialog (section 20) with only its Tables row checked, set to the current tab and the table's scope; and Find in table, an icon button. The tab row has no overflow menu."
- **Why:** an earlier mock drew an ellipsis beside Export table... with nothing defined to go in it, and an Export table... with no stated relation to the header's Export.... Figma's paved path has one export dialog for every kind (the "Export: what the dialog opens with" entry above). Drawn in screens/table-dock.html.

## A stale computed column: the header's words

- **Document and section:** `state-matrix.md` 3, the Bottom dock Table Not current row.
- **Old text:** "a computed column's header marked | the glossary's verb"
- **New text:** "a computed column's header: the profile line reads 'Out of date' with a warning mark and ends in Re-run (glossary 9); the column's cells stay, in tertiary ink, and its profile and histogram stay those of the run that wrote them, until Re-run lands | Re-run"
- **Why:** the row named the treatment but not its words or what happens to the values; a filter step that changes what a whole-graph result describes (Les Miserables: betweenness run on 77 characters, read on 28) is the case every analyst meets. Drawn in screens/table-dock.html, "Not current".

## The dock's rows sit on Figma's list pitch (crosswalk wording)

- **Document and section:** `figma-crosswalk.md` 4.1, row "The Variables table sits on Figma's row pitch".
- **Old text:** "the dock's rows sit on `PANEL_GRID.DATA_PITCH`, denser"
- **New text:** "the dock's rows sit on Figma's 32 px list pitch (`PANEL_GRID.DATA_PITCH`), not the Variables table's 40, because its cells are read, not edited"
- **Why:** "denser" dates from when `DATA_PITCH` was 28. On the compact-mantine branch of PR #409 it is 32 (`src/constants/panel.ts`, `DATA_PITCH: 32`), Figma's list pitch, which `visual-language.md` A5 already requires everywhere, the data table included, and which `figma-spec.md` 10.6 gives DataTable's rows.

## Inspector: a mixed selection's Attributes section is one row per kind

- **Document and section:** `interface-specification.md` 4.1, the Several elements row and its note ("Attributes shows shared values and one 'N differ' row").
- **Old text:** "**Several elements**: ... Attributes shows shared values and one "N differ" row opening the table on the selection with the differing columns first."
- **New text:** add: "When the selection holds nodes and edges, which share no attribute, Attributes is one `ActionRow` per kind ('Nodes: 6 attributes', 'Edges: 1 attribute'), each opening the table's tab for that kind on the selection. Shared values and 'N differ' apply within one kind."
- **Why:** nodes and edges have different columns, so "shared values" is always empty on a mixed selection and "N differ" has nothing to count; an empty section or a section that disappears both hide where the values are. Drawn in screens/inspector.html, states 5 and 9 (two proteins and their edge; 1,863 accounts and 5,632 transfers).

## Inspector: Memberships on several elements counts how much of the selection each set holds

- **Document and section:** `interface-specification.md` 3 (the Memberships row) and 4.1 (Several elements, Memberships B).
- **Old text:** Memberships: "one `ActionRow` with its count at rest, expanding in place to `DataRow`s or `CompoundRow`s" (no form stated for several elements).
- **New text:** add: "On several elements, one `DataRow` per kept set holding any of them, its value 'holds N of M {kind}', M the number of selected elements of the kind the set holds ('holds 13 of 1,863 nodes', never of the 7,495 nodes and edges), capped as at rest."
- **Why:** "which of my sets does this selection touch, and how much of it" comes up in more than one task. A fraud investigator who grabs a merchant's two-hop neighborhood sees that 13 of the 14 mule-ring accounts are inside it; a biologist who selects the hits of an experiment sees how many sit in her DNA repair set, the overlap she otherwise counts in a spreadsheet. Counting against the whole selection, edges included, made a set look irrelevant ('13 of 7,495'), so M is the kind the set holds. Two personas' tasks, both drawn only in mocks so far: the study must hear the question from a second persona before this is adopted. Drawn in screens/inspector.html, states 4, 5 and 9.

## Inspector: a found path's inset edge row when the path has no weight and its edges no label

- **Document and section:** `interface-specification.md` 3, "Path hops".
- **Old text:** "an inset edge `DataRow` carrying the edge's label, or the attribute the path was weighted on"
- **New text:** "an inset edge `DataRow` carrying the attribute the path was weighted on; on an unweighted path, the edge's label attribute; with neither, the edge's first attribute in file order (confidence, on the protein network), or nothing when edges have no attributes."
  When the inset row shows anything other than the weight, it is drawn in tertiary ink and the section closes with one `ProseBlock` line: "The path counts hops; edge {attribute} is shown, not used."
- **Why:** the usual shortest path counts hops and the usual interaction file has no edge label, so the rule as written leaves the inset row blank in the common case. A value shown on every hop of a route reads as the thing that chose the route, so a value that did not choose it is marked as information only. Drawn in screens/inspector.html, states 7 and 8 (TP53, MSH2, UBB, SMAD3 with confidences 0.82, 0.53, 0.82).

## Inspector: an unweighted path's line 2 says only its hops

- **Document and section:** `interface-specification.md` 4.2, the Path, offered row.
- **Old text:** Line 2: `"N hops, distance D"; the sibling stepper`
- **New text:** Line 2: `"N hops", and ", distance D (weight attribute)" only on a weighted path; the sibling stepper`
- **Why:** on an unweighted path the distance is the hop count, so "3 hops, distance 3" says one thing twice, and at 240 px the line also holds the stepper ("1 of 12") and three verbs; the long form truncates to "3 hop...". The kept Path row already scopes distance to weighted paths. Drawn in screens/inspector.html, state 7.

## Select neighbors: the split button's menu lists hops with their counts

- **Replaced by:** "Select neighbors: one menu, replacing the two earlier forms" (the Find, inspect, expand, next seed entries). Kept here for its evidence.

- **Document and section:** `interaction-pattern-entries.md` 4.6, Feedback; `interface-specification.md` 4.2, One node (the split's variants: hops, direction, edge type, Filter to neighbors).
- **Old text:** "The exact count is on the command before it acts: the split button's hop field and the menu item show it on hover and on focus"
- **New text:** "The split button's menu lists 1, 2 and 3 hops as checkable rows that keep the menu open, each with the size the selection would have, the seed included ('33 nodes'), then direction and edge type where the graph has them, then Select neighbors and Filter to neighbors, each with its size in the same form. The main part's tooltip carries the one-hop size and the shortcut ('Select neighbors, 1 hop: 33 nodes', Shift N). A hop count past 3 is typed in a hop field at the foot of the menu."
- **Why:** a list of sizes shows how fast a neighborhood grows before any choice (on the protein network 33, 169, then 296 of 300 nodes), which is the "how big is this before I commit?" question of the Expand journey step; one hop field shows one number at a time. Totals, not additions: 'the count for every hop from 1 to the chosen one' in the find-and-expand entry above is the same form, and a total can be checked against the graph's size where a run of '+' numbers cannot. Drawn in screens/inspector.html, states 1 and 2, and screens/find-and-expand.html.

## Inspector: a Members cap

- **Document and section:** `interface-specification.md` 4.1a, the caps table.
- **Old text:** (no row: `information-architecture.md`'s Members list says "its cap (4.1a), then 'N more'", and 4.1a names none)
- **New text:** add a row: "Members rows before 'N more' | 3 when each row carries a rank line, else 4 | proposed; the first-click test of the set inspector at a short window revises it"
- **Why:** a ranked member row is two lines (the value, then "#16 to #23 of 300"), so four of them plus Statistics and Appearance push Used by and Export below 900 px on a rule set. Drawn in screens/inspector.html, state 6.

## Find and Quick actions: Find keeps Figma's two rows, and the header says what was searched

- **Document and section:** `interface-templates.md` 2a, Find: Departures, Regions and rows, Tab order.
- **Old text:** "**Departures:** none: what Find looks for and how it groups is `information-architecture.md` 7's." and "while open, in place of the lists: the search bar row (`SearchInput`; a scope `StyleSelect`, this graph or all graphs; Find's `Menu` with Create rule set); the hits as `ResultRow`s ..." and "**Tab order:** field; scope; menu; the list (arrows move the highlight while focus stays in the field)."
- **New text:** Regions: "while open, in place of the lists, Figma's two rows. The search bar row (48 tall): `SearchInput`, taking the width Figma's field takes; Find's `Menu` (Create rule set) in Figma's filter-settings slot; Close (`ActionIcon`, Esc). Under it, once something is typed, the result header (40 tall): the count and what it counted, '{N} results in all {M} nodes' (proposed key `graphty.find.count`; with All graphs, 'in {G} graphs'), then the scope `StyleSelect`, then Previous result and Next result (`ActionIcon`s), which are the Next finding and Previous finding commands of `interaction-patterns.md` 3.1. Then the hits." Departures: "one: the scope `StyleSelect` is left out while the project holds one graph, because it offers no choice and the header needs its width to say the search ignored the filter." Tab order: "field; menu; Close; the list (arrows move the highlight while focus stays in the field); scope; Previous; Next."
- **Why:** Figma's Find panel is two rows (`figma/left-sidebar/README.md` 5: search bar row with field, settings button and Close; result header with "13 results . This page", then Previous and Next). The one-row form dropped the count, Previous and Next and Close, left Esc as the only way out with nothing saying so, and squeezed the field to about 100 px, too narrow for the pasted id lists `information-architecture.md` 7 says Find takes. The template's "Departures: none" contradicted its own Figma source. The count's "in all {M} nodes" replaces a footer line ("Searching the full graph: {N} nodes") that sat in the chrome where Figma has none, wrapped, and used "graph" in a second sense next to a scope control reading "This graph". Two-way door for the layout; the count's key is published, so its wording is the owner's call. Drawn in screens/find.html, states 1 to 7.
- **To test:** whether "in all 77 nodes" tells a filtered analyst that Find looked past the filter (study/hypotheses/find.md, H1).

## Find and Quick actions: a node hit's second line names at most two values

- **Document and section:** `interface-templates.md` 2a, Find, "Regions and rows".
- **Old text:** "the hits as `ResultRow`s under one group header per kind, in `information-architecture.md` 7's order;"
- **New text:** "the hits as `ResultRow`s under one group header per kind (the header counts them, and for nodes and edges how many are filtered out), in `information-architecture.md` 7's order. A node or edge hit's second line (the row's `path`) holds at most two values, read from graphty-element: when the match was on an attribute value, that attribute and value; otherwise the partition attribute (the category attribute the color layer reads, else the first category attribute) and then the attribute the size layer reads ('group 4 . degree 11', live readings on the filtered graph). With the scope All graphs, the graph's name comes first and one value follows. A hit a filter step leaves out shows 'Filtered out by "{step}"' instead, and a hit held by a kept set shows the set's name instead (the entry "Alert triage: a Find hit names the kept sets that hold it"), in that order of precedence."
- **Why:** Figma's second line names where the result lives, its parent frame. A node has no parent frame, and inside one graph "where it lives" is the same for every hit, so the line would carry nothing; the graph's name is the direct analogue only when the scope is All graphs. Labels are not keys: nothing stops two nodes from sharing one, so the row needs a disambiguator, and the values the canvas already encodes are the ones the analyst can match against what they see. The cap is two because a 241 px row at 10 px holds about 36 characters: a project with four or five painting layers would otherwise overflow. Two-way door. Drawn in screens/find.html, states 2, 3 and 7.

## Find and Quick actions: style-layer hits are listed as rows in Find

- **Document and section:** `interface-templates.md` 2a, Regions and rows ("style-layer hits narrow the Styles list in place instead of listing rows here"); `information-architecture.md` 7, the Find column, "Ends as" ("style-layer hits narrow the Styles list in place, in stack order") and the Styles row in the collections table ("its hits narrow the list without reordering it, as Figma's Find takes over its Layers list").
- **Old text:** as quoted.
- **New text:** 2a: "style-layer hits are a Style layers group of `ResultRow`s in stack order, the second line giving the layer's place in the stack and what it paints ('Styles, 2nd of 3 . color by group')". IA 7, Ends as: "committing a style-layer hit closes Find and selects the layer in the Styles list, in place; it opens nothing." Collections table: "Find lists layers by name as rows, as Figma's Find lists every kind."
- **Why:** the same template says Find replaces the lists while open, so while it is open the Styles list cannot be seen, and a hit that "narrows the Styles list in place" has nowhere to show. Figma's Find lists every kind of result as rows, so listing layers is the Figma-faithful reading. Two-way door. Drawn in screens/find.html, state 4.

## Find and Quick actions: the filter chip's text counts its steps, as its template says

- **Document and section:** `message-catalog.md`, row `filter.chip`.
- **Old text:** "Filtered: {kept} of {total} {kind}"
- **New text:** "Filtered: {kept} of {total} {kind}[ &middot; {N} steps]", the step count shown from two steps on; the fuller form, with the width steps, is "Filter chip and its steps: the chip carries both counts, and drops words to fit".
- **Why:** `interface-templates.md` 7 says the chip shows "the scope and the filter steps' count", but the catalog's text has no count, so a mock following one contradicts the other. With three steps, the count is what tells the analyst there is more than one thing to look at in the popover, which is where Edit step... sends them. The key is published, so the wording is the owner's call. Drawn in screens/find.html.

## Find and Quick actions: a question typed into Quick actions lists the category it matched, with one line per measure

- **Document and section:** `interface-templates.md` 15, Quick actions, "Regions and rows"; `information-architecture.md` 7, the Quick actions column; `element-needs.md`, "Aliases and a per-category display label on the catalog descriptor".
- **Old text:** "input; one list of recents, commands, then catalog entries (`ResultRow`). `QuickActions`, exists."
- **New text:** add: "When the query matches a catalog category's question label ('who matters most' for Centrality), the Catalog group's header names the category and the question it matched, and every entry of that category is listed in the catalog's order. Each catalog row carries one short line from its descriptor saying what the measure finds ('who sits between groups'), as a secondary text run after the name, so the right edge stays free for the row's shortcut, as in Figma's Actions menu. A mark that applies (a precondition phrase, a band word, 'already shown as {channel}') joins that run after the line. The first highlight goes to the first row not marked 'already shown', so Enter never re-runs what the canvas already shows; rows keep catalog order. On an undirected scope, HITS is folded into Eigenvector centrality's row ('HITS gives the same here') instead of listed. compact-mantine's `QuickActions` gains a `detail` slot on an action for that run."
- **Why:** `user-journeys.md` names the stall ("Don't know what questions to ask of the data") and promises Quick actions' search by question word, but a list of algorithm names answers the question only for someone who already knows them. The line is catalog data (the element's descriptor already has a `description`; a short form is needed), never app text, and it is a published descriptor field: its name and shape are the owner's call. A right-aligned line sat where Figma puts shortcuts, so a reader could take it for shortcut text. This changes where the earlier entry "Run and read: a Quick actions row carries the Catalog row's marks" puts those marks (its "trailing slot" becomes the run after the name); the two should be read together. Drawn in screens/find.html, state 8.

## Find and Quick actions: HITS on an undirected scope is folded into Eigenvector centrality

- **Document and section:** `graph-conventions.md`, "Preconditions".
- **Old text:** "eigenvector centrality on an acyclic or disconnected directed graph, or on a disconnected undirected one, is degenerate, so its precondition mark offers PageRank."
- **New text:** add: "HITS on an undirected scope gives hub and authority scores equal to each other and the same ranking as eigenvector centrality. Where entries are listed together (a question in Quick actions, a Catalog family), it is folded into Eigenvector centrality's row with 'HITS gives the same here'; run on its own, its precondition mark says so and offers Eigenvector centrality."
- **Why:** listed beside eigenvector centrality on Les Miserables, an undirected graph, HITS takes a row only to say it duplicates another, and running it adds a second column with the same order that invites a difference that is not there. The check is the element's detected-properties read, like the other preconditions. Drawn in screens/find.html, state 8.

## Comparison surface: two different measures are colored by rank, on one domain

- **Document and section:** `state-matrix.md` 4.6, Comparison; `options-and-encodings.md` 5, "One domain across compared views" and the Quantile line.
- **Old text:** "One scale domain, because a comparison is only honest on one scale." (kept unchanged); options-and-encodings.md: "Quantile ... stays an explicit choice, never a default."
- **New text:** add to 4.6: "When the two sides show two different measures (PageRank against betweenness), both are colored by rank on their own measure over one domain, #1 to #N, with one legend for both sides; ties take their average rank, as in the statistic. A value with no place on a rank of magnitudes, such as 0 betweenness, is drawn in the unstyled gray and counted in the legend. The difference list compares the same ranks." Add to the Quantile line: "except on a comparison of two different measures, where rank is the one domain both sides share."
- **Why:** PageRank runs from 1.63e-4 to 6.90e-2 and betweenness from 2.09e-8 to 1.15e-4 on the same April transfers, so no raw domain fits both; two raw scales drawn in the same ramp side by side invite the reader to read "same color, same value" across the split, which 4.6 exists to prevent. Rank is the one domain both sides share and is what the list and the statistic already compare. 0 betweenness (1,314 accounts) means no shortest path runs through the account, which a rank ramp would draw as merely low. This replaces the earlier proposal "two different measures keep two scales", withdrawn. Drawn in screens/comparison.html, states 1 and 4.
- **Element need:** `element-needs.md`, "One scale domain held over a playback range and across both sides of a comparison", gains a rank domain.

## Comparison surface: side labels, legend, toolbar and camera when the canvas is split

- **Document and section:** `interface-templates.md` 18, Regions and rows; `interface-specification.md` 3, "Corners, stated once here"; `interaction-pattern-entries.md` 4.9, Behavior and Owner.
- **Old text:** template 18: "canvas split into two sides, each with a header row naming its graph and version"; 4.9 links selection and hover only; silent on the legend, the toolbar and the camera.
- **New text:** "Each side is named by a floating pill in its top-left corner (a letter, then the measure or data version), and the legend card sits under side A's pill; a legend that differs per side sits under each. The floating toolbar stays bottom center of the canvas column. On the comparison surface the toolbar keeps Select and Quick actions; Path and Note are disabled with the reason 'Path and Note act on one canvas', because a path or note found on two sides would be ambiguous. Both sides share one camera: pan and zoom move both, so an element sits in the same place on each, and the header's zoom menu shows its level." Add to 4.9's Owner line: "a camera shared by two views".
- **Why:** an opaque full-width header row on each side reads as a second toolbar across the drawing; a pill keeps the canvas edge to edge as Figma's canvas furniture does. A linked selection is only useful if the element is where the eye looks on the other side, and pattern 4.9 does not link the camera. Figma's branch review has no live tools at all; graphty keeps the canvas live, so the tools that work on either side stay. Drawn in screens/comparison.html.
- **Element need (new):** a camera shared by two views, in `element-needs.md`, Comparison and time.

## Comparison surface: the difference list's rows for a rank comparison

- **Document and section:** `interface-templates.md` 18, Regions and rows; `content-design.md` 5 (Differences; Ranks).
- **Old text:** "the difference list (`ActionRow`s; `CompoundRow` A, B and difference readings, in the compact form of `content-design.md` 5)"
- **New text:** add: "For two numeric measures or one measure on two versions, a row is one element, named by its label and nothing else, with its rank on A and on B in the rank column form ('#76') and the difference. For two measures the difference column is **gap**, unsigned, and a segmented control above the list says which side is higher (Higher on B, Higher on A). For two versions or two time windows it is **moved**: a chevron up or down and the places, unsigned. Both directions are styled alike. A rank the element does not have reads 'absent'. A tie too wide for the cell reads 'tied', with its range ('#1,780 to #3,093') in the scope line and the cell's tooltip, and the gap to it is a lower bound ('1,779+'). A scope line names what the list covers ('Top 100 on either side, by rank on B'). Ties share their average rank for the statistic and the color, their range for display. The selected row opens in place (a `CompoundRow`) with each side's value and its full rank ('4.24e-4  #76 of 3,093'), then Create set and Add note."
- **Why:** a signed difference between ranks reads backwards: a move from #76 to #1 is -75 by the subtraction B minus A, yet it is the climb the reader is looking for, so a sign contradicts content-design.md 5 either way. "Moved" implies change over time and is wrong for two measures at one moment. A secondary line such as "flagged" plants the answer, and a real import may have no such attribute. Selection drives the inspector everywhere else, so the selected row has to show the values, not only the ranks. 1,314 accounts tie at 0 betweenness, and listing by raw difference puts every merchant first. Drawn in screens/comparison.html, states 1 to 3 and the Higher on A strip.

## Comparison surface: Export sits in the header overflow

- **Document and section:** `information-architecture.md` line "Save comparison / Export / Done"; `interface-templates.md` 18.
- **Old text:** IA lists Save comparison, Export and Done in the surface header; the template lists Save comparison and Done only.
- **New text:** "Header row 1 carries Save comparison and Done, then an overflow menu holding Export...; header row 2 keeps the mode tab and the zoom menu."
- **Why:** the two documents disagree, and the three labeled buttons do not fit: measured in the kit, Save comparison (108 px), Export... (61 px) and Done (44 px) need 229 px with their gaps, and row 1 has 216 px inside its padding. The overflow sits in row 1 beside the buttons it belongs with, not in row 2, which interface-specification.md 3 gives to the tab and the zoom menu. Drawn in screens/comparison.html (the overflow menu, open).

## Right-column modes: the filled header button is the one that keeps something

- **Document and section:** `interface-templates.md` 6 and 18; `figma-crosswalk.md` 4.1, "Share is the filled header button".
- **Old text:** (silent on which button is filled while a mode holds the right column)
- **New text:** add to template 6: "At rest the filled button is Export.... While a mode holds the right column, the one filled button is the action that produces or keeps something (Save comparison); an exit (Done, Edit current version) is never filled. When there is nothing left to keep, no button is filled: after Save comparison the button reads Saved, disabled, until a side changes." Add to template 18: "Done leaves at once, with no confirmation (`interaction-patterns.md` 10.2). An unsaved comparison is lost, and the notice 'Comparison closed without saving' offers Reopen for as long as it shows, rebuilding the same pairing and selection. Both results it compared were already kept, so only the pairing is lost."
- **Why:** the crosswalk takes Figma's filled Share as the producing action. A filled Done on the comparison surface gives the most weight to the one step that throws the comparison away, and copying Version history's exit styling carries a meaning that does not fit a surface whose work is not yet kept. Drawn in screens/comparison.html, states 1 to 4 and the strips.

## Comparison surface: pattern 4.9 builds the difference list from rows, as template 18 does

- **Document and section:** `interaction-pattern-entries.md` 4.9, Inherits.
- **Old text:** "**Inherits:** the compact-mantine `shell` split and `DataTable` for the difference list."
- **New text:** "**Inherits:** the compact-mantine `shell` split; `ActionRow` with `CompoundRow` for the difference list (`interface-templates.md` 18)."
- **Why:** the two documents name different components for one list. Rows fit the 240 px column and Figma's property-row density; a `DataTable` belongs in the bottom dock, where the weekly-return mock already puts the wide per-group table. Drawn in screens/comparison.html.

## Sequential ramps on the dark canvas start at their first 3:1 point

- **Document and section:** `canvas-drawing.md` 4 (palettes checked against both canvases) and the Contrast floors paragraph; `visual-language.md`, the dark canvas.
- **Old text:** "a fill below 3:1 against the canvas is made findable by the fill edge (section 4), not by recoloring the data."
- **New text:** add: "A sequential ramp whose low end is under 3:1 against the dark canvas is drawn from its first point that reaches 3:1 (viridis from 0.4: #2B788C to #FDE725 on #1E1E1E); the legend draws the ramp in use. The fill edge still applies to any single fill under 3:1."
- **Why:** the low end of viridis (#440154) is about 1.1:1 on #1E1E1E, and a heavy-tailed measure puts most elements there: in the dark state of screens/comparison.html most PageRank values and the lower ranks vanished into the canvas, leaving a few dozen bright dots. A fill edge on thousands of dots draws a field of rings, not a ramp. Every sequential-ramp mock has the same problem; see also "Styles list: the default measurement ramp needs a form for the dark canvas".
- **Element need:** the palette-defects row of `element-needs.md`: the element picks the ramp per canvas.

## Preferences stays Figma's submenu, and gains Theme and Scroll wheel zooms

- **Document and section:** `information-architecture.md` 3, the main menu tree under Preferences; `interface-templates.md` 20, the Preferences row.
- **Old text:** "Preferences / Default overview / Reset to default / AI provider... / Reduced motion / GPU policy"; "Preferences | Preferences submenu | `ToggleRow`s, and the GPU policy the element owns".
- **New text:** menu tree: "Preferences / Scroll wheel zooms (check) / Use WebGPU when available (check, its line the engine line `graphty.capability.engine`; disabled with its reason when there is no adapter or no webgpu-graph-algorithms) / --- / Theme > Light, Dark, System theme / Reduced motion > System, Reduce, Don't reduce / --- / Default overview > General overview (default), Flow overview, Community overview, and any overview the reader has used as a default / --- / AI provider...". Dialog table: "Preferences | Preferences submenu | a submenu, not a dialog: check items and radio submenus that apply at once; System theme and System name what they resolve to on this computer ('System theme (dark)'); only AI provider... opens a dialog".
- **Why:** Figma's Preferences is a submenu of check items, a Theme radio submenu (Light, Dark, System theme) and a few '...' items that open small dialogs (design/ui/figma/popovers-and-menus/main-menu-sub-preferences.png, main-menu-sub-preferences--theme.png). A three-valued setting is a radio submenu there, so the value count gives no reason for a dialog, and nothing about the graph does either; a menu that closes on the choice also leaves the canvas uncovered while the theme changes it. Theme is already a reader preference (`implementation-mapping.md`, reader preferences; `glossary.md`), and Scroll wheel zooms is named in `interaction-pattern-entries.md` 5; only the menu tree leaves them out. Two items carry a line under them, through the described Menu item proposed in "compact-mantine: a Select option and a Menu item with a description line": the wheel, whose effect is not obvious ("Off: the wheel pans (orbits in 3D); Ctrl or Cmd with the wheel zooms."), and WebGPU, whose line is the catalogued engine line. The AI provider stays a dialog because a key is a commit that cannot be left half set (`interface-templates.md` 20), with nothing dimmed behind it, as Figma's Preferences dialogs dim nothing. The earlier proposal of one sectioned dialog with Done is withdrawn. Drawn in screens/preferences.html.

## The default overview is a radio submenu in Preferences, and choosing General is the reset

- **Document and section:** `output-homes.md` 3.1, the row "Use as default overview, Reset to default"; `glossary.md`, Default overview and the Reset row ("Preferences' Default overview row uses it to return to General overview").
- **Old text:** "the Overview row's Replace menu; Preferences' Default overview row (Reset to default)"
- **New text:** "the Overview row's Replace menu; Preferences > Default overview, a radio submenu of the overview recipes the element registers (General overview, marked '(default)', first) and any the reader has used as a default. Choosing General overview is the reset; there is no separate Reset to default. The submenu's first line names whether the open project uses the default ('For projects that choose no overview of their own, Payments review among them.') or keeps its own ('This project keeps its own: Community overview.'); its last line says 'At open it fills only the quick counts; the rest waits until you ask. It never colors the graph.'" In the glossary's Reset row, drop the Preferences example.
- **Why:** a reader who wants Flow overview before any project is open, or who set a default by mistake, would otherwise have to open a project and go through Statistics' Replace. A radio list and a Reset to default beside it would be two controls for one choice, since picking General already returns to the default. The first line prevents the surprise of changing the default and seeing nothing happen because the open project names its own overview; the last line keeps the promise of `files-and-recipes.md` 2 (What runs at Load; An overview never paints) in the reader's words. The list holds only references, as `implementation-mapping.md` 6 requires. Drawn in screens/preferences.html, states 3 to 5.

## Cost bands: a word for a run under ten seconds

- **Document and section:** `glossary.md` 10, Cost bands; `message-catalog.md`, `reading.notComputed`.
- **Old text:** "**under a minute** (10 to 60 s), **a few minutes** (1 to 5 min), ..."
- **New text:** "**a few seconds** (under 10 s), **under a minute** (10 to 60 s), **a few minutes** (1 to 5 min), ..."
- **Why:** `graphty.reading.notComputed` is "Not computed: {band}", but on a graph of 3,000 nodes most readings take under ten seconds, and the list has no band for that, so the row cannot be written. Drawn in screens/preferences.html, states 1 and 4.

## Reduced motion and layout movement: two documents disagree

- **Document and section:** `interaction-pattern-entries.md`, the paragraph on notices ending "With reduced motion requested, the layout still settles (its movement is how data is shown) but the camera does not animate."; `canvas-drawing.md` 10.
- **Old text:** as quoted; `canvas-drawing.md` 10 says "layouts show settled positions".
- **New text:** in `interaction-pattern-entries.md`: "With reduced motion requested, the camera does not animate and a layout shows its settled positions (`canvas-drawing.md` 10)."
- **Why:** the two rules contradict each other and the Preferences row must say in one line what Reduce does. The mock follows `canvas-drawing.md` 10, the rule for graph motion, because WCAG 2.3.3 is about motion the reader did not start, and a settling layout is exactly that. If the owner prefers the layout to animate anyway, the Preferences help line changes to "the camera cuts, edge flow stops".

## Notices and errors: the engine report line names its reason from a fixed list

- **Document and section:** `message-catalog.md`, row `capability.engine`; "Template words".
- **Old text:** `Engine: {engine}[; {reason}] ("CPU; WebGPU lost")`
- **New text:** `Engine: {engine}[; {reason, select, lost {WebGPU lost} unavailable {WebGPU not available} notInstalled {webgpu-graph-algorithms not installed} off {WebGPU turned off}}]`. Add "installed" and "turned off" to the frame words. The CPU path never gets a notice: the result's state line names the engine, the row names it as trailing text (see "the engine on a result row" below) and this line is under Details.
- **Why:** the slot has no defined values, so every host would word the four real cases (driver reset, browser without WebGPU, the optional package absent, the reader's own Preferences choice) itself, and the app would be guessing a graph fact. Keeping the CPU path off the notice follows `interaction-patterns.md` 3.5 (no notice confirms a state a visible control already shows) and the repository rule that the CPU path is correct behavior, not a failure. Drawn in screens/notices-errors.html, the CPU path state.

## Notices and errors: the device-lost cause drops its instruction to the designer

- **Document and section:** `message-catalog.md`, "Causes", row `cause.E_DEVICE_LOST`.
- **Old text:** `WebGPU lost; new runs use the CPU; Re-run names that path`
- **New text:** `WebGPU lost; new runs use the CPU`
- **Why:** "Re-run names that path" describes what the verb's label does; read as reader text it is a sentence no analyst can act on, and one mock already printed it on a row. The verb label "Re-run on CPU" (`glossary.md` 9) carries that fact. Drawn in screens/notices-errors.html, the WebGPU-lost state (owner mode).

## Notices and errors: an error's headline and cause are two records, never one template

- **Document and section:** `message-catalog.md`, "Published keys", the `params` bullet; rows `open.failed`, `run.failed`, `export.failed`, `save.failed`, `assistant.failed`, `unexpected`.
- **Old text:** "a nested cause as its own record" (under params), while the rows' templates read `Could not {verb} {object}: {cause}`.
- **New text:** "An error publishes two sibling records: the headline (`graphty.run.failed`, params without a cause: `{ algorithm: "PageRank" }`, text "Could not run PageRank") and the cause (`graphty.cause.E_DEVICE_LOST`). A surface that holds the cause shows `{headline}: {cause}`; an error notice out of sight shows the headline alone. The rows' templates drop `: {cause}` and name the join in the Also shown column."
- **Why:** the published-keys section says both "a second record" and "a nested cause in params". A host showing `text` on a notice would print the whole cause where the design wants the headline only (`content-design.md` 4, "An error notice out of sight carries the headline"). One shape answers both surfaces. Drawn in screens/notices-errors.html, the failed-load, WebGPU-lost and save-failed states (owner mode). Keys follow the published form graphty.<area>.<message> (owner decision, 2026-09-28). This is part of a published contract, so the shape is the owner's call.

## Notices and errors: the lost-canvas card says why and what a restart returns to

- **Document and section:** `message-catalog.md`, row `capability.canvas`, and two new rows; `interaction-pattern-entries.md` 8.1 (already requires the card to state "that a restart returns to the last save", with no key for it).
- **Old text:** `capability.canvas` | canvas not available | mark | Restart viewer when the renderer was lost; none without WebGL
- **New text:** keep the row; add `graphty.capability.canvasLost`, report line, "Graphics device lost; the graph, results and selection are still held", on the card under the mark; add `graphty.capability.restartReturnsTo`, report line, "Restart viewer returns to the last save, {time}", shown only while the save state is Not saved, above Download project file and Restart viewer. Add "Graphics device", "held" and "returns" to the template words.
- **Params:** both keys are report lines of the card; `graphty.capability.canvasLost` takes none, `graphty.capability.restartReturnsTo` takes `{ time }` (the last save's local time, "10:42"). The card is polite (role status), as the catalog's `graphty.capability.canvas` row says.
- **Why:** "Canvas not available" alone, in the middle of work, reads as "my work is gone". The two lines answer the two questions the card raises (what happened, what will I lose) before either button is pressed. Drawn in screens/notices-errors.html, the drawing-lost state.
- **To test:** the card says both "still held" and "returns to the last save", which readers may take as contradictory. The session guide asks, neutrally, "What would you do now?" and then "If you pressed Restart viewer, what would you have afterwards?"; if most expect to keep their changes, the card needs a different restart line.


## Notices and errors: a canvas without WebGL says why, with no verb

- **Document and section:** `message-catalog.md`, a new row beside `capability.canvas`; `state-matrix.md` 3, State/Canvas/Unsupported.
- **Old text:** (Unsupported says "the reason in the canvas region" and the catalog says "none without WebGL", with no key for the reason)
- **New text:** add `graphty.capability.canvasNoWebGl`, report line, "WebGL not available in this browser; the table, inspector and Find still work", on the same canvas card as `graphty.capability.canvasLost`, with no verb, spoken politely. Add "WebGL", "browser" and "still work" to the template words.
- **Why:** the reason slot exists and has no words, so every host would write its own. Naming what still works is what tells the analyst the loaded data is usable. Drawn in screens/notices-errors.html, the no-WebGL state. The key is published, so the wording is the owner's call.

## Notices and errors: the lost-canvas card offers two verbs, an exception to one next step

- **Document and section:** `content-design.md` 2 ("one next step on each surface") and 4 ("One next step per surface").
- **Old text:** "When something went wrong it says what, where, and one next step on each surface"
- **New text:** add: "One exception: the lost-canvas card, while the project is Not saved, offers Download project file before Restart viewer (`interaction-pattern-entries.md` 8.1), because the restart would discard work the download keeps."
- **Why:** `interaction-pattern-entries.md` 8.1 requires both verbs and `content-design.md` 2 forbids two, so the framework contradicts itself and a mock has to pick. The exception keeps both and states why. Drawn in screens/notices-errors.html, the drawing-lost state.

## Notices and errors: a file that is a web page is named as one

- **Document and section:** `message-catalog.md`, "Causes", a new discriminator of `cause.E_PARSE_FAILED`; `content-design.md` 4, Errors, the fix-file row; "Template words".
- **Old text:** `cause.E_PARSE_FAILED` | line {line} is not {format}
- **New text:** keep that row and add `graphty.cause.E_PARSE_FAILED.webPage` | the file is a web page, not {format}, with the verb Choose another file (the plain cause keeps Read as...). graphty-element sets the discriminator when the first bytes are an HTML document (`<!DOCTYPE html` or `<html`). Add "web page" to the frame words.
- **Why:** a download that is really a sign-in page is a common way a load fails, and "line 1 is not GraphML" hides the one fact the analyst needs; it also leads to Read as..., which cannot help, since no format reads a web page. `content-design.md` 2 requires saying what went wrong. Recognising HTML is format sniffing, which belongs in the element, so no host guesses it. Drawn in screens/notices-errors.html, the failed-load states. The key is published, so it is the owner's call.

## Notices and errors: a full browser store has a cause of its own

- **Document and section:** `message-catalog.md`, "Causes", a new row; `state-matrix.md` 3, State/GraphPanel/NotSaved.
- **Old text:** (`save.failed` is "Could not save the project: {cause}", and no cause row covers an autosave that fails; NotSaved lists "quota, private window, project too large")
- **New text:** add `graphty.cause.E_STORAGE_FULL` | browser storage full, and name the other two the same way when they are drawn. Add "storage" and "full" to the frame words.
- **Why:** `graphty.save.failed` is the only Data-at-risk message (`content-design.md` 2), and its cause slot had no words for the case the state matrix names first. Drawn in screens/notices-errors.html, the save-failed state. A new error code is part of the published contract, so the owner decides.

## Notices and errors: the engine on a result row, only where it could differ

- **Document and section:** `state-matrix.md` 3, State/ResultsPanel/CpuPath.
- **Old text:** "no WebGPU: the CPU path ran, named on the row"
- **New text:** "no WebGPU: the CPU path ran, named on the row as trailing text in secondary ink (compact-mantine TrailingSlot, not a Badge), only for a method that has a WebGPU path; a method with none (Degree) names nothing. The state line names the engine, and Details says why (`graphty.capability.engine`)."
- **Why:** in a browser with no WebGPU every row would carry the same mark for ever, so it says nothing and trains readers to ignore the slot; an outlined Badge on each row also reads as a column of buttons. A row mark still matters where a result is read as a benchmark and the method could have run on the GPU.
- **To test, not proposed yet:** naming the engine on the row only when it differs from the session's engine (so a browser with no WebGPU shows no row mark at all, and the state line alone carries it). Drawn in screens/notices-errors.html, the CPU path state.

## Notices and errors: an unseen failure marks the Results rail button

- **Document and section:** `interaction-patterns.md` 3.5 (notices); `interface-specification.md`, the rail; `state-matrix.md` 3, Results panel.
- **Old text:** (a failed run out of sight gets a notice that times out; nothing else outside the Results panel shows it)
- **New text:** "While a run has failed and the Results panel has not been opened since, the Results rail button carries a mark (compact-mantine Indicator, danger fill), its accessible name reads 'Results, {N} failed', and opening the panel clears it. The failure itself is on the result's row, as before."
- **Why:** the notice times out after about 6 s, so an analyst who looked away loses the only trace outside the panel. A longer notice would hold the one toast slot; a mark on the rail is quiet and stays. The count comes from the element's results state; which failures have been seen is app state. Drawn in screens/notices-errors.html, the WebGPU-lost-later state.

## Notices and errors: a driver reset loses the drawing and the run together

- **Document and section:** `state-matrix.md` 8 (cases where axes meet), a new row beside `Cross/NotSavedRenderLost`.
- **Old text:** (no row: the GPU lost mid-run and the canvas lost are drawn as separate states)
- **New text:** "A graphics driver reset loses the drawing and a running WebGPU run at once: the canvas card shows (`graphty.capability.canvasLost`) and the run fails on its own row with Re-run on CPU; no run notice is added, because the card already speaks and one surface speaks at a time."
- **Why:** a driver reset drops every GPU context in the browser, the WebGL context that draws the canvas included, so the WebGPU-lost state with an intact drawing only happens when the browser drops the WebGPU device alone. Readers of the two states asked why the canvas survived in one. Drawn in screens/notices-errors.html as a note on the WebGPU-lost state.

## compact-mantine Toast: a notice with an action can time out

- **Document and section:** compact-mantine `design/figma-spec.md` 8.6 (Toast); `implementation-mapping.md`, the compact-mantine list.
- **Old text:** "toasts with an action never auto-dismiss"
- **New text:** "A toast with an action never auto-dismisses unless the caller passes `timeout` (the notice's action can also be reached elsewhere, `interaction-patterns.md` 3.5); then it times out on the same 3 s / 6 s rule as a toast without one. `graphty.save.failed` passes none, so it stays."
- **Why:** graphty's departure from Figma (`figma-crosswalk.md` 4.4) is recorded in the framework but not in the component, so the notices the mocks draw (Redo, Show PageRank) cannot be built with the Toast as specified. Drawn in screens/notices-errors.html, the undo and WebGPU-lost states.

## compact-mantine: the error slot of a step is an issue row, and a canvas card

- **Document and section:** `interaction-pattern-entries.md` 8.1, "Inherits"; compact-mantine `design/figma-spec.md` 9.6 (ActionRow) and 11.11 (cards).
- **Old text:** "Inherits: the `FieldRow` error slot and the compact-mantine alert." and "Cards and tiles ... are not built ... Add them when a panel needs one."
- **New text:** "Inherits: the `FieldRow` error slot for a field; for a step or dialog, an issue row (`ActionRow`: severity icon, headline in 550, cause in secondary ink, Details at the end of the cause), as Figma's missing-fonts dialog lists its problems; the step's one verb is its footer primary." In figma-spec 11.11 add a canvas card: 320 wide, `--cm-bg`, radius 13, `--cm-elevation-300`, padding 16, centered in the canvas region; a title row with a 16 icon and 550 text, report lines in secondary ink, up to two buttons.
- **Why:** compact-mantine has no alert, so the entry points at a component that does not exist and each mock drew its own error box. The lost-canvas and no-WebGL states are the first panel that needs a card. The kit has both (`k-issue`, `k-canvas-card`) so every mock draws them the same way. Drawn in screens/notices-errors.html.
## Keyboard walk, FOR DECISION (published keymap): Shift+Up or a walk-only key for going back

- **Document and section:** `interaction-pattern-entries.md` 9.2, "Back and home" ("The walk-back default must be a chord the browser does not reserve, or be consumed only while the walk is active"); `one-way-doors.md` 65 (the default keymap).
- **Old text:** (the walk-back key is a role; its default is not named. The entry "Keyboard walk: Shift+Arrow walks, and what each of the four does" above proposes Shift+Up.)
- **New text:** one of two defaults, chosen after the keyboard-only study: (a) "Shift+Up is the walk-back key", as proposed above; or (b) "Alt+Up (Option+Up on macOS) is the walk-back key and means nothing outside the walk; during the walk Shift+Up moves nothing and says 'Alt+Up goes back.'" Either way Shift+Home is the walk-home key.
- **Why:** Shift+Up completes the tree-view square (Right and Left along, Down in, Up out) and needs no new key, but in every list and grid of the app Shift+Up extends a row selection (9.1), so the same chord means "extend" one Tab stop away. Alt+Up is the platform's "up one level" (Windows File Explorer), is not reserved by Chrome, Firefox, NVDA or JAWS on an application region (Alt+Left and Alt+Right are browser Back and Forward; Alt+Up is not), and cannot be confused with a selection gesture. Backspace, the other familiar "back", is ruled out by 9.2 (a delete key on macOS). The interactive mock screens/keyboard-walk.html runs both: `?back=alt-up` swaps the key and every announcement and the walk-position slot name the key in force, so the study can ask which one participants reach for without being told. The keymap is published behavior (door 65): the owner decides.

## The table scrolls to a selection made on the canvas

- **Document and section:** `interaction-patterns.md` 3.1, "Linked views".
- **Old text:** "The canvas and the table share one selection, and hover links them in both directions" (silent on whether the table shows a selected row that is scrolled away)
- **New text:** add: "When the selection changes anywhere but the table and none of the selected rows is in view, the table scrolls the most recently added selected row to its middle. Focus does not move, and the table never scrolls while it has focus except to keep its focused row in view."
- **Why:** in the keyboard mock, Space on RPA2 and 53BP1 during a walk left both rows below the visible part of the dock, so a sighted user saw no selected row at all and could read the table as disagreeing with the canvas. Figma scrolls and expands the Layers panel to show what was selected on the canvas; the table is graphty's Layers panel for elements (`figma-crosswalk.md` 1). The newest row is the one the analyst just acted on. Not moving focus keeps the walk where it was. Drawn in screens/keyboard-walk.html ("Selection of two"). Two-way door.

## Keyboard walk: Space on a table row changes the canvas selection, which 9.1 keeps apart

- **Document and section:** `interaction-pattern-entries.md` 9.1 ("A row selection (several rows chosen together while the canvas selection stays as it was)").
- **Old text:** "A row selection ... while the canvas selection stays as it was"; the keyboard storyboard (frame 17) says instead "Space toggles a row's node in the same selection".
- **New text:** "In the bottom dock's Nodes and Edges tables, which list the canvas's own elements, the row selection IS the canvas selection: Space, Shift+Arrow and Mod+click on a row change the canvas selection, and the announcement ends 'on canvas'. In every other list (sets, results, style layers) a row selection stays separate from the canvas selection, as today."
- **Why:** the table is the drawing's text equivalent (the Tab rule above lands on it). A screen-reader user who selects three proteins in the table and hears nothing change on the canvas has two selections of the same nodes and no way to tell which one a command will use. The mock (screens/keyboard-walk.html, state "Left the canvas") draws the table this way; the keyboard-only study should confirm it.
- **Added, Esc and the focused row's reading:** "In those tables Esc follows 9.1: with several rows selected and the focused row among them, Esc collapses the selection to the focused row ('RPA2 alone selected. 1 selected on canvas.'); otherwise, or at the next Esc, it clears the selection and names Previous selection's chord, as Esc does on the canvas. Moving focus onto a row reads its cells and the platform's own 'selected' from `aria-selected`; the words 'on canvas' are in the live announcements of a change, never appended to a row's name. While a set is the selection, its members' rows carry the member row state (compact-mantine's member tint, the table's form of the thin member ring) and are not `aria-selected`; the row's name adds 'member of {set}'."
- **Why (added):** 3.1 already says the canvas and the table share one selection ("Linked views"), so the only conflict is 9.1's wording; what 3.1 and 9.1 leave open is Esc in a table whose rows are the selection, and whether a row's reading repeats "on canvas". Appending words to every selected row's name would double the platform's word on every row. Figma's Mod+G leaves the new group selected and its children not; the table must agree with the canvas, which draws members with the thin member ring. Drawn in screens/keyboard-walk.html ("Left the canvas", "New set").

## Keyboard walk: the departure from Figma's hierarchy keys is a crosswalk row

- **Document and section:** `figma-crosswalk.md` 4.3, a new row next to "The arrow keys nudge the selection"; `principles.md`, the familiar keys ("Enter and Shift+Enter") that a departure must justify.
- **Old text:** (no row: the walk's in-and-out axis is justified in the proposals above only by the tree-view convention)
- **New text:** a row: "Enter and Shift+Enter move into a frame's children and back out to the parent; Shift+Arrow nudges by 10 | Shift+Down steps into the focused node's neighbors and Shift+Up steps back along the path actually walked; Enter selects the focused node, and with no walk active starts the walk at the selection | ontology | a node has no single parent, so 'back out' can only mean the path walked; and Enter already selects the focused node during the walk (9.2), so it cannot also mean 'step in'".
- **Why:** principles.md requires every departure from a familiar key to be a ledger row with the fact that forces it. The tree-view convention explains the shape of the four arrows; the forcing facts are that a graph has no parent chain and that Enter is taken.

## Keyboard walk: Delete on a focused node that is not selected says so

- **Document and section:** `interaction-pattern-entries.md` 9.2, "Delete during the walk acts only when the focused node is in the selection"; `message-catalog.md` (new row `walk.deleteNotSelected`).
- **Old text:** (the rule is stated; what the analyst hears when it does not act is not)
- **New text:** "When Delete or Backspace is pressed during the walk on a focused node that is not selected, nothing is removed and the polite region says `graphty.walk.deleteNotSelected` 'Nothing removed; {label} is not selected. Space adds it.'"
- **Why:** the rule protects a selection elsewhere in the graph from a stray key, which is right, but a key that does nothing silently cannot be told apart from a key that did something out of earshot, and Delete is the key where that fear is sharpest. Drawn in storyboards/keyboard-only.html frame 11 (a slip onto Delete, next to Home on a laptop's top row) and screens/keyboard-walk.html state f11. Message keys and texts are published (PR #586): the owner decides the wording.

## Export: the dialog's rows are checkboxes, not a segmented choice

- **Document and section:** `interaction-pattern-entries.md` 6.11, **Inherits**.
- **Old text:** "**Inherits:** `Modal`, `SegmentedControl`."
- **New text:** "**Inherits:** `Modal`, with a `ControlSection` of Checkbox rows per kind (Figma's Export dialog)."
- **Why:** Figma's Export dialog is a list of rows you tick, and one export writes every checked row. A SegmentedControl is an exclusive picker, so a developer building from 6.11 would build a choice of one output, and a figure could no longer leave with its methods text and its table in one export. Drawn in flows/export.html (the checked rows fan out to one trust check per kind and merge at Export N files) and screens/export-dialog.html.

## Export: an object's Export section has Figma's Preview disclosure

- **Document and section:** `interface-specification.md`, the inspector section table, row Export, and the paragraph "**Export** copies Figma's Export section".
- **Old text:** "header with "+" and a Copy as PNG `TrailingSlot`; one `FieldRow` export setting (scale, format) with an `AdvancedButton` (background, include legend, suffix) and remove; then an "Export <name>" secondary `Button`"
- **New text:** add after the button: "then a Preview disclosure, closed by default, showing the figure as it will be written, at thumbnail size: the object framed on the file's ground, the legend drawn in and the caption naming the scope, from the same element export preview the Export dialog uses, with the file's pixel size and caption repeated as text below it."
- **Why:** Figma's Export section has this disclosure, and without it the most Figma-faithful route is the one route that writes a figure without showing its trust check first (task flow 9: legend and scope drawn in). The preview is graphty-element's (the entry "The export form shows what will be written before it is written"); the app only shows it. Drawn in screens/export-dialog.html, state 9.

## Task flows: a written file takes the parallelogram

- **Document and section:** `task-flows.md` 1, the shape table, row parallelogram.
- **Old text:** "parallelogram | `[/"Committed"/]` | a committed change: one undo entry, one line in the record"
- **New text:** "parallelogram | `[/"Committed"/]` | a committed change (one undo entry, one line in the record), or a file written outside the project (no undo entry, no line in the record; the step table says which)"
- **Why:** flow 9 already draws "Figure written", "Table written" and the others as parallelograms although an export has neither an undo entry nor a record line, so the shape table and flow 9 disagree. A file written is the same kind of moment (something is now fixed that was not), and a second terminal shape would add vocabulary for no reader benefit. Drawn in flows/export.html.

## FOR DECISION: Export... in place of Share, a recorded exception without a date

- **Document and section:** `figma-crosswalk.md` 4, "Recorded exceptions", the bullet "Share is the filled header button"; the flows that start from Export... (task flow 9; flows/export.html).
- **Old text:** "the owner's decision that exporting and presenting are one task (date not recorded; to confirm with the owner)."
- **New text (proposed, not decided):** "confirmed by the owner on <date>" -- or, if not confirmed, the header's filled button goes back to Figma's Share, and export moves to Share's menu.
- **Why:** every export route in the design starts from this button, and the crosswalk's own rule says a recorded exception needs the owner's written request with its date. It is a question for the owner, not a design decision: the header's primary action is what every screen of the app is built around.

## Keyboard walk: Enter no longer starts the walk, and Enter in the walk says what it dropped

- **Document and section:** `interaction-pattern-entries.md` 9.2, Entry; `interaction-patterns.md` 3.6, dispatch rows "the canvas, no walk" and "the canvas walk", Enter column, and 3.8's canvas chart; `message-catalog.md` (a new row `walk.selectedOnly`).
- **Old text:** 9.2: "The first arrow press on the canvas starts the walk, and so does Enter when the selection is elements or empty." 3.6, "the canvas, no walk", Enter: "elements or nothing selected: start the walk". 3.6, "the canvas walk", Enter: "select the focused node". 3.8: "Idle --> Walk : arrow; Enter with elements or nothing selected".
- **New text:** 9.2: "Shift+Down or Shift+Right on the canvas starts the walk while something is drawn. Enter never starts it: with nodes or nothing selected, Enter moves nothing and says `graphty.walk.notStarted` 'Shift+Down walks from {start node}.'; with a set, path or item selected it goes to the members (4.2); with nothing drawn it opens Choose what to draw." 3.6, "the canvas walk", Enter: "select only the focused node; the polite region names what the selection lost: `graphty.walk.selectedOnly` '{label} selected[; {dropped} deselected]. {n} selected on canvas.[ {chord}: Previous selection.]', the bracketed parts only when nodes were dropped ({dropped} is the label when one node was dropped, else '{k} nodes'). Previous selection restores the dropped selection and leaves focus and the walk where they were." 3.8: "Idle --> Walk : Shift+Down or Shift+Right [something drawn]".
- **Why:** Enter had four meanings on the canvas depending on a state the user cannot see (start the walk, go to members, select only the focused node, open a dialog), and in the walk it silently threw away a selection built with Space: after Space adds Javert to Valjean, Enter leaves only Javert and said only "Javert selected". Shift+Down already starts the walk, so dropping Enter from entry removes one state-dependent branch at no cost; the remaining Enter meanings each say what they did. Naming the dropped nodes and the way back turns a silent loss into an undoable one. Drawn in flows/keyboard-walk.html (key table and trace step 11). A two-way door until the keymap is published.

## Keyboard walk: Shift+Enter retraces, as Figma's go-to-parent

- **Document and section:** `interaction-pattern-entries.md` 9.2, "Back and home"; `interaction-patterns.md` 3.6, dispatch row "the canvas walk" (no Shift+Enter today; the object-list row already has "Shift+Enter goes back to the object entered from").
- **Old text:** (silent on Shift+Enter during the walk)
- **New text:** "During the walk, Shift+Enter retraces one hop, exactly as the walk-back key. Outside the walk, after Enter on a set, path or item went to its members, Shift+Enter goes back to that object, as it does on a list row (4.2); otherwise it does nothing."
- **Why:** Figma's layer keys are Enter for children and Shift+Enter for the parent; a Figma user reaching for Shift+Enter to go back up should not hear silence, and the object-list row already gives Shift+Enter that meaning, so the canvas agrees with the list next to it. It is a second key for going back, not a replacement: it holds whichever of Shift+Up or Alt+Up the owner chooses for the walk-back key. Drawn in flows/keyboard-walk.html. Published keymap (door 65): the owner decides.

## Recipe travels: two columns that fit one requirement are never bound silently

- **Document and section:** `interaction-pattern-entries.md` 6.10, Behavior ("matches attributes by name and level and offers a picker for the rest"); `element-needs.md`, "Files, notes, recipes and history".
- **Old text:** "The binding step then matches attributes by name and level and offers a picker for the rest"
- **New text:** add: "When the data being applied holds more than one column that fits a requirement -- one matching by name, and another of the required level in a file added in the same apply, or two in different files -- the row is marked and its picker starts empty. Each candidate is listed with where it lives, how many values it has and its range ('log2FoldChange, in the network file; 300 values, -2.52 to 3.15'; 'log2FC, in your table; 84 matched values, -2.41 to 2.98'). Apply waits for the choice. The binding report records the choice as 'chosen from 2'."
- **Why:** a lab's shared network often already carries an earlier screen's fold change under the recipe's own name, and the recipient brings this week's under another. A match by name would color his genes with last season's numbers: in the kit's data 39 of his 84 matched genes would show the opposite direction, with no mark anywhere. The value counts (300 against his 96) are what let a non-specialist tell which is his. The rule is matching behavior, so graphty-element owns it; the app only draws the row. Drawn in screens/recipe-apply.html, state 3, and storyboards/recipe-travels.html, frame 5.

## Recipe travels: a column proposed by level is marked, never bound silently

- **Document and section:** `interaction-pattern-entries.md` 6.10, Behavior; `element-needs.md`, "Files, notes, recipes and history"; `message-catalog.md` `file.report`.
- **Old text:** "matches attributes by name and level and offers a picker for the rest" (silent on what the picker holds when nothing matches by name)
- **New text:** "When no column matches a requirement by name and exactly one column of the required level exists in the data being applied, the element proposes that column: the row shows it with a 'proposed' mark and a line saying why ('the only signed number in your data; the recipe called it log2FoldChange'), and the binding report records it as 'proposed by level'. Otherwise the picker starts empty. A proposed column is never bound silently, and a signed column asks how it is read only when its sign disagrees with the recipe's scale (see "a signed column is asked about only when it disagrees with the recipe")."
- **Why:** the earlier mock preselected a column 'by its numbers', which is neither a match by name nor by level and was written down nowhere. The level the recipe records ('signed' in the Export preview) is the only fact the element may match on besides the name. Drawn in screens/recipe-apply.html, the branch state.

## Recipe travels: the join key is a row with a picker, like every other part

- **Document and section:** `interface-templates.md` 20, Binding step ("one row per unresolved reference: its name, then a picker"); `task-flows.md` 8, "bind".
- **Old text:** (the join key has no row; the earlier mock gave it only as prose, with a picker offered only when nothing matched)
- **New text:** "The first row of 'What the recipe reads from the data' is the join: '{what it joins}, to join your table' with a Select of the table's text columns, then 'against the network's {id kind}; {matched} of {total} matched'. When nothing matches, the same row is marked with '0 of {total} matched' and its Select opens on the table's other text columns; there is no separate control for that case."
- **Why:** the join key decides the headline number, and pattern 6.10's pass condition is that the analyst can say which of their attributes each part reads. Figma's Swap library matches by name; the crosswalk's recorded departure is that an unmatched slot can be bound by hand, and the join is a slot. Drawn in screens/recipe-apply.html, states 3, 4 and the branch.

## Recipe travels: when the load step is skipped, and how a network and a table picked together load

- **Document and section:** `task-flows.md` 8, the diagram (Load step dialog before the binding step), the "load" row and the desk count ("Recipe first from the start screen: 4 steps"); `interface-templates.md` 20a.
- **Old text:** "Recipe first from the start screen: 4 steps (Open...; the recipe; the data file; Load), plus the binding step once." The diagram always routes through the load step.
- **New text:** "With a recipe pending, Add data... accepts several files at once. When every file reads without a question (no issue the load step would raise, and under the size at which the load step shows a size preview), the load step is skipped: the Apply dialog's first section, 'Your files', lists each file with what it read as and its size, and nothing loads until Apply. A file with a graph is the network; a file with rows only is a table, joined by the recipe's join row. If any file raises a load-step question, the load step comes first for that file and its button reads Continue to binding. Two graph files, or a table with no join slot in the recipe, go to the load step's drop choice. Desk count: the drop; Add data...; the files; Apply, plus one choice per marked row."
- **Why:** for a 300-protein network and a 96-row table the load step would show two lines that say nothing is wrong, then a second dialog. Folding the file lines into the Apply dialog keeps the size-before-commit check (nothing loads until Apply) and removes a step. The route with a questionable file keeps the proposed Continue to binding. Evidence: storyboards/recipe-travels.html, frames 3 and 4.

## Recipe travels: once data is chosen, the pending recipe has one home, the canvas

- **Document and section:** `task-flows.md` 8, the Cancel edge ("Where the flow started, nothing applied"); `state-matrix.md` 3 (Canvas, Blank, a recipe pending); `interface-templates.md` 19 (Start screen with a recipe pending).
- **Old text:** "BI -->|Cancel| X[Where the flow started, nothing applied]"
- **New text:** "A recipe opened on the start screen stays there, as the pending card, until Add data...; choosing files creates the project, which holds the recipe pending. From then on Cancel or Esc in the Apply dialog, and Undo of the apply, all land on the canvas of that project with the recipe waiting for data (the Canvas Blank card, the Graphs section's one empty row, the Inspector's Add data...), focus on the card's Add data.... Close recipe on the start screen discards the recipe with no project made."
- **Why:** the earlier mock returned Esc to the start screen and Undo to the canvas: one flow, two homes for the same state. In Figma a dropped file becomes a file; here choosing data makes the project. Drawn in screens/recipe-apply.html, state 6.

## Export: Scope is disabled while only definition outputs are checked

- **Document and section:** `interface-templates.md` 20 (Export...); `interaction-pattern-entries.md` 6.11.
- **Old text:** (silent; the earlier mock kept Scope enabled with helper text saying it does not apply)
- **New text:** "While the only outputs checked are definitions (a recipe, a style file), the Scope row is disabled and its tooltip reads 'A recipe holds no data, so it has no scope'. Recipes, Export recipe... opens the dialog in that state, with only Recipe checked."
- **Why:** Figma disables a field that has no effect on the current export rather than explaining it; helper text under an enabled control invites a change that does nothing. Drawn in screens/recipe-apply.html, state 1.

## Table: a live degree beside its full-graph value

- **Document and section:** `conceptual-model.md` 3 (live attributes); `interface-templates.md` 16 (the table).
- **Old text:** "where a node's filtered degree differs from its full-graph degree, both are shown" (silent on how the table shows both, and on how a result column names its scope)
- **New text:** "Under a filter, the table shows a live attribute as two columns: 'degree, filtered' and 'full graph', the second filled only on rows where the two differ, in secondary ink. A result column names the scope its run read in its header ('betweenness, full graph') whenever that scope is not the table's."
- **Why:** with 28 of 77 characters left, Valjean has 18 neighbors on screen and 36 in the novel. A single 'degree' column under a scope line that says 'Filtered graph' shows one of those and implies the other. Leaving the second column blank where the values agree keeps the eye on the rows the filter changed (Myriel: 3 here, 11 in full). Drawn in screens/undo.html. Two-way door.

## Table: how rows are marked as the previous selection

- **Document and section:** `interaction-patterns.md` 3.1, "When the table's Selected scope empties".
- **Old text:** "the rows stay, marked as the previous selection" (silent on the mark)
- **New text:** add: "The mark is the secondary selection tint (compact-mantine `bg-selected-secondary`, the member row state), with no selection tint; the scope line carries the words."
- **Why:** the rows must read as no longer selected while staying in place, and the table already has exactly one weaker-than-selected row state. A new mark would be bespoke. Whether readers tell the two apart is the first-click task the section already names. Drawn in screens/undo.html, states 1 to 3. Two-way door.

## First look: a sample opens as your own copy, and the first thing you make in it keeps it

- **Document and section:** `information-architecture.md` 6, the table's "Project or sample" row; `glossary.md` 10, the Not saved mark; `interface-templates.md` 19 and 2 (the left header).
- **Old text:** "**Project or sample** | opens where it was left: its last graph and saved state". The glossary's Not saved means only "the autosave has not written the last change". Nothing says whether a first edit changes the sample, copies it, or where the result is kept.
- **New text:** "A sample opens as a copy of itself, and the sample never changes. The copy is marked **Not saved** (tooltip: 'A copy of the {sample} sample. It is kept once you make something in it.'). Nothing is written while the reader only looks, or puts data from a file into it with Replace data, because both can be redone from what she still has; the file chip names the file the copy now holds. The first thing she makes in it -- a run, a style change, a set or a note -- keeps it: it is written to Recent projects under the sample's name, Not saved clears, and the notice says 'Your copy of {sample} is kept in Recent projects'." No new badge: the earlier mocks' "Sample" badge is dropped.
- **Why:** Figma's paved path opens a Community file as a copy straight away and the header says so; a sample edited in place would hand the next visitor someone else's sample, and a copy written on every look would fill Recent projects with untouched samples. Keeping at the first thing made is the point where losing the copy would cost work that cannot be redone from a file. The first-time persona is afraid of breaking things and unsure an action can be undone until she has seen it undone (design/designloom/personas/explorer-elena.yaml, frustrations; study/personas/explorer-elena.md, "Fear of breaking things"). Whether "Not saved" reads correctly on a copy she did not ask for, and whether she notices it clear, is **a hypothesis for the study** (first-look watch list). Two-way door. Drawn in screens/first-look.html, states 2a to 7.

## First look: a data file dropped on an open project also offers Open as a new project; on an unkept sample copy, two choices lead

- **Document and section:** `interaction-pattern-entries.md` 4.5, Behavior, the choice step's data list; `information-architecture.md` 6, the table's "Data" row.
- **Old text:** "**data**: Add data, Add as another graph, Replace data, Join."
- **New text:** "**data**: Open as a new project, Replace data..., Add data..., Add as another graph..., Join.... Each row states its result in one line and commits it; there is no Continue. While the open project is an unkept sample copy, only Open as a new project and Replace data... are shown, and the other three sit under one 'More ways' row that names them. Focus opens on the first row."
- **Why:** `information-architecture.md` 6 says Open never merges and that a drop "offers the same choices" as the explicit commands, yet the drop's list leaves out Open, the one choice that cannot disturb what is open. A first-time reader who drops her own file on a sample most likely wants her file alone or her file in the sample's look; Add data against Add as another graph is a distinction she cannot make yet, and the persona record lists "Overwhelming number of options" and "No guidance on where to start" among her frustrations (design/designloom/personas/explorer-elena.yaml). Which choice first-time readers pick is **a study question** (first-look watch list). Two-way door. Drawn in screens/first-look.html, state 2b.

## First look: the load step carries the chosen action at its top, so a wrong pick needs no second drop

- **Document and section:** `interface-templates.md` 20a, Load step, "Regions and rows" and "Tab order".
- **Old text:** "the format row (`FieldRow`, `StyleSelect` holding the detected format); ..." and "Tab order: format; mapping rows; issues; sample; footer."
- **New text:** "When the load step follows a drop's choice step, a first row, **What happens**, holds the chosen action as a `StyleSelect` (Open as a new project, Replace data, Add data, Add as another graph, Join); changing it re-reads nothing and changes the footer's commit label and its line. Tab order: what happens; format; mapping rows; issues; sample; footer."
- **Why:** the load step offers only Cancel, so a reader who chose Replace data when she meant Open as a new project has to drop the file again, which is the confusion the drop choice step invites on a first visit. Figma's own choose-then-configure surfaces (Export, Swap library) are single surfaces. Two-way door. Drawn in screens/first-look.html, states 3a and 3b.

## First look: one weight-meaning question, in plain words with the role under each answer

- **Document and section:** `interface-templates.md` 20a; reconciles two earlier entries, "Load and characterize: the load step asks what a bigger weight means, in plain words" (since withdrawn by its flow in favor of asking after the load) and "The load step asks what a weight column means, on the weight row".
- **Old text:** the two entries word one question two ways: "A bigger {column} means" with A closer tie, A longer way, More can flow, Not sure yet; and a segmented control of Similarity, Distance, Capacity, Not set.
- **New text:** "If the question is asked in the load step (the owner's choice between this and asking only after the load, which study hypothesis H1 in study/hypotheses/load-and-characterize.md compares), it is one `StyleSelect` on the weight column's row, 'A bigger {column} means', whose four answers each carry the role and its gloss under them: A closer tie (similarity: larger is closer), A longer way (distance: smaller is closer), More can flow (capacity: how much can pass), Not sure yet (paths ignore it; PageRank and communities read it as a similarity). Default Not sure yet; it never blocks Load, and Statistics keeps asking ('weight: unknown' with the same control). A select rather than a segmented control, because four answers with glosses do not fit the panel grid's 240."
- **Why:** the first-time persona does not know "weight", "distance" or "similarity" (study/personas/explorer-elena.md, Vocabulary), so the plain words lead and the role word follows, which keeps `glossary.md` 11's roles on screen for the reader who knows them and rejects nothing the glossary requires. Drawn in screens/first-look.html, state 3b.

## First look: a result read unweighted because the weight's meaning is not set says why, with the verb that sets it

- **Document and section:** `graph-conventions.md`, the Unknown role row; `interface-templates.md` 10, the Result editor's state line; `interface-templates.md` 15 and 3, the requirement note on a catalog row.
- **Old text:** "A weight attribute of unknown role is read unweighted by distance algorithms and as a similarity by similarity algorithms, and a variant mark at the result's name says so."
- **New text:** add: "The mark is the variant word '(unweighted)' at the name wherever the number is read. The result editor adds a line under its state line, 'Unweighted: {column}'s meaning is not set, so paths ignore it.', with one verb, 'Set what {column} means...', which opens the Edges editor on the weight's role. Before the run, the catalog row in Quick actions and in the Results panel carries the same fact as its requirement note: '{column}'s meaning is not set, so it runs unweighted.'"
- **Why:** a reader who has just watched her weights read as numbers will expect the next measure to use them; a bare "(unweighted)" reads as a contradiction or a fault. `principles.md` 1's test asks whether a reader can tell each value's variant without asking; the variant alone answers "what", not "why" or "how to change it". Whether the reason line prevents the confusion is **a hypothesis for the study** (first-look watch list). The fact is the element's (the run record's weight reading); the words are the app's. Drawn in screens/first-look.html, states 6a and 6b.

## First look: three small wording changes on the first visit's path

- **Document and section:** `interface-templates.md` 10, the Result editor row ("the suppression state line ('<channel> set by <layer>', Apply anyway)"); `interface-specification.md` 4.1, Nothing ("the Overview row ('Overview: General') with Replace as its `TrailingSlot`") and `information-architecture.md` 3 ("opened by the Overview row's Replace"); `interface-specification.md` 3, the Attributes section.
- **Old text:** "Apply anyway"; the Overview row's "Replace"; the Attributes section lists every attribute, including an id equal to the label.
- **New text:** (1) the suppression line's verb names what it does: "{Channel} by {result} instead" ("Size by betweenness instead"). (2) The Overview row's trailing action reads "Change overview..." and shows on hover and focus only, as a list row's trailing slot does. (3) The Attributes section leaves out the id row when the id equals the label; the type row already shows it.
- **Why:** (1) "Apply anyway" does not say what it applies, and the reader must guess that it replaces the layer the line names. (2) On a first visit "Replace" sits in the same inspector as the Replace data she has just used and means something else; "Change overview..." names its object, and hiding it at rest keeps the row to its reading. (3) A row that repeats the name above it costs a line and reads as a second fact. Two-way doors. Drawn in screens/first-look.html, states 4, 5 and 6b.

## The load step's ends are set in one place, and endpoints are not roles

- **Document and section:** `interface-templates.md` 20a, the mapping rows.
- **Old text:** "source, target and id columns as `ComboInput` type slots, and each column's kind and role as `StyleSelect`"
- **New text:** add: "The Ends row (two type slots, an arrow between them for a directed file, a dash for an undirected one) and the Direction select are the only controls that set the ends. In the column grid an endpoint column's Role reads 'source', 'target' or 'end' as plain text, and the Role select lists only the roles of `glossary.md` 13 (None, Weight, Node type, Edge type, Time role, Position, Color, Size). Direction reads 'Directed (from -> to)' or 'Undirected'. The legend is 'Ends' in both cases."
- **Why:** with Source and Target also in the Role list, two controls set the same fact and can disagree, and the glossary does not count an endpoint as a role. "From, to" switching to "Ends", and "Directed, from to to", read as typos.
- **Drawn in:** screens/load-step.html, every frame with a column grid.

## The import mapping lists unsettled columns first, with two pickers, not three

- **Document and section:** `figma-crosswalk.md`, the row "The Missing-fonts dialog lists unresolved items".
- **Old text:** "import mapping lists unsettled columns first, each with three pickers: element kind, level and role"
- **New text:** "import mapping lists unsettled columns first, each with two pickers: level (Read as) and role. The element kind is set once for the file: by 'Each row is' (an edge or a node) for a table, and by the file itself for a format that declares it (GraphML, GEXF), where the mapping groups attributes under Node attributes and Edge attributes. A column sorted to the top stays there once settled, so nothing moves while the analyst works."
- **Why:** in a table every column belongs to the element its row is, so a per-column kind picker asks the same question once per column; a column describing one endpoint (a sender's country) is a join, not a mapping. A self-describing format needs no ends, direction or kind rows at all.
- **Drawn in:** screens/load-step.html, frames 2 (confidence sorted first) and 8 (GraphML).

## A dialog leaves out a section that has nothing in it and no command

- **Document and section:** `content-design.md`, Empty surface.
- **Old text:** (the rule forbids "No issues found" lines, but says nothing about the heading of an empty section)
- **New text:** add: "In a dialog, a section with no command and a count of zero is left out, heading and all, as Figma leaves out property sections that do not apply to the selection. The load step's Issues section appears only when there is an issue; while the file is being read, the progress row sits where the issues will appear, with no heading over it."
- **Why:** a lone "Issues" heading over nothing looks unfinished or still loading, and a progress bar under "Issues" implies that reading the file is an issue.
- **To test:** whether an absent Issues section reads as "nothing wrong" or as "not checked yet" (study/hypotheses/load-step.md, H1). If participants misread it, the fallback is a count on the What will load row, not a "No issues" line.
- **Drawn in:** screens/load-step.html, frames 1, 5, 7 and 8.

## The reading line lives in the load step while the step is open

- **Document and section:** `message-catalog.md`, row `load.reading`, the Home column.
- **Old text:** "the canvas load card"
- **New text:** "the load step's progress row while the step is open; the canvas load card after the commit"
- **Why:** `state-matrix.md` 3 (`LoadStepReading`) puts the read inside the step with Cancel in its footer, while the catalog homes the same message on the canvas: the framework disagrees with itself. Before the commit there is no canvas load to show.
- **Drawn in:** screens/load-step.html, frame 5.

## Format and mapping can be changed while the file is still being read

- **Document and section:** `interface-templates.md` 20a, States; `state-matrix.md` 3, Load step, Loading.
- **Old text:** "reading the file's size: progress and Cancel; Load disabled until the size is known"
- **New text:** add: "graphty-element reads the header row and first rows first, so the format and mapping rows are filled, the sample shows, and both are editable while the rest of the file streams. Changing the format, Each row is, the ends or a column's Read as restarts the read from the top, and the progress row says 'Reading again: {what changed}'."
- **Why:** on a 1.5-million-row file the read takes long enough that an analyst who sees the wrong delimiter in the sample should not wait for it to finish, or cancel and reopen. The restart is honest: the counts depend on the mapping. The early header read is the element's (its load preview).
- **Drawn in:** screens/load-step.html, frame 5.

## The parallel-edge policy reads the same in the glossary and the catalog

- **Document and section:** `glossary.md` 12, the last paragraph.
- **Old text:** "the import policy reads \"Parallel edges: Allow / Merge into one\"."
- **New text:** "the import policy reads as `graphty.load.parallelEdges` states it: 'Keep all: {E} edges' and 'Merge into one, {reduction} of {attribute}: {E} edges'."
- **Why:** the two documents disagree, and the catalog's wording is the better one: each option states its result in counts, which is what the analyst is choosing between (2,298 or 1,262 edges).
- **Drawn in:** screens/load-step.html, frame 3.

## A size concern in the load step uses the not-drawn line's words, in the future

- **Document and section:** `message-catalog.md`, a note on `drawn.not`; `interface-templates.md` 20a.
- **Old text:** (the load step's concern wording appears only as the example "edges will not be drawn" in `state-matrix.md` 4.3)
- **New text:** "In the load step a drawing concern is an issue row headed '{N} {kind} will not be drawn', the future of `graphty.drawn.not`, and its line names the command that follows, Narrow the graph..., by its menu name."
- **Why:** the analyst meets the same sentence before and after Load. An earlier draft headed it "Opens undrawn: nodes will not be drawn", which says the same thing twice, and paraphrased the command.
- **Drawn in:** screens/load-step.html, frame 4.

## The load step uses Figma's large modal, wider, with nothing dimmed behind it

- **Document and section:** `interface-templates.md` 20, the table row "Load step | none"; 20a, Figma source.
- **Old text:** "Figma source: none; Figma's import has no mapping or validation step."
- **New text:** "Figma source: the large two-column modal (Manage libraries) for the shell: a header, two columns with a 1px divider, a footer; the body is new. Width 960 (Figma's large modal is 760): the right column keeps Figma's 560 content width for the issues and the sample, and the left column is 400 for the mapping's three-column field grid. No backdrop, as most Figma dialogs have none."
- **Why:** the shell is a close structural match and should be named as the source. The extra width has a graph reason: a sample of four or five columns beside a mapping grid of three, both readable.
- **Drawn in:** screens/load-step.html, every frame.

## compact-mantine: a Select option and a Menu item with a description line

- **Document and section:** `implementation-mapping.md` (the compact-mantine component list); compact-mantine `design/figma-spec.md`, Menu and Select.
- **Old text:** (menu and select items are one 24px line)
- **New text:** "A Menu item and a Select option take an optional description: a second line in secondary ink (11/16), the item growing to fit, the check column aligned with the first line, the description exposed as the item's accessible description. For options whose result must be stated before they are chosen."
- **Why:** the load step's choices are decisions whose consequences are counts (`graphty.load.parallelEdges`, `graphty.load.notNumber`), which one line cannot carry, and a bespoke light dropdown broke the rule that every select list is the dark Mantine Menu in both themes (`interface-templates.md` 21). This is the variant "Previous selection: the Edit menu says what it brings back (withdrawn)" says to propose in compact-mantine first, and the one "The Replace data command names what will wait" already assumes. The kit has it as `.k-menu-item[data-described]`.
- **Drawn in:** screens/load-step.html, frames 2 and 3.

## Run and read: a Quick actions row carries the Catalog row's marks

- **Document and section:** `interface-templates.md` 15, Quick actions, "Regions and rows"; `task-flows.md` 3, the "choose" and "preconditions" steps.
- **Old text:** "input; one list of recents, commands, then catalog entries (`ResultRow`)."
- **New text:** "input; one list of recents, commands, then catalog entries (`ResultRow`). A catalog entry's trailing slot carries what its Catalog row carries: the band word past the background line, a variant word, or a violated-precondition mark with its phrase. A family name typed in the input lists every entry of that family."
- **Why:** `task-flows.md` 3 draws Quick actions through the same check as the Catalog ("Band word shown before running", then the requirement notes). With only a name on the row, the keyboard route skips the one check that stops a wrong choice before the run (Eigenvector on a graph of 3 components). Figma's actions menu shows only an action's name and source, so this is a stated departure for a graph reason: the band and the precondition are facts about this graph, not about the command. The earlier entry "Quick actions marks a measure a style layer already shows" uses the same slot; a precondition mark wins it over that word. Drawn in screens/run-and-read.html, state 2.

## Run and read: an iterative measure is outside the cost gate

- **Document and section:** `state-matrix.md` 4.10, rows 1 and 2, and the paragraph under the table.
- **Old text:** "The gate applies to algorithm entries only."
- **New text:** "The gate applies to algorithm entries that have an exact computation to cap: the catalog's heavy and cubic cost classes. An iterative entry (PageRank, Katz, HITS, eigenvector) has no exact-or-sampled choice, so the gate never refuses it; at 'a few minutes' or longer it is created unrun with Run focused (row 2)."
- **Why:** row 1 says "a gated algorithm entry" without naming which entries are gated, and row 2's "a few minutes or longer" can only ever apply to an entry that row 1 does not catch. Without the rule, PageRank on the 124,318-patent graph on the CPU ("a few minutes", screens/results-panel.html) could be read either as refused with routes it does not have, or as unrun. graphty-element's catalog already declares a cost class per entry (`src/catalog/algorithms.ts`), so the gate can read it; the app decides nothing. Drawn in screens/run-and-read.html, state 12.

## Run and read: every new run passes the cost checks again

- **Document and section:** `interaction-patterns.md` 3.3, the bullet "A live option edit adds one run..."; `task-flows.md` 3, the retune step.
- **Old text:** "An explicit Run or Re-run adds a run ("Run Louvain"). A held edit applies only through Run."
- **New text:** add: "Every Run and Re-run -- after Cancel, after a failure, or with a held edit -- is read against the element's estimate and the cost gate as a Catalog click is. A held edit's band and verdict show on the Run line before Run; past the cap, Run is disabled with the reason (the sample-size entry above) instead of opening the refusal a second time."
- **Why:** a retune changes the cost: a larger sample, a wider scope or a switch from the sampled method to exact can cross the cap, and Re-run after a WebGPU loss runs on the CPU at a different band. If only the first click were checked, the gate would be one misclick deep. The rule costs nothing new: the Run line already shows the held slot and the band. Drawn in flows/run-and-read.html (every loop back into a run joins above the cost gate) and screens/option-form-cost.html, state 3.

## Inspector: the order of Attributes rows, where two sections disagree

- **Document and section:** `interface-specification.md` 3 (the Attributes row: "computed values first") and 4.1a (the Attributes cap: "the attributes a style layer reads, then the label attribute, then file order").
- **Old text:** section 3: "`DataRow`, computed values first, ..."; 4.1a: "4: the attributes a style layer reads, then the label attribute, then file order".
- **New text:** both read: "the attributes a style layer reads, each with a chit of what it paints; then computed metrics, each with its rank as a second line; then file order. The label attribute is not repeated when the type row already shows it as the name."
- **Why:** the two sentences give different first rows for the same node. Rows a layer reads come first because they explain what the canvas shows at the element (module is the color, degree the size); metrics with ranks come next because they are what a reader compares; the rest is file order. The label attribute is already line 1 of the type row. Drawn in screens/inspector.html, state 1: module, degree, betweenness, pagerank, then "2 more attributes".

## Inspector: one Connections row when the graph is undirected with no parallel edges

- **Document and section:** `interface-specification.md` 3, the Connections row; 4.1a, the one-node count.
- **Old text:** "two `ActionRow` counts, **N neighbors** and **N edges**, each split In, Out and All on a directed graph"
- **New text:** "on an undirected graph with no parallel edges, one `ActionRow`, '**N neighbors**', selecting them; otherwise two rows, **Neighbors** and **Edges**, each a `CompoundRow` split In, Out and All on a directed graph." The one-node count drops by one target where the single row applies (21 to 20).
- **Why:** on a simple undirected graph, degree, neighbor count and edge count are always the same number, so state 1 showed "degree 32", "Neighbors 32" and "Edges 32" together, three rows for one fact in a 240 px column capped at 24 targets. That is the default case for most interaction and co-occurrence files. The two counts only carry information when they can differ. Drawn in screens/inspector.html, state 1 (one row) and the last crop (the directed split on a merchant account).

## Inspector: a found path hides Attributes when the type row and Members already show every item value

- **Document and section:** `interface-specification.md` 4.1, the Path, offered row (Attributes "item") and the note on offered variants.
- **Old text:** "Offered variants: ... Attributes shows the item's attributes (a group's name, Profile groups columns, per-scope values), which belong to its run"
- **New text:** add: "On a found path, Attributes shows only item values that appear nowhere else: the weight attribute and the distance on a weighted path. Its ends, hop count and number of equal paths are on the type row and in Members, so on an unweighted path the section is absent."
- **Why:** drawn as specified, the section held four rows ("from TP53", "to SMAD3", "weighted by: hops", "equal paths 12"), each a repeat of the first and last Members rows, line 2's "3 hops" and the stepper's "1 of 12". Four targets of reading with nothing new in them. Drawn in screens/inspector.html, state 7.

## Run layout has one home on an offered set or path

- **Document and section:** `interface-specification.md` 4.1 (the Layout property row on "a set, path, group or found path") and 4.2 (Run layout in the overflow of every set and path kind).
- **Old text:** 4.1: "**Layout**, on a set, path, group or found path, is an `ActionRow` naming the graph's layout method with **Run layout** as its `TrailingSlot`"
- **New text:** "**Layout**, on a kept set or kept path, is an `ActionRow` naming the layout method with **Run layout** as its `TrailingSlot`. An offered group or found path has no Layout row; Run layout stays in its overflow." In the 4.1 table, the two offered rows lose "Layout B" from Property rows.
- **Why:** the command appeared twice on every set and path, and on a 4-node found path the row ("Layout: Force-directed" with a play button) is noise for the task of reading a route. A kept object is where a reader arranges members as a group; an offered one is read and then kept or dropped. Drawn in screens/inspector.html, states 6 (kept set, with the row), 7 (found path, without) and 8 (kept path, with).

## Freeze as fixed set: its icon, a question for the first-click test

- **Document and section:** `interface-specification.md` 4.2, the Set row (Freeze as fixed set); `research/study-schedule.md`, the first-click test of the set inspector.
- **Old text:** (no icon named)
- **New text:** add to the first-click test: "Freeze as fixed set is drawn with a snowflake. Score whether readers who want to turn a rule set into a fixed list pick it, and whether any reader picks it expecting to lock positions."
- **Why:** a padlock, the first drawing, means lock the layer or its positions in Figma and in most graph tools, and the node's type row already has Pin. A snowflake says "stop changing" without either meaning, but it is unproven, so the test decides. Drawn in screens/inspector.html, state 6.

## Styles list: the canvas legend yields to an open editor

- **Document and section:** `interface-templates.md` 13 (Canvas furniture); `state-matrix.md` 8, the Laptop cell's canvas furniture.
- **Old text:** (none: the legend and toolbar never overlap each other, but nothing says what happens when an editor popover covers the legend)
- **New text:** "An editor popover opened from the left panel sits right of the panel, which is where the legend sits. While an open editor or its nested picker covers the legend's box, the legend moves to the canvas's bottom right corner, left of the help button, and returns when the editor closes. A nested picker sits beside the bound row but never over the floating toolbar: it moves up until it clears it. The legend keeps its height cap in both corners."
- **Why:** the legend is the key a reader checks while editing the layer it describes, and in the earlier drawing the editor hid most of it, leaving fragments of blocks showing under the popover. Figma's nested pickers may cover canvas, never chrome. Moving the legend keeps both in view without shrinking either. Drawn in screens/styles-list.html, frames 1, 2, 4 and 10. Two-way door.

## Styles list: an editor header names its layer in full, on two lines if it must

- **Document and section:** `interface-templates.md` 10 (header).
- **Old text:** "header (drawn by `Popout.Panel` from `PopoutHeaderConfig`, naming target and kind ...)"
- **New text:** add: "The name wraps to a second line before it is cut; a name past two lines ends in an ellipsis and carries a tooltip with the full name. The eye, Move up, Move down and close keep their places at the top right."
- **Why:** with four header buttons a 240 px popover leaves about 96 px for the name, which cut "Shortest path TP53 to SMAD3" to "Shortest path TP53..." and "Betweenness color" to "Betweenness col...", against the crosswalk rule that an editor header names its target. Drawn in screens/styles-list.html, frame 2. Needs a `PopoutHeaderConfig` variant in compact-mantine.

## Styles list: what "four rows at rest" counts

- **Document and section:** `state-matrix.md` 7, the Style layers row.
- **Old text:** "**more than 4**: four rows at rest (Overrides when used, the top layers, Base style) and "N more""
- **New text:** "**more than 4**: four rows at rest, counted as Overrides when used, then the top layers, then Base style (with no overrides: the top three layers and Base style), with "N more" between the top layers and Base style. N is never 1, since more than 4 layers leaves at least 2 behind the cut."
- **Why:** the parenthesis can be read as four layer rows plus Overrides and Base style (six rows) or as four rows in all. Measured at 1366 by 768 with 20 sets and 14 layers (screens/styles-list.html, frame 12), four rows in all plus "N more" is 5 rows of Styles and leaves 9 set rows in full, which meets the Laptop cell's "at least four set rows" with room to spare. Two-way door.

## Styles list: an Appearance row is one target

- **Document and section:** `interaction-pattern-entries.md` 4.7; `interface-specification.md` 2.3 (the Appearance section).
- **Old text:** (the row names the winning layer and the value; its drawing is not specified)
- **New text:** "Each Appearance row is the channel's name, then one target: the winning layer's chip, its name, and the value that drove it, as Figma draws a style-applied fill (swatch and style name, no field). Activating the target opens that layer's editor. It has no input box and no second link; writing a value for this one element is the Overrides door, reached from the row's menu, never by typing into the row."
- **Why:** the earlier drawing put the layer's name as a link in the row label and a pill inside an empty input, which read as an editable, variable-bound field with two targets, where the framework says the row only points at the layer. Drawn in screens/styles-list.html, frames 5 and 6. Built with compact-mantine `ActionRow`.

## Styles list: a label layer counts the names that overlap hides

- **Document and section:** `options-and-encodings.md` 6, item 9; `canvas-drawing.md` 8 and 9.
- **Old text:** (none: collision culling is in `scale-levels.md` 2, but the legend does not say when it hides a layer's labels)
- **New text:** add to item 9: "A label layer's block counts the labels collision culling hides at this zoom ("2 hidden where labels overlap"), so a layer that names 12 proteins never silently shows 10."
- **Why:** on the kit's protein network, Hub labels names 12 proteins and the drawing shows 10: CDK1 and EP300 are culled because their labels would overlap those of higher-degree hubs. Before the kit drew hubs in degree order, two labels overprinted into a non-existent protein name ("UEP300"); culling fixes the collision but hides two names without a trace, which `canvas-drawing.md` 8's "nothing is silently incomplete" forbids. The count is graphty-element's. Drawn in screens/styles-list.html, every frame with the Hub labels block.

## Weekly return: a legend runs top first, in the Styles list's order

- **Document and section:** `options-and-encodings.md` 6, "The legend is derived ... one `LegendBlock` per bound channel per layer ..., in stack order"; item 7, the canvas legend.
- **Old text:** "in stack order" (the direction is not said, and mocks drew it both ways: bottom-first under a top-first Styles list, or in neither order).
- **New text:** "in stack order, top first: the block of the layer at the top of the Styles list comes first, as Figma lists layers top first beside the canvas. Object marks (highlights, a path's ends, comparison membership) come before every layer block, because they sit on top of every paint. The exported legend keeps the same order."
- **Why:** the legend sits beside a list that runs top first; a legend that runs the other way makes the reader reverse one of them to match a block to its layer, and "which layer wins" is read from the list. Drawn in every frame of storyboards/weekly-return.html.

## Weekly return: what a partition comparison's agreement is computed on, and where its noise floor comes from

- **Document and section:** `task-flows.md` 8.2, the three trust checks and the Claim; `interface-templates.md` 18; `graph-conventions.md` 4.
- **Old text:** 8.2: "Statistic named: AMI for partitions, Spearman for scores"; "Agreement of a re-run on the same data, beside it". The earlier proposal in this file ("A comparison surface shows the re-run agreement beside the statistic") gives the re-run as one value from one other seed.
- **New text:** "The agreement between two versions is computed on the elements present on both sides, and its row says how many ('on the 2,961 in both'). When the later version holds elements with no edges, a second row gives the same statistic without them. Each side's noise floor is a range over the five seeded re-runs made with that side's run (`graph-conventions.md` 4), never one extra seed: '5 re-runs on March 0.76 to 0.77'. A per-group stability figure names the side it was measured on ('holds in April's 5 re-runs'). The surface reads runs that exist; opening it runs nothing, and the Compare-with picker says so. The Claim states the numbers and what they cover, never a verdict."
- **Why:** two versions with different account sets (39 accounts only in March, 132 only in April in the kit's data) lower AMI whatever happened to the structure, so the statistic must say what it covers; one extra seed makes a single number look like a floor when the kit's five March re-runs already range from 0.759 to 0.768 and April's from 0.811 to 0.851. The second row tests the obvious objection directly: without the 26 accounts that went silent in April the agreement is 0.453 against 0.449, so they do not explain the gap. The storyboard's earlier claim ("larger than a re-run of the same clustering produces") went beyond these numbers and is withdrawn. Drawn in screens/weekly-return.html, the comparison states; numbers in `kit/fixtures.json`, `transactionsApril.agreement`.
- **Element need:** `element-needs.md`, "A partition-similarity measure ... and a multi-seed stability run": the seeded re-runs must be kept with the run and readable by a comparison.

## Weekly return: Replace data refits a replayed layer's domain, and says so

- **Document and section:** `options-and-encodings.md` 5, "The domain is pinned to the scope in force when the layer was made"; `task-flows.md` 8, the replay report.
- **Old text:** "a later filter step never moves it" (silent on a new data version).
- **New text:** add: "Under Replace data a replayed layer keeps its scope and takes that scope's domain on the new data version, because the old domain may not cover the new values. The replay report lists each layer whose domain moved, with both domains ('Degree sizes: domain refit to April, 0 to 842, was 1 to 907'). A filter step still never moves a domain; Fit domain to current scope still does, as one undoable command."
- **Why:** in the kit's April data the maximum degree fell from 907 to 842 and 26 accounts have degree 0, which March's domain (1 to 907) does not cover. Keeping the March domain would paint April values against a key that no longer describes them; refitting silently would change the picture between months without a word. Drawn in screens/weekly-return.html, the replay report.

## Weekly return: elements with no edges in a new data version are an issue of the load step

- **Document and section:** `interface-templates.md` 20a, the issues list; `interface-specification.md` 4.1, the Nothing kind's mark rows; `task-flows.md` 8, the replay report.
- **Old text:** the issues list names parallel edges and binding problems; isolated nodes appear only as a Statistics mark row after commit.
- **New text:** "When a node table brings nodes that no edge touches, the load step's issues list counts them before commit, says how many were present in the previous version and how many are new, and routes to their rows (Show rows). The replay report repeats the count beside the component and community counts it explains ('Components 1 to 27: one holds 3,067 accounts; the other 26 are the accounts with no transfers'; '65 communities, 39 with transfers, 26 single accounts with none'). They keep their previous positions."
- **Why:** in the kit's April data 26 March accounts have no April transfer. They split the graph from 1 weak component into 27 and make Louvain's count jump from 35 to 65 (each is a community of one). An analyst who meets either number without the reason stops trusting the replay; the reason is one count. Isolated nodes are already a trust check (`top-tasks.md` 1). Drawn in screens/weekly-return.html, the load step and the replay report.

## Weekly return: a number column's header shows its sum over the rows in scope

- **Document and section:** `interface-templates.md` 16, the table; the column profile.
- **Old text:** a column's profile shows its range ("1 to 36").
- **New text:** "A currency or count column's profile shows its sum over the rows in scope ('sum $228,362.79'); other numeric columns keep the range. The sum is the element's scoped read, never computed by the app."
- **Why:** an investigator checks a tool against her own pivot table by the total, not by the range: in the storyboard the 26 transfers of the seven new accounts sum to $228,362.79, the number she compares. Without it she exports to Excel to check, which is the workaround the tool should remove. Untested: the study should see whether analysts look for a total in the header or in a footer row. Drawn in screens/weekly-return.html, the follow-up state.
- **Element need:** a scoped sum read on an edge or node attribute (new row beside "A ranking read for a metric result").

## Weekly return: an exported figure carries a caption line

- **Document and section:** `canvas-drawing.md` 13, Exported figures; `options-and-encodings.md` 6 item 7.
- **Old text:** "The legend is drawn in, in full, from section 8's description." (silent on scope and data version)
- **New text:** add: "Under the drawing, a caption line names the graph, its data version (with its files) and the scope with its counts ('Transfers, April data (accounts-2026-04.csv, transfers-2026-04.csv). Ring community, April and 2 steps in: 157 of 3,093 accounts, 213 transfers.'). It is part of the figure, like the legend, and written from the same records as the methods text."
- **Why:** journey 2's Publish stage asks "Does the figure carry its scope and legend?", and a figure pasted into a slide loses everything the app showed around it. A filtered figure without its scope reads as the whole network. Drawn in screens/weekly-return.html, the Export state, and in the storyboard's outcome slide.

## Weekly return: the comparison surface on a short window

- **Document and section:** `interface-templates.md` 18, States; `state-matrix.md` 3, the short-window row.
- **Old text:** "States: readings per side (`state-matrix.md` 8)." (silent on width)
- **New text:** add: "Below a 1440 px wide window, entering the surface closes the left panel (its rail button reopens it), so each side keeps about 530 px. Each side's header is one line and truncates its readings before its version name. Selecting a difference-list row scrolls it into view. On a side narrower than 480 px the legend folds to its title row, opening on click."
- **Why:** shot at 1366 by 768 (the fraud and analyst personas' laptops), the surface keeps both sides and the list, but each side is 413 px wide with a 3:2 drawing 275 px tall; the legend covers about a third of side A; the side headers wrap to two lines; and the selected row, ninth by change, sits below the fold. Screenshot: shots/screens__weekly-return--compare-1366.png.

## Words: a style layer's automatic name says "Style layer", and the Results panel's Find field names algorithms

- **Document and section:** `content-design.md` 3, Names ("automatic names are kind plus counter ('Set 1')"); `glossary.md` 7, style layer ("Always two words"); `interface-templates.md`, the Results panel's search field.
- **Old text:** content-design gives "Set 1" as the only example; the mocks named a new layer "Layer 1" and its undo entry "Color Layer 1 by log2FoldChange". The Results panel's field read four ways across the mocks: "Find a result or method", "Find a result or an algorithm", "Find a result or algorithm" and "Search results and catalog".
- **New text:** "automatic names are kind plus counter ('Set 1', 'Style layer 1'); a style layer's kind is two words wherever it is named." The Results panel's field placeholder: "Find a result or algorithm".
- **Why:** glossary 7 rejects "layer" alone, and the name of a new layer is the first place an analyst reads the word. "Method" is a layout's word (glossary 14, "algorithm"), and "Search" is Find's alias (glossary 13, 14). Drawn in screens/colour-by-value.html and every Results panel mock.

## Words: "Detach" on a result's Weight collides with the Detached state

- **Document and section:** `glossary.md` 14, "detach" ("The freshness state 'Detached' only; fixing a bound channel is 'Fix at <value>'"); the entry above, "Failure and recovery: a result's Weight is a value bound to the column, with Detach for one run".
- **Old text:** that entry's command "Detach" and row text "Detached from Edges".
- **New text:** (a question for the owner, not decided here) either keep Figma's "Detach" for this one per-run override and add it to glossary 14 as a second sense, or name the command after what it does, as "Fix at <value>" is named: "Set weight for this run", with the row reading "Weight set for this run".
- **Why:** on the same result's state line "Detached" means "what it referred to was deleted" (glossary 10), and the prediction test (content-design 9) would put the two side by side. Drawn in screens/weight-role-trap.html, state A3, whose tooltip reads "Detach: read value another way for this run only".

## Data: the March transfers have no parallel edges in the fixture, but the load mocks show 412

- **Document and section:** none in the framework; the prototype kit (`kit/gen-canvas.mjs`, the transactions dataset) against screens/load-transfers.html and flows/load-and-characterize.html.
- **Old text:** the fixture's statistics for transfers-2026-03.csv read "parallel edges 0" (shown in screens/preferences.html and screens/take-a-note.html); the load mocks read "412 extra parallel edges", "Keep all: 9,113 edges" and "Merge into one, sum of amount: 8,701 edges".
- **New text:** (for the studio) generate the March transfers with repeat transfers between the same accounts, 412 beyond the first, so both readouts come from one file; until then the Statistics mocks and the load mocks describe two different files.
- **Why:** content-design 5, "Counts are exact"; the same file cannot have 0 and 412 extra parallel edges, and a reader who follows the storyboard from the load to the Statistics sees both.

## Keys: one spelling, and Quick actions is Mod+K on every page

- **Document and section:** `interaction-pattern-entries.md` 9.3 ("Mod everywhere"); `content-design.md`, where a shortcut is printed in a menu or a tooltip.
- **Old text:** (9.3 says chords are written Mod; it does not say how a printed chord is spelled, and it names Quick actions' chord only by role)
- **New text:** add to 9.3: "A printed chord joins its keys with + in the order Ctrl, Alt, Shift, key (`Ctrl+Shift+Z`), names the platform's modifier (Ctrl, or Cmd on macOS; Mod only in design prose), and spells the key as the keyboard labels it (`Delete`, `Esc`, `Enter`). The Quick actions chord is Mod+K."
- **Why:** the mocks printed the same command four ways ("Ctrl Z", "Ctrl+Z", "Mod G", "Del"), and Quick actions was Mod+K in every Edit menu but Mod+/ in the keyboard storyboard and the walk mock, so a participant who learned the key from one page was wrong on the next. Mod+K is what `graphty/src/components/shell/bindings.ts` binds today and what the Figma research lists as the shortcut a Figma user brings; Figma's own Mod+/ was the other candidate. This is the app's chrome chord, not the element's published keymap, so it is a two-way door; all pages now print Mod+K.

## FOR DECISION (published keymap): printed chords that the app's never-bound list forbids, or that the app binds to something else

- **Document and section:** `one-way-doors.md` 65 (the default keymap); `graphty/src/components/shell/bindings.ts`, `NEVER_BOUND_CHORDS` and the command table.
- **Old text:** (the mocks print these chords; the framework names none of them literally)
- **New text:** one decision per chord, each either kept (and removed from `NEVER_BOUND_CHORDS`, with the reason that Figma takes it in the browser too) or replaced:
  - Find: Mod+F (screens/find.html, flows/find-and-expand.html). `NEVER_BOUND_CHORDS` keeps Mod+F for the browser's own find; the app opens its search with `/` today. Figma takes Ctrl+F, and the framework's research lists it among the shortcuts a Figma user brings.
  - Rename and Duplicate on a row: Mod+R and Mod+D (screens/find-and-expand.html, a set's row menu). Both are never bound today (reload, bookmark). Figma takes both.
  - Neighbors, its main action Filter to neighbors: Shift+N (printed on the Neighbors button's tooltip and on the Filter to neighbors row of its menu in screens/inspector.html, screens/alert-triage.html and screens/find-and-expand.html; it moved with the main action from Select neighbors after round 2). The app binds Shift+N to Show notes and Shift+E to Select neighbors.
- **Why:** each chord printed in a mock reads as decided to a study participant, and each of these contradicts a rule the app enforces in code. Keeping Figma's chords serves the Figma-trained analyst the design targets; keeping the never-bound list protects browser keys every web user relies on. The keymap is published behavior: the owner decides. Until then the mocks keep the chords they print, so the study can hear whether anyone reaches for them.

## Keyboard walk: the Delete announcement uses the command's verb

- **Document and section:** this file, "Keyboard walk: Delete on a focused node that is not selected says so" (amended in place above).
- **Old text:** "'Nothing deleted; {label} is not selected.'"
- **New text:** "'Nothing removed; {label} is not selected. Space adds it.'"
- **Why:** Delete on elements runs Remove (`interaction-patterns.md` 3.6), so the announcement names that verb, and 3.6 also requires it to name the key that selects the focused node. The walk flow already said "Nothing removed" with the key while the storyboard and the walk mock said "Nothing deleted" without it; all three now match.

## Accessibility: two tokens the AA set is missing

- **Document and section:** `visual-language.md` A8 ("The chrome meets WCAG 2.2 AA by default"); compact-mantine `design/figma-spec.md` 2.9, the second table (tokens awaiting the owner's approval).
- **Old text:** 2.9 lifts `--cm-bg-danger` but not `--cm-text-danger`, and keeps `--cm-border-selected` at #0c8ce9 in dark.
- **New text:** add two rows to 2.9's second table. `--cm-text-danger`: light #dc3412 to **#bd2915** (the value `--cm-bg-danger` already takes), dark unchanged. `--cm-border-selected` (the focus ring): dark #0c8ce9 to **#7cc4f8** (the dark `--cm-border-selected-strong`, which the Switch's focus ring already uses), light unchanged.
- **Why:** measured on the mocks. Danger text such as a run's "Failed" is 4.24:1 on a field or panel fill (#f5f5f5) and 4.11:1 on a selected row (#e5f4ff), under the 4.5:1 that WCAG 1.4.3 asks; #bd2915 gives 5.52:1 and 5.36:1. The dark focus ring is 2.77:1 on a selected row (#394360), under the 3:1 of WCAG 1.4.11, and a keyboard user's focus is on a selected row most of the time; #7cc4f8 gives 5.18:1 there and 7.39:1 on the panel. Both are one-line token changes, not doors. The mock kit draws both values already (`kit/kit.css`, top), so every mock shows the fixed state; delete those two lines when compact-mantine takes them.

## Accessibility: a selected row is marked by a fill alone

- **Document and section:** `visual-language.md` A3 ("Color is never the only signal"); `figma-crosswalk.md` 4.3 (departures for accessibility).
- **Old text:** A3 lists a stale set, an invalid field and a failed run; it says nothing about the selected state of a row.
- **New text (decision owed):** add to A3: "A selected row (a list row, a table row, a tree row) carries a mark besides its fill: a 2 px bar at the row's start in `--cm-border-selected-strong`." Record it in `figma-crosswalk.md` 4.3 as a departure from Figma.
- **Why:** the selected fill is #e5f4ff on #ffffff, 1.12:1, and #394360 on #2c2c2c, 1.43:1. That is a hue difference with almost no lightness difference, so on a washed-out laptop panel, in sunlight, or with a color vision deficiency the selected layer, graph or table row can vanish; WCAG 1.4.1 and 1.4.11 both ask for more than that. Screen readers are covered (`aria-selected`), sighted keyboard and mouse users are not. The mocks do not draw the bar yet, because Figma does not and this is the owner's call; it is a style change in compact-mantine's row components, reversible.

## Accessibility: target size of the tool caret and a row's checkbox

- **Document and section:** `interface-specification.md`, the toolbar and the filter step row; compact-mantine `design/figma-spec.md`, the toolbar tool with a caret and the Checkbox inside a Tree row.
- **Old text:** the caret is 16 x 32 and overlaps its tool by 7 px (Figma's drawing); a row's checkbox is 12 x 12.
- **New text:** "Every pointer target is at least 24 x 24, or has 24 px clear of any other target (WCAG 2.5.8). The tool caret keeps its 16 px drawing and gets a 24 px wide hit area that extends away from the tool, never over it. A checkbox inside a row gets a 24 x 24 hit area centered on its 12 px box, and a click there toggles the checkbox, not the row."
- **Why:** the caret's 24 px circle lands on the tool's own target, and the checkbox's lands on the row it sits in, which is itself a target (a click selects the step). Both fail 2.5.8's spacing exception. The rest of the chrome passes: icon buttons are 24 x 24, tools 32 x 32, rows 32 tall, the toast's dismiss 33 wide. The mocks' own page controls (state switchers, jump lists) were raised to 24 px in `kit/kit.css`.

## Accessibility: a read-only value is drawn in full ink, never as disabled

- **Document and section:** `visual-language.md` A3, the sentence "A channel row whose value cannot be read at this size keeps normal ink ... never dimmed, because disabled ink reads as unavailable and fails 1.4.3"; `interface-templates.md`, the style layer editor opened from a run's layer and the encoding popover opened read only.
- **Old text:** as quoted; nothing on read-only fields.
- **New text:** append to A3: "The same holds for a value someone can read but not change here (a run's layer, an encoding opened read only): it is drawn in normal ink inside a 1 px `--cm-border` outline with no fill, and disabled ink is kept for a control that is off."
- **Why:** the Styles list mock drew six read-only values ("Applies to: has a betweenness value: 300 proteins", "Scale: Log", "Palette: Orange to brown") in disabled ink, 2.09:1 in light and 3.53:1 in dark. Those are facts the reader came to the editor to read, and WCAG's exemption covers only inactive controls. The kit now has `k-field[data-readonly]` and the mock uses it (`screens/styles-list.html`).

## Accessibility: an inline command is underlined

- **Document and section:** `visual-language.md` A1, the accent's allow-list entry for links; compact-mantine's Anchor.
- **Old text:** links are brand-colored text; the kit's `k-link` had no underline.
- **New text:** "A link or text command that sits in or beside a line of text ("Re-run", "Show first rows", "Apply anyway") is underlined, offset 2 px."
- **Why:** the brand color against the secondary ink it usually follows is 1.1:1, so color alone does not say "this is a command" (WCAG 1.4.1, which asks 3:1 between a link and its text or a non-color cue). The kit's `k-link` and the legend's not-drawn link are now underlined in every mock.

## Accessibility: a scroll area with nothing focusable in it takes focus

- **Document and section:** `interaction-pattern-entries.md` 9.1, Focus regions.
- **Old text:** (none)
- **New text:** "A scroll area whose content holds no Tab stop (the inspector's Attributes, a long legend, a message's detail) is itself focusable when it overflows: `tabindex="0"`, `role="region"` and a name, so the arrow keys scroll it."
- **Why:** WCAG 2.1.1. Chromium and Firefox now make such a scroller focusable on their own; Safari does not, so a Mac keyboard user could not read a node's 40 attributes in the inspector. The automated check flags such areas on 20 mock pages; in the product most of them hold rows, which are focusable, so the rule matters only for read-only content.

## Keyboard walk: a region that keeps focus names its active item

- **Document and section:** `interaction-pattern-entries.md` 9.1, "The rail and the toolbar are each one Tab stop with a roving focus moved by the arrows."
- **Old text:** as quoted; silent on how the roving item is exposed.
- **New text:** append: "When the region's container keeps DOM focus, it points at the focused item with `aria-activedescendant`, and each item has a role and a name; otherwise focus moves onto the item itself (roving `tabindex`)."
- **Why:** the keyboard walk mock drew a focus ring on the roving item while DOM focus stayed on the container, which a screen reader cannot follow: it announced the container and never the item. The mock now sets `aria-activedescendant` on the rail, the Graphs and Styles lists, the toolbar and the inspector, and gives each item a role and a name (`screens/keyboard-walk.html`). compact-mantine's `shell/roving.ts` should say which of the two it does.

## Accessibility: chart bars in the chrome meet 3:1, and a selected bin is more than a hue

- **Document and section:** `visual-language.md` A10 ("Neutral bars, the accent only on a selected bin").
- **Old text:** as quoted; the bar color is not named, and the kit drew bars in `--cm-icon-tertiary`.
- **New text:** "Neutral bars are `--cm-border-translucent-strong` (3.36:1 on the panel in light, 3.42:1 in dark). A selected bin is the accent and also carries a bracket under it, as a data-paint band does."
- **Why:** a histogram's bars are the information (WCAG 1.4.11 asks 3:1); `--cm-icon-tertiary` is 2.12:1 in light. And the accent against the neutral bar is a hue change of 1.6:1 in lightness, so the selected bin is told by color alone (1.4.1). The kit's `k-hist` and `k-spark` now use the stronger neutral; the bracket is not drawn yet.

## Keyboard walk: Shift+Arrow walks, plain arrows stay on the camera

- **Document and section:** `interaction-pattern-entries.md` 9.2 and its modes table, the canvas-walk row; the matching entry in graphty-element's list of needs.
- **Old text:** "The arrows walk; the camera has no arrow binding", and the element need "The plain arrow keys moved from the camera to the walk".
- **New text:** "Shift+Arrow walks between neighbors; plain arrows orbit (3D) and pan (2D); Shift+Enter steps back; Esc leaves the canvas." Drop the element need that moved the plain arrows.
- **Why:** the owner decided this on 2026-09-28. Drawn in `screens/keyboard-walk.html` and `storyboards/keyboard-only.html`.

## Keyboard: Enter opens, Space selects, Ctrl+Y redoes

- **Document and section:** `interaction-pattern-entries.md` 4.2; the key table in `interaction-patterns.md`.
- **Old text:** Enter on a focused node replaces the selection with it; Redo is Mod+Shift+Z only.
- **New text:** "Enter on a focused node opens its inspector and never replaces the selection. Space toggles the node in or out of the selection. Ctrl+Y is an alias for Redo off macOS." Also propose two keymap roles for graphty-element's published list of default key bindings, which the "?" key sheet renders read only: walk back (Shift+Enter), and the neighbor-order switch (edge weight, degree, name).
- **Why:** three of three keyboard participants lost a selection when Enter replaced it; two of five pressed Ctrl+Y to redo and nothing happened. The keymap roles are published names in graphty-element, so they are for the owner to accept.

## A number names its set only when the set departs

- **Document and section:** `content-design.md` section 5, Numbers (a new bullet after "Counts are exact"); `message-catalog.md`, "Template words", the slot list, and every count key.
- **Old text (content-design.md 5):** only ranks name a scope: "the scope follows by the state-line rule, only when it differs from the chip ("#3 of 5,310, on: full graph")". Nothing says when a count, a range or a statistic names the set it was counted over, whether a range names its column, or what "degree" means on a directed graph.
- **New text (content-design.md 5, a new bullet):** "**A count, range or statistic names its set only when the set departs**: when it is not the current graph's set (the chip's), or when the same measure appears elsewhere on screen over a different set -- then each names its own ("0.0868, on: full graph" and "0.0865, on: without its self-loop"). The form is the rank's: ", on: {set}". A range always names its column ("log2FoldChange -2.52 to 3.15"). Two columns never share one display name: a column from a second file keeps its own name ("log2FC, qPCR file"). Degree on a directed graph is always in, out or total, in every header, legend and statistic. A drop between a file and the graph is said in words beside the count: "298 nodes -- 2 proteins in the file have no interaction"."
- **Old text (message-catalog.md, Slot types):** "`{N}`, `{K}`, `{L}` and the like: counts, formatted by `content-design.md` 5."
- **New text (message-catalog.md, Slot types, added):** "`{set}`: the set a count, range or statistic was computed over, a glossary term or an object's row name (full graph, filtered graph, selection, {object}). Every count key (`graphty.<area>.<message>`) takes it as an optional parameter, `params.set`; the message prints ", on: {set}" only by the rule in `content-design.md` 5. The app never appends a set as its own string: the set is part of the published message, so a screen reader, a copy and an export all carry it." For example `graphty.statistics.components` with `{ N: 28, set: "filtered graph" }` reads "28, on: filtered graph".
- **Evidence:** the most severe finding of round 1 (severity 4; 14 sessions, 10 participants; `study/round-1/insights.md`, "A number that is not labelled with what it was counted over reads as a contradiction"). 298 against 300 proteins, two fold-change ranges from two files (-2.41 to 2.98 and -2.52 to 3.15), "degree" meaning the filtered graph in one column and the full graph in another, and "largest component 28" under a filter were each read as a contradiction; one participant nearly reported 28 where the answer was 76. Marking a number only when its set departs keeps principle 5 (marks appear only on departure): at rest, on the full graph, no number carries a set.
- **Built:** the mock kit applies the rule to every number bound to the fixtures (`kit/kit.js`, `data-fx-set`; `kit/README.md`, "kit.js"). The "on:" form is a proposal; the message keys are published, so the wording of the suffix is the owner's call, and the parameter name `set` is proposed with it.

## A number that follows the filter chip carries a mark while filtered

- **Document and section:** `information-architecture.md` section 2; `content-design.md` 5 (the set rule, "A number names its set only when the set departs", above); `interface-templates.md` 7, Filter chip and its steps, Regions and rows; `message-catalog.md` (one new key).
- **Old text:** (none; the chip is the only scope mark, and a step row says nothing about what later steps did to its result)
- **New text (information-architecture.md 2 and content-design.md 5):** "While the filter chip reads anything other than 'Full graph', every number that follows the chip carries the chip's own glyph (the funnel, 12 px, body ink) after the value: each Statistics reading, the header of a table column computed on the filtered graph, the legend's block title (for its counts), and a set's count. The Statistics scope line and the table's scope line lead with the same glyph, so the mark is explained where it first appears. The glyph's tooltip is 'Follows the filter chip: counted on the filtered graph, {kept} of {total} {kind}'; its accessible name is the set suffix, 'on: filtered graph' (the `set` parameter, so a screen reader, a copy and an export carry the words, not the glyph). A number over the full graph (the Graphs row's count, a 'degree, on: full graph' column) carries no glyph, and at rest on the full graph no number carries one."
- **New text (interface-templates.md 7, added to the step row):** "A step whose result a later step changed carries a second line on its row, in body ink, naming the later step as it reads in the list: for Largest component, 'Split into {K} pieces by "{step}"'; for a degree rule or a k-core, '{N} dropped below degree {k} by "{step}"' ('below {k} neighbors' for a k-core). Several causes join with 'and'. The line is part of the row's accessible name, is repeated in the step's rule editor below Result, and disappears while the step is off. It never appears for a rule on a stored attribute (group, label), whose result no later step can change."
- **New key (message-catalog.md):** `graphty.filter.stepChangedLater`, with `{kind}` (split, belowRule), `{K}` or `{N}`, `{k}` and `{steps}`. The record that says which later step changed which earlier one is graphty-element's (its per-step record, `element-needs.md`, "Ordered filter steps"); the app only prints it.
- **Decided here (two-way door):** the mark is the chip's funnel, not the text suffix, because the suffix on seven Statistics rows and every column header would double their width; the text stays the spoken and copied form. Where several numbers share one scope in one block (a column, a legend), the mark sits once on the block's header, not on every cell.
- **Wording changed from the study's note:** the note wrote "by Remove group 8"; the glossary reserves Remove for taking nodes out of the data, so the line quotes the step's own label, "Filter out group = 8".
- **Why:** "Largest component 28" followed by "4 components" read as a contradiction under a filter; 3 of 5 get-back sessions doubted a correct fix because "Filter to Largest component" stayed ticked while Statistics showed 4 components (`study/round-1/insights.md`, D1 and D10). Drawn in `screens/filter-chip.html`: One step off shows "Split into 4 pieces by "Filter out group = 8"" beside Statistics' 4 components, each carrying the mark; Largest component in the middle shows "Split into 3 pieces by "Filter out label = Javert""; Three steps shows "3 dropped below degree 5 by "Filter out group = 8"".
- **Open for round 2:** whether readers read the funnel as "counted on the filtered graph" without its tooltip; if not, the text suffix returns on the Statistics scope line only.
- **Withdrawn in part (round 2):** the step-row line naming a later step ("{N} dropped below degree {k} by "{step}"", key `graphty.filter.stepChangedLater`) is withdrawn; a step is never explained by a later step. See "Filter chip and its steps: a step's note says what it keeps, in secondary text", below. The funnel mark on numbers that follow the chip stays.

## The weight-meaning question moves from loading to the first run that needs it

- **Document and section:** the load step and `options-and-encodings.md`; `glossary.md`, the weight-role table (around line 336).
- **Old text:** the load step asks what each weight column means; the glossary's role row reads "**unknown** -- paths ignore it; PageRank and communities read it as a similarity".
- **New text:** the question is asked in the option form of the first run that reads a weight -- "In confidence, does a bigger number mean a stronger tie, a longer distance, or an amount that flows?" with Stronger tie / Longer distance / An amount that flows / Not sure -- decide later -- and the answer is stored on the attribute, so it is never asked twice. The displayed role "unknown" becomes "not set"; the stored value is unchanged.
- **Proposed, not decided:** whether "not set" should mean unweighted for every algorithm, instead of today's two behaviours (paths ignore it; PageRank and communities read it as a similarity).
- **Why:** at load, non-specialists had no reason to care yet and left the default; in the weight-trap sessions "unknown" hid two different behaviours.

## The load summary names a drop in words

- **Document and section:** `interface-templates.md` 20a, Regions and rows, the counts ("What will load"); `message-catalog.md`, the load rows.
- **Old text:** the counts region shows nodes and edges, and a rows-dropped figure only when rows were dropped.
- **New text:** add: "When the nodes that will load are fewer than the file names, one line under the counts says why, in words, with the names when there are a few: '298 nodes -- 2 proteins in the file have no interaction: GSK3B, NOTCH1'. The noun is the file's own when graphty-element knows it (proteins, accounts), else 'nodes'. Past about five names the line counts them and routes to the rows."
- **Evidence:** round 1, the most severe finding (`study/round-1/insights.md`, "A number that is not labelled with what it was counted over reads as a contradiction"): in three of the five sessions on the protein file, 298 nodes against a file called core-300 was read as data loss with no reason given ("If this was 1,400 suppliers and it said 1,398 I'd want to know which two").
- **Open:** whether proteins listed in the file with no partner should load as isolated nodes (keeping every value, as the rule for load issues prefers) instead of being left out. Drawn in screens/load-step.html, frames 2 and 3, as left out.

## Add data warns when the file has the loaded data's columns, and offers Replace data

- **Document and section:** `interface-templates.md` 20a, the issues list; `task-flows.md` 8, the load step of Replace data; `interface-templates.md` 20a, "Tab order".
- **Old text:** Add data shows match counts (matched, new) and the size after the merge; nothing asks whether the analyst meant Replace data.
- **New text:** "When Add data is given a file whose columns are the loaded data's, the issues list opens with a warning: 'Same columns as {file}, the data already loaded', a line giving what Add data and Replace data would each leave, in counts, and a button 'Replace data instead' that turns the same step into Replace data (title, commit verb, undo label) without reading the file again. It is a warning: Add data stays on. Focus opens on that button. The match counts gain 'not in {file}' whenever it is not zero."
- **Why:** round 1 (`study/round-1/insights.md`, "The weekly refresh: Add data double-counts and Replace cannot be found"): three of three weekly-refresh participants reached for Add data and stacked two snapshots (17,483 edges from 9,113 and 8,370); one only caught it because the total disagreed with his query. Focus on the button departs from "focus lands on Load when nothing blocks" (the entry "where focus lands in the load step") because Enter on the default commit is exactly the mistake observed. Two-way door. Drawn in screens/load-step.html, frame 7.

## Betweenness weight field copy

- **Document and section:** the Betweenness option form copy (`options-and-encodings.md`).
- **Old text:** "Betweenness and Closeness read no weight."
- **New text:** "Read as a distance. Not used while its meaning is not set."
- **Why:** the old line contradicts `graph-conventions.md`, which lists Betweenness among the algorithms that read a weight as a distance.

## The state line shows the weight; Details holds the run record

- **Document and section:** `principles.md`, the state line.
- **Old text:** the state line carries an "Unweighted" token; the contents of Details are not defined.
- **New text:** "The weight column and its role take the place of the 'Unweighted' token, for example 'confidence as similarity'. The conversion, seed, damping and normalization stay under Details." Define Details as the run record: method, seed, damping, normalization and weight conversion.
- **Why:** participants could not tell which weight role a result had used; the line gets no longer. Extending the line with the seed and the rest was considered and rejected.

## A count selects what it counts: decided

- **Document and section:** `interaction-pattern-entries.md` 4.3.
- **Old text:** "a count selects what it counts" is marked provisional.
- **New text:** mark it decided, and add: "Mod+Enter on a count opens that set in the table."
- **Why:** component, isolate and path-hop counts were dead ends in round 1; people tried to open them.

## Relabelled exports and commands in the command register

- **Document and section:** `output-homes.md` section 3.
- **Old text:** "export-table" and the header's Export share one label; the comparison has its own 100-row overflow export; "shortest-path" is reached from one node; the Overview row offers "Replace".
- **New text:** "export-table" is labelled "Export table as CSV..." and writes every row, the original ids and the scope-and-method headers; the header's Export is labelled "Export files..."; the comparison's overflow export is removed; "shortest-path" is labelled "Paths between..." (id unchanged) and gains a two-node selection as a starting place; the Overview row's "Replace" becomes "Change overview...".
- **Why:** two unlabelled Export buttons and a hidden capped export; the path tool was found by nobody from a two-node selection; "Replace" read as destructive.

## Comparing two results goes to the table's Scatter view; Notes on every inspector

- **Document and section:** `output-homes.md` section 2.
- **Old text:** comparing two results opens a second canvas.
- **New text:** "Comparing two results opens the table's Scatter view, rank against rank, with rank 1 at the top left. A block of tied values is one labelled band. Kendall tau-b is the headline number when ties exceed 10% of either side, and Spearman is then labelled '(ties inflate this)'; otherwise one number is shown. The second canvas remains for comparing two drawings." Add: "Every inspector has a Notes section, always."
- **Why:** two coloured drawings did not answer "do these agree", and with 212 nodes tied at zero the Spearman headline was inflated -- a wrong number. The first note had no obvious place to go.

## How a rank is shown

- **Document and section:** the results panel in `interface-specification.md`.
- **Old text:** (none; ranks are shown as single positions)
- **New text:** "An exact run gives equal values a shared rank ('3='). A sampled run shows a rank range from its own error bound ('#3 to #6') and a stability sentence ('Ranks below 20 may swap between runs')." No default tolerance for near ties is proposed.
- **Why:** the "how sure is this" finding (severity 4, 13 sessions). A fixed near-tie threshold was rejected: the tool should not invent one.

## Find matches an id exactly

- **Document and section:** `message-catalog.md`, row `find.none`.
- **Old text:** `0 matches[; Closest: {value}]`
- **New text:** keep the message, and add to its rule: "A query shaped like an id (letters, digits and dashes, no spaces) matches exactly and is never offered 'Closest'."
- **Why:** in the fraud task a near miss on an account id offered a different customer's account -- a wrong answer, not a near miss.

## Renamed strings on published keys

- **Document and section:** `message-catalog.md` and the option-form copy in `options-and-encodings.md`.
- **Old text -> new text:** "Budget" -> "Time limit"; "Starting point" -> "Share the setup, without data"; "Use current" -> "Add current value" (it keeps the old value); "no node with this id" -> "Not in this network: {id}"; "Replace" on the Overview row -> "Change overview..."; "Exact" keeps its word with the gloss "Computed on every node, not estimated", and a run on a subgraph reads "Exact, on {scope}".
- **Why:** "budget" was read as money; nobody found the recipe as "Starting point"; "Use current" read as rewriting evidence; "Replace" read as destructive; "Exact" was read as covering the whole graph and as "certain". The keys are published, so the wording is the owner's call; the keys do not change.

## Sharing the setup without data removes figures and tables

- **Document and section:** the export dialog in `interface-specification.md`.
- **Old text:** choosing the recipe export leaves figures and tables selectable.
- **New text:** "Choosing 'Share the setup, without data' turns off and disables every kind that carries data, and says 'Figures and tables are off: they would show your data.'" This is a removal, not a warning.
- **Why:** an export meant to carry no data could still carry a picture of the data -- a privacy bug.

## A fact the reader acts on is never caption gray

- **Document and section:** `visual-language.md`, A4, Type (a new sentence), and A3's "secondary ink" examples.
- **Old text (A4):** "figma-spec 2.3's roles; emphasis by weight, never size or color; nothing uppercase." Nothing says which text may take secondary ink; in practice the mocks, and the compact-mantine defaults they follow, set the filter chip, the scope line of the table, the legend's not-drawn line, the file's location and scope suffixes ("on: filtered graph") in secondary ink, and at the 9/14 caption role in places.
- **New text (A4, added):** "**A fact the reader acts on is set in body ink** (`--cm-text`), at the body role or larger: where the data is, the filter chip, a scope or set suffix, the table's scope line, the not-drawn line, and any count a reader compares with another. Secondary ink is for truly secondary notes -- an origin word, a unit repeated from a header, a hint -- and tertiary for off and waiting states (A3). Emphasis stays by weight; this is a rule about which ink, not a new emphasis."
- **Evidence:** severity 2, repeated across tasks in round 1 (`study/round-1/insights.md`): participants missed the chip, the scope line and the not-drawn line where each held the answer, because they were small grey text; the privacy line was praised on the start screen and not found once a graph was open.
- **Built:** `kit/kit.css` sets `k-chip`, `k-scope` and `k-notdrawn` in body ink and adds `k-fact` for any other such fact; every mock that uses those classes follows. Caption grey remains in the kit for truly secondary notes.
- **compact-mantine:** the filter chip is a Mantine `Pill`, whose default ink is secondary; if the Pill's theme sets it, the change belongs in compact-mantine's theme, not in a local override (root `CLAUDE.md`, "UI Components").

## Pending the round-2 comparison: a line when a filter step is undone

- **Document and section:** `interaction-patterns.md` 3.4, "Undo instead of asking"; the departures ledger in `figma-crosswalk.md` 4.3.
- **Old text:** undo is silent.
- **New text, only if the second version wins:** a narrow exception -- undoing or redoing a filter step shows "Undone: {name}. Wrong step earlier? Open Filter steps", and focus can move to the step list. Record it in the departures ledger.
- **Status:** both versions are built for round 2 (silent, and the one-line notice); the result is pending.
- **Why:** five of five participants lost the good last step on their first Ctrl+Z. The notice contradicts "undo is silent", so the comparison decides.

## Pending the round-2 comparison: where the data is, at rest

- **Document and section:** `information-architecture.md` section 5.
- **Old text:** the file-location slot beside the project name shows something only when data leaves the browser.
- **New text, one of two:** the slot shows "This browser. Nothing sent." at rest; or it stays empty at rest, as today. In both, it shows "Sent to: {source}" or "Assistant on: sends {what}" when data leaves.
- **Status:** both versions are built for round 2; the result is pending.
- **Why:** two severity-3 privacy findings. A standing line is disputed against the principle that marks appear only on departure.
- **Drawn:** `screens/frame-at-rest.html`, switch "A: line at rest" / "B: empty at rest" (`?arm=a`, `?arm=b`). The slot is a line under the project name, in body ink with a lock icon; state 8 shows the departure form, "Assistant on: sends names and statistics", which is the same in both versions.

## The file popover leads with where the data is

- **Document and section:** `information-architecture.md` 5; supersedes the popover contents in "Main frame at rest: the file chip's popover holds the data file only" above.
- **Old text:** the file popover holds the data file only: where it was opened from, when it was read, and Replace data....
- **New text:** the popover opens with "This browser. Nothing sent." then "Projects are kept in this browser." and a link, "Where your data goes...", to the page written to be forwarded; below that, as before, where the data came from, when it was read, and Replace data.... Whether the last save worked stays in the project name's menu. The same in both versions of the location slot.
- **Evidence:** severity 3, 5 of 5 privacy sessions could not point at anything on screen that said whether data had left, and the popover said where data came from, not where it went (`study/round-1/insights.md`, D5 and D6). Projects being kept in the browser was learned only from an error.
- **Drawn:** `screens/frame-at-rest.html`, state 5.

## The Assistant's rail button while it is off

- **Document and section:** `interface-templates.md` 1 (the rail); `state-matrix.md`, Rail, Assistant with no provider; `principles.md` 5, the screen word budget.
- **Old text:** the Assistant's rail button is drawn disabled (greyed icon and label) until a provider is set.
- **New text:** while off, the button shows no icon: the word "Assistant" and under it the caption "Off. Nothing is sent." It stays clickable and opens the Assistant panel with its setup. With a provider set and the Assistant on, the icon returns and the location slot names what is sent. The caption's four words, and version A's four, are outside the screen word budget: privacy statements are counted like names and values, as free. (Without that, version A's frame is 52 words against 50.)
- **Evidence:** severity 3, round 1: 4 of 5 privacy sessions read the greyed Assistant with its sparkle icon as a possible leak; one asked for it to "say 'off -- nothing sent' rather than me reading it off the grey" (`study/round-1/sessions/data-stays-here--analyst-alex.md`). Two-way door.
- **Drawn:** `screens/frame-at-rest.html`, every state but 8 (off) and state 8 (on).

## Find and Quick actions: an id is matched exactly, with no "Closest" suggestion

- **Document and section:** `message-catalog.md`, row `find.none`.
- **Old text:** "0 matches[; Closest: {value}]"
- **New text:** "0 matches for {query}[; Closest: {value}]". The Closest part is offered only when the query is not shaped like an id. A query is shaped like an id when it is one run of letters, digits and dashes with no spaces (ACC-365386, P04637, 6117075); such a query matches exactly or not at all, and shows "0 matches for ACC-365386" alone. A name, or anything with a space, keeps the closest-spelling suggestion ("0 matches for thenardeir; Closest: Thenardier"). Echoing the query applies to both, so the message says what was not found.
- **Why:** in the round-1 fraud-analyst session, the no-match state offered a closest spelling for an account id. On an account graph, ACC-365386 and ACC-365388 are two different customers: a near miss on an id is a wrong answer, not a spelling fix, and offering it one keystroke away (Enter takes the link) invites the analyst to open the wrong customer. Names are different: a misspelled character name really is the same character. The key is published, so the final wording is the owner's call. Drawn in screens/find.html, states 5 (a misspelled name) and 10 (an id with no match).
- **To test:** in round 2, whether an analyst who mistypes an account id reads "0 matches for ..." as "not in this graph" and checks the id, rather than assuming the account does not exist.

## Find and Quick actions, after round 2: an empty search says what it searched, Recent projects can be searched on demand, and F6 is shown

- **Document and section:** `message-catalog.md`, rows `find.none` (and a new `quick.none`); `interface-templates.md` 2a (Find: Regions and rows, States) and 15 (Quick actions: Regions and rows, States); `information-architecture.md` 7 (Findability: Find and Quick actions, Scope).
- **Old text:** `find.none`: "0 matches[; Closest: {value}]" (with the proposed "for {query}" of the entry above). Template 15 States: "empty query; no match. Chrome only." Neither template names a key-hint row. Find's scope is this graph or all graphs of the open project; nothing reaches another project.
- **New text:**
  - `find.none`, id form: "0 matches in {project} ({N} {nouns})." -- for example "0 matches in Transfers, April 2026 (3,093 accounts)." The name form keeps "0 matches for {query}; Closest: {value}". Proposed key `graphty.find.none` with params { project, count, noun }.
  - Template 2a, under the empty message: a secondary `Button` **Search recent projects**. Pressed, it reads the projects in the Recent projects list only (the list the start screen shows, all of it, not only the four shown there), looks for the query exactly as Find would, and answers in a group "Recent projects, found in {k} of {n}": one `ResultRow` per project holding the query, "Found in {project}", with **Open** as the trailing action. Open opens that project with Find showing the same query, the hit selected. With no hit: "Not in any of the {n} recent projects." Nothing is indexed ahead of time and nothing is stored: there is no standing index across projects.
  - `quick.none` (new, template 15's no-match state): 'No commands or nodes match "{query}"'. Quick actions searches node names exactly (the keyboard-walk entry above: "A query that is exactly a node's name puts that node first"), so the empty state says both places it looked.
  - Templates 2a and 15: a key-hint row at the foot of Find and of Quick actions: "Enter Select (Find) or Enter Choose (Quick actions), Esc Close, F6 Next region". F6 is `interaction-pattern-entries.md` 9.1's region key; the Find field's tooltip also ends "F6 moves to the next region."
- **Why:** round 2, finding 16 (severity 4): all three participants who started the flagged-account task from a search typed an id that lives in another month's project, got "0 matches" and stopped; two failed, one reached a verdict only through another case's export. The message did not even say which project had been searched. The alert-first route worked, so the failure is the dead end, not the task. A standing index across projects would be a persistence decision (what is kept, where, for how long) made for one persona; reading the Recent projects list when asked needs none, and each project is already kept in this browser. Finding 23 (severity 4 for screen-reader users): Quick actions answered a person's name with "No commands match", and reaching the drawing took 11 to 17 Tabs because F6 was nowhere on screen. The fixture account ACC-705989 is on the March watchlist and closed in April, so it is in March's data and not in April's.
- **Element needs (graphty-element, not the app):** an exact-id lookup the app can run against a stored project without opening its drawing (open the project headless, ask, close), so the scan is the element's search and not an app reimplementation; the exact-name node lookup for Quick actions (already listed in the keyboard-walk entry). Which projects are "recent" is app state and stays in the app.
- **Owner's call:** the message keys and their wording are published (`graphty.find.none` params change; `graphty.quick.none` is new). The Open behaviour (open with the query and the hit selected) is a two-way door.
- **Drawn in:** screens/find.html, states 10 (an id not in this project), 11 (found in a recent project), 12 (Quick actions with no match) and 9 (a name typed into Quick actions puts the node first); the key hints on every Find and Quick actions state.

## Keyboard walk: the walk pill shows the focused node's values and the order, and the order can be switched

- **Document and section:** `interaction-pattern-entries.md` 9.2, "Each move fills the walk-position slot"; `message-catalog.md`, rows `walk.position` and `walk.position.first`; the entry above, "Keyboard walk: where the walk-position slot is drawn, what it holds, and the fit that keeps nodes clear of it", whose "three things only" this supersedes; the entry above, "Keyboard walk: the neighbor order is stated and spoken", whose "by {key} {value}" and bare repeat value this revises.
- **Old text:** the slot "holds three things only: the focused node's label, its position ... and the walk-back key as a key cap. The confidence value, the measure and the full sentence stay in the live region." `walk.position.first`: "{label}, neighbor {i} of {N} of {from}[ in filtered graph], by {key} {value}. {measure} {m}, rank {r} of {total}." `walk.position`: "{label}, {i} of {N}, {value}."
- **New text:** "While the walk is on, the walk pill (one row, above the toolbar, `role=status` and silent) holds: the focused node's label; its position ('{i} of {N} from {from}[, in filtered graph]', 'selected {k} of {n}' on the member walk, 'start of the walk' at the anchor); its values in the spoken order -- the edge's weight when an edge was followed, then the measure and its rank ('weight 0.86, degree 11, rank 40 of 300'); the order, as a three-way switch Weight / Degree / Name (weight means the graph's declared edge weight, highest first, ties by name; degree highest first, ties by name; name A to Z; with no weight declared the switch has no Weight and the default is Degree); and the hint 'Shift+Arrow: next neighbor. Space: select. ?: keys.' The switch is also three Quick actions commands, 'Walk order: weight', 'Walk order: degree', 'Walk order: name', with no default key; running one keeps the focused node, returns focus to the walk, and says `graphty.walk.order` 'Walk order: {key}. {label}, {i} of {N}.' `graphty.walk.position.first`: '{label}, neighbor {i} of {N} of {from}[ in filtered graph], by {key}, highest first. Weight {w}, {measure} {m}, rank {r} of {total}.' (by name: 'by name, A to Z'; no 'Weight {w}' when the order key is not weight and no weight is declared). `graphty.walk.position`: '{label}, {i} of {N}, weight {w}, {measure} {m}, rank {r} of {total}[, selected][, where you came from].' -- every value keeps its word." Example from the protein fixture: "PALB2, neighbor 1 of 32 of TP53, by weight, highest first. Weight 0.98, degree 5, rank 247 of 300."
- **Why:** the studio's round-1 decision (study/decision-log.md, "Keyboard walk"): the focus pill shows the node's values and states the neighbor order, with a switch between edge weight, degree and name. Evidence: 3 of 3 keyboard-walk sessions (study/round-1/insights.md, "Keyboard walk: works for a screen reader, less so for a sighted keyboard user"). The sighted keyboard participants saw less than the screen-reader participant, because the values were only spoken; the screen-reader participant had to hear all 32 neighbors of TP53 and hold a running maximum to find the best-connected one (UBC, degree 21), because the order could not be changed; and a bare "0.80" after the first step was a number without its definition. The switch is not given its own key because a canvas key is a published keymap change and Quick actions already reaches every command; if the study sees analysts switching often, a key is the owner's call. Drawn in storyboards/keyboard-only.html ("The walk pill" and the strip under every frame).

## Keyboard walk: Esc on the canvas leaves the walk, not the canvas

- **Document and section:** this file, "Keyboard walk: Shift+Arrow walks, plain arrows stay on the camera", its new text.
- **Old text:** "Shift+Arrow walks between neighbors; plain arrows orbit (3D) and pan (2D); Shift+Enter steps back; Esc leaves the canvas."
- **New text:** "... Shift+Enter steps back; the first Esc leaves the walk and nothing else, the next clears the selection; Tab leaves the canvas."
- **Why:** "Esc leaves the canvas" contradicts the decided Esc order in `interaction-pattern-entries.md` 9.2 (walk, then armed tool, then selection) and the kit's key list, and would give Esc and Tab the same job while leaving no key that ends the walk but keeps focus on the drawing. Tab is the canvas's one exit (WCAG 2.1.2). Drawn in storyboards/keyboard-only.html, frames 14, 15 and 17.

## Inspector: two selected nodes offer Paths between... on the first row

- **Document and section:** `interface-specification.md` 4.2, the table's "Several elements" row and the Promotion paragraph ("Shortest path from... and Create path 11").
- **Old text:** Several elements: "Verbs: Select neighbors (split: hops, direction, edge type, Filter to neighbors), Filter to, Create set". One node, overflow: "... Shortest path from..., ...".
- **New text:** add after the table: "**Exactly two nodes.** When the selection is exactly two nodes and nothing else, the type row gains a third line: Paths between..., a secondary `Button` at the panel's full width with the route glyph and its label. It opens the Shortest path run's option form (a `PopoutPanel` beside the inspector) with From and To filled from the selection in the order the nodes were selected, a swap button beside From, Weight by at None (count hops; an edge column goes through the weight-meaning question), and the scope of the filter chip. Run finds and draws every shortest path of equal length together. The three verbs of a several-node selection keep their slots. A selection of two nodes and an edge, or of three or more nodes, does not show the line." Rename "Shortest path from..." in the one-node overflow to "Paths between...", opening the same form with From filled and To empty.
- **Why:** the studio's round-1 decision (study/decision-log.md, "Inspector"). Evidence: study/round-1/insights.md, "How are these two connected? has no visible way to ask" and "Unlabelled icons hide the tools people need": people selected the two nodes they cared about and found nothing; the path tool was an unlabelled icon reachable only from one node ("Selecting two nodes is exactly when 'shortest path between' shows up. It's not here."). A labeled line rather than a fourth icon, because the finding was that icons alone hide the tool. Drawn in screens/inspector.html, state "Two nodes: TP53 and SMAD3".

## Inspector: a Notes section on every inspector, with Add a note

- **Document and section:** `interface-specification.md` 3, the Notes row; 4.1, the one-node count ("Notes is absent until a note targets the node") and the resting count; 4.2, "Destructive verbs and Add note (whose homes are the Note tool and the Notes section) never take a slot". This supersedes the Notes-row text proposed in this file's entry on the Note editor ("absent when no note targets the object").
- **Old text:** 3: "Notes | `Tree` rows; absent when no note targets the object, which is reached by the Note tool or Add note". 4.1: "Total 21 against 24; Notes is absent until a note targets the node."
- **New text:** 3: "Notes | always present, after Appearance and before Used by and Export: `Tree` rows for the notes that target the object, clamped to two lines, then one labeled row, Add a note (plus glyph and label, never a bare '+'), which opens the Note editor beside the object. A row click opens that note in the Note editor." 4.1: "Total 22 against 24, with Notes' Add a note." The resting count with nothing selected adds 1.
- **Why:** the studio's round-1 decision (study/decision-log.md, "Inspector" and "Notes panel"). Evidence: 3 of 3 remember-why sessions could not find where a first note goes (study/round-1/insights.md, "Notes: the first note has no obvious place to go"); the section appeared only once a note existed, so it could never be the way to the first one. Drawn in screens/inspector.html, every state and crop.

## Inspector: Style by this on attribute rows

- **Document and section:** `interface-specification.md` 3, the Attributes row; `task-flows.md`, the color-by-value flow's Start (with this file's entry that adds "an inspector value row" as a door).
- **Old text:** Attributes: "DataRow ... the rank as a second line"; no action on the row.
- **New text:** "An attribute row is one button that opens the attribute's menu; hovered or focused, it shows Style by this (palette glyph, `ActionIcon` with a tooltip) as its trailing action, which takes the row's third column. The menu's first item is Style by this, labeled, with its effect as the description ('Adds a style layer on top that colors every protein by betweenness. Its editor opens.'), then Show in table, sorted, then Copy value. Style by this creates a style layer on top of the stack through the StyleManager, bound to the attribute (a numeric attribute on a sequential color scale, a categorical one on the categorical palette), and opens its editor; it never paints the element directly. It is one undo step."
- **Why:** the studio's round-1 decision (study/decision-log.md, "Inspector"). Evidence: study/round-1/insights.md, "A figure for print: no grey check, no vector format, no way to show magnitude", which recommends "Color by" on each attribute row: the empty state promised Color by and no such control existed. One command that makes a layer, rather than separate Color by and Size by, because the channel is chosen in the editor that opens. Drawn in screens/inspector.html, state "Style by this, from an attribute row".

## Inspector: every row has an accessible name in words

- **Document and section:** `interface-specification.md` 3 (a new closing paragraph); `content-design.md` 5 (ranks).
- **Old text:** none; the specification does not say what a row is named.
- **New text:** "Every inspector row is a named control. An attribute row is a button with a menu, named '{attribute}, {value}, rank {r} of {N}' ('betweenness, 0.1139, rank 2 of 300'; a tie reads 'rank 16 to 23 (tied) of 300'); an action row is named by its label and value ('In, 2 sets'); a member row by the member, its value and rank; a Memberships row of a selection by the set and what it holds ('DNA repair, holds 1 of 2 nodes'); a bound Appearance row by '{channel} by {attribute}, from {layer}'; a type row is a group named by the selection and its kind ('2 selected, Nodes'). Glyphs, chits, size marks and RankChips are hidden from assistive technology, since the name already says what they show. '#2 of 300' is never spoken as 'number sign 2'."
- **Why:** the studio's round-1 decision (study/decision-log.md, "Inspector"). Evidence: 3 of 3 keyboard-walk sessions (study/round-1/insights.md, "Keyboard walk: works for a screen reader, less so for a sighted keyboard user"): the inspector's rows were read as raw markup. The names are in the mock's markup; turn on the annotations in screens/inspector.html, state "Style by this", for an example. Whether the markup came from graphty-element is still to be checked (this file, "Defects to file against graphty-element").

## Share the setup: runs, note text and what opens the file

- **Document and section:** `task-flows.md` 9, the trust check for a recipe; `files-and-recipes.md` 1 (what a recipe holds); `interface-templates.md` 20 (the Export dialog's recipe preview).
- **Old text:** the recipe preview lists what travels by kind and count ("style layers 2", "notes on definitions 1"), and names the file (`expression-overlay.graphty`) with nothing about what opens it.
- **New text:** "Under Travels, the recipe's analysis runs come first, counted and named in one line ('3 runs: PageRank, Louvain seed 7, degree'), then each run with its parameters (damping, resolution, seed, the weight it reads). A run whose result a style layer reads says so ('its groups are the modules the style colors'), so the recipient is not asked for what the recipe computes. Each note that travels is shown in full, as it will be written, so the sender reads it before it goes. The file line says what opens the file: 'Opens in graphty or any app with graphty-element'."
- **Evidence:** severity 3, round 1, 4 of 4 share-without-data sessions (`study/round-1/insights.md`, the recipe finding): nobody could tell whether clustering and its seed travel, "a module per protein" under "Asked for" read as "bring your own clusters", one participant would not send a note she could not read ("If one of my notes says 'KRAS up in patient 14' I've leaked something"), and nobody knew what to do with a .graphty file.
- **Note:** the .graphty extension and what a recipe file contains are a published file format, still the owner's decision; this entry only words the line. The run list is the element's recipe description, never computed by the app.
- **Drawn:** screens/export-dialog.html, state 4.

## Export preview: View as gray or with a color-vision deficiency

- **Superseded** by "Export: one Look drives the preview and the file (replaces View as)" below. Kept for its evidence.

- **Document and section:** `interface-templates.md` 20 (the Export dialog's figure preview); `canvas-drawing.md` 13 (the figure).
- **Old text:** (none; the preview shows the figure only as written)
- **New text:** "Above a figure's preview, a segmented control 'View as: Colour / Grey / Red-green / Blue-yellow' redraws the preview, legend included, as a grey print and as readers with red-green and blue-yellow colour-vision deficiencies see it. It changes the preview only; the file is always written in colour, and a line beside the control says so. It opens on Colour each time. The simulation is graphty-element's (the same one the style editor would use), not the app's."
- **Evidence:** severity 4, round 1 (`study/round-1/insights.md`, "A figure for print"): 2 of 4 figure-for-reviewer sessions failed, with no way to check a figure in grey or for colour vision before exporting; three participants in the first-contact focus group raised it unprompted.
- **Open:** the product otherwise spells "color" (American); the control's words were decided as "Colour" and "Grey". Which spelling wins is the owner's call; the mock uses the decided words.
- **Drawn:** screens/export-dialog.html, state 1 (live: click a choice) and "1, viewed as grey"; also state 3.

## A forwardable page: "Where your data goes"

- **Document and section:** `information-architecture.md`, the main menu's Help (and section 4's list of places, as a document the app links to rather than a place); `interface-templates.md` 19, Start screen (the lock line's link); `content-design.md` 2, Voice (the "you" rule); `element-needs.md` (a new row).
- **Old text:** Help reads "Shortcuts / Documentation / Open sample / Memory usage". No page says where data goes; the only statement is the start screen's lock line. `content-design.md` 2: "**"You"** only in Details and (i) text".
- **New text:**
  - Help reads "Shortcuts / Documentation / Where your data goes / Open sample / Memory usage". The item, the start screen's "Where your data goes" link and the file popover's "Where your data goes..." all open one static page in a new browser tab. It needs no project, loads nothing but itself, and shows nothing from this browser's state, so a forwarded or printed copy says exactly what the analyst read. It carries the release it describes and its date, "Copy link" and "Print or save as PDF".
  - Its sections, in order: In short (three sentences, worded as the start screen and the file popover word them); What stays in this browser (files you open, projects, exports, an Assistant key: what and where it is kept); What leaves this browser, and only when you ask (Connect to data source, a file that names a data source, the Assistant, the Assistant with an in-browser model, opening graphty: what is sent, to whom, when); What graphty does not send (with "Check it yourself": the browser's Network tab); What this page does not promise (a source's or provider's own handling, loss of projects, other users and extensions of the same browser, files after export, not a certification); For organizations (self-hosting, turning the Assistant off centrally, a contact).
  - `content-design.md` 2 adds: "A document page the app links to (Where your data goes, Documentation) addresses its reader as 'you'; the 'you' rule governs chrome."
  - Element need: graphty-element's Assistant publishes a plain description of what one request carries (today: the question, the graph's counts, each column's name with up to 10 values or its range, and what its lookups return), and the list of formats it reads, so the page takes both from the element and cannot drift from what the element does.
  - The page does not ship while any of the owner decisions below is open; each open line is drawn in the mock as a marked placeholder with the wording for each answer.
- **Why:** round 1's IT-reviewer finding (study/round-1/insights.md, "'Uploads nothing' is a sentence, not something an IT or security reviewer can check", severity 3): regulated participants said the tool cannot touch real data until IT approves it, and one sentence is not approval. In the investigators focus group the reviewers asked who runs the tool, whether it sends telemetry, whether it can be self-hosted, and what a data source sends and to whom; the one participant who saw the session's "Where the data is" panel wanted it as "a real document I can save and forward" covering every session, not "nothing, this session", and one said she would believe "uploads nothing" only after watching the network tab. Drawn in screens/data-location.html.
- **To test in round 2:** give the page to the IT-reviewer and investigator personas as a forwarded link, with no app: can they say what leaves, to whom, and what is not promised, and what would they still ask before approving?

## Styles list: a layer that paints nothing says what covers it

- **Document and section:** `interface-templates.md` 9, Styles list; `interaction-pattern-entries.md` 6.8 (the one collapse); `information-architecture.md`, the Styles row of the lists table; supersedes the new text of "Color by a value: a single layer that paints nothing keeps its own row" above, and the "Also" of the entry that put "paints nothing" in the origin word's place.
- **Old text:** a single layer that paints nothing keeps its row "with "paints nothing" as its secondary text"; "a run of layers that paint nothing collapses in place into one "N layers paint nothing" row".
- **New text:** "A layer that is on and paints nothing because layers above it write every channel it writes is **covered**. Its row takes a second line in body ink, "Covered by {layer} above", naming the nearest layer above that wins, and a **Move above** button in its trailing slot, shown at rest, not only on hover. Move above places the layer directly above the layer named: one command, one undo step, "Move {layer} above {other}". The layer's editor opens with the same sentence and button above Applies to. A covered layer is never folded into the collapsed row. The collapsed row holds only a run of two or more layers that paint nothing because nothing matches them (a recipe's rule on an attribute this data lacks), and says so: "N layers match no {node noun}". A layer that matches nothing shows "matches no {node noun}" in its origin word's place."
- **Element need:** the painted-count read (`interface-specification.md` 7.4) also returns, for a layer that wins nothing, the layer that covers it on the most elements. The app never works this out from the stack.
- **Evidence:** round 1 of the user study (`study/round-1/insights.md`, "A figure for print", severity 4): in 4 of 4 figure-for-a-reviewer sessions a layer switched on under another did nothing, and two participants failed there. One said: "I clicked it, nothing moved. That's the moment I stop." "Paints nothing" gave no reason a first-timer could read. The studio's decision: study/decision-log.md, "Styles list".
- **Drawn:** screens/styles-list.html, frames 8, 9, 12 and 18; the placement study's material (study/style-stack-arm-a.html, -b.html) shows the same rows in both versions.

## Legends: a block's title says what the channel encodes, and a range names its column

- **Document and section:** `options-and-encodings.md` 6, Legends, items 2 and 9; `canvas-drawing.md`, the legend's look.
- **Old text:** item 2: "a ramp with its domain and midpoint". The mocks titled a block with its layer's name ("Degree size", "Betweenness color").
- **New text (item 2, added):** "A block's title names the channel, then what it encodes in words, then the column: "Size: number of connections (degree)", "Color: module", "Labels: top 12 by degree", "Highlight: path TP53 to SMAD3". Every range printed in a block names its column: "betweenness, 0 to 0.138, log scale", "|log2FoldChange|, 0 to 3.15; by magnitude, sign not shown". The words for a computed column ("number of connections" for degree) come from the element's descriptor of the algorithm or attribute; a data column with no description is named by its column alone."
- **Element need:** a short plain-words description on each algorithm result descriptor, for the legend and export (`element-needs.md`, a new entry).
- **Evidence:** round 1 (`study/round-1/insights.md`, D24): participants asked what size meant and asked for "size: number of connections" in the legend; a reviewer of a figure cannot open the app to find out.
- **Drawn:** screens/styles-list.html, every frame's canvas legend and the editors' Legend rows.

## The Look menu describes each Look in words

- **Document and section:** `interface-specification.md` 4.1 (Nothing: "a dark Menu of the Looks as checkbox items"); `options-and-encodings.md` 4a.
- **Old text:** the Looks are checkbox items by name.
- **New text (added):** "Each Look item carries one line saying what it is for: Colorblind safe, "Safe for color-blind readers: every pair of categories stays apart, and ramps change lightness one way only"; Print, "Prints well in gray: colors keep their order in grayscale and read on white paper"; High contrast, "Every color clears 3:1 against the canvas it is drawn on". The menu ends with "Colors you set by hand are kept." The descriptions are the element's, registered with each Look."
- **compact-mantine:** a `Menu.Item` with a description slot (the kit's described menu item), proposed to compact-mantine rather than drawn locally.
- **Evidence:** round 1, "A figure for print": greyscale and color-blind reading were raised independently by three people in the first-contact focus group, and the recommendation was "palettes labelled in words". The grey-figure sessions never found the Looks because the mock did not show them.
- **Drawn:** screens/styles-list.html, frame 14.

## Results panel: the run record, the exactness slot, a filtered scope and Compare with...

Decisions the revised results panel (`screens/results-panel.html`) makes where the framework is silent. They extend "The state line shows the weight; Details holds the run record" and "How a rank is shown" above.

- **Document and section:** `interface-templates.md` 10, Result; `interface-specification.md`, the results panel.
- **Old text:** (none; Details is a link with no defined target, and the word before the weight slot is always "Exact")
- **New text:**
  - "Details opens the run record in a light popover beside the editor, anchored to the link. It always lists Method, Seed, Damping, Normalization and Weight conversion, in that order, and writes 'Does not apply' or 'None: nothing is sampled' rather than leaving a row out. Rows the method adds follow: Error bound for a sampled run, Numbering for a community run, Scope with the filter step that made it for a run under a filter, Engine with its reason. Copy puts the record on the clipboard as text."
  - "The word before the weight slot names how the values were made, and each word has an (i): Exact ('Computed on every node, not estimated. It does not say the ranking is meaningful.'), Sampled ('Estimated from {k} randomly chosen sources, seed {s}, not from every node. Each value is within +/- {bound} of the exact value in 95 runs out of 100.'), Seeded, for Louvain and other seeded methods ('The grouping depends on the seed. The same seed gives the same groups; another seed can place some proteins differently.')."
  - "Under a filter, the result's Scope field reads 'Filtered graph, {n} of {N}'. The result's own numbers carry no funnel mark, because its Scope names the set once; Statistics and the standing partition's count do."
  - "'{N} more in the table' under Top nodes opens the table's Nodes tab sorted by that measure, highest first, and moves focus to the first row, which closes the editor."
  - "A result that holds a value shows Compare with... twice: as an icon button in its row's trailing slot, always visible, and as a text command in its editor after the readings. A result that is running, queued, not run or refused shows neither."
  - "The engine in the state line is the one that ran. A method with no WebGPU version reads 'CPU.' and its record says why ('CPU: Louvain has no WebGPU version'), which is not a failure and carries no warning."
- **Why:** round 1's "how sure is this" finding (severity 4, 13 sessions) and the definition finding (17 sessions): experts could not check a number because Details was dead. Participants looked for Compare with... on the result and did not find it. The groups and filtered-scope tasks failed because these frames did not exist.
- **Conflicts to settle:** `screens/comparison.html` says Compare with... is absent from every menu until graphty-element publishes per-side comparison readings. The owner's decision to show it on every result row wins in this mock; until the element can compare, the command would have to open something honest (the table's Scatter view of two score columns) or stay out.
- **Needs from graphty-element (not to be computed in the app):** a sampled run reports its error bound with its values, so the rank range is the run's own; each result exposes its run record (the five fields and the method's additions) as data, so every consumer can show and copy it. The mock models the bound (+/- 0.00035) because the fixtures have none.

## Results panel after round 2: the reader's weight answer, near-ties in words, and the rank range header

Supersedes, in part, "The state line shows the weight; Details holds the run record" and "How a rank is shown" above. Drawn in `screens/results-panel.html`.

- **Document and section:** `principles.md`, the state line; `interface-specification.md`, the results panel (Top nodes); `interface-templates.md` 10, Result, and 16, the table's rank column; `content-design.md` 5, rank forms.
- **Old text:** "The weight column and its role take the place of the 'Unweighted' token, for example 'confidence as similarity'." / "An exact run gives equal values a shared rank ('3='). A sampled run shows a rank range from its own error bound ('#3 to #6') and a stability sentence ('Ranks below 20 may swap between runs')." No default tolerance for near ties is proposed.
- **New text:**
  - "Every weighted result's state line ends with its own line repeating the reader's answer, in the words of the question the first weighted run asked: 'Weight: {column}, {answer} (your answer)', for example 'Weight: confidence, higher = stronger link (your answer)' or 'Weight: amount, higher = stronger link (your answer)'. An unweighted result keeps 'Unweighted' in its slot. The Weight field shows the column alone; the run record's Weight conversion row repeats the answer and says where it was given. An out-of-date result caused by a changed answer says so in the past tense: '{Result} used {column} as a distance. Your answer is now {answer}. Re-run to update.'"
  - "An exact run states near-ties in words, as one sentence under Top nodes: 'Ranks 3 and 4 differ by less than 0.2%; treat them as tied.' (the gap rounded up to one significant figure). When no neighbours in the top list are near-tied it says how far apart the closest are: 'No near-ties in the top 5: the closest, ranks 3 and 4, differ by 1.2%.' Equal values still share a rank ('3=')."
  - "A sampled run's rank column is headed 'rank, low-high', in Top nodes and in the table, and each cell shows the range, '#3-#7' ('#1' when the range is one rank). The stability sentence stays."
  - "There is no separate top-N ranking table. The Nodes tab sorted by one measure, with every other finished measure's score and rank columns beside it (each rank headed '{measure} rank, of {N}, ties share'), is that view; '{N} more in the table' opens it."
- **Why:** round 2, severity 4 weight finding (`study/round-2/insights.md`, finding 5: "The box said amount and it quietly didn't.") and severity 3 "how sure" finding (finding 12: an exact run gave no cue, "So it's exact but it might not mean anything? Then how sure am I?"). The Nodes table already holds a column per run, so a second home for the same ranks was rejected.
- **For the owner (the rule is published behavior):** which neighbours count as near-tied is graphty-element's rule, published with the result, so every consumer says the same sentence; the app prints it and never computes it. Round 1 rejected a fixed tolerance ("the tool should not invent a threshold"); the round-2 decision asks for the sentence, which needs one. The mock draws 1% relative difference between adjacent ranks. Choose the threshold (or a rule that is not a fixed percentage, such as a gap smaller than the input's stated precision).
- **Needs from graphty-element (not to be computed in the app):** each ranked result reports its near-tied adjacent pairs and their relative gaps; each weighted result reports the weight answer it used (column and meaning) so the state line and the record read it from the result, not from app state.

## Open decisions for the owner

These are one-way doors -- hosting, published formats, published names -- so they are proposed here, not decided:

- Where graphty is hosted.
- Whether graphty collects telemetry.
- Whether graphty can be self-hosted.
- An organisation-wide switch that turns the Assistant off.
- Who answers an IT or security reviewer's questions about "Where your data goes", and at what address (the page's Contact line).
- Where a data-source password is kept. Recommended: in memory until the tab is closed, never in browser storage (see "Where your data goes: data-source password storage").
- [Decided by the owner, 2026-09-28: SVG now, PDF later, grey check kept.] SVG and PDF figure export as a graphty-element capability, raised in priority on graphty-element's list of needs. Evidence: two of four print sessions failed because only PNG was available.
- The spelling of CSV column headers for runs, for example `betweenness_sampled50_seed7_filtered`.
- [Decided by the owner, 2026-09-28: each note records its author and time, from the project's author setting; shown only when a project holds more than one author.] An author field on notes in the project file format.
- An edit history on notes in the project file format (each edit's date and previous text), so a note can serve as a case record.
- An optional source field on notes in the project file format (where the analyst got the claim: a document, a ticket, a paper).
- Where a renamed category lives: on the attribute itself, or as a label map in a style layer.
- An asymmetric diverging palette under the Print look. Evidence: a symmetric diverging palette cannot keep its direction in grey, and the shipped red-blue palette fails the midpoint rule in `canvas-drawing.md` section 3.

## Defects to file against graphty-element, not to fix in the app

- Community numbering is not matched across data versions, so group 3 can become group 5 after a refresh with the same members. Confirmed 2026-09-28: graphty-element's Louvain run (`graphty-element/src/algorithms/LouvainAlgorithm.ts`) keeps no group identity between runs, and nothing in its results session matches groups by overlap. Wanted: a replayed partition takes, for each group that is the mutual best overlap match of a group in the previous run, that group's name and palette slot; unmatched groups take the next unused numbers; a restored version keeps the names it had. Drawn in screens/version-history.html.
- Inspector rows expose raw markup as their accessible name, which a screen reader reads aloud (file if it originates in graphty-element).

## Notes panel: the empty panel says what a note is for

- **Document and section:** `content-design.md` 4, Empty surface (an exception for the Notes panel); `state-matrix.md` 7, the Notes row proposed above ("Notes panel: Find appears with the first note"); `interface-templates.md` 4, the row anatomy proposed above ("Notes panel: what a note's row shows"); `message-catalog.md`, a new key for the empty panel.
- **Old text:** state-matrix row: "with no notes the panel is its header only: no Find, no rows, no sentence; Find appears with the first note". Row anatomy: "The author's name follows the time only while the project holds notes by more than one author." Stale-citation verb: "Use current".
- **New text:** state-matrix row: "with no notes the panel shows three sentences and no Find: 'No notes yet.' 'Add a note about the selection.' 'Notes are saved in the project and travel in project files and findings reports.' Find appears with the first note." A new message key `graphty.notes.empty` holds those three sentences. Row anatomy: "Each note records the date and time it was written, automatically; the row shows it short and relative under a week ('2h', '1d'), then the date ('Sep 24'), and the Note editor shows the full date and time. [Withdrawn: 'Notes carry no author.' -- the owner never decided this; notes carry their author, see "Authorship on notes and recipes".]" Stale-citation verb: "Add current value", which adds the current run's citation and value beside the earlier ones and keeps both, as one undo step; the note's text and its earlier citation are never rewritten.
- **Why:** in all three remember-why sessions of the first user study, the blank panel was read as loading or broken, nobody knew where the first note goes, and nobody could tell whether notes are saved or leave with the project; "Use current" was read as rewriting evidence. The empty-surface rule's "no sentence" fails here because a blank list of notes looks the same as a list that failed to load. The study asked for an author on each note. [Withdrawn 2026-09-28: an earlier version of this entry said the owner had decided on the date only and that notes carry no author. The owner never made that decision. The owner has since decided that each note records its author and time, and the author-when-several rule stands; see "Authorship on notes and recipes" at the end of this file.] Shown in screens/notes-panel.html, states 1 and 7.
- **Revised after the second user study:** the empty panel also gets the one command the empty-surface rule allows, a secondary `Button` "Add note" under "Add a note about the selection.", which arms the Note tool. [Superseded 2026-09-28: there is no Note tool; the button is "Add a note..." and opens the Note editor directly.] The state-matrix row becomes "... shows three sentences, the 'Add note' button and no Find ...". Evidence: round 2 (`study/round-2/insights.md`, finding 24) again found the empty panel had no add control in 3 of 3 remember-why sessions. Whether readers click it first stays a measured question: the study-schedule task "can a first-time reader take a note from an empty Notes panel" (above) records first click and time on this panel with real people, now with the button present. Shown in screens/notes-panel.html, state 1.

## Paths between: one option form, reached from two selected nodes, Quick actions and the Path tool

- **Document and section:** `task-flows.md` 10.2 (the diagram's first three nodes and the "arm" and "choose B" rows); `information-architecture.md` 4.1, the outline's "[the Path tool's bar] From / To / Scope / Parameters / Run"; `interface-templates.md` 14; `interaction-pattern-entries.md` 5, the Path tool. The relabel itself is in "Relabelled exports and commands in the command register" above.
- **Old text:** "N["Inspector, node A"] -->|"Shortest path from..."| PT(["Path tool bar: From, To, Scope, Parameters"])"; "| arm | node type row; toolbar | Shortest path from...; the Path tool | ..."; "| choose B | canvas; Find | a click or a hit | ..."
- **New text:** "Paths between... (command id `shortest-path`, unchanged) opens the run's option form, one `Popover` beside the inspector, holding From and To with a swap button between them, Direction, Weight by, Scope and Run. It is reached three ways, and all three end in the same form: the inspector's first row when exactly two nodes are selected (From is the node selected first); Quick actions, which fills From from a one-node selection and otherwise leaves From and To empty, and which matches the command on "path", "route", "connected" and "between"; and the Path tool, where a click on each node selects the two and opens the form. The separate Path tool bar is removed. Run is unavailable with the reason "Choose From and To" until both are filled." The diagram's first nodes become `S2["Inspector: two nodes selected"] -->|"Paths between..."| PF(["Option form: From, To, Direction, Weight by, Scope"])`, with `QA(["Quick actions"])` and `TB["Toolbar: Path tool"]` into the same form; the "choose B" row applies only when a route starts with fewer than two nodes.
- **Why:** 4 of 4 how-connected sessions in round 1 looked for "path between" with two accounts selected and found nothing; one participant failed the task; the tool was an unlabelled icon reachable from one node (`study/round-1/insights.md`, "How are these two connected?"). Selecting two objects is the moment Figma offers commands about both (align, boolean operations). One form for every route means one thing to learn and one thing to build. Replaces "the Path tool's bar shows the weight by name, and has one scope control" above: its rules for Weight and Scope move into the form unchanged. Drawn in flows/sets-and-paths.html, section 2.

## Paths between: every equally short route is drawn at once, and nodes on all of them are marked

- **Document and section:** `task-flows.md` 10.2, the trust check `T1{{"Where it leaves the filtered graph is marked; ties named: 1 of N equally short, how it was chosen"}}`; `interface-specification.md` 4.2, the Path and "Path, offered" rows; `canvas-drawing.md`, the found-path drawing; `element-needs.md`, "A shortest-path query that reports how many equally short paths exist and how the returned one was chosen".
- **Old text:** "ties named: 1 of N equally short, how it was chosen" (drawn in the mocks as a "1 of 12" pager on the found path's type row)
- **New text:** "Where it leaves the filtered graph is marked. Every equally short route is drawn and selected together, as one set of nodes and edges (the union of the routes), so the drawing never outgrows the graph however many routes there are. The type row reads "Found paths, {R} routes of {H} hops" (one route: "Found path, {H} hops"). A node that every route passes through, other than the two ends, carries the canvas mark and the row suffix "on all {R} paths" ("on both paths" when R is 2); Members lists the nodes in walk order, one line per hop. There is no pager." Element need, replacing the old one: "A shortest-path query that returns every equally short route as one subgraph, with the count of routes and, for each node and edge, the number of routes through it." A weighted search with a unique shortest route draws that one route.
- **Why:** paging "1 of 12" one route at a time was the most-cited defect of the found path in round 1 (Marcus: all equal routes wanted at once; Chris: "all 12 paths at once"; Sarah and the supply-chain analyst: "then which one is real?"). The accounts no route avoids are the investigative answer: in the March transfers both 3-hop routes from ACC-271813 to ACC-233575 pass through ACC-946224, a flagged ring account. Counting routes through a node is graph work, so it is the element's, not the app's. Drawn in flows/sets-and-paths.html, step 3.

## Paths between: Weight by is an edge-column option that asks what a bigger value means

- **Document and section:** `task-flows.md` 10.2, the node `W{{"The weight's role is shown; a similarity is converted and named"}}`; `options-and-encodings.md`, the shortest-path options.
- **Old text:** (the path reads the graph's weight attribute, whose role is shown in the bar)
- **New text:** "Weight by lists "none: count transfers" and the graph's numeric edge columns; dates and text are not offered. It defaults to none unless a numeric edge column's meaning is already set to Stronger tie or Longer distance, and then to that column. Choosing a column whose meaning is not set opens the weight-meaning question under the field, as every first run that reads a weight does ("In amount, does a bigger number mean a stronger tie, a longer distance, or an amount that flows? Examples: ..."). Not sure -- decide later runs unweighted and the state line says so ("Unweighted: amount not read, its meaning is not set"); An amount that flows runs unweighted with "Paths count transfers when amount is a flow; Max flow reads it". The answer is its own undo entry, before the run's." The trust-check node becomes `W{{"Weight by: none counts transfers; a column's meaning is asked before it is read, and named on the state line"}}`.
- **Why:** the round-1 decision to ask the meaning at the first run that needs it (see "The weight-meaning question moves from loading to the first run that needs it") left the path search reading the graph's weight silently by default. Counting transfers is what an investigator expects first ("fewest hops"), and weighting becomes a choice with its question in the same place. On the March transfers the answer changes the route: Stronger tie gives the route through ACC-242954 ($9,782.05, $9,616.72), Longer distance the route through ACC-670564 (total $22,397.82). Drawn in flows/sets-and-paths.html, step 2a and section 4.

## Paths between: the found transfers open in the table as rows with every edge column

- **Document and section:** `task-flows.md` 10.2, a new step between "run" and "keep"; `interface-specification.md` 4.2, the Path row's verbs; `output-homes.md` 2.
- **Old text:** (none: the path's edges are reached only through the Edges tab of the current selection)
- **New text:** add the step "| rows | the state line's edge count; Show as rows on the type row | the count or Show as rows | A count selects what it counts | no undo entry | the row count equals the count clicked | Surfaced | the Edges tab of a selection (master) |". The Edges tab then lists every edge on any of the routes, with every column of the edge file plus two from the run, hop and "on paths" ("both", "1 of 2"), sorted by hop and then by the first date column when there is one. Export table as CSV... writes exactly those rows.
- **Why:** "no amounts, no dates, not ordered by time" was the fraud analyst's reason the path gave her less than her spreadsheet; she asked for "a CSV of exactly those transfers" (`study/round-1/sessions/how-connected--fraud-analyst.md`). The rows are the table's own, so this needs no new export. The hop and route counts per edge come from the element (see the previous entry). Drawn in flows/sets-and-paths.html, section 3.

## Paths between: a kept path holds every route that was drawn

- **Document and section:** `interface-specification.md` 4.2, the Path kind; `glossary.md`, Path; `element-needs.md`.
- **Old text:** "Path: its name; N hops, distance D ..." (one route)
- **New text:** "A kept path keeps what was drawn: every route of the query. Line 2 reads "Path, {R} routes, {N} nodes" when R is more than 1." Element need: "A kept path that holds every equal route" (`session.sets.createPath` keeps one route today).
- **Why:** keeping only one of two equal routes would quietly throw away the second, the same "which one is real?" problem the pager had. Drawn in flows/sets-and-paths.html, step 6.

## Paths between: Path to... on one node starts a pick mode

- **Document and section:** `task-flows.md` 10.2 (the diagram's first node and the "arm" and "choose B" rows); `interaction-pattern-entries.md` 5, the modes table (a new row); `interface-specification.md` 4.2, the one-node inspector's first row. Replaces, in "Paths between: one option form, reached from two selected nodes, Quick actions and the Path tool" above, the clause "Quick actions, which fills From from a one-node selection and otherwise leaves From and To empty".
- **Old text:** "N["Inspector, node A"] -->|"Shortest path from..."| PT(["Path tool bar: From, To, Scope, Parameters"])"; "| choose B | canvas; Find | a click or a hit | Select (4.1) | no undo entry | B named in the bar | ..."
- **New text:** "Path to... (the same `shortest-path` command) sits on the first row of the one-node inspector and in Quick actions whenever exactly one node is selected. It starts a pick mode: the canvas cursor is a crosshair, the start keeps its start badge, and a prompt over the canvas reads "Pick the end node: click, or find it by name (Ctrl+K). Esc cancels." (`graphty.path.pickEnd`, announced politely). A click on a node other than the start, Enter on a Find hit (Ctrl+K opens Find listing only nodes), or Enter on a node in the Shift+Arrow walk picks the end. Picking the start, an edge or empty canvas leaves the mode on ("Pick a node other than {start}."). When both ends are inside the stated scope and the default weight needs no answer, picking the end runs the search at once with the option form's defaults, which the state line states; otherwise the option form opens filled in, with the reason on its line, and Run waits. Esc ends the mode with nothing run or recorded, and focus returns to the Path to... button (from Quick actions, to where focus was before Ctrl+K). With no node selected Path to... is unavailable with the reason "Select the start node"." Modes table row: "| Pick the end node | Path to... | the prompt over the canvas | a pick, Esc | rung 2 | app |".
- **Why:** severity 3 in round 2: 4 of 4 how-connected sessions found one account and then could not reach the second ("The search box let me find one account and then fought me on the second." -- Dana; `study/round-2/insights.md`, finding 17). The studio's round-2 decision names the prompt and the focus rule (`study/decision-log.md`, round 2, Paths). Running at once on the pick keeps the one-node route at 2 steps; opening the form whenever something must be answered keeps the rule that a search never runs over a graph other than the one stated. Drawn in flows/sets-and-paths.html, steps 1 and 2.

## Paths between: equal paths are counted with the account they go through, and listed on request

- **Document and section:** `task-flows.md` 10.2, the trust check T1; `interface-specification.md` 4.2, the found path's state line. Rewords, in "Paths between: every equally short route is drawn at once, and nodes on all of them are marked" above, the type row "Found paths, {R} routes of {H} hops".
- **Old text:** "The type row reads "Found paths, {R} routes of {H} hops""
- **New text:** "The type row reads "Found paths, {H} hops" (one route: "Found path, {H} hops"). The state line's first line reads "{R} equal paths; {M} go through {node}" ("both go through" when M equals R and R is 2; "all go through" when M equals R), where {node} is the node other than the two ends that the most routes pass through (first in walk order on a tie); with no such node the line is "{R} equal paths". A caret opens the list of routes, one row per route: "via {nodes}: {hop dates}" (the dates only when the edges have a date column), 50 rows at a time. Choosing a row selects that route alone; every route stays drawn. The canvas mark "on all {R} paths" stays." The count per node is the element's (see the element need in that entry).
- **Why:** round 2 kept the all-routes drawing and asked for a sentence that says what the routes share ("7 of 12 go through X", finding 17), and the owner's decision fixes its shape as "12 equal paths; 7 go through X" with an expandable list. Drawn in flows/sets-and-paths.html, steps 3, 4 and 4a.

## Paths between: direction follows the data

- **Document and section:** `options-and-encodings.md`, the shortest-path options; `task-flows.md` 10.2.
- **Old text:** (the form's Direction defaulted to the graph's; the round-2 mocks showed undirected on money)
- **New text:** "Direction defaults to the data's: on a directed graph the search follows edge direction, and the field reads "Follow {edges} (as the data)". Ignoring direction is a choice in the field, or the one-step recovery on "No path along {edges}"; the state line always names the direction used."
- **Why:** round 2, finding 17: Sarah, Marcus, Dana and Priya met an undirected default on money transfers. Drawn in flows/sets-and-paths.html, step 2.

## Paths between: each hop shows its date, in path order, and the state line checks time order

- **Document and section:** `interface-specification.md` 4.2, a found path's Members and state line; `message-catalog.md`, two new rows; the graphty-element proposal "graphty-element: dates at load, and time order on paths" below, which computes the flag.
- **Old text:** (Members listed the hops in walk order with no dates; the table sorted by hop, then time)
- **New text:** "When the path's edges have a date column, each hop in Members shows its edge's date, and the hops stay in path order; they are never sorted by date, in Members, the list of routes, the Edges table or the CSV. The state line adds one line: "In time order[ on both paths | on all {R} paths], {first date} to {last date}." when every hop is no earlier than the one before it (`graphty.path.inTimeOrder`, polite), or "Not in time order[ on {K} of {R} paths]: hop {n} ({date}) is earlier than hop {n-1} ({date})." naming the first inversion of the first route out of order (`graphty.path.timeInversion`, assertive). Each row of the list of routes names its own first inversion. Dates are compared to the second and shown to the minute when the day alone would not show the order; equal times count as in order. With no date column there are no dates and no line. The flag is part of the path result that graphty-element returns; the app only prints it."
- **Why:** severity 4 in round 2: "the transfers have no dates" (finding 1; 10 sessions, 4 participants), and "Step is not a time. If step 2 happened before step 1, this isn't a chain, it's a coincidence." (Priya). Sorting the hops by date would scramble the route and hide exactly the inversion. A line when the path IS in order is this flow's own decision: without it an absent warning cannot be told from a check that never ran. On the March transfers the ACC-271813 to ACC-233575 routes run from 4 to 9 March; the reversed search, ignoring direction, reads "Not in time order on 2 of 2 paths: hop 2 (7 Mar) is earlier than hop 1 (8 Mar)." The two message keys are published, so their wording is the owner's call. Drawn in flows/sets-and-paths.html, step 4, section 3 and the errors list.

## Paths between: a capacity refuses in the same shape as an unanswered weight

- **Document and section:** `options-and-encodings.md`, the shortest-path options; replaces, in "Paths between: Weight by is an edge-column option that asks what a bigger value means" above, the sentences about "Not sure -- decide later" and "An amount that flows", which the round-2 column question retired.
- **Old text:** "Not sure -- decide later runs unweighted and the state line says so ...; An amount that flows runs unweighted with "Paths count transfers when amount is a flow; Max flow reads it"."
- **New text:** "A column answered "more can pass through (capacity)" is refused by a path search, in the shape of the unanswered-weight refusal: "Can't weight paths by {column}: {column} is set up as a capacity. Max flow reads it.", with Count transfers, which sets Weight by to none. A column answered "Don't use {column}" is not offered as a weight and reads "{column}: numbers, not used"."
- **Why:** round 2 decided that a run which cannot use the chosen weight refuses rather than silently counting hops (severity 4, finding 5); a capacity is a weight a path cannot use, so the same rule applies. Drawn in flows/sets-and-paths.html, section 4.

## Proposed for task-flows 10.3: paths that run forward in time

- **Document and section:** `task-flows.md` 10.3, the Time row.
- **Old text:** "| Time | tail | 2 steps | only with a time attribute |"
- **New text:** "| Time | tail, raised for transfer data | 2 steps, from the Paths between form | only with a time column on edges; a route whose edges run forward in time ("follow the money in time order"); a window on the dates |"
- **Why:** the fraud analyst in round 1 asked for it by name ("let me pick 'follow the money in time order' instead of 'fewest hops'", `study/round-1/sessions/how-connected--fraud-analyst.md`). Drawn as a labelled gap in flows/sets-and-paths.html, section 5.

## A received recipe says what it brings and what you supply; unmatched ids read "Not in this network"

- **Document and section:** `interaction-pattern-entries.md` 6.10, Behavior; `message-catalog.md` `file.binding` and `file.report`; `interface-templates.md` 20, Binding step. Supersedes, in the entry "Recipe travels: the join report says why each value did not match" above, the per-value reason `absent` ('no node with this id'), the sentence "never says 'not in this network'", and the recommendation in the study's insights to offer a fix for spreadsheet-date genes.
- **Old text:** (6.10) "Choosing one shows what it carries before it is applied: style layers, runs with their cost bands, overview readings, set slots and the attributes it needs." Binding step: a file the reader already had reads "{file}, already open"; each unmatched value reads "{id}: no node with this id" or "{id}: looks like a date; a spreadsheet may have converted an id".
- **New text:** "The recipe preview opens with two lines: 'Brings: {what it carries, counted by kind}' ('Brings: styles, 3 runs'; 'Brings: 2 styles, 1 filter') and 'You supply: {what the reader must bring, in the reader's words}' ('a network with a gene column'). A file the recipe opened reads '{file}, opened by this recipe'. Unmatched join values are listed by name under one heading, 'Not in this network: {N} ids, for example {id}', the example chosen from the date-shaped ids when there are any; a date-shaped id carries a 'date?' tag in the list, and one general line follows: '{D} ids look like spreadsheet dates (SEPT2 -> 2-Sep).' A case-only near miss keeps its own row and its hand match. There is no one-click repair for a date-shaped id."
- **Why:** round 1, use-colleague's-file task, 3 of 3 sessions (`study/round-1/insights.md`, the received-recipe finding; `study/decision-log.md`): the recipient could not tell what he had to supply, could not say where an "already open" network came from, read "no node with this id" as jargon that left the blame unclear, and took the dates for his own error. A repair button was rejected because the element cannot know which gene a date was (7-Sep may be SEPT7 or SEPTIN7) without a gene dictionary a general graph element should not carry. "Not in this network" is now accepted as the plainer claim, although an id with no node may be an alias of one that is there. Drawn in screens/binding-step.html, states 1 to 4. The keys `graphty.file.binding` and `graphty.file.report` are published, so the wording is the owner's call; the keys do not change.
- **Open, one-way door:** "opened by this recipe" presumes a recipe can name its network and graphty can open it. A browser cannot open a file by path without the reader picking it, and a URL would contradict "This recipe names no server". How a recipe refers to its network is a file-format decision for the owner.

## The cost gate after round 1: time limit, the graph's direction, a visible seed, and a sampled route beside every long exact run

- **Supersedes, in part:** "The over-budget refusal: order, focus and one commit" (group headers and route labels), "Betweenness declares its sampled method, so the gate can offer it" (the default sample size of 50), "The sample-size field says how large a sample fits the budget" (the rounded bound and the refused field), "The over-budget cause names the time, not a distance past the budget" (the wording), and "A directed graph read as undirected says so on the state line" (Betweenness is no longer read as undirected).
- **Document and section:** `glossary.md` (the word for `exactComputationSeconds` on screen); `interaction-patterns.md` 3.3; `interface-templates.md` 10 and 11 (Result editor: Direction and Seed rows); `state-matrix.md` 4.10; `message-catalog.md`, `cause.E_CAP_EXCEEDED`; `graph-conventions.md` 1 (direction list, no change: Betweenness already "reads direction").
- **Old text:** group headers "Fits the budget" / "Over the budget"; routes "Sampled, {k} sources", "Exact on {set}", "Exact on the full graph"; default sample size 50; "About 100 fits the budget"; a sample size past the budget "marks it as an error ... and disables Run"; cause "Takes {band}; exact runs stop at {cap}"; the state line and refusal say "Undirected" for Betweenness on a directed graph; the Seed row is proposed and reads "random" until a run records one.
- **New text:** "On screen the cap is the **time limit**, never 'budget'. The groups are 'Fits the time limit' and 'Past the time limit', cheapest first in each. Wherever an exact route past the time limit is offered, a sampled route past it is offered too (on the citation graph: 'Sampled, 500 sources -- a few minutes' beside 'Exact, on the full graph -- hours'); every route past the limit runs in the background with its band and Cancel. A route on a subset names what it covers by size: 'Exact, on {N} nodes', the set's name in its tooltip. The cause reads 'Takes {band}. The time limit is {cap}.' Direction is a row of the Result editor, a Select defaulting to the graph's own direction ('As the graph: directed', with 'Read as undirected' as the other choice); on an undirected graph it is a plain reading, not a control. The sample size defaults to the largest sample that fits the time limit, read from the element ('The largest sample that fits the time limit.'). A sample size past the limit is not refused: the field keeps it, a warning under it gives its band and the limit, and Run starts it in the background. The Seed row always shows the seed the run used, editable, with New seed in its TrailingSlot. The time limit cannot be raised from the app."
- **Evidence:** round 1, costly-measure sessions (4 of 4: the direction forced to undirected on a directed citation graph, no reason or control; the seed hidden -- one participant rated it severity 4; 50 as the default while the form said about 100 fits; a few-minute sample refused while an hours-long exact run was offered; "Exact" read as covering the whole graph) and a who-matters session ("budget" read as money). `study/round-1/insights.md`, "The cost gate: honest, but forces choices users want to make themselves"; `study/decision-log.md`, "Run options and cost". `graph-conventions.md` 1 lists betweenness among the entries that read direction, so reading the citation graph as undirected answered a different question.
- **Needs from graphty-element and @graphty/algorithms (not the app):** betweenness passes `k` and a seed to the library and records both on the run; the element publishes the largest sample that fits the time limit on a scope; the element reads direction for betweenness instead of `algorithmGraph("undirected")`. Until then the Direction and Seed rows cannot be honoured.
- **Deviations from the decision, for the owner:** the subgraph route reads "Exact, on 5,318 nodes", the kept set's size in the fixtures; the decision's example "1,204 nodes" is not a set in this graph. The default sample is 101, the fixture's largest sample within 30 seconds at 29.9 s; the round-1 proposal defaulted lower because the cost model is uncalibrated, and at 101 a model error of a fraction of a second flips the verdict.
- Drawn in screens/option-form-cost.html, states 2 to 4. Glossary words and message keys are published, so the wording is the owner's call.

## The weight-meaning question: its examples are real values of the column

- **Document and section:** `options-and-encodings.md` (the weight-meaning question), with "The weight-meaning question moves from loading to the first run that needs it" above.
- **Old text:** "Examples: 0.91, 0.40, 0.12."
- **New text:** "The examples are three real values of the column the run reads, from strongest to weakest, read from the data by the element: its largest, a middle and its smallest (on the protein network 0.99, 0.79, 0.40)."
- **Why:** confidence on the protein network runs from 0.40 to 0.99, so 0.12 is not a value it holds, and an example the analyst cannot find in their own column undermines the question. Drawn in screens/option-form-cost.html, state 1, with the glossary terms (similarity, distance, capacity) as secondary text, "How it is converted" as a disclosure, and the "Not sure" info mark stating both of today's behaviours (glossary 11, the unknown row).

## Keyboard walk, after the keyboard study: keys, the focus pill, the key sheet, Esc and Quick actions

- **Document and section:** (1) `interaction-pattern-entries.md` 9.2 (Entry, the arrow-keys bullet, "The inspector stays on the selection", Back and home, Exit, and "Camera keys"), 9.3 ("The walk takes the arrows only with the camera step controls"), and section 8's modes table, row "Canvas walk"; (2) `interaction-patterns.md` 3.6, the Esc ladder's rungs 2 and 3 and the dispatch rows "the canvas, no walk" and "the canvas walk", and 3.8's canvas-focus chart; (3) `figma-crosswalk.md` 4.3, the row "The arrow keys nudge the selection"; also `information-architecture.md` 7 (Find and Quick actions, Hand-off) and `message-catalog.md` (the walk rows). These are the three passages that still say plain arrows walk: 9.2 and 9.3 with the modes row; 3.6 and 3.8; and the crosswalk row.
- **Old text:** 9.2: "The first arrow press on the canvas starts the walk, and so does Enter when the selection is elements or empty" ... "The arrow keys move focus to a neighbor of the focused node, in the element's stable neighbor order" ... "Enter selects it, and the inspector follows" ... "Exit. Esc leaves the walk (rung 2); a later Esc deselects" ... "The arrows walk; the camera has no arrow binding." 9.3: "The plain arrows move from the camera to the walk in the same release that ships camera step controls." Modes row "Canvas walk": "an arrow press on the canvas, or Enter there with elements or nothing selected (9.2)". 3.6 "the canvas, no walk": Enter "elements or nothing selected: start the walk", Arrows "the first press starts the walk", Esc "else rungs 2, 3"; "the canvas walk": Esc "rung 2: leave the walk", Enter "select the focused node", Arrows "move to a neighbor". 3.8: "Idle --> Walk : arrow; Enter with elements or nothing selected"; "Walk --> Walk : arrow (neighbor) ... Enter (select)". Crosswalk 4.3: "The arrow keys nudge the selection | the arrows walk from the focused node to a neighbor". Information architecture 7: Quick actions ranks "recency, then match quality" and hands off with "Find ..." only "when it finds nothing of its kind".
- **New text:**
  - 9.2, entry and moves: "Plain arrows move the camera (pan in 2D, orbit in 3D). Shift+Down or Shift+Right on the canvas starts the walk while something is drawn; nothing else starts it. Shift+Down goes into the focused node's neighbors; Shift+Right and Shift+Left take the next and previous neighbor, without wrapping. **Shift+Enter is the walk-back key**: it steps back one hop along the path walked and restores the position among that node's neighbors; Shift+Up is a second binding for it. Shift+Home is the walk-home key. **O switches the neighbor order** between edge weight (highest first), degree (highest first) and name (A to Z), keeps the node stepped from, and moves focus to the first neighbor in the new order; the order holds for the session on that graph. The default order is the declared edge weight, else degree."
  - 9.2, selection and inspector: "**Space, released with no drag, is the only walk key that changes the selection**: it toggles the focused node in or out. **Enter moves focus into the inspector on the focused node and never changes the selection**; the inspector's heading says whether the node is selected, and Esc returns focus to the same node with the walk going on. Outside the walk, Enter with nodes or nothing selected moves focus into the inspector on the selection; with a set, path or item selected it goes to the members (4.2)."
  - 9.2, the focus pill (replaces the walk-position slot): "While the canvas has keyboard focus, a focus pill sits in the secondary bar's place above the toolbar. On arrival it names the start node ('Start: Valjean'); in the walk it shows the focused node's label, its position ('3 of 36 from Valjean'), whether it is selected, the selection count, the values of the measures the drawing shows (size, then colour) with their rank ('Degree 17, rank 4 of 77'), and the edge's value to the node stepped from. It states the neighbor order with a switch (edge weight, degree, name) and one fixed hint: 'Shift+Arrow: next neighbor. Space: select. ?: keys.' Its words and values are graphty-element's, from the focused-node event, the same text the polite region speaks."
  - 9.2, Exit, and 3.6's Esc ladder: "**Esc leaves the canvas.** With keyboard focus on the canvas (the focus ring showing), Esc closes an overlay the canvas opened (a menu, the inspector visit, the key sheet), then disarms a tool, then ends any walk and moves focus back to the control it came to the canvas from (the toolbar after a click or a page load), the selection kept: 'Walk ended at {label}. {n} selected on canvas.' With pointer focus (no focus ring), rung 3 deselects, as in Figma. From the keyboard a selection is cleared in the Nodes table (Esc there, 9.1) or with Space." 3.6 rows: "the canvas, no walk" Esc: "a pointer gesture ends; playing: pause; else rung 2; then, with keyboard focus, leave the canvas; with pointer focus, rung 3"; Enter: "nodes or nothing selected: focus into the inspector; a set, path or item: members (4.2)"; Arrows: "move the camera; Shift+Down or Shift+Right starts the walk". "the canvas walk" Esc: "playing: pause; else rung 2 (disarm a tool); else leave the canvas and the walk"; Enter: "focus into the inspector on the focused node; the selection unchanged"; Arrows: "move the camera; Shift+Arrow as 9.2". 3.8: "Idle --> Walk : Shift+Down or Shift+Right [something drawn]"; "Walk --> Walk : Shift+Arrow (neighbor); Shift+Enter or Shift+Up (back); Shift+Home (start); O (order); member-walk keys; Space released with no drag (toggle); Enter (inspector, and back on Esc); ? (key sheet, and back on Esc)"; "Walk --> [*] : Esc with keyboard focus, not playing, no tool armed".
  - 9.2, the key sheet: "'?' on the canvas (and anywhere a text field does not have focus) opens a key sheet that renders graphty-element's published list of default key bindings, read only, grouped by where they work. Esc closes it and focus returns where it was."
  - Modes row "Canvas walk": "Shift+Down or Shift+Right on the canvas with something drawn; never focus arriving, never a pointer, never Enter | the focused node's focus ring and the focus pill | Esc (after an overlay and a tool), Tab, a pointer click, focus leaving the canvas".
  - 9.3: delete "The walk takes the arrows only with the camera step controls" and its paragraph; the camera keeps the plain arrows. The camera's 3D pan moves off Shift+Arrow (a suggestion: Ctrl+Arrow; never Alt+Arrow, which is browser Back).
  - Crosswalk 4.3, the row widens to: "The arrow keys, and Shift with them, nudge the selection | plain arrows move the camera and Shift with the arrows walks from the focused node to a neighbor | ontology | positions are unitless; a graph is walked along its edges, and in Figma Shift and an arrow is the 10 px nudge the walk takes over".
  - Information architecture 7, Quick actions: "A query that is exactly a node's name puts that node first, as the first row of the Find hand-off row, above the commands; Enter selects it (Find's own ending: the hit selected) and returns focus to the canvas, not walking. A query that is not an exact name keeps today's hand-off."
- **Why:** the owner's decision of 2026-09-28, from the keyboard study (`study/round-1/sessions/keyboard-walk--*.md`). All three participants lost a selection to Enter: one replaced it twice by accident, one pressed Enter "to mark where I was", one found Space silently adding to a selection Enter had made. Values were only spoken: "As a sighted keyboard user I get less information than a blind one." The order was secret and fixed: all three were asked for the best-connected neighbor and had to hear or step through all 32 neighbors in confidence order; each asked to sort by degree. Two looked for a key sheet on "?" and for a way to type a node's name into Ctrl+K first. The screen-reader participant named Shift+Up going home and "where you came from" as the best part, so Shift+Up stays as a second back binding. Esc leaving, with the selection kept, answers the participant who would not press Esc for fear it cleared three selected nodes; keeping deselect on pointer focus keeps Figma's one-press Esc for mouse users, and the focus ring shows which one applies. The pill shows what the live region says, so the element owns both texts and a bare embed can draw the same pill. Degree as the default order when no weight is declared replaces "by label": a name order answers no analyst question, and degree is the question all three asked. Drawn in flows/keyboard-walk.html.
- **Supersedes:** "Keyboard walk, FOR DECISION (published keymap): Shift+Up or a walk-only key for going back" (decided: Shift+Enter, with Shift+Up as a second binding; Alt+Up dropped); the Enter half of "Keyboard walk: Enter no longer starts the walk, and Enter in the walk says what it dropped" (Enter no longer selects, so it drops nothing; `graphty.walk.selectedOnly` is withdrawn); "Keyboard walk: Shift+Enter retraces, as Figma's go-to-parent" (it is now the named back key, not the second one); the slot contents in "Keyboard walk: where the walk-position slot is drawn, what it holds, and the fit that keeps nodes clear of it" (the pill holds the values and the order; the fit inset must grow to the pill's four rows, about 104 px, a figure to check in the screen mock); and the "by label" fallback in "Keyboard walk: the neighbor order is stated and spoken".
- **Element needs (graphty-element, not the app):** the focused-node event carries the pill's text and values (label, position, node stepped from, selected, the drawn measures with ranks, the edge value) so a host renders them without computing over the graph; the walk takes a neighbor-order option (weight, degree, name) and announces it; the default key-binding list is published read only, so the key sheet renders it rather than copying it; the Find index ranks an exact node name first for Quick actions' hand-off.
- **FOR DECISION (published keymap, door 65):** O as the order-switch key (not a tool key today; it must stay free of tools), '?' as the key-sheet key, Shift+Enter as the walk-back role's default with Shift+Up as a second default. The message texts ("Walk ended at {label}.", "Neighbors by {order}.", the pill's hint) are published keys, so the wording is the owner's call.

## Weekly return: the File menu tells Replace data from Add data, and puts Replace first

- **Document and section:** `information-architecture.md`, the main menu outline (File); `output-homes.md` 3, the command register rows for Add data... and Replace data...; `task-flows.md` 8, the "choose" step.
- **Old text:** "File: New project / Open... / Open sample / Recent projects / Add data... / Add as another graph... / Join... / Replace data... / Connect to data source... / ..." with "No order inside a level is implied", and no description on either item. (An earlier proposal in this file gives Replace data... one secondary line for its cost: "1 slow result will wait for Re-run".)
- **New text:** "In File, Replace data... follows Open... and Recent projects directly, and Add data... follows it. Each of the two carries one secondary line that says what it leaves, before the click: Replace data... 'New files under this analysis; {current version} kept as a version', followed by the cost of what will not replay when there is any ('1 slow result will wait for Re-run'); Add data... 'More rows on top of the data loaded now'. The line is the item's accessible description (aria-describedby)."
- **Why:** round 1 (`study/round-1/insights.md`, "The weekly refresh: Add data double-counts and Replace cannot be found"; `study/round-1/sessions/this-weeks-export--analyst-alex.md`): three of three weekly-refresh participants found only Add data, and Replace data appeared on no screen they were shown ("If I have to ask someone where 'replace' is, I'll forget by next week"). The two verbs differ in one word and in their result; the menu is the only place both are offered side by side, so it is where they must be told apart. The same-columns warning on Add data (entry above, "Add data warns when the file has the loaded data's columns") stays as the second net. Menu order is a two-way door. Drawn in `screens/weekly-return.html`, states 3 to 5, and `storyboards/weekly-return.html`, frames 3 to 5.
- **Open, for the second round:** whether the two description lines are read at all in a menu (a first-click test on the File menu with the task "put this month's export into last month's project").

## Table: every run adds a score column and a rank column under one group header

- **Document and section:** `interface-templates.md` 16, Regions and rows (the column headers); `output-homes.md` 2, the row "a node's rank on a metric" (its "the table's rank column"); `content-design.md` 5, "Ranks, one format everywhere"; `implementation-mapping.md` 10.1, the `DataTable` row.
- **Old text:** template 16: "a result column sorting by that result's `ranking(field)`"; output homes: "the table's rank column" with no rule for when it appears or how it is headed; content design: "A table's rank column shows '#3' alone, because its header names the denominator and scope"; a tie "#3 to #5 of 5,310".
- **New text:** template 16, added: "Each run adds two columns to the Nodes or Edges tab: its score and its rank. They sit under one group header, one row pitch tall, that names the run, its method and the scope it read ('Betweenness exact, unweighted, full graph'; 'PageRank damping 0.85, unweighted, full graph'; 'Degree total, full graph' on a directed graph); the column headers below keep the one header form. The rank column's profile line is the denominator ('of 300') and its cells '#2'; equal values share a rank, '#4=' (the results panel's tie form, 'How a rank is shown' above). Degree has the same pair, headed with its scope only, from the first run on, because the element ranks degree like a run's values. Sorting a rank column sorts its score. A stale run's group header ends in the Out of date mark and Re-run; a live measure under a filter step names 'filtered graph' and ranks over what is left ('of 28')." Content design 5: the table's tie form becomes '#4=', the same as the results panel's for an exact run; a sampled run's rank cell shows its range ('#3 to #6'). Implementation mapping 10.1, `DataTable`: add "column groups: a group header row over a run's score and rank columns".
- **Why:** the "who matters, and how sure" finding (severity 4, 13 sessions) and the "scores as rows" finding (severity 3, 20 sessions) in `study/round-1/insights.md`. The inspector's "#2 of 300" was the only confidence cue that worked for every participant, but it exists one node at a time ("checking a top twenty means twenty clicks and a notepad"). A group header says which run wrote the numbers before a reader quotes one, and it is what the CSV column headers repeat. The method does not fit a column's profile line ("damping 0.85, unweighted, full graph" is wider than a score column), so a group row carries it once for both columns. Drawn in screens/table-dock.html, every state, and "Three measures ranked".
- **Element needs:** the rank over the run's scope with a rank column on request (`element-needs.md`, the rank row, today "none") is what the rank columns read; they are absent until it lands. `DataTable` column groups are a compact-mantine question (whether its DataTable supports a group header row), not app code.

## Table: an agreement line once two measures are ranked

- **Document and section:** `interface-templates.md` 16, Regions and rows (a new line between the scope line and the grid); `message-catalog.md` (a new row, `graphty.table.agreement`).
- **Old text:** (none)
- **New text:** "On the Nodes tab, in the full-graph or filtered-graph scope, once two or more current measures have rank columns, one line sits above the grid in body ink: the longest top every measure agrees on, then where they part, then Compare rankings..., which opens the table's Scatter view on the two most recent runs. Up to three places it names them ('MAPK1 and TP53 are the top 2 on all three measures. At #3 they part: CDK1 by degree, YWHAZ by betweenness and pagerank.'); past three it gives the length and the leader ('The top 10 are the same on both measures, led by ACC-393859.'); with no agreement at #1 it says so ('No node is #1 on both measures.'). A measure that is out of date is not counted; with fewer than two current measures, or in the Selected scope, the line is absent. The agreement is computed by graphty-element over the runs' rankings, never by the app." Message catalog: `graphty.table.agreement` with parameters {k, nodes, measures, parting}.
- **Why:** round 1's recommendation for the "how sure" finding was "a plain agreement line ('TP53 is in the top 2 on all three measures')"; every rankings-agree participant asked whether the measures agree before asking how strongly. Naming where they part answers the next question without a chart; the Scatter view answers the one after that. A near-tie tolerance ("3rd to 5th are within 8%") was left out: "How a rank is shown" above rejects a default tolerance. Drawn in screens/table-dock.html, "Small graph", "Large graph" and "Three measures ranked".
- **Element needs:** the agreement over two or more rankings (the longest common top and the first parting) as a read, beside `ranking(field)`, so the app renders a sentence and computes nothing about the graph (root `CLAUDE.md`, "The graphty app is only HTML around graphty-element").

## Export table as CSV...: the table's one exit, and Export files... no longer offers tables

- **Document and section:** `interface-templates.md` 16, the tab header ("Export table"); `interface-templates.md` 20, the Export dialog's **table** row; `output-homes.md` 3 (the "Relabelled exports and commands in the command register" entry above).
- **Old text:** template 16: "Export table..., which opens the Export dialog (section 20) with only its Tables row checked" (this file's entry "Export table... and the dock's tab row"); template 20: "**table** (the dock's tabs)".
- **New text:** template 16: "Export table as CSV..., a subtle button at the end of the tab row, opens a small dialog: the rows it will write, stated as a count with the tab and scope ('All 300: Nodes, full graph'), their order, the column count (hidden columns included), a preview of the file's first lines, and the file name. It writes every row of the tab and scope, the file's own ids as the first column, stored values (ranks as whole numbers), and each run's columns under headers that carry its method and scope." Template 20: remove the **table** row; the header's button is labelled "Export files..." (figures, data, recipe, style, findings report).
- **Why:** the "scores as rows" finding: "two Export buttons do not say which gives a table and which a picture", and the comparison's export "hides in an overflow menu and might be capped at 100 rows". With tables in both dialogs there are two routes to the same file and a reader must learn which; one labelled route beside the rows removes the question ("which of the five CSV buttons"). The count in the dialog answers the cap worry before the file is opened. Supersedes this file's "Export table... and the dock's tab row". Drawn in screens/table-dock.html, "Getting rows out".
- **FOR DECISION (published file format):** the CSV column-header spelling for a run's columns. The mock previews "betweenness (exact, unweighted, full graph)" and "betweenness rank (of 300, exact, unweighted, full graph)"; the open decision "The spelling of CSV column headers for runs" (round-1 decision log) owns it.

## Counts open as rows: components as an item tab

- **Document and section:** `information-architecture.md` 4, Table tabs (the item tab); `interaction-pattern-entries.md` 4.3 (decided in "A count selects what it counts: decided" above).
- **Old text:** item tabs are a result's items (groups, found paths, pairs).
- **New text:** add: "The components count in Statistics opens a Components item tab (one row per component, largest first, with its size); a row opens its members as the Selected scope. The isolated count selects those nodes and opens the Selected scope. A path's hop count selects every edge on the equally short paths it stands for and opens the Edges tab on them, with an 'on paths' column ('1 of 2')."
- **Why:** component, isolate and path-hop counts were dead ends in round 1; people tried to open them. Selecting every node of every component would select the whole graph, so components need rows of their own, the same shape as communities. Drawn in screens/table-dock.html, "Getting rows out".

## Comparing two rankings: how the Scatter view draws ranks, ties and the top corner

- **Document and section:** `output-homes.md` 2 (as proposed in "Comparing two results goes to the table's Scatter view"); `interface-templates.md` 16, the Scatter view of the Nodes and Edges tabs; `content-design.md` 4, Legend note.
- **Old text:** the proposal says "rank against rank, with rank 1 at the top left. A block of tied values is one labelled band", and is silent on the axis scale, on which tie blocks become bands, on where a band's accounts are drawn, on an account tied on both sides, and on how long the shaded top is.
- **New text:** "Both axes are log scales of rank (ticks at 1, 10, 100, 1,000), each running to its own side's count, titled 'Rank on A: {result}, 1 to {N}'. A dashed diagonal marks the same rank on both. A tie block over 10% of a side is one band across the plot, labelled outside the frame with its count and value ('1,314 accounts tied at 0'); its accounts sit on the band's middle line, placed by their rank on the other side. Smaller tie blocks are drawn as points at their shared rank. An account in the band on both sides has no position and is counted in the key's legend note ('1,153 accounts are in both tie blocks, not plotted'), as are accounts on one side only. The top corner is shaded to the length of each result's own Top nodes list (5, `interface-specification.md` 4.1a's cap), with no control; the key states how many accounts are in both. The selection carries the canvas's selection ring and is linked with the canvas and the difference list. When no tie block is over 10% of either side, Agreement shows one number, Spearman, unlabelled, and the plot has no band."
- **Why:** on a linear axis of 3,093 ranks the top 5 occupy under 1 px and the two bottom tie blocks fill almost half the plot, so neither the question ("who matters") nor the answer is visible; the study's expert participant asked for "rank against rank, log axes" by name. On the April transfers every one of the 1,153 accounts tied at the lowest PageRank is also among the 1,314 at 0 betweenness, so without the both-bands count the corner would silently hold 37% of the data. Labels inside a band covered its first dots, which are the merchants top on PageRank and at 0 betweenness, the finding of the "Higher on A" list. Bands for the 1% to 6% tie blocks would draw two dozen stripes; 10% is the same threshold that switches the headline to tau-b, so a band always explains the headline. Drawn in screens/comparison.html, states 1 and 2.
- **Element need:** the comparison readings (`element-needs.md`, "Comparison statistics and null models") gain, per comparison: each matched element's rank on both sides (shared rank for ties), the tie blocks of each side (value, count, first and last rank), Kendall tau-b beside Spearman, and the top-list overlap at the result's own top-list length. The app draws the chart from these and computes nothing.
- **compact-mantine need:** a Scatter view for the dock (axes, bands, shaded corner, points, a selection mark and a key), sized to the dock; today there is no chart component beside the histogram rows.

## Comparing two rankings keeps one canvas; the split canvas is for two drawings

- **Document and section:** `interface-templates.md` 18, Regions and rows; `interaction-pattern-entries.md` 4.9, Behavior.
- **Old text:** template 18: "canvas split into two sides, each with a header row naming its graph and version; `ResizeHandle` between them; the inspector column replaced by a header with Save comparison and Done, always visible, over the difference list".
- **New text:** "For two scores (two measures, or one measure on two data versions or windows) the canvas stays one canvas, drawn as the reader styled it, and the bottom dock opens the table's Scatter view. The right column is replaced as before: header (Save comparison, Done), the type row naming the comparison, one line per side (its letter, its result, and its state line with Details), Agreement, Not matched when anything is, and the difference list. Selecting a row, a dot or a node selects the same element in all three. For two drawings (two layouts, two groupings drawn by color) the canvas splits into two sides, each named by a floating pill, with one camera shared by both." This narrows two earlier entries in this file, "Comparison surface: two different measures are colored by rank, on one domain" (withdrawn: a ranking comparison no longer colors the canvas by rank) and "side labels, legend, toolbar and camera when the canvas is split" (now applies only to two drawings; Path and Note stay enabled on a single canvas).
- **Why:** 4 of 4 participants who compared two rankings read the answer from the right column and learned nothing from two drawings colored by rank ("I do not read answers off hairballs"); all four asked for the scatter, and for each side's method under its letter instead of in the Results panel. Drawn in screens/comparison.html.

## Comparison surface: header row 1 loses its overflow menu

- **Document and section:** this file's entry "Comparison surface: Export sits in the header overflow".
- **Old text:** "Header row 1 carries Save comparison and Done, then an overflow menu holding Export...".
- **New text:** "Header row 1 carries Save comparison and Done. The comparison has no export of its own: its data leaves through the dock's Export table as CSV..., which writes every compared element with both values and both ranks." Withdraws the earlier entry.
- **Why:** the owner's decision after round 1 removes the comparison's hidden 100-row export and makes Export table as CSV... the table's one exit; with the Scatter view in the table, that exit already writes the comparison in full.
- **Open:** exporting the scatter as a figure. The Export dialog's figure kinds draw the canvas; whether a dock chart is a figure kind is not decided.

## Difference list: a tied rank reads as a shared rank

- **Document and section:** this file's entry "Comparison surface: the difference list's rows for a rank comparison".
- **Old text:** "A tie too wide for the cell reads 'tied', with its range ('#1,780 to #3,093') in the scope line and the cell's tooltip, and the gap to it is a lower bound ('1,779+')."
- **New text:** "A tied rank reads as the shared rank, '#1,780=', as every exact run shows one ('How a rank is shown'); the gap is measured to it ('1,779')."
- **Why:** one rank format across the inspector, the table and the comparison. Drawn in screens/comparison.html (Higher on A, and ACC-488401 at '#1,575=' in March).

## Keyboard walk: one Esc rule, O as the order key, and one set of walk announcements across the mocks

- **Document and section:** `interaction-pattern-entries.md` 9.2 (Exit; the focus pill; the neighbor order) and `interaction-patterns.md` 3.6 (the Esc ladder, dispatch rows "the canvas, no walk" and "the canvas walk"); `message-catalog.md`, the walk rows. It settles two entries above that contradict each other: "Keyboard walk: Esc on the canvas leaves the walk, not the canvas" and "Keyboard walk, after the keyboard study: keys, the focus pill, the key sheet, Esc and Quick actions" (its Esc bullet and its 3.6 and 3.8 rows), and the order-switch bullet of "Keyboard walk: the walk pill shows the focused node's values and the order, and the order can be switched".
- **Old text:** the later entry: "**Esc leaves the canvas.** With keyboard focus on the canvas (the focus ring showing), Esc closes an overlay the canvas opened ..., then disarms a tool, then ends any walk and moves focus back to the control it came to the canvas from ... With pointer focus (no focus ring), rung 3 deselects, as in Figma." The earlier entry: "The switch is not given its own key ... 'Walk order: {key}. {label}, {i} of {N}.'", keeping the focused node.
- **New text:** "Esc on the canvas takes the ladder 3.6 already decides, one rung per press, with or without a focus ring: close an overlay the canvas opened (a menu, the inspector visit, the key sheet); leave the walk ('Walk ended at {label}. {n} selected on canvas.'), focus staying on the drawing; disarm a tool; clear the selection ('Selection cleared on canvas; {chord}: Previous selection.'). Tab, Shift+Tab, F6 or a click elsewhere leave the canvas. Enter with no walk moves focus into the inspector on the selection (a set, path or item: its members, 4.2); in the walk it visits the focused node there, and Esc returns to the node. The order switch is O (proposed, published keymap), the pill's switch, and three Quick actions commands 'Walk order: weight | degree | name'; each keeps the node stepped from, moves focus to the first neighbor in the new order and says 'Neighbors by {order}. {label}, neighbor 1 of {N} of {from}, weight {w}, {measure} {m}, rank {r} of {total}.' ({order} is 'by weight, highest first', 'by degree, highest first' or 'by name, A to Z'). The focus pill shows whenever the canvas has keyboard focus: 'Start: {label}, the walk starts here' before a walk. The first step's announcement ends with the back key (Shift+Enter; Shift+Up is a second binding), 'Esc ends the walk, Tab leaves the canvas', the selection keys when there is a selection, and '? lists the keys'."
- **Why:** "Esc leaves the canvas" made one key mean two things depending on how the canvas got focus (a click or Tab), which a user cannot see, and gave Esc the job Tab already has; the ladder in 3.6 is the one the Nodes table, every list and Figma use, and a second Esc now names the key that brings the selection back, which answers the participant who would not press Esc for fear of losing three selected nodes. O is kept as a proposal because all three keyboard participants asked to sort neighbors by degree, and a Quick actions round trip is five keys where O is one. With one rule, the working mock (screens/keyboard-walk.html), the keyboard storyboard, the keyboard flow and the kit's key list now say and do the same thing; each had a different Esc, Enter, order switch or back key before. Drawn and wired in screens/keyboard-walk.html (the pill, O, Enter's inspector visit, the ? key sheet, an exact node name in Quick actions); storyboards/keyboard-only.html and flows/keyboard-walk.html follow it.
- **Also, Undo history:** every Undo history submenu in the mocks now shows each entry as its step's name over "Undo back to here ({n} step[s])" (screens/undo.html, screens/filter-steps-and-undo.html, screens/filter-step-recovery.html), and a filter step keeps one name in its row, its undo label and Undo history ("Filter out group 8", as `kit/fixtures.json` names it).

## Accessibility: a control never sits inside another control

- **Document and section:** `interface-specification.md`, the component table rows for `ActionRow` and `DataRow` (the inspector's Attributes, Appearance and property rows); `interface-templates.md`, the option form's weight question and the node's type row with the Select neighbors split; compact-mantine's `ActionRow`, `DataRow` and split button.
- **Old text:** the DataRow note "The row is one button that opens the attribute's menu (Style by this first); hovered or focused, it shows Style by this as its trailing action"; an `ActionRow` with "one action or route" in its trailing slot; silent on where a split button's open state and an option's info button go.
- **New text:** "A row whose trailing slot holds its own button (Style by this, Select painted, an info button) is two sibling targets, never one inside the other: the row's name and value are one button that opens the row's menu or route, and the trailing icon button sits beside it. A radio or checkbox option that carries an info button has the button after the option, not inside it. A split button reports its open menu (`aria-expanded`) on the caret that opens it, never on the wrapper around both halves."
- **Why:** a screen reader reads a button's content as its name and does not expose buttons inside it, so Style by this, Select painted and the option form's "What happens while it is not set" could not be reached or heard (WCAG 4.1.2); the automated check found 26 such nestings on the inspector, the option form and the alert triage screens. The mocks now draw them as siblings with no visible change (screens/inspector.gen.mjs, screens/option-form-cost.py, screens/alert-triage/src/build.py). A layout change inside compact-mantine's rows, reversible.

## Accessibility: where the 24 px carets and checkboxes are drawn

- **Document and section:** this file, "Accessibility: target size of the tool caret and a row's checkbox" (amends its new text); `interface-specification.md`, the toolbar and the node's type row.
- **Old text:** "The tool caret keeps its 16 px drawing and gets a 24 px wide hit area that extends away from the tool, never over it."
- **New text:** "The tool caret's hit area is 24 wide and starts where its tool ends; the chevron is centered in its first 16 px, 7 px right of Figma's drawing, and the next tool moves 15 px right. The same holds for every split button's caret (Select neighbors in the node's type row, the inspector's split buttons): 24 wide, the chevron where it was, the target extending away from its button. A 12 px checkbox keeps its box and gets a 24 x 24 hit area centered on it; its focus ring hugs the box."
- **Why:** Figma draws the chevron over the tool's last 7 px, so a hit area that never overlaps the tool cannot keep the chevron there; the choice is a slightly wider toolbar (30 px with two carets) or two targets on the same pixels. Measured: 310 carets under 24 px and 15 row checkboxes on 33 mock pages before, none after. The kit draws all three now (`kit/kit.css` `.k-tool-caret` and `.k-check`; the inspector, Find and alert triage carets), so every mock shows the wider toolbar. Two-way.

## Accessibility: the app has one level-1 heading, the project name

- **Document and section:** `interface-specification.md`, the left panel header row (project name, chevron menu).
- **Old text:** (none; the project name's element is not specified)
- **New text:** "The project name in the left panel header is the page's level-1 heading, so a screen reader's heading list starts at the project; section headers (Graphs, Sets and paths, Styles, the inspector's sections) are level 2."
- **Why:** WCAG 1.3.1 and 2.4.6 ask that structure be available to assistive technology, and heading navigation is how most screen-reader users move through a page; 12 whole-app mocks had no level-1 heading at all. The kit adds a hidden one from the page title until each mock marks its own.

## Message keys: the published key is graphty. plus the key shown (owner decision, applied)

- **Document and section:** every framework document that names a reader message key; `message-catalog.md`, a new line directly above the first key table.
- **Old text:** `message-catalog.md` in this worktree has no "Published keys" section, and its rows spell keys without a namespace (`undo.done`, `drawn.not`). An earlier entry in this file said keys "are spelled as the catalog spells them, with no namespace prefix; a prefix would be its own proposal".
- **New text (message-catalog.md, above the table):** "Reader messages are published as { key, params, text }. The published key is `graphty.` plus the key shown in this table: the row `undo.done` is published as `graphty.undo.done`."
- **Applied in this file:** the owner decided the form on 2026-09-28, so this is recorded as a decision, not a proposal. The "no namespace prefix" sentence was replaced with "Keys follow the published form graphty.<area>.<message> (owner decision, 2026-09-28)". Every key in proposed text was rewritten to the published form: 79 unprefixed keys before, 0 after. Keys inside quoted old text, references to a catalog row by its current spelling, and graphty-element API names such as `session.styles.update` were left as written.
- **Why:** the decision was already applied in some entries (the count's `set` parameter used `graphty.<area>.<message>`) and contradicted in others (the Find entry proposed its three keys with no prefix). One rule at the top and one sweep remove the drift instead of fixing entries one at a time.

## Message keys: rename the legend's out-of-scope line to graphty.legend.notDrawn (recommended)

- **Document and section:** `message-catalog.md`, the row proposed as `graphty.drawn.outOfScope` in "Find: a hit or a node outside the filter says so in the same words everywhere".
- **Old text:** proposed key `graphty.drawn.outOfScope` ('{N} selected {kind} not drawn: filtered out by "{step}"').
- **New text:** the same message, published as `graphty.legend.notDrawn`.
- **Why:** the message lives in the legend card, so its area is the legend; "outOfScope" names the cause, where every other key names what the reader sees. Kept separate from the prefix sweep because the owner decided the form of keys, not the area names, and an area name in a published key is a one-way door. Recommended, owner's call.

## Message catalog: the undo line for a filter step, and six new keys

- **Document and section:** `message-catalog.md`, the `undo.done`, `redo.done` row and six new rows; `interaction-patterns.md` 3.4. Supersedes the two "version B" entries above ("Undo of a filter step: one line that points to Filter steps" and "the line's Open Filter steps puts the undone step back first") and the proposed key `graphty.undo.filterStep`.
- **Old text:** "| `undo.done`, `redo.done` | Undone: {name}; Redone: {name} | notice | Redo; Undo | ... | out of sight (IP 3.4) |"
- **New text:** the row is reused unchanged for filter steps, published as `graphty.undo.done` and `graphty.redo.done`, with one added action for a filter step, Show in steps: "Undone: {name}. Show in steps". It is shown on every undo and redo of a filter step, whether or not the filter chip is on screen, in the existing notice area; it is announced politely and does not move focus. No new history keys.
- **New keys:**
  - `graphty.load.loadedWith` -- "Loaded with: {choices}", the Last import row's one line (for example "NA read as missing; parallel edges kept (2,298); 150 edges without a weight"); opens the import report.
  - `graphty.weight.notUsed` -- "{column}: numbers, not used", an edge column whose meaning has not been answered.
  - `graphty.path.backInTime` -- "Not in time order: hop {k} ({date}) is earlier than hop {j} ({date2}).", on a path result's state line.
  - `graphty.find.searchedWhere` -- "0 matches in {project} ({N} {kind}).", with the action Search recent projects.
  - `graphty.export.grayCollision` -- "{a} and {b} look the same in gray", with the action Use Print look.
  - `graphty.recipe.needsYourData` -- "Add your table to apply. This recipe needs {column} from your data."
- **Why:** round 2's most severe undo finding: undo removed the good step and was silent, because a filter step changes counts, not the canvas. Reusing the existing row keeps one undo message; the new keys carry the round-2 findings on load choices, weights, path dates, empty Find, gray export and recipes. Published keys, so the wording is the owner's call.

## Filter steps and undo: undoing "add step" unticks it; only Delete removes a step

- **Document and section:** `interaction-pattern-entries.md` 6.9 (Turn off) and 6.4 (Delete); `interaction-patterns.md` 3.4.
- **Old text:** (silent on what undo does to a step's row; undo of "add step" removes the step, and a later edit clears Redo)
- **New text:** "Undoing the addition of a filter step unticks it: the row stays in the steps list, turned off. Only Delete step removes a step. Ticking a step on or off is an ordinary entry in linear undo: it clears Redo like any other change, and nothing is lost because the row stays. There is no 'Put back' command and no separate 'undone' row state; the checkbox is the way back."
- **Why:** severity 4 in round 2. An analyst pressed Undo, which removed the good step, then ticked another step off, which cleared Redo, and the good step was gone for good. Six of seven roles in the focus group converged on "undo unticks, never deletes". Replaces the earlier proposal to show Redo's steps as undone rows.

## Filter steps and undo: the undo line's one action, and where Show in steps puts focus

- **Document and section:** `interaction-patterns.md` 3.4 (the notice); `message-catalog.md`, the `undo.done`, `redo.done` row. Supersedes, for filter steps, "a visible control that shows the change settles when Undo shows a notice" above: the line shows whether or not the chip is in view.
- **Old text:** the catalog row gives the notice the action Redo (Undo on `redo.done`); the entry "the undo line for a filter step, and six new keys" adds Show in steps but does not say whether Redo stays, or where Show in steps puts focus.
- **New text:** "For a filter step the line has one action, Show in steps, in place of Redo: Redo is one key away (Ctrl+Shift+Z, Ctrl+Y off macOS) and the Edit menu names it, and a second action would push the line past the notice cap. The line names the step reversed ('Undone: Filter out group 8', with no final period, as content-design.md asks of every notice); when Undo history reverses several at once it names the oldest and counts the rest ('Undone: Filter to degree >= 5 and 1 newer'). Show in steps opens the filter chip's steps list, opening the left panel first if it is closed, with focus on that step's row, now unticked; the row is marked selected until the list closes. The line itself never takes focus."
- **Why:** the steps list is where an unticked step can be ticked again, so the one action goes there; with undo unticking, Redo is a shortcut rather than the only way back. Drawn and wired in screens/undo.html (states 2 and 2b). Two-way door, decided.

## Undo and the other ways back: where Show in steps puts focus

- **Document and section:** `interaction-patterns.md` 3.4 (the notice); `message-catalog.md`, the `undo.done`, `redo.done` row; `interaction-pattern-entries.md` 6.9.
- **Old text:** (silent; the round-2 decision gives the line "Undone: {name}. Show in steps" but not what the action does)
- **New text:** "Show in steps opens the filter steps list under the chip -- opening the left panel first if it is closed -- with keyboard focus on the row of the step the line named. It never ticks, redoes or changes anything itself. The line never takes focus on its own; it is reached by a click or by Tab into the notice. A line with an action stays about 6 seconds or until the next action; the chip opens the same list after it is gone. Redo shows the same line with 'Redone: {name}' Undo pressed with the list already open shows no line, because the list shows the change."
- **Why:** under the unticking model the step just undone is usually the good one (the reflex Ctrl+Z takes back the newest step), so focus on its row puts the recovery, one Space, under the analyst's hand; after two presses it lands on the wrong middle step, with the good one directly below. An action that changes state (the withdrawn "puts the undone step back first") would hide a second change inside a navigation. Drawn in flows/undo-and-ways-back.html, frames 2 to 5. Two-way door; the message key is already proposed.

## graphty-element: an unanswered weight meaning is "not used" by every measure

- **Document and section:** graphty-element's list of needs (`element-needs.md`); `options-and-encodings.md`, the weight-meaning question.
- **Old text:** (silent; today PageRank reads an edge weight whose meaning was never answered, while path measures ignore it)
- **New text (proposal to graphty-element):** "A weight whose meaning has not been answered is not used by any measure, PageRank included. A run asked to use a weight it cannot use refuses before it starts, with the reason and the route to answer the question; it never runs with the weight silently dropped." The weight meaning is asked once, on the column, and every measure and the Path tool read that one answer.
- **Defect to file:** PageRank uses an unanswered weight today, so the same column means something in one measure and nothing in another.
- **Why:** severity 4 in round 2 -- a participant saw a weight named on the result but the paths were counted in hops, and could not tell which results used it.

## Binding step: a recipe's weight carries its meaning, asked in the column's words

- **Document and section:** `task-flows.md` 8, the decision node and the paragraph "Replace data binds only when it must"; `glossary.md` 11, Weight roles (the "Gloss on screen" column and the unknown row); `interface-templates.md` 20, Binding step.
- **Old text:** task-flows.md 8: "Anything unmatched, a level changed, or a weight role undeclared?" and "the binding step opens only when a slot fails to match, a measurement level changed, or a weight column has no declared role." glossary.md 11 glosses: "smaller = closer", "larger = closer", "how much can flow", and the unknown row "paths ignore it; PageRank and communities read it as a similarity".
- **New text:** the decision reads "Anything unmatched, a level changed, or a weight's meaning that disagrees with the recipe's?" and the paragraph: "A recipe carries the meaning each of its runs read for a weight. When the reader's column has no meaning yet, the weight row shows the recipe's answer in the meaning select, marked 'the recipe's answer', and Apply sets it on the column inside the one undo entry; nothing is asked. When the reader's column already has a different answer, the row goes under Needs a choice, the select opens with nothing preselected and names both answers ('the recipe's answer', 'your answer on this network'), and Apply waits." The meaning is asked once, on the column, in one select that every measure and the Path tool read: "For {column}, a higher number means..." with the options "a closer or stronger link" (secondary: similarity), "a longer or costlier step" (distance), "more can pass through" (capacity) and "Don't use {column}". The technical term is only ever secondary text. The Weight need's column picker is an ordinary select listing the numeric edge columns, never a greyed field. An unanswered or declined column reads "{column}: numbers, not used" (the proposed key `graphty.weight.notUsed`), and a run that needs it is kept, switched off. Delete from the screen vocabulary: "unknown role", the conversion "1/w" as a label, and the hint "Read as a distance. Not used while not set."
- **Why:** round 2 found one severity 4 and two severity 3 problems with the weight: a weight shown on the Path tool while the path counted hops, "No weight" hiding a numeric column, and role words that fit neither money nor confidence scores ("It's the amount. It's dollars."). One place for the meaning removes all three. A recipe's author already answered for the runs she saved; asking every recipient again would add a stop to the path the study showed works (everything matched, Apply from the preview), so the question is asked only on a disagreement, as a fold-change sign is. Drawn in screens/binding-step.html, the Weight row in states 1 to 4 and the section "What a weight means". Two-way door: the wording and where it sits; whether the meaning lives on the attribute stays one-way door 21, the owner's.

## Run options: a run that cannot use its weight refuses, like the filtered-scope refusal

- **Supersedes, in part:** "Betweenness weight field copy" (the hint "Read as a distance. Not used while its meaning is not set." is deleted), the "Not sure -- decide later" choice and its info mark in "The weight-meaning question moves from loading to the first run that needs it" and "The weight-meaning question: its examples are real values of the column", and, in "Paths between: Weight by is an edge-column option that asks what a bigger value means", the rule that Not sure runs unweighted. It builds on "graphty-element: an unanswered weight meaning is "not used" by every measure", above, which holds the element behaviour.
- **Document and section:** `options-and-encodings.md`, the weight-meaning question and the Weight by option; `interface-templates.md` 10, Result (the error slot and the header's TrailingSlot); `interaction-pattern-entries.md` 8.1 (a refusal before the run); `message-catalog.md`, one new key; `glossary.md` 11, the unknown row.
- **Old text:** (options) the first run that reads a weight asks the question inline and "Run is not blocked: Run with no answer runs as Not sure"; (glossary 11) "**unknown** -- paths ignore it; PageRank and communities read it as a similarity".
- **New text:** "When a run is set to read a weight it cannot use -- a column whose meaning is unanswered, or one whose answer the measure cannot read (more can pass through, for a measure that weights paths by length) -- graphty-element refuses it before it starts. The app shows the refusal with the same component, wording shape and focus order as the filtered-scope refusal: the error slot at the top of the editor (warning glyph, the cause in bold, one secondary line, role alert), the warning mark on the field that causes it (Weight by), and the header's one primary Button carrying the fix where Run was, focused. The cause reads `graphty.run.weightNotUsable` 'Can't weight {what} by {column}: {column} isn't set up as {needed} yet.' ('Can't weight paths by confidence: confidence isn't set up as a length yet.'), the secondary line 'Betweenness counts shortest paths. Until you say what a higher {column} means, no measure uses it, PageRank included.' The button reads 'Set up {column}' and opens the weight question for that column under the Weight by field, focus on its first choice; Run stays off until it is answered, and nothing runs meanwhile. The question reads 'For {column}, a higher number means...' with three real example values and four choices: a closer or stronger link (similarity), a longer or costlier step (distance), more can pass through (capacity), Don't use {column}. Answering writes the meaning to the column as its own undo entry and turns Run on; the run is still a click. Esc closes the editor with nothing run and the earlier values kept." Glossary 11, the unknown row: "**not set** -- no measure uses it, PageRank included; a run asked to use it refuses and asks." Statistics reads an unanswered column as '{column}: numbers, not used'.
- **Why:** round 2, severity 4: PageRank silently used an unanswered weight while paths and Betweenness ignored it, so "the same unanswered state does two opposite things depending on the measure" (weight-at-first-run), and a path shown as "weighted by amount" was counted in hops ("The box said amount and it quietly didn't."). A refusal that looks and behaves like the filtered-scope refusal is one thing to learn; a "decide later" choice is no longer needed, because leaving the question unanswered already means not used. `study/round-2/insights.md`, finding 5; `study/decision-log.md`, round 2, "Run options".
- **Needs from graphty-element (not the app):** the refusal and "not used" are the element's behaviour: a run that names a weight it cannot use returns a refusal with the column, the reason and the needed role, and never runs with the weight silently dropped. The app shows what the element returns and never decides it.
- **Open for the owner:** the message key name, which is published. Whether 'isn't set up as a length yet' is right for a capacity answer on a path measure, where no later answer to the same question would help (proposed there: 'Can't weight paths by {column}: {column} is set up as an amount that flows, not a length.', with the same button).
- Drawn in screens/option-form-cost.html, states 1 and 2.

## graphty-element: dates at load, and time order on paths

- **Document and section:** graphty-element's list of needs; `task-flows.md` 10.3 (paths that run forward in time).
- **Old text:** (silent; a date column loads as text)
- **New text (proposal to graphty-element):** "The load step recognizes a date column as a date type. A path result carries a time-order flag: the first hop whose date is earlier than the hop before it, so any consumer can print 'Not in time order'. A time-respecting path option, which finds only paths whose hops run forward in time, is proposed as a later capability."
- **Why:** severity 4 in round 2 -- "the transfers have no dates": an investigator could not tell whether money moved in order. Hops stay in path order; sorting them by date would scramble the route and hide exactly the inversion. Range filters on a date column also need a real date type to be honest.

## Canvas drawing: the Print look never carries sign on lightness alone

- **Document and section:** `canvas-drawing.md` section 3 ("The key's shape follows the measurement level") and section 4a (Looks).
- **Old text:** (silent on how a diverging layer survives gray print)
- **New text:** "Under the Print look, a signed (diverging) layer never carries the sign on lightness alone: it uses a ramp whose lightness changes in one direction from end to end, with the midpoint stated in the legend, or it adds mark shape for the sign. The export dialog's gray-collision check also runs on a diverging layer's two endpoints and names any pair that prints the same gray."
- **Why:** a symmetric diverging scale prints +2 and -2 as the same gray, and in round 2's gray-figure finding (severity 4) the gray preview was not the file that was written. `options-and-encodings.md` already notes that the shipped red-blue palette fails the midpoint rule.

## File formats (one-way doors, proposed)

- **Document and section:** `output-homes.md` (export); graphty-element's list of needs.
- **Proposed, for the owner:** [SVG now and PDF later: decided by the owner, 2026-09-28] SVG and PDF figure export with real text; a `{file}-methods.txt` file written beside every CSV export (scope, load choices, weight answer, normalization, seed, graphty-element version, and on sampled runs the rank low and high and the error bound -- never comment lines inside the CSV, which break spreadsheet imports); the `.graphty` file's format and schema, described in the export dialog as "Readable text (JSON) with styles, steps and layout. It never holds your data."; a recipe marker for an input "supplied by the recipient", so Apply never binds a column from the sender's own network.
- **Why:** each is a file other tools and people will read, so each is a published format. Evidence: round 2's export and recipe findings (both severity 4).

## Recipe travels: an input the recipient supplies waits for their table, never takes the network's column, and a missing column says "ask the sender"

- **Supersedes, for inputs the recipient supplies:** "Recipe travels: two columns that fit one requirement are never bound silently" (a network column is no longer a candidate for such an input, so the two-candidate choice cannot arise there) and "Recipe travels: a column proposed by level is marked, never bound silently" (no column is proposed for such an input). Both still hold for inputs read from the network.
- **Document and section:** `interaction-pattern-entries.md` 6.10, Behavior; `interface-templates.md` 20, Binding step; `message-catalog.md` `file.binding`; `task-flows.md` 8 (the Apply decision); `one-way-doors.md` 19 and `files-and-recipes.md` 1 (the recipe file; FOR DECISION, a published format).
- **Old text:** (6.10) "The binding step then matches attributes by name and level and offers a picker for the rest"; the recipe records what attributes it needs, not who supplies them.
- **New text:** "Export recipe... lists each input the recipe will ask for with a Select, 'Their table' or 'The network', and the column name the recipient should bring. A join key starts at Their table; any other input starts where its column lives in the sender's project. The recipe file records the choice (proposed field). When the recipe is applied, an input marked Their table is filled only from a table the recipient adds in the Apply dialog or has already joined; a column in a network file is never a candidate, even under the recipe's own name, and the dialog says once that it is not used. While such an input has no table, the dialog lists 'Your table: not added yet' with a full-size Add your table... button that takes focus, the input reads 'waiting for your table', and Apply is disabled with its reason printed beside it: 'Add your table to apply. This recipe needs {column} from your data.' The dialog never says everything was found while an input waits. When the table has no column of the recipe's name, the row is marked and its picker starts empty, listing the table's columns of the required level with count and range, and says 'Your table has no {column} column. Ask the sender which column they meant.' Nothing is proposed or bound for the recipient, not even a close name; Apply stays disabled with 'Choose the {input} column to apply.' A column the recipient picks is recorded in the report as 'chosen by you'."
- **Why:** severity 4 in round 2, 3 of 3 sessions of the use-a-colleague's-file task (`study/round-2/insights.md`, finding 4): the dialog enabled Apply and said "Everything was found by name" before the recipient's table was in, using the network's own log2FoldChange; Tom caught it only because 152 + 148 = 300 against his 96 rows, Maren had her cursor on Apply, and Elena said she would have pressed it. The first-contact focus group raised it to severity 4 because it survived the revision. Only the author knows which inputs are the recipient's, so the mark is the author's; the element does the matching and owns the rule, the app draws the rows. Drawn in storyboards/recipe-travels.html, frames 1, 4 and 6 and branch B. screens/recipe-apply.html (states 3 and 4) and screens/binding-step.html (states 1 to 3) still draw the earlier dialog and need the same change.
- **For the owner (one-way door):** the recipe-format field that marks an input as supplied by the recipient, with its expected column name. Without it the element cannot tell the recipient's input from the network's, and the fix cannot hold.

## Export: one Look drives the preview and the file (replaces View as)

- **Document and section:** `interface-templates.md` 20 (the Export dialog's figure preview); `canvas-drawing.md` 4a (Looks) and 13 (the figure). Supersedes "Export preview: View as gray or with a color-vision deficiency" above.
- **Old text:** (that proposal) "Above a figure's preview, a segmented control 'View as: Colour / Grey / Red-green / Blue-yellow' redraws the preview ... It changes the preview only; the file is always written in colour."
- **New text:** "No export preview differs from the file it previews. Above a figure's preview, one select, **Look: Screen / Print**, sets the look the selected figure is written with, and the preview is redrawn in it; beside the select one line says 'File is written with: {Screen|Print} look'. It does not change the canvas's own look. Directly under the preview, graphty-element's gray check names every pair of colors in the figure that would print as the same gray ('Ribosome and Proteasome look the same in gray'), with **Use Print look** beside it; for a diverging (signed) layer it compares the colors on either side of the midpoint, including both ends ('+3.15 (dark blue) and -1.85 (red) look the same in gray'). In the Print look the line says what was checked and that it passed. The methods text names the look."
- **Also:** a signed column gets its diverging layer from the column's ordinary Color by (it already diverges at 0, `options-and-encodings.md`, the signed-values rule); the export dialog carries no special button for it. The default look's label, "Screen", is a new chrome word; the Colorblind safe and High contrast looks are not offered in this select (see Open).
- **Evidence:** round 2, "A figure for a reviewer: the gray check misleads" (severity 4, `study/round-2/insights.md` section 3): in all 7 sessions the gray preview was misread as the setting or gave no route to a fix, and a student would have sent a color file to a black-and-white journal.
- **Element need:** the gray check (pairs of a figure's colors closer than a lightness threshold, per layer, diverging ends included) and the Print look's palettes are graphty-element's; the app shows the result and never computes it.
- **Open:** the threshold (the mock names pairs under 6 L* apart); whether the select should also offer Colorblind safe.
- **Drawn:** screens/export-dialog.html, states 1, 1b, 1c and 3 (live: click Look or Use Print look).

## Export: tables leave through the CSV dialog, reached from Export too

- **Document and section:** `interface-templates.md` 16 and 20; amends "Export table as CSV...: the table's one exit, and Export files... no longer offers tables" above.
- **Old text:** (that proposal) "Template 20: remove the **table** row; the header's button is labelled 'Export files...' (figures, data, recipe, style, findings report)."
- **New text:** "The Export dialog keeps a Tables section holding one button, **Export table as CSV...**, which opens the table's CSV dialog (with Back to Export); there is no table checkbox. The CSV dialog states its rows first as 'N of M rows, filtered' (or 'All M rows') and names the tab and the filter step. Its preview shows the file's first lines exactly as written, ids as the file had them (never with thousands separators). Every CSV is written with a sibling '{file}-methods.txt': rows and scope, load choices, the weight answer, normalization, seed, the graphty-element version, and for a sampled run each rank's low and high and the error bound. The CSV holds no comment lines."
- **Evidence:** round 2 sections 12, 13, 19 and 20: two exports that disagreed (a filtered 157 rows exported without saying the list is 3,093), provenance that did not leave the app, and ids shown as quantities.
- **One-way door:** the sidecar's name and contents are a file format; proposed under "File formats (one-way doors, proposed)".
- **Drawn:** screens/export-dialog.html, state 2. screens/table-dock.html's CSV dialog still lacks the rows wording and the methods file and should be brought in line.

## Export: the style file is part of the recipe; layout travels as its settings

- **Document and section:** `files-and-recipes.md` 1 and 3; `interface-templates.md` 20 (the Starting point / Share the setup section).
- **Old text:** two rows, "Recipe: definitions only, never the data" and "Style file: style layers and the Look only"; the recipe's manifest listed "view, without positions".
- **New text:** "One row, Recipe, writes the setup: style layers, filter steps, runs with their parameters, and the layout as its method, settings and seed (never positions, which are drawn again on the recipient's data). Under the row one line says what the file is: 'Readable text (JSON) with styles, steps and layout. It never holds your data.'"
- **Evidence:** round 2, "The share-a-recipe file: what it is and who can open it" (severity 3, `study/round-2/insights.md` section 28; 4 of 4 share-without-data sessions): Recipe and Style file overlapped, the file line did not say whether the file is readable text, and the layout did not travel (Mara).
- **One-way door:** the .graphty schema; proposed under "File formats (one-way doors, proposed)".
- **Drawn:** screens/export-dialog.html, state 4.

## Information architecture: four placements

- **Document and section:** `information-architecture.md`, the File menu (line 307), the data inspector's Last import row, the table dock, and the time slider.
- **Old text:** "Join... / Replace data... / Connect to data source... / ..."
- **New text:** "Replace data..." is relabelled "Update with a new export...", described "Replaces nodes and edges. Keeps styles, sets, notes and runs." (a rename, not a second command; a command label, so proposed). The collapsed table dock shows a visible strip labelled "Table"; no new toolbar button. A time window is an ordinary filter step, written by "Filter to this window" on the dock's time slider, by the date column's histogram band, or by a date rule in the step editor. The one-node inspector's neighbors button reads "Neighbors" and its main action is Filter to neighbors at every graph size; Select neighbors moves to its caret menu.
- **Why:** round 2 findings: the weekly refresh (severity 3); no visible table while the dock is collapsed (severity 3); an unlabeled neighbors button whose main half selected nine points inside a density drawing instead of showing them (severity 3; Nadia, Sarah). Filter was chosen over Select because a selection inside a density drawing shows nothing -- flagged for a check with real users.

## Where your data goes: data-source password storage (owner decision)

- **Document and section:** the "Where your data goes" page (screens/data-location.html) and "Open decisions for the owner", above.
- **New text, for the owner:** add the data-source password to the open decisions. Recommended default: kept in memory until the tab is closed, never in browser storage; the page states it ("Data-source password: kept in memory until you close the tab"). It sits beside the rows still open: hosting and its country, telemetry, self-hosting, an organization-wide switch to turn the Assistant off, and the contact line.
- **Why:** an IT reviewer in round 2 said "Database credentials in localStorage is a finding."
- **Also, the location line names the host and says what went (`information-architecture.md` 5, the location slot; `interface-templates.md` 17, Version history's operation log; `message-catalog.md`, proposed keys):**
  - **Old text:** "Sent to: {source}" after a data-source query; "Assistant on: sends {what}" while the Assistant is on.
  - **New text:** after a data-source query, "Sent to {host}: {n} query"; while the Assistant is on and before a send, "Sends node names and statistics to {host} when you ask"; after a send, "Sent to {host} at {time}: {n} node names, {m} statistics" followed by the link "See what was sent", which opens a popover listing the time, the provider, the question, every node name and each statistic, with Copy as text. The line always names the host, never "a data source". Each send (data-source query or Assistant request) is one entry in Version history's operation log, newest first, which Export log writes to a file.
  - **Element need:** graphty-element's Assistant reports each request it sends (host, time, question, node names, statistics) as data, so the line, the popover and the log read it; the app never reconstructs a request.
  - **Evidence:** round 2, the IT reviewer: "If it just says 'Sent to: data source', it's useless to me", and she could find in the app no screen saying what a query had sent (Assistant disclosure, severity 3). The operation log is the existing home for what left, so no new place is added.
  - **Drawn:** screens/data-location.html, section 3, and the page's "The app says when something leaves" paragraph.

## Carry-over: the walk keys in the framework's own passages

- **Document and section:** `interaction-pattern-entries.md` 9.2, entry 4.2 and the modes table; the published keymap.
- **New text:** these three passages still say plain arrows walk and must be corrected to the Shift+Arrow walk (see "Keyboard walk: Shift+Arrow walks, and what each of the four does" and "the three passages that still say plain arrows walk", above). Add the walk-back key (Shift+Enter in the mocks), the walk-home key, and the neighbor-order wording as proposed keymap roles. The load step's weight-meaning question is carried over as the column-level question in "an unanswered weight meaning is 'not used' by every measure", above.
- **Why:** the owner's Shift+Arrow decision is binding on every keyboard mock and task; round 2's failed keyboard task was a mock defect (Javert was not in the loaded graph), not evidence against the keys.

## A recipe's "your data" needs: Apply waits with its reason, never the sender's column, and single-node groups get their own report line

- **Document and section:** `interaction-pattern-entries.md` 6.10, Behavior; `interface-templates.md` 20, Binding step; `message-catalog.md` `file.binding`; `task-flows.md` 8 (the preview and "read the replay") and 8.1. Supersedes, for a need the recipient supplies, the entry above "When no column matches a requirement by name and exactly one column of the required level exists ... the element proposes that column", and the preview's all-matched state in "When every need is found by name ... its Apply commits".
- **Old text:** (6.10) "Choosing one shows what it carries before it is applied: style layers, runs with their cost bands, overview readings, set slots and the attributes it needs." The binding picker lists every column of the required level in the loaded data, including the recipe's own network; an all-matched preview says "Everything was found by name" and enables Apply. (8, replay report) one results line per partition, "{n} communities, was {m}".
- **New text:** "A recipe marks each need the recipient supplies ('from your data'). For such a need: (1) until a table of the recipient's is added, Apply is disabled and its reason is printed beside it as text, not in a tooltip: 'Add your table to apply. This recipe needs {column} from your data.'; (2) the picker lists only columns from files the recipient added, never a column from a file the recipe brought, even when its name matches; (3) when the recipient's table has no such column, the row reads 'Your table has no {column} column. Ask the sender which column they meant.', Apply stays disabled, and no column is proposed by level in its place. A preview never prints a blanket 'Everything was found by name'; each found need is listed with its column and what it feeds. In the replay report, a partition whose count grew because nodes lost every edge gives them their own line after the count: '{n} communities, was {m}' then '{k} new single-node groups: {nodes} with no {edges} in {version}'."
- **Why:** round 2, severity 4 (`study/round-2/insights.md`, finding 4; `study/decision-log.md`): in 3 of 3 sessions with a colleague's recipe, Apply was on and the page said everything was found by name before the table was added, using a log2FoldChange column that came inside the sender's network; with the table added, the picker offered it beside the table's log2FC. One participant caught it only by arithmetic (152 + 148 = 300 against his 96 rows), so it is worse than rated. The single-node line answers the severity 3 weekly-refresh finding (finding 18): the jump from 35 to 65 communities stopped 4 sessions, and 26 of the new groups are accounts with no April transfers. Drawn in `flows/replace-and-recipe.html`, "A recipe that brings its own network and needs your table" and step 5.
- **One-way door, for the owner:** the "from your data" marker is part of the recipe file format (already listed under "File formats (one-way doors, proposed)"). The two sentences are message-catalog text under a published key, so their wording is the owner's call. The label "Update with a new export..." is proposed under "Information architecture: four placements".

## Table: an edge's time column shows by default, after the endpoints

- **Document and section:** `interface-templates.md` 16, Regions and rows (the Edges tab's columns); `information-architecture.md` 8.1 (the table); `content-design.md` 5, Dates; `output-homes.md` 3, export-table; the inspector's connections list and the walk list, wherever they list edges.
- **Old text:** (silent on column order; the Edges tab follows the file's column order, so a time column read last is scrolled past)
- **New text:** "On every list of edges -- the Edges tab, an account's connections, the walk list, a path's hops and the CSV -- an edge's time-role column (a date or datetime) is shown by default and placed directly after the two endpoint columns, whatever its place in the file. The reader can still hide or move it; the default is what is fixed. Values follow content design 5, Dates: ISO order, the zone named once in the header's profile line, trimmed per column to the coarsest unit that still separates its values (seconds over a month of transfers, minutes for five path hops). The CSV writes the stored value (ISO 8601 with its zone) with the zone in the header ('timestamp (UTC)'). A path's hops stay in path order, never date order."
- **Why:** round 2's most severe investigator finding (severity 4, 10 sessions): no transfer on any screen showed when it happened, so "within 30 days", pass-through and a path running backwards in time could not be checked. The fixtures always carried the timestamps; only the column order hid them. Recognizing a date column as a date is graphty-element's (see "graphty-element: dates at load, and time order on paths"). The CSV header spelling is part of a file format and stays proposed. Drawn in screens/table-dock.html, "The Edges tab" and "Getting rows out" (the path's hops).

## Table: the collapsed dock is a strip labelled Table

- **Document and section:** `interface-templates.md` 16, Regions and rows and Tab order; `state-matrix.md` 3, the Bottom dock rows (a new Collapsed state); the "Information architecture: four placements" entry above, which records the decision.
- **Old text:** (silent on what a collapsed dock leaves behind)
- **New text:** "Collapsed, the bottom dock is a strip one row tall (32) across the canvas column: a chevron pointing up, the table icon, the word Table, and the scope line's counts ('77 nodes, 254 edges'; '27 of 77 nodes, 104 of 254 edges' under filter steps; the selection's count in the Selected scope), with 'View > Table' at its right end. A click or Enter opens the dock at the height the reader last set. Dragging the dock below five rows collapses it to the strip; nothing hides it entirely. The strip takes the dock's place in Tab order and in the region cycle. State matrix, new row: 'Bottom dock | Table | Collapsed | the strip, with the counts | open'. There is no table button on the toolbar."
- **Why:** round 2 finding "there is no visible way to open the table" (severity 3, 9 sessions, 6 participants): with no toolbar icon that read as a table, people fell back on Export files.... The dock is the table's one home (`information-architecture.md`, the Bottom dock row) and View > Table already opens it, so a visible label where the dock lives answers the finding without a second route. The strip is a new compact-mantine part (a collapsed variant beside `ResizeHandle`), a question for compact-mantine, not app code. Drawn in screens/table-dock.html, "Collapsed".

## Table: a degree column names its scope in its own header

- **Document and section:** `interface-templates.md` 16 (the rank columns entry above, "Degree has the same pair, headed with its scope only"); `content-design.md` 5 (a number names its set when it departs).
- **Old text:** "Degree has the same pair, headed with its scope only" -- the scope in the group header, the column itself labelled "degree".
- **New text:** "The degree column's own header names the graph it was counted on, in the CSV's spelling: 'degree (full graph)', 'degree (filtered graph)', 'degree (total, full graph)' on a directed graph. Its group header reads 'Degree' only. The inspector's degree row uses the same label."
- **Why:** round 2 finding "a count that does not name the graph it was counted on" (severity 3, 12 sessions): with two degree columns in view people could not tell which to report, and the group header above was not read as part of the column's name. The column label is what a reader quotes and what the CSV writes, so the scope belongs there. Drawn in screens/table-dock.html, every state with a degree column.

## Asked for, logged, not designed

Participants wanted these; each is logged with who asked (evidence in `study/round-2/insights.md`) so a later round can revisit it, and none is designed now:

- A group-aware bridging measure (participation coefficient). In the costly-measure sessions Emma, Priya, Chris and Min-ji all answered "high betweenness" when the task asked which proteins bridge groups. Deferred: the request may come from how the task was worded.
- A full log of what the Assistant sent. The IT reviewer, Sarah and Marcus could not tell from the app what had left after a query. Each send now lands as one entry in Version history's operation log; a fuller log is not designed.
- A standing search index across projects. Sarah and Marcus failed to find a flagged account that lived in another project. Replaced by an on-demand Search recent projects, which needs no stored index.
- A named significance test and p-values in group comparison. Chen and Maren wanted enrichment p-values. Many uncorrected tests invite false findings, so the comparison shows an effect size labelled "effect size, not a significance test" and says enrichment analysis is not part of graphty.
- Kendall tau-b as a second agreement coefficient. Emma, Mara and Chen called the label "Spearman (ties inflate this)" wrong. The wrong label was the defect; Spearman with average ranks already handles ties, and Dana's reaction to a coefficient on a slide ("If I put 'tau-b 0.781' on a slide ... I'm dead.") argues for a plain sentence first.

## Loading data: the load choices have one home, the import report

- **Document and section:** `output-homes.md`, the data version row and "the latest import's headline and mark rows"; `interface-specification.md` 4.1, the Nothing note (the Last import row); `message-catalog.md`, `load.report` and the proposed `graphty.load.loadedWith`. Supersedes in part "Main frame at rest: the Last import row is shown only while it has something the chip cannot say" and the round-2 recommendation that the file popover and Statistics each carry a "Loaded with" line.
- **Old text:** (`interface-specification.md` 4.1, as amended above) "the Last import row only while it carries {N} unmatched or {N} rows dropped"; the load's choices (how a column was read, the parallel-edge policy) have no reader after the load step closes.
- **New text:** "The load's choices are kept once, in the import report of the data version the load made (its entry in Version history). The Last import row is shown while it carries {N} unmatched or {N} rows dropped, or while the load made a choice; its second line is `graphty.load.loadedWith`, 'Loaded with: {choices}' ('Loaded with: NA read as missing; parallel edges kept (2,298); 150 edges without a weight'), each choice in the load step's words with its count, and the row opens that import report. Statistics shows no other copy of the choices: its Edges row gives facts about the built graph (direction, parallel-edge count, the weight's state). A run's record names the data version it ran on and links its import report; it does not copy the choices." The import report lists, in order: the report line (`load.report`), Loaded with (each choice and its count), Found (counts, with any drop said in words and names), Used by (the runs on this version), and Re-map columns....
- **Why:** severity 3 in round 2 (study/round-2/insights.md, finding 7): after loading the evidence file, three participants looked for the choices that produced 2,298 edges and 150 blank weights and found only "weight: confidence"; a fourth asked "150 of what?". Copying the line into the file popover, Statistics and every run record would give three copies that drift after a Re-map or an update; one home with one pointer cannot disagree with itself. Drawn in screens/load-step.html, frames 9 and 10.

## Loading data: a date column is read as a date, and the sample says its range

- **Document and section:** `interface-templates.md` 20a, the mapping rows; with the graphty-element proposal "graphty-element: dates at load, and time order on paths", above.
- **Old text:** "each column's kind and role as `StyleSelect`"
- **New text:** "each column's kind and role as `StyleSelect`; a column graphty-element recognizes as dates is offered as Date (or Date and time, with the zone the file writes), and the sample's header under it gives its range ('date, Mar 1 to Mar 31, UTC'). The kind can be changed like any other."
- **Why:** round 2 (severity 4): investigators could not tell whether money on a path moved in time order, and a date range filter is only honest on a real date type. Drawn in screens/load-step.html, frame 1.

## Export: a written figure can be matched to its preview without the app

- **Document and section:** `task-flows.md` 9, the trust checks of the figure branch; `canvas-drawing.md` 13 (what an exported figure carries).
- **Old text:** "Legend drawn in, with scope and a key for every kept mark"
- **New text:** "Legend drawn in, with scope and a key for every kept mark; when a Look other than Screen is in force, the legend's first line names it (for example "Print look"), and the caption states the scope with its counts ("Filtered graph: 1,059 of 1,262 interactions"). The toast after writing names the files and offers no Open: a browser cannot open a downloaded file, so the analyst opens it from the browser's download list and compares it with the preview by those two lines."
- **Why:** round 2's gray-figure finding (severity 4, study/round-2/insights.md finding 3): nobody could confirm the written file was gray, because the gray preview was not the file. Once the preview is always the file, the analyst still needs something in the file itself to check it against, and the Look's name and the scope line are the two things a reader can compare at a glance. Drawn in flows/export.html, steps 4 to 6. Two-way door.

## Main frame at rest: the sample's starting look paints one channel

- **Document and section:** `options-and-encodings.md` 6, Legends; `interface-specification.md` 4.1, Nothing (the resting frame). The framework does not say what style layers a sample opens with; the mocks had decided "Group color" plus "Size by degree".
- **Old text:** (mocks only) the Les Miserables and protein samples open with a color layer and a "Size by degree" layer, and the legend shows two blocks.
- **New text (added to options-and-encodings.md 6):** "A sample opens with at most one encoding layer, on one channel; every node is drawn at one size. Size by an attribute is added by the reader, as a layer on top of the stack titled for what it shows, 'Size: number of connections' for degree, with a legend block in the same words. A result painted onto the canvas uses one channel, color or size, never both, so each legend block makes one claim."
- **Legend title wording:** this follows the owner's decision, "Size: number of connections", without the "(degree)" suffix the entry "Legends: a block's title says what the channel encodes" proposes. One of the two should win before the framework is edited.
- **Why:** severity 3 in round 2 (study/round-2/insights.md, finding 27): in 6 sessions with 5 participants people read the biggest dot as the most important and could not say which measure they were looking at, because size and color made two claims at once. The sample's layers are the app's own starting look, not a graphty-element default, so this is reversible (study/decision-log.md, "The resting frame").
- **Drawn:** screens/frame-at-rest.html, states 1 and 2 (one size) and state 9 (size added).

## Notes panel: Detached says what happened, and every time gives its full date

- **Document and section:** `glossary.md` 10 (the Detached state); `interface-templates.md` 4, the row anatomy proposed above ("Notes panel: what a note's row shows"); `message-catalog.md`, a new key for the explanation.
- **Old text:** a Detached target shows the mark "Detached" and its verb "Restore set", with no explanation. The row's time is short and relative under a week ("2h", "1d"), then the date ("Sep 24"); only the Note editor shows the full date and time.
- **New text:** "A Detached mark on a note row, and in the Note editor, is followed on the next line by one sentence in secondary ink that says what happened: 'The set this note pointed to was changed.' (a new key `graphty.note.detached`, with {kind} for a node, an edge or a set). Its verb stays 'Restore set'. Every relative or short time on a note, in the Notes panel and in the inspector's Notes section, shows the full date and time in a `Tooltip` on hover and keyboard focus ('Sep 28, 2026, 10:14'). The row's overflow sits after the time in the trailing slot, never over it, so the time stays readable and can be hovered."
- **Why:** round 2 (`study/round-2/insights.md`, finding 24, severity 3; 3 of 3 remember-why sessions: Sarah, Marcus, Alex) found "Detached / Restore set" unexplained and relative times ("2h") unfit for a case record. A glossary word alone did not carry its meaning; one sentence in place does, without a trip to help. The full date on hover keeps the row compact and answers "when exactly" where the reader is looking; the earlier anatomy put the overflow over the time on hover, which would hide the very value being hovered. Author, edit history and a source field were also asked for; they change the project file format, so they are listed under "Open decisions for the owner", not designed. Shown in screens/notes-panel.html, states 2 (the tooltip) and 7 (the explanation). The sentence's wording sits under a published message key, so its final text is the owner's call.

## Inspector: the neighbors button is labeled "Neighbors" and always filters

- **Document and section:** `interface-specification.md` 4.2, the One node, One edge and Several elements rows ("Select neighbors (split: hops, direction, edge type, Filter to neighbors)"); `interaction-pattern-entries.md` 4.6, Feedback; `state-matrix.md` 4.4; the command register in `glossary.md` (the button's label). Supersedes, in "Select neighbors: one menu, replacing the two earlier forms" above, the menu title and the sentence "A plain press of the main part grows one hop with the direction last used, as each press grows one more hop; its tooltip carries that count."
- **Old text:** "Select neighbors (split: hops, direction, edge type, Filter to neighbors)"; the menu "titled 'Select neighbors of {selection}' ... then the two commands, Select neighbors and Filter to neighbors"; the main part selects.
- **New text:** "**Neighbors** (a split button with its label and the neighborhood glyph, drawn as a secondary button). Its main part always runs Filter to neighbors, at the hop count and direction last used (1 hop, the graph's direction at first), at every graph size: it adds one undoable filter step named after the node ('TP53 and neighbors'), the chip shows the result ('Filtered: 33 of 300 nodes'), the notice offers Undo, and the selection is kept. Pressed again on the same node it adds the next hop to that step, never a second step. Its tooltip states what the press does and its size ('Filter to neighbors, 1 hop: 33 nodes. Ctrl+Z undoes it.', Shift+N). The caret opens the menu titled 'Hops from {node}': the checkable hop rows with their sizes, then Follow and edge type where the graph has them, then Filter to neighbors and Select neighbors, in that order, each with its size. Select neighbors is reached only from this menu. The same button, with the same main action, is on One edge (its two ends and their neighbors) and Several elements (nodes only)."
- **Why:** the studio's round-2 decision (study/decision-log.md, "Inspector"). Evidence: study/round-2/insights.md, finding 16 (severity 3 for this button): in the alert-first flow the unlabeled split button's main half selected nine accounts inside a density drawing, which draws nothing ("It circled nine things in the blob. It didn't show me them." -- Nadia, Sarah). A default that selects below the drawing limit and filters above it would be a hidden mode, so the main action is the same everywhere, and filtering was chosen because it is visible at any size and undoable. Filtering rather than selecting is flagged for a check with real users. Drawn in screens/inspector.html, states 1 to 3.

## Inspector: on one node, Filter to (the node alone) moves to the overflow

- **Document and section:** `interface-specification.md` 4.2, the One node row's verbs.
- **Old text:** One node verbs: "Select neighbors (split ...), Filter to, Pin".
- **New text:** One node verbs: "Neighbors (split), Pin"; Filter to for the node alone joins the overflow.
- **Why:** with Neighbors filtering, a funnel icon beside it would offer two filters from one node, and the one-node filter makes a scope of one node that the next move always grows (the withdrawn entry on one-node scopes above). The freed width holds the Neighbors label. Drawn in screens/inspector.html, state 1.

## Inspector: Path to... on one node

- **Document and section:** `interface-specification.md` 4.2, the One node row and the "Exactly two nodes" paragraph proposed in "Inspector: two selected nodes offer Paths between... on the first row" above; `interaction-pattern-entries.md` 5, the Path tool.
- **Old text:** One node, overflow: "Paths between..." (opening the form with From filled and To empty).
- **New text:** "**Exactly one node.** The type row gains a third line: Path to..., a secondary `Button` at the panel's full width with the route glyph, the one-node twin of Paths between... It arms the Path tool with From filled and shows one status line at the top of the canvas: 'Pick the end node: click, or find it by name (Ctrl+K). Esc cancels.' The button reads pressed while the pick is armed; Esc returns focus to it. It is also in Quick actions." Remove Paths between... from the one-node overflow.
- **Why:** the studio's round-2 decision (study/decision-log.md, "Paths" and "Inspector"). Evidence: study/round-2/insights.md, finding 17: 4 of 4 how-connected sessions found nothing that leads to a path from one node ("The search box let me find one account and then fought me on the second." -- Dana). Drawn in screens/inspector.html, states 1 and 4.

## Inspector: an offered group -- the stepper on line 1, members by a chosen measure, Copy ids

- **Document and section:** `interface-specification.md` 4.2, the "Set, offered (a group)" row ("Group; the sibling stepper" on line 2); 4.1, the Members section and its caps; `information-architecture.md` 8.1, the legend.
- **Old text:** line 2: "Group; the sibling stepper"; Members: "by degree" as a fixed caption.
- **New text:** "Line 1: the group's name, then the sibling stepper ('4 of 10'), then the overflow. Line 2: the kind word (Community, Component, ...) and Create set, Select members, Filter to. Members is sorted by a measure the reader chooses: the caption 'by degree' is a menu of the numeric columns. The Members header carries Copy ids, which copies every member's id, one per line, not only the rows shown. A legend entry of a categorical layer written by a run selects that group as a whole and opens this inspector; the entry shows it is selected."
- **Why:** study/round-2/insights.md, finding 10 (severity 3): clicking a group's row or legend entry did nothing visible, and there was no member list ("I want the 62, sorted, so I can grab the top ten." -- Jordan). At 240 px, line 2 cannot hold the kind word, the stepper and three verbs: the kind word truncated to "Com...". Drawn in screens/inspector.html, state 13.

## Table: a table opened on a group or set keeps it as the scope when a row is chosen

- **Document and section:** `information-architecture.md` 8.1, The table's scope; `message-catalog.md` graphty.table.scope; the table-dock mock's "Selected scope" state.
- **Old text:** "Every route that opens the table on some elements (a count, N differ, Show in table, a Connections count) selects them first and lands [in the Selected scope, whose rows follow the live selection]."
- **New text:** add: "A route from a set or a group (its Members' 'N more members', its Select members then Show in table) opens the table scoped to that object: 'Community 4: 36 nodes, 1 selected. Sorted by degree.' with Show filtered graph. A click on a row then selects that node alone, and the rows stay. The scope ends when another object's table is opened or Show filtered graph is pressed; Ctrl+Alt+Z (Previous selection) selects the group again."
- **Why:** with rows that follow the live selection, choosing one member collapses the table to one row, so reading down a community's members costs a trip back per row. The owner asked for the frame after a table row is selected (study/decision-log.md, "Inspector"). Drawn in screens/inspector.html, state 14.

## Keyboard walk: inside a filter a degree says how many neighbors are shown, and Quick actions says when a node is not in the graph

- **Document and section:** `interaction-pattern-entries.md` 9.2 ("Each move fills the walk-position slot") and the focus pill proposed in "Keyboard walk: the walk pill shows the focused node's values and the order, and the order can be switched"; `message-catalog.md`, rows `walk.position` and `walk.position.first`, and a new Quick actions row; `interface-templates.md` 15 (Quick actions). Supersedes the wording of "Keyboard walk: counts inside a filter say so" ("in filtered graph" after the neighbor count).
- **Old text:** `walk.position.first` "{label}, neighbor {i} of {N} of {from}[ in filtered graph], ..."; Quick actions has no row for a node name the loaded graph does not hold, so it answers "No commands match".
- **New text:** "The neighbor count is always a count of the neighbors shown, and says nothing extra. When a filter step hides some of the focused node's neighbors, its degree is followed by '{shown} of {degree} shown, on: filtered graph', on the focus pill and in the announcement: 'UBC, neighbor 1 of 32 of TP53, weight 0.80, degree 21, 3 of 21 shown, on: filtered graph, rank 7 of 300.' A node whose neighbors are all shown says only its degree. The same phrase follows the degree in the inspector's announcement. In Quick actions, a query that matches no command and no node in the loaded graph reads 'No commands or nodes match "{query}"' (proposed key graphty.quick.none, the one empty state screens/find.html draws), so a node's name is never answered with 'No commands match'. Find, opened on the same query, says what it searched and offers Search recent projects." Dead end inside a filter: "'{label}'s only neighbor shown is {from}, where you came from; 1 of {degree} shown, on: filtered graph. Shift+Enter goes back.'"
- **Why:** round 2, finding 8 (a count that does not name its graph, severity 3): the walk card said "degree 21" in a 33-of-300 view with 3 neighbors visible, and three keyboard participants read it as a contradiction; one asked for exactly "3 of 21 shown". Finding 23 (severity 4 for screen-reader users): all three participants of the Shift+Arrow task typed a name into Quick actions and got "No commands match". The studio's decision after round 2 (study/decision-log.md, "Keyboard walk") binds the phrase "3 of 21 shown, on: filtered graph". The suffix is written even though the pill's own graph is the filtered one, because the degree beside it is over the whole network and the two numbers must each name their set. Drawn in flows/keyboard-walk.html (the trace and the errors). The message keys are published text, so the exact wording is the owner's call.

## Comparing two rankings: a plain sentence first, Spearman under it, and a top-k control

- **Document and section:** `output-homes.md` 2 (as proposed in "Comparing two results goes to the table's Scatter view", above); `interface-templates.md` 18, Regions and rows (Agreement); `message-catalog.md` (a new row, `graphty.compare.agreement`). Amends "Comparing two results goes to the table's Scatter view" and "Comparing two rankings: how the Scatter view draws ranks, ties and the top corner", above.
- **Old text:** "Kendall tau-b is the headline number when ties exceed 10% of either side, and Spearman is then labelled '(ties inflate this)'; otherwise one number is shown." and "The top corner is shaded to the length of each result's own Top nodes list (5 ...), with no control".
- **New text:** "Agreement opens with one sentence in the emphasis weight that says whether the two rankings agree at the top, with the count: 'The rankings mostly agree: 8 of the top 10 are the same.' The verb follows the share of the chosen top list both sides hold: all of it, 'agree at the top'; 70% or more, 'mostly agree'; 30% or more, 'partly agree'; more than none, 'mostly disagree at the top'; none, 'disagree at the top' ('none of the top 10 are the same'). Under it, in secondary text, Spearman with what it covers ('Spearman 0.781 over all 3,093 accounts'), with an (i) that says tied elements take their average rank. No other coefficient is shown and Spearman carries no warning label. Then Top, a segmented control of 5, 10, 20, 50 and 100 (10 by default; choices past the number compared are left out); the sentence, an 'in both top {k}' row and the Scatter view's shaded corner follow it, and one secondary line gives the overlap at the other choices ('In both at the other choices of Top: 0 of 5, 0 of 20, 0 of 50, 18 of 100.'). The tie blocks stay counted, with 'in both tie blocks'." Message catalog: `graphty.compare.agreement`, parameters {verb, shared, k}, with the five verbs above.
- **Why:** round 2, severity 3 (`study/round-2/insights.md`, finding 22): "Spearman (ties inflate this)" was statistically wrong to three expert participants (Spearman with average ranks already handles ties, and the tie blocks lift tau-b as well); "top 5 in both" took k from another panel's list, and 5 of 5 participants who read it wanted to set k where the number is; and no sentence said in words whether the two agree ("If I put 'tau-b 0.781' on a slide ... I'm dead"). The overlap line answers the expert's "a top-k overlap curve" without a chart: on the April transfers PageRank and betweenness share no account until the top 100 (18), while PageRank on March and April shares 10 of the top 10. Kendall tau-b as a second coefficient was considered and rejected (the wrong label was the defect). Drawn in screens/comparison.html, states 1 and 2.
- **FOR DECISION (message-catalog text under a published key):** the five verbs and their thresholds (70% and 30%) are the proposal's; the wording of `graphty.compare.agreement` is the owner's call.
- **Element need:** the comparison readings (`element-needs.md`, "Comparison statistics and null models") gain the top-k overlap at each requested k and the sentence's key and parameters, so the app renders the sentence and decides nothing; Kendall tau-b is dropped from the readings this surface needs.

## Compare with... sits in a fixed action row

- **Document and section:** `interface-templates.md` 10, Result (the Appearance group), and 18 (the comparison's right column); this file's entry "Results panel: the run record, the exactness slot, a filtered scope and Compare with...".
- **Old text:** Compare with... is one of the verbs under Appearance on a result, below Color by... and Label with...; the comparison's right column has no way to change a side.
- **New text:** "A result's action row sits directly under its row, outside the scrolling part, and holds Compare with... first, then Color by.... It is the same in every state of the result (running, finished, out of date), disabled with its reason while there is nothing to compare with. In the comparison's right column the same row sits under the two sides, where Compare with... replaces side B." Appearance keeps Label with... and the style rows.
- **Why:** round 2, finding 22: Compare with... sat in Appearance in one state and below the fold in another; one participant needed the moderator to point to it and three others hunted for it. A fixed position is the only one a reader can learn once. Drawn in screens/comparison.html (states 1 and 2, the computing strip and "Getting here"). screens/results-panel.html still draws it under Appearance and should follow.

## Comparison surface: the zoom menu moves to the canvas

- **Document and section:** `interface-templates.md` 6 (row 2: "the mode tab, then the zoom and view Menu") and 18; supersedes for this mode "Comparison surface: Export sits in the header overflow"'s "header row 2 keeps the mode tab and the zoom menu".
- **Old text:** header row 2 of a right-column mode holds the mode tab and the zoom menu.
- **New text:** "In the comparison mode, header row 2 holds only the Comparison tab. The canvas zoom is a floating button in the canvas's lower-right corner, beside Help: a magnifier, the zoom level and a chevron that opens the same zoom Menu."
- **Why:** round 2, finding 22: a "90%" at the top of the statistics was read as a confidence level by four participants (Emma twice, Chris, Chen). The magnifier and the position on the canvas say what the number is about. Drawn in screens/comparison.html, states 1 and 2.
- **Open:** whether every right-column mode that shows readings (the inspector, Version history) moves zoom the same way; Version history's entry above keeps it in row 2.

## Groups: compared with the rest, descriptive only

- **Document and section:** `interface-specification.md` 4.1 (the row "Set, offered (a group)") and 7.4 (Element needs); `message-catalog.md` (three new rows); `glossary.md` 12 (Comparison: add median, interquartile range (IQR), effect size, rank-biserial r).
- **Old text:** (4.1) the offered group shows "Created from, Layout B" and its attributes; the mocks drew one "log2FoldChange, mean" row against "rest of graph", on a column the reader did not choose.
- **New text (4.1, after the group's facts):** "A group offered by a run shows a **Compared with the rest** section. Its first line is `graphty.groups.descriptiveOnly`, 'Descriptive only; no statistical test.', then the two counts ('62 proteins in Community 1, 238 in the rest.'). The reader chooses the columns from the section header's menu (checkbox items, every number column including run results; it stays open while picking; each pick is one undo step). Each column shows a box plot with the values as a strip over it, the group above in its color and the rest in the unstyled gray, on the column's own scale (a skewed measure on its legend's log scale); then median and IQR for each side; then one effect size, rank-biserial r, with `graphty.groups.effectSizeNote`, 'effect size, not a significance test', under it. No p-value is shown, and the group is compared only with the rest, never group against group. The section ends with `graphty.groups.noEnrichment`, 'Enrichment analysis isn't part of graphty.', and a **Copy members** button that copies the member ids one per line."
- **New text (7.4):** "The group comparison: for a partition group and a list of number columns, graphty-element returns per column the group's and the rest's count, quartiles, whiskers (1.5 IQR) and the rank-biserial r. The app draws what it returns and computes nothing."
- **Why:** round 2, severity 3 (`study/round-2/insights.md` 11; 4 of 4 groups-differ sessions): one column someone else chose, no spread, and requests for enrichment p-values. Many uncorrected tests across columns and ten groups would hand out false findings; an effect size says how big a difference is without claiming one is real. On the protein network Community 1 differs from the rest by r = -0.02 on log2FoldChange and 0.14 on degree: the section must be able to say "barely different" plainly. The named test the round-2 recommendation mentioned is not adopted (logged under "Asked for, logged, not designed").
- **One-way door:** the three message keys and their wording are published (reader messages are { key, params, text }); the element's comparison API is a published name. Both are the owner's call.
- **Drawn:** screens/styles-list.html, frames 19, 20, 22 and 23. Numbers: `kit/fixtures.json` `scenarios.groupCompare` (screens/group-compare-numbers.mjs).

## Catalog: a task line per method, and Start here

- **Document and section:** `interface-templates.md` (Results, the Catalog: "one flat list of `ActionRow`s with (i), a precondition mark and a cost band"); `information-architecture.md` 3 (Catalog); `interface-specification.md` 7.4.
- **Old text:** a Catalog row is the method's name with (i), a precondition mark and a cost band.
- **New text:** "A Catalog row is the method's name, then one task line under it in secondary ink: the question the method answers, in the reader's words, short enough for one row at the panel's width ('Who sits between groups'). Where two methods in a family would otherwise be a guess, the line names the difference ('Like Leiden; a group may split apart'). One method in each family of two or more carries a **Start here** badge: the one to use with no reason to pick another (Community: Leiden). The task line and the Start here flag are catalog data published by graphty-element, not app strings."
- **Why:** round 2, severity 3 (`study/round-2/insights.md` 25; 11 sessions, 9 participants): the catalog named methods, not questions; Jordan picked Louvain "because it's what I know" and wished for "a line that just said use this one if you don't know".
- **One-way door:** two new catalog fields (a task line and a start-here flag) in graphty-element's published catalog data.
- **Drawn:** screens/styles-list.html, frame 21.

## Catalog: Degree routes to what is already counted

- **Document and section:** `information-architecture.md` 3 (Catalog); `interface-templates.md` (Results, the Catalog row).
- **Old text:** (none) Degree is not in the Catalog; it is counted at load and read from Statistics and the Nodes table.
- **New text:** "Degree is listed first under Centrality. It runs nothing and creates no result: its trailing words are 'already counted', and activating it opens the degree chart in Statistics and scrolls the Nodes table to its degree column. It carries Start here in Centrality."
- **Why:** round 2 (`study/round-2/insights.md` 25): readers looked for Degree under Centrality and concluded it was missing. A route, not a run, keeps one home for the degree numbers.
- **Drawn:** screens/styles-list.html, frame 21.

## Every statistic says what it means

- **Document and section:** `glossary.md` 12 ("Screen tier, exactly as the field uses them, each defined by an (i)"); `interaction-pattern-entries.md` 9.4 (tooltips on focus).
- **Old text:** "Screen tier, exactly as the field uses them, each defined by an (i)." The glossary gives the term list but no reader-facing sentence.
- **New text:** "Each term has a **reader line**, one sentence a reader with no graph training understands, shown on hover and keyboard focus wherever the term labels a value or a step: statistic names, column headers, the inspector's rows, run-record rows and step labels. A label with a reader line is a Tab stop and carries a dotted underline; Esc hides the line." Proposed reader lines, from the mock: degree "How many interactions a protein has." (the noun follows the graph's node word); betweenness "How often a node lies on the shortest paths between other nodes."; PageRank "How much a node matters, counting how much its neighbors matter."; density "The share of the possible connections that exist."; component "Pieces of the graph with no connection between them."; median "The middle value: half are above it, half below."; interquartile range "Where the middle half of the values lie, from the 25th to the 75th percentile."; rank-biserial r "Effect size, -1 to 1: how far this group's values sit above (+) or below (-) the rest's. Near 0, they overlap."; seed "The starting number for a method that uses chance. The same seed gives the same groups."; a column from the file "A column from your file. graphty does not know what it measures."
- **Why:** round 2, severity 3 for non-technical readers (`study/round-2/insights.md` 26; 14 sessions, 7 participants): "'Degree' to me is a temperature." (Dana).
- **One-way door:** the reader lines are published text if graphty-element's catalog carries them; their wording is the owner's call.
- **Drawn:** screens/styles-list.html, frames 19 to 22 (hover any dotted label in the page; frame 22 shows one open on focus).

## Words: one wording for a weight's meaning on every screen, and its short form on a result

- **Document and section:** `glossary.md` 11, Weight roles (the "Gloss on screen" column); `options-and-encodings.md`, the weight-meaning question; `interface-specification.md` 4.2 (a result's state line) and 4.1 (the graph's Statistics, the Weight row). Builds on "Binding step: a recipe's weight carries its meaning, asked in the column's words" and "Run options: a run that cannot use its weight refuses, like the filtered-scope refusal", above.
- **Old text:** the mocks asked one question in five wordings: "A bigger {column} means" with Stronger tie, Longer distance, An amount that flows, Not sure -- decide later; "What does {column} measure?" with Distance, Similarity, Capacity, Not set; a Role field reading "similarity: larger = closer" with "As a distance: 1 / value"; "weight: unknown" and "{column} (unknown role)" for an unanswered column; and a result's reading "value as distance" or "value as similarity, 1 / value".
- **New text:** "The question reads 'For {column}, a higher number means...' everywhere it is asked (the load step, a run's option form, the Path tool, the column's editor, the binding step), with the four answers a closer or stronger link, a longer or costlier step, more can pass through, and Don't use {column}; the technical term (similarity, distance, capacity) is secondary text only. Nothing is preselected; unanswered and Don't use both read '{column}: numbers, not used'. Where a field is too narrow for the question, its placeholder is the verb 'Set up {column}...', the same verb as the refusal's button. A result's reading is 'Weight: {column}, higher = stronger link' for a closer or stronger link and 'Weight: {column}, higher = longer step' for a longer or costlier step; the graph's Statistics Weight row shows the same without 'Weight:'. The conversion (1 / value by default) is never a label: it sits under 'How it is converted'."
- **Why:** round 2 found the role words fit neither confidence scores nor money (`study/round-2/insights.md` 15), and the same concept carried five names across the mocks, so a participant who met two of them could not tell they were one setting. One term per concept is `glossary.md` 1's rule.
- **Drawn:** screens/first-look.html (state 3b), screens/weight-role-trap.html and its siblings (states A1 to A6), screens/load-transfers.html (state 4), screens/sets-and-paths.html (states 4 and 5), screens/load-step.html; already so in screens/binding-step.html, screens/option-form-cost.html and flows/sets-and-paths.html.
- **Two-way door:** the wording of labels. The message keys that carry these strings are published, so their final wording is the owner's call.

## Visual language: text that answers the question is body ink, and the size scale stays

- **Document and section:** `visual-language.md`, A3 ("Color is never the only signal") and A8 ("The chrome meets WCAG 2.2 AA by default").
- **Old text:** A3: "A stale set, an invalid field and a failed run each carry a glyph or a word in secondary ink". Nothing says which text may be secondary.
- **New text:** "Secondary ink is for text a reader can skip: a kind word, an origin word, a unit, a column caption. Text that changes the answer is body ink at the same size: the set a count is taken over ('in the filtered graph'), the not-drawn line, a stale or failed state's word, a result's one-line reading. Nothing that carries meaning is tertiary: in the app's contrast mode tertiary and secondary are one ink, and the only tertiary text is a placeholder or a turned-off row. Sizes stay compact-mantine's roles (9/14, 11/16, 13/22, 15/25): a reader who needs larger text zooms the page, which A8 already requires to work at 200%."
- **Not taken:** the round's recommendation of 12 px or larger for secondary text. Every size above 11 is a heading role in compact-mantine's scale, which follows Figma; a 12 px body would put a fifth size into every panel and change the 32 px row pitch. Ink, not size, is the change.
- **Why:** round 2's finding on small grey text (severity 2; grey text missed in 9 sessions, `study/round-2/insights.md`, "Small grey text and unlabelled icons"). The misses were the scope beside a count, the funnel mark and the not-drawn line -- all text that changes the answer, all drawn in secondary ink.

## Visual language: every toolbar tool's tooltip names its key

- **Document and section:** `interface-specification.md` 4.2 (the `TooltipShortcut` tooltips) and `visual-language.md`, "Icons" ("An icon stands alone only with a tooltip").
- **Old text:** "An icon stands alone only with a tooltip."
- **New text:** "An icon stands alone only with a tooltip, and on the canvas toolbar the tooltip is the tool's name and its key (`TooltipShortcut`: 'Select  V', 'Quick actions  Ctrl+K'). A tool whose key is not assigned yet shows its name alone, never a made-up key. The Path and Note tools' keys are owed by graphty-element's default keymap."
- **Why:** round 2 (same finding, icons in 9 sessions): the lightning bolt, the note tool and the path tool were not recognized. The mock kit now draws tool tooltips this way (`kit/kit.js`), including tools a page names with its own label.

## Canvas drawing: a community layer uses the decided palette, never black

- **Document and section:** `canvas-drawing.md` 4 (the default categorical palette) -- no text change; this records how the mocks apply it.
- **Old text:** (unchanged) "Okabe-Ito's black (1.26:1 on the dark canvas) is replaced by `#6929C4` in the default palette shipped under new ids".
- **Applied in the mocks:** the finished Louvain result (`screens/results-panel.html`, "A finished Louvain result" and "Louvain's groups in the table") painted Community 7 black, the shipped palette's slot, and it vanished among the edges on the dark canvas. It now uses `#6929C4`, the decided replacement; yellow stays the eighth slot and carries the fill edge; groups past the eighth (here two single-protein communities) draw as Other gray. The protein module drawings still show the shipped black slot with its fill edge, as the section says for the time before the new ids ship.
- **Why:** round 2's community-color finding (severity 2; colors in 6 sessions: "7 is black on black edges").

## Behavior after round 2: one undo-label form for a filter step, one Neighbors button, one empty state in Quick actions

- **Document and section:** `message-catalog.md`, `undo.label` (the command's name plus its object); `interaction-patterns.md` 3.4; `interface-specification.md` 4.2 (the Neighbors button); `interface-templates.md` 15 (Quick actions, empty state).
- **Old text:** the mocks named the same undo step three ways ("Turn off degree >= 5", "Turn off step Filter to Largest component", "Turn on group 8"; "Delete degree >= 5"); a neighbors step was "Neighbors of ACC-365386, 1 hop" on one page and "TP53 and neighbors" on another, and its undo label was "Filter to 9 nodes"; screens/alert-triage.html and screens/find-and-expand.html still drew the round-1 unlabeled split button whose main part selected; the Quick actions empty state read "No commands match" in the walk mock, "No node called {query} in this graph" in the walk flow and "No commands or nodes match "{query}"" in screens/find.html; screens/filter-steps-and-undo.html still showed undo removing a step, with no line.
- **New text:** "A step's undo label is the command's name and the step's own name, as for any object: 'Turn off step Filter to degree >= 5', 'Turn on step Filter out group 8', 'Delete step Filter to degree >= 5' -- the step's name is the same in its row, its undo label and Undo history. A neighbors step is named '{node} and neighbors' (', {k} hops' past one hop) everywhere; the notice after the press names the command and its size ('Filter to neighbors, 1 hop: 9 nodes'). The Neighbors button is the same on every page: labeled, its main part filters, Select neighbors only in its menu after Filter to neighbors, Shift+N on the main action. Quick actions has one empty state, 'No commands or nodes match "{query}"'."
- **Why:** round 2, findings 2, 16 and 23: the same gesture must give the same feedback on every page, and a participant who learns a key or a label on one page is wrong on the next when two pages differ. Applied across screens/undo.html, screens/filter-steps-and-undo.html, flows/undo-and-ways-back.html, screens/alert-triage.html (and its storyboard and flow), screens/find-and-expand.html and its flow, screens/inspector.html, screens/keyboard-walk.html and flows/keyboard-walk.html. Two-way door (mock wording and layout); the Quick actions key is already proposed as `graphty.quick.none`.
- **Open, for the content owner:** the filter chip's in-progress form `Counting... &middot; {N} steps` (screens/filter-chip.html; `graphty.filter.chip`) uses a second word for what the glossary calls "not yet measured" ("a count still being computed", `glossary.md`; `state-matrix.md` Inspector, Loading). One of the two should give way; it is a published key, so the owner decides.


## Accessibility, after round 2: the frame's first Tab stop skips to the drawing and names F6

- **Document and section:** `interaction-pattern-entries.md` 9.1 (Focus regions), a new closing sentence; `interface-specification.md`, the app frame.
- **Old text:** 9.1 names the region-cycle chord but nothing on screen names it, and nothing lets a keyboard user pass the rail and the left panel on the way to the drawing.
- **New text:** "The frame's first Tab stop is a link that shows only while focused, 'Skip to the graph drawing. F6 moves between regions.' Enter moves focus to the canvas's focus target; the link is also a stop of the region cycle's first region, so it is never reached by F6."
- **Why:** WCAG 2.4.1 (Bypass Blocks) and round 2's keyboard finding (`study/round-2/insights.md`, "The keyboard walk works; getting to a named node does not", severity 4 for screen-reader users): reaching the drawing took 11 to 17 Tabs, and three participants never learned F6 because it was only in the key sheet. The link turns the first press of Tab into the answer to both. Find and Quick actions already show F6 in their key-hint rows (the entry "Find and Quick actions, after round 2" above); this is the one place every keyboard user passes. Two-way door, and not a published key.
- **Drawn:** the kit adds it to every app frame whose canvas has a drawing (`kit/kit.js`, `.k-skip` in `kit/kit.css`); Tab once on screens/frame-at-rest.html or screens/keyboard-walk.html to see it.

## Accessibility, after round 2: every region is named and every section header is a heading

- **Document and section:** this file, "Accessibility: the app has one level-1 heading, the project name" (amends its new text); `interface-specification.md`, the section header row.
- **Old text:** "section headers (Graphs, Sets and paths, Styles, the inspector's sections) are level 2." -- silent on a header that holds its own buttons, on popover and dialog headers, and on region names.
- **New text:** append: "A header that holds its own buttons (Styles with its +, Graphs with Find and +) is a level-2 heading of its words only; the buttons sit beside the heading, not inside it, so the heading list reads 'Styles', not 'Styles, Add a style layer'. A popover's or dialog's header is a heading one level under the project. The four regions are landmarks with names in the glossary's words: the rail 'Main' (as the mocks already name it), the left panel by its open panel ('Graph', 'Results', 'Notes'), the right sidebar by its mode ('Inspector', or 'Right sidebar' when none applies), the canvas and the bottom dock ('Table')."
- **Why:** round 2's recommendation "add headings to every region" (same finding as above: "the walk page has no headings"). Screen-reader users move by heading and by landmark before anything else; before this the mocks exposed one heading and unnamed regions. compact-mantine's section header and panel components should carry the heading role and level themselves, so the app never adds it by hand (root `CLAUDE.md`, "UI Components").
- **Drawn:** `kit/kit.js` marks every app frame this way on every page (a page that names a region itself keeps its name).

## Accessibility, after round 2: a tooltip can be hovered, and a reader line is the label's description

- **Document and section:** `interaction-pattern-entries.md` 9.4 (tooltips on focus); `interface-specification.md` 4.2 (`TooltipShortcut`); this file, "Every statistic says what it means" (its new text).
- **Old text:** "shown on hover and keyboard focus ... Esc hides the line." Silent on what happens when the pointer moves onto the tooltip, and on how a screen reader hears it.
- **New text:** append: "A tooltip stays open while the pointer is on its trigger or on the tooltip itself, closes a moment after the pointer leaves both, and closes on Esc. A reader line, and any tooltip that says more than its trigger's own words, is the trigger's description (`aria-describedby`), present whether the tooltip is shown or not; an icon button's tooltip is its name."
- **Why:** WCAG 1.4.13 (Content on Hover or Focus) asks that such content be hoverable and dismissible; the kit's tooltips vanished when the pointer moved toward them, which a low-vision reader using a magnifier cannot work with. And the reader lines proposed after round 2 were only visible: a screen-reader user focusing "density" heard "density" and never the sentence that defines it, which is the whole point of the change for readers new to graphs. Mantine's Tooltip closes on leaving its target; the fix belongs in compact-mantine's `Tooltip`/`TooltipShortcut` theme (an option that keeps it open over itself), not in the app.
- **Drawn:** `kit/kit.js` (every tooltip on every page); screens/styles-list.html frames 19 to 22 show the reader lines.

## Accessibility, after round 2: rows a choice turns off are exposed as off

- **Document and section:** `interface-templates.md`, the Export dialog, "Share the setup, without data" (the kinds it turns off).
- **Old text:** (the proposal "Sharing the setup without data removes figures and tables" says the other kinds are turned off and disabled; it does not say how.)
- **New text:** append: "Each kind turned off this way is a disabled checkbox or button (`aria-disabled`), with its label in disabled ink as part of the control; it is never drawn disabled while still exposed as a working control."
- **Why:** the Export mock drew the turned-off rows in disabled ink while their checkboxes and the Export table as CSV... button stayed active to a screen reader: a sighted reader saw them off, a screen-reader user could still press them, and the gray labels failed 1.4.3 because nothing marked them as part of an inactive control. Fixed in screens/export-dialog.html.

# After round 3

The owner reviewed the round-3 mocks and directed that graphty's structure come from its own ontology, taking only controls and gestures from Figma. The entries below record the structural changes that followed, and the smaller changes the third user study motivates. The findings they cite are in `study/round-3/insights.md`; the before-and-after frames are in `storyboards/navigation.html`.

## Places: the rail becomes Graph, Data, Notes and the Assistant

- **Document and section:** `information-architecture.md` 4, the places table, and 4.1, the outline.
- **Old text:** the rail holds Graph (with its style layers), Results and Notes beside the main menu and the Assistant; the graph inspector with nothing selected has no Style stack or Results section.
- **New text:** the rail, top to bottom, is the main menu (the app's commands, not a place); **Graph** (the project's graphs, the sets and paths kept on them, and saved views); **Data** (sources and their columns, each numeric edge column with its weight state; versions; Update with new data; Add a table; applied recipes; style files; and the sent-and-saved log); **Notes**; and the **Assistant**. The graph inspector with nothing selected has three sections: Overview, Style stack, Results.
- **Why:** the owner's review asked why styles sat under Graph and why Results sat on the left, and directed that the structure follow graphty's ontology. A style layer paints the selection and a result describes it, so both belong where the selection is read. Data is a collection the project owns that had no place: the round-3 tree test found no home for updating a project with new data, and the load's choices vanished once the load step closed. Drawn in `storyboards/navigation.html` and `screens/data-panel.html`.

## Navigation model: what the rail, the right panel and the dock are for

- **Document and section:** `information-architecture.md` 5, Navigation model (a new rule at its head).
- **Old text:** (no rule says what each of the three regions is for; section 10 says only "a rail button names a collection, never an activity")
- **New text:** "The rail lists the collections a project owns; the right panel reads and changes the selection; the bottom dock compares rows. A rail button names a collection, never an activity."
- **Why:** with one sentence per region, every placement question has a test: does the reader navigate to it, read it about what is selected, or compare many rows of it? Results failed the first test (a result is read, never navigated to), and styles failed it (a style layer paints the selection). Export is a verb, not a collection, so it has starting places and no rail place.

## Rules for growth: only Graph never leaves the rail

- **Document and section:** `information-architecture.md` 10, rule 6.
- **Old text:** "Graph and Results never leave."
- **New text:** "Graph never leaves." Results leave the rail under rule 3 (a property of one object is a section in the inspector). **Provisional:** the move stands only if the round-4 tree test reaches 70% direct success on the tasks that look for a result; below that, Results return to a rail place and this entry is reversed.
- **Why:** a result is a property of the graph it ran on and has no identity apart from it, which is exactly what rule 3 describes. The move is driven by the owner's review and the ontology; the study evidence so far is one remark from a participant who had moved from Gephi, so the tree test decides.

## Rationale: the alternatives the new rail rejects

- **Document and section:** `information-architecture.md` 11, Rationale and rejected alternatives (new entries).
- **Old text:** (none)
- **New text:** "Results as a rail place: rejected, because a result is read, never navigated to. Right-panel Selection and Results tabs: rejected, because they hide a node's result values from its appearance and recreate a Results place on the right. Five-place rails with Steps, Compare, Filters or Views as places: rejected, because the filter chip already homes filter steps, Compare is a mode entered from a result, and views and sets are Graph objects."
- **Why:** these alternatives were each proposed and argued in the round-3 studio review; recording them keeps them from being re-proposed without new evidence.

## Figma crosswalk: five new departures, and one closer copy

- **Document and section:** `figma-crosswalk.md` 4.1, Structure and places, and 6, Main menu, rail and header slots.
- **Old text:** (the ledger has no rows for a data place, results, the Layers slot, the avatar or the header's Export)
- **New text:** add these departures, each with its forcing fact:
  - **A Data rail place.** Figma has no data tier: a Figma file owns its content, while a graphty project reads data that lives elsewhere, changes between versions and is joined with other tables.
  - **Results as an inspector section.** Figma has no computed results; a graphty result is a property of the graph it ran on.
  - **The Layers slot holds graphty's objects** (graphs, sets and paths, views), not a layer tree, because graphty's drawing is generated from data and has no hand-arranged layer order.
  - **No avatar.** graphty has no accounts; an avatar promises sign-in and account management that do not exist.
  - **No top-right Export button.** Export is one dialog reached from the project-name menu (as in Figma), the Data panel header and the table dock.
  Record as a closer copy of Figma, not a departure: **styles in the right panel**, with Figma's Selection colors pattern ("+" to add) and the colour picker's Custom and Libraries tabs.
- **Why:** the owner directed that Figma set conventions for controls and gestures only, and that the departures list grow wherever a better-for-graphty reason with evidence exists. Each row names the graph fact that forces it.

## Interface specification: the rail, the header and the inspector's sections

- **Document and section:** `interface-specification.md` 1.2 (header and rail) and 4.0 to 4.2 (the inspector).
- **Old text:** the header holds the avatar and an Export button at the right; the inspector's sections follow the object kinds without a Style stack or Results section; styles are edited in the Graph panel.
- **New text:**
  - **Rail row:** main menu, Graph, Data, Notes, Assistant.
  - **Header:** no avatar and no Export button. The privacy line ("Nothing has been sent from this project"; after the Assistant is used, "Sent to the Assistant: 2 questions. Nothing else.") sits under the project name in the left panel header, visible when the panel is minimized, and links to Data > Sent and saved.
  - **Inspector, nothing selected:** Overview, Style stack (the whole ordered stack, drag handles, "top wins", the legend, the Look control with a visible "Look" label), Results (runs newest first, the needs-action strip on top).
  - **Inspector, something selected:** Appearance is the same whole stack with the rows that paint the selection highlighted and marked with the property each wins, plus "+" to add a layer scoped to the selection; a Results section gives the selection's value and rank per run.
  - **Colour picker:** Custom and Libraries tabs; Libraries holds palettes and the style layers from style files and recipes.
  - **A result is its own inspector kind:** its state line, the weight used, its runs, Compare with..., Show as style layer. Esc, or a click on empty canvas, returns from a result to the previous node selection.
- **Why:** the owner's review comments on styles, the avatar and Results. Highlighting rather than filtering the stack keeps precedence readable, and one stack in both states means a canvas click never unmounts a drag. Drawn in `screens/inspector.html` and `screens/styles-list.html`.

## Output homes: data's new homes, and export's starting places

- **Document and section:** `output-homes.md`, the homes table.
- **Old text:** (no home for updating with new data, adding a table, a column's weight state, or a log of what was written and sent; the findings report's home is the header's Export)
- **New text:** add homes in the Data panel for **Update with new data** (Replace is the main button when the columns match), **Add a table** (a join), **each column's weight state** (on its source row), and the **sent-and-saved log**, which is the reading home for every output -- every file written and everything sent, with no password or key ever shown. The **findings report** is written by the one export dialog. **Export has starting places and no home:** Export... in the project-name menu, the Data panel header, and "Export table..." in the table dock, plus Ctrl+Shift+E.
- **Why:** the owner's direction to design data management as one area; the round-3 tree test's missing home for updating with new data; and the round-3 finding that two export dialogs wrote different files from the same figure.

## Content design: every number names what it counts and its scope

- **Document and section:** `content-design.md`, a new rule; the words list.
- **Old text:** (no rule)
- **New text:** "Every number names what it counts and its scope: a degree says whether it is of the filtered graph or the full graph; a filtered statistic says it is of the filtered graph ('Density 0.08, of the filtered graph (77 of 1,204)'); a step that removes nothing says 'Kept all 77'; a count that jumped shows its cause beside it, and the cause only restates a count split the element computed, never a motive; a count says whether repeats are counted ('9,380 transfers (8,102 distinct pairs)')." The weight is worded in three states, read from element state: not used yet, used (with its meaning), and none available. Remove these words: "no weight", "None declared", "similarity weight", "numbers not used", "closed" (say "not in April"), "Left behind" (say "Not included"), "Create path to style" (say "Keep path"), "no near-ties", and "fixed" on screen (say "frozen set", verb Freeze; the API kind `fixed` is unchanged).
- **Why:** round-3 findings: degrees read with the wrong scope, filtered statistics read as the whole answer, counts of different things side by side, and the weight described five different ways.

## Message catalog: new published keys (one-way door, for the owner)

- **Document and section:** `message-catalog.md`, new rows.
- **Old text:** (none)
- **New text (proposed, not decided):** `graphty.weight.notUsedYet` ("{column} not used yet"), `graphty.weight.used` ("Weight: {column}, used as {meaning}. Change..."), `graphty.weight.noneAvailable`; a "what changed" count-split message ("{N} components (was {M}): {K} {nodes} have no {edges} in this version"); the grey check's pass verdict ("Increases and decreases stay apart in gray ({below} below {mid}, {above} above)") and fail verdict ("Values just above and below {mid} print as the same gray"); and the time-order mark ("earlier than the hop before").
- **Why:** each is a reader message graphty-element emits and every consumer reads, so its key is published. The wordings come from the round-3 weight, weekly-update, grey-print and money-path findings.

## Canvas drawing: the Print look carries sign with shape

- **Document and section:** `canvas-drawing.md` 4a, Looks.
- **Old text:** "Print look never carries sign on lightness alone."
- **New text (proposed as a published graphty-element Look behaviour and verdict):** "In the Print look, lightness shows the distance from the midpoint on both sides, and shape shows the sign: an up or down triangle, and a circle inside the stated dead band (fill against outline instead, when a shape layer sits higher in the stack). Print is one look that meets both the grey constraint and the colour-blind constraint. The grey check tests every pair of bins on opposite sides of the midpoint, not only the ends."
- **Why:** a severity-4 round-3 finding: the darkening-only ramp printed the largest decreases palest, and a check of the two ends passed it. Darkness alone cannot carry both size and sign. Drawn in `flows/export.html`.

## Glossary: a reliability weight role (one-way door, for the owner)

- **Document and section:** `glossary.md` 11, weight roles.
- **Old text:** the roles distance, similarity and capacity.
- **New text (proposed, not decided):** add **reliability** -- "how likely the link is real" -- for confidence scores such as STRING's combined score, with one line on what it does to each measure.
- **Why:** round-3 participants with confidence scores could not place them under distance, similarity or capacity. A role name is published in graphty-element, so it is the owner's decision.

## graphty-element proposals (one-way doors, not decided)

- **Document and section:** graphty-element's list of needs.
- **Old text:** (none)
- **New text:** proposed, and drawn only as proposals, never as if they exist: a **per-column weight state** (not used yet, used with a meaning, none available); a **time role** for edge columns, with **time-respecting paths** ("Follow time order") and a **date window on Around a node**; **weighted in-strength and out-strength** measures; a computed **what-changed-between-versions** count split; a **between-communities (participation)** measure; and **multi-seed community stability**.
- **Why:** each answers a round-3 finding (weight state, untimed money paths, directed money totals, unexplained jumps after an update, the bridging question, how stable a community split is). Each is graph functionality, so it belongs in graphty-element, and each adds published API.

## Keyboard walk and Find: correct to the decided walk

- **Document and section:** `interaction-pattern-entries.md` 9.2, entry 4.2 and the modes table.
- **Old text:** the plain arrow keys walk from node to node.
- **New text:** Shift+Arrow walks and the plain arrow keys stay on the camera (owner decision). Going to a node moves the walk without selecting it; Enter selects. Propose as keymap roles (published names, for the owner): the walk's back key and home key, and the wording of neighbour order. Record that Ctrl+F opens Find everywhere inside the app frame and is on the key sheet.
- **Why:** the framework still describes the undecided walk. Round-3 keyboard findings: going to a node replaced the selection, and Ctrl+F was taken by the browser.

## Load step: the weight's meaning is asked at the first weighted run

- **Document and section:** `interface-templates.md` 20a, the load step; `task-flows.md`, load and run.
- **Old text:** the load step asks what each weight column means.
- **New text:** "Numeric edge columns load as attributes with no preset weight role. The meaning of a weight is asked the first time a run uses it, with the answers distance, similarity, capacity and reliability, each with one line on what it does to that measure. The answer is the project's; a run can use 'None for this run' from the run form's Weight by."
- **Why:** round-3 load-step and weight findings: the meaning question at load was the only thing that blocked Load, and recipients who had not made the file could not answer it.

## Load step: the weight sentence, the plain wording of pairs and unconnected nodes

- **Document and section:** `interface-templates.md` 20a, the load step and its import report; `message-catalog.md`, `graphty.load.parallelEdges` and `graphty.load.report`; `interface-specification.md` 4.1, the graph's Statistics. Builds on "Load step: the weight's meaning is asked at the first weighted run", above.
- **Old text:** the Role list of a numeric edge column offered Weight, and a Weight column that was not all numbers blocked Load ("Load is off: choose how to read confidence"); the parallel-edge issue read "1,036 extra parallel edges" with "Keep all" and "Merge into one, max of confidence"; an edge-list file lost a protein with no partner ("298 nodes -- 2 proteins in the file have no interaction"); Statistics folded the weight state into the Edges line.
- **New text:** "A numeric edge column loads as an attribute: its Role starts at None and the load step's Role list offers no Weight, so nothing about a weight can hold Load back. A column whose numbers include NA is read as text and shown as a caution with its Read as choices, each stating what would load; Load stays on. Under the load counts, one weight sentence per numeric edge column, in one of three forms and the same words on every screen: '{column}: numbers, not used', '{column}: used as strength (your answer, {date})', or 'No numeric edge column' (in Statistics the first two carry their action, '-- say what it means' and '-- change'). Pairs that repeat read '{N} pairs appear more than once' with the choices 'Keep each: {rows} edges' and 'Combine into one: {pairs} edges', and 'parallel edges' as the secondary term. A node named on a row with an empty partner is loaded: '{N} proteins have no partner in the file: {names}. They are loaded unconnected.'"
- **Why:** round 3 (`study/round-3/insights.md` findings 1 and 8): the weight was described five ways, and the meaning question at load blocked recipients who could not answer it; "weigh edges", "parallel edges" and "have no interaction" read as graph jargon or as a broken file. Kept from the same round: naming the column and giving each choice with its result in counts.
- **Drawn:** screens/load-step.html, all ten states.
- **One-way doors (for the owner):** the three weight sentences are message-catalog strings and the per-column weight state they read is proposed graphty-element API ("graphty-element proposals", above); loading an empty-partner row as an unconnected node changes what graphty-element's edge-list importer builds.

## Authorship on notes and recipes, and the other decisions now in force

- **Document and section:** every entry in this file on the findings report, figure export, note authors, the Note tool, the saved selection and undo; the Notes panel entries in `interface-templates.md` 4 and `state-matrix.md` 7.
- **Old text:** these entries said "proposed, not decided" or asked the owner; the Notes panel entry said "the owner's decision is the date only" and "Notes carry no author"; a Note tool on key C was proposed.
- **New text:** rewrite as decided (owner, 2026-09-28): the findings report is one self-contained HTML file; SVG figure export now and PDF later, with the grey check kept; each note records its author and time, and each recipe who saved it and when, both taken from the project's author setting ("Your name on notes and recipes" in Preferences, blank if unset), with the author shown only when a project holds more than one. Decided on the owner's behalf (reversible): the selection is saved when a project closes; undo follows version B; there is no separate Note tool, and the empty Notes panel's button is "Add a note...". **Withdrawn:** "Notes carry no author" and "the date only" -- the owner never made that decision; the earlier entries are marked in place. **Withdrawn:** the proposed Note tool and its key C.
- **Why:** the owner's decisions of 2026-09-28, and the owner's correction that the "no author" decision was never made.

## Asked for, logged, not designed (after round 3)

Participants wanted these, and they pull against the design; each stays logged so a later round can revisit it, and none is designed now:

- A query box, RDF import, `.anb` files (i2 Analyst's Notebook), a notebook widget, and a view with no layout -- carried over from earlier rounds, each with its persona and quote in the round-1 and round-2 insights.
- Opening two projects side by side (round 3, the older-projects Find task). A multi-document concept that one task does not justify.
- Matching communities across versions (round 3, the weekly update). Proposed to graphty-element, not drawn.
- Visible text labels on toolbar icons (round 3, orientation). Held for a live hover test, because tooltips exist and the evidence came from still screenshots.

## Start screen with a recipe pending: the card waits for the recipient's table

- **Document and section:** `interface-templates.md` 19, Start screen, "Regions and rows" and "Tab order" (the recipe card); `principles.md`, the conflict ledger row for the recipe-pending start screen; replaces the card text in "Recipe travels: a pending recipe answers where the data will go" and the Open... sentence in "Start screen with a recipe pending: what the rest of the list does", both above.
- **Old text:** "... the recipe's name; one sentence of what it does ...; 'It carries no data. To use it, open {what its slots need}.'; then one data sentence ...; then Open... and Close recipe." and "the card's Open... replaces the Open... row ... Tab order: the card's Open... and Close recipe; recents; ..."
- **New text:** "With a recipe pending, the card's header reads 'Recipe waiting for your table'. Under what the recipe does, one row per input source: a network the recipe brings reads 'Sender's network: {source and version}' with its size and a Replace... button (your own network file in its place); an input the recipient supplies reads 'Your table: not added yet' with what it needs ('a gene id and a fold-change column') and, when the sender's network carries a column of the same meaning, 'The sender's fold change is not used.' No column of the sender's network is ever offered as the recipient's fold change, here or in the binding step. Then the one data sentence, unchanged. The buttons: Add your table... (primary, and it takes focus when the card appears), Apply (disabled with aria-disabled, so it stays focusable and is read with its reason), the reason printed beside it, 'Waiting for your table', and Close recipe. Adding the table goes on to the binding step; a table dropped anywhere counts as Add your table.... Tab order: Add your table..., Apply, Close recipe, Replace...; recents; samples when present; Connect to data source.... Word budget ledger row: 121 words, 37 of them the recipe's own preview and 84 the app's."
- **Why:** round 3, severity 4 (`study/round-3/insights.md`, finding 4): a recipe that brought the sender's network looked finished before the recipient's data was in it; "carries no data" was contradicted a step later by a network "opened by this recipe"; and participants reached for the network's 300-value fold-change column over their own 84 values. The owner's round-3 decision applies the already-specified binding rule (the entry on "from your data" needs above) to the start-screen card too, so the card and the binding step say the same thing. Two-way door. Drawn in screens/start-screen.html, state 4. screens/binding-step.html and screens/recipe-apply.html still draw the earlier card.

## Find, after round 3: the scope row, a line of facts per hit, what Open costs, Bring in its links, and Ctrl+F everywhere

- **Document and section:** `interface-templates.md` 2a (Find: Regions and rows, States); `information-architecture.md` 7 (Findability, Scope); `message-catalog.md`, `find.none` and new keys below; `interaction-pattern-entries.md` 9 (the key sheet); this file's entry "Find and Quick actions, after round 2", whose Search recent projects paragraph this revises.
- **Old text:** "a secondary `Button` **Search recent projects** ... answers in a group "Recent projects, found in {k} of {n}": one `ResultRow` per project holding the query, "Found in {project}", with **Open** as the trailing action. Open opens that project with Find showing the same query, the hit selected. With no hit: "Not in any of the {n} recent projects." Find opens with Mod+F (the entry on published shortcuts).
- **New text:**
  - After Search recent projects, a **scope row** under the empty message says what was read and offers the one wider search: "Searched {n} recent projects -- Search all {m}" (`Text` with an `Anchor`). Search all reads every project graphty keeps on this computer, only when pressed, and the row then reads "Searched all {m} projects on this computer". Nothing is indexed ahead of time. Under the button, one dimmed line: "Reads projects on this computer. Nothing is sent."
  - The hits sit in a group "Other projects, found in {k}", newest project first. Each hit's second line is **one line of facts**, read by graphty-element from that project: "{project}[, {date}]: {facts}", for example "Mule ring, Aug 12: 14 transfers, $48,200 out" or "Transfers, March 2026: 1 transfer". The date is given when the project's name does not already say when. The line wraps rather than being cut.
  - The selected hit shows two verbs: **Bring in its links...** (secondary `Button`, first) and **Open** (ghost `Button`), and under them, before any click: "Open closes {current project}. It is saved and stays in Recent projects." There is no "Open beside this one".
  - **Bring in its links...** opens the existing Add data step (template 20a), titled "Add data: {id} and its links", with its source set: the project, and "{id}, its {n} transfers ({amount} out), and the account at the other end of each", into the current project. Accounts are matched by id; the source project is not opened or changed; Undo removes what it adds. No new dialog.
  - **Ctrl+F** opens Find wherever the focus is inside the app frame (the drawing, the table, any panel), taking the key from the browser there; outside the frame the browser's own find still works. The key sheet lists it first under "Anywhere in graphty", with Ctrl+K, F6 and ?. The Find field's tooltip says "Ctrl+F opens Find from anywhere in graphty."
  - Find's result header uses the project's noun: "0 results in 3,093 accounts", matching the message beneath it.
- **Why:** round 3, finding 10 (severity 3, 4 sessions): "Search recent projects" read 7 files, a hit named a data file with no totals, dates or status, and Open looked as if it would throw away the project the analyst had set up; one analyst re-pasted the id blaming her typing, two would have escalated rather than open, and one could not say which projects she had checked. Finding 23 (severity 3): Ctrl+F did nothing on the walk page, and the keys that did work were shown nowhere. Opening two projects side by side was asked for and is not designed: it would add a multi-document concept for one task; bringing the account's links into the current project answers the same need with a step that already exists (logged under "Asked for, logged, not designed (after round 3)").
- **Element needs (graphty-element, not the app):** read a stored project without drawing it and answer an exact-id lookup with a short summary of that node (its edge count and the sum of an amount column by direction, and the project's date), so the facts line is the element's reading and not app arithmetic; read one node's incident edges and far-end nodes from a stored project as rows Add data can take. Which projects exist on this computer, and which are recent, is app state and stays in the app.
- **Owner's call (one-way doors):** Ctrl+F as graphty-element's published Find key (it overrides `NEVER_BOUND_CHORDS`, which keeps Mod+F for the browser); the wording of the new published message keys: proposed `graphty.find.searchedScope` ("Searched {n} recent projects", "Searched all {m} projects on this computer"), `graphty.find.hitFacts` ("{project}[, {date}]: {facts}"), `graphty.find.openCloses` ("Open closes {project}. It is saved and stays in Recent projects."). Everything else here is a two-way door.
- **Not yet backed by fixtures:** the 7 recent and 23 total projects, and the "Mule ring" case project with ACC-705989's 14 transfers and $48,200 out, are the scenario's premise; no kit dataset holds that project. The March line (1 transfer) is read from the kit's March data.
- **Drawn in:** screens/find.html, states 10 (an id not in this project), 11 (searched recent projects), 13 (searched all projects), 14 (Bring in its links opens Add data) and 15 (Ctrl+F on the key sheet); state 1's tooltip.

## Recipe binding: the recipe preview waits for your table

- **Document and section:** `interaction-pattern-entries.md` 6.10, Behavior; `interface-templates.md` 20, Binding step; `task-flows.md` 8 (the Apply decision and its trust check); `message-catalog.md` `file.binding`. Builds on "A recipe's 'your data' needs: Apply waits with its reason, never the sender's column" above and withdraws, for a recipe with an input the recipient supplies, "Binding step: when everything matched, Apply commits from the recipe preview".
- **Old text:** (6.10) "Choosing one shows what it carries before it is applied: style layers, runs with their cost bands, overview readings, set slots and the attributes it needs." The drawn preview said "Everything was found by name", listed the network's log2FoldChange as the fold change, offered "Add a table..." as a small link, and labelled the network "opened by this recipe".
- **New text:** "The preview opens with 'Brings: {n} styles, {n} filter, {n} runs. You supply: {the recipe's recipient line}', in the same words the sender saw. The network the recipe was built on is listed as 'Sender's network: {source} {version}' with its file, counts and Replace.... While an input the recipient supplies has no table, the Files section lists 'Your table: not added yet' with Add your table... as the dialog's main button, which takes focus; those inputs read 'waiting for your table' under a group 'From your table'; one line says the sender's column of the same name is not offered; the network's inputs follow under 'From the sender's network, found by name (N)'. Apply stays in the Tab order and is announced as unavailable (aria-disabled, never the disabled attribute), with 'Waiting for your table. This recipe needs {column} from your data.' printed beside it. Adding a table always opens the binding step with its match report, even when every row matched ('84 of 84 genes matched'), because the count is the trust check the recipient came for."
- **Evidence:** round 3, severity 4 (`study/round-3/insights.md`, finding 4, 5 sessions, 4 participants): the preview said "Everything was found by name" and enabled Apply on the network's own fold change; Elena took 152 up and 148 down as her results, reached for the 300-value column "because more gets coloured", and Tom nearly pressed Apply. The first-contact focus group raised "did I change the file" (3 of 4).
- **Drawn:** screens/binding-step.html, states 1 to 4 (the same redraw as screens/start-screen.html, state 4).
- **Open:** the words "Sender's network" need the network's source and version, which only a recipe that records them can supply; that is part of the recipe-format question already listed under "File formats (one-way doors, proposed)".

## Share the setup: the recipient's task, the order of steps, the layout and Not included

- **Document and section:** `task-flows.md` 9, the trust check for a recipe; `files-and-recipes.md` 1 (what a recipe holds); `interface-templates.md` 20 (the Export dialog's recipe preview). Amends "Share the setup: runs, note text and what opens the file" above.
- **Old text:** the preview's columns read "Travels", "Asked for when applied" and "Left behind"; the layout travelled as "force-directed, its settings and seed"; nothing said in what order the filter and the runs apply, or what the recipient has to do.
- **New text:** "Under 'No data inside', one line says what the recipient does, written from the inputs the sender marked as theirs: 'What your recipient does: add a table with a gene id and a fold change column, then Apply.' The recipient's preview says the same in its 'You supply' line. Travels lists the steps in the order they run when applied, headed 'Applied in this order: filter, then runs. The runs read the filtered graph.', numbered, each run with its parameters. The layout is named ('layout: ForceAtlas2') with its settings under a Details disclosure ('gravity 1, scaling ratio 2, 100 iterations, seed 7. Positions are drawn again on the recipient's network.'). Each input under 'Asked for when applied' says where it comes from ('from their table', 'from the network'). The third column is 'Not included' (was 'Left behind'); a network the recipe names is listed there with its file and source and 'named, not carried'."
- **Evidence:** round 3, severity 3 (`study/round-3/insights.md`, finding 27, 4 sessions, 4 participants, plus the code-first and switchers focus groups): the layout travelled as "force-directed, its settings", whether runs use the filtered graph was not said, nothing said what the recipient needs, and the "Left behind" column was clipped. The severity 4 finding 4 (above) is the same object seen from the other side: a recipient line the sender writes and the recipient reads closes both.
- **Element need:** the run order, the layout's name and settings and the recipient line are graphty-element's recipe description, read by the app, never assembled by it.
- **Drawn:** screens/binding-step.html, "0. What the sender sees". screens/export-dialog.html, state 4, still draws the earlier preview (three runs with Louvain as the modules' source, "Left behind", "force-directed, its settings and seed", and a "6 statistics" row) and needs the same change.

## Canvas drawing: a signed layer states its no-change band

- **Document and section:** `canvas-drawing.md` 4a, Looks, and `options-and-encodings.md`, the diverging color options.
- **Old text:** (the Print look's circle marks values "inside the stated dead band", but nothing says where the band is stated, who sets it or what happens without one)
- **New text (proposed as a published graphty-element layer property, not decided):** "A diverging layer has one optional field, **No change within +/- {value}**, in its midpoint row. It is empty by default: graphty-element never guesses a threshold, because what counts as no change is the analyst's call (a 1.5-fold cut-off, 0.58 in log2, is a lab convention, not a property of the column). With a band set, the Print look draws values inside it as circles, the legend states the band ('-0.58 to +0.58: no change') and the methods text names it. With none set, the Print look draws no circles and the legend says 'No band around 0 set'. When a shape layer sits higher in the stack, marks inside the band keep that layer's shape, drawn in the lightest gray with a dashed outline. The band is part of the layer, so it travels in a recipe and has the layer's undo entry."
- **Why:** the round-3 decision gives the Print look a circle for the dead band; a band the element chose would put a biological threshold into a figure without the analyst's knowledge, and a band set only in the export dialog would make the figure disagree with the canvas legend. The dashed outline is needed because, under a higher shape layer, fill already carries the sign and the lightest filled mark would otherwise read as a small increase. The property name and its key are published API, so the owner decides them. Drawn in `flows/export.html`.

## Export: a signed layer's labels are the top N by distance from the midpoint

- **Document and section:** `interface-templates.md`, the export dialog's figure settings (labels).
- **Old text:** "labels 'top N by this layer's value' or 'above a threshold'"
- **New text:** "On a diverging layer, 'top N by this layer's value' ranks by distance from the midpoint, so the strongest decreases are named as well as the strongest increases; the option reads 'Top N by distance from 0'."
- **Why:** round 3's signed gray figure failed partly because the only named genes were hubs and none of the dark marks had a name ("None of the dark dots has a name on it", Chen). Ranking a signed column by its raw value would name only increases. Drawn in `flows/export.html`: GSK3B, BMPR1A, NDUFS3 and SMAD3 are named beside PSMA2 and the other increases.

## Export: Export table... opens the one Export dialog, and the table's methods file cannot be unticked

- **Document and section:** `task-flows.md` 9, and `interface-templates.md` 16; supersedes the entries "Export: tables leave through the CSV dialog, reached from Export too" and "Export table as CSV...: the table's one exit, and Export files... no longer offers tables".
- **Old text:** the table has its own CSV dialog, reached from the table and from a button in Export.
- **New text:** "There is one export dialog. The table dock's Export table... opens it with Table (.csv) chosen and the tab's scope; the row states 'Rows: N of M, filtered'. A table is always written with its methods file, which the dialog shows checked and disabled ('Always written with a table'). Ticking Table (.csv) in the same dialog as a figure writes both over the same scope. Cancel returns focus to the control that opened the dialog."
- **Why:** round 3 found that two export dialogs wrote different things from the same figure, and that the methods file was written on one route only (csv-to-reviewer, Chen). One dialog makes every route write the same files. Drawn in `flows/export.html`.

## The Data panel: its order, its one Export..., and the verbs its rows carry

- **Document and section:** `interface-templates.md`, a new template "Data panel" beside template 2 (Graph panel); `output-homes.md`, the homes table (extends "Output homes: data's new homes, and export's starting places" above); `interface-templates.md` 2, the file chip (replaces the chip's popover in "Main frame at rest: the file chip's popover holds the data file only").
- **Old text:** (no template for the Data panel; the file chip opens a popover with 'Opened from', 'Read' and Replace data...)
- **New text:** "The Data panel keeps the left header (project name, the privacy line, the file chip and the filter chip), then a title row, 'Data', holding one **Export...** as a default (not filled) button: the panel has no filled button at rest, because none of its verbs is the common next step. Sections, top to bottom: **Sources** (each file read, with what it holds, its count and the day it was read; under it the sentence of its load choices, 'Loaded: {file}, direction followed, {column} not used yet. Change...', which stays after the load step closes; then its columns, each with one line saying what it is, a numeric edge column's line being its weight state in the three worded states; a joined table is a source row collapsed to its match count; under the sources, **Update with new data...** and **Add a table...**); **Versions** (data versions newest first; a click on a past version opens the Version history mode on it; 'Version history...' opens the whole list); **Recipes applied** and **Style files** (each row's verb shows what it added; '+' applies another; empty, the header stays in secondary ink); **Sent and saved from this project** (first 'Sent: nothing' or what was sent, always with its reason, then every file written, newest first, with what it held and when; each row's verb is Export again with these settings...). The graph Overview's state line quotes the source row's load sentence, and its Change... goes to that row. The file chip opens the Data panel and marks the load sentence; it has no popover of its own. Change... opens the load's choices in a popover (direction, what a row is, empty cells, each numeric edge column's use); its button Read again makes a new data version and keeps styles, sets and notes. Update with new data compares the new files with the current version before anything changes (counts beside the current ones, found by id, new, gone) and offers Add as another graph; Replace is the filled, focused button only when every column matches, and otherwise the filled button is Continue to matching. Add a table names the file, the key it matches on, the match count and the columns it adds before anything changes."
- **Why:** the owner's direction that data management be one designed area, and the round-3 findings behind it (`study/round-3/insights.md` 7, 18 and 26): the load's choices vanished after load, updating had no home, and "Nothing sent" had no evidence behind it. A file chip whose popover repeats the source row is two homes for one fact, so the chip now points to the one home. Export... unfilled keeps the rule "one filled button per surface" without making export look like the panel's purpose. Drawn in screens/data-panel.html (seven states).
- **Open, two-way:** the right column's header row 1 is now empty (no avatar, no Export...); whether it folds away, or takes another control, is undecided. The labels "Update with new data...", "Add a table...", "Read again", "Add as another graph" and "Export again with these settings..." are command labels and become published message keys, so their final wording is the owner's.

## Navigation: one header row on the right

- **Document and section:** `interface-specification.md` 1.1 (the region map) and 1.2 (Header row 1, Header row 2); `figma-crosswalk.md` 6.
- **Old text:** "Header row 1 | Share and play | Export..., the one filled button" and "Header row 2 | the mode's tabs, then zoom".
- **New text:** the right column has one header row, 48 px, aligned with the left panel header's first line: the zoom and view menu at its right, and the mode's tab at its left while Version history or the comparison surface holds the column. There is no filled button, no avatar and no tab in it at rest; the inspector's type row follows directly. The privacy line ("Nothing has been sent from this project") sits under the project name in the left panel header, not in this row.
- **Why:** once the avatar and the Export button leave (owner review items 1 and 3), header row 1 would hold nothing. An empty 48 px band reads as a missing control, and keeping it only to copy Figma's Share-and-play slot is the literal copying the owner asked the studio to stop. Nothing is lost: the one thing row 2 held keeps its place. Drawn in `screens/navigation.html` (the storyboard; the entry "Places" above names it `storyboards/navigation.html`, which does not exist -- the before-and-after lives at `screens/navigation.html`).

## Update with new data: the label, the main button, What changed, the large-change mark and the export's comparison column

- **Document and section:** `task-flows.md` 8 (the mermaid chart's entry, the step table's "choose", "load" and "read the replay" rows) and 8.2 (the "keep" row); `information-architecture.md`, the File menu and the Last import row; `interface-templates.md` 20a (the load step's footer) and the Version history entry; `content-design.md`, the words list; `output-homes.md`, the Data panel homes. Supersedes the label "Update with a new export..." in "Information architecture: four placements" above, and the replay report's "{N} new single-node groups" line proposed after round 2.
- **Old text:** "Main menu: File: Replace data..." (task-flows 8); "Replace data..." relabelled "Update with a new export..." in the File menu and on the Last import row (the earlier proposal); the load step commits with Load; "read the replay | Results panel | ... | runs forked to the new version; under Replace data, hand-made sets and notes carried over by id"; the replay report: "65 communities, was 35" with "26 new single-node groups" on its own line; "39 closed" on the load step and "only in March, closed" on the comparison.
- **New text:**
  - "The command is **Update with new data...**, in the Data panel's header and in the project-name menu, described 'Replaces nodes and edges. Keeps styles, sets, notes and runs.' It is the Replace data command renamed, not a second command."
  - "The load step it opens has two commit buttons, **Replace {current version} data** and **Add to {current version} data**. When every column of the new files matches the data loaded now by name, Replace is the main button and takes Enter, and the step says 'Same columns as {files}, the data already loaded.' When some columns do not match, the main button is Continue to binding and the binding step's Apply replaces. Add is always the second button, with what it would leave beside it ('3,132 accounts and 17,483 transfers; the 39 not in April stay in')."
  - "Each data version after the first carries **What changed**, against the version before it, on its row in Data > Versions and in the same words on each replayed result's row. Every line is a count and its split, as graphty-element computes it: '{N} {things} (was {M}): {K} {nodes} have no {edges} in this version'; '{N} accounts (was {M}): {a} in both, {b} new, {c} not in {version}'; '{N} communities (was {M}): {K} are single accounts with no transfers in this version'. A line never states a motive or a cause outside the data (closed, left, churned, merged). A line whose count moved by half or more of its earlier value carries the **large change** mark (the warning glyph and the words), read as part of the line. The first version has no What changed."
  - "Words: 'not in {version}' for an item in the earlier version and not in this one (never 'closed' or 'gone'); in files, 'no longer present'. 'Dropped' stays reserved for rows lost at import."
  - "The Table export offers, whenever an earlier data version exists, the column **Compared with {date the earlier version was loaded}**, ticked, with the values **new**, **in both** and **no longer present**. Items no longer present are written as rows with empty values for this version's columns, and the row count says the split ('3,132 rows: 2,961 in both, 132 new, 39 no longer present'). The methods file names the version compared with by file and date."
- **Why:** round 3, finding 11 (severity 3, 7 sessions, 5 participants): jumps from 35 to 65 communities and 1 to 27 components stood unexplained; one participant built a wrong explanation from the unrelated "39 not in April" and "39 new communities"; another worked the reason out by hand; "closed" put an invented fact on the load step and the comparison ("If I put '39 accounts closed' in front of my manager and one of them is still open, that is my name on it."); no export marked rows new or gone, so participants would rebuild it with lookups. Finding 18 (severity 3, 12 sessions): no visible home for the weekly update, and Add data was the blue button. Explaining a change by counting can be checked; explaining it by motive cannot, so only count splits are shown. The half-or-more threshold marks both round-3 jumps (1 to 27, 35 to 65) and none of the ordinary movements in the same data (3,000 to 3,093 accounts, 9,113 to 8,370 transfers, 9 to 7 watchlist members). Drawn in `flows/replace-and-recipe.html`; `screens/replace-and-recipe.html` still shows the earlier label and report.
- **graphty-element (proposed, not decided):** the count split between two data versions (per item: new, in both, not in the newer one; per count: the split lines above), the large-change flag with its threshold as element configuration, and the per-row comparison value for export. The app only formats what the element publishes; it never counts, splits or judges a change itself.
- **One-way doors, for the owner:** the export column's header form ("Compared with {date}") and its three values are written into files other tools read, so they are a data format; the what-changed message keys are published (already listed under "Message catalog: new published keys"). The command label is a two-way door and is decided here.

## Run and read: changing a weight's meaning re-runs what used it, in one step

- **Document and section:** `task-flows.md` 3, Run a measure and read it (a new step row, "change the answer"); `interaction-patterns.md`, undo (one step that re-runs dependents).
- **Old text:** (silent; `screens/weight-role-trap.html` A5 draws "Nothing reruns by itself", and the result goes Out of date)
- **New text:** "Change... on a result's state line opens the meaning question for that column, with the current answer marked and the results that use it named. Choosing another answer is one undo step: every result that read the column re-runs inside the step when its estimate is within the time limit, and the rest go Out of date with Run. The notice counts them: 'Weight: amount no longer used as capacity. 3 results re-run.' Undo restores the answer and the runs before, without running anything. Focus returns to the Change... it came from."
- **Why:** the round-3 severity-4 weight finding (a path still said "unweighted" after a weight was chosen) and the weight-meaning finding (the answer is global for the column, with its side effect in the smallest text). A change that leaves every dependent result stale reproduces the mismatch the finding is about. Re-running what fits the time limit keeps the cost gate in force. Re-running dependents is graph functionality, so it is proposed to graphty-element, not done by the app. Drawn in `flows/run-and-read.html`, the first weighted run branch.

## Run and read: each answer to the meaning question says what it does to this measure

- **Document and section:** `options-and-encodings.md`, the weight-meaning question; `graph-conventions.md` 1, weight roles.
- **Old text:** the answers similarity, distance and capacity, with the technical term as secondary text.
- **New text:** "Each answer carries one line on what it does to the measure being run, written per measure. For PageRank: a longer or costlier step (distance) -- 'PageRank reads 1 / amount: small transfers pass more rank than large ones'; a closer or stronger link (similarity) -- 'PageRank passes more rank along larger transfers'; more can pass through (capacity) -- 'PageRank passes rank in proportion to the amount sent: the same arithmetic as a stronger link. Max flow reads it as a limit'; how likely it is real (reliability) -- 'Each transfer counts in proportion to how likely it is real.' An answer the column's values cannot support is shown unavailable with its reason: reliability needs values from 0 to 1 ('amount runs to 9,895.21')." Add to `graph-conventions.md` 1: a similarity reader given a capacity reads it as a proportional weight, as it reads a similarity, and says so in the run record.
- **Why:** round-3 finding 6: the question did not say what an answer does to the measure ("PageRank with distance?"), and participants guessed. `graph-conventions.md` 1 lists capacity readers as max flow and min cut only, so today a money column answered "more can pass through" would silently not be read by PageRank. Reliability itself is the one-way door already proposed ("Glossary: a reliability weight role").

## Run and read: how sure covers the rows shown, with its line stated

- **Document and section:** `task-flows.md` 3, the read step; `content-design.md`, the words list; graphty-element's list of needs.
- **Old text:** the near-tie sentence over the top 5, below the distribution; "No near-ties" when none; the line not stated.
- **New text:** "Top nodes come first, then how sure, then the distribution. How sure covers the rows shown (the editor's Top nodes, or the rows the table shows), states its near-tie line, and says whether another finished measure puts the same nodes on top. On the proteins: 'Top 10 of 300: no two are less than 1% apart; the closest are #3 YWHAZ and #4 CDK1, 1.2% apart. Betweenness and PageRank agree on the top 5, in the same order.' When a pair is within the line, it names it ('#30 and #31 differ by 0.3%; treat them as tied'). 'No near-ties' is never shown." Proposal to graphty-element (one-way door, for the owner): a ranking read with near-ties at a stated relative line, published default 1% of the higher value, and top-N agreement between two results.
- **Why:** round-3 finding 13 (severity 3): the sentence covered five rows below the fold, the 1% line was unstated, "No near-ties" contradicted 0.0695 against 0.0687, and agreement had to be read off two columns. Naming the closest pair answers the question readers asked when nothing crossed the line. A published default threshold is API, so its value is the owner's decision; round 1 rejected a threshold the app invents, which is why it is proposed to graphty-element.

## Run and read: communities count real groups, read modularity in words, and find each hub inside its group

- **Document and section:** `task-flows.md` 3 (the diagram's "Communities stable across seeds" node and the stability row); `content-design.md`; graphty-element's list of needs.
- **Old text:** "10 communities"; "modularity 0.716" alone; the hub as the member with the highest degree in the whole graph; the diagram node `SB{{"Communities stable across seeds"}}` and the step row "stability".
- **New text:** "The headline counts real groups: '8 communities and 2 unconnected nodes' (a node with no link is not a community). Modularity is followed by its reading: 'Far more links fall inside these communities than chance would put there; 0 would mean no more than chance.' The file's own grouping is named as that ('the file's modules score 0.663 on the same scale'). A group's hub is its member with the most links inside the group. Remove the stability node and row from the flow until graphty-element has a multi-seed stability run; nothing in the app stands in for it."
- **Why:** round-3 finding 29: 0.716 had no reading, the count included two lone proteins, and the hub column named AKT1, an outsider with most of its links elsewhere, for the ribosome group. Stability across seeds stays in "graphty-element proposals (one-way doors, not decided)" as multi-seed community stability. The fixture's `ppi.louvain.groups[].hub` is still the whole-graph degree and needs regenerating before a screen shows hubs.

## Notes: Add a note with nothing selected asks what the note is about

- **Document and section:** `task-flows.md` 7 (the step "choose what the note is about" and its first failure, a note landing on the graph); `interaction-pattern-entries.md` 6.1, the note exception; `interface-templates.md` 4, the empty Notes panel.
- **Old text:** with nothing selected, Add note starts a note about the graph, and the About line ("About the graph {graph name}") is the only check before typing.
- **New text:** "Add a note... with nothing selected opens the Note editor at the canvas's top right with focus on its first field, About:, a `Select` whose list is open: the graph, then under 'Kept sets' every kept set with its member count ('TP53 neighborhood, 33 proteins'), then 'Select something first', which closes the editor with nothing added and leaves the canvas to select from. Enter or a click chooses; Tab moves to the text and keeps the graph. With something selected, About: reads the selection and focus starts in the text. The next Add a note with nothing selected opens with About: set to the subject of the last note added in this session, focus still on About:; a selection always wins over the remembered subject. The remembered subject is session state and is not saved in the project."
- **Why:** round 3 (`study/round-3/insights.md`, finding 24, severity 3) watched the empty panel's button, read with nothing selected, write a note about the whole graph (Alex's first click), and a participant pin his reason to one member when he meant the kept set (Marcus). An About line the reader must notice did not stop either. Asking first costs one choice per note, and remembering the subject brings a run of notes about one set back to one choice. Shown in screens/notes-panel.html, state 10. Whether graphty-element exposes "kept sets" as one list for this picker is an element question; the picker only reads it.

## Notes: a Detached note's verb names what it brings back

- **Document and section:** `glossary.md` 10 (Detached, its verb); `message-catalog.md`, the Detached verb's key.
- **Old text:** the verb "Restore set".
- **New text:** "The verb names the set, its member count and the day its members were kept: 'Bring back {set} ({N} {member kind}, as kept {day})' ('Bring back Mule ring (14 accounts, as kept Sep 24)'). It brings back the members the note was written about, not the set's latest state. The sentence above it stays 'The set this note pointed to was changed.' On screen the kind `fixed` is always 'frozen set' and its verb Freeze; the API kind `fixed` is unchanged."
- **Why:** round 3 (finding 24) found "Restore set" did not say what it restores and "fixed" read as repaired. Shown in screens/notes-panel.html, state 7 ("Bring back DNA repair (30 proteins, as kept Sep 24)") and state 3 ("Frozen set"). The verb sits under a published message key, so its final wording is the owner's call.

## Keyboard walk after round 3: go to without selecting, Enter adds, the start survives Tab, regions named first

- **Document and section:** `interaction-pattern-entries.md` 9.2 (Walking the canvas) and 9.1 (regions); `interaction-patterns.md` 3.6 (key dispatch) and 3.8 (the canvas state chart, "Canvas focus"); `figma-crosswalk.md` 4.3 (the departures ledger).
- **Old text:** 9.2: "The first arrow press on the canvas starts the walk"; "The arrow keys move focus to a neighbor of the focused node"; "The walk-position slot and the announcement describe the focused node; **Enter selects it**, and the inspector follows." 3.8: "Idle --> Walk : arrow; Enter with elements or nothing selected" and "Focus leaving the canvas, by Tab or any other route, ends the walk; coming back needs a deliberate key again". Figma crosswalk 4.3: "the arrows walk from the focused node to a neighbor".
- **New text:** Shift with the arrows walks and the plain arrows stay on the camera (owner decision; Alt with the arrows is ruled out, because Alt+Left and Alt+Right are the browser's Back and Forward). Going to a node by name (Quick actions' row "Go to {name}") puts the walk on that node and makes it the walk's start; it selects nothing. In the walk, Enter adds the focused node to the selection and never replaces or removes it; Space still adds or removes. The inspector visit on the focused node moves from Enter to Alt+Enter (Option+Enter on a Mac); Esc returns to the same node. graphty-element holds the walk's start and the node it left off on: focus leaving still ends the walk and arriving still never starts it, but both survive Tab, F6, Esc and every overlay, and the next Shift+Arrow goes on from them; they are replaced only by going to another node, a Find hit, the start leaving the drawing, or another graph. Every region is a landmark with a heading of the same name (Graph drawing, Nodes table, Inspector, Graph panel, Tools), and every arrival announcement starts with that name; the walk's line reads "Walking the drawing". The key sheet groups its keys under region headings (Everywhere, Graph drawing, Nodes table, ...), so a key with a different job in two regions (Shift+Down) is listed under each. The long welcome on the drawing is said once per project; later arrivals say "Graph drawing. Walk kept: on {node}, from {start}. {n} selected on canvas." There is no C key.
- **Why:** round 3, finding 23 (`study/round-3/insights.md`): going to a node selected it, so all three keyboard participants ended "select two neighbours" with three selected (four extra keys to clean up); after Tab to the table and back the walk restarted at the first selected node; the app had no headings; the welcome was re-read at every return; Shift+Down walked on the drawing but range-selected in the table. The owner accepted the Shift+Down clash as a region-naming problem when deciding Shift+Arrow. The inspector visit with Enter worked (the screen-reader participant wanted it kept), so it moves rather than goes.
- **Owner's call (one-way doors):** Alt+Enter as a published default key of graphty-element (the inspector-visit role); the published message keys for "Walking the drawing", "Walk kept: on {node}, from {start}" and "Go to {name}"; the walk's start and place as graphty-element state exposed in its focused-node event. Everything else is a two-way door.
- **Drawn in:** flows/keyboard-walk.html (the states, every key, the regions table, the key sheet, the trace on Les Miserables).

## The weekly return: a reopened project restores the saved selection, and says so

- **Document and section:** `task-flows.md` 2.2 (Rest, and the trust check "nothing selected"); `state-matrix.md` 3, the Canvas row "reopened project"; `message-catalog.md` (a new row next to `selection.cleared`); `files-and-recipes.md`, the project profile. This supersedes the clause "Reopening still starts with nothing selected" in the entry "the selection saved in the project file" above.
- **Old text:** state matrix: "reopened project: everything as saved; the camera fitted; nothing selected; the Last import row and Version history say what changed". The earlier proposal: "Reopening still starts with nothing selected; Previous selection restores the saved one".
- **New text:** state matrix: "reopened project: everything as saved, including the selection the project closed on; the camera fitted; the inspector follows that selection; the Last import row and Version history say what changed". `task-flows.md` 2.2, Rest: "the graph that was on screen, and the selection it closed on". New message `selection.restored`: "Selection restored: {n} nodes" (or "{n} edges", "{n} nodes and {m} edges"; "{set name} selected" for an object selection), a transient state line at the foot of the canvas with Clear, polite. Clear or Esc empties the selection and says `selection.cleared` ("Ctrl+Alt+Z: Previous selection"), which brings it back. Restoring on open and clearing are selection changes, never undo entries. Elements of the saved selection that are no longer in the data are dropped and counted: "Selection restored: {k} of {n} nodes; {d} are not in this data".
- **Why:** decided on the owner's behalf (reversible): the project file saves the selection when it closes. Saving it and then discarding it on open would make the saved field invisible; an analyst who closed mid-investigation (the 14 flagged accounts selected) picks up where she stopped. The state line keeps the restore from being mistaken for a stray click, and Esc plus Previous selection keep the graph's own inspector (and its Last import row) one key away. Drawn in storyboards/weekly-return.html frame 2 and screens/weekly-return.html, states 2 and 3. The message key is published, so its wording is the owner's call.

## Time on paths and Neighbors: dated rows, a mark for a hop back in time, and one Neighbors with a window

Drawn in `flows/sets-and-paths.html`, sections 2 and 5. Evidence for every entry below: round 3,
severity 4 (`study/round-3/insights.md`, finding 2: "Transfers on a path carry no date, time order
is never checked, and money cannot be traced forward"; 12 sessions, 5 participants, all four
investigators in the focus group called it a blocker), and finding 5 (the "Top N, with neighbors"
step past the drawing limit). Generalised so that none of it is a money feature: every rule reads
"a date column on the edges", never "transfers".

### Every path and edge table shows the edge's time right after its two endpoints

- **Document and section:** `interface-specification.md` 4.2 (a found path's Members), `interface-templates.md` (the table dock's Edges tab), `task-flows.md` 10.2.
- **Old text:** (column order unstated; the path readout showed step, source, target, amount; the table dock showed the time after the two accounts, so two screens disagreed)
- **New text:** "In every table of edges -- a path's rows, a filter step's rows, the Edges tab, and every CSV written from them -- the edge's date column comes directly after its two endpoints, before the run's own columns (hop, on paths, time order) and before the other edge columns. With several date columns, the first in the file comes first. With none, nothing is inserted."
- **Why:** finding 2 ("Where are the dates? ... the table makes them look like one", Sarah). The table dock already did this and participants read it as right; the path readout did not.

### A hop earlier than the hop before is drawn dashed with a clock mark and named in its row

- **Document and section:** `canvas-drawing.md` 6 (marks on a found path or neighbourhood); `interface-specification.md` 4.2; `message-catalog.md` (the time-order mark, already listed in "graphty-element proposals" above as "earlier than the hop before").
- **Old text:** (round 2: the state line alone named the first inversion; the canvas and the rows showed nothing)
- **New text:** "When a walk's edges have a date column, a hop whose date is earlier than the hop before it, read in the direction the edges run, is drawn dashed with a clock mark on its midpoint, keeps its own colour and stays in the result; its row's time order cell reads 'earlier than the hop before ({that hop's date and time})', and every other row reads 'in order'. The screen reader reads it with the account ('ACC-593226, earlier than the hop before'). The same rule, the same mark and the same words hold for a path and for Neighbors. With direction ignored, or no date column, nothing is dashed and nothing is claimed."
- **Why:** finding 2: Marcus checked order by eye and "would miss it on nine hops". Dashing is the one line style the path drawing does not already use (chevrons carry direction, colour carries the layer), and the clock says why. The hop stays, because a hop out of order is still evidence of something.

### Follow time order: a path option, proposed to graphty-element (one-way door, for the owner)

- **Document and section:** `options-and-encodings.md`, the shortest-path options; `task-flows.md` 10.2 and 10.3 (the Time row, whose earlier proposal in "Proposed for task-flows 10.3: paths that run forward in time" this entry replaces); graphty-element's list of needs.
- **Old text:** "| Time | tail | 2 steps | only with a time attribute |"
- **New text (proposed, not decided):** "The Paths between form shows a checkbox, 'Follow time order ({date column})', whenever the edges have a date column (with two, it names one and offers a picker). Ticked, the search returns only routes in which every hop is no earlier than the one before (equal times count as in order), and the state line reads 'Follows time order on {column}; {both paths | all R paths} qualify, {first date} to {last date}.' When no route qualifies, the form stays open with 'No path in time order; {R} paths exist out of order' (`graphty.query.noPathInTimeOrder`) and Show paths out of order, which unticks it and runs again. It never returns out-of-order routes as the answer. The option, its result flag and the message key are graphty-element API."
- **Why:** finding 2 recommendation ("a time-respecting path option: each hop after the last"); first asked for by name in round 1 ("follow the money in time order"). It is graph functionality, so graphty-element owns it; the option name and the message key are published, so they are the owner's call.

### Neighbors: one name, a direction, and an optional window on any date column

- **Document and section:** `interaction-pattern-entries.md` 4.6 (Grow the selection); `interface-specification.md` 4.2 (the One node and Several elements rows); `information-architecture.md` (the Edit menu's "Select neighbors"); `glossary.md`; graphty-element's list of needs (the "date window on Around a node" proposal in "graphty-element proposals" above, renamed).
- **Old text:** 4.6: "Select neighbors is one command with a direction argument (In, Out or All ...)"; the proposals list: "a date window on Around a node"; round-2 mocks: "Select neighbors, Follow: In".
- **New text:** "The neighbours action is called Neighbors everywhere: the inspector's labelled split button, the context menu, Quick actions, and the filter step's name ('{node} and neighbors'). There is no 'Around a node', no 'Follow', and no money-specific 'Trace'. Its menu, titled 'Hops from {node}' ('Hops out of {node}' once Out is picked), holds Direction (In, Out or Both; on directed data the default follows the data), the hop counts each with its size, and Window: '{date column}: Any time' by default, offered only when the edges have a date column. A window counts what it leaves out ('2 of ACC-233575's 5 transfers out are outside the window'). Then Filter to neighbors (the main part's action) and Select neighbors (selection only). The window is proposed to graphty-element: 'A date window on Neighbors'."
- **Why:** finding 2 (a forward trace needs no destination; Sarah: "I type the flagged account, say 'money out, March, three hops'") generalised: a window on any date column serves emails, shipments and citations as well as money, so it is one option of one command, not a fraud feature. "One name" because round 3 met the same action as "Neighbors" and "Filter to neighbors" on the inspector and as "Around a node..." in the filter steps past the drawing limit ("Two names for one action", `study/round-3/sessions/neighbors-two-sizes--gephi-holdout.md`), and Sarah read "Around a node" as possibly not her account (`neighbors-two-sizes--fraud-analyst.md`).

### Neighbors ends with one computed summary line

- **Document and section:** `interface-specification.md` 4.2 (a filter step's state line); `message-catalog.md`, a new row; graphty-element's list of needs.
- **Old text:** (none)
- **New text (proposed, not decided):** "A Neighbors step with a direction and a date column ends with one line that graphty-element computes: 'Out of {node}, {window}: {n1} {edges}, {total1}, to {a1} {nodes}; then {n2} {edges} out of them after the one that reached them, {total2}, to {a2} more {nodes}, within {h} hours. {k} {edges} are earlier than the hop before and are not counted.' Totals appear only when the edges have a numeric column answered as an amount that flows; otherwise the line counts edges and nodes only. It restates counts; it never says the money is the same money."
- **Why:** finding 2 recommendation ("a one-line summary: 9,800 moved on in 3 hops over 48 hours"). The count split is honest because it only restates what the timestamps allow; "moved on" would claim motive, which the weekly-update decision already ruled out. On the March transfers: "Out of ACC-233575, 4 Mar to 17 Mar: 3 transfers, $28,559.99, to 3 accounts; then 7 transfers out of them after the one that reached them, $56,018.09, to 4 more accounts, within 140 hours. 2 transfers are earlier than the hop before and are not counted." (`kit/fixtures.json`, `scenarios.setsAndPathsTrace`).

### "Top N, with neighbors" splits into "Keep top N" and "Add their neighbors"

- **Document and section:** `state-matrix.md` (Routes that need no prior knowledge); `element-needs.md` (Named filter steps offered past the drawing limit).
- **Old text:** "'Top N by degree with neighbors', N sized by the element from its legibility level ..."
- **New text:** "'Keep top N by {measure}', N sized by the element from its legibility level and set by the reader, is one filter step. 'Add their neighbors' is a second, separate step offered after it (the Neighbors command on that step's nodes, with the same direction and window options). Either can be unticked or undone alone. When Neighbors grows an existing step by a hop, the undo entry reads 'Add their neighbors to {step}'."
- **Why:** finding 5: the combined step with N fixed at 3 was the only ranking step past the limit, and participants could not tell which half had done what. Splitting it also gives the neighbours action one name.

## Take a note: what a note is about is fixed once it is added

- **Document and section:** `output-homes.md` 3.7, the Edit note row (proposed above, "Take a note: correcting and deleting a note are undo steps"); `interaction-patterns.md` 2, note [c].
- **Old text:** (silent on whether Edit note can change a note's targets)
- **New text:** append to the Edit note row: "Edit note changes the text, the citations and the quotes. What the note is about (its About field) is chosen before the first text is committed and cannot be changed afterwards; a note on the wrong target is written again and the first one deleted, two undo entries."
- **Why:** each note now records its author and time (owner, 2026-09-28) and goes into the findings report as evidence; a note whose target could be changed silently would say it was written about something it was not. The About field, focused before a word is typed when nothing is selected, is where a wrong target is caught. Whether a change of target should be allowed and shown in the note's history is an open question on flows/take-a-note.html. Drawn in flows/take-a-note.html, the Edit row.

## Main frame at rest: the legend says why nodes are named

- **Document and section:** `options-and-encodings.md` 6, item 2 (the legend's blocks); `canvas-drawing.md` 9 (the label budget). Builds on "Legends: a block's title says what the channel encodes", above.
- **Old text:** the labels the budget draws carry no statement of their rule; the proposed block title was "Labels: top 12 by degree".
- **New text:** "Whenever the drawing names some nodes and not others, the legend's last block says by what rule, in the data's own nouns: 'Labels: the {N} {nodes noun} with the most {edges noun}' ('Labels: the 18 characters with the most connections', 'Labels: the 12 accounts with the most transfers'), then in secondary text '{k} more hidden where they overlap' when the collision cull dropped any. A drawing with no labels at all says so only when a reader could expect them: 'No labels: {n} accounts drawn as density'. The rule, N and the count hidden are read from graphty-element's label budget, never computed in the app."
- **Why:** round 3, finding 7: Elena, Jordan and Tom read the named hubs as "the important ones"; a caption that names the rule turns that guess into a stated choice of the tool's. "Top 12 by degree" was graph jargon to the same readers.
- **Drawn:** screens/frame-at-rest.html (every state with data, every dataset).
- **One-way door (for the owner):** the caption reads the label rule, N and the hidden count from graphty-element; that is proposed element API (a published label-budget read-out), not decided.

## Main frame at rest: the Statistics state line carries the load

- **Document and section:** `interface-specification.md` 4.1 (the graph's Statistics); `content-design.md` 3, State line. Builds on "The Data panel: its order, its one Export..., and the verbs its rows carry", above.
- **Old text:** Statistics opened on its readings; direction and weight were a second line under Edges ("undirected, weight: value").
- **New text:** "Statistics opens with the graph's state line, the same sentence the Data panel keeps on the file's row: 'Loaded: {file}, {undirected | direction followed}[, NA read as missing, repeated pairs kept], {column} not used yet | no numeric edge column.' then Change..., which opens the load's choices. It stays for as long as the data does; it is not a notice. The Edges row no longer repeats direction or weight."
- **Why:** round 3, finding 7: nothing after Load repeated what was chosen, and participants could not say later whether direction or a weight was in force. One sentence in two places, never two wordings.
- **Drawn:** screens/frame-at-rest.html (states 1, 2 and 4 to 9, every dataset).

## Main frame at rest: the table is a strip, not absent

- **Document and section:** `interface-specification.md` 1 (the Bottom dock rows of the region and size tables); `state-matrix.md`, the Bottom dock.
- **Old text:** "Bottom dock: default one third of the canvas column"; a closed dock leaves nothing on screen.
- **New text:** "At rest the dock is collapsed to a one-row strip along the bottom of the canvas column: a chevron, the table icon, 'Table', what it holds ('77 nodes, 254 edges'; nothing in a blank project) and 'View > Table' at the far end. A click anywhere on the strip opens the dock at the height it last had, one third of the canvas column the first time. The toolbar gets no table button."
- **Why:** round 3, finding 7: Dana looked for a table and found none. The strip matches screens/table-dock.html's Collapsed state, so the table is found by looking, not by knowing the menu.
- **Drawn:** screens/frame-at-rest.html (every state).

## Main frame at rest: no visible labels on toolbar icons (decided, until a live hover test)

- **Document and section:** `visual-language.md` (toolbar); `interface-templates.md` 14.
- **Old text:** round 3's recommendation that toolbar icons get visible labels.
- **New text:** none: the toolbar keeps icons only, each with a tooltip naming the tool and its key ("Select V", "Quick actions Ctrl+K"). The toolbar's tools are Select, Path and Quick actions, then the view mode; there is no Note tool.
- **Why:** the owner's decision after round 3: the finding came from still screenshots, where tooltips cannot show. It is reopened only if a live hover test shows the tooltips are not found.
- **Drawn:** screens/frame-at-rest.html.

## The style stack in the right panel: details the decision left open

Each entry below is drawn in screens/styles-list.html. All are two-way doors except where marked.

### Style stack rows show a drag handle at rest

- **Document and section:** `visual-language.md` A7 (the style-layer row); `interface-templates.md` 9.
- **Old text:** a style-layer row is chip, name, origin word and the trailing slot; reordering is by dragging the row or by Move up and Move down.
- **New text:** "A style-layer row leads with a drag handle (grip, 12 px, secondary icon ink), shown at rest in both the Style stack and Appearance. Base style has no handle; its trailing word is 'pinned'. Move up and Move down (Ctrl+] and Ctrl+[) stay the keyboard way."
- **Why:** the owner's review asks for drag handles on the stack by name. A handle at rest also says the order is the reader's to change, which the stack's whole meaning (top wins) depends on. Built with compact-mantine `Tree`, which needs a handle slot.

### The legend's switch sits at the foot of the Style stack

- **Document and section:** `options-and-encodings.md` 6 (the legend); `interface-specification.md` 4.1.
- **Old text:** (the canvas legend has no control in the inspector)
- **New text:** "The Style stack section ends with one row, 'Legend ... on the canvas', a switch that shows or hides graphty-element's canvas legend. The legend itself stays on the canvas, drawn by graphty-element, its blocks in stack order."
- **Why:** the decision places the legend in the Style stack. Drawing the legend's blocks a second time in a 240 px section duplicates the canvas key and pushes Results below the fold; the switch gives the legend a home in the section and keeps one key. With editors now opening from the right panel, the canvas legend no longer needs to move aside while one is open, so the entry "The canvas legend yields to an open editor" is withdrawn.

### Appearance marks a covered write on the selection

- **Document and section:** `interface-specification.md` 3.1 (Appearance); `interaction-pattern-entries.md` 4.7.
- **Old text:** one Appearance row per channel names the winning layer and its value.
- **New text:** "Appearance is the whole stack. A row that paints the selection is highlighted (a 2 px bar in the selection-border color and a secondary tint) and has a second line naming what it wins and the value that drove it ('Wins color: betweenness 0.1139'). A row that writes the selection but is covered there is not highlighted; its second line says 'Label: covered by {layer} above'. A row that does not touch the selection has no second line. In Appearance, the '{N} more' cut never folds a row that paints or writes the selection."
- **Why:** the covered line is what answers "why is this node not the color I expected": the overridden layer stays in view and names the layer above it. Folding a winning row behind "N more" would hide the answer. Needs graphty-element's per-channel explanation for several layers at once (`element-needs.md`, the resolved value on each channel).

### A layer added from Appearance applies to the selection as it was

- **Document and section:** `interface-templates.md` 10 (Applies to); `task-flows.md` (first write).
- **Old text:** (no rule for the scope of a layer made from a selection)
- **New text:** "'+' in the Appearance header adds a layer on top, named for its target ('TP53', or the set's name), whose Applies to is the selected elements by id at that moment -- never 'whatever is selected'. It writes nothing until a channel is added, and its first channel's value starts empty ('Pick a color'), so adding it changes nothing on the canvas. One undo step removes it."
- **Why:** a scope that followed the live selection would repaint whatever the reader clicked next. Starting empty avoids painting the node a color the reader did not choose.

### Libraries, only as the colour picker's tab

- **Document and section:** `glossary.md` (the main menu row, the recipe, Catalog and set collection rows, which reject "library"); `figma-crosswalk.md` 6 ("a library is reserved").
- **Old text:** "Libraries" is rejected as a main menu name and "library" as a synonym for recipe, catalog and set collection.
- **New text:** add a row: "**Libraries** | Screen | The colour picker's second tab: palettes, and the style layers that came with the project's style files and applied recipes. Used only there, as in Figma." Keep every existing rejection.
- **Why:** the owner's decision names the tab Libraries, Figma's word for the same place. The earlier rejections guard against "library" as a name for a recipe or the catalog, which this does not touch.

### What the Libraries tab offers

- **Document and section:** `interface-templates.md` 10 (the colour picker); `options-and-encodings.md` 4a.
- **Old text:** (none)
- **New text:** "Libraries lists Palettes (named in words: Okabe-Ito, Orange to brown, Viridis, Blue to red) and then Style layers, grouped by the file or recipe they came from. Picking a palette colour sets the swatch; a ramp is offered only when the channel is bound to a value. Picking a style layer adds it on top of the stack, applied to the selection, and keeps its name and origin word. With no style file and no recipe the tab is absent and the picker is titled Color (compact-mantine `ColorPickerPanel`)."
- **Why:** the decision says what Libraries holds but not what picking an entry does. Adding a library layer rather than copying its value keeps it traceable to its file, which the origin word depends on.

### The Graph panel's sections, and the stack's names

- **Document and section:** `glossary.md`, the row "Graphs, Sets and paths, Styles, Views, In this project, Catalog".
- **Old text:** "The Graph panel's sections and the Results panel's two halves; Styles is the style stack's list."
- **New text:** "**Graphs**, **Sets and paths**, **Views**: the Graph panel's sections. **Style stack**: the inspector's section with nothing selected, the whole ordered stack. **Appearance**: the same stack with a selection." "In this project" and "Catalog" leave with the Results panel.
- **Why:** follows the decision that styles leave the Graph panel and Results leave the rail.

### The Looks: Screen, Print, High contrast (published names: for the owner)

- **Document and section:** `options-and-encodings.md` 4a; `conceptual-model.md` 5.1 (The Look).
- **Old text:** Looks Default, Colorblind safe, Print and High contrast.
- **New text (proposed, not decided):** three registered Looks, **Screen** (the palettes each layer chose; was Default), **Print** (reads in gray on paper and for color-blind readers; sign shown with shape) and **High contrast**. Colorblind safe folds into Print.
- **Why:** the owner's review names the three; the Print entry above ("the Print look carries sign with shape") makes Print meet both constraints, so a separate Colorblind safe Look would duplicate it. Look names are graphty-element's registered list and reach project files, so renaming Default is a one-way door.

### The catalog opens from the main menu's Algorithms

- **Document and section:** `interface-templates.md` (Results, the Catalog row); `figma-crosswalk.md` 6.
- **Old text:** the catalog is the Results panel's lower half.
- **New text:** "The catalog is the main menu's Algorithms submenu (and Quick actions): families as menu labels, each method a described item with its task line, 'Start here' on one per family, Degree's line ending 'already counted'."
- **Why:** Results left the rail, and the decision log names "the main menu's algorithm catalog" as a starting place for runs. A dark described menu (the `data-described` item already proposed to compact-mantine) carries the task lines the second study showed people need.

### The placement study's pages are frozen

- **Document and section:** `research/study-schedule.md`, "Where the style stack lives".
- **Old text:** study/style-stack-arm-a.html and -b.html are generated with screens/styles-list.html.
- **New text:** the two pages are the record of what participants saw and are no longer regenerated; the question is closed by the owner's decision to put the stack in the right panel.
- **Why:** regenerating them with the new chrome would change a record after the sessions that used it.

## Preferences: "Your name on notes and recipes", and no account anywhere

- **Document and section:** `information-architecture.md` 3 (the main menu tree, Preferences); `implementation-mapping.md` (the Reader preferences row); `interface-templates.md` 20 (Preferences); `glossary.md` (the main menu's submenus).
- **Old text:** Preferences lists the scroll wheel, the GPU policy, theme, reduced motion, the default overview and the AI provider; the reader preferences row lists "dock tab and height, section open states, theme, reduced motion, the acceleration policy, and a reference to the reader's default overview recipe". Nothing names where a note's or a recipe's author comes from.
- **New text:** add to Preferences, in the last group above AI provider...: "Your name on notes and recipes..." -- an item whose line shows the name, or "Not set: notes and recipes record no name", and which opens a small dialog with one Name field, the help "Saved with each note and recipe you make from now on, exactly as typed. Shown only when a project holds work by more than one person. Leave blank to record no name.", and Cancel and Save. Add "the author name (blank by default)" to the Reader preferences row. Add: "graphty has no accounts. No surface shows an avatar, a sign-in, a profile or a picture of the reader; the author name is the only thing that identifies a reader, and only as typed. Changing it does not rewrite notes or recipes already saved: each keeps the name it was saved with."
- **Why:** the owner decided (2026-09-28) that each note records its author and each recipe who saved it, from an author setting, blank if unset, shown only when a project holds more than one; and the owner asked why the header showed an "M" avatar when there is no account management. The setting needs a home the reader can find, and Preferences is where the reader's own choices already live. A menu cannot hold a text field, so the item opens a dialog, as AI provider... does; every other Preferences item still applies at once from the menu.
- **Drawn:** `screens/preferences.html`, state 1 (the item and its line) and state 2 (the dialog); the right column's header row now holds only the zoom menu, as in `screens/navigation.html`.
- **Open:** the owner's feedback file calls it "the project's author setting", while the decision recorded above places it in Preferences, per reader and per browser. A per-project author would make two colleagues editing one file on one machine distinguishable but would travel with the file; the per-reader name does not. The screen draws the per-reader version.

## Inspector: every attribute says where its value came from

- **Document and section:** `interface-specification.md` 2.2 (Row roles, DataRow) and 4.1 (One node, Several elements, the notes on the cells); `content-design.md`, the rule "Every number names what it counts and its scope".
- **Old text:** a DataRow is a name, a value and, for a computed measure, its rank; nothing says where a value came from.
- **New text:** "Every attribute row carries its provenance as a second line at the left, beside the rank at the right: `from <file>` for a column of a loaded file, `counted by graphty` for a count the element keeps live (degree), `counted inside the filter` when a filter step is on, and the column's own source note where the file or the load supplied one (`riskScore`: 'from accounts-2026-03.csv, not computed by graphty: the bank's own score, 0 to 100'). A long text value (an alert rule) wraps on its own line under the name and is never truncated. Provenance is read from graphty-element (each attribute's source, the `attributes[].source` a load records), never composed by the app."
- **Why:** round 3, the flagged-account finding: "riskScore 62 -- scale of what? Who computed it?" (the fraud investigator), and no account said why it was alerted. The owner's decision generalises the fix to provenance on every attribute rather than an Alert section only one persona needs: the alert's rule and time are the file's own columns (`alertRule`, `alertTime`) and read as such. Drawn in `screens/inspector.html`, the flagged-account state. Element need: an attribute's source is kept on load and readable per attribute.

## Inspector: computed values sit in Results, per run; Attributes holds only the data's own columns

- **Document and section:** `interface-specification.md` 4.1, the sections table (a Results column for One node, Several elements, Set, Path) and the cap notes in 4.1a.
- **Old text:** a node's betweenness and pagerank are Attributes rows with their rank; Attributes is capped at 4 with the rows a style layer reads first.
- **New text:** "With a selection, a Results section follows Attributes: one row per run, newest first, giving the selection's value and its rank among the run's scope ('0.1139, #2 of 300'); the header names the scope ('Results full graph'). For several elements a row gives the shared value or the range; for a set, one row opens the table with a value per member. A row opens that result's inspector; hovered, it offers Show as style layer. A run whose scope no longer matches the chip carries 'Out of date . Re-run'. Attributes holds only the file's columns and the element's live counts, each with its provenance."
- **Why:** after round 3 a result is a property of the graph it ran on and lives in the inspector (owner review, item 4); mixing a file's columns with graphty's runs in one list is what left readers unable to tell who computed a number. Keeping ranks beside each run keeps what the first two studies showed works: "metrics with rank" on the first screen.

## Inspector: Appearance is the style stack, highlighted

- **Document and section:** `interface-specification.md` 3.1 (Appearance: which rows draw on which kind), 4.1 (the Appearance column: "style rows", "Selection colors", "own B, then routed", "Create set to style", "Create path to style") and 4.1a (the Appearance cap).
- **Old text:** one node shows one bound row per written channel; several elements show Selection colors; a kept set or path shows its own row per channel with "+", then routed rows; an offered group or path shows the one control Create set to style or Create path to style.
- **New text:** "For every kind, Appearance is the whole style stack in its order, captioned 'top wins', with a drag handle per row. A layer that paints the selection is highlighted and marked with the property it wins there ('color', 'size', 'shape'); a layer that paints nothing selected stays in the list, unmarked. '+' in the header adds a layer scoped to the selection. An offered group or path has no '+' and leads with its keep control instead: Keep as set, Keep path. With nothing selected the same list is the Style stack section, each layer's legend nested under it, and the Look row under the list with a visible label."
- **Why:** the owner's review moved styles out of the left panel; one list in both states means a click on the canvas never unmounts a drag, and highlighting rather than filtering keeps precedence readable (framework-changes, "Interface specification: the rail, the header and the inspector's sections"). The Selection colors form hid which layer won a property; the stack names it.

## Inspector: the keep verbs read Keep path and Keep as set

- **Document and section:** `interface-specification.md` 4.0 (the offered state) and 4.2 (the Verbs column of "Set, offered (a group)" and "Path, offered (a found path)").
- **Old text:** "its keep verb (Create set or Create path) takes the first slot ... the one control Create set to style or Create path to style".
- **New text:** "its keep verb, **Keep as set** or **Keep path**, takes the first slot, and the same words are its Appearance control." The kept object's own verbs (Create set on a selection, Create path in a selection's overflow) are unchanged.
- **Why:** content design after round 3 replaces "Create path to style" with "Keep path"; one command then had two names on one screen (Create path on the first line, Keep path in Appearance). "Keep" says what the offered state needs -- it is gone at the next run unless kept -- and "Keep as set" follows it for groups. Rename only; the published element call (`session.sets.createPath`) is unchanged. Note: `flows/sets-and-paths.html` still says "Create path" and should follow if this is accepted.

## Inspector: a result is its own inspector kind -- what it shows

- **Document and section:** `interface-specification.md` 4.0 (a Result row in the kinds table) and 4.1 (its sections).
- **Old text:** "A definition (a result, style layer, filter step or saved view) is edited in its editor popover, never inspected here."
- **New text:** "A result opened from a Results row is inspected here. First line: the method's name over the kind word Result; Re-run and Show in table as ActionIcons; Compare with... and Show as style layer as labeled secondary Buttons on a third line. A state line under the type row (finished and current, running, failed, out of date, each with its reason). Sections: Run (scope; the weight in its three-state words and one line on what the weight did; the method's options), Values (the distribution on the scale its automatic layer uses, the median, the count at zero), Highest (the top three with ranks, each selecting its element; the rest in the table), Runs, Notes. The canvas selection is untouched: Esc, or a click on empty canvas, returns the inspector to it." The count of kinds in 4.0 becomes seven, and the tree test scores a ninth branch, Result.
- **Why:** the owner's review (item 4) and the navigation model: a result is read where the selection is read. Drawn in `screens/inspector.html`, the Betweenness state.

## Inspector: Paths between... arms the Path tool; a found path reads how it was found

- **Document and section:** `interface-specification.md` 4.2 (two nodes) and 4.1 (Path, offered); `interface-templates.md` 14 (the Path tool's bar).
- **Old text:** (the inspector mock) Paths between... opens the path run's option form beside the inspector; the found path's sibling stepper sits on line 2 and its only property row is Created from.
- **New text:** "Paths between..., on exactly two nodes, arms the Path tool with From and To filled in selection order, in the tool's own bar (From, To, Run; Scope and Weight under them). Path to..., on one node, arms the same bar with To waiting for a pick. A found path's first line reads 'Found path (unweighted)' when no weight was used, then its hops; Created from holds Query, Scope, Weight in its three-state words, one line on what the weight did ('Paths ignore confidence: hops were counted.'), and Ties ('1 of 12 as short') with the sibling stepper; then Endpoints with start and end badges; then Members in walk order."
- **Why:** the inspector's path states drew a different form and a different result than `screens/sets-and-paths.html`, so one search looked two ways (round 3, owner-relayed decision). One bar and one found-path layout everywhere.

## Undo and the other ways back: the undo line stays until the next change, and Undos in a row name every step

- **Document and section:** `interaction-patterns.md` 3.4 (the notice) and 3.5, level 4 (notice timing); `message-catalog.md`, the `graphty.undo.done` and `graphty.redo.done` row. Amends "Filter steps and undo: the undo line's one action, and where Show in steps puts focus" and "Undo and the other ways back: where Show in steps puts focus", above.
- **Old text:** "A line with an action stays about 6 seconds or until the next action" and "when Undo history reverses several at once it names the oldest and counts the rest ('Undone: Filter to degree >= 5 and 1 newer')"; Show in steps puts focus "on the row of the step the line named".
- **New text:** "The undo line for a filter step has no timeout. It stays until the next change -- a tick, a delete, any other undoable command, a selection change, or its own Show in steps -- and a camera move, a hover, or opening a menu or panel does not end it. Undos in a row add to the same line rather than replacing it, newest first: 'Undone: Filter out group 8 and Filter to degree >= 5' (three or more: 'Undone: A, B and C'). Undo history reversing several at once names them the same way. A Redo starts a new line ('Redone: {name}'), and Redos in a row add to it likewise. Show in steps opens the steps list with focus on the first step the line names (the newest one undone) and marks every row it names until the list closes. The notice is compact-mantine's Notification with autoClose off."
- **Why:** round-3 finding 20 (7 sessions): the line vanished after about 6 seconds, and two quick undos replaced the first message unread, so the participant never saw that the first press had taken the good step. Naming both steps puts the loss in words at the moment it happens; keeping the line until the next change removes the race with reading speed. Focus on the newest step undone is where the reflex press does its damage, so one Space ticks the good step back (47 of 77 nodes, 2 of 3 steps, in screens/undo.html state 3). The line still never takes focus and is still announced politely. The departure from the 3 s / 6 s timing of 3.5 level 4 is limited to this one line: it is status the analyst may need to act on, the WCAG 2.2.1 case for no time limit. Drawn and wired in screens/undo.html (states 2, 2b and 3). Two-way door, decided on the owner's behalf with undo version B.

## Undo and the other ways back: the steps list is one component everywhere

- **Document and section:** `interface-templates.md` 7 (the filter chip and its steps); `interface-specification.md` 7.2 (Tree rows, treegrid variant).
- **Old text:** (silent on whether every place that shows filter steps draws the same row)
- **New text:** "Every place that shows the filter steps draws the same row: the checkbox in the leading slot; 'Filter to' or 'Filter out' and the rule; the row menu on hover; under it 'took out N &middot; M left' (or 'off &middot; takes nothing out'); and, for a step that counts connections on a graph earlier steps changed, one secondary line saying what it keeps ('keeps only nodes with at least 5 neighbors among the 60 it reads'). The row menu holds Edit rule, Turn off or on, Move up, Move down, Create rule set from step and Delete step, in that order, wherever the list opens."
- **Why:** round-3 finding 21 (11 sessions): the undo mock's list lacked the plain line the filter chip mock had, and its row menu did nothing, so readers picked the wrong step by the biggest count instead of by meaning. screens/undo.html now uses screens/filter-chip.html's row markup and styles unchanged, with a working row menu (Turn off or on, and Delete step, which is one undo entry). Two-way door.

## Comparing two rankings after round 3: sides named, overlap before Spearman, Spearman without the shared bottom tie

- **Document and section:** `interface-templates.md` 18, Regions and rows (as amended in "Comparing two rankings keeps one canvas; the split canvas is for two drawings"); `content-design.md` 4, the Legend note and State line; `message-catalog.md`, the comparison rows; `glossary.md`, Spearman. Amends "Comparing two rankings: how the Scatter view draws ranks, ties and the top corner" (axis titles, the corner length, the headline) and supersedes this file's use of side letters everywhere in the comparison.
- **Old text:** template 18 as amended: "one line per side (its letter, its result, and its state line with Details), Agreement, Not matched when anything is, and the difference list"; axis titles "Rank on A: {result}, 1 to {N}"; the corner "shaded to the length of each result's own Top nodes list ... with no control"; Agreement "the sentence first, Spearman under it" over all matched elements; the difference list's switch "Higher on B / Higher on A" with columns "A, B, gap".
- **New text:** "A comparison never names its sides by letter. Each side is its result's name ('PageRank', 'Betweenness'; 'PageRank on March data' for two data versions), and every place that refers to a side uses that name: the state lines, the axis titles ('Rank on PageRank, 1 (top) to 3,093'), the key ('ranked higher by betweenness'), the difference list's switch ('Ranked higher by' Betweenness | PageRank) and its columns. The difference list's reader line says 'Rank 1 is the top.' Agreement sits beside the scatter in the dock, in this order: (1) the scatter; (2) the overlap of the two top lists in words, '{k in both} of the top {N} in both', with the sentence whose verb follows the share ('The rankings disagree at the top.'), the Top control (5, 10, 20, 50, 100; default 50), and the overlap at every other length; (3) one Spearman line. When the two sides share a tie block at their lowest value, the line reads 'Spearman {rho without}, leaving out the {n} accounts tied at the bottom of both ({rho with} with them)', two decimals each; otherwise 'Spearman {rho} over {n} accounts'. Its info button opens a popover that says what the number measures, names the tie convention ('Ties take the average of their ranks') and says why the shared bottom tie is left out. The right column keeps the sides with their state lines and Details, the fixed action row (Compare with...), Not matched, and the difference list."
- **Why:** round-3 finding 14 (6 sessions, 5 participants): 1,153 accounts tied at the bottom of both sides lifted Spearman to 0.781 under a sentence saying the rankings disagree, the info icon was dead, and four expert readers would not cite the number; finding 33 (7 sessions): A and B had to be decoded, "higher" was read both ways, and the scatter sat below the fold. On the April transfers, Spearman over the 1,940 accounts outside the shared tie is 0.40, against 0.78 with them (`kit/fixtures.json`, `scenarios.comparison.metrics.spearmanOffBottom`); for March against April it is 0.76 against 0.88, leaving out 900. The round-3 decision's worked example ("41 of the top 50 in both", "Spearman 0.52") was illustrative; the mock prints the fixtures' numbers.
- **Wording decided, and why it departs from the decision's example:** the example says "the accounts at 0 on both". PageRank never reaches 0 (the lowest April value is 1.63e-4, the share every account gets by damping), so "at 0 on both" is false for any comparison with PageRank. The line says "tied at the bottom of both", which is true for every pair of measures. If the owner prefers the value named, the line can read "tied at the lowest value of both".
- **Also decided (reversible):** the measure-against-measure difference list drops its gap column. Two named rank columns ('PageRank', 'Betweenness') and a gap do not fit the 241 px column at 11 px, and the gap is the difference of two numbers the row already shows. Two data versions keep 'moved', whose month columns are short.
- **Element need:** the comparison readings (`element-needs.md`, "Comparison statistics and null models") gain: the top-k overlap at each k of the Top control; Spearman over all matched elements and over the elements outside the tie block both sides share at their lowest value, with that block's size; and each run's record, readable by the app for Details. Tau-b is no longer shown.
- **Message keys (published; owner's wording call):** `graphty.compare.overlap` "{k} of the top {n} in both"; `graphty.compare.spearman.withoutBottomTie` "Spearman {rho}, leaving out the {n} {kind} tied at the bottom of both ({rhoAll} with them)"; `graphty.compare.spearman` "Spearman {rho} over {n} {kind}"; `graphty.compare.rankedHigherBy` "Ranked higher by". Drawn in screens/comparison.html, states 1 and 2, and the strips "About Spearman" and "Details".

## Comparing a group with the rest: entered from a row, one statistic in both places

- **Document and section:** `interface-templates.md` 16 (the result's items tab in the dock: a communities table) and 18; `interaction-pattern-entries.md` 4.9, Entry; `information-architecture.md`, where Compare is offered.
- **Old text:** (silent on how a group comparison is started from the table, and on which statistic a group's table row shows). The round-3 mocks reached it from a canvas pick or a legend row, and showed a mean in the table (+0.02 against +0.09) and a median in the comparison (-0.02 against 0.05).
- **New text:** "A group comparison starts from the group's row: in the result's communities table, the row menu (or a right-click) offers 'Compare {group} with the rest'; the same command sits on the group's row in the result. It is never offered from Appearance, which only paints. The table's per-group column and the comparison's section use one statistic and one label: 'Median {column}' ('Median PageRank'), so a row and its comparison always print the same number with the same sign. The comparison opens with 'Descriptive only; no statistical test.', each side's median with its count, and the middle half (quartiles) of each."
- **Why:** round-3 finding 16 (5 sessions, 4 participants): Compare with... read as 'with another run', table rows had no affordance, and the table's mean and the comparison's median showed opposite signs, which two biologists said they could quote wrongly. On the April transfers, Community 1 (359 accounts) has median PageRank 1.63e-4 against 1.81e-4 for the other 2,734; more than half of Community 1 sits at the lowest PageRank (`scenarios.comparison.metrics.groupCompare`). Drawn in screens/comparison.html, strip "Getting here from a group".
- **Element need:** per-group median and quartiles of a numeric column, over a grouping result, as one reading the table and the comparison both consume.

## Results in the inspector: what the move leaves the framework to say

These follow from "Rules for growth: only Graph never leaves the rail" and "Interface specification: the rail, the header and the inspector's sections" above, and share their provisional status: if the round-4 tree test returns Results to the rail, these are reversed with it. Drawn in `screens/results-panel.html`.

### The catalog lives in the main menu and in Quick actions

- **Document and section:** `interface-templates.md` 3, Results panel (the Catalog); `information-architecture.md` 3, the Catalog row of the collections table.
- **Old text:** "the Catalog, one flat list of `ActionRow`s with (i), a precondition mark and a cost word ..., narrowed by the search field and the Source and Family filters at every count, as Figma's Tools panel is"; the Catalog's place is "Results panel, lower half".
- **New text:** "The Catalog has two forms and no panel. The main menu's Algorithms opens it as a submenu: the element's families as labels, names alphabetical inside each, each entry with its precondition mark, its variant word, the argument it needs ('two nodes...') or its cost word in the item's right slot, and a disabled entry with its reason. Quick actions (Ctrl+K) is its searchable form, with the same marks after each entry. Choosing an entry creates the result, selects it in the inspector and runs it (or refuses it, with routes). The Family filter is the submenu's labels; a Source facet, when a recipe or plugin registers algorithms, is a group heading in both forms."
- **Why:** the owner's decision that runs start from Quick actions, Ctrl+K and the main menu's catalog, with the Results rail panel retired. A menu has no search field, so search moves wholly to Quick actions, which already lists catalog entries after commands.

### A selected result: its body order, and options edited in a popover

- **Document and section:** `interface-templates.md` 8, Inspector, and 10, Editor popovers (Result); `interface-specification.md` 4.0, "A result is its own inspector kind".
- **Old text:** "its state line, the weight used, its runs, Compare with..., Show as style layer" (no order for the readings or the options; template 8 says "A definition is edited in its popover, never inspected here").
- **New text:** "A selected result's inspector reads, top to bottom: the type row (with a back button naming the previous node selection when there was one); the state line (scope with counts, exactness, direction, engine, Details) with the result's one run command at its head (Run, Cancel, Re-run, Re-run on CPU, or the chosen route's verb) and the weight line under it; the readings, Top nodes and its how-sure sentence first, then the distribution or the groups; Options, read-only, whose sliders button opens the result's editor popover to the left of the inspector (the Run line, the fields, the held-edit box); Runs, each with its options or duration, the run whose values are shown marked 'shown'; Compare with...; Appearance (Show as style layer, or the layer with its eye); Notes; Used by."
- **Why:** round 3 found the near-tie sentence below the fold and readers taking 'middle' as the answer, so the readings come first; keeping option edits in a popover keeps template 8's rule (a definition is edited in its popover) and keeps the Run line beside the fields it governs. The run command beside the state line leaves the type row room for the result's name: "Betweenness (sampled)" and "Closeness (WF-corrected)" do not fit beside a kind word and a button in 240.

### Back to the node: a visible way out of a result

- **Document and section:** `interface-specification.md` 4.0 ("Esc, or a click on empty canvas, returns from a result to the previous node selection").
- **Old text:** (only Esc and an empty-canvas click)
- **New text:** append: "When a result was opened from a node's Results section, its type row starts with a back button named 'Back to {node} (Esc)'. It does what Esc does."
- **Why:** Esc and an empty-canvas click are invisible, and the round-4 tree test measures whether readers can find a result and get back. Two-way door.

### A node's Results section

- **Document and section:** `interface-specification.md` 4.0, "Inspector, something selected" ("a Results section gives the selection's value and rank per run").
- **Old text:** (no row shape)
- **New text:** append: "One two-line row per run that has something to say about the node: the result's name with any state mark (out of date, failed) on the first line; on the second, what the result holds for this node in its own terms -- a measure's value and rank 'of N' (a sampled run's rank range), a partition's group and its size, a path's position on it ('start, of 3 hops'). A run with nothing for the node is left out. A row opens the result; Esc returns to the node. The rows follow the Results order (standing partitions, then newest first)."
- **Why:** the owner's decision names value and rank; partitions and paths have neither, and a node's value shown without its rank lost the one confidence cue every round-1 participant trusted ("of 300").

### No rail badge for results; when the running notice shows

- **Document and section:** `state-matrix.md` 3, Rail button (the count of pinned results, proposed there); `interaction-patterns.md` 3.5 (the running notice "only when the row is out of sight").
- **Old text:** the Results rail button carries the count of pinned results and a spinner while a run is in progress; the running notice shows when the Results panel is closed.
- **New text:** withdraw the Results rail badge and spinner. "The count of results that need action is the needs-action strip's, at the head of the graph inspector's Results section; a node's rows carry their own marks. The running notice shows while the running row is out of view: when something else is selected, or the Results section is scrolled away."
- **Why:** Results has no rail place. A badge on Graph would say something about the whole collection that is really about one graph's results.

### The weight line's first state, in the same shape as the second (one-way door, for the owner)

- **Document and section:** `message-catalog.md`, the proposed keys `graphty.weight.notUsedYet` and `graphty.weight.used` (entry "Message catalog: new published keys" above).
- **Old text (proposed):** `graphty.weight.notUsedYet` "{column} not used yet"; `graphty.weight.used` "Weight: {column}, used as {meaning}. Change...".
- **New text (proposed, not decided):** `graphty.weight.notUsedYet` "Weight: {column}, not used yet. Change..." and `graphty.weight.noneAvailable` "Weight: no numeric edge column", so the three states read as one line with one shape wherever a result states its weight.
- **Why:** in a result's state line the bare "{column} not used yet" did not say it was about the weight, and round 3's finding was precisely that five spellings of one fact broke trust. The keys are published by graphty-element, so the wording is the owner's call.

### The near-tie sentence states its line

- **Document and section:** this file, the near-tie proposal after round 2 ("An exact run states near-ties in words").
- **Old text:** "Ranks 3 and 4 differ by less than 0.2%; treat them as tied." and, with none, "No near-ties in the top 5: the closest, ranks 3 and 4, differ by 1.2%."
- **New text:** "Ranks 3 and 4 differ by less than 0.2%, under the {line} tie line; treat them as tied." With none: "Every step in the top 5 is over the {line} tie line; the smallest, ranks 3 and 4, is 1.2%." The line is the element's published rule; the mock draws 1% and the value remains the owner's decision.
- **Why:** round 3 (`study/round-3/insights.md`, finding 13): the threshold was not stated, and "No near-ties" read as a contradiction beside 0.0695 and 0.0687. The content-design words list already removes "no near-ties".

### Paint by default, option B restated

- **Document and section:** this file, "Result editor, FOR DECISION: does a finished run paint the graph by default?"
- **Old text:** "Option B: It is added off: the row reads 'not shown' with the eye closed, and the canvas does not change until the analyst turns it on."
- **New text:** "Option B: no layer is added. Appearance offers Show as style layer, which adds the run's layer at the top of the stack; the canvas does not change until then." Option A is unchanged: the layer is added on and paints.
- **Why:** the new result inspector names the verb Show as style layer. An off layer that nobody asked for fills the Style stack with rows the reader did not choose, which is the harm option B exists to prevent. The decision itself stays the owner's.

## Where your data goes becomes the home of Sent and saved

- **Document and section:** the "Where your data goes" page (proposed above, "A forwardable page: 'Where your data goes'"); `interface-templates.md` 20 (AI provider); the privacy line and the Data panel proposals above; `element-needs.md`, the assistant's provider settings row.
- **Old text:** (the page proposal) "The item, the start screen's 'Where your data goes' link and the file popover's 'Where your data goes...' all open one static page"; the page's paragraph "The app says when something leaves" named the location line's wordings ("Sends node names and statistics to {host} when you ask", "Sent to {host} at {time}: ...") and Version history's operation log as the record; the Assistant key row read "If you set one, it is kept in this browser and sent only to the provider it belongs to."
- **New text:**
  - With a project open, the page's one home is **Data > Sent and saved**: the privacy line under the project name opens that section, the section lists every send (each row naming its address and time, with See what was sent) and ends in the link "Where your data goes". The start screen link and Help > Where your data goes stay. The file popover's link is withdrawn (the file chip opens Data; see the Data panel proposal). Export log lives in the Sent and saved section head.
  - The privacy line gains two wordings: after a data-source query, "Sent to {host}: {n} query. Nothing else."; after more than one kind of send, "Sent: {n} query to {host}, {m} questions to the Assistant. Nothing else."
  - The page's Assistant key row adds: "It stays until you forget it: **Forget key**, in Preferences > AI provider..., removes it at once, and clearing this site's data removes it too." The AI provider dialog gains a **Forget key** button (secondary, left of Cancel, shown once a key is saved).
  - The page's In short box adds: "No password or key ever appears in the list of what was sent, in an exported copy of that list, or in a project file." The Sent and saved section repeats it: "No password or key is shown here or in the exported log."
- **Why:** round 3 (`study/round-3/insights.md`, finding 25, "The data page leaves open exactly what IT asks first", severity 3, 9 sessions): the Assistant key's storage was vague and nothing said that logs and project files never carry the password; finding 26: the privacy line was not clickable. Pointing the privacy line, the send record and the page at one place stops three places from describing sends three ways.
- **Element need:** graphty-element's Assistant already stores the key (`src/ai/keys/ApiKeyManager.ts`); it must expose forget-the-key and report each send (host, time, what it carried) to the operation log, and guarantee that no credential enters that log, its export or the project file. The app only shows these.
- **Open:** how long a remembered key is kept is today "until forgotten"; an expiry (for example 30 days) is the owner's choice. The page's organization items (hosting, telemetry, self-hosting, an organization-wide Assistant switch-off, a contact) stay open owner decisions.
- **Drawn:** screens/data-location.html, sections 1 to 3.

## Past the drawing limit: Keep top rows, a plain step on the table's order

- **Document and section:** `state-matrix.md` 4.2, "Routes that need no prior knowledge"; `interface-templates.md` 7 (the filter steps popover) and 16 (the table dock's tab row); `element-needs.md`, "Named filter steps offered past the drawing limit"; `message-catalog.md`, a new step name.
- **Old text:** 4.2 (as amended above): the offered steps are "Top N by {what the table is sorted by}, with neighbors" and "Around a node...". 7: "Filter to is the popover's only commit." 16: the dock's tab row holds the tabs, Search and the table menu.
- **New text:** 4.2: "The offered steps are 'Keep top rows by {the table's sort}...' and 'Neighbors of a node...'. Keep top rows keeps the table's first N rows in the order the table is sorted by (after a run, that run's result) and adds nothing. N is typed by the reader; the step carries no count in the list until N is set. Its editor shows the order as the sort column and direction (changing either re-sorts the table), a line saying where the cut falls ('Row 200 has citationsReceived 358; 1 more patent also has 358 and is left out'), and the count line ('200 nodes, 288 edges, will draw'). The step's name is 'Keep top {N} by {column}'. Neighbors of what it keeps is a separate step, offered after it as 'Add their neighbors...' under 'Suggested next'." 7: "Filter to is the commit of a rule. The Keep top rows editor's commit names what it keeps, 'Keep these {N} rows'; it commits one ordinary Filter to step." 16: "The dock's tab row carries a labelled 'Keep top rows...' button; it opens the chip's popover at the Keep top rows editor, so there is still one popover with one anchor."
- **Why:** round 3, finding 5, severity 4: both sessions of "top 200 by betweenness past the drawing limit" failed. "Top 200 is a table operation: sort, head(200). Draw them is a separate thing. Here the only offered top N is glued to 'and draw their neighborhoods'." (ML engineer); "neighbors are baked into its title and there is no visible way to turn them off, and graphty picks N (3)" (knowledge engineer). The tie line answers "the top 200" being arbitrary at the boundary. This follows the split proposed above ("'Top N, with neighbors' splits into 'Keep top N' and 'Add their neighbors'") and its rename of Around a node to Neighbors. graphty-element owns the step (it keeps rows in an order it already pages through), so the step name is published and its wording is the owner's call; the button and its placement are two-way doors. To rerun on this mock: the top-200 task. Drawn in screens/past-drawing-limit.html, states 2, 2b, 2c and 5.
- **Not yet backed by graphty-element:** a filter step that keeps the first N rows of a sort order, and the tie count at the cut. The 200 patents, their 288 citations and the tie at 358 are modeled in `kit/fixtures.json` (`scenarios.pastLimitTop200`, from `screens/past-drawing-limit-numbers.mjs`); the drug patents among them agree with the 612 the rule keeps.

## Filter chip after round 3: counts name what they count

- **Document and section:** `content-design.md` 5 (Counts); `interface-templates.md` 7 (the filter chip and its steps) and 8 (Statistics); `message-catalog.md`, the `graphty.filter.chip` row. Amends "Filter chip: a number that follows the chip carries its mark" and "Undo and the other ways back: the steps list is one component everywhere", above.
- **Old text:** a number that follows the chip carries the chip's funnel mark while the chip reads anything but Full graph; Statistics says its scope once, first ("Filtered graph: 60 of 77 nodes"); the table's degree column is headed "degree" with "degree on: full graph" beside it; a step row reads "took out N &middot; M left"; any step that is on puts the screen in filtered mode; (silent on counts that measure different things, and on why a count changed).
- **New text:**
  1. "While the filter steps leave fewer nodes than the full graph, each statistic is a sentence that names its graph: 'Density 0.131, of the filtered graph (47 of 77 characters)'. The node and edge counts read '47 of 77, in the filtered graph'. Unfiltered, Statistics is plain name and value. The funnel moves to the Statistics header; the words replace it on each row."
  2. "Filtered mode follows what is left, not how many steps are on. A step that removes nothing reads 'kept all 77' (a component step on a graph in one piece: 'found 1 piece &middot; kept all 77'); a step with nothing left to read says so. When the steps on together remove nothing, the chip reads 'Full graph &middot; 1 step, kept all', no number takes the mark, and the table reads 'Full graph: all 77 characters; the step on keeps all'."
  3. "A count the last change moved says why, beside it, in body text: 'up from 1 when \"Filter to degree >= 5\" was turned off'. It applies to components, largest component and isolated nodes; it stays until the next change, and Undo clears it (the undo line names what was undone)."
  4. "Every degree header names its graph: 'Degree (filtered)' and 'Degree (full graph)'. Every cell is filled, equal or not. Unfiltered, the one column still reads 'Degree (full graph)'."
  5. "An edge count names what it counts (character pairs, interactions, transfers). Where parallel edges make the edge count and the pair count differ, the pair count sits beside it and each measure says which it counts: 'Evidence rows 2,298 (1,262 distinct pairs)', 'Density 0.0285, of the 1,262 distinct pairs', 'Average degree 15.42, counting every evidence row'. Where they are equal the clause is left out."
- **Why:** round-3 findings 22 (13 sessions: which graph a degree counts was not said, and blank cells read as missing), 30 (4 sessions: leftover steps made "largest component 27" look like the answer, and a Largest component step that removed nothing switched everything to filtered mode), 31 (6 sessions: components jumped from 1 to 3 with no explanation, and two participants thought they had broken the graph) and 32 (9 sessions: 2,298 edges beside density over 1,262 pairs). Drawn and wired in screens/filter-chip.html (states One step off, Proteins: one module, A step that keeps all, and "Counts that measure different things" below the screen). The per-step counts, the components and the cause of a change are graphty-element's to report (its filter pipeline already knows each step's input and output); the app only words them. Two-way door.
- **Open:** the decision's example "9,380 transfers (8,102 distinct pairs)" has no source in the kit's fixtures: the March transfers never repeat a pair (9,113 transfers, no parallel edges), so the filter chip mock draws the same pattern with the March numbers, 'Transfers 9,113 (9,113 distinct pairs)' on the full graph and '2,065 of 9,113 (2,065 distinct pairs)' after the date step, and the protein evidence file shows the case where pairs repeat ('Evidence rows 2,298 (1,262 distinct pairs)').

## Export: one dialog, three ways in (replaces the table's own CSV dialog)

- **Document and section:** `interface-templates.md` 20 (the Export... row) and 16 (the dock's tab row); `output-homes.md`, the homes table; `interaction-pattern-entries.md` 6.11, **Trigger**. Supersedes the entries "Export table as CSV...: the table's one exit, and Export files... no longer offers tables" and "Export: tables leave through the CSV dialog, reached from Export too".
- **Old text:** 20: "Export... | Export dialog | ... **table** (the dock's tabs) ..."; 16: the tab row's "Export table as CSV..." opening its own CSV dialog; 6.11 Trigger: "Export... and every 'Export as <format>' command."
- **New text:** 6.11 Trigger: "One Export dialog writes every file. It opens from Export... in the project-name menu, from the Export... button in the Data panel's header, from Export table... in the table dock, and from Ctrl+Shift+E anywhere in the app frame. Export table... opens it with Table (.csv) checked and selected, set to the dock's current tab and the table's scope. No route has a dialog of its own, and focus returns to the control that opened it." 16: "Export table..., which opens the Export dialog (section 20) with Table chosen." 20, the table item: "**table**: the tab (Nodes or Edges, a `SegmentedControl`), the rows stated first ('14 of 3,000 rows, filtered') with the filter step by name, order and column count; its methods file is always written beside it."
- **Why:** owner review 1 and the owner's direction on data management; round 3, finding 18 (severity 3): two exports of the same figure produced different files, and the table's methods file was written on one route only (csv-to-reviewer). The cause was two dialogs, not two routes. Drawn in screens/export-dialog.html, states 1, 1b and 4.

## Export: each output row is named with its file type; no row for a format that does not exist

- **Document and section:** `interface-templates.md` 20, the Export... row.
- **Old text:** "**figure** (the current view and each saved view, with the Export section's setting row and Copy as PNG (3); vector formats blocked, `interface-specification.md` 7.4) ... **findings report** (notes with their quotes and citations; blocked, `interface-specification.md` 7.4)"
- **New text:** "One `ToggleRow` per output, named with its file type: **Figure (.svg)** (vector, with real text), **Image (.png)**, **Table (.csv)**, **Findings report (.html)** (one self-contained file that opens offline and prints to PDF), **Graph file** (a graph-io format), **Recipe**, **Project file**. The selected row's settings open under it. A format graphty-element cannot yet write has no row: there is no disabled PDF row, and no 'recommended' or 'proposed' label on any row."
- **Why:** the owner's decisions of 2026-09-28 (the findings report is one HTML file; SVG figure export now, PDF later) and the owner's objection to being asked again. A disabled row for a format that does not exist is a promise and a dead Tab stop, the same reason the scripting entry is not drawn. Drawn in screens/export-dialog.html, all dialog states.

## Export: every file that carries data is written with its methods file (no methods checkbox)

- **Document and section:** `files-and-recipes.md` 3 (outputs carry a methods text); `interface-templates.md` 20.
- **Old text:** (the dialog had a "One methods file for this export" checkbox, on by default)
- **New text:** "Every figure, image and table is written with a plain-text methods file beside it, named `{file}-methods.txt`: the data file and its counts, the scope and its filter steps, the load choices, how each number was computed (exact or sampled, normalized or not, on which graph), the weight answer, the look, the labels hidden to avoid overlap, and the graphty-element version. A findings report carries its methods inside. There is no option to leave it out; the files list names it before Export."
- **Why:** round 3, finding 12 (the settings a number depends on are not where the number is read) and finding 18 (the methods file on one route only). A file that can leave without its methods is the file a reviewer receives. Drawn in screens/export-dialog.html, states 2 to 4.

## Export: labels by the layer's value, and the hidden ones named

- **Document and section:** `canvas-drawing.md` 13 (Exported figures); `interface-specification.md` 3 (the figure's settings).
- **Old text:** (silent; the export used the canvas's label budget, the top 12 by degree)
- **New text:** "A figure's Labels setting is 'Top N by this layer's value' (N typed; for a diverging layer the value is the distance from the midpoint) or 'Above a threshold'. Labels are culled by collision at the figure's own size, the larger value keeping its label. When any are culled, the setting says 'N labels hidden to avoid overlap: show list', and the list names each with its value; the methods file names them too."
- **Why:** round 3, finding 28 (severity 3): labels were the hubs, with no option to label by the size of the change, and two were hidden without saying which. Gene names missing from the file ended the signed-gray task. Drawn in screens/export-dialog.html, states 2 and 3 (MRE11 and RPL17 hidden).

## Export: figure text is 8 pt at print size, width in mm, white by default

- **Document and section:** `canvas-drawing.md` 13, "Background" and "Scale".
- **Old text:** "Background: the view's `GraphStyle.background`, otherwise transparent ... **Scale**: every CSS px width ... scales with the export's pixel ratio"
- **New text:** "Background: White by default; also the canvas color and Transparent. A figure (.svg) is sized in millimetres (174 mm, two columns, by default; 85 mm, one column; 254 mm, a slide), and every piece of its text -- labels, legend and footer -- is 8 pt at that physical size. An image (.png) takes the same layout at a stated dpi. The preview shows the figure at print size (100% on a 96 dpi screen) and says so."
- **Why:** round 3, finding 28: background defaulted to transparent and PNG in pixels was the only format; readers could not tell whether the legend would be legible in print. 8 pt is the common journal minimum. Drawn in screens/export-dialog.html, state 2 (174 by 76 mm, shown at 100%).

## Export: the legend's footer carries normalization and the weight answer

- **Document and section:** `canvas-drawing.md` 13 ("The legend is drawn in, in full"); `options-and-encodings.md` 6.
- **Old text:** "The legend is drawn in, in full, from section 8's description."
- **New text:** add: "Under the legend, a footer states, for each measure the figure encodes, how it was computed (exact or sampled, normalized or not, on the full or the filtered graph), the weight answer in the element's words ('Weight: confidence not used yet'; 'Weight: confidence, used as similarity'), and the look."
- **Why:** round 3, finding 12: normalization was only behind Details, and a figure that leaves the app leaves Details behind. Uses the proposed weight messages ("Message catalog: new published keys"). Drawn in screens/export-dialog.html, states 2 and 3.

## Export: the Print look previews the file and its gray print side by side

- **Document and section:** `canvas-drawing.md` 13; the entry "Export: one Look drives the preview and the file (replaces View as)".
- **Old text:** "one Look select (Screen or Print) drives both the preview and what is written"
- **New text:** "Look is a labelled `SegmentedControl`: Screen, Print, High contrast. It drives the preview and the written file together, and the line beside it names the look the file is written with. In the Print look the preview shows two figures at the same scale: the file as written, and the same file as a gray printer renders it. The gray check's verdict sits under them."
- **Why:** round 3, finding 3 (severity 4): the preview stayed in color, and a check that passed "the wrong test" was not believed. Seeing the gray print makes the check visible, not only readable. It does not break "no preview that differs from the file": the left figure is the file, the right is labelled as its gray print. The dialog is the window less 24 each side (1392 at 1440) so both fit at 76% of print size. Drawn in screens/export-dialog.html, state 3.

## Export: the Print look's dead band (one-way door, for the owner)

- **Document and section:** `canvas-drawing.md` 4a, as amended by "Canvas drawing: the Print look carries sign with shape".
- **Old text:** "a circle inside the stated dead band"
- **New text (proposed, not decided):** "The dead band is a property of the diverging layer, published by graphty-element, defaulting to 0.25 in the column's units for a log2 fold change; the legend and the methods file state it ('no change: within 0.25 of 0')."
- **Why:** the mock needs a number to draw (47 of 300 proteins fall inside 0.25 of 0), and where the number lives is published graphty-element API. Drawn in screens/export-dialog.html, state 3.

## Export: an object's own Export section in the inspector is withdrawn

- **Document and section:** `interface-specification.md`, the inspector section table, row Export; withdraws the entry "Export: an object's Export section has Figma's Preview disclosure".
- **Old text:** "Export copies Figma's Export section: header with '+' and a Copy as PNG `TrailingSlot`; one `FieldRow` export setting ..."
- **New text:** "The inspector has no Export section. A selected set or path is exported through the one dialog, whose View setting offers it ('Selection: TP53 and neighbors'). Copy as PNG stays in the canvas context menu."
- **Why:** the owner's "one export dialog with three ways in"; a fourth route with its own settings row is the two-dialog cause of round 3's finding 18 in another place. Reversible if the owner wants Figma's per-object section back. Drawn in screens/export-dialog.html (no Export section in any state).

## Words after round 3: one weight sentence in one shape on every screen (one-way door, for the owner)

- **Document and section:** `glossary.md` 11, Weight roles ("Gloss on screen"); `message-catalog.md`, the proposed keys `graphty.weight.notUsed`, `graphty.weight.notUsedYet`, `graphty.weight.used`, `graphty.weight.noneAvailable`; `interface-specification.md` 4.1 (Statistics, the Weight row) and 4.2 (a result's state line). Settles the conflict between three entries above: "Load step: the weight sentence, the plain wording of pairs and unconnected nodes" ("{column}: numbers, not used", "{column}: used as strength (your answer, {date})"), "Words: one wording for a weight's meaning on every screen, and its short form on a result" ("Weight: {column}, higher = stronger link") and "The weight line's first state, in the same shape as the second" ("Weight: {column}, not used yet. Change...").
- **Old text:** the three entries above, each drawn on some pages: "confidence: numbers, not used", "used as strength (your answer, Sep 26)", "confidence: not used yet", "Weight: value, higher = longer step", "Weight: confidence, used as similarity", "undirected, no weight", "None declared".
- **New text:** "A numeric edge column's weight state reads, on every screen, in one shape: 'Weight: {column}, not used yet' (unanswered), 'Weight: {column}, used as {similarity | distance | capacity}' (answered; the answer's secondary term, the same word the question prints under each plain answer), 'Weight: {column}, not used' (answered Don't use {column}), and 'Weight: no numeric edge column'. Where the line opens a surface that can change it, it ends in Change.... Under a field or row labeled Weight the label is the prefix ('confidence, not used yet'). Inside the Loaded state line the clause drops 'Weight:' so the line keeps one colon ('Loaded: transfers-2026-03.csv, direction followed, amount not used yet.'). A run that read no weight says 'unweighted' in its state line and name ('Exact. Unweighted, undirected.'; 'Found path (unweighted)'); its Weight field reads 'None for this run'. 'Higher = stronger link', 'numbers, not used', 'used as strength', '(your answer)', 'no weight' and 'None declared' are retired."
- **Why:** round 3, finding 1 (severity 4; 21 sessions, 16 participants): the same edges were described five ways, and the mocks of round 3 still carried three competing sets of words, recorded in three entries of this file. The used form keeps the dominant recorded key and a standard technical term; the plain answer stays in the question, where the reader chooses it, and the two are linked because the question prints the term under each answer. Applied on screens/load-step.html, first-look, run-and-read, results-panel, inspector, data-panel, sets-and-paths, binding-step, option-form-cost, export-dialog, navigation, weight-role-trap, closeness-variant, filter-step-recovery, storyboards/failure-and-recovery.html and flows/sets-and-paths.html. The keys are graphty-element's published messages, so the exact words are the owner's call.

## Words after round 3: a size layer is "Size: {attribute}" everywhere, and a correction

- **Document and section:** `options-and-encodings.md` 6 (legend block titles); `content-design.md` 3 ("Names"); the entries "Color by a value: a size layer is named 'Size: {attribute}'" and "Main frame at rest: the sample's starting look paints one channel", above.
- **Old text:** the one layer was "Degree size" on its row (240 places), "Size by degree" in legends and layer lists, "Size: number of connections (degree)" and "Size: number of connections" as legend titles; the second entry above says "this follows the owner's decision, 'Size: number of connections'".
- **New text:** "A size layer is named 'Size: {attribute}' on its Styles row, its legend block, its editor header, its Quick actions entry and its undo labels: 'Size: degree', 'Size: pagerank', 'Size: |log2FoldChange|'." **Correction:** "Size: number of connections" was a studio decision (study/decision-log.md, "The resting frame"), not the owner's; it is superseded by the round-3 entry. Color layers keep "{attribute} color" until the owner decides whether every layer takes the "{Channel}: {attribute}" form.
- **Why:** round 3, finding 35: one layer with two names, and the fix drawn on one page did not reach the other twenty-four. Applied on every page and generator except the frozen placement-study pages (study/style-stack-arm-a.html and -b.html, a record of what participants saw).

## Words after round 3: "frozen set" and Freeze on every screen

- **Document and section:** `glossary.md` 3 (fixed, rule); `interface-specification.md` 4.2 (the Set row's verbs); `output-homes.md` 3 (command register); the entry "Sets and shortest path: the automatic names of a combined set and a frozen set", above.
- **Old text:** the kind word "fixed" on set rows, "Fixed set" on type rows, the command "Freeze as fixed set" and its undo label "Freeze {set} as fixed set"; a frozen copy's automatic name "28 Sep: {rule set name}".
- **New text:** "On screen the kind `fixed` reads 'frozen' on a row and 'Frozen set' on a type row; the command is 'Freeze', its undo label 'Freeze {set}'. A frozen copy is named with the day first in American order: '{Mon} {day}: {rule set name}' ('Sep 28: High risk and Paid ACC-893168'). The API kind `fixed` is unchanged."
- **Why:** round 3, finding 24: "fixed" read as repaired. The content entry "every number names what it counts" retired "fixed" on screen; this applies it to the 27 pages and generators that still drew it.

## Words after round 3: an offered item is kept with Keep

- **Document and section:** `content-design.md` 3 ("Commands": "Create keeps a set, path or rule set"); `output-homes.md` 3, the command register.
- **Old text:** a found path's type row said "Create path" while its Appearance said "Keep path" (weekly return, sets and paths).
- **New text:** "Create makes a new set or rule set from the selection; Keep keeps an offered item (a found path, a group) as it is: 'Keep path', 'Keep as set'. Undo labels follow: 'Keep path ACC-347291 to ACC-642959'."
- **Why:** one command drew two names on one panel. "Keep path" is the word round 3 chose to replace "Create path to style", and the inspector already proposes "Keep as set" for a community.

## Words after round 3: "Add note..." is the one name for adding a note

- **Document and section:** `output-homes.md` 3.7 (Add note); `interface-templates.md` 4 (Notes panel, empty state).
- **Old text:** "Add note" in menus and buttons, "Add a note" and "Add a note..." on the empty Notes panel and the inspector's Notes row; the empty panel's line "Add a note about the selection."
- **New text:** "The command that opens the Note editor is 'Add note...' in every menu, button and tooltip; its undo label is 'Add note'. The empty Notes panel's line reads 'A note can be about a selection, a set, a result or the whole graph.'"
- **Why:** "..." means more input (content-design.md 3), and the editor asks for it. Round 3, finding 24: "about the selection" read wrong with nothing selected, and the first click landed on the whole graph.

## Words after round 3: dates month first, one timestamp form

- **Document and section:** `content-design.md` 5 (numbers and dates).
- **Old text:** (no rule) the mocks mixed "4 Mar", "Mar 4", "26 Sep 2026", "Mar 8, 2026", "Sep 24 2026, 10:14", and relative times on note rows ("9 days ago").
- **New text:** "Dates are month first: 'Mar 4'; a range 'Mar 4 to 17'; with a year 'Sep 26 2026'; with a time 'Sep 24 2026, 10:14', or 'Mar 7, 13:27' where the year is the data's own. A note row shows its full date and time, never a relative time."
- **Why:** American English is the product's convention (content-design.md 3), and round 3's investigators said a relative time is not a record (finding 24). Applied on the sets-and-paths flow and screen, binding step, recipe apply, recipe travels, filter chip and take a note.

## Visual language after round 3: the smallest product text is 11 px

- **Document and section:** `visual-language.md` A4, Type; compact-mantine `design/figma-spec.md` 2.3 (the type roles), as a note for the library.
- **Old text (A4):** "figma-spec 2.3's roles; emphasis by weight, never size or color; nothing uppercase."
- **New text (A4):** "figma-spec 2.3's roles, except the 9/14 caption: **nothing a reader reads is set below 11 px**. Rail labels, captions over columns, table header summaries, chart axis figures, section family labels and counts in badges use 11/16 in secondary ink (weight 500 for a caption, 450 otherwise). Emphasis is by weight -- 550, never the browser's 700 bold -- never size or color; nothing uppercase. Canvas labels are the element's (12); an exported file's preview keeps the file's print sizes."
- **Evidence:** round 3's finding "Small grey text and unlabelled icons" (`study/round-3/insights.md`, severity 2, about 14 sessions, 8 participants: Dana in 5 sessions, Mara, Marcus, Sarah, Chris, Priya, Chen, Nadia), whose recommendation is to measure against size and contrast rules. Measured on every page in the participant view, light and dark: every secondary and tertiary text already reaches 4.5:1 (the AA token block applies everywhere), so contrast is not the cause; size is. 9 px text appeared on 82 pages -- the rail's labels on every frame, table header summaries on 38, and axis figures, the rank under a value, the group of a Find result and the "Loaded:" captions -- and each is a fact participants were asked to read. The ask for 12 px is not taken: 11 px is the product's body size, and one step between body and caption keeps the scale.
- **Built:** `kit/kit.css` has two tokens, `--k-caption-fs` (11px) and `--k-caption-lh` (16px); `k-caption`, `k-profile`, the rail buttons and the rail badge use them, and so does every page's own small text (no page sets 9 or 10 px for product text any more). `b` and `strong` are 550 in the kit.
- **compact-mantine:** its Caption role (9/14, 500) stays for Figma fidelity in the library; the app sets captions it shows through the body role in secondary ink. If the owner prefers the library to carry the change, it is a theme token in compact-mantine, not a local override in the app (root `CLAUDE.md`, "UI Components").
- **Two-way door:** a token value; reversing it is one line in the kit.

## Every undo line behaves the same

- **Document and section:** `interaction-patterns.md` 3.4 (the notice) and 3.5, level 4 (notice timing); `message-catalog.md`, `graphty.undo.done` and `graphty.redo.done`. Amends "Undo and the other ways back: the undo line stays until the next change, and Undos in a row name every step" above, whose departure from the 3 s / 6 s timing was "limited to this one line" (the filter step's), and the undo example in "compact-mantine Toast: a notice with an action can time out".
- **Old text:** (the amended entry) "The departure from the 3 s / 6 s timing of 3.5 level 4 is limited to this one line"; screens/notices-errors.html state 1: the undo line for Create set "times out after about 6 s, because Redo is also on the Edit menu and the redo chord".
- **New text:** "Whenever Undo or Redo shows a line (3.4 says when: a filter step always; any other command only when its effect is out of sight), the line has no timeout. It stays until the next change -- any undoable command, a tick, a delete, a selection change, or its own action -- and a camera move, a hover, or opening a menu or panel does not end it. Undos in a row add to the same line, newest first ('Undone: Create set Friends of Valjean and Add style layer Group color'); a Redo starts a new line and Redos in a row add to it. The Toast's timeout option stays for other notices with an action (a failed run's Show {object})."
- **Why:** round 3, finding 20: two quick undos replaced the first message unread and the line vanished before it was read. That happens whatever the command is: a Ctrl+Z pressed in a field that had lost focus undoes a set just as silently as a filter step (the notices page's own scenario). One gesture, one kind of feedback: an undo line that sometimes waits and sometimes vanishes teaches the reader not to trust it. Drawn in screens/notices-errors.html (state 1), screens/filter-steps-and-undo.html (after a second Undo), flows/undo-and-ways-back.html (frames 3 to 5 and lane A, where Show in steps now puts focus on group 8, the first step the line names, as screens/undo.html already did).
- **Two-way door:** timing of a notice.

## The key sheet: one set of group names, Find first

- **Document and section:** `interaction-pattern-entries.md` 9.3 (the key sheet); amends "Find, after round 3: ... Ctrl+F everywhere" above ("The key sheet lists it first under 'Anywhere in graphty'") to the region grouping of "Keyboard walk after round 3".
- **Old text:** "The key sheet lists it first under 'Anywhere in graphty', with Ctrl+K, F6 and ?."
- **New text:** "The key sheet (?) is titled Keys and groups its keys under region headings: Everywhere first, then the region focus was in, then the others (Graph drawing, Nodes table, ...). Everywhere lists, in order: Ctrl+F 'Find: nodes, sets, styles, notes and more'; Ctrl+K 'Quick actions: commands, and go to a node by name'; F6 'Next region'; ? 'These keys'. A key with a different job in two regions is listed under each."
- **Why:** the two round-3 revisions named the same group two ways ("Anywhere in graphty" on the Find page, "Everywhere" in the walk flow) and ordered Ctrl+K and Ctrl+F differently; the sheet renders graphty-element's published keymap, so it has one shape. Drawn in screens/find.html (state 15), screens/keyboard-walk.html (the key sheet) and flows/keyboard-walk.html.
- **Two-way door:** labels on a sheet; the key roles themselves stay the owner's call as already recorded.

## Keyboard walk: what the flow left open, as the working mock now does it

- **Document and section:** `interaction-pattern-entries.md` 9.2 (Walking the canvas) and the modes table; adds to "Keyboard walk after round 3: go to without selecting, Enter adds, the start survives Tab, regions named first".
- **Old text:** (silent) on what the first Shift+Arrow does after returning to a kept walk; on whether Quick actions and Find end the walk; on "Go to {name}" for a node that is not drawn.
- **New text:**
  - "With a walk kept (its start and place held, not walking), Shift+Down, Shift+Right, Shift+Left, Shift+Enter or Shift+Up puts focus back on the node the walk left off on without stepping, and says 'Walking the drawing. {node}, {i} of {n} from {node stepped from}.'; the next press steps. Shift+Home goes to the start. The first announcement of every walk that starts or resumes begins 'Walking the drawing.'"
  - "Quick actions and Find are overlays like the key sheet: opening one from the walk and closing it with Esc returns to the same node, still walking. Going to a node or choosing a Find hit replaces the start and drops the place."
  - "Quick actions shows 'Go to {name}' only as the row for a drawn node. For a node that is filtered out or not drawn the row keeps its name and Find's reason ('Filtered out by \"Filter out group 8\"'), and Enter opens Find on it, which says how to show it."
  - "In the Nodes table, the first arrival in a project adds once: 'Shift+Arrow here extends the row selection.'"
- **Why:** round 3, finding 23, and the flow's own test ("after Tab to the table and back, every participant can say where the walk will go on from"): stepping on the first press after a return would move the reader off the node the arrival just named. Making Quick actions end the walk would repeat the round-3 defect that Tab did (a visit costs the place). Drawn and working in screens/keyboard-walk.html (states 12 "Go to TP53" and 13 "Walk kept after the table"; storyboard frames 13 to 17) and screens/find.html (state 9).
- **Two-way door:** behaviour of a mock; the published parts (message keys, the keymap roles) stay with the owner as recorded above.

## Accessibility: a checked box and an on switch keep their edge in dark

- **Document and section:** `visual-language.md` A8 ("The chrome meets WCAG 2.2 AA by default"); compact-mantine `design/figma-spec.md` 2.9 (the AA token set) and 5.4 / 5.5 (Checkbox, Switch).
- **Old text:** 2.9: "Checkbox and switch borders read `--cm-border-translucent-strong`, so they need no component change." 5.4 and 5.5 draw the checked box and the on track as the brand fill with no edge.
- **New text:** append to 2.9: "A checked Checkbox and an on Switch keep the unchecked face's 1px inside edge (`--cm-border-translucent-strong`) on top of the brand fill in dark; light is unchanged."
- **Why:** measured on the mocks (screens/export-dialog.html, screens/filter-steps-and-undo.html, kit/index.html). The AA dark brand fill, #0a6dc2, was chosen so white text on it reaches 4.5:1; against the dark panel (#2c2c2c) it is 2.65:1 and against a dialog 2.15:1, under the 3:1 WCAG 1.4.11 asks for the boundary of a control. So in dark a checked box -- the most common control in the Export dialog and the filter steps -- is the one state whose outline fails. The edge composited over the fill is about 5:1 against both surfaces and does not touch the white tick (over 4.5:1 on the fill). Light passes already (#0768cf is 5.6:1 on white).
- **Built:** `kit/kit.css` draws the edge in dark on `k-check[aria-checked="true"]` and `k-switch[aria-checked="true"]`; delete that rule when compact-mantine takes it.
- **Two-way door:** a style change in two components.

# After round 4

The fourth simulated study round tested the new navigation with a tree test and first-click tasks. The entries below are the framework changes it motivates. The findings they cite are in `study/round-4/insights.md` and `study/round-4/tree-test.md`; the reasons in full are under "Round 4" in `study/decision-log.md`.

## The meaning of a weight is chosen for each run

- **Document and section:** `interface-specification.md`, the run form; graphty-element's run options.
- **New text:** "What a bigger weight means (a stronger link or a longer distance) is a graphty-element run option, prefilled from the column. The run form's label reads 'A bigger amount means: a stronger link / a longer distance', with one line per choice, and the run's Details names the choice. The column's setting is renamed 'Default for new runs'."
- **Why:** a confirmed severity-4 finding: one column can be a strength for one measure and a distance for another.
- **Condition:** build it only after real participants, including one real screen-reader user, have seen the severity-4 findings.

## Weighted degree, a near-tie test and a selection sum in graphty-element

- **Document and section:** graphty-element's algorithm catalog; `interface-specification.md`, the table dock.
- **New text:** "graphty-element adds weighted degree (in, out and total), a near-tie test (default: within 1% counts as tied, values shown to 3 significant digits), and a column-footer sum over the current selection computed by the element."
- **Why:** weighted degree answers money in and out per account in one measure; the tie test and the sum replace three separate ways of totalling and answer the severity-3 finding on reading ties. The element computes them so no consumer reimplements them.

## Style files become recipes

- **Document and section:** `information-architecture.md` 4 (the Data place) and the conceptual model's list of saved objects.
- **New text:** "A style file is a recipe that holds only styles. One noun, one Apply: Main menu > Recipes > Apply... and Data > Recipes accept both."
- **Why:** the text-only tree test sent 9 of 16 to Recipes when they looked for a saved style, and only 6% went straight to the right place.

## One File list with two openers

- **Document and section:** `interface-specification.md`, the main menu and the project-name menu.
- **New text:** "Main menu > File and the project-name menu open one list built from one definition: Open..., Update with new data..., Export..., Download project file, Version history, Rename, Duplicate, Close. With a project open, Open... never replaces it; the file opens as a new project and the current project stays in Recent."
- **Why:** 14 of 16 opened File to export; two command lists had already drifted apart; 3 of 16 picked Open to update and would have lost their project.

## Selection stays out of undo

- **Document and section:** `interaction-patterns.md` 3.4 (the undo notice); `screens/undo.html`.
- **New text:** "Selection changes are not undo steps. A cleared selection is reported on the existing undo notice line: 'Selection cleared (18 nodes). Previous selection'. Edit > Previous selection stays; the separate Previous selection key and 'Undo back to here' are removed."
- **Why:** a clear recorded as an undo step would empty Redo after one stray click, and "Undo back to here" assumes a linear history the filter model does not have.

## Looks change drawing only

- **Document and section:** `visual-language.md`, looks; the Export dialog.
- **New text:** "A look changes how things are drawn, never how values are grouped. The Print look's 'no change' band is removed. Each look states in visible text what it changes and what it leaves alone ('Print: darker lines, larger labels. Does not separate close colors.')."
- **Why:** the band grouped values a second time and showed a second, conflicting set of counts.

## Run-painted legend colors are editable

- **Document and section:** `interaction-patterns.md`, the legend; `visual-language.md`, color.
- **New text:** "Legend colors painted by a run can be edited; the edit is kept against the category value and survives a re-run. Every color has a spoken name and each change is announced. One too-close flag with Fix... sits on the legend entry."
- **Why:** restyling two groups scored lowest of round 4 (2.67), and restyling without sight was a severity-4 finding.

## Find and Go to focus, never select

- **Document and section:** `interaction-pattern-entries.md` 9.2 (Walking the canvas).
- **New text:** "On Enter, Find and Go to both put the walk's focus on the node and neither selects it. Selection happens only inside the walk (Enter adds, Space toggles), and the walk announces 'N selected' or 'Nothing selected' when it starts."
- **Why:** Find selected and Go to did not, which left a keyboard participant with three nodes selected by accident.

# After round 5

The fifth simulated study round compared Results in the inspector against Results on the rail, and repeated the tasks voided in round 4. The entries below are the framework changes it motivates. The findings they cite are in `study/round-5/insights.md` and `study/round-5/tree-test.md`; the reasons in full are under "Round 5" in `study/decision-log.md`. Where an entry here contradicts an entry under "After round 4", this one replaces it.

## The undo line clears when the reader moves on

- **Document and section:** `interaction-patterns.md` 3.4 (the undo notice).
- **New text:** "The undo line clears when the reader moves to another node or another filter step. Every notice follows this rule."
- **Why:** "until the next action" failed in alert triage: one alert's notice greeted the next alert.

## A ranked table opens sorted by its result, and its CSV keeps tie marks

- **Document and section:** `interaction-patterns.md`, the table dock.
- **New text:** "A ranked table opens sorted by the result that opened it, and its CSV keeps the '=' tie marks."
- **Why:** the top-50-to-Excel task scored 4.00 against a bar of 5.3.

## Ctrl+Z restores a cleared selection (replaces "Selection stays out of undo")

- **Document and section:** `interaction-patterns.md` 3.4; graphty-element's history.
- **New text:** "Ctrl+Z restores a cleared selection from one slot, owned by graphty-element's history, only when the selection was cleared (Esc or a click on empty canvas) and nothing undoable has happened since. Redo is never touched, and Ctrl+Shift+Z never clears the selection again. While the slot is armed, Edit > Undo reads 'Undo: restore selection (18 nodes)'; afterwards the undo line reads 'Selection restored (18 nodes)'. Any new selection or undoable change empties the slot. Edit > Previous selection and its key are removed."
- **Why:** all 6 get-back sessions pressed Ctrl+Z first, and 2 of 6 ended in a wrong state they did not notice; 16 of 16 reached for Undo on the first-click prompt. The earlier objection, that it would empty Redo, no longer applies.

## Nothing is preselected where the reader must choose

- **Document and section:** `interaction-patterns.md`, choices in forms and dialogs.
- **New text:** "Where the reader must choose, nothing is preselected: the meaning of a weight for each run, a note's citation, and the Apply dialog's first choice. The action stays disabled until a choice is made."
- **Why:** a prefilled weight meaning sent 9 of 16 to the column's "Change..."; a preselected Apply choice wiped the style stack.

## Results is a rail place that holds runs

- **Document and section:** `information-architecture.md`, the rail places; `interface-specification.md`, the inspector.
- **New text:** "Results is a rail place that holds runs: every run of a measure, with its settings and date. Opening a run shows its record in place (settings, date, Re-run, Compare with...). Values are read on the node in the inspector and in the table. The inspector's empty-selection Results section is removed."
- **Why:** with Results in the inspector, finding an earlier run reached 25% direct success; on the rail, the same participants did better by 7 direct answers of 48, above the frozen limit of 4. Replaces "Inspector: computed values sit in Results, per run" and "Results in the inspector" where they conflict.

## Terminology after round 5

- **Document and section:** the terminology list in `conceptual-model.md`.
- **New text:** "Results is the place; a run is the object; a value is a number on a node. Recipe is the one noun for a saved style or workflow file; 'style file' is retired. Look is used only in the Export dialog (Screen, Print). Link-count measures are 'Links in (count)', 'Links out (count)' and 'Links (count)'. Weighted degree on a currency column is 'Money in', 'Money out' and 'Money in minus out'."
- **Why:** 4 of 5 money sessions failed because a link-count ranking looked like money; "result" was used for both a run and a value.

## Using the styles from a recipe replaces only what they repaint

- **Document and section:** graphty-element's StyleManager; `interface-specification.md`, the Apply dialog.
- **New text:** "'Use these styles' replaces every reader layer that targets the same element kind (nodes or edges) and writes the same style property as a layer in the file. Layers from algorithms' suggested styles are never replaced. The dialog's preview lists by name each layer that goes. The second choice adds the file's layers on top."
- **Why:** the existing replace wiped the whole stack, algorithm layers included, and scored 19% on the tree task.

## Data-visualization rules after round 5

- **Document and section:** `visual-language.md`, data and colour; graphty-element's default palette.
- **New text:** "Every value computed on a subset carries its scope ('0.419, on 60 of 77'). Comparisons and agreement are stated as ratios or numbers in words, never as verdict adjectives such as 'higher' or 'about the same'. No band that nobody set. The too-close colour flag and the Print look's grey check share one distance function. The default palette's black and dark-grey pair is fixed in graphty-element."
- **Why:** verdict words imply a statistical test that was turned down; the Print look's unset band voided the signed-grey task; the too-close pair came from the default palette.

## A forced label is a style layer

- **Document and section:** `interaction-patterns.md`, labels; the style layer rules.
- **New text:** "'Show label anyway' on a selected node writes to one user style layer, 'Labels shown anyway (this file)', where such labels are listed, reordered or removed. A label is never forced on directly."
- **Why:** forcing a label is styling, and styling applied outside a layer cannot be seen, reordered, removed or saved.

# One gesture, one key, one message: consistency after round 5

The entries below make the pages agree with the decisions above where they had drifted. Each names the rule and where it now holds. Where an entry here contradicts an earlier one, this one replaces it.

## No notice clears on a timer

- **Document and section:** `interaction-patterns.md` 3.5, level 4 (notice timing); withdraws "compact-mantine Toast: a notice with an action can time out".
- **New text:** "Every notice, the failed-run notice included, clears when the reader moves to another node or another filter step, never on a timer. A failed run's row keeps its error either way."
- **Why:** "The undo line clears when the reader moves on" says every notice follows the rule, and a 6 s notice was what people missed in round 3. `screens/notices-errors.html`, states 4 and 4b, now say so.

## Find's Enter goes to the hit; past the drawing limit it selects

- **Document and section:** `interaction-pattern-entries.md` 4.8 and 9.2; amends "Find and Go to focus, never select".
- **New text:** "Enter (or a click) on a Find hit closes Find and puts the keyboard focus on the node, selecting nothing; Enter again adds it to the selection. A hit that is not drawn cannot take the focus, so there Enter selects it, as a table row does."
- **Why:** the find-and-expand pages still selected on Enter while the keyboard pages did not. Finding a seed and growing it now takes one more Enter than in Figma; test that count with the fraud persona.

## A cleared selection is announced the same way everywhere

- **Document and section:** `interaction-pattern-entries.md` 9.4 (announcements); `message-catalog.md`, `graphty.undo.done`.
- **New text:** "Spoken: 'Selection cleared ({count} nodes). Ctrl+Z brings it back.' Shown: the same words on the undo line, with Bring it back. Restored, whether by Ctrl+Z or by reopening a project: 'Selection restored ({count} nodes).' Edit > Undo names it in the form every entry uses: 'Undo Restore selection ({count} nodes)'."
- **Why:** the pages had four versions ("Selection cleared on canvas; ...", "Selection restored: 14 nodes", "Undo: restore selection", and a spoken "Bring it back" with no key).

## One main menu and one project menu, with their keys

- **Document and section:** `interface-specification.md`, the main menu and the project-name menu; extends "One File list with two openers".
- **New text:** "The main menu is Quick actions... (Ctrl+K), File, Edit, View, Selection, Algorithms, Recipes, Preferences..., Help on every page. The project-name menu is Open... (Ctrl+O), Update with new data..., Export... (Ctrl+Shift+E), Download project file, Version history, Project info..., then Rename, Duplicate, Close."
- **Why:** pages showed five different main menus and three project menus; a key printed on one page and not another is a key nobody learns. Main menu > File on the weekly-return and replace pages still lists the data entry commands (Add data..., Join...), which the one File list does not hold; that is open.

## A note is added with Ctrl+Enter on every page

- **Document and section:** `interaction-pattern-entries.md`, the Note editor.
- **New text:** "Enter starts a new line; Ctrl+Enter (Cmd+Enter on a Mac) adds the note, with both keys said under the box. Esc with text adds the note and closes the editor."
- **Why:** the take-a-note flow and the weekly screens still said Enter adds; round 4 saw Enter post half a note.

# After round 6

The sixth simulated study round re-tested runs on the rail, undo with and without Ctrl+Z, and the tasks voided by undrawn decisions. The entries below are the framework changes it motivates. The findings they cite are in `study/round-6/insights.md` and `study/round-6/tree-test.md`; the reasons in full are under "Round 6" in `study/decision-log.md`. Where an entry here contradicts an earlier one, this one replaces it.

## Every number states what it was counted on

- **Document and section:** `content-design.md`, numbers; `message-catalog.md`; `visual-language.md`, data and colour (extends "Every value computed on a subset carries its scope").
- **New text:** "Every count, rank and measure the reader sees states its measure, unit or counted noun, fixed precision, scope ('N of M') and data version, in the form 'N of M <noun>, on <data version>'. The wording comes from graphty-element's reader-message catalog, never composed per surface."
- **Why:** at least eight findings were one defect: a number that did not say what it was counted on (degree 40 against 41, units dropped after a filter, a re-export with no data version). Fixing it page by page drifted for four rounds.

## Whatever a run produces names the run and opens it

- **Document and section:** `interaction-patterns.md`, results and runs; `objects.md`, run.
- **New text:** "Anything a run produces (a style layer, a pinned rank line, a community row, a table sort) names that run by the title Results shows and opens it."
- **Why:** 12 of 16 clicked a style layer made from a bridges run, the only "Bridges" on screen, and it led nowhere.

## Loading data declares no meaning for a column

- **Document and section:** `files-and-recipes.md`, loading data; `interaction-patterns.md`, choices in forms and dialogs (extends "The meaning of a weight is chosen for each run" and "Nothing is preselected where the reader must choose").
- **New text:** "Loading data declares no meaning for a column. What a bigger amount means is asked in each run that uses it, with nothing preselected."
- **Why:** a "Change..." link on the loaded column drew 27 wrong first clicks, and a load-time weight role led to four wrong answers on the tree test.

## Ties come from the data, and exports keep rank numeric

- **Document and section:** `options-and-encodings.md`, ranks and ties; `output-homes.md`, CSV. Replaces "A ranked table opens sorted by its result, and its CSV keeps tie marks" where they conflict.
- **New text:** "Ties are marked only from exact equality at the shown precision or from the estimate's own error bound, never from a fixed percentage. Exports keep rank numeric, with ties in their own column; sampled estimates export as Rank low and Rank high."
- **Why:** participants read a fixed 1% tie rule as rounding, and '4=' turns a rank column into text in Excel and pandas.

## The too-close colour check covers every pair

- **Document and section:** `visual-language.md`, data and colour; graphty-element's default palette.
- **New text:** "The too-close color check covers every pair, the default palette included, and names the pair and the color vision it models."
- **Why:** checking only the colours a reader picked hid that the default palette's orange (#E69F00) and vermilion (#D55E00) are too close for red-green colour blindness.

## A file's styles replace only whole-graph layers that paint the same property

- **Document and section:** graphty-element's StyleManager; `interface-specification.md`, the Apply dialog. Narrows "Using the styles from a recipe replaces only what they repaint".
- **New text:** "A file-supplied style layer replaces only whole-graph layers that paint the same property, and keeps layers scoped to a set. The dialog lists by name each layer it will replace, with its match count; Apply acts at once and the notice says what was replaced and kept, with Undo."
- **Why:** the earlier rule silently removed the reader's own set-scoped layers.

## Every file intake recognizes a recipe

- **Document and section:** `files-and-recipes.md`, recipes; `element-contract.md`; `information-architecture.md`, File.
- **New text:** "Every file intake (File > Open..., Add a source, a drop) recognizes a recipe and opens the one Apply dialog. graphty-element owns recognizing the format."
- **Why:** on the tree task for bringing in a recipe, all 16 opened File first and 5 ended on Add a source. Recognizing the format is something every consumer of graphty-element needs.

## Esc does one thing per press

- **Document and section:** `interaction-patterns.md`, keys; `interaction-pattern-entries.md`, Esc.
- **New text:** "Esc does one thing per press, starting with the innermost open item."
- **Why:** one Esc both closed a steps list and reset the page in four sessions, the defect the owner reported as the participant view being a trap.

## Focus never falls to the page body

- **Document and section:** `interaction-patterns.md`, focus; `interaction-pattern-entries.md`, announcements.
- **New text:** "No action leaves keyboard focus on the page body. When a redraw replaces the control the reader was on, focus goes to the same control in the new drawing. When the control leaves with its action (Bring it back, a notice's Undo, a closed dialog's Cancel), focus returns to where the reader was before it: the drawing, the chip, the button that opened the dialog. An opened dialog takes focus on its first control. A link or chip that opens another place moves focus to what that place draws focused, or else to the place's heading."
- **Why:** in the sixth study the simulated screen-reader participant lost her place after Ctrl+Z, after Bring it back and after the filter chip: each time focus fell to the top of the page and she had to find the drawing again. A sweep of every mock found the same drop after Export table... and after a Data chip that opens its source row. The mock kit now does this on every page, so the pages match the rule.

## A legend swatch says its color

- **Document and section:** `visual-language.md`, data and colour; `interaction-pattern-entries.md`, the legend; compact-mantine's color swatch.
- **New text:** "Every color swatch a reader can meet (a legend row, a style layer's chip, a table swatch) has an accessible name that is its color in words, from the palette's own names for Okabe-Ito (orange, sky blue, bluish green, yellow, blue, red-orange, reddish purple, black) and 'gray, unstyled' and 'light gray' for the unstyled and Other grays, or a plain hue word for any other color. A multi-color chip says 'several colors'; a ramp says 'a color scale'."
- **Why:** the simulated screen-reader participant could hear that the legend had groups 4, 3, 2 and 5 but not which color each was, so she could not follow a sighted colleague's "the orange ones" or match the legend to the drawing's description (WCAG 1.1.1). The names are the palette's, so they are the same words on every page and in every export.

# After round 7

The seventh simulated study round was the first run on the clickable refined B skeleton (`app-b/`). The entries below are the framework changes it motivates. The findings they cite are in `study/round-7/insights.md` and `study/round-7/tree-test.md`; the reasons in full are under "Round 7" in `study/decision-log.md`. Where an entry here contradicts an earlier one, this one replaces it.

## A door is a command, registered once

- **Document and section:** `interaction-patterns.md`, menus and commands; `information-architecture.md`, "one home per element".
- **New text:** "A door is a command registered once (in the skeleton, through `AB.cmd`). It may appear in many menus, always with identical words. A door that renames its command, or opens a second form for the same job, is a second pattern. 'One home per element' forbids two controls that set the same state; it does not forbid two entries that open the same dialog."
- **Why:** with no File menu, tree task 3 fell from 100% to 19% direct, and 13 of 16 opened the main menu first. Restoring one File list shown from two menus is one command with two doors, not two homes. Most other confirmed findings were the reverse: one job spelled three ways ("Keep as set", "Save as set", "Create set") across forty section files.

## A count names its unit and its whole

- **Document and section:** `content-design.md`, numbers (extends round 6's "Every number states what it was counted on").
- **New text:** "A count names its unit ('4 of 4 attributes', '2,410 rows to add', 'Width 5 px'), and when it is a part it names its whole ('1,204 of 9,113 edges'). A bare number is never shown; a number that counts something other than what it sits beside (a property count beside a node count) is never shown."
- **Why:** "Line 5" counted properties and read as a width; recipe counts, match reports and edge-filter counts were bare numbers, and participants guessed their unit.

## Focus never changes selection or paint; an empty selection shows the graph

- **Document and section:** `interaction-patterns.md`, selection, focus and Esc; `conceptual-model.md`, section 2 (the selection).
- **New text:** "Moving focus never changes the selection or what is painted. When nothing is selected, the selection is empty and the inspector shows the graph on screen as its subject; the graph is never put into the selection, so commands that act on the selection never act on the whole graph by accident. Escape closes the innermost open thing first, then clears the selection and leaves the graph's panel open. A read-only link does one thing: it opens what it names."
- **Why:** a row's "..." opened another row's menu (5 of 5), Escape returned to a previously selected row (6 of 6), a path's coloring switched off when a note box opened (3 of 3), and a compute link opened Clear graph data.

## Vocabulary additions to the glossary

- **Document and section:** `glossary.md`, terms and commands.
- **New text:** add "hidden" (an element not drawn), "off" (a style row switched off), "covered" (a row whose property another row wins), "not listed" (a row removed from the list view that still paints), "Add label line", "Open project or file...", "New graph", "Add to <graph>", and the count rule above. "Steps, never hops" applies to path length only ("a path of 4 steps"); a neighborhood keeps the glossary's own "k hops" ("1 to 3 hops"), unchanged. "Create set" remains the one set verb, with "Create set from rule" for a set that keeps its condition.
- **Why:** the skeleton drifted in wording because the glossary lacked these terms, and path length was written both as steps and as hops.

## graphty-element requirements from round 7

- **Document and section:** `element-contract.md`; recorded in full in `study/structure-comparison/element-requirements-5.md`.
- **New text:** "graphty-element appends rows to a loaded source, reporting rows added, repeated rows and new nodes. It draws the legend, from the one legend state, into exported images. A note's text, and its note count, are label sources."
- **Why:** adding rows was refused and its door mislabeled (severity 4); an exported picture left out the legend shown on the canvas (severity 4); labels from notes were asked for by the owner. Appending is a public contract, so it is a one-way door for the owner when built.

## Neighborhood distance is counted in edges: "1 to 3 edges away"

- **Document and section:** `glossary.md`, section 6, the **neighborhood** row ("The nodes within k hops of a node or set ...") and the **Add selection to step**, **Filter to neighbors** row ("the selection's neighbors k hops out"); `interface-specification.md` and `structure-b-refined.md` wherever the Neighborhood popover offers "1 to 3 hops".
- **Old text:** "within k hops", "k hops out", "1 to 3 hops"; and, in the round-7 vocabulary entry above, "a neighborhood keeps the glossary's own 'k hops' ('1 to 3 hops'), unchanged."
- **New text:** "The nodes up to k edges away from a node or set, in a direction, including the start (closed) unless labeled open." Screen wording: the popover's row is "Distance" with 1, 2 or 3 and "edges away"; a filter step is named "Neighbors of {name}, 1 to 3 edges away"; step groups are "one group per distance". Rejected aliases kept as search aliases only: "hops" and "steps". Path length keeps "steps" ("a path of 4 steps"), which this replaces nowhere. This replaces the vocabulary entry's neighborhood clause.
- **Why:** "edge" is the one noun every domain on the canvas already shares (co-appearances, transfers, citations, interactions), so "edges away" needs no definition, where "hops" is network jargon and "steps" already means a filter step on the same popover ("Add as steps", "as a filter step or as step groups"), which participants misread. With "edges away" for distance, "steps" means path length and filter steps, and "hops" means nothing on screen. Two-way door: wording only, no published key.

## graphty-element requirements from round 8

- **Document and section:** `element-contract.md`.
- **New text:** "graphty-element offers a node lookup by label, id and attribute value, live and incremental, which the app's find box calls; the app does no matching of its own. It offers a one-hop neighbor query that returns the neighbors with their tie values. Label culling reports how many labels it drew and how many it hid, so every 'N hidden' count is live. Each algorithm in the catalog carries a one-sentence plain-language meaning, which legends and Analyze read."
- **Open question:** whether selected nodes rank first in label culling. They should not override it.
- **Why:** finding a node and seeing its neighbors scored 0 of 12, and 5 of 6 who typed an account id (a value) got "No match"; a lookup the app wrote itself would be a workaround of the element. A fixed "64 hidden" that survived showing every name taught people to ignore warnings. Newcomers could not read a legend that named a method with no meaning attached.

## Size encodings scale by area, with a visible minimum

- **Document and section:** `element-contract.md`, size defaults.
- **New text:** "Size encodings scale by area, with a minimum size that stays visible and clickable. A 0.5 px minimum is too small. The skeleton uses 2 to 12 px until graphty-element sets the default."
- **Why:** a 0.5 px minimum hides nodes, and the legend's stated size range is the only readout that tells the reader a size step worked.

## compact-mantine: arrow keys in the segmented control

- **Document and section:** the compact-mantine component notes.
- **New text:** "The segmented control moves between options with the arrow keys. The fix is made in the shared component, not in any section that uses it."
- **Why:** a broken shared control fixed locally behaves unlike every other copy of it.

## Every count and claim in a message is computed

- **Document and section:** `principles.md` and the wording section of the skeleton's README.
- **New text:** "Every count and claim in a message is computed from the state it describes, or the message is removed."
- **Why:** fixed strings that disagreed with the screen ("64 hidden", "32 rows", "sorted by degree", "Covered by PageRank") were the most repeated cause of lost trust in round 8.
