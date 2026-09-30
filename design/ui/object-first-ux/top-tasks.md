# Top tasks of the graphty app, written as object operations

This file tests the object-first design of the graphty app against the work people actually do
with it. It lists the most frequent and most important tasks, writes each one as a sequence of
operations on objects, and marks where the model fits and where it does not. Where it does not,
the fix is stated as a change to the model (a missing kind of object, tool, property or verb),
never as a new panel, card or piece of help text.

The design being tested is `object-model.md`, `round-2/revision.md`, `round-3/revision-round-3.md`
and `round-4/revision-round-4.md` in this folder (round 4 wins where they disagree: the rail with
Objects, Data, Styles, Views and AI; the eight-control toolbar; the Actions button that opens
the command palette). What graphty-element can do today is `inventory/element-capabilities.md`.

## How the tasks were chosen

The people are the twelve personas in `design/designloom/personas/` and the twenty-five
workflows in `design/designloom/workflows/`, summarised in `inventory/app-today-and-personas.md`.
They are used for four things only: to rank tasks, to pick the words, to pick the defaults, and
to check the design. They do not add features.

The reader the ranking is for is the **weekly analyst**: someone who knows the everyday tasks,
opens the app every week, and has used Gephi or NetworkX. Five of the twelve personas are weekly
(Analyst Alex, the marketing, supply-chain and genomics analysts, the bioinformatics
researcher); four of the daily ones (fraud, intelligence, and the two experts) do the same
everyday tasks more often. A task ranks high when many workflows need it and a session cannot
end well without it.

Novices are served only by what makes the app learnable (undo, good defaults, tooltips, the
palette, samples, an explanation on request, docs). Experts are served by keys, the palette and
recipes. Nothing below is justified by "it helps new users".

## The grammar

Each step is written `Surface: verb -> result`. The surface is where the reader acts: Toolbar,
a tool's flyout, the secondary bar (the one-line bar above the toolbar while a tool is armed),
Canvas, Tree (the Objects panel), a rail panel (Data, Styles, Views), Inspector (with the kind
and tab it shows), Status bar, File menu, Palette, or a Dialog. The result is an object (Dataset,
Set, Group, Grouping, Measure, View), a selection of elements, or "no new object" when the step
only reads. Object names are the plain names the design should give them (see Vocabulary).

## 1. The ranked tasks

| # | Task | Why it ranks here |
|---|---|---|
| 1 | Load a dataset and read its overview | every session starts here; First Exploration, Data Import and Validation, and every persona's first five minutes |
| 2 | Find a node by name and read about it | several times a session; Visual Exploration, Path Investigation, Hub Investigation; the fraud and intelligence analysts start from a named account or person |
| 3 | Rank nodes and read the top of the list | Analyst Alex's first five minutes; Iterative Analysis, Influencer Identification, Drug Target Discovery, Hub Gene Ranking |
| 4 | Find communities and read them | Community Analysis, Cluster and Annotate, Influencer Identification; the most common second algorithm |
| 5 | Colour or size nodes by a column or a result | Gene List to Network (log fold change on red-blue), Findings Communication; nearly every figure |
| 6 | Filter to what matters and hide the rest | Visual Exploration ("filter out the uninteresting"), Threat Hunting, Anomaly Detection, Enrichment Map |
| 7 | Turn the top of a ranking into a set and highlight it | Hub Gene Ranking (top-10 lists), Influencer Identification, Drug Target Discovery |
| 8 | Export a figure with its legend | Findings Communication, Gene List to Network ("a figure with a legend by Friday"), Reproducible Publication |
| 9 | Export the numbers | Analyst Alex's stated goal ("export metrics"), Drug Target Discovery, Influencer Identification, Recommendation |
| 10 | Save the session and reopen it | Reproducible Publication; Alex's frustration "no way to save analysis patterns"; every multi-day case |
| 11 | Trace a path between two nodes | Path Investigation, Fraud Ring, Criminal Network; daily for fraud and intelligence |
| 12 | Look at the neighbourhood around a node | Fraud Ring (1 to 2 hops from the alert), Hub Investigation, Criminal Network |
| 13 | Compare two results | Iterative Analysis ("compare results to validate"), Hub Gene Ranking, Influencer Identification (several centralities) |
| 14 | Combine sets (both, either, one but not the other) | Hub Gene Ranking (intersect top-10 lists), Condition Comparison |
| 15 | Re-run the same analysis on this week's data | the weekly rhythm itself; Alex's "use specific workflows repeatedly" and "lack of workflow templates" |
| 16 | Watch the network change over time | Network Evolution, Fraud Ring (timeline), Hub Investigation (temporal growth); only for data with a time column |
| 17 | Present or share the findings | Findings Communication, Criminal Network (briefings), Reproducible Publication |

