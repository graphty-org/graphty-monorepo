Grade: S
False done: 0
Wrong turns: 0
Steps: 11 commands, 13 path steps (path steps: 14)
Model: opus (claude-opus-5-5 in both transcript files; the transcript names no other model)
Leaks: none (leaks.json lists no file outside the session folder; 33 calls checked over 2 transcripts)

# r1-s11 -- T65 A, Dana (returning user), build 79ed770292

## Result

The last screenshot (13.png) shows the top bar "14 of 24 nodes, 22 of 63 edges" and two filter
cards, both on. The first, "trained, hours", reads 14 of 24 on Hide, with the sentence "trained is
Yes and hours is between 10 and 52". The second, "role", reads 4 of 14 on Select with staff ticked.
Four nodes have yellow rings and the inspector reads "4 nodes selected": role staff (4), trained
Yes (4), hours 40 to 52. The full graph still holds 24 nodes and 63 edges (data.json `totalNodes`
24, `totalEdges` 63), so nobody was deleted.

`data.json` agrees: `filter-1` is `keep`, on, `all` of trained exactly "true" and hours from 10 to
52, count 14 of 24; `filter-2` is `select`, on, within the picture, role in [staff], count 4 of 14;
visible nodes 14, selected nodes 4. The 4 selected are all in the picture, so the Select card hid
nobody. This is the answer key's success: 14 of 24 visible, 4 selected, the role card 4 of 14.

The participant reported 14 in the picture and 4 marked, which matches the screen.

## Route against the success path

The key's path is 14 steps: Data, Add filter, trained, "trained: how to match", Yes, Add a
condition, hours, the "from" box, 10 typed, Enter, Add filter, role, staff, Select.

1. The toolbar's Filters (funnel) button opened Data with the Filters column list already open
   (02.png). That one click stands in for the path's Data and Add filter.
2. trained (03.png).
3. "trained: how to match" (04.png).
4. Yes: 15 of 24 (05.png).
5. Add a condition (06.png).
6. hours, 2 to 52 (07.png).
7. The "from" box, 10 typed, Enter: 14 of 24 (08.png). These are 3 path steps in one command.
8. Add filter (09.png).
9. role (10.png).
10. staff: the new card starts on Hide, so the picture dropped to 4 of 24 (11.png). The key
    expects this and names the next step as the fix.
11. Select: 14 of 24, 4 selected, role card 4 of 14 (12.png).

Every step is on the path, in the path's order, so there are no wrong turns. The drop to 4 of 24
at step 10 is the intermediate state the key describes, and the participant recovered from it on
the next step, as the path intends. The participant said done at step 11, when the screen showed
the success state, so there is no false done.

## Follow-up

The transcript holds the answer to "Would it have made any difference if you had done those the
other way round? How can you tell?" The participant said it would make no difference to the
result on screen, and pointed at evidence: the role card counts "4 of 14", not "of 24"; the
selection is all trained Yes with 40 to 52 hours; and the fifth staff member is neither marked nor
shown. That matches the key ("the order makes no difference"). The participant also said that
nothing on screen shows whether the cards apply in order or all at once, so a hidden marked person
could not be ruled out without trying the other order (problem 5).

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | -------- | -------- |
| 1 | 2 | behavior | A new filter card starts on Hide. A card meant to mark people hides everyone else the moment its first value is ticked: here the picture dropped from 14 to 4 before the participant found the Select / Hide switch. | Step 10, 11.png ("4 of 24 nodes, 2 of 63 edges", role card on Hide, "5 of 24") |
| 2 | 2 | build-defect | Fields shows "Coordinates: phone" right after the file opens, with nobody setting it: the phone column is taken for a place column. data.json gives phone no role, so the screen and the records disagree. The participant took it as a sign that other things were guessed too. Known; a fix is already listed. | 02.png, 13.png (Fields > volunteers.graphml > Coordinates "phone"). Repro: `design/ui/studio/tier4/rounds/round-1/repro/r1-s11-script/repro.sh` (its 02.png and read-out: combobox "Node coordinates column" value "phone"; data.json phone `roles: []`) |
| 3 | 1 | wording | The range condition's sentence reads "hours is between 10 and 52", not "at least 10". The participant could not tell whether exactly 10 counts. | Step 7, 08.png; 13.png (folded card sentence) |
| 4 | 1 | wording | The role card's value counts (volunteer 16, staff 5, board 3) count the whole graph, while the card's own chip counts what is in the picture ("4 of 14"). Two bases on one card; the participant had to read it twice. | 12.png, 13.png (role card) |
| 5 | 1 | behavior | Nothing on screen says how two cards combine (in order, or all at once). The order does not change the result, but the participant could not see that without trying the other order. | Follow-up answer, 13.png |
| 6 | 1 | accessibility | The Select / Hide switch, the per-value counts and "Add a condition" are small gray text; the unselected half of the switch is hard to read. Contributed to problem 1. | 11.png, 13.png (role card) |

Problem 2 is reproduced from the setup alone, before any participant step, with the scripted
`real.mjs` path above, which ran through the machine's browser gate on the frozen build.

## Participant's own rating (not used for the grade)

Finished: yes. In the picture 14, marked 4. Ease 6 of 7.
