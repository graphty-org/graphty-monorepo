/**
 * Show in table from a reply, on the REAL graphty-element with its mock provider, by real clicks:
 * the dock opens on exactly the rows the reply named, the count says how many of the graph's, an
 * icon-only x lists every row again, and the reader's selection is never touched.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type AiManagerConfig, MockLlmProvider } from "@graphty/graphty-element/ai";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { cleanup, render, screen, waitFor, within } from "../../../test/test-utils";
import { writeAssistantChoice } from "../../assistant-door/provider";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The experiment on, as a site.json that lists it. */
const SITE = `data:application/json,${encodeURIComponent(JSON.stringify({ features: ["assistant"] }))}`;
const COMPOSER = { name: "Message the assistant" };

type Generate = MockLlmProvider["generate"];
type Answer = Awaited<ReturnType<Generate>>;
type Session = NonNullable<HTMLElementTagNameMap["graphty-element"]["session"]>;

/** A model that says what each test scripts, turn by turn. */
class ScriptedModel extends MockLlmProvider {
    turns: Answer[] = [];
    asked = 0;

    /**
     * One turn.
     * @param args - what the base provider takes.
     * @returns the scripted answer.
     */
    override async generate(...args: Parameters<Generate>): ReturnType<Generate> {
        const answer = this.turns[Math.min(this.asked++, this.turns.length - 1)];
        return super.generate(...args).then(() => answer);
    }
}

let model = new ScriptedModel();

/** Every enable reaches the scripted model. */
function scriptElement(): void {
    const tag = customElements.get("graphty-element") as unknown as {
        prototype: HTMLElementTagNameMap["graphty-element"];
    };
    const realEnable = tag.prototype.enableAiControl;
    vi.spyOn(tag.prototype, "enableAiControl").mockImplementation(async function enable(
        this: HTMLElementTagNameMap["graphty-element"],
        config: AiManagerConfig,
    ) {
        await realEnable.call(this, { ...config, providerInstance: model });
    });
}

/**
 * A reply that counts what `where` matches, then says one line.
 * @param where - the rule.
 * @returns the turns.
 */
const counting = (where: string): Answer[] => [
    { text: "", toolCalls: [{ id: "call-1", name: "query", arguments: { action: "count", where } }] },
    { text: "Found them.", toolCalls: [] },
];

/**
 * The workspace with the Assistant open on six nodes, half "even", in a chain of five edges
 * weighted 0 to 4.
 * @returns the store and the session.
 */
async function openOn(): Promise<{ store: WorkspaceStore; session: Session }> {
    writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
    const store = createWorkspaceStore({ project: { name: "Check", id: 1 } });
    render(<Workspace store={store} />);
    await userEvent.click(await screen.findByRole("button", { name: "Assistant" }));
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    const ids = Array.from({ length: 6 }, (_, index) => `n${String(index)}`);
    await session.data.addNodes(
        ids.map((id, index) => ({ id, group: index % 2 === 0 ? "even" : "odd", early: index < 2 ? "yes" : "no" })),
    );
    await session.data.addEdges(ids.slice(1).map((id, index) => ({ source: ids[index], target: id, weight: index })));
    await screen.findByRole("textbox", COMPOSER);
    return { store, session };
}

/**
 * Sends a message and presses the reply's Show in table.
 * @param text - the message.
 * @returns the dock.
 */
async function showInTable(text: string): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("textbox", COMPOSER));
    await userEvent.keyboard(`${text}{Enter}`);
    await userEvent.click(await screen.findByRole("button", { name: "Show in table" }));
    return screen.findByRole("region", { name: "Table" });
}

/**
 * The first key cell of each row a grid lists, first to last: a node's id, an edge's source (an
 * edge row has two key cells, its source and its target).
 * @param dock - the dock.
 * @param name - the grid: Nodes or Edges.
 * @returns them.
 */
const listed = (dock: HTMLElement, name: string): string[] =>
    within(within(dock).getByRole("grid", { name }))
        .getAllByRole("row")
        .map((row) => row.querySelector("[role=rowheader]")?.textContent)
        .filter((key): key is string => typeof key === "string");

/**
 * What the page's polite live regions hold now.
 * @returns their texts.
 */
const spoken = (): (string | null)[] =>
    [...document.querySelectorAll('[aria-live="polite"]')].map((region) => region.textContent);

