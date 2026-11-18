/**
 * The graph's Overview and an attribute's Summary against a real graphty-element session with no
 * view (`createGraphSession`): the directed graph's In and Out degrees, an empty graph, and an
 * attribute's yes-or-no and text columns. Every figure asserted is the session's own.
 */
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { act, render, screen, within } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { Inspector } from "../Inspector";
import { formatNumber } from "../words";

let session: GraphSession | null = null;

afterEach(() => {
    session?.dispose();
    session = null;
});

/**
 * The inspector on a fresh session, after `fill` has written the graph.
 * @param fill - writes the graph into the session.
 * @returns the session and the store.
 */
async function renderInspector(
    fill: (made: GraphSession) => Promise<void>,
): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const made = createGraphSession();
    session = made;
    await fill(made);
    const store = createWorkspaceStore({ project: { name: "Graph", id: 1 } });
    render(
        <WorkspaceContext.Provider value={makeWorkspaceValue(store, createRegistry(REGISTRATIONS), made, null)}>
            <Inspector />
        </WorkspaceContext.Provider>,
    );
    return { session: made, store };
}

/**
 * A stat row's value.
 * @param scope - where the row is.
 * @param name - the row's name.
 * @returns its value's text.
 */
function statValue(scope: HTMLElement, name: string): string {
    return within(scope).getByRole("group", { name }).querySelector("[data-testid=data-row-value]")?.textContent ?? "";
}

/**
 * Picks one of Which degree's choices by clicking its label, as a reader does (the radio itself is
 * drawn hidden under its label).
 * @param degree - the Degree section.
 * @param name - the choice.
 */
async function chooseDegree(degree: HTMLElement, name: string): Promise<void> {
    const radio = within(degree).getByRole("radio", { name });
    const label = degree.querySelector(`label[for="${radio.id}"]`);
    assert.isNotNull(label);
    if (label !== null) {
        await userEvent.click(label);
    }
}

/** A star pointing outward from `hub` to five leaves, plus one edge back into the hub. */
async function directedStar(made: GraphSession): Promise<void> {
    await made.config.set({ data: { directed: true } });
    await made.data.addNodes(["hub", "a", "b", "c", "d", "e"].map((id) => ({ id })));
    await made.data.addEdges([
        ...["a", "b", "c", "d", "e"].map((target) => ({ source: "hub", target })),
        { source: "a", target: "hub" },
    ]);
}

describe("the graph's Overview", () => {
    it("on a directed graph, Which degree shows In and Out from the element's histograms", async () => {
        const { session: on } = await renderInspector(directedStar);
        const statistics = on.data.statistics();
        assert.isDefined(statistics.inDegreeHistogram);
        assert.isDefined(statistics.outDegreeHistogram);

        const degree = await screen.findByRole("group", { name: "Degree" });
        assert.isNotNull(within(degree).getByRole("img", { name: "Degree" }));
        assert.equal(statValue(degree, "Lowest"), formatNumber(statistics.degreeRange[0]));
        assert.equal(statValue(degree, "Highest"), formatNumber(statistics.degreeRange[1]));
        // All has a mean; In and Out do not.
        assert.isNotNull(within(degree).getByRole("group", { name: "Mean" }));

        await chooseDegree(degree, "In");
        await within(degree).findByRole("img", { name: "In-degree" });
        assert.equal(statValue(degree, "Lowest"), formatNumber(statistics.inDegreeHistogram?.min ?? -1));
        assert.equal(statValue(degree, "Highest"), formatNumber(statistics.inDegreeHistogram?.max ?? -1));
        assert.isNull(within(degree).queryByRole("group", { name: "Mean" }));

        await chooseDegree(degree, "Out");
        await within(degree).findByRole("img", { name: "Out-degree" });
        // The hub sends five edges: the most any node sends.
        assert.equal(statValue(degree, "Highest"), formatNumber(statistics.outDegreeHistogram?.max ?? -1));
        assert.equal(statistics.outDegreeHistogram?.max, 5);
    });

    it("offers no Which degree on an undirected graph", async () => {
        await renderInspector(async (made) => {
            await made.config.set({ data: { directed: false } });
            await made.data.addNodes([{ id: "a" }, { id: "b" }]);
            await made.data.addEdges([{ source: "a", target: "b" }]);
        });
        await screen.findByRole("group", { name: "Degree" });
        assert.isNull(screen.queryByRole("radiogroup", { name: "Which degree" }));
        assert.isNull(screen.queryByRole("radio", { name: "In" }));
    });

    it("says there is nothing to draw on a graph with no nodes", async () => {
        await renderInspector(async () => {
            // Nothing written.
        });
        assert.isNotNull(await screen.findByText("No nodes to draw"));
        assert.isNull(screen.queryByRole("group", { name: "Nodes" }));
    });
});

describe("an attribute's Summary", () => {
    /** 200 people: a yes-or-no `member`, and a unique `name`. */
    const PEOPLE = Array.from({ length: 200 }, (_, i) => ({
        id: `p${String(i)}`,
        name: `Person number ${String(i)}`,
        member: i % 3 === 0,
    }));

    /**
     * Opens one attribute in the inspector.
     * @param store - the store.
     * @param path - the attribute.
     * @returns the Summary section.
     */
    async function openAttribute(store: WorkspaceStore, path: string): Promise<HTMLElement> {
        act(() => {
            store.set({ inspected: { kind: "attribute", id: path } });
        });
        return screen.findByRole("group", { name: "Summary" });
    }

    it("names a yes-or-no column as one and counts its Yes and No", async () => {
        const { session: on, store } = await renderInspector(async (made) => {
            await made.data.addNodes(PEOPLE);
        });
        const summary = await openAttribute(store, "data.member");
        assert.equal(statValue(summary, "Value type"), "Yes or no");
        const counts = on.data.valueCounts("data.member", { kind: "node" });
        const yes = counts.values.find((entry) => entry.value === true || entry.value === "true");
        const no = counts.values.find((entry) => entry.value === false || entry.value === "false");
        assert.isDefined(yes);
        assert.isDefined(no);
        assert.equal(statValue(summary, "Yes"), String(yes?.count));
        assert.equal(statValue(summary, "No"), String(no?.count));
        assert.equal((yes?.count ?? 0) + (no?.count ?? 0), PEOPLE.length);
    });

    it("names a column of free text as text, with no list of values", async () => {
        const { session: on, store } = await renderInspector(async (made) => {
            await made.data.addNodes(PEOPLE);
        });
        const read = on.data.readableValues().find((value) => value.path === "data.name" && value.on === "node");
        assert.equal(read?.kind, "text");
        const summary = await openAttribute(store, "data.name");
        assert.equal(statValue(summary, "Value type"), "Text");
        assert.isNull(within(summary).queryByText("Values"));
        assert.isNull(within(summary).queryByRole("group", { name: "Person number 0" }));
    });
});
