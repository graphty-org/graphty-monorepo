/**
 * The value popovers on the REAL graphty-element, driven by real input: a binding popover keeps
 * its place while a switch or a choice grows its content, and the value picker's closing row of
 * values a property cannot take reads whole at the picker's width.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { findTreeRow } from "../../graph-place/rows";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Les Miserables with the starting rows, Degree, Louvain and Closeness, at the given window size.
 * @param width - the window's width.
 * @param height - the window's height.
 * @returns each run's tree row name.
 */
async function openScene(width: number, height: number): Promise<Record<"degree" | "louvain" | "closeness", string>> {
    await page.viewport(width, height);
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
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
    await session.config.set({ startingRows: true, editableBase: true });
    const rowOf = async (s: GraphSession, algorithm: string): Promise<string> => {
        const { runId } = await s.runs.start(algorithm, {});
        await s.styles.settled();
        const [id] = s.runs.bindings(runId);
        const layer = s.styles.get(id);
        return findTreeRow(s.styles.tree(), layer?.row ?? id)?.row.name ?? String(layer?.name);
    };
    return {
        degree: await rowOf(session, "degree"),
        louvain: await rowOf(session, "louvain"),
        closeness: await rowOf(session, "closeness"),
    };
}

/**
 * Opens a tree row's Style tab by a click on the row.
 * @param name - the row's visible name.
 * @returns the Style tab.
 */
async function openStyle(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${escaped}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    return screen.findByTestId("style-tab");
}

/**
 * Opens the node color binding popover of a row and waits until it has settled in place.
 * @param row - the row's name.
 * @returns the popover.
 */
async function openColorFromData(row: string): Promise<HTMLElement> {
    const tab = await openStyle(row);
    await userEvent.click(await within(tab).findByRole("button", { name: /^Node color: / }));
    const dialog = await screen.findByRole("dialog", { name: /^Color by / });
    await settled(dialog);
    return dialog;
}

/**
 * Waits until a popover is shown and has no move pending.
 * @param dialog - the popover.
 */
async function settled(dialog: HTMLElement): Promise<void> {
    await waitFor(() => {
        assert.notEqual(dialog.style.visibility, "hidden");
        assert.isFalse(dialog.hasAttribute("data-cm-repositioning"), "no move pending");
    });
}

describe("value popovers", () => {
    it("keeps the color-from-data popover's place when Clamp outliers adds its row", async () => {
        // In a short window the popover opens upward from a low row; the row Clamp adds no longer
        // fits upward, and re-placing it from the row threw it hundreds of pixels down.
        const rows = await openScene(1440, 760);
        const dialog = await openColorFromData(rows.closeness);
        const before = dialog.getBoundingClientRect();

        await userEvent.click(within(dialog).getByRole("switch", { name: "Clamp outliers" }));
        await within(dialog).findByRole("group", { name: "Clamp at percentiles" });
        await waitFor(() => {
            assert.isAbove(dialog.getBoundingClientRect().height, before.height);
        });
        await settled(dialog);
        const after = dialog.getBoundingClientRect();
        const grown = after.height - before.height;
        // It grows down from where it was, or, already on the window's bottom, up by what it grew.
        const kept = Math.round(after.top) === Math.round(before.top);
        const pinned = Math.round(after.bottom) === Math.round(window.innerHeight);
        assert.isTrue(kept || pinned, `top ${String(before.top)} -> ${String(after.top)}`);
        assert.isAtMost(before.top - after.top, grown + 0.5, "never moves more than it grew");
        assert.isAtLeast(after.top, before.top - grown - 0.5);
        assert.isAtMost(after.top, before.top + 0.5, "never moves down");
    });

    it("keeps the popover's width and place when No value becomes Use one value", async () => {
        const rows = await openScene(1440, 900);
        const dialog = await openColorFromData(rows.louvain);
        const before = dialog.getBoundingClientRect();

        await userEvent.click(within(dialog).getByRole("combobox", { name: /^No value/ }));
        await userEvent.click(await screen.findByRole("option", { name: "Use one value" }));
        await within(dialog).findByTestId("compact-color-input");
        await settled(dialog);
        const after = dialog.getBoundingClientRect();
        assert.equal(Math.round(after.width), Math.round(before.width), "the width");
        assert.equal(Math.round(after.left), Math.round(before.left), "the left edge");
        assert.equal(Math.round(after.top), Math.round(before.top), "the top");
    });

    it("shows the row of values opacity cannot take whole, at the picker's width", async () => {
        await openScene(1440, 900);
        // Opacity alone on a layer is a line of its own; beside a color it is the color's box.
        const live = document.querySelector("graphty-element")?.session;
        await live?.styles.add({
            name: "Faded",
            target: "node",
            selector: { match: "everything" },
            set: { "node.opacity": 0.5 },
        });
        await live?.styles.settled();
        const tab = await openStyle("Faded");
        const row = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('.ws-row[data-line="node.opacity"]');
            assert.isNotNull(found, "an opacity row");
            return found;
        });
        await userEvent.hover(row);
        await userEvent.click(await within(row).findByRole("button", { name: "Node opacity by attribute" }));
        const fits = await screen.findByRole("group", { name: "Does not fit" });
        const label = fits.querySelector<HTMLElement>(".cm-qa-row-label");
        assert.isNotNull(label);
        assert.isAtMost(label?.scrollWidth ?? 0, label?.clientWidth ?? 0, `"${label?.textContent ?? ""}" is cut`);
    });

    it("varies opacity from 20% to 100%, the app's own range, when a number is picked for it", async () => {
        await openScene(1440, 900);
        // Opacity alone on a layer is a line of its own; beside a color it is the color's box.
        const live = document.querySelector("graphty-element")?.session;
        await live?.styles.add({
            name: "Faded",
            target: "node",
            selector: { match: "everything" },
            set: { "node.opacity": 0.5 },
        });
        await live?.styles.settled();
        const tab = await openStyle("Faded");
        const row = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('.ws-row[data-line="node.opacity"]');
            assert.isNotNull(found, "an opacity row");
            return found;
        });
        await userEvent.hover(row);
        await userEvent.click(await within(row).findByRole("button", { name: "Node opacity by attribute" }));
        // The vary picker names a measure by its method.
        await userEvent.click(await screen.findByRole("option", { name: /^Degree/ }));
        const session = document.querySelector("graphty-element")?.session;
        await waitFor(() => {
            const bound = session?.styles
                .list()
                .map((layer) => layer.encode?.["node.opacity"])
                .find((binding) => binding !== undefined && "by" in binding);
            assert.isDefined(bound);
            assert.deepEqual(bound !== undefined && "range" in bound ? bound.range : undefined, [0.2, 1]);
        });
    });
});
