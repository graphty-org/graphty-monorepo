/**
 * The Style tab by part of the drawing, on the REAL graphty-element with its `file-styles`
 * experiment on, driven by real clicks and keys: the edge tab's parts, both arrow ends together,
 * each part's settings page (the label's on five pages), and Find a setting with its "/" key, its
 * search words, the other layers that set a setting, and a setting it adds staying in its part.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, LayerSpec } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { FIND_BOX_ID } from "../../graph-place/FindBox";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

withFeatures(["file-styles"]);

/**
 * Opens a project of three nodes, two edges and the layers asked for.
 * @param layers - the layers, as `styles.add` takes them.
 * @returns the session.
 */
async function openProject(layers: readonly LayerSpec[]): Promise<GraphSession> {
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
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ]);
    for (const layer of layers) {
        await session.styles.add(layer);
    }
    await session.styles.settled();
    return session;
}

/**
 * A layer over every node or edge that sets what is asked.
 * @param name - its name.
 * @param target - nodes or edges.
 * @param set - what it sets.
 * @returns the layer.
 */
const every = (name: string, target: "node" | "edge", set: LayerSpec["set"]): LayerSpec => ({
    name,
    target,
    selector: { match: "everything" },
    set,
});

/**
 * Opens one tree row's Style tab on one kind's tab.
 * @param name - the row's name.
 * @param kind - nodes or edges.
 * @returns the Style tab.
 */
async function openStyle(name: string, kind: "node" | "edge" = "node"): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    const tab = await screen.findByTestId("style-tab");
    await showKind(kind);
    return tab;
}

/**
 * One section of the tab.
 * @param tab - the Style tab.
 * @param id - `<kind>-<part>`.
 * @returns the section.
 */
async function section(tab: HTMLElement, id: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = tab.querySelector<HTMLElement>(`[data-section="${id}"]`);
        assert.isNotNull(found, `the ${id} section`);
        return found;
    });
}

/**
 * The lines of a part or a list, by property.
 * @param within_ - where to look.
 * @returns their properties, in order.
 */
const lines = (within_: HTMLElement): string[] =>
    [...within_.querySelectorAll<HTMLElement>(".ws-row[data-line]")].map((row) => row.dataset.line ?? "");

/**
 * The settings Find a setting lists, set or not.
 * @param results - its results.
 * @returns their properties, in order.
 */
const found = (results: HTMLElement): string[] =>
    [...results.querySelectorAll<HTMLElement>("[data-result]")].map((row) => row.dataset.result ?? "");

/**
 * Types into Find a setting.
 * @param tab - the Style tab.
 * @param words - what to type.
 * @returns the results.
 */
async function find(tab: HTMLElement, words: string): Promise<HTMLElement> {
    await userEvent.click(within(tab).getByRole("searchbox", { name: "Find a setting" }));
    await userEvent.keyboard(words);
    return waitFor(() => {
        const results = tab.querySelector<HTMLElement>("[data-find-results]");
        assert.isNotNull(results, "the results replace the parts");
        return results;
    });
}

/**
 * Opens a part's settings page by its sliders button.
 * @param tab - the Style tab.
 * @param name - the button's name.
 * @returns the page.
 */
async function openPage(tab: HTMLElement, name: string): Promise<HTMLElement> {
    await userEvent.click(within(tab).getByRole("button", { name }));
    return screen.findByRole("dialog", { name: name.replace(/ settings$/, "") });
}

