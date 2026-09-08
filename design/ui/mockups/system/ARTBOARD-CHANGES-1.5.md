
## ImportOptions

State after the edit: `Import options -- delimited file, nothing loaded`. Dialog
is 720 wide, centered, over the dimmed Empty shell with the Welcome block.

1. **Data panel underlay, Sample datasets and Recent sections (left column,
   lines ~194-285).** Current: the Data panel draws a full six-row sample list
   (Karate Club ... Patent citations) and a two-row Recent list, plus the closing
   line "Recent files are cleared from Settings, Data management." -- every one of
   which is drawn again in the Welcome block 400 px to the right on the same
   screen. New (G3 + MIN-1): delete the sample rows, the recent rows and that
   closing line; render both as collapsed tier-1 section headers only --
   `Sample datasets` with a dimmed trailing `6` and `Recent` with a dimmed
   trailing `2`, each with the chevron pointing right. Use the collapsed section
   header from VOCAB section 4 "Section header row with chevron (ControlSection)".
   Welcome keeps all of it; the Data panel is the duplicate region.
2. **Data panel underlay, Open file section (lines ~153-166).** Current:
   "Drop a graph file (or a nodes file and an edges file) here" above the three
   buttons, and "JSON, CSV or TSV, GraphML, GEXF, GML, DOT, Pajek, SIF, CX2"
   below them. New (G3 + MIN-11): delete both strings -- the Welcome drop zone on
   the same screen carries the identical sentence and the identical format list.
   Keep `Open File`, `Open from URL` and `Paste data` exactly as they are
   (IK-8 never list).
3. **Column grid header, `type` column (the guessed one, lines ~576-592).**
   Current: a Role chip reading "Edge type" with an amber border and a `guessed`
   line in the detail slot; no menu is drawn anywhere in the dialog. New (NAV-3):
   draw the role menu OPEN below that chip -- a 160 px popover using the VOCAB
   section 9 "Dropdown menu" frame, rows `Source`, `Target`, `Weight`, `Time`,
   `Edge type` (checked, `background: #28364e; color: #4a7ee8`), `Edge
   attribute`, a 1 px `#374047` divider, then `Rename...` and `Skip`. Rename and
   Skip move out of the header into this menu. The chip itself is the control, so
   its chevron stays. The popover's parent cell needs `position: relative;` and
   the popover `z-index: 25;` so it clears the grid.
4. **Column grid header, all six detail slots (lines ~509, 528, 548, 568, 587,
   ~600).** Current: each cell ends with a two-line slot at `height: 34px`. New
   (DEF-4): change `height: 34px` to `height: 46px` on all six so the row stays
   aligned once the `ts` slot grows to three lines (next item). Nothing else in
   the cells changes.
5. **Column grid header, `ts` column detail slot (lines ~566-570).** Current two
   lines: `Kind: instant (a moment)` and `Format: ISO 8601`. New (DEF-4, and
   "instant" is a retired cost-class word): three lines, `Kind: A single moment`,
   `Measured in: Date and time`, `Format: ISO 8601`, each 11 px `#7a828e` with the
   value half in `#d5d7da` as now. Put the example on the cell's `title`:
   `title="Format: ISO 8601 (2026-04-01T00:00:03Z)"`. See VOCAB section 10
   "Unit-aware time slider labels", closing paragraph.
6. **Policies group (lines ~660-696).** Current: three rows, each carrying its
   own `Coming` tag in the label cluster. New (MIN-4): three contiguous unshipped
   rows collapse to one group note -- put a single `Coming` tag (VOCAB section 9
   "Coming tag") on the `Policies` header beside the word, delete the three
   per-row tags, and dim the three rows: label `color: #5f6873`, select text
   `color: #5f6873`, select chevron stroke `#5f6873`, `cursor: default`. The
   trailing data spans ("5 pairs", "no nodes file", "2 found") stay at `#7a828e`
   -- they report this file. Add one info circle on the `Policies` header, after
   the Coming tag, whose popover reads `Dimmed rows are not built yet.`
7. **Policies and Load rows, and the Identifier system / Parsing controls
   (lines ~486-491, 660-712).** Current: none of these controls has any on-screen
   explanation; the spec's sentences live in hover-only tooltips. New (IC-7): add
   a resting info circle immediately after the label text of `Identifier system`,
   `Repeated edges between two nodes`, `Edges that mention unknown nodes`,
   `Edges from a node to itself`, `Load`, `Parsing`, and after the bipartite
   checkbox's label. Copy the resting form from VOCAB section 10 "Info circle
   (6.7)" verbatim (14 px box, 12 px svg, `#a3a8b1`). Draw ONE of them open --
   `Identifier system` -- with the 250 px popover from the same snippet, text:
   `Which kind of ids the nodes use: account or device ids for transaction data;
   gene symbol, Entrez, Ensembl, STRING or UniProt for biology. Map identifiers
   reads it later.` plus a `Learn more` link. Its parent column needs
   `position: relative;`. The labels here are ragged-width, so no vertical line
   forms and IC-7's drop-two-circles guard does not fire.
8. **Column grid header, `amount` detail slot (line ~534).** Current:
   `Treat as: strength`. New (IC-8): add the resting info circle immediately after
   the words `Treat as:` and before the value. Same snippet as item 7.
9. **Dialog title row (lines ~443-446).** Current: `Import options` then dimmed
   `fraud-ring-synthetic.csv, 38 KB`. New (DEF-5): dimmed half becomes
   `fraud-ring-synthetic.csv, 38 KB -- delimited file`. Verbatim from VOCAB
   section 10 "Strings this revision standardizes", Import title row. **Collision
   resolved:** DEF-5's specificity rule would pick "guessed column" over
   "delimited file" here, but DEF-5 also names this artboard's canvas title as
   "Import options -- delimited file, nothing loaded"; the named title wins, so
   both read `delimited file`.
10. **Dialog body, summary block (lines ~445-446).** Current two lines: "Detected
    CSV, comma separated, 617 rows with a header. The rows look like edges." and
    "200 nodes, 612 edges, directed, weighted by amount, timed by ts, 5 repeated
    pairs, 2 self-loops." New (DEF-3, "the body opens with the summary and nothing
    else"): one 12 px `#d5d7da` line, verbatim
    `200 nodes, 612 edges, directed, weighted by amount, timed by ts`, then the
    NAV-3 guessed line below it (next item). The format, separator and row count
    are already stated by the `Detected format` select and the grid footer; the
    repeated-pair and self-loop counts are already stated on the Policies rows.
11. **Dialog body, under the summary (new line).** Current: nothing. New (NAV-3):
    an 11 px line `1 column was guessed.` followed by a `Review` link in
    `#5b8ff9`, with two spaces between them. Verbatim from VOCAB section 10
    "Strings this revision standardizes", Import guessed line.
12. **Grid footer (line ~651).** Current: "Showing 5 of 617 rows. Click a column
    header to change its role, type or name." New: `First 5 of 617 rows. Click a
    header to change a column.` -- verbatim from VOCAB section 10 "Import grid
    footer". (Rename and Skip are now in the chip menu, so the old sentence is
    wrong as well as long.)
13. **Welcome underlay, sample cards (lines ~319-380).** Current: every card's
    meta line carries a size -- "34 nodes, 78 edges, 4 KB", "20 nodes, 29 edges,
    3.5 KB", "200 nodes, 612 edges, 38 KB", "115 nodes, 613 edges, 9 KB",
    "150 nodes, 1,220 edges, 96 KB", "65,000 nodes, 210,000 edges, 14 MB". New
    (DEF-3): delete the size from the first five, leaving counts alone. The
    Patent citations card keeps `65,000 nodes, 210,000 edges, 14 MB` because it
    carries the `Large` badge and the "Opens in Performance mode, about 20 s"
    line -- there the size is the decision.
14. **Welcome underlay, sample blurbs (lines ~322-380).** Current: each blurb
    ends in a flat imperative -- "Try finding the groups.", "Try finding the
    bridges.", "Try coloring by conference.", "Try coloring by logFC and finding
    the groups.", "Try finding connected parts, or search for a node." New
    (NAV-1): render that closing sentence as a link, `color: #5b8ff9; cursor:
    pointer;`, still inside the same span. The rest of the blurb stays
    `#7a828e`. Karate Club's blurb has no closing imperative; leave it plain.
15. **Welcome underlay, recent rows (lines ~390, 397).** Current: "JSON, 20 nodes,
    29 edges, Yesterday" and "CSV, 148 nodes, 147 edges, Aug 28". New (MIN-11):
    delete the leading format word on both -- the filename above already carries
    the extension. They read `20 nodes, 29 edges, Yesterday` and `148 nodes,
    147 edges, Aug 28`.
16. **Column grid header, `src` and `dst` detail slots (lines ~509, 528).**
    Current: `100% filled`. New (MIN-2): delete both -- a complete column says
    nothing by saying so. The `memo` slot's `29% filled` stays.
17. **Column grid header, `memo` detail slot (line ~589).** Current: the word
    `Skipped` under the `Skip` role chip. New (MIN-2): delete it; the Skip chip
    and the dimmed cell already say it.
18. **Load row (lines ~700-706).** Current: label cluster reads `Load`,
    `subset load`, a `Coming` tag, then `Below the render ceiling`. New (MIN-2):
    delete `Below the render ceiling`. Keep `Load`, the technical name
    `subset load`, and the `Coming` tag (this row is isolated, so it keeps its
    per-row tag under MIN-4). The value select stays `Everything`.
19. **Status bar (lines ~430-434).** Current: ends with a grey dot and
    `AI: not configured`. New (MIN-8): delete that whole slot -- the AI slot is
    rendered only when a provider is configured or a call is in flight.
    `AI: not configured` is a retired string. The `No data loaded` slot and the
    `Reading fraud-ring-synthetic.csv, 38 KB of 38 KB` progress slot both stay.
20. **Activity rail, the four disabled items (lines ~40-59: Explore, Analyze,
    Style, Present).** Current: dimmed, no tooltip. New (IC-4 + IK-3): give each
    a native `title` naming the one action that would enable it, e.g.
    `title="Explore. Load data first"`, `title="Analyze. Load data first"`,
    `title="Style. Load data first"`, `title="Present. Load data first"`.
21. **Every icon-only control on the artboard (rail items, top bar Export
    caret, the two panel toggles, the dialog X, the drop-zone icon).** Current:
    no `title` attributes. New (IK-3): add `title="<verb>, <object where the icon
    does not sit on its object> (<binding>)"` to each. Shape from VOCAB section 10
    "Icon-only button, with its tooltip (6.8)". The dialog X reads
    `title="Close (Esc)"`.
22. **Guard, whole dialog (IK-8).** Do NOT convert any dialog control to an
    icon-only control: 6.8 does not apply to the Import options dialog at all.
    `Cancel`, `Import`, `Open File`, `Open from URL` and `Paste data` keep their
    text no matter how often they repeat.
23. **Gate, whole artboard (IC-1 + IC-3).** "Show help text in place" is off by
    default in 1.5, so every taught sentence sits behind its info circle and no
    taught sentence is drawn inline under a control. Reported text is pinned
    inline and must not be circled or deleted here: the detection summary, the
    per-column type and completeness, the row count, the guessed line, the
    `5 pairs` / `2 found` / `no nodes file` counts, and the status bar progress
    line.
24. **Leading comment block (lines 15-22).** Current: a 1.3-era comment. New
    (DEF-5): rewrite the first two lines as the STATE block shared by the four
    import artboards --
    `STATE: Import options, one dialog in four states. This file: delimited file,
    nothing loaded.`
    `OPENS: a delimited text file was dropped on the Welcome drop zone. Reopens
    from any Change link on a Loaded data line, the "Mapped as before" toast, the
    Data tier 3 list, the Insights card "Load the full graph", step 3 "Compare
    with current graph", Import as "Add attributes from a table", and the command
    palette (new in 1.5).`
    Also record, as comment text only: the canvas title for this stem becomes
    `Import options -- delimited file, nothing loaded` (do not edit canvas.json;
    it is shared), and NAV-4's completion toast is
    `Loaded 200 nodes and 612 edges in 1 s. Mapped amount to weight, ts to time.
    Details`, whose Details link opens Data with Loaded data expanded and the
    mapping line highlighted for two seconds.

## ImportRecognised

State after the edit: `Import options -- recognised export, nothing loaded`.
Dialog is 1120 wide (12 columns) over the dimmed Empty shell.

1. **Data panel underlay, Sample datasets and Recent sections (lines ~175-263).**
   Current: six sample rows, two recent rows and "Cleared from Settings > Data
   management", all of which the Welcome block redraws on the same screen. New
   (G3 + MIN-1): delete the rows and that line; render `Sample datasets` with a
   dimmed trailing `6` and `Recent` with a dimmed trailing `2` as collapsed
   headers (chevron right), VOCAB section 4 "Section header row with chevron".
2. **Data panel underlay, Open file section (lines ~156-163).** Current: the
   drop-zone sentence "Drop a graph file (or a nodes file and an edges file)
   here" and the format list "JSON, CSV or TSV, GraphML, GEXF, GML, DOT, Pajek,
   SIF, CX2". New (G3 + MIN-11): delete both -- the Welcome drop zone on the same
   screen carries them. `Open File`, `Open from URL`, `Paste data` stay.
3. **Policies group (lines ~679-709).** Current: a group `Coming` tag on the
   header (already consolidated) but three fully lit rows. New (MIN-4): dim and
   disable the three rows -- label `color: #5f6873`, select text and chevron
   `#5f6873`, `cursor: default` -- and add one info circle after the header's
   `Coming` tag whose popover reads `Dimmed rows are not built yet.` Use the
   VOCAB section 10 "Info circle (6.7)" resting form.
4. **Policy and control labels (lines ~658-712).** New (IC-7): add a resting info
   circle after the label text of `Edges from a node to itself`, `Load`,
   `Parsing`, and after the bipartite checkbox's label. **IC-7's guard fires
   here:** the policy labels sit in a fixed 160 px column, so a circle on every
   row would draw a vertical line -- drop the circle from `Repeated edges between
   the same two nodes` and `Edges that mention unknown nodes`, whose select
   values ("Combine into one, count the repeats and sum the weight", "Create the
   node") already state the policy in full. `Identifier system` keeps the circle
   and the open popover it already draws.
5. **Identifier system info circle (lines ~672-686).** Current: a 14 px box with
   the right glyph but `display: flex` and no `flex: 0 0 auto`. New (IC-2):
   normalize to the canonical geometry -- replace the wrapper div with the VOCAB
   section 10 "Info circle (6.7)" resting form verbatim (`display: inline-flex;
   ... flex: 0 0 auto;`), and set it to the open colour `#d5d7da` since its
   popover is drawn open. Leave the 250 px popover markup as it is; it already
   matches the snippet.
6. **Column grid, every Role and Type chip (lines ~491-551).** Current: chips
   with chevrons and the caption "First 5 of 1,104 rows. Click a column header to
   change its role, type or name, or to skip it." New (NAV-3): the chip is itself
   the control -- keep the chevrons and add `title="Change this column's role"` /
   `title="Change this column's type"`; Rename and Skip move to a header overflow.
   Replace the caption with `First 5 of 1,104 rows. Click a header to change a
   column.` (VOCAB section 10 "Import grid footer"). No role menu is drawn open
   on this artboard -- nothing was guessed here, and ImportOptions is where the
   open menu is drawn.
7. **Dialog title row (lines ~448-450).** Current: `Import options` then dimmed
   `ovarian_de_string.tsv, 212 KB`. New (DEF-5): dimmed half becomes
   `ovarian_de_string.tsv, 212 KB -- delimited file`. **Collision resolved:** the
   canvas title DEF-5 assigns this file is "-- recognised export, nothing
   loaded", but "recognised export" is not one of the six fixed entry clauses;
   the row takes the legal clause `delimited file` and "recognised export" stays
   the canvas title only.
8. **Dialog body, summary lines (lines ~450-451).** Current: "318 nodes, 1,104
   edges, undirected, weighted by combined_score, no repeated pairs, no
   self-loops." and "12 columns, 1,104 data rows, header row detected. Nothing
   was guessed." New (DEF-3 + MIN-2): line 1 becomes `318 nodes, 1,104 edges,
   undirected, weighted by combined_score`; line 2 becomes `12 columns, header
   row detected.` Deleted: the two zero clauses (the Policies block states them
   once, item 9), the duplicate row count, and the standalone "Nothing was
   guessed." **Collision resolved:** VOCAB still lists `Nothing was guessed.` as
   a standard string, but MIN-2 names that exact line as one not drawn; MIN-2
   wins and the line goes.
9. **Policies block trailing line (line ~699).** Current: "This file has no
   repeated pairs and no self-loops, so nothing changes on import." New: keep it
   verbatim -- it is now the only place those two zeros are stated, and it
   reports this file (IC-1 rule 1), so it is not circled and not deleted.
10. **Load control (lines ~721-725).** Current: label `Load (subset load)`, value
    `Everything (318 nodes, 1,104 edges)`. New (DEF-3, counts appear once, in the
    summary): value becomes `Everything`. The label keeps its canonical pair.
11. **Footer (line ~756).** Current: a `Load a subset` button carrying a `Coming`
    tag. New: unchanged -- it is an isolated unshipped control, so it keeps its
    per-row tag (MIN-4). Do not dim the footer row; `Cancel` and `Import` keep
    their text (IK-8).
12. **Welcome underlay, sample cards (lines ~326-388).** Current: every meta line
    carries a size. New (DEF-3): delete the size from Karate Club, Cat social
    network, Fraud ring, Airline routes and Ovarian cancer DE genes. `Road
    network, Oahu` keeps `62,000 nodes, 81,000 edges, 9.8 MB` -- it carries the
    `Large` badge and the Performance-mode line, so the size is the decision.
13. **Welcome underlay, sample blurbs (lines ~329-388).** Current: each ends in a
    flat imperative ("Try finding the groups.", "Try layers by attribute, or two
    sides.", "Try coloring by logFC and finding the groups.", "Try finding
    connected parts, or search for a node."). New (NAV-1): render that closing
    sentence as a link, `color: #5b8ff9; cursor: pointer;`.
14. **Welcome underlay, recent rows (lines ~400, 407).** Current: "JSON, 20
    nodes, 29 edges, Yesterday" and "CSV, 148 nodes, 147 edges, Aug 28". New
    (MIN-11): drop the leading format word from both; the filename carries it.
15. **Status bar (lines ~435-438).** Current: grey dot plus `AI: not configured`.
    New (MIN-8): delete the slot; `AI: not configured` is retired.
16. **Activity rail, the four disabled items (lines ~45-64).** New (IC-4 +
    IK-3): give each a `title` naming the enabling action --
    `title="Explore. Load data first"` and the same shape for Analyze, Style,
    Present.
17. **Every icon-only control (rail, top bar, dialog X, Data panel icons).** New
    (IK-3): add a native `title` equal to the tooltip sentence, binding in
    parentheses at the end. Shape from VOCAB section 10 "Icon-only button, with
    its tooltip (6.8)". Dialog X reads `title="Close (Esc)"`.
18. **Guard, whole dialog (IK-8).** No control inside the Import options dialog
    becomes icon-only; 6.8 does not apply here at all.
19. **Gate, whole artboard (IC-1 + IC-3).** Help text is off by default, so
    taught sentences live behind circles. Pinned inline and not to be circled or
    cut: the summary counts, the recognition banner, the per-column types, the
    grid rows, the "no repeated pairs" sentence, and the installed-filter line.
20. **Leading comment block (lines 15-27).** New (DEF-5): open with the shared
    two-line STATE block --
    `STATE: Import options, one dialog in four states. This file: delimited file,
    nothing loaded (a recognised export, so roles were pre-assigned).`
    `OPENS: a delimited text file was dropped. Reopens from any Change link on a
    Loaded data line, the "Mapped as before" toast, the Data tier 3 list, the
    Insights card "Load the full graph", step 3 "Compare with current graph",
    Import as "Add attributes from a table", and the command palette (new in
    1.5).`
    Record in comment only: canvas title becomes `Import options -- recognised
    export, nothing loaded` (do not edit canvas.json).

## ImportLargeFile

State after the edit: `Import options -- above the render ceiling, nothing
loaded`. Dialog is 720 wide over the dimmed Empty shell.

1. **Dialog body, summary block (lines ~416-433).** Current: a three-part block --
   a row with `netflow-2026-q2.csv`, `3.2 GB` and a `Large` badge, then "About
   1,000,000 nodes and 10,000,000 edges. Above the render ceiling (200,000
   nodes)." New (DEF-3, each fact once): delete the whole first row (name and
   size move to the title row, item 4; the dialog carries no Large badge) and
   replace the second line with one 12 px `#a3a8b1` line, verbatim
   `Estimated 1.0M nodes, 10M edges (from the first 256 KB).` The ceiling number
   is stated by the warning line below and nowhere else.
2. **Load control, the four unshipped options (lines ~601-628).** Current: four
   contiguous radio options -- `Neighborhood of an id`, `Nodes matching a
   filter`, `Only a time window`, `Everything for analysis and draw nothing until
   filtered` -- each with its own `Coming` tag. New (MIN-4): delete the four
   per-row tags; insert a 1 px `#374047` divider above the run with a single
   `Coming` tag (VOCAB section 9 "Coming tag") sitting on it as the group note;
   dim and disable the four rows (label and sub-line `color: #5f6873`, radio
   border `#374047`, `cursor: default`). Add one info circle after the `Load`
   header label whose popover reads `Dimmed rows are not built yet.` -- VOCAB
   section 10 "Info circle (6.7)".
3. **Warning line (lines ~426-428).** Current: "Above the render ceiling: drawing
   everything may be slow or run out of memory (estimated 2.4 GB). Busiest nodes
   is selected below so the graph opens smoothly; the whole file is still loaded.
   Import everything anyway". New (DEF-3 canonical string): replace with
   `Too big to draw everything at once: about 2.4 GB of memory. Busiest nodes is
   selected below, so the graph opens smoothly and the whole file still loads.`
   followed by the existing `Import everything anyway` link. Keep the amber
   triangle, keep the row above the fold, and keep it first in the body after the
   summary -- it is the only "this is not routine" signal left. New (DEF-6): add
   `title="Render ceiling: about 200,000 nodes, measured on this machine.
   Settings > Performance"` to the warning row.
4. **Dialog title row (lines ~415-417).** Current: `Import options` then dimmed
   `netflow-2026-q2.csv` with no size. New (DEF-5 + DEF-3): dimmed half becomes
   `netflow-2026-q2.csv, 3.2 GB -- above the large-graph threshold`. Verbatim
   pattern from VOCAB section 10 "Import title row"; this clause wins over
   "delimited file" by DEF-5's specificity order.
5. **Grid caption (line ~456).** Current: "Only the first 256 KB was read; counts
   are estimated from the file size. 5 of 8 columns; the rest are edge
   attributes." New (DEF-3, the summary now carries the provenance): delete the
   first sentence, leaving `5 of 8 columns; the rest are edge attributes.`
6. **Under the grid caption (new line).** Current: nothing. New (NAV-3): an 11 px
   line `2 columns were guessed.` followed by a `Review` link in `#5b8ff9`, two
   spaces between them -- `proto` and `bytes` both carry the amber `guessed`
   mark. Pattern from VOCAB section 10 "Import guessed line".
7. **Column header chips (lines ~462-493).** New (NAV-3): the Role chip and the
   Type chip are the controls -- add `title="Change this column's role"` and
   `title="Change this column's type"`; Rename and Skip belong to a header
   overflow, not to the header face. No menu is drawn open here (ImportOptions
   carries the open menu).
8. **Role summary line under the grid (line ~515).** Current: "Time: ts, a single
   moment, ISO date-time. Weight: bytes as strength (higher is closer), not
   normalized." New (DEF-4, the Time role now has a unit family):
   `Time: ts -- a single moment, measured in date and time, ISO 8601. Weight:
   bytes as strength (higher is closer), not normalized.` The word "instant" is
   not used for Kind anywhere.
9. **Load option `Everything` (line ~570).** Current: "All 1,000,000 nodes; edges
   beyond 500,000 hidden until zoomed in; may be slow or run out of memory." New
   (DEF-3): `Edges beyond 500,000 are hidden until zoomed in.` -- the node total
   is in the summary and the slow/memory warning is in the warning line.
10. **Load option `Busiest nodes`, second sub-line (line ~587).** Current:
    "Memory: about 2.4 GB to load everything, about 120 MB more to draw this
    subset. Performance mode will be on." New (DEF-3, the 2.4 GB figure now lives
    in the warning line): `About 120 MB more to draw this subset. Performance
    mode will be on.` The first sub-line, `Draws 50,000 nodes and 410,000 edges.
    Analysis runs on the drawn sample unless a card's Scope is Whole graph.`,
    stays verbatim -- it is the subset arithmetic, and DEF-3 puts it here.
11. **Load header trailing link (line ~562).** Current: "Default set in Settings,
    Performance". New (DEF-6): `Default set in Settings > Performance`, and give
    the link `title="Measured on this machine. Settings > Performance"`.
12. **Data panel underlay, Sample datasets and Recent sections (lines ~204-249).**
    Current: six condensed sample rows, two recent rows and the "Recent files are
    cleared from Settings, Data management." line, all redrawn in the Welcome
    block on the same screen. New (G3 + MIN-1): delete them; render
    `Sample datasets` with a dimmed trailing `6` and `Recent` with a dimmed
    trailing `2` as collapsed headers.
13. **Data panel underlay, Open file section (lines ~166-173).** Current: the
    drop-zone sentence and the format list, both duplicated in the Welcome block.
    New (G3 + MIN-11): delete both; keep `Open File`, `Open from URL`,
    `Paste data`.
14. **Welcome underlay, sample cards (lines ~297-360).** New (DEF-3): delete the
    size from Karate Club, Cat social network, Fraud ring, Airline routes and
    Ovarian cancer DE genes. `Amazon items` keeps `65,000 nodes, 260,000 edges,
    12 MB` -- it carries the `Large` badge and the Performance-mode line.
15. **Welcome underlay, recent rows (lines ~370, 374).** New (MIN-11): drop the
    leading `JSON, ` and `CSV, ` -- the filenames carry the extension.
16. **Status bar (lines ~401-404).** Current: grey dot plus `AI: not configured`.
    New (MIN-8): delete the slot.
17. **Activity rail, the four disabled items (lines ~46-65).** New (IC-4 +
    IK-3): `title="Explore. Load data first"` and the same for Analyze, Style,
    Present.
18. **Every icon-only control (rail, top bar, dialog X, Data panel icons).** New
    (IK-3): add `title` equal to the tooltip sentence with the binding in
    parentheses; VOCAB section 10 "Icon-only button, with its tooltip (6.8)".
19. **Guard, whole dialog (IK-8).** No icon-only conversions inside the dialog.
    `Cancel`, `Import`, `Import everything anyway` keep their text -- every label
    ending in "anyway" is on the never list.
20. **Gate, whole artboard (IC-1 + IC-3).** Pinned inline, never circled: the
    estimated counts, the warning line and its memory figure, the per-column
    guessed marks, the subset arithmetic, and the "Default set in Settings >
    Performance" line.
21. **Leading comment block (lines 15-27).** New (DEF-5 + NAV-12): open with the
    shared two-line STATE block --
    `STATE: Import options, one dialog in four states. This file: above the
    large-graph threshold, nothing loaded.`
    `OPENS: a file above the large-graph threshold, which wins over the
    immediate-load rule. Reopens from any Change link on a Loaded data line, the
    "Mapped as before" toast, the Data tier 3 list, the Insights card "Load the
    full graph", step 3 "Compare with current graph", Import as "Add attributes
    from a table", and the command palette (new in 1.5).`
    Add one line: `Importing from here lands on ExplorerSubset.dc.html (new in
    1.5): 50,000 of 1,000,000 nodes and 410,000 of 10,000,000 edges on the quick
    grid in Performance mode.` Record in comment only: canvas title becomes
    `Import options -- above the render ceiling, nothing loaded` (do not edit
    canvas.json).

## ImportAddToGraph

State after the edit: `Import options -- second file, data already loaded`.
Dialog opens at step 3 over the loaded fraud-ring shell.

1. **Data panel, Loaded data section, mapping lines (lines ~211-215).** Current:
   five lines with three separate `Change` links -- "200 nodes, 612 edges.
   Directed (from file). Sample dataset.", "Mapped source, target, amount to
   weight, ts to time. Change", "Identifier system: account id. Change",
   "Weight: amount, as strength. Time: ts. Label: id. Change", "Attributes: 8
   imported, 0 joined." New (MIN-1 one fact one region, plus MIN-2):
   - Delete `200 nodes, 612 edges.` from the first line; it becomes
     `Directed (from file). Sample dataset.` (the status bar owns the counts).
   - Collapse the three mapping lines into ONE line with ONE `Change`:
     `Mapped source, target, amount to weight (strength), ts to time, id to
     label. Identifier system: account id.` then the `Change` link.
   - `Attributes: 8 imported, 0 joined.` becomes `Attributes: 8 imported.`
   The `Change` link keeps its text (C2: it is a documented reopen path for this
   dialog, so it never becomes a hover-only pencil).
2. **Data panel, Loaded data first row (lines ~208-209).** Current: a two-part
   row, `fraud-ring-synthetic.json` then `JSON node-link, 41 KB`. New (MIN-1,
   file name is owned by the top bar): delete the filename span; the row becomes
   one 11 px `#a3a8b1` line, `JSON node-link, 41 KB`.
3. **Inspector, Counts section (lines ~368-386).** Current: an open section with
   eleven stat rows. New (MIN-9): render it COLLAPSED -- header row `Counts` with
   the chevron pointing right and no trailing count, body deleted. (TableJoin is
   the artboard in this group that draws Counts open with the merged Type row, so
   the open form stays visible somewhere.) Keep the reading above it untouched.
4. **Inspector, Node attributes + Edge attributes (lines ~443-461).** Current:
   two collapsed sections, `Node attributes 8` and `Edge attributes 4`. New
   (MIN-9): merge into one collapsed section headed `Attributes` with a dimmed
   trailing `12`; the Nodes / Edges tabs live inside and are not visible while it
   is collapsed. Record the tabs in a comment.
5. **Inspector, Most connected section (lines ~399-419).** Current: a header
   `Most connected` / `Degree`, five rows each ending in "37 links", "33 links",
   "29 links", "27 links", "24 links", and a footer with two links, `See all 200
   ranked` and `Export top N (CSV)`. New:
   - MIN-9: move the repeated unit word to a column header -- add a 10 px
     `#7a828e` right-aligned `links` header line under the section header, and
     the rows read `37`, `33`, `29`, `27`, `24`.
   - IK-6: delete `Export top N (CSV)` from the footer and draw the section
     header in its hovered form with a right-aligned download icon
     (`title="Export"`) whose menu holds the two full labels `Export top 20
     (CSV)` and `Export ranked list (CSV)`. Use VOCAB section 10 "Icon group in a
     section header, revealed on hover (6.8)". `See all 200 ranked` stays a text
     link.
6. **Dialog, "When an id already exists" helper (line ~601).** Current: one long
   sentence, "Update its attributes, Keep both (suffixed id) or Skip. Update
   writes os, risk_score and last_seen onto the 46 matched devices and overwrites
   opened where it exists. The source attribute is written on every node from
   this file." New (IC-1 split at the teaches/reports boundary, then MIN-11):
   delete sentence 1 (it restates the select's own option list, visible on the
   same row) and sentence 3 (it restates the `Source attribute = source =
   devices-batch2.csv` control beside it); keep sentence 2 verbatim, which
   reports this file: `Update writes os, risk_score and last_seen onto the 46
   matched devices and overwrites opened where it exists.` Nothing here moves
   behind a circle -- rule 5, never both.
7. **Dialog, control labels (lines ~525, ~584, ~707).** New (IC-7): add a resting
   info circle immediately after the label text of `Import as`, `When an id
   already exists` and `Parsing`. VOCAB section 10 "Info circle (6.7)", resting
   form, copied verbatim.
8. **Dialog, the cyan glyph on the match-preview line (line ~1242).** Current: a
   14 px `#33bfd7` circled "i" leading the "Matches 46 existing nodes..." row.
   New: leave it as it is. **Collision resolved:** IC-2 names this artboard for
   glyph normalization, but this glyph is a status icon on a reported line, not a
   disclosure affordance -- normalizing it would turn a reported sentence into a
   circled one, which IC-1 rule 1 forbids. Only the circles added in item 7 use
   the canonical geometry.
9. **Dialog title row (lines ~1143-1144).** Current: `Import options` then dimmed
   `devices-batch2.csv`. New (DEF-5 + DEF-3): dimmed half becomes
   `devices-batch2.csv, 8 KB -- second file, data already loaded`.
10. **Dialog, summary lines (lines ~521-522).** Current: "77 rows, 5 columns,
    8 KB. Detected CSV, comma separated, first row is a header (98%
    confidence)." and "Current graph: fraud-ring-synthetic.json, 200 nodes, 612
    edges, directed, weighted by amount, timed by ts." New (DEF-3, each fact
    once): line 1 drops the size, now in the title row --
    `77 rows, 5 columns. Detected CSV, comma separated, first row is a header
    (98% confidence).` Line 2 drops the filename, which the `Replace current
    graph` option below already names --
    `Current graph: 200 nodes, 612 edges, directed, weighted by amount, timed by
    ts.`
11. **Dialog footer (line ~716).** Current: "Adds 31 nodes and updates 46.
    Recorded as a Cleaning step, undoable from History." New (DEF-3, the match
    preview line already states the arithmetic with its Show matched / Show new
    links): `Recorded as a Cleaning step, undoable from History.`
12. **Dialog, column header `risk_score` (lines ~635-640).** Current: an amber
    `guessed` mark on the header. New (NAV-3): keep the mark and add a line under
    the grid caption -- 11 px `1 column was guessed.` then a `Review` link in
    `#5b8ff9`, two spaces between. The Role and Type chips gain
    `title="Change this column's role"` / `title="Change this column's type"`.
13. **Inspector, Counts / case notes (lines ~388-389).** Current: `Case notes:
    none` above `Add a case note`. New (MIN-9): delete `Case notes: none`; the
    affordance `Add a case note` alone is the zero state.
