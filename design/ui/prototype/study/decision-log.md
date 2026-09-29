# Decision log

What the studio decided to change after each round of simulated sessions and focus groups, why, and what it considered and turned down. The evidence behind each item is in the round's `insights.md`. Newest round last.

## Round 1

### Decisions

**The shared mock kit (`kit/`).**

- Before round 2 runs, the fixtures in `kit/fixtures.json` hold one dataset for each task: the protein network (300 proteins in the file, 298 of them with an interaction), the March transfers with the flagged account, Les Miserables for the keyboard walk, and a finished Louvain run with its seed and modularity. The resting app frame takes a dataset parameter. A kit check fails the render when a fixture key is missing, or when two pages show different numbers for the same state of the same fixture. Every icon button renders its tooltip. Every control is either wired or visibly marked "not working in this mock".
  Why: about half of the friction in round 1 came from the mocks themselves -- the wrong dataset after Load, hand-typed numbers that disagreed from page to page, step checkboxes that did nothing on the undo screen, icons without tooltips. Round 2 results would not be valid without this.
- A fact the reader acts on -- where the data is, the filter chip, a scope suffix, the "not drawn" message -- is set at body-text contrast. Caption grey is kept for truly secondary notes. The same rule is proposed for `visual-language.md`.
  Why: several sessions missed key facts set in small grey caption text; the finding was rated severity 2 and repeated across tasks.
- One number-formatting rule for every mock: a count, range or statistic names its set only when that set is not the current graph's, or when the same measure appears elsewhere over a different set. A range always names its column. Two columns never share one display name. Degree on a directed graph is always in, out or total. The set arrives as a `set` parameter on the count's message key (`graphty.<area>.<message>`), never as a string the app writes. The rule is proposed for `content-design.md` section 5 and the parameter for `message-catalog.md`.
  Why: the most severe finding of the round (severity 4, 14 sessions). 298 against 300 proteins, two different fold-change ranges, two meanings of degree, and "largest component 28" under a filter were all read as contradictions. Marking a number only when it departs from the current graph keeps the principle that marks appear only on departure.

**Loading data (`screens/load-step.html`).** The question about what a weight means is removed from the load step. The load summary states any drop in words: "298 nodes -- 2 proteins in the file have no interaction". Add data warns when the new file has the same columns as the loaded one and offers Replace instead.
Why: the weight question came before anyone had a reason to care, and non-specialists left the default. 298 of 300 read as lost data. People refreshing weekly stacked a second snapshot with Add data when they meant Replace.

**Run options and cost (`screens/option-form-cost.html`).** The first run that reads a weight asks, in its own option form: "In confidence, does a bigger number mean a stronger tie, a longer distance, or an amount that flows? Examples: 0.91, 0.40, 0.12." The answers are Stronger tie, Longer distance, An amount that flows, and Not sure -- decide later. The glossary terms appear as secondary text and the formulas sit behind "How it is converted". The answer is stored on the attribute, so it is never asked twice, and skipping is never nagged. "Not sure" has an info mark that states both of today's behaviours. The Betweenness weight field reads "Read as a distance. Not used while its meaning is not set." On the cost gate: direction defaults to the graph's own direction; the seed is visible and editable; the default is the largest sample that fits; "Budget" becomes "Time limit"; a sampled route is offered wherever an hours-long exact run is; the subgraph route reads "Exact, on 1,204 nodes". There is no way to raise the time limit.
Why: an "Unknown" weight meaning hid two different behaviours, and the claim that Betweenness reads no weight contradicted `graph-conventions.md`. On the cost gate the direction default was wrong for directed graphs, the seed was hidden, "budget" was read as money, and "Exact" was read as covering the whole graph.

**Results panel (`screens/results-panel.html`).** The state line puts the weight in the slot that says "Unweighted" today (for example "confidence as similarity"), so the line gets no longer. The out-of-date popover speaks in the past tense for each result: "Louvain used confidence as a distance. It is now a similarity. Re-run to update." "Exact" keeps its word with an info mark: "Computed on every node, not estimated. It does not say the ranking is meaningful." A sampled run shows a rank range from its own error bound ("#3 to #6") and a stability sentence ("Ranks below 20 may swap between runs"). Equal values share a rank ("3="). "295 more in the table" opens the Nodes tab sorted by that measure. Every result row shows a visible "Compare with..." action. New frames: a finished Louvain result (groups table, modularity, seed) and results after a filter, with Scope reading "Filtered graph, 76 of 77". The Details record is defined and shown: method, seed, damping, normalization and weight conversion.
Why: the "how sure is this" finding (severity 4, 13 sessions), people not seeing which weight role a result used, and "Exact" read as "certain". The tasks about groups that differ and about a filtered scope failed on missing frames, not on the design.

**The table (`screens/table-dock.html`).** Each run adds a score column and a rank column, headed with scope and method. Once two or more measures have run, an agreement line sits above the table ("TP53 is in the top 2 on all three measures"). The table has one exit, "Export table as CSV...", which writes every row, the original ids and those headers. The header's Export becomes "Export files...". The comparison's hidden 100-row export is removed. Counts of components, isolates and path hops open here as rows. The table's Scatter view hosts the ranking comparison.
Why: people wanted scores as rows and met two unlabelled Export buttons and a capped export they could not see. One route avoids "which of the five CSV buttons". Rank columns reuse the "#2 of 300" cue, the only confidence cue that worked in round 1.

**Comparing two results (`screens/comparison.html`).** Comparing two results opens the table's Scatter view as rank against rank, with rank 1 at the top left. A block of tied values is drawn as one labelled band ("212 nodes tied at 0"). The top corner is shaded to the length of each result's own top list, with no control for its size. Kendall tau-b is the headline number only when ties exceed 10% of either side, and then Spearman is shown labelled "(ties inflate this)"; otherwise one number is shown. Each side shows its state line. A second canvas remains only for comparing two drawings.
Why: two coloured hairballs did not answer "do these agree", and with 212 nodes tied at zero the headline Spearman was inflated -- a wrong number, not a subtle one.

**Inspector (`screens/inspector.html`).** With exactly two nodes selected, the first row offers "Paths between...", which opens the path run's option form with From and To filled in. Every inspector has a Notes section with "Add a note". Attribute rows get "Style by this", which creates a style layer. Rows get correct accessible names.
Why: the path tool was an unlabelled icon reachable only from one node; the first note had no obvious place to go; a screen reader read raw markup for inspector rows.

**Sets and paths (`screens/sets-and-paths.html`, `flows/sets-and-paths.html`).** The command is relabelled "Paths between..." (its id is unchanged). From and To is its option form, reachable from a two-node selection, Quick actions and the path tool. All paths of equal length are drawn together, and nodes on every one of them are marked ("on all 12 paths"); the "1 of 12" pager is removed. "Weight by" is an edge-column option that goes through the weight-meaning question above. The path goes to the table as rows with every edge column, such as amounts and dates.
Why: people could not ask "how are these connected" from two nodes, could not see the alternatives at once, and could not get amounts or dates out.

**Past the drawing limit (`screens/past-drawing-limit.html`).** The "not drawn" message is centred on the empty canvas. Component and isolate counts open their rows in the table. Degree says in, out or total. Statistics shows the degree distribution that `options-and-encodings.md` already specifies: a log-log CCDF, with zero-degree nodes counted beside it.
Why: the message was missed at the edge of the canvas and the counts were dead ends. The mock left out the specified distribution and used bare "degree" on a directed graph.

**Filter chip (`screens/filter-chip.html`).** A number that follows the chip carries a mark while the chip reads anything other than "Full graph". A filter step whose result a later step changed says so on its row ("Largest component: split into 4 pieces by Remove group 8").
Why: "Largest component 28" followed by "4 components" read as a contradiction under a filter.

**Undo (`screens/undo.html`).** The checkboxes in the step list are wired. Ctrl+Y is Redo off macOS (Mod+Shift+Z stays). Undo history entries read "Undo back to here (3 steps)". Two versions are built for round 2: in the first, undo stays silent; in the second, one line appears only when a filter step is undone or redone -- "Undone: Remove group 8. Wrong step earlier? Open Filter steps" -- and it moves focus into the step list. The wording "Turn off just this step instead" is not used.
Why: five of five participants lost the good last step on their first Ctrl+Z, and two of five pressed Ctrl+Y and nothing happened. Whether a notice is needed at all is disputed against the principle that undo is silent, so the comparison of the two wired versions decides it. "This step" would name the step just undone, which is usually the good one.

**Undo and ways back (`flows/undo-and-ways-back.html`).** The flow is rebuilt on the wired undo screen, with both versions, and adds the path "fix the wrong filter step in the middle" through Filter steps.
Why: round-1 evidence on reaching that fix was contaminated by the checkboxes that did nothing.

**Keyboard walk (`screens/keyboard-walk.html`, `flows/keyboard-walk.html`).** Shift+Arrow walks between neighbours and the plain arrows stay on the camera. Shift+Enter steps back along the walk. The first Esc ends the walk with focus kept on the drawing, the next clears the selection and names Previous selection, and Tab leaves the canvas -- the same Esc as in every list, with or without a focus ring. O switches the neighbour order (proposed key). [ and ] stay the keys for walking a set's members. The focus pill shows the node's values and states the neighbour order, with a switch between edge weight, degree and name. Space toggles the node in or out of the selection. Enter opens the inspector and never replaces the selection. The pill's hint reads "Shift+Arrow: next neighbour. Space: select. ?: keys." "?" opens a key sheet that renders graphty-element's read-only list of default key bindings. In Mod+K, an exact node-name match is the first result of Find's hand-off row, and Enter selects it.
Why: the owner's decision of 2026-09-28. Three of three keyboard participants were caught by Enter replacing their selection. Values were only spoken, never shown, and the neighbour order was neither stated nor changeable.

