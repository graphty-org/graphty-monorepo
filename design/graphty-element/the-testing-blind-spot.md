# The testing blind spot

Why graphty-element's test suite reported green while the rendering was visibly broken, what class
of defect it cannot see, and what to do about it.

Every number and every quotation below was measured or read directly out of the repository at
`6700f057` on branch `feat/element-api-2`, whose last commit to graphty-element is `bd6c0fe6`. The
merge base with `origin/master` is `9f1158e7`; the branch is 41 commits ahead of it.

## The answer, in three sentences

Of the 6,676 tests in graphty-element's four test suites, **three read a pixel, and all three are
about node colour** -- every other assertion about appearance reads a value the element wrote down
about itself, so a style that resolves correctly in the model and never becomes anything on screen
is invisible to the entire suite. The 131 tests whose subject is Storybook stories contain **zero
assertions**: each one mounts a story and passes if nothing throws, which is exactly the signal the
element's own API is deliberately designed to suppress. The suite is a thorough, careful test of the
element's arithmetic and bookkeeping, and its assertion boundary stops one hop short of the renderer
almost everywhere.

The blast radius was far wider than the two story families a person happened to open. The fix now in
flight records that the two underlying defects "between them blanked over fifty stories, and the
whole repository could not see either"
(`graphty-element/test/browser/first-paint-after-load.test.ts`). Better than a third of the story
library was rendering wrong and every suite was green.

## Why this is hard, and not simply carelessness

A `<graphty-element>` renders through Babylon.js into a single WebGL canvas. The DOM shows one
`<canvas>` element with the same attributes no matter what is inside it. There is no accessibility
tree for the picture, no computed style on a node, no text node for a label. Whether a label is
drawn, whether two layers painted two different colours, whether an arrowhead has geometry -- none
of it reaches the DOM.

That removes the two instruments almost every web test suite is built from: query the document, and
assert on component state. What remains is three places a test can stand, and they are not equally
easy to reach:

1. **The model.** Ask the element what it thinks a node looks like. Fast, cheap, runs in Node, and
   it is the element grading its own homework.
2. **The scene graph.** Ask Babylon what objects exist -- is there a label mesh, does the arrow have
   a transform, how many source meshes were minted. Needs a browser or a headless engine. Much
   closer to the truth, and still not the picture.
3. **The frame buffer.** Render and read the pixels back off the GPU. This is the only place that
   can tell you the picture is right, and it is the only one nobody reaches by accident.

Nothing pushes a developer from the first to the third. A model test is where the interesting logic
is, it is where a failure is easiest to diagnose, and writing one feels like covering the feature.
A repository can therefore accumulate thousands of genuinely useful passing tests without a single
one of them looking at the picture -- and that is what happened here. The gap is structural, not
negligent.

## A second blind spot the same size: every style test uses an order the product cannot use

This one is worth stating separately, because it is not about pixels and it would survive every
recommendation in this document that only adds frame reads.

A Lit render function is called synchronously and must return markup. It cannot await anything. So
the only order a story has available is: issue the style edits, set the data, return. `renderFn` in
`stories/helpers.ts` does exactly that, and documents the choice as deliberate.

**Every style test in the package does the opposite.** It sets the data first, then awaits each
style edit. Both halves of that difference independently hide a defect, and the fix now in flight
names them (`test/browser/style-layer-ordering.test.ts`):

```
 * the only order available to it is: issue the style edits, set the data, return. Every existing
 * test of this system does the opposite -- it loads the data first and then awaits each edit --
 * and both of those choices independently hide a defect. Awaiting hides a run that is discarded
 * before it starts; loading first hides a load path that is never painted at all. So the orders
 * this file uses are not exotic: they are the orders the product's own stories use, and they were
 * the only orders nothing covered.
```

One detail makes this systemic rather than a missed case.
`test/browser/property-order-independence.test.ts` exercises exactly 34 variants of operation order
-- and every one of them awaits every step. The suite has a whole file devoted to order
independence, and the one order the product itself uses is not among its variants.

That is the second structural reason 6,676 tests were green. It is not "nobody looked at the
picture" -- it is "every test set the scene up in a way no consumer can". Two consequences worth
carrying forward:

- **A test helper that is more capable than the product is a liability.**
  `test/helpers/testSetup.ts:168` exports `async function addStyleLayer(graph, spec)`, and
  `styleEveryNode` at `:178` awaits it. A story cannot await, so the shared helper every test reaches
  for quietly exercises a path no consumer travels.
- **Fire-and-forget needs an owner.** The element's contract is that a write verb never throws and
  reports its refusal on the run it hands back. Correct for a click handler. But a run that is
  discarded before it starts, and therefore never settles at all, is worse than a refusal: nothing
  is reported anywhere and a consumer awaiting it waits forever. "Every write verb's run reaches an
  answer" is an invariant nothing in the shipped suite asserted.

## Do we have tests for this?

Six distinct kinds of test exist. They are worth separating because three of them look like
appearance coverage and are not.

### 1. Model tests -- the great majority

These resolve a style and assert what the style system concluded. They are correct and they are
valuable. The single most relevant one in the package is
`graphty-element/test/managers/style-painter.test.ts:280`:

```ts
it("switches a label on when a layer paints its words", async () => {
    const held = harness();
    const spec: LayerSpec = {
        name: "labels",
        target: "node",
        selector: { match: "everything" },
        set: { "node.label": "hello" },
    };
    await held.styles.add(spec);
    await held.paintAll();

    const paint = held.painter.nodePaint(0);

    assert.strictEqual(paint?.style.label?.text, "hello");
    assert.isTrue(paint?.style.label?.enabled, "a label nobody switched on is never drawn");
});
```

A test named for the exact broken behaviour, green, running in one millisecond, and stopping at
the resolved paint record. Everything to the left of `Node.paintFrom`'s `if (o.label?.enabled)`
gate (`graphty-element/src/Node.ts:234` and `:506`) is tested. Everything to the right of it, over
a real graph, is not.

The layer system is covered the same way. `graphty-element/test/browser/style-layers.test.ts` is
629 lines and 27 tests over a real graph in a real browser, and its oracle is the repaint's own
report of how many elements it visited (`:119`):

