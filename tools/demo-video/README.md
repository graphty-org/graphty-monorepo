# demo-video: scripted clips of the graphty app

Records the clips of the graphty demo video (design/launch/demo-video-plan.md) from the real, built
app with a calm human-like hand, then edits them into finished videos. A clip is a small script, so
when the app changes, the clip is re-recorded, never re-edited by hand.

Everything generated goes to `tmp/demo-video/` in the main checkout (never into a worktree):

| Path                                                                            | What                                                                                                                              |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `clips/<id>.mp4`, `clips/<id>.json`                                             | one clip: 1920x1080 H.264, 30 fps, no captions; its json has the caption, timings, cursor path, clicks and keys with target boxes |
| `out/<cut>.mp4`, `out/<cut>-chapters.txt`, `out/chapters.txt`, `out/index.html` | finished videos, YouTube chapter lists (the tour's is also `chapters.txt`), a page to watch them                                  |
| `review/<name>/`                                                                | review frames and a contact sheet                                                                                                 |
| `bench/`                                                                        | capture measurements                                                                                                              |
| `bin/ffmpeg`                                                                    | ffmpeg (a link to a static build; set `DEMO_FFMPEG` to use another)                                                               |

## Commands

From the repository root:

```bash
# the app the clips film is the recording build (below); DEMO_DIST=<dist> films another
node tools/demo-video/record.mjs --list                    # every clip
node tools/demo-video/record.mjs --only find-groups        # record clips (--chapter 2, --all)
node tools/demo-video/frames.mjs find-groups               # a frame every 0.5 s + sheet.jpg, to check a take
node tools/demo-video/assemble.mjs tools/demo-video/cuts/tour.json    # tour.mp4 (also highlight.json, proof.json)
node --test tools/demo-video/lib/path.test.mjs             # self-check of the mouse and typing math
node tools/demo-video/data/make-data.mjs                   # re-make the prepared files from the sample
node tools/demo-video/data/round2/make-fraud.mjs           # the bank, transfers.csv, watchlist.csv
node tools/demo-video/data/round2/export-from-app.mjs      # alzheimer-network.gexf, by the app's own Export
```

## The recording build

Round 2 films a throwaway build, not this worktree's `graphty/dist`: `origin/master` with the
in-flight app fixes the video needs merged in, in the worktree `.worktrees/demo-video-rec-build`
(branch `demo-video/rec-build`, never pushed). `round2.json`'s `dist` points the recorder at it
(relative to the main checkout); `DEMO_DIST` overrides it, and the experiment list is read from the
checkout the build came from. Built 2026-11-20 from master 297f793668 with these merged:
`fix/9223-2d-edges` (2D edges vanish after a 2D/3D switch with cosmograph on),
`fix/9222-edges-follow-glide` (plain edges jump ahead of nodes during a layout glide),
`fix/9224-table-last-column` (the table's last column pushed far right),
`fix/9226-selection-hides-nodes-2d` (selecting a node in 2D hides nodes). To refresh it:

```bash
git -C .worktrees/demo-video-rec-build fetch origin
git -C .worktrees/demo-video-rec-build merge --no-edit origin/master origin/fix/<branch> ...
cd .worktrees/demo-video-rec-build && ../../tools/low-priority.sh pnpm install --frozen-lockfile \
  && ../../tools/low-priority.sh pnpm exec nx run graphty:build
```

Once those fixes are on master, a plain master build does the same job.

`record.mjs` and `assemble.mjs` run themselves inside a recording slot (a lock under
`tmp/demo-video/rec-slots`) and the machine's browser gate, on the NVIDIA card; they refuse to run
on a software renderer. One recording at a time is the default and the measured limit (below).

Knobs (environment): `DEMO_FEATURES_OFF=cosmograph,file-styles` leaves experiments off (to compare
a take with and without them), `DEMO_REC_SLOTS` recordings at once, `DEMO_FPS` (30), `DEMO_DIST`
another build, `DEMO_FFMPEG` another ffmpeg.

## Writing a clip

One file per clip: `tools/demo-video/clips/<NN-chapter>/<id>.mjs`, default-exporting. Round 2's
clips (tmp/demo-video/rework/script.md) live in `clips/r2-<n>-<chapter>/`; a round 1 clip whose id
round 2 reuses is replaced there, not kept beside it (ids are unique).

```js
export default {
    id: "find-groups", // unique; the output file name
    chapter: 2,
    caption: "Color accounts by community", // 3-7 words, one line, at most 42 characters
    tag: "Synthetic data", // optional small label at the caption band's right
    dataset: "Les Miserables", // optional: a Samples card opened before setup
    featuresOff: ["file-styles"], // optional: experiments left off for this clip (say why in a comment)
    async setup(h) {
        // NOT recorded: get to the starting state, park the cursor
        await h.app.mode("2D");
        await h.app.settled();
        await h.app.camera("Fit");
        await h.app.settled();
        await h.park({ x: 1040, y: 880 });
    },
    async run(h) {
        // recorded: one action, one result
        await h.click("Analyze");
        await h.click(h.page.getByRole("option", { name: "Louvain", exact: true }));
        await h.click(h.page.getByRole("button", { name: "Run Louvain" }));
        await h.waitFor(h.page.getByText("Color: Louvain"));
        await h.move({ x: 1460, y: 760, width: 120, height: 80 }); // hand off the result
    },
    holdMs: 2000, // optional hold on the result (default 2000, never under 1500)
};
```

Before `setup` the runner opens the app with every experiment on (`?features=` lists every id in
graphty-element/src/features/registry.ts), answers the usage question, closes its notice and opens
`dataset`. Recording starts after `setup`: a 0.8 s still lead-in, `run`, then the hold.

A **placeholder** clip has no `setup`/`run`; it renders a card of `seconds` (default 6) saying what
will go there. `assemble.mjs` refuses to put a placeholder (or a clip not recorded yet) into a
finished video: give the cut item a `skip` reason until real footage exists, or pass `--draft` to
build a review copy with the cards in. Use it for anything the app cannot do yet, anything filmed by hand (AR, VR, voice) and
anything that needs a secret (the Assistant needs a provider key; a script never reads one):

```js
export default {
    id: "desk-or-around",
    chapter: 5,
    caption: "Put it on your desk, or step inside it.",
    placeholder: "AR on a phone, then VR in a headset -- filmed by hand (placeholder)",
};
```

## The hand (`h`)

A target is a Playwright Locator, a button's exact accessible name, a box `{x, y, width, height}` or a
point `{x, y}`. It must already be on screen: the hand never scrolls by itself.

| Call                                            | Does                                                                                                                                                                                                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `h.move(target, {slow})`                        | curved Bezier path (long moves always bend; the path stays on screen), minimum-jerk speed, Fitts's-law time, lands at a random point in the target's inner half, sometimes overshoots and corrects                                                                                |
| `h.click(target, {button, dwell})`              | move, 140-260 ms dwell, 60-120 ms press, a ring at the press                                                                                                                                                                                                                      |
| `h.rightClick(target)`                          | the same with the right button (blue ring)                                                                                                                                                                                                                                        |
| `h.hover(target, ms = 900)`                     | move and rest; hover effects fire                                                                                                                                                                                                                                                 |
| `h.type(text)`                                  | 5.5 characters a second (66 wpm), log-normal, slower after spaces and before capitals; a 350-600 ms look before the first key and 300-500 ms after the last; no typos; refuses over 25 characters. Click the field first                                                          |
| `h.paste(text, {near})`                         | a Ctrl+V badge, then the text inserted at once (a web address, anything a person would not type)                                                                                                                                                                                  |
| `h.press(key)`                                  | one key, no badge (Enter, Escape)                                                                                                                                                                                                                                                 |
| `h.shortcut("Shift+T", {near, label})`          | the keys, with a key badge for about a second near the cursor or just above `near` (the button it stands for); `label` says what the key does ("Table")                                                                                                                           |
| `h.badge("5", {near, label})`                   | only the badge, no key: shown while the hand clicks the button the key stands for                                                                                                                                                                                                 |
| `h.drag(from, to, {slow})`                      | press, glide, release                                                                                                                                                                                                                                                             |
| `h.scroll(target, dy, {ms = 700})`              | eased wheel scroll over a target                                                                                                                                                                                                                                                  |
| `h.openFile(button, path, {folder, files})`     | the way to open a file on camera: click the app's real Open a file, then a drawn Open dialog (the folder, 4-6 named files with their kinds) where the hand picks the file and clicks Open; the real file chooser gets it. Up at least 2.5 s                                       |
| `h.dropFile(path, target, {folder, files, at})` | a drawn folder window at the left lists the files; the hand presses on the file and drags it over the app: a real browser drag (CDP `Input.dispatchDragEvent`), trusted drag events, a file chip by the cursor                                                                    |
| `h.chooseFile(target, path)`                    | click a control that opens the file chooser and choose the file, with no dialog drawn (prefer `h.openFile`)                                                                                                                                                                       |
| `h.pause(ms)`                                   | a deliberate human pause                                                                                                                                                                                                                                                          |
| `h.waitFor(locator)`                            | wait for something the app does on its own time (never a sleep)                                                                                                                                                                                                                   |
| `h.mark(name)`                                  | a named moment in the clip's json                                                                                                                                                                                                                                                 |
| `h.park(point)`                                 | put the cursor somewhere at once (setup only; off screen hides it)                                                                                                                                                                                                                |
| `h.file(name)`                                  | path of a file in `tools/demo-video/data`                                                                                                                                                                                                                                         |
| `h.app.*`                                       | helpers on this page (lib/app.mjs): `start()`, `openSample(name)`, `openFile(path)`, `ready2D()`, `layerEdges(layer, {color, width})`, `mode("2D")`, `camera("Fit")`, `settled(canvas?)`, `closeToast()`, `frames(n)`; `settled` takes unclipped captures, so it is safe in `run` |
| `h.page`, `h.random`                            | the Playwright page; the clip's seeded random source                                                                                                                                                                                                                              |

Randomness is seeded by the clip id, so a re-record moves the same way. The cursor, click ring, key
badge and file chip are drawn in the page (lib/overlay.mjs), above the app and invisible to its hit
testing and accessibility tree. The drawn Open dialog and folder window take the hand's real pointer
input (rows highlight and select under it) and keep it from the app beneath, as a real dialog would.

Why a drawn Open dialog, not a drag: round 1 dragged a file chip in from the screen edge and the
app's drop target whitened most of the screen, and viewers could not tell where the file came from.
The Open dialog starts from a button the viewer can find in the app, shows the folder and the file
names large enough to read, and the click on Open is the moment the file arrives. A drag is kept only
for the clip whose point is drag and drop, and it starts from a visible folder window.

Rules: `run` drives the app only with the hand: no `page.evaluate`, no private element state, no
synthetic events. `setup` may click straight through Playwright, still only through the app's UI.
Wait on conditions (`h.waitFor`, `h.app.settled`), never on a clock; pauses are only for pacing.

## Conventions

The numbers below come from tmp/demo-video/rework/research-craft.md ("Rules").

- One action and one result per clip, 4-10 s; `record.mjs` warns over 10 s. Hold at least 1.5 s on
  the result (5 s on a key moment), and move the hand off it before the hold.
- Captions: 3-7 words (at most 10), one line, at most 42 characters, in correct graph terms (nodes,
  edges, community, layout, path, layer; never "dots"); they name the goal or the finding. Check
  names and results against the take. `record.mjs` prints a CAPTION problem when one breaks a rule.
- A real em dash in every caption and card: write it as the escape `\u2014` (source files stay
  ASCII), never "--".
- A layout settles on screen once in the whole video. Every other clip starts on a drawing settled
  in `setup` (`h.app.ready2D()`: table closed, 2D, settled, Fit, one notch out); the app seeds every
  new project, so the drawing is the same on every take.
- Bank-data clips carry `tag: "Synthetic data"` and leave the file-styles experiment off (below).
- Check every take with `frames.mjs`: the cursor is visible and curves, the ring shows, the action
  and its result are on screen, no error dialog, and the clip's json lists no `problems`.

## Cuts

`cuts/*.json` lists the parts of a finished video:

```json
{
    "name": "tour",
    "crossfadeMs": 400,
    "music": null,
    "sections": [
        {
            "marker": "Find what matters",
            "chapter": { "number": 2, "title": "Find what matters", "seconds": 2 },
            "items": [
                { "clip": "find-groups", "seconds": 6 },
                { "card": "end", "seconds": 5, "big": "graphty.app", "lines": ["..."] }
            ]
        }
    ]
}
```

`marker` makes a chapter mark (mp4 chapters and the chapter list). `chapter` (`number`, `title`,
optional `sub`; no `number` for "And more") adds a card over the blurred first frame of the section.
Cards hold `1.0 s + 0.33 s a word + 0.8 s` at full opacity (a web address counts three words), with
the two crossfades on top: a chapter card at least 4 s, the title 4-5 s (it follows the cold open),
the end card 6 s; a chapter's `short: true` makes a 2 s mini card (the highlight's change of
domain); a card's `seconds` can only lengthen that. A `title` card's `laterLines` fade in `laterSec`
(1.5) after it appears. A clip's `seconds` trims it to its last `seconds` (the result and its whole hold); `from` starts it that many seconds in (with `seconds`, that long from there). A
clip shows its own caption (from its json, checked against the take); the cut's `caption` is used only
for a "not recorded yet" card in a `--draft` build.
`drop: [a, b]` cuts the stretch from `a` to `b` s out of the take first (a freeze the app made);
`dropMarks: ["opened", 0.8, "settled", 0]` does the same between two of the take's marks plus offsets
(a layout settling while the hand rests), so a re-take needs no new numbers; `drop` may also be a
list of spans.
An item with `skip: "<reason>"` is left out and the reason is printed.

Item kinds besides `clip`:

- cards: `title` (`lines`), `chapter`, `placeholder` (`text`, `caption`), `end` (`big`, `lines`, and `smallLines`: small print such as a developer line or a data credit, not counted in the hold);
- `{ "video": "~/ch9/x.webm", "caption", "seconds" }`: a file the app made (`~` is tmp/demo-video), framed like a clip;
- `{ "montage": [{ "clip": "find-groups", "sec": 0.3 }], "caption" }`: the outro: one result frame
  from each clip (`sec` before its end), at most four, 2.5 s each (`each`), joined by 500 ms
  crossfades, framed with one caption; never a push-in or a hard cut.

`music`: a path to an audio file, laid under the video and faded out at the end.

Each clip is framed at 80% (1536x864 at x 192, y 132) on the ink background, its caption in a band
above it (y 24-120, Inter 600 at 46 px, left-aligned with the stage, an optional `tag` at the right):
a player's scrubber and buttons cover the bottom 10% of the frame, so nothing that must be read is
there. Each crossfade is cut as its own short piece and the pieces are joined end to end, so memory
stays flat for a cut of any length.

Push-ins are gentle and rare: while the hand works in the app's panels and popovers (Locator
targets; a box or point is the canvas or a drawn window and never zoomed), the shot may push in at
most 1.5x (none under 1.3x), easing 1 s in and 1 s out in log scale, held at least 2.5 s, only for
a run of input on controls lasting 2.5 s (typing after a click on a field extends the run, so the
shot is in before the first key); at most one push-in a clip, at least 6 s of wide shot between two
(counted across clips and cards), and never in a clip's first or last 500 ms, so none crosses a cut.
A clip item takes `"zoom": false` (never) or `"zoom": "hold"` (stay pushed in to the end, for a
result shown in a panel), and `"zoomAfter": "<mark>"` to give no push-in to input before that `h.mark`
(the menu clicks that open a dialog, so the push-in frames the dialog). A `title` card takes `"over": { "clip": "<id>" }` to sit on that clip's
result frame. Every length and cut point is a whole number of frames, so chapter marks do not drift.
`cuts/round2-proof.json` is a small cut that shows all of it.

