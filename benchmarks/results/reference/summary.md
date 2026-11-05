# cosmos.gl and graphty-element, build reference

- Commit: 57c0ee700e513ae3f9c812c6a28a4ea231971e03 (working tree clean)
- Source: feat-3248-stage-1-reference-run-column-publish
- Render path: default
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 63 (0 void), 2026-11-05T15:20:10.280Z to 2026-11-05T17:19:01.790Z
- Load average when a run began: 9.84-59.1

A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure                       | cosmos.gl                                 | graphty-element 2D lean                   | graphty-element 3D default                |
| ----------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- |
| First frame                   | 0.57 s (0.30-0.69, 3 runs)                | 5.22 s (4.27-6.38, 3 runs)                | 6.05 s (5.47-6.09, 3 runs)                |
| Ready                         | 0.57 s (0.30-0.69, 3 runs)                | 5.22 s (4.27-6.38, 3 runs)                | 6.05 s (5.47-6.09, 3 runs)                |
| Still frame                   | 4.20 / 7.70 / 8.00 ms (4.10-4.30, 3 runs) | 22.9 / 39.4 / 49.4 ms (22.8-35.3, 3 runs) | 31.7 / 38.1 / 46.1 ms (25.4-32.2, 3 runs) |
| Moving frame                  | 4.20 / 4.50 / 4.70 ms (4.20-4.20, 3 runs) | 55.6 / 75.8 / 93.0 ms (48.9-57.8, 3 runs) | 50.1 / 70.4 / 98.1 ms (47.2-53.3, 3 runs) |
| Hover                         | 4.40 ms (4.30-4.70, 3 runs)               | 6.00 ms (5.20-6.10, 3 runs)               | 3.30 ms (3.00-3.80, 3 runs)               |
| JavaScript heap               | 22.0 MB (22.0-23.0, 3 runs)               | 333 MB (332-333, 3 runs)                  | 351 MB (351-351, 3 runs)                  |
| Renderer and GPU processes    | 432 MB (419-435, 3 runs)                  | 771 MB (752-774, 3 runs)                  | 799 MB (798-809, 3 runs)                  |
| Card memory growth            | 88.0 MB (88.0-88.0, 3 runs)               | 81.0 MB (81.0-81.0, 3 runs)               | 81.0 MB (81.0-81.0, 3 runs)               |
| Frame while the layout runs   | 7.20 / 9.20 / 26.1 ms (7.00-7.80, 3 runs) | 267 / 394 / 464 ms (254-286, 3 runs)      | 325 / 448 / 505 ms (324-339, 3 runs)      |
| One layout step plus readback | 6.40 ms (6.10-6.60, 3 runs)               | 107 ms (102-107, 3 runs)                  | 78.7 ms (7.30-99.5, 3 runs)               |
| Layout step in a batch        | 4.47 ms (3.03-4.55, 3 runs)               | 5.35 ms (5.05-5.73, 3 runs)               | 5.77 ms (4.83-5.93, 3 runs)               |

**100,000 nodes, 1,000,000 edges**

