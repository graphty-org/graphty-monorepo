/**
 * A node's Label is Text or Glyph, picked from its row (owner, 2026-11-19: "glyph seems duplicative to
 * label"), on the REAL graphty-element and real input: the Text "+" offers no Glyph; a Label switched to Glyph
 * from the Kind select in its "..." settings and given a character draws it, its color moved from the text; Undo brings the text back;
 * and a file whose styles write a glyph (a vis-network icon node, through graph-io) opens as one Label row of
 * kind Glyph showing its character, drawn on the graph. A vis-network file stands in for the plan's Cytoscape.js
 * one: graph-io's Cytoscape.js styles write no node.glyph (Cytoscape.js has no glyph), vis-network's icons do.
 * Every line of the Label's pop-over, of either kind, shows its name or a tooltip (E269). Changing the kind in the
 * pop-over keeps it open on the new kind's settings, and a Glyph starts with a letter and shows its font.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import {
    closeSettings,
    kindOf,
    openGraph,
    openGroup,
    openProject,
    openStyle,
    pickKind,
    picture,
    pixelsApart,
    sectionOf,
    written,
} from "./v2Harness";

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

/** The Label row's "..." settings button, of either kind. */
const LABEL_SETTINGS = /^Node (label|glyph) settings/;

/**
 * Picks a kind from the Kind select in the row's "..." settings, and closes the settings.
 * @param row - the row.
 * @param kind - the kind's name.
 */
