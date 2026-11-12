# Grade: session r1-s10 -- Dev, back for the class project, keeps only the strong ties in Les Miserables

**Grade: S** (success). Dev narrowed the drawing to the pairs who share 5 or more chapters, read
26 of the 77 characters from the screen, and brought all 77 back. The answer key's value for
prompt B is 26 of 77 characters joined by 51 ties, and that is what he gave. He also answered the
follow-up correctly: at 8 or more shared chapters, 17 of 77 characters and 19 ties. He brought
everyone back again afterward. He went straight down the answer key's second route (the "+"
beside Filters) with no wrong turns.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, with no uncommitted
changes. This is the frozen build the criteria name. The setup (`lesmis-ranked.txt`) reached its
end state. Every step's screenshot matches its command. On step 05 the tool reported that the
name matched both the list option and the Data tree item, and that it clicked the option, which
is what the participant meant. The session is not void.

## What the last screen shows (`12.png`)

- The header chip is gone. The Filters row reads "shared_chapters is at least 8" with its second
  line "off", and its checkbox is unticked.
- The Overview reads Nodes 77, Edges 254, and the whole drawing is back.
- The step is kept, not deleted, so it can be switched on again.

The answers he gave were read from the screens at the time:

- **5 or more** (`07.png`): chip "26 of 77 nodes"; row "shared_chapters is at least 5" over "77 to
  26 nodes"; Overview "Nodes showing 26 of 77", "Edges showing 51 of 254".
- **Back** (`08.png`): row "off", no chip, Overview Nodes 77, Edges 254.
- **8 or more** (`11.png`): chip "17 of 77 nodes"; row "77 to 17 nodes"; Overview "Nodes showing 17
  of 77", "Edges showing 19 of 254".

## Measures

- **Steps:** 11 after the start (`02.png` to `12.png`). The main task took 7 (`02.png` to `08.png`),
  about the same as the answer key's success path. The follow-up took 4.
- **Wrong turns: 0.** Opening Data at step 02 to look at the tie numbers was his own way in, and
  it led straight to Filters.
- **The known trap** (ticking the checkbox after "Save and turn on", which switches the step off):
  he avoided it. He read "Save and turn on" as switching the step on (step 10 remark). The only
  tick he made after saving was the untick that brings everyone back (`12.png`).
- **False "done": none.** Each claim matches its screen: 26 and 51 at `07.png`, 77 back at
  `08.png`, 17 and 19 at `11.png`, and 77 back at `12.png`. He did not mistake the Overview's
  whole-graph Nodes 77 for the filtered count (no `read-wrong`). truth-on-screen: no wrong claim.
- **Overlapping dots:** he never counted dots, so the pair of dots near 640,372 (25 dots visible
  out of 26) did not come into play.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). A finding that is only the participant's opinion is held one
level down. Each one is confirmed only when the round is tallied across sessions. Where r1-s09 (the
same task, prompt A) raised the same point, the problem says so.

1. **Severity 2 -- "Components 1" sits just below "Nodes showing 26 of 77" while the drawing shows
   three separate groups.** The line between them says the lower counts are for the whole graph.
   He read that line twice and then understood. For an essay he wanted the number of groups in
   what is showing, and nothing on the screen gives that number. A reader who misses the line would
   report one group. Evidence: `07.png`, `11.png` (the drawing shows three groups at 5 or more and
   two at 8 or more), step 07 remark, debrief.
2. **Severity 1 (opinion; r1-s09 raised the same point) -- the filter has no preview before "Add
   step".** He typed 5, the drawing did not change, and he had to commit the step before he could
   see what it kept. Evidence: `06.png`, step 06 remark, debrief.
3. **Severity 1 (opinion) -- Filters can be found only on the Data place.** He found it only
   because he had opened Data to look at the tie numbers. From the Graph view he says he would have
   tried the toolbar first, and nothing there leads to a filter. Evidence: `01.png`, `02.png`,
   debrief.
4. **Severity 1 -- the step's on/off checkbox is small and has no visible label.** He guessed what
   it did, and the "off" on the row's second line confirmed the guess. Evidence: `07.png`,
   `08.png`, debrief.
5. **Severity 1 -- while a step's value is being edited, the editor's heading still shows the old
   value ("at least 5" with 8 typed) until Save.** He had to check that he was typing in the right
   place. Evidence: `10.png`, step 10 remark, debrief.

This session did not meet two things the answer key lists. First, the legend keeps the whole
graph's PageRank range (0.003299 to 0.07543) while the filter hides nodes (`07.png`, `11.png`). He
did not read it as a count, so it is not recorded here. Second, after "Add step" the right panel
showed the Overview, not the step editor. He reopened the editor by clicking the row, so it cost
him nothing.

What worked:

- The word "Filters" in the Data panel matched the term he learned in his course, so he found it at
  once.
- "at least" was already chosen in "Is".
- "Keeps edges that pass and the nodes at their ends" told him in advance that a character with no
  strong tie would drop out (`05.png`).
- The chip, the row's "77 to 26 nodes" and the Overview's "showing" rows all gave the same count.
- The row shows the rule as a sentence he would show his instructor.
- Clicking the row reopened the step with its value, and "Save and turn on" said what it would do
  (`09.png`).

## What this says about the round

This session found no build defect. Every control did what the answer key says, and no time went to
a broken control. The filter path held up for a returning student who had never filtered in this
app. The findings are about reading the result: whether a structural count, such as the number of
groups, is for what is showing or for the whole graph, and whether a filter can be previewed before
it is committed.
