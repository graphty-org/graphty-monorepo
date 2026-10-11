# Mock: Cutting Room

Date: 2026-10-10. For graphty's owner. One of the six VR mocks chosen in [the mock recommendation](../xr-prototype-mocks.md) (section 6).

**Built on** Cutting Room (prototype 23, [prototype-23.md](../prototypes/prototype-23.md)), with the record of Editable
Record (prototype 45, [prototype-45.md](../prototypes/prototype-45.md)). **Kind:** metaphor (film editing). **AI:** none
needed; the optional assistant only proposes clips. **Proof journey:** stress journey 6, "Publish
the analysis", from the functionality inventory (a studio working file, not committed), walked step by step in section 5.

---

## 1. The idea

In this design, graphty in a headset is a film editing suite. The graph floats in front of you: it
is the program monitor, the picture your edit produces. Below it lies a film editor's timeline.
Everything you do that changes the project -- selecting, running an algorithm, painting, laying
out, filtering, writing a note, marking a view -- lands on that timeline as a clip on a track, and
the graph is whatever the enabled clips produce, in order.

Looking is free. Pressing a node or a group on the graph opens a small peek card beside it;
pressing a row, a clip or the data shows it in the source monitor, a panel beside the graph.
Neither records anything. Only a verb (Select, Run, Color by this, Note) lands a clip. So a
first-time user can press anything without fear, and an expert can read the whole analysis as one
strip of clips.

The timeline and the graph are wired to each other in space, both ways:

- **Open a clip, and its values become handles on the graph.** Every value in the clip's sentence
  that points at the graph is something to take hold of: a ring around a group's hull that you pull
  outward or inward to change how many hops it reaches, a pin on a node that you drag onto another
  node to move a route's end or a filter's cut, a note's pin that you drag onto another group.
  Changing an old step is done on the graph, not in a form.
- **Hold a clip, and its consequences light up on the graph.** The families it hid, the nodes it
  colored, the note pinned to its group -- everything it and the clips after it touch.
- **Hold a node, and its history lights up on the timeline.** Every clip that ever touched it.
- **Drag the playhead,** and the graph animates through its own history, step by step.

Mistakes are fixed where they were made. Any old clip can be changed, struck out or removed in
place; before the edit applies, a ripple bar counts what will replay, what will break, and which
notes, sets and exported pictures will change. A fork compares two lines of work side by side in a
diff lane. Replacing the data clip with next week's file replays every step on the new data, and
the replay stops, instead of silently re-binding, wherever a step would now point at something
different from what it pointed at last time.

**Inspiration.** Non-linear video editors -- Avid, Premiere, Final Cut, DaVinci Resolve -- which
separate the source monitor (look, mark, nothing changes) from the timeline (what you commit), and
give editors tracks, ripple edits, In and Out marks and the J/K/L shuttle. Parametric CAD history:
Fusion 360's design timeline and SolidWorks' rollback bar, where changing an early feature
recomputes every later one, and where a feature's dimensions are dragged on the model itself.
Visualization provenance research: VisTrails' version trees and Heer et al.'s graphical histories
in Tableau (2008). VR animation tools (Quill, Tvori) that already put a timeline under a 3D scene
and edit it by hand.

**What only a headset adds.** The program monitor is a graph in space you can turn and reach into.
An old step is changed by its handles on the real nodes -- pulling a hop ring in, moving a pin onto
another node -- while the step's blast radius pulses in depth around your hand. A route is walked
hop by hop on the graph, each hop framed in depth. The history of any node is one hold on that node
away.

---

## 2. What the mock is

### The surfaces

Solid colored background, full VR. The layout is placed from your head height on entry, so it works
seated or standing. Angles are measured from straight ahead.

