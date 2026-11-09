# Interim check against cosmos.gl: batched and object render paths

An interim measurement of graphty-element against cosmos.gl 3.5.1, to tell whether the row renderer
(`design/rendering/row-renderer.md`) is on track to close the gap. Three builds were measured in one session, interleaved
round by round with the order rotated each round:

- **cosmos.gl**: cosmos.gl 3.5.1 on the benchmark page (`benchmarks/compare`).
- **batched**: graphty-element at origin/master 02d59ed61436f0210ef15777abdb3fc0487dfb4b with `renderPath` `"batched"`.
- **objects**: the same commit and page with `renderPath` `"objects"` (the element's default).

All runs are 2D lean (box nodes, no arrowheads), device pixel ratio 1, static layout (`skip-layout`), WebGL on the
RTX 4070 SUPER (0 void rows), working tree clean. Rows: 78, from 2026-11-08 18:57 to 19:44 PT. Five rounds at 10,000 nodes
(with 100,000 and with 100 edges), at 100,000 nodes with 1,000 edges and at 100,000 nodes with 1,000,000 edges; three rounds
at 1,000,000 nodes (with 1,000,000 and with 10,000 edges). The machine was shared with other sessions: the one-minute load
average was 2-22 as runs began; every row records `loadavgBefore` and `loadavgAfter`, and every run held the GPU lock.

A cell is the median across runs of each run's own figure (its median frame, its p99, the median of its ten hover
latencies), then the range of those run figures and the number of runs. Ratios are of the medians; below 1 means
batched is faster or smaller.

## What the batched path does in these runs

- **Nodes**: every node is on a batch (`rowCounts.objectNodes` 0 after the load and after the drag, in every batched run).
- **Batched (pulled) edges: not in effect.** `rowCounts.pulledEdges` is 0 in every batched run: a 2D solid line is a flat
  rectangle, which `Edge.pullsLine` refuses, so every edge is still an object edge drawn from a placed line batch. The 3D
  `default` look does not pull either, because its arrowheads need pulled caps.
- **Pulled caps**: off (the default, `pulledCapsOn` false), and the lean look has no caps.
- **Curves on the row table**: not exercised; the benchmark graph has only straight edges.
- **GPU fill of the row table**: not exercised; it runs while a GPU layout steps, and these runs use the static layout.

A separate probe (not in `results.jsonl`) shows what pulled edges do to the million-edge frame: the 3D view with the lean
styles, where all 1,000,000 edges are pulled (`rowCounts.pulledEdges` 1,000,000). One run each, load average 17-23:
batched moving frame 77.3 ms (p99 95.3), still 92.5 ms; objects moving 227 ms, still 145 ms. The batched frame is the same
as the 2D one with placed edges, and the CPU profile of it is 81% waiting on the GPU.

## Results

