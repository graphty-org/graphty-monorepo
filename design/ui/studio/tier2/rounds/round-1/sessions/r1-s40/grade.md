# Grade: session r1-s40 -- Dev, back for the class project, leaves two reminders on the Florentine families network

**Grade: S** (success). Both notes are on the right targets, the project was saved in the browser,
and after closing and reopening from Recent projects both notes are listed again in the Notes place:
"Check the 1434 return from exile" with the chip "Medici", and "Marriages only; business ties are a
separate list" with the chip "Graph". This is the answer key's success state B. The one detour (a
note form that opened "About PageRank") was cancelled before anything was saved, so no note ever
sat on a wrong target; the answer key grades SD only for a note saved on the wrong target and fixed,
or reminders found only after searching.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Setup `florentine-ranked.txt` reached its stated
end state (PageRank run, Style tab, `01.png`). Every step's screenshot matches its command. At step
8 `--click Graph` matched two buttons (the rail button and the note's "Graph" chip) and took the
rail button, which is what the participant meant; the screen confirms it (`08.png`). Not a tool
fault. The session is not void.

## What the last screen shows (`19.png`)

- Notes place open. Newest first: "Check the 1434 return from exile", chip "Medici", Oct 8, 11:48
  PM; "Marriages only; business ties are a separate list", chip "Graph", Oct 8, 11:47 PM.
- Inspector: Medici, "Node 1 note", PageRank "0.1458, #1 of 15". Ranking colors, sizes and key
  unchanged.
- `19.png` is byte-identical to `16.png` and `17.png`; `16.png` is the first screen after the
  reopen (`14.png` start screen, `15.png` "Opened Florentine families"), so the last screen is the
  reopened project, not the session before the save.

**Downloads:** `downloads/Florentine families.graphty.json` (7,366 bytes) holds both notes' text.
Saving a local copy was extra; the answer key counts the browser save alone as kept and says a
local copy as well is no detour.

## Measures

- **Steps:** about 18 actions after the start (`02.png` to `19.png`). The graded state is first
  reached at step 16 (`16.png`). The success path is about 14 actions; steps 17 to 19 (trying the
  "1 note" link, saving a local copy) were checks after the task was done.
- **Wrong turns: 1.** Step 4 (`04.png`): with the PageRank run open in the inspector, the Notes
  "+" opened a form "About PageRank". He cancelled, opened Graph, chose Everything, and came back to
  "About Graph" (`05.png`, `06.png`). Three extra actions.
- **False "done": none.** Every claim in the debrief matches the screen: both notes, right chips,
  present after reopening (`16.png`), "1 note" under Medici (`15.png`), the save ("Saved Florentine
  families in this browser.", `13.png`). He did not read "Save note" as saving the project: he
  checked with Control+S and found it had never been saved (`12.png`). truth-on-screen: no wrong
  claim.
- **Failure traps avoided:** no `not-kept` (saved, reopened, checked), no `wrong-row` (Medici note
  on Medici, network note on Graph), no text typed into Find. He opened the Recent projects row,
  not the sample of the same name, and said why (`14.png`, step 14 remark).
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). None of these is an implementation defect: every control did
what the answer key says it does on this build.

1. **Severity 2 (confirmed: this session, r1-s39 and r1-s41, same task, same place) -- what a
   new note is about follows whatever the inspector shows, silently, and the note form offers no
   way to change it.** With the ranking run open, the Notes "+" (nothing selected on the drawing)
   opens "About PageRank". He had to guess that the right-hand panel decides the target, cancel, and
   go through Graph > Everything. Evidence: `04.png`, `05.png`, `06.png`, step 4 remark, debrief.
2. **Severity 2 -- saving a note does not save the project, and nothing near the notes or in the
   header says the project is unsaved.** "Local only" reads the same before and after the save
   (`11.png`, `13.png`), and the only confirmation is a toast that fades. He caught it only because
   he habitually pressed Control+S; a user who trusts "Save note" loses both notes on close.
   Evidence: `11.png`, `12.png`, `13.png`, debrief.
3. **Severity 1 -- "Everything" in the Graph tree and "Graph" on the note chip and form name the
   same thing.** He paused over whether they were the same. Evidence: `05.png`, `06.png`, debrief.
4. **Severity 1 -- "Save local copy..." gives no on-screen confirmation.** The download happened
   (the file is in `downloads/`), but the screen is unchanged (`19.png` identical to `17.png`),
   unlike the "Saved ... in this browser." toast for Control+S. Evidence: `18.png`, `19.png`.
5. **Severity 1 -- the start screen's "This browser can clear projects kept here" appears right
   after a successful save and made him doubt it.** It sent him to save a local copy as well; no
   harm, but the wording reads as a warning about work he just kept. Evidence: `14.png`, debrief.
6. **Severity 1 -- the inspector's "1 note" link opens the whole Notes list without picking out
   Medici's note.** Fine with two notes; with many it would not say which is Medici's. Evidence:
   `16.png`, `17.png`, step 17 remark.
7. **Severity 1 (opinion, held down from 2) -- the Notes "+" shows an arrow pointer, not a hand.**
   The tooltip "Add note N" settled it. Evidence: `03.png`.
8. **Severity 1 -- two buttons share the accessible name "Graph"** (the rail button and a note's
   chip), so name-based navigation (and a screen reader's list of buttons) cannot tell them apart.
   Evidence: tool output at step 8, `08.png`.

What worked: the Notes rail button was found on the first screen without the history naming it;
the "About Medici" / "About Graph" line above the note box let him check the target before typing;
the "1 note" link in the inspector, and the reopen from Recent projects brought back the drawing,
the selection and both notes intact (`15.png`, `16.png`).

## What this says about the round

No build defect and no broken control: the session was spent on the task and on two design
questions, which target a note attaches to and whether the work is saved. Both are about the
app's words and feedback, not about the implementation.
