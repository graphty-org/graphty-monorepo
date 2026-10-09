# Grade: session r1-s14 -- Grace, back for the quarter, keeps only the strong ties in Les Miserables

**Grade: S** (success). Grace narrowed the drawing to the pairs who share 5 or more chapters. She
read 26 of the 77 characters, joined by 51 ties, from the screen, then brought all 77 back. These
are the answer key's values for prompt B. She also answered the follow-up correctly: at 8 or more
shared chapters, 17 of 77 characters and 19 ties. She brought everyone back again afterward. She
took two wrong turns before she found Filters under Data. The answer key's SD cases are a wrong
first comparison and a count made by counting dots. Neither happened here, so a search detour
alone does not lower the grade.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, with no uncommitted
changes. This is the frozen build the criteria name. The setup (`lesmis-ranked.txt`) reached its
end state (`01.png`). **One tool step misfired, and it does not void the session.** At step 7,
`--click "Value" --type "5"` printed `Could not click "Value": elementHandle.click: Timeout 3000ms
exceeded`. The tool went on to run the `--type` anyway, so the "5" landed in the box that still
had focus: the Attribute box, which then read "shared_chapters5" (`08.png`). Three things show
this is the tool's fault and not the app's:

- The same command worked on this build in every other T17 session (r1-s09, r1-s10, r1-s11,
  r1-s12, r1-s13, r1-s15) and in the answer key's walk.
- Five sessions started between 06:14 and 06:24 UTC. r1-s16 started four minutes after this one
  and recorded a load average of 158 on 32 threads, with clicks missing Playwright's 3-second
  limit in the same way.
- Nothing in `07.png` covers the Value box.

So the mechanism is the tool's 3-second click limit under machine load. Nobody traced this one
click, so that is the most likely cause, not a proven one. The answer key counts click timeouts
as the tool's, not as participant misses. Grace recovered with an action any person could take:
she clicked the Value box itself (`09.png`). The misfire cost one step and did not change the
outcome.

## What the last screen shows (`16.png`)

- The header chip is gone. The Filters row reads "shared_chapters is at least 8" with its second
  line "off", and its checkbox is unticked.
- The Overview reads Nodes 77 and Edges 254, and the whole drawing is back. The step is kept, not
  deleted.

She read each answer from the screen at the time:

- **5 or more** (`11.png`): chip "26 of 77 nodes"; row "shared_chapters is at least 5" over "77 to
  26 nodes"; Overview "Nodes showing 26 of 77" and "Edges showing 51 of 254".
- **Back** (`12.png`): row "off", no chip, Overview Nodes 77 and Edges 254.
- **8 or more** (`15.png`): chip "17 of 77 nodes"; row "77 to 17 nodes"; Overview "Nodes showing 17
  of 77" and "Edges showing 19 of 254".

## Measures

- **Steps:** 15 after the start (`02.png` to `16.png`). The main task took 11 (`02.png` to
  `12.png`), against about 7 on the answer key's path. Two of the extra steps were wrong turns and
  two came from the tool misfire (steps 7 and 8). The follow-up took 4.
- **Wrong turns: 2.**
  1. Step 1 (`02.png`): she hovered the toolbar's second button to look for a way to narrow the
     drawing. It is Layout.
  2. Step 2 (`03.png`): she opened Everything, where her history says she styled before. It holds
     only Style and Values, with nothing about leaving ties out.
  Step 3 took her to Data to look at her columns, and that is where she found Filters. Steps 7
  and 8 are not counted as wrong turns, because they came from the tool misfire.
- **The known trap** (ticking the checkbox after "Save and turn on", which switches the step off):
  she avoided it. After saving, she read the chip at 17, then unticked once to bring everyone back
  (`15.png`, `16.png`).
- **False "done": none.** Each claim matches its screen: 26 and 51 at `11.png`, 77 and 254 back
  at `12.png`, 17 and 19 at `15.png`, and 77 and 254 back at `16.png`. She did not take the
  Overview's whole-graph "Nodes 77" or "Components 1" for the narrowed count (no `read-wrong`).
  truth-on-screen: she made no wrong claim.
- **Overlapping dots:** she never counted dots, so the near-overlapping pair at 640,372 played no
  part.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). A finding that is only the participant's opinion is held one
level down. Whether a problem is confirmed is decided when the round is tallied across sessions.

1. **Severity 2 -- nothing on the screen a person checks first leads to narrowing the drawing.**
   She looked in the two places her history names, the toolbar and Everything, and found Filters
   only because she went to Data for another reason (to see her columns). In her words, she "would
   not have guessed that narrowing the picture lives under Data rather than Graph or the toolbar".
   Evidence: `02.png`, `03.png`, `04.png`, debrief item 1.
2. **Severity 2 (r1-s10 raised the same point) -- "Components 1" sits just below "Nodes showing 26
   of 77" while the drawing shows separate groups.** A line between them says the lower counts are
   for the whole graph. She read that line and then understood, but it "made me look twice".
   Nothing on the screen gives the number of groups in what is showing. Evidence: `11.png` (three
   groups in the drawing), `15.png` (two groups), step 10 remark, debrief item 3.
3. **Severity 1 -- the Attribute box takes typed text after an option is chosen.** It read
   "shared_chapters5" until focus left it, and then went back to "shared_chapters" on its own.
   Here the typing came from the tool misfire, but a person whose click misses the Value box would
   meet the same thing. For a moment she thought she had broken the column choice. Nothing was
   lost. Evidence: `08.png`, `09.png`, debrief item 2.
4. **Severity 0 (opinion) -- "Filter step" and "Add step" do not match how she thinks of a
   filter.** She would have expected "Add filter" or "Apply". It did not slow her down. Evidence:
   debrief item 4.

What worked, from the screens: "Keep: an attribute's value", the column name, "at least" and a
number matched how she thinks about the task. The line "Keeps edges that pass and the nodes at
their ends" told her how characters would be counted before she pressed anything (`07.png`). Her
PageRank colors and sizes stayed while the filter was on. She changed the 5 to an 8 in place, and
"Save and turn on" did what its name says.

## For the tool, not the app

`real.mjs` went on to the next action in a command (`--type`) after that command's click had
failed. When a click fails, the tool should stop the command, so that the typing cannot land in
whichever box still has focus.
