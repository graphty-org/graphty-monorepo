# Which VR mocks to build for graphty, and in what order

Date: 2026-10-10. Written by the studio director for graphty's owner.

## What this page is

graphty's VR design studio reviewed 46 paper designs for controlling graphty in a headset (the
files are [prototype-1.md](prototypes/prototype-1.md) to [prototype-46.md](prototypes/prototype-46.md); the studio's report is [xr-prototype-studio.md](xr-prototype-studio.md)).
None of them met the studio's bar for implementation. The next step is to build mocks: working
headset prototypes that let people try an idea instead of reading about it.

A mock here is a spike of one whole interaction model -- a complete, different idea of how graphty
could work in a headset. In every mock a person can do graphty's basic journey end to end, without
taking the headset off: open a dataset, get oriented, find a node, explore its neighbors, run an
analysis, read the result, color and size the graph by it, filter, write a note, undo a mistake and
save. A mock is not a test of one technique (a tag layer, a menu, a text renderer). Where a
technique was worth keeping, it is a feature inside one of the mocks below.

All six mocks run in full VR on a plain colored background, on Meta Quest 3 / 3S, Samsung Galaxy XR
and Apple Vision Pro, with hands alone and no voice required. They differ only in interactions,
controls and menus. Five need no AI; one is AI-mediated and still works completely with the AI and
voice switched off.

Each mock has a full specification in the `mocks` folder beside this file (`mock-<name>.md`, linked below), reviewed once by four
reviewers (an advocate for this brief, a VR interaction designer, a real user persona walking a
hard task, and a WebXR engineer); Paired Browser was reviewed twice. Every finding the reviewers
rated serious or worse has a fix written into its spec. Those fixes are on paper and, apart from
Paired Browser's first round, have not been reviewed again.

Three terms used below:

- **The proof journey.** Besides the basic journey, each mock owns one of graphty's six hard
  real-world tasks (from the functionality inventory (a studio working file, not committed)), walked step by step in its spec, to show
  that real work is possible in it and not only a demo.
- **The graph-use rule.** A mock must show that the graph in space is used, not just displayed. Over
  the basic journey, at least one act in four must land on the graph itself (a pinch, sweep, slice
  or hold on nodes, edges or regions) rather than on a panel. A mock that misses this is a desktop
  app in a headset and is reworked or dropped, whatever else it scores. One mock is built knowingly
  under it: Facet Browser, whose whole question is whether people need to point at nodes at all
  (its section below says why, and what result drops it).
- **The shared foundation.** Pieces built once and used under every mock, so the six compare
  interaction rather than plumbing: a toolkit for drawing panels, lists, forms and a keyboard inside
  the scene (the browser's own page cannot be shown in VR); a text and file service (headset storage
  and keyboard by default, an optional paired laptop and phone,
  [shared-text-and-file-service.md](mocks/shared-text-and-file-service.md)); and a few additions to graphty-element that any consumer would
  need (letting the app own XR input, a Vision Pro pointer path, a temporary highlight for previews,
  a count before a command runs).

## The ranked list

| Rank | Mock           | The idea in a phrase                                              | Where the commands live                                                  | AI                                            | Rough size of the mock                                |
| ---- | -------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------- | ----------------------------------------------------- |
| 1    | Paired Browser | Every object has a page; hold any node for its commands           | A reader panel of pages, and a hold-to-open command menu on the graph    | none                                          | 6 weeks, 3 engineers, including the shared foundation |
| 2    | Prop and Plane | Hold the graph in one hand and cut it with a plate in the other   | The plate itself: how it is held and where it is laid                    | none                                          | 7 to 9 weeks, 2 or 3 engineers; the largest           |
| 3    | Findings Inbox | graphty goes first; you file what it finds                        | A stack of cards under the graph                                         | none (findings come from existing algorithms) | 4 weeks, 3 engineers, on the foundation               |
| 4    | Point and Ask  | Point at what you mean, say or type what you want, check, then Go | A sentence of editable tiles, and a rail of controls each request leaves | optional language model                       | 5 to 6 weeks, 3 engineers                             |
| 5    | Cutting Room   | The analysis is a film timeline you can edit after the fact       | A timeline of steps under the graph, and a look-only monitor             | none                                          | 5 to 6 weeks, 3 engineers                             |
| 6    | Facet Browser  | Narrow the data instead of pointing at nodes                      | A rail of attribute value lists, a live query bar, paint shelves         | none                                          | 4 to 6 weeks, 2 or 3 engineers                        |

