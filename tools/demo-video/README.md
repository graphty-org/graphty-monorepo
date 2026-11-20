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
tools/low-priority.sh pnpm exec nx run graphty:build      # the app the clips film (graphty/dist)
node tools/demo-video/record.mjs --list                    # every clip
node tools/demo-video/record.mjs --only find-groups        # record clips (--chapter 2, --all)
node tools/demo-video/frames.mjs find-groups               # a frame every 0.5 s + sheet.jpg, to check a take
node tools/demo-video/assemble.mjs tools/demo-video/cuts/tour.json    # tour.mp4 (also highlight.json, proof.json)
node --test tools/demo-video/lib/path.test.mjs             # self-check of the mouse and typing math
node tools/demo-video/data/make-data.mjs                   # re-make the prepared files from the sample
```

`record.mjs` and `assemble.mjs` run themselves inside a recording slot (a lock under
`tmp/demo-video/rec-slots`) and the machine's browser gate, on the NVIDIA card; they refuse to run
on a software renderer. One recording at a time is the default and the measured limit (below).

Knobs (environment): `DEMO_FEATURES_OFF=cosmograph,file-styles` leaves experiments off (to compare
a take with and without them), `DEMO_REC_SLOTS` recordings at once, `DEMO_FPS` (30), `DEMO_DIST`
another build, `DEMO_FFMPEG` another ffmpeg.

## Writing a clip

One file per clip: `tools/demo-video/clips/<NN-chapter>/<id>.mjs`, default-exporting:

```js
export default {
    id: "find-groups", // unique; the output file name
    chapter: 2,
    caption: "Find groups: characters who mostly link to each other.", // about ten words, plain
    small: "Louvain method, as in Gephi", // optional second, smaller line
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
will go there. Use it for anything the app cannot do yet, anything filmed by hand (AR, VR, voice) and
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

| Call                                   | Does                                                                                                                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `h.move(target, {slow})`               | curved Bezier path (long moves always bend; the path stays on screen), minimum-jerk speed, Fitts's-law time, lands at a random point in the target's inner half, sometimes overshoots and corrects            |
| `h.click(target, {button, dwell})`     | move, 140-260 ms dwell, 60-120 ms press, a ring at the press                                                                                                                                                  |
| `h.rightClick(target)`                 | the same with the right button (blue ring)                                                                                                                                                                    |
| `h.hover(target, ms = 900)`            | move and rest; hover effects fire                                                                                                                                                                             |
| `h.type(text)`                         | log-normal key delays around 9.5 characters a second, slower after spaces and before capitals; no typos. Click the field first                                                                                |
| `h.press(key)`                         | one key, no badge (Enter, Escape)                                                                                                                                                                             |
| `h.shortcut("Shift+T", {near, label})` | the keys, with a key badge for about a second near the cursor or just above `near` (the button it stands for); `label` says what the key does ("Table")                                                       |
| `h.badge("5", {near, label})`          | only the badge, no key: shown while the hand clicks the button the key stands for                                                                                                                             |
| `h.drag(from, to, {slow})`             | press, glide, release                                                                                                                                                                                         |
| `h.scroll(target, dy, {ms = 700})`     | eased wheel scroll over a target                                                                                                                                                                              |
| `h.dropFile(path, target)`             | a real browser drag of the file (CDP `Input.dispatchDragEvent`) in from the left edge (a hand on screen goes out there first), with a file chip by the cursor; trusted drag events                            |
| `h.chooseFile(target, path)`           | click a control that opens the file chooser and choose the file                                                                                                                                               |
| `h.pause(ms)`                          | a deliberate human pause                                                                                                                                                                                      |
| `h.waitFor(locator)`                   | wait for something the app does on its own time (never a sleep)                                                                                                                                               |
| `h.mark(name)`                         | a named moment in the clip's json                                                                                                                                                                             |
| `h.park(point)`                        | put the cursor somewhere at once (setup only; off screen hides it)                                                                                                                                            |
| `h.file(name)`                         | path of a file in `tools/demo-video/data`                                                                                                                                                                     |
| `h.app.*`                              | helpers on this page (lib/app.mjs): `start()`, `openSample(name)`, `mode("2D")`, `camera("Fit")`, `settled(canvas?)`, `closeToast()`, `frames(n)`; `settled` takes unclipped captures, so it is safe in `run` |
| `h.page`, `h.random`                   | the Playwright page; the clip's seeded random source                                                                                                                                                          |

Randomness is seeded by the clip id, so a re-record moves the same way. The cursor, click ring, key
badge and file chip are drawn in the page (lib/overlay.mjs), above the app and invisible to its hit
testing and accessibility tree.

Rules: `run` drives the app only with the hand: no `page.evaluate`, no private element state, no
synthetic events. `setup` may click straight through Playwright, still only through the app's UI.
Wait on conditions (`h.waitFor`, `h.app.settled`), never on a clock; pauses are only for pacing.

## Conventions

- One action and one result per clip, 4-8 s; `record.mjs` warns over 8 s. Hold at least 1.5 s on
  the result, and move the hand off it before the hold.
- Captions: about ten plain words for first-time users ("find groups", not "community detection");
  check names and results against the take before setting a caption that names one.
- Chapters 1-4 are filmed in 2D: set it in `setup`, then wait for `h.app.settled()` (2D lays the
  graph out again) and `h.app.camera("Fit")`.
- Plain ASCII in captions and cards: "--", straight quotes.
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

`marker` makes a chapter mark (mp4 chapters and the chapter list). `chapter` adds a 2 s card over the
blurred first frame of the section. A clip's `seconds` trims it to its last `seconds` (the result and its whole hold); `from` starts it that many seconds in (with `seconds`, that long from there). A
clip shows its own caption (from its json, checked against the take); the cut's `caption` is used only
while the clip is not recorded, when it becomes a "not recorded yet" card, so a cut always builds.
`drop: [a, b]` cuts the stretch from `a` to `b` s out of the take first (a freeze the app made).
An item with `skip: "<reason>"` is left out and the reason is printed.

Item kinds besides `clip`:

- cards: `title` (`lines`), `chapter`, `placeholder` (`text`, `caption`), `end` (`big`, `lines`);
- `{ "video": "~/ch9/x.webm", "caption", "seconds" }`: a file the app made (`~` is tmp/demo-video), framed like a clip;
- `{ "montage": [{ "clip": "find-groups", "sec": 0.3 }], "seconds": 6, "caption" }`: one result frame
  from each clip (`sec` before its end), in turn, framed with one caption (the outro).

`music`: a path to an audio file, laid under the video and faded out at the end.

Each clip is framed at 85% on the ink background with its caption in the band under it, so a caption
never covers the app (its toolbar and popovers are at the bottom). Each crossfade is cut as its own
short piece and the pieces are joined end to end, so memory stays flat for a cut of any length.
While the hand works in the app's panels and popovers, the shot pushes in on them (up to 1.8x) and
eases back out when the hand returns to the drawing: runs of moves to controls (Locator targets; a
box or point is the canvas) that fit together at 1.3x or more. The shot pans to a nearby run; for
one far across the screen it eases out and in again, and it stays out for a far run too short to
read, so the camera never sweeps across the drawing. A clip item takes `"zoom": false` (never)
or `"zoom": "hold"` (stay pushed in to the end, for a result shown in a panel). A `title` card takes
`"over": { "clip": "<id>" }` to sit on that clip's result frame. Every length and cut point is a
whole number of frames, so chapter marks do not drift.

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

`data/` holds files made by `make-data.mjs` from graphty/public/samples/les-miserables.gml with
graph-io: `les-miserables.gexf`, `.graphml`, `.dot`, `.cys` and `les-miserables-links.csv`
(character, linked_to, shared_chapters). `les-miserables-characters.csv` (name, first_volume) is
written by hand from the novel: check it before recording the join clip. The styled Cytoscape session
the plan names is made in Cytoscape, not here. Big datasets come from the app's own Samples.
