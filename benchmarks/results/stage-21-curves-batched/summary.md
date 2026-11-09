# cosmos.gl and graphty-element, build stage-21-curves

- Commit: cd1a6768639e43730b4c237e0d5d39d6ce6f134a (working tree clean)
- Source: feat-3251-stage-21-curves-routes-pr9
- Render path: batched
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 3 (0 void), 2026-11-08T22:39:44.054Z to 2026-11-08T22:42:55.688Z
- Load average when a run began: 1.41-1.54

A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure                    | cosmos.gl | graphty-element 2D lean                   | graphty-element 3D default |
| -------------------------- | --------- | ----------------------------------------- | -------------------------- |
| First frame                | -         | 6.60 s (6.52-6.71, 3 runs)                | -                          |
| Ready                      | -         | 6.60 s (6.52-6.72, 3 runs)                | -                          |
| Still frame                | -         | 46.6 / 48.2 / 48.9 ms (46.4-46.7, 3 runs) | -                          |
| Moving frame               | -         | 46.0 / 48.6 / 49.3 ms (44.7-46.3, 3 runs) | -                          |
| Hover                      | -         | 2.40 ms (2.00-3.10, 3 runs)               | -                          |
| JavaScript heap            | -         | 1,758 MB (1,757-1,758, 3 runs)            | -                          |
| Renderer and GPU processes | -         | 5,184 MB (5,182-5,188, 3 runs)            | -                          |
| Card memory growth         | -         | 1,564 MB (1,558-1,564, 3 runs)            | -                          |
| Drag frame                 | -         | 47.6 / 52.0 / 54.6 ms (34.3-48.9, 3 runs) | -                          |

**100,000 nodes, 1,000,000 edges**

| Measure | cosmos.gl | graphty-element 2D lean | graphty-element 3D default |
| ------- | --------- | ----------------------- | -------------------------- |

**1,000,000 nodes, 1,000,000 edges**

| Measure | cosmos.gl |
| ------- | --------- |

## Results at device pixel ratio 2

Both libraries draw 2400 x 1800; graphty-element runs with pixel-ratio="device". No layout in these runs.

**10,000 nodes, 100,000 edges, ratio 2**

| Measure | cosmos.gl | graphty-element 2D lean | graphty-element 3D default |
| ------- | --------- | ----------------------- | -------------------------- |

**100,000 nodes, 1,000,000 edges, ratio 2**

| Measure | cosmos.gl | graphty-element 2D lean | graphty-element 3D default |
| ------- | --------- | ----------------------- | -------------------------- |

**1,000,000 nodes, 1,000,000 edges, ratio 2**

| Measure | cosmos.gl |
| ------- | --------- |

## Labels

graphty-element 2D lean with `node.label` bound to each node's id, ratio 1, no layout.

**Labels on against labels off, 10,000 nodes**

| Measure                    | labels off                                | labels on |
| -------------------------- | ----------------------------------------- | --------- |
| First frame                | 6.60 s (6.52-6.71, 3 runs)                | -         |
| Ready                      | 6.60 s (6.52-6.72, 3 runs)                | -         |
| Still frame                | 46.6 / 48.2 / 48.9 ms (46.4-46.7, 3 runs) | -         |
| Moving frame               | 46.0 / 48.6 / 49.3 ms (44.7-46.3, 3 runs) | -         |
| Hover                      | 2.40 ms (2.00-3.10, 3 runs)               | -         |
| JavaScript heap            | 1,758 MB (1,757-1,758, 3 runs)            | -         |
| Renderer and GPU processes | 5,184 MB (5,182-5,188, 3 runs)            | -         |
| Card memory growth         | 1,564 MB (1,558-1,564, 3 runs)            | -         |
| Drag frame                 | 47.6 / 52.0 / 54.6 ms (34.3-48.9, 3 runs) | -         |

**Labels on, 100,000 nodes**

| Measure | labels off | labels on |
| ------- | ---------- | --------- |

## CPU layout (acceleration off)

| Configuration      | Frame while the layout runs | One CPU step |
| ------------------ | --------------------------- | ------------ |
| 2D lean, 10,000    | -                           | -            |
| 3D default, 10,000 | -                           | -            |
| 2D lean, 100,000   | -                           | -            |

## Every run

| Library | Mode | Accel | Nodes  | Ratio | Labels | Flags              | Stages reached                | Failure | Runs | Load when each began |
| ------- | ---- | ----- | ------ | ----- | ------ | ------------------ | ----------------------------- | ------- | ---- | -------------------- |
| graphty | lean | on    | 10,000 | 1     | off    | skip-layout curves | load still orbit memory hover |         | 3    | 1.48, 1.41, 1.54     |

## Against section 8.3

The new median over the 8.3 figure: above 1.00 is more than before. For a range in 8.3 the middle is used; graphty-element's hover is compared with its "on golden" row. Every 8.3 graphty-element figure except hover comes from the 2026-10-17 build.

**10,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | -                             | 1.36 -> 6.60 s (4.85)       | -                              |
| Ready                         | -                             | 3.30 -> 6.60 s (2.00)       | -                              |
| Still frame                   | -                             | 33.4 -> 46.6 ms (1.40)      | -                              |
| Moving frame                  | -                             | 40.6 -> 46.0 ms (1.13)      | -                              |
| Hover                         | -                             | 12.7 -> 2.40 ms (0.19)      | -                              |
| JavaScript heap               | -                             | 345 -> 1,758 MB (5.10)      | -                              |
| Renderer and GPU processes    | -                             | 791 -> 5,184 MB (6.55)      | -                              |
| Frame while the layout runs   | -                             | -                           | -                              |
| One layout step plus readback | -                             | -                           | -                              |
| Layout step in a batch        | -                             | -                           | -                              |
| Drag frame                    | -                             | -                           | -                              |

**100,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | -                             | -                           | -                              |
| Ready                         | -                             | -                           | -                              |
| Still frame                   | -                             | -                           | -                              |
| Moving frame                  | -                             | -                           | -                              |
| Hover                         | -                             | -                           | -                              |
| JavaScript heap               | -                             | -                           | -                              |
| Renderer and GPU processes    | -                             | -                           | -                              |
| Frame while the layout runs   | -                             | -                           | -                              |
| One layout step plus readback | -                             | -                           | -                              |
| Layout step in a batch        | -                             | -                           | -                              |
| Drag frame                    | -                             | -                           | -                              |

**1,000,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- |
| First frame                   | -                             |
| Ready                         | -                             |
| Still frame                   | -                             |
| Moving frame                  | -                             |
| Hover                         | -                             |
| JavaScript heap               | -                             |
| Renderer and GPU processes    | -                             |
| Frame while the layout runs   | -                             |
| One layout step plus readback | -                             |
| Layout step in a batch        | -                             |
| Drag frame                    | -                             |
