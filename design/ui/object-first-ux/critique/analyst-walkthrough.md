# The analyst walks through the object-first model

A critique of `design/ui/object-first-ux/object-model.md` and its mocks
(`design/ui/object-first-ux/mocks/screen-1.png` to `screen-8.png`), done by playing one persona
through one real analysis, step by step, and noting every place the model is awkward, slower
than Gephi or Tableau, or silent about what it will do. Nothing here changes the app; it is a
design check. The feature-fit files under `design/ui/object-first-ux/feature-fit/` already say
where each capability lives; this file asks whether a person can get through a week's work.

## 0. Terms

The model's words, restated so this file stands alone. A term is defined once, here or where
it first appears.

- **Tree**: the left panel's list of objects (screen 3). Its order is the paint order: a row
  nearer the top paints over a row below it, per visual channel (colour, size, outline...).
- **Object**: a row in the tree. A **Set** (a list of nodes and edges: a filter, a path, a
  neighbourhood, a promoted selection), a **Measure** (one number per node: a centrality, a
  numeric column), a **Grouping** (one label per node: communities, components) with one
  **Group** row per label, and the **Dataset** at the root.
- **Inspector**: the right panel. It shows the selected object's sections (Definition, Members
  or Values, Fill, Made by, Export, Notes) or, with nothing selected, the Dataset.
- **Fill**: an object's appearance, stored as a style layer on that object. A Set's Fill is one
  colour; a Measure's Fill is a colour ramp or a size scale.
- **Tool**: a toolbar verb that creates an object: Filter (F), Neighbours (E), Path (P),
  Groups (G), Rank (R). A tool's **flyout** is the dark menu behind its chevron listing its
  variants; its **popover** is the small light panel with fields (screen 7); the **secondary
  bar** is the one-line dark prompt above the toolbar while the tool waits for a canvas click
  (screen 5).
- **Mask** (what is showing): the one visibility filter the element holds. **Focus** sets it to
  one object's members and hides everything else; while Focus is on, every tool computes
  within that object and nests its result under it.
- **Nested** row: computed within its parent. **Linked** row: its definition points at another
  object (Top 10 by Bridges points at Bridges); it sits immediately above its first input.
- **State**: current, computing, waiting (the cost gate said it would take too long to start
  unasked), stale (data or definition changed; the old values keep painting with the name
  dimmed), failed, frozen (an input was deleted; members kept as a fixed list).
- **Cost gate**: the element's refusal to start a run unasked above a time budget; the row is
  created in the waiting state with a "Run (about 4 min)" button.
- **Stale rule**: after a data change, every object whose re-run estimate is under one second
  re-runs at once; every other object turns stale.
- **Made by**: the collapsed inspector section holding the record of a run: method,
  parameters, scope, engine, caveats, time.

Gephi and Tableau are the yardsticks because the persona names them: Analyst Alex
(`design/designloom/personas/analyst-alex.yaml`) "has used tools like Gephi and NetworkX",
and Tableau is the reference for data-to-appearance mapping in the comparison document
(`tmp/ux-review/graphty-vs-figma-ux.md`, "Where graphty necessarily differs"). Click counts
below are for the model as written, not for the app as built.

## 1. The analyst and the week

Alex is an intermediate data analyst who works with graphs weekly, starts from a question,
picks an algorithm by the kind of insight he needs, compares results to validate them, tunes
parameters, and exports the numbers. His four stated frustrations are all about speed and
repetition: too many clicks, no templates, no saved patterns, slow access to frequent
operations. His workflows include First Exploration (W01), Iterative Analysis (W03),
Community Analysis (W04), Path Investigation (W05), Anomaly Detection (W12), Findings
Communication (W15), Hub Investigation (W17), Data Import (W18) and Network Evolution (W19).

This week's question: "Which people in the sales organisation bridge otherwise separate
teams, and did that change after the reorganisation?" His data: `contacts.csv`, an export
from a messaging tool, 2,300 people and 41,000 message pairs, with the columns
`from_person, to_person, msgs, dept_from, dept_to`. Next week he will get the same export
again for the post-reorganisation period.

