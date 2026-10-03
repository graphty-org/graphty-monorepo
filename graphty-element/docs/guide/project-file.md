# Project Files

A project file is the whole session in one file: the data, the settings, the layout and where
every node stands, each finished algorithm run with its result, the style layers, the filter, the
kept sets, the notes, the saved camera views and the selection. Save one, send it to a colleague,
and open it later to pick up where you left off. Runs are not computed again: their results are
in the file.

A project file is a [graphty document](#the-file) named `<name>.graphty.json`, the same kind of
file graphty-element already writes for styles and notes.

## Quick start

A Save button, an Open button and an unsaved-changes marker in the page title:

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { project } = element.session;
const saveButton = document.querySelector("#save")!;
const openInput = document.querySelector<HTMLInputElement>("#open")!;
saveButton.addEventListener("click", () => {
    void element.downloadProject();
});
openInput.addEventListener("change", () => {
    const file = openInput.files?.[0];
    if (!file || (project.dirty && !confirm("Discard unsaved changes?"))) {
        return;
    }

    void project.open(file, { discard: true }).then((report) => {
        for (const problem of report.problems) {
            console.warn(problem.code, problem.params);
        }
    });
});
element.session.on("project:status", ({ name, dirty }) => {
    document.title = `${dirty ? "* " : ""}${name ?? "Untitled"}`;
});
```

- **`element.downloadProject()`** saves the project and hands it to the reader as
  `<project name>.graphty.json`. A project with no name downloads as `project.graphty.json`, a
  fixed file name rather than words for the reader: pass `{ fileName }` to choose the name
  yourself. It resolves to the [save report](#saving-without-a-download); its `leftOut` lists a
  run still computing, which the file does not hold.
- **`project.open(file)`** takes the `File` (or any `Blob`), its bytes, or its text. It never
  takes a URL: nothing is fetched. Opening a project replaces what the session holds and starts a
  fresh undo history.
- **`project.dirty`** is true when something the file saves has changed since the last save or
  open. Opening a project over unsaved changes is refused with `E_UNSAVED_CHANGES` unless you pass
  `{ discard: true }`, which means "discard the session's unsaved changes". Check `project.dirty`
  and ask the reader first, as the example does.
- **`project:status`** fires when the name or `dirty` changes, and not when the page starts: until
  then read `project.name` (null) and `project.dirty` (false) yourself. `session.on` returns a
  function that stops listening. The element also dispatches the change as the DOM event
  `graphty-project-status`, with `{ name, dirty }` as its typed `detail`.

graphty-element writes no words for the reader: the text in the example (the confirmation, the
title, "Untitled") is the page's own.

To catch the refusal instead of checking `dirty` first, test the error's code:

```typescript
import { isGraphtyError } from "@graphty/graphty-element";

try {
    await project.open(file);
} catch (error) {
    if (isGraphtyError(error) && error.code === "E_UNSAVED_CHANGES" && confirm("Discard unsaved changes?")) {
        await project.open(file, { discard: true });
    } else {
        throw error;
    }
}
```

## Saving without a download

`project.save()` returns the file's text and a report, and works in Node too, through
`createGraphSession()` from `@graphty/graphty-element/session`:

```typescript
const { text, report } = await session.project.save();
report.bytes; // the file's size
report.written; // the members in the file, such as "graphty-data" (see "The file")
report.leftOut; // what is not in it: a run still computing, as { code: "W_RUN_PENDING", params: { id } }
```

Store `text` wherever you keep files. Two options shape the file:

- `leaveOut: ["graphty-notes"]` leaves members out: `"graphty-style"` (the style layers),
  `"graphty-notes"` (the notes) or `"graphty-view-state"` (the selection). This option is what
  you chose to leave out; the report's `leftOut` is what the element could not write, as codes.
- `extensions: { "com.example.app": { panel: "values" } }` stores your own data under a
  reverse-domain name, at most 64 KB of JSON each. `open` hands it back as `report.extensions`.
  Keep your interface's state there, and nothing about the graph.

## The name and unsaved changes

```typescript
await session.project.rename("Pioneers"); // one undoable step; sets dirty
session.project.name; // "Pioneers"
await session.undo(); // the old name again
```

A file with no name of its own takes the file's name without `.graphty.json`.

`dirty` follows the undo history: undoing back to the point of the last save makes it false again.
The selection and your extensions never set it.

## What did not come back

Opening never fails half way through. A part that cannot be restored is left out and listed in
`report.problems`, each as a code and its values. An `E_` code here means that one part was
skipped, not that the open failed; the open failed only if `open` threw. `slice` is the part the
problem is about, one of the `report.restored` values below:

| Code                    | Params                   | What happened                                                           |
| ----------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `E_UNKNOWN_ALGORITHM`   | `slice`, `id`            | A run's algorithm is not registered here; the run is left out           |
| `E_UNKNOWN_LAYOUT`      | `slice`                  | The layout is not registered here; the positions still come back        |
| `E_UNKNOWN_ATTRIBUTE`   | `slice`, `id`, `needs`   | A style layer reads something nothing answers; it is added switched off |
| `W_DATA_DIFFERS`        | `slice`, `id`            | The data was edited by hand; the run's per-edge values are left out     |
| `W_UNKNOWN_KIND`        | `index`, `kind`          | A member this release does not read; skipped                            |
| `E_UNSUPPORTED_VERSION` | `index`, `kind`, `found` | A member written by a newer release; skipped                            |

`id` is the run, style layer or set the problem is about. `needs` is the list of data paths the
layer reads that nothing in this session provides, such as
`"algorithmResults.graphty.degree.value"`. `index` and `kind` name a member of the file by its
position and kind. An `E_UNSUPPORTED_VERSION` here skips one member; the same code thrown (below)
refuses the whole file.

`report.restored` lists the parts that came back. Each part comes from one member of the file:

| Part                                                        | From the member       |
| ----------------------------------------------------------- | --------------------- |
| `"graph"`                                                   | `graphty-data`        |
| `"config"`, `"layout"`, `"visibility"`, `"sets"`, `"views"` | `graphty-session`     |
| `"arrangement"`, `"pins"`                                   | `graphty-arrangement` |
| `"runs"`                                                    | `graphty-results`     |
| `"styles"`                                                  | `graphty-style`       |
| `"notes"`                                                   | `graphty-notes`       |

`config` is the settings, `arrangement` where each node stands, `pins` the pinned nodes,
`visibility` the filter and time window, `sets` the kept sets, and `views` the saved camera views.
Both lists may gain values in a minor release; leave out a code you do not know.

A file that cannot be opened at all is refused with a `GraphtyError`, and the session is left as
it was:

| Code                    | When                                                                     |
| ----------------------- | ------------------------------------------------------------------------ |
| `E_UNSAVED_CHANGES`     | A project would replace unsaved changes and `discard` was not passed     |
| `E_TOO_LARGE`           | The file is over `limits.fileBytes` (default 256 MiB)                    |
| `E_PARSE_FAILED`        | The file is not JSON                                                     |
| `E_UNKNOWN_FORMAT`      | The JSON is not a graphty document; import graph data with `data.import` |
| `E_BAD_DOCUMENT`        | The document is malformed                                                |
| `E_UNSUPPORTED_VERSION` | A newer graphty-element wrote it                                         |
| `E_UNSUPPORTED`         | It requires a member kind this release does not read                     |

## Other graphty documents

`open` also takes a graphty document that is not a project, such as a saved style or notes: one
with no `graphty-session` member. Then `report.opened` is `"document"` (rather than `"project"`)
and the file's styles and notes are added to the session as one undoable step, without replacing
anything and without asking about unsaved changes.

## What is not saved

- **The live camera.** Save a named view with `session.views.save` to keep a camera position.
- **Work in flight.** A run that has not finished is listed in `report.leftOut`.
- **The author name** (`session.config.author`): it belongs to the person, not the project.
- **The undo history.** An opened project starts a fresh one.

## The file

You need this section only to read or write the file yourself. A graphty document (`kind: "graphty-document"`, version 1) whose members are:

| Member                | Holds                                                              |
| --------------------- | ------------------------------------------------------------------ |
| `graphty-data`        | the nodes and edges, embedded in the `node-link` JSON dialect      |
| `graphty-session`     | the settings, layout, filter and time window, sets and named views |
| `graphty-arrangement` | each placed node's id and position, and the pinned nodes           |
| `graphty-results`     | each finished run: what ran, its fields, and its values as columns |
| `graphty-style`       | the style layers                                                   |
| `graphty-notes`       | the notes                                                          |
| `graphty-view-state`  | the selection; never needed to open the file                       |

Node values are keyed by node id. Edge values are keyed by the edge's position in the data
member, with the data's fingerprint beside them, so a hand edit of the data is detected rather
than shifting values onto other edges. A column of numbers is stored as base64 little-endian
`f64` bytes, so `Infinity` and `NaN` survive; any other column is a JSON array.
