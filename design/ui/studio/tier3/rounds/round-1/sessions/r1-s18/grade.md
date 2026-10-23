Grade: SD
False done: no
Wrong turns: 3
Route: folder
Token: not touched, the folder's Fill Color field showed "<<Layer>>" with the group swatches and was left alone; every group kept its color

# Grade: r1-s18 (task T47 B, persona Sam, keyboard only)

Participant model: claude-opus-5-5 (every turn of the participant log records Opus, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Keyboard-only: `session.json` records `keyboardOnlyMode: true` (started `empty --keys`).

## Leak check: clean

`leaks.json` read the participant's log (95 tool calls) and lists no leak.

## Against the success definition

T47 B asks for the College football sample, the program's own clusters (each its own color, not
the file's conferences), then every cluster's teams drawn as cubes with the colors kept.

- Last screenshot `44.png`: College football, the Louvain folder selected, its Shape line "Box"
  with "Shape: 10 changed" and Undo. Every node on the drawing is a cube, in ten colors. The key
  reads "Shape: Louvain -- Box" above "Color: Louvain -- Group 1 ..." with "3 more below".
- `styles.json`: the ten group layers the Louvain run made (`results.louvain.group`), each with
  its own `node.color` and `node.shape` `box`, painted counts equal for color and shape: 16, 15,
  14, 12, 11, 10, 10, 9, 9, 9 (115). Everything still sets `icosphere` and paints 0 shapes.
- `key.json` drawn: ten node colors with exactly those counts; the key's ten colors are the
  drawn ones. `styles-steps.jsonl` shows the same ten colors from the run (`27.png`) through
  `44.png`, so no cluster's color changed.
- The clusters are a Louvain run, not the conference column; the group sizes match the answer
  key's reference values for Louvain on College football.
- Stack: the run's folder edited once (Shape "+" > Shape > Box), written to all ten group
  layers: `Route: folder`.

Success, reached by a longer route than the key's with three moves away from it, each recovered
from what the screen then showed: SD.

## Steps and wrong turns

Steps counted one key, one typed entry or one chord each; the two `--type` calls that typed
nothing (no text box had focus, steps 5 and 11) are none.

- Opening the sample: 37 steps (steps 2-19): Tab, Tab, Enter on the top bar's Samples link; 14
  more Tabs back through the top bar, the demo and its five buttons to the start page's Samples
  button, Enter; 4 Tabs to "Search samples", `football`, Enter (does nothing), 12 Tabs past the
  nine category chips, Enter on the card.
- Clusters: 10 steps (steps 20-27): Control+K, `communit` (no results), Control+A and `cluster`
  (no results), Control+A and `analy`, Enter on Analyze, `communit`, Enter on Louvain, Enter on
  Run.
- Cubes: 25 steps (steps 28-44): F6, 3 Tabs into the layer tree, ArrowUp, Enter (the folder
  selected); F6 four times round the whole cycle; F6 and Tab into the inspector, 7 Tabs, Shift+Tab,
  Enter on Shape "+", Enter on Shape, Enter to open the list, Home, Enter on Box.

Participant: 72 steps (the participant counted "about 103" by counting each typed letter). The
key's success path is 11 steps by pointer; its keyboard notes put the College football card 32
to 34 Tabs from the top of the start page, Analyze one chord (Shift+A) once learned, and the
folder an F6 and a few Tabs away, so the shortest keyboard route is about 55 to 60 presses.

Wrong turns: 3.
1. Steps 3-9: Enter on the top bar's Samples link scrolled to the library but left focus in the
   top bar; the Tabs that followed walked back up the page through the top bar and the demo, and
   the participant pressed the second Samples control to get back to the library.
2. Steps 34-37: from the left panel, F6 went to the inspector with no visible focus; the
   participant took it for "an unknown place" and walked the whole F6 cycle (drawing, toolbar,
   left panel) before working out which stop it was.
3. Step 39: 7 Tabs in the inspector went one past Shape "+" to Visibility "+"; Shift+Tab back.

The palette words that found nothing (steps 21-22) are not counted: they changed nothing and the
next word reached Analyze in the same palette.

False done: no. The participant said done at `44.png`, and the screen, the key and the style
tree agree.

## Problems

1. **The inspector's F6 stop shows no focus.** Severity 3, kind: build-defect (accessibility,
   WCAG 2.4.7). Step 34 (`34.png`): after F6 from the layer tree nothing on screen shows where
   focus is; every other F6 stop draws a frame or a ring. The participant spent four presses and
   a wrong turn finding it. Repro: `../../repro/r1-s18/` (`commands.md`; `08.png` is the
   inspector's stop, `05.png`, `06.png`, `07.png` the other three).
2. **Both Samples controls scroll to the library but leave focus behind.** Severity 3, kind:
   accessibility. Steps 4-5 and 10-11 (`04.png`, `05.png`, `10.png`, `11.png`): twice the
   participant typed `football` and nothing went in, because focus stayed on the control, out of
   view; after the top bar's link, Tab walks back up the page. Already recorded in the answer
   key's start page notes; now met by a keyboard-only reader.
3. **Reaching a sample card takes over 30 Tabs.** Severity 3, kind: accessibility. Steps 6-18
   (`06.png` to `18.png`): the top bar, the demo canvas and its five buttons, the hero buttons and
   the "MIT licensed" strip come before the search box; each of the nine category chips is its
   own Tab stop between the search box and the results; Enter in the search box with one card
   left does nothing (step 15, `15.png`). The participant called opening the sample the most
   painful part.
4. **Quick actions does not find analyses by what they do.** Severity 2, kind: behavior. Steps
   21-22 (`21.png`, `22.png`): `communit` and `cluster` give "No results"; only `analy` finds
   Analyze, while the Analyze list's own filter finds Louvain from `communit` at once (step 25,
   `25.png`).
5. **The shape list opens with no option highlighted by keyboard.** Severity 2, kind:
   accessibility. Step 42 (`42.png`): the participant could not tell where he was in the list of
   36 shapes; Home highlighted Box. Already in the answer key's success path notes.
6. **The color key scrolls once the shape entry is added, hiding three clusters.** Severity 2,
   kind: behavior. Step 44 (`44.png`): "3 more below"; Groups 8 to 10 are out of view. Already in
   the answer key's path for this half; seen in other sessions of T47 B.
7. **The search box is focused at the bottom edge with its results below the fold.** Severity 1,
   kind: behavior. Steps 13-14 (`13.png`, `14.png`): focus reached "Search samples" without the
   page scrolling it and its results into view.
8. **The inspector's Tab order puts seven controls before Shape "+".** Severity 1, kind:
   behavior. Step 39 (`39.png`): "Select what it paints", more, Style and Values, Node and Edge,
   Style nodes, Which nodes and its chip come first; the participant overshot by one.
9. **Nothing names a cube.** Severity 1, kind: wording. Step 42 (`42.png`): the list has no
   "Cube"; the participant took Box for a cube from its icon, without trouble this time.

What worked, as the participant reported and the screens show: Enter on a Louvain card put focus
on Run (`26.png`); after Run focus went back to the Analyze button (`27.png`); the folder's one
Shape edit reached all ten groups and kept their colors (`44.png`).
