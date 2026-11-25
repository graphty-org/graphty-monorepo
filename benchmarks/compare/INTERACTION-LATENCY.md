# Interaction latency

`interaction-latency.mjs` measures how long a reader waits after each kind of input, on graphty-element alone and in
the graphty app, beside the load, frame and restyle metrics of `perf-matrix.mjs`. A delay above about 300 ms is one a
person notices; the report counts the cells whose 95th percentile passes it.

## What is timed

From the input event's own `timeStamp` (the moment the browser received the real mouse, wheel, key or touch input
Playwright sent) to the second `requestAnimationFrame` after the result became readable: the first frame that can
draw it, plus one, so the drawn frame is on screen. The result is read through graphty-element's public API (the
selection, the hovered node, the camera state, a node's screen position) or the app's accessibility tree (the
Inspector heading, a menu, a dialog, the table's first row). Where the result is only an event (letting go of a
dragged node, hovering an edge), the event's time is in `event_median_ms` as well. Every row records median, p95 and
worst over its repetitions (5; 3 at 100k nodes when one repetition takes over 10 s); a drag records every pointer
move of every repetition.

The browser runs with vsync on, as a reader's does, so a result reached in the frame after the input reads about
45-50 ms: up to one frame of waiting for the next frame, plus the two frames the definition adds.

## Running it

1. Build the dependency packages (`pnpm exec nx run-many -t build -p graph-format graph-io graph-samples algorithms
layout webgpu-graph-algorithms graphty-element graphty`) and the bench page (`RUNBOOK.md`, section 1, with
   `BENCH_LABEL=interaction-latency`). The runner serves the page and the app's `dist` itself, on a loopback port that
   lives as long as each page.
2. Element: G(n, 2n) graphs at 1k, 10k, 50k and 100k nodes, both render paths, 3D and 2D:

       LAT_WRAP="flock <main>/tmp/cosmos-impl/gpu-bench.lock <main>/tmp/bench-cores/bench-cores.sh run" \
         node interaction-latency.mjs element ../results/<label>/latency.jsonl

3. App: Les Miserables (sample), the yEd Live WaveNet diagram and staff-50k.graphml (files), with the default render
   path and `?features=cosmograph` (batched). The yEd Live file is `graphty/public/samples/programs/yed-live.graphml`
   on the branch that adds the program samples; point `LAT_YED_LIVE` at a copy. Run `python3 big-50k.py` in
   `design/ui/studio/tool/files` once to write staff-50k.graphml.

       node interaction-latency.mjs app ../results/<label>/latency.jsonl

4. `node interaction-latency.mjs report ../results/<label>/latency.jsonl` prints every cell, slowest first.

`--only <regex>` picks interactions by id, `--sizes`, `--paths`, `--dims`, `--graphs`, `--features` and `--reps` pick
the cells. Each page runs in its own browser and child process through `LAT_WRAP`, so the GPU lock and the reserved
cores are held for one page at a time. The browser must draw on the NVIDIA card; a page on any other renderer is
recorded as failed.

## Not measured here

Double-click to expand from a network source, a label card's close button and a group outline need graphs set up for
them (a network source, labels with a close mark, group outlines); XR needs the WebXR emulator, which only
graphty-element's vitest `xr` project loads; push-to-talk depends on a speech provider. The app's panels that need
their own data (timeline, filters, analyses, the selection workspace, export) are left for a later pass.
