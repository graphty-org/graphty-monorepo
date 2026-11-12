Grade: S
False done: no
Wrong turns: 0
Token: not touched, the color was set on the Group 3 layer's own Fill box, which shows no token; the folder's Color field and table were never opened

# Grade: r1-s43 (task T46 A, persona Nadia)

Participant model: claude-opus-5-5 (every model entry in the participant log is Opus, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (31 tool calls) and found no file opened
outside the participant's own folder. No downloads or saved files.
Merged: no (Les Miserables opened from Samples on the empty start page).

## Against the success definition

T46 A: open Les Miserables, have the program work out the circles of characters who appear
together, each in its own color, make Javert's circle bright red, leave the others alone, and say
how many characters are in it.

- Community run: Louvain, default settings (resolution 1). `styles.json` holds a "Louvain" folder
  of six group layers. `key.json` draws 20, 17, 11, 11, 10 and 8 nodes, which matches the
  reference sizes. Javert is in Group 3 (inspector Memberships "Louvain Group 3", `11.png`).
- Red: Group 3's layer (`group-3_1`, rule `results.louvain.group` = "3") has Fill `FF0000`, typed as
  a hex value. The drawn value is `#ff0000` and `colorWord` gives "red", so the asked "red" holds.
  "Bright" is noted but not graded. The key reads Group 3 red, and 11 nodes are drawn `#ff0000`.
- Others keep their own colors: Groups 1, 2, 4, 5 and 6 are still `#e69f00`, `#56b4e9`,
  `#0072b2`, `#d55e00` and `#cc79a7` in `key.json`, the same as in `11.png`. No other layer was
  changed.
- Count: 11. It was on screen before the participant said it: the Group 3 row reads 11
  (`13.png`), and the layer reads "Louvain: Group 3, 11 nodes" (`14.png`). The participant read it
  from the Group 3 row, which is Javert's group, not from Group 4 (also 11).
- Final screen (`15.png`): six group colors with Group 3 in bright red, Javert ringed inside it,
  and the inspector on Group 3 showing `FF0000`.

Why S: the participant took the key's own success path: the group's own layer in the run's
folder, with its color changed. The only extra moves were a hover, one dead click and an extra
key, and none of them led away from the success state.

## Steps

15 steps against the key's 12, on the key's route:

1. Samples (the tool refused an ambiguous `Samples#2` click, which does not count as a step)
2. The Les Miserables card
3. Hover over the flask icon to read its tooltip "Analyze" (a check)
4. Analyze
5. Type `communit`
6. Louvain
7. Run
8. Click the find box
9. Type `Javert` and pick his row (counted as one step: typing and picking the offered match)
10. Click the Group 3 swatch in the "Color: Louvain" key (does nothing)
11. The Louvain folder's expand caret
12. Group 3
13. The color box
14. Control+A
15. Type `FF0000` and Enter

The 3 extra steps are the hover (3), the dead click on the key (10) and Control+A (14). Clicking
the color box already selects its value.

No wrong turns. The click on the key changed nothing on screen, so it did not lead away from the
success state. Other grades in this round count a dead click the same way.

False "done": no. The participant said "Done" at step 15, and the screen and the style tree agree.

## Problems

1. Severity 2, build defect. The analysis filter finds all seven community methods for
   `communit` but none for `community`: it shows "No analysis matches "community"" over a tall,
   empty popover. A reader who types the whole word gets nothing. The start page's demo labels
   its own button "Communities", which invites the word, and the participant here only got
   through because they typed a stem (step 5, `07.png`).
   Repro on the frozen build: `rounds/round-1/repro/r1-s43/`. The steps are `--start empty`,
   `--click "role=button:Samples"`, `--click "Open the Les Miserables sample"`,
   `--click "Analyze" --type "community"` (`04.png`: no match), then `--key Backspace`
   (`05.png`: `communit` lists Louvain, Leiden, Label propagation, Girvan-Newman, Markov, Spectral
   and Hierarchical under "Find groups").
2. Severity 2, behavior. The "Color: Louvain" key over the drawing looks like the list of groups
   and the place to change a group's color, but clicking a swatch does nothing, and it shows no
   group sizes (step 10, `12.png`).
3. Severity 2, behavior. The group layers start hidden inside the collapsed "Louvain" folder, and
   the only way in is a small caret that the participant found by guessing (step 11, `13.png`).
   The inspector's Memberships entry "Louvain Group 3" opens the group's layer directly, but it is
   drawn as plain gray text, so the participant read it as a fact and did not try clicking it
   (`11.png`).
4. Severity 2, wording. Seven community methods with technical names, and nothing says whether
   they would put Javert in different circles or which one to pick. The participant took
   Louvain only because it was highlighted first, and said they could not defend that choice
   (step 6, `07.png`).
5. Severity 1, behavior. After the change, Group 5's `#d55e00` (burnt orange) sits next to the
   new red in the middle of the drawing and is hard to tell apart there. In the key the two read
   clearly as different (`15.png`).
6. Severity 1, wording. The bottom toolbar has icons only. The participant had to hover to learn
   that the flask means Analyze (step 3, `05.png`).
7. Severity 1, wording. Louvain's Resolution and Weight are not explained (step 7, `08.png`).
8. Severity 1, wording. Nothing says whether recoloring a group changes the data or only the
   drawing (step 15).
9. Severity 1, behavior. No names are drawn on the dots, so the screenshot alone cannot show who
   the 11 characters are (`15.png`).
