# Round 2 walkthroughs: a novice's first ten minutes, then an analyst's week

Two people use the round-2 design as drawn, click by click. The design is `revision.md` and
`screens.md` in this folder; the pictures are the twelve stills in `../mocks/v2/screen-1.png`
to `screen-12.png` (screen 11 is the toolbar reference sheet). Paths below are under
`/home/apowers/Projects/graphty-monorepo/design/ui/object-first-ux/` unless they start with
`/`. `#NNN` is an open issue in graphty-org/graphty-monorepo, titled the first time it is
named.

Each step records what the person clicks, what they expect, what the design says happens
(with the screen or section that says so), and where they are lost or slowed. The findings at
the end are ranked blocker, major, minor, each with a fix. This document does not repeat the
nineteen findings of `critique-novice.md` or the maintainer's list in `critique-maintainer.md`;
`revision.md` says it resolved them, and where it did the walkthrough confirms it in passing.
What is listed here is what is still in the way when the two people actually walk the screens.

**Status.** The twenty findings below were answered after this was written: `revision.md`
section 9.1 records the design change for each (the blocker is screen 15, the reload that
keeps the objects; the Import dialog is screen 14; categorical wins Colour; a Group opens on
Members; a Path by name; Compare's second mask; and the minor doors), and `decisions.md`
"Pass 3" records the choices.

## Terms

The design's words, defined once (the full glossary is `revision.md` section 0):

- **Object**: a row in the left panel's tree, made from the data: a **Set** (a list of nodes or
  edges painted with one look: a path, a filter result), a **Measure** (one number per node: a
  centrality), a **Grouping** (one label per node: communities) with a **Group** row per label,
  or the **Dataset** itself (the root row).
