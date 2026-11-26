/**
 * A label's Formatted string (owner, 2026-11-24: "one of the options [must] be 'Formatted string' ... The formatted
 * string editor opens in a popout, allows adding text and values (data, calculated, etc) in a string, and has a live
 * preview"), on the REAL graphty-element and real input: the label's source list offers Formatted string, which
 * starts from the value the label reads and opens its pop-out. Its Text line shows each value by its name and opens
 * the parts list, where words, values and lines are added; a value's Format pop-over sets its own format and what a
 * missing value shows; the preview steps through the nodes and follows the selection; a further label takes a
 * formatted string too.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openGraph, openStyle, picture, pixelsApart, sectionOf } from "./v2Harness";

/**
 * Adds a label reading Node id from the Text section's "+", and opens its Formatted string.
 * @param session - the session.
 * @param nodes - the layer.
 * @returns the editor's pop-out.
 */
async function formatted(session: GraphSession, nodes: string): Promise<HTMLElement> {
    const tab = await openStyle("Key people");
    await userEvent.click(within(sectionOf(tab, "node-text")).getByRole("button", { name: "Add to node text" }));
    await userEvent.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: "Label" }));
    const [first] = await screen.findAllByRole("group", { name: "Node label" });
    await userEvent.click(await within(first).findByRole("option", { name: /^Node id/ }));
    await waitFor(() => {
        assert.isDefined(session.styles.get(nodes)?.encode?.["node.label"], "the label reads Node id");
    });
    await userEvent.click(await screen.findByRole("button", { name: /^Node label source/ }));
    const [list] = await screen.findAllByRole("group", { name: "Node label" });
    await userEvent.click(await within(list).findByRole("option", { name: "Formatted string" }));
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>("[data-formatted-text]");
        assert.isNotNull(found, "the Formatted string pop-out is open");
        return found;
    });
}

/**
 * The label binding a layer writes.
 * @param session - the session.
 * @param layer - the layer.
 * @param channel - the channel.
 * @returns the binding.
 */
function bound(session: GraphSession, layer: string, channel = "node.label"): Record<string, unknown> | undefined {
    return session.styles.get(layer)?.encode?.[channel as "node.label"];
}

/**
 * The parts list, opened from the editor's Text line.
 * @param pop - the editor.
 * @returns the list.
 */
async function openParts(pop: HTMLElement): Promise<HTMLElement> {
    if (document.querySelector("[data-template-parts]") === null) {
        await userEvent.click(within(pop).getByRole("button", { name: /^Node label parts/ }));
    }
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>("[data-template-parts]");
        assert.isNotNull(found, "the parts list is open");
        return found;
    });
}

/**
 * Picks a value from the editor's Insert value list.
 * @param pop - the editor.
 * @param name - the value's name.
 */
async function insert(pop: HTMLElement, name: RegExp): Promise<void> {
    await userEvent.click(within(pop).getByRole("button", { name: /^Node label insert value/ }));
    const [values] = await screen.findAllByRole("group", { name: "Insert value" });
    await userEvent.click(await within(values).findByRole("option", { name }));
}

/**
 * The preview's words.
 * @param pop - the editor.
 * @returns them.
 */
function previewOf(pop: HTMLElement): string {
    return within(pop).getByRole<HTMLTextAreaElement>("textbox", { name: "Preview" }).value;
}

