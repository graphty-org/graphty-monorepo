/**
 * Style panel v2's shell on the REAL graphty-element, driven by real clicks (design/ui/style-panel-v2/design.md,
 * sections 2.3 and 2.4): with the style-panel-v2 experiment on, each tab draws its six sections in two groups
 * in ia-design's order; a section of one thing adds it from its "+", a section of several opens a "+" menu in groups
 * from its "+"; a thing row's minus takes the whole thing off the layer and one Undo brings it back. Every "+"
 * list's only button is its "+": its title and bar add nothing, and a section collapses from its caret alone,
 * remembered by the reader, never by the project. With the experiment off, the panel by part of the drawing is
 * drawn as before.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { LABEL_CAP } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { cleanup, screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import {
    layersNow,
    onlyPlusAdds,
    openGraph,
    openProject,
    openStyle,
    sectionOf,
    switchView,
    written,
} from "./v2Harness";

/**
 * Each tab's sections, "|" where the separator sits: the parts of the mark, then Effects, which holds Border
 * and Visibility (owner, 2026-11-22).
 */
const SECTION_ORDER = {
    node: ["Shape", "Fill", "Text", "|", "Effects"],
    edge: ["Line", "Arrows", "Route", "Text", "|", "Effects"],
} as const;

/**
 * Each tab's Effects "+" items, "|" where a divider sits: Border and Visibility first (owner, 2026-11-22), and
 * every shader is the one Shader item (E668).
 */
const EFFECTS_ITEMS = {
    node: [
        "Border",
        "Visibility",
        "|",
        "Ring",
        "Shader",
        "Glow",
        "Wireframe",
        "|",
        "Drop shadow",
        "Raised edge",
        "Plate",
    ],
    edge: ["Visibility", "|", "Shader", "Animation"],
} as const;

/**
 * The edge Line section's "+" items on a layer that sets the line's color, "|" where a divider sits: every band
 * along the line is the one Outline item (C7, ia-design 2).
 */
const EDGE_LINE_ITEMS = ["Pattern", "|", "Outline"] as const;

/**
 * A tab's section headings and its separator, top to bottom, as a reader sees them.
 * @param panel - the v2 panel.
 * @returns the headings, "|" for the separator.
 */
function sectionOrder(panel: HTMLElement): string[] {
    return [...panel.querySelectorAll('[data-section-break], [data-section] [role="heading"][aria-level="3"]')].map(
        (element) => (element.hasAttribute("data-section-break") ? "|" : element.textContent),
    );
}

/**
 * The open menu's items and dividers, top to bottom.
 * @param menu - the menu.
 * @returns the item names, "|" for a divider.
 */
function menuOrder(menu: HTMLElement): string[] {
    return [...menu.querySelectorAll('[role="menuitem"], .mantine-Menu-divider')].map((element) =>
        element.classList.contains("mantine-Menu-divider") ? "|" : element.textContent,
    );
}