describe("the edge tab by part of the drawing", () => {
    it("the edge tab draws Line, Ends, Text, Route, Effects, Visibility and Shaders", async () => {
        await openProject([every("Lines", "edge", { "edge.color": "#ff0000" })]);
        const tab = await openStyle("Lines", "edge");
        await waitFor(() => {
            const ids = [...tab.querySelectorAll<HTMLElement>('[data-section^="edge-"]')].map((each) =>
                (each.dataset.section ?? "").replace(/^edge-/, ""),
            );
            assert.deepEqual(ids, ["line", "ends", "text", "route", "effects", "visibility", "shaders"]);
        });
        assert.isNotNull(tab.querySelector("[data-style-parts]"));
    });

    it("both arrow ends show together, each with its size", async () => {
        await openProject([every("Arrows", "edge", { "edge.arrowHead": "normal" })]);
        const tab = await openStyle("Arrows", "edge");
        const ends = await section(tab, "edge-ends");
        await waitFor(() => {
            assert.deepEqual(lines(ends), [
                "edge.arrowHead",
                "edge.arrowHeadSize",
                "edge.arrowTail",
                "edge.arrowTailSize",
            ]);
        });
        const words = [...ends.querySelectorAll<HTMLElement>(".ws-row[data-line] .ws-field-name")].map(
            (name) => name.textContent,
        );
        assert.deepEqual(words, ["Target", "Size", "Source", "Size"]);
    });

    it("a file's bends and ports show in Route and the minus removes them", async () => {
        const session = await openProject([
            every("From the file", "edge", {
                "edge.bends": "0.25,0.1 0.75,0.1",
                "edge.sourcePort": "1,0",
                "edge.targetPort": "-1,0",
            }),
        ]);
        const tab = await openStyle("From the file", "edge");
        const route = await section(tab, "edge-route");
        await waitFor(() => {
            assert.includeMembers(lines(route), ["edge.bends", "edge.sourcePort", "edge.targetPort"]);
        });
        await userEvent.click(within(route).getByRole("button", { name: "Remove edge bends" }));
        await waitFor(() => {
            const layer = session.styles.list().find((each) => each.name === "From the file");
            assert.deepEqual(Object.keys(layer?.set ?? {}).sort(), ["edge.sourcePort", "edge.targetPort"]);
        });
        await userEvent.click(within(route).getByRole("button", { name: "Remove edge source port" }));
        await waitFor(() => {
            assert.notInclude(lines(route), "edge.sourcePort");
        });
    });
});