Seven tasks, in the order he would do them:

1. Import the CSV, whose columns are not the ones the element expects.
2. Run two algorithms: communities, then betweenness.
3. Combine a filter with a group: heavy senders inside one community.
4. Compare two runs: Louvain at two resolutions.
5. Restyle by a measure, and by an imported column.
6. Handle a re-run on changed data: add the post-reorganisation edges.
7. Save and share.

Each section: what Alex does in the model, where it stalls, what Gephi or Tableau would have
taken, and the findings. Finding ids (F1, F2...) are local to this file and collected in
section 9.

## 2. Task 1: import a CSV with the wrong columns

### What happens

Alex drops `contacts.csv` on the Welcome sheet (screen 1). The Import dialog (the model's one
dialog, `object-model.md` section 9 "Import") opens with the file chosen and Format [Auto].
The element's CSV detector (`graphty-element/src/data/csv-variant-detection.ts`) looks at the
header row for `source/target`, `src/dst` or `from/to`; `from_person, to_person` matches
none, so the file is classed "generic" and handed over as records. The element refuses the
batch and names the columns the file does carry (`CSVDataSource.ts`, `namesNoEndpointColumn`).
Per feature-fit 1 row 23, on a first load the dialog stays open with the sentence in the drop
zone.

Now the mapping rows appear ("shown only when detection is unsure"). Alex must fill Edge
Start Field and Edge End Field. In the element's catalogue these are `OptionDescriptor`s of
type `string` (`graphty-element/src/catalog/formats.ts`, `endpointOptions`), so the dialog
draws them as text fields. Alex types `from_person` and `to_person`. He also wants `msgs` as
the edge weight: the known-field mapping row "weight" is another text field. He types
`msgs`. Load. The Dataset row appears with 2,300 nodes and 41,000 edges; the Summary reads
"Weighted Yes", Direction "Undirected (auto)".

Direction is wrong: messages have a direction. He changes Direction to Directed in the
Summary row. Nothing is computed yet, so nothing goes stale. Good.

### Where it stalls

- **Typing column names into a text field is a 2005 experience.** Gephi's import wizard and
  Tableau's data pane both show the file's columns as a dropdown. The model cannot, because
  the app must not read the file itself and the element's option descriptors carry no list
  of the headers it saw. The element has to return the header row (a `peek` or the refusal
  carrying the column names as data, not only as a sentence) so the dialog can draw selects.
  Three fields typed by hand, with a typo costing a second failed load. (F4)
- **No preview.** W18 phase 4 is "see a sample of data before committing". The model's dialog
  has no row preview. Gephi's import report and Tableau's data grid both show the first rows.
  With 41,000 lines Alex cannot tell from the file name whether `msgs` is a count or a
  boolean. Needs the same element `peek`. (F4)
- **The second kind of wrong column is silent.** Suppose the file had been spelled
  `source, target, strength`. It loads cleanly, Weighted reads "No", and Alex may not look at
  the Summary before pressing R. Then Bridges runs unweighted. The Made by caveat would say
  "weights: none" if he opened it. In Gephi the Data Laboratory shows the column and he
  re-types it in place. In the model, changing the weight mapping is "Import options...", a
  re-import, and a re-import is a Replace that deletes the tree (feature-fit 1 note B). So a
  mapping mistake noticed after the first run costs every object he has made. (F1)

The fix for F1 is not a dialog change. A role that does not change identity (weight, label,
time, type) is an attribute role, and the model already has "Set as time" and "Set as type"
on an Attributes row's "..." menu (`object-model.md` 4.1). "Set as weight" and "Set as label"
belong on the same menu, applying the stale rule (every object that read weights turns
stale) instead of a re-import. Only id coercion and the endpoint columns truly need a
re-import, because they change which records are one node.

### Against Gephi

Gephi: open, wizard shows columns with dropdowns and the first rows, tick "weight", finish:
about the same click count, no typing, and a mistake is fixed in the Data Laboratory. The
model is slower by three typed fields and catastrophically worse on a late-noticed mistake.

## 3. Task 2: run two algorithms

