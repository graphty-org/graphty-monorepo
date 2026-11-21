/**
 * Several labels per node in Style panel v2 (ledger E234, E265), on the REAL graphty-element and real input: the
 * Text "+" Label adds a further label once one is drawn, as an entry of `node.labels` with an id from
 * `styles.newLabelId`; it is its own row with its own source and settings; the two rows read "Node id, above"
 * while they share a source and sit in one place; moving the further label below draws a second label; and a
 * Hubs layer over one node, which sets no label, picks that label from its own Text "+" and restyles it by id,
 * by real clicks alone, without touching the other label.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { LabelEntry } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openGraph, openStyle, picture, pixelsApart, sectionOf, written } from "./v2Harness";

/**
 * The further labels one layer writes.
 * @param session - the session.
 * @param id - the layer.
 * @returns its `node.labels` entries.
 */
function entries(session: GraphSession, id: string): readonly LabelEntry[] {
    const value = written(session, id, "node.labels");
    return Array.isArray(value) ? (value as readonly LabelEntry[]) : [];
}

/**
 * Clicks the Text section's "+" and its Label item, then picks Node id from the source list that opens.
 * @param tab - the Style tab.
 * @param list - the source list's name ("Node label", "Node label 2").
 */
async function addLabel(tab: HTMLElement, list: string): Promise<void> {
    await userEvent.click(within(sectionOf(tab, "node-text")).getByRole("button", { name: /^Add to node text/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Label" }));
    const options = await screen.findByRole("group", { name: list });
    await userEvent.click(await within(options).findByRole("option", { name: /^Node id(,|$)/ }));
}

/**
 * The row of a further label.
 * @param tab - the Style tab.
 * @param id - its id.
 * @returns the row.
 */
async function entryRow(tab: HTMLElement, id: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = sectionOf(tab, "node-text").querySelector<HTMLElement>(`[data-label-entry="${id}"]`);
        assert.isNotNull(found);
        return found;
    });
}

/**
 * The pixels two pictures of one size differ in: how many, and the mean row they sit on.
 * @param a - a picture.
 * @param b - another.
 * @returns the count and mean row.
 */
function changedRows(a: ImageData, b: ImageData): { count: number; meanY: number } {
    let count = 0;
    let rows = 0;
    for (let i = 0; i < a.data.length; i += 4) {
        if ([0, 1, 2].some((c) => Math.abs((a.data[i + c] ?? 0) - (b.data[i + c] ?? 0)) > 1)) {
            count++;
            rows += Math.floor(i / 4 / a.width);
        }
    }
    return { count, meanY: count === 0 ? 0 : rows / count };
}

describe("several labels per node", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("adds a second label, puts it below the first, draws both, and a Hubs layer restyles it by id", async () => {
        const { session, element, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        await session.styles.settled();
        const zero = await picture(element);
        await addLabel(tab, "Node label");
        await waitFor(() => {
            assert.isDefined(session.styles.get(nodes)?.encode?.["node.label"], "the first label reads Node id");
        });
        await session.styles.settled();
        const one = await picture(element);

        // "+" Label again: a further label, its id the element's.
        const expected = session.styles.newLabelId(nodes);
        await addLabel(tab, "Node label 2");
        await waitFor(() => {
            assert.deepEqual(
                entries(session, nodes).map((entry) => entry.id),
                [expected],
                "the second label is an entry of node.labels",
            );
            assert.isDefined(
                session.styles.get(nodes)?.encode?.[`node.labels.${expected}.text`],
                "its words read Node id through its own address",
            );
        });
        // The legend tells the two text bindings apart by their encode keys.
        assert.isTrue(
            session.styles.legend().some((block) => block.address === `node.labels.${expected}.text`),
            "the legend names the further label's binding by its address",
        );
        const row = await entryRow(tab, expected);
        // Two labels of one source in one place say where each sits.
        await waitFor(() => {
            assert.isNotNull(within(row).queryByRole("button", { name: "Node label 2 source, Node id, above" }));
            assert.isNotNull(
                within(sectionOf(tab, "node-text")).queryByRole("button", {
                    name: "Node label source, Node id, above",
                }),
            );
        });

        // Below the node, from its own settings.
        await userEvent.click(within(row).getByRole("button", { name: /^Node label 2 settings/ }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        const location = await waitFor(() => {
            const found = pop.querySelector<HTMLElement>(`.ws-row[data-line="node.labels.${expected}.location"]`);
            assert.isNotNull(found);
            return found;
        });
        // A segment's radio is hidden; the reader clicks the segment that labels it.
        const outside = within(location).getByRole("radio", { name: "Outside" });
        const segment = location.querySelector<HTMLElement>(`label[for="${outside.id}"]`);
        assert.isNotNull(segment);
        await userEvent.click(segment);
        await userEvent.click(await within(location).findByRole("radio", { name: /^Below$/ }));
        await waitFor(() => {
            assert.equal(entries(session, nodes)[0]?.style?.location, "bottom", "the second label sits below");
            assert.isUndefined(
                (written(session, nodes, "node.labelStyle") as { location?: string } | undefined)?.location,
                "the first label stays where it was",
            );
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNotNull(within(row).queryByRole("button", { name: "Node label 2 source, Node id, below" }));
        });
        await session.styles.settled();
        const two = await picture(element);
        // Each label's letters change the picture; the second's sit lower than the first's, at every node.
        const first = changedRows(zero, one);
        const second = changedRows(one, two);
        assert.isAbove(first.count, 0, "the first label is drawn");
        assert.isAbove(second.count, 0, "the second label is drawn");
        assert.isAbove(second.meanY, first.meanY, "the second label is drawn below the first");

        // A Hubs layer over node a, which sets no label: its Text "+" offers the label Key people added, by number.
        const hubs = await session.styles.add({
            name: "Hubs",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.color": "#00ff00" },
        });
        await session.styles.settled();
        const hubTab = await openStyle("Hubs");
        assert.isNull(sectionOf(hubTab, "node-text").querySelector(`[data-label-entry="${expected}"]`));
        await userEvent.click(
            within(sectionOf(hubTab, "node-text")).getByRole("button", { name: /^Add to node text/ }),
        );
        // Named by what it draws, as its row reads it.
        const offered = await screen.findByRole("menuitem", { name: /^Label 2/ });
        assert.include(offered.textContent, "Node id", "the item says what the label draws");
        await userEvent.click(offered);
        const hubRow = await entryRow(hubTab, expected);
        // It reads the words Key people gives it, so no source list opens.
        await waitFor(() => {
            assert.isNotNull(within(hubRow).queryByRole("button", { name: /^Node label 2 source, Node id/ }));
        });
        await userEvent.click(within(hubRow).getByRole("button", { name: /^Node label 2 settings/ }));
        const hubPop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        const color = await waitFor(() => {
            const found = hubPop.querySelector<HTMLElement>(`.ws-row[data-line="node.labels.${expected}.color"]`);
            assert.isNotNull(found);
            return found;
        });
        await session.styles.settled();
        const before = await picture(element);
        await userEvent.click(within(color).getByRole("textbox"));
        await userEvent.keyboard("{Control>}a{/Control}FF0000{Enter}");
        await waitFor(() => {
            const hub = entries(session, hubs.id);
            assert.deepEqual(
                hub.map((entry) => ({ ...entry, style: { color: String(entry.style?.color).toUpperCase() } })),
                [{ id: expected, style: { color: "#FF0000" } }],
                "Hubs writes only the label's id and its new color",
            );
            assert.isUndefined(written(session, hubs.id, "node.labelStyle"), "nor the first label's style");
            assert.isUndefined(session.styles.get(hubs.id)?.encode?.[`node.labels.${expected}.text`], "nor its words");
        });
        await userEvent.keyboard("{Escape}");
        await session.styles.settled();
        assert.isAbove(pixelsApart(before, await picture(element)), 0, "the hub's second label is redrawn red");
    });
});
