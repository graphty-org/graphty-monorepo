/**
 * A node's Label is Text or Glyph, picked from its row (owner, 2026-11-19: "glyph seems duplicative to
 * label"), on the REAL graphty-element and real input: the Text "+" offers no Glyph; a Label switched to Glyph
 * from its Switch to and given a character draws it, its color moved from the text; Undo brings the text back;
 * and a file whose styles write a glyph (a vis-network icon node, through graph-io) opens as one Label row of
 * kind Glyph showing its character, drawn on the graph. A vis-network file stands in for the plan's Cytoscape.js
 * one: graph-io's Cytoscape.js styles write no node.glyph (Cytoscape.js has no glyph), vis-network's icons do.
 * Every line of the Label's pop-over, of either kind, shows its name or a tooltip (E269).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openGraph, openProject, openStyle, picture, pixelsApart, sectionOf, written } from "./v2Harness";

/**
 * The Label row of the open node tab.
 * @param tab - the Style tab.
 * @returns the row.
 */
async function labelRow(tab: HTMLElement): Promise<HTMLElement> {
    return waitFor(() => {
        const found = sectionOf(tab, "node-text").querySelector<HTMLElement>('[data-thing="label"]');
        assert.isNotNull(found);
        return found;
    });
}

/**
 * Picks a kind from the row's Switch to.
 * @param row - the row.
 * @param kind - the kind's name.
 */
async function switchTo(row: HTMLElement, kind: string): Promise<void> {
    await userEvent.click(within(row).getByRole("button", { name: /^Switch node label to/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: kind }));
}

/**
 * The kind the row's Switch to has checked, read by opening it.
 * @param row - the row.
 * @returns its name.
 */
async function kindOf(row: HTMLElement): Promise<string> {
    await userEvent.click(within(row).getByRole("button", { name: /^Switch node label to/ }));
    const menu = await screen.findByRole("menu");
    const current = menu.querySelector('[aria-current="true"]')?.textContent.trim() ?? "";
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
        assert.isNull(screen.queryByRole("menu"));
    });
    return current;
}

/**
 * How many nodes graphty-element draws with a glyph.
 * @param session - the session.
 * @returns the count.
 */
function glyphsDrawn(session: GraphSession): number {
    return session.styles
        .drawnValues("node.glyph")
        .filter((each) => typeof each.value === "string" && each.value !== "")
        .reduce((sum, each) => sum + each.count, 0);
}

