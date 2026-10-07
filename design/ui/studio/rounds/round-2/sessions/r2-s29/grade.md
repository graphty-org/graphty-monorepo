# Grade: session r2-s29 -- Tom (recipe recipient), bigger dots for the ones that matter, Les Miserables

Graded from the last screenshot (12.png), the transcript and the screenshots before it. No files
were downloaded (the task asks for none). The participant's own rating (4 of 7) was not used.

## Grade: S (success)

- **Success definition met.** A ranking was run (PageRank, shown as "Influence"). In 12.png the
  dots visibly differ in size (Valjean largest in the middle, a second large dot at the bottom),
  the legend reads "Size: Influence 0.003299 to 0.07543" above "Color: Influence 0.003299 to
  0.07543", and at step 11 the Size line read "1 to 3", bound to Influence.
- **Meaning stated from the screen.** "Bigger dot = higher influence; darker brown = higher
  influence ... the color isn't telling me anything the size doesn't." That matches the answer
  key: bigger means more Influence, and the colors are the same Influence ramp. He also checked
  the top dot by clicking it: "Valjean ... Influence 0.07543, #1 of 77", which matches the
  reference value (Valjean 0.07543).
- **Why S, not SD:** no wrong turns, no help, and no detour. He hesitated twice (picking a method,
  and before clicking the chain symbol), but each time he chose the right control.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no.

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs, after the start) | 11 (10 to the end state, plus 1 click on Valjean to check) | about 9 steps, 11 commands |
| Wrong turns | 0 | -- |

He opened Analyze with the flask button instead of Shift+A and picked PageRank from the list
instead of typing its name. Both are the same path by pointer, not wrong turns. Clicking the
Valjean dot (step 12) is an extra check, not a wrong turn.

## False "done"

None. His claim at the end ("the dots are now sized by ... Influence") is true of the screen in
12.png. At step 6 he saw that running the method changed only the colors and said "nothing got
bigger". He did not take the automatic color change as the finished task.

## Silent commits and legend agreement

- Run (step 6): the canvas changed from blue to orange and the legend showed "Color: Influence".
  Not silent.
- Size bound to Influence (step 11): the dots changed size and the legend gained "Size: Influence".
  Not silent.
- Adding the Size line (step 9) changed nothing on the canvas (it holds the constant "1"). That
  only adds a line and does not bind it, so bar 4 does not count it. It still confused him (problem 4).
- The legend's ranges and the Size line's "1 to 3" agree with the drawing.

## Problems

Severity 0-4 (Nielsen); opinion-only findings are held one level down. All are from this one
participant, so behavior and opinion findings stay unconfirmed until a second participant hits
them. No build defect was found, so no repro script was written.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | behavior | A new Size line shows only the constant "1" and nothing changes on the canvas. The only way to bind it to a result is an unlabeled chain-link icon, and he read the chain as "links something to her file". He nearly stopped there. A participant who stops here leaves with equal-sized dots (a likely `false-done` or a quit). | Step 9 (09.png), step 10 (10.png); transcript: "I nearly didn't, because a chain makes me think it links to something." |
| 2 | 2 | behavior | Size is hidden behind the + next to "Shape". The Style tab never shows the word "Size" until that menu is opened. He found it by guessing. | Step 7 (07.png), step 8 (08.png); "There's no word 'Size' anywhere." |
| 3 | 2 | behavior | No method in the Analyze list is described in the task's terms ("who the network depends on"). He picked PageRank only because of its "Start here" tag and remained unsure whether Betweenness was the right one. | Step 4 (04.png); "I honestly don't know whether Betweenness was the right one instead." |
| 4 | 2 | wording | He picked "PageRank", but the result is called "Influence" on the canvas legend, in the left row and in the panel. Nothing where he was looking says they are the same thing. | Step 6 (06.png), step 7 (07.png); "I assumed they're the same thing; nothing said so where I was looking." |
| 5 | 1 | behavior | Running a ranking colors the dots but never sizes them, although sizing is the usual way to show importance. For a moment he thought the run had not done what he asked. | Step 6 (06.png); "For a moment I thought it hadn't done what I asked." |
| 6 | 1 | opinion | The orange-to-brown color ramp is hard to tell apart. He said only two or three dots looked darker, and that the sizes, not the colors, made the drawing readable. | Step 6 (06.png), step 11 (11.png). Held down from 2. |
| 7 | 1 | opinion | The legend's raw range (0.003299 to 0.07543) means nothing to him: "I couldn't tell the PI what a 0.07 is." The "#1 of 77" rank in the node panel was the part he could repeat. | 12.png; end-of-session remarks. Held down from 2. |
| 8 | 1 | behavior | No names are drawn on the dots, so he had to click the biggest dot to learn it was Valjean. Labels are not part of this task. | Step 11 (11.png), step 12 (12.png). |
