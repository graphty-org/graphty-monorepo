# T40 A pilot: picked out by letters in a name (Les Miserables)

Build 758b8e8081 (served from `.study-builds/tier3-r1d2-758b8e8081`), viewport 1440 x 900, from an
empty start. This is a targeted walk after a fix pass: the success path by pointer, plus any
route the fixes touched that belongs to this task. Every route the fixes touched belongs to
another task (T38 A, T41 A and B, T44 B, T45 A, T51 A: find-box layers, "New layer from
selection", Control+O > Replace and undo, the both-kinds "+" layer row), so the success path is
the only route walked here. Paths below are relative to this folder.

Reached: the six characters with "Mme" in their name drawn `800080`, everyone else unchanged, the
count readable on screen ("6 of 77 nodes", "name contains Mme, 6 nodes", the key's "6 of 77
nodes"). The data stayed Les Miserables (77 nodes, 254 edges) the whole way.

## Routes walked

| Route | Session | Result |
| --- | --- | --- |
| Success path by pointer | `rp2-pointer/` | S: "name contains Mme, 6 nodes", 6 dots purple, key "Color: Layer 1, 6 of 77 nodes" (`13.png`) |

## Success path (pointer), step by step

1. Samples (the big button; the top bar's Samples link shares the name) opens the sample library
   (`03.png`). 2. "Who holds the novel together": Les Miserables, 77 nodes, 254 edges (`04.png`).
3. "+" beside Style layers ("Add a layer or a folder"): Layer, Folder, Select layers..., Analyze...
   (`05.png`). 4. Layer: "Layer 1", "Node and edge layer", name box focused (`06.png`). 5. Which
   nodes: only expands, "Add a condition" and Done (`07.png`). 6. "Add a condition": `name` and
   `Node id` (`08.png`). 7. `name`: a Contains card, focus in "Type the text to match" (`09.png`).
8. `Mme`: "6 of 77 nodes", the six full names listed over Match case and Done, "Mme de R"
   highlighted under the resting pointer (`10.png`); the layer now reads "Node layer", "Edge not
   styled". 9. Enter keeps `Mme` and closes the picker: "name contains Mme, 6 nodes" (`11.png`).
10. Fill "+" ("Add to node fill"): the Color line, its box focused showing `6366F1` selected
    (`12.png`). 11. `purple`, Enter: `800080`, the key "Color: Layer 1, 6 of 77 nodes" appears,
    six dark purple dots, the drawing stays put (`13.png`).

11 steps, as the answer key. `styles.json` at the end: layer "Layer 1" with the rule `data.name`
contains `Mme`, matched 6, `node.color` `#800080` painted on 6; Everything paints the other 71.

No mismatch with the answer key on this route. No crash, block or wrong result.

## Noticed on the way (known, not grading)

- The sample library's thumbnails are all empty: every
  `https://graphty.app/data/graph-samples/v1/*.webp` request fails with `net::ERR_BLOCKED_BY_ORB`
  (`03.png`). Already recorded in the earlier rounds' reports; the cards' words still identify the
  sample.

## Not walked

- The detours (find box, Filters step, "+" > Layer with six selected) and the keyboard-only walk:
  not part of this targeted walk, and no route the fixes touched belongs to this task. Their last
  walk is `../../r1d1/pilot/T40A/report.md`.
