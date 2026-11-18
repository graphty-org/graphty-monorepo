/**
 * Style panel v2's Switch to on the REAL graphty-element, driven by real clicks
 * (design/ui/style-panel-v2/design.md, section 5 and acceptance check 1): a star with rounded
 * corners and a size switched to Sticker keeps its row, its name and its Size line, and switched
 * back brings the star and its corners back; every member's pop-over has the same Switch to; after
 * another row was selected, one Undo brings the star back; Fill switches Solid -> Gradient by its
 * words in one step.
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
 * Opens a row's settings pop-over and waits for its Switch to line.
 * @param row - the thing's row.
 * @param name - the settings button's name.
 * @returns the Switch to line.
 */
async function openSwitch(row: HTMLElement, name: string): Promise<HTMLElement> {
    // Its name ends in "has configured values" while the pop-over holds a set line.
    await userEvent.click(within(row).getByRole("button", { name: new RegExp(`^${name}`) }));
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>("[data-thing-popover] [data-switch-to]");
        assert.isNotNull(found);
        return found;
    });
}

/**
 * Picks a member from the Shape's Switch to select.
 * @param line - the Switch to line.
 * @param member - the member's name.
 */
async function pickMember(line: HTMLElement, member: string): Promise<void> {
    await userEvent.click(within(line).getByRole("combobox", { name: "Switch to" }));
    await userEvent.click(await screen.findByRole("option", { name: member }));
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
        assert.isNotNull(row.querySelector('[data-line="node.size"]'), "Size is the row's common line");

        await pickMember(await openSwitch(row, "Node shape settings"), "Sticker");
        await waitFor(() => {
            assert.deepEqual(replacing(session, id), ["icon-sticker"], "a sticker draws in the shapes' place");
            assert.isUndefined(written(session, id, "node.shape"), "the basic shape is taken off");
            assert.isUndefined(written(session, id, "node.cornerRadius"), "and its corners");
        });
        assert.equal(written(session, id, "node.size"), 2, "the size stays");
        const after = await rowOf(shape, "shape");
        assert.isNotNull(after.querySelector('[data-line="node.size"]'), "the Size line stays");
        assert.lengthOf(shape.querySelectorAll("[data-thing]"), 1, "still one row, in the same section");
        await userEvent.keyboard("{Escape}");

        // The Sticker's pop-over has the same Switch to.
        await pickMember(await openSwitch(after, "Node shape settings"), "Basic shape");
        await waitFor(() => {
            assert.equal(written(session, id, "node.shape"), "star", "the star comes back");
            assert.equal(written(session, id, "node.cornerRadius"), 0.2, "with its corners");
            assert.deepEqual(replacing(session, id), [], "the sticker goes");
        });
        assert.equal(written(session, id, "node.size"), 2);
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
        await pickMember(await openSwitch(row, "Node shape settings"), "Sticker");
        await waitFor(() => {
            assert.isUndefined(written(session, id, "node.shape"));
        });
        await userEvent.keyboard("{Escape}");

        await openStyle("Others");
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.shape"), "star", "one Undo reverses the switch");
            assert.equal(written(session, id, "node.cornerRadius"), 0.2);
            assert.deepEqual(replacing(session, id), []);
        });
    });

    it("Fill switches Solid -> Gradient by its words, starting from the color it had, in one Undo", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const row = await rowOf(sectionOf(tab, "node-fill"), "fill");
        const line = await openSwitch(row, "Node fill settings");
        const radio = within(line).getByRole("radio", { name: "Gradient" });
        const label = document.querySelector<HTMLElement>(`label[for="${radio.id}"]`);
        assert.isNotNull(label);
        await userEvent.click(label);
        await waitFor(() => {
            const colors = written(session, id, "node.gradientColors");
            assert.isString(colors);
            assert.match(String(colors), /^#E8590C\b/i, "the gradient starts from the color it had");
            assert.isUndefined(written(session, id, "node.color"), "the solid color is taken off");
        });
        await userEvent.keyboard("{Escape}");
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.color"), "#E8590C");
            assert.isUndefined(written(session, id, "node.gradientColors"));
        });
    });
});

describe("Style panel v2's Switch to a member that needs a pick", () => {
    withFeatures(["file-styles", "style-panel-v2", "node-models"]);

    it("Fill's Picture opens the picture picker beside the pop-over and switches on the pick, in one Undo", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const row = await rowOf(sectionOf(tab, "node-fill"), "fill");
        const line = await openSwitch(row, "Node fill settings");
        const radio = within(line).getByRole("radio", { name: "Picture" });
        const label = document.querySelector<HTMLElement>(`label[for="${radio.id}"]`);
        assert.isNotNull(label);
        await userEvent.click(label);
        const picture = await screen.findByRole("dialog", { name: "Picture" });
        assert.equal(written(session, id, "node.color"), "#E8590C", "the row keeps Solid until a pick");
        const file = new File([await (await fetch(colormapUrl)).arrayBuffer()], "colormap.png");
        await choose(picture, "Choose picture", [file]);
        await waitFor(() => {
            assert.match(String(written(session, id, "node.texture")), /^asset:/);
            assert.isUndefined(written(session, id, "node.color"), "the solid color is taken off");
        });
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.color"), "#E8590C");
            assert.isUndefined(written(session, id, "node.texture"));
        });
    });
});
