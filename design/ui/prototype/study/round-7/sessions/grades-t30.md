# Grades: keep a view, title it, and step through the kept views

The task: "You hit on an angle on the drawing that tells the story well. Keep it so you can come
back to it, give it a title, and then step through your kept angles one after another as you
would for your manager."

The intended path: the Views list is already open and says "No saved views. Save view (+)". Click
+ (Save view); a new row "View 4" appears with its name field open and selected; type a title and
press Enter. Then click the play triangle in the Views header (its tooltip is "Present"), which
opens a full-canvas slideshow with a caption card, "n of N", Back and Next, and arrow keys; Esc
leaves.

Grading rule: success means the save added a titled row and Present stepped through the saved
views. Success with difficulty means the participant saved but needed a second try, a long search
or a hover to reach the stepping through. Failure means they exported an image instead, ended
somewhere else, or could not get back to a saved view. Grades go by what was on screen at the end
and what the participant concluded, not by how they rated themselves.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Marketing analyst | failure | failure (caused by the skeleton) | Found Save view at once, saw the "View 4" row with its name selected, found the play triangle (guessed "Play", then confirmed "Present" with one hover), presented and stepped with Next, Back and the arrow keys. Every control on the intended path was found. But the deck was Whole cast, Valjean's circle, Valjean's neighbors -- not her view -- and after Esc her "View 4" row was gone (10.png); clicking it showed another view (11.png). Her title never stuck because the study tool cannot type a whole string, not because of the design. She concluded, correctly for what was on screen, that her view was lost. |
| Intelligence analyst | failure | failure (caused by the skeleton) | Same path, same one confirming hover on the triangle, same arrow and button stepping. Same end: his kept view was not in the deck and disappeared when he clicked it (11.png). Title not entered for the same tool reason. His conclusion ("my own kept angle never showed up in the presentation ... and it vanished") matches the screen. |
| Explorer Elena | failure | failure (caused by the skeleton) | The only one who got a title in, by typing one key at a time: the row "Barricade" sits in the list, ticked In tour, selected (04.png). Guessed three names for the triangle before the hover found "Present". Presented and stepped to the end (Next disabled on 3 of 3) and back. After Esc, Barricade was gone (12.png); saving again, clicking it and presenting still opened "Valjean's circle, 2 of 3" (14.png). Her conclusion matches the screen. |

Totals: 0 success, 0 success with difficulty, 3 failure, 0 gave up.
Ease scores: 3, 3, 2 out of 7. All three said that saving was easy and that losing the view is
what ends it ("Losing my work ends it"; "I'm not going to do that in front of my manager").

## How to read these failures

The three failures are real on screen and they meet the grading rule (none could get back to the
view they had just saved). But they are not evidence that the design's controls are hard to find.
On findability the evidence is 3 of 3 positive: every participant read "Save view (+)" in the empty
list as the way to keep an angle, typed or tried to type into the selected name field, recognized
the triangle as the slideshow, and stepped through with both the buttons and the arrow keys.

The failure comes from the skeleton, which is static between states: the authored success path
itself (shots/tasks/t30/03.png, "at rest") shows three rows and no new one, and the Present states
are fixed to three slides that never include the participant's view. The spec says the opposite
(structure-b-refined.md, section 4.1: Present steps through the views checked In tour, in the list
order). So the round cannot say whether a participant would get back to their own view in the
designed product. This task has to be rerun once the skeleton carries the new row into the at-rest
and Present states.

## Findings

Severity is Nielsen's 0 to 4. "Skeleton" means the problem is in the clickable prototype and not in
the spec; it still has to be fixed before this task can be measured.

1. **The saved view is lost and never presented** (3 of 3; severity 4; skeleton). After Save view
   and Present, the new row is missing from the deck and from the list after Esc. Every
   participant read this as data loss and said it would stop them using the feature.
2. **Present opens on "2 of 3"** (3 of 3; severity 3; skeleton). The spec has no rule for which
   view Present starts on; the skeleton starts on the second whatever row is selected. Two
   participants asked for it to start at the beginning ("my VP only reads the first slide").
   Studio decision proposed: Present starts on the first view in tour order. Reason: every slide
   tool does, and all three expected it.
3. **The slides do not look like what was saved** (3 of 3; severity 3; partly design). The
   participants saved an orange PageRank map; Present showed community colors. The spec says Present
   shows the current paint, so the color change is the skeleton's. The deeper issue is the spec's:
   a view keeps only the camera ("Keeps: Camera"), and all three took "keep this angle" to mean
   keep this look, including the coloring. One participant asked to be told what a view keeps at
   save time, not afterwards in the inspector.
4. **A slide in the deck is not in the list** (3 of 3; severity 2; skeleton). "Valjean's neighbors"
   is presented but never appears among the saved views, which made participants doubt which slide
   was theirs.
5. **"No saved views" is contradicted by the first save** (3 of 3; severity 2; skeleton). Saving one
   view revealed three others; all three asked whose they were.
6. **The slides look almost the same** (3 of 3; severity 2; skeleton content). The seeded views
   share one camera and differ only in rings and labels; "the VP would think I showed the same
   slide three times". The task says "angle", so participants expected different cameras.
7. **No legend in Present** (1 of 3; severity 2; design). The marketing analyst noted that the key
   is gone in Present and her manager would ask what each color means. The spec does not say
   whether Present keeps the legend. Single voice; worth checking in the rerun.
8. **No Rename on a saved view** (1 of 3; severity 1; design, known). She looked for Rename in the
   header "..." menu, which offers only "Export tour video...". The spec puts Rename in the row menu,
   drawn disabled until graphty-element can rename a view.
9. **The play triangle is called "Present", not "Play"** (3 of 3 guessed "Play" first; severity 0).
   All three recognized the icon as the slideshow by sight; the name guess is forced by the study
   tool, which acts by name. Not a problem.

Study-tool limit, not a finding: the click-through tool has no whole-string typing, so two of the
three never entered a title; the one who typed key by key saw it saved.
