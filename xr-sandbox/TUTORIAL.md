# XR sandbox: how to use it in the headset

A short guide to every page and control of the XR technique sandbox, for Meta Quest 3 (Quest
Browser) and Samsung Galaxy XR (Chrome). Read it on your phone or in the headset browser:
https://dev.ato.ms:9083/tutorial.html

Words used below:

- **Pinch** = touch index finger and thumb (hands). **Trigger** = index-finger trigger (controllers).
  Both are "select".
- **Fist** (hands) and **grip** (controllers, middle-finger button) are both "squeeze".
- **Tap** = a quick pinch or trigger, released in under about a third of a second.
- **Dominant hand** is the right hand unless you change it (gear panel, Framework tab). The **off
  hand** is the other one.
- **Ray** = the pointer line from a hand or controller. Any panel button can be pressed by aiming the
  ray and tapping, or by poking it with a fingertip.

## 1. Getting in

### Which URL

- **https://dev.ato.ms:9083** -- the live copy. Use this one.
- **https://dev.ato.ms:9052** -- a built copy whose logs, including every voice start and stop, go
  to a separate log server. Use it when trying voice so the voice log can be read afterward.

### The landing page

Across the top:

- **Session** -- a short id. Every log line carries it; quote it when reporting a problem.
- **Mode** -- VR, or Passthrough AR (your room shows behind the graph).
- **Arm the microphone (voice, dictation)** -- tick it before entering if you want voice. The browser
  asks for the microphone once. Voice cannot be switched on until this is ticked.
- **Enter VR** -- starts the session. It says "No WebXR here" in a desktop browser without WebXR.
- **Download the last save** -- appears once you have pressed Save in the headset.

On the left, three lists of links (each reloads the page):

- **Presets** -- named mixes of techniques, each with the question it is for. Presets you saved in
  the headset are listed under them ("saved in the headset").
- **One technique alone** -- each technique by itself on an empty scene.
- **Step lists** -- the current preset with a step list open (see section 4).

### The presets

| Preset                            | What is on                                                               | What to compare                                 |
| --------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------- |
| Empty                             | nothing                                                                  | switch things on yourself in the gear panel     |
| Baseline                          | hover tag, node menus (list), wrist menu, visible undo                   | the control every other preset is compared with |
| Baseline + pull to grow           | baseline + pull to grow                                                  | getting a neighborhood: pull vs. the menu       |
| Baseline + palette                | baseline + palette                                                       | color by: palette vs. menus                     |
| Baseline + Figma menus            | baseline + Figma menus                                                   | color by: desktop-style panels vs. menus        |
| Baseline + voice                  | baseline + voice                                                         | neighborhood and color by: voice vs. menus      |
| Hands first                       | gestures, pull to grow, handling, hover tag, wrist menu, visible undo    | bare hands, few panels                          |
| Palette                           | palette, physical tools, hover tag, handling, visible undo               | an off-hand palette                             |
| Figma                             | Figma menus, node menus, hover tag, text entry, visible undo             | panels in space; keyboard vs. dictation         |
| Voice                             | voice, text entry, hover tag, wrist menu, visible undo                   | speech with the chip sentence                   |
| Dense                             | dense picking (both aids), handling, hover tag, node menus, visible undo | picking in a crowded graph                      |
| Dense, hint tags only / slab only | as Dense, one aid off                                                    | each picking aid alone                          |
| Example module                    | the example module + baseline                                            | the template module                             |
| Everything                        | every technique                                                          | stress test: do they fight?                     |

The graph is the Florentine families (15 nodes) except in the Dense presets (480 random nodes).

### URL options worth knowing

Add these after `?`, joined with `&`:

- `preset=baseline` -- which preset (default: baseline).
- `on=palette,voice` / `off=hover-tag` -- add or remove techniques from the preset.
- `s.<technique>.<setting>=<value>` -- set a setting, e.g. `s.node-menus.style=ring`. The URL wins
  over anything changed in the headset.
