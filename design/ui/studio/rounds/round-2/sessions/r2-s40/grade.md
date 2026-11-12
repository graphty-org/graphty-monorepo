# Grade: session r2-s40 -- Elena (first-time graph user), task T11: untangle the drawing

Build: commit 4a7a1a7fb (graphty 0.8.53), 1440 x 900, no screen reader. Graded from 20.png, the
screenshots before it and `transcript.md`; there is no `downloads/` folder (the task saves nothing).
The participant's own rating (2 of 7) is not used.

## Grade: SD (success with difficulty)

| Item          | Result                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Grade         | SD                                                                                                                     |
| False "done"  | none                                                                                                                   |
| Wrong turns   | 3                                                                                                                      |
| Steps         | 19 tool steps (02 to 20), 23 actions; the success itself came at step 07, after 8 actions, against a success path of 4 |
| Build-decided | no (the build defects below made the session harder, but did not decide the grade)                                     |
| Void          | no                                                                                                                     |

## What the task asks, and what was delivered

Success needs a different layout method applied (not a re-run of the same one) and node positions
visibly changed between screenshots. Whether it helped is an opinion, not graded.

- Step 07 (07.png): Spectral applied from the Layout list. The positions changed completely
  against 06.png: almost every node packed into one blob at the top right, a three-node chain to the
  left and two nodes pulled far down. A different method, applied, positions changed: the success
  definition holds here.
- Step 18 (18.png, 19.png): Force re-applied with spring length 80. Same method with a changed
  option, so it does not count toward success on its own, but the positions changed visibly too.
- The last screenshot (20.png) shows the original Force drawing again, now colored by the six
  Louvain groups: the participant undid both layout changes on purpose because neither helped. Her
  closing answer ("did a different arrangement help: no") matches the screen. "It did not help" is
  the expected answer on this build and is not a failure.

**Why SD and not S.** The method changed only after a detour: she first opened Circle's form, read
it, backed out (steps 5 and 6) and then picked Spectral. After the success she spent 13 more steps
on detours (finding groups in Analyze to unlock "Rings by group", which stayed locked; then Force
options) and left with an ease of 2.

## Claims checked against the screen

- Step 7: "the opposite of untangled ... everyone is squashed into one dot-pile" -- matches 07.png.
- Step 13-14: "Rings by group" still grey after Louvain -- matches 13.png and 14.png.
- Step 19: "it stays a scrambled cloud" -- 19.png is identical to 18.png; matches.
- End: "none of them made the clusters easier to tell apart ... the default arrangement plus colors
  was the best picture I got" -- an opinion consistent with 20.png. No claim of done is contradicted
  by the screen, so there is no false "done".

## Steps and wrong turns

The round 2 success path (4): open the sample; Layout; pick another method; Apply.

The participant's actions up to the success (8): No thanks and Les Miserables (step 2, the sample
opened in one action after the usage card); hover the Layout icon (3); Layout (4); Circle (5); Back
and Spectral (6); Apply (7).

Wrong turns (a step off the success path later undone or abandoned):

1. Steps 5-6: opened Circle's form, read "in the order the nodes were loaded", backed out. Abandoned.
2. Steps 9-14: Analyze, filter "group", Louvain, Run, then back to Layout to use "Rings by group",
   which stayed grey; clicking it did nothing. Abandoned (the group colors stayed, but the purpose,
   unlocking a grouping layout, failed).
3. Steps 15-20: Force with spring length 80, Apply, wait, Undo. Undone.

The Undo at step 8 reverses the success step, not a wrong turn: she judged the Spectral result and
went back, which the task invites.

## Problems

All are from one participant, so the behavior and wording findings are not yet confirmed under the
two-participant rule. Three build defects were reproduced as a scripted path on the same build:
`rounds/round-2/repro/r2-s40/repro.sh` (PNGs in `rounds/round-2/repro/r2-s40/run/`, log in
`run.log`). It does the same as the session: Les Miserables, Layout, Spectral, Apply, Undo, Layout,
Force, spring length 80, Tab, Apply, wait 4 s, wait 8 s.

