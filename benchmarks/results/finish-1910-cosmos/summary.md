# cosmos.gl and graphty-element, build finish-1910

- Commit: 4fea332375097f7140f008234902681efcc72d59 (working tree clean)
- Source: bench-1910-cosmos-quality
- Render path:
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 18 (0 void), 2026-11-25T02:58:50.053Z to 2026-11-25T05:13:49.132Z
- Load average when a run began: 6.77-61.6

A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure                       | cosmos.gl                                 | graphty-element 2D lean | graphty-element 3D default |
| ----------------------------- | ----------------------------------------- | ----------------------- | -------------------------- |
| First frame                   | 0.16 s (0.15-0.17, 3 runs)                | -                       | -                          |
| Ready                         | 0.16 s (0.15-0.17, 3 runs)                | -                       | -                          |
| Still frame                   | 3.60 / 6.40 / 6.70 ms (3.50-3.70, 3 runs) | -                       | -                          |
| Moving frame                  | 3.50 / 3.70 / 3.90 ms (3.40-3.60, 3 runs) | -                       | -                          |
| JavaScript heap               | 23.0 MB (23.0-23.0, 3 runs)               | -                       | -                          |
| Renderer and GPU processes    | 428 MB (423-430, 3 runs)                  | -                       | -                          |
| Card memory growth            | 88.0 MB (88.0-94.0, 3 runs)               | -                       | -                          |
| Frame while the layout runs   | 4.60 / 6.50 / 16.4 ms (4.00-4.70, 3 runs) | -                       | -                          |
| One layout step plus readback | 3.30 ms (3.20-5.60, 3 runs)               | -                       | -                          |
| Layout step in a batch        | 1.99 ms (1.95-3.92, 3 runs)               | -                       | -                          |

**100,000 nodes, 1,000,000 edges**

| Measure                       | cosmos.gl                                 | graphty-element 2D lean | graphty-element 3D default |
| ----------------------------- | ----------------------------------------- | ----------------------- | -------------------------- |
| First frame                   | 0.59 s (0.57-0.62, 3 runs)                | -                       | -                          |
| Ready                         | 0.59 s (0.57-0.62, 3 runs)                | -                       | -                          |
| Still frame                   | 28.5 / 29.6 / 30.2 ms (28.2-28.8, 3 runs) | -                       | -                          |
| Moving frame                  | 29.0 / 29.9 / 30.2 ms (28.4-29.1, 3 runs) | -                       | -                          |
| JavaScript heap               | 161 MB (161-161, 3 runs)                  | -                       | -                          |
| Renderer and GPU processes    | 602 MB (599-605, 3 runs)                  | -                       | -                          |
| Card memory growth            | 366 MB (345-370, 3 runs)                  | -                       | -                          |
| Frame while the layout runs   | 5.80 / 21.3 / 21.5 ms (5.60-9.00, 3 runs) | -                       | -                          |
| One layout step plus readback | 5.40 ms (5.20-7.70, 3 runs)               | -                       | -                          |
| Layout step in a batch        | 3.94 ms (3.78-4.00, 3 runs)               | -                       | -                          |
| Hover while the layout runs   | 5.20 ms (5.20-5.20, 1 runs)               | -                       | -                          |

**1,000,000 nodes, 1,000,000 edges**

| Measure                       | cosmos.gl                                 |
| ----------------------------- | ----------------------------------------- |
| First frame                   | 1.05 s (1.02-1.12, 3 runs)                |
| Ready                         | 1.05 s (1.02-1.12, 3 runs)                |
| Still frame                   | 28.9 / 29.3 / 29.8 ms (28.9-28.9, 3 runs) |
| Moving frame                  | 29.1 / 29.7 / 30.0 ms (29.0-29.2, 3 runs) |
| JavaScript heap               | 270 MB (270-270, 3 runs)                  |
| Renderer and GPU processes    | 787 MB (786-790, 3 runs)                  |
| Card memory growth            | 568 MB (568-568, 3 runs)                  |
| Frame while the layout runs   | 22.3 / 67.1 / 67.3 ms (19.8-28.0, 3 runs) |
| One layout step plus readback | 38.3 ms (37.0-39.1, 3 runs)               |
| Layout step in a batch        | 31.0 ms (31.0-32.0, 3 runs)               |