| Surface                     | Where                                                                                                                                                                                                          | What it holds                                                                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The graph (program monitor) | Centered, about 10 deg below eye level, 75 cm away, about 30 deg wide on entry. A thin grab frame outlines its bounds                                                                                          | The state at the playhead. A banner at its lower edge whenever that is not "the end of Main" ("Looking at step 6 of 11 on Main"; "On branch: Resolution 1.5"), "Showing X of Y" while a filter is in force, the legend beside it                                                         |
| Peek card                   | Beside the pressed node, edge or hull, on the side facing center, a little in front of it                                                                                                                      | The object's name, the two values that tell look-alikes apart, its value in any open result, a short verb row, and Open (moves it into the source monitor). One at a time; a new press replaces it                                                                                       |
| Handles                     | On the graph, only while a clip is open                                                                                                                                                                        | Hop rings around hulls, pins on nodes (a route's ends, a filter's cut, a picked node), sweep handles (add or remove members) on a selection's hull, a note's pin                                                                                                                         |
| The route strip             | Under the graph's lower edge, centered, while a route clip is open                                                                                                                                             | One card per account on the route; each link between cards carries its type, an arrow for direction, its date and amount                                                                                                                                                                 |
| The timeline band           | A gently curved band 60 to 65 cm away, at most 50 deg wide, tilted toward the eyes. Low (about 35 deg below eye level) or lifted (just under the graph's lower edge, the Lift chip); seated users start lifted | Tracks top to bottom: Story, Camera, Notes, Style, Layout, Filter, Analysis, Selection, Data. Story and Layout stay folded until used. A diff lane appears after a fork. The data clip and the project chip sit at the head                                                              |
| Clip faces                  | On the band                                                                                                                                                                                                    | A short label and a count ("Neighbors 2 hops -- 12"); the full sentence shows in the monitor and on the peek of a pointed clip. Letters at least 0.6 deg tall (about 15 pixels on Quest 3)                                                                                               |
| The ruler and playhead      | Along the band's top edge                                                                                                                                                                                      | Step marks, the playhead, In and Out marks, transport chips (step back, play, step forward, End), Saved markers                                                                                                                                                                          |
| The source monitor          | Left of the graph, its center 15 deg from straight ahead and a little below the graph's center, 60 cm away, angled in                                                                                          | One object at a time: its facts on top, its editable sentence, its verb row (eight verbs in a fixed order, then More). It is the inspector, the table, the option form, the result reader and the project page. A pin keeps a second tab. The Undo and Redo chips sit on its lower frame |
| The clip drawer             | Mirrored on the right, folded until opened                                                                                                                                                                     | One search field, which lists matching nodes above matching commands; a recent row; the target object's verbs; then sections by track and by algorithm family. Every row reads as a sentence with slots                                                                                  |
| The ripple bar              | Along the band's top, from the edited clip to the end                                                                                                                                                          | Before any edit that replays: the replay time, the notes, sets and outputs whose meaning will change (each with its own switch), the clips that will break, the count it replays                                                                                                         |
| The keyboard                | Low and close, centered under the graph, keys at least 2 deg wide                                                                                                                                              | Appears for any focused text slot; a caret; completions from the data. While it is up, the band folds to its ruler strip and takes no input                                                                                                                                              |

**Open tracks.** On Quest 3 and Galaxy XR at most six tracks are open at once; on Vision Pro, four.
Opening another folds the one used least recently to a thin labeled bar. Tracks are about 2 deg
tall, and the gaps between clips are at least 2.5 deg on Vision Pro.

**Wide tables.** Opening a table wider than five columns widens the monitor toward the center; the
drawer folds until the table closes.

### The objects, in graphty's own terms

Verb rows are generated from what each command declares it accepts.

| graphty object      | On the timeline                                                 | In space                                                        | Handles on the graph when its clip is open                                                                                      | Its verbs                                                                                                                                                                                                                  |
| ------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graph               | The data clip at the head                                       | The whole graph; its grab frame                                 | --                                                                                                                              | Statistics, Find, Fit, Frame selection, 2D/3D, presets, Select region, Run (by dropping a row on it), Export, Note                                                                                                         |
| Node, edge          | Not a clip; peeking records nothing                             | A node or edge; its peek card                                   | --                                                                                                                              | Select, Add to selection, Same value, Neighbors, Route from here, Use as To (only while a route waits for one), Note, Pin, Hide; More; Open                                                                                |
| Set                 | A selection clip (a rule) or a named set (members kept)         | Its hull on the graph                                           | A pin on each picked node (drag to re-pick); a hop ring when it has a hop count; + and - sweep handles to add or remove members | Neighbors, Run on these, Style this, Focus on these, Keep as set, Review, Note; More                                                                                                                                       |
| Run and result      | An Analysis clip                                                | Its values as color and size once painted; its legend           | Its scope: drag the clip face onto a hull or the graph to rescope it. A route: its From and To pins, its route strip            | Color and size by this, Filter by this, Select from, Re-run, Compare with, Note; a route also has Select this route, Select all routes, Evidence report                                                                    |
| Layout              | A Layout clip on its own track                                  | The positions                                                   | Pinned nodes as pins                                                                                                            | Edit, Stop, Re-run with a new seed, Turn off, Strike. The clip records the iteration it reached and the seed it used                                                                                                       |
| Style layer         | A Style clip; paint order in the Style track head's layer stack | The look of the graph                                           | A scoped style's hull                                                                                                           | Edit, Turn off, Move up or down, Why this look, Strike                                                                                                                                                                     |
| Filter step         | A Filter clip, with a "For viewing / For analysis" switch       | Hidden or faded elements; faint outlines while the clip is open | A cut pin on the node at the threshold (drag onto another node to cut at its value); a context hop ring on a Focus clip         | Edit rule, Turn off, Invert, Any of, Except, Save as filter, Strike                                                                                                                                                        |
| Note                | A Note clip                                                     | A pin on its target; a callout label when shown as one          | Its pin: drag onto another hull or node to re-target                                                                            | Edit, Go to target, Show as callout, Show or hide markers, Strike                                                                                                                                                          |
| Named view          | A Camera keyframe                                               | The graph's pose                                                | --                                                                                                                              | Go to, Rename, Update, Add to story, Delete                                                                                                                                                                                |
| Story               | The Story track: shots in show order                            | --                                                              | --                                                                                                                              | Play, Present, Reorder, Remove                                                                                                                                                                                             |
| Project             | The project chip                                                | --                                                              | --                                                                                                                              | Save, Save as, Open, Recent, Rename, Export, Picture, Report, Present, Outputs; More                                                                                                                                       |
| A person's judgment | A Review clip                                                   | Each candidate framed on the graph in turn                      | --                                                                                                                              | The answers its question slot names (Yes and No, or roles such as broker, mule, victim, incidental), a reason chip, Skip, "not reviewed", "Yes to the rest at this confidence or above"; replays as a question on new data |

### Rules that make it one idea

1. **Looking is free.** A press on a node, edge or hull opens its peek card beside it and rings it
   on the graph. A press on a row, clip, track head, legend entry or the peek card's Open shows it
   in the source monitor. Nothing is recorded. A press never fills a slot: a waiting slot is filled
   only by a verb ("Use as To") or by dragging its pin.
2. **Only a verb lands a clip, and every verb previews first.** Holding a verb shows its effect as a
   ghost on the graph with its count ("adds 6 families"). Verbs that only add (Select, Add to
   selection, Neighbors, Run, Note, Mark view, Color and size by, a preset) commit on release, even
   after a quick tap, and Undo takes them back. Verbs that hide, remove, filter, focus, merge or
   fork commit only once the preview has been held for 300 ms; a shorter tap pins the preview at
   the graph with Apply and Cancel chips. Sliding off cancels. Vision Pro reports no hover, so this
   hold is its only preview. A style preview is applied inside a graphty-element transaction and
   rolled back on cancel.
3. **A clip reads the graph that the enabled clips to its left on its branch produce, and prints
   it** ("on 16 of 16 families"; "on 212 of 9,400 accounts, after: Last 30 days").
4. **New clips go where you can see them.** With the playhead at the end of the branch, a verb
   appends. With the playhead back in time, a verb row offers three choices in place of its verbs:
   "Insert here" (opens the ripple bar for everything after it), "Branch from here", and "Add at
   the end" (moves the graph to the end and previews there before it commits). The graph never
   previews a verb on one state and commits it on another.
5. **A filter says what it is for.** Its face carries a switch, "For viewing" (the default: later
   runs still see the whole graph; the filter only hides) or "For analysis" (later runs see only
   what it keeps). The "measured before this" warning is raised only by analysis filters,
   removals, merges and joins, never by a view filter.
6. **Every reference keeps what it meant.** Every slot that points at something records how it was
   bound, and its chip shows which: by hand (an id typed, a node pointed at, a threshold), from a
   clip ("largest group of Louvain, step 9"), or from the clock ("last 30 days: Sep 3 to Oct 3",
   dates pinned when the clip first ran; "rolling" is an explicit choice). It also records what it
   resolved to: the members, by id. An unseeded run records the seed it drew.
7. **A replay stops instead of re-binding or breaking.** When a replay would change what a
   reference picks out, that clip turns amber and the replay stops there. The monitor shows the old
   members beside the new ones, and the graph outlines both, with three choices of equal weight:
   Follow the new ones, Keep the old ones, Re-pick. A group from an unseeded run is matched by
   members, not by its number ("was Ring 7: 82 percent the same accounts"). When a clip can no
   longer run (its column is gone, its node no longer exists), the replay stops amber at the first
   such clip with Fix, Strike or Branch from here. The one exception is the person's own edit to
   an earlier clip: the ripple bar names every such change before Apply, so Apply means follow.
8. **Outputs are fixed.** A note, callout, picture, exported file, methods paragraph or report
   records what it read when it was made and never re-runs. In the ripple bar, each output that an
   edit reaches has its own switch: "Keep as it was" (the default; it is marked out of date) or
   "Make again" (a new dated version beside the old). The old version of the edited clip stays
   folded beneath it ("as of Oct 3 -- read by the picture -- Compare").
9. **Exploring does not flood the timeline.** Consecutive selection clips that no later clip reads
   fold into one "Explored" clip with a count; the earlier ones are folded beneath it. When a later
   clip reads one of them, it unfolds into its own clip.
10. **Three undo-like acts, three names.** Back and Forward chips return to earlier views and are
    never recorded. Undo takes back the last edit to the timeline and names it ("Undo: Hide
    Strozzi"). Older mistakes are fixed in the clip that made them.
11. **Three orders, three places.** Left to right on the timeline is only the order the work was
    done. The order layers paint is the layer stack in the Style track head. The order a
    walk-through is shown is the Story track. Reordering paint or story never moves a clip.

### Parts folded in from other prototypes

| Part                                                                                                                               | From                                   | Where it lives here                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| Timeline, tracks, source monitor, ripple bar, forks and the diff lane, "Replace data, keep my steps"                               | Cutting Room (23)                      | The whole design                                                                  |
| Steps as editable sentences of typed slots, each chip naming its binding; strike only this; restore                                | Editable Record (45)                   | The sentence in the monitor and on a pointed clip's peek; Strike on the clip fold |
| The arm-load floor: only the pinch (no hand poses), a sticky one-hand alternative for every held act, lost tracking always cancels | Editable Record (45)                   | Every input (section 3)                                                           |
| Bindings by hand, from a clip, from the clock; outputs as fixed bindings; what-ifs that never change what later clips read         | Editable Record (45)                   | Rules 6 to 8; "Simulate removing"                                                 |
| The blast radius: every dependent clip, note and set lit before a clip is changed or removed                                       | Hand of Cards (13)                     | Pinch and hold a clip: lit on the graph and on the timeline                       |
| Bracket a span of steps into a recipe; struck steps stay readable                                                                  | Proofreader's Slate (16)               | In and Out marks on the ruler; Save as recipe                                     |
| The review step: a person's judgment, replayed as a question on new data                                                           | Patch Bay (32)                         | The Review clip on the Analysis track                                             |
| Probes: show any stage of the analysis without changing anything                                                                   | Patch Bay (32)                         | Pinch and hold a ruler step                                                       |
| The cue: hear or see a change before it reaches the output                                                                         | Mixing Desk (21)                       | Rule 2, the held preview on every verb                                            |
| The command sentence with typed slots                                                                                              | Search Everything (25)                 | Drawer rows and the drawer's search field                                         |
| "Re-measure on the whole graph" beside "Re-measure here"; fork from Main by default                                                | Cutting Room's adversarial review (23) | The measured-before warning; Simulate removing                                    |
| "Replace data, keep my steps" from the headset's own files or a paired laptop folder                                               | Paired Browser (44), shared service    | The data clip                                                                     |
| Handles on the model itself                                                                                                        | Parametric CAD (outside graphty)       | Hop rings, pins and sweep handles on the graph                                    |

### What is built, what is free-form and what is stubbed

**Build order.** A team of three, about 5 to 6 weeks, in two tiers.

- **Week 1 to 2, the input layer, and a gate.** One state machine that tells press, hold, handle
  drag, tear-out, scroll, world grab, shuttle and probe apart, the same way on a controller ray, a
  hand ray with a near pinch, and Vision Pro's transient pointer (gaze at pinch start, then the
  hand), feeding both the panels and the graph. The Vision Pro pointer path belongs in
  graphty-element's XR input handler, which has none today; every consumer needs it, and all six
  mocks share it. The gate at the end of week 2: every row of section 3 works on all three
  devices.
- **Tier 1, the mock.** The panel layer on `@babylonjs/gui` (mock code; graphty-element has no
  in-headset panels): the band, the monitor, peek cards, the drawer (browse, recent, and one search
  over nodes and commands), the keyboard. The graph handles, the ripple bar, the blast radius,
  the playhead and probes, Undo, Lift, save. Replay as below. The basic journey, the proof journey
  and path investigation (W05) end to end. The Story track is a list of keyframes, and Present
  steps through it.
- **Tier 2, built if time allows, stubbed otherwise.** Forks and the diff lane; parsing typed words
  into a sentence in the drawer; W18's column mapping and duplicate review (precomputed screens if
  not built); "all routes up to a length".

**Replay is real on small graphs.** On the sample graphs (Florentine families, Les Miserables, the
Karate club) the mock replays for real: it re-runs every enabled clip from the start, with the
edited or struck one changed, through graphty-element's own commands. graphty-element's session
journal already holds each command as plain data, so this takes well under a second at that size.
After each clip, the mock stores the visible state (color, size, visibility, selection, pins,
camera) as typed arrays, so the playhead, probes and the diff lane read stored states. At 9,400
nodes that is about 300 KB a step. Animation drives those arrays straight into the instance color
and scale buffers.

| Free-form: any person can do it, on any small sample                                               | Scripted: precomputed for the journeys below                                                                                             |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Every verb, slot, handle and value tab; strike, restore, remove                                    | Edits of old clips on the 9,400-account fixture (only those the journeys make; any other shows a "not in this mock" card naming what is) |
| Editing any old clip, Insert here, Branch from here, Undo                                          | The second dataset in the proof journey and next week's files in W18                                                                     |
| The ripple bar's counts (from a speculative replay)                                                | Matching an unseeded run's groups by members across two data versions                                                                    |
| The blast radius for every reference held in a slot                                                | The blast radius for implicit reads (a run that reads the graph a filter left, rather than a named slot), marked "scripted"              |
| The stop-and-ask for any reference whose members change (the mock records resolved members itself) | k shortest routes and all routes up to a length                                                                                          |
| The playhead, probes, recipes saved and run                                                        | W18's validation report, Merge by, column type changes                                                                                   |
| Shortest routes, with direction and link-type slots                                                | The index of other saved projects (W05 step 6)                                                                                           |

**Saving.** The mock writes graphty-element's normal project file plus a mock-only sidecar holding
branches, struck clips, resolved members and kept versions, so the element's published file format
is untouched. It asks the browser for persistent storage (`navigator.storage.persist()`) so the
headset browser does not evict the work.

**Files in and out.** A page in an immersive session cannot reliably return from the system file
picker, and downloads do not land inside the session. So files are picked on graphty's 2D page
before Enter VR (the start card then offers "Read the files picked on the page"), or with "Leave VR
to pick", which restores the session draft on re-entry. Everything the headset writes goes to the
project's Outputs list, downloaded from the 2D page after exit, or to the paired laptop's Outbox.

**Engines stubbed:**

| Stub                                                   | Why                                                                             | How                                                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Replay at 9,400 accounts                               | Re-running every clip at that size is graphty-element work that is not done yet | Precomputed states for the journeys' edits, swapped in after a worker delay matching the element's cost estimate |
| k shortest routes and all routes up to a length        | Planned in graphty-element, not shipped                                         | Precomputed for the path-investigation fixture                                                                   |
| W18's validation report, Merge by, column type changes | Planned in graphty-element                                                      | Precomputed for the import fixture; the element's real load report is shown where it exists                      |
| The index of saved projects                            | Needs storage across projects                                                   | A fixed index of two earlier cases                                                                               |
| The laptop relay and the phone keyboard                | The shared text and file service                                                | Stubbed on the dev machine, as in all six mocks                                                                  |

Not in the mock: Show both (two synchronized graphs), Record as video, and more than two branches
as lanes. They stay in the design and are described in section 6.

### Devices and inputs

