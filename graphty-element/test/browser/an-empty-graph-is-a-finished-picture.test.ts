/**
 * @file A `<graphty-element>` with no data is a finished picture.
 *
 * Nothing is going to move on an element nobody has loaded anything into, so
 * `waitForStableFrame()` must resolve and `isFrameStable` must read true. A screenshot service or a
 * visual regression snapshot of an empty graph waits on exactly that, and a wait that never ends
 * fails every capture of an empty element.
 */

import { afterEach, assert, describe, it } from "vitest";

import { Graphty } from "../../src/graphty-element";

/** How long the element may take to build its renderer. */
const MOUNT_TIMEOUT_MS = 15000;

/** Far longer than an empty graph needs, far shorter than the 30 s default. */
const STABLE_TIMEOUT_MS = 5000;

/** Room for a cold start plus the wait. */
const TEST_TIMEOUT_MS = 30000;

let container: HTMLDivElement | null = null;

/**
 * Mount a `<graphty-element>` the way a page does and wait until its graph is live.
 * @returns The mounted element.
 */
async function mount(): Promise<Graphty> {
    container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "360px";
    document.body.appendChild(container);

    const mounted = document.createElement("graphty-element");

    assert.instanceOf(mounted, Graphty);

    mounted.style.width = "100%";
    mounted.style.height = "100%";
    mounted.style.display = "block";
    container.appendChild(mounted);

    const deadline = Date.now() + MOUNT_TIMEOUT_MS;

    while (!mounted.graph.initialized) {
        if (Date.now() > deadline) {
            throw new Error("the element never finished initialising");
        }

        await new Promise((resolve) => setTimeout(resolve, 20));
    }

    return mounted;
}

afterEach(() => {
    container?.remove();
    container = null;
});

describe("an element with no data", () => {
    it(
        "reports a stable frame",
        async () => {
            const element = await mount();

            await element.waitForStableFrame({ timeoutMs: STABLE_TIMEOUT_MS });

            assert.isTrue(element.isFrameStable, "an empty graph has nothing left to move");
        },
        TEST_TIMEOUT_MS,
    );
});
