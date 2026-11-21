/**
 * Style panel v2's Switch to on the REAL graphty-element, driven by real clicks
 * (design/ui/style-panel-v2/design.md, section 5 and acceptance check 1): the glyph before a family row's
 * name opens a menu of its members, the current one checked. A star with rounded corners and a size
 * switched to Sticker keeps its row, its name, its size, its color and its Size line, and switched back
 * brings the star and its corners back; every member's row has the same menu; after another row was
 * selected, one Undo brings the star back; Fill switches Solid -> Gradient -> Solid in one step each. No
 * row, pop-over or Graph settings line uses the sliders glyph.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import colormapUrl from "../__fixtures__/car-kit/Textures/colormap.png?url";
import { choose } from "./modelHarness";
import { openProject, openStyle, sectionOf, written } from "./v2Harness";

/**
 * Waits for a thing's row in a section.
 * @param section - the section.
 * @param thing - the thing's id.
 * @returns the row.
 */
async function rowOf(section: HTMLElement, thing: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = section.querySelector<HTMLElement>(`[data-thing="${thing}"]`);
        assert.isNotNull(found);
        return found;
    });
}

/**
 * Opens a row's settings pop-over.
 * @param row - the thing's row.
 * @param name - the settings button's name.
 * @returns the pop-over.
 */
async function openSettings(row: HTMLElement, name: string): Promise<HTMLElement> {
    // Its name ends in "has configured values" while the pop-over holds a set line.
    await userEvent.click(within(row).getByRole("button", { name: new RegExp(`^${name}`) }));
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>("[data-thing-popover]");
        assert.isNotNull(found);
        return found;
    });
}

/**
 * Picks a member from the row's Switch to menu.
 * @param row - the thing's row.
 * @param title - the row's name with its kind ("Node shape").
 * @param member - the member's name.
 */
async function pickMember(row: HTMLElement, title: string, member: string): Promise<void> {
    await userEvent.click(within(row).getByRole("button", { name: `Switch ${title.toLowerCase()} to` }));
    const menu = await screen.findByRole("menu");
    await userEvent.click(within(menu).getByRole("menuitem", { name: member }));
}

/**
 * The member the row's Switch to menu checks.
 * @param row - the thing's row.
 * @param title - the row's name with its kind.
 * @returns the checked member's name.
 */
async function checkedMember(row: HTMLElement, title: string): Promise<string> {
    await userEvent.click(within(row).getByRole("button", { name: `Switch ${title.toLowerCase()} to` }));
    const menu = await screen.findByRole("menu");
    const checked = within(menu)
        .getAllByRole("menuitem")
        .filter((item) => item.getAttribute("aria-current") === "true")
        .map((item) => item.textContent ?? "");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
        assert.isNull(screen.queryByRole("menu"));
    });
    assert.lengthOf(checked, 1, "one member is checked");
    return checked[0];
}

/**
 * Picks the Sticker from the shader gallery Switch to opens beside the pop-over (design 5, rule 1).
 */
async function pickSticker(): Promise<void> {
    const gallery = await screen.findByRole("dialog", { name: "Sticker" });
    await userEvent.click(within(gallery).getByRole("button", { name: "Sticker" }));
}

/**
 * The shaders the layer draws in its shapes' place.
 * @param session - the session.
 * @param id - the layer.
 * @returns their ids.
 */
function replacing(session: GraphSession, id: string): string[] {
    const uses = written(session, id, "node.shaders");
    return Array.isArray(uses)
        ? (uses as { shader: string; place?: string }[])
              .filter((use) => (use.place ?? session.shaders.describe(use.shader)?.place) === "replace")
              .map((use) => session.shaders.describe(use.shader)?.copyOf ?? use.shader)
        : [];
}

/**
 * Opens the project with a star of rounded corners and size 2 on the layer.
 * @returns the session and the layer's id.
 */