| Measure                       | cosmos.gl                                 | graphty-element 2D lean                        | graphty-element 3D default                     |
| ----------------------------- | ----------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| First frame                   | 1.27 s (1.11-1.73, 3 runs)                | 81.3 s (54.0-82.2, 3 runs)                     | 69.8 s (50.0-71.1, 3 runs)                     |
| Ready                         | 1.27 s (1.11-1.73, 3 runs)                | 81.3 s (54.0-82.2, 3 runs)                     | 69.8 s (50.0-71.1, 3 runs)                     |
| Still frame                   | 28.5 / 28.9 / 29.5 ms (28.4-28.5, 3 runs) | 166 / 194 / 231 ms (161-182, 3 runs)           | 160 / 187 / 208 ms (159-162, 3 runs)           |
| Moving frame                  | 28.7 / 29.4 / 31.9 ms (28.7-28.8, 3 runs) | 303 / 410 / 493 ms (279-383, 3 runs)           | 275 / 406 / 449 ms (190-354, 3 runs)           |
| Hover                         | 28.9 ms (28.6-57.0, 3 runs)               | 57.2 ms (27.9-67.8, 3 runs)                    | 50.9 ms (45.8-53.4, 3 runs)                    |
| JavaScript heap               | 161 MB (160-161, 3 runs)                  | 2,848 MB (2,848-2,848, 3 runs)                 | 3,011 MB (3,011-3,011, 3 runs)                 |
| Renderer and GPU processes    | 597 MB (578-599, 3 runs)                  | 3,566 MB (3,488-3,680, 3 runs)                 | 3,782 MB (3,764-3,798, 3 runs)                 |
| Card memory growth            | 366 MB (366-372, 3 runs)                  | 81.0 MB (81.0-81.0, 3 runs)                    | 81.0 MB (81.0-81.0, 3 runs)                    |
| Frame while the layout runs   | 19.4 / 23.0 / 26.6 ms (11.1-20.0, 3 runs) | 2,317 / 3,819 / 3,819 ms (2,180-3,136, 3 runs) | 1,893 / 4,266 / 4,266 ms (1,730-2,471, 3 runs) |
| One layout step plus readback | 10.5 ms (9.90-10.5, 3 runs)               | 833 ms (666-1,127, 3 runs)                     | 849 ms (786-866, 3 runs)                       |
| Layout step in a batch        | 3.89 ms (3.87-3.90, 3 runs)               | 58.2 ms (36.9-58.4, 3 runs)                    | 53.8 ms (46.8-57.8, 3 runs)                    |

**1,000,000 nodes, 1,000,000 edges**

| Measure                       | cosmos.gl                                 |
| ----------------------------- | ----------------------------------------- |
| First frame                   | 1.71 s (1.32-1.82, 3 runs)                |
| Ready                         | 1.71 s (1.32-1.82, 3 runs)                |
| Still frame                   | 29.3 / 29.8 / 31.8 ms (29.3-29.3, 3 runs) |
| Moving frame                  | 29.5 / 30.1 / 32.3 ms (29.5-29.5, 3 runs) |
| Hover                         | 58.6 ms (29.4-58.7, 3 runs)               |
| JavaScript heap               | 270 MB (270-270, 3 runs)                  |
| Renderer and GPU processes    | 782 MB (778-797, 3 runs)                  |
| Card memory growth            | 568 MB (568-568, 3 runs)                  |
| Frame while the layout runs   | 28.1 / 68.7 / 69.8 ms (27.5-34.7, 3 runs) |
| One layout step plus readback | 49.7 ms (45.9-51.9, 3 runs)               |
| Layout step in a batch        | 30.9 ms (30.9-31.8, 3 runs)               |

## Results at device pixel ratio 2

Both libraries draw 2400 x 1800; graphty-element runs with pixel-ratio="device". No layout in these runs.

**10,000 nodes, 100,000 edges, ratio 2**

| Measure                    | cosmos.gl                                 | graphty-element 2D lean                   | graphty-element 3D default                |
| -------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- |
| First frame                | 2.26 s (2.11-2.90, 3 runs)                | 6.26 s (5.64-6.39, 3 runs)                | 5.11 s (5.01-5.56, 3 runs)                |
| Ready                      | 2.26 s (2.11-2.90, 3 runs)                | 6.26 s (5.65-6.39, 3 runs)                | 5.11 s (5.02-5.56, 3 runs)                |
| Still frame                | 7.40 / 7.90 / 8.60 ms (7.10-7.40, 3 runs) | 39.5 / 43.7 / 50.7 ms (30.9-40.2, 3 runs) | 41.7 / 44.9 / 47.6 ms (41.2-41.9, 3 runs) |
| Moving frame               | 7.30 / 7.90 / 10.9 ms (7.20-7.40, 3 runs) | 52.0 / 71.8 / 79.9 ms (52.0-55.7, 3 runs) | 52.0 / 70.8 / 85.2 ms (51.7-54.3, 3 runs) |
| Hover                      | 7.80 ms (7.80-7.80, 3 runs)               | 5.60 ms (5.30-6.10, 3 runs)               | 5.40 ms (4.70-5.60, 3 runs)               |
| JavaScript heap            | 22.0 MB (22.0-22.0, 3 runs)               | 332 MB (332-333, 3 runs)                  | 351 MB (350-351, 3 runs)                  |
| Renderer and GPU processes | 361 MB (274-371, 3 runs)                  | 773 MB (744-775, 3 runs)                  | 799 MB (781-800, 3 runs)                  |
| Card memory growth         | 174 MB (160-174, 3 runs)                  | 211 MB (210-229, 3 runs)                  | 229 MB (172-229, 3 runs)                  |