- `steps=journey` (or `q2`, `q3`, `q4`, `q6`) -- open a step list as soon as you enter.
- `graph=dense&n=480&seed=7` -- the crowded graph, its node count (16 to 2000) and seed.
- `mode=ar` -- start in passthrough AR.
- `emulate=quest3-controllers` (also `quest3-hands`, `galaxyxr-hands`, `galaxyxr-controllers`,
  `galaxyxr-no-hands`) -- a fake headset for trying the page on a desktop. Never use it in a real
  headset.
- `still=1` -- stops the step timer from ticking (for automated checks; not useful to you).

Example: `https://dev.ato.ms:9083/?preset=baseline&on=pull-to-grow&s.node-menus.style=ring`

### Getting around once inside

- The graph appears about 75 cm ahead of you, slightly below eye level.
- **Gear button**: a small "Gear" panel low and to your left. Opens the gear panel.
- **Gear panel** (opens up-left): also opened by clicking the off-hand thumbstick (left by default),
  or by holding **both palms up for 1 second** (works with hands when nothing else does).
    - Title bar: session id and build time.
    - Under the tabs: an **Undo** button naming the last step, and **Redo**.
    - **Techniques** tab: each technique with an On/Off switch, its name (press the name to open its
      settings, then "Back") and a note. A red note says why it cannot be used ("needs controllers",
      "needs hand tracking", "unarmed: tick the microphone on the landing page", "Quest only").
    - **Framework** tab: dominant hand, frame rate, foveation, node labels, pick radius for hands and
      controllers, hover hints, audio clicks, in-headset log, what the off hand carries (palette or
      held copy), and the buttons **Recenter**, **Reset view**, **Flag**, **Steps**, **Save**, **Save
      as preset**.
    - **Input map** tab: which technique gets which press, highest priority first.
    - **Close** closes it; so does opening it again.
- **Hint chip** above each hand (when "Hover hints" is on): what a pinch or trigger, and a fist or
  grip, would do on what you are pointing at, e.g. "trigger: Node menus / Select".
- **Badge** above the hand for a second after each press: the name of the technique that took it.
  If the wrong one won, that is worth a Flag.
- **Tap a node** to select it (it highlights). **Tap empty space** to clear the selection. This
  works in every preset, even Empty.

### Resetting

- **Recenter** (gear panel or wrist menu): puts the graph and the panels in front of where you now
  look, keeping the graph's size.
- **Reset view**: puts the graph back in front of you at its original size.
- **Start over**: exit the session (headset system button) and reload the page. Graph changes are not
  kept across a reload.
- Settings changed in the headset are remembered per preset in this browser. To get the defaults
  back, open the preset with the settings in the URL, or set them back in the gear panel.

## 2. Every technique

### Hover name tag

Point at a node and see its name, value and rank before pressing anything.

1. Point any ray at a node. A small tag appears just under it, e.g. "Strozzi degree 4, #2".
2. After something colors the graph (e.g. PageRank) the tag shows that value: "Strozzi 0.088, #3".
3. Point away: the tag stays a moment (0.3 s), then hides.

Settings: which value to show, "Letter height (deg)" (default 1.2), a delay before showing, how
long it stays.
Not shown when the input has no steady pointer (it then says "needs hover").

### Node menus

Hold on a node for a menu of node actions; hold on empty space for graph actions.

Open it:

- **Hands**: point at a node, pinch and hold still for about a third of a second, then let go.
- **Controllers**: point and press **B** (right) or **Y** (left) -- it opens at once. Holding the
  trigger still also works.
- A quick tap selects instead; moving more than 1.5 cm while holding hands the press to something
  else (for example pull to grow).

List style (the default):

1. A panel with a column of buttons appears beside the node: **Select, Neighbors, Probe, Note, Hide,
   Close**.
