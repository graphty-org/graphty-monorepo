/**
 * The canvas on the REAL graphty-element: the empty card, the legend card read from
 * `styles.legend()`, and the parts of tier 1 tasks T7 and T8 the canvas delivers -- PageRank's
 * `runs.painting()` reports its color added and the legend names it; and, under a reader's layer
 * that colors everything, Louvain is reported suppressed by that layer, the notice says so, and
 * Show anyway puts Louvain's colors on top. Every check reads what the element reports, never
 * canvas pixels.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, describe, it } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and running, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** Two rings of six joined by one bridge: Louvain finds the two rings. */
const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}` }));
const ring = (from: number): { source: string; target: string }[] =>
    Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(from + i)}`,
        target: `n${String(from + ((i + 1) % 6))}`,
    }));
const EDGES = [...ring(0), ...ring(6), { source: "n0", target: "n6" }];

/** A reader's own layer that colors every node, as a hand-written Everything color does. */
const EVERYTHING_GRAY = {
    name: "My gray",
    selector: { match: "everything" },
    set: { "node.color": "#888888" },
} as const;

/**
 * Opens a new project from the start screen and waits for its element.
 * @returns the element's session.
 */
async function newProject(): Promise<GraphSession> {
    render(<Workspace />);
    await userEvent.click(screen.getByRole("button", { name: "New project" }));
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
    return session;
}

describe("the canvas on the real element", () => {
    it(
        "shows No nodes to draw until the graph has a node, then the legend of a run that paints (T7)",
        async () => {
            const session = await newProject();
            await screen.findByRole("status", { name: "No nodes to draw" }, { timeout: TIMEOUT_MS });
            assert.isNull(screen.queryByRole("region", { name: "Legend" }));

            await session.data.addNodes(NODES);
            await session.data.addEdges(EDGES);
            await waitFor(() => {
                assert.isNull(screen.queryByRole("status", { name: "No nodes to draw" }));
            });

            const run = session.runs.start("pagerank");
            await run;
            await session.styles.settled();
            const painting = session.runs.painting(run.id);
            assert.equal(painting?.state, "decided");
            assert.isTrue(
                painting?.suggestions.some((each) => each.outcome === "added"),
                "PageRank's color went on the stack",
            );

            const legend = await screen.findByRole("region", { name: "Legend" });
            const section = await within(legend).findByRole("group", { name: `Color: ${run.label}` });
            assert.isNotNull(within(section).getByText(/means higher/), "the reading sentence");
            assert.isNull(screen.queryByText(/^Hidden by your layer/), "a run that painted gives no notice");
        },
        TIMEOUT_MS * 2,
    );

    it(
        "says a run was hidden by the reader's layer, and Show anyway puts it on top (T8)",
        async () => {
            const session = await newProject();
            await session.data.addNodes(NODES);
            await session.data.addEdges(EDGES);
            const mine = await session.styles.add(EVERYTHING_GRAY);

            const run = session.runs.start("louvain");
            await run;
            await session.styles.settled();
            const [outcome] = session.runs.painting(run.id)?.suggestions ?? [];
            assert.equal(outcome.outcome, "suppressed");
            assert.equal(outcome.outcome === "suppressed" ? outcome.byLayerId : undefined, mine.id);

            await screen.findByText("Hidden by your layer My gray", {}, { timeout: TIMEOUT_MS });
            assert.isNull(screen.queryByRole("group", { name: `Color: ${run.label}` }));
            await userEvent.click(screen.getByRole("button", { name: "Show anyway" }));

            await waitFor(
                () => {
                    assert.equal(
                        session.styles.list().at(-1)?.id,
                        session.runs.bindings(run.id)[0],
                        "Louvain is on top",
                    );
                },
                { timeout: TIMEOUT_MS },
            );
            const legend = await screen.findByRole("region", { name: "Legend" });
            await within(legend).findByRole("group", { name: `Color: ${run.label}` }, { timeout: TIMEOUT_MS });
        },
        TIMEOUT_MS * 2,
    );
});
