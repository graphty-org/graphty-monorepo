/**
 * A label's Formatted string (owner, 2026-11-24: "one of the options [must] be 'Formatted string' ... The formatted
 * string editor opens in a popout, allows adding text and values (data, calculated, etc) in a string, and has a live
 * preview"), on the REAL graphty-element and real input: the label's source list offers Formatted string, which
 * starts from the value the label reads and opens its pop-out; typed words and an inserted value are written as
 * graphty-element's `{ template }`, the preview shows the words the element draws, and the label is drawn anew.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openGraph, openStyle, picture, pixelsApart, sectionOf } from "./v2Harness";

describe("Style panel v2's formatted string", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("builds a label from typed words and an inserted value, previewing what is drawn", async () => {
        const { session, element, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        // A label reading Node id, from the Text section's "+".
        await userEvent.click(within(sectionOf(tab, "node-text")).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: "Label" }));
        const [first] = await screen.findAllByRole("group", { name: "Node label" });
        await userEvent.click(await within(first).findByRole("option", { name: /^Node id/ }));
        await waitFor(() => {
            assert.isDefined(session.styles.get(nodes)?.encode?.["node.label"], "the label reads Node id");
        });
        await session.layout.setDimension("2d");
        const before = await picture(element);

        // The source list's Formatted string starts the text from the value the label reads.
        await userEvent.click(await screen.findByRole("button", { name: /^Node label source/ }));
        const [list] = await screen.findAllByRole("group", { name: "Node label" });
        await userEvent.click(await within(list).findByRole("option", { name: "Formatted string" }));
        const template = (): unknown => {
            const bound = session.styles.get(nodes)?.encode?.["node.label"];
            return bound !== undefined && "template" in bound ? bound.template : undefined;
        };
        const value = await waitFor(() => {
            const lines = template();
            assert.isTrue(Array.isArray(lines) && lines.length === 1, "one line");
            const [line] = lines as string[];
            assert.match(line, /^\{[^{}]+\}$/, "it starts from the label's value");
            return line;
        });
        // The label's source says what it is.
        await screen.findByRole("button", { name: /^Node label source, Formatted string/ });
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-formatted-text]");
            assert.isNotNull(found, "the Formatted string pop-out is open");
            return found;
        });
        const preview = within(pop).getByRole("textbox", { name: "Preview" });
        await waitFor(() => {
            assert.notStrictEqual((preview as HTMLTextAreaElement).value, "No words", "the preview shows a node's id");
        });

        // Words typed before the value, written on leaving the field.
        const text = within(pop).getByRole<HTMLTextAreaElement>("textbox", { name: "Text" });
        await userEvent.click(text);
        text.setSelectionRange(0, 0);
        await userEvent.keyboard("Person ");
        await userEvent.click(preview);
        await waitFor(() => {
            assert.deepEqual(template(), [`Person ${value}`]);
        });
        await waitFor(() => {
            assert.match((preview as HTMLTextAreaElement).value, /^Person /, "the preview shows the typed words");
        });

        // A value inserted at the caret, from the value list: here at the end, on a line of its own.
        await userEvent.click(text);
        text.setSelectionRange(text.value.length, text.value.length);
        await userEvent.keyboard("{Enter}Id ");
        await userEvent.click(within(pop).getByRole("button", { name: /^Node label insert value/ }));
        const [values] = await screen.findAllByRole("group", { name: "Insert value" });
        await userEvent.click(await within(values).findByRole("option", { name: /^Node id/ }));
        await waitFor(() => {
            assert.deepEqual(template(), [`Person ${value}`, `Id ${value}`]);
        });
        await waitFor(async () => {
            assert.isAbove(pixelsApart(before, await picture(element)), 0, "the label is drawn anew");
        });
    });
});
