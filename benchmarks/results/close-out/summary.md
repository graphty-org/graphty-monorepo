# Close-out: graphty-element's row renderer against cosmos.gl

The final measurement of the row renderer (`design/rendering/row-renderer.md`, stage 38): graphty-element on master with
`renderPath` `"objects"` (the default) and `"batched"`, beside cosmos.gl 3.5.1 and beside the reference build the row
renderer started from, all measured in one session on one machine, interleaved round by round.

## Setup

- **cosmos.gl**: cosmos.gl 3.5.1 on the benchmark page (`benchmarks/compare`).
- **batched**: graphty-element at master b717d5ecb2 with `renderPath: "batched"`, data handed over as arrays of record
  objects.
- **columns**: the same build with `renderPath: "batched"`, data handed over through the column door
  (`importColumns`, typed arrays), static layout.
- **objects**: the same build with `renderPath: "objects"`, the element's default.
- **reference**: the build every stage compared against, commit 57c0ee700e (`benchmarks/results/reference`), rebuilt
  and re-measured in this session.
- **+limits**: at 1,000,000 nodes, batched and columns run with `limits: { renderCeiling: 2000000, edgesDrawn: 2000000 }`.
  Without it the element refuses the load past its 100,000-node render ceiling, which is what objects and reference do
  at 1,000,000 nodes (`load failed: Loading 1,000,000 more nodes would take the graph to 1,000,000, past ...`).

All runs are 2D lean (box nodes, plain lines, no arrowheads), device pixel ratio 1, WebGL through ANGLE/Vulkan on an
RTX 4070 SUPER, headless Chromium. Every run measures the load, still, orbit, drag, hover and
lasso stages on the static drawing first, then runs the accelerated (GPU) layout and measures its frames and steps.
The column-door runs skip the layout (`skip-layout`). The driver meant to skip it at 10k + 100, 100k + 1k and the
million-node sizes too, but a shell scoping slip (`local sz=$2 flags=${LAY[$sz]}` expands `$sz` before assigning it)
ran it there as well; nothing before the layout stage is affected, and the layout figures at those sizes are extra. The device pixel ratio 2 and 3D `default`
look rows of `matrix.sh` were not measured: every stage target is 2D lean at ratio 1.

Rows run on 2026-11-15 from 04:03 PT (timestamps in `results.jsonl`, in UTC). Five interleaved rounds per size, three at
1,000,000 nodes and at 10k + 100 (stopped after three rounds when the load stayed at 20-37 for an hour); the order of the builds rotates each round. Every run held the shared GPU lock.

**Load control.** The machine is shared with other sessions. Before every run the driver read `/proc/loadavg` and waited,
without a deadline, while the one-minute load was above 8. A row counts when the one-minute load before it was 8 or
lower; the load after it is recorded beside it (`loadavgBefore`, `loadavgAfter` in every row). A void row was redone.
The tables give the load range of the counted rows per build.

**Stability check.** One configuration (batched, 100k + 1M) was run three extra times at a one-minute load of 9.3-15.7,
against its five counted runs at 1.4-5.3:

| Figure                                           | High load / low load |
| ------------------------------------------------ | -------------------- |
| First frame (3.47 s at low load, 5.31 s at high) | 1.53                 |
| Still, moving and drag median frames             | 1.00-1.01            |
| Still p99, moving p99                            | 0.95-0.99            |
| Hover                                            | 0.89                 |
| Heap, layout frame, step with readback           | 0.99-1.01            |

So load alone moves the first frame by up to about 1.5x and every other figure by about 10% or less. A first-frame gap is
called real here only past 1.5x, any other gap only past 10%. Every ratio in this document is between builds measured in
this session at a load of 8 or lower.

**Clean source, dirty checkout.** 57 rows report a `dirty` build: this results file and the docs were being written in the
measured checkout. The element source was the committed b717d5ecb2 in every row. Rows from 04:59 PT name e56c325637,
which changes only the harness (below); the element code is the same.

