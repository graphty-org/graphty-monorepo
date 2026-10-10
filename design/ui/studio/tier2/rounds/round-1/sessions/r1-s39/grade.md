# Grade: session r1-s39 -- Tom, a returning lab manager, leaves two reminders on the running club graph and keeps them (friends.csv)

**Grade: S** (success). The last screen (`23.png`) shows the Notes place with both notes, each on
the right target: "Moving away in May; ask who takes over the Tuesday run" with the chip "Farah",
and "Spring list, checked against the sign-up sheet" with the chip "Graph". The project was saved
("Save friends as", then "Saved friends in this browser.", `19.png`, `20.png`), closed, and
reopened from Recent projects ("friends -- In this browser -- 20 nodes -- Oct 8, 2026, 11:52 PM",
`21.png`, `22.png`), and both notes were listed again in the Notes place (`23.png`). Tom named the
Notes place, and the inspector's "1 note" under Farah, as where he would read them. No note was
ever saved on a wrong target: his first note form said "About PageRank" and he cancelled it before
typing (`03.png`, `04.png`), so the answer key's SD case (a note on the wrong target, fixed later)
does not apply. The detour it cost is counted below as wrong turns.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. The setup reached its documented end state (the
PageRank run open in the inspector, Style tab). Every command produced the screenshot the
transcript describes; the one ambiguity the tool reported (step 11, two buttons named "Graph":
the rail button and the note's chip) took the rail button, which is what the step meant. The
session is not void.

## What the last screen shows (`23.png`)

- Title "friends", header "Local only".
- Notes place open: Farah's note (chip "Farah", Oct 8, 11:52 PM) above the graph's note (chip
  "Graph", Oct 8, 11:50 PM), each with a delete button.
- Inspector: "Farah", "Node 1 note", Degree 4, PageRank "0.06394, #1 of 20"; the drawing keeps
  its PageRank color and size and the legend, framed as before the reopen; Farah still selected.
- No files were downloaded; the answer key counts the browser save alone as kept.

## Measures

- **Steps:** 22 after the start (`02.png` to `23.png`). The answer key's success path is about 13
  actions; the extra steps are the detour below and opening Notes and Graph by the rail instead
  of keys.
- **Wrong turns: 1.**
    1. Steps 2 to 4 (`02.png` to `04.png`): "Add note" from the Notes place opened a form "About
       PageRank", because the inspector was showing the PageRank run the setup left open. Tom
       wanted a note on the whole club; the form offers no way to change its subject, so he
       cancelled. He recovered at once by choosing "Everything" in the Graph place (`06.png`),
       after which the form said "About Graph" (`08.png`).
       Steps 17 to 20 (opening the main menu to check whether the project was kept, then Save) were
       the task's own save, not a detour.
- **False "done": none.** His final claim -- both reminders in, saved, both back after closing
  and reopening -- matches `20.png` to `23.png`. truth-on-screen: no wrong claim; he did not read
  "1 note" in Farah's inspector as the project's total.
- **Earlier work kept:** the PageRank run, its color and size layers and the legend are present
  after the reopen (`22.png`, `23.png`); nothing gone.
- **Implementation issues met:** none. Every control did what the answer key says; no error,
  no broken control, no lost work, no tool fault. All of Tom's effort went into understanding
  the design (what a note is about, whether the work is kept), not into working around a defect.
- **Self-rating** (5 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 3 -- "Add note" silently takes whatever the inspector shows as the note's subject,
   including a calculation run, and the form gives no way to change it.** With nothing selected
   on the drawing but the PageRank run open in the inspector, the note became "About PageRank".
   The only sign is a small grey "About PageRank" label above the text box; the user has to guess
   that choosing "Everything" in the Graph place is what makes a note "About Graph". Tom worried
   that a note on the ranking would be lost if the ranking were redone. A user who typed without
   reading that label would have saved the club reminder on PageRank. Tom caught it, so this
   session shows no wrong conclusion acted on. The same detour happened in session r1-s41 (Jordan,
   same task and setup), so this is confirmed by 2 participants. Evidence: `03.png`, `04.png`,
   `06.png`, `08.png`, step 3 and 4 remarks, debrief.
2. **Severity 2 -- nothing on screen says whether the project is kept.** Before the save the
   header reads "friends" and "Local only", the same as after; "Save note" says nothing about the
   project. Tom saved only because his history says he saved the lab map before, and said a new
   user "would have stopped after 'Save note'". The answer key notes that only the fading toast
   says it saved. Evidence: `17.png`, `19.png`, `20.png`, step 17 remark, debrief.
3. **Severity 2 -- "Saved friends in this browser" and the start screen's warning leave the
   meaning of "kept" unclear.** The start screen says "This browser can clear projects kept here.
   Save a local copy of any project you need to keep."; Tom skimmed past it and said he would want
   to be told plainly whether "in this browser" is safe until next month. Evidence: `20.png`,
   `21.png`, step 21 remark, debrief.
4. **Severity 1 -- the graph-wide note's subject reads "Graph", not the name he picked
   ("Everything") or the club's name.** Tom took it to mean the whole club but said he was
   guessing. Evidence: `06.png`, `08.png`, debrief.
5. **Severity 1 -- Farah's dot is half hidden behind another, and the yellow halo surrounds
   both,** so the drawing does not make clear which one is selected (a trap the answer key
   names). It cost nothing here: he read her name in the inspector. Evidence: `13.png`, `17.png`,
   step 13 remark.
6. **Severity 1 -- two controls share the name "Graph"** (the rail button and the graph note's
   chip). The tool reported the clash; a person would see two labels with the same word for
   different things. Evidence: `11.png`, step 11 remark, debrief.

What worked: the Notes place itself, the chips that name each note's subject, the "1 note" link
in Farah's inspector, the find box (which found Farah at once), the Save dialog, Recent projects,
and the reopen, which brought back the notes, the run and its styling.

## What this says about the round

No build defect showed up: every control did what the answer key says, and the save and reopen
kept the notes and the earlier work. None of Tom's effort went into a broken control. Problem 1
is a design finding that depends on the state the setup leaves (the PageRank run open in the
inspector); the answer key's path clears it with Escape Escape, which this participant never
tried. Problems 2 and 3 are about how the save is reported, not about whether it works.
