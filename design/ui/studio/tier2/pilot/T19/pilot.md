# Pilot: T19, reminders that stay with the work (running club, A)

Build under study: graphty@0.8.55 (build ca8b3b916c22), commit 6eba30d4e plus uncommitted changes,
opened at `/?next`. Start: setup `rounds/tier-2/setups/friends.txt` (friends.csv open).

**Result: reached.** Both reminders were written on the right targets, saved, and were listed again
after the tab was closed and the project reopened from Recent projects. No blockers.

## The walk

| Step  | What was done           | What the screen showed                                                                                                                                                                                          |
| ----- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01    | Start                   | friends.csv drawn, 20 nodes, 41 edges. No node labels are drawn, so Farah cannot be found on the canvas by eye.                                                                                                 |
| 02    | `/`, type "Farah"       | Find box lists one element, Farah.                                                                                                                                                                              |
| 03    | Enter                   | Farah selected (yellow ring), inspector "Farah, Node". The drawing is reframed so the top of the graph is off the canvas (the answer key's Watch item).                                                         |
| 04    | `n`                     | Notes place opens with an empty editor headed "About Farah", Cancel and "Save note".                                                                                                                            |
| 05    | Type the Farah text     | Text in the editor.                                                                                                                                                                                             |
| 06    | Ctrl+Enter              | Note listed with the chip "Farah" and a time; inspector header now "Node 1 note".                                                                                                                               |
| 07    | Escape, Escape          | Nothing selected; inspector back to "Graph, From friends.csv".                                                                                                                                                  |
| 08-09 | `n`, type the club text | Editor headed "About Graph".                                                                                                                                                                                    |
| 10    | Ctrl+Enter              | Two notes listed, the new one with the chip "Graph"; inspector "From friends.csv 1 note".                                                                                                                       |
| 11    | Ctrl+S                  | Dialog "Save friends as", Name "friends", Cancel / Save.                                                                                                                                                        |
| 12    | Save                    | Toast "Saved friends in this browser."                                                                                                                                                                          |
| 13    | Reopen tab              | Start screen; Recent projects lists "friends, In this browser - 20 nodes - Oct 7, 2026, 5:17 PM", with the line "This browser can clear projects kept here. Save a local copy of any project you need to keep." |
| 14    | Click "friends"         | Toast "Opened friends"; inspector "1 note" on the graph.                                                                                                                                                        |
| 15    | Click Notes             | Both notes listed with their chips, Graph and Farah (matches the success state).                                                                                                                                |
| 16    | Click the Farah chip    | Farah selected, inspector "Node 1 note".                                                                                                                                                                        |

## Findings (none blocks the task)

- **The save is to browser storage, and the start screen warns that the browser can clear it.**
  The prompt says "make sure both will still be there the next time"; a careful participant who
  reads that warning may also save a local copy (the start screen tells them to). The answer key
  counts "the project saved" without saying whether the browser save alone is S. Suggest the key
  say explicitly that the browser save is enough for S, and that a local copy as well is not a
  detour.
- **The tool README describes a save picker that this build never opens.** Ctrl+S here saves into
  the browser with a name dialog; the tool printed only the screenshot path (no "the save picker
  chose" or "a project file was written" line) and wrote no `saved/` folder. The reopen through
  Recent projects worked, so the task is unaffected; the README's "Saving and reopening a project"
  section reads as if every save writes a file.
- **Find frames part of the graph off the canvas (03 to 10).** Already the answer key's Watch item;
  the drawing returns whole only after reopening. Not a blocker.
- **While the Save dialog was open (11), the drawing below the dialog's top edge was blank**: edges
  stop at the dialog's top and the nodes lower down are not drawn, though the canvas there is not
  covered by the dialog. Seen once; back to normal after the dialog closed (12). Worth a look but
  not confirmed as a defect.
- In A, `--click friends` on the start screen was not ambiguous (no sample named friends); the
  answer key's click-at advice applies to B (Florentine families), which this pilot did not walk.
- Prompt wording avoids "note", "add" and "save"; the path's controls ("Save note", "Save") were
  reached by keys, so no echo was tested.
