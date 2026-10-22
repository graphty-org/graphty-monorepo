# Grade: session r1-s42 -- Elena, returning, leaves two reminders on the Florentine families network (task T19, variant B)

**Grade: S** (success). The last screen (`19.png`) is the Notes place after closing and
reopening the saved project from Recent projects. It lists both notes, each on the right target:
"Marriages only; business ties are a separate list" with the chip "Graph" (Oct 8, 11:53 PM), and
"Check the 1434 return from exile" with the chip "Medici" (Oct 8, 11:52 PM). The project was
saved as "Florentine families" ("Saved Florentine families in this browser.", `16.png`), and
Elena opened it from the Recent projects row, not the sample of the same name (`17.png`,
`18.png`). She showed the Notes place as where she would read them. This matches the answer
key's success state for B.

The graph note started on the wrong target: the Notes place "+" opened a form saying "About
Medici" because Medici was still selected (`07.png`). She read the label, pressed Cancel before
typing anything, cleared the selection and started again (`08.png` to `10.png`). No note was ever
saved on the wrong target, so this is not the SD case "one note on the wrong target fixed after a
detour". It is recorded below as a wrong turn and a problem.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Setup `florentine-ranked.txt` reached its end
state (PageRank run, sized and colored by PageRank). Every step's screenshot matches its command,
and the tool named each target it clicked. The session is not void.

## What the last screen shows (`19.png`)

- Left: the Notes place, newest first. "Marriages only; business ties are a separate list",
  chip "Graph", Oct 8, 11:53 PM; "Check the 1434 return from exile", chip "Medici", Oct 8, 11:52
  PM. Each has a delete button.
- Right: the Graph inspector, header "From Florentine families 1 note", Overview 15 nodes, 20
  edges.
- Canvas: the same drawing, sized and colored by PageRank (key 0.03066 to 0.1458), shifted down
  from before the reopen as the answer key describes for B; not lost work.

## Measures

- **Steps:** 18 after the start (`02.png` to `19.png`). The answer key's keyboard path is about
  14 commands; her mouse path with the detour is close to it.
- **Wrong turns: 2.**
    1. Step 7 (`07.png`): pressed the Notes "+" with Medici still selected; the form read "About
       Medici". She saw the label, cancelled (step 8), clicked empty canvas to clear the selection
       (step 9, `09.png`, inspector shows Graph), and the "+" then read "About Graph" (`10.png`).
       Three extra steps.
    2. Step 13 (`13.png`): hovered "Local only" to find out whether her work was saved. Its tooltip,
       "Nothing is sent. Opens Settings > Privacy", is about privacy, not saving. One extra step.
       Steps 2 and 3 (clicking Medici, then the inspector "..." to find Add note) are the expected
       path for a mouse user, not detours.
- **False "done": none.** Her final claim (both notes there after the reopen, Medici's on Medici,
  the other on the whole network) is what `19.png` shows. Her remark at step 18 that the right
  side says "1 note" is accurate (the graph's own count); she did not read it as a missing note.
  truth-on-screen: no wrong claim.
- **Traps avoided:** not `not-kept` (she saved, then checked after reopening), not `wrong-row`
  (graph note on Graph, Medici note on Medici), no note typed into Find or a label, and she opened
  her saved row rather than the sample.
- **Self-rating** (5 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). No build defect was seen: every control did what the answer
key says it does on this build.

1. **Severity 2 -- the Notes place "+" silently attaches a new note to whatever is selected.**
   Nothing on the "+" says so; only the small "About Medici" label above the empty box shows the
   target. Elena caught it because she was already worried ("I hope it doesn't tie this one to
   Medici too"); a user who types straight in would put the graph note on Medici, the answer key's
   `wrong-row`. Evidence: `06.png` (Medici still highlighted after saving the first note),
   `07.png`, step 7 remark, debrief.
2. **Severity 2 -- nothing lasting on screen says whether the work is saved.** The Notes place
   and header give no saved or unsaved state, and the "Local only" label next to a lock reads like
   a storage status but is about privacy. Only the save toast, which fades, says "Saved ... in
   this browser". Evidence: `12.png`, `13.png`, `16.png`, debrief.
3. **Severity 2 -- the start screen's line "This browser can clear projects kept here. Save a
   local copy of any project you need to keep." leaves a user who just pressed Save unsure
   whether her work is kept.** With "Save", "Save as..." and "Save local copy..." side by side in
   the menu, she could not tell which keeps her notes; she said she would probably ignore the
   warning but was "a little uneasy". Evidence: `14.png`, `17.png`, debrief.
4. **Severity 1 -- the saved project and the sample share the name "Florentine families" on the
   start screen**, and the Recent projects row does not say it holds the notes. She had to check
   which column she was clicking. Evidence: `17.png`, step 17 remark.
5. **Severity 1 -- adding a note to a node takes a guess.** Selecting Medici showed no place to
   write; she found "Add note" by trying the inspector "...". Once the menu was open the command
   was obvious. Evidence: `02.png`, `03.png`, step 2 remark. (Opinion-level; held one down.)
6. **Severity 1 -- the app reopens on the Graph place, not Notes**, and the only sign of the notes
   there is the inspector's small "1 note" link, which counts only the graph's own note. She went
   to Notes herself, so it did not mislead her here. Evidence: `18.png`.

What worked: "Add note" in the node's "..." menu opened the Notes place with a ready form already
labeled "About Medici" (`04.png`); the saved note showed its target as a chip and the inspector
updated to "1 note" at once (`06.png`); the save dialog filled in the project name (`15.png`); and
both notes came back intact after the reopen (`19.png`).

## What this says about the round

The session spent its time on design questions -- where a new note goes, and whether saved work
is safe -- not on broken controls. The two severity 2 findings (the "+" taking the selection as
its target, and no lasting saved state) are behavior findings and need a second participant on
the same place to be confirmed.
