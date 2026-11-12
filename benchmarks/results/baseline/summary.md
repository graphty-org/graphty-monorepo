# cosmos.gl and graphty-element, build baseline

- Commit: 7a09c31e599418f4bc8e21caaf24cf0c82551437 (working tree clean)
- Source: cosmos-bench-baseline
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 65 (0 void), 2026-11-04T15:52:00.275Z to 2026-11-04T19:11:27.360Z
- Load average when a run began: 3.74-23.0

A cell is the median across runs of each run's median, then the median of each run's 95th percentile after the slash where the row has one, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure                       | cosmos.gl                          | graphty-element 2D lean            | graphty-element 3D default         |
| ----------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------------- |
| First frame                   | 0.15 s (0.15-0.17, 3 runs)         | 4.34 s (4.00-5.08, 3 runs)         | 4.08 s (3.35-4.99, 3 runs)         |
| Ready                         | 0.15 s (0.15-0.17, 3 runs)         | 4.34 s (4.00-5.08, 3 runs)         | 4.08 s (3.35-4.99, 3 runs)         |
| Still frame                   | 3.50 / 6.40 ms (3.50-3.50, 3 runs) | 32.1 / 36.2 ms (31.4-36.5, 3 runs) | 34.6 / 38.8 ms (30.9-35.0, 3 runs) |
| Moving frame                  | 3.50 / 4.00 ms (3.50-3.50, 3 runs) | 39.8 / 53.8 ms (37.6-45.4, 3 runs) | 42.8 / 60.7 ms (41.3-47.1, 3 runs) |
| Hover                         | 3.60 ms (3.60-3.70, 3 runs)        | 2.90 ms (2.70-5.50, 3 runs)        | 2.90 ms (2.70-4.30, 3 runs)        |
| JavaScript heap               | 23.0 MB (23.0-23.0, 3 runs)        | 352 MB (352-352, 3 runs)           | 351 MB (351-351, 3 runs)           |
| Renderer and GPU processes    | 434 MB (430-435, 3 runs)           | 791 MB (787-795, 3 runs)           | 791 MB (768-809, 3 runs)           |
| Card memory growth            | 88.0 MB (88.0-88.0, 3 runs)        | 81.0 MB (81.0-81.0, 3 runs)        | 81.0 MB (75.0-81.0, 3 runs)        |
| Frame while the layout runs   | 3.70 / 5.30 ms (3.60-4.20, 3 runs) | 142 / 188 ms (136-149, 3 runs)     | 203 / 352 ms (181-231, 3 runs)     |
| One layout step plus readback | 3.10 ms (3.00-3.60, 3 runs)        | 5.50 ms (4.80-6.70, 3 runs)        | 7.50 ms (5.70-54.8, 3 runs)        |
| Layout step in a batch        | 1.74 ms (1.66-1.85, 3 runs)        | 3.30 ms (2.78-3.70, 3 runs)        | 3.82 ms (3.07-3.88, 3 runs)        |

**100,000 nodes, 1,000,000 edges**

| Measure                       | cosmos.gl                          | graphty-element 2D lean                | graphty-element 3D default             |
| ----------------------------- | ---------------------------------- | -------------------------------------- | -------------------------------------- |
| First frame                   | 0.57 s (0.54-0.58, 3 runs)         | 436 s (344-469, 6 runs)                | 190 s (168-235, 3 runs)                |
| Ready                         | 0.57 s (0.54-0.58, 3 runs)         | 436 s (344-469, 6 runs)                | 190 s (168-235, 3 runs)                |
| Still frame                   | 28.3 / 28.7 ms (28.2-28.3, 3 runs) | 151 / 190 ms (139-163, 3 runs)         | 136 / 175 ms (135-139, 3 runs)         |
| Moving frame                  | 28.5 / 29.2 ms (28.5-28.6, 3 runs) | 224 / 292 ms (213-239, 4 runs)         | 176 / 315 ms (160-180, 3 runs)         |
| Hover                         | 28.4 ms (28.4-56.1, 3 runs)        | 32.0 ms (29.1-37.5, 4 runs)            | 20.7 ms (19.1-21.8, 3 runs)            |
| JavaScript heap               | 161 MB (161-161, 3 runs)           | 3,039 MB (3,039-3,041, 4 runs)         | 3,013 MB (3,010-3,013, 3 runs)         |
| Renderer and GPU processes    | 611 MB (608-628, 3 runs)           | 3,818 MB (3,815-3,852, 4 runs)         | 3,864 MB (3,804-3,874, 3 runs)         |
| Card memory growth            | 366 MB (366-366, 3 runs)           | 81.0 MB (75.0-81.0, 4 runs)            | 75.0 MB (75.0-81.0, 3 runs)            |
| Frame while the layout runs   | 12.3 / 21.2 ms (10.2-12.5, 3 runs) | 1,632 / 2,987 ms (1,607-1,968, 3 runs) | 1,892 / 3,174 ms (1,670-1,947, 3 runs) |
| One layout step plus readback | 7.20 ms (6.70-8.00, 3 runs)        | 548 ms (534-724, 3 runs)               | 443 ms (442-655, 3 runs)               |
| Layout step in a batch        | 3.77 ms (3.75-3.77, 3 runs)        | 33.0 ms (32.0-48.1, 3 runs)            | 30.1 ms (27.3-44.3, 3 runs)            |