**Keyboard-only storyboard (`storyboards/keyboard-only.html`).** Redrawn to the Shift+Arrow walk and the pill contents above.
Why: it showed plain-arrow walking, which the owner overruled.

**Find (`screens/find.html`).** A query shaped like an id (letters, digits and dashes, no spaces) matches exactly: "0 matches for ACC-365386", with no "Closest" suggestion. The change to the `find.none` message is proposed for `message-catalog.md`.
Why: in the fraud task a near miss on an account id offered a different customer -- a wrong answer, not a near miss.

**Start screen (`screens/start-screen.html`).** Next to the padlock line: "Projects are kept in this browser." The padlock line links to the "Where your data goes" page.
Why: people learned that projects stay in the browser only from an error message, and IT reviewers had nothing to forward.

**The resting app frame (`screens/frame-at-rest.html`).** Two versions for round 2. In the first, the file-location slot beside the project name reads "This browser. Nothing sent." In the second, that slot is empty at rest. In both, the file popover reads "This browser. Nothing sent. Projects are kept in this browser. Where your data goes...", and the slot shows "Sent to: {source}" or "Assistant on: sends {what}" when data leaves. The Assistant stays visible when off, without its sparkle icon, captioned "Off. Nothing is sent." "Replace" beside Overview becomes "Change overview...".
Why: two severity-3 privacy findings; three sessions read the greyed Assistant sparkle as a leak. A standing location line is disputed against the principle that marks appear only on departure, so the comparison decides it. "Replace" was read as destructive.

**New page: "Where your data goes".** A plain page that can be forwarded: what stays in the browser, what a data-source query or the Assistant sends and to whom, and what the page does not promise. Hosting, telemetry, self-hosting and an organisation-wide switch to turn the Assistant off are marked as open decisions for the owner.
Why: IT reviewers could neither check nor forward "uploads nothing".

**Export dialog (`screens/export-dialog.html`).** "Starting point" is renamed "Share the setup, without data". Choosing it turns off and disables the kinds that carry data and shows "Figures and tables are off: they would show your data." Under Travels, the runs are listed with their parameters ("3 runs: PageRank, Louvain seed 7, ...") along with the text of any notes that travel. The .graphty file type reads "Opens in graphty or any app with graphty-element". The export preview gets "View as: Colour / Grey / Red-green / Blue-yellow".
Why: nobody found the recipe under its old name, and an export meant to carry no data could still carry a picture of the data -- a privacy bug. On figures printed in grey (severity 4), two of four failed with no way to check grey or colour-blind vision before exporting.

**Styles list (`screens/styles-list.html`).** A layer that paints nothing shows "Covered by {layer} above" with a "Move above" action, which is one undo step. The mock shows the specified size-by-absolute-value behaviour stated on its pill, the "Label with" top-N rule as a layer selector, and the Print and Colorblind-safe looks. The legend names what size encodes ("Size: number of connections (degree)"), and a range names its column.
Why: people concluded the tool was broken when a layer did nothing. The grey-figure sessions never saw the specified options because the mock left them out.

**Notes panel (`screens/notes-panel.html`).** Empty state: "No notes yet. Add a note about the selection. Notes are saved in the project and travel in project files and findings reports." Each note records its date automatically, with no author. [Withdrawn 2026-09-28: this was recorded as an owner decision; the owner never made it. Each note records its author and time; see Round 3.] "Use current" becomes "Add current value", which keeps the old value.
Why: the first note had no obvious place to go, and "Use current" read as rewriting evidence.

**Opening a colleague's recipe (`screens/binding-step.html`).** A received recipe states "Brings: styles, 3 runs. You supply: a network with a gene column." "Already open" reads "Opened by this recipe". "No node with this id" becomes "Not in this network: 12 ids, for example 1-Mar", with a general line "12 ids look like spreadsheet dates (SEPT2 -> 2-Sep)." There is no one-click repair.
Why: the recipient could not tell what they had to supply, and gene names mangled into dates looked like a reader error.

**Version history (`screens/version-history.html`).** Community numbering is matched across data versions: group 3 stays group 3 when most of its members persist. If graphty-element does not match numbering, it is filed as a graphty-element defect, not fixed in the app.
Why: participants returning weekly read renumbered communities as changed communities.

**Weekly return (`storyboards/weekly-return.html`, `screens/weekly-return.html`).** The storyboard puts the File menu and the Replace frames on screen, including the same-columns warning on Add data.
Why: exporting this week's figures failed in round 1 because the Replace frames were never shown.

**Alert triage (`flows/alert-triage.html`, `screens/alert-triage.html`, `storyboards/alert-triage.html`).** Participants see the alert-triage screens as the start of the flagged-account task, on the transfers fixture.
Why: the flagged-account task began on the wrong screen with the wrong data.

### Considered and rejected

- A new top-N table widget. Rank columns in the existing table carry it.
- An "Export as CSV" button beside every ranked result. That is five doors to one place; rows leave only through the table.
- One Export section in the inspector that follows the selection. It moves every export to solve a problem that relabelling fixes.
- A neighbour list opened with Enter, walking with Tab and Shift+Tab, or J and K as walk keys. Each reopens the owner's Shift+Arrow decision, and Tab inside the canvas would also trap focus.
- Grey and colour-vision previews in the View menu. A canvas-wide mode is easy to forget is on; the previews go in the export preview only.
- A fixed "within 8%" or "within 1%" near-tie flag, or a published default tolerance for ties. The tool should not invent a threshold.
- A control for how many top items the comparison shades. The shaded corner uses each result's own top-list length.
- Hexagonal bins above 2,000 points. Deferred until a large comparison is tested.
- A time limit for background runs that can be raised. Offering the sample removes the need.
- A separate absolute-value option. Size by absolute value is already specified; the mock now shows it.
- A separate From/To path form as a new command. It is the path run's own option form.
- An author on notes now, and a case field. A local single-user app has no author; author is proposed along with the file format. [Reversed 2026-09-28: the owner decided notes record their author and time; the case field stays rejected.]
- A one-click repair of ids mangled by spreadsheets. The general message is enough unless round 2 shows otherwise.
- Building category rename for round 2. It is proposed as a file-format change, not built.
- Adding seed, damping and conversion to the state line. They stay under Details.
- Text labels on icon buttons. Tooltips are the specified design, and the kit now renders them.
- Hiding the Assistant when it is off. That removes the route to turning it on. It stays visible, without the sparkle, captioned "Off. Nothing is sent."
- Deleting the "undo is silent" rule in `interaction-patterns.md` 3.4 outright in favour of a notice on every undo. Narrowed to filter steps and tested as one of two versions.
- The study's wording "Turn off just this step instead". It names the step just undone, which is usually the good one.
- A Nodes group in the command palette. It adds a second index; Find's hand-off row puts an exact match first instead.
- Tasks retired for round 2: "Biggest piece" (its one issue is covered by the task about reading the numbers) and "Is it OK to use" (merged into the task about whether anything left the browser). "Share without data" drops to one regression session and "Costly measure" to two.

## Round 2

### Decisions

**Message keys (`framework-changes.md`, the shared kit).** Every reader message key the studio proposes is written in its published form, `graphty.<area>.<message>`: the published key is `graphty.` plus the key the message catalog shows. A rule line at the top of `framework-changes.md` says so, citing the owner's decision of 2026-09-28 directly (this copy of `message-catalog.md` has no "Published keys" section), and a proposed line above the catalog's table says the same. The earlier sentence "Keys are spelled as the catalog spells them, with no namespace prefix; a prefix would be its own proposal" is replaced with "Keys follow the published form graphty.<area>.<message> (owner decision, 2026-09-28)". Every key in proposed text is prefixed (for example `find.outsideStep` becomes `graphty.find.outsideStep`); quoted old text and graphty-element API names such as `session.styles.update` are untouched. Moving the legend's out-of-scope line to `graphty.legend.notDrawn` is a separate recommended proposal, not part of the sweep. The undo line reuses the catalog's existing undo row, published as `graphty.undo.done` ("Undone: {name}" with Show in steps); there are no new history keys.
Why: the owner decided that reader messages are { key, params, text } with `graphty.<area>.<message>` keys. The proposals applied that in some places and contradicted it in others. One rule plus one sweep removes the drift; the owner decided the form, not the area names, so an area rename is proposed on its own.

**Undo (`screens/undo.html`).** Undoing "add step" unticks the step and leaves it in the list; only Delete step removes a step. Ticking a step on or off is an ordinary entry in linear undo: it clears Redo like any edit, and nothing is lost because the row stays. There is no "Put back" command, no branching redo and no separate "undone" row state. Every undo and redo shows one status line in the existing notice area, "Undone: <step name>. Show in steps", announced politely, with focus not moved, whether or not the filter chip is visible (the silent version is dropped). The separate page section explaining a component split is removed; the count that names its scope covers it.
Why: severity 4. Undo removed the good step, a later tick cleared Redo, and the step was lost for good; and the undo was silent because a filter step changes counts, not the canvas. Six of seven roles converged on "undo unticks, never deletes".

**The filter chip.** The chip is drawn as a button with a caret. Each step row reads "took out N &middot; M left". Notes under a step are neutral secondary text worded from the reader's side ("keeps only ..."), never styled as warnings, and a step is never explained by a later step. A time window is an ordinary filter step, written by "Filter to this window" on the table dock's time slider, by the date column's histogram band, or by a date rule in the step editor: one step type, three routes.
Why: severity 3. The chip read as a label, steps hid what they removed, and explanatory notes read as warnings. Time already has a home in the information architecture, so the window reuses it.

**Undo and the ways back (`flows/undo-and-ways-back.html`).** Redrawn to the unticking model: undo the middle step of a three-step chain, see "Undone: ... Show in steps", open the steps list, tick it back on. Counts carry their scope (", on: filtered graph").
Why: the flow must show the one undo model end to end.

