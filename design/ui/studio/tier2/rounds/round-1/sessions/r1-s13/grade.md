# Grade: session r1-s13 -- Elena, back for a running-club flyer, keeps only pairs who ran together 4 or more times (friends.csv)

**Grade: S** (success). Both answers are right and were on screen before she gave them: 19 people
for 4 or more runs together, and 10 people for the follow-up's 5 or more. Each time she brought
the whole club back. The last screen shows all 20 people and all 41 ties with the filter step
switched off. She took no wrong turn, and her steps match the success path in number.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. The setup ran (`friends-ranked.txt`: open
friends.csv, run PageRank, size by PageRank) and ended on the expected screen (`01.png`). Every
step's screenshot matches its command. The session is not void.

## What the last screen shows (`12.png`)

- The Filters row reads "weight is at least 5" with "off" on its second line, and its checkbox is
  unticked.
- The header has no "N of 20 nodes" chip.
- The Overview reads Nodes 20 and Edges 41, with no "showing" rows.
- The drawing shows every tie again.

The answers were on screen first:

- **4 or more (`07.png`):** chip "19 of 20 nodes"; row "weight is at least 4" over "20 to 19
  nodes"; Overview "Nodes showing 19 of 20", "Edges showing 12 of 41". The answer key gives 19
  of 20 people and 12 ties.
- **Back (`08.png`):** she unticked the step, and the row read "off" with the chip gone.
- **5 or more (`11.png`):** chip "10 of 20 nodes"; row "weight is at least 5" over "20 to 10
  nodes"; Overview "Nodes showing 10 of 20", "Edges showing 5 of 41". The answer key gives the
  same.
- **Back (`12.png`):** as above.

## Measures

- **Steps:** 11 after the start: 7 for the main task and 4 for the follow-up. The success path
  is also 11 (7 + 4). Her path to the step editor went through the other way the answer key
  accepts: the Filters "+" ("Add filter step"), then Attribute and weight, instead of the
  attribute's "Attribute actions" menu.
- **Wrong turns: 0.**
- **The follow-up trap:** she avoided it. She edited the step that was off, pressed "Save and turn
  on", and read the narrowed count with the box ticked (`11.png`). She did not tick the box
  afterward expecting to switch the step on. Her only tick after saving was the one meant to
  bring everyone back.
- **False "done": none.** Every claim matches the screen beside it: "19 people", "Everyone is back:
  ... Nodes 20, Edges 41", "10 people", and "The whole club is back". She also gave a count of
  dots ("roughly 19 balls"; "10 balls (two overlap at the bottom)"), and both agree with the chip.
  truth-on-screen: no wrong claim.
- **Legend:** the drawing's PageRank legend keeps the whole graph's range while the filter is on
  (`07.png`, `11.png`). She did not read it as a count.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). None of these stopped her, and no build defect appeared:
every control did what the answer key says it does.

1. **Severity 1 -- a filter takes effect only after "Add step". Typing the value changes nothing
   on the drawing, and the word "step" made her wonder whether she was building "some multi-part
   recipe".** She pressed Add step on the next action. Evidence: `06.png`, step 6 remark,
   debrief.
2. **Severity 1 -- she could not tell beforehand whether unticking the checkbox would delete her
   filter or only pause it.** The row's "off" settled it afterward. Nothing on the row says
   "pause" before the click, and the tooltip "Turn this step on" appears only on the box of a step
   that is already off. Evidence: `07.png`, `08.png`, debrief.
3. **Severity 1 -- the app says "weight", "nodes" and "edges", while her file means runs, people
   and pairs.** She guessed that weight was the runs count because it was the only number on the
   ties. This is an opinion about wording, held one level down. Evidence: `02.png`, `04.png`,
   debrief.
4. **Severity 0 -- she was surprised that only one person dropped out at 4 or more.** She trusted
   the number because the chip and the Filters row agreed. Evidence: step 7 remark. Recorded only
   because the agreement of two readouts is what settled her doubt.

What worked: the Filters "+" sat beside the attribute list. The step editor reads like a sentence
("Keep an attribute's value ... weight ... is at least ... 4"), and the line "Keeps edges that pass
and the nodes at their ends" told her in advance that people with no strong tie would drop out
(`05.png`). Clicking the step's row brought back the same form for editing, and "Save and turn on"
named its effect, so the follow-up trap did not catch her (`10.png`, `11.png`).

## What this says about the round

The session spent no time on broken or misleading controls. The filter path, the counts in its
three places, and switching the step off and on all worked as the answer key records. The only
friction is wording: "step", "weight" against what the file means, and whether unticking pauses or
deletes. Because a simulated returning user is briefed on the shell, the fast, clean run is weak
evidence that real people would find it as easy.