```ts
/**
 * How much the repaint that the call under test triggered actually visited.
 */
function painted(): { nodes: number; edges: number } {
```

That number catches a selector that quietly matched the whole graph or none of it, which is what it
was written for. It cannot distinguish a layer stack that paints correctly from one that walks the
right elements and changes nothing on screen -- both produce the same counts. The file says as much
in its own header, in a disclaimer that is no longer true (`:11`):

```
 * WHAT IS ASSERTED, AND WHAT IS DELIBERATELY NOT. The renderer does not read this system yet:
 * `Node.ts`, `Edge.ts` and `Styles.ts` still fetch a style through the old static table. So
 * nothing here asserts a mesh, a material or a pixel
```

The renderer does read this system now. The disclaimer survives in the file that is the natural
home for a layered-style test, and the file still honours it.

### 2. Scene-graph and geometry tests -- the strongest non-pixel class, and underused

A handful of tests assert real Babylon geometry against independently computed expectations. The
best examples are `test/browser/edge-arrowhead-position.test.ts` (17 tests) and
`edge-arrowhead-orientation.test.ts` (9 tests), which compute where an arrowhead should be and
assert `Vector3.Distance(expectedPos, edge.arrowMesh.position)` is under tolerance; and
`test/node-shape-edge-reattach.test.ts`, which asserts an arrowhead endpoint **moved** when only a
node's shape changed and returned to within 0.001 when it changed back.

This is the pattern the rest of the suite is missing. It needs no pixels, it runs on a headless
engine, and it fails for real defects. There are fewer than thirty such tests in a suite of 6,676.

### 3. Frame-buffer tests -- there are three

Only two files in the package read real pixels, and between them they hold three tests:

| Test | What it proves |
|---|---|
| `test/browser/style-paint-pixels.test.ts:251` "draws the element's own default colour, and says it is drawing it" | The element's base-layer node colour reaches the canvas |
| `test/browser/style-paint-pixels.test.ts:269` "draws an algorithm's ramp, node by node, in the colours it reports" | An algorithm's colour encoding reaches the canvas at two nodes |
| `test/browser/node-instance-color.test.ts:151` "two nodes of ONE source mesh are drawn in two colours" | Babylon can draw one source mesh in two per-instance colours. Two meshes placed by hand; no graph |

`style-paint-pixels.test.ts` is good work and it explains itself well (`:11`):

```
 * So there is a join nothing covered: a whole chain from a style layer, through the columnar
 * repaint, through the painter, through the mesh cache and the instanced colour buffer, to the
 * frame. Every link had a test and the chain had none, and a chain like that can be right at
 * every link and still draw the wrong picture
```

It closed that chain for one channel out of twenty-one. Three limits keep it from reaching the rest,
and two of them are deliberate:

- **It throws grey away.** Its sampler skips any pixel whose strongest and weakest channels differ
  by less than 24, with the comment "Anything below this is grey, which is the background, the edges
  and a specular highlight". So it cannot see an edge at all, and it cannot see a label: the default
  label is black text on whitesmoke, which is pure grey by that measure.
- **Its comparison is hue-only.** Channels are normalised so the brightest is 255, so a lit sphere
  reads the same at any brightness. Correct for colour, and it erases size, shape and opacity: a box
  and a sphere of the same colour normalise identically.
- **Its oracle is the element's own model.** It compares the canvas against
  `session.styles.explain({ node: id }).merged["node.color"]`. That catches a rendering fault. It
  cannot catch a fault upstream of the model: if a layer resolves to nothing, `explain()` reports the
  base colour, the canvas shows the base colour, the two agree, and the test passes. Its one guard
  against that -- `assert.strictEqual(new Set(checked).size, 2, "the busiest node and the quietest
  are not painted alike")` -- is built from the model's values, not the drawn pixels, so it detects a
  collapsed model rather than a collapsed picture.

### 4. Story tests -- 131 of them, with no assertions at all

The `storybook` project is 131 tests across 29 files. That is exactly one test per story: there are
131 `export const` story declarations across 30 story files, and the one file with none
(`stories/Logging.stories.ts`) produces no tests.

The tests are machine-generated by the Storybook Vitest addon, and the whole body is this
(`node_modules/@storybook/addon-vitest/dist/vitest-plugin/test-utils.mjs`, line-broken by hand):

```js
testStory = (exportName, story, meta, skipTags) => async context => {
    ...
    await setViewport(composedStory.parameters, composedStory.globals),
    await composedStory.run(),
    _task.meta.reports = composedStory.reporting.reports;
};
```

Compose the story, mount it, run its play function. Nothing is compared to anything. And the stories
supply no assertions of their own:

```
$ grep -rn "expect(\|assert\.\|assert(" stories/ --include=*.ts | wc -l
0
```

So a story test fails only if rendering throws. Running the two story files a person found broken:

```
$ npx vitest run --project=storybook stories/LabelStyles.stories.ts stories/LayeredStyles.stories.ts
EXIT=0
 Test Files  2 passed (2)
      Tests  25 passed (25)
```

Twenty-five green tests over stories that are visibly wrong.

Three further facts make that worse rather than merely weak:

**The one implicit assertion is cancelled by the element's API design.** A story test does fail on a
throw. But the story harness fires every style layer without awaiting it
(`stories/helpers.ts:431`):

```ts
for (const layer of layers) {
    // Fired and forgotten: a style edit is a queued run that reports its own refusal, and a
    // render function cannot await one.
    void element.session.styles.add(layer);
}
```

and the element guarantees an unawaited failure can never surface (`src/session/runs/Run.ts:294`):

```ts
/**
 * Build a deferred whose promise can never become an unhandled rejection.
 *
 * The no-op handler attached here is what makes a fire-and-forget run safe: the promise is
 * already "handled" the moment it exists, so a failure nobody awaited stays inside the run
 * object, while a caller that does await still sees the rejection.
 */
```

A refusal inside `styles.add` is raised inside the run's `execute` (`src/session/styles/StylesApi.ts`
runs `plan()` at `:1199`, inside the `execute` opened at `:1186`), so it lands in the run object and
nowhere else. Every layer in all fourteen layered-style stories could be refused and all fourteen
tests would pass. Both decisions are individually right -- a click handler must not blow up the page,
and a Lit render function cannot await -- and nobody decided who checks the refusal instead.