**100,000 nodes, 1,000,000 edges, ratio 2**

| Measure                    | cosmos.gl                                 | graphty-element 2D lean              | graphty-element 3D default           |
| -------------------------- | ----------------------------------------- | ------------------------------------ | ------------------------------------ |
| First frame                | 1.26 s (1.19-1.71, 3 runs)                | 81.5 s (72.8-84.1, 6 runs)           | 61.2 s (60.8-67.6, 3 runs)           |
| Ready                      | 1.26 s (1.19-1.71, 3 runs)                | 81.5 s (72.8-84.1, 6 runs)           | 61.2 s (60.8-67.6, 3 runs)           |
| Still frame                | 60.3 / 61.1 / 63.8 ms (60.3-60.5, 3 runs) | 260 / 288 / 305 ms (260-260, 1 runs) | 271 / 299 / 371 ms (270-274, 3 runs) |
| Moving frame               | 60.4 / 61.3 / 64.0 ms (60.4-60.4, 3 runs) | 424 / 510 / 553 ms (355-429, 3 runs) | 381 / 507 / 548 ms (353-420, 3 runs) |
| Hover                      | 122 ms (121-122, 3 runs)                  | 53.3 ms (32.1-62.3, 3 runs)          | 47.1 ms (42.4-49.0, 3 runs)          |
| JavaScript heap            | 160 MB (160-160, 3 runs)                  | 2,849 MB (2,848-2,849, 3 runs)       | 3,011 MB (3,011-3,012, 3 runs)       |
| Renderer and GPU processes | 495 MB (443-579, 3 runs)                  | 3,705 MB (3,543-3,721, 3 runs)       | 3,910 MB (3,796-3,961, 3 runs)       |
| Card memory growth         | 424 MB (424-424, 3 runs)                  | 229 MB (229-229, 3 runs)             | 211 MB (211-229, 3 runs)             |

**1,000,000 nodes, 1,000,000 edges, ratio 2**

| Measure                    | cosmos.gl                                 |
| -------------------------- | ----------------------------------------- |
| First frame                | 2.15 s (1.93-2.40, 3 runs)                |
| Ready                      | 2.15 s (1.93-2.40, 3 runs)                |
| Still frame                | 60.9 / 61.5 / 66.2 ms (60.9-60.9, 3 runs) |
| Moving frame               | 60.8 / 61.4 / 64.3 ms (60.8-60.9, 3 runs) |
| Hover                      | 61.4 ms (61.3-61.4, 3 runs)               |
| JavaScript heap            | 270 MB (270-270, 3 runs)                  |
| Renderer and GPU processes | 691 MB (617-787, 3 runs)                  |
| Card memory growth         | 630 MB (630-630, 3 runs)                  |

## Labels

graphty-element 2D lean with `node.label` bound to each node's id, ratio 1, no layout.

**Labels on against labels off, 10,000 nodes**