## Results at device pixel ratio 2

Both libraries draw 2400 x 1800; graphty-element runs with pixel-ratio="device". No layout in these runs.

**10,000 nodes, 100,000 edges, ratio 2**

| Measure                    | cosmos.gl                                 | graphty-element 2D lean | graphty-element 3D default |
| -------------------------- | ----------------------------------------- | ----------------------- | -------------------------- |
| First frame                | 0.17 s (0.17-2.38, 3 runs)                | -                       | -                          |
| Ready                      | 0.17 s (0.17-2.38, 3 runs)                | -                       | -                          |
| Still frame                | 6.90 / 7.40 / 7.80 ms (6.80-7.00, 3 runs) | -                       | -                          |
| Moving frame               | 6.80 / 7.10 / 7.20 ms (6.80-6.80, 3 runs) | -                       | -                          |
| JavaScript heap            | 23.0 MB (23.0-23.0, 3 runs)               | -                       | -                          |
| Renderer and GPU processes | 423 MB (417-431, 3 runs)                  | -                       | -                          |
| Card memory growth         | 174 MB (-101-174, 3 runs)                 | -                       | -                          |

**100,000 nodes, 1,000,000 edges, ratio 2**

| Measure                    | cosmos.gl                                 | graphty-element 2D lean | graphty-element 3D default |
| -------------------------- | ----------------------------------------- | ----------------------- | -------------------------- |
| First frame                | 0.69 s (0.65-0.74, 3 runs)                | -                       | -                          |
| Ready                      | 0.69 s (0.65-0.74, 3 runs)                | -                       | -                          |
| Still frame                | 60.6 / 61.0 / 61.9 ms (60.1-60.9, 3 runs) | -                       | -                          |
| Moving frame               | 60.6 / 61.0 / 62.0 ms (60.1-61.0, 3 runs) | -                       | -                          |
| JavaScript heap            | 160 MB (160-160, 3 runs)                  | -                       | -                          |
| Renderer and GPU processes | 611 MB (604-612, 3 runs)                  | -                       | -                          |
| Card memory growth         | 424 MB (424-436, 3 runs)                  | -                       | -                          |

**1,000,000 nodes, 1,000,000 edges, ratio 2**

| Measure                    | cosmos.gl                                 |
| -------------------------- | ----------------------------------------- |
| First frame                | 1.33 s (1.14-1.47, 3 runs)                |
| Ready                      | 1.33 s (1.14-1.47, 3 runs)                |
| Still frame                | 60.5 / 61.0 / 63.1 ms (60.4-60.5, 3 runs) |
| Moving frame               | 60.5 / 61.1 / 62.7 ms (60.5-60.6, 3 runs) |
| JavaScript heap            | 270 MB (270-270, 3 runs)                  |
| Renderer and GPU processes | 785 MB (762-788, 3 runs)                  |
| Card memory growth         | 630 MB (628-630, 3 runs)                  |

## Labels

graphty-element 2D lean with `node.label` bound to each node's id, ratio 1, no layout.

**Labels on against labels off, 10,000 nodes**

| Measure | labels off | labels on |
| ------- | ---------- | --------- |

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