14. **Inspector, degree histogram caption (line ~419).** Current: `1  links per
    node, linear  37`. New (MIN-2): delete the default scale word --
    `1  links per node  37`. (Only a non-default scale prints its name; the
    legend's `1 to 37, sqrt scale` keeps sqrt.)
15. **Legend and minimap (lines ~306, ~312).** Current: a `Minimap` caption above
    the thumbnail and a `Legend` caption above the swatch list. New (MIN-7):
    delete both captions -- a thumbnail with a viewport rectangle and a swatch
    list with channel names name themselves. Keep the four colour rows WITH their
    counts (96 / 48 / 22 / 34): the open panel is Data and does not list the
    groups, so C11's condition holds and the counts stay.
16. **Status bar (lines ~474-495).** New (MIN-8 + NAV-12): delete the `3D` chip;
    merge the layout slot into one chip reading `Force directed - settled` with
    no `Layout:` label and a trailing caret opening the quick picks
    (`title="Layout. Force directed (ngraph), settled"`); change
    `3 issue types (8)` to `3 data issues` with
    `title="3 issue types, 8 issues"`; delete the `AI: not configured` slot.
    Strings from VOCAB section 10 "Status bar layout chip" and "Status bar issues
    chip".
17. **Activity rail, Data badge (line ~41).** Current: a numbered badge `3`. New
    (MIN-8): replace with an unnumbered warning dot -- a 6 px `#f7b731` circle in
    the badge position; the count lives in the status bar chip.
18. **Every icon-only control (rail, top bar, nav cluster, dialog X, Data panel
    row icons).** New (IK-3): add a native `title` equal to the tooltip sentence,
    binding in parentheses at the end; VOCAB section 10 "Icon-only button, with
    its tooltip (6.8)".
19. **Guard, whole dialog (IK-8).** No icon-only conversions inside the Import
    options dialog. `Cancel`, `Add`, and the four step-3 option labels keep their
    text.
20. **Gate, whole artboard (IC-1 + IC-3).** Pinned inline, never circled: the
    detection summary, the current-graph line, the four step-3 option
    descriptions (each names a consequence for this data -- "Closes
    fraud-ring-synthetic.json first. 3 results and 5 notes are lost." is text on
    a control that deletes data and stays inline under IC-1's first carve-out),
    the match preview, the per-column types and the grid rows.
21. **Leading comment block (lines 15-27).** New (DEF-5): open with the shared
    two-line STATE block --
    `STATE: Import options, one dialog in four states. This file: second file,
    data already loaded -- the dialog opens at item 3.`
    `OPENS: a second file was dropped while data is loaded. Reopens from any
    Change link on a Loaded data line, the "Mapped as before" toast, the Data
    tier 3 list, the Insights card "Load the full graph", step 3 "Compare with
    current graph", Import as "Add attributes from a table", and the command
    palette (new in 1.5).`
    Record in comment only: canvas title becomes `Import options -- second file,
    data already loaded` (do not edit canvas.json).

## TableJoin

State: Loaded, Table join dialog open over the fraud-free ovarian_de_string.tsv
shell. This is NOT the Import options dialog, so 6.8 applies here normally.

1. **Inspector, Node attributes + Edge attributes (lines ~466-484).** Current:
   two collapsed sections, `Node attributes 4` and `Edge attributes 5`. New
   (MIN-9): merge into one collapsed section headed `Attributes` with a dimmed
   trailing `9`; Nodes / Edges tabs live inside. Record the tabs in a comment.
2. **Inspector, Counts section (lines ~399-412).** Current: eight rows including
   `Direction Undirected (from file)` and `Weighted Yes (combined_score)`. New
   (MIN-9 + MIN-2): keep this section OPEN -- it is the one artboard in the data
   group that shows the open Counts form -- but make it a tier 2 section (chevron
   down, sitting under the reading) and rewrite the rows:
   - Merge `Direction` and `Weighted` into one row, label `Type`, value
     `Undirected (from file), weighted (combined_score)`.
   - `Connected parts (components)  1 (largest holds 100%)` becomes
     `Connected parts (components)  1` -- the largest-part share lives in the
     reading.
   - Delete the `Isolated nodes  0` row.
   - `How tightly linked (density)  0.022` stays in plain form; add
     `title="2.2e-2"` to the value.
3. **Inspector, Most connected section (lines ~422-441).** Current: header `Most
   connected` / `Degree`, five rows ending in "41 links" ... "29 links", a footer
   with `See all 318 ranked` and `Export top 50 (CSV)`. New:
   - MIN-9: add a 10 px `#7a828e` right-aligned `links` column header under the
     section header; rows read `41`, `36`, `33`, `31`, `29`.
   - IK-6: delete `Export top 50 (CSV)` from the footer; draw the section header
     in its hovered form with a right-aligned download icon (`title="Export"`)
     whose menu holds `Export top 20 (CSV)` and `Export ranked list (CSV)`.
     VOCAB section 10 "Icon group in a section header, revealed on hover (6.8)".
     `See all 318 ranked` stays a text link.
4. **Data panel, Loaded data mapping lines (lines ~188-195).** Current: seven
   lines each ending in its own `Change` -- "318 nodes, 1,104 edges", "TSV,
   STRING export recognized. Change", "Undirected, from file. Change", "ids: gene
   symbol. Change", "Weight: combined_score, strength. Change", "Label:
   preferredName. Change", "Attributes: 4 imported, 0 joined. Change",
   "Policies: defaults, nothing found. Change". New (MIN-1 mapping row, MIN-2):
   - Delete `318 nodes, 1,104 edges` -- the status bar owns the counts.
   - Collapse the three mapping lines into ONE line with ONE `Change`:
     `Mapped combined_score to weight (strength), preferredName to label.
     Identifier system: gene symbol.` then `Change`.
   - `Attributes: 4 imported, 0 joined. Change` becomes
     `Attributes: 4 imported. Change`.
   - `Policies: defaults, nothing found. Change` becomes
     `Policies: defaults. Change`.
   The format line and the direction line keep their own `Change`. Every `Change`
   keeps its text (C2).
5. **Dialog, Match on control (lines ~600-607).** Current: a bare select reading
   `preferredName` with no helper. New (NAV-12 item 2): the field auto-picks the
   candidate with the highest match rate, so add an 11 px `#7a828e` helper line
   directly under the select, verbatim `Best match: preferredName, 92%.` from
   VOCAB section 10 "Table join match helper". Record the below-5% form in a
   comment: `No column in the graph matches these values. Try Map identifiers.`
   with Join disabled.
6. **Dialog, settings grid (lines ~558-605).** Current: a fourth cell after the
   conflict rule and the prefix field, then a `Case-sensitive match` checkbox.
   New (NAV-12 item 3): add a checkbox row under the grid reading
   `Color nodes by log2FoldChange after joining`, unchecked, using the VOCAB
   section 4 "Checkbox row (CompactCheckbox)" snippet.
7. **Dialog, control labels (lines ~561, 570, 578, 586, 594, 601).** New (IC-7):
   add a resting info circle after the label text of `Apply to`, `Key column in
   file`, `Match on (attribute in the graph)` (after the complete pair, never
   between the two halves), `When an attribute already exists` and
   `Case-sensitive match`. **IC-7's guard fires on one row:** drop the circle
   from `Prefix column names with`, whose placeholder `no prefix` already states
   the policy in full. VOCAB section 10 "Info circle (6.7)", resting form.
8. **Dialog, unmatched-rows footer (lines ~740-745).** Current: three controls in
   a row -- a `Map identifiers...` link, an `Export (CSV)` link and a bordered
   `Copy list` button with a copy glyph. New (IK-5, a single copy action standing
   alone): replace the `Copy list` button with one 24 by 24 icon-only copy
   control, `title="Copy list"`, no menu, using VOCAB section 10 "Icon-only
   button, with its tooltip (6.8)" default state. `Export (CSV)` keeps its text
   (IK-6: a label naming a format keeps its text) and `Map identifiers...` keeps
   its text (more than one word, opens a dialog).
9. **Dialog, grid footer (line ~707).** Current: "Showing 4 of 340 rows. Values
   will be available to Explore filters, Style By attribute, Custom score and
   Export data as soon as the join is applied." New (MIN-11, the promise sentence
   naming four other screens): `Showing 4 of 340 rows.`
10. **Dialog, grid caption (line ~610).** Current: "Click a header to change its
    role or type. Detected from the first 100 rows; lists split on |." New
    (NAV-3, the chip is the control): `Click a chip to change a column's role or
    type. Detected from the first 100 rows; lists split on |.` Add
    `title="Change this column's role"` / `title="Change this column's type"` to
    the chips.
11. **Dialog footer (line ~753).** Current: "Adds 4 attributes to 312 of 318
    nodes. Recorded as a Cleaning step; undo with Cmd+Z." New (DEF-1, a binding
    appears in exactly four places and a footer sentence is not one of them):
    `Adds 4 attributes to 312 of 318 nodes. Recorded as a Cleaning step.`
12. **Dialog, file row (line ~572).** Current: `expression.tsv` then "340 rows,
    5 columns, tab-separated, header row, 18 KB". New (DEF-3, a size is shown
    only when it is the decision): `340 rows, 5 columns, tab-separated, header
    row`.
13. **Legend (lines ~358-367).** Current: a `Legend` caption, a Size block with
    the caption `1 to 41, sqrt scale`, and a `Color: not encoded` block. New
    (MIN-7 + MIN-2): delete the `Legend` caption and delete the whole `Color: not
    encoded` block -- blocks for unencoded channels are not drawn, and `Color: not
    encoded` is a retired string. Keep the Size block and its `1 to 41, sqrt
    scale` caption (no tick values are drawn beside it, so the range caption
    stays).
14. **Minimap (line ~352).** Current: a `Minimap` caption above the thumbnail.
    New (MIN-7): delete it -- this is the thumbnail form, not the above-10,000-node
    heatmap form that keeps its caption.
15. **Inspector, graph summary header (lines ~376-390).** Current: the reading
    followed by a `Copy reading` text link. New (NAV-5 + IK-5): move the
    affordance into the summary's header row as one 24 by 24 icon-only copy
    control, `title="Copy the graph summary"`, and delete the text link. It
    copies the reading plus the caveats line plus the Counts rows plus the
    legend's channel lines. VOCAB section 10 "Icon-only button, with its tooltip
    (6.8)".
16. **Inspector, case notes (lines ~492-493).** Current: `Case notes: none` above
    `Add a case note`. New (MIN-9): delete `Case notes: none`.
17. **Insights strip, third card (lines ~313-317).** Current: title `Search for
    something you know` with the technical half `Search`. New (G3's one permitted
    strip edit): delete the `Search` technical name -- it is not a canonical pair.
    Everything else on the strip is untouched by every density rule.
18. **Data panel, Validation report header (line ~240).** Current: `2 info, no
    warnings`. New (MIN-2): `2 info` -- the zero half goes.
19. **Data panel, Cleaning steps header (line ~268).** Current: a trailing count
    `1`. New (MIN-2): delete it -- a section header count of 0 or 1 is not drawn.
    `Sample datasets 5` and `Recent 3` keep their counts (collapsed sections,
    MIN-3).
20. **Status bar (lines ~505-548).** New (MIN-8 + NAV-12): delete the `3D` chip;
    merge the layout slot into one chip reading
    `Force directed (ngraph) - settled` with no `Layout:` label and a trailing
    caret opening the quick picks; delete the `AI: not configured` slot. The
    engine name `(ngraph)` stays rendered inline (C7 refuses moving it to a
    tooltip). Strings from VOCAB section 10 "Status bar layout chip".
21. **Every icon-only control (rail, top bar, nav cluster, dialog X, Data panel
    row icons, the new copy icons).** New (IK-3): add a native `title` equal to
    the tooltip sentence with the binding in parentheses at the end; the glyph is
    `aria-hidden`. A trash icon, where one exists, is last in its cluster with
    8 px of separation.
22. **Gate, whole artboard (IC-1 + IC-3).** Help text is off by default, so
    taught sentences sit behind circles. Pinned inline, never circled and never
    cut: the reading, `Matched 312 of 340 rows. 28 rows have no node.`, the
    unmatched list and its "and 22 more..." line, the join footer sentence, the
    validation counts, and the Best match helper.

## DataPanelLoaded

State: Loaded, Data panel open, four open validation warnings, two cleaning
steps.

1. **Inspector, Counts section (lines ~550-566).** Current: an open section with
   eleven stat rows, sitting under the reading. New (MIN-9): render it COLLAPSED
   -- header row `Counts`, chevron pointing right, no trailing count, body
   deleted. (TableJoin draws the open form for this group.) Its open state is
   remembered per 6.5; record that in a comment.
2. **Inspector, Node attributes + Edge attributes (lines ~620-633).** Current:
   two collapsed sections, `Node attributes 8` and `Edge attributes 4`. New
   (MIN-9): merge into one collapsed section headed `Attributes` with a dimmed
   trailing `12`; Nodes / Edges tabs live inside, recorded in a comment.
3. **Inspector, Most connected section (lines ~1197-1240).** Current: five rows
   ending in "44 links" ... "24 links", and a footer with `See all 200 ranked`
   and `Export top N (CSV)`. New:
   - MIN-9: add a 10 px `#7a828e` right-aligned `links` column header under the
     section header; rows read `44`, `40`, `37`, `31`, `24`.
   - IK-6: delete `Export top N (CSV)`; draw the section header in its hovered
     form with a right-aligned download icon (`title="Export"`) whose menu holds
     `Export top 20 (CSV)` and `Export ranked list (CSV)`. VOCAB section 10 "Icon
     group in a section header, revealed on hover (6.8)". `See all 200 ranked`
     stays a text link.
4. **Data panel, Loaded data section (lines ~198-221).** Current: the header
   carries `200 nodes, 612 edges`; the body opens with a row of
   `fraud-ring-synthetic.json` + `84 KB`, then `JSON node-link, directed (from
   file)`, then two mapping lines with two `Change` links. New (MIN-1):
   - Delete `200 nodes, 612 edges` from the section header -- the status bar owns
     the counts.
   - Delete the filename span -- the top bar owns the file name -- and merge the
     two remaining lines into one: `JSON node-link, 84 KB, directed (from file)`.
     The `84 KB` stays: DEF-3 names the loaded-file size as a number that is the
     decision.
   - Collapse `Mapped amount to weight, ts to time, id to label.` and
     `Identifier system: account id. Change` into ONE line with ONE `Change`:
     `Mapped amount to weight, ts to time, id to label. Identifier system:
     account id.` then `Change`.
   The two policy lines (`Repeated edges: combined, 5 pairs. Change` and
   `Self-loops: kept, 2. Change`) keep their own `Change` links and their text.
5. **Data panel, Loaded data mapping line (same row as item 4).** New (NAV-4):
   draw that mapping line in its two-second highlight state -- `background:
   #28364e; border-radius: 4px; padding: 1px 4px;` with a 2 px `#4a7ee8` left
   bar -- and reveal that row's hover affordances for the duration. Record the
   toast in a comment: `Loaded 200 nodes and 612 edges in 1 s. Mapped amount to
   weight, ts to time.  Details`, whose `Details` link is what opened Data with
   Loaded data expanded and this line highlighted.
6. **Data panel, tier 1 secondary row and the Cleaning steps tail (lines ~160-162
   and ~376-378).** Current: `Run a recipe...` with a `Coming` tag sits at the
   bottom of the panel, under the Cleaning steps list; the tier 1 secondary row
   is `Open file` / `Open from URL` / `Paste data`. New (NAV-11 item 2): move
   `Run a recipe...` (tag and all) up into that secondary row, beside
   `Open from URL` and `Paste data`, and delete it from under Cleaning steps.
   `Find and merge duplicates...` stays where it is.
7. **Data panel, the two Auto-fix rows (lines ~276 and ~290).** Current:
   `Auto-fix: set them to 1` / `Show rows` / `Ignore`, and `Auto-fix: clear them`
   / `Show rows` / `Ignore`. New (NAV-12 item 5): Auto-fix applies at once with a
   toast and no confirmation, so add a separate `Preview` link (`#5b8ff9`)
   immediately after each Auto-fix link, before `Show rows`. Update the section's
   leading comment: Auto-fix lands as one Cleaning step with the toast
   `Set 14 edge weights to 1. Undo` (VOCAB section 10 "Auto-fix toast"); Preview
   is what opens the diff column in the drawer.
8. **Data panel, Cleaning steps rows (lines ~352-364).** Current: the two row
   titles, `2. Auto-fix: treat ids as text` and `1. Merged 3 nodes into
   acct-4471`, are plain text. New (NAV-7): render each row TITLE as a link
   (`color: #5b8ff9; cursor: pointer;`), visually distinct from the row body --
   clicking it opens the step's home panel, scrolls to what it produced and
   highlights it for two seconds, and never re-runs anything. The row body keeps
   click-to-preview and double-click-to-restore; the `Undo` link on the newest
   step is unchanged.
9. **Data panel, "Show data table" switch row (lines ~184-186).** Current: a
   switch row whose trailing slot holds a bordered mono `Shift+T` chip. New
   (DEF-1): delete the chip -- a binding never appears in the trailing column of
   a switch row -- and move it into the row's tooltip:
   `title="Show data table (Shift+T)"`. The switch and label are unchanged.
10. **Insights strip, trailing line (line ~430).** Current: plain text
    `2 more in Help`. New (NAV-8): render it as a link (`#5b8ff9`) that opens the
    Help menu with More suggestions expanded. Record the strip's X behaviour in a
    comment: the X raises `Suggestions hidden on every dataset.  Undo` for eight
    seconds and is reversible from Help > Show suggestions and from the palette.
11. **Insights strip, fourth card (lines ~418-420).** Current: title
    `Search for something you know` with the technical half `Search`. New (G3's
    one permitted strip edit): delete `Search`. No other strip edit is allowed --
    the card descriptions, the `Try it` buttons and the four-card layout are
    untouched by every density rule.
12. **Data panel, Validation report and Cleaning steps headers (lines ~261-262,
    ~345-346).** Current: `Validation report` with a trailing `4`, `Cleaning
    steps` with a trailing `2`. New (MIN-3, a header count only when the section
    is collapsed or truncated): delete both counts -- both sections are open and
    every row is visible. `Columns 12`, `Info 3` and `Schema 4 node types, 3 edge
    types` keep their counts (collapsed). `Node attributes 8` / `Edge attributes
    4` are replaced by the merged `Attributes 12` of item 2.
13. **Legend (lines ~468-518).** Current: a `Legend` caption, a Size block whose
    caption reads `1 to 44, sqrt scale` beside drawn tick values `1`, `6`, `44`,
    a Color block with four type rows and counts, and the footer
    `Okabe-Ito palette, 4 types`. New (MIN-7):
    - Delete the `Legend` caption.
    - The Size caption becomes `sqrt scale` -- the tick values are drawn, so the
      caption keeps only the scale word.
    - Delete the `Okabe-Ito palette, 4 types` footer; the palette name lives on
      Style's Palette select and in the legend's overflow menu, and no categories
      were dropped so no coverage line is due.
    - Keep the four group counts (96 / 48 / 22 / 34): the open panel is Data and
      does not list the groups, so C11's condition holds.
14. **Minimap (line ~461).** Current: a `Minimap` caption. New (MIN-7): delete it.
15. **Inspector, case notes (line ~542).** Current: `Case notes: none` followed by
    `Add a case note`. New (MIN-9): delete `Case notes: none`.
16. **Inspector, graph summary header (lines ~527-541).** Current: the reading
    with no copy affordance. New (NAV-5): add one 24 by 24 icon-only copy control
    to the summary's header row, `title="Copy the graph summary"`, which copies
    the reading plus the caveats line plus the Counts rows plus the legend's
    channel lines. VOCAB section 10 "Icon-only button, with its tooltip (6.8)".
17. **Inspector, degree histogram caption (line ~595).** Current: `1  links per
    node, sqrt scale  44`. New: unchanged -- sqrt is not the default scale, so it
    prints its name (MIN-2 removes only default scale words).
18. **Status bar (lines ~646-667).** New (MIN-8 + NAV-12): delete the `3D` chip;
    merge the layout slot into one chip reading `Force directed - settled` with
    no `Layout:` label and a trailing caret opening the quick picks
    (`title="Layout. Force directed (ngraph), settled"`); change
    `4 issue types (27)` to `4 data issues` with
    `title="4 issue types, 27 issues"`; delete the `AI: not configured` slot.
    Strings from VOCAB section 10 "Status bar layout chip" and "Status bar issues
    chip".
19. **Activity rail, Data badge (line ~39).** Current: a numbered badge `4`. New
    (MIN-8): replace with an unnumbered 6 px `#f7b731` warning dot in the same
    position; the count lives in the status bar chip.
20. **IC-8, recorded as a comment only.** The Columns section is collapsed on
    this artboard, so IC-8's info circles on the Data table column headers have
    nowhere to land. Add one comment line under the Columns section comment: the
    column header menu opens with `Color by this`, `Size by this`, `Filter by
    this` above the column operations (NAV-12 item 3), and each column header
    carries an info circle (IC-8); DataTableDrawer draws both.
21. **Every icon-only control (rail, top bar Export caret, share, the two panel
    toggles, nav cluster, the joined-table row icon, the new copy and download
    icons).** New (IK-3): add a native `title` equal to the tooltip sentence with
    the binding in parentheses at the end; the glyph is `aria-hidden`.
22. **Gate, whole artboard (IC-1 + IC-3).** Help text is off by default. Pinned
    inline, never circled and never cut: the reading, every validation issue
    line and its consequence ("Analyze uses weight 1. Median is 240.", "The time
    slider skips these 6 accounts."), the example lists, `Re-ran after step 2`,
    the Cleaning step effect lines, the insight card bodies, and the status bar
    counts.

## DataTableDrawer

State: Result plus Selected, no activity panel, drawer docked along the canvas
bottom with the time slider docked above it.

1. **Time slider bar, the settings row (lines ~180-198).** Current: the bar
   carries the transport, the `Viewing:` readout, then a second row of
   `Window 30 days`, `Step 7 days`, `Cumulative | Sliding`, `Compare with another
   window` and a `T` key chip. New (MIN-15, one home for the slider's settings):
   delete that whole row from the bar. The bar keeps the transport, the `Viewing:
   2026-02-18 to 2026-03-19` readout, the `opened` attribute name with its
   `Coming` tag, the density sparkline, the track and the handles, and gains a
   gear icon at the right that opens the Explore section (`title="Time slider
   settings"`). **Collision resolved:** DEF-4 would render `Window` and `Step`
   with a unit select in the Date-and-time case, but MIN-15 removes the row from
   the bar altogether, so nothing unit-bearing is left there except the readout;
   DEF-4 governs only the readout, the step tooltip and the status bar slot on
   this artboard.
2. **Canvas filter strip (lines ~378-386).** Current: a pill holding
   `Showing 132 of 200 nodes` and a `Time: 2026-02-18 to 2026-03-19` chip with an
   X. New (MIN-1 + MIN-15): delete the count -- the status bar owns shown of
   loaded of total -- and delete the time chip -- the slider is docked, so the
   readout and the status bar Viewing slot own the window. The strip is then
   empty, so delete the whole strip element (MIN-2: a region whose content is
   "nothing here" is not drawn).
3. **Inspector, Actions block (lines ~787-853).** Current: twelve rows drawn as
   transparent rows whose trailing column carries a key chip on some rows
   (`F`, `Shift+E`, `E`, `I`, `Delete`, `Shift+T`) and nothing on others, under a
   header `Actions` with a trailing `20`. New (DEF-1, one treatment for a subtle
   action):
   - Rebuild every row from VOCAB section 10 "Subtle action row" -- transparent
     at rest, no border, 24 px tall, full panel width, 4 px radius, a 14 px
     leading icon in `#7a828e`, an 11 px label at weight 500, hover fill
     `#374047`. Draw one row in the hover state so the fill is visible.
   - Delete every key chip from the trailing column and move each binding into
     the row's `title`, in parentheses at the end:
     `title="Zoom to selection (F)"`, `title="Select neighbors (Shift+E)"`,
     `title="Expand neighbors of all (E)"`, `title="Invert (I)"`,
     `title="Remove selected (Delete)"`, `title="Show in table (Shift+T)"`.
   - Leading glyphs, taken verbatim from the register: Zoom to selection = the
     corner brackets with a centre dot in the VOCAB "Subtle action row" snippet;
     Filter to selection = the funnel
     `<path d="M2.5 3.5h11l-4.25 5v4.25l-2.5 1.25V8.5z"></path>`; Save as set...
     = the bookmark in the same snippet's trailing-data variant; Select neighbors
     = the share glyph (VOCAB section 5); Expand neighbors of all = the plus
     glyph (VOCAB section 5); Pin as A = the consolidated upright pushpin
     `<path d="M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z"></path><line x1="8" y1="8.5"
     x2="8" y2="13.5"></line>`; Remove selected = the trash glyph from VOCAB
     section 10's row form; Show in table = the table glyph already drawn in the
     drawer header; More = the three-dot glyph from VOCAB section 10.
     **Collision resolved:** DEF-1 makes the leading icon mandatory but IK-2
     forbids drawing a glyph that is not in the register; `Invert`,
     `Merge selected nodes...` and `Simulate removing (3)` have no register
     glyph, so those three rows take an empty 14 px leading slot (so the labels
     stay on one left edge) and the missing glyphs are recorded in the leading
     comment as register work.
   - `Show in table` keeps its selected `#28364e` / `#4a7ee8` treatment.
4. **Inspector, Actions block, the Coming rows (lines ~832-848).** Current: six
   scattered `Coming` tags. New (MIN-4): `Merge selected nodes...`,
   `Simulate removing (3)` and `Remove selected` are three contiguous unshipped
   rows -- delete their three per-row tags, put one `Coming` tag on a 1 px
   `#374047` divider above the run as the group note, and dim and disable the
   three rows (`color: #5f6873`, leading icon `#5f6873`, `cursor: default`).
   `Filter to selection`, `Select neighbors` and `Expand neighbors of all` are
   not a run of three, so they keep their per-row tags. No unshipped row carries
   a key chip. Add one info circle at the panel level -- on the `Actions` header
   -- whose popover reads `Dimmed rows are not built yet.` (VOCAB section 10
   "Info circle (6.7)").
5. **Drawer toolbar, Copy as TSV (line ~571).** Current: a text control reading
   `Copy as TSV` beside a bordered `Export this table`. New (IK-5): replace it
   with one 24 by 24 icon-only copy control plus a caret, `title="Copy as TSV"`,
   whose menu carries the full labels `Copy as TSV` and `Copy member ids`. VOCAB
   section 10 "Icon-only button, with its tooltip (6.8)". `Export this table`
   keeps its text and its border -- it is the surface's destination action
   (IK-1 icon-plus-text, IK-6 "Export keeps its text wherever the label names a
   scope").
6. **Table header row, the three metric columns (lines ~279, 281, 283).**
   Current: header cells reading `degree`, `betweenness` and `pagerank` with a
   type icon, and nothing anywhere carries the plain half of the pair. New
   (IC-8 + IC-2): add a resting info circle immediately after each of those three
   header labels; the popover carries the canonical pair and one sentence --
   `Most connected (degree). How many links a node has.`,
   `Bridges (betweenness). Nodes that sit on the shortest routes between other
   nodes.`, `Influence (PageRank). Nodes with well-linked neighbors: a node
   scores high when the nodes pointing at it score high.` Draw ONE of them open
   (`betweenness`, since the table is sorted by it) with the 250 px popover.
   **Resolution:** IC-8 says "the Data table column headers"; the four file
   columns (`id`, `type`, `opened`, `risk score`), the three `rank` columns and
   `group` name themselves and take no circle -- circling eleven headers would
   draw a row of circles across the table.
7. **Drawer header, the key chip (line ~543).** Current: a bordered mono
   `Shift+T` chip sits in the drawer's header beside the close X. New (DEF-1, a
   binding never appears in a section or panel header): delete the chip and move
   it to the close control's tooltip: `title="Hide the data table (Shift+T)"`.
8. **Inspector, count row (lines ~672-679).** Current: `3 nodes, 0 edges` with a
   `Coming` tag, and below it a second line `Selected 3 of 132 visible (200
   total)`. New (MIN-2 + MIN-1): the header reads `3 nodes` -- a zero half of a
   selection count is not drawn -- and the `Selected 3 of 132 visible (200
   total)` line is deleted entirely, because the status bar and this header
   already own the selection size. The `Coming` tag stays (isolated row). The
   reading below (`3 nodes selected. They connect to 71 other nodes...`) is
   unchanged; G5 keeps every reading's count, subject and comparison.
9. **Inspector, count row copy icon (line ~677).** Current: one icon-only control
   with `title="Copy ids"`. New (NAV-5 + IK-5): keep one icon and give it a
   caret opening a two-item menu, `Copy ids` and `Copy reading`; the icon
   performs the last-used copy on click. This is how the reading gets its
   NAV-5 affordance without a second copy glyph in the same header row.
10. **Inspector, Actions header count (line ~792).** Current: a trailing `20`.
    New (MIN-3): delete it -- `Actions 20` is a catalogue count and is named
    explicitly by MIN-3.
11. **Inspector, Notes section (lines ~460-465).** Current: header `Notes` with a
    trailing `0`. New (MIN-2): delete the `0`; the section is its affordance,
    `Add a note to these 3 nodes`. Keep the header word `Notes` alone (never
    `Notes Annotations`).
12. **Drawer footer (lines ~650-651).** Current: `Showing selected rows only.`
    followed by the link `Show all 132 in window`. New (MIN-11, a helper sentence
    that restates a control on the same screen): delete `Showing selected rows
    only.` -- the toolbar's `Show  Selected` select says it -- and keep the link
    `Show all 132 in window`. The toolbar's own `Showing 3 of 200 nodes` stays;
    it is the drawer's row count and no other region reports it.
13. **Status bar (lines ~862-891).** New (MIN-8 + NAV-12): delete the `3D` chip;
    merge the layout slot into one chip reading
    `Force directed (ngraph) - settled` with no `Layout:` label and a trailing
    caret opening the quick picks; change `4 issue types (27)` to `4 data issues`
    with `title="4 issue types, 27 issues"`; delete the `AI: not configured`
    slot. The `132 of 200 nodes` / `388 of 612 edges` slot, the
    `Viewing: 2026-02-18 to 2026-03-19` slot and the `3 selected (+3)` slot all
    stay -- the status bar is their owning region. Strings from VOCAB section 10
    "Status bar layout chip" and "Status bar issues chip".
14. **Activity rail, Data badge (line ~36).** Current: a numbered badge `4`. New
    (MIN-8): replace with an unnumbered 6 px `#f7b731` warning dot.
15. **Time slider, step control tooltip.** New (DEF-4): wherever the step control
    survives on the transport, its tooltip reads `Step forward 7 days (.)` --
    the unit comes from the Time role, which is Date and time for `opened`. Add
    it as `title`. VOCAB section 10 "Unit-aware time slider labels", substitution
    table.
16. **Guard, NAV-12 item 5: the hint bar is NOT drawn here.** NAV-12 gives the
    drawer a one-line hint bar naming an issue, its column and its two fixes, but
    only when the drawer was opened from an issue's `Show rows`. This drawer was
    toggled with Shift+T on a selection, so the hint bar is not added; record the
    string in the leading comment instead --
    `6 rows with issues in opened. Double-click a cell to fix it, Esc cancels. Or
    use Auto-fix in the validation report.` (VOCAB section 10 "Data table drawer
    hint bar"). The existing footnote `1 outlined cell: acct-4471 has a
    self-loop...` stays; it reports this table.
17. **Column header menus, recorded as a comment.** New (NAV-12 item 3): add one
    comment line above the table header row -- every column header menu opens
    with `Color by this`, `Size by this` (numeric only) and `Filter by this`
    above the column operations; all three write into the selected style layer
    and then open Style with that layer selected and the changed row highlighted.
18. **Every icon-only control (rail, top bar, nav cluster, drawer close, the
    transport buttons, the new copy icons).** New (IK-3): add a native `title`
    equal to the tooltip sentence with the binding in parentheses at the end; the
    glyph is `aria-hidden`; a trash icon is last in its cluster with 8 px of
    separation. VOCAB section 10 "Icon-only button, with its tooltip (6.8)".
19. **Gate, whole artboard (IC-1 + IC-3).** Help text is off by default, so
    taught sentences sit behind circles. Pinned inline, never circled and never
    cut: the selection reading, the agreement sentence
    (`acct-4471, dev-19c2, ph-2076 are in the top 10 of all 3 methods...`), the
    `Showing 3 of 200 nodes` count, the outlined-cell footnote, the selection
    statistics values, and every status bar count.

## Welcome

State: Empty, nothing loaded. Canvas Welcome block plus the Data panel.

1. Canvas Welcome block, after the "Recent files" block: add a fourth block
   "Saved recipes", drawn with one row so the state exists somewhere. Row
   layout copies the Recent-files row: title "Fraud ring triage" at 12px
   `#d5d7da`, second line "3 steps -- Groups, Bridges, Filter above threshold"
   at 11px `#7a828e`, right-aligned time "Aug 28". Block heading "Saved
   recipes" matches the "Recent files" heading exactly. Add a leading comment:
   "NAV-11: shown only when at least one recipe exists; a recipe reruns the
   ordered history on a new file." (NAV-11 item 2)
2. Data panel, tier 1 secondary row: the row currently reads "Open from URL |
   Paste data". Add a third subtle action, "Run a recipe...", in the same row
   using the VOCAB section 10 "Subtle action row" markup (transparent, 24px,
   14px leading icon at `#7a828e`, 11px label weight 500). It moves here out of
   Data tier 2. (NAV-11 item 2)
3. Data panel, Open file section: delete the drop-zone instruction line "Drop a
   graph file (or a nodes file and an edges file) here" and the format list
   "JSON, CSV or TSV, GraphML, GEXF, GML, DOT, Pajek, SIF, CX2". Both are drawn
   character for character in the canvas Welcome block, which owns them on this
   screen. Keep the "Open File" button and the drop target rectangle. (G3
   de-duplication, MIN-1)
4. Data panel, Sample datasets section: delete the six sample rows and render
   the section as a collapsed tier 2 header, chevron pointing right, reading
   "Sample datasets" alone. The canvas Welcome block lists all six with tags,
   blurbs and credits and owns them on this screen. (G3 de-duplication)
5. Data panel, Recent section: delete the footer line "Cleared from Settings >
   Data management." The canvas block draws the same sentence as "Recent files
   are cleared from Settings > Data management." (MIN-11)
6. Canvas Welcome block, sample blurbs: the closing imperative becomes a link
   in the accent colour `#5b8ff9` with the rest of the blurb left at
   `#a3a8b1`. Link text per row: "Try finding the groups." (Cat social
   network), "Try Connected parts, following direction." (Fraud ring), "Try
   coloring by conference." (College football), "Try coloring by logFC and
   finding the groups." (Ovarian cancer DE genes), "Try finding connected
   parts, or search for a node." (Patent citations). Karate Club has no
   imperative and stays plain text. Add a comment: "NAV-1: clicking the row
   loads the sample; clicking the hint loads it and runs the manifest's
   suggested first card." (NAV-1)
7. Canvas Welcome block and Data panel sample rows: drop the KB/MB figure from
   every sample except Patent citations. "34 nodes, 78 edges, 4 KB" becomes
   "34 nodes, 78 edges"; "20 nodes, 29 edges, 3.5 KB" becomes "20 nodes, 29
   edges"; "200 nodes, 612 edges, 38 KB" becomes "200 nodes, 612 edges"; "115
   nodes, 613 edges, 9 KB" becomes "115 nodes, 613 edges"; "150 nodes, 1,220
   edges, 96 KB" becomes "150 nodes, 1,220 edges". Patent citations keeps
   "65,000 nodes, 210,000 edges, 14 MB" because it carries the Large badge and
   the "Opens in Performance mode, about 20 s" line, where the size is the
   decision. (DEF-3)
8. Canvas Welcome block, Recent files rows: delete the leading format word.
   "JSON  --  20 nodes, 29 edges  --  Yesterday" becomes "20 nodes, 29 edges
   --  Yesterday"; "CSV  --  148 nodes, 147 edges  --  Aug 28" becomes "148
   nodes, 147 edges  --  Aug 28". The filename above carries the extension.
   Apply the same deletion to the Data panel Recent rows: "JSON, 20 nodes, 29
   edges" becomes "20 nodes, 29 edges" and "CSV, 148 nodes, 147 edges" becomes
   "148 nodes, 147 edges". (MIN-11)
9. Status bar, AI slot: delete "AI: not configured". The AI slot renders only
   when a provider is configured or a call is in flight. The counts slot keeps
   "No data loaded". (MIN-8; "AI: not configured" is on the VOCAB retired list)
10. Data panel: "Add attributes from a table" with "Table join" stacked
    beneath it becomes one line, "Add attributes from a table (Table join)",
    with the technical half muted `#7a828e`. (MIN-14)
11. Leading file comment: add "DEF-6: the machine-calibration probe runs
    offscreen from this screen (browser facts plus a 512x512 instanced render
    at 1,000 / 8,000 / 64,000 nodes, hard-capped at 2.5 s) and is abandoned
    the moment a file is opened. Nothing about it is drawn; detection failure
    applies the built-in defaults silently." (DEF-6)
12. Leading file comment: add "G3: Welcome is the arrival path and is exempt
    from every density rule. The only edits allowed are de-duplication against
    the Data panel and the sample-size rule of DEF-3." (G3)

## Main

State: Loaded, first load, Explore panel open, nothing selected.

1. Canvas: draw the Help menu open, anchored under the rail Help icon at the
   bottom left, using the VOCAB section 9 "Dropdown menu" snippet. Rows, in
   order: "Keyboard shortcuts" with the `?` key chip right-aligned, "Show
   suggestions", "Documentation", "Send feedback". "More suggestions (N)" and
   "Already run (N)" are not drawn: both counts are zero on this graph (three
   candidate cards, all shown, none run) and MIN-2 forbids a zero count.
   (NAV-8)
2. Insights strip: draw a 1px `#4a7ee8` focus ring with a 2px offset around
   card 1 ("Find groups"), because F6's region ring now includes the strip.
   Add a comment on the strip: "NAV-8: F6 reaches the strip; Left and Right
   move between cards, Enter activates, Delete dismisses." (NAV-8)
3. Insights strip X: do NOT draw the dismissal toast. Record it as a comment
   on the strip-level X instead: "NAV-8: the X raises the toast 'Suggestions
   hidden on every dataset.  Undo' for eight seconds; recovery afterwards is
   Help > Show suggestions and the palette." Collision resolved: NAV-8 lists
   the toast for Main, but XR-D's ruling for this same artboard is that Main
   is the reference shell and a drawn toast reads as a permanent element. The
   Help menu of item 1 is what makes the recovery path visible, so the toast
   is a comment. (NAV-8 versus XR-D, resolved toward the comment)
4. Inspector, Graph summary: restructure per MIN-9.
   a. Move "Counts" below the reading and render it as a tier 2 collapsible
      section, chevron pointing right, collapsed. Use the VOCAB section 4
      "Section header row with chevron" snippet.
   b. Inside Counts, replace the three rows "Direction | Undirected",
      "Weighted | Yes (value)" with one Type row: label "Type", value
      "Undirected, weighted (value)". Delete the "Yes" form entirely.
   c. Delete the row "Isolated nodes | 0" and the clause "(largest holds
      100%)" from "Connected parts (components) | 1". The largest-part share
      stays in the reading only.
   d. Density renders as "0.153" with the scientific form in the row's title
      attribute.
   e. Merge "Node attributes 8" and "Edge attributes 3" into one collapsed
      section headed "Attributes"; when open it carries Nodes and Edges tabs
      reading "Nodes 8" and "Edges 3". Draw it collapsed, header text
      "Attributes" with no count.
   f. Most connected: delete the repeated word "links" from all five value
      cells and put it on the column header, so the header row reads "Most
      connected (degree)" on the left and "links" right-aligned, and the cells
      read 4, 4, 4, 3, 3.
   g. Replace the two-part "Case notes: none" plus "Add a case note" with one
      link, "Add a case note".
   h. Replace "Full statistics are in Analyze" plus "More" with one link,
      "More in Analyze".
   (MIN-9)
5. Explore panel, tier 2: the contiguous run "Neighborhood expansion",
   "Bookmarks", "Find a pattern" is three unshipped rows. Delete their three
   per-row Coming tags, dim all three to `#5f6873`, draw them disabled, and
   put one muted group note "Coming soon" on the divider immediately above the
   first of them. Add one info circle at the top of the panel, immediately
   after the "Explore" panel title, whose popover reads "Dimmed rows are not
   built yet." Use the VOCAB section 10 "Info circle (6.7)" resting markup and
   the 250px popover markup. "Filter builder" and "Saved filters" are a run of
   two and keep their per-row Coming tags. (MIN-4)
6. Explore panel, tier 1: delete the whole "Zoom to selection [F]" row. 5.4
   makes the inspector the home for selection-scoped actions; F, the
   navigation cluster, the context menu and the palette are unchanged. (C12)
7. Explore panel, tier 1: "Select all visible" and "Select" are currently
   bordered 24px boxes with a right-aligned mono key chip. Redraw both with
   the VOCAB section 10 "Subtle action row" markup: transparent at rest, no
   border, 24px tall, full panel width, 4px radius, mandatory 14px leading
   icon at `#7a828e`, 11px label at weight 500. Delete the `Cmd+A` chip; the
   binding goes into the row's `title` as "Select all visible (Cmd+A)". The
   Coming tag moves to the trailing data slot. The "Select" row keeps its
   trailing text "Invert, Neighbors of selection, Same group..." in the
   trailing slot. (DEF-1)
8. Legend: delete the "Legend" caption; delete the "Minimap" caption beside
   the minimap; delete the whole "Color: not encoded" block; render the
   remaining channel header as one line, "Size: most connected (degree)" with
   the technical half muted, and keep "1 to 4, sqrt scale" beneath it. (MIN-7,
   MIN-2, MIN-14)
9. Status bar: delete the "3D" mode chip (the canvas 2D/3D control is always
   visible; the slot is kept for VR and AR). Replace "Layout: Force-directed"
   plus "Settled" with one chip reading "Force directed - settled", no
   "Layout:" label, with a 12px chevron caret at its right edge. Delete "AI:
   not configured". (MIN-8, VOCAB "Status bar layout chip")
10. Status bar layout chip: add a comment recording the caret's menu -- "NAV-12:
    the caret opens the four Style quick picks with their size estimates and
    disabled reasons, the active engine checked, then Re-run, Stop and Layout
    settings..." (NAV-12 item 1)
11. Top bar: the Undo control becomes a split button -- the existing arrow
    glyph is the main half, and a 12px chevron caret is added to its right
    inside the same 24px cluster with a 1px `#48525c` hairline between them.
    The caret's `title` reads "History" and carries no binding. (NAV-7)
12. Inspector: add a header row above the reading, 20px tall, holding nothing
    on the left and one icon-only copy control right-aligned, `title="Copy
    reading"`, drawn with the VOCAB section 10 "Icon-only button" default
    markup. Add a comment: "NAV-5: on the graph summary this copies the
    reading, the caveats line, the Counts rows and the legend channel lines."
    (NAV-5, IK-5 single-copy form)
13. Inspector, "Most connected" section header: delete the "Export top 5 (CSV)"
    link from under the list and give the section header a hover-revealed icon
    group using the VOCAB section 10 "Icon group in a section header, revealed
    on hover" snippet: a download icon (`title="Export"`) whose menu holds
    "Export top 20 (CSV)" and "Export ranked list (CSV)", then the overflow
    dots. Do the same on the "Schema" header, whose download menu holds
    "Export schema JSON". Draw the group in its revealed state so it is
    visible. (IK-6)
14. Explore panel, tier 1 search: delete the hint line "Prefix with id:, type:,
    exact: or regex:, or start with = for an expression." and put an info
    circle immediately to the right of the search input, outside the field, in
    the same row. Its popover carries that sentence verbatim. The `/` chip
    stays inside the input -- it is a hint printed inside a real input, not a
    binding. Add a comment: "C1: the same sentence also appears inline on
    field focus; it is never retired by usage." (IC-8, C1)
15. Navigation cluster, "Zoom to selection": it is disabled because nothing is
    selected. Its `title` becomes "Zoom to selection (F). Select something
    first" -- the reason names the one action that would enable it and is never
    repeated as body text. (IC-4)
16. Delete every zero and default row: "Saved filters 0", "Selection sets 0",
    "Bookmarks 0", "Notes 0" (the header reads "Notes" alone; the empty state
    line "No notes yet. Select a node or edge and press N." stays -- an empty
    state is reported text), and "None active" under Filter builder. (MIN-2)
17. Leading file comment: add "XR-D: on return from a headset the shell shows
    'Back from VR' with one summary line, '2 notes, 1 run (Find groups), 12
    nodes expanded, 3 selected', and Undo for the expansion only. It is not
    drawn here: Main is the reference shell and a drawn toast reads as a
    permanent element. The History group is drawn on HistoryPopover." (XR-D)

## ExplorerAfterCard

State: Result. Analyze panel on the Run tab, Groups result in the inspector.

1. Inspector, run record: collapse it. The line "Louvain, resolution 1.0, seed
   42. Weight: value (strength). Direction: ignored. Scope: visible, 20 of 20
   nodes. 2026-09-04 14:12, 12 ms, algorithms 1.4.0" plus the three links
   "Copy as JSON / Copy as command / Copy methods text" becomes one line with a
   12px chevron at its left: "Louvain, resolution 1.0, seed 42. All 20 nodes."
   followed by a "Details" chevron. Draw Details EXPANDED (this canvas needs
   the full record visible somewhere), the expanded block carrying weight
   attribute, direction, timestamp, duration, engine version and the three
   copy items. The caveats line above it stays visible and unchanged. (IC-5)
2. Inspector, card header: add one icon-only copy control to the result
   identity row ("Groups / Communities (Louvain) / Done"), right-aligned,
   `title="Copy"`, VOCAB section 10 "Icon-only button" markup, opening a menu
   whose full labels are "Copy as TSV" and "Copy member ids". Delete the
   standalone "Copy as TSV" link from the result actions row and the "Copy
   member ids" link from the group actions row. The three record copies stay
   inside the collapsed Details block of item 1. (IK-5)
3. Inspector, result actions: "Encode as style" becomes the applied form. The
   legend already shows "Color: Groups", so replace the "Encode as style"
   button with the text "Encoded as node color" at 11px `#d5d7da` and a link
   "Change encoding" at `#5b8ff9` beside it. Add a comment: "NAV-2: a result
   applies its shape's primary encoding on first completion from every route;
   the application is one undoable step separate from the result." The
   reading's closing clause "Colors now show groups." already names the change
   and stays. (NAV-2)
4. Analyze panel: delete the entire tier 1 graph statistics block (the rows
   Nodes 20, Edges 29, Direction Undirected, Weighted Yes (value), Average
   links per node (mean degree) 2.9, How tightly linked (density) 0.153,
   Connected parts (components) 1 (largest holds 100%)). It is a
   character-for-character copy of the inspector Counts section rendered at the
   same moment 900 px to the right. (MIN-12)
5. Analyze panel: add a sticky scope line directly under the Run | Results
   tabs, 24px tall, reading "Scope: all 20 visible nodes." with a "Change"
   link at `#5b8ff9`. Move the tier 2 "Weight attribute | value, as strength"
   control up beside it so the panel header carries the scope line and the
   Weight and Treat as controls only. (MIN-5, MIN-12)
6. Question group headers: delete the cost class and the card count from every
   open header. "Find groups" plus "3 cards" plus "heavy" becomes "Find
   groups" alone; "Find important nodes" plus "4 cards" plus "iterative"
   becomes "Find important nodes"; "Find weak points" plus "4 cards" plus
   "heavy" becomes "Find weak points". No cost word appears anywhere. The
   overflow that holds "Run all (3)" stays on hover. Every card on this 20-node
   graph is under 2 s, so no card carries an estimate: the action row stays
   "Parameters ... Run" exactly as the VOCAB "Per-card cost estimate beside
   Run" under-2-s snippet draws it. Card descriptions stay inline (Cards view,
   G1). (DEF-2)
7. Inspector, group actions: delete the three-line paragraph "Import a category
   table (Data > Add attributes from a table, Apply to: Groups) or enable a
   provider in Settings > Extensions." from the result body. Draw the disabled
   "Compare categories" row with its tooltip OPEN, using the VOCAB section 10
   tooltip bubble markup, carrying that sentence as the disabled control's own
   reason. (IC-4, C1)
8. Inspector, "Groups by size" header: add an info circle immediately after
   the value "Modularity 0.537", using the VOCAB "Info circle (6.7)" resting
   markup. Popover text: "Modularity scores how separated the groups are.
   Above 0.3 counts as well separated." (IC-4, IC-8)
9. Inspector, result actions: "Run again with changes" becomes a split action
   -- the label is the main half, and a 12px chevron caret to its right opens a
   one-item menu, "Run and compare", with the comment "NAV-11: Run and compare
   enters Compare with A set to this card and B to the new run, skipping the
   source picker." (NAV-11)
10. Analyze panel sub-tabs: "Results (1)" becomes "Results". A section header
    count of 0 or 1 is not drawn. (MIN-2)
11. Legend: delete the "Legend" caption and the "Minimap" caption; delete the
    footer "Okabe-Ito, 4 of 4 values colored" (no categories were dropped, and
    the palette name moves to the legend overflow menu); delete the four group
    counts 7, 6, 4, 3 -- the inspector's "Groups by size" section lists every
    group with its size; render both channel headers on one line, "Size: most
    connected (degree)" and "Color: Groups (communities, Louvain)". (MIN-7,
    MIN-1, MIN-14)
