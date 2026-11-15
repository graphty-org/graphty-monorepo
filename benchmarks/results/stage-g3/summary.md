# cosmos.gl and graphty-element, build stage-g3

- Commit: a1b8581cc399c6ec13a11aff7218f0eeb86e956b (working tree clean)
- Source: feat-6389-stage-103-gap-g3-pulled-2d-lines
- Render path: batched
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 1 (0 void), 2026-11-09T07:18:03.354Z to 2026-11-09T07:18:03.354Z
- Load average when a run began: 3.04-3.04

A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure | cosmos.gl | graphty-element 2D lean | graphty-element 3D default |
| ------- | --------- | ----------------------- | -------------------------- |

**100,000 nodes, 1,000,000 edges**

| Measure                       | cosmos.gl | graphty-element 2D lean                        | graphty-element 3D default |
| ----------------------------- | --------- | ---------------------------------------------- | -------------------------- |
| First frame                   | -         | 26.5 s (26.5-26.5, 1 runs)                     | -                          |
| Ready                         | -         | 26.5 s (26.5-26.5, 1 runs)                     | -                          |
| Still frame                   | -         | 72.1 / 73.4 / 74.3 ms (72.1-72.1, 1 runs)      | -                          |
| Moving frame                  | -         | 72.2 / 73.8 / 75.0 ms (72.2-72.2, 1 runs)      | -                          |
| Hover                         | -         | 2.50 ms (2.50-2.50, 1 runs)                    | -                          |
| JavaScript heap               | -         | 2,210 MB (2,210-2,210, 1 runs)                 | -                          |
| Renderer and GPU processes    | -         | 3,193 MB (3,193-3,193, 1 runs)                 | -                          |
| Card memory growth            | -         | 245 MB (245-245, 1 runs)                       | -                          |
| Frame while the layout runs   | -         | 1,053 / 1,261 / 1,376 ms (1,053-1,053, 1 runs) | -                          |
| One layout step plus readback | -         | 73.6 ms (73.6-73.6, 1 runs)                    | -                          |
| Layout step in a batch        | -         | 19.3 ms (19.3-19.3, 1 runs)                    | -                          |
| Drag frame                    | -         | 79.9 / 85.8 / 89.6 ms (79.9-79.9, 1 runs)      | -                          |
| GPU still frame               | -         | 69.7 / 70.8 / 71.0 ms (69.7-69.7, 1 runs)      | -                          |

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

| Measure                       | labels off                                     | labels on |
| ----------------------------- | ---------------------------------------------- | --------- |
| First frame                   | 26.5 s (26.5-26.5, 1 runs)                     | -         |
| Ready                         | 26.5 s (26.5-26.5, 1 runs)                     | -         |
| Still frame                   | 72.1 / 73.4 / 74.3 ms (72.1-72.1, 1 runs)      | -         |
| Moving frame                  | 72.2 / 73.8 / 75.0 ms (72.2-72.2, 1 runs)      | -         |
| Hover                         | 2.50 ms (2.50-2.50, 1 runs)                    | -         |
| JavaScript heap               | 2,210 MB (2,210-2,210, 1 runs)                 | -         |
| Renderer and GPU processes    | 3,193 MB (3,193-3,193, 1 runs)                 | -         |
| Card memory growth            | 245 MB (245-245, 1 runs)                       | -         |
| Frame while the layout runs   | 1,053 / 1,261 / 1,376 ms (1,053-1,053, 1 runs) | -         |
| One layout step plus readback | 73.6 ms (73.6-73.6, 1 runs)                    | -         |
| Layout step in a batch        | 19.3 ms (19.3-19.3, 1 runs)                    | -         |
| Drag frame                    | 79.9 / 85.8 / 89.6 ms (79.9-79.9, 1 runs)      | -         |
| GPU still frame               | 69.7 / 70.8 / 71.0 ms (69.7-69.7, 1 runs)      | -         |

## CPU layout (acceleration off)

| Configuration      | Frame while the layout runs | One CPU step |
| ------------------ | --------------------------- | ------------ |
| 2D lean, 10,000    | -                           | -            |
| 3D default, 10,000 | -                           | -            |
| 2D lean, 100,000   | -                           | -            |

## Every run

| Library | Mode | Accel | Nodes   | Ratio | Labels | Flags | Stages reached                                      | Failure | Runs | Load when each began |
| ------- | ---- | ----- | ------- | ----- | ------ | ----- | --------------------------------------------------- | ------- | ---- | -------------------- |
| graphty | lean | on    | 100,000 | 1     | off    |       | load still orbit memory hover layoutFps layoutSteps |         | 1    | 3.04                 |

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
| GPU still frame               | -                             | -                           | -                              |

**100,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | -                             | 28.3 -> 26.5 s (0.94)       | -                              |
| Ready                         | -                             | 52.7 -> 26.5 s (0.50)       | -                              |
| Still frame                   | -                             | 86.1 -> 72.1 ms (0.84)      | -                              |
| Moving frame                  | -                             | 126 -> 72.2 ms (0.57)       | -                              |
| Hover                         | -                             | 103 -> 2.50 ms (0.02)       | -                              |
| JavaScript heap               | -                             | 3,045 -> 2,210 MB (0.73)    | -                              |
| Renderer and GPU processes    | -                             | 3,762 -> 3,193 MB (0.85)    | -                              |
| Frame while the layout runs   | -                             | 1,575 -> 1,053 ms (0.67)    | -                              |
| One layout step plus readback | -                             | 394 -> 73.6 ms (0.19)       | -                              |
| Layout step in a batch        | -                             | 23.4 -> 19.3 ms (0.83)      | -                              |
| Drag frame                    | -                             | -                           | -                              |
| GPU still frame               | -                             | -                           | -                              |

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
| GPU still frame               | -                             |