describe("Style panel v2 on", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("draws each tab's sections and Effects '+' items in ia-design's order, in 2D and in 3D (E668, E675)", async () => {
        await openGraph();
        for (const view of ["2D", "3D"] as const) {
            await switchView(view);
            for (const side of ["node", "edge"] as const) {
                // Key people styles nodes and Links edges: each layer's Style tab shows its own kind.
                const tab = await openStyle(side === "node" ? "Key people" : "Links");
                await showKind(side);
                const panel = await waitFor(() => {
                    const found = tab.querySelector<HTMLElement>(`[data-style-panel-v2][data-group="${side}"]`);
                    assert.isNotNull(found);
                    return found;
                });
                assert.deepEqual(sectionOrder(panel), [...SECTION_ORDER[side]], `${view} ${side} sections`);
                assert.isNull(panel.querySelector('[data-section$="-shaders"]'), "no Shaders section");
                const effects = sectionOf(tab, `${side}-effects`);
                await userEvent.click(
                    within(effects).getByRole("button", { name: new RegExp(`^Add to ${side} effects`) }),
                );
                assert.deepEqual(
                    menuOrder(await screen.findByRole("menu")),
                    [...EFFECTS_ITEMS[side]],
                    `${view} ${side}`,
                );
                await userEvent.keyboard("{Escape}");
                if (side === "edge") {
                    const line = sectionOf(tab, "edge-line");
                    await userEvent.click(within(line).getByRole("button", { name: /^Add to edge line/ }));
                    assert.deepEqual(
                        menuOrder(await screen.findByRole("menu")),
                        [...EDGE_LINE_ITEMS],
                        `${view} edge line`,
                    );
                    await userEvent.keyboard("{Escape}");
                }
            }
        }
    });

    it("a layer that sets no line color lists Line first in the edge Line '+', in 2D and in 3D (C7)", async () => {
        const { session } = await openGraph();
        await session.styles.add({
            name: "Bare links",
            target: "edge",
            selector: { match: "everything" },
            // a Visibility value only: nothing of the Line section's things
            set: { "edge.visible": true },
        });
        await session.styles.settled();
        for (const view of ["2D", "3D"] as const) {
            await switchView(view);
            const tab = await openStyle("Bare links");
            await showKind("edge");
            const line = sectionOf(tab, "edge-line");
            await userEvent.click(within(line).getByRole("button", { name: /^Add to edge line/ }));
            assert.deepEqual(
                menuOrder(await screen.findByRole("menu")),
                ["Line", ...EDGE_LINE_ITEMS],
                `${view} edge line`,
            );
            await userEvent.keyboard("{Escape}");
        }
    });

    it("draws the node tab's sections, each with its header rule", async () => {
        await openProject();
        const tab = await openStyle("Key people");
        const panel = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>("[data-style-panel-v2]");
            assert.isNotNull(found);
            return found;
        });
        const sections = SECTION_ORDER.node.filter((name) => name !== "|");
        const headings = within(panel)
            .getAllByRole("heading", { level: 3 })
            .map((heading) => heading.textContent);
        assert.deepEqual(headings, sections);
        assert.lengthOf(panel.querySelectorAll('[data-testid="control-section"]'), sections.length);
        // Fill holds the layer's color; Shape sets nothing yet, so it is the empty state.
        assert.isNull(sectionOf(tab, "node-fill").querySelector('[data-testid="control-section"][data-empty]'));
        assert.isNotNull(sectionOf(tab, "node-shape").querySelector('[data-testid="control-section"][data-empty]'));
    });

    it("Shape's '+' adds the shape, its row's minus removes it, and one Undo brings it back", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const shape = sectionOf(tab, "node-shape");
        await userEvent.click(within(shape).getByRole("button", { name: "Add to node shape" }));
        // Shape's "+" lists Size and Shape (ia-design 2).
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        await waitFor(() => {
            assert.isString(written(session, id, "node.shape"), "Shape's start is written");
        });
        const added = written(session, id, "node.shape");
        const row = await waitFor(() => {
            const found = shape.querySelector<HTMLElement>('[data-thing="shape"]');
            assert.isNotNull(found);
            return found;
        });
        // A basic shape's row is its settings: its drop-down picks the shape (owner, 2026-11-23).
        assert.isNull(within(row).queryByRole("button", { name: "Node shape settings" }));

        await userEvent.click(within(row).getByRole("button", { name: "Remove node shape" }));
        await waitFor(() => {
            assert.isUndefined(written(session, id, "node.shape"));
            assert.isNull(shape.querySelector('[data-thing="shape"]'), "the row is gone");
        });
        assert.equal(written(session, id, "node.color"), "#E8590C", "the rest of the layer stays");

        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.shape"), added, "one Undo restores it");
            assert.isNotNull(shape.querySelector('[data-thing="shape"]'));
        });
    });

    it("an empty section's '+' opens its menu in groups, and Ring is added from it", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const effects = sectionOf(tab, "node-effects");
        const plus = effects.querySelector<HTMLElement>("[data-plus]");
        assert.isNotNull(plus, 'the section\'s "+"');
        await userEvent.click(plus);
        const menu = await screen.findByRole("menu");
        // Border and Visibility, then every look around the node (owner, 2026-11-22; ia-design 2, E675).
        assert.deepEqual(
            within(menu)
                .getAllByRole("menuitem")
                .map((item) => item.textContent),
            ["Border", "Visibility", "Ring", "Shader", "Glow", "Wireframe", "Drop shadow", "Raised edge", "Plate"],
        );
        assert.lengthOf(menu.querySelectorAll(".mantine-Menu-divider"), 2, "a divider between each two groups");
        await userEvent.click(within(menu).getByRole("menuitem", { name: "Ring" }));
        await waitFor(() => {
            assert.isDefined(written(session, id, "node.outerBorderColor"), "Ring starts with its color");
            assert.isAbove(Number(written(session, id, "node.outerBorderOffset")), 0, "and stands off the rim");
            assert.isAbove(Number(written(session, id, "node.outerBorderWidth")), 0, "with a width");
        });
        assert.isUndefined(written(session, id, "node.borderWidth"), "a ring writes no border width");
        const ring = await waitFor(() => {
            const found = effects.querySelector<HTMLElement>('[data-thing="rings"]');
            assert.isNotNull(found);
            return found;
        });
        assert.include(ring.textContent, "Ring", "the row is named, as its section does not name it");

        // Set now, the section's "+" no longer lists Ring.
        await userEvent.click(within(effects).getByRole("button", { name: "Add to node effects" }));
        const again = await screen.findByRole("menu");
        assert.notInclude(
            within(again)
                .getAllByRole("menuitem")
                .map((item) => item.textContent),
            "Ring",
        );
    });

    it("Escape closes a '+' menu whose first item is disabled, with focus still on its '+'", async () => {
        const { session, nodes } = await openGraph();
        // A row at graphty-element's label cap lists Label, first in its Text menu, but not pickable.
        const labels = Array.from({ length: LABEL_CAP }, (_, at) => ({ id: `l${String(at)}`, text: "x" }));
        await session.styles.update(nodes, {
            set: { ...session.styles.get(nodes)?.set, "node.label": "x", "node.labels": labels },
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const add = within(sectionOf(tab, "node-text")).getByRole("button", { name: "Add to node text" });
        await userEvent.click(add);
        const menu = await screen.findByRole("menu");
        const items = within(menu).getAllByRole("menuitem");
        assert.equal(items[0]?.textContent, "Label", "Label is the first item");
        assert.equal(items[0]?.getAttribute("data-disabled"), "true", "the first item is disabled");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu"), "Escape closed the menu");
        });
        assert.strictEqual(document.activeElement, add, "focus is still on its '+'");
    });

    it("Effects' '+' Border adds the one Border, a stroke with its color and width", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const effects = sectionOf(tab, "node-effects");
        await userEvent.click(within(effects).getByRole("button", { name: "Add to node effects" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Border" }));
        await waitFor(() => {
            assert.isDefined(written(session, id, "node.borderColor"), "a color");
            assert.isAbove(Number(written(session, id, "node.borderWidth")), 0, "and a width (E305)");
            assert.isNotNull(effects.querySelector('[data-thing="border"]'), "a Border row in Effects");
        });
    });
});

