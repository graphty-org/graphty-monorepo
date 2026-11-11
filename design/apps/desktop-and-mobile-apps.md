# Desktop and mobile apps: viability, features and feasibility

Status: research note, 2026-11-11. Recommendation: **not now** for native desktop or mobile apps.
Make the existing web app a complete installable progressive web app instead, and revisit native
packaging when a need appears that the web platform cannot meet.

The question: should graphty ship desktop and/or mobile apps beside the web app at graphty.app,
and on which framework? The graphty app is a React page around graphty-element, a web component
that draws with WebGL (or WebGPU when asked) through Babylon.js. Any app would wrap that same page
in a native shell, so the deciding questions are what a shell adds and whether its web view can
draw a large graph.

## 1. Recommendation

1. **No native app now.** Every candidate shell either ships its own Chromium (Electron: large,
   and a second browser to keep patched) or uses the system web view, which on Linux (WebKitGTK)
   has no WebGPU and drew the probe graph 25 to 30 times slower than Chromium on the same card
   (section 4). None of the app-only features in section 3 is asked for by a user today.
2. **Finish the progressive web app.** graphty already serves a web app manifest
   (`graphty/public/manifest.webmanifest`, `display: standalone`), so Chromium browsers can
   install it, and it already uses the File System Access API to reopen project files
   (`graphty/src/workspace/project/files.ts`). What is missing is a service worker (no offline
   start) and file handling (no "open with graphty" for graph files). Both are small and reach
   every desktop Chromium user without a store, a signing certificate or a second release train.
3. **If a native desktop app is ever needed, use Electron**, not Tauri: it is the only shell whose
   web view is the same Chromium on Windows, macOS and Linux, so WebGPU acceleration and rendering
   behave as they do in Chrome. Tauri's small download does not pay for losing WebGPU on Linux
   and testing three different engines.
4. **If a mobile store app is ever needed, use Capacitor** around the same built app: it is the
   thinnest wrapper over the system web view, and React Native or Expo would add a second UI
   runtime that graphty does not use. Measure first (follow-up below): phones are where memory
   and GPU limits bite.

## 2. Viability: what a native app gives that the web app cannot

| Capability                                  | Native shell                                                  | Installed web app today                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Install, own window, dock or taskbar icon   | Yes                                                           | Yes on desktop Chromium (manifest present); Safari "Add to Dock" on macOS; home screen on iOS and Android                           |
| Offline start                               | Yes                                                           | Not yet: graphty registers no service worker                                                                                        |
| Open local files and folders directly       | Yes                                                           | Chromium: File System Access API (files and folders, persistent handles); Safari and Firefox: file picker and drag only, no handles |
| File associations (double-click `.graphml`) | Yes                                                           | Chromium desktop only, through the manifest's `file_handlers` and `launchQueue`; not Safari, Firefox, iOS or Android                |
| Larger memory limits                        | Electron can raise the V8 heap limit; system web views cannot | Same per-tab limits as the browser (about 4 GB of JS heap on 64-bit Chromium)                                                       |
| Background work                             | Yes                                                           | Web workers while the page is open; no work after it closes                                                                         |
| Native menus, OS share sheet                | Yes                                                           | Web Share API on mobile and Safari; window controls overlay in Chromium; no native menu bar                                         |
| Drag and drop of files                      | Yes                                                           | Yes in every browser                                                                                                                |
| App store listing and discovery             | Yes                                                           | Microsoft Store and Google Play accept a packaged web app (PWABuilder, Trusted Web Activity); Apple's App Store does not            |

The gap that remains after a finished web app is narrow: file associations and folder access
outside Chromium, background work, a native menu bar, and the Apple App Store. None of those is a
reported need. graphty's promise ("Files are read on this computer", from the manifest) is already
met in the browser.

## 3. Features an app would add, ranked

