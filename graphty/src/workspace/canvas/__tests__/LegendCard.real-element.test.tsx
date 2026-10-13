/**
 * The canvas key on the REAL graphty-element, on Les Miserables with the starting rows on and
 * nothing selected: no block for a row that paints nothing (Selected), none for a ring's size or
 * a label's size printed as a bare number, a halo titled by what it is, a run's groups in rank
 * order even when one has its own color, a chit ring that shows on the dark card, and at 900 x 700
 * a key that leaves the drawing most of the canvas.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import axe from "axe-core";
import { assert, describe, it } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and runs finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** Where the pictures for the owner's review go, relative to this file. */
const SHOTS = "../../../../../design/ui/studio/tier3/build/tree-key-settings";

/**
 * Renders the workspace at a window size, loads Les Miserables with the starting rows on, adds a
 * reader's layer with a label size and a halo, runs Louvain and gives its third-largest group its
 * own color.
 * @param width - the window's width.
 * @param height - the window's height.
 * @returns the session, the element and the store.
 */
async function scene(
    width: number,
    height: number,
): Promise<{ session: GraphSession; element: HTMLElementTagNameMap["graphty-element"]; store: WorkspaceStore }> {
    await page.viewport(width, height);
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, inspected: null });
    render(<Workspace store={store} />);
    const element = await waitFor(
        () => {
            const found = document.querySelector("graphty-element");
            assert.isDefined(found?.session);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    const session = element?.session;
    if (element === null || session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true });
    const ids = session.data.nodes().map((node) => node.id);
    await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "ids", nodes: ids.slice(0, 4) },
        set: { "node.color": "#e69f00", "node.labelSize": 72, "node.haloColor": "#009e73", "node.haloSize": 1.5 },
    });
    const run = await session.runs.start("louvain");
    await session.styles.settled();
    const louvain = session.runs.bindings(run.runId).find((id) => session.styles.get(id)?.target === "node");
    const third = louvain === undefined ? undefined : session.styles.categories(louvain, "node.color")[2];
    const value = third?.value;
    if (louvain === undefined || (typeof value !== "number" && typeof value !== "string")) {
        throw new Error("Louvain painted no groups");
    }
    await session.styles.setValueEntry(louvain, "node.color", value, "#d55e00");
    await session.styles.settled();
    return { session, element, store };
}

/**
 * The relative luminance of a computed `rgb()` color (WCAG 2.x).
 * @param color - the computed color.
 * @returns the luminance.
 */
