# Item 8 review: what a run's suggested style did (#788)

## Verdict: redesign

The item 8 section of `element-api-decisions.md` should not be approved as written. The shape it
recommends rests on a false description of the element, covers fewer outcomes than the element
already produces, and puts a run-only field on a type that style writes also return.

1. **The "today's behavior" claim is false.** The decisions document says a run's layers "land on
   top of the stack (today's behavior, now documented)". They do not. A suggestion that is applied
   automatically goes immediately beneath the lowest hand-written layer that drives its channel
   (`graphty-element/src/session/styles/autoApply.ts:16-22`, `beneathAuthored` at :211-215). It is
   dropped entirely when a hand-written layer with `selector: { match: "everything" }` drives the
   channel (`authoredCovers`, :199-201). Only the opt-in `applySuggestedStyles: true` path puts
   layers on top (`runs/RunsApi.ts:1313-1315`). "Hand-written" means a layer whose source is user,
   template or plugin (`AUTHORED`, autoApply.ts:154). Publishing "on top" as the contract would
   either document something the code does not do, or change the drawing existing consumers get
   (a breaking behavior change) without saying so.
2. **The motivating cause names the wrong mechanism.** `plan.md:213-215` blames round 8 on "an
   earlier run already covered color on all 77 nodes". A layer that came from an earlier run never
   holds a suggestion back (autoApply.ts:184-189 excludes `by: "run"`). Louvain run after
   Betweenness lands above Betweenness. The mechanism that does silently swallow a run's color is
   in the app: the shell's New Layer button adds `{ selector: { match: "everything" }, set:
   { "node.color": ... } }` with no source (`graphty/src/components/shell/AppShell.tsx:2538`).
   With no source the layer counts as `by: "user"` (`Layer.ts:411`), so after a reader presses New
   Layer once, no later run paints color, and nothing reports it. Reporting this condition is
   necessary, but a report alone does not stop it from happening.
3. **The plan and the decisions document specify different APIs.** `plan.md:216-217` has
   `runs.start` resolving with the three lists, which is alternative (a), the one the decisions
   document rejects as a major release. The two documents also disagree on what `from` holds.

## Findings weighed

Accepted (they drive the revision):

- **`landing` on `Run<T>` leaks onto every style write, `applyTemplate` and `runs.batch`**
  (blind-author `leak-probe.ts`; `runs/types.ts:538`). The revision adds nothing to `Run`.
- **A second promise is the wrong carrier.** The decision is made synchronously in `commit()`, in
  the same draft and undo step as the run's record (`RunsApi.ts:1290-1323`; autoApply.ts:37-40).
  A second promise adds the unhandled-rejection, cancellation and batch-hang questions and gives
  no timing a read could not give. The revision is a synchronous read.
- **The three lists cannot express what happens today.** The cases they miss: a batch member that
  is coalesced away (autoApply.ts:296-307); `style: false`; a failed or cancelled run (:288-289);
  a refusal, which today goes only to `style:problem` (`GraphSession.ts:2163-2176`); a run with
  nothing to suggest; and a session with no style stack (`RunsApi.ts:1296-1299` falls back to
  "paint nothing"). In every one of these cases the three lists come back empty, so they cannot be
  told apart. The revision gives each run a state and gives each suggestion an outcome code.
- **`reason` is English text with no code.** It cannot be translated or branched on, and a layer
  name read from a stranger's file would flow into a sentence that reads as the element speaking.
  The revision carries codes and ids only, and no names or sentences.
- **Inconsistent keys** (`layerId` / `byLayer` / `from` / `fromRun`). The revision follows the
  element's existing `xxxId` convention (`LegendBlock.layerId`/`runId`, `legend.ts:93-95`).
- **A withheld entry cannot be acted on.** The revision's `suppressed` entry carries the
  `StyleSuggestion` itself, so "show it anyway" is one `styles.encode(suggestion.spec)` call, which
  goes on top because an explicit call does not use `beneathAuthored` (autoApply.ts:239-240).
- **`tookOver` duplicates the legend and goes stale.** `styles.legend()` already computes, live,
  whether a block is hidden under a layer above it (`coveredBy`, `legend.ts:589-623`). It
  publishes the answer only as the English departure `painted over by "<name>"` (:631-642). The
  revision drops `tookOver` and exposes that cover as structured data on `LegendBlock`.
- **Storage and undo.** A report kept in a side map survives an undo that removed its layers. The
  revision stores the decision on `RunEntry` beside `painted` (`project/state.ts:89-112`), so undo
  and redo carry it, as they already carry `painted`.
- **Per-element "took over" is expensive** (O(matched x depth) at 50k nodes, `explain.ts:21-25`,
  `repaint.ts:155-160`). The revision has no per-element attribution. Cover is computed at layer
  granularity by the legend's existing code.
- **Config-started runs need a way to observe.** The existing `run:changed` event fires when the
  run is recorded. A consumer that holds no handle calls `runs.painting(change.run.id)` from that
  event. No new event is needed.
- **The guide's own examples are broken.** `docs/guide/javascript-api.md:239-242` awaits the run
  and then reads `run.result`, which does not exist on `RunResult` (blind author,
  `guide-pattern.tsc.txt`). The revised example works with the await-first pattern, because
  `RunResult.runId` exists (`dist/src/session/results/types.d.ts:660`). The broken guide examples
  must still be fixed in the same change.
- **The plan and the decisions document disagree.** `plan.md` item 8 and its T7, T8 and T15 rows
  must quote the approved shape and drop "lands on top".

Rejected, with the reason:

- **"Return the report from the verb and drop the read after the fact"** (evolution lens).
  Rejected: a run started from config, or by another consumer, has no verb result to read. Keeping
  the decision on `RunEntry` gives a read that is correct under undo, which was the lens's real
  concern.
- **"Derive everything from the stack and store nothing"** (consistency lens). Rejected in part.
  Cover is derived live (the legend). Why a suggestion did not paint (suppressed, merged, opted
  out) cannot be recovered from the stack afterwards, because the stack has moved on by then, so
  that one decision is stored. It costs a few hundred bytes per run.
- **"Report suppression as `style:problem` with a new error code"** (consistency lens).
  Rejected: suppression is the policy working as designed, not a failure. Under a brand-palette
  layer (the plugin-author persona) it would fire as a "problem" on every run, for every user.
  Refusals keep `style:problem` as their channel, and the `refused` entry carries only the same
  code, so the two cannot disagree.
- **"Carry display-ready names in the report"** (personas lens). Rejected: a stored name goes
  stale on rename and is a spoofing surface when it comes from a file (security lens). The
  example looks names up live with `styles.get(id).name` and `runs.get(id).label`.
- **"Settle after the frame is painted and fold in repaint problems"** (performance lens).
  Rejected for this item. `painted` means "the layer was added". When the frame is drawn is
  already `StyleChange.painted` (`StylesApi.ts:731-732`), and a binding that fails to prepare is
  already reported in the repaint report. The documentation must say this in one line.
- **"Brand RunId and LayerId before this ships"** (security lens). Not a blocker:
  `runs.painting(layerId)` returns `undefined`, which is harmless. Branding is worth its own
  element issue.
- **"Forged `by: \"run\"` provenance from files"** (security lens). Real, but the flaw already
  exists and item 8 does not create it (`StylesApi.ts:851-856`, :1886-1897). The revision prints
  no names and makes no claims, so it does not amplify the problem. File it as its own element
  issue.
