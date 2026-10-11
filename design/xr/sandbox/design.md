# XR technique sandbox: design

Status: design, 2026-10-10. Nothing here is built yet.

The XR technique sandbox is a playground for trying VR control techniques on a graph and forming
opinions about them. It is not a product design and not graphty-element's XR mode. It runs on the
two headsets the owner has -- Meta Quest 3 (Quest Browser) and Samsung Galaxy XR (Chrome on
Android XR) -- with hands and with controllers. Every technique can be switched on and off, so
techniques can be mixed and compared, and named presets open the sandbox with a chosen mix.

The library survey behind every choice below is in [research/](research/):

| File                                                                                        | What it covers                                                                                                                                |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [babylon-webxr-and-gui.md](research/babylon-webxr-and-gui.md)                               | Babylon.js hand tracking, near interaction, pointer selection, GUI 3D controls, VirtualKeyboard, mesh behaviors, known bugs, playground index |
| [gestures-pull-and-handling.md](research/gestures-pull-and-handling.md)                     | Hand pose and motion recognizers, pinch-and-pull, two-hand grab, the held copy, the One Euro filter                                           |
| [menus-and-dense-picking.md](research/menus-and-dense-picking.md)                           | Open Brush palette and radial menu, marking menus, hint tags, RayCursor, slab selection                                                       |
| [voice-and-text-entry.md](research/voice-and-text-entry.md)                                 | Speech-to-text engines per headset, the chip parser, virtual and system keyboards                                                             |
| [headsets-jitter-and-performance.md](research/headsets-jitter-and-performance.md)           | What each headset exposes, the causes of jitter, frame budgets, IWER emulation                                                                |
| [graphty-packages-logging-and-dry-run.md](research/graphty-packages-logging-and-dry-run.md) | graphty's own packages for data and algorithms, the rendering choice, remote-logger, the dry run                                              |

The survey files use "research 1" to "research 6" in the order of this table.

## 1. Decisions at a glance

- **A private workspace package, `xr-sandbox/` (`@graphty/xr-sandbox`)**, built with Vite. The
  headsets open a production build served by `vite preview` over HTTPS through servherd; the Vite
  dev server is for the desktop and emulated runs only, because a hot reload ends an immersive
  session.
- **A plain Babylon.js scene, not graphty-element.** graphty-element's XR input cannot be switched
  off today, and every technique here is input handling. The data, layout and algorithms come
  from graphty's packages (graph-samples, graph-format, layout, algorithms).
- **Every technique is a module** with a declared set of inputs it claims, the objects it reacts
  to, the commands it issues and its own settings. Every module is prepared (built hidden, its
  materials compiled) at boot, so switching one on in the headset only shows it. A preset is a
  list of modules plus settings; a URL can add or remove modules from a preset.
- **One targeting layer** decides, per hand, which node the hand is on (the plain ray by default,
  or the held copy or the slab), and **one input arbiter** gives each pinch, trigger, grip or
  gesture to exactly one technique, by what is under the hand and by a fixed priority, and shows
  the owner on the hand. The full input map is one table (section 5.8), also readable in the
  headset.
- **One command layer** (select, neighbors, show a result, color by, size by, filter, hide, note,
  undo, save) that every technique drives, so techniques are comparable and undo names its step.
- **A step list** walks the Florentine families journey and a few short drills, one question each.
  The owner presses Done or Skip; times, an optional one-poke ease rating and the owner's Flag
  marks go to the remote log.
- **Remote logging is always on**, with a session id shown in the page and in the headset.
- **A dry run in headless Chromium on IWER** (Meta's Immersive Web Emulation Runtime), emulating
  Quest 3 and a Galaxy XR-like device with hands and controllers, before the owner puts a headset
  on.

## 2. Where it lives and how it is served

### 2.1 Directory and package

```
xr-sandbox/
  package.json          @graphty/xr-sandbox, "private": true, version 0.0.0
  vite.config.ts        HTTPS, PORT, /remote-log proxy (dev and preview), hmr off
  index.html            landing page: presets, session id, session mode, arming, Enter VR
  eslint.config.js      extends the root config
  tsconfig.json
  vitest.config.ts      Node project over src/core only
  src/
    main.ts             boot: read the URL, build the scene, start logging, prepare modules
    core/               pure TypeScript, no Babylon: arbiter, input map, commands and history,
                        graph state, presets and URL parsing, step lists, chip parser, hint
                        labels, hop stepping
    scene/              Babylon: engine and XR setup, the graph view, the targeting layer, the
                        hand pose layer, labels, UI helpers, frame statistics, the capability
                        probe
    framework/          the module registry, the technique context, the gear panel, the owner
                        badge and hover hints, the step-list panel, the in-headset log panel,
                        Flag, audio clicks, logging
    techniques/         one folder per technique (13), each exporting one module
    presets.ts          the named presets
  test/                 unit tests of the arbiter, the input map, hop stepping and the chip parser
  dryrun/               the Playwright + IWER dry-run script and device profiles
  public/assets/        mirrored Babylon assets (MRTK button models, touch-orb material, the
                        controller models and profile JSON)
```

Why a workspace package rather than a folder under `tmp/` or a Storybook: it imports graphty's
packages through the workspace like any consumer, so it keeps compiling as those packages change,
and the build and lint gates tell us the day it breaks. A Storybook would pull it into visual
review and Chromatic, which is the wrong gate for a playground nobody reviews pixel by pixel.

### 2.2 How it joins the monorepo, and what it stays out of

The sandbox joins the build and lint gates and nothing more. CI, coverage and release work are
added only if the sandbox outlives its first round of opinions.

| System                        | What the sandbox does                                                                                                                                          | Why                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| pnpm                          | Add `xr-sandbox` to `pnpm-workspace.yaml`                                                                                                                      | Workspace links to graph-samples, graph-format, layout, algorithms, remote-logger                         |
| nx                            | Project inferred from `package.json` scripts: `build` (`vite build` plus `tsc --noEmit`), `lint` (`eslint && tsc --noEmit`), `test` (vitest, Node)             | `nx run-many -t build lint test` covers it with no special case                                           |
| nx release                    | Nothing: `"private": true`, versioned and never published, as the private graphty app is. `nx.json`'s release config is not touched                            | The release train every package uses stays as it is                                                       |
| ESLint                        | `xr-sandbox/eslint.config.js` extends the root config                                                                                                          | Same rules as everything else; no new exceptions                                                          |
| knip                          | A workspace entry: `entry: ["src/main.ts!", "test/**/*.test.ts", "dryrun/**/*.{ts,mjs}"]`, `project: ["src/**/*.ts!", "test/**/*.ts", "dryrun/**/*.{ts,mjs}"]` | The pre-push gate runs knip over every workspace package; without an entry it would fail                  |
| Tests                         | Unit tests where logic needs them: the arbiter and its input map, hop stepping, the chip parser. No CI shard in `tools/ci-test-matrix.mjs`, no coverage gate   | A playground; scene and technique code is checked by the dry run, where a unit test would only test mocks |
| Merged coverage and Coveralls | Not added                                                                                                                                                      | Not a shipped package                                                                                     |
| Visual review and Chromatic   | Nothing to do: the sandbox has no Storybook, and `visual-review.config.json` lists its projects explicitly                                                     | Images of a headset scene in SwiftShader say little; the dry run checks stability numerically             |
| The dry run                   | A local script (`pnpm --filter @graphty/xr-sandbox run dryrun`), not a CI shard                                                                                | A check before the owner tries a build                                                                    |
| SonarQube                     | Stays in scope (changed lines on push)                                                                                                                         | No reason to exempt it                                                                                    |
| CLAUDE.md                     | One row in the package table                                                                                                                                   | So other sessions know what it is                                                                         |

### 2.3 Serving it to the headsets

WebXR needs a secure context, and the headsets reach this machine over the LAN, so the sandbox
is served over HTTPS with servherd's certificate (a Let's Encrypt `*.ato.ms` chain that both
headsets trust while `dev.ato.ms` resolves to this machine).

A hot reload, or Vite's "new dependencies optimized, reloading", ends the immersive session. With
the dev server that happens on the first dynamic import of a lazily loaded module and on any file
an agent saves while the owner is in the headset. So the headsets never use the dev server:

```jsonc
// 1. The log server: HTTP on localhost only. The page reaches it through the Vite proxy, so it
//    never talks to the log server directly and the log server needs no certificate.
servherd_start({ name: "xr-sandbox-logs", cwd: "<worktree>/remote-logger",
  command: "node bin/remote-log-server.js --http-only --host 127.0.0.1 --port {{port}}" })

// 2. For the headsets: a production build served by `vite preview` (`npm run serve` runs
//    `vite build && vite preview`). A new build reaches the headset only when this server is
//    restarted and the owner reloads.
servherd_start({ name: "xr-sandbox", cwd: "<worktree>/xr-sandbox", protocol: "https",
  command: "env HTTPS_CERT_PATH={{httpsCert}} HTTPS_KEY_PATH={{httpsKey}} npm run serve",
  env: { PORT: "{{port}}", HOST: "{{hostname}}", REMOTE_LOG_TARGET: "http://127.0.0.1:<log port>" } })

// 3. For desktop and emulated runs only (the dry run may use either): the dev server.
servherd_start({ name: "xr-sandbox-dev", cwd: "<worktree>/xr-sandbox", protocol: "https",
  command: "env HTTPS_CERT_PATH={{httpsCert}} HTTPS_KEY_PATH={{httpsKey}} npm run dev",
  env: { PORT: "{{port}}", HOST: "{{hostname}}", REMOTE_LOG_TARGET: "http://127.0.0.1:<log port>" } })
```