| Device                                     | Inputs                                                                  | Notes                                                                                                                                                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meta Quest 3 / 3S, controllers             | Triggers, grips, sticks, A/B/X/Y, haptics                               | Main controller target. Haptic ticks on value tabs, handles and the playhead                                                                                                                                                     |
| Meta Quest 3 / 3S, hands                   | Hand ray and system pinch; fingertip within 3 cm of the band            | Audio ticks instead of haptics. Only the pinch is used, and the design asks for no other hand pose; the page cannot control the system gesture, so accidental system menus are counted (section 7)                               |
| Samsung Galaxy XR, hands and controllers   | Chrome on Android XR: hands, controllers as gamepads                    | Same mapping as Quest; button indices, haptics and the palm-up system gesture checked on the device                                                                                                                              |
| Apple Vision Pro, eyes and pinch           | Safari transient pointer (gaze at pinch start, then the hand); no hover | Needs the transient-pointer path in graphty-element's XR input handler. Name tags appear at pinch start and resolve on release. Value names shown on value tabs at rest; value tabs open a knob in the monitor; four open tracks |
| Apple Vision Pro, PS VR2 Sense controllers | If Safari exposes them as gamepads                                      | Quest controller mapping; otherwise eyes and pinch                                                                                                                                                                               |

Voice is optional and only fills text; the microphone permission is asked on the 2D page before
Enter VR, so no prompt interrupts the session. Every controller button has a chip, so everything
works with one hand and with hands alone.

---

## 3. The control vocabulary

One meaning per input, everywhere. The design uses one hand pose, the pinch.

| Input (controllers / hands / Vision Pro)                                                                                                              | Its one meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger / pinch / look and pinch, released in place                                                                                                   | **Press what it started on.** On a node, edge or hull: open its peek card and ring it. On a row, clip, track head, data clip, project chip, legend entry or Open: show it in the source monitor. On a verb: preview while held, commit per rule 2. On a slot chip in a sentence: open that slot's picker in the monitor. Nothing is ever recorded by a press on an object                                                                                                                                                                                                               |
| A press that travels more than 2 cm (3 deg on Vision Pro) within 300 ms, starting anywhere on the graph except a handle; or a pinch on the grab frame | **Grab the world:** move and turn the graph; a second hand joining scales. One-handed: dominant stick push and pull while gripping, or the Scale chip, which is sticky (press once to scale with one hand, again to stop). The press does not fire. Never recorded. Controllers also grab with the grip                                                                                                                                                                                                                                                                                 |
| The same press, held still for 0.4 s on a clip or a node                                                                                              | **Show the links between history and graph.** On a clip: its blast radius -- the nodes, edges, hulls and pins it and the clips after it touch light on the graph, and the dependent clips light amber on the timeline. On a node, hull or note pin: every clip that touched it lights on the timeline. Lights go out on release. Sticky alternative: the Links chip on the monitor frame                                                                                                                                                                                                |
| Pinch-drag starting on a handle on the graph                                                                                                          | **Change that value on the graph.** A hop ring: pull outward or inward, one notch per hop, with the count at each notch. A pin: drag onto another node; the slot takes that node, or that node's value for a cut. A sweep handle: sweep across nodes to add (+) or remove (-) members, count shown. A note's pin: drag onto another hull or node. While dragging, hidden members show as faint outlines so they can be targets, and the blast radius pulses. On the newest clip the change applies on release; on an older clip, release opens the ripple bar                           |
| Pinch-drag starting on a value tab (on a clip face or in the monitor)                                                                                 | **Set a number.** Pull sideways to change it; pull the hand toward you for finer steps; the value freezes after a brief stillness, so release does not jitter it. Tabs are at least 2.5 deg wide. On Vision Pro, pressing a value tab opens a knob in the monitor instead, and a quick release offers "Keep 0.070?" for 2 s rather than discarding the value                                                                                                                                                                                                                            |
| Pinch-drag along a list                                                                                                                               | **Scroll.** Releasing after a scroll does nothing. A row is pressed only by a pinch that stays within the drag threshold                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Pinch-drag sideways on a clip body                                                                                                                    | **Scroll the band.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Pinch-drag pulling a row, header or verb toward you (more than 6 cm)                                                                                  | **Tear it out as a chip and drop it.** Labeled drop zones appear only where it fits: on a track, a slot, a clip, or on the graph itself (the whole graph, a hull, a node, a legend band). The zone names what will happen and its count ("Run PageRank on: whole graph (16)"). Zones have hysteresis, and the target is the zone the hand was in at its last still moment. If that moment falls within 3 cm of a nested zone's edge, two large tiles appear ("Whole graph (16)", "These 12") and a press picks one. Released over its list or in empty space: put back, nothing happens |
| A press on the graph where two candidates are about equally near (the second within 1.3 times the angular distance of the first), on every device     | **Which one?** A short list at the graph, nearest first. A magnifier at the ray tip shows a dense area enlarged while the ray rests there (on Vision Pro, while the pinch is held)                                                                                                                                                                                                                                                                                                                                                                                                      |
| Off stick left-right / pinch the ruler or playhead and slide                                                                                          | **Shuttle the playhead** to look at an earlier state. Starts only after 0.15 s and 1.5 cm. The graph animates between steps; read-only, with the banner                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Pinch and hold a ruler step                                                                                                                           | **Probe:** the graph shows the project at that step while held; after 0.4 s it stays a probe until release, however the hand drifts; release returns                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Off stick up-down / zoom chips                                                                                                                        | **Zoom the ruler** around the playhead                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Off stick click / End chip                                                                                                                            | **Back to the end** of the branch                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Off stick left-right while a route clip is open                                                                                                       | **Step along the route,** one hop at a time, framing each hop in depth                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| X / In and Out chips                                                                                                                                  | **Mark In, then Out** on the ruler, a ranked strip or a histogram. Pending In shows "next: Out" at the ray tip                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Y / Undo chip (Redo beside it)                                                                                                                        | **Undo the last timeline edit**, named on the chip. Hold for the named edit list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| A / Mark view chip                                                                                                                                    | **Keep this view** as a keyframe on the Camera track                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| B / Add handle                                                                                                                                        | **Open the drawer.** Its target is fixed when it opens and named in its header; one press on the header switches between the monitor's object and the selection. Pressing a command row opens its card in a monitor side tab; pressing a node row frames the node and opens its peek card                                                                                                                                                                                                                                                                                               |
| Dominant stick, ray on a list                                                                                                                         | **Scroll that list.** The target is latched when the push starts. No stick flicks exist                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Eye button on a clip or track head                                                                                                                    | **Enable or disable** (strike) it, with the ripple bar previewed while pressed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Off trigger, a poke, a resting hand                                                                                                                   | **Nothing.** No poke ever presses; a fingertip press on the band is a pinch with the fingertip within 3 cm and the hand above the band face                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Tracking lost, or the input source gone, mid-drag                                                                                                     | **Cancel and restore.** On Vision Pro, where a lost pinch looks like a release, every drag -- value, handle, move, drop, region -- commits only after a brief stillness; otherwise it cancels                                                                                                                                                                                                                                                                                                                                                                                           |
| Microphone key on a text slot                                                                                                                         | **Dictate into that slot.** Voice never runs a verb                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