## How the page is filmed

`bench/capture-bench.mjs` measures each method on the same busy scene (College football opening in
3D, its layout settling, then a camera drag) at 1920x1080 on the NVIDIA card. Measured 2026-11-19:

| Method                                            | Frames delivered                     | Page's own rate | Notes                                                                                     |
| ------------------------------------------------- | ------------------------------------ | --------------- | ----------------------------------------------------------------------------------------- |
| CDP screencast (JPEG q80, headless shell)         | 28-31 fps, gaps p50 30 ms, p90 37 ms | 53-55 fps       | chosen; each frame put in the 30 fps slot nearest its own timestamp (lib/grid.mjs)        |
| CDP screencast, full Chromium                     | 22 fps, p90 59 ms                    | 42 fps          | slower on both sides                                                                      |
| getDisplayMedia + MediaRecorder (VP9, VP8, H.264) | 18-19 fps                            | 38-40 fps       | slows the app; stopping the capture track crashes headless Chromium 143's browser process |
| Playwright recordVideo                            | 25 fps file, 21 unique fps           | 54 fps          | VP8 at a low bitrate, soft                                                                |

So clips are 30 fps: the screencast cannot deliver 60 at 1920x1080. Deterministic frame stepping was
not tried: the app's layouts, workers and WebGPU run on real time, so stepping the page's clock
would film a different app. Two recordings at once lost 2-3 times more frames (and the page's own
frames got longer); three, more again. So `DEMO_REC_SLOTS` defaults to 1.

