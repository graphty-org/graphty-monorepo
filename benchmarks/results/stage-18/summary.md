# cosmos.gl and graphty-element, build stage-18

- Commit: c67598a295d6b14e21bc0e26015bfe41e560dc2a (working tree clean)
- Source: feat-3250-stage-18-id-buffer-edges
- Render path: batched
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 1 (0 void), 2026-11-08T11:44:19.141Z to 2026-11-08T11:44:19.141Z
- Load average when a run began: 12.5-12.5

A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure | cosmos.gl | graphty-element 2D lean | graphty-element 3D default |
| ------- | --------- | ----------------------- | -------------------------- |

**100,000 nodes, 1,000,000 edges**

| Measure                       | cosmos.gl | graphty-element 2D lean                        | graphty-element 3D default |
| ----------------------------- | --------- | ---------------------------------------------- | -------------------------- |
| First frame                   | -         | 26.0 s (26.0-26.0, 1 runs)                     | -                          |
| Ready                         | -         | 26.0 s (26.0-26.0, 1 runs)                     | -                          |
| Still frame                   | -         | 87.0 / 88.2 / 88.7 ms (87.0-87.0, 1 runs)      | -                          |
| Moving frame                  | -         | 87.8 / 90.5 / 91.2 ms (87.8-87.8, 1 runs)      | -                          |
| Hover                         | -         | 1.50 ms (1.50-1.50, 1 runs)                    | -                          |
| JavaScript heap               | -         | 1,964 MB (1,964-1,964, 1 runs)                 | -                          |
| Renderer and GPU processes    | -         | 2,945 MB (2,945-2,945, 1 runs)                 | -                          |
| Card memory growth            | -         | 87.0 MB (87.0-87.0, 1 runs)                    | -                          |
| Frame while the layout runs   | -         | 1,114 / 1,511 / 1,576 ms (1,114-1,114, 1 runs) | -                          |
| One layout step plus readback | -         | 72.7 ms (72.7-72.7, 1 runs)                    | -                          |
| Layout step in a batch        | -         | 6.56 ms (6.56-6.56, 1 runs)                    | -                          |
| Drag frame                    | -         | 107 / 117 / 120 ms (107-107, 1 runs)           | -                          |

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
| First frame                   | 26.0 s (26.0-26.0, 1 runs)                     | -         |
| Ready                         | 26.0 s (26.0-26.0, 1 runs)                     | -         |
| Still frame                   | 87.0 / 88.2 / 88.7 ms (87.0-87.0, 1 runs)      | -         |
| Moving frame                  | 87.8 / 90.5 / 91.2 ms (87.8-87.8, 1 runs)      | -         |
| Hover                         | 1.50 ms (1.50-1.50, 1 runs)                    | -         |
| JavaScript heap               | 1,964 MB (1,964-1,964, 1 runs)                 | -         |
| Renderer and GPU processes    | 2,945 MB (2,945-2,945, 1 runs)                 | -         |
| Card memory growth            | 87.0 MB (87.0-87.0, 1 runs)                    | -         |
| Frame while the layout runs   | 1,114 / 1,511 / 1,576 ms (1,114-1,114, 1 runs) | -         |
| One layout step plus readback | 72.7 ms (72.7-72.7, 1 runs)                    | -         |
| Layout step in a batch        | 6.56 ms (6.56-6.56, 1 runs)                    | -         |
| Drag frame                    | 107 / 117 / 120 ms (107-107, 1 runs)           | -         |

## CPU layout (acceleration off)

| Configuration      | Frame while the layout runs | One CPU step |
| ------------------ | --------------------------- | ------------ |
| 2D lean, 10,000    | -                           | -            |
| 3D default, 10,000 | -                           | -            |
| 2D lean, 100,000   | -                           | -            |

## Every run

| Library | Mode | Accel | Nodes   | Ratio | Labels | Flags | Stages reached                                      | Failure | Runs | Load when each began |
| ------- | ---- | ----- | ------- | ----- | ------ | ----- | --------------------------------------------------- | ------- | ---- | -------------------- |
| graphty | lean | on    | 100,000 | 1     | off    |       | load still orbit memory hover layoutFps layoutSteps |         | 1    | 12.5                 |

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
| First frame                   | -                             | 28.3 -> 26.0 s (0.92)       | -                              |
| Ready                         | -                             | 52.7 -> 26.0 s (0.49)       | -                              |
| Still frame                   | -                             | 86.1 -> 87.0 ms (1.01)      | -                              |
| Moving frame                  | -                             | 126 -> 87.8 ms (0.70)       | -                              |
| Hover                         | -                             | 103 -> 1.50 ms (0.01)       | -                              |
| JavaScript heap               | -                             | 3,045 -> 1,964 MB (0.64)    | -                              |
| Renderer and GPU processes    | -                             | 3,762 -> 2,945 MB (0.78)    | -                              |
| Frame while the layout runs   | -                             | 1,575 -> 1,114 ms (0.71)    | -                              |
| One layout step plus readback | -                             | 394 -> 72.7 ms (0.18)       | -                              |
| Layout step in a batch        | -                             | 23.4 -> 6.56 ms (0.28)      | -                              |
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