The one-shot editing tools of the base prototype (razor, ripple delete, slip, region) are verbs, not
loaded modes: Split, Remove, Shift window and Select region, each in the drawer and on the object
it acts on. Select region is the only armed act: its name rides at the ray tip ("Box: drag across
the graph"), its chip cancels it, and its one drag ends it. The box has a depth slab: it takes the
front-most cluster's depth by default, pulling the hand toward you or away moves the slab, and the
count of what it takes shows before release.

Cancel for a running run lives in the monitor and on the clip's fold, never on the clip face, so a
lowered hand cannot stop running work.

---

## 4. The basic journey

Florentine families sample: 16 families, including the isolated Pucci, and 20 marriage ties. Meta
Quest 3 with hands, seated, headset alone (unpaired). Acts are presses, pinches, holds and drags; a
short typed string counts as 2 and a sentence as 4.

**What counts as on the graph.** The shared exit criterion counts a pinch, sweep, slice or hold on
nodes, edges or regions. Here that is a pinch or hold on a node, edge or hull, and a drag of a
handle on the graph (a hop ring, a pin). Drops onto the graph from a panel and world grabs are
listed in their own columns and not counted as on the graph.

**1. Enter**

- **What you do:** on graphty's 2D page, press Enter VR. In the headset, press Samples on the start
  card, then Florentine families.
- **What you see:** the start card sits where the graph will be: Samples, Recent, Read the files
  picked on the page, From laptop, From a web address. Then the graph, with the band lifted to the
  graph's lower edge (seated), holding the data clip "Florentine families" at its head and one
  "Start" keyframe on the Camera track; the other tracks are folded to thin labeled bars and the
  playhead is at the end. A four-line legend under the graph -- press a node to look; act with its
  verbs; press and pull to move the graph; Undo is on the monitor's frame -- stays until your first
  grab or press, then folds into a "?" chip on the monitor frame.
- **Controls:** 3 presses (one on the 2D page). 3 acts.

**2. Get oriented**

- **What you do:** pinch the graph and pull to turn it; bring the second hand in and spread to
  scale it up. Press the data clip. Pinch the lone node at the graph's edge. Press Mark view.
- **What you see:** a pinch that moves becomes a grab, so the graph turns and grows with your hands
  and nothing lands. The monitor shows the graph's facts: 16 families, 20 marriages, density 0.17,
  2 components. The lone node's peek card reads "Pucci -- no marriages in this data". Mark view
  lands "View 1" on the Camera track.
- **Controls:** 2 world grabs; press; pinch on the graph; Mark view chip. 3 acts, 1 on the graph.

**3. Find the Medici**

- **What you do:** point at the large node near the center; the name tag at the ray tip reads
  "Medici". Pinch it. Tap Select on its peek card.
- **What you see:** the peek card beside Medici: its name, its 6 marriage ties, and the verbs
  Select, Neighbors, Route from here, Note, Hide, More, Open, with "Looking -- press Select to keep
  it" beside them. This hint shows until you first press Select, then twice more. Select only
  adds, so a tap commits: the clip "Select [Medici]" lands on the Selection track and a hull with a
  pin on Medici appears.
- **Controls:** pinch on the graph; tap a verb. 2 acts, 1 on the graph.

**4. Who they married into, and who those families married**

- **What you do:** tap Neighbors on the peek card. Then, curious about the in-laws' in-laws, pinch
  the ring around the new hull and pull it outward one notch.
- **What you see:** holding Neighbors ghosts six families with "adds 6 families"; release lands
  "Neighbors of [Medici] within [1] hop -- 7". The open clip shows its handle: a hop ring around the
  hull, marked 1. Pulling it to the second notch pops "12 families" and ghosts in Ginori, Guadagni,
  Castellani, Strozzi and Pazzi; on release the clip -- the newest, so nothing replays -- reads
  "within [2] hops -- 12".
- **Controls:** tap a verb; drag the hop ring on the graph. 2 acts, 1 on the graph.

**5. Who matters most (PageRank)**

- **What you do:** press the Add handle; in the drawer press Analysis, then Centrality. Press the
  PageRank row: its card opens in a monitor side tab (what it measures, damping 0.85, cost "under a
  second on 16 families"). Pull the row toward you and drop it on the graph.
- **What you see:** as the chip nears the graph, two zones light: "Run on: whole graph (16)" around
  the graph and "Run on: these 12" on the hull. Dropped in open space on the graph, it lands "Ran
  [PageRank] on [whole graph] -- 16 of 16 families" on the Analysis track, which fills with
  progress and then shows a small distribution and "Ran -- press to read". The graph does not
  change: a run is a fact, not a style. Where you drop is the scope.
- **Controls:** four presses; a drop onto the graph. 5 acts, 1 of them a drop. The card also has a
  Run button that names its scope, for anyone who would rather not drag.

**6. Read the result**

- **What you do:** press the PageRank clip. Then pinch Guadagni and Strozzi on the graph.
- **What you see:** the monitor becomes the ranked strip: Medici 0.145, Guadagni 0.098, Strozzi
  0.088, Albizzi 0.078, Tornabuoni 0.071, Ridolfi 0.069, Bischeri 0.068 and so on, with "damping
  0.85 -- on the whole graph (16)" above it. A row under the ray lights its family on the graph with
  a leader line. Guadagni's peek card reads "PageRank 0.098 -- 2nd of 16", and its row in the strip
  lights. Nothing is recorded.
- **Controls:** press; two pinches on the graph. 3 acts, 2 on the graph.

**7. Color and size by PageRank**

- **What you do:** pull the strip's PageRank header toward you and drop it on the graph, on the
  zone "Color and size by PageRank". (Or tap "Color and size by this" in the verb row.)
- **What you see:** while held over the zone, the graph previews the new look. On release, the
  Style track opens with "Painted [color and size] by [PageRank, step 5]"; the graph colors and
  sizes every family by its value and a legend appears beside it. The style's form (palette, size
  range, missing-value color) is in the monitor.
- **Controls:** a drop onto the graph. 1 act, a drop.

**8. Keep only strong families (filter)**

- **What you do:** hold "Filter by this" in the strip's verb row until the preview settles. Then
  pinch the filter's cut pin on Bischeri and drag it onto Tornabuoni.
- **What you see:** while held, the families below the median fade; after 300 ms the clip lands:
  "Keep families where [PageRank, step 5] [at least] [0.068] -- For viewing -- 8 of 16". The open
  filter puts its cut pin on Bischeri, the family at the cut, and shows the hidden families as faint
  outlines. Dragging the pin, each family it passes pops its value and the count ("Ridolfi 0.069:
  keeps 6"); dropped on Tornabuoni, the clip reads "[at least] [0.071] -- keeps 5 of 16": Medici,
  Guadagni, Strozzi, Albizzi, Tornabuoni. The slot records the number, bound by hand; the family
  only set it. The banner reads "Showing 5 of 16". The switch says For viewing, so no run is marked
  stale. For a value between two families, the clip face's value tab sets any number.
- **Controls:** a held verb; a pin drag on the graph. 2 acts, 1 on the graph.

**9. Write a note**

- **What you do:** pinch the Medici group's hull. Tap Note on its peek card. Type "Central by
  marriage, not by wealth" on the keyboard. Press Done.
- **What you see:** the hull's peek card reads "Medici and 11 partners (12 families, from step 4) --
  5 showing, 7 hidden by the filter"; the 7 show as faint outlines. Note's label reads "Note on:
  Medici and 11 partners". The keyboard rises under the graph and the band folds to its ruler strip
  until Done. A Note clip lands on the Notes track with the text on its face, its target chip
  reading "Medici and 11 partners (12 families, from step 4)", and a pin on the group.
- **Controls:** pinch on the graph, tap, typing, press. 7 acts, 1 on the graph.

**10. Fix two mistakes**

- **What you do:** first, a fresh slip. You pinched Strozzi to look and held Hide on its peek card a
  moment too long, and Strozzi vanished. Press Y (or the Undo chip, which reads "Undo: Hide
  Strozzi"). Second, an older mistake: the note is about the marriages the Medici made themselves,
  but its group still reaches the in-laws' in-laws. Pinch and hold the note's pin on the graph.
  Press the Neighbors clip that lights amber. Pinch its hop ring on the graph and pull it in to 1.
  In the ripple bar, switch the note to "Make again". Press Apply.
- **What you see:** Undo brings Strozzi back; nothing else changes. Holding the pin lights its
  history on the timeline: the Note clip, and amber on the Neighbors clip that made its target,
  "within [2] hops -- 12". Pressing that clip opens it; the playhead stays at the end, and its hop
  ring appears on the graph. Pulling the ring in, the five outer families (Ginori, Guadagni,
  Castellani, Strozzi, Pazzi) pulse in the warning color with "-5", and the note's pin pulses with
  them. The clip is old, so release does not apply; the ripple bar reads "under a second -- replays
  1 clip -- the note 'Central by marriage' would cover 7 families, not 12 [Keep as it was / Make
  again] -- breaks 0 -- PageRank, the paint and the filter do not read this selection". Apply
  replays for real; the note is made again on the 7, its old version folded under it ("as of step
  9, on 12"), and a pencil tick on the Neighbors clip records the edit. A second button, "Keep the
  2-hop version on a branch", would have kept both.
- **Controls:** pinch on the graph; a held verb; Y; hold on the graph; press; hop ring drag on the
  graph; switch; Apply. 8 acts, 3 on the graph.

**11. Save**

- **What you do:** press the project chip, then Save, and accept the suggested name.
- **What you see:** the first save asks for a name and suggests "Florentine families -- Medici".
  A "Saved" marker lands on the ruler (a marker, not a step). The project file and its sidecar are
  saved to the headset's storage: every clip, struck ones, keyframes, each clip's result and each
  reference's resolved members. The project reopens on the branch and step it was saved at, and
  says so in the banner. graphty's 2D page opens it as the saved branch's linear history.
- **Controls:** press, press, press. 3 acts.

**Tally (a prediction the mock measures):**

| Step              | Acts   | On the graph        | Drops onto the graph | World grabs (not counted) |
| ----------------- | ------ | ------------------- | -------------------- | ------------------------- |
| 1 Enter           | 3      | 0                   | 0                    | 0                         |
| 2 Get oriented    | 3      | 1                   | 0                    | 2                         |
| 3 Find the Medici | 2      | 1                   | 0                    | 0                         |
| 4 Neighbors       | 2      | 1                   | 0                    | 0                         |
| 5 PageRank        | 5      | 0                   | 1                    | 0                         |
| 6 Read            | 3      | 2                   | 0                    | 0                         |
| 7 Color and size  | 1      | 0                   | 1                    | 0                         |
| 8 Filter          | 2      | 1                   | 0                    | 0                         |
| 9 Note            | 7      | 1                   | 0                    | 0                         |
| 10 Two mistakes   | 8      | 3                   | 0                    | 0                         |
| 11 Save           | 3      | 0                   | 0                    | 0                         |
| **Total**         | **39** | **10 (26 percent)** | **2**                | **2**                     |

10 of 39 acts land on the graph without counting drops or grabs: just over the exit criterion of
one in four. Counting the two drops it is 12 of 39 (31 percent); leaving typing out it is 10 of 35
(29 percent). People who press the Run and "Color and size" buttons instead of dropping keep the
same 10 of 39. The margin is one act: anyone who sets the filter with the value tab rather than
the cut pin falls to 9 of 39 (23 percent). The acts that carry it are pinches to read, the hop
ring, the cut pin, and holds that light the history -- which is why section 7 checks whether people
find the handles unprompted.

---

## 5. Harder journeys

Each journey reports its graph share the same way as the basic journey: acts on nodes, edges, hulls
and handles; drops and world grabs apart.

### Proof journey: Publish the analysis -- Sarah, fraud analyst

Stress journey 6 in the functionality inventory (a studio working file, not committed) (findings communication and a reproducible
session, workflows W15 and W25).

**Persona:** the fraud analyst (`design/designloom/personas/fraud-analyst.yaml`), Sarah, closing
last week's case for the prosecutor. **Device:** Apple Vision Pro, eyes and pinch, seated, with
the paired laptop (stubbed relay); unpaired, every output waits in the project's Outputs list.
**Data:** last week's project "Case 2026-114" on the 9,400-account fixture. Its Main timeline holds,
left to right: (1) the data clip; (2) "Last 30 days" view filter, pinned to Sep 3 to Oct 3; (3)
Select [ACC-48213]; (4) Neighbors within 2 hops through [all link types] -- 212 accounts; (5)
Louvain on these 212, seed 48817 drawn; (6) Color by community; (7) Keep as set "Ring 7" (largest
group of Louvain, step 5 -- 38 accounts); (8) Shortest route ACC-48213 to ACC-10077; (9) Review of
its intermediates; (10) Highlight Ring 7; (11) a Note on Ring 7; (12) a Picture. The Camera track
holds "Ring 7 close-up".

**1. Reopen and jump to the view**

- **What you do:** in the headset, press "Case 2026-114" in the start card's Recent row. Press the
  "Ring 7 close-up" keyframe, then Go to.
- **What you see:** the project opens at the end of Main; the banner reads "Main, step 12 of 12 --
  saved Oct 3". The graph flies to the saved view.
- **Controls:** 3 presses. 3 acts.

**2. Fix the wrong step, eight clips back**

- **What you do:** pinch and hold Ring 7's hull. Press the Neighbors clip that lights amber. Press
  its "[all link types]" slot and turn off "transfer". In the ripple bar, switch the note to "Make
  again" and leave the picture as it was. Press Apply.
- **What you see:** the hold lights every clip that touched the ring: Keep as set, Louvain,
  Neighbors, the color, the highlight, the note and the picture. Neighbors shows amber because the
  hold also flags what it reads through: 71 of its 212 accounts came in only through transfers,
  among them a payroll account. Pressing the clip opens it; turning off "transfer" in the slot
  picker previews the 71 pulsing "-71" in depth. The ripple bar: "about 4 seconds -- replays 8
  clips -- Louvain re-runs on 141 accounts with the recorded seed -- Ring 7 will hold 31 accounts,
  not 38 (all 31 were in it) -- the route is unchanged (it reads the whole graph) -- changes
  meaning: the note on Ring 7 [Keep as it was / Make again], last week's picture [Keep as it was /
  Make again] -- breaks 0". Apply replays; each clip flashes as it passes; the old note and picture
  stay, the picture marked out of date, the new note on 31 accounts beside the old one.
- **Controls:** hold on the graph, press, press, uncheck, switch, Apply. 6 acts, 1 on the graph.
- **Stubbed:** the replayed states at 9,400 accounts are precomputed.

**3. Colorblind-safe preset; community color under the ring's highlight**

- **What you do:** press the Add handle, Style, Presets; pull "Colorblind safe" toward you and drop
  it on the graph. Press the Style track head; in its layer stack, drag "Community color" below
  "Ring 7 highlight".
- **What you see:** the preset's zone reads "changes 2 layers, adds 0", since a preset whose layers
  match existing ones changes them in place. Reordering the layer stack repaints at once and moves
  no clip.
- **Controls:** three presses, a drop onto the graph, a press, a row drag. 6 acts, 1 of them a drop.

**4. The ring and its 1-hop context; fade the rest**

- **What you do:** pinch Ring 7's hull. Hold "Focus on these" on its peek card until the preview
  settles; set its switch to "Fade others". Pull its context ring outward one notch.
- **What you see:** "Focus on [Ring 7] -- hide others -- For viewing" lands; the switch turns it to
  fading. Pulling the context ring: "Focus on [Ring 7] and [1] hop around -- 31 + 44 accounts --
  fade the other 9,325". Accounts the "Last 30 days" filter hides show as faint outlines.
- **Controls:** pinch on the graph, held verb, switch, ring drag on the graph. 4 acts, 2 on the
  graph.

**5. A callout on the ringleader**

- **What you do:** pinch ACC-77310 on the graph. Tap Note on its peek card; accept the sentence it
  proposes; turn on "Show as callout"; press Done.
- **What you see:** the note opens as a sentence built from what is lit: "[ACC-77310] links [6] of
  [Ring 7]'s accounts through [shared phone], reviewed as [broker]." Every slot can be changed; free
  text can follow. The callout label stands beside the node.
- **Controls:** pinch on the graph, tap, accept, switch, Done. 5 acts, 1 on the graph.

**6. The methods paragraph**

- **What you do:** press the Analysis track head. Press "Methods paragraph". Press Keep.
- **What you see:** the methods list: every run in force, in order, with every parameter and what
  it read -- "Neighbors of ACC-48213 within 2 hops through shared device, shared phone -- 141
  accounts"; "Louvain, resolution 1.0, seed 48817 (drawn Oct 3), on 141 of 9,400"; "Shortest route,
  unweighted, following transfer direction, through all link types, on 9,400"; "Review: 5
  intermediates, roles and reasons". Tried and dropped runs show dimmed, including last week's
  all-link-types version. The paragraph is assembled from these facts and previewed before Keep
  lands it as an output clip.
- **Controls:** 3 presses. 3 acts.

**7. Save the steps as a recipe and replay it on a second dataset**

- **What you do:** press the Select clip, then In; press the Focus clip, then Out. Press Save as
  recipe, type "Ring triage", press Save. Press the project chip, Open, and the "October export"
  row in the laptop folder; press Save when asked to save the current project. Press the Add
  handle and drop "Ring triage" from the recent row onto the graph. In its inputs card, type
  "90155" in the Start account slot and press the account row; press Run. At the first stop, press
  "Use the last 30 days of this data". At the second, press Re-pick, pinch the group whose hull
  holds ACC-90155, and tap "Use as Ring".
- **What you see:** Save as recipe lists the inputs it found, each a slot: the start account (a
  node pick), the date window, the link types, the ring (largest group of Louvain). The recipe runs
  as clips on the new project's timeline, on 9,800 accounts. The replay stops amber at the date
  filter: "Pinned to Sep 3 to Oct 3. This data runs Oct 1 to Nov 2, so the window keeps 3 accounts
  where it kept 410 -- Keep the pinned dates / Use the last 30 days of this data (Oct 3 to Nov 2) /
  Re-pick". It stops again at the ring: "The largest group here shares none of Ring 7's 31
  accounts; the group holding ACC-90155 has 9 of them". Old members are outlined beside the new
  hull. After the re-pick the replay runs to the end, and the new project holds the focused ring.
- **Controls:** 22 acts: 8 to save the recipe, 4 to open the
  second dataset, 2 to place the recipe (one a drop), 4 to fill and run it, 4 at the two stops (one
  a pinch on the graph). 1 on the graph, 1 drop.
- **Stubbed:** the second dataset's states and both stops are precomputed.

**8. Exports**

- **What you do:** press the project chip, Recent, "Case 2026-114". Press the project chip, Export.
  On the PNG row set 4x, legend on, annotations on, and press Export. Press the node table (CSV)
  row and Export; press the GraphML row and Export.
- **What you see:** each export previews before it writes and lands as an output clip that records
  what it showed. Files go to the laptop's Outbox, or unpaired to the Outputs list.
- **Controls:** 14 acts.

**9. The story and the report**

- **What you do:** press Mark view. Press the "Ring 7 close-up" keyframe, then Add to story; press
  the new view, then Add to story. Press the project chip, Report. Type the title "Ring 7 --
  shared-phone mule network". The two-sentence summary arrives proposed from the notes; change one
  slot in it. Press Generate.
- **What you see:** the Story track opens with two shots. The report preview holds the title, the
  summary, the Story's views as pictures with their callouts, every note on the Notes track (not
  only those in the Story), the methods paragraph and the outputs list. Generate writes it as an
  output clip.
- **Controls:** 13 acts (4 of them the typed title).

**10. Present**

- **What you do:** press the project chip, Present. Press Next under the graph; press End.
- **What you see:** the band, monitor and drawer fold away; the graph animates to each shot with its
  callouts; Next and Back chips sit under the graph; End brings the panels back.
- **Controls:** 4 acts.

**11. Save as final and hand everything to the laptop**

- **What you do:** press the project chip, Save as; add "final" to the suggested name; press Save.
  Press the project chip, Outputs, "Send all to laptop".
- **What you see:** "Case 2026-114 final" saved; the Outputs list (picture, table, GraphML, methods
  paragraph, report, the evidence note) sent to the laptop's Outbox in one act.
- **Controls:** 8 acts.

**Tally:** about 88 acts; 5 on the graph (6 percent), 2 drops, a few world grabs. Publishing is
panel work by nature: exports, names, text and recipes. The proof journey tests the idea's other
half -- that the edit eight clips back is understood before Apply, that the replay on new data
stops where it should, and that the report gathers what the timeline already holds -- not the
graph share, which the basic journey carries.

### W05 Path Investigation -- Sarah, fraud analyst

**Persona:** the fraud analyst (`design/designloom/personas/fraud-analyst.yaml`), Sarah: eight years
in financial crime, 50 or more alerts a day, high time pressure, builds evidence for prosecution.
**Data:** a transactions project of 9,400 accounts and 31,000 edges typed transfer (directed),
shared device and shared phone (undirected), already open with a "Last 30 days" view filter.
**Device:** Meta Quest 3 with controllers, seated, unpaired.

**1. Target selection: the source**

- **What you do:** press B; type "48213" in the drawer's search; press the ACC-48213 row; tap "Route
  from here" on its peek card.
- **What you see:** the search lists matching accounts above matching commands, each with two values
  (created date, degree) to tell look-alikes apart. Pressing the row frames the account and opens
  its peek card. A route clip lands dimmed, marked "needs To", with a From pin on the account; it
  never runs until To is set.
- **Controls:** B, typing (2), 2 presses. 5 acts.

**2. Target selection: the target**

- **What you do:** ACC-10077 is on the far side of the graph. Press the search field, type "10077",
  press the row, and tap "Use as To" at the head of its peek card's verbs. (Had it been in view,
  a pinch on it and "Use as To" would do.)
- **What you see:** a pinch on any node only shows it; because a route is waiting, its peek card
  leads with "Use as To". The route runs.
- **Controls:** press, typing (2), 2 presses. 5 acts.

**3. Path finding**

- **What you do:** read the route's sentence. Pinch each next account on the route, in turn.
- **What you see:** landing frames the route on the graph (a view change, not a clip). The clip
  reads "Shortest route [ACC-48213] to [ACC-10077] [following transfer direction] through [all link
  types] [unweighted] -- 4 hops: 2 transfers, 1 shared phone, 1 shared device -- on 9,400 of 9,400
  accounts". The route strip unrolls under the graph: five account cards, and on each link its
  type, an arrow for direction, its date and amount. A hop taken against the transfer direction
  would read "against the transfer"; a transfer older than the hop before it reads "before the
  previous hop", and the clip counts such hops. Route members the "Last 30 days" filter hides are
  drawn as faint outlines while the route is lit, and their hops read "outside Last 30 days (Aug
  21)". Each pinch on the next account opens its peek card and frames that hop in depth (the off
  stick steps the same way).
