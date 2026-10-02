# Owner feedback log

Every piece of feedback the owner gave on the mocks and storyboards, and exactly what the studio did with it. Newest round last.

## Round 1

No written feedback items on the round-1 mocks and storyboards reached the studio this round.

One owner decision, made on 2026-09-28, shaped the round-1 changes and is recorded here so it is not lost: on the canvas, Shift+Arrow walks from a node to its neighbours and the plain arrow keys stay on the camera (orbit in 3D, pan in 2D). How the studio handled it:

- The keyboard walk mock (`screens/keyboard-walk.html`, `flows/keyboard-walk.html`) is being rebuilt to that binding: Shift+Arrow walks, Shift+Enter steps back, Esc leaves the canvas, and [ and ] stay the keys for walking the members of a set. See "Keyboard walk" in `decision-log.md`.
- The keyboard-only storyboard (`storyboards/keyboard-only.html`) showed the plain arrows walking; it is being redrawn to match.
- The framework change is proposed in `framework-changes.md` under "Keyboard walk: Shift+Arrow walks, plain arrows stay on the camera", against `interaction-pattern-entries.md` 9.2 and its modes table.
- Ideas raised in the study that would reopen the decision -- a neighbour list opened with Enter, Tab and Shift+Tab walking, J and K as walk keys -- were rejected and are listed with their reasons in `decision-log.md`.

## Round 2

### Reader message keys are published as graphty.<area>.<message>

**The feedback.** A decision recorded on 2026-09-28: reader messages are published as { key, params, text }, with keys named `graphty.<area>.<message>`. It had not been entered in this log, and the proposed framework changes applied it unevenly. The count's `set` parameter used the prefixed form, but the entry on error headlines and causes said "Keys are spelled as the catalog spells them, with no namespace prefix; a prefix would be its own proposal", and the Find entry proposed unprefixed keys (`find.outsideStep`, `inspector.outsideScope`, `drawn.outOfScope`). It touches the notices and errors, Find, find-and-expand, inspector, load step and results panel mocks.

**How the studio handled it.**

- The decision is recorded here and applied as a decision, not proposed: a rule line at the top of `framework-changes.md` says the published key is `graphty.` plus the key shown in the message catalog, citing this decision directly (this copy of `message-catalog.md` has no "Published keys" section to point to). A proposed line above the catalog's table says the same, with the example `undo.done` published as `graphty.undo.done`.
- The contradicting sentence was deleted. "Keys are spelled as the catalog spells them, with no namespace prefix; a prefix would be its own proposal" now reads "Keys follow the published form graphty.<area>.<message> (owner decision, 2026-09-28)".
- Every key in proposed text was rewritten to the published form -- among them the Find entry's three keys, the walk, load, file, start, capability, save, open, filter, table, run and legend keys, and the undo keys. Keys inside quoted old text, references to a catalog row by its current spelling, and graphty-element API names such as `session.styles.update` were left as they are. Unprefixed keys in proposed text: 79 before, 0 after.
- Not folded into the sweep: moving the legend's out-of-scope line from `graphty.drawn.outOfScope` to `graphty.legend.notDrawn`. The decision fixed the form of keys, not the names of areas, and an area name in a published key is a one-way door, so it is a separate proposal in `framework-changes.md`, recommended, for the owner to decide.
- The new undo line for filter steps reuses the catalog's existing undo row, published as `graphty.undo.done` ("Undone: {name}" with Show in steps). No new history keys were created, and the earlier proposed `graphty.undo.filterStep` is superseded.
- The round-2 milestone file shows this answer next to the changed screens.

### The Shift+Arrow walk decision stays binding

Restated from round 1 because round 2 touched every keyboard mock: on the canvas, Shift+Arrow walks from a node to its neighbors and the plain arrow keys stay on the camera. This binds every keyboard mock and every keyboard study task. The keyboard walk mock is being rebuilt on a graph that is actually loaded (find TP53 with Ctrl+K, walk with Shift+Arrow, Shift+Enter back, Esc leaves), and the framework passages that still say plain arrows walk are carried over as a correction in `framework-changes.md`.

## Round 3

Sixteen items: three owner decisions on published formats, one correction, two choices made on the owner's behalf, four review comments on the mocks and six directions on how the app's structure should be designed. The decisions each item led to are in `decision-log.md` under Round 3, and the framework changes in `framework-changes.md` under "After round 3".

### The findings report is one self-contained HTML file

**The feedback.** Owner decision (a published file format): the findings report is ONE self-contained HTML file -- figures embedded, notes and tables as real text, it opens offline and prints to PDF. A native PDF may follow later as a second format. `framework-changes.md` still called this "proposed, not decided", and the export mocks labelled it a recommendation.

**How the studio handled it.**

- `framework-changes.md` now carries the decision in a paragraph at the top, and the report entry reads "decided by the owner, 2026-09-28" instead of "proposed, not decided".
- The export dialog is redrawn with the choice "Findings report (.html)" and no "recommended" or "proposed" label next to it (`screens/export-dialog.html`). The export flow, the flagged-account storyboard and the take-a-note storyboard record the report as decided (`flows/export.html`, `storyboards/alert-triage.html`, `flows/take-a-note.html`).

