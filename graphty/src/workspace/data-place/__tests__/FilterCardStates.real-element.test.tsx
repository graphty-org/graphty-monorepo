/**
 * Filter cards in states a reader reaches less often, on the REAL graphty-element: two cards that
 * together leave nothing say "Passes none" on the section's header; a card switched off says so on
 * its row and Clear filters leaves it off; a saved Select card hides nothing, counts all of its side
 * as staying, opens read-only in its own words and its Delete removes it; and a card whose column is
 * not in the graph shows the hidden column mark instead of a count. Driven by real clicks only.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, type Within, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { GRAPH_FILE_GML } from "../fixtures";

// Every experiment stays off here.
withFeatures([]);

/**
 * Renders the workspace on the Data place and loads the small graph file (8 nodes, 9 edges; three
 * nodes of degree 3 or more).
 * @returns the session.
 */
async function openWithGraph(): Promise<GraphSession> {
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
    return session;
}

/**
 * The Filters list in the Data place.
 * @returns the list.
 */
const filters = (): HTMLElement =>
    within(screen.getByRole("region", { name: "Data place" })).getByRole("list", { name: "Filters" });

/**
 * One card, by its accessible name, waited for.
 * @param name - its name.
 * @returns the card's element.
 */
async function cardElement(name: RegExp): Promise<HTMLElement> {
    return waitFor(() => {
        const each = [...filters().querySelectorAll<HTMLElement>(":scope > li > [role=group]")].find((group) =>
            name.test(group.getAttribute("aria-label") ?? ""),
        );
        assert.isDefined(each);
        return each;
    });
}

/**
 * One card, by its accessible name.
 * @param name - its name.
 * @returns queries inside it.
 */
async function card(name: RegExp): Promise<Within> {
    return within(await cardElement(name));
}

/**
 * The Filters section's header count, drawn while two or more hiding cards are on.
 * @returns its text, or null when it is not drawn.
 */
const together = (): string | null =>
    screen.getByRole("region", { name: "Data place" }).querySelector("[data-filters-count]")?.textContent ?? null;

describe("Filter cards in their less common states", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("two cards that leave nothing read Passes none; one switched off says off and Clear filters leaves it off", async () => {
        const session = await openWithGraph();
        await session.visibility.addCondition({ id: "busy", effect: "keep", rule: { kind: "degree", min: 3 } });
        await session.visibility.addCondition({
            id: "nobody",
            effect: "keep",
            rule: { kind: "text", reads: "data.label", mode: "substring", text: "zzz" },
        });
        await waitFor(() => {
            assert.equal(together(), "Passes none");
        });

        // The box on the row switches the card off; its row then says so, and the header count goes,
        // since one card's own count already says what it leaves.
        await userEvent.click((await card(/zzz/)).getByRole("checkbox", { name: "Use" }));
        await waitFor(() => {
            assert.isFalse(session.visibility.conditions.find((c) => c.id === "nobody")?.on);
        });
        await waitFor(() => {
            assert.isNull(together());
        });
        const off = await cardElement(/zzz/);
        assert.isNotNull(off.getAttribute("data-off"));
        assert.match(off.querySelector(".dp-filter-name")?.getAttribute("aria-label") ?? "", /, off$/);

        // The header chip's x switches the card still on off, and leaves the one already off as it is.
        await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
        await waitFor(() => {
            assert.isFalse(session.visibility.conditions.find((c) => c.id === "busy")?.on);
        });
        assert.isFalse(session.visibility.conditions.find((c) => c.id === "nobody")?.on);
        assert.equal(session.visibility.summary.visibleNodes, 8);
    });

    it("a saved Select card counts all its side as staying, opens read-only in its words, and Delete removes it", async () => {
        const session = await openWithGraph();
        await session.visibility.addCondition({ id: "pick", effect: "select", rule: { kind: "degree", min: 3 } });
        const pick = await card(/^Select /);
        // A Select card hides nothing: everything stays, so its chip counts all 8 nodes.
        await waitFor(() => {
            assert.isNotNull(pick.getByText("8 of 8"));
        });
        assert.isNull(screen.queryByRole("button", { name: "Clear filters" }), "a Select card is no filter to clear");

        await userEvent.click(pick.getAllByRole("button")[0] ?? document.body);
        const remove = await within(filters()).findByRole("button", { name: "Delete" });
        assert.isNull(filters().querySelector(".sel-editor"), "no editor writes it as a card that stays");
        await userEvent.click(remove);
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 0);
        });
    });

    it("a card on a column the graph does not have shows the hidden column mark, not a count", async () => {
        const session = await openWithGraph();
        await session.visibility.addCondition({
            id: "gone",
            effect: "select",
            rule: { kind: "range", attribute: "data.weight", min: 1 },
        });
        const gone = await card(/^Select /);
        await waitFor(() => {
            assert.isNotNull(gone.getByText("Hidden or removed column"));
        });
        assert.isNull(gone.queryByText(/ of 8/), "no count for a column that is not there");
    });
});
