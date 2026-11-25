# cosmos.gl and graphty-element, build finish-1910

- Commit: 4fea332375097f7140f008234902681efcc72d59 (working tree clean)
- Source: bench-1910-cosmos-quality
- Render path: objects
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 12 (0 void), 2026-11-25T03:06:37.188Z to 2026-11-25T04:56:04.070Z
- Load average when a run began: 8.31-56.4

A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure                       | cosmos.gl | graphty-element 2D lean                   | graphty-element 3D default |
| ----------------------------- | --------- | ----------------------------------------- | -------------------------- |
| First frame                   | -         | 2.28 s (1.80-2.32, 3 runs)                | -                          |
| Ready                         | -         | 2.34 s (1.85-2.38, 3 runs)                | -                          |
| Still frame                   | -         | 13.0 / 14.2 / 16.1 ms (11.5-13.1, 3 runs) | -                          |
| Moving frame                  | -         | 15.9 / 19.8 / 22.8 ms (15.7-16.9, 3 runs) | -                          |
| JavaScript heap               | -         | 303 MB (303-303, 3 runs)                  | -                          |
| Renderer and GPU processes    | -         | 756 MB (753-760, 3 runs)                  | -                          |
| Card memory growth            | -         | 81.0 MB (81.0-81.0, 3 runs)               | -                          |
| Frame while the layout runs   | -         | 105 / 124 / 155 ms (103-126, 3 runs)      | -                          |
| One layout step plus readback | -         | 10.3 ms (9.20-10.5, 3 runs)               | -                          |
| Layout step in a batch        | -         | 1.39 ms (1.28-1.44, 3 runs)               | -                          |
| Drag frame                    | -         | 16.1 / 17.7 / 19.0 ms (16.0-17.5, 3 runs) | -                          |
| GPU still frame               | -         | 0.00 / 6.83 / 6.83 ms (0.00-0.00, 3 runs) | -                          |
| Hover while the layout runs   | -         | 2.60 ms (2.10-2.80, 3 runs)               | -                          |

**100,000 nodes, 1,000,000 edges**

| Measure                       | cosmos.gl | graphty-element 2D lean                        | graphty-element 3D default |
| ----------------------------- | --------- | ---------------------------------------------- | -------------------------- |
| First frame                   | -         | 36.8 s (35.0-37.5, 3 runs)                     | -                          |
| Ready                         | -         | 37.5 s (35.0-38.3, 3 runs)                     | -                          |
| Still frame                   | -         | 121 / 133 / 145 ms (121-122, 3 runs)           | -                          |
| Moving frame                  | -         | 167 / 183 / 208 ms (166-168, 3 runs)           | -                          |
| JavaScript heap               | -         | 2,601 MB (2,601-2,601, 3 runs)                 | -                          |
| Renderer and GPU processes    | -         | 3,502 MB (3,502-3,514, 3 runs)                 | -                          |
| Card memory growth            | -         | 81.0 MB (81.0-508, 3 runs)                     | -                          |
| Frame while the layout runs   | -         | 1,794 / 2,657 / 2,657 ms (1,602-1,804, 3 runs) | -                          |
| One layout step plus readback | -         | 97.8 ms (95.8-100, 3 runs)                     | -                          |
| Layout step in a batch        | -         | 6.03 ms (5.99-6.43, 3 runs)                    | -                          |
| Drag frame                    | -         | 167 / 199 / 225 ms (167-176, 3 runs)           | -                          |
| GPU still frame               | -         | 0.00 / 71.4 / 72.1 ms (0.00-0.00, 3 runs)      | -                          |
| Hover while the layout runs   | -         | 22.8 ms (21.3-24.6, 3 runs)                    | -                          |

**1,000,000 nodes, 1,000,000 edges**

| Measure | cosmos.gl |
| ------- | --------- |

## Results at device pixel ratio 2

Both libraries draw 2400 x 1800; graphty-element runs with pixel-ratio="device". No layout in these runs.

**10,000 nodes, 100,000 edges, ratio 2**