**What a weight means (`screens/binding-step.html`).** The meaning of a weight column is asked once, on the column, and every measure and the Path tool read that answer. The question reads "For amount, a higher number means... a closer or stronger link (similarity) / a longer or costlier step (distance) / more can pass through (capacity) / Don't use amount", with the technical term as secondary text. The Weight select is an ordinary select listing numeric edge columns. The hint "Read as a distance. Not used while not set", the label "unknown role" and "1/w" are deleted. An unanswered column reads "amount: numbers, not used".
Why: one severity 4 and two severity 3 findings: a weight shown but hop count used, "No weight" hiding a numeric column, and role words that fit neither money nor confidence scores. One place for the meaning removes three inconsistencies.

**Run options (`screens/option-form-cost.html`).** A run that cannot use the chosen weight refuses with the same component, wording shape ("Can't weight paths by amount: amount isn't set up as a length yet.") and focus order as the filtered-scope refusal. Its primary button opens the weight question for that column, and nothing runs until it is answered. An unanswered meaning means "not used" for every measure, PageRank included.
Why: severity 4. PageRank silently used an unanswered weight while paths ignored it. Refusing and "not used" are graphty-element behavior, so they are proposed to graphty-element, not enforced by the app.

**Results panel (`screens/results-panel.html`).** Every weighted result's state line repeats the reader's answer ("Weight: amount, higher = stronger link (your answer)"). Near-ties on exact runs are stated in words ("Ranks 3 and 4 differ by less than 0.1%; treat them as tied"). On sampled runs the rank column header shows the low-high range. No new top-N rank table: the Nodes table sorted by one measure, with the other measures' columns beside it, is that view.
Why: the "how sure is this" finding (severity 3) and the weight finding (severity 4).

**Paths (`screens/sets-and-paths.html`).** Path to... on the one-node inspector and in Quick actions opens a pick mode: "Pick the end node: click, or find it by name (Ctrl+K). Esc cancels." Focus returns to the starting button. Direction follows the data. Hops stay in path order and each shows its date when the data has a time column; the state line flags an inversion ("Not in time order: hop 3 (4 Mar) is earlier than hop 2 (9 Mar)."), which graphty-element computes as part of the path result (proposed). Equal paths read "12 equal paths; 7 go through X" with an expandable list.
Why: severity 4 "the transfers have no dates" and severity 3 path findings. Sorting hops by date would scramble the route and hide the very inversion that matters.

**The table (`screens/table-dock.html`).** An edge's date or time column is shown by default, after the endpoints, wherever edges are listed (the Edges table, an account's connections, the walk list, the CSV). The collapsed dock shows a visible strip labeled "Table"; there is no new toolbar button. Degree columns name their scope in the header. The protein Nodes table is drawn with its Louvain column.
Why: severity 4 dates finding and severity 3 "no visible table" finding. The dock is the table's home, and View > Table already exists.

**Past the drawing limit (`screens/past-drawing-limit.html`).** The table is no longer blocked past the drawing limit: rows are paged and sorted by the result. Offered subsets become filter steps: "Top N by this result, with neighbors" and "Around this node" (the same as Filter to neighbors). Regenerated with plain patent ids.
Why: severity 3. The table depended on the drawing limit and offered only hubs; subsets as filter steps need no new command.

**Find (`screens/find.html`).** An empty Find names what it searched: "0 matches in Transfers, April 2026 (3,093 accounts)." with a Search recent projects button that scans only the Recent projects list when pressed and can return "Found in Transfers, March 2026 -- Open". There is no standing index across projects. The Quick actions empty state reads "No commands or nodes match "{query}"". F6 (move between regions) is shown in the visible key hints.
Why: severity 4. A search for a flagged account that lived in another project dead-ended. A standing index would be a persistence decision made for one persona; the on-demand scan needs none.

**Inspector (`screens/inspector.html`).** The neighbors button is labeled "Neighbors" and has one main action at every graph size: Filter to neighbors, visible even in a density drawing, undoable, shown on the chip. Select neighbors moves to its caret menu. Path to... is added here. The group inspector ("Community 4") and the frame after a table row is selected are drawn.
Why: severity 4. The unlabeled button dead-ended past the drawing limit, and a button whose meaning changes with graph size is a hidden mode. Filter was chosen over Select because a selection inside a density drawing shows nothing; flagged for a check with real users.

**Export dialog (`screens/export-dialog.html`).** "View as Gray" is removed. One "Look: Screen / Print" select drives both the preview and the written file, with the line "File is written with: Print look". When colors collide in gray the dialog names them ("Module 1 and Module 4 look the same in gray") with Use Print look directly under the preview, and the check also runs on a diverging layer's two ends. The Print look never carries sign on lightness alone (proposed for the canvas-drawing rules). The fold-change note becomes the column's ordinary Color by action, since a signed column already diverges at 0. The Tables checkbox is removed: the CSV dialog is the one table export, reachable from the table and from Export, stating "N of M rows, filtered", and it writes a "{file}-methods.txt" file beside the CSV (scope, load choices, weight answer, normalization, seed, graphty-element version, and on sampled runs the rank range and error bound; no comment lines inside the CSV). The .graphty row gets one line: "Readable text (JSON) with styles, steps and layout. It never holds your data." The Style file row merges into the recipe; a layout travels with its parameters. Plain ids in the CSV preview.
Why: severity 4. The gray preview was not the file, and a diverging scale prints +2 and -2 as the same gray. Rule adopted: no preview that differs from the output. SVG and PDF, the methods file and the .graphty schema are one-way doors, proposed in `framework-changes.md`.

**Export flow (`flows/export.html`).** Redrawn on one signed fold-change dataset: Color by log2FoldChange, Look: Print, the collision named, the file written, the file opened and matched to the preview, then the filtered CSV with its methods file.
Why: the gray-figure finding, and one dataset per task from start to finish.

**Recipes and weekly update (`screens/replace-and-recipe.html`).** Recipe Apply stays disabled with the reason printed beside it, not in a tooltip: "Add your table to apply. This recipe needs log2FC from your data." An input the recipient must supply never lists a column from the recipe's own network, even when the name matches. A missing column reads "Your table has no log2FC column. Ask the sender which column they meant." "Everything was found by name" is removed. "Replace data..." is renamed "Update with a new export..." in the File menu and on the Last import row, described "Replaces nodes and edges. Keeps styles, sets, notes and runs." (a rename, not a second command; the label is proposed). The replay report puts "{N} new single-node groups" on its own line, apart from real groups, explaining "65 communities, was 35".
Why: severity 4. The recipe bound the sender's own column, and only a participant doing arithmetic caught it, so it is worse than rated. Severity 3 weekly-refresh finding. The marker for a recipient-supplied input is a recipe-format proposal.

**A recipe travels (`storyboards/recipe-travels.html`).** Redrawn to the recipe changes: Apply disabled until the recipient adds their table, and "ask the sender" when the column is missing.
Why: the recipe finding.

**Loading data (`screens/load-step.html`).** Load recognizes a date column as a date. The load choices have one home, the import report of that data version; the Last import row shows one line, "Loaded with: NA read as missing; parallel edges kept (2,298); 150 edges without a weight", which opens it. The run record points to the data version and does not copy the choices; Statistics keeps no copy. The screen and the resting frame that follows are built from the evidence TSV dataset (298 nodes, 2,298 edges, Keep all).
Why: severity 3. Load choices disappeared after loading; one home prevents the drift three copies would cause. A date type is required for honest range filters and the path time check.

**The resting frame (`screens/frame-at-rest.html`).** The "Size by degree" layer is dropped from the starting look, so nodes start at one size. When the reader adds size by degree, its key reads "Size: number of connections". A painted result then uses one channel. The frame continues from the evidence TSV dataset.
Why: severity 3. Size and color encoded two claims under one key. It is a layer in the app's starting look, so this is a two-way door, not a graphty-element proposal.

**Comparing two rankings (`screens/comparison.html`).** The comparison leads with one plain sentence ("The rankings mostly agree: 8 of the top 10 are the same."), with Spearman as secondary text. The wrong "ties inflate this" label is removed. Top-k gets its own k control; zoom moves off the header; Compare with... sits in a fixed action row. No second coefficient.
Why: severity 3 comparison findings. The defect was the wrong label; Spearman with average ranks handles ties.

**Styles list and methods (`screens/styles-list.html`).** Group comparison is labeled "Descriptive only; no statistical test". The reader chooses the compared columns; each shows a strip or box plot, group against the rest, with median, interquartile range and one effect size (rank-biserial r) labeled "effect size, not a significance test". No p-values; "Enrichment analysis isn't part of graphty"; a Copy members button. In the method catalog: one plain task line per method, Degree added as a route to the degree histogram and its Nodes column, and "Start here" on one method per family (Leiden). Every statistic and step label shows its one-line meaning on hover and focus, taken from the glossary's reader line.
Why: severity 3 group-difference, catalog and vocabulary findings. Many uncorrected tests invite false findings; an effect size says how big a difference is without one. The participation coefficient is deferred and logged.

**Where your data goes (`screens/data-location.html`).** A new row: "Data-source password: kept in memory until you close the tab" (recommended default, never browser storage), with the storage choice proposed to the owner. The Assistant line reads "Sends node names and statistics to {host} when you ask"; after a send it switches to past tense ("Sent to {host} at 14:02: 40 node names, 3 statistics" with See what was sent), and each send lands as an entry in Version history's operation log. The state after a data-source query, "Sent to {host}: 1 query", is drawn.
Why: split from a rejected finding -- the IT reviewer said "Database credentials in localStorage is a finding." The Assistant disclosure is severity 3; the operation log is the existing home for what left.

**Notes panel (`screens/notes-panel.html`).** "Detached" is explained in place ("The set this note pointed to was changed") with Restore set. Relative times show the full date and time on hover. The empty panel gets an Add note button. Author, edit history and a source field stay file-format proposals.
Why: salvaged from rejected findings; the empty panel's add control also goes into the scheduled first-click test with real people.

