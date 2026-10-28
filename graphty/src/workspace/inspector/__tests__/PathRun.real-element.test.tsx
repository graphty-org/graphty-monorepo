/**
 * A shortest-path run row on the REAL graphty-element: its Values tab lists the route's nodes in
 * order and its size, and never draws a histogram of the boolean on-path field (which threw).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { act, render, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** A line a - b - c - d, plus a long way round from a to d. */
const NODES = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
const EDGES = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
    { source: "c", target: "d" },
    { source: "a", target: "e" },
    { source: "e", target: "d" },
];

describe("a path run's Values", () => {
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "lists the route's nodes in order and its size",
        async () => {
            const store = createWorkspaceStore({ project: { name: "Line", id: 1 } });
            const view = render(<Workspace store={store} />);
            let session: GraphSession | undefined;
            await waitFor(
                () => {
                    session = document.querySelector("graphty-element")?.session;
                    assert.isDefined(session);
                },
                { timeout: TIMEOUT_MS },
            );
            if (session === undefined) {
                throw new Error("the element never came up");
            }
            await session.data.addNodes(NODES);
            await session.data.addEdges(EDGES);
            const run = session.runs.start("shortest-path", { source: "b", target: "d" });
            await act(async () => {
                await run;
                await session?.styles.settled();
            });

            act(() => {
                store.set({ inspected: { kind: "measure-row", id: run.id }, tabs: { "measure-row": "values" } });
            });
            const inspector = within(view.getByRole("complementary", { name: "Inspector" }));
            const nodes = await inspector.findByRole("group", { name: "Nodes in order" });
            const names = within(nodes)
                .getAllByRole("button")
                .filter((button) => !button.hasAttribute("aria-expanded"))
                .map((button) => button.textContent);
            assert.deepEqual(
                names.map((name) => name.slice(0, 1)),
                ["b", "c", "d"],
            );
            assert.isNotNull(inspector.getByText("3 nodes, 2 edges"));
            // No weight was loaded, so there is no distance to total.
            assert.isNull(inspector.queryByText("Total distance"));
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "names the total by the weight column it read, in the Values",
        async () => {
            const store = createWorkspaceStore({ project: { name: "Trail", id: 1 } });
            const view = render(<Workspace store={store} />);
            let session: GraphSession | undefined;
            await waitFor(
                () => {
                    session = document.querySelector("graphty-element")?.session;
                    assert.isDefined(session);
                },
                { timeout: TIMEOUT_MS },
            );
            if (session === undefined) {
                throw new Error("the element never came up");
            }
            await session.data.import(
                {
                    type: "csv",
                    config: {
                        data: "source,target,minutes\nDepot,Station,4\nStation,Market,6\nMarket,Stadium,4\nDepot,Stadium,20\n",
                    },
                },
                {
                    mapping: {
                        rowsAre: "edges",
                        source: "source",
                        target: "target",
                        weight: "minutes",
                        weightMeaning: "distance",
                    },
                },
            );
            const run = session.runs.start("shortest-path", { source: "Depot", target: "Stadium" });
            await act(async () => {
                await run;
                await session?.styles.settled();
            });

            act(() => {
                store.set({ inspected: { kind: "measure-row", id: run.id }, tabs: { "measure-row": "values" } });
            });
            const inspector = within(view.getByRole("complementary", { name: "Inspector" }));
            await waitFor(() => {
                assert.isNotNull(inspector.getByText("Total minutes"));
            });
            assert.isNull(inspector.queryByText("Total distance"));
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "opens on Values as a Path, whatever tab a measure last opened on",
        async () => {
            const store = createWorkspaceStore({ project: { name: "Line", id: 1 } });
            const view = render(<Workspace store={store} />);
            let session: GraphSession | undefined;
            await waitFor(
                () => {
                    session = document.querySelector("graphty-element")?.session;
                    assert.isDefined(session);
                },
                { timeout: TIMEOUT_MS },
            );
            if (session === undefined) {
                throw new Error("the element never came up");
            }
            await session.data.addNodes(NODES);
            await session.data.addEdges(EDGES);
            const run = session.runs.start("shortest-path", { source: "b", target: "d" });
            await act(async () => {
                await run;
                await session?.styles.settled();
            });

            // The reader's last tab for a measure was Style; a path still opens on its Values.
            act(() => {
                store.set({ inspected: { kind: "measure-row", id: run.id }, tabs: { "measure-row": "style" } });
            });
            const inspector = within(view.getByRole("complementary", { name: "Inspector" }));
            await inspector.findByRole("group", { name: "Nodes in order" });
            assert.equal(inspector.getByRole("tab", { name: "Values" }).getAttribute("aria-selected"), "true");
            assert.isNull(inspector.queryByText("Measure"));
        },
        TIMEOUT_MS,
    );
});
