# cosmos.gl and graphty-element, build finish-1910

- Commit: 4fea332375097f7140f008234902681efcc72d59 (working tree clean)
- Source: bench-1910-cosmos-quality
- Render path: batched, objects
- WebGL renderer: ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA) | ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)
- Browser: HeadlessChrome/143.0.7499.4
- Rows: 30 (0 void), 2026-11-25T01:40:56.944Z to 2026-11-25T04:17:44.656Z
- Load average when a run began: 7.86-61.3

A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.

## Results at device pixel ratio 1

**10,000 nodes, 100,000 edges**

| Measure | cosmos.gl | graphty-element 2D lean | graphty-element 3D default |
| ------- | --------- | ----------------------- | -------------------------- |

**100,000 nodes, 1,000,000 edges**

| Measure | cosmos.gl | graphty-element 2D lean | graphty-element 3D default |
| ------- | --------- | ----------------------- | -------------------------- |

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

| Measure | labels off | labels on |
| ------- | ---------- | --------- |

## CPU layout (acceleration off)

| Configuration      | Frame while the layout runs | One CPU step |
| ------------------ | --------------------------- | ------------ |
| 2D lean, 10,000    | -                           | -            |
| 3D default, 10,000 | -                           | -            |
| 2D lean, 100,000   | -                           | -            |

## Every run

| Library | Mode    | Accel | Nodes     | Ratio | Labels | Flags   | Stages reached | Failure                                                                                    | Runs | Load when each began                           |
| ------- | ------- | ----- | --------- | ----- | ------ | ------- | -------------- | ------------------------------------------------------------------------------------------ | ---- | ---------------------------------------------- |
| cosmos  | default | on    | 10,000    | 1     | off    | quality | load           |                                                                                            | 4    | 61.3, 42.4, 11.3, 15.9                         |
| graphty | lean    | on    | 10,000    | 1     | off    | quality | load           |                                                                                            | 4    | 46.9, 40.7, 22.5, 14.0                         |
| cosmos  | default | on    | 100,000   | 1     | off    | quality | load           |                                                                                            | 8    | 46.7, 40.7, 22.6, 12.4, 16.5, 16.5, 25.5, 23.8 |
| graphty | lean    | on    | 100,000   | 1     | off    | quality |                | load failed: Loading 1,000,199 more edges would take the graph to 1,000,199, past the 1,00 | 4    | 36.0, 33.6, 19.4, 14.9                         |
| cosmos  | default | on    | 1,000,000 | 1     | off    | quality | load           |                                                                                            | 2    | 22.8, 28.4                                     |
| graphty | lean    | on    | 1,000,000 | 1     | off    | quality | load           |                                                                                            | 3    | 42.1, 19.6, 33.1                               |
| graphty | lean    | on    | 100,000   | 1     | off    | quality | load           |                                                                                            | 5    | 15.5, 9.81, 7.86, 21.9, 27.1                   |

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

## Layout quality

Planted partition graphs, 100 communities. Stress and edge spread: lower is better; neighborhood, silhouette and purity: higher is better (quality.js). A cell is the median across runs.

