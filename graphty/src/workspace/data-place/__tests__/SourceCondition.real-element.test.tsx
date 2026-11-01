/**
 * Picking nodes by a condition card from the Data place, on the REAL graphty-element: the Filters
 * "+" opens the step editor, the reader picks an attribute and fills its card with real clicks and
 * keys, and the step the element holds keeps exactly the nodes the card names. With two loads in,
 * the cards offer Data source, a checklist of the loads.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { GRAPH_FILE_GML, PLAIN_JSON } from "../fixtures";

/** Four sites and no routes: a load that supplies only nodes. */
const SITES_JSON = JSON.stringify({ nodes: ["a", "b", "c", "d"].map((id) => ({ id })), edges: [] });

/** Five routes, four among the sites and one to a new site, e. */
const ROUTES_JSON = JSON.stringify({
    nodes: [],
    edges: [
        ["a", "b"],
        ["b", "c"],
        ["c", "d"],
        ["d", "a"],
        ["d", "e"],
    ].map(([source, target]) => ({ source, target })),
});

/**
 * Renders the workspace on the Data place and waits for the session, with the small graph file
 * loaded (8 nodes, `group` 1 to 3).
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
 * Opens a new filter card from the Filters "+" on a field.
 * @param name - the field's name, as the list shows it.
 */
async function newCardOn(name: string): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: "Add filter" }));
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(`^${name}(,|$)`) }));
}

/**
 * The one card's step rule: a card says what stays, All and a Keep step on its value.
 * @param session - the element's session.
 * @returns the step's rule.
 */
function stepRule(session: GraphSession): unknown {
    const rule = session.visibility.conditions[0]?.rule;
    if (rule?.kind !== "union") {
        return undefined;
    }
    assert.equal(rule.branches[0]?.start, "all");
    assert.equal(rule.branches[0]?.steps[0]?.op, "keep");
    return rule.branches[0]?.steps[0]?.rule;
}

/**
 * The ids of the nodes the filter shows.
 * @param session - the element's session.
 * @returns the ids, sorted.
 */
function shownNodes(session: GraphSession): string[] {
    return session.data
        .nodes()
        .filter((node) => session.visibility.isVisible(node.id))
        .map((node) => String(node.id))
        .sort();
}

describe("picking nodes by a condition card from the Data place", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it("keeps the nodes a number card's range holds", async () => {
        const session = await openWithGraph();
        await newCardOn("group");
        const from = await screen.findByRole("textbox", { name: "group from, number" });
        await userEvent.clear(from);
        await userEvent.type(from, "3{Enter}");

        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1);
        });
        await waitFor(() => {
            assert.equal(session.visibility.conditions[0].effect, "keep");
        });
        assert.deepEqual(stepRule(session), { kind: "range", attribute: "data.group", min: 3 });
        // Marius and Gavroche are the two nodes in group 3.
        assert.deepEqual(shownNodes(session), ["4", "6"]);
    });

    it("offers Data source once two loads are in, and keeps only the ticked load's nodes", async () => {
        const session = await openWithGraph();
        // One load: no Data source in "+".
        await userEvent.click(screen.getByRole("button", { name: "Add filter" }));
        await screen.findByRole("option", { name: /^group(,|$)/ });
        assert.isNull(screen.queryByRole("option", { name: "Data source" }));
        await userEvent.keyboard("{Escape}");

        await session.data.import(
            { type: "json", name: "people.json", config: { data: PLAIN_JSON } },
            { mode: "merge" },
        );
        await waitFor(() => {
            assert.lengthOf(session.data.sources(), 2);
        });
        const people = session.data.sources()[1];

        await newCardOn("Data source");
        const loads = await screen.findByRole("group", { name: "Data source values" });
        await userEvent.click(within(loads).getByRole("checkbox", { name: /^people\.json, 4 nodes$/ }));

        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1);
        });
        await waitFor(() => {
            assert.equal(session.visibility.conditions[0].effect, "keep");
        });
        const source = stepRule(session) as { kind?: string; sources?: unknown[] } | undefined;
        assert.equal(source?.kind, "source");
        assert.deepEqual(source?.sources, [people.key]);
        assert.deepEqual(shownNodes(session), ["a", "b", "c", "d"]);
        // The card is named for the load, not its key, and counts the nodes it keeps.
        // The card itself: the Data sources section names the load too.
        const card = await waitFor(() => {
            const found = [
                ...document.querySelectorAll<HTMLElement>('[role=list][aria-label="Filters"] > li > [role=group]'),
            ].find((each) => /people\.json/.test(each.getAttribute("aria-label") ?? ""));
            assert.isDefined(found);
            return found;
        });
        assert.lengthOf(within(card).getAllByText(/ of /), 1);
        // Its chip shows its whole "X of Y" at the panel's width: not cut to an ellipsis, and not
        // clipped or covered by the card's controls (the chip is what the reader sees at its far end).
        for (const text of card.querySelectorAll<HTMLElement>(".cm-entity-text")) {
            assert.isAtMost(text.scrollWidth, text.clientWidth, text.textContent ?? "");
            const box = text.getBoundingClientRect();
            const seen = document.elementFromPoint(box.right - 1, box.top + box.height / 2);
            assert.isTrue(text.contains(seen), `${text.textContent ?? ""} is not fully shown`);
        }

        // A card that exists stays once the sources drop back to one.
        await session.data.removeSource(people.key);
        await waitFor(() => {
            assert.lengthOf(session.data.sources(), 1);
        });
        await waitFor(() => {
            const names = [
                ...document.querySelectorAll<HTMLElement>('[role=list][aria-label="Filters"] > li > [role=group]'),
            ].map((each) => each.getAttribute("aria-label") ?? "");
            assert.isTrue(
                names.some((each) => each.includes("a removed source")),
                names.join(" | "),
            );
        });
    });

    it("keeps the edges between the kept nodes, whichever load supplied them", async () => {
        const session = await openWithGraph();
        await session.data.removeSource(session.data.sources()[0].key);
        // One load holds the sites, the other the routes between them and one new site, e.
        await session.data.import({ type: "json", name: "sites.json", config: { data: SITES_JSON } });
        await session.data.import(
            { type: "json", name: "routes.json", config: { data: ROUTES_JSON } },
            { mode: "merge" },
        );
        await waitFor(() => {
            assert.lengthOf(session.data.sources(), 2);
        });
        assert.lengthOf(session.data.edges(), 5);

        await newCardOn("Data source");
        const loads = await screen.findByRole("group", { name: "Data source values" });
        await userEvent.click(within(loads).getByRole("checkbox", { name: /^sites\.json/ }));

        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1);
        });
        await waitFor(() => {
            assert.deepEqual(shownNodes(session), ["a", "b", "c", "d"]);
        });
        // The four routes among a to d stay; only d to e, whose end is left out, goes.
        const shownEdges = session.data.edges().filter((edge) => session.visibility.isVisible(edge.id));
        assert.lengthOf(shownEdges, 4);
        await screen.findByRole("button", { name: /^Filter: 4 of 5 nodes/ });
    });
});
