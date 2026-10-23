import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { EngineStore } from "@babylonjs/core/Engines/engineStore";
import { Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Logger } from "@babylonjs/core/Misc/logger";
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from "vitest";

import type { Graph } from "../src/Graph";
import { MockDeviceInputSystem } from "../src/input/mock-device-input-system";
import { caughtFailure, installCaughtErrors, takeCaughtErrors } from "./helpers/caught-errors";
import { pinLabelFont } from "./helpers/pin-label-font";

// An error the element caught and carried on past, or one nobody caught, fails the test it
// happened in (test/helpers/caught-errors.ts).
installCaughtErrors();

// Strict state: every session created in these tests checks that project state changes only
// through the dispatcher (src/session/project/strict.ts, design/undo/undo-design.md section 12.1).
// A plain global rather than an import, so this file reaches nothing under src/ at setup time.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = true;

// Mock CreateScreenshotAsync to return a valid 1x1 PNG data URL
// This allows testing screenshot logic without requiring actual WebGL rendering
vi.mock("@babylonjs/core", async () => {
    const actual = await vi.importActual<typeof import("@babylonjs/core")>("@babylonjs/core");
    // 1x1 white PNG: 67 bytes base64-encoded
    const mockPngDataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    return {
        ...actual,
        CreateScreenshotAsync: vi.fn().mockResolvedValue(mockPngDataUrl),
    };
});

// Type augmentation for Chrome-specific performance.memory API
declare global {
    interface Performance {
        memory?: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
            jsHeapSizeLimit: number;
        };
    }
}

// In a real browser, draw labels in the committed test font rather than whatever the machine has
// installed as "Verdana" (see helpers/pin-label-font.ts). happy-dom has no font loading to pin.
if (typeof FontFace !== "undefined") {
    beforeAll(pinLabelFont);
}

// Suppress Babylon.js logs during tests. The Logger is imported from its own module, not from the
// "@babylonjs/core" barrel: the barrel's Logger is this same class, and loading the barrel here
// used to load all of Babylon.js -- some 2,000 modules -- for every test file in the project,
// including the many that never touch Babylon. Done in a beforeAll hook, that load ran under a
// 10 s hook timeout, which a machine busy with a dozen pre-push gates at once exceeded (#491).
Logger.LogLevels = Logger.ErrorLogLevel;

// Suppress Lit dev mode warnings by setting production mode
if (typeof window !== "undefined") {
    // Global window modification for test environment
    (window as typeof window & { litIssuedWarnings?: Set<unknown> }).litIssuedWarnings = new Set(); // Prevent duplicate warnings
    // Suppress console warnings from Lit during tests
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
        const message = args[0];
        if (
            typeof message === "string" &&
            (message.includes("Lit is in dev mode") || message.includes("Multiple versions of Lit loaded"))
        ) {
            return; // Suppress Lit warnings
        }

        originalWarn.apply(console, args);
    };
}

// Global test utilities
export function createMockInputSystem(): MockDeviceInputSystem {
    return new MockDeviceInputSystem();
}

// Every Babylon engine a test creates must be disposed by that test (#1970): a leaked graph keeps
// its render loop drawing every frame for the rest of the file. The engines alive when a test
// starts -- the file's beforeAll graphs among them -- are left alone; one created during the test
// and still alive after the file's own afterEach hooks (which run before this file's, vitest runs
// after-hooks in reverse) is released here and fails the test. What a beforeAll created is
// checked the same way once the file's afterAll hooks have run.
let enginesBeforeTest = new Set<AbstractEngine>();
let elementsBeforeTest = new Set<Element>();

beforeEach(() => {
    enginesBeforeTest = new Set(EngineStore.Instances);
    elementsBeforeTest = new Set(typeof document === "undefined" ? [] : document.querySelectorAll("graphty-element"));
});

/**
 * Releases what was created since `engines` and `elements` were recorded: each new
 * graphty-element is removed from the page, which shuts its graph down through the element's own
 * path, then each engine still alive is disposed and its container taken off the page.
 * @param engines - The engines to spare.
 * @param elements - The graphty-element nodes to spare.
 * @returns How many engines were alive that should not have been.
 */
function releaseLeakedEngines(engines: ReadonlySet<AbstractEngine>, elements: ReadonlySet<Element>): number {
    const leaked = EngineStore.Instances.filter((engine) => !engines.has(engine));
    if (typeof document !== "undefined") {
        for (const element of document.querySelectorAll("graphty-element")) {
            if (!elements.has(element)) {
                element.remove();
            }
        }
    }

    for (const engine of leaked.filter((e) => !e.isDisposed)) {
        let container: Element | null = engine.getRenderingCanvas();
        while (container?.parentElement && container.parentElement !== document.body) {
            container = container.parentElement;
        }

        container?.remove();
        engine.dispose();
    }

    return leaked.length;
}

/**
 * The failure for engines a test or a file left alive.
 * @param count - How many engines were left alive.
 * @param where - The test or file that left them.
 * @returns The error to fail it with.
 */
function leakError(count: number, where: string): Error {
    return new Error(
        `${where} left ${count} Babylon engine(s) alive: dispose every graph it creates (graph.dispose(), or remove its graphty-element) in afterEach, or in afterAll for one made in beforeAll`,
    );
}

afterAll(() => {
    const leaked = releaseLeakedEngines(new Set(), new Set());
    if (leaked > 0) {
        throw leakError(leaked, `The file ${expect.getState().testPath ?? ""}`);
    }
});

// Cleanup after each test
afterEach(async (context) => {
    const leakedEngines = releaseLeakedEngines(enginesBeforeTest, elementsBeforeTest);

    // Strict state's full sweep: no typed array state kept was written in place during the test.
    // Registered by src/session/project/strict.ts once a test has loaded it.
    (globalThis as { __GRAPHTY_STRICT_SWEEP__?: () => void }).__GRAPHTY_STRICT_SWEEP__?.();

    // Only run DOM cleanup if document is available (browser environment)
    if (typeof document !== "undefined") {
        // Clean up any lingering canvases
        document.querySelectorAll("canvas").forEach((canvas) => {
            canvas.remove();
        });

        // Reset body styles
        document.body.style.margin = "0";
        document.body.style.padding = "0";
    }

    // Let a late throw land, then fail the test on anything caught during it.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const caught = caughtFailure(takeCaughtErrors());
    if (caught !== undefined) {
        throw caught;
    }

    if (leakedEngines > 0) {
        throw leakError(leakedEngines, `The test "${context.task.name}"`);
    }
});

// Test helpers
export function createTestContainer(): HTMLElement {
    const container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.position = "relative";
    document.body.appendChild(container);
    return container;
}

export function waitForGraph(graph: Graph): Promise<void> {
    return new Promise((resolve) => {
        // Check if graph has initialized property
        if (graph.initialized) {
            resolve();
        } else {
            // Wait a frame for initialization
            requestAnimationFrame(() => {
                resolve();
            });
        }
    });
}

// Assertion helpers
export function expectVector2Near(actual: Vector2, expected: Vector2, tolerance = 0.01): void {
    expect(Math.abs(actual.x - expected.x)).toBeLessThan(tolerance);
    expect(Math.abs(actual.y - expected.y)).toBeLessThan(tolerance);
}

export function expectVector3Near(actual: Vector3, expected: Vector3, tolerance = 0.01): void {
    expect(Math.abs(actual.x - expected.x)).toBeLessThan(tolerance);
    expect(Math.abs(actual.y - expected.y)).toBeLessThan(tolerance);
    expect(Math.abs(actual.z - expected.z)).toBeLessThan(tolerance);
}
