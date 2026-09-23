# Why the stories passed

A person opened Storybook and found broken pictures in the first few minutes. The test suite --
8,600 tests across five projects, all green -- had nothing to say about any of them. This document
answers why, names what is actually broken, decides for each fault whether it is a broken demo or a
shipped defect, and specifies the tests that would have caught them.

## The short answer

Three independent things had to be true at once, and all three were.

**The suite asserts what the style model computes, never what the scene contains.** Every one of the
131 stories is a test in the `storybook` project, and the whole of that test is "the story mounted
and nothing threw" -- there is not one assertion about appearance in any of the 30 story files. The
unit and browser tests that do check styling read the painter's own answer (`nodePaint(index)`,
`styles.explain({node})`), and the painter's answer was correct throughout: it said the node had a
black label at 48px while no label mesh existed anywhere in the scene.

**Every test that exercises a style layer uses the one order of operations that heals both style
defects.** The two element defects behind the blank stories are "a layer added before the data is
set is silently discarded" and "a graph loaded from a data source never gets its first repaint".
Every style test loads the data first, and then awaits the layer. Awaiting is what hides the first
defect; adding the layer after the load is what hides the second. The stories do the opposite of
both, on purpose, and nothing tests the way the stories do it.

**The visual gate that exists precisely for this has never run on this change set.** The 41 commits
carrying the 2.0 work are on local `master` only; `git rev-list --count origin/master..HEAD` is 41.
No CI run has seen them, so the Chromatic job has not either -- and the local route to Chromatic
(`npm test` ends in `npx chromatic`) has no element token in the repository's `.env`, which holds
Chromatic tokens for algorithms, layout and compact-mantine and none for graphty-element.

## What is actually broken

Four faults explain all 47 observations from the probes. Three are element defects -- every consumer
of graphty-element has them -- and one is a story defect.

### Element: a style edit queued before the data is discarded, and its run never settles

`session.styles.add(spec)` puts the edit on the element's operation queue in the category
`algorithm-run` (`src/session/styles/StylesApi.ts`, `surroundingsFor().enqueue`, which calls
`queue.queueOperation("algorithm-run", body, ...)`). Setting `nodeData` in the same tick queues a
`data-add` operation, and `OBSOLESCENCE_RULES["data-add"].obsoletes` is
`["layout-update", "algorithm-run"]` (`src/constants/obsolescence-rules.ts:26-29`).

`queueOperation` applies the obsolescence rules synchronously but only schedules the batch on a
microtask, so the style edit is still in `pendingOperations` when the data arrives.
`applyObsolescenceRules` aborts its controller and deletes it from `pendingOperations`,
`queuedOperations` and `currentBatch` (`src/managers/OperationQueueManager.ts:355-375`). Because it
never reached p-queue, the `.catch()` that reports an `AbortError` for a cancelled operation
(`OperationQueueManager.ts:440-449`) never runs, and the operation's body is never invoked.

The body is the run. `ManagedRun` settles only from inside its own body, from `cancel()`, or from a
caller-supplied `AbortSignal` (`src/session/runs/Run.ts`: `start()`, `cancel()`, `settle()`). The
queue aborting the operation is invisible to it -- a `RunTicket` is a one-way `cancel()` handle with
no channel back. So the layer neither commits nor rejects, and the promise never settles.

This contradicts the API's published contract. `docs/guide/styling.md:48` says "**No write verb
throws.** A malformed spec, an unknown id or a locked layer arrives as a rejected run", and the
paragraph above it says a write verb "can be fired from a click handler and forgotten". Here it is
fired, forgotten, and silently dropped: no commit, no rejection, no console error, no entry in
`session.paint.problems()`.

Order is the whole of it. `add` then set data strands the run. Set data then `add` works. `add` with
no data at all works.

Introduced by `8036cc2d feat(graphty-element): replace evaluated style expressions with declarative
layers`, which is the commit that made a style write a queued run in the `algorithm-run` category.

### Element: a graph loaded from a data source is never painted from the style stack

`Graph.addDataFromSource` forwards straight to `DataManager.addDataFromSource` (`src/Graph.ts:809-811`),
which loads chunks by calling its own `this.addNodes(chunk.nodes)` / `this.addEdges(chunk.edges, ...)`
-- the DataManager's methods, not the Graph's queued ones. Nothing queues a `data-add` operation.

