# cosmos.gl and graphty-element, build stage-113

- Commit: efbfbab91914c9a2fbae72d5bfca65b390a0009a (working tree clean)
- Source: feat-6389-stage-113-gap-pace-webgpu-frames
- Render path: batched
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 1 (0 void), 2026-11-10T04:42:22.003Z to 2026-11-10T04:42:22.003Z
- Load average when a run began: 25.5-25.5

A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure | cosmos.gl | graphty-element 2D lean | graphty-element 3D default |
| ------- | --------- | ----------------------- | -------------------------- |

**100,000 nodes, 1,000,000 edges**

| Measure                       | cosmos.gl | graphty-element 2D lean                        | graphty-element 3D default |
| ----------------------------- | --------- | ---------------------------------------------- | -------------------------- |
| First frame                   | -         | 47.1 s (47.1-47.1, 1 runs)                     | -                          |
| Ready                         | -         | 47.2 s (47.2-47.2, 1 runs)                     | -                          |
| Moving frame                  | -         | 106 / 107 / 110 ms (106-106, 1 runs)           | -                          |
| JavaScript heap               | -         | 2,250 MB (2,250-2,250, 1 runs)                 | -                          |
| Renderer and GPU processes    | -         | 3,118 MB (3,118-3,118, 1 runs)                 | -                          |
| Card memory growth            | -         | 390 MB (390-390, 1 runs)                       | -                          |
| Frame while the layout runs   | -         | 1,531 / 2,026 / 2,026 ms (1,531-1,531, 1 runs) | -                          |
| One layout step plus readback | -         | 4.30 ms (4.30-4.30, 1 runs)                    | -                          |
| Layout step in a batch        | -         | 6.13 ms (6.13-6.13, 1 runs)                    | -                          |
| Drag frame                    | -         | 120 / 130 / 152 ms (120-120, 1 runs)           | -                          |
| Hover while the layout runs   | -         | 1,593 ms (1,593-1,593, 1 runs)                 | -                          |

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
| First frame                   | 47.1 s (47.1-47.1, 1 runs)                     | -         |
| Ready                         | 47.2 s (47.2-47.2, 1 runs)                     | -         |
| Moving frame                  | 106 / 107 / 110 ms (106-106, 1 runs)           | -         |
| JavaScript heap               | 2,250 MB (2,250-2,250, 1 runs)                 | -         |
| Renderer and GPU processes    | 3,118 MB (3,118-3,118, 1 runs)                 | -         |
| Card memory growth            | 390 MB (390-390, 1 runs)                       | -         |
| Frame while the layout runs   | 1,531 / 2,026 / 2,026 ms (1,531-1,531, 1 runs) | -         |
| One layout step plus readback | 4.30 ms (4.30-4.30, 1 runs)                    | -         |
| Layout step in a batch        | 6.13 ms (6.13-6.13, 1 runs)                    | -         |
| Drag frame                    | 120 / 130 / 152 ms (120-120, 1 runs)           | -         |
| Hover while the layout runs   | 1,593 ms (1,593-1,593, 1 runs)                 | -         |

## CPU layout (acceleration off)

| Configuration      | Frame while the layout runs | One CPU step |
| ------------------ | --------------------------- | ------------ |
| 2D lean, 10,000    | -                           | -            |
| 3D default, 10,000 | -                           | -            |
| 2D lean, 100,000   | -                           | -            |

## Every run

| Library | Mode | Accel | Nodes   | Ratio | Labels | Flags    | Stages reached                                            | Failure | Runs | Load when each began |
| ------- | ---- | ----- | ------- | ----- | ------ | -------- | --------------------------------------------------------- | ------- | ---- | -------------------- |
| graphty | lean | on    | 100,000 | 1     | off    | no-still | load orbit memory hover layoutFps hoverLayout layoutSteps |         | 1    | 25.5                 |

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
| Hover while the layout runs   | -                             | -                           | -                              |

**100,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | -                             | 28.3 -> 47.1 s (1.67)       | -                              |
| Ready                         | -                             | 52.7 -> 47.2 s (0.89)       | -                              |
| Still frame                   | -                             | -                           | -                              |
| Moving frame                  | -                             | 126 -> 106 ms (0.84)        | -                              |
| Hover                         | -                             | -                           | -                              |
| JavaScript heap               | -                             | 3,045 -> 2,250 MB (0.74)    | -                              |
| Renderer and GPU processes    | -                             | 3,762 -> 3,118 MB (0.83)    | -                              |
| Frame while the layout runs   | -                             | 1,575 -> 1,531 ms (0.97)    | -                              |
| One layout step plus readback | -                             | 394 -> 4.30 ms (0.01)       | -                              |
| Layout step in a batch        | -                             | 23.4 -> 6.13 ms (0.26)      | -                              |
| Drag frame                    | -                             | -                           | -                              |
| GPU still frame               | -                             | -                           | -                              |
| Hover while the layout runs   | -                             | -                           | -                              |

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
| Hover while the layout runs   | -                             |