describe("Style panel v2's '+' lists", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("every '+' sits in a '+' list whose title and bar add nothing; only its '+' adds", async () => {
        const { session } = await openProject();
        const tab = await openStyle("Key people");
        const panel = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>("[data-style-panel-v2]");
            assert.isNotNull(found);
            return found;
        });
        for (const plus of panel.querySelectorAll("[data-plus]")) {
            assert.isNotNull(plus.closest("[data-plus-list]"), `${plus.getAttribute("aria-label") ?? ""} is in a list`);
        }
        // Each section, set (Fill) and empty: Shape, Fill, Text and Effects.
        const sections = [...panel.querySelectorAll<HTMLElement>('[data-plus-list="section"]')];
        assert.isAtLeast(sections.length, 4);
        for (const section of sections) {
            await onlyPlusAdds(session, section, section.textContent ?? "a section");
        }

        // A pop-over's group: a Chart, added from Fill's menu, has sub-groups its "+" adds (Size's are all rare now,
        // in its Advanced dialog).
        const chartFill = sectionOf(tab, "node-fill");
        await userEvent.click(within(chartFill).getByRole("button", { name: "Add to node fill" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Chart" }));
        await waitFor(() => {
            assert.isNotNull(chartFill.querySelector('[data-thing="chart"]'));
        });
        await userEvent.keyboard("{Escape}");
        await userEvent.click(within(chartFill).getByRole("button", { name: /^Node chart settings/ }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        for (const plus of pop.querySelectorAll("[data-plus]")) {
            assert.isNotNull(plus.closest('[data-plus-list="group"]'), "a pop-over's '+' is in a group list");
        }
        // Every group the pop-over opens with, each found again by its title as a "+" may redraw the pop-over.
        const groupTitle = (group: Element): string =>
            group.querySelector('[data-testid="control-group-label"]')?.textContent ?? "";
        const titles = [...pop.querySelectorAll('[data-plus-list="group"]')].map(groupTitle);
        assert.isNotEmpty(titles, "Chart's pop-over has groups");
        for (const title of titles) {
            const group = [
                ...document.querySelectorAll<HTMLElement>('[data-thing-popover] [data-plus-list="group"]'),
            ].find((each) => groupTitle(each) === title);
            assert.isDefined(group, `Chart's ${title} group`);
            if (group !== undefined) {
                await onlyPlusAdds(session, group, `Chart's ${title}`);
            }
        }
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector("[data-thing-popover]"));
        });

        // A list's group: Pie opens its pop-over on its slices.
        const fill = sectionOf(tab, "node-fill");
        await userEvent.click(within(fill).getByRole("button", { name: "Add to node fill" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Pie" }));
        const slices = await waitFor(() => {
            const found = [
                ...document.querySelectorAll<HTMLElement>('[data-thing-popover] [data-plus-list="group"]'),
            ].find((each) => each.querySelector('[data-testid="control-group-label"]')?.textContent === "Slices");
            assert.isDefined(found);
            return found;
        });
        if (slices !== undefined) {
            await onlyPlusAdds(session, slices, "Pie's slices");
        }
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector("[data-thing-popover]"));
        });
    });

    it("the edge tab's sections are '+' lists too: only each '+' adds", async () => {
        const { session } = await openProject();
        await session.styles.add({
            name: "Links",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#1971C2" },
        });
        await session.styles.settled();
        const tab = await openStyle("Links");
        await showKind("edge");
        const sections = await waitFor(() => {
            const found = [...tab.querySelectorAll<HTMLElement>('[data-section^="edge-"] [data-plus-list="section"]')];
            assert.isNotEmpty(found, "the edge tab draws its sections");
            return found;
        });
        for (const section of sections) {
            await onlyPlusAdds(session, section, section.textContent ?? "an edge section");
        }
    });

    it("a section collapses from its caret only, and the reader's choice outlives a remount and a layer switch", async () => {
        const key = "graphty.styleSectionCollapsed.v1:node:fill";
        try {
            const { session } = await openProject();
            const tab = await openStyle("Key people");
            const fill = sectionOf(tab, "node-fill");
            const toggle = await waitFor(() => {
                const found = fill.querySelector<HTMLElement>('[data-testid="control-section-toggle"]');
                assert.isNotNull(found);
                return found;
            });
            const rows = (): HTMLElement | null =>
                fill.querySelector<HTMLElement>('[data-testid="control-section-content"]');
            const before = layersNow(session);
            await userEvent.click(within(toggle).getByText("Fill"));
            assert.isFalse(rows()?.hidden, "clicking the title does not collapse");
            const caret = toggle.querySelector<HTMLElement>('[data-testid="control-section-chevron-slot"]');
            assert.isNotNull(caret);
            await userEvent.click(caret);
            await waitFor(() => {
                assert.isTrue(rows()?.hidden, "the caret collapses");
            });
            assert.equal(layersNow(session), before, "collapsing writes nothing to the project");
            assert.equal(localStorage.getItem(key), "collapsed", "kept as the reader's own");
            const { text } = await session.project.save({ markSaved: false });
            assert.notInclude(text, "styleSectionCollapsed", "the saved project holds no collapse");
            assert.notInclude(text, "collapsed", "the saved project holds no collapse");

            // The workspace mounted again: still collapsed.
            cleanup();
            const again = await openProject();
            const reopened = sectionOf(await openStyle("Key people"), "node-fill");
            await waitFor(() => {
                const content = reopened.querySelector<HTMLElement>('[data-testid="control-section-content"]');
                assert.isTrue(content?.hidden, "still collapsed after the workspace mounts again");
            });

            // Another layer: still collapsed.
            await again.session.styles.add({
                name: "Others",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "#228BE6" },
            });
            const others = await openStyle("Others");
            await waitFor(() => {
                const content = sectionOf(others, "node-fill").querySelector<HTMLElement>(
                    '[data-testid="control-section-content"]',
                );
                assert.isTrue(content?.hidden, "still collapsed on another layer");
            });
        } finally {
            localStorage.removeItem(key);
        }
    });

    it("a collapsed section's '+' opens it", async () => {
        const key = "graphty.styleSectionCollapsed.v1:node:fill";
        localStorage.setItem(key, "collapsed");
        try {
            await openProject();
            const tab = await openStyle("Key people");
            const fill = sectionOf(tab, "node-fill");
            const content = await waitFor(() => {
                const found = fill.querySelector<HTMLElement>('[data-testid="control-section-content"]');
                assert.isNotNull(found);
                return found;
            });
            assert.isTrue(content.hidden, "collapsed as the reader left it");
            await userEvent.click(within(fill).getByRole("button", { name: "Add to node fill" }));
            await waitFor(() => {
                assert.isFalse(content.hidden, "its '+' opens it");
            });
            await userEvent.keyboard("{Escape}");
        } finally {
            localStorage.removeItem(key);
        }
    });
});

describe("Style panel v2 off", () => {
    withFeatures(["file-styles"]);

    it("draws the panel by part of the drawing, and none of v2", async () => {
        await openProject();
        const tab = await openStyle("Key people");
        await waitFor(() => {
            assert.isNotNull(tab.querySelector("[data-style-parts]"));
        });
        assert.isNull(tab.querySelector("[data-style-panel-v2]"));
        assert.isNull(tab.querySelector("[data-thing]"));
    });
});
