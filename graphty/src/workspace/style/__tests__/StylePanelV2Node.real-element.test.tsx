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
 * Adds Border from the Effects section's "+" (Border is an Effects option).
 * @param tab - the Style tab.
 * @returns the Border row.
 */
async function addBorder(tab: HTMLElement): Promise<HTMLElement> {
    const effects = sectionOf(tab, "node-effects");
    await userEvent.click(within(effects).getByRole("button", { name: /^Add to node effects/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Border" }));
    return rowOf(effects, "border");
}

describe("Style panel v2's node things", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("Border's row is its color, with the Width it needs to draw under it, which typing changes", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const row = await addBorder(tab);
        await waitFor(() => {
            assert.isDefined(written(session, id, "node.borderColor"), "Border starts with its color");
            assert.equal(written(session, id, "node.borderWidth"), 0.1, "and the width graphty-element says it needs");
        });
        assert.isNotNull(row.querySelector('[data-line="node.borderColor"] .cm-paint'), "the row is a color field");
        const main = row.querySelector<HTMLElement>('[data-line="node.borderColor"]');
        assert.isNotNull(main);
        assert.isNotNull(within(main).queryByText("Border", { exact: true }), "its name column reads Border (E674)");
        const width = await lineOf(row, "node.borderWidth");
        await waitFor(() => {
            assert.isTrue(width.hasAttribute("data-set"), "the Width line is set");
        });

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

        await userEvent.click(within(row).getByRole("button", { name: /^Node border settings/ }));
        await clickSegment("Inside");
        await waitFor(() => {
            assert.equal(written(session, id, "node.borderPosition"), "inside");
        });

        // The width's unit is a line of the pop-over (design "Input rules": a one-line group joins it).
        await clickSegment("Screen");
        await waitFor(() => {
            assert.equal(written(session, id, "node.borderScreenWidth"), 2, "the value moves to Screen");
            assert.isUndefined(written(session, id, "node.borderWidth"), "and leaves Graph");
        });
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.borderWidth"), 2, "one Undo brings it back to Graph");
            assert.isUndefined(written(session, id, "node.borderScreenWidth"));
        });
    });

    it("a basic Shape row has no settings; Corners the layer sets are lines under it with their minus", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const shape = sectionOf(tab, "node-shape");
        await userEvent.click(within(shape).getByRole("button", { name: "Add to node shape" }));
        // Shape's "+" lists Size and Shape (ia-design 2).
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        const row = await rowOf(shape, "shape");
        assert.isNull(row.querySelector('.ws-row[data-line="node.size"]'), "an unset Size is not under the row");
        // Its drop-down is its settings (owner, 2026-11-23).
        assert.isNull(within(row).queryByRole("button", { name: /^Node shape settings/ }));

        // Corners a layer already sets (an imported file's) are drawn under the row, editable.
        await session.styles.update(id, { set: { ...session.styles.get(id)?.set, "node.cornerRadius": 0.1 } });
        await typeInto(await lineOf(row, "node.cornerRadius"), "0.2");
        await waitFor(() => {
            assert.equal(written(session, id, "node.cornerRadius"), 0.2);
        });
        const line = await lineOf(row, "node.cornerRadius");
        await userEvent.click(within(line).getByRole("button", { name: /^Remove / }));
        await waitFor(() => {
            assert.isUndefined(written(session, id, "node.cornerRadius"), "its minus unsets it");
        });
        assert.isDefined(written(session, id, "node.shape"), "the shape stays");
    });

    it("the shape list shows at most 12 rows at a time, and its search reaches every section", async () => {
        await openProject();
        const tab = await openStyle("Key people");
        const shape = sectionOf(tab, "node-shape");
        await userEvent.click(within(shape).getByRole("button", { name: "Add to node shape" }));
        // Shape's "+" lists Size and Shape (ia-design 2).
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
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

    it("Fill's Pie writes two slices and opens on its slice list, whose '+' adds a slice", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const fill = sectionOf(tab, "node-fill");
        await userEvent.click(within(fill).getByRole("button", { name: /^Add to node fill|^Add Fill/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Pie" }));
        const slices = (): number =>
            String(written(session, id, "node.pieColors"))
                .trim()
                .split(/\s+/).length;
        await waitFor(() => {
            assert.equal(slices(), 2, "Pie starts with two slices");
        });
        // "+" opens the pie's data picker (design 5.1); Escape keeps its fixed slices. Its pop-over holds the slices as
        // one line, which opens the list beside (design "Lists in pop-overs").
        await userEvent.keyboard("{Escape}");
        const pie = await rowOf(fill, "pie");
        await userEvent.click(within(pie).getByRole("button", { name: /^Node pie settings/ }));
        await userEvent.click(await screen.findByRole("button", { name: /^Edit slices/ }));
        const add = await screen.findByRole("button", { name: "Add slice" });
        await userEvent.click(add);
        await waitFor(() => {
            assert.equal(slices(), 3, "three slices");
        });
        await userEvent.click(screen.getByRole("button", { name: "Remove slice 3" }));
        await waitFor(() => {
            assert.equal(slices(), 2, "two slices");
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
        // "+" opens the record's data picker (design 5.1); Escape keeps its fixed fields, one line of its pop-over that
        // opens the list beside (design "Lists in pop-overs").
        await userEvent.keyboard("{Escape}");
        const record = await waitFor(() => {
            const found = text.querySelector<HTMLElement>('[data-thing="record"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(within(record).getByRole("button", { name: /^Node record settings/ }));
        await userEvent.click(await screen.findByRole("button", { name: /^Edit fields/ }));
        const words = await screen.findByRole("textbox", { name: "Field 1 text" });
        // A new field starts with words (design "Input rules": no empty input), typed over.
        assert.equal((words as HTMLInputElement).value, "Field 1");
        await userEvent.click(words);
        await userEvent.keyboard("{Control>}a{/Control}Hello{Enter}");
        await waitFor(() => {
            assert.deepEqual(JSON.parse(String(written(session, id, "node.shapeTexts"))), [["Hello"]], "no point");
        });
        await userEvent.keyboard("{Escape}");
        assert.isNotNull(await rowOf(text, "record"), "the Record row stays");

        // Inner lines are the custom shape's (ia-design 2): lines a layer sets are drawn under the Shape row.
        const shape = sectionOf(tab, "node-shape");
        await userEvent.click(within(shape).getByRole("button", { name: "Add to node shape" }));
        // Shape's "+" lists Size and Shape (ia-design 2).
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        await rowOf(shape, "shape");
        await session.styles.update(id, { set: { ...session.styles.get(id)?.set, "node.shapeLines": "-1,0 1,0" } });
        const custom = await rowOf(shape, "shape");
        // Extra pieces take lines too: Inner lines' own "+" is on its line.
        const innerLines = (): HTMLElement => {
            const found = custom.querySelector<HTMLElement>('[data-line="node.shapeLines"]');
            assert.isNotNull(found);
            return found;
        };
        await userEvent.click(within(innerLines()).getByRole("button", { name: "Add line" }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.shapeLines"), "-1,0 1,0; -1,0 1,0", "a second line");
        });
        await userEvent.click(within(custom).getByRole("button", { name: "Remove line 2" }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.shapeLines"), "-1,0 1,0", "one line again");
        });
    });
});