## Reading the tables

A cell is the median across runs of each run's own figure (its median frame, its p99, the median of its ten hover
latencies), then the range of those run figures and the number of runs. Ratios are of medians; below 1 means the first
build is faster or smaller.

- **First frame**: from the data handover to the first drawn frame with every row loaded.
- **Still / moving / drag**: frame times with nothing moving, with the camera orbiting, and with one node dragged.
- **Hover**: pointer move to the hovered node being reported.
- **Layout frame**: frame time while the accelerated layout runs. **Step with readback**: one layout step plus reading
  positions back.
- **Failures** lists the first failure text of any run of that build; a failed stage leaves the run's earlier figures
  counted.

## The three gaps to cosmos.gl

`design/rendering/cosmos-gap.md` named three gaps from its interim measurement of 2026-11-08 and projected where each
would stop. Below, "then" is that document's ratio to cosmos.gl, measured in its own session; "now" is this session's
ratio. Only ratios are compared across the two sessions, never milliseconds.

| Gap                                 | Then                  | Now (batched)                                      | Projected                          | Verdict                                 |
| ----------------------------------- | --------------------- | -------------------------------------------------- | ---------------------------------- | --------------------------------------- |
| First load, 100k + 1M               | 43x                   | 6.2x records (3.47 s), 7.2x column door (4.02 s)   | 7.5-10x records, 5.6-8x typed      | Ahead (records), on track (column door) |
| First load, 100k + 1k               | 33x                   | 4.0x records (0.47 s), 4.7x column door (0.56 s)   | 8-12x                              | Ahead                                   |
| Still frame, 10k + 100              | 21x (interim 19.0 ms) | 1.8x (0.90 ms)                                     | about 1.5 ms (G1)                  | Ahead                                   |
| Still frame, 100k + 1M              | 3.2x                  | 2.55x median (73.3 ms), 2.71x p99                  | 2.5-3.2x (72-90 ms)                | On track, at the low end                |
| Million nodes, 1M + 10k first load  | refused               | 9.7x records (4.38 s), 11.2x column door (5.07 s)  | 13-22x (8.5-14.5 s)                | Ahead                                   |
| Million nodes, 1M + 10k still frame | refused               | 2.3x (4.8 ms)                                      | 6-21 ms of GPU                     | Ahead                                   |
| Million nodes, 1M + 1M first load   | refused               | 10.9x records (9.97 s), 10.7x column door (9.81 s) | not projected; stage 30 target 6 s | Behind the stage 30 target              |
| Million nodes, 1M + 1M still frame  | refused               | 2.6x (76.3 ms)                                     | 77-92 ms default                   | On track                                |

What would close the rest:

- **First load.** The load is now inside the floor cosmos-gap.md 5.1 predicted: the session's history, the derivation
  pass's other hooks, garbage collection and Babylon's first render. Going further needs ingest off the main thread or a
  load that skips the session's history, which no stage attempts.
- **Million-edge frame.** It is bound by GPU fill: the GPU frame alone is 71.6 ms of the 73.3 ms still frame. Only
  cheaper lines move it, which changes the picture: `antialias: false` (G5) and 6-vertex lines (G12) are options a
  consumer turns on, not measured in this default-picture matrix.
- **Million nodes.** Frames are already near cosmos.gl. The 1M + 1M load and heap are the per-row work the session keeps,
  times a million (cosmos-gap.md 5.4); the same off-main-thread ingest is what would close them.

Hover is ahead wherever the graph has 100,000 edges or more: 1.75 ms against cosmos.gl's 28.6 ms at 100k + 1M and
6.75 ms against 59.7 ms at 1M + 1M, 0.95 ms against 3.70 ms at 10k + 100k. With few edges it is behind: 1.90 ms against
1.45 ms at 100k + 1k, 5.70 ms against 3.00 ms at 1M + 10k.

