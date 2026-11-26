# Mock: Findings Inbox

Date: 2026-10-10. One of the six VR mocks in [the mock recommendation](../xr-prototype-mocks.md). Built on Findings Inbox
([prototype-42.md](../prototypes/prototype-42.md)). Kind: a usage paradigm, with no metaphor and no AI model. Everything a
person does in this mock is real; the engines that decide which findings to post, and a few heavy
computations, are replaced by results computed ahead of time (listed in section 2).

Workflows walked: `design/designloom/workflows/W06.yaml` (with W05 and W19), `W24.yaml`; personas
`design/designloom/personas/fraud-analyst.yaml` and `genomics-cytoscape-user.yaml`.

---

## 1. The idea

**How graphty works in a headset, in this design.** graphty takes the first turn. As soon as data
loads, and again whenever a case starts on an account, a gene or any other element, graphty runs
the cheap analyses it already has and posts what it finds, one finding per card, on a stack under
the graph. The top card is the one you are reading, and while the stack is what you touched last,
the graph turns and moves to frame that card's subject: the Medici and their six marriages, the
accounts two hops from a flagged one, the 38 genes that changed partners. You file each card with
one short flick: up for "this matters", down for "not this", right for "not now". Or you hold it
still and it opens into a sheet with the full result and its options.

Anything you ask for yourself (a node you pinch, a run you choose, a route, a comparison, a set
you gather) comes back as a card too, in your own slot beside the stack. So there is one stream of
cards and one way to handle a card. After your own acts, graphty keeps going first: it posts
follow-ups to your results as new cards on the stack ("Betweenness and PageRank disagree most on
Strozzi"), so the inbox carries the whole session, not only its first minute.

Filing a card never changes the project. Only a verb does (Paint, Show only, Save as set, Note,
Apply review), and every change remembers the card that caused it, so the history reads "Paint by
betweenness, from your Betweenness card", not "Style 3". Even a judgment ("Same gene? TP53 and
Tp53") only records an answer when you flick it; the answers change the project in one named step,
Apply review, which Undo can reverse.

Work comes in cases. A case is one investigation: one alert, one question, one comparison. Start
case gives a clean view, a fresh column on the board and, when started on an element, a case pass of
findings about that element. Close case files the case's cards as one column and switches its
filters and highlights off in one named step. Next case replays the steps of the last case that you
tick, asking only for what differs (the next account id), with a preview of the whole replay first.
The board of kept cards, one column per case plus a Methods column graphty keeps for you, is the
report.

**What is new here.** Every other mock asks how to make commands cheaper to give in a headset. This
one asks for fewer commands. A headset is poor at what a desktop is good at (skimming small text,
typing, precise pointing at small targets) and good at looking at a structure while turning it.
Letting the machine go first, and frame each answer in space, moves the work toward reading one
card at a time while looking at its subject, and away from building queries. The hypothesis, as a
number, is in section 7.

**Inspiration.**

- Email triage: Mailbox (2013) made directional swipes the way to clear an inbox; Gmail, Outlook
  and Superhuman ship the same act.
- The automatic-insight tools of visual analytics: DataSite (background computations posting to a
  feed of findings), Foresight (ranked insights), Power BI's Quick Insights, Lux (always-on
  recommended charts beside a dataframe).
- The case queues of fraud, support and investigation tools, where an analyst opens a case, works
  it and closes it before taking the next.

## 2. What the mock is

### The surfaces

Full VR on a solid colored background. Everything below works seated or standing, with either hand
leading (the surfaces mirror for a left-handed person; flick directions never mirror) and with one
hand. The dominant hand is asked once on the Start card. Distances are for a seated person; the
surfaces are placed again whenever the person recenters the headset.

