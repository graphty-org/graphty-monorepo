# cosmos.gl and graphty-element, build finish-1910

- Commit: 4fea332375097f7140f008234902681efcc72d59 (working tree clean)
- Source: bench-1910-cosmos-quality
- Render path: batched
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 18 (0 void), 2026-11-25T03:05:31.371Z to 2026-11-25T05:22:47.899Z
- Load average when a run began: 5.85-49.7

A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure                       | cosmos.gl | graphty-element 2D lean                   | graphty-element 3D default |
| ----------------------------- | --------- | ----------------------------------------- | -------------------------- |
| First frame                   | -         | 0.48 s (0.46-0.55, 3 runs)                | -                          |
| Ready                         | -         | 0.51 s (0.49-0.59, 3 runs)                | -                          |
| Still frame                   | -         | 7.90 / 8.10 / 8.40 ms (7.70-7.90, 3 runs) | -                          |
| Moving frame                  | -         | 7.90 / 8.20 / 8.40 ms (7.80-8.00, 3 runs) | -                          |
| JavaScript heap               | -         | 74.0 MB (74.0-74.0, 3 runs)               | -                          |
| Renderer and GPU processes    | -         | 477 MB (471-481, 3 runs)                  | -                          |
| Card memory growth            | -         | 95.0 MB (95.0-100, 3 runs)                | -                          |
| Frame while the layout runs   | -         | 24.0 / 25.8 / 26.6 ms (23.9-24.3, 3 runs) | -                          |
| One layout step plus readback | -         | 5.50 ms (5.40-5.50, 3 runs)               | -                          |
| Layout step in a batch        | -         | 2.09 ms (2.08-2.09, 3 runs)               | -                          |
| Drag frame                    | -         | 7.90 / 8.10 / 8.60 ms (7.70-7.90, 3 runs) | -                          |
| GPU still frame               | -         | 0.00 / 7.09 / 7.15 ms (0.00-0.00, 3 runs) | -                          |
| Hover while the layout runs   | -         | 2.50 ms (1.70-3.00, 3 runs)               | -                          |

**100,000 nodes, 1,000,000 edges**

| Measure                       | cosmos.gl | graphty-element 2D lean                   | graphty-element 3D default |
| ----------------------------- | --------- | ----------------------------------------- | -------------------------- |
| First frame                   | -         | 4.07 s (3.89-4.08, 3 runs)                | -                          |
| Ready                         | -         | 4.29 s (4.06-4.29, 3 runs)                | -                          |
| Still frame                   | -         | 74.0 / 74.7 / 77.0 ms (73.9-74.4, 3 runs) | -                          |
| Moving frame                  | -         | 74.4 / 75.1 / 75.9 ms (74.2-74.7, 3 runs) | -                          |
| JavaScript heap               | -         | 359 MB (359-359, 3 runs)                  | -                          |
| Renderer and GPU processes    | -         | 879 MB (868-911, 3 runs)                  | -                          |
| Card memory growth            | -         | 131 MB (121-131, 3 runs)                  | -                          |
| Frame while the layout runs   | -         | 80.5 / 91.1 / 92.1 ms (68.4-81.1, 3 runs) | -                          |
| One layout step plus readback | -         | 90.6 ms (45.7-91.8, 3 runs)               | -                          |
| Layout step in a batch        | -         | 17.5 ms (17.3-17.6, 3 runs)               | -                          |
| Drag frame                    | -         | 74.5 / 75.3 / 77.7 ms (74.2-74.8, 3 runs) | -                          |
| GPU still frame               | -         | 0.00 / 73.2 / 73.4 ms (0.00-0.00, 3 runs) | -                          |
| Hover while the layout runs   | -         | 5.60 ms (5.60-7.50, 3 runs)               | -                          |

**1,000,000 nodes, 1,000,000 edges**

| Measure | cosmos.gl |
| ------- | --------- |

## Results at device pixel ratio 2

Both libraries draw 2400 x 1800; graphty-element runs with pixel-ratio="device". No layout in these runs.

**10,000 nodes, 100,000 edges, ratio 2**

