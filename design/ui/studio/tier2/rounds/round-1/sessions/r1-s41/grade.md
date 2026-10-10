# Grade: session r1-s41 -- Jordan, a returning marketing analyst, leaves two reminders on the running club graph and keeps them (friends.csv)

**Grade: S** (success). The last screen (`19.png`) shows the Notes place with both notes, each on
the right target: "Moving away in May; ask who takes over the Tuesday run" with the chip "Farah",
and "Spring list, checked against the sign-up sheet" with the chip "Graph". The project was saved
("Saved Running club spring in this browser.", `15.png`), closed, and reopened from Recent
projects (`16.png`, `17.png`), and both notes were listed again in the Notes place (`18.png`).
Jordan named the Notes place and the inspector's "1 note" link as where he would read them. No
note was ever saved on a wrong target: his first note form said "About PageRank" and he cancelled
it before typing, so the answer key's SD case (a note on the wrong target, fixed later) does not
apply. The detour it cost is counted below as wrong turns.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Every command produced the screenshot the
transcript describes; the one ambiguity the tool reported (step 8, "Graph" matched the rail
button first) took the rail button, which is what the step meant. The session is not void.

## What the last screen shows (`19.png`)

- Title "Running club spring", header "Local only".
- Notes place open: Farah's note (chip "Farah", Oct 8, 11:49 PM) above the graph's note (chip
  "Graph", Oct 8, 11:48 PM), each with a delete button.
- Inspector: "Farah", "Node 1 note", PageRank "0.06394, #1 of 20"; the drawing keeps its PageRank
  color and size and the legend, as before the reopen.
- The download `downloads/Running club spring.graphty.json` (8,321 bytes) holds both notes, the
  graph's (`targets: [{graph: true}]`) and Farah's (`targets: [{node: "Farah"}]`), with the same
  text. The local copy is an extra the answer key counts as no detour.

## Measures

- **Steps:** 18 after the start (`02.png` to `19.png`). The answer key's success path is about 13
  actions; the extra steps are the detour below and the local copy.
- **Wrong turns: 2.**
  1. Step 3 (`04.png`): "Add note" from the Notes place opened a form "About PageRank", because
     the inspector was showing the PageRank run that the setup left open. Jordan wanted a note on
     the whole club; the form offers no way to change its subject, so he cancelled.
  2. Step 4 (`05.png`): he clicked empty canvas to "unpick" everything; the inspector stayed on
     PageRank, so the next note would still have been about PageRank. He recovered at step 5 by
     choosing "Everything" in the Graph place (`06.png`), after which the form said "About Graph"
     (`07.png`).
  Step 12 (opening the main menu to check whether the project was kept) and step 18 (Save local
  copy) were checks, not detours.
- **False "done": none.** His final claim -- both reminders in, both back after closing and
  reopening, a file copy saved -- matches `18.png`, `19.png` and the download. truth-on-screen: no
  wrong claim; he did not read "1 note" in the inspector as the project's total.
- **Earlier work kept:** the PageRank run, its color and size layers, and the loaded table are all
  present after the reopen (`17.png` to `19.png`); nothing gone.
- **Self-rating** (5 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 3 -- "Add note" silently takes whatever the inspector shows as the note's subject,
   including a calculation run, and the form gives no way to change it.** With nothing selected
   on the drawing but the PageRank run open in the inspector, the note became "About PageRank".
   The only sign is a small grey "About PageRank" label above the text box; clicking empty canvas
   does not reset the subject; the user has to guess that choosing "Everything" in the Graph place
   is what makes a note "About Graph". A user who typed without reading that label would have
   saved the club reminder on PageRank and believed it was on the club. Jordan caught it, so this
   session shows no wrong conclusion acted on; one session, not yet confirmed. Evidence:
   `04.png`, `05.png`, `06.png`, `07.png`, step 3 and 4 remarks, debrief.
2. **Severity 2 -- nothing on screen says whether the project is kept.** Before the save the
   header reads "friends" and "Local only", the same as after; Jordan read "Local only" as a
   privacy statement and learned the work had not been kept only when Save opened "Save friends
   as". The answer key notes that only the fading toast says it saved. Evidence: `12.png`,
   `13.png`, `14.png`, step 12 to 14 remarks, debrief.
3. **Severity 2 -- "Saved ... in this browser" reads as done, and the start screen then says the
   browser can clear it and to save a local copy.** Jordan was left unsure which of Save, Save
   as and Save local copy is "the real save". Evidence: `15.png`, `16.png`, debrief.
4. **Severity 2 -- "Save local copy..." shows nothing on screen.** The screen after it is
   identical to the one before; only the browser's download shows it worked, while Save showed a
   toast. Evidence: `18.png`, `19.png` (no change), step 18 remark.
5. **Severity 1 -- the graph-wide note's subject reads "Graph"**, not the project or file name;
   Jordan worked it out but said it is not how he thinks of his running club. Evidence: `07.png`,
   `08.png`, debrief.
6. **Severity 1 -- the app reopens on the Graph place, with the notes reachable only through the
   rail or the small "1 note" link.** Jordan found them at once, so it cost nothing here.
   Evidence: `17.png`, step 16 remark.

What worked: the Notes place itself, the chips that name each note's subject, the "1 note" link
in Farah's inspector, and the find box, which found Farah the way his history says it always did
(`09.png`, `10.png`, `12.png`).

## What this says about the round

No build defect showed up: every control did what the answer key says it does, the save and
reopen kept the notes and the earlier work, and the downloaded file holds both notes on their
targets. None of Jordan's effort went into a broken control. Problem 1 is a design finding that
depends on the state the setup left (the PageRank run open in the inspector): the answer key's
path clears it with Escape Escape, which this participant never tried. Problems 2 to 4 are about
how the save is reported, not about whether it works.
