# Grade: session r1-s43 -- Nadia (returning), T22 prompt A, bus stops

**Grade: F (`not-marked`).** The run completed normally on build 946256efb876 (`session.json`), so
the session is not void.

## Against the success definition

The task asks for every link of 10 minutes or more to stand out from the rest, with nothing taken
off the drawing, and for the count. The answer key's reference is 3 links (School to Harbor 12,
Station to Harbor 14, Depot to Station 15), marked as a selection with "3 edges selected" on screen.

What the last screenshot (24.png) shows:

- All 10 stops and all 17 links are still drawn, and no filter step is on. That part passes.
- No link is selected: the Selection row has no count, and no link has a blue band.
- Every link is colored on a continuous orange-to-brown scale by minutes (Linear, key "Edge color:
  Everything, 2 to 15"), and every link carries its minutes as a label. The 15, 14 and 12 links are
  the darkest, but the 9 link is nearly as dark. A continuous scale does not separate exactly the
  links of 10 or more. The answer key accepts a color route only when the color "separates exactly
  the 10-or-more ties", so this one does not count as marking.
- The count the participant gives, 3 (15, 14 and 12), is correct. It was read by hand from the
  labels on all 17 links, not from anything that marks the three.

The links of 10 or more are not marked apart from the rest, so the grade is F `not-marked`. The
correct count does not change the grade.

**False "done":** none. The debrief says "Partly" and states that the three are not made to stand
out.

## Route and measures

- **Route:** an edge color from data on Everything, then a minutes label on every link, then
  counting the labels by hand. The participant never typed "="; they typed `10` and
  `minutes >= 10` without it, which reached the "No match" path instead of the rule path.
- **Places the participant looked for a "select where" or a threshold:** the Scale menu in "Color
  from data" (10.png), the find box (12.png to 14.png), the Data page's minutes summary (16.png),
  the Graph and Everything Values tabs (17.png, 18.png), and Quick actions ("minutes",
  "highlight"; 20.png, 21.png).
- **Where `minutes` was found:** the "Color by attribute" popup (07.png) and the Data page's
  attribute list (15.png).

## Wrong turns: 7

1. The Scale menu, looking for a cut at 10 (09.png, 10.png).
2. Typing `10` in the find box (12.png).
3. Typing `minutes >= 10` without "=", then Enter (13.png, 14.png). This is one "=" and a pair of
   backticks away from the success path.
4. The Data page's minutes summary (15.png, 16.png).
5. The Graph inspector (17.png).
6. Everything, Values tab (18.png).
7. Quick actions, searching "minutes" and then "highlight" (19.png to 21.png).

Adding Color from PageRank's Edges panel (03.png, 04.png) is not counted as a wrong turn. It led
where the participant wanted to go, but it got there by a surprise (problem 3).

## Problems

Each problem is labeled **design gap** (the app does not offer or point to what the participant
needed) or **build defect** (the screen does something wrong or misleading).

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                                                                                                                         | Evidence       |
| --- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | 4        | design gap   | The find box says it finds "values", but a condition typed in a spreadsheet's way (`minutes >= 10`) gets only "No match for ..." with no hint that a rule starts with "=" or that numbers need backticks. The rule path exists, but this participant typed the condition and was still turned away. This is the task's blocker. | 13.png, 14.png |
| 2   | 3        | design gap   | "Color from data" offers only continuous and binned scales (Linear, Logarithmic, Equal bins, Quantiles, ...). There is no scale that splits at a value the user chooses, so the color route cannot separate "10 and up" from the rest.                                                                                          | 10.png         |
| 3   | 2        | build defect | When Color is added from the Edges panel while the PageRank layer is open, it is written to the Everything layer. Nothing appears in the panel that is open; only the key's new "Edge color: Everything" entry shows that anything happened.                                                                                    | 03.png, 04.png |
| 4   | 2        | design gap   | The Data page's summary of an edge column gives the range and the number of distinct values. It offers no list of rows and no count above a value, and it has no route to select by the column.                                                                                                                                 | 16.png         |
| 5   | 2        | design gap   | Quick actions finds nothing for "minutes" or "highlight", so it gives no route to select or mark by a condition.                                                                                                                                                                                                                | 20.png, 21.png |
| 6   | 1        | build defect | The edge Width field reads 8, but the links are drawn hairline-thin, and the field shows no unit.                                                                                                                                                                                                                               | 11.png         |
| 7   | 1        | build defect | Two edge labels ("3" and "3") are drawn on top of each other near the middle of the drawing.                                                                                                                                                                                                                                    | 24.png         |
| 8   | 1        | design gap   | The edge color scale uses the same orange-to-brown palette as the nodes' PageRank color, so the shaded links blend into the stops.                                                                                                                                                                                              | 08.png         |

## Caveat

This participant is simulated. A returning user's knowledge comes only from the history given in
the briefing, which does not mention the "=" rule. A failure here is strong evidence; it needs
real people to confirm it.
