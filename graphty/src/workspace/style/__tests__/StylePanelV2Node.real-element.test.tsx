/**
 * Style panel v2's node things on the REAL graphty-element, driven by real clicks and typing
 * (design/ui/style-panel-v2/design.md, sections 2.5, 2.6, 5.2, 6 and 8): Border's row is its color
 * with a Width common line under it; its settings pop-over sets the position with an icon segment
 * and moves the width between units in one undo step; Shape's pop-over adds Corners from its "+"
 * and its legend's minus unsets them; the shape list shows one section at a time and its search
 * reaches every section.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
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
 * Waits for a line in a part of the page.
 * @param root - where it is.
 * @param channel - its channel.
 * @returns the line.
 */
async function lineOf(root: ParentNode, channel: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = root.querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
        assert.isNotNull(found);
        return found;
    });
}

/**
 * Types a number into a line's field and commits it with Enter.
 * @param line - the line.
 * @param text - what to type.
 * @param which - which of the line's fields (0, or 1 for a pair's second).
 */
async function typeInto(line: HTMLElement, text: string, which = 0): Promise<void> {
    const input = line.querySelectorAll<HTMLInputElement>("input")[which];
    assert.isDefined(input);
    await userEvent.click(input);
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.keyboard(`${text}{Enter}`);
}

/**
 * Clicks a segment of a segmented control by its name, as a reader clicks its label.
 * @param name - the segment's name.
 */
async function clickSegment(name: string): Promise<void> {
    const radio = await screen.findByRole("radio", { name });
    const label = document.querySelector<HTMLElement>(`label[for="${radio.id}"]`);
    assert.isNotNull(label);
    await userEvent.click(label);
}

/**
 * Adds Border from the empty Border section's title.
 * @param tab - the Style tab.
 * @returns the Border row.
 */
async function addBorder(tab: HTMLElement): Promise<HTMLElement> {
    const border = sectionOf(tab, "node-border");
    const title = border.querySelector<HTMLElement>('[data-testid="control-section-lead"]');
    assert.isNotNull(title);
    await userEvent.click(title);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Border" }));
    return rowOf(border, "border");
}

