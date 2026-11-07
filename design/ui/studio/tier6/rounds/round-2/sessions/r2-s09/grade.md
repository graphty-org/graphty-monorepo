Grade: F
False done: no
Wrong turns: 5
Model calls: 2
Failure: none
Participant model: claude-opus-5-5 (from the model field of the participant's log; the transcript names none; not sonnet)
Steps: 29, of which 9 to the Undo and 13 to the end of the checks that passed, against 3 or 4 on the success path

# Session r2-s09: T94 A, Ruth, Les Miserables poster

**Result.** The Undo itself worked, but the session did not end on the success state. The reader
closed the tab to test what autosave had kept, and the project never came back. The last screen
(`22.png`) is the start page with the Open network data dialog over it: no project, no key card, no
conversation.

**Why F.** The success state is read from the end of the session, and all of it fails there:

- The last `look` is 9e7e49b0439e and the first is 1328d3dd4bea.
- `key.json` has `key: null`, so no key card shows.
- There is no panel, so there is no conversation and no row reading Undone.
- `styles.json` lists seven layers gone and nine added, and `work.json` does not match its start.

**What these records do and do not show.** The end records describe the start page's showcase
drawing, not Noor's project. The `louvain` run in `work.json` is that drawing's own, so it is not a
community run left behind and must not be counted as one under bar 7. Its look, 9e7e49b0439e, is the
same on both repro walks, whatever was done before the reopen. Bar 7 still does not hold for this
session, because it did not end with the picture, the layers and the conversation in place.

**What held before that.** From `09.png` to `12.png` every part of the success state was true:

- `look` was 1328d3dd4bea again, the same as the first line.
- The key card read "Color: Poster, 3 of 77 nodes".
- The row read Undone, with the conversation above it.
- The layer list on `10.png` was Hovered 0, Selected 0, Poster 3, Everything 77.

The Undo in the reply is the success path's own route, and what the reader said about the state was
right. A session that stopped at step 12 would have been S. The report should give that beside the F.

**Build decided: not marked.** The line needs a defect named in the key, and this one is not named
there. The reader's own move also closed the project, and she says so. Problem 1 did shape that
outcome, though: nothing warned her, and the chip had said "Autosave: saved" throughout. The study's
own wording added to it (problem 8).

**False done.** No. "Did I finish? Mostly", and she limits the claim herself: she can tell Noor it
"was back on screen", she "can't tell her it is back in what was saved", and "My own reopen is also
what lost me the open project". That agrees with the last screen.

**Her account checked against the records.** Each of these is right, and each was on screen first:

- Layers, key card and Overview: `10.png` shows 77, 254, density 0.08681 and 1 component.
- Table: 77 nodes and two columns, which `data.json` agrees with for node columns.
- Group sizes 20, 17, 11, 11, 10 and 8, which add to 77 (`07.png`, `08.png`).
- She marks the table as "not a before-and-after match", which is accurate.

**Steps and wrong turns.** The 9 steps to the Undo are the path's 3 or 4 plus looking at the result
as the task asks (the folded step, Open run, Values, Graph, back to the Assistant). The checks to step
12 are in scope too. The 5 wrong turns are the close and reopen, scrolling the start page, Open a
file, New project with the main menu's Open project or file..., and Open network data.

**Leak check.** `leaks.json` read one participant log, 68 calls, and lists no leak. No VOID applies:
the tool ran to the end and every failed-request line was a sample thumbnail on the start page.

**Counts (bar 11).** "Computed Communities for 77 nodes", Groups 6, the sizes and "3 of 77 nodes" all
agree with the file and the records. The one reply that claims a change has a change line (`04.png`).

## Measures

- How the change was reversed: Undo in the reply (step 8's command, `09.png`).
- Layer list: looked for twice, by leaving the chat for the Graph place, before Undo (`08.png`) and
  after it (`10.png`). With the chat open she did not have it, and she used it as her main proof.
- Preview before a change: no wish stated. Autosave having saved the colors was her worry instead.
- Starters: read as "three suggested questions" and not used; she typed the request.
- Messages: 1. Model calls: 2. One folded step, opened ("Communities 30 ms").

## Problems

Severity is 0 to 4. Repro: `../../repro/r2-s09/run.sh`, on frozen build 3b2a7f0649, 5 model calls in all.

1. **Severity 3, build-defect. "Autosave: saved" leads to nothing once the tab closes, with the
   project opened from the start screen and its changes undone.** Steps 12 to 21, `13.png` to `22.png`.
   The reader was blocked: seven places searched, no Resume, no Recent projects, no card, no word on
   where the project went. The conversation went with it, and no warning came before the close.
   - Repro: `walk-undone/05.png` shows the bare start page after the same steps. `walk-kept/04.png`,
     the same steps without the Undo, shows "Unsaved work from your last visit" with Restore.
   - Mechanism: the start screen's Open a file passes `File` objects with no handle, and `remember`
     in `graphty/src/workspace/project/actions.ts` keeps only a file with a handle. `findKept` in
     `autosave/autosave.ts` offers only an entry marked dirty, and the walks show none offered once
     the change is undone.
   - Limit: nothing was lost from Noor's file, and opening it again gives the poster. The screen never
     says that, so the reader judged opening the file to be proof of nothing (step 17).
2. **Severity 2, wording. "Autosave: saved" says neither what nor when.** `04.png` to `12.png`. It
   reads the same with the AI's colors on and after Undo: "Saved what, when?" It is what sent her to
   close the tab. She did not hover the chip, so its tooltip was not tested.
3. **Severity 2, behavior. The Poster row's count becomes an unexplained icon while Communities sits
   above it.** `08.png`, step 8. "I don't know what it meant, and nothing told me Poster was being
   covered rather than changed." It came at the moment she was judging whether the poster was harmed.
4. **Severity 2, behavior. "Circle of friends" comes back as Group 1 to Group 6 with no names to
   check.** `04.png`, `07.png`, step 7. She could not say who is in which group, and "A circle of
   friends without names is not an answer I could check". She did not try hovering a node or a group
   row, so this is what she met, not a proven absence.
5. **Severity 1, build-defect. The wheel does not scroll the start page.** Steps 13 and 14, `14.png`.
   Repro: `walk-undone/05.png` to `06.png`, at the same point, leaves the page where it was, though
   `start.css` says the wheel moves it. The mechanism is not traced. End and PageDown worked.
6. **Severity 1, build-defect. The Undo notice ends in a doubled period and reads as broken grammar.**
   `09.png`: "Undid Color every character by the circle of friends they belong to.." Repro:
   `walk-undone/04.png`. It quotes the request, with its own period, into a sentence.
7. **Severity 1, wording. "Open run" does not say where it acts.** `06.png`, step 5: it changes only
   the right-hand panel, and "the words don't say that".
8. **Severity 1, behavior, the study's. The briefing promises what this project cannot do.** The
   `--reopen` row says "Recent projects and the saved files are still there", and her history says she
   reopened from Recent projects. The setup opens the file the way that leaves no entry, so the
   briefing helped lead her to the close and to the search after it. The row should say that only
   saved projects are listed.
