# cosmos.gl and graphty-element, build stage-2

- Commit: a347a8d337e46651b45ea4af29900342dd4e1192 (working tree clean)
- Source: feat-3251-stage-2-walk-only-what-moved
- Render path: default
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 1 (0 void), 2026-11-05T18:49:07.742Z to 2026-11-05T18:49:07.742Z
- Load average when a run began: 36.5-36.5

A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure | cosmos.gl | graphty-element 2D lean | graphty-element 3D default |
| ------- | --------- | ----------------------- | -------------------------- |

**100,000 nodes, 1,000,000 edges**

| Measure                    | cosmos.gl | graphty-element 2D lean              | graphty-element 3D default |
| -------------------------- | --------- | ------------------------------------ | -------------------------- |
| First frame                | -         | 81.9 s (81.9-81.9, 1 runs)           | -                          |
| Ready                      | -         | 81.9 s (81.9-81.9, 1 runs)           | -                          |
| Still frame                | -         | 170 / 196 / 231 ms (170-170, 1 runs) | -                          |
| Moving frame               | -         | 357 / 415 / 470 ms (357-357, 1 runs) | -                          |
| Hover                      | -         | 44.1 ms (44.1-44.1, 1 runs)          | -                          |
| JavaScript heap            | -         | 2,852 MB (2,852-2,852, 1 runs)       | -                          |
| Renderer and GPU processes | -         | 3,669 MB (3,669-3,669, 1 runs)       | -                          |
| Card memory growth         | -         | 13.0 MB (13.0-13.0, 1 runs)          | -                          |
| Drag frame                 | -         | 326 / 395 / 418 ms (326-326, 1 runs) | -                          |

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

| Measure                    | labels off                           | labels on |
| -------------------------- | ------------------------------------ | --------- |
| First frame                | 81.9 s (81.9-81.9, 1 runs)           | -         |
| Ready                      | 81.9 s (81.9-81.9, 1 runs)           | -         |
| Still frame                | 170 / 196 / 231 ms (170-170, 1 runs) | -         |
| Moving frame               | 357 / 415 / 470 ms (357-357, 1 runs) | -         |
| Hover                      | 44.1 ms (44.1-44.1, 1 runs)          | -         |
| JavaScript heap            | 2,852 MB (2,852-2,852, 1 runs)       | -         |
| Renderer and GPU processes | 3,669 MB (3,669-3,669, 1 runs)       | -         |
| Card memory growth         | 13.0 MB (13.0-13.0, 1 runs)          | -         |
| Drag frame                 | 326 / 395 / 418 ms (326-326, 1 runs) | -         |

## CPU layout (acceleration off)

| Configuration      | Frame while the layout runs | One CPU step |
| ------------------ | --------------------------- | ------------ |
| 2D lean, 10,000    | -                           | -            |
| 3D default, 10,000 | -                           | -            |
| 2D lean, 100,000   | -                           | -            |

## Every run

| Library | Mode | Accel | Nodes   | Ratio | Labels | Flags       | Stages reached                | Failure | Runs | Load when each began |
| ------- | ---- | ----- | ------- | ----- | ------ | ----------- | ----------------------------- | ------- | ---- | -------------------- |
| graphty | lean | on    | 100,000 | 1     | off    | skip-layout | load still orbit memory hover |         | 1    | 36.5                 |

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
| First frame                   | -                             | 28.3 -> 81.9 s (2.89)       | -                              |
| Ready                         | -                             | 52.7 -> 81.9 s (1.55)       | -                              |
| Still frame                   | -                             | 86.1 -> 170 ms (1.98)       | -                              |
| Moving frame                  | -                             | 126 -> 357 ms (2.82)        | -                              |
| Hover                         | -                             | 103 -> 44.1 ms (0.43)       | -                              |
| JavaScript heap               | -                             | 3,045 -> 2,852 MB (0.94)    | -                              |
| Renderer and GPU processes    | -                             | 3,762 -> 3,669 MB (0.98)    | -                              |
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
