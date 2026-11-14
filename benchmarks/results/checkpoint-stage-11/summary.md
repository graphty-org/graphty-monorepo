# Checkpoint after stage 11 of the row renderer: batched nodes against object nodes

Stage 11 of `design/rendering/row-renderer.md` took the hidden per-node meshes away from batched nodes. Edges are still one
object each on both render paths, so this run separates the node work by adding configurations with one edge per hundred nodes.

- Builds, measured in one session and interleaved round by round (A, B, R, rotating the order each round):
    - **master objects**: commit 681c287ae0ba2f4e3e57a102a515a04723417bf0 with `renderPath` `"objects"` (the element's default)
    - **master batched**: the same commit and page with `renderPath` `"batched"`
    - **reference**: commit 57c0ee700e513ae3f9c812c6a28a4ea231971e03, the build in `benchmarks/results/reference`, default path
- All runs 2D lean, device pixel ratio 1, WebGL on the RTX 4070 SUPER (0 void rows), Chromium 143, working trees clean.
- Rows: 66, from 2026-11-07 11:13 to 12:43 PT. 6 rounds at 10,000 nodes and at the few-edge 100,000-node size, 3 at 100,000 nodes
  with 1,000,000 edges, 1 at 1,000,000 nodes.
- The page of all three builds is this pull request's `benchmarks/compare`. Its drag stage reads `drawnPosition`, which the
  reference build does not have; the first three reference runs (round 1 of the three short configurations) ended at the drag stage
  with a TypeError and keep only first frame, still and moving frame. The page now falls back to the node's mesh position, and every
  later reference run is complete.
- The load average was 9-40 when runs began, falling over the session (10-40 in round 1, 11-22 from round 3). Each row records
  `loadavgBefore` and `loadavgAfter`.

A cell is the median across runs of each run's own figure (its median frame, or its p99), then the range of those run figures and
the number of runs. Ratios are of the medians; below 1 is faster or smaller.

| Configuration         | Metric                       | master objects           | master batched           | reference                | batched / objects | objects / reference | batched / reference |
| --------------------- | ---------------------------- | ------------------------ | ------------------------ | ------------------------ | ----------------- | ------------------- | ------------------- |
| 10k nodes, 100k edges | First frame (s)              | 3.71 (2.95-5.60, n=6)    | 3.33 (2.84-6.42, n=6)    | 3.98 (2.30-5.82, n=6)    | 0.90              | 0.93                | 0.84                |
| 10k nodes, 100k edges | Still frame median (ms)      | 34.9 (33.1-36.0, n=6)    | 26.5 (25.9-27.3, n=6)    | 35.2 (31.6-37.0, n=6)    | 0.76              | 0.99                | 0.75                |
| 10k nodes, 100k edges | Still frame p99 (ms)         | 41.2 (38.8-44.3, n=6)    | 28.6 (27.3-31.3, n=6)    | 41.5 (36.1-43.0, n=6)    | 0.69              | 0.99                | 0.69                |
| 10k nodes, 100k edges | Moving frame median (ms)     | 50.0 (40.9-59.4, n=6)    | 27.4 (26.5-27.8, n=6)    | 51.4 (39.7-55.2, n=6)    | 0.55              | 0.97                | 0.53                |
| 10k nodes, 100k edges | Moving frame p99 (ms)        | 71.4 (65.8-79.5, n=6)    | 30.8 (29.3-36.1, n=6)    | 71.7 (58.1-128, n=6)     | 0.43              | 1.00                | 0.43                |
| 10k nodes, 100k edges | Drag frame median (ms)       | 50.6 (44.1-68.3, n=6)    | 29.0 (27.7-31.7, n=6)    | 75.6 (62.1-82.9, n=5)    | 0.57              | 0.67                | 0.38                |
| 10k nodes, 100k edges | Hover (ms)                   | 5.40 (3.75-6.40, n=6)    | 1.32 (1.05-1.70, n=6)    | 5.30 (3.00-5.50, n=5)    | 0.25              | 1.02                | 0.25                |
| 10k nodes, 100k edges | JS heap (MB)                 | 333 (333-333, n=6)       | 353 (353-353, n=6)       | 333 (332-333, n=5)       | 1.06              | 1.00                | 1.06                |
| 10k nodes, 100k edges | Step plus readback (ms)      | 5.25 (3.50-23.9, n=6)    | 5.20 (3.20-7.10, n=6)    | 7.00 (5.90-8.10, n=5)    | 0.99              | 0.75                | 0.74                |
| 10k nodes, 100k edges | Frame while layout runs (ms) | 189 (146-278, n=6)       | 128 (108-209, n=6)       | 170 (140-247, n=5)       | 0.68              | 1.11                | 0.75                |
| 10k nodes, 100 edges  | First frame (s)              | 0.79 (0.55-1.27, n=6)    | 1.12 (0.92-1.27, n=6)    | 0.73 (0.69-1.18, n=6)    | 1.41              | 1.09                | 1.53                |
| 10k nodes, 100 edges  | Still frame median (ms)      | 24.6 (22.5-26.4, n=6)    | 19.7 (19.3-19.9, n=6)    | 24.6 (22.9-26.0, n=6)    | 0.80              | 1.00                | 0.80                |
| 10k nodes, 100 edges  | Still frame p99 (ms)         | 31.3 (27.4-39.2, n=6)    | 21.2 (20.6-23.2, n=6)    | 30.1 (27.7-39.8, n=6)    | 0.68              | 1.04                | 0.70                |
| 10k nodes, 100 edges  | Moving frame median (ms)     | 32.6 (26.3-35.3, n=6)    | 20.1 (7.30-20.4, n=6)    | 29.0 (26.7-39.4, n=6)    | 0.62              | 1.13                | 0.69                |
| 10k nodes, 100 edges  | Moving frame p99 (ms)        | 55.1 (32.0-71.7, n=6)    | 22.6 (21.7-26.0, n=6)    | 51.5 (45.2-56.5, n=6)    | 0.41              | 1.07                | 0.44                |
| 10k nodes, 100 edges  | Drag frame median (ms)       | 30.2 (25.1-35.4, n=6)    | 19.9 (3.40-20.4, n=6)    | 29.6 (11.8-33.7, n=5)    | 0.66              | 1.02                | 0.67                |
| 10k nodes, 100 edges  | Hover (ms)                   | 5.97 (2.60-6.45, n=6)    | 2.05 (1.60-2.40, n=6)    | 5.00 (2.95-7.05, n=5)    | 0.34              | 1.19                | 0.41                |
| 10k nodes, 100 edges  | JS heap (MB)                 | 139 (139-139, n=6)       | 159 (159-159, n=6)       | 138 (138-138, n=5)       | 1.14              | 1.01                | 1.15                |
| 100k nodes, 1k edges  | First frame (s)              | 5.49 (4.54-6.92, n=6)    | 18.4 (15.9-19.2, n=6)    | 16.1 (14.5-25.8, n=6)    | 3.35              | 0.34                | 1.15                |
| 100k nodes, 1k edges  | Still frame median (ms)      | 87.2 (76.4-91.2, n=6)    | 26.2 (23.2-28.0, n=6)    | 74.7 (69.9-93.1, n=6)    | 0.30              | 1.17                | 0.35                |
| 100k nodes, 1k edges  | Still frame p99 (ms)         | 149 (142-160, n=6)       | 31.6 (29.4-33.7, n=6)    | 125 (117-149, n=6)       | 0.21              | 1.19                | 0.25                |
| 100k nodes, 1k edges  | Moving frame median (ms)     | 120 (110-136, n=6)       | 29.9 (28.9-32.2, n=6)    | 117 (104-164, n=6)       | 0.25              | 1.03                | 0.26                |
| 100k nodes, 1k edges  | Moving frame p99 (ms)        | 317 (304-345, n=6)       | 35.7 (34.8-45.0, n=6)    | 302 (161-372, n=6)       | 0.11              | 1.05                | 0.12                |
| 100k nodes, 1k edges  | Drag frame median (ms)       | 107 (102-129, n=6)       | 29.1 (25.8-34.8, n=6)    | 113 (104-144, n=5)       | 0.27              | 0.95                | 0.26                |
| 100k nodes, 1k edges  | Hover (ms)                   | 27.9 (24.6-44.3, n=6)    | 4.65 (4.15-4.85, n=6)    | 23.2 (21.6-26.0, n=5)    | 0.17              | 1.20                | 0.20                |
| 100k nodes, 1k edges  | JS heap (MB)                 | 959 (959-959, n=6)       | 1,154 (1,153-1,154, n=6) | 963 (963-963, n=5)       | 1.20              | 1.00                | 1.20                |
| 100k nodes, 1M edges  | First frame (s)              | 42.3 (38.7-50.1, n=3)    | 56.3 (56.2-57.9, n=3)    | 56.4 (50.4-63.8, n=3)    | 1.33              | 0.75                | 1.00                |
| 100k nodes, 1M edges  | Still frame median (ms)      | 141 (139-147, n=3)       | 90.6 (90.4-91.0, n=3)    | 141 (134-147, n=3)       | 0.64              | 1.00                | 0.64                |
| 100k nodes, 1M edges  | Still frame p99 (ms)         | 214 (214-215, n=3)       | 94.4 (94.1-97.3, n=3)    | 193 (172-218, n=3)       | 0.44              | 1.11                | 0.49                |
| 100k nodes, 1M edges  | Moving frame median (ms)     | 184 (176-196, n=3)       | 95.1 (93.4-95.7, n=3)    | 171 (165-178, n=3)       | 0.52              | 1.08                | 0.56                |
| 100k nodes, 1M edges  | Moving frame p99 (ms)        | 380 (367-394, n=3)       | 105 (101-109, n=3)       | 367 (284-398, n=3)       | 0.28              | 1.03                | 0.29                |
| 100k nodes, 1M edges  | Drag frame median (ms)       | 214 (213-246, n=3)       | 108 (104-120, n=3)       | 611 (500-620, n=3)       | 0.51              | 0.35                | 0.18                |
| 100k nodes, 1M edges  | Hover (ms)                   | 37.4 (34.6-51.7, n=3)    | 1.65 (1.65-1.85, n=3)    | 24.9 (23.2-25.2, n=3)    | 0.04              | 1.50                | 0.07                |
| 100k nodes, 1M edges  | JS heap (MB)                 | 2,848 (2,848-2,848, n=3) | 3,044 (3,044-3,044, n=3) | 2,848 (2,848-2,848, n=3) | 1.07              | 1.00                | 1.07                |
| 100k nodes, 1M edges  | Step plus readback (ms)      | 135 (130-167, n=3)       | 76.2 (75.7-77.8, n=3)    | 491 (483-574, n=3)       | 0.56              | 0.28                | 0.16                |
| 100k nodes, 1M edges  | Frame while layout runs (ms) | 2,380 (1,989-2,397, n=3) | 1,240 (1,160-1,260, n=3) | 1,688 (1,508-1,966, n=3) | 0.52              | 1.41                | 0.73                |

| Configuration         | Build          | Runs | Load before | Load after | Failures                                                               |
| --------------------- | -------------- | ---- | ----------- | ---------- | ---------------------------------------------------------------------- |
| 10k nodes, 100k edges | master objects | 6    | 10-40       | 10-35      | -                                                                      |
| 10k nodes, 100k edges | master batched | 6    | 9-35        | 10-32      | -                                                                      |
| 10k nodes, 100k edges | reference      | 6    | 10-38       | 10-40      | page.evaluate: TypeError: Cannot read properties of undefined (reading |
| 10k nodes, 100 edges  | master objects | 6    | 11-29       | 11-28      | -                                                                      |
| 10k nodes, 100 edges  | master batched | 6    | 12-28       | 11-29      | -                                                                      |
| 10k nodes, 100 edges  | reference      | 6    | 12-29       | 11-29      | page.evaluate: TypeError: Cannot read properties of undefined (reading |
| 100k nodes, 1k edges  | master objects | 6    | 12-29       | 17-24      | -                                                                      |
| 100k nodes, 1k edges  | master batched | 6    | 11-20       | 10-19      | -                                                                      |
| 100k nodes, 1k edges  | reference      | 6    | 10-27       | 10-25      | page.evaluate: TypeError: Cannot read properties of undefined (reading |
| 100k nodes, 1M edges  | master objects | 3    | 16-22       | 19-23      | -                                                                      |
| 100k nodes, 1M edges  | master batched | 3    | 17-22       | 15-18      | -                                                                      |
| 100k nodes, 1M edges  | reference      | 3    | 17-19       | 9-22       | -                                                                      |
| 1M nodes, 1M edges    | master objects | 1    | 9-9         | 9-9        | load failed: Loading 1,000,000 more nodes would take the graph to 1,00 |
| 1M nodes, 1M edges    | master batched | 1    | 9-9         | 9-9        | load failed: Loading 1,000,000 more nodes would take the graph to 1,00 |
| 1M nodes, 1M edges    | reference      | 1    | 9-9         | 9-9        | load failed: Loading 1,000,000 more nodes would take the graph to 1,00 |

## Notes

- **1,000,000 nodes does not load on any build**: the element's default ceiling of 100,000 drawable nodes refuses it ("Loading
  1,000,000 more nodes would take the graph to 1,000,000, past the 100,000 this renderer can draw"). The ceiling was not raised, so
  100,000 nodes is the largest size that finishes.
- **Noise.** Within a configuration, run medians of the master builds spread by 2-10% for still and moving frames at 100,000
  nodes, and up to 40% for first frame and hover at 10,000 nodes, where a run takes seconds and one load spike moves it. Batched
  frames spread far less than object frames. Ratios whose ranges overlap (most first-frame ratios at 10,000 nodes) are not
  differences.
- **Batched is slower to the first frame at 100,000 nodes**: 18.4 s against 5.5 s with few edges (no overlap: 15.9-19.2 against
  4.5-6.9) and 56 s against 42 s with a million edges. The reference build took as long as batched, so master's object path gained
  about 11 s that the batched path does not get. The harness does not say where the time goes.
- **Batched holds more JavaScript heap**: about 2 KB more per node (159 against 139 MB at 10,000 nodes, 1,154 against 959 MB at
  100,000), although batched nodes have no mesh.
- **Object path against the reference**: still, moving and the step are equal or better; the frame while the layout runs is 1.41x
  the reference (1,989-2,397 against 1,508-1,966 ms) and hover at 100,000 nodes 1.50x (34.6-51.7 against 23.2-25.2 ms, 3 runs).