**Keyboard walk (`screens/keyboard-walk.html`).** Rebuilt on a graph that is actually loaded and walkable: find TP53 with Ctrl+K, walk with Shift+Arrow (plain arrows stay on the camera), Shift+Enter back, Esc leaves; the walk card says "3 of 21 shown, on: filtered graph". The Les Miserables mock uses the published edge list (Old Man to Myriel is a real edge).
Why: the owner's Shift+Arrow decision is binding. Round 2's keyboard search for Javert failed because Javert was not in the loaded graph -- a defect in the mock.

**The shared mock kit (`kit/`).** Before round 3: one numbers file per scenario in `kit/fixtures.json`, and the render fails on a missing key (no hand-typed counts, direction, weight or sample size); patent ids stored as plain digits; the evidence TSV dataset added; the published Les Miserables edge list; one dataset per task from start to finish; American spelling in every on-screen string (color, gray, neighbors, normalization, labeled); a study-render mode that hides design annotations; every stale PNG in `shots/` re-rendered.
Why: about 30 round-2 sessions were confounded by mock numbers that disagreed. Ease-of-task scores taken on PNGs whose annotations explain the design may measure the studio's notes, not the design. The content rules require American spelling.

**The gallery (`index.html`).** Lists the redrawn undo, weight, export, recipe, find, table, load and keyboard mocks, newest first, and a round-2 milestone file for the owner showing the message-key answer and the changed screens.
Why: the owner sees mocks as they become available, and every owner feedback item is answered in a milestone file.

### Considered and rejected

- Ticking a step keeps Redo, or any branching redo. Undo unticks instead, so nothing is lost.
- A "Put back" command and a separate grayed "undone" row state. The checkbox already does it.
- Sorting path hops by date. A path's order is the path, and sorting hides the inversion.
- A standing search index across projects. Replaced by an on-demand Search recent projects.
- A neighbors button that changes its main action past the drawing limit. That is a hidden mode.
- Select neighbors as the main action (as in Figma and the information architecture). A selection inside a density drawing shows nothing.
- A new toolbar Table button. The dock strip is the table's home.
- A separate time-range tool or a new step kind. The slider and the step editor write an ordinary filter step.
- A special fold-change "direction" button. Ordinary Color by on a signed column already diverges at 0.
- A third "Gray" look in export. It recreates a preview that is not the output.
- A new top-N side-by-side rank table or comparison tab. The sorted Nodes table is that view.
- Kendall tau-b as a second coefficient. The wrong label was the defect.
- A named significance test or p-values in group comparison.
- Copies of the load choices in Statistics and the run record. One home: the import report.
- A second "Update" command beside "Replace data". Rename instead.
- Comment lines inside the CSV. They break spreadsheet imports; the methods file beside it carries them.
- The participation coefficient this round. Deferred and logged; the request may come from the task's wording.
- A full log of what the Assistant sent, beyond the Version history operation-log entry.
- Tasks retired for round 3: "Rankings agree", "Rankings scatter", "Share without data", "Biggest piece" and "Finished community result" (one regression run kept); "Costly measure" is rerun once on the fixed fixtures.

## Round 3

### Decisions

**The mock kit (`kit/`), before any round-4 session.** Hiding the design notes keeps anything marked `data-kit-frame`, and every mock window carries that marker, so product text is never hidden with the notes. The study view hides the state switchers. The participant view exits on Esc and through a small, low-contrast corner control, checked at iPad width (768 px). Every statistic shared between pages is read from `kit/fixtures.json`, and a cross-page check fails a render on a missing key or on two pages disagreeing about a number. The fixtures gain the transfers alert columns (alert rule, alert time, and the file riskScore came from) and the protein data's filtered state.
Why: the owner was trapped in the participant view. Two round-3 results -- the privacy line going unseen and 0 of 3 on the flagged-account task -- came from mock defects (product text hidden with the notes, and no transfers pages), so both findings are void until rerun on the fixed kit. Every number in a mock must trace to the fixtures.

**Navigation, before and after (new: `storyboards/navigation.html`).** The rail, top to bottom: main menu (not a place), Graph (graphs, sets and paths, views), Data (new), Notes, Assistant. The rule proposed for `information-architecture.md`: the rail lists the collections a project owns; the right panel reads and changes the selection; the bottom dock compares rows. No Results rail panel, no styles in Graph, no tabs in the right panel, no top-right Export button, no avatar. Each frame pairs today's layout with the new one, for each of the owner's four review comments and for the rail as a whole, and labels each rail button with what it is in the ontology.
Why: the owner's four review comments and the direction to take structure from graphty's ontology and only controls and gestures from Figma. Seven of eight studio members converged on these four places. Five-place rails were rejected because filter steps already live on the filter chip and Compare is a mode entered from a result.

**The Data panel (new: `screens/data-panel.html`).** A rail panel that lists objects, each with its own verb: sources and their columns (each numeric edge column shows its weight state); versions (the version history list; reading a past version stays a mode); "Update with new data..." (Replace is the main button when the columns match); "Add a table" (a join); applied recipes; style files; and "Sent and saved from this project", a log of every file written and everything sent. The panel header holds one Export... button. The load's choices ("Loaded: transfers.csv, direction followed, amount not used yet. Change...") live on the source row; the state line quotes them and the file chip links to them.
Why: the owner said a top-right Export button is a symptom of data management never having been designed. The round-3 tree test found no home for updating with new data, and the "Loaded with" line vanished after load. The sent-and-saved log is a real collection: it answers "did anything leave this computer" and gives the privacy line its evidence.

**Results (`screens/results-panel.html`).** The Results rail panel is retired, and results become a section of the one inspector. With nothing selected, the graph inspector shows Overview, Style stack (with the legend) and Results (runs newest first, the needs-action strip on top). With a node selected, a Results section shows that node's value and rank in each run. Selecting a result makes it the selection (its state line, the weight used, its runs, Compare with..., Show as style layer); Esc or a click on empty canvas returns to the previous node selection. A result's items open as a tab in the table dock. Runs start from Quick actions, Ctrl+K and the main menu's algorithm catalog. No Measure... toolbar button this round; it is added only if the run-a-measure first click fails. Provisional until the round-4 tree test; a failed test reverses it.
Why: the owner's fourth review comment, and the ontology: a result is a property of the graph it ran on and has no identity apart from it (`information-architecture.md` section 10, rule 3). Right-panel tabs were rejected because they would hide a node's PageRank from its appearance. The move is owner-driven and not yet backed by study evidence (one remark from a participant who had moved over from Gephi), so the test decides.

**Styles (`screens/styles-list.html`).** Styles leave the Graph panel for the right panel. With nothing selected, the inspector's Style stack section is the whole ordered stack, with drag handles, precedence (top wins) and the legend. With something selected, an Appearance section shows the same whole stack, with the rows that paint the selection highlighted and marked with the property each wins, plus "+" to add a layer scoped to the selection (Figma's Selection colors pattern). A swatch opens the colour picker with Custom and Libraries tabs; Libraries holds palettes and the style layers from style files and recipes. The Look control sits in the Style stack header with a visible "Look" label.
Why: the owner's second review comment. Highlighting rather than filtering keeps precedence readable and answers "why is this node not the colour I expected", because the overridden layer stays visible. Both states render one stack, so a canvas click never unmounts a drag in progress. Showing the local styles when nothing is selected is Figma's own convention.

**Inspector (`screens/inspector.html`).** Redrawn to the new sections: Overview, Style stack and Results with nothing selected; Appearance and per-run Results with a selection; a result as its own inspector kind. Every attribute shows where it came from ("riskScore: from transactions.csv, not computed by graphty"); for the flagged account, the alert rule and time appear as the fixture's own columns. Directed weighted graphs show in and out totals (weighted in-strength and out-strength, proposed to graphty-element and drawn as proposed). Path states 8 and 11 are redrawn to match the sets-and-paths mock, and "Create path to style" becomes "Keep path".
Why: the owner's fourth review comment; the round-3 flagged-account finding ("why was it alerted") generalised into attribute provenance instead of an Alert section only one persona needs; and the inspector's path states contradicted the sets-and-paths mock.

**Export dialog (`screens/export-dialog.html`).** One export dialog with three ways in: Export... in the project-name menu, the Data panel header, and the table dock's "Export table..." (which opens with Table chosen and always writes its methods file). Ctrl+Shift+E opens it. The choices read "Findings report (.html)", "Figure (.svg)" and "Image (.png)"; there is no disabled PDF row and no "recommended" or "proposed" label, because the owner decided. A figure has a white background by default; Look: Screen, Print or High contrast; labels "top N by this layer's value" or "above a threshold"; and "N labels hidden to avoid overlap: show list". The legend's footer carries the normalization and the weight answer, and figure text is 8 pt at physical size. In the Print look the preview shows the file as written and its grey version side by side.
Why: the owner's first review comment and the direction on data management; the round-3 finding that two exports produced different files (the cause was two dialogs, not two routes); and the owner had already decided the HTML report and SVG-now-PDF-later and objected to being asked again.

**Export flow, and signed figures that print correctly in grey (`flows/export.html`).** Redrawn on the new entry points and the single dialog. The signed fold-change figure uses the new Print look: darkness shows the distance from 0 on both sides, an up or down triangle shows the sign, and a circle marks values inside the stated dead band (fill against outline instead, if a shape layer sits higher in the stack). The grey check tests every pair of bins on opposite sides of the midpoint and reports either "Increases and decreases stay apart in gray (48 below 0, 36 above)" or "Values just above and below 0 print as the same gray". Print is one look that meets both the grey constraint and the colour-blind constraint; there is no combined menu option.
Why: a severity-4 round-3 finding: the darkening-only ramp printed the largest decreases palest, and a check that tested only the two ends passed it. Darkness alone cannot carry both size and sign, so a second channel is required, and shape is already a style-layer property.