**Ninety-nine of the 131 stories have a play function, and 63 of those plays are the same bare
wait, which cannot fail.** All eleven plays in `stories/LabelStyles.stories.ts` are these three
lines:

```ts
play: async ({ canvasElement }) => {
    await waitForGraphSettled(canvasElement);
},
```

`waitForGraphSettled` (`stories/helpers.ts:154`) returns early if there is no element, and both of
its timeout branches call `resolve()` with a comment reading "For static layouts, this is not an
error - they may have already settled". The data wait above it does the same on five seconds:
"Data may already be loaded (e.g., inline data) or failed". A story whose element never appeared, or
whose data never loaded, passes.

**Thirty-two stories do not even wait.** All fourteen `Styles/Layered` stories and all nine
`EdgeStyles` stories have no play function at all, plus nine singletons (`ArrowText`, `BezierEdges`,
`AllNodeShapes`, `PerformanceTest`, `Graphty`, `AiControl`, `BidirectionalArrows`, `ViewMode`, and one
of the 21 `Data` stories). The global wait that looks like it covers them is dead code.
`.storybook/preview.ts:119` puts it inside `parameters`:

```ts
// Add play function to all stories to wait for graph settling
play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await waitForGraphSettled({ canvasElement });
},
```

Storybook resolves the play function from the story or its meta only. In the installed version
(storybook 9.1.20), `prepareStory` does `T = r?.play ?? e?.play` where `r` is the story's annotations
and `e` the meta's; the project-level annotations are not consulted. And nothing in storybook or the
Vitest addon reads `parameters.play` -- grepping both packages' distributions for it returns nothing.
The wait has never run for any story.

The consequence is measurable: the fourteen `Styles/Layered` tests complete in 2.2 seconds between
them. A Babylon scene cannot mount, load data, run a layout, paint layers and present a frame in
150 milliseconds. There is no frame for those tests to be wrong about.

### 5. The suite that looks like label coverage and is not

The `default` project is 4,837 tests across 235 files. **542 of them are in
`test/mesh-testing/`, and 522 of those import no product code at all.** Seven of the directory's
eight test files import only `./mesh-factory` or `./tracking-mocks`, which are owned by the tests.
`test/mesh-testing/mesh-factory.ts` says so in its header:

```
 * Creates tracking mocks that simulate the actual mesh creation from /src/meshes/
 * to provide 100% test coverage of NodeMesh, EdgeMesh, and RichTextLabel classes.
```

104 of those 522 are label tests: `label-golden-masters.test.ts` (67) and
`label-advanced-golden-masters.test.ts` (37). The shape is the mock writing its own input into
metadata (`mesh-factory.ts:904`):

```ts
mesh.setMetadata("text", style.text !== undefined ? style.text : "");
```

and the test reading it back (`label-golden-masters.test.ts:28`):

```ts
assert.equal(result.mesh.metadata.text, "Hello World");
assert.equal(result.mesh.metadata.font, "Verdana");
assert.equal(result.mesh.metadata.fontSize, 48);
```

`src/meshes/RichTextLabel.ts` is never loaded by either file. Worse, the mock's vocabulary is the
one the 2.0 change deleted -- `textColor` at `:908`, `backgroundPadding` at `:915`, `cornerRadius`
at `:916` -- so 104 green tests describe a label feature set the product no longer has, through an
API it no longer exposes. They run in the `default` project, which is the only project the pre-push
hook executes. They are the single biggest reason "labels are covered" felt true.

A second file does something similar under a name a person would grep for.
`test/browser/Edge.label.test.ts` is titled "Regression tests for Edge label functionality" and has
fifteen tests, ten of which call nothing in `src/`. The one named after the exact defect that has now
recurred (`:324`):

```ts
test("edge label requires enabled: true to be created", () => {
    // This tests the bug where labels weren't showing because enabled wasn't set
    const styleWithEnabled: EdgeStyleConfig = { label: { enabled: true, text: "Visible Label" }, ... };
    const styleWithoutEnabled: EdgeStyleConfig = { label: { text: "Invisible Label" }, ... };
    // Edge.ts checks style.label?.enabled before creating the label
    assert.isTrue(styleWithEnabled.label?.enabled);
    assert.isUndefined(styleWithoutEnabled.label?.enabled);
});
```

It names the mechanism in a comment and then asserts a property of the object literal it just typed.
It cannot fail for any change to any source file -- and it occupies the filename a reader checks
when asking whether edge labels are tested.

### 6. The graphty app's suite, which is correctly unable to help

The app has 147 test files, and **none of them imports the element runtime**: grepping the app's
tests for `from "@graphty/graphty-element"` returns nothing.
`graphty/src/components/Graphty.test.tsx:7` replaces the package with `{ default: {} }` and
substitutes a `MockGraphtyElement extends HTMLElement`. The shell's tests run against
`graphty/src/test/fakeSession.ts`, which states its own boundary:

```
 * What it does NOT model is anything about drawing: there is no repaint, no canvas and no
 * element. A board that needs those is a browser board against the real element.
```

That is architecturally right -- the app is HTML around the element and should not be testing the
element. It does mean roughly a quarter of the headline test count could not have contributed to the
signal on a rendering change, and the honest element figure is 6,676, not 8,600.

## Do we need tests for this?

Not for everything, and screenshot-comparing every story is not the answer. It is worth saying
plainly why, because it is the obvious idea and it is a trap:

- **It fails on legitimate change.** This change set deliberately altered nearly every picture in
  the library and deleted nineteen stories. A gate that fires on any visual difference produces
  hundreds of diffs that all need a human decision, and that is exactly the situation in which a
  real regression gets waved through.
- **It is slow and it is the wrong shape for a fast loop.** The element's Chromatic job took
  6m16s on the last CI run that did one (run 35666281224, master `9dd4d388`, 2026-09-21). Nobody
  runs that while editing a shader.
- **It tells you a picture changed, not that a picture is wrong.** A snapshot diff cannot distinguish
  "the labels vanished" from "the labels were redesigned". Only a person can, and only if they are
  paying attention to that row.

The defensible line is between three kinds of question:

**Worth a test, always: does this capability produce anything at all?** "A layer wrote
`node.label`, so there is a label object on the node and a mesh in the scene." "Two layers with
disjoint selectors produced two different colours." "Removing the layer removed the label." These
are invariants, not pictures. They have no baseline to accept, they do not change when a designer
picks a new palette, and they are the assertions both of the reported faults would have failed. This
is the tier the suite is missing and it is cheap.

**Worth a test for a handful of channels: is the value right?** Node colour already has this and it
was worth building. Label text is worth it, because "present but blank" and "present with the wrong
words" are both real failure modes that a presence check misses. Beyond those, the value-level
question is better answered in the model, where it already is.

**Not worth a test: is the picture pixel-correct?** Glyph shapes, antialiasing, specular highlights,
exactly where a billboard sits. That is Chromatic's job and a reviewer's judgement, and trying to
assert it in code produces the brittleness people mean when they say visual tests are not worth it.

There is one more category that needs naming, because it is currently counted as coverage and is
worse than nothing: **a test that asserts a mock the test wrote, or an object literal the test
typed.** The 522 mock tests and the ten tautological edge-label tests are not weak coverage of the
renderer, they are coverage of the test directory. They inflate the number people trust and they
occupy the filenames people search.

## What would have caught these two

Both faults are in the same place: a channel the model resolves correctly and the renderer builds
nothing for.

**A presence-and-change check on the label channel, over a real graph.** Load two nodes, render,
count the near-black pixels in a square around each node's projected position, add a layer that sets
`node.label`, render again, and assert the count went from near zero to hundreds -- plus that the
node now holds a label object with a mesh. Taking the measurement twice in the same rectangle of the
same frame is what makes it honest: a count alone could be satisfied by a shadow or a dark corner,
a count that was zero and is now thousands cannot be. This would have failed within seconds of the
bug landing, and it also covers `edge.label`, `node.labelStyle`, and layer removal.

This recommendation is no longer hypothetical. **Five uncommitted files of exactly these shapes are
in the working tree right now**, written while fixing the bug:

| File | Size | What it asserts |
|---|---|---|
| `test/helpers/paint-assertions.ts` | 429 lines, no tests | The shared assertions: has every element been painted by the stack at all, did a layer actually paint, did a write verb's run settle |
| `test/browser/label-paint.test.ts` | 417 lines, 4 tests | Label words, edge-label words, label typography and label removal, read off real frames |
| `test/browser/style-layer-ordering.test.ts` | 371 lines, 11 tests | A layer added in the order a render function must use survives and paints |
| `test/browser/first-paint-after-load.test.ts` | 231 lines, 1 matrix | Three ways a graph arrives, times four moments a layer can be asked for |
| `test/browser/story-contract.test.ts` | 185 lines, 3 tests | That `setup` only works under `renderFn`, the pairing nothing enforced |

`label-paint.test.ts` is the template for the frame-reading half. It counts near-black pixels in a
90-pixel neighbourhood with a threshold of 70 per channel, takes every measurement before and after
the edit, and asserts the before-reading too, so a test cannot quietly pass because the thing it was
looking for was already there. Its header records why the existing pixel test could not have found
this:

```
 * `style-paint-pixels.test.ts` samples the MOST COLOURFUL pixel near a node and skips anything
 * whose channel spread is under 24, because grey is the background, the edges and a specular
 * highlight. The default label is black text on whitesmoke -- pure grey by that measure -- so the
 * one instrument in the repository that reads pixels is calibrated to ignore precisely what a
 * label is.
```

`paint-assertions.ts` is the more important of the two, because it is reusable and it needs no
pixels. Its own header states the oracle:

```
 * - has every element been painted by the stack AT ALL, whichever load path brought it in;
```

That single question -- asked of a graph loaded every way the element supports -- is what turns a
one-off bug fix into a floor under the whole rendering surface. All five files must be committed, and
`paint-assertions.ts` should become the thing new tests import rather than a helper for these four.

**A distinctness check across a story family, which needs no reference image.** "The layered-style
stories all render identically to each other" is detectable without knowing what any single one
should look like. Build the element the way a story builds it, take a cheap fingerprint of the result
-- per node: resolved colour, mesh key, label text; per edge: the same -- and assert that no two
stories within one family share a fingerprint. Nothing to accept, nothing to maintain when a colour
changes, and it catches the entire reported symptom for every family at once. The differential idiom
already exists in the suite (`assert.notStrictEqual(after?.meshKey, before?.meshKey)` at
`test/managers/style-painter.test.ts:277`), just never across stories.

**Making the story harness able to fail.** Collect the runs that `applyStyleLayers` currently
discards, and await them. `stories/helpers.ts:433` is one line; `renderFn` returns the element, so
the runs can be recorded on it and awaited from a meta-level play function that asserts none was
refused. This adds no test files: the addon's generated tests already fail on a rejection, so one
edit turns fourteen silent layered-style tests into fourteen tests that fail when a layer is refused.
It is the cheapest change with the largest blast radius, and it fixes the same blindness for every
story written from now on.

## The blind-spot map

Twenty-one of the element's twenty-two style channels are declared renderable -- `node.marker` is
typed `never` because nothing is drawn for it. For each capability below: would any test fail if it
silently stopped appearing on screen?

The census behind the middle column: 89 committed test files build a real `Graph` (via `new Graph(`
or `createTestGraph`), and this is how many of them write each channel.

**This is the committed tree -- the state the regression shipped in.** The five uncommitted files
described above change four rows once they land: `node.label`, `edge.label` and `node.labelStyle`
gain frame coverage from `label-paint.test.ts`, and "two layer stacks producing two pictures" gains
`style-layer-ordering.test.ts`. Everything else in the table is still true after they land.