2. Point at one and tap (or poke it).
    - Neighbors selects the node and its direct neighbors.
    - Probe shows a card above the node for 6 s: PageRank, rank, degree.
    - Note asks for text (the keyboard if Text entry is on, otherwise three quick chips: "check",
      "interesting", "?").
3. On empty space the menu is **Show PageRank, Keep top half** (filters at the median; reads
   "Remove filter" when a filter is on), **Select none**, **Note** (a note on the whole graph).
4. It closes when you pick something, press Close, open another menu, or turn your head well away.

Ring style (`s.node-menus.style=ring`, or the gear panel):

1. Keep holding the pinch, trigger or B/Y that opened it. A ring of chips appears near your hand.
2. Turn your wrist (or the controller) toward an item; it turns blue.
3. Let go to run it. Let go with no item lit to cancel.

### Wrist menu

Global actions on the off hand: Undo, Redo, Save, Settings, Steps, Recenter, Flag.

- **Hands**: hold your off hand sideways across your body, palm facing in, thumb up, and look at it.
  The menu appears beside the hand (pinky side). Palm up, palm toward your face, or looking away
  hides it.
- **Controllers**: turn the off controller so the inside of your wrist faces you, like reading a
  watch worn on the inside of the wrist. Holding it normally hides it.

Press its buttons with the **other** hand: poke with a fingertip, or ray and tap. The hand wearing
the menu cannot press it. **Undo** names the step it will undo. **Settings** opens the gear panel.

### Visible undo

Every change is named where you can see it and can be taken back.

1. Make a change (e.g. color by PageRank). A green note appears beside the hand that did it for
   2 s: "Colored by PageRank -- Undo". (It is a note, not a button.)
2. Just above the graph, one panel lists your last five steps (oldest first), then an **Undo: (the
   step)** button and **Redo**.
3. Tap Undo to undo the last step. Tap an older step to undo back to and including it.

Selecting is never a step: it is not listed and not undone. Moving the graph is not a step either.

### Pull to grow

Grab a node and pull to select its neighborhood, one ring at a time.

1. Point at a node and pinch (or pull the trigger). Start moving at once -- holding still opens the
   node menu instead.
2. Keep holding and pull your hand away, in any direction. Past 6 cm: 1 hop; every 8 cm more: one
   more hop. A chip on your hand says "1 hop: 6", "2 hops: +5"; the rest of the graph dims. Each
   step clicks (controllers also buzz).
3. Let go to select that neighborhood.
4. To cancel, bring your hand back close to where you started ("Release to cancel"), then let go.

### Palette

A five-sided prism of cards on your off hand: Analyze, Style, Filter, Selection, History.

Where it is: above the off controller, or on the back of your off hand. The front card turns to face
you. Hidden if the gear panel's "Off hand carries" is set to "held copy".

Turn to another card:

- **Controllers**: flick the off-hand thumbstick left or right. One flick = one card.
- **Hands (both headsets)**: with your dominant hand, pinch the orange rim under the cards and drag
  sideways, like turning a dial (about 12 cm per card). Let go and it snaps to a card.
- **Hands on Quest**: a thumb swipe on the off hand may also turn it (not yet tried on a headset).

Use a card: tap or poke its buttons with your dominant hand.

- **Analyze**: "Run PageRank" (one per result) reveals a result.
- **Style**: a "Color by" grid and a "Size by" grid of result names (PageRank, Degree, ...), each
  with **None**. The current choice is highlighted.
- **Filter**: "Take the sieve" (needs Physical tools on) and "Remove filter".
- **Selection**: "Grow 1 hop" (one node selected), "Hide selected", "Clear selection", "Show hidden".
- **History**: Undo (naming the step) and Redo.

Tear off a card: grab its orange top bar (ray and pinch/trigger, or grab it), drag it away and let
go -- it stays there and keeps working. Drag it back near its place on the prism to dock it.

### Figma-like menus

Desktop design-tool panels placed around you: a toolbar, a layer list, an inspector and a popover.

