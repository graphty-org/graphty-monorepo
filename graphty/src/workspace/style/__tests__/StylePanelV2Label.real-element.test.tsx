/**
 * Style panel v2's Text section on the REAL graphty-element, driven by real clicks and typing
 * (design/ui/style-panel-v2/design.md, sections 2.4, 7.3 and 12 check 9): Label is added from the
 * Text section's "+", its source list opens and a pick binds the words; its Size and color common
 * lines write fields of the layer's label style object; its pop-over's Advanced view holds Background, whose
 * corner radius is written and taken off again by the line's minus, and every other sub-group; Label stays in "+", enabled,
 * while set (it adds a further label); and a label color set on a second layer over one node draws one
 * label per node.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { LABEL_RUBRIC } from "../v2/labelRubric";
import { groupNames, openGraph, openGroup, openProject, openStyle, picture, sectionOf, written } from "./v2Harness";

/**
 * The layer's label style object.
 * @param session - the session.
 * @param id - the layer.
 * @returns the object, or an empty one.
 */
function labelStyle(session: GraphSession, id: string): Record<string, unknown> {
    const value = written(session, id, "node.labelStyle");
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * Waits for a line in a part of the page.
 * @param root - where it is.
 * @param line - its `data-line`.
 * @returns the line.
 */
async function lineOf(root: ParentNode, line: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = root.querySelector<HTMLElement>(`.ws-row[data-line="${line}"]`);
        assert.isNotNull(found);
        return found;
    });
}

/**
 * Opens a row's settings pop-over: an unset line shows only there (design 2.5).
 * @param row - the row.
 * @returns the pop-over.
 */
async function popoverOf(row: HTMLElement): Promise<HTMLElement> {
    await userEvent.click(within(row).getByRole("button", { name: /^Node label settings/ }));
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>("[data-thing-popover]");
        assert.isNotNull(found);
        return found;
    });
}

/**
 * Types into a line's first field and commits it with Enter.
 * @param line - the line.
 * @param text - what to type.
 */
async function typeInto(line: HTMLElement, text: string): Promise<void> {
    const input = line.querySelector<HTMLInputElement>("input");
    assert.isNotNull(input);
    await userEvent.click(input);
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.keyboard(`${text}{Enter}`);
}

/**
 * Adds Label from the Text section's title and picks Node id from the source list that opens.
 * @param tab - the Style tab.
 * @returns the Label row.
 */
async function addLabel(tab: HTMLElement): Promise<HTMLElement> {
    const text = sectionOf(tab, "node-text");
    const plus = text.querySelector<HTMLElement>("[data-plus]");
    assert.isNotNull(plus, 'the section\'s "+"');
    await userEvent.click(plus);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Label" }));
    const list = await screen.findByRole("group", { name: "Node label" });
    await userEvent.click(await within(list).findByRole("option", { name: /^Node id(,|$)/ }));
    return waitFor(() => {
        const found = text.querySelector<HTMLElement>('[data-thing="label"]');
        assert.isNotNull(found);
        return found;
    });
}

/**
 * Asserts every line in a part of a pop-over shows a name, a switch's its checkbox's, and that no name is cut.
 * @param root - the part.
 */
function assertNamedUncut(root: HTMLElement): void {
    for (const line of root.querySelectorAll<HTMLElement>(".ws-row[data-line]")) {
        const address = line.getAttribute("data-line") ?? "";
        // Named above (its legend), by a checkbox's own words, or by its swatch or toggles' own look.
        const name = line.querySelector<HTMLElement>(".cm-legend-text");
        const selfDescribing = line.querySelector(".cm-paint, [data-font-style]") === null ? "" : "self-describing";
        const words = name?.textContent ?? line.querySelector(".mantine-Checkbox-label")?.textContent ?? selfDescribing;
        assert.notEqual(words, "", `${address} has a name`);
        if (name !== null) {
            assert.isAtMost(name.scrollWidth, name.clientWidth, `${address}: "${words}" is cut`);
        }
    }
}