| Capability | Would a test fail if it stopped rendering? | Real-graph test files writing it | Stories | Where it stops |
|---|---|---|---|---|
| node.color, base layer | **Yes -- pixels** | 16 | 10 | `style-paint-pixels.test.ts:251` |
| node.color, algorithm ramp | **Yes -- pixels** | 16 | 10 | `style-paint-pixels.test.ts:269`, two nodes only |
| Per-instance colour on a shared mesh | **Yes -- pixels**, but not of a graph | n/a | n/a | `node-instance-color.test.ts:151`, hand-placed meshes |
| Arrowhead position and orientation | **Yes -- geometry** | 2 | 6 | Real `Vector3.Distance` against computed expectations (26 tests) |
| Node shape reattaching its edges | **Yes -- geometry** | 5 | 5 | `node-shape-edge-reattach.test.ts`, asserts a real move |
| node.size | No | 6 | 4 | Resolved style: `assert.strictEqual(after?.style.shape?.size, 9)` |
| node.shape as drawn | No | 5 | 5 | Mesh key identity, and `assert.isNotNull(mesh)` per shape name |
| node.opacity | No | 1 | 2 | Resolved style; the closest to a drawn check anywhere is `assert.closeTo(mesh.visibility, 0.5, 0.01)` in `test/Edge.bezier.test.ts:161` |
| edge.color | No | 5 | 9 | Resolved style. No pixel test can see an edge -- the sampler discards grey |
| edge.width | No | 3 | 3 | Resolved style |
| edge.style (9 dash patterns) | No | 1 | 2 | `assert.strictEqual(mesh.metadata.is2D, true)` -- a tag the code set on itself |
| edge.opacity | No | 1 | 2 | Resolved style |
| **node.label** | **No** | **0** | 6 | Resolved paint record only (`style-painter.test.ts:293`) |
| **node.labelStyle** | **No** | **0** | 4 | Channel descriptor table only |
| **edge.label** | **No** | **0** | 2 | Only the negative is asserted (`test/unit/edge-identity.test.ts:233`) |
| **edge.labelStyle** | **No** | **0** | 2 | Channel descriptor table only |
| **node.outline** | **No** | **0** | **0** | Glow-layer membership, from a hand-built config, never from the channel |
| **node.glow** | **No** | **0** | **0** | As above |
| **node.wireframe** | **No** | **0** | 2 | Resolved style |
| **node.flat** | **No** | **0** | **0** | Nothing |
| **node.tooltip** | **No** | **0** | **0** | Nothing |
| **edge.curvature** | **No** | **0** | 1 | `assert.exists(mesh)`. A bezier that drew a straight line passes |
| **edge.arrowTail** | **No** | **0** | 2 | Nothing |
| **edge.animationSpeed** | **No** | **0** | **0** | Nothing |
| **edge.tooltip** | **No** | **0** | **0** | Nothing |
| Layer ordering (upper layer wins) | No | -- | 14 | Resolved value in a test-double repaint engine |
| Two layer stacks producing two pictures | **No** | -- | 14 | Nothing compares one rendering to another, anywhere |
| Selection highlighting | No | -- | 4 | `assert.equal(selected?.id, "node1")`. Nothing asserts it looks different |
| Layout positions reaching the meshes | No | -- | -- | The `ElementPositions` array is asserted thoroughly; no test asserts the positions reached the node meshes |
| Background colour and skybox | No | -- | -- | A config read. The pixel sampler classifies background as grey and skips it |
| 2D vs 3D mode | No | -- | -- | Z flattening and `metadata.is2D` tags |
| Camera framing, presets, zoomToFit | No | -- | -- | Camera parameters and bounding-box arithmetic |
| Screenshot / video image content | **Impossible in three of the four projects** | -- | 2 | `test/setup.ts:9` stubs `CreateScreenshotAsync` to a fixed 1x1 white PNG for the `default`, `browser` and `interactions` projects. The 13 files in `test/browser/screenshot/` assert blob type and metadata |
| Any story rendering as intended | **No** | -- | 131 | 131 generated tests with zero assertions |
| The suite not silently shrinking | **No** | -- | -- | One test per story, so deleting stories reduces the count with everything still green |

Read the map as a prediction. **Thirteen renderable channels are written by no test that builds a
real graph**, and six of those have no story either, so not even a working visual-diff service could
ever see them. Two of those thirteen have just broken. The next regression is most likely in the
same list.

## Chromatic, honestly

Chromatic is the designed catch, it is genuinely configured as a blocking gate, and it has not run
for this work at all.

**It is a real gate.** Five Chromatic jobs exist in `.github/workflows/ci.yml` (element at `:595`,
app, compact-mantine, algorithms, layout). The element job runs
`chromaui/action@latest` with `exitZeroOnChanges: false` (`:628`), so any unaccepted visual change
fails the job -- and `All Checks Pass` at `:836` lists `chromatic-element` among its `needs` with an
explicit failure branch at `:846`. CI triggers on push to master, on every pull request, and on
manual dispatch.

**It has not run, because the branch has never been pushed.** `git ls-remote --heads origin` lists
no `feat/element-api-2`. The last Chromatic run of any kind was on master: run 35666281224, head
`9dd4d388`, where `Chromatic (graphty-element)` passed in 6m16s. So the baseline it holds is the
pre-change picture, and no build has ever been asked about the 2.0 work -- forty-one commits and two
days of work with zero visual feedback obtainable at any point.

