# Grades: a note on a whole community and on a whole path

Task given to participants: "The Les Miserables network is open with the program's circles of
characters shown (example data, not your own). Leave one reminder on the whole circle around the
bishop Myriel, and one on the chain the program already traced between Valjean and Javert as a
whole, not on any one character. Then locate both reminders again."

What counts as success: the participant selects Community 3 (the Louvain group whose members are
led by Myriel) and adds a note whose chip names the community; selects the "Valjean to Javert" row
under Shortest paths and adds a note on it; then finds both again in the Notes place or from each
row's note count. Noting a single character first and then correcting, or finding the notes only by
searching, is success with difficulty. Failure is a note left on single characters that the
participant believes is on the circle or the chain.

Expected path: Graph place with Louvain expanded -> Community 3 selected -> Notes place with the
composer "Note on: Community 3" -> the Valjean to Javert path selected and noted -> Notes place
listing both. Reference renders: shots/tasks/r8-t23/01.png to 05.png.

## Results

| Participant | Their own call | Grade | How they found Myriel's community | How they found the notes again | Ease (1-7) |
|---|---|---|---|---|---|
| Expert Emma (computational social scientist) | success with difficulty | **success with difficulty** | An older note named Community 3; confirmed by "Hub: Myriel" | Path note by the "1 note" on its row; community note only by searching the Notes list for a word in it | 5 |
| Marketing network analyst | success with difficulty | **success with difficulty** | Opened Community 5, 4, then 3, reading the Hub line each time | Notes list from the rail, both at the top with their chips | 4 |
| Gene Ontology Cytoscape user | success with difficulty | **success** | Guessed a ten-node community, hit Community 3 first, confirmed by "Hub: Myriel" | Notes list from the rail; "1 note" on the path row; "3 notes" in the community's inspector | 5 |
| Gephi holdout | success with difficulty | **success** | Reasoned "the household is small", opened Community 3 (and 4 to compare); confirmed by "Hub: Myriel" | "1 note" on the path row and "3 notes" on the Community 3 row (final render 12.png); also the Notes list | 5 |
| Class-project student | success with difficulty | **success with difficulty** | Read it off someone else's note in the Notes list | Notes list, and the "1 note" / "3 notes" counts | 5 |

Totals: 2 success, 3 success with difficulty, 0 failure, 0 gave up. Five of five attached both notes
to the whole object, never to a character: every final Notes list shows one note chipped
"Community 3" and one chipped "Valjean to Javert", and nobody believed a character note covered
the group. Mean Single Ease Question 4.8 of 7 (5, 4, 5, 5, 5).

The grade is about where the notes ended up and how the participant got there. All five called
themselves "success with difficulty"; two are graded higher because their difficulties were either
caused by the click tool or came after they had already found both notes.

## Why each grade

