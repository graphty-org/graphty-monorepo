# Grade: session r5-s01b -- Grace (tier 1 graduate), bus stops (T22 A), links that meet a condition

**Grade: S** (success). The last screen (`04.png`) matches the answer key's A end state: the
inspector header reads "3 edges selected" (subtitle "Selection"), Summary Edges 3, and a "Selected
edges" table (Edge, minutes) lists School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14 --
the key's three links. The left panel's Selection row reads 3, the PageRank row still reads 10, and
all 10 stops and every gray link are still drawn, with the three slow links drawn as thick blue
bands. No filter step exists (`work.json`: steps empty at start and end). Grace answered "3 links
take 10 minutes or more" and named all three with their minutes, read from the table.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900. Start: the bus-stops setup (bus-stops.csv loaded, PageRank run, nodes sized
and colored by PageRank). Tool commit `a5de4b445f59`, recorded with uncommitted changes in the
tool's checkout; every step still produced its screenshot, so this does not void the run.

This session re-runs r5-s01, which was void because the round's gate had not passed.

## The answer against the key

- **Marked (right).** `04.png`: exactly the three key links selected and drawn in blue; nothing
  hidden (10 stops and all their links on the drawing).
- **Count (right).** 3, read from the screen: the suggestion row "(3)", the inspector header, the
  Summary, the Selection row and the three table rows agree.
- **Route not in the key.** Grace did not type a rule. She clicked the find box and typed "10";
  under a "Values" heading the box offered one suggestion row, "minutes is 10 or more (3)", with a
  funnel icon (`02.png`). Clicking it selected the three links (`04.png`). The key grades other
  routes by the end state, and the end state is right. The key's T22 entry still does not describe
  this Values suggestion (round 4's r4-s10 took the same route on B); it should be added for later
  graders, with the A wording above.
- **Work kept.** `work.json`: start and end lists identical (one PageRank run, three style layers,
  no notes, no steps, one source); nothing gone.

## Measures

- **Route:** a value suggestion in the find box (not a typed rule, Shift-clicks, a color or a
  filter). "=" was never typed and never needed. No separate select-by-condition control was looked
  for anywhere.
- **Where she looked for `minutes`:** nowhere first; typing the threshold alone surfaced the column
  in the suggestion.
- **Steps:** 3 `real.mjs` steps after the start: click the find box and type "10" (one command),
  hover the suggestion, click it. The success path is 3. The hover changed nothing on screen
  (`02.png` and `03.png` are identical) and is a check before a feared destructive click, not a
  wrong turn.
- **Wrong turns:** 0.
- **False "done":** none. "Three links take 10 minutes or more ... picked out in thick blue on the
  map, and every stop and link is still drawn" is true on `04.png`. truth-on-screen holds.
- **Silent commit:** none. The click drew the bands, set Selection to 3 and switched the inspector.
- **Numbers that disagree:** none.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Four screenshots for four steps; `leaks.json` shows no
  leaks over 10 calls, and the briefing names no route or control.
- **Scripted exit:** not applicable; Grace finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                             | Evidence                                                                                                                                                         |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | trust           | The Values suggestion row carries a funnel icon -- the same icon as the toolbar's filter button -- but clicking it selects and hides nothing. Hovering shows no tooltip, so the reader cannot tell before clicking whether stops and links will vanish; Grace "clicked on faith". | `02.png` (funnel on the row, funnel in the bottom toolbar), `03.png` (hover: no tooltip, screen unchanged); transcript steps 2-3 and "What confused me"            |
| 2   | 1        | missing feature | The marking is only a selection; Grace was unsure it would survive a click elsewhere, and there is no visible way to keep the marked links for a slide. Did not affect the task; the loss on a later click was not observed in this session.                                      | transcript "What confused me": "not sure the blue survives if I click somewhere else ... for the board slide I would want it to stay"                              |

Problem 1 is now reported by two participants on two builds (round 4's r4-s10 on 5277e2cbe, this
session on 8c015b806), both in the same words of fear about hiding, so it counts as confirmed.
Problem 2 echoes r4-s10's third problem and also has two participants, at severity 1.
