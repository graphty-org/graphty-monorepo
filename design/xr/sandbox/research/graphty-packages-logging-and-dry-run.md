# XR technique sandbox: graphty's own pieces, the rendering choice, logging and the dry run

Research for the VR technique playground (separate sandbox pages for Meta Quest 3 and Samsung
Galaxy XR). This part covers what graphty's own packages give the sandbox, whether to draw through
graphty-element or a plain Babylon.js scene, how a page in a headset reports problems back through
@graphty/remote-logger, how to emulate the headsets for a dry run, and the outside libraries that
touch those questions. Gesture, menu and GUI libraries are covered by the other research files.

All versions below are what the worktree `.worktrees/feat-xr-technique-sandbox` actually has
installed (`@babylonjs/core` 8.56.2, `iwer` 2.5.0). The main checkout's `node_modules` is stale
(`iwer` 2.1.1, core 8.43.0) -- do not reason from it.

## 1. Recommendations in one place

1. **Draw with a plain Babylon.js scene, fed by graph-samples, layout and algorithms.** Not
   graphty-element, for now. The techniques ARE the input handling, and graphty-element's XR input
   cannot be switched off (section 4). Record the element defects found; a later preset can move
   onto graphty-element once it lets a consumer turn its XR navigation off.
2. **Compute the layout once, before entering XR, and never animate it while in XR.** A running
   force simulation is the most likely source of "jittery images" in a graph scene. Florentine:
   `kamadaKawai(s, { dim: 3 })`; the dense graph: `forceAtlas2(s, { dim: 3, seed })`.
3. **Move the graph, never the camera.** Navigation (grab and turn, two-hand scale) transforms one
   graph root `TransformNode`, as graphty-element's `PivotController` does. Parenting the XR camera
   to a node broke hand positions in Babylon until PR 16969 (Aug 2025); not moving it avoids that
   whole class of bug.
4. **Parent hand-held UI to the controller grip or a hand joint node; do not copy poses in
   `onBeforeRenderObservable`.** Copying a pose in a before-render observer can read last frame's
   pose and makes the UI swim one frame behind the hand.
5. **remote-logger: start the HTTP server under servherd, and proxy it through the sandbox's Vite
   server.** Fix two small remote-logger defects first (section 3.3): it refuses any port above
   9099, which servherd will often assign, and it does not forward uncaught errors.
6. **Dry run on IWER 2.5 in headless Chromium**, reusing graphty-element's `installIWER` helper,
   with a jitter probe: hold the emulated head and hands still and assert every mesh's world matrix
   is identical frame to frame; move a controller and assert held UI matches the grip pose in the
   same frame (section 5).
7. **Babylon add-ons must match core exactly:** `@babylonjs/gui@8.56.2` and
   `@babylonjs/addons@8.56.2` (npm's latest is 9.30.0; a 9.x add-on pulls a second copy of core and
   breaks `instanceof` checks between them).
8. **Text: MSDF (`@babylonjs/addons` `TextRenderer`) for name tags and hint tags**, not WebXR
   layers: Chrome on Android XR does not list the Layers module, and MSDF stays sharp at any
   distance on both headsets.

## 2. graphty's own data, algorithms and layout

Checked by running `scripts/florentine-check.mjs` against the worktree's builds:

```
Strozzi 0.088, #3  1 hop: 4  2 hops: +4
Medici 0.146, #1  1 hop: 6  2 hops: +5
```

So the brief's examples come straight out of graphty's packages: the hover name tag
"Strozzi 0.088, #3" is `pageRank(s).scores` plus a sort, and the pull-to-grow readout "1 hop: 6"
is the Medici's `breadthFirstSearch(s, i, { maxDepth: 1 }).depth` counted.

