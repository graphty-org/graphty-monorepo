# Grades: one person-to-building network from three tables, and the swipes that match nothing (round 8)

Task given to participants: "Three spreadsheets are open on the program's import page: a list of
people, a list of buildings, and a log of badge swipes saying which person entered which building
and when. If you do not work with building access, treat this as example data. Make one network in
which each person is tied to each building they entered -- however often the same person went into
the same building, they should be tied once -- and work out which swipes name a person or a
building that is not on the lists."

What counts as success: select the swipes table (entries), check that person_id is "From -> person"
and building_id is "To -> building", set "One edge per" to Pair, open the 32 rows the match report
flags (25 person_id values not in people, 7 building_id values not in buildings), decide to leave
them out or add them, then Load and end on the drawn network (420 nodes, 1,306 edges). With
difficulty: loading one tie per swipe first and fixing it from the source, or reading the count of
flagged swipes without opening the rows. Failure: loading without the people or the buildings, or
being unable to say which swipes belong to no one or nowhere. The success path is the people table
(app-b/#/data-page/people), the entries table (app-b/#/data-page/entries), Pair
(app-b/#/data-page/entries-pair), the flagged rows (app-b/#/data-page/unmatched-rows), the loading
card and the drawn network (app-b/#/graph-place/door-entries).

How this was graded. "Show the 32 rows" filters the import page's sample, so the screen reads
"Showing the rows with an end not matched: 3 of the 7 sample rows" and lists three swipes (person 7
at B4, person 1530 at B2, person 1214 at B12). That is exactly what the success path's own render of
the flagged-rows state shows (shots/tasks/r8-t24/04.png). Every participant opened it, saw the same
three rows the success path shows, and stated the breakdown the match report gives (25 unknown
people, 7 unknown buildings, 32 in all) with examples. Their shared complaint -- "it said 32 and
showed me 3" -- is a defect in the design, not a wrong turn by the participant, so it does not lower
a grade. It is the top finding below.

## Outcomes

| Participant | They said | Graded | Why |
|---|---|---|---|
| Priya, the cybersecurity analyst | success with difficulty | **success** | Direct path: entries, Pair, Show the 32 rows, the 25 person ids, Load, ended on 420 nodes / 1,306 edges. Stated 32 = 25 + 7 and that 4,212 - 4,180 = 32; kept Leave out and said "Add as people" would make a second Wei Chen. Her Export attempt after Load looked for something beyond the task; it found nothing, and that is a finding, not a wrong turn. |
| Min-ji, the knowledge engineer | success with difficulty | **success** | Direct path. Chose Leave out deliberately ("Add as people would have invented 25 persons"). Stated 32 rows, 25 person ids, 7 building ids, examples, and that 7 is likely 0007. Ended on the network and checked 411 + 9 = 420, 1,306 edges. Calls the second half "not done" because she has three of 32 by name -- that is the design defect below. |
| Marcus, the intelligence analyst | success | **success** | Direct path, explicitly chose Leave out ("they're not on the roster, that's the finding"), stated 32 / 25 / 7 with examples, ended on the network. |
| Grace, the nonprofit operations analyst | success with difficulty | **success** | Direct path through Pair and the flagged rows. Then opened the person_id column menu looking for a leading-zero fix, and tried Copy and Export on the flagged rows; both were searches for things the screen does not offer, not detours from the success path. Ended on the network, stated 32 / 25 / 7 and that the 32 were left out "which is what I wanted". |
| Analyst Alex | success | **success** | Direct path. Worked out from 411 x 9 = 3,699 that 4,180 edges had to be one per swipe, set Pair, opened the flagged rows, ended on the network with matching counts. |
| Morgan, the screen-reader analyst | success with difficulty | **success** | Direct path, read the match report line by line, opened all three flagged-row filters, checked the column menu for a key-matching option (none), Load, read the Summary panel in words and confirmed it matched the import page. Stated 32 / 25 / 7 with examples. |
| Explorer Elena | success with difficulty | **success** | Opened the flagged rows before setting Pair (order only, not a wrong turn), then Pair, then Load; ended on the network. Stated 32 / 25 / 7 with examples. She read person 7 as a typo at the door and did not connect it to 0007 (Wei Chen); that is still a correct answer to the task as asked, since 7 is not on the list as written. |

**Totals: 7 success, 0 with difficulty, 0 failure, 0 gave up.**

Nobody loaded one tie per swipe first, nobody chose Add as people or Add as buildings, and nobody
needed a hover. Every participant reached Pair in one click from the entries table and every one
ended on the drawn network with 420 nodes and 1,306 edges.

Why five of seven rated themselves lower than graded: each judged the second half of the task by
whether they could hand someone the full list of 32 swipes, and the screen gave them three. Their
self-ratings (Single Ease Question 5 to 6, median 5) split cleanly in their own words: "the network
was a 6", "getting the actual list of bad swipes was a 3". The self-ratings measure the missing
list, not the path, which they all found without trouble.

## Findings on the graded routes

Severity uses Nielsen's 0-4 scale. Counts are participants out of 7 who raised it unprompted.

1. **"Show the 32 rows" shows 3.** 7 of 7. The link, and the "25 person_id values (25 rows)" and
   "3 keys" links beside it, filter only the import page's sample rows ("3 of the 7 sample rows").
   No screen lists all 32 swipes. Every participant could give the breakdown and three examples, and
   every one said they could not answer "which ones?" for a manager, the facilities team or the
   badge-system owner; three called the label a broken promise (Morgan: "the kind of thing I'd write
   in my keystroke file as 'lies'"). "Show all rows" beside the filter was read by two (Priya, Min-ji)
   as possibly meaning "all 32" before they worked out it clears the filter. Severity 4 for this
   task: the second half of the task asks for the list, and the success path itself cannot show it.
   The flagged-rows state should list every unmatched row, not the sample's share of them.
2. **No way to copy or export the unmatched rows.** 7 of 7 asked for it; Priya and Grace tried
   Export and Copy and found nothing. All seven named the same workaround: go back to the raw file
   and do the anti-join in Excel or pandas -- "exactly the work I hoped the tool would save me".
   Severity 3. Fixing finding 1 without this still leaves the list trapped on screen.
3. **"0007 and 7 stay two keys" is reported but cannot be acted on.** 6 of 7 (all but Elena)
   recognized 7 as Wei Chen (0007) with the leading zeros stripped by a spreadsheet export, looked
   for a way to match them, and found none; Grace and Morgan searched the person_id column menu.
   Four (Priya, Min-ji, Marcus, Grace) also said the report does not say how many of the 25
   "unknown people" are zero-stripped ids rather than true strangers, so the 25 overstates the
   problem by an unknown amount. All approved of the tool not matching silently ("For court, fine,
   I don't want it guessing silently -- but give me the option"). Elena skimmed past the line: it is
   the eighth line of the report and is worded in "Number", "Category" and "keys". Severity 3.
4. **"1 repeated key (kept the first)" does not say which row was dropped.** 6 of 7 noticed Priya
   Nair (1188) listed twice with two badge numbers; five (Priya, Min-ji, Marcus, Morgan, Alex in
   passing) wanted to know which badge was thrown away, and Min-ji and Priya said a second badge is
   a real finding, not a duplicate to discard. Severity 2.
5. **People and buildings are drawn alike on the loaded network.** 3 of 7 (Marcus, Min-ji, Elena).
   Marcus: "I can't tell a building from a person without clicking"; Elena guessed the hubs were
   buildings and that the busiest was "the main office" with nothing to check that against. The
   import page offers "Color by type" under "How it is drawn"; nobody used it. Severity 2.
6. **"Higher means Stronger / Farther / Capacity" on the swipe count means nothing.** 4 of 7
   (Marcus, Grace, Alex, Elena) read it and left it alone. Severity 1.
7. **Type jargon in the match report.** 2 of 7 ("Number here and Category in people: matched as
   text" -- Marcus called it jargon a non-programmer has to decode; Elena skipped it). Severity 2,
   because it is what hid finding 3 from Elena.
8. **The "Makes" line reads like code, and 4,180 does not say it is one per swipe.** Grace and
   Elena called the line code-like but read it; Alex had to do arithmetic to see that 4,180 edges
   meant one per swipe. Severity 1.
9. **Minor, one participant each.** The network came out Directed without Grace choosing it; Morgan
   found the Pair toast long before its Undo at speech rate; Min-ji hit two controls labeled
   "Edges" in the graph view. Severity 1.

## What worked (counts out of 7)

- **One click on Pair did the "tied once" job.** 7 of 7, and every one valued the count plus
  earliest and latest time it kept per pair ("that's exactly what I'd have done with a stats count
  by person,building in Splunk"; "I didn't have to do a groupby").
- **Unmatched ends flagged in place, in words, with Leave out as the default.** 7 of 7. Min-ji and
  Marcus said defaulting to Leave out rather than inventing nodes is right.
- **The counts reconcile across screens.** 7 of 7 checked 411 + 9 = 420, 1,306 edges, 14 isolated
  people, and 4,180 + 32 = 4,212, and said it held.
- **The match report survives Load.** 6 of 7 went back through "from 3 tables" and found it intact
  ("in Gephi the import report is a dialog you close and it's gone").
- **Would they use it over their current tool for this job?** For the join, the dedupe and the
  counts, yes or probably for Marcus, Alex, Elena and Grace; Priya, Min-ji and Morgan would use it
  to find that something is wrong and still go to pandas or a notebook for the list. All seven named
  the unmatched-row list as the thing that would change their answer.

## Evidence

Transcripts: study/round-8/sessions/r8-t24--<persona>.md. Renders:
tmp/round-8-sessions/r8-t24--<persona>/. Success-path renders: shots/tasks/r8-t24/01.png to
06.png; the flagged-rows state is 04.png.
