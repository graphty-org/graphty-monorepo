# Pilot: T6, what did I get?

Build under study: commit 452285142099, graphty@0.8.53, opened at `/?next` from an empty start.
The earlier pilot of this task, on commit 9d6598eea3e9, is kept in `build-9d6598e/`.

## Result

**The end state is reached in three steps, matching the success path in the answer key.** All four
answers can be read off the screen, and every one is correct:

| Question                              | Answer on screen     | Where                     |
| ------------------------------------- | -------------------- | ------------------------- |
| How many characters                   | 77 (Nodes)           | Values > Overview, 03.png |
| How many connections                  | 254 (Edges)          | Values > Overview, 03.png |
| Can every character reach every other | Components 1, so yes | Values > Overview, 03.png |
| Facts recorded about each character   | `id`, `name`         | Data > Attributes, 05.png |
| Facts recorded about each connection  | `shared_chapters`    | Data > Attributes, 05.png |

The table (Shift+T) confirms the same columns: Nodes shows `id` and `name` for 77 nodes (06.png),
Edges shows From, To and `shared_chapters` for 254 edges (07.png).

No script errors, console errors or failed requests were reported at any step.

## Steps

| #   | Step                                       | What the screen showed                                                                                                                                                                               |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | start, empty                               | Start page; Samples lists Les Miserables, "77 characters"; the usage card at the foot.                                                                                                               |
| 02  | `--click "No thanks"`                      | Card replaced by "Usage data stays off. Change this in Settings > Privacy".                                                                                                                          |
| 03  | `--click "Open the Les Miserables sample"` | Graph drawn and settled. Inspector header reads "Graph / From Les Miserables" (once), on Values > Overview: Nodes 77, Edges 254, Density 0.08681, Components 1, "Edges per ..." 1 to 36, mean 6.597. |
| 04  | `--hover "Edges per"`                      | `tooltip: null`; the label stays truncated. The tool reports the full name "Edges per node" exists in the page.                                                                                      |
| 05  | `--click "Data"` (rail)                    | Sources (77 nodes, 254 edges) and Attributes: Nodes `id`, `name`; Edges `shared_chapters`.                                                                                                           |
| 06  | `--key Shift+T`                            | Table opens on Nodes: 77 nodes, columns `id`, `name`.                                                                                                                                                |
| 07  | `--click "role=tab:Edges"`                 | Table on Edges: 254 edges, columns From, To, `shared_chapters`.                                                                                                                                      |

## Findings (none blocks the task)

All three app findings of the earlier pilot are still present on this build.

1. **app-defect, minor: the direction line repeats the file's raw syntax.** The Overview row
   under Edges reads "Undirected, from the file: directed 0" (03.png). "directed 0" is the GML
   source line, not a word a reader knows; the row has no label, so it reads as a stray value,
   and it runs past the right edge of the value column. graphty-element returns the neutral fact;
   the wording is the app's to fix.
2. **app-defect, minor: "Edges per ..." is truncated with no tooltip** (03.png, 04.png). The full
   label, "Edges per node", is in the page but not visible, and hovering shows nothing.
3. **app-defect, minor: Sources rows are truncated** ("Les Mis...", "Node t...", "Ed...", 05.png):
   the row counts are visible but the names are not at the default panel width.
4. **task-wording, note only:** the prompt says "characters" and "connections"; the screen says
   Nodes and Edges. The start page's "77 characters" bridges the first; nothing bridges
   "connections" to "Edges", but the number sits right there, so it is unlikely to mislead.

No element-defect, tool-defect or answer-key problem was found.
