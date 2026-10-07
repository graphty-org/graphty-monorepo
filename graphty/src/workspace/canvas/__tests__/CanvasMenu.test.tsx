/**
 * The canvas's context menu against a stand-in session and element: what is under the pointer
 * decides the rows, and a node under it is selected first.
 */
import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession, NodeId } from "@graphty/graphty-element/session";
import { assert, describe, it, vi } from "vitest";

import { act, fireEvent, render, screen } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { CanvasMenu } from "../CanvasMenu";

/** What is under the pointer: a node, an edge, or nothing. */
type Hit = NodeId | { readonly edge: string } | null;

/**
 * A session whose selection `apply({ nodes, edges })` replaces, and an element whose `elementAt`
 * answers `hit` wherever it is asked.
 * @param hit - the node or edge under the pointer, or null for empty canvas.
 * @returns the session, the element and the apply spy.
 */
function standIn(hit: Hit): { session: GraphSession; element: GraphtyElement; apply: ReturnType<typeof vi.fn> } {
    const listeners = new Map<string, Set<() => void>>();
    const selection = { nodes: [] as NodeId[], edges: [] as string[], apply: vi.fn() };
    selection.apply.mockImplementation(({ nodes = [], edges = [] }: { nodes?: NodeId[]; edges?: string[] }) => {
        selection.nodes = nodes;
        selection.edges = edges;
        listeners.get("selection:changed")?.forEach((listener) => {
            listener();
        });
        return Promise.resolve();
    });
    const session = {
        on: (event: string, listener: () => void) => {
            const set = listeners.get(event) ?? new Set();
            set.add(listener);
            listeners.set(event, set);
            return () => set.delete(listener);
        },
        selection,
        data: { statistics: () => ({ nodeCount: 3, edgeCount: 2 }) },
        layout: { dimension: "3d" },
    } as unknown as GraphSession;
    const element = {
        elementAt: () => {
            if (hit === null) {
                return null;
            }
            return typeof hit === "object" ? { kind: "edge", id: hit.edge } : { kind: "node", id: hit };
        },
    } as unknown as GraphtyElement;
    return { session, element, apply: selection.apply };
}

/**
 * Renders the menu over a stand-in canvas and right-clicks it.
 * @param hit - the node or edge under the pointer, or null.
 * @returns the apply spy.
 */
async function rightClick(hit: Hit): Promise<ReturnType<typeof vi.fn>> {
    const { session, element, apply } = standIn(hit);
    const value = makeWorkspaceValue(createWorkspaceStore({}), createRegistry(REGISTRATIONS), session, element);
    render(
        <WorkspaceContext.Provider value={value}>
            <CanvasMenu>
                <div data-testid="graph" style={{ width: 400, height: 300 }} />
            </CanvasMenu>
        </WorkspaceContext.Provider>,
    );
    await act(async () => {
        fireEvent.contextMenu(screen.getByTestId("graph"), { clientX: 100, clientY: 100, button: 2 });
        await Promise.resolve();
    });
    await screen.findByRole("menu");
    return apply;
}

/**
 * The open menu's row labels.
 * @returns the labels, top to bottom.
 */
function rows(): string[] {
    return screen.getAllByRole("menuitem").map((row) => row.textContent);
}

describe("the canvas context menu", () => {
    it("selects exactly the node under the pointer and lists that node's commands", async () => {
        const apply = await rightClick("n1");
        assert.deepEqual(apply.mock.calls, [[{ nodes: ["n1"] }]]);
        const labels = rows();
        assert.isTrue(labels.some((label) => label.startsWith("Neighborhood")));
        assert.isTrue(labels.some((label) => label.startsWith("Frame selection")));
        assert.isFalse(labels.some((label) => label.startsWith("Fit")));
    });

    it("selects exactly the edge under the pointer and lists that edge's commands", async () => {
        const apply = await rightClick({ edge: "e1" });
        assert.deepEqual(apply.mock.calls, [[{ edges: ["e1"] }]]);
        const labels = rows();
        assert.isTrue(labels.some((label) => label.startsWith("Select endpoints")));
        assert.isFalse(labels.some((label) => label.startsWith("Neighborhood")));
        assert.isFalse(labels.some((label) => label.startsWith("Fit")));
    });

    it("lists Fit, Frame selection and Clear selection over empty canvas, selecting nothing", async () => {
        const apply = await rightClick(null);
        assert.equal(apply.mock.calls.length, 0);
        const labels = rows();
        assert.isTrue(labels[0].startsWith("Fit"));
        assert.isTrue(labels.some((label) => label.startsWith("Clear selection")));
        assert.isFalse(labels.some((label) => label.startsWith("Neighborhood")));
    });

    it("keeps iOS's callout and text selection off the canvas", () => {
        const { session, element } = standIn(null);
        const value = makeWorkspaceValue(createWorkspaceStore({}), createRegistry(REGISTRATIONS), session, element);
        render(
            <WorkspaceContext.Provider value={value}>
                <CanvasMenu>
                    <div data-testid="graph" />
                </CanvasMenu>
            </WorkspaceContext.Provider>,
        );
        const surface = screen.getByTestId("graph").parentElement;
        assert.isNotNull(surface);
        assert.equal(getComputedStyle(surface as Element).userSelect, "none");
    });
});