- **Controls:** 4 pinches on the graph. 4 acts, 4 on the graph.
- **If they are not connected:** the clip reads "No route: ACC-10077 is in another component (14
  accounts)". That is the finding, recorded. "Route within this view" sits beside the whole-graph
  result as a one-press variant.

**4. Path comparison**

- **What you do:** pull the route clip's value tab from 1 route to 3. Pinch ACC-77310 on the graph;
  pinch an edge of the second route and of the third.
- **What you see:** while pulling, the count of routes at each value pops out. Released at 3, the
  monitor shows a route table: one row per route with length, hop count, link types and its
  intermediates as chips, plus "on how many routes". ACC-77310's peek card reads "on 3 of 3
  routes": the broker. A pinched route edge lights that route on the graph in its own color and
  dims the others.
- **Controls:** a value tab drag; 3 pinches on the graph. 4 acts, 3 on the graph.

**5. Context**

- **What you do:** press the route clip's fold, then "Select all 3 routes". Pinch the new hull;
  hold "Focus on these"; set "Fade others"; pull the context ring outward one notch. Turn the graph.
- **What you see:** "Select [routes 1 to 3 of 3] -- 9 accounts" lands with a hull. The Focus clip
  reads "Focus on [routes 1 to 3] and [1] hop around -- 38 of 9,400 -- fade others -- For viewing".
  Turning the graph shows the routes in depth with their context around them.
