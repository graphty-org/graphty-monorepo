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

**graphty-element** (the bench page): G(n, 2n) graphs at 1k, 10k, 50k and 100k nodes, both render paths, 3D and 2D,
in two looks -- `plain` (the element's own node look, no arrowheads, no style layers) and `styled` (node labels,
arrowheads, and graphty-element's default style layers: Everything, Selected with its halo, Hovered) -- at device pixel
ratio 1, and at 2 for the 50k and 100k cells. Each page runs the mouse and keyboard cases, the bursts, touch, hover
tooltips (a layer setting `node.tooltip` and `edge.tooltip`, added untimed), switching the layout through the element's
own config (`setLayout`, circular and grid alternately: to the first moved frame and to settled), and last, with a
force layout running: hover, click and dragging a node.

**graphty app** (the built app, `graphty/dist`; never the Vite dev server): Les Miserables (sample), the yEd Live
WaveNet diagram, generated files of 1k, 10k and 100k nodes, and staff-50k.graphml, each with the default render path,
`?features=cosmograph` and `?features=file-styles`, in 3D and in 2D. The generated files are G(n, 2n) GraphML shaped
like staff-50k (name, dept) with a number (score) and a year; the runner writes them next to the results file. Each
page runs:

- canvas input: hover a node or edge, move off, click, Shift-click, Ctrl-click, click empty canvas, Escape, Ctrl+A, G,
  0 (fit), 5 (2D/3D), the arrow and zoom keys, drag a node, orbit, pan, wheel, pinch, touch tap, drag and pinch, and
  the bursts;
- panels: right-click menu, Inspector heading, quick actions, Find, the Data place, table open, column sort and
  selecting from a table row, the Everything layer's node color and its undo;
- the click, hover, Escape, Inspector and restyle cases again with the Inspector's Style tab open (its rows read the
  style layer counts, whose cache every hover and selection change empties), and the click and Inspector cases with
  Focus selected off;
- last, because they change the graph or the app for good: node and edge hover tooltips, Analyze > Degree > Run,
  Shortest path between two nodes, binding the node color to an attribute, adding a node label, hiding and showing
  the Everything layer, the Legend after an analysis, the Inspector's Largest component item, a timeline step (year
  as node time; generated graphs only), Export as CSV (to the download starting), Layout > Circle or Grid > Apply and
  Layout > Force > Apply (to the first moved frame and to settled).

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
2. Element:

       LAT_WRAP="flock <main>/tmp/cosmos-impl/gpu-bench.lock <main>/tmp/bench-cores/bench-cores.sh run" \
         node interaction-latency.mjs element ../results/<label>/latency.jsonl

3. App: the yEd Live file is `graphty/public/samples/programs/yed-live.graphml` on the branch that adds the program
   samples; point `LAT_YED_LIVE` at a copy. Run `python3 big-50k.py` in `design/ui/studio/tool/files` once to write
   staff-50k.graphml.

       LAT_WRAP="..." node interaction-latency.mjs app ../results/<label>/latency.jsonl

4. `node interaction-latency.mjs report ../results/<label>/latency.jsonl` prints the drawn-latency table slowest
   first, the bursts, and the camera glide.

`--only <regex>` picks interactions by id; `--sizes`, `--paths`, `--dims`, `--modes`, `--dpr2-sizes`, `--graphs`,
`--features`, `--app-dims` and `--reps` pick the cells. Each page runs in its own browser and child process through
`LAT_WRAP`, so the GPU lock and the reserved cores are held for one page at a time. The browser must draw on the
NVIDIA card; a page on any other renderer is recorded as failed. `LAT_SMOKE=1` lifts that check and runs on
SwiftShader, to see that every case drives; its numbers mean nothing.

## Not measured here

- Filters: a filter is built in a card editor (cards, conditions, preview) that takes several steps per condition;
  this runner does not drive it yet.
- Labels and edges on and off as a view toggle: the app has no such switch. Labels are added through the Style panel
  (measured as `app-labels-on`) and edges hidden through layer visibility (`app-layer-visibility` hides nodes and
  edges together).
- Selecting from a table row ends on the selection state only: the selected node is often off screen.
- Hover, click and drag while a force layout runs end on state only: every pixel changes every frame.
- Double-click to expand from a network source, a label card's close button and a group outline need graphs set up
  for them; XR needs the WebXR emulator, which only graphty-element's vitest `xr` project loads; push-to-talk depends
  on a speech provider.