describe("a node's Label is Text or Glyph", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("the Text '+' offers no Glyph of its own", async () => {
        await openProject();
        const tab = await openStyle("Key people");
        await userEvent.click(within(sectionOf(tab, "node-text")).getByRole("button", { name: /^Add to node text/ }));
        const menu = await screen.findByRole("menu");
        const items = within(menu)
            .getAllByRole("menuitem")
            .map((item) => item.textContent.trim());
        assert.include(items, "Label");
        assert.notInclude(items, "Glyph");
        await userEvent.keyboard("{Escape}");
    });

    it("every line of the Label's pop-over, Text and Glyph, shows its name or a tooltip (E269, E106)", async () => {
        const { session, nodes } = await openGraph();
        await session.styles.update(nodes, { set: { "node.label": "Hi" } });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        for (const kind of ["Text", "Glyph"]) {
            if ((await kindOf(await labelRow(tab))) !== kind) {
                await switchTo(await labelRow(tab), kind);
            }
            await userEvent.click(within(await labelRow(tab)).getByRole("button", { name: /^Node label settings/ }));
            const pop = await screen.findByRole("dialog");
            const lines = [...pop.querySelectorAll<HTMLElement>(".ws-row[data-line]")].filter((line) =>
                line.checkVisibility(),
            );
            assert.isNotEmpty(lines, `${kind}'s pop-over has lines`);
            // A typed value is no name: an input's value is not in its line's visible words.
            assert.deepEqual(
                lines.filter((line) => line.innerText.trim() === "" && line.title === "").map((l) => l.dataset.line),
                [],
                `${kind}: every line is named or has a tooltip`,
            );
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.isNull(screen.queryByRole("dialog"));
            });
        }
    });

    it("switching a Label to Glyph and typing a character draws it, with the text's color; Undo brings the text back", async () => {
        const { session, element, nodes } = await openGraph();
        await session.styles.update(nodes, {
            set: { "node.color": "#E8590C", "node.label": "Hi", "node.labelStyle": { color: "#1971C2" } },
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const row = await labelRow(tab);
        assert.equal(await kindOf(row), "Text");
        const before = await picture(element);

        await switchTo(row, "Glyph");
        await waitFor(() => {
            assert.isUndefined(written(session, nodes, "node.label"), "the text is off");
            assert.equal(written(session, nodes, "node.glyphColor"), "#1971C2", "the color moved to the glyph");
        });
        const glyphRow = await labelRow(tab);
        assert.equal(await kindOf(glyphRow), "Glyph");
        const field = await waitFor(() => {
            const found = glyphRow.querySelector<HTMLInputElement>('.ws-row[data-line="node.glyph"] input');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(field);
        await userEvent.keyboard("A{Enter}");
        await waitFor(() => {
            assert.equal(written(session, nodes, "node.glyph"), "A");
        });
        await session.styles.settled();
        assert.equal(glyphsDrawn(session), 3, "every node draws the glyph");
        assert.isAbove(pixelsApart(before, await picture(element)), 0, "the graph changed");

        const undo = screen.getByRole("button", { name: /^Undo( |$)/ });
        await userEvent.click(undo);
        await userEvent.click(undo);
        await waitFor(() => {
            assert.equal(written(session, nodes, "node.label"), "Hi", "Undo brings the text back");
            assert.isUndefined(written(session, nodes, "node.glyph"));
            assert.isUndefined(written(session, nodes, "node.glyphColor"));
        });
        assert.equal(await kindOf(await labelRow(tab)), "Text");
    });

    it("a file writing a glyph opens as one Label row of kind Glyph, its character shown and drawn", async () => {
        const { session } = await openProject();
        await session.data.import(
            {
                type: "json",
                name: "icons.json",
                config: {
                    data: JSON.stringify({
                        nodes: [
                            { id: "i", x: 0, y: 0, shape: "icon", icon: { code: "A", color: "#1f77b4" } },
                            { id: "j", x: 80, y: 0, shape: "icon", icon: { code: "A", color: "#1f77b4" } },
                        ],
                        edges: [],
                        options: { physics: false },
                    }),
                },
            },
            { styles: "file" },
        );
        await session.styles.settled();
        assert.isAbove(glyphsDrawn(session), 0, "graphty-element draws the file's glyphs");
        const layer = session.styles
            .list()
            .find((each) => session.styles.get(each.id)?.set?.["node.glyph"] !== undefined);
        assert.isDefined(layer, "a layer writes the glyph");
        const tab = await openStyle(layer?.name ?? "");
        const text = sectionOf(tab, "node-text");
        await waitFor(() => {
            assert.lengthOf(text.querySelectorAll('[data-thing="label"]'), 1, "one Label row");
        });
        assert.isNull(text.querySelector('[data-thing="glyph"]'), "no Glyph row of its own");
        const row = await labelRow(tab);
        assert.equal(await kindOf(row), "Glyph");
        const field = row.querySelector<HTMLInputElement>('.ws-row[data-line="node.glyph"] input');
        assert.equal(field?.value, "A", "the row shows the character");
        // Drawn in the picture: another character typed into the row repaints the nodes.
        const element = document.querySelector("graphty-element");
        if (element === null || field === null) {
            throw new Error("no element or field");
        }
        const before = await picture(element);
        await userEvent.click(field);
        await userEvent.clear(field);
        await userEvent.keyboard("W{Enter}");
        await waitFor(() => {
            assert.equal(session.styles.get(layer?.id ?? "")?.set?.["node.glyph"], "W");
        });
        await session.styles.settled();
        assert.isAbove(pixelsApart(before, await picture(element)), 0, "the glyph is drawn: its character shows");
    });
});
