Grade: SD
False done: no
Wrong turns: 3
Token: touched, clicked the Louvain folder's Fill Color field ("<<Layer>>" and its swatch strip); nothing changed and the participant moved on to expanding the folder

# Grade: r1-s41 (task T46 A, persona Alex)

Participant model: claude-opus-5-5 (the participant log records Opus in all 85 model entries, not
Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (34 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.

## Against the success definition

T46 A asks for Les Miserables opened from the samples, a community run's circles each in its own
color, the circle holding Javert bright red, every other circle keeping its color, and the size of
Javert's circle said from the screen.

- The run: Louvain, default settings (resolution 1), six groups of 20, 17, 11, 11, 10 and 8, as
  the key reads on this build.
- Javert's circle: the inspector showed "Memberships: Louvain Group 3" after the find-box pick
  (step 9, `11.png`).
- The stack that counts: the group's own layer in the run's folder with its color changed.
  `styles.json` (end) holds the Louvain folder with Group 3's layer (`group-3_1`) setting
  `node.color` `#FF0000`; Group 1 `#e69f00`, Group 2 `#56b4e9`, Group 4 `#0072b2`, Group 5
  `#d55e00` and Group 6 `#cc79a7` are the run's own colors, unchanged. The last
  `styles-steps.jsonl` line (`17.png`) draws exactly those five plus `#ff0000`; `#009e73` (Group 3's
  starting green) is gone.
- Asked color: drawn `#FF0000`, `colorWord` "red" (hue 0). Holds.
- The answer: "Javert's circle has 11 characters." On screen first: the Group 3 row read 11 when
  the folder opened (step 12, `15.png`) and the inspector read "Louvain: Group 3, 11 nodes" (step
  13, `16.png`). Correct (11).
- Final screen (`17.png`): Group 3 red in the drawing, the layer row and the key; the other five
  groups in their colors; Group 3 inspector with Color FF0000 and "11 of 77 nodes". The
  participant's closing claim matches the screen and the style tree.

Graded SD, not S: the participant reached the group layer only after three moves that led nowhere
(below), and took 16 steps against the key's 12.

## Steps

16 steps against the key's 12. A first click on "Samples" was refused by the tool as ambiguous
(two controls share the name) and did nothing, so it is no step; a hover over the flask icon to
read its tooltip is not counted. Then: Samples (1), the Les Miserables card (2), Analyze (3),
`louvain` typed (4), the Louvain option (5), Run (6), the find box (7), `Javert` typed and the
offered node picked (8), Group 3's swatch in the key over the drawing (9, wrong turn), the
Louvain folder's name (10, wrong turn), the folder's Fill Color swatch strip (11, wrong turn), the
folder's expand caret (12), Group 3 (13), the color box (14), Control+A (15), `FF0000` with Enter
(16).

Against the success path: steps 9 to 11 are the three wrong turns, and Control+A was not needed
(clicking the box already selects its text). Everything else is the success path step for step.
The shorter route through the inspector's Memberships button ("Louvain Group 3") was on screen at
step 8 and was not tried.

## Problems

1. Severity 2, behavior. The "Color: Louvain" key over the drawing looks like a list of groups a
   reader can act on, but clicking Group 3's swatch does nothing, and it shows no group sizes; the
   participant's first guess, and the counts had to be found elsewhere. Known on this build
   (`answers.md`, T46, "Traps") (step 9, `12.png`).
2. Severity 2, behavior. The Louvain folder's Fill Color shows a strip of six group swatches that
   look like a palette to edit, but clicking it does nothing (step 11, `14.png`). Known on this
   build (`answers.md`, T46, "Stacks that count").
3. Severity 2, behavior. The group layers that hold the answer sit behind a small caret left of the
   folder icon; clicking the folder's name selects it and does not expand it, so the participant
   found the groups on the third guess (steps 10-12, `13.png` to `15.png`). Known on this build.
4. Severity 2, behavior. The inspector's Memberships "Louvain Group 3" opens the group's own layer
   (the shortest route), but it looks like plain text with a default cursor and no tooltip; the
   participant read it as a label and went looking elsewhere (step 8, `11.png`). Known on this
   build (`answers.md`, T46, "Shorter routes").
5. Severity 2, wording. The folder's Which nodes reads "Louvain: <<Layer>>" and its Fill Color
   "<<Layer>>"; the participant called both developer-speak and could not tell what the token
   stood for (step 10, `13.png`, `14.png`).
6. Severity 1, opinion. The new red sits next to Group 5's `D55E00` in the drawing and in the key,
   and the participant found the two hard to tell apart (step 16, `17.png`). Known on this build
   for B (Group 5's crimson); here the neighbor is A's dark orange.
7. Severity 1, accessibility. Two controls on the start page share the accessible name "Samples"
   (the top bar's link and the start box's button); known on this build (step 2, `02.png`).
8. Severity 1, opinion. Groups are named only "Group 1" to "Group 6", and the Louvain card shows no
   seed; the participant could not tell whether a rerun would keep the same numbering (steps 5-6,
   `08.png`, `09.png`).

No build defect: everything the participant met matches what the key says this build does, so no
repro was scripted.
