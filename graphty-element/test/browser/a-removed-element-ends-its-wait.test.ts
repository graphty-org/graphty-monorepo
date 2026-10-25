/**
 * @file `waitForStableFrame()` on a `<graphty-element>` that leaves the page ends at once.
 *
 * Removing the element shuts its graph down, so it will never draw again. A wait on it used to run
 * to its 30 s timeout and then blame the graph ("a filter or a selection has not been drawn yet").
 * A harness that waits on every element on a page -- one of which a story replaced -- then hung for
 * the whole timeout. The wait must instead reject with the neutral code `E_DISPOSED`, both when the
 * element is removed while it waits and when the wait starts on an element already removed.
 * (#3523)
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { Graphty } from "../../src/graphty-element";

/** How long the element may take to build its renderer. */
const MOUNT_TIMEOUT_MS = 15000;

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

    await vi.waitFor(
        () => {
            assert.isTrue(mounted.graph.initialized, "the element finished initialising");
        },
        { timeout: MOUNT_TIMEOUT_MS },
    );

    return mounted;
}

/**
 * The code a settled wait rejected with.
 * @param wait - The wait.
 * @returns The rejection's code, or "resolved" when the wait resolved.
 */
async function codeOf(wait: Promise<void>): Promise<string> {
    try {
        await wait;
        return "resolved";
    } catch (error) {
        return isGraphtyError(error) ? error.code : `not a GraphtyError: ${String(error)}`;
    }
}

afterEach(() => {
    container?.remove();
    container = null;
});

describe("waitForStableFrame on a removed element", () => {
    it("rejects with E_DISPOSED when the element is removed while it waits", async () => {
        const element = await mount();
        await element.graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await element.graph.addEdges([
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
        ]);

        // The default timeout: before the fix this wait ran for 30 s, past the test's own limit.
        const wait = element.waitForStableFrame();
        element.remove();

        assert.strictEqual(await codeOf(wait), "E_DISPOSED");
    });

    it("rejects with E_DISPOSED when the wait starts on an element already removed", async () => {
        const element = await mount();
        element.remove();

        assert.strictEqual(await codeOf(element.waitForStableFrame()), "E_DISPOSED");
    });
});
