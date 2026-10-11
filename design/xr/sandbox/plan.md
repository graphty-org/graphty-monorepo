# XR technique sandbox: build plan

Status: plan, 2026-10-10. Nothing here is built yet.

This is the order of work for the XR technique sandbox described in [design.md](design.md): a
private workspace package, `xr-sandbox/`, that draws a graph in a plain Babylon.js scene and lets
the owner switch 13 VR control techniques on and off on Meta Quest 3 and Samsung Galaxy XR. The
design says what each piece is and why; this plan says who builds which files, in what order, and
how each piece is checked on an emulated headset before the owner puts a headset on.

The work runs in six milestones: prerequisites, the package skeleton, the framework, the dry-run
harness, the 13 techniques (in two waves), and the presets with the full dry run.

## 1. How the work is split so modules can be built in parallel

### 1.1 Who owns which files

| Owner                                 | Files                                                                                                                                                                                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The framework (one builder, serially) | Everything in `xr-sandbox/` that is not listed below: `package.json`, configs, `index.html`, `src/main.ts`, `src/core/`, `src/scene/`, `src/framework/`, `src/presets.ts`, `src/techniques/index.ts`, `test/*.test.ts`, `dryrun/run.mjs`, `dryrun/lib/`, `dryrun/checks/framework.mjs` |
| Each technique `<id>`                 | `xr-sandbox/src/techniques/<id>/**`, `xr-sandbox/test/techniques/<id>.test.ts`, `xr-sandbox/dryrun/checks/<id>.mjs`                                                                                                                                                                    |
| remote-logger fixes                   | `remote-logger/src/**` and its tests                                                                                                                                                                                                                                                   |

A technique builder edits only its own three paths. When it needs something from the framework (a
new UI factory, a missing hook, a bug), it stops and asks the framework builder, who makes the
change and hands back the commit. Nothing else is shared, so up to 13 technique builders can work
at once without touching the same file.

Three things make that hold:

- **Stubs first.** The framework milestone creates all 13 folders, each with an `index.ts` that
  exports a `Technique` with its real `id`, `name`, `color`, `needs` and `claims` (copied from the
  input map, design section 5.8) and an `unavailable: "not built yet"` reason. The registry
  (`src/techniques/index.ts`), the presets, the gear panel, the input map's unit test and the dry
  run's generic checks are therefore complete before any technique exists, and none of them
  changes when one lands. A builder replaces only the body of its stub; changing its claims or
  priority is a framework change.
- **Dependencies are added by the orchestrator, one at a time.** `package.json` and
  `pnpm-lock.yaml` are framework files. When a technique needs a package (`handy-work`,
  `fastest-levenshtein`, `double-metaphone`), the orchestrator runs `pnpm add` for it before that
  builder starts. Adding them all at the start would leave unused dependencies for knip to fail on.
- **Builders do not commit.** They share one worktree, so git is serialized: the orchestrator
  commits a module (signed, conventional, scope `xr-sandbox`) after its checks pass.

### 1.2 Pure logic moves into the technique folders

Design section 2.1 puts the chip parser, hint labels and hop stepping in `src/core/`. They are
each used by one technique only, so they move into that technique's folder (`voice/grammar.ts`,
`dense-picking/hint-strings.ts`, `pull-to-grow/hops.ts`) and are unit-tested from
`test/techniques/<id>.test.ts`. They stay free of Babylon so the Node test project can import them.

### 1.3 Seams the framework adds, because no technique may read another

The design forbids a technique from reading another technique's state (section 4.1), yet some
techniques hand work to others: the Figma toolbar and the palette hand the owner the sieve, notes
need text entry, two techniques supply a target. The framework owns a seam for each, with a
fallback when the providing technique is off:

| Seam                                          | Provided by                                | Used by                                             | When the provider is off                                                        |
| --------------------------------------------- | ------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| `ctx.tools` (offer, take, return)             | physical tools, dense picking              | Figma toolbar, palette Filter face, node menus      | The item is grayed with the reason "physical tools are off"                     |
| `ctx.text.request({ label })`                 | text entry                                 | node menus (note), Figma inspector, step-list notes | A row of canned chips ("check", "interesting", "?") so a note is still possible |
| `ctx.target.provide(hand, p)`                 | handling (held copy), dense picking (slab) | the targeting layer (design section 5.2)            | The plain ray                                                                   |
| `ctx.framework` actions                       | the framework                              | wrist menu, palette, Figma toolbar                  | Always present: open gear, recenter, flag, open steps, save                     |
| `core/node-facts.ts`                          | the framework                              | hover tag, probe, inspector, node menus             | Always present: label, every result's value and rank, formatted once            |
| `scene/speech.ts`, `scene/system-keyboard.ts` | the framework                              | voice, text entry                                   | Always present; each reports `unsupported` with a reason                        |

