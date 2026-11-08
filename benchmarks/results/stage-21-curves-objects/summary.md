# cosmos.gl and graphty-element, build stage-21-curves

- Commit: c62c4c915c762ed8d32895187ceb7d7a35940bf3 (working tree clean)
- Source: feat-3251-stage-21-curves-routes-pr9
- Render path: objects
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 3 (0 void), 2026-11-08T22:26:18.835Z to 2026-11-08T22:29:17.989Z
- Load average when a run began: 1.55-2.56

A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure                    | cosmos.gl | graphty-element 2D lean                   | graphty-element 3D default |
| -------------------------- | --------- | ----------------------------------------- | -------------------------- |
| First frame                | -         | 5.07 s (5.03-5.08, 3 runs)                | -                          |
| Ready                      | -         | 5.07 s (5.03-5.08, 3 runs)                | -                          |
| Still frame                | -         | 57.2 / 64.1 / 65.0 ms (56.3-60.6, 3 runs) | -                          |
| Moving frame               | -         | 61.1 / 75.6 / 76.5 ms (57.9-61.6, 3 runs) | -                          |
| Hover                      | -         | 6.60 ms (2.50-8.20, 3 runs)               | -                          |
| JavaScript heap            | -         | 1,119 MB (1,119-1,119, 3 runs)            | -                          |
| Renderer and GPU processes | -         | 2,841 MB (2,838-2,841, 3 runs)            | -                          |
| Card memory growth         | -         | 82.0 MB (82.0-82.0, 3 runs)               | -                          |
| Drag frame                 | -         | 125 / 178 / 240 ms (121-127, 3 runs)      | -                          |

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
| First frame                | 5.07 s (5.03-5.08, 3 runs)                | -         |
| Ready                      | 5.07 s (5.03-5.08, 3 runs)                | -         |
| Still frame                | 57.2 / 64.1 / 65.0 ms (56.3-60.6, 3 runs) | -         |
| Moving frame               | 61.1 / 75.6 / 76.5 ms (57.9-61.6, 3 runs) | -         |
| Hover                      | 6.60 ms (2.50-8.20, 3 runs)               | -         |
| JavaScript heap            | 1,119 MB (1,119-1,119, 3 runs)            | -         |
| Renderer and GPU processes | 2,841 MB (2,838-2,841, 3 runs)            | -         |
| Card memory growth         | 82.0 MB (82.0-82.0, 3 runs)               | -         |
| Drag frame                 | 125 / 178 / 240 ms (121-127, 3 runs)      | -         |

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
| graphty | lean | on    | 10,000 | 1     | off    | skip-layout curves | load still orbit memory hover |         | 3    | 2.56, 1.55, 1.61     |

## Against section 8.3

The new median over the 8.3 figure: above 1.00 is more than before. For a range in 8.3 the middle is used; graphty-element's hover is compared with its "on golden" row. Every 8.3 graphty-element figure except hover comes from the 2026-10-17 build.

**10,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | -                             | 1.36 -> 5.07 s (3.73)       | -                              |
| Ready                         | -                             | 3.30 -> 5.07 s (1.54)       | -                              |
| Still frame                   | -                             | 33.4 -> 57.2 ms (1.71)      | -                              |
| Moving frame                  | -                             | 40.6 -> 61.1 ms (1.50)      | -                              |
| Hover                         | -                             | 12.7 -> 6.60 ms (0.52)      | -                              |
| JavaScript heap               | -                             | 345 -> 1,119 MB (3.24)      | -                              |
| Renderer and GPU processes    | -                             | 791 -> 2,841 MB (3.59)      | -                              |
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