## Tables

### 10k + 100

| Metric                   | cosmos              | batched             | objects             | batched / cosmos.gl | objects / cosmos.gl | batched / reference |
| ------------------------ | ------------------- | ------------------- | ------------------- | ------------------- | ------------------- | ------------------- |
| First frame (s)          | 0.10 (0.09-0.13, 3) | 0.15 (0.11-0.23, 3) | 0.43 (0.42-0.45, 3) | 1.52                | 4.31                | -                   |
| Still median (ms)        | 0.50 (0.40-1.10, 3) | 0.90 (0.50-1.20, 3) | 22.3 (6.00-23.0, 3) | 1.80                | 44.60               | -                   |
| Still p99 (ms)           | 1.70 (1.10-2.10, 3) | 2.70 (2.40-4.20, 3) | 30.0 (29.7-30.4, 3) | 1.59                | 17.65               | -                   |
| Moving median (ms)       | 0.50 (0.50-0.80, 3) | 0.60 (0.50-0.70, 3) | 14.5 (11.3-24.8, 3) | 1.20                | 29.00               | -                   |
| Moving p99 (ms)          | 2.60 (1.60-2.90, 3) | 1.00 (0.90-1.70, 3) | 38.5 (37.0-38.7, 3) | 0.38                | 14.81               | -                   |
| Drag median (ms)         | -                   | 0.60 (0.50-0.70, 3) | 11.7 (8.40-25.9, 3) | -                   | -                   | -                   |
| Hover median (ms)        | 0.85 (0.80-1.55, 3) | 1.45 (0.95-1.45, 3) | 5.00 (4.70-8.00, 3) | 1.71                | 5.88                | -                   |
| JS heap (MB)             | 8.00 (8.00-8.00, 3) | 43.0 (43.0-43.0, 3) | 129 (129-129, 3)    | 5.38                | 16.13               | -                   |
| Layout frame median (ms) | 4.10 (3.40-6.40, 3) | 1.10 (1.00-1.20, 3) | 44.3 (32.8-44.6, 3) | 0.27                | 10.80               | -                   |
| Step with readback (ms)  | 4.20 (3.70-5.90, 3) | 0.00 (0.00-0.00, 3) | 13.5 (12.2-14.1, 3) | 0.00                | 3.21                | -                   |

| Build   | Runs counted | Runs void (load above 8) | Load before | Load after | Failures |
| ------- | ------------ | ------------------------ | ----------- | ---------- | -------- |
| cosmos  | 3            | 0                        | 1.5-7.3     | 1.6-6.9    | -        |
| batched | 3            | 0                        | 1.9-6.9     | 2.4-23.1   | -        |
| objects | 3            | 0                        | 1.6-3.1     | 1.5-12.4   | -        |

### 10k + 100k