Two smaller additions to the design:

- `SettingSpec.kind` gains `"action"` (a button in the gear panel), for the gesture recorder and
  similar one-shot actions.
- Every undo button anywhere names its step ("Undo: Color by PageRank"), from the framework's one
  label formatter. The visible undo technique is what adds the toast beside the hand and the
  history strip; switching it off removes those, not the naming.

### 1.4 How the emulated checks drive the page

The page installs IWER itself when the URL has `emulate=<profile>` (design section 4.2), so the
device profiles live in page code (`src/framework/emulate/`), not under `dryrun/` as design
section 2.1 says. With `emulate` set, the page also exposes `window.__sandbox`: read-only state,
the log tail, the arbiter's last wins, mesh and observer counts, texture redraw counters, node
world positions, and the IWER device.

Checks follow one rule: **arrange through the hook, act through emulated input, assert through the
log and the hook.** A check may put the graph into a starting state with
`__sandbox.commands.run(...)`, but the act under test is always an IWER pose, pinch, trigger, grip,
stick or `animate_to`, so the arbiter, GUI picking and the technique run exactly as on a headset.

IWER 2.5 accepts named custom hand poses (`XRHandInputConfig.poses`). The profiles add `fist`,
`point`, `open-palm` and `thumbs-up`, converted from handy-work's shipped pose files by
`src/framework/emulate/hand-poses.ts`; palm up, palm sideways and palm toward the face are wrist
rotations, not finger poses. IWER does not emulate Quest microgestures or a transient pointer;
checks that need them inject the event through the hook and say so in the report as a weaker check.

## 2. Milestones

### Milestone 1: prerequisites

| Work                                                                                                                                                                       | Files                             | Done when                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| remote-logger: accept ports 9000 to 9999 (`MAX_PORT_NUMBER` in `src/server/dual-server.ts` is 9099); forward uncaught errors and unhandled rejections; flush on `pagehide` | `remote-logger/src/**`, its tests | Its test shard passes; `research/scripts/port-cap-check.mjs` passes; additive only (`fix(remote-logger)`) |
| File three graphty-element issues: the ignored `xr.input` options, no option to turn the element's XR navigation off, export `twoHandGestureDelta`                         | GitHub only                       | Three issues with type, priority and effort labels; their numbers go in the handling module's copy header |

These do not block the next milestone; the sandbox registers its own error listeners until the
remote-logger fix lands, with a comment naming the defect.

### Milestone 2: package skeleton and serving

Files: `xr-sandbox/package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`,
`vitest.config.ts`, `index.html`, `src/main.ts`, `src/framework/logging.ts`,
`src/scene/probe.ts`, `src/scene/frame-stats.ts`, `public/assets/` (mirrored controller profiles
and models, MRTK button models, the touch-orb material); `pnpm-workspace.yaml`, `knip.json`, one row
in the root `CLAUDE.md` package table.