describe("Style panel v2's node things", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("Border's row is its color, with an empty Width line under it that typing sets", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const row = await addBorder(tab);
        await waitFor(() => {
            assert.isDefined(written(session, id, "node.borderColor"), "Border starts with its color");
        });
        assert.isNotNull(row.querySelector('[data-line="node.borderColor"] .cm-paint'), "the row is a color field");
        const width = await lineOf(row, "node.borderWidth");
        assert.isFalse(width.hasAttribute("data-set"), "the Width line is empty until written");
        assert.isNull(within(width).queryByRole("button", { name: "Remove width" }), "no minus while unset");

        await typeInto(width, "2");
        await waitFor(() => {
            assert.equal(written(session, id, "node.borderWidth"), 2);
            assert.isNotNull(within(width).queryByRole("button", { name: "Remove width" }), "set, it has a minus");
        });
    });

    it("the Border pop-over sets the position by icon, and moves the width Graph -> Screen in one Undo", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const row = await addBorder(tab);
        await typeInto(await lineOf(row, "node.borderWidth"), "2");
        await waitFor(() => {
            assert.equal(written(session, id, "node.borderWidth"), 2);
        });

        await userEvent.click(within(row).getByRole("button", { name: "Node border settings" }));
        await clickSegment("Inside");
        await waitFor(() => {
            assert.equal(written(session, id, "node.borderPosition"), "inside");
        });

        await clickSegment("Screen");
        await waitFor(() => {
            assert.equal(written(session, id, "node.borderScreenWidth"), 2, "the value moves to Screen");
            assert.isUndefined(written(session, id, "node.borderWidth"), "and leaves Graph");
        });
        await userEvent.keyboard("{Escape}");
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.borderWidth"), 2, "one Undo brings it back to Graph");
            assert.isUndefined(written(session, id, "node.borderScreenWidth"));
        });
    });

    it("Shape's pop-over adds Corners from its '+', and the legend's minus unsets them", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const shape = sectionOf(tab, "node-shape");
        await userEvent.click(within(shape).getByRole("button", { name: "Add Shape" }));
        const row = await rowOf(shape, "shape");
        assert.isNotNull(await lineOf(row, "node.size"), "Size is Shape's common line");

        await userEvent.click(within(row).getByRole("button", { name: "Node shape settings" }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        assert.isNull(within(pop).queryByRole("group", { name: "Corners" }), "Corners waits for its '+'");
        await userEvent.click(within(pop).getByRole("button", { name: "Add to node shape settings" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Corners" }));
        const corners = await within(pop).findByRole("group", { name: "Corners" });
        await typeInto(await lineOf(corners, "node.cornerRadius"), "0.2");
        await waitFor(() => {
            assert.equal(written(session, id, "node.cornerRadius"), 0.2);
        });

        await userEvent.click(within(corners).getByRole("button", { name: "Remove corners" }));
        await waitFor(() => {
            assert.isUndefined(written(session, id, "node.cornerRadius"), "the legend's minus unsets its lines");
            assert.isNull(within(pop).queryByRole("group", { name: "Corners" }));
        });
        assert.isDefined(written(session, id, "node.shape"), "the shape stays");
    });

    it("the shape list shows at most 12 rows at a time, and its search reaches every section", async () => {
        await openProject();
        const tab = await openStyle("Key people");
        const shape = sectionOf(tab, "node-shape");
        await userEvent.click(within(shape).getByRole("button", { name: "Add Shape" }));
        const row = await rowOf(shape, "shape");
        const picker = await waitFor(() => {
            const found = row.querySelector<HTMLElement>('[data-value-listbox="node.shape"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(picker);
        const list = await screen.findByRole("group", { name: /values$/ });
        const names = (): string[] =>
            within(list)
                .getAllByRole("option")
                .map((option) => option.textContent ?? "");
        assert.isAtMost(names().length, 12, "one section's rows");
        assert.notOk(
            names().some((name) => name.startsWith("Torus")),
            "a shape of another section is not listed",
        );
        assert.isNotNull(screen.getByRole("combobox", { name: "Node shape section" }), "a section select");

        await userEvent.click(within(list).getByRole("combobox", { name: "Search" }));
        await userEvent.keyboard("torus");
        await waitFor(() => {
            assert.isTrue(
                names().some((name) => name.startsWith("Torus")),
                "search finds a shape in another section",
            );
        });
    });

    it("Fill's Pie writes its first slice and opens on its slice list, whose '+' adds a slice", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const fill = sectionOf(tab, "node-fill");
        await userEvent.click(within(fill).getByRole("button", { name: /^Add to node fill|^Add Fill/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Pie" }));
        await waitFor(() => {
            assert.isString(written(session, id, "node.pieColors"), "Pie starts with one slice");
        });
        const add = await screen.findByRole("button", { name: "Add slice" });
        await userEvent.click(add);
        await waitFor(() => {
            assert.lengthOf(
                String(written(session, id, "node.pieColors"))
                    .trim()
                    .split(/\s+/),
                2,
                "two slices",
            );
        });
        await userEvent.click(screen.getByRole("button", { name: "Remove slice 2" }));
        await waitFor(() => {
            assert.lengthOf(
                String(written(session, id, "node.pieColors"))
                    .trim()
                    .split(/\s+/),
                1,
                "one slice",
            );
        });
        assert.isNotNull(await rowOf(fill, "pie"), "the Pie row is its swatch strip");
    });

    it("Record and Inner lines write their first item, open on their list and take items by hand", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const text = sectionOf(tab, "node-text");
        await userEvent.click(within(text).getByRole("button", { name: /^Add to node text|^Add Text/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Record" }));
        await waitFor(() => {
            assert.isString(written(session, id, "node.shapeTexts"), "Record starts with one field");
        });
        const words = await screen.findByRole("textbox", { name: "Field 1 text" });
        await userEvent.click(words);
        await userEvent.keyboard("Hello{Enter}");
        await waitFor(() => {
            assert.deepEqual(JSON.parse(String(written(session, id, "node.shapeTexts"))), [[0, 0, "Hello"]]);
        });
        await userEvent.keyboard("{Escape}");
        assert.isNotNull(await rowOf(text, "record"), "the Record row stays");

        const border = sectionOf(tab, "node-border");
        await userEvent.click(within(border).getByRole("button", { name: /^Add to node border|^Add Border/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Inner lines" }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.shapeLines"), "-1,0 1,0", "Inner lines start with one line");
        });
        await userEvent.click(await screen.findByRole("button", { name: "Add line" }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.shapeLines"), "-1,0 1,0; -1,0 1,0", "a second line");
        });
        await userEvent.click(screen.getByRole("button", { name: "Remove line 2" }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.shapeLines"), "-1,0 1,0", "one line again");
        });
    });
});
