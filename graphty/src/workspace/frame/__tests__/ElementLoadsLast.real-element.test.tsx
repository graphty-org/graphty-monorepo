/**
 * The frame's code can arrive before graphty-element's (main.tsx loads both at once; the element
 * carries Babylon and is the slower chunk). React 19 sets a custom-element prop as a property only
 * when the tag is already defined; otherwise it writes `String(value)` as an attribute, or drops a
 * `false`, and never tries again (issue #3375). This file never imports the element itself: the
 * element's chunk is held until the frame has mounted, the order a slow network gives the reader,
 * and every prop the frame writes on the tag must still reach the element as a value.
 */

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it, vi } from "vitest";

import { render, waitFor } from "../../../test/test-utils";
import { LAYOUT_SEED } from "../../layout/methods";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** The element's chunk, held until the test lets it load. */
const held = vi.hoisted(() => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    return { gate, release: () => release() };
});

vi.mock("../../../elementLoader", () => ({
    loadGraphtyElement: async (): Promise<void> => {
        await held.gate;
        await import("@graphty/graphty-element");
    },
}));

describe("graphty-element loading after the frame", () => {
    it("gets every prop the frame writes on the tag as a value", async () => {
        render(<Workspace store={createWorkspaceStore({ project: { name: "Ring", id: 1 } })} />);
        // The frame is up (setup.ts loads its code first) and the tag is not yet defined.
        assert.isUndefined(customElements.get("graphty-element"));

        held.release();
        let session: GraphSession | undefined;
        await waitFor(
            () => {
                session = document.querySelector("graphty-element")?.session;
                assert.isDefined(session);
            },
            { timeout: TIMEOUT_MS },
        );

        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        assert.isNull(element.getAttribute("layoutconfig"), 'no layoutconfig="[object Object]" attribute');
        assert.deepEqual(element.layoutConfig, { seed: LAYOUT_SEED });
        assert.isFalse(element.historyKeys, "the app's own Undo and Redo keep the keys");
        assert.isTrue(element.zoomToPointer);
    });
});