| Need                                            | Package and call                                                                                                                                                                                       | Notes                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Florentine families                             | `@graphty/graph-samples/datasets/florentine-families`: `florentineFamilies()`                                                                                                                          | 15 families, 20 marriages, node ids are the family names. MIT, in repo                                                                            |
| A dense graph                                   | `@graphty/graph-samples/generators`: `plantedPartitionGraph({ groups, groupSize, pIn, pOut, seed })` (has a `community` column), `barabasiAlbertGraph({ n, m, seed })`                                 | Seeded, identical on every machine. A few hundred to 2,000 nodes exercises dense picking and the slab                                             |
| Snapshot                                        | `@graphty/graph-format`: `fromEdgeArrays(sampleGraph)`; ids via `s.ids.requireIndex(name)` / `s.ids.idOf(i)`                                                                                           | Every algorithm and layout takes the snapshot                                                                                                     |
| PageRank (tag, voice "color these by PageRank") | `@graphty/algorithms`: `pageRank(s)` -> `{ scores, iterations, converged }`; also `personalizedPageRank`                                                                                               |                                                                                                                                                   |
| Neighborhood growth (pull to grow)              | `breadthFirstSearch(s, source, { maxDepth })` -> `depth` per node                                                                                                                                      | Count `depth <= k` for the live readout; recompute only when `k` changes                                                                          |
| Sieve (filter preview)                          | `degrees`, `degreeCentrality`, `betweennessCentrality`, `kCoreDecomposition`, `louvain`, `connectedComponents`                                                                                         | A filter is a predicate over a result vector: preview = dim the rest, commit = apply                                                              |
| Probe (read a node or a result)                 | the same result vectors, indexed by node                                                                                                                                                               |                                                                                                                                                   |
| Layout                                          | `@graphty/layout`: `kamadaKawai`, `forceAtlas2`, `fruchtermanReingold`, `spectral`, `circular`, `shell`... all take `{ dim: 3, scale, center, seed }` and return `{ positions: Float32Array, dim, n }` | Compute once. The steppable simulations (`createSimulation`) exist if a technique wants a live relayout, but keep them out of the default presets |

graph-samples' `toElementData(graph)` turns a sample into `nodeData`/`edgeData` records, which is
the path if a preset later renders through graphty-element.

## 3. @graphty/remote-logger

### 3.1 How a page sends logs

Three ways, all in `remote-logger/README.md`:

- **Script tag:** `<script src="https://<host>:<port>/remote-logger.js">`. The server serves a
  self-configuring bundle that intercepts `console.log/warn/error/info/debug` and batches them to
  `POST /log`. Add `?ui=true` for the floating capture widget (useless inside an immersive
  session). `window.__remoteLogger__` exposes the client.
- **npm client:** `new RemoteLogClient({ serverUrl, sessionPrefix: "xr-sandbox", throttlePatterns })`
  then `client.log(level, message, data)`; batched every second, retried with backoff.
  `throttlePatterns` matter here: per-frame logs (poses, hover) must be throttled.
- **Vite plugin** `remoteLoggerPlugin()` from `@graphty/remote-logger/vite` defines the project
  marker (the worktree name, here `feat-xr-technique-sandbox`) so the server files the logs per
  worktree.

graphty-element also has its own sink (`?graphty-element-logging=true&graphty-element-remote-log=<url>`),
only relevant if a preset renders through the element.

### 3.2 How to start the server and read the logs

```jsonc
servherd_start({ name: "xr-sandbox-logs", cwd: "<worktree>/remote-logger", protocol: "https",
  command: "node bin/remote-log-server.js --http-only --port {{port}} --cert {{httpsCert}} --key {{httpsKey}}" })
```

- HTTPS is required: the sandbox page is HTTPS (WebXR needs a secure context off localhost), and an
  HTTPS page cannot post to an HTTP log server. servherd's certificate `/home/apowers/ssl/atoms.crt`
  is a full chain (3 certificates), Let's Encrypt, `*.ato.ms`, valid to 2026-12-16, so both
  headsets trust it as long as `dev.ato.ms` resolves to this machine on the LAN.
- Simpler for the headset: proxy the logger through the sandbox's own Vite server
  (`server.proxy: { "/remote-log": { target: <log server URL>, rewrite } }`), so the page posts to
  its own origin: one URL, no second certificate prompt, no CORS. (The server already answers
  `Access-Control-Allow-Origin: *`, so a direct post works too.)
- Reading: `GET /logs/recent?n=200`, `/logs/errors`, `/logs`; and every entry is also appended to
  `$TMPDIR/remote-logger/<marker>/logs.jsonl` (`/tmp/remote-logger/feat-xr-technique-sandbox/logs.jsonl`),
  which Claude can read with no MCP at all.
- The MCP server configured in `~/.claude.json` (`remote-logger`, stdio, from
  `.worktrees/remote-logging`) failed to connect in this session; the HTTP endpoints and the JSONL
  file make it unnecessary.

### 3.3 Defects found (fix in remote-logger, not in the sandbox)