**1,000,000 nodes, 1,000,000 edges**

| Measure                       | cosmos.gl                          |
| ----------------------------- | ---------------------------------- |
| First frame                   | 1.02 s (0.97-1.25, 3 runs)         |
| Ready                         | 1.02 s (0.97-1.25, 3 runs)         |
| Still frame                   | 29.1 / 29.6 ms (29.0-29.1, 3 runs) |
| Moving frame                  | 29.3 / 30.0 ms (29.2-29.4, 3 runs) |
| Hover                         | 29.1 ms (29.1-29.1, 3 runs)        |
| JavaScript heap               | 270 MB (270-270, 3 runs)           |
| Renderer and GPU processes    | 796 MB (792-811, 3 runs)           |
| Card memory growth            | 568 MB (568-568, 3 runs)           |
| Frame while the layout runs   | 64.3 / 67.9 ms (30.8-64.4, 3 runs) |
| One layout step plus readback | 44.2 ms (37.8-61.9, 3 runs)        |
| Layout step in a batch        | 30.9 ms (30.8-30.9, 3 runs)        |

## Results at device pixel ratio 2

Both libraries draw 2400 x 1800; graphty-element runs with pixel-ratio="device". No layout in these runs.

**10,000 nodes, 100,000 edges, ratio 2**

| Measure                    | cosmos.gl                          | graphty-element 2D lean            | graphty-element 3D default         |
| -------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------------- |
| First frame                | 0.20 s (0.16-0.21, 3 runs)         | 6.28 s (5.65-6.74, 3 runs)         | 3.21 s (3.20-3.62, 3 runs)         |
| Ready                      | 0.20 s (0.16-0.21, 3 runs)         | 6.28 s (5.65-6.75, 3 runs)         | 3.21 s (3.20-3.62, 3 runs)         |
| Still frame                | 6.90 / 8.00 ms (6.70-6.90, 3 runs) | 39.6 / 43.8 ms (38.3-40.5, 3 runs) | 40.1 / 43.8 ms (39.9-40.2, 3 runs) |
| Moving frame               | 6.80 / 7.50 ms (6.70-6.90, 3 runs) | 44.0 / 64.6 ms (43.4-47.2, 3 runs) | 40.7 / 55.2 ms (40.5-41.7, 3 runs) |
| Hover                      | 7.00 ms (6.90-7.20, 3 runs)        | 5.40 ms (3.00-5.70, 3 runs)        | 3.40 ms (3.10-3.70, 3 runs)        |
| JavaScript heap            | 23.0 MB (23.0-23.0, 3 runs)        | 352 MB (351-352, 3 runs)           | 351 MB (351-351, 3 runs)           |
| Renderer and GPU processes | 424 MB (423-426, 3 runs)           | 792 MB (782-798, 3 runs)           | 808 MB (807-812, 3 runs)           |
| Card memory growth         | 174 MB (174-174, 3 runs)           | 235 MB (229-241, 3 runs)           | 229 MB (229-229, 3 runs)           |

**100,000 nodes, 1,000,000 edges, ratio 2**

