# Interaction Testing Infrastructure

This directory contains comprehensive tests for user input handling across all supported input methods: mouse, keyboard, touch, and WebXR controllers.

## Test Categories

### Unit Tests (`unit/`)

Which way and how fast each mouse, wheel, key and touch input moves the 2D and 3D camera is in `real-input.test.ts` and `camera-behavior.test.ts` here, and in `test/browser/2d-camera-controls.test.ts` and `test/browser/3d-camera-controls.test.ts`.

| File                   | Description                                                 |
| ---------------------- | ----------------------------------------------------------- |
| `xr-direction.test.ts` | Verifies XR thumbstick mappings for rotation, pan, and zoom |
| `deadzone.test.ts`     | Tests deadzone filtering and threshold behavior             |

### Integration Tests (`integration/`)

These mount a `<graphty-element>` (`helpers/mounted-element.ts`), drive it with real browser input (`test/helpers/real-input.ts`), let the render loop run and read the outcome through the element's public API.

| File                        | Description                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `mouse-controls.test.ts`    | Which way a 3D drag turns the camera, in proportion to the drag; the wheel in 3D            |
| `keyboard-controls.test.ts` | A held key stops when focus leaves the canvas; a modifier makes a key a page shortcut       |
| `touch-controls.test.ts`    | Pinching zooms out in 2D and 3D; one finger turns the 3D camera, two fingers turned spin it |

### XR Tests (`xr/`)

These enter VR on an emulated Meta Quest 3 and move its thumbsticks and hands (`helpers/xr-input-driver.ts`, over IWER in `helpers/iwer-setup.ts`). The test that starts real VR and AR sessions, through IWER (Immersive Web Emulation Runtime), is `test/browser/xr-session.test.ts`.

| File                         | Description                                                      |
| ---------------------------- | ---------------------------------------------------------------- |
| `xr-thumbstick.test.ts`      | Thumbstick rotation, pan, zoom                                   |
| `xr-gestures.test.ts`        | Controller trigger, node drag, two-hand gestures                 |
| `xr-hand-tracking.test.ts`   | Pinch gestures, hand tracking                                    |
| `xr-input-switching.test.ts` | Controllers put down and picked up, a hand losing tracking       |
| `xr-local-space.test.ts`     | Sticks and grabs move things in the reader's own frame           |
| `xr-voice.test.ts`           | Voice in an immersive session: push-to-talk, wrist orb, pointing |

### Edge Cases (`edge-cases/`)

Tests for complex scenarios, state transitions, and edge cases.

| File                            | Description                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `node-drag-drop.test.ts`        | Node drag behavior, camera isolation during drag                                    |
| `pin-on-drag.test.ts`           | A dragged node is pinned or not as pinOnDrag says; a pin holds under a force layout |
| `view-mode-transitions.test.ts` | After 2D/3D switches a drag does what the view shown does; undo restores Z          |
| `input-sequences.test.ts`       | Clicks, a drag let go far away, a view switch or new nodes while the button is down |

### Selection (`selection/`)

| File                            | Description                                                  |
| ------------------------------- | ------------------------------------------------------------ |
| `node-selection-click.test.ts`  | Clicking a node selects it, in 2D and 3D                     |
| `halo-on-hover.test.ts`         | A layer's halo channels draw the halo on the hovered node    |
| `halo-over-edges.test.ts`       | A selected node's halo is drawn over crossing edges          |
| `selection-halo-shape.test.ts`  | The halo follows the shape of the node it rings              |
| `capped-selection-halo.test.ts` | A selection that is full draws no halo for a node it refused |

### Top-level tests

Each file in this directory drives one feature with real input and reads the outcome through the
public API. `real-input.test.ts` is the pattern for a new test. The others: `autosave-drag`,
`camera-behavior`, `expand-real-input`, `filter-keeps-camera`, `flat-shape-click`,
`hover-ends-on-leave`, `input-recording`, `label-close-button`, `label-screen-fit`,
`location-map-input`, `pointer-on-rows`, `render-on-demand`, `restyle-under-input`,
`selection-mark-contrast`, `stable-frame-waits-for-pending-visuals` and `union-hover`; the
`@file` comment at the top of each says what it covers.

## Running Tests

### All Interaction Tests

```bash
npm run test:interactions
```

### By Category

```bash
# Unit tests only
npm run test:interactions:unit

# Browser integration tests
npm run test:interactions:browser

# XR emulation tests
npm run test:interactions:xr

# Edge case tests
npm run test:interactions:edge-cases
```

### Running Individual Test Files

```bash
# Run a specific test file
npx vitest run --project=interactions test/interactions/integration/mouse-controls.test.ts

# Run tests matching a pattern
npx vitest run --project=interactions --filter="Direction"
```

### Watch Mode

```bash
npx vitest --project=interactions
```

## Prerequisites

The tests run in Vitest's browser mode and mount the element themselves; nothing else needs to be running.

### For XR Tests

IWER is already installed as a dev dependency. No additional setup required.

## Debugging Failing Tests

### Common Issues

1. **Hang guard errors**: May indicate the graph never settled. Check if layout is working correctly.

2. **Direction test failures**: Usually indicates a regression in input handling. Check the input controller code.