| Measure                    | cosmos.gl | graphty-element 2D lean                   | graphty-element 3D default |
| -------------------------- | --------- | ----------------------------------------- | -------------------------- |
| First frame                | -         | 0.56 s (0.54-0.77, 3 runs)                | -                          |
| Ready                      | -         | 0.62 s (0.60-0.82, 3 runs)                | -                          |
| Still frame                | -         | 17.8 / 18.1 / 19.6 ms (17.8-17.8, 3 runs) | -                          |
| Moving frame               | -         | 17.9 / 18.3 / 19.5 ms (17.8-18.0, 3 runs) | -                          |
| JavaScript heap            | -         | 74.0 MB (74.0-74.0, 3 runs)               | -                          |
| Renderer and GPU processes | -         | 482 MB (478-487, 3 runs)                  | -                          |
| Card memory growth         | -         | 257 MB (257-257, 3 runs)                  | -                          |
| Drag frame                 | -         | 17.9 / 18.4 / 18.6 ms (17.9-18.1, 3 runs) | -                          |
| GPU still frame            | -         | 0.00 / 16.9 / 17.0 ms (0.00-0.00, 3 runs) | -                          |

**100,000 nodes, 1,000,000 edges, ratio 2**

| Measure                    | cosmos.gl | graphty-element 2D lean                 | graphty-element 3D default |
| -------------------------- | --------- | --------------------------------------- | -------------------------- |
| First frame                | -         | 4.79 s (3.70-6.21, 3 runs)              | -                          |
| Ready                      | -         | 5.16 s (4.06-6.58, 3 runs)              | -                          |
| Still frame                | -         | 175 / 176 / 176 ms (175-175, 3 runs)    | -                          |
| Moving frame               | -         | 175 / 176 / 177 ms (175-176, 3 runs)    | -                          |
| JavaScript heap            | -         | 359 MB (359-360, 3 runs)                | -                          |
| Renderer and GPU processes | -         | 841 MB (656-897, 3 runs)                | -                          |
| Card memory growth         | -         | 303 MB (63.0-314, 3 runs)               | -                          |
| Drag frame                 | -         | 175 / 177 / 178 ms (175-176, 3 runs)    | -                          |
| GPU still frame            | -         | 0.00 / 173 / 174 ms (0.00-0.00, 3 runs) | -                          |

**1,000,000 nodes, 1,000,000 edges, ratio 2**

| Measure | cosmos.gl |
| ------- | --------- |

## Labels

graphty-element 2D lean with `node.label` bound to each node's id, ratio 1, no layout.

**Labels on against labels off, 10,000 nodes**

| Measure                       | labels off                                | labels on |
| ----------------------------- | ----------------------------------------- | --------- |
| First frame                   | 0.48 s (0.46-0.55, 3 runs)                | -         |
| Ready                         | 0.51 s (0.49-0.59, 3 runs)                | -         |
| Still frame                   | 7.90 / 8.10 / 8.40 ms (7.70-7.90, 3 runs) | -         |
| Moving frame                  | 7.90 / 8.20 / 8.40 ms (7.80-8.00, 3 runs) | -         |
| JavaScript heap               | 74.0 MB (74.0-74.0, 3 runs)               | -         |
| Renderer and GPU processes    | 477 MB (471-481, 3 runs)                  | -         |
| Card memory growth            | 95.0 MB (95.0-100, 3 runs)                | -         |
| Frame while the layout runs   | 24.0 / 25.8 / 26.6 ms (23.9-24.3, 3 runs) | -         |
| One layout step plus readback | 5.50 ms (5.40-5.50, 3 runs)               | -         |
| Layout step in a batch        | 2.09 ms (2.08-2.09, 3 runs)               | -         |
| Drag frame                    | 7.90 / 8.10 / 8.60 ms (7.70-7.90, 3 runs) | -         |
| GPU still frame               | 0.00 / 7.09 / 7.15 ms (0.00-0.00, 3 runs) | -         |
| Hover while the layout runs   | 2.50 ms (1.70-3.00, 3 runs)               | -         |

**Labels on, 100,000 nodes**

| Measure                       | labels off                                | labels on |
| ----------------------------- | ----------------------------------------- | --------- |
| First frame                   | 4.07 s (3.89-4.08, 3 runs)                | -         |
| Ready                         | 4.29 s (4.06-4.29, 3 runs)                | -         |
| Still frame                   | 74.0 / 74.7 / 77.0 ms (73.9-74.4, 3 runs) | -         |
| Moving frame                  | 74.4 / 75.1 / 75.9 ms (74.2-74.7, 3 runs) | -         |
| JavaScript heap               | 359 MB (359-359, 3 runs)                  | -         |
| Renderer and GPU processes    | 879 MB (868-911, 3 runs)                  | -         |
| Card memory growth            | 131 MB (121-131, 3 runs)                  | -         |
| Frame while the layout runs   | 80.5 / 91.1 / 92.1 ms (68.4-81.1, 3 runs) | -         |
| One layout step plus readback | 90.6 ms (45.7-91.8, 3 runs)               | -         |
| Layout step in a batch        | 17.5 ms (17.3-17.6, 3 runs)               | -         |
| Drag frame                    | 74.5 / 75.3 / 77.7 ms (74.2-74.8, 3 runs) | -         |
| GPU still frame               | 0.00 / 73.2 / 73.4 ms (0.00-0.00, 3 runs) | -         |
| Hover while the layout runs   | 5.60 ms (5.60-7.50, 3 runs)               | -         |

