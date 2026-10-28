/**
 * Summaries, the Data place and analysis cards on the REAL graphty-element say true, complete
 * things: a selection never averages the node ids and gives a number lowest to highest; the
 * table's Columns opens no empty list; every Data place row says its type and how many have a
 * value, and a category wears the category icon; an analysis that reads two nodes never takes the
 * first two of a larger selection.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, NodeId } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { storyWaitOptions } from "../../../stories/wait";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { DEFAULT_NAME_KEY } from "../../style/cards";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** Six volunteers: hours 30 to 52, a kind that groups them, an email only some have. */
const VOLUNTEERS = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="name" for="node" attr.name="name" attr.type="string"/>
  <key id="kind" for="node" attr.name="kind" attr.type="string"/>
  <key id="hours" for="node" attr.name="hours" attr.type="int"/>
  <key id="email" for="node" attr.name="email" attr.type="string"/>
  <graph id="G" edgedefault="undirected">
    <node id="v1"><data key="name">Ana</data><data key="kind">person</data><data key="hours">30</data><data key="email">a@x.example</data></node>
    <node id="v2"><data key="name">Ben</data><data key="kind">person</data><data key="hours">52</data></node>
    <node id="v3"><data key="name">Cy</data><data key="kind">person</data><data key="hours">41</data><data key="email">c@x.example</data></node>
    <node id="v4"><data key="name">Di</data><data key="kind">company</data><data key="hours">44</data></node>
    <node id="v5"><data key="name">Ed</data><data key="kind">company</data><data key="hours">35</data><data key="email">e@x.example</data></node>
    <node id="v6"><data key="name">Flo</data><data key="kind">person</data><data key="hours">48</data></node>
    <edge source="v1" target="v2"/><edge source="v2" target="v3"/><edge source="v3" target="v4"/>
    <edge source="v4" target="v5"/><edge source="v5" target="v6"/><edge source="v6" target="v1"/>
  </graph>
