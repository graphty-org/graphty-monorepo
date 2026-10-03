# Blind-author review: the project file (section 10, issue #301)

The reviewer wrote the canonical example for "save the whole session to a file and open it
again" as a third-party developer. The only sources were section 10 of `element-api-decisions.md`
(read as the published docs page) and `graphty-element/docs/guide/*.md`. The reviewer did not read
the repository source. The type-check below used the built `.d.ts` files only as a compiler input.

## The example

`review/blind-10.ts` (19 code lines; the target was about 15):

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { project } = element.session;

document.querySelector("#save")!.addEventListener("click", async () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(await project.save());
    link.download = `${project.name ?? "untitled"}.graphty`;
    link.click();
});

document.querySelector<HTMLInputElement>("#open")!.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const report = await project.open(file);
    for (const m of report.missing) console.warn(`${m.part} not restored: ${m.reason}`);
});

element.session.on("project:changed", () => {
    document.title = `${project.dirty ? "* " : ""}${project.name ?? "Untitled"}`;
});
```

Five of the 19 lines turn a `Blob` into a download. Those lines also leak the object URL, because
the docs never mention `revokeObjectURL`. That is boilerplate every consumer will write, and the
first thing a consumer of a "save" call wants is a file on disk.

## Did it compile

The scratch setup is in `tmp/api-review/blind-10/`. It holds a copy of the built
`graphty-element/dist`, `project-stub.ts` (section 10's signatures merged into the published
`GraphSession` and `SessionEventMap` with module augmentation), and `tsconfig.json` with
`strict: true`. The check command was `tsc -p .`.

- **The example compiles.** It compiles only because its `project:changed` handler ignores the
  payload.
- **Section 10's own declarations do not compile against the published types:**

  ```
  project-stub.ts(24,9): error TS2717: Subsequent property declarations must have the same type.
  Property '"project:changed"' must be of type '{ readonly slices: readonly ProjectSlice[];
  readonly cause: HistoryCause; }', but here has type '{ readonly name: string | null;
  readonly dirty: boolean; }'.
  ```

  `project:changed` is already published with `{ slices, cause }` (`docs/guide/events.md:223`,
  `docs/guide/undo.md:225`, `docs/guide/javascript-api.md:178`). It fires on every project-state
  change, and the record table relies on it to re-read pages. Section 10 "gains" an event that
  already exists and gives it an incompatible payload. Changing it would break every current
  listener, and the section never says that.
  With `skipLibCheck: true` (a common consumer setting) the conflict is silently hidden when the
  stub is a `.d.ts`. That is how the first run exited 0.
- **Probes (`probe.ts`):**
  - `s.project.open(JSON.parse(...))` compiles with no error, because `JSON.parse` returns `any`.
    Developers who learned `notes.mergeDocument(JSON.parse(...))` from `notes.md:32` and `notes.md:317` will pass a
    parsed object. The compiler accepts it, and what happens at runtime is undefined.
  - `s.project.app.inspectorTab` fails with `TS18046: 's.project.app' is of type 'unknown'`.
    Every consumer has to cast or validate the slot. There is no generic and no validation hook.
  - `s.project.rename("x").id` compiles. A `Run<void>` returned from a rename carries `algorithm`,
    `params`, `scope`, `engine`, `fields` and `caveats` (from the `Run` interface). None of these
    means anything for a rename.

## Every place I had to guess

1. **Which type is `Session`.** No published type is called `Session`. The guides only ever say
   `element.session`. I guessed `GraphSession`.
2. **What `open(string)` means.** The parameter takes `string` and `URL`. Is a string a URL, a
   path, or the file's JSON text? The section does not say. The probe shows that a stringified
   document compiles either way.
3. **Whether `open` replaces or merges.** It says "a fresh history", which implies replace. But
   `notes.md:330` says "Opening always merges; it never deletes a note". A reader who learned that
   rule cannot tell whether opening a project deletes the notes they have now.
4. **What `open` does with unsaved changes.** It does not refuse, warn or return the lost work.
   A careful consumer has to check `dirty` and confirm before calling it, and nothing in the docs
   tells them so.
5. **Which file `open` accepts.** `notes.md:321` already tells readers to keep work in
   `*.graphty.json` files, which are bare notes documents. Section 10 suggests `.graphty`. Will
   `open()` accept a `.graphty.json` notes or styles document, or a GraphML file? The only error
   it names is `E_UNSUPPORTED` for a newer version.
6. **What to name the download.** "Suggested extension `.graphty`" is advice, and the Blob has no
   name. I built `${name}.graphty` myself and guessed the `untitled` fallback.
7. **Where `name` comes from.** After `open(file)`, is it the `name` key inside the file or the
   file name? It is `null` before the first save. Does `save()` set it?
8. **When `dirty` changes, and how I hear about it.** `dirty` means "history moved past the saved
   version". Does `save()` fire `project:changed`, even though no project state changed? Does
   `rename()` fire it? Does `rename()` itself make the session dirty (it returns a `Run`, so is it
   an undoable step)? I hung the title on `project:changed` and hoped.
9. **Whether the camera and the selection are saved.** `ProjectPart` lists `"camera"` and
   `"selection"`, and so do `"labels"` and the file's `view.camera`. But `undo.md:41-44` says,
   in so many words, that the selection and the camera are not undoable "because a project does
   not save them". One of the two pages is wrong. If the file does save them, `dirty` (which
   follows history) stays `false` after the camera moves. Closing the tab then loses state the
   file would have kept, and the API reported nothing to save.
10. **Whether `reason` is fit to show users.** Section 10's own example joins `reason` strings
    into a user notification. That makes them English UI text owned by the element, with no code
    to localize or branch on. `missing[].part` is the only machine-readable field.
11. **What happens to unfinished work.** Does `save()` during a running algorithm or a moving
    layout wait, refuse, or write a partial file? `undo.md` says a pending run is not project
    state. The section never mentions pending work.
12. **How big the file gets.** The data is inlined as JSON. Nothing tells me whether a
    100,000-node graph saves, or how big that file is.
13. **What is allowed in the `app` slot.** I could not tell whether any JSON value works, whether
    there is a size limit, or what happens to a non-JSON value (a `Map`, a `Date`).

## Names that misled me

- **`project:changed`** already means "project state changed, here are the slices". The section
  reuses the name for "name or dirty changed".
- **`ProjectPart` vs the published `ProjectSlice`.** Both list what a project is made of, with
  different spellings. `undo.md:226-227` publishes the slices as `"graph"`, `"runs"`, `"pins"`,
  `"arrangement"` and `"config"`. The parts are `"data"`, `"results"`, `"positions"`, `"camera"`,
  `"selection"` and `"labels"`. A consumer that maps one to the other has to keep a translation
  table, which CLAUDE.md forbids for the app.
- **`Session` vs `GraphSession`.**
- **`dirty`.** This is reasonable vocabulary, but it is defined in terms of history, while the
  file includes non-history parts (see guess 9). The name promises "the file differs from the
  screen", and the definition does not deliver it.
- **`.graphty` vs `.graphty.json`.** These are two extensions one suffix apart, for files that
  `notes.md` and section 10 each call "the project file".
- **`rename` returning `Run<void>`.** "Run" means an algorithm run in every guide except
  `undo.md:192`. A rename that hands back an object with `algorithm` and `engine` fields reads as
  a bug.

## Internal concepts I had to name

- The `ProjectPart` vocabulary, to print anything useful from `missing`.
- History, to understand `dirty` ("history moved past the saved version").
- "By node order" (results and positions stored as columns by node order). The file is sold as
  readable in a text editor, but deleting one node record by hand silently shifts every result
  and position after it onto the wrong node. A reader cannot safely edit the file the format
  invites them to read.
- The Blob and object-URL download dance. This is not a graphty concept, but the element pushes
  it onto every consumer.

## What a blind author needed and did not find

- A one-call download, such as `project.save({ download: true })` or
  `project.download(filename?)`, that names and revokes the file itself.
- A declarative path for the simplest case: a static page that shows a saved project with no
  script at all (an attribute such as `project="demo.graphty"`). Every other first graph in
  `getting-started.md` works from the tag alone.
- A DOM event twin (such as `graphty-project-change`) to match `graphty-history-change` and the
  other change events in `events.md`, for consumers who listen on the element.
- A stated rule for `open` on a dirty session, and whether `open` can be undone.
- Error codes for a wrong file type, malformed JSON, and a file whose data does not match its
  results or positions.