- **Controls:** 2 presses, pinch on the graph, held verb, switch, ring drag on the graph; world
  grabs. 6 acts, 2 on the graph.

**6. Intermediate interpretation**

- **What you do:** tap Review on the routes' peek card. The first time, set its question slot to
  "Role: broker, mule, victim, incidental". Answer each of the 5 intermediates; add a reason chip to
  two. Then pinch and hold ACC-77310 on the graph.
- **What you see:** the Review clip frames each intermediate on the graph in turn, with its
  attributes and its links on the routes. Reason chips come from recent reasons, so nothing needs
  typing. The clip face reads "Reviewed 5: 1 broker, 2 mules, 1 incidental, 1 skipped". Holding
  ACC-77310 lights every clip in this project that touched it, and adds a row "Also in other
  projects: Case 2026-097 -- note 'shared phone with ring 4' -- Open". That is the cross-case link
  Sarah needs, found from the node.
- **Controls:** 10 acts, 1 on the graph.
- **Stubbed:** the index of other projects, keyed by the account ids that notes and reviews record.

**7. Evidence note**

- **What you do:** press the route clip, tap Note, accept the sentence, and mark it "Finish at the
  desk".
- **What you see:** the note starts as a sentence built from what is lit: "[Route 1] from
  [ACC-48213] to [ACC-10077] passes through [ACC-77310], reviewed as [broker]." Its target records
  the routes' accounts and links by id, and the date window. Two more sentences on a ray keyboard
  would take one to two minutes, so "Finish at the desk" opens the note as a draft on the 2D page.
- **Controls:** 4 acts. This step is measured in time, not acts.

**8. Evidence report and save**

- **What you do:** on the route clip's fold, press Evidence report, then Generate. Press the project
  chip, Save as, type "2026-114" after the suggested "Case", press Save.
- **What you see:** the evidence report holds the hop table (accounts, link types, direction, dates,
  amounts), the review answers and reasons, the note, how the route was computed, and a picture of
  the framed route with its highlight drawn as a style automatically. It goes to the Outputs list.
  Unpaired, getting it into the case file means taking the headset off and downloading it from the
  2D page, about two minutes; that trip is part of this journey's cost.
- **Controls:** 8 acts.

**9. Save the work as a recipe for the next alert**

- **What you do:** press the route clip, In; press the Focus clip, Out; Save as recipe; type "Route
  check"; Save.
- **What you see:** the recipe's inputs are From and To; the route, review and focus clips follow.
- **Controls:** 8 acts.

**The second alert:** B, the "Route check" row, From (type and press), To (type and press), Run --
about 9 acts to a framed, focused route with its review waiting, then one answer per intermediate.

**Tally:** about 54 acts for the first alert, 10 on the graph (19 percent), plus world grabs; about
9 for each alert after. The workflow's three success criteria are met in the scene: the connection
is established or shown not to exist, with the reason; each step is readable (hop by hop, with type,
direction and date); and the key intermediaries are identified, as a recorded review rather than a
memory.

### W18 Data Import and Validation -- Analyst Alex

**Persona:** Analyst Alex (`design/designloom/personas/analyst-alex.yaml`): an intermediate analyst,
weekly user, who wants reproducible analyses and complains of "no way to save analysis patterns".
**Data:** two CSV exports from his company's contact system: `contacts.csv` (1,240 rows, 9 columns:
email, name, company, region, title, created, owner, segment, score) and `introductions.csv` (3,906
rows: from_email, to_email, date, channel). Precomputed issues: 37 introductions name an email that
is not in contacts, 12 contacts appear twice with different capitalization, 214 dates use
day-month-year where the rest use year-month-day, and 6 percent of contacts have no region.
**Device:** Samsung Galaxy XR with hands, seated, unpaired.

Data preparation becomes clips on the Data track, so the field mapping and every fix are part of
the record, and next week's file replays them.

**1. Source selection**

- **What you do:** on graphty's 2D page, press Open files and choose both files; press Enter VR. In
  the headset, press "Read the 2 files picked on the page" on the start card.
- **What you see:** the data clip at the timeline's head opens into two Read clips on the Data
  track. Nothing leaves the immersive session once it has started.
- **Controls:** 5 acts (4 on the 2D page).

**2. Format detection**

- **What you do:** press the first Read clip.
- **What you see:** its sentence: "Read [introductions.csv] as [CSV edge list] -- comma, header row
  -- detected, high confidence". The format chip is a choice listing the readers with the detected
  one marked; below it, the reader's options as generated controls. contacts.csv reads as "[CSV node
  table]".
- **Controls:** 1 act; a format change, if needed, is a slot pick.

**3. Field mapping**

- **What you do:** press "Map columns" in the Read clip's verb row. Check the proposed roles:
  from_email is source, to_email is target, and email in contacts is the node id. Change "score"
  from text to number.
- **What you see:** one row per column, each with three sample values, the inferred type and a role
  choice. A "Map columns" clip lands after each Read, with sentences like "[from_email] is
  [source]". A column per row, so a 40-column file scrolls down instead of across.
- **Controls:** 3 acts.

**4. Preview**

- **What you do:** look at the graph space; pinch two preview nodes.
- **What you see:** a ghost preview graph of the first 500 introductions, labeled "Preview: first
  500 of 3,906 rows -- nothing loaded yet". A pinched preview node's peek card shows its source row.
- **Controls:** 2 pinches on the graph. 2 acts, 2 on the graph.

**5. Load**

- **What you do:** press Load on the data clip.
- **What you see:** the graph fills progressively; Cancel is in the monitor. "Loaded 1,240 contacts
  and 3,869 introductions -- 37 rows not loaded" lands on the data clip.
- **Controls:** 1 act.

**6. Validation**

- **What you do:** press "Check data" on the data clip; hold the Quality clip.
- **What you see:** a Quality clip lands on the Data track. The monitor lists issues by severity,
  each with its count, what it means and its fix verbs:
    - error: "37 introductions name an email not in contacts" -- Add them as contacts, Leave them
      out;
    - warning: "12 contacts look duplicated (same email, different capitals)" -- Merge by lowercase
      email, Review;
    - warning: "214 dates in day-month-year" -- Parse as day-month-year;
    - info: "region missing for 6 percent" -- Show them.

    Each issue also lights on the graph: the 37 missing endpoints as red stubs, the duplicate pairs
    joined by dashed lines, the regionless contacts outlined. Holding the Quality clip shows them all
    at once.

- **Controls:** 2 acts.

**7. Decide blocking or warning; clean now or later**

- **What you do:** pinch one red stub on the graph to see its row (a typo, "jsmith@acme,com"). Hold
  "Leave them out" on the error. Press Review on the duplicates: answer Yes to the first pair, then
  "Yes to the rest at this confidence or above"; answer the last two pairs, Yes and No. Hold "Merge
  by lowercase email". Press "Parse as day-month-year".
- **What you see:** the Review clip sorts pairs by match confidence and frames each pair on the
  graph in turn; ten are exact matches apart from capitals, so one answer covers nine more. The two
  left are judgment calls; one is two different people. Each fix lands as a clip on the Data track
  before any analysis clip: "Left out [37] introductions to unknown emails", "Reviewed [12]
  duplicate pairs: 11 yes, 1 no", "Merged [11] pairs by [lowercase email]", "Read [date] as
  [day-month-year] for [214] rows". The ripple bar is quiet, because nothing is downstream yet.
  Cleaning later is the same act: a fix landed after analysis clips becomes an edit to the past,
  with the ripple bar.
- **Controls:** 9 acts, 1 on the graph.

**8. Quality report**

- **What you do:** press the Quality clip again, then "Export report".
- **What you see:** counts before and after, every issue and what was done about it, and the field
  mapping as sentences (the "field mapping documentation" the workflow asks for), written as an
  output clip to the Outputs list.
- **Controls:** 2 acts.

**9. Next week**

- **What you do:** press the data clip, then "Replace data, keep my steps", then "Leave VR to pick";
  choose the new exports on the 2D page and press Enter VR.
- **What you see:** the session draft is restored; the Read, Map, fix and analysis clips replay in
  order. The Review clip asks only about pairs it has not seen. A column the new file lacks stops
  its Map clip amber with Fix (a picker of the columns it does have), Strike, or Branch from here.
  The Quality clip shows this week's counts beside last week's.
- **Controls:** about 6 acts plus one per new duplicate pair.

**Tally:** about 25 acts for a first import with its review, 3 on the graph (12 percent), and about
6 a week after that. Data preparation is panel work here, as at the desk; what the headset adds is
seeing each issue on the graph. W18's three success criteria map to the design: common formats load
without help (detection and proposed roles), every major issue is flagged before analysis (the
Quality clip, lit on the graph), and time to a loaded graph is short (progressive load with Cancel).

---

## 6. How it grows

Every list, form and verb row is generated from graphty-element's descriptors, so new entries
arrive without new controls:

- **The algorithm catalog with options.** The drawer is searched (plain and technical names),
  browsed by family and by the kind of value an algorithm returns, and keeps a recent row. Each row
  shows its cost for this graph. Every run, of 29 algorithms or 60, is one clip kind on the
  Analysis track. Options are slots on the clip's sentence with controls generated from their kind:
  number, decades, choice, several of a list, toggle, column, node, set, rule, formula. Slots that
  point at the graph get handles generated the same way: a node slot is a pin, a hop count is a
  ring, a set is a hull. An unknown kind says "Set this on the 2D page". A batch ("Run several") is
  one clip with a tab per run.
- **Layouts.** Each layout is a clip on its own Layout track, with generated controls. Stop records
  the iteration reached, and every layout records its seed, so replay draws the same picture.
  Pinned nodes are pins on the graph.
- **Styling layers.** Each layer is a Style clip; the paint order is the layer stack in the track
  head, reordered there without moving clips or replaying analysis. "Paint only these" is a drop
  of a style onto a set's hull. Presets are recipes of style clips; a preset whose layers match
  existing ones changes them in place.
- **Compare.** "Keep the old version on a branch" after any edit, or "Variant of this" before one,
  forks the timeline; the diff lane marks added, removed and changed elements on the graph. "Compare
  with" compares two runs on one branch or across branches (a group-overlap table for communities,
  side-by-side ranks for values). "Simulate removing" forks from Main by default, names its fork
  point ("Scenario: remove ACME, from Main"), and opens with its target pin ready to drag, so the
  next scenario is one drag to the next node. More than two branches are a table on the project
  page, each row with "Go to this branch". Show both (two synchronized graphs) is in the design,
  refused above a frame cost.