Sizes are each spec's own estimate for the basic journey plus its proof journey, rounded. Built in
sequence on one shared foundation, the six together come to roughly 90 engineer-weeks, about seven
months for a team of three.

The ranking weighs four things: what the mock teaches that no other mock can, how strongly the
graph in space carries the work, the studio's evidence for the underlying design, and the risk that
the mock fails for reasons that teach nothing.

---

### 1. Paired Browser

Spec: [mock-paired-browser.md](mocks/mock-paired-browser.md) (titled "Graph Browser" inside). Built on Paired Browser (prototype
44), which contains Graph Browser (28) whole, with Hotbox (26) as its fast command menu.

**The idea.** Every object graphty knows -- the graph, a node, an edge, a set, a run, a style layer,
a filter step, a note, the project -- has a page in a reader panel beside the graph, with its facts,
its commands as worded buttons that say how much they change ("Hide: 1 family, 2 marriages"), and
links to everything it mentions. You move from page to page while the graph shows the page you are
on; holding a pinch on any node in the graph opens that node's commands right there, and sliding to
one and letting go runs it, while the other hand gathers nodes from the graph or cites them into a
note.

**Why it is worth building.** It is the design closest to the studio's bar (mean 3.94 of 5 in its
last round, nothing under 3.5) and all three of the studio's judges ranked it first. It is also the
plain, familiar baseline -- a web browser beside a graph -- that every other mock is measured
against: if a more inventive mock cannot beat it, the invention did not pay. And it builds the
shared foundation the other five reuse.

**End to end.** Open Florentine families from the headset's own files; read "16 families, 20
marriages, 2 pieces" on the graph page; pinch Medici for its page and follow "+6 marriages" to light
the in-laws; run PageRank from a generated options form and read the ranking beside its histogram;
paint by it with a live preview; filter with a cut handle that settles "between Tornabuoni 0.071 and
Ridolfi 0.069 -- keeps 5 of 16"; type a note on the in-scene keyboard while the other hand cites
nodes from the graph; take back a wrong hide with "Undo: Hide Medici"; save. About 35 acts. Proof
journey: rank hub genes in a protein network and defend the choice (four centralities, a review of
the top ten, "what if removed" on the top three).

**What it uniquely teaches.** Whether getting around by object pages and links works in a headset
when Back (where you looked) is kept apart from a named Undo (what you changed); what a hold on the
thing itself is worth against a button on a page; and whether two hands doing different jobs (one
reads and types, the other gathers from the graph) is something people do unprompted.

**Biggest risk.** That people stop looking at the graph. The scripted basic journey puts 29 percent
of its acts on the graph, just over the graph-use rule, and the proof journey only 15 percent,
because ranking and reviewing read best as lists. The mock decides this on an unscripted run in
which people get goals rather than steps; if they choose the panel every time, this idea belongs
inside another design rather than standing alone, and that is the finding. Second risk: the in-scene
widget toolkit, which one engineer owns for four weeks.

**Size.** Three engineers, six weeks. Weeks 1 and 2 build the shared foundation (toolkit, keyboard,
headset files, the graphty-element input change); weeks 3 to 5 the pages, the hold menu, the
two-handed gather, the basic and proof journeys; week 6 a novice walk on Vision Pro.

---

### 2. Prop and Plane

Spec: [mock-prop-and-plane.md](mocks/mock-prop-and-plane.md). Built on Prop and Plane (prototype 38), after Hinckley and
colleagues' two-handed props for neurosurgical planning (CHI 1994).