| Measure                    | cosmos.gl                          | graphty-element 2D lean        | graphty-element 3D default     |
| -------------------------- | ---------------------------------- | ------------------------------ | ------------------------------ |
| First frame                | 0.65 s (0.64-0.74, 3 runs)         | 368 s (327-447, 5 runs)        | 180 s (178-185, 3 runs)        |
| Ready                      | 0.65 s (0.64-0.74, 3 runs)         | 368 s (327-447, 5 runs)        | 180 s (178-185, 3 runs)        |
| Still frame                | 60.0 / 60.4 ms (60.0-60.1, 3 runs) | 239 / 273 ms (227-242, 3 runs) | 238 / 276 ms (222-242, 3 runs) |
| Moving frame               | 60.1 / 60.5 ms (60.0-60.1, 3 runs) | 295 / 317 ms (290-303, 3 runs) | 259 / 325 ms (252-292, 3 runs) |
| Hover                      | 60.5 ms (60.3-121, 3 runs)         | 36.6 ms (30.8-46.8, 3 runs)    | 26.1 ms (20.2-29.3, 3 runs)    |
| JavaScript heap            | 160 MB (160-160, 3 runs)           | 3,039 MB (3,039-3,041, 3 runs) | 3,010 MB (3,010-3,013, 3 runs) |
| Renderer and GPU processes | 597 MB (587-602, 3 runs)           | 3,868 MB (3,727-3,899, 3 runs) | 3,745 MB (3,717-3,836, 3 runs) |
| Card memory growth         | 420 MB (420-424, 3 runs)           | 229 MB (211-229, 3 runs)       | 211 MB (211-229, 3 runs)       |

**1,000,000 nodes, 1,000,000 edges, ratio 2**

| Measure                    | cosmos.gl                          |
| -------------------------- | ---------------------------------- |
| First frame                | 1.07 s (0.97-1.12, 3 runs)         |
| Ready                      | 1.07 s (0.97-1.12, 3 runs)         |
| Still frame                | 60.6 / 61.0 ms (60.6-60.7, 3 runs) |
| Moving frame               | 60.7 / 61.2 ms (60.6-60.7, 3 runs) |
| Hover                      | 122 ms (61.0-122, 3 runs)          |
| JavaScript heap            | 270 MB (270-270, 3 runs)           |
| Renderer and GPU processes | 791 MB (784-791, 3 runs)           |
| Card memory growth         | 630 MB (630-630, 3 runs)           |

## Labels

graphty-element 2D lean with `node.label` bound to each node's id, ratio 1, no layout.

**Labels on against labels off, 10,000 nodes**

| Measure                       | labels off                         | labels on                      |
| ----------------------------- | ---------------------------------- | ------------------------------ |
| First frame                   | 4.34 s (4.00-5.08, 3 runs)         | 8.73 s (8.35-9.47, 3 runs)     |
| Ready                         | 4.34 s (4.00-5.08, 3 runs)         | 16.2 s (15.4-17.7, 3 runs)     |
| Still frame                   | 32.1 / 36.2 ms (31.4-36.5, 3 runs) | 131 / 144 ms (125-132, 3 runs) |
| Moving frame                  | 39.8 / 53.8 ms (37.6-45.4, 3 runs) | 165 / 192 ms (160-165, 3 runs) |
| Hover                         | 2.90 ms (2.70-5.50, 3 runs)        | 9.70 ms (9.30-9.80, 3 runs)    |
| JavaScript heap               | 352 MB (352-352, 3 runs)           | 620 MB (619-620, 3 runs)       |
| Renderer and GPU processes    | 791 MB (787-795, 3 runs)           | 3,033 MB (3,005-3,033, 3 runs) |
| Card memory growth            | 81.0 MB (81.0-81.0, 3 runs)        | 629 MB (623-629, 3 runs)       |
| Frame while the layout runs   | 142 / 188 ms (136-149, 3 runs)     | -                              |
| One layout step plus readback | 5.50 ms (4.80-6.70, 3 runs)        | -                              |
| Layout step in a batch        | 3.30 ms (2.78-3.70, 3 runs)        | -                              |

**Labels on, 100,000 nodes**

| Measure                       | labels off                             | labels on |
| ----------------------------- | -------------------------------------- | --------- |
| First frame                   | 436 s (344-469, 6 runs)                | -         |
| Ready                         | 436 s (344-469, 6 runs)                | -         |
| Still frame                   | 151 / 190 ms (139-163, 3 runs)         | -         |
| Moving frame                  | 224 / 292 ms (213-239, 4 runs)         | -         |
| Hover                         | 32.0 ms (29.1-37.5, 4 runs)            | -         |
| JavaScript heap               | 3,039 MB (3,039-3,041, 4 runs)         | -         |
| Renderer and GPU processes    | 3,818 MB (3,815-3,852, 4 runs)         | -         |
| Card memory growth            | 81.0 MB (75.0-81.0, 4 runs)            | -         |
| Frame while the layout runs   | 1,632 / 2,987 ms (1,607-1,968, 3 runs) | -         |
| One layout step plus readback | 548 ms (534-724, 3 runs)               | -         |
| Layout step in a batch        | 33.0 ms (32.0-48.1, 3 runs)            | -         |

