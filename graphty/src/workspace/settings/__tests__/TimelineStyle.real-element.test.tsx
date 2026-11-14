/**
 * Settings > General > Default timeline style, on the real graphty-element: the reader's choice
 * decides the look of the Timeline Hidden row a new project gets, the row and the setting exist only
 * with the timeline experiment on, and moving the time window leaves the header's filter chip (what
 * is visible) as it was, since the window changes only the drawing. Real clicks throughout.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { openBy } from "../../../test/open";
import { pickSample } from "../../../test/samples-dialog";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { TIMELINE_STYLE } from "../preferences";

const MARVEL = "Marvel films";
const ROW = "Timeline Hidden";
/** A sample with no time in it, for the experiment off. */
const LES_MIS = "Les Miserables";

/**
 * Shows the start screen.
 * @returns the store.
 */
function mount(): WorkspaceStore {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    return store;
}

/**
 * Opens Settings from the start screen, as a reader does.
 * @returns the dialog.
 */
async function openSettings(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: "Settings..." }));
    return screen.findByRole("dialog", { name: "Settings" });
}

/**
 * Picks a Default timeline style in Settings and closes it with Done.
 * @param label - the choice's words.
 */
async function chooseStyle(label: "Hidden" | "Ghost"): Promise<void> {
    const dialog = await openSettings();
    await within(dialog).findByText("Default timeline style");
    await userEvent.click(within(dialog).getByText(label));
    await waitFor(() => {
        assert.isTrue(within(dialog).getByRole<HTMLInputElement>("radio", { name: label }).checked);
    });
    await closeSettings(dialog);
}

/**
 * Closes Settings with Done and waits until it is gone.
 * @param dialog - the dialog.
 */
async function closeSettings(dialog: HTMLElement): Promise<void> {
    await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() => {
        assert.isNull(screen.queryByRole("dialog", { name: "Settings" }));
    });
}

/**
 * The style tree's row names as the reader sees them.
 * @returns the rows' accessible names.
 */
async function treeRows(): Promise<string[]> {
    const tree = within(await screen.findByRole("tree", { name: "Style layers" }));
    await tree.findByRole("treeitem", { name: /^Everything, / });
    return tree.getAllByRole("treeitem").map((row) => row.getAttribute("aria-label") ?? row.textContent);
}

/**
 * The Timeline Hidden row's node layer.
 * @param session - the element's session.
 * @returns the layer.
 */
function nodeLayer(session: GraphSession): ReturnType<GraphSession["styles"]["list"]>[number] {
    const layer = session.styles.list().find((each) => each.name === ROW && each.target === "node");
    if (layer === undefined) {
        throw new Error("no Timeline Hidden row");
    }
    return layer;
}

beforeEach(() => {
    localStorage.removeItem(TIMELINE_STYLE.key);
    sessionStorage.clear();
});

beforeAll(async () => {
    // Wide enough that the side panels leave the canvas toolbar uncovered.
    await page.viewport(1366, 768);
});

describe("Default timeline style with the timeline experiment on", () => {
    withFeatures(["timeline"]);

    it("gives a new project a Timeline Hidden row drawn as a ghost with Ghost", async () => {
        const store = mount();
        await chooseStyle("Ghost");
        const session = await openBy(store, () => pickSample(MARVEL));
        await waitFor(async () => {
            assert.isTrue((await treeRows()).some((row) => row.startsWith(ROW)));
        });
        const layer = nodeLayer(session);
        assert.deepEqual(layer.selector, { match: "state", state: "outsideWindow" });
        assert.strictEqual(layer.set?.["node.opacity"], 0.2);
        assert.notStrictEqual(layer.set?.["node.visible"], false);
        assert.strictEqual(session.config.timelineHiddenLook, "ghost");
    });

    it("gives a new project a Timeline Hidden row that hides with Hidden", async () => {
        localStorage.setItem(TIMELINE_STYLE.key, "ghost");
        const store = mount();
        await chooseStyle("Hidden");
        const session = await openBy(store, () => pickSample(MARVEL));
        await waitFor(async () => {
            assert.isTrue((await treeRows()).some((row) => row.startsWith(ROW)));
        });
        const layer = nodeLayer(session);
        assert.strictEqual(layer.set?.["node.visible"], false);
        assert.strictEqual(session.config.timelineHiddenLook, "hidden");
    });

    it("leaves the filter chip's visible count as it was when the window moves", async () => {
        const store = mount();
        const session = await openBy(store, () => pickSample(MARVEL));
        // Setup through the element: a time field and a filter that hides, so the chip shows.
        await session.time.setField({ edges: { start: "released" } });
        await session.visibility.addCondition({
            id: "busy",
            effect: "keep",
            rule: {
                kind: "union",
                side: "nodes",
                within: "graph",
                branches: [{ start: "all", steps: [{ op: "keep", rule: { kind: "degree", min: 3 } }] }],
            },
        });
        const chip = await screen.findByRole("button", { name: /^Filter: / });
        const before = chip.getAttribute("aria-label") ?? chip.textContent;
        const summary = JSON.stringify(session.visibility.summary);

        // The canvas toolbar's Timeline button opens the dock.
        await userEvent.click(await screen.findByRole("button", { name: "Timeline" }));
        const dock = await screen.findByRole("region", { name: "Timeline" });
        await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));
        await waitFor(() => {
            assert.isNotNull(session.time.current);
        });
        const first = Number(session.time.current?.from);
        await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));
        await waitFor(() => {
            assert.isAbove(Number(session.time.current?.from), first);
        });

        const after = screen.getByRole("button", { name: /^Filter: / });
        assert.strictEqual(after.getAttribute("aria-label") ?? after.textContent, before);
        assert.strictEqual(JSON.stringify(session.visibility.summary), summary);
        // The window still holds less than the whole graph: it narrows the drawing, not the count.
        const { inside } = session.time;
        assert.isNotNull(inside);
        assert.isBelow(inside?.edges ?? Number.POSITIVE_INFINITY, session.visibility.summary.visibleEdges);
    });
});

describe("Default timeline style with the timeline experiment off", () => {
    withFeatures([]);

    it("offers no setting and adds no row", async () => {
        const store = mount();
        const dialog = await openSettings();
        await within(dialog).findByText("Number format");
        assert.isNull(within(dialog).queryByText("Default timeline style"));
        await closeSettings(dialog);
        const session = await openBy(store, () => pickSample(LES_MIS));
        const rows = await treeRows();
        assert.isFalse(
            rows.some((row) => row.startsWith(ROW)),
            rows.join(", "),
        );
        assert.isFalse(session.styles.list().some((layer) => layer.name === ROW));
    });
});
