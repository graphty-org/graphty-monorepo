# Pilot: T10, names on every dot

Build under study: graphty@0.8.53, commit e82708488eea. Both datasets were walked on the success
path in the answer key with `real.mjs`, from an empty start. Les Miserables is in this folder
(01.png to 05.png); College football is in `college-football/` (01.png to 05.png).

**End state reached on both datasets.** No blockers.

## Les Miserables

| Shot   | Step                               | What the screen shows                                                                                                                                |
| ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01.png | empty start                        | Start screen with the usage card; Les Miserables listed under Samples.                                                                               |
| 02.png | "No thanks", then "Les Miserables" | 77 dots, no names drawn, as the prompt says. Outline has Selection and Everything.                                                                   |
| 03.png | "Everything"                       | The inspector opens on Everything's Style tab (Nodes): Fill, Shape, Effects, Label (+), Tooltip (+).                                                 |
| 04.png | "Add label line"                   | A label line appears ("Pick an attribute") with an attribute picker open: id, name. id is highlighted first.                                         |
| 05.png | option "name"                      | Names drawn above the dots. The line reads "Aa Above / Abc name", and under it "77 labels, 7 hidden to avoid overlap", the answer key's exact words. |

## College football

| Shot   | Step                                 | What the screen shows                                                                                                                                                    |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 01.png | empty start                          | Same start screen.                                                                                                                                                       |
| 02.png | "No thanks", then "College football" | 115 dots, no names drawn.                                                                                                                                                |
| 03.png | "Everything"                         | Same Style tab as above.                                                                                                                                                 |
| 04.png | "Add label line"                     | Picker offers id, label, value; id highlighted first.                                                                                                                    |
| 05.png | option "label"                       | Team names drawn ("GeorgiaTech", "Maryland", "ArizonaState" ...). The line reads "Abc label" and "115 labels, 14 hidden to avoid overlap", the answer key's exact words. |

## Observations (not blockers)

These do not stop the task but may affect how participants do, and are worth watching in the round:

- The hidden-for-overlap count is small, light gray text under the label line. A participant has to
  read it to pass, so a participant who misses it is graded "solved with difficulty"; if several
  miss it, its prominence is an app finding.
- The attribute picker highlights `id` first. On College football `id` is not the team name, so
  pressing Enter or taking the first entry is a `wrong-attribute` path the answer key already covers.
- The drawn names are very small at the default zoom, in a serif face unlike the app's, and on Les
  Miserables several in the dense center are hard to read in the screenshot. They are drawn, so the
  task is met; legibility is a possible finding if participants complain.
- After the line is added, the Label section's "+" turns dim. Not needed for this task.
- There is no control that shows every name (the answer key expects this; the participant must say
  why some are hidden).