| Metric                   | cosmos              | batched              | objects             | reference           | batched / cosmos.gl | objects / cosmos.gl | reference / cosmos.gl | batched / reference |
| ------------------------ | ------------------- | -------------------- | ------------------- | ------------------- | ------------------- | ------------------- | --------------------- | ------------------- |
| First frame (s)          | 0.15 (0.14-0.23, 5) | 0.41 (0.37-0.53, 10) | 1.70 (1.57-2.06, 6) | 2.25 (2.06-2.44, 5) | 2.69                | 11.27               | 14.85                 | 0.18                |
| Still median (ms)        | 3.60 (3.50-4.70, 5) | 7.75 (7.60-8.40, 10) | 30.6 (28.1-33.5, 6) | 29.8 (14.8-34.8, 5) | 2.15                | 8.51                | 8.28                  | 0.26                |
| Still p99 (ms)           | 7.20 (6.40-8.60, 5) | 9.50 (8.20-25.5, 10) | 39.5 (31.6-42.4, 6) | 39.1 (32.9-42.8, 5) | 1.32                | 5.48                | 5.43                  | 0.24                |
| Moving median (ms)       | 3.50 (3.40-4.40, 5) | 7.85 (7.70-8.40, 10) | 36.5 (32.1-42.9, 6) | 37.3 (33.1-40.2, 5) | 2.24                | 10.43               | 10.66                 | 0.21                |
| Moving p99 (ms)          | 4.50 (4.00-5.50, 5) | 11.4 (8.70-25.7, 10) | 54.3 (46.3-64.1, 6) | 54.8 (51.4-56.2, 5) | 2.53                | 12.06               | 12.18                 | 0.21                |
| Drag median (ms)         | -                   | 7.90 (7.60-8.20, 10) | 39.0 (25.0-41.4, 6) | 45.3 (40.2-51.9, 5) | -                   | -                   | -                     | 0.17                |
| Hover median (ms)        | 3.70 (3.65-4.70, 5) | 0.95 (0.75-2.45, 10) | 3.35 (2.85-5.75, 6) | 2.95 (2.15-5.15, 5) | 0.26                | 0.91                | 0.80                  | 0.32                |
| JS heap (MB)             | 23.0 (23.0-23.0, 5) | 81.0 (81.0-81.0, 10) | 286 (286-286, 6)    | 333 (333-333, 5)    | 3.52                | 12.43               | 14.48                 | 0.24                |
| Layout frame median (ms) | 3.70 (3.60-3.90, 5) | 7.80 (7.40-9.20, 10) | 145 (136-168, 6)    | -                   | 2.11                | 39.22               | -                     | -                   |
| Step with readback (ms)  | 3.10 (3.00-3.70, 5) | 5.55 (2.30-5.90, 10) | 6.45 (3.10-11.0, 6) | -                   | 1.79                | 2.08                | -                     | -                   |

| Build     | Runs counted | Runs void (load above 8) | Load before | Load after | Failures                                                                        |
| --------- | ------------ | ------------------------ | ----------- | ---------- | ------------------------------------------------------------------------------- |
| cosmos    | 5            | 0                        | 3.4-6.1     | 3.4-6.2    | -                                                                               |
| batched   | 10           | 0                        | 1.5-7.7     | 2.4-28.5   | -                                                                               |
| objects   | 6            | 1                        | 2.4-8.4     | 2.1-16.7   | -                                                                               |
| reference | 5            | 0                        | 2.1-7.3     | 1.7-6.1    | page.evaluate: GraphtyError: A selection target is { nodes, edges }, { where }, |

### 100k + 1k

