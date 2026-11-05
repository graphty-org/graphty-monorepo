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
import { inBothSchemes, insetRing } from "../../../test/focus-ring";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

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
    const element = await waitFor(() => {
        const found = document.querySelector("graphty-element");
        assert.isDefined(found?.session);
        return found;
    });
    const session = element?.session;
    if (element === null || session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true });
    const ids = session.data.nodes().map((node) => node.id);
    await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "ids", nodes: ids.slice(0, 4) },
        set: { "node.color": "#e69f00", "node.labelSize": 72, "node.haloColor": "#009e73", "node.haloScale": 1.5 },
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
 * The scene at 900 x 700 with a long key: Degree's size ramp and a shape per community, as well as
 * the colors.
 * @returns the session, the element, the store and the key.
 */
async function longKey(): Promise<{
    session: GraphSession;
    element: HTMLElementTagNameMap["graphty-element"];
    store: WorkspaceStore;
    legend: HTMLElement;
}> {
    const { session, element, store } = await scene(900, 700);
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
    const legend = await screen.findByRole("region", { name: "Legend" });
    await within(legend).findByRole("group", { name: /^Shape: / });
    return { session, element, store, legend };
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
        const legend = await screen.findByRole("region", { name: "Legend" });
        const louvain = await within(legend).findByRole("group", { name: "Color: Louvain" });

        const titles = within(legend)
            .getAllByRole("group")
            // A section of one row named as its title takes no name of its own: its row says it.
            .map(
                (group) =>
                    group.getAttribute("aria-label") ?? group.querySelector(".cm-data-row-name")?.textContent ?? "",
            );
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

    it("keys a hand-made edge layer's fixed pattern by what it paints, and its pattern count not at all", async () => {
        const { session } = await scene(1440, 900);
        await session.styles.add({
            name: "Bob",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.style": "solid", "edge.patternCount": 2 },
        });
        await session.styles.settled();
        const legend = await screen.findByRole("region", { name: "Legend" });
        const line = await within(legend).findByRole("group", { name: "Edge line: Bob" });
        const titles = within(legend)
            .getAllByRole("group")
            // A section of one row named as its title takes no name of its own: its row says it.
            .map(
                (group) =>
                    group.getAttribute("aria-label") ?? group.querySelector(".cm-data-row-name")?.textContent ?? "",
            );
        assert.notInclude(titles, "Bob", "no section is titled by the layer's name alone");
        const names = [...line.querySelectorAll(".cm-data-row-name")].map((name) => name.textContent ?? "");
        assert.deepEqual(names, ["Solid"], "the row names the pattern, not the layer again");
        assert.notInclude(line.textContent, "SolidSolid", "the pattern is not printed twice");
    });

    it("keys what encodes the data, never the Selected row's glow or halo, with a node selected", async () => {
        const { session } = await scene(1440, 900);
        const legend = await screen.findByRole("region", { name: "Legend" });
        await within(legend).findByRole("group", { name: "Color: Louvain" });
        await session.selection.apply({ ids: [session.data.nodes()[0]?.id ?? ""] });
        await session.styles.settled();
        await waitFor(() => {
            assert.isAbove(
                session.styles.legend().filter((block) => session.styles.get(block.layerId)?.name === "Selected")
                    .length,
                0,
            );
        });
        const titles = within(legend)
            .getAllByRole("group")
            // A section of one row named as its title takes no name of its own: its row says it.
            .map(
                (group) =>
                    group.getAttribute("aria-label") ?? group.querySelector(".cm-data-row-name")?.textContent ?? "",
            );
        assert.include(titles, "Color: Louvain");
        assert.notMatch(titles.join("|"), /Selected|Hovered/);
    });

    it("at 900 x 700 leaves the drawing at least half the canvas's width", async () => {
        const { session, element } = await longKey();
        const canvas = element.closest<HTMLElement>(".ws-canvas");
        assert.isNotNull(canvas);
        const ids = session.data.nodes().map((node) => node.id);
        // The key floats over the drawing, which is framed in the whole canvas: measure it as it stays.
        await element.waitForStableFrame();
        const measure = (): { count: number; min: number; max: number; span: number } => {
            const xs = ids.flatMap((id) => {
                const at = element.nodeScreenPosition(id);
                return at === null || at === undefined ? [] : [at.x];
            });
            const min = Math.min(...xs);
            const max = Math.max(...xs);
            return { count: xs.length, min, max, span: max - min };
        };
        const first = measure();
        const width = canvas?.clientWidth ?? 0;
        if (first.span < width / 2) {
            // Diagnostics for #3767 (passed on retry in CI, never reproduced locally): whether the
            // "stable" frame was still moving shows in a second measurement after another wait.
            await element.waitForStableFrame();
            const again = measure();
            assert.fail(
                `the drawing's width on the canvas: ${JSON.stringify({ first, again, canvasWidth: width, nodes: ids.length })}`,
            );
        }
        await page.screenshot({ path: `${SHOTS}/key-900x700.png` });
    });

    it("at 900 x 700 the long key scrolls: it takes focus, says what lies below and cuts no line", async () => {
        const { legend } = await longKey();
        // It scrolls, so it takes focus, says how many entries lie below, and it stops at a line's
        // edge above that line at its foot: no line shows cut in half.
        assert.equal(legend.tabIndex, 0);
        const foot = await within(legend).findByText(/^\d+ more below$/);
        await waitFor(() => {
            const box = legend.getBoundingClientRect();
            const edge =
                legend.clientTop +
                legend.clientHeight -
                Number.parseFloat(getComputedStyle(legend).paddingBottom) -
                foot.offsetHeight;
            const cut = [...legend.querySelectorAll<HTMLElement>(".ws-legend-section > *")].filter((line) => {
                const rect = line.getBoundingClientRect();
                const top = rect.top - box.top + legend.scrollTop;
                return top < edge && top + rect.height > edge + 0.5;
            });
            assert.deepEqual(
                cut.map((line) => line.textContent),
                [],
                "lines cut at the bottom edge",
            );
        });
        const result = await axe.run(legend, { runOnly: ["scrollable-region-focusable"] });
        assert.deepEqual(
            result.violations.map((violation) => violation.id),
            [],
        );
        // Tab reaches it, and the arrow keys scroll it.
        await userEvent.click(within(legend).getAllByRole("group")[0] ?? legend);
        await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
        assert.notStrictEqual(document.activeElement, legend);
        await userEvent.keyboard("{Tab}");
        assert.strictEqual(document.activeElement, legend);
        // Its ring is the shared inset one, 3:1 against the card in both schemes (WCAG 1.4.11).
        for (const [scheme, ring] of Object.entries(inBothSchemes(() => insetRing(legend)))) {
            assert.isAtLeast(ring.width, 1, `${scheme}: the key draws a ring`);
            assert.isAtLeast(ring.contrast, 3, `${scheme}: the ring is 3:1 against the card`);
        }
        await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
        await waitFor(() => {
            assert.isAbove(legend.scrollTop, 0, "scrolled by the arrow keys");
        });
    });

    it("with three runs on at 1366 x 768, never scrolls by a sliver, and names the route as the Analyze list does", async () => {
        const { session } = await scene(1366, 768);
        const ids = session.data.nodes().map((node) => node.id);
        await session.runs.start("degree");
        await session.runs.start("edge-betweenness");
        await session.runs.start("shortest-path", { source: String(ids[0]), target: String(ids[11]) });
        await session.styles.settled();
        const legend = await screen.findByRole("region", { name: "Legend" });
        await within(legend).findByRole("group", { name: /Shortest path/ });
        assert.notInclude(legend.textContent, "Shortest route");
        await page.screenshot({ path: `${SHOTS}/key-1366x768-three-runs.png` });
        await waitFor(() => {
            const over = legend.scrollHeight - legend.clientHeight;
            assert.isTrue(over <= 1 || over > 32, `scrolls by ${String(over)} px`);
        });
    });

    it("at 200% zoom stays inside the canvas, clear of the inspector beside it", async () => {
        await scene(683, 384);
        const legend = await screen.findByRole("region", { name: "Legend" });
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
        const element = await waitFor(() => {
            const found = document.querySelector("graphty-element");
            assert.isDefined(found?.session);
            return found;
        });
        const session = element?.session;
        if (element === null || session === undefined) {
            throw new Error("the element never came up");
        }
        await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
        await session.config.set({ startingRows: true, editableBase: true });
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
        // The owner's report: a restyle brought the key up, and the key coming up reframed the
        // graph. (It was the Selected row's halo; Selected is no longer keyed, so a layer that
        // marks a node is what brings the key up here.)
        await session.styles.add({
            name: "Key people",
            target: "node",
            selector: { match: "ids", nodes: [session.data.nodes()[0]?.id ?? ""] },
            set: { "node.haloColor": "#ff00ff" },
        });
        await screen.findByRole("region", { name: "Legend" });
        await element.waitForStableFrame();

        const now = drawn();
        assert.strictEqual(now.length, zoomed.length);
        now.forEach((value, at) => {
            assert.closeTo(value, zoomed[at] ?? Number.NaN, 1, "every node is drawn where the reader's zoom put it");
        });
    });

    it("never moves the drawing when the key comes up, grows, or Undo takes it away", async () => {
        await page.viewport(1440, 900);
        const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, inspected: null });
        render(<Workspace store={store} />);
        const element = await waitFor(() => {
            const found = document.querySelector("graphty-element");
            assert.isDefined(found?.session);
            return found;
        });
        const session = element?.session;
        if (element === null || session === undefined) {
            throw new Error("the element never came up");
        }
        await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
        await session.config.set({ startingRows: true, editableBase: true });
        await element.waitForStableFrame();
        assert.isFalse(element.cameraPlaced, "the element frames the graph on its own");
        const drawn = (): number[] =>
            session.data.nodes().flatMap((node) => {
                const at = element.nodeScreenPosition(node.id);
                return at === undefined ? [] : [at.x, at.y];
            });
        const framed = drawn();
        const unmoved = async (what: string): Promise<void> => {
            await element.waitForStableFrame();
            assert.deepEqual(
                element.viewInsets,
                { top: 0, right: 0, bottom: 0, left: 0 },
                "the key is an overlay, never a view inset",
            );
            const now = drawn();
            assert.strictEqual(now.length, framed.length);
            now.forEach((value, at) => {
                assert.closeTo(value, framed[at] ?? Number.NaN, 1, what);
            });
        };

        // The first color: the key comes up over a drawing that has the whole canvas.
        await session.styles.add({
            name: "Key people",
            target: "node",
            selector: { match: "ids", nodes: [session.data.nodes()[0]?.id ?? ""] },
            set: { "node.color": "#ff00ff" },
        });
        await screen.findByRole("region", { name: "Legend" });
        await unmoved("the key coming up moved the drawing");

        await session.runs.start("louvain");
        await session.styles.settled();
        await waitFor(() => {
            const legend = screen.getByRole("region", { name: "Legend" });
            assert.isAtLeast(within(legend).getAllByRole("group").length, 2, "the key grew by the run's groups");
        });
        await unmoved("the key growing as a run ended moved the drawing");

        await session.undo();
        await session.undo();
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "Legend" }), "Undo took the key away");
        });
        await unmoved("Undo taking the key away moved the drawing");
    });

    it("does not come up for an effect, and names the effect when the reader asks for the key", async () => {
        await page.viewport(1440, 900);
        const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, inspected: null });
        render(<Workspace store={store} />);
        const element = await waitFor(() => {
            const found = document.querySelector("graphty-element");
            assert.isDefined(found?.session);
            return found;
        });
        const session = element?.session;
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
        await session.config.set({ startingRows: true, editableBase: true });
        const ids = session.data.nodes().map((node) => node.id);
        const layer = await session.styles.add({
            name: "Glowing",
            target: "node",
            selector: { match: "ids", nodes: ids.slice(0, 5) },
            set: { "node.shaders": [{ shader: "uncertainty-aura" }] },
        });
        await session.styles.settled();
        await element?.waitForStableFrame();
        // A style write of a shader is no reason for the key to come up.
        assert.isNull(screen.queryByRole("region", { name: "Legend" }));
        assert.isFalse(store.get().keyHasEntries);

        // Asked for, the key names the shader, as the catalog does.
        store.set({ legendShown: true, legendAsked: true });
        const legend = await screen.findByRole("region", { name: "Legend" });
        const section = await within(legend).findByRole("group", { name: "Shaders: Glowing" });
        assert.deepEqual(
            [...section.querySelectorAll(".cm-data-row-name")].map((name) => name.textContent),
            ["Aura"],
        );

        // A shader a project adds is named by its catalog name, as a built-in is.
        const added = await session.shaders.add(`/* graphty-shader 1
{ "id": "acme/sticker", "name": "Sticker", "place": "replace" }
*/
vec4 shade(NodeInput n) {
    return vec4(n.color.rgb, step(length(n.uv), 0.9));
}
`);
        assert.isTrue(added.ok, JSON.stringify(added));
        const sticker = added.ok ? added.descriptor.id : "";
        await session.styles.update(layer.id, {
            set: { "node.shaders": [{ shader: "uncertainty-aura" }, { shader: sticker }] },
        });
        await session.styles.settled();
        await waitFor(() => {
            const now = within(legend).getByRole("group", { name: "Shaders: Glowing" });
            assert.deepEqual(
                [...now.querySelectorAll(".cm-data-row-name")].map((name) => name.textContent),
                ["Aura, Sticker"],
            );
        });

        // A shader the layer turns off draws nothing, so its block goes: no empty "Shaders" block.
        await session.styles.update(layer.id, { set: { "node.shaders": [{ shader: "uncertainty-aura", off: true }] } });
        await session.styles.settled();
        await waitFor(() => {
            assert.isNull(within(legend).queryByRole("group", { name: /^Shaders/ }));
        });
    });
});
