/**
 * Style panel v2's Text section on the REAL graphty-element, driven by real clicks and typing
 * (design/ui/style-panel-v2/design.md, sections 2.4, 7.3 and 12 check 9): Label is added from the
 * Text section's "+", its source list opens and a pick binds the words; its Size and color common
 * lines write fields of the layer's label style object; its pop-over's "+" adds Background, whose
 * corner radius is written and taken off again by the line's minus; Label stays in "+", enabled,
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
import { openGraph, openProject, openStyle, picture, sectionOf, written } from "./v2Harness";

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

        const pop = await popoverOf(row);
        await typeInto(await lineOf(pop, "node.labelStyle.size"), "2");
        await waitFor(() => {
            assert.equal(labelStyle(session, id).size, 2, "Size writes the style's size");
        });
        const color = await lineOf(pop, "node.labelStyle.color");
        await userEvent.click(within(color).getByRole("textbox"));
        await userEvent.keyboard("{Control>}a{/Control}FF0000{Enter}");
        await waitFor(() => {
            assert.equal(
                String(labelStyle(session, id).color).toUpperCase(),
                "#FF0000",
                "color writes the style's color",
            );
            assert.equal(labelStyle(session, id).size, 2, "and keeps its size");
            const under = row.querySelector('.ws-row[data-line="node.labelStyle.color"] .ws-field-name');
            assert.equal(under?.textContent, "Color", "set, the color shows under the row, named");
        });
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

    it("the pop-over adds Background from '+'; the corner radius line writes and its minus takes the key off", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const row = await addLabel(tab);
        await userEvent.click(await within(row).findByRole("button", { name: /^Node label settings/ }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        assert.isNull(within(pop).queryByRole("group", { name: "Background" }), "Background waits for '+'");
        await userEvent.click(within(pop).getByRole("button", { name: "Add to node label settings" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Background" }));
        const background = await within(pop).findByRole("group", { name: "Background" });
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

    it("every sub-group of the pop-over's '+' adds, switches on what it switches on, and its minus unsets it", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const row = await addLabel(tab);
        await userEvent.click(await within(row).findByRole("button", { name: /^Node label settings/ }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        for (const group of LABEL_RUBRIC.groups) {
            await userEvent.click(within(pop).getByRole("button", { name: "Add to node label settings" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: group.name }));
            const legend = await within(pop).findByRole("group", { name: group.name });
            if (group.on !== undefined) {
                await waitFor(() => {
                    assert.isTrue(labelStyle(session, id)[group.on ?? ""], `${group.name} switches on`);
                });
            }
            await userEvent.click(within(legend).getByRole("button", { name: `Remove ${group.name.toLowerCase()}` }));
            await waitFor(() => {
                assert.isNull(within(pop).queryByRole("group", { name: group.name }), `${group.name} goes`);
                if (group.on !== undefined) {
                    assert.notProperty(labelStyle(session, id), group.on, `${group.name} switched off`);
                }
            });
        }
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
        const color = await lineOf(await popoverOf(row), "node.labelStyle.color");
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
            const named = line.querySelector(".ws-field-name")?.textContent ?? line.getAttribute("data-rule");
            assert.isTrue(named !== "" && named !== null, `${line.getAttribute("data-line") ?? ""} has a name`);
        }
        const pop = await popoverOf(row);
        const color = await lineOf(pop, "node.labelStyle.color");
        assert.isNotNull(color.querySelector(".cm-paint"), "the color line is a color control with a swatch");
    });

    it("a label's Margin is dimmed while its box padding is set, the padding standing in for it", async () => {
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
        await userEvent.click(within(pop).getByRole("button", { name: "Add to node label settings" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Margin" }));
        const margin = await lineOf(pop, "node.labelStyle.marginTop");
        assert.isTrue(margin.hasAttribute("data-dimmed"), "dimmed while box padding is set");
        assert.match(margin.getAttribute("title") ?? "", /Box padding|padding/i, "its tooltip names what it waits on");
    });
});
