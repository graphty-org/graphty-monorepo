/**
 * Graph settings in Style panel v2 on the REAL graphty-element, driven by real clicks and typing
 * (design/ui/style-panel-v2/design.md, section 4.3 and acceptance check 5): no "Scene" or "World"
 * anywhere; the highlight color, the framing extent and padding and the smallest mark are written
 * to the element; the background switches Color -> Sky -> Color, keeping its color; the labels' text
 * mode and sample cell are written to the element and change what the graph draws.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { picture, pixelsApart } from "../../style/__tests__/v2Harness";
import { Workspace } from "../../Workspace";

/**
 * Renders the workspace on Graph settings and waits for the element, a small graph and v2's panel.
 * @returns the element and the panel.
 */
async function openGraphSettings(): Promise<{ element: HTMLElementTagNameMap["graphty-element"]; panel: HTMLElement }> {
    const store = createWorkspaceStore({ project: { name: "Pair", id: 1 }, inspected: { kind: "graph" } });
    render(<Workspace store={store} />);
    const element = await waitFor(() => {
        const found = document.querySelector("graphty-element");
        assert.isDefined(found?.session);
        return found;
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    await element.session.data.addNodes([{ id: "a" }, { id: "b" }]);
    await element.session.data.addEdges([{ source: "a", target: "b" }]);
    await userEvent.click(await screen.findByRole("tab", { name: "Style" }));
    const panel = await waitFor(() => {
        const found = document.querySelector<HTMLElement>("[data-graph-settings-v2]");
        assert.isNotNull(found);
        return found;
    });
    return { element, panel };
}

/**
 * A line's first field.
 * @param root - where the line is.
 * @param line - the line's key.
 * @returns the field.
 */
function fieldOf(root: HTMLElement, line: string): HTMLInputElement {
    const found = root.querySelector<HTMLInputElement>(`[data-line="${line}"] input`);
    assert.isNotNull(found, line);
    return found;
}

/**
 * Types a number into a field and commits it with Enter.
 * @param input - the field.
 * @param text - what to type.
 */
async function typeNumber(input: HTMLElement, text: string): Promise<void> {
    await userEvent.click(input);
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.keyboard(`${text}{Enter}`);
}

/**
 * Clicks a segment by its name, as a reader clicks its label.
 * @param root - where it is.
 * @param name - the segment's name.
 */
async function clickSegment(root: HTMLElement, name: string): Promise<void> {
    const radio = within(root).getByRole("radio", { name });
    const label = document.querySelector<HTMLElement>(`label[for="${radio.id}"]`);
    assert.isNotNull(label);
    await userEvent.click(label);
}

describe("Graph settings v2", () => {
    withFeatures(["file-styles", "style-panel-v2"]);
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("says Graph, never Scene or World, in its words and its controls' names", async () => {
        const { panel } = await openGraphSettings();
        const names = [...panel.querySelectorAll("[aria-label]")].map((each) => each.getAttribute("aria-label") ?? "");
        for (const words of [panel.textContent, ...names]) {
            assert.notMatch(words, /\b(scene|world)\b/i);
        }
        assert.isNotNull(within(panel).getByRole("group", { name: "View" }));
        assert.isNotNull(within(panel).getByRole("group", { name: "Framing" }));
        assert.isNotNull(within(panel).getByRole("group", { name: "Marks" }));
    });

    it("writes the highlight color, the framing and the smallest mark to the element", async () => {
        const { element, panel } = await openGraphSettings();
        const highlight = within(panel).getByRole("textbox", { name: /^Highlight color(,|$)/ });
        await userEvent.clear(highlight);
        await userEvent.type(highlight, "112233{Enter}");
        await waitFor(() => {
            const color = element.session.styles.highlightStyle("node")["node.color"];
            assert.strictEqual(typeof color === "string" ? color.toLowerCase() : color, "#112233");
        });

        const framing = within(panel).getByRole("group", { name: "Framing" });
        await clickSegment(framing, "Centers");
        await waitFor(() => {
            assert.strictEqual(element.session.config.framing?.extent, "centers");
        });
        await typeNumber(fieldOf(framing, "framing.padding"), "12");
        await waitFor(() => {
            assert.strictEqual(element.session.config.framing?.padding, 12);
            assert.strictEqual(element.session.config.framing?.extent, "centers", "the extent stays");
        });

        const marks = within(panel).getByRole("group", { name: "Marks" });
        await typeNumber(fieldOf(marks, "minMarkSize"), "3");
        await waitFor(() => {
            assert.strictEqual(element.session.config.minMarkSize?.node, 3);
        });
    });

    it("switches the background Color -> Sky -> Color, keeping its color", async () => {
        const { element, panel } = await openGraphSettings();
        const color = within(panel).getByRole("textbox", { name: /^Background color(,|$)/ });
        await userEvent.clear(color);
        await userEvent.type(color, "445566{Enter}");
        await waitFor(() => {
            assert.strictEqual(element.session.config.background.color?.toLowerCase(), "#445566");
        });
        // Switch to is the first line of the row's settings, as every family's is (design 5). Sky
        // opens its picture picker and waits for a pick: Escape changes nothing.
        assert.isNull(panel.querySelector(".lucide-sliders-horizontal"), "a row's settings open from its '...'");
        await userEvent.click(within(panel).getByRole("button", { name: "Background settings" }));
        const settings = await screen.findByRole("dialog", { name: "Background" });
        await clickSegment(settings, "Sky");
        await screen.findByRole("dialog", { name: "Sky" });
        assert.strictEqual(element.session.config.background.backgroundType, "color", "Sky waits for its picture");
        assert.isNotNull(within(panel).queryByRole("textbox", { name: /^Background color(,|$)/ }), "Color stays");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Sky" }));
        });
        assert.strictEqual(element.session.config.background.backgroundType, "color");
        assert.strictEqual(element.session.config.background.color?.toLowerCase(), "#445566");
    });

    it("writes the labels' text mode and sample cell to the element, and each changes what the graph draws", async () => {
        const { element, panel } = await openGraphSettings();
        await element.session.layout.set("circular");
        const labels = (): Record<string, unknown> => ({ ...element.layoutBehavior?.labels });
        // A text mode applies to labels built after it is set: name the nodes after picking it.
        const named = async (): Promise<string> => {
            const { id } = await element.session.styles.add({
                name: "Names",
                target: "node",
                selector: { match: "everything" },
                set: { "node.label": "Hello", "node.labelSize": 144 },
            });
            await element.session.styles.settled();
            return id;
        };

        await clickSegment(panel, "Atlas");
        await waitFor(() => {
            assert.strictEqual(labels().labelText, "glyphs");
        });
        const glyphLayer = await named();
        const glyphs = await picture(element);
        await element.session.styles.remove(glyphLayer);
        await clickSegment(panel, "Canvas");
        await waitFor(() => {
            assert.strictEqual(labels().labelText, "canvas");
        });
        await named();
        const canvas = await picture(element);
        assert.isAbove(pixelsApart(glyphs, canvas), 0, "glyph labels draw differently from canvas labels");

        await typeNumber(fieldOf(panel, "labels.sampleCell"), "4000");
        await waitFor(() => {
            assert.strictEqual(labels().sampleCell, 4000);
        });
        // One cell covers the canvas: one node's label is built, the other's is not.
        assert.isAbove(pixelsApart(canvas, await picture(element)), 0, "sampling leaves a label out");
    });
});