| Measure                    | cosmos.gl | graphty-element 2D lean                   | graphty-element 3D default |
| -------------------------- | --------- | ----------------------------------------- | -------------------------- |
| First frame                | -         | 2.49 s (1.91-3.56, 3 runs)                | -                          |
| Ready                      | -         | 2.55 s (1.97-3.63, 3 runs)                | -                          |
| Still frame                | -         | 23.2 / 24.3 / 26.0 ms (22.4-23.8, 3 runs) | -                          |
| Moving frame               | -         | 29.1 / 31.5 / 33.9 ms (26.1-29.2, 3 runs) | -                          |
| JavaScript heap            | -         | 303 MB (303-303, 3 runs)                  | -                          |
| Renderer and GPU processes | -         | 746 MB (659-754, 3 runs)                  | -                          |
| Card memory growth         | -         | 229 MB (224-229, 3 runs)                  | -                          |
| Drag frame                 | -         | 28.7 / 30.8 / 33.1 ms (26.4-30.1, 3 runs) | -                          |
| GPU still frame            | -         | 0.00 / 16.3 / 16.3 ms (0.00-0.00, 3 runs) | -                          |

**100,000 nodes, 1,000,000 edges, ratio 2**

| Measure                    | cosmos.gl | graphty-element 2D lean                 | graphty-element 3D default |
| -------------------------- | --------- | --------------------------------------- | -------------------------- |
| First frame                | -         | 38.3 s (34.8-41.8, 3 runs)              | -                          |
| Ready                      | -         | 39.1 s (35.6-42.8, 3 runs)              | -                          |
| Still frame                | -         | 226 / 234 / 286 ms (225-229, 3 runs)    | -                          |
| Moving frame               | -         | 281 / 298 / 344 ms (279-292, 3 runs)    | -                          |
| JavaScript heap            | -         | 2,601 MB (2,601-2,601, 3 runs)          | -                          |
| Renderer and GPU processes | -         | 3,476 MB (3,471-3,484, 3 runs)          | -                          |
| Card memory growth         | -         | 229 MB (229-464, 3 runs)                | -                          |
| Drag frame                 | -         | 277 / 295 / 351 ms (275-287, 3 runs)    | -                          |
| GPU still frame            | -         | 0.00 / 172 / 172 ms (0.00-0.00, 3 runs) | -                          |

**1,000,000 nodes, 1,000,000 edges, ratio 2**

| Measure | cosmos.gl |
| ------- | --------- |

## Labels

graphty-element 2D lean with `node.label` bound to each node's id, ratio 1, no layout.

**Labels on against labels off, 10,000 nodes**

| Measure                       | labels off                                | labels on |
| ----------------------------- | ----------------------------------------- | --------- |
| First frame                   | 2.28 s (1.80-2.32, 3 runs)                | -         |
| Ready                         | 2.34 s (1.85-2.38, 3 runs)                | -         |
| Still frame                   | 13.0 / 14.2 / 16.1 ms (11.5-13.1, 3 runs) | -         |
| Moving frame                  | 15.9 / 19.8 / 22.8 ms (15.7-16.9, 3 runs) | -         |
| JavaScript heap               | 303 MB (303-303, 3 runs)                  | -         |
| Renderer and GPU processes    | 756 MB (753-760, 3 runs)                  | -         |
| Card memory growth            | 81.0 MB (81.0-81.0, 3 runs)               | -         |
| Frame while the layout runs   | 105 / 124 / 155 ms (103-126, 3 runs)      | -         |
| One layout step plus readback | 10.3 ms (9.20-10.5, 3 runs)               | -         |
| Layout step in a batch        | 1.39 ms (1.28-1.44, 3 runs)               | -         |
| Drag frame                    | 16.1 / 17.7 / 19.0 ms (16.0-17.5, 3 runs) | -         |
| GPU still frame               | 0.00 / 6.83 / 6.83 ms (0.00-0.00, 3 runs) | -         |
| Hover while the layout runs   | 2.60 ms (2.10-2.80, 3 runs)               | -         |

**Labels on, 100,000 nodes**