| Measure                       | labels off                                | labels on                            |
| ----------------------------- | ----------------------------------------- | ------------------------------------ |
| First frame                   | 5.22 s (4.27-6.38, 3 runs)                | 10.4 s (9.64-11.6, 3 runs)           |
| Ready                         | 5.22 s (4.27-6.38, 3 runs)                | 22.5 s (21.8-24.1, 3 runs)           |
| Still frame                   | 22.9 / 39.4 / 49.4 ms (22.8-35.3, 3 runs) | 201 / 260 / 287 ms (184-202, 3 runs) |
| Moving frame                  | 55.6 / 75.8 / 93.0 ms (48.9-57.8, 3 runs) | 281 / 374 / 423 ms (261-288, 3 runs) |
| Hover                         | 6.00 ms (5.20-6.10, 3 runs)               | 18.0 ms (14.6-18.5, 3 runs)          |
| JavaScript heap               | 333 MB (332-333, 3 runs)                  | 601 MB (600-601, 3 runs)             |
| Renderer and GPU processes    | 771 MB (752-774, 3 runs)                  | 2,952 MB (2,871-2,959, 3 runs)       |
| Card memory growth            | 81.0 MB (81.0-81.0, 3 runs)               | 623 MB (623-629, 3 runs)             |
| Frame while the layout runs   | 267 / 394 / 464 ms (254-286, 3 runs)      | -                                    |
| One layout step plus readback | 107 ms (102-107, 3 runs)                  | -                                    |
| Layout step in a batch        | 5.35 ms (5.05-5.73, 3 runs)               | -                                    |

**Labels on, 100,000 nodes**

| Measure                       | labels off                                     | labels on |
| ----------------------------- | ---------------------------------------------- | --------- |
| First frame                   | 81.3 s (54.0-82.2, 3 runs)                     | -         |
| Ready                         | 81.3 s (54.0-82.2, 3 runs)                     | -         |
| Still frame                   | 166 / 194 / 231 ms (161-182, 3 runs)           | -         |
| Moving frame                  | 303 / 410 / 493 ms (279-383, 3 runs)           | -         |
| Hover                         | 57.2 ms (27.9-67.8, 3 runs)                    | -         |
| JavaScript heap               | 2,848 MB (2,848-2,848, 3 runs)                 | -         |
| Renderer and GPU processes    | 3,566 MB (3,488-3,680, 3 runs)                 | -         |
| Card memory growth            | 81.0 MB (81.0-81.0, 3 runs)                    | -         |
| Frame while the layout runs   | 2,317 / 3,819 / 3,819 ms (2,180-3,136, 3 runs) | -         |
| One layout step plus readback | 833 ms (666-1,127, 3 runs)                     | -         |
| Layout step in a batch        | 58.2 ms (36.9-58.4, 3 runs)                    | -         |

## CPU layout (acceleration off)

| Configuration      | Frame while the layout runs                    | One CPU step                |
| ------------------ | ---------------------------------------------- | --------------------------- |
| 2D lean, 10,000    | 228 / 405 / 445 ms (214-256, 3 runs)           | 23.9 ms (23.4-39.5, 3 runs) |
| 3D default, 10,000 | 420 / 529 / 563 ms (373-434, 3 runs)           | 67.9 ms (59.3-79.3, 3 runs) |
| 2D lean, 100,000   | 4,058 / 4,804 / 4,804 ms (2,732-4,371, 3 runs) | 664 ms (643-872, 3 runs)    |

## Every run

