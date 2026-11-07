# Stage 31 (label anchors) -- proof, in progress

## Done so far
- test/browser/node-batch.test.ts: new case "keep labelled and tooltip rows on the batch, their labels where
  the object path puts them". Before the change it failed: "a labelled row stays batched: expected +0 to equal 12".
  After: passes on the render-parity project (webgl, SwiftShader), including "the labels are in the picture"
  (labels change more than 100 pixels) and zero pixels over the bar against the object path, at rest and after
  a seeded ngraph run, and a real hover draws the tooltip with the row still batched.
- Command: tools/low-priority.sh npx vitest run --project=render-parity test/browser/node-batch.test.ts -t labelled

## Open
- Mutation finding: with the new `labels().length > 0` clause in Node.walksEachFrame replaced by `false`, the
  test still passes. A trace showed zoom-to-fit framing (Node.framingBounds -> followRow) moving labelled
  anchors while a layout runs; after a real wheel the mutation still passed, so something else follows too.
  Not yet decided whether the clause is needed.
- Not yet run: lint, build, the whole node-batch file, label-scaling under forced-batched, render-parity
  stories with labels, sonar-gate, the harness measurement (10k labelled still frame).