| Measure                       | labels off                                     | labels on |
| ----------------------------- | ---------------------------------------------- | --------- |
| First frame                   | 36.8 s (35.0-37.5, 3 runs)                     | -         |
| Ready                         | 37.5 s (35.0-38.3, 3 runs)                     | -         |
| Still frame                   | 121 / 133 / 145 ms (121-122, 3 runs)           | -         |
| Moving frame                  | 167 / 183 / 208 ms (166-168, 3 runs)           | -         |
| JavaScript heap               | 2,601 MB (2,601-2,601, 3 runs)                 | -         |
| Renderer and GPU processes    | 3,502 MB (3,502-3,514, 3 runs)                 | -         |
| Card memory growth            | 81.0 MB (81.0-508, 3 runs)                     | -         |
| Frame while the layout runs   | 1,794 / 2,657 / 2,657 ms (1,602-1,804, 3 runs) | -         |
| One layout step plus readback | 97.8 ms (95.8-100, 3 runs)                     | -         |
| Layout step in a batch        | 6.03 ms (5.99-6.43, 3 runs)                    | -         |
| Drag frame                    | 167 / 199 / 225 ms (167-176, 3 runs)           | -         |
| GPU still frame               | 0.00 / 71.4 / 72.1 ms (0.00-0.00, 3 runs)      | -         |
| Hover while the layout runs   | 22.8 ms (21.3-24.6, 3 runs)                    | -         |

## CPU layout (acceleration off)

| Configuration      | Frame while the layout runs | One CPU step |
| ------------------ | --------------------------- | ------------ |
| 2D lean, 10,000    | -                           | -            |
| 3D default, 10,000 | -                           | -            |
| 2D lean, 100,000   | -                           | -            |

## Every run

| Library | Mode | Accel | Nodes   | Ratio | Labels | Flags       | Stages reached                                                  | Failure | Runs | Load when each began |
| ------- | ---- | ----- | ------- | ----- | ------ | ----------- | --------------------------------------------------------------- | ------- | ---- | -------------------- |
| graphty | lean | on    | 10,000  | 1     | off    |             | load still orbit memory hover layoutFps hoverLayout layoutSteps |         | 3    | 12.7, 26.8, 8.31     |
| graphty | lean | on    | 100,000 | 1     | off    |             | load still orbit memory hover layoutFps hoverLayout layoutSteps |         | 3    | 18.3, 39.2, 17.4     |
| graphty | lean | on    | 10,000  | 2     | off    | skip-layout | load still orbit memory hover                                   |         | 3    | 14.2, 56.4, 33.0     |
| graphty | lean | on    | 100,000 | 2     | off    | skip-layout | load still orbit memory hover                                   |         | 3    | 22.4, 41.3, 28.6     |

## Against section 8.3

The new median over the 8.3 figure: above 1.00 is more than before. For a range in 8.3 the middle is used; graphty-element's hover is compared with its "on golden" row. Every 8.3 graphty-element figure except hover comes from the 2026-10-17 build.

**10,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | -                             | 1.36 -> 2.28 s (1.68)       | -                              |
| Ready                         | -                             | 3.30 -> 2.34 s (0.71)       | -                              |
| Still frame                   | -                             | 33.4 -> 13.0 ms (0.39)      | -                              |
| Moving frame                  | -                             | 40.6 -> 15.9 ms (0.39)      | -                              |
| Hover                         | -                             | -                           | -                              |
| JavaScript heap               | -                             | 345 -> 303 MB (0.88)        | -                              |
| Renderer and GPU processes    | -                             | 791 -> 756 MB (0.96)        | -                              |
| Frame while the layout runs   | -                             | 118 -> 105 ms (0.90)        | -                              |
| One layout step plus readback | -                             | 27.3 -> 10.3 ms (0.38)      | -                              |
| Layout step in a batch        | -                             | 2.70 -> 1.39 ms (0.51)      | -                              |
| Drag frame                    | -                             | -                           | -                              |
| GPU still frame               | -                             | -                           | -                              |
| Hover while the layout runs   | -                             | -                           | -                              |

**100,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | -                             | 28.3 -> 36.8 s (1.30)       | -                              |
| Ready                         | -                             | 52.7 -> 37.5 s (0.71)       | -                              |
| Still frame                   | -                             | 86.1 -> 121 ms (1.41)       | -                              |
| Moving frame                  | -                             | 126 -> 167 ms (1.32)        | -                              |
| Hover                         | -                             | -                           | -                              |
| JavaScript heap               | -                             | 3,045 -> 2,601 MB (0.85)    | -                              |
| Renderer and GPU processes    | -                             | 3,762 -> 3,502 MB (0.93)    | -                              |
| Frame while the layout runs   | -                             | 1,575 -> 1,794 ms (1.14)    | -                              |
| One layout step plus readback | -                             | 394 -> 97.8 ms (0.25)       | -                              |
| Layout step in a batch        | -                             | 23.4 -> 6.03 ms (0.26)      | -                              |
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