**Start screen and header (`screens/start-screen.html`).** The "M" avatar is removed and its slot left empty. The privacy line "Nothing has been sent from this project" sits under the project name in the left panel header on every frame (visible when the panel is minimized) and links to Data > Sent and saved; after the Assistant is used it reads "Sent to the Assistant: 2 questions. Nothing else." The recipe binding is redrawn: Apply stays disabled (announced as disabled but focusable) with "Waiting for your table"; "Add your table..." is the main button and takes focus; the network reads "Sender's network: STRING v12" with Replace...; and no column of the network is offered as the recipient's fold change.
Why: the owner's third review comment (an avatar promises accounts, and a name in that slot still reads as signed in). The privacy-line finding is void because the kit hid the line, so it is retested before anything more is built on it. The recipe severity-4 finding is a redraw of an already-specified design.

**Recipe binding, sender's side (`screens/binding-step.html`).** The same recipe-binding redraw as the start screen. The sender's side of the same recipe shows "What your recipient does: add a table with a gene id and a fold change column, then Apply", names the layout with its settings in Details, states "filter, then runs", and says "Not included" instead of "Left behind".
Why: the round-3 severity-4 finding that a recipe still waiting on the recipient's data looked finished, and the recipe-sharing finding.

**Update with new data (`flows/replace-and-recipe.html`).** Redrawn with the recipe binding fix and the weekly update: "Update with new data..." from the Data panel and the project-name menu; Replace is the main button when the columns match; the version row carries a "What changed" summary that only restates count splits graphty-element can compute ("27 components (was 1): 26 accounts have no transfers in this version"), never a motive; large jumps carry the "large change" mark; "closed" becomes "not in April"; and export gains a "Compared with Apr 3" column with the values new, in both, and no longer present.
Why: round-3 weekly-update findings (jumps were not explained, and "closed" was misread). Explaining a change by counting is honest; explaining it by motive is not. "Dropped" already means rows lost at import, so it is not reused.

**Load step (`screens/load-step.html`).** The load step no longer asks what a weight means. Numeric edge columns load as attributes with no preset weight role, which removes the only thing that blocked Load. Plain wording: "214 pairs appear more than once. Keep each / Combine into one" (secondary line: parallel edges); "37 proteins have no partner in the file. They are loaded unconnected." A column's weight state shows as one of three sentences.
Why: round-3 findings: the weight was described five different ways, and the meaning question at load blocked recipients who could not answer it.

**Run and read (`flows/run-and-read.html`).** Regenerated from `kit/fixtures.json`, since it was the one known hand-typed page. Every result's state line reads its weight from the run record ("Weight: amount, used as capacity. Change..."), with "412 of 9,380 transfers have no amount. They are left out of weighted paths." The meaning question appears at the first weighted run, with the answers distance, similarity, capacity and reliability ("how likely it is real"), each with one line on what it does to this measure. The run form's existing "Weight by" offers "amount (project answer)" and "None for this run". Changing the project answer is one undoable step: "Weight: amount no longer used as capacity. 3 results re-run." Top nodes come first; "how sure" covers the N shown, states the near-tie threshold and whether the measures agree on the top; "no near-ties" is deleted. Communities read "8 communities and 2 unconnected nodes", with a plain reading of modularity and each group's hub counted by degree inside the group. No multi-seed stability control is drawn.
Why: the round-3 severity-4 weight finding (a path still said "unweighted" after a weight was chosen), the weight-meaning finding, and the how-sure and communities wording findings. Stability runs are proposed to graphty-element, not drawn.

