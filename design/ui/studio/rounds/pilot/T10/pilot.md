# Pilot: T10, names on every dot

Walked the answer key's success path on the real app (graphty@0.8.53 production build, commit
a1e6b91ff, opened at `/?next`) with the study tool, once per dataset. Session A is Les Miserables
(`A/`), session B is College football (`B/`). No script errors, `console.error` lines or failed
requests were reported at any step.

## Verdict

The end state is reached for both datasets, by the path as written, in 5 steps plus dismissing the
usage card. Names are drawn on the canvas and the Style panel states how many are hidden:

- Les Miserables: label line "Above / name" on Everything; "77 labels, 7 hidden to avoid overlap"
  (`A/07.png`).
- College football: label line "Above / label" on Everything; "115 labels, 14 hidden to avoid
  overlap" (`B/06.png`).

Not every name can be drawn: the app has no "Show all labels" control, so the first branch of the
success rule cannot be reached by anyone. The task is passable only by the second branch: reading
the hidden count and saying why.

## Steps

| Step | Command | Screenshot | What happened |
| --- | --- | --- | --- |
| 1 | `--start empty` | `A/01.png`, `B/01.png` | Start page with the usage card. |
| 2 | `--click "No thanks"` | `A/02.png`, `B/02.png` | Card dismissed (not in the key's path; every empty start needs it). |
| 3 | `--click "Les Miserables"` / `"College football"` | `A/03.png`, `B/03.png` | Sample drawn, no names on it, as the prompt says. Inspector opens on Values. |
| 4 | `--click "Everything"` | `A/04.png`, `B/04.png` | Everything selected; the inspector switches to Style by itself. |
| 5 | `--click "role=tab:Style"` | `A/05.png` | No change: Style was already on. The key's step is redundant but harmless. |
| 6 | `--click "Add label line"` | `A/06.png`, `B/05.png` | Empty line "Pick an attribute" and an attribute list: `id`, `name` (A); `id`, `label`, `value` (B). |
| 7 | `--click "name"` / `--click "label"` | `A/07.png`, `B/06.png` | Names drawn; count statement under the line; a legend card opens over the canvas. |
| 8 | `--click "Show all labels"` | `A/10.png` | `nothing on screen is called "Show all labels"`. |
| 9 | `--click "Aa"` | `A/11.png` | Opens only a label position picker (3 x 3 grid); no show-all option. |

## Blockers

1. **Wrong answer key: "Show all labels" does not exist.** The success rule offers "every name
   shown (Show all labels)", but the app sets the element's label declutter on unconditionally
   (`graphty/src/components/Graphty.tsx` and `graphty/src/workspace/frame/ElementHost.tsx`,
   `labels: { declutter: true }`) and offers no control to turn it off. Evidence: step 8,
   `A/10.png`. The prompt says "Get every character's name written"; a participant who takes it
   literally hits a dead end at the same place every time, and a grader may score that as
   `dead-end` or `never-found` when the app gave them no way. Either add the control or drop that
   branch from the key and grade on the hidden count alone.

2. **App defect: the legend card lists every name as its own key row and covers the drawing.**
   After the label line is added, a card titled "Label: Everything" opens at the top left of the
   canvas and stays open when the pointer moves to empty canvas (`A/09.png`). It lists each node's
   name twice ("Anzelma  Anzelma", "AlabamaBir...  AlabamaBirmingham"), then "65 more" / "103
   more". It is a key for a channel that needs no key, and it sits over the left edge of the graph:
   in `B/06.png` the labels of the leftmost teams (x 480 to 550) are under it, and in `A/07.png`
   the labels near x 550, y 435 are cut off. For a task about seeing every name, the app itself
   hides some. The words come from `graphty/src/workspace/canvas/legendWords.ts`, which maps
   `node.label` to "Label"; whether graphty-element should publish a legend block for the label
   channel at all is worth asking there, but the choice to show it is the app's.

3. **App defect (wording): two rows called "Everything" in the left panel.** Adding the label line
   creates a style row named "Everything" (brush icon) right above the selected "Everything" row
   (`A/07.png`, `B/06.png`). A participant cannot tell from the names which is the set of nodes
   and which is the styling, and the study tool must address them as `Everything#1` /
   `Everything#2`. Hovering the new row shows no tooltip (`B/07.png`).

## Not blockers, worth watching

- **The hidden count is easy to miss.** "77 labels, 7 hidden to avoid overlap" is dimmed, about
  9 px, in the right panel, while the eye is on the canvas. Expect `SD` (names drawn, hidden ones
  never noticed) and false "done" claims (`truth-on-screen`) to dominate this task.
- **Labels are tiny at the default zoom.** At 1440 x 900 most names are about 6 px tall and the
  center of Les Miserables is unreadable; a participant may say "names are not shown" when they
  are. Graders should zoom the screenshot before scoring "names drawn".
- **The answer key's example count** ("77 labels, 64 hidden to avoid overlap") does not match the
  build (7 hidden); the key marks it as a rehearsal value, so update it to 7 for Les Miserables and
  14 for College football.
- **The key's Style tab step is redundant**: selecting Everything already opens Style (step 5).
- **The wording echo is strong in B.** College football's attribute list offers `label` beside the
  "Label" section heading and the "Add label line" control; the key already grades B against A for
  this reason.
- **Unrelated, seen on the way:** the Values overview says "Undirected, from the file: directed 0"
  (`A/03.png`, `B/03.png`), which reads as a garbled sentence, and edges draw small arrowheads on a
  graph the panel calls undirected.

No study-tool defects were found: every step did what the README says, and the miss in step 8 was
reported in the tool's documented words.
