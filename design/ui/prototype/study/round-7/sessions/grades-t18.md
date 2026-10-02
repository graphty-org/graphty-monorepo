# Round 7 grades: three security spreadsheets into one picture

The task: three spreadsheets from building security -- people (412 rows), buildings (9) and one
row per door swipe (4,212) naming a person and a building by number. Make one picture in which each
swipe joins the person to the building, and say how many swipes point at a person or a building
that is not on those lists.

What counts as success: the entries table is read with person_id as "From -> person" and
building_id as "To -> building"; the match report is read (4,212 rows, 4,180 with both ends, 32
rows unmatched: 25 people and 7 buildings); "Show the 32 rows" is opened; and Load leaves the
door-entries graph. Success with difficulty: the counts are read but the unmatched rows are opened
only on prompting, the roles are checked column by column before being trusted, or the end is
reached after a wrong turn, a long search or a hover hint. Failure: loads without knowing 32
swipes were dropped, or loads the three spreadsheets as three graphs.

The designed path is: the import screen on the people table -> the entries table with its match
report -> the 32 unmatched rows -> the loading card ("Reading 3 tables ... 421 nodes, 4,180
edges") -> the door-entries graph.

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating.

## Two limits of the test harness, stated once

1. **The picture never draws.** The loading card hands over to the finished graph after 1.5
   seconds; the click-through tool takes its picture well before that. All seven participants
   ended on the loading card for "Door entries, March 2026" with the right counts, and five of
   them said they never saw the picture. The grades treat the loading card with 421 nodes and
   4,180 edges as the end of the observable task. Studio decision, reason: failing everyone on a
   step the harness cannot show would record a tool limit as a design result.
2. **Every click-through starts fresh.** The supply chain analyst pressed Escape believing the role
   menu from her previous run was still open; in the new run it was not, so Escape left the import
   screen. The event is real (one keystroke discards a configured import, with Undo), but its cause
   is partly the harness.

A third thing is a fixture limit, not design behavior: the entries table holds 8 sample rows, so
"Show the 32 rows" filters to "3 of the 8 sample rows". In the product it would list all 32.

## How detours were counted

Every participant spotted that swipe "7" is person "0007" (Wei Chen) with the leading zeros
stripped, and every one went looking for a way to make the tool match them -- the "3 keys" link,
the role menu, the "#" type marker. The task does not ask for that fix, and no such control exists.
Studio decision: those searches are not counted as wrong turns against this task; they are counted
below as a finding. Reason: all seven made them, so counting them would grade curiosity about a
real data problem, not the path to the asked answer.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Knowledge engineer | success | **success** | Read the roles on the entries table ("person_id is From -> person, building_id is To -> building ... I did not have to do it"), read 4,212 / 4,180 / 25 / 7, opened "Show the 32 rows" on her own, and loaded: last screen (05.png) is the loading card, 421 nodes and 4,180 edges. Answered 32 (25 people, 7 buildings), with a caveat about the leading zeros. Ease 6. |
| Cybersecurity analyst | success with difficulty | **success** | Same reads, checked that 25 + 7 and 4,212 - 4,180 both give 32, opened "Show the 32 rows" unprompted, loaded (06.png, 07.png: loading card, Everything panel "Paints 421 nodes, 4,180 edges"). Her difficulty was the leading-zero search (role menu, the dead "#"), off the task's path. Answered 32 correctly. Ease 5. |
| Analyst Alex | success with difficulty | **success** | Read roles and counts, checked the arithmetic, opened "Show the 32 rows" ("Yellow outline on the bad cell, that's clear"), loaded (06.png: loading card). Detours were the leading-zero search, including the dead "#". Answered 32 (25 + 7); added a guess that the real unknown count is "probably 22", which the screen does not support (see findings). Ease 5. |
| Explorer Elena | success with difficulty | **success** | Read the match report and opened "Show the 32 rows" before believing it ("Let me look at the 32 before I believe it"). Loaded (06.png, 07.png). Did not know the word "edges" but read the counts correctly. Answered 32 (25 + 7), with the same "probably 22" guess. Ease 5. |
| Screen-reader analyst | success with difficulty | **success** | Read the roles, the full match report line by line, opened "Show the 32 rows" unprompted, loaded (05.png, 06.png). One harmless misclick on a "Show all rows" link that exists only after a filter. Answered 32 (25 + 7). Withheld trust in the 421 node count (see findings). Ease 5. |
| Supply chain analyst | success with difficulty | **success with difficulty** | Read roles and counts, opened "Show the 32 rows", but her first Load attempt ended on the Les Miserables graph with "Load cancelled: nothing was loaded" (05.png) after an Escape left the import. Redid it and reached the loading card (06.png, 07.png). Answered 32 (25 + 7). The wrong turn was partly harness-caused (see limit 2). Ease 5. |
| Intelligence analyst | success with difficulty | **success with difficulty** | Read the roles and the full count (32 = 25 + 7, checked both ways), loaded (06.png: loading card). Never opened "Show the 32 rows": he saw the three flagged sample rows inline and filtered by "3 keys", but not the unmatched list itself. Knew exactly what was dropped, so not a failure; graded down for skipping the step the task's success requires. Ease 6. |

**Tally: 5 success, 2 success with difficulty, 0 failure, 0 gave up (7 sessions).** Ease ratings
were 6, 5, 5, 5, 5, 5 and 6 out of 7 (median 5).

All seven gave the right answer, 32 swipes (25 unknown people, 7 unknown buildings), and none
loaded the sheets as three graphs or loaded without knowing what was dropped. The match report
carried the task: six of seven said the number was on screen before they looked for it, and four
named it as better than their own lookup routine (Gephi, Excel VLOOKUP or XLOOKUP, pandas).

Five participants rated themselves lower than graded. Their reasons were the leading-zero dead end,
the picture they never saw and the count mismatch below -- none of them about reaching the answer.

## What the sessions show

Counts are out of 7. Severity is Nielsen's 0-4.

1. **The leading-zero warning has no lever. 7 of 7, severity 3.** "3 keys differ only by leading
   zeros (not merged)" was read by everyone, and everyone looked for a way to say "7 and 0007 are
   the same": 5 opened the role menu, 3 clicked the "#" type marker, which does nothing. All seven
   concluded they would fix the file outside the tool and reload. "Telling me 'not merged' without a
   merge button is just telling me I have a problem" (Alex).
2. **"3 keys" gives no row count, and three people guessed one. 6 of 7 affected, severity 3.**
   The neighboring lines say "25 person_id values (25 rows)"; this one gives keys only. Three
   (cybersecurity, supply chain, screen reader) said they could not tell how many swipes the 3 keys
   cover. Three others (knowledge engineer, Alex, Elena) wrote "probably 22" into their answer,
   assuming one row per key -- an unsupported number that would go into a report.
3. **No way to take the 32 rows out. 5 of 7, severity 3.** Knowledge engineer, cybersecurity,
   Alex, supply chain and screen reader each said the deliverable to the data owner or security
   team is the list of unmatched rows, not the picture, and found no export or copy. Two said this
   keeps pandas in their workflow.
4. **The node count does not reconcile. 4 of 7, severity 2 (trust).** The people report says "412
   rows, 1 repeated key (kept the first)", which implies 411 people and 420 nodes; the header says
   person (412) and the load says 421 nodes. Knowledge engineer, Alex, intelligence analyst and
   screen reader each stopped on it and said they would not put 421 in a report. This is a fixture
   arithmetic error, but it shows the design gives no way to reconcile counts: the load card could
   say "411 people + 9 buildings".
5. **"Kept the first" drops data out of sight. 3 of 7, severity 2.** Knowledge engineer,
   cybersecurity and intelligence analyst read Priya Nair's second badge as a lead or as data, not a
   duplicate, and wanted to see what was discarded.
6. **"Show the 32 rows" showed 3. 4 of 6 who opened it remarked, severity 1 (fidelity).** The
   sample has 8 rows; the product would show 32. Still worth wording so the link and its result use
   the same number when the list is a preview.
7. **Escape discards the whole import. 1 of 7, severity 2, single voice and partly harness-caused.**
   Undo recovered it. "Esc to leave" is printed at the top, but a configured three-table import is a
   lot to lose to one key meant for closing a menu.
8. **Vocabulary. Severity 1.** The "Makes" line's arrow notation reads like code (Alex) and would
   be read aloud as punctuation (screen reader); "edges", "keys", "Number", "Category" are not
   Elena's words. Two and one voices respectively.
9. **"Local only" is reassuring but unexplained. 3 of 7, severity 1.** Cybersecurity, Alex and
   screen reader wanted to know what it covers.

The loading card itself (progress, counts, Cancel) was praised by three and criticized by none.