| Rank | Feature                                                       | Where it belongs                                                                                                                                      |
| ---- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Offline start                                                 | graphty app (a service worker caching the built app); graphty-element only needs its assets to be cacheable, which they are as static files           |
| 2    | Open a graph file from the OS (file association, "open with") | graphty app registers the handler; the list of formats and extensions it accepts comes from graphty-element's format catalog, never a copy in the app |
| 3    | Reopen recent files and folders without a picker              | graphty app (already done for project files in Chromium)                                                                                              |
| 4    | Watch a file and reload when it changes on disk               | Reload of new data into a drawn graph is graphty-element's (any consumer would need it); noticing the change is the shell's                           |
| 5    | Larger graphs than a tab allows                               | graphty-element (memory per node, GPU-side layout); a shell only moves the ceiling a little                                                           |
| 6    | Native menus and keyboard accelerators                        | graphty app shell                                                                                                                                     |

Per the architectural principles in `CLAUDE.md`, nothing in a shell may detect, construct or
recover graph capabilities: WebGPU detection, renderer choice and file import stay in
graphty-element, and the shell only hands it bytes and reads its status.

## 4. Spike: graphty-element in each engine

`design/apps/webview-probe.html` loads graphty-element's self-contained bundle
(`graphty-element/dist/graphty.bundle.js`), builds a seeded graph of 10,000 nodes and 14,968
edges with the default force layout, and reports the WebGL renderer string, whether WebGPU has an
adapter, graphty-element's `rendererStatus`, the time to the first drawn frame, and the median and
95th-percentile interval of 300 animation frames while the layout runs. Put the bundle next to the
page, serve both over HTTPS (WebGPU needs a secure context) or load them into the shell under
test, and read the JSON it prints. `?renderer=auto` asks graphty-element for WebGPU;
`?nodes=N` changes the size.

It was run on Linux (Intel i9-14900, NVIDIA RTX 4070 SUPER) in three Playwright engines, headless,
with graphty-element as built on 2026-11-10. The frame cap was off for the GPU run, so its
intervals are the real cost per frame.

| Engine (stands in for)                            | WebGL renderer                | WebGPU adapter     | Renderer drawing                   | First frame | Frame ms, median / p95 | JS heap |
| ------------------------------------------------- | ----------------------------- | ------------------ | ---------------------------------- | ----------- | ---------------------- | ------- |
| Chromium 143 on the GPU (Electron, WebView2)      | ANGLE, Vulkan, RTX 4070 SUPER | nvidia lovelace    | webgl                              | 1.5 s       | 17.1 / 85.8            | 368 MB  |
| same, `renderer=auto`                             | same                          | same               | webgpu                             | 2.7 s       | 80.8 / 117.9           | 497 MB  |
| Chromium 143 with no GPU (SwiftShader)            | SwiftShader                   | google swiftshader | webgl                              | 1.8 s       | 1033 / 1350            | 202 MB  |
| same, `renderer=auto`                             | SwiftShader                   | google swiftshader | webgpu                             | 10.4 s      | 116.7 / 483.3          | 307 MB  |
| WebKit 26, Linux port (WebKitGTK, Tauri on Linux) | masked ("Apple GPU")          | none               | webgl                              | 2.8 s       | 497 / 803              | n/a     |
| same, `renderer=auto`                             | masked                        | none               | webgl (reason: no `navigator.gpu`) | 2.0 s       | 443 / 710              | n/a     |

What this shows:

- **Chromium on a real GPU draws a 10,000-node graph at about 60 frames a second** while the
  layout runs (WebGL). Electron and WebView2 are this engine.
- **The Linux WebKit engine has no WebGPU at all** and drew about 2 frames a second: Tauri on
  Linux would lose GPU acceleration and be far slower than Chrome on the same machine. The WebKit
  renderer string is masked, so whether it reached the card or fell back to software rendering is
  not known from this run; either way it is what a Tauri user on Linux would get.
- **graphty-element's fallback works**: asked for WebGPU where there is none, it drew with WebGL
  and said why in `rendererStatus.reason`.
- **Drawing with WebGPU was slower than WebGL on the NVIDIA card** (81 ms against 17 ms a frame)
  and faster on SwiftShader. That is a graphty-element performance question, independent of any
  app, and is filed as a follow-up.