The element's only whole-graph repaint is registered as a trigger on that queue category
(`src/Graph.ts:347-353`, "Repaint from the session style stack after data add"). For a `dataSource`
or URL load it therefore never fires, and every node and edge keeps `bootstrapNodePaint()` /
`bootstrapEdgePaint()` for the life of the graph (`src/managers/StylePainter.ts`). Measured
consequences: `session.paint.styleOf("node", i)` is `{}`, every mesh is named
`node-style-graphty-bootstrap-3d`, and `styles.explain({node})` returns no contributions at all --
not even from the element's own `Node defaults` layer -- because prepared bindings are built by the
repaint and no repaint has run (`src/session/styles/StylesApi.ts`, `encodingOf`;
`src/session/styles/repaint.ts`, `lastPreparedFrom`).

The picture on screen is the element's own fallback appearance, which happens to equal the default
layer's colour, so the failure looks like success until a story asks for something else.

Any later style edit repaints and the whole stack wakes up. That is why a layer added after the load
works, which is why the tests pass.

The knowledge needed to prevent this was already in the file. `src/Graph.ts:510-512` reads: "Algorithm
running is handled in the data-added event listener below rather than through operation queue
triggers, because data sources bypass the operation queue when adding data." The on-load algorithms
were moved off the queue for exactly this reason; the repaint was not.

Introduced by `c3561815 feat(graphty-element): derive an algorithm's styling from what its result
declares`, which replaced per-element pull-based styling with a pushed repaint. Before it, a node
resolved its own style in its constructor (`Styles.getStyleForNodeStyleId(styleId)`), so a node built
by any load path was styled; and `DataManager.applyStylesToExistingNodes()` re-resolved every element
on a style change. The push model has exactly one whole-graph entry point and one of the two load
paths reaches it.

### Element: a label, tooltip or marker never reaches the screen after the first paint

`Node.paintFrom` returns early when the source mesh key has not changed, applying only the instance
colour (`src/Node.ts:386-392`). `Edge.paintFrom` does the same and applies nothing
(`src/Edge.ts:499-503`). The label build sits after that return (`src/Node.ts:505-512`).

The mesh key is minted from the channels classified `role: "mesh"` in
`src/session/styles/intern.ts` (`CHANNEL_ROLES`, `MESH_CHANNELS`). `node.label`, `node.labelStyle`,
`node.tooltip`, `node.marker`, `edge.label`, `edge.labelStyle` and `edge.tooltip` are classified
`content` and deliberately key nothing. `StylePainter` compensates for the two `instance` channels by
folding colour and opacity into the renderer's key string (`nodePaintOf`, `edgePaintOf`), and nothing
compensates for the content channels.

So an edit that changes only a label is dropped: the pass marks the element dirty, `UpdateManager.syncStyles`
hands the new paint to `applySessionPaint`, and `paintFrom` returns before the label is built. The
comment on `syncStyles` states the early return as a cost optimisation -- "compare the source mesh
they are handed with the one already on screen and rebuild only when it differs, so a colour change
on a node is one buffer write and no geometry at all" -- which is true of geometry and false of text.

This is invisible in the stories as they stand, because the first repaint always moves the key from
`graphty-bootstrap` to `s0`, and that rebuild does build the label. It is visible the moment a
consumer or the app toggles labels on a graph that is already drawn, which is the ordinary case for a
settings panel. The probes' one direct experiment for it was invalidated by a Storybook reload; the
reading above is from the code and is unambiguous.

Introduced by `c3561815`, the same commit: the content role and the key-based early return arrived
together.

### Story: `setup` is inert in every story file whose meta has no `render: renderFn`

`stories/helpers.ts` defines `StorySetup` -- `node`, `edge`, `nodeEncode`, `edgeEncode`, `layers`,
`viewMode`, `algorithms`, `preSteps` -- and it is a convention understood by exactly one function,
`renderFn`, which turns it into style layers and element properties. It is not an element property.
Eleven story files pass `setup` and never route through `renderFn`:

* the eight algorithm files, through `stories/algorithms/helpers.ts` (`algorithmMetaBase` has no
  `render`): Centrality 7 stories, Community 4, Combined 4, Flow 3, ShortestPath 3, Component 2,
  SpanningTree 2, Traversal 2
* `stories/Data.stories.ts` (21 stories), `stories/Graphty.stories.ts` (1),
  `stories/CameraControls.stories.ts` (2, which has its own render function)