| Metric                   | cosmos              | batched             | columns             | objects             | batched / cosmos.gl | columns / cosmos.gl | objects / cosmos.gl | batched / reference |
| ------------------------ | ------------------- | ------------------- | ------------------- | ------------------- | ------------------- | ------------------- | ------------------- | ------------------- |
| First frame (s)          | 0.12 (0.11-0.13, 5) | 0.47 (0.46-0.48, 5) | 0.56 (0.55-0.56, 5) | 3.58 (3.49-3.75, 5) | 4.03                | 4.73                | 30.50               | -                   |
| Still median (ms)        | 1.50 (1.00-1.90, 5) | 1.90 (1.70-2.10, 5) | 1.80 (1.60-2.10, 5) | 60.4 (53.6-61.2, 5) | 1.27                | 1.20                | 40.27               | -                   |
| Still p99 (ms)           | 2.80 (2.30-3.80, 5) | 3.50 (2.80-3.80, 5) | 3.00 (2.30-4.30, 5) | 74.7 (72.7-84.5, 5) | 1.25                | 1.07                | 26.68               | -                   |
| Moving median (ms)       | 1.00 (0.50-1.50, 5) | 0.90 (0.70-1.40, 5) | 0.80 (0.80-1.40, 5) | 98.8 (96.3-105, 5)  | 0.90                | 0.80                | 98.80               | -                   |
| Moving p99 (ms)          | 2.30 (1.20-2.80, 5) | 2.20 (1.80-2.80, 5) | 2.30 (1.70-5.10, 5) | 136 (135-140, 5)    | 0.96                | 1.00                | 59.26               | -                   |
| Drag median (ms)         | -                   | 1.00 (0.70-1.60, 5) | 0.90 (0.80-1.20, 5) | 91.1 (85.1-95.0, 5) | -                   | -                   | -                   | -                   |
| Hover median (ms)        | 1.45 (1.20-1.80, 5) | 1.90 (1.65-2.55, 5) | 2.00 (1.25-2.15, 5) | 29.9 (26.3-31.2, 5) | 1.31                | 1.38                | 20.59               | -                   |
| JS heap (MB)             | 19.0 (19.0-19.0, 5) | 106 (106-106, 5)    | 92.0 (92.0-92.0, 5) | 960 (960-960, 5)    | 5.58                | 4.84                | 50.53               | -                   |
| Layout frame median (ms) | 7.30 (6.20-7.90, 5) | 5.90 (5.90-6.00, 5) | -                   | 283 (279-295, 5)    | 0.81                | -                   | 38.81               | -                   |
| Step with readback (ms)  | 8.80 (7.40-10.8, 5) | 4.40 (3.70-4.70, 5) | -                   | 51.9 (49.1-58.3, 5) | 0.50                | -                   | 5.90                | -                   |

| Build   | Runs counted | Runs void (load above 8) | Load before | Load after | Failures |
| ------- | ------------ | ------------------------ | ----------- | ---------- | -------- |
| cosmos  | 5            | 0                        | 1.3-5.1     | 2.2-7.7    | -        |
| batched | 5            | 0                        | 1.8-7.7     | 1.9-6.3    | -        |
| columns | 5            | 0                        | 1.9-6.3     | 1.8-5.1    | -        |
| objects | 5            | 0                        | 1.8-3.3     | 1.6-3.0    | -        |

### 100k + 1M

| Metric                   | cosmos              | batched             | columns             | objects             | reference           | batched / cosmos.gl | columns / cosmos.gl | objects / cosmos.gl | reference / cosmos.gl | batched / reference |
| ------------------------ | ------------------- | ------------------- | ------------------- | ------------------- | ------------------- | ------------------- | ------------------- | ------------------- | --------------------- | ------------------- |
| First frame (s)          | 0.56 (0.55-0.61, 5) | 3.47 (3.00-5.60, 5) | 4.02 (3.84-4.32, 5) | 22.9 (22.7-31.6, 5) | 38.5 (35.4-46.1, 6) | 6.18                | 7.17                | 40.92               | 68.67                 | 0.09                |
| Still median (ms)        | 28.7 (28.3-29.0, 5) | 73.3 (72.8-73.8, 5) | 73.0 (72.7-73.1, 5) | 132 (130-132, 5)    | 133 (121-137, 6)    | 2.55                | 2.54                | 4.59                | 4.62                  | 0.55                |
| Still p99 (ms)           | 29.4 (29.0-32.5, 5) | 79.8 (74.2-88.1, 5) | 89.1 (75.2-89.3, 5) | 151 (149-199, 5)    | 153 (148-205, 6)    | 2.71                | 3.03                | 5.14                | 5.21                  | 0.52                |
| Moving median (ms)       | 28.7 (28.5-29.0, 5) | 73.5 (73.1-74.1, 5) | 73.5 (73.3-73.6, 5) | 183 (168-200, 5)    | 173 (165-189, 6)    | 2.56                | 2.56                | 6.37                | 6.02                  | 0.43                |
| Moving p99 (ms)          | 29.8 (29.4-33.0, 5) | 75.5 (74.7-75.8, 5) | 75.5 (74.4-79.4, 5) | 233 (226-410, 5)    | 214 (204-393, 6)    | 2.53                | 2.53                | 7.81                | 7.17                  | 0.35                |
| Drag median (ms)         | -                   | 73.5 (73.2-73.9, 5) | 73.6 (73.3-73.9, 5) | 200 (176-229, 5)    | 467 (440-579, 6)    | -                   | -                   | -                   | -                     | 0.16                |
| Hover median (ms)        | 28.6 (28.4-57.2, 5) | 1.75 (1.60-2.45, 5) | 1.75 (1.55-2.60, 5) | 30.3 (24.1-41.1, 5) | 30.3 (23.4-40.6, 6) | 0.06                | 0.06                | 1.06                | 1.06                  | 0.06                |
| JS heap (MB)             | 161 (161-161, 5)    | 461 (461-461, 5)    | 405 (405-405, 5)    | 2473 (2472-2473, 5) | 2848 (2848-2848, 6) | 2.86                | 2.52                | 15.36               | 17.69                 | 0.16                |
| Layout frame median (ms) | 6.70 (6.60-13.3, 5) | 77.5 (75.9-82.5, 5) | -                   | 1674 (1616-1966, 5) | -                   | 11.57               | -                   | 249.91              | -                     | -                   |
| Step with readback (ms)  | 8.00 (7.60-9.80, 5) | 45.8 (43.9-46.8, 5) | -                   | 122 (116-132, 5)    | -                   | 5.72                | -                   | 15.20               | -                     | -                   |

