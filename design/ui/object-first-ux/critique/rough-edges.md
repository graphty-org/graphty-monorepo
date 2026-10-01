# Rough edges in the object-first model

Where the object-first design of `design/ui/object-first-ux/object-model.md` fits awkwardly or
hides a hard problem. Each section states the problem with a concrete scenario, the options, a
recommendation, and the one thing to prototype first. The last section is a ranked list.

Written for an engineer who is not a designer. Every design word is defined the first time it
is used. Element API names written `session.xxx` are members of the graphty-element session
API in `graphty-element/src/session/`. Issue numbers are open issues in
graphty-org/graphty-monorepo. This is a design critique; it changes no code.

## 0. Terms

- **Object**: a row in the left-hand tree. Something the reader made from the data (a Set, a
  Group, a Measure, a Grouping) or the data itself (the Dataset). The only things the
  inspector edits.
- **Element**: one node or one edge. The material. Never edited directly.
- **Member**: an element that belongs to an object.
- **Tree**: the left panel's ordered, nested list of objects. Figma's Layers panel.
- **Inspector**: the right panel, showing the properties of whatever was selected last.
- **Fill**: an object's whole appearance, stored as one or more style layers on that object.
- **Layer**: the element's unit of appearance (`LayerSpec` in
  `graphty-element/src/catalog/types.ts`): a selector (which elements) plus either fixed
  values or a binding from a value to a visual property. Layers form a stack; later wins.
- **Channel**: one visual property a layer can write (node colour, node size, edge width).
  There are 40.
- **Precedence**: when two objects paint the same channel of the same element, which wins.
  The model's rule: the visible object nearest the top of the tree, per channel.
- **Set**: an object whose members are a list of elements, painted with one look.
- **Measure**: an object with one value per element, painted with a scale (a colour ramp or
  a size range).
- **Grouping**: a Measure of labels that is also a folder of **Group** objects, one per label.
- **Mask** (what is **showing**): the element's one visibility filter (`session.visibility`).
  Elements outside it are not drawn. **Focus** sets the mask to one object's members.
- **The eye**: the toggle on a row that stops that object painting. It never hides members.
- **State**: whether an object's members are up to date: current, computing, waiting, stale,
  failed, frozen (model section 5).
- **Run**: one execution of an algorithm the element keeps, with parameters, status,
  progress, result and caveats (`session.runs`).
- **Objects API**: the session API the model requires before anything else (model section 11):
  the element owns the tree (kinds, names, parents, order, definitions, states, links) so the
  app never keeps graph state of its own.