12. Status bar: delete the "3D" mode chip; replace "Layout: Force-directed"
    plus "Settled" with one chip "Force directed - settled" with a 12px
    chevron caret; delete "AI: not configured". (MIN-8, NAV-12 item 1)
13. Top bar: Undo becomes a split button -- add a 12px chevron caret to its
    right inside the same cluster, `title="History"`, no binding. (NAV-7)
14. Inspector: add a 20px header row above the reading with one icon-only copy
    control right-aligned, `title="Copy reading"`. (NAV-5)
15. Inspector title row: replace the pin glyph body. It is currently drawn as
    a panel-split rectangle, `<rect x="2" y="2.5" width="12" height="11"
    rx="1.5"></rect><line x1="10" y1="2.5" x2="10" y2="13.5"></line>`. Swap the
    whole svg body for the canonical upright pushpin: `<path d="M6 2.5h4l-.5
    3.5 2 2.5H4.5l2-2.5z"></path><line x1="8" y1="8.5" x2="8" y2="13.5"></line>`
    -- the same body this file already uses for "Pin as A". (IK-2)
16. Leading file comment: add "DEF-7: every attribute list ends with a group of
    node metrics that have not been run -- a 12px play glyph, the plain name,
    the technical name dimmed, and 'not run' as the trailing hint. Picking one
    runs it and applies the selection as one undoable pair. Encode as style is
    the second of the two routes into a style layer; it is not the only one."
    (DEF-7)

## ExplorerExpert

State: Result plus Selected. Analyze panel Results tab, node acct-4471 in the
inspector, fraud-ring dataset.

1. All three result cards: collapse the run record. Each card's four-line block
   (the run record sentence plus "Copy as JSON / Copy as command / Copy methods
   text") becomes one line with a leading 12px chevron carrying method,
   non-default parameters and scope, then a "Details" chevron:
   - Bridges: "Betweenness, normalized, endpoints excluded. All 200 nodes."
   - Find a path: "Shortest path, Dijkstra. ph-1140 to merch-88. All 200
     nodes."
   - Groups: "Louvain, resolution 1.0, seed 42. All 200 nodes."
   Draw the Bridges card with Details EXPANDED (weight attribute, direction,
   timestamp, duration, engine version and the three copy items inside it);
   draw Find a path and Groups with Details collapsed. Each card's caveats line
   stays visible above it. (IC-5)
2. All three result cards: add one icon-only copy control to each card's title
   row, right-aligned, `title="Copy"`, opening a menu of the full labels.
   Bridges menu: "Copy as TSV", "Export ranked list (CSV)". Find a path menu:
   "Copy steps", "Copy as TSV", "Export CSV". Groups menu: "Copy as TSV",
   "Copy member ids", "Export groups (CSV)". Delete the corresponding
   standalone links from each card body and actions row. Use the VOCAB section
   10 "Icon-only button" markup. (IK-5)
3. Bridges card: apply the primary encoding. The size channel is unencoded (the
   legend has no Size block), so replace the card's "Encode as style" button
   with "Encoded as node size" plus a "Change encoding" link, add a Size block
   to the legend reading "Size: Bridges (betweenness)" over "0 to 0.41, sqrt
   scale", scale the canvas node radii by betweenness with acct-4471, dev-19c2
   and ph-2076 largest, and extend the Bridges reading with the closing clause
   "Sizes now show bridge scores." The Groups card keeps its un-applied "Encode
   as style" button and its reading omits a closing clause, because the colour
   channel is already driven by node type. (NAV-2)
4. Inspector, Attributes: delete the whole "Key attributes" block. The id row
   goes because the displayed label "acct-4471" equals the id (the annotation
   "account id" moves into the copy-id control's `title`), and the type row
   goes because the header badge already reads "Account". Delete the "Key
   attributes" sub-header and replace it with a 1px `#374047` hairline. The
   section header becomes "Attributes" with no count, keeping "Show all 12"
   beside it. (MIN-10)
5. Inspector, Actions block: two contiguous runs of unshipped rows consolidate.
   Run one is "Expand 37 neighbors", "Select neighbors", "Ego network": delete
   their three Coming tags, dim all three to `#5f6873`, draw them disabled, and
   put one muted "Coming soon" note on the divider above them. Run two is
   "Likely missing links from here", "Simulate removing", "Merge with...",
   "Tag...", "Bookmark this node": same treatment, one "Coming soon" note on
   the divider above the first. "Radial layout around this node" and "Pin" stay
   isolated and keep their per-row tags. Add one info circle after the
   "Actions" region's first row whose popover reads "Dimmed rows are not built
   yet." (MIN-4)
6. Bridges card body: the four rows "Select top N", "Add top N to selection",
   "Filter above threshold", "Export ranked list (CSV)" are a contiguous run of
   four unshipped rows. After item 2 moves "Export ranked list (CSV)" into the
   header copy menu, the remaining three consolidate: delete the three Coming
   tags, dim to `#5f6873`, disable, one "Coming soon" note on the divider
   above. (MIN-4)
7. Inspector, Neighbors: delete the line "Incoming 14 / Outgoing 23 / Both 37".
   The In / Out / All tabs carry those numbers: the tabs read "In 14", "Out
   23", "All 37". (MIN-10)
8. Inspector, Computed metrics: delete the count "3" from the header (three
   rows are visible). On the Bridges row delete "Rank 1 of 200" from the
   sub-row, because the reading above already states "Rank 1 of 200 by
   Bridges"; keep "top 0.5%" and put an info circle immediately after it whose
   popover reads "Percentile among all 200 nodes: only 1 node scores higher."
   (MIN-10, MIN-3, IC-8)
9. Groups card reading: delete the clause "; above 0.3 counts as well
   separated" so the sentence reads "7 groups found. The largest has 41
   members. The groups are clearly separated (modularity 0.62)." Add an info
   circle immediately after the value "0.62" carrying "Modularity scores how
   separated the groups are. Above 0.3 counts as well separated." Add the same
   circle to the "Modularity | 0.62" body row. (IC-4)
10. Inspector, Notes: the header currently reads "Notes / Annotations / 2" with
    an `N` key chip. Delete the technical name "Annotations" (6.3 exempts
    section labels), delete the count "2" (both notes are visible), and delete
    the `N` chip -- a binding never appears in a section header. The binding
    goes into the "Add a note..." input's `title` as "Add a note (N)". Header
    reads "Notes". (MIN-10, MIN-3, DEF-1)
11. Legend: delete the "Legend" caption and the "Minimap" caption; delete the
    footer "Okabe-Ito, 4 of 4 values colored"; delete the count "2" from the
    "Open notes" row and its technical suffix "(annotations)", so the row reads
    "Open notes"; delete the count on the "Selected" state row; keep the four
    node-type counts (96, 48, 22, 34) -- no panel on this screen lists every
    type, so the legend is their only home; render channel headers on one line,
    "Color: node type (type)" and "Find a path (shortest path)". (MIN-7,
    MIN-10, MIN-14)
12. Status bar: delete the "3D" mode chip; replace "Layout: Force-directed"
    plus "Settled" with one chip "Force directed - settled" plus a 12px
    chevron caret; the running slot keeps the spinner and "42%" only and LOSES
    its "Cancel" -- the Influence card is in view with its own Cancel, and there
    is one Cancel on screen per run; the issues chip "4 issue types (27)"
    becomes "4 data issues" with `title="4 issue types, 27 issues"`; the rail
    Data badge "4" becomes an unnumbered warning dot; delete "AI: not
    configured". The "5 notes" chip stays (Explore is not open). (MIN-8)
13. Top bar: Undo becomes a split button -- add a 12px chevron caret at its
    right, `title="History"`, no binding. Add a comment: "NAV-7: every History
    row title is a link that opens the step's home panel and highlights what it
    produced for two seconds; it never re-runs anything." (NAV-7)
14. Inspector title row: replace the pin glyph body `<rect x="2" y="2.5"
    width="12" height="11" rx="1.5"></rect><line x1="10" y1="2.5" x2="10"
    y2="13.5"></line>` with the canonical upright pushpin `<path d="M6 2.5h4l-.5
    3.5 2 2.5H4.5l2-2.5z"></path><line x1="8" y1="8.5" x2="8" y2="13.5"></line>`.
    (IK-2)
15. Canvas: acct-4471 is selected, and the graph is below the large-graph
    threshold, so draw every one of its 37 incident edges in the selection
    colour at full opacity and outline its immediate neighbours; label its top
    ten neighbours by weight regardless of the label cap. The path result's own
    dimming of non-path nodes stays -- that is a result highlight, not the
    selection's drawing, and NAV-10's "nothing is dimmed" governs only what the
    selection itself does. (NAV-10)
16. Inspector, Notes: add a comment "XR-E: a note dictated in a headset carries
    a 'Dictated' chip beside its time; Edit, Delete and Done do not exist in a
    session." No chip is drawn here (both notes were taken at the desk). (XR-E)
17. Inspector action block: keep every label as text. "Copy ids"-style
    single-copy collapses do not apply here: IK-4 and IK-8 exempt the pinned
    inspector action block from icon-only controls by construction, and that
    exemption beats IK-5. Add this as a comment so a later pass does not
    iconify the block. (IK-4 versus IK-5, resolved toward text)
18. Leading file comment: add "DEF-7: the Style By attribute select, the
    Explore filter builder's attribute row and the Custom score picker all end
    with a group of node metrics that have not been run; picking one runs it
    and applies the selection as one undoable pair. Encode as style is the
    second of two routes, not the only one." (DEF-7)

## StylePanel

State: Loaded, Humans style layer selected.

1. Inspector, Size group: draw the "Attribute" select OPEN, using the VOCAB
   section 10 "Style By attribute row: a metric that has not been run" popover
   verbatim, anchored under the Attribute control (the select's parent needs
   `position: relative`). Contents, in order: a search input at the top (the
   list exceeds eight rows), the file attributes, then a "Metrics" group
   heading, then "Most connected degree" with the trailing hint "1 to 4", a 1px
   `#374047` divider, then the not-run rows -- "Bridges betweenness" with a 12px
   play glyph and the trailing hint "not run", drawn hovered at `#374047`, and
   "Hubs and authorities HITS" disabled at `#5f6873` with `title="Hubs and
   authorities needs a directed graph"`. Not-run metrics sort last inside
   Metrics and never above a file attribute; cubic and unbounded metrics are
   not listed at all. (DEF-7)
2. Panel, tier 3: delete the whole "Style template" row with its "Import..."
   and "Export JSON" links. Both move into the panel title row's overflow menu,
   renamed "Import style..." and "Export style (JSON)", joined there by "Expand
   all sections", "Collapse all sections" and "Reset styles to defaults". Draw
   the overflow menu closed and record the five items in a comment. (IK-6)
3. Panel, Style layers list: give the layer rows the fixed row-hover triple.
   Draw the selected "Humans" row in its hovered state with three icon-only
   controls right-aligned in the order edit, visibility, delete -- pencil
   (`title="Edit"`), eye (`title="Show on canvas"`), trash (`title="Delete"`,
   `margin-left: 4px`) -- using the VOCAB section 10 "Icon group ... Row form"
   markup. The "Base layer" row draws the trash disabled at `#5f6873`. The
   trailing node counts move left of the icon group. (IK-7)
4. Panel, tier 1: the "Show legend" row carries an `L` key chip. Delete the
   chip -- a binding never appears in a switch row -- and put it in the switch's
   `title` as "Show legend (L)". (DEF-1)
5. Panel, Style presets: delete the caption "Presets never change which labels
   show." and put an info circle immediately after the "Style presets" section
   name carrying that sentence. Use the VOCAB "Info circle (6.7)" resting
   markup. (MIN-11, IC-8)
6. Inspector, Size group: delete the sentence "Legend updates automatically."
   The helper line becomes "Age 45 to 68 maps to sizes 1.0 to 2.0, square root
   scale." (MIN-11)
7. Panel, "All layouts" section header: delete the count "18 engines, 5
   families". Catalogue counts go entirely. Header reads "All layouts". (MIN-3)
8. Layout selector: the four segments currently stack a technical name under
   each label. Render each pair on one line inside its segment: "Force directed
   (ngraph)", "Hierarchical (sugiyama)", "Radial (radial)", "More", with the
   technical half muted `#7a828e` and truncating with a `title` at this width;
   the plain half never truncates. Delete the three stacked technical lines.
   Keep the "Coming" tag and the "Hierarchical and Radial" note as drawn.
   (MIN-14, C7)
9. Panel and inspector: render every other stacked pair on one line -- 
   "Arrangement (Layout)", "Edge length (springLength)", "Pull to center
   (gravity)", "Keep this arrangement (Fixed)", "Age (ageYears)", "Name (id)".
   (MIN-14)
10. Legend: delete the "Legend" caption and the "Minimap" caption; delete the
    three layer counts (18, 2, 3) -- the panel's Style layers list carries every
    layer's count, and the two currently disagree (the legend says 18 where the
    panel says 20); delete the trailing caption "Humans layer, 2 nodes" for the
    same reason; render both channel headers on one line, "Color: style layers
    (fixed)" and "Size: age (ageYears)". (MIN-7, MIN-1, MIN-14)
11. Status bar: delete the "3D" mode chip; replace "Layout: Force directed
    (ngraph)" plus "Settled" with one chip "Force directed (ngraph) - settled"
    plus a 12px chevron caret; delete "AI: not configured". The engine name
    "(ngraph)" stays rendered -- only the word "Layout:" goes. (MIN-8, C7)
12. Status bar layout chip: add a comment -- "NAV-12 item 1: the caret opens the
    four Style quick picks with their size estimates and disabled reasons, the
    active engine checked, then Re-run, Stop and Layout settings... It is a
    mirror of these quick picks; Style stays the home." (NAV-12 item 1)
13. Top bar: Undo becomes a split button -- add a 12px chevron caret at its
    right, `title="History"`, no binding. (NAV-7)
14. Run row: replace the "Pin selected" and "Unpin all" glyph bodies with the
    canonical upright pushpin `<path d="M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z"></path>
    <line x1="8" y1="8.5" x2="8" y2="13.5"></line>`, so one verb has one
    drawing. (IK-2)

## ExplorePanel

State: Loaded, Explore panel open, filter active, three nodes selected.

1. Canvas: delete the entire filter status strip ("Showing 5 of 20 nodes", the
   two chips, "Select all visible / Coming", "Show all"). The status bar owns
   shown-of-total, and the Explore panel owns the active chips because Explore
   is open. Move "Show all" into the panel: it becomes a "Clear all" link on
   the panel's chip row. (MIN-1)
2. Panel, active filter chips: the two chips "indoorOutdoor = outdoor" and
   "value >= 5" each gain a 12px X on the right of the chip, and a "Clear all"
   link at `#5b8ff9` sits at the end of the row (two or more chips). Add a
   comment: "NAV-11: 5.3 previously granted no way to remove a chip; Cmd+Z is
   not the substitute, because checking a filter puts entries on top of it in
   the one shared history store." (NAV-11)
3. Panel, tier 2: the contiguous run "Neighborhood expansion", "Bookmarks",
   "Find a pattern" is three unshipped rows. Delete their per-row Coming tags,
   dim all three to `#5f6873`, draw them disabled, and put one muted "Coming
   soon" note on the divider above the first. Add one info circle immediately
   after the "Explore" panel title whose popover reads "Dimmed rows are not
   built yet." "Filter builder" and "Saved filters" are a run of two and keep
   their tags. (MIN-4)
4. Panel, tier 1: delete the whole "Zoom to selection [F]" row. The inspector
   is the home for selection-scoped actions and already carries it; F, the
   navigation cluster, the context menu and the palette are unchanged. (C12)
5. Panel, tier 1: redraw "Select all visible" and "Select" with the VOCAB
   section 10 "Subtle action row" markup -- transparent, no border, 24px, 4px
   radius, mandatory 14px leading icon at `#7a828e`, 11px label at weight 500,
   hover fill `#374047`. The Coming tag sits in the trailing data slot. (DEF-1)
6. Panel, tier 1 search: add an info circle immediately to the right of the
   focused search input, and because the field is focused draw its popover OPEN
   using the VOCAB 250px popover markup, carrying "Prefix with id:, type:,
   exact: or regex:, or start with = for an expression." (This artboard is
   where that state is drawn.) (IC-8, C1)
7. Inspector, Notes section: delete the count "0" from the header and delete
   the `N` key chip beside it. Header reads "Notes"; the binding moves into the
   "Add a note to these 3 nodes" input's `title` as "Add a note (N)". (MIN-2,
   DEF-1)
8. Inspector title row: "3 nodes, 0 edges" becomes "3 nodes". A zero half of a
   selection count is not drawn. (MIN-2)
9. Legend: delete the "Legend" caption and the "Minimap" caption; delete the
   whole "Color: not encoded" block; delete the counts on the four state rows
   so they read "Selected", "Matches filter", "Filtered out", "Edges shown";
   render the remaining channel header on one line, "Size: most connected
   (degree)". (MIN-7, MIN-2)
10. Panel section headers: delete "2 active" from Filter builder, "2 saved"
    from Saved filters, "5 actions" from Selection sets and actions, and "3
    views" from Bookmarks. Catalogue counts go entirely; the chips themselves
    are on screen. (MIN-3)
11. Status bar: delete the "3D" mode chip; replace "Layout: Force-directed"
    plus "Settled" with one chip "Force directed - settled" plus a 12px chevron
    caret; delete "AI: not configured". The counts slot keeps "5 of 20 nodes /
    6 of 29 edges" -- it is the owner. (MIN-8, NAV-12 item 1)
12. Top bar: Undo becomes a split button -- add a 12px chevron caret at its
    right, `title="History"`, no binding. (NAV-7)
13. Inspector: add a 20px header row above the reading with one icon-only copy
    control right-aligned, `title="Copy reading"`. (NAV-5)
14. Inspector title row: replace the pin glyph body with the canonical upright
    pushpin `<path d="M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z"></path><line x1="8"
    y1="8.5" x2="8" y2="13.5"></line>`. (IK-2)
15. Inspector action block: keep every label as text, including "Copy ids".
    IK-5 would collapse a lone copy action into an icon, but IK-4 and IK-8
    exempt the pinned inspector action block from icon-only controls by
    construction; the exemption wins. Record it as a comment so a later pass
    does not iconify the block. (IK-4/IK-8 versus IK-5, resolved toward text)
16. Inspector, filter builder attribute row: add a comment on the "Most
    connected (degree) / Metric" row -- "DEF-7: this select's last group lists
    node metrics the graph supports that have not been run, each with a 12px
    play glyph, the technical name dimmed and 'not run' as the trailing hint;
    picking one runs it and applies the filter as one undoable pair.
    FilterBuilderExpert draws the open form." Leave the select closed. (DEF-7)
17. Panel: the "More" tier 3 row and the disabled "Ego network / Coming" row
    keep their reasons in their own `title` and never as body text. (IC-4)

## AnalyzePanel

State: Loaded, Analyze panel open, Cards view, Run tab, nothing run.

1. Delete the entire tier 1 graph statistics block: the "Nodes 20 / Edges 29"
   row, the "More statistics" link, and the rows Direction Undirected, Weighted
   Yes (value), Average links per node (mean degree) 2.9, How tightly linked
   (density) 0.153, Connected parts (components) 1 (largest holds 100%). It is
   a character-for-character copy of the inspector Counts section rendered at
   the same moment 900 px to the right. The tier 2 "All statistics" section
   stays in the scroll flow. (MIN-12)
2. Add a sticky scope line directly under the Run | Results tabs, 24px tall,
   reading "Scope: all 20 visible nodes." with a "Change" link at `#5b8ff9`,
   and move the tier 2 "Weight | value" and "Treat as | Strength" controls up
   beside it, so the panel header carries the scope line and those two controls
   only. Then delete the line "On 20 of 20 nodes" from all fifteen cards.
   (MIN-5, MIN-12)
3. Question group headers: delete the card count and the cost class from every
   open header. "Find groups / 4 cards / heavy" becomes "Find groups"; "Find
   important nodes / 4 cards / iterative" becomes "Find important nodes"; "Find
   weak points / 4 cards / heavy" becomes "Find weak points"; "Find paths / 3
   cards / instant" becomes "Find paths"; "Find unusual things / 1 card /
   iterative" becomes "Find unusual things"; "Predict / 1 card / heavy" becomes
   "Predict". The collapsed "Advanced / 3 cards / instant to cubic" becomes
   "Advanced" with a dimmed trailing "3" and `title="3 questions in this
   group"`. No group header carries a key chip. (DEF-2, C4)
4. Every card: no card on this 20-node graph exceeds 2 s, so no card carries an
   estimate anywhere -- not on the title, not on the scope line, not beside Run.
   Every action row is the VOCAB "Per-card cost estimate beside Run" under-2-s
   snippet: "Parameters" on the left, the filled "Run" button on the right.
   Card descriptions stay inline: this is Cards view and the description is the
   most valuable text on the card. (DEF-2, G1)
5. Delete the three "Pick a node first" lines from Find a path, Distance from
   here and Every route. The disabled Run button and the empty From/To fields
   carry the state; each Run button's `title` names the precondition ("Run.
   Pick a node first: click two nodes or type names"). On the Bottleneck
   capacity card, delete the line "Leave both empty for the global cut." and
   put it behind an info circle on the From/To pair -- it is the one such line
   that adds a fact. (MIN-12, IC-4)
6. All statistics section: move "Recompute", "Copy" and "Export CSV" out of the
   footer and onto the section header as a hover-revealed icon group, drawn in
   its revealed state, using the VOCAB section 10 "Icon group in a section
   header, revealed on hover" snippet verbatim (it is written for this exact
   header): recompute icon `title="Recompute"`, download icon `title="Export
   CSV"`, overflow dots `title="More"` whose menu holds "Copy". The footer
   keeps only "Computed rows: 14:12". (IK-6)
7. All statistics section header: delete the sentence "Instant rows follow the
   data." from the footer and put it behind an info circle placed immediately
   after the header's canonical pair, popover text "Instant rows follow the
   data; computed rows are recomputed on request." (IC-6, MIN-11)
8. All statistics rows: delete the value "Not computed" beside the Coming tag
   on "Tight-knit neighborhoods, average (clustering coefficient)" and "Closed
   triangles (transitivity)". A row that is still computing reads
   "Computing...", so an absent value unambiguously means not yet. Both rows
   keep their per-row Coming tags (a run of two, not three). (MIN-2)
9. Influence card: delete the "Docs" link from the open Parameters header and
   put an info circle immediately after the card's canonical pair "Influence
   (PageRank)". Popover text: "A node scores high when the nodes pointing at it
   score high." plus one "Learn more" link at `#5b8ff9`, exactly as the VOCAB
   "Info circle (6.7)" popover snippet draws it. The inline description "Nodes
   with well-linked neighbors." stays. (IC-8, G1)
10. Inspector, Graph summary: restructure per MIN-9 -- move Counts below the
    reading as a tier 2 collapsed section; replace "Direction | Undirected" and
    "Weighted | Yes (value)" with one row "Type | Undirected, weighted
    (value)"; delete "Isolated nodes | 0" and the clause "(largest holds 100%)";
    density keeps "0.153" with the scientific form in its `title`; merge "Node
    attributes 8" and "Edge attributes 3" into one collapsed section headed
    "Attributes" with Nodes and Edges tabs when open; move the repeated word
    "links" off the five Most-connected value cells onto the column header;
    replace "Case notes: none" plus "Add a case note" with the single link "Add
    a case note". (MIN-9, MIN-2)
11. Inspector: delete the "Export top 20 (CSV)" link under Most connected and
    the "Export schema JSON" link inside Schema; both headers gain a
    hover-revealed download icon drawn in its revealed state, the Most-connected
    menu holding "Export top 20 (CSV)" and "Export ranked list (CSV)" and the
    Schema menu holding "Export schema JSON". Applied on every artboard that
    draws these headers, so the inspector reads the same everywhere. (IK-6)
12. Inspector: add a 20px header row above the reading with one icon-only copy
    control right-aligned, `title="Copy reading"`. (NAV-5)
13. Sub-tabs: "Results (0)" becomes "Results". History header: delete the count
    "1". Both are counts of 0 or 1. (MIN-2)
14. All statistics header: render its pair on one line, "All statistics
    (Statistics panel)", with the technical half muted. Delete the stacked
    second line. (MIN-14)
15. Legend: delete the "Legend" caption and the "Minimap" caption; delete the
    whole "Color: not encoded" block; render the remaining channel header on
    one line, "Size: most connected (degree)". (MIN-7, MIN-2, MIN-14)
16. Status bar: delete the "3D" mode chip; replace "Layout: Force-directed"
    plus "Settled" with one chip "Force directed - settled" plus a 12px chevron
    caret; delete "AI: not configured". (MIN-8, NAV-12 item 1)
17. Top bar: Undo becomes a split button -- add a 12px chevron caret at its
    right, `title="History"`, no binding. (NAV-7)
18. More row: the "How it changed over time / Coming / Temporal analysis /
    Needs a Time role" row keeps "Needs a Time role" as the disabled control's
    own `title` rather than as body text: `title="How it changed over time.
    Needs a Time role"`. (IC-4)
19. Leading file comment: add "NAV-11 item 1: a batch of two or more node-metric
    results emits one Rankings summary card in the Results tab -- the union of
    the top N across methods, one rank column per method, an agreement column,
    the pairwise Spearman correlation of the top 20, and Select agreement set,
    Combine into a score, Encode as style, Export CSV, See all in data table.
    Nothing is drawn here: Results is empty. 'Run all node rankings' stays a
    text row (IK-8 never list)." (NAV-11 item 1)
20. Leading file comment: add "NAV-11 item 2: History's actions row gains 'Save
    as recipe...', which names the ordered history and stores it under Saved
    items -- the same artifact Present exports as JSON. History is collapsed
    here." (NAV-11 item 2)

## AiPanel

State: Result. AI panel open, Bridges result in the inspector, provider
connected.

1. Inspector, run record: collapse it. "Betweenness, normalized. Scope:
   visible, 20 of 20 nodes. 2026-09-04 14:12, 4 ms, algorithms 1.4.0" plus the
   three copy links becomes one line with a leading 12px chevron reading
   "Betweenness, normalized. All 20 nodes." followed by a "Details" chevron.
   Draw Details EXPANDED (this canvas needs the full record visible somewhere),
   the block carrying weight, direction, timestamp, duration, engine version
   and the three copy items. The caveats line "Exact. Unweighted, direction
   ignored. Computed on all 20 nodes." stays visible above it. (IC-5)
2. Inspector, card title row: add one icon-only copy control right-aligned,
   `title="Copy"`, opening a menu whose full labels are "Copy as TSV" and
   "Export ranked list (CSV)". Delete the standalone "Copy as TSV" link and the
   "Export ranked list (CSV)" row from the body actions. (IK-5)
3. Inspector, body actions: after item 2 removes "Copy as TSV" and "Export
   ranked list (CSV)" from this row, the remaining unshipped rows are "Select
   top 5" and "Filter above threshold" -- a contiguous run of two, not three.
   Both KEEP their per-row Coming tags; do not dim them, do not add a "Coming
   soon" group note, and do not add a panel-level info circle on this artboard.
   The "Console" section header keeps its isolated tag. Verify that no
   unshipped row carries a key chip. (MIN-4)
4. Panel, step list: every step row title becomes a link at `#5b8ff9` -- "Ran
   Groups", "Ran Bridges", "Styled nodes by bridge score". Add a comment:
   "NAV-7: a step row title opens the step's home panel, scrolls to the control
   or result it produced and highlights it for two seconds; it never re-runs
   anything." The trailing panel names (Analyze, Analyze, Style) stay as they
   are. (NAV-7)
5. Panel, Console section header: delete the ` key chip. A binding never
   appears in a section header. It moves into the console input's `title` as
   "Console (Shift+`)". (DEF-1)
6. Panel, chat input: add `title="Ask the assistant (`)"` to the input. Add a
   comment: "NAV-9: backtick focuses the assistant input when a provider is
   configured and the console otherwise; Shift+backtick always focuses the
   console." (NAV-9)
7. Panel, tier 2: add one muted 11px `#7a828e` line directly under the "Voice
   input" switch reading "Also used for push-to-talk in VR and AR." (XR-G)