### SVG figure export now, PDF later, and the grey check stays

**The feedback.** Owner decision (a published graphty-element capability): graphty-element publishes SVG figure export now, and PDF later once SVG is solid. The Print look keeps its greyscale check. Milestone 3 was still asking the owner whether to publish SVG and PDF.

**How the studio handled it.**

- The export dialog offers "Figure (.svg)" and "Image (.png)". The disabled PDF row is gone; PDF is not shown until it exists.
- Every place in `framework-changes.md` that asked the owner about SVG and PDF is marked decided, and no later milestone asks again.
- The grey check is kept and made stricter (see "Signed figures print correctly in grey" in the decision log): it now tests every pair of value bins on opposite sides of the midpoint, not only the two ends.

### Notes and recipes record who wrote them

**The feedback.** Owner decision (a published file format): each note records its author and time; a recipe records who saved it and when; both come from the project's author setting as given (blank if unset); the author is shown only when a project holds more than one.

**How the studio handled it.**

- Notes panel and take-a-note are redrawn: each note shows author and full date and time ("Adam Powers, Sep 24 2026, 10:14"), and the author appears only when the project holds notes by more than one author (`screens/notes-panel.html`, `flows/take-a-note.html`).
- The recipe preview and the recipe's own screens show "Saved by ... on ..." from the same setting (`storyboards/recipe-travels.html`, `flows/replace-and-recipe.html`, `screens/binding-step.html`).
- Preferences gains one field, "Your name on notes and recipes" (`screens/preferences.html`). There is no account concept anywhere; the setting is plain text stored with the project.
- `framework-changes.md` records the decision at the top and in the entry "Authorship on notes and recipes".

### Correction: the owner never decided "notes carry no author"

**The feedback.** `framework-changes.md` and the decision log said the owner had decided "the date only ... Notes carry no author". The owner never made that decision, and it must be withdrawn. The notes-panel mock and the gallery entry still said "no author".

**How the studio handled it.**

- The sentence is withdrawn in place in `framework-changes.md` (the Notes panel entry) and in `decision-log.md` (Round 1, notes panel), each with a bracketed note saying the owner never made that decision and pointing to the authorship decision above. The text is left visible and struck by the note rather than deleted, so the history stays readable.
- "No author" is removed from the notes-panel mock and from its gallery entry.

### The project saves the selection when it closes

**The feedback.** Decided on the owner's behalf (reversible): the project file saves the selection when it closes, so a case resumes where it stopped (an optional, additive field). It was still recorded as an open owner question and was not drawn.

**How the studio handled it.**

- The entry in `framework-changes.md` now reads "decided on the owner's behalf, 2026-09-28; reversible".
- The weekly-return storyboard draws the reopen state with the state line "Selection restored: 14 nodes" (`storyboards/weekly-return.html`). The load-and-characterize and flagged-account storyboards reopen the same way.

### No separate Note tool for now

**The feedback.** Decided on the owner's behalf (reversible): no separate Note tool. Add note's existing entry points cover it; test the several-notes-in-a-row case before proposing a tool again. `framework-changes.md` still proposed a Note tool on key C, and the empty Notes panel's button armed the Note tool.

**How the studio handled it.**

- The key C proposal and the "keep the Note tool" question in `framework-changes.md` are marked withdrawn and answered in place.
- The empty Notes panel's button is "Add a note..." and opens the note editor directly. With nothing selected, the editor opens with focus on "About:" (the whole graph, each kept set, or "Select something first"), and the next Add note keeps the same subject, which covers writing several notes in a row.
- Key C is removed from the keyboard walk mock and the key sheet (`screens/keyboard-walk.html`).
- Round 4 includes a several-notes-in-a-row task; a tool is proposed again only if it fails.

### Review 1: Export... belongs in the project-name menu

**The feedback.** Figma also has Export... in the project-name menu (top left). Add it there, and decide whether the top-right Export button stays as a second route or goes.

**How the studio handled it.**

- The top-right Export button goes. There is one export dialog with three ways in: Export... in the project-name menu, an Export... button in the header of the new Data panel, and "Export table..." in the table dock, which opens the same dialog with Table already chosen. Ctrl+Shift+E opens it from anywhere.
- Why it goes rather than stays: in round 3 two exports of the same figure produced different files, and the cause was two separate dialogs, not two routes. One dialog removes the cause; the button was also a symptom of data management having no home (see the data-management item below).
- Redrawn: `screens/export-dialog.html`, `flows/export.html`, `screens/start-screen.html`, `screens/frame-at-rest.html`, `storyboards/first-look.html`, `screens/table-dock.html`.

### Review 2: styles move out of the Graph panel, the Figma way

**The feedback.** Styles do not belong under the Graph nav link. Follow Figma's pattern (Selection colors in the right panel, "+" to add, the colour picker's Custom and Libraries tabs), so style layers and style libraries are reached from the selection's appearance and the colour picker. Keep an ordered visible stack, precedence and the legend, show where the stack lives when nothing is selected, and record the framework change.

