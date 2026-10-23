# Why a bigger PageRank can draw a smaller dot in 3D

Measured 2026-10-07 on the studio build (graphty 0.8.55, https://dev.ato.ms:9366/?next) with
`3d-size.mjs` beside this file.

## The question

On the running club (`design/ui/studio/tool/files/friends.csv`), with node Size bound to PageRank
("1 to 3") and Color bound to PageRank, Ava's dot is drawn larger than Farah's in the default 3D
view, although Farah has the higher PageRank (0.06608 against Ava's 0.06423). A study participant
read Ava as the most influential person because of it. This trace measures where the wrong order
comes from.

## Cause: perspective

**The 3D camera draws a nearer node bigger, and on this graph the difference in depth is larger
than the difference in size.** graphty-element gives every node the right size for its value; the
perspective projection of the default 3D camera then shrinks each node in proportion to its
distance from the camera. Farah sits about 16% farther away than Ava in the default view, while
her size is only about 6% larger, so she is drawn smaller. Turn the camera half a turn and the
order flips; switch to 2D (an orthographic camera, where distance does not change size) and the
order is right.

It is not the size mapping, not a minimum-size clamp and not the labels:

- **Size mapping: correct.** The style gives Ava 2.834 and Farah 3.000. That is exactly the linear
  "1 to 3" mapping of their PageRank over the graph's range 0.04382 to 0.06608
  (1 + 2 x (0.06423 - 0.04382) / (0.06608 - 0.04382) = 2.834). Their world diameters (4.251 and
  4.500; the sphere is built at 1.5 times the style size for every node alike) keep the same order.
  Across all 190 pairs of nodes, no pair's world size disagrees with its PageRank order, in any
  view.
- **Minimum-size clamp: not involved.** The element's floor is 0.001; the smallest size here is 1.
- **Label offset: not involved.** The diameter the element reports (its own projection of the
  mesh) and the diameter measured from the screenshot's pixels agree within 1 px, with labels on.

## The numbers

Drawn diameters are in screen pixels (1440 x 900 window, device scale 1). "Depth" is the node's
distance from the camera along the view direction, which is what perspective divides by;
"distance" is the straight-line distance to the camera. Both are in world units. "Drawn
(element)" is `nodeScreenPosition(id).radius` doubled; "drawn (pixels)" is measured on the
screenshot.

| View              | Node  | PageRank | Style size | World diameter | Depth | Distance | Drawn (element) | Drawn (pixels) |
| ----------------- | ----- | -------- | ---------- | -------------- | ----- | -------- | --------------- | -------------- |
| 3D, default angle | Ava   | 0.06423  | 2.834      | 4.251          | 80.76 | 81.51    | 53.5 px         | 53 px          |
| 3D, default angle | Farah | 0.06608  | 3.000      | 4.500          | 93.91 | 96.58    | 48.7 px         | 48 px          |
| 3D, half a turn   | Ava   | 0.06423  | 2.834      | 4.251          | 88.85 | 89.53    | 48.7 px         | 49 px          |
| 3D, half a turn   | Farah | 0.06608  | 3.000      | 4.500          | 75.69 | 78.97    | 60.5 px         | 60 px          |
| 2D                | Ava   | 0.06423  | 2.834      | 4.251          | 11.50 | 17.85    | 65.7 px         | 66 px          |
| 2D                | Farah | 0.06608  | 3.000      | 4.500          | 11.50 | 25.28    | 69.5 px         | 69 px          |

The 3D camera is a perspective camera with a 45.8 degree field of view; the 2D camera is
orthographic, so its depth is the same for every node and its distances do not affect size.

Perspective predicts the 3D ratios exactly. Drawn size is proportional to world diameter over
depth:

- Default angle: Ava 4.251 / 80.76 = 0.0526, Farah 4.500 / 93.91 = 0.0479; ratio 1.10. Drawn
  ratio 53.5 / 48.7 = 1.10. Ava larger, wrong.
- Half a turn: Ava 4.251 / 88.85 = 0.0478, Farah 4.500 / 75.69 = 0.0595; ratio 0.80. Drawn ratio
  48.7 / 60.5 = 0.80. Farah larger, right, but only because she is now nearer.
- 2D: drawn ratio 65.7 / 69.5 = 0.95, the same as the world ratio 4.251 / 4.500 = 0.94. Right.

## How often it misleads on this graph

| View              | Pairs of nodes drawn against their PageRank order | Pairs whose world size is against it | Node depths  |
| ----------------- | ------------------------------------------------- | ------------------------------------ | ------------ |
| 3D, default angle | 20 of 190                                         | 0 of 190                             | 72.5 to 96.6 |
| 3D, half a turn   | 22 of 190                                         | 0 of 190                             | 73.1 to 97.1 |
| 2D                | 0 of 190                                          | 0 of 190                             | 11.5 (all)   |

The farthest node is about 1.33 times as deep as the nearest, so in 3D any two nodes whose sizes
differ by less than about a third can be drawn in either order, depending on the angle. PageRank on
a small, even network spreads its values narrowly (0.044 to 0.066 here), so many pairs are that
close.

The exported picture in the round 3 repro (`../../rounds/round-3/repro/r3-s09/run/downloads/friends_current-view.png`,
Ava about 140 px and Farah about 120 px at 2x) is the same effect: "Current view" exports from the
on-screen camera.

## What a fix must address

The size a style gives a node is right; what a reader compares is the drawn size, and in a
perspective view that also encodes depth. A fix has to make a size bound to data comparable
whatever a node's depth (for example, an option that draws node size independent of the camera
distance), not change the mapping. Pushing the camera farther back only shrinks the ratio (here
it would need to be several times farther to bring the 33% depth spread under Ava and Farah's 6%),
and does not remove it.

## Rerunning

```bash
design/ui/studio/tool/with-browser.sh node design/ui/studio/next-steps/traces/3d-size.mjs [out dir] [app url]
```

It opens the app, opens `friends.csv`, runs PageRank, binds node Size to it and names every node
(the round 3 participant's route), then measures in 3D at the default angle, in 3D after half a
turn of the camera about the vertical, and in 2D (the toolbar's view menu). It prints the table
above, writes `measurements.json` (every node, every view) and one screenshot per view into the out
dir (default `design/ui/studio/tmp/r3fix-trace-3d-size/run/`).