8. Panel, tier 2: the Model row reads "Anthropic, claude-sonnet-5, connected"
   directly under a "Provider" row whose value is already "connected". Delete
   the trailing ", connected" from the Model line. (MIN-1, MIN-11)
9. Inspector, Distribution block: delete the caption "linear x, linear y". A
   default axis scale is not named; only a non-default scale prints its name.
   (MIN-2)
10. Legend: delete the "Legend" caption and the "Minimap" caption; delete the
    line "Okabe-Ito palette" -- the palette name moves to the legend's overflow
    menu and stays on Style's Palette select; render both channel headers on
    one line, "Color: Groups (communities, Louvain)" and "Size: Bridges
    (betweenness)". KEEP the four group counts 7, 6, 4, 3: no panel on this
    screen lists every group (the inspector shows the Bridges result), so the
    legend is their only home. This differs from ExplorerAfterCard on purpose.
    (MIN-7, MIN-1, MIN-14)
11. Status bar: delete the "3D" mode chip; replace "Layout: Force-directed"
    plus "Settled" with one chip "Force directed - settled" plus a 12px chevron
    caret. KEEP "AI: Anthropic ready" -- a provider is configured, which is
    exactly when the AI slot renders. (MIN-8, NAV-12 item 1)
12. Top bar: Undo becomes a split button -- add a 12px chevron caret at its
    right, `title="History"`, no binding. (NAV-7)
13. Inspector: add a 20px header row above the reading with one icon-only copy
    control right-aligned, `title="Copy reading"`. (NAV-5)
14. Inspector title row: replace the pin glyph body `<path d="M9.5 2.5l4 4-2
    1-2.5 3.5-1-1L4.5 13.5 2.5 11.5l3.5-3.5-1-1 3.5-2.5z"></path>` with the
    canonical upright pushpin `<path d="M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z"></path>
    <line x1="8" y1="8.5" x2="8" y2="13.5"></line>`. (IK-2)
15. Inspector, encoding state: leave "Encoded as node size" with "Change
    encoding" exactly as drawn. This artboard is the reference for NAV-2's
    applied form; record that in a comment so a later pass does not revert it
    to an unpressed "Encode as style". (NAV-2)

## PresentPanel

State: Loaded, Present panel open, nothing selected, nothing pinned.

1. Panel, tier 2: add a "Save as recipe..." row immediately above "Export
   analysis recipe (JSON)", drawn with the VOCAB section 10 "Subtle action row"
   markup, enabled, with no Coming tag. Add a comment: "NAV-11 item 2: Save as
   recipe names the ordered history and stores it under Saved items -- the same
   artifact this panel exports as JSON. History's actions row carries the same
   item, and Welcome gains a Saved recipes block." (NAV-11 item 2)
2. Report sections checklist: delete the header count "4 of 11 selected" and
   give every non-empty row its own item count, right-aligned and dimmed:
   "Graph summary 1", "View image 1", "Legend 2", "Methods 1". Rows with no
   content stay unchecked with no count: Analysis results, Validation report,
   Data changes (Cleaning steps), Analysis steps, Notes (evidence log). Delete
   the "0" from "Pinned items". "Data tables (first 100 rows)" stays unchecked
   by default whatever its content. Add a comment: "NAV-11 item 4: report
   sections default to checked whenever their content is non-empty, but never
   Data tables." (NAV-11 item 4, MIN-3, MIN-2)
3. Panel, Export image: delete the line "Also JPEG and WebP. SVG and PDF
   [Coming]". The Format select lists PNG, JPEG, WebP, SVG and PDF and carries
   the Coming tags on the two vector options, so the sentence restates a list
   on the same screen. Do the same for Export data: delete "Also CSV. GraphML,
   GEXF and CX2 [Coming]". (MIN-11)
4. Panel, More row: delete the line "Dialog: title, sections, format, row cap,
   Include done notes." The dialog's field list printed under "Generate
   report..." restates what opening it shows. (MIN-11)
5. Panel, Export data: delete the clause "no notes yet" beside "Include notes"
   and draw the switch off with `title="Include notes. This graph has none
   yet"`. Delete "None yet" from "Analysis results as CSV" and "Notes as CSV"
   and draw both rows disabled at `#5f6873` with the reason in each row's own
   `title` ("Analysis results as CSV. Run something first", "Notes as CSV. Add
   a note first"). (MIN-2, IC-4)
6. Panel, Image export options: delete the caption "hides unpinned labels"
   beside "Publication ready" and put it behind an info circle immediately
   after the switch label, popover "Publication ready hides every node label
   except the ones you have pinned." (IC-8, IC-6)
7. Inspector, Graph summary: restructure per MIN-9 -- Counts becomes a tier 2
   collapsed section under the reading; "Direction | Undirected" and "Weighted
   | Yes (value)" merge into "Type | Undirected, weighted (value)"; delete
   "Isolated nodes | 0" and "(largest holds 100%)"; merge "Node attributes 8,
   included in export" and "Edge attributes 3, weight is value" into one
   collapsed "Attributes" section with Nodes and Edges tabs (the trailing
   clauses "included in export" and "weight is value" move onto the tabs);
   move the repeated word "links" onto the Most-connected column header;
   replace "Case notes: none" plus "Add a case note" with the single link "Add
   a case note". (MIN-9, MIN-2)
8. Inspector, Most connected: delete the "Export top 5 (CSV)" row and its
   Coming tag; the section header gains a hover-revealed download icon, drawn
   revealed, whose menu holds "Export top 20 (CSV)" and "Export ranked list
   (CSV)". Delete the Coming tag entirely: IK-3 forbids an icon-only control
   from carrying one, and this header is drawn untagged on Main, AnalyzePanel,
   Settings and CommandPalette, so tagging it here alone is the inconsistency
   IK-6's all-or-none rule exists to remove. Give the Schema header the same
   revealed download icon, menu "Export schema JSON". (IK-6, IK-3, resolved
   toward untagged)
9. Inspector: add a 20px header row above the reading with one icon-only copy
   control right-aligned, `title="Copy reading"`. (NAV-5)
10. Legend: delete the "Legend" caption and the "Minimap" caption; delete the
    whole "Color: not encoded" block; render the remaining channel header on
    one line, "Size: most connected (degree)". (MIN-7, MIN-2, MIN-14)
11. Status bar: delete the "3D" mode chip; replace "Layout: Force-directed"
    plus "Settled" with one chip "Force directed - settled" plus a 12px chevron
    caret; delete "AI: not configured". (MIN-8, NAV-12 item 1)
12. Top bar: Undo becomes a split button -- add a 12px chevron caret at its
    right, `title="History"`, no binding. (NAV-7)
13. Keep every export size on this screen: "about 420 KB" in the Output
    readout, "about 6 KB" on the Scope label row. DEF-3's size rule removes
    sizes that decide nothing; here the number is the decision. Record this in
    a comment so a later pass does not delete them. (DEF-3)
14. Keep "Export image", "Export data" and "Copy to clipboard" as icon plus
    text. They are the destination actions the panel exists for, which is the
    icon-plus-text case of the label-first test, and Present's exports are
    named exempt from the icon rule. Record it as a comment. (IK-1, IK-8)
15. Rail Present icon: add a comment -- "NAV-11 item 4: the Present rail icon
    carries a badge counting pinned items plus unresolved notes. This dataset
    has neither, so no badge is drawn." (NAV-11 item 4)
16. Panel: add a comment on the Export data Scope control -- "NAV-12: 'Export
    selection...' from the multi-selection context menu, the inspector More
    list and the palette all land here with Scope preset to Selection (N).
    Export stays in Present." (NAV-12)

## Settings

State: Settings overlay open on AI providers, Explorer under the scrim.

1. AI providers heading: delete the sentence "Connect a provider to use the AI
   assistant. The assistant drives the same panels you can use by hand." and
   put an info circle immediately after the heading "AI providers", using the
   VOCAB section 10 "Info circle (6.7)" resting markup. Popover text: "Connect
   a provider to use the AI assistant. It drives the same panels you can use by
   hand." (IC-6)
2. The callout box "All features work without AI. Loading data, exploring,
   running algorithms, styling and exporting never need a provider." STAYS
   inline, box and all. IC-6 would move a teaching sentence behind a circle,
   but 6.7's third carve-out keeps text that says where the user's data goes
   inline, and on this screen that is the sentence that tells the user nothing
   has to leave the browser. Resolved toward inline; record the reason in a
   comment. (IC-6 versus 6.7 carve-out 3)
3. The callout box's leading glyph is a circled i at `<circle cx="8" cy="8"
   r="6.5"></circle><line x1="8" y1="7.5" x2="8" y2="11.5"></line><line x1="8"
   y1="4.75" x2="8" y2="5.25"></line>`. Replace the svg body with the canonical
   info-circle path so one verb has one drawing: `<circle cx="8" cy="8"
   r="6.5"></circle><line x1="8" y1="7" x2="8" y2="11.5"></line><line x1="8"
   y1="4.5" x2="8" y2="4.75"></line>`. (IC-2)
4. "Assistant and notes" section: delete the two-sentence note under the
   switches. The first sentence, "Notes the assistant adds are signed Assistant
   and carry a distinct marker.", moves behind an info circle placed
   immediately after the section name. The second, "Both switches are off until
   a provider is configured.", is an unavailable reason and becomes each
   switch's own `title` ("Assistant can read notes. Configure a provider
   first"), never body text. (IC-6, IC-4)
5. "Default provider" control: delete the sub-line "Used when opening the AI
   assistant" and put it behind an info circle immediately after the label
   "Default provider". (IC-6)
6. "Encryption password" control: delete the sub-line "Optional, re-entered
   each session" and put it behind an info circle immediately after the label.
   (IC-6)
7. Key storage: the sentence "Keys are encrypted and stored in this browser
   only. They are sent to the provider you choose and nowhere else." STAYS
   inline and is never circled -- it says where the user's credentials go, which
   is 6.7's third carve-out. Add a comment saying so. (IC-6 carve-out)
8. AI providers section heading row: add a filled primary button "Save and
   return" at the right end of the heading row, using the VOCAB section 4
   "Primary button" markup, drawn enabled (a key is present). Add a comment:
   "NAV-9: the AI panel's setup link opens this section with Save and return;
   saving a key closes Settings, reopens the AI panel and focuses its input."
   (NAV-9)
9. Local (WebLLM) row: "Llama 3.2 1B not downloaded, ~700 MB" becomes "Llama
   3.2 1B not downloaded, about 700 MB". A tilde is never used for an estimate;
   the size itself stays, because here the size is the decision. (DEF-3, VOCAB
   estimate wording)
10. Inspector under the scrim, Graph summary: restructure per MIN-9 -- Counts
    becomes a tier 2 collapsed section under the reading; "Direction" and
    "Weighted" merge into "Type | Undirected, weighted (value)"; delete
    "Isolated nodes | 0" and "(largest holds 100%)"; merge "Node attributes 8"
    and "Edge attributes 3" into one collapsed "Attributes" section; move the
    repeated word "links" onto the Most-connected column header; replace "Case
    notes: none" plus "Add a case note" with one "Add a case note" link;
    replace "Full statistics are in Analyze" plus "More" with one "More in
    Analyze" link. (MIN-9, MIN-2)
11. Inspector under the scrim: delete the "Export top 5 (CSV)" link; the Most
    connected header gains a hover-revealed download icon (drawn revealed) with
    the menu "Export top 20 (CSV)" and "Export ranked list (CSV)", and the
    Schema header the same with "Export schema JSON". (IK-6)
12. Inspector under the scrim: add a 20px header row above the reading with one
    icon-only copy control right-aligned, `title="Copy reading"`. (NAV-5)
13. Legend under the scrim: delete the "Legend" caption and the "Minimap"
    caption; delete the whole "Color: not encoded" block; render the remaining
    channel header on one line, "Size: most connected (degree)". (MIN-7,
    MIN-2, MIN-14)
14. Status bar: delete the "3D" mode chip; replace "Layout: Force-directed"
    plus "Settled" with one chip "Force directed - settled" plus a 12px chevron
    caret. KEEP "AI: Anthropic ready" -- a provider is configured. (MIN-8,
    NAV-12 item 1)
15. Top bar: Undo becomes a split button -- add a 12px chevron caret at its
    right, `title="History"`, no binding. (NAV-7)
16. Section nav: add a comment -- "IC-3: Settings > Appearance carries the
    master control 'Show help text in place', default off, with the sub-line
    'Off keeps every explanation one hover or tap away on the i.' On, every
    info circle in the application draws its sentence inline and the circle is
    hidden. Density governs row scale only. Appearance is not drawn on any
    artboard." (IC-3)

## CommandPalette

State: Loaded, palette open with "bridge" typed, no panel open.

1. Palette results: add an "Attributes" group below "Commands" and above
   "Nodes", using the same group-heading style as Commands. Draw two rows,
   capped at five with "and 2 more" as the last row:
   - "Bridges betweenness" with the technical half muted, second cell "number,
     0 to 0.41", and a trailing action strip of four cells -- "Color by",
     "Size by", "Filter by", "Show in table" -- with "Size by" drawn as the
     chosen cell (`background: #28364e; color: #4a7ee8`).
   - "bridgeFlag flag" with second cell "true or false" and the same strip with
     "Filter by" chosen.
   Add a comment: "NAV-6: Commands always rank above Attributes; the group caps
   at five rows with 'and N more' and appears only after three typed
   characters; Left and Right choose the action and Enter runs it." (NAV-6)
2. Palette results, Commands group: add one Actions row above "Bridges" reading
   "Run all node rankings" with the muted second name "All centralities" and no
   estimate. Add a "Find a path" hint row at the bottom of the Commands group
   reading "@a > @b" in the mono face at `#7a828e` with the label "Find a path
   between two nodes" and `Enter` in its last cell. (NAV-6)
3. Delete every cost-class word from the palette rows: "instant on 20 nodes"
   under Bridges, "instant on 29 edges" under Bridge edges and "instant on 20
   nodes" under Find a path all go. No cost word appears anywhere in the
   interface, and under 2 s no estimate is shown at all. The Bridges row keeps
   its remembered-parameter line "normalized, weight value"; the Bridge edges
   and Find a path rows lose their second line entirely. (DEF-2)
4. Search row: delete the count "4 results". Catalogue counts go entirely.
   (MIN-3)
5. Palette footer: delete the sentence "Searches plain and technical names" and
   put it behind an info circle placed at the right end of the search input
   row, popover "Searches plain and technical names. Prefix @ to search node
   ids and labels." The footer keeps its three key-chip hints (Up Down to move,
   Esc to close) -- those are palette chrome, not explanatory text. (IC-8)
6. Inspector, Graph summary: restructure per MIN-9 -- Counts becomes a tier 2
   collapsed section under the reading; "Direction" and "Weighted" merge into
   "Type | Undirected, weighted (value)"; delete "Isolated nodes | 0" and
   "(largest holds 100%)"; merge "Node attributes 8" and "Edge attributes 3"
   into one collapsed "Attributes" section with Nodes and Edges tabs; move the
   repeated word "links" onto the Most-connected column header; replace "Case
   notes: none" plus "Add a case note" with one "Add a case note" link; replace
   "Full statistics are in Analyze" plus "More" with one "More in Analyze"
   link. (MIN-9, MIN-2)
7. Inspector: delete the "Export top 5 (CSV)" link; the Most connected header
   gains a hover-revealed download icon (drawn revealed) with the menu "Export
   top 20 (CSV)" and "Export ranked list (CSV)", and the Schema header the same
   with "Export schema JSON". (IK-6)
8. Inspector: add a 20px header row above the reading with one icon-only copy
   control right-aligned, `title="Copy reading"`. (NAV-5)
9. Legend: delete the "Legend" caption and the "Minimap" caption; delete the
   whole "Color: not encoded" block; render the remaining channel header on one
   line, "Size: most connected (degree)". (MIN-7, MIN-2, MIN-14)
10. Status bar: delete the "3D" mode chip; replace "Layout: Force-directed"
    plus "Settled" with one chip "Force directed - settled" plus a 12px chevron
    caret; delete "AI: not configured". (MIN-8, NAV-12 item 1)
11. Top bar: Undo becomes a split button -- add a 12px chevron caret at its
    right, `title="History"`, no binding. (NAV-7)
12. Leading file comment: add the index additions this revision makes, none of
    which match the query "bridge" and so none of which are drawn -- "NAV-6 and
    DEF-5: the palette also indexes Open file, Import options (technical:
    import mapping, enabled only when a file is loaded), Change the column
    mapping, Ask the assistant..., Console, Show suggestions, More suggestions
    (N), Copy the graph summary, the Help menu's documentation and feedback
    items, every question-group batch action, the Data table drawer's Compare
    measures, Export selection and History entries. Rows sort with an exact id
    or label match first. The Enter and Cmd+Enter split applies to capability
    rows only; on every other row Enter performs the row's action directly. A
    palette load of a sample dataset is guarded by the Import options 'What to
    do with this file' step." (NAV-6, DEF-5, NAV-8, NAV-9)
13. Leading file comment: add "IK-8: 6.8 does not apply to the command palette.
    Every row keeps its full text label; no palette row is ever iconified."
    (IK-8)
14. Bridge edges row: it stays isolated and keeps its per-row Coming tag, but
    it carries no key chip -- a binding that does nothing is worse than no chip.
    Verify no chip is drawn on it. (MIN-4)

## InsightsWide

State: Loaded, no panel open, four-card Insights strip, fraud-ring dataset.

1. Inspector, Graph summary: restructure per MIN-9.
   a. Move Counts below the reading as a tier 2 collapsible section, collapsed.
   b. Replace the three rows "Direction | Directed (from file)", "Weighted |
      Yes (amount, as strength)", "Timed | Yes (ts)" with one Type row: "Type |
      Directed (from file), weighted (amount), timed (ts)".
   c. Delete "Isolated nodes | 0" and the clause "(largest holds 100%)".
   d. Density keeps "0.031" with the scientific form in the row's `title`.
   e. Merge "Node attributes 6" and "Edge attributes 4" into one collapsed
      "Attributes" section with Nodes and Edges tabs.
   f. Most connected: delete "links" from the five value cells and put it on
      the column header.
   g. Replace "Case notes: none" plus "Add a case note" with one "Add a case
      note" link.
   Keep "Self-loops 2" and "Parallel edges 5 (combined at import)": both are
   non-zero. (MIN-9, MIN-2)
2. Insights strip trailing line: "2 more in Help" becomes a link at `#5b8ff9`.
   Add a comment: "NAV-8: it opens the Help menu with More suggestions
   expanded. The strip's X raises 'Suggestions hidden on every dataset.  Undo'
   for eight seconds and is reversible later from Help > Show suggestions and
   the palette. F6 reaches the strip; Left and Right move between cards, Enter
   activates, Delete dismisses." (NAV-8)
3. Status bar: the issues chip "4 issue types (27)" becomes "4 data issues"
   with `title="4 issue types, 27 issues"`; the rail Data badge "4" becomes an
   unnumbered warning dot (same 8px dot geometry, no number); delete the "3D"
   mode chip; replace "Layout: Force-directed" plus "Settled" with one chip
   "Force directed - settled" plus a 12px chevron caret; delete "AI: not
   configured". (MIN-8, MIN-1, NAV-12 item 1)
4. Legend: delete the "Legend" caption and the "Minimap" caption; delete the
   whole "Color: not encoded" block including its "All nodes" swatch row; the
   Size block draws tick values 1, 6 and 44, so its caption keeps only the scale
   word -- "1 to 44, sqrt scale" becomes "sqrt scale"; render the channel header
   on one line, "Size: most connected (degree)". Keep the "Time: ts" block with
   its Coming tag and "Step through time" line: it names the assigned Time role
   and its affordance, not an unencoded channel. (MIN-7, MIN-2, MIN-14)
5. Inspector: delete the "Export top 5 (CSV)" link; the Most connected header
   gains a hover-revealed download icon (drawn revealed) with the menu "Export
   top 20 (CSV)" and "Export ranked list (CSV)", and the Schema header the same
   with "Export schema JSON". (IK-6)
6. Inspector: add a 20px header row above the reading with one icon-only copy
   control right-aligned, `title="Copy reading"`. Add a comment: "NAV-5: on the
   graph summary this copies the reading, the caveats line, the Counts rows and
   the legend channel lines." (NAV-5)
7. Top bar: Undo becomes a split button -- add a 12px chevron caret at its
   right, `title="History"`, no binding. (NAV-7)
8. Insights strip: leave all four card bodies exactly as drawn, including the
   card 1 body "14 missing amounts, 6 non-date values, 5 repeated pairs and 2
   self-loops." MIN-1 makes the status bar the owner of validation issue
   counts, but an insight card body is reported text pinned inline by 6.7, and
   G3 exempts the strip from every density rule. Resolved toward keeping the
   card body; record the reason in a comment. (G3 and IC-1 versus MIN-1)
9. Insights strip: keep both names on every card ("Find groups" over
   "Communities (Louvain)"), rendered as one line -- "Find groups (Communities,
   Louvain)", "Who has influence (PageRank)", "Check 4 data issues (Data
   validation)", "Search for something you know (Search)" -- with the technical
   half muted. Dropping the technical name from strip cards was refused; the
   one-line rendering is what recovers the space. (MIN-14, C7)
10. Add a comment on the strip: "NAV-2: a card click applies the result's
    primary encoding as a style layer automatically -- identically from the
    panel's Run, the palette, the console and the assistant -- unless a
    user-authored style layer already drives that channel. The applied form
    reads 'Encoded as node color' with 'Change encoding' beside it, and the
    application is one undoable step separate from the result." (NAV-2)
11. Leading file comment: add "G3: the Insights strip is the arrival path and
    is exempt from every density rule. Card bodies, both names and the
    four-card cap stay as drawn." (G3)

## TimeSlider

State: Loaded, Explore panel open, time slider docked, 30-day window active,
fraud-ring dataset.

1. Time slider overlay: delete row 2 entirely -- "Window | 30 days", "Step | 7
   days", the "Cumulative | Sliding" segmented control, "Speed 1x" and "Compare
   with another window". The bar keeps row 1 only: the transport (step back,
   play, pause, step forward), the "Viewing: 2026-01-05 to 2026-02-04" readout,
   the "by opened" sub-label, and a gear at the right that opens the Explore
   section. This shrinks the overlay from 96 to about 56 tall; move the
   navigation cluster, minimap and legend bottom offsets down by the difference.
   (MIN-15)
2. Explore panel: merge the tier 1 "Step through time / Coming / Temporal
   navigation" row and the tier 2 "Time slider settings" section into ONE tier 2
   section headed "Step through time (Temporal navigation)" with the On switch
   on the section header. Its body holds the Time attribute, Window size, Step,
   Playback speed, Window mode and "Recompute results on each step" rows that
   the section already draws, plus the "Compare with another window" action
   moved down from the slider bar. One home for the slider's settings. (MIN-15)
3. Canvas: delete the entire filter status strip ("Showing 120 of 200 nodes",
   "Time window", "2026-01-05 to 2026-02-04", "Show all"). The status bar owns
   shown-of-total, the slider readout and the status bar Viewing slot own the
   window, and the strip drops its time chip while the slider is docked. Move
   "Show all" into the panel as the "Clear all" link on the Active filters row.
   (MIN-1, MIN-15)
4. Explore panel, Active filters: the chip currently reads "Time:" over
   "2026-01-05 to 2026-02-04". It becomes a single chip reading "Time window"
   with no value -- the chip names the filter rather than repeating it -- with a
   12px X on its right and the "Clear all" link at the end of the row.
   (MIN-1, MIN-15, NAV-11)
5. Explore panel, tier 2: the contiguous run "Filter builder", "Saved filters",
   "Neighborhood expansion" is three unshipped rows. Delete their per-row Coming
   tags, dim all three to `#5f6873`, draw them disabled, and put one muted
   "Coming soon" note on the divider above the first. Add one info circle after
   the "Explore" panel title whose popover reads "Dimmed rows are not built
   yet." "Find a pattern" stays isolated and keeps its tag. (MIN-4)
6. Explore panel, tier 1: delete the whole "Zoom to selection [F]" row (the
   inspector is the home for selection-scoped actions), and redraw "Select all
   visible" with the VOCAB section 10 "Subtle action row" markup -- transparent,
   no border, 24px, 14px leading icon at `#7a828e`, 11px label weight 500 -- with
   the `Cmd+A` chip deleted and the binding moved into the row's `title` as
   "Select all visible (Cmd+A)". The Coming tag sits in the trailing slot.
   (C12, DEF-1)
7. Time slider overlay: delete the `T` key chip from the bar. A binding never
   appears in a toolbar slot; it moves into the gear's `title` as "Time slider
   settings (T)". The hovered "Step forward" tooltip bubble drawn open KEEPS its
   `.` chip -- a tooltip is one of the four places a binding appears. (DEF-1)
8. Every unit-bearing string on this artboard is derived from the Time role's
   unit family. This dataset's Time role is Date and time, so: the Window size
   and Step controls keep their unit selects with chevrons (VOCAB "Unit-aware
   time slider labels", Date-and-time snippet); the readout and status bar slot
   read "Viewing: 2026-01-05 to 2026-02-04"; the step tooltip reads "Step
   forward 7 days (.)"; the track ticks stay month and day labels. Change
   "Playback speed | 1x (one step per second)" to "1x (one window per second)"
   -- "step" there means a playback tick and collides with the data unit. Add a
   comment naming the two other families: "DEF-4: with Measured in = Number,
   unit 'step', the same controls render a static 'steps' label instead of the
   select and the readout reads 'Viewing: steps 1,200 to 1,250'; with Ordered
   category, 'releases' and 'Viewing: v1.2 to v1.4', the track evenly spaced and
   the sparkline one bar per category." (DEF-4)
9. Inspector, Graph summary: restructure per MIN-9 -- Counts becomes a tier 2
   collapsed section under the reading; replace "Direction | Directed (from
   file)", "Weighted | Yes (amount, as strength)" and "Timed | Yes (opened)"
   with one row "Type | Directed (from file), weighted (amount), timed
   (opened)"; delete "Isolated nodes | 0"; density keeps "0.024" with the
   scientific form in its `title`; merge "Node attributes 4" and "Edge
   attributes 3" into one collapsed "Attributes" section with Nodes and Edges
   tabs; move the repeated word "links" off the five Most-connected value cells
   onto the column header; replace "Case notes: none" plus "Add a case note"
   with one "Add a case note" link. Keep "Connected parts (components) | 3
   (largest holds 88%)" -- there is more than one part, so the share is not a
   zero-state restatement. Keep every "N of M" count: a window makes shown and
   total differ. (MIN-9, MIN-2, MIN-5)
10. Inspector, Most connected: delete the "Export top 5 (CSV)" row and its
    Coming tag; the header gains a hover-revealed download icon, drawn
    revealed, menu "Export top 20 (CSV)" and "Export ranked list (CSV)". Delete
    the Coming tag rather than carrying it on an icon -- IK-3 forbids it, and
    four of the six artboards that draw this header already draw it untagged.
    Give the Schema header the same revealed download icon, menu "Export schema
    JSON". (IK-6, IK-3)
11. Status bar: the issues chip "4 issue types (27)" becomes "4 data issues"
    with `title="4 issue types, 27 issues"`; the rail Data badge "4" becomes an
    unnumbered warning dot; delete the "3D" mode chip; replace "Layout:
    Force-directed" plus "Settled" with one chip "Force directed - settled"
    plus a 12px chevron caret; delete "AI: not configured". The Viewing slot
    keeps "Viewing: 2026-01-05 to 2026-02-04" -- it is one of the window's two
    owners. (MIN-8, MIN-1, NAV-12 item 1)
12. Explore panel, tier 3: the "More" row's value reads "Opens a dialog".
    Delete that value and put a trailing ellipsis on the label instead, so the
    row reads "More...". (MIN-2, VOCAB retired list)
13. Legend: delete the "Minimap" caption; delete the footer "Okabe-Ito, 4 of 4
    values colored"; render both channel headers on one line, "Color: node type
    (type)" and "Arrow: payment direction (edge direction)". KEEP the four
    "N of M" type counts: no panel on this screen lists every type, so the
    legend is their only home. Keep the "Outside window" state row (it carries
    no count). (MIN-7, MIN-14)
14. Inspector: add a 20px header row above the reading with one icon-only copy
    control right-aligned, `title="Copy reading"`. (NAV-5)
15. Top bar: Undo becomes a split button -- add a 12px chevron caret at its
    right, `title="History"`, no binding. (NAV-7)
16. Explore panel: "Bookmarks | 3 views" becomes "Bookmarks"; "Saved filters |
    2 saved" becomes "Saved filters"; "Filter builder | Nodes, Edges" keeps its
    value (it names the scope, not a catalogue count). Catalogue counts go
    entirely. (MIN-3)

## IpadPanel

State: iPad 1180 by 820, Analyze panel overlay open, Cards view, nothing run.

1. Question group headers: delete the card count and the cost class from every
   open header -- "Find groups / 4 cards / heavy" becomes "Find groups"; "Find
   important nodes / 4 cards / iterative" becomes "Find important nodes"; "Find
   weak points / 4 cards / heavy" becomes "Find weak points"; "Find paths / 3
   cards / instant" becomes "Find paths"; "Find unusual things / 1 card /
   iterative" becomes "Find unusual things"; "Predict / 1 card / heavy" becomes
   "Predict". The collapsed "Advanced / 3 cards / cubic" becomes "Advanced"
   with a dimmed trailing "3" and `title="3 questions in this group"`. No cost
   word appears anywhere. (DEF-2, C4)
2. Every card: no card on this 20-node graph exceeds 2 s, so no card carries an
   estimate. Every action row is the VOCAB "Per-card cost estimate beside Run"
   under-2-s snippet: "Parameters" on the left, the filled "Run" button on the
   right. Card descriptions stay inline: this is Cards view. (DEF-2, G1)
3. Add a sticky scope line directly under the Run | Results tabs reading "Scope:
   all 20 visible nodes." with a "Change" link, then delete the line "On 20 of
   20 nodes" from all seventeen cards. On the Groups card, "Scope | Visible (20
   of 20)" becomes "Visible (20)" -- the N-of-N form returns only when a filter,
   window or subset makes them differ. (MIN-5)
4. Delete the three standalone "Pick a node first" lines from Find a path,
   Distance from here and Every route. The disabled Run button carries the
   state, with the precondition in its `title` ("Run. Pick a node first: click
   two nodes or type names"). On the "What breaks if removed" card, the
   disabled "Simulate removal (0)" button drops its "(0)" and its "Select nodes
   first" line, keeping the reason in its `title`. (MIN-12, MIN-2, IC-4)
5. KEEP the graph statistics block at the top of this panel -- the reading, the
   Nodes and Edges rows, the mean degree, density and connected-parts rows.
   MIN-1 makes the status bar the owner of node and edge counts and MIN-12
   deletes this block on desktop, but 5.2 allows only one overlay at a time on
   iPad, so the inspector is not on screen and this is the block's only home
   here. Resolved toward keeping it; record the reason in a comment. (MIN-12
   iPad clause versus MIN-1)
6. Inside that kept block, still apply the zero rules: delete "Isolated nodes |
   0" and the clause "(largest holds 100%)" from "Connected parts (components)
   | 1", and merge "Direction | Undirected" and "Weighted | Yes (value)" into
   one row "Type | Undirected, weighted (value)". (MIN-2, MIN-9)
7. Sub-tabs: "Results (0)" becomes "Results". (MIN-2)
8. Status bar: delete the "3D" mode chip; replace "Layout: Force-directed" plus
   "Settled" with one chip "Force directed - settled" plus a 12px chevron
   caret; delete "AI: not configured". (MIN-8, NAV-12 item 1)
9. Legend: delete the "Legend" caption and the "Minimap" caption; delete the
   whole "Color: not encoded" block; render the remaining channel header on one
   line, "Size: most connected (degree)". (MIN-7, MIN-2, MIN-14)
10. Top bar: Undo becomes a split button -- add a 12px chevron caret at its
    right, `title="History"`, no binding. (NAV-7)
11. Panel: add a 20px header row above the reading with one icon-only copy
    control right-aligned, `title="Copy reading"`. (NAV-5)
12. Insights strip chips: render both names on each chip on one line -- "Find
    groups (Communities, Louvain)", "Who is most connected (Degree
    centrality)", "Search for something you know (Search)" -- with the technical
    half muted and truncating with a `title` at chip width. (MIN-14, C7)
13. Bottleneck capacity card: the "Method | Between two nodes" and "Capacity
    attribute | value" rows sit above the scope line here but below it on
    AnalyzePanel. Order them as AnalyzePanel does (Capacity attribute, then
    Method) so identical inputs render identically. (6.3 same-input-same-text)
14. Add a comment on the panel overlay: "NAV-10: below 1280 px, activating a
    row whose behaviour is 'selects and centers the target and shows it in the
    inspector' -- a search result, a result-table row, a path step, a note row,
    a Matches row -- closes this panel overlay and opens the inspector overlay
    on that target, with a back affordance that returns here with the list
    state and scroll position intact." (NAV-10)
15. All statistics, Metric histograms, History and More rows at the panel
    bottom: add a comment recording that the estimate for a row above the ask
    limit appears on the row's own Run control and never on a group header or a
    scope line. (DEF-2)

## IpadInspector

State: iPad 1180 by 820, inspector overlay open on hub node DC01, 41,200-node
dataset, Performance mode on.

1. Actions block: the four rows "Expand neighbors", "Select neighbors", "Ego
   network", "Radial layout around this node" are a contiguous run of four
   unshipped rows. Delete their four per-row Coming tags, dim all four to
   `#5f6873`, draw them disabled, and put one muted "Coming soon" note on the
   divider above the first. Add one info circle in the inspector title row,
   after "Node", whose popover reads "Dimmed rows are not built yet." Their
   sub-controls (the split button "Expand top 50 of 12,412 by weight", the
   warning line, "Max nodes 1,000", the ring caption) stay drawn -- they are
   reported text. (MIN-4)
2. Neighbors section: delete the prose line "12,412: 9,100 logon, 3,180
   process, 96 rdp, 24 smb, 8 dns, 2 more types". The per-type chips carry the
   same numbers; extend the chip row so every type is covered -- "logon 9,100",
   "process 3,180", "rdp 96", "smb 24", "dns 8", "2 more types". (MIN-10)
3. Neighbors section: fold the count onto the tabs. The In / Out / All tabs
   read "In 11,980", "Out 432", "All 12,412", and the "Incoming / Outgoing /
   Both" breakdown in Computed metrics ("Incoming 11,980 / Outgoing 432 / Both
   12,412") is deleted, because the tabs now carry it. The section header keeps
   "Neighbors 12,412" -- the list is truncated to two visible rows, which is
   exactly when a header count says something the reader cannot see. (MIN-10,
   MIN-3)
4. Attributes section: delete the "Key attributes" sub-header inside a section
   already titled Attributes and replace it with a 1px `#374047` hairline.
   Delete the id row: the displayed label "DC01" and the id "host-dc01" differ,
   so the id row STAYS -- but delete the type row, because the header badge
   already reads "host". Move the count out of the header: it reads
   "Attributes" with "Show all 52" beside it, not "Attributes 52". (MIN-10)
5. Computed metrics: the header reads "Metrics 1" above one visible row --
   delete the count. On the "Most connected" row, delete "Rank 1 of 41,200":
   the reading above already states it. Keep "12,412, top 0.03%" and put an
   info circle immediately after "top 0.03%" carrying "Percentile among all
   41,200 nodes: only 12 nodes score higher." (MIN-3, MIN-10, IC-8)
6. Attribute cell hover menu: the hovered id row currently shows a "Copy value
   / Copy path" menu trigger. Replace it with one icon-only copy control,
   `title="Copy"`, VOCAB section 10 "Icon-only button" markup, opening the same
   two-item menu ("Copy value", "Copy path"). The chain glyph is freed for
   CompareSplit's Link views toggle. The "Copy id" control on the label row
   stays as it is -- a single copy action already drawn as one icon. (IK-5)
7. Notes section: the header reads "Notes 1" -- delete the count (a header count
   of 0 or 1 is not drawn). Header reads "Notes". Add a comment: "XR-E: a note
   dictated in a headset carries a 'Dictated' chip beside its time in this
   list; 'Flag this' writes a note whose body reads 'Flagged in VR 14:32' in
   the placeholder colour. Edit, Delete and Done do not exist in a session."
   (MIN-2, XR-E)
8. Notes row: give the row the fixed hover triple, drawn on the one note row --
   pencil (`title="Edit"`), then trash (`title="Delete"`, `margin-left: 4px`),
   right-aligned, using the VOCAB section 10 "Icon group ... Row form" markup.
   The eye slot is skipped: a note row has no per-row visibility. The existing
   "Done" control stays as text. (IK-7)
9. Status bar: delete the "3D" mode chip; the Performance mode chip
   "Performance mode: labels off, hover off" becomes "Performance mode: labels
   20" with the full rule list in its `title`; the layout chip "Positions from
   file" gains a 12px chevron caret; delete "AI: not configured". The "9 notes"
   chip stays (no Explore panel is open). (MIN-8, NAV-12 item 1)
10. Status bar and canvas: the canvas note cluster pill reads "8 notes" while
    the status bar chip reads "9 notes". Make the status bar the single owner
    of the dataset-scoped count at 9, and change the canvas pill to carry no
    number: it reads "Notes" and its `title` reads "8 clustered note markers;
    the selected node's marker draws on its own". (MIN-1)
11. Legend: delete the "Legend" caption; delete the whole "Color: not encoded"
    block; render the remaining channel header on one line, "Size: most
    connected (degree)", keeping "1 to 12,412, sqrt scale" beneath it. There is
    no minimap on this artboard, so no minimap caption to remove. (MIN-7,
    MIN-2, MIN-14)
12. Inspector: add a 20px header row above the reading with one icon-only copy
    control right-aligned, `title="Copy reading"`. (NAV-5)
13. Top bar: Undo becomes a split button -- add a 12px chevron caret at its
    right, `title="History"`, no binding. (NAV-7)
14. Inspector title row: replace the pin glyph body `<path d="M9.5 2l4.5
    4.5-1.5 1.5-.75-.75L9 10v3l-1 1-2.5-2.5L2 15l3.5-3.5L3 9l1-1h3l2.75-2.75L9
    4.5z"></path>` with the canonical upright pushpin `<path d="M6 2.5h4l-.5
    3.5 2 2.5H4.5l2-2.5z"></path><line x1="8" y1="8.5" x2="8" y2="13.5"></line>`.
    Apply the same swap to the "Key attributes, pinned" marker, which draws the
    same drifted body. (IK-2)
15. Insights strip chips: render both names on each chip on one line -- "Find
    connected parts (Components)", "Who is most connected (Degree centrality)",
    "Search for something you know (Search)" -- technical half muted,
    truncating with a `title` at chip width. (MIN-14, C7)
16. Actions block: keep every remaining label as text, including "Show in
    table" and the More menu's "Copy as JSON" and "Copy neighbor ids". IK-5
    would collapse copies into an icon, but IK-4 and IK-8 exempt the pinned
    inspector action block from icon-only controls by construction; that
    exemption wins here. Record it as a comment. (IK-4/IK-8 versus IK-5)
17. Canvas: add a comment -- "NAV-10: this graph is above the large-graph
    threshold, so a single-node selection draws exactly what hover-highlight
    draws -- DC01's incident edges in the selection colour and its immediate
    neighbours outlined, capped by the 500-node hover-highlight cap. Nothing is
    dimmed by the selection itself." (NAV-10)
## ViewsMenu

File: `ViewsMenu.dc.html` (1440x900). Cat social network, 20 nodes, nothing
selected, no activity panel, Views menu open.

1. **Inspector, Counts section (comment "Counts, tier 1", the 9-row block under
   the reading) -- becomes a tier 2 collapsed section and loses three rows.**
   Current: an always-open block headed "Counts" with rows Nodes 20; Edges 29;
   Direction Undirected; Weighted Yes (value); How tightly linked (density)
   0.153; Average links per node (mean degree) 2.9; Connected parts
   (components) 1 (largest holds 100%); Isolated nodes 0. New: a collapsed
   section header reading "Counts" with the chevron in its collapsed
   (right-pointing) form and no rows drawn; put the surviving row list in an
   HTML comment directly under it so the content is documented: Nodes 20;
   Edges 29; Type Undirected, weighted (value); Average links per node (mean
   degree) 2.9; How tightly linked (density) 0.153; Connected parts
   (components) 1. Direction and Weighted merge into one "Type" row, "Isolated
   nodes 0" and the "(largest holds 100%)" clause are not drawn at all (the
   reading already says everyone is connected). Snippet: VOCAB section 4
   "Section header row with chevron (ControlSection)", collapsed form; VOCAB
   section 10 override "Section 8 Counts table". Decisions MIN-9, MIN-2.

