# Pilot: T5, a file that will not read

Build under study: graphty@0.8.53, build 0196d46212aa, commit a1e6b91ff, opened at `/?next`
(from `session.json`). Viewport 1440 x 900.

## Verdict

The end state is reached in the two steps the answer key gives. After opening
`club-members.graphml` (a GraphML file cut off at line 8, in the middle of its second `<key>`
element), the app shows a toast:

> club-members could not be opened. The graphml source could not be read: unexpected end of input
> inside markup

That is enough for a participant to say the file is broken and to ask for it again. The task can
run as written. Three app defects make a failure (code F, "thinks it loaded") likely for anyone who
looks away for a few seconds; they are listed below and should be fixed or at least known before
participants run it.

## Steps

| Step | Command | Screenshot | What the screen shows |
| ---- | ------- | ---------- | --------------------- |
| 1 | `--start rounds/pilot/T5 empty` | `01.png` | Start screen: Open project or file..., New from data..., four samples, the usage-data banner. |
| 2 | `--click "Open project or file..." --upload club-members.graphml` | `02.png` | A workspace titled "club-members" opens: Graph rail, empty canvas with "No nodes to draw / Add data...", and the refusal toast above the bottom toolbar. No console errors printed. |
| 3 | `--wait 10000 --expect "could not be opened" --expect "role=alert"` | `03.png` | The toast is gone. Both expects fail. Nothing on screen says the file failed: it looks like an empty project named club-members. |
| 4 | `--click "Data"` | `04.png` | Data rail: "club-members", Sources (empty), Attributes. No record of the failed file anywhere. |

A second session (`announce/`) checked the announcement: right after the upload,
`--expect "role=alert"` passes (`announce/02.png`). The toast message is rendered by
compact-mantine's `Toast` inside `<span role="alert">`, so it is announced assertively; the
keyboard-path requirement for Morgan is met. The toast was still present at `announce/04.png` and
gone at `announce/05.png`, consistent with the 6-second timer below.

## Blockers and defects

None blocks the success path. In order of how likely each is to change a participant's outcome:

1. **App defect -- the refusal disappears after 6 seconds and leaves nothing behind.**
   `graphty/src/workspace/frame/NoticeSlot.tsx` takes every notice down after `NOTICE_MS = 6000`
   (paused only while the pointer is over it, not while it has keyboard focus). For a failed open
   that is the only evidence of the failure: `03.png` and `04.png` show a normal-looking empty
   project. A participant who reads the canvas first, or a screen-reader user who moves on, has no
   way to get the reason back. An error that ends the user's task should stay until dismissed
   (WCAG 2.2.1 timing also applies to content that disappears on a timer).

2. **App defect -- a failed open still creates and opens a project named after the file.**
   `02.png`: the header says "club-members", the panel says "Graph club-members", the canvas offers
   "Add data...". The app is telling the participant the file opened and is empty, which is the
   "thinks it loaded" failure the answer key names. Not checked here: whether the empty project is
   also added to Recent projects on the start screen; worth one step in the next pilot.

3. **App defect -- the line the element knows is not shown.** graphty-element's
   `unreadableSource` (`graphty-element/src/session/project/ingest.ts`) raises `E_PARSE_FAILED`
   with `details.line` when the reader reported one, and graph-io's XML reader throws with the line
   (`graph-io/src/common/xml.ts`, "unexpected end of input inside markup"). The app's open path
   (`graphty/src/workspace/Workspace.tsx`, the `opening.load(...).catch`) shows only
   `error.message`, so the "and where, if the screen says" part of the answer key can never be
   met. Not verified whether `details.line` is actually filled for this file.

4. **graphty-element defect (presentation neutrality) -- the reason is English written by the
   element.** "The graphml source could not be read: unexpected end of input inside markup" is the
   element's `message`, passed straight through by the app. Per the repository rule that the
   element returns `{ code, params }` and the app writes the words, the app should build the
   sentence from `E_PARSE_FAILED` and its details. The current wording is also technical
   ("graphml source", "markup") and never says "the file is incomplete" or "ask for it again"; a
   non-technical participant has to infer that. Expect some SD codes ("needed a second look to
   understand the refusal").

No study-tool defect: every step ran, the upload answered the file chooser, and the screenshots
match the steps. No task-wording problem. The answer key is right; its "Partial" codes already
cover the likely failures above.

## Notes for running the task

- The usage-data banner is not dismissed on the path. It does not overlap the toast or the Open
  button; leave the path as is.
- A participant's next step after the upload must come quickly to see the toast in their own
  screenshot; the tool's screenshot after the upload step catches it reliably (`02.png`).
