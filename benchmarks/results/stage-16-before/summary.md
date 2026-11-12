# cosmos.gl and graphty-element, build stage-16-before

- Commit: 4b0e232429d46367b7a2d159b5ab89d422d2f7e8 (working tree clean)
- Source: stage-16-before
- Render path: batched
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 1 (0 void), 2026-11-08T06:07:23.878Z to 2026-11-08T06:07:23.878Z
- Load average when a run began: 5.42-5.42

A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure | cosmos.gl | graphty-element 2D lean | graphty-element 3D default |
| ------- | --------- | ----------------------- | -------------------------- |

**100,000 nodes, 1,000,000 edges**

| Measure                       | cosmos.gl | graphty-element 2D lean                   | graphty-element 3D default |
| ----------------------------- | --------- | ----------------------------------------- | -------------------------- |
| First frame                   | -         | 26.7 s (26.7-26.7, 1 runs)                | -                          |
| Ready                         | -         | 26.7 s (26.7-26.7, 1 runs)                | -                          |
| Still frame                   | -         | 87.3 / 90.0 / 90.9 ms (87.3-87.3, 1 runs) | -                          |
| Moving frame                  | -         | 87.6 / 90.0 / 90.6 ms (87.6-87.6, 1 runs) | -                          |
| Hover                         | -         | 1.70 ms (1.70-1.70, 1 runs)               | -                          |
| JavaScript heap               | -         | 1,965 MB (1,965-1,965, 1 runs)            | -                          |
| Renderer and GPU processes    | -         | 2,951 MB (2,951-2,951, 1 runs)            | -                          |
| Card memory growth            | -         | 83.0 MB (83.0-83.0, 1 runs)               | -                          |
| Frame while the layout runs   | -         | 942 / 1,169 / 1,227 ms (942-942, 1 runs)  | -                          |
| One layout step plus readback | -         | 72.0 ms (72.0-72.0, 1 runs)               | -                          |
| Layout step in a batch        | -         | 18.6 ms (18.6-18.6, 1 runs)               | -                          |
| Drag frame                    | -         | 103 / 118 / 124 ms (103-103, 1 runs)      | -                          |

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

| Measure | labels off | labels on |
| ------- | ---------- | --------- |

**Labels on, 100,000 nodes**

| Measure                       | labels off                                | labels on |
| ----------------------------- | ----------------------------------------- | --------- |
| First frame                   | 26.7 s (26.7-26.7, 1 runs)                | -         |
| Ready                         | 26.7 s (26.7-26.7, 1 runs)                | -         |
| Still frame                   | 87.3 / 90.0 / 90.9 ms (87.3-87.3, 1 runs) | -         |
| Moving frame                  | 87.6 / 90.0 / 90.6 ms (87.6-87.6, 1 runs) | -         |
| Hover                         | 1.70 ms (1.70-1.70, 1 runs)               | -         |
| JavaScript heap               | 1,965 MB (1,965-1,965, 1 runs)            | -         |
| Renderer and GPU processes    | 2,951 MB (2,951-2,951, 1 runs)            | -         |
| Card memory growth            | 83.0 MB (83.0-83.0, 1 runs)               | -         |
| Frame while the layout runs   | 942 / 1,169 / 1,227 ms (942-942, 1 runs)  | -         |
| One layout step plus readback | 72.0 ms (72.0-72.0, 1 runs)               | -         |
| Layout step in a batch        | 18.6 ms (18.6-18.6, 1 runs)               | -         |
| Drag frame                    | 103 / 118 / 124 ms (103-103, 1 runs)      | -         |

## CPU layout (acceleration off)

| Configuration      | Frame while the layout runs | One CPU step |
| ------------------ | --------------------------- | ------------ |
| 2D lean, 10,000    | -                           | -            |
| 3D default, 10,000 | -                           | -            |
| 2D lean, 100,000   | -                           | -            |

## Every run

| Library | Mode | Accel | Nodes   | Ratio | Labels | Flags | Stages reached                                      | Failure | Runs | Load when each began |
| ------- | ---- | ----- | ------- | ----- | ------ | ----- | --------------------------------------------------- | ------- | ---- | -------------------- |
| graphty | lean | on    | 100,000 | 1     | off    |       | load still orbit memory hover layoutFps layoutSteps |         | 1    | 5.42                 |

## Against section 8.3

The new median over the 8.3 figure: above 1.00 is more than before. For a range in 8.3 the middle is used; graphty-element's hover is compared with its "on golden" row. Every 8.3 graphty-element figure except hover comes from the 2026-10-17 build.

**10,000 nodes**

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

**100,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | -                             | 28.3 -> 26.7 s (0.94)       | -                              |
| Ready                         | -                             | 52.7 -> 26.7 s (0.51)       | -                              |
| Still frame                   | -                             | 86.1 -> 87.3 ms (1.01)      | -                              |
| Moving frame                  | -                             | 126 -> 87.6 ms (0.69)       | -                              |
| Hover                         | -                             | 103 -> 1.70 ms (0.02)       | -                              |
| JavaScript heap               | -                             | 3,045 -> 1,965 MB (0.65)    | -                              |
| Renderer and GPU processes    | -                             | 3,762 -> 2,951 MB (0.78)    | -                              |
| Frame while the layout runs   | -                             | 1,575 -> 942 ms (0.60)      | -                              |
| One layout step plus readback | -                             | 394 -> 72.0 ms (0.18)       | -                              |
| Layout step in a batch        | -                             | 23.4 -> 18.6 ms (0.79)      | -                              |
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
