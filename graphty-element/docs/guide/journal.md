# Journal

The journal is the record of what a session did: one entry for every command that finished,
oldest first. Each entry holds the command exactly as it ran, as plain data, so it can be shown,
logged or saved.

## Quick start

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { session } = element;
await session.data.addNodes([{ id: "ada" }, { id: "grace" }]);

// Hear each entry as it is written
session.on("journal:appended", ({ entry }) => console.log(entry.kind, entry.command));

// A run names the entry its command wrote
const run = session.run({ op: "algo.run", algorithm: "degree" });
await run;
const entry = session.journal.get(run.journalId!); // { id, at, kind: "run", command, runId, ... }

// Everything so far, oldest first
const ops = session.journal.entries.map((each) => each.command.op); // ["data.apply", "algo.run"]
```

## What an entry holds

| Field         | What it is                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `id`          | The entry's id, unique within the session                                                                           |
| `at`          | When the command finished, ISO 8601 UTC with milliseconds                                                           |
| `kind`        | `data`, `run`, `style`, `filter`, `window`, `layout`, `view`, `selection`, `config`, `note` or `set`; more may come |
| `command`     | The command as it ran, as plain data that `JSON.stringify` writes whole                                             |
| `coalesceKey` | Present when the command is part of a continuous gesture, such as dragging a filter slider                          |
| `durationMs`  | How long the command took                                                                                           |
| `runId`       | For an algorithm run, the run it finished                                                                           |
| `engine`      | The graphty-element, algorithms and layout versions that ran it                                                     |

## What is recorded

- **Every command that finishes, and nothing that fails.** A command that is refused or cancelled
  writes no entry.
- **Each member of a batch or a transaction is its own entry**, although undo takes them back as
  one step.
- **A gesture is one entry.** Dragging a filter slider through five values leaves one entry, the
  last value; changing a different filter starts a new one.
- **Looking around is not recorded.** Moving the camera, entering or leaving VR or AR and starting
  or stopping a layout's motion write no entry.
- **A run points at its newest entry.** `run.journalId` is `null` until the run's command has
  finished; running it again points it at the newer entry.

The journal keeps the newest 1000 entries. Change that with `session.journal.cap = 5000`;
`session.journal.clear()` forgets every entry. Neither changes the graph.

The journal is a record, not the undo history. To undo, use `session.undo()`; see
[Undo & History](./undo.md).
