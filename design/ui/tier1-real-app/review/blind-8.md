# Blind-author review: what a run's suggested style applied, held back or took over (#788)

Reviewer stance: a third-party developer who read only section 8 of `element-api-decisions.md`
(as if it were the published page) and `graphty-element/docs/guide/*.md`, then type-checked
against graphty-element's built `dist/` types with section 8's signatures merged in.

## The task and the example

The most common task: "I ran Louvain. Tell the reader whether its colors are showing, and if not,
what is in the way." Example, 16 lines, at `design/ui/tier1-real-app/review/blind-8.ts`:

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { session } = element;

const run = session.runs.start("louvain");
const { applied, withheld, tookOver } = await run.landing;

for (const { channel } of applied) console.log(`Louvain now paints ${channel}`);
for (const { channel, byLayer, reason } of withheld) {
    console.log(`Louvain's ${channel} is held back by "${session.styles.get(byLayer)?.name}": ${reason}`);
}
for (const { channel, fromRun } of tookOver) {
    console.log(`Louvain took ${channel} from ${fromRun ? session.runs.get(fromRun)?.label : "a layer"}`);
}
```

## Did it compile

Yes -- but only because I ignored the guide's own idiom. Scratch is in
`tmp/api-review/blind-8/` (stub `section8-stub.d.ts` augments `Run` and `RunsApi` in
`dist/src/session/runs/types`; each file checked with `tsc --strict --noEmit`).

| File | Result |
| --- | --- |
| `blind-8.ts` (above, uses `session.runs.start`) | compiles, exit 0 |
| `guide-pattern.ts` (`const run = await element.run("louvain"); await run.landing`) | **fails**: `TS2339: Property 'landing' does not exist on type 'RunResult'` and `TS2339: Property 'result' does not exist on type 'RunResult'` |
| `leak-probe.ts` (`await element.session.styles.add(...).landing`, `runs.batch(...).landing`, `runs.landing(layerWrite.id)`) | compiles, exit 0 -- it should not |

## Findings

1. **The guide teaches the shape that makes `landing` unreachable.** `algorithms.md` (Accessing
   Results, Custom Styling, Multiple Algorithms), `javascript-api.md:239` and `styling.md`
   (Painting an algorithm's result) all write `const run = await element.run(...)` and then read
   `run.result` / `run.id`. Against the built types, `await` yields `RunResult`
   (`dist/src/session/results/types.d.ts:658`: it has `runId`, not `id`, and no `result`), so the
   handle -- and `landing` with it -- is gone. A newcomer who copies the guide gets
   `TS2339` on `run.landing`. Section 8's "second promise on the handle" only works for a reader who
   already knows not to await the handle. The guide's existing examples are also wrong on their own
   (`run.result` does not exist on the awaited value); that is a docs defect to fix with this one.

2. **`landing` lands on every `Run`, not just algorithm runs.** Section 8 adds it to
   `interface Run<T>`. `Run` is also what `styles.add/update/remove/move/encode/highlight`,
   `applyTemplate` and `runs.batch` return (`dist/src/session/styles/StylesApi.d.ts:180-348`). The
   leak probe compiles `await element.session.styles.add(spec).landing` and
   `await runs.batch([...]).landing`. Nothing says what a style write's "landing" is, whether it
   ever settles, or whether a batch's landing merges its members'. Either a separate
   `AlgorithmRun extends Run` type or a documented meaning for every producer is needed; once
   shipped on `Run`, removing it is a major.

3. **`runs.landing(id)` accepts any string.** `RunId` and `LayerId` are both plain `string`
   (`dist/src/catalog/types.d.ts:44,46`), so `runs.landing(layerWrite.id)` compiles. The doc says
   only "null before the run finishes"; it does not say what an unknown id, a removed run, an undone
   run, or a `style: false` run returns. A reader cannot tell "not finished" from "never will be".

4. **"Withheld" contradicts "lands on top of the stack".** The page says suggested layers land on
   top. `styling.md` ("The element's own layers") says the only locked layers are the element's base
   and selection layers, and those sit at the bottom ("you paint over them by adding your own layer
   on top"). A layer on top wins every channel it writes (last writer wins). So I could not
   construct any situation where `withheld` is non-empty, and the page does not name one. I guessed
   it means "a layer the reader locked or pinned above", a concept the published guide does not
   have. Either the concept is missing from the docs or `withheld` is dead.

5. **A withheld entry cannot be acted on.** The obvious UI after "held back" is a "show Louvain's
   colors anyway" button, i.e. `styles.move(louvainLayer, null)`. `withheld` carries `byLayer` (the
   blocker) but not the run's OWN layer id, so the follow-up needs `runs.bindings(run.id)` plus a
   scan of `styles.list()` matching channels. `applied` has `layerId`; `withheld` should too.

6. **Three names for one kind of value.** A `LayerId` is `layerId` in `applied`, `byLayer` in
   `withheld`, `from` in `tookOver`; a run is `fromRun` in `tookOver` and absent from `withheld`
   (which run owns the blocking layer is not reported, though the reader message needs it exactly as
   much as in `tookOver`). I had to read each list's keys separately to destructure them. Suggest
   one key set: `{ channel, layer, run? }` with the list name carrying the direction.

7. **Ids, not names, and the page's own example prints an id to a reader.** The example
   interpolates `tookOver[0]?.fromRun` into a reader notice -- that is a `RunId` such as an
   algorithm-plus-scope id, not a readable name. To produce a sentence I had to make two extra
   lookups the page never mentions (`session.styles.get(byLayer)?.name`, which I found in
   `styling.md`'s read list, and `session.runs.get(fromRun)?.label`, which is in the built types
   but in no guide page). If the entries are for readers, carry the name/label; if they are for
   code, say so and show the lookup.

8. **The page's own example is wrong in three ways.** `notice` is undefined; it reads only
   `tookOver[0]` and ignores which channel (Louvain could have taken `node.size` and been withheld on
   `node.color`); and it says "Louvain now colors the drawing" even when `applied` is empty and
   everything was withheld.

9. **`reason` is English UI text in the element API.** It is the only explanation of a withheld
   entry, it is a free sentence with no code, so a consumer can neither translate it nor branch on
   it (e.g. show an "Unlock" button only when the blocker is a locked layer). Add a `code` enum and
   keep the sentence as a default rendering, or drop the sentence.

10. **Failure and cancellation semantics are missing, and a second rejecting promise is a
    hazard.** If the run fails or is cancelled, does `landing` reject, resolve empty, or never
    settle? If it rejects, every consumer who awaits only the run (the guide's whole idiom) and never
    touches `landing` gets an `unhandledrejection` for a promise they did not create -- on every
    `Run` per finding 2. A never-settling promise leaks the awaiting code. The page must state it,
    and the safe choice is "resolves with empty lists".

11. **Undefined for the other ways a suggested style is applied.** `algorithms.md` documents
    `element.applySuggestedStyles("degree")` (returns a boolean, no handle), `style: false`,
    `style: { size: true }`, re-running a result in place under the same id ("A run paints itself on
    its first completion"), and `algorithmsOnLoad` (no handle at all). The page says nothing on
    which of these produce a landing, whether a re-run replaces it, or whether
    `applySuggestedStyles` updates `runs.landing(id)`. The run-on-load case -- the commonest one in
    an app -- is only reachable through `runs.landing(id)` with an id the consumer must guess.

12. **"Took over" is undefined for partial painting.** Per the project's own rule, a suggested
    layer paints only the elements in its result (Dijkstra paints the path). If Dijkstra's
    `node.color` layer covers Betweenness on 5 nodes of 500, is that a `tookOver` entry? The
    reader message "Betweenness moved below" would be false for 495 nodes. The unit (channel, or
    channel per element) needs saying.

13. **Two waits, unclear relation.** The guide says `waitForStableFrame()` settles "once the
    suggested layers are stacked and painted". The page says `landing` "settles after the style
    step". Is the landing settled before or after the paint? Can I screenshot after
    `await run.landing`? Guessed: no.

## Every place I had to guess

- That `element.run(...)` returns the same `Run` and also gets `landing` (the page names only
  `runs.start`; I used `session.runs.start` to be safe).
- That I must NOT `await` the run before reading `landing` (contrary to every guide example).
- Where `RunLanding`, `Channel`, `LayerId`, `RunId` are imported from: not stated;
  `@graphty/graphty-element/session` exports the last three, `RunLanding` has no stated home.
- When `withheld` can be non-empty at all (finding 4).
- How to get readable names for `byLayer` and `fromRun` (finding 7).
- What `landing` does on failure, cancel, `style: false`, re-run, run-on-load (findings 10, 11).
- Whether `landing` means painted (finding 13).

## Names that misled

- `landing` -- a metaphor; a newcomer looking for "did my colors show" would search "applied",
  "visible", "styled" or "outcome". It also reads like a property of every `Run` (finding 2).
- `tookOver.from` -- reads as a channel or a value ("took over from red"), not a layer id.
- `withheld` -- unclear whether the layer exists but is disabled, sits below, or was never added.
- `Run` -- the same name for an algorithm run and a style write, which is why `landing` leaks.

## Internal concepts I had to name

Layer, layer id, layer stack and its order ("on top", "moved below"), run id (versus result id
and label), channel, suggested style. Layer and channel are documented in `styling.md`; "suggested
style" in `algorithms.md`; the "held back" mechanism appears nowhere in the guide.