async function switchTo(row: HTMLElement, kind: string): Promise<void> {
    await pickKind(row, LABEL_SETTINGS, kind);
    await closeSettings();
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
        for (const kind of ["Default", "Glyph"]) {
            if ((await kindOf(await labelRow(tab), LABEL_SETTINGS)) !== kind) {
                await switchTo(await labelRow(tab), kind);
            }
            await userEvent.click(
                within(await labelRow(tab)).getByRole("button", { name: /^Node (label|glyph) settings/ }),
            );
            const pop = await screen.findByRole("dialog");
            const lines = [...pop.querySelectorAll<HTMLElement>(".ws-row[data-line]")].filter((line) =>
                line.checkVisibility(),
            );
            assert.isNotEmpty(lines, `${kind}'s pop-over has lines`);
            // A typed value is no name: an input's value is not in its line's visible words. The font style toggles
            // (R7t) name themselves, each in its hover tooltip, and a swatch named only "Color" says it is a color:
            // neither carries a name above it (owner, 2026-11-24).
            assert.deepEqual(
                lines
                    .filter(
                        (line) =>
                            line.innerText.trim() === "" &&
                            line.title === "" &&
                            !line.matches('[data-rule="R7t"]') &&
                            line.querySelector("[data-font-style], .cm-paint") === null,
                    )
                    .map((l) => l.dataset.line),
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
        assert.equal(await kindOf(row, LABEL_SETTINGS), "Default");
        const before = await picture(element);

        await switchTo(row, "Glyph");
        await waitFor(() => {
            assert.isUndefined(written(session, nodes, "node.label"), "the text is off");
            assert.equal(written(session, nodes, "node.glyphColor"), "#1971C2", "the color moved to the glyph");
        });
        const glyphRow = await labelRow(tab);
        assert.equal(await kindOf(glyphRow, LABEL_SETTINGS), "Glyph");
        const field = await waitFor(() => {
            const found = glyphRow.querySelector<HTMLInputElement>('.ws-row[data-line="node.glyph"] input');
            assert.isNotNull(found);
            return found;
        });
        // The row says what it is and what its box takes (E269): named Glyph, its tooltip "Character or icon".
        const line = field.closest<HTMLElement>('.ws-row[data-line="node.glyph"]');
        assert.include(line?.innerText ?? "", "Glyph", "the row is named by its kind");
        assert.notInclude(line?.innerText ?? "", "Label", "not by the Text kind's name");
        assert.match(
            field.closest<HTMLElement>("[title]")?.title ?? "",
            /character/i,
            "its tooltip names the character",
        );
        // Its buttons name the Glyph too, so a screen reader hears what the row shows.
        for (const name of [/^Node glyph settings/, "Remove node glyph"]) {
            assert.isNotNull(within(glyphRow).queryByRole("button", { name }), String(name));
        }
        assert.isNull(within(glyphRow).queryByRole("button", { name: /node label/i }), "no button says label");
        // The Glyph starts as graphty-element's starting letter, so the box is never empty.
        await waitFor(() => {
            assert.equal(written(session, nodes, "node.glyph"), "A");
            assert.equal(field.value, "A");
        });
        await userEvent.fill(field, "B");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.equal(written(session, nodes, "node.glyph"), "B");
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
        assert.equal(await kindOf(await labelRow(tab), LABEL_SETTINGS), "Default");
    });

    it("changing a Label's kind keeps its pop-over open on the new kind, and a Glyph shows its letter and font", async () => {
        const { session, nodes } = await openGraph();
        await session.styles.update(nodes, { set: { ...session.styles.get(nodes)?.set, "node.label": "Hi" } });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const settings = within(await labelRow(tab)).getByRole("button", { name: LABEL_SETTINGS });
        await userEvent.click(settings);
        const panelOf = async (): Promise<HTMLElement> =>
            waitFor(() => {
                const found = document.querySelector<HTMLElement>("[data-thing-popover]");
                assert.isNotNull(found, "the pop-over is open");
                return found;
            });
        // A text's presets are its Preset line, under the Text and Glyph tabs (design "Input rules", "Tabs").
        for (const look of ["Card", "Pill"]) {
            await userEvent.click(await within(await panelOf()).findByRole("combobox", { name: "Preset" }));
            await userEvent.click(within(await screen.findByRole("listbox")).getByRole("option", { name: look }));
            await waitFor(async () => {
                const box = await within(await panelOf()).findByRole<HTMLInputElement>("combobox", { name: "Preset" });
                assert.equal(box.value, look, `the pop-over stays open, on ${look}`);
            });
        }
        const glyphTab = within(await panelOf()).getByRole<HTMLInputElement>("radio", { name: "Glyph" });
        await userEvent.click(document.querySelector<HTMLElement>(`label[for="${glyphTab.id}"]`) ?? glyphTab);
        await waitFor(async () => {
            const tabNow = within(await panelOf()).getByRole<HTMLInputElement>("radio", { name: "Glyph" });
            assert.isTrue(tabNow.checked, "the pop-over stays open, on Glyph");
        });
        const pop = await panelOf();
        const glyph = within(pop).getByRole<HTMLInputElement>("textbox", { name: "Node glyph" });
        assert.equal(glyph.value, "A", "the glyph shows its letter");
        // At most 6 lines tall (owner's input rules): the tabs, Glyph, Size, Color; its Letters group beside.
        const tops = new Set(
            [...pop.querySelectorAll<HTMLElement>(".ws-row, .ws-member")]
                .filter((line) => line.parentElement?.closest(".ws-row") === null && line.checkVisibility())
                .map((line) => Math.round(line.getBoundingClientRect().top)),
        );
        assert.isAtMost(tops.size, 6, "the Glyph pop-over is 6 lines tall at most");
        const advanced = await openGroup(pop);
        const font = within(advanced).getByRole<HTMLInputElement>("combobox", { name: "Node glyph font" });
        assert.equal(font.value, "Sans serif", "the font shows what an unset glyph is drawn in");
        // One path to the weight (#10380): the Letters group's Weight line, no Bold toggle.
        within(advanced).getByRole("combobox", { name: /weight/i });
        assert.isNull(within(pop).queryByRole("button", { name: "Bold" }), "no Bold toggle");
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
        assert.equal(await kindOf(row, LABEL_SETTINGS), "Glyph");
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