describe("Style panel v2's formatted string", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("builds a label from words and values shown by name, previewing what is drawn", async () => {
        const { session, element, nodes } = await openGraph();
        await session.layout.setDimension("2d");
        const before = await picture(element);
        const pop = await formatted(session, nodes);
        // It starts from the value the label reads, shown by name, never as {path}.
        const path = await waitFor(() => {
            const template = bound(session, nodes)?.template as string[] | undefined;
            assert.isTrue(Array.isArray(template) && template.length === 1, "one line");
            const [line] = template as string[];
            assert.match(line, /^\{[^{}]+\}$/, "it starts from the label's value");
            return line.slice(1, -1);
        });
        const text = await within(pop).findByRole("button", { name: /^Node label parts/ });
        assert.notInclude(text.getAttribute("aria-label") ?? "", "{", "values are shown by name");
        await waitFor(() => {
            assert.notStrictEqual(previewOf(pop), "No words", "the preview shows a node's id");
        });

        // Words added after the value, typed in the parts list.
        const parts = await openParts(pop);
        await userEvent.click(within(parts).getByRole("button", { name: "Add words" }));
        const words = await waitFor(() => {
            const found = within(parts).getAllByRole("textbox", { name: "Words" });
            assert.lengthOf(found, 1);
            return found[0];
        });
        await userEvent.clear(words);
        await userEvent.type(words, " is a person{Enter}");
        await waitFor(() => {
            assert.deepEqual(bound(session, nodes)?.template, [`{${path}} is a person`]);
        });
        await waitFor(() => {
            assert.match(previewOf(pop), / is a person$/, "the preview shows the typed words");
        });

        // A new line, then a value from Insert value on it.
        await userEvent.click(within(parts).getByRole("button", { name: "New line" }));
        await insert(pop, /^Node id/);
        await waitFor(() => {
            assert.deepEqual(bound(session, nodes)?.template, [`{${path}} is a person`, `{${path}}`]);
        });
        // The second line bold, from its Bold line.
        await userEvent.click(within(await openParts(pop)).getByRole("button", { name: "Bold line 2" }));
        await waitFor(() => {
            assert.deepEqual(bound(session, nodes)?.template, [`{${path}} is a person`, `<bold>{${path}}</bold>`]);
        });
        await waitFor(async () => {
            assert.isAbove(pixelsApart(before, await picture(element)), 0, "the label is drawn anew");
        });
    });

    it("gives a value its own format and the words a missing value shows", async () => {
        const { session, nodes } = await openGraph();
        await session.data.updateNodes([
            { id: "a", values: { score: 0.25 } },
            { id: "b", values: { score: 0.5 } },
        ]);
        await session.styles.settled();
        const pop = await formatted(session, nodes);
        await insert(pop, /^score\b/);
        await waitFor(() => {
            assert.match((bound(session, nodes)?.template as string[])[0], /\{data\.score\}$/);
        });
        const parts = await openParts(pop);
        await userEvent.click(await within(parts).findByRole("button", { name: /^score format/ }));
        const format = await waitFor(() => {
            const found = document.querySelector<HTMLElement>('[data-beside-pop="Format"]');
            assert.isNotNull(found, "Format is open");
            return found;
        });
        await userEvent.click(within(format).getByText("Percent"));
        await waitFor(() => {
            const values = bound(session, nodes)?.values as Record<string, { format?: { style?: string } }> | undefined;
            assert.strictEqual(Object.values(values ?? {})[0]?.format?.style, "percent", "its own format");
        });
        // A missing value writes words instead of leaving the line out.
        await userEvent.click(within(format).getByText("Text"));
        const missing = await within(format).findByRole("textbox", { name: "Missing text" });
        await userEvent.clear(missing);
        await userEvent.type(missing, "none yet{Enter}");
        await waitFor(() => {
            const merged = session.styles.explain({ node: "c" }).merged as Record<string, unknown>;
            assert.match(String(merged["node.label"]), /none yet$/, "c has no score");
            const a = session.styles.explain({ node: "a" }).merged as Record<string, unknown>;
            assert.match(String(a["node.label"]), /25\s?%$/, "a's score as a percent");
        });
    });

    it("steps the preview through the nodes and follows the selection", async () => {
        const { session, element, nodes } = await openGraph();
        await session.layout.setDimension("2d");
        const pop = await formatted(session, nodes);
        const shown = (): string => {
            const line = pop.querySelector<HTMLElement>('[data-line="template.preview"]');
            return line?.textContent ?? "";
        };
        await waitFor(() => {
            assert.include(shown(), "node a", "the first node");
            assert.strictEqual(previewOf(pop), "a");
        });
        await userEvent.click(within(pop).getByRole("button", { name: "Next node" }));
        await waitFor(() => {
            assert.strictEqual(previewOf(pop), "b");
        });
        await userEvent.click(within(pop).getByRole("button", { name: "Previous node" }));
        await userEvent.click(within(pop).getByRole("button", { name: "Previous node" }));
        await waitFor(() => {
            assert.strictEqual(previewOf(pop), "c", "it wraps at the ends");
        });
        // A click on a node on the Graph selects it, and the editor opens again on the node clicked. (A click outside
        // closes every pop-out; the editor is closed first so it does not cover the node.)
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector("[data-formatted-text]"), "the editor closed");
        });
        // A node the panels do not cover, other than the first.
        const { id: picked, at } = await waitFor(() => {
            const box = element.getBoundingClientRect();
            const found = ["b", "c"]
                .map((id) => ({ id, at: element.nodeScreenPosition(id) }))
                .find(({ at: each }) => {
                    if (each?.visible !== true) {
                        return false;
                    }
                    const hit = document.elementFromPoint(box.left + each.x, box.top + each.y);
                    return hit !== null && element.contains(hit);
                });
            assert.isDefined(found, "a node is drawn where a click reaches it");
            return { id: found?.id ?? "", at: { x: found?.at?.x ?? 0, y: found?.at?.y ?? 0 } };
        });
        await userEvent.click(element, { position: at });
        await waitFor(() => {
            assert.deepEqual(session.selection.nodes.map(String), [picked], "the click selects it");
        });
        // The inspector shows the node clicked; back to the row's Style tab, the selection kept.
        await openStyle("Key people");
        await userEvent.click(await screen.findByRole("button", { name: /^Node label source/ }));
        const [list] = await screen.findAllByRole("group", { name: "Node label" });
        await userEvent.click(await within(list).findByRole("option", { name: "Formatted string" }));
        const again = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-formatted-text]");
            assert.isNotNull(found, "the editor is open again");
            return found;
        });
        await waitFor(() => {
            assert.strictEqual(previewOf(again), picked, "the preview shows the selected node");
        });
    });

    it("writes a further label's formatted string at its text address", async () => {
        const { session, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        const add = async (list: RegExp): Promise<void> => {
            await userEvent.click(
                within(sectionOf(tab, "node-text")).getByRole("button", { name: /^Add to node text/ }),
            );
            await userEvent.click(await screen.findByRole("menuitem", { name: "Label" }));
            const options = await screen.findByRole("group", { name: list });
            await userEvent.click(await within(options).findByRole("option", { name: /^Node id(,|$)/ }));
        };
        await add(/^Node label$/);
        await add(/^Node label 2/);
        const id = await waitFor(() => {
            const list = session.styles.get(nodes)?.set?.["node.labels"] as { id: string }[] | undefined;
            const found = list?.find((each) => each.id !== "main")?.id;
            assert.isDefined(found, "a further label");
            return found ?? "";
        });
        await userEvent.click(await screen.findByRole("button", { name: /^Node label 2 source/ }));
        const [list] = await screen.findAllByRole("group", { name: /^Node label 2/ });
        await userEvent.click(await within(list).findByRole("option", { name: "Formatted string" }));
        await waitFor(() => {
            const template = bound(session, nodes, `node.labels.${id}.text`)?.template;
            assert.isTrue(Array.isArray(template), "the further label holds a formatted string");
        });
        const merged = session.styles.explain({ node: "a" }).merged as Record<string, unknown>;
        const drawn = (merged["node.labels"] as { id: string; text?: string }[]).find((each) => each.id === id);
        assert.strictEqual(drawn?.text, "a", "its words are the value it reads");
    });

    it("writes one formatted string to several rows edited together", async () => {
        const { session, nodes } = await openGraph();
        const { id: others } = await session.styles.add({
            name: "Others",
            target: "node",
            selector: { match: "everything" },
        });
        for (const layer of [nodes, others]) {
            await session.styles.update(layer, {
                set: session.styles.get(layer)?.set,
                encode: { "node.label": { by: "id" } },
            });
        }
        await session.styles.settled();
        await openStyle("Key people");
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Others, / }), {
            modifiers: ["Control"],
        });
        await userEvent.click(await screen.findByRole("button", { name: /^Node label source/ }));
        const [list] = await screen.findAllByRole("group", { name: "Node label" });
        await userEvent.click(await within(list).findByRole("option", { name: "Formatted string" }));
        await waitFor(() => {
            assert.deepEqual(bound(session, nodes)?.template, ["{id}"]);
            assert.deepEqual(bound(session, others)?.template, ["{id}"], "both rows hold it");
        });
    });
});