| Configuration         | Metric                   | cosmos.gl             | batched               | objects               | batched / cosmos.gl | batched / objects |
| --------------------- | ------------------------ | --------------------- | --------------------- | --------------------- | ------------------- | ----------------- |
| 10k nodes, 100 edges  | First frame (s)          | 0.13 (0.09-0.15, n=5) | 0.61 (0.52-0.66, n=5) | 0.56 (0.49-0.79, n=5) | 4.80                | 1.09              |
| 10k nodes, 100 edges  | Still frame median (ms)  | 0.90 (0.70-1.00, n=5) | 19.0 (2.50-19.2, n=5) | 22.5 (10.0-23.2, n=5) | 21.11               | 0.84              |
| 10k nodes, 100 edges  | Still frame p99 (ms)     | 1.40 (0.90-1.60, n=5) | 20.3 (20.0-22.2, n=5) | 27.7 (26.8-30.1, n=5) | 14.50               | 0.73              |
| 10k nodes, 100 edges  | Moving frame median (ms) | 0.60 (0.40-1.10, n=5) | 19.3 (18.8-19.7, n=5) | 27.1 (17.2-31.8, n=5) | 32.17               | 0.71              |
| 10k nodes, 100 edges  | Moving frame p99 (ms)    | 1.10 (0.90-2.80, n=5) | 20.8 (20.3-22.4, n=5) | 42.6 (41.0-68.0, n=5) | 18.91               | 0.49              |
| 10k nodes, 100 edges  | Drag frame median (ms)   | -                     | 19.7 (3.40-20.1, n=5) | 26.9 (15.8-30.7, n=5) | -                   | 0.73              |
| 10k nodes, 100 edges  | Hover median (ms)        | 0.85 (0.65-1.05, n=5) | 1.95 (1.95-2.00, n=5) | 3.70 (3.10-6.75, n=5) | 2.29                | 0.53              |
| 10k nodes, 100 edges  | JS heap (MB)             | 8.00 (8.00-8.00, n=5) | 89.0 (89.0-89.0, n=5) | 139 (139-140, n=5)    | 11.13               | 0.64              |
| 10k nodes, 100k edges | First frame (s)          | 0.44 (0.22-0.51, n=5) | 2.89 (2.45-3.47, n=5) | 2.79 (2.46-3.42, n=5) | 6.51                | 1.03              |
| 10k nodes, 100k edges | Still frame median (ms)  | 3.90 (3.70-4.10, n=5) | 25.8 (25.7-26.4, n=5) | 34.5 (32.9-36.1, n=5) | 6.62                | 0.75              |
| 10k nodes, 100k edges | Still frame p99 (ms)     | 7.70 (7.00-8.70, n=5) | 28.1 (26.9-28.9, n=5) | 41.2 (39.1-48.0, n=5) | 3.65                | 0.68              |
| 10k nodes, 100k edges | Moving frame median (ms) | 3.70 (3.70-4.10, n=5) | 26.6 (26.1-27.5, n=5) | 47.4 (41.9-49.2, n=5) | 7.19                | 0.56              |
| 10k nodes, 100k edges | Moving frame p99 (ms)    | 4.60 (4.40-7.50, n=5) | 28.8 (28.3-31.8, n=5) | 68.2 (62.3-75.9, n=5) | 6.26                | 0.42              |
| 10k nodes, 100k edges | Drag frame median (ms)   | -                     | 28.9 (27.6-30.5, n=5) | 45.5 (42.1-49.8, n=5) | -                   | 0.64              |
| 10k nodes, 100k edges | Hover median (ms)        | 4.35 (4.30-4.70, n=5) | 1.20 (1.20-1.40, n=5) | 4.60 (2.75-5.95, n=5) | 0.28                | 0.26              |
| 10k nodes, 100k edges | JS heap (MB)             | 23.0 (23.0-23.0, n=5) | 250 (249-250, n=5)    | 299 (299-300, n=5)    | 10.87               | 0.84              |
| 100k nodes, 1k edges  | First frame (s)          | 0.16 (0.14-0.27, n=5) | 5.20 (4.74-7.92, n=5) | 4.98 (4.32-5.05, n=5) | 33.51               | 1.04              |
| 100k nodes, 1k edges  | Still frame median (ms)  | 1.30 (1.20-1.40, n=5) | 23.5 (23.0-23.6, n=5) | 68.5 (65.0-80.7, n=5) | 18.08               | 0.34              |
| 100k nodes, 1k edges  | Still frame p99 (ms)     | 2.00 (1.80-2.10, n=5) | 25.0 (24.5-26.9, n=5) | 116 (107-152, n=5)    | 12.50               | 0.22              |
| 100k nodes, 1k edges  | Moving frame median (ms) | 0.80 (0.50-1.10, n=5) | 23.7 (23.0-24.0, n=5) | 101 (93.4-117, n=5)   | 29.62               | 0.24              |
| 100k nodes, 1k edges  | Moving frame p99 (ms)    | 1.30 (1.00-1.80, n=5) | 25.2 (24.8-27.4, n=5) | 276 (171-306, n=5)    | 19.38               | 0.09              |
| 100k nodes, 1k edges  | Drag frame median (ms)   | -                     | 30.3 (26.9-33.5, n=5) | 89.7 (82.7-96.2, n=5) | -                   | 0.34              |
| 100k nodes, 1k edges  | Hover median (ms)        | 0.90 (0.85-1.65, n=5) | 4.60 (2.90-5.05, n=5) | 19.9 (19.8-20.8, n=5) | 5.11                | 0.23              |
| 100k nodes, 1k edges  | JS heap (MB)             | 19.0 (19.0-19.0, n=5) | 454 (454-454, n=5)    | 961 (961-961, n=5)    | 23.89               | 0.47              |
| 100k nodes, 1M edges  | First frame (s)          | 0.63 (0.56-0.64, n=5) | 27.1 (25.3-30.2, n=5) | 25.7 (24.8-31.6, n=5) | 42.87               | 1.05              |
| 100k nodes, 1M edges  | Still frame median (ms)  | 28.4 (28.2-29.2, n=5) | 89.6 (89.5-90.1, n=5) | 130 (130-131, n=5)    | 3.15                | 0.69              |
| 100k nodes, 1M edges  | Still frame p99 (ms)     | 29.1 (28.7-31.0, n=5) | 92.1 (91.6-93.4, n=5) | 164 (157-190, n=5)    | 3.16                | 0.56              |
| 100k nodes, 1M edges  | Moving frame median (ms) | 28.6 (28.4-28.9, n=5) | 90.0 (89.7-90.2, n=5) | 170 (168-171, n=5)    | 3.15                | 0.53              |
| 100k nodes, 1M edges  | Moving frame p99 (ms)    | 30.1 (29.5-31.0, n=5) | 92.1 (91.7-93.4, n=5) | 221 (206-257, n=5)    | 3.06                | 0.42              |
| 100k nodes, 1M edges  | Drag frame median (ms)   | -                     | 107 (107-118, n=5)    | 174 (170-184, n=5)    | -                   | 0.62              |
| 100k nodes, 1M edges  | Hover median (ms)        | 28.5 (28.4-56.5, n=5) | 1.65 (1.50-1.75, n=5) | 23.4 (21.3-26.3, n=5) | 0.06                | 0.07              |
| 100k nodes, 1M edges  | JS heap (MB)             | 161 (161-161, n=5)    | 1994 (1994-1994, n=5) | 2501 (2501-2501, n=5) | 12.39               | 0.80              |
| 1M nodes, 10k edges   | First frame (s)          | 0.67 (0.60-0.68, n=3) | -                     | -                     | -                   | -                 |
| 1M nodes, 10k edges   | Still frame median (ms)  | 1.50 (1.40-1.80, n=3) | -                     | -                     | -                   | -                 |
| 1M nodes, 10k edges   | Still frame p99 (ms)     | 7.40 (7.20-7.60, n=3) | -                     | -                     | -                   | -                 |
| 1M nodes, 10k edges   | Moving frame median (ms) | 1.40 (1.40-1.50, n=3) | -                     | -                     | -                   | -                 |
| 1M nodes, 10k edges   | Moving frame p99 (ms)    | 2.20 (2.00-2.30, n=3) | -                     | -                     | -                   | -                 |
| 1M nodes, 10k edges   | Hover median (ms)        | 1.70 (1.60-1.70, n=3) | -                     | -                     | -                   | -                 |
| 1M nodes, 10k edges   | JS heap (MB)             | 131 (131-131, n=3)    | -                     | -                     | -                   | -                 |
| 1M nodes, 1M edges    | First frame (s)          | 1.09 (1.07-1.12, n=3) | -                     | -                     | -                   | -                 |
| 1M nodes, 1M edges    | Still frame median (ms)  | 29.1 (29.1-29.1, n=3) | -                     | -                     | -                   | -                 |
| 1M nodes, 1M edges    | Still frame p99 (ms)     | 30.0 (29.8-30.8, n=3) | -                     | -                     | -                   | -                 |
| 1M nodes, 1M edges    | Moving frame median (ms) | 29.3 (29.3-29.4, n=3) | -                     | -                     | -                   | -                 |
| 1M nodes, 1M edges    | Moving frame p99 (ms)    | 31.5 (30.7-31.8, n=3) | -                     | -                     | -                   | -                 |
| 1M nodes, 1M edges    | Hover median (ms)        | 29.2 (29.1-58.2, n=3) | -                     | -                     | -                   | -                 |
| 1M nodes, 1M edges    | JS heap (MB)             | 270 (270-270, n=3)    | -                     | -                     | -                   | -                 |

