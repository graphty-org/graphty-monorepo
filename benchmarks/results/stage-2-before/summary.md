# cosmos.gl and graphty-element, build stage-2-before

- Commit: 81dd2da64bd251e7b5c439e16148b759fc26f9b9 (working tree clean)
- Source: feat-3248-stage-1-reference-run-column-publish
- Render path: default
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 1 (0 void), 2026-11-05T18:53:22.308Z to 2026-11-05T18:53:22.308Z
- Load average when a run began: 37.1-37.1

A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure | cosmos.gl | graphty-element 2D lean | graphty-element 3D default |
| ------- | --------- | ----------------------- | -------------------------- |

**100,000 nodes, 1,000,000 edges**

| Measure                    | cosmos.gl | graphty-element 2D lean                  | graphty-element 3D default |
| -------------------------- | --------- | ---------------------------------------- | -------------------------- |
| First frame                | -         | 78.6 s (78.6-78.6, 1 runs)               | -                          |
| Ready                      | -         | 78.6 s (78.6-78.6, 1 runs)               | -                          |
| Still frame                | -         | 173 / 196 / 213 ms (173-173, 1 runs)     | -                          |
| Moving frame               | -         | 346 / 422 / 469 ms (346-346, 1 runs)     | -                          |
| Hover                      | -         | 50.4 ms (50.4-50.4, 1 runs)              | -                          |
| JavaScript heap            | -         | 2,851 MB (2,851-2,851, 1 runs)           | -                          |
| Renderer and GPU processes | -         | 3,697 MB (3,697-3,697, 1 runs)           | -                          |
| Card memory growth         | -         | 233 MB (233-233, 1 runs)                 | -                          |
| Drag frame                 | -         | 907 / 1,009 / 1,091 ms (907-907, 1 runs) | -                          |

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

| Measure                    | labels off                               | labels on |
| -------------------------- | ---------------------------------------- | --------- |
| First frame                | 78.6 s (78.6-78.6, 1 runs)               | -         |
| Ready                      | 78.6 s (78.6-78.6, 1 runs)               | -         |
| Still frame                | 173 / 196 / 213 ms (173-173, 1 runs)     | -         |
| Moving frame               | 346 / 422 / 469 ms (346-346, 1 runs)     | -         |
| Hover                      | 50.4 ms (50.4-50.4, 1 runs)              | -         |
| JavaScript heap            | 2,851 MB (2,851-2,851, 1 runs)           | -         |
| Renderer and GPU processes | 3,697 MB (3,697-3,697, 1 runs)           | -         |
| Card memory growth         | 233 MB (233-233, 1 runs)                 | -         |
| Drag frame                 | 907 / 1,009 / 1,091 ms (907-907, 1 runs) | -         |

## CPU layout (acceleration off)

| Configuration      | Frame while the layout runs | One CPU step |
| ------------------ | --------------------------- | ------------ |
| 2D lean, 10,000    | -                           | -            |
| 3D default, 10,000 | -                           | -            |
| 2D lean, 100,000   | -                           | -            |

## Every run

| Library | Mode | Accel | Nodes   | Ratio | Labels | Flags       | Stages reached                | Failure | Runs | Load when each began |
| ------- | ---- | ----- | ------- | ----- | ------ | ----------- | ----------------------------- | ------- | ---- | -------------------- |
| graphty | lean | on    | 100,000 | 1     | off    | skip-layout | load still orbit memory hover |         | 1    | 37.1                 |

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
| First frame                   | -                             | 28.3 -> 78.6 s (2.78)       | -                              |
| Ready                         | -                             | 52.7 -> 78.6 s (1.49)       | -                              |
| Still frame                   | -                             | 86.1 -> 173 ms (2.01)       | -                              |
| Moving frame                  | -                             | 126 -> 346 ms (2.74)        | -                              |
| Hover                         | -                             | 103 -> 50.4 ms (0.49)       | -                              |
| JavaScript heap               | -                             | 3,045 -> 2,851 MB (0.94)    | -                              |
| Renderer and GPU processes    | -                             | 3,762 -> 3,697 MB (0.98)    | -                              |
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