| #   | Severity | Kind          | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Evidence                                                                                                               |
| --- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | 3        | build-defect  | Force re-applied with spring length 80 (gravity unchanged, -1.2) leaves a square scrambled cloud in which linked nodes sit far apart, the pink fan and every group are broken up, and nothing moves after 4 or 12 seconds. The positions are identical, node for node, in the session and in the repro, so this is a fixed starting placement that never settles, not a slow simulation. No message. A newcomer who tries the one "Recommended" layout's spacing option gets a worse drawing than the default and no way to tell why. | Session step 18-19, 18.png and 19.png; repro 11.png, 12.png, 13.png (13.png is the same arrangement as session 19.png) |
| 2   | 3        | behavior      | "Rings by group", "Two columns" and "Columns by group" stay grey with "Needs a node attribute to group by" after Louvain has computed six communities that are listed in the left panel and colored on the canvas. Nothing says what a "node attribute" is, whether a computed group counts, or how to get one. These are the three layout names that read as "separate the clusters" -- exactly the task -- and the sample card itself says "Good for a first look at communities". Clicking the grey row only highlights it.        | Step 4, 04.png; step 13, 13.png; step 14, 14.png                                                                       |
| 3   | 2        | build-defect  | After Undo of a layout, the camera keeps the framing of the undone layout instead of fitting the restored drawing: after Spectral the restored drawing is pushed off the top of the canvas with the lower half empty; after the spring-length cloud it is small in the middle.                                                                                                                                                                                                                                                        | Step 8, 08.png; step 20, 20.png; repro 05.png then 06.png                                                              |
| 4   | 2        | build-defect  | Typing a new value into Force's "Spring length" leaves the button grey and reading "Applied" until the field loses focus; only after Tab does it turn into a blue "Apply". The form says nothing has changed while the field shows a changed value.                                                                                                                                                                                                                                                                                   | Step 16, 16.png; step 17, 17.png; repro 09.png ("80", "Applied") then 10.png                                           |
| 5   | 2        | behavior      | Spectral's description promises "densely connected groups land near each other"; on Les Miserables it packs nearly every node into one blob in a corner, with a short chain and two nodes flung far away, and nothing on screen explains the result. The participant asked "Did I do something wrong?" The drawing is the method's real output; the gap is between the promise and what a reader sees.                                                                                                                                | Step 6, 06.png; step 7, 07.png                                                                                         |
| 6   | 2        | wording       | The grey "No crossings" row reads 'the layout "planar" cannot draw this graph without crossings: G is not planar.' The participant read it as a programmer's error message ("G is not planar"?). This is graphty-element's own English shown as is.                                                                                                                                                                                                                                                                                   | Step 4, 04.png                                                                                                         |
| 7   | 1        | wording       | Force's description says "with 'dim: 2', flat", which reads as code; "Gravity" is a negative number (-1.2) with no explanation.                                                                                                                                                                                                                                                                                                                                                                                                       | Step 15, 15.png                                                                                                        |
| 8   | 1        | accessibility | In the Communities key, Group 1 (amber) and Group 5 (orange), and Group 2 (light blue) and Group 4 (darker blue), were hard for the participant to tell apart on the small dots. One participant, unmeasured.                                                                                                                                                                                                                                                                                                                         | Step 12, 12.png; 20.png                                                                                                |
| 9   | 0        | opinion       | Method names (Spectral, Louvain, Resolution) meant nothing to her; the one-line descriptions under them are what let her choose. (Opinion, held one level down.)                                                                                                                                                                                                                                                                                                                                                                      | Steps 4, 6, 10, 11                                                                                                     |

## What worked

- The Layout icon's tooltip named it on hover; she found Layout in one try.
- Each method's form shows a one-line description before anything is drawn, so she rejected Circle
  without committing it and chose Spectral from its description alone.
- Apply drew the new layout at once, and Undo restored the previous positions exactly, twice.
- The Analyze filter found "Find groups" from the word "group", and Louvain's colors and key were
  the one change she found helpful.

## Screen-reader check

Not a screen-reader session.