| Build     | Runs counted | Runs void (load above 8) | Load before | Load after | Failures                                                                        |
| --------- | ------------ | ------------------------ | ----------- | ---------- | ------------------------------------------------------------------------------- |
| cosmos    | 5            | 0                        | 1.7-6.9     | 2.3-5.4    | -                                                                               |
| batched   | 5            | 0                        | 1.4-5.3     | 1.8-6.7    | -                                                                               |
| columns   | 5            | 0                        | 1.8-8.0     | 1.5-6.9    | -                                                                               |
| objects   | 5            | 0                        | 1.8-6.7     | 1.9-8.0    | -                                                                               |
| reference | 6            | 0                        | 1.8-7.6     | 1.8-14.9   | page.evaluate: GraphtyError: A selection target is { nodes, edges }, { where }, |

### 1M + 10k

| Metric                   | cosmos              | batched+limits      | columns+limits      | batched+limits / cosmos.gl | columns+limits / cosmos.gl | batched / reference |
| ------------------------ | ------------------- | ------------------- | ------------------- | -------------------------- | -------------------------- | ------------------- |
| First frame (s)          | 0.45 (0.45-0.49, 3) | 4.38 (4.33-4.42, 3) | 5.07 (5.04-5.47, 3) | 9.66                       | 11.17                      | -                   |
| Still median (ms)        | 2.10 (1.80-2.20, 3) | 4.80 (4.50-5.20, 3) | 4.30 (4.20-4.50, 3) | 2.29                       | 2.05                       | -                   |
| Still p99 (ms)           | 7.80 (7.50-8.60, 3) | 8.20 (7.70-8.80, 3) | 8.00 (6.40-22.1, 3) | 1.05                       | 1.03                       | -                   |
| Moving median (ms)       | 2.00 (1.50-2.00, 3) | 5.00 (4.80-5.00, 3) | 4.90 (4.30-4.90, 3) | 2.50                       | 2.45                       | -                   |
| Moving p99 (ms)          | 3.00 (2.20-3.60, 3) | 8.10 (6.00-9.10, 3) | 5.90 (5.50-6.20, 3) | 2.70                       | 1.97                       | -                   |
| Drag median (ms)         | -                   | 4.80 (4.50-4.90, 3) | 4.90 (4.10-4.90, 3) | -                          | -                          | -                   |
| Hover median (ms)        | 3.00 (1.70-3.10, 3) | 5.70 (5.30-5.95, 3) | 5.80 (4.40-5.95, 3) | 1.90                       | 1.93                       | -                   |
| JS heap (MB)             | 131 (131-131, 3)    | 695 (695-695, 3)    | 561 (561-561, 3)    | 5.31                       | 4.28                       | -                   |
| Layout frame median (ms) | 34.8 (33.4-36.9, 3) | 60.6 (60.2-61.0, 3) | -                   | 1.74                       | -                          | -                   |
| Step with readback (ms)  | 58.3 (47.3-58.8, 3) | 21.7 (19.8-22.0, 3) | -                   | 0.37                       | -                          | -                   |