| Configuration         | Build   | Runs | Load average before | Load average after | Failures                                                                                   |
| --------------------- | ------- | ---- | ------------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| 10k nodes, 100 edges  | cosmos  | 5    | 6-17                | 6-16               | -                                                                                          |
| 10k nodes, 100 edges  | batched | 5    | 6-18                | 6-16               | -                                                                                          |
| 10k nodes, 100 edges  | objects | 5    | 6-16                | 6-17               | -                                                                                          |
| 10k nodes, 100k edges | cosmos  | 5    | 14-22               | 13-24              | -                                                                                          |
| 10k nodes, 100k edges | batched | 5    | 15-21               | 15-23              | -                                                                                          |
| 10k nodes, 100k edges | objects | 5    | 15-19               | 13-21              | -                                                                                          |
| 100k nodes, 1k edges  | cosmos  | 5    | 6-17                | 7-18               | -                                                                                          |
| 100k nodes, 1k edges  | batched | 5    | 7-18                | 6-20               | -                                                                                          |
| 100k nodes, 1k edges  | objects | 5    | 8-20                | 8-18               | -                                                                                          |
| 100k nodes, 1M edges  | cosmos  | 5    | 3-8                 | 2-10               | -                                                                                          |
| 100k nodes, 1M edges  | batched | 5    | 2-11                | 3-11               | -                                                                                          |
| 100k nodes, 1M edges  | objects | 5    | 4-11                | 5-11               | -                                                                                          |
| 1M nodes, 10k edges   | cosmos  | 3    | 7-10                | 7-10               | -                                                                                          |
| 1M nodes, 10k edges   | batched | 3    | 8-10                | 8-9                | load failed: Loading 1,000,000 more nodes would take the graph to 1,000,000, past the 100, |
| 1M nodes, 10k edges   | objects | 3    | 7-9                 | 7-9                | load failed: Loading 1,000,000 more nodes would take the graph to 1,000,000, past the 100, |
| 1M nodes, 1M edges    | cosmos  | 3    | 7-9                 | 7-9                | -                                                                                          |
| 1M nodes, 1M edges    | batched | 3    | 7-9                 | 7-9                | load failed: Loading 1,000,000 more nodes would take the graph to 1,000,000, past the 100, |
| 1M nodes, 1M edges    | objects | 3    | 7-9                 | 7-10               | load failed: Loading 1,000,000 more nodes would take the graph to 1,000,000, past the 100, |