| Library | Mode    | Accel | Nodes     | Ratio | Labels | Flags                | Stages reached                                      | Failure                                                                                    | Runs | Load when each began |
| ------- | ------- | ----- | --------- | ----- | ------ | -------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---- | -------------------- |
| graphty | lean    | on    | 100,000   | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | 3    | 17.3, 45.7, 32.7     |
| cosmos  | default | on    | 10,000    | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | 3    | 35.2, 32.1, 30.0     |
| cosmos  | default | on    | 100,000   | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | 3    | 28.2, 23.9, 21.7     |
| cosmos  | default | on    | 1,000,000 | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | 3    | 25.5, 23.3, 21.5     |
| cosmos  | default | on    | 10,000    | 2     | off    | skip-layout          | load still orbit memory hover                       |                                                                                            | 3    | 21.8, 25.5, 24.1     |
| cosmos  | default | on    | 100,000   | 2     | off    | skip-layout          | load still orbit memory hover                       |                                                                                            | 3    | 22.9, 21.9, 25.8     |
| cosmos  | default | on    | 1,000,000 | 2     | off    | skip-layout          | load still orbit memory hover                       |                                                                                            | 3    | 28.7, 26.0, 24.0     |
| graphty | lean    | on    | 10,000    | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | 3    | 20.9, 32.6, 51.9     |
| graphty | default | on    | 10,000    | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | 3    | 58.2, 59.1, 51.5     |
| graphty | lean    | on    | 10,000    | 2     | off    | skip-layout          | load still orbit memory hover                       |                                                                                            | 3    | 49.6, 47.8, 51.8     |
| graphty | default | on    | 10,000    | 2     | off    | skip-layout          | load still orbit memory hover                       |                                                                                            | 3    | 44.3, 39.6, 39.0     |
| graphty | lean    | on    | 10,000    | 1     | on     | skip-layout labels   | load still orbit memory hover                       |                                                                                            | 3    | 36.5, 37.5, 39.5     |
| graphty | lean    | off   | 10,000    | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | 3    | 35.3, 28.7, 25.4     |
| graphty | default | off   | 10,000    | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | 3    | 23.3, 39.5, 40.0     |
| graphty | lean    | on    | 1,000,000 | 1     | off    | skip-layout          |                                                     | load failed: Loading 1,000,000 more nodes would take the graph to 1,000,000, past the 100, | 3    | 43.7, 46.6, 46.6     |
| graphty | default | on    | 100,000   | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | 3    | 32.1, 31.4, 34.6     |
| graphty | lean    | on    | 100,000   | 2     | off    | skip-layout          | load                                                | did not finish in 190 s                                                                    | 2    | 27.2, 40.7           |
| graphty | lean    | on    | 100,000   | 2     | off    | skip-layout          | load still                                          | did not finish in 190 s                                                                    | 1    | 33.6                 |
| graphty | lean    | on    | 100,000   | 2     | off    | skip-layout no-still | load orbit memory hover                             |                                                                                            | 3    | 23.9, 30.4, 33.3     |
| graphty | default | on    | 100,000   | 2     | off    | skip-layout          | load still orbit memory hover                       |                                                                                            | 3    | 34.7, 29.1, 31.9     |
| graphty | lean    | off   | 100,000   | 1     | off    | no-still no-move     | load memory hover layoutFps layoutSteps             |                                                                                            | 3    | 27.8, 32.1, 27.1     |
| graphty | lean    | on    | 100,000   | 1     | on     | skip-layout labels   |                                                     | page.evaluate: Target page, context or browser has been closed                             | 3    | 9.84, 10.9, 23.9     |

## Against section 8.3

The new median over the 8.3 figure: above 1.00 is more than before. For a range in 8.3 the middle is used; graphty-element's hover is compared with its "on golden" row. Every 8.3 graphty-element figure except hover comes from the 2026-10-17 build.

**10,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | 0.20 -> 0.57 s (2.78)         | 1.36 -> 5.22 s (3.84)       | 3.08 -> 6.05 s (1.96)          |
| Ready                         | 0.20 -> 0.57 s (2.78)         | 3.30 -> 5.22 s (1.58)       | 6.76 -> 6.05 s (0.89)          |
| Still frame                   | 3.95 -> 4.20 ms (1.06)        | 33.4 -> 22.9 ms (0.69)      | 30.0 -> 31.7 ms (1.06)         |
| Moving frame                  | 3.85 -> 4.20 ms (1.09)        | 40.6 -> 55.6 ms (1.37)      | 47.8 -> 50.1 ms (1.05)         |
| Hover                         | 7.40 -> 4.40 ms (0.59)        | 12.7 -> 6.00 ms (0.47)      | 12.7 -> 3.30 ms (0.26)         |
| JavaScript heap               | 22.0 -> 22.0 MB (1.00)        | 345 -> 333 MB (0.97)        | 289 -> 351 MB (1.21)           |
| Renderer and GPU processes    | 430 -> 432 MB (1.00)          | 791 -> 771 MB (0.97)        | 733 -> 799 MB (1.09)           |
| Frame while the layout runs   | 7.05 -> 7.20 ms (1.02)        | 118 -> 267 ms (2.27)        | 215 -> 325 ms (1.51)           |
| One layout step plus readback | 7.25 -> 6.40 ms (0.88)        | 27.3 -> 107 ms (3.92)       | 2.90 -> 78.7 ms (27.14)        |
| Layout step in a batch        | 4.80 -> 4.47 ms (0.93)        | 2.70 -> 5.35 ms (1.98)      | 2.30 -> 5.77 ms (2.51)         |