async function openStar(): Promise<{ session: GraphSession; id: string }> {
    const { session, id } = await openProject();
    await session.styles.update(id, {
        set: { "node.color": "#E8590C", "node.shape": "star", "node.cornerRadius": 0.2, "node.size": 2 },
    });
    await session.styles.settled();
    return { session, id };
}

describe("Style panel v2's Switch to", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("Basic shape -> Sticker -> Basic shape keeps the row and its Size, and brings the star back", async () => {
        const { session, id } = await openStar();
        const tab = await openStyle("Key people");
        const shape = sectionOf(tab, "node-shape");
        const row = await rowOf(shape, "shape");
        // Size is its own row beside Shape (ia-design 2), so a switch of shape never touches it.
        const size = (): Element | null => shape.querySelector('[data-thing="size"] [data-line="node.size"]');
        assert.isNotNull(size(), "Size is its own row");
        assert.isNull(row.querySelector('[data-line="node.size"]'), "not a line of the Shape row");
        assert.equal(await checkedMember(row, "Node shape"), "Basic shape");

        await pickMember(row, "Node shape", "Sticker");
        // The row keeps its basic shape until a sticker is picked.
        await screen.findByRole("dialog", { name: "Sticker" });
        assert.equal(written(session, id, "node.shape"), "star", "nothing switches before the pick");
        await pickSticker();
        await waitFor(() => {
            assert.deepEqual(replacing(session, id), ["icon-sticker"], "a sticker draws in the shapes' place");
            assert.isUndefined(written(session, id, "node.shape"), "the basic shape is taken off");
            assert.isUndefined(written(session, id, "node.cornerRadius"), "and its corners");
        });
        assert.equal(written(session, id, "node.size"), 2, "the size stays");
        assert.equal(written(session, id, "node.color"), "#E8590C", "and the color");
        const after = await rowOf(shape, "shape");
        assert.isNotNull(size(), "the Size row stays");
        assert.lengthOf(shape.querySelectorAll('[data-thing="shape"]'), 1, "still one Shape row, in the same section");

        // The Sticker's row has the same Switch to.
        assert.equal(await checkedMember(after, "Node shape"), "Sticker");
        await pickMember(after, "Node shape", "Basic shape");
        await waitFor(() => {
            assert.equal(written(session, id, "node.shape"), "star", "the star comes back");
            assert.equal(written(session, id, "node.cornerRadius"), 0.2, "with its corners");
            assert.deepEqual(replacing(session, id), [], "the sticker goes");
        });
        assert.equal(written(session, id, "node.size"), 2, "the size stays");
        assert.equal(written(session, id, "node.color"), "#E8590C", "and the color");
    });

    it("after another row was selected, one Undo brings the star back", async () => {
        const { session, id } = await openStar();
        await session.styles.add({
            name: "Others",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 1 },
        });
        const tab = await openStyle("Key people");
        const row = await rowOf(sectionOf(tab, "node-shape"), "shape");
        await pickMember(row, "Node shape", "Sticker");
        await pickSticker();
        await waitFor(() => {
            assert.isUndefined(written(session, id, "node.shape"));
        });

        await openStyle("Others");
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.shape"), "star", "one Undo reverses the switch");
            assert.equal(written(session, id, "node.cornerRadius"), 0.2);
            assert.deepEqual(replacing(session, id), []);
        });
    });

    it("Fill switches Solid -> Gradient -> Solid from its row, starting from the color it had, one Undo each", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const fill = sectionOf(tab, "node-fill");
        await pickMember(await rowOf(fill, "fill"), "Node fill", "Gradient");
        await waitFor(() => {
            const colors = written(session, id, "node.gradientColors");
            assert.isString(colors);
            assert.match(String(colors), /^#E8590C\b/i, "the gradient starts from the color it had");
            assert.isUndefined(written(session, id, "node.color"), "the solid color is taken off");
        });
        assert.lengthOf(fill.querySelectorAll("[data-thing]"), 1, "still one row");
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.color"), "#E8590C");
            assert.isUndefined(written(session, id, "node.gradientColors"));
        });

        await pickMember(await rowOf(fill, "fill"), "Node fill", "Gradient");
        await waitFor(() => {
            assert.isString(written(session, id, "node.gradientColors"));
        });
        await pickMember(await rowOf(fill, "fill"), "Node fill", "Solid");
        await waitFor(() => {
            assert.match(String(written(session, id, "node.color")), /^#E8590C$/i, "Solid brings the color back");
            assert.isUndefined(written(session, id, "node.gradientColors"));
        });
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.isString(written(session, id, "node.gradientColors"), "one Undo reverses the switch back");
            assert.isUndefined(written(session, id, "node.color"));
        });
    });

    it("no row or pop-over uses the sliders glyph (Graph settings: GraphSettingsV2's test)", async () => {
        await openStar();
        const tab = await openStyle("Key people");
        const row = await rowOf(sectionOf(tab, "node-shape"), "shape");
        assert.isNull(tab.querySelector(".lucide-sliders-horizontal"), "the panel");
        await openSettings(row, "Node shape settings");
        assert.isNull(document.querySelector(".lucide-sliders-horizontal"), "a pop-over");
        await userEvent.keyboard("{Escape}");
    });
});

