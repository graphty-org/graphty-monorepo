/**
 * The canvas's state cards against a stand-in session that publishes progress on cue, so the
 * loading card can be held mid-load. `CanvasOverlays.real-element.test.tsx` covers the element.
 */
import type { GraphSession, ProgressChange } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { act, render, screen } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { CanvasOverlays } from "../CanvasOverlays";

/**
 * A session that answers the reads the canvas makes and lets the test publish progress.
 * @param nodeCount - what `data.statistics()` reports.
 * @returns the session and a function that publishes one progress change.
 */
function standIn(nodeCount: number): { session: GraphSession; progress: (change: ProgressChange) => void } {
    const listeners = new Map<string, Set<(payload: unknown) => void>>();
    const session = {
        on: (event: string, listener: (payload: unknown) => void) => {
            const set = listeners.get(event) ?? new Set();
            set.add(listener);
            listeners.set(event, set);
            return () => set.delete(listener);
        },
        styles: { legend: () => [] },
        data: { statistics: () => ({ nodeCount }) },
    } as unknown as GraphSession;
    return {
        session,
        progress: (change) => {
            listeners.get("progress:changed")?.forEach((listener) => {
                listener(change);
            });
        },
    };
}

/**
 * Renders the overlays over a session, in a project named "Les Miserables".
 * @param session - the session.
 */
function renderOver(session: GraphSession): void {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 } });
    const value = makeWorkspaceValue(store, createRegistry(REGISTRATIONS), session, null);
    render(
        <WorkspaceContext.Provider value={value}>
            <CanvasOverlays />
        </WorkspaceContext.Provider>,
    );
}

const LOAD = { task: "load", phase: "progress", completed: 197, total: null, fraction: null } as const;

describe("the canvas's state cards", () => {
    it("shows the loading card while the element reports a load, then the drawing", () => {
        const { session, progress } = standIn(77);
        renderOver(session);
        assert.isNull(screen.queryByRole("status"));

        act(() => {
            progress(LOAD);
        });
        assert.isNotNull(screen.getByRole("status", { name: "Reading Les Miserables" }));
        assert.isNotNull(screen.getByText("197 records read"));

        act(() => {
            progress({ ...LOAD, phase: "end" });
        });
        assert.isNull(screen.queryByRole("status"));
    });

    it("ignores a run's progress", () => {
        const { session, progress } = standIn(77);
        renderOver(session);
        act(() => {
            progress({ ...LOAD, task: "run" });
        });
        assert.isNull(screen.queryByRole("status"));
    });

    it("shows No nodes to draw over an empty graph, with no door until Open is built", () => {
        renderOver(standIn(0).session);
        assert.isNotNull(screen.getByRole("status", { name: "No nodes to draw" }));
        assert.isNull(screen.queryByRole("button"));
    });
});
