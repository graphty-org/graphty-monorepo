/**
 * Table's disabled reasons: the toolbar button waits for the project to hold data.
 */
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { createWorkspaceStore } from "../../state/store";
import { registration } from "../commands";

const table = registration.commands.find((command) => command.id === "table.toggle");

/**
 * A stand-in session holding these sources.
 * @param sources - how many sources it holds.
 * @returns the session.
 */
function holding(sources: number, nodeCount = 0): GraphSession {
    return {
        data: { sources: () => Array.from({ length: sources }, () => ({})), statistics: () => ({ nodeCount }) },
    } as unknown as GraphSession;
}

describe("Table", () => {
    const workspace = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });

    it("is disabled until the project holds data, saying why", () => {
        assert.equal(table?.disabled?.({ workspace, session: holding(0), element: null }), "No data yet");
    });

    it("is enabled once a source is loaded, even one that draws no node", () => {
        assert.isNull(table?.disabled?.({ workspace, session: holding(1), element: null }));
    });

    it("is enabled for nodes added without a source", () => {
        assert.isNull(table?.disabled?.({ workspace, session: holding(0, 3), element: null }));
    });
});