**The idea.** Your off hand holds a small stand-in of the graph low in front of you and turns the
real graph with it; your dominant hand holds a plate that cuts through the stand-in like a knife
through a loaf, and the thin slice it passes through is drawn flat and labeled on the plate, with a
crosshair that snaps node to node, while the same slice lights up inside the real graph. The
commonest commands are ways of holding the plate rather than menu presses -- tilt it toward you to
grow the slice by one hop, lay it on a swatch to paint or run, hold it edge-on across a row of
values to set a threshold, slide it through two stacked networks to see what changed -- and a
separate clipboard panel holds forms, notes and files.

**Why it is worth building.** It is the only design in the set that a monitor and mouse cannot
reproduce, so it is the only one that can answer the question behind the whole effort: is anything
better in a headset? It is also by far the strongest on the graph-use rule: about 60 percent of the
basic journey's acts are on the plate (18 of 30 with controllers). The studio scored the original
design lowest of the finalists (3.31) and two judges ranked it last, mainly for neck and arm strain
from reaching into the graph; this version moves both hands into the lap, as Hinckley's surgeons
worked, which answers those findings on paper.

**End to end.** Open Florentine families from the clipboard; turn the graph from your lap; slice
through it and press when the crosshair rests on Medici; tilt the plate to grow to his six in-laws
and select them; run PageRank from the clipboard; lay the slice on the "color and size by" swatch
and push through to spread it to the whole graph; lay the graph out along PageRank and hold the
plate edge-on across the row until it snaps between Ridolfi and Tornabuoni ("keeps 5 of 16"); write
a note on the clipboard; undo a mistaken filter; save. Finding "TP53" in a 10,000-node network
brings its slice to the plate with the crosshair already on it. Proof journey: disease versus
control, two networks stacked on the same positions and compared by sliding the plate through them.

**What it uniquely teaches.** Whether commands carried by how an object is held (stances) can
replace menu presses without firing by accident; whether a flat slice on a held plate is the best
answer to picking one node in a dense 3D graph; whether sliding through stacked conditions beats
side-by-side views for seeing change; and how much real work stays on a panel even in the most
physical design.

**Biggest risk.** The hands-only plate: a flat hand that must stay a stable plane, pinch to commit
without bending, and be tracked low in the lap where Quest's hand tracking is weakest. It is the
whole design on Vision Pro, which has no controllers (and there the person must also grant hand
tracking). The mock builds the controller version first, so the idea can be judged even if hands
are not yet precise enough. The lap posture and the stances are themselves new and unreviewed.

**Size.** The largest. About 4 weeks for two or three engineers for the controller version on Quest
3 (basic journey, proof journey, a route investigation), once the shared foundation exists; then 2
to 3 weeks of hand-tracking tuning on the device; then Galaxy XR and Vision Pro. The stacked
networks and the layout along a value are precomputed in the mock.

---

### 3. Findings Inbox

Spec: [mock-findings-inbox.md](mocks/mock-findings-inbox.md). Built on Findings Inbox (prototype 42).

**The idea.** graphty takes the first turn: as soon as data loads, or a case starts on an account or
a gene, it runs the cheap analyses it already has and posts each finding as a card on a stack under
the graph, and the graph turns to frame each card's subject while you read it. You file each card
with one short flick (up "this matters", down "not this", right "not now") or hold it to dig in;
what you ask for yourself comes back as a card too, nothing changes the project until you press a
command, and the board of kept cards, one column per case, becomes the report.

**Why it is worth building.** Every other mock tries to make commands cheaper to give in a headset;
this is the only one that tries to need fewer of them, by letting the machine do the first pass and
the navigating. A headset is poor at skimming small text, typing and precise pointing, and good at
looking at a structure while turning it; this design leans on exactly that. It needs no new engine
(the findings are existing algorithms, precomputed for the mock), and its review evidence is strong
on coverage (4.5 of 5).

