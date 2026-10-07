# Pilot: T10, names on every dot

The answer key's success path was walked on the real app (graphty@0.8.53 production build, commit
452285142, opened at `/?next`, 1440 x 900) with the study tool, once per dataset: session A is Les
Miserables (`A/`), session B is College football (`B/`). No script error, `console.error` line or
failed request was reported at any step; every step exited 0.

## Verdict

The end state is reached for both datasets by the path as written, in 4 steps plus dismissing the
usage card. Names are drawn on the canvas and the Style panel states how many are hidden:

- Les Miserables: label line "Above / Abc name" on Everything; "77 labels, 7 hidden to avoid
  overlap" (`A/06.png`).
- College football: label line "Above / Abc label" on Everything; "115 labels, 14 hidden to avoid
  overlap" (`B/06.png`).

Both statements match the answer key's reference values word for word. The inspector header now
names the selected row once ("Everything", `A/04.png`, `B/04.png`).

## Steps

| Step | Command | Screenshot | What happened |
| --- | --- | --- | --- |
| 1 | `--start empty` | `A/01.png`, `B/01.png` | Start page with the usage card (the two are byte-identical). |
| 2 | `--click "No thanks"` | `A/02.png`, `B/02.png` | Card gone; footer "Usage data stays off". Not in the key's path; every empty start needs it. |
| 3 | `--click "Les Miserables"` / `"College football"` | `A/03.png`, `B/03.png` | Sample drawn with no names, as the prompt says. Inspector on Values: 77 / 254 and 115 / 613. |
| 4 | `--click "Everything"` | `A/04.png`, `B/04.png` | Everything selected; the inspector switches to Style, Nodes, with a Label section and a "+". |
| 5 | `--click "Add label line"` | `A/05.png`, `B/05.png` | Line "Pick an attribute" and a list: `id`, `name` (A); `id`, `label`, `value` (B). |
| 6 | `--click "role=option:name"` / `"role=option:label"` | `A/06.png`, `B/06.png` | Names drawn above the dots; the count statement appears under the line. |
| 7 | `--hover "77 labels"` (A only) | `A/07.png` | `tooltip: null`: the statement does not explain itself. |
| 8 | `--wheel 750,450,-1500` | `A/08.png`, `B/07.png` | Byte-identical to the screenshot before: the drawing does not zoom. |

## Blockers

None blocks the success path. One defect blocks the most natural recovery a participant would try:

1. **graphty-element defect: the mouse wheel does not zoom the 3D drawing.** Step 8, in both
   sessions (`A/07.png` = `A/08.png`, `B/06.png` = `B/07.png`, byte for byte). The samples open in
   3D, and `graphty-element/src/cameras/OrbitInputController.ts` still has no wheel handler (the 2D
   controller zooms on the wheel). A participant who wants the hidden names, or cannot read the
   6 px labels, turns the wheel first and gets nothing; this pushes T10 toward `dead-end`.

## Not blockers, worth watching

- **The hidden count is easy to miss.** "77 labels, 7 hidden to avoid overlap" is about 9 px, dim
  gray, in the right panel, with no tooltip (step 7). Expect names-drawn-but-hidden-unnoticed
  partials and false "done" claims.
- **Labels are tiny at the default view.** Most names are about 6 px tall and the center of Les
  Miserables is unreadable at 1x (`A/06.png`); graders should zoom the screenshot before scoring
  "names drawn".
- **The wording echo is strong in B.** College football offers `label` under the "Label" heading
  and beside the "Add label line" control; the key already grades B against A for this reason.
- **Unrelated, seen on the way:** the Values overview still says "Undirected, from the file:
  directed 0" (`A/03.png`, `B/03.png`), which reads as a garbled sentence.
