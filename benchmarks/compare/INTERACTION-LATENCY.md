# Interaction latency

`interaction-latency.mjs` measures how long a reader waits after each kind of input, on graphty-element alone and in
the graphty app, beside the load, frame and restyle metrics of `perf-matrix.mjs`. A delay above about 300 ms is one a
person notices; the report counts the cells whose 95th percentile passes it.

## What is timed

Each interaction is timed from the input event's own `timeStamp` (the moment the browser received the real mouse,
wheel, key or touch input Playwright sent) to the frame after the result is **drawn**: each frame after the input, the
runner reads back the canvas pixels at the target (a box around the clicked node, the hovered edge, the restyled node,
or a 96 x 72 thumbnail of the whole canvas for a camera move) and stops when they differ from what was there before
the input. graphty-element keeps each drawn frame (`preserveDrawingBuffer`, on by default), so the readback shows what
is on screen; the next frame is counted too, as the one that presents it.

Beside it, each row keeps the **state** time: when the result first became readable through graphty-element's public
API (the selection, the hovered node, the camera, a style's resolved value) or the app's accessibility tree (the
Inspector heading, a menu, a dialog, the table's first row). The two can differ by many frames: graphty-element
repaints a style or selection change in passes that can yield across frames, so the state is reached before the
pixels change. A result the canvas never shows -- a hover when no layer gives hovered nodes a look, which is the
default -- is marked "never drawn a change" once `waitForPainted()` has resolved and ten more frames stayed the same,
and its state time stands in. Results that live only in the DOM (menus, the table, the Inspector heading) end on the
DOM condition plus one frame.

Reading the canvas back each frame costs the probe a GPU-to-CPU copy of a small region, so the drawn time includes a
little of the probe's own cost; the state time does not.

Where an action ends in an animation or a computation, a **settled** time is kept too: `waitForStableFrame()` after
the first changed frame (fitting the graph, switching 2D and 3D, applying a layout). The app's Focus selected glide is
an animation `waitForStableFrame()` does not wait for, so its settled time is when the camera, having started to move,
holds still for three frames. The glide moves the camera for about a second after a click whose selection is drawn
within a frame or two; the report lists the glide in its own table as an animation's length, never as input latency,
and leaves it out of the over-300 ms count.

Every row records median, p95 and worst over its repetitions (5; 3 at 100k nodes when one repetition takes over 10 s);
a drag records every pointer move of every repetition.

The browser runs with vsync on, as a reader's does, so a result drawn in the frame after the input reads about 33 ms:
up to one frame of waiting for the next frame, the drawing frame, and the presenting frame.

### A click can be dropped, not just slow

graphty-element counts a press as a click only when its pointerup reaches the element's handler less than 300 ms
after the pointerdown (`CLICK_MAX_DURATION_MS` in `Graph.ts` and `NodeBehavior.ts`). When the main thread is busy
for 300 ms or more between the two -- a long frame on a large graph, or software rendering -- a quick real click
selects nothing at all. A click row that times out with no state change, at a size where frames are long, is most
likely this, not a slow selection.

### Cold first interactions

Before anything warms a page up, the first hover, the first selection (in the app, until the Inspector names the
node), the first right-click, the first restyle and the first table open are timed once each (`-cold` rows). The app
also records opening the graph (`app-open-cold`): from the click on the sample or the file button to the first frame
that draws the nodes, and to the settled picture.

### Bursts

Drag, orbit, pan, mouse wheel and trackpad pinch (Ctrl+wheel) are also sent as bursts at 60 and 120 inputs a second,
and a touch pinch at 60. Each burst reports the lag from the last input to the frame after the camera (or the dragged
node) first moved following it, and the frames dropped during the burst against the page's own measured frame period.
Bursts end on the camera or node state, not pixels: reading pixels every frame would itself drop frames.

## Cells

A cell is one input under one page's conditions. INPUT-CATALOG.md lists every input, what counts as its result
being visible, and the conditions that change its cost; the runner drives every input there that a headless browser
can (section 5 of the catalog lists the ones it cannot, such as XR and the microphone).

**graphty-element** (the bench page): G(n, 2n) graphs from 100 to 100k nodes, both render paths, 3D and 2D, device
pixel ratio 1 and 2, in four looks:

- `plain`: the element's own node look, no arrowheads, no style layers;
- `default`: graphty-element's default style layers (Everything, Selected, Hovered, Pinned);
- `styled`: default plus node labels and arrowheads;
- `heavy`: styled plus curved edges (3D), node and edge tooltips, node color bound to a number column and node size
  bound to degree.

Each page runs, in order: the first hover, selection and right-click after load (`-cold` rows); every mouse, pen
and keyboard input (hover onto, off, between nodes and out of the element; clicks with and without modifiers on
nodes, edges and empty canvas; right-clicks; node drags including the highest-degree node in view; undo and redo
of a node move, and undo while still holding the node; the rectangle outline per move and the lasso; orbit, pan
with each button, wheel, Ctrl+wheel, arrow, zoom and roll keys, a held arrow key and its release; Tab into the
canvas; the minimap's click, drag and keys; a camera tour and auto-rotate stopped by a press; a pixel ratio change);
the bursts; touch (tap a node, tap empty canvas, drag the camera, drag a node, pinch, twist); hover tooltips;
switching the layout through the element's own config; and last, with a force layout running, hover, click, drag
and the camera, wheel and key inputs again, ending on state only (every pixel moves every frame).

**graphty app** (the built app, `graphty/dist`; never the Vite dev server): Les Miserables (sample), the yEd Live
WaveNet diagram, generated files of 1k, 10k and 100k nodes, and staff-50k.graphml, each with the default render path,
`?features=cosmograph` and `?features=file-styles`, in 3D and in 2D. The generated files are G(n, 2n) GraphML shaped
like staff-50k (name, dept) with a number (score) and a year; the runner writes them next to the results file. Each
page runs:

- canvas input: the element's inputs above, plus Shift-click, Escape, Ctrl+A, G, 0 (fit), F (fit selection), 5
  (2D/3D), 9 (auto-rotate), L (legend), Shift+F10 and right-clicks on a node, an edge and empty canvas until the
  canvas menu shows, its Clear selection and Fit items, and touch-and-hold for the menu (the 500 ms hold excluded);
- panels and dialogs: the Inspector heading, quick actions (opening, typing, running Zoom in or out), Find (focus,
  a keystroke, Enter), the Data, Views and Notes places, the main, camera and mode menus, a camera preset, the
  shortcuts, settings, export and Save as dialogs, Analyze and Path between by key, the assistant, F6, the
  Everything row, the Inspector's Values tab, the node color and node size fields, undo and redo, undo of a node
  move, and resizing the window;
- the table: opening, sorting, selecting from a row, scrolling it in a burst, and hover, click, Escape, wheel,
  orbit and pan again with the table open (`-table-open`);
- the click, hover, Escape, Inspector and restyle cases again with the Inspector's Style tab open, and the click and
  Inspector cases with Focus selected off;
- last, because they change the graph or the app for good: node and edge hover tooltips, Analyze > Degree > Run,
  PageRank, Shortest path, binding the node color to an attribute, adding a node label, hiding and showing the
  Everything layer, the Legend after an analysis, the Inspector's Largest component item, the timeline (step, then
  the canvas inputs again with it open as `-timeline-open`, Play, and T), Export as CSV, and Layout > Circle or
  Grid > Apply and Layout > Force > Apply.

## Tiers

The full cross product of the conditions is over 40 hours, so the suite runs tiers: one anchor condition (10k
nodes, objects path, default look, 3D, pixel ratio 1, layout settled, panels closed) and pages that move one or two
conditions from it (INPUT-CATALOG.md, sections 3.3 and 3.4, names each page).

| tier  | pages                                                                                                                               | inputs                        | GPU lock     |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------ |
| quick | Q1 10k objects, Q2 10k batched, Q3 100k batched (element, default look); Q4 the app on a generated 10k file                         | the core inputs, 20 of them   | about 30 min |
| full  | E1 to E15 (sizes 100 to 100k, both paths, 2D, plain / default / heavy looks, pixel ratio 2, the running layout); A1 to A4 (the app) | every input the runner drives | about 3 h    |

Each tier runs 3 repetitions of each input on each page. Every page records its own wall time, so a run that grows
past its budget shows which page grew.

### The dev server is not comparable

Only the built production app is timed. The Vite dev server runs React's development build (extra checks, StrictMode
double renders, unminified code), so a synchronous React render there costs several times what it costs in the built
app. Clicks measured at 300-530 ms on the dev server with file-styles on and the Style panel open are therefore not
the app's latency; the `-style-open` rows with `?features=file-styles` at 1k and 10k are the built app's numbers for
the same setup.

## Running it

1. Build the dependency packages (`pnpm exec nx run-many -t build -p graph-format graph-io graph-samples algorithms
layout webgpu-graph-algorithms graphty-element graphty`) and the bench page (`RUNBOOK.md`, section 1, with
   `BENCH_LABEL=interaction-latency`). The runner serves the page and the app's `dist` itself, on a loopback port that
   lives as long as each page.
2. Run a tier and record it, from the repository root:

       node tools/interaction-latency.mjs run quick
       node tools/interaction-latency.mjs run full [--page E3,A1]

    Each page runs in its own browser and child process under the GPU lock and the reserved cores (`flock
tmp/cosmos-impl/gpu-bench.lock tmp/bench-cores/bench-cores.sh run`, from the main checkout; `LAT_WRAP` overrides
    the prefix), so the lock is held one page at a time. The browser must draw on the NVIDIA card; a page on any other
    renderer is recorded as failed. The raw cells land in `benchmarks/out/interaction-latency/` (not committed); the
    run is appended to `benchmarks/results/interaction-latency-history.jsonl`, which is committed.

3. `--smoke` runs on SwiftShader without the lock, to see that every case drives; its numbers mean nothing, and it
   is refused from the repository's history (pass `--history <file>` elsewhere).

Where it runs: on this machine, never in CI. GitHub's runners have no GPU, and a software-renderer run measures
SwiftShader, not graphty; a drive check there would also need the bench page and the built app for every pull
request. The quick tier is for any change to graphty-element's input, picking, selection, styles or render loop,
or to the app's canvas, Inspector and table; the full tier runs nightly on this machine, or on demand.

The runner alone, for one cell or a hand-picked set: `node interaction-latency.mjs element|app <results.jsonl>`
with `--only <regex>` (interaction ids), `--sizes 100,1k,10k,50k,100k`, `--paths`, `--dims`,
`--modes plain,default,styled,heavy`, `--dpr2-sizes`, `--graphs`, `--features`, `--app-dims` and `--reps`;
`node interaction-latency.mjs tier quick|full <results.jsonl> [--page ...]` runs a tier's pages without recording;
`node interaction-latency.mjs report <results.jsonl>` prints the tables. The yEd Live file is
`graphty/public/samples/programs/yed-live.graphml` (point `LAT_YED_LIVE` at it); run `python3 big-50k.py` in
`design/ui/studio/tool/files` once to write staff-50k.graphml.

## Reading the results

Each cell (one input on one page) records:

| column              | meaning                                                                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| drawn (median, p95) | input event to the presented frame whose pixels show the result; for a result the canvas never shows (a hover with no hover look), the state time stands in; for a DOM result, the DOM condition plus one frame |
| state               | input event to the moment the public API (selection, hovered node, camera, a style's value) or the accessibility tree reports the result                                                                        |
| settled             | for an animation or a computation (a fit, a 2D/3D switch, a layout, a camera glide): input to the frame where it finished; its length, never held to the bars                                                   |
| dropped             | for a burst: frames dropped from the first input to the frame showing the last one; the burst's drawn time is the lag after the last input                                                                      |
| not measured        | the case could not run here (no edge clear of nodes, no timeline column), with the reason                                                                                                                       |

The bars: up to 150 ms is good, 150 to 300 ms is acceptable, over 300 ms fails. With 3 repetitions a cell's p95
is its worst repetition, so one slow repetition shows; the history across runs is what tells a habit from a spike.

`node tools/interaction-latency.mjs report` lists the newest run's cells over 300 ms, then those between 150 and
300 ms, then those not measured. `node tools/interaction-latency.mjs compare` compares every cell with the run
before it on the same tier and machine and lists only the ones that changed:

- `slower`: median and p95 both above 1.2 times the previous run's and by more than one frame (16.7 ms); exit 1;
- `faster`, `new`, `unmeasured`, and `accepted` (an owner-accepted slowdown, below);
- `*` after a status: the cell moved into a worse band.

A slower cell is a defect to find, as a red load-time row is. Only the owner accepts a slowdown, in
`benchmarks/interaction-latency-accepted.json` (agents never edit it), one entry per cell with the same proof load
time uses: `{ "row": "<the cell, as compare prints it>", "commit": "<sha>", "ratio": 1.3, "reason": "...",
"approval": "<URL of the owner's issue or pull request comment naming the cell>" }`. It applies while the newer run
contains the commit and the older one does not.

## Not measured here

INPUT-CATALOG.md, section 4, lists the inputs no case drives yet and why, and section 5 the inputs a headless
browser cannot drive at all (XR, the microphone, the native file chooser, display scan-out).