| Build          | Runs counted | Runs void (load above 8) | Load before | Load after | Failures |
| -------------- | ------------ | ------------------------ | ----------- | ---------- | -------- |
| cosmos         | 3            | 0                        | 1.8-4.4     | 1.3-4.3    | -        |
| batched+limits | 3            | 0                        | 1.3-1.7     | 1.3-2.4    | -        |
| columns+limits | 3            | 0                        | 1.6-4.3     | 1.7-4.4    | -        |

### 1M + 1M

| Metric                   | cosmos              | batched+limits      | columns+limits      | objects | reference | batched+limits / cosmos.gl | columns+limits / cosmos.gl | objects / cosmos.gl | reference / cosmos.gl | batched / reference |
| ------------------------ | ------------------- | ------------------- | ------------------- | ------- | --------- | -------------------------- | -------------------------- | ------------------- | --------------------- | ------------------- |
| First frame (s)          | 0.92 (0.91-0.94, 3) | 9.97 (9.26-10.8, 7) | 9.81 (9.46-10.1, 3) | -       | -         | 10.86                      | 10.68                      | -                   | -                     | -                   |
| Still median (ms)        | 29.3 (29.1-29.8, 3) | 76.3 (76.0-76.8, 7) | 76.3 (76.0-76.4, 3) | -       | -         | 2.60                       | 2.60                       | -                   | -                     | -                   |
| Still p99 (ms)           | 30.9 (29.8-31.5, 3) | 83.1 (78.1-93.4, 7) | 79.6 (79.6-81.6, 3) | -       | -         | 2.69                       | 2.58                       | -                   | -                     | -                   |
| Moving median (ms)       | 30.1 (29.4-30.2, 3) | 76.9 (76.3-77.1, 7) | 76.6 (76.3-76.7, 3) | -       | -         | 2.55                       | 2.54                       | -                   | -                     | -                   |
| Moving p99 (ms)          | 31.5 (30.5-32.6, 3) | 78.5 (77.8-78.8, 7) | 77.9 (77.2-79.3, 3) | -       | -         | 2.49                       | 2.47                       | -                   | -                     | -                   |
| Drag median (ms)         | -                   | 76.8 (76.1-77.2, 7) | 76.2 (76.1-76.7, 3) | -       | -         | -                          | -                          | -                   | -                     | -                   |
| Hover median (ms)        | 59.7 (58.4-60.7, 3) | 6.75 (4.80-7.45, 7) | 6.35 (4.75-7.15, 3) | -       | -         | 0.11                       | 0.11                       | -                   | -                     | -                   |
| JS heap (MB)             | 270 (270-270, 3)    | 1058 (1058-1058, 7) | 871 (871-871, 3)    | -       | -         | 3.92                       | 3.23                       | -                   | -                     | -                   |
| Layout frame median (ms) | 26.9 (22.1-27.2, 3) | 127 (122-129, 7)    | -                   | -       | -         | 4.73                       | -                          | -                   | -                     | -                   |
| Step with readback (ms)  | 49.9 (45.3-56.4, 3) | 100 (91.9-101, 3)   | -                   | -       | -         | 2.01                       | -                          | -                   | -                     | -                   |

