Grade: S
False done: 0
Wrong turns: 2
Steps: 35 keys (path steps: 14, counted for a pointer; a keyboard-only session is counted in bar 5, not bar 7)
Model: opus (claude-opus-5-5 in both transcripts; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 62 calls checked over 2 transcripts)
Follow-up: answered (28.png, no keys): "For the numbers I reported, I don't think so", with a stated doubt

# r1-s28 -- T65 A, Sam (keyboard only, returning user), build 79ed770292

## Result

The last screenshot (28.png) shows the top bar reading "14 of 24 nodes, 22 of 63 edges" with the
filter icon. Data > Filters holds two cards: "trained, hours" with chip "14 of 24", Hide chosen,
folded to "trained is Yes and hours is between 10 and 52"; and "role" with chip "4 of 14", Select
chosen, "Is any of" with only staff ticked. Four nodes carry the yellow selection ring, and the
inspector reads "4 nodes selected" with role "staff (4)", trained "Yes (4)", hours "40 to 52".
`data.json` agrees: visibleNodes 14 of 24, selectedNodes 4; filter-1 keep, on, data.trained
exact "true" and data.hours range 10 to 52, count 14 of 24; filter-2 select, on, within the
picture, data.role in [staff], count 4 of 14. Both sources and every node are still in the
network (totalNodes 24); nothing was deleted. No file was saved (no `downloads/`).

The participant reported 14 people in the picture and 4 marked. The key's success state is exactly
this (14 of 24 visible, 4 selected, none hidden by the role card): S. The route is the key's path
done by keyboard (Filters, trained, Yes, Add a condition, hours, from 10, Filters, role, staff,
Select); the one detour (the role card starting on Hide) is a step the key's own path includes.

## Follow-up

Asked "Would it have made any difference if you had done those the other way round? How can you
tell?", Sam answered from 28.png without pressing keys: no difference for the reported numbers,
because the role card reads "4 of 14" (it counts only what the first card leaves) and all four
selected are trained Yes with 40 to 52 hours. He then doubted it: the role card's value list
still says "staff 5", so he could not tell whether staff-first would select 5. The key's answer
is "no difference"; his answer matches it with a hedge, and the doubt comes from a real mismatch
on screen (problem 3).

## Route against the success path

1. F6: focus to the left panel header (02.png).
2. F6: no focus ring anywhere (03.png). Focus is on the inspector region, not the drawing as he
   guessed (repro below).
3. Tab: ring on "From volunteers.graphml" in the right panel (04.png); the bottom toolbar was
   skipped. Wrong turn 1, taken back in step 4.
4. Shift+Tab: back to the flask, first in the toolbar (05.png).
5-6. ArrowRight x5 to Filters (07.png).
7. Enter: Data opens with the add-filter list focused (08.png).
8-11. "trained", Enter, ArrowDown, Enter on Yes: card on Hide, 15 of 24 (12.png).
12-14. Tab to "Add a condition", Enter, "hours", Enter (15.png): focus returns to "Add a
   condition", not the new row.
15-16. Shift+Tab x2 to the "from" box, "10", Tab: 14 of 24 (17.png). First half done.
17-19. F6, Shift+Tab (toolbar remembers Filters), Enter: add-filter list for a new card (20.png).
20. "role", Enter: role card with value checkboxes (21.png).
21. ArrowDown: nothing moves (22.png). Wrong turn 2, abandoned.
22-23. Tab to staff, Space: the card is on Hide, 4 of 24 left in the picture (24.png).
24-26. Shift+Tab x4 to Select | Hide, ArrowLeft to Select: 14 of 24, 4 selected, chip 4 of 14
   (27.png). Success state reached here.

He said done only after 27.png showed what he reported: no false done.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | -------- | -------- |
| 1 | 2 | build-defect | In a keyboard-only session the second F6 moves focus to the inspector region and no focus ring is drawn anywhere; the next Tab lands on the inspector's first button. F6 never stops at the bottom toolbar, so a keyboard user reaches Filters only by finding the toolbar with Shift+Tab from the inspector. Cost two keys and a guess. | Steps 2-4; 03.png, 04.png. Repro: `rounds/round-1/repro/r1-s28.sh` (F6, F6 `--read` reads the "Inspector" complementary region; its 03.png shows no ring) |
| 2 | 2 | behavior | A new filter card starts on Hide, so ticking "staff" at once dropped the picture to 4 of 24 (5 of 24 on the card) before he could choose Select; the Select / Hide switch sits above the value list, four Shift+Tabs back. The key records Hide as the card's default; a reader who did not look would report 4 in the picture. | Steps 23-26; 24.png, 26.png |
| 3 | 2 | wording | On a Select card filtered by a keep card above it, the chip counts within the picture ("4 of 14") but the value list counts the whole network ("staff 5"). The two numbers on one card use different bases, and in the follow-up this left him unsure whether the other order would mark 5. | Follow-up; 28.png (role card: chip "4 of 14", staff 5) |
| 4 | 1 | behavior | After "Add a condition" > hours, focus goes back to "Add a condition" instead of the new condition's first control; two Shift+Tabs to reach the "from" box. | Steps 14-15; 15.png, 16.png |
| 5 | 1 | accessibility | The card's on/off checkbox beside Select / Hide has no visible label (its accessible name is "Apply role is staff", so a screen reader hears it, but a sighted keyboard user guessed). | Step 24; 25.png; route.jsonl step 24 lists "input Apply role is staff" |
| 6 | 1 | accessibility | The flask button showed no tooltip when focus arrived by Shift+Tab, while the next buttons showed theirs on arrow moves; no toolbar tooltip shows a key, so he found no faster way to Filters. | Steps 4-6; 05.png, 06.png, 07.png |
| 7 | 1 | opinion | The value checkboxes (volunteer, staff, board) are separate Tab stops and do not take arrow keys; fine for three values, slow for many. | Steps 21-22; 22.png |
