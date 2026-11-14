/**
 * A reopened project lists each saved result once (#6227), on the REAL graphty-element and Les
 * Miserables: a project holding Louvain over the whole graph and a filter on its groups is saved,
 * then opened on a new element, as a page reload does; the Calculated tab shows one Louvain row,
 * the element lists one run, and the filter reads that run rather than starting another.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// The Calculated tab belongs to the `selection-workspace` experiment.
withFeatures(["selection-workspace"]);

/**
 * The workspace on the Data place, with its element's session.
 * @returns the session and a way to take the workspace down.
 */
async function workspace(): Promise<{ session: GraphSession; unmount: () => void }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" });
    const { unmount } = render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return { session, unmount };
}

/**
 * The Calculated tab's result rows, once the tab is open.
 * @returns them.
 */
async function calculatedRows(): Promise<HTMLElement[]> {
    await userEvent.click(await screen.findByRole("tab", { name: "Calculated" }));
    const list = await screen.findByRole("list", { name: "Results" });
    return [...list.querySelectorAll<HTMLElement>("[data-run]")];
}

describe("a reopened project's results", () => {
    it("lists a whole-graph Louvain run once, with the filter on its groups reading it", async () => {
        const first = await workspace();
        await first.session.data.import({
            type: "gml",
            name: "les-miserables.gml",
            config: { data: lesMiserables },
        });
        const louvain = await first.session.runs.start("louvain", {}, { scope: "graph" });
        const result = first.session.runs.get(louvain.runId)?.result;
        const field = result?.fields[0]?.name ?? "";
        const [node] = first.session.data.nodes();
        const group = result?.node(node.id)?.[field];
        assert.isDefined(group, `the first node's ${field}`);
        // A node in another group, which the filter hides.
        const other = first.session.data.nodes().find((each) => result?.node(each.id)?.[field] !== group);
        assert.isDefined(other);
        const otherId = other?.id ?? node.id;
        await first.session.visibility.addCondition({
            effect: "keep",
            rule: {
                kind: "union",
                side: "nodes",
                within: "graph",
                branches: [
                    {
                        id: "a",
                        start: "all",
                        steps: [
                            {
                                id: "community",
                                op: "keep",
                                rule: {
                                    kind: "measure",
                                    algorithm: "louvain",
                                    field,
                                    test: { kind: "categories", values: [String(group)] },
                                },
                            },
                        ],
                    },
                ],
            },
        });
        await waitFor(() => {
            assert.isFalse(first.session.visibility.isVisible(otherId), "the filter applied");
        });
        assert.deepEqual(
            first.session.runs.list().map((run) => run.id),
            [louvain.runId],
            "the filter reads the run Analyze made",
        );
        const { text } = await first.session.project.save();
        first.unmount();

        const reopened = await workspace();
        await reopened.session.project.open(text);
        await waitFor(() => {
            assert.isFalse(reopened.session.visibility.isVisible(otherId), "the filter applied");
        });
        assert.deepEqual(
            reopened.session.runs.list().map((run) => run.id),
            [louvain.runId],
        );
        const rows = await calculatedRows();
        assert.deepEqual(
            rows.map((row) => row.getAttribute("data-run")),
            [louvain.runId],
        );
    });
});
