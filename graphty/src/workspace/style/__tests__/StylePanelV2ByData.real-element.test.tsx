/**
 * Every Style panel v2 line binds by data from its own by-data link (design 2.6, E551: "by data under a settings
 * menu"; no separate By data line), on the REAL graphty-element and real clicks: a reader binds a node border's
 * width and a node label's size to Degree from their lines' links, and the nodes take different sizes.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { findValuePicker, screen, waitFor, within } from "../../../test/test-utils";
import { LABEL_RUBRIC, varyingFields } from "../v2/labelRubric";
import { showKind } from "./kindTab";
import { openGraph, openStyle, picture, pixelsApart, sectionOf } from "./v2Harness";

/** Every text kind: its row, its label style and what the layer holds for it to draw. */
const TEXT_KINDS = [
    { side: "node", thing: "label", style: "node.labelStyle", set: { "node.label": "Hello" } },
    { side: "node", thing: "xlabel", style: "node.xlabelStyle", set: { "node.xlabel": "Hello" } },
    { side: "node", thing: "tooltip", style: "node.tooltipStyle", set: { "node.tooltip": "Hello" } },
    { side: "edge", thing: "label", style: "edge.labelStyle", set: { "edge.label": "Hello" } },
    { side: "edge", thing: "xlabel", style: "edge.xlabelStyle", set: { "edge.xlabel": "Hello" } },
    { side: "edge", thing: "tooltip", style: "edge.tooltipStyle", set: { "edge.tooltip": "Hello" } },
    {
        side: "edge",
        thing: "endCaption",
        style: "edge.arrowHeadTextStyle",
        set: { "edge.arrowHead": "normal", "edge.arrowHeadText": "Hello" },
    },
    {
        side: "edge",
        thing: "endCaption",
        style: "edge.arrowTailTextStyle",
        set: { "edge.arrowTail": "normal", "edge.arrowTailText": "Hello" },
    },
] as const;

/**
 * The distinct values graphty-element paints a channel at, over every node.
 * @param session - the session.
 * @param channel - the channel.
 * @param field - a field of it (a label style's), when not the whole value.
 * @returns the values.
 */
function painted(session: GraphSession, channel: string, field?: string): Set<string> {
    return new Set(
        session.data.nodes().map((n) => {
            const value = (session.styles.explain({ node: n.id }).merged as Record<string, unknown>)[channel];
            return JSON.stringify(
                field === undefined ? value : (value as Record<string, unknown> | undefined)?.[field],
            );
        }),
    );
}

/**
 * Clicks a line's by-data link and picks Degree.
 * @param root - where the link is.
 * @param name - the link's name.
 */
async function bindToDegree(root: HTMLElement, name: string): Promise<void> {
    await userEvent.click(await within(root).findByRole("button", { name }));
    await userEvent.click(within(await findValuePicker()).getByRole("option", { name: /^Degree(,|$)/ }));
}