| Library | Mode    | Accel | Nodes     | Ratio | Labels | Flags       | Stages reached                                                  | Failure | Runs | Load when each began |
| ------- | ------- | ----- | --------- | ----- | ------ | ----------- | --------------------------------------------------------------- | ------- | ---- | -------------------- |
| cosmos  | default | on    | 10,000    | 1     | off    |             | load still orbit memory hover layoutFps hoverLayout layoutSteps |         | 3    | 24.1, 26.4, 25.3     |
| cosmos  | default | on    | 100,000   | 1     | off    |             | load still orbit memory hover layoutFps hoverLayout layoutSteps |         | 3    | 6.77, 11.0, 12.2     |
| cosmos  | default | on    | 1,000,000 | 1     | off    |             | load still orbit memory hover layoutFps hoverLayout layoutSteps |         | 3    | 22.1, 15.5, 20.7     |
| cosmos  | default | on    | 10,000    | 2     | off    | skip-layout | load still orbit memory hover                                   |         | 3    | 17.2, 46.8, 31.8     |
| cosmos  | default | on    | 100,000   | 2     | off    | skip-layout | load still orbit memory hover                                   |         | 3    | 8.57, 52.7, 21.3     |
| cosmos  | default | on    | 1,000,000 | 2     | off    | skip-layout | load still orbit memory hover                                   |         | 3    | 48.5, 61.6, 11.0     |

## Against section 8.3

The new median over the 8.3 figure: above 1.00 is more than before. For a range in 8.3 the middle is used; graphty-element's hover is compared with its "on golden" row. Every 8.3 graphty-element figure except hover comes from the 2026-10-17 build.

**10,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | 0.20 -> 0.16 s (0.78)         | -                           | -                              |
| Ready                         | 0.20 -> 0.16 s (0.78)         | -                           | -                              |
| Still frame                   | 3.95 -> 3.60 ms (0.91)        | -                           | -                              |
| Moving frame                  | 3.85 -> 3.50 ms (0.91)        | -                           | -                              |
| Hover                         | -                             | -                           | -                              |
| JavaScript heap               | 22.0 -> 23.0 MB (1.05)        | -                           | -                              |
| Renderer and GPU processes    | 430 -> 428 MB (1.00)          | -                           | -                              |
| Frame while the layout runs   | 7.05 -> 4.60 ms (0.65)        | -                           | -                              |
| One layout step plus readback | 7.25 -> 3.30 ms (0.46)        | -                           | -                              |
| Layout step in a batch        | 4.80 -> 1.99 ms (0.41)        | -                           | -                              |
| Drag frame                    | -                             | -                           | -                              |
| GPU still frame               | -                             | -                           | -                              |
| Hover while the layout runs   | -                             | -                           | -                              |

**100,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | 0.69 -> 0.59 s (0.85)         | -                           | -                              |
| Ready                         | 0.69 -> 0.59 s (0.85)         | -                           | -                              |
| Still frame                   | 28.4 -> 28.5 ms (1.00)        | -                           | -                              |
| Moving frame                  | 28.7 -> 29.0 ms (1.01)        | -                           | -                              |
| Hover                         | -                             | -                           | -                              |
| JavaScript heap               | 160 -> 161 MB (1.01)          | -                           | -                              |
| Renderer and GPU processes    | 616 -> 602 MB (0.98)          | -                           | -                              |
| Frame while the layout runs   | 19.0 -> 5.80 ms (0.31)        | -                           | -                              |
| One layout step plus readback | 9.10 -> 5.40 ms (0.59)        | -                           | -                              |
| Layout step in a batch        | 3.85 -> 3.94 ms (1.02)        | -                           | -                              |
| Drag frame                    | -                             | -                           | -                              |
| GPU still frame               | -                             | -                           | -                              |
| Hover while the layout runs   | -                             | -                           | -                              |

**1,000,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- |
| First frame                   | 1.74 -> 1.05 s (0.60)         |
| Ready                         | 1.74 -> 1.05 s (0.60)         |
| Still frame                   | 29.2 -> 28.9 ms (0.99)        |
| Moving frame                  | 29.4 -> 29.1 ms (0.99)        |
| Hover                         | -                             |
| JavaScript heap               | 270 -> 270 MB (1.00)          |
| Renderer and GPU processes    | 800 -> 787 MB (0.98)          |
| Frame while the layout runs   | 32.7 -> 22.3 ms (0.68)        |
| One layout step plus readback | 43.9 -> 38.3 ms (0.87)        |
| Layout step in a batch        | 30.9 -> 31.0 ms (1.00)        |
| Drag frame                    | -                             |
| GPU still frame               | -                             |
| Hover while the layout runs   | -                             |
