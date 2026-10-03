# Blind author: "How many labels the overlap rule hid" (section 7)

Read only section 7's recommended signatures and graphty-element's published guide pages
(`graphty-element/docs/guide/`). Task: the most common use of the capability -- a status line
"N labels, M hidden to avoid overlap" plus a button that shows every label.

## The example

`design/ui/tier1-real-app/review/blind-7.ts`, 16 lines:

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const status = document.querySelector<HTMLElement>("#label-status")!;
const toggle = document.querySelector<HTMLButtonElement>("#show-all-labels")!;
const { labels } = element.session;

function render(r: { requested: number; drawn: number; hiddenByOverlap: number }): void {
    status.textContent = `${r.requested} labels, ${r.hiddenByOverlap} hidden to avoid overlap`;
    toggle.textContent = labels.overlap === "hide" ? "Show all labels" : "Hide overlapping labels";
}

render(labels.report());
element.session.on("labels:changed", render);
toggle.onclick = () => void labels.setOverlap(labels.overlap === "hide" ? "show" : "hide");
```

## Did it compile

Yes, with section 7's signatures merged by module augmentation into the built `GraphSession` and
`SessionEventMap` (`tmp/api-review/blind-7/`, `strict` and `exactOptionalPropertyTypes`,
tsc exit 0). Without the stub it fails as expected (`Property 'labels' does not exist on type
'GraphSession'`; `"labels:changed"` not a key of `SessionEventMap`), and a probe passing
`"auto"` is refused, so the stub really merged.

Compiling is not the same as being right. A probe file shows what the signatures also allow:

```ts
const r = s.labels.setOverlap("show");
const algo: string = r.algorithm;   // compiles
const fields = r.fields; const scope = r.scope; // compiles
```

## Defects found, most severe first

1. **It contradicts the published docs on what this setting is.** The guide says label
   thinning is `layoutBehavior.labels.declutter`, a boolean, OFF by default
   (`styling.md:253-273`, `web-component.md:139-144`), and that it is a non-undoable preference,
   not a project setting (`undo.md:49` "such as `pinOnDrag` and label declutter";
   `migrating-to-3.md:136`; the built `src/Graph.d.ts:299-305` says the same). Section 7 makes
   `overlap` an undoable project setting saved in the project file. Section 7 never says whether
   `overlap` replaces `declutter`, mirrors it, or sits beside it. A newcomer who already set
   `layoutBehavior = { labels: { declutter: true } }` cannot tell what `labels.overlap` reads
   afterwards, or which one wins when they disagree. Two switches, two vocabularies
   (`true/false` vs `"hide"/"show"`), two undo classes, two save locations, for one behavior.
2. **`setOverlap` returns `Run<void>`, the algorithm-run type.** In the published types `Run` is a
   started computation (`src/session/runs/types.d.ts:461`): it has `algorithm: AlgorithmKey`,
   `params`, `scope`, `fields`, `shape`, `progress`, `queuePosition`, `journalId`. All of it
   compiles on a label toggle (probe above) and none of it means anything there. Does the toggle
   appear in `session.runs`, emit `run:changed`, take a queue slot? The docs cannot say. Every
   other undoable setting change returns `Promise<void>` (`SessionConfig.set`,
   `src/session/types.d.ts:627`; `session.styles.add` in `getting-started.md:146`). I wrote
   `void labels.setOverlap(...)` because I could not tell whether awaiting it means "recorded",
   "repainted" or "a run finished".
3. **A new verb instead of the existing settings door.** The guide's way to change an undoable
   project setting is `session.config.set({...})` (`undo.md` table row "Project settings").
   Section 7 adds a second door, `session.labels.setOverlap`, for one setting. A newcomer
   looking at `session.config` finds no `overlap`, and a newcomer reading `session.labels` finds a
   setter that `config.set` does not know about.
4. **The report type has no name.** `report()` returns an anonymous object type and the event
   payload is described in prose as "the new report". To write `render` I had to retype the
   shape by hand (or reach for `ReturnType<...>`). The element should export it
   (e.g. `LabelReport`) and give the event that type explicitly.
5. **The event's firing rule is unstated.** "The read is per frame settle" -- "frame settle" is
   not a term in any guide page (`waitForStableFrame` and `graph-settled` are the nearest).
   Guesses I had to make:
   - Does `labels:changed` fire when only `overlap` changes but the counts happen not to (e.g.
     0 hidden before and after)? My button text reads `labels.overlap` inside the handler; if the
     event does not fire, the button goes stale.
   - Does it fire during a continuous camera orbit? `styling.md:270-273` says declutter is
     recomputed on every camera move.
   - What does `report()` answer before the first frame, or before data has loaded? I call it
     at startup with no idea whether to wait for `graph-ready` first.
6. **The three numbers' relationship is not given.** Is `requested == drawn + hiddenByOverlap`?
   A label on a filtered-out node, off screen, or behind the camera -- is it requested, drawn,
   neither? I never used `drawn` because I could not tell what it adds.
7. **Internal concepts I had to name or decode.** "label channel resolves to text" (the guide
   says a label is switched on by `node.label` OR by `node.labelStyle: { enabled: true }`, which
   labels by id -- does the second count?); "the overlap rule" (the guide calls it declutter);
   "frame settle"; "a project setting, saved in the project file" (no published page describes a
   project file).
8. **Names that misled me.**
   - `interface Session` -- no such type is published; the element's getter is typed
     `GraphSession` (`src/graphty-element.d.ts:55`), and there is also an `ElementSession`.
     Which one gains `labels` matters: `GraphSession` is also the headless `./session` entry,
     which must stay free of the renderer, yet only the renderer can count drawn labels. If it
     goes on `ElementSession`, `element.session.labels` does not compile, because the getter
     returns `GraphSession`.
   - `overlap: "show"` reads as "show the overlap" rather than "show every label".
   - `report` says nothing; `requested` -- requested by whom?
   - `labels` / `labels:changed` say nothing about nodes, yet `hiddenIds()` returns `NodeId[]`.
     Are edge labels counted or thinned? The guide says declutter applies to node labels only.
9. **Missing pieces.**
   - No DOM event. Every other session event has a `graphty-*-change` twin on the element
     (`events.md`); an HTML-only consumer cannot hear this one.
   - `hiddenIds()` returns an array, so the node inspector's "this label is hidden" check is an
     O(n) scan per inspected node. An `isHidden(id)` (or a `Set`) is the shape that task needs.
   - The default of `overlap` is not stated. If it follows `declutter` (off), my status line
     says "0 hidden" until the reader turns it on and the feature that motivates the API is
     invisible by default; if it defaults to `"hide"`, every existing consumer's drawing changes.

## Places I guessed

- The type of `element.session.labels` exists on the getter's type (it does only if it lands on
  `GraphSession`).
- The `labels:changed` payload has the same shape as `report()`.
- `setOverlap` can be fire-and-forget (`void`) without an unhandled rejection.
- `report()` is safe to call at startup.
- The event fires on a mode change even when the counts are unchanged.

Scratch: `tmp/api-review/blind-7/` (stub `stub-section7.d.ts`, `example.ts`, `probe.ts`, three
tsconfigs, and a copy of the built declarations).