</graphml>`;

/**
 * The workspace at 1440 x 900 with a graph loaded.
 * @param load - loads the graph into the session.
 * @returns The session.
 */
async function open(load: (session: GraphSession) => Promise<unknown>): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await load(session);
    return session;
}

/**
 * Zachary's karate club, as the start page opens it.
 * @returns The session.
 */
async function openKarate(): Promise<GraphSession> {
    const session = await open((s) => s.data.import({ config: { url: "/samples/karate.gml" } }));
    await waitFor(() => {
        assert.equal(session.data.statistics().nodeCount, 34);
    });
    return session;
}

/**
 * Every node's id.
 * @param session - the session.
 * @returns the ids.
 */
function allIds(session: GraphSession): NodeId[] {
    return session.data.nodePage({ limit: 1000 }).records.map((record) => record.id);
}

describe("summaries and cards that say true, complete things", () => {
    it("never averages the node ids: all of karate selected shows no mean on id", async () => {
        const session = await openKarate();
        await session.selection.apply({ nodes: allIds(session) });
        await userEvent.click(await screen.findByRole("tab", { name: "Values" }));
        await waitFor(() => {
            const id = screen.getByRole("group", { name: "id" });
            assert.notInclude(id.textContent ?? "", "mean");
            assert.include(id.textContent ?? "", "34 of 34 have a value");
        });
    });

    it("gives a number lowest to highest, as Degree reads", async () => {
        const session = await open((s) =>
            s.data.import({ type: "graphml", name: "volunteers.graphml", config: { data: VOLUNTEERS } }),
        );
        await waitFor(() => {
            assert.equal(session.data.statistics().nodeCount, 6);
        });
        await session.selection.apply({ nodes: allIds(session) });
        await userEvent.click(await screen.findByRole("tab", { name: "Values" }));
        await waitFor(() => {
            assert.include(screen.getByRole("group", { name: "hours" }).textContent ?? "", "30 to 52");
        });
    });

    it("draws Columns disabled with its reason when the only column always shows, and opens nothing", async () => {
        await openKarate();
        await userEvent.keyboard("{Shift>}T{/Shift}");
        const columns = await screen.findByRole("button", { name: "Columns: 1 of 1" });
        assert.equal(columns.getAttribute("aria-disabled"), "true");
        assert.include(columns.getAttribute("aria-description") ?? "", "No other columns");
        // Playwright refuses a click on a control marked disabled unless forced; a reader's click lands.
        await userEvent.click(columns, { force: true });
        assert.isNull(screen.queryByRole("menu"));
    });

    it("says on a Size line added to a selection that the first size picked makes the layer", async () => {
        const session = await open((s) =>
            s.data.import({ type: "graphml", name: "volunteers.graphml", config: { data: VOLUNTEERS } }),
        );
        await waitFor(() => {
            assert.equal(session.data.statistics().nodeCount, 6);
        });
        await session.selection.apply({ nodes: allIds(session).slice(0, 1) });
        await userEvent.click(await screen.findByRole("tab", { name: "Style" }));
        await userEvent.click(await screen.findByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
        const note = await waitFor(() => {
            const found = document.querySelector('.ws-row[data-line="node.size"] [data-first-value]');
            assert.isNotNull(found);
            return found;
        });
        assert.equal(note?.textContent, "Not set yet: the first size you pick makes the layer");
        const before = session.styles.list().length;
        await userEvent.keyboard("3{Enter}");
        await waitFor(() => {
            assert.equal(session.styles.list().length, before + 1, "the first size made the layer");
            assert.isNull(document.querySelector("[data-first-value]"), "and the line no longer says it waits");
        });
    });

    it("wraps the Node tab's way to an edge attribute inside the list, with no sideways scroll", async () => {
        const session = await open((s) =>
            s.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } }),
        );
        await session.styles.add({
            name: "Layer 1",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
            userData: { [DEFAULT_NAME_KEY]: "Layer 1" },
        });
        await session.styles.settled();
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Layer 1, / }));
        await userEvent.click(await screen.findByRole("button", { name: /^Which nodes, / }, { timeout: TIMEOUT_MS }));
        const region = await screen.findByRole("group", { name: "Which nodes" });
        await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
        await userEvent.keyboard("chapters");
        const go = await screen.findByRole("button", { name: "Add shared_chapters on the Edge tab" });
        const list = screen.getByRole("listbox", { name: "Attributes" });
        assert.isAtMost(list.scrollWidth, list.clientWidth, "the list does not scroll sideways");
        assert.isAtMost(go.getBoundingClientRect().right, list.getBoundingClientRect().right + 0.5, "inside the list");
    });

    it("shows what the Degree row does as its tooltip", async () => {
        const session = await open((s) =>
            s.data.import({ type: "graphml", name: "volunteers.graphml", config: { data: VOLUNTEERS } }),
        );
        await waitFor(() => {
            assert.equal(session.data.statistics().nodeCount, 6);
        });
        await session.selection.apply({ nodes: allIds(session).slice(0, 1) });
        await userEvent.click(await screen.findByRole("tab", { name: "Values" }));
        await userEvent.hover(await screen.findByRole("button", { name: /^Degree/ }));
        // It opens after the theme's one-second hover delay, so the wait has no deadline to race it.
        const tip = await screen.findByRole("tooltip", {}, storyWaitOptions(5000));
        assert.include(tip.textContent ?? "", "Select this node and its neighbors");
    });

    it("Most flow takes no Source and Sink from a selection of 34", async () => {
        const session = await openKarate();
        await session.selection.apply({ nodes: allIds(session) });
        await userEvent.click(
            within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", { name: "Analyze" }),
        );
        const flow = await screen.findByRole("option", { name: "Most flow" });
        assert.equal(flow.getAttribute("aria-disabled"), "true");
        assert.include(flow.getAttribute("aria-description") ?? "", "Select only 2 nodes; 34 are selected");
        await userEvent.click(flow, { force: true });
        assert.isNull(screen.queryByRole("form", { name: "Most flow" }));
    });
});