## 2. Each task as object operations

**1. Load a dataset and read its overview**
1. Data panel: Open a file... -> the operating system's file picker
2. Dialog (Import): Import, with the detected roles -> Dataset 'Email network'
3. Inspector (Dataset, Overview): read counts, parts, direction -> no new object

Steps 3. Surfaces: Data panel, Import dialog, Inspector. Outside the grammar: the Import dialog.
**Fits with friction.** The dialog exists because the source and its column roles have no home
on the Dataset after the load; see gap A.

**2. Find a node by name and read about it**
1. Tree: Ctrl+F, type "Alice" -> a list of matching nodes
2. Tree (find results): Enter -> selection of 1 node, camera framed on it
3. Inspector (Node, About): read attributes, values, sets it belongs to -> no new object
4. Inspector (Node, About): "Connected to 17 >" -> the node's Links tab

Steps 3 to 4. Surfaces: Tree, Canvas, Inspector. Outside the grammar: nothing. **Fits.** Needs
the element's text search (#149); the palette's Nodes section is the same search.

**3. Rank nodes and read the top of the list**
1. Toolbar: Rank > Influence (a flyout row runs at once) -> Measure 'Influence', painted
2. Inspector (Measure, Values): read the top 10 and the histogram -> no new object
3. Inspector (Measure, Values): click row 1 -> selection of 1 node

Steps 2 to 3. Surfaces: Toolbar, Inspector. Outside the grammar: nothing. **Fits.** A click on
the tool's face instead of a flyout row arms it and needs Run in the secondary bar: one more click.

**4. Find communities and read them**
1. Toolbar: Groups (face: Communities) -> tool armed; secondary bar shows scope and cost
2. Secondary bar: Run -> Grouping 'Communities' with Groups 'Group 1' to 'Group 6', coloured
3. Tree: double-click 'Group 3', type "Sales team" -> Group renamed
4. Inspector (Group, Members): read the members and the profile -> no new object

