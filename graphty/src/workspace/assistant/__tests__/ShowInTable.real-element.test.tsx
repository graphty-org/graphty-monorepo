/**
 * Show in table from a reply, on the REAL graphty-element with its mock provider, by real clicks:
 * the dock opens on the rows the reply named, with a chip that names the narrowing.
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
 * The workspace with the Assistant open on six nodes, half "even", in a chain of "link" edges.
 * @returns the store and the session.
 */
async function openOn(): Promise<{
    store: WorkspaceStore;
    session: NonNullable<HTMLElementTagNameMap["graphty-element"]["session"]>;
}> {
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
    await session.data.addNodes(ids.map((id, index) => ({ id, group: index % 2 === 0 ? "even" : "odd" })));
    await session.data.addEdges(ids.slice(1).map((id, index) => ({ source: ids[index], target: id, kind: "link" })));
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
    return waitFor(() => {
        const dock = document.querySelector<HTMLElement>(".ws-table");
        assert.isNotNull(dock);
        return dock;
    });
}

/**
 * The node ids the Nodes grid lists.
 * @param dock - the dock.
 * @returns them, in order.
 */
const listed = (dock: HTMLElement): string[] =>
    within(within(dock).getByRole("grid", { name: "Nodes" }))
        .getAllByRole("rowheader")
        .map((cell) => cell.textContent ?? "");

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

    it("lists only the rows it names, keeps them past a row click, and the chip's x lists every row", async () => {
        const { session } = await openOn();
        model.turns = counting("data.group == 'even'");
        const dock = await showInTable("Which are even?");

        await within(dock).findByText("3 of 6 nodes");
        within(dock).getByText("Assistant result");
        await waitFor(() => {
            assert.sameMembers(listed(dock), ["n0", "n2", "n4"]);
        });
        assert.sameMembers(session.selection.nodes.map(String), ["n0", "n2", "n4"]);

        // A row click moves the selection; the other rows stay listed.
        await userEvent.click(within(dock).getAllByRole("rowheader", { name: "n2" })[0]);
        await waitFor(() => {
            assert.deepEqual(session.selection.nodes.map(String), ["n2"]);
        });
        assert.sameMembers(listed(dock), ["n0", "n2", "n4"]);

        // The x shows every row and leaves the selection as it was.
        await userEvent.click(
            within(dock).getByRole("button", { name: "Show every node, not only the Assistant result" }),
        );
        await within(dock).findByText("6 nodes");
        assert.isNull(within(dock).queryByText("Assistant result"));
        assert.deepEqual(session.selection.nodes.map(String), ["n2"]);
    });

    it("opens the Edges tab, with no chip, for a result of edges alone", async () => {
        const { store } = await openOn();
        model.turns = counting("data.kind == 'link'");
        const dock = await showInTable("Which are links?");
        await waitFor(() => {
            assert.strictEqual(store.get().dockTab, "edges");
        });
        assert.isNull(within(dock).queryByText("Assistant result"));
    });
});