- **"Report a highlight that replaced an earlier one"** (evolution, consistency). Deferred.
  Dropping `tookOver` removes the dangling-id problem that motivated it. The tier 1 notice does not
  need it, and it can be added later as an additional outcome value.

## Revised shape

Exported from `@graphty/graphty-element/session` and the main entry. `StyleSuggestion` is
currently exported only from the main entry (`dist/index.d.ts:48`), so it must be added to
`/session` as well.

```ts
/** What became of one suggestion the run made. More outcomes may be added: branch with a default. */
export type SuggestionOutcome =
    | { readonly outcome: "painted"; readonly suggestion: StyleSuggestion; readonly layerId: LayerId;
        /** Set when it was placed beneath a hand-written layer that paints some of the same elements. */
        readonly beneathLayerId?: LayerId }
    | { readonly outcome: "suppressed"; readonly suggestion: StyleSuggestion;
        /** The hand-written layer that paints this channel on every element. */
        readonly byLayerId: LayerId }
    | { readonly outcome: "merged"; readonly suggestion: StyleSuggestion;
        /** The batch sibling whose suggestion for this channel painted instead. */
        readonly intoRunId: RunId }
    | { readonly outcome: "refused"; readonly suggestion: StyleSuggestion;
        /** The same code `style:problem` carried. */
        readonly code: GraphtyErrorCode };

/** What the element decided to paint when a run first completed. A snapshot; the legend is live. */
export interface RunPainting {
    /**
     * "decided": the suggestions below are the decision ([] means the run had nothing to draw).
     * "pending": not finished, or a batch member before its batch is released.
     * "opted-out": started with `style: false`. "not-succeeded": failed or cancelled.
     * "no-styles": a session with no style stack. "restored": reopened from a file. More may be added.
     */
    readonly state: "decided" | "pending" | "opted-out" | "not-succeeded" | "no-styles" | "restored";
    readonly suggestions: readonly SuggestionOutcome[];
}

interface RunsApi {
    /** Undefined only when this session holds no run with that id. */
    painting(id: RunId): RunPainting | undefined;
}

interface LegendBlock {
    /** A layer above that paints this channel over every element this block's layer reaches. */
    readonly coveredBy?: { readonly layerId: LayerId; readonly runId?: RunId };
}
```