**How the studio handled it.**

- Styles leave the Graph panel and live in the right panel. With nothing selected, the inspector's "Style stack" section is the whole ordered stack, with drag handles, "top wins" precedence and the legend. With something selected, an "Appearance" section shows the same whole stack with the rows that paint the selection highlighted and marked with the property each one wins, plus "+" to add a layer scoped to the selection.
- The stack is highlighted, not filtered, for the selection: a filtered list would hide the overridden layer, and that layer is the answer to "why is this node not the colour I expected".
- A swatch opens the colour picker with Custom and Libraries tabs. Libraries holds palettes and the style layers that came with style files and recipes.
- The Look control (Screen, Print, High contrast) sits in the Style stack header with a visible "Look" label.
- Redrawn: `screens/styles-list.html`, `screens/inspector.html`, `flows/colour-by-value.html`, `flows/narrow-hide-paint.html`, `screens/frame-at-rest.html`. Framework changes recorded against `information-architecture.md`, `interface-specification.md` and `figma-crosswalk.md` (styles in the right panel is recorded as a closer copy of Figma, not a departure).

### Review 3: the "M" avatar

**The feedback.** What is the "M" avatar in the top right with no account management? Remove it, or replace it with something real (for example the project's author setting), and say which.

**How the studio handled it.**

- Removed, and the slot is left empty. graphty has no accounts, and anything in that slot -- an initial, the author's name, or the privacy line -- reads as "signed in". The author setting lives in Preferences instead ("Your name on notes and recipes").
- The privacy line "Nothing has been sent from this project" moves under the project name in the left panel header, visible on every frame (also when the panel is minimized), and links to the Data panel's "Sent and saved" list. After the Assistant is used it reads "Sent to the Assistant: 2 questions. Nothing else."
- Redrawn on every mock that showed the avatar: find-and-expand, alert-triage, past-drawing-limit, undo, find, keyboard-walk, preferences, first-look and frame-at-rest.
- [Correction: this was not true when it was written, and the avatar was still on screens/frame-at-rest after round 5. See "Correction: the avatar, 'Export files' and the rail redraw are not done" under "After the round-5 sessions".]

### Review 4: why Results was on the left

**The feedback.** Why is Results on the left? Answer plainly in the gallery what each left-rail button is in the ontology and why. Reconsider Results' home (the right panel or inspector and the bottom table explore results; the left side navigates objects; runs start from Quick actions and the catalog), decide whether a Results rail panel is needed, record the framework change, and test the new placement next round.

**How the studio handled it.**

- The Results rail panel is retired. A result is a property of the graph it ran on and has no identity apart from it, so it becomes a section of the one inspector: with nothing selected, "Results" lists runs newest first with the needs-action strip on top; with a node selected, it shows that node's value and rank in each run. Selecting a result makes the result the selection (its state line, the weight used, its runs, Compare with..., Show as style layer); Esc or a click on empty canvas returns to the previous node selection. A result's items open as a tab in the table dock.
- Runs start from Quick actions, Ctrl+K and the main menu's algorithm catalog. No toolbar Measure... button this round; it is added only if the round-4 "run a measure" first-click task fails.
- The move is marked provisional: it is driven by the owner's review and by the ontology, not yet by study evidence, and the round-4 tree test decides it. A failed test reverses it.
- The gallery gets a plain answer for each rail button (see the navigation item below).
- Redrawn: `screens/results-panel.html` (now the inspector's Results section), `flows/run-and-read.html`, `screens/option-form-cost.html`, `screens/inspector.html`, `screens/table-dock.html`, `screens/notices-errors.html`, `screens/comparison.html`, `storyboards/first-look.html`.
- [Reversed after round 5: Results is a place on the rail again, as a studio decision, because testing answered it. See "Review 4" under "After the round-5 sessions".]

### Show the before and after for the four reviews

**The feedback.** Show the owner the before and after for each of the four review items in the next milestone; milestone 3 did not mention them.

**How the studio handled it.** A new before-and-after storyboard (`screens/navigation.html`; entries below that say storyboards/navigation mean this page) pairs today's layout with the new one, one frame each for export, styles, the avatar and Results, plus the rail as a whole. The next milestone file opens with it.

### Take structure from graphty's ontology, and only controls and gestures from Figma

**The feedback.** "Copy Figma" was taken too literally. Figma sets conventions for controls and gestures only; graphty's structure must come from its own ontology and information architecture. Redesign the overall navigation from the ontology first, designing for graphty where it differs (data sources and versions, results and runs, sets and paths, filters, recipes, comparison, notes and findings).

**How the studio handled it.**

- The navigation was rebuilt from one rule, proposed for `information-architecture.md`: the rail lists the collections a project owns; the right panel reads and changes the selection; the bottom dock compares rows. A rail button names a collection, never an activity.
- The resulting rail, top to bottom: the main menu (not a place), Graph (graphs, sets and paths, views), Data (new), Notes, Assistant. Results became an inspector section, styles moved to the right panel, filters stay on the filter chip, and Compare stays a mode entered from a result.
- Where graphty differs from Figma, it now has its own home: data sources, versions, recipes and everything written or sent in Data; results and runs in the inspector; sets and paths in Graph; notes and findings in Notes.
- Five-place rails (separate Steps, Compare, Filters or Views places) were considered and rejected; see the decision log.

### Make real use of the nav rail

**The feedback.** Decide what each rail destination is in the ontology, and give graphty's distinct concerns their own homes there if the information architecture supports it.

**How the studio handled it.** Each rail button is labelled in the before-and-after storyboard and the gallery with what it is: the main menu is the app's commands, not a place; Graph is the project's graphs, the sets and paths kept on them, and saved views; Data is where data comes from and goes to; Notes is the project's notes and findings; the Assistant is the chat. Data is the new home the information architecture supports -- it is a real collection (sources, versions, recipes, style files, the sent-and-saved log) that had no place. Redrawn: frame-at-rest, first-look, the inspector's Results section, styles, notes-panel, version-history, sets-and-paths and data-location.

### Design data management as one area, and put export where it belongs

**The feedback.** Design data management as one coherent area -- how data comes in, is versioned, refreshed, joined, filtered, exported and shared (projects, recipes, style files, data files, findings reports) -- and put export where that design says it belongs, not as a top-right button.

**How the studio handled it.**

- New screen: the Data rail panel (`screens/data-panel.html`). It lists objects, each with its own verb: sources and their columns (each numeric edge column shows its weight state), versions (the version history list; reading a past version stays a mode), "Update with new data..." (Replace is the main button when the columns match), "Add a table" (a join), applied recipes, style files, and "Sent and saved from this project", a log of every file written and everything sent. The panel header holds one Export... button.
- The load's choices ("Loaded: transfers.csv, direction followed, amount not used yet. Change...") live on the source row; the state line quotes them and the file chip links to them.
- Filtering stays on the filter chip, a step on the graph rather than a data object. Export has starting places (project-name menu, Data header, table) and one dialog; it has no home of its own because it is a verb on objects that already have homes.
- Redrawn: data-location (now Data > Sent and saved), load-step, load-and-characterize, version-history (now Data > Versions), replace-and-recipe, binding-step, export, export-dialog, start-screen, weekly-return and recipe-travels.

### Record every structural change as a framework change

**The feedback.** Record every structural change as a framework change (`information-architecture.md`, `figma-crosswalk.md`, `interface-specification.md`) with its ontology reason, and grow the figma-crosswalk departures list wherever a better-for-graphty reason with evidence exists.

**How the studio handled it.** `framework-changes.md`, "After round 3", has one entry per structural change: the places table and outline, the new rail rule, the replaced "Graph and Results never leave" rule, the rejected alternatives, the interface specification rows, the output homes, and five new departures in the figma-crosswalk ledger (a Data place, Results as an inspector section, the Layers slot used for graphty's objects, no avatar, no top-right Export). Each says its reason in terms of what the object is.

### Test the new navigation with a tree test and first-click tasks

**The feedback.** Test the restructured navigation in the next study round with a tree test and first-click tasks across the personas, and show the owner the before and after in the next milestone.

**How the studio handled it.** Round 4 opens with a tree test of the new rail and inspector across all personas (find where to update with new data, where a run's result lives, where to change a node's colour, where to see what left the project), then first-click tasks on the rendered frames. Results in the inspector passes only at 70% direct success; below that it goes back to a rail place. The before-and-after storyboard leads the next milestone. Before any round-4 session, the mock kit is fixed so the owner can leave the participant view and every shared number comes from the fixtures (see "The mock kit" in the decision log), because two round-3 findings came from mock defects rather than the design.

## Round 4

### Do not re-ask decided questions

**The feedback.** Milestone 3 asked again about SVG and PDF figure export, which was already decided (SVG now, PDF later). The .graphty recipe format is covered by the existing file-format decision. Check the feedback file before asking.

**How the studio handled it.** Milestone 4 still asked both again, in its third question. That question now asks only about the notebook route, which the feedback file does not answer, and says that figure export and the recipe format are decided. Every question in a milestone is now checked against the feedback file before the milestone is written. The hosting, telemetry and Assistant-switch question in milestone 4 has no answer in the feedback file yet, so it is carried once more in milestone 5, not dropped and not repeated in several places.

### Participant view was a trap

**The feedback.** On screens/undo.html, "Participant view" hid the bar and offered no way out; on an iPad, editing the address was the only exit. Fix it in the kit for every page, and test at touch width.

**How the studio handled it.** Every page in participant view now has two ways out: Esc, and a small, faint control in the bottom-right corner of the visible screen (a 32 px touch target that stays in that corner however far a tablet is zoomed or panned). Both return to the full view and keep the page's other states. It was checked at 768 by 1024 with touch. One page is still broken: screens/navigation.html renders blank in participant view. It is fixed and re-shot at 768 px before the next round's sessions. See kit/README.md, "The way out".

### Correction: the avatar and Results are not gone from every mock

**What this log said.** Under "Review 3" and "Review 4" above, the avatar was reported removed from every mock that showed it, and Results was reported moved off the left rail.

**What is true.** Only the navigation, first-click and Data panel screens were redrawn. Most task screens (results panel, run-and-read, colour-by-value, table dock, notes, past the drawing limit, the alert pages) still show Results on the rail, an "Export files" button and a letter avatar that changes from page to page. Every task screen is redrawn on the new rail before the next round's sessions, and this entry is updated when that is done.

## After the round-4 sessions

How each item in `owner-feedback.md` was handled after the fourth simulated study round. The full reasons are under "Round 4" in `study/decision-log.md`.

### Review 1: Export... in the project-name menu

The project-name menu keeps Export..., as asked. It now opens the same File list as Main menu > File, built from one definition (Open..., Update with new data..., Export..., Download project file, Version history, Rename, Duplicate, Close), so the two routes can no longer disagree. With a project open, Open... never replaces it: the file opens as a new project and the current one stays in Recent. The top-right "Export files" button is removed from every task screen when the mocks are redrawn before round 5.

### Review 2: styles under the selection

Styles stay in the right panel. The legend becomes the place to change a group's colour: clicking a label selects the group, and clicking the swatch or choosing Change color... opens the colour picker with unused colours first. An edit to a group a run painted is kept against its category value and survives a re-run. Every colour has a spoken name, each change is announced, and one too-close flag with Fix... sits on the legend entry. Style files are folded into recipes, so saved styles have one name and one Apply.

### Review 3: the "M" avatar

The earlier claim that the avatar was gone from every mock was wrong (see the correction above). Every task screen is redrawn with no avatar letter before any round-5 session.

### Review 4: why Results was on the left

Round 4 missed its own bar: the three tasks that look for a result reached 63%, 0% and 69% direct success against 70%. Results stay in the inspector and the table as a studio decision, not an owner decision, because every miss went to the table's Search, a column's sort or the weight column, and none went near a rail place. Round 4 is not rescored. Round 5 runs a two-arm tree test (inspector against rail place), with its answer key frozen before the round, and that test decides. No question is put to the owner: the review asked the studio to reconsider and test.

### Show the before and after for the reviews

Milestone 5 leads with the before and after for each review item, drawn on the rebuilt screens.

### Structure from graphty's ontology; data management as one area

Two changes follow this direction. Style files stop being a separate kind of file: a style-only recipe replaces them, and "Recipes" is the one word everywhere. "Update with new data" appears in one place in the Data panel and in the one File list.

### SVG now, PDF later, and the grey check stays

The Export dialog's Print look keeps its greyscale check. A grayscale file option was proposed and deferred, because the owner decided on a check, not a grayscale file. Each look now says in visible text what it changes and what it leaves alone.

### After undoing a filter step, show the one-line notice (undo version B)

The same line now also reports a cleared selection ("Selection cleared (18 nodes). Previous selection"). Selection changes stay out of undo, "Undo back to here" is deleted, and the separate Previous selection key is removed.

### The keyboard walk uses Shift+Arrow

Unchanged. Find and Go to now both move the walk's focus to a node on Enter without selecting it, so the walk is the only place that selects by keyboard.

### Do not re-ask decided questions

Milestone 5 asks nothing about SVG, PDF, the recipe format or where Results live. The hosting country, telemetry and the organization-wide Assistant switch are still unanswered in `owner-feedback.md`; milestone 4 already asks them, so milestone 5 lists them once as still open and asks nothing new. The Data page shows "Not decided yet" for each instead of an empty value.

### Participant view was a trap

Still open for one page. `storyboards/navigation.html` renders blank in participant view; it is fixed and its way out (Esc and the 32 px corner control) is shot at 768 px wide before any round-5 session, and the "Participant view was a trap" entry above is updated when that passes.

## After the round-5 sessions

How each item in `owner-feedback.md` was handled after the fifth simulated study round. The full reasons are under "Round 5" in `study/decision-log.md`. From now on, an item is written as done only after the kit's check (`kit/check.mjs`, which reads each rendered page) passes on every page and, for the participant view, the 768 px shot exists.

### Correction: the avatar, "Export files" and the rail redraw are not done

**What this log said.** Under "After the round-4 sessions", the top-right "Export files" button and the avatar letter were to be removed from every task screen, and every task screen redrawn on the new rail, before any round-5 session.

**What is true.** It is not done, and it is written as done only after the kit's check passes on every page and the 768 px participant-view shot exists.

- When the round-5 sessions ran, these pages still showed "Export files": screens/navigation, screens/recipe-apply, screens/table-dock, screens/first-look, screens/comparison, flows/alert-triage, storyboards/recipe-travels and storyboards/weekly-return. screens/frame-at-rest still showed the avatar and the Export button, and most task screens still used the old rail. Round 5 ran on those screens, which voided 7 of its 18 repeated tasks.
- Since then every task screen takes its frame from one shared source (`kit/shell.mjs`: the rail, one right panel, no avatar, no top-right Export), and the check fails any page that shows a retired word such as "Export files" or an avatar letter.
- On 2026-09-29 the check finds no "Export files" button, no avatar letter and no old frame on any task screen. It still fails on 12 pages for other reasons, so this item stays open: the retired Previous selection key (Ctrl+Alt+Z) on storyboards/keyboard-only, storyboards/weekly-return, flows/keyboard-walk, flows/undo-and-ways-back, screens/filter-steps-and-undo, screens/selection-over-cap and screens/weekly-return; a second Apply dialog on storyboards/recipe-travels and screens/binding-step; the retired "style file" on flows/replace-and-recipe; a count the fixtures do not hold (8,701 edges) on flows/load-and-characterize; and both retired strings quoted in the gallery's own text (index.html).

### Review 1: Export... in the project-name menu

Unchanged in design: Export... stays in the project-name menu and in Main menu > File, from one list. Not written as done: the check finds no "Export files" on any task screen today and fails any page that shows it, but it does not yet pass on every page (see the correction above).

### Review 2: styles under the selection

The legend stays the place to change a group's colour: the swatch opens the colour picker and the label selects the group, each reachable by keyboard with a spoken colour name. The style stack's "+" gains "From a recipe or file...", which opens the one Apply dialog. That dialog's first choice, "Use these styles", replaces only the reader's layers that paint the same thing (same nodes-or-edges, same property), never the layers an algorithm suggested, and it lists by name each layer that will go. "Style file" is no longer used anywhere.

### Review 3: the "M" avatar

Not written as done (see the correction above). The shared frame has no avatar slot, the check fails any page that shows an avatar letter, and today it finds none; the item closes when the check passes on every page. A note's author appears only in the note editor ("Saving as: Marcus. Change...") and on notes when a project holds more than one author, as the owner decided.

### Review 4: why Results was on the left

Results moves to the rail, as a studio decision, not an owner decision, because testing answered the question. With Results in the inspector, tree-test task 3 (how an earlier run was set up) reached only 25% direct success; with Results on the rail, the same simulated participants did better by 7 direct answers out of 48, above the limit of 4 that was fixed before the round. The rail place holds runs: each run of a measure with its settings and date, opened in place with Re-run and Compare with.... Values are still read where the owner suggested, in the inspector (on the selected node) and in the table. The inspector's empty "Results" section, shown when nothing is selected, is deleted, so runs have one home. Round 6 tests the label "Runs" against "Results".

### Show the before and after for the reviews

The next milestone shows the before and after for each review item, drawn only after the check passes, with the old frames marked and captioned Before. It asks the owner nothing. Hosting country, telemetry and the organization-wide Assistant switch are listed there once, as still open from milestone 4.

### Structure from graphty's ontology; data management as one area

"Recipe" is the one noun for a saved style or workflow file; "style file" is retired. The Data panel keeps one "applied recipes" row, and the file chip opens its source's row with "Update with new data..." first. Hosting country, telemetry and the organization-wide Assistant switch are still unanswered in `owner-feedback.md`; see the milestone line above.

### SVG now, PDF later, and the grey check stays

The grey check stays. Its leftover "drawn as no change" sentence, a band nobody set, is removed. The Print look now states how many categories cannot be told apart in grey and prints the value at each grey step.

### Authorship on notes and recipes

As decided: the author is recorded as given (blank if none is set) and shown only when a project holds more than one. "Mark unsigned notes as mine" and "Edited by" were proposed and turned down, because the first rewrites that recorded author and the second changes the published file format.

### After undoing a filter step, show the one-line notice (undo version B)

Kept. The notice now clears when the reader moves to another node or filter step, not "until the next action", so one alert's notice no longer greets the next. For a cleared selection, Ctrl+Z now brings the selection back without touching Undo or Redo; "Previous selection" and its key are deleted. Round 6 compares the notice alone against the notice plus this restore.

### The keyboard walk uses Shift+Arrow

Unchanged. The walk's readout now names its column ("amount 0.98"), and the second Esc no longer mentions Previous selection.

### Do not re-ask decided questions

The next milestone asks nothing about SVG, PDF, the recipe format, authorship or where Results live.

### Participant view was a trap

Not written as done. The page is screens/navigation.html (earlier entries called it storyboards/navigation, which does not exist). After round 5 its participant view rendered blank. On 2026-09-29 a new 768 px participant-view shot exists (shots/screens__navigation-storyboard--study--768.png), it is no longer blank, and the check passes on that page alone. The entry says done only when the check also passes on every other page (see the correction above).

## After the round-6 sessions

How each item in `owner-feedback.md` was handled after the sixth simulated study round. The full reasons are under "Round 6" in `study/decision-log.md`. The rule from round 5 stands: an item is written as done only after the kit's check (`kit/check.mjs`) passes on every page and, for the participant view, the 768 px shot exists. Round 6 showed that the check itself was not working: its task mode reported "0 problems on 0 pages", so it checked nothing. It now fails when it checks no pages, the facilitator pastes its full output into each round's file, and any failure stops the round. Nothing below is written as done.

### Correction: the avatar, "Export files" and the rail redraw are not done

Still not written as done. Round 6's passing check was empty, so it proved nothing about these pages. The avatar, "Export files" and the old rail are still retired strings the check fails on, and the item closes only when the repaired check passes on every page.

### Review 1: Export... in the project-name menu

Unchanged in design: Export... stays in the project-name menu and in Main menu > File. The Export dialog now says which data a file came from: "Export again, on April data", and saved rows and file names carry the data period. Rank exports as a plain number with ties in their own column, so the file opens as numbers in Excel and pandas.

### Review 2: styles under the selection

The legend stays the place to change a group's colour. "Use these styles" from a recipe is narrowed further: it replaces only whole-graph layers that paint the same property and keeps layers scoped to a set, which the reader made on purpose. It applies at once and says what it did ("Replaced 3 layers, kept 2. Undo"). A style layer made from a run now names that run and opens it. The too-close colour check now also covers graphty-element's own default palette.

### Review 3: the "M" avatar

Not written as done (see the correction above). A note's author appears in the note editor on every edit ("Saving as: <name>. Change...").

### Review 4: why Results was on the left

Results stays on the rail as a studio decision. Round 6 tested the label "Runs" against "Results"; "Runs" did not do better (16 of 20 direct against 39 of 44), so the label stays Results. Finding how a run was set up held its gain. Moving runs to the rail made one list, a run's Top nodes, pull clicks meant for a node's own value; the list stays, and a selected node's rank is now pinned above it as one line that opens the table row. Values stay where the owner suggested, on the selected node and in the table, and computed values never appear under a node's Attributes.

### Show the before and after for the reviews

Unchanged. The next milestone shows the before and after only for pages the repaired check passes, and asks nothing.

### Structure from graphty's ontology; data management as one area

Loading data no longer declares what a column means: the Weight column role and the "Change..." link on a data source are removed, and each run asks what a bigger amount means. A recipe is recognized by every way a file comes in (File > Open..., Add a source, a drop) and opens one Apply dialog; graphty-element does the recognizing. Hosting country, telemetry and the organization-wide Assistant switch are still unanswered in `owner-feedback.md`; the data page now shows each as "Not decided yet" instead of a blank label. They are not asked again.

### SVG now, PDF later, and the grey check stays

Unchanged. The too-close colour check now covers every pair of colours, names the pair and the colour vision it models, and suggests colours that clear every neighbour.

### Authorship on notes and recipes

As decided: the author is recorded as given, blank if none is set. The author setting says "Applies to notes you save from now on", and a newly set name is never added to earlier notes; offering to do so was turned down because it rewrites the recorded author.

### No separate Note tool

Recorded in `owner-feedback.md` as a reversible decision made on the owner's behalf. The mock template still drew a Note tool, which participants met in round 6; it is removed from the template, and the check fails if it returns.

### After undoing a filter step, show the one-line notice (undo version B)

Kept. For a cleared selection, the notice alone was compared with the notice plus Ctrl+Z: wrong end states went unnoticed in 5 of 8 sessions with the notice alone and 0 of 8 with Ctrl+Z. The notice plus Ctrl+Z ships; "Bring it back" stays on the notice, and the notice-only version is retired.

### The keyboard walk uses Shift+Arrow

Unchanged.

### Do not re-ask decided questions

The next milestone asks nothing about hosting, telemetry, the Assistant switch, SVG and PDF, authorship or where Results lives.

### Participant view was a trap

Not written as done. In round 6 a single Esc both closed the undo page's steps list and left the participant view, resetting the page, which spoiled four sessions. The rule is now: Esc does one thing per press, starting with the innermost open item, and leaves the participant view only when nothing is open. Every page is fixed to follow it, the kit's gate proves it by opening the steps list and pressing Esc, and every page gets a 768 px touch shot.

## Round 7

How each item the owner wrote in `owner-feedback.md` on 2026-09-30 and 2026-10-01 was handled, after the seventh simulated study round, the first run on the clickable refined B skeleton. Every route below opens at http://dev.ato.ms:9825/app-b/#/<route>. "Done" means `node app-b/study.mjs --check` passed on that route on 2026-10-02; "decided" means the change is agreed and not yet drawn. The full reasons are under "Round 7" in `study/decision-log.md`.

### 2026-09-30, third review: "Line 5", "Arrow head 4"

The number counted how many properties in that section the row sets, and nothing on screen said so. It is gone: the section headings now read "Line" and "Arrows" with no number, and every style number shows its unit. Done for the line width, which now reads "Width 8 px"; route `inspector-selection-and-everything/everything-edges`. Decided, not yet drawn: the arrow's size in the Arrows popover reads "Size 1" with no unit until that popover takes the unit from the shared list of style properties, as the width does; route `style-pickers/arrow`.

### 2026-09-30, third review: empty and unset style values

Each style section shows only what is set, with a "+" on its heading that adds a property, the way Figma does. Done; route `inspector-selection-and-everything/everything`.

### 2026-09-30, third review: Everything styled differently from "For the report"

Both rows now use the same panel, side by side. Done; route `style-tab-same-panel/nodes`.

### 2026-09-30, third review: legend and camera buttons on the canvas

They moved to the toolbar; the legend itself still draws on the canvas. Done; route `toolbar/at-rest`. Decided this round: the same one legend state also drives Present and the exported image, and graphty-element draws the legend into the picture, because a participant left an export believing it matched her screen.

### 2026-09-30, third review: no text on the toolbar

Icons only, with tooltips after a hover delay and on keyboard focus. Done; routes `toolbar/tooltip-hover` and `toolbar/tooltip-focus`. The selection bar follows the same rule.

### 2026-09-30, third review: the data sidebar is too complex

Loading, joining and editing a source moved out of the sidebar to the full-width Data page; the sidebar keeps sources, filters and attributes. Done; routes `data-place/at-rest` and `data-page/entries`. Decided this round: rows can be added to a loaded table from its source row ("Add rows from file..."), on a page headed "Add to <table>".

### 2026-09-30, third review: how much of Tableau to copy

Answered in `study/structure-comparison/owner-questions-3.md`, section 7: the data source page, typed fields and joins on any key column are copied; blending is not. Done; route `data-page/entries`.

### 2026-09-30, third review: a label from a field, a note's text or the note count

A label line picks its text from a list of attributes, results and notes. Done; routes `style-pickers/bind` and `inspector-selection-and-everything/notes-row-label`. A note's text as a label source is a graphty-element requirement, proposed in `framework-changes.md`.

### 2026-09-30, third review: notes on edges

Yes. Done; route `notes-place/edge-note`.

### 2026-09-30, third review: "Why this look" collapsible

It collapses. Done; routes `inspector-node/why-this-look` and `inspector-node/why-closed`. Decided this round: each winning row lists the rows it covers, and its "Covers ..." text names every covered row.

### 2026-09-30, earlier review: rename by double-click

Drawn (route `graph-place/rename`): double-clicking anywhere on a row, not only on its name, now opens the name for editing, and typing a new name and pressing Enter keeps it. Untested, not failed: no participant could double-click in round 7 because the study tool could not. The tool can now double-click, type and Shift-, Ctrl- or Alt-click, so round 8 tests it.

### 2026-09-30, Tableau notes: which field holds the ids

The Data page asks which column holds each table's ids and which columns point at them. Done; route `data-page/role-menu`. Decided this round: each link line says how many keys were found ("9,113 of 9,113 from_account found in accounts").

### 2026-09-30, Tableau notes: node and edge weight set at load

Weight is chosen on the Data page when the source is loaded. Done; route `data-page/buildings`. Decided this round: the weight list gains "Number of rows per pair", and Path between names the weight it uses, "<attribute> (set at load)", rather than changing the default.

### 2026-09-30, Tableau notes: labels picked in styling, several per node

A label is a line in a style row, and a row can hold several (above, below). Done; route `inspector-group-set-path-row/label-two`.

### 2026-09-30, Tableau notes: "+" next to Label starts empty

A new label line binds nothing until a field is picked. Done; route `inspector-group-set-path-row/label-empty`. Decided this round: one command, "Add label line", replaces the three ways to add a label.

### 2026-09-30, Tableau notes: loading and joining several sources on any key

The door-entries example (person_id, building_id, time, joined to people and buildings) loads as one graph. Done; routes `data-page/entries`, `data-page/people` and `data-page/buildings`.

### 2026-09-30, Tableau notes: blending, live data

Blending is out of scope, as the owner decided. Live sources against snapshots is filed as issue #643 and is not in the design.

### 2026-10-01: notes in graphty-element's API

Specified in `study/structure-comparison/element-notes-api.md`. Done; route `notes-place/all`.

### 2026-10-01: no author name as the normal case, and note metadata

Notes save with no name, and time and target are always shown. Done; routes `notes-place/writing` and `notes-place/selected`. Decided this round: notes show the stored date and time ("Sep 28, 2026, 14:05"), and with no name set the writing box says once, quietly, "Notes are saved without a name. Add your name in Settings." It asks for nothing. Notes with no name reached 75% success, short of the 80% bar.

### 2026-10-01: move on to user studies without waiting for review

Round 7 ran on the skeleton. Its targets were not met; `study/round-7/insights.md` has the results, and 18 tasks could not be finished because the skeleton had no click that reached their end, so those are fixed before rescoring.

### 2026-10-01: the state matrix, wide data and nested JSON

The state matrix is `study/structure-comparison/state-matrix.md`; `node app-b/study.mjs --matrix` checked 343 routes with 0 failures. Wide data: routes `data-page/wide-hosts` and `data-place/attributes-wide-search` (done). Nested JSON: routes `data-page/json-tree` and `data-page/json-report` (done).

### Still not done: the avatar, "Export files" and the rail redraw

Unchanged from round 6: not written as done.