function luminance(color: string): number {
    const [r = 0, g = 0, b = 0] = (color.match(/[\d.]+/g) ?? []).map((c) => {
        const s = Number(c) / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The first opaque background behind an element.
 * @param element - the element.
 * @returns its computed color.
 */
function backgroundBehind(element: HTMLElement): string {
    for (let at: HTMLElement | null = element.parentElement; at !== null; at = at.parentElement) {
        const color = getComputedStyle(at).backgroundColor;
        const alpha = Number((color.match(/[\d.]+/g) ?? [])[3] ?? 1);
        if (alpha === 1) {
            return color;
        }
    }
    return "rgb(255, 255, 255)";
}

/**
 * Turns the real mouse wheel over the middle of an element, through the DevTools protocol, so the
 * browser's own input pipeline delivers it.
 * @param element - the element.
 * @param deltaY - how far; negative zooms in.
 */
async function wheelOver(element: HTMLElement, deltaY: number): Promise<void> {
    const box = element.getBoundingClientRect();
    let x = box.left + box.width / 2;
    let y = box.top + box.height / 2;
    // The test page is an iframe of the runner's page, possibly scaled: map into the top page.
    for (
        let frame = window.frameElement;
        frame !== null;
        frame = frame.ownerDocument.defaultView?.frameElement ?? null
    ) {
        const outer = frame.getBoundingClientRect();
        const scale = outer.width / ((frame as HTMLIFrameElement).contentWindow?.innerWidth ?? outer.width);
        x = outer.left + x * scale;
        y = outer.top + y * scale;
    }
    await (cdp() as unknown as { send: (method: string, params: object) => Promise<unknown> }).send(
        "Input.dispatchMouseEvent",
        { type: "mouseWheel", x, y, deltaX: 0, deltaY },
    );
}

describe("the canvas key on the real element", () => {
    it("keys only what a reader can read, groups in rank order, with chits ringed on the dark card", async () => {
        await scene(1440, 900);
        const legend = await screen.findByRole("region", { name: "Legend" }, { timeout: TIMEOUT_MS });
        const louvain = await within(legend).findByRole(
            "group",
            { name: "Color: Communities" },
            { timeout: TIMEOUT_MS },
        );

        const titles = within(legend)
            .getAllByRole("group")
            .map((group) => group.getAttribute("aria-label") ?? "");
        assert.notInclude(titles.join("|"), "Selected", "Selected paints nothing while nothing is selected");
        assert.include(titles, "Halo: Key people");
        assert.notInclude(legend.textContent, "72", "a label's size is not a key");
        assert.notInclude(legend.textContent, "1.5", "a halo's size is not a key");

        const groups = [...louvain.querySelectorAll(".cm-data-row-name")].map((name) => name.textContent ?? "");
        const ranked = groups.filter((name) => name.startsWith("Group "));
        assert.isAtLeast(ranked.length, 3);
        assert.deepEqual(
            ranked,
            ranked.map((_, i) => `Group ${String(i + 1)}`),
            "Group 3 has its own color and still sits third",
        );

        const chit = louvain.querySelector<HTMLElement>(".ws-legend-chit");
        assert.isNotNull(chit);
        if (chit === null) {
            return;
        }
        const ring = getComputedStyle(chit);
        assert.equal(ring.outlineStyle, "solid");
        const [hi, lo] = [luminance(ring.outlineColor), luminance(backgroundBehind(chit))].sort((a, b) => b - a);
        assert.isAtLeast(((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05), 3, "the chit's ring against the dark card");
        await page.screenshot({ path: `${SHOTS}/key-1440x900-dark.png` });
    });

    it("at 900 x 700 leaves the drawing at least half the canvas's width", async () => {
        const { session, element, store } = await scene(900, 700);
        // A long key: Degree's size ramp and a shape per community, as well as the colors.
        await session.runs.start("degree");
        const louvain = session.runs.list().find((run) => run.algorithm === "louvain");
        assert.isDefined(louvain);
        const group = session.results.path(louvain?.id ?? "", "group");
        await session.styles.add({
            name: "Shapes",
            target: "node",
            selector: { match: "has", path: group },
            encode: { "node.shape": { by: group, scale: "ordinal" } },
        });
        await session.styles.settled();
        const legend = await screen.findByRole("region", { name: "Legend" }, { timeout: TIMEOUT_MS });
        await within(legend).findByRole("group", { name: "Shape: Shapes" }, { timeout: TIMEOUT_MS });
        const canvas = element.closest<HTMLElement>(".ws-canvas");
        assert.isNotNull(canvas);
        const ids = session.data.nodes().map((node) => node.id);
        // The key's room is reserved and the graph framed clear of it: wait for the inset, then for
        // the frame after it to land and settle, and measure the drawing as it stays.
        await waitFor(
            () => {
                assert.isNotEmpty(Object.keys(store.get().viewInsets));
            },
            { timeout: TIMEOUT_MS },
        );
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await element.waitForStableFrame();
        const xs = ids.flatMap((id) => {
            const at = element.nodeScreenPosition(id);
            return at === null || at === undefined ? [] : [at.x];
        });
        const span = Math.max(...xs) - Math.min(...xs);
        assert.isAtLeast(span, (canvas?.clientWidth ?? 0) / 2, "the drawing's width on the canvas");
        await page.screenshot({ path: `${SHOTS}/key-900x700.png` });

        // It scrolls, so it takes focus and marks that more lies below until its end shows.
        assert.equal(legend.tabIndex, 0);
        assert.isTrue(legend.hasAttribute("data-more-below"));
        assert.isNotNull(legend.querySelector(".ws-legend-more"));
        const result = await axe.run(legend, { runOnly: ["scrollable-region-focusable"] });
        assert.deepEqual(
            result.violations.map((violation) => violation.id),
            [],
        );
        await userEvent.click(within(legend).getAllByRole("group")[0] ?? legend);
        await userEvent.keyboard("{End}");
        await waitFor(() => {
            assert.isFalse(legend.hasAttribute("data-more-below"), "scrolled to its end, no more below");
        });
        assert.isNull(legend.querySelector(".ws-legend-more"));
    });

    it("with three runs on at 1366 x 768, never scrolls by a sliver, and names the route as the tree does", async () => {
        const { session } = await scene(1366, 768);
        const ids = session.data.nodes().map((node) => node.id);
        await session.runs.start("degree");
        await session.runs.start("edge-betweenness");
        await session.runs.start("shortest-path", { source: String(ids[0]), target: String(ids[11]) });
        await session.styles.settled();
        const legend = await screen.findByRole("region", { name: "Legend" }, { timeout: TIMEOUT_MS });
        await within(legend).findByRole("group", { name: /Shortest route/ }, { timeout: TIMEOUT_MS });
        assert.notInclude(legend.textContent, "Shortest path");
        await page.screenshot({ path: `${SHOTS}/key-1366x768-three-runs.png` });
        await waitFor(() => {
            const over = legend.scrollHeight - legend.clientHeight;
            assert.isTrue(over <= 1 || over > 32, `scrolls by ${String(over)} px`);
        });
    });

    it("at 200% zoom stays inside the canvas, clear of the inspector beside it", async () => {
        await scene(683, 384);
        const legend = await screen.findByRole("region", { name: "Legend" }, { timeout: TIMEOUT_MS });
        const canvas = legend.closest<HTMLElement>(".ws-canvas") ?? legend.parentElement;
        await waitFor(() => {
            assert.isAtMost(
                legend.getBoundingClientRect().right,
                canvas?.getBoundingClientRect().right ?? 0,
                "the key's right edge",
            );
        });
        await page.screenshot({ path: `${SHOTS}/key-200-percent.png` });
    });

    it("leaves the reader's zoom alone when a restyle brings the key up over the drawing", async () => {
        await page.viewport(1440, 900);
        const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, inspected: null });
        render(<Workspace store={store} />);
        const element = await waitFor(
            () => {
                const found = document.querySelector("graphty-element");
                assert.isDefined(found?.session);
                return found;
            },
            { timeout: TIMEOUT_MS },
        );
        const session = element?.session;
        if (element === null || session === undefined) {
            throw new Error("the element never came up");
        }
        await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
        await session.config.set({ startingRows: true });
        await element.waitForStableFrame();
        assert.isNull(screen.queryByRole("region", { name: "Legend" }), "no key yet: nothing is keyed");

        await wheelOver(element, -600);
        await waitFor(() => {
            assert.isTrue(element.cameraPlaced, "the reader's wheel placed the camera");
        });
        await element.waitForStableFrame();
        // What the reader sees: where each node is drawn. (The camera's own numbers move when the
        // key reserves its room, by design, with nothing drawn moving.)
        const drawn = (): number[] =>
            session.data.nodes().flatMap((node) => {
                const at = element.nodeScreenPosition(node.id);
                return at === undefined ? [] : [at.x, at.y];
            });
        const zoomed = drawn();
        // The owner's report: with a node selected, changing the Selected row's halo color brought
        // the key up, and the key coming up reframed the graph.
        await session.selection.apply({ ids: [session.data.nodes()[0]?.id ?? ""] });
        const selected = session.styles.list().find((layer) => layer.name === "Selected" && layer.target === "node");
        assert.isDefined(selected);
        await session.styles.update(selected?.id ?? "", { set: { ...selected?.set, "node.haloColor": "#ff00ff" } });
        await waitFor(
            () => {
                assert.isNotEmpty(Object.keys(store.get().viewInsets), "the key came up and reserved its room");
            },
            { timeout: TIMEOUT_MS },
        );
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await element.waitForStableFrame();

        const now = drawn();
        assert.strictEqual(now.length, zoomed.length);
        now.forEach((value, at) => {
            assert.closeTo(value, zoomed[at] ?? Number.NaN, 1, "every node is drawn where the reader's zoom put it");
        });
    });
});
