# Pilot: T13, a picture and the numbers for a report

Build under study: commit b7590f8de, graphty@0.8.53 (`session.json`). Start: the round 2 setup
file `rounds/round-2/setups/T13.txt` (decline the usage card, open the Les Miserables sample, run
Louvain from Analyze). It ran whole.

**Result: the end state is reached.** Both files the task asks for were downloaded by the
answer key's round 2 path, 9 steps, with no detour.

## The walk

| Shot | Step | What the screen shows |
|---|---|---|
| 01 | setup | Louvain run: six groups in the outline (20, 17, 11, 11, 10, 8), drawing colored, key "Color: Louvain" with Group 1 to Group 6 at the canvas's top left |
| 02 | `--key Control+e` | Export dialog, Image row chosen; preview shows the drawing with its key |
| 03 | `--click "role=button:Export"` | `les-miserables_current-view.png` saved (1806 x 1720); toast "Exported les-miserables_current-view.png" |
| 04 | `--key Control+e --click "Data"` | Data row; format "Graphty JSON" (the whole project), JSON preview |
| 05 | `--click "Format"` | Format list open (Graphty JSON checked, CSV among 18 formats). Tool printed `ambiguous` (see below) |
| 06 | `--click "role=option:CSV"` | CSV, Table "Edges"; yellow box "CSV cannot hold everything"; preview `source,target,shared_chapters` |
| 07 | `--click "Table"` | Table list: Edges, Nodes, Adjacency List. Tool printed `ambiguous` |
| 08 | `--click "role=option:Nodes"` | "One row per node, with every computed value - CSV"; preview `id,name,results.louvain.group,results.louvain.groupSize` |
| 09 | `--click "role=button:Export"` | `les-miserables_nodes.csv` saved (1,956 bytes); toast "Exported les-miserables_nodes.csv" |

No script errors, console errors or failed requests were printed at any step.

## The files against the key

**The picture** (`downloads/les-miserables_current-view.png`) passes the picture checklist:

- the same 77 nodes in the same arrangement as shot 09 (the canvas area at 2x);
- a key titled "Color: Louvain" naming Group 1 to Group 6 with the same six colors as the
  screen; the key in the image covers no node;
- sizes are not in use and no names are drawn, so neither needs to appear.

**The numbers** (`downloads/les-miserables_nodes.csv`): 77 rows plus a header, columns `id`,
`name`, `results.louvain.group`, `results.louvain.groupSize`. Group sizes 20, 17, 11, 11, 10, 8,
matching the outline. Group 1 holds exactly the 20 members the reference values list (Bamatabois
... Woman2, Valjean among them).

## Blockers

None stop the task. Findings worth recording:

- **Tool (`ambiguous` on a labeled select).** `--click "Format"` and `--click "Table"` each print
  `ambiguous: ... matches 2 controls (combobox "...", label "...")`. The label and the combobox
  it labels are one control to a person; the tool counts them twice. It took the right one, but
  graders are told to record every `ambiguous`, so each T13 session will carry two false ones.
- **Element and graph-io (English sentences in a returned warning).** The yellow box lists
  sentences written by graph-io's CSV exporter: "the generic dialect has no direction column;
  254 undirected edges read back as directed unless the importer is told otherwise" and "... are
  written only by a second export with table: \"nodes\"". These are developer words a report
  writer cannot act on, and they arrive as finished English instead of a code and parameters the
  app could word. The nodes table's box also still lists edge columns that "cannot be written",
  which do not concern that file.
- **Not checked here:** the screen-reader check (the live region's "Exported ..." text). The
  toasts show the text on screen; this walk did not run in screen-reader mode.
