# XR technique sandbox: how to try it

The XR technique sandbox is a separate web page, not graphty-element's XR mode, for trying VR
control techniques on a graph in a headset and forming opinions about them. Every technique is a
module you can switch on or off, so techniques can be mixed and matched. A preset is a named mix,
opened by its own URL. The code is in `xr-sandbox/` at the repository root. The design is in
`design.md` beside this file, and the build order in `plan.md`.

## Opening it in the headset

The sandbox is served over HTTPS on the LAN at **https://dev.ato.ms:9375/**. That address is the
production build. servherd runs it as `xr-sandbox` and picked the port; if the server is ever
recreated and the port changes, `servherd_list` shows the new one.

- **Meta Quest 3:** open Quest Browser, type the address, and press Enter VR on the page.
- **Samsung Galaxy XR:** open Chrome, type the address, and press Enter VR.

For voice or dictation on either headset, tick "Arm the microphone" on the landing page before
entering, so the browser asks for the microphone outside the immersive session.

The landing page lists every preset, one link for each technique on its own, the step lists, the
session id, and a choice of VR or passthrough AR. If a headset cannot open `dev.ato.ms` (some
routers refuse a public name that points at a LAN address), tell me: the fallback is a USB
connection with `adb reverse`, which needs a plain HTTP server and, on Galaxy XR, developer mode.

### Presets

| Preset                  | URL                                              | What it compares                                                                                              |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Empty                   | https://dev.ato.ms:9375/?preset=empty            | Nothing on; switch techniques on in the headset                                                               |
| Baseline                | https://dev.ato.ms:9375/?preset=baseline         | Hover tag, node menus (list style), wrist menu, visible undo: the control every other preset is compared with |
| Baseline + pull to grow | https://dev.ato.ms:9375/?preset=baseline-pull    | Getting a neighborhood: pulling against the menu                                                              |
| Baseline + palette      | https://dev.ato.ms:9375/?preset=baseline-palette | Color by: the palette against the menus                                                                       |
| Baseline + Figma menus  | https://dev.ato.ms:9375/?preset=baseline-figma   | Color by: desktop-style panels against the menus                                                              |
| Baseline + voice        | https://dev.ato.ms:9375/?preset=baseline-voice   | Neighborhood and color by: voice against the menus                                                            |
| Hands first             | https://dev.ato.ms:9375/?preset=hands-first      | Bare hands, few panels: gestures, pull to grow, handling, hover tag, wrist menu, undo                         |
| Palette                 | https://dev.ato.ms:9375/?preset=palette          | A Tilt Brush-style off-hand palette with the physical tools                                                   |
| Figma                   | https://dev.ato.ms:9375/?preset=figma            | Desktop-style panels in space; the keyboard against dictation                                                 |
| Voice                   | https://dev.ato.ms:9375/?preset=voice            | Speech with the chip sentence                                                                                 |
| Dense                   | https://dev.ato.ms:9375/?preset=dense            | Picking in a crowded 480-node graph, with hint tags and the slab                                              |
| Dense, hint tags only   | https://dev.ato.ms:9375/?preset=dense-hints      | Picking with hint tags alone                                                                                  |
| Dense, slab only        | https://dev.ato.ms:9375/?preset=dense-slab       | Picking with the slab alone                                                                                   |
| Example module          | https://dev.ato.ms:9375/?preset=example          | The smallest technique: A cycles the coloring, undo names the step                                            |
| Everything              | https://dev.ato.ms:9375/?preset=everything       | Every technique at once: the stress test for which technique gets a press                                     |

The Florentine families graph is the default. One technique on its own:
`https://dev.ato.ms:9375/?preset=empty&on=<technique>`, with the technique names in the table
under "The techniques". Other URL options: `on=a,b` and `off=c` change a preset's mix,
`s.<technique>.<setting>=<value>` sets a setting, `graph=dense&n=480&seed=7` picks the larger
seeded graph, `mode=ar` starts in passthrough, and `steps=journey` (or `q2`, `q3`, `q4`, `q6`)
shows a list of tasks to try, with Done and Skip.

## Switching techniques in the headset

The gear panel switches each technique on or off and shows its settings. It has three tabs:
Techniques, Framework (framework settings and actions) and Input map (which technique answers
which button or gesture right now). Its title bar shows the session id and the build time. There
are three ways to open it, and no technique can take any of them:

- the Gear button, low and to the left, pressed with a ray or a fingertip;
- with controllers, a click of the off-hand thumbstick;
- with hands, both palms facing up, held for 1 second.

## The techniques

Each technique folder under `xr-sandbox/src/techniques/` has a README with its full list of gaps:
what it reuses, and what we would fix or replace later. The main ones:

| Technique (name in URLs)          | What it does                                                                                                                                                              | Known gaps                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gestures (`gestures`)             | Static hand poses (handy-work's matcher, forked) and Quest thumb microgestures, each bound to a command in the gear panel; a recorder captures your own poses             | The pose templates were recorded on someone else's hands; thumbs up and fist are close; no drawn motions; microgestures unverified on a real Quest       |
| Palette (`palette`)               | A five-face prism on the off hand (Analyze, Style, Filter, Selection, History), turned by the off stick or a pinch-drag on its rim; cards tear off and stay where dropped | Flat buttons with no press depth; no coasting or haptic ticks when turning; the rim drag on Galaxy XR is checked only in emulation                       |
| Node menus (`node-menus`)         | Point at a node and hold still (or press B or Y) for its verbs; on empty space, graph verbs. Two styles: a ring steered by the wrist, or a list of buttons                | One level only; the ring is steered unfiltered; the list does not follow a moved graph                                                                   |
| Figma menus (`figma-menus`)       | A floating toolbar, a layer list, an inspector and a context popover by the selected node                                                                                 | No reordering in the layer list; the inspector edits nothing; "Show" is two undo steps                                                                   |
| Hover tag (`hover-tag`)           | Pointing at a node shows its name, value and rank ("Strozzi 0.088, #3") before any press                                                                                  | Plain textures, not sharp text; can cover a neighbor's label in a crowded graph                                                                          |
| Pull to grow (`pull-to-grow`)     | Pinch a node and pull: one hop per 8 cm, a live readout ("1 hop: 6"); release commits, release near the node cancels                                                      | Counts movement in any direction; holding still 300 ms first opens the node menu instead                                                                 |
| Physical tools (`physical-tools`) | A sieve (hold to preview a filter, press to keep it) and a probe that reads a node or the shown result, on a rack beside the graph                                        | One threshold only, no range; the rack's place is a guess; wrist roll is off by default                                                                  |
| Voice (`voice`)                   | Hold X (or the mic chip) and speak; the sentence shows as chips; poke a chip to change one word; the same sentence can be built by poking alone                           | On Quest there is no Web Speech, so it uses the system keyboard's dictation (no interim words); unknown whether listening blurs the session on Galaxy XR |
| Dense picking (`dense-picking`)   | Two-letter hint tags over the nodes near the ray, typed on a small keyboard; a plate in the off hand pushed through the graph that draws a thin slice flat                | Tags do not follow the ray once shown; saying a tag needs voice; the plate is not smoothed against tremor                                                |
| Handling (`handling`)             | Grab and turn the graph with one hand, scale and turn with two, and a small held copy in the off hand you can point at                                                    | The held copy and the palette share the off hand; scale is clamped 0.2x to 5x                                                                            |
| Text entry (`text-entry`)         | An in-scene keyboard and a dictation key, opened when another technique asks for text (a note on a node)                                                                  | No press depth or debounce; single line; no cursor movement                                                                                              |
| Wrist menu (`wrist-menu`)         | Undo (naming its step), Redo, Save, Settings, Steps, Recenter and Flag beside the off hand when its palm faces across the body, or on the off controller                  | Palm thresholds are first guesses; may flicker at the edge of the pose; hand variant unverified on Galaxy XR                                             |
| Visible undo (`visible-undo`)     | A toast beside the hand after each step ("Colored by PageRank -- Undo") and a strip above the graph whose Undo button names the step                                      | Undo is linear; the strip can block the ray to the top of the graph (see below)                                                                          |
| Example (`example`)               | A minimal technique to copy when adding a new one                                                                                                                         | --                                                                                                                                                       |

## Reporting a problem

Every session sends its logs to a log server on this machine, from the first frame: every press
and which technique took it, every command, the frame times, and any error. You do not need to
do anything to turn it on. The page posts to `https://dev.ato.ms:9375/remote-log`, which
forwards to the log server (servherd `xr-sandbox-remote-logger`).

When something feels wrong, press **Flag**: on the wrist menu, in the gear panel's Framework tab,
or both thumbstick clicks at once on controllers. The headset shows a short id such as "F3", and
the log records the graph's state, the techniques on, and the last 10 seconds of input. Then tell
me the id and what felt wrong ("F3: the menu opened when I meant to pull"). The session id on the
landing page and in the gear panel's title bar helps if you used more than one session.

## Dry run before your first try

The sandbox was run on emulated headsets (Meta's IWER emulator in headless Chromium): Quest 3
with controllers and with hands, and a Galaxy XR approximation with hands, with controllers and
with no hand tracking. Every preset, and every technique on its own, was entered in VR on all five.
Nothing catastrophic or blocking remains.

- **Steadiness:** with the head still, nothing moved (0.0000 mm, 0.00000 degrees per frame), and
  no panel or label redrew itself.
- **Frame time:** the page's JavaScript took 1.7 to 3.6 ms per frame at the 95th percentile, on
  the Florentine graph and the 480-node graph.
- **Controllers and hands:** trigger and pinch select the node under the ray on every preset; the
  gear panel opens by ray and by stick click; each technique's own check passes, including voice
  failing politely with no microphone or no speech support.
- **A task list:** the 11-step journey completed in the Baseline and Figma presets on two
  headset profiles each.
- **Logs** reached the log server on every run.
- **Fixed before you try it:** the slab in the dense presets turned the whole view white; a
  journey step could ask for a note on a family the previous step had hidden.

Emulation cannot show real frame pacing, tracking noise, the operating system's own gestures, or
anything specific to Galaxy XR. Those need the headsets.

Things you will probably notice:

- The undo strip sits above the graph and can block a chest-height ray to the top families, such
  as Castellani; raise your hand or move. In the dense presets it also covers the bottom row of the
  hint-tag keyboard.
- In Everything, panels overlap above the graph, and the slab's plate can hang over the Gear
  button when the off hand rests low.
- Some journey steps have no way to do them in some mixes (Baseline cannot size by a result or
  filter at a chosen value; Figma cannot size or filter). Press Skip.