- **Inspector**: the right panel; it shows the selected object (or node) with a fixed header
  block and three or four **tabs** (pill-shaped labels that swap the panel's rows).
- **Tool**: a toolbar verb that makes an object. Clicking one **arms** it: the button turns
  blue and a dark one-line **secondary bar** above the toolbar says what will happen, on what,
  and at what cost, with a Run button. Nothing runs until Run, Enter, or a canvas click.
- **Flyout**: the dark menu behind a tool's chevron listing its variants. Clicking a flyout row
  runs that variant at once.
- **Style**: an object's appearance, stored as style layers inside graphty-element. A
  **channel** is one visual property (node colour, edge width). An **encoding** maps a
  Measure's or Grouping's values to a channel through a scale and a palette.
- **Mask**: what is showing. **Focus** masks to one object's members; a **time window** masks
  to one span of a time column. The **eye** on a row stops that object painting; it never
  hides anything.
- **Cost gate**: the element refuses to start a run unasked above a time budget (30 s); the row
  appears "waiting" with a Run button in it.
- **Dock**: the bottom strip under the canvas with Table, Assistant and History tabs; closed, its
  tab strip stays as a 24 px handle.

## Part 1: the novice's first ten minutes

The person is Explorer Elena from
`/home/apowers/Projects/graphty-monorepo/design/designloom/personas/explorer-elena.yaml`: a
product manager, no graph vocabulary, on a 1366 x 768 laptop, who loads data and looks, clicks
prominent nodes, searches for names she knows, follows connections outward, reads size and
colour as importance, takes screenshots, and abandons a tool that feels steep. Her four fears:
too many options, unclear words, no idea where to start, breaking something.

| Minute | She clicks | She expects | What happens (per the design) | Lost or slowed |
|---|---|---|---|---|
| 0:00 | Opens the app. Screen 1: an "Open a graph" sheet centred on the canvas with a drop zone, one blue "Choose a file" button and four sample rows | A way to start without her own file | The sample rows look clickable (chevron at the end, count and "over time" blurbs). The toolbar is visible but dimmed to 30 percent except Select and Hand, so she reads its names ("Filter, Neighbours, Path, Groups, Rank, Structure, Note, Ask") before she can press them. A "?" sits at the bottom right of the status bar | Nothing. The 8 px labels under the tool icons are too small to read at this laptop's 100 percent scaling (every other text in the kit is 11 px or more), so she reads them on hover instead, which costs her the "learn by looking" the labels were meant to give (finding 12) |
| 0:20 | "Karate Club  34 nodes, 78 edges" | A picture | Screen 2: 34 grey nodes, settled. The left panel has one tree row "Karate Club  34 nodes  78 edges" with three indented suggestion rows under it: "Find groups (G)", "Rank by connections (R)", "Find a path (P)". The right panel says "Dataset / Karate Club", a locked grey chip, "karate.gml, GML", one sentence "34 nodes joined by 78 edges in one connected part  ?", four tabs Overview, Layout, Canvas, Data, and seven plain rows | Nothing. The sentence answers "what is this" before she asks. "Density 0.139" and "Parts 1" are strangers' words but the "?" beside the sentence promises to define them |
| 0:40 | "Find groups (G)" | Groups appear | The row arms the Groups tool (tooltip "Same as pressing G"): the Groups button turns blue and the secondary bar reads "Find groups by [Communities v] on what is showing, 34 nodes, about 80 ms  [Options]  [Run]  Cancel" | Slowed one click. She clicked a row that said "Find groups" and got a sentence asking her to confirm it. The design's own rule is that "a click on a flyout row runs that variant at once, because choosing a row is already the second click" (`revision.md` 3.2); a suggestion row is a flyout row drawn in the tree and should run at once too (finding 7). The sentence is good the first time she presses G unarmed; it is a speed bump on a row that already named the verb |
| 0:45 | Run | Groups | The tool snaps back to Select; the row "Communities (Louvain)  4 groups" appears at the top of the tree, expanded to Group 1 to Group 4 with colour chips; the nodes turn four colours; the legend card appears at the bottom right of the canvas (it switches itself on with the first Grouping); the inspector opens on the Grouping's Groups tab: "Groups 4 \| Modularity 0.36", "Sizes 12, 11, 6, 5", "Show the largest [8 v]", "Names from [none v]", "Sort groups by [size v]", FINDINGS; the reading row says "The groups are clearly separated (modularity 0.36)  ?" | Nothing. "What did I just make" is answered on the surface. "Louvain" in the name and "modularity" in the sentence are the only strange words and both are explained by the "?" |
| 1:30 | The largest orange node on the canvas (screen 3's node 1, the biggest circle) | Who this is | The node halos gold; the inspector shows "Node  id 1", its attributes (Karate Club has none beyond the id), "All 1 attributes >", "Connected to 16 nodes >", then VALUES with "Communities  Group 2 >", MEMBER OF (empty header), LOOK collapsed with "Colour from Communities", NOTES. Tabs About, Attributes, Links. Hover on any node shows its label | Nothing; screen 9 shows this shape. Karate Club has no names, so "id 1" is all she gets, which is the data's fault, not the design's |
| 2:00 | "Connected to 16 nodes >" | The neighbours | The Links tab: "Neighbours 16", ten rows of neighbour labels, "See all 16 in table", header actions "Select" and "Neighbours tool (E) prefilled" | Nothing |
| 2:20 | Double-clicks the node | "Expand" it | Double-click selects its neighbours when no server fetcher is configured (`revision.md` 3.2): 17 nodes halo, the status bar reads "17 selected", the inspector becomes the several-elements tab ("Make a set (Ctrl+G)", "Add to [set v]", Statistics, Values, "Style these...") | Slightly lost: she wanted to "see around" the node and got a selection plus a panel of verbs. It is recoverable (Escape), and the Links tab's "Neighbours tool (E)" is the door she needed, one tab back |
| 3:00 | Group 2 in the tree, to see what the orange group is | The group's members, or its colour | The row selects; its 11 members halo; the inspector opens on the Group's **first tab, Define**: three read-only rows ("Of Communities >", "Label 2", "11 nodes, 32% of the scope") and a collapsed Profile | Slowed and puzzled. The one thing a novice does with a group row is click it, and the tab that opens has nothing to read or do. The reading row above the tabs ("Group 2 of 4 in Communities") saves it, but the tab under it is dead space. Members (what is in it) or Style (the colour) is what she came for (finding 5). Screen 3 shows Style selected, but only because the design assumes she clicked the chip, not the row |
| 3:20 | The orange chip next to "Group 2" in the tree | To change the colour | Style tab, per the event rule (`revision.md` 2.5): NODES "Colour [chit #56b4e9]  Inherited from Communities" with a lock; clicking that chit creates an override and opens the picker; she picks a red; the row becomes "Colour [chit] D55E00 100% [eye] [-]" above the inherited row (screen 3) | Nothing. Three clicks, and the change is a row she can see and remove with its minus |
| 4:00 | The eye on Group 1, to see only Group 2 | Group 1's nodes vanish | Group 1's override (there is none) stops painting; nothing changes on the canvas because Group 1 has no override. The eye on the Grouping row would turn every node grey. Nothing ever disappears | Lost for a moment. In Figma, the only app this frame borrows from, the eye hides the layer; here it stops paint. The design says so in its glossary, but the tooltip on the eye is what she reads. The door she wanted is "..." > "Focus on this" on the Group row, or "Focus" in the Members tab's header (finding 13) |
| 4:30 | The magnifier glyph in the Objects header, to find node "33" | A search box | Ctrl+F opens a find field with two sections, Objects (by name) and Nodes (by label or id); typing "33" lists node 33; choosing it selects and locates it | Slowed: the glyph sits in a header that says "Objects", and she is looking for a node. Figma's layer search lives in the same place, so the precedent holds, but the field's placeholder should say "Find an object or a node" (finding 14) |
| 5:00 | "Rank by connections (R)" then Run, to see who matters | Bigger nodes for important people | "Connections (Degree)  34 values" appears above Communities; Colour is held by Communities, so the Measure takes Size (its order is Colour, Size, Opacity; `revision.md` 5.7); nodes resize; the legend gains "Connections  1 to 17"; the inspector opens on Values: min, max, a histogram, TOP 10 with five rows | Nothing; this is the picture the persona reads by instinct. It works because she ran Groups first; the other order is the analyst's problem below (finding 3) |
| 6:00 | The "Bridges 0.031  rank 12 of 115 >" style row on a node's About tab (here "Connections 16  rank 2 of 34 >") | Where this node sits | The Measure's Values tab with that node's row highlighted | Nothing |
| 6:30 | The "3D" segment of the mode switch | A 3D picture | The canvas becomes a 3D scene; the framing pill reads "Fit" instead of "100%"; drag orbits, Shift+drag draws a marquee; wheel zooms (proposed, #290 "no wheel zoom or pan in 3D, and 2D zoom ignores the cursor") | Nothing on the design's terms; until #290 lands the wheel does nothing in 3D and she will assume it is broken |
| 7:30 | The blue Export button | A screenshot | A menu: Export image..., Copy image (Ctrl+Shift+C), Export video..., Export data..., Export report..., Export styles..., Export bundle..., Copy methods text, Export recipe. "Export image..." opens a popover with Preset [Web v] first, Format [PNG v], Scale, Framing, Transparent, "Legend in picture" on by default, and a size line | Slowed by the length of the menu: nine rows, six of which mean nothing to her. "Copy image" second in the list is the one she wants and it is one click, so she gets there |
| 8:30 | Ctrl+Z, because she wants the red back to orange | Undo | The override is removed (the objects API keeps the history, `revision.md` settled decision 1); the History tab in the dock handle shows the journal | Nothing. The handle at the bottom of the canvas is visible before she needs it, which answers "fear of breaking things" |
| 9:00 | "Email network  1,204 nodes, 5,830 edges, over time" from the file menu's Open sample, curious about "over time" | Something that moves | The Dataset's Overview gains a Findings row "Time column: sent, 2019-01 to 2019-12 [Show over time]"; clicking it shows the transport bar under the canvas (screen 10) with Play, a slider and the window band | Nothing; the door is on the first tab. What she does not get is a hint that the bar exists before she opens Findings: the row is one of up to three under a header, and on screen 2's shape the FINDINGS header is near the bottom of the Overview tab. It is findable; it is not announced (finding 15) |
| 9:30 | Play | Motion | The window slides month by month; nodes and edges outside it are not drawn; the count in the bar and the status bar tick; nothing turns amber (`revision.md` 6.1) | Nothing |

**Verdict for the novice.** She reaches a coloured, sized picture with a legend in under two
minutes and a copied image in eight, and nothing she does is destructive or unrecoverable. The
three places she stalls are all first-click mismatches: the suggestion row that asks her to
confirm, the Group row that opens on read-only rows, and the eye that does not hide. None makes
her leave; each costs a look around.

## Part 2: the analyst's session

The person is Analyst Alex from
`/home/apowers/Projects/graphty-monorepo/design/designloom/personas/analyst-alex.yaml`: three
years with graph data, has used Gephi and NetworkX, starts from a hypothesis, picks algorithms
by the insight needed, compares results, tunes parameters, exports metrics, and hates repeated
clicks and unsaveable patterns. His weekly file: `contacts.csv`, 2,300 people and 41,000
messages, columns `from_person`, `to_person`, `msgs` (a count), `sent` (a date). His question
this week: who brokers between teams, and does that change over the year.

### Task 1: import

| Step | He clicks | He expects | What happens | Lost or slowed |
|---|---|---|---|---|
| 1 | Drops `contacts.csv` on the Welcome sheet | The file to load, or a wizard | The design's one dialog, the Import dialog, opens with the file chosen and Format [Auto]. Round 2 draws no screen of it and lists no rows for it; the rows are round 1's (`object-model.md` section 9, `feature-fit/1-data.md` rows 1 to 18): a format select, an Options group, and the field mapping "shown only when detection is unsure" | The dialog is the only surface of the whole session that has no round-2 drawing and no row list, and it is the persona's first minute |
| 2 | Load | 2,300 nodes | The element's CSV detector looks for `source/target`, `src/dst`, `from/to`; `from_person, to_person` match none, so the load is refused and the mapping rows appear as **typed text fields** (the endpoint options are `type: "string"` in `graphty-element/src/catalog/formats.ts`). No preview of the first rows | Slowed and error-prone: he types `from_person`, `to_person` and, for the weight, `msgs`, by hand, with no list of the file's columns and no sample rows to check that `msgs` is a count. Round 1's finding F4 (`critique/analyst-walkthrough.md`) named this and asked the element for a header peek so the dialog can draw selects and five rows; round 2 does not mention it (finding 2) |
| 3 | Load again | A directed, weighted graph | The Dataset row appears; Overview says "Nodes 2,300 \| Edges 41,000", "Direction  Undirected (file) [Change...]", "Weighted Yes". Messages have a direction. "Change..." reopens the import options, "since re-direction after a load is a re-import today" (`revision.md` 2.4) | Fine here, because nothing exists yet to lose; he re-imports as Directed. The same click after task 2 is finding 1 |
| 4 | Reads the Findings on Overview | Nothing in particular | "Time column: sent, 2019-01 to 2019-12 [Show over time]" is there | Good; he notes it for task 6 |

### Task 2: two runs (betweenness, then communities)

| Step | He clicks | He expects | What happens | Lost or slowed |
|---|---|---|---|---|
| 1 | R | Betweenness | Rank arms with its face, Connections: "Rank by [Connections v] on what is showing, 2,300 nodes, instant [Options] [Run] Cancel" | One extra click to open the select and choose Bridges. He learns the shortcut: R, then the select, or Ctrl+K "Bridges" |
| 2 | The bar's select > Bridges; Options | To say "weighted, directed" before it runs | The parameters popover: "On what is showing, 2,300 nodes"; Weights [switch] \| Direction [As loaded v]; Exact [switch on] "sampled above 2,000"; "About 1 min"; Run (screen 4; the Weights and Direction rows wait on #313 "weight and direction options are missing on most algorithms") | Nothing; this is round 1's F5 fixed. Two Run buttons are visible at once (the bar's and the popover's); Enter presses the popover's while it is open, which is right, but the bar's should dim (finding 16) |
| 3 | Run | A row | Over the 30 s gate: "Bridges (Betweenness)" appears at the top of the tree in the waiting state with "Run (about 1 min)" in its count slot; the inspector opens on Define with [Run (about 1 min)] [Approximate instead (about 5 s)] (screen 5 shows the state) | Nothing; he presses Run again knowing the cost. The waiting row is "defined, not started", element work named in `revision.md` section 8 |
| 4 | Waits | A picture | Computing with a ring and "Computing 42% [Cancel]"; then "2,300 values", the reading "Node Dana sits on the most shortest paths; the top 1% carry 40% of them  ?", the inspector switches to Values, and **Bridges takes Colour** (the first free channel in a Measure's order) with a sequential ramp; the legend shows the ramp | Nothing yet |
| 5 | G, Run (Communities, about 3 s) | Communities as colours, betweenness as size, the picture every community analysis (workflow W04 in `/home/apowers/Projects/graphty-monorepo/design/designloom/workflows/W04.yaml`) ends with | "Communities (Louvain)  14 groups" lands above Bridges. Colour is held by Bridges below it, so by the per-kind order (Grouping: Colour, Shape, Outline; `revision.md` 5.7) **the Grouping takes Shape**: fourteen communities as fourteen of the element's 25 node meshes, and the legend lists shapes | Lost. Nothing on the canvas says "community"; a sphere, a cube and a cone among 2,300 small nodes do not read as groups, and the analyst has never asked a tool for this. Had he run Groups first (as the novice did) he would have colours for groups and size for betweenness (screen 3). The picture depends on the order of two runs (finding 3). His repair is three clicks in two Style tabs (Communities: click the block name, choose Colour; Bridges: it is now covered, click its name, choose Size), and he has to know that a block's channel name is a hidden select (finding 11) |

### Task 3: a filter on a result

| Step | He clicks | He expects | What happens | Lost or slowed |
|---|---|---|---|---|
| 1 | F | To threshold Bridges | Filter arms; its popover opens at once (its fields are the whole tool): Target [Nodes \| Edges]; the variant rows; By range shows "Attribute or Measure [v]" listing every Measure in the tree (round 1's F7 fixed), a histogram, Min \| Max; the bar reads "Filter by range  Matches 38 nodes  [Select] [Create] [Create and focus]  Cancel" with a live dry-run count | Nothing, on paper. "Create" on a Measure is proposed (#192 "cannot hide small community groups or filter on group size"); until it lands only Select works and the row should say so instead of a button that fails (finding 17). The second door, the Measure's Values tab TOP "+" > "Above threshold set...", is the one he would not look in |
| 2 | Create and focus | A Set and a quiet canvas | "Bridges > 0.05  38 nodes" appears above Bridges with an Outline 2 px (a Set's first channel); the mask is the Set: the status bar reads "Focused on Bridges > 0.05: 38 of 2,300 [Exit]"; the tree row carries a focus glyph | Nothing |
| 3 | Exit (status bar) | Everything back | The mask clears; the Set stays | Nothing |

### Task 4: two paths at once

| Step | He clicks | He expects | What happens | Lost or slowed |
|---|---|---|---|---|
| 1 | P | To ask for the route from Dana to Priya | The bar reads "Pick the start node"; a canvas click is the only pick the design describes (`revision.md` 3.3, 3.5: "a click on a node") | Stuck. With 2,300 nodes and a label budget of six, Dana is not findable on the canvas. Ctrl+F > Nodes > "Dana" selects and locates her, but the Path bar does not say it takes the selection (Neighbours does: "a click on a node, or the selection, seeds it"). The Set's Define tab has "From [node] \| To [node]" fields, but only after the Set exists (finding 4) |
| 2 | Works around it: Ctrl+F "Dana", Escape, P, clicks the haloed node, Ctrl+F "Priya", clicks it | A path | "Path: Dana -> Priya  7 nodes  6 edges": EDGES Colour (the highlight palette's first colour), Width 3, NODES Outline 2 px in the same colour; the reading "The shortest route from Dana to Priya has 6 hops  ?"; the Members tab opens with Hops 6 \| Cost 3.0 and the members in hop order | Eleven actions for one path, twice |
| 3 | P again, Dana -> Marcus | A second path beside the first | "Path: Dana -> Marcus" lands above the first with the palette's second colour; both draw; the shared edges show the higher row's colour and width (screen 8); the legend lists both with their line swatches | Nothing; highlights are no longer exclusive and it shows. To tell them apart at a glance he adds Pattern [Dash] from the EDGES "+" on one of them: two clicks |
| 4 | Reads the Style tab's note "Shares 2 edges with Path: Dana -> Priya; this path wins Colour, Width and Pattern on them" | | | Nothing; the per-channel rule is stated where it applies |

### Task 5: restyle a measure

| Step | He clicks | He expects | What happens | Lost or slowed |
|---|---|---|---|---|
| 1 | The Bridges row, then Style | The colour ramp controls | Values opens first (a Measure's first tab); Style is one click right. NODES: the Colour block open with Scale [Even steps v], Palette [ramp v], "Values from [0.002] \| to [0.310]", Clamp outliers, Reverse, Reset, Missing, Legend preview; Size collapsed (screen 6) | Nothing. He sets Scale to "By order of magnitude" because betweenness is skewed, ticks Clamp outliers, and the legend's line reads "clamped at p2 and p98". The plain scale names take a second look ("By significance" for neglog10) but the technical name is in the tooltip |
| 2 | NODES "+" > "Colour and size" | Both channels in one click | Both blocks exist; one open at a time (an accordion) | Nothing; round 1's F13 fixed |
| 3 | Notices Communities is now "Covered by Bridges on 2,300 of 2,300 members" on its Style tab and gone from the legend | | The rule is Figma's: drag the row above, or change the channel | Fine, but it is the same three-click repair as task 2 step 5, made twice in one session (finding 3 again) |

### Task 6: a time window

| Step | He clicks | He expects | What happens | Lost or slowed |
|---|---|---|---|---|
| 1 | Overview > Findings > "[Show over time]" | A timeline | The transport bar appears under the canvas with the full year as the window; the gear popover holds Time attribute [sent v], Unit [Month v], Window from \| to, Mode [Sliding \| Cumulative], Step, Speed, "Re-run objects while playing" [off], "Re-run layout per step" [off], CHANGES, OVER TIME (screen 10) | Nothing |
| 2 | Drags the band to 2019-03 to 2019-05 | Fewer nodes | Nodes follow their edges (a node with no time value is inside when one of its edges is); "412 of 2,300 nodes" in the bar; Bridges and Communities keep their whole-year values with "computed on 2019-01 to 2019-12" in their legend blocks and summary rows; nothing turns amber | Nothing; the caveat instead of a stale flag is the right call for a scrub |
| 3 | Wants communities for March alone: Communities > summary row "Re-run" | A March result | Re-run runs at the current window and **replaces** the whole-year result under the same object id; the old result goes to the journal for undo | Slowed: he wanted both. The route that works is G, Run again while the window is March, which makes a second "Communities (Louvain)" that carries the caveat "computed on 2019-03 to 2019-05". Two rows now share a name and only their Record tabs differ (finding 18) |
| 4 | Moves the window to September, G, Run | A third Grouping | "Communities (Louvain)" a third time | Same |
| 5 | Switches on "Re-run objects while playing", presses Play | Ticking numbers | Every object scoped to what is showing and under a second re-runs each step; the Groupings keep their caveats; the bar's counts move | Nothing |

### Task 7: compare

| Step | He clicks | He expects | What happens | Lost or slowed |
|---|---|---|---|---|
| 1 | Selects the March and September Groupings in the tree | Two rows selected | The several-objects inspector: Combine (four joined buttons, disabled with a reason for Groupings), Compare [switch], Focus on these, Style, Hide all, Lock all, Delete. How two tree rows are multi-selected is not written anywhere in round 2 (Shift+click is named only for legend swatches, `revision.md` 6.10) | Slowed by a guess; Ctrl+click works in every tree he has used, so he guesses right (finding 19) |
| 2 | Compare on | March beside September | A second canvas beside the first on the same tree and the same selection; each canvas paints only that Grouping's Style; a "Link cameras" switch; a Findings row "agree on 280 of 412 nodes, adjusted Rand 0.41" (element work, #186 "the Compare toggle does nothing", large) | Lost, for the question he actually has. Both canvases share the one mask. The time window is 2019-09, so the March Grouping's members outside September are not drawn in either canvas; to see both he widens the window to the year, and then each side shows a whole year's nodes painted by a three-month result. What "network evolution" (workflow W19) asks is March on the left and September on the right, and the design has no surface that gives one canvas a different mask from the other (finding 6). The agreement number is right and useful; the picture is not |
| 3 | Escape | One canvas | The second canvas closes | Nothing |

### Task 8: export

| Step | He clicks | He expects | What happens | Lost or slowed |
|---|---|---|---|---|
| 1 | Bridges > Record | The numbers as CSV | MADE BY (method, parameters, scope, engine, time, caveats), "Copy as methods text", "Copy as command", one row "Export [Ranked list, CSV v] [Export]" | Nothing |
| 2 | Export > Export data... | Everything with the results as columns | Format, scope [Everything \| What is showing], Include positions, Include object columns (data exporters are proposed; graph-io has them) | Nothing |
| 3 | Export > Export image... | A figure with a legend | Preset [Print v], "Legend in picture" on, "Notes in picture", a size line | Nothing |
| 4 | Export > Export report... | A methods section | A checklist of tree rows in tree order plus Statistics, Image, Legend, Methods, Notes (#187) | Nothing |
| 5 | Ctrl+S | The session saved for next week | Save project (#301 "no project file to save and reopen a whole session") | Nothing on paper; everything on the build order. Next week's "same objects, new file" is Export recipe, Replace, Run a recipe (three menus), and round 2 does not draw the Replace dialog or its "Keep the objects and re-run" option that round 1's F3 asked for (finding 1) |

**Verdict for the analyst.** Two clicks to a run, the cost read before it starts, every result a
row with its record, two paths side by side, a window that never stales the tree, a ranked
CSV in one row: the design answers the persona's "too many clicks" for everything he does more
than once. What still hurts, in order: the picture depends on run order (task 2), a path cannot
be asked for by name on a real graph (task 4), the import dialog is undrawn and still types
column names (task 1), and Compare cannot show two moments (task 7).

## Findings, ranked

Severity: **blocker** means the person has no route or the route destroys work; **major**
means the route exists but leaves the person lost, or slower than the tool they came from,
or with a wrong picture; **minor** means friction they notice and pass.

| # | Severity | What | Where | Fix |
|---|---|---|---|---|
| 1 | blocker | A field-role mistake (weight, label, direction) noticed after the first runs still costs the whole tree: "Set as weight", "Set as label" and Overview's Direction "Change..." all "reopen the import options", a re-import, and round 2 draws no Replace dialog and no "Keep the objects" choice. Round 1's F1 and F3 asked for exactly this and round 2 lists the in-place re-mapping only as future element work (`revision.md` section 8, last row) | `revision.md` 2.4 Dataset Overview and Data rows; section 8; task 1 step 3, task 8 step 5 | Until the element re-maps in place: the re-import opened from those rows defaults to "Keep the objects and re-run them" (recipe replay under the stale rule; the objects API owns the recipe, so this is one flag on the load), and says "6 objects will re-run, about 2 min". Draw that dialog in `screens.md` |
| 2 | major | The Import dialog has no round-2 screen and no row list; its mapping fields are typed text with no column list and no row preview (round 1's F4, unaddressed). It is the analyst's first minute and the novice's first file | `object-model.md` section 9; `feature-fit/1-data.md` rows 10 to 12; `graphty-element/src/catalog/formats.ts` endpoint options | Add a fourteenth screen: the Import dialog with Format [Auto v], a five-row preview, and the mapping rows as selects fed by a new element call that returns the header row and a sample (a `peek`) before the load; list the element item in `revision.md` section 8 |
| 3 | major | The suggested first paint depends on run order. Groups then Rank gives communities as colours and the measure as size (screen 3); Rank then Groups gives the measure as colour and **communities as fourteen node shapes**, which no analyst reads as groups. Shape as a Grouping's second choice is the wrong default in 2D at any size over a few dozen nodes | `revision.md` 4 step 9, 5.7 (T7 in `decisions.md`); task 2 step 5 | Categorical wins Colour: when a Grouping is created and Colour is held by a Measure, the Grouping takes Colour and the Measure's Colour block becomes Size (one journal entry, undoable; the Measure's summary row says "moved to Size for Communities"). Failing that, a Grouping's order is Colour, Outline, Shape, and the legend says "shape" out loud |
| 4 | major | A Path's endpoints can only be picked by a canvas click. On a graph larger than the label budget the start node is not findable by eye, and the bar does not say it accepts the selection or a typed name; Neighbours does | `revision.md` 3.3 Path, 3.5; task 4 | The Path bar's "Pick the start node" carries a field ("or type a name") backed by the Ctrl+F node lookup; a selected node pre-fills From, as Neighbours already does; the Set's Define From \| To fields are the same control |
| 5 | major | A Group row's first tab is Define, three read-only rows; the novice's most frequent tree click lands on nothing to read or do | `revision.md` 2.4 Group, 2.5; minute 3:00 | Order a Group's tabs Members \| Style \| Define \| Record (23 characters, within the width rule), or keep the order and open a Group on Members |
| 6 | major | Compare shows two objects under one mask. The temporal question (W19: March beside September) cannot be drawn, because the second canvas cannot carry its own time window; widening the window shows a whole year painted by a three-month result on both sides | `revision.md` 6.7, decision R4; task 7 | Keep "Compare takes two objects" and let the second canvas take a mask of its own: a "Showing [Same \| a View v]" select in the Compare strip, where a View already stores a time window (`revision.md` 6.2). Nothing toggles eyes; only the mask differs |
| 7 | minor | A suggestion row ("Find groups (G)") arms the tool and asks for Run; a flyout row with the same shape runs at once. Same row, two behaviours, and the suggestion is the novice's first click | `screens.md` screen 2; `revision.md` 3.2; minute 0:40 | A suggestion row is a flyout row: it runs at once under the cost gate, and its tooltip says the cost ("about 80 ms") |
| 8 | minor | The toolbar chevron's flyout runs a variant on click while the secondary bar's select (the same list) only chooses; a novice who opens the chevron "to see the options" and clicks one has started a run. The cost gate and undo make it harmless above 30 s and reversible below, so it is friction, not damage | `revision.md` 3.2, 3.4; screen 4 | Say it on the flyout: the face row's tooltip "Click runs; ... asks first", or make a flyout row while the bar is open behave as the bar's select |
| 9 | minor | Double-click on a node selects its neighbours when no fetcher exists; the novice expects to "open" the node and gets a verbs panel | `revision.md` 3.2 (T6); minute 2:20 | Keep it, and make the several-elements tab's first row say what happened: "16 neighbours of node 1 selected" |
| 10 | minor | The Export menu is nine rows and the novice wants one; "Copy image" is second, so she gets there, but the six rows below it are the analyst's | `revision.md` 6.8; minute 7:30 | Two groups with a divider: Image and Copy image above; the data, report, styles, bundle, methods and recipe rows below |
| 11 | minor | An encoding block's channel name ("Colour") is a hidden select ("clicking the name changes the channel"); nothing marks it as clickable, and it is the repair for finding 3 | `revision.md` 5.2 block header; screen 6 | Draw the block header's channel as a select with a chevron, as every other choosable row is drawn |
| 12 | minor | The 8 px labels under the tool buttons are below the kit's own 11 px minimum and unreadable at 100 percent on the persona's laptop; the 0 ms tooltip does the teaching instead | `revision.md` 3.1 (T3); screen 11 | 9 px at 44 px buttons (the bar grows to about 750 px, still inside the 800 px canvas at 1280), or accept that the tooltip is the label and say so |
| 13 | minor | The eye reads as "hide" in the app this frame borrows from, and here it stops paint; the novice's "show only this group" is in the row's "..." and the Members tab header | `revision.md` section 0 (the eye); minute 4:00 | Tooltip on the eye: "Stop painting (nothing is hidden)"; and a Focus glyph beside the eye on a Set and Group row, since Focus is the verb the eye is mistaken for |
| 14 | minor | The only node search is a magnifier in a header that says "Objects" | `revision.md` 1.5 table (find glyph); minute 4:30 | Placeholder "Find an object or a node"; the second section's heading "Nodes (by label or id)" |
| 15 | minor | The timeline's first door is a Findings row that can sit near the bottom of the Overview tab; a reader who does not open Findings never learns the file has a time column | `revision.md` 6.1 two doors; minute 9:00 | Also a time glyph in the status bar's counts ("2,300 nodes  41,000 edges  over 12 months") that opens the bar on click; one glyph, no new home |
| 16 | minor | Two Run buttons are visible while the parameters popover is open (the bar's and the popover's) | screen 4; `revision.md` 3.5 | The bar's Run dims while the popover is open |
| 17 | minor | Filter > By range lists Measures, but "Create" on a Measure is proposed (#192); until then the button fails on a row that is drawn live | `revision.md` 3.4 Filter By range; task 3 | While #192 is open, the bar reads "Matches 38 nodes  [Select]  Create (not yet)" with the issue in the tooltip, so the analyst learns the Values tab's "Above threshold set..." door |
| 18 | minor | Repeated runs of one algorithm share a name ("Communities (Louvain)" three times, differing only by window or parameter in the Record tab); round 1's F17 asked for an automatic suffix | `revision.md` 2.4; task 6 steps 3 and 4 | The objects API names a repeat by what differs: "Communities (2019-03 to 2019-05)", "Communities (resolution 1.5)", until renamed |
| 19 | minor | How two tree rows are multi-selected is unwritten; Compare and Combine depend on it | `revision.md` 2.4 Several objects | One line: Ctrl+click toggles, Shift+click extends, as the legend's swatches already do |
| 20 | minor | A Path armed under Focus: whether the route may leave the mask, and what the bar says when no route exists inside it, are unwritten | `revision.md` 3.3 Path; task 3 to 4 | The Path bar states its scope like the others ("among what is showing, 38 nodes") and, on no route, "No route among what is showing  [Search everything]" |

## What the two walks say about the round-2 design as a whole

Everything the owner asked for in round 2 holds up on the screens: one frame with no rail, tabs
that end the scrolling (no tab the two people opened needed a scroll), a toolbar whose every
button and flyout row is on one sheet, algorithms that state scope and cost before they run,
paths that stack as edge styles, and a timeline that masks without staling. The two personas
finish their tasks.

What remains is not structure but edges. Four of them are worth fixing before the next round:
the first paint should not depend on which of two buttons was pressed first (finding 3), a path
must be askable by name (finding 4), the import dialog needs to exist on paper with column
selects and a preview and a Replace that keeps the tree (findings 1 and 2), and Compare needs a
second mask so the design's own temporal example can be looked at side by side (finding 6). The
rest are tooltips, an order of tabs, and a row's name.
