# Grades: picking ready-made data (round 8, task r8-t02)

Task given to participants: "You have just installed this program to see whether it could help
with your work, but your own data is not ready yet. Before you spend time on your own file, you
would like to see the program working on something. Get something onto the screen to try it on,
and tell us what it is."

Success state: from the first-launch start screen, one click on a card in the Samples column opens
the Les Miserables project (app-b/#/graph-place/at-rest), and the participant says what it is: the
characters of the novel, 77 of them, linked by appearing in the same chapter.

Grading rule for a known skeleton defect: in the skeleton, the karate club, protein and card
transfer cards all open Les Miserables. A participant who picked one of those cards is graded on
whether they reached a network in one click and correctly said what it was. The mismatch itself is
logged below as a skeleton defect, not counted as a design finding. Retries that only chased the
mismatch are not counted as design wrong turns.

Each grade was checked against the participant's last render, not only their own account.

## Result

| Participant | Card picked | Their own grade | Graded | Ended on |
|---|---|---|---|---|
| explorer-elena | Les Miserables | success | success | Les Miserables, Valjean selected |
| class-project-student | Les Miserables | success | success | Les Miserables at rest |
| data-journalist | Les Miserables | success | success | Les Miserables at rest |
| marketing-analyst | Les Miserables | success | success | Les Miserables, table open |
| nonprofit-operations-analyst | Les Miserables | success | success | Les Miserables, table open |
| recipe-recipient | Protein interactions | success-with-difficulty | success | Les Miserables at rest |
| genomics-cytoscape-user | Protein interactions | success-with-difficulty | success | Les Miserables at rest |
| screen-reader-analyst | Zachary's karate club | success-with-difficulty | success | Les Miserables, edges table open |
| supply-chain-analyst | Card and transfer transactions | success-with-difficulty | success | Les Miserables, nodes table open |
| alert-reviewer | Card and transfer transactions | success-with-difficulty | success-with-difficulty | start screen (closed the project) |

Totals: 9 success, 1 success-with-difficulty, 0 failure, 0 gave up (10 participants).

Nobody tried "Open project or file..." or "New from data..." first, and nobody opened the IT estate
or research network cards. Every participant went to the Samples column on first look; all ten
reached a network with one click on a sample card (after answering the usage-data box).

## Why each grade

- explorer-elena: No thanks, then Les Miserables; network at once. Said "the characters from the
  book, with lines between the ones who show up together." Then clicked Valjean, still on the same
  project. Minor misreading: she took "36 connections" to mean "chapters he is in"; it does not
  change the grade because her description of the network itself was right.
- class-project-student: two clicks, correct answer including "77 characters... linked when they
  appear in the same chapter." Stopped at rest.
- data-journalist: two clicks, correct answer with all three facts.
- marketing-analyst: two clicks, correct answer with all three facts; opened the table afterward
  for a sanity check (Valjean first), still on the project.
- nonprofit-operations-analyst: two clicks, correct answer with all three facts; opened the table.
- recipe-recipient: picked proteins, got Les Miserables, retried once by the count text, same
  result. Said "characters from the novel, joined when they're in the same chapter" and noticed the
  mismatch. Graded on reaching a network: one click. He grades himself lower only because of the
  mismatch.
- genomics-cytoscape-user: picked proteins, retried twice and opened the title menu to look for a
  way to switch samples; all of that chased the mismatch. Her answer is the most complete in the
  set (77 nodes, 254 edges, co-appearances, from the file summary). Last render is the network.
- screen-reader-analyst: picked the karate club, retried by description, then used the table to
  confirm 77 nodes and 254 edges against NetworkX. Correct answer, mismatch noticed. Last render is
  the network with the edges table.
- supply-chain-analyst: picked the card transfer sample, retried once, then opened the table.
  Correct answer with all three facts, mismatch noticed.
- alert-reviewer: picked the card transfer sample three ways, opened the title menu, then chose
  Close project and stopped on the start screen. Her description of what had opened is correct
  ("characters in Les Miserables -- who appears with who"), but the screen she ended on is not the
  success state, and leaving the project was a wrong turn even though the defect provoked it. Graded
  success-with-difficulty rather than failure because she reached the network in one click and
  named it correctly; the exit was a reaction to the defect, not to a design she could not find her
  way through. On a strict "what ended on screen" reading this would be a failure; that reading is
  recorded here so the tally can be re-cut.

Where my grade differs from the participant's: four of the five who picked a mismatched card rated
themselves success-with-difficulty because they did not get the sample they chose. Under the
grading rule that is a skeleton defect, so they are graded success. Their single-ease scores (3, 3,
4, 5) are depressed by the defect and should not be averaged with the clean sessions (6, 6, 6, 7, 7)
as evidence about the design.

## Skeleton defects (not design findings)

1. Every sample card except IT estate and research network opens Les Miserables, with no message.
   Seen by 5 of 10 (all five who did not pick Les Miserables). It cost two to four extra attempts
   each and visibly damaged trust ("if it does that with a sample, what does it do with my file?").
   For the next round, either wire each card to its own project or make the cards that are not
   built yet visibly unavailable, so the task measures the design.
2. After the mismatch, Recent projects lists the opened project as "Les Miserables, 77 nodes, Card
   and transfer transactions sa..." (1 of 10 saw it; confirmed in the render). Follows from defect 1.
3. The click tool reported "Table" matching two controls (the table toggle and a section of the
   same name). Seen in 3 sessions as a tool note; the screen-reader participant also raised it as a
   real problem (two controls answer to the same name), so it is listed again under design findings.

## Design findings from this task

Severity is Nielsen 0 to 4 (4 = usability catastrophe). Counts are participants out of 10 who
raised or visibly hit it.

| Finding | Count | Severity |
|---|---|---|
| The sample opens dense with worked examples (PageRank, Louvain, shortest paths, link prediction, watchlist, report folder) and participants cannot tell which rows are the data and which are added work; several read it as "someone else's work, do not touch" | 10 | 3 |
| The color legend shows a method name and raw decimals ("PageRank 0.00330 to 0.0754") with no plain-words meaning of darker or lighter | 8 | 2 |
| Method names (PageRank, Louvain, link prediction, density) are unexplained jargon for the non-specialist participants | 8 | 2 |
| Left list rows are truncated ("Top 9 by de...", "Valjean t...", "Labels show...", "Co-appearanc...") | 6 | 2 |
| The usage-data box is the first thing on screen and every participant answered it before anything else (all chose No thanks); one found its wording ("his Claude Code sessions") trust-lowering | 10 | 1 |
| "1 row not listed still paints. Show rows removed from list view" is unintelligible | 3 | 1 |
| No sample resembles the participant's own kind of data (social or mention data, people and organizations, suppliers) | 3 | 1 |
| Two controls share the name "Table" | 1 (plus 3 tool notes) | 2 |
| The coloring is PageRank although the sample card leads with "communities", so the groups listed under it are not what is painted | 1 | 1 |

What worked, by count: the Samples column was found at first look by 10 of 10; the one-line card
descriptions decided the choice for 10 of 10 ("Good for a first look" named by 4); "Files are read
on this computer and never uploaded" and "Local only" were read and valued by 7; the ranked table
with its one-line summary ("Valjean is first on all three measures") was where the picture made
sense for 4 who opened it; the on-map legend and the file summary panel were praised by 2.

## Evidence

Transcripts: study/round-8/sessions/r8-t02--<participant>.md. Last renders:
tmp/round-8-sessions/r8-t02--<participant>/ (alert-reviewer 05.png is the start screen with the
mislabeled recent project; every other participant's last render shows the Les Miserables project).
