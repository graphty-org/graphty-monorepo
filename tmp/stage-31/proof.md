# Stage 31 (label anchors, #3252) -- proof

Labelled and tooltip rows now stay on a node batch under renderPath "batched". The row's anchor
becomes a mesh with no geometry, boxed as its source mesh, and the labels hang from it. Under
"objects" (the default) nothing changes: node batches exist only on "batched", and there the
node's own mesh is never null, so `labelTarget` returns it exactly as on master.

## Tests (all run through tools/low-priority.sh, in graphty-element)

- Test first: `npx vitest run --project=render-parity test/browser/node-batch.test.ts -t labelled`.
  Before the change it failed ("a labelled row stays batched: expected +0 to equal 12"); after, it
  passes. It checks the labels are in the picture (more than 100 pixels change), batched matches
  objects at rest with 0 pixels over the bar, after a seeded ngraph run with auto-framing off, and
  that a real hover draws the tooltip with the row still batched.
- Mutation: with the labelled-row clause in `Node.walksEachFrame` replaced by `false`, the test now
  fails ("expected 360 to equal +0"): after the layout the labels lag their rows. Earlier it passed
  because the settle framing (`framingBounds` -> `followRow`) reads every row; the test now sets
  `element.autoFrame = false`, so only the frame's walk moves a labelled anchor. Clause restored.
- Whole file, render-parity project: `test/browser/node-batch.test.ts` 24 passed.
- `test/managers/style-painter.test.ts` (default project): 57 passed. Its `batchableOf` table now
  expects a label and a tooltip to be batchable (it pinned the old refusal).
- forced-batched project: `label-scaling`, `node-tooltip-on-hover`, `node-tooltip-style-draws`:
  17 passed (`edge-trim-mirror` is skipped there by test/forced-batched/skipped.json).
- browser project: `edge-trim-mirror`, `label-scaling`, `node-tooltip-on-hover`: 22 passed.
- render-parity stories narrowed with `VITE_PARITY_STORIES='Label|Tooltip'`: 6 passed (LabelCardDrawing,
  NodeTooltips; LabelStyles is left out of render-parity by the file's existing HANGS rule).
- `npm run lint` (eslint, funnel rules, tsc, strict-consumer typecheck): clean.
- `npm run build`: clean. `npm run api:report`: no change (`RichTextLabel.retarget` is @internal).
- `node tools/sonar-gate.mjs`: no new issue or hotspot on the changed lines.

## Target: 10k labelled still at least 20 ms below stage 0 -- NOT MET under this load

benchmarks/compare, key `lean-s-labels` (10k nodes, 100k edges, labels, no layout), this build,
three interleaved pairs under the GPU lock, RTX 4070 SUPER renderer, working tree clean. Batched
rows: 10000 batched, 0 object nodes in every batched run.

| run | path    | still serial median ms | still paced median ms | load before / after |
| --- | ------- | ---------------------- | --------------------- | ------------------- |
| 1   | batched | 163.8                  | 190.4                 | 18.0 / 71.4         |
| 1   | objects | 141.1                  | 135.9                 | 71.4 / 74.6         |
| 2   | batched | 148.3                  | 158.6                 | 62.6 / 21.8         |
| 2   | objects | 136.3                  | 133.3                 | 21.8 / 26.3         |
| 3   | objects | 177.9                  | 201.1                 | 25.6 / 33.8         |
| 3   | batched | 210.5                  | 230.0                 | 33.8 / 30.1         |

Medians of three: batched 163.8 ms, objects 141.1 ms serial. The objects path is master's path, so
it stands in for stage 0 in this session (the stage 0 baseline, 125-132 ms, was taken on a quiet
machine and is not comparable). The timed numbers show no gain and lean against batched, but the
load swung between 18 and 75 during the runs. A CPU profile of 60 still frames (run 2) points the
other way: 15.8 s of non-idle CPU on batched against 20.7 s on objects. Most of the frame in both
is drawing the 10k label planes (`_RenderSorted`, `bindForSubMesh`, uniform updates), which this
stage does not change, so batching the node meshes alone cannot buy 20 ms here. Recorded, not used
to fail the stage; parity is clean. Rows are in benchmarks/results/stage-31-batched and
stage-31-objects.

## Design

No correction to design/rendering/row-renderer.md: the anchor is made on demand and only for
labelled rows, so unlabelled batched rows keep a TransformNode and add nothing to scene.meshes.