**End to end.** The load card ("16 families, 20 marriages, nothing dropped"); the overview card
frames the whole graph; the standout card frames Medici ("6 marriages, 2.4 times the average") and
its "who they married into" returns the in-laws to your slot; the PageRank card already ran, and
digging opens the ranking with its histogram and options; paint by it and keep the top 5 as a filter
from the dig sheet; find Ridolfi yourself (no card posted it) and run betweenness on it; pinch Medici
and write a note; undo a mistaken paint; save. About 34 acts, 29 percent on the graph. Proof journey:
a fraud ring from a flagged account, worked as a case, closed, then a second alert replayed from the
first case's steps.

**What it uniquely teaches.** Whether "fewer commands" beats "cheaper commands" (the hypothesis is
at most 80 percent of Paired Browser's acts for the same tasks); whether a view that moves itself to
show you something orients or sickens; whether a headset can be mostly a reading device for
analysis; and whether a case boundary makes per-alert work fast enough for a queue of fifty a day.

**Biggest risk.** The machine sets the agenda, and after the first pass the design may turn into a
browser with an inbox in front. Both are measured (a planted finding the rules skip, a blind
dataset, and the share of acts on machine-posted cards against Paired Browser). Authoring work such
as a weighted score is not triage and stays slow here.

**Size.** About 4 weeks for three engineers on the shared foundation (the spec's six-week plan
includes two weeks of foundation): the basic journey in weeks 3 and 4, the fraud journey with five
alerts in weeks 5 and 6.

---

### 4. Point and Ask

Spec: [mock-point-and-ask.md](mocks/mock-point-and-ask.md). Built on Point and Ask (prototype 34), with the command sentence of
Search Everything (25) as its hand path. This is the set's AI-mediated design.

**The idea.** Point at what you mean -- pinch nodes, rows, layers or runs into a numbered tray, or
name far ones by two-letter tags -- then say or type what you want in your own words; graphty shows
the request back as a sentence of editable tiles in its own command terms ("Route from [1 Medici]
to [2 Strozzi]") over a preview with counts, leaves any value you did not give as an empty glowing
tile rather than inventing it, and runs nothing until Go. Each request leaves its main control (a
hops stepper, a threshold handle) on a rail beside the graph, so the workspace is built by use;
with no model and no voice, the same sentence is built by hand by pinching an object, then one of
its verb tiles, then filling the slots from the graph.

**Why it is worth building.** Language is the largest efficiency lever the studio found: the long
authoring steps (rules, composite scores, batches) that cost every other design 11 to 17 acts take
about 7 spoken. It is the only design that binds several pointed targets into one request, and the
only one that tests whether people read what an assistant will do before they let it -- a number
every AI feature in graphty will need, on the 2D page as much as in a headset.

**End to end (typed, on Quest, no model).** Ask "how is this graph put together" for an overview;
pinch Medici and ask "who did they marry"; read "Select neighbors of [1 Medici], 1 hop -- +6
families" and press Go; "run pagerank", with a check list of the defaults you did not touch; "color
and size by it", leaving a color control on the rail; "keep only the strong ones", answered with
counted choices ("top 3 -- top 5 -- top half -- as is"); type a note on 1; "undo"; "save". About 30
acts, 30 percent on the graph. A spoken walk on Galaxy XR uses the model and catches one seeded
wrong tile before Go. Proof journey: a first session ever, unaided, then a weighted hub score from
four centralities.

**What it uniquely teaches.** Whether words can carry the work a headset is worst at; whether
pointing and speaking fuse into one act ("this" plus a request); what share of real requests a
headset handles with no network; whether two-letter tags answer dense picking; whether a visible
privacy route (what leaves the headset, shown before sending) is one analysts accept.

**Biggest risk.** On Quest, which has no speech recognition in its browser, the main path is typing,
and the design can slide into a typed command palette with the graph beside it; its 30 percent on
the graph depends on people filling slots by pinching the glowing nodes rather than typing names.
Also: confidential data leaving the headset, and people pressing Go without reading the tiles. Both
are measured.

**Size.** The whole design is about 19 engineer-weeks; the mock is cut to the basic journey, the
first-session journey, the composite score and the first six steps of a fraud investigation, about
5 to 6 weeks for three engineers. The hard part is the on-headset compiler, built as a grammar
generated from graphty's command descriptors.

---

### 5. Cutting Room

Spec: [mock-cutting-room.md](mocks/mock-cutting-room.md). Built on Cutting Room (prototype 23), with the editable step record of
Editable Record (45).

**The idea.** graphty in a headset is a film editing suite: every change you make lands as a clip
on a timeline under the graph, and the graph is whatever the enabled clips produce, in order.
Pressing anything only shows it in a look-only monitor and records nothing; only a command lands a
clip, and any old clip can be changed in place -- by dragging its handles on the graph itself, such
as pulling a hop ring around a group inward -- with a bar that counts what will replay, break or
change before it applies.

**Why it is worth building.** It is the only design whose way of working is editing the history.
Fixing step 8 while keeping the seven good steps after it, and replaying a week's work on next
week's data, were what weekly analysts in the studio valued most. It had the largest score climb in
the studio (to 3.63) and tied for best efficiency among the finalists.

**End to end.** Pinch nodes freely and nothing is recorded; "Select neighbors" of Medici lands a
selection clip; PageRank lands an analysis clip; painting lands a style clip; a filter at 0.070
lands a clip that reads as a sentence ("Keep families with PageRank at least [0.070]"); a note
lands on the notes track. The mistake is fixed in place: hold the wrong clip and what it touched
lights up on the graph, pull its hop ring back from 2 hops to 1, read the bar's count of what will
replay, apply. Drag the playhead back and the graph animates through the session. Save. About 39
acts, 26 percent on the graph. Proof journey: publish the analysis a week later -- fix a step eight
steps back, replay the steps on new data with each changed reference stopping to ask rather than
silently re-binding, and export the timeline as the methods section.

**What it uniquely teaches.** Whether a visible, editable history is worth half the scene in a
headset or whether an undo list is enough; whether provenance drawn and edited on the real nodes
helps people predict consequences; whether a replay can be trusted enough to publish from; and
whether "press to look, command to act" calms first sessions without slowing experts.

**Biggest risk.** The replay engine. graphty-element cannot yet re-run its own history with one step
edited; the mock replays for real on small graphs and uses precomputed states on large ones, so
unscripted edits at scale say "not in this mock". Second, it clears the graph-use rule by one act,
and only if people use the handles on the graph rather than the slots in the monitor; much of the
idea would also work on a monitor.

**Size.** Three engineers, 5 to 6 weeks, in two tiers: the basic journey, the proof journey and a
path investigation first; branches and the comparison lane only if time allows.

---

### 6. Facet Browser

Spec: [mock-facet-browser.md](mocks/mock-facet-browser.md). Built on Facet Browser (prototype 41), with the paint shelves of
Encoding Shelves (29).

**The idea.** You work on the data rather than aiming at nodes: every attribute and every computed
result is a facet on a rail beside the graph, listing its values with a count for each, and tapping
values builds one live query whose matches graphty highlights or filters. The graph is the query's
other input -- sweep a box through a region of the graph and it becomes a chip ("in this region -- 7
families") with related chips offered beside it ("most connected here: Medici"), and painting is
carrying a facet into the graph and releasing it on a color or size ring.

**Why it is worth building.** It is the only design that answers the hardest act in VR, picking one
small node in a dense 3D graph, by not pointing at all: nodes are found by region, value, range and
relation, none of which depend on target size. Its posture is the calmest of the six (arms low,
nothing held, large targets), and the studio scored it well on VR usability, comfort and buildability
(4 each, mean 3.75).

**End to end.** Load Florentine families with three facets pinned; tap a bar to orient; sweep the
dense knot at the graph's center and take "most connected here: Medici"; pivot to his neighbors and
watch every facet recount for them; add PageRank as a histogram facet and carry it onto the color
ring in the graph; drag its handle to 0.070 ("5 of 16; Ridolfi and Castellani at 0.069 are out") and
keep it as a filter; note on Medici's card; undo a mistaken hide, which is told apart in words from
going back a query step; save. About 33 acts. Proof journey: a gene list joined to an expression
table, colored by fold change, sized by p-value, clustered and filtered.

**What it uniquely teaches.** Whether a headset user needs to aim at nodes at all -- if people finish
faster here than in the mocks that point, graphty in VR should be built around the query, not the
cursor; whether a region of the graph works as a query input; whether painting at the graph beats
painting at a panel; and whether the whole journey can be done without pointing, by switch access.

**It is built knowingly under the graph-use rule.** Counting sweeps, node taps and paint releases
only, the basic journey puts 6 of 33 acts on the graph (18 percent); counting the chips taken from the
tray beside a sweep it is 11 of 33; the proof journey is about 1 in 6. By the set's own rule that is a
desktop app in a headset. It is not reworked to raise the count, because adding node acts would
remove the one thing it tests: whether people need to aim at nodes at all, which only a design that
mostly does not aim can answer. Its result is read as that comparison against the five mocks that
point. If on its free task people also leave the graph alone -- the graph becomes a picture beside a
rail -- the finding is that a query rail does not need a headset, and it is not carried forward as a
design of its own; its sweeps, region chips and paint ring go into another host.

**Biggest risk.** The facet engine (per-value counts, relational facets), stubbed in a worker for the
mock but real graphty-element work for the product.

**Size.** With the shared foundation built, two or three engineers for about 4 weeks for the basic
and proof journeys; weeks 5 and 6 add a fraud case journey and the no-pointing focus mode. It is the
first mock to cut if the budget runs short.

---

## How the set covers the space of ideas

**Six different answers to "where do the commands live, and what does my next input mean?"**

| Mock           | The main surface    | What the next input means                                                   | Who goes first                |
| -------------- | ------------------- | --------------------------------------------------------------------------- | ----------------------------- |
| Paired Browser | A page              | It acts on the object whose page you are on, or the node you are holding    | You                           |
| Prop and Plane | A held plate        | Its stance: slicing, tilted, on a swatch, edge-on, stacked                  | You                           |
| Findings Inbox | A card stack        | It files or opens the top card                                              | graphty                       |
| Point and Ask  | A sentence of tiles | It adds a target or fills a slot in the request being built                 | You, with a literal assistant |
| Cutting Room   | A timeline          | Looking is free; only a command lands a step; old steps are edited in place | You                           |
| Facet Browser  | A live query        | It narrows the query; a switch says whether the query highlights or filters | You                           |

**Kinds.** One plain design (Paired Browser), two usage paradigms with no metaphor (Findings Inbox,
Facet Browser), one design only a headset can do (Prop and Plane), one metaphor (Cutting Room) and
one AI-mediated design (Point and Ask). Five need no AI; the sixth is complete without it.

**Six answers to picking one node in a dense 3D graph,** compared head to head in one shared test
(12 scattered nodes among 400 and among 10,000, on Quest 3 with hands and with controllers): a hold
with a "which one?" card when several nodes sit under the pinch (Paired Browser); a slice drawn flat
on a plate with a snapping crosshair (Prop and Plane); the machine framing the node for you, with a
walk through crowded candidates nearest first (Findings Inbox); two-letter tags you type or say
(Point and Ask); finding it in the monitor's list or a magnified region (Cutting Room); and not
pointing at all, narrowing by region and value (Facet Browser).

**Six of graphty's hard tasks, one per mock.** Each mock walks the basic journey, and each owns one
of the six stress journeys as its proof: ranking hub genes (Paired Browser), disease versus control
(Prop and Plane), a fraud ring from a flagged account (Findings Inbox), a first session and a
composite score (Point and Ask), publishing the analysis a week later (Cutting Room), and a gene list
to an expression map (Facet Browser). So every hard task is walked by the design best placed to show
it.

**Parity with the desktop app grows without VR code.** In every mock, every list of algorithms,
layouts, options and style properties is generated from graphty-element's own descriptions of them,
so a plugin's algorithm appears complete in all six with no headset work.

**Which of the 46 designs live on, and where.** Six designs are the hosts. The best techniques of
the others are features inside them:

| Idea                                                                                                                      | From                                                 | Lives in                                                                         |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| Object pages with worded commands, links, generated forms; Back kept apart from Undo                                      | Graph Browser (28), Paired Browser (44)              | Paired Browser; Prop and Plane's clipboard                                       |
| A hold-to-open command menu with every command one gesture away; "Again" on a new target                                  | Hotbox (26), Verb, Count, Scope (33)                 | Paired Browser                                                                   |
| Counted outcomes with "as is" first ("top 5 -- top half -- as is")                                                        | Fast Ring over Pages (46), Variant Grid (43)         | Paired Browser, Point and Ask                                                    |
| A "which one?" list when a pinch lands among several nodes; a small hand menu                                             | Hand Menu and Windows (24)                           | Paired Browser, Findings Inbox                                                   |
| A sorted list beside its histogram with one cut handle                                                                    | Linked Views (18)                                    | Paired Browser, Findings Inbox                                                   |
| A cut handle that settles between two named values ("between Ridolfi 0.069 and Tornabuoni 0.071")                         | The Sheet (27), Physics Lab (15), Facet Browser (41) | Facet Browser, Paired Browser, Prop and Plane                                    |
| A row cursor that files a row and moves to the next                                                                       | Graph Browser (28)                                   | Paired Browser, Findings Inbox, Facet Browser                                    |
| Press to preview, release to commit, slide off to cancel; a check list of untouched defaults                              | One Question at a Time (30)                          | All six (the activation rule); Paired Browser and Point and Ask (the check list) |
| A person's judgment recorded as a review step (yes, no, skip); a methods page                                             | Patch Bay (32)                                       | All six; Findings Inbox, Cutting Room                                            |
| The arm-load floor: only a pinch and a flat hand, a one-hand alternative for every held act, lost tracking always cancels | Editable Record (45)                                 | All six                                                                          |
| The phone as a keyboard, its keys mirrored under the field                                                                | Phone in Hand (39)                                   | All six, through the shared text service                                         |
| Triage of machine findings; cases; the board as the report                                                                | Findings Inbox (42)                                  | Findings Inbox                                                                   |
| A pending guess corrected by counter-example ("more like this", "not this one")                                           | Show Me (19)                                         | Findings Inbox                                                                   |
| A ghost that names the target and counts the effect before a command lands                                                | Pilot and Navigator (20)                             | Findings Inbox                                                                   |
| The held graph and plate; the slice; stacks sliced by the plate                                                           | Prop and Plane (38)                                  | Prop and Plane                                                                   |
| Two counts inside a region, then spread to the whole graph                                                                | Lens Kit (31)                                        | Prop and Plane                                                                   |
| A count before release; drag back past the start to cancel                                                                | Lean In (12)                                         | Prop and Plane                                                                   |
| Two held copies touched together show only the commands that take two things                                              | Voodoo Dolls (14)                                    | Prop and Plane                                                                   |
| The target tray, slot tiles, a rail of live controls                                                                      | Point and Ask (34), Mixing Desk (21)                 | Point and Ask                                                                    |
| A command sentence with typed slots                                                                                       | Search Everything (25)                               | Point and Ask, Cutting Room                                                      |
| Two-letter tags at a constant size                                                                                        | Hint Keys (35)                                       | Point and Ask                                                                    |
| Fix one word by pressing its tile                                                                                         | Point and Say (2)                                    | Point and Ask                                                                    |
| The timeline, look-only monitor, edit in place, ripple count, forks                                                       | Cutting Room (23), Editable Record (45)              | Cutting Room                                                                     |
| What a step touched, lit before you change it                                                                             | Hand of Cards (13)                                   | Cutting Room                                                                     |
| Strike, restore and bracket steps into a reusable recipe                                                                  | Proofreader's Slate (16)                             | Cutting Room                                                                     |
| The live query, relational facets, pivot to neighbors                                                                     | Facet Browser (41)                                   | Facet Browser                                                                    |
| Paint shelves that are also the legend and the answer to "why does this look like that"                                   | Encoding Shelves (29)                                | Facet Browser; Paired Browser's node pages                                       |
| Moving a focus step by step with no pointing, for switch access                                                           | Focus Remote (36)                                    | Facet Browser                                                                    |

**Ways of working no mock tests,** stated rather than hidden: two people sharing the controls (Pilot
and Navigator, 20), teaching by demonstration as the main way of working (Show Me, 19, appears only
as a feature), live mixing with no apply step (Mixing Desk, 21), hand distance as the mode (Lean In,
12), and tools held in the hand (Tool Belt, 4; Grip and Tool, 8). Each was dropped at screening for
its design's flaws; none was rebuilt to test whether the way of working itself fails. If a seventh
mock is wanted, the first candidate is One Question at a Time (30) as a whole design: you pick a
goal (or pinch an object for its tasks), graphty asks for what it still needs one large question at
a time, skipping what it can infer, previews every answer on the graph, and ends on a "check your
answers" card before anything runs. It would carry the full basic journey and its own proof journey
for everyday use, not only a first session; it was the calmest design and the best first session in
the studio, and its open question is whether that pace stays productive for an expert's tenth
session (its review scored coverage 3 and efficiency 3).

---

## The order to build them in

The ranking says what is most worth learning; the build order also follows what each mock needs
from the others.

1. **Paired Browser, weeks 1 to 6.** It builds the shared foundation in its first two weeks (the
   in-scene toolkit, the keyboard, headset files, and the graphty-element change that lets an app own
   XR input with a Vision Pro pointer path), and it is the baseline the other five are measured
   against, so it comes first.
2. **Findings Inbox, next.** The cheapest on the foundation, it needs no new engine, and it tests the
   most different way of working, which makes the first comparison informative.
3. **Prop and Plane, started alongside Findings Inbox.** Its core (the held graph and the plate)
   barely uses the panel toolkit, and its hand tracking is the longest and riskiest task in the
   program, so it should start as soon as the input change exists rather than wait its turn.
   Controllers on Quest first, then hands, then Galaxy XR and Vision Pro.
4. **Point and Ask.** Needs the count-before-commit and the privacy route; graphty's existing
   17-command assistant means the model side is not new. Its three voice checks (one per headset)
   run in its first week, before the voice path is built.
5. **Cutting Room.** Mockable on precomputed states; it is better built after graphty-element can
   replay its own history with one step edited, work that should start in the element behind a 2D
   history view while the earlier mocks are being built.
6. **Facet Browser, last.** Built only if the budget allows, and only if the earlier mocks leave the
   "do people need to point at all?" question open. It is built knowingly under the graph-use rule
   (its section above says why) and is the first to cut.

**Before any mock reaches a study with real users,** two defects that every proof journey depends on
must be fixed in graphty-element, so every consumer gets them: references (a kept set, a scope, a
time window, a recipe input, a note's target) must store what they resolved to and say so when a
re-run or new data would change it; and what is shown must be kept apart from what is analyzed, with
every run naming its scope.

**How the set is judged.** Every mock is measured the same way: the basic journey counted in acts,
errors and time in the headset alone, then with a paired laptop and phone; its proof journey; the
dense-picking test; an hour seated for arm, neck and eye comfort; a first session unaided; and the
graph-use rule. A mock that fails the graph-use rule is reworked or dropped, except Facet Browser,
which is built knowingly under it as the test of whether pointing is needed.
