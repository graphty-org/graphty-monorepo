# forced-batched

The `forced-batched` vitest project runs every file the `browser` project runs (the list is
`test/browser-include.json`) and the interaction suite again, with `renderPath: "batched"` as the
default (`setup.ts`). `minimum-work-batched` does the same for the `minimum-work` files. Both run in
the `graphty-element-forced-batched-<n>` CI shards, so on any pull request that runs the browser
shards.

## The files here

- `skipped.json`: files left out of the project, each with the reason.
- `builds-objects.json`: files that read `node.mesh`, `getNode`, `getEdges` or `edges.values()`, which
  builds Node and Edge objects on a batched graph, without asserting `rowCounts.batchedNodes`. They
  predate `test/contracts/forced-batched-honesty.test.ts`, which fails on a new such file and on an
  entry that no longer needs to be listed. The list only shrinks: make a file assert the batched row
  count, or move it to `skipped.json` with a reason.

## Running

From `graphty-element/`:

    # the honesty check, Node only, about a second
    pnpm exec vitest run --project=default test/contracts/forced-batched-honesty.test.ts

    # the consumer scene contract on both paths
    ../tools/with-browser.sh pnpm exec vitest run --project=browser test/browser/consumer-scene.test.ts
    ../tools/with-browser.sh pnpm exec vitest run --project=forced-batched test/browser/consumer-scene.test.ts

    # the minimum-work twin, or one CI shard of forced-batched
    ../tools/with-browser.sh pnpm exec vitest run --project=minimum-work-batched
    ../tools/run-tests.sh graphty-element-forced-batched-1

`test/browser/consumer-scene.test.ts` asserts the same thing on both paths: what a consumer using
`element.graph.scene` saw on the objects path before the row renderer. A case red on batched is an
open batched defect; it stays red until fixed and is never skipped.
