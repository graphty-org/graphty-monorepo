# Pilot: T44A, names on the drawing (Les Miserables)

Build: 6de5f95d12 (frozen, `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d1-6de5f95d12`).
Targeted re-pilot: one session, the success path by pointer, from the empty start page
(`6de5f95d12/pointer/`). The routes named for this pass (opening a file and the Poster and
Thank-you cards layers, saved projects from an earlier build, the table's Nodes tab after a
community run, Control+O > Replace after a hand-picked or find-box layer) do not belong to this task:
T44A opens a sample and adds a label on Everything, and none of those routes is on its path or its
detours. So none was walked here. The earlier passes' sessions are kept in `pointer/`, `detours/`,
`keyboard/` (build ed4351b258) and `5bd16cda6e/`.

The data stayed the sample's own the whole way: 77 nodes and 254 edges (Values tab, `05.png`),
the characters' names on the drawing, and "Everything styles all 77 nodes".

**Reached:** yes, in 8 steps as the answer key gives them. The final style tree
(`6de5f95d12/pointer/styles.json`) holds `node.label` by `data.name` on Everything, painted on 77 of
77 nodes, with `node.labelStyle` size 96. Cosette reads at the default framing (`21.png`).

## Success path by pointer (`6de5f95d12/pointer/`)

| Step | What was done | What the screen showed | Screenshot |
| ---- | ------------- | ---------------------- | ---------- |
| - | No thanks (consent) | Start page: "Open a file", "Open network data", "Samples", "New project" | `02.png` |
| 1 | Samples (the button; a "Samples" link in the top bar shares the name) | Sample library; every card's picture is a broken-image icon | `04.png` |
| 2 | "Who holds the novel together" | Les Miserables, 77 nodes, 254 edges; a "private window" notice with Save | `05.png` |
| 3 | Everything | Style > Node; "Everything styles all 77 nodes: it is the base layer..." | `06.png` |
| - | Hover Text "+" | Tooltip "Add to node text" | `07.png` |
| 4 | Text "+" | Menu Label (highlighted), Card, Tooltip | `08.png` |
| 5 | Label | Picker "Label" opens by itself, nothing highlighted: Find an attribute, Fixed text, Data: name, Structure: Node id; the line reads "Pick a value" | `09.png` |
| - | Enter in the empty search box | Takes nothing; picker stays open | `10.png` |
| 6 | name | Every node labeled; "77 labels, 0 hidden"; focus on the "name" source box | `11.png` |
| 7 | Label settings (gear; tooltip "Label settings", name "Node label settings") | Panel "Label settings" with Close, Size 48 (spoken "Size, default 48"), link icon, "Scene units" | `12.png`, `13.png` |
| 8 | Size box: 96, Enter | Every label doubles; "77 labels, 14 hidden"; focus stays in the box; a reset minus appears | `17.png`, `18.png` |

Field checks in the Size box: typing 50 then Escape reverts with "Edit discarded; this stays 96."
in a narrow column (`19.png`); Tab goes to the reset minus (`20.png`); Escape there closes the panel
with focus on the gear (`21.png`). All as the answer key says.

## Answer key against the screen

No mismatch. Every step, label, count ("77 labels, 0 hidden", then "14 hidden" at 96), tooltip,
accessible name and key behavior in the key matched the screen.

## Defects

None that crashes, blocks the task or would spoil its grading. Seen on the way:

1. **Every sample card shows a broken-image icon** (`04.png`). The pictures are fetched from
   `https://graphty.app/data/graph-samples/v1/<name>.webp`, which answers 404 with an HTML page, so
   the browser blocks each one (`ERR_BLOCKED_BY_ORB`, 34 failed requests at the start page). The
   card titles and counts still let a participant find Les Miserables.
2. **Not a participant route, recorded for the tool:** a click on the Size box by its name failed
   because the field's drag-to-change slot sits over the box for a scripted click; the same box at
   its point on screen takes the click and focus (`16.png` to `17.png`, hover check `23.png`).
   After that failed click and a Control+A sent with no text field focused, the panel's own scroll
   moved its header ("Label settings", Close) out of view and selected all page text (`16.png`);
   reopening the panel showed it whole again (`22.png`).

## Skipped

- The detour walk and the keyboard-only walk: this pass is a targeted re-pilot that walks only the
  success path plus the listed routes the fixes touched, and none of those routes belongs to T44A.