For those stories Storybook's default web-components renderer assigns every arg as a property, so
`dataSource`, `layout` and `layoutConfig` take effect and `element.setup = {...}` lands as a dead
property the element ignores. Measured live against the running Storybook on
`algorithms-centrality--degree`: the story's own args carry `setup.algorithms === ["graphty:degree"]`,
and yet `element.algorithmsOnLoad` is `undefined`, `graph.styles.config.data.algorithms` is
`undefined`, and `session.runs.list()` is empty. A patched `algorithmsOnLoad` setter on the element
prototype recorded zero calls during the whole render; setting the property by hand afterwards works
and reaches `styles.config.data.algorithms`. So no algorithm ever runs on those 27 stories, and
`graph.applySuggestedStyles(algorithmId)` in their play function has no run to read.

This is a migration miss, and the diff shows it exactly. Before `ff12a515`, `createAlgorithmStory`
passed `styleTemplate: templateCreator({ algorithms: [algorithmId], behavior: { layout: { preSteps: 8000 } } })`.
`styleTemplate` was a real element property, so the default renderer applied it and the stories
worked with no render function. The migration replaced that arg with `setup` and the render function
it depends on was never added.

Two smaller consequences of the same defect: `setup.preSteps` is also inert on those stories, and the
`preview.ts` decorator that would supply a default only acts when the story returns an element rather
than a lit template, so they run with the element default of 0 pre-steps -- an unsettled physics
layout, which is the one thing that makes a Chromatic snapshot unstable. And `algorithms-flow--max-flow`,
which the probe called healthy, is not: its `setup.nodeEncode` asks for a label on every node and
never gets one; what works there is the explicit `graph.runAlgorithm(..., { applySuggestedStyles: true })`
in its play function.

### Two more, settled

`layout-2d--force-atlas-2` lays out in three dimensions because the story passes no
`layoutConfig: { dim: 2 }`, which every one of its 2D siblings does (`stories/Layout2D.stories.ts`:
compare `ForceAtlas2` with `Circular`, `Shell`, `Spring`). That is a story fault with a one-line fix.
The element-side question it raises -- `viewMode: "2d"` does not constrain a layout's dimensionality
-- is a design question for the element, not a defect, and is worth writing down rather than fixing
by accident.

