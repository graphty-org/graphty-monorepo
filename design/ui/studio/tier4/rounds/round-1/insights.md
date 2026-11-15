# Tier 4 round 1 insights: returning users managing their data

Settled from `scores.md` by two independent skeptic checks, on the frozen build 79ed770292
(graphty@0.8.92). Rule: an item both skeptics drop is dropped; an item one skeptic drops or
weakens is weakened (lower severity, narrower claim, or a caveat). Every participant is the same
model playing returning-user personas, so a failure is strong evidence and a pass is weak.
Screenshots are under `sessions/` and `repro/` of this folder. Most severe first.

## A study-tool defect behind several findings

When a participant hovers something that opens a popover rather than a tooltip, the study tool
(the studio's `tool/real.mjs`) prints `tooltip: null`. Hovering a column header's issue mark does open its fix
list ("1 value with padded spaces", Trim / Ignore / Show rows / Ignore all: `sessions/r1-s13/03.png`,
also r1-s15/03.png, r1-s21/12.png, r1-s22/12.png). r1-s13, r1-s15, r1-s21 and r1-s22 believed the
tool's line over the screenshot and reported that nothing appeared; r1-s13 "almost gave up after
the hover". This produced false findings (the pointer half of problem 11, accessibility finding 15)
and two of T64's wrong turns. **The tool must report an open popover or hover card on hover before
round 2.** Both skeptics raised it.

## Where the bars stand after the check

| Bar                    | After the check                    | Why                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Task success         | Holds                              | Unchanged: 25 of 26 pointer sessions S or SD                                                                                                                                                                                                              |
| 2 False "done"         | Fails as frozen, contested         | r1-s08's false done exists only against the answer key's definition (column type must be date). His answer (G10 Birch Hollow) was right, and the program does read the column as dates on the timeline. Counted, flagged                                  |
| 3 Wrong turns          | Fails as frozen; not shown as a design failure | Before success each T64 session had exactly 1 wrong turn (the "Higher means" words). The rest were checks after the task was done, and the issue-mark hovers came from the tool defect above. Without them the median is 1 to 1.5, within the limit of 2. Graders also counted hovers inconsistently |
| 4 Severity 3 and 4     | **Holds**                          | 0 severity 4 (end-state check, 60 items). None of the four severity 3 candidates holds at 3 after the check (below)                                                                                                                                      |
| 5 Keyboard             | Fails                              | Unchanged: axe's critical `aria-valid-attr-value` on 14 of 16 screens in each theme (the table's Nodes tab names a panel never rendered). Sam 2 of 2 S                                                                                                     |
| 6 Owner's data rules   | **Fails**                          | The joined source row's approved ratio ("17/19") is not drawn. Corrected mechanism: it is not removed but clipped out of sight; the row's text still holds it (`route.jsonl` of s01-s04). Same layout cause and fix as problem 8                          |
| 7 Cost on core tasks   | Fails                              | Unchanged. T61 fails either way (about 12 inputs to the joined network against a path of 7); T65 and T67 fail mostly on checks after success                                                                                                             |

## Severity 3 candidates after the check

| #   | Problem                                         | Skeptics                         | Result                                                                                                                                                                                                                                         |
| --- | ----------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The join preview marks the wrong rows           | Weaken to 2; keep at 3           | **2, the most severe open problem.** Real defect (`repro/r1-s03/02.png`: P05-P13 untagged, the repeated P03-P10 tagged). 3 of 4 read the untagged row as "left out", but all four read the result correctly from the counts right after Join; the cost was steps, not a wrong result |
| 2   | Setting the time leaves the column text         | Both weaken to 2                 | **2.** The header glyph says text while the timeline draws dates. The one false done rests on the key's definition; the same "Set in Data" is T63's success path (r1-s20 at step 1)                                                             |
| 3   | "With issues 11" counts suggestions, hides G12  | Weaken to 1; weaken to 2         | **1.** The product's own issue list counts the "could be yes/no" rows as issues; G12's problem is on an edge; the chip does show it is on (`repro/r1-s20/04.png`); r1-s20's conclusion was correct. What remains: a "12 nodes" caption beside an 11-row table |
| 4   | Export's format warning drops focus             | Both weaken                      | **Candidate at 2, not counted.** The focus loss is real (`expert/a11y/k5/route.jsonl` step 23); "says nothing" is the tool's inference, and no screen-reader participant reached Export. Needs its own repro                                     |

## Problems 5 to 36 after the check

Unchanged problems keep the severity and evidence in `scores.md`. Changes:

| #   | Change                                                                                                                                                                                                                         | New sev |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| 5   | Drop "Keep first changes nothing": Keep first is already what Join does, so no change is expected. The defect is that the repeat's menu marks no current choice and names no row                                                | 2       |
| 8   | Merged with bar 6 (one layout cause: the row's text holds the ratio and the name, both clipped). All three graders rated the name cut 1; every participant matched the row by order. Fixed with bar 6                           | 1 (bar 6 stands) |
| 10  | One skeptic drops, one weakens: nobody stopped at the A-to-Z sort, and an ISO-day sort in date order is correct. Watch item only                                                                                                | 1       |
| 11  | The pointer half is the tool defect. Remains: the mark keeps a default cursor, is exposed as an image and its issue is not spoken on focus (accessibility finding 8). Accessibility finding 15 needs re-checking               | 1       |
| 14  | Corrected: the tooltip ("Hide nodes that do not match") and the behavior agree; only the bare label "Hide" is ambiguous. Five T65 sessions used it correctly; only r1-s23 misread it and recovered                               | 1       |
| 15  | Kept, with a caveat: the task order (filter first, then mark) makes the default bite every time, and the same default helped T66 (r1-s24 relied on Hide)                                                                         | 2       |
| 16  | Kept on the two counting bases (s09, s10, s12). Drop "s09 concluded order could change the count" as evidence: the follow-up question invited the guess                                                                         | 2       |
| 20  | Evidence narrowed to s23 and its repro; s24 shows a different thing (an empty "Contains" box that changes nothing)                                                                                                              | 2       |
| 21  | Split. The place roles have no header chip: kept at 2. The Role submenu opening highlighted on None: the menu focusing its first item, misled s20 for a moment                                                                  | 2 / 1   |
| 22  | Pointer half weakened: the "..." appears on header hover (r1-s13/03.png) and every T62 session found it on the first click. Keyboard half stands: the button is not a Tab stop (accessibility finding 9)                        | 1 / 2   |
| 23  | CSV half kept (s25 plus accessibility walk k5; s26 was GraphML). GraphML half weakened: `graphty.style.node.hidden` is graphty's own key, so "node visible not written" may be true for another program. The wording problem stands | 2       |
| 25  | A press on the scrollbar counts as a click outside the popover; cost one step                                                                                                                                                   | 1       |
| 26  | Defect kept; the owning package is not shown (`data.json` gives phone no role, so the "Coordinates: phone" may be the app's display, not the element's guess)                                                                     | 2       |
| 36  | No session tripped on the differing glyphs; experts and the audit only                                                                                                                                                          | 1       |

## Insights, most severe first

### 1. The join screen does not show what Join will do, so people find out after

The preview leaves the row with an unknown end untagged and marked "1 not in graph", which 3 of 4
T61 participants read as "this row will be left out"; Join adds it and makes an empty node, and the
repeated key is tagged as added (`repro/r1-s03/02.png`). Every participant then read the real result
from the node and edge counts, so no wrong result stood, but T61 is the costliest core task (about
12 inputs to the joined network against a path of 7). One skeptic held this at severity 3, the other
at 2; it is the most severe open problem. Weakened from the scored form: r1-s01, s03 and s04 found
the stray row before Join through the "1 not in graph" chip, so not everyone learned only from the
tables.

### 2. Choices come after the act, with a default already applied

The unknown end is decided only after Join, in the issue list, with "Add nodes" already in effect,
and "Leave out" does not say it deletes (problem 6: s02, s03, s20, s24, s27; r1-s24 backed off
"Leave out" for that reason). A new filter card starts on Hide, so 5 of 5 participants who made a
card meant to mark first lost part of the picture before switching to Select (problem 15,
`sessions/r1-s09/16.png`: "4 of 24 nodes"). Weakened: the Hide half depends on the task's order,
and the same default helped T66. The planned "Select | Filter to | Filter out" change in
`../../../owner-decisions.md` renames the effect but keeps a new card starting on taking things out.

### 3. One fact drawn two ways makes people open a second menu to check

Designating the time leaves the column's kind text: the header shows the text glyph while the
timeline draws "Jun 30, 1995 - Jun 27, 2018" (problem 2, `sessions/r1-s08/05.png`); four sessions
named the contradiction. A filter card's chip counts on the whole graph under Hide and within the
picture under Select (problem 16); the place roles are set but unmarked on the headers (problem 21).
Weakened: "With issues 11" (problem 3), the Hide label (problem 14) and the kind glyphs (problem 36)
no longer support it, and the one false done rests on the answer key's definition. It costs doubt
and steps, not wrong answers.

### 4. The joined source row hides the approved ratio and the second file's name

On every joined start the second source's name is cut short ("deliveri...", "d..") and the
approved "17/19 rows joined" ratio is clipped out of sight, though the row's text still holds it
(`sessions/r1-s03/20.png`). That breaks the rule that an owner-approved surface is not removed
(bar 6). Readers paid little (they matched rows by order), so the cost is the broken rule and the
decided fix not built, not confusion. One layout fix covers both. Side note for the fix: "17 of 19
joined" next to 18 edges contradicts itself.

### 5. The table header is where people go for column work; the inspector's "Set in Data" misleads only when the task is about the column's kind

T62: 3 of 4 went to the header and succeeded; the one who pressed the inspector's "Set in Data"
designated the time and stopped while the column was still text. T63: both checked the place in
the header's Role menu. Weakened: the same "Set in Data" is T63's success path (r1-s20 finished in
one step), so it is a trap only when the kind matters, and n = 4 with one P.

### Dropped or confounded

- **A fix created a trap** (the first header click sorting ISO days A to Z looks date-sorted):
  dropped by both skeptics. Nobody fell into it, and nothing shows the earlier date fix made it.
- **Where people fix issues depends on where they already are** (T67 A to the table, B to the
  source row): one skeptic drops, one weakens. With two sessions per half the split follows the
  dataset and persona, and B's table chip read an inflated "With issues 11" against A's 2. Not
  shown.
