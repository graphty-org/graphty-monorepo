/**
 * Runs started from a card in the full-screen selection workspace (design: algo-options
 * cardruns.md), on the REAL graphty-element and Les Miserables, driven by real clicks and keys: a
 * card's run adds no style layer; Cancel drops every run the visit started and Done keeps the one
 * the final card reads, listed in the Data place's Runs with the layer that reads it; removing that
 * run asks first, naming the layer, and then the layer waits (a wait mark on its row, Run beside
 * Edit) until the reader presses Run, which starts it once.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// The full-screen selection workspace is the `selection-workspace` experiment.
withFeatures(["selection-workspace"]);

/**
 * Les Miserables in the workspace, with a reader's layer selected in the style tree.
 * @returns the session and the layer.
 */
async function openLayer(): Promise<{ session: GraphSession; layer: Layer }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    const layer = await session.styles.add({
        name: "Calm",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Calm, / }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-rest"));
    });
    return { session, layer };
}

/**
 * Opens the modal with Edit, picks PageRank on its card and waits for the card's run.
 * @param session - the session.
 * @returns the modal.
 */
async function pickPageRank(session: GraphSession): Promise<HTMLElement> {
    await userEvent.click(screen.getByRole("button", { name: /^Edit Which nodes/ }));
    const modal = await waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the modal is open");
        return found;
    });
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard("PageRank");
    await userEvent.keyboard("{Enter}");
    await waitFor(() => {
        assert.isTrue(
            session.runs.list().some((run) => run.algorithm === "pagerank" && run.status === "succeeded"),
            "the card's run finished",
        );
    });
    return modal;
}

const pagerankRuns = (session: GraphSession): number =>
    session.runs.list().filter((run) => run.algorithm === "pagerank").length;

describe("runs started from a selection card", () => {
    it("add no style layer, and Cancel drops every run the visit started", async () => {
        const { session } = await openLayer();
        const layers = session.styles.list().length;
        const modal = await pickPageRank(session);
        assert.strictEqual(session.styles.list().length, layers, "the card's run painted nothing");
        await userEvent.click(within(modal).getByRole("button", { name: /^Cancel$/ }));
        await waitFor(() => {
            assert.strictEqual(pagerankRuns(session), 0, "Cancel removed the run the visit started");
        });
        assert.strictEqual(session.styles.list().length, layers);
    });

    it("Done keeps the run the card reads; removing it asks, then the layer waits for Run", async () => {
        const { session, layer } = await openLayer();
        const modal = await pickPageRank(session);
        await userEvent.click(within(modal).getByRole("button", { name: /^Done/ }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"), "Done closes it");
            assert.deepEqual(
                session.runs.readers(session.runs.list().find((run) => run.algorithm === "pagerank")?.id ?? ""),
                [{ kind: "layer", id: layer.id }],
                "the kept run is read by the layer",
            );
        });
        assert.strictEqual(pagerankRuns(session), 1, "Done kept it as an ordinary run");

        // The Data place lists it, with the layer that reads it as a chip.
        await userEvent.click(screen.getByRole("button", { name: /^Data/ }));
        const runs = await screen.findByRole("list", { name: "Runs" });
        const row = await waitFor(() => {
            const found = runs.querySelector<HTMLElement>("[data-run]");
            assert.isNotNull(found);
            return found;
        });
        assert.include(row.textContent ?? "", "Calm", "the selection that reads it");

        // Remove asks first, naming the layer whose selection will wait.
        await userEvent.click(within(row).getByRole("button", { name: /^Remove / }));
        const confirm = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-confirm-remove]");
            assert.isNotNull(found);
            return found;
        });
        assert.include(confirm.querySelector("[data-waits]")?.textContent ?? "", "Calm");
        assert.strictEqual(pagerankRuns(session), 1, "nothing is removed before the reader agrees");
        await userEvent.click(within(confirm).getByRole("button", { name: "Remove" }));
        await waitFor(() => {
            assert.strictEqual(pagerankRuns(session), 0);
        });

        // Back on the Graph place the layer waits: never re-run unasked.
        await userEvent.click(screen.getByRole("button", { name: /^Graph/ }));
        await waitFor(() => {
            assert.isNotNull(document.querySelector("[data-waiting]"), "the layer row's wait mark");
        });
        assert.strictEqual(pagerankRuns(session), 0, "the removed run was not started again");
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Calm, / }));
        const run = await screen.findByRole("button", { name: /^Run Which nodes/ });
        await userEvent.click(run);
        await waitFor(() => {
            assert.isTrue(
                session.runs.list().some((each) => each.algorithm === "pagerank" && each.status === "succeeded"),
                "Run started it",
            );
            assert.isNull(document.querySelector("[data-waiting]"), "the layer no longer waits");
        });
        assert.strictEqual(pagerankRuns(session), 1, "started once");
    });
});
