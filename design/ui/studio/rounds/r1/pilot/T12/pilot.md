# Pilot: one character and who he is tied to (both datasets)

Build under study: commit e82708488eea, graphty@0.8.53, no uncommitted changes. Both prompts were
walked from an empty start with the success path in `answers.md`. Screenshots are in this folder
(Les Miserables) and in `florentine/` (Florentine families).

## Result

**End state reached on both datasets, with no detour and no console error.** Nothing blocks the
task.

## Les Miserables (prompt A)

| Step                       | Screenshot | What the screen shows                                                                                 |
| -------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| Empty start                | 01         | Start page, sample cards, usage card.                                                                 |
| `--click "No thanks"`      | 02         | Usage card answered; "Change this in Settings > Privacy".                                             |
| `--click "Les Miserables"` | 03         | 77 nodes, 254 edges drawn; Overview on the right.                                                     |
| `--key /`                  | 04         | Find box focused.                                                                                     |
| `--type Javert`            | 05         | Results: Elements "Javert"; Values "Select where name is Javert (1)".                                 |
| `--key ArrowDown`          | 06         | "Javert" row highlighted.                                                                             |
| `--key Enter`              | 07         | Javert selected (gold ring); Summary: id Javert, name Javert, Degree 17; focus on the Summary values. |
| `--click "Degree"`         | 08         | Panel "Javert -- Neighborhood", list "Javert's 17 connections"; Selection 18.                         |

The 17 names in 08, top to bottom: Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine,
Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint,
Valjean, Woman1, Woman2. They match the answer key exactly, in the same order.

The Neighborhood route was also checked: Escape from the list returns to Javert's Summary (09);
selecting Javert again through Find and pressing `g` (12, 13) opens the same "Javert's 17
connections" list with focus on it. (11 is an unrelated click on empty canvas, which cleared the
selection as expected.)

## Florentine families (prompt B)

| Step                                            | Screenshot | What the screen shows                                                                                 |
| ----------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| Empty start, "No thanks", "Florentine families" | 01, 02     | 15 nodes, 20 edges drawn.                                                                             |
| `--key /`, `--type Medici`                      | 03         | Results: Elements "Medici"; "Select where name is Medici (1)".                                        |
| `--key ArrowDown`, `--key Enter`                | 04         | Medici selected; Summary: id, name, Degree 6.                                                         |
| `--click "Degree"`                              | 05         | "Medici's 6 connections": Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni; Selection 7. |

The six names match the answer key.

## Observations (not blockers)

- **The drawing is pushed off the bottom after a selection.** Selecting a node re-centers the
  camera on it without keeping the whole graph in view. On Les Miserables (07 onward) the lowest
  cluster runs off the bottom of the canvas behind the floating toolbar; on Florentine families
  (04, 05) the lowest family sits under the toolbar. A participant who wants to see all of Javert's
  highlighted neighbors on the drawing loses part of it. Kind: app or element (where the
  select-to-focus camera move lives was not checked).
- **No names are drawn on the canvas** in either sample, so the neighbors cannot be read off the
  drawing; the panel list is the only place. The success path does not need drawn names.
- **Overview wording (03, florentine/02):** the edge row reads "Undirected, from the file: directed
  0", which is hard to parse, and one label is cut to "Edges per ...". Seen on the way, not part of
  this task.
- Answer key: the path and its notes ("focus moves to the node's Summary values", the
  Neighborhood route through `g`) hold on this build. The key counts for the keyboard routes were
  not re-counted in this pilot.
