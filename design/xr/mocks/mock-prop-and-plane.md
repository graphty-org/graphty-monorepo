# Mock: Prop and Plane

Date: 2026-10-10. A mock specification for graphty in a VR headset. It is one of six whole
interaction models chosen to be built and compared ([the mock recommendation](../xr-prototype-mocks.md) in this folder lists all six).
It is built on the studio's Prop and Plane design (prototype 38, [prototype-38.md](../prototypes/prototype-38.md)); numbers
in parentheses after a design's name below are prototype numbers, files `prototype-<N>.md` in [prototypes/](../prototypes/README.md).

Kind: research, possible only in VR. AI: none. The mock runs in full VR on a solid colored
background on Meta Quest 3 / 3S, Samsung Galaxy XR and Apple Vision Pro.

---

## 1. The idea

You hold the graph in one hand and a cutting plate in the other.

Your off hand (the left, for a right-handed person) is the graph's handle. Close its grip and a
small copy of the graph -- the ghost, 25 cm across, resting on a stand low in front of you -- turns
exactly as your hand does, and the real graph, floating at a comfortable height, turns with it; let
go and both stay. Your dominant hand holds a plate, a stiff translucent card the size of a large
postcard. Bring it into the ghost and it cuts through it the way a knife cuts a loaf: the thin slice
of the graph it passes through is drawn flat and unhidden on its face, every node a labeled disc,
nothing in front of anything else. The same slice lights up where it really is, inside the real
graph: its nodes grow a little and take their labels, every other label steps back. A crosshair in
the middle of the plate snaps from node to node and to the middle of each tie, so a pick in a
hairball is as precise as tapping a name on a card.

Most of what you do is done with the plate itself, by how you hold it and where you lay it:

- **Slice** -- the plate in the ghost: read and pick a node or a tie.
- **Sweep** -- the trigger held while the plate moves through the ghost: gather everything it passes.
- **Tilt** -- lift a slice out and tip its top edge toward you: it grows by one hop (Select
  neighbors), with the count before you commit.
- **Lay on a swatch** -- a shelf of swatches unfolds below your dominant hand: laying the slice on
  one previews it inside the slice (paint by a value, run an algorithm, lay the graph out along a
  value); pushing on through spreads the preview to the whole graph; the trigger commits.
- **Cut** -- with the graph laid out along a value, hold the plate edge-on across the row: a
  threshold, with the families on each side named. Push on through the cut and it keeps that side
  as a filter.
- **Read lengthwise** -- hold the plate along the row instead: a route or a ranking lies flat on it,
  every tie labeled.
- **Stack** -- two networks, two runs or time windows stacked in depth on the same positions: slide
  the plate through them and what differs changes color under it.
- **Pair** -- park slices in a tray at your side and touch the one you carry to one of them: only
  the verbs that take two things light up (Route between, Compare, Union, Intersect, Difference).

Press B (with hands, the Menu key, or simply look down at the lectern) and your dominant hand
becomes a pointer on the clipboard, a panel beside the graph that holds the page of whatever you
last picked, its facts and its verbs, generated from graphty's own descriptions of its algorithms,
layouts, styles and formats, with a search field that brings what you find to the plate. Authoring
-- forms, rules, names, notes -- happens there. The plate never turns into the clipboard: with
hands, turning the hand over would show the palm to the eyes, which is the headset's own system
gesture, so the clipboard is always a separate panel.

**Inspiration.** The neurosurgical planning interface of Hinckley, Pausch, Goble and Kassell
(CHI 1994): a doll's head held in one hand to set the brain's orientation, a plastic plate held in
the other to set a cutting plane, both held low near the body. Surgeons used it after about a
minute of instruction because the relation of two hands to two objects was obvious. Their surgeons
watched the result on a monitor; here the result is drawn in the graph itself, where the eyes
already are. Guiard's kinematic chain (1987) explains why the pairing works: the non-dominant hand
sets the frame, the dominant hand works finely inside it, as when one hand holds the page and the
other writes.

---

## 2. What the mock is

### The objects in the scene

| Object           | Where it is                                                                                                                                                                                                                                                                                                          | What it shows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The graph        | Seated home: center about 25 to 30 degrees below eye level, 55 to 60 cm away (lower chest height). Standing home: chest height, 75 cm away                                                                                                                                                                           | graphty-element's real graph, styled by its layers. The slice in use is shown in place: its nodes drawn about 1.5 times larger with their labels, its ties at full strength, two thin outlines at its faces; every label outside the slice is suppressed; nothing is dimmed (Dim outside is a view setting). The crosshair's node or tie carries a ring                                                                                                                                                                                                             |
| The readout line | One line just under the graph's lower edge, facing you                                                                                                                                                                                                                                                               | The full sentence for what the next press will do and what the last one did ("pick: select only Medici -- 6 ties, PageRank 0.145"), the undo and redo flashes, load progress. It is where a seated person's eyes already are                                                                                                                                                                                                                                                                                                                                        |
| The ghost        | On its stand: seated, centered about 35 cm in front of the body at stomach height (hands) or lap height (controllers), placed 15 to 20 cm in front of where the off hand rests; standing, at waist height. It moves only while held                                                                                  | A 25 cm copy of the graph as faint points (at most 2,000 sampled points, no edges), always in the real graph's orientation as seen from your eyes. It stands for the part of the graph in view: at home that is the whole graph; scaled up, a smaller region, so the same hand motion cuts finer. A 5 cm inset cube on the stand shows the whole graph with that region boxed. An axis cross, a ring that lights while you hold it, the name of the armed stack ("Stack: networks"), and the slice drawn through it                                                 |
| The plate        | Controllers: a 22 x 16 cm card off the dominant controller's tip. Hands: a virtual 22 x 16 cm card lying along the back of the dominant hand, its center (the crosshair) about 10 cm past the middle fingertip                                                                                                       | The slice flattened: nodes as discs with the latest result's value, ties inside the slice as lines with a small mark at their middle, ties leaving it as short stubs, labels on the crosshair's target and the 12 nearest (all labels when magnified). Its lower edge carries a short label of at most 24 characters ("pick: only Medici", "+6 families", "keeps 5 of 16") on a tag turned to face the eyes; the full sentence is on the readout line                                                                                                               |
| The slice window | Optional, off by default (Settings, "Slice window"): below the graph's lower edge, tilted back toward the eyes, 30 x 22 cm                                                                                                                                                                                           | A copy of the plate's face, for people who prefer to read the slice as a picture. A study condition, not the default                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| The parking tray | Seated: a lap-height tray of four slots by the dominant thigh, mirrored as four small tiles beside the graph on the dominant side. Standing: at the dominant hip                                                                                                                                                     | Each slot holds a parked slice with its title naming what it stands for ("ACC-48213, account" or "Medici in-laws, 7, unsaved set")                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| The swatch shelf | Folded below the tray; unfolds after a slice has been carried out of the ghost for 0.3 s                                                                                                                                                                                                                             | Swatches generated from the style, algorithm and layout descriptors and the newest result: "Color and size by PageRank", "Color edges by membership", "Label by ...", highlight colors, Hide; "PageRank", "Degree", "Communities" and the catalog's suggestions for this graph; "Lay out along PageRank" for the newest number                                                                                                                                                                                                                                      |
| The clipboard    | Seated, controllers: pinned beside the graph, 25 to 35 degrees to the off side, about 55 cm away, 45 x 32 cm, worked by a ray. Seated, hands: a lectern 35 to 40 cm away at lower chest height, tilted back 30 to 45 degrees, worked by fingertip. Standing: pinned at 55 cm beside the graph. Its grab bar moves it | A rail of tabs (This, Catalog, Layouts, Results, Layers, Filters, Sets, Notes, Views, Data, History, and Time when the data has time), a top bar (subject chip "This: Medici", "Showing X of Y", the command field that is also Find, Back, named Undo and Redo, View back, Stack, Adding, Save, More) and a second row (Scale - / +, Slab - / +, Home, Magnify, Free angle). Project, Settings, Help and Pin are under More. No text smaller than 1 degree of visual angle (about 1 cm tall at 55 cm). Every page and form is generated from graphty's descriptors |
| The wrist strip  | Hands only: a short rigid strip just past the off wrist on the back of the hand, shown only while the off hand is raised above the thigh or looked at                                                                                                                                                                | Five keys, 3 cm each: Menu, Undo, Redo, Home, Adding. Every one is also on the clipboard's top bar                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