3. **XR test failures**: May indicate IWER API changes or WebXR implementation issues.

### Debugging XR Tests

```bash
# Run XR tests with verbose output
npx vitest run --project=interactions test/interactions/xr/ --reporter=verbose

# Run in headed mode to see what's happening
npx vitest run --project=interactions test/interactions/xr/ --browser.headless=false
```

### Adding Debug Output

In test files, you can add console.log statements:

The tests run in the page itself, so they read the graph directly:

```typescript
it("debug example", async () => {
    const element = await mounted("3d");
    console.log("camera:", camera(element));
});
```

## Test Helpers

### `interaction-helpers.ts`

Core utilities for all interaction tests:

Helpers over a `Graph` made directly with `new Graph(container)` (a real WebGL engine):

- `setupTestGraph(options)` - Make a graph in the given view mode, layout and data, and wait until it is ready
- `teardownTestGraph(graph)` - Dispose it and remove its container
- `waitForGraphReady(graph)` - Wait until the camera, scene and input handlers are set up
- `getNodeScreenPosition(graph, nodeId)` - Where a node is drawn, in CSS pixels
- `dragNode(graph, nodeId, delta)` - Drag a node with the real mouse
- `clickAtPosition(graph, position)` / `clickOnNode(graph, nodeId)` / `clickOnBackground(graph)` - Real clicks

To read the camera, call the public `graph.getCameraState()`. To wait for a layout to come to rest, call `graph.waitForSettled()`.

### `test/helpers/real-input.ts`

The input driver every test here uses: `click`, `doubleClick`, `rightClick`, `hover`, `press`,
`moveHeld`, `release`, `drag`, `wheel`, `touchDrag`, `pinch`, `twist`, `holdKey` and the rest send
real events through the browser's own input pipeline (touch through the Chrome DevTools Protocol).

### `mounted-element.ts`

A `<graphty-element>` with three nodes at fixed places, removed after each test, and readers of what it shows:

- `mounted(viewMode, layout?)` - Mount it, drawn and at rest
- `at(element, id)` / `spread(element)` - Where a node is drawn; how far apart nodes a and b are drawn
- `camera(element)` - The camera state as a string, for comparing before and after
- `applied(element)` - Wait until the input just given is applied and the picture is at rest

### `iwer-setup.ts`

WebXR emulation:

- `installIWER()` - Make `navigator.xr` an emulated Meta Quest 3 and record every session the page starts (mode, frames rendered, ended). Call it before the graph initializes; `uninstall()` restores `navigator.xr`. `test/browser/xr-session.test.ts` uses it to enter and leave real VR and AR sessions.

### `types.ts`

TypeScript interfaces for test configuration:

- `TestGraphOptions` - Graph setup configuration
- `NodeData` / `EdgeData` / `ScreenPosition` / `DragDelta` - Shapes the helpers take and return

### `xr-input-driver.ts`

`createXRInputDriver(...)` mounts a graphty-element, enters VR on the emulated headset and moves its
thumbsticks and hands, for the tests under `xr/`.

## Writing New Tests

Start from `real-input.test.ts`: mount the element, give it real input, wait for the input to be
applied, and assert on what the public API reports.

```typescript
import { assert, it } from "vitest";

import { drag } from "../helpers/real-input";
import { applied, camera, EMPTY, mounted } from "./helpers/mounted-element";

it("a drag on empty canvas turns the 3D camera", async () => {
    const element = await mounted("3d");
    const before = camera(element);

    await drag(element, EMPTY, { x: EMPTY.x + 80, y: EMPTY.y });
    await applied(element);

    assert.notStrictEqual(camera(element), before);
});
```

## Manual Testing Procedures

Some interactions are difficult to test automatically. Here are manual testing procedures:

### Testing Physical VR Hardware

1. Connect Quest headset
2. Open Storybook XR story in Quest Browser
3. Enter VR mode
4. Verify:
    - Left thumbstick rotates/pitches scene
    - Right thumbstick pans/zooms
    - Trigger picks and drags nodes
    - Hand tracking pinch works

### Testing Touch on Mobile

1. Open Storybook on mobile device
2. Navigate to 2D or 3D story
3. Verify:
    - Single finger pan works
    - Pinch zoom works
    - Two-finger rotate works (2D only)

## Architecture

```
test/interactions/
├── helpers/
│   ├── interaction-helpers.ts  # Helpers over a Graph
│   ├── mounted-element.ts      # A mounted <graphty-element> and its readers
│   ├── iwer-setup.ts           # XR emulation setup
│   ├── xr-input-driver.ts      # Drives XR input in an emulated session
│   └── helpers.test.ts         # Tests for helpers themselves
├── types.ts                    # TypeScript interfaces
├── *.test.ts                   # One feature each, under real input
├── unit/                       # XR mappings and deadzones
├── integration/                # Mouse, keyboard and touch on a mounted element
├── selection/                  # Selection and its halo
├── xr/                         # XR emulation tests
└── edge-cases/                 # Edge case tests
```

## Related Documentation

- [IWER Documentation](https://github.com/meta-quest/immersive-web-emulator)
- [Vitest Browser Mode](https://vitest.dev/guide/browser/)
- [CDP Touch Events](https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchTouchEvent)
