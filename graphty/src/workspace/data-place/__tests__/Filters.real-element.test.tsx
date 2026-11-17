/**
 * Filter cards on the REAL graphty-element (design/ui/selection-groups/spec.md, section 3.3): every
 * card is one of the element's filter conditions (`visibility.conditions`) and says what stays,
 * All nodes (or edges) narrowed by Keep and Except, with no effect word; one card is open, every
 * other is one row of on box, name and count; its box switches it; its "..." holds Select N,
 * Duplicate and Delete; and every change is one undo step. Driven by real clicks and keys only.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { columnVerb } from "../../../test/column-header";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { GRAPH_FILE_GML } from "../fixtures";

// Every experiment stays off here.
withFeatures([]);

/**
 * Renders the workspace on the Data place, waits for the session and loads the small graph file
 * (8 nodes, 9 edges; edge `value` 9 or more on 4 edges whose ends are 5 nodes).
 * @returns the session and the chrome store.
 */
async function openWithGraph(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: GRAPH_FILE_GML } });
    return { session, store };
}

/**
 * The Filters list in the Data place.
 * @returns the list.
 */
const filters = (): HTMLElement =>
    within(screen.getByRole("region", { name: "Data place" })).getByRole("list", { name: "Filters" });

/**
 * One card, by its name.
 * @param name - its name.
 * @returns queries inside it.
 */
async function card(name: RegExp): Promise<ReturnType<typeof within>> {
    // The card itself, never a group inside it (an open card's step pane is a group too).
    const found = await waitFor(() => {
        const each = [...filters().querySelectorAll<HTMLElement>(":scope > li > [role=group]")].find((group) =>
            name.test(group.getAttribute("aria-label") ?? ""),
        );
        assert.isDefined(each);
        return each;
    });
    return within(found);
}

/**
 * Opens a new card on the edge column `value` from its header's Filter to..., types 9 in From and
 * commits it with Enter, and Done writes the card.
 * @param session - the element's session.
 */
async function addValueCard(session: GraphSession): Promise<void> {
    await columnVerb("edge", "value", "Filter to...");
    // A new card's step is edited in the selection workspace (selection spec 3.0), written on Done.
    const from = await screen.findByRole("textbox", { name: "value from, number" });
    await userEvent.clear(from);
    await userEvent.type(from, "9{Enter}");
    await userEvent.click(within(await workspace()).getByRole("button", { name: "Done" }));
    await waitFor(() => {
        assert.lengthOf(session.visibility.conditions, 1);
    });
}

/**
 * The open selection workspace (selection spec 3.0), waited for.
 * @returns it.
 */
async function workspace(): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        return found;
    });
}

/**
 * The first condition's selection.
 * @param session - the element's session.
 * @returns the union rule, or undefined.
 */
function unionOf(session: GraphSession): UnionLeaf | undefined {
    const rule = session.visibility.conditions[0]?.rule;
    return rule?.kind === "union" ? rule : undefined;
}

describe("Filter cards on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("Filter to... opens a card as All + Keep; its first value writes it as one step; it reads no effect word", async () => {
        const { session, store } = await openWithGraph();
        const before = session.history.position;
        await addValueCard(session);
        assert.equal(store.get().place, "data");
        assert.equal(session.history.position, before + 1, "one undo step");
        const rule = unionOf(session);
        assert.equal(rule?.side, "edges");
        assert.equal(rule?.branches[0]?.start, "all");
        assert.equal(rule?.branches[0]?.steps[0]?.op, "keep");
        assert.equal(session.visibility.conditions[0]?.effect, "keep");
        assert.equal(session.visibility.summary.visibleEdges, 4);
        for (const word of ["Select", "Filter to", "Filter out"]) {
            assert.isNull(within(filters()).queryByText(word), word);
        }
        await screen.findByRole("button", { name: /^Filter: / });
    });

    it("the header chip's x switches every hiding card off in one step; Undo turns them back on", async () => {
        const { session } = await openWithGraph();
        await addValueCard(session);
        await session.visibility.addCondition({ effect: "keep", rule: { kind: "member", of: "largest-component" } });
        const before = session.history.position;
        await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
        await waitFor(() => {
            assert.isTrue(session.visibility.conditions.every((c) => !c.on));
        });
        assert.equal(session.history.position, before + 1);
        assert.lengthOf(session.visibility.conditions, 2, "cards are kept, off");
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.isTrue(session.visibility.conditions.every((c) => c.on));
        });
    });

    it("a card beside another filter says how many of its matches are shown", async () => {
        const { session } = await openWithGraph();
        await session.visibility.addCondition({ effect: "keep", rule: { kind: "degree", min: 3 } });
        await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "text", reads: "data.label", mode: "substring", text: "e" },
        });
        // Its count reads the whole graph (a filter's own conditions do); the degree card hides some
        // of what it matches, and the card says how many of its matches a reader can see.
        const label = session.data.nodes({ scope: "graph" }).filter((node) => String(node.label).includes("e"));
        const visible = new Set([...session.visibility.nodes].map(String));
        const shown = label.filter((node) => visible.has(String(node.id)));
        assert.isBelow(shown.length, label.length, "the degree card hides some of them");
        const resting = await card(/label/);
        await waitFor(() => {
            assert.isNotNull(resting.getByText(`${String(label.length)} of 8, ${String(shown.length)} shown`));
        });
    });

    it("a saved keep card on an edge value stays read-only, so no edit brings back the nodes it hid", async () => {
        const { session } = await openWithGraph();
        await session.visibility.addCondition({
            id: "heavy",
            effect: "keep",
            rule: { kind: "range", attribute: "data.value", min: 9 },
        });
        await waitFor(() => {
            assert.equal(session.visibility.summary.visibleNodes, 5);
        });
        const kept = await card(/value/);
        await userEvent.click(kept.getAllByRole("button")[0] ?? document.body);
        await waitFor(() => {
            assert.isNotNull(within(filters()).queryByRole("button", { name: "Delete" }), "its read-only body");
        });
        assert.isNull(filters().querySelector(".sel-editor"), "no editor that would write it as an edges selection");
        assert.equal(session.visibility.summary.visibleNodes, 5);
    });
});
