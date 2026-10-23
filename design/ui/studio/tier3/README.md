# Design studio, tier 3: first use and styling

This study asks whether a person who has never used graphty can open it, bring in data, and make
the drawing say something: one color for everything, a subset picked by its data, sizes that
follow a number, names on the drawing, ties styled apart from the people, clusters the program
finds, many layers changed at once, a change taken back, and reading what someone else's color
picks out.

It studies the combined Style panel. A layer's Style area has a Node tab and an Edge tab; each tab
opens with a collapsible picker of which nodes or ties the layer paints, built from condition
cards typed by the column they read (a number range, category values, text that contains or starts
with something, yes or no, has or has no value), all of which must hold. Selecting a folder or
several layers shows the same tabs, picker and fields for all of them at once; a field whose
layers differ shows a purple "Layer" token.

## The files

| File                                                         | What it holds                                                                |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [criteria.md](criteria.md)                                   | The bars that decide "done", the round plan, the preflight and the stop rule |
| [tasks.md](tasks.md)                                         | The fourteen tasks (T37 to T50), the words they avoid, the dry run's detours |
| [answers.md](answers.md)                                     | Graders only: success, success paths, reference values                       |
| [roster.md](roster.md)                                       | The nine first-time personas and who takes which task                        |
| `pilot-materials/`                                           | Hand pilots of four tasks that checked the answer key                        |
| [bulk-edit-plan.md](bulk-edit-plan.md)                       | The design of editing several layers at once                                 |
| [design.md](design.md), [style-catalog.md](style-catalog.md) | The Style panel's design and every style graphty-element supports            |

The study files participants may bring are in `../tool/files/`. The scripts that score the bars
are in `../tool/`: `score.mjs` (task success, false "done", wrong turns, time to the first styled
graph), `bars.mjs --tier 3` (accessibility and words at rest on every tier 3 screen),
`wording.mjs` (no prompt names what is on screen) and `tier3.test.mjs` (the tool reads tier 3's
files; the style-tree dump catches a removal).

## How it runs

The design studio's workflow runs it (`.claude/skills/design-studio/SKILL.md`), with `tier: 3`
and `users: "first-time"`: review and freeze the criteria, freeze and serve one build, dry-run every
task on it until a pass finds nothing new, then rounds of 56 simulated sessions with expert
walkthroughs and a screenshot audit, scored by the scripts above and checked by two skeptics, with
fixes between rounds.

Every participant is simulated and every session starts on the empty start screen. A failure is
strong evidence; a pass is weak until real people confirm it.