| Surface                      | Where                                                                                                                                                                                                                                                                             | What it holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The graph                    | A volume about 52 cm across, 100 cm out, its center at eye level (about 29 degrees across)                                                                                                                                                                                        | The graph. A frame bar 1.5 cm thick; on its dominant top corner the view controls: Whole graph, View back (the previous framing), a Follow switch, a Project look switch, + and -. Along its top edge a status line ("Showing 16 of 16 -- 9 analyses ran in 0.3 s -- Saved to headset") and the highlight line naming the card that owns the highlighting ("Highlight: Standout -- Medici"). When a project holds two networks, a network chip on the frame ("Showing: union -- tumor -- normal -- Side by side"). |
| Layer chips and filter chips | Thin strips down the volume's right side (style layers, top wins) and left side (filter steps, in order)                                                                                                                                                                          | One chip per layer or filter step, with its swatch or count ("Betweenness at least 0.098 -- 5 of 16") and an on/off switch at its end. Pinch a chip: its card opens in your slot. Hold a chip still for 300 ms until it lifts, then move it: reorder. These are the legend and the list of what is in force.                                                                                                                                                                                                       |
| The stack                    | Centered under the volume, 85 cm out, with a 1.5 degree gap below the volume's lower edge (it covers none of the graph), tilted 20 degrees toward the eyes; the card's center about 23 degrees below eye level                                                                    | Only cards graphty posts. The current card (32 x 22 cm, about 21 x 15 degrees), the next two peeking above it with their kind lines, a counter ("4 new: Standout, PageRank, Groups, Distribution -- 1 follow-up -- 1 later"). New cards always queue behind the current card, and the order is frozen while a pinch is on the stack. On the non-dominant edge only: Unfile (naming what it reverses), the filing line, and the tabs Later, Dismissed, Read and Feed.                                               |
| Your slot                    | Beside the stack on the dominant side, 3 degrees away, same distance and size                                                                                                                                                                                                     | Every card your own acts produce. Across its top, the case strip ("Case: ACC-48213 -- 14 min -- Next case -- Close case", or "No case -- Start case"). The newest card large, the previous one peeking with Compare between them, and a row "Earlier: 3". Down its outer edge (the dominant side), Undo and Redo, each naming the step.                                                                                                                                                                            |
| The dig sheet                | Opens in the place of the card it came from, its top edge where the card's was; 44 x 32 cm (about 29 x 21 degrees), so its lowest rows sit about 35 degrees down                                                                                                                  | The linked reader (below) at full length, the result's verbs, its option form folded to one line, Done. A sheet opened from a sheet stacks on it with "Done -- back to PageRank". Nothing opens beside the stack or slot, so the zone in front of you never grows sideways.                                                                                                                                                                                                                                        |
| The board                    | 30 degrees to the non-dominant side, 110 cm out, eye level                                                                                                                                                                                                                        | Kept cards in columns as short titles only: one column per case, Sets, any columns you add, and the Methods column graphty keeps. Header verbs: Bring board here (to 85 cm, in place of the stack until Done), Pull column (one column to 85 cm, in the stack's place), Export report, Draft from board, Save as recipe, Present column. Columns collapse to their header. Pinching a board card brings a copy to the front of your slot, where its verbs and dig sheet are in reach.                              |
| The hand menu                | Floats 8 to 10 cm above the off hand's palm when it turns up (Quest, Galaxy XR) and stays 3 s after the palm turns away, so the hand can drop; a Menu tab under the stack on Vision Pro or one-handed; the menu button on controllers (Y where the browser keeps the menu button) | Four buttons only: New, Find, Undo, Save. Pinched by the other hand's ray (the main path) or poked. The hand that shows the menu never pinches.                                                                                                                                                                                                                                                                                                                                                                    |
| The keyboard                 | graphty's in-scene keyboard, docked where you last placed it (presets "on the lap" and "at the desk"), the one surface meant for poking                                                                                                                                           | Letters, a digit row, a caret, completions from the data's names, ids and attribute names, and an echo line above the keys.                                                                                                                                                                                                                                                                                                                                                                                        |

### Text and target sizes

Sizes are set as angles, so they hold on every headset and at every distance. Nothing on any
surface is smaller than 0.7 degrees; the legibility check in section 7 confirms a floor of 0.6
degrees on each headset.

| Surface                                     | Distance     | Headline                                         | Body and rows                          | Smallest (source line, tags, chip counts) | Targets                                   |
| ------------------------------------------- | ------------ | ------------------------------------------------ | -------------------------------------- | ----------------------------------------- | ----------------------------------------- |
| Card, slot, dig sheet, pulled column        | 85 cm        | 1.3 degrees (1.9 cm)                             | 0.9 degrees (1.3 cm)                   | 0.7 degrees (1.0 cm)                      | 2.5 cm tall (1.7 degrees), 0.5 cm gutters |
| Volume frame: status, highlight line, chips | 100 cm       | --                                               | 0.8 degrees (1.4 cm)                   | 0.7 degrees (1.2 cm)                      | Chips 2.5 cm tall                         |
| Labels in the graph                         | about 100 cm | --                                               | 0.8 degrees at the volume's center     | --                                        | --                                        |
| Board at its place                          | 110 cm       | Card titles 1.0 degree (1.9 cm), at most 5 words | Nothing else is meant to be read there | --                                        | Whole cards                               |

### The card

Every card, machine or yours, has the same five parts, so a person learns one object, and a card
holds no more than it can show at the sizes above.

| Part             | What it holds                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kind line        | Kind and owner, and a badge when it applies: "Standout -- graphty found", "Run -- you asked", "small sample", "auto"                                                                                                                                                                                                                                                                                       |
| Headline         | At most two lines, with the values and the effect size ("Medici has 6 marriages, 2.4 times the average, 1.5 times the next family"). graphty-element supplies the facts as codes with parameters; the app writes the sentence, in plain words first ("sits between groups").                                                                                                                               |
| One reader       | One chart or one ranking, chosen by the result's kind: a value, a top five, a histogram, group bars, two columns before and after, a short table of pairs.                                                                                                                                                                                                                                                 |
| One row of verbs | Up to three verbs of the subject, each with its count ("Paint 16 families", "Show only 5", "Save as set"). Element cards: Gather, Note and the most likely verb, with More.                                                                                                                                                                                                                                |
| Filing pad       | Down the card's right edge, laid out like the flicks: Keep at the top, Dismiss at the bottom, Later on a tab sticking out of the right edge; on judgment cards Yes, No and Not now; in a Walk deck Add, Leave out and Not now. Each at least 2.5 cm tall. On Vision Pro each is 3.5 cm with 1 cm gaps, the picked target shows on press, and sliding to another target while the pinch holds retargets it. |

The source line (method, options, scope, seed, cost, "automatic" or "asked", "1 filter not
applied"), the caveat and the full reader live on the dig sheet. A value that comes from an
automatic run nobody has kept or used yet carries the "auto" badge ("PageRank 0.144 auto"), so the
person can always see which numbers are not yet part of the project.

### Kinds of card

| On the stack (graphty posts them)                                                                                                | In your slot (your acts produce them)                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Practice (first session only: three lines, the card's edges labeled with the three flicks)                                       | Element (a node or edge you pinched or found)                                                                     |
| Start (nothing loaded: samples, Recent, Files, Compare two files, Link a laptop; asks the dominant hand and motion comfort once) | Neighbors, Route, Found (Find, rules), Your selection (a gather or a region)                                      |
| Load (the load report, validation issues with fix verbs; a two-file load also reports how the files matched)                     | Run (anything you run), with a comparison strip when it re-runs a run with the same scope and data                |
| File (a new file in the paired laptop folder, proposing what to do with it)                                                      | Column (a computed column: ranked rows, a histogram, Show only, Top N, Walk)                                      |
| Overview, Standout, Groups, Distribution, Pairs, Change (time)                                                                   | Network, Comparison, Time window                                                                                  |
| Case pass findings about an element: Neighborhood, Change, New and busy, Routes to flagged                                       | Walk decks (rows, a region's nodes, or judgment cards you asked for, one card at a time) and their Review summary |
| Difference findings, once a project holds two networks                                                                           | Guess ("Find more like these")                                                                                    |
| Follow-up (graphty's next question about a result you made)                                                                      | Layer and Filter step (from a chip), Recipe, Replay, What if, Settings, Help                                      |
| Judgment (a question graphty asks: "Ring 7: a ring?")                                                                            |                                                                                                                   |
| Offer (an analysis over the automatic budget, or a plugin's; one shared Offer per load)                                          |                                                                                                                   |

When a project gains a second network, the single-network cards still unfiled fold into one card
at the bottom of the stack ("Tumor alone, normal alone: 6 findings"), so they never stand in front
of the difference findings.

### Parts folded in from other prototypes, and where each lives

| Part                                                                                                                                                                          | From                                         | Where in this mock                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| The case boundary: Start case, Next case, Close case; the case's steps replayed on Next case, asking only for its inputs                                                      | Findings Inbox's adversarial review (42)     | The case strip over your slot                                                                      |
| The review step: a person's judgment recorded as Yes, No or Not now, with "not reviewed" as its own state, replayed as questions on the next case, never a frozen list of ids | Patch Bay (32)                               | Judgment cards and Walk decks, collected as a pending review and applied in one step               |
| A pending guess with its count and its borderline cases, corrected by counter-example ("More like this", "Not this one")                                                      | Show Me (19)                                 | "Find more like these" on any selection, set or Walk; the Guess card                               |
| The Methods page: every run any kept result depends on, with options, scope and seed, replaced runs dimmed, review steps with their counts                                    | Patch Bay (32)                               | The board's Methods column                                                                         |
| The ghost that names the target and counts the effect before a verb lands                                                                                                     | Pilot and Navigator (20)                     | Every verb, on every card                                                                          |
| The linked reader: rows sorted by a column, its histogram beside them, one cut handle across both that stops in gaps and names who sits just outside                          | Paired Browser (44), Linked Views (18)       | The dig sheet's reader for rankings, distributions and tables                                      |
| The stack as the row cursor                                                                                                                                                   | Graph Browser's adversarial review (28)      | The stack itself; Walk turns any table's rows, or a region's nodes, into a deck filed card by card |
| Cited results count as used: a note, callout or label that cites an automatic value keeps the run behind it                                                                   | the studio's red team on Findings Inbox (42) | Filing, notes and the Methods column                                                               |
| New files arrive as cards proposing the join                                                                                                                                  | Paired Browser (44)                          | File cards on the stack (paired laptop folder only)                                                |
| A small hand menu (New, Find, Undo, Save) and the "which one?" list for pinches among a few nodes                                                                             | Hand Menu and Windows (24)                   | The off hand; any pinch with two to five nodes in reach                                            |
| The shared text and file service: files granted on the 2D page before entering, an optional laptop folder and phone keyboard                                                  | Paired Browser (44), Phone in Hand (39)      | The Start card's Files row, File cards, Save, Send to laptop, every text field                     |

### What is real and what is stubbed

**Real (the person's whole interaction):** the stack and slot with their order rules; flicks and the
filing pad on all three headsets; the following view; the dig sheet with the linked reader; the
option forms the journeys touch (generated from descriptors); ghosts on every verb; Paint, Show
only, Gather, Draw a region, Save as set, Note with templates and pick-to-cite, Undo, Unfile;
layer and filter chips with their switches; the time window chip and card with Step back and Step
forward; the board with its columns, Methods column, Pull column and Bring board here; the case
strip with Start, Next and Close case and the Replay card; judgment cards, Walk decks, the Review
summary and Apply review; the Guess card; Find; the hand menu; the in-scene keyboard; Save to the
headset; Picture as PNG with legend; Export report as an HTML file.

**Stubbed (an engine, never an interaction):**

- _The automatic pipeline and the case pass._ Which findings to post and in what order is computed
  ahead of time for each dataset, by running graphty's real algorithms offline and ranking the
  candidate findings with simple written rules. The headset shows them as if computed at load,
  with real values and real costs. Datasets: Florentine families, Les Miserables, a 2,000-account
  fraud extract with a planted ring and five scripted alerts, a tumor and a normal gene
  co-expression network (1,800 and 1,650 genes), and one dataset the journey writers never see,
  chosen and ranked by someone outside the mock team with the same written rules.
- _Next case's replay._ Precomputed results for the five scripted alerts; the person still ticks
  the steps, answers every input and files every card.
- _Matching and merging two networks._ The match counts and the union are precomputed; the
  judgment cards, the Review summary and Apply review are real.
- _Computed column values._ "Keep the change as a column" and the formula builder are real; the
  values are precomputed.
- _Side by side._ The second half-volume is a frozen copy of the graph, with pinches matched by
  gene id; one immersive session cannot hold two graphty-elements.
- _Flat, for print._ The 2D layout is precomputed; framing, labels and the print-size preview are
  real.
- _The guess._ "Find more like these" fits thresholds on up to three attributes in a simple script;
  real enough to be corrected, not a learning engine.
- _Draft from board._ Sentences from templates over each kept card's headline, caveat and note.
- _The pairing relay._ Run on the development machine (built once for all six mocks).

Not in the mock: PDF export (HTML instead), SVG pictures (PNG at 2x or at print resolution
instead), noticing new files in the headset's own storage, the headset's comfort settings (asked
once instead).

### What graphty-element must provide (shared with the other five mocks)

These are non-breaking additions to graphty-element, built once in the first two weeks for all six
mocks; the app would otherwise have to work around the element, which this repository forbids.

- **An object mode for XR.** Today the camera hangs off a pivot, so turning the graph moves the
  viewer and every panel, a one-hand pinch on a node drags it, and a two-hand pinch anywhere turns
  the world. The new option makes the graph a bounded object in front of a seated person: the
  camera never moves; a pinch on a node or edge is an event for the app, never a drag; turning and
  scaling happen only on the frame; "frame these nodes" moves the graph, eased over about 300 ms;
  the app's panels get input first. Every act is driven by the browser's own select events; hand
  joints are read only for the palm-up menu pose and keyboard pokes, so one pinch can never both
  file a card and pick the node behind it. About 3 to 4 person-weeks, shared.
- **A preview and emphasis channel.** One per-element color, transparency and emphasis value read
  by the node, edge, arrow and label shaders, exposed for previews and highlighting. Ghosts and the
  reading highlight use it and never rebuild meshes; real styling still lands as a style layer,
  applied on release. Shaders compile at load.
- **Candidate findings as coded facts.** For a graph, a result or an element, graphty-element
  returns candidate findings as `{ code, params }` with effect size, baseline, caveat, cost and the
  ids of the elements they are about, and reports which candidates overlap (shared subject, share
  of members). Effect sizes, "changed degree by 5 or more", identifier matching and difference
  findings are computation over the graph, so they are the element's; which candidates to show, in
  what order, how to group them and the words are the app's.
- **The transient-pointer path** for Vision Pro in the element's XR input handler.

### Devices and inputs

| Device                                   | Inputs                                                                                                                                                         | How this mock uses them                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meta Quest 3 / 3S, hands                 | 25 joints per hand, select events on pinch; no eye tracking on the web; no speech recognizer in Quest Browser; no haptics                                      | Ray from the hand with a 2-degree snap cone that prefers emphasized nodes. Flicks read at the pinch point. A click sound and the card's motion confirm each act. Text: the in-scene keyboard, or the paired laptop or phone.                                                                                                                                |
| Meta Quest 3 / 3S, controllers           | Pose, trigger, grip, thumbsticks, buttons, haptics                                                                                                             | Trigger is the pinch; a flick is read as the ray's turn. The off-hand stick files the card the dominant ray is on (full deflection and return to center; up, down, right; left does nothing); Unfile is the off hand's lower face button. The dominant stick turns and zooms the graph, or scrolls the list its ray is on. Keep pulses long, Dismiss short. |
| Samsung Galaxy XR, hands and controllers | WebXR hand input in Chrome on Android XR; controllers as gamepads                                                                                              | As on Quest. Gaze is not relied on (whether Chrome exposes it to WebXR is logged the first time a journey runs on Galaxy XR). Dictation where a recognizer runs inside the session (logged at the first note of a journey on that headset).                                                                                                                 |
| Apple Vision Pro, eyes and hands         | Safari's transient pointer (gaze picks the target at pinch start; the grip follows the hand while the pinch holds); full hand joints with permission; no hover | Look at a card, pinch with the hand resting in the lap, move it, release: the flick, read from the hand's travel. Look at a node and pinch: its card. No hover, so every ghost appears on press, which the activation rule already provides. The hand menu is the Menu tab under the stack.                                                                 |

Files reach the headset two ways: picked on graphty's 2D page before Enter VR (the picker inside an
immersive session is tried at the basic journey's load step, not relied on), or from a paired laptop folder. The project
autosaves to the headset after every change (the origin private file system, with persistent
storage requested); Save names it. Safari may clear a site's data after 7 days unused, so the
project page offers "Keep a copy" (Send to laptop when paired, or a download from the 2D page after
leaving VR).

---

## 3. The control vocabulary

Every input has one meaning. "Pinch" means a hand pinch, a controller trigger, or Vision Pro's
look-and-pinch. Thresholds below are settings, with these defaults.

| Input                                                                                                              | Its one meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Flick: pinch a card's body, move, release**                                                                      | File the card. Up "this matters" (Keep; Yes on a judgment; Add in a Walk), down "not this" (Dismiss; No; Leave out), right "not now" (Later on the stack; to the Earlier row in your slot; Not now on a judgment or Walk card, which leaves it "not reviewed"). A flick only ever files: it never runs, applies or changes anything. It acts only on the stack's current card or the slot's front card. **How it is read:** with hands and on Vision Pro, by the hand's travel at the pinch (not the card's travel at the end of a ray): 4 cm with some speed, or 8 cm at any speed. With controllers, by the ray's turn: 8 degrees with speed, or 16 at any speed. The direction is decided when the threshold is crossed; the card tilts and names the act. Coming back within 2 cm (2 degrees) of the start before release cancels. Losing tracking after the threshold still files; before it, cancels. |
| **Open: pinch a card's body and release without moving it**                                                        | The card opens into its dig sheet in its own place. The whole pinch is judged, from its start to the moment the fingers start to open (the last 100 ms before release are ignored, since opening the fingers drags the pinch point): its largest movement must stay under 1.5 cm for hands and Vision Pro, or 1.5 degrees of ray for controllers. A pinch between "still" and "flick" does nothing and says "Hold still to open -- or flick farther" on the card. There are no fingertip taps on cards.                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Pinch a peeking card**                                                                                           | Bring it to the front. The card it passes goes to Used if a verb on it committed or a result you made cites it (Used counts as kept and goes to the case's column), otherwise to Read, not filed. Moving past a card never needs a flick.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Carry: pinch a chip or a board card, hold still 300 ms until it lifts, then move**                               | Reorder a layer or a filter step, or move a kept card within or between board columns. A quick pinch on a board card instead brings a copy to the front of your slot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Press a control (a verb, a row, a chip, a tick box, a button)**                                                  | Press shows the ghost: the target named and the effect counted, drawn on the graph through the preview channel ("Paint 16 families: color and size by betweenness"), and the same one-line summary repeated on the button itself, so the eyes need not leave the hand. The target is locked at press. Release commits. A deliberate move off (the ray leaves the control by more than 2 degrees, or the finger slides off) cancels. A control never files its card.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Pinch a node or an edge in the graph**                                                                           | Open its card in your slot (or bring it to the front). Never selects, never moves the view. The snap cone is 2 degrees and prefers emphasized nodes. With two to five candidates in the cone (or within Vision Pro's gaze error), the "which one?" list opens at the pinch: those nodes magnified and named, nearest first. With six or more, they become a Walk deck in your slot, nearest first, each framed in turn: flick up for "this one", down to skip.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Pinch a node while a field is waiting for a pick**                                                               | Fill that field: a threshold ("keep everyone at least as strong as this one"), a route's target, a citation in a note. The wait is always visible: the volume's frame is outlined and reads "Pick for: threshold -- Cancel", and it ends after one pick.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Gather** (a verb on every element, group, result and selection card)                                             | Starts a gather in a Your selection card in your slot, from that card's subject or empty. The frame reads "Pick for: + gather -- Save as set -- Done". Each pinch on a node adds it, or takes it out if it is in. Rung nodes (a Neighbors card's, say) are hints, not members.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Draw a region: pinch empty space inside the volume and drag**                                                    | A box swept through the whole depth. The nodes inside go to a Your selection card, nearest first, with Save as set, Run on these and Walk. During a pick, the region's nodes become a Walk deck instead. A pinch on empty space without moving opens the graph's own card (the Overview).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **One-hand pinch-drag on the volume's frame**                                                                      | Turn the graph. Two hands on the frame: scale and turn. One-handed: the + and - on the frame bar.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Unfile** (stack frame, non-dominant edge; controllers: the off hand's lower face button; B on a paired keyboard) | Reverse the last filing act, whichever card it was, and name it ("Unfile: kept Overview"). Never touches the project. The Later, Dismissed and Read tabs bring back any older card with one pinch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Undo, Redo** (the slot's outer edge; the hand menu)                                                              | Reverse the last change to the project: a paint, a filter step, a set, a note, an applied review. Always named ("Undo Paint by PageRank"). Never touches filing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **View back** (the volume frame's dominant top corner)                                                             | Return the view to the framing before the last move. Never touches filing or the project.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **The filing line** (beside Unfile, until the next filing act)                                                     | "Kept Overview -- Move to column", or "Dismissed Distribution -- Stop showing this kind" (machine cards only; the first press arms it with the count it would hide, a second press at least half a second later confirms). The same acts are on every card's dig sheet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Chip switch**                                                                                                    | Turns a layer or filter step off or on without deleting it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Tick box in a card's corner**                                                                                    | Gather cards. With two or more ticked anywhere, a bar offers Compare, Combine, Run all, Save as recipe, Dismiss all.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Apply review** (on a Review summary card)                                                                        | The one project step that turns a pending review's answers into changes (merges, a ring confirmed). Its ghost counts every effect; Undo reverses it. Each answer can be changed on the summary before or after, with Previous and Next.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Case strip: Start case, Next case, Close case**                                                                  | Begin an investigation from a clean view and a fresh column (Start case on an element card also runs the case pass about it); open the Replay card for the next case; close the case with a tick list (below). Loading data never opens a case.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Hand menu: New, Find, Undo, Save**                                                                               | New: the whole catalog as a searchable card (every algorithm, layout, rule, add data, add network, replay a recipe, export, picture, settings, help). Find: a field with completions; one exact match opens that element's card directly. Save: names the project (it already autosaves).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Note** (on every card's row of verbs or under More)                                                              | A note field opens on the card, with templates drawn from the card's facts as chips ("6 families, 5 marriages to Medici") and a "Pick to cite" button: pinch any node and its name and key fact go into the text. The keyboard docks where you placed it. Done attaches the note to the card's subject (a node, an edge, a set, a run). One project step, "Note on Ring 7".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Text field**                                                                                                     | The keyboard docks; completions from the data; a paired laptop's or phone's keys type into the focused field.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Paired keyboard keys** (where keys reach the immersive page)                                                     | K, D, L = Keep, Dismiss, Later; B = Unfile; Enter = open; N = Note; slash = New. Never required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

**Who owns the view and the highlighting.** The card you touched last owns the highlighting, and
the frame's highlight line names it. Only two things move the view: the stack's current card, while
the stack is what you touched last (with Follow on), and a Walk deck as it steps. A card you asked
for never moves the view. When a card's subject is partly hidden by your filters, it frames what
is shown and says so ("frames 6 of 9 -- 3 hidden by your filter"). The view never moves while a
pick is waiting, a pinch is on the volume, or a form is open.

**Three reversals, kept apart.** Unfile (filing) on the stack's non-dominant edge, Undo (the
project) on the slot's dominant outer edge and the hand menu, View back (the camera) on the volume
frame's dominant top corner. They are at least 40 degrees apart from one another, and each names
what it will reverse.

---

## 4. The basic journey

Florentine families: 16 families including Pucci, 20 marriages. Quest 3, hands, seated, headset
only. This is the person's second session, so the Practice card and the questions about the
dominant hand and motion comfort are behind them. Acts are counted as in every mock: each press,
pinch, flick, drag or sweep is one act, typed keys apart; "on the graph" marks acts that land on the
graph in space, and only acts whose result is used later are counted there.

**1. Enter.**

- **What you do:** In the headset's browser, open graphty and choose Enter VR. The Start card is on
  the stack. Press the Florentine families row and release.
- **What you see:** The row's ghost reads "Open Florentine families: 16 families, 20 marriages". On
  release the 16 families float in the volume, Pucci drifting alone. The case strip reads "No case
  -- Start case". The stack's counter reads "6 new: Load, Overview, Standout, PageRank, Groups,
  Distribution"; the status line "9 analyses ran in 0.3 s". The Load card is current: "16 families,
  20 marriages, nothing to fix. 1 family has no marriages (Pucci)".
- **Controls:** press and release a row. 1 act.

**2. Get oriented.**

- **What you do:** Flick the Load card down (nothing to fix, nothing to keep). Read the Overview
  card and flick it up.
- **What you see:** The view eases to the whole graph. The Overview: "16 families, 20 marriages, 2
  pieces (15 connected, Pucci alone), 2.5 marriages per family on average". Kept, it flies to the
  board, and the filing line reads "Kept Overview -- Move to column".
- **Controls:** two flicks. 2 acts.

**3. The machine's first find: the Medici.**

- **What you do:** Read the Standout card. Press its verb "Who they married into" and release.
- **What you see:** The view settles on Medici from its open side, Medici and its marriages bright,
  the rest dimmed; the highlight line reads "Highlight: Standout -- Medici". The card: "Medici has
  6 marriages, 2.4 times the average, 1.5 times the next family", with a top five (Medici 6,
  Guadagni 4, Strozzi 4, then three at 3). While pressed, the ghost rings six families and the
  button reads "+6 families". On release a Neighbors card opens in your slot: "Medici's in-laws:
  Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni"; the six stay rung, nothing
  dimmed, and the highlight line now names the Neighbors card. The Standout card is stamped Used.
  The view does not move. Looking is not a change: Undo reads "Undo" with nothing to undo.
- **Controls:** press and release a verb. 1 act.

**4. Gather the Medici party yourself.**

- **What you do:** On the Neighbors card press Gather. In the graph, pinch Acciaiuoli, Barbadori,
  Ridolfi, Salviati and Tornabuoni, leaving out Albizzi (they married into the Medici, but led the
  rival faction). Press Save as set and release on the suggested name.
- **What you see:** The frame reads "Pick for: + gather -- Save as set -- Done". A Your selection
  card opens with Medici as its first member; each pinch adds a family and its row ("Ridolfi -- 3
  marriages"). Save as set's ghost reads "Save 6 families as a set: Medici and 5 in-laws". On
  release a set chip joins the board's Sets column and the gather ends.
- **Controls:** a verb, five pinches on the graph, a verb. 7 acts, 5 on the graph.

**5. Ask your own question: does Ridolfi sit between the great families?**

- **What you do:** Pinch Ridolfi in the graph. On its card, press "Rank everyone by: sitting between
  groups (betweenness)" and release.
- **What you see:** Ridolfi's card: "Ridolfi: 3 marriages -- Medici, Strozzi, Tornabuoni; PageRank
  0.069 auto". The verb's ghost reads "Run betweenness on the whole graph: about 0.01 s". On
  release a Run card opens in your slot and the view does not move, because you asked: "Sitting
  between groups (betweenness): Medici 0.452, Guadagni 0.221, Albizzi 0.184, Salviati 0.124,
  Ridolfi 0.098", Ridolfi's row lit. graphty then posts a follow-up to your run behind the current
  card; the counter adds "1 follow-up".
- **Controls:** a pinch on the graph, a verb. 2 acts, 1 on the graph.

**6. Answer the follow-up.**

- **What you do:** Pinch the peeking follow-up card. It frames two families; pinch Guadagni, then
  Strozzi, in the graph. Press Compare between their cards. Flick the Comparison card up.
- **What you see:** The Standout card goes to the board as Used. The follow-up: "Betweenness and
  PageRank disagree most on Strozzi: 3rd by influence, 7th by sitting between groups", with
  Guadagni and Strozzi framed. The Comparison card in your slot: "Guadagni and Strozzi: 4 marriages
  each; betweenness 0.221 against 0.089 (2.5 times); 1 shared in-law (Bischeri)". It cites the
  follow-up, so that card will go to Used too. Kept, the Comparison flies to the board.
- **Controls:** a peeking card, two pinches on the graph, Compare, a flick. 5 acts, 2 on the graph.

**7. Color and size by betweenness.**

- **What you do:** In the slot's Earlier row, pinch the Betweenness card. Press Paint and release.
- **What you see:** While pressed, the graph previews the color ramp and sizes, and the button
  reads "16 families: color and size". On release a chip "Betweenness: color and size" appears at
  the top of the layer strip with its ramp from 0 to 0.452; the status line names "Paint by
  betweenness".
- **Controls:** a card, a verb. 2 acts.

**8. Keep only the families that sit between others (filter).**

- **What you do:** Press Show only. The sheet opens at its cut handle and the frame says "Pinch the
  weakest family to keep -- or drag the handle". Pinch Ridolfi in the graph. Press Add step and
  release.
- **What you see:** The cut handle snaps to Ridolfi's value: "Betweenness at least 0.098 (Ridolfi):
  keeps 5 of 16 families, 4 of 20 marriages. Just outside: Bischeri 0.090", and the other eleven
  ghost out. On release Medici, Guadagni, Albizzi, Salviati and Ridolfi remain; a chip
  "Betweenness at least 0.098 -- 5 of 16" joins the left strip; the status line reads "Showing 5 of
  16 -- 1 filter". The kept Overview on the board reads "partly filtered".
- **Controls:** a verb, a pinch on the graph, a verb. 3 acts, 1 on the graph.

**9. Write a note on the set.**

- **What you do:** On the board, pinch the set "Medici and 5 in-laws" (a copy comes to your slot).
  Press Note. Pick the template chip "6 families, 5 marriages to Medici", type "; left out", press
  Pick to cite and pinch Albizzi, type "led the rival faction", press Done.
- **What you see:** The note field opens on the card; the keyboard docks on the lap. Pick to cite
  inserts "Albizzi (3 marriages, one to Medici)". A note marker appears on the set's outline; the
  set's board title gains a note mark. The status line names "Note on Medici and 5 in-laws".
- **Controls:** a board card, Note, a template chip, a pinch on the graph, Done; about 30 keys. 5
  acts, 1 on the graph.

**10. Undo a mistake.**

- **What you do:** Pinch the peeking PageRank card. Meaning to open it, you press its Paint and
  release before reading the ghost. Press Undo on your slot's outer edge. Then flick PageRank right.
- **What you see:** The follow-up goes to Used. The ghost had read "Paint 16 families by PageRank (5
  shown) -- over Betweenness color"; on release the five shown recolor. Undo reads "Undo Paint by PageRank"; on release
  the betweenness colors return and the PageRank values are tagged "auto" again. Flicked right,
  PageRank goes to the Later tab. Undo now reads "Undo Note on Medici and 5 in-laws": it never
  reaches into filing, and Unfile never reaches into the project.
- **Controls:** a peeking card, a verb (the mistake), Undo, a flick. 4 acts.

**11. Save.**

- **What you do:** Turn the off palm up and pinch Save with the other hand's ray. Release on the
  suggested name.
- **What you see:** The ghost reads "Save to this headset: Florentine families -- Medici and 5
  in-laws". The status line reads "Saved to headset". Reopening resumes with "2 new: Groups,
  Distribution -- 1 later", Follow paused and "Resume triage" on the stack, so the view stays where
  you open it.
- **Controls:** hand menu Save; release. 2 acts.

**Count.** 34 acts and about 30 typed keys; per step 1, 2, 1, 7, 2, 5, 2, 3, 5, 4, 2 (median 2,
worst 7). By kind: 4 filings (flicks), 2 passes by pinching a peeking card, 18 presses on cards,
menus and the board, 10 acts on the graph (29 percent), all of them used later: five gathered
families make the set the note sits on, Ridolfi's card starts the run, Guadagni and Strozzi make
the kept Comparison, Ridolfi sets the filter, Albizzi is cited in the note. The first analysis is
read after 1 act (the Load card) and the first finding about a family after 3. This walk does more
than Paired Browser's basic journey (a set, a comparison and a run of the person's own); on that
journey's task list alone this design plans about 22 acts against its 29.

---

## 5. Harder journeys

Each step has the same three lines and its count. A step that leaves the headset is marked
**Leaves the headset**, with the reason. Figures that are not counts of acts (scores, numbers of
accounts and genes) are illustrative; the mock shows whatever the precomputed runs return.

### W06 Fraud ring from a flagged account (the proof journey, with W05 routes and W19 time)

Persona: Sarah, a fraud investigator with eight years in financial crime, more than 50 alerts a
day, high time pressure and evidence that must hold up for prosecution (`fraud-analyst`). Samsung
Galaxy XR with controllers, seated, headset only. Data: a fraud extract of 2,000 accounts with
transfers (amounts and dates), "shared device" links (with the device id) and "shared phone" links;
accounts carry a created date, a risk score and a flag for known fraudsters. Her setting "Start
each load quiet" is on, so loading posts only the Load card; cases post their own cards.

**0. Before entering.** **Leaves VR (not the headset):** the extract comes from her bank's case
system, which a WebXR page cannot reach. On graphty's 2D page in the headset browser she picks
`case-48213.csv` under Choose files, then Enter VR.

**1. Open the extract and find the flagged account.**

- **What you do:** On the Start card, the file's row. Find on the hand menu, type "48213"; the one
  exact match opens. On the account's card press "Start case on ACC-48213" and release on the
  suggested name.
- **What you see:** The Load card: "2,000 accounts; 6,900 links (5,800 transfers, 820 shared
  device, 280 shared phone); nothing dropped". The account's card in her slot: "ACC-48213: created
  19 days ago; 14 transfers out in the last 3 days; shares a device with 6 accounts and a phone
  with 2; risk 0.91; flagged by the velocity rule". Start case clears the view and opens a column
  on the board; the case strip reads "Case: ACC-48213 -- 0 min". The case pass posts four cards on
  top of the stack: Neighborhood, Change, New and busy, Routes to flagged. The view frames the
  account and its neighbors.
- **Controls:** a file row, Find, 5 keys, a verb. 3 acts.

**2. Its 2-hop neighborhood, only through shared identifiers.**

- **What you do:** On the Neighborhood card's subject, the shared-device link between ACC-48213 and
  ACC-51900 stands out; pinch it in the graph. On the Neighborhood card, tick "shared device" and
  "shared phone" in its "through" row, then press Show only and release.
- **What you see:** The link's card: "Shared device D-7731: links 7 accounts, 6 of them created in
  the last 30 days; first seen 24 days ago" -- not a shared office computer. The Neighborhood
  card: "2 hops: 214 accounts through any link". Each tick updates the verb's count; Show only's
  ghost reads "2 hops through shared device or shared phone: 23 accounts; 191 ghost out". On
  release a filter chip "2 hops from ACC-48213 via shared device, shared phone -- 23" joins the
  left strip.
- **Controls:** a pinch on an edge, two ticks, a verb. 4 acts, 1 on the graph.

**3. When did the ring form? (time window)**

- **What you do:** The Change card is current: "All 23 linked to ACC-48213 within the last 30 days;
  20 within the last 14". Press its verb "Window: last 30 days". On the Time window card that opens
  in her slot, press "Step back a week" twice, then "Back to last 30 days".
- **What you see:** A filter chip "Last 30 days -- 23 of 23" joins the left strip. The Time window
  card holds a strip of link dates (a histogram) with two cut handles that stop on days, weeks and
  months, presets, Step back a week, Step forward a week and Play. Each Step back's ghost counts
  before release: "A week earlier: 11 of the 23 linked"; then "3 of 23". The ring formed within the
  last two weeks. Back to last 30 days restores the window; the steps collapse into one history
  entry.
- **Controls:** four verbs. 4 acts.

**4. New and busy accounts (select by rule).**

- **What you do:** The New and busy card is current, with its rule as chips: "created within 30
  days AND links more than 3: 9 of the 23". Press the "links" chip; the frame says "Pick for:
  threshold". Pinch ACC-51207 (5 links) in the graph. Press Show only and release.
- **What you see:** The chip's ghost after the pick: "links more than 5 (ACC-51207's): 5 of the 23;
  41 in the whole extract". On release a rule chip joins the left strip; the 5 stay at full
  strength.
- **Controls:** a chip, a pinch on the graph, a verb. 3 acts, 1 on the graph.

**5. Routes to a known fraudster.**

- **What you do:** On the Routes to flagged card ("ACC-10077 is 3 links away; ACC-55102 is 4"),
  press Route on ACC-10077's row. On the Route card set the routes stepper to 3. Pinch ACC-23011 in
  the graph, which sits on all three.
- **What you see:** The Route card in her slot lists the three routes, each with its intermediate
  accounts, and "On these 3 routes: 6 accounts; 5 of 6 created in the last 30 days". Routes draw
  through the filter, their hidden accounts dashed and marked "outside filter". ACC-23011's card:
  "on all 3 routes; created 16 days ago; uses device D-7731".
- **Controls:** a row verb, a stepper, a pinch on the graph. 3 acts, 1 on the graph.

**6. Communities on the expanded set only.**

- **What you do:** Switch the rule chip off, so the 23 show again. Draw a region around them in the
  graph. On the Your selection card press "Run on these: Groups", then on the Groups card Paint by
  group.
- **What you see:** The region's card: "23 accounts inside, nearest first". The run's ghost reads
  "Communities (Louvain) on these 23 only; seed 4417". The Groups card: "3 groups among the 23;
  group 2 holds 9, including ACC-48213, ACC-23011 and 5 of D-7731's accounts"; its source line on
  the dig sheet states the scope. Paint colors the 23 by group.
- **Controls:** a chip switch, a region on the graph, two verbs. 4 acts, 1 on the graph.

**7. Keep the ring as a named set.**

- **What you do:** Pinch ACC-48213 in the graph; on its card press "Gather its group". Pinch
  ACC-77310 to take it out and ACC-51900 to add it. Press Save as set and type "Ring 7".
- **What you see:** ACC-48213's card: "group 2 of 3 (9 accounts)". The Your selection card lists
  the 9. ACC-77310's row read "3 years old; its only link is a phone shared with ACC-77311 at the
  same address" -- a household, not the ring. ACC-51900, on the routes and on D-7731, sits in group
    1. The set: "Ring 7 -- 9 accounts; from group 2 of Louvain on 23 accounts, minus 1 and plus 1 by
       you".
- **Controls:** a pinch on the graph, a verb, two pinches on the graph, a verb; 6 keys. 5 acts, 3 on
  the graph.

**8. The evidence note, and the call.**

- **What you do:** On Ring 7's card press Note. Pick the template chip "9 accounts, 8 created in the
  last 19 days, sharing device D-7731", type ". ", press Pick to cite and pinch ACC-23011, type "links
  them to a known fraudster.", press Done. Then graphty posts a judgment card, "Ring 7: a ring?",
  which she flicks up (Yes); on the Review summary in her slot, Apply review.
- **What you see:** Pick to cite inserts "ACC-23011 (on all 3 routes to ACC-10077)". The note
  marker sits on Ring 7's outline. The judgment is pending until Apply review, whose ghost reads
  "Record: Ring 7 confirmed as a ring (1 yes)". The Methods column adds the review step with its
  time.
  **Leaves the headset:** escalating the alert happens in the case system.
- **Controls:** Note, a template chip, a pinch on the graph, Done, a flick, Apply review; about 35
  keys. 6 acts, 1 on the graph.

**9. Save the filter for reuse.**

- **What you do:** Pinch the filter strip's header and press Save filter; type "New shared-device
  accounts" (completions after 3 letters); release.
- **What you see:** The ghost lists what the saved filter holds, so nothing is silently left out:
  the 2-hop step through shared device and shared phone, "starts from: an account, asked each
  time"; the window as a rolling "last 30 days"; the rule "created within 30 days AND links more
  than 5" (switched off now, saved on).
- **Controls:** a chip, a verb; about 8 keys. 2 acts.

**10. A picture of the ring for the case file.**

- **What you do:** On Ring 7's card press Picture. Turn the graph with one hand on the frame until
  the routes untangle and scale it with both hands until the ring fills the frame. Release on Save.
- **What you see:** The picture sheet previews the frame as the PNG will hold it: the group colors,
  the note marker, the legend, the routes, never the reading highlight. Saved at 2x to the headset
  and to the case's column.
  **Leaves the headset:** attaching it to the case file needs the case system; she downloads it
  from graphty's 2D page after leaving VR.
- **Controls:** a verb, a turn and a two-hand scale on the frame, a release. 4 acts, 2 on the graph.

**11. Close the case.**

- **What you do:** Close case on the case strip; release.
- **What you see:** The tick list: "File 9 cards to the ACC-48213 column. Switch off: 3 filter
  steps, the reading highlight, Paint by group (made from this case's run). Keep: Ring 7, its note,
  the picture, the saved filter." The defaults switch off everything built from this case's results
  and keep color and size layers over the whole graph's own attributes. The Methods column lists
  the 2-hop step, the window, the rule, the routes, the Louvain run with scope and seed, the gather
  edits and the review.
- **Controls:** Close case, a release. 2 acts.

**The next alert (Next case).**

- **What you do:** Next case. On the Replay card, type "60458" in its one input and press Run
  replay. The case pass and the replayed steps post their cards; on the group they find, pinch its
  shared-phone link in the graph. Flick the judgment card "Group 1: a ring?" down (No), Apply
  review, Close case, release.
- **What you see:** The Replay card lists the last case's steps, each ticked: Find account (asks:
  account), 2 hops through shared device and shared phone, Window last 30 days, Rule new and busy
  (links more than 5), Routes to flagged (asks which, when more than one), Communities on the shown
  accounts, Gather the account's group (asks: confirm members), the judgment (asks again). Notes,
  sets and the picture are not replayed. Run replay's ghost previews the whole replay: "ACC-60458:
  2 hops through shared ids: 6 accounts; window 6; rule 0; no flagged account within 4 links; 1
  group of 6". The link's card: "Shared phone: 6 accounts, one address, oldest 9 years old" -- a
  family. The review records "Group 1 of ACC-60458: not a ring".
- **Controls:** Next case, 5 keys, Run replay, a pinch on the graph, a flick, Apply review, Close
  case, a release. 7 acts, 1 on the graph.

**Count.** The first alert: 40 acts and about 60 typed keys; per step 3, 4, 4, 3, 3, 4, 5, 6, 2, 4,
2 (median 3, worst 6, under the bar of 10 per step). By kind: 1 filing flick, 29 presses on cards,
chips and the menu, 10 acts on the graph (25 percent): the device link that justifies the
expansion, the threshold account, the route account, the region that scopes the run, the three
gather picks, the cited account and the two framing acts the picture keeps. The replayed alert: 7
acts. Paired Browser's walk of the same workflow plans about 80 acts and 7 on the graph; most of
the difference is the case pass doing the opening queries and Next case replaying them.

### W24 Condition Comparison: tumor versus normal

Persona: Dr. Priya Raman, a postdoc in a cancer genomics lab (`genomics-cytoscape-user`), a strong
biologist and not a graph theorist. Two co-expression networks from her lab's RNA-seq, tumor (1,800
genes, 9,412 edges) and normal (1,650 genes, 8,105 edges), keyed by gene symbol, each with logFC and
adjusted p-value columns and a gene description; a figure due Friday. Quest 3, hands, seated,
paired with her laptop.

**0. Before entering.** **Leaves the headset:** her files live on the laptop. On the laptop's
graphty page she chooses "Link a headset" (a six-character code typed once on the headset's Start
card) and shares the project folder; on Safari or Firefox the page offers "Share files" instead.
While linked, the laptop page holds a screen wake lock, and the headset queues anything it sends
until the link returns ("Laptop link lost -- 2 files waiting").

**1. Compare two files.**

- **What you do:** On the Start card press "Compare two files", tick the tumor and the normal file
  under Laptop files, and on the "Matched by" control release on gene_symbol. Press Start case on
  the case strip and release on the suggested name.
- **What you see:** The "Matched by" ghost counts each candidate column: "gene_symbol: 1,512 of
  1,650 match; ensembl_id: missing in normal". The case strip reads "Case: Tumor vs normal". The
  pair's Load card: "1,512 genes match exactly. 138 of normal's genes do not: 92 differ only in
  letter case, 5 look like spreadsheet dates, 41 have no match". The single-network cards fold into
  one card at the bottom of the stack; once the networks are merged, the difference findings come
  first.
- **Controls:** a row, two ticks, a release on the control, Start case. 5 acts.

**2. Review the proposed matches.**

- **What you do:** On the Load card press "Review 97 proposed matches". A Walk deck opens in her
  slot. The first card holds the whole letter-case class as a list ("TP53 / Tp53 ... 92 pairs, every
  one differing only in letter case"); she skims it and flicks it up (Yes). Then five date cards,
  one per pair; she flicks four up and "1-Mar" down (No). On the Review summary, Apply review.
- **What you see:** Each date card has a small two-column reader of the gene's neighbors in each
  file with the count they share: "SEPT7 (tumor) and 7-Sep (normal): 5 of 6 neighbors shared". The
  "1-Mar" card says "1-Mar could be MARCH1 or MARC1; shared neighbors with MARCH1: 1 of 7", so she
  answers No. A pair that is not a pure case difference can never enter the class card. The
  summary: "96 yes (92 as a class, 4 one by one), 1 no, 0 not now", each call editable. Apply
  review's ghost: "Merge 96 pairs: 1,608 of 1,650 matched; 42 stay normal only". The Methods column
  will read "Review of identifier matches: 96 yes, 1 no, 0 not reviewed", and Next case would ask
  again only for new pairs.
- **Controls:** a verb, six flicks, Apply review. 8 acts.

**3. Merge: union, with per-condition columns.**

- **What you do:** On the Load card press Union and release.
- **What you see:** The ghost: "Union: 1,842 genes (1,608 in both, 192 tumor only, 42 normal only);
  11,303 edges (6,214 in both, 3,198 tumor only, 1,891 normal only)". On release the network chip
  reads "Showing: union -- tumor -- normal -- Side by side". "Both files had logFC and padj: kept as
  logFC_tumor, logFC_normal, padj_tumor, padj_normal". Membership columns now exist for genes and
  edges (tumor only, normal only, both).
- **Controls:** a verb. 1 act.

**4. Compare the statistics.**

- **What you do:** Read the Comparison card, now current. Press "Paint edge membership" and
  release. Flick the card up.
- **What you see:** Three columns, tumor, normal, union, for genes, edges, average degree,
  components and communities ("14 groups / 11 / 12; tumor's group 3 splits in two in normal"), and
  a caveat badge: "tumor has 16 percent more edges; its average degree is 10.5 against 9.8". The
  paint's ghost previews three edge colors from a colorblind-safe palette: tumor only (orange),
  normal only (blue), both (gray); a layer chip with the three-state legend joins the right strip.
- **Controls:** a verb, a flick. 2 acts.

**5. The rewired genes, kept as a column.**

- **What you do:** Read the Rewired card. Press "Keep the change as a column"; on its option sheet
  choose "Genes in one network only: leave out", and release.
- **What you see:** The view frames the 38 genes. The card: "Among the 1,608 genes in both
  networks, 38 changed degree by 5 or more: 31 up, 7 down. STAT3 rose from 4 to 17", with the
  density caveat. The option's ghost counts both choices: "leave out (234 genes have no value)" or
  "count as 0 (14 of the top 20 would be one-network genes)". On release a Column card opens in her
  slot: "degree_change (signed) and rewiring (its size), 1,608 genes; 234 left out", with ranked
  rows, a histogram, Show only, Top N and Walk.
- **Controls:** a verb, an option released on Keep. 2 acts.

**6. Filter to the 20 largest changes.**

- **What you do:** On the Column card press Show only; the frame says "Pinch the weakest gene to
  keep -- or set Top N". Pinch CCND1 among the framed genes. Press Add step.
- **What you see:** The 38 are emphasized, so the snap cone takes CCND1 over the genes around it.
  The handle snaps: "rewiring at least 8 (CCND1): keeps 20 of 1,842; the 234 one-network genes have
  no value and are hidden. Just outside: JUN 7, CDK1 7". The filter chip "rewiring at least 8 -- 20
  of 1,842" joins the left strip.
- **Controls:** a verb, a pinch on the graph, a verb. 3 acts, 1 on the graph.

**7. Put the numbers she decides on in view.**

- **What you do:** On the Column card's "Show on each card" row, tick padj_tumor and description.
- **What you see:** The ticks are remembered for the project. Every gene card now shows them, and
  the 20 shown genes are labeled with symbol and adjusted p-value ("STAT3 -- padj 0.0004").
- **Controls:** two ticks. 2 acts.

**8. Choose the genes for the bench, and find more like them.**

- **What you do:** On the Column card press Gather. Pinch the nine genes she will take to the bench
  (STAT3, MYC, CCND1, IL6, JAK2, SOCS3, BCL2L1, MCL1, VEGFA). Press "Find more like these"; on the
  Guess card press "Not this one" on HIF1A. Save as set, named "Follow-up candidates".
- **What you see:** Each pinch adds a row to the Your selection card with its degree change,
  logFC_tumor, padj and description. The Guess card: "Genes like your 9: degree rose by at least 8
  and they sit in tumor group 3: 12 match -- your 9 and PIM1, BCL3, HIF1A. Borderline outside: JUN
  (+7), EGFR (+8 but group 5)". "Not this one" on HIF1A narrows the rule ("and logFC_tumor above
  1.2: 11 match") and names the new borderline. The set is saved as that rule, not a frozen list.
- **Controls:** a verb, nine pinches on the graph, two verbs, Save as set; about 20 keys. 13 acts,
  9 on the graph.

**9. Clear the reading filter.**

- **What you do:** Switch the "rewiring at least 8" chip off.
- **What you see:** All 1,842 genes return with the edge membership paint.
- **Controls:** a chip switch. 1 act.

**10. One network at a time, then side by side.**

- **What you do:** On the network chip pinch "normal", then "Side by side". Pinch STAT3 in the
  tumor half.
- **What you see:** "normal" draws only normal's genes in the union's positions, so a gene sits
  where it sat. Side by side draws two half-volumes, tumor and normal, from the same positions;
  turning one turns both. STAT3 is labeled and in her set, so the pinch lands on it; it is outlined
  in both halves and its card reads "STAT3: degree 17 (tumor), 4 (normal); 13 new partners in
  tumor, all in group 3".
- **Controls:** two chip choices, a pinch on the graph. 3 acts, 1 on the graph.

**11. The journal figure.**

- **What you do:** On the network chip press Picture; choose "Flat, for print" and tick "Source:
  side by side". Frame it by hand: move with one hand on the frame, scale with both. Pinch STAT3 and
  MYC to label them. Press Send to laptop.
- **What you see:** The volume shows the flat 2D layout of both halves while the picture sheet is
  open. The sheet previews the figure at print size, at one journal column (89 mm) and 300 dpi,
  with the three-state legend; only the genes she pinched are labeled; never the reading highlight.
  The laptop page's download list gains the PNG.
- **Controls:** a verb, an option, a tick, two acts on the frame, two pinches on the graph, Send.
  8 acts, 4 on the graph.

**12. Export the table and the edge list.**

- **What you do:** On the Column card press Export as table (CSV) and Send to laptop. On the network
  chip press "Export edges with membership" and Send to laptop.
- **What you see:** The table export lists its columns with tick boxes, already ticked from "Show
  on each card" plus every column computed in the case (degree_tumor, degree_normal,
  degree_change, rewiring, membership, logFC and padj for both). Each export states its scope
  ("whole union, 11,303 edges; filters off").
- **Controls:** four verbs. 4 acts.

**13. Close the case and send the methods.**

- **What you do:** Close case; release; then "Send methods to laptop (Markdown)".
- **What you see:** "Close Tumor vs normal: file 10 cards to its column. Switch off: the reading
  highlight. Keep on: edge membership (the figure used it). Keep: degree_change, rewiring, the set
  Follow-up candidates." The Methods column lists the review of matches, the union, both degree
  runs, the column with its "leave out" choice, the filter, the guess's rule and the figure's
  source, each with scope and seed. The Markdown copy arrives on the laptop for her methods
  section.
- **Controls:** Close case, a release, a verb. 3 acts.

**After the headset. Leaves the headset:** Priya places the figure in her manuscript on the
laptop. Writing the paper is laptop work; graphty's part ends at a print-ready figure with its
legend, a table with the columns she chose and a methods record she can paste.

**Count.** 55 acts and about 30 typed keys; per step 5, 8, 1, 2, 2, 3, 2, 13, 1, 3, 8, 4, 3 (median 3,
worst 13, the bench picks). By kind: 7 filing flicks, 33 presses on cards, chips and controls, 15 acts on
the graph (27 percent): the cutoff gene, the nine bench genes, STAT3 in the side-by-side view, and
the four acts that frame and label the figure.

---

## 6. How it grows

Every list, form, reader and card face is generated from graphty-element's descriptors and the
result's field kind, so a new entry appears complete with no new control and no VR code.

- **The algorithm catalog with options.** New lists every algorithm grouped by family, with search
  by plain or technical name ("Katz" finds "Influence at a distance"), recents and suggestions, so
  a pick is about three acts at 29 algorithms or 60. Element cards offer "Rank everyone by" with
  the catalog's per-node measures. The option form on the dig sheet is generated: numbers with
  detents and a digit pad, logarithmic tolerances as exponent and mantissa steppers, attribute
  pickers, node options filled by a pick on the graph, node lists from a set, enumerations,
  toggles, seed, scope, Advanced folded, Reset. Run as new opens a sibling with a comparison strip;
  Sweep runs a range or five seeds as one card with a sub-card per value.
- **Follow-ups.** After any result the person makes, graphty asks graphty-element for candidate
  findings about it (a disagreement with another ranking, a group that splits, a column worth
  keeping) and posts the best as follow-up cards on the stack. They are filed like any card; a
  plugin's results get them too.
- **Layouts.** In New and on the Overview card's dig sheet, with the generated form (ForceAtlas2's
  13 options fold to four with Advanced). A live layout posts a Run card with Stop; Keep records
  which layout drew each figure.
- **Styling layers.** Paint on any result applies its suggested style as a layer. A chip's Layer
  card has the generated layer page (40+ style properties, 18 palettes, scales, diverging center,
  missing color), Why this look (the layers that painted a node, top first), rename, switch off,
  delete with its ghost. Style this, Fade others and Hide others on any set make layers that show
  in the legend. Presets on the layer strip's header chip.
- **Compare.** Re-runs carry a strip; ticking any two cards gives Compare (rank changes, NMI and
  adjusted Rand for partitions, the spread across seeds); two networks give difference findings,
  the Comparison card, the network switch and Side by side; What if this were gone gives a before
  and after card with its own Reset.
- **Time.** Any data with dates gets the Time window card: two cut handles, presets, Step back and
  forward by the window's size, Play at 0.5x to 4x, and change points marked on the strip. Metrics
  over time post as Change cards.
- **History and recipes.** The Feed lists every filing and every change, each change under the card
  that caused it, with Undo to here (with a preview of the state). A case is a recipe in the making:
  Next case replays its ticked steps; Save as recipe (from a case column or ticked Feed entries)
  turns every id and pick into an input asked on replay, and every judgment into a review step.
- **Import, export and reports.** Start card and File cards for opening (files granted on the 2D
  page, the paired laptop folder when linked, 11 formats, the format and column mapping asked as
  cards when ambiguous); Add data and Add network from New. Export from New or any card (9 formats,
  each writer's own generated options, scope stated). The board is the report: columns are
  sections, kept cards their figures and values, notes their text, the Methods column the methods.
  Draft from board, Present column (Next and Previous, never filing), HTML and Markdown.
- **Plugins.** Each of graphty-element's six registration calls lands in a place that already
  exists: an algorithm in New by its family, offered (never auto-run until ticked in Settings) on
  the one shared Offer card when the data has the inputs its descriptor names, its results as cards
  whose reader, headline and verbs come from field-kind rules (a number per node is a Standout and a
  histogram; a group per node is a Groups card; a table of pairs is a Pairs card); a layout in the
  layout list; a reader's load report as Load cards; a writer in Export; a palette in every picker.
  A new object kind needs only a declared card face (key values, verbs, framing); it gets filing,
  open, Note, a board place and a Feed entry.

**The honest limit.** Triage helps when there is something to file. Authoring work is not triage:
a nested compound rule built from nothing, a merge with a conflict rule per attribute, a 13-option
layout tuned by hand, a 2,000-character report written from nothing. These run on dig sheets and
generated forms, about as fast as any panel in a headset and no faster. An expert who already knows
exactly what to run gains less (Quiet start skips the automatic pass, and the slot keeps their own
work off the stack). On large graphs the quality of the inbox is the quality of its ranking, which
the blind dataset tests only a little.

---

## 7. Checks inside the mock

Each check is a measurement taken while people do the journeys above, never a separate test.

| Question                                                | Measured during                                                                                                                                                                          | How, and the bar                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fewer commands: does the machine going first save acts? | The basic journey and the fraud journey, against Paired Browser on the same task lists                                                                                                   | Hypothesis as a number: at most 80 percent of Paired Browser's acts on the same tasks, filings included, and the first analysis read within 3 acts. Planned: about 22 against 29 on the basic task list; 40 against about 80 on the fraud alert. If filings eat the saving (within 5 percent of Paired Browser), the idea fails on its own terms. Acts are logged by kind: filings, passes, presses, graph acts, keys. |
| Does the inbox carry the work after the first pass?     | Every journey, after the load or case pass is filed                                                                                                                                      | Share of acts that are filings and card verbs on cards graphty posted (follow-ups, case pass, difference findings), against the share of acts spent on pages and forms; compared with Paired Browser's share on the same steps. If it falls to Paired Browser's, this design has become a browser with an inbox in front.                                                                                              |
| Is the graph in space used?                             | Every journey                                                                                                                                                                            | Acts on the graph whose result is used later, against all acts. Bar: at least 1 in 4 in every journey (planned 29, 25 and 27 percent). Also logged: share of time the eyes or ray rest on the volume.                                                                                                                                                                                                                  |
| Can open and flick be told apart?                       | Every journey, 30 minutes or more per person                                                                                                                                             | Wrong filings (Unfile within 10 s, or a pile restore), "Hold still" refusals, missed flicks ("flick farther"), tracking loss by flick direction, per device and input (Quest hands, Quest controllers, Galaxy XR hands and controllers, Vision Pro). Bar: fewer than 1 wrong filing in 50 and fewer than 1 refusal in 20. The thresholds are settings; the check finds their best values per input.                    |
| Does the following view orient or disorient?            | Basic steps 2 to 6; every fraud alert                                                                                                                                                    | Time from a card becoming current to the person's next act; View back and Follow-off rates; comfort ratings after 30 minutes.                                                                                                                                                                                                                                                                                          |
| Does the case boundary pay for itself?                  | Five scripted fraud alerts in a row                                                                                                                                                      | Acts per alert after the first (bar: no step above 10 acts, about 7 for a replayed alert); leftover-state errors, meaning any filter, highlight or paint from one alert active in the next (bar: zero).                                                                                                                                                                                                                |
| Can a published number lose its run?                    | The fraud journey steps 8 to 11; W24 steps 11 to 13                                                                                                                                      | Audit every exported value: any value whose run is missing from Methods, or discarded by a Dismiss, is a failure (bar: zero).                                                                                                                                                                                                                                                                                          |
| Do people read the ghost before releasing?              | Every verb                                                                                                                                                                               | Releases with the ghost on screen less than 300 ms, and how often Undo follows within 10 s; whether eyes go to the graph or stay on the button summary.                                                                                                                                                                                                                                                                |
| Are the three reversals kept apart?                     | Basic step 10; any mistake                                                                                                                                                               | Wrong reversal control used. Bar: under 1 in 20 after the first session.                                                                                                                                                                                                                                                                                                                                               |
| Who sets the agenda?                                    | Every journey, and the blind dataset                                                                                                                                                     | Share of kept cards from the stack against your slot; time to the first New; Dismiss-all rates; whether people find a planted finding the rules skip. On the blind dataset: keeps, dismissals and time to the first New, against the hand-ranked datasets.                                                                                                                                                             |
| Can the text be read?                                   | Setup, then every journey                                                                                                                                                                | Each surface's smallest text measured in degrees on each headset (floor 0.6), and a reading test at that size; misreads of card values logged.                                                                                                                                                                                                                                                                         |
| Eyes, neck and arms over an hour                        | An hour seated                                                                                                                                                                           | Head pitch logged continuously (bar: card center at or above 25 degrees down for most of the hour); hand height logged; ratings for eye strain, neck, shoulder and arm; a condition with controllers resting in the lap.                                                                                                                                                                                               |
| Dense picking: does framing replace pointing?           | The shared test: 12 scattered nodes among 400 and among 10,000, on Quest 3, hands and controllers                                                                                        | This design's answer: emphasized nodes win the snap cone, "which one?" for two to five candidates, and a region or a crowded pinch becomes a Walk deck framed nearest first. Time and wrong picks, against the other five mocks.                                                                                                                                                                                       |
| Frame budget                                            | Every journey step on every headset, logged throughout; in particular the steps that change emphasis or draw two networks                                                                | A ghost appears within 2 frames at 2,000 nodes with no frame over 30 ms on Quest 3; emphasis change for 10,000 nodes and 30,000 edges in one frame or less; the view's ease and the network switch at the 1,842-gene union with every surface open, holding the refresh rate.                                                                                                                                          |
| Text entry                                              | Notes in every journey                                                                                                                                                                   | Acts and time per note with templates and pick-to-cite against typed; where people place the keyboard; paired against unpaired.                                                                                                                                                                                                                                                                                        |
| First session unaided                                   | Les Miserables, a newcomer                                                                                                                                                               | Time to the first analysis read (bar: under 5 minutes); whether the Practice card teaches the three flicks; hesitations.                                                                                                                                                                                                                                                                                               |
| The hand menu and Quest's own palm gesture              | Every Quest session with hands                                                                                                                                                           | Count of Quest system-menu openings; menu misses.                                                                                                                                                                                                                                                                                                                                                                      |
| Platform unknowns                                       | The journey step that first needs each one: loading data (the file picker), Save and Send to laptop (downloads), every note (keyboard and speech), every session (gaze, the menu button) | A file picker inside an immersive session; downloads inside a session on Vision Pro; whether a paired keyboard's keys reach the immersive page; speech recognition inside a session on Galaxy XR and Vision Pro; Galaxy XR gaze in WebXR; whether Quest Browser passes the left menu button to the page.                                                                                                               |

## Building it in six weeks

Three people. Weeks 1 and 2: the element's object mode and preview channel (shared with the other
mocks), the panel toolkit (Babylon GUI in the app with one texture per surface, live numbers as
signed-distance-field text, solid card backs, the board as one texture redrawn only on change, WebXR
layers for the current card where Quest and Galaxy XR support them), and the stack's flick and open
built well enough to walk a journey. Weeks 3 and 4: the basic journey; from its first walk on each
headset the flick, legibility and frame checks are logged while people do it, never as tests of
their own. Weeks 5 and
6: the fraud journey with five alerts, the proof this design was chosen for. W24 is walked on
precomputed states for its engines; if the build runs long, it is cut before the fraud journey is.

---

## 8. Why it should work, and known risks

### Why it should work

- **Proactive analysis helps people find more.** In DataSite (Cui, Badam, Yalcin and Elmqvist,
  Information Visualization 2019), background computations posted to a feed led people to cover
  more of the data and report more findings than a manual tool, and they used the feed as a
  starting point, not a replacement. Voyager 2 (Wongsuphasawat and colleagues, CHI 2017) found that
  suggested views broadened what analysts examined. Foresight (Demiralp and colleagues, VLDB 2017),
  Quick Insights (Ding and colleagues, SIGMOD 2019) and Lux (Lee and colleagues, VLDB 2022) show
  ranked automatic insights are practical.
- **Swipe triage is one of the most practiced gestures there is,** and three directions with one
  meaning each are a marking menu of depth one, which Kurtenbach and Buxton (1993) showed people
  learn to perform without looking. The pad laid out like the flicks lets people learn the
  directions from the buttons.
- **Mixed-initiative design** (Horvitz, CHI 1999): an automatic service should be easy to dismiss,
  show why it acted, and defer to the person on costly actions. Every card says why it is there;
  nothing it finds changes the project until a person presses a verb; even a judgment waits for
  Apply review.
- **Feedforward before commit.** Showing what an act will do before it lands (Vermeulen and
  colleagues, "Crossing the bridge over Norman's gulf of execution", CHI 2013) is what the ghost on
  every verb does, with the target named.
- **Programming by example** with correction by counter-example (the tradition of Lieberman's "Your
  Wish Is My Command", 2001) lets a person define "genes like these" without writing a rule.
- **Case queues** are how investigators already work: open a case, work it, close it, take the
  next. The case boundary and the case pass give VR work the same unit.
- **The studio's own evidence.** Findings Inbox's last-round scores: coverage 4.5 and extensibility
  4.5 on a 1 to 5 scale, ergonomics 4, no fatal flaw in any lens; the reviews named the triage
  flick with its twin buttons, the descriptor-driven card chain, and the separation of filing from
  project changes as the strongest things to keep. Its lowest score, efficiency (2), came from the
  per-alert cleanup the case boundary removes.

### Known risks and mitigations

| Risk                                                                                                               | Mitigation                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The machine sets the agenda.** People analyze only what was posted.                                              | New is one press away on the hand menu; element cards offer "Rank everyone by"; Quiet start; the Methods column marks every run automatic or asked; the agenda check plants a finding the rules skip and adds a blind dataset. The basic journey makes the person find a family and run a measure the inbox never posted.                                                 |
| **After the first pass it may still feel like pages.** Dig sheets, forms and the Column card are pages.            | Follow-ups post as cards, the case pass and the difference findings carry the opening queries, and columns are kept from cards ("Keep the change as a column"); the check comparing the inbox's share of acts with Paired Browser's decides whether this holds. If it does not, the design's difference from Paired Browser is the first minute only, which is a finding. |
| **False discoveries.** Many automatic analyses invite reading noise as signal (Zgraggen and colleagues, CHI 2018). | Every card states an effect size against a baseline and a caveat badge for small samples; difference findings state their scope and density caveat; the count of automatic analyses is on the status line and in Methods; at most 10 automatic cards per load.                                                                                                            |
| **Overload on large graphs.**                                                                                      | The cap, overlapping findings grouped into one card with sub-cards (overlap reported by graphty-element), the cost budget with Offer cards above it, Stop showing this kind, single-network cards folded once two networks exist.                                                                                                                                         |
| **Disorienting view moves.**                                                                                       | The graph eases to its new framing over about 300 ms (a fade through the background color where the person asked for less motion); the panels never move; the view follows only while the stack is what you touched last; never during a pick, a pinch on the volume or a form; View back; Follow paused after a reopen until Resume triage.                              |
| **Open and flick misread.**                                                                                        | The whole pinch is judged with the release drift ignored, the limits differ per input and are settings, a pinch in between does nothing and says so, a flick can be undone by Unfile, and the pad needs no gesture. The flick check measures refusals and wrong filings per device.                                                                                       |
| **Three reversal controls.** People reach for the wrong one.                                                       | Each has its own word and place, at least 40 degrees apart; each names what it will reverse; the Feed shows filings and changes in one list.                                                                                                                                                                                                                              |
| **A cited number loses its run.**                                                                                  | Citing a value in a note, callout or label keeps its run; "auto" badges show what is not yet kept; Methods lists every run anything depends on; Close case lists cited results; exports list provisional results unticked.                                                                                                                                                |
| **One case's state shapes the next.**                                                                              | Everything made in a case is tagged with it; Close case switches off what was built from the case's results by default, with a tick list; the default run scope is printed.                                                                                                                                                                                               |
| **Text entry.**                                                                                                    | Templates from the card's facts, pick-to-cite, suggested names, completions, Draft from board; the keyboard placed where each person wants it; paired laptop or phone keys. A paragraph written from nothing is still slow, and the design says so.                                                                                                                       |
| **Neck, eyes and arms.**                                                                                           | Cards at 85 cm, nearer the headsets' focus, with the card's center about 23 degrees down; no fingertip taps; the ray from a resting hand; the hour-long check logs pitch, hand height and ratings, with a controllers-in-lap condition.                                                                                                                                   |
| **The hand menu and Meta's palm-up gesture.**                                                                      | The menu floats above the palm and stays 3 s after it turns away; the other hand's ray is the main path; the menu button on controllers and the Menu tab on Vision Pro avoid it; system-menu openings are counted.                                                                                                                                                        |
| **graphty-element's XR model is the reverse of this design's.**                                                    | The object mode, the preview channel and candidate findings are non-breaking additions built first and shared by all six mocks; until they exist the mock cannot run.                                                                                                                                                                                                     |
| **The build runs long.**                                                                                           | Engines are precomputed wherever the person's interaction stays whole; only the forms the journeys touch are generated; W24 is cut before the fraud journey.                                                                                                                                                                                                              |
| **The laptop link is new infrastructure.**                                                                         | The basic and fraud journeys are headset-only; pairing is the shared service built once and stubbed on the development machine; a sleeping laptop queues sends instead of losing them.                                                                                                                                                                                    |
| **Ranking quality is barely tested.**                                                                              | The blind dataset gives one honest data point; how well the rules rank on unseen data at scale is a separate question for graphty's 2D page, where it is cheaper to answer.                                                                                                                                                                                               |

---

## 9. What we learn by building it

- **Whether "fewer commands" beats "cheaper commands" in a headset.** The other five mocks make
  giving a command cheaper. Only this one removes commands by letting the machine go first, at load
  and at every case. The act counts against Paired Browser, the first-analysis time and the share of
  machine cards kept answer it with numbers.
- **Whether the machine can do the navigating.** No other mock moves the view for the person. This
  one tells us whether a view that frames each card's subject replaces steering, and whether it
  orients or sickens, which matters for every design that wants to show the person something.
- **Whether a headset can be a reading device for analysis.** Most of this design is reading a
  card while looking at its subject. Its measurements of legibility, reading time, pitch and
  comfort over an hour are the best evidence the set will produce on whether VR analysis can be
  mostly reading.
- **Whether one object, the card, can carry all of graphty.** Machine findings, your own results,
  layers, filter steps, judgments, recipes and report sections are all cards with the same filing,
  open and Note. If people stop asking "where is X", one generated card surface can grow with every
  plugin; if not, we learn which objects refuse to be cards.
- **Whether per-case work in VR is fast enough for daily use.** Only this mock has a case boundary
  with a case pass and replay; its five-alert measurement says whether a headset can serve a queue
  of fifty alerts a day, or only the one alert in twenty that is a real ring.
- **Whether judgments and citations can be recorded without effort.** A judgment is the same flick
  as filing a finding, applied in one undoable step, and citing a number keeps its run. If every
  exported value traces to its run and every call is in the methods with no extra acts, that
  record-keeping can move into graphty's 2D app and graphty-element regardless of which VR design
  wins.

---

## Review notes

### Round 1

Four reviews: structure and fit with the owner's intent (`reviews/r1-findings-inbox-1.md`), the VR
interaction lens (`-2`), Dr. Priya Raman walking W24 (`-3`), and build feasibility (`-4`). No
severity 4. Severity 3 findings and what was done:

**Structure and fit**

- The proof journey was never walked. Fixed: the briefing journey is replaced by the fraud ring
  from ACC-48213 (journey 2 of the functionality inventory (a studio working file, not committed)), walked step by step with act counts per
  step, then Close case and Next case on a second alert (ACC-60458) showing what is replayed and
  what is asked; every step is under the 10-act bar.
- The count of acts on the graph was padded. Fixed: the decorative turn and the Pucci, Guadagni and
  Strozzi pinches are gone; the in-laws are gathered on the graph into a set the note uses, and
  Guadagni and Strozzi are pinched for a Compare that is kept. Recounted with only acts whose result
  is used later: 10 of 34 (29 percent).
- Dense picking fell back to the machine's guess. Fixed: Draw a region, and any pinch with six or
  more candidates, gives a Walk deck framed nearest first (up picks or adds, down skips); "which
  one?" is kept only for two to five candidates; emphasized nodes win the snap cone.
- The basic journey handed its own steps to the machine. Fixed: the person finds Ridolfi, which no
  card posted, and runs betweenness from its card; the result lands in the slot and the view does
  not move. PageRank stays on the stack, unused but for the undo step.
- Judgment flicks changed the project and neither reversal reached them. Fixed: judgments collect
  as a pending review; Apply review is the one project step, Undo reverses it, and calls stay
  editable on the Review summary. Run on the Offer card is a verb; Play column is now Present
  column, which never files.
- After the first pass the design became Paired Browser. Fixed in part by design and measured:
  follow-ups post as cards on the stack (the basic journey's Strozzi follow-up), "Keep the change as
  a column" replaces the hand-built score in W24, and the case pass drives the fraud journey. A
  check compares the inbox's share of acts after the first pass with Paired Browser's; the residual
  risk is in Known risks.

**VR interaction**

- Opening and filing could not be told apart. Fixed: the whole pinch is judged with the last 100 ms
  before release ignored, limits per input (1.5 cm hands and Vision Pro, 1.5 degrees of ray for
  controllers), file at 4 cm with speed or 8 cm at any speed (8 or 16 degrees of ray), the five-card
  exception dropped, limits made settings and refusals measured.
- No rule for which card owns the view and the highlighting. Fixed: the card touched last owns the
  highlighting and the frame names it; only the stack (while touched last) and Walk decks move the
  view; a card frames what is shown and says how much is hidden.
- The ghost was drawn away from the held control. Fixed: the target locks on press, only a
  deliberate move of more than 2 degrees cancels, and the ghost's one-line summary repeats on the
  button.
- Each card held too much to read. Fixed: a card is a kind line, a headline of at most two lines,
  one reader, one row of verbs and the pad; the source line moved to the dig sheet; text sizes are
  set in degrees for every surface, with a legibility check.
- 55 cm was too close for the eyes and too far for the arm. Fixed: stack, slot and dig sheet at 85
  cm at about the same angular size, the graph at 100 cm; fingertip taps on cards dropped; eye
  strain and arm ratings added to the hour-long check.
- The flick had too many meanings. Fixed: a flick only ever files (up "this matters", down "not
  this", right "not now"); applying answers and running analyses are verbs with ghosts; no
  rehearsal flick removes a card.
- The graph was scenery in the harder journeys. Fixed: the 1 in 4 bar applies to every journey;
  W24 picks the cutoff gene, the bench genes, STAT3 in the side-by-side view and the figure's
  framing and labels on the graph (27 percent); the fraud journey reaches 25 percent.
- Next case had no preview and no defined extent. Fixed: the Replay card lists each step with a
  tick box and the inputs it will ask for, and Run replay previews the whole replay.
- No rule for cards that arrive mid-work. Fixed: new cards always queue behind the current card,
  and the stack's order is frozen while a pinch is on it.

**Dr. Priya Raman walking W24**

- Cards about tumor alone blocked the comparison. Fixed: "Compare two files" on the Start card
  loads both, asks for the key once, and makes the difference findings the automatic pass;
  single-network cards fold into one card at the bottom; the stack order is stated.
- The rewiring score mishandled genes missing from one network. Fixed: the card states its scope
  (the 1,608 in both) and the density caveat; the column's option sheet offers "leave out" or "count
  as 0" with a ghost counting the effect on the top 20; the signed change is kept beside its size.
- The steps from score to filter did not connect and the score was built twice. Fixed: "Keep the
  change as a column" on the Rewired card opens a Column card with ranked rows, a histogram, Show
  only, Top N and Walk.
- The identifier review could not be trusted. Fixed: the counts add up (1,512 exact, 92 case, 5
  dates, 41 no match; 96 yes and 1 no give 1,608 matched and 42 normal only); the class card holds
  only pure case differences and lists every pair; "1-Mar" is a dated name that could be two genes,
  shown with its shared neighbors.
- The picture was not a publication figure. Fixed: "Flat, for print" from a 2D layout at one
  journal column and 300 dpi, previewed at print size, with the side-by-side view as a source.

**Build feasibility**

- Too much was listed as real for six weeks. Fixed: the union and matching, the computed column's
  values, Side by side and the flat layout are precomputed while every act stays real; PDF and SVG
  are dropped for HTML and PNG; only the forms the journeys touch are generated; a week plan is
  given, with W24 cut first if the build runs long.
- graphty-element's XR model was the reverse of the mock's. Fixed: a non-breaking object mode is
  specified (the graph a bounded object, the camera fixed, a pinch an event, framing moves the
  graph, panels get input first), built first and shared by all six mocks.
- There was no panel or text toolkit and nothing checked legibility. Fixed: the toolkit is named and
  scheduled for weeks 1 and 2, and the legibility check is measured at setup and in every journey.
- The preview would redraw the whole graph twice. Fixed: ghosts and highlights use a per-element
  preview and emphasis channel exposed by graphty-element; real styling still lands as a style layer
  on release; frame time is logged during the steps that change emphasis.
- Losing tracking during a flick was contradictory. Fixed: the direction is decided when the
  threshold is crossed; a loss after that files, before it cancels; losses are logged by direction
  and headset.
- Opening a card fought the drift of a releasing pinch. Fixed with the same rule as the
  open-or-file finding above.

Severity 1 and 2 findings applied: three flick meanings; "read, not filed" and acts counted by kind;
the time window as a filter step with handles and Step back and forward; Gather and Draw a region
defined; candidate findings computed by graphty-element; a blind dataset; carry by holding still;
controller filing by the ray's card only and Unfile on a face button; a gap under the volume; the
"which one?" list capped; Bring board here and Pull column; Close case tick lists; an editable Review
summary with Previous; the hand menu floating above the palm; arm and eye ratings; the gene-match
counts; a Practice card; Vision Pro pad retargeting; asking once for hand and motion comfort;
controller flicks by ray angle; files only from the 2D page or the laptop folder; storage and the
7-day limit; PNG instead of SVG; Side by side stubbed; an eased view; select events for every act;
board titles only; the network switch before Side by side; no case on load; notes attached to graph
objects; workflow and persona pointers; the in-law hop count (no longer used); a right
flick in the slot moves the card to Earlier; a peeking card comes forward when pinched; key
columns, gene counts by membership and "Show on each card"; a laptop wake lock and queued sends;
methods sent as Markdown and autosave stated; View back on the dominant side, with separations
stated as angles; recentering places every surface again.

Open severity 3 and 4 findings after round 1: none. The residual risk that the design reads as
pages after the first pass is measured, not assumed away.
