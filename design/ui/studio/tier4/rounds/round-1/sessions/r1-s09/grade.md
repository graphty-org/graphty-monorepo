Grade: S
False done: 0
Wrong turns: 0
Steps: 16 inputs after the start (path steps: 14); 5 of them were checks the path does not need
Model: opus (claude-opus-5-5; the transcript names no other model)
Leaks: none (leaks.json lists no file outside the session folder; 43 calls checked)

# r1-s09 -- T65 A, Grace (returning user), build 79ed770292

## Result

The last screenshot (18.png) shows the top bar "14 of 24 nodes, 22 of 63 edges", the inspector
reading "4 nodes selected" (role staff (4), trained Yes (4), hours 40 to 52), and four rings on the
canvas. Data > Filters holds two cards: "trained, hours" on Hide with the chip "14 of 24" ("trained
is Yes and hours is between 10 and 52"), and "role" Is any of staff on Select with the chip "4 of
14".

`data.json` agrees: filter-1 is `keep`, on, trained true and hours 10 to 52, matched 14 of 24;
filter-2 is `select`, on, within the picture, role in [staff], matched 4 of 14; counts are 14
visible nodes of 24 and 4 selected. Both halves of the success definition hold with the answer
key's exact numbers (14 of 24 in the picture, 4 selected, none hidden by the marking card). The
participant said done only on this screen and reported 14 and 4: no false done. No files were
saved (there is no downloads folder), and the task asked for none.

## Route against the success path

The path (14 steps): Data, Add filter, trained, "trained: how to match", Yes, Add a condition,
hours, the "from" box, 10, Enter, Add filter, role, staff, Select. The participant took:

1. The Filters button in the bottom toolbar (02.png): it opens Data > Filters and the attribute
   list at once, so it stands for both Data and Add filter.
2. trained (03.png), the match box (04.png), Yes: 15 of 24 (05.png).
3. Add a condition (06.png), hours (07.png: "Between 2 to 52").
4. The "from" box, select all, 10, Enter: 14 of 24 (08.png).
5. Checks off the path: opened the hours match box looking for "at least" (09.png), opened the
   table (10.png), switched it to All (11.png), sorted by hours (12.png), scrolled (13.png). These
   confirmed nobody sits at exactly 10 hours; nothing was changed or taken back.
6. Add filter (14.png), role (15.png), ticked staff: the new card started on Hide and the picture
   fell to 4 of 24 (16.png). The answer key's path passes through this same state.
7. Select on that card: back to 14 of 24 with 4 selected (17.png).

Nothing was undone or abandoned, so no wrong turn; the five checks are extra steps, prompted by
problems 2 to 4 below.

## Follow-up

Asked "Would it have made any difference if you had done those the other way round? How can you
tell?", Grace said the picture would probably be the same but the marked count might not be: she
read the stacked cards as steps applied top to bottom, guessed that marking first would mark all
five staff (Zara Ahmed too) and was unsure whether Zara would stay selected once hidden, and said
nothing on screen lets her tell without rebuilding it. The answer key's success is "the order makes
no difference" (a Select card only marks what is in the picture, whichever card came first). Her
answer leans toward "it may differ", which is wrong, and she could not check it. That is problem 5.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | -------- | -------- |
| 1 | 2 | behavior | A new filter card starts on Hide, so ticking "staff" on a card meant to mark people took everyone else out of the picture (14 of 24 fell to 4 of 24); the task said not to remove anyone, and she had to find the small Select / Hide switch. | Step 16, 16.png (top bar "4 of 24 nodes", role card on Hide) |
| 2 | 2 | behavior | A number condition offers only Between (and Highest), with the upper bound filled in as today's highest value (52). "At least 10" has to be built as "10 to 52", which silently leaves out anyone who later logs more than 52 hours; she asked exactly that. | Step 9, 09.png; data.json filter-1 range max 52 |
| 3 | 2 | behavior | The same card's chip changes basis between Hide and Select: on Hide the role card read "5 of 24" while the picture showed 4 of 24; on Select it read "4 of 14". She had to reason out which number was right. | 16.png (chip "5 of 24", top bar "4 of 24") against 17.png / 18.png (chip "4 of 14") |
| 4 | 2 | behavior | The table on All lists hidden rows exactly like shown ones (Tobias Becker 6 No, Leo Novak 3 No, Omar Haddad 9 No look the same as the 14 in the picture), so she could not see who was out without working it out from the values. | Step 11, 11.png |
| 5 | 2 | behavior | Nothing on screen shows that card order does not matter for a Select card, and the cards stack like a sequence with no way to reorder them, so she concluded the order could change the marked count -- the opposite of how the product behaves. | Follow-up answer; 18.png |
| 6 | 1 | wording | "Between 10 and 52" does not say whether 10 itself is included; she had to search the table for someone at exactly 10 to settle it, and found nobody. | Steps 8-13, 08.png, 13.png |
| 7 | 1 | accessibility | The Select / Hide switch is small and its unchosen half is pale gray text with no border, so the control that stops a card hiding nodes is easy to miss. | 16.png (pale "Select" beside the outlined "Hide" on both cards) |
| 8 | 0 | wording | "Select" is the word for marking; she expected "highlight" or "mark", but the rings and "4 nodes selected" made it clear. | Wrap-up; 17.png |

No build defect: every problem is friction or wording on a working path, and the end state matches
the answer key exactly, so no scripted repro was made.

## Participant's own rating (not used for the grade)

Finished: yes. Ease 5 of 7.
