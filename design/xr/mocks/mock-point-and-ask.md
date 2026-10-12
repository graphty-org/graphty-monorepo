# Mock: Point and Ask

Date: 2026-10-10. One of the six VR mocks chosen in [the mock recommendation](../xr-prototype-mocks.md) (this folder). A mock here is an
architectural spike of one whole interaction model: a complete idea of how graphty could work in a
headset, built so people can do graphty's basic journey end to end in it and so it can be compared
with the other five. This one is the AI-mediated design, and it is complete with no language model
and no voice.

Built on Point and Ask (prototype 34), with the command sentence of Search Everything (prototype 25)
as its hand path. Prototype files are `prototype-<N>.md` in [prototypes/](../prototypes/README.md). What each review asked for and what
changed is listed in "Review notes" at the end.

---

## 1. The idea

**You say what you mean by pointing, and what you want in words. graphty shows the words back as
its own command, and nothing changes until you press Go.**

In this design graphty works like a conversation with a very literal assistant that can only use
graphty's own buttons:

1. **Point at what you mean.** Pinch a node, an edge, a ranking row, a layer chip, a run -- anything
   graphty has a name for -- and it drops into a target tray under the graph as a numbered chip,
   with the same number drawn on the object in the graph. When a request is waiting for a target or
   a value, the graph glows wherever a pinch can supply it: pinch a node to fill "from", a second
   node to fill "to", a node to use its value as a threshold, an edge to name its type, or sweep a
   flat hand through a region to fill a set. Where an object is too small, too far or hidden, press
   Tags: every visible object gets a two-letter tag, and typing or saying the two letters works
   exactly like a pinch. Pointing never changes the selection; it only says "this is what I mean".
2. **Say or type what you want.** "Who did they marry into", "who matters most", "keep only the
   strong ones", "compare this with the Medici". Where voice is set up, hold the pinch on an object
   while you speak: the object is "this" and the request in one act, which is Put-That-There
   itself. A compiler on the headset turns plain requests into graphty's own undoable commands; an
   optional language model handles paraphrases and formulas. Neither can produce anything graphty's
   own command list does not contain.
