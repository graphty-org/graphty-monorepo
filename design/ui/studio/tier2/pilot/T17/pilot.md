# Pilot: T17, only the strong ties

Build `ca8b3b916c22 graphty@0.8.55` (the build the answer key was recorded on), served by
`tool/real.mjs`. Both datasets were walked along the answer key's success path. Screenshots for
the running club are in this folder (`01.png` to `09.png`); for Les Miserables in `B/`.

**Result: reached on both datasets, with the values the answer key gives.**

## A: running club (setup `friends.txt`)

| Step | Screenshot | What the screen showed |
| --- | --- | --- |
| start | 01 | friends.csv drawn, 20 nodes, 41 edges |
| `--click "Data"` | 02 | Sources, Filters (empty, with "+"), Attributes: Nodes `id`, Edges `weight` |
| `--click "weight"` | 03 | The tool reported two controls of that name (the tree row and its text) and took the tree row, which is the right one. Right panel: weight, Amount, From the file, range 1 to 5 |
| `--click "Attribute actions"` | 04 | Menu: "Filter to...", "Show in table" |
| `--click "Filter to..."` | 05 | New filter step: Keep "an attribute's value", Attribute "weight", Is "at least", Value empty, "Add step" disabled |
| `--click "Value" --type 4` | 06 | Value 4, "Add step" enabled |
| `--click "Add step"` | 07 | Header chip "19 of 20 nodes"; Filters row "weight is ... 20 to 19 nodes", ticked; drawing shows 12 ties (counted by eye) |
| `--hover "weight is"` | 08 | No tooltip |
| `--click "Apply step: weight is at least 4"` | 09 | Row reads "weight is at least 4  off"; chip gone; whole club drawn again |

## B: Les Miserables (setup `lesmis.txt`)

`--click "Data"` (02), then `shared_chapters`, "Attribute actions", "Filter to...", Value 5 (03),
"Add step" (04): chip "26 of 77 nodes", row "shared_ch... 77 to 26 nodes" ticked. "Apply step:
shared_chapters is at least 5" (05): row "off", chip gone, all 77 characters drawn.

## What a participant could trip on (none blocked the path)

1. **The Overview keeps describing the whole graph while a filter is on.** With the step on (07,
   B/04) the Values tab still says Nodes 20 / Edges 41 / Components 1 (77 / 254 / 1 for Les
   Miserables), and nothing on it says these are the unfiltered counts. A participant asked "how
   many people are still in it" who reads the panel they already know answers 20 (or 77), not 19
   (or 26). Graders should expect this wrong answer; it is a product finding, not a participant
   error.
2. **The filter row's condition is cut off while the step is on.** "weight is ..." and
   "shared_ch..." (07, B/04): the "20 to 19 nodes" count takes the room, and hovering the row
   shows no tooltip (08). The full condition is readable only when the step is off (09) -- or from
   the checkbox's accessible name.
3. **Les Miserables Overview, Direction row:** the value "Undirected, from the file: directed 0"
   overflows into the label column and past the panel's right edge, so the row has no visible
   label; "Edges per ..." is also truncated (B/02 to B/05). Not on the task's path.
4. As the answer key already notes, the number of ties left is not written anywhere; 12 (A) can be
   counted on the drawing, 51 (B) realistically cannot.

## Answer key check

Values, step names and the "Back" wording all match `answers.md`. The note that the tool clicked
the tree row for "weight" still holds: the name is shared by the tree row and its label text and
the tool takes the first, which is the one wanted.

## Re-walk, 2026-10-07 (after the tier 2 fixes)

Walked again with `tool/real.mjs` on a frozen copy of the served build (graphty 0.8.55 at commit 75cbc3a9a plus the tree-row checkbox fix), both datasets,
from the same setups. Screenshots and the printed steps are in `rewalk/A/` and `rewalk/B/`
(`steps.log`); `../rewalk.sh T17A T17B` repeats it. No step printed a script error, a console
error, a failed request or "the drawing is still moving".

**Result: reached on both datasets**: chip "19 of 20 nodes" (A), "26 of 77 nodes" (B); the step's
checkbox turns it off and the whole graph comes back (`rewalk/A/09.png`, `rewalk/B/09.png`).

| Earlier observation | Now |
|---|---|
| The Overview kept describing the whole graph under a filter | It leads with "Nodes showing 19 of 20", "Edges showing 12 of 41" and "The counts below are for the whole graph." (`rewalk/A/07.png`); B "26 of 77", "51 of 254" (`rewalk/B/07.png`). The edge count the answer key called unwritten is now on screen |
| The cut filter condition had no tooltip | Hovering the row shows "weight is at least 4" (`rewalk/A/08.png`), "shared_chapters is at least 5" (`rewalk/B/08.png`) |
| The Direction row overflowed into its label (B) | "Direction  Undirected, from the ..." stays in its row with its label (`rewalk/B/02.png`) |

**A regression the first re-walk found, fixed before this one.** The change that lets a Sources
row's counts give way to its name also let a row's checkbox slot shrink, so the filter step's
checkbox was cut to a sliver (A) or pushed off the row entirely (B), and B could not turn the step
off: the click timed out and the panel scrolled. compact-mantine now shrinks only a slot that holds
pinned text; a slot of controls keeps its size (`compact-mantine/src/theme/css/tree.css.ts`, test
"keeps a pinned checkbox whole on a narrow row with a count").

## Re-walk, 2026-10-07, second pass

Walked again with the same steps on a frozen copy of the served build (graphty 0.8.55, build
75cbc3a9a0e9, worktree at commit 089d6e542 with uncommitted changes). Screenshots and logs are in
`../T17-2/` (`T17A/`, `T17B/`, `T17A.log`, `T17B.log`). Every step exited 0 with no script error,
console error, failed request or "the drawing is still moving".

**Result: reached on both datasets.** A: chip "19 of 20 nodes", Overview "Nodes showing 19 of 20",
"Edges showing 12 of 41"; unticking the step brings back all 20 people and 41 ties. B: chip "26 of
77 nodes", "Edges showing 51 of 254"; unticking brings back all 77 characters. The hover tooltips
give the full condition. The step's checkbox stays whole and clickable on both rows.