1. **Any port above 9099 is refused.** `findAvailablePort` stops scanning when `port > maxPort`, and
   `MAX_PORT_NUMBER` is 9099 with no CLI option to change it, so `--port 9500` fails at startup
   with "Could not find available port after 0 attempts starting from 9500. Ports 9500-9099 are all
   in use". Verified with `scripts/port-cap-check.mjs` (calls the function, binds
   nothing). servherd assigns 9000-9999, so most assignments fail. Smallest fix, non-breaking: use
   `Math.max(MAX_PORT_NUMBER, requestedPort)` as the cap (`remote-logger/src/server/dual-server.ts`).
2. **Uncaught errors and unhandled promise rejections are not forwarded.** Neither the client nor
   the browser bundle listens for `error` or `unhandledrejection`, which is exactly what a headset
   crash produces. Add both listeners to the bundle (and an opt-in on the client).
3. **No flush on `pagehide`.** Up to one batch (1 s) is lost when the headset closes or backgrounds
   the tab. Flush on `pagehide`/`visibilitychange` with `fetch(..., { keepalive: true })`.

Until they land, the sandbox can register the two error listeners itself (two lines, marked
temporary).

### 3.4 In-headset view of the log

No library found that shows a console inside an immersive session (eruda and vConsole are DOM
overlays, invisible in VR). A small Babylon GUI panel on the wrist or palm menu showing the last
10 lines from the same console interception is a few dozen lines; make it a technique-independent
toggle. On Quest, the system-level **OVR Metrics Tool** overlay shows FPS and stale frames per
second, the objective measure for "jittery" during the dry run on the device.

### 3.5 Desktop debugging of the real headsets

Both headsets support Chrome DevTools remote inspection over USB (`chrome://inspect#devices`,
developer mode, `adb`); `adb reverse tcp:<port> tcp:<port>` also lets the headset reach a local
port. remote-logger is still the main path because it works without a cable and records what
happened while the owner was in the headset.

## 4. graphty-element or a plain Babylon.js scene

### What graphty-element exposes

- `getScene()` (public since 1.5.0), `getMeshCache()`, `graph.getNode(id).mesh` (instanced meshes
  carrying `metadata` with the node id for XR ray picks), `addListener("node-click" | "node-hover" |
"node-drag-start" | ...)`, `enterXR("immersive-vr")`, `exitXR()`, `xr-session-started/ended`
  events, `getXRConfig()`, `setXRConfig()`, and `graph.getXRSessionManager().getXRHelper()` (the
  Babylon `WebXRDefaultExperience`).
- Styling through style layers, algorithms through its catalog, rich-text labels (DynamicTexture).

### What blocks it for this sandbox

- **The element's XR input is mandatory.** `Graph.enterXR` always creates an
  `XRPivotCameraController`, which creates an `XRInputHandler` that owns both thumbsticks (yaw,
  pitch, pan, zoom), two-hand pinch zoom and rotate, and node dragging through `NodeBehavior`. It is
  reachable only through `scene.metadata.xrCameraController`, which is private.
- **The config flags that look like off switches are ignored.** `XRInputConfig` has `controllers`,
  `nearInteraction` and `physics`, but only `handTracking` is read anywhere in `src/`
  (`XRSessionManager` passes it as `disableHandTracking`). Setting `controllers: false` changes
  nothing. That is a defect: graphty-element's principles say every behavior a consumer might want
  either way is an option.
- Every technique in the brief (gestures, pull to grow, grab and turn, two-hand scale, palette,
  slab) is input handling; with the element's handler running, each would fight it, and turning
  techniques on and off independently would be impossible.

### Weighing

|                               | graphty-element                                                              | Plain Babylon.js scene + graphty packages                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Realism of the graph          | Real styling, labels, layouts                                                | Spheres, lines and MSDF tags; enough for judging controls (the prototypes doc fixes the look and varies only controls)     |
| Reuse of algorithms and data  | Through the element                                                          | Direct calls to algorithms, layout, graph-samples (section 2)                                                              |
| Owning XR input per technique | Blocked (above)                                                              | Full: one `WebXRDefaultExperience`, each technique registers and unregisters its own observers                             |
| Attaching UI to meshes        | Possible via `getScene()`, but meshes are instanced and owned by the element | Own meshes, thin instances or plain meshes, parent anything to anything                                                    |
| Jitter risk                   | Element animates layout and owns the camera pivot                            | Static layout, nothing moves unless a technique moves it                                                                   |
| Size of the renderer          | 0 lines                                                                      | About 150 lines (node spheres as thin instances, edges as one `LineSystem`, a root node)                                   |
| Transfer of findings          | Direct                                                                       | A technique the owner likes is later ported into the element; the port is where the element's XR input gets its off switch |

