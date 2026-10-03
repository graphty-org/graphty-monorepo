# Item 7 review: how many labels the overlap rule hid (#787)

Item 7 of `element-api-decisions.md` proposes how graphty-element tells a consumer how many node
labels it hid so they would not draw on top of each other, plus a switch to turn that hiding off.
The graphty app needs it for a status line ("77 labels, 64 hidden to avoid overlap") and a "Show
all labels" checkbox. This page is the verdict after a blind-author test (a writer who saw only
the published docs wrote the canonical example) and five review lenses: personas, evolution,
consistency, security and privacy, performance and implementability.

## Verdict: redesign

The need is real: only the renderer knows which labels it hid, so without an element read the
app would have to guess, which CLAUDE.md forbids. But the recommended shape adds a second switch
for a behavior the element already has, puts a renderer-only read on the headless session type,
and publishes counts that do not add up. Six defects:

1. **A second switch for one behavior.** graphty-element already has the switch:
   `layoutBehavior.labels.declutter`, a boolean, off by default
   (`graphty-element/src/config/GraphBehavior.ts:28-37`). The label pass reads only that
   (`src/managers/LabelDeclutter.ts:147`). The guide, the element's JSDoc
   (`src/graphty-element.ts:1449-1458`) and the app (`graphty/src/components/Graphty.tsx:12`)
   all use it. Item 7 adds `overlap: "hide" | "show"` beside it with the opposite polarity and
   never says which wins.
2. **It reverses a published classification without saying so.** `ProjectConfig` states that
   label declutter "is a preference of the view and not a project setting"
   (`src/session/types.ts:633-637`), and the undo guide lists it as not undoable
   (`docs/guide/undo.md:49`). Item 7 makes it an undoable project setting saved in the project
   file, which would also let a stranger's file switch on a per-frame pass the reader never
   asked for.
3. **`setOverlap` returns `Run<void>`, the algorithm-run handle.** The blind author's probe
   compiled `setOverlap("show").algorithm`. A run also queues behind every running algorithm
   (`src/session/runs/localQueue.ts:121`), so "Show all labels" could wait tens of seconds on a
   large graph, and each click would leave a run record in the journal. Every other settings
   change returns `Promise<void>` (`src/session/types.ts:688`).
4. **It sits on the wrong type.** `interface Session` does not exist. The element's getter is
   typed `GraphSession` (`src/graphty-element.ts:141`), which is also the type of the
   `./session` entry, and that entry must run in Node with no renderer (CLAUDE.md, Module
   System). There, `session.labels.report()` would type-check and answer nothing.
5. **The three counts do not add up, and one is wrong today.** The pass skips labels whose node
   is filtered out, behind the camera, or outside the viewport (`LabelDeclutter.ts:206-207`,
   `:222-223`, `:247-248`), and it sets visibility only on labels it placed (`:277-279`). A
   label hidden for overlap and then scrolled off screen or filtered out stays hidden-flagged.
   So "requested = drawn + hiddenByOverlap" has an unnamed remainder, and a reader zoomed into
   9 non-overlapping labels can be told "64 hidden to avoid overlap". With declutter off, the
   pass returns early (`:147-152`) and nothing counts anything at all.
6. **Its two main uses do not work.**
   - The node inspector's "this label is hidden" note (`tier1-design.md:290-291`) is the only
     reason for `hiddenIds()`. But the inspector shows the selected node, and the pass keeps a
     selected node's label first (`LabelDeclutter.ts:447-450`). Selecting a node whose label
     was hidden makes the label reappear, so the note never shows.
   - Export's hidden-label warning (`tier1-design.md:779`, `plan.md:206-208`) would read the
     live on-screen count. Hiding depends on the viewport size (`LabelDeclutter.ts:288-296`), and
     an image export renders at another size, so the count would not describe the exported
     image. A data export does not depend on labels at all.

Smaller defects, all fixed by the revised shape: "frame settle" is not a term any guide page
uses, and the pass re-runs on every frame of an orbit or a running layout, so a literal event
would fire 60 times a second. The report type has no exported name. `labels` covers node labels
only (`LabelDeclutter.ts:33`). `hiddenIds()` allocates an array of up to every node per call.
There is no DOM event for an HTML-only consumer. The default is unstated.

