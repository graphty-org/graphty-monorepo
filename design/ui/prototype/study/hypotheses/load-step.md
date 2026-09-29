# Design hypotheses: the load step and its import report

For the design team and session runners only. Do NOT include this file in the prompt that plays a
participant: a simulated user who knows the intended answer will find it, and the session proves
nothing. The tasks below never name issues, policies, roles or the reason slot.

The screens these come from are `screens/load-step.html` (eight frames). Where the weight's meaning
is asked (in the load step or only in Statistics) is H1 of
`study/hypotheses/load-and-characterize.md`; it is not repeated here. Each hypothesis is a design
belief, not a finding, until sessions support it.

## H1. A load step with no Issues section reads as "nothing wrong"

- **Belief:** when a file has no issues, leaving the Issues section out entirely (no heading, no
  "No issues found" line) is read as a clean file. The risk: the reader takes the missing section
  for "not checked yet", because while the file is being read a progress row sits in the same
  place.
- **Participants:** the first-time explorer (`study/personas/explorer-elena.md`) and the fraud
  analyst (`study/personas/fraud-analyst.md`).
- **Task (say exactly this, with frame 1 on screen and without pointing anywhere):** "Is there
  anything wrong with this file?"
- **Then:** show frame 5 (still reading) and ask the same question.
- **Holds if:** on frame 1 the participant says the file is fine (or names only things they would
  check themselves, such as the amounts), and on frame 5 says it is still being read.
- **Does not hold if:** on frame 1 they say it has not been checked, is still loading, or ask where
  the check is. Then propose a count on the What will load row ("0 issues") rather than a
  "No issues" line, and test again.
- **Record:** the first words of their answer, where they looked first, and whether they mention the
  missing section unprompted.

## H2. The analyst understands what each reading of a column with NA values will load

- **Belief:** with the Read as list open (frame 2), each option's counts ("2,298 edges; 150 of them
  without a weight" against "2,148 edges; the 150 rows are not loaded") let the analyst choose on
  purpose, and they can say afterwards what happened to the 150 rows.
- **Participants:** the bioinformatics researcher (`study/personas/bioinformatics-researcher.md`) and
  the genomics user (`study/personas/genomics-cytoscape-user.md`), who meet NA scores in real
  STRING and BioGRID exports.
- **Task (say exactly this, with frame 2 on screen and the list closed):** "Load this file so you can
  rank proteins by how confident the evidence is."
- **Then, after they choose:** "What happened to the rows where confidence was NA?"
- **Holds if:** at least two in three choose without hesitating over the wording and answer the
  follow-up correctly (kept with no weight, or not loaded, matching their choice).
- **Does not hold if:** they pick an option and cannot say what it did to the 150 rows, or read
  "without a weight" as "weight 0". Then reword the options, keeping the counts.
- **Record:** the option chosen, the time to choose, their answer, and whether they opened the
  "Rows with NA" sample first.

## H3. The two places that show the same setting are read as one setting

- **Belief:** the blocking issue's select and the column's Read as field show the same value, and
  changing either is understood to change both.
- **Participants:** any two; include the screen-reader analyst (`study/personas/screen-reader-analyst.md`),
  who meets the two controls in tab order, one after the other.
- **Task (say exactly this, after H2's choice was made from the issue row):** "Where would you go to
  change how that column is read?"
- **Holds if:** they name either place and, shown the other, say it is the same setting.
- **Does not hold if:** they believe the two can differ, or ask which one wins. Then drop the issue
  row's select and make its action move focus to the column's Read as field, as Figma's
  Missing-fonts dialog routes each font to its own picker.
- **Record:** which control they name, and their answer when shown the other.