describe("Style panel v2's Text section", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("adds Label, binds its words, and writes Size and color into the label style", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const row = await addLabel(tab);
        await waitFor(() => {
            assert.isDefined(session.styles.get(id)?.encode?.["node.label"], "the pick binds the words");
            assert.isNotNull(within(row).queryByRole("button", { name: "Node label source, Node id" }));
        });

        // Size and color are the row's own lines, and only the row's: the pop-over's Main starts at Show.
        await typeInto(await lineOf(row, "node.labelStyle.size"), "2");
        await waitFor(() => {
            assert.equal(labelStyle(session, id).size, 2, "Size writes the style's size");
        });
        const color = await lineOf(row, "node.labelStyle.color");
        await userEvent.click(within(color).getByRole("textbox"));
        await userEvent.keyboard("{Control>}a{/Control}FF0000{Enter}");
        await waitFor(() => {
            assert.equal(
                String(labelStyle(session, id).color).toUpperCase(),
                "#FF0000",
                "color writes the style's color",
            );
            assert.equal(labelStyle(session, id).size, 2, "and keeps its size");
            const under = row.querySelector('.ws-row[data-line="node.labelStyle.color"]');
            // A swatch describes itself: no name beside or above it (owner, 2026-11-24).
            assert.isNotNull(under?.querySelector(".cm-paint"), "set, the color shows under the row, as its swatch");
        });
        const pop = await popoverOf(row);
        assert.deepEqual(
            [...pop.querySelectorAll(".ws-row[data-line]")].map((line) => line.getAttribute("data-line")),
            LABEL_RUBRIC.main.map((line) => `node.labelStyle.${line.field}${line.unit === undefined ? "" : ":unit"}`),
            "the pop-over holds Show to Location, and no second Size or Color",
        );
        await userEvent.keyboard("{Escape}");

        // Label stays in "+", enabled, while set: it adds a further label (StylePanelV2SeveralLabels).
        const text = sectionOf(tab, "node-text");
        await userEvent.click(within(text).getByRole("button", { name: /^Add to / }));
        const label = await screen.findByRole("menuitem", { name: "Label" });
        assert.isFalse(
            label.hasAttribute("disabled") || label.getAttribute("aria-disabled") === "true",
            "Label is enabled",
        );
        await userEvent.keyboard("{Escape}");
    });

    it("the Background group holds the corners; the corner radius line writes and its minus takes the key off", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const row = await addLabel(tab);
        await userEvent.click(await within(row).findByRole("button", { name: /^Node label settings/ }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        assert.isNull(pop.querySelector('[data-line="node.labelStyle.cornerRadius"]'), "Corners is not the pop-over's");
        // Background is a group of the label's "..." menu, its own pop-over beside (design "Input rules").
        const background = await openGroup(pop, "Background");
        const corners = await lineOf(background, "node.labelStyle.cornerRadius");
        await typeInto(corners, "4");
        await waitFor(() => {
            assert.equal(labelStyle(session, id).cornerRadius, 4);
        });

        await userEvent.click(await within(corners).findByRole("button", { name: "Remove corners" }));
        await waitFor(() => {
            assert.notProperty(labelStyle(session, id), "cornerRadius", "the minus takes the key off");
        });
        assert.isDefined(session.styles.get(id)?.encode?.["node.label"], "the label stays");
    });

    it("every label group is a menu entry, named uncut; a look's line switches it on; the minus unsets it", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const row = await addLabel(tab);
        await userEvent.click(await within(row).findByRole("button", { name: /^Node label settings/ }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        // The pop-over keeps its everyday lines (6 tall at most, owner's input rules); every group is its "..."
        // menu's, each opening beside it, so it has no "+".
        assert.isNull(within(pop).queryByRole("button", { name: "Add to node label settings" }));
        assertNamedUncut(pop);
        assert.deepEqual(
            await groupNames(pop),
            LABEL_RUBRIC.groups.map((group) => group.name),
        );
        const shadow = await openGroup(pop, "Text shadow");
        assertNamedUncut(shadow);
        // A Text shadow color set while its switch is off switches the shadow on (no tick first).
        const color = await lineOf(shadow, "node.labelStyle.shadowColor");
        await userEvent.click(within(color).getByRole("textbox"));
        await userEvent.keyboard("{Control>}a{/Control}FF0000{Enter}");
        await waitFor(() => {
            assert.isTrue(labelStyle(session, id).shadow, "the color switches the text shadow on");
        });
        // The group's own minus, in its pop-over's header (its Text shadow line has one of its own).
        const header = shadow
            .closest<HTMLElement>("[data-popout-id]")
            ?.querySelector<HTMLElement>('[data-testid="popout-header"]');
        assert.isDefined(header ?? undefined, "the group pop-over's header");
        await userEvent.click(within(header ?? shadow).getByRole("button", { name: "Remove text shadow" }));
        await waitFor(() => {
            assert.notProperty(labelStyle(session, id), "shadow", "the minus unsets the group");
        });
    });

    it("a label color on a layer over one node draws one label per node", async () => {
        const { session } = await openProject();
        await session.styles.add({
            name: "Hubs",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: {},
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        await addLabel(tab);
        await waitFor(() => {
            assert.equal(
                session.styles.drawnValues("node.label").reduce((sum, each) => sum + each.count, 0),
                3,
                "every node has its label",
            );
        });

        const hubsTab = await openStyle("Hubs");
        const hubs = session.styles.list().find((layer) => layer.name === "Hubs");
        assert.isDefined(hubs);
        // A Label row with no source restyles the labels the node already has (design 7.4).
        const text = sectionOf(hubsTab, "node-text");
        const plus = text.querySelector<HTMLElement>("[data-plus]");
        assert.isNotNull(plus, 'the section\'s "+"');
        await userEvent.click(plus);
        await userEvent.click(await screen.findByRole("menuitem", { name: "Label" }));
        await screen.findByRole("group", { name: "Node label" });
        await userEvent.keyboard("{Escape}");
        const row = await waitFor(() => {
            const found = text.querySelector<HTMLElement>('[data-thing="label"]');
            assert.isNotNull(found);
            return found;
        });
        const color = await lineOf(row, "node.labelStyle.color");
        await userEvent.click(within(color).getByRole("textbox"));
        await userEvent.keyboard("{Control>}a{/Control}FF0000{Enter}");
        await waitFor(() => {
            assert.equal(String(labelStyle(session, hubs?.id ?? "").color).toUpperCase(), "#FF0000");
        });
        await session.styles.settled();
        const labels = session.styles.drawnValues("node.label");
        assert.equal(
            labels.reduce((sum, each) => sum + each.count, 0),
            3,
            "still one label per node, the hub's recolored rather than doubled",
        );
        const styles = session.styles.drawnValues("node.labelStyle");
        const red = styles.filter((each) => {
            const color = (each.value as { readonly color?: unknown } | undefined)?.color;
            return typeof color === "string" && color.toUpperCase() === "#FF0000";
        });
        assert.equal(
            red.reduce((sum, each) => sum + each.count, 0),
            1,
            "only the hub's label is red",
        );
    });

    it("a new Label draws at a size a reader can read, every line under it is named, its color is a color", async () => {
        const { element } = await openGraph();
        const before = await picture(element);
        const tab = await openStyle("Key people");
        const row = await addLabel(tab);
        await element.session.styles.settled();
        const after = await picture(element);
        // The rows the label's words take: the height of what changed on the canvas.
        let top = Infinity;
        let bottom = -Infinity;
        for (let i = 0; i < after.data.length; i += 4) {
            if ([0, 1, 2].some((c) => Math.abs((after.data[i + c] ?? 0) - (before.data[i + c] ?? 0)) > 1)) {
                const y = Math.floor(i / 4 / after.width);
                top = Math.min(top, y);
                bottom = Math.max(bottom, y);
            }
        }
        const tall = (bottom - top + 1) / (after.width / element.clientWidth);
        assert.isAtLeast(tall, 10, `the label is drawn ${String(tall)} px tall`);
        for (const line of row.querySelectorAll(".ws-row[data-line]")) {
            const named = line.querySelector(".cm-legend-text")?.textContent ?? line.getAttribute("data-rule");
            assert.isTrue(named !== "" && named !== null, `${line.getAttribute("data-line") ?? ""} has a name`);
        }
        const color = await lineOf(row, "node.labelStyle.color");
        assert.isNotNull(color.querySelector(".cm-paint"), "the color line is a color control with a swatch");
    });

    it("the label pop-over starts with its Text and Glyph tabs, its Look line named above it", async () => {
        await openProject();
        const tab = await openStyle("Key people");
        const row = await addLabel(tab);
        const pop = await popoverOf(row);
        const strip = await waitFor(() => {
            const found = pop.querySelector<HTMLElement>("[data-strip]");
            assert.isNotNull(found, "the tab strip");
            return found;
        });
        assert.isTrue(within(strip).getByRole<HTMLInputElement>("radio", { name: "Text" }).checked, "Text is picked");
        const look = await within(pop).findByRole("combobox", { name: "Look" });
        assert.strictEqual(look.closest(".ws-member")?.querySelector(".cm-legend-text")?.textContent, "Look");
    });

    it("a Label with no source yet reads No words, never an empty source (owner's input rules)", async () => {
        const { session, id } = await openProject();
        await session.styles.update(id, { set: { ...session.styles.get(id)?.set, "node.labelStyle": { size: 2 } } });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const row = await waitFor(() => {
            const found = sectionOf(tab, "node-text").querySelector<HTMLElement>('[data-thing="label"]');
            assert.isNotNull(found);
            return found;
        });
        assert.isNotNull(within(row).queryByRole("button", { name: "Node label source, No words" }));
    });

    it("a label's Margin leaves the Box size group while its box padding is set, the padding standing in for it", async () => {
        const { session, id } = await openProject();
        await session.styles.update(id, {
            set: { "node.color": "#E8590C", "node.label": "Hello", "node.labelStyle": { boxPadding: 4 } },
        });
        const tab = await openStyle("Key people");
        const row = await waitFor(() => {
            const found = sectionOf(tab, "node-text").querySelector<HTMLElement>('[data-thing="label"]');
            assert.isNotNull(found);
            return found;
        });
        const pop = await popoverOf(row);
        // Margin is in the Box size group, and appears only while it applies (design "Input rules", "Tabs").
        const box = await openGroup(pop, "Box size");
        // The group has drawn once its first line is there.
        await lineOf(box, "node.labelStyle.lineBox");
        assert.isNull(
            box.querySelector('[data-line="node.labelStyle.marginTop"]'),
            "no Margin while box padding is set",
        );
    });
});
