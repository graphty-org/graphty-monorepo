# Tier 2 round 2 insights: returning users on the real graphty app

What round 2 of the returning-user study shows, after two independent skeptics checked every bar,
problem and candidate insight in `scores.md` against the grades, transcripts, screenshots, the task
file and the expert reports. Rule applied: a claim both skeptics drop is dropped; a claim either one
weakens or drops is weakened, unless the other answers its reason with evidence. Most severe first.
Severity is Nielsen 0 to 4 (4 = cannot be done, the user leaves, or reports a wrong answer
unknowingly). Screenshot paths are relative to `sessions/`.

All participants are simulated: one model playing personas, each told a history of earlier
sessions. A failure is strong evidence; a pass is weak until real people confirm it. "4 of 4 did X"
says little about how a group of people behaves, because the four are the same model.

All 55 valid sessions succeeded, so no item below changed an outcome. What the checks change is how
much each finding can be trusted.

## 1. The study's own fault: participants read the facilitator's task file

**Both skeptics confirm it, and it decides how to read everything else.** Participants were meant
to see only a briefing (persona, history, prompt, start). Instead they found their task by reading
`../../tasks.md`, which also holds each task's list of words the prompt avoids (the names of the
controls on its route), each follow-up question, the list of detours the dry run walked, and for
the find-box rule task the design itself (a rule typed into the find box that starts with "=").

- r2-s05 says it read the "Words avoided" note "while locating the task section" (voided; still
  not re-run).
- 13 of 16 sessions of the two follow-up tasks did the follow-up before it was given, "from the
  task text" or "the task sheet".
- One sign the damage is uneven: 0 of 8 participants typed "=" first in the find-box rule task, so
  that task's design note was apparently not used.

What follows from it:

- The bias runs one way: it makes a route look easier. **A problem found anyway is robust; a route
  that worked is weak evidence.**
- The credits for this round's three new routes (setting what a weight means while opening the
  file, Replace in the source's menu, the find box's rule hint) are not shown. Each needs a re-run
  with the briefing enforced before it is credited.
- The second-time measure (doing a related question faster) is unusable this round.
- Severity was not held one level down for opinion-only problems, as the criteria ask; the
  verdicts below apply that.

Other study-made findings: the prompts' words "stand out" (two tasks), "who was first before",
"make sure both will still be there" and "every calculation treats more minutes as longer" each
produced behavior the scores had read as user need; the study tool's click by name landed on a
same-named control in r2-s17, s18 and s30; and the setups that start with no names drawn produced
part of the "no names" finding.

## 2. Did a dry run happen, and did participants hit implementation faults?

**Yes, a dry run happened, and the participants mostly met design questions, not broken
controls.** Before any session every task's success path and round 1's commonest wrong turns were
walked by pointer and keyboard on several builds, every task half was piloted on the study build,
the 30 detour walks were re-run on it (30 of 30 reached their screens) and the study tool's
self-check passed 5 times. No grade was decided by a build defect and no session ended on an error.

Of about 355 problems graders recorded, about 30 are implementation faults of the build. After the
skeptics, none is above severity 2, and two caveats stand:

- **Twelve of the thirty sit on the one detour no dry run walked: styling a selection.** The dry run
  styled a run's results, not a selection. There, a line Width added to a layer starts at 8 and
  draws as a hairline once the selection is cleared (`r2-s14/15.png`, `r2-s16/17.png`), and a line
  Color starts at A9A9A9, the gray every tie already has, so adding it changes nothing on the
  drawing (r2-s11, s13, s16). Both severity 2: every participant recovered, and the answer key did
  not need a style. The first dry run had ruled the width "works as designed"; the sessions show
  the reader's cost.
- **Two faults blamed on the app were started by the study tool.** In r2-s17 and r2-s18 the tool's
  click by name landed on the left panel's attribute row instead of the open list's option, which
  threw a half-made filter step away. The app does discard a half-made step silently (the controls
  expert found it with Tab then Escape), but no participant chose to click away. Confirm it with a
  script.

## 3. Confirmed severity 3: typing a condition into the find box

Both skeptics keep both items at severity 3, and the facilitator text would have hidden them, not
caused them.

- **The find box answers a column name, or a condition in the reader's own words, with only "No
  match".** 6 of 8 first typed the data's words, a bare number or a bare comparison ("chapters 10",
  ">= 10", "minutes"): `r2-s12/03.png` 'No match for "chapters 10"'. The hint toward a rule appears
  only once the exact column name and a condition are both there. The same dead end in 2 or more
  sessions is a confirmed broken habit by the criteria. On the bus-stop half the prompt supplies
  the column's word ("minutes"); on the Les Miserables half, where the column is "shared_chapters",
  the participant typed "chapters", so the finding holds on the half that tests it.