There was also no element or app token on this machine: `.env` held only the algorithms,
compact-mantine and layout tokens. And the local script was
`npx chromatic --exit-zero-on-changes` (`graphty-element/package.json`), so even with a token the
local path could never fail. Both halves are fixed: `.env` now carries the element token as well
(the app's is still missing), and every Chromatic script in the package goes through
`tools/chromatic.sh`, which exits non-zero when snapshots changed, exactly as CI does.

**Which of the two faults would it have caught?** Both, and loudly. Chromatic compares by story id,
and the ids survived this change set: both `title:` values are unchanged (`Styles/Label`,
`Styles/Layered`), all fourteen `LayeredStyles` export names are byte-identical to the merge base,
and eleven of the twenty-eight `LabelStyles` names survive. So all twenty-five broken stories would
diff against an existing accepted baseline. Text disappearing from every node in a graph, and red
plus blue collapsing to a single blue, are near-maximal per-pixel deltas -- far above even the
loosest tolerance in play. Four stories in `LabelStyles.stories.ts` raise `diffThreshold` to 0.3,
0.25, 0.25 and 0.25 against a default of 0.063, and that still would not hide it.

**Which would it have missed anyway?** Three things, and they are the reason "turn Chromatic on" is
not a complete answer.

1. **A story with no baseline.** One story is new in this change set: `ArrowHead` under
   `Styles/Edge`. A new story id has nothing to differ from -- Chromatic presents it as a fresh
   snapshot to accept. If it were born broken, accepting it is the only option offered, and from then
   on the broken picture *is* the baseline. It sits in `stories/EdgeStyles.stories.ts`, all nine of
   whose stories have no play function, so no test asserts anything about it either.
2. **A channel no story exercises.** `node.outline`, `node.glow`, `node.flat`, `node.tooltip`,
   `edge.animationSpeed` and `edge.tooltip` appear in no story in the package. A snapshot service
   cannot photograph what is never put on screen.
3. **A large change set.** This one deletes nineteen stories (150 at the merge base, 131 now:
   `LabelStyles` 28 to 11, `EdgeStyles` 11 to 9) and rewrites the args of nearly every survivor from
   the removed style template to the new `setup` form. `exitZeroOnChanges: false` means the reviewer
   is handed a wall of legitimate diffs and must accept or deny each. "The labels are gone" is one
   row among hundreds, and bulk-accepting writes it into the baseline permanently. This is not
   hypothetical drift -- the raised thresholds above, and commits titled `05fa69de "test: fix flaky
   chromatic tests"` and `4b2bd026 "test: passing chromatic builds (build number 149)"`, are its
   fingerprints.

Chromatic is a **change detector reviewed by a human**, and its reliability degrades exactly in
proportion to the size of the change. The assertions recommended below are the part that does not
degrade. They are the complement to Chromatic, not a substitute for it.

One more configuration hazard, now fixed: `graphty-element/chromatic.config.json` set
`"onlyChanged": true` and `"zip": true`, but the CI action is given no `workingDir`, so the CLI
ran from the repository root where no `chromatic.config.json` exists. The file was live locally
and dead in CI -- TurboSnap on for anyone who typed `npx chromatic` inside the package, off
everywhere else. Every behavioural setting has since been removed from the per-package configs
(the app, algorithms and layout ones deleted outright, the element's reduced to the Chromatic
project id), and the `chromatic`, `test:visual` and `test:visual:debug` scripts in
graphty-element and in the app now go through `tools/chromatic.sh`, which reproduces the CI
invocation from the repository root. The repo also pinned `chromatic: ^13.1.2` while CI ran CLI
v18 through `chromaui/action@latest`; the dependency is now `^18.9.5`, the same major.

## How it got in

**Rendering behaviour changed repeatedly, and tests did change with it -- they were the wrong kind
of test.** Eight commits on this branch touch `src/Node.ts`, `src/Edge.ts`, `src/meshes/`,
`src/managers/StylePainter.ts`, `src/managers/UpdateManager.ts`, `src/managers/RenderManager.ts` or
`src/session/styles/`. Every one of them also changed test files. Only two touched a test that reads
a frame, and in both cases the test was the one being created:

| Commit | Subject | Rendering source files | Test files | Story files | Frame test |
|---|---|---|---|---|---|
| `a4f8d2c0` | move graph data off the render objects into a store | 2 | 10 | 0 | -- |
| `82af6b59` | give selection real sets and add a visibility model | 1 | 6 | 0 | -- |
| `8036cc2d` | replace evaluated style expressions with declarative layers | 17 | 13 | 0 | -- |
| `c3561815` | derive an algorithm's styling from what its result declares | 1 | 2 | 5 | -- |
| `2d9648c2` | scope what an algorithm's layer paints, and register palettes | 7 | 4 | 0 | added `style-paint-pixels.test.ts` |
| `ecf4461e` | name edge endpoints source and target, and give every edge its own id | 1 | 7 | 0 | -- |
| `5f444b73` | give the layouts edge weights and keep a reader's pins | 1 | 15 | 0 | -- |
| `e108753a` | settle the custom element's attributes and events | 3 | 7 | 0 | -- |

`35c48108` ("delete the old style system", 83 files, +5,194/-3,280) added the other frame test,
`node-instance-color.test.ts`.

**The developer knew a picture could break, said so, and the response was two node-colour tests.**
`c3561815`'s breaking-change note reads "the pictures seven algorithms draw change, and dimming what
an algorithm did not select no longer ships with the algorithm", and it added two tests, both of
which assert objects. `35c48108`'s message records the blindness happening in real time:

> "A highlight layer was silently refusing itself for five algorithms. ... The refusal was fire and
> forget, so it surfaced as a bare `undefined` on standard error **inside a passing test run**, and
> the affected algorithms drew nothing."
>
> "**Three stories were drawing nothing** for a second reason: a reader layer written in the old
> shape hands the whole graph back to the old painter, so the algorithm's own layer painted nothing
> at all. Measured on a real scene, three distinct colours had become one, and that one was no
> colour."

Same fault class, same discovery method -- somebody looked -- and the fix was the two pixel tests,
both about node colour, plus nothing that walks a story.

**The edge-label change had no test to fail.** `ecf4461e` removed a fallback in
`src/Edge.ts:1274`:

```
     private extractLabelText(labelConfig?: Record<string, unknown>): string {
         if (!labelConfig) {
-            return this.id;
+            return "";
         }
```

`git log --all -S "extractLabelText" -- graphty-element/test/` returns nothing: no test in the
history of this repository has ever named that method. The commit did assert the new negative
(`test/unit/edge-identity.test.ts:233`, "draws no label on an edge nothing named"), which is the
right instinct. Nothing anywhere asserts the positive -- that an edge somebody *did* name draws that
name.

**Twenty-six story files were rewritten under a commit typed `test`.** `ff12a515` ("test: drive a
dummy extension through everything a built-in does") changed 26 story files and 37 test files,
porting every story off the removed `styleTemplate` API onto `setup`/`storySetup({ layers })`. For
`LayeredStyles.stories.ts` that is a wholesale respelling of all fourteen stories' rendering
instructions -- a file with zero play functions before and zero after. Fourteen stories had their
entire meaning rewritten with nothing checking the result, in a commit whose message does not mention
stories.

**The history cannot answer "did a test fail and get adjusted", because no commit was ever tested on
its own.** `tools/commit-changes.sh` lands a finished working tree as a sequence of conventional
commits, validating once over the whole tree before staging anything. Consistent with that, the
commits arrive in batches sharing a single timestamp. There was never a moment at which commit N's
tests ran against commit N's source.

### Which projects actually run, and when

This is the part that turns a good test into no test.

| Project | Tests | Pre-push hook | CI |
|---|---|---|---|
| `default` | 4,837 in 235 files | **Yes** | `graphty-element-default` |
| `bench` | timing only | No | same shard |
| `browser` (holds all 3 frame tests) | 1,481 in 116 files | **No** | `graphty-element-browser-1..5` |
| `interactions` | 227 in 19 files | **No** | same 5 shards |
| `storybook` | 131 in 29 files | **No** | `graphty-element-storybook-1..4` |
| `llm-regression` | -- | **No** | **no shard at all** |

`tools/prepush.sh:98` is explicit about it:

```bash
# graphty-element - run only default project (skip browser/storybook/interactions/llm)
(cd graphty-element && npm run test:shard:default:run) || { FAILED=1; TESTS_FAILED=1; }
```

So the package's entire appearance coverage is CI-only, and the branch was never pushed, so CI-only
meant never. It is worse than that in two ways:

**The local `npm test` cannot fail on a test.** From `graphty-element/package.json`:

```
"test": "npm run test:shards:parallel && npm run test:visual",
"test:shards:parallel": "npm run test:shard:default:run & npm run test:shard:browser:run & npm run test:shard:storybook:run & wait",
```

Bash's `wait` with no operand returns zero regardless of what the jobs did. Verified:
`bash -c 'exit 7 & wait; echo $?'` prints `0`. The only stage that can set a non-zero exit is
`npx chromatic` after the `&&`, which cannot authenticate here. Anyone reading a verdict out of that
command learned nothing about the tests. CI is unaffected -- it invokes each project directly per
shard.

**Four of the five projects could not be run locally at all until recently.** `e8d29dae`
("test(graphty-element): repair the browser test projects, which never ran locally"), which landed
*inside* this change set, reports: "Four vitest projects printed their banner and then produced no
output, forever. They had never once passed on a development machine, while passing in CI the whole
time." The pixel test added in `35c48108` was written into a project that could not be run locally
and has never been run by CI.

### Two dead tests worth knowing about

`test/browser/dash-spacing-measurement.test.ts` does exactly the right thing -- navigates to a real
Storybook story, screenshots the canvas, decodes the PNG with pngjs, and asserts a dash-to-gap
ratio. **It runs in no project.** The `default` project excludes `test/browser/**/*.test.ts` and the
`browser` project excludes this file by name ("Tests using Node.js-only libraries (pngjs)").
Confirmed by enumeration: `vitest list` for each of the six projects returns zero matches for it. It
has also rotted -- it targets story id `styles-edge-patterns--dash`, and the story file that declared
that title was deleted in `2d07b220` on 2025-11-28.

`test/helpers/testSetup.ts:213` patches a method that does not exist:

```ts
const graphWithEngine = graph as Graph & { createEngine: () => unknown; engine: unknown };
const originalCreateEngine = graphWithEngine.createEngine;
graphWithEngine.createEngine = function () {
    this.engine = new NullEngine();
    return this.engine;
};
```

`grep -rni "createengine" src/` returns nothing. The engine is built in `RenderManager`'s constructor
(`src/managers/RenderManager.ts:64`, `new Engine(this.canvas, true, { preserveDrawingBuffer: true })`),
called from the `Graph` constructor at `src/Graph.ts:279` -- before `graph.init()`, and before this
code can patch anything. The `NullEngine` is never constructed. This cuts in the useful direction:
47 test files call `createTestGraph`, and every one of them is already running a real WebGL engine
with `preserveDrawingBuffer: true`, the exact flag `readPixels` needs. The capability to read a frame
is already present and paid for in 47 files and used in two. The comment telling every future reader
those tests are headless is what stops anyone from noticing.

## The recommendation

In priority order. Each entry says what it catches, what it costs to build, what it costs per CI run,
and how it fails.

### Do now

**1. Make the story harness able to fail, by awaiting what it fires.**
`stories/helpers.ts:433` currently does `void element.session.styles.add(layer)`. Record each
returned run on the element (an array property, or a module-level `WeakMap` keyed by element --
`renderFn` returns the element, so a play function can find it), and add a meta-level `play` in each
story file that awaits them and asserts none was refused.
*Catches:* every story whose layers the element rejects -- silently, today, for the reader and for
the test. That is the class the layered-style fault falls into.
*Build cost:* one function plus a one-line addition to the 30 story files' `meta` objects. Half a
day.
*Run cost:* zero new test files; the 131 existing generated tests become real. Story tests that
currently finish in 150ms will take as long as the layers take, which is the point.
*How it fails:* a story that legitimately expects a refusal needs to say so. There are none today.
*Note:* the global wait in `.storybook/preview.ts:119` must move out of `parameters` into each
`meta`'s own `play` slot at the same time, or the 32 play-less stories will still be asserting
against a graph that has not drawn a frame.

**2. Commit the five uncommitted test files, and make `paint-assertions.ts` the shared entry point.**
`test/helpers/paint-assertions.ts`, `test/browser/label-paint.test.ts`,
`test/browser/style-layer-ordering.test.ts`, `test/browser/first-paint-after-load.test.ts` and
`test/browser/story-contract.test.ts` already exist in the working tree and are the right shapes.
*Catches:* the label fault, `edge.label`, `node.labelStyle`, label removal, both ordering defects,
and the `setup`/`renderFn` pairing that nothing enforced.
*Build cost:* already paid. The remaining work is making them the default habit rather than five
one-offs: new appearance tests should import `paint-assertions.ts`, not reinvent a sampler.
*Run cost:* measured on the sibling pixel test -- `style-paint-pixels.test.ts` is 1.8 seconds of test
time for two tests, 5.9 seconds wall including browser startup. These add roughly 19 tests of the
same kind, so seconds, not minutes, in plain headless Chromium with no GPU flags.
*How it fails:* `label-paint.test.ts`'s ink threshold is tuned to the element's default whitesmoke
background and indigo node. A future default in the same darkness range would need it revisited --
so pin the background explicitly in the fixture rather than relying on the default.

**3. Put the `browser` project in the pre-push gate.**
`tools/prepush.sh:100` runs only `--project=default` for graphty-element. All frame tests are in
`browser`.
*Catches:* nothing new by itself. It is what makes items 2 and 4 actually run before code leaves a
machine, which is the difference between a test and a decoration.
*Build cost:* one line.
*Run cost:* the `browser` project is 1,481 tests. If that is too slow for a hook, run a named subset
-- the two or three frame-test files -- rather than nothing.
*How it fails:* a slow hook gets bypassed. Keep the subset small and explicit.

**4. Fix `test:shards:parallel` so `npm test` can fail.**
Replace the bare `wait` with per-job status collection, or run the three projects sequentially with
`&&`. Every assertion added anywhere is worth less while the command a developer runs before pushing
returns zero unconditionally.
*Build cost:* one line.
*Run cost:* sequential is slower; collecting PIDs and waiting on each keeps the parallelism.
*How it fails:* it does not.

**5. Push the branch, and do not bulk-accept the Chromatic build.**
The first run will be a wall of legitimate diffs. Review the `Styles/Label`, `Styles/Layered` and
`Styles/Edge` components row by row before accepting anything, and treat the one new story
(`Styles/Edge` / `ArrowHead`) as having no safety net at all -- there is no baseline and no test.
*Build cost:* reviewer time, once.
*How it fails:* by the reviewer being tired. Which is why items 1, 2 and 7 exist.

**6. Make "the order a render function must use" a required case, not an exotic one.**
Every style test in the package loads the data first and awaits each edit; a story cannot do either.
Adopt one rule: any test of the style system must have at least one case that issues the edits
first, sets the data second, and awaits nothing -- and must assert that every write verb's run
reached an answer. `test/browser/first-paint-after-load.test.ts` and
`test/browser/style-layer-ordering.test.ts` (both uncommitted, see item 2) are that rule made
concrete: a matrix of three load paths times four moments a layer can be asked for.
*Catches:* the whole class of ordering defect that blanked over fifty stories while
`property-order-independence.test.ts` reported 34 green variants of operation order, none of them
the product's own.
*Build cost:* the matrix exists. The ongoing cost is a convention, plus adding a row when a new load
path or write verb appears.
*Run cost:* one real Babylon scene per cell.
*How it fails:* a matrix grows combinatorially. Keep it to load paths times edit moments and resist
adding channels to it -- channels belong in item 7.

### Do next

**7. One table test over a real graph, one case per renderable channel.**
Apply a layer setting each of the 21 renderable channels in turn and assert the scene-graph
consequence differs from the unstyled default: for `node.label`, a label object with a mesh whose
text matches; for `node.shape`, a different mesh key and different geometry; for `edge.arrowHead`,
an arrow mesh with a transform. Drive the list off `CHANNEL_DESCRIPTORS` in
`src/session/styles/channels.ts` so a new channel cannot be added without a row.
*Catches:* the thirteen channels currently driven by no real-graph test, and it fails the build when
a twenty-second channel appears without one.
*Build cost:* one file, a day or two. Most channels need only a mesh-existence or key-changed
assertion, not pixels.
*Run cost:* 21 cases on a small graph, seconds.
*How it fails:* a channel whose consequence is genuinely invisible in the scene graph (a shader
uniform, say) needs a frame read instead. Expect two or three such exceptions and write them as
frame tests.

**8. A distinctness check per story family.**
Build the element the way a story does, fingerprint the result from the scene graph (per node:
resolved colour, mesh key, label text), and assert no two stories in a family share a fingerprint.
*Catches:* "they all render identically", the exact reported symptom, for every family at once, with
no reference image and no acceptance step.
*Build cost:* one file plus a way to drive `stories/helpers.ts` from a test. Note that no file under
`test/` imports `stories/helpers.ts` today, which is its own gap: the tests and the stories are two
independent translation layers and only one of them is tested.
*Run cost:* one mount per story in the families that have one, so seconds per family.
*How it fails:* two stories that are genuinely meant to look the same need an allowlist. There are
none today.

**9. Extend the existing pixel harness through `styles.add`, not only `styles.encode`.**
`style-paint-pixels.test.ts` never calls `styles.add` with a selector -- the exact API the broken
stories use. Two layers with disjoint expression selectors, then assert the two groups of nodes are
not painted alike **in the frame** rather than in the model.
*Catches:* a layer stack that resolves correctly and draws nothing, which the current
model-versus-canvas oracle cannot see by construction.
*Build cost:* two tests in an existing file, an afternoon.
*Run cost:* under a second each.
*How it fails:* it does not cover edges, because the sampler discards grey. Accept that or give edges
a saturated colour in the fixture.

**10. Give the suite a floor.**
Assert the story count, or that every story file contributes at least one test. Deleting nineteen
stories currently produces a smaller green number and no signal.
*Build cost:* one test.
*Run cost:* milliseconds.
*How it fails:* it needs updating whenever stories are deliberately added or removed, which is the
intended behaviour.

**11. Stop counting mock tests as element coverage.**
The 522 tests in `test/mesh-testing/` that import no product code (104 of them about labels, in the
deleted 1.x label vocabulary) are coverage of `test/mesh-testing/mesh-factory.ts`. Either point them
at the real `RichTextLabel` through a real engine, or move them out of the `default` project so the
headline number stops implying label coverage that does not exist. Delete or rewrite the ten
tautological tests in `test/browser/Edge.label.test.ts` for the same reason -- they occupy the
filename a person greps.
*Catches:* nothing. It stops the suite from lying about what it covers, which is why nobody thought
to write the real test.
*Build cost:* a decision and a directory move, or a week to rewrite them properly against real
meshes.

**12. Re-home or delete `test/browser/dash-spacing-measurement.test.ts`.**
It is the right pattern and it has been in no project for nearly ten months, pointing at a story
deleted in `2d07b220`. Either give it a project that can load pngjs, or rewrite the measurement
against `engine.readPixels` the way the other frame tests do. Also fix the stale story pointer in
`test/browser/property-order-independence.test.ts:8`, which names
`stories/Determinism.stories.ts` -- a file that no longer exists.

**13. Delete the dead `NullEngine` override in `test/helpers/testSetup.ts:213`.**
It patches a `createEngine` method that exists nowhere in `src/`, and its comment tells every reader
that 47 test files run headless when in fact they all hold a real WebGL engine with
`preserveDrawingBuffer: true`. Removing it converts "reading pixels is exotic" into "47 files could
do this today".