Steps 4. Surfaces: Toolbar, secondary bar, Tree, Inspector. Outside the grammar: nothing.
**Fits.** The profile ("mostly department 7") is element work (#193); names that follow a group
across re-runs are #191.

**5. Colour or size nodes by a column or a result**
1. Data panel (Attributes): "..." on 'logFC' > Colour by -> Measure 'logFC', painted with a ramp
2. Inspector (Measure 'logFC', Style): Palette > Red-blue; Midpoint 0 -> the Measure's style
3. Inspector (Measure 'logFC', Style): Missing > grey -> the Measure's style

For a result instead of a column, step 1 is task 3's step 1, and "Size" is NODES "+" > Size on
the same Style tab. Steps 3. Surfaces: Data panel, Inspector. Outside the grammar: nothing.
**Fits.** A column and a computed result become the same kind of object and are styled the same way.

**6. Filter to what matters and hide the rest**
1. Toolbar: Filter > By range -> tool armed, the popover with the attribute's histogram
2. Popover: 'amount', Min 1000 -> live count "212 of 1,204 nodes"
3. Secondary bar: Create v > Create and focus -> Set 'amount 1000 or more', everything else hidden
4. Status bar: Exit -> everything shown again (the Set stays)

Steps 3 to 4. Surfaces: Toolbar, popover, secondary bar, Status bar. Outside the grammar:
nothing. **Fits.** The friction is a default, not the model: the secondary bar's first button is
Create (paint) while the reader who filters wants to hide; see Defaults. Filtering on a result
rather than a column needs "Create on a result" (#192).

**7. Turn the top of a ranking into a set and highlight it**
1. Inspector (Measure 'Influence', Values): TOP "+" > Top 10 set -> Set 'Top 10 by Influence', linked, placed above the Measure, outlined in the next highlight colour
2. Inspector (Set, Style): Colour > orange -> the Set's style (optional; the default already shows it)

Steps 1 to 2. Surfaces: Inspector. Outside the grammar: nothing. **Fits.** The longer route
(select the top 10 rows, then Make set) makes a fixed list that does not follow a re-run; the
linked Top N is the one to put first.

**8. Export a figure with its legend**
1. Right header: Export > Export image... -> the Export sheet replaces the inspector
2. Export sheet (Image): Preset Print, Legend in picture on -> no new object
3. Export sheet: Export -> a PNG file

Steps 3. Surfaces: right header, Export sheet. Outside the grammar: the Export sheet, a
temporary mode over the inspector, whose settings are lost after the export. **Fits with
friction.** Next week's identical figure repeats every setting; see gap D. The legend in the
picture is element work (#292).

**9. Export the numbers**
1. Tree: right-click 'Influence' > Export... -> a CSV of the ranked list
   (or: Inspector (Measure, Record): Export -> the same file; Record is the fourth tab)
2. Right header: Export > Export data..., Include object columns -> one CSV with a column per Measure and Grouping

Steps 1 to 2. Surfaces: Tree, Inspector, right header, a dialog tab. Outside the grammar: the
Export data options. **Fits with friction.** Exporting "these three measures as one table" is
an option in a dialog instead of a verb on the three selected objects; see gap E. Result and
data exporters are element work (#178; graph-io has the writers).

**10. Save the session and reopen it**
1. File menu: Save project (Ctrl+S) -> project file 'case-42.graphty' (a name prompt the first time)
2. File menu: Open recent > case-42.graphty -> the Dataset and its whole tree, restored

Steps 2. Surfaces: File menu. Outside the grammar: the first-save name prompt, which every
application has. **Fits.** The project file is element work (#301) and its format is a one-way
door the owner must confirm.

**11. Trace a path between two nodes**
1. Toolbar: Path (P) -> tool armed, "Pick the start node"
2. Canvas: click 'Alice' -> start set
3. Canvas: click 'Bob' -> Set 'Path: Alice -> Bob' (edges coloured, endpoints outlined)
4. Inspector (Set, Members): read hops and the nodes in between -> no new object

Steps 4. Surfaces: Toolbar, Canvas, Inspector. Outside the grammar: nothing. **Fits.** When an
end is not on screen, the secondary bar takes a typed name. Alternative routes (All routes, #329)
come back as one Set of their union, so a single route cannot be hidden, coloured or compared;
see gap F.

**12. Look at the neighbourhood around a node**
1. Canvas: click 'Account 812' -> selection of 1 node
2. Toolbar: Filter > Around a node (E) -> tool armed, seeded with the selection
3. Secondary bar: 2 steps, Create -> Set 'Around Account 812'
4. Inspector (Set, Members): Focus -> everything else hidden

Steps 4. Surfaces: Canvas, Toolbar, secondary bar, Inspector. Outside the grammar: nothing.
**Fits.** A quick look without a new object is right-click > Select neighbours.

**13. Compare two results**
1. Toolbar: Rank > Several..., tick Influence and Brokers, Create -> Measures 'Influence' and 'Brokers' (the second created with its eye off)
2. Tree: Ctrl+click both -> two objects selected
3. Inspector (2 objects): read the agreement line -> no new object
4. Inspector (2 objects): Difference -> Measure 'Influence minus Brokers', linked
5. (for a picture) Inspector (2 objects): Compare -> a second canvas beside the first

Steps 4 to 5. Surfaces: Toolbar, popover, Tree, Inspector, and in round 3 a floating scatter
panel. Outside the grammar: the scatter panel and the second canvas. **Fits with friction.**
The scatter panel is a surface with no object behind it; see gap C. The second canvas is element
work (#186).

**14. Combine sets**
1. Inspector (Measure 'Influence', Values): Top 10 set -> Set 'Top 10 by Influence'
2. Inspector (Measure 'Brokers', Values): Top 10 set -> Set 'Top 10 by Brokers'
3. Tree: Ctrl+click both Sets -> two objects selected
4. Inspector (2 objects, Combine): Intersect -> Set 'Top 10 by Influence and Top 10 by Brokers', linked

Steps 4. Surfaces: Inspector, Tree. Outside the grammar: nothing. **Fits.**

**15. Re-run the same analysis on this week's data**
1. Data panel (dataset row "..."): Replace... -> Dialog (Import, Into = Replace)
2. Dialog: Import -> Dataset re-read from 'email-week-39.csv'; cheap objects re-run, expensive ones marked out of date
3. Status bar: "3 out of date [Re-run all]" -> every object current

Or, when the objects are in another session: File menu: Run a recipe... -> Dialog (checks each
step against the new data) -> the tree rebuilt. Steps 3. Surfaces: Data panel, Import dialog,
Status bar (or File menu and the recipe dialog). Outside the grammar: two dialogs, and two
different mechanisms for one intent. **Fits with friction.** Round 4 does not say whether
Replace keeps the objects (Reload does); see gap A.

**16. Watch the network change over time**
1. Toolbar: Time (T) -> time mode on, window = the full range, the transport bar under the canvas
2. Transport bar: drag the window to March to May -> the mask changes; no object
3. Transport bar: Play -> the window steps month by month
4. (a measure per window) Transport gear: Re-run objects while playing -> each object re-runs at each step, or an "Over time" series in the table's Findings tab

Steps 3 to 4. Surfaces: Toolbar, transport bar, its gear, the table dock. Outside the grammar:
a mode, and a window that is not an object: it cannot be named, kept, scoped to, styled or
compared, and the design needs a special rule that a window never makes anything out of date.
**Does not fit** for the analysis half of the task (a measure per period, comparing two
periods); watching alone fits with friction. See gap B.

**17. Present or share the findings**
1. Views panel: "+" -> View 'Hub close-up' (camera, mode and what is showing)
2. Canvas: right-click 'Alice' > Note... -> a note in Alice's Notes section
3. Views panel: Present from the start -> Present mode, stepping through the Views
4. Right header: Export > Export report... -> Dialog (a checklist of tree rows) -> a report file
5. File menu: Save project -> a file to send

Steps 3 to 5. Surfaces: Views panel, Canvas, right header, report dialog, File menu. Outside the
grammar: Present mode (acceptable: it is Figma's) and the report checklist, which re-asks which
objects to include. **Fits with friction**; see gap E.

**Verdicts: 10 fit (2, 3, 4, 5, 6, 7, 10, 11, 12, 14), 6 fit with friction (1, 8, 9, 13, 15,
17), 1 does not fit (16).**

## 3. Model gaps

Each gap is the smallest model change that makes its tasks fit.

**A. The Dataset has no Source property** (tasks 1 and 15). The file, URL or query, the column
roles and the import rules exist only inside the Import dialog; after the load they are
scattered over the Data panel and an "Import options" dialog. Change: the Dataset gets a
Source property group (location, roles, rules), shown in its inspector like any other object's
Define tab. Opening or dropping a file creates the Dataset from detected defaults at once, and
the dialog opens only when detection is unsure. Replacing the file is an edit of Source: the
tree is kept and the ordinary cost rule re-runs cheap objects and marks expensive ones out of
date. Task 15 becomes two steps with no dialog; the recipe stays for applying steps to a
different session.

**B. A time window is a mask, not an object** (task 16, and task 13 when the two results are two
periods). Change: a **period** becomes a kind of Set, made by Filter > By time, whose Define is
From, To and Step. The Time button is that tool with Focus on; the transport bar edits the
focused period's From and To. Everything else follows from rules that already exist: Rank or
Groups run while focused nest under the period and are computed within it; when the transport
steps, the nested objects re-run or go out of date by the cost rule, so "Re-run objects while
playing" and the special "a window never makes anything out of date" rule both go; two periods
are two Sets that Combine and Compare like any others; a View keeps the focused period.

**C. Comparing two Measures has no object** (task 13). Round 3 draws a floating scatter panel.
Change: "Compare" on two selected Measures creates one linked Measure with three fields (the
first, the second, the difference). Its Values tab draws the scatter where a single Measure
draws its histogram; its Top N set is the biggest movers; its Findings row is the rank
agreement. The scatter panel goes.

**D. A figure has no home** (task 8). The Export sheet's settings (size, preset, legend in the
picture, background, framing) vanish after each export. Change: those settings become
properties of a View, and "Export image" is a verb on a View (the current, unsaved view when
none is selected). Next week's figure is: select the View, Export. The Export sheet shrinks to
the View's Image properties.

**E. Export is not a verb on a selection of objects** (tasks 9 and 17). Change: Export acts on
whatever objects are selected in the tree. One Measure gives its ranked list; several Measures
and Groupings give one node table with a column each; several rows of any kind can export a
report in tree order. The "Include object columns" option and the report checklist dialog go,
because the selection is the checklist.

**F. All routes returns one Set** (task 11). Change: All routes returns a Grouping with one Group
per route, so each route can be hidden, coloured, renamed and compared, and Tab stepping becomes
selecting the next Group.

## 4. Prominence

**The rule.** A verb gets one-click placement (the toolbar for creation, the inspector's header
or first tab for a verb on an object) when it is in one of the top ten tasks and the weekly
analyst uses it in most sessions. A verb used in tasks 11 to 17, or once per session or project,
lives in a menu (the file menu, a panel's "+" or "...", the right-click menu) and in the palette.
A verb in no top task lives in the palette and its object's "..." only, with no button of its own.

| Placement | Verbs |
|---|---|
| Toolbar, one click | Select; Filter; Groups; Rank; Path; Time (only when the data has a time column); Actions (the palette's door) |
| Inspector, one click | rename; eye; Re-run and Run; Top N set (Values tab); Focus and Exit (Members tab, status bar); Colour chip on Style; the Combine buttons on two or more Sets; Difference and Compare on two Measures; Export on the selected objects (move from the Record tab into the header's "...", right-click and the palette); Locate on a node |
| Menus and palette | Open, Open recent, Save, Save as, Replace data, Run a recipe, Export recipe (file menu); Save view, Present (Views panel); Export image, Export report; Several...; Note...; Select neighbours, Path from here (right-click on a node); Colour by, Size by, Filter by (a column's "...") |
| Palette and "..." only | Duplicate, Lock, Approximate instead, Copy as methods text, Copy as command, Save style, Apply style, Sweep, Pattern, By id list, Lasso, Follow, Merge nodes, Remove node, What breaks if removed, Re-run all, Unfreeze |

Two findings from the rule. **Structure does not earn its toolbar slot**: none of the seventeen
tasks uses it. Its rows go to the flyout of the object each makes (Separate pieces and Densest
shells to Groups, How far from everything to Rank, the two spanning networks to Path; Distances
and Likely missing links to the Dataset's Findings "+" and the palette), which is the
result-shape rule round 1 used. The toolbar drops to seven controls. **The view-mode button** (2D,
3D, VR, AR) is in no top task either; it stays only because the owner asked for it in round 4.
By the rule it would live in the Views panel and on the key 5.

## 5. Defaults

The common case of every creation tool should need no settings.

| Tool or "+" | Default |
|---|---|
| Open or drop a file | roles detected (id, source and target, label = a column named name or label, weight = a numeric edge column named weight, time = the first date column); direction from the file; the element's recommended layout; nothing computed unasked |
| Filter | face By range; attribute = the Measure selected in the tree, else the first numeric column; the band preset to the top 10 percent so the count is live at once; the first button **Create and focus**, because a reader who filters wants to hide (Visual Exploration, Threat Hunting, Anomaly Detection) |
| Around a node | 1 step, all directions, seeded with the selection |
| Path | Shortest route; weighted when the Dataset has a weight role; direction as loaded; edges in the next highlight colour at width 3, endpoints outlined |
| Groups | Communities (Louvain), resolution 1.0, a fixed seed so a re-run gives the same groups; weights when there is a weight role; the largest 8 groups coloured, the rest one "Other"; Okabe-Ito colours, or Shape when colour is already taken above |
| Rank | face Connections on a fresh session, then the last used; the first free channel (Colour, then Size); a sequential palette with outliers clamped at the 2nd and 98th percentile, because centralities are heavy-tailed |
| Rank > Several... | Connections, Brokers, Reach and Influence ticked (the four the analyst, marketing and genomics workflows name) |
| Top N set | N = 10, linked to its Measure, outlined in the next highlight colour |
| Combine | the name written from the inputs ("A and B", "A or B", "A not B") |
| Time (period) | From and To = the full range; Step = the calendar unit that gives 12 to 50 steps |
| Views "+" | camera, mode and what is showing; named after the focused Set, else "View 2" |
| Style NODES "+" | Colour = the next unused highlight colour; Size = 1.5 times; Outline = 2 px |
| Style EDGES "+" | Width 3; Colour = the Set's colour |
| Measure Style "+" | Size, 0.8 to 2.2 times |
| Export image | PNG at 2x, legend in the picture, the current framing, background kept |
| Export data | CSV, one row per node, a column per visible Measure and Grouping |
| Save project | data embedded when small, linked above a size limit set in Settings |

## 6. Vocabulary

The words the tasks use, in the reader's language: **Dataset**, **Set**, **Group**,
**Grouping**, **Measure**, **View**, **Note**; tools **Filter**, **Around a node**, **Path**,
**Groups**, **Rank**, **Time**; verbs **Focus**, **Top 10 set**, **Combine**, **Difference**,
**Compare**, **Export**, **Present**, **Re-run**.

Places where the current design uses a technical or inconsistent word:

| Where | Today | Use instead | Why |
|---|---|---|---|
| tree row names | "Communities (Louvain)", "Bridges (Betweenness)" | "Communities", "Influence"; the method in Made by and the tooltip; a second run is "Communities 2" or named by its changed parameter | the reader named the question, not the algorithm |
| Rank flyout | "Bridges" for betweenness | "Brokers" | "bridge" is already the graph-theory word for a cut edge (Structure's "Bridge edges"); the intelligence and marketing personas say "brokers" and "brokerage" |
| components | "Separate pieces", "Largest connected part", "Parts 1" | "Parts" everywhere: "Parts", "Largest part", "Parts 1" | three words for one thing |
| neighbours | "Around a node" (tool), "Links" (node tab), "Connected to", "Select neighbours" | "Neighbours" for the node tab and the right-click; "Around a node" for the tool only | one word for the thing, one phrase for the verb |
| states | stale, frozen, waiting | "out of date", "fixed", "not run" | plain words for the three states the reader must act on |
| last tab of every object | Record | Made by | says what it holds; 7 characters, fits the tab width |
| Combine buttons | Union, Intersect, Subtract, Exclude | tooltips "In either", "In both", "In the first only", "In one but not both"; icons unchanged | the Figma words are shape words, not set words |
| Groups tab | "Modularity 0.36" | "Separation: clear (modularity 0.36)" | the reading first, the number second |
| appearance | Style, Look, Saved style | keep all three, but never "Look" for a node's paint report (call that section "Painted by") | "Look" is also the whole-graph preset |
