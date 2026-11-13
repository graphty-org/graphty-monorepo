/**
 * The Style tab by part of the drawing, on the REAL graphty-element with its `file-styles`
 * experiment on, driven by real clicks and keys: the node tab draws one section per part of a
 * node, a part the layer sets nothing in is a closed header and one it sets carries a dot, a quiet
 * setting (draw order) marks its part without a row, Fill and Effects list one heading line per
 * paint or effect with a minus for all of it, and a folder's panel writes to every layer in it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, LayerSpec } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

/**
 * Opens a project of three nodes and the layers asked for.
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
    await session.data.addNodes([
        { id: "a", class: "Tool" },
        { id: "b", class: "Input" },
        { id: "c", class: "Other" },
    ]);
    for (const layer of layers) {
        await session.styles.add(layer);
    }
    await session.styles.settled();
    return session;
}

/**
 * A node layer over every node that sets what is asked.
 * @param name - its name.
 * @param set - what it sets.
 * @returns the layer.
 */
const everyNode = (name: string, set: LayerSpec["set"]): LayerSpec => ({
    name,
    target: "node",
    selector: { match: "everything" },
    set,
});

/**
 * Opens one tree row's Style tab on its node tab.
 * @param name - the row's name.
 * @returns the Style tab.
 */
async function openStyle(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    const tab = await screen.findByTestId("style-tab");
    await showKind("node");
    return tab;
}

/**
 * The node sections the tab draws, in order.
 * @param tab - the Style tab.
 * @returns their ids, `node-` dropped.
 */
function nodeSections(tab: HTMLElement): string[] {
    return [...tab.querySelectorAll<HTMLElement>('[data-section^="node-"]')].map((each) =>
        (each.dataset.section ?? "").replace(/^node-/, ""),
    );
}

/**
 * One node section of the tab.
 * @param tab - the Style tab.
 * @param id - the part's id.
 * @returns the section.
 */
function section(tab: HTMLElement, id: string): HTMLElement {
    const found = tab.querySelector<HTMLElement>(`[data-section="node-${id}"]`);
    assert.isNotNull(found, `the ${id} section`);
    return found;
}

/**
 * Whether a section carries the dot that says the layer sets something in it.
 * @param tab - the Style tab.
 * @param id - the part's id.
 * @returns true when it does.
 */
const dotted = (tab: HTMLElement, id: string): boolean =>
    section(tab, id).querySelector('[data-testid="control-section-dot"]') !== null;

describe("the node tab with file styles off", () => {
    withFeatures([]);

    it("with file styles off the node tab draws Shape, Visibility, Text, Fill and Shaders as today", async () => {
        await openProject([everyNode("Key", { "node.shape": "box" })]);
        const tab = await openStyle("Key");
        await waitFor(() => {
            assert.deepEqual(nodeSections(tab), ["shape", "visibility", "text", "fill", "shaders"]);
        });
        assert.isNull(tab.querySelector("[data-style-parts]"));
    });
});