## CPU layout (acceleration off)

| Configuration      | Frame while the layout runs            | One CPU step                |
| ------------------ | -------------------------------------- | --------------------------- |
| 2D lean, 10,000    | 208 / 334 ms (199-218, 3 runs)         | 23.3 ms (21.1-40.3, 3 runs) |
| 3D default, 10,000 | 235 / 383 ms (197-262, 3 runs)         | 40.8 ms (40.2-76.7, 3 runs) |
| 2D lean, 100,000   | 3,312 / 3,771 ms (2,985-4,583, 3 runs) | 763 ms (680-850, 3 runs)    |

## Every run

| Library | Mode    | Accel | Nodes     | Ratio | Labels | Flags                | Stages reached                                      | Failure                                                                                    |
| ------- | ------- | ----- | --------- | ----- | ------ | -------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| cosmos  | default | on    | 10,000    | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | x3  |
| cosmos  | default | on    | 100,000   | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | x3  |
| cosmos  | default | on    | 1,000,000 | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | x3  |
| cosmos  | default | on    | 10,000    | 2     | off    |                      | load still orbit memory hover                       |                                                                                            | x3  |
| cosmos  | default | on    | 100,000   | 2     | off    |                      | load still orbit memory hover                       |                                                                                            | x3  |
| cosmos  | default | on    | 1,000,000 | 2     | off    |                      | load still orbit memory hover                       |                                                                                            | x3  |
| graphty | lean    | on    | 10,000    | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | x3  |
| graphty | default | on    | 10,000    | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | x3  |
| graphty | lean    | on    | 100,000   | 1     | off    |                      | load still                                          | did not finish in 10 minutes                                                               | x2  |
| graphty | lean    | on    | 10,000    | 2     | off    | skip-layout          | load still orbit memory hover                       |                                                                                            | x3  |
| graphty | default | on    | 10,000    | 2     | off    | skip-layout          | load still orbit memory hover                       |                                                                                            | x3  |
| graphty | lean    | on    | 10,000    | 1     | on     | skip-layout labels   | load still orbit memory hover                       |                                                                                            | x3  |
| graphty | lean    | off   | 10,000    | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | x3  |
| graphty | lean    | on    | 1,000,000 | 1     | off    | skip-layout          |                                                     | load failed: Loading 1,000,000 more nodes would take the graph to 1,000,000, past the 100, | x3  |
| graphty | default | off   | 10,000    | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | x3  |
| graphty | default | on    | 100,000   | 1     | off    |                      | load still orbit memory hover layoutFps layoutSteps |                                                                                            | x3  |
| graphty | lean    | on    | 100,000   | 1     | off    | no-still             | load orbit memory hover layoutFps layoutSteps       |                                                                                            | x3  |
| graphty | lean    | on    | 100,000   | 1     | off    |                      | load still orbit memory hover                       | did not finish in 10 minutes                                                               |
| graphty | default | on    | 100,000   | 2     | off    | skip-layout          | load still orbit memory hover                       |                                                                                            | x3  |
| graphty | lean    | on    | 100,000   | 2     | off    | skip-layout          | load still orbit memory hover                       |                                                                                            |
| graphty | lean    | on    | 100,000   | 2     | off    | skip-layout          | load still                                          | did not finish in 10 minutes                                                               | x2  |
| graphty | lean    | on    | 100,000   | 2     | off    | skip-layout no-still | load orbit memory hover                             |                                                                                            | x2  |
| graphty | lean    | on    | 100,000   | 1     | on     | skip-layout labels   |                                                     | page.evaluate: Target page, context or browser has been closed                             | x3  |
| graphty | lean    | off   | 100,000   | 1     | off    | no-still no-move     | load memory hover layoutFps layoutSteps             |                                                                                            | x3  |

## Against section 8.3

The new median over the 8.3 figure: above 1.00 is more than before. For a range in 8.3 the middle is used; graphty-element's hover is compared with its "on golden" row. Every 8.3 graphty-element figure except hover comes from the 2026-10-17 build.