describe("Style panel v2's by-data links", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("a pop-over has no By data line, Main starts with the main value, and binding border width and label size to Degree draws different sizes", async () => {
        const { session, element, nodes } = await openGraph();
        const { runId } = await session.runs.start("degree");
        await session.styles.update(nodes, {
            set: { "node.borderColor": "#111111", "node.borderWidth": 0.1, "node.label": "{id}" },
        });
        await session.styles.settled();
        const path = session.results.path(runId);
        const tab = await openStyle("Key people");

        // The border's pop-over: its first line is its main value, with its own link; no By data line.
        await userEvent.click(within(tab).getByRole("button", { name: "Node border settings" }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        assert.notInclude(pop.textContent, "By data", "no separate By data line");
        const first = pop.querySelector<HTMLElement>(".ws-row[data-line]");
        assert.equal(first?.dataset.line, "node.borderColor", "Main starts with the main value");
        assert.isNotNull(
            first === null ? null : within(first).queryByRole("button", { name: "Node border color by attribute" }),
            "the main value's line has its link",
        );
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector("[data-thing-popover]"));
        });

        await bindToDegree(tab, "Node border width by attribute");
        await waitFor(() => {
            const bound = session.styles.get(nodes)?.encode?.["node.borderWidth"];
            assert.equal(bound !== undefined && "by" in bound ? bound.by : undefined, path);
            assert.isAbove(painted(session, "node.borderWidth").size, 1, "the borders take different widths");
        });

        const before = await picture(element);
        await bindToDegree(tab, "Node label size by attribute");
        await waitFor(() => {
            const bound = session.styles.get(nodes)?.encode?.["node.labelSize"];
            assert.equal(bound !== undefined && "by" in bound ? bound.by : undefined, path);
            // A label field's own channel lands in its label style (`merged` is what the canvas draws).
            assert.isAbove(painted(session, "node.labelStyle", "sizePx").size, 1, "the labels take different sizes");
        });
        // Bound, each line shows its column, and the picture changed.
        await waitFor(() => {
            assert.lengthOf(
                within(screen.getByTestId("style-tab")).queryAllByText("Degree"),
                2,
                "both lines read Degree",
            );
        });
        assert.isAbove(pixelsApart(before, await picture(element)), 0, "the labels drew at their new sizes");
    });

    for (const kind of TEXT_KINDS) {
        it(`every ${kind.style} line whose field has its own channel carries its by-data link`, async () => {
            const { session, nodes, edges } = await openGraph();
            const layer = kind.side === "node" ? nodes : edges;
            await session.styles.update(layer, { set: { ...session.styles.get(layer)?.set, ...kind.set } });
            await session.styles.settled();
            const tab = await openStyle(kind.side === "node" ? "Key people" : "Links");
            await showKind(kind.side);
            const section = sectionOf(tab, `${kind.side}-text`);
            // A caption's row holds both ends' captions; its own is the one whose lines name its style.
            const row = await waitFor(() => {
                const found = [...section.querySelectorAll<HTMLElement>(`[data-thing="${kind.thing}"]`)].find(
                    (each) => each.querySelector(`[data-line^="${kind.style}."]`) !== null,
                );
                assert.isDefined(found, `${kind.style} row`);
                return found;
            });
            await userEvent.click(
                within(row)
                    .getAllByRole("button", { name: / settings$/ })
                    .at(-1) ?? row,
            );
            const pop = await waitFor(() => {
                const found = document.querySelector<HTMLElement>("[data-thing-popover]");
                assert.isNotNull(found);
                return found;
            });
            // Every sub-group shown, by real clicks on its "+".
            for (const group of LABEL_RUBRIC.groups) {
                if (within(pop).queryByRole("group", { name: group.name }) === null) {
                    await userEvent.click(within(pop).getByRole("button", { name: /^Add to .* settings$/ }));
                    await userEvent.click(await screen.findByRole("menuitem", { name: group.name }));
                    await within(pop).findByRole("group", { name: group.name });
                }
            }
            const varying = varyingFields(kind.side, kind.style);
            assert.isAbove(varying.size, 0, "the kind has fields that vary");
            const met = new Set<string>();
            for (const line of [
                ...LABEL_RUBRIC.common,
                ...LABEL_RUBRIC.main,
                ...LABEL_RUBRIC.groups.flatMap((g) => g.lines),
            ]) {
                const fields = [line.field, ...(line.units ?? []), ...(line.pair === undefined ? [] : [line.pair])];
                const linked = fields.filter((field) => varying.has(field));
                if (linked.length === 0 || line.unit !== undefined) {
                    continue;
                }
                const drawn = [row, pop]
                    .map((root) => root.querySelector<HTMLElement>(`.ws-row[data-line="${kind.style}.${line.field}"]`))
                    .filter((each) => each !== null);
                assert.isNotEmpty(drawn, `${kind.style}.${line.field} has a line`);
                for (const each of drawn) {
                    assert.isNotNull(
                        each.querySelector('button[aria-label$=" by attribute"]'),
                        `${kind.style}.${line.field}'s line carries its link`,
                    );
                }
                if (line.pair !== undefined && linked.includes(line.pair)) {
                    // A pair's link binds either value: its list opens with the choice of which.
                    const [inPop] = drawn.filter((each) => pop.contains(each));
                    await userEvent.click(within(inPop).getByRole("button", { name: / by attribute$/ }));
                    const choice = await screen.findByRole("radiogroup", { name: "Which value" });
                    assert.lengthOf(within(choice).getAllByRole("radio"), 2, `${line.field}'s pair offers both values`);
                    await userEvent.keyboard("{Escape}");
                    await waitFor(() => {
                        assert.isNull(screen.queryByRole("radiogroup", { name: "Which value" }));
                    });
                }
                for (const field of linked) {
                    met.add(field);
                }
            }
            assert.sameMembers([...met], [...varying], "every varying field's line was met with its link");
        });
    }

    it("a further label's line binds its field at its address in the list, and its line then reads the column", async () => {
        const { session, element, nodes } = await openGraph();
        const { runId } = await session.runs.start("degree");
        await session.styles.update(nodes, {
            set: {
                ...session.styles.get(nodes)?.set,
                "node.label": "{id}",
                "node.labels": [{ id: "second", text: "Hi" }],
            },
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const row = await waitFor(() => {
            const found = sectionOf(tab, "node-text").querySelector<HTMLElement>('[data-label-entry="second"]');
            assert.isNotNull(found);
            return found;
        });
        const line = await waitFor(() => {
            const found = row.querySelector<HTMLElement>('.ws-row[data-line="node.labels.second.color"]');
            assert.isNotNull(found);
            return found;
        });
        const before = await picture(element);
        await bindToDegree(line, "Node label color by attribute");
        const address = "node.labels.second.color";
        await waitFor(() => {
            const bound = (
                session.styles.get(nodes)?.encode as Record<string, { by?: string } | undefined> | undefined
            )?.[address];
            assert.equal(bound?.by, session.results.path(runId), "the field is bound at its address");
            assert.isUndefined(session.styles.get(nodes)?.encode?.["node.labelColor"], "the main label is untouched");
        });
        await waitFor(() => {
            const bound = row.querySelector<HTMLElement>(`.ws-row[data-line="${address}"]`);
            assert.isNotNull(bound);
            assert.isNotNull(within(bound).queryByText("Degree"), "the line reads its column");
        });
        assert.isAbove(pixelsApart(before, await picture(element)), 0, "the second labels drew in new colors");
        // Its minus stops it varying.
        const bound = row.querySelector<HTMLElement>(`.ws-row[data-line="${address}"]`);
        assert.isNotNull(bound);
        await userEvent.click(within(bound).getByRole("button", { name: /^Remove / }));
        await waitFor(() => {
            assert.isUndefined(
                (session.styles.get(nodes)?.encode as Record<string, unknown> | undefined)?.[address],
                "the binding is gone",
            );
        });
    });
});
