# cosmos.gl and graphty-element, build stage-25

- Commit: 927fb0c27340afc20d0f0797a02d34b2adceed1b (working tree clean)
- Source: feat-3248-stage-25-gpu-fills-table-pr5
- Render path: batched
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 1 (0 void), 2026-11-09T13:44:56.219Z to 2026-11-09T13:44:56.219Z
- Load average when a run began: 2.46-2.46

A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure | cosmos.gl | graphty-element 2D lean | graphty-element 3D default |
| ------- | --------- | ----------------------- | -------------------------- |

**100,000 nodes, 1,000,000 edges**

| Measure                     | cosmos.gl | graphty-element 2D lean                   | graphty-element 3D default |
| --------------------------- | --------- | ----------------------------------------- | -------------------------- |
| First frame                 | -         | 26.3 s (26.3-26.3, 1 runs)                | -                          |
| Ready                       | -         | 26.5 s (26.5-26.5, 1 runs)                | -                          |
| Moving frame                | -         | 88.8 / 89.6 / 90.7 ms (88.8-88.8, 1 runs) | -                          |
| JavaScript heap             | -         | 2,251 MB (2,251-2,251, 1 runs)            | -                          |
| Renderer and GPU processes  | -         | 3,833 MB (3,833-3,833, 1 runs)            | -                          |
| Card memory growth          | -         | 609 MB (609-609, 1 runs)                  | -                          |
| Frame while the layout runs | -         | 187 / 200 / 456 ms (187-187, 1 runs)      | -                          |
| Drag frame                  | -         | 89.5 / 169 / 171 ms (89.5-89.5, 1 runs)   | -                          |

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

| Measure                     | labels off                                | labels on |
| --------------------------- | ----------------------------------------- | --------- |
| First frame                 | 26.3 s (26.3-26.3, 1 runs)                | -         |
| Ready                       | 26.5 s (26.5-26.5, 1 runs)                | -         |
| Moving frame                | 88.8 / 89.6 / 90.7 ms (88.8-88.8, 1 runs) | -         |
| JavaScript heap             | 2,251 MB (2,251-2,251, 1 runs)            | -         |
| Renderer and GPU processes  | 3,833 MB (3,833-3,833, 1 runs)            | -         |
| Card memory growth          | 609 MB (609-609, 1 runs)                  | -         |
| Frame while the layout runs | 187 / 200 / 456 ms (187-187, 1 runs)      | -         |
| Drag frame                  | 89.5 / 169 / 171 ms (89.5-89.5, 1 runs)   | -         |

## CPU layout (acceleration off)

| Configuration      | Frame while the layout runs | One CPU step |
| ------------------ | --------------------------- | ------------ |
| 2D lean, 10,000    | -                           | -            |
| 3D default, 10,000 | -                           | -            |
| 2D lean, 100,000   | -                           | -            |

## Every run

| Library | Mode | Accel | Nodes   | Ratio | Labels | Flags    | Stages reached                    | Failure                      | Runs | Load when each began |
| ------- | ---- | ----- | ------- | ----- | ------ | -------- | --------------------------------- | ---------------------------- | ---- | -------------------- |
| graphty | lean | on    | 100,000 | 1     | off    | no-still | load orbit memory hover layoutFps | did not finish in 10 minutes | 1    | 2.46                 |

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
| First frame                   | -                             | 28.3 -> 26.3 s (0.93)       | -                              |
| Ready                         | -                             | 52.7 -> 26.5 s (0.50)       | -                              |
| Still frame                   | -                             | -                           | -                              |
| Moving frame                  | -                             | 126 -> 88.8 ms (0.70)       | -                              |
| Hover                         | -                             | -                           | -                              |
| JavaScript heap               | -                             | 3,045 -> 2,251 MB (0.74)    | -                              |
| Renderer and GPU processes    | -                             | 3,762 -> 3,833 MB (1.02)    | -                              |
| Frame while the layout runs   | -                             | 1,575 -> 187 ms (0.12)      | -                              |
| One layout step plus readback | -                             | -                           | -                              |
| Layout step in a batch        | -                             | -                           | -                              |
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
