# Pilot: T23, who is a step or two away

Build under study: graphty@0.8.55, build ca8b3b916c22 (commit 6eba30d4e, with uncommitted
changes), served by `real.mjs` at `/?next`, 1440 x 900. Both datasets were walked on the
answer key's success path. No code was changed.

**Result: reached on both datasets. No blockers.**

## A: running club (`A/`, setup `friends.txt`)

| Shot | Step                            | What the screen shows                                                                                                                                                                                                                                                                                           |
| ---- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01   | setup                           | friends.csv open: 20 nodes, 41 edges, Directed, no names drawn.                                                                                                                                                                                                                                                 |
| 02   | `--key /` `--type Ava`          | Find box reads "Ava"; one result under Elements, "Ava".                                                                                                                                                                                                                                                         |
| 03   | `--key Enter`                   | Ava selected (Selection 1); inspector "Ava, Node", Degree 6. The view is reframed on Ava, and the top of the drawing goes past the top edge of the canvas (the known framing issue).                                                                                                                            |
| 04   | `--key g`                       | Inspector "Ava, Neighborhood": Hops 1, Follow All, header "Ava's 6 connections", a Neighbor / weight table (Chloe 5, Ben 3, Dev 2, Ivan 1, Sana 1, Theo 1); Selection 7.                                                                                                                                        |
| 05   | `--click 2`                     | The tool printed `ambiguous: "2" matches 2 controls (input "2", button "Dev 2"); took the first`, and that first one is the Hops segment, as the answer key says. Hops 2: "14 nodes within 2 hops of Ava" with Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo; Selection 15. |
| 06   | `--click "Filter to neighbors"` | The header chip reads "15 of 20 nodes"; 15 dots drawn (counted), all ringed; the list is unchanged.                                                                                                                                                                                                             |

All of it matches the answer key: the count is 14, and the drawing is narrowed to Ava and those
14 people.

## B: Florentine families (`B/`, setup `florentine.txt`)

| Shot | Step                            | What the screen shows                                                                                                                                                             |
| ---- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01   | setup                           | Florentine families: 15 nodes, 20 edges, "Undirected, from the file: directed 0".                                                                                                 |
| 02   | `--key /` `--type Medici`       | Results: Elements "Medici", and under Values "Select where name is Medici (1)".                                                                                                   |
| 03   | `--key Enter`                   | Medici selected (Selection 1), Degree 6. The view is reframed on Medici, and the lowest node now sits partly under the bottom toolbar (about 737,843).                            |
| 04   | `--key g`                       | Hops 1, no Follow row (undirected), header "Medici's 6 connections" listing Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni (no weight column); Selection 7.        |
| 05   | `--click 2`                     | No ambiguity here. "11 nodes within 2 hops of Medici": Acciaiuoli, Castellani, Strozzi, Barbadori, Ridolfi, Tornabuoni, Albizzi, Salviati, Pazzi, Guadagni, Ginori; Selection 12. |
| 06   | `--click "Filter to neighbors"` | Chip "12 of 15 nodes"; 12 dots drawn (counted).                                                                                                                                   |

All of it matches the answer key.

## Notes for graders and for the round

- **Framing after the find box selects a node (already known on this build).** On A the drawing
  runs off the top of the canvas; on B one node sits under the toolbar. Narrowing the drawing does
  not reframe it. In A/06 the 15 dots all fit, but the group sits high and to the right of center.
  Watch for participants who read nodes that are off the canvas or under the toolbar as missing.
- **The two hop lists look different.** At Hops 1 on A the list is a Neighbor / weight table
  sorted by weight. At Hops 2 it becomes a plain alphabetical list of names with no weights. A
  participant who changes the hop count may read that as a different feature. Not a blocker.
- **Nothing on the drawing says which dot is whom.** The setup draws no names, so the narrowed
  drawing can be checked by count only (the chip and the dots). That is enough for the task.
- **Answer-key screenshot numbers.** The key cites `T23A/03.png` for the Hops 1 list and
  `T23A/05.png` for the end state. Those numbers assume `--key / --type Ava --key Enter` is sent as
  one step. Sent as two steps, as in this pilot, the same screens are 04 and 06. Graders should
  match the screen, not the file number.
- **"2" in A.** The tool resolves `--click 2` to the Hops segment even though the name is shared
  with the button "Dev 2". A participant who tries the click on "2" gets the right control, so it is
  not a trap. A participant may still read the `ambiguous` line as a warning that something went
  wrong.