- **Journal**: the element's proposed record of every state-changing command with its inverse
  (issue #145). The undo stack is the app's; the inverses are the element's.
- **Explain**: `session.styles.explain({node})`, which says which layer won each channel of one
  element.

## 1. Overlapping membership and precedence

**The problem.** In Figma a pixel belongs to one shape. Here node 3 can be in Group 2 (colour
orange from Communities), in "Path: 1 to 34" (colour blue, edge width 3), in "Degree > 8"
(outline 2 px), and have a size from Influence. Four objects, one node, and the reader has to
be able to answer "why is this node blue" without reading the source.

The model's rule (section 6.2) is sound: per channel, the visible object nearest the top wins;
children paint above their parent; hidden objects do not paint. The rough edges are in what the
reader sees, not in the rule:

1. **The tree order is not quite the layer order.** A parent's own Fill sits below its
   children (so a Group override beats the Grouping), and a derived object (Top 10, a
   Combination) is inserted above its input. Both are right, but they mean the reader's mental
   model "higher row wins" has two exceptions they will only meet when something surprises
   them. Figma has the same exception for frames and readers do learn it; the difference is
   that in Figma the exception is visible (the child is drawn inside the frame), and here the
   Group's members are the same dots as the Grouping's.
2. **A conflict has no visible sign in the tree.** Screen 6 (`mocks/screen-6.png`) shows the
   covered Grouping's chip dimmed to 50 percent, which works for the full-cover case. For
   partial cover (a Set of ten nodes above a Grouping of 34), nothing in the tree says the
   Grouping's colour is missing on ten nodes. The reader finds out from the canvas, or by
   opening the Grouping's Fill and reading "Covered by Path on 10 of 34 members".
3. **"Covered by X on N of M" is expensive as specified.** The count is `explain()` over
   every member, which is M calls per covered object per repaint. Fine at 34 nodes; at
   10,000 nodes with six objects it is 60,000 calls to decide the wording of a secondary line.
4. **Per-channel wins can make a legend lie.** A Set of ten nodes painted blue above a
   viridis Measure: the legend shows a ramp, and ten nodes are not on it. The model's legend
   includes a block per visible Set, so the information is there, but the ramp block does not
   say "except 10 nodes".
5. **Two objects that write the same channel with different intent.** A Measure writes Size
   as a scale; a Set writes Size as a fixed value. The per-channel rule picks a winner, but a
   reader who put "Degree > 8" above "Influence" and set its Size to 2.0 has just made the
   five most-connected nodes the same size while Influence sizes everything else. Correct by
   the rule, and nobody wanted it.

**Options.**

- A. Keep the per-channel rule and make coverage visible on the row: a small "partly
  covered" mark (a half-filled chip) whenever any visible object above writes the same
  channel on any member. Cheap to compute from the layer selectors when the objects API keeps
  member sets: it is set intersection, not `explain()` per node.
- B. Forbid the same channel twice: a new object's default Fill takes the first free channel
  (the model already says this), and the Fill "+" greys out a channel a visible object above
  already writes, with the tooltip "Colour is written by Path above this". The reader can still
  do it after moving the row.
- C. Top row wins every channel (Figma's literal rule). Rejected by the model (decision 11)
  because it erases stacking, which is the point of the tree.
- D. Blend on conflict (mix colours, average sizes). Rejected: unreadable and unexplainable.

**Recommendation.** A plus the second half of B. Keep per-channel precedence. Add one glyph on
the row for "some of my members are painted by something above me on a channel I write",
computed by the objects API from member sets, not from `explain()`. Keep `explain()` for the
node inspector's Look section, where it is one node. In the Fill "+" list, show a channel that
a visible object above already writes with a note, not disabled. And the legend's ramp block
gains a departure line ("10 nodes painted by Path") drawn from the same intersection, so the
legend and the tree say the same thing.

Element side: the coverage count needs the objects API to hold each object's resolved member
set (or the mask of it) so the intersection is a bit-and over masks; `explain()` is the wrong
tool. A "coverage" field per layer pair is a small addition once member masks exist.

**Prototype first.** A static page in the mocks folder with the screen 3 tree plus a Path row
that partly covers Group 2, showing the half-chip on Communities, the "Covered by" line, and
the legend departure. Then a headless-session script in `graphty-element` that builds the same
four layers and reports per-channel winners for every node from member masks, timed at 34
and at 50,000 nodes, so the cost of the glyph is a number before the UI depends on it.

## 2. Stale objects after data changes

**The problem.** An object is live: its inputs can change under it. The model's six states
and the rule "re-run at once when the estimate is under a second, otherwise mark stale" read
well, but the element does not know what the model needs it to know.

Today a run is stale for exactly one reason: the resolved scope's digest differs from the one
the run was made with (`graphty-element/src/session/runs/RunsApi.ts`, `staleOf`). That covers
"the mask changed". It does not cover: the data changed under the same mask (Add data adds
nodes; the digest may change, but a changed attribute value does not), a parameter was edited
(the model wants Damping edits to re-run), a linked input was re-run (Top 10 by Bridges must go
stale when Bridges is re-run), or a parent was re-run (a Grouping computed within "Degree > 10"
must go stale when that Set's rule changes).

The propagation graph (down to children, along links) is a dependency graph between objects.
The app cannot compute it without owning the tree, which the root architectural rule forbids.
So staleness is blocked on the objects API, and the objects API has to carry dependencies, not
just parents.

Second edge: **a stale object keeps painting its old values** (decision 10). Right for a
Grouping (the picture should not go blank). Dangerous for a rule Set that is cheap: the model
says cheap objects re-run at once, so a rule Set is never seen stale. But the cost estimate is
a shipped default, not a measurement (`graphty-element/src/session/limits.ts` says so in its
header), so "under one second" is a guess; on a slow machine the "live filter" the reader
expects to be instant will be a stale row with a Re-run button, and the reader will not know
why it stopped being live.

Third edge: **Add data with Focus on.** Focus sets the mask to a Set's members. New nodes
arrive outside the mask (they are not members). The reader, focused on "Degree > 10", adds a
file and sees nothing change, because the new nodes are hidden and the Set is stale or has
re-run to the same six. The status bar's "Focused on Degree > 10: 6 of 40" is the only clue.

Fourth edge: **Group identity across re-runs.** The model promises that group names, notes and
Fill overrides follow a group across a re-run by largest-overlap matching. That is graph logic
the element does not have (issue #191 is names only). Until it exists groups are matched by
label, and Louvain's labels are not stable across seeds, so "Group 2" after a re-run may be a
different community wearing the reader's orange override.

**Options.**

- A. Staleness derived, not tracked (the element's current style): every object's definition
  hashes its inputs (scope digest, data version, parameter values, the run ids and result
  digests of linked inputs); an object is stale when its stored hash differs from the current
  one. No propagation code: a child's hash includes its parent's result digest, so it changes
  when the parent changes. This is the `runId.ts` philosophy ("digest drives staleness")
  extended to objects.
- B. Tracked dependencies: the objects API keeps an explicit edge list and walks it on every
  change. More code, and a missed edge is a silent bug.
- C. Everything goes stale on any data change (no dependency analysis). Simple, honest, and
  annoying: a Fill edit on one Set would not do it, but Add data would dim every row.

**Recommendation.** A. It is the element's existing pattern, it needs no propagation walk, and
it makes "stale" a fact about hashes that a test can pin. Pair it with two UI rules the model
does not state: (1) when a data change makes more than N objects stale at once, the Dataset
inspector shows one line "8 objects are stale [Re-run all (about 2 min)]" so the reader is not
left clicking eight rows; (2) the Focus case: when Add data lands while Focus is on, the status
bar line becomes "Focused on Degree > 10: 6 of 40 (6 new nodes hidden) [Exit]".

For group identity: ship label matching first, say so in Made by ("groups matched by label;
names and overrides may not follow"), and make overlap matching the second step. Do not promise
it in the UI until it exists.

For the cost guess: until `session.calibrate()` exists, the "live" threshold should be
conservative and the Definition section of a rule Set should carry a small "Live" or "Re-run
on Enter" word so the reader can see which behaviour they have.

**Prototype first.** A headless-session script that creates a rule Set, a Grouping within it,
and a Top 10 linked to a Measure, then applies Add data, a parameter edit and a scope edit,
and prints which objects the hash rule marks stale. This is the acceptance test for the
objects API's staleness before a single row is drawn.

## 3. Long-running creation: progress, cancel, partial results

**The problem.** Figma's drawing tools finish in one gesture. Betweenness on 50,000 nodes
takes minutes. The model's answer is good: the row appears instantly, in the computing state
with a progress ring, or in the waiting state over the cost gate with "Run (about 4 min)" in
the row, never a dialog. The rough edges:

1. **A run that blocks the frame cannot show progress or take a Cancel click.** The element's
   `CostEstimate.blocksFrame` says which runs freeze the tab. Feature-fit area 3 (section 5,
   note 7) already says such a run is never started unasked and its Cancel is not drawn. But
   the tree row still shows a ring that does not animate, which reads as a hang. And a
   blocking run started from the waiting state will freeze the whole app, tree included, with
   no visible reason for the freeze once the click is gone.
2. **Cancel of a creation deletes the row; cancel of a re-run restores the old state.** Two
   different outcomes for one button, and the second one only works if the element kept the
   previous result, which it does not (a re-run replaces).
3. **Partial results.** A cancelled community detection at 60 percent has a partial labelling
   that is meaningless; a cancelled betweenness sampling has a usable approximate answer. The
   model has no "partial" state and the element has no partial result. Cancel throws away the
   work either way.
4. **The queue.** The element runs one thing at a time through its operation queue. Six
   Measures from Rank > Several... are six computing rows, but five of them are queued, and
   the ring on a queued row would say "computing" for something that has not started. The
   element reports a queue position; the row does not show it.
5. **The waiting state is a new concept for a Figma reader.** A row that exists but has not
   run, with a Run button, is honest, but a reader who pressed G and got a hollow circle with
   "not run, about 4 min" may not understand that they have to press again.

**Options.**

- A. One state, "computing", for both queued and running; progress only when the run reports
  it. Simplest; hides the queue.
- B. Show queue position in the row ("queued, 3rd") and in the status bar chip ("Computing 1
  of 6"); the status bar chip's Cancel cancels the whole batch.
- C. For blocking runs, run them in a worker (design 9.3's worker-hosted session). The real
  fix; large; not this phase.
- D. For partial results: a "partial" caveat rather than a state. A cancelled approximable run
  keeps its sample so far and lands current with the caveat "cancelled at 60 percent of the
  sample"; a cancelled non-approximable run is removed (creation) or reverted (re-run).

**Recommendation.** B and D. Queue position is one word in the row and stops the ring lying.
Partial-as-caveat keeps the state list at six and uses the element's existing caveat channel;
it needs the element to let a cancellable sampling run return what it has, which is a small
change to the algorithms that already sample. For blocking runs, keep the feature-fit rule
(never unasked, no Cancel drawn) and add a visible cue: the row's ring is replaced by a static
"working" glyph and the status bar reads "Working, the page will pause for about 8 s". Until
the worker exists, that is the honest picture.

For the waiting state, the row's count text should be the verb, not a description: "Run (about
4 min)" as a text button in the row itself, not only in the inspector, so the second click is
where the first one landed.

**Prototype first.** The status bar and tree row for a six-member batch: one running with a
ring at 42 percent, two queued with "queued", three waiting over the gate, and the chip
"Computing 1 of 6 [Cancel all]". A static mock is enough to see whether five different row
states in one Grouping's worth of rows are readable.

## 4. Measures versus sets: is a gradient a Fill?

**The problem.** The model calls everything an object's appearance "Fill", after Figma. For a
Set that is exact: one paint row, a colour chit, an opacity. For a Measure it is a stretch:
Channel, Scale, Palette, Domain, Missing, Reverse, a second channel with a Range. Screen 6 shows
it and it reads well, but three things strain:

1. **"Fill" now names three different row shapes.** A Set's paint row (chit, hex, opacity,
   eye, minus); a Measure's encoding block (six rows); a Group's "Inherited from Communities"
   line with an override. A reader learns that "Fill" means "how it looks", which is fine, but
   the section is no longer the uniform 32 px paint row the comparison document praised Figma
   for. Uniformity was the argument; the Measure's Fill breaks it.
2. **A Measure has no members to select or halo.** Clicking a Set row halos its members;
   clicking a Measure row clears the selection (section 8). Two row kinds, two behaviours on
   click. A reader who clicks Influence expecting to see "the influential nodes" gets nothing
   on the canvas, and has to go to Values > Top 10 or cut a Set.
3. **A Grouping is a Measure that is also a folder.** Its Fill is a palette (one colour per
   Group), each Group's Fill is one entry of it, and an override is a child layer. The tree
   shows a Grouping with a strip chip and Groups with swatch chips, which is clear. But the
   Fill "+" on a Grouping means "add a second channel bound to the group label" (Shape by
   group), while the Fill "+" on a Group means "override this group's colour". Same button,
   different verb.
4. **An edge Measure from the Path tool.** Max flow hands back a Measure on edges from a tool
   whose every other result is a Set. Accepted as awkward in feature-fit 3.
5. **The "no fill" object.** Under the auto-apply policy (feature-fit 5, note A4), the fourth
   Measure of a batch may get no channel at all. A row with no Fill has an eye that does
   nothing, a chip that reads "no fill", and a Values section that is the only reason it
   exists. The model treats that as fine; it is the first object that is not a picture.

**Options.**

- A. Keep "Fill" for everything and accept the three shapes. The section header is the
  constant; the rows inside vary by kind.
- B. Two section names: "Fill" on a Set or Group (a colour), "Encoding" on a Measure or
  Grouping (a scale). Honest, and it gives the reader a word for the distinction the owner
  drew (sets versus measures) at the one place it matters. Costs one more term.
- C. Make a Measure's Fill a single paint row whose chit is the ramp and whose "value" field
  is the palette name, with the domain, scale and second channel behind a popover. Restores
  the 32 px row; hides the controls the analyst edits most.

**Recommendation.** B. The owner's own split is sets and measures; the inspector should say
which one the reader is looking at, and "Encoding" is the element's own word (`encode()`,
encoding layer). Keep the paint-row shape for Fill and the six-row block for Encoding, so the
uniformity argument holds within each kind. For the click behaviour (edge 2): a Measure row
click should do something on the canvas; the cheapest honest thing is a transient highlight of
its top 10 (the same element-owned transient layer the hover link uses), with the inspector's
Values rows already showing them. Not a selection, so the rule "Measures have no members"
stands.

For edge 5, do not create a no-fill object. A batch member past the free channels should be
created with its Encoding present but its eye off (feature-fit 3, note 3 recommends the same),
so every object is a picture and the eye means what it always means.

**Prototype first.** Screen 6 redrawn with the section titled "Encoding", beside screen 3's
"Fill", and a reader test with three engineers: "which of these two objects could you give a
single colour to?". If the word does not help, revert to A.

## 5. The raw-material inspector: a node is not an object

**The problem.** The model's boldest move: a node has an inspector but no Fill. Screen 4
shows the shape: Attributes, Values (one row per Measure and Grouping covering it), Member of,
Neighbours, Look (which object won each channel), Notes, and one action row "Colour this
node...", which creates a one-node Set. It is a good report. The edges:

1. **The Figma reflex fails on the material.** A Figma reader clicks a thing and looks for
   Fill. Here the first click on a node shows a panel with no Fill section, and the door to
   painting it is a text button at the bottom of Look. The comparison document counted the
   old app's five steps; this is three, but the first step is a small surprise.
2. **Two selections, one inspector.** The inspector shows whichever of the object selection
   (tree rows) and the element selection (nodes) changed last. Picking a Set row also sets
   the element selection to its members. So after clicking "Group 2" the reader has both: the
   Group is the inspector and eleven nodes have the halo. Pressing Delete deletes the Group
   (the inspector's subject). Clicking one haloed node switches the inspector to that node;
   Delete now means "remove this node from the data" (feature-fit 7, note F). Same key, one
   click apart, two very different results. The rule "Delete acts on what the inspector shows"
   is right and is also exactly the mode error the comparison document warned about.
3. **One-node Sets pile up.** Decision 19 accepts ten rows for ten recoloured nodes. That is
   Figma's behaviour for ten rectangles, but ten rectangles are content; ten "Node 7" Sets are
   scaffolding the reader did not want to name. The tree fills with rows whose only meaning is
   "I painted this one".
4. **The Look section depends on `explain()` being editable-aware.** "Colour from Communities"
   is a link to the Grouping; clicking it should land the reader on the row that painted this
   node, which for a Group override is the Group, not the Grouping. `explain()` returns
   layers; the objects API must map a layer to the right row.
5. **The edge inspector does not exist yet** (edges are unpickable, issue #319), so half the
   material has no inspector at all. Section 6 below.

**Options.**

- A. Keep the report and the "Colour this node..." door. Add one refinement: the door is the
  first row of Look, not the last, and its label is "Fill..." so the Figma reflex has a target
  in the place the reflex looks.
- B. Give the node inspector a real Fill section that writes to "the smallest Set containing
  this node" and, when none exists, creates the one-node Set. Faster, but it hides which object
  the paint landed on, and a reader with the node in three Sets would be painting one of them
  by accident.
- C. An automatic "Overrides" Set that collects one-node paints (the element-api-first
  proposal). Rejected by decision 19 because the app would be deciding structure.
- D. For the pile-up: a multi-selection "Colour these..." (already in 4.9) plus a "Add to
  [set v]" on the node inspector too, so the second recolour can join the first one's Set.
  This is the clutter policy already chosen; extending it to one node is one row.

**Recommendation.** A plus D. Keep nodes as material. Move the paint door to the top of Look
and call it what the reader is looking for. Put "Add to [set v]" on the single-node inspector
so a reader who paints node 7 and then node 12 can put 12 into "Node 7"'s Set (which they then
rename). On Delete: the rule stands, and the confirm on the data edit is the safety net; add
one visible cue, a Delete row in the node inspector's overflow labelled "Remove from data..."
so the key and the menu say the same words.

**Prototype first.** Two variants of screen 4: Look first with a "Fill..." row versus the
current bottom text button. Time three readers on "make FloridaState red". Then a keyboard
walkthrough of the Delete scenario in a mock with a live focus indicator, to see whether the
inspector header makes the subject obvious enough.

## 6. Edges as material versus objects

**The problem.** Edges are half the material and the model barely mentions them. Concretely:

1. **Edges cannot be picked** (issue #319). No click, no hover, no right-click, no marquee on
   edges. An edge Set (a spanning tree, a min cut, a path's edges) can be created and painted
   but a reader cannot click one of its edges to see the edge inspector. The model reaches
   edges through a node's Neighbours rows and the table, which is a detour.
2. **A node Set's inside edges.** "Group 2" has "Inside edges 20 | Cut edges 9" in Members,
   and a reader expects Edge colour on that Set to paint those 20. The element's selectors name
   nodes or edges, never "edges whose both ends are members" (feature-fit 5, note A1). Until a
   scope-based selector with induced edges exists, a node Set's Fill offers node channels only,
   and the most common styling intent for a community ("show its internal structure") has no
   control.
3. **Edge Measures and edge Groupings.** Max flow writes a value per edge; edge betweenness
   (proposed) would too; an edge attribute (weight, type) could be Colour by. The table dock
   has an Edges tab with one column per edge Measure, but the tree has no visual distinction
   between a node object and an edge object beyond the count text ("4 edges"). A reader
   cannot tell at a glance which rows paint lines and which paint dots.
4. **Directed edges and arrowheads.** The Dataset's "Direction" row is a data edit that makes
   every run stale (feature-fit 1, note D), and arrowheads are a Canvas switch. A reader who
   wants "show direction on the path only" needs an edge channel on a Set, which works only
   for edge Sets or once induced edges exist.
5. **Edge selection halo.** The element's selection holds edges, but there is no distinct
   selected-edge look on the canvas today (designloom asks for one), so "picking a min-cut row
   halos its edges" (feature-fit 3) has nothing to draw with.

**Options.**

- A. Treat edges exactly as nodes: pick, hover, inspector with Endpoints, marquee includes
  edges. Requires issue #319 and an edge halo. The full answer.
- B. Edges are second-class until #319: reached from nodes and the table; edge objects exist
  but are not clickable on the canvas. The model's current position, unstated.
- C. Edge objects carry a distinct row icon (a line glyph) and an "edges" count in a
  different colour, so at least the tree says which is which.

**Recommendation.** A as the target, C now, and say B out loud in the model so nobody builds
around it. Concretely: add a row icon for edge objects (Set of edges, Measure on edges), put
"Edges" as the target selector at the top of the Filter popover (feature-fit 2 already has it),
and make the induced-edge selector the first item in the set-vocabulary unification, because it
unlocks the community-structure styling that every persona who finds groups wants next. Edge
picking (#319) and a selected-edge look are element work that the model should list in section
11 with size "medium", not leave in a feature-fit footnote.

**Prototype first.** A mock of screen 3 with "Group 2" given an Edge colour row and its 20
inside edges painted, plus a "Cheapest connecting network" edge Set row with the line icon,
selected, its 33 edges haloed. That single picture tests whether the tree can carry edge
objects without a legend.

## 7. Undo across re-runs

**The problem.** Figma's undo is a safety net because every step is cheap and reversible. Here
a step can be four minutes of computing, and "reverse" is not always defined:

1. **Undo of a re-run.** The element replaces a run's result on re-run (`run.rerun()` keeps
   the id). The inverse of a re-run is "put the old members and values back", which needs the
   old result kept. The element does not keep it, and the journal that would (issue #145) does
   not exist.
2. **Redo of a creation is a recompute.** Undo of "create Bridges" removes the run; redo is
   `algo.run` again, four minutes, unless the element keeps a removed run in memory until the
   journal entry is evicted.
3. **Undo of Add data.** The inverse is a pre-import snapshot, which the journal's byte cap may
   demote; then the row reads "Too old to undo". Every object that went stale on the load
   should return to current on undo, which needs their prior results kept too.
4. **Undo and the dependency graph.** Undoing a re-run of Bridges must also undo the re-run of
   "Top 10 by Bridges" that followed it, or the linked Set is now cut from values that no longer
   exist. Coalescing by cause (one journal entry for the re-run and everything it triggered) is
   the model's implicit expectation and the element design's coalesce key can express it, but
   nobody has said so.
5. **Undo of a Fill edit during a repaint.** A Fill edit on a large graph is itself a run
   with progress ("Restyling 38%"). Ctrl+Z during it must cancel the repaint and restore, not
   queue a second repaint behind it.
6. **What the assistant did.** One assistant request may create three objects; the reader
   expects one Ctrl+Z to remove all three.

**Options.**

- A. Keep results: a removed or replaced run's result stays in memory until its journal entry
  is evicted. Undo and redo are swaps, not recomputes. Memory cost is one result per entry.
- B. Recompute on undo/redo, shown honestly: a redone creation reappears in the computing or
  waiting state. Cheap in memory, expensive in time, and the reader learns to fear Ctrl+Z.
- C. Snapshot the whole session per step (positions, results, layers). Simple and huge.
- D. Coalesce by cause: every command carries the id of the command that caused it, and undo
  takes a cause group as one step.

**Recommendation.** A plus D. Keep results for the journal's lifetime (the design already
proposes it for #145; feature-fit 7 note E says the same), and make cause-grouping a rule of
the journal: an assistant request, a Re-run and its dependants, a Fill slider sweep and a data
load with its re-runs are each one undo step. Say explicitly in the model that camera moves and
selection are not undo steps (the model does), and that Focus IS one (it changes the mask,
which re-scopes tools). Show the honesty in the UI: when an undo step will recompute, the
History dock row says "Undo (re-runs 2 objects, about 3 s)".

**Prototype first.** Not a mock: a headless-session test in `graphty-element` that runs
Bridges, cuts Top 10, re-runs Bridges with a different seed, and then applies the designed
inverse. Whether the Top 10 comes back with the old members is the pass condition. This is the
one place where the UI cannot be evaluated before the element behaviour exists.

## 8. Large graphs: 10,000+ nodes and a tree of 200 groups

**The problem.** Every mock is Karate Club (34 nodes). The model's rules were checked at that
scale and several of them do not survive 10,000 nodes or a Grouping with 200 groups:

1. **200 Group rows.** Components on a sparse graph, or Louvain at high resolution, gives
   hundreds of groups. The tree shows one row each. The element's overflow policy paints the
   largest N and "Other"; the model draws every Group row regardless, so the reader scrolls
   past 190 rows painted "Other". Nothing in Figma has 200 children because nobody draws 200
   rectangles by hand; here it is one click.
2. **Row hover outlines members.** Hover a Grouping with 10,000 members and the element must
   paint a hover layer over 10,000 nodes on every mouse move across the tree. The hover link
   is the model's best Figma borrowing and its most expensive.
3. **Picking a Set row selects its members**, capped at 5,000 by
   `DEFAULT_SELECTION_CAP` (`graphty-element/src/session/selection/SelectionApi.ts`). A Set of
   12,000 nodes shows "showing 5,000 of 12,000", so the halo is a lie by 7,000 nodes.
4. **The member rows in the inspector** ("up to 8, then See all in table") are fine, but
   "Inside edges | Cut edges" via `session.selection.statistics` over a 12,000-node set is
   a full pass per click.
5. **The rendering ceiling.** Above 200,000 nodes the element publishes a render ceiling it
   does not enforce (issue #302). Once it does, a Set's members may be partly undrawn and the
   model has no word for it (feature-fit 1, note H).
6. **Every Fill edit is a repaint of every member.** On 10,000 nodes each paint-row keystroke
   is a run with progress; the model says fields commit on Enter, which is right, and colour
   pickers that preview on drag do not.
7. **The waiting state everywhere.** On a big graph most Rank and Groups variants are over the
   cost gate, so most tools produce a waiting row and a second click. The "row appears
   instantly" promise is kept; the "tool hands you an object" promise is not, and the toolbar
   feels broken until the reader learns the second click.
8. **The Values histogram, top-N and "Covered by" counts** are all per-object passes.

**Options.**

- A. Groups are virtual rows: a Grouping shows the largest N (the overflow policy's N,
  default 8) as rows and one collapsed row "192 more (Other)" that expands to a scrolled list.
  The tree's row count is bounded by N per Grouping.
- B. Draw every group row, virtualise the list. The scroll is the problem, not the DOM.
- C. Hover link degrades: above a member threshold (say 2,000) hovering a row outlines nothing
  and shows a count badge on the row; the canvas hover (node to rows) stays because it is one
  node. The element decides the threshold from its limits.
- D. Selection on a Set row above the cap is a "soft" selection: the inspector shows the Set,
  the status bar says "12,000 members (not haloed above 5,000)", and no element selection is
  made. Ctrl+G is not offered.
- E. Raise the cap. It exists because the selection is a materialised list and the halo is a
  per-node layer; raising it moves the wall.

**Recommendation.** A, C and D. Bound the tree by the overflow policy the element already
has (the "Other" group becomes a real collapsed row, and "Show the largest [8 v]" in the
Grouping's inspector is the control that changes it). Degrade the hover link by member count
with the element's limit as the threshold. Make large-Set clicks soft so the halo never lies.
Keep the render ceiling and undrawn count as a status-bar chip and a per-object line, as
feature-fit 1 proposes. For the waiting state on big graphs: when the estimate for the tool's
default variant is over the gate, the flyout face says so before the click ("Bridges, about 4
min") and the click creates the waiting row selected with its Run button focused, so Enter is
the second click.

**Prototype first.** Load College football's big sibling: a 20,000-node synthetic graph in a
Storybook story of graphty-element (served through servherd), with a Components run that
yields 300 groups, and measure three things with the element as it is: time to outline
10,000 nodes with a hover-style layer, time for `selection.statistics` over 12,000 nodes, and
the frame rate while a colour repaint runs. Those three numbers decide whether A, C and D are
enough or whether the element needs mask-based paths before the tree can be built.

## 9. 3D and XR, where the tree metaphor strains

**The problem.** The tree, the inspector, the eye and Focus are desk furniture. The model
treats 3D as a view mode and XR as "hide the panels, the element's in-headset UI takes over"
(section 9, feature-fit 6 section 3.3). Where it strains:

1. **3D navigation versus the Select tool.** The model's Select tool drags a marquee on empty
   canvas (Figma). In 3D a drag on empty space orbits today, and there is no wheel zoom or
   right-drag pan (issue #290). Feature-fit 6 (note 2.2) proposes plain drag orbits in 3D and
   Shift-drag draws the marquee. That is the right call and it means the Select tool behaves
   differently in 2D and 3D, which is one more mode.
2. **A 3D marquee is a frustum slab**: everything between the near and far planes inside the
   rectangle. On a dense 3D layout that selects nodes the reader cannot see behind the ones
   they can. The element must hit-test it (the app may not read positions), and the reader
   needs a depth cue or a "front only" option nobody has designed.
3. **Zoom "100%" has no meaning in 3D**; feature-fit 6 note 2.3 replaces it with the framing
   name. Fine, but the right panel header now changes shape between modes.
4. **In a headset, nothing in the model works.** No tree, no eye, no Focus, no re-run, no
   Fill. The reader sees the painted picture as it was at entry. Voice can create objects
   through the assistant, and they appear when the headset comes off. The element's XR UI
   today is a corner "enter" button (`graphty-element/src/ui/XRUIManager.ts`); the world-space
   panels are deferred to 2.1 (design 9.3). So for this phase XR is a viewer, and a viewer
   that cannot even toggle an eye is a step back from "look at what I made from two angles".
5. **The Pinned system Set and XR grabbing.** Dragging a node in a headset pins it (the same
   setting as the desk). A session of hand-arranging in VR produces a Pinned row of 40 nodes
   the reader sees on return, with the outline Fill the model gives pins. Correct, and a
   surprise.
6. **Compare mode in 3D** is two orbit cameras over one tree with a "Link cameras" switch;
   it depends on a second renderer on one session, which does not exist (#186).
7. **Set-level labels and hulls** (a label at a Set's centroid, a soft shape around its
   members, both listed as new element work) are 2D ideas; a hull in 3D is a mesh and a
   centroid label in 3D is occluded half the time.

**Options for the headset.**

- A. Viewer only (the model's current position). The tree is frozen at entry; voice adds.
- B. A minimal in-headset object list drawn by the element from the objects API: one row per
  top-level object with an eye and a Focus verb, on a wrist or world panel. Needs the objects
  API to be the element's (which the model already requires) and the world-space panel work
  (deferred). Not this phase, but it is the reason the objects API must be element-owned:
  otherwise the headset can never see the tree.
- C. Pre-entry choice: the mode switch's VR segment opens a small popover "Enter VR showing
  [Everything v]" so the reader picks the Focus before entering. One click more, no modal.

**Recommendation.** A for this phase, C as a small addition, B as the stated target. In the
model, say plainly that VR and AR are viewing modes with no object editing in this phase, and
that voice-created objects are the one exception. For 3D on the desk: adopt feature-fit 6's
orbit-by-default with Shift-marquee, and add a "front only" checkbox in the Select tool's
flyout for the slab marquee. For the zoom readout, let the right panel header show the framing
name in both modes ("Fit", "Isometric", "Custom") and put the percentage only in the status bar
in 2D, so the header does not change shape. Drop set-level hulls from the plan for 3D and
keep set-level labels as a 2D-first feature with billboarding in 3D.

**Prototype first.** Screen 3 in 3D mode: the same tree and inspector, the canvas orbited to
an isometric framing, the right header reading "Isometric", the status bar without a
percentage, and a Shift-drag marquee mid-gesture with the "front only" option visible. Then a
Storybook story that enters emulated VR (the `xr` test project) with a Focus on Group 2 and
confirms the mask survives entry and exit.

## 10. The AI assistant creating objects

**The problem.** The model's rule is that everything the assistant does goes through the same
commands the tools use, so its work is visible, editable and undoable (issue #337). Today the
assistant's tools contradict this: `findAndStyleNodes` adds a style layer with no row, and
`clearStyles` removes every non-element layer (feature-fit 7, note A). Beyond that known
contradiction, the assistant strains the model in ways the tools do not:

1. **One request, many objects.** "Show me the communities and who bridges them" is a
   Grouping plus a Measure plus maybe a Top 10 Set. Three rows from one sentence, all at the
   top of the tree, in an order the assistant chose. The reader did not name them and may not
   want all three. Undo should remove them together (section 7).
2. **The assistant does not know the tree's precedence.** If it creates a colour Measure on
   top of the reader's carefully ordered stack, it covers everything, exactly as a reader
   would; but the reader chose their order and the assistant did not ask. A "suggest a free
   channel" default (model section 6.2) softens this.
3. **Naming.** Tool-created objects are named by the element ("Bridges (Betweenness)").
   Assistant-created ones could carry the request as their name ("who bridges the two halves")
   or the technical name. Made by records the request either way; the row name is what the
   reader scans.
4. **Cost gate and the assistant.** A request that maps to a four-minute run creates a
   waiting row, and the assistant's reply has to say "I set up Bridges; it needs about four
   minutes, press Run" rather than "Done". The assistant needs `session.estimate` in its
   tool loop, and today its `runAlgorithm` tool runs directly.
5. **The assistant reading state.** `queryGraph` reports counts, layout and mode; nothing
   about the tree, the selection or the mask. "Remove the red highlight" needs the assistant
   to find the object whose Fill is red, which needs `session.objects.list()`.
6. **"Ask:" in the palette versus commands.** A three-word query that matches both a command
   and a question ("bridges") is resolved by an app rule (feature-fit 7, note B). Reasonable,
   and a source of surprise for a reader whose short question runs a four-minute algorithm.
7. **Trust and provenance.** An object the assistant made has a Made by line "Assistant: <the
   request>". The reader cannot tell from the tree which rows are theirs and which are the
   assistant's without opening each. For a reproducibility persona this matters.
8. **The assistant and Focus.** If Focus is on, tools scope to the focused Set. Does the
   assistant? If it does, "find groups" while focused on 6 nodes gives a surprise; if it does
   not, the assistant's objects land at the root while the reader is looking at a subset.

**Options.**

- A. The assistant is exactly a reader at the keyboard: every action is a command the reader
  could have issued, scoped as the reader's tools are scoped, named by the element, placed
  at the top, undone one command at a time.
- B. The assistant is a batch author: one request is one journal cause group; its objects are
  created in one batch with the batch's coalesced painting (one visible Encoding, the rest eye
  off); undo is one step; a small "assistant" glyph on each row it made (Figma marks
  component instances with a glyph in the same way).
- C. The assistant proposes, the reader accepts: objects appear in a "proposed" state with
  Accept and Discard in the row, and paint nothing until accepted. Honest and safe, and a
  seventh state plus a review step on every answer.

**Recommendation.** B. One request is one undo step and one visual batch, so the tree does
not fill with three rows of which two are invisible. Mark assistant-made rows with a small
glyph (the same glyph in Made by), so provenance is scannable. Scope the assistant as the
tools are scoped (to what is showing), and make the assistant's reply say so ("in the 6 nodes
you are focused on"). Give the assistant `session.estimate` so a waiting row is reported as
waiting. Name rows by the element's plain name and put the request in Made by; a name that is
a sentence does not fit a 240 px row. Do not build C: a review step on every answer is a
dialog by another name.

Element side, beyond #337: the assistant's tool schemas become the commands entry point; the
`ai-stream-tool-result` event must carry the object ids it created so the transcript row can
link to the tree; cancelling the request must cancel the run it started.

**Prototype first.** A mock of the Assistant dock with one turn that made three objects
("Made: Communities (Louvain), Bridges (Betweenness), Top 10 by Bridges") and the tree showing
the three rows with the assistant glyph, one painted and two with eyes off, plus a History
dock row "Assistant: who bridges the two halves (3 objects)" as a single undo step.

## 11. Other edges met on the way

Shorter, because the feature-fit files already argue them; listed here so the ranking below
is complete.

- **A filter does not hide.** In every graph tool a reader has used, a filter hides. Here the
  Filter tool's Create makes a Set that paints and hides nothing; Focus hides. Feature-fit 2
  (section 3.1) proposes a third popover button "Create and focus". Adopt it; the two-step
  version will be the first complaint from every Gephi user.
- **The mask cannot name a Set.** The element's visibility filter accepts eight kinds
  (`graphty-element/src/session/visibility/filter.ts`: expression, range, categories, degree,
  component, neighborhood, edges, and the combinators) and none of them is "the members of a
  saved set". So Focus on a fixed Set (a promoted selection) has no element path until the set
  vocabulary is unified. Focus is the model's most-used verb and it is blocked.
- **`highlight()` is exclusive and the auto-apply policy drops a suggestion when an authored
  layer holds the channel** (`graphty-element/src/session/styles/StylesApi.ts`,
  `autoApply.ts`). Both are correct for a layer stack and wrong for a tree: a second Path
  would delete the first, and a new Measure would appear with no picture. Both must change
  before a second object can exist (feature-fit 5, notes A2 and A3).
- **Replace dataset deletes the tree.** "Load Tuesday's file, keep my objects" is
  export-recipe, replace, run-recipe (feature-fit 1, note C). The reproducibility persona's
  weekly task is three steps and a file until the recipe and load-mode work lands.
- **Pinned is a Set whose members are a state**, appearing and disappearing on its own
  (feature-fit 4, section 6.1). The one row that breaks "every row was made by a tool or a
  run". Accepted; it needs a `{kind: "pinned"}` scope in the element so the app does not keep
  the pin list.
- **One run, several rows.** HITS, a pairing and a cut make two objects from one run; the
  objects API must key rows by (run, field, layer) and remove the run with its last row
  (feature-fit 3, note 1). Until then these show one row with a Field select.
- **Views drift.** A View is a bookmark, not a container; after orbiting, "current" is stale
  and the model borrows the stale dot for it (feature-fit 6, note 2.4). Fine; noted so the
  same glyph is not read as "object out of date" on a Views row.

## 12. Findings, ranked

Severity: **blocker** means the model cannot be built or evaluated honestly until it is
resolved; **major** means a persona workflow or a core promise of the model fails without it;
**minor** means a rough edge with a cheap workaround.

| # | Severity | What | Where |
|---|---|---|---|
| 1 | blocker | Staleness: the element derives stale only from the scope digest; the model needs stale on data change, parameter edit, linked-input re-run and parent re-run, with propagation. Needs hash-based staleness in the objects API before any live object can be trusted | `object-model.md` section 5; `graphty-element/src/session/runs/RunsApi.ts` `staleOf` |
| 2 | blocker | Focus cannot name a Set: the mask's filter kinds have no "members of a saved set", so the model's most-used verb has no element path until the set vocabulary is unified | `object-model.md` section 7; `graphty-element/src/session/visibility/filter.ts` |
| 3 | blocker | Two element rules contradict the tree: `highlight()` is exclusive (a second Path deletes the first) and auto-apply drops a suggestion when an authored layer holds the channel (a new Measure appears with no picture) | `graphty-element/src/session/styles/StylesApi.ts`; `graphty-element/src/session/styles/autoApply.ts`; `feature-fit/5-styling.md` A2, A3 |
| 4 | major | Undo across re-runs: the element replaces a run's result, so the inverse of a re-run has nothing to restore; redo of a creation is a recompute; dependants (Top 10) are not undone with their input. Needs kept results and cause-grouped journal entries (#145) | `object-model.md` section 9 "Undo"; `feature-fit/7-.md` note E |
| 5 | major | Large graphs: a Grouping with 200 groups is 200 rows; row hover outlines up to 10,000 members per mouse move; picking a Set row above 5,000 members halos a lie; "Covered by" needs `explain()` per member. Needs bounded Group rows, a hover threshold, soft selection and mask-based coverage | `object-model.md` sections 2.4, 6.2, 8; `graphty-element/src/session/selection/SelectionApi.ts` `DEFAULT_SELECTION_CAP` |
| 6 | major | Edges are unpickable (#319), a node Set cannot paint its inside edges (no induced-edge selector), edge objects have no distinct row icon, and there is no selected-edge look. Half the material has no inspector and the community-structure styling every persona wants next has no control | `feature-fit/5-styling.md` A1; `feature-fit/2-selection.md` 2.1; `object-model.md` 4.8 |
| 7 | major | The assistant's tools write layers with no rows (`findAndStyleNodes`) and delete every layer (`clearStyles`); one request can create several objects with no batch painting, no single undo, no provenance glyph, no cost-gate awareness, and no knowledge of the tree or Focus | `graphty-element/src/ai/commands/StyleCommands.ts`; `feature-fit/7-.md` note A; `object-model.md` section 9 "AI assistant" |
| 8 | major | Two selections, one inspector: Delete deletes an object or removes nodes from the data depending on what was clicked last; the mode error the comparison document warned about | `object-model.md` section 8; `feature-fit/7-.md` note F |
| 9 | major | Long-running creation: queued runs show a computing ring that is not computing; a frame-blocking run freezes the app with a static ring; cancel throws away a usable partial sample; the waiting state needs a second click the toolbar promise did not mention | `object-model.md` sections 3 and 5; `feature-fit/3-algorithms.md` notes 3 and 7 |
| 10 | major | Group identity across re-runs: the model promises names, notes and overrides follow a group by overlap matching; the element has label matching only, and Louvain labels are not stable, so "Group 2" may be a different community wearing the reader's override | `object-model.md` section 5 "Re-runs keep the seed"; issue #191 |
| 11 | major | Filter does not hide: Create makes a painted Set and Focus is a second step; every Gephi and Cytoscape reader expects one. Add "Create and focus" | `feature-fit/2-selection.md` 3.1; `mocks/screens.md` screen 7 |
| 12 | major | XR is a viewer with no object verbs in this phase (no eye, no Focus, no re-run); the model does not say so plainly, and the element's in-headset UI is a corner button | `feature-fit/6-camera.md` 3.3; `graphty-element/src/ui/XRUIManager.ts` |
| 13 | minor | Partial cover has no sign in the tree; the covered-chip dimming only handles full cover, and the legend's ramp block does not say "except N nodes" | `mocks/screens.md` screens 4 and 6; `object-model.md` 6.2 |
| 14 | minor | "Fill" names three row shapes (paint row, encoding block, inherited line); a Measure row click halos nothing while a Set row click halos members. Consider "Encoding" for measures and a transient top-N highlight on click | `object-model.md` 4.2 to 4.5, section 8 |
| 15 | minor | One-node Sets pile up (ten recolours, ten rows) and the paint door is the last row of the node inspector; move it up, name it "Fill...", and add "Add to [set v]" on the single-node inspector | `object-model.md` 4.8, decision 19; `mocks/screens.md` screen 4 |
| 16 | minor | 3D: Select-drag must orbit in 3D and Shift-drag marquee; the slab marquee selects hidden depth; the "100%" readout has no 3D meaning and the header changes shape between modes | `feature-fit/6-camera.md` 2.2, 2.3; `object-model.md` section 8 "Drag on empty canvas" |
| 17 | minor | Add data while Focus is on: new nodes arrive outside the mask and nothing visible changes except the status bar count | `object-model.md` sections 5 and 7 |
| 18 | minor | The "live filter" threshold is a shipped default, not a measurement; a rule Set may be live on one machine and stale-with-a-button on another with no visible reason | `graphty-element/src/session/limits.ts`; `object-model.md` decision 9 |
| 19 | minor | Replace dataset deletes the tree; "same objects on new data" is three steps and a file until load mode and recipes exist | `feature-fit/1-data.md` note C |
| 20 | minor | Pinned is a system Set whose members are a state; it needs a `{kind: "pinned"}` scope so the app keeps no pin list | `feature-fit/4-layouts.md` 6.1 |

## 13. What to prototype first, in order

1. **A headless-session staleness script** (finding 1): create a rule Set, a Grouping within
   it and a linked Top 10; apply Add data, a parameter edit and a scope edit; print what the
   hash rule marks stale. This is the objects API's first acceptance test and costs no UI.
2. **A headless-session undo test** (finding 4): Bridges, Top 10, re-run with a new seed,
   apply the inverse; the Top 10 must come back with its old members.
3. **A 20,000-node Storybook story** (finding 5) measuring hover outline time over 10,000
   members, `selection.statistics` over 12,000 members, and frame rate during a colour repaint.
   Three numbers that decide whether the tree's Figma borrowings survive scale.
4. **Screen 3 with partial cover and an edge Set** (findings 6 and 13): a Path row partly
   covering Group 2 with the half-chip, the "Covered by" line, the legend departure, and a
   spanning-tree edge Set with a line icon, selected, its edges haloed.
5. **Screen 4 with the paint door moved up** (finding 15) and a Delete-key walkthrough with a
   visible focus indicator (finding 8).
6. **The batch and assistant mocks** (findings 7 and 9): six Measures in five states with the
   status bar chip, and an Assistant turn that made three objects as one undo step.
7. **Screen 3 in 3D** (finding 16) with the framing name in the header and a Shift-marquee
   mid-gesture.

Everything in 1 to 3 is element work that must land before the UI can be honest about live
objects; 4 to 7 are static mocks in the existing kit and can be built now.
