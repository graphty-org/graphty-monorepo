/**
 * Style panel v2's shell on the REAL graphty-element, driven by real clicks (design/ui/style-panel-v2/design.md,
 * sections 2.3 and 2.4): with the style-panel-v2 experiment on, the node tab draws its eight sections in the
 * design's order; a section of one thing adds it from its "+", a section of several opens a "+" menu in groups
 * from its "+"; a thing row's minus takes the whole thing off the layer and one Undo brings it back. Every "+"
 * list's only button is its "+": its title and bar add nothing, and a section collapses from its caret alone,
 * remembered by the reader, never by the project. With the experiment off, the panel by part of the drawing is
 * drawn as before.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { cleanup, screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openProject, openStyle, sectionOf, written } from "./v2Harness";

/** The node tab's sections, in the design's order. */
const NODE_SECTIONS = ["Shape", "Fill", "Border", "Text", "Effects", "Visibility", "Shaders"];

describe("Style panel v2 on", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("draws the node tab's sections in order, each with its header rule", async () => {
        await openProject();
        const tab = await openStyle("Key people");
        const panel = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>("[data-style-panel-v2]");
            assert.isNotNull(found);
            return found;
        });
        const headings = within(panel)
            .getAllByRole("heading", { level: 3 })
            .map((heading) => heading.textContent);
        assert.deepEqual(headings, NODE_SECTIONS);
        assert.lengthOf(panel.querySelectorAll('[data-testid="control-section"]'), NODE_SECTIONS.length);
        // Fill holds the layer's color; Shape sets nothing yet, so it is the empty state.
        assert.isNull(sectionOf(tab, "node-fill").querySelector('[data-testid="control-section"][data-empty]'));
        assert.isNotNull(sectionOf(tab, "node-shape").querySelector('[data-testid="control-section"][data-empty]'));
    });

    it("Shape's '+' adds the shape, its row's minus removes it, and one Undo brings it back", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const shape = sectionOf(tab, "node-shape");
        await userEvent.click(within(shape).getByRole("button", { name: "Add to node shape" }));
        await waitFor(() => {
            assert.isString(written(session, id, "node.shape"), "Shape's start is written");
        });
        const added = written(session, id, "node.shape");
        const row = await waitFor(() => {
            const found = shape.querySelector<HTMLElement>('[data-thing="shape"]');
            assert.isNotNull(found);
            return found;
        });
        assert.isNotNull(within(row).getByRole("button", { name: "Node shape settings" }));

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

    it("an empty section's '+' opens its menu in groups, and Rings is added from it", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const border = sectionOf(tab, "node-border");
        const plus = border.querySelector<HTMLElement>("[data-plus]");
        assert.isNotNull(plus, 'the section\'s "+"');
        await userEvent.click(plus);
        const menu = await screen.findByRole("menu");
        assert.deepEqual(
            within(menu)
                .getAllByRole("menuitem")
                .map((item) => item.textContent),
            ["Border", "Rings", "Raised edge", "Outline", "Inner lines"],
        );
        assert.lengthOf(menu.querySelectorAll(".mantine-Menu-divider"), 1, "a divider between the two groups");
        await userEvent.click(within(menu).getByRole("menuitem", { name: "Rings" }));
        await waitFor(() => {
            assert.isDefined(written(session, id, "node.outerBorderColor"), "Rings starts with its color");
        });
        const rings = await waitFor(() => {
            const found = border.querySelector<HTMLElement>('[data-thing="rings"]');
            assert.isNotNull(found);
            return found;
        });
        assert.include(rings.textContent, "Rings", "the row is named, as its section does not name it");

        // Set now, the section's "+" no longer lists Rings.
        await userEvent.click(within(border).getByRole("button", { name: "Add to node border" }));
        const again = await screen.findByRole("menu");
        assert.notInclude(
            within(again)
                .getAllByRole("menuitem")
                .map((item) => item.textContent),
            "Rings",
        );
    });
});

/**
 * What the layers hold, to tell whether a click changed anything.
 * @param session - the session.
 * @returns the layers as text.
 */
function layersNow(session: GraphSession): string {
    return JSON.stringify(session.styles.list());
}

/**
 * Clicks a "+" list's title and the empty middle of its bar, and checks neither adds nor opens anything; then
 * clicks its "+" and checks it opens its menu or adds.
 * @param session - the session.
 * @param list - the "+" list.
 * @param what - what it is, for messages.
 */
