/**
 * A graph with more edges than the threshold is smoothed only at rest: the frame sets the
 * element's `antialias` to "at-rest" while the element's edge count is above it, and back to true
 * when it falls to it (owner, 2026-11-15: above 100,000 edges). The test hands in a threshold of 2.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { useCallback, useState } from "react";
import { assert, describe, it } from "vitest";

import { render, waitFor } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { createWorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { AT_REST_ABOVE_EDGES, ElementHost } from "../ElementHost";

/** What the host handed up. */
const hosted: { element: HTMLElementTagNameMap["graphty-element"] | null; session: GraphSession | null } = {
    element: null,
    session: null,
};

/**
 * The frame's element host with a threshold of 2 edges.
 * @returns The host
 */
function Host(): React.JSX.Element {
    const [workspace] = useState(() => makeWorkspaceValue(createWorkspaceStore(), createRegistry([]), null, null));
    const onReady = useCallback(
        (element: HTMLElementTagNameMap["graphty-element"] | null, session: GraphSession | null) => {
            hosted.element = element;
            hosted.session = session;
        },
        [],
    );
    return (
        <WorkspaceContext.Provider value={workspace}>
            <ElementHost onReady={onReady} atRestAboveEdges={2} />
        </WorkspaceContext.Provider>
    );
}

describe("antialias at rest above the edge threshold", () => {
    it("is the owner's 100,000 edges", () => {
        assert.strictEqual(AT_REST_ABOVE_EDGES, 100_000);
    });

    it('sets "at-rest" above the threshold and true again at it', async () => {
        render(<Host />);
        await waitFor(() => assert.isNotNull(hosted.session));
        const { element, session } = hosted;
        assert.isNotNull(element);
        assert.isNotNull(session);
        assert.strictEqual(element.antialias, true, "an empty graph is smoothed every frame");

        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await session.data.addEdges([
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "a" },
        ]);
        await waitFor(() => assert.strictEqual(element.antialias, "at-rest"));

        // Node c takes two of the three edges with it.
        await session.data.removeNodes(["c"]);
        await waitFor(() => assert.strictEqual(element.antialias, true));
    });
});