**Comparing two rankings (`screens/comparison.html`).** Measure names instead of A and B, and "ranked higher by PageRank" (rank 1 is the top, said in the column's reader line). The order is the scatter, then the top-N overlap ("41 of the top 50 in both"), then one Spearman line: "Spearman 0.52, leaving out the 1,153 accounts at 0 on both (0.78 with them)". The info icon works and names the tie convention (average ranks). Compare is entered from a result row, or from a table row as "Compare Community 1 with the rest", never from Appearance; the row and the comparison both say "Median PageRank". Details opens the run record.
Why: round-3 comparison findings: 0.781 sat under "they disagree" with no reason given, Compare was filed under Appearance, and the row and the comparison used different statistics and showed opposite signs.

**Sets and paths (`screens/sets-and-paths.html`, `flows/sets-and-paths.html`).** Every path and edge table shows the edge's time column right after the endpoints. "Around a node" (one name everywhere: Neighbors) gains a direction and an optional window on any date column, replacing a money-specific trace. A hop that goes back in time is drawn dashed with a clock mark and named "earlier than the hop before" in its row. A "Follow time order" path option is drawn as a proposal to graphty-element. A trace ends with one computed summary line. "Top N, with neighbors" splits into "Keep top N" and "Add their neighbors".
Why: the round-3 severity-4 finding on money paths shown with no times, generalised so it is not a feature for one persona; and one name for the neighbours action.

**Flagged account (`storyboards/alert-triage.html`, `flows/alert-triage.html`).** Adds the transfers pages the flagged-account task needs. The evidence is "Export the selection's edges" (the account's own transfers). The alert rule, the alert time and the file riskScore came from are the fixture's own columns, shown through attribute provenance. The HTML report is recorded as decided.
Why: the round-3 result of 0 of 3 came from a page set with no transfers screens, and is void until rerun.

**Find (`screens/find.html`).** Ctrl+F opens Find everywhere inside the app frame and is on the key sheet. The scope row reads "Searched 7 recent projects -- Search all 23". Each hit gets one line of facts ("ACC-705989 -- Mule ring, Aug 12: 14 transfers, $48,200 out"). Open says plainly that it closes the current project. "Bring in its links" routes to the existing Add data. No "Open beside this one".
Why: round-3 keyboard and older-projects findings. Projects side by side are a new multi-document concept that one task does not justify.

**Keyboard walk (`screens/keyboard-walk.html`).** Shift+Arrow stays (owner decided). The walk is shown on the Les Miserables graph with Javert on the page. Going to a node moves the walk without selecting it; Enter selects. graphty-element holds the walk's start, so it survives Tab. The walk line names the region ("Walking the drawing"); the key sheet groups keys by region; every region has a heading; the welcome plays once per project. Key C is removed.
Why: round-3 keyboard findings. The clash between Shift+Down in the walk and Shift+Down in the table is a region-naming problem, and was accepted when the owner decided. Alt+Arrow is the browser's Back and Forward.

**Notes panel (`screens/notes-panel.html`).** "No author" is removed. Each note shows its author and full date and time ("Adam Powers, Sep 24 2026, 10:14"); the author is shown only when the project holds more than one. The empty panel's button is "Add a note..." (no Note tool). Add note with nothing selected opens with focus on "About:" (the whole graph, each kept set, or "Select something first"), and the next Add note keeps the same subject. "Fixed" becomes "frozen set" with the verb Freeze (the graphty-element API kind `fixed` is unchanged). Restore reads "Bring back Mule ring (14 accounts, as kept Sep 24)".
Why: the owner's correction (notes carry their author, and there is no Note tool); the round-3 notes first-click finding; and "set" keeps one noun per concept.

**Take a note (`screens/take-a-note.html`, `flows/take-a-note.html`).** Redrawn to match the notes panel: the author rule, the About field, no Note tool, and the report as one self-contained HTML file, marked decided.
Why: the owner's decisions on authorship, the Note tool and the report format.

**Weekly return (`storyboards/weekly-return.html`).** Draws the reopen state restoring the saved selection, with the state line "Selection restored: 14 nodes".
Why: decided on the owner's behalf: the project file saves the selection when it closes.

**Main frame at rest (`screens/frame-at-rest.html`).** A caption says why nodes are labelled ("Labels: the 12 accounts with the most transfers"); the state line carries the "Loaded:" clause; the table strip is visible at rest. No visible text labels on toolbar icons.
Why: round-3 orientation findings. Toolbar labels stay rejected until a live hover test says otherwise: tooltips exist, and still screenshots cannot show them.

**Filter chip (`screens/filter-chip.html`).** Counts name what they count: "Density 0.08, of the filtered graph (77 of 1,204)". A step that removes nothing reads "Kept all 77" and does not switch to filtered mode. A count that jumped shows its cause beside it. Degree headers read "Degree (filtered)" or "Degree (full graph)", with no blank cells. "9,380 transfers (8,102 distinct pairs)". The protein data's filtered state is added.
Why: round-3 findings on degrees with no scope, filtered statistics read as the whole answer, and counts of different things side by side.

**Undo (`screens/undo.html`).** Reuses the canonical steps row from the filter chip mock. The undo line stays until the next action, and a double undo names both steps.
Why: the two mocks contradicted each other, and round-3 undo polish; undo follows version B, decided on the owner's behalf.

**Past the drawing limit (`screens/past-drawing-limit.html`).** The table lists its rows past the drawing limit, with a plain "Keep these 200 rows" step.
Why: the round-3 top-200 finding, to be rerun on the fixed mock.

**Colour by value (`screens/colour-by-value.html`, `flows/colour-by-value.html`).** The size layer has one name everywhere ("Size: degree"). Its key draws five true-size circles at round quantile values and says whether the size maps to area (square root) or is linear, and whether repeated values are counted. Hover or selection shows "degree 34".
Why: round-3 size-key findings.

**Preferences (`screens/preferences.html`).** Adds "Your name on notes and recipes" (the author setting). There is no account concept anywhere.
Why: the owner's authorship decision and the avatar's removal.

**Where your data goes (`screens/data-location.html`).** Becomes Data > Sent and saved. Two sentences are added: how long the Assistant's key is kept and how to forget it; and that no password or key ever appears in the log, an exported log or a project file.
Why: the round-3 data-page finding, and it gives the privacy line one home.

**Version history (`screens/version-history.html`).** The list moves to Data > Versions; reading a past version stays a mode. Version rows carry the computed "What changed" split.
Why: the owner's direction on data management.

### Considered and rejected

- Right-panel Selection and Results tabs. They hide a node's result values from its appearance, and they recreate a Results place on the right side.
- Five-place rails (Data, Sets and paths, Steps, Notes, Compare; or separate Filters and Views places). The filter chip already homes filter steps, Compare is a mode entered from a result, and views and sets are Graph objects.
- Alt+Arrow as the walk keys. The owner decided Shift+Arrow, and Alt+Left and Alt+Right are the browser's Back and Forward.
- The privacy line, or the author's name, in the avatar slot. Either keeps a header badge that implies accounts; the slot stays empty.
- The style stack in a popover. The owner asked for an ordered, visible stack.
- Appearance filtered to only the layers that paint the selection. It hides the overridden layer, so precedence cannot be read.
- A combined "Grey plus colour-blind safe" Look option. Print meets both constraints on its own.
- A darkness-only diverging grey (both ends dark, the midpoint light) with no sign channel. +3 and -3 would print the same.
- Visible text labels on every toolbar icon. Tooltips exist, and the round-3 evidence came from still screenshots; held for a live hover test.
- A Measure... toolbar button. Quick actions, Ctrl+K and the catalog are tested first, and the button is added only if they fail.
- "Open beside this one" in Find. A multi-document concept that one task does not justify.
- A "Trace money out of..." step for one persona, and an Alert section in the inspector. Generalised instead into Around a node with a direction and a date window, and into attribute provenance.
- A "What changed" summary that states motives. Only computed count splits are shown.
- Drawing multi-seed community stability, community matching across versions and a bridging measure as if they existed. They go to graphty-element as proposals.
- A separate "Loaded with:" line on the canvas. It is folded into the state line and the Data panel's source row.
- A "Share and export" verb section in the Data panel. Data lists objects, each carrying its own verb, plus the sent-and-saved log.
- A new per-run weight override control. "Weight by" on the run form already does this.
- Tasks retired from round 4, because they are stable and their screens are unchanged: rankings agree, rankings scatter, share without data, the size key, undoing the middle step on the transfers data, top 50 to Excel, did anything leave, and CSV to a reviewer. "Get back" is kept as one regression session.

## Round 4

Every participant in these rounds is simulated. The evidence behind each item is in `study/round-4/insights.md` and `study/round-4/tree-test.md`.

### Decisions

**The mock kit (`kit/`), before any round-5 session.** Every task screen is redrawn on the new shell: no Results place on the rail, no "Export files" button in the top right, no avatar letter. Every number shared between pages is taken from `kit/fixtures.json`, and the cross-page disagreement check is proved by making it fail on a planted mismatch (for example 300 nodes on one page and 298 on another). Three inconsistencies found before the round (see `study/round-4/tree-test.md`) are fixed: "Update with new data" lives in one place, it is present in the project-name menu, and the at-rest frame shows no betweenness column and no Valjean highlight.
Why: about 20 round-4 sessions ran on screens that lacked the task's data, and about 24 showed the old and the new navigation side by side. 7 of 16 first-click answers came from a betweenness cell that should not have been visible. Without these fixes, round 5 would measure the mocks again, not the design.

**Participant view on the navigation page (`storyboards/navigation.html`).** The page is made to render in the participant view, and the way out (Esc, and the faint 32 px corner control) is shot with `kit/shoot.mjs` at 768 px wide. The owner feedback log's "Participant view was a trap" entry is updated once this passes.
Why: the owner raised the participant-view trap. The page the owner was pointed to still renders blank in that view, which is a regression against the owner's item, not a small mock defect.

**One File list (`storyboards/navigation.html`, `screens/data-panel.html`).** Main menu > File and the project-name menu open the same list, built from one definition: Open..., Update with new data..., Export..., Download project file, Version history, Rename, Duplicate, Close. The project-name menu keeps Export..., as the owner asked. With a project open, Open... never replaces it: the file opens as a new project, and the current project stays in Recent. There is no "update or open as new?" question.
Why: 14 of 16 participants opened File to export a picture. Two command lists had already drifted apart ("Replace data..." in one, "Update with new data..." in the other); one list cannot drift. A non-destructive Open removes the data loss for the 3 of 16 who picked Open, with no extra dialog.

**Style files become recipes (new).** The separate style-file concept is dropped. A style file becomes a recipe that holds only styles, and both Main menu > Recipes > Apply... and Data > Recipes accept it. "Recipes" is the one word everywhere.
Why: the tree test is text only, so its result for finding a saved style (63% correct, 6% direct, 9 of 16 in Recipes) is a real information-architecture finding, and the earlier dismissal of it as a mock defect is reversed. Removing a noun fits the owner's call for data management as one coherent area.

**What a bigger weight means (`screens/binding-step.html`).** The meaning of a weight is chosen for each run, as a graphty-element run option, prefilled from the column. The label reads "A bigger amount means: a stronger link / a longer distance", with one line explaining each choice. The column's setting is renamed "Default for new runs", and the run's Details names the choice. No "Used by" link on the column for now.
Why: a confirmed severity-4 finding needs the per-run choice whatever the tree test shows. The tree-test task that asked "which edge column" steered people to Data, so the 13 of 16 who went to Data first do not prove the column needs a link; the link waits until a reworded task still sends people there.

**Results stay in the inspector and the table (`screens/results-panel.html`), a studio decision.** Round 4 missed its bar as written: the three tasks that look for a result reached 63%, 0% and 69% direct success against a 70% bar. The placement is put to a two-arm tree test in round 5 (Results in the inspector against Results as a rail place), with its answer key frozen before the round. Round 4 is not rescored.
Why: every miss went to the table's Search, a column's sort or the weight column; none went near a rail place, so the misses do not argue for a rail place either. Rescoring after the fact would move the goalposts. The owner asked the studio to reconsider and test the placement, not to choose it, so no question goes to the owner.

**The table dock (`screens/table-dock.html`).** The table's Search lands on the matching row with every result column visible. The footer shows the sum of any numeric column over the current selection, computed by graphty-element, so selecting a path or a tie gives its total. The rank column marks near ties ("Near tie"). One line states the tie rule once ("Within 1% counts as tied. Change..."), and every value is shown to 3 significant digits. Columns of changes sort by signed value.
Why: one mechanism replaces three separate ways of totalling money. It answers the severity-3 finding on reading ties, and the signed sort answers "which genes went up most" without an "Always label" list.

**Weighted degree (new).** graphty-element's catalog gains weighted degree (in, out and total), each with one plain line saying what it measures. Task words such as "important", "groups" and "cheapest route" find measures in Quick actions.
Why: this one measure answers money in and out per account and a ranking by money flow. 3 of 16 backed out of the algorithm list because nothing in it used the words of their task.

**The legend (`screens/styles-list.html`).** Clicking a legend label selects that group. Clicking its swatch, or choosing Change color... in the entry's menu, opens the colour picker with unused colours first. An edit to a group painted by a run is saved against the category value and survives a re-run, which removes the "Edit a copy" lock. Every swatch has a spoken name, and each change is announced ("Group 3 is now Orange, was Teal"). A single too-close flag with Fix... sits on the legend entry and is announced.
Why: one mechanism answers both colour findings and the severity-4 finding on restyling without sight. Restyling two groups had the lowest round-4 score, 2.67.

**The Export dialog's looks (`screens/export-dialog.html`).** The Print look's "no change" band is removed. Each look shows one visible line saying what it changes and what it leaves alone, for example "Print: darker lines, larger labels. Does not separate close colors." The dialog's Look control reads "for this file only". The grayscale file option is deferred; the Print look keeps its greyscale check.
Why: a look changes how things are drawn, not how values are grouped. Removing the band also removes a second set of counts (120, 133 and 47) that contradicted the first. The owner decided on a greyscale check, not a grayscale file.

**Undo (`screens/undo.html`).** "Undo back to here" is deleted; each filter step's own delete on the filter chip covers it. Selection changes stay out of undo, as in Figma. A cleared selection is reported on the existing one-line undo notice: "Selection cleared (18 nodes). Previous selection". Edit > Previous selection stays; the separate Previous selection key is deleted, which settles the open choice between two keys on the undo page.
Why: "Undo back to here" is a command for a linear history in a filter model that is not linear, and it was the only route that lost the third step. Recording a clear as an undo step would empty Redo after one stray click. The notice reuses the undo line the owner approved (version B).

**Find and Go to (`screens/find.html`, `screens/keyboard-walk.html`).** On Enter, both Find and Go to put the keyboard walk's focus on the node, and neither selects it. Selecting happens only inside the walk, where Enter adds to the selection and Space toggles. The walk announces "N selected" or "Nothing selected" when it starts.
Why: Find selected the node and Go to did not, which left one keyboard participant with three nodes selected by accident.

**Comparing with the rest of the graph (`screens/comparison.html`).** The existing Compare with... dialog gains "the rest of the graph" as a target. The agreement number (0.663) is explained in one plain sentence. No spread per column and no statistical test.
Why: this answers the "do these groups differ" task, whose score fell from 4.75, without a new command. graphty is not a statistics package.

**Weekly update (`storyboards/weekly-return.html`).** One reconciling sentence is added: "58 groups with transfers, plus 26 accounts with no transfers." No counts per random seed.
Why: re-running a measure several times with different seeds does not exist in graphty, so counts per seed would describe nothing real.

**Notes (`screens/notes-panel.html`).** In a note, Enter starts a new line and Ctrl+Enter posts. A citation in a note opens the run's Details.
Why: one participant nearly posted half a note, and a note is several lines of prose.

**Applying a recipe (`screens/replace-and-recipe.html`).** A recipe names the network it expects ("Expects: a protein network (not included)"). The sample card moves away from a recipe that is waiting for data.
Why: participants applied a recipe to the wrong network.

**Sets and paths (`screens/sets-and-paths.html`, `screens/past-drawing-limit.html`).** Bridges: the wording becomes "Not on a bridge edge", and the style row reads "Shows the Bridges result". After a run, the table suggests "Keep top rows by that run's column". On sampled results, the set is named exactly and the table states "N rows are within the error bound of row 200". Neighbors shows its scope before it runs.
Why: each is a small confirmed wording or feedback fix from round 4. The top-200 task scored 3.33.

**Where your data goes (`screens/data-location.html`).** Every empty colon for the hosting country, telemetry and the organization-wide Assistant switch is replaced with "Not decided yet".
Why: `owner-feedback.md` does not answer these. Milestone 4 already asks them, so milestone 5 lists them once as still open and asks no new question.

**Milestone 5 (new: `milestones/05.md`).** It leads with the before and after for each of the owner's review items, drawn on the rebuilt screens. It asks the owner nothing about SVG, PDF, the recipe format or where Results live. It lists hosting, telemetry and the Assistant switch once, as still open from milestone 4. It states that the Results bar was missed and names the two-arm test that decides it. Every result carries the note that the participants are simulated.
Why: the owner asked not to be asked decided questions again, and to see the before and after. Where Results live is a reversible studio decision under test.

**Alert triage (`storyboards/alert-triage.html`, the flagged-account task).** Two findings rejected earlier are reopened as unconfirmed gaps in behaviour and probed in the flagged-account task. Following money forward in time: a fewest-hops path cannot respect time order, and the check compares each hop only with the row above it. Search across projects: a hit shows no owner and no date.
Why: both describe how graphty behaves, not a wrong number on a mock, so a rejection for mock fidelity cannot dismiss them.

### Considered and rejected

- Moving Results back to the rail now. No miss landed near a rail place, and the round-5 two-arm test decides it.
- Rescoring round 4 with the table's Search and a column's sort counted as success. That moves the goalposts; the new answer key applies to round 5 only, and it is frozen first.
- Asking the owner where Results should live. The owner's fourth review item asks the studio to reconsider and test, so the answer is the studio's to find by testing.
- A "Used by" link on weight columns. Deferred until a reworded task still sends people to Data.
- Making a cleared selection an undo step. It would empty Redo after one stray click.
- Renaming "Undo back to here" instead of deleting it.
- An "Update this project or open as new?" dialog on File > Open. Making Open non-destructive removes the data loss without a question.
- Add a layer > From a style file, and the label "Recipes and style files". A second route and a second noun for one thing.
- A grayscale file option in Export. Deferred: the owner decided on a greyscale check, not a grayscale file.
- Counts per random seed in the weekly update. Re-running with several seeds does not exist.
- An "Always label" list for genes. A signed sort, a kept set and a label layer already cover it.
- A spread per column and a statistical test in Compare with the rest of the graph.
- Replacing each look's explanation with a tooltip. The finding was a misreading, so the line must be visible text.
- Asking about hosting, telemetry and the Assistant switch again in milestone 5. Milestone 4 already asks them.
- Removing Main menu > Recipes. 9 of 16 looked there.

## Round 5

Every participant in these rounds is simulated. The evidence behind each item is in `study/round-5/insights.md` and `study/round-5/tree-test.md`. `study/round-4/` is the record of the round before and is cited as evidence only.

### Decisions

**The mock kit (`kit/`), before any drawing: a gate that reads the rendered page.** `kit/shell.mjs` becomes the only source of the frame on every task screen: the rail, one right panel, no avatar slot and no top-right Export button. A term sheet in `kit/` drives `kit/check.mjs`, which reads the rendered page, not its source, and fails a page on any of four things:
- a retired string: "Export files", an avatar letter, "Style files" or "style file", "Undo back to here", "Previous selection key", "Default for new runs", "weight 0.98", the Print look's sentence "within ... of 0 drawn as no change", and "result" used to mean a value;
- a missing required string, mapped per page and per state: Ctrl+Enter on note-editor states, "Near tie" on ranked states, "Not run:" on refused-run states, "Money in" and "Links in (count)" on transfers states, "Selection restored" on the restore state, and a scope such as "on 60 of 77" on values computed on a subset;
- a count that differs from `kit/fixtures.json`;
- one capability drawn in two homes: a Results section in the empty-selection inspector next to the Results rail place, a Previous selection command next to the Ctrl+Z restore, or a second Apply dialog.
Frames marked `data-frame="before"` are skipped and captioned Before. Each of the four rules is proved by planting a violation and watching the check fail.
Why: 9 of the 21 confirmed severity 3 and 4 findings, and 7 of the 18 repeated tasks, were void because decisions made after round 4 were never drawn. Counts disagreed between pages for the third round running. Eight pages still show "Export files": navigation, recipe-apply, table-dock, first-look, comparison, flows/alert-triage, storyboards/recipe-travels and storyboards/weekly-return. One global list of required strings would fail every page, so the strings are mapped to states.

**Navigation (`screens/navigation.html`, `storyboards/navigation.html`).** Redrawn from the shell. Results becomes a rail place, with the line "Every run of a measure, with its settings and date." Opening a run shows its record in place: its settings, its date, Re-run and Compare with.... One File list and Recipes as decided after round 4. The blank participant view in `storyboards/navigation.html` is fixed and shot at 768 px wide, including its way out (Esc and the corner control).
Why: the rule frozen before the round was met on the side of moving: tree task 3 reached only 25% direct success with Results in the inspector (arm A), and with Results on the rail (arm B) the same paired personas did better by 7 direct answers out of 48, above the frozen limit of 4. The run's record opening inside the run is what made arm B direct (12 of 12). The label stays "Results" because that is the label that was tested; "Runs" is tested in round 6 as a labelled variant.

**Inspector (`screens/inspector.html`).** The section "Results with nothing selected" is deleted. Values stay on the node, in the inspector, and in the table. A selected node gains "Show label anyway"; it writes to one user style layer, "Labels shown anyway (this file)", which is where such labels are listed, reordered or removed. The panel of a group or a set gains "Compare with the rest".
Why: runs get one home. One participant read an empty Results section as "nothing has run". Forcing a label is styling, and the project's rule is that styling goes through a layer. 14 of 16 opened the group's own panel first when asked to compare a group with the rest.

**The frame at rest (`screens/frame-at-rest.html`).** Redrawn from the shell with one right panel, no avatar and no "Export files". The lightning button is labelled "Quick actions". Counts carry their unit ("412 edges (rows)", "388 linked pairs"). There is no "what stands out" line.
Why: the owner's first and third review items (the avatar and the top-right Export) are still unmet on disk. The "what stands out" line waits until a rule for choosing the fact is written.

**Results place (`screens/results-panel.html`).** The page becomes the Results rail place. A run is named by the options that differ plus its date ("PageRank, damping 0.85, Sep 28 10:14"), never by how long it took. Re-run reads "Re-run (keeps Run 1)". Compare with... lists earlier runs of the same measure first. A refused run reads "Not run: would take about <estimate>" with no failure mark; the subset offer reads "Exact, on the 5,318 nodes in <set>. This is a different graph." A failed run's row reads "Showing Run 1 (damping 0.85). Run 2 wrote nothing." with "Try WebGPU again", an explicit retry owned by graphty-element, not a fallback.
Why: run naming, the ambiguity of Re-run and the wording of refused and failed runs were each confirmed in three independent sessions. They are properties of the run, so they get one home.

**Table dock (`screens/table-dock.html`).** A ranked table opens sorted by the result that opened it, and its CSV keeps the "=" tie marks. Near ties are marked in the rank column ("#4, near #5") with one line stating the tie rule. The footer shows a total over the selection ("Sum of amount, 18 rows"). The New column menu offers weighted degree as "Money in", "Money out" and "Money in minus out" when the weight column is a currency, and as "Total <column> in" otherwise. The "Previous selection" button is deleted, and "Export files" is removed.
Why: all three round-3 regressions missed their bar (top 50 to Excel scored 4.00 against 5.3). For money, 8 of 16 first clicked the table. The Previous selection button is replaced by the Ctrl+Z restore.

**Run and read (`screens/run-and-read.html`).** Redrawn on the new rail. Link-count measures are labelled "Links in (count)", "Links out (count)" and "Links (count)". Weighted degree appears in the catalog and in Quick actions under the money words. Every value computed on a subset carries its scope ("0.419, on 60 of 77").
Why: 4 of 5 money sessions failed because a ranking by link count looked like money. The scope rule was already decided and never drawn.

**What a bigger weight means (`screens/weight-role-trap.html`).** The column's "Default for new runs" and the grey lists of measures are deleted. Each weighted run asks "In this run, a bigger amount means:" with "Choose...", and Run stays disabled until a choice is made. The run's state line names the conversion ("Distance = 1 / amount"). The column's line describes only the data ("amount, dollars, 0.5 to 9,800").
Why: on first-click prompt 10, 9 of 16 went to the column's "Change..." because the column claims a meaning. Without a default, the meaning has one home, the run. This is reversible: round 6 keeps prompt 10's wording, and the prefill comes back if the extra click hurts.

**Data panel (`screens/data-panel.html`).** The separate "style files" row is deleted; "applied recipes" is the only row and opens the one Apply dialog. The file chip opens its source's row, with "Update with new data..." first. The panel says whether the edges shown are rows or linked pairs. Hosting, telemetry and the Assistant switch read "Not decided yet".
Why: "style file" is a retired noun. The chip link was decided and never drawn; on first-click prompt 8 only 31% succeeded and 8 of 16 clicked the chip.

**Applying styles from a recipe (`screens/replace-and-recipe.html`).** The pair "Apply style file on top" (preselected) and "Replace style stack with style file" is replaced. The dialog's first choice is "Use these styles", not preselected, with "No data inside." and a preview that names each of the reader's layers that will go. The rule belongs to graphty-element's StyleManager: a layer from the file replaces every reader layer that targets the same element kind (nodes or edges) and writes the same style property, and layers from algorithms' suggested styles are never replaced. So a degree-colour layer does replace a community-colour layer. The second choice keeps adding on top.
Why: the existing replace ("The 9 style layers here are removed", checked on the page) wipes the whole stack, algorithm layers included; that pair scored 19% on tree task 7. "Look" is already the Export dialog's word for Screen and Print, so "Use this look" is not used.

**Style stack (`screens/styles-list.html`).** The stack's "+" gains "From a recipe or file...", which opens the same Apply dialog under the one noun "recipe". "Style files" wording is removed. Shape by kind (5 kinds or fewer, plus Other) and "Mute categories under this scale" are offered as suggested layers the reader adds, never applied automatically.
Why: on tree task 7, 12 of 16 chose Add a layer; on first-click prompt 13, 9 of 16 clicked "+". A second route to the same noun is findability, not a second concept. Styling applied automatically outside a chosen layer breaks the project's layer rule.

**Colour by value (`screens/colour-by-value.html`).** In the legend, the swatch opens the colour picker and the label selects the group; each is its own tab stop, with spoken colour names. Arrow keys move between value rows, and Enter on a swatch opens the picker. "Other" is a light grey and lists its members. The too-close flag covers only colours the reader picked, and it shares one distance function with the Print look's grey check.
Why: 13 of 16 clicked a swatch, by three different methods. The black and dark-grey pair comes from the default palette, so that fix belongs in graphty-element.

**Comparison (`screens/comparison.html`).** Compare with the rest leads with size, edges inside and out, and density, one statistic per column, and states each comparison as a ratio in words ("density 2.1 times the rest"), never "higher" or "about the same". Each side of a run comparison is named by the option that differs. "Export files" is removed.
Why: verdict words imply a statistical test, and statistical tests were turned down after round 4; the page already says "Descriptive only; no statistical test."

**Undo (`screens/undo.html`).** Ctrl+Z restores a cleared selection from one slot, only when the selection was cleared (Esc or a click on empty canvas) and nothing undoable has happened since. It never touches the undo or Redo stacks, and Ctrl+Shift+Z never clears the selection again. While the slot is armed, Edit > Undo reads "Undo: restore selection (18 nodes)"; afterwards the undo line reads "Selection restored (18 nodes)". Any new selection or undoable change empties the slot. Edit > Previous selection, the "Previous selection key" picker and "Undo back to here" are deleted. The notice-only version is drawn too: "Selection cleared (18 nodes). Bring it back". Both reuse the reader message graphty.undo.done with a parameter. The behaviour belongs to graphty-element's history.
Why: all 6 get-back sessions pressed Ctrl+Z first, and 2 of 6 ended in a wrong state they did not notice. On first-click prompt 5, 16 of 16 reached for Undo; on tree task 13, 0 of 16 chose the notice although it was listed. The only objection raised after round 4, that it would empty Redo, is answered because Redo is not touched. Three routes back become one.

**Filter step recovery (`screens/filter-step-recovery.html`).** "Undo back to here" is removed. The undo line clears when the reader moves to another node or another filter step. When a filter step is open, the evidence export defaults to that step's edges.
Why: the rule "until the next action" failed in alert triage: one alert's notice greeted the next alert.

**Sets and paths (`screens/sets-and-paths.html`).** Wording "Not on a bridge edge". Dated Neighbors takes a Direction and a From date as graphty-element options. Each step's table footer splits its selection total into two sums, "Money in before Aug 3" and "Money out after"; no new widget.
Why: all 5 dated-trace participants added money in against money out by hand.

**Alert triage (`screens/alert-triage.html`).** Redrawn from the shell (no "Export files"), with the dated Neighbors options, the money words and the step footer sums, on account ACC-365386. Shaping nodes by kind is only an offered suggested layer.
Why: undrawn decisions voided the results of the flagged-account and dated-trace tasks.

**Taking a note (`screens/take-a-note.html`).** Enter makes a new line, and Ctrl+Enter (Cmd+Enter on a Mac) posts, with a hint under the box. A citation appears only when the writer adds one, and its chip shows the cited run's settings. "Saving as: Marcus. Change..." appears in the editor only. There is no "mark unsigned notes as mine" and no "Edited by".
Why: the foot text "Enter adds. Shift+Enter, new line." is the decided-but-undrawn defect word for word. The owner decided that the author is recorded "as given (blank if none is set)".

**Notes panel (`screens/notes-panel.html`).** Redrawn from the shell with no avatar. A note's author is shown only when the project holds more than one author. Citations show the cited run's settings.
Why: the owner's decision on authorship, and the removal of the avatar.

**Export dialog (`screens/export-dialog.html`).** The "no change" band is removed, and so is the grey check's sentence "within ... of 0 drawn as no change". The Print look says what it does to categories (how many cannot be told apart in grey) and prints the value at each grey step. The Look control says "For this file only". Rows in the existing list of hidden labels select their node, where "Show label anyway" lives.
Why: the band nobody set is still in the check's own sentence (lines 350 and 366 of the page), which would void the signed-grey task again.

**Weekly update (`storyboards/weekly-return.html`).** Each count gets its own noun (groups, matched groups, new groups), with one reconciling sentence ("35 groups in March, 65 in April: 30 new, 0 lost"). The unmatched March groups are listed. Agreement is stated as its meaning ("7 in 10 accounts stay grouped together"), with no adjective. "Export files" is removed. Counts come from `kit/fixtures.json`.
Why: "39" meant three different things, and the same April file showed 65 communities on one page and 12 on another.

**A recipe travels (`storyboards/recipe-travels.html`).** "Export files" is removed. The route is "From a recipe or file..." and the dialog's "Use these styles". "Expects:" and the list of what the partner must supply are shown exactly as the partner will see them. The match count is in words ("412 of 450 genes matched").
Why: decisions that were never drawn. Matching by alias is deferred.

**Lost GPU during a run (`screens/gpu-lost-run.html`).** Redrawn from the shell with Results on the rail, the failed-row line and "Try WebGPU again".
Why: the page still shows the old rail.

**Applying a recipe (`screens/recipe-apply.html`).** "Export files" is removed. The page uses the same Apply dialog as the replace page, with "Use these styles" first and not preselected.
Why: one dialog, one noun.

**Keyboard walk (`screens/keyboard-walk.html`).** The readout names its column ("amount 0.98"). The second Esc no longer names Previous selection.
Why: a retired term and a deleted command.

**Round 6 plan (new, `study/round-6/`).** A tree test with Results on the rail as the main arm, plus a variant labelled "Runs" on tasks 1 to 4. Task 12 scores the panel of the group or set as correct. Each persona runs each arm in a separate session. Undo is compared as the drawn notice alone against the notice plus the Ctrl+Z restore, in separate sessions. Tree task 7, first-click prompts 5, 8, 10 and 13, and the get-back task keep their exact wording. The money task runs only on screens that show weighted degree. The figure-for-a-reviewer session runs with Jordan. Every result says that the participants are simulated. No session starts until the kit gate passes.
Why: this gives a clean before and after on the decisions that were reversed. Round 5's lead for the rail was partly inferred from answers given in the same sitting.

**Correcting the owner feedback log (`study/owner-feedback-log.md`).** The log is corrected now, in plain words: the removal of the avatar and of "Export files", and the redraw on the new rail, are not done, and the pages are named; the participant view of `storyboards/navigation.html` is still blank. The Review 4 entry changes: Results moves to the rail as a studio decision, because testing answered it, and values are still read in the inspector and the table. "Done" is written only after the gate passes and the 768 px shot exists. The next milestone shows the before and after and asks nothing; hosting, telemetry and the Assistant switch are listed once as still open from milestone 4.
Why: the log was telling the owner things that are false, and the owner outranks every simulated finding.

### Considered and rejected

- Renaming the rail place "Runs" now. The rail won under the label "Results"; renaming would change two things at once, so "Runs" is tested as a round-6 variant.
- "Use this look". "Look" already names Screen and Print in the Export dialog.
- Reusing Apply's existing whole-stack replace for "Use these styles". It removes algorithm layers, and it is the pair that scored 19% on tree task 7.
- Keeping the weight meaning prefilled from the column. The column's claimed meaning is what sent 9 of 16 to "Change...".
- Verdict words ("higher", "about the same", "lower") in Compare with the rest and in the weekly update. They imply a test that was turned down. Ratios and numbers in words instead.
- "Mark unsigned notes as mine". It rewrites an author that the owner decided is recorded "as given (blank if none is set)".
- "Edited by" on notes. A local project has no second editor, and the field would change the published file format.
- A "what stands out" line after loading. Deferred until the rule that picks the fact is written down.
- A "Show anyway" control beside every hidden label, a hover toggle on each row, and a "Show all labels" control. They add clutter, are invisible at rest, or bring the label collisions back.
- A separate per-hop "in before / out after" report. The step's existing table footer is split into two sums instead.
- Automatic shape by kind, and automatic muting of categories under a diverging scale. Both style outside a chosen layer; they are offered as suggested layers instead.
- Matching by alias in graphty-element. Deferred until a second persona needs it; "Expects:" and the match count in words cover it for now.
- A "Used by" link on data columns. In the 6 sessions where it would have helped, nobody picked it.
- A separate money-flow panel and a Measure... toolbar button. Weighted degree in its line, in Quick actions and in the table's New column covers it.
- Redrawing any new design before the kit gate passes.
- One global list of required strings in `kit/check.mjs`. It would fail every page; strings are mapped per page and per state.
- Writing this round's triage into `study/round-4/`. That folder is the record of round 4 and is cited as evidence.