What you see (placed in front of you on entry and on Recenter):

- **Toolbar**, low in front: two rows of results (PageRank, Degree / Betweenness, Community), then
  Sieve, Probe and Note, with a status line.
- **Layers**, up-left: one row per thing applied (selection, color, size, filter, hidden, notes),
  each with an **x** that removes just that.
- **Inspector**, up-right: the selected node's values and ranks (read only).
- **Popover** beside the selected node: **1 hop, Hide, Note, Probe**.

All by ray-and-tap or poke:

1. Press **PageRank**: the graph is colored by PageRank. (It counts as two steps -- run, then
   color -- so undo takes two presses.)
2. Tap a node: the inspector fills in and the popover appears. **1 hop** selects its neighbors.
3. **Note** asks for text (keyboard if Text entry is on, otherwise quick chips).
4. **Sieve** / **Probe** put that tool in your dominant hand (grayed with a reason when Physical
   tools is off, as in the Figma preset).
5. Move a panel: press and hold its title bar ("drag here"), move, let go.

### Physical tools

A sieve (a filter you hold) and a probe (a pen that reads values) on a shelf to the right of the
graph.

Take a tool: aim at it and pinch/trigger (or grab it) and pull it off the shelf. One tool per hand.

Sieve:

1. While held, the nodes it would remove dim, and a chip says e.g. "PageRank 0.070: keeps 5 of 15".
2. Set the threshold with the slider under the handle, using your **other** hand (ray and tap, or
   poke). Optional setting: roll the holding wrist instead.
3. **Keep**: press the Keep button, or pinch/trigger with the holding hand. The filter is applied
   and the sieve goes back.
4. **Put back** (no change): press Put back, or make a fist / press grip with the holding hand.

Probe:

1. Touch a node with the yellow tip, or point the holding hand at a node: a card shows its name,
   degree, PageRank and rank.
2. Point at nothing: the card summarizes the current coloring (range and top three).
3. Put it back: pinch/trigger or fist/grip with the holding hand.

### Handling

Move, turn and scale the graph with your hands; optionally hold a small copy of it.

1. **One hand**: controllers -- hold the grip anywhere. Hands -- make a fist anywhere, or pinch on
   empty space inside the graph and move. The graph follows your hand (softly). Let go to leave it.
2. **Two hands**: while one hand holds, grab with the other (grip, fist, or pinch/trigger). Move the
   hands apart or together to scale (0.2x to 5x) and turn the line between them to rotate.
3. Let go of one hand to continue with the other.
4. Held copy (setting "Held copy in the off hand"): a small copy floats above the off controller, or
   above your off hand when the palm faces up. Point the dominant ray at a node in the copy and tap
   to select it in the big graph.

Moving the graph is not undoable; use Reset view.

### Gestures (hands only)

Hand poses and Quest thumb swipes bound to commands.

1. **Thumbs up**, held briefly: next coloring (PageRank, Degree, ...). A purple chip names what ran.
2. **Shaka** (thumb and pinky out): undo.
3. Horns, Vulcan salute and Point are unbound until you bind them in the gear panel (choices: next
   or previous color, undo, redo, clear selection).
4. **Quest only, dominant hand thumb microgestures**: swipe left/right = previous/next color, swipe
   forward/back = redo/undo, thumb tap = clear selection. Not available on Galaxy XR.

A pose fires once per hold; it does nothing while you pinch. Note: a thumbs up is also a fist, so in
Hands first it may also grab the graph.

Record your own pose: gear panel, Gestures, pick "Record into", press **Record pose**, then hold the
pose with both hands through the 3-2-1 countdown. It lasts for this session.

### Text entry

An in-scene keyboard that appears whenever something asks for text (a Note from node menus or the
Figma menus).