describe("the node tab by part of the drawing", () => {
    withFeatures(["file-styles"]);

    it("with file styles on the node tab draws Shape, Fill, Border, Text, Effects, Order and groups, Visibility and Shaders", async () => {
        await openProject([everyNode("Key", { "node.shape": "box" })]);
        const tab = await openStyle("Key");
        await waitFor(() => {
            assert.deepEqual(nodeSections(tab), [
                "shape",
                "fill",
                "border",
                "text",
                "effects",
                "order",
                "visibility",
                "shaders",
            ]);
        });
        assert.isNotNull(within(section(tab, "order")).getByRole("heading", { name: /Order and groups/ }));
    });

    it("a part the layer sets nothing in is a closed header and a part it sets carries a dot", async () => {
        await openProject([everyNode("Key", { "node.borderColor": "#ff0000", "node.borderWidth": 2 })]);
        const tab = await openStyle("Key");
        await waitFor(() => {
            assert.isNotNull(section(tab, "border").querySelector('.ws-row[data-line="node.borderColor"]'));
        });
        assert.isTrue(dotted(tab, "border"));
        assert.isFalse(dotted(tab, "effects"));
        assert.isNull(section(tab, "effects").querySelector(".ws-row"), "Effects is its header alone");
        within(section(tab, "effects")).getByRole("button", { name: "Add to node effects" });
    });

    it("a layer that sets only draw order shows the dot on Order and groups and no row", async () => {
        await openProject([everyNode("Key", { "node.drawOrder": 3 })]);
        const tab = await openStyle("Key");
        await waitFor(() => {
            assert.isTrue(dotted(tab, "order"));
        });
        assert.isNull(section(tab, "order").querySelector(".ws-row"));
    });

    it("typing a border color paints the node's border", async () => {
        const session = await openProject([everyNode("Key", { "node.shape": "box" })]);
        const tab = await openStyle("Key");
        await userEvent.click(within(section(tab, "border")).getByRole("button", { name: "Add to node border" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Border color/ }));
        await waitFor(() => {
            const line = section(tab, "border").querySelector('.ws-row[data-line="node.borderColor"]');
            assert.isTrue(line?.contains(document.activeElement) === true, "focus is in the new line");
        });
        await userEvent.keyboard("red{Enter}");
        await waitFor(() => {
            const painted = session.styles.explain({ node: "a" }).merged["node.borderColor"] as
                { hex?: string } | string | undefined;
            const hex = typeof painted === "string" ? painted : painted?.hex;
            assert.strictEqual(hex?.slice(0, 7).toUpperCase(), "#FF0000");
        });
    });

    it("Fill lists one row per paint and the gradient row shows its stops", async () => {
        await openProject([
            everyNode("Key", {
                "node.color": "#00ff00",
                "node.gradientKind": "linear",
                "node.gradientColors": "#ff0000 rgb(0, 0, 255) #ffff00",
                "node.gradientStops": "0 0.25 1",
            }),
        ]);
        const tab = await openStyle("Key");
        const fill = section(tab, "fill");
        await waitFor(() => {
            assert.deepEqual(
                [...fill.querySelectorAll<HTMLElement>("[data-item]")].map((each) => each.dataset.item),
                ["solid", "gradient"],
            );
        });
        const editor = within(fill).getByTestId("gradient-editor");
        const hexes = within(editor)
            .getAllByTestId("gradient-editor-stop-hex")
            .map((box) => (box as HTMLInputElement).value.toUpperCase());
        assert.deepEqual(hexes, ["FF0000", "0000FF", "FFFF00"]);
        assert.isNull(fill.querySelector('.ws-row[data-line="node.gradientStops"]'), "the stops are on the editor");
    });

    it("removing the drop shadow row removes all five shadow channels", async () => {
        const shadow = {
            "node.shadowColor": "#333333",
            "node.shadowOpacity": 0.5,
            "node.shadowBlur": 4,
            "node.shadowOffsetX": 2,
            "node.shadowOffsetY": 2,
        };
        const session = await openProject([everyNode("Key", { "node.color": "#00ff00", ...shadow })]);
        const tab = await openStyle("Key");
        const effects = section(tab, "effects");
        await waitFor(() => {
            assert.isNotNull(effects.querySelector('[data-item="shadow"]'));
        });
        await userEvent.click(within(effects).getByRole("button", { name: "Remove drop shadow" }));
        await waitFor(() => {
            const layer = session.styles.list().find((each) => each.name === "Key");
            assert.deepEqual(Object.keys(layer?.set ?? {}), ["node.color"]);
        });
    });

    it("the shape list is named Search 53 shapes and lists the graph's shapes first with counts", async () => {
        const session = await openProject([
            everyNode("Key", { "node.shape": "box" }),
            {
                name: "Round",
                target: "node",
                selector: { match: "ids", nodes: ["c"] },
                set: { "node.shape": "sphere" },
            },
        ]);
        const tab = await openStyle("Key");
        const shapes = session.catalog.channelValues("node.shape");
        assert.strictEqual(shapes.length, 53, "the element offers 53 shapes with file styles on");
        await userEvent.click(await within(section(tab, "shape")).findByRole("button", { name: /^Node shape, Box/ }));
        const search = await screen.findByPlaceholderText("Search 53 shapes");
        const list = await screen.findByRole("group", { name: /values$/ });
        const options = within(list).getAllByRole("option");
        assert.deepEqual(
            options.slice(0, 3).map((option) => option.textContent),
            ["Box2 nodes", "Sphere1 node", "Cylinder"],
            "the graph's shapes first, with how many nodes each, then the rest",
        );
        assert.strictEqual(document.activeElement, search);
    });

    it("typing in the shape list filters it and Enter picks the shape", async () => {
        const session = await openProject([everyNode("Key", { "node.shape": "box" })]);
        const tab = await openStyle("Key");
        await userEvent.click(await within(section(tab, "shape")).findByRole("button", { name: /^Node shape, Box/ }));
        await screen.findByPlaceholderText("Search 53 shapes");
        await userEvent.keyboard("torus k");
        const list = await screen.findByRole("group", { name: /values$/ });
        await waitFor(() => {
            const names = within(list)
                .getAllByRole("option")
                .map((option) => option.textContent);
            assert.isTrue(names.length > 0 && names.every((name) => /torus/i.test(name ?? "")), names.join(", "));
        });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.strictEqual(
                session.styles.list().find((each) => each.name === "Key")?.set?.["node.shape"],
                "torus-knot",
            );
        });
    });

    it("the rule line reads class is Tool or Input", async () => {
        const kinds = (name: string, color: string): LayerSpec => ({
            name,
            target: "node",
            selector: {
                match: "rule",
                where: { kind: "categories", attribute: "data.class", values: ["Tool", "Input"] },
            },
            set: { "node.color": color },
        });
        const session = await openProject([kinds("One", "#ff0000"), kinds("Two", "#0000ff")]);
        const folder = await session.styles.addFolder("Kinds");
        for (const layer of session.styles.list().filter((each) => ["One", "Two"].includes(each.name ?? ""))) {
            await session.styles.moveRow(layer.row ?? layer.id, { parent: folder.id });
        }
        await session.styles.settled();
        const tab = await openStyle("Kinds");
        const row = await within(tab).findByRole("button", { name: /^Which nodes, / });
        await waitFor(() => {
            assert.include(row.textContent, "class is Tool or Input");
        });
        assert.match(row.getAttribute("aria-label") ?? "", /class is Tool or Input$/);
    });

    it("Hide in Visibility hides the layer's nodes", async () => {
        const session = await openProject([everyNode("Key", { "node.shape": "box" })]);
        const tab = await openStyle("Key");
        await userEvent.click(
            within(section(tab, "visibility")).getByRole("button", { name: "Add to node visibility" }),
        );
        await userEvent.click(await screen.findByRole("menuitem", { name: "Hide" }));
        await waitFor(() => {
            assert.isFalse(session.styles.explain({ node: "b" }).merged["node.visible"]);
        });
    });

    it("a folder's panel writes a border color to every layer in it", async () => {
        const session = await openProject([everyNode("One", { "node.size": 2 }), everyNode("Two", { "node.size": 3 })]);
        const folder = await session.styles.addFolder("Both");
        for (const layer of session.styles.list().filter((each) => ["One", "Two"].includes(each.name ?? ""))) {
            await session.styles.moveRow(layer.row ?? layer.id, { parent: folder.id });
        }
        await session.styles.settled();
        const tab = await openStyle("Both");
        await userEvent.click(within(section(tab, "border")).getByRole("button", { name: "Add to node border" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Border color/ }));
        await waitFor(() => {
            const line = section(tab, "border").querySelector('.ws-row[data-line="node.borderColor"]');
            assert.isTrue(line?.contains(document.activeElement) === true, "focus is in the new line");
        });
        await userEvent.keyboard("blue{Enter}");
        await waitFor(() => {
            const colors = session.styles
                .list()
                .filter((each) => ["One", "Two"].includes(each.name ?? ""))
                .map((each) => each.set?.["node.borderColor"])
                .map((color) => (typeof color === "string" ? color.toUpperCase() : color));
            assert.deepEqual(colors, ["#0000FF", "#0000FF"]);
        });
    });

    it("Effects' + offers whole effects and adding the drop shadow draws its settings under its heading", async () => {
        await openProject([everyNode("Key", { "node.shape": "box" })]);
        const tab = await openStyle("Key");
        await userEvent.click(within(section(tab, "effects")).getByRole("button", { name: "Add to node effects" }));
        const menu = await screen.findByRole("menu");
        assert.deepEqual(
            within(menu)
                .getAllByRole("menuitem")
                .map((item) => item.textContent),
            ["Drop shadow", "Glow", "Halo", "Underlay", "Overlay"],
        );
        await userEvent.click(within(menu).getByRole("menuitem", { name: "Drop shadow" }));
        const effects = section(tab, "effects");
        await waitFor(() => {
            assert.isNotNull(effects.querySelector('[data-item="shadow"]'));
            assert.isNotNull(effects.querySelector('.ws-row[data-line="node.shadowBlur"]'));
        });
        within(effects).getByText("Blur");
    });

    it("editing a gradient stop keeps every color's transparency and writes colors and stops together", async () => {
        const session = await openProject([
            everyNode("Key", {
                "node.gradientKind": "linear",
                "node.gradientColors": "#ff000080 #0000ff",
                "node.gradientStops": "0 1",
            }),
        ]);
        const tab = await openStyle("Key");
        const editor = await within(section(tab, "fill")).findByTestId("gradient-editor");
        const [first] = within(editor).getAllByTestId("gradient-editor-stop-hex");
        await userEvent.tripleClick(first);
        await userEvent.keyboard("00ff00{Enter}");
        await waitFor(() => {
            const set = session.styles.list().find((each) => each.name === "Key")?.set;
            const colors = set?.["node.gradientColors"];
            assert.strictEqual(typeof colors === "string" ? colors.toLowerCase() : colors, "#00ff0080 #0000ff");
            assert.strictEqual(set?.["node.gradientStops"], "0 1");
        });
    });

    it("the shape list marks the value the layer sets", async () => {
        await openProject([everyNode("Key", { "node.shape": "box" })]);
        const tab = await openStyle("Key");
        await userEvent.click(await within(section(tab, "shape")).findByRole("button", { name: /^Node shape, Box/ }));
        const list = await screen.findByRole("group", { name: /values$/ });
        const selected = within(list)
            .getAllByRole("option")
            .filter((option) => option.getAttribute("aria-selected") === "true");
        assert.deepEqual(
            selected.map((option) => option.textContent?.replace(/\d+ nodes?$/, "")),
            ["Box"],
        );
    });

    it("a shape just added and not picked yet reads as the default it draws", async () => {
        await openProject([everyNode("Key", { "node.size": 2 })]);
        const tab = await openStyle("Key");
        await userEvent.click(within(section(tab, "shape")).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        const picker = await waitFor(() => {
            const found = section(tab, "shape").querySelector<HTMLElement>('[data-value-listbox="node.shape"]');
            assert.isNotNull(found);
            return found;
        });
        assert.match(picker?.getAttribute("aria-label") ?? "", /^Node shape, default \w/);
        assert.isTrue(picker?.hasAttribute("data-unset"));
    });

    it("a label size set with no label words still has its line in Text", async () => {
        await openProject([everyNode("Key", { "node.labelSize": 20 })]);
        const tab = await openStyle("Key");
        await waitFor(() => {
            assert.isNotNull(section(tab, "text").querySelector('.ws-row[data-line="node.labelSize"]'));
        });
        assert.isTrue(dotted(tab, "text"));
    });
});