- **A number in a rule must be wrapped in backticks.** Seven sessions plus the controls expert;
  r2-s15: "I don't know what a backtick is" (`r2-s15/06.png`), and only the example line kept him
  going. The simulation understates it: the tool types a backtick at no cost.

Owner of the fix: graphty-element accepts a bare number and reports a column it cannot find as a
neutral fact; the app writes the words.

## 4. Confirmed severity 3: drawn names cover each other and the ties

Bar 10's first finding; both skeptics keep it. "Chloe" over "Farah", "Dev" over "Eli", "Hana" on
Ivan's dot, and the "Stadium" label covering most of the Station-Stadium tie, so a click on the tie
selects the stop (`r2-s52/02.png`). The label placement is graphty-element's and the layout is
unseeded, so it is reported as a class, not per instance. Long names cut at the canvas edge are
expert-only (no study file has long names).

## 5. Rerunning on a newer file: the obvious door doubles the ties

- **Severity 3, both skeptics keep.** "Open project or file..." with a newer copy of the loaded file
  offers only "Add to friends" with Cancel and Load; Load would make 82 edges from 41
  (`r2-s33/05.png`; also r1-s29 in round 1). Both participants caught the number; one who did not
  would get doubled ties with no warning, which would be severity 4.
- **Severity 2, both keep.** Replace exists only in the source's unlabeled "..." menu, reached
  through the Data place and the file's row; 8 of 8 found it by guessing even though "replace" was
  in the file they read, so the real cost is probably higher.
- Weakened to severity 1: the earlier ranking is gone after Rerun (the prompt itself asks "who was
  first before", so all 8 wrote it down); the new people drawn blue with no key entry (read
  correctly, r2-s34, s36); the stale histogram and Top 10 with no mark of their own (0 of 8
  misread). Severity 1: "Higher means: Not set" stops the reader; a left click on the source opens
  the table drawer.

## 6. Other confirmed problems, by task, after the verdicts

**Across tasks.** Severity 2: a layer made from a selection is named by its count ("13 edges"), so
the key says nothing about what the color means (seven sessions). Weakened to severity 1: no names
are drawn unless the setup turns them on (partly the setups, and a model reading screenshots cannot
hover to explore); Shortest path below the fold of the Analyze list (the filter box is focused and
matched participants' own words; what remains is that "linked" found nothing in r2-s26 and r2-s32
never found the tool); "As the file says" loads a CSV with one-way arrows (changed no answer); the
key's "PageRank on 20 nodes" while fewer are drawn (r2-s17 and s23 read it correctly); "hops",
"weight" and "Capacity" are not the readers' words.

**Making a condition stand out (find-box rule task).** Beyond section 3: severity 2, the line Width
and Color defaults (section 2), with "a selection does not last and nothing says so" merged into
them (the mark vanished only because the defaults drew nothing; 4 of 6 predicted the selection
would end); Enter does nothing on the shown rule (whether it can be copied is untested: the tool has
no copy and paste); the attribute's "..." menu offers only "Filter to..." and "Show in table".
Severity 1: no count before Enter; the rule stays in the box after its selection is gone; making or
recoloring a layer moves the drawing.

**Only the strong ties (filtering).** Severity 2: "Components 1" and the whole graph's counts under
"Nodes showing 17 of 77" (three sessions). Weakened to severity 1: nothing on the Graph place
points to filtering (Filters was found in 1 to 2 steps in 8 of 8); the step checkbox is 12 px (bar 8
measures it); no count before "Add step"; the editor's title shows the saved value during an edit.
Weakened to a note: counting overlapping dots by eye (the "17 of 77" chip gives the count).

**The fewest people in between (paths).** Severity 2: nothing at the find box leads on to the path
tool; r2-s26 and r2-s32 worked the chain out by hand, and r2-s32 never learned the tool exists. One
skeptic asked why this is not severity 3 by the same broken-habit rule as the find-box rule task.
It stays 2: that rule counts a place that "offers no way on to the task", and here the find box led
all 8 to a right answer, 6 of them on to the Analyze list, while in the rule task it answered only
"No match". It would be 3 on a graph too large to trace by hand. Weakened to severity 1: a second
Find path replaces the first chain with no notice (the second run exists only because the follow-up
asked for it, and all seven said no harm was done); the grayed "Guided route"; a highlighted tie
drawn through a node off the path; picking a name marks nothing; "Weight: None" reads as a warning.
One session: the reopened Path form starts From on the node still selected (r2-s30).