`vite.config.ts`:

- `server.https` and `preview.https` from `HTTPS_CERT_PATH` / `HTTPS_KEY_PATH`; `--port
${PORT:?...} --strictPort` in the `dev` and `serve` scripts, as every other server in the
  repository does.
- `server.proxy` and `preview.proxy` map `/remote-log` to `REMOTE_LOG_TARGET`, so the page posts
  logs to its own origin: one URL, one certificate, no CORS.
- `server.hmr: false`, and every dependency, including each lazily imported one, listed in
  `optimizeDeps.include`, so even the dev server never reloads on its own.
- `remoteLoggerPlugin()` from `@graphty/remote-logger/vite`, which stamps the worktree name on
  every log entry.

The owner opens `https://dev.ato.ms:<port>/` in Quest Browser or Chrome on Galaxy XR. If the
router's DNS-rebinding protection blocks `dev.ato.ms` from resolving to a LAN address, or a
headset does not trust the certificate, the fallback is `adb reverse tcp:<port> tcp:<port>` over
USB, which makes `http://localhost:<port>` a secure context on both. On Galaxy XR this needs
developer mode switched on first.

Known defects to fix first, in remote-logger and not in the sandbox (all small and non-breaking,
in `remote-logger/src/`):

- the log server refuses any port above 9099 (`MAX_PORT_NUMBER` in `src/server/dual-server.ts`),
  and servherd assigns 9000 to 9999 (research 6, section 3.3);
- the client does not forward uncaught errors and unhandled rejections;
- the client loses its last batch when the tab closes; it needs a flush on `pagehide`.

Until they land, the sandbox registers the two error listeners itself, with a comment naming the
defect.

## 3. Rendering: a plain Babylon.js scene

The sandbox draws the graph itself in one Babylon.js scene, and takes its data, layout and
algorithm results from graphty's packages. It does not embed graphty-element.

Why not graphty-element: every technique in the brief is input handling, and graphty-element's XR
input cannot be turned off. `Graph.enterXR` always creates a controller that owns both thumbsticks,
two-hand zoom and rotate, and node dragging; the `xr.input.controllers`, `nearInteraction` and
`physics` options exist but nothing reads them (research 6, section 4). With that handler running,
each technique would fight it, and switching techniques on and off independently would be
impossible. graphty-element also draws one mesh per node, which makes Babylon's per-frame pointer
picking scale with the node count (research 5, section 5).

This is a temporary arrangement, recorded as such:

- Three graphty-element issues are filed before the sandbox's graph view is written: the ignored
  `xr.input` options, the missing option to turn the element's built-in XR navigation off, and
  exporting `twoHandGestureDelta`, which the sandbox copies (section 9.10).
- A technique the owner likes is ported into graphty-element, never into the graphty app. Command
  records in the sandbox are `{ code, params }` with the English label written by the sandbox
  (section 6), so a port does not have to untangle words from facts.
- The graph view is one small module (`scene/graph-view.ts`) behind a narrow interface (positions,
  colors, sizes, visibility, pick). Once graphty-element can hand its XR input to the page, a preset
  can render through the element instead.

The graph view:

| Part        | How                                                                                                                                                                                                                                                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data        | Florentine families: `florentineFamilies()` from `@graphty/graph-samples/datasets/florentine-families` (15 families, 20 marriages). Dense: `plantedPartitionGraph({ groups, groupSize, pIn, pOut, seed })` from `@graphty/graph-samples/generators` (default 8 groups of 60 = 480 nodes; up to 2,000 by URL), which carries a `community` column                             |
| Snapshot    | `fromEdgeArrays(sample)` from `@graphty/graph-format`; ids through `s.ids.requireIndex(name)` and `s.ids.idOf(i)`                                                                                                                                                                                                                                                            |
| Layout      | Computed once, before entering XR, never animated in XR: `kamadaKawai(s, { dim: 3 })` for Florentine, `forceAtlas2(s, { dim: 3, seed })` for the dense graph, normalized to a 0.5 m box                                                                                                                                                                                      |
| Placement   | Placed from the head pose at session start, and again on Recenter and on a reference space reset: about 75 cm ahead, its center slightly below eye level, so it works seated and standing                                                                                                                                                                                    |
| Nodes       | One low-poly mesh (icosahedron) with thin instances: one matrix buffer, one per-instance color buffer, updated only when the graph state changes. Visual radius 1.2 cm on Florentine and 0.6 cm on the dense graph at scale 1 (a setting)                                                                                                                                    |
| Edges       | One thin-instanced unit cylinder (thin lines alias and shimmer)                                                                                                                                                                                                                                                                                                              |
| Opaque      | Graph meshes are always opaque. Dimming (the sieve, a filter preview, the slab) blends a node's color toward the background and scales it down; no per-instance alpha, which is not depth-sorted on one thin-instance mesh and pops as the head moves                                                                                                                        |
| Labels      | Billboarded planes from a small pool, each with its own small `DynamicTexture`, or a GUI `TextBlock`: both known to work in XR, per eye, with multiview. Offset toward the camera by the node radius and drawn in a later rendering group, so they never z-fight with the spheres. MSDF text (`@babylonjs/addons` `TextRenderer`) is an experiment behind a framework toggle |
| Picking     | The graph meshes are not pickable. The view picks nodes itself: a ray-versus-sphere loop over the positions array, about 0.1 ms per ray at 10,000 nodes, with a minimum angular pick radius (default 1.5 degrees for hands, 1 degree for controllers; a setting to compare). Babylon's own pointer selection is kept for UI meshes only                                      |
| Root        | Every graph mesh hangs under one `TransformNode`, the graph root. Navigation moves the root; nothing moves the camera. Its scale is clamped to 0.2x to 5x, so the graph cannot swallow the head through the near clip                                                                                                                                                        |
| Bookkeeping | The 2 to 3 graph meshes get `alwaysSelectAsActiveMesh = true` and frozen materials; `thinInstanceRefreshBoundingInfo()` runs only when positions change. The scene is never frozen (section 10.2, rule 13)                                                                                                                                                                   |

Every algorithm result is computed once at load, before entering XR: `pageRank(s)`,
`degreeCentrality`, `betweennessCentrality`, `louvain`, `connectedComponents` from
`@graphty/algorithms`, and `breadthFirstSearch(s, i, { maxDepth })` per node on demand only on
Florentine. On the dense graph (up to 2,000 nodes) louvain or betweenness run inside the session
would stall the main thread for 50 to 300 ms on Quest: reprojection hides head motion, but hands,
rays and UI freeze. So "run an algorithm" in the headset only reveals a result already computed.
Breadth-first search for pull to grow is cheap on both graphs (a few thousand edges at most) and
runs at pinch start. A worker over graph-format's wire form is a later option, only if a technique
needs a computation that cannot be done at load.

## 4. The technique module contract

### 4.1 The module

Each technique is one TypeScript module that exports an object of this shape (in
`src/framework/technique.ts`):

```ts
interface Technique {
    id: string; // "pull-to-grow"
    name: string; // "Pull to grow" -- shown in the gear panel and badge
    color: string; // the owner color of its badge and ray tint
    needs?: Need[]; // "hand-joints" | "hand-select" | "hover" | "controllers" | "microphone" | "quest-microgestures"
    arm?: "microphone"; // must be armed on the landing page before entering XR (4.2)
    settings: SettingSpec[]; // its own settings, with defaults (4.3)
    claims: Claim[]; // the inputs it wants, and on what (section 5)
    prepare(ctx: TechniqueContext): void | Promise<void>; // at boot, for every registered technique
    activate(): void; // attach claims, show the UI
    deactivate(): void; // the reverse, in the order below
    smoke?: SmokeStep; // the one press the dry run makes (section 11)
}
```

- **`prepare`** runs at boot for every registered technique, enabled or not. It builds the
  technique's meshes and panels hidden, and forces compilation of their materials
  (`material.forceCompilationAsync`), because a hidden mesh is never drawn and so never compiles
  its shader. It fetches nothing heavy and asks for no permission.
- **`activate`** only attaches the technique's claims and shows its UI. Switching a technique on
  in the headset is therefore cheap. If a toggle still takes a frame over 50 ms (a shader variant
  that compiles only once visible), the one-time hitch is logged with its duration rather than
  hidden.
- **`deactivate`**, in this order: cancel the technique's open previews
  (`commands.preview().cancel()`); release every arbiter capture it holds as `cancel`, not `end`;
  drop held tools back to their rack; hide its UI. The same sequence runs for that hand's presses
  when an input source is removed mid-press (on Quest, setting a controller down switches to
  hands).
- **`needs`** is checked against the session. Galaxy XR may refuse joint data while still giving
  `select`, so `hand-joints` and `hand-select` are separate. A transient pointer (an input source
  that exists only while pinching) has no hover, so a hover-only technique declares `"hover"`. A
  technique whose needs are not met shows as unavailable in the gear panel, with the reason.

The `TechniqueContext` is everything a technique may touch, and the only way to touch it:

- `scene`, `xr` (the Babylon `WebXRDefaultExperience`), `graph` (the graph view: positions,
  pick, highlight, preview tint), `target` (the targeting layer's output, read-only), `poses`
  (the hand pose layer's output, read-only), `state` (read-only graph state), `commands`
  (section 6), `arbiter` (claims are registered from `claims`; `ctx.arbiter` gives the live input
  stream), `ui` (factories for panels, buttons, labels, chips that register for disposal),
  `settings` (this technique's current values, with a change observable), `log` (a logger tagged
  with the technique id), `onFrame(fn)` (a per-frame hook, timed for the frame budget).
- Every observer, mesh, panel and hook created through the context goes into a disposal bag.

A technique never reads another technique's state and never calls Babylon input APIs directly
(no `onPointerObservable` subscriptions of its own, no `selectstart` listeners). Input reaches it
only through the arbiter, and hand poses only through the framework's pose layer (section 5.1).

### 4.2 Registry, presets and arming

The registry is a plain array of the 13 modules in `src/techniques/index.ts`. Each technique's
priority is fixed in the input map (section 5.8); the registry lists them in that order.

A preset is data in `src/presets.ts`:

```ts
{ id: "hands-first", name: "Hands first", graph: "florentine",
  techniques: ["gestures", "pull-to-grow", "handling", "hover-tag", "wrist-menu", "undo"],
  settings: { "handling.twoHand": "ours" } }
```

The landing page (`index.html`) lists every preset as a link, which is what "named pages" means
here: one page, one link per preset. The URL can change any preset:

| Parameter                                       | Meaning                                                           |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| `preset=hands-first`                            | Start from this preset (default `baseline`)                       |
| `on=voice,text-entry` / `off=gestures`          | Add or remove techniques                                          |
| `s.pull-to-grow.stepCm=6`                       | Set one setting                                                   |
| `graph=florentine` / `graph=dense&n=480&seed=7` | Choose the data                                                   |
| `steps=journey` / `steps=q1`                    | Open the step list at start with this list (section 7)            |
| `mode=ar`                                       | Request `immersive-ar` (passthrough) instead of `immersive-vr`    |
| `emulate=quest3-hands`                          | Install IWER with a device profile (dry run, desktop try-out)     |
| `devui=1`                                       | With `emulate`, show IWER's desktop control panel (`@iwer/devui`) |
| `still=1`                                       | Turn off every time-driven animation (the jitter test)            |

The landing page also holds what must happen before the session starts:

- **Session mode:** VR or passthrough AR (`immersive-ar` with a transparent clear color). Both
  headsets are mixed-reality headsets and Galaxy XR is passthrough-first; the mode affects comfort
  and spatial judgment, so it is offered and logged.
- **Arming:** techniques with a permission (voice and dictation need the microphone) have a
  checkbox that asks for the permission on the 2D page, since a permission prompt may not be able
  to show inside an immersive session. In the headset an unarmed technique's switch is grayed out
  with the reason.

The first presets. The pairs differ in one technique, so a difference the owner feels can be
put down to that technique:

| Preset             | Techniques                                                                  | Question it serves                                        |
| ------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------- |
| `baseline`         | hover tag, node menus (list style), wrist menu, visible undo                | The control condition every other preset is compared with |
| `baseline-pull`    | `baseline` plus pull to grow                                                | Q3: pull to grow against the menu's Neighbors             |
| `baseline-palette` | `baseline` plus the palette tool                                            | Q4: palette against the node and empty-space menus        |
| `baseline-figma`   | `baseline` plus Figma-like menus                                            | Q4: desktop-style panels against the menus                |
| `baseline-voice`   | `baseline` plus voice chips                                                 | Q3, Q4: voice against the menus                           |
| `hands-first`      | gestures, pull to grow, handling, hover tag, wrist menu, visible undo       | Bare hands, few panels                                    |
| `palette`          | palette tool, physical tools, hover tag, handling, visible undo             | Tilt Brush-style off-hand palette                         |
| `figma`            | Figma-like menus, node menus, hover tag, text entry, visible undo           | Desktop-style panels in space                             |
| `voice`            | voice chips, text entry, hover tag, wrist menu, visible undo                | Speech with the chip sentence                             |
| `dense`            | dense picking, handling, hover tag, node menus, visible undo; `graph=dense` | Q1: picking in a crowded graph                            |
| `everything`       | all 13                                                                      | The arbitration stress test                               |
| `empty`            | none                                                                        | Switch techniques on in the headset                       |

Settings changed in the headset are remembered per preset in `localStorage` as a convenience (a
URL setting wins). **Save as preset** on the gear panel stores the current mix and settings under
a new name in `localStorage` and logs the equivalent URL, so the owner can come back to a mix
made in the headset, or compare against it. The record of what was actually used is the remote
log, not the browser.

### 4.3 Settings, and the gear panel

A setting is `{ key, label, kind: "bool" | "number" | "choice", default, min?, max?, step?,
choices? }`. The gear panel is generated from these specs, so a technique gets its panel by
declaring its settings. Number settings use + and - steppers, not `Slider3D`: hand jitter on a
slider makes exact values hard to set.

The gear panel belongs to the framework, not to any technique, so it is reachable with every
technique switched off. There are three ways in, and no technique can claim any of them:

- **The gear button**, pressed by ray or by poke. It lives in a body-anchored zone (section 4.4):
  head-relative with a lazy follow, about 45 cm away, below the line of sight and to the left,
  within poke reach from a neutral standing or seated pose. It is never parented to the graph
  root, so moving or scaling the graph never moves it, and no other panel may take its zone.
- **On controllers:** a click of the off-hand thumbstick. (Babylon's `oculus-touch` layout has no
  menu button: the Quest system keeps it.)
- **With hands:** both palms facing up, held for 1 s, read from the framework's pose layer. This
  works even when every ray is broken.

The wrist menu (technique 12) has a Settings item too, when it is on.

The panel is a `HolographicSlate` with 2D GUI content and three tabs:

- **Techniques:** one row per technique (an on/off switch, its name, its owner color, and when it
  cannot be switched on, why: unarmed, or a need the session does not meet), which expands into
  that technique's settings.
- **Framework:** dominant hand, frame rate (fixed, changed only by hand), foveation, multiview,
  framebuffer scale, reference space, hand meshes, label renderer (billboard or MSDF), pick radius,
  hover hints, audio clicks, the in-headset log panel, the frame time readout; and the actions
  Reset view (the graph back to scale 1 and its start pose), Recenter (re-place the graph and every
  body-anchored zone from the current head pose), Flag (section 8) and Save as preset.
- **Input map:** the input map of section 5.8 for the techniques now enabled, generated from their
  claims, so the owner can see in the headset what each press would do.

The panel shows the session id and the build time in its title bar, so the owner can read them
out when reporting a problem.

UI beats techniques: a ray or finger on any panel always goes to the panel (section 5.3), so a
misbehaving technique can always be switched off.

### 4.4 Where things go

World-locked and body-anchored UI has fixed zones, so panels never cover each other. Framework
zones are reserved; technique panels take only their own.

| Zone               | Anchor                                         | Holds                                                       |
| ------------------ | ---------------------------------------------- | ----------------------------------------------------------- |
| Graph              | World, placed from the head pose (section 3)   | The graph                                                   |
| Gear               | Body: lazy follow, 45 cm, low left             | The gear button and the gear panel when open (framework)    |
| Steps and toasts   | Body: lazy follow, 45 cm, low right            | The step-list panel, the rating chips, Flag ids (framework) |
| Log                | Body: lazy follow, 50 cm, low center           | The in-headset log panel, when on (framework)               |
| Below the graph    | World, under the graph root's start pose       | The Figma toolbar                                           |
| Left of the graph  | World                                          | The Figma layer list                                        |
| Right of the graph | World                                          | The Figma inspector                                         |
| Beside a node      | Follows the node                               | Context popovers, node menus, probe cards                   |
| Rack               | World, right of the graph, below the inspector | The sieve, the probe, the slab when not held                |

The off hand (the non-dominant one; dominant hand is a framework setting, right by default) has
three fixed slots: the palette above the controller or the back of the hand, the held copy in the
palm, the wrist menu on the inner wrist. The palette and the held copy are never shown together:
showing one hides the other, and the owner swaps them from the gear panel or the wrist menu.
Every "left" or "off hand" below means the non-dominant hand.

## 5. Input arbitration

Several techniques want the same pinch: pull to grow, the node menu, handling, the sieve, the
probe. The targeting layer says what each hand is on; the arbiter decides, for each press, which
one technique gets it, and shows who did.

### 5.1 Channels, and the hand pose layer

Inputs are split into channels. A press on one channel is owned by at most one technique from its
start edge to its end edge, like pointer capture in a browser.

| Channel                     | Hands                                                                        | Controllers                                                          |
| --------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `select` (per hand)         | Pinch (the platform's `select`, which both headsets report for a hand pinch) | Trigger                                                              |
| `squeeze` (per hand)        | A fist, from the framework's pose layer                                      | Grip                                                                 |
| `stick` (per hand)          | none                                                                         | Thumbstick axes                                                      |
| `button` (per hand)         | none                                                                         | A, B, X, Y (the off-hand stick click is reserved for the gear panel) |
| `micro` (per hand)          | Quest thumb microgestures: swipes and thumb tap                              | none                                                                 |
| `poke` (per hand)           | Index fingertip touching a near-pickable mesh                                | Controller tip touching it                                           |
| `pose`, `motion` (per hand) | Static hand poses and motions from the pose layer and the gestures technique | none                                                                 |
| `two-hand`                  | Both hands' `select` or `squeeze` held together                              | Same                                                                 |
| `voice`                     | Push-to-talk speech                                                          | Same                                                                 |
| `hover` (per hand)          | What the targeting layer says the hand is on (5.2)                           | Same                                                                 |

`hover` is shared and read-only: every technique may read it (the hover tag, hint tags and the
probe all do). Every other channel is exclusive.

**The hand pose layer** is framework code, always running when joints are present, whether or not
the gestures technique is on. It computes the poses more than one technique depends on: fist
(the hands' `squeeze`), palm up, palm sideways toward the body, palm toward the face, both palms
up (the gear panel), and pinch strength. Each has begin and end thresholds (hysteresis) and a
150 ms minimum hold. The gestures technique only binds poses and motions to commands; handling's
fist grab and the held copy's palm work without it.

### 5.2 Targeting: what each hand is on

Per hand, exactly one target provider produces `hover`:

- **the plain ray** (default): the graph view's pick along the hand's or controller's ray, with
  the minimum angular pick radius of section 3;
- **the held copy** (handling, when the copy is shown): a ray or fingertip on the copy targets the
  matching node of the full graph;
- **the slab** (dense picking, while held): a ray or fingertip on the plate targets the node drawn
  there.

The provider is a mutually exclusive choice per hand, shown in the gear panel, not an independent
toggle: two providers highlighting different nodes for one hand would let a pinch act on a node
the owner was not shown. The hover tag, the probe, pull to grow, hint tags and the arbiter's
context all read the provider's output. Hover changes have hysteresis: the target moves only when
the new one is clearly closer to the ray (section 10.2, rule 7). RayCursor would be a fourth
provider; it is deferred (section 14).

**The target of a press.** A pinch or trigger pull moves the ray (the "Heisenberg effect"), so the
press does not simply act on the frame of the press:

1. **UI first, from the current frame.** If the current frame's pick, the same pick Babylon GUI
   uses, is on a UI mesh, the context is `ui`, and no node target is consulted. GUI and the arbiter
   can then never both act on one press.
2. **Otherwise, a stabilized node target.** The arbiter keeps a ring buffer of each hand's hover.
   The press's target is the hover from 60 to 80 ms before the press, if it held for that span;
   otherwise the current frame's hover. If neither is a node, the context is `graph` or `space`.
3. **Transient pointers** (a source that appears only while pinching, possibly Galaxy XR's): there
   is no hover before the press, so the target is the ray at the press frame with the target cone
   widened to about 3 degrees.

At most one edge per hand per frame is accepted (Meta IWSDK's rule), so a quick pinch never
toggles twice. Edges arrive from DOM events but are processed at the start of the next XR frame,
with poses read from that frame.

### 5.3 Context, claims and priority

At a start edge the arbiter computes the context: what the hand is on.

1. `ui` -- a panel, button, chip, palette face or tool handle. Babylon's GUI handles it; no
   technique claim is consulted. This rule is fixed, so UI is always reachable.
2. `tool` -- a held tool (sieve, probe, slab).
3. `node`, then `edge`.
4. `graph` -- inside the graph's bounds but on no node.
5. `space` -- nothing.

There are no modes: what a press does depends only on its channel, its context and the enabled
techniques. (The Figma toolbar's items hand the owner a tool or run a command; they never change
what pinching the graph does.)

A claim is `{ channel, contexts, priority, decide? }`. Candidates are the enabled techniques whose
claims match the channel and the context.

- Priorities are fixed numbers, one per technique, given in the input map (5.8). They are not
  reorderable in the headset.
- A claim without `decide` behaves as `decide = take at start`.
- Two claims on the same channel and context at the same priority are a defect in the input map,
  and so are two claims there of which one has no `decide` (it would always win at start, and the
  other could never be reached). The unit test of the input map fails on either.

### 5.4 The short arena, for presses that mean different things by how they move

Some presses are decided by what happens next. A pinch on a node can be pull to grow (the hand
moves away), the node menu (the hand holds still) or a plain select (a quick release). For these,
claims carry `decide(gesture) -> "take" | "wait" | "pass"`, called each frame with the press's
duration and filtered distance moved. The arbiter holds the press for at most 350 ms:

- the first candidate to answer `take` wins; the others are told the press is gone;
- candidates answering `pass` drop out;
- when the window ends, the highest-priority candidate still waiting wins. The window is 350 ms
  so that the node menu's 300 ms hold rule always decides before the window does;
- a release inside the window is a tap, and goes to the framework's tap claim (5.8): select the
  node, or clear the selection on `graph` or `space`.

This is the model of Flutter's gesture arena, cut down to what we need. Controllers avoid most of
it: the node menu also opens with B or Y while pointing at a node, which is its own channel.

Every arena result is logged with the candidates that lost, so how often "the menu opened when I
meant to pull" can be counted from the log (section 8).

### 5.5 Two hands

When the second hand presses while the first hand's press is owned by a technique that claims
`two-hand`, both presses go to that technique (handling's two-hand scale and turn). Otherwise the
second press is arbitrated on its own.

### 5.6 Showing the owner

- **Hover hints** (a framework toggle, on by default): before any press, a small chip near the
  hand lists what a press here would do, from the live candidates for the current context ("pinch:
  Grow / Menu; grip: Grab"). During the arena a ring around the hand fills over the 350 ms window,
  labeled with the candidates still waiting.
- **An owner badge**: a small label in the technique's color at the controller tip or between
  thumb and index, naming the technique that holds the press ("Pull to grow"). It fades one second
  after release.
- The ray is tinted the owner's color while a press is held.
- **Audio clicks** (a framework toggle): hands have no haptics, so presses, arena decisions, hop
  steps and commits make a short click. The clicks are synthesized with WebAudio at boot; nothing
  is fetched.
- Every win is logged (`arbiter.win`: hand, channel, context, technique, the candidates that lost,
  whether hover hints were on).

### 5.7 Gestures no technique may claim

Both operating systems reserve a palm pinch: on Quest, palm toward the face then pinch (on the
left hand this leaves the WebXR session); on Galaxy XR, palm forward until the navigation icons
appear, then a pinch on an icon (Back, Home, Recents). The operating system takes a pinch on its
own icons, not every pinch made with the palm forward, and a palm-forward pinch is a common way to
pinch a node in front of you. So the arbiter never drops a press on pose alone:

- every press is logged with the pinching hand's pose;
- a press is cancelled, not ended, if within about 200 ms the session goes `visible-blurred` or
  the input source is removed, which is what the system gesture does;
- the probe and the log record how often the pose and a blur coincide on each headset.

The gestures technique refuses pose definitions that need a palm-toward-face or palm-forward pinch.

### 5.8 The input map

One table of every claim. The registry, the gear panel's Input map tab and the unit test are all
generated from, or checked against, the claims in code; this table is their reference.

| Technique            | Channel                       | Context                  | Priority | Decide                                      |
| -------------------- | ----------------------------- | ------------------------ | -------- | ------------------------------------------- |
| Framework (reserved) | `select`, `poke`              | `ui`                     | --       | Babylon GUI, never arbitrated               |
| Framework (reserved) | `button` off-hand stick click | any                      | --       | Opens the gear panel                        |
| Framework (reserved) | `pose` both palms up, 1 s     | any                      | --       | Opens the gear panel                        |
| Physical tools       | `select`, `squeeze`           | `tool`                   | 90       | Take at start                               |
| Dense picking (slab) | `select`, `squeeze`           | `tool`                   | 90       | Take at start                               |
| Voice                | `button` X (off hand)         | any                      | 80       | Take at start (push-to-talk while held)     |
| Palette              | `stick` X (off hand)          | any                      | 70       | Take at start                               |
| Palette              | `micro` swipes (off hand)     | any                      | 70       | Take at start                               |
| Pull to grow         | `select`                      | `node`                   | 60       | Take after 3 cm filtered movement           |
| Node menus           | `select`                      | `node`, `graph`, `space` | 50       | Take after 300 ms held within 1.5 cm        |
| Node menus           | `button` B, Y                 | `node`, `graph`, `space` | 50       | Take at start                               |
| Handling             | `squeeze`                     | `node`, `graph`, `space` | 40       | Take at start                               |
| Handling             | `select`                      | `graph`                  | 40       | Take after 1.5 cm filtered movement         |
| Handling             | `two-hand`                    | any                      | 40       | When the first press is handling's          |
| Gestures             | `pose`, `motion`, `micro`     | any                      | 30       | Take at start (poses are discrete events)   |
| Framework tap        | `select`                      | `node`, `graph`, `space` | 0        | Accepts a tap (a release inside the window) |

The hover tag, the probe's reading, hint tags, the wrist menu, the Figma panels, visible undo and
text entry claim nothing beyond UI. A table-driven unit test in `test/` pins the expected winner
for each case -- tap, hold still, pull, drag on empty graph, grip, two hands -- for the presets
`baseline`, `hands-first` and `everything`.

## 6. The shared command layer

### 6.1 Graph state

All graph-level effects live in one small, plain state object (`src/core/state.ts`):

```ts
{ selection: Set<number>; hidden: Set<number>;
  results: Record<string, Float64Array>;  // every result, computed at load (section 3)
  shown: Set<string>;                      // results revealed by "run"
  colorBy: string | null; sizeBy: string | null;
  filter: { result: string; op: ">=" | "<="; value: number } | null;
  notes: { target: number | "graph"; text: string }[] }
```

The graph view derives its color, size and visibility buffers from the state whenever it changes,
so nothing else writes to the meshes.

### 6.2 Commands

| Command             | Params                   | In history | Label (sandbox wording)                  |
| ------------------- | ------------------------ | ---------- | ---------------------------------------- |
| `select`            | ids, mode replace or add | no         | "Select Medici" / "Select 6 families"    |
| `neighbors`         | id, hops                 | no         | "Select Medici and 1 hop (6)"            |
| `run`               | algorithm id             | yes        | "Run PageRank"                           |
| `colorBy`, `sizeBy` | result id or null        | yes        | "Color by PageRank"                      |
| `filter`            | result, op, value        | yes        | "Keep PageRank at least 0.070 (5 of 15)" |
| `clearFilter`       |                          | yes        | "Remove filter"                          |
| `hide`, `show`      | ids                      | yes        | "Hide Medici" / "Show 3 families"        |
| `note`              | target, text             | yes        | "Note on Medici"                         |
| `probe`             | id or null               | no         | -- (read-only, logged)                   |
| `undo`, `redo`      |                          | --         | --                                       |
| `save`              |                          | no         | "Save"                                   |

Selection stays out of the history, as in Figma: otherwise "Undo: Select Medici" crowds out the
real steps, and undo would undo a selection instead of "Color by degree". Selection commands are
still logged.

`commands.run(code, params, { technique })` applies a command and, for a history command, pushes
an entry `{ code, params, technique, time, before }`, where `before` is the previous state without
the selection (small, so a snapshot is cheaper and safer than writing an inverse for each command;
result arrays are shared, never copied). Undo restores `before`. The label is formatted from
`{ code, params }` by one function, so a port to graphty-element keeps facts and words apart.

`commands.preview(code, params)` returns `{ update(params), commit(), cancel() }`. A preview tints
the graph without touching the state or the history; pull to grow and the sieve live in preview
until release. `commit()` runs the command; `cancel()` restores the view. Undo while a preview is
open cancels the preview and does nothing else.

`save` writes the state as JSON to `localStorage` and to the remote log (`save` entry), and the
landing page offers the last saved state as a download after the session.

Every technique issues the same commands, so "how long did it take to color by PageRank" means the
same thing whatever technique did it, and the visible undo can always say what it will undo.

## 7. The step list: the journey, and the questions

The step list is a small framework panel in the steps zone (section 4.4). It shows the current
step's text, Done and Skip buttons and the elapsed time (redrawn once a second). It does not say
how to do a step: that is what is being tried. When a step ends, a row of seven chips (1 = very
hard, 7 = very easy) offers a one-poke ease rating, with an optional note by dictation or keyboard;
both can be ignored. Done, Skip, the time, the rating and the note go to the remote log
(`step` entries). The panel does not judge whether a step was done right: the owner decides, and
the commands in the log show what happened.

### 7.1 The questions the playground answers

Each question names the presets it compares and a short drill, a step list of its own:

| Question                      | Compare                                                 | Drill                                                             |
| ----------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| Q1: dense picking             | plain ray, hint tags, the slab (`dense`, one at a time) | 10 trials: pick the node marked with a beacon among occluders     |
| Q2: node menu style           | ring against list (`baseline`, node menu style setting) | 6 trials: open a node's menu and choose the named verb            |
| Q3: getting a neighborhood    | `baseline-pull`, `baseline`, `baseline-voice`           | "Select <family> and everything within 2 hops", 4 seeded families |
| Q4: color by                  | `baseline-palette`, `baseline-figma`, `baseline-voice`  | "Color by <result>", 4 seeded results                             |
| Q5: hands against controllers | `baseline`, the same drill once with each               | Q2's drill on Florentine                                          |
| Q6: text entry                | in-scene keyboard against dictation (`figma`)           | Write a three-word note on a named family                         |

### 7.2 The journey

The Florentine families journey from `design/xr/xr-control-prototypes.md`, as steps:

| #   | Step                       | Text shown                                                 |
| --- | -------------------------- | ---------------------------------------------------------- |
| 1   | Enter                      | (the session starts)                                       |
| 2   | Get oriented               | "Look around the graph"                                    |
| 3   | Find a family              | "Find the <family>"                                        |
| 4   | Who they married into      | "Select the <family> and the families they married into"   |
| 5   | Who matters most           | "Run PageRank"                                             |
| 6   | Read the result            | "Which family ranks #<k>?"                                 |
| 7   | Color and size by PageRank | "Color and size the families by PageRank"                  |
| 8   | Keep only strong families  | "Keep only the families with PageRank of at least <value>" |
| 9   | Write a note               | "Write a note on the <family>"                             |
| 10  | Undo a mistake             | "Color by degree, then undo it"                            |
| 11  | Save                       | "Save"                                                     |

The family, the rank and the threshold come from a seed chosen per run and logged with it, so
from the second run on a step measures the technique and not the owner's memory of the answer.
The dense journey uses the same steps on the dense graph, with each target marked by a beacon,
since a node in a 480-node graph cannot be found by name.

## 8. Remote logging

- Always on: the sandbox creates a `RemoteLogClient` from `@graphty/remote-logger` at boot, posting
  to `/remote-log` on its own origin (the Vite proxy), with `sessionPrefix: "xr-sandbox"`. Console
  output is captured as well, so `console.error` from Babylon reaches the log.
- The session id is the client's `sessionId`. It is shown on the landing page and in the gear
  panel's title bar, and every entry carries it.
- Every entry also carries the context needed to compare runs: preset, enabled techniques, a hash
  of the settings, build id, device, session mode, the input mode in use (hands, controllers or
  mixed) and the run index for this preset.
- Per-frame messages are throttled with the client's `throttlePatterns`.

What is logged:

| Entry                         | When                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `probe`                       | Page load and session start: user agent, Babylon version, enabled features, reference space, frame rates, foveation, layers and multiview, `XRWebGLLayer.getNativeFramebufferScaleFactor()` and the recommended scale, system keyboard support, every input source's profiles, handedness, target ray mode and gamepad button and axis counts, `navigator.gpu`, speech recognition presence, microphone permission (research 5, section 2) |
| `frames`                      | Every 2 s: XR frame delta p50, p95, max, misses; time spent in technique hooks                                                                                                                                                                                                                                                                                                                                                             |
| `preset`, `toggle`, `setting` | At start and on every change in the headset; a toggle carries how long it took                                                                                                                                                                                                                                                                                                                                                             |
| `input`                       | Input source added or removed, with profiles; reference space reset; visibility changes                                                                                                                                                                                                                                                                                                                                                    |
| `arbiter.win`, `cancel`       | One per press: the winner, the candidates that lost, whether hover hints were on, the hand's pose. `cancel` for a pull released in the dead zone, a menu dismissed, a preview cancelled, a press cancelled by a blur                                                                                                                                                                                                                       |
| `command`                     | Every command and preview commit, with technique                                                                                                                                                                                                                                                                                                                                                                                           |
| `step`                        | Section 7: list, step, seed, Done or Skip, time, rating, note                                                                                                                                                                                                                                                                                                                                                                              |
| `flag`                        | The owner pressed Flag (below)                                                                                                                                                                                                                                                                                                                                                                                                             |
| `error`                       | Uncaught errors and unhandled rejections                                                                                                                                                                                                                                                                                                                                                                                                   |
| `session.end`                 | With its cause                                                                                                                                                                                                                                                                                                                                                                                                                             |

Counts per step (wrong picks, cancels, undos, arena losses per technique) are worked out from
these entries afterwards, not computed in the page.

**Flag.** A framework action on the gear panel and the wrist menu, and on controllers a chord
(both thumbsticks clicked together). It logs a `flag` entry with a short id shown in the steps
zone for a few seconds ("F7"), the current state, the enabled set, and the last 10 s of input
from a ring buffer (per frame: each hand's ray, pose, hover target, press edges). A report such
as "F7 felt wrong" then maps straight to a slice of the log. The entry is sent as one upload, not
through the throttled stream, which would drop frames.

How to read the log, with no MCP needed:

- `curl -s http://127.0.0.1:<log port>/logs/recent?n=200` and `/logs/errors` on this machine;
- the JSONL file the server appends to, `/tmp/remote-logger/feat-xr-technique-sandbox/logs.jsonl`
  (the worktree name is the folder), filtered with `grep <session id>`;
- the `remote-logger` MCP tools, when that server connects.

The gear panel can also show the last 10 log lines in the headset (a framework toggle), since DOM
consoles such as eruda are invisible in an immersive session.

## 9. The 13 techniques

Each entry says what the technique builds on, what the sandbox adds, how it takes input and what
is known to be missing. "Gaps" are the notes the brief asks for: things we would fix or replace
later, not blockers for trying the technique. Claims are listed in full in the input map
(section 5.8).

### 9.1 Gestures (hand poses and motions)

- **Builds on:** `handy-work` (MIT, by Ada Rose Cannon, inspired by handy.js; last active around 2022) alone, with its shipped poses plus poses recorded from the owner's hand. It reads `XRFrame`
  joints directly and runs next to Babylon through `sessionManager.currentFrame` and the session's
  `referenceSpace`. Quest thumb microgestures through Babylon's `WebXROculusHandController`
  (`swipe-left`, `swipe-right`, `swipe-forward`, `swipe-backward`, `tap-thumb`). The common poses
  (fist, palm up and the others) come from the framework's pose layer (section 5.1).
- **Adds:** the guards handy-work does not have: begin and end thresholds (hysteresis), a 150 ms
  minimum hold, suppression while the hand pinches or holds something. A binding table in settings
  maps poses and microgestures to commands (for example thumbs up = commit the preview, open palm
  pushed forward = cancel, swipe left or right = previous or next result). A recorder in the gear
  panel saves a pose to the log so the owner's own hand becomes a template.
- **Claims:** `pose`, `motion`, `micro` on both hands, never the fist (that is `squeeze`).
- **Gaps:** shipped templates were recorded on someone else's hand; no microgestures on Galaxy XR;
  handy-work is not maintained, so a fix means a fork. Drawn motions (the $Q recognizer,
  `qdollar.js`, BSD) are added only if the owner binds motions. `@clickon/xr-extension` (poses and
  sequences, Babylon) targets Babylon 6 and owns the XR experience, so it gets its own experimental
  page only, if at all. Jackknife's license forbids redistribution: never committed.

### 9.2 The palette tool

- **Builds on:** Babylon's `SixDofDragBehavior` for tear-off, 2D GUI on near-pickable planes for
  the faces (so both poke and ray work), `TouchHolographicButton`s where a physical press matters,
  and a `HolographicSlate` for a torn-off card. Open Brush's palette (`PanelManager.cs`,
  Apache-2.0) is the reference for the behavior, not code being ported: it is a large Unity system
  and porting it would cost more than the playground needs.
- **Adds:** a prism of N faces parented to the off-hand grip (or the off hand's wrist joint with
  hands), snapped one face at a time by the off-hand stick, a microgesture swipe on Quest, or a
  pinch-drag on the rim on Galaxy XR. Tear-off: drag a card away with `SixDofDragBehavior`; dropped
  within about 10 cm and 70 degrees of facing a face, it snaps back. The faces' content: Analyze
  (show a result), Style (color by, size by), Filter (hands over the sieve), Selection, History.
- **Claims:** off-hand `stick` X, off-hand `micro` swipes; presses on the faces are UI.
- **Gaps:** no coasting or haptic ticks on rotation yet; the rim drag on Galaxy XR is untried; a
  torn-off card cannot yet be docked into a different face.

### 9.3 Node menus

- **Builds on:** a ring of items opening at the hand, after Open Brush's `PinCushion.cs`
  (Apache-2.0) as the reference, written fresh in about 100 lines: tilting the wrist steers the
  selection (the controller's or hand's rotation since the ring opened, projected onto the ring
  plane); release commits. The `list` style is a ray-cast `CylinderPanel` of buttons. pangmenu's
  rule for sub-menus (a child ring on a bounded arc at the parent's angle; long lists are lists,
  not pies) is taken as design only: it has no license.
- **Adds:** a style switch between `ring` and `list` (a 2025 comparison of VR menu types, Wentzel
  et al., found each type best at something). The empty-space menu is the same menu with graph
  verbs (show a result, clear selection, filter, note). Node verbs: select, neighbors, probe, note,
  hide.
- **Claims:** `select` on `node`, `graph` and `space`, deciding by holding still for 300 ms;
  `button` B or Y on controllers while pointing.
- **Gaps:** one level of hierarchy at first; hands on Galaxy XR steer by wrist tilt only, which may
  be tiring; dismissal rules (look away, move away) are first guesses. The `touch` style (a
  direct-touch panel beside the node) and expert strokes made without waiting for the ring (Kando's
  `gesture-detector.ts`, MIT) are deferred.

### 9.4 Figma-like menus

My choice of the set, from what a desktop design tool gives a person:

- a **floating toolbar** below the graph (`NearMenu`, pinned, follows lazily). Its items hand the
  owner a tool or run a command -- sieve, probe, note, show a result -- and never switch a mode;
  turning and moving the graph is handling's job;
- a **layer list** to the left (`HolographicSlate` with 2D GUI): the selection highlight, color
  by, size by and filter, in order, each with show and remove;
- an **inspector** to the right (`HolographicSlate`): the selected node's attributes and results,
  editable where a value is a setting (via the keyboard or a stepper);
- **context popovers**: a small slate beside a selected node with three to five verbs, dismissed
  when the selection clears.

- **Builds on:** Babylon GUI 3D (`NearMenu`, `HolographicSlate` and its gizmo, `FollowBehavior`) and
  2D GUI on meshes; playgrounds `#24DLJ4#7` and `#43YQHC#2`.
- **Claims:** none beyond UI; it issues commands from its controls.
- **Gaps:** no drag-to-reorder in the layer list; the slate gizmo's drag broke twice on Quest in
  the past (fixed in Babylon 7.50), so it is checked first. Panel textures are sized to the
  display, about 512 to 768 px for a 30 cm panel at arm's length (section 10.2, rule 18).

### 9.5 Hover name tag

- **Builds on:** the targeting layer's `hover` and the framework's billboard labels (section 3).
- **Adds:** the tag "Strozzi 0.088, #3": the node's label, the value of the current result
  (PageRank once shown, degree before) and its rank, from the results computed at load (research 6
  checked that graphty's packages give exactly these numbers). It shows while hovering, before any
  press, at a constant angular size (default 20 mm per meter of distance, about 1.15 degrees, with
  a backing chip). Its texture is redrawn only when the target changes.
- **Claims:** reads `hover` only. Needs `"hover"`, so it is unavailable with a transient pointer.
- **Settings:** dwell before showing (0 ms default), which value, size.
- **Gaps:** the MSDF renderer is an experiment behind a framework toggle (section 3).

### 9.6 Pull to grow a neighborhood

- **Builds on:** the platform's `select` edges (the pinch, no pinch-strength code of our own);
  `breadthFirstSearch(s, i, { maxDepth })` from `@graphty/algorithms`, run once at pinch start;
  `1eurofilter` (BSD-3-Clause) on the pull distance.
- **Adds:** the mapping from distance to hops: a 6 cm dead zone, then one hop per 8 cm, with 2 cm
  of hysteresis at each boundary so the readout never flickers. The live readout beside the hand:
  "1 hop: 6", then "2 hops: +5", on its own small texture, redrawn only when the hop count changes.
  A preview dims the nodes out of reach (opaque, section 3); release commits `neighbors`; release
  inside the dead zone cancels. An audio click per hop, and a haptic tick on controllers.
- **Claims:** `select` on `node`, taking after 3 cm of filtered movement.
- **Gaps:** the pull counts distance in any direction; pulling away from the node only, and a cap
  on hops for the dense graph, are later choices. If the hand holds still past 300 ms the node menu
  wins; the arena log shows how often that happens against the owner's intent.

### 9.7 Physical tools: the sieve and the probe

- **Builds on:** `SixDofDragBehavior` for holding a tool, `Slider3D` for a threshold, and the
  command layer's `preview`.
- **The sieve:** a hand-held frame taken from the toolbar, the palette or the rack (section 4.4).
  It filters by one result (PageRank by default); the threshold is set on its slider or by rolling
  the wrist. While held, nodes that would be removed dim (opaque, section 3) and the frame reads
  "keeps 5 of 15", redrawn only when the count changes. Pinching the frame's handle (or the
  trigger) commits `filter`; putting it back cancels.
- **The probe:** a pen. Touching a node (near) or pointing at it (far) shows a card with every
  result for that node: degree, PageRank and its rank, community. Pointed at empty space it reads
  the current result's summary (range, top three). A reading is the `probe` command: logged, not
  in the history.
- **Claims:** `select` and `squeeze` in context `tool`.
- **Gaps:** `Slider3D` has one thumb, so there is no range filter; the rack's place is a guess;
  rules cannot be combined yet.

### 9.8 Voice with an editable chip sentence

- **Builds on:** per device, the cheapest engine that works (research 4):
    - **Galaxy XR:** the Web Speech API (Chrome's `webkitSpeechRecognition`, cloud). Its first test
      is whether starting recognition blurs or ends the immersive session.
    - **Quest:** the Web Speech API is absent, so the first cut uses the dictation key of the system
      keyboard (section 9.11), opened from the mic chip.
    - The shape of graphty-element's `VoiceInputAdapter` (start and end reasons).
      `fastest-levenshtein` and `double-metaphone` (both MIT) for matching misheard words.
- **Adds:** a slot grammar of about 150 lines ("color `<target>` by `<attribute>`", "run
  `<algorithm>`", "select `<target>`", "keep `<attribute>` at least `<value>`", "grow `<node>` `<n>`
  hops", "undo", "save"), whose vocabularies come from the data (node names, result names,
  algorithm names). The sentence shows as chips; interim words are gray, final ones solid. Poking a
  chip offers its top three alternatives and then the whole vocabulary of its slot; an unparsed word
  is a red "?" chip. A Run chip executes. "these" and "this" mean the selection or the hovered
  node. Chips can be built by poking alone, verb first, so voice is never the only path.
- **Claims:** `voice` (push-to-talk: hold X on the off-hand controller, or hold the mic chip).
- **Arming:** the microphone is asked for on the landing page (section 4.2).
- **Settings:** engine (auto, web-speech, system keyboard, off).
- **Gaps:** on-device speech on Quest (`@moonshine-ai/moonshine-wasm`, MIT, streaming, with key
  terms) is deferred: its CPU cost while rendering is unmeasured and likely to cost frames, and it
  brings a model download, a download script, and COOP/COEP headers on every response. The system
  keyboard's dictation gives no interim words, so Quest's chips appear only at the end.

### 9.9 Dense picking

Two sub-techniques first, each its own toggle in the settings, on the dense graph:

- **Hint tags.** Vimium's `hintStrings` (MIT, about 10 lines) makes two-letter tags, none a prefix
  of another, for the nodes in a cone around the ray (or on the slab). The owner reads a tag and
  types it on a mini keyboard showing only the letters in use, or says it (a voice-safe alphabet
  avoids letters that sound alike: b, d, e, p, t, v). Billboard labels at constant angular size.
- **The slab.** A hand-held plate pushed through the graph (after the Slicing-Volume technique,
  IEEE VR 2020, which has no code): nodes within half its thickness of its plane are drawn flat on
  the plate, with hint tags; while the slab is held it is that hand's target provider
  (section 5.2), so picking on the plate acts on the full graph. The rest of the graph dims (opaque,
  section 3).
- **Claims:** `select` and `squeeze` in context `tool` (the slab); `hover` read.
- **Gaps:** RayCursor (MIT, CHI 2019, Unity C#), the slab's LassoGrid layout, SQUAD, Flower Ray and
  VoiceRay ordinals ("second") are deferred (section 14).

### 9.10 Handling the graph

- **Builds on:** Babylon's `SixDofDragBehavior` on an invisible grab volume around the graph
  (one-hand grab, smoothed), `WebXRNearInteraction` with `isNearGrabbable` for grabbing up close,
  and `allowMultiPointer` for two hands. graphty-element's `twoHandGestureDelta` (full 3D rotation),
  copied with a comment naming the source and the graphty-element issue that asks for it to be
  exported (section 3). `HandConstraintBehavior` to hold the small copy on a hand.
- **Adds:** a switch between Babylon's stock two-hand behavior and ours, because the stock one
  turns about the vertical axis only and is not smoothed. Ours measures both hands in reference
  space, applies scale and rotation about their midpoint, filters with the One Euro filter, and
  clamps scale to 0.2x to 5x. The held copy, a setting of this technique: a second thin-instance
  mesh that shares the full graph's matrix buffer, under a node scaled to about 1/40 and held in
  the off hand's palm slot (off-hand grip on controllers, palm up with hands), with a small box
  showing what is in front of the viewer. While shown it is the off hand's target provider
  (section 5.2).
- **Claims:** `squeeze` on `node`, `graph` and `space` (grip on controllers; the fist from the pose
  layer with hands), `select` on `graph` after 1.5 cm of movement, `two-hand`.
- **Gaps:** edges of the held copy are rebuilt only when needed; `BoundingBoxGizmo` handles for the
  copy are an optional extra and need enlarging for hands.

### 9.11 Text entry

- **Builds on:** Babylon GUI's `VirtualKeyboard` connected to an `InputText`, on a near-pickable
  plane (`AdvancedDynamicTexture.CreateForMesh`), with `inputText.disableMobilePrompt = true` (a
  touch-focused field otherwise calls `window.prompt()` and freezes the session). Quest's system
  keyboard (`session.isSystemKeyboardSupported`) by focusing a hidden DOM input from inside the
  `select` event.
- **First spike:** whether a fingertip poke on the `VirtualKeyboard` works, since near-interaction
  sphere picks may not return texture coordinates for 2D GUI on a mesh. If it does not, the
  in-scene keyboard is a grid of `TouchHolographicButton` keys, which are known to be pokeable.
- **Adds:** keys of at least 2 cm for fingertips; the keyboard opens at the hand's reach (about
  40 cm, below the line of sight), not at the field, which may be 75 cm away; a dictation key
  (Web Speech on Galaxy XR, the system keyboard on Quest, as in 9.8); a "drum" style toggle where
  controller tips strike the keys; mirroring of the system keyboard's value into the field (each
  showing of that keyboard replaces the whole value, so the sandbox appends).
- **Used by:** notes, the inspector, hint tags, step-list notes.
- **Gaps:** multi-line fields are not supported by `VirtualKeyboard`; no key sound or haptic yet
  beyond the audio clicks; the system keyboard is Quest only and freezes the scene's input while
  open.

### 9.12 Wrist menu

- **Builds on:** Babylon GUI's `HandMenu` and `HandConstraintBehavior`; playground `#24DLJ4#7`.
- **Adds:** the menu sits on the inner wrist of the off hand and shows when the palm faces sideways
  toward the body and the viewer looks at it (from the pose layer), or on the back of the wrist as
  a setting. It is never on the palm-up or palm-toward-face pose: palm toward the face is Quest's
  own system-menu gesture, where Quest shows its own icon and a stray pinch leaves the session. A
  controller variant: the same menu parented to the off controller's grip, shown when the wrist
  turns toward the face, because `HandMenu` follows only tracked hands. Items: Undo, Redo, Save,
  Settings, Steps, Recenter, Flag. The menu is pressed by the other hand's poke or ray, never by a
  pinch of the menu hand.
- **Gaps:** the visibility thresholds need tuning; on Galaxy XR the pose must be tried against the
  palm-forward OS pose.

### 9.13 Visible undo

- **Builds on:** the command layer's history.
- **Adds:** an Undo chip that names the step ("Undo: Color by PageRank") on the wrist menu and the
  toolbar; a toast beside the hand that acted, for 2 s after each history command ("Colored by
  PageRank -- Undo"); a history strip of the last five steps, any of which can be poked to undo
  back to it. Redo. Selections are not steps (section 6.2).
- **Gaps:** undo is linear; selective undo of one earlier step (keeping later ones) is a later
  experiment.

## 10. The headsets, and the rules against jitter

### 10.1 Device notes

|                              | Meta Quest 3, Quest Browser                                                                              | Samsung Galaxy XR, Chrome on Android XR                                                                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hands                        | 25 joints; pinch = `select`; system hand ray                                                             | Primary input; profile `generic-hand-select`; pinch = `select`, possibly as a transient pointer; hand data behind a permission prompt, so the sandbox must work when it is refused                                                               |
| Controllers                  | Touch Plus, `oculus-touch` profile (no menu button: the system keeps it); hands and controllers together | Optional accessory; reports `samsung-galaxyxr`, then `oculus-touch`, with 6 buttons and 4 axes (fewer than its own profile lists). Babylon guards the missing button; every gamepad index and every `pulse` call of ours is guarded the same way |
| Microgestures                | Thumb swipes and tap (Browser 38.1+)                                                                     | None                                                                                                                                                                                                                                             |
| OS palm gesture              | Palm toward the face then pinch; the left hand leaves the session                                        | Palm forward, then a pinch on the navigation icons (Back, Home, Recents)                                                                                                                                                                         |
| Frame rates                  | 72, 80, 90, 120 Hz; the sandbox uses 72                                                                  | 60, 72, 90 Hz; the sandbox uses the rate the probe reports; the frame-rate API is unverified                                                                                                                                                     |
| Layers, multiview, foveation | Yes                                                                                                      | Not documented; probed                                                                                                                                                                                                                           |
| Display                      | 2064 x 2208 per eye                                                                                      | 3552 x 3840 per eye, about 2.9x the pixels: fill rate is the risk. Chrome may already render below native resolution, so the probe reads the native and recommended framebuffer scale before any default; 0.8 is a toggle                        |
| Speech                       | No Web Speech: the system keyboard's dictation key                                                       | `webkitSpeechRecognition` (cloud); in-session behavior unverified                                                                                                                                                                                |
| System keyboard              | Yes, over the session                                                                                    | No                                                                                                                                                                                                                                               |

The capability probe (section 8) answers every "unverified" the first time the owner opens the
sandbox on each headset.

### 10.2 Rules against jitter

"Jittery images" in a headset are almost always missed frames; the second cause is reading a
transform that is a frame old (research 5, section 4). Every module follows these rules:

1. The frame rate is a fixed setting: 72 Hz on Quest, the reported rate on Galaxy XR. It changes
   only by hand. Changing `updateTargetFrameRate` mid-session causes a visible hitch, and an
   automatic raise-and-lower loop would oscillate.
2. No layout, algorithm or allocation inside the session's frames. Layout and every algorithm
   result are computed before entering XR (section 3); breadth-first search at pinch start is the
   only computation in a session, and it is small.
3. Move the graph, never the camera. Navigation transforms the graph root; the camera's parent
   never moves.
4. Do hand math in reference-space coordinates (the local position and rotation Babylon sets on
   grips, pointers and joints each frame). After moving anything, `computeWorldMatrix(true)` before
   reading a world position.
5. Two-hand scale is measured in reference space and applied about the hands' midpoint, so the
   scale cannot feed back into its own measurement.
6. Hand-held UI is parented to the grip, pointer or joint node, never positioned by copying a pose
   in an observer or from a DOM event.
7. Rays, hover anchors and two-hand transforms go through a One Euro filter; hover targets and
   value steps have hysteresis.
8. A press acts on the target chosen by section 5.2: UI from the current frame, a node from the
   stabilized hover.
9. No post-processes, glow or highlight layers; anti-aliasing on; hover and selection are shown by
   color and scale. No alpha on graph meshes: dimming is a color blend toward the background plus
   a smaller scale (section 3). Multiview is off by default, because Babylon GUI makes the whole
   scene flicker on Quest 3 with multiview (an open bug); it is a toggle to measure. Foveation 0.3
   by default, as a toggle.
10. Camera `minZ` 0.05 m and `maxZ` 100 m, so a wrist menu or held copy is not clipped and far
    edges do not z-fight.
11. Preallocate; use Babylon's `TmpVectors`; nothing is created per frame. Shared materials are
    compiled at boot and every technique is prepared at boot (section 4.1); a toggle that still
    hitches is logged with its duration.
12. Graph meshes are not pickable; the graph view picks nodes itself. Babylon's pointer selection
    gets a predicate that accepts UI meshes only.
13. Nodes and edges are thin instances. The scene is never frozen: `scene.freezeActiveMeshes()`
    keeps the active-mesh list from the moment it is called, culled against the desktop camera, so
    hand joints, controller models, rays, panels, tags and badges created or shown later would never
    be drawn. Instead the 2 to 3 graph meshes set `alwaysSelectAsActiveMesh = true` and freeze
    their materials, and `thinInstanceRefreshBoundingInfo()` runs only when positions change. With
    a few dozen meshes in the scene, freezing would save nothing.
14. No physics or collisions on the camera.
15. No network fetch during a session. `WebXRMotionControllerManager.UseOnlineRepository = false`
    (or `BaseRepositoryUrl` pointed at the mirrored profiles in `public/assets/`), controller
    models from the local mirror, hand joints drawn from local meshes or as plain spheres
    (`handMeshes.disableDefaultMeshes`), the touch-orb material bundled, and mirrored GUI assets.
16. Reference space `local-floor`, falling back to `local`, never `viewer` (which head-locks the
    scene); `local` is a toggle for seated use. A reference space reset re-places the graph root
    and every body-anchored zone from the head pose, and is logged.
17. Frame pacing is logged every 2 s from the first build, and on Quest the OVR Metrics Tool's
    stale-frame counter is the ground truth.
18. 2D GUI textures (`AdvancedDynamicTexture.CreateForMesh`) re-rasterize and re-upload, with
    mipmaps, whenever they are marked dirty. So: changing text lives on small dedicated textures,
    never on a whole panel; readouts redraw only on a change of value and at most 2 to 4 times a
    second, the step timer once a second; textures are sized to the display, about 512 to 768 px for
    a 30 cm panel at arm's length (1,024 px would be about 2x supersampling).
19. `WebXRDefaultExperience` is created with `disableTeleportation: true` (teleportation takes the
    thumbstick, draws its own arc and moves the camera, against rule 3), `disableDefaultUI: true`,
    `disableNearInteraction: false` (poke and near grab need it), and the hand tracking options
    of rule 15.
20. The headsets load a production build from `vite preview`, never the dev server (section 2.3).

## 11. Dry run

The dry run is a Playwright script (`xr-sandbox/dryrun/run.mjs`) that drives the sandbox in
headless Chromium with IWER installed by the page (`?emulate=<profile>`). It reuses the approach
of graphty-element's `xr` test project (`graphty-element/test/interactions/helpers/iwer-setup.ts`
forces IWER over Chromium's own `navigator.xr`); the install is copied into the sandbox, since a
test helper is not an importable module. It runs against the sandbox's servherd URL (the preview
build, as the headsets see it), one browser at a time, inside a browser slot:

```
<main checkout>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
  node xr-sandbox/dryrun/run.mjs --url https://dev.ato.ms:<port>/ --out tmp/xr-sandbox/dryrun
```

### 11.1 Device profiles

| Profile                              | Built from                                                                                                                                                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quest3-controllers`, `quest3-hands` | IWER's `metaQuest3`                                                                                                                                                                                              |
| `galaxyxr-hands`                     | `metaQuest3` with a Chrome-on-Android-XR user agent, hands reporting `generic-hand-select`, no microgestures                                                                                                     |
| `galaxyxr-controllers`               | Same, with controllers reporting `["samsung-galaxyxr", "oculus-touch"]` and only 6 buttons and 4 axes (the case that crashed Meta's IWSDK every frame). Asserts no error, every gamepad read and `pulse` guarded |
| `galaxyxr-no-hands`                  | Hand tracking refused: controllers only; hand-joint techniques show as unavailable                                                                                                                               |

IWER has no Galaxy XR profile; these approximate its input, not its tracking, performance or
permission prompts, which only the device can show.

### 11.2 Checks, per profile and per preset

| Check                      | Pass when                                                                                                                                                                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starts cleanly             | The session renders more than 10 XR frames; no console error, no uncaught error or unhandled rejection; no request leaves the page's origin                                                                                                                                                                    |
| Frame time                 | Over 300 frames after warm-up: time in technique hooks p95 under 2 ms; no frame's JavaScript over 50 ms. (Headless pacing is not real pacing; this catches runaway work, not device frame rate)                                                                                                                |
| Still-head jitter          | Head and inputs held still with `still=1`, after a warm-up: over 120 frames the world matrices of the graph root, every visible mesh and a sample of nodes move less than 0.05 mm and 0.01 degrees per frame. With the filters also reset to their input, two consecutive canvas readbacks are pixel-identical |
| GUI textures idle          | With still input, no `AdvancedDynamicTexture` is marked dirty for 60 frames                                                                                                                                                                                                                                    |
| Noisy hands                | A seeded noisy hand pose aimed at a node: the hover target changes at most once per second                                                                                                                                                                                                                     |
| Held UI lag                | A controller animated with IWER's `animate_to`: the palette and wrist menu match the grip pose of the same frame within 1 mm                                                                                                                                                                                   |
| Two still hands            | Both hands holding the graph still: the graph root's transform does not change beyond the jitter tolerance                                                                                                                                                                                                     |
| Controllers select         | The right controller aimed at Medici, trigger pressed and released: a `select` command for Medici appears in the log                                                                                                                                                                                           |
| Hands select               | The same with an emulated pinch (`pinch` pose, `updatePinchValue`)                                                                                                                                                                                                                                             |
| Gear panel reachable       | The gear panel opens by ray on the gear, by poke on the gear from a neutral standing pose, by the off-hand stick click, and by both palms up for 1 s; no other panel's bounds overlap the gear zone; a technique switch toggles                                                                                |
| Every technique on and off | For each technique, inside the session: switch it on, check its meshes are in the active-mesh list and drawn, make its one `smoke` press, switch it off. No errors; no frame's JavaScript over 50 ms during either toggle; the scene's observer and mesh counts return to their earlier values                 |
| Toggle while pressed       | For each technique that claims a press: switch it off while it owns one. The preview is cancelled, the capture is released as `cancel`, no tint or transform is left behind                                                                                                                                    |
| The `everything` preset    | Each technique's smoke press in turn, with all 13 on; the winners match the input map's unit test                                                                                                                                                                                                              |
| Logging end to end         | A scripted walk of the journey with Done presses in the `baseline` preset, then a Flag: the log server returns the `step` entries and the `flag` entry for this session id                                                                                                                                     |
| Probe                      | The `probe` entry is logged with every field present                                                                                                                                                                                                                                                           |

The script writes a JSON report and a screenshot per profile and preset to `tmp/xr-sandbox/dryrun/`,
and exits non-zero on any failure.

### 11.3 What only the headsets can show

Real frame pacing, multiview and foveation, the GUI flicker bug, the OS gestures, real tracking
noise and everything Galaxy XR-specific. The first time on each headset: open the `baseline`
preset, read the `probe` entry, look for flicker with the gear panel open (and with multiview
switched on, to compare), watch the frame log (and on Quest, OVR Metrics' stale frames), then try
hands and controllers. That first check is done early, after build step 4 (section 13), because
Galaxy XR's fill rate, GUI flicker and the palm gesture could change choices the later techniques
build on.

## 12. Dependencies

| Package                                                        | Version                  | Why                                      | License      |
| -------------------------------------------------------------- | ------------------------ | ---------------------------------------- | ------------ |
| `@babylonjs/core`                                              | 8.56.2 (the workspace's) | Engine, WebXR                            | Apache-2.0   |
| `@babylonjs/gui`                                               | 8.56.2, exactly          | GUI 3D and 2D on meshes, VirtualKeyboard | Apache-2.0   |
| `@babylonjs/addons`                                            | 8.56.2, exactly          | MSDF text (the label experiment)         | Apache-2.0   |
| `@babylonjs/loaders`                                           | 8.56.2, exactly          | The MRTK button and controller models    | Apache-2.0   |
| `1eurofilter`                                                  | 1.3.x                    | Filtering                                | BSD-3-Clause |
| `handy-work`                                                   | latest                   | Pose recognition                         | MIT          |
| `fastest-levenshtein`, `double-metaphone`                      | latest                   | Chip matching                            | MIT          |
| `iwer`, `@iwer/devui` (dev)                                    | 2.5.x                    | Emulation                                | MIT          |
| graph-samples, graph-format, layout, algorithms, remote-logger | workspace                | Data, computation, logging               | MIT          |

Copied with license headers: Vimium's `hintStrings` (MIT); graphty-element's `twoHandGestureDelta`
with a comment naming the source and the issue asking for it to be exported. Open Brush
(Apache-2.0) is cited as the reference for the palette and the ring menu, not copied. Babylon
add-ons must match core exactly: a 9.x add-on pulls in a second core and breaks `instanceof`
between them.

## 13. Build order

1. remote-logger fixes (port cap, uncaught errors, flush on `pagehide`); file the three
   graphty-element issues.
2. Package skeleton, the two servherd servers (preview for headsets, dev for desktop), logging,
   the capability probe, frame statistics.
3. The graph view, the hand pose layer, the targeting layer, the arbiter with the input map and
   its unit test, the command layer, the gear panel, the step list, Flag.
4. The dry-run script with the device profiles, run against the `empty` and `baseline` presets.
   Then an optional five-minute check on each headset with `baseline`: the probe, the frame log,
   flicker.
5. Techniques in this order, each with its smoke press and a dry run after it: hover tag, visible
   undo, wrist menu, handling, node menus, pull to grow, Figma-like menus, physical tools, palette,
   text entry (its keyboard-poke spike first), dense picking, gestures, voice.
6. The full dry run on every preset, then the owner's first full try on each headset.

## 14. Deferred

Left out of the first build on purpose, each to be added only when the owner wants it:

- RayCursor as a target provider, and the slab's LassoGrid layout (section 9.9).
- The `touch` node menu style, and Kando's expert strokes for the ring (section 9.3).
- Drawn motions with the $Q recognizer (section 9.1).
- On-device speech on Quest with Moonshine, and with it the COOP/COEP headers (section 9.8).
- Replaying a real session headless with IWER's `ActionRecorder`; Flag's 10 s ring buffer covers
  the first need.
- Algorithms run in a worker over graph-format's wire form (section 3).
- A CI shard, coverage gate and wider CLAUDE.md entries, if the sandbox outlives its first round.
- In-headset reordering of technique priorities, and conflict warnings in the gear panel (the
  input map's unit test catches conflicts instead).
