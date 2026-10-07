# Pilot: names on every dot (both datasets)

Build under test: commit b7590f8de, build stamp `b7590f8de22b graphty@0.8.53`, opened at `/?next`,
1440 x 900, no uncommitted changes. Two sessions, both started empty: `A/` is Les Miserables,
`B/` is College football. Every screenshot was looked at.

## Result

**End state reached on both datasets in 5 steps**, by the answer key's route to every name: open
the sample, Everything, Add label line, pick the name attribute, Show all labels.

| Dataset | Statement before the switch | Statement after | Names drawn after |
| --- | --- | --- | --- |
| Les Miserables | "77 labels, 7 hidden" (`A/05.png`) | "77 labels" (`A/06.png`) | every dot; e.g. Gillenormand, Marguerite, Mother Innocent, Mlle Gillenormand, Pontmercy appear only after the switch |
| College football | "115 labels, 14 hidden" (`B/05.png`) | "115 labels" (`B/06.png`) | every dot; e.g. SanDiegoState, Washington, OregonState, ColoradoState appear only after the switch |

## Steps

Les Miserables (`A/`):

1. `--start empty` -- start screen, usage card at the bottom, four samples (`01.png`).
2. `--click "Les Miserables"` -- graph drawn, no names on the dots, as the prompt says (`02.png`).
   The usage card went away unanswered.
3. `--click "Everything"` -- the right panel opens on its Style tab with Fill, Shape, Effects,
   Label and Tooltip sections (`03.png`).
4. `--click "Add label line"` -- the Label pop-out opens with "Find an attribute" and the list
   id, name (`04.png`).
5. `--click "role=option:name"` -- names drawn above the dots; the line reads "Aa Above / Abc name"
   and under it "77 labels, 7 hidden" beside an unchecked "Show all labels" (`05.png`).
6. `--click "Show all labels"` -- the box is checked, the statement reads "77 labels", and the
   names that were hidden are drawn, overlapping their neighbors where dots are close (`06.png`).
   The tool printed `ambiguous: "Show all labels" matches 2 controls (input "on", label "Show all
   labels"); took the first`; the first was the checkbox and the click worked.

College football (`B/`): the same steps with `"College football"` and `role=option:label`. The
attribute list is id, label, value (`04.png`). After the pick: "115 labels, 14 hidden" (`05.png`).
Step 6 used `--click "role=checkbox:Show all labels"`, which resolved without an `ambiguous` print
(`06.png`).

## Remaining blockers

None that stop the end state. Smaller findings, by kind:

- **tool-defect (minor).** `--click "Show all labels"` prints `ambiguous` because the checkbox
  and its own `<label>` both carry the name. They are one control to a person; the tool should
  treat a label and the input it labels as one match. A grader must not count this print as a
  participant's wrong turn. Workaround: `role=checkbox:Show all labels`.
- **answer-key (wording).** The answer key and the task notes call the control a "switch"; the
  build draws a checkbox. The Screen-reader check says "the switch must announce its checked
  state", which a checkbox also does, so scoring is unaffected, but the key should say
  "checkbox" so graders look for the right thing. The key's round 3 route still says "not yet
  walked"; this pilot walks it.
- **app-defect (legibility, not graded).** At the default zoom many names are drawn too small to
  read at 1440 x 900 (e.g. "Mother Plutarch" near 521,279 in `A/06.png`, most of College
  football's names in `B/06.png`), and with the switch on, close names overlap into unreadable
  clusters (College football around 930,664 "Southern California" / "OregonState"). The answer key
  accepts overlap as the switch working. A participant asked to "get every name written" may
  still report names as unreadable; record that as an opinion, not `read-wrong`.
- **app-defect (minor, off path).** The Graph panel's Values overview line "Undirected, from the
  file: directed 0" runs past the panel's right edge (`A/02.png`, `B/02.png`).
- **College football names have no spaces** ("GeorgiaTech", "NorthCarolinaState"). That is the
  sample's own `label` values, not a rendering fault; noted so graders do not record it.

## Not checked

The screen-reader check (that the live region or the checkbox announces the change from
"77 labels, 7 hidden" to "77 labels") was not run; it needs a `--sr` session at preflight.