async function onlyPlusAdds(session: GraphSession, list: HTMLElement, what: string): Promise<void> {
    const before = layersNow(session);
    const title =
        list.querySelector<HTMLElement>(
            '[data-testid="control-section-lead"], [data-testid="control-section-toggle"]',
        ) ?? list.querySelector<HTMLElement>('[data-testid="control-group-label"]');
    assert.isNotNull(title, `${what} has a title`);
    await userEvent.click(title);
    const bar = list.querySelector<HTMLElement>(
        '[data-testid="control-section-header"], [data-testid="control-group-header"]',
    );
    if (bar !== null) {
        const box = bar.getBoundingClientRect();
        await userEvent.click(bar, { position: { x: Math.round(box.width * 0.62), y: Math.round(box.height / 2) } });
    }
    assert.isNull(screen.queryByRole("menu"), `${what}: no menu from its title or bar`);
    assert.equal(layersNow(session), before, `${what}: its title and bar add nothing`);
    const plus = list.querySelector<HTMLElement>("[data-plus]");
    assert.isNotNull(plus, `${what} has a "+"`);
    await userEvent.click(plus);
    await waitFor(() => {
        assert.isTrue(screen.queryByRole("menu") !== null || layersNow(session) !== before, `${what}: its "+" adds`);
    });
    if (screen.queryByRole("menu") !== null) {
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu"));
        });
    }
}

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
        // Each section, set (Fill) and empty, the Shaders section included.
        const sections = [...panel.querySelectorAll<HTMLElement>('[data-plus-list="section"]')];
        assert.isAtLeast(sections.length, 7);
        for (const section of sections) {
            await onlyPlusAdds(session, section, section.textContent ?? "a section");
        }

        // A pop-over's group: the Shape the section loop added has sub-groups to add.
        const shape = sectionOf(tab, "node-shape");
        await waitFor(() => {
            assert.isNotNull(shape.querySelector('[data-thing="shape"]'));
        });
        await userEvent.click(within(shape).getByRole("button", { name: /^Node shape settings/ }));
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
        assert.isNotEmpty(titles, "Shape's pop-over has groups");
        for (const title of titles) {
            const group = [
                ...document.querySelectorAll<HTMLElement>('[data-thing-popover] [data-plus-list="group"]'),
            ].find((each) => groupTitle(each) === title);
            assert.isDefined(group, `Shape's ${title} group`);
            if (group !== undefined) {
                await onlyPlusAdds(session, group, `Shape's ${title}`);
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

        // A points list: Inner lines opens its pop-over on its lines.
        const border = sectionOf(tab, "node-border");
        await userEvent.click(within(border).getByRole("button", { name: "Add to node border" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Inner lines" }));
        const lines = await waitFor(() => {
            const found = [
                ...document.querySelectorAll<HTMLElement>('[data-thing-popover] [data-plus-list="group"]'),
            ].find((each) => each.querySelector('[data-testid="control-group-label"]')?.textContent === "Lines");
            assert.isDefined(found);
            return found;
        });
        if (lines !== undefined) {
            await onlyPlusAdds(session, lines, "Inner lines' lines");
        }
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

    it("Add section is a bar whose only button is its '+'", async () => {
        const { session } = await openProject({ styleEmptySections: false });
        const tab = await openStyle("Key people");
        const bar = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>("[data-add-section] [data-plus-list]");
            assert.isNotNull(found);
            return found;
        });
        await onlyPlusAdds(session, bar, "Add section");
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

describe("Style panel v2 with empty sections not shown", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("shows only the sections the layer sets, and Add section shows one and opens its '+'", async () => {
        const { session, id } = await openProject({ styleEmptySections: false });
        const tab = await openStyle("Key people");
        const panel = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>("[data-style-panel-v2]");
            assert.isNotNull(found);
            return found;
        });
        assert.deepEqual(
            within(panel)
                .getAllByRole("heading", { level: 3 })
                .map((heading) => heading.textContent),
            ["Fill"],
            "only the section the layer sets",
        );
        await userEvent.click(within(panel).getByRole("button", { name: "Add section" }));
        const menu = await screen.findByRole("menu");
        assert.notInclude(
            within(menu)
                .getAllByRole("menuitem")
                .map((item) => item.textContent),
            "Fill",
        );
        await userEvent.click(within(menu).getByRole("menuitem", { name: "Border" }));
        // The section shows, with its own "+" menu open.
        await userEvent.click(await screen.findByRole("menuitem", { name: "Rings" }));
        await waitFor(() => {
            assert.isDefined(written(session, id, "node.outerBorderColor"));
            assert.isNotNull(sectionOf(tab, "node-border").querySelector('[data-thing="rings"]'));
        });
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