describe("Style panel v2's Switch to a member that needs a pick", () => {
    withFeatures(["file-styles", "style-panel-v2", "node-models"]);

    it("Fill's Picture opens the picture picker beside the pop-over and switches on the pick, in one Undo", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const row = await rowOf(sectionOf(tab, "node-fill"), "fill");
        await pickMember(row, "Node fill", "Picture");
        const picture = await screen.findByRole("dialog", { name: "Picture" });
        assert.equal(written(session, id, "node.color"), "#E8590C", "the row keeps Solid until a pick");
        const file = new File([await (await fetch(colormapUrl)).arrayBuffer()], "colormap.png");
        await choose(picture, "Choose picture", [file]);
        await waitFor(() => {
            assert.match(String(written(session, id, "node.texture")), /^asset:/);
            assert.isUndefined(written(session, id, "node.color"), "the solid color is taken off");
        });
        await userEvent.keyboard("{Escape}");
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.color"), "#E8590C");
            assert.isUndefined(written(session, id, "node.texture"));
        });
    });
});

describe("Style panel v2's keys inside a thing's pop-over", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("emptying W and pressing Enter unsets only the width, and Backspace on Switch to changes nothing", async () => {
        const { session, id } = await openStar();
        await session.styles.update(id, {
            set: {
                "node.color": "#E8590C",
                "node.shape": "star",
                "node.cornerRadius": 0.2,
                "node.size": 2,
                "node.width": 2,
            },
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const row = await rowOf(sectionOf(tab, "node-shape"), "shape");
        // W is the Size row's (ia-design 2).
        const popover = await openSettings(await rowOf(sectionOf(tab, "node-shape"), "size"), "Node size settings");

        const width = [...screen.queryAllByRole("textbox"), ...screen.queryAllByRole("spinbutton")].find(
            (each) => popover.contains(each) && /width/i.test(each.getAttribute("aria-label") ?? ""),
        );
        assert.isDefined(width, "the Size pop-over's W field");
        await userEvent.clear(width);
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isUndefined(written(session, id, "node.width"), "the width is unset");
        });
        assert.equal(written(session, id, "node.shape"), "star", "the shape stays");
        assert.equal(written(session, id, "node.cornerRadius"), 0.2, "its corners stay");
        assert.equal(written(session, id, "node.size"), 2, "its size stays");

        // Opened and closed again with Escape, the Switch to menu's button keeps focus.
        await userEvent.keyboard("{Escape}");
        await userEvent.click(within(row).getByRole("button", { name: "Switch node shape to" }));
        await screen.findByRole("menu");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu"));
        });
        await userEvent.keyboard("{Backspace}");
        assert.equal(written(session, id, "node.shape"), "star", "Backspace on Switch to leaves the shape");
        assert.equal(written(session, id, "node.size"), 2);
    });
});
