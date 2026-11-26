# Interaction latency

`interaction-latency.mjs` measures how long a reader waits after each kind of input, on graphty-element alone and in
the graphty app. The goal is every result on screen within 300 ms of the input, and preferably within 150 ms.
`tools/interaction-latency.mjs` runs it by tier, keeps the results as a history in the repository, and compares
each run with the ones before it. INPUT-CATALOG.md lists every input, what counts as its result being visible, and
the conditions each tier covers.

## What is timed

Each input is timed from the input event's own `timeStamp` (the moment the browser received the real mouse, wheel,
key or touch input Playwright sent) to the frame after the result is **drawn**: each frame after the input, the
runner reads back the canvas pixels at the target (a box around the clicked node, the hovered edge, the restyled
node, or a 256 x 200 thumbnail of the whole canvas for a camera move) and stops when they differ from what was there
before the input. A box counts as changed when at least one pixel in 2000 (and at least two) moved by more than 24
levels; a canvas cleared by a resize does not count. graphty-element keeps each drawn frame
(`preserveDrawingBuffer`, on by default), so the readback shows what is on screen; the next frame is counted too, as
the one that presents it.

Beside it, each cell keeps the **state** time: when the result first became readable through graphty-element's
public API (the selection, the hovered node, the camera, a style's resolved value) or the app's accessibility tree
(the Inspector heading, a menu, a dialog, the table's first row). graphty-element can reach the state frames before
the pixels change.

When the pixels never change -- `waitForPainted()` resolved and ten more frames stayed the same -- the state time
stands in, and the cell says so: its `endsOn` is `state` (or `mixed`) and `noVisible` counts the repetitions.
`report` lists such cells in a section of their own, so a state time is never read as a drawn time. Results that
live only in the DOM (menus, dialogs, the Inspector heading) end on the DOM condition plus one frame, also
`endsOn: state`. Opening the table ends when its first row shows and the canvas has been redrawn at its new size.

The hover look: graphty-element's default Hovered layer selects the hovered node and sets nothing, so a hover
draws no change. The suite gives the Hovered layer a magenta node color (untimed, through `session.styles`) on every
page except the plain look, so hover, leaving a node and hover bursts are timed to pixels. The element pages also
set the app's Pinned look, so letting go of a dragged node (which pins it) is timed to the halo it draws.

A repetition that times out (30 s; 3 or 5 s for running-layout cells, 10 s for bursts) counts at its cap: it raises
the median and the 95th percentile, and a cell whose every repetition timed out reads as its cap, over every bar.

Where an action ends in an animation or a computation, a **settled** time is kept too: `waitForStableFrame()` after
the first changed frame (fitting the graph, switching 2D and 3D, applying a layout). The app's Focus selected glide
is an animation `waitForStableFrame()` does not wait for, so its settled time is when the camera, having started to
move, holds still for three frames. The report lists the glide in its own table as an animation's length, never as
input latency.

The browser runs with vsync on, as a reader's does, so a result drawn in the frame after the input reads about 33 ms.

### While a force layout runs

Every pixel moves every frame, so "the box changed" proves nothing. Hover, leaving a node, clicking a node and
clicking empty canvas instead read, each frame, the node's current screen position (`nodeScreenPosition`) and test
the box there for the look's own color (the hover color; the Selected layer's halo color), present or gone; saturated
colors match by hue, so 3D shading still matches. Camera inputs and node drags end on state while a layout runs.
Before each repetition the runner checks that nodes still move (restarting it once, from scattered positions, if they settled), and a
repetition whose layout settled by its end is counted in the cell's `layoutStill`.

### A click can be dropped, not just slow

graphty-element counts a press as a click only when its pointerup reaches the element's handler less than 300 ms
after the pointerdown (`CLICK_MAX_DURATION_MS` in `Graph.ts` and `NodeBehavior.ts`). When the main thread is busy
for 300 ms or more between the two, a quick real click selects nothing at all. The untimed set-up steps (clicking
empty canvas, selecting a node, hovering one) check that they reached their state and fail the repetition with a
"set-up:" error when they did not, so a dropped set-up click reads as that, not as a slow input. A timed press whose release
reached the page more than 300 ms after it is counted in the cell's `clickWindowMissed`, so a click case that timed
out because the click was dropped says so.

### Cold first interactions

The first hover, the first click and the first right-click after load (`-cold` rows), and in the app the first
selection named in the Inspector, the first canvas menu, the first restyle and the first table open, each run on a
page loaded fresh for that one input. Their targets are found from drawn positions alone (a node in the middle of
the canvas with no other node near it), never by picking, and the pointer starts outside the element, so the input
is the first pick, the first selection, the first menu on that page.

The app also records opening the graph (`app-open-cold`): from the click that opens it (the sample's card, or the
file button) to the first frame the opened graph draws (`graph-first-frame` from the workspace's graphty-element,
never the start page's hero graph), and to the settled picture.

### Bursts

Drag, orbit, pan, mouse wheel, hover sweeps, trackpad scrolls and pinches (Ctrl+wheel) are also sent as bursts at
60 and 120 inputs a second, and a touch pinch and a held arrow key at their own rates. The inputs go out through the
page's DevTools session without waiting for the page to handle each one, so a slow page cannot slow the sender.
Each burst reports:

- the lag from the last input to the frame after the canvas pixels first changed following it (a thumbnail read only
  from the second-last input on, so reading costs the burst nothing; the tracked state stands in when the pixels
  never change, and the table scroll burst ends on its rows);
- the rate sent and the rate the page received (`sent_hz_median`, `achieved_hz_median`; pointer moves counted with
  their coalesced events, so a page that draws slowly still shows the rate it received; Chrome merges wheel
  events with no record of the merged ones, so a wheel burst's received rate is the merged events'), and the input
  span;
- the frames dropped from the first input to the frame showing the last, against 60 Hz, and the longest frame gap.

## Cells

A cell is one input under one page's conditions, named `<where> | <input id>`, for example
`element objects 3d default dpr1 10k | hover-node` or `app generated 10k (file) default 3d dpr1 | app-table-open`.

**graphty-element** (the bench page): G(n, 2n) graphs from 100 to 100k nodes, both render paths, 3D and 2D, device
pixel ratio 1 and 2, in four looks (INPUT-CATALOG.md, section 3.1): `plain`, `default`, `styled` (labels and
arrowheads) and `heavy` (also curves, tooltips, color bound to a number and size to degree). Each page runs every
mouse, pen and keyboard input, the bursts, touch, hover tooltips, the layout button (a button the page adds, as a
consumer would, whose click calls `setLayout`), and on pages with a running layout the hover, click, drag, camera,
wheel and key inputs again while a force layout runs.

**graphty app** (the built app, `graphty/dist`; never the Vite dev server): Les Miserables (sample), the yEd Live
WaveNet diagram, generated GraphML files of 1k, 10k, 50k and 100k nodes (and 1k, 10k and 50k with yEd fills and
shapes, for file styles at scale; the runner writes them next to the results file), and staff-50k.graphml. Each
page runs the canvas inputs, the panels and dialogs, the table, the Style-tab-open and Focus-selected-off variants,
the inputs that change the graph for good (tooltips, analyses, restyles, the timeline, layouts), and on pages with a
running layout the canvas inputs again while it runs. The batched path runs only with `?features=cosmograph`, which
is how the app turns it on.

## Tiers

| tier  | pages                                                                                      | inputs                                     |
| ----- | ------------------------------------------------------------------------------------------ | ------------------------------------------ |
| quick | Q1 10k objects, Q2 10k batched, Q3 100k batched (element, default look); Q4 the app on 10k | the core inputs (INPUT-CATALOG.md, 3.3)    |
| full  | E1 to E18 (element) and A1 to A10 (app); INPUT-CATALOG.md, section 3.4, lists each page    | every input the runner drives, or the core |

Both tiers run 3 repetitions of each input on each page. `node benchmarks/compare/interaction-latency.mjs check`
fails when a tier names an input no page of its kind runs. Every page records its own wall time, printed when the
run is recorded; the newest measured totals are in `benchmarks/results/interaction-latency-history.jsonl` and in
the run's log.

The quick tier is for any change to graphty-element's input, picking, selection, styles or render loop, or to the
app's canvas, Inspector and table; the full tier runs nightly on this machine, or on demand.

### The dev server is not comparable

Only the built production app is timed. The Vite dev server runs React's development build (extra checks,
StrictMode double renders, unminified code), so a synchronous React render there costs several times what it costs
in the built app.

## Running it

### Once per machine

Timed runs need the NVIDIA card in headless Chromium, a lock other GPU benchmarks share, and reserved CPU cores.

1. **libEGL.** Headless Chromium reaches the card only with libEGL on `LD_LIBRARY_PATH`; without it, Chromium hangs
   on the first page or silently draws with SwiftShader. Extract it, without root, into the main checkout's tmp:

       mkdir -p tmp/egl && cd tmp/egl
       apt-get download libegl1 libglvnd0
       dpkg -x libegl1_*.deb root && dpkg -x libglvnd0_*.deb root

    The runner reads `tmp/egl/root/usr/lib/x86_64-linux-gnu` in the main checkout (`BENCH_EGL` overrides it). With
    it, the renderer reads "ANGLE (NVIDIA, Vulkan ... (NVIDIA GeForce ...), NVIDIA)"; a page on any other renderer
    is recorded as failed.

2. **The GPU lock** is `tmp/cosmos-impl/gpu-bench.lock` in the main checkout, taken with `flock`; the tool creates
   its directory. Every GPU benchmark on the machine takes the same lock, so runs never overlap.

3. **Reserved cores.** `benchmarks/compare/bench-cores.sh run <command>` gives the run CPU cores 8-15 of its own
   (cgroup v2 cpusets) for exactly as long as it lasts, and gives them back on exit (`release` frees them by hand,
   `status` shows the reservation, `BENCH_CPUS` picks other cores). The tool uses the main checkout's
   `tmp/bench-cores/bench-cores.sh` when there is one, else this committed copy; both share one reservation.
   `LAT_WRAP` replaces the whole lock-and-cores prefix.

### Each run

1. Build the packages and the app (`pnpm exec nx run-many -t build -p graph-format graph-io graph-samples algorithms
layout webgpu-graph-algorithms graphty-element graphty`) and the bench page (`RUNBOOK.md`, section 1, with
   `BENCH_LABEL=interaction-latency`), from a clean checkout of the commit to time. `run` refuses to start when the
   bench page was built from sources that differ from HEAD's, or graphty-element's or the app's build is older than
   their newest source change; `record` refuses to store such a run. The runner serves the page and the app's
   `dist` itself, on a loopback port that lives as long as each page.
2. From the repository root:

       node tools/interaction-latency.mjs run quick
       node tools/interaction-latency.mjs run full
       node tools/interaction-latency.mjs run full --page E3,A1

    Each page runs in its own browser and child process under the lock and the reserved cores, so the lock is held
    one page at a time. The raw cells land in `benchmarks/out/interaction-latency/` (not committed); the run is
    appended to `benchmarks/results/interaction-latency-history.jsonl`, which is committed with the commit it
    measured. With `--page`, the pages are a series of their own (`full:E3,A1`), compared only with earlier runs of
    the same pages.

3. `--smoke` runs the tier on SwiftShader without the lock, every page on a small graph (200 nodes on the element
   pages, 1k-node files in the app): on SwiftShader a frame of a 10k graph takes longer than the element's 300 ms
   click window, so every click would be dropped. It shows that each case drives; its numbers mean nothing, and it
   is refused from the repository's history (pass `--history <file>` elsewhere). Add `--reps 1` for a faster pass.

Where it runs: on this machine, never in CI. GitHub's runners have no GPU, and a SwiftShader run measures
SwiftShader, not graphty: its frames are ten to a hundred times slower, so its numbers cannot be held to 150 and
300 ms, and its changes track the runner's load, not the code. A drive check in CI would need the bench page and
the built app for every pull request for a smoke result this machine gives in minutes.

The runner alone, for one cell or a hand-picked set: `node interaction-latency.mjs element|app <results.jsonl>`
with `--only <regex>` (input ids), `--sizes 100,1k,10k,50k,100k`, `--paths`, `--dims`,
`--modes plain,default,styled,heavy`, `--dpr2-sizes`, `--graphs`, `--features`, `--app-dims` and `--reps`;
`node interaction-latency.mjs tier quick|full <results.jsonl> [--page ...]` runs a tier's pages without recording;
`node interaction-latency.mjs report <results.jsonl>` prints the tables. The yEd Live file is
`graphty/public/samples/programs/yed-live.graphml` (`LAT_YED_LIVE` points elsewhere); staff-50k.graphml is in
`design/ui/studio/tool/files` (`python3 big-50k.py` there writes it again).

## Reading the results

Each cell in the history records:

| field               | meaning                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `medianMs`, `p95Ms` | drawn latency: input event to the presented frame whose pixels show the result; a timed-out repetition at its cap |
| `endsOn`            | `pixels`; `state` when the drawn time is a state or DOM time (a DOM result, or a change never seen); `mixed`      |
| `noVisible`         | repetitions whose canvas change was never seen, so their state time stands in                                     |
| `stateMs`           | input event to the moment the public API or the accessibility tree reports the result                             |
| `settledMs`         | for an animation or a computation: input to the frame where it finished; its length, never held to the bars       |
| `dropped`           | for a burst: frames dropped from the first input to the frame showing the last one, against 60 Hz                 |
| `receivedHz`        | for a burst: the input rate the page received                                                                     |
| `timeouts`          | repetitions that timed out                                                                                        |
| `clickWindowMissed` | timed presses released more than 300 ms after the press, which graphty-element does not count as clicks           |
| `layoutStill`       | for a running-layout cell: repetitions whose layout had settled by their end                                      |
| `notMeasured`       | the case could not run here (no edge clear of nodes, no timeline column), with the reason                         |

Each run's lines also carry the commit, the tier, and the machine: CPU, Chromium version, GPU renderer and NVIDIA
driver. A change of any of those starts a new series, so a new browser or driver is never read as a code change.

The bars: up to 150 ms is good, 150 to 300 ms is acceptable, over 300 ms fails. With 3 repetitions a cell's p95
is its worst repetition, so one slow repetition shows; the history across runs tells a habit from a spike.

`node tools/interaction-latency.mjs report` lists the newest run's cells over 300 ms, then those between 150 and
300 ms, then those not measured, then those timed to state because the canvas change was not seen.

`node tools/interaction-latency.mjs compare` compares every cell with the run before it, and with the oldest of the
ten runs before it, on the same tier and machine, and lists only the ones that changed. It exits 1 when any cell is:

- `slower`: median and p95 both above 1.2 times the previous run's and by more than one frame (16.7 ms);
- `tail`: the p95 alone rose that much, and is over 150 ms;
- `creep`: median and p95 both above 1.2 times the oldest compared run's (steady small slowdowns);
- `fails`: newly over 300 ms, however little it rose;
- `lost`: measured before, nothing measured now (every repetition failed);
- `missing`: in the previous run, absent from this one (its page failed, or the input was dropped).

It also lists `faster`, `new` and `unmeasured` cells, and `accepted` ones (below); `*` after a status means the
cell moved into a worse band.

A failing cell is a defect to find, as a red load-time row is. Only the owner accepts a slowdown, in
`benchmarks/interaction-latency-accepted.json` (agents never edit it), one entry per cell with the same proof load
time uses: `{ "row": "<the cell, as compare prints it>", "commit": "<sha>", "ratio": 1.3, "reason": "...",
"approval": "<URL of the owner's issue or pull request comment naming the cell>" }`. It applies while the newer run
contains the commit and the older one does not, up to its ratio.

## Not measured here

INPUT-CATALOG.md, section 4, lists the inputs no case drives yet and why, and section 5 the inputs a headless
browser cannot drive at all (XR, the microphone, the native file chooser, display scan-out).