**Two spreadsheets as one network.** Weakened to severity 1: the bare "+" for adding a table; "Add"
and "Leave out" for an unmatched row (every participant read the row correctly before loading).
Severity 1: "New from data..." against "Open project or file..."; the email example on a football
file.

**Notes.** Severity 2: a new note takes whatever the inspector shows as its subject; a note about the
whole network needs a guessed click on empty canvas (the controls expert found the opposite
behavior; a script decides). Weakened to severity 1: nothing lasting says the work is saved (the
prompt asked to "make sure"); "Florentine families" listed twice.

**A step or two away (neighbors).** Severity 2: at Hops 2 the list does not say who is one step away
and who two; "Filter to neighbors" does not say whether it hides or deletes. Weakened to severity 1:
Neighborhood is not hinted (found in the node's "..." menu or the Degree row). Severity 1: "Hops" is
guessed; the halo stays on every dot after the filter.

**One tie on the drawing.** Severity 2: the "Stadium" label covers the tie (section 4). Weakened to a
note (one skeptic dropped it as the prompt's wording): the selection's halo reads as temporary, and
all four added a color because the prompt says "stand out"; the step count over the success path has
the same cause. Severity 1: "Select endpoints" wording; the key growing over "Depot"; "weight" and
the one-way "Gus -> Ivan" arrow.

**One person and their ties.** Severity 1: opening the list of connections silently selects the
whole neighborhood; severity 0: two controls look lit at once.

## 7. Candidate insights, after the verdicts

1. **The style defaults undo a mark (kept narrow).** A line Width of 8 and a gray starting color
   draw nothing a reader can see, on both datasets. The broader claim, that returning users want a
   lasting mark, is not shown: both prompts say "stand out" and one adds a colleague who "wants to
   see". Weakened by both skeptics.
2. **Readers type a condition in the data's own words, never as a rule (weakened, reworded).**
   Participants typed "chapters 10", ">= 10" or a column's word, never the syntax. Robust against
   the facilitator text, which would push toward "="; the clean evidence is the Les Miserables
   half. One skeptic kept it, the other weakened it because the bus-stop prompt supplies the column
   word; the Les Miserables half answers that only in part.
3. **Repeat work needs the earlier answer kept (weakened to the path half).** The rerun half is
   the prompt's own question and is dropped. What remains: participants who ran a second path
   expected the first chain to stay, but none lost anything they needed.
4. **Under a filter, readers ask whose numbers they see (weakened).** "Components 1" under a filter
   and "PageRank on 77 nodes" made participants stop in 11 sessions across two tasks, but most read
   the scope correctly; it is opinion level.
5. **Readers check a drawn answer against names (weakened).** The setups draw no names, and a model
   reading screenshots leans on drawn labels more than a person who can hover.
6. **The round 2 routes carried habits to the task: dropped** by both skeptics. The facilitator
   file named the controls each route ends on.

## 8. Bars after the verdicts

No skeptic changed a bar's status. Bars 1 to 7 hold, bar 1 with the facilitator-text caveat; bars
8 (two serious automated accessibility failures), 9 (b) (words at rest rose on every tier 2 screen),
10 (the two severity 3 findings in sections 3 and 4) and 11 (paths, 8.5 steps against 8) fail. Bar
3 still holds: the doubling door in section 5 is severity 3, because both participants who met it
caught the 82.

## 9. What the next round needs

- Make the briefing the only thing a participant can read: `tool/real.mjs --start` refuses a
  session folder with no `briefing.md` it wrote, and participants run from their session folder.
  Then re-run the three new routes before crediting them, and the follow-up tasks for the
  second-time measure. Re-run r2-s05.
- Seed the dry run with this round's detours: style a selection (width, color, its name), click
  away from an open step editor, run a path twice, reopen the Path form, open a newer copy of a
  loaded file.
- Write prompts that do not invite a style ("stand out") unless the task measures styling.
- Script the two disputed behaviors: a half-made filter step discarded on another selection, and a
  click on empty canvas while a run is selected.
- Fixes in their owning package: bare numbers and a neutral "no such column" fact in
  graphty-element's rule parser; the edge-style starting width and color; a warning before an
  "Add" that would duplicate every tie; label placement in graphty-element.