## Revised shape

Keep the existing switch. Add one read and one DOM event, both on the element, because the
answer exists only where something is drawn.

```ts
// @graphty/graphty-element (the main entry; not ./session)

/**
 * How many node labels the element is drawing, and why the rest are not.
 *
 * A node counts once however many label lines it has. Edge labels are not counted: the element
 * never hides an edge label to avoid overlap.
 *
 * `labeled - nodeHidden - hiddenByOverlap` is the number of labels the element would draw.
 * Some of those may be outside the current view; a label outside the view is never counted as
 * hidden. A minor release may add another `hiddenBy...` count for a new reason; each is a
 * separate subset of `labeled`.
 */
export interface NodeLabelCounts {
    /** Nodes whose label has text to draw. */
    readonly labeled: number;
    /** Of those, nodes that are not drawn themselves (a filter or the time window hides them). */
    readonly nodeHidden: number;
    /**
     * Of those, labels inside the current view that `layoutBehavior.labels.declutter` hid because
     * they would overlap a label it kept. Always 0 while declutter is off. Depends on the
     * camera and the size of the canvas.
     */
    readonly hiddenByOverlap: number;
}

export declare class Graphty extends LitElement {
    /**
     * The node label counts as of the last drawn frame. All zeros before data loads.
     * Reading it never forces a frame.
     */
    readonly nodeLabelCounts: NodeLabelCounts;
}

// DOM event "graphty-label-change", detail: NodeLabelCounts.
// Fires when a count changes, once the view has stopped changing: never during a camera
// gesture or while a layout is still moving nodes. Also fires once after the first frame
// that has labels.
```

The switch stays as it is: `element.layoutBehavior = { labels: { declutter: true } }`, merged
over the rest, a preference of the view, not undoable, not saved in a project, off by default.

Canonical example (16 lines; type-checks under `strict` and `exactOptionalPropertyTypes` against
the built element declarations with the shape above merged in, and fails without it):

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const status = document.querySelector<HTMLElement>("#label-status")!;
const showAll = document.querySelector<HTMLInputElement>("#show-all-labels")!;

function render(): void {
    const { labeled, hiddenByOverlap } = element.nodeLabelCounts;
    status.textContent = `${labeled} labels, ${hiddenByOverlap} hidden to avoid overlap`;
}

render();
element.addEventListener("graphty-label-change", render);
showAll.onchange = () => {
    element.layoutBehavior = { labels: { declutter: !showAll.checked } };
};
```

Files: `tmp/api-review/item-7/` (`stub.d.ts`, `example.ts`, `probe.ts`, `tsconfig.json`,
`tsconfig.nostub.json`).

### Element work this needs

- In the label pass, clear the hidden-for-overlap flag on every label it skips (node hidden,
  behind the camera, outside the view), and count `hiddenByOverlap` inside the existing placing
  loop with plain counters: no arrays, nothing allocated per label.
- Keep the label list exact while declutter is off: remove a node from it when its label is
  disposed (today removal happens only inside the pass, so with declutter off the list keeps
  removed nodes across dataset loads, which is also a leak). Then `labeled` and `nodeHidden`
  come from that list without any per-frame work.
- Emit the event from the pass after a quiet period (for example ten frames with no re-run),
  only when the counts differ from the last ones emitted.
- Publish only after the labels' text is measured. A label's measuring timer fires before the
  pass on some loads and after it on others (`src/meshes/RichTextLabel.ts:1171`). Add a test
  that loads a sample with declutter on and asserts one stable final count, and a test that a
  scripted 120-frame orbit emits at most one event.

### App changes

- The "Show all labels" checkbox writes `layoutBehavior.labels.declutter`; the app saves it as
  the reader's own preference, which is the app's job.
- Remove the inspector's "label hidden" note and its route `#/inspector-node/label-hidden`.
- Remove the hidden-label warning from the data export. If the image export wants one, it needs
  a count from the export's own render; that is not this item.

## What changed and why

