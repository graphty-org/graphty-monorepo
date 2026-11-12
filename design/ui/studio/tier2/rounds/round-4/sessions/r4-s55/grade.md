# Grade: session r4-s55 -- Dev (tier 1 graduate), running club (T19 A), reminders that stay with the work

**Grade: S** (success). The last screen (`20.png`, byte-identical to `19.png`) is the answer key's
success state A: the Notes place, after closing the tab and reopening the project from Recent
projects, lists "Moving away in May; ask who takes over the Tuesday run" with the chip "Farah" and
"Spring list, checked against the sign-up sheet" with the chip "Graph". The project was saved in
the browser ("Saved friends in this browser.", `16.png`) before the reopen. The one detour (a note
form that opened "About PageRank") was cancelled before anything was saved, so no note ever sat on
a wrong target. The key grades SD only for a note saved on the wrong target and then fixed, or for
reminders found only after searching; neither happened.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900, no uncommitted changes, tool commit `435e878a1d4c`. Setup
`friends-ranked.txt` reached its stated start (PageRank run, sized and colored, the run open on the
Style tab, `01.png`). Every screenshot matches its command. At step 8 `--click "Graph"` matched two
controls (the rail button and the saved note's "Graph" chip) and the tool refused it and did
nothing (`09.png` identical to `08.png`); the participant retried with `--click-at` on the rail
button. That is the tool's documented refusal of an ambiguous name, not a fault; a person would
have clicked the rail button. The session is not void. `leaks.json`: 43 calls, no leaks.

## What the last screen shows (`20.png`)

- Notes place open, newest first: "Moving away in May; ask who takes over the Tuesday run", chip
  "Farah", Oct 11, 3:45 AM; "Spring list, checked against the sign-up sheet", chip "Graph", Oct 11,
  3:44 AM.
- Inspector: Farah, "Node 1 note", Degree 4, PageRank "0.06394, #1 of 20". Key, colors and sizes
  unchanged.
- This is after the reopen: `17.png` is the start screen with the Recent row "friends, In this
  browser - 20 nodes - Oct 11, 3:45 AM"; `18.png` shows "Opened friends".
- `work.json`: start and end hold the same run, layers and source; the end adds exactly the two
  notes; nothing gone.

**Downloads:** `downloads/friends.graphty.json` (8,423 bytes) holds both notes' text. The local copy
was extra; the key counts the browser save alone as kept and says a local copy as well is no detour.

## Measures

- **Steps:** 19 `real.mjs` steps after the start (`02.png` to `20.png`). The graded state is first
  reached at step 18 (`19.png`). The success path is about 14 actions. Extra: the hover on "+"
  (exploration), the PageRank-form detour (3 actions), the refused "Graph" click (1, tool), the
  local copy (1, allowed by the key).
- **First move:** the Notes rail button (`02.png`), a direct door.
- **Wrong turns: 1.** Step 3 (`04.png`): with nothing selected on the drawing but the PageRank run
  open in the inspector, the Notes "+" opened a form "About PageRank". He cancelled, opened Graph,
  chose Everything, and came back to "About Graph" (`05.png` to `07.png`). Recovered.
- **Farah route:** the find box ("Farah", `10.png`), then the "Farah" row under Nodes 1 (`11.png`),
  then Notes "+", which opened "About Farah" (`12.png`). The drawing shows no names, so he could not
  click her on the canvas; the find box is the history's named place and led on.
- **False "done": none.** "Done" is claimed after `20.png`, which shows both notes on the right
  targets after the reopen. The debrief's claims (Farah's note on Farah, the club note on Graph,
  saved, both back after reopening, "1 note" on Farah's inspector) all match the screens.
  truth-on-screen: no wrong claim.
- **Failure traps avoided:** no `not-kept` (saved, closed, reopened, checked), no `wrong-row`, no
  text typed into Find or a label.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity 0-4 (Nielsen). Every control did what the answer key says it does on this build.

1. **Severity 2 (confirmed: same place in round 1 sessions r1-s39, r1-s40, r1-s41 and here) -- what
   a new note is about follows whatever the inspector shows, silently, and the note form offers no
   way to change it.** With nothing selected but the ranking run open on the right, Notes "+" opens
   "About PageRank". He had to guess that the right panel decides the target, cancel, and go
   through Graph > Everything to get "About Graph". A participant who did not read the small "About"
   label would have filed the club note on PageRank. Evidence: `04.png`, `05.png`, `06.png`,
   `07.png`, step 3 remark, debrief.
2. **Severity 1 -- after the browser save, the start screen's "This browser can clear projects kept
   here. Save a local copy of any project you need to keep." made him doubt the save he had just
   made.** It sent him to also save a local copy; no harm, but he left unsure which one "still be
   there next time" needed. Nothing in the header changes after a save ("Local only" reads the same,
   `13.png` against `16.png`); only a fading toast confirms it. Evidence: `16.png`, `17.png`, step 16
   remark, debrief.
3. **Severity 1 -- "Save local copy..." gives no on-screen confirmation.** The file downloaded
   (`downloads/friends.graphty.json`), but the screen is unchanged (`20.png` identical to `19.png`),
   unlike the "Saved friends in this browser." toast for Save. Evidence: `19.png`, `20.png`, step 19
   remark.
4. **Severity 1 -- "Everything" in the Graph list and "Graph" on the note form and chip name the
   same thing, and the Everything inspector shows the default style (purple 6366F1 fill) while the
   drawing is orange.** He read it as "the base look, not what I meant", then guessed it meant the
   whole club. Evidence: `06.png`, `07.png`, step 5 and step 6 remarks.
5. **Severity 1 -- two controls share the accessible name "Graph"** (the rail button and a saved
   note's chip), so a name-based click is ambiguous; the tool refused it and he had to click by
   position. Evidence: tool output at step 8, `09.png` identical to `08.png`, debrief.
6. **Severity 1 (opinion, held down from 2) -- no names are drawn on the nodes, so Farah cannot be
   picked on the drawing; the find box is the only way.** He found it at once from his history.
   Evidence: `08.png`, step 7 remark, debrief.
