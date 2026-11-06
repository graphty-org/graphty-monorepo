Grade: S
False done: 0
Wrong turns: 0
Steps: 20 (path steps: 13; 20 to the success state, 0 after the follow-up)
Model: opus (claude-opus-5-5 in both transcripts; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 39 calls checked over 2 transcripts)

# r1-s12 -- T65 B, Alex (returning user), build 79ed770292

## Result

The last screenshot (17.png, the same picture as 16.png) shows the gauges network with two filter
cards in Data > Filters:

- "telemetry, depth_cm", on, Hide, chip "5 of 12", collapsed to "telemetry is Yes and depth_cm is
  between 70 and 210";
- "installed", on, Select, Before 2005, chip "3 of 5", with "1 node has no value and is left out".

The top bar reads "5 of 12 nodes, 2 of 14 edges"; the table, on Shown, lists G01, G02, G04, G09 and
G11, with G01, G02 and G09 highlighted; the inspector reads "3 nodes selected" (depth 96 to 210,
telemetry Yes (3)). `data.json` agrees: 12 nodes and 14 edges in total, 5 nodes and 2 edges visible,
3 nodes selected; filter-1 keep, on, telemetry exact "true" and depth_cm 70 to 210, 5 of 12;
filter-2 select, on, within the picture, installed at most the end of 2004, 3 of 5. The end-state
check (`tool/endstate.mjs`) passes on this session. Nothing was deleted: both sources still hold
their counts (gauges.csv 11 nodes; the joined flows.csv 12 nodes, 14 edges).

The participant reported 5 gauges in the picture (G01, G02, G04, G09, G11) and 3 marked (G01, G02,
G09). Every part of the success definition holds: one card keeps telemetry yes and depth_cm at
least 70 (5 of 12), one card selects installed before 2005 (3 selected, all in the picture, none of
the hidden ones). S.

## Follow-up

Asked "Would it have made any difference if you had done those the other way round? How can you
tell?", the participant answered "for the final answer, I think not", reading the evidence off the
screen (17.png): both filters are live cards rather than one-off actions, the Select card's chip
counts against what the Hide card leaves ("3 of 5"), and the hidden old gauges (Cedar Bend, Old
Bridge) are not in the selection. The participant added that the screen cannot prove it: had the
marking come first, it would have selected 5 of 12, and nothing on screen says whether adding the
Hide card afterwards drops the two hidden gauges from the selection or leaves them selected out of
sight. The key's follow-up answer (the order makes no difference; the counts are the same either
way) is the answer given, with a stated doubt that the product could resolve on screen (problem 3).

## Route against the success path

The B path is Add filter, telemetry, "how to match", Yes, Add a condition, depth_cm, the "from" box,
70 typed, Enter, Add filter, installed, 2005 typed, Enter, Select (13 steps as the key counts them).
The participant took:

1. Drag the table right to find the telemetry column (1 step; 02.png). Looking for the column the
   task names; kept.
2. Wheel the rows down and hover the telemetry warning (1 step; 03.png: "11 values could be yes/no").
   Worked out the expected counts by eye: 5 and 3.
3. "Read as yes/no" (1 step; 04.png). Off the key's path but kept: the column is now Yes/No and the
   filter's Yes option reads off it. Not a wrong turn (nothing taken back).
4. Add filter by point (1 step; 05.png).
5. "telemetry" by name: the tool refused it as ambiguous (the table header has the same name) and did
   nothing (06.png); then the list option (1 step; 07.png). The refused step is the tool's, counted in
   the steps but not a wrong turn.
6. "telemetry: how to match", Yes (2 steps; 08.png, 09.png: 7 of 12).
7. Add a condition, depth_cm (2 steps; 10.png, 11.png: 6 of 12, "2 nodes have no value and are left
   out").
8. The "from" box, Control+A, 70, Enter (4 steps; 12.png: 5 of 12). Control+A is one more than the key.
9. Add filter, installed, 2005, Enter (4 steps; 13.png to 15.png). The new card opens on Hide, so the
   picture dropped to 3 of 12; this is the key's path, which switches the card next.
10. Select (1 step; 16.png: 5 of 12 nodes, 3 nodes selected, card 3 of 5). Success state.

The participant said done only once the screen showed 5 in the picture and 3 selected: no false
done. Twenty steps against a path of 13 is 7 over (the bar's limit is the path plus 3); the extra
steps were spent finding the off-screen telemetry column (problem 4), converting it to yes/no, one
name the tool could not resolve, and Control+A in the "from" box.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | -------- | -------- |
| 1 | 2 | behavior | A second filter card opens on Hide like the first, so adding the "marking" card first hides what it does not match: the picture fell from 5 to 3 gauges, and only a small gray Select / Hide switch says why. The participant recovered because the switch had been noticed on the first card, and said a reader could easily report 3 as the answer. | Step 9, 15.png (3 of 12 nodes, installed card on Hide); step 10, 16.png |
| 2 | 2 | behavior | The two cards' chips count against different totals: the installed card read "5 of 12" while hiding (its matches over the whole graph) and "3 of 5" once on Select (its matches among what the other card leaves). The participant could not read "5 of 12" until the switch changed it. | 15.png against 16.png; end-of-session notes |
| 3 | 2 | behavior | Nothing on screen says whether a Select card selects nodes that another card hides: the inspector reads "3 nodes selected" with no word on hidden nodes, so the participant could answer the follow-up only by reasoning and said the other order would have been a guess (the key says the order makes no difference). | Follow-up answer; 17.png (inspector "3 nodes selected") |
| 4 | 1 | behavior | The telemetry column sits past the right edge of the table at 1440 x 900 while the header reads "Columns: 8 of 8", which the participant took to mean every column was in view; finding it took a drag. | Step 1 to 2, 01.png and 02.png |
| 5 | 1 | wording | The new telemetry card's "how to match" list is drawn empty, with no visible label or placeholder; the participant opened it "on faith". | 07.png; end-of-session notes |
| 6 | 1 | behavior | The telemetry yes/no suggestion is reached only by hovering the header's warning glyph; the participant noted it would not have been found without hovering. The key's path works without it, so it cost a step, not the task. | Step 2 to 3, 03.png and 04.png |

None of these is a defect against the build's stated behavior (a new card starting on Hide, and the
Select card's chip counting within the picture, are what the key records for 79ed770292), so no
scripted repro was made; they are friction and wording problems for the fix list.
