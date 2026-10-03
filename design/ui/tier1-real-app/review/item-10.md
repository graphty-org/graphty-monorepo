# Item 10 review: the project file

This review covers item 10 of `design/ui/tier1-real-app/element-api-decisions.md`, "The project
file: save and reopen a whole session (#301)". It weighs one blind-author report and five lens
reviews (personas, evolution, consistency, security and privacy, performance and
implementability).

## Verdict: redesign

Item 10 must not be approved, even with edits. It invents a second graphty file format beside
the graphty document. The owner decided that format on 2026-09-28
(`design/decisions/2026-09-28-document-formats-first-version.md`, decisions 2 and 8) and
specified it in `design/documents/container.md`. graphty-element already reads and writes one
member kind of it (`graphty-notes`, `src/session/notes/document.ts:484`). The published docs
already tell readers to save `*.graphty.json` files until #301 lands (`docs/guide/notes.md:321`).

The two formats disagree on every identifying choice:

| | Item 10 | Graphty document |
| --- | --- | --- |
| Magic field | `format` | `kind` |
| Extension | `.graphty` | `.graphty.json` |
| Media type | `vnd.graphty.project+json` | `vnd.graphty+json` |
| Third-party data | an untyped `app` slot | reverse-domain `extensions` |
| Newer-version error | `E_UNSUPPORTED` | `E_UNSUPPORTED_VERSION` |
| Version rule | a second one | per member |

Under container reading rule 5, the element's own document reader would refuse an item-10 file
with `E_UNKNOWN_FORMAT`.

Item 10 also re-declares a published event with an incompatible payload. Its `dirty` cannot be
built as written, and it stores values by row order. Each of these is a one-way door, and each
is wrong.

The redesign is smaller than item 10. A project file becomes a graphty document that holds
every member. Item 10 then adds three new member kinds and a thin `session.project` front. It
does not add a format.

## The revised recommended shape

### API

These declarations were checked with `tsc` 5.9.3 in strict mode with `skipLibCheck: false`,
merged over the published 3.5.5 types (`tmp/api-review/item-10/`, exit 0, no output).

```ts
interface GraphSession {
    /** The graphty document this session was opened from or last saved to. */
    readonly project: SessionProject;
}
interface SessionProject {
    /** The document's `name`; else the opened file's name without `.graphty.json`; else null. */
    readonly name: string | null;
    /** True when the saved members differ from the last save or open (see "Dirty"). */
    readonly dirty: boolean;
    /** Outside history; sets dirty; fires project:status. */
    rename(name: string): void;
    /** The whole session as a graphty document, data and notes included. Marks saved. */
    save(options?: ProjectSaveOptions): Promise<SavedProject>;
    /** Browser only: save(), then hand the text to the reader as `<name>.graphty.json`. */
    download(options?: ProjectSaveOptions & { readonly fileName?: string }): Promise<SaveReport>;
    /** Any graphty document or graph data file; a string is the file's text, never an address. */
    open(source: Blob | Uint8Array | string, options?: ProjectOpenOptions): Promise<OpenReport>;
}
interface ProjectSaveOptions {
    readonly leaveOut?: readonly string[]; // member kinds, e.g. ["graphty-notes"]
    readonly extensions?: Readonly<Record<string, unknown>>; // reverse-domain keys, 64 KB each
}
interface SavedProject {
    readonly text: string;
    readonly report: SaveReport;
}
interface SaveReport {
    readonly bytes: number;
    readonly written: readonly string[]; // member kinds
    readonly leftOut: readonly Problem[]; // pending runs, an over-cap unknown member, a source URL
    readonly notices: readonly Problem[]; // what the file discloses: records, note authors, literals
}
interface ProjectOpenOptions {
    readonly discard?: boolean; // required over a dirty session, else E_UNSAVED_CHANGES
    readonly signal?: AbortSignal;
    readonly fileName?: string;
    readonly limits?: { readonly fileBytes?: number };
}
interface OpenReport {
    readonly opened: "project" | "document" | "data";
    readonly restored: readonly ProjectSlice[];
    readonly problems: readonly Problem[]; // the existing Problem: { what, reason, details, code }
    readonly extensions: Readonly<Record<string, unknown>>;
}
// SessionEventMap gains "project:status": { name: string | null; dirty: boolean }.
// The element dispatches it as the DOM event "graphty-project-status",
// next to "graphty-history-change". "project:changed" is untouched.
```

`session.project.save()` is defined as `session.data.saveDocument()` with every member written,
and `open()` as `session.data.openDocument(src, { data: "replace" })`. Both are a documented
preset of the container verbs, with one format and one reader. `open()` reads the content, never
the file name, to decide what it was given:

- a document holding a data member and a `graphty-session` member replaces the session
  (`opened: "project"`);
- a bare style, notes or recipe document is added as the container already specifies
  (`"document"`);
- GraphML, CSV and other data files are imported (`"data"`).

The app then never sniffs a file type (tier1-design.md:95).

### Canonical example

The example is 13 non-blank lines and names no internal concept
(`tmp/api-review/item-10/example.ts`, compiled as above):

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { project } = element.session;
document.querySelector("#save")!.addEventListener("click", () => project.download());
document.querySelector<HTMLInputElement>("#open")!.addEventListener("change", async (e) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file || (project.dirty && !confirm("Discard unsaved changes?"))) return;
    const report = await project.open(file, { discard: true });
    for (const problem of report.problems) console.warn(problem.code, problem.what);
});
element.session.on("project:status", ({ name, dirty }) => {
    document.title = `${dirty ? "* " : ""}${name ?? "Untitled"}`;
});
```

The probe in the same directory checks three more facts. An existing
`project:changed({ slices, cause })` listener still compiles. `rename()` returns `void`. A
parsed value typed `unknown` is refused by `open()`. A value typed `any` still passes, and no
signature can stop that, so the docs must teach passing the file or its text, never a parsed
object.

### The file

A project file is a `graphty-document` version 1 named `<name>.graphty.json`. Its members, in
the container's apply order:

| Member | Holds (published `ProjectSlice` names) | Status |
| --- | --- | --- |
| `graphty-data` | `graph`, embedded in node-link form | exists in the container spec |
| `graphty-session` (new) | `config` (applied first, before data), `layout` (including 2D/3D), `visibility`, `sets`, `views` | new |
| `graphty-arrangement` (new) | `arrangement` and `pins`: an explicit node-id column plus x, y, z and pin columns | new |
| `graphty-results` (new) | `runs`: per run, provenance plus columns; see below | new |
| `graphty-style` | `styles` | exists |
| `graphty-notes` | `notes` | exists |
| `graphty-view-state` (new) | camera and selection; not project state; never sets dirty | new |

Each new member kind is listed in `requires` only when a reader cannot be correct without it.
`graphty-view-state` is never listed there.

Rules the new members follow:

1. **Columns are keyed by id, not by row order.** Every node column travels with its own id
   column, as `ElementTable` already holds it (`session/results/RunResult.ts:209-248`). Edge
   columns are keyed by edge position in this file's data member, and the run records that
   member's `data.fingerprint()`. On open, a fingerprint mismatch restores that run as `stale`
   with `W_DATA_DIFFERS`, so a hand-edited file fails loudly. Graph-scope values are stored
   separately, because 21 result fields are graph-scope.
2. **Numbers are base64 little-endian typed arrays** (`{ dtype: "f64" | "f32" | "i32" | "u8",
   data }`), and strings and booleans are JSON arrays. This keeps `Infinity` and `NaN`, which
   JSON text turns into `null` (`DijkstraAlgorithm.ts:176`). It is also about 40 percent
   smaller than decimal text.
3. **A run keeps its provenance.** Each run stores its id verbatim, plus algorithm, params,
   scope, seed, engine, plugin version, caveats, partial and fields. The label is recomputed,
   not stored. A restored run is marked `origin: "file"`. `E_UNSTABLE_RUN_ID` does not apply
   inside a whole-project file, because the data travels with the results. Without a data
   member, a save leaves edge-scope results out and lists them in `leftOut`.
4. **Only settled state is saved.** `save()` writes the last sealed arrangement capture and only
   completed runs; pending runs go to `leftOut`. `open()` restores positions as settled and does
   not start the layout engine.
5. **The data source's URL is never written.** `graphty-session` keeps the source type, name and
   size only.
6. **The container's trust rules and limits apply to every member.** The whole file is copied
   through the notes reader's `memberCopy` before any member is read: `__proto__` refused, depth
   64, own-name lookups. The default file limit for a project open is set by measurement; see
   the residual risks.

### Open

`open()` works in this order:

1. Read, parse and validate every member.
2. On any whole-file refusal, reject; the session is unchanged.
3. Only then clear the session and ingest.
4. The result is a fresh history with the opened state as its baseline.

If the session is dirty and `discard` is not passed, `open()` rejects with `E_UNSAVED_CHANGES`.
Progress uses the existing `loadProgress` hook. A project open counts its ingest outside the 5 s
opening budget.

### Dirty

`dirty` is not derived from `history.version`. `save()` and `open()` record a marker, which is
the id of the top applied history step (or the baseline), and end the coalescing window. `dirty`
is `true` when any of these holds:

- the step at the cursor is not the marker;
- the marked step was evicted or cleared;
- the project was renamed since the save.

History events with the reasons `size`, `evict` (unless it is the marker), `pending` and
`merge`-into-a-new-window are ignored. Undoing back to the marker makes the project clean.
Camera, selection and `extensions` never set `dirty`, and the docs say so.

## What changed and why

- **One format.** Item 10 became the container plus three member kinds and a view-state member.
  Reason: the owner's decisions 2 and 8, container rule 5, and `notes.md:321`. Every lens found
  this.
- **The `project:changed` event is untouched; `project:status` is new**, mirrored as a DOM
  event. Reason: `types.ts:755` publishes `project:changed` with `{ slices, cause }`, and the
  blind author reproduced TS2717.
- **ProjectSlice replaces ProjectPart.** The new vocabulary is gone, `config` and `pins` are now
  saved, and camera and selection moved to an explicitly non-project member. Reason:
  `types.ts:771-789` and `state.ts:4-6`. Without `config`, a non-default `nodeIdPath` reopens
  with the wrong node ids (`ingest.ts:350`).
- **Dirty uses a saved-step marker.** Reason: `History.ts:951-955` bumps the version on every
  reason, and coalescing (`History.ts:38-43`) would read an edit made just after Save as clean.
- **Results are keyed by id with a fingerprint check, and stored as typed base64.** Reason:
  storing by node order silently shifts values onto the wrong nodes. JSON also loses
  `Infinity`, edge and graph results had no place, and the file was 50.9 MB at 10 runs on
  50,000 nodes.
- **`save()` returns `{ text, report }`, and a new `download()` handles the file.** Reason:
  decision 8 says the element returns text, and the report carries the disclosure list the
  container already requires. `download()` removes the five-line Blob boilerplate and the
  object-URL leak.
- **`open()` takes a string as the file's text only, never a URL.** It refuses over unsaved work
  unless told, and it is atomic up to ingest. Reason: README trust rule 3 says "Nothing is
  fetched", and fetching makes a `?project=` link able to reach intranet hosts. The blind author
  also had to guess what a string meant and what happens to a dirty session.
- **`app: unknown` became reverse-domain `extensions`**, capped at 64 KB per key. Reason: the
  container's mechanism, prototype-pollution risk, and two apps overwriting each other.
- **`missing[].reason` became the existing `Problem` with a code.** Reason: issue #803, and an
  English sentence cannot be localized.
- **`rename()` returns `void`**, is outside history, and sets `dirty`. Reason: `Run<void>`
  exposed `algorithm`, `engine` and `caveats`.

### Findings rejected or downgraded

- **"Decide a zip container (door 1) before version 1."** Rejected. The owner decided "JSON
  only ... There is no zip container" (decision 2). The size argument is answered by typed
  base64 columns inside JSON. A later binary container is a new major of the container, not of
  this item.
- **"Write version 1 as a list of graphs, and move the API to `element.project`" (#828).**
  Downgraded to minor. The container is already a member list. A later
  `requires: ["graphty-graphs"]` member set, where a member without a `graph` key means the
  file's only graph, is refused cleanly by version-1 readers and needs no change to version-1
  files. `session.project` keeps a meaning ("the document this session belongs to") when a
  project owns several sessions.
- **"Store the import plan, every source with its join columns, before calling the format
  final."** Downgraded. The embedded data makes the file self-sufficient, so refreshing from the
  source systems is a new feature. A later `graphty-import` member is additive. It must use
  item 1's mapping shape once that is settled.
- **"A waiting state for missing layout plugins."** Rejected. Positions restore as the settled
  arrangement, so nothing visible is lost. A missing algorithm or layout is a `Problem` naming
  the run or layout id (`W_UNKNOWN_ALGORITHM`, `W_UNKNOWN_LAYOUT`).
- **"500,000 nodes with embeddings is about 600 MB."** Rejected as a version-1 blocker. That is
  ten times the element's own measured load ceiling (`session/limits.ts:19-31`), and the limit
  is refused with `E_TOO_LARGE` on save.
- **"Save the history"** (tier1-design.md:807). Rejected. The history can hold up to 256 MiB of
  patches (`History.ts:35`), and item 10, `undo.md` and the owner's T14 do not need it. Delete
  "history" from tier1-design.md:807.
- **"A `project` attribute on the tag."** Deferred. It is additive, and it is the only path that
  fetches, so it needs its own trust ruling.
- **"A recipe beside the results."** Deferred until recipe recording ships, and additive then.

## One-way doors

1. **The three new member kinds**: `graphty-session`, `graphty-arrangement` and
   `graphty-results` (one-way), with their schemas and their keys (id column, fingerprint,
   typed-column encoding). `graphty-view-state` too, though it is cheap to evolve because it is
   never in `requires`.
2. **The edge key.** Edge columns are keyed by position in the embedded data member plus a
   fingerprint. If edge identity (the ux worktree's door 3) later mints stable edge ids, version
   1 still reads correctly but writes a second form. Decide door 3 first if it can be decided
   within the tier 1 schedule.
3. **The names** `session.project`, `OpenReport.opened`, `E_UNSAVED_CHANGES` and
   `"project:status"` / `graphty-project-status`.
4. **The semantics of `dirty`**: what sets it and what never does.
5. **Prerequisite:** building `session.data.openDocument` and `saveDocument`. Today the element
   reads only the notes member, and no code calls `openDocument`. Their shapes are already owner
   decided, so building them closes no new door. They are, however, the long pole.

## Confidence: medium

High on the direction. Five independent lenses and the blind author converged on the same
format collision and the same event clash, and both are confirmed in source. Medium on the
details:

- the edge key depends on an undecided identity door;
- the typed-column size gain is computed from byte widths, not measured on a real save;
- the project-open limit has no measurement behind it;
- `download()` stretches decision 8's "never labels a file" (a file name is not a media type
  label, but the owner may read it otherwise).

## Residual risks

- **Size at the ceiling.** 50,000 nodes and 100,000 edges with 40 runs of 3 fields is about
  64 MB of typed columns plus about 20 MB of embedded records. That is still over the
  container's 64 MB default. The project-open default needs a measured value (for example 256
  MB, with heap headroom checked against the 2.7 GB resident figure) before the schemas freeze.
  Until then, a heavy analysis session may save a file the default reader refuses. `save()`
  must warn when that will happen.
- **Opening at the ceiling is not fully atomic.** Two graphs do not fit in the heap, so a
  failure during ingest, after validation, leaves an empty session. That failure is rejected
  with its code, but the old work is gone. The `discard` guard limits the exposure to sessions
  the user agreed to discard.
- **The long pole.** The container's open and save verbs are not built. Tier 1's save and
  reopen now waits on them instead of on a private format. That is the right cost, but it is
  schedule risk.
- **The style document reader is unhardened** (`StylesApi.ts:871-900` has no layer or
  expression caps). This exists today with or without item 10, and must be fixed before
  `open()` reads strangers' files.