| Build          | Runs counted | Runs void (load above 8) | Load before | Load after | Failures                                                                         |
| -------------- | ------------ | ------------------------ | ----------- | ---------- | -------------------------------------------------------------------------------- |
| cosmos         | 3            | 0                        | 2.0-2.6     | 1.3-2.7    | -                                                                                |
| batched+limits | 7            | 0                        | 1.8-7.8     | 1.1-24.8   | did not finish in 10 minutes                                                     |
| columns+limits | 3            | 0                        | 1.2-2.4     | 1.5-2.4    | -                                                                                |
| objects        | 3            | 0                        | 2.0-2.4     | 2.0-2.4    | load failed: Loading 1,000,000 more nodes would take the graph to 1,000,000, pas |
| reference      | 3            | 0                        | 2.0-2.4     | 2.0-2.4    | load failed: Loading 1,000,000 more nodes would take the graph to 1,000,000, pas |

### Stability check: batched, 100k + 1M, at two load levels

| Metric                   | Low load (3.06, 2.27, 5.25, 4.66, 1.44) | High load (13.34, 15.66, 9.27) | High / low |
| ------------------------ | --------------------------------------- | ------------------------------ | ---------- |
| First frame (s)          | 3.47 (3.00-5.60, 5)                     | 5.31 (4.02-5.41, 3)            | 1.53       |
| Still median (ms)        | 73.3 (72.8-73.8, 5)                     | 73.5 (72.7-73.5, 3)            | 1.00       |
| Still p99 (ms)           | 79.8 (74.2-88.1, 5)                     | 75.7 (74.6-90.6, 3)            | 0.95       |
| Moving median (ms)       | 73.5 (73.1-74.1, 5)                     | 73.7 (73.2-73.9, 3)            | 1.00       |
| Moving p99 (ms)          | 75.5 (74.7-75.8, 5)                     | 75.1 (74.8-76.1, 3)            | 0.99       |
| Drag median (ms)         | 73.5 (73.2-73.9, 5)                     | 74.0 (73.2-74.0, 3)            | 1.01       |
| Hover median (ms)        | 1.75 (1.60-2.45, 5)                     | 1.55 (1.55-1.85, 3)            | 0.89       |
| JS heap (MB)             | 461 (461-461, 5)                        | 461 (461-461, 3)               | 1.00       |
| Layout frame median (ms) | 77.5 (75.9-82.5, 5)                     | 77.9 (75.5-78.3, 3)            | 1.01       |
| Step with readback (ms)  | 45.8 (43.9-46.8, 5)                     | 45.2 (43.6-46.0, 3)            | 0.99       |

The `batched / reference` column compares with the reference build where it ran: 10k + 100k, 100k + 1M and 1M + 1M.

## Notes on the runs

- **Hover while the layout runs is not measured.** The harness picks ten hover targets, then moves the pointer to each;
  under a running layout the node has moved before the pointer arrives, so no hover is reported and the run records
  `">180000"`, for cosmos.gl as well as graphty-element. It is a limit of the harness, not of either renderer.
- **The reference build has no hover or layout figures.** It predates the selection API the harness's hover now calls, so
  its runs stop at hover with `GraphtyError: A selection target is { nodes, edges }, { where } ...`.
- **1M + 1M batched with the layout.** Four runs before 04:59 PT crashed the page 168-175 s in, inside the harness's
  position-repack measure: it called `graph.getNodes()`, which on the batched path builds every node the element had left
  unbuilt, and the renderer grew to about 6 GB. The harness now skips that walk at 1,000,000 nodes (e56c325637), and the
  three runs after it finish, layout included. The element defect is issue #8169, not fixed here. The crashed runs' load,
  still, orbit, drag and hover figures are counted; the layout-step figures come only from the three runs after the fix.
- **Bench servers stopped from outside.** Something outside this session stopped the bench servers through servherd three
  times (SIGINT at 00:13:56, 02:45:36 and 05:02:48 PT). They were restarted; no counted run was lost to it.