Semantics the documentation must state:

- `runs.painting(id)` is readable as soon as `await run` returns, with no second promise.
  (`commit()` writes the run and its layers in one draft. An implementation test must pin "readable
  after the await".)
- It is stored on `RunEntry` beside `painted`, so undo removes it and redo restores it. A re-run
  keeps the first decision, because a re-run does not repaint (autoApply.ts:12-15). It is not
  written to the project file. A reopened run reports `"restored"`.
- `painted` means the layer was added, not that pixels changed. `styles.legend()` gives the live
  answer to whether the layer is visible now (`coveredBy`), and `styles.explain()` gives it for a
  single element.
- Placement does not change: a suggestion goes on top unless a hand-written layer drives the same
  channel, in which case it goes beneath that layer, or is suppressed when that layer covers every
  element. `plan.md`'s "lands on top" is replaced with this sentence.

Canonical example (type-checked with `tsc --strict` against `graphty-element/dist` with the shape
above merged in. `tmp/api-review/item-8-synth/canonical.ts` exits 0, and `probe.ts` confirms that
`run.painting` and an un-narrowed `byLayerId` both fail):

```ts
import "@graphty/graphty-element";
const element = document.querySelector("graphty-element")!;
const { session } = element;
const result = await element.run("louvain");
const painting = session.runs.painting(result.runId);
for (const s of painting?.suggestions ?? []) {
    if (s.outcome === "painted") console.log(`Louvain now paints ${s.suggestion.channels.join(", ")}`);
    else if (s.outcome === "suppressed") {
        const name = session.styles.get(s.byLayerId)?.name;
        console.log(`Hidden by your layer "${name}"`);
        // "Show anyway": apply the suggestion outright, on top.
        if (s.suggestion.as === "encoding") await session.styles.encode(s.suggestion.spec);
    }
}
const hidden = session.styles.legend().find((b) => b.runId === result.runId && b.coveredBy);
if (hidden) console.log(`Louvain's colors are under "${session.styles.get(hidden.coveredBy!.layerId)?.name}"`);
```

The simple path (the run painted) takes five lines and names no internal concept. The suppressed
branch has to name "layer", because a layer is the thing that blocked the run. That concept
belongs on the styling guide page, which must also document `run.label`. No guide page documents
it today.

## One-way doors

- The name `runs.painting`, the `RunPainting.state` values, the `outcome` values and their keys
  (`layerId`, `beneathLayerId`, `byLayerId`, `intoRunId`, `code`), and `LegendBlock.coveredBy`.
  Declaring both unions open ("more may be added") is part of the contract and must ship in the
  first release.
- That the decision is a snapshot taken at first completion, kept in undo, and not saved in the
  project file.
- Not a door, but a decision this item must not make implicitly: whether hand-written layers keep
  suppressing runs. The revision keeps today's rule. Changing it is a separate behavior change.

## Confidence: medium

The shape is small, it is derived from code paths that were read (`commit()`, the auto-apply
policy, the legend's cover test), and it compiles against the built types. It is medium rather
than high for three reasons. Round 8 has not been reproduced, so whether the reader's missing
communities came from the New Layer trap, from the app's own encode path or from something else is
inferred rather than observed. The claim "readable once `await run` returns" relies on `commit()`
running before the run's promise settles, which still needs a test. And the batch `merged` case
needs the batch release to write onto each member's `RunEntry`, which the code does not do today.

## Residual risks for the owner

- **The trap is the policy, not the report (top risk).** One press of the app's New Layer button,
  or the refined design's Everything-row edits written as an `everything` user layer
  (`structure-b-refined.md:770-773`), suppresses color for every later run. Item 8 only makes that
  visible, as a "Hidden by your layer" notice after each run. Either the app stops creating
  covering color layers by default, or the owner decides that runs land above a covering
  hand-written layer. That second option is a behavior change for every graphty-element consumer.
- **Placement quirk.** `beneathAuthored` uses the lowest authored layer. A hand-colored partial
  layer that sits below older runs therefore sends a new run beneath those older runs, contrary to
  "newest run wins". File this as an element issue. `beneathLayerId` reports it but does not fix
  it.
- **Layer provenance is trusted from files** (`StylesApi.ts:851-856`). The legend's `runId` and
  `coveredBy.runId` can be forged by a shared file. File this separately before any UI says "run X
  hid run Y" with authority.
- **Guide examples that await and then read `run.result` do not compile today.** Fix them in the
  same change, or the first reader copies broken code next to this API.