describe("Show in table from a reply", () => {
    beforeEach(async () => {
        resetSiteConfig();
        await loadSiteConfig(SITE);
        await page.viewport(1440, 900);
        localStorage.clear();
        sessionStorage.clear();
        await new Promise((resolve) => {
            indexedDB.deleteDatabase("graphty-ai").onsuccess = resolve;
        });
        model = new ScriptedModel();
        scriptElement();
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        resetSiteConfig();
        writeAssistantChoice(null);
    });

    it("lists only the reply's nodes, leaves the selection, and the x lists every node", async () => {
        const { store, session } = await openOn();
        await session.selection.apply({ nodes: ["n1"] });
        model.turns = counting("data.group == 'even'");
        const dock = await showInTable("Which are even?");

        await within(dock).findByText("3 of 6 nodes");
        await waitFor(() => {
            assert.sameMembers(listed(dock, "Nodes"), ["n0", "n2", "n4"]);
        });
        assert.strictEqual(store.get().dockTab, "nodes");
        // What a screen reader is given: the page's polite live region, not the store.
        await waitFor(() => {
            assert.include(spoken(), "Table: 3 of 6 nodes");
        });
        assert.deepEqual(session.selection.nodes.map(String), ["n1"], "the selection stays the reader's");
        assert.isNull(within(dock).queryByText("Assistant result"), "no pill names the narrowing");

        const showAll = within(dock).getByRole("button", { name: "Show all nodes" });
        assert.strictEqual(showAll.textContent, "", "an icon, named for what it does");
        await userEvent.hover(showAll);
        await screen.findByRole("tooltip", { name: "Show all nodes" });
        await userEvent.click(showAll);
        await within(dock).findByText("6 nodes");
        await waitFor(() => {
            assert.lengthOf(listed(dock, "Nodes"), 6);
        });
        assert.strictEqual(document.activeElement, within(dock).getByRole("tab", { name: "Nodes" }));
        assert.isNull(within(dock).queryByRole("button", { name: "Show all nodes" }));
        assert.deepEqual(session.selection.nodes.map(String), ["n1"]);
    });

    it("opens the Edges tab on exactly the edges a reply of edges alone named", async () => {
        const { store, session } = await openOn();
        model.turns = counting("data.weight >= 3");
        const dock = await showInTable("Which edges are heavy?");

        await within(dock).findByText("2 of 5 edges");
        assert.strictEqual(store.get().dockTab, "edges");
        await waitFor(() => {
            assert.deepEqual(listed(dock, "Edges"), ["n3", "n4"]);
        });
        assert.strictEqual(session.selection.size, 0);
        // The Nodes tab is not narrowed by an answer about edges.
        await userEvent.click(within(dock).getByRole("tab", { name: "Nodes" }));
        await within(dock).findByText("6 nodes");
        await userEvent.click(within(dock).getByRole("tab", { name: "Edges" }));
        await within(dock).findByText("2 of 5 edges");

        await userEvent.click(within(dock).getByRole("button", { name: "Show all edges" }));
        await within(dock).findByText("5 edges");
        assert.strictEqual(document.activeElement, within(dock).getByRole("tab", { name: "Edges" }));
    });

    it("lists the reply's rows under a filter, and the filter's view comes back after the x", async () => {
        const { session } = await openOn();
        model.turns = counting("data.group == 'even'");
        // A filter the reader already has on: only n0 and n1 show.
        await session.visibility.set({ kind: "categories", attribute: "data.early", values: ["yes"] });
        // The toolbar's button: the composer has focus, so Shift+T would type a T into it.
        await userEvent.click(
            within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", { name: "Table" }),
        );
        const dock = await screen.findByRole("region", { name: "Table" });
        await within(dock).findByText("2 of 6 nodes");
        within(dock).getByRole("radiogroup", { name: "Records" });

        await showInTable("Which are even?");
        // The assistant reads the working graph the app reads: of the even nodes, the shown n0.
        await within(dock).findByText("1 of 6 nodes");
        await waitFor(() => {
            assert.sameMembers(listed(dock, "Nodes"), ["n0"]);
        });
        assert.isNull(within(dock).queryByRole("radiogroup", { name: "Records" }), "Shown / All waits for the x");

        await userEvent.click(within(dock).getByRole("button", { name: "Show all nodes" }));
        await within(dock).findByText("2 of 6 nodes");
        within(dock).getByRole("radiogroup", { name: "Records" });
    });

    it("drops a named node that leaves the graph, and keeps the x when none are left", async () => {
        const { session } = await openOn();
        model.turns = counting("data.group == 'even'");
        const dock = await showInTable("Which are even?");
        await within(dock).findByText("3 of 6 nodes");

        await session.data.removeNodes(["n0"]);
        await within(dock).findByText("2 of 5 nodes");
        await waitFor(() => {
            assert.sameMembers(listed(dock, "Nodes"), ["n2", "n4"]);
        });

        await session.data.removeNodes(["n2", "n4"]);
        await within(dock).findByText("0 of 3 nodes");
        await userEvent.click(within(dock).getByRole("button", { name: "Show all nodes" }));
        await within(dock).findByText("3 nodes");
    });
});