1. A keyboard appears in front of you, below eye level.
2. Type by poking keys with a fingertip, or ray and tap. Shift once = one capital, twice = caps lock.
3. **Enter** or **Done** saves; **Cancel** cancels.
4. Dictation key to the right of the keyboard:
    - **Galaxy XR** ("Dictate"): press, speak, press again ("Stop"). The words are added to the field.
    - **Quest** ("Quest keyboard"): aim at it and pinch or pull the trigger -- a poke will not work
      (it then says "Pinch me"). Quest's own keyboard opens: use its microphone key or type, then
      close it. The text is added.

Without Text entry on, a note request shows quick chips instead: "check", "interesting", "?",
"Cancel". Note: in the Voice preset nothing asks for a note, so the keyboard never appears there.

### Dense picking

Two aids for picking one node in a crowded graph: hint tags with a mini keyboard, and a slab.

Hint tags:

1. Point your dominant ray at a crowded spot and hold still a quarter second. Two-letter yellow tags
   appear on the nodes near the ray.
2. A mini keyboard appears above the graph with only the letters that can come next.
3. Tap letters (ray or poke). Tags that no longer match fade. When a whole tag is typed, that node
   is selected. **Back** removes a letter, **Clear** drops the tags.

Slab:

1. A translucent blue square floats in front of your off hand. Push it into the graph.
2. The nodes in that thin slice show as white dots on the square; the rest dims.
3. Point your dominant ray at the square: the nearest dot lights up. Tap to select that node.
4. **Pin** it with an off-hand fist or grip, or the **Pin slab** button under it; then both hands
   can pick. **Take slab** returns it to your hand. The off hand's pinch/trigger does nothing on the
   graph while it carries the slab.

### Example: color cycle (controllers only)

The template module. A chip above the graph reads "A: color by" and the next result. Press **A** on the right
controller to cycle the coloring: PageRank, Degree, Betweenness, Community. Undo names each step.

### Voice chips

Say a command, see it as a row of word chips, fix any word by poking it, then press Run. See
section 3.

## 3. Voice

Voice is off until you tick **Arm the microphone** on the landing page before entering. Presets with
voice: Baseline + voice, Voice, Everything. Prefer https://dev.ato.ms:9052 so the voice log is kept.

What you see, in front of the graph: a **Hold to talk** chip, **Clear**, a status line, then your
sentence as chips, then **Run** (green when the sentence is complete).

How to talk:

- **Galaxy XR** (the browser's own speech recognition):
    - Controllers: **hold X** on the left (off-hand) controller, speak, let go.
    - Hands: point at **Hold to talk** and hold the pinch (or poke and hold), speak, let go.
    - Words stay gray until you let go; a pause can end listening early.
- **Quest** (no speech recognition in Quest Browser; it uses Quest's keyboard microphone):
    - Hands: point at **Hold to talk** and pinch. Quest's keyboard opens.
    - Controllers: press and release **X**, then pull the trigger while aiming at the voice chips (not
      at empty space: that tap would clear your selection).
    - Press the keyboard's microphone key, speak, then close the keyboard. The words appear as chips.
- Press X again while listening to stop.

Phrases it understands (filler like "please", "the", "um" is ignored):

| Say                                          | Does                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------- |
| "color by PageRank", "color these by degree" | color the graph by a result (also paint, shade)                      |
| "size by degree"                             | size nodes by a result (also scale)                                  |
| "run PageRank", "compute betweenness"        | reveal a result                                                      |
| "select this", "select Medici"               | select (also pick, choose)                                           |
| "hide this", "hide all", "show Medici"       | hide or show nodes (also unhide)                                     |
| "grow this two hops", "expand Medici 1 hop"  | select a node and its neighborhood                                   |
| "keep PageRank at least point one"           | filter (also "filter", "above", "over", "at most", "below", "under") |
| "undo", "save"                               | undo, save                                                           |

Results: PageRank (or "page rank"), Degree, Betweenness, Community. Numbers: "two", "0.5", "zero
point five".

**"This" while pointing**: point your dominant hand at a node **as you start talking**, then say
"this", "that" or "it". If something is selected, "this"/"these" means the selection instead. If
neither, Run says "Cannot run: nothing selected or pointed at". (Color and size always apply to the
whole graph, whatever the target word says.)

Fixing a sentence:

1. Poke (or tap) any chip: a grid of choices opens, best three first. Poke the chip again to close.
2. Pick a choice: only that word changes. A red chip ending in "?" was not understood; a "?" chip is
   a missing word.
3. **Run** runs it. **Clear** empties the sentence.

Voice is never the only way: every voice command can be built without speaking. Press **Clear**,
poke the "?" chip, pick a verb, fill each "?" from its grid, press Run. And every preset that has
voice also has menus or buttons for the same actions.

## 4. Step lists and feature switches

A step list shows one task at a time on a panel to your right, with a timer. It says what to do,
never how.

- Open one: a "Step lists" link on the landing page (or `steps=` in the URL) opens it when you
  enter. In the headset: gear panel, Framework, **Steps**, or the wrist menu's **Steps**.
- Each step: do it with whatever the preset offers, then press **Done** (or **Skip**). Then rate
  how easy it was, 1 (very hard) to 7 (very easy), or **Next** to skip the rating.
- The family names and numbers change on every run, so a second run tests the technique, not your
  memory.

The lists:

- **journey** (10 steps): look around; find a family; select it and the families they married into;
  run PageRank; say which family ranks #k; color and size by PageRank; keep only families above a
  PageRank value; write a note on a family; color by degree, then undo it; save.
- **q2**: open a family's menu and choose a given item (six times).
- **q3**: select a family and everything within 2 hops (four times).
- **q4**: color by a named result (four times).
- **q6**: write a three-word note on a family.

Not every preset can do every step (for example, Baseline has no way to set an exact filter
value). Press Done anyway and say so: that gap is a finding.

Switching features: gear panel, **Techniques** tab, press **On/Off** beside a technique. Press its
name for its settings. **Save as preset** (Framework tab) stores the current mix; it appears in the
landing page's preset list after a reload.

## 5. Troubleshooting

**Nothing happens when I press.**

- Look at the badge above your hand after a press: it names the technique that took it. Check the
  hint chip for what a press would do here.
- Holding still for a third of a second turns a pinch into a menu hold; tap quickly to select.
- In the gear panel, a red note beside a technique says why it is not working (wrong input type,
  microphone not armed, Quest only).
- Controllers-only features (Example, X to talk, B/Y menus, thumbstick turns) do nothing with hands,
  and gestures do nothing with controllers.
- If the rays are lost, hold both palms up for a second to open the gear panel, then Recenter.
- Still stuck: exit the session and reload the page.

**Text is too small or too far.**

- Lean in, or use **Recenter** so panels come back in front of you.
- Handling: scale the graph up with two hands.
- Hover tag: raise "Letter height (deg)" in its settings. Text entry: "Keyboard distance". Dense
  picking: "Tag letter height (deg)".
- Turn off "Node labels" in the Framework tab if labels crowd the view.

**Voice is not heard.**

- Did you tick **Arm the microphone** before entering? Without it voice stays off (gray switch).
- On Quest, speech goes through Quest's keyboard microphone key; press it after the keyboard opens.
- The status line next to "Hold to talk" says what happened ("No speech: ...", "Speech error: ...").
- Use https://dev.ato.ms:9052 for voice: its log records every start and stop with the reason, so
  the problem can be traced afterward.
- You can always poke the chips instead.

**Reporting a problem.**

1. Right when something feels wrong, press **Flag**: click both thumbsticks together, or Flag on the
   wrist menu or gear panel (Framework tab). An id such as "F3" appears near the step panel. It
   saves the last 10 seconds of input.
2. Note the **session id** (landing page, or the gear panel title bar).
3. Report "session (id), F3: what I expected, what happened", with the preset and whether you
   used hands or controllers.
