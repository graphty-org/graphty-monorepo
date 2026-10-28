# Hand pilots of the tier 3 answer key (build 31e8c2387, 2026-10-17)

Four tasks walked from the empty start screen with `real.mjs`, by clicks and keys only, to check
the success paths and reference values in `../answers.md`. Each folder holds the screenshots,
`session.json`, and the style tree at the start and the end (`styles-start.json`, `styles.json`,
`styles-steps.jsonl`).

| Folder  | Task half                                | Ended on                                                                                       |
| ------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `T41A/` | volunteers: trained and no phone, in red | 4 of 24 red (`17.png`); the picker reads "trained: yes, 15" and "phone: no value, 7"           |
| `T46A/` | Les Miserables: Javert's circle in red   | 6 circles; Javert in Group 3 of 11 (`08.png`, `10.png`); Group 3 red (`11.png`)                |
| `T47B/` | College football: every cluster as cubes | 10 clusters, shape Box written to every group layer, each color kept (`21.png`, `styles.json`) |
| `T49A/` | Les Miserables: red, then put back       | follow-up given at the first `--end`; Control+Z put `#6366F1` back (`07.png`)                  |

## What the pilots and the scripted walk found, for the dry run

Each is a defect a participant could hit, for the dry run to triage before round 1. None is scored
as a study finding.

1. **axe, serious:** the add-a-condition menu has a field with no accessible name
   (`aria-input-field-name`), and a number card's slider thumbs are below the target size
   (`target-size`, 2 per card). From `bars.mjs --tier 3` on this build; bar 6 fails until fixed.
2. **A new Shape line takes focus but not typing:** on the run's folder, adding Shape puts focus on
   the shape box; typing "box" does nothing until the list is opened by a click
   (`T47B/12.png`, `13.png`).
3. **A new text card's focus:** focus lands on its "contains" menu, so typing straight away goes
   nowhere; the text box needs a click.
4. **A new Color line's focus:** focus lands on the swatch button, so typing a color straight away
   goes nowhere (the tool prints "nothing that takes text has focus").
5. **Find and names with no spaces:** College football's team names are one word
   (`FloridaState`); "Florida State" finds nothing and "Florida" finds the University of Florida
   (`T47B/08.png`, `16.png`). T46 B now names Nebraska; whether the find box should match across
   missing spaces is open.
6. **A yes/no card filters at once:** adding `trained` immediately keeps "Yes, 15" before the reader
   chose (`T41A`); this may read as a value written before a choice.
7. **Escape in the picker** closes it and drops a card that has no value yet, with no notice (the
   open question "unfinished conditions vanish" from the build's pilot).
8. **A run's folder lands above a reader's own layer** and covers it: after Louvain, a layer of
   purple Mme characters read "Covered by Group 1, Group 2, Group 3 and Group 4" (an exploration
   walk); whether a run should go beneath existing layers is open.