Dependencies added now: `@babylonjs/core` (the workspace's 8.56.2), `@babylonjs/gui`,
`@babylonjs/loaders`, `@babylonjs/addons` (all exactly 8.56.2), `1eurofilter`, `iwer`, `@iwer/devui`,
and the workspace packages graph-samples, graph-format, layout, algorithms, remote-logger.

Done when:

- `pnpm exec nx run-many -t build lint test -p @graphty/xr-sandbox` passes, and knip passes.
- Three servers run under servherd as design section 2.3 shows: `xr-sandbox-logs`, `xr-sandbox`
  (`vite preview` over HTTPS, for headsets) and `xr-sandbox-dev`.
- The landing page loads over `https://dev.ato.ms:<port>/`, shows the session id and an Enter VR
  button, and a `probe` entry with every field reaches the log server through `/remote-log`.
- A headless load of the preview build makes no request outside its own origin.

### Milestone 3: the framework

Files (design sections 3 to 8):

| Path                                                                           | What                                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `src/core/state.ts`, `commands.ts`, `labels.ts`                                | Graph state, commands, history with `before` snapshots, previews, the one label formatter        |
| `src/core/arbiter.ts`, `input-map.ts`                                          | Channels, contexts, claims, priorities, the 350 ms arena, two-hand rule, stabilized press target |
| `src/core/url.ts`, `steps.ts`, `node-facts.ts`                                 | Preset and URL parsing, step lists and seeds, node facts                                         |
| `src/scene/engine.ts`, `xr.ts`                                                 | Engine, `WebXRDefaultExperience` per design section 10.2 (rules 9, 10, 15, 16, 19)               |
| `src/scene/graph-data.ts`, `graph-view.ts`                                     | Sample load, layout and every result at boot; thin-instance nodes and edges; own picking         |
| `src/scene/targeting.ts`, `poses.ts`, `filters.ts`                             | Target providers per hand with hysteresis; the hand pose layer; One Euro wrappers                |
| `src/scene/labels.ts`, `ui.ts`, `zones.ts`, `audio.ts`                         | Label pool; panel, button, chip, stepper factories; body-anchored zones; synthesized clicks      |
| `src/scene/speech.ts`, `system-keyboard.ts`                                    | Speech engine detection and Web Speech wrapper; Quest system keyboard bridge                     |
| `src/framework/technique.ts`, `registry.ts`, `context.ts`                      | The module contract, the disposal bag, the seams of section 1.3                                  |
| `src/framework/gear-panel.ts`, `badge.ts`                                      | The gear panel (Techniques, Framework, Input map tabs); owner badge, hover hints, arena ring     |
| `src/framework/steps-panel.ts`, `log-panel.ts`, `flag.ts`                      | Step list with ratings; in-headset log; Flag with the 10 s input ring buffer                     |
| `src/framework/emulate/`, `test-hooks.ts`                                      | IWER install and device profiles; `window.__sandbox`                                             |
| `src/techniques/index.ts`, `src/techniques/<id>/index.ts` x 13                 | The registry and the 13 stubs (section 1.1)                                                      |
| `src/presets.ts`                                                               | The presets of section 5                                                                         |
| `test/arbiter.test.ts`, `input-map.test.ts`, `commands.test.ts`, `url.test.ts` | Unit tests                                                                                       |

Done when the unit tests pass, including the input map test that pins the winner for tap, hold
still, pull, drag on empty graph, grip and two hands in `baseline`, `hands-first` and `everything`
(from the stubs' claims), and fails on two claims at one priority or a shadowed claim.

### Milestone 4: the dry-run harness, and a first look on the headsets

Files: `dryrun/run.mjs` (CLI: `--url`, `--out`, `--profiles`, `--presets`, `--only <check>`),
`dryrun/lib/driver.mjs` (aim at a node, pinch, trigger, grip, stick, poke a UI mesh, pose, move,
`animate_to`, hold still), `dryrun/lib/report.mjs`, `dryrun/checks/framework.mjs`, and a `dryrun`
script in `package.json`. The driver follows graphty-element's
`test/interactions/helpers/iwer-setup.ts` (which forces IWER over Chromium's own `navigator.xr`).

The run always goes through a browser slot, against the preview server:

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
  node xr-sandbox/dryrun/run.mjs --url https://dev.ato.ms:<port>/ --out /home/apowers/Projects/graphty-monorepo/tmp/xr-sandbox/dryrun
```

Done when every framework check of design section 11.2 passes on presets `empty` and `baseline`
(with stubs, `baseline` has only framework behavior) on all five profiles: starts cleanly, frame
time, still-head jitter, GUI textures idle, controllers select, hands select, gear panel reachable
by all four ways, logging end to end, probe, and the `galaxyxr-controllers` case (6 buttons, 4 axes)
with no per-frame error.

Then the optional five-minute check on each headset with `baseline` (design section 11.3): the
probe entry, the frame log, flicker with the gear panel open, multiview on and off. Its findings
can change choices the techniques build on (fill rate on Galaxy XR, GUI flicker, the palm gesture),
so wave 2 does not start before it has happened or the owner has said to skip it.

### Milestone 5: the techniques, in two waves

Each module is done when its own checks (section 3) and the standard checks (section 4) pass on
the profiles it names, its unit test passes, and lint and build pass. Each builder runs only its
own check file (`--only <id>`) plus the standard checks for its module, inside a browser slot; at
most four dry runs run at once because there are four slots.

- **Wave 1, needing only the framework:** hover tag, visible undo, wrist menu, handling, node
  menus, pull to grow, gestures. These seven can be built in parallel.
- **Wave 2, after the headset first look:** Figma-like menus, physical tools, palette, text entry,
  dense picking, voice. Text entry starts with its keyboard-poke spike and voice with its
  in-session test of the Web Speech API, because both may change their design. These six can be
  built in parallel; the seams of section 1.3 let Figma and the palette build before physical
  tools is done.

### Milestone 6: presets and the full dry run

The orchestrator runs the full matrix of section 6, fixes what fails (or sends it back to the
module's builder), restarts the `xr-sandbox` preview server, and gives the owner the landing page
URL with the session-id and Flag instructions. The owner's first full try on each headset follows.

## 3. The technique modules

Each module lists the library it builds on, its files (all under `xr-sandbox/`), its unit test
when it has pure logic, and its checks on an emulated headset. Values for the Florentine families
come from graphty's packages (research 6, section 2): the Medici rank first by PageRank (0.146)
with 6 neighbors at 1 hop and 5 more at 2 hops; the Strozzi rank third (0.088) with 4 and 4 more.
Profile names are those of design section 11.1. "Gaps" from design section 9 are recorded in each
module's `index.ts` header so they travel with the code.

### 3.1 `hover-tag` -- Hover name tag (wave 1)

- **Builds on:** the framework's targeting layer and label pool (billboard `DynamicTexture`; MSDF
  `TextRenderer` from `@babylonjs/addons` behind the framework's label toggle).
- **Files:** `src/techniques/hover-tag/index.ts`, `tag.ts`; `dryrun/checks/hover-tag.mjs`.
- **Checks** (`quest3-controllers`, `quest3-hands`, `galaxyxr-hands`):
    - Aimed at the Strozzi before any result is shown, the tag shows degree and its rank; after PageRank
      is shown (arranged), it reads exactly `Strozzi 0.088, #3`.
    - The tag's angular size is within 10% of the setting with the graph at 0.5 m and at 1.5 m.
    - Aim held for 60 frames: zero tag texture redraws after the first.
    - A seeded noisy hand aimed at the Strozzi: the tag's target changes at most once per second.
    - With hover marked unavailable (the transient pointer case, injected), the gear panel shows the
      technique unavailable with the reason.

### 3.2 `visible-undo` -- Visible undo (wave 1)

- **Builds on:** the framework's command history and label formatter; framework chips and toasts.
- **Files:** `src/techniques/visible-undo/index.ts`, `toast.ts`, `history-strip.ts`;
  `dryrun/checks/visible-undo.mjs`.
- **Checks** (`quest3-hands`, `quest3-controllers`):
    - A color-by-PageRank press (through the wrist menu or the arranged command) shows the toast
      `Colored by PageRank -- Undo` beside the acting hand, gone after 2 s.
    - Its own undo chip reads `Undo: Color by PageRank`; poking it logs `undo` and restores the
      state.
    - After five history commands, poking the third strip item leaves two steps in the history and a
      state equal to the state after the second.
    - Selections never appear in the strip or the toast.
    - The toast texture redraws once per history entry, not per frame.

### 3.3 `wrist-menu` -- Wrist or palm menu (wave 1)

- **Builds on:** Babylon GUI `HandMenu` and `HandConstraintBehavior` (playground `#24DLJ4#7`); for
  controllers, the same menu parented to the off controller's grip.
- **Files:** `src/techniques/wrist-menu/index.ts`, `controller-variant.ts`;
  `dryrun/checks/wrist-menu.mjs`.
- **Checks:**
    - `quest3-hands`: off-hand palm sideways toward the body with the head looking at it shows the
      menu within 200 ms; palm up or palm toward the face hides it.
    - A poke on Undo by the other index fingertip logs `undo`; a pinch of the menu hand does nothing
      on the menu.
    - Settings opens the gear panel; Flag logs a `flag` entry; Recenter re-places the graph.
    - Held UI lag: the wrist moved with `animate_to`, the menu matches the wrist joint pose of the
      same frame within 1 mm.
    - `quest3-controllers` and `galaxyxr-no-hands`: the off grip turned toward the face shows the
      controller variant; a ray press on Undo works.

### 3.4 `handling` -- Handling the graph (wave 1)

- **Builds on:** Babylon `SixDofDragBehavior` on an invisible grab volume, `WebXRNearInteraction`
  with `isNearGrabbable`, `allowMultiPointer`, `HandConstraintBehavior` for the held copy,
  `1eurofilter`, and graphty-element's `twoHandGestureDelta`, copied with a header naming its source
  file and the graphty-element issue that asks for it to be exported.
- **Files:** `src/techniques/handling/index.ts`, `grab.ts`, `two-hand.ts`,
  `two-hand-gesture-delta.ts`, `held-copy.ts`; `test/techniques/handling.test.ts` (scale clamp at
  0.2x and 5x, pivot at the hands' midpoint, no feedback of scale into its own measurement);
  `dryrun/checks/handling.mjs`.
- **Checks:**
    - `quest3-controllers`: grip in graph space, move 10 cm and turn 30 degrees, release: the root
      moved 10 cm and turned 30 degrees (within 1 mm and 1 degree) and then does not drift for 60
      frames. The camera's parent never moves.
    - `quest3-hands`: the same with the fist pose from the pose layer.
    - Two hands moved apart to twice their distance: scale 2x within 2%; to ten times: clamped at 5x.
      Both settings (Babylon's stock two-hand and ours) run without error.
    - Two still hands holding the graph: the root's transform stays within the jitter tolerance.
    - Held copy on, off-hand palm up: the copy sits in the palm; a ray on the Medici's copy gives a
      hover of the Medici in the full graph, and a tap selects the Medici.

### 3.5 `node-menus` -- Node and empty-space menus (wave 1)

- **Builds on:** Babylon GUI 3D `CylinderPanel` of `HolographicButton`s for the list style; the
  ring style written fresh, with Open Brush's `PinCushion.cs` (Apache-2.0) as the reference only.
- **Files:** `src/techniques/node-menus/index.ts`, `ring.ts`, `list.ts`, `verbs.ts`;
  `test/techniques/node-menus.test.ts` (wrist angle to ring item, dead zone);
  `dryrun/checks/node-menus.mjs`.
- **Checks:**
    - `quest3-hands`: a pinch on the Medici held still for 350 ms opens the menu, and `arbiter.win`
      names node menus. A quick tap selects the Medici and opens no menu.
    - Ring style: turning the wrist 40 degrees moves the highlight to the expected item; release
      logs that verb's command (for Neighbors: `neighbors` Medici, 1 hop).
    - List style: a ray press on Probe logs `probe` for the Medici.
    - Held still on empty space: the graph verbs menu opens.
    - `quest3-controllers`: pointing at the Medici and pressing B opens the menu at once.
    - Note uses `ctx.text`: with text entry off, the canned chips appear and a note is logged.

### 3.6 `pull-to-grow` -- Pull to grow a neighborhood (wave 1)

- **Builds on:** `breadthFirstSearch(s, i, { maxDepth })` from `@graphty/algorithms`, run once at
  the pinch; `1eurofilter` on the pull distance; the framework's preview.
- **Files:** `src/techniques/pull-to-grow/index.ts`, `hops.ts` (pure: distance to hops, 6 cm dead
  zone, 8 cm per hop, 2 cm hysteresis), `readout.ts`; `test/techniques/pull-to-grow.test.ts`;
  `dryrun/checks/pull-to-grow.mjs`.
- **Checks** (`quest3-hands`, `quest3-controllers`, `galaxyxr-hands`):
    - A pinch on the Medici pulled 10 cm within 150 ms: `arbiter.win` names pull to grow, with node
      menus among the losers.
    - The readout says `1 hop: 6` between 6 and 14 cm and `2 hops: +5` beyond.
    - The hand oscillating 1.5 cm across a boundary: the readout does not change.
    - Release at 2 hops: `neighbors` Medici, 2 hops, and a selection of 12 nodes. Release after
      pulling back inside the dead zone: a `cancel`, and no tint left on any node.
    - Readout redraws equal the number of hop changes.

### 3.7 `gestures` -- Hand poses and motions (wave 1)

- **Builds on:** `handy-work` (MIT; unmaintained, so a fix means a fork) for pose recognition;
  Quest thumb microgestures through Babylon, as design section 9.1 names; the framework's pose
  layer for fist and palm poses.
- **Files:** `src/techniques/gestures/index.ts`, `recognizer.ts` (handy-work adapter with
  hysteresis, a 150 ms minimum hold and suppression while pinching or holding), `bindings.ts`,
  `recorder.ts`, `poses/`; `test/techniques/gestures.test.ts` (hysteresis and minimum hold on
  synthetic distance streams); `dryrun/checks/gestures.mjs`.
- **Checks** (`quest3-hands`; IWER custom poses):
    - Thumbs up held 300 ms: exactly one pose event and one bound command, not repeated while held.
    - Held 100 ms: nothing. Flickering between thumbs up and the default pose every two frames:
      nothing. Thumbs up while pinching: nothing.
    - A binding that needs a palm-toward-face or palm-forward pinch is refused at load, with the
      reason logged.
    - The recorder action logs a pose entry with 25 joints.
    - A microgesture swipe (injected, weaker) runs its binding; on `galaxyxr-hands` the microgesture
      bindings show as unavailable.

### 3.8 `figma-menus` -- Figma-like menus (wave 2)

- **Builds on:** Babylon GUI 3D `NearMenu`, `HolographicSlate` and its gizmo, `FollowBehavior`,
  and 2D GUI on meshes (playgrounds `#24DLJ4#7`, `#43YQHC#2`).
- **Files:** `src/techniques/figma-menus/index.ts`, `toolbar.ts`, `layer-list.ts`,
  `inspector.ts`, `popover.ts`; `dryrun/checks/figma-menus.mjs`.
- **Checks** (`quest3-controllers`, `quest3-hands`):
    - Toolbar below the graph, layer list to the left, inspector to the right; no bounds overlap
      each other or a framework zone.
    - A ray press on Show PageRank logs `run`; the layer list gains a PageRank row; its remove
      button logs a history command.
    - A tap on the Medici: the inspector shows the Medici's facts and a popover of three to five
      verbs appears beside it; clearing the selection removes the popover.
    - The toolbar's Sieve puts the sieve in the hand when physical tools is on, and is grayed with
      the reason when it is off.
    - Dragging the inspector's bar 20 cm moves it 20 cm (the slate gizmo bug once seen on Quest).
    - Panel textures are at most 768 px; with still input none redraws for 60 frames.

### 3.9 `physical-tools` -- The sieve and the probe (wave 2)

- **Builds on:** Babylon `SixDofDragBehavior` for holding, `Slider3D` for the threshold, the
  framework's preview; registers both tools with `ctx.tools`.
- **Files:** `src/techniques/physical-tools/index.ts`, `rack.ts`, `sieve.ts`, `probe.ts`,
  `card.ts`; `dryrun/checks/physical-tools.mjs`.
- **Checks** (`quest3-controllers`, `quest3-hands`):
    - The sieve taken from the rack is held; set to PageRank 0.070 it reads `keeps 5 of 15` and the
      other 10 nodes are dimmed by color and scale, with every graph material's alpha still 1.
    - A pinch on the handle logs `filter` labeled `Keep PageRank at least 0.070 (5 of 15)`. Put
      back on the rack instead: a `cancel` and no tint left.
    - The probe touching the Medici (near) shows a card with degree 6, PageRank 0.146 and rank 1,
      and community; pointed at empty space it shows the current result's range and top three.
      Readings log `probe` and stay out of the history.

### 3.10 `palette` -- The palette tool (wave 2)

- **Builds on:** Babylon `SixDofDragBehavior` for tear-off, 2D GUI on near-pickable planes,
  `TouchHolographicButton`, `HolographicSlate` for torn-off cards; Open Brush `PanelManager.cs`
  (Apache-2.0) as the behavior reference, not ported.
- **Files:** `src/techniques/palette/index.ts`, `prism.ts`, `faces/` (one file per face:
  analyze, style, filter, selection, history), `tear-off.ts`; `dryrun/checks/palette.mjs`.
- **Checks:**
    - `quest3-controllers`: the palette sits above the off controller; one flick of the off stick
      turns exactly one face. Held UI lag under `animate_to`: within 1 mm in the same frame.
    - A poke on Color by PageRank on the Style face logs `colorBy`.
    - Tearing the Style card off 30 cm leaves it world-locked; dropped within 10 cm while facing its
      face, it snaps back.
    - The palette and the held copy are never visible together.
    - The Filter face hands over the sieve through `ctx.tools`, grayed when physical tools is off.
    - `quest3-hands`: the palette rides the back of the off hand; `galaxyxr-hands`: a pinch-drag on
      the rim turns a face.

### 3.11 `text-entry` -- In-scene keyboard and dictation (wave 2)

- **Builds on:** Babylon GUI `VirtualKeyboard` connected to an `InputText` on a near-pickable
  plane, with `disableMobilePrompt = true`; Quest's system keyboard through
  `scene/system-keyboard.ts`; dictation through `scene/speech.ts`. Provides `ctx.text`.
- **Spike first:** does a fingertip poke on the `VirtualKeyboard` reach the right key in IWER? If
  not, the keyboard becomes a grid of `TouchHolographicButton` keys, and the gap is recorded.
- **Files:** `src/techniques/text-entry/index.ts`, `keyboard.ts`, `dictation-key.ts`;
  `dryrun/checks/text-entry.mjs`.
- **Checks** (`quest3-hands`, `galaxyxr-hands`):
    - A note request on the Medici opens the keyboard about 40 cm from the hand, below the line of
      sight. Pokes on c, a, t and Enter log `note` on the Medici with the text `cat`.
    - `window.prompt` is never called (the check replaces it with one that fails the run).
    - Every key is at least 2 cm wide.
    - The dictation key with a stub recognizer that returns "three word note" appends it to the
      field.
    - `quest3-hands` with the system keyboard reported as supported: the hidden input is focused
      inside the `select` event and its value is appended, not replaced.

### 3.12 `dense-picking` -- Hint tags and the slab (wave 2)

- **Builds on:** Vimium's `hintStrings` (MIT, copied with its license header); the slab after the
  Slicing-Volume technique (IEEE VR 2020, no code). The slab is a `ctx.target` provider and a
  `ctx.tools` tool.
- **Files:** `src/techniques/dense-picking/index.ts`, `hint-strings.ts`, `hints.ts`,
  `mini-keyboard.ts`, `slab.ts`; `test/techniques/dense-picking.test.ts` (tags prefix-free, the
  voice-safe alphabet without b, d, e, p, t, v); `dryrun/checks/dense-picking.mjs`.
- **Checks** (`graph=dense&n=480&seed=7`, `quest3-hands` and `quest3-controllers`):
    - Hint tags appear for exactly the nodes in the ray's cone, two letters each, prefix-free.
    - Typing the beacon node's tag on the mini keyboard logs `select` for the beacon node.
    - The slab pushed into the graph: the nodes within half its thickness are drawn on the plate,
      the rest dimmed; a ray on the plate at a node gives that node as the hover, and a tap selects
      it in the full graph.
    - With `n=2000`, no frame's JavaScript exceeds 50 ms while tags and the slab are active.

### 3.13 `voice` -- Voice with an editable chip sentence (wave 2)

- **Builds on:** the Web Speech API on Galaxy XR and the Quest system keyboard's dictation key,
  both through `scene/speech.ts`; `fastest-levenshtein` and `double-metaphone` (MIT) for misheard
  words; the start and end reasons of graphty-element's `VoiceInputAdapter`.
- **First test:** whether starting recognition blurs or ends the immersive session. Only the Galaxy
  XR can answer it, so it is the first thing on the owner's list for that headset; the emulated run
  checks only that every start and end is logged with its reason.
- **Files:** `src/techniques/voice/index.ts`, `grammar.ts` (pure slot grammar), `matcher.ts`
  (pure), `chips.ts`, `engine.ts`; `test/techniques/voice.test.ts` (about 30 sentences, misheard
  ones included, such as "colour these by page rank"); `dryrun/checks/voice.mjs`.
- **Checks** (`galaxyxr-controllers` with a stub recognizer, `quest3-hands`):
    - Holding X starts the engine; interim words show as gray chips, final ones solid.
    - With the Medici selected, "color these by PageRank" becomes the chips color, these, by,
      PageRank and Run. Poking PageRank offers three alternatives, then the slot's vocabulary;
      choosing Degree and poking Run logs `colorBy` degree with technique `voice`.
    - An unparsed word shows a red `?` chip.
    - The same command built by poking alone, verb first, logs the same `colorBy`.
    - Unarmed (no microphone on the landing page), its switch is grayed with the reason.

## 4. Standard checks for every technique

Run by `dryrun/checks/framework.mjs` from the registry, so a technique gets them with no code of
its own beyond its `smoke` step:

- **On and off:** inside the session, switch it on, confirm its meshes are in the active-mesh list
  and drawn, make its `smoke` press, switch it off. No error; no frame's JavaScript over 50 ms
  during either toggle; observer and mesh counts return to what they were.
- **Off while pressed** (for each technique with a press claim): switch it off while it owns a
  press. Its preview is cancelled, the capture is released as `cancel`, and no tint or transform
  is left.
- **Still-head jitter and idle textures** with the technique on and `still=1`.
- **The `everything` preset:** each technique's smoke press in turn with all 13 on; the winners
  match the input map's unit test.

## 5. The presets

`src/presets.ts` holds the named presets; the landing page also generates one "solo" link per
technique (`preset=empty&on=<id>`), so each technique can be tried alone without a preset of its
own. Pairs differ in one technique, so a difference the owner feels belongs to that technique.

| Preset             | Graph      | Techniques                                                                        | Question it serves                                   |
| ------------------ | ---------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `empty`            | Florentine | none                                                                              | Switch techniques on in the headset                  |
| `baseline`         | Florentine | hover-tag, node-menus (list), wrist-menu, visible-undo                            | The control every other preset is compared with      |
| `baseline-pull`    | Florentine | `baseline` + pull-to-grow                                                         | Getting a neighborhood: pull against the menu        |
| `baseline-palette` | Florentine | `baseline` + palette                                                              | Color by: palette against the menus                  |
| `baseline-figma`   | Florentine | `baseline` + figma-menus                                                          | Color by: desktop-style panels against the menus     |
| `baseline-voice`   | Florentine | `baseline` + voice                                                                | Neighborhood and color by: voice against the menus   |
| `hands-first`      | Florentine | gestures, pull-to-grow, handling, hover-tag, wrist-menu, visible-undo             | Bare hands, few panels                               |
| `palette`          | Florentine | palette, physical-tools, hover-tag, handling, visible-undo                        | A Tilt Brush-style off-hand palette                  |
| `figma`            | Florentine | figma-menus, node-menus, hover-tag, text-entry, visible-undo                      | Desktop-style panels in space; keyboard vs dictation |
| `voice`            | Florentine | voice, text-entry, hover-tag, wrist-menu, visible-undo                            | Speech with the chip sentence                        |
| `dense`            | dense, 480 | dense-picking (hint tags and slab), handling, hover-tag, node-menus, visible-undo | Picking in a crowded graph, both aids                |
| `dense-hints`      | dense, 480 | `dense` with the slab switched off                                                | Picking with hint tags alone                         |
| `dense-slab`       | dense, 480 | `dense` with hint tags switched off                                               | Picking with the slab alone                          |
| `everything`       | Florentine | all 13                                                                            | The arbitration stress test                          |

`dense-hints` and `dense-slab` are added to the design's list so the picking comparison needs no
setting changed in the headset; they are the `dense` preset with one dense-picking sub-toggle
off. The design's preset example spells visible undo as `undo`; its id is `visible-undo`.

## 6. The full dry run

| Profile                                  | Presets                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| `quest3-controllers`, `quest3-hands`     | every preset                                                                      |
| `galaxyxr-hands`, `galaxyxr-controllers` | `baseline`, `hands-first`, `figma`, `voice`, `dense`, `everything`                |
| `galaxyxr-no-hands`                      | `baseline`, `everything` (hand-joint techniques show unavailable with the reason) |

Each preset and profile runs the framework checks, the standard checks for its techniques and
each technique's own check file. The report (`report.json`, plus one screenshot per profile and
preset) goes to `/home/apowers/Projects/graphty-monorepo/tmp/xr-sandbox/dryrun/`, and the script
exits non-zero on any failure. A run that passes everything is the gate for giving the owner the
URL; the things only a headset can show (design section 11.3) are listed for the owner beside it.

## 7. Risks checked first

| Risk                                                                           | Where it is checked first                 | If it fails                                                                          |
| ------------------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| A press on Galaxy XR controllers reads a missing button and errors every frame | Milestone 4, `galaxyxr-controllers`       | Guard every gamepad index and `pulse` call in the framework                          |
| GUI flicker on Quest 3 with multiview                                          | Milestone 4 headset look                  | Multiview stays off (already the default)                                            |
| Galaxy XR fill rate at 3552 x 3840 per eye                                     | Milestone 4 headset look, the probe entry | Framebuffer scale 0.8 by default on Galaxy XR                                        |
| A fingertip poke cannot reach `VirtualKeyboard` keys                           | Text entry spike, wave 2                  | A `TouchHolographicButton` key grid                                                  |
| Starting speech recognition blurs the session on Galaxy XR                     | The owner's first Galaxy XR try           | Speech is marked unavailable on Galaxy XR with the reason; chips are built by poking |
| handy-work's shipped poses do not fit the owner's hand                         | The owner's first Quest try               | The recorder makes templates from the owner's hand                                   |