**Decision recommended:** plain Babylon.js for the playground; file the two element defects
(ignored `xr.input.controllers`/`nearInteraction`/`physics`; no supported way to turn the built-in
XR navigation off) so a later preset can render through graphty-element. Reversible: the renderer
sits behind one small "graph view" module.

## 5. Headset emulation for the dry run (IWER)

- **Reuse:** `graphty-element/test/interactions/helpers/iwer-setup.ts` `installIWER(refuse?)`:
  forces IWER over Chromium's native `navigator.xr`, emulates a Quest 3, and records every session
  with its frame count. The `xr` vitest project (`graphty-element/vitest.config.ts`) shows the
  setup: browser mode, Playwright Chromium, headless, `optimizeDeps.include: ["iwer"]`,
  `fileParallelism: false`.
- **IWER 2.5.0 (MIT, Meta, updated 2026-09)** has more than the helper uses:
    - hands with `poseId` (`default`, `pinch`, plus shipped `point` and `relaxed` poses; custom poses
      can be registered as joint matrices) and `updatePinchValue(v)` for gradual pinches;
    - `device.remote.dispatch(...)`: `animate_to`, `set_transform`, `look_at`, `select`,
      `set_input_mode`, `set_gamepad_state` -- frame-synchronized scripted driving, ideal for a dry
      run script;
    - **`ActionRecorder` / `ActionPlayer`**: records head, controller, hand joint and gamepad frames
      from a REAL session and replays them. Recording on the owner's Quest (behind a toggle, uploaded
      through the logger) and replaying it headless would reproduce a reported problem exactly.
    - Device profiles: Quest 1/2/3/Pro and Meta VR Glasses only. **No Galaxy XR / Android XR
      profile**; build one from `metaQuest3` with a Chrome-on-Android user agent and the generic hand
      profile. Emulation cannot reproduce Galaxy XR's real tracking, permissions prompts (hand data is
      permission-gated on Android XR) or performance -- those need the device.
- **`@iwer/devui`** (MIT): a desktop overlay to drive the emulated headset by mouse and keyboard;
  useful for quick looks in a desktop browser. **`@iwer/sem`** (synthetic AR rooms) is not needed:
  the sandbox is VR only.
- **Jitter probe for the dry run** (no library does this; small test code):
    1. Freeze head and inputs; over 120 frames record the world matrix of the graph root, every UI
       mesh and a sample of nodes; any change is jitter.
    2. Animate a controller with `animate_to`; each frame compare a held UI mesh's world position
       with the grip pose IWER reports for that frame; a one-frame lag shows as a constant offset
       along the motion.
    3. Count XR frames per wall-clock second (the helper already counts frames) to catch a stalled
       loop.
    4. Pick checks: point the emulated ray at a known node, assert hover fires on that node id.
       Screenshots only confirm something is drawn; headless Chromium renders XR through SwiftShader.

## 6. Candidates found outside the repository

