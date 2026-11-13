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

These drive the XR gesture code with mock hands and controllers (`helpers/iwer-setup.ts`). The test that starts real VR and AR sessions, through IWER (Immersive Web Emulation Runtime), is `test/browser/xr-session.test.ts`.

| File                       | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `xr-thumbstick.test.ts`    | Thumbstick rotation, pan, zoom                   |
| `xr-gestures.test.ts`      | Controller trigger, node drag, two-hand gestures |
| `xr-hand-tracking.test.ts` | Pinch gestures, hand tracking                    |

### Edge Cases (`edge-cases/`)

Tests for complex scenarios, state transitions, and edge cases.

| File                            | Description                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `node-drag-drop.test.ts`        | Node drag behavior, camera isolation during drag                                    |
| `pin-on-drag.test.ts`           | A dragged node is pinned or not as pinOnDrag says; a pin holds under a force layout |
| `view-mode-transitions.test.ts` | After 2D/3D switches a drag does what the view shown does; undo restores Z          |
| `input-sequences.test.ts`       | Clicks, a drag let go far away, a view switch or new nodes while the button is down |

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

```typescript
test("debug example", async () => {
    const state = await page.evaluate(() => {
        const graph = document.querySelector("graphty-element")?.graph;
        return {
            viewMode: graph?.viewMode,
            camera: graph?.getCameraManager()?.getActiveController()?.camera?.position,
        };
    });
    console.log("Graph state:", state);
});
```

## Test Helpers

### `interaction-helpers.ts`

Core utilities for all interaction tests:

- `waitForGraphReady(page)` - Wait for graph initialization
- `getNodeScreenPosition(page, nodeId)` - Get node's screen coordinates
- `getCameraState(page)` - Snapshot camera position/rotation
- `waitForSettle(page, frames)` - Wait for physics to settle
- `setupTestGraph(page, options)` - Configure graph for testing

### `mounted-element.ts`

A `<graphty-element>` with three nodes at fixed places, removed after each test, and readers of what it shows:

- `mounted(viewMode, layout?)` - Mount it, drawn and at rest
- `at(element, id)` / `spread(element)` - Where a node is drawn; how far apart nodes a and b are drawn
- `camera(element)` - The camera state as a string, for comparing before and after
- `applied(element)` - Wait until the input just given is applied and the picture is at rest

### `iwer-setup.ts`

WebXR emulation and XR input mocks:

- `installIWER()` - Make `navigator.xr` an emulated Meta Quest 3 and record every session the page starts (mode, frames rendered, ended). Call it before the graph initializes; `uninstall()` restores `navigator.xr`. `test/browser/xr-session.test.ts` uses it to enter and leave real VR and AR sessions.
- `createMockHand(hand)` / `createPinchingHand(hand)` / `createMockController(hand)` - Plain-data hand and controller states for the gesture tests

### `types.ts`

TypeScript interfaces for test configuration:

- `TestGraphOptions` - Graph setup configuration
- `CameraState` - Camera state snapshot
- `MockController` / `MockHand` - XR input mocks

## Writing New Tests

### Direction Test Pattern

```typescript
test("input X causes direction Y", async () => {
    // 1. Record initial state
    const initial = await getCameraState(page);

    // 2. Apply input
    await applyInput();

    // 3. Wait for effect
    await waitForSettle(page);

    // 4. Verify direction
    const final = await getCameraState(page);
    assert.isAbove(final.position.x, initial.position.x, "Should move in positive X");
});
```

### Integration Test Pattern

```typescript
test("user action causes expected behavior", async () => {
    // 1. Navigate to appropriate story
    await page.goto(`${STORYBOOK_URL}/iframe.html?id=story-id`);
    await waitForGraphReady(page);

    // 2. Perform user action
    const canvas = page.locator("canvas");
    await canvas.click({ position: { x: 200, y: 200 } });

    // 3. Verify result
    const result = await page.evaluate(() => {
        return document.querySelector("graphty-element")?.graph?.someProperty;
    });
    assert.strictEqual(result, expectedValue);
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
│   ├── interaction-helpers.ts  # Core test utilities
│   ├── iwer-setup.ts          # XR emulation setup
│   └── helpers.test.ts        # Tests for helpers themselves
├── types.ts                    # TypeScript interfaces
├── unit/                       # Unit tests (NullEngine)
├── integration/                # Browser integration tests
├── xr/                         # XR emulation tests
└── edge-cases/                 # Edge case tests
```

## Related Documentation

- [IWER Documentation](https://github.com/meta-quest/immersive-web-emulator)
- [Playwright Testing](https://playwright.dev/docs/api/class-page)
- [Vitest Browser Mode](https://vitest.dev/guide/browser/)
- [CDP Touch Events](https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchTouchEvent)