## CPU layout (acceleration off)

| Configuration      | Frame while the layout runs | One CPU step |
| ------------------ | --------------------------- | ------------ |
| 2D lean, 10,000    | -                           | -            |
| 3D default, 10,000 | -                           | -            |
| 2D lean, 100,000   | -                           | -            |

## Every run

| Library | Mode | Accel | Nodes     | Ratio | Labels | Flags       | Stages reached                                                  | Failure | Runs | Load when each began |
| ------- | ---- | ----- | --------- | ----- | ------ | ----------- | --------------------------------------------------------------- | ------- | ---- | -------------------- |
| graphty | lean | on    | 10,000    | 1     | off    |             | load still orbit memory hover layoutFps hoverLayout layoutSteps |         | 3    | 18.6, 13.8, 25.1     |
| graphty | lean | on    | 100,000   | 1     | off    |             | load still orbit memory hover layoutFps hoverLayout layoutSteps |         | 3    | 8.97, 30.5, 17.6     |
| graphty | lean | on    | 1,000,000 | 1     | off    |             | load still orbit memory hover layoutFps hoverLayout layoutSteps |         | 3    | 22.9, 9.49, 7.15     |
| graphty | lean | on    | 10,000    | 2     | off    | skip-layout | load still orbit memory hover                                   |         | 3    | 12.6, 49.7, 43.0     |
| graphty | lean | on    | 100,000   | 2     | off    | skip-layout | load still orbit memory hover                                   |         | 3    | 5.85, 40.4, 13.4     |
| graphty | lean | on    | 1,000,000 | 2     | off    | skip-layout | load still orbit memory hover                                   |         | 3    | 46.6, 37.6, 18.1     |

## Against section 8.3

The new median over the 8.3 figure: above 1.00 is more than before. For a range in 8.3 the middle is used; graphty-element's hover is compared with its "on golden" row. Every 8.3 graphty-element figure except hover comes from the 2026-10-17 build.

**10,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | -                             | 1.36 -> 0.48 s (0.35)       | -                              |
| Ready                         | -                             | 3.30 -> 0.51 s (0.15)       | -                              |
| Still frame                   | -                             | 33.4 -> 7.90 ms (0.24)      | -                              |
| Moving frame                  | -                             | 40.6 -> 7.90 ms (0.19)      | -                              |
| Hover                         | -                             | -                           | -                              |
| JavaScript heap               | -                             | 345 -> 74.0 MB (0.21)       | -                              |
| Renderer and GPU processes    | -                             | 791 -> 477 MB (0.60)        | -                              |
| Frame while the layout runs   | -                             | 118 -> 24.0 ms (0.20)       | -                              |
| One layout step plus readback | -                             | 27.3 -> 5.50 ms (0.20)      | -                              |
| Layout step in a batch        | -                             | 2.70 -> 2.09 ms (0.77)      | -                              |
| Drag frame                    | -                             | -                           | -                              |
| GPU still frame               | -                             | -                           | -                              |
| Hover while the layout runs   | -                             | -                           | -                              |

**100,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | -                             | 28.3 -> 4.07 s (0.14)       | -                              |
| Ready                         | -                             | 52.7 -> 4.29 s (0.08)       | -                              |
| Still frame                   | -                             | 86.1 -> 74.0 ms (0.86)      | -                              |
| Moving frame                  | -                             | 126 -> 74.4 ms (0.59)       | -                              |
| Hover                         | -                             | -                           | -                              |
| JavaScript heap               | -                             | 3,045 -> 359 MB (0.12)      | -                              |
| Renderer and GPU processes    | -                             | 3,762 -> 879 MB (0.23)      | -                              |
| Frame while the layout runs   | -                             | 1,575 -> 80.5 ms (0.05)     | -                              |
| One layout step plus readback | -                             | 394 -> 90.6 ms (0.23)       | -                              |
| Layout step in a batch        | -                             | 23.4 -> 17.5 ms (0.75)      | -                              |
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