| Candidate                                                      | What it does                                                                   | License, maintenance                                    | Covers for us                                             | Would add or fix                                                        | Link                                                                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| @graphty/remote-logger 2.0.13 (repo)                           | Browser console to server, REST, JSONL, MCP                                    | MIT, this repo                                          | Headset log capture entirely                              | Port cap above 9099; uncaught errors; pagehide flush (3.3)              | `remote-logger/README.md`                                                                                                                |
| graph-samples, graph-format, algorithms 3.3, layout 2.2 (repo) | Data, snapshot, PageRank, BFS, filters, 3D layouts                             | MIT, this repo                                          | All graph computation the techniques show                 | Nothing found missing                                                   | section 2                                                                                                                                |
| graphty-element 2.6 (repo)                                     | The real renderer, with XR                                                     | MIT, this repo                                          | Realism, styling                                          | Honor `xr.input.controllers` etc.; option to turn its XR navigation off | section 4                                                                                                                                |
| iwer 2.5.0                                                     | WebXR runtime emulation, Quest profiles, hands, remote control, record/replay  | MIT, Meta, active (2026-09)                             | Headless dry run, scripted input, replay of real sessions | Galaxy XR profile; custom hand poses for gesture tests                  | https://github.com/meta-quest/immersive-web-emulation-runtime                                                                            |
| @iwer/devui 2.5.0                                              | Desktop UI to drive IWER                                                       | MIT, active                                             | Manual desktop checks                                     | --                                                                      | same repo                                                                                                                                |
| @babylonjs/core 8.56.2 WebXR                                   | `WebXRDefaultExperience`, hand tracking, near interaction, pointer selection   | Apache-2.0, very active                                 | Session, hands, controllers, picking                      | Use the worktree's version; do not mix 9.x add-ons                      | https://doc.babylonjs.com/features/featuresDeepDive/webXR                                                                                |
| @babylonjs/addons 8.56.2 MSDF `TextRenderer`                   | Sharp, scalable, billboarded text                                              | Apache-2.0, in 8.56.2 (`msdfText/`)                     | Name tags, hint tags, readouts                            | Generate one MSDF font atlas (msdf-bmfont)                              | https://doc.babylonjs.com/addons/msdfText/                                                                                               |
| @babylonjs/gui 8.56.2                                          | 2D/3D GUI (panels, NearMenu, HandMenu, slates, VirtualKeyboard)                | Apache-2.0                                              | In-VR log panel; menus (other research files)             | Pin to 8.56.2                                                           | https://doc.babylonjs.com/features/featuresDeepDive/gui                                                                                  |
| babylon-forcegraph (apowers313)                                | Force-directed graph in Babylon with VR/AR demos on Quest 3, ngraph/d3 engines | Owner's own 2024 project, superseded by graphty-element | Shows a plain-Babylon graph in XR works                   | No hand or menu interaction; not needed beyond reference                | https://github.com/apowers313/babylon-forcegraph , https://forum.babylonjs.com/t/3d-vr-ar-force-directed-graph/49886                     |
| 3d-force-graph-vr 3.1.2                                        | Graph in VR on A-Frame and three.js, d3-force-3d                               | MIT, maintained (2026-08)                               | Laser hover/click on nodes only                           | Different engine (three.js); no hands, menus or tools. Reference only   | https://github.com/vasturiano/3d-force-graph-vr                                                                                          |
| ngraph.forcelayout 3.3.1                                       | Force layout                                                                   | BSD-3, last release 2022                                | Nothing graphty's layout lacks                            | Not needed                                                              | https://github.com/anvaka/ngraph.forcelayout                                                                                             |
| eruda 3.4.3 / vConsole 3.15.1                                  | In-page DOM consoles                                                           | MIT                                                     | Only the 2D page before entering VR                       | Invisible in an immersive session; not needed                           | https://github.com/liriliri/eruda                                                                                                        |
| webxr-polyfill 2.0.3                                           | Old WebXR polyfill                                                             | Apache-2.0, unmaintained since 2022                     | Nothing (IWER replaces it)                                | Do not use                                                              | https://github.com/immersive-web/webxr-polyfill                                                                                          |
| OVR Metrics Tool                                               | System overlay: FPS, stale frames, GPU/CPU levels on Quest                     | Free, Meta                                              | Objective on-device jitter check                          | Quest only                                                              | https://developer.oculus.com/documentation/tools/tools-ovrmetricstool/                                                                   |
| Chrome DevTools remote debugging                               | Inspect a headset tab over USB                                                 | --                                                      | Live console and profiler on both headsets                | Needs a cable and developer mode                                        | https://developers.meta.com/vr/documentation/web/browser-remote-debugging/ , https://developer.chrome.com/docs/devtools/remote-debugging |

## 7. Device facts that shape the sandbox

- **Quest 3 (Quest Browser):** hands (26 joints) and Touch Plus controllers; WebXR hand tracking is
  an optional session feature Babylon requests by default.
- **Galaxy XR (Chrome on Android XR):** hand input is the default input; supported modules are the
  Device API, AR, Gamepads, Hit Test, Hand Input, Anchors, Depth Sensing and Light Estimation
  (https://developer.android.com/develop/xr/web). No Layers module listed. Hand, eye and face data
  sit behind permission prompts, so the first session shows prompts; the sandbox must still work
  when hand data is refused (controllers or gaze-and-pinch only). Controllers are sold separately.
- Performance knobs Babylon exposes for both: `framebufferScaleFactor` in
  `outputCanvasOptions.canvasOptions` and fixed foveation; thin instances keep the mesh count low
  (Babylon's per-mesh iteration is the usual XR bottleneck), and render loops must not allocate per
  frame.

Scripts used: `scripts/florentine-check.mjs`,
`scripts/port-cap-check.mjs`.