- **Expert Emma -- success with difficulty.** Both notes were attached correctly (10.png: "Myriel's
  circle..." chipped Community 3, the path note chipped Valjean to Javert). She found the path note
  again from its row count. She could not read the community note's count on the folded Louvain row
  ("1 note" plus a circled 3, "I am guessing"), and she found that note only by searching the Notes
  list for "Leiden" (12.png). Finding a note only by searching is listed as success with difficulty.
  Her detour through the Louvain table tab came from a click that matched two things, which the
  criteria do not count against her.
- **Marketing network analyst -- success with difficulty.** She opened three communities one by one
  to find the one whose Hub was Myriel. That is a long search. After that she noted both objects
  without trouble and found both in the Notes list (11.png). Her try with "Find rows and notes"
  found nothing, but she was not depending on it.
- **Gene Ontology Cytoscape user -- success.** Clicking "Myriel" selected the "Myriel to Javert"
  path row. The click tool matches text in the list, so that miss comes from the tool; a real click
  on the canvas would have selected the node. He then opened Community 3 on his first guess,
  confirmed it from the Hub line, and noted it and then the path. Before his confusion about the
  tree he had already found both notes in the Notes list (08.png: both at the top, chipped
  correctly) and the path note's count on its row. His conclusion is correct.
- **Gephi holdout -- success.** The same miss when clicking "Myriel". Then a reasoned pick:
  Community 3 first, with Community 4 opened only to compare. She noted both objects, and her final
  render (12.png) shows "Comm... 10 nodes 3 notes" and "Valjean ... 2 nodes 1 note" in the tree. Each
  step of the success path is there, with no wrong turn of her own.
- **Class-project student -- success with difficulty.** She found out which community was
  Myriel's only by reading an older note in the Notes list. "Add note" in the More menu did nothing
  for her (07-08.png). She reached the composer through the inspector's "Add note" link. Both notes
  were attached correctly (12.png), and she found them again from the row counts and the Notes list
  (16-17.png).

## Findings, with evidence counts

Severity on Nielsen's 0-4 scale. Items marked "skeleton" are at least partly caused by the
prototype and are reported as a requirement for the build, not as a redesign.

1. **Nothing in the tree tells you which community a character is in -- 5 of 5, severity 3.**
   Community names are numbers and are cut off ("Comm...", "Community..."), and no row says
   "Myriel". Participants opened communities one by one (marketing analyst, three tries), guessed by
   size (Gephi holdout, Cytoscape user), or borrowed someone else's note (student, Emma). The Hub
   line in the community inspector worked for all five once they got there. Two ways to fix it:
   name a community row after its hub ("Community 3 -- Myriel"), and have a node's inspector say
   which group of each run the node belongs to. With 30 communities, the current path is "clicking
   all afternoon" (marketing analyst).
2. **The Notes row in the tree says "4 items" while the Notes list says 8, then 9 -- 5 of 5,
   severity 3.** Every participant noticed the mismatch and three said disagreeing counts make them
   distrust the screen ("if the numbers disagree on screen I stop trusting the rest"). The
   prototype's count is static (skeleton), but the build must make every note count derive from one
   source.
3. **Returning to the Graph place after saving a note resets the tree: Louvain folds up, the
   "Louvain 2" row vanishes, PageRank becomes selected -- 5 of 5 saw some of it, severity 3
   (skeleton).** The Gephi holdout and the Cytoscape user read the missing run as data loss, and
   the marketing analyst got the toast "Selection cleared (PageRank)" for a selection she never
   made. Cause: the Graph rail button opens the tree's resting state rather than the state the
   participant left, and the second Louvain run exists only in the expanded state. The requirement
   for the build: going from the Notes place back to the Graph place restores the tree's expansion,
   selection and scroll exactly.
4. **A folded run row shows "1 note" and a circled "3" side by side, with no explanation -- 4 of 5
   (Emma, marketing analyst, Cytoscape user, student), severity 2.** Nobody could tell whether the
   3 counts notes inside the run. Hovering over it showed nothing (student). Spell the count out
   ("3 notes in groups") or give it a tooltip.
5. **A community row's note count disappears in some states -- 2 of 5 (Cytoscape user, student),
   severity 2 (partly skeleton).** "Comm... 2 notes" at the start, then no count after a note was
   added, while the Gephi holdout's render shows "3 notes". This is the same object showing
   different counts in different states.
6. **"Find rows and notes" in the Graph place found no note by its text -- 2 of 5 (Emma, marketing
   analyst), severity 2 (partly skeleton).** Their placeholder text says it finds notes, and it gave
   no result and no "no matches" message. It was the first thing the marketing analyst tried.
7. **"Open in Notes" from a community shows every note, not that community's -- 1 of 5 (student),
   severity 2.** Her own note was easy to find only because it was the newest. One voice, but it
   follows from the label: "Open in Notes" from Community 3 should open the list filtered to
   Community 3.
8. **"Add note" in the More menu did nothing -- 1 of 5 (student), severity 2 (likely skeleton).**
   Check that the menu item is wired to the same action as the inspector link.
9. **The path note's chip reads "Valjean to Javert" and does not say "Path" -- 2 of 5 (Gephi
   holdout, Cytoscape user), severity 1.** In the list it sits next to an older note with separate
   "Valjean" and "Javert" chips, and the only difference is the small colored square. The
   inspector calls it "Path Valjean to Javert". Use the same label in both places.
10. **A filtered Notes list keeps the heading "9 notes in this graph" -- 1 of 5 (Emma), severity
    1.** It should read "1 of 9".
11. **Selecting a note's chip opens the object's inspector but does not show it on the graph -- 2
    of 5 (marketing analyst, student), severity 1.** The path's two nodes are not highlighted.
12. **"Add note" sits below the fold in the community inspector -- 2 of 5 (Emma, marketing
    analyst), severity 1.** Both found it, one through the N key.
13. **The node table's "group" column numbers (Valjean 2, Javert 4) match no visible partition
    -- 1 of 5 (Emma), severity 1.** One voice, but it is the expert's question "which partition is
    this?", and an older note's claim that the two share a community contradicts it.

## What worked (5 of 5 unless noted)

- The composer's "Note on: Community 3" / "Note on: Valjean to Javert" line, and the inspector's
  "Note on: Path Valjean to Javert": every participant used it to confirm the note was on the whole
  object and not on a character. This is the reason nobody failed.
- The Hub line ("Myriel, 9 links inside") and the member list in the community inspector: the only
  way any participant confirmed it was Myriel's circle, and all five used it.
- The path inspector's "2 nodes, 1 edge, 17 shared chapters": three participants noticed that the
  traced chain is a single edge and said the program "says so honestly".
- Notes attached to a partition class or to a path: four of five said their current tool cannot do
  this (Gephi, Cytoscape, a social-listening suite, a Word document). Emma singled out the Louvain
  table's Notes column.

## Caveats on the evidence

All five sessions were simulated from rendered screens with a text-matching click tool. Every
participant's first click on "Myriel" matched a list row instead of the node on the canvas, so this
study cannot say what a real click on the node would have shown. The tree reset and the static
"4 items" count come from how the prototype routes between states. They inflated the reported
difficulty and are listed as requirements for the build, not as evidence against the design.
Finding 1 does not depend on either artifact, and it is the one to act on.