The frames are written as a numbered image sequence, one file per 30 fps slot, and encoded at
exactly 30 fps. An ffconcat list of JPEGs, the first way, is read through a 1/25 s time base and
dropped every sixth frame, so a moving cursor juddered five times a second in every clip. Each clip's
json has `slotsFilled`, the share of slots that got a new frame (a still screen sends none, so it is
below 1 even in a perfect take). Measured on find-groups: no repeated frame while the cursor moves fast, against 17% before.

The machine's own load matters as much: the same clip filmed at 18.7 fps with a load average of 75
from other work, and at 30-37 fps when quieter. `record.mjs` warns when the load is above the thread
count; check `capturedFps` in the clip's json and record again if it is under about 27.

## Prepared data

Round 2 (`data/round2/`, credits in its LICENSES.md):

| File                     | What                                                                                                                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fraud-network.json`     | synthetic bank, seed 2026: 623 nodes (499 accounts, 74 addresses, 50 devices), 1,752 edges; a 12-account ring at one Chicago address, 5 mules forwarding to a collector in Riga (`make-fraud.mjs`) |
| `transfers.csv`          | 77 of its transfers (from, to, amount, time): victims to mules, mules to the collector, the ring's circle and payouts; about 43 accounts                                                           |
| `watchlist.csv`          | 10 flagged accounts (account, risk, reason) to join onto that graph                                                                                                                                |
| `alzheimer-network.json` | real: Open Targets' Alzheimer's targets and STRING v12.5 links, 308 proteins, 1,160 edges (`make-alzheimer.mjs`)                                                                                   |
| `alzheimer-network.gexf` | the same, written by the app's Export > Data > GEXF after a seeded 2D layout, with positions (`export-from-app.mjs`)                                                                               |

`fetch-round2.mjs` writes the 50,000-account bank to tmp/demo-video/data. The flights and BioPlex
networks are the app's own Samples. Not made yet: `alzheimer-network.cys` (made by hand in Cytoscape;
until then the clip uses round 1's les-miserables.cys) and the saved `bank-case` and
`alzheimer-case` projects (made by the chapter 1 and 2 clips' own steps).

## Known app defects the clips work around

- file-styles experiment: a plain JSON file gets stray "Draw order", "Drawing", "Defaults",
  "Corners" layers and the legend opens on the draw order. Bank and Alzheimer clips set
  `featuresOff: ["file-styles"]`. Repro: open data/round2/fraud-network.json with every experiment on.
- The data table opens with every newly opened file and takes the lower half of the canvas;
  `ready2D` closes it.
- The app's shortest path from ACHE to APOE runs through APP (ACHE, APP, APOE), not BACE1.
- BioPlex 3.0 opens as a ball and runs Force (minutes, a hairball) although its file carries x and y;
  Layout > Keep positions keeps the ball and Data has no role for x and y. Chapter 5 lays it out with
  ForceAtlas2 in setup (`clips/r2-5-go-big/big.js`).
- A GEXF file with positions opens into a new Force layout; Layout > Keep positions, 2D, then shows the
  saved drawing (clip `drop-gephi` does this on camera).
- A Cytoscape session (.cys) opens with its nodes drawn tiny, a long notice listing each style "not kept"
  across the canvas, the table dock and a "Draw order" legend: `opens-looking-same` does not show
  styles kept.
- A 3D model shape (Shape > Model... > Person) is drawn far smaller than the sphere it replaces at the
  same size; `models-and-pictures` sets Size 6 after picking it.
- Rings by group defaults Group by to `name` even after Louvain has run.
- The Layout list holds 28 layouts; the start page's fact bar says 22.
- Picking a find box Values row ("Select where drugStage is Approved (16)") pans the camera toward
  the selection and leaves part of the network off the canvas; later Alzheimer setups Fit again
  (`fitWide` in clips/r2-2-alzheimer/alz.js).
- Quick actions > "Louvain" + Enter opens Analyze on Louvain but does not run it; a second Enter
  does nothing either, so the clip clicks Run.
- A re-run Shortest path reuses the "Shortest path" layer with its style and its eye: a layer hidden
  in setup stays hidden when the clip finds a new path, so a bold path cannot be prepared off camera.
- The app's notices close through a button named "Dismiss"; "Selection cleared" has no other close.
- Node labels draw in a serif font unless the label's Font is set; `labelLayer` sets Sans serif.
- Map layout lines nodes with no location up in a row along the bottom of the map (and says "N of M
  nodes unplaced") instead of leaving them out; the bank's devices now carry their owners' city.
- A drag of a file over the start page washes the whole page pale behind a small "Drop to open" card;
  file clips open files through the Open a file button and the drawn Open dialog instead.
- Switching 3D to 2D with the cosmograph experiment on lays the graph out again from a jumble (big
  nodes for about half a second) instead of flattening the 3D drawing (settle-2d shows it).

Round 1: `data/` holds files made by `make-data.mjs` from graphty/public/samples/les-miserables.gml with
graph-io: `les-miserables.gexf`, `.graphml`, `.dot`, `.cys` and `les-miserables-links.csv`
(character, linked_to, shared_chapters). `les-miserables-characters.csv` (name, first_volume) is
written by hand from the novel: check it before recording the join clip. The styled Cytoscape session
the plan names is made in Cytoscape, not here. Big datasets come from the app's own Samples.