## Notes

- **Small frames are the element's pacing floor, not its drawing cost.** At 10,000 nodes, and at 100,000 nodes with few
  edges, the batched frame sits at 18-24 ms while cosmos.gl draws in 1-4 ms. A probe at 10,000 nodes and 100 edges found
  the page's animation frame firing every 1.2 ms, and the element's frame loop skipping 174 of 426 ticks as
  `gpuBehind` (its fence after the previous frame not yet signalled); the CPU profile of that stage is 83% idle. The
  serial still frame of the same probe ran at 1.5 ms median in one run and 19 ms in others. So below about 20 ms these
  rows measure how often the element's fence lets it draw, and the ratios against cosmos.gl at those sizes are upper
  bounds on the real cost, not the cost.
- **1,000,000 nodes is refused.** Both render paths end the load in about 2 s with `E_TOO_LARGE` ("Loading 1,000,000 more
  nodes would take the graph to 1,000,000, past the 100,000 this renderer can draw"). The ceiling is
  `DEFAULT_LIMITS.renderCeiling`, read directly by the ingest; no consumer option raises it yet (the `limits` option is
  planned with the ceiling stage), so no million-node figure for graphty-element exists in this run.
- **Load.** cosmos.gl's first frame is from `setPointPositions`/`setLinks` of typed arrays; graphty-element's is from
  `nodeData`/`edgeData` arrays of records. The column door planned in the design is the like-for-like input.