| Item 7 proposed                          | Revised                                    | Why                                                                                  |
| ---------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `overlap: "hide" \| "show"` + setter     | the existing `labels.declutter`            | one switch; no polarity flip; the published view-preference rule stands              |
| `setOverlap(): Run<void>`, undoable      | `layoutBehavior` setter, takes effect next frame | not a computation; never queued behind algorithms; nothing in the journal       |
| saved in the project file                | app preference                             | `ProjectConfig` excludes it; a shared file cannot switch on a costly pass            |
| `session.labels` on a nonexistent type   | `element.nodeLabelCounts`                  | only the element draws; the Node-safe `./session` entry stays renderer-free          |
| `requested`, `drawn`, `hiddenByOverlap`  | `labeled`, `nodeHidden`, `hiddenByOverlap` | the parts are named subsets; off-screen labels are never called hidden               |
| `hiddenIds(): NodeId[]`                  | dropped                                    | its only use (the inspector note) never fires; avoids an O(n) array per call         |
| `"labels:changed"`, "frame settle"       | `graphty-label-change`, defined cadence    | fits the `graphty-<noun>-change` DOM events; never fires during a gesture            |
| unnamed inline report type               | exported `NodeLabelCounts`                 | the consumer does not retype the shape                                               |
| default unstated                         | declutter stays off by default             | no consumer's drawing changes in a minor release                                     |

## Findings rejected or deferred

- **Make the setting an object with a ranking field** (personas, evolution). No new setting is
  added, so there is no closed union to outgrow. A ranking option such as
  `labels.priority` can be added later beside `declutter` as an optional key in a minor release.
  Not in tier 1.
- **Shape the counts as the labels part of the scale-level readings, with a label budget**
  (evolution). That design (`framework/scale-levels.md`, `framework/element-needs.md`) is not
  approved or built. The revised type documents that new reasons arrive as new `hiddenBy...`
  counts, so a budget is additive. Left as a residual risk below.
- **Put the counts in `session.status.counts`** (consistency). `status` is on `GraphSession`,
  which the headless session shares, and it has no renderer.
- **A per-node `isLabelHidden(id)`** (several lenses). Its only task is the inspector note, which
  never fires. Add it when a task needs it.
- **Validate the value in the project file, preserve nested unknown keys** (security). Moot: the
  setting is not in the file.
- **Add a "labels" part to saved views (#816)** (evolution). Valid, but it belongs to #816, not
  here.
- **Session event `"label:changed"` beside the DOM event** (consistency). The session type is the
  wrong place for a renderer read; the DOM event is the whole surface.

## One-way doors

- The property name `nodeLabelCounts` and the type name `NodeLabelCounts`.
- The three field names and their meaning, in particular that a label outside the view is never
  counted as hidden, and that `nodeHidden` covers every way a node itself is not drawn.
- The event name `graphty-label-change` and its cadence (never during a gesture).

Not a one-way door: where the switch is stored. Moving `declutter` into `ProjectConfig` later is
an additive minor change if the owner decides the reader's choice should travel with a project.

## Confidence: medium

High that the proposed shape must not ship: the conflicts with `declutter`, `ProjectConfig`,
`Run` and the headless session are each a cited line in the element. Medium on the revised
shape, for two reasons: the quiet-period cadence is specified but not prototyped, so its delay
and its test are unmeasured; and the label-budget design, if approved later, may want to report
labels by ranking rather than by reason.

## Residual risks the owner should know

- **The reader's "Show all labels" choice does not undo and does not save with a project.** It is
  saved as the reader's preference in the app. If the owner wants it in the project, that is a
  later, additive move into `ProjectConfig`, and the `ProjectConfig` comment and the undo guide
  change with it.
- **Typed DOM events.** None of the element's `graphty-*-change` events is typed for
  `addEventListener`; a consumer reading `detail` must cast. The canonical example avoids it by
  reading the property. Typing all of them at once is a separate element fix.
- **XR.** The counts follow the active camera; in a two-eye headset session which one counts is
  undefined until someone decides it.
- **PR #676** (held, breaking) changes the same label code. Its fate should be decided before
  this lands, as the plan already says.
- **The app's status line still says nothing while declutter is off**, because
  `hiddenByOverlap` is 0. That is correct, and the app should show the line only when the
  checkbox is off.
