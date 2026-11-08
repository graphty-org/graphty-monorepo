/**
 * Runs started from a card in the full-screen selection workspace (design: algo-options
 * cardruns.md), on the REAL graphty-element and Les Miserables, driven by real clicks and keys: a
 * card's run adds no style layer; Cancel drops every run the visit started and Done keeps the one
 * the final card reads, listed in the Data place's Calculated tab with the layer that reads it;
 * removing that run asks first, naming the layer, and then the layer waits (a wait mark on its row, Run beside
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
    await userEvent.click(await screen.findByRole("button", { name: /^Edit Which nodes/ }));
    const modal = await waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the modal is open");
        return found;
    });
    // A new selection opens as one empty card, its value picker shut: the card's Value opens it.
    await userEvent.click(await within(modal).findByRole("button", { name: "Value" }));
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
        await userEvent.click(within(modal).getByRole("button", { name: /^Cancel/ }));
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

        // The Data place's Calculated tab lists it, with a quiet mark naming the layer that reads it.
        await userEvent.click(screen.getByRole("button", { name: /^Data/ }));
        await userEvent.click(await screen.findByRole("tab", { name: "Calculated" }));
        const runs = await screen.findByRole("list", { name: "Results" });
        const row = await waitFor(() => {
            const found = runs.querySelector<HTMLElement>("[data-run]");
            assert.isNotNull(found);
            return found;
        });
        assert.isNotNull(
            within(row).getByRole("img", { name: /^Styles: .*Calm/ }),
            "the style whose selection reads it",
        );

        // Remove, in the row's "...", asks first, naming the layer whose selection will wait.
        await userEvent.click(within(row).getByRole("button", { name: /^More for / }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Remove result/ }));
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

/**
 * The first card's header count ("8 of 77"), from its accessible name.
 * @returns the count.
 */
function cardCount(): number {
    const label = document.querySelector(".sel-ws .sel-card")?.getAttribute("aria-label") ?? "";
    return Number(/(\d+) of \d+/u.exec(label)?.[1] ?? Number.NaN);
}

/**
 * Each listed group's own count, from its checkbox's name ("Group 1 (20 nodes)").
 * @param modal - the modal.
 * @returns the counts by group name.
 */
function listedGroups(modal: HTMLElement): Map<string, number> {
    const groups = new Map<string, number>();
    for (const box of within(modal).queryAllByRole("checkbox", { name: /^Group \d+\b/u })) {
        const name = box.getAttribute("aria-label") ?? (box as HTMLInputElement).labels?.[0]?.textContent ?? "";
        const match = /^(Group \d+)\D*(\d+)/u.exec(name);
        if (match !== null) {
            groups.set(match[1], Number(match[2]));
        }
    }
    return groups;
}

describe("a card's setting its run name does not carry (the owner, 2026-11-04)", () => {
    it("Louvain's Max iterations makes the card's own run: its groups are re-read and the tick follows its group", async () => {
        const { session, layer } = await openLayer();
        await userEvent.click(await screen.findByRole("button", { name: /^Edit Which nodes/ }));
        const modal = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".sel-ws");
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(await within(modal).findByRole("button", { name: "Value" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Louvain");
        await userEvent.keyboard("{Enter}");
        await userEvent.click(await within(modal).findByRole("checkbox", { name: /^Group 1\b/u }));
        await waitFor(() => {
            assert.isAbove(cardCount(), 0, "Group 1 ticked");
        });
        const first = session.runs.list().find((run) => run.algorithm === "louvain");
        const firstParams = JSON.stringify(first?.params);

        await userEvent.click(within(modal).getAllByRole("button", { name: /^Settings for /u })[0]);
        await screen.findByRole("dialog", { name: /Louvain/u });
        const field = await screen.findByLabelText(/Max iterations/u);
        await userEvent.clear(field);
        await userEvent.type(field, "1{Enter}");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            const tuned = session.runs
                .list()
                .find((run) => run.algorithm === "louvain" && run.params.maxIterations === 1);
            assert.strictEqual(tuned?.status, "succeeded", "the card's own run");
        });
        assert.strictEqual(
            JSON.stringify(session.runs.get(first?.id ?? "")?.params),
            firstParams,
            "the first run was never re-run in place",
        );
        // The tick stands on the group that holds the old group's best-connected node.
        const ticked = await waitFor(() => {
            const boxes = within(modal)
                .getAllByRole<HTMLInputElement>("checkbox")
                .filter((box) => box.checked);
            assert.lengthOf(boxes, 1, "one group ticked on the new run");
            return boxes[0];
        });
        const groups = await waitFor(() => {
            const found = listedGroups(modal);
            assert.isAbove(found.size, 1);
            return found;
        });
        const held = groups.get(ticked.getAttribute("aria-label")?.split(",")[0] ?? "");
        await waitFor(() => {
            assert.strictEqual(cardCount(), held, "the card counts the group its tick followed to");
        });
        // The last tick off holds nothing, as a card never ticked does.
        await userEvent.click(ticked);
        await waitFor(() => {
            assert.strictEqual(cardCount(), 0, "nothing ticked selects nothing");
        });
        // Each listed group's count is what ticking it adds: the list reads the new run.
        const [name, count] = [...groups][0];
        await userEvent.click(within(modal).getByRole("checkbox", { name: new RegExp(`^${name}\\b`, "u") }));
        await waitFor(() => {
            assert.strictEqual(cardCount(), count, `${name} adds the ${String(count)} nodes it lists`);
        });
        assert.isDefined(layer);
    });
});