**10,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | 0.20 -> 0.15 s (0.75)         | 1.36 -> 4.34 s (3.19)       | 3.08 -> 4.08 s (1.33)          |
| Ready                         | 0.20 -> 0.15 s (0.75)         | 3.30 -> 4.34 s (1.31)       | 6.76 -> 4.08 s (0.60)          |
| Still frame                   | 3.95 -> 3.50 ms (0.89)        | 33.4 -> 32.1 ms (0.96)      | 30.0 -> 34.6 ms (1.15)         |
| Moving frame                  | 3.85 -> 3.50 ms (0.91)        | 40.6 -> 39.8 ms (0.98)      | 47.8 -> 42.8 ms (0.90)         |
| Hover                         | 7.40 -> 3.60 ms (0.49)        | 12.7 -> 2.90 ms (0.23)      | 12.7 -> 2.90 ms (0.23)         |
| JavaScript heap               | 22.0 -> 23.0 MB (1.05)        | 345 -> 352 MB (1.02)        | 289 -> 351 MB (1.21)           |
| Renderer and GPU processes    | 430 -> 434 MB (1.01)          | 791 -> 791 MB (1.00)        | 733 -> 791 MB (1.08)           |
| Frame while the layout runs   | 7.05 -> 3.70 ms (0.52)        | 118 -> 142 ms (1.21)        | 215 -> 203 ms (0.94)           |
| One layout step plus readback | 7.25 -> 3.10 ms (0.43)        | 27.3 -> 5.50 ms (0.20)      | 2.90 -> 7.50 ms (2.59)         |
| Layout step in a batch        | 4.80 -> 1.74 ms (0.36)        | 2.70 -> 3.30 ms (1.22)      | 2.30 -> 3.82 ms (1.66)         |

**100,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) | 2D lean: 8.3 -> now (ratio) | 3D default: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| First frame                   | 0.69 -> 0.57 s (0.83)         | 28.3 -> 436 s (15.41)       | 30.3 -> 190 s (6.28)           |
| Ready                         | 0.69 -> 0.57 s (0.83)         | 52.7 -> 436 s (8.28)        | 49.8 -> 190 s (3.82)           |
| Still frame                   | 28.4 -> 28.3 ms (0.99)        | 86.1 -> 151 ms (1.76)       | 111 -> 136 ms (1.22)           |
| Moving frame                  | 28.7 -> 28.5 ms (0.99)        | 126 -> 224 ms (1.78)        | 211 -> 176 ms (0.83)           |
| Hover                         | 16.7 -> 28.4 ms (1.70)        | 103 -> 32.0 ms (0.31)       | 103 -> 20.7 ms (0.20)          |
| JavaScript heap               | 160 -> 161 MB (1.01)          | 3,045 -> 3,039 MB (1.00)    | 2,466 -> 3,013 MB (1.22)       |
| Renderer and GPU processes    | 616 -> 611 MB (0.99)          | 3,762 -> 3,818 MB (1.01)    | 3,215 -> 3,864 MB (1.20)       |
| Frame while the layout runs   | 19.0 -> 12.3 ms (0.65)        | 1,575 -> 1,632 ms (1.04)    | 2,276 -> 1,892 ms (0.83)       |
| One layout step plus readback | 9.10 -> 7.20 ms (0.79)        | 394 -> 548 ms (1.39)        | 489 -> 443 ms (0.90)           |
| Layout step in a batch        | 3.85 -> 3.77 ms (0.98)        | 23.4 -> 33.0 ms (1.41)      | 30.5 -> 30.1 ms (0.99)         |

**1,000,000 nodes**

| Measure                       | cosmos.gl: 8.3 -> now (ratio) |
| ----------------------------- | ----------------------------- |
| First frame                   | 1.74 -> 1.02 s (0.59)         |
| Ready                         | 1.74 -> 1.02 s (0.59)         |
| Still frame                   | 29.2 -> 29.1 ms (1.00)        |
| Moving frame                  | 29.4 -> 29.3 ms (1.00)        |
| Hover                         | 23.4 -> 29.1 ms (1.25)        |
| JavaScript heap               | 270 -> 270 MB (1.00)          |
| Renderer and GPU processes    | 800 -> 796 MB (0.99)          |
| Frame while the layout runs   | 32.7 -> 64.3 ms (1.97)        |
| One layout step plus readback | 43.9 -> 44.2 ms (1.01)        |
| Layout step in a batch        | 30.9 -> 30.9 ms (1.00)        |

## Notes

Facts:

- **Load at 100,000 nodes is the one large change.** The first complete frame takes 344-469 s in 2D lean and 168-235 s in 3D default, against 28-30 s in section 8.3, and it is one synchronous frame: a frame-by-frame trace of a 2D lean load shows three frames in all, one before the data, one of 410 s, one of 0.2 s. "First frame" and "Ready" are now the same moment because of that. The page is unresponsive for the whole of it.
- **Where that frame goes.** A CPU profile of the first 120 s of a 2D lean load: 19 s applying the data, then 89 s in `UpdateManager.runUpdatePass`, of which 70 s is `updateEdges` (63 s in `Edge.update`, 39 s of it in `equalsWithEpsilon`) and 18 s is `drawArrivedPaint`. The rest of the frame was not profiled. All 100,000 nodes and 1,000,000 edges were in the graph by the end of those 120 s, so the data path is not the slow part.
- **2D lean loads about 2.3 times slower than 3D default at 100,000 nodes**, and at 10,000 nodes the two are the same. Why was not measured; the two style layers 2D lean adds are the obvious difference.
- **2D lean at 100,000 nodes did not finish in 10 minutes**, in all three full runs. Their load and still frames count. The `-tail` runs (same load, no still-frame stage) supply its moving frame, hover and layout.
- **2D lean at 100,000 nodes and ratio 2**: one of three full runs finished; two `-tail` runs bring moving frame and hover to three samples.
- **Labels at 100,000 nodes crash the browser**, three runs of three, about three minutes in, during the load. The GPU process crashes, WebGL reports `GL_CONTEXT_LOST_KHR`, and headless Chromium segfaults restarting the GPU process. The last 5-second memory sample before the crash read about 5.7 GB of the card's 12 GB and 9.8 GB in the renderer process, so the card was not visibly full; the cause of the GPU process crash is not known. No labels-on number exists at this size.
- **Labels at 10,000 nodes** cost 4 times the still frame (131 against 32 ms), 3.7 times the ready time, 3.8 times the process memory (3,033 against 791 MB) and 7.8 times the card memory (629 against 81 MB). At the whole-graph zoom the labels are illegible specks: this is the cost of having them, with none of them readable.
- **cosmos.gl core draws no labels.** It has no text drawing at all; it offers `getSampledPoints()` and `getSampledPointPositionsMap()` for an application to build its own overlay. So labels are measured on graphty-element only.
- **Ratio 2 is now a fair comparison**: both canvases measured 2400 x 1800 CSS 1200 x 900. At 100,000 nodes a still frame is 60 ms for cosmos.gl and 238-239 ms for graphty-element, a gap of 4 times, as against 5 times at ratio 1.
- **graphty-element still refuses 1,000,000 nodes**: three of three runs, at load, with its 100,000-node ceiling.
- **Hover is no longer a problem at either size**: 2.9 ms at 10,000 nodes and 21-32 ms at 100,000, level with or ahead of cosmos.gl, with 10 samples per run in three or more runs.
- **Test page change that moves cosmos.gl's numbers.** Hover now runs before the layout for both libraries, because a run of the layout moved cosmos.gl's points off screen, which was the 10,000-node defect. Its hover latency is about one frame, so on the undisturbed scene it is 28 ms at 100,000 nodes and 29 ms at 1,000,000, rather than section 8.3's 17 ms and 23 ms measured after the layout had scattered the points. It is not a slowdown of cosmos.gl.
- **cosmos.gl's layout numbers at 10,000 nodes halved** (frame 7.0 to 3.7 ms, batched step 4.8 to 1.7 ms) on the same library version, and its frame at 1,000,000 nodes is bimodal (31 ms once, 64 ms twice). The cause is not established: the hover move is the only page change in that path. Compare layout figures only within this rerun series, not with section 8.3.
- **The machine was shared.** The load average was 3.7-23 when runs began, from other sessions. CPU-bound figures carry that noise: the 10,000-node ready time ranges 3.4-5.1 s and one CPU step 40-77 ms. The GPU-bound cosmos.gl frame figures hardly moved.
- **Card memory** is the growth of the whole card, a rough figure as in section 8.5.

Harness facts a later reader needs:

- `waitForStableFrame()` now rejects at 30 s, so the page passes its deprecated `timeoutMs`; without that every 100,000-node run fails.
- The page is built with `assetsInlineLimit: 0`. A default Vite build of any consumer of `dist/graphty.js` throws on import: the dist has lost `?no-inline` on the shader thumbnails, so Vite inlines the 3.7 KB files as data URLs past the 4,096-character limit of `descriptor.thumbnail` ("The shader disco-ball was refused at descriptor.thumbnail").
