# Project Files

A project file is the whole session in one JSON file: the data, the settings, the layout and
where every node stands, each finished algorithm run with its result, the style layers in order,
the filter, the kept sets, the notes, the saved camera views and the selection. Save one, send it
to a colleague, and open it later to pick up exactly where you left off.

> The project file format is a draft (version 1) and may still change before it is declared
> stable.

## Quick start

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { session } = element;
await session.data.addNodes([{ id: "ada" }, { id: "grace" }]);
await session.data.addEdges([{ src: "ada", dst: "grace" }]);

// Save the whole session as one file, with your own app's state beside it
const file = await session.project.save({ name: "Pioneers", app: { panel: "values" } });

// ...later, or in another element: open it again
const report = await session.project.open(file);
report.name; // "Pioneers"
report.app; // { panel: "values" } -- handed back untouched
report.missing; // [] -- anything that did not come back, by kind, with the reason
```

- **`save` returns a `Blob`** (`application/json`). Write it wherever you keep files: a download
  link, the File System Access API, a server. `toDocument()` returns the same content as a plain
  object, synchronously.
- **`open` takes the `Blob`, its text, or the parsed object.** It replaces what the session holds
  and is ONE undoable step: `session.undo()` puts the previous project back.
- **Runs are not computed again.** Each run's result is stored as columns and handed back to the
  run, so a project that took minutes to compute opens at once. Style layers that read a run's
  result paint as soon as the project opens.
- **The `app` slot is yours.** The element stores whatever JSON-safe value you pass and returns it
  from `open`. Keep the state of your own interface there -- which panel was open, which tab --
  and nothing about the graph, which the element already saves.
- **The same API runs in Node.** `createGraphSession()` from `@graphty/graphty-element/session`
  has the same `session.project`.

## Name and unsaved changes

```typescript
session.project.name; // "Pioneers": from the last save or open; null until one is given
session.project.dirty; // false right after a save or an open

await session.data.addNodes([{ id: "linus" }]);
session.project.dirty; // true: something a project file saves has changed

session.on("project:changed", () => {
    // show an unsaved-changes marker from session.project.dirty
});
```

`name` can also be set directly (`session.project.name = "Pioneers 2"`); the next save writes it.
Setting the name is not an undoable step.

## What does not come back

Opening never fails half way. A part that cannot be restored -- a layer whose run is missing, a
set whose rule names something the file does not hold -- is left out and listed in
`report.missing` as `{ kind, id?, reason }`, where `kind` is one of `"data"`, `"config"`,
`"layout"`, `"positions"`, `"runs"`, `"styles"`, `"visibility"`, `"sets"`, `"notes"`, `"views"`
or `"selection"`.

A file that cannot be opened at all is refused with a `GraphtyError`, and the session is left as
it was:

| Code                    | When                                                              |
| ----------------------- | ----------------------------------------------------------------- |
| `E_PARSE_FAILED`        | The file is not JSON                                              |
| `E_BAD_DOCUMENT`        | The JSON is not a project file (no `"format": "graphty-project"`) |
| `E_UNSUPPORTED_VERSION` | A newer graphty-element wrote it; open it with a newer one        |

## What is not saved

- **The live camera.** Save a named view with `session.views.save` to keep a camera position.
- **Work in flight.** A run that has not finished is not saved.
- **The author name** (`session.config.author`): it belongs to the person, not the project.
- **The undo history.** Opening is one step on the history the session already has, so one undo
  puts back what was open before.