- **History and recipes.** In and Out on the ruler bracket a span; Save as recipe turns every node
  pick, group pick, value range, date window and column into a named input slot, filled or skipped
  when the recipe runs. A recipe runs as clips the person can edit afterward, with the same
  stop-and-ask on changed references. The methods list (the Analysis track head) keeps tried and
  dropped runs, dimmed, as well as the ones in force.
- **Across projects.** An index of saved projects keyed by the member ids that notes and reviews
  record lets a held node list "Also in other projects". Cases can also be branches of one standing
  project when a team prefers that.
- **Routes in time.** A route that follows only hops forward in time is a graphty-element
  capability that does not exist yet; it is planned, and would arrive as one more choice in the
  route's direction slot.
- **Import.** Each reader is a Read clip with its own generated options; joins are a Join clip with
  key slots and a match count; Generate is a data clip from a model, size and seed.
- **Export and reports.** Every writer appears in Export with its options; every export, picture and
  report is an output clip. Report takes its findings from the Notes track and the Story, with a
  preview before Generate.
- **Plugins.** A plugin command declares the object kinds it accepts and joins those objects' verb
  rows under More; its algorithm, layout, reader, writer or palette appears in the drawer, Open,
  Export or the palette list. A plugin never gets a button, a stick direction or timeline code.
- **AI, optional.** "Ask" on the project page proposes ghost clips at the end of the timeline;
  Keep lands them, Discard removes them. Nothing in the design depends on it.

**The honest limit.** Four things do not grow well:

- **Long sessions.** A few hundred clips need ruler zoom, search over clip sentences and folded
  tracks.
- **Replay cost at scale.** Editing an early filter on 100,000 nodes re-runs everything that depends
  on it; Hold result trades freshness for speed.
- **Wide tables and long text.** Seven columns at a time, and the laptop or the 2D page for long
  writing.
- **The 2D page has no timeline.** A project made in the headset opens at the desk as one branch's
  linear history; the branches, struck clips and the Story wait in the sidecar for the next headset
  session.

---

## 7. Checks inside the mock

Each check is a measurement taken while people do the journeys above, not a separate test.

| Question                                                             | Measured how                                                                                                                                                                                                                | During                                                                               | Pass line                                                                                                                       |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Is the graph in space used?                                          | Acts on nodes, edges, hulls and handles against all acts; drops and world grabs counted apart; how often drops are chosen over the Run and Color buttons, and pins and rings over value tabs and slots                      | Basic journey, unpaired                                                              | At least one act in four on the graph, without drops or grabs                                                                   |
| Are the handles found?                                               | Whether people change a hop count, a cut or a route end by its handle on the graph or by its slot in the monitor                                                                                                            | Basic steps 4, 8, 10; proof step 4; W05 step 5                                       | Most use a handle unprompted after first seeing one                                                                             |
| Does the input layer read gestures right?                            | Misread gestures by kind (press read as grab, scroll as tear-out, probe as shuttle, and the reverse) and accidental system menus, per device                                                                                | The week-2 gate, then every journey                                                  | Fewer than 1 misread in 20 acts on each device; system menus recorded                                                           |
| Do people grasp "press to look, verb to act"?                        | Presses on nodes followed by surprise that nothing was selected; presses of Select. Split by people who have used graphty's 2D page (where a click selects) and people who have not                                         | Basic steps 3 and 6, over three sessions                                             | Most press Select unprompted by the third node; desktop users' surprise falls by the third session                              |
| Do quick taps commit unseen?                                         | Hides, removals, filters and forks committed without the person having seen the preview (asked after); pinned previews used                                                                                                 | All journeys                                                                         | None                                                                                                                            |
| Can people fix an old clip with hands?                               | Wrong-clip edits, handle overshoots, time from deciding to Apply                                                                                                                                                            | Basic step 10; proof step 2; W18 next week                                           | Most fix the old step without Undoing past it                                                                                   |
| Do people read the ripple bar before Apply?                          | After Apply, ask what changed; compare with the bar's text                                                                                                                                                                  | Basic step 10; proof step 2                                                          | Most name the note that changed before seeing it                                                                                |
| Do people read the blast radius on the graph?                        | Whether people hold a clip or a node before editing; whether they predict which nodes will change                                                                                                                           | Basic step 10; proof step 2; W05 step 6                                              | People use the hold unprompted after one demonstration                                                                          |
| Does the stop-and-ask catch drift?                                   | Which choice people take at each stop, and whether they can say why                                                                                                                                                         | Proof step 7; W18 next week                                                          | No one follows a swapped group or window without seeing old and new side by side                                                |
| Does "For viewing / For analysis" prevent silent wrong measurements? | Filters landed after runs; how many measured-before warnings fire; how many are ignored                                                                                                                                     | W05; the proof journey                                                               | Warnings fire only on analysis filters, and most are acted on                                                                   |
| Do forks stay apart?                                                 | Second scenarios built on the first by mistake                                                                                                                                                                              | A pair of what-if scenarios on Les Miserables (remove one hub, then another), tier 2 | None                                                                                                                            |
| Does the playhead animation help or sicken?                          | Use of the shuttle; comfort ratings; photosensitivity cap at two whole-graph updates a second                                                                                                                               | Basic and proof journeys                                                             | No one stops for discomfort                                                                                                     |
| Frame time                                                           | Quest 3 frame time, in stereo, on the 9,400-account fixture during cross-fades, held previews, handle and value-tab drags. Above a few thousand nodes, previews go through the highlight and the restyle happens on release | W05; the proof journey                                                               | The headset's refresh held at the 95th percentile (13.9 ms at 72 Hz); if not, shrink the fixture and report the size that holds |
| Can people read and hit the band?                                    | Reading a clip's label and hitting a slot on a clip with every track open (six on Quest 3 and Galaxy XR, four on Vision Pro), on each device                                                                                | A seeded project of 40 clips                                                         | 9 reads in 10 correct; slot hits under 2 s with no wrong hits                                                                   |
| Neck, eye and arm load                                               | Neck pitch and head turn over time; eye strain ratings; how long hands are raised above the band and at what height; band low and lifted                                                                                    | An hour seated                                                                       | No neck or eye strain reported; head turns stay within 20 deg for most acts                                                     |
| Navigating a long timeline                                           | Time to find a named clip among 300 (ruler zoom, clip search)                                                                                                                                                               | A seeded long project                                                                | Under 20 seconds                                                                                                                |
| Dense picking                                                        | 12 scattered nodes among 400 and among 10,000, hands and controllers; Cutting Room's answer is search, the "which one?" list, the magnifier and the region slab                                                             | The shared picking test                                                              | Compared with the other five mocks                                                                                              |
| Text in the headset alone                                            | Time (not acts) and errors for the notes, search terms, title and summary, unpaired and then paired; how often "Finish at the desk" is chosen                                                                               | Basic step 9; W05 step 7; proof steps 5 and 9                                        | Recorded for comparison, not passed or failed                                                                                   |
| Data preparation as clips                                            | Whether people understand that the Map and fix clips replay next week; act count for the second import                                                                                                                      | W18                                                                                  | Next week's import in under 10 acts plus new review pairs                                                                       |
| Repeat work by recipe                                                | Acts for the second alert with "Route check"                                                                                                                                                                                | W05 second alert                                                                     | Under 10 acts before the review answers                                                                                         |

---

## 8. Why it should work, and known risks

### Why it should work

- **Editors already work this way.** The split between a source monitor (look and mark, nothing
  changes) and a timeline (what you commit) is how every editor since Avid works. A spring-loaded
  stick, or a pinch slid on the ruler, is the shuttle ring on an editing console.
- **Editing the history ships in CAD, by handles on the model.** Fusion 360's timeline, SolidWorks'
  rollback bar, Houdini and Blender's modifier stack all let a person change an early step and
  recompute the rest, and CAD tools let a feature's dimensions be dragged on the model itself --
  the hop ring and the pins here.
- **Provenance research supports it.** VisTrails compares versions of visualization pipelines.
  Heer et al. (2008) found that analysts used a browsable history to revisit and communicate
  their work.
- **Timelines already work in headsets.** Quill and Tvori put a timeline under a 3D scene and edit
  it by hand.
- **The studio's evidence.** Cutting Room had the largest climb in the studio. Its last-round mean
  was 3.63 on a 1 to 5 scale, and its efficiency (3.5) tied for best among the finalists. Reviewers
  named "press is a peek, a verb is an act" the best combined answer to accidental activation and
  feedforward. Weekly analysts valued "Replace data, keep my steps" most of all.
- **Undo is where most XR apps are weakest.** Here the last edit is one press away, every older step
  is visible, and a fix in place names its consequences before it lands.
- **The binding model comes from reviewed designs.** The binding model and stop-and-ask come from
  Editable Record, whose replay checks reviewers walked a week later and found sound. The review
  step comes from Patch Bay.

### Known risks and mitigations

