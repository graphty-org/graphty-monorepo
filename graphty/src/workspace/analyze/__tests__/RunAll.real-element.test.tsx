/**
 * Run all on the REAL graphty-element, with real clicks: Run all under a heading of Analyze starts
 * one batch holding every method under it that can run, and each method becomes its own run.
 * Cancel stops the whole batch.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, RunRecord } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { runAllMethods, startAll } from "../run";
import { HEADINGS } from "../words";

/**
 * The workspace on Les Miserables.
 * @returns The session.
 */
async function openScene(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.styles.settled();
    return session;
}

/**
 * The methods Run all runs under the ranking heading (the centralities), by key.
 * @param session - The session.
 * @returns The keys.
 */
function rankMethods(session: GraphSession): string[] {
    const rank = HEADINGS.find((h) => h.id === "rank");
    const all = session.catalog.algorithms().filter((a) => rank?.shapes.includes(a.shape) === true);
    return runAllMethods(session, all).map((a) => a.key);
}

withFeatures([]);

describe("Run all in Analyze", () => {
    it("runs every ranking method as one batch, each its own run", async () => {
        const session = await openScene();
        const batches: RunRecord[] = [];
        session.on("run:changed", ({ run }) => {
            if (run.algorithm === "batch" && !batches.some((b) => b.id === run.id)) {
                batches.push(run);
            }
        });
        const keys = rankMethods(session);
        assert.isAbove(keys.length, 1);

        const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
        await userEvent.click(within(toolbar).getByRole("button", { name: "Analyze" }));
        await userEvent.click(await screen.findByRole("option", { name: "Run all, Rank nodes and edges" }));

        await waitFor(() => {
            const done = keys.map((key) => session.runs.list().find((r) => r.algorithm === key)?.status);
            // A member may fail on its own (Katz does not converge on this graph with its defaults);
            // it fails alone, never the batch.
            assert.isTrue(
                done.every((status) => status === "succeeded" || status === "failed"),
                done.join(", "),
            );
        });
        assert.equal(batches.length, 1, "one batch");
        const specs = batches[0].params.specs as readonly { algorithm: string }[];
        assert.deepEqual(
            specs.map((spec) => spec.algorithm),
            keys,
        );
        // One run, so one row, per method.
        assert.equal(session.runs.list().length, keys.length);
    });

    it("cancel stops the whole batch", async () => {
        const session = await openScene();
        const rank = HEADINGS[0];
        const all = session.catalog.algorithms().filter((a) => rank.shapes.includes(a.shape));
        const batch = startAll(session, rank.id, rank.title, runAllMethods(session, all));
        batch.cancel();
        const result = await batch;
        assert.equal(batch.status, "canceled");
        assert.isTrue(result.partial);
        assert.isBelow(result.completed, result.total);
    });
});