**Looking is kept apart from selecting.** The crosshair labels the node or tie it rests on ("Medici,
6 ties, PageRank 0.145") and changes nothing. Before every press the plate's tag and the readout
line say what the press will do: "pick: select only Medici", "pick: add Ridolfi", "cut: selects
above 0.070 -- 5". After the press the readout names the clipboard's subject ("This: Medici") and
the counts ("5 in slice -- 1 selected"). Undo and Redo flash their step's name on the readout line
and the clipboard's top bar.

### How the plate decides where to cut

The ghost is fixed in the room while you slice it; only your grip moves it, and only while the
plate is out of it. So the cut is set by one hand at a time: the off hand turns the graph, the
dominant hand cuts.

- **Facing you, by default.** The slice is always a plane facing your eyes, as thick as the slab
  setting (4 cm in the graph at home). The plate's depth in the ghost sets which slice; moving the
  plate within its own plane moves the crosshair. You set one number with the hand, not three.
  "Free angle" on the clipboard's second row lets the plate's angle set the slice's angle instead.
- **The ghost stands for what you see.** At home it maps the whole graph; scale the graph up 4
  times and the ghost maps the quarter in view, so a 3 mm tremor of the hand stays a 3 mm wobble
  in the ghost's terms instead of growing with the graph. The inset cube shows where that region
  sits in the whole.
- **Depth lock, for every device.** Once the crosshair has rested 0.3 s, the slice's depth locks
  (its outlines turn amber with a lock tick) and only motion within the plate's plane moves the
  crosshair; moving more than 2 cm along the plate's normal releases it.
- **Smoothing, always.** The plate and the ghost are always smoothed by a speed-adaptive filter
  (the one-euro filter of Casiez, Roussel and Vogel, CHI 2012), stronger at low speed; the
  Steadiness setting adds more and a dead zone at snaps.
- **Slice where you look.** To bring a node you can see in the real graph to the plate without
  hunting for it in the ghost: look at it and press the off trigger (with hands, pinch with the
  dominant hand held away from the ghost, the tray and the panels). Vision Pro uses the eyes;
  Galaxy XR uses the eyes if Chrome exposes gaze to WebXR (to verify on the device), otherwise the
  head; Quest uses a faint dot at the center of view, drawn only over the graph. The slice moves to
  that node's depth, the plate carries it with the crosshair on the node, and the readout reads
  "carrying: Strozzi -- trigger to pick".
- **Seated or standing.** The flat page asks at Enter VR, with a guess from eye height preselected
  (WebXR cannot tell). Standing works the same way, ghost at waist height; reaching straight into
  the real graph is used only when the graph has been brought 45 cm or nearer, where the arm stays
  bent.

### The plate's stances

| Stance        | How you get there                                                                                                                   | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slicing       | The plate in the ghost; with hands, the dominant hand flat (fingers extended) and still 0.2 s there                                 | The slice is drawn live on the plate and in the real graph. The crosshair snaps to the nearest node or tie middle                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Carrying      | The plate moved out of the ghost, or a slice brought by search or by looking                                                        | The last slice stays on the plate, frozen, readable at any distance. A pick on a carried slice works as in the ghost. After 0.3 s the swatch shelf unfolds                                                                                                                                                                                                                                                                                                                                                                                                             |
| Tilted        | Carrying, nearly still (under 5 cm/s), top edge tipped toward you more than 20 degrees from the angle it had when it left the ghost | One hop is armed around the selection (or the crosshair's node when nothing is selected). The neighbors are drawn onto the plate in a lighter ring and lit in the graph; the tag reads "+6 families" and the readout "+6 families, 7 marriages -- trigger to select, tip back to cancel". Controllers: the stick up / down adds or removes hops, left / right cycles an edge-type filter with its counts. Hands: tipping 20 degrees further arms a second hop, never more. 5 degrees of hysteresis at every step; the hop count is taken when the press starts         |
| On a swatch   | Carrying, the plate laid against a swatch for 0.2 s (it then arms with a tick)                                                      | The swatch's effect previews inside the slice, with two counts: "in slice: paints 5 -- spread: 16". Pushing the plate on through the swatch's detent (2 cm with controllers; with hands, entering at 3 cm and leaving at 1.5 cm) spreads the preview to the whole scope (the selection if there is one, otherwise the whole graph). The trigger commits only an armed swatch: a style layer, a run, or a layout. Pulling back off cancels                                                                                                                              |
| Parked        | Carrying, laid into a free slot of the tray, then the trigger or a pinch                                                            | The slice waits in the tray. With a full tray, the oldest slot is lit and the press replaces it, named on the tag ("replaces Medici in-laws"). Laying the plate on a parked slice and pressing takes it back                                                                                                                                                                                                                                                                                                                                                           |
| Paired        | Carrying a slice and touching it to a parked one                                                                                    | The verbs that take two inputs list along the joint (below); the stick steps through them with a haptic tick (hands: slide along the joint); the readout names both operands, the scope and the count ("Route ACC-48213 to ACC-10077 -- 4 hops -- scope: last 90 days"); the trigger commits. Swap reverses the operands                                                                                                                                                                                                                                               |
| Cutting       | In an axis view, the plate edge-on across the row                                                                                   | The ruler on the tag reads the value; the plate snaps into gaps between nodes and to round values, with a tick; the readout names the neighbors on either side ("between Ridolfi 0.069 and Tornabuoni 0.071"). The side selected is the side the plate's face points to, tinted; turning the controller over swaps it, and Swap on the tag does the same for hands. The stick steps the cut gap by gap. Trigger selects that side; pushing on through the cut's detent previews Keep this side ("keeps 5 of 16, 4 marriages"), and the trigger then adds a filter step |
| Lengthwise    | In an axis view, the plate held along the row (facing you)                                                                          | The whole row lies flat on the plate: a ranking in order, or a route from source to target with one lane per route and each tie labeled with type, amount and date. The stick steps hop by hop along a lane (left / right) and between lanes (up / down); the graph never turns; the tag names the mode ("along route 1")                                                                                                                                                                                                                                              |
| Stack slicing | Two networks, runs or time windows laid in depth on shared positions (Stack); the plate snaps parallel to the layers                | The plate shows one layer; between two layers it shows both overlaid, with what differs in its membership colors; sliding plays through them. Community runs are matched to the earlier run's groups by largest overlap before they are colored, so a node changes color only when its group really changed                                                                                                                                                                                                                                                            |

### Hands: how the plate is read

- **The plate's plane comes from the back of the hand only**: the wrist and the index and middle
  knuckles, which barely move when thumb and index meet. The fingers are free to pinch.
- **Every pinch is read at its start.** The plate's pose, the target, the hop count and the swatch
  are taken from the moment thumb and index start closing (their gap falling through about 4 cm),
  from the pose buffer, not from when the pinch completes.
- **Nothing happens on relax.** Slicing starts with a flat hand; after that, curling the fingers,
  pinching or resting the hand changes nothing until the hand leaves the ghost. Parking is only
  ever an explicit lay-in-the-tray and pinch.
- **The hands stay apart.** The ghost is not on the off hand; it rests on its stand 15 to 20 cm in
  front of where the off hand rests, and the crosshair sits 10 cm past the dominant fingertips, so
  the two hands keep at least 10 cm apart while cutting. If they come closer, the ghost's ring
  turns amber and the readout reads "hands too close". The working height for hands is the stomach
  and lower chest, where the cameras of all three headsets see best.
- **Scale with two hands.** While the off pinch holds the graph, a dominant pinch started away from
  the ghost, the tray and the panels scales the graph by the distance between the hands. A
  dominant pinch while the off hand is not holding is a commit or a look, never a scale.

### One hand

A setting, "One hand", for anyone who has one free hand, at any time:

- The ghost never follows a hand; it stays on its stand.
- **Turning the graph is sticky.** Press the grip (or pinch) on the stand's ring: the ring latches,
  and the dominant hand now turns the graph, ratcheted (release and grip again to keep turning);
  press again to unlatch and the hand is the plate again.
- **The off hand's keys move to a side panel** next to the stand: Scale - / +, Slab - / +, Home,
  Undo, Redo, Slice where I look, Stack.
- **A click of the dominant stick switches it** between Step and Scale; Magnify moves to the side
  panel. With hands, scaling is the Scale keys.
- Everything else -- slicing, tilt, swatches, the tray, pairing, the clipboard -- already needs only
  the dominant hand.

### Parts from other prototypes, folded in as features

| Part                                                                           | From                                              | Where it lives here                                       |
| ------------------------------------------------------------------------------ | ------------------------------------------------- | --------------------------------------------------------- |
| Two props held low, one setting the frame and one the cutting plane            | Hinckley and colleagues (CHI 1994)                | The ghost on its stand and the plate                      |
| "Looking" kept apart from "selected", with the press labeled before it happens | Prop and Plane (38)                               | The crosshair, the plate's tag and the readout line       |
| Two counts inside a region, then Spread to commit                              | Lens Kit (31)                                     | The swatch shelf and the cut's Keep this side             |
| A count before release; dragging back past the start cancels                   | Lean In (12)                                      | Sweeps, tilts, swatches, cuts                             |
| Detents that name the neighbors on either side of a cut                        | The Sheet (27), Physics Lab (15)                  | The cutting stance's ruler                                |
| Pair verbs on two held copies                                                  | Voodoo Dolls (14)                                 | The tray and the joint                                    |
| Generated pages, links, Back apart from Undo, and search                       | Graph Browser (28)                                | The clipboard, whose Go to brings the result to the plate |
| A slice of 3D data drawn on a hand-held 2D surface for picking                 | Slice WIM (Coffey and colleagues, IEEE TVCG 2012) | The plate's face                                          |

### What is real in the mock and what is stubbed

Real, on every device the mock runs on: the ghost and its stand; the plate; the slice shown in place
and on the plate; the readout line; the crosshair on nodes and ties, the selection rule and its
labels; slice where you look; sweep, tilt, the swatch shelf and Spread; the tray, pairing and the
pair verbs; the axis cut, Keep this side and the lengthwise view; search that brings the result to
the plate; the clipboard with its generated pages (This, Catalog, Layouts, Results, Layers,
Filters, Sets, Notes, Data, History), its keyboard and the named Undo and Redo; One hand; Save to
the headset. graphty-element runs the real graph and the algorithms it ships (PageRank, degree,
shortest route, steps away, Louvain).

Stubbed, while the person's interaction stays whole:

- **Stacks.** Precomputed for the two study networks of the proof journey: the merged network laid
  out once, each condition's layer on those positions, and the two Louvain runs with their groups
  already matched. Sliding, picking and reading on a stack are real.
- **Laying out along a value.** Registered by the mock through graphty-element's own extension
  point for layouts, `registerSnapshotLayout`, so it is an ordinary layout the element runs; for
  real use it ships in the element.
- **k shortest routes, routes limited to some edge types, and routes in time order.** Precomputed
  for the fraud case graph; the single shortest route itself is real.
- **The laptop folder and the phone keyboard.** The shared text and file service every mock uses
  ([the mock recommendation](../xr-prototype-mocks.md), "What all six share"), with its relay stubbed on the development machine. Every
  journey is first run and counted unpaired, in the headset alone.

Not built in the mock (they stay in "How it grows"): recipes, "Undo only this step", a viewfinder
for pictures, the Views and Time tabs.

Built once for all six mocks, not here: the in-scene panel toolkit (text, lists, tables, generated
forms, a keyboard with a caret), the text and file service, and the graphty-element capabilities
every mock needs (a transient emphasis channel for previews, a count before every command, what is
shown kept apart from what is analyzed, references that remember what they resolved to).

graphty-element work this mock needs in the element itself, so every consumer gets it (all
additive, non-breaking):

- **An XR setting that keeps head and hand tracking but turns off the element's built-in XR
  controls.** Today its XR input handler uses the thumbsticks to rotate, zoom and pan and two hands
  to zoom and rotate, which clashes with every mapping here.
- **Moving, turning and scaling the graph separately from the camera.** Today the view turns by
  moving the camera, which would swing every object pinned in the room (the clipboard, the tray,
  the readout line).
- The slice as a plane and a thickness in the node, edge and label materials (a shader test, not
  per-node style changes); laying out along an attribute as a built-in layout; stacked copies of
  the graph on shared positions; matching groups across community runs; a shortest-route
  algorithm that takes an edge-type filter and a time order.
- Labels drawn from one shared font atlas, so the plate, the slice in place and the readout can
  change labels every frame at 72 to 90 Hz.

**Build order.** First the controller version on Quest 3 (the basic journey, the proof journey and
the path investigation), about 4 weeks for two or three engineers once the shared panel toolkit and
keyboard exist. Then hands on Quest, 2 to 3 weeks of tuning on the device. Then Galaxy XR and Vision
Pro.

### Devices and inputs

| Device                                     | Inputs                                                                    | How the mock runs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Meta Quest 3 / 3S, controllers             | Grip pose, trigger, grip, thumbsticks with click, A / B / X / Y, haptics  | The full mapping below; the primary device. Haptic ticks at snaps and detents. The ghost's stand and the tray keep the two controllers at least 10 cm apart so neither hides the other's tracking lights                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Meta Quest 3 / 3S, hands                   | 25 joints per hand                                                        | Two poses only: a pinch and a flat hand. The off hand pinches to hold the graph; the dominant hand is the plate. Everything else is a labeled key or a fingertip on a panel. Select events from hand input sources are ignored. No haptics: a click and a visible tick. Slice where you look uses the dot at the center of view                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Samsung Galaxy XR, controllers             | The optional controllers as WebXR gamepads in Chrome on Android XR        | As Quest controllers. Haptics to verify on the device                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Samsung Galaxy XR, hands                   | WebXR hand input in Chrome                                                | As Quest hands. Android XR's palm-facing system pinch is avoided by the same rules (below)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Apple Vision Pro, hands and eyes           | Hand joints (with permission) and the transient pointer (gaze plus pinch) | The ghost and the plate run on hand joints, so the mock asks for hand-tracking permission at Enter VR with the reason. Declined, it says "Prop and Plane needs hand tracking" and shows where to turn it on in the headset's settings, since Safari may not ask again; a clipboard-only session is not counted as this design. A dominant gaze-pinch counts only when the eyes have rested 0.3 s on its target (a panel or a node in the graph), the dominant hand is more than 10 cm outside the ghost, the tray and the shelf, no tilt, swatch or pair preview is showing, and no plate commit happened in the last 0.5 s. Off-hand transient selects are always dropped. No hover: previews show while a pinch is held on a verb. Safari may clear saved data: the mock asks for persistent storage and offers export of saved projects |
| Apple Vision Pro, PS VR2 Sense controllers | If Safari exposes them as WebXR gamepads                                  | The controller mapping; otherwise hands                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

Gesture safety with hands: nothing is read but a pinch and a flat hand. No pose asks the palm to
face the eyes (the system-menu gesture on all three headsets): the plate is the back of the hand,
there is no flip, the cut's side is swapped by a key, a hold that starts palm-to-face is ignored, and
a hold's roll stops counting before the palm comes within 60 degrees of the face. Lost tracking
freezes a hold where it is and cancels a sweep, a drag or a tilt.

---

## 3. The control vocabulary

Controller first, hands in the second column. "Off" is the non-dominant hand; handedness is a
setting that mirrors everything. Each input keeps one meaning: grip grabs, trigger commits what the
plate or pointer is on, the stick steps to the next choice the plate offers, the off hand holds the
graph, B toggles the clipboard pointer.

| Input (controllers)                                                 | Hands                                                                        | Its one meaning                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Off grip held                                                       | Off pinch held, palm not toward the face                                     | **Hold the graph.** The ghost and the real graph turn 1:1 with the hand about their center; while the plate is out of the ghost the ghost also moves with the hand. Release leaves it. Turning is ratcheted: release and grip again to keep turning. Rotation gain 1.0 by default (1.5 or 2 is a setting for limited wrist range). Holds within 2 s of each other or under 10 degrees are one level of View back |
| Off thumbstick up / down                                            | Both hands pinching, apart and together (Scale keys also on the second row)  | **Scale** the graph about its center, 25 percent a step. In a stack, scales the stack's depth                                                                                                                                                                                                                                                                                                                    |
| Off thumbstick left / right                                         | Slab - / + keys                                                              | **Slice thickness**, 1 to 20 cm in the graph, shown with its count on the readout                                                                                                                                                                                                                                                                                                                                |
| Off thumbstick click                                                | Home (wrist strip and top bar)                                               | **Home**: leave an axis view, then a stack; otherwise fit the graph to its home and the ghost to its stand                                                                                                                                                                                                                                                                                                       |
| Off trigger                                                         | Dominant pinch away from the ghost, tray and panels, while looking at a node | **Slice where I look**                                                                                                                                                                                                                                                                                                                                                                                           |
| Y / X                                                               | Undo / Redo keys (wrist strip and top bar)                                   | **Undo / Redo** one named step. Consecutive picks are one step ("Selection: 4 picks")                                                                                                                                                                                                                                                                                                                            |
| Plate brought into the ghost                                        | Dominant hand flat and still 0.2 s in the ghost                              | **Slice**                                                                                                                                                                                                                                                                                                                                                                                                        |
| Plate moved out                                                     | Hand moved out                                                               | **Carry** the frozen slice; the shelf unfolds after 0.3 s                                                                                                                                                                                                                                                                                                                                                        |
| Carried plate tipped toward you                                     | The same                                                                     | **Grow by hops**, previewed with its count; tip back to cancel                                                                                                                                                                                                                                                                                                                                                   |
| Carried plate laid on a swatch; pushed through its detent           | The same                                                                     | **Preview** in the slice; through the detent, **Spread** to the scope; pull back to cancel                                                                                                                                                                                                                                                                                                                       |
| Carried plate laid in a tray slot                                   | The same                                                                     | **Park** (on the trigger or pinch)                                                                                                                                                                                                                                                                                                                                                                               |
| Carried plate touched to a parked slice                             | The same                                                                     | **Pair**                                                                                                                                                                                                                                                                                                                                                                                                         |
| Plate edge-on across a row in an axis view; along it                | The same                                                                     | **Cut**; **Read lengthwise**                                                                                                                                                                                                                                                                                                                                                                                     |
| Dominant thumbstick                                                 | Move the hand; slide along the joint when paired                             | **Step** to the next choice in the direction pushed: node or tie while slicing; gap while cutting; hop and lane lengthwise; layer in a stack; hops and edge type while tilted; verb while paired; scroll on the clipboard                                                                                                                                                                                        |
| Dominant thumbstick click                                           | Magnify key (second row)                                                     | **Magnify** the plate 2x, then 4x, around the crosshair, then back                                                                                                                                                                                                                                                                                                                                               |
| Dominant trigger, quick                                             | Dominant pinch, quick                                                        | **Commit what the plate or pointer is on**: pick on a slice; select on a cut; the armed hop, swatch, Keep this side, park or pair verb. On the clipboard: press shows the effect with its count, release commits, sliding off cancels. The target is the one under the crosshair or pointer 0.1 s before the press starts                                                                                        |
| Dominant trigger held, plate moving more than 3 cm along its normal | Pinch held while the hand moves through the ghost                            | **Sweep**: everything the slice passes lights with a running count; only motion along the plate's normal counts, so going back over a region is harmless; release inside the ghost adds; lifting the plate out before release cancels                                                                                                                                                                            |
| A                                                                   | Adding key (wrist strip and top bar), sticky                                 | **Toggle** the crosshair's node or tie in or out of the selection without changing This. Hands: while Adding is lit, every pick toggles                                                                                                                                                                                                                                                                          |
| Dominant grip                                                       | The Move key on This, then the flat hand drags; grab bars on panels          | **Grab**: a node under the crosshair, gripped and held 0.3 s, is dragged in the plate's plane ("Move Medici") and pinned where released, a named step; a panel by its grab bar. Grip never parks                                                                                                                                                                                                                 |
| B                                                                   | Menu (wrist strip and top bar); seated, the lectern is always in reach       | **Clipboard pointer on / off**, opened on This. Only B (or a Go to, which brings the result to the plate) leaves the pointer. Back is on the top bar                                                                                                                                                                                                                                                             |
| Pointer resting on a clipboard verb                                 | Fingertip within 2 cm of it; Vision Pro: pinch held on it                    | **Preview** the verb on the graph with the count it will change                                                                                                                                                                                                                                                                                                                                                  |
| --                                                                  | Either index fingertip touching a panel                                      | **Press** directly. An off pinch that starts within 10 cm of a panel is ignored, so typing with two fingers never grabs the graph                                                                                                                                                                                                                                                                                |
| View back (top bar)                                                 | View back (top bar)                                                          | **Return the camera** to before the last hold, Home, Go to or view change; five levels; never touches data                                                                                                                                                                                                                                                                                                       |
| Voice (optional)                                                    | Voice (optional)                                                             | Types into an open text field, where the headset's browser offers speech input (to verify per device; Quest Browser likely does not); otherwise through the shared text service from a paired phone                                                                                                                                                                                                              |

**The selection rule**, the same on every device, shown on the tag and the readout before each press:

- A pick always makes the crosshair's node or tie the clipboard's subject ("This: Medici").
- A **picking run** starts with a pick made after any other selection act, and ends at the next
  selection made another way: a cut, a tilt, a sweep, a filter, a table row, a search, a pair verb.
  Moving, carrying, scaling, turning, parking and opening the clipboard do not end it.
- Inside a picking run, a pick adds or removes that node ("pick: add Ridolfi").
- Otherwise the pick starts a new selection with that node ("pick: select only Medici"), and the
  old one is a press of Previous selection on This, or one Undo.
- A (or Adding) always toggles without touching the subject.

**What a parked slice stands for.** Exactly one named object: the selection made on it, as an
unsaved set, if there is one; otherwise its crosshair's node or tie. Its title says which, with a
count ("Medici in-laws, 7, unsaved set"). The pair verbs:

| Verb                         | Takes                                | Gives                                                                                                               |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Route between                | node or set, then node or set        | A route run: shortest routes from any of the first to any of the second, on the current scope, named in the preview |
| Compare                      | set and set (a node is a set of one) | A table: in both, only in the first, only in the second, with counts                                                |
| Union, Intersect, Difference | set and set                          | A new unsaved set, named from both                                                                                  |

Merging two networks is not a pair verb: it is on Data, "Add a network", and makes a stack.

---

## 4. The basic journey

Florentine families: 16 families (Pucci among them, with no marriages), 20 marriage ties. The
person is seated with Quest 3 controllers; hands differences are in each Controls line. Each act is
marked **pose** (the plate's or the held graph's pose chose what happened), **button** (a stick or
button chose it) or **panel** (a press on the clipboard or the flat page).

**1. Enter.**

- **What you do:** In the headset's browser, open graphty; Seated is preselected beside Enter VR;
  press Enter VR. With no data loaded, the clipboard opens by itself on Data with the samples first,
  the pointer already on; press "Florentine families".
- **What you see:** The 16 families float at lower chest height about 58 cm away, Pucci alone at the
  edge. On the stand in your lap, their ghost, 25 cm across, with its axis cross; the plate on your
  dominant controller, translucent and empty; the clipboard beside the graph on the off side. As the
  sample opens, the pointer goes back to being the plate, and the readout line reads "Grip left to
  turn the graph. Bring the plate into the small copy to slice. B for the menu." A three-lesson tour
  (turn this, cut that, press B) offers itself with Skip.
- **Controls:** Enter VR, the sample (2 panel). Hands: a fingertip press on the lectern; the first
  line reads "Pinch with your left hand to turn the graph. Lay your right hand flat in the small
  copy to slice."

**2. Get oriented.**

- **What you do:** Close the off grip and turn the controller; the graph turns with it. Push the off
  thumbstick up twice. Let go. Glance at the clipboard.
- **What you see:** The graph and its ghost turn exactly as your hand does, so its depth reads at
  once; the ring on the ghost lights while you hold. The graph grows by half; the ghost still shows
  all of it. The clipboard's This page, with nothing picked, is the graph: "16 families, 20
  marriages, 2 pieces (Pucci alone), undirected, density 0.17", and the sample's attributes.
- **Controls:** off grip (1 pose), off stick (1 button). Hands: off pinch held; then a dominant
  pinch away from the ghost while still holding, hands moved apart (2 pose).

**3. Find the Medici.**

- **What you do:** Bring the plate into the middle of the ghost, where the biggest node sits. Slide
  it a centimeter to the right; pull the trigger.
- **What you see:** In the real graph, the five families inside the 4 cm slice grow a little and take
  their labels; every other label steps back. The plate shows the same five flat. The crosshair
  rests on Ridolfi ("Ridolfi, 3 ties"), the depth locks with a tick, and as the plate slides the
  crosshair hops to Medici; the tag reads "pick: only Medici" and the readout line "pick: select
  only Medici -- 6 ties". On the trigger Medici is outlined in the graph and on the plate; the
  readout reads "This: Medici, 6 ties -- 1 selected", and the clipboard turns to Medici's page.
- **Controls:** plate in the ghost, trigger (2 pose). Hands: lay the right hand flat in the ghost;
  slide it onto Medici; pinch (2 pose).

**4. Who they married into.**

- **What you do:** Lift the plate out of the ghost, hold it still and tip its top edge toward you.
  Pull the trigger.
- **What you see:** Past 20 degrees, Medici's six in-laws appear on the plate in a lighter ring --
  the three already in the slice and three more at their projected places -- and light in the
  graph. The tag reads "+6 families"; the readout "+6 families, 7 marriages among the 7 -- trigger
  to select, tip back to cancel". On the trigger, Acciaiuoli, Albizzi, Barbadori, Ridolfi,
  Salviati, Tornabuoni and Medici are selected; the clipboard's subject becomes "Selection (7)",
  whose page offers Keep as set with the suggested name "Medici in-laws".
- **Controls:** tilt, trigger (2 pose). Hands: the same; pinch (2 pose).

**5. Who matters most (PageRank).**

- **What you do:** Keep carrying; the shelf unfolds below your dominant hand. Lay the plate on the
  swatch "PageRank". Pull the trigger.
- **What you see:** The swatch arms with a tick and the five families in the slice show their
  PageRank on the plate; the readout reads "PageRank -- whole graph (16) -- damping 0.85 --
  instant -- trigger to run". On the trigger the run is kept on Results, and the clipboard, which
  you have not touched, turns to its page: "PageRank, damping 0.85, whole graph, undirected". Other
  options and scopes are on that page under "Re-run with changes", and every algorithm is in
  Catalog.
- **Controls:** swatch, trigger (2 pose). Hands: the same; pinch (2 pose).

**6. Read the result.**

- **What you do:** Read the ranking on the clipboard. Bring the plate back into the ghost.
- **What you see:** Medici 0.145, Guadagni 0.098, Strozzi 0.088, Albizzi 0.078, Tornabuoni 0.071,
  Ridolfi 0.069, Castellani 0.069, Bischeri 0.068, Peruzzi 0.067, Salviati 0.061, Barbadori 0.050,
  Pazzi 0.036, Ginori 0.032, Lamberteschi 0.031, Acciaiuoli 0.030, Pucci 0.010, with a histogram.
  In the graph and on the plate, every family in the slice carries its PageRank beside its name.
- **Controls:** plate in the ghost (1 pose). Hands: the same (1 pose).

**7. Color and size by PageRank.**

- **What you do:** Carry the slice out; lay it on the swatch "Color and size by PageRank". Push on
  through the detent. Pull the trigger.
- **What you see:** On the swatch only the families in the slice take the sequential color and 1x to
  3x sizes, on the plate and in the graph; the tag reads "in slice 5 -- spread 16". Through the
  detent the whole graph previews the look. On the trigger it stays: a layer "Color and size by
  PageRank" appears on Layers and a legend at the graph's base. The palette and size range are on
  the layer's page.
- **Controls:** swatch, Spread, trigger (3 pose). Hands: the same; pinch (3 pose).

**8. Keep only strong families (filter).**

- **What you do:** Carrying, lay the plate on "Lay out along PageRank" and pull the trigger. Bring
  the plate to the row edge-on, its face pointing to the high end; slide it until it settles at
  0.070. Push on through the cut's detent; pull the trigger. Click the off thumbstick.
- **What you see:** The families slide into a row from Pucci (0.010) to Medici (0.145); the
  readout reads "a view, not a step". Held along the row the plate shows the ranking flat; turned
  edge-on it snaps across the row and its ruler reads the value. The high side is tinted, and the
  tag reads "selects above 0.070 -- 5". In the gap it snaps to 0.070 with a tick, and the readout
  names the neighbors: "between Ridolfi 0.069 and Tornabuoni 0.071". Pushed on through, the other
  11 ghost out: "keeps 5 of 16, 4 marriages". On the trigger they fade and the top bar reads
  "Showing 5 of 16 -- 1 filter". The stick click returns the families to their places.
- **Controls:** layout swatch and trigger, cut, Keep this side, trigger (5 pose); Home (1 button).
  Hands: the same, the hand turned a quarter edge-on; pinch; Home on the wrist strip (5 pose,
  1 panel).

**9. Write a note.**

- **What you do:** Bring the plate into the ghost, rest the crosshair on Medici and pull the trigger.
  Press B; on Medici's page press Note, swipe the words across the keyboard with the trigger held,
  press Done.
- **What you see:** Because the selection came from a tilt, the tag says "pick: only Medici" before
  you press, and This is Medici afterward -- the note cannot land on the seven. The note card shows
  "Married into six families; the hub of the network"; a small flag appears on Medici in the graph
  and the note on Notes.
- **Controls:** plate in the ghost, trigger (2 pose); B (1 button); Note, Done (2 panel); swipe
  typing, about 8 words. Hands: pinch Medici; fingertip typing on the lectern, where a first-time
  line says "Swipe a word with a pinch held"; paired, the phone's keys type into the field.

**10. Undo a mistake.**

- **What you do:** Open Filters to read the filter step and press its toggle by mistake; all 16
  families come back. Press Y.
- **What you see:** "Undid: Turn off filter 'PageRank at least 0.070'" flashes on the readout line
  and the top bar; the 11 fade out again and "Showing 5 of 16" returns. History lists Open
  Florentine families, Select Medici, Select neighbors, Run PageRank, Add layer, Add filter, Select
  Medici, Note on Medici, with the undone step grayed. X would redo it.
- **Controls:** Filters, the toggle (2 panel); Y (1 button). Hands: Undo on the wrist strip.

**11. Save.**

- **What you do:** Press Save on the top bar and accept the suggested name "Florentine families".
- **What you see:** "Saved Florentine families" on the readout line. The project is in the headset's
  storage with its layer, filter, run and note; paired, it is also written to the laptop folder.
- **Controls:** Save, Save (2 panel).

**The count.** Controllers: 30 acts -- 18 pose, 4 button, 8 panel -- plus the note's words. Counting
only commits (an act that changes the data, the view or the selection, not one that lifts, arms or
previews): 15, of which 8 are pose. Hands: 29 acts -- 19 pose, 10 panel. Both are counted
unpaired, in the headset alone.

One hand, steps 2 to 4: grip the stand's ring once, turn the graph with the dominant controller,
grip again to let go; click the stick to Scale, push up twice, click back; plate into the ghost,
trigger; lift, tilt, trigger (10 acts against 6).

---

## 5. Harder journeys

### Proof journey: disease versus control

Dr. Chen (a computational biologist who leads a group studying protein interaction networks;
persona `bioinformatics-researcher` in `design/designloom/personas`; workflow W24, condition
comparison, in `design/designloom/workflows`) has two protein interaction networks for the same
tissue: `control.graphml` (412 genes, 1,903 interactions) and `disease.graphml` (398 genes, 2,050
interactions), each gene with its `gene_id` and `logFC`. Her question: which genes are rewired in
disease, and which interactions are gained or lost. Quest 3 with controllers, seated. The stack is
precomputed for these two files; everything she does is real.

**1. Open the control network.**

- **What you do:** B; Data, Open; press `control.graphml` in the headset's files.
- **What you see:** "GraphML -- 412 genes, 1,903 interactions, undirected". The graph lays itself
  out at home; the ghost follows.
- **Controls:** B (1 button); Data, Open, the file (3 panel).

**2. Add the disease network and merge.**

- **What you do:** Data, "Add a network", `disease.graphml`. In the merge form leave "Merge as union,
  matching gene_id"; press Merge.
- **What you see:** Before Merge the form says what it will write and how many: "430 genes (380 in
  both); 2,611 interactions: 1,342 in both, 561 only in control, 708 only in disease. Adds
  `membership` on every interaction (control only, disease only, both), keeps `logFC_control` and
  `logFC_disease` side by side, and adds the scopes 'Network: control' and 'Network: disease'
  (each network's interactions and their genes)". On Merge the ghost's label reads "Stack: networks
  -- ready".
- **Controls:** Add a network, the file, Merge (3 panel).

**3. Read each network.**

- **What you do:** Read This, with nothing selected.
- **What you see:** Three columns -- control, disease, merged -- for genes, interactions, density,
  pieces and largest piece; communities show "--" until a run exists.
- **Controls:** none.

**4. Stack them and slide through.**

- **What you do:** Press Stack on the top bar; press B to get the plate back. Bring the plate into the
  ghost and slide it slowly from front to back.
- **What you see:** The two networks separate in depth on the same positions, control in front,
  disease 12 cm behind; in the ghost they are two thin layers. The plate snaps parallel to them. At
  the front it shows the control interactions in the slice; halfway, both overlaid, with
  interactions found only in control drawn blue and only in disease orange; at the back, disease.
  The readout reads "between layers -- 14 interactions differ in this slice".
- **Controls:** Stack (1 panel); B (1 button); plate in the ghost (1 pose).

**5. Degree in each condition and how much it changed.**

- **What you do:** Carry the slice out; lay it on the swatch "Degree"; pull the trigger. On the run's
  page press "Difference between layers", accept the name "degree change".
- **What you see:** With a stack up, the run swatch reads "Degree -- once per layer (2) -- instant".
  On the trigger two runs appear on Results, "Degree -- control" and "Degree -- disease", each naming
  its scope. The difference form shows "disease minus control, also as an absolute value" with its
  range (-9 to +11).
- **Controls:** swatch, trigger (2 pose); Difference between layers, OK (2 panel).

**6. Keep the 20 largest changes.**

- **What you do:** Carrying, lay the plate on "Lay out along degree change (absolute)", trigger.
  Bring the plate edge-on across the row from the high end, face toward the high end; step the cut
  with the stick until the tag reads "selects 20". Push through the detent; trigger.
- **What you see:** Both layers' genes slide into one row by absolute change. Each stick step moves
  the cut one gap with a tick, the readout naming its neighbors ("between NOTCH1 5 and FOXO3 6 --
  selects 20"). Pushed through: "keeps 20 of 430 genes, 61 interactions, in both layers". On the
  trigger, "Showing 20 of 430 -- 1 filter".
- **Controls:** layout swatch, trigger, cut, Keep this side, trigger (5 pose); stick steps (about 3
  button); Home leaves the axis view and returns to the stack (1 button).

**7. Color interactions by membership.**

- **What you do:** Carry a slice out; lay it on "Color edges by membership" (the shelf offers it
  because the merge wrote that field); push through; trigger.
- **What you see:** In the slice, then everywhere: control only blue, disease only orange, both gray.
  A layer "Edge color by membership" appears on Layers with a three-state legend at the graph's
  base.
- **Controls:** plate in the ghost and out, swatch, Spread, trigger (4 pose).

**8. Read a rewired gene in both conditions.**

- **What you do:** Bring the plate into the ghost at the disease layer; slide the crosshair onto the
  gene with the most orange around it; trigger. Slide the plate forward to the control layer.
- **What you see:** "SMAD3" is picked; This reads "SMAD3 -- degree: control 3, disease 14, change
  +11 -- logFC: control 0.2, disease 2.4". It is ringed in both layers. On the plate, at the
  disease layer it has 14 ties, 11 of them orange; at the control layer 3, all gray. The crosshair
  stays on SMAD3 as the plate moves between layers, because the positions are shared.
- **Controls:** plate in the ghost, trigger, slide to the other layer (3 pose).

**9. Do the communities change?**

- **What you do:** Carry the slice out; lay it on "Communities"; trigger. Slide the plate through
  the stack again.
- **What you see:** "Communities (Louvain) -- once per layer (2)"; the disease run's groups are
  matched to the control run's by largest overlap before coloring. Sliding through, SMAD3 is green
  in control and orange in disease; the readout reads "6 of the 20 shown changed group". The run
  page's Compare table gives each layer's groups, sizes and modularity, and the genes that moved.
- **Controls:** swatch, trigger, plate in the ghost (3 pose).

**10. Export the merged interactions and the figure.**

- **What you do:** B; More, Project, Export: "Interactions -- merged", format CSV, scope "All (2,611)"
  instead of "Showing (61)", Save to headset. Export again: "Picture with legend", layer "disease",
  Save.
- **What you see:** Each export names its columns and count before saving ("2,611 rows, with
  membership, logFC_control, logFC_disease"); the picture shows the disease layer with the
  membership legend, without the slice outlines. Paired, both also go to the laptop folder.
- **Controls:** B (1 button); about 9 panel presses.

**11. Save.** Save on the top bar (1 panel).

About 45 acts: 18 pose, 7 button, 19 panel. The comparison itself -- the stack, the per-layer runs,
the cut, the paint and reading a gene in both conditions -- is on the plate; loading, merging and
exporting are panel work.

Hands: Stack on the lectern; the cut's 20 is reached by sliding the edge-on hand gap by gap, each
gap a click and a tick; the rest as above.

### W05 Path Investigation -- Sarah, fraud analyst

Sarah (8 years in financial crime, 50 or more alerts a day, needs defensible evidence; persona
`fraud-analyst`) has her case graph open: 3,214 accounts and 9,870 ties of three types (transfer,
shared device, shared phone), filtered to "last 90 days". Alert: flagged account `ACC-48213`.
Question: how does it connect to the known fraudster `ACC-10077`? Quest 3 with controllers, seated.

**1. Find the source.**

- **What you do:** Press B; in the command field type "48213". Press `ACC-48213` in the results.
  (Paired, "Open in headset" on the alert in her laptop's graphty does this step, a feature of the
  shared text and file service.)
- **What you see:** Completions from the third character, each row with id, degree and type. On Go
  to, the graph turns so the account faces you, the pointer ends with a tick, and the plate carries
  the account's slice, picked: "This: ACC-48213 (created 19 days ago, risk 0.82, 7 ties)".
- **Controls:** B (1 button); about 5 keys, the result (6 panel).

**2. Park it as the source.**

- **What you do:** Lay the plate in the first tray slot by your dominant thigh; trigger.
- **What you see:** The slot and its tile beside the graph read "ACC-48213, account".
- **Controls:** tray, trigger (2 pose).

**3. Find the target.**

- **What you do:** B; "10077"; press it.
- **What you see:** The plate carries `ACC-10077`'s slice, picked. Had it been hidden by the filter,
  the result row would have said "hidden by filter 'last 90 days'" with "include hidden".
- **Controls:** B (1 button); about 5 keys, the result (6 panel).

**4. Route between them.**

- **What you do:** Touch the carried plate to the parked slice. Step the stick to Route between; pull
  the trigger.
- **What you see:** Along the joint: Route between, Compare, Union, Intersect, Difference, each with
  what it takes. On Route between the shortest route ghosts in the graph and the readout reads
  "Route ACC-48213 to ACC-10077 -- 4 hops, 3 accounts between -- all tie types, any order -- scope:
  last 90 days". A second line warns: "A 3-hop route exists through 1 account the filter hides --
  Re-run on all". On the trigger the route is a run on Results with a scope chip, and the clipboard
  opens its page.
- **Controls:** pair touch, trigger (2 pose); stick step (1 button).

**5. Decide what kind of path.**

- **What you do:** On the route's page, Re-run with changes: Routes "3 shortest"; Edge types
  "transfer, in direction"; Time order on; Weight none; Run.
- **What you see:** The form is generated from the algorithm's options, including the edge-type chip
  with a direction per type. The new run ranks three routes, 4, 4 and 5 hops, each marked "in time
  order"; a fourth candidate is listed as "out of order at hop 3" and left out. "Common to all 3:
  ACC-55102". Both runs are kept.
- **Controls:** about 6 panel.

**6. Read the routes flat.**

- **What you do:** B to get the plate. Lay it on the swatch "Lay out along steps from ACC-48213";
  trigger. Bring the plate to the row held along it. Step left and right along the first lane; push
  down to the second. Then turn the plate edge-on at hop 2.
- **What you see:** The route accounts line up by hops from the source, the rest of the case graph
  pushed behind them. Lengthwise, the plate shows the three routes as three lanes from source to
  target, each tie labeled "transfer $9,400 -- Mar 14". The crosshair steps hop by hop and the tag
  reads "along route 1". Edge-on at hop 2, the plate shows all 14 accounts two hops from the
  source, with the route accounts ringed: one, ACC-55102, on all three routes.
- **Controls:** B (1 button); layout swatch, trigger, lengthwise, edge-on (4 pose); about 6 stick
  steps (button).

**7. Keep a tie as evidence.**

- **What you do:** Back lengthwise, step onto the tie from ACC-55102 to ACC-31877; trigger. On the
  tie's page press "Key evidence: Yes".
- **What you see:** The tie's page: "transfer, ACC-55102 to ACC-31877, 3 transfers, $9,400 total,
  Mar 14 to Mar 16", each transfer with its own amount and date. The judgment is recorded as a
  review step with who and when.
- **Controls:** trigger (1 pose); 1 panel.

**8. See the path in context.**

- **What you do:** Home. On the route run's page press "Select route nodes" (8 accounts). Carry the
  slice, tip it toward you, push the stick right twice to "shared device, shared phone"; trigger.
- **What you see:** Tilted, "+61 accounts in one hop"; with the edge-type filter, "+23 through shared
  device or shared phone". On the trigger 31 are selected; This offers "Filter to selection, keep
  the rest faded".
- **Controls:** Home, stick steps (3 button); Select route nodes (1 panel); tilt, trigger (2 pose).

**9. Judge the intermediates.**

- **What you do:** On the route's page open the Intermediates table; read it; press Key intermediary
  for ACC-55102.
- **What you see:** One row per account between source and target: opened, risk, KYC flags, devices
  shared, routes it is on. ACC-55102: opened 22 days ago, risk 0.71, shares a device with 5 accounts
  on the routes, on 3 of 3 routes. The toggle is a review step.
- **Controls:** 2 panel.

**10. Write it up and take it out.**

- **What you do:** "Keep as set" with the suggested name "Routes ACC-48213 to ACC-10077". Note: press
  the offered sentence starter and edit one word. Export route evidence. Save.
- **What you see:** The starter is built from the run: "ACC-48213 reaches ACC-10077 in 4 transfers,
  in time order, through ACC-55102, which is on all 3 shortest routes." The evidence export is the
  hop table (each tie's type, amount and date) plus a picture of the routes, to the headset, or
  paired, to the laptop folder for the case file.
- **Controls:** about 8 panel, a few keys.

About 55 acts, 11 of them pose. Nothing needs the headset off; paired, the evidence reaches the case
file directly. The same route is also one press away from an account's page ("Route to ..."), which
check 8 compares against the tray and the joint. Path work is mostly reading and recording, so it
stays mostly panel; the plate earns its place in the lengthwise read, the edge-on hop view and the
filtered hop.

---

## 6. How it grows

Every list, form, swatch and reader is generated from graphty-element's descriptors, so new entries
arrive without new controls. The rule for the plate: any number a result produces becomes an axis
the plate can cut and a swatch it can paint by; any grouping becomes a stack the plate can slide
through; any operation that takes two things becomes a pair verb.

- **The algorithm catalog with options.** Catalog lists families (Centrality, Communities, Paths,
  Structure, Flow, Prediction, plugin families), with "Suggested for this graph" on top, which also
  feeds the swatch shelf; the command field finds any entry by plain or technical name. Each card
  shows cost, preconditions and scope chips (whole graph, selection, a kept set, a network of a
  stack, and "Per group" whenever a groups result exists). Options are a generated form. A list of
  values ("0.75, 0.85, 0.95") makes a sweep, which stacks.
- **Layouts.** Their own tab, each with its generated form and a scope chip; a live layout keeps
  running while the plate slices. "Lay out along" is itself a layout over any number field. Nodes
  are moved with the grip and pinned.
- **Styling layers.** The shelf carries the common acts (color, size, label by a field; a highlight;
  hide). Everything else is on Layers: the layers as rows (drag to reorder, eye, rename), each
  layer's page with its generated property form. "Why this look" on any node's page lists the
  layers that painted it.
- **Compare.** Stacks for networks, runs, sweeps and time windows, matched before coloring; a Compare
  table for two or more runs and a difference table; pair verbs for two sets.
- **History and recipes.** Named Undo and Redo; History with preview and Undo to here. In a full
  build: "Undo only this step" when later steps do not depend on it, and recipes -- tick steps, Save
  as recipe, every node, set and attribute used becomes an input slot labeled with its role, and
  "Run recipe from here" on a node fills the slot of its kind (the next alert's account fills
  "source").
- **Import, export and reports.** Data: every reader's options as a form, the transposed mapping list,
  a load report with fixes and review steps, joins with a match count, Add a network with merge.
  Export to the headset or the paired laptop folder in every writer's format, with a scope. In a
  full build, a picture is framed with the plate as a viewfinder.
- **Plugins.** A new algorithm, layout, reader, writer or palette registers a descriptor and appears
  in its list with a generated form; its number fields become plate axes and swatches, its group
  fields stacks, its two-input operations pair verbs. A new object type declares its verbs and
  fields (This renders them), how the plate draws it (none, a marker at a node, a region), whether
  it stacks, and whether a pair verb takes it. Nothing on the plate or the ghost changes.
- **The AI assistant** is not part of this design. In a full build it is a page on the clipboard
  whose actions are named steps; the mock does not build it.

**The honest limit.** Authoring stays on an ordinary panel: rule trees, option forms, names, notes,
tables (6 columns at a time) and reports are presses at hand-held-panel speed, and a 2,000-character
text belongs on the paired laptop. Loading and recording evidence are panel work. The plate beats a
ray where the layout means something or the question has a shape (a threshold, a route, a change
between conditions); on a graph whose layout is arbitrary it adds declutter and little else. Dense
work starts with a scale-up (the ghost then maps only what is in view), a filter or a search.

---

## 7. Checks inside the mock

Each is measured while people walk the basic journey, the proof journey, the path investigation and
the shared tests (12 scattered picks among 400 nodes and among the large count, 10,000 nodes; an
hour seated; a first session unaided), never as a test of its own.

1. **Plate share.** Over the unpaired basic journey, reported for controllers and for hands
   separately: pose acts against all acts, and pose commits against all commits. Target: at least
   half of all acts and at least a third of commits on each device (designed at 18 of 30 and 8 of 15
   with controllers, 19 of 29 with hands). Below a quarter of all acts, the design is a panel app and
   fails the shared exit criterion.
2. **Does the lap mapping make sense?** Time to the first correct pick and slices that miss their
   target, for first-time users; how often people reach into the real graph instead of the ghost;
   share of picks made by Slice where I look.
3. **Where do seated people look?** A counted A/B: the slice shown in place with the window off (the
   main condition) against the slice window on. Head pitch logged throughout, share of time on the
   graph, the plate and the clipboard, neck flexion per glance, time per pick. Decides whether the
   window stays as an option.
4. **Seated comfort over an hour.** Head pitch, controller and wrist heights, the distance of what is
   looked at (time under 50 cm), a discomfort rating every 10 minutes; controllers against hands.
5. **Hand jitter and scale.** Wrong picks in a 4 cm slice, hands against controllers, at home and
   after a 4x scale-up at the large node count; how often the depth lock engages and is released on
   purpose; picks undone within 5 seconds.
6. **Hands: the pinch on the plate.** Commits per pose change (a pinch read as something else), wrong
   stance readings per headset, plate angle change during a pinch, and on Vision Pro, panel presses
   caused by a plate pinch (target zero).
7. **Hands: tracking and collisions.** Tracking losses per minute per headset, times the hands came
   within 10 cm, and controller tracking losses with the two controllers near each other.
8. **The selection rule.** How often the tag's "pick: ..." differs from what the person then undoes;
   whether anyone loses a built selection to a pick; picks per Undo.
9. **The stances.** False triggers (a tilt, a swatch preview or a paint the person did not mean,
   measured as immediate cancels and undos), discoverability of tilt, Spread and Keep this side
   without the tour, cut-side errors (Swap presses), parks undone within 5 seconds.
10. **Pair verbs against the page.** Time and acts for a route between two far nodes by the tray and
    the joint, against "Route to ..." on a node's page.
11. **Understanding the route.** After the path investigation, the person recites each hop's tie
    type, amount and date and names the key intermediary, without the headset.
12. **Search and look to slice.** At the large node count, time from a search result, or from a look
    at a node, to a correct pick on the plate, and whether people hunt for it.
13. **Legibility.** Reading the plate's tag and the in-place labels at working distance, controllers
    and hands, at three text sizes; errors reading the readout line.
14. **Frame time.** Logged on each headset through every step people walk, never as a test of its
    own: the journeys at their own sizes (16 to 3,214 nodes), and the picking and search checks
    at the large count, 10,000 nodes. If a headset cannot hold its rate at 10,000 during those
    checks, its large count drops to 2,000 and the frame times are the reason recorded. Watched in
    particular: the slice in place and labels changing every frame during a sweep at the
    large count, the ghost, a two-layer stack, and a Spread preview. Any frame over budget is logged
    with what was on screen.
15. **One hand.** The basic journey walked with One hand on, as its own counted condition: acts, time
    and errors against two hands.
16. **Text.** Seconds for the basic journey's note and the path investigation's write-up: swipe
    keyboard, fingertip, sentence starter, paired phone.
17. **Vision Pro.** Share of people granting hand tracking, and whether the "turn it on in Settings"
    path recovers a declined grant.

---

## 8. Why it should work, and known risks

### Why it should work

- **The exact pairing was built and used.** Hinckley, Pausch, Goble and Kassell, "Passive real-world
  interface props for neurosurgical visualization" (CHI 1994): a head prop and a cutting plate,
  learned in about a minute, held low near the body.
- **Two hands with different jobs.** Guiard, "Asymmetric division of labor in human skilled bimanual
  action" (Journal of Motor Behavior, 1987): the non-dominant hand sets the frame, the dominant hand
  works inside it.
- **Slicing answers occlusion.** Elmqvist and Tsigas's taxonomy of occlusion management (IEEE TVCG 2008) lists cut planes and probes; Coffey and colleagues' Slice WIM (IEEE TVCG 2012) showed a slice
  of 3D data on a 2D surface for picking; SlicerVR (Pinter and colleagues, 2020) ships hand-held
  slicing in a headset for 3D Slicer users.
- **Refining on a flat layout beats a ray in clutter.** SQUAD (Kopper, Bacim and Bowman, IEEE 3DUI
  2011).
- **Held panels are fast when held near the body.** Lindeman, Sibert and Hahn, "Hand-held windows"
  (IEEE VR 1999); Tilt Brush's off-hand palette.
- **Ranges set by sliding along an axis.** Cordeil and colleagues, "Embodied Axes" (CHI 2020); time as
  depth in an immersive space-time cube (Wagner Filho, Stuerzlinger and Nedel, IEEE VIS 2019).
- **Smoothing hand input without lag at speed.** Casiez, Roussel and Vogel, "1 euro filter" (CHI 2012).

### Known risks, with mitigations

- **A bowed head for the whole session.** A seated graph at elbow height sits about 50 degrees below
  eye level. Mitigation: the seated graph is at lower chest height (25 to 30 degrees down, 55 to 60
  cm), the hands work low on the ghost, and the slice is shown in the graph with the readout line
  under it, so the eyes stay on the graph; check 3 measures it.
- **Panels out of reach for hands.** A pinned clipboard at 50 cm is a straight-armed poke.
  Mitigation: with hands it is a lectern at 35 to 40 cm, tilted back, at lower chest height; with
  controllers it stays at 55 cm, worked by ray.
- **The hands version is the hardest part, and the only version on Vision Pro.** A flat hand over a
  stand, low in the lap, where Quest's hand tracking is weakest. Mitigation: the plane from the back
  of the hand only, every pinch read at its start, nothing on relax, the hands kept 10 cm apart at
  stomach height, the Vision Pro gaze-pinch rules; checks 6 and 7 measure it per headset, and it is
  built and tuned after the controller version.
- **Tremor.** Smoothing always on, the depth lock on every device, the ghost mapping only what is in
  view after a scale-up; Steadiness adds a dead zone at snaps and ignores a second pinch within 0.3
  s; rotation gain defaults to 1.0 so it does not amplify a shaking hand.
- **The mapping is indirect.** Some people may not grasp that the plate cuts where it sits in the
  ghost. Mitigation: the slice lights in the real graph as the plate moves, the slice faces you by
  default so the hand sets only depth, Slice where I look skips the ghost entirely, and check 2
  measures it.
- **Stances fire by accident.** Mitigation: tilt is read only while the plate is nearly still; the
  shelf unfolds and a swatch arms only after a short dwell; nothing commits without the trigger or a
  pinch; tipping back or pulling off cancels; grip never parks.
- **Too many meanings for the stick.** The dominant stick steps through whatever the plate offers.
  Mitigation: the tag always names what a step moves through ("along route 1", "gap", "verb"); check
  9 counts wrong steps.
- **The wrist strip.** WebXR tracks the wrist, not the forearm, and a resting hand lands on it.
  Mitigation: a short rigid strip just past the wrist, keys that fire on release inside the key,
  shown only while the off hand is raised or looked at; every key is also on the top bar.
- **Stacks that mislead or stutter.** Mitigation: groups matched across runs before coloring (in
  graphty-element); a stack's budget counts nodes and edges together and is set from the frame times
  logged during the proof journey; a stack holds only what the filters show.
- **Element work.** The XR controls switch, moving the graph apart from the camera, the slice plane in
  the materials, laying out along a value, stacked copies, group matching and filtered or
  time-ordered routes do not exist in graphty-element yet. Mitigation: the first two are small
  additive settings needed before anything else works; the rest the mock stubs, and for real use
  they go in the element.
- **Build time.** All three headsets with hands do not fit in 6 weeks. Mitigation: the build order in
  section 2, controllers on Quest first; recipes, the viewfinder and "Undo only this step" are not
  built in the mock.
- **What cannot be fixed without abandoning the idea.** The core is two objects in two hands, so One
  hand is slower (about 10 acts against 6 for turning, scaling and picking); authoring, loading and
  recording stay on a panel; on Vision Pro the design needs hand-tracking permission; the plate's
  advantage depends on a layout with meaning, so on an arbitrary layout it is mostly a declutter
  tool; whether a hand-only plate is precise enough on Quest's cameras is unknown until checks 5 and
  6 run.

---

## 9. What we learn by building it

This is the only mock in the set built on the question "is anything better in a headset than on a
monitor?" The other five put their commands on a surface (a page, a card stack, a sentence, a query,
a timeline) that would also work on a screen; this one puts them in the shape of two held objects.
Building it tells us:

- Whether a held graph turned 1:1 from the lap is a better way to look around a node-link graph than
  grabbing it in the air, and whether it keeps arms low for an hour.
- Whether a flat slice on a hand-held plate, shown also in the graph itself, is the best answer to
  picking in a dense 3D graph -- the shared 12-pick test compares it head to head with the five
  other answers.
- Whether indirect, Hinckley-style work with the result drawn where the eyes already are is
  learnable by analysts in minutes.
- Whether verbs carried by how an object is held or where it is laid (tilt for neighbors, a swatch
  for paint and runs, a cut for a filter, a touch for pairs) can replace menu presses for the
  commonest acts without accidental firing -- the one test of "stances as commands" in the set.
- Whether sliding through two conditions stacked on the same positions beats two side-by-side views
  for seeing what changed between them.
- Where the panel ceiling sits: how much of real work (loading and recording are mostly panel; the
  comparison and the threshold are mostly plate) stays on a clipboard even in the most physical
  design.

---

## Review notes

### Round 1

Four reviews: the whole-design lens (`reviews/r1-prop-and-plane-1.md`), the VR interaction lens
(`-2`), Sarah walking the path investigation (`-3`), and feasibility (`-4`). Severity 3 and 4 findings
and what was done:

**Whole-design lens**

- Severity 3, the proof journey and stacks were never walked. Fixed: the data import journey is
  replaced by the proof journey, disease versus control, walked step by step (merge as a union,
  stack, slide through, per-layer degree, cut the 20 largest changes, paint interactions by
  membership from the shelf, read a rewired gene in both layers, matched communities, export). The
  path investigation stays.
- Severity 3, the seated default was a monitor in a headset. Fixed: the slice is shown in the real
  graph by default (slice nodes enlarged and labeled in place, other labels suppressed), with a
  readout line under the graph; the slice window is an option, off by default, and check 3 is a
  counted A/B with the window off as the main condition.
- Severity 3, scaling up made slicing less precise. Fixed: the ghost maps the region in view, with a
  whole-graph inset; the depth lock applies to controllers too; check 5 counts wrong picks after a
  4x scale-up at the large node count.
- Severity 3, the hands version was under-specified. Fixed: the ghost sits on a stand 15 to 20 cm in
  front of the off hand; the hands plate is a 22 x 16 cm virtual card along the back of the hand;
  with hands the clipboard is always a separate panel and the flip is gone for every device; scale
  is two pinching hands; check 7 counts hand collisions.

**VR interaction lens**

- Severity 4, the plate pose and the pinch excluded each other. Fixed: the plane comes from the
  wrist and the index and middle knuckles only; every pinch is read at its start; nothing happens
  on relax and parking is an explicit lay-in-the-tray and pinch; check 6 counts commits per pose
  change.
- Severity 3, the ghost's coupling to the off hand was undefined. Fixed: the ghost always has the
  graph's orientation, moves only while gripped and the plate is out of it, stays fixed while it is
  being sliced, and turning is ratcheted.
- Severity 3, one-handed use was not designed. Fixed: a One hand setting (ghost fixed on its stand,
  sticky turning on the stand's ring, off-hand keys on a side panel, the stick click switching Step
  and Scale), with steps 2 to 4 given one-handed and check 15 counting the one-handed journey.
- Severity 3, a node seen in the graph had no direct path to the plate. Fixed: the slice faces you
  by default so the hand sets depth only, the ghost is seen from the same direction as the graph,
  and Slice where I look (eyes on Vision Pro and, if exposed, Galaxy XR; the head's center on Quest).
- Severity 3, no zoom in the lap mapping. Fixed: the ghost maps the region in view with an inset;
  Magnify goes to 2x and 4x on the plate. Panning is moving the graph with the off grip, so the
  stick stays Step.
- Severity 3, the hands overlapped at the ghost. Fixed: the ghost is off the hand on a stand, the
  hands kept 10 cm apart with an amber warning, and check 7 counts tracking losses.
- Severity 3, no Add on a live slice with hands, and "slicing run" undefined. Fixed: a picking run is
  defined (it ends only at a selection made another way); a sticky Adding key on the wrist strip and
  the top bar.
- Severity 3, on Vision Pro a plate pick also pressed the panel. Fixed: a gaze-pinch counts only
  after 0.3 s of gaze on its target, with the dominant hand more than 10 cm outside the ghost, tray
  and shelf, no preview showing, and not within 0.5 s of a plate commit.
- Severity 3, tipping for more hops ended in the same pose as the menu roll. Fixed: the roll gesture
  is dropped; tilting arms one hop and the stick adds more; 5 degrees of hysteresis; the hop count
  is taken when the press starts.
- Severity 3, the plate's edge readout was illegible. Fixed: tags of at most 24 characters facing the
  eyes, the full sentence on the readout line, the hands card 22 x 16 cm, and a legibility check
  (13).
- Severity 3, the seated slice window covered the graph. Fixed: the window is off by default and,
  when on, sits below the graph's lower edge, tilted back.

**Sarah, path investigation**

- Severity 3, the hop view hid the ties. Fixed: a lengthwise stance shows the routes flat, one lane
  per route, every tie labeled with type, amount and date; edge-on shows everyone at that hop with
  route accounts ringed.
- Severity 3, a tie could not be picked. Fixed: the crosshair snaps to tie middles and steps to them;
  a tie's page lists its type, attributes and aggregated transfers; walked in step 7.
- Severity 3, the pair verbs had no selection mechanism. Fixed: the verbs list along the joint, the
  stick steps through them with a tick (hands slide along the joint), the readout previews with
  operands and count, the trigger commits.
- Severity 3, what a parked slice stood for was undefined. Fixed: it stands for exactly one named
  object (its selection as an unsaved set, else its crosshair's node or tie), titled with a count;
  each pair verb lists what it takes; merging networks moved to Data.
- Severity 3, a pair-touch run skipped the scope. Fixed: the preview names the scope; the route page
  has a scope chip and Re-run on all, and warns when a shorter route runs through hidden accounts.
- Severity 3, the route form could not limit edge types or time order. Fixed: an edge-type chip with
  direction per type, a date on every tie, an "in time order / out of order at hop N" line; stubbed
  in the mock and listed as graphty-element work.
- Severity 3, one hand was a plate and a ray at once. Fixed: Go to always ends the pointer and puts
  the result on the plate with a tick; while tipped, the stick cycles the edge-type filter, so step
  8 needs no clipboard during the tilt.

**Feasibility**

- Severity 3, with hands the pick pinch bent the plate and on Vision Pro also pressed the panel.
  Fixed as above: the plane from the back of the hand, the pose frozen at pinch start, nothing on
  relax, the Vision Pro gaze-pinch rules, and check 6 for wrong stance readings per headset.
- Severity 3, the two hands overlapped in the lap. Fixed as above: the ghost on a stand 15 to 20 cm
  in front of the off hand, hands kept 10 cm apart, the hands' working height at stomach and lower
  chest, tracking losses logged per headset.
- Severity 3, the build list was larger than 6 weeks. Fixed: stacks are now used by the proof
  journey; recipes, "Undo only this step" and the viewfinder are not built in the mock; a build
  order puts controllers on Quest first, then hands on Quest, then Galaxy XR and Vision Pro. All
  three headsets with hands still take longer than 6 weeks, stated in Known risks.
- Severity 3, graphty-element's own headset controls clashed with the mock's. Fixed: two additive
  element settings are listed first in the element work -- keeping tracking with the built-in XR
  controls off, and moving the graph apart from the camera.

Not changed in this file: [the mock recommendation](../xr-prototype-mocks.md)'s entry for this mock still describes the earlier version
(a severity 1 finding); that file is shared by all six mocks and is updated separately.