Not measured here, and needed before any mobile or Apple decision: WKWebView on macOS and iOS,
WebView2 on Windows (expected to match Chromium), and Android System WebView. Safari 26 ships
WebGPU on macOS and iOS; whether an app's WKWebView gets it, and at what frame time, is what the
probe answers on a device.

## 5. Feasibility: the candidate frameworks

Sizes and costs are approximate (vendor documentation as of 2026) and are for comparison only.

| Framework                             | Platforms                               | Web view                                                       | WebGPU                                                             | Download size         | Memory                  | Updates and signing                                                           | Burden for a small team                                                    | License        |
| ------------------------------------- | --------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------- | ----------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------- |
| Progressive web app                   | Every platform with a browser           | The user's browser                                             | Where the browser has it (Chromium desktop and Android, Safari 26) | None beyond the site  | The browser's           | Instant on deploy; no signing                                                 | Lowest: one site, already built and released                               | n/a            |
| Electron                              | Windows, macOS, Linux                   | Bundled Chromium, the same on all three                        | Yes, as in Chrome (measured above)                                 | About 80 to 120 MB    | Highest (own browser)   | electron-updater; Apple notarization, Windows code signing                    | Medium: Chromium security updates track Electron releases                  | MIT            |
| Tauri 2                               | Windows, macOS, Linux, iOS, Android     | System: WebView2, WKWebView, WebKitGTK, Android System WebView | Windows yes; Linux no (measured); Apple and Android to be measured | About 3 to 10 MB      | Lower (shared web view) | Built-in updater with signed bundles; same OS signing as Electron             | Medium to high: three engines to test, Rust toolchain in CI                | MIT/Apache-2.0 |
| Capacitor (with or without Ionic)     | iOS, Android (desktop through Electron) | System: WKWebView, Android System WebView                      | To be measured on devices                                          | A few MB plus the app | Lower                   | Store releases; optional live web updates (Appflow, Capgo) within store rules | Medium: two store pipelines; Ionic UI is not needed (graphty uses Mantine) | MIT            |
| React Native or Expo, web view inside | iOS, Android                            | System web view inside a React Native screen                   | Same as Capacitor                                                  | Larger than Capacitor | Higher (two runtimes)   | Store releases; Expo updates for the JS bundle                                | Highest: a second UI runtime that wraps one web view                       | MIT            |

Release costs if a store app is built: Apple Developer Program 99 USD a year (needed for macOS
notarization as well as iOS), Google Play 25 USD once, a Windows code signing certificate or
Azure Trusted Signing (a few hundred USD a year, or about 10 USD a month). Apple review applies to
every iOS release; a web view wrapper with no native value risks rejection under App Store
guideline 4.2 (minimum functionality).

Tracking graphty-element releases: every shell would load the built graphty app, which already
pins graphty-element; a shell release would follow the app's `promote.yml` release rather than
have its own train. Store review delays mean a mobile app would always trail graphty.app.

## 6. Mobile constraints

- **Memory**: iOS ends a web view process well below a desktop tab's limit (often around 1 to
  1.5 GB on recent phones), and the probe's graph used 200 to 500 MB of JS heap before GPU
  buffers. 10,000 nodes is near the top of what a phone should be asked to hold until measured.
- **GPU**: phone GPUs are tile-based and throttle under sustained load; a force layout that redraws
  every frame is the worst case for battery and heat.
- **Touch**: canvas gestures (pinch, two-finger orbit, long press) are graphty-element's controls
  and must work the same in a browser and in any shell; that is element work whatever is decided
  here.
- **Screen size**: the app's side panels and dense compact-mantine controls are designed for a
  desktop window; a phone layout is a separate design task for the owner, not a packaging one.

## 7. Follow-up issues

- #6687: make graphty an offline-capable installed web app with file handling (service worker,
  manifest `file_handlers` fed from graphty-element's format catalog).
- #6688: run `design/apps/webview-probe.html` on macOS (Safari and WKWebView), Windows (WebView2), iOS
  and Android devices, and add the results to section 4.
- #6689: investigate why drawing a 10,000-node graph with WebGPU takes about 81 ms a frame against 17 ms
  with WebGL on an RTX 4070 SUPER.

Related: issue #39 (WebXR as a separate app layer over graphty-element).