describe("each part's settings page", () => {
    it("Border's sliders page shows the ring count in words", async () => {
        await openProject([every("Key", "node", { "node.shape": "box" })]);
        const tab = await openStyle("Key");
        const page = await openPage(tab, "Node border settings");
        within(page).getByText("Ring count");
        assert.isNotNull(page.querySelector('[data-unset-line="node.outerBorderCount"]'));
    });

    it("size mode is reachable from Find a setting and Shape's sliders page only", async () => {
        await openProject([every("Key", "node", { "node.sizeMode": "diameter", "node.shape": "box" })]);
        const tab = await openStyle("Key");
        const shape = await section(tab, "node-shape");
        await within(shape).findByRole("button", { name: /^Node shape, Box/ });
        assert.notInclude(lines(shape), "node.sizeMode", "never a row of its section");
        const page = await openPage(tab, "Node shape settings");
        assert.isNotNull(page.querySelector('.ws-row[data-line="node.sizeMode"]'));
        await userEvent.click(within(page).getByRole("button", { name: "Close Node shape" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Node shape" }));
        });
        const results = await find(tab, "size mode");
        assert.include(found(results), "node.sizeMode");
    });

    it("the label's sliders page has Type, Box, Place, Wrap and View pages", async () => {
        await openProject([every("Key", "node", { "node.label": "Hello" })]);
        const tab = await openStyle("Key");
        const page = await openPage(tab, "Node text settings");
        const pages = within(page).getByRole("radiogroup", { name: "Label settings page" });
        assert.strictEqual(within(pages).getAllByRole("radio").length, 5);
        for (const name of ["Type", "Box", "Place", "Wrap", "View"]) {
            within(pages).getByRole("radio", { name });
        }
        await userEvent.click(within(pages).getByText("Place"));
        await waitFor(() => {
            assert.isNotNull(page.querySelector('[data-unset-line="node.labelOffsetX"]'));
        });
        assert.isNull(page.querySelector('[data-unset-line="node.labelWeight"]'), "Type's settings are on Type");
    });
});

describe("Find a setting", () => {
    it("slash in the Style panel focuses Find a setting and slash elsewhere opens the graph Find", async () => {
        await openProject([every("Key", "node", { "node.shape": "box" })]);
        const tab = await openStyle("Key");
        const box = within(tab).getByRole("searchbox", { name: "Find a setting" });
        within(tab).getByText("/", { selector: "kbd" });
        // A control of the panel, not a text field, holds focus: one Tab on from the find box.
        await userEvent.click(box);
        await userEvent.tab();
        assert.notStrictEqual(document.activeElement, box);
        assert.isTrue(tab.contains(document.activeElement));
        await userEvent.keyboard("/");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, box);
        });
        // Elsewhere, "/" is the graph tree's Find.
        const tree = screen.getByRole("tree", { name: "Style layers" });
        await userEvent.click(within(tree).getByRole("treeitem", { name: /^Key, / }));
        await userEvent.keyboard("/");
        await waitFor(() => {
            assert.strictEqual(document.activeElement?.id, FIND_BOX_ID);
        });
    });

    it("Find a setting finds the border by the word stroke", async () => {
        await openProject([every("Key", "node", { "node.shape": "box" })]);
        const tab = await openStyle("Key");
        const results = await find(tab, "stroke");
        assert.include(found(results), "node.borderColor");
        assert.isNull(tab.querySelector('[data-section="node-shape"]'), "the parts give way to the results");
        within(results).getByText("Border", { selector: "[data-find-group] > *" });
    });

    it("Find a setting lists the other layers that set the shadow and opens one", async () => {
        await openProject([
            every("Key", "node", { "node.color": "#00ff00" }),
            every("Shadowed", "node", { "node.shadowColor": "#333333", "node.shadowBlur": 4 }),
        ]);
        const tab = await openStyle("Key");
        const results = await find(tab, "shadow");
        const color = await waitFor(() => {
            const found = results.querySelector<HTMLElement>('[data-result="node.shadowColor"]');
            assert.isNotNull(found);
            return found;
        });
        const link = within(color).getByRole("button", { name: "Open Shadowed" });
        within(color).getByText(/Also set by/);
        await userEvent.click(link);
        await waitFor(() => {
            const tree = screen.getByRole("tree", { name: "Style layers" });
            const row = within(tree).getByRole("treeitem", { name: /^Shadowed, / });
            assert.strictEqual(row.getAttribute("aria-selected"), "true");
        });
    });

    it("a setting added from Find a setting stays in its part", async () => {
        const session = await openProject([every("Key", "node", { "node.shape": "box" })]);
        const tab = await openStyle("Key");
        const results = await find(tab, "ring count");
        await userEvent.click(within(results).getByRole("button", { name: "Add node ring count" }));
        await waitFor(() => {
            const line = results.querySelector('.ws-row[data-line="node.outerBorderCount"]');
            assert.isTrue(line?.contains(document.activeElement) === true, "focus is in the new line");
        });
        await userEvent.keyboard("{Control>}a{/Control}2{Enter}");
        await waitFor(() => {
            assert.strictEqual(
                session.styles.list().find((each) => each.name === "Key")?.set?.["node.outerBorderCount"],
                2,
            );
        });
        await userEvent.click(within(tab).getByRole("button", { name: "Clear search" }));
        const border = await section(tab, "node-border");
        await waitFor(() => {
            assert.include(lines(border), "node.outerBorderCount");
        });
    });

    it("with the cosmograph and node-models experiments off, Find a setting finds no fade, blending or picture", async () => {
        await openProject([every("Key", "edge", { "edge.color": "#ff0000" })]);
        const tab = await openStyle("Key", "edge");
        const results = await find(tab, "blending");
        within(results).getByText("No setting matches");
        await userEvent.click(within(tab).getByRole("button", { name: "Clear search" }));
        await showKind("node");
        const pictures = await find(tab, "picture");
        assert.notInclude(found(pictures), "node.texture");
        assert.notInclude(found(pictures), "node.model");
    });

    it("words typed straight after slash all land in Find a setting", async () => {
        await openProject([every("Key", "node", { "node.shape": "box" })]);
        const tab = await openStyle("Key");
        const box = within(tab).getByRole("searchbox", { name: "Find a setting" });
        await userEvent.click(box);
        await userEvent.tab();
        await userEvent.keyboard("/paint");
        await waitFor(() => {
            assert.strictEqual((box as HTMLInputElement).value, "paint");
        });
        assert.strictEqual(document.activeElement, box);
    });
});