| Risk                                                                                              | Mitigation                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The replay engine does not exist in graphty-element at scale, and it is the idea                  | On small graphs the mock replays for real by re-running the journal with one command edited or struck; at 9,400 accounts it uses precomputed states and says "not in this mock" for unscripted edits. The first engine milestone is graphty-element doing that replay itself, in a worker. Branches and the diff lane need two journals sharing a prefix and a state diff, later |
| The graph share clears the exit criterion by one act                                              | The basic journey reaches 10 of 39 only if people use the handles; the handles check measures it. If they prefer slots in the monitor, the design is a desktop history panel in a headset, and the result says so                                                                                                                                                                |
| Path investigation, data import and publishing stay panel-led (19, 12 and 6 percent on the graph) | W05 now walks routes on the graph and frames each hop; import and publishing are panel work by nature. These are reported, not hidden; the exit criterion is the basic journey's                                                                                                                                                                                                 |
| The input layer is the hardest part and is shared by panels and graph                             | Built first, with a gate at week 2 on all three devices; the misread check runs in every session after                                                                                                                                                                                                                                                                           |
| References re-bind silently on replay (a group number, a date window, a pick from a table)        | Rules 6 and 7: every reference records its binding and its resolved members; any change stops the replay at that clip with old and new side by side; recipes turn group, range and date picks into input slots. graphty-element must come to store what each reference resolved to; the mock records it in its sidecar meanwhile                                                 |
| "Re-measure here" quietly recolors a published figure from a run on a subset                      | View filters (the default) never raise the warning. The warning offers "This filter is for viewing" beside "Re-measure here". Re-measure names every style and filter it would re-point before it does                                                                                                                                                                           |
| A second scenario stacks on the first                                                             | "Simulate removing" forks from Main by default and names its fork point. Branch rows have "Go to this branch". The banner always names the branch                                                                                                                                                                                                                                |
| A destructive act picked from a ranked table re-derives onto the wrong pair next week             | Merges, removals and hides record members by id. A change in a pick's members always stops and asks                                                                                                                                                                                                                                                                              |
| The metaphor is unfamiliar to non-editors                                                         | The playhead stays at the end and new clips append there, so the timeline reads as a log; Undo works as expected; empty tracks stay folded; the first-run legend and "Looking -- press Select" teach the one rule                                                                                                                                                                |
| People coming from graphty's 2D page expect a click to select                                     | The surprise is measured over three sessions, split by prior use; the hint repeats until Select has been pressed three times                                                                                                                                                                                                                                                     |
| Neck and arm load                                                                                 | Band 60 to 65 cm away and at most 50 deg wide; the monitor within 15 deg of center; seated users start lifted; head turns and raised-arm time are measured                                                                                                                                                                                                                       |
| The playhead's animation flashes the whole graph                                                  | Two whole-graph updates a second at most; cross-fades; reduce motion turns them into cuts                                                                                                                                                                                                                                                                                        |
| Frame time on the 9,400-account fixture in stereo                                                 | Animation from stored typed arrays straight into instance buffers; previews through the highlight above a few thousand nodes; the frame-time check shrinks the fixture if needed                                                                                                                                                                                                 |
| Speculative ripple-bar replays are slow at scale                                                  | The bar shows time and broken clips at once, from estimates and column checks, and fills in member changes when the worker finishes. Nothing applies before Apply                                                                                                                                                                                                                |
| Vision Pro targets on the band are tight, and it has no hover                                     | Four open tracks; 2.5 deg gaps; value tabs open a knob in the monitor; name tags at pinch start; drags commit only after stillness                                                                                                                                                                                                                                               |
| Text in the headset alone is slow                                                                 | Sentences built from what is lit, suggested names, completions from the data, dictation where it exists, "Finish at the desk", the phone and laptop keys when paired                                                                                                                                                                                                             |
| Files cannot come in or go out inside an immersive session                                        | Files are picked on the 2D page before Enter VR or with "Leave VR to pick"; outputs wait in the Outputs list or go to the paired laptop                                                                                                                                                                                                                                          |
| The system pinch gesture may open a system menu                                                   | The design asks for no hand pose and keeps band targets above the resting hand; accidental menus are counted per device                                                                                                                                                                                                                                                          |
| Saved projects grow with kept versions                                                            | Old versions are kept only where an output read them, as folded versions under the clip                                                                                                                                                                                                                                                                                          |
| Two clocks: history and data time                                                                 | Data time lives only in a time-window clip's own transport, in its own color, never on the stick                                                                                                                                                                                                                                                                                 |

---

## 9. What we learn by building it

This is the only mock whose mode model is editing the history, so it answers questions the other
five cannot:

- **Is a visible, editable history worth its surface in a headset?** The other mocks keep history
  as an undo list. This one makes it half the scene. If people fix old steps in place, replay a
  week's work on new data and read the ripple bar, history is a primary surface. If they only press
  Undo, it is not, and the other mocks' undo lists are enough.
- **Does editing history on the graph change how people reason?** Pulling an old step's hop ring
  in while its consequences pulse, holding a clip to see what it touched, and holding a node to see
  what touched it exist nowhere else. We learn whether provenance drawn and edited on the real nodes
  helps people predict and explain consequences.
- **Can a replay be trusted enough to publish from?** The stop-and-ask on changed references, fixed
  outputs and view filters are the most explicit answer in the set to "did the replay quietly change
  what my work is about?". The proof journey measures whether people catch drift.
- **Does "press to look, verb to act" calm first sessions without slowing experts?** The other mocks
  give a press some effect; this one never does. Comparing error rates and act counts tells whether
  that rule should be shared.
- **Does scope by drop work?** Dropping a run on the graph or on a hull, instead of reading a scope
  setting, is tested only here.
- **Is data preparation better as replayable steps?** W18 here turns the field mapping and every
  fix into clips that replay next week. The other mocks treat import as a dialog.
- **What graphty-element must build.** The Vision Pro pointer path in its XR input handler; replay
  of its own journal with a command edited or struck; a record of what each run read and what each
  reference resolved to. The mock shows which of these the interaction needs first.

---

## Review notes

### Round 1

Four reviews: `reviews/r1-cutting-room-1.md` (overall), `reviews/r1-cutting-room-2.md` (VR
interaction), `reviews/r1-cutting-room-3.md` (Sarah walking path investigation),
`reviews/r1-cutting-room-4.md` (WebXR feasibility). No finding was at severity 4. The severity 3
findings and what was done:

| Review | Finding                                                                        | What was done                                                                                                                                                                                                                                                                             |
| ------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | The proof journey, "Publish the analysis", was never walked                    | Walked step by step in section 5: reopening, an edit eight clips back, preset and layer order, focus, callout, methods, a recipe replayed on a second dataset that stops at a changed window and a drifted group, exports, Story and report, Present, hand-off. Counted, with stubs named |
| 1      | Step 10's 2-hop mistake contradicted steps 4, 5 and 9                          | Step 4 now pulls the hop ring out to 2 hops (12 families); step 5's zone reads "these 12", step 9's note "Medici and 11 partners" with 5 showing and 7 faint, step 10 pulls the ring back to 1                                                                                            |
| 1      | Editing the past worked only for scripted edits                                | Small samples replay for real through graphty-element's commands; precomputed states only at 9,400 accounts, the second dataset and the comparison lane; a free-form and scripted table in section 2                                                                                      |
| 1      | The headset added display, not interaction                                     | Handles on the graph for open clips (hop rings, pins, sweep handles, note pins, rescoping by dragging a clip onto a hull); step 10 pulls the ring in on the graph; every harder journey reports its graph share                                                                           |
| 2      | The proof journey was never walked                                             | As above                                                                                                                                                                                                                                                                                  |
| 2      | The basic journey missed the exit criterion once grabs and drops were left out | Recounted with grabs and drops in their own columns: 10 of 39 (26 percent) from pinches, the hop ring, the cut pin and holds. The thin margin is a known risk and a check                                                                                                                 |
| 2      | Verbs acted on a state the person was not looking at                           | Rule 4: away from the end, verb rows offer Insert here, Branch from here, Add at the end (which previews at the end)                                                                                                                                                                      |
| 2      | A tap committed before the preview could be read                               | Rule 2: adding verbs commit on tap with Undo; hiding, removing, filtering, focusing, merging and forking need a 300 ms held preview, and a shorter tap pins it with Apply and Cancel                                                                                                      |
| 2      | World grab needed empty space a dense graph lacks                              | A press that travels 2 cm (3 deg on Vision Pro) within 300 ms becomes a grab; a grab frame around the graph                                                                                                                                                                               |
| 2      | Dense picking had no answer on Quest or Galaxy XR                              | The "which one?" list on every device by a ratio test, a magnifier at the ray tip, a depth slab with a count for Select region                                                                                                                                                            |
| 2      | Scope by drop changed with a centimeter of drift                               | Zone hysteresis, the target frozen at the last still moment, two large tiles near a nested edge                                                                                                                                                                                           |
| 2      | The stubbed replay covered only scripted edits                                 | As in review 1: real replay on small samples; a "not in this mock" card elsewhere                                                                                                                                                                                                         |
| 3      | An open route slot changed what a pinch does                                   | A pinch only shows; the peek card leads with "Use as To"; an unfinished route is dimmed, marked "needs To", and never runs                                                                                                                                                                |
| 3      | The route hid direction and edge type                                          | Direction and link-type slots with defaults printed; arrows and types on every link of the route strip; mixed types counted on the clip; hops against the transfer marked                                                                                                                 |
| 3      | Hops hidden by the view filter were drawn over nothing                         | Route members always drawn, as faint outlines when hidden; hops marked "outside Last 30 days"; "Route within this view" beside the result                                                                                                                                                 |
| 3      | The cross-case note could not be reached                                       | An index of saved projects keyed by member ids gives "Also in other projects" on a held node; stubbed with two earlier cases                                                                                                                                                              |
| 3      | Path investigation was a panel workflow in a headset                           | Routes frame on landing; the route strip sits under the graph, centered; hops are walked by pinching each next account (or the off stick), each framed in depth; route edges pinched to compare. Graph share 19 percent, reported                                                         |
| 4      | The "real" list did not fit 6 weeks and the panel layer did not exist          | Two tiers; panels on `@babylonjs/gui`; tier 1 is the basic journey, the proof journey and W05                                                                                                                                                                                             |
| 4      | The input layer across three devices was unscheduled                           | Built first, gated at week 2 on all three devices; the Vision Pro pointer path in graphty-element's XR input handler; a misread check per device                                                                                                                                          |
| 4      | The replay stub put every edit of an old clip on rails                         | Per-step states stored as typed arrays for the playhead, probes and diff lane; the journal replayed with one command edited or struck; only drift matching across data versions, implicit reads and the large fixture scripted, and labeled                                               |
| 4      | No frame-time check                                                            | A frame-time row in section 7; animation from stored arrays into instance buffers; previews through the highlight above a few thousand nodes; shrink the fixture if it fails                                                                                                              |

The severity 2 and 1 findings were also applied: the basic journey starts at the in-headset start
card; selections that nothing reads fold into one "Explored" clip; layouts have their own track;
band legibility and hit checks with the Vision Pro four-track limit; the band folds to its ruler
while typing; PageRank prints its damping; the earlier rounds' table and its unexplained references
are gone; peek cards give a node press one meaning; the band moved to 60 to 65 cm and at most 50
deg; the lap and system-gesture claims are gone; broken clips stop the replay with Fix, Strike or
Branch; value tabs replace trims; route members hidden by a filter are outlined; review sorted by
confidence with "Yes to the rest"; the press-to-look check is split by prior graphty use over three
sessions; probes stay probes; Vision Pro offers "Keep 0.070?"; the Scale chip is sticky; a sideways
drag on a clip scrolls the band; route verbs, one Focus verb, role answers with reasons, the
evidence report, slot sentences for notes and "Finish at the desk", the "Route check" recipe, hop
time order, and one search field; files picked on the 2D page or with "Leave VR to pick"; the
blast radius computed from slots with implicit reads marked; style previews in an element
transaction; a sidecar file and persistent storage; the microphone prompt on the 2D page; Vision
Pro name tags at pinch start.

Open severity 3 or 4 findings after this round: none.
