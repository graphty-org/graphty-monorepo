/**
 * Running a grouping algorithm from Analyze on the REAL graphty-element, with real clicks and keys:
 * Louvain makes a "Louvain" folder in the style tree with one layer per group, named "Group 1" for
 * the largest; a group recolored by hand keeps its color on the same members through a re-run;
 * the folder's menu opens the run's settings.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * The workspace on Les Miserables.
 * @returns The session.
 */
async function openScene(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.styles.settled();
    return session;
}

/**
 * The group a layer selects, as its rule spells it.
 * @param layer - The layer.
 * @returns The path and the value, or undefined.
 */
function groupOf(layer: Layer | undefined): { path: string; value: string } | undefined {
    const where = layer?.selector.match === "rule" ? layer.selector.where : undefined;
    return where?.kind === "categories" ? { path: where.attribute, value: where.values[0] } : undefined;
}

describe("a grouping run from Analyze", () => {
    it("makes a folder of group layers; a recolored group keeps its members through a re-run", async () => {
        const session = await openScene();
        const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
        await userEvent.click(within(toolbar).getByRole("button", { name: "Analyze" }));
        await userEvent.type(await screen.findByRole("combobox", { name: "Filter analyses" }), "Louvain");
        await userEvent.click(await screen.findByRole("option", { name: /^Louvain/ }));
        await userEvent.click(await screen.findByRole("button", { name: "Run" }));
        const runId = await waitFor(
            () => {
                const run = session.runs.list().find((r) => r.algorithm === "louvain");
                assert.equal(run?.status, "succeeded");
                return run?.id ?? "";
            },
            { timeout: TIMEOUT_MS },
        );
        await session.styles.settled();

        const tree = await screen.findByRole("tree", { name: "Style layers" });
        const folder = await within(tree).findByRole("treeitem", { name: /^Louvain, folder, \d+ layers$/ });
        await userEvent.click(folder);
        await userEvent.keyboard("{ArrowRight}");
        const first = await within(tree).findByRole("treeitem", { name: /^Group 1, node layer, \d+ nodes$/ });
        assert.isNotNull(first);

        // Valjean's group layer, recolored through its own Fill field.
        const valjean = String(session.data.nodes().find((n) => n.name === "Valjean")?.id);
        const groupLayers = session.styles.list().filter((layer) => groupOf(layer) !== undefined);
        const own = groupLayers.find((layer) => {
            const group = groupOf(layer);
            return group !== undefined && String(session.styles.valueAt({ node: valjean }, group.path)) === group.value;
        });
        assert.isDefined(own);
        await userEvent.click(
            within(tree).getByRole("treeitem", { name: new RegExp(`^${own?.name ?? ""}, node layer`) }),
        );
        const tab = await screen.findByTestId("style-tab");
        const fill = await within(tab).findByRole("textbox", { name: /^Node color/ });
        await userEvent.tripleClick(fill);
        await userEvent.keyboard("123456{Enter}");
        await waitFor(() => {
            assert.equal(session.styles.get(own?.id ?? "")?.set?.["node.color"], "#123456");
        });

        // The folder's menu opens the run, whose page holds its settings and Rerun.
        await userEvent.click(folder);
        await userEvent.keyboard("{Shift>}{F10}{/Shift}");
        await userEvent.click(await screen.findByRole("menuitem", { name: "Run settings" }));
        await waitFor(() => {
            const names = screen.queryAllByRole("heading", { level: 2 }).map((h) => h.textContent);
            assert.isTrue(
                names.some((name) => /Louvain/.test(name)),
                names.join(", "),
            );
        });

        // A re-run with another resolution, as the run's Rerun starts it.
        const run = session.runs.get(runId);
        await session.runs.start("louvain", { ...run?.params, resolution: 1.4 }, { as: runId });
        await session.styles.settled();
        assert.equal(
            (session.styles.explain({ node: valjean }).merged["node.color"]?.hex ?? "").slice(0, 7).toLowerCase(),
            "#123456",
            "Valjean's group layer still holds Valjean and its color",
        );
    });
});