3. **Read the sentence.** The request comes back as a sentence of slot tiles in graphty's terms:
   [Route] [from 1 Medici] [to 2 Strozzi]. Every tile can be pinched and changed one word at a
   time. Any value you did not give -- a number, a name, an id -- is an empty tile that glows (and
   glows in the graph), and for a vague word ("strong", "finer") the tile offers a few counted
   outcomes to choose from. Under the sentence, a preview line says what will happen ("keeps 5 of
   16 families, 4 marriages") and a Check list names every default you did not touch.
4. **Press Go.** Nothing that changes the project runs before Go. Undo always names the step it
   takes back.
5. **Keep the control.** Each request leaves its main control on a rail beside the graph: a hops
   stepper, a damping knob, a threshold handle, a palette strip. The next change is made by hand on
   that control, with no words at all. Over a session the rail becomes a console the person built
   by working, one page per object worked on.

**With no model and no voice**, the same sentence is built by hand. Pinch an object: its verbs
appear as tiles in the sentence line. Pinch a verb: its slots appear and glow in the graph. Fill
each slot by pinching an object, by a tag, or with the slot's own control. The hand path, the typed
path and the spoken path all end in the same sentence of tiles, so a person who learned one has
learned the others.

**Inspiration.** Bolt's "Put-That-There" (MIT, SIGGRAPH 1980): point, then speak, and the pointing
fills "that" and "there". The command palettes of VS Code, Raycast and Spotlight, where a chosen
command becomes a sentence with fill-in slots. DataTone and Eviza's ambiguity widgets, which show a
natural-language query back as editable choices. Vimium's link hints, the origin of two-letter tags
for naming what you cannot click. Blender's "Adjust Last Operation", which keeps the last command
adjustable after it ran. A mixing desk, whose faders stay where the engineer left them.

### How this differs from Paired Browser

Paired Browser (mock 1) is also object-first and also has worded verbs with counts, a command
palette, Again and a Check card. The two ideas differ in what the next input means:

- **Paired Browser: you are on one object's page.** Its verbs act on that page's object; a second
  object is reached by browsing to it or by ticking chips in a Basket. The page is the unit.
- **Point and Ask: you are building one request with several bound targets.** Targets come from
  anywhere -- the graph, a row, a stack chip, a run -- keep their numbers across requests, and are
  bound together in one sentence ("route from 1 to 2", "compare this with the Medici", "keep
  families at least as strong as this one", "put this layer under the community color"). Words fill
  what cannot be pointed at. The request, not a page, is the unit, and each request leaves its
  control on a rail the person builds.

The head-to-head the two mocks share measures acts, time and errors for the same multi-target
requests in both: a route between two pointed nodes, a comparison of two, a filter cut at a node's
value, a note on one node that names two others, and a layer moved under another.

---

## 2. What the mock is

### Surfaces

Everything sits on a solid colored background in full VR. Positions are for a seated person; the
same layout recenters for standing. Angles are below the eye line unless marked.

| Surface              | Where                                                                                                                                                                                                                                                                                       | What it holds                                                                                                                                                                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The graph**        | A volume about 40 cm across, centered 5 degrees down at about 90 cm; its lower front edge is about 22 degrees down                                                                                                                                                                          | The graph; tray badges on targets; the glow on objects that can fill an open slot; the transient emphasis drawn by previews (never saved); tags when shown                                                                                                                                                                  |
| **The stack row**    | A thin row of chips at about 25 degrees down, 70 cm away, between the graph and the bar                                                                                                                                                                                                     | One chip per style layer and filter step in force, in order, each showing what it is bound to ("PageRank, latest"). Each chip is an object: pinching it puts it in the tray                                                                                                                                                 |
| **The sentence bar** | A gently curved strip about 50 degrees wide (about 60 cm at 65 cm), in three rows from about 28 to 38 degrees down, tilted toward the face                                                                                                                                                  | Row 1: the tray (Selection chip, up to four target chips, the recent fold) and the keys Talk, Type, Tags, Undo, Redo, Again. Row 2: the sentence line and the Go gate. Row 3: the preview line and the Check list                                                                                                           |
| **The keyboard**     | About 45 degrees down at about 45 cm, inside arm's reach                                                                                                                                                                                                                                    | graphty's in-scene keyboard, typed by touching the keys with a fingertip (by ray with controllers): a caret, a symbols page, and a completions row (whole commands, the data's names and ids, attribute names, set and view names). Docked by default on a device with no speech recognizer; the Type key shows or hides it |
| **The rail**         | A column left of the graph at about 65 cm, turned toward the face. Fixed at its top (about 8 degrees up to 0): the Project tile and the Overview miniature, with the Back key on the miniature's corner. Below, from 0 to 30 degrees down: one page of tiles, page tabs down its outer side | Live controls left by requests (knobs, steppers, threshold handles, palette strips, a find field, the readout). Four tiles a page, each about 7 degrees tall: a 2-degree header strip and a 5-degree body holding the handle, with the value printed on the handle itself                                                   |
| **The reader**       | Right of the graph at the graph's height                                                                                                                                                                                                                                                    | One result at a time, with tabs for recent ones: rankings, histograms, group tables, profile cards, comparisons, the catalog, full option forms, the route list                                                                                                                                                             |

Every target on the bar, the rail and the tray is at least 2 degrees tall and wide. A text size
setting grows the bar, the rail and the reader together.

**Capacity and overflow.** At 65 cm one degree is about 1.1 cm. Row 1 at the default text size: the
Selection chip about 6 degrees, four chips shown as number plus short name ("2 Medici") about 5
degrees each, the fold 2, six keys about 3 each: about 46 of 50 degrees. Row 2: a sentence of five
tiles at about 5 degrees each plus a 12-degree Go gate. When anything does not fit, in this order:
tray chips shorten to number plus six letters (the full name shows while pressed); a plan shows its
current card full width and the others as numbered stubs; a sentence wraps onto a second line of
row 2, pushing row 3 down; the keys fold into a two-column block at the bar's right end. The tray
and Talk are never hidden. Check 7 measures the widest sentence in the walks at the default and the
largest text size.

**The sentence line has four states.** Empty with no target: "Suggested for this graph" (three to
five commands chosen from the data and what has run). Empty with a target in the tray: that
target's verb tiles. Typing or listening: your words, with matches under them as you go. A command
chosen: the sentence of slot tiles. After Go, the sentence stays in past tense ("Routed Medici to
Strozzi") with Again beside it and up to three next tiles, including a two-target verb when the
newest two chips can fill one ("Compare 2 with 3").

**Verb strips.** A target's verbs are its six to eight most used, then More (the whole catalog
scoped to it, in the reader), then a gap of 2 degrees, then its warning verbs in the warning color
(Hide, Remove, Delete, Merge). Pinching a verb tile always builds a sentence; it never commits by
itself, except as the shared activation rule allows: a verb that only changes the selection shows
the new selection with its count while pressed ("Selection: 6 families, was none") and commits on
release, as one undo step. Commands that only move the camera or the transient emphasis (Find,
Frame, Inspect, Route, Compare, Go to view) apply once the sentence has shown for half a second,
and Back takes them back.

### Objects and where each one is pinched

graphty is object-first, and every object has a pinchable form in the scene, so any of them can be
"this":

| Object                   | Its pinchable form                                                                                       | Its verbs                                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graph                    | A short pinch on empty space inside the volume                                                           | Characterize, Run, Lay out, Filter, Style, Find, Fit, 2D/3D, Export, Note                                                                                        |
| Node, edge               | The element itself (snap cone and a "which one?" list in dense spots), its ranking or table row, its tag | Inspect, Select, Neighbors, Route from, Compare with, Note, Pin, Move, Style; then Hide, Merge (edges: Inspect, Select, Style, Note, What if removed; then Hide) |
| Selection                | The Selection chip, always first in the tray                                                             | Statistics, Keep as set, Filter to, Run on these, Lay out these, Style, Export, Note, Collect; then Remove                                                       |
| Set                      | Its chip (in the tray, on the rail, in the reader's set list)                                            | The selection's verbs plus Combine, Add, Remove members                                                                                                          |
| Run                      | The title of its reader or its rail page, or its chip                                                    | Read, Paint, Select from, Filter from, Re-run, Compare with, How made, Export; then Remove                                                                       |
| Style layer, filter step | Its chip on the stack row                                                                                | Edit, Move, Bind to run, Rename, Why this look (layers); Edit rule, Turn off, Move, Save as filter (filter steps); then Hide, Delete                             |
| Note                     | Its marker on its target                                                                                 | Read, Edit, Go to; then Delete                                                                                                                                   |
| View                     | Its thumbnail tile on the rail                                                                           | Go to, Rename, Update; then Delete                                                                                                                               |
| Project                  | The Project tile at the top of the rail                                                                  | Open, Save, Save as, Rename, Export, Pair devices, Assistant setting, Record determination                                                                       |

### The tray, the selection and the words that point

- **Pinching an object never changes the selection.** It puts the object in the tray and shows its
  verbs. Only a verb that says "select" changes the selection, and the change shows its count
  before it commits.
- **The Selection chip** sits at the tray's left end, always: "Selection: none", "Selection: 6
  families". Its **Collect** verb gathers by hand: while Collect is on (the chip pulses, the
  pointer reads "Adds to selection"), each pinch or tag on an object adds it to the selection or
  takes it out, and the running count shows on the chip. Pinch Collect again, or say "done", to
  end; the whole collection is one undo step. This is how 12 scattered nodes are gathered, or one
  is taken out of a 36-member selection.
- **The sweep.** With hands on Quest or Galaxy XR, a flat hand held in the volume for 300 ms grows
  a brush sphere at the palm; the nodes it passes light, with their count at the palm. A pinch
  commits: the swept nodes fill an open set slot, or join the selection during Collect, or else
  enter the tray as one set chip ("Swept: 9"). Withdrawing the hand from the volume cancels. On
  controllers and Vision Pro, the Selection chip's Brush key makes the next pinch-drag in the volume
  a brush instead of a turn, with a ring on the pointer while it is on.
- **Target chips** sit to the Selection chip's right, up to four. Each chip gets a number when it
  enters (1, 2, 3 ...), and the number stays the chip's for its whole life. The same number is
  drawn as a badge on the object in the graph. A fifth chip pushes out the least recently used
  chip, never one bound to an open sentence and never a pinned one (a long press pins a chip; at
  most two). A pushed-out chip slides into the recent fold at the tray's end, from which one pinch
  restores it with its old number.
- **"This"** is the newest chip; **"that"** is the one before it; **"it"** means "this". **"These",
  "those", "them"** always mean the Selection chip. A chip number ("2", or "#2" typed) names any
  chip directly. When "this" cannot fill the slot it lands in (a node where a run is needed), it
  skips to the newest chip that can, and its underline says so ("it = PageRank, run 1; skipped
  Guadagni").
- **Targets lock when the sentence is built.** Once the tiles show, each target tile holds its chip,
  drawn with a small lock on the chip and its badge. A later pinch still enters the tray but never
  rebinds an open sentence; instead a one-tap offer appears on the matching tile ("Use 5 Guadagni
  instead?"). Rebinding is always explicit: "no, this", the offer, or pinching the target tile and
  then an object.
- **What enters the tray by itself:** the chip of a command that produces something with members
  (a set, a run, an expansion, a route set, a match group). It enters marked "new" and becomes
  "this" only when the person pinches it or starts the next sentence. Readings -- charts,
  statistics, profile cards, comparisons -- never enter the tray.
- **Housekeeping pinches never enter the tray**: a tray chip (it becomes "this"), a slot tile, a key,
  a rail tile's header, a picker row.
- A word with nothing to take leaves its target tile empty and glowing ("Pinch it"), and Go stays
  off until it is filled.
- **Scope, one rule everywhere.** A request runs on the whole graph as filtered unless its sentence
  names a scope ("in this", "among these", a set by name). The scope is always a tile, and an
  unstated scope is always in the Check list ("on all 16 families (default; you have 6 selected)").

### Filling slots from the graph

When a slot is open, the objects that can fill it glow in the graph (only nodes that carry a value
for the slot's attribute, only edges of a type the slot allows), and the slot tile carries the same
glow. On a ray device the pointer reads "Fills: from" over a glowing object; on Vision Pro, which
has no pointer before a pinch, the label appears while the pinch is held, and sliding off cancels.

- A node fills a node slot: "from", "to", "on", "compare with", "around".
- A node fills a number slot with its own value of the slot's attribute. The tile shows the rounded
  value and stores the exact one: "at least 0.071 (Tornabuoni; exact 0.0706) -- pinch again to
  clear".
- Two nodes pinched in a row fill "from" and then "to".
- An edge fills an edge-type slot with its type ("through: shared device").
- A sweep fills a set slot.

A pinch that fills a slot does not also enter the tray, so reading or filling never pushes out a
chip the person is using.

### The rail

- **One page per object.** A new tile goes to the page of the object it acts on. A run's page holds
  its knob and the style layers and filter steps made from it; tiles about the view or the
  selection (the readout, Find, a hops stepper, a layout's spacing) go to the Explore page. After
  the basic journey there are two pages: Explore and PageRank. A repeated request replaces its own
  tile; a page that outgrows four tiles grows a second column outward, away from the graph.
- **Set handles and Look handles.** Each handle is printed with its kind. A **Set** handle changes
  a step: a filter's threshold, a knob that re-runs, a palette. Dragging shows the value and its
  count on the handle ("at least 0.069 (Ridolfi): keeps 6"); releasing starts a 1-second ring, and
  the change commits when the ring closes, as its own named undo step. Re-grabbing during the ring
  continues the same drag; a quick pinch on the ring commits at once; dragging back past the start
  cancels. A **Look** handle only changes what is drawn: a time window scrubbed to look back, a
  hops stepper tried for size. The tile then shows both values when they differ ("viewing: Sep 3 to
  Oct 2 -- analysis: Sep 10 to Oct 9") with a Snap back key, and only a Go on the tile moves the
  analysis value. Every later Go names the window and filters it runs within.
- **What a re-run moves.** A style layer or filter step made from a run is bound either to
  "PageRank, latest" (it follows new runs of the same algorithm; the default) or to "PageRank, run
  1" (pinned), shown on its stack chip and switched with one pinch there. A knob release previews
  the downstream change on its handle before committing ("run 2; 2 layers repaint"). When a filter's
  membership would change, the release waits for Go. A re-run uses the scope its original run
  recorded, never the filtered view the run itself produced. A re-run that moves bound layers
  records two steps, the run and then the repaint, so Undo takes back the repaint first and keeps
  the run.
- A quick pinch on a handle opens a keypad for an exact value; a held pinch (150 ms) grabs it. A
  tremor setting doubles the detents from 1.5 cm to 3 cm and makes every release a preview that
  needs a Go.

### Words: how a request is understood

1. **The eight local phrases** -- do it, go, cancel, stop, undo, redo, pin that, no this -- plus
   the spoken tag words, are recognized on the headset by a small keyword recognizer in the page
   (or matched on the transcript when the browser's recognizer owns the microphone). They work
   with no key on every headset that grants the microphone.
2. **The local compiler** runs next, on the headset. Its target is graphty-element's own session
   commands. Its grammar is generated from the command descriptors: each command is a verb phrase
   plus typed slots, and each slot type has one small parser (number, comparison, attribute name,
   the data's names and ids, chip words and numbers, tags, "or" inside one slot's list of values,
   time phrases from a fixed list such as "last N days"). Each command also carries a few example
   phrasings ("who matters most", "married into", "on their own", "groups", "tied to", "follow the
   money"), kept in the mock's own copy of the descriptors. The compiler's claim is measured against
   a fixed set of sentences: every sentence in sections 4 and 5, plus about 100 collected on the 2D
   command palette.
3. **Partial compiles keep what they placed.** When a clause cannot be placed, the sentence keeps
   every tile it could fill and shows one empty glowing tile for the rest: "not placed: 'opened
   within three days of each other'". Its picker offers the nearest commands or constraints the
   headset knows, each with its count, and -- only if the assistant setting allows -- "Ask the
   model for this clause". Only that clause is sent, never the whole request.
4. **The model** gets a request, or one unplaced clause, only when the local compiler could not
   produce a complete command and the assistant setting allows it. It returns a command from
   graphty's closed list, filled from the request's own words, always with the alternatives shown
   under the tiles it chose. Formulas and paraphrases outside the example phrasings are its main
   work.
5. **What can never be invented.** Numbers come from your words, from the option's default (shown
   gray), from a short list of idioms (shown amber: "neighbors" = 1 hop, "on their own" = 0 ties,
   "top" with no number = 10), from a pointed node's value, or from a counted outcome you picked.
   Names and ids come from your words or a chip. Free text -- note, label, find text, every name
   and title -- is always a span of your words copied by the page and marked "your words". A name
   that exactly matches an existing set, view or filter is a reference to it, not new text.
6. A request neither can compile comes back as "Not available here" with the nearest commands as
   tiles. With no key, a clause that needed the model reads "Needs a model key (add one on the 2D
   page)" beside the nearest local tiles, never a dead end.

### What leaves the headset

Each project has one assistant setting, shown as a label at the bar's left end and on the Project
tile: **Off** (no words leave, no compiler), **On headset** (the default for a new project; nothing
leaves), **Data withheld** (the default once keys exist) or **Full**. In Data withheld, before
anything goes to the model, the outgoing text is shown in row 3 as a Sends line, and it goes on a
pinch of Send:

> Sends: "average their normalized ranks" -- with the attribute names degree, betweenness,
> closeness, eigenvector and the slot list of Computed attribute. Withheld: nothing in this request.

Ids, node names, set, view and project names, free text and category values are replaced by typed
placeholders; numbers in the request's own words and the data's attribute and edge-type names go
in clear, because the model needs them. The rules behind the setting, the keys and the speech
services are in the appendix.

### Requests that span several commands: the plan belt

"Color and size by PageRank" or "find groups and color by them" compiles to a short plan: one card
per command in the sentence line, moving toward Go in order. A card that needs an earlier card's
result says "previews after card 1"; the belt stops at Go again once card 1 has run and the next
card can be previewed. A card whose preview changes nothing shows a red "changes 0" and blocks Go
until it is changed or pulled. While a card runs, Stop replaces Go; stopping pauses the belt and
keeps the cards that have not run.

### Autonomy

- **Preview (the default).** View-only requests apply once the sentence has shown for half a
  second; Back takes them back. Everything that changes the project waits for Go (or, for a
  selection change from a verb tile, for the release of a press that showed its count).
- **Act (opt-in, for this session only; designed, not built in the mock).** Commits after the
  sentence shows, with an undo toast. Act still stops at Go for anything that removes, hides,
  filters, merges, overwrites or replaces data; any run over 5 seconds; any amber number or counted
  outcome; any text slot; and any target reached through another object.

### What may be stubbed, and what the mock leaves out

The person's interaction is whole everywhere; these engines may be faked:

- **Counts before commit.** The Go gate's counts need graphty-element's count-before-commit, which
  the shared element work adds from the existing cost estimate. Until it lands, the mock computes
  counts for its own datasets in a worker.
- **Time and pattern matches** for the fraud sample are precomputed; the time tile, the chart and
  the pattern editor's tiles are real interactions over stubbed data.
- **The pairing relay**: a WebSocket relay on the dev machine.
- **Not stubbed:** the local compiler, the keyword recognizer, and a real language model behind
  Data withheld and Full, because how often the tiles come back wrong is a thing this mock exists
  to measure.

Designed here but left out of the mock's build, to fit a small team in about six weeks: recipes,
evidence references and the case report, Record determination, the History reader, Act mode,
plans of more than two cards, and pairing beyond lending the laptop keyboard. W06 is built through
its step 6.

Datasets: Florentine families (16 families, 20 marriages), Les Miserables (77 characters, 254
co-appearances), and the 2,000-account fraud sample shared with the other mocks, with alert
ACC-48213 and known fraudster ACC-10077.

### The text and file service (shared with every mock)

- **Headset alone is the default and the counted condition.** The in-scene keyboard for every text
  field. Opening and saving use graphty's own storage on the headset, listed inside the scene as an
  Open list on the Project tile; the Go gate says so ("goes to: graphty on this headset"). A file
  from elsewhere enters through graphty's 2D page before Enter VR, or through pairing. A picture or
  export is written to graphty's storage and offered as a download on the 2D page after leaving VR,
  or sent to the laptop when paired. Whether a download can start from inside the session is a
  check on each headset, not a promise.
- **Pairing is optional and measured separately.** A one-time six-digit code shown on the laptop's
  graphty page and typed in the headset links the two pages. Then a laptop folder the person
  granted is listed in the scene, "open what I sent from the laptop" and "send this to the laptop"
  are commands, and the laptop keyboard can be lent to the sentence line or any text tile. A lent
  keyboard also carries the gates (section 3), so a person typing on it needs no controller to
  confirm. Writes carry the version they were based on and never overwrite newer laptop work
  without asking.

### Devices and inputs

| Device                                  | Pointing                                                                                                                                                                                                                                                                                              | Requests                                                                                                                                                                                                                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meta Quest 3 / 3S, hands                | The system hand ray as the browser gives it, with a snap cone and a "which one?" list in dense spots. A pinch whose hand travels more than about 2 cm turns the graph; a shorter one is a pinch. Flat-hand sweep                                                                                      | Typed on the in-scene keyboard by fingertip (Quest Browser has no speech recognition); the keyboard is docked by default. Voice with the person's speech service key. The eight local phrases and tag words work with no key               | No haptics                                                                                                                                                                                                                                                                                                                                                                                        |
| Meta Quest 3 / 3S, controllers          | Trigger = pinch                                                                                                                                                                                                                                                                                       | As hands, keyboard typed by ray                                                                                                                                                                                                            | Grip on empty space plus the thumbstick turns and scales the graph. Off controller: lower face button (X) tap = Talk; upper (Y) = Type. Dominant upper face button held 300 ms = Undo. One-controller setting: A tap = Talk, B tap = Type, B held 300 ms = Undo. On a grabbed handle, the thumbstick steps a detent with a pulse; with the ray on the reader and no grip, it moves the row cursor |
| Samsung Galaxy XR, hands or controllers | As Quest                                                                                                                                                                                                                                                                                              | Chrome's speech recognition if it runs inside the immersive session (a week-one check), counted as a speech service; typed otherwise                                                                                                       | Same mapping as Quest                                                                                                                                                                                                                                                                                                                                                                             |
| Apple Vision Pro                        | Look and pinch (Safari's transient pointer) is the only pick; there is no pointer before a pinch, so every hover cue (the "Fills:" label, row lighting, the chip a word will take) shows while the pinch is held and commits on release. Hand joints are not requested, so the sweep is the Brush key | Talk, Type and Tags are on the bar. Voice if the microphone keeps delivering audio in an immersive session (a week-one check), through Safari's recognizer, which is counted as a speech service; typed on the in-scene keyboard otherwise | No haptics. A pinch-drag on empty space turns the graph; a two-hand pinch-drag scales it, and a corner handle on the volume scales it with one hand                                                                                                                                                                                                                                               |

The keyword window and the order of tags use the head's forward direction, which every headset
reports, never eye gaze, which none gives a web page.

---

## 3. The control vocabulary

Every input has one meaning everywhere. Pinch means a hand pinch, a controller trigger, or Vision
Pro's look and pinch. The shared activation rule holds for every key and tile: pressing shows the
effect with a count, releasing commits, sliding off before release cancels, and lost tracking
cancels.

| Input                                                                                                                                                         | Its one meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pinch an object (node, edge, row, histogram bar, legend entry, stack chip, run title, note marker, view tile, the Project tile, or empty space for the graph) | Make it a target: it enters the tray as the newest chip, its badge appears in the graph, its key facts show above the tray ("Medici -- 6 marriages"), and its verbs fill an empty sentence line. Never changes the selection. Two exceptions, both shown by a glow before the pinch: while a slot is open, a glowing object fills that slot instead (a node fills a node slot, or a number slot with its own value; an edge fills an edge-type slot) and does not enter the tray; while Collect is on, it toggles the object's membership in the selection |
| Hold a pinch still on an object for 400 ms (where voice is set up)                                                                                            | Ask about it: it becomes "this", locked, and listening runs until release. With no voice, a held pinch is a pinch                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| A pinch that travels more than about 2 cm in the volume                                                                                                       | Turn the graph. A two-hand pinch-drag scales it; the volume's corner handle scales it with one hand. View only, never an undo step                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Flat hand held in the volume 300 ms (hands); or a pinch-drag with Brush on                                                                                    | Sweep: a brush sphere; a pinch commits the swept nodes (fill a set slot, add during Collect, or a "Swept" set chip); withdrawing cancels                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Pinch a control (a verb tile, slot tile, outcome, key, picker row, Go)                                                                                        | Press it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Pinch a tray chip; long press a tray chip                                                                                                                     | Make it "this" and show its verbs; pin or unpin it. Not a step                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Drag a tray chip off the tray; the tray's Clear; a chip in the recent fold                                                                                    | Remove that chip; empty the tray; restore that chip with its old number. Not a step                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Pinch a slot tile                                                                                                                                             | Open that slot: its alternatives, its own control (keypad and slider over a histogram, a list, a palette strip, an attribute list, a node slot, or the keyboard with a caret for a text slot), and the glow in the graph                                                                                                                                                                                                                                                                                                                                   |
| Pinch-grab a rail handle (held 150 ms) and drag                                                                                                               | Move the control, one detent per 1.5 cm (3 cm with the tremor setting), value and count on the handle. A Set handle commits when the 1-second ring after release closes; a Look handle changes only the view                                                                                                                                                                                                                                                                                                                                               |
| Quick pinch on a rail handle                                                                                                                                  | Open a keypad for an exact value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Pinch a rail tile's header; drag it                                                                                                                           | Open the tile's menu (its object's verbs, Open in the reader, Unpin, Duplicate, Bind to another run); move the tile or drop it on a page tab. Not a step                                                                                                                                                                                                                                                                                                                                                                                                   |
| Talk key (controllers: X tap, or A in the one-controller setting)                                                                                             | Start listening; listening ends after the pause you set (1 to 3 s, 1.5 by default) or a second tap. A mic dot on the pointer and the key, and a start tone                                                                                                                                                                                                                                                                                                                                                                                                 |
| The eight local phrases while a sentence is open; tag words while tags are shown                                                                              | Their names. Heard on the headset only, only as a whole utterance, and only while the head points within 25 degrees of the bar or the graph; the mic dot is hollow while this window is open. No Talk tap needed                                                                                                                                                                                                                                                                                                                                           |
| Type key (controllers: Y, or B tap)                                                                                                                           | Show or hide the keyboard                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Typing in the sentence line                                                                                                                                   | Search everything, with whole-command completions; Enter compiles the words; Enter on a typed id that matches exactly one object binds it without a completion pick                                                                                                                                                                                                                                                                                                                                                                                        |
| Tags key, or the word "tags"; More tags                                                                                                                       | Show tags (two letters, with the spoken word printed under them: "KF / kilo foxtrot"), placed with leader lines outside dense knots, nearest the head's direction first; the next batch                                                                                                                                                                                                                                                                                                                                                                    |
| Two tag letters, typed or said                                                                                                                                | Exactly what a pinch on that object would do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Go gate, or "do it" / "go"                                                                                                                                    | Commit what the preview line shows. Go names its verb. For a warning verb, Go is in the warning color and needs a 400 ms hold with a fill ring, and voice must name the verb ("hide it")                                                                                                                                                                                                                                                                                                                                                                   |
| Stop (replaces Go while a job runs), or "stop"                                                                                                                | Stop the running job; on a belt, also pause the belt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| The line's X, or "cancel"                                                                                                                                     | Drop the open request; nothing changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| "No, this"; or the "Use N instead?" offer; or pinch a target tile, then an object                                                                             | Rebind one target                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Back key, on the Overview miniature's corner                                                                                                                  | Step the view back (camera, framing, focus). Never undoes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Undo, Redo keys ("Undo: Note on Medici"); "undo", "redo"; controllers: held 300 ms                                                                            | Undo or redo the last project step, named on the toast at the pointer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Again key                                                                                                                                                     | Put the last committed sentence -- or, just after an Undo, the undone one -- back in the line with the newest chip as its target, as a fresh request at Go                                                                                                                                                                                                                                                                                                                                                                                                 |
| Pin key on a reader, or "pin that"                                                                                                                            | Put the reader's live control on its object's rail page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Send (on the Sends line)                                                                                                                                      | Let this request go to the model as shown                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Review set at the reader's foot: Yes, No, Skip                                                                                                                | Record the person's judgment on the cursor row as a review step and move to the next row; rows not reached stay "not reviewed". Each answer is named in the undo toast                                                                                                                                                                                                                                                                                                                                                                                     |
| A lent laptop keyboard                                                                                                                                        | Enter compiles, and on a lit Go commits it (a second Enter for a warning verb); Ctrl+Enter = Send; Tab and Shift+Tab walk the slot tiles and pickers; arrows move pickers and reader rows; Y, N, S answer review rows; Ctrl+Z and Ctrl+Shift+Z undo and redo; Esc cancels. Hand pinches are ignored for 500 ms after a keystroke                                                                                                                                                                                                                           |

---

## 4. The basic journey

### How acts are counted

- **Acts**: pinches, presses, grabs, completion picks, Talk taps, and spoken commits ("do it",
  "go"). A spoken request is counted as a sentence, like typed keys, not as an act.
- **Keys**: every typed character, Enter included. The keyboard is docked from the start on Quest,
  which has no speech recognizer, so no Type press is needed; it never hides on Go.
- **Acts on the graph**: a pinch, hold or sweep on a node, edge or swept region that does work the
  walk needs, including a slot filled from the graph. Not counted: turns and scales, and a pinch
  that only makes an existing chip "this" again.
- The mistake in step 10 is counted, because it happens.

### The counted walk: Quest 3, hands, typed, headset alone

Seated, unpaired, assistant setting On headset: every request compiles on the headset with no
network.

**1. Enter.**

- **What you do:** On graphty's 2D page in the headset's browser, press Enter VR. In VR, pinch the
  Florentine families tile on the rail's Explore page.
- **What you see:** The first time, the 2D page explains the assistant setting (On headset is
  chosen) and asks for the microphone "so undo, do it and cancel work by voice even without a key".
  In VR the empty volume reads "Pick a sample on the left". Pressing the tile shows "16 families,
  20 marriages"; releasing opens it. The Explore page holds a hint ("Pinch something, then type or
  say what you want"), the readout and a Find field; the Project tile and the Overview miniature sit
  above it. The Talk key reads "Voice: set up on the 2D page".
- **Controls:** 2 acts.

**2. Get oriented.**

- **What you do:** Read the readout. Pinch-drag empty space to turn the graph.
- **What you see:** "16 families, 20 marriages, 2 pieces; 1 family has no marriages". The graph
  turns under the hand.
- **Controls:** 1 act (a turn, not counted on the graph).

**3. Find the Medici.**

- **What you do:** Pinch Medici's node.
- **What you see:** Medici enters the tray as chip 1 with a badge "1". Above the tray, "Medici -- 6
  marriages". Its verbs fill the line: [Inspect] [Select] [Neighbors] [Route from] [Compare with]
  [Note] [More] then, after a gap, [Hide]. Where Medici is not in view, typing "med" and Enter, or
  Tags and two letters, does the same.
- **Controls:** 1 act, on the graph.

**4. Who they married into, and how the two biggest families are tied.**

- **What you do:** Pinch [Neighbors]. Then pinch Strozzi's node, and pinch the first tile on its
  strip, [Route 1 to 2]. Then pinch Ridolfi, the family in the middle of the route.
- **What you see:** Pressing [Neighbors] shows "Selection: 6 families (was none)" and the six
  in-laws at full strength while the rest go faint: Acciaiuoli, Albizzi, Barbadori, Ridolfi,
  Salviati, Tornabuoni. Releasing commits the selection as one undo step. A Hops tile lands on the
  Explore page. Strozzi enters as chip 2; because the two newest chips are both nodes, its strip
  leads with the two-target verbs [Route 1 to 2] [Compare 1 with 2]. The route is a view: [Route]
  [from 1 Medici] [to 2 Strozzi] [shortest] applies after half a second and lights Medici -- Ridolfi
  -- Strozzi, "2 marriages". Ridolfi enters as chip 3: "Ridolfi -- 3 marriages: Medici, Strozzi,
  Tornabuoni", the one family married to both.
- **Controls:** 4 acts, 2 on the graph.

**5. Who matters most (PageRank).**

- **What you do:** Type "who m", pinch the completion "who matters most -- influence (PageRank)",
  read the Check list, pinch Go.
- **What you see:** [Run] [influence (PageRank)] [on all 16 families], with [connections (degree)]
  and [bridges (betweenness)] under the verb tile. The Check list: "damping 0.85 (default) --
  tolerance 1e-6 (default) -- on all 16 families (default; you have 6 selected)". Go reads "Run
  PageRank on 16 families -- under 1 s". After Go the reader opens the ranking with its histogram;
  the chip "PageRank, run 1" enters the tray as chip 4, marked new; a PageRank page opens on the
  rail with the damping knob.
- **Controls:** 2 acts, 5 keys. Hand path: pinch empty space (the graph), [Run], pick PageRank from
  the scoped catalog, Go.

**6. Read the result, and compare.**

- **What you do:** Read the ranking. Pinch Guadagni's node, then [Compare with], then Medici's
  node, which glows as a fill.
- **What you see:** Medici 0.144, Guadagni 0.098, Strozzi 0.087, Albizzi 0.079, Tornabuoni 0.071,
  Ridolfi 0.069, Castellani 0.069, Bischeri 0.068, Peruzzi 0.067 ... Pucci 0.010. Guadagni enters
  as chip 5; the tray was full, so the least recently used chip, Medici, slides into the recent
  fold. [Compare with] opens a node slot that glows on every node; pinching Medici fills it
  without entering the tray. [Compare] [5 Guadagni] [with Medici] [on: PageRank, marriages,
  in-laws] applies as a view: the reader shows both profile cards side by side, and the graph
  lights their shared in-laws, Albizzi and Tornabuoni.
- **Controls:** 3 acts, 2 on the graph.

**7. Color and size by PageRank.**

- **What you do:** Type "paint it" and Enter. Pinch Go.
- **What you see:** "It" would be Guadagni, which cannot be painted, so it skips to the run: "it =
  PageRank, run 1; skipped Guadagni". A two-card plan: [Color by] [PageRank, latest (run 1)]
  [sequential blue] and [Size by] [PageRank, latest] [1x to 3x]. The graph previews faintly. Go
  reads "Add 2 style layers -- 16 families". After Go, two layer chips on the stack row, each
  reading "PageRank, latest", and a style tile (palette strip and size range) on the PageRank page.
- **Controls:** 1 act, 9 keys. Hand path: pinch chip 4, [Paint], Go.

**8. Keep only the strong families, then move the cut by hand.**

- **What you do:** Type "keep only str", pinch the completion. Pinch Tornabuoni's node. Pinch Go.
  Then grab the threshold handle on the PageRank page and drag it down one detent.
- **What you see:** [Filter step] [PageRank, run 1] [at least] [ ? ]: "strong" is vague, so the
  value tile glows, the families glow in the graph, and the picker offers "As is -- top 3 (at least
  0.087): keeps 3 -- top 5 (at least 0.0706): keeps 5 -- above the mean (at least 0.0625): keeps 9
  -- Exact". Pinching Tornabuoni fills "at least 0.071 (Tornabuoni; exact 0.0706)". The preview:
  "keeps 5 of 16 families, 4 marriages -- later runs see only these 5". After Go: Medici, Guadagni,
  Strozzi, Albizzi and Tornabuoni remain, with Strozzi now cut off; a filter chip on the stack row;
  a threshold tile on the PageRank page. The threshold handle's detents sit at each family's value
  and name who is just outside. One detent down it reads "at least 0.069 (Ridolfi): keeps 6, 7
  marriages -- adds Ridolfi; Castellani just outside". Ridolfi was the tie found in step 4; with it
  back, Strozzi is joined again. Releasing starts the ring; the change commits when it closes, and
  Undo would read "Undo: Filter at least 0.069".
- **Controls:** 4 acts (one on the graph, one on the rail), 13 keys.

**9. Write a note.**

- **What you do:** Pinch Albizzi's node, then [Note]. Type "married into both Medici and
  Guadagni". Read the tile; pinch Go.
- **What you see:** Albizzi enters as chip 6 (Strozzi slides into the fold). [Note] [on 6 Albizzi]
  [married into both Medici and Guadagni], the text tile marked "your words", with the caret in it.
  After Go, the note closes to a marker on Albizzi.
- **Controls:** 3 acts, 1 on the graph; 37 keys.

**10. Undo a mistake.**

- **What you do:** You want a second note, on Tornabuoni, which sits beside Medici. The pinch lands
  on Medici. You pinch [Note], type "three in-laws in the top six" and pinch Go without reading the
  tile. The marker appears on Medici. Pinch Undo. Pinch Tornabuoni's node, pinch Again, pinch Go.
- **What you see:** The tile read [Note] [on 1 Medici] and Go read "Add note to Medici"; the Undo
  key read "Undo: Note on Medici" before you pressed it. The toast at the pointer: "Undid: Note on
  Medici". Again puts the undone sentence back with Tornabuoni, the newest chip, as its target:
  [Note] [on 7 Tornabuoni] [three in-laws in the top six]. Go.
- **Controls:** 7 acts, 2 on the graph (the mis-aimed pinch and Tornabuoni); 28 keys. Had the
  mistake been a warning verb, its Go would have needed a held press in the warning color.

**11. Save.**

- **What you do:** Type "sav", pinch the completion "Save as...", type "Florentine PageRank",
  pinch Go.
- **What you see:** [Save project as] [Florentine PageRank], the name marked "your words". Go reads
  "Save -- goes to: graphty on this headset". The Project tile reads "Florentine PageRank -- saved".
  The rail's two pages are saved with the project.
- **Controls:** 2 acts, 22 keys. Paired: Go reads "goes to: laptop, graphty-projects".

**Totals for the counted walk:** 30 acts, 9 of them on the graph (30 percent, over the shared
one-in-four line), and 114 keys (65 of them the two notes). Three sentences bind two or more
pointed targets (steps 4, 6 and 8), step 7 is a plan, step 8 makes a change on the rail, and no
request needs the model.

### The spoken walk: Galaxy XR, hands, voice and model on

The same journey, of equal standing, on Samsung Galaxy XR with hands. Chrome's recognizer is the
speech service (named as such on the 2D page), the sample is public, so the setting is Full, and a
model key is set. One wrong tile is seeded in step 8, as check 2 does for every model request it
seeds. Holding a pinch on a node asks about it.

| Step | What the person does                                                                                                                                                   | What comes back                                                                                                                                                                                                                 | Acts (on the graph) |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Enter VR; pinch the Florentine tile                                                                                                                                    | As above                                                                                                                                                                                                                        | 2 (0)               |
| 2    | Turn the graph                                                                                                                                                         |                                                                                                                                                                                                                                 | 1 (0)               |
| 3    | Pinch Medici                                                                                                                                                           | Chip 1                                                                                                                                                                                                                          | 1 (1)               |
| 4    | Pinch [Neighbors]. Hold Strozzi: "how is this tied to the Medici?" Pinch Ridolfi                                                                                       | Selection: 6. Local ("tied to" is an example phrasing): [Route] [from 2 Strozzi] [to Medici], lit after half a second. Ridolfi's facts                                                                                          | 3 (2)               |
| 5    | Talk: "which families carry the most weight?"; "do it"                                                                                                                 | Not an example phrasing, so it goes to the model (request 1): [Run] [influence (PageRank)] [on all 16], with [connections] and [bridges] under the tile                                                                         | 2 (0)               |
| 6    | Hold Guadagni: "compare this with the Medici"                                                                                                                          | Local: [Compare] [Guadagni] [with Medici]; the two cards                                                                                                                                                                        | 1 (1)               |
| 7    | Talk: "color and size by it"; "go"                                                                                                                                     | Local; "it" skips Guadagni to the run; the two-card plan                                                                                                                                                                        | 2 (0)               |
| 8    | Hold Tornabuoni: "keep this one and everything stronger". Read the preview; pinch the [at most] tile, pick [at least]; "go". Drag the threshold handle down one detent | Model (request 2), seeded wrong: [Filter step] [PageRank, run 1] [at most] [0.071 (Tornabuoni)], preview "keeps 12 of 16 -- Tornabuoni and every family below it". Corrected: "keeps 5 of 16, 4 marriages". The drag: "keeps 6" | 5 (1)               |
| 9    | Hold Albizzi: "note: married into both Medici and Guadagni"; "do it"                                                                                                   | Local: [Note] [on Albizzi] [your words]                                                                                                                                                                                         | 2 (1)               |
| 10   | Hold, meaning Tornabuoni, lands on Medici: "note: three in-laws in the top six"; "do it". Undo key. Pinch Tornabuoni; Again; "do it"                                   | The note on Medici; "Undid: Note on Medici"; the note on Tornabuoni                                                                                                                                                             | 6 (2)               |
| 11   | Talk: "save as Florentine PageRank"; "do it"                                                                                                                           | Local                                                                                                                                                                                                                           | 2 (0)               |

**Totals for the spoken walk:** 27 acts, 8 of them on the graph (30 percent), 9 spoken sentences, no
keys, and 2 model requests, one of them seeded wrong and caught before Go. Typing gave way to
holding the object while speaking, which is where the graph share comes from: every request about
a family starts on that family.

---

## 5. The proof journey, and a harder one

[the mock recommendation](../xr-prototype-mocks.md) gives this mock "First session ever, then a composite score from journey 4": a
person who has never used graphty walks journey 1 unaided, and the same person then builds a hub
score from four centralities, the long authoring step where the other designs spend 11 to 17 acts.

The person is Analyst Alex (`design/designloom/personas/analyst-alex.yaml`): three years of graph
work in Gephi and NetworkX, never graphty; he wants to answer a question with an established
algorithm and compare results to trust them. Setting: Meta Quest 3, hands, seated, headset alone,
typed. A model key was entered on the 2D page before the session, so new projects offer Data
withheld; nothing in journey 1 needs it.

### Journey 1: First session ever

**1. First look.**

- **What you do:** Press Enter VR on graphty's 2D page.
- **What you see:** An empty volume reading "Pick a sample on the left, or type what you want". The
  sentence line, empty with no target, shows its suggestions: [Open a sample] [Open a file] [Show me
  around]. The Explore page holds the sample tiles.
- **Controls:** 1 act.

**2. Open Les Miserables.**

- **What you do:** Pinch its tile.
- **What you see:** Pressing shows "77 characters, 254 co-appearances"; releasing opens it.
- **Controls:** 1 act.

**3. Read the statistics.**

- **What you do:** Read the readout.
- **What you see:** "77 characters, 254 co-appearances, density 0.087, 1 piece; connections per
  character: 1 to 36". The Overview miniature shows the whole graph with a frame around the view.
- **Controls:** none.

**4. The degree histogram, log-log, and its highest band.**

- **What you do:** Pinch the readout's "connections per character" row. In the reader, pinch the
  axis tile to [log-log]. Brush the top two bars.
- **What you see:** The histogram of connections opens in the reader (a reading of the graph, not a
  run). On log-log the long tail is plain. Pressing on the bars shows "Selection: 5 characters (was
  none) -- connections 16 to 36"; releasing commits it. Valjean, Gavroche, Marius, Javert and
  Thenardier light in the graph.
- **Controls:** 3 acts.

**5. Inspect the top character.**

- **What you do:** Pinch Valjean, the largest of the five, then [Inspect].
- **What you see:** Valjean enters the tray as chip 1: "Valjean -- 36 co-appearances". The profile
  card opens in the reader with every attribute and his connections listed by strength.
- **Controls:** 2 acts, 1 on the graph.

**6. Find groups, as suggested.**

- **What you do:** Type "groups", pinch the first completion, read the Check list, pinch Go, then
  Go again for the color card.
- **What you see:** The completion is marked suggested for this graph: "Find groups -- communities
  (Louvain)". A two-card plan: [Find communities (Louvain)] [on all 77] and [Color by] [community,
  latest] ("previews after card 1"). The Check list: "resolution 1.0 (default) -- seed: drawn for
  this run and recorded (default; another run can give other groups)". After the first Go the group
  table shows about six groups and their sizes (the mock shows its real run); the color card
  previews; the second Go paints them. A Louvain page opens on the rail with a resolution knob; the
  run's chip enters the tray as chip 2.
- **Controls:** 3 acts, 6 keys.

**7. Resolution 1.5, keeping both runs, and comparing them.**

- **What you do:** Grab the resolution knob on the Louvain page and drag it five detents up. Let go.
  Pinch the next tile [Compare 2 with 3].
- **What you see:** While dragging, the handle reads "1.5 -- about 8 groups; the community color
  follows latest: 77 repaint". Releasing starts the ring; when it closes, run 2 is kept beside run
  1, the colors follow it, and its chip enters the tray as chip 3. The line's next tiles offer
  [Compare 2 with 3]. The comparison opens in the reader: groups per run, and a matched table of
  which characters changed group.
- **Controls:** 2 acts, both on panels.

**8. Undo the color change the second run applied.**

- **What you do:** Pinch Undo.
- **What you see:** The key read "Undo: Color by community, now run 2". The colors go back to run
  1; run 2 stays, with its chip and its comparison. The layer's stack chip now reads "Louvain, run
  1".
- **Controls:** 1 act.

**9. Save.**

- **What you do:** Type "sav", pinch "Save as...", type "Les Mis first look", pinch Go.
- **What you see:** Go reads "Save -- goes to: graphty on this headset".
- **Controls:** 2 acts, 21 keys.

**Journey 1 totals:** 15 acts and 27 keys, unaided. Only 1 act lands on the graph: journey 1 is
mostly reading statistics and results, and the shared exit line is measured on the basic journey.
Check 10 records the time to the first committed change and whether Alex finds Tags, the hand path
and Undo without being told.

**Two steps for coverage (not counted in journey 1).** Layouts and layer editing are walked here:

- _Lay out the five._ Type "lay out these radial around 1", Enter, Go. [Lay out] [radial] [only:
  Selection, 5 characters] [around: 1 Valjean] [the rest keep their positions]; Go reads "Move 5
  characters". A ring-spacing handle lands on the Explore page; its release is a new layout step
  that Undo takes back, not a kept run. 1 act, 30 keys.
- _Gold, then under the groups._ Type "color these gold", Enter, Go: a gold layer on the five, on
  top of the community color. To see which groups the five belong to without losing the gold,
  pinch the gold layer's chip on the stack row, type "put this under the community color", Enter.
  [Move layer] [gold on 5 characters] [below: Color by community]; the preview reads "5 characters
  change: gold hidden by community colors". Go. 3 acts, 52 keys. Dragging the chip along the stack
  row does the same in one act.

### The composite score (journey 4, steps 1 to 4), through the model

Alex continues on Les Miserables. He switches the project to Data withheld on the Project tile, so
the Sends line shows what would leave.

**1. Run four centralities in one batch.**

- **What you do:** Type "run degree, betweenness, closeness and eigenvector", Enter. Pinch Go.
- **What you see:** Local: [Run] [connections (degree), bridges (betweenness), closeness,
  eigenvector] [on all 77]. The Check list names each algorithm's defaults. Go reads "Run 4
  analyses on 77 characters -- under 1 s". One chip enters the tray: "Centralities: 4 runs".
- **Controls:** 1 act, 51 keys.

**2. Read the four histograms.**

- **What you do:** Read the reader's "4 runs" tab, four histograms in a two-by-two grid, each with
  its top five named.
- **What you see:** Which measures are flat and which have a few standouts, decided by Alex.
- **Controls:** none.

**3. Build hub_score.**

- **What you do:** Type "average their normalized ranks as hub_score", Enter. Read the Sends line;
  pinch Send. Read the tiles and the preview; pinch Go.
- **What you see:** The local compiler places [Computed attribute] [named: hub_score (your words)]
  [from: Centralities, 4 runs] ("their" is the batch chip) and leaves one glowing tile: "not placed:
  'average their normalized ranks'", with local choices [sum] [mean] [weighted mean] [min] [max]
  [formula] and [Ask the model for this clause]. Because the key is set, the Sends line already
  shows: "Sends: 'average their normalized ranks' -- with the attribute names degree, betweenness,
  closeness, eigenvector and the slot list of Computed attribute. Withheld: nothing in this request."
  After Send (1.5 to 4 s) the model's tiles: [= mean of] [rank, normalized 0 to 1, highest value =
  1] [of each input], with [mean of raw values] and [rank, lowest = 1] under them. The preview: the
  reader's table of the top 10 by hub_score with the four metrics as columns, and the top 10 lit in
  the graph. The Check list: "ties: average rank (default)". Go reads "Add hub_score to 77
  characters".
- **Controls:** 2 acts, 44 keys; 1 model request.

**4. Select the top 10.**

- **What you do:** Type "select top 10 by this", Enter, pinch Go.
- **What you see:** [Select] [top 10] [by hub_score] ("this" is the hub_score chip, newest). "Selection:
  10 characters (was 5)". The reader keeps the ranked table with hub_score and the four metrics as
  columns, Valjean first.
- **Controls:** 1 act, 22 keys.

**Composite totals.**

| Path                                                                                                                                                                                                                                                                | Acts                             | Keys or sentences | Model requests |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------- | -------------- |
| Typed on Quest, model on (above)                                                                                                                                                                                                                                    | 4                                | 117 keys          | 1              |
| Spoken on Galaxy XR or Vision Pro, model on                                                                                                                                                                                                                         | 7 (3 Talk taps, Send, 3 "do it") | 3 sentences       | 1              |
| By hand, no model: pinch empty space, [Run], tick four in the scoped catalog, Go; pinch the batch chip, [Computed attribute], the formula tile, [mean], the transform tile, [normalized rank], type the name, Go; pinch the hub_score chip, [Select from], [top 10] | 17                               | 9 keys            | 0              |

The other designs need 11 to 17 acts for the same steps. Spoken, this design needs 7, which is the
studio's claim for language walked. Typed on Quest it needs only 4 acts, but 117 keys, which at
in-headset typing speeds is likely slower than the 17-act hand path; check 4 measures the time.
Language pays in a headset when it is spoken, or when the typed request is short against a long
hand build.

### W06 Fraud Ring Investigation, steps 0 to 6 -- the Fraud Detection Analyst

Kept because it is the only walk with confidential data, a bank that allows no outside model, and a
lent laptop keyboard, and because Findings Inbox walks the same journey as its proof, so two ideas
meet on one journey. Workflow: `design/designloom/workflows/W06.yaml`. Persona: the Fraud Detection
Analyst (`design/designloom/personas/fraud-analyst.yaml`), 50 or more alerts a day, documenting
evidence for prosecution; target under 30 minutes per alert.

Setting: Meta Quest 3, hands, seated at her desk, paired with her laptop, whose keyboard is lent to
the sentence line with the gate keys (section 3). Her bank allows no outside model, so case projects
are On headset. Requests are typed by touch on the laptop keyboard; the hands are for pointing.

**0. Before the shift.** _(Leaves the headset.)_ In the bank's case system she exports the morning's
alerts in one go into the laptop folder she marked "case files" in graphty. Determinations go back
in one batch after the session, so the headset comes off twice a shift, not twice an alert.

**1. Open the next alert.**

- **What you do:** Pinch the Project tile's Open list, then [Next alert].
- **What you see:** "Case files: 14 alerts". The file opens confidential because of its folder, before
  the load report shows. Report: "2,000 accounts, 3 edge types (shared device, shared phone,
  transfer), 0 rows dropped -- showing ACC-48213 and its first hop: 8 of 2,000". The graph draws only
  those; the rest is loaded and not drawn. ACC-48213 is chip 1.
- **Controls:** 2 acts.

**2. The account in its network.**

- **What you do:** Type "expand two hops through shared device or shared phone", Enter; Enter on Go.
- **What you see:** [Expand] [1 ACC-48213] [2 hops] [edge types: shared device, shared phone],
  compiled locally ("or" inside one slot's list). Go reads "draws 62 accounts (8 now)". The
  expansion's chip enters as chip 2 ("2 hops of ACC-48213: 62 accounts").
- **Controls:** 1 act (Enter on Go), 55 keys.

**3. When did this form?**

- **What you do:** Type "last 30 days", Enter, Enter on Go; type "transactions per day for this",
  Enter. Grab the time tile's viewing handle and step it back a week; look; pinch Snap back.
- **What you see:** [Set analysis window] [last 30 days: Sep 10 to Oct 9]. The reader shows the
  per-day chart for the 62 accounts, with a spike on Sep 28; the chart is a reading and does not
  enter the tray. The viewing handle is a Look handle: the tile reads "viewing: Sep 3 to Oct 2 --
  analysis: Sep 10 to Oct 9", and the ring's edges thin to three accounts before Sep 28. Snap back
  returns the view; the analysis window never moved.
- **Controls:** 3 acts, 43 keys.

**4. Shared identifiers, with no model.**

- **What you do:** Type "accounts in this that share a device with two or more others and were
  opened within three days of each other", Enter. Tab to the glowing tile, arrow to the first
  choice, Enter. Enter on Go.
- **What you see:** The local compiler places [Find pattern] [account] [shares edge type: shared
  device] [with at least 2 others] [inside: 2 hops of ACC-48213] [window: Sep 10 to Oct 9] and
  leaves "not placed: 'opened within three days of each other'". Its picker offers [opened within N
  days of each other] [opened after] [created in window]. Choosing the first fills N with 3 from her
  own words. Go reads "searches 62 accounts, Sep 10 to Oct 9". The result is a group table: 4
  matches, each row a set, with Next to step through them. The pattern sits on the rail as a tile
  whose constraints are slot tiles. Nothing left the headset. At a bank that allows Data withheld,
  the picker's [Ask the model for this clause] would send only "opened within three days of each
  other", with the Pattern constraint list and the attribute names.
- **Controls:** 2 acts, about 112 keys. The matches are precomputed in the mock.

**5. New hubs, as a rule, saved for tomorrow.**

- **What you do:** Type "select accounts created in the last 30 days with degree above 5", Enter.
  Tab to [among], pick the expansion; Tab to [degree over], pick transfer; Enter on Go. Type "save
  this rule as New shared-device accounts", Enter; Enter on Go.
- **What you see:** [Select] [among: all 2,000 (default)] [created in last 30 days] [degree > 5]
  [degree over: all edge types (default)] [counted in: the whole graph (default)], the three
  defaults in the Check list. After her two changes: "selects N of 62" (the count from the mock's
  sample). Save as filter saves the rule without applying it, so the next steps still see all 62.
  Its 30 days and 5 came from her words, so they travel in clear; only values taken from the data
  would be marked confidential.
- **Controls:** 4 acts, about 115 keys.

**6. Following the money.**

- **What you do:** Type "follow the money from 1 to ACC-10077, three routes", Enter; Enter on Go.
- **What you see:** "Follow the money" is an example phrasing, compiled to [Routes] [from 1
  ACC-48213] [to ACC-10077] [3 routes] [through: transfer] [direction: follow transfers] [time
  order: each hop after the last]. The typed id matches exactly one account, so it binds with no
  completion pick. The target slot also takes a set ("to any account in Known fraud"). The route
  list shows each hop's amount and date; arrows step along a route, framing each stop.
- **Controls:** 1 act, 51 keys.

**Steps 7 to 13, designed and not built in the mock.**

- _Money that comes back._ "Money that comes back to this" compiles locally to [Find cycles]
  [through: transfer, following direction] [inside: 2 hops of ACC-48213] [length up to 5], with
  results as a group table.
- _The ring._ Communities on chip 2, then "keep its community as Ring 7" on a pinched account, with
  Go required because the target was reached through another object. The Check list records the
  seed the run drew ("seed: drawn, recorded as 48113"), so the ring can be reproduced from the
  evidence; graphty-element must report that seed, which is element work.
- _Risk and review._ "Rank Ring 7 by outlier score and transfer degree" uses a graphty command; a
  score in the export is used if present. One Yes / No / Skip set at the reader's foot acts on the
  cursor row (thumbstick, or arrows and Y / N / S on her keyboard). A No offers [Remove from Ring 7]
  beside it, committed with the review's own answer.
- _Evidence that leaves the headset._ The evidence note references graphty's own records. "Export
  case report" writes every reference out as values (ids, options, the recorded seed, the window
  dates, review answers, timestamps, the analyst name from the settings) and its Go names the
  destination: "goes to: laptop, case-files". A confidential project saves to the paired folder by
  default.
- _Determination._ The Project's [Record determination] writes a determination file for the batch
  filed after the session.
- _A fast clear._ Most alerts are false positives: Next alert, one look at the first hop, [Record
  determination: Clear], which attaches the expansion, the window and the view as references. The
  mock counts this variant against her desktop tool once the determination is built.
- _Recipes._ A recipe keeps only mechanical steps (expand, window, pattern, rule, routes,
  communities, color) and ends at a "your turn" marker. A pick made by pointing becomes an input;
  review answers, removals and determinations are never recorded.

---

## 6. How it grows

The rest of graphty's functionality checklist fits without new controls, because every command,
option, result and object kind is generated from graphty-element's descriptors, and all three paths
(hand, typed, spoken) end in the same sentence of tiles.

- **The algorithm catalog, with options.** Each algorithm's descriptor (plain name, technical name,
  category, options, result fields) becomes one command for both compilers and one entry in More's
  catalog. Its options become slot tiles: a number gets a keypad and a slider, a logarithmic
  tolerance an exponent stepper, an attribute a list grouped by kind, a node a node slot that glows
  in the graph. Unsaid options show as defaults in the Check list; "all options" opens the whole
  generated form in the reader, with Advanced folded. The first run leaves the option the request
  named on its rail page as a knob, else the descriptor's primary option, never an iterations count
  or a seed. Past about 300 commands, the model first reads a one-line index of every command and
  picks by meaning.
- **Layouts.** One command each, scoped by a slot ("lay out these radial around 1"). A layout
  handle's release is a new layout step that Undo takes back, not a kept run.
- **Styling layers.** Every style request is a layer, shown as a chip on the stack row; chips are
  objects, so "put this under the community color", "hide this", "rename this" and "why this look"
  need no new control. Palettes and channels come from the style schema as tiles.
- **Compare.** Two run chips or two set chips light [Compare]; the comparison is a reading with its
  own reader, which can be pinned, noted and exported.
- **History and recipes.** History is a reader whose rows are objects with tags. A recipe is a
  saved run of steps whose inputs are tiles.
- **Import, export and reports.** Opening and adding data are commands whose slots are a file and
  its column roles; a join shows "matches 1,412 of 1,530" at Go. Exports name their destination on
  Go. A report's title and summary are text slots in your words; "add the methods" inserts
  graphty's own record of every run, never model-written prose.
- **Plugins.** A plugin's algorithm, layout, reader, writer or palette registers a descriptor and
  appears in both compilers, in More's catalog and as tiles the day it is installed, with no VR
  code. A plugin's example phrasings, if it gives them, make its users' words compile on the
  headset.

**The honest limit.** Anything that is not a command with slots needs a tile designed once by
graphty's team: a free-form highlight around a group, a camera path, reordering table columns.
Prose longer than a few sentences is slow on any headset keyboard and is best finished on the
paired laptop. Skimming a 40-column table is slower than on a monitor. A plugin's own hand-built
panel opens only on the 2D page. The compilers are only as good as the descriptors' names. And the
rail is finite: four tiles a page, and more than about five pages are hard to keep track of.

---

## 7. Checks inside the mock

Each is a measurement taken while people walk the basic journey (typed and spoken), journey 1, the
composite score, W06 and the shared tests, not a separate test.

1. **How much the headset handles with no network.** The share of the fixed sentence set the local
   compiler resolves completely, and the share it resolves partly, by persona and device, against
   the 2D command palette's share for the same sentences. The claim is at least four in five for
   the basic journey's requests.
2. **How often the tiles are wrong, and whether people catch it.** Model requests per walk: none in
   the typed basic walk, journey 1 or W06; 2 in the spoken basic walk; 1 in the composite. Compile
   accuracy and latency (1.5 to 4 s expected), with seeded errors (a swapped comparison, a wrong
   scope) in a known share of requests: how often people correct a tile before Go, and how often
   they press Go without reading, as in step 10.
3. **Pointing against naming in dense graphs.** In the shared test of picking 12 scattered nodes
   among 400 and among 10,000: wrong picks and time with the ray and Collect, with the sweep, and
   with tags, on Quest hands, Quest controllers and Vision Pro. Frame time with tags shown at
   10,000 nodes.
4. **Typed against spoken against by hand.** Acts, keys, time and errors per request on Quest typed
   (fingertip on the keyboard at 45 cm against ray typing), Quest with a lent laptop keyboard, and
   Galaxy XR or Vision Pro with voice; and the composite score on each path, against its hand build.
5. **The graph in space is used.** Acts on the graph against all acts, over each basic walk on its
   own. The shared line is one in four; the walks above count 30 percent each, and the margin rests
   on people filling slots from the graph rather than from the tray.
6. **Voice in real rooms.** False commits or cancels from a colleague's speech during the keyword
   window; how often people end listening too early; held-pinch asking against Talk taps; voice
   and arm comfort over an hour.
7. **Neck, arm and fit.** Head pitch over the journey with the stack row at 25 degrees, the bar at
   28 to 38 and the keyboard at 45; time with the arm raised; the widest sentence and plan in the
   walks at the default and the largest text size, and which overflow rule fired.
8. **Privacy holds.** Every outgoing request in Data withheld logged and checked automatically
   against the data's ids, names and category values: none may leave. Requests the model could not
   compile because of withholding. How often people read the Sends line before Send, and how many
   turn on "Send without asking".
9. **The rail.** Tiles created, tiles used again by hand, pages per session; how often a change is
   made on a rail control instead of a new request; how often a Look handle is snapped back.
10. **First session.** Unaided time to the first committed change in journey 1, and whether people
    find Tags, the hand path, Undo and the next tiles without being told.
11. **Frame time.** Preview frame time at 2,000 nodes on Quest 3 while a slot tile is changed, and
    during a run.

---

## 8. Why it should work, and known risks

### Why it should work

- **Speech and pointing complete each other.** Bolt's "Put-That-There" (SIGGRAPH 1980) bound "that"
  and "there" to pointing. Oviatt, DeAngeli and Kuhn (CHI 1997) found the gesture usually comes
  before or with the spoken reference, which is the order the held pinch asks for: point, then say.
  Kaiser and colleagues (ICMI 2003) showed speech and pointing correcting each other's errors in VR
  and AR.
- **Showing a natural-language query back as editable choices works.** DataTone's ambiguity widgets
  (Gao and colleagues, UIST 2015), Eviza (Setlur and colleagues, UIST 2016), Orko for networks
  (Srinivasan and Stasko, IEEE TVCG 2018) and NL4DV's compile-to-specification approach
  (Narechania, Srinivasan and Stasko, IEEE TVCG 2021) are the slot tiles' ancestors.
- **A closed compile target is shipped practice.** Tool calls with strict schemas (OpenAI structured
  outputs; Anthropic tool use) keep a model's output inside declared commands.
- **Hints beat aiming for small targets.** Vimium-style link hints let keyboard users reach any link
  by two letters; tags make every target about 2 degrees wide.
- **Command palettes are learned once and used everywhere** (VS Code, Raycast, Spotlight), and
  Blender's "Adjust Last Operation" shows that keeping the last command adjustable is how people
  tune.
- **Preview, scoping and cheap correction are what make an assistant usable.** Amershi and
  colleagues' "Guidelines for Human-AI Interaction" (CHI 2019); Horvitz's mixed-initiative
  principles (CHI 1999); Parasuraman, Sheridan and Wickens' levels of automation (2000).
- **Studio evidence.** Point and Ask's last-round mean was 3.5 on a 1 to 5 scale, and one judge found
  language the largest efficiency lever in the studio. Walked here, the composite score takes 7
  acts spoken against 11 to 17 in the other designs, and the basic journey puts 30 percent of its
  acts on the graph in both its typed and its spoken walk.

### Known risks

| Risk                                                                                                                                                                                           | Mitigation                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Typing is the default first session.** Quest Browser has no speech recognition, a new project starts On headset, and no headset has a confirmed on-device recognizer                         | The basic journey is designed and counted typed, with a docked keyboard in reach. Whole-command completions keep most requests to a few keys; example phrasings make a first-timer's words compile on the headset; the eight local phrases work by voice with no key. A lent laptop keyboard carries the gates |
| **Typed language can be slower than the hand path.** The composite typed is 4 acts but 117 keys                                                                                                | Every request has a hand path of known length, shown in the walks; check 4 times both, so the design's claim rests on voice where voice exists                                                                                                                                                                 |
| **The graph line rests on a habit.** Both basic walks put 30 percent of acts on the graph, but only if people fill slots by pinching the glowing object instead of a tray chip or a typed name | Slots glow in the graph, the held pinch makes the object the start of a spoken request, and check 5 counts it per person. If people drift to the tray, the design has failed its exit line, whatever else it scores                                                                                            |
| **A pinch on an object has four meanings** (target, slot fill, collect, held ask)                                                                                                              | Each other meaning is announced before the pinch: a glow on eligible objects, a pulsing Selection chip during Collect, the hold's tone and ring. Check 3 and check 6 count wrong meanings                                                                                                                      |
| **People press Go without reading.**                                                                                                                                                           | Locked targets with badges, the count on Go, a held Go for warning verbs, empty tiles that block Go, a red "changes 0", and an Undo that names its step. Step 10 is the measured case                                                                                                                          |
| **Wrong but plausible compilations.**                                                                                                                                                          | Tiles in graphty's own terms with alternatives under each guess; numbers and text never invented; partial compiles that keep what they placed; the Check list; seeded errors measured                                                                                                                          |
| **Confidential data leaving the headset; banks that allow no model.**                                                                                                                          | On headset keeps everything local and W06 is walked that way; partial compiles leave one tile for the hand; Data withheld sends only an unplaced clause and shows it first; an automatic leak check                                                                                                            |
| **Model latency and cost.** 1.5 to 4 s per request                                                                                                                                             | The local compiler first; view-only requests apply at once; the next change by hand on the rail                                                                                                                                                                                                                |
| **Speaking in shared rooms, or not being able to speak.**                                                                                                                                      | Typing and the hand path are complete; the keyword window accepts eight phrases and tag words only while the head points at the bar or the graph                                                                                                                                                               |
| **Tags cost frames on big graphs.**                                                                                                                                                            | Tags drawn as one instanced layer, only on the nearest batch, with More tags; frame time at 10,000 nodes is a check                                                                                                                                                                                            |
| **Rail clutter.**                                                                                                                                                                              | One page per object, four tiles a page, a repeated request replacing its own tile; check 9                                                                                                                                                                                                                     |
| **Knob re-runs of slow algorithms.**                                                                                                                                                           | The re-run happens when the ring closes, not per detent; over 5 seconds the release asks for Go                                                                                                                                                                                                                |
| **Build scope.** The whole design is about 19 engineer-weeks                                                                                                                                   | The mock builds the basic journey, journey 1, the composite and W06 through step 6; the parts listed in section 2 are designed and left out                                                                                                                                                                    |
| **Element work.** Counts before commit, the transient emphasis channel, recorded seeds and references that report drift belong in graphty-element                                              | Shared with all six mocks; stubbed in a worker for the mock, built in the element before a study with real users                                                                                                                                                                                               |
| **Voice depends on three device checks.** Chrome's recognizer inside a session on Galaxy XR, the microphone in immersive Safari on Vision Pro, a speech key on Quest                           | All three run in the first week, before the voice path is built; every spoken step has a typed form                                                                                                                                                                                                            |

---

## 9. What we learn by building it

- **Whether words can carry the work a headset is worst at.** VR is bad at aiming at small things
  and bad at typing; this is the only mock that bets the long authoring steps (rules, patterns,
  composite scores, multi-step styles, far targets by id) on language, and the only one that can
  show whether a sentence plus a check beats building the same thing by hand -- spoken, typed, and
  on which headset.
- **Whether pointing and speaking fuse into one act.** The held pinch that asks about an object is
  Put-That-There in a headset; the walks count how much of a session starts on the graph because of
  it.
- **What share of real requests a headset can handle with no network**, measured against the 2D
  palette's share for the same sentences.
- **Whether two-letter tags, Collect and the sweep answer dense picking**, in the shared head to head
  test against the "which one?" card, the slab, the machine framing, facets and the source
  monitor's list.
- **Whether people read what the machine will do before they let it.** The step 10 rate of Go
  without reading is the number every AI-mediated feature in graphty will need, on the 2D page as
  much as in a headset.
- **Whether a privacy route people can see is a route they use.** Partial compiles and the Sends
  line are new; the mock tells us whether analysts with confidential data accept the model on those
  terms, or keep it off.
- **Whether a workspace built by use becomes a console.** No other mock lets the person's own
  requests lay out their controls; the rail's survival counts tell us whether that is a feature or
  clutter.
- **Whether the hand path and the spoken path are really one surface**, so that people move between
  them mid-task without relearning.

---

## Appendix: what the mock must also get right

### The assistant setting in full

| Setting           | What can leave the headset                                                                                                                                                                                               | What works                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Off**           | Nothing                                                                                                                                                                                                                  | The hand path, the typed palette, the tray, tags and the rail                                                                                                                                       |
| **On headset**    | Nothing                                                                                                                                                                                                                  | The above, plus the local compiler, and speech only through the in-page keyword recognizer, or a browser recognizer for which the page set an explicit on-device option and the browser accepted it |
| **Data withheld** | The request or unplaced clause with ids, names, free text and category values replaced; the data's attribute and edge-type names and the request's own numbers in clear; audio only to a speech service the person chose | Everything                                                                                                                                                                                          |
| **Full**          | The request with attribute and node names; audio to the person's speech service with the data's names as recognition hints                                                                                               | Everything, with the best recognition of ids                                                                                                                                                        |

- **Withholding by kind, not by matching values.** Replaced: ids, node names, set, view and project
  names, free text, and string values of three or more characters from category columns. In clear:
  numbers in the request's own words (unless they come from an id column), attribute names and
  edge-type names, unless the project marks its schema confidential. Each request keeps a
  substitution table, and every span and slot value in the model's answer is mapped back through
  it. The Sends line lists everything that leaves, including the attribute names and the command
  slot list sent with the text.
- A project marked **confidential** is locked to Off, On headset or Data withheld. Files opened from
  a folder marked as case files open confidential before the load report shows. The mark travels
  with values taken from the data, not with parameters the person typed.
- **Recognition hints** are sent only in Full. In the other settings the heard text is matched
  against the data's own id list on the headset, with the closest ids shown under the tile.
- **Opening or switching projects** by request always compiles on the headset, so a case name is
  never sent under the current project's setting.
- **Browser recognizers are speech services.** Chrome's on Galaxy XR and Safari's on Vision Pro may
  send audio to Google or Apple; each is listed by name and allowed in On headset only with an
  explicit on-device option the browser accepted. Where the browser cannot say, the answer is
  "unknown", treated as "no".
- A new project starts **On headset**. Adding keys offers Data withheld (the default) or Full.

### Keys

Keys for a model provider and a speech service are entered on graphty's 2D page, checked there with
one cheap call ("key works"), and held by a small key page served from a second origin (in the mock,
a second dev-server port), which the main page talks to by `postMessage`. The key page makes the
calls, reusing graphty-element's existing AI providers inside it. The claim is narrow: a plugin in
the main page cannot read the key. The key page lists which speech services a browser can call
directly, says "not supported from a browser" for the rest, checks each provider once on each
headset (some need an explicit browser-access header), and recommends a spend-limited key.

### Engineering notes for the build

- **Compile target.** graphty-element's session commands (`graphty-element/src/session/commands/`),
  not the smaller command list of its AI layer. The grammar is generated from descriptors with a
  parser generator (Chevrotain or nearley), one parser per slot type. Example phrasings live in the
  mock's copy of the descriptors; adding them to graphty-element is an additive change to propose
  separately.
- **Voice.** The keyword recognizer is vosk-browser's small English model (a one-time download on
  the 2D page) with a grammar of the eight phrases, the tag words and an unknown token, run in a
  worker on an AudioWorklet stream; no full recognizer runs in the page. The microphone stream and
  the audio context open on the Enter VR click, so a controller face button (read by polling, which
  carries no user activation) only starts and stops listening on an open stream. Where face-button
  Talk fails on a headset, Talk there is the bar key.
- **Panels and text.** `@babylonjs/gui` is added to the mock only, not to graphty-element; its
  virtual keyboard is the base of the in-scene keyboard. Panel text uses signed-distance-field fonts
  or textures at two to three times panel resolution; a day goes to checking the Check list's
  smallest text on each headset.
- **Tags and badges.** One thin-instanced billboard over a single glyph atlas of letter pairs and
  digits, sized in the vertex shader by distance for a constant angular size; tags on panel
  elements go in the same buffer. graphty-element's per-node labels are never used for them.
- **Previews.** Drawn by writing the instance color and scale buffers directly (the transient
  emphasis channel), recomputed when a tile is released, never as a style layer added and removed.
  Long runs check their abort signal in chunks or run in a worker, so Stop can be pressed.
- **Pairing.** A WebSocket relay on the dev machine, which works on networks that block direct
  peer links.
- **Inputs.** Each input source's target ray is used as the browser gives it; a pinch is told from
  a turn by about 2 cm of hand or grip travel on every device.
- **Files.** The Open list and saves use the origin's private file storage, which a page can list
  and write with no prompt.

---

## Review notes

### Before round 1

The prototype reviews of Point and Ask (34) left five severity 3 findings, fixed in this mock: the
pinch that picked "this" replaced the selection "these" read (pinching never changes the selection);
pattern search needed the model and locked out confidential projects (partial compiles, walked in
W06 with no model); "names withheld" sent attribute values in clear (withholding by kind, with the
Sends line); privacy crossed project boundaries through hints, recipes and project names (hints
only in Full, confidentiality travels with data values, opening always compiles on the headset);
and a laptop file had no path into the headset (the shared text and file service).

### Round 1

Four reviews, in `reviews/`: the owner's intent (`r1-point-and-ask-1.md`), VR interaction
(`r1-point-and-ask-2.md`), the fraud analyst walking W06 (`r1-point-and-ask-3.md`), and WebXR
engineering (`r1-point-and-ask-4.md`).

| Review            | Severity | Finding                                                                                         | What was done                                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner's intent    | 4        | The graph is a minority input; the counted walk was a typed palette, under the one-in-four line | Recounted by the definition (turns and re-pinches excluded, the mistake counted). Slots now glow in the graph and are filled there; two nodes fill from and to; the sweep fills a set. The walk is object-first: 9 of 30 acts on the graph typed, 8 of 27 spoken, each over the line on its own (section 4). The remaining dependence on habit is in Known risks |
| Owner's intent    | 3        | The AI-mediated design almost never used its AI                                                 | A spoken, model-on basic walk with one seeded wrong tile caught before Go; the composite walked through the model with the Sends line; model requests counted per walk in check 2                                                                                                                                                                                |
| Owner's intent    | 3        | The assigned proof journey was not walked                                                       | Journey 1 walked unaided, typed on Quest; the composite score walked with its tiles and compared with the 11 to 17 acts of the other designs (section 5). W02 removed; W06 kept for confidential data and no model                                                                                                                                               |
| Owner's intent    | 3        | With no words, hard to tell from Paired Browser                                                 | Three steps bind several pointed targets in one sentence (route, compare, filter at a node's value), plus a plan and a rail change; a "How this differs from Paired Browser" subsection with the shared head-to-head                                                                                                                                             |
| Owner's intent    | 3        | The rail never made a change                                                                    | The threshold dragged one detent in step 8 ("keeps 6"); journey 1's resolution change made on the rail's knob, keeping both runs and comparing them                                                                                                                                                                                                              |
| VR interaction    | 3        | The bar sat inside the graph; the keyboard was out of reach                                     | New geometry: graph 40 cm at 90 cm, 5 degrees down; stack row 25; bar 28 to 38; keyboard 45 degrees at 45 cm, typed by fingertip; touch against ray typing in check 4                                                                                                                                                                                            |
| VR interaction    | 3        | The bar did not fit in 55 cm                                                                    | Three rows on a curved bar 50 degrees wide, short chip names, belts as stubs, widths in degrees, an overflow order, and a fit check                                                                                                                                                                                                                              |
| VR interaction    | 3        | Rail tiles were smaller than the 2-degree minimum                                               | Rail 0 to 30 degrees, four 7-degree tiles a page, value printed on the handle, quick pinch for the keypad                                                                                                                                                                                                                                                        |
| VR interaction    | 3        | No way to gather more than four objects by hand                                                 | Collect on the Selection chip (one undo step) and the sweep with a count before commit                                                                                                                                                                                                                                                                           |
| VR interaction    | 3        | No rule for when a waiting sentence's targets are fixed                                         | Targets lock when the sentence is built; a later pinch offers "Use N instead?"                                                                                                                                                                                                                                                                                   |
| VR interaction    | 3        | Voice gate and hover cues used gaze the page cannot read                                        | Head direction within 25 degrees gates the keyword window and orders tags; hover cues show while the pinch is held on Vision Pro                                                                                                                                                                                                                                 |
| VR interaction    | 3        | The counted walk was command-first and under the line                                           | The same fix as the owner's severity 4 finding; keys reported beside acts                                                                                                                                                                                                                                                                                        |
| VR interaction    | 3        | A knob re-run changed nothing visible                                                           | Layers and filters bind to "latest" or a pinned run, shown on their chip; the handle previews the downstream change; filter membership changes wait for Go; a re-run uses the original scope                                                                                                                                                                     |
| Fraud analyst     | 3        | A time scrub silently re-scoped later analyses                                                  | Look handles change only the view, with both values shown and Snap back; only Go moves the analysis window, and every Go names it                                                                                                                                                                                                                                |
| Fraud analyst     | 3        | The route was a connection, not a money trail                                                   | Route slots for edge type, direction and time order, in the Check list; "follow the money" compiles to transfers, forward, time-ordered; a set as target; hop amounts and dates                                                                                                                                                                                  |
| Fraud analyst     | 3        | The evidence chain ended inside the headset                                                     | Designed: Export case report with every reference written out, the drawn seed recorded, an analyst name, confidential saves to the paired folder. Left out of the mock's build, which stops at W06 step 6                                                                                                                                                        |
| Fraud analyst     | 3        | Two headset removals per alert; the recipe could not replay                                     | A shift queue (export in one go, Next alert, determinations filed in one batch); case-files folders open confidential; recipes keep only mechanical steps and never record judgments                                                                                                                                                                             |
| Fraud analyst     | 3        | Keyboard and controller swapped on every step                                                   | W06 on hands with the lent keyboard carrying the gates (Enter on Go, Ctrl+Enter, Tab, arrows, Y / N / S, Ctrl+Z, Esc); pinches ignored for 500 ms after a keystroke                                                                                                                                                                                              |
| Fraud analyst     | 3        | Pattern search sent the whole request to a model a bank may forbid                              | Partial compiles leave one tile for the unplaced clause with local choices; W06 step 4 walked with no model; the Sends line lists everything that leaves                                                                                                                                                                                                         |
| WebXR engineering | 3        | The scope did not fit 2 to 6 weeks                                                              | The build is cut to the basic journey, journey 1, the composite and W06 through step 6; the parts left out are listed in section 2                                                                                                                                                                                                                               |
| WebXR engineering | 3        | The local compiler was an open-ended parser                                                     | Compiles to the session commands with a grammar generated from descriptors, one parser per slot type, a fixed sentence set for the claim, and partial compiles instead of a pattern parser                                                                                                                                                                       |
| WebXR engineering | 3        | The layout's angles contradicted each other                                                     | The same geometry fix as the VR interaction review's first two findings                                                                                                                                                                                                                                                                                          |
| WebXR engineering | 3        | The headset's file picker and Downloads cannot be reached in a session                          | The Open list and saves use graphty's own storage; outside files come in on the 2D page or by pairing; downloads happen on the 2D page or go to the laptop; in-session download is a check                                                                                                                                                                       |

Severity 2 and 1 findings from this round were also applied: verb tiles always build a sentence;
the number-from-node fill is in the vocabulary and fills never enter the tray; warning verbs sit
after a gap and need a held Go; the row cursor and one review set; LRU eviction with pins and a
recent fold; tags with spoken words, leader lines and no tap; the release ring on rail handles;
corrected Florentine values (Medici 0.144, Strozzi 0.087, Tornabuoni stored exactly); a
one-controller setting and Back moved to the Overview miniature; rail pages per object; layout and
layer moves walked; a stated keyboard and counting rule; withholding by kind; a fit check and
overflow rule; the privacy and key plumbing moved to the appendix; scope and degree basis shown as
tiles with one scope rule; readings kept out of the tray; Save as filter without applying; a
start-from slot for large files; risk scoring by a graphty command with Remove beside a No; a
cycles step; exact ids bound on Enter; Record determination listed among the Project's verbs; the
keyword recognizer, browser recognizers and user activation, the key page's second origin, tags as
one instanced layer, previews in instance buffers, the WebSocket relay and text rendering in the
engineering notes; and the three voice checks moved to the first week.