2. **Inspector, "Node attributes 8" and "Edge attributes 3" (two collapsed
   tier 2 sections) -- merge into one.** Current: two collapsed section headers.
   New: one collapsed section header reading "Attributes" with the trailing
   dimmed count "8 node, 3 edge"; an HTML comment records that the expanded
   form carries Nodes and Edges tabs whose labels read "Nodes 8" and "Edges 3".
   Snippet: VOCAB section 4 "Section header row with chevron" plus the
   trailing 11px dimmed count span already used on the two headers. Decisions
   MIN-9, MIN-3.

3. **Views menu, "Enter VR" row -- gains one second line and a gate comment.**
   Current: a 24px row reading "Enter VR" with no chip and no second line. New:
   a 32px two-line row: line 1 "Enter VR" at 11px `#d5d7da`, line 2 "20 visible
   nodes, under the 10,000 limit" at 10px `#7a828e`. "Enter AR" stays a
   one-line 24px row with no second line. Add an HTML comment above the two
   rows recording the three gate states verbatim: under the ceiling "Enter VR";
   between the ceiling and 50,000 visible nodes "Enter VR (visible subset)"
   with the subset named in the entry sheet; above 50,000 visible nodes the row
   is disabled (`color: #5f6873`) with the reason on the row; choosing either
   row opens the flat entry sheet; the AI setImmersiveMode tool takes the same
   gate. Snippet: VOCAB section 9 "Dropdown menu" row, height raised to 32px
   with `flex-direction: column` on the label cell. Decision XR-B.

4. **Views menu, the six "Coming" tags -- three go, three stay.** Current: Top,
   Front, Side, Isometric, Follow selection and "Save view..." each carry a
   Coming tag; Top/Front/Side also carry the chips 7, 1 and 3. New: delete the
   Coming tag from Top, Front and Side and keep their key chips (the shortcuts
   table lists those three bindings as live, and that reading wins). Isometric,
   Follow selection and "Save view..." keep their per-row Coming tags: after
   the fix the longest unshipped run inside one menu group is two rows
   (Isometric, Follow selection), and "Save view..." sits alone in its own
   group below a divider, so the three-or-more consolidation does not fire.
   Do not add a "Coming soon" group note and do not add the "Dimmed rows are
   not built yet." info circle to this menu. Snippet: VOCAB section 9 "Coming
   tag" (unchanged for the three that stay). Decision MIN-4, including its
   "Also fixed here" clause.

5. **Status bar (comment "STATUS BAR, 24 tall") -- mode chip, layout slot and
   AI slot.** Current: a "3D" pill; then "Layout: Force-directed" plus a green
   dot plus "Settled"; then, at the right, a grey dot plus "AI: not
   configured". New: (a) delete the "3D" pill and the divider that follows it,
   leaving the slot for VR and AR; (b) replace the whole layout group with one
   16px pill reading "Force directed (ngraph) - settled" followed by an 8px
   chevron-down caret in `#7a828e`, with no "Layout:" label and no separate
   state dot; give it `title="Layout. Force directed (ngraph), settled"`;
   (c) delete the AI slot and its dot -- no provider is configured on this
   artboard, and "AI: not configured" is retired. Add an HTML comment on the
   layout chip recording the caret menu: the four Style quick picks with their
   size estimates and disabled reasons, the active engine checked, then Re-run,
   Stop and "Layout settings...". Snippet: VOCAB section 9 "Status bar chips"
   first (neutral) pill. Decisions MIN-8, NAV-12 item 1. Collision: VOCAB's
   standardized string is "Force directed - settled" while C7 refuses dropping
   "(ngraph)" from this slot; I keep the technical name inline, so the chip
   reads "Force directed (ngraph) - settled".

6. **Legend and minimap captions (comments "LEGEND" and "MINIMAP") -- three
   deletions.** Current: the legend opens with an 11px "Legend" caption and
   ends with "Color: not encoded"; the minimap opens with an 11px "Minimap"
   caption. New: delete the "Legend" caption, delete the "Color: not encoded"
   line entirely (an unencoded channel draws no block), and delete the
   "Minimap" caption (this minimap is the dot form below 10,000 nodes; only the
   heatmap form keeps a caption). Keep the Size block exactly as drawn,
   including "1 to 4, sqrt scale": no tick values are drawn beside the two
   swatches, so that caption is the only place the range appears. Decisions
   MIN-7, MIN-2.

7. **Inspector, "Most connected (Degree)" section -- unit word and header
   icons.** Current: five rows whose values read "4 links", "4 links", "4
   links", "3 links", "3 links"; the section header carries no actions.
   New: values read "4", "4", "4", "3", "3" and an 11px dimmed right-aligned
   "links" sits once on a column header line above the first row; the section
   header is drawn in its hover state carrying, right-aligned, a download icon
   (`title="Export"`) and the three-dot overflow icon. Record in an HTML
   comment that the download menu holds "Export top 20 (CSV)" and "Export
   ranked list (CSV)". Snippet: VOCAB section 10 "Icon group in a section
   header, revealed on hover". Decisions MIN-9, IK-6.

8. **Inspector, Case notes line -- two elements become one.** Current: "Case
   notes: none" then the link "Add a case note". New: the single affordance
   "Add a case note" (blue link, 11px), nothing else on the row. Decision
   MIN-9.

9. **Inspector, tier 3 pointer -- two elements become one link.** Current:
   "Full statistics are in Analyze" plus a "More" link. New: one link, "More in
   Analyze". Decision MIN-9.

10. **Inspector, reading row -- gains the copy affordance.** Current: the
    reading "17 cats, 1 dog and 2 humans, connected by 29 relationships.
    Everyone is connected to everyone else through at most 5 steps." is a bare
    span. New: wrap it in `display: flex; gap: 4px; align-items: flex-start`
    with the sentence at `flex: 1 1 0` and a 24x24 icon button after it at
    `flex: 0 0 auto; align-self: flex-start;` carrying the copy glyph and
    `title="Copy the graph summary"`. Snippet: VOCAB section 10 "Icon-only
    button, with its tooltip", default state. Decisions NAV-5, IK-5.

## ContextMenu

File: `ContextMenu.dc.html` (1440x900). Fraud ring, acct-4471 selected, node
context menu open, inspector showing the node.

1. **Context menu (comment "CONTEXT MENU") -- seven Coming tags become two
   tags plus one dimmed run.** Current: twelve rows; Expand 37 neighbors (tag +
   chip E), Select neighbors (tag + chip Shift+E), Ego network (tag + chip G),
   Radial layout around this node (tag), Pin (tag), Simulate removing (tag) and
   "Merge with..." (tag) are unshipped. New: the five rows from "Expand 37
   neighbors" to "Pin" are one contiguous unshipped run (a divider does not
   break a run; only a shipped row does): draw all five at `color: #5f6873`
   with `cursor: default`, delete their Coming tags and delete their key chips
   E, Shift+E and G (an unshipped row carries no binding). Replace the divider
   above "Expand 37 neighbors" with a 20px group-note row holding, at the left,
   a 10px `#7a828e` label "Coming soon" and, immediately after it, the info
   circle whose popover reads "Dimmed rows are not built yet." "Simulate
   removing" and "Merge with..." are isolated between shipped rows and keep
   their per-row Coming tags unchanged. Snippets: VOCAB section 9 "Context menu
   variant" for the rows, VOCAB section 10 "Info circle" resting form.
   Decisions MIN-4, and its "no key chip on an unshipped row" clause.

2. **Inspector, Neighbors section -- the directional line folds onto the
   tabs.** Current: a header "Neighbors 37", a prose line "37: 21 transfer, 9
   paid, 7 registered to", the tab row "In | Out | All", then a line "Incoming
   14 / Outgoing 23 / Both 37". New: delete the "Incoming 14 / Outgoing 23 /
   Both 37" line; the tabs read "In 14", "Out 23", "All 37"; the prose line
   loses its leading count and reads "21 transfer, 9 paid, 7 registered to"
   (the header already carries 37). Keep the header count 37: the list shows 2
   of 37 rows, so it is truncated. Snippet: VOCAB section 4 "Tab row
   (segmented)". Decisions MIN-10, MIN-1, MIN-3.

3. **Inspector, Computed metrics section -- one sub-row and the header count
   go.** Current: header "Computed metrics 2"; row "Most connected degree 37
   top 0.5%"; row "Bridges betweenness 0.41" with the sub-row "Rank 1 of 200,
   top 0.5%" and the link "See all ranked". New: header reads "Computed
   metrics" with no count (two rows are visible and nothing is truncated);
   delete the "Rank 1 of 200, top 0.5%" sub-row -- the reading above already
   says "Rank 1 of 200 by Bridges"; keep the "See all ranked" link. Decisions
   MIN-3, MIN-10.

4. **Inspector, Key attributes -- the type row goes.** Current: rows type |
   account, opened | 2026-03-18, country | RO, risk_score | 0.87 High. New:
   delete the "type | account" row; the header badge "Account" on the label row
   already states it. Decision MIN-10.

5. **Status bar and rail badge -- four edits.** Current: status bar has the
   "3D" pill; "Layout: Force directed (ngraph)" plus a state dot plus
   "Settled"; the chip "4 issue types (27)"; "AI: not configured"; "1
   selected". The rail Data item carries the numbered badge "4". New: (a)
   delete the "3D" pill and its trailing divider; (b) one 16px pill reading
   "Force directed (ngraph) - settled" plus an 8px chevron caret, no "Layout:"
   label, no state dot, `title="Layout. Force directed (ngraph), settled"`,
   with an HTML comment recording the caret menu (four Style quick picks with
   estimates and disabled reasons, active engine checked, then Re-run, Stop,
   "Layout settings..."); (c) the issues chip reads "4 data issues" with
   `title="4 issue types, 27 issues"`, keeping its warning dot; (d) delete the
   AI slot; keep "1 selected". On the rail, replace the numbered badge "4" with
   an unnumbered 8px warning dot in `#f7b731` at the same position. Snippets:
   VOCAB section 9 "Status bar chips" (neutral pill and issues chip), VOCAB
   section 9 "Rail badge count" geometry with the text removed. Decisions
   MIN-8, MIN-1, NAV-12 item 1.

