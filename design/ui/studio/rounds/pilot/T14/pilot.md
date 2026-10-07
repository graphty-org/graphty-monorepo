# Pilot: T14, stop for the day and come back

Piloted on 2026-10-06 against the production build in `graphty/dist` (graphty 0.8.53, commit
a1e6b91ff, build 0196d46212aa) at `/?next`, driven by `tool/real.mjs`, one live browser session.

## Verdict

**End state NOT reached. The task cannot be run with the study tool as it is.** The first save of
a project opens the browser's own save-file picker (the File System Access API, which the app uses
in Chromium). In the tool's headless Chromium that picker never appears and is treated as
cancelled, so the app's "Save as" dialog simply stays open. Nothing is saved, nothing enters
Recent projects, and the rest of the path (close, reopen from Recent projects) cannot be walked.
Every participant would fail or give up at step 3 for a reason that is the tool's, not the app's.
Per the task's own rule ("if the tool cannot, the session is void (tool fault)"), T14 must not be
run until the tool can answer a save picker.

## What was walked

| Step | Screenshot | What happened |
| ---- | ---------- | ------------- |
| setup start | `01.png` | `SETUP FAILED: nothing on screen is called "Run"`. The Analyze search had PageRank typed, but Enter did not open it, so no Run button existed. The later setup lines still ran: a label line bound to `name` was added on a second row also called "Everything". No PageRank result. |
| Escape, Shift+A, type PageRank | `02.png` | The Analyze search shows one entry, "PageRank  Start here". |
| Enter | `03.png` | Nothing happens: the entry does not open. |
| click "PageRank" | `04.png` | The entry opens: Damping factor 0.85, "Under a second", Run. |
| click "Run" | `05.png` | Done. A row "Influence" (77) appears, nodes turn orange, the key shows "Color: Influence 0.003299 - 0.07543"; the label line now reads "77 labels, 8 hidden to avoid overlap". **This is the intended starting state.** |
| `--key Control+s` | `06.png` | "Save Les Miserables as" dialog, Name prefilled and selected, hint "Choose where the file goes next. Later saves write the same file." Correct. |
| `--type "Les Mis pilot"`, `--key Enter` | `07.png` | The name is typed; the dialog stays open. No file chooser reported, no notice, no console error. |
| click "Save" | `08.png` | Same: the dialog stays, the header still says "Les Miserables". **Blocked here.** |
| Cancel; click the project name | `09.png` | The project menu: Rename, Open project or file..., Save, Export..., Save as..., Close project. No other way to keep the project (no download of a copy). |
| click "Close project" | `10.png` | "Discard unsaved changes? Les Miserables has changes that are not saved. They are lost if you continue." Cancel / Discard. The guard works. |
| Cancel; Shift+Ctrl+S; click "Save" | `11.png`, `12.png` | Save as... by its shortcut ends the same way: the dialog stays open. |

Screenshots are in this folder; `session.json` records the build and the setup as run.

## Blockers

1. **Study tool: the save picker can never be answered (blocks the task).** `real.mjs` handles
   `page.on("filechooser")` for opening files and `page.on("download")` for downloads, but the
   app's first save calls `window.showSaveFilePicker`. Headless Chromium rejects it at once as a
   cancel, and `saveProjectAs` (`graphty/src/workspace/project/actions.ts`) then returns false and
   leaves the dialog open, by design for a reader who cancelled. The same will hit Recent projects:
   reopening reads a stored file handle, and "Locate..." calls `showOpenFilePicker`. The tool needs
   one of: a stub of `showSaveFilePicker` / `showOpenFilePicker` injected with `addInitScript`
   that writes to and reads from the session folder (keeping the handle in IndexedDB as Chromium
   would), or a headed browser where Playwright can drive the picker. Evidence: `07.png`, `08.png`,
   `12.png`; no "a file chooser is open" line and no download line after any save step.
2. **Task wording / answer key: the setup's Analyze path is wrong (blocks the setup start).**
   `tasks.md` T14 start says "run PageRank from Analyze"; the setup written from `answers.md` T7's
   path (`--key Shift+A`, `--type PageRank`, `--key Enter`, `--click "Run"`) fails because Enter
   in the Analyze search does nothing. The working sequence is `--key Shift+A`, `--type PageRank`,
   `--click PageRank`, `--click Run` (`04.png`, `05.png`). The same `--key Enter` is in T7's,
   T8's and T13's paths and setups, which will fail the same way. A corrected T14 setup is in
   `setup.txt` here; it has not been run as a whole.
3. **App: Enter in the Analyze search does not open the only match (keyboard path).**
   `AnalyzePopover.tsx` handles only Escape; the filtered entries are buttons with no active
   option, so a keyboard user who types "PageRank" must Tab to the entry. Evidence: `03.png`
   (Enter pressed, nothing changed), and the setup failure in `setup.log`.
4. **App (minor): a save that cannot reach a file gives no feedback.** When the picker returns
   without a file, the dialog just stays, with no message. Right for a reader who pressed Cancel
   in the picker; wrong when the picker never showed (a browser or policy that blocks it), where
   the reader sees Save do nothing. Evidence: `07.png`, `08.png`.
5. **Study tool or graphty-element: every step reported "the drawing is still moving"** ("The
   graph was still changing 15000 ms after waitForStableFrame() was called: the node label counts
   have not been announced"), including steps that change nothing on the canvas. The drawing is in
   a different orientation in nearly every screenshot (`03.png` to `12.png`, for example Myriel's
   fan at top left in `05.png`, right in `08.png`, bottom right in `12.png`), so it really is
   still moving or turning between steps, and the label-count signal the tool waits on is not
   arriving even after the label line shows "77 labels, 8 hidden". Every step costs 15 seconds,
   and a participant pointing at a node from the last screenshot (`--click-at`) will miss it.
   Needs a look at whether the layout or camera keeps moving, or whether the label counts event
   is not fired; it did not block this task.

## Observations for the answer key (not blockers)

- The PageRank run row is called **"Influence"**, not "PageRank" (`05.png`). "The run, its colors
  and the names are back" should be checked as: an "Influence" row with 77, orange nodes with the
  key "Color: Influence 0.003299 - 0.07543", and the label line "Abc name" with names drawn.
- The label line added through the Style tab makes a second row called "Everything" under the
  first (`01.png` onward); a participant may read that as a duplicate.
- The key in the top-left lists every label value under "Label: Everything" (Anzelma ... and "65
  more"), which covers part of the drawing in every screenshot.
- The answer key's path step `--click "<their name>"` under Recent projects could not be checked.