**100,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | 0.69 -> 1.27 s (1.83)         | 28.3 -> 81.3 s (2.87)       | 30.3 -> 69.8 s (2.30)          |
| Ready                         | 0.69 -> 1.27 s (1.83)         | 52.7 -> 81.3 s (1.54)       | 49.8 -> 69.8 s (1.40)          |
| Still frame                   | 28.4 -> 28.5 ms (1.00)        | 86.1 -> 166 ms (1.92)       | 111 -> 160 ms (1.45)           |
| Moving frame                  | 28.7 -> 28.7 ms (1.00)        | 126 -> 303 ms (2.40)        | 211 -> 275 ms (1.30)           |
| Hover                         | 16.7 -> 28.9 ms (1.73)        | 103 -> 57.2 ms (0.56)       | 103 -> 50.9 ms (0.49)          |
| JavaScript heap               | 160 -> 161 MB (1.01)          | 3,045 -> 2,848 MB (0.94)    | 2,466 -> 3,011 MB (1.22)       |
| Renderer and GPU processes    | 616 -> 597 MB (0.97)          | 3,762 -> 3,566 MB (0.95)    | 3,215 -> 3,782 MB (1.18)       |
| Frame while the layout runs   | 19.0 -> 19.4 ms (1.02)        | 1,575 -> 2,317 ms (1.47)    | 2,276 -> 1,893 ms (0.83)       |
| One layout step plus readback | 9.10 -> 10.5 ms (1.15)        | 394 -> 833 ms (2.11)        | 489 -> 849 ms (1.74)           |
| Layout step in a batch        | 3.85 -> 3.89 ms (1.01)        | 23.4 -> 58.2 ms (2.49)      | 30.5 -> 53.8 ms (1.76)         |

**1,000,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- |
| First frame                   | 1.74 -> 1.71 s (0.98)         |
| Ready                         | 1.74 -> 1.71 s (0.98)         |
| Still frame                   | 29.2 -> 29.3 ms (1.00)        |
| Moving frame                  | 29.4 -> 29.5 ms (1.00)        |
| Hover                         | 23.4 -> 58.6 ms (2.51)        |
| JavaScript heap               | 270 -> 270 MB (1.00)          |
| Renderer and GPU processes    | 800 -> 782 MB (0.98)          |
| Frame while the layout runs   | 32.7 -> 28.1 ms (0.86)        |
| One layout step plus readback | 43.9 -> 49.7 ms (1.13)        |
| Layout step in a batch        | 30.9 -> 30.9 ms (1.00)        |

## Notes

This is the run every Proof of the row renderer compares against: graphty-element at origin/master 67c09c4596 plus the harness changes
only, before any change to the layout publish.

- **The card was not unloaded.** The design asks for p99 on an unloaded card; this machine is shared and the load average was 9.8-59 when runs
  began (the last column of the table above), against 3.7-23 for `baseline`. CPU-bound figures carry that: the 100,000-node step with readback
  is 833 ms here against 548 ms in `baseline`, on the same element code path. Compare a later run with this one at a similar load.
- **The first frame at 100,000 nodes is 81 s in 2D lean and 70 s in 3D default**, down from 436 s in `baseline`, the load fix's work.
- **2D lean at 100,000 nodes and ratio 2**: the three full runs ended at their 190 s guard, so three `-tail` runs supply the moving frame and hover.
- **Labels at 100,000 nodes still crash the browser**, three runs of three, as in `baseline`.
- **graphty-element still refuses 1,000,000 nodes**: three of three runs, at load.
- One `default-s` run was cut off by its own operator, not by the page, and its row was removed before the three kept here were run.