6. **Legend and minimap -- caption and palette name.** Current: the legend
   opens with a "Legend" caption, lists four type rows with counts 96, 48, 34,
   22, then "Okabe-Ito", then the Size block and a "Selected" state row; the
   minimap opens with a "Minimap" caption. New: delete the "Legend" caption,
   delete the "Okabe-Ito" line (the palette name lives on Style's Palette
   select and in the legend's overflow menu -- record that in an HTML comment),
   and delete the "Minimap" caption (dot form, 200 nodes). Keep the four group
   counts: no activity panel is open on this artboard, so the legend is the
   only place those group sizes appear. Keep "1 to 37, sqrt scale" (no tick
   values are drawn) and the "Selected" state row, which carries no count.
   Decisions MIN-7, MIN-1.

7. **Inspector, reading row -- gains the copy affordance.** Current: the node
   reading "Linked to 37 others, more than 99% of nodes. Rank 1 of 200 by
   Bridges." is a bare span. New: wrap it in `display: flex; gap: 4px;
   align-items: flex-start` with the sentence at `flex: 1 1 0` and a 24x24
   icon button after it carrying the copy glyph and `title="Copy reading"`.
   Snippet: VOCAB section 10 "Icon-only button, with its tooltip", default
   state. Decisions NAV-5, IK-5.

8. **Inspector title row, the pin control -- glyph swap.** Current:
   `title="Pin as A"` draws the diagonal pushpin
   `<path d="M9.5 2.5l4 4-2 1-1.5 3.5L6 7 4.5 8.5l-2 -2L4 4l3-.5z">`. New:
   replace the whole svg body with the register's upright pushpin:
   `<path d="M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z"></path><line x1="8" y1="8.5"
   x2="8" y2="13.5"></line>`. Keep the 24x24 box, the colour and the title.
   Snippet: VOCAB section 10, "New glyphs this revision adds to section 5"
   paragraph (pushpin consolidation). Decision IK-2.

9. **Inspector, Notes section header -- the zero count goes.** Current: "Notes
   0" with the "Add a note..." input below. New: the header reads "Notes"; keep
   the input. Decision MIN-2.

10. **Inspector, Computed metrics "Most connected" row -- gains an info
    circle.** Current: "Most connected degree" then the values "37" and "top
    0.5%", with no explanation of the percentile. New: insert the resting info
    circle immediately after the technical name "degree" (after the complete
    pair, never between the two names) and record its popover text in an HTML
    comment: "Top 0.5% means 0.5% of nodes score at least this high. Ranks come
    from the run that produced this metric." Do not draw the popover open.
    Snippet: VOCAB section 10 "Info circle", resting form. Decision IC-8.

11. **Actions block (pinned, bottom of the inspector) -- leave the shapes
    alone, one guard.** Current: bordered 24px buttons "Expand 37 neighbors
    (Coming)", "Select neighbors (Coming)", "Frame this node", "Find path from
    here", "Simulate removing (Coming)", "More". New: unchanged. The pinned
    action block takes no icon-only controls and no subtle action rows, its
    buttons carry no key chips today so DEF-1 does not fire, and its unshipped
    rows form runs of two and one, so their per-row Coming tags stay. Do not
    dim them. Decisions IK-4, IK-8, MIN-4 (guard only).

## ShortcutsDialog

File: `ShortcutsDialog.dc.html` (1440x900). Cat social network under a scrim,
the ? dialog centred, Explore panel open behind it.

1. **Keyboard shortcuts dialog -- delete every unshipped row and one whole
   group.** Current: twelve rows carry a Coming tag. New: delete these rows
   entirely -- Selection: "Select all visible Cmd+A", "Invert selection I",
   "Expand neighbors of the selection E", "Select neighbors of the selection
   Shift+E", "Ego network of the selection G", "Find path between two selected
   nodes P", "Remove selected Delete Backspace"; Panels: "Toggle the time
   slider (timed data) T"; Time slider: "Step back, step forward , .", "Jump to
   start, to end Shift+, Shift+.", "Play, pause, step (focused) Space Arrows",
   together with the whole "Time slider" group heading, which is left empty.
   The Selection group keeps "Inspect the selection Enter" and "Cancel drag,
   close menu, clear selection Esc". Keep the "In a panel" and "Inspector
   notes" groups: they are not cut. The ? dialog renders only bindings whose
   action has shipped; the full table with its Coming tags lives in Settings >
   Keyboard shortcuts. Decisions MIN-4, C13.

2. **Keyboard shortcuts dialog, Panels group -- the Insights strip enters the
   keyboard table.** Current: "Cycle regions, reverse  F6  Shift+F6" and no
   strip rows. New: the Cycle regions row label reads "Cycle regions (rail,
   panel, canvas, suggestions, inspector, status bar), reverse" with its chips
   unchanged, and three rows are added directly under it, in this order: "Move
   between suggestion cards" with chips `Left` and `Right`; "Try the focused
   suggestion" with chip `Enter`; "Dismiss the focused suggestion" with chip
   `Delete`. Snippet: the dialog's existing two-column row markup with VOCAB
   section 9 "Key chip". Decision NAV-8.

3. **Keyboard shortcuts dialog, Panels group -- the backtick row.** Current:
   "Focus the console (AI panel)  Coming  `". New: one shipped row, "Focus the
   assistant (the console when no provider is set)" with chip `` ` `` and no
   Coming tag. The console's own binding, Shift+backtick, is unshipped and so
   does not appear in this dialog at all; record in an HTML comment that it is
   listed in Settings > Keyboard shortcuts with its Coming tag. Decisions
   NAV-9, MIN-4.

4. **Explore panel (behind the dialog), selection rows -- one row goes, one
   changes shape.** Current: a bordered 24px box "Zoom to selection" with a
   right-aligned mono chip "F", then a row "Select all visible  Coming" with a
   right-aligned chip "Cmd+A", then the Select split button with a Coming tag.
   New: (a) delete the "Zoom to selection" row completely -- the inspector is
   the home for selection-scoped actions and the duplicate goes; (b) redraw
   "Select all visible" as a subtle action row: transparent, 24px tall, full
   panel width, 4px radius, a 14px leading marquee-select icon in `#7a828e`, an
   11px weight-500 label, the Coming tag in the trailing slot, and no key chip
   at all (an unshipped row carries no binding); (c) the Select split button is
   unchanged. Snippet: VOCAB section 10 "Subtle action row" (the "trailing data
   slot" variant, with the Coming tag as the trailing element). Decisions
   DEF-1, C12, MIN-4.

5. **Explore panel, search field -- the syntax hint moves behind a circle.**
   Current: the field row, then the helper line "Type a name, or
   attribute:value like breed:tabby to narrow." New: delete the helper line and
   add the resting info circle inside the search row immediately after the "/"
   key hint, with 4px of clearance; record in an HTML comment that its popover
   carries the same sentence verbatim and that the sentence also appears on
   field focus. Snippet: VOCAB section 10 "Info circle", resting form.
   Decisions IC-8, C1.

6. **Inspector, Counts section -- tier 2, collapsed, three rows fewer.**
   Current: an open block headed "Counts" with Nodes 20; Edges 29; Direction
   Undirected; Weighted Yes (value); How tightly linked (density) 0.153;
   Average links per node (mean degree) 2.9; Connected parts (components) 1
   (largest holds 100%); Isolated nodes 0. New: a collapsed section header
   "Counts" with the collapsed chevron and no rows drawn, plus an HTML comment
   listing the surviving rows: Nodes 20; Edges 29; Type Undirected, weighted
   (value); Average links per node (mean degree) 2.9; How tightly linked
   (density) 0.153; Connected parts (components) 1. Direction and Weighted
   merge into "Type"; "Isolated nodes 0" and "(largest holds 100%)" are not
   drawn. Snippet: VOCAB section 4 "Section header row with chevron". Decisions
   MIN-9, MIN-2.

7. **Inspector, "Node attributes 8" and "Edge attributes 3" -- merge into
   one.** New: one collapsed section header "Attributes" with the trailing
   dimmed count "8 node, 3 edge", and an HTML comment recording that the
   expanded form carries Nodes and Edges tabs reading "Nodes 8" and "Edges 3".
   Decisions MIN-9, MIN-3.

8. **Inspector, "Most connected (Degree)" section -- unit word, export link and
   header icons.** Current: five rows reading "4 links", "4 links", "4 links",
   "3 links", "3 links", then the links "See all 20 ranked" and "Export top 20
   (CSV)". New: values read "4", "4", "4", "3", "3" with one 11px dimmed
   right-aligned "links" on a column header line above the first row; delete
   the "Export top 20 (CSV)" link from the body; keep "See all 20 ranked"; draw
   the section header in its hover state with a right-aligned download icon
   (`title="Export"`) and the three-dot overflow icon, and record in an HTML
   comment that the download menu holds "Export top 20 (CSV)" and "Export
   ranked list (CSV)". Snippet: VOCAB section 10 "Icon group in a section
   header, revealed on hover". Decisions MIN-9, IK-6.

9. **Status bar -- mode chip, layout slot, AI slot.** Current: "3D" pill;
   "Layout: Force-directed" plus a state dot plus "Settled"; "AI: not
   configured". New: delete the "3D" pill and its divider; one 16px pill
   reading "Force directed (ngraph) - settled" plus an 8px chevron caret, no
   "Layout:" label, no state dot, `title="Layout. Force directed (ngraph),
   settled"`, with the caret menu recorded in an HTML comment (four Style quick
   picks with estimates and disabled reasons, active engine checked, Re-run,
   Stop, "Layout settings..."); delete the AI slot. Snippet: VOCAB section 9
   "Status bar chips". Decisions MIN-8, NAV-12 item 1.

10. **Legend and minimap -- two captions and the unencoded block.** Current:
    the "Legend" caption, the Size block with "1 to 4, sqrt scale", the line
    "Color: not encoded"; the minimap's "Minimap" caption. New: delete the
    "Legend" caption, delete the "Color: not encoded" line, delete the
    "Minimap" caption (dot form, 20 nodes). Keep "1 to 4, sqrt scale". Decisions
    MIN-7, MIN-2.

11. **Small label edits in the panel and inspector.** (a) Explore panel Notes
    header: "Notes 0" becomes "Notes"; keep the empty state "No notes yet.
    Select a node or edge and press N." exactly as drawn -- an empty state is
    reported text and never moves. (b) Inspector Case notes: "Case notes: none"
    plus "Add a case note" becomes the single affordance "Add a case note".
    (c) Inspector reading row: wrap the reading in a flex row and add a 24x24
    copy icon button with `title="Copy the graph summary"` at its right.
    Snippet for (c): VOCAB section 10 "Icon-only button". Decisions MIN-2,
    MIN-9, NAV-5, IK-5.

## SettingsShortcuts

File: `SettingsShortcuts.dc.html` (1440x900). Settings overlay with Keyboard
shortcuts active over the cat dataset.

1. **The shortcuts table -- all 37 Rebind buttons go; the key chip becomes the
   control.** Current: every row is a grid `minmax(0, 1fr) 120px 72px` whose
   third cell is a bordered 24px "Rebind" button. New: the grid becomes
   `minmax(0, 1fr) 120px 24px`; the third cell is empty at rest and holds a
   24x24 pencil icon button (`title="Rebind"`) on row hover or focus; the key
   chip in the second cell is the click target (keep its exact geometry and
   add `cursor: pointer`). Draw exactly one row -- "Zoom to selection  F" -- in
   the hover state (`background: #374047` on the row, pencil visible) so the
   affordance exists on the artboard. Record in an HTML comment that a
   customised row also reveals a 24x24 refresh icon with `title="Reset to
   default"` before the pencil. The recording row ("Toggle inspector", "Press a
   key... Esc to cancel", "Cancel") keeps its text Cancel button: Cancel is on
   the never-iconify list. Snippets: VOCAB section 9 "Rebind row" for the grid,
   VOCAB section 10 "Icon-only button" for the pencil (pencil path
   `M11.2 2.3l2.5 2.5-8 8-3.2.7.7-3.2z` plus `<line x1="9.6" y1="3.9"
   x2="12.1" y2="6.4">`). Decisions IK-7, IK-8, C2.

2. **The "VR controllers" group -- becomes the twelve-row XR group with two
   binding columns.** Current: a four-row read-only group headed "VR
   controllers  Read-only; set by the headset" whose rows are "Turn and tilt
   the view | Left stick | Fixed", "Pan (left, right); zoom (up, down) | Right
   stick | Fixed", "Select the pointed node; hold to drag | Trigger | Fixed",
   "Zoom and rotate with both hands | Pinch, both hands | Fixed". New: a group
   headed "XR" whose sub-line reads "Read-only. Learn these before you put the
   headset on -- Settings is not reachable in a session.", a column header row
   reading "Controller" and "Hands" over the two binding columns, and twelve
   rows in a grid `minmax(0, 1fr) 120px 120px` with no third action cell:

   | Action | Controller | Hands |
   |---|---|---|
   | Grab and move the graph | Grip (hold) | Pinch and drag |
   | Scale the graph | Both grips, move apart | Both hands, move apart |
   | Snap turn 30 degrees | Right stick left, right | Turn your head |
   | Fit and recenter | A | Wrist panel: Fit |
   | Point and select | Trigger | Pinch |
   | Add to the selection | Hold Y, then trigger | Wrist panel: Add |
   | Clear the selection | B | Wrist panel: Clear |
   | Open the wrist panel | Look at your left forearm | Look at your left forearm |
   | Expand one hop | A on a selected node | Wrist panel: Expand |
   | Push to talk | Hold B or Y | Wrist panel: microphone (hold) |
   | Flag this | X | Wrist panel: Flag this |
   | Leave the session | Menu (hold) | Wrist panel: Exit |

   Use the key-chip markup for both binding cells. Snippets: VOCAB section 9
   "Rebind row" grid with the Rebind cell removed and a second chip column
   added; VOCAB section 9 "Key chip". Decision XR-C.

3. **The Selection group -- five contiguous unshipped rows are dimmed under one
   group note.** Current: "Select all visible", "Invert selection", "Expand
   neighbors; select neighbors", "Ego network of the selection", "Find path
   between two selected" each carry a Coming tag, then "Inspect the selection"
   (shipped), then "Remove selected (confirms)" (Coming), then "Cancel, close,
   then clear selection" (shipped). New: draw the five contiguous rows at
   `color: #5f6873`, delete their five per-row Coming tags, and put one Coming
   tag on the "Selection" group header followed by the info circle whose
   popover reads "Dimmed rows are not built yet." "Remove selected (confirms)"
   is isolated and keeps its per-row tag. The "Time slider" group header
   already carries the tag: dim its three rows the same way. Collision, and how
   it is resolved: MIN-4 says an unshipped row carries no key chip, but this
   screen is the surface where unshipped bindings are learned, so here the key
   chip is the row's data column and stays on every row, drawn dimmed
   (`#5f6873`) on an unshipped row; the no-chip rule applies where the chip is
   decoration beside a label (menus, action rows, the ? dialog). Snippets:
   VOCAB section 9 "Coming tag", VOCAB section 10 "Info circle". Decision
   MIN-4.

4. **Panels group -- the backtick row splits in two.** Current: one row "Focus
   the console (AI panel)  Coming  `  Rebind". New: two rows -- "Focus the
   assistant (the console when no provider is set)" with chip `` ` `` and no
   Coming tag, and "Focus the console" with chip `Shift+`` ` `` and the Coming
   tag. Both take the new hover-pencil treatment from item 1. Decision NAV-9.

5. **Panels group -- the Insights strip enters the table.** Current: "Cycle
   regions; reverse  F6  Shift+F6". New: that row's label reads "Cycle regions
   (rail, panel, canvas, suggestions, inspector, status bar); reverse" with its
   chips unchanged, and three rows follow it: "Move between suggestion cards"
   with chips `Left` and `Right`; "Try the focused suggestion" with chip
   `Enter`; "Dismiss the focused suggestion" with chip `Delete`. Decision
   NAV-8.

6. **Section intro and footer -- teaching sentences move behind one circle; the
   new instruction stays inline.** Current: the intro line reads "Cmd and Ctrl
   are interchangeable. Browser shortcuts are never overridden. Press ?
   anywhere for the read-only list."; the footer paragraph reads "Bindings fire
   only when focus is outside a text field and no dialog is open. Reserved by
   the browser and never bound: Cmd with T, W, N, Q, H, M, L, D, F, P, S, R, +,
   -, 0 to 9 and comma; Alt with digits, D, F and Home." New: the visible intro
   line reads "Click a key to rebind it." and nothing else; add the resting
   info circle immediately after the "Keyboard shortcuts" section title, and
   record in an HTML comment that its popover carries "Cmd and Ctrl are
   interchangeable. Press ? anywhere for the read-only list." Delete the
   reserved-key paragraph from the footer and record in the same comment that
   it is the second sentence behind that circle plus a precise in-capture
   message: while recording, a reserved combination shows "Cmd+T is reserved by
   the browser. Try another key." in `#f7b731` under the recording row, in the
   same place as the existing conflict note. Keep "Reset to defaults" in the
   footer. Snippet: VOCAB section 10 "Info circle". Decisions IC-6, MIN-11,
   IK-7.

7. **Status bar -- mode chip and layout slot; the AI slot stays.** Current:
   "3D" pill; "Layout: Force-directed" plus a state dot plus "Settled"; "AI:
   Anthropic ready". New: delete the "3D" pill and its divider; one 16px pill
   reading "Force directed (ngraph) - settled" plus an 8px chevron caret, no
   "Layout:" label, no state dot, `title="Layout. Force directed (ngraph),
   settled"`, with the caret menu recorded in an HTML comment. Keep the AI slot
   exactly as drawn: a provider is configured on this artboard, which is
   precisely when the slot renders. Decisions MIN-8, NAV-12 item 1.

8. **Inspector behind the scrim -- Counts, attributes, Most connected and Case
   notes.** Current (all inside the single minified INSPECTOR CONTENT line):
   an open "Counts" block with Nodes 20; Edges 29; Direction Undirected;
   Weighted Yes (value); Average links per node (mean degree) 2.9; How tightly
   linked (density) 0.153; Connected parts (components) 1 (largest holds 100%);
   Isolated nodes 0; a "Most connected Degree" list whose values read "4
   links"..."3 links", with "See all 20 ranked" and "Export top 20 (CSV)";
   "Attributes 8 node, 3 edge"; "Schema 1 node type, 1 edge type"; "Case notes:
   none  Add a case note". New: Counts becomes a collapsed section header with
   its row list in an HTML comment (Nodes 20; Edges 29; Type Undirected,
   weighted (value); Average links per node (mean degree) 2.9; How tightly
   linked (density) 0.153; Connected parts (components) 1 -- Direction and
   Weighted merged, "Isolated nodes 0" and "(largest holds 100%)" not drawn);
   Most connected values lose the repeated "links", which moves to one column
   header line, the "Export top 20 (CSV)" link is deleted from the body and the
   section header is drawn in its hover state with a download icon
   (`title="Export"`) and the overflow icon, its menu recorded in a comment as
   "Export top 20 (CSV)" and "Export ranked list (CSV)"; "Attributes 8 node, 3
   edge" stays exactly as it is (this is the merged form the other artboards
   are moving to); the Case notes pair becomes the single affordance "Add a
   case note"; the reading gains a 24x24 copy icon button with `title="Copy the
   graph summary"` at the right of its row. Snippets: VOCAB section 4 "Section
   header row with chevron", VOCAB section 10 "Icon group in a section header"
   and "Icon-only button". Decisions MIN-9, MIN-2, IK-6, NAV-5, IK-5.

9. **Explore panel behind the scrim -- one row goes, one changes shape.**
   Current: a bordered box "Zoom to selection" with the chip "F"; a row "Select
   all visible  Coming" with the chip "Cmd+A"; the Select split button with a
   Coming tag; "Notes 0" with the empty state. New: delete the "Zoom to
   selection" row; redraw "Select all visible" as a subtle action row
   (transparent, 24px, leading 14px icon in `#7a828e`, 11px weight-500 label,
   Coming tag in the trailing slot, no key chip); the Notes header reads
   "Notes"; keep the empty state sentence verbatim. Snippet: VOCAB section 10
   "Subtle action row". Decisions C12, DEF-1, MIN-4, MIN-2.

10. **Legend and minimap behind the scrim.** New: delete the "Legend" caption,
    delete the "Color: not encoded" line, delete the "Minimap" caption (dot
    form, 20 nodes); keep "1 to 4, sqrt scale". Decisions MIN-7, MIN-2.

11. **Navigation group label edit.** Current: the alternative arrow-binding row
    is drawn as "Arrow keys  alternative binding" with the choices "Pan and
    orbit; Shift+Arrows pan in 3D" and "Walk the selection to the nearest
    neighbor  Coming". New: unchanged apart from item 1's grid change -- this
    row is a radio pair, its Coming tag is isolated, and it keeps it. Guard
    only; do not dim it. Decision MIN-4.

## ExplorerNotes

File: `ExplorerNotes.dc.html` (1440x900). Fraud ring, acct-4471 selected, no
activity panel, inspector Notes section open with two notes.

1. **Inspector, Computed metrics section -- one row and one sub-row go, and the
   directional breakdown moves to the Neighbors tabs.** Current: header
   "Computed metrics 2"; row "Bridges betweenness" with value "0.41, top 0.5%",
   sub-row "Rank 1 of 200" and the link "See all 200 ranked"; row "Most
   connected degree" with value "37, top 1%"; then a row "Incoming 14 |
   Outgoing 23 | Both 37". New: the header reads "Computed metrics" with no
   count (both rows are visible); delete the "Rank 1 of 200" sub-row (the
   reading already says "the strongest bridge in the network"); delete the
   "Incoming 14 | Outgoing 23 | Both 37" row entirely and put those numbers on
   the Neighbors tabs instead, which read "In 14", "Out 23", "All 37". Keep
   "See all 200 ranked". Snippet: VOCAB section 4 "Tab row (segmented)".
   Decisions MIN-10, MIN-3, MIN-1.

2. **Inspector, Attributes section -- the inner sub-header and the type row
   go.** Current: section header "Attributes 6" with the link "Show all 6",
   then an inner sub-header "Key attributes", then rows type | account, opened
   | 2026-03-18, risk_score | 0.87 High. New: the section header reads
   "Attributes" with no count (the "Show all 6" link beside it carries the
   number); replace the "Key attributes" sub-header with a 1px `#374047`
   hairline rule; delete the "type | account" row (the label row's "Account"
   badge states it). Decision MIN-10.

3. **Inspector, note rows -- hover actions become the row icon pair.**
   Current: two note cards, each with the colour dot, author, relative time, a
   spacer and the "Done" checkbox on the first line. New: draw the newest card
   (Assistant, 10 min ago) in its hover state: after the spacer and before the
   Done checkbox, add a 24x24 pencil icon button (`title="Edit"`) and a 24x24
   trash icon button (`title="Delete"`) with `margin-left: 4px` on the trash;
   the second card stays at rest with no icons. Order is fixed application-wide
   as edit, visibility, delete; a note row has no per-row visibility, so the
   pair is pencil then trash. Record in an HTML comment that the row's context
   menu is the non-hover twin and carries "Edit", "Delete" and "Pin to report"
   as full-text items. Snippet: VOCAB section 10 "Icon group in a section
   header, revealed on hover", "Row form" block (pencil and trash paths).
   Decisions IK-7, IK-4, NAV-11 item 4.

4. **Inspector, the user note -- gains the Dictated mark.** Current: first line
   is colour dot, "You", "2 h ago", spacer, Done. New: insert a chip reading
   "Dictated" immediately after "2 h ago", using the Coming-tag pill geometry
   with its text changed: `<div style="display: inline-flex; align-items:
   center; height: 16px; padding: 0 6px; border-radius: 8px; background:
   #374047; color: #7a828e; font-size: 10px; font-weight: 500; line-height: 1;
   box-sizing: border-box;">Dictated</div>`. Add an HTML comment recording that
   the note was dictated in a VR session, that the mark also appears in the
   Explore notes list and the notes hover card and in the export, and that
   "Flag this" writes a note whose body reads "Flagged in VR 14:32" in the
   placeholder colour `#5f6873`. Decision XR-E.

5. **Inspector, Notes section header -- the key chip, the technical name and
   the count all go.** Current: "Notes" then the dimmed technical name
   "Annotations" then the blue count badge "2", with a bordered mono key chip
   "N" right-aligned in the header. New: the header reads "Notes" alone; delete
   the "Annotations" technical name (6.3 exempts section labels and the pair is
   a conformance error); delete the count badge (both notes are visible, so the
   count restates -- VOCAB's standardized "Notes 2" is the truncated or
   collapsed form, which this is not); delete the "N" key chip and put the
   binding in the header's tooltip instead: `title="Notes. Add a note to the
   selection (N)"`. Decisions DEF-1, MIN-10, MIN-3.

6. **Legend -- caption, palette footer, note row suffix and note count.**
   Current: the "Legend" caption; four type rows with counts; the line
   "Okabe-Ito, 4 of 4 values colored"; the Size block with "1 to 37, sqrt
   scale"; a "Selected" row; a note row reading badge "2" then "Open notes"
   then "(annotations)". Also the minimap's "Minimap" caption. New: delete the
   "Legend" caption; delete the whole "Okabe-Ito, 4 of 4 values colored" line
   (no categories were dropped, and the palette name lives on Style's Palette
   select and in the legend overflow menu -- record that in a comment); the
   note row reads "Open notes" only, with the marker glyph but no "2" badge and
   no "(annotations)" suffix; delete the "Minimap" caption (dot form, 200
   nodes). Keep the four type counts (no activity panel is open, so the legend
   is their only home) and "1 to 37, sqrt scale". Decisions MIN-7, MIN-1,
   MIN-10.

7. **Status bar and rail badge.** Current: "3D" pill; "Layout: Force-directed"
   plus a state dot plus "Settled"; the chip "3 issue types (7)"; the chip "5
   notes"; "AI: Anthropic ready"; "1 selected". The rail Data item carries the
   numbered badge "3". New: delete the "3D" pill and its divider; one 16px pill
   reading "Force directed (ngraph) - settled" plus an 8px chevron caret, no
   "Layout:" label, no state dot, `title="Layout. Force directed (ngraph),
   settled"`, caret menu recorded in a comment; the issues chip reads "3 data
   issues" with `title="3 issue types, 7 issues"`; keep the "5 notes" chip (the
   Explore panel is closed on this artboard, which is when the notes chip
   renders); keep the AI slot as drawn (a provider is configured); keep "1
   selected". On the rail, replace the numbered badge "3" with an unnumbered
   8px `#f7b731` dot at the same position. Snippet: VOCAB section 9 "Status bar
   chips". Decisions MIN-8, MIN-1, NAV-12 item 1.

8. **Inspector, reading row -- gains the copy affordance.** Current: the
   reading "Linked to 37 others; the strongest bridge in the network." is a
   bare span. New: wrap it in a flex row with the sentence at `flex: 1 1 0` and
   a 24x24 copy icon button after it with `title="Copy reading"`. Snippet:
   VOCAB section 10 "Icon-only button". Decisions NAV-5, IK-5.

9. **Inspector title row, the pin control -- glyph swap.** Current:
   `title="Pin as A"` draws `<path d="M9.5 2.5l4 4-2 1-1.5 4-2.5-2.5-4.5
   4.5 4.5-4.5-2.5-2.5 4-1.5z">`. New: replace the whole svg body with the
   register's upright pushpin: `<path d="M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z">
   </path><line x1="8" y1="8.5" x2="8" y2="13.5"></line>`; keep the box, colour
   and title. Decision IK-2.

10. **Inspector, Neighbors prose line -- drop its leading count.** Current:
    "37: 21 transfer, 9 paid, 7 registered to" under the header "Neighbors 37".
    New: "21 transfer, 9 paid, 7 registered to". Keep the header count: the
    list is truncated to two rows with "Show all in data table". Decisions
    MIN-1, MIN-3.

11. **Actions block -- guard, no change.** The five bordered buttons (Expand 37
    neighbors, Select neighbors, Find path from here, Ego network, More) carry
    no key chips, so DEF-1 does not fire; the pinned action block takes no
    icon-only controls; the unshipped rows form a run of two and a run of one,
    so their per-row Coming tags stay and the rows are not dimmed. Decisions
    DEF-1, IK-4, MIN-4 (guard only).

## ExploreNotesList

File: `ExploreNotesList.dc.html` (1440x900). Fraud ring, Explore panel open
with the Notes section expanded, nothing selected.

1. **Inspector, Counts section -- tier 2, collapsed, and four rows change.**
   Current: an open block headed "Counts" with Nodes 200; Edges 612; Direction
   Directed (from file); Weighted Yes (amount, as strength); Timed Yes
   (opened); Average links per node (mean degree) 6.1; How tightly linked
   (density) 0.031; Connected parts (components) 1; Largest part holds 100%;
   Isolated nodes 0; Self-loops 2; Parallel edges 5 (combined at import). New:
   a collapsed section header "Counts" with the collapsed chevron and no rows
   drawn, plus an HTML comment listing what it holds: Nodes 200; Edges 612;
   Type Directed (from file), weighted (amount), timed (opened); Average links
   per node (mean degree) 6.1; How tightly linked (density) 0.031; Connected
   parts (components) 1; Self-loops 2; Parallel edges 5 (combined at import).
   Direction, Weighted and Timed merge into the one "Type" row and lose their
   "Yes" prefixes; the "Largest part holds 100%" row and the "Isolated nodes 0"
   row are not drawn (the reading carries the largest-part fact). Snippet:
   VOCAB section 4 "Section header row with chevron". Decisions MIN-9, MIN-2.

2. **Explore panel, Notes list rows -- hover actions become the row icon pair,
   and one note is marked Dictated.** Current: four 28px rows, each with target
   label, author, relative time, first line of text, tag chips and a "Done"
   checkbox. New: draw the first row (acct-4471, You, 2 h ago) in its hover
   state with a 24x24 pencil icon button (`title="Edit"`) and a 24x24 trash
   icon button (`title="Delete"`, `margin-left: 4px`) at the right of its first
   line, before the Done checkbox; the other three rows stay at rest. On the
   merch-88 row (You, Yesterday) insert the chip "Dictated" immediately after
   "Yesterday", using the Coming-tag pill geometry with `color: #7a828e` and
   the text changed. Record in an HTML comment that the notes list is where a
   VR-dictated note is re-read, that a "Flag this" note renders its body as
   "Flagged in VR 14:32" in the placeholder colour `#5f6873`, and that the row
   context menu carries "Edit", "Delete" and "Pin to report" as full-text
   items. The list stays at four visible rows of six, so no row is added.
   Snippet: VOCAB section 10 "Icon group in a section header", "Row form".
   Decisions IK-7, XR-E, NAV-11 item 4.

3. **Explore panel, tier 1 -- one row goes and one changes shape.** Current:
   a bordered box "Zoom to selection" with the mono chip "F" (disabled), beside
   the Select split button; below it a row "Select all visible  Coming" with a
   right-aligned chip "Cmd+A". New: (a) delete the "Zoom to selection" box
   entirely and let the Select split button take the full row width -- the
   inspector is the home for selection-scoped actions; (b) redraw "Select all
   visible" as a subtle action row: transparent, 24px tall, full panel width,
   4px radius, a 14px leading marquee-select icon in `#7a828e`, an 11px
   weight-500 label, the Coming tag in the trailing slot, and no "Cmd+A" chip.
   Snippet: VOCAB section 10 "Subtle action row", trailing-slot variant.
   Decisions C12, DEF-1, MIN-4.

4. **Inspector, "Most connected (Degree)" section -- unit word, export link and
   header icons.** Current: five rows reading "44 links", "40 links", "37
   links", "31 links", "24 links", then "See all 200 ranked" and "Export top 5
   (CSV)". New: values read "44", "40", "37", "31", "24" with one 11px dimmed
   right-aligned "links" on a column header line above the first row; delete
   the "Export top 5 (CSV)" link from the body; draw the section header in its
   hover state with a right-aligned download icon (`title="Export"`) and the
   three-dot overflow icon, and record in an HTML comment that the download
   menu holds "Export top 5 (CSV)" and "Export ranked list (CSV)". Keep "See
   all 200 ranked". Snippet: VOCAB section 10 "Icon group in a section header,
   revealed on hover". Decisions MIN-9, IK-6.

5. **Inspector, "Node attributes 7" and "Edge attributes 4" -- merge into
   one.** New: one collapsed section header "Attributes" with the trailing
   dimmed count "7 node, 4 edge"; an HTML comment records that the expanded
   form carries Nodes and Edges tabs reading "Nodes 7" and "Edges 4". Decisions
   MIN-9, MIN-3.

6. **Explore panel, tier 2 headers -- three catalogue counts and one zero
   clause go.** Current: "Filter builder  Coming" with the trailing value "None
   active"; "Bookmarks" with the trailing value "2 views"; "Find a pattern
   Coming" with the trailing value "2 saved". New: delete "None active", delete
   "2 views" and delete "2 saved" -- absence is legible and catalogue counts go
   entirely. The headers keep their Coming tags. Decisions MIN-2, MIN-3.

7. **Explore panel, two stacked canonical pairs -- render on one line.**
   Current: the "Step through time" header stacks "Temporal navigation, by
   opened" on a second line; the "Find a pattern" header stacks "Subgraph
   search" on a second line, forcing that header row to 40px. New: each header
   is a single 16px line reading plain name, then the muted technical name at
   11px `#7a828e` with a 6px gap, then the Coming tag: "Step through time
   Temporal navigation  Coming" and "Find a pattern  Subgraph search  Coming".
   The invocation detail "by opened" is not part of the pair: keep it as the
   row's trailing dimmed value at the right of the "Step through time" row,
   reading "by opened". The "Find a pattern" row returns to 32px. Decisions
   MIN-14, MIN-2.

8. **Status bar -- mode chip, layout slot, notes chip and AI slot.** Current:
   "3D" pill; "Layout: Force-directed" plus a state dot plus "Settled"; the
   chip "14 notes"; "AI: not configured". New: delete the "3D" pill and its
   divider; one 16px pill reading "Force directed (ngraph) - settled" plus an
   8px chevron caret, no "Layout:" label, no state dot, `title="Layout. Force
   directed (ngraph), settled"`, caret menu recorded in a comment; delete the
   "14 notes" chip -- the notes chip is hidden while Explore is open with the
   Notes section expanded, which is exactly this artboard's state, and the
   panel's own "Notes 14" header owns the number; delete the AI slot. Snippet:
   VOCAB section 9 "Status bar chips". Decisions MIN-8, MIN-1, NAV-12 item 1.

9. **Legend and minimap.** Current: the "Legend" caption; four type rows with
   counts 96, 48, 22, 34; the line "Okabe-Ito"; the Size block with "1 to 44,
   sqrt scale"; the minimap's "Minimap" caption. New: delete the "Legend"
   caption, delete the "Okabe-Ito" line (palette name moves to the legend
   overflow menu -- record in a comment), delete the "Minimap" caption (dot
   form, 200 nodes). Keep the four group counts: the open panel is Explore,
   which does not list the type groups, so the legend is still their only home.
   Keep "1 to 44, sqrt scale". Decisions MIN-7, MIN-1.

10. **Explore panel, search field -- the syntax hint moves behind a circle.**
    Current: the field row carries the inline mini-hint "id: type: exact: ="
    before the "/" chip. New: delete the mini-hint and add the resting info
    circle in its place, immediately before the "/" chip with 4px clearance;
    record in an HTML comment that its popover reads "Prefix with id:, type:,
    exact: or regex:, or start with = for an expression." verbatim and that the
    same sentence appears on field focus. Snippet: VOCAB section 10 "Info
    circle", resting form. Decisions IC-8, C1.

11. **Inspector, Case notes and the reading row.** Current: "Case notes: 1"
    followed by the link "Add a case note"; the reading is a bare span. New:
    the case-notes affordance is one element reading "1 case note" (blue link,
    11px); the reading is wrapped in a flex row with a 24x24 copy icon button
    at its right carrying `title="Copy the graph summary"`. Snippet: VOCAB
    section 10 "Icon-only button". Decisions MIN-9, NAV-5, IK-5.

12. **Coming-tag guard for this panel.** After item 3 the unshipped controls
    are the Select split button, "Select all visible", "Step through time",
    "Filter builder", "Neighborhood expansion" and "Find a pattern". No three
    of them are contiguous rows of one list -- tier 1 is a stack of unlike
    controls, and the tier 2 section headers run only two deep before the
    shipped "Bookmarks" header -- so every one keeps its per-row Coming tag, no
    group note is added and the "Dimmed rows are not built yet." circle is not
    added to this panel. Decision MIN-4 (guard only).

## ExplorerLoading

File: `ExplorerLoading.dc.html` (1440x900). security-events-120k.csv mid-load,
48,000 of 120,000 nodes, Analyze panel open.

1. **Analyze panel, the graph statistics block (comment "Graph statistics
   summary") -- deleted, and the panel gains a sticky scope line.** Current: a
   block under the Run | Results tabs with rows Nodes 48,000 of 120k; Edges
   312k so far; Direction Directed; Weighted No; Average links per node (mean
   degree) Loading...; How tightly linked (density) Loading...; Connected parts
   (components) Loading...; then the amber line "Partial data (40% loaded)" and
   the link "More statistics". New: delete the whole block. In its place, under
   the Run | Results tabs, draw one sticky scope line, 11px, on the panel
   background: "Scope: 48,000 nodes loaded so far. <span style="color:
   #f7b731;">Partial data (40% loaded)</span>  Change", with "Change" as the
   blue link. It is a character-for-character copy of the inspector's Counts
   section 900px to the right, and the panel states scope once. Decisions
   MIN-12, MIN-5, MIN-1.

2. **Analyze panel, the four cards -- the per-card partial-data caveat goes.**
   Current: the Groups, Connected parts and Most connected cards each carry the
   line `<span style="color: #f7b731;">Partial data (40% loaded)</span>, 48,000
   nodes`. New: delete that line from all three cards; the sticky scope line
   from item 1 carries it once for the panel. Decisions MIN-5, MIN-1.

3. **Analyze panel, the three question-group headers -- counts and cost words
   go.** Current: "Find groups  4 cards  heavy"; "Find important nodes  4 cards
   iterative"; "Find weak points  4 cards  sampled". New: each open header
   shows the group name alone: "Find groups", "Find important nodes", "Find
   weak points". No cost-class word appears anywhere in the interface, and an
   open group's card count restates what the group already shows; a count
   returns only when a group is collapsed. Decisions DEF-2, MIN-3, C4.

4. **Analyze panel, the Bridges card -- the unavailable reason becomes a
   tooltip.** Current: the card body carries the line "Available when loading
   finishes" beside the "Run" button. New: delete that line; draw Run disabled
   (`background: transparent; border: 1px solid #48525c; color: #5f6873;
   cursor: default`) with `title="Run. Available when loading finishes"`. The
   reason a control is unavailable is its own tooltip and is never body text on
   a card. Decisions IC-4, MIN-12.

5. **Status bar, the loading slot -- Cancel loses its Coming tag.** Current:
   "Building graph: 48,000 of 120,000 nodes (40%), about 12 s left", then the
   blue "Cancel", then a Coming tag. New: delete the Coming tag; draw Cancel at
   `color: #5f6873; cursor: default;` with `title="Cannot cancel this load"`.
   A cancel is required in every loading phase, so it is drawn disabled with
   its reason rather than tagged. Keep the Building sentence verbatim. Snippet:
   VOCAB section 9 "Progress row", disabled-Cancel note. Decision MIN-4 ("Also
   fixed here").

6. **Inspector, the reading -- replaced with the canonical shortened string.**
   Current: "Loading: 48,000 of 120,000 nodes and 312,000 events so far (40%).
   Rankings and statistics fill in when loading finishes." New, verbatim:
   "Loading 48,000 of 120,000 nodes. Rankings and statistics fill in when
   loading finishes." Wrap it in a flex row and add a 24x24 copy icon button at
   its right with `title="Copy the graph summary"`. Snippet: VOCAB section 10
   "Icon-only button". Decisions G5, NAV-5, IK-5.

7. **Inspector, Counts section -- row merges only; the section stays open.**
   Current: Nodes 48,000 of 120,000; Edges 312k so far; Direction Directed
   (column); Weighted No; Average links per node (mean degree) Loading...; How
   tightly linked (density) Loading...; Connected parts (components)
   Loading...; Isolated nodes Loading... New: Direction and Weighted merge into
   one row, "Type | Directed (column)" -- the "No" half of an unweighted graph
   is not drawn; every other row stays, including the four "Loading..." rows.
   Collision, and how it is resolved: MIN-9 collapses Counts by default, but
   this is the one artboard whose subject is the partially filled Counts block
   and 6.5 remembers the section's open state per view kind, so this artboard
   draws the remembered-open state; add an HTML comment saying so. Decisions
   MIN-9, MIN-2.

8. **Inspector, Schema and attributes.** Current: "Schema  so far" with the row
   "Node types 4" above four type rows (process 27,900; host 9,400; user 6,200;
   ip 4,500); then "Node attributes 12" and "Edge attributes Loading..." as two
   collapsed sections. New: delete the "Node types 4" row -- all four types are
   listed directly under it, so the count restates; keep the "so far" caption,
   which reports the load state; merge the two attribute sections into one
   collapsed header reading "Attributes" with the trailing dimmed value "12
   node, edges loading", and record the Nodes and Edges tabs in an HTML
   comment. Decisions MIN-3, MIN-9.

9. **Analyze panel, the Groups card title row -- the Coming tag moves out from
   between the two names.** Current: the row is ordered plain name (order 0),
   Coming tag (order 1, `margin-left: auto`), technical name (order 2), so the
   tag renders between "Groups" and "Communities (Label propagation)". New:
   render plain name, then the muted technical name, then the Coming tag last
   with `margin-left: auto` on the tag; the canonical pair is never split.
   Decisions MIN-14, IC-2 (ordering rule).

10. **Status bar -- mode chip, Performance chip, AI slot; the layout slot keeps
    its loading string.** Current: "3D" pill; the Building-phase sentence in
    the layout slot; the chip "Performance mode: 20 labels, hover off"; "AI:
    not configured". New: delete the "3D" pill and its divider; the Performance
    chip reads "Performance mode: labels 20" with the full rule list in
    `title="Performance mode: 20 labels, uniform node size, 1 px edges, hover
    and tooltips off, quick grid layout. Settings > Performance"`; delete the
    AI slot. The layout slot keeps the Building sentence exactly and takes no
    caret: there is no layout engine to pick during a load; record that in an
    HTML comment. Snippet: VOCAB section 9 "Status bar chips" (Performance
    chip). Decisions MIN-8, NAV-12 item 1.

11. **Legend and minimap.** Current: the "Legend" caption; the block "Size:
    uniform (measuring)" with the caption "sized after load"; the line "Color:
    not encoded"; the minimap's "Minimap" caption. New: delete the "Legend"
    caption; delete the "Color: not encoded" line; keep the Size block and its
    "sized after load" caption, which report the load state; keep the "Minimap"
    caption -- this minimap is the density-heatmap form, which is not
    self-describing and is the one form that keeps its caption. Decisions
    MIN-7, MIN-2.

12. **Inspector, Case notes line.** Current: "Case notes: none" then the link
    "Add a case note". New: the single affordance "Add a case note". Decision
    MIN-9.

## ExplorerLargeGraph

File: `ExplorerLargeGraph.dc.html` (1440x900). security-events-120k.csv loaded,
Performance mode, Analyze panel open with a pinned Bridges result.

1. **Analyze panel -- a sticky scope line replaces three per-card scope
   lines.** Current: each card carries its own scope line: Bridges "On 120,418
   of 120,418 nodes. Approximate: 100 sample sources (about 40 s)"; Bridge
   edges "On 120,418 of 120,418 nodes, about 3 h"; What breaks if removed "On
   120,418 of 120,418 nodes". New: draw one sticky scope line under the Run |
   Results tabs, 11px: "Scope: all 120,418 nodes.  Change" with "Change" as the
   blue link. Delete the scope clause from all three cards; the Bridges card
   keeps only what differs from the panel scope, as its own 11px dimmed line
   reading "Approximate: 100 sample sources"; the other two cards lose the line
   entirely. Counts read "120,418", not "120,418 of 120,418", because shown,
   loaded and total are equal. Decisions MIN-5, MIN-12, MIN-1.

2. **Analyze panel -- cost words go and each estimate lands in one place.**
   Current: the group header reads "Find weak points  4 cards"; the card titles
   carry the pills "sampled", "heavy" and "instant"; the Bridges scope line
   carries "(about 40 s)" while its button reads "Run (about 40 s)"; the Bridge
   edges scope line carries "about 3 h" while its button reads "Run anyway".
   New: the open group header reads "Find weak points" alone; delete the
   "sampled", "heavy" and "instant" pills from the three card titles; the
   Bridges estimate exists only on its button, "Run (about 40 s)"; the Bridge
   edges button reads "Run anyway (about 3 h)" in the warning outline style,
   with the existing warning line above it kept verbatim ("About 3 h at this
   size. Filter to a part, or run the sampled version"). Snippet: VOCAB section
   10 "Per-card cost estimate beside Run", above-ask-limit and above-warn-limit
   forms. Decisions DEF-2, MIN-3, MIN-1.

3. **Pinned result card -- the run record collapses and the copy links become
   one icon.** Current: the card body carries the full run record on one long
   line ("Betweenness, 100 sample sources, seed 4171. Weight: count (strength).
   Direction: followed. Scope: visible, 120,418 of 120,418 nodes. 2026-09-04
   14:12, 41 s, algorithms 1.4.0") followed by three stacked blue links "Copy
   as JSON", "Copy as command", "Copy methods text". New: (a) the run record
   becomes one 11px dimmed line reading "Betweenness, 100 sample sources, seed
   4171. Scope: all nodes." with a 12px chevron before it acting as a Details
   disclosure; draw this card with Details expanded, so under that line a
   3-row block shows "Weight: count (strength)", "Direction: followed",
   "2026-09-04 14:12, 41 s, algorithms 1.4.0"; (b) delete the three copy links
   from the body and add one 24x24 copy icon button to the card header
   (`title="Copy"`), recording its menu in an HTML comment as "Copy reading",
   "Copy as TSV", "Copy as JSON", "Copy as command", "Copy methods text"; (c)
   delete the "Copy as TSV" row from the ranked-list actions below, which the
   header menu now carries. Snippets: VOCAB section 9 "Result card with the run
   record line", VOCAB section 10 "Icon-only button". Decisions IC-5, IK-5, C5.

4. **Pinned result card, ranked-list actions -- four contiguous unshipped rows
   are dimmed under one group note.** Current, in order: "Filter above
   threshold (Coming)", "Select top N (Coming)", "Copy as TSV", "Add top N to
   selection (Coming)", "Export ranked list (CSV) (Coming)", "Compare with...",
   "Pin to report", "Combine into a score". New: after item 3 removes "Copy as
   TSV", the first four form one contiguous unshipped run: draw all four at
   `color: #5f6873; cursor: default`, delete their four Coming tags, and put a
   20px group-note row above them holding a 10px `#7a828e` "Coming soon" label
   and, immediately after it, the info circle whose popover reads "Dimmed rows
   are not built yet." Snippets: VOCAB section 9 "Coming tag" (removed here),
   VOCAB section 10 "Info circle". Decision MIN-4.

5. **Pinned result card -- the two overlapping warnings merge into one caveats
   line.** Current: the caveats line reads "Approximate: 100 sample sources,
   seed 4171. Ranks near the top are reliable; small values are noise." and the
   histogram block below carries a separate line "Zero or near-zero: 97,538
   nodes (81%)". New: the caveats line reads, verbatim, "Approximate (100
   samples, seed 4171). 81% of nodes score zero or near zero, so only the top
   ranks are meaningful." and the histogram's "Zero or near-zero" line is
   deleted; keep the histogram's stats line "Log x and log y. min 0, median 0,
   mean 0.0012, max 0.38, p99 0.041". Decisions G5, MIN-1.

6. **Pinned result card -- the Done chip goes; the "Select nodes first" line
   becomes a tooltip.** Current: the result card header carries a "Done" state
   chip; the "What breaks if removed" card carries the body line "Select nodes
   first" above "Choose nodes..." and the button "Simulate removal (0)". New:
   delete the "Done" chip -- state chips are only for Running, Queued, Failed
   and Stale; delete the "Select nodes first" line and draw "Simulate removal
   (0)" disabled (`background: transparent; border: 1px solid #48525c; color:
   #5f6873; cursor: default`) with `title="Simulate removal. Select nodes
   first"`. Keep the "Choose nodes..." control. Decisions MIN-6, IC-4, MIN-12.

7. **Inspector, Counts section -- collapsed, N-of-N collapsed, three rows
   changed.** Current: an open block headed "Counts" with the trailing caption
   "visible of total" and rows Nodes 120,418 of 120,418; Edges 1,104,206 of
   1,104,206; Direction Directed (column); Weighted Yes (count, as strength);
   Average links per node (mean degree) 18.3; How tightly linked (density) 1 in
   13,000 possible links exist (7.6e-5); Connected parts (components) 3,141
   (largest holds 93%); Isolated nodes 2,206. New: a collapsed section header
   "Counts" with no rows drawn and no "visible of total" caption, plus an HTML
   comment listing what it holds: Nodes 120,418; Edges 1,104,206; Type Directed
   (column), weighted (count, as strength); Average links per node (mean
   degree) 18.3; How tightly linked (density) 1 in 13,000 possible links exist,
   with `title="7.6e-5"`; Connected parts (components) 3,141; Isolated nodes
   2,206. The N-of-N form goes because shown, loaded and total are equal; the
   "(largest holds 93%)" clause goes because the reading carries it; the
   scientific notation moves into the hover title; "Isolated nodes 2,206" stays
   because it is not zero. Snippet: VOCAB section 4 "Section header row with
   chevron". Decisions MIN-9, MIN-5, MIN-2.

8. **Inspector, "Most connected (Degree)" and the attribute sections.**
   Current: five rows reading "14,206 links" ... "4,870 links", then "See all
   120,418 ranked" and "Export top 5 (CSV)"; "Schema  4 node types, 6 edge
   types"; "Node attributes  9, from a sample" and "Edge attributes  5, from a
   sample" as two collapsed sections. New: the five values read "14,206",
   "9,318", "7,904", "6,112", "4,870" with one 11px dimmed right-aligned
   "links" on a column header line; delete the "Export top 5 (CSV)" link from
   the body and draw the Most connected header in its hover state with a
   download icon (`title="Export"`) and the three-dot overflow icon, its menu
   recorded in a comment as "Export top 5 (CSV)" and "Export ranked list
   (CSV)"; merge the two attribute sections into one collapsed header
   "Attributes" with the trailing dimmed count "9 node, 5 edge", and record in
   an HTML comment that the sampling caveat "Distinct counts from a 50,000-row
   sample." is stated once inside the section rather than on both headers.
   Keep the Schema header as drawn. Snippet: VOCAB section 10 "Icon group in a
   section header, revealed on hover". Decisions MIN-9, IK-6.

9. **Status bar -- mode chip, layout chip, Performance chip, AI slot.**
   Current: "3D" pill; the layout slot's plain text "Positions from file"; the
   chip "Performance mode: labels 20, hover off, edges 500k"; "AI: not
   configured". New: delete the "3D" pill and its divider; render the layout
   slot as one 16px pill reading "Positions from file" plus an 8px chevron
   caret, with `title="Layout. Positions from file"` and the caret menu
   recorded in a comment (four Style quick picks with estimates and disabled
   reasons, active engine checked, Re-run, Stop, "Layout settings..."); the
   Performance chip reads "Performance mode: labels 20" with the rules and the
   measured provenance in `title="Performance mode: 20 labels, hover and
   tooltips off, edges capped at 500k, uniform node size. On above about 18,000
   nodes, measured on this machine. Settings > Performance"`; delete the AI
   slot. Snippet: VOCAB section 9 "Status bar chips". Decisions MIN-8, NAV-12
   item 1, DEF-6.

10. **Legend -- palette name, colour channel pair, caption; the minimap keeps
    its caption.** Current: the "Legend" caption; "Size: most connected
    (degree)" with "1 to 812, sqrt scale"; "Color: Groups" with "Communities
    (Label propagation)" stacked on a second line; eleven group rows with
    counts; "Other (3,388 groups, 43% of nodes)"; then the line "Category 12
    palette". New: delete the "Legend" caption; render the colour channel
    header on one line as "Color: Groups" followed by the muted technical name
    "Communities (Label propagation)" at 11px `#7a828e` with a 6px gap; delete
    the "Category 12 palette" line (the palette name lives on Style's Palette
    select and in the legend overflow menu -- record in a comment); keep the
    eleven group counts and the "Other" row (the panel does not list every
    group, so the legend is their only home) and keep "1 to 812, sqrt scale".
    Keep the "Minimap" caption: above 10,000 nodes the minimap is the
    density-heatmap form, which keeps its caption. Decisions MIN-7, MIN-14,
    C11.

11. **Insights strip -- one card description is restated.** Current: the
    "Narrow the view" card reads "Filter by type or attribute before running
    anything heavy." New, verbatim: "Filter by type, attribute, or a result you
    have already run." Record in an HTML comment that its Try it preselects the
    most recent completed result from the current data version -- here the
    Bridges run. Nothing else in the strip changes. Decision NAV-12 item 4.

12. **Inspector, reading row and Case notes.** Current: the reading is a bare
    span; "Case notes: none" is followed by the link "Add a case note". New:
    wrap the reading in a flex row with a 24x24 copy icon button at its right
    carrying `title="Copy the graph summary"`; the case-notes pair becomes the
    single affordance "Add a case note". Snippet: VOCAB section 10 "Icon-only
    button". Decisions NAV-5, IK-5, MIN-9.

13. **Pinned result card -- the selection-cap sentence moves behind a circle.**
    Current: the helper line "Select caps at 5,000 nodes; filter for more."
    sits under the ranked-list actions. New: delete the line and add the
    resting info circle immediately after the label of the "Select top N" row
    (dimmed by item 4, which does not stop it carrying a circle); record in an
    HTML comment that the popover reads "Select caps at 5,000 nodes; filter for
    more." verbatim. Snippet: VOCAB section 10 "Info circle". Decisions IC-1
    (teaching text is disclosed, not deleted), MIN-11.

14. **Pinned result card, "Encode as style" -- comment only.** Add an HTML
    comment beside the "Encode as style" action recording that it is the second
    of two routes to the same encoding: the Style panel's Size and Color
    attribute selects now end with a "not run" metric group whose play glyph
    runs the metric and applies the encoding as one undoable pair. Nothing is
    drawn. Decision DEF-7.

## SettingsPerformance

File: `SettingsPerformance.dc.html` (1440x900). Settings overlay with
Performance active over the 120,000-node security graph.

1. **Settings > Performance, "Thresholds and loading" -- three typed rows
   become one detected block.** Current: three rows -- "Large-graph threshold
   largeThreshold  Applies on next load  10,000 nodes / 50,000 edges" with the
   sentence "Whichever is crossed first. Above it: Performance mode, size-aware
   algorithm defaults, label cap, hover and tooltips off."; "Render ceiling,
   desktop  ceiling.desktop  Applies on next load  200,000 nodes / 1,000,000
   edges" with "Above it Import options defaults to a subset load and warns;
   Import everything anyway stays. Compare mode halves it."; "Render ceiling,
   iPad  ceiling.ipad  Applies on next load  50,000 nodes / 250,000 edges" with
   "Lower than desktop. Import everything anyway stays available." New: delete
   all three rows and draw, at the top of the group, the detected block copied
   verbatim from VOCAB section 10 "Detected threshold readout with
   Recalibrate": the label "How much this machine can draw", the headline
   "Detected: about 180,000 nodes on this machine.", the two subtle actions
   Recalibrate and Change, the provenance line "Measured 4 Sep 18:02 on Apple
   M2 Pro, 8 cores, 8 GB." and the consequence sentence "Above about 18,000
   nodes graphty switches to Performance mode. Above about 180,000 it loads a
   subset and warns; Import everything anyway always stays." The consequence
   sentence is never trimmed. Record in an HTML comment: Change discloses four
   numeric fields pre-filled with the detected values and stamps the block "Set
   by you.  Use detected values"; the iPad produces its own numbers from the
   same probe, so there is no separate iPad row; detection failure applies the
   built-in defaults silently with the headline "Could not measure this
   machine. Using safe defaults: about 200,000 nodes." and the actions "Try
   again" and "Change". Decision DEF-6.

2. **Settings > Performance -- the config keys go behind a header switch.**
   Current: every row draws its storage key in monospace beside the label:
   `largeThreshold`, `ceiling.desktop`, `ceiling.ipad`, `subsetLoad`, `loader`,
   `exactCap`, `effectsCap`, `performanceMode`, `labelCap`, `edgeCap`,
   `askAboveSeconds`, `hoverTooltips`, `forceLayoutAboveThreshold`,
   `selectionCap`, `expansionCap`, `layoutSizeRatings`, `warnAboveMinutes`,
   `preSteps, stepMultiplier, settleThreshold`. New: delete every one of those
   monospace keys from the rows and add, on the section header row beside
   "Reset to defaults", a compact toggle switch labelled "Show config keys",
   drawn off. The eight layout engine ids in the "Layout size ratings" row --
   ngraph, bfs, radial, sugiyama, circular, shell, multipartite, fixed -- are
   genuine canonical pairs and stay visible. Record in an HTML comment that
   switching it on returns every key in place, that the state is remembered per
   6.5, and that the exported configuration file always carries them. Snippet:
   VOCAB section 4 "Toggle switch (compact Switch, 28 by 16)". Decision MIN-13.

3. **Settings > Performance -- every row's helper sentence moves behind an info
   circle on its label.** Current: each row carries an 11px helper sentence
   under its control. New: after items 1 and 2, add the resting info circle
   immediately after the row label (after the complete label, before any
   status pill) on each of these rows and delete the sentence from the column,
   recording each popover text in an HTML comment beside its row:
   - Subset load default -- "Pre-selected Load control choice above the render ceiling."
   - Progressive loading -- "Streaming loader. Progress counts nodes; Cancel stops in 1 s."
   - Exact-computation cap -- "Above it cubic cards and layouts warn and confirm (Run anyway)."
   - Effects cap -- "Glow and Outline available below it."
   - Labels on canvas -- "Label cap: top nodes by degree, plus selected and search hits."
   - Edges drawn -- "Beyond it edges hide until the view narrows."
   - Ask before runs estimated over -- "Confirm prompt; the estimate comes from a short probe run."
   - Hover and tooltips -- "On below the threshold, off above."
   - Force layout above threshold -- "Layout start. Never started automatically above the threshold."
   - Sample sources for Bridges and Closest to everyone -- "Sampled centrality above the threshold; top ranks are reliable."
   - Warn on exact runs estimated over -- "Card warns; Run reads Run anyway and confirms once."
   - Selection cap -- "Inspector switches to summary form; Select actions confirm."
   - Expansion cap -- "Neighborhood expansion; Expand anyway stays available."
   - Layout size ratings -- "Drive the All layouts warnings; benchmarked before release."
   - Layout stepping -- "Live layouts: pre-steps, step multiplier, settle threshold."
   Two sentences split rather than move: on "Edges drawn" the clause "This
   graph: 1.1M." stays inline under the control, and on "Hover and tooltips"
   the clause "Off for this graph. Click selection always works." stays inline.
   What else stays inline, untouched: the readout "This graph: 120,000 nodes,
   1,100,000 edges. Performance mode is on because the graph is above the
   large-graph threshold.", the "Rules in force:" list, and the whole
   Turn-off-anyway warning with its memory and frame-rate estimate. Snippet:
   VOCAB section 10 "Info circle" plus its "Row with a label, its pair and the
   circle" form. Decisions IC-6, MIN-11, IC-1.

4. **Settings > Performance -- a new XR sub-header with four rows.** Current:
   the section has three sub-headers, "Thresholds and loading", "Performance
   mode", "Analysis, layouts and selection". New: add a fourth sub-header "XR"
   after "Analysis, layouts and selection", with four rows drawn in the same
   label-plus-control shape as its neighbours, each carrying an info circle on
   its label:
   - "XR entry ceiling" -- value "10,000" unit "visible nodes" and "50,000"
     unit "visible edges"; circle: "The most a headset draws smoothly. Above
     it graphty offers the visible subset instead."
   - "XR frame floor" -- value "72" unit "Hz"; circle: "Below this graphty
     reduces detail and says so on the wrist panel."
   - "XR run estimate cap" -- value "1" unit "s"; circle: "A run estimated
     above this is refused in a headset -- run it at the desk. Rises to 5 s
     when algorithms run off the main thread."
   - "XR comfort" -- a segmented control "Snap turn 30 degrees | Continuous
     with vignette", first segment active; circle: "Snap turn is the default
     because continuous turning in a headset causes motion sickness."
   Snippets: VOCAB section 4 "Number input" and "Tab row (segmented)", VOCAB
   section 10 "Info circle". Decision XR-C.

5. **Settings > Performance, the "Performance mode" row -- its effect list
   goes; the XR clause lands in its circle.** Current: the row carries the
   segmented control "Auto | Always on | Off" and, under it, "Auto turns it on
   above the large-graph threshold. It changes:" followed by eight bullets
   (Labels capped at 50; Uniform node size; Edges as 1 px lines; Edges hidden
   above the edge cap until zoomed; Hover and tooltips off; Animation off;
   Force layout not started; Note markers clustered). New: delete the sentence
   and all eight bullets, and add the info circle on the row label whose
   popover reads "Auto turns it on above the large-graph threshold, and it is
   always on in a headset regardless of this setting." Collision, and how it is
   resolved: XR-C adds a clause to this effect list while MIN-1 and MIN-11
   delete the list as a duplicate of the "Rules in force:" line at the top of
   the same screen; the readout owns the fact because it reports this graph, so
   the list goes and XR-C's clause is carried by the row's circle. Decisions
   MIN-1, MIN-11, IC-6, XR-C.

6. **Settings > Performance, the section intro -- moves behind the section
   title's circle.** Current: under the title "Performance" sits "Large-graph
   rendering settings. Both thresholds are evaluated on the counts after any
   subset load." New: delete the line and add the resting info circle
   immediately after the "Performance" section title; record in an HTML comment
   that its popover reads "Large-graph rendering settings. Both thresholds are
   measured on this machine and evaluated on the counts after any subset load."
   Keep "Changes save automatically" in the overlay header and "Reset to
   defaults" on the section header row. Snippet: VOCAB section 10 "Info
   circle". Decisions IC-6, DEF-6.

7. **Inspector behind the scrim -- Counts, Most connected, Case notes and the
   reading.** Current: the reading, then "Case notes: none  Add a case note",
   then an open "Counts" block with Nodes 120,000; Edges 1,100,000; Direction
   Directed (column); Weighted No; Average links per node (mean degree) 18.3;
   How tightly linked (density) 1 in 13,000 (7.6e-5); Connected parts
   (components) 4,120 (largest holds 94%); Isolated nodes 3,600; then "Most
   connected Degree" with values "12,412 links", "9,870 links", "7,204 links"
   and "See all 120,000 ranked". New: the reading is wrapped in a flex row with
   a 24x24 copy icon button at its right (`title="Copy the graph summary"`);
   the case-notes pair becomes the single affordance "Add a case note" and
   moves below the Counts header, after the reading block; Counts becomes a
   collapsed section header with its rows in an HTML comment (Nodes 120,000;
   Edges 1,100,000; Type Directed (column); Average links per node (mean
   degree) 18.3; How tightly linked (density) 1 in 13,000 with
   `title="7.6e-5"`; Connected parts (components) 4,120; Isolated nodes 3,600 --
   Direction and Weighted merged and the unweighted "No" not drawn, the
   "(largest holds 94%)" clause dropped because the reading carries it, the
   scientific notation moved to the hover title); Most connected values read
   "12,412", "9,870", "7,204" with one 11px dimmed right-aligned "links" on a
   column header line, and its section header is drawn in the hover state with
   a download icon (`title="Export"`) and the three-dot overflow icon, its menu
   recorded in a comment as "Export top 3 (CSV)" and "Export ranked list
   (CSV)". Snippets: VOCAB section 4 "Section header row with chevron", VOCAB
   section 10 "Icon group in a section header" and "Icon-only button".
   Decisions MIN-9, MIN-2, IK-6, NAV-5, IK-5.

8. **Status bar -- mode chip, layout chip, Performance chip; the AI slot
   stays.** Current: "3D" pill; the layout slot's plain text "Positions from
   file"; the chip "Performance mode: labels capped, hover off"; "AI: Anthropic
   ready". New: delete the "3D" pill and its divider; render the layout slot as
   one 16px pill reading "Positions from file" plus an 8px chevron caret, with
   `title="Layout. Positions from file"` and the caret menu recorded in a
   comment; the Performance chip reads "Performance mode: labels 50" (this
   screen's own label cap) with the rules in `title="Performance mode: 50
   labels, uniform node size, 1 px edges hidden until zoomed, hover and
   tooltips off, animation off, force layout not started, note markers
   clustered. Settings > Performance"`; keep the AI slot exactly as drawn, a
   provider is configured. Snippet: VOCAB section 9 "Status bar chips".
   Decisions MIN-8, NAV-12 item 1.

9. **Legend behind the scrim; the minimap keeps its caption.** Current: the
   "Legend" caption; the Size block with "1 to 4, sqrt scale"; the line "Color:
   not encoded"; the minimap's "Minimap" caption. New: delete the "Legend"
   caption and the "Color: not encoded" line; keep "1 to 4, sqrt scale"; keep
   the "Minimap" caption -- above 10,000 nodes the minimap is the
   density-heatmap form, which keeps its caption. Decisions MIN-7, MIN-2.

10. **Explore panel behind the scrim -- the search helper splits, one zero
    count goes.** Current: the search field, then the helper line "Type a name,
    an id or attribute:value. Hover and tooltips are off above the large-graph
    threshold; click a node to inspect it."; then "Filters  Coming"; then
    "Notes 0". New: split the helper line -- delete its first sentence from the
    column and put it behind a resting info circle placed in the search row
    after the field's trailing hint ("Prefix with id:, type:, exact: or regex:,
    or start with = for an expression." is the canonical wording; record it in
    a comment), and keep the second sentence inline, reading "Hover and
    tooltips are off above the large-graph threshold; click a node to inspect
    it.", because it reports this graph's state; the Notes header reads
    "Notes"; the "Filters  Coming" header is isolated and keeps its tag.
    Snippet: VOCAB section 10 "Info circle". Decisions IC-8, C1, MIN-2, MIN-4.

11. **Row-label ellipsis and pill order -- label pass.** On every row that
    opens a dialog use a trailing ellipsis on the label rather than any "opens
    a dialog" wording, and on every row that carries both a label and a Coming
    tag put the tag after the complete label and any info circle, never between
    a plain name and a technical name. Concretely, after item 2 the rows
    carrying a Coming tag are "Progressive loading", "Performance mode",
    "Labels on canvas", "Edges drawn", "Sample sources for Bridges and Closest
    to everyone", "Selection cap" and "Expansion cap": each renders as label,
    then info circle, then Coming tag. Decisions IC-2, MIN-14, VOCAB section 10
    "Strings this revision standardizes".

## CompareSplit

Spec 1.5 changes for `CompareSplit.dc.html` (Explorer, compare split; fraud-ring
dataset, A = Louvain r0.5, B = Louvain r1.5, acct-4471 selected). Ordered
largest structural change first.

1. **Run-family strip: the two result cards share one run record (IC-5, C5).**
   Region: ACTIVITY PANEL > PANEL CONTENT, above result card A. The two cards
   are one run family (the two halves of a Compare), so the shared fields
   render once. Insert a family header strip directly under the `Run |
   Results` sub-tabs: an 11px `#7a828e` line reading
   `Communities (Louvain). Weight: amount (strength). Direction: ignored. Seed 42. algorithms 1.4.0`.
   Then in card A replace the run record line
   `Louvain, resolution 0.5, seed 42. Weight: amount (strength). Direction: ignored. Scope: visible, 200 of 200 nodes. 2026-09-04 14:12, 14 ms, algorithms 1.4.0`
   with the collapsed one-line form `Resolution 0.5. 14:12, 14 ms` plus a
   Details chevron; in card B replace its run record with
   `Resolution 1.5. 14:15, 16 ms` plus a Details chevron. Draw card A's
   Details **expanded** (one card per canvas must show the full record) with
   the full original record string inside the expanded block; draw card B's
   Details collapsed. Chevron: the 12px `polyline points="6,4 10,8 6,12"`
   (closed) / `polyline points="4,6 8,10 12,6"` (open) already used for
   section headers, at `color: #7a828e`, with the label `Details` at 11px.

2. **Copy links collapse to one icon per card (IK-5 + IC-5).** Region: both
   result cards. Delete the three stacked links `Copy as JSON`,
   `Copy as command`, `Copy methods text` from each card body. In card A they
   move **inside** the expanded Details block (same three labels, same 11px
   `#5b8ff9`, one row); card B keeps none because its Details is collapsed.
   Add a copy icon to each card's title row, right-aligned, using the VOCAB
   "Icon-only button" snippet (24x24, `title="Copy"`), whose menu (record it
   in an HTML comment on the row) holds `Copy member ids`, `Copy as TSV`,
   `Copy reading`.

3. **Inspector Actions block: subtle action rows (DEF-1).** Region: INSPECTOR
   CONTENT > Actions. Today four bordered boxes
   (`border: 1px solid #48525c`, centered labels). Keep only
   `Expand 37 neighbors` as the section's primary (bordered box, its `Coming`
   tag stays in place). Convert `Select neighbors`, `Frame this node` and
   `More` to the VOCAB "Subtle action row" snippet: transparent, no border,
   24px, full panel width, 4px radius, 14px leading icon at `#7a828e`, 11px
   label at weight 500, left-aligned, trailing slot for data only. Leading
   glyphs, copied verbatim from the register: Select neighbors = the
   neighbors glyph already on `Expand 37 neighbors`; Frame this node = the
   zoom-to-selection corner brackets with a centre dot
   (`<path d="M2.5 6V2.5H6"></path><path d="M10 2.5h3.5V6"></path><path d="M13.5 10v3.5H10"></path><path d="M6 13.5H2.5V10"></path><circle cx="8" cy="8" r="2"></circle>`);
   More = the three-dot glyph
   (`<circle cx="8" cy="3.5" r="0.75"></circle><circle cx="8" cy="8" r="0.75"></circle><circle cx="8" cy="12.5" r="0.75"></circle>`).
   `Select neighbors` keeps its `Coming` tag in the trailing slot (the slot
   may carry a Coming tag, never a key). `More` keeps its existing long
   `title` list and its trailing chevron.

4. **Merge two neighbour rows in Computed metrics (MIN-10).** Region:
   INSPECTOR CONTENT > Computed metrics. Delete the two separate rows
   `Neighbors in group  24 | 18 | -6` and `Share of neighbors  65% | 49% |
   -16 pts` and draw one row: label `Neighbors in group`, A cell `24 (65%)`,
   B cell `18 (49%)`, Delta cell `-6`. Keep the existing grid
   (`minmax(0, 1fr) 32px 32px 40px`); widen the A and B columns to 40px each
   so the parenthesised share fits and drop the label column to what remains.

5. **Legend hygiene (MIN-7, MIN-2, C11).** Region: LEGEND A and LEGEND B.
   (a) Delete the footer line `Okabe-Ito, resolution 0.5, 4 groups` from
   legend A and `Okabe-Ito, resolution 1.5, 11 groups` from legend B (the
   palette name lives on Style's Palette select and in the legend's overflow
   menu; add an HTML comment saying so). (b) Legend group counts **stay** in
   both legends -- CompareSplit is the named exception in MIN-7/C11, because
   the eleven B-side group sizes appear nowhere else. (c) Delete the whole
   `Size: most connected (degree) / 1 to 37, sqrt scale` block from legend B
   (identical to A) and change legend B's header from `Legend, view B` to
   `Legend, view B (size as A)`. (d) Legend A's header stays `Legend, view A`
   -- MIN-7's "drop the Legend caption" does not apply here because
   "view A"/"view B" is what tells the reader which half the block belongs to.
   (e) Delete the `Minimap` caption above the minimap thumbnail (a thumbnail
   with a viewport rectangle names itself; the caption returns only in the
   heatmap form above 10,000 nodes).

6. **Zero rows in the diff legend are not drawn (MIN-2).** Region: canvas diff
   legend, top centre. Delete the `Only in A  0` and `Only in B  0` entries
   with their swatches. The strip keeps `Difference | Same group 178 | Moved
   22`. Reduce the strip width to fit; keep the 12px gaps.

7. **Status bar hygiene (MIN-8, MIN-1).** Region: STATUS BAR. (a) Delete the
   `3D` mode chip (the canvas 2D/3D control is always visible; the mode chip
   slot is reserved for VR and AR). (b) Delete the `AI: not configured` chip
   and its leading dot -- the AI slot renders only when a provider is
   configured or a call is in flight. (c) The issues chip
   `3 issue types (8)` becomes `3 data issues` with
   `title="3 issue types, 8 issues"`, keeping its amber dot. (d) The rail
   Data badge `3` becomes an unnumbered warning dot: same position, 6px
   circle, `background: #f7b731`, no text. (e) The layout slot keeps
   `Comparing: A | B` and takes **no** caret: NAV-12's quick-picks caret
   belongs to the layout chip, and in Compare mode this slot is not the
   layout chip. Record that in the slot's comment.

8. **Both cards show the applied encoding (NAV-2).** Region: both result
   cards, action row. Each half is already coloured by its own result (the
   legends prove it), so the un-applied `Encode as style` button is wrong.
   Replace the filled `Encode as style` button in card A and card B with the
   applied form: an 11px `#7a828e` label `Encoded as node color` and, beside
   it, an 11px `#5b8ff9` link `Change encoding`.

9. **Run again with changes becomes a split action (NAV-11).** Region: both
   cards' action rows. Keep the label `Run again with changes` (Run in every
   form keeps its text, IK-8) and add a caret half on its right: a 1px
   `#48525c` divider then a 12px chevron
   (`polyline points="4,6 8,10 12,6"`) inside the same 24px control, with an
   HTML comment recording the one-item menu `Run and compare`.

10. **Modularity gets its info circle (IC-4, IC-8).** Region: both cards'
    reading lines. After `(modularity 0.58)` in card A and `(modularity 0.55)`
    in card B insert the VOCAB "Info circle" resting snippet (12px circled i
    in a 14px box, `#a3a8b1`). Record the popover text in an HTML comment on
    each: `Modularity runs from 0 to about 1: below 0.3 the groups overlap
    heavily, 0.3 to 0.7 is a clear split, above 0.7 they are nearly
    disconnected.` The band word never returns to the sentence itself.

11. **Caveats lines lose the run parameters and the whole-graph scope
    (MIN-1, MIN-5).** Region: both cards. Replace
    `Exact. Weighted by amount as strength, direction ignored. Computed on all 200 nodes.`
    with `Exact.` in both cards. The weight and direction now live only in the
    family strip (item 1) and the scope is the whole graph, so it is not
    stated per card. Do not delete the line: a caveats line is reported text
    and stays inline in both reading states.

12. **Header counts that say nothing (MIN-3, MIN-2).** (a) Sub-tab
    `Results  2` becomes `Results` (a catalogue count over two visible cards).
    (b) Inspector section header `Computed metrics  6` becomes
    `Computed metrics` (five rows visible after item 4, none hidden).
    (c) `Attributes  4` becomes `Attributes` (three rows visible after item
    13). (d) `Notes  0` becomes `Notes`; the `Add a note...` input already
    reports the empty state.

13. **The node inspector states each fact once (MIN-10, MIN-1).** Region:
    INSPECTOR CONTENT. (a) Delete the `type | account` row from Attributes --
    the label row's `Account` badge already carries it. (b) In the collapsed
    Neighbors section, change `37: 21 transfer, 9 paid, 7 registered to` to
    `21 transfer, 9 paid, 7 registered to` (the header count owns the 37) and
    change `Incoming 14 / Outgoing 23 / Both 37` to
    `Incoming 14 / Outgoing 23` (Both equals the header count).

14. **Copy reading (NAV-5, IK-5).** Region: INSPECTOR CONTENT label row
    (`acct-4471`, Copy id, Locate, `Account`). The reading has no header row
    of its own, so its affordance joins the existing copy icon: change that
    icon's `title` from `Copy id` to `Copy` and record its two-item menu in an
    HTML comment -- `Copy id`, `Copy reading`. Do not add a second copy glyph
    to the row.

15. **The pushpin adopts the register form (IK-2).** Region: inspector title
    row, the `Pin as A` control. Replace the whole svg body
    (`<path d="M9.5 2.5l4 4-2 1-2.5 2.5v3l-2-2-3.5 3.5M5 9L3 7l2-1 2.5-2.5z">`)
    with the consolidated upright pushpin:
    `<path d="M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z"></path><line x1="8" y1="8.5" x2="8" y2="13.5"></line>`.

16. **State chips report state only (MIN-6, MIN-1).** Region: both result card
    title rows. Delete the `Comparing` chip from each card. The `A` and `B`
    badges already say which half a card drives, and a state chip is reserved
    for Running, Queued, Failed and Stale.

17. **No binding inside a button (DEF-1).** Region: canvas compare toolbar.
    Delete the mono `Esc` chip from the `Single view` control and put the
    binding in its tooltip: `title="Single view (Esc)"`. The toolbar keeps
    `Link views`, `Swap` and `Single view` unchanged otherwise.

## MultiSelection

Spec 1.5 changes for `MultiSelection.dc.html` (Explorer, marquee multi-selection;
fraud-ring dataset, 7 nodes and 4 edges selected, Explore panel open, pinned
card A in the inspector). Ordered largest structural change first.

1. **Panel action rows become subtle action rows (DEF-1).** Region: PANEL
   CONTENT, the tier 1 selection controls and the whole `Selection actions`
   list. Today they are 24px rows with no leading icon whose trailing column
   carries a key chip on some rows (`Cmd+A`, `I`, `T`, `1`) and data on others
   (`no filter yet`, `4`) -- one column meaning three things. Rebuild every
   one of them from the VOCAB "Subtle action row" snippet: transparent,
   no border, 24px, full panel width, 4px radius, `padding: 0 8px`, a 14px
   leading icon at `#7a828e`, an 11px label at weight 500, hover fill
   `#374047`. Move each binding into the row's `title` in parentheses at the
   end of the sentence: `Select all visible (Cmd+A)`,
   `Invert selection (I)`, `Step through time (T)`,
   `Select neighbors of selection`. Delete every mono key chip from these
   rows. The trailing slot keeps data only: `no filter yet` on
   `Select matching filter`, `4` on `Select edges between selected`, and the
   `Coming` tag where one exists.

2. **The Explore panel loses its Zoom to selection row (C12).** Region: tier 1
   selection controls. Delete the `Zoom to selection` row with its `F` chip
   outright. 5.4 makes the inspector the home for selection-scoped actions and
   the inspector Actions block already draws it; F, the navigation cluster,
   the context menu and the palette are unchanged. The row that follows moves
   up; do not leave a gap.

3. **Inspector Actions block: keys leave the rows (DEF-1).** Region: INSPECTOR
   CONTENT > Actions block (eight rows). The shape is already right (leading
   14px icon, 11px label, 24px row); delete the four mono key chips (`F`,
   `Delete`, `Shift+T`, `Esc`) and put each binding in the row's `title`:
   `Zoom to selection (F)`, `Remove selected (Delete)`,
   `Show in table (Shift+T)`, `Clear selection (Esc)`. Set the label weight to
   500 and the row padding to `0 8px` to match VOCAB. Trailing slots keep
   `7 nodes`, `new layer` and the two `Coming` tags. `Remove selected` keeps
   its text and its `Coming` tag (a destructive verb is never icon-only) and
   its `Delete` chip goes, because an unshipped row carries no key chip
   (MIN-4).

4. **Selection set rows gain Replace and the row-hover triple (NAV-11.3,
   IK-7, IK-4).** Region: PANEL CONTENT > Selection sets, the two set cards.
   (a) Line 2 of each card reads `Union  Intersect  Subtract` with
   `Filter to set` at the right; insert `Replace` as the first verb so it
   reads `Replace  Union  Intersect  Subtract` with `Filter to set` still at
   the right. All five keep their text (IK-8: every selection verb keeps its
   label). (b) On the first card, `Mule candidates`, draw the row-hover state:
   move `12 nodes` to sit dimmed immediately after the name and put the fixed
   triple at the right of line 1 in the order edit, visibility, delete --
   pencil `title="Rename"`, eye `title="Show on canvas"`, trash
   `title="Delete set"` with `margin-left: 4px` -- copied verbatim from the
   VOCAB "Icon group in a section header ... Row form" snippet. (c) Leave the
   second card, `Merchant cluster`, at rest (count at the right, no icons) so
   both states are documented; add an HTML comment saying the triple is
   revealed on row hover or focus and repeats as full text in the row's
   context menu.

5. **The selection size has one owner (MIN-1, MIN-2, G5).** (a) Region:
   inspector title row. It reads `Selection` + `Coming`; insert the size
   between them as dimmed 11px text so the row reads
   `Selection   7 nodes, 4 edges   [Coming]`. (b) Delete the standalone
   `7 nodes, 4 edges` line above the reading in INSPECTOR CONTENT. (c) Region:
   PANEL CONTENT > Selection section header: delete its `7 nodes, 4 edges`
   trailing text (the status bar and the inspector header own the count); the
   header keeps `Selection` and its `Coming` tag. (d) Region: canvas, the
   transient caption under the marquee corner: delete `7 nodes, 4 edges`;
   keep the `Shift+drag` hint, which is not usage-retired.

6. **The reading takes its 1.5 wording and its copy affordance (G5, NAV-5,
   IK-5).** Region: INSPECTOR CONTENT, the reading directly under item 5b.
   Replace
   `5 accounts, 1 device and 1 phone number selected. They average 9.4 links against 6.1 for the graph.`
   with, verbatim,
   `5 accounts, 1 device and 1 phone number selected, with 4 edges between them. They average 9.4 links against 6.1 for the graph.`
   Then add a 24px copy icon `title="Copy reading"` to the inspector title row,
   immediately left of the pin, using the VOCAB "Icon-only button" default
   snippet.

7. **Menu contents printed under their trigger (MIN-11, MIN-3).** (a) Region:
   tier 1, under the `Select` split button: delete the line
   `Invert, Neighbors of selection, Same group, From list, By expression`
   and move it into the button's `title` and an HTML comment. (b) Region:
   inspector Actions block, the More trigger: it reads
   `More (13): Select neighbors, Copy ids, Pin to report...`; change the
   visible label to `More`, drop the `(13)` catalogue count, and keep the full
   list in the trigger's `title` and the existing comment. (c) Add
   `Export selection...` to that list in both the `title` and the comment
   (NAV-12).

8. **Selection statistics: the header owns the export, the column owns the
   arrow key (IK-6, MIN-11).** Region: INSPECTOR CONTENT > Selection
   statistics. (a) Delete the `Export CSV` text link from the section header
   and draw the section in its hovered state with a right-aligned
   hover-revealed download icon `title="Export CSV"` (VOCAB "Icon group in a
   section header" snippet, 24x24, `#7a828e`), with an HTML comment recording
   that it repeats as a full-text item in the section's overflow menu.
   (b) Delete the sentence
   `Arrows: above or below the graph value. A is the pinned card.`
   (c) Rename the `A` column header to `A: acct-4471` and put the VOCAB info
   circle immediately after it, carrying (record in a comment)
   `Arrows show whether the selection is above or below the whole-graph value. A is the pinned card.`
   Widen the A column from 36px to 72px in the header row and in every data
   row; the label column is `flex: 1 1 0` and absorbs the change, and
   `Average links per node (mean degree)` truncates its technical half with a
   `title` rather than wrapping.

9. **Status bar hygiene (MIN-8, NAV-12).** Region: STATUS BAR. (a) Delete the
   `3D` mode chip. (b) Merge the layout slot into one chip: delete the
   `Layout: ` label and the separate `Settled` chip and draw
   `Force directed - settled` as one clickable chip with a 12px trailing
   caret (`polyline points="4,6 8,10 12,6"`, `#7a828e`); record in its comment
   that the caret opens the four layout quick picks with their size estimates
   and disabled reasons, the active engine checked, then Re-run, Stop and
   `Layout settings...`. (c) The issues chip `4 issue types (27)` becomes
   `4 data issues` with `title="4 issue types, 27 issues"`. (d) The rail Data
   badge `4` becomes an unnumbered 6px `#f7b731` warning dot. (e) Delete
   `AI: not configured` and its dot. (f) The selection slot keeps
   `7 nodes, 4 edges selected`.

10. **Legend hygiene (MIN-7).** Region: canvas LEGEND, bottom right.
    (a) Delete the `Legend` caption row. (b) Delete the
    `Okabe-Ito, 4 of 4 values colored` footer (nothing was dropped; the
    palette name lives on Style's Palette select and the legend overflow
    menu -- record that in a comment). (c) Delete the `Minimap` caption above
    the minimap. (d) The four type rows keep their counts (the panel does not
    list them) and the `Selected` state row keeps its swatch and its label
    with no count.

11. **Zero and default rows (MIN-2, MIN-3).** (a) Region: PANEL CONTENT >
    Filters collapsed header: delete the trailing `none active`; the header
    keeps `Filters` and its `Coming` tag. (b) Region: Selection sets header:
    delete the trailing `2` (a catalogue count over two visible rows).
    (c) Region: inspector Notes header: it reads `Notes  1 on members` --
    keep it; the note count is selection-scoped and the inspector is its
    owner.

12. **Selected edges read as selected on the canvas (NAV-10).** Region: CANVAS
    CONTENT svg. A multi-node selection highlights the edges between selected
    nodes only: stroke the four edges that join the seven selected nodes in
    `#4a7ee8` at full opacity and 1.5px, leaving every other edge and node
    exactly as drawn. Add an HTML comment recording the rule.

13. **The empty Viewing slot names its unit family (DEF-4).** Region: STATUS
    BAR, the `VIEWING SLOT` comment. It currently shows only the date form
    (`Viewing: 2026-01-05 to 2026-02-04`). Extend the comment: the string is
    derived from the Time role's unit family -- `Viewing: 2026-01-05 to
    2026-02-04` for Date and time, `Viewing: steps 1,200 to 1,250` for Number,
    `Viewing: v1.2 to v1.4` for Ordered category -- and the slider bar readout
    uses the same string.

## HistoryPopover

Spec 1.5 changes for `HistoryPopover.dc.html` (Explorer with the History
popover open over the top bar, Analyze panel on Results with the History
section expanded, Bridges result in the inspector, a hovered row previewing
14:12). Ordered largest structural change first.

1. **The VR session is one collapsible History group (XR-D).** Region: HISTORY
   POPOVER, at the top of the list, above entry 1. Insert one group header row
   and three child rows, all in the undone style the three rows below it
   already use (dimmed label `#7a828e`), because the current position is entry
   `Ran Bridges` further down. Group header: an open chevron
   (`polyline points="4,6 8,10 12,6"`, 12px, `#7a828e`), the title
   `VR session 14:21 - 14:39` (verbatim), a trailing `3 steps` at 11px
   `#7a828e` and the time `14:39`. Child rows, indented 16px, each with its
   owning panel `Explore` and its time, and a second line at 10px `#5f6873`:
   - `Expanded 12 nodes around acct-4471` / second line `by voice, in VR` / `14:26`
   - `Note on acct-4471` / second line `by voice, in VR` / `14:32`
   - `Flagged merch-88` / second line `in VR` / `14:34`
   The third child's second line omits "by voice" on purpose: Flag this is the
   speech-free fallback. Add an HTML comment recording that exiting XR is not
   itself a step and is not undoable.

2. **The clock and every entry count move with it (XR-D, MIN-1).** Region:
   popover list and the Analyze History section. (a) Change entry 1
   (`Bookmark "Ring core" saved`) from `14:21` to `14:20` and entry 2
   (`Filter: risk score above 0.6`) from `14:20` to `14:19` so nothing
   collides with the session's start; entry 3 stays at `14:18`. (b) Popover
   header legend `9 entries, 3 undone` becomes `12 entries, 6 undone`.
   (c) Panel History filter row `2 of 9` becomes `2 of 12`. (d) The
   filter-hides line becomes
   `10 entries hidden by this filter: 3 data changes (listed in Data as Cleaning steps), 2 style, 2 explore, 3 in the VR session 14:21 - 14:39.`
   keeping the `Show everything` link. (e) The section action row's trailing
   data `9 entries` on `Export history (JSON)` becomes `12 entries`. The three
   XR steps are notes and an expansion, not runs, so the `Runs only` filter
   still shows exactly the two run rows -- do not add a third.

3. **Undo is a split button and History rows are links (NAV-7).** (a) Region:
   TOP BAR centre. Draw Undo as a split control: the undo glyph in a 24px
   half, then a 1px `#48525c` divider, then a 12px caret
   (`polyline points="4,6 8,10 12,6"`) in a 16px half, the caret half drawn
   active (`background: #28364e; color: #4a7ee8`) because the popover is open.
   Caret `title="History"` with no binding; the undo half keeps
   `title="Undo (Cmd+Z)"`. Update the leading file comment: the popover is
   opened from the caret, not by right-clicking Undo (right-click and
   long-press still work). (b) Region: every popover row title and both run
   row titles in the panel History section: make the title visually distinct
   as a link -- `text-decoration: underline; text-decoration-color: #48525c;
   text-underline-offset: 2px;` -- and give each a `title` naming where it
   goes (`Open in Analyze`, `Open in Explore`, `Open in Style`,
   `Open in Data`). Row bodies keep click-to-preview and
   double-click-to-restore. (c) The popover footer becomes
   `Hover previews, click restores, click a title opens its panel, Esc closes`.

4. **The run record collapses; one card shows it open (IC-5, C5).** Region:
   INSPECTOR CONTENT, the Bridges result. Replace the single record line with
   a collapsed line plus a Details chevron, then draw Details **expanded**
   (this canvas's one open record). Collapsed line:
   `Betweenness, normalized, endpoints excluded. Weight: amount (strength). Direction: followed.`
   -- the scope clause goes, because the run covered the whole graph and the
   panel's scope line owns it (MIN-5). Inside the expanded Details block put
   the full original string
   `Betweenness, normalized, endpoints excluded. Weight: amount (strength). Direction: followed. Scope: all 200 nodes. 2026-09-04 14:15, 38 ms, algorithms 1.4.0`
   and, under it, the three copy links `Copy as JSON`, `Copy as command`,
   `Copy methods text` (moved here from the card body, IK-5). Note the scope
   string form: `all 200 nodes`, never `200 of 200`.

5. **Section action rows become subtle action rows (DEF-1).** Region: PANEL
   CONTENT > History section actions (seven rows). They are already
   borderless 24px rows, but they carry no leading icon and use a 12px label.
   Rebuild each from the VOCAB "Subtle action row" snippet: 11px label at
   weight 500, `padding: 0 8px`, a mandatory 14px leading icon at `#7a828e`.
   Glyphs, taken from the closed register (a row whose verb has no register
   glyph takes the nearest one; the label carries the identity because the row
   is not icon-only): `Replay all on current data` = recompute (circular
   arrow `<path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9"></path><polyline points="2.5,2.5 2.5,6 6,6"></polyline>`);
   `Export history (JSON)` and `Export as script` = download;
   `Copy as commands` and `Copy as methods text` = copy;
   `Import and replay...` = recompute; `Clear history...` = trash, last in the
   block with `margin-left` separation of 8px on the icon and its `#eb4949`
   label kept. Trailing slots keep `12 entries` and `asks first`; the three
   `Coming` tags stay on their rows (they are not three contiguous rows).

6. **Save as recipe joins the History actions (NAV-11.2).** Region: the same
   action list, directly under `Export as script`. Add one subtle action row
   `Save as recipe...` with the bookmark glyph
   (`<path d="M4 2.5h8a1 1 0 0 1 1 1v10l-5-3-5 3v-10a1 1 0 0 1 1-1z"></path>`)
   and an HTML comment: it names the ordered history and stores it under Saved
   items, the same artifact Present exports as JSON.

7. **Row copy links collapse to one icon (IK-5).** Region: PANEL CONTENT >
   History section, both run rows. Delete the `Copy as JSON` and
   `Copy as command` links from each row and put one 24px copy icon
   `title="Copy"` at the right of the row's first line (beside the time), with
   an HTML comment recording its two-item menu, `Copy as JSON` and
   `Copy as command`. `Re-run with changes` and `Re-run` keep their text and
   their position (Run in every form keeps its label, IK-8).

8. **Legend hygiene (MIN-7, MIN-2).** Region: canvas LEGEND. (a) Delete the
   `Legend` caption; the block's header becomes the existing state line
   `preview of 14:12`. (b) Delete the whole `Color: not encoded` row -- an
   unencoded channel draws no block, and that exact string is retired.
   (c) Keep `At the current point: Color: Groups (communities, Louvain), 7
   groups` but delete its trailing `, Okabe-Ito` (the palette name moves to
   the legend's overflow menu). (d) Delete the `Minimap` caption above the
   minimap.

9. **Status bar hygiene (MIN-8, NAV-12, C7).** Region: STATUS BAR. (a) Delete
   the `3D` mode chip. (b) Merge the layout slot into one chip reading
   `Force directed (ngraph) - settled` with a 12px trailing caret: the
   `Layout: ` label goes and the separate `Settled` chip goes, but `(ngraph)`
   stays rendered inline -- dropping the engine name was refused. Comment the
   caret as opening the layout quick picks, Re-run, Stop and
   `Layout settings...`. (c) `2 issue types (5)` becomes `2 data issues` with
   `title="2 issue types, 5 issues"`. (d) The rail Data badge `2` becomes an
   unnumbered 6px `#f7b731` dot. (e) Delete `AI: not configured`.

10. **Counts on headers and tabs (MIN-3, MIN-1).** (a) Sub-tab `Results (2)`
    becomes `Results`. (b) The History section header's trailing
    `9 entries, 50 max` goes entirely: the filter row's `2 of 12` is the
    owner of the count, and `50 max` becomes an info circle on the History
    header (VOCAB info-circle snippet, placed after the word `History` and
    before its `Coming` tag) carrying, in a comment,
    `History keeps the last 50 steps; older steps drop off the end.`

11. **Modularity gets its info circle (IC-4, IC-8).** Region: PANEL CONTENT >
    History, the Groups run row second line, after `Modularity 0.62.` Insert
    the VOCAB info circle with the popover text recorded in a comment:
    `Modularity runs from 0 to about 1: below 0.3 the groups overlap heavily,
    0.3 to 0.7 is a clear split, above 0.7 they are nearly disconnected.`

12. **Scope clauses that repeat the whole graph (MIN-5).** Region: both run
    rows in the History section. Change
    `Scope: visible, 200 of 200 nodes. 38 ms, exact. Top: acct-4471 at 0.41.`
    to `38 ms, exact. Top: acct-4471 at 0.41.` and
    `Scope: visible, 200 of 200 nodes. 31 ms. 7 groups, largest 41. Modularity 0.62.`
    to `31 ms. 7 groups, largest 41. Modularity 0.62.` -- shown, loaded and
    total are equal, so the N-of-N form does not appear.

13. **Copy reading, and no Done chip (NAV-5, MIN-6).** Region: INSPECTOR
    CONTENT title row (`Bridges  Betweenness centrality  Done`). Delete the
    `Done` state chip -- state chips are for Running, Queued, Failed and
    Stale -- and put a 24px copy icon `title="Copy"` in its place, with a
    comment recording its menu: `Copy reading`, `Copy as TSV`. Then delete the
    `Copy as TSV` text item from the shape actions row below (it now lives in
    that menu); `Select top N...`, `Filter above threshold...` and
    `Export ranked list (CSV)` keep their labels and their `Coming` tags.

14. **The default scale is not named (MIN-2).** Region: INSPECTOR CONTENT, the
    histogram caption. Change
    `Linear scale. min 0, median 0.04, mean 0.07, max 0.41, p99 0.36` to
    `min 0, median 0.04, mean 0.07, max 0.41, p99 0.36`. Only a non-default
    scale prints its name.

15. **The un-applied encoding form is correct here; leave it (NAV-2).** Region:
    INSPECTOR CONTENT, above the action row. Keep
    `Not encoded yet. Node color follows Groups; node size follows degree.`
    and keep the filled `Encode as style` button. A result applies its own
    primary encoding only when no user-authored layer already drives that
    channel, and the history entry `Encoded Groups as style` shows one does.
    Add a one-line HTML comment saying so, so a later pass does not "fix" it.

16. **Two chips that are not bindings in disguise stay (DEF-1 guard).** Region:
    popover header. Leave the `Undo Cmd+Z` and `Redo Shift+Cmd+Z` legend
    exactly as drawn -- the History header legend is named as unchanged -- and
    leave the top bar `Cmd+K` pill alone. Only the preview banner changes:
    delete the mono `Esc` chip beside `Restore` and put the binding in the
    banner's tooltip, `title="Restore this point (Esc)"`.

## AnalyzeSweep

Spec 1.5 changes for `AnalyzeSweep.dc.html` (Analyze panel on the Run tab with
the Groups card's Advanced block open on Run as sweep, three Groups result
cards plus a Sweep summary card, the Sweep summary open in the inspector).
Ordered largest structural change first.

1. **One result body on screen: the panel's Sweep summary card sheds the
   duplicate table and the NMI block (MIN-6).** Region: PANEL CONTENT >
   Results section, the `Sweep summary` card. The runs table (Value / Groups /
   Modularity / Time with three `Keep` links) and the
   `Agreement between runs (NMI)` trio are rendered again, in full, in the
   inspector at the same moment, and the two copies behave differently. Delete
   both blocks from the panel card. What the card keeps: its title row
   (`Sweep summary` + `Resolution, 3 runs`), one headline line at 12px
   `#a3a8b1` --
   `Three runs at resolution 0.5, 1.0 and 1.5 found 4, 7 and 11 groups.` --
   and one action row with exactly three controls: `Keep` (transparent 24px),
   `Compare` (transparent 24px) and `Export CSV` with its `Coming` tag.
   The run table, the sparkline and the pairwise agreement block live in the
   inspector only.

2. **Run-family run records (IC-5, C5).** Region: the three collapsed result
   cards `Groups (resolution 0.5 / 1.0 / 1.5)`. Each currently carries the
   full record. The three are one run family, so the shared fields render once
   on the family's summary card: add an 11px `#7a828e` line to the
   `Sweep summary` card, directly under its headline, reading
   `Louvain, seed 42, tolerance 1e-6, max passes 20. Weight: amount (strength). Direction: ignored. algorithms 1.4.0`.
   Then each member card's record line carries only what differs plus
   timestamp and duration: `Resolution 0.5. 14:20, 14 ms`,
   `Resolution 1.0. 14:20, 31 ms`, `Resolution 1.5. 14:20, 16 ms`. Update each
   card's `title` attribute to the same shortened text. Give the middle card
   (resolution 1.0) a `Details` chevron drawn **expanded**, holding its full
   original record string, so the complete record is visible once on this
   canvas.

3. **Copy links collapse into the card header (IK-5 + IC-5).** Region:
   INSPECTOR CONTENT, the Sweep summary result. Delete the three stacked links
   `Copy as JSON`, `Copy as command`, `Copy methods text` from under the run
   record and re-draw them inside a `Details` block on the collapsed record
   line (see item 4). Add a 24px copy icon `title="Copy reading"` (VOCAB
   "Icon-only button" snippet, single copy action, no menu) to the result's
   title row beside the name, per NAV-5.

4. **The inspector run record collapses (IC-5).** Region: INSPECTOR CONTENT,
   the record line under the caveats line. Replace
   `Sweep of Resolution over 0.5, 1.0, 1.5 (3 runs). Louvain, seed 42, tolerance 1e-6, max passes 20. Weight: amount (strength). Direction: ignored. Scope: visible, 200 of 200 nodes. 2026-09-04 14:20, 61 ms in total, algorithms 1.4.0`
   with the collapsed line
   `Sweep of Resolution over 0.5, 1.0, 1.5 (3 runs). Louvain, seed 42, tolerance 1e-6, max passes 20.`
   plus a `Details` chevron (closed) whose comment records the full string.
   The scope clause goes: the run covered the whole graph and the panel scope
   line (item 5) owns it.

5. **The panel states its scope once (MIN-5, MIN-12).** Region: PANEL CONTENT,
   directly under the `Run | Results` sub-tabs, above the scroll region. Add a
   sticky scope line: 11px `#7a828e` `Scope: all 200 nodes.` with a `Change`
   link at 11px `#5b8ff9`. Then delete the Groups card's per-card scope line
   `On 200 of 200 nodes`. The tier 2 `Scope | Visible (200)` select is a
   control and stays.

6. **The estimate obeys the three bands (DEF-2, MIN-1).** Region: the
   `Run as sweep` control's run row. It reads `3 runs, about 0.1 s` beside
   `Run sweep`. The estimate is under 2 s, so no estimate is drawn at all:
   the line becomes `3 runs` and `Run sweep` keeps its filled primary shape.
   No cost-class word appears anywhere on this artboard (there is none to
   delete); do not add one.

7. **Caveats line drops the run parameters (MIN-1, MIN-5).** Region: INSPECTOR
   CONTENT, the caveats line. Replace
   `Agreement is normalized mutual information over all 200 nodes. One seed (42) per run, so seed noise is not measured. Exact. Weighted by amount as strength, direction ignored.`
   with
   `Agreement is normalized mutual information over all 200 nodes. One seed per run, so seed noise is not measured. Exact.`
   The seed value, the weighting and the direction are run parameters and are
   owned by the run record.

8. **The sweep table's caption is a restatement (MIN-11).** Region: INSPECTOR
   CONTENT, under the sparkline. Delete both sentences of
   `Highlighted row colors the canvas. Click a row to color by that run.` The
   highlighted row and the canvas result chip
   (`Colors: Groups (resolution 1.0), 7 groups`) already say it.

9. **Done chips are not drawn (MIN-6).** Delete the `Done` chip from all three
   collapsed result cards and from the inspector title block. State chips are
   reserved for Running, Queued, Failed and Stale.

10. **Run again with changes becomes a split action (NAV-11).** Region:
    INSPECTOR CONTENT actions. Keep the label and add a caret half to the
    right of the bordered control (1px `#48525c` divider, 12px chevron
    `polyline points="4,6 8,10 12,6"`), with an HTML comment recording its one
    menu item, `Run and compare`, which enters Compare with A set to this card
    and B to the new run.

11. **Canonical pairs on one line (MIN-14).** Region: INSPECTOR CONTENT, the
    `Agreement between runs` section header, where `NMI` sits right-aligned on
    the same row as a separate cell. Render the pair as one left-aligned
    string, `Agreement between runs (NMI)`, with the technical half in
    `#7a828e`, and remove the right-hand cell. The panel card's copy of that
    header is deleted by item 1.

12. **The modularity column takes one info circle (IC-4, IC-8).** Region:
    INSPECTOR CONTENT > Runs table. Put a single VOCAB info circle immediately
    after the `Modularity` column header rather than one per value; record the
    popover in a comment: `Modularity runs from 0 to about 1: below 0.3 the
    groups overlap heavily, 0.3 to 0.7 is a clear split, above 0.7 they are
    nearly disconnected.` The three cells keep their bare numbers.

13. **Legend hygiene (MIN-7).** Region: canvas LEGEND. (a) Delete the `Legend`
    caption. (b) Delete the footer `Okabe-Ito, resolution 1.0, 7 groups` (the
    palette name moves to the legend overflow menu; record it in a comment).
    (c) Delete the `Minimap` caption. (d) The seven group rows keep their
    counts: the panel lists runs, not groups. (e) The
    `Size: most connected (degree) / 1 to 37, sqrt scale` block is unchanged.

14. **Catalogue counts (MIN-3).** (a) Sub-tab `Results (4)` becomes `Results`.
    (b) The pinned Results section header's trailing `4 cards, from 1 sweep`
    goes entirely -- all four cards are visible and nothing is truncated.

15. **Status bar hygiene (MIN-8, NAV-12).** Region: STATUS BAR. (a) Delete the
    `3D` chip. (b) Merge `Layout: Force-directed` and `Settled` into one chip
    `Force directed - settled` with a 12px trailing caret; comment the caret
    as opening the layout quick picks, Re-run, Stop and `Layout settings...`.
    (c) `4 issue types (27)` becomes `4 data issues` with
    `title="4 issue types, 27 issues"`; the rail Data badge `4` becomes an
    unnumbered 6px `#f7b731` dot. (d) Delete `AI: not configured`.

## FilterBuilderExpert

Spec 1.5 changes for `FilterBuilderExpert.dc.html` (Explore panel, Filter
builder on the Builder tab, three rules plus a Match any group, Result =
Select matches, 38 nodes selected, the Expression tab hovered with its preview
tooltip over the canvas; biology dataset ovarian_de_string.tsv). Ordered
largest structural change first.

1. **A metric that has not been run is still an attribute you can pick
   (DEF-7).** Region: PANEL CONTENT > RULE 2, its attribute select
   (`Adjusted p-value  padj`). Draw that select's popover **open**, anchored
   under the select, 200px wide, using the VOCAB snippet "Style By attribute
   row: a metric that has not been run" verbatim, adapted to this graph:
   a `Metrics` group label; the computed row
   `Most connected degree` with the trailing hint `1 to 41`; a 1px `#374047`
   divider; then the not-yet-run rows, each with the 12px play glyph
   (`<polygon points="5,3 13,8 5,13"></polygon>`), the plain name, the
   technical name in `#7a828e` and the trailing hint `not run`:
   `Bridges betweenness` (drawn hovered, `background: #374047`, with
   `title="Runs Betweenness centrality with its defaults, then filters by it"`)
   and `Influence PageRank`. Last, one disabled row at `#5f6873`,
   `Hubs and authorities HITS`, with
   `title="Hubs and authorities needs a directed graph"`. Above the groups put
   the popover's search input (required whenever the list exceeds eight rows).
   Not-run metrics sort last inside Metrics and never above a file attribute;
   cubic and unbounded metrics are not listed at all. Add an HTML comment
   recording that this artboard documents two pointer states at once -- the
   open select popover and the Expression tab's hover preview -- and that the
   Expression tooltip stays.

2. **Panel action rows lose their key chips and gain their icons (DEF-1,
   C12).** Region: PANEL CONTENT, the selection-scoped actions row under the
   chips. (a) Delete the whole filled `Zoom to selection` button with its `F`
   chip: 5.4 makes the inspector the home for selection-scoped actions and the
   inspector Actions block already draws the row (C12). The `Select` split
   button moves left into the freed width and keeps its caret, its `Coming`
   tag and its text. (b) Region: INSPECTOR CONTENT > Actions block (nine
   rows). Delete every mono key chip (`F`, `Shift+E`, `I`, `Delete`, `Esc`)
   and put each binding at the end of the row's `title` in parentheses:
   `Zoom to selection (F)`, `Select neighbors`, `Invert (I)`,
   `Remove selected`, `Clear selection (Esc)`. An unshipped row carries no key
   chip at all, so `Select neighbors` and `Remove selected` lose theirs
   without gaining a tooltip binding. Set the label weight to 500 and the row
   padding to `0 8px` to match the VOCAB subtle action row; trailing slots
   keep `new layer`, `38 ids` and the three `Coming` tags.

3. **Filter rules carry the row-hover triple (IK-7, IK-4, IK-2).** Region:
   the four rule rows (Rule 1, Rule 2, and the two members of the Match any
   group). Replace each row's always-visible `X` control with the fixed row
   order edit, visibility, delete, revealed on row hover or focus. A filter
   rule is edited in place, so it takes two of the three: an eye
   `title="Disable this rule"`
   (`<path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z"></path><circle cx="8" cy="8" r="2"></circle>`)
   then a trash `title="Delete this rule"`
   (`<path d="M3 4.5h10M6.5 4.5v-2h3v2M4 4.5l.8 9h6.4l.8-9"></path>`) with 8px
   of separation, both 24x24 at `#7a828e`. Draw them on **Rule 1 only** (the
   row drawn in its hover state); Rule 2 and the two group members show no
   icons. Add an HTML comment: the pair is revealed on row hover or focus and
   repeats as full-text items in the row's context menu.

4. **The search-syntax hint moves behind a circle, and is not deleted (IC-8,
   C1).** Region: PANEL CONTENT tier 1, the search input. Shorten the
   placeholder from `Search nodes (id:, type:, =)` to `Search nodes`, keep the
   `/` hint chip inside the input (a hint inside a real input stays), and add
   the VOCAB info circle as the last element of the search row, outside the
   input. Record its popover verbatim in a comment:
   `Prefix with id:, type:, exact: or regex:, or start with = for an
   expression.` plus a `Learn more` link. The same sentence also shows on
   field focus; it is never retired by usage.

5. **Selection statistics: the header owns the export, the column owns the
   arrow key (IK-6, MIN-11).** Region: INSPECTOR CONTENT > Selection
   statistics. (a) Delete the `Export CSV` text link from the section header
   and draw the header in its hovered state with a right-aligned
   hover-revealed 24px download icon `title="Export CSV"` (VOCAB "Icon group
   in a section header" snippet), with a comment recording that it repeats as
   a full-text item in the section's overflow menu. (b) Delete the sentence
   `Arrows: above or below the graph value.` and put the VOCAB info circle
   immediately after the `Graph` column header instead, carrying (in a
   comment) `Arrows show whether the selection is above or below the
   whole-graph value.`

6. **The selection size has one owner, and the reading takes its 1.5 wording
   (MIN-1, MIN-2, G5, NAV-5).** Region: INSPECTOR CONTENT, top. (a) Delete the
   standalone line `38 nodes, 0 edges  [Coming]  of 318` -- a zero half is not
   drawn and the size belongs to the header. (b) Move it into the inspector
   title row so the row reads `Selection   38 nodes of 318   [Coming]`, the
   size dimmed at 11px. (c) Replace the reading with the 1.5 string, verbatim:
   `22 proteins match; 16 more are their neighbors. They average 12.3 links against 6.9 for the graph.`
   (d) Add a 24px copy icon `title="Copy reading"` to the inspector title row,
   immediately left of the pin.

7. **One chip needs no Clear all (NAV-11).** Region: PANEL CONTENT tier 1, the
   active chips row. Keep the `Selected: 38` chip and its `X` (the chip's X is
   how a filter is removed) and delete the `Clear all` link: it appears only
   from two chips.

8. **Legend hygiene (MIN-7, MIN-2).** Region: canvas LEGEND. (a) Delete the
   `Legend` caption. (b) Delete the whole `Color: not encoded` row -- an
   unencoded channel draws no block and that string is retired. (c) The state
   row `Selected (38)` becomes `Selected` with its swatch: state rows carry no
   count. (d) Delete the `Minimap` caption. The block then holds the Size
   channel and the Selected key only.

9. **Header counts that say nothing (MIN-3).** Region: PANEL CONTENT tier 2,
   the `Filter builder` section header. Delete the trailing `3 rules`: the
   section is expanded and every rule is visible. The `Coming` tag stays.
   Keep every live match count (`597 of 1,104 edges`, `60 of 318 nodes`,
   `44 nodes`, `63 nodes`, `38 nodes match / 22 direct, 16 neighbors`): match
   counts are reported text and are pinned inline.

10. **The funnel adopts the register form (IK-2).** Region: INSPECTOR CONTENT
    Actions block, the `Filter to selection` row. Replace its svg body
    (`<path d="M2 3h12l-4.5 5.5v4l-3 1.5v-5.5z">`) with the consolidated
    funnel `<path d="M2.5 3.5h11l-4.25 5v4.25l-2.5 1.25V8.5z"></path>`.

11. **Notes header at zero (MIN-2, MIN-3).** Region: INSPECTOR CONTENT >
    Notes. The header reads `Notes  0 on members`; drop the trailing
    `0 on members` so it reads `Notes`. The `Add a note to these 38 nodes`
    input already reports the empty state.

12. **Status bar hygiene (MIN-8, NAV-12).** Region: STATUS BAR. (a) Delete the
    `3D` chip. (b) Merge `Layout: Force-directed` and `Settled` into one chip
    `Force directed - settled` with a 12px trailing caret, commented as
    opening the layout quick picks, Re-run, Stop and `Layout settings...`.
    (c) Delete `AI: not configured` and its dot. (d) The selection slot keeps
    `38 selected (+16)`.

13. **Do not add a circle to the Expression tab (IC-8 boundary).** Its preview
    tooltip shows the actual expression for this filter, which is reported
    content, not an explanation-only tooltip. Leave the tooltip, its
    `Learn more` link and its two sentences exactly as drawn; record the
    reason in a one-line comment so a later pass does not add a glyph.

## CategoryTable

Spec 1.5 changes for `CategoryTable.dc.html` (Analyze on Results with a Groups
(MCL) card and an imported Category table card selected, the same category
table open in the inspector; biology dataset ovarian_de_string.tsv with
go_terms.tsv joined). Ordered largest structural change first.

1. **One result body on screen at a time (MIN-6).** Region: PANEL CONTENT >
   RESULT CARD 2, `Categories for group 3`. That result is open in the
   inspector, so its list card collapses to title, state and headline plus the
   primary action. Delete from the card: the caveats line
   `Imported table; 212 categories, 41 after removing redundant`; the whole
   run record line `Joined go_terms.tsv onto Groups by group_id. ...`; the
   three copy links; the three-row body (`1. DNA damage response 2.1e-9`,
   `2. p53 signaling pathway 8.4e-8`, `3. Intrinsic apoptosis 3.0e-6`); the
   `See all 41 categories` link; and `Pin to report`. What the card keeps: its
   title row (`Categories for group 3` + the `Imported` state chip + the pair
   line, see item 8), one headline at 12px `#a3a8b1` --
   `3 categories stand out for group 3, led by DNA damage response.` -- and
   the primary action `Encode as style`. Add an HTML comment: expanding the
   card restores the full body, and the card returns to full when the
   inspector shows something else.

2. **The run record collapses and the copy links go with it (IC-5, IK-5,
   C5).** Region: INSPECTOR CONTENT and RESULT CARD 1. (a) In the inspector,
   replace the record line with the collapsed form
   `Table join from go_terms.tsv. Apply to: Groups, key group_id. Score: FDR. Members: genes.`
   plus a `Details` chevron drawn **expanded** (this canvas's one open
   record), holding the full original string
   `Table join from go_terms.tsv. Apply to: Groups, key group_id. Score: FDR, lower is better. Members: genes. 212 rows, 6 of 6 groups matched. Redundant categories removed: Jaccard overlap >= 0.5 on member sets (171 hidden). 2026-09-04 14:31`
   and, under it, the three links `Copy as JSON`, `Copy as command`,
   `Copy methods text` moved here from the card body. (b) In RESULT CARD 1
   (`Groups`), replace its record line with
   `MCL, granularity 2.5. Weight: combined_score (strength). Direction: ignored.`
   plus a closed `Details` chevron whose comment holds the full original
   string, and delete its three copy links. Chevron: 12px
   `polyline points="6,4 10,8 6,12"` closed, `polyline points="4,6 8,10 12,6"`
   open, label `Details` at 11px `#7a828e`.

3. **Card headers take the copy icon (IK-5, NAV-5).** Region: both result
   cards and the inspector result. Add a 24px copy icon (VOCAB "Icon-only
   button" snippet) to RESULT CARD 1's title row with a comment recording its
   menu -- `Copy member ids`, `Copy as TSV`, `Copy reading` -- and one to the
   inspector result's title row with the menu `Copy as TSV`, `Copy reading`.
   Then delete the `Copy as TSV` text item from the inspector's actions row,
   because it now lives in that menu.

4. **The three unshipped actions become one dimmed group (MIN-4).** Region:
   INSPECTOR CONTENT actions row. `Select members`, `Filter to members` and
   `Export CSV` are three contiguous unshipped items in one list. Delete their
   three per-row `Coming` tags, render the three rows dimmed
   (`color: #5f6873`) and disabled, and draw one group note above them: a 1px
   `#374047` divider with the muted label `Coming soon` at 10px `#7a828e`,
   followed by the VOCAB info circle carrying (record in a comment)
   `Dimmed rows are not built yet.` `Encode as style`, `Pin to report` and
   `Remove result` keep their normal treatment. Card 1's isolated `Coming` tag
   on `Markov clustering (MCL)` stays as a per-row tag.

5. **The panel states its scope once, and the caveats line stops repeating the
   run (MIN-5, MIN-12, MIN-1).** (a) Region: PANEL CONTENT, directly under the
   `Run | Results` sub-tabs: add a sticky scope line, 11px `#7a828e`
   `Scope: all 318 nodes.` with a `Change` link at `#5b8ff9`. (b) Region:
   RESULT CARD 1 caveats line: replace
   `Exact. Weighted by combined_score as strength, direction ignored. Computed on all 318 nodes.`
   with `Exact.` -- the weighting and direction are owned by the run record
   and the scope by the panel line. Do not delete the line; a caveats line is
   reported text.

6. **Legend group counts go, because the panel lists every group (MIN-7,
   C11).** Region: canvas LEGEND. (a) The six rows read `Group 1 (118)` to
   `Group 6 (15)`; drop the parenthesised counts so they read `Group 1` to
   `Group 6`. RESULT CARD 1's community body lists every group with its size,
   which is the owner. (b) Delete the footer `Okabe-Ito, 6 of 6 groups` (no
   categories were dropped; the palette name moves to the legend overflow
   menu -- note it in a comment). (c) Delete the `Legend` caption and the
   `Minimap` caption. (d) The `Size: most connected (degree) / 1 to 41, sqrt
   scale` block is unchanged.

7. **The Category table title takes its info circle (IC-8).** Region:
   INSPECTOR CONTENT, the pair line `Which categories stand out  Category
   table`. Insert the VOCAB info circle immediately after the complete pair
   (never between the two names). Record its popover in a comment:
   `Any table of category, score and member ids joined onto Groups or a
   selection; in biology these are enrichment results -- GO, KEGG or Reactome
   terms with FDR.` plus a `Learn more` link.

8. **Canonical pairs render on one line (MIN-14).** Region: RESULT CARD 1.
   Delete the separate line holding `Markov clustering (MCL)` and fold it into
   the title row so the row reads `Groups` then, muted at 11px,
   `Tight clusters (Markov clustering, MCL)`, then the `Coming` tag. Give the
   muted half `overflow: hidden; text-overflow: ellipsis` with a `title`
   carrying the full pair; the plain half never truncates.

9. **The switch sentence splits at the teach/report boundary (IC-1, IC-8).**
   Region: INSPECTOR CONTENT, the `Remove redundant categories` switch. Its
   sub-line reads
   `171 hidden: member sets overlap another by half or more (Jaccard >= 0.5).`
   Keep the reported half inline as `171 hidden` and move the rest behind a
   VOCAB info circle on the switch label, recording in a comment:
   `Two categories are redundant when their member sets overlap by half or
   more (Jaccard >= 0.5); only the stronger one is listed.`

10. **The score column explains itself once (MIN-11, IC-8).** Region:
    INSPECTOR CONTENT, under the table. Delete the footer line
    `Score: lower is better` and put the VOCAB info circle immediately after
    the `score` column header instead, carrying (in a comment)
    `Score is the FDR from the joined table: lower is stronger.` The
    `See all 41 categories` link stays -- the table is truncated at 8 of 41.

11. **The applied encoding names itself (NAV-2).** Region: RESULT CARD 1
    action row, which reads `Run again with changes | Change encoding`. The
    result already colours the canvas (its reading ends
    `Colors now show groups.`), so draw the applied form: an 11px `#7a828e`
    label `Encoded as node color` immediately left of the existing
    `Change encoding` link.

12. **Done chips are not drawn (MIN-6).** Delete the `Done` chip from RESULT
    CARD 1's title row. The `Imported` chip on card 2 stays: it reports where
    the result came from, not a run state.

13. **Catalogue counts (MIN-3).** Sub-tab `Results  2` becomes `Results` --
    two cards are visible and nothing is truncated.

14. **Status bar hygiene (MIN-8, NAV-12, C7).** Region: STATUS BAR. (a) Delete
    the `3D` chip. (b) Merge `Layout: Force directed (ngraph)` and `Settled`
    into one chip `Force directed (ngraph) - settled` with a 12px trailing
    caret; the `Layout: ` label goes and `(ngraph)` stays rendered inline.
    Comment the caret as opening the layout quick picks, Re-run, Stop and
    `Layout settings...`. (c) Delete `AI: not configured`.

## StyleDiverging

Spec 1.5 changes for `StyleDiverging.dc.html` (Style panel with the layer
`Expression` selected: Color by log2FoldChange on a Blue-Orange diverging
scale, Size by padj on a -log10 scale; biology dataset ovarian_de_string.tsv).
Ordered largest structural change first.

1. **The above-the-ask-limit confirm for a metric that has not been run
   (DEF-7).** Region: INSPECTOR CONTENT > SIZE group, the `Attribute` row.
   This artboard is where that state is documented. Change the Size attribute
   select to show the pending pick `Bridges betweenness` (plain name at
   `#d5d7da`, technical half at `#7a828e`) and insert, immediately under the
   select, the VOCAB snippet "Style By attribute row ... Above the ask limit"
   verbatim: a 2a3035 strip bordered `#48525c` reading
   `Bridges takes about 40 s on this graph.` with a filled
   `Run and use it` button and a transparent `Cancel` button. Leave every row
   below it in the SIZE group exactly as drawn -- `Scale -log10`,
   `Smallest 0.8`, `Largest 2.0`, `Missing 1.0` and the domain sentence -- and
   add an HTML comment saying why: nothing has run yet, so the applied
   encoding is still padj and the legend, the canvas and those rows still
   describe it; Cancel restores `Significance (padj)` in the select. Estimate
   wording is `about 40 s`: one significant figure, the words about, s, min,
   h, never a tilde.

2. **The layout segmented control renders each pair on one line (MIN-14, C7).**
   Region: PANEL CONTENT tier 1, `Arrangement (Layout)`. Delete the entire
   second row that holds `ngraph`, `sugiyama` and `radial` under the segments.
   Each segment then renders its pair inline at 10px:
   `Force directed (ngraph)` (active), `Hierarchical (sugiyama)`,
   `Radial (radial)`, with the technical half in `#7a828e` on the active
   segment and `#5f6873` on the two unshipped ones. Give every segment
   `overflow: hidden; text-overflow: ellipsis` and a `title` carrying the full
   pair, so the technical half truncates and the plain half never does.
   `More` keeps its caret and has no pair. Re-weight the flexes to
   `1.5 / 1.2 / 0.9 / 0.6`. The `Coming` row below (`Coming  Hierarchical and
   Radial`) is unchanged: it is already one tag for a group.

3. **Style layer rows carry the row-hover triple (IK-7, IK-4).** Region:
   PANEL CONTENT tier 1, the three layer rows (`DE list`, `Expression`
   selected, `Base layer`). Move the leading eye out of the leading slot and
   rebuild the trailing cluster in the fixed order edit, visibility, delete:
   pencil `title="Rename layer"`
   (`<path d="M11.2 2.3l2.5 2.5-8 8-3.2.7.7-3.2z"></path><line x1="9.6" y1="3.9" x2="12.1" y2="6.4"></line>`),
   eye `title="Hide layer"`, trash `title="Delete layer"` with 8px of
   separation, each 24x24 at `#7a828e` -- the VOCAB "Icon group ... Row form"
   snippet. Draw the trio on the selected `Expression` row only; `DE list` and
   `Base layer` show name, count and the drag handle alone. Add an HTML
   comment with the two carve-outs: the trio is revealed on row hover or
   focus and repeats as full text in the row's context menu, and a layer that
   is switched off keeps an eye-off glyph visible at rest so its state is
   readable without hovering.

4. **Panel actions are not bordered boxes, and no binding sits in a switch row
   (DEF-1).** Region: PANEL CONTENT tier 1, the `Show legend` switch row.
   Delete the mono `L` chip from the row and put the binding in the row's
   `title`: `Show legend (L)`. A binding never appears in a switch row; it
   lives in the tooltip, a menu row, a palette row and the shortcuts table
   only.

5. **Style import and export move to the panel header overflow (IK-6).**
   Region: PANEL CONTENT tier 3, the `Style template` row holding `Import...`
   and `Export JSON`. Delete that row. Record in an HTML comment on the panel
   title row that its overflow menu now holds, in order:
   `Import style...`, `Export style (JSON)`, `Expand all sections`,
   `Collapse all sections`, `Reset styles to defaults`. Both export labels
   keep their text in the menu because they name a format.

6. **The presets caveat moves behind a circle (MIN-11, IC-8).** Region: PANEL
   CONTENT tier 1, `Style presets`. Delete the line
   `Presets never change which labels show.` and add the VOCAB info circle
   immediately after the `Style presets` header label and before its `Coming`
   tag, recording that exact sentence as its popover in a comment. The five
   preset chips are unchanged.

7. **Legend hygiene (MIN-7, MIN-1, MIN-2).** Region: canvas LEGEND.
   (a) Delete the `Legend` caption. (b) Delete the caption line
   `Blue-Orange, midpoint 0, clamped at 2nd and 98th` in full: the gradient
   bar already draws its tick values (-4.2, 0, 3.8), so the caption keeps only
   a scale word and the scale here is the default linear, which is never
   named; the palette name moves to the legend's overflow menu and stays on
   Style's Palette select, and the clamp is owned by the Style panel's
   `Clamp outliers at 2nd and 98th percentile` checkbox. (c) Keep the
   `not measured (6 nodes)` swatch row -- a non-zero missing count is
   reported. (d) Keep `Size: significance (padj) / 0.05 to 1e-12, -log10` and
   `Edge width: confidence (combined_score) / 0.4 to 0.99`: `-log10` is a
   non-default scale and prints its name. (e) Delete the `Minimap` caption.

8. **Restated helper text (MIN-11).** Region: INSPECTOR CONTENT > SIZE group,
   the domain sentence. Delete the closing sentence
   `Legend updates automatically.` so it reads
   `padj 0.05 to 1e-12 maps to sizes 0.8 to 2.0 (-log10): smaller p, larger node.`
   The legend is on screen and visibly follows the encoding.

9. **Catalogue counts (MIN-3).** Region: PANEL CONTENT tier 2, the collapsed
   `All layouts` header. Delete its trailing `18 engines`: an engine count is
   a catalogue count and is named as one that goes entirely, even on a
   collapsed header. The collapsed `Layout parameters / Edge length 30` and
   `Preset details / Default` summaries stay -- they carry a current value,
   not a catalogue size.

10. **Status bar hygiene (MIN-8, NAV-12, C7).** Region: STATUS BAR. (a) Delete
    the `3D` chip. (b) Merge `Layout: Force directed (ngraph)` and `Settled`
    into one chip `Force directed (ngraph) - settled` with a 12px trailing
    caret (`polyline points="4,6 8,10 12,6"`, `#7a828e`); the `Layout: ` label
    goes and `(ngraph)` stays inline. Comment the caret as opening the four
    layout quick picks with their size estimates and disabled reasons, the
    active engine checked, then Re-run, Stop and `Layout settings...`.
    (c) Delete `AI: not configured` and its dot.

11. **Canonical pairs elsewhere on the screen (MIN-14 check).** The legend
    channel headers (`Color: fold change (log2FoldChange)`,
    `Size: significance (padj)`, `Edge width: confidence (combined_score)`) and
    the inspector attribute rows already render their pair on one line; leave
    them as drawn and do not re-stack them.

## InspectorGenomics

Spec 1.5 changes for `InspectorGenomics.dc.html` (no activity panel; TP53
selected in the ovarian_de_string.tsv STRING network, 34 attributes, Bridges
and degree in Computed metrics, 41 neighbours). Ordered largest structural
change first.

1. **A long text value renders as its shape (MIN-10).** Region: INSPECTOR
   CONTENT > Attributes, the ungrouped `sequence` row. Delete the 390-character
   monospace value and the `Show more` link. The row becomes: label
   `sequence` at 11px `#7a828e`, then the value rendered as its shape --
   `393 aa, MEEPQSDPSV...` in the 10px monospace at `#d5d7da` -- and a 24px
   copy icon `title="Copy value"` (VOCAB "Icon-only button" snippet) at the
   right. The row drops from three lines of wrapped text to one 22px row.

2. **The three unshipped actions become one dimmed group (MIN-4).** Region:
   INSPECTOR CONTENT > Actions block. `Expand 41 neighbors`,
   `Select neighbors` and `Ego network` are three contiguous unshipped
   controls in one block. Delete all three `Coming` tags; render the three
   dimmed (`color: #5f6873`, the `Expand` split button's border
   `#374047`) and disabled; and draw one group note directly above them -- a
   1px `#374047` divider with the muted label `Coming soon` at 10px `#7a828e`
   followed by the VOCAB info circle carrying (record in a comment)
   `Dimmed rows are not built yet.` `Find path from here` and `More` keep
   their normal treatment, and the `Choose node and edge types` caret stays
   attached to the disabled Expand button.

3. **The attribute row's copy pair collapses, and the row menu gains the
   encode verbs (IK-5, NAV-12.3).** Region: INSPECTOR CONTENT > Key
   attributes, the hovered `log2FoldChange` row, which shows two icons,
   `Copy value` and `Copy path`. Replace them with two controls, in this
   order: one 24px copy icon `title="Copy"` whose two-item menu (`Copy value`,
   `Copy path`) is recorded in a comment, then one 24px three-dot `More` icon
   whose menu, also recorded in a comment and in its `title`, opens with
   `Color by this`, `Size by this`, `Filter by this`, then a divider, then
   `Show in table`. `Size by this` is enabled because log2FoldChange is
   numeric. That resolves the collision between IK-5 (one copy icon) and
   NAV-12 (a row menu) by giving the row two icons, inside IK-4's limit of
   three.

4. **Copy all becomes a section-header icon (IK-5, IK-4).** Region: INSPECTOR
   CONTENT > Attributes. Delete the `Copy all` text link from the footer row
   (leaving `Show all 34` alone there) and put a 24px copy icon
   `title="Copy all attributes"` at the right of the `Attributes` section
   header, drawn in the hover-revealed style of the VOCAB "Icon group in a
   section header" snippet, with a comment noting it repeats as a full-text
   item in the section's overflow menu.

5. **The Key attributes sub-header goes (MIN-10).** Region: INSPECTOR CONTENT
   > Attributes. Delete the `Key attributes` sub-header row (chevron and
   label) inside a section already titled Attributes and replace it with a 1px
   `#374047` hairline rule above the pinned rows. The four pinned rows
   (`preferredName`, `id`, `log2FoldChange`, `padj`) keep their positions and
   their `label`, `id`, `color`, `size` annotations.

6. **Computed metrics: one line per pair, one circle for the percentile
   (MIN-14, MIN-3, IC-8).** Region: INSPECTOR CONTENT > Computed metrics.
   (a) Each row stacks the plain name over the technical field; render them
   inline instead -- `Bridges (betweenness)` and
   `Most connected (degree)`, technical half at `#7a828e` -- and drop the row
   height from 30px to 22px. The value stack (`0.31, 98th percentile` over
   `Rank 6 of 318`) is a value, not a name pair, and stays as drawn, keeping
   `title="normalized 0.312"` (an exact value behind a rounded one is
   reported text and needs no circle). (b) Delete the header count `2`: two
   rows are visible and nothing is truncated. (c) Add the VOCAB info circle
   immediately after the `Computed metrics` header label, carrying (in a
   comment) `Percentile compares this node with every other node: 98th
   percentile means it scores above 98 per cent of them.` One circle for the
   section, not one per row.

7. **No binding in a section header (DEF-1).** Region: INSPECTOR CONTENT >
   Notes header. Delete the bordered mono `N` chip from the header's trailing
   slot and put the binding in the header's tooltip:
   `title="Notes (N)"`. A binding appears only in a tooltip, a menu row, a
   palette row and the shortcuts table -- never in a section header, and never
   in a trailing column that carries data on other rows.

8. **The Notes header loses its technical name (MIN-10, C7).** Same header:
   delete the muted `Annotations` beside `Notes`. `Notes Annotations` was
   always a conformance error -- 6.3 exempts section labels -- and the header
   reads `Notes` alone, with no count, because TP53 has none.

9. **Counts that the link beside them carries (MIN-3, MIN-10).** Region:
   INSPECTOR CONTENT > Attributes header: delete the trailing `34`; the
   footer's `Show all 34` link carries it. The collapsed namespace groups
   (`stringdb:: 6`, `tissue:: 12`, `compartment:: 8`) and
   `Joined from expression.tsv 4` keep their counts -- those sections are
   collapsed.

10. **The neighbour breakdown does not restate the header count (MIN-1).**
    Region: INSPECTOR CONTENT > Neighbors. Change
    `41: 29 binding, 8 activation, 4 catalysis` to
    `29 binding, 8 activation, 4 catalysis`; the section header's `41` is the
    owner. The two top rows (`MDM2 binding 0.99`, `CDKN1A ... 0.99`),
    `Show all in data table` and `Select these` with its isolated `Coming` tag
    are unchanged.

11. **Legend hygiene (MIN-7, MIN-1).** Region: canvas LEGEND. (a) Delete the
    `Legend` caption. (b) Delete the caption
    `Blue-Orange, midpoint 0, clamped at 2nd and 98th`: the gradient bar draws
    its tick values (-4.2, 0, 3.8), the scale is the default linear and is
    never named, the palette name moves to the legend's overflow menu and the
    clamp belongs to Style. (c) Keep `not measured (6 nodes)` -- a non-zero
    missing count is reported. (d) Keep `Size: significance (padj) / 0.05 to
    1e-12, -log10`: a non-default scale prints its name. (e) The `Selected`
    state row keeps its label and carries no count. (f) Delete the `Minimap`
    caption.

12. **Status bar hygiene (MIN-8, NAV-12, C7).** Region: STATUS BAR. (a) Delete
    the `3D` chip. (b) Merge `Layout: Force directed (ngraph)` and `Settled`
    into one chip `Force directed (ngraph) - settled` with a 12px trailing
    caret (`polyline points="4,6 8,10 12,6"`, `#7a828e`); the `Layout: ` label
    goes, `(ngraph)` stays inline. Comment the caret as opening the four
    layout quick picks with their size estimates and disabled reasons, the
    active engine checked, then Re-run, Stop and `Layout settings...`.
    (c) Delete `AI: not configured` and its dot. (d) `1 selected` stays.

13. **The pushpin adopts the register form (IK-2).** Region: inspector title
    row, the `Pin as A` control. Replace the whole svg body
    (`<path d="M9.5 2.5l4 4-2 1-1.5 4-2.5-2.5-4.5 4.5 4.5-4.5-2.5-2.5 4-1.5z">`)
    with the consolidated upright pushpin:
    `<path d="M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z"></path><line x1="8" y1="8.5" x2="8" y2="13.5"></line>`.
    Every other glyph on this artboard is already the register form; do not
    redraw them.

14. **The id row stays (MIN-10 boundary).** Do not drop the `id | STRING |
    9606.ENSP00000269305` row: MIN-10 drops it only when the displayed label
    equals the id, and here the label is `TP53` while the id is a STRING
    identifier. Record the reason in a one-line comment so a later pass does
    not delete it.