### What happens

Alex presses G. The Groups tool's face is its last-used variant; on a fresh install that is
Communities (Louvain). The row "Communities (Louvain)" appears at the top of the tree in the
computing state, finishes in a few seconds on 2,300 nodes, expands to 14 Group rows with
colour chips, and the canvas is coloured. He presses R; the Rank face is Connections
(Degree), which is not what he wants, so he opens the chevron and picks Bridges
(Betweenness). The flyout row reads "about 40 s" from the estimate: under the gate, so the
row is created computing with a progress ring. It completes; its default Fill is Size,
because Colour is already written by Communities (screen 3's rule).

He opens the Bridges row: Values shows Min, Max, Mean, Median, a histogram, and the top 10
by rank. Made by (collapsed) records "Betweenness, 2,300 nodes, 38 s, exact" and, once
#313 lands, "weighted by msgs, directed".

### Where it stalls

- **Whether the weight was used is invisible until #313.** W23's reproducibility criterion
  is "weight attribute, direction and parameters for each run recorded". Today betweenness
  has no weight or direction option in the catalogue (feature-fit 3, row Bridges, gap #313),
  so the Definition has no Weights switch to show and Made by cannot say what it used. On
  this dataset, which has a weight column, the number Alex exports may be computed on an
  unweighted graph with nothing on screen saying so. This is an element gap, but it lands on
  the analyst's first result. (F11)
- **Every Measure paints.** Alex wanted a number, not a picture; Bridges resized every node.
  On the second and third rankings (Task 4's follow-up, and W23's "compute several
  rankings") the picture becomes Colour from one, Size from another, Outline from a third
  (feature-fit 5 note A4), and the fourth gets a "no fill" chip. In Gephi a statistic adds a
  column and paints nothing; painting is a separate deliberate act in Appearance. The model's
  answer, click the eye on each row, is one click per Measure plus the visual noise until he
  does. (F6)
- **Naming.** The row says "Bridges (Betweenness)". Fine for Alex, who knows both words. But
  Rank's face is the last variant used, so the first click on R runs the wrong thing for a
  reader who has not opened the flyout, and Ctrl+Z is the recovery. Minor. (F12)

### Against Gephi

Gephi: Statistics panel, Run beside Modularity, a parameter dialog, OK; Run beside
Betweenness, a dialog, OK. Four clicks per statistic, nothing painted, parameters asked up
front. The model is two clicks per run and paints at once, which is faster for the
picture and slower for the numbers.

## 4. Task 3: combine a filter with a group

Alex wants "people in Group 4 who send more than 200 messages" (Group 4 is the community
that looks like the old sales-ops team). Two honest routes in the model.

### Route A: Focus, then Filter

Select the Group 4 row; overflow "..." > Focus on this. The status bar reads "Focused on
Group 4: 190 of 2,300 [Exit]". Press F, chevron, By range, Attribute [msgs] Min [200], the
popover prints "Matches 23 nodes", Create. A Set "msgs > 200" appears nested under Group 4.
Exit focus. Six clicks and two typed values.

Two things are wrong with the result:

- **What did "msgs > 200" read?** `msgs` is an edge attribute; the filter Alex meant is "sum
  of outgoing message counts per person", which is a degree-like number, not an attribute of
  a node. The By range popover lists node attributes; `msgs` is not one. He needs By
  connections (a degree band) instead, and then the question is whether "connections" counts
  edges to everyone or only edges inside the Focus. The model says a tool "looks at the
  elements inside the mask and nothing else" (section 3, "Scope is what is showing"). Read
  literally, degree within Focus is degree on the induced subgraph: 23 people with many
  contacts inside Group 4, not 23 heavy senders overall. That is a different answer, and
  neither the popover nor the nested row's Definition says which one it computed. For a run
  (betweenness within a group) induced is what "computed within" means and is right; for a
  filter over a per-node number, induced is a trap. The model must state the rule and print
  it in the popover ("Connections inside Group 4" or "Connections in the whole graph"). (F8)
- **He cannot see the rest.** Focus hides everything but Group 4 while he composes the
  filter, which is the point of Focus, but Alex wanted to keep the picture and just mark the
  23. Exit focus restores it; one more click, and the nested row stays nested, which is
  correct.

### Route B: two rows and Combine

Press F, By connections, Min [200], Create: a Set "Connections > 200" at the top of the tree
(whole graph, unambiguous). Ctrl+click Group 4's row and the new Set's row; the inspector
shows Combine; press Intersect. A linked Set appears "immediately above its first input".

- **Where does it land?** If the first input was Group 4, "immediately above Group 4" is a
  row among the Group children of Communities. The model's own rule is that nesting means
  exactly one thing, computed within the parent (section 6.1); a linked Combination sitting
  between Group 3 and Group 4 reads as a fifteenth group of Communities, and a re-run of
  Communities would presumably not touch it while every neighbour row is re-matched. The
  placement rule and the nesting rule collide whenever a Group is an input, and Groups are
  the most common input. Proposed: a linked object whose first input is a Group is placed
  above the Grouping, never inside it. (F8)
- **The rule field is the fast path and it is blocked.** The one-line answer, Filter > By rule
  with `communities == 4 and degree > 200`, needs the expression engine (#149, large). Until
  it exists the six-click routes are the only ones.

### Against Gephi

Gephi: Filters panel, drag Partition (Modularity class) into Queries, tick class 4, drag
Degree Range as a sub-filter, set 200, Filter. About seven drags and clicks, one route,
and the sub-filter semantics (global degree, evaluated after the partition) are documented.
Same speed as the model, fewer ambiguities.

## 5. Task 4: compare two runs

Alex suspects resolution 1.0 merged two teams. He wants Louvain at 1.5 beside 1.0.

### What happens

"Options come after creation" (section 3): pressing G runs Louvain with defaults. To get a
second run he selects the first row, overflow > Duplicate, edits Resolution [1.5] in the
duplicate's Definition, Enter; it re-runs at once (cheap). Now two rows both named
"Communities (Louvain)", the new one on top and covering the old one's colour on all 2,300
nodes ("Covered by Communities (Louvain) on 2,300 of 2,300" under the lower row's Fill).

To compare the pictures he clicks the top row's eye off, looks, on, looks: a blink
comparison. To compare the numbers he opens the Table dock (Shift+T): one column per
Grouping, so he can sort by one and read the other. To see which groups split he could
select Group 4 (run A) and Group 7 (run B) and press Combine > Intersect, per pair.

### Where it stalls

- **No side by side.** W03 lists comparison-view; the persona "compares algorithm results to
  validate findings". The model's only comparison surface is a View's "Compare with [View]"
  (section 4.7), which opens a second canvas on the same tree with its own camera and mask.
  Both canvases see the same eyes, so they show the same colouring. Views deliberately do
  not store eye states (feature-fit 2, 4.4). So two Groupings, or a Grouping and a Measure,
  cannot be shown at once anywhere in the model. Gephi cannot either; Cytoscape (a second
  network view) and Tableau (two sheets) can. For the persona's validation habit this is the
  largest hole in the model. Possible answers, none decided: a View property "eyes" that is
  applied visibly (feature-fit 2 says "decide as its own question"); or Compare taking two
  objects rather than two Views, showing each canvas with only that object's Fill on. (F2)
- **A wasted run.** Alex knew he wanted 1.5 before pressing G. The model ran 1.0 first,
  because a tool never asks before running. On 2,300 nodes that is a few seconds; on 50,000
  it is the difference between one wait and two, and the waiting state (over the gate) is
  the only place parameters can be set before a run. Gephi asks first. An expert (Emma) will
  hit this daily. Proposed: the flyout row's chevron-right, or Alt+click, creates the row in
  the waiting state regardless of cost, so parameters can be set first; the default stays
  run-at-once. (F5)
- **Two rows, one name.** Nothing in the tree distinguishes the two Louvain rows; Made by
  does, six clicks away. When a parameter differs from its default the name should carry it
  ("Communities (Louvain, resolution 1.5)") until renamed. (F17)
- **Which groups changed?** The re-match by overlap ("5 of 6 groups matched") exists only for
  a re-run of one object (section 5). For two independent runs there is no per-node "moved
  from Group 4 to Group 7" and no agreement number. The camera feature-fit proposes a
  "Difference" between two Measures (6-camera.md 2.5); Groupings need the same
  (a Grouping-of-changes, or a Findings row "agreement 0.81, 3 groups split"). (F2)

### Against Gephi

Gephi: Modularity, resolution 1.5, Run: a new column `modularity_class` overwrites the old
one unless renamed first, and there is no side by side either. Tableau: two sheets, one
dashboard, two colour legends, in a minute. The model is at Gephi's level, not Tableau's,
and the persona's habit is Tableau's.

## 6. Task 5: restyle by a measure, and by a column

### By a measure

Alex wants colour by Bridges (his headline) and communities as outline. Select the Bridges
row; Fill > Channel [Size v] > Colour: the ramp appears, Communities is now covered on
colour (its Fill says so, its legend block disappears, its chip dims). Select Communities;
Fill > Channel [Colour v] > Outline. Four clicks. Faster than Gephi's Appearance panel
(choose Nodes, Color, Ranking, attribute, Apply: five) and about Tableau's shelf drop. Good.

One catch: the Channel select on Bridges changes the existing paint row from Size to Colour,
so the size encoding is gone; to keep both he must press "+" and add Size back. Screen 6
shows the two-channel state, but getting there from a one-channel Measure is Channel then
"+" then Channel, and the first change silently drops the size he had. Minor. (F13)

### By an imported column

He wants colour by `dept_from`. The path: click empty canvas (the inspector shows the
Dataset), scroll past Summary, Arrangement, Showing and Canvas to Attributes (collapsed by
default, at the bottom, screen 2), expand it, hover the `dept_from` row, click its "...",
Group by. Six actions, the first four of them navigation, for the single most common thing
an analyst does with a column. A "Grouping: dept_from" row appears at the top of the tree.
Tableau: one drag to the Colour shelf. Gephi: Appearance, Partition, attribute, Apply: four.

The model does offer two shortcuts, both undrawn: the Table dock's column header "..." has
the same verbs (feature-fit 2, 2.6), and the palette can carry "Colour by dept_from" once
the palette indexes attributes. Neither is in the mocks. Proposed: move Attributes above
Canvas in the Dataset inspector and open it by default when the file has fewer than ten
columns; and put "Colour by..." / "Group by..." in the Filter flyout's neighbour, or in
Ctrl+K, so an analyst never has to find the section. (F10)

## 7. Task 6: handle a re-run on changed data

Next week's export arrives: `contacts-week2.csv`, the same columns. Alex wants the same
objects on the new data. Two cases.

### Case A: Add data (union of both weeks)

Dataset header "+" > Add data, the Import dialog with "Add to current", mapping remembered
(the model says the dialog reopens on the current values). Load. The stale rule fires: the
degree-band Set re-runs at once (cheap); Communities at 1.0 and 1.5 both re-run at once
if under a second, else turn stale; Bridges (40 s) turns stale, and with it the linked
"Top 10 by Bridges" and the label budget "Top 10 by Bridges" in the Canvas section.

### Where it stalls

- **A hybrid picture.** Communities re-ran: new groups, re-matched by overlap, new colours on
  the new nodes. Bridges did not: the sizes on screen are last week's, and the 400 new
  nodes have no size at all (Missing colour). The only signals are a dimmed name and an
  amber dot on two tree rows, and "Stale: ran on 2,300 nodes, now 2,700" in the inspector if
  he happens to select Bridges. Nothing on the canvas or in the status bar says the picture
  mixes two states. Gephi recomputes nothing and paints nothing new, so the reader knows
  everything is old; the model's partial refresh is more helpful and more dangerous. The
  status bar's computing chip has a sibling waiting to exist: "3 stale [Re-run all]".
  (F9)
- **Re-run all stale meets the cost gate.** "Re-run all stale" (Dataset overflow) re-runs
  bottom-up in tree order. Does a stale Bridges over the gate start, or wait? Section 5 says
  the gate creates waiting rows instead of asking; section 3 says a Re-run button carries
  the estimate. Undefined for the batch. It should follow the same rule as creation: rows
  over the gate go to waiting and the chip says "2 re-run, 1 waiting". (F9)
- **Group identity across the change.** Group 4's override colour and any notes follow the
  group by overlap matching, which is element work that does not exist (#191). Until then
  "groups are matched by label", and Louvain's labels are not stable across runs, so the
  orange override lands on whichever group is now labelled 4. Alex's annotation of "the
  sales-ops team" moves to a different team silently. This is the honest consequence of a
  gap, but the model should show the fallback state (a "matched by label" caveat in Made by
  and a warning glyph on overridden Groups) rather than pretend. (F9)

### Case B: Replace with week 2 only (the weekly workflow)

He wants last week's objects on this week's file alone. The model's route (feature-fit 1
note C): Share > Export recipe, then Add data > Replace (a confirmation: "Replace
'contacts' and delete its 9 objects?"), then file menu > Run a recipe. Three steps in three
menus for the one thing the persona does every week, and every step depends on unbuilt
element work: the journal and commands (#145, #337) and the objects API. Note C proposes a
"Keep the objects and re-run them on the new data" checkbox in the Replace dialog, which is
the right answer. If that checkbox ships, this is one dialog; if it is cut for scope, the
weekly workflow is three menus and a file on disk. (F3)

Gephi has no recipe at all (you redo the clicks), so the model wins once built. Tableau's
data-source replace keeps every sheet, which is exactly the "Keep the objects" checkbox.

## 8. Task 7: save and share

### What happens

Ctrl+S: Save project. The model puts it in the file menu and says it waits on the objects
API and the project file format (#301, "the one true one-way door"). Until then nothing
survives a reload: not the tree, not the Fills, not the 40-second Bridges result. Then
Share: Export image (legend in the picture needs #292), Export data (every format descriptor
is `canExport: false`), Ranked list CSV on the Bridges row (needs a result exporter, #178),
Copy methods text (needs serialisers, #177), Export report (#187).

### Where it stalls

- **The persona's goal is reproducibility and the model cannot yet keep a session.** This is
  a build-order fact, not a design fault, but it decides whether Alex can use the product at
  all: a weekly analyst who loses everything on reload will not come back. The model's
  section 11 puts the objects API second in its ordering; for this persona it is first.
  (F3)
- **Drawn rows with nothing behind them.** Screen 2's Dataset inspector shows "Data [GraphML
  v] [Export]" and screen 6 shows "Ranked list [CSV v] [Export]". Neither has an exporter.
  The comparison document counted the current app's "Coming" tags as a defect; a row that is
  drawn and does nothing is the same defect without the tag. The model's own rule (feature-fit
  7, section 5: "a binding that does not exist is not listed") should apply to Export rows:
  draw the row when the exporter exists. (F15)
- **"Share" that exports.** Alex reads Share as "send a link". The camera feature-fit (6-camera
  2.9) flags the same; two-way door, noted here because it is the one filled button. (F15)

Gephi: File > Save (a .gephi file keeps everything), Export > Graph file, Data Laboratory >
Export table. All exist. Tableau: Save, Export. The model is behind both until #301 lands.

## 9. Findings

Severity: **blocker** means the model as written has no route, or its route destroys work;
**major** means the route exists but is slower than Gephi or Tableau or risks a wrong
result the reader cannot see; **minor** means friction.

| Id | Severity | What | Where |
|---|---|---|---|
| F1 | blocker | A field-role mistake (weight, label) noticed after the first run can only be fixed by a re-import, and a re-import deletes the tree. Gephi fixes it in place. Add "Set as weight" and "Set as label" to the Attributes row menu, applying the stale rule; reserve re-import for identity changes (endpoint columns, id coercion) | `feature-fit/1-data.md` note B and rows 10, 11, 17; `object-model.md` 4.1 (Dataset overflow "Import options...", Attributes row verbs) |
| F2 | blocker | Two objects cannot be shown side by side: Compare opens two canvases on one tree with the same eyes, and Views do not store eyes. Two Groupings, or a Grouping beside a Measure, can only be blink-compared. No per-node "changed group" or agreement number between two independent runs | `object-model.md` 4.7 (Compare with), section 5 (re-match only on re-run); `feature-fit/2-selection.md` 4.4; `feature-fit/6-camera.md` 2.5 |
| F3 | major | The weekly workflow (same objects, new file) is Export recipe, Replace, Run recipe across three menus, and every step waits on #145, #337 and the objects API; Save project waits on #301. The "Keep the objects and re-run" checkbox in the Replace dialog must not be cut, and the objects API must come first in the build order for this persona | `feature-fit/1-data.md` note C and note K; `object-model.md` section 11 ordering |
| F4 | major | The Import dialog's mapping rows are typed text fields (the catalogue's endpoint options are `type: "string"`) and there is no row preview. Gephi and Tableau both show the file's columns as dropdowns and the first rows. The element must return the header row and a sample so the dialog can draw selects and a preview | `object-model.md` section 9 "Import"; `graphty-element/src/catalog/formats.ts` `endpointOptions`; W18 phase 4 |
| F5 | major | "Options come after creation" wastes a run when the analyst knows the parameter, and the only pre-run parameter surface is the waiting state above the cost gate. Gephi asks first. Offer a way to create a row waiting regardless of cost (a flyout row's chevron-right or Alt+click) so parameters can be set before the first run | `object-model.md` section 3 ("Options come after creation"), section 5 (waiting state) |
| F6 | major | Every Measure paints by default, so a several-rankings comparison (W23) produces Colour, Size, Outline and then "no fill" chips, one eye click per row to quiet. Gephi statistics paint nothing. Rank > Several... should create members after the first with the eye off (already proposed); a single Rank should still paint | `object-model.md` 6.2 (default Fill avoids taken channels); `feature-fit/5-styling.md` notes A3, A4; `feature-fit/3-algorithms.md` note 3 |
| F7 | major | A threshold on a result ("betweenness > 0.05") lives only in the Measure's Values "+" (Top N set, Above threshold set); the Filter tool's By range lists attributes and cannot see Measures. Two doors for one intent, and the analyst looks in Filter. The By range attribute select should include every Measure in the tree | `object-model.md` 4.3 Values header "+", section 3 Filter flyout; `feature-fit/2-selection.md` 2.3 row "Filter by a centrality threshold" |
| F8 | major | Combining a Group with a filter: (a) the Focus route computes a per-node number (degree) within the mask, so "connections > 200 inside Group 4" silently means the induced subgraph, and neither the popover nor the Definition says whether a filter reads global or induced values; (b) the Combine route places the linked Set "immediately above its first input", which for a Group is a row among the Grouping's children, where nesting is supposed to mean "computed within". The fast path (By rule) is blocked on #149 | `object-model.md` section 3 ("Scope is what is showing"), section 2.4 (linked placement), section 6.1 (nesting means one thing); `feature-fit/2-selection.md` 2.3, 2.4 |
| F9 | major | After Add data the stale rule re-runs cheap objects and leaves expensive ones stale, so the canvas mixes new communities with last week's sizes and new nodes with no value; the only signals are dimmed names in the tree. Add a status-bar stale chip ("3 stale [Re-run all]") and a canvas-level caveat. Also undefined: whether "Re-run all stale" starts runs over the cost gate; and until #191 group overrides and notes follow labels, not groups, which should be shown as a caveat rather than hidden | `object-model.md` section 5 (stale rule, propagation, "Re-run all stale"); `feature-fit/1-data.md` row 13; `feature-fit/3-algorithms.md` "Stale note" |
| F10 | major | Colour or group by an imported column takes six actions through the Attributes section, collapsed by default at the bottom of the Dataset inspector; Tableau is one drag, Gephi four clicks. Move Attributes above Canvas, open it by default for small schemas, and put the column verbs in Ctrl+K and the table column menu (both already planned, neither drawn) | `object-model.md` 4.1 (section order, Attributes collapsed); `mocks/screens.md` screen 2 and 7; `feature-fit/2-selection.md` 2.6 |
| F11 | major | On weighted, directed data the first betweenness result cannot say whether it used the weights or the direction until #313 lands; W23's reproducibility criterion fails on the analyst's first export. Element gap, but it lands on the walkthrough's first result | `feature-fit/3-algorithms.md` rows Bridges, Reach; gap #313 |
| F12 | minor | A tool that needs nothing from the canvas (Rank, Groups) runs on the click, so the secondary bar's scope line ("Rank what is showing (34 nodes)") is never read before the run, and the tool's face (last-used variant) makes the first R run whatever was last chosen | `object-model.md` section 3 table rows Groups, Rank |
| F13 | minor | Changing a Measure's Channel from Size to Colour replaces the paint row, dropping the size; keeping both is Channel, "+", Channel. A "Colour and size" preset in the "+" list would make the two-channel state one click | `object-model.md` 4.3 Fill; `mocks/screens.md` screen 6 |
| F14 | minor | The Measure inspector puts six parameter rows (Definition) above Values, so the analyst scrolls past parameters to reach the top 10 every time (screen 6 is shown scrolled for this reason). Put Values first on a Measure, or collapse Definition while the state is current | `object-model.md` 4.3 section order; `mocks/screens.md` screen 6 |
| F15 | minor | The mocks draw Export rows with no exporter behind them (Data [GraphML] Export, Ranked list [CSV] Export); the model's own rule for keys ("a binding that does not exist is not listed") should apply. "Share" for a menu of exports is flagged elsewhere; noted because it is the one filled button | `mocks/screens.md` screens 2 and 6; `feature-fit/7-.md` section 5 last row; `feature-fit/6-camera.md` 2.9 |
| F16 | minor | The top-10 intersection across three methods (W23) is three "Top N set" cuts plus one Combine: six new rows for one answer, each cut placed above its Measure so the tree interleaves. Acceptable; a "Top N across several..." on the multi-row inspector would make it one row | `object-model.md` 4.3 Values "+", 4.6 Combine, 2.4 placement |
| F17 | minor | Two runs of one algorithm share a name ("Communities (Louvain)" twice); the parameter that differs is in Made by. Auto-suffix the non-default parameter until renamed | `object-model.md` 2.3 Name, 4.4 Definition |
| F18 | minor | Picking a Measure row clears the element selection, so reading a ranking loses the node the analyst was looking at; and redo of a deleted expensive Measure recomputes it (note E) | `object-model.md` section 8 (picking a Measure clears the selection); `feature-fit/7-.md` note E |
| F19 | minor | A rule typed into Ctrl+K ("betweenness > 0.05") matches no command and becomes "Ask: ...", which sends it to an assistant the analyst may not have configured. A query-shaped sentence should offer "Filter by rule: ..." before "Ask" | `object-model.md` section 8 Ctrl+K; `feature-fit/7-.md` note B |

## 10. What the walkthrough says about the model as a whole

Where the model beats Gephi and Tableau: two clicks from data to a coloured picture; the
cost gate that never starts a four-minute job unasked; every result a row with its record;
the three-click recolour; the table dock with a column per result; recipes once they exist.
Alex's "too many clicks for common tasks" is answered for the picture.

Where it is slower or riskier, in order of how much it would hurt Alex:

1. Nothing survives a reload and the weekly re-run is three menus (F3). Build order, not
   design, but it decides adoption.
2. Two results cannot be looked at together (F2). The one place the model has no answer.
3. A late-noticed import mistake destroys the tree (F1). One menu row fixes it.
4. Numbers cost pictures: every ranking paints, parameters come after the run, and the
   filter that reads a result is not in Filter (F5, F6, F7).
5. Scope is ambiguous exactly where the analyst combines things (F8), and a data change
   leaves a hybrid picture with a quiet signal (F9).
6. The column verbs are buried (F10) and the import form types where Gephi picks (F4).

Every item above has a one-line fix in section 9 except F2, which needs a decision on
whether a View may carry eye states or whether Compare takes objects instead of Views. That
is the question to settle before the next round of mocks.
