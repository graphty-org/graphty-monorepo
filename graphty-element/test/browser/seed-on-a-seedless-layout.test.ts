/**
 * @file A `seed` given to a layout that takes none (issue #5124). `layout = "fixed"` with
 * `layoutConfig = { seed: 42 }` used to be refused with `E_UNKNOWN_OPTION`, which reached the page
 * as the element's bubbling `error` event and so as an unhandled error on the window, while
 * `ngraph` with the same seed ran. A layout that takes no seed draws the same every time, so the
 * seed is reported as `W_UNKNOWN_OPTION` and the layout runs without it.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

interface Seen {
    element: Graphty;
    /** Settles when the layout either takes effect (`layout-changed`) or is refused (`error`). */
    settled: Promise<void>;
    errors: unknown[];
    windowErrors: unknown[];
    warnings: { code: string; params: Record<string, unknown> }[];
}

/**
 * An element on the page with `layout` and a seed, recording what it reports.
 * @param layout - The layout to set.
 * @returns The element, its errors, the window's error events and its layout warnings.
 */
function mount(layout: string): Seen {
    const seen: Seen = {
        element: document.createElement("graphty-element"),
        settled: Promise.resolve(),
        errors: [],
        windowErrors: [],
        warnings: [],
    };
    const onWindowError = (event: Event): void => {
        seen.windowErrors.push(event);
    };
    window.addEventListener("error", onWindowError);
    const { element } = seen;
    // Listened for before the element is on the page, so neither outcome can be missed: the test
    // waits for whichever happens, with or without the fix, and then asserts.
    seen.settled = new Promise((resolve) => {
        element.addEventListener("layout-changed", () => {
            resolve();
        });
        element.addEventListener("error", () => {
            resolve();
        });
    });
    element.style.cssText = "display:block;width:300px;height:200px";
    element.addEventListener("error", (event) => {
        seen.errors.push((event as CustomEvent<{ error: unknown }>).detail.error);
    });
    element.addEventListener("layout-warning", (event) => {
        seen.warnings.push((event as CustomEvent<Seen["warnings"][number]>).detail);
    });
    element.nodeData = [0, 1, 2].map((id) => ({ id, position: { x: id, y: 0, z: 0 } }));
    element.edgeData = [
        { src: 0, dst: 1 },
        { src: 1, dst: 2 },
    ];
    element.layout = layout;
    element.layoutConfig = { seed: 42 };
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
        window.removeEventListener("error", onWindowError);
    });
    return seen;
}

describe("a seed given to a layout that takes none", () => {
    for (const layout of ["fixed", "circular", "grid", "shell", "spiral", "kamada-kawai"]) {
        it(`${layout}: runs, and reports the seed as W_UNKNOWN_OPTION rather than an error`, async () => {
            const seen = mount(layout);

            await seen.settled;

            assert.lengthOf(seen.errors, 0, "no error event");
            assert.lengthOf(seen.windowErrors, 0, "nothing reached the window as an error");
            const warning = seen.warnings.find((w) => w.code === "W_UNKNOWN_OPTION");
            assert.deepEqual(warning?.params.options, ["seed"]);
            assert.notInclude(warning?.params.available as string[], "seed");
            assert.strictEqual(seen.element.layout, layout);
        });
    }

    it("ngraph takes the seed, and reports nothing", async () => {
        const seen = mount("ngraph");
        await seen.settled;
        assert.lengthOf(seen.errors, 0);
        assert.lengthOf(seen.windowErrors, 0);
        assert.isFalse(seen.warnings.some((w) => w.code === "W_UNKNOWN_OPTION"));
    });
});