| Library                             | Nodes + edges requested | At                           | Stress | Edge spread | Neighborhood | Silhouette | Purity | Runs |
| ----------------------------------- | ----------------------- | ---------------------------- | ------ | ----------- | ------------ | ---------- | ------ | ---- |
| cosmos.gl                           | 10,000 + 100,000        | start                        | 0.221  | 0.476       | 0.002        | -0.103     | 0.008  | 2    |
| cosmos.gl                           | 10,000 + 100,000        | 1 s                          | 0.310  | 0.776       | 0.005        | -0.288     | 0.030  | 2    |
| cosmos.gl                           | 10,000 + 100,000        | 5 s                          | 0.217  | 0.454       | 0.001        | -0.275     | 0.011  | 2    |
| cosmos.gl                           | 10,000 + 100,000        | 15 s                         | 0.263  | 0.539       | 0.003        | -0.351     | 0.015  | 2    |
| cosmos.gl                           | 10,000 + 100,000        | 30 s                         | 0.340  | 0.866       | 0.006        | -0.531     | 0.043  | 2    |
| cosmos.gl                           | 10,000 + 100,000        | end (0 of 2 settled; 60.0 s) | 0.342  | 0.705       | 0.004        | -0.422     | 0.025  | 2    |
| graphty-element batched             | 10,000 + 100,000        | start                        | 0.221  | 0.476       | 0.002        | -0.103     | 0.008  | 2    |
| graphty-element batched             | 10,000 + 100,000        | 1 s                          | 0.202  | 1.024       | 0.044        | -0.063     | 0.278  | 2    |
| graphty-element batched             | 10,000 + 100,000        | 5 s                          | 0.201  | 1.031       | 0.048        | -0.060     | 0.287  | 2    |
| graphty-element batched             | 10,000 + 100,000        | 15 s                         | 0.201  | 1.032       | 0.046        | -0.059     | 0.290  | 2    |
| graphty-element batched             | 10,000 + 100,000        | 30 s                         | 0.201  | 1.032       | 0.047        | -0.060     | 0.291  | 2    |
| graphty-element batched             | 10,000 + 100,000        | end (0 of 2 settled; 60.0 s) | 0.201  | 1.032       | 0.047        | -0.060     | 0.292  | 2    |
| cosmos.gl (SwiftShader)             | 10,000 + 100,000        | start                        | 0.221  | 0.476       | 0.002        | -0.103     | 0.008  | 2    |
| cosmos.gl (SwiftShader)             | 10,000 + 100,000        | step 100                     | 0.212  | 1.065       | 0.061        | -0.043     | 0.347  | 2    |
| cosmos.gl (SwiftShader)             | 10,000 + 100,000        | step 500                     | 0.205  | 1.054       | 0.056        | -0.058     | 0.324  | 2    |
| cosmos.gl (SwiftShader)             | 10,000 + 100,000        | step 1000                    | 0.200  | 1.039       | 0.047        | -0.063     | 0.288  | 2    |
| cosmos.gl (SwiftShader)             | 10,000 + 100,000        | step 2000                    | 0.193  | 1.024       | 0.041        | -0.072     | 0.269  | 2    |
| cosmos.gl (SwiftShader)             | 10,000 + 100,000        | step 4000                    | 0.192  | 1.020       | 0.041        | -0.080     | 0.272  | 2    |
| cosmos.gl (SwiftShader)             | 10,000 + 100,000        | end (2 of 2 settled; 209 s)  | 0.192  | 1.020       | 0.041        | -0.080     | 0.273  | 2    |
| graphty-element objects             | 10,000 + 100,000        | start                        | 0.221  | 0.476       | 0.002        | -0.103     | 0.008  | 2    |
| graphty-element objects             | 10,000 + 100,000        | 1 s                          | 0.228  | 0.492       | 0.001        | -0.127     | 0.010  | 2    |
| graphty-element objects             | 10,000 + 100,000        | 5 s                          | 0.201  | 1.031       | 0.048        | -0.062     | 0.289  | 2    |
| graphty-element objects             | 10,000 + 100,000        | 15 s                         | 0.201  | 1.032       | 0.046        | -0.059     | 0.290  | 2    |
| graphty-element objects             | 10,000 + 100,000        | 30 s                         | 0.201  | 1.032       | 0.047        | -0.060     | 0.292  | 2    |
| graphty-element objects             | 10,000 + 100,000        | end (0 of 2 settled; 60.0 s) | 0.201  | 1.032       | 0.047        | -0.060     | 0.292  | 2    |
| cosmos.gl                           | 100,000 + 1,000,000     | start                        | 0.208  | 0.475       | 0.000        | -0.038     | 0.011  | 2    |
| cosmos.gl                           | 100,000 + 1,000,000     | 1 s                          | 0.251  | 0.543       | 0.000        | -0.088     | 0.008  | 2    |
| cosmos.gl                           | 100,000 + 1,000,000     | 5 s                          | 0.258  | 0.558       | 0.000        | -0.080     | 0.008  | 2    |
| cosmos.gl                           | 100,000 + 1,000,000     | 15 s                         | 1.000  | -           | 0.000        | -          | 0.008  | 2    |
| cosmos.gl                           | 100,000 + 1,000,000     | 30 s                         | 0.344  | 0.715       | 0.000        | -0.068     | 0.010  | 2    |
| cosmos.gl                           | 100,000 + 1,000,000     | end (0 of 2 settled; 60.0 s) | 0.381  | 0.779       | 0.000        | -0.069     | 0.012  | 2    |
| cosmos.gl (SwiftShader)             | 100,000 + 1,000,000     | start                        | 0.208  | 0.475       | 0.000        | -0.038     | 0.011  | 1    |
| cosmos.gl (SwiftShader)             | 100,000 + 1,000,000     | step 100                     | 0.214  | 1.128       | 0.008        | 0.006      | 0.408  | 1    |
| cosmos.gl (SwiftShader)             | 100,000 + 1,000,000     | step 500                     | 0.202  | 1.145       | 0.007        | 0.010      | 0.417  | 1    |
| cosmos.gl (SwiftShader)             | 100,000 + 1,000,000     | step 1000                    | 0.198  | 1.146       | 0.008        | -0.010     | 0.388  | 1    |
| cosmos.gl (SwiftShader)             | 100,000 + 1,000,000     | end (0 of 1 settled; 318 s)  | 0.198  | 1.146       | 0.008        | -0.010     | 0.388  | 1    |
| cosmos.gl                           | 1,000,000 + 2,000,000   | start                        | 0.196  | 0.476       | 0.000        | -0.011     | 0.011  | 2    |
| cosmos.gl                           | 1,000,000 + 2,000,000   | 1 s                          | 0.240  | 0.546       | 0.000        | -0.022     | 0.008  | 2    |
| cosmos.gl                           | 1,000,000 + 2,000,000   | 5 s                          | 0.244  | 0.550       | 0.000        | -0.022     | 0.008  | 2    |
| cosmos.gl                           | 1,000,000 + 2,000,000   | 15 s                         | 0.259  | 0.571       | 0.000        | -0.020     | 0.010  | 2    |
| cosmos.gl                           | 1,000,000 + 2,000,000   | 30 s                         | 0.287  | 0.613       | 0.000        | -0.018     | 0.007  | 2    |
| cosmos.gl                           | 1,000,000 + 2,000,000   | end (0 of 2 settled; 60.0 s) | 0.340  | 0.689       | 0.000        | -0.017     | 0.009  | 2    |
| graphty-element batched             | 1,000,000 + 2,000,000   | start                        | 0.196  | 0.476       | 0.000        | -0.011     | 0.011  | 2    |
| graphty-element batched             | 1,000,000 + 2,000,000   | 1 s                          | 0.196  | 0.476       | 0.000        | -0.011     | 0.011  | 2    |
| graphty-element batched             | 1,000,000 + 2,000,000   | 5 s                          | 0.197  | 0.481       | 0.000        | -0.011     | 0.009  | 2    |
| graphty-element batched             | 1,000,000 + 2,000,000   | 15 s                         | 0.198  | 0.495       | 0.000        | -0.012     | 0.009  | 2    |
| graphty-element batched             | 1,000,000 + 2,000,000   | 30 s                         | 0.200  | 0.522       | 0.000        | -0.013     | 0.009  | 2    |
| graphty-element batched             | 1,000,000 + 2,000,000   | end (0 of 2 settled; 60.0 s) | 0.215  | 0.620       | 0.000        | -0.019     | 0.012  | 2    |
| cosmos.gl                           | 100,000 + 990,000       | start                        | 0.209  | 0.476       | 0.000        | -0.038     | 0.011  | 2    |
| cosmos.gl                           | 100,000 + 990,000       | 1 s                          | 0.229  | 0.543       | 0.000        | -0.089     | 0.008  | 2    |
| cosmos.gl                           | 100,000 + 990,000       | 5 s                          | 0.238  | 0.559       | 0.000        | -0.080     | 0.011  | 2    |
| cosmos.gl                           | 100,000 + 990,000       | 15 s                         | 0.283  | 0.630       | 0.000        | -0.070     | 0.008  | 2    |
| cosmos.gl                           | 100,000 + 990,000       | 30 s                         | 0.340  | 0.717       | 0.000        | -0.067     | 0.008  | 2    |
| cosmos.gl                           | 100,000 + 990,000       | end (0 of 2 settled; 60.0 s) | 0.381  | 0.780       | 0.000        | -0.069     | 0.008  | 2    |
| graphty-element batched (360 s run) | 1,000,000 + 2,000,000   | start                        | 0.196  | 0.476       | 0.000        | -0.011     | 0.011  | 1    |
| graphty-element batched (360 s run) | 1,000,000 + 2,000,000   | 1 s                          | 0.196  | 0.477       | 0.000        | -0.011     | 0.012  | 1    |
| graphty-element batched (360 s run) | 1,000,000 + 2,000,000   | 5 s                          | 0.197  | 0.481       | 0.000        | -0.011     | 0.009  | 1    |
| graphty-element batched (360 s run) | 1,000,000 + 2,000,000   | 15 s                         | 0.198  | 0.495       | 0.000        | -0.012     | 0.009  | 1    |
| graphty-element batched (360 s run) | 1,000,000 + 2,000,000   | 30 s                         | 0.200  | 0.522       | 0.000        | -0.013     | 0.009  | 1    |
| graphty-element batched (360 s run) | 1,000,000 + 2,000,000   | 60 s                         | 0.215  | 0.620       | 0.000        | -0.019     | 0.011  | 1    |
| graphty-element batched (360 s run) | 1,000,000 + 2,000,000   | 120 s                        | 0.187  | 0.506       | 0.000        | -0.158     | 0.012  | 1    |
| graphty-element batched (360 s run) | 1,000,000 + 2,000,000   | 240 s                        | 0.181  | 0.659       | 0.000        | -0.145     | 0.070  | 1    |
| graphty-element batched (360 s run) | 1,000,000 + 2,000,000   | end (0 of 1 settled; 360 s)  | 0.182  | 0.655       | 0.000        | -0.134     | 0.068  | 1    |
| graphty-element batched             | 100,000 + 990,000       | start                        | 0.209  | 0.476       | 0.000        | -0.038     | 0.011  | 2    |
| graphty-element batched             | 100,000 + 990,000       | 1 s                          | 0.209  | 0.477       | 0.000        | -0.038     | 0.010  | 2    |
| graphty-element batched             | 100,000 + 990,000       | 5 s                          | 0.212  | 0.482       | 0.000        | -0.040     | 0.011  | 2    |
| graphty-element batched             | 100,000 + 990,000       | 15 s                         | 0.224  | 0.504       | 0.000        | -0.044     | 0.011  | 2    |
| graphty-element batched             | 100,000 + 990,000       | 30 s                         | 0.241  | 0.561       | 0.000        | -0.068     | 0.008  | 2    |
| graphty-element batched             | 100,000 + 990,000       | end (0 of 2 settled; 60.0 s) | 0.206  | 0.505       | 0.001        | -0.231     | 0.024  | 2    |
| graphty-element objects             | 100,000 + 990,000       | start                        | 0.209  | 0.476       | 0.000        | -0.038     | 0.011  | 2    |
| graphty-element objects             | 100,000 + 990,000       | 1 s                          | 0.209  | 0.476       | 0.000        | -0.038     | 0.011  | 2    |
| graphty-element objects             | 100,000 + 990,000       | 5 s                          | 0.209  | 0.476       | 0.000        | -0.038     | 0.011  | 2    |
| graphty-element objects             | 100,000 + 990,000       | 15 s                         | 0.219  | 0.494       | 0.000        | -0.042     | 0.010  | 2    |
| graphty-element objects             | 100,000 + 990,000       | 30 s                         | 0.243  | 0.558       | 0.000        | -0.060     | 0.009  | 2    |
| graphty-element objects             | 100,000 + 990,000       | end (0 of 2 settled; 60.5 s) | 0.205  | 0.492       | 0.001        | -0.186     | 0.015  | 2    |
| cosmos.gl (SwiftShader)             | 100,000 + 990,000       | start                        | 0.209  | 0.476       | 0.000        | -0.038     | 0.011  | 3    |
| cosmos.gl (SwiftShader)             | 100,000 + 990,000       | step 100                     | 0.214  | 1.125       | 0.007        | 0.008      | 0.406  | 3    |
| cosmos.gl (SwiftShader)             | 100,000 + 990,000       | step 500                     | 0.203  | 1.142       | 0.008        | 0.008      | 0.414  | 3    |
| cosmos.gl (SwiftShader)             | 100,000 + 990,000       | step 1000                    | 0.198  | 1.143       | 0.007        | -0.016     | 0.386  | 3    |
| cosmos.gl (SwiftShader)             | 100,000 + 990,000       | end (0 of 3 settled; 227 s)  | 0.198  | 1.143       | 0.007        | -0.016     | 0.386  | 3    |
| graphty-element batched (360 s run) | 100,000 + 990,000       | start                        | 0.209  | 0.476       | 0.000        | -0.038     | 0.011  | 1    |
| graphty-element batched (360 s run) | 100,000 + 990,000       | 1 s                          | 0.209  | 0.477       | 0.000        | -0.038     | 0.010  | 1    |
| graphty-element batched (360 s run) | 100,000 + 990,000       | 5 s                          | 0.212  | 0.482       | 0.000        | -0.039     | 0.011  | 1    |
| graphty-element batched (360 s run) | 100,000 + 990,000       | 15 s                         | 0.227  | 0.509       | 0.000        | -0.044     | 0.011  | 1    |
| graphty-element batched (360 s run) | 100,000 + 990,000       | 30 s                         | 0.244  | 0.563       | 0.000        | -0.063     | 0.009  | 1    |
| graphty-element batched (360 s run) | 100,000 + 990,000       | 60 s                         | 0.206  | 0.503       | 0.001        | -0.222     | 0.024  | 1    |
| graphty-element batched (360 s run) | 100,000 + 990,000       | 120 s                        | 0.195  | 1.102       | 0.006        | -0.046     | 0.353  | 1    |
| graphty-element batched (360 s run) | 100,000 + 990,000       | 240 s                        | 0.195  | 1.105       | 0.005        | -0.042     | 0.348  | 1    |
| graphty-element batched (360 s run) | 100,000 + 990,000       | end (0 of 1 settled; 360 s)  | 0.195  | 1.106       | 0.005        | -0.042     | 0.348  | 1    |
