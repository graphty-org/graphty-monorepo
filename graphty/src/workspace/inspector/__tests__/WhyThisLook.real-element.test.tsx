/**
 * Why this look for an edge on the REAL graphty-element: one line per layer that wins a property
 * on the edge, highest first, as `styles.explain` reports it, and a line's link opens its layer on
 * the Style tab's edge side.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A triangle. */
const NODES = ["a", "b", "c"].map((id) => ({ id }));
const EDGES = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
    { source: "c", target: "a" },
];

/**
 * The workspace holding the triangle.
 * @returns the session and the store.
 */
async function openTriangle(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Triangle", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    return { session, store };
}

describe("Why this look for an edge", () => {
    it("lists each winning layer once, highest first, and its link opens the layer on the edge side", async () => {
        const { session, store } = await openTriangle();
        const edge = session.data.edges()[0];
        await act(async () => {
            await session.selection.apply({ edges: [edge.id] });
        });
        const inspector = within(await screen.findByRole("complementary", { name: "Inspector" }));
        await userEvent.click(await inspector.findByRole("tab", { name: "Style" }));
        const lines: HTMLElement[] = await inspector.findAllByTestId("why-line");

        const explanation = session.styles.explain({ edge: edge.id });
        const winners = new Set(explanation.channels.map((channel) => channel.layerId));
        const expected = [...explanation.contributions]
            .reverse()
            .filter((contribution) => winners.has(contribution.layerId));
        assert.lengthOf(lines, expected.length);
        assert.isNotEmpty(lines);

        // The line that wins the edge's color opens its layer, on the Style tab's edge side.
        const painter = explanation.channels.find((channel) => channel.channel === "edge.color");
        assert.isDefined(painter, "some layer paints the edge's color");
        const at = expected.findIndex((contribution) => contribution.layerId === painter?.layerId);
        assert.isAtLeast(at, 0);
        await userEvent.click(within(lines[at]).getByRole("button"));
        await waitFor(() => {
            assert.equal(store.get().inspected?.tab, "style");
        });
        assert.equal(store.get().styleSide, "edge");
    });
});
