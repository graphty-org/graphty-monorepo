/**
 * Running a grouping algorithm from Analyze on the REAL graphty-element, with real clicks and keys:
 * Louvain makes a "Louvain" folder in the style tree with one layer per group, named "Group 1" for
 * the largest; a group recolored by hand keeps its color on the same members through a re-run,
 * which gives its new groups names no layer has; the folder's menu opens the run's settings on
 * the Values tab.
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
 * @param store - The workspace's store.
 * @returns The session.
 */
async function openScene(
    store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } }),
): Promise<GraphSession> {
    await page.viewport(1440, 900);
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
        await userEvent.click(await screen.findByRole("button", { name: /^Run\b/ }));
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
        // It opens on Values, where the settings and Rerun are.
        assert.equal(screen.getByRole("tab", { name: "Values" }).getAttribute("aria-selected"), "true");

        // A re-run with another resolution, as the run's Rerun starts it.
        const run = session.runs.get(runId);
        await session.runs.start("louvain", { ...run?.params, resolution: 1.4 }, { as: runId });
        await session.styles.settled();
        assert.equal(
            (session.styles.explain({ node: valjean }).merged["node.color"]?.hex ?? "").slice(0, 7).toLowerCase(),
            "#123456",
            "Valjean's group layer still holds Valjean and its color",
        );
        const after = session.styles.tree().find((row) => row.name === "Louvain")?.children ?? [];
        const names = after.map((row) => row.name);
        assert.lengthOf(new Set(names), names.length, `a re-run names its new groups apart: ${names.join(", ")}`);
    });

    it("runs on Enter in a setting, says what it made, and drops no tooltip on Analyze", async () => {
        const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
        const session = await openScene(store);
        const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
        const analyze = within(toolbar).getByRole("button", { name: "Analyze" });
        await userEvent.click(analyze);
        await userEvent.type(await screen.findByRole("combobox", { name: "Filter analyses" }), "Louvain");
        await userEvent.keyboard("{Enter}");
        const resolution = await screen.findByRole("spinbutton", { name: /^Resolution/ });
        await userEvent.tripleClick(resolution);
        await userEvent.keyboard("1.2{Enter}");

        const runId = await waitFor(
            () => {
                const found = session.runs.list().find((r) => r.algorithm === "louvain");
                assert.equal(found?.status, "succeeded");
                return found?.id ?? "";
            },
            { timeout: TIMEOUT_MS },
        );
        const run = session.runs.get(runId);
        assert.equal(run?.params.resolution, 1.2, "the run used the value typed before Enter");
        const groups = run?.result?.summary().groups?.length ?? 0;
        assert.isAbove(groups, 1);
        await waitFor(
            () => {
                // The run's name carries the setting that differs from the default.
                assert.equal(
                    store.get().announcement,
                    `Louvain (resolution 1.2) finished: ${String(groups)} groups, each a layer in the Louvain folder of Style layers`,
                );
            },
            { timeout: TIMEOUT_MS },
        );

        // Focus came back to Analyze by the popover closing, not by the reader: no tooltip shows.
        assert.equal(document.activeElement, analyze);
        const tips = [...document.querySelectorAll<HTMLElement>('[role="tooltip"]')].filter((tip) =>
            tip.textContent.startsWith("Analyze"),
        );
        assert.isTrue(
            tips.every((tip) => !tip.checkVisibility({ opacityProperty: true, visibilityProperty: true })),
            "no Analyze tooltip over the drawing",
        );
    });
});