The removed edge-label fallback is not a defect and is not the cause of anything reported.
`Edge.extractLabelText` no longer falls back to the edge id, which is exactly what
`design/element-api/edge-model-and-layout-state.md:1439-1444` decided ("the fallback is removed -- an
unlabelled edge draws no label"), and the label stories that are blank are node-label stories driven
by explicit layers. Lead killed.

The 1.x `StyleManager.addLayer` defect -- "adding a layer does not apply it", recorded at
`design/element-api/element-api-migration.md:236` -- is genuinely fixed: a write verb now repaints
before it commits. The new defect is the opposite failure mode of the same promise: the edit neither
paints nor refuses.

## What the storybook lane actually asserts

The `storybook` project has no `include` of its own; the `storybookTest` plugin turns each story into
one test. The body of that test, in full, is in
`node_modules/@storybook/addon-vitest/dist/vitest-plugin/test-utils.mjs`:

```js
testStory = (exportName, story, meta, skipTags) => async context => {
  let annotations = getCsfFactoryAnnotations(story, meta),
      composedStory = composeStory(annotations.story, annotations.meta, {...});
  (composedStory === void 0 || skipTags?.some(tag => composedStory.tags.includes(tag))) && context.skip(),
  context.story = composedStory;
  let _task = context.task;
  _task.meta.storyId = composedStory.id,
  await setViewport(composedStory.parameters, composedStory.globals),
  await composedStory.run(),
  _task.meta.reports = composedStory.reporting.reports;
};
```

Render the story, run its play function, record the reports. A test fails if something throws. That
is the entire assertion surface for all 131 stories.

Counted across all 30 story files: **0 occurrences of `expect(` and 0 of `assert`.** The 131 tests
contain no assertion about appearance, geometry, colour, text, layer count or element state. The play
functions that exist are almost all one line, `await waitForGraphSettled(canvasElement)`.

**29 of the 131 stories have no play function at all** -- every story in `LayeredStyles` (14) and
`EdgeStyles` (9), plus `AllNodeShapes`, `ArrowText`, `BezierEdges`, `BidirectionalArrows`, `Graphty`
and `PerformanceTest`. Those tests return as soon as the story mounts, before the graph has loaded its
data, let alone drawn anything. The 14 layered-style stories that all render the same picture are
tested by mounting them and returning.

The global settle that looks like it covers this does not exist. `.storybook/preview.ts` puts a play
function in `parameters`:

```ts
parameters: {
    // Add play function to all stories to wait for graph settling
    play: async ({ canvasElement }) => { await waitForGraphSettled({ canvasElement }); },
}
```

Storybook never reads `parameters.play`. The string `parameters.play` does not occur anywhere in
`storybook/dist/preview-api/index.js`, and the play function is resolved as `story.play ?? meta.play`
(`prepareStory`: `T = r?.play ?? e?.play`). Project annotations contribute `render`, `mount`,
`decorators`, `loaders`, `beforeEach` and `afterEach` -- not `play`. So this block has never run. It
predates the 2.0 work (`61d14b2f`, a delint commit).

What the lane would catch: an exception during module load, render or play; a story whose element
constructor throws; an unhandled rejection raised inside a play function. What it would not catch:
anything at all about the picture, an empty canvas, a failed data fetch, a layer that never landed, a
run that never settled, thirteen stories that are byte-identical to each other.

## What the interactions lane asserts

19 files, 227 tests, all about input: camera direction mappings under mouse, keyboard, touch and XR;
deadzones and speeds; node drag and pin-on-drag; view-mode transitions; selection by click
(`test/interactions/`, and its README is an accurate table of contents). Nothing in the lane reads a
style, a layer, a label or a pixel. It could not have caught any of these faults, and it is not a
criticism of the lane that it did not.

## What the browser lane asserts, and why the pixel test missed this

`test/browser/style-paint-pixels.test.ts` is the one test in the repository that compares the style
model against real pixels, and its own header says why it exists: "there is a join nothing covered: a
whole chain from a style layer, through the columnar repaint, through the painter, through the mesh
cache and the instanced colour buffer, to the frame." It works. It missed these faults for three
reasons, all structural.

**Its `beforeEach` loads the data first, and through the queued path.**

```ts
graph = new Graph(container);
await graph.init();
session = graph.getSession();

await graph.addNodes(NODES);
await graph.addEdges(EDGES);
await graph.operationQueue.waitForCompletion();
```

`graph.addNodes` queues a `data-add` operation, so the repaint trigger fires and the first paint
happens. There is no data-source load anywhere in the file, so the missing repaint cannot occur; and
the layers it adds come after the data, so the stranded run cannot occur.

**It checks two channels.** The first test reads `node.color` from the element's own default layer;
the second runs `degree` and reads the colours of an encoded ramp. Both go through
`styles.explain({node}).merged["node.color"]`. Nothing in the file reads a label, a shape, a size, an
opacity, an arrowhead, a line style or anything about an edge.

**A label is not a measurable hue.** The sampler deliberately looks for the most colourful pixel near
a node's projected position and skips anything whose channel spread is under 24, "because that is
grey, which is the background, the edges and a specular highlight". The default label is black text on
whitesmoke -- pure grey by that test -- so the one instrument that reads pixels is calibrated to
ignore exactly the thing the label stories are about. Reading a label off the canvas needs the
opposite measurement: count near-black pixels in the neighbourhood, which is how the probes proved
the labels were absent (`darkPx = 0 of 468,512`).

`test/browser/style-layers.test.ts` is the other place layers meet a real graph, and it is honest
about its scope in its own header: "nothing here asserts a mesh, a material or a pixel ... What is
asserted is what the MODEL resolves." Its `beforeEach` adds the nodes and edges and drains the queue,
every one of its tests lives under `describe("a layer over a real loaded graph")`, and every edit is
`await session.styles.add(...)`. Awaiting is itself enough to hide the stranded-run defect: the
stranded run is the one nobody awaits.

`test/browser/property-order-independence.test.ts` is the closest miss in the repository. It exists to
prove that "the same operations in any order end with the same graph", and Variant 1 is literally
"Style then Data then Layout":

```ts
await applyFinalStyle(graph);
await graph.addNodes(TEST_NODES);
await graph.setEdges(TEST_EDGES);
await graph.setLayout("circular");
await graph.operationQueue.waitForCompletion();
```

It passes, and it is right to pass -- because `applyFinalStyle` awaits `session.styles.add`, so the
style run has already committed and repainted before `addNodes` is called, and there is no pending
`algorithm-run` for the data-add to obsolete. Thirty-four variants of operation order, and every one
of them awaits each step. The order the stories use -- issue the edit, do not await it, set the data in
the same tick -- is the one order not covered, and it is the order `stories/helpers.ts` documents as
deliberate: "Fired and forgotten: a style edit is a queued run that reports its own refusal, and a
render function cannot await one."

`test/browser/extensions/format-extension.test.ts` does load through a data source and does add
layers, and asserts the repaint's own `painted.nodes` counts. It passes for the same reason: it adds
the layer after `await element.addDataFromSource(...)`, and a style edit repaints what it touched, so
it silently exercises the recovery path and never observes that the first repaint never happened.

The label tests are all at the leaf, not on the chain. `test/browser/Edge.label.test.ts`,
`test/browser/Edge.arrowText.test.ts` and `test/browser/label-attachOffset.test.ts` construct a
`RichTextLabel` by hand and check that it has a `labelMesh`, or declare an `EdgeStyleConfig` object
literal and assert that the fields they just typed are there:

```ts
const style: EdgeStyleConfig = { arrowHead: { type: "normal", text: { text: "->", fontSize: 12, ... } }, ... };
const { arrowHead } = style;
assert.equal(text.text, "->");
```

`Edge.arrowText.test.ts` is named after the ArrowText story. The story draws no label and no tail
arrow; the test cannot see either, because it never builds a graph.

Only four test files mention the `node.label` channel at all, and all four assert the model. The
sharpest example is `test/managers/style-painter.test.ts:280-295`:

```ts
it("switches a label on when a layer paints its words", async () => {
    await held.styles.add(spec);            // set: { "node.label": "hello" }
    await held.paintAll();
    const paint = held.painter.nodePaint(0);
    assert.strictEqual(paint?.style.label?.text, "hello");
    assert.isTrue(paint?.style.label?.enabled, "a label nobody switched on is never drawn");
});
```

That assertion holds today, in the broken product. The probes measured `nodePaint(0)` reporting label
state on stories where `node.label` was `undefined` on every node and no mesh in the scene matched
`/label|text|rich/`. The test is one layer above the defect: it checks that the painter resolved the
label, and the defect is that nothing builds it.

## The wait helpers cannot fail

Every wait in `stories/helpers.ts` resolves on timeout instead of failing. `waitForDataLoaded` races
the `data-loaded` event against a 5-second timer that calls `resolve()`; `waitForGraphSettled` races
`graph-settled` against another one, with the comment "For static layouts, this is not an error". The
`preview.ts` version logs `console.warn("Graph settled timeout - proceeding anyway")`.

Thirty-plus stories -- every LabelStyles, NodeStyles, GraphStyles and algorithm story -- fetch their
data from `raw.githubusercontent.com` at render time. If that fetch fails or is slow, the helper
resolves anyway, the story renders an empty canvas, and the test passes. There is no assertion
anywhere that the graph the story was supposed to load actually loaded. A green storybook run is
therefore compatible with 30 stories having drawn nothing at all.

## Chromatic: what is actually true

Chromatic is configured and wired into CI. `.github/workflows/ci.yml` has a `chromatic-element` job
using `chromaui/action@latest` with `projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN_ELEMENT }}` and
`exitZeroOnChanges: false`, so a changed snapshot fails the job. On the last master run that included
it, `Chromatic (graphty-element)` reported success -- on code that predates this change set.

It has not run on this change set, and cannot have: the 41 commits carrying the 2.0 work have never
been pushed (`git rev-list --count origin/master..HEAD` is 41; `origin/master` is `9dd4d388`, a merge
of unrelated work). The local path to Chromatic is `npm test`, which is
`test:shards:parallel && test:visual`, and `test:visual` is `npx chromatic`. The repository `.env`
holds `CHROMATIC_PROJECT_TOKEN_ALGORITHMS`, `CHROMATIC_PROJECT_TOKEN_LAYOUT` and
`CHROMATIC_PROJECT_TOKEN_COMPACT_MANTINE` and no element token. So the suite that was reported green
is the three vitest shards; the fourth step of `npm test` could not have run here.

**What Chromatic would have caught had it run.** Most of it. In 1.x these stories drew what they
promised -- styling was pulled per element at construction, and the algorithm stories configured
themselves through the `styleTemplate` property -- so the stored baselines carry correct pictures.
Every label story losing its labels, every layered story collapsing to the default picture, every
algorithm ramp disappearing, the edge width, opacity, arrowhead and bezier stories: all of those are
large pixel diffs against a good baseline, and with `exitZeroOnChanges: false` they would have blocked
the merge.

**What Chromatic would have missed even then.** Four things, and they matter.

* A story that has always been wrong has a wrong baseline. Chromatic compares a story to its own past
  and never to its siblings. The signature of this fault was "thirteen stories byte-identical to each
  other" (probe sha `f3ea2b98d777b7a7`), and no per-story baseline diff can express that. A new story
  that never worked is accepted as its own first baseline.
* This change set is *supposed* to move most pictures. `design/element-api/edge-model-and-layout-state.md:1425-1460`
  is a deliberate list of what should move, and it includes "Edge labels change, and most of them
  disappear" and "Edges appear where there were none". A reviewer facing 130 diffs with that document
  in hand would plausibly accept blank label stories as the intended change. A re-baseline of this
  size is a review of 130 judgements, and the judgement needed here was "these two are blank for a
  different reason than the one in the document".
* 27 of the changed stories now run with zero layout pre-steps, because their `setup.preSteps` is
  inert. An unstepped physics layout is a different picture every run, which is the failure mode
  `CHROMATIC_PRE_STEPS` exists to prevent -- so those diffs would have arrived as noise mixed with the
  signal.
* Chromatic says nothing about a promise that never settles, a run that neither commits nor rejects,
  or an algorithm that never ran. Two of the three element defects are only *visible* as pixels; they
  are only *diagnosable* from the element's own state.

Chromatic is necessary and it is not sufficient. The token and the push are the first fix; a test that
asserts the element's own state per story is the one that turns "a picture changed" into "this layer
never landed".

## Fault by fault: story or element

| Fault | Stories affected | Verdict | Change that caused it |
|---|---|---|---|
| A style edit issued before the data is set is discarded, and its `Run` never settles | every story with inline `nodeData`/`edgeData`: all 14 LayeredStyles, EdgeStyles width/opacity/arrow-head/all-arrows/all-lines, ArrowText, AllNodeShapes, BezierEdges, bipartite-matching, connected-components | **element** | `8036cc2d` (style writes became queued runs in the `algorithm-run` category, which `data-add` obsoletes) |
| A `dataSource` load never triggers the first repaint, so nothing the stack says is ever painted | every story that loads over the network: all 11 LabelStyles, NodeStyles colour/shape/size/opacity/wireframe/label, GraphStyles layers, BidirectionalArrows, and all 27 algorithm stories | **element** | `c3561815` (pull-based per-element styling replaced by one pushed repaint, wired only to the queued `data-add`) |
| A label, tooltip or marker is never rebuilt after the first paint | none as the stories stand; every consumer that toggles a label at runtime | **element** | `c3561815` (the `content` role and the mesh-key early return arrived together) |
| `setup` is a dead property on stories whose meta has no `render: renderFn`; no algorithm runs, no story layer, no pre-steps | 27 algorithm stories, 21 Data stories, Graphty, and the `nodeEncode` of max-flow | **story** | `ff12a515` (the `styleTemplate` arg, which was a real element property, was replaced by a convention only `renderFn` understands) |
| 2D ForceAtlas2 lays out in 3D | `layout-2d--force-atlas-2` | **story** | pre-existing; the story never passed `layoutConfig: { dim: 2 }` |
| An unlabelled edge draws no label | ArrowText, and any edge-label story with no explicit text | **neither -- intended** | `ecf4461e`, recorded in the edge-model design |

Where the probes disagreed, the code settles it:

* Probe 2 suspected that the stack was "compiled and bound while the graph was empty and never
  rebound". It is simpler than that: prepared bindings are built by the repaint, and no repaint ever
  ran, so `explain()` truthfully reports no contributions. One defect, not two.
* Probe 1 recorded the ArrowText layers as "suspected" victims of queue obsolescence. Confirmed:
  `StylesApi` enqueues under `algorithm-run`, `data-add` obsoletes that category, and the cancelled
  operation was still pending so nothing rejected it.
* Probe 3 attributed the algorithm stories' `runs = 0` to the element. It is the story: measured live,
  `element.algorithmsOnLoad` is never set at all, because those stories never pass through `renderFn`.
* The one thing still unmeasured is the label rebuild after a first paint, defect three. The code says
  it is dropped; a test will say so in one line.

## The three questions

**Do we have tests for this?** For the model, comprehensively: what a selector resolves, what the
repaint reports it painted, what the painter resolves per element, what a legend and an explanation
say, how a stack survives a dataset boundary. For the chain from the model to the screen, almost
nothing: one file (`style-paint-pixels.test.ts`) covering one channel (`node.color`) on one load path
(inline, queued, data first). For the stories, nothing -- 131 tests that assert only that a story
mounts. For the two orders of operation that broke, nothing: no test adds a layer without awaiting it,
and no test asserts that a graph loaded from a data source is painted by the stack at all.

**Do we need tests for this?** Yes, but not a pixel of every story. Asserting the exact appearance of
131 stories would be a second copy of the product in test form: it would break on every intended
change, and the person reviewing 131 updated expectations is in the same position as the person
approving 131 Chromatic diffs. What is worth testing is a small number of invariants that hold for
every story and every consumer, at the seam where this class of fault lives:

* Whatever a story asks the element for is in the element's layer stack afterwards.
* Every element in a loaded graph has been painted by the stack at least once, whatever load path
  brought it in.
* A style write either commits or rejects, within a bounded time, in every order of operations --
  never neither.
* A channel the style system resolves is a channel the renderer draws. Labels are the case where the
  model and the scene disagreed, so labels get the pixel check.

Four invariants, three of which can be asserted once and applied to every story by a single hook.
That is the right size. A per-story appearance baseline is Chromatic's job, and Chromatic should be
given its token back rather than reimplemented in vitest.

**What test would have caught these?** Concretely, any one of these four, and all four are cheap:

1. A global `afterEach` in the storybook lane that, for every story containing a `graphty-element`,
   waits for the graph to settle -- failing if it never does -- and then asserts that
   `session.paint.styleOf("node", 0)` is not empty, that `session.paint.problems()` is empty, and that
   every layer the story's `setup` declared appears in `session.styles.list()`. This one hook fails on
   all 47 probe findings: on the 30+ network-loaded stories through the empty paint, on the
   inline-data stories through the missing layers, and on the 27 algorithm stories through both.
2. An element test that adds a layer *without awaiting it* and then assigns the data in the same tick,
   waits for the queue, and asserts the layer is in the stack and painted -- plus, separately, that
   the `Run` returned by every write verb settles (resolves or rejects) within a bounded time in all
   three orders. Fails today on the stranded run.
3. An element test that loads through `addDataFromSource` with no layers at all and asserts that the
   element's own default layers painted -- `styleOf("node", 0)` non-empty and no mesh named
   `node-style-graphty-bootstrap-3d` in the scene. One assertion, fails today, covers 50+ stories.
4. A label pixel test: a layer that sets only `node.label` on an already-painted graph must produce a
   `RichTextLabel` on the node and near-black pixels near its projected position. Fails today, and
   catches the content-channel defect that none of the above reach.

A static test is worth adding beside them, because it is the cheapest of all and catches the whole
inert-`setup` class: for every `*.stories.ts` module, if any story declares `setup`, then the meta's
`render` must be `renderFn`. That is an identity comparison on an imported module.

## The tests to write, by lane

Each lane owns whole files. No file appears in two lanes.

### Lane A -- the test infrastructure

Owns:

* `graphty-element/test/helpers/paint-assertions.ts` *(new)* -- the shared assertions every lane
  needs: `assertEveryElementPainted(session)` (no empty `styleOf`, no bootstrap mesh key left in the
  scene); `assertStackContains(session, expectedLayerNames)`; `assertRunSettles(run, ms)`;
  `darkPixelsNear(graph, nodeId, radius)` for label readback (near-black count, the inverse of the
  hue-seeking sampler in `style-paint-pixels.test.ts`); `canvasHash(graph)` for byte comparison
  between stories.
* `graphty-element/.storybook/vitest.setup.ts` -- register a project-level `afterEach` (supported:
  `prepareStory`'s `applyAfterEach` merges project, meta and story hooks) that, for every story with a
  `graphty-element`: waits for `graph-settled` with a timeout that **fails**; asserts
  `session.paint.problems()` is empty; asserts every element has been painted; and asserts that each
  layer the story's `setup` declared is present in `session.styles.list()`. Register it here rather
  than in `preview.ts` so a reader browsing Storybook is not shown assertion errors. It must tolerate
  stories with no element and stories that deliberately draw nothing -- use an opt-out via story
  parameters, not a silent skip.
* `graphty-element/test/browser/story-contract.test.ts` *(new)* -- the static pairing test: import
  every `stories/**/*.stories.ts` module and `renderFn`, and assert that a file whose stories declare
  `setup` has `meta.render === renderFn`. Also assert the inverse for the custom-render files, so
  `CameraControls`, `Screenshot` and `Selection` either honour `setup` or do not declare it.
* `graphty-element/test/browser/first-paint-after-load.test.ts` *(new)* -- the load-path matrix, which
  is the regression test for the fault class rather than for one defect: {inline `nodeData` /
  `addNodes` / `addDataFromSource`} x {no layer / layer before the load, awaited / layer before the
  load, not awaited / layer after the load} -- every cell must end with the stack painted and every
  write verb's run settled.

Lane A's files fail until Lanes B and C land. That is the point: write them first, watch them fail,
and hand the failures over.

### Lane B -- the labels

The element fix, not a story fix. A label that a layer asks for must reach the screen whether or not
the mesh key moved.

Owns:

* `graphty-element/src/Node.ts` -- the early return in `paintFrom` (around line 389) must not skip the
  label, tooltip and marker work. The cheapest correct shape is to split the method: the geometry
  rebuild stays behind the key comparison, and the content channels are applied on every paint, guarded
  by their own comparison against what is currently drawn so an unchanged label is still free.
* `graphty-element/src/Edge.ts` -- the same split in its `paintFrom` (around line 501), which today
  returns without applying anything at all.
* `graphty-element/test/browser/label-paint.test.ts` *(new)* -- a layer that sets only `node.label` on
  an already-painted graph produces a label with the right text and dark pixels on the canvas; the same
  for `edge.label`; changing only `node.labelStyle` changes the drawn glyphs; removing the layer removes
  the label. Use Lane A's `darkPixelsNear`.
* `graphty-element/stories/LabelStyles.stories.ts` -- only if a story needs to change. It should not:
  these stories are correct and are blocked by Lane C's two element defects.

Do not change `test/browser/Edge.label.test.ts` or `Edge.arrowText.test.ts` -- they are leaf tests and
they are fine where they are. Note in the handover that they are misleadingly named.

### Lane C -- the layers

Two element defects, one file each, plus the story-side repair that is in the same blast radius.

Owns:

* `graphty-element/src/managers/OperationQueueManager.ts` -- a cancelled operation must tell its
  caller. Today `applyObsolescenceRules` aborts and deletes a pending operation and nothing rejects
  it; the operation carries `resolve`/`reject` handles (`queueOperationAsync` sets them) and the
  obsolescence path must call `reject` with the abort, so a `ManagedRun` settles. Separately decide
  whether a style write should be obsoleted by a data load at all -- see the next file.
* `graphty-element/src/constants/obsolescence-rules.ts` -- `data-add` obsoletes `algorithm-run`, and
  three unrelated features share that category: algorithm runs, style writes and visibility changes
  (stated at `src/Graph.ts:360-367`). A style edit is a standing instruction, not a stale computation
  over the old data, so it should not be cancelled by a load. Either give style writes their own
  category or narrow the rule. This is the real fix; rejecting the run is the safety net.
* `graphty-element/src/Graph.ts` and `graphty-element/src/managers/DataManager.ts` -- the first repaint
  must happen on the data-source path. The element already solved this problem once for the on-load
  algorithms by hanging them off the `data-added` event instead of the queue category
  (`src/Graph.ts:510-512`); the repaint can hang off the same event, or `DataManager.addDataFromSource`
  can route its chunks through the queue. Prefer whichever keeps one repaint per load rather than one
  per chunk.
* `graphty-element/test/browser/style-layer-ordering.test.ts` *(new)* -- fire-and-forget ordering: add
  a layer without awaiting, set the data, and assert the layer landed and painted; assert every write
  verb's run settles in every order; assert a layer added before a `dataSource` load paints the rows
  that arrive later.
* `graphty-element/stories/algorithms/helpers.ts` -- add `render: renderFn` to `algorithmMetaBase`, so
  `setup.algorithms`, `setup.preSteps` and the reader layers take effect again. 27 stories.
* `graphty-element/stories/Data.stories.ts`, `graphty-element/stories/Graphty.stories.ts`,
  `graphty-element/stories/Layout2D.stories.ts` -- add `render: renderFn` to the first two, and
  `layoutConfig: { dim: 2 }` to the 2D ForceAtlas2 story.

Do not touch `test/browser/style-paint-pixels.test.ts` or `test/browser/style-layers.test.ts` in any
lane. They are correct about what they assert; extending them is how their beforeEach ends up owned by
two agents. New orders of operation go in new files.

### Outside the lanes, for a person

Push the branch, and put `CHROMATIC_PROJECT_TOKEN_ELEMENT` in `.env` so `npm test`'s fourth step can
run locally. Until then the element has no visual regression gate at all, and the tests above are
deliberately not a replacement for one -- they assert that the element did what it was asked, not that
the picture is the right picture.
