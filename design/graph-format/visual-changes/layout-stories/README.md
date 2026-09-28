# Layout story changes from the move onto indexed layouts

The layout package's legacy functions (`bfsLayout`, `planarLayout`, `springLayout`, ...) now run
on the `indexed.*` layouts over a graph-format snapshot ("Phase 5 -- layout" in
[the migration plan](../../migration-plan.md)).
This page records every layout Storybook story whose picture differs from master because of that,
and why, for the owner to review.

Layout's Storybook is not a visual-review project yet and master has no layout baselines (the
migration plan's **visual-review-ready** item adds both), so these captures stand in for the review
page until then. Once that lands, the Spring 3D change below must still be accepted by the owner on
the visual-review page of the pull request that first captures layout.

## What was compared

- master at `9fc948ee` against the integration branch `feat/graph-format-migration` at `77c84820`.
- All 17 layout stories at their default arguments, captured with visual-review's own capture
  (`visual-review/trusted/cli.mjs capture --project layout`, 1200x900, two captures per story),
  master's capture used as the baseline, at visual-review's default threshold.
- Result: 16 `unchanged`, 1 `changed`. No story was flaky; master captured twice gives identical
  bytes for every story.

## The one changed story: Layout3D / Spring 3D (`layout3d--spring-3-d`)

Four pixels differ, all on the anti-aliased rim of three node dots (at 572,279, 640,294-295 and
708,301); visual-review counts one of them over its threshold. Nothing moves visibly.

![master and branch, 4x crop around the changed pixels](spring-3d-crop-4x.png)

Full frames: [master](spring-3d-master.png), [branch](spring-3d-branch.png).

Why: `springLayout` now runs `indexed.fruchtermanReingold`, which keeps positions as float32
values, where the old loop kept float64. With the story's arguments (random graph, 10 nodes, seed
42, 50 iterations, scale 200) the largest node move is 2e-4 of a unit, a fraction of a pixel,
which shifts the rim shading of three dots. The seeding change for nodes missing from `pos` does
not apply here: the story passes no `pos`, and with no `pos` the start positions are drawn as
before. The 2D Spring story moves by 3.5e-5 of a unit and stays under the threshold.

## Stories that did not change, and why

- **BFS** and **Planar**: `bfsLayout` and `planarLayout` now visit neighbours in node order. The
  default graph of both stories is a tree, on which the old order and node order agree, so the
  layout is identical. visual-review captures default arguments only, so it will never show the
  two cases below, where a reader who changes the BFS story's controls does see nodes move:
  - graph type "random": nodes trade places within a layer, up to 1.6 units (about 320 px) at the
    story's other defaults ([overlay](bfs-random.svg)).
  - graph type "cycle" with the start node moved off 0: for each node count and seed, one start
    node puts the two branches of the cycle on swapped sides, a move of 0.2 to 1.0 units (at 10
    nodes, seed 42, start node 9: [overlay](bfs-cycle.svg)).

  In each overlay a grey ring is master's position, a blue dot the branch's, and a red dashed line
  a node's move. The other graph types (tree, grid, complete, star, path) give identical positions
  for every start node, checked over 4 to 20 nodes and 20 seeds. Planar's graph
  types (tree, grid, cycle, path, star) give identical positions, and so do bipartite and
  multipartite graphs.
- **Kamada-Kawai** (2D and 3D): `kamadaKawaiLayout` keeps its previous code.
- **Shell**: positions are identical; the `diff-stories.mjs` capture differs in 47 pixels by at most 3 levels of
  one channel, below every threshold.
- **Force Atlas 2** (2D and 3D), **ARF**, **Bipartite**, **Circular**, **Multipartite**,
  **Random**, **Spectral**, **Spherical**, **Spiral**: identical bytes.

## Reproducing

Build layout and its Storybook on both commits (`pnpm exec nx run layout:build`, then
`npx storybook build -o storybook-static` in `layout/`), then:

```bash
node visual-review/trusted/cli.mjs capture --project layout \
    --storybook <master>/layout/storybook-static --baselines <empty dir> --out <m>
node visual-review/trusted/cli.mjs capture --project layout \
    --storybook <branch>/layout/storybook-static --baselines <m> --out <b>
```

This needs a `layout` entry in `visual-review/projects.json`, which the migration plan's
**visual-review-ready** item adds. `tools/diff-stories.mjs` and `tools/pixel-diff.mjs` give the same verdict at 1000x800.
