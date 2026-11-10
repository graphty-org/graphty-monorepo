/**
 * A source's details in the right panel, on the REAL graphty-element and driven by real clicks: a
 * click on a Sources row says what the source was, when it was retrieved and simple statistics;
 * the time survives a save and reopen, and a credential in an address is never shown.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import ndexRecordings from "../../server/__tests__/ndex-wp5483.json";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const PEOPLE = "id,name\nAna,Ana A\nBo,Bo B\nCy,Cy C";
const VALUES = "id,age\nAna,30\nBo,40\nDi,50";

/**
 * The session of a new project.
 * @returns the session.
 */
async function openProject(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" })} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.isDefined(session);
    });
    return session as GraphSession;
}

/**
 * Clicks a Sources row and reads the right panel.
 * @param name - the row's name.
 * @returns each fact's value, by its name.
 */
async function details(name: string): Promise<Record<string, string>> {
    const place = await screen.findByRole("region", { name: "Data place" });
    const row = await within(place).findByRole("listitem", { name });
    await userEvent.click(within(row).getAllByRole("button")[0]);
    const inspector = await screen.findByRole("complementary", { name: "Inspector" });
    const facts = await waitFor(() => {
        const groups = within(inspector).getAllByRole("group");
        const found = groups
            .map((group) => [group.getAttribute("aria-label") ?? labelOf(group), valueOf(group)])
            .filter(([fact]) => fact !== "");
        assert.isNotEmpty(found);
        return found;
    });
    return Object.fromEntries(facts);
}

/**
 * A stat row's name.
 * @param group - the row.
 * @returns the name.
 */
function labelOf(group: HTMLElement): string {
    return group.querySelector('[data-testid="data-row-name"]')?.textContent ?? "";
}

/**
 * A stat row's value.
 * @param group - the row.
 * @returns the value.
 */
function valueOf(group: HTMLElement): string {
    return group.querySelector('[data-testid="data-row-value"]')?.textContent ?? "";
}

describe("a source's details in the right panel", () => {
    it("says what a file was, when it was retrieved, and how much it held", async () => {
        const session = await openProject();
        await session.data.import({ config: { file: new File([PEOPLE], "people.csv") }, name: "people.csv" });
        const facts = await details("people.csv");
        assert.strictEqual(facts.Type, "File");
        assert.strictEqual(facts.File, "people.csv");
        assert.strictEqual(facts.Format, "CSV");
        assert.isDefined(facts.Size);
        assert.isDefined(facts.Retrieved);
        assert.strictEqual(facts.Nodes, "3");
        assert.strictEqual(facts.Edges, "0");
        assert.isUndefined(facts.Columns);
        assert.isUndefined(facts.Address);
    });

    it("shows a web address with no credential in it", async () => {
        const session = await openProject();
        const url = `${location.origin}/prototype-data/supply-chain/suppliers.csv?token=hunter2&x=1`;
        await session.data.import({ config: { url }, name: "suppliers.csv" });
        const facts = await details("suppliers.csv");
        assert.strictEqual(facts.Type, "Web address");
        assert.isUndefined(facts.Size);
        assert.include(facts.Address, "suppliers.csv");
        assert.notInclude(facts.Address, "hunter2");
        assert.strictEqual(facts.Nodes, "40");
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        assert.notInclude(inspector.textContent, "hunter2");
    });

    it("says how a joined table was joined", async () => {
        const session = await openProject();
        await session.data.import({ config: { file: new File([PEOPLE], "people.csv") }, name: "people.csv" });
        const draft = await session.data.prepare(
            { config: { file: new File([VALUES], "ages.csv") }, name: "ages.csv" },
            { onto: "graph" },
        );
        await draft.load({ join: { shape: "node-values", keys: [{ file: "id", graph: "id" }] } });
        const facts = await details("ages.csv");
        assert.strictEqual(facts.Type, "Joined table");
        assert.strictEqual(facts.File, "ages.csv");
        assert.strictEqual(facts["Joined onto"], "people.csv");
        assert.strictEqual(facts["Reads as"], "Values on nodes");
        assert.strictEqual(facts.Key, "id = Id");
        assert.strictEqual(facts["Table rows"], "3");
        assert.strictEqual(facts["Nodes matched"], "2");
        assert.isUndefined(facts.Nodes);
    });

    describe("with a network source", () => {
        it("names a network source and its address", async () => {
            const replay = await import("@graphty/graphty-element/session").then((m) => m.replayFetch(ndexRecordings));
            const realFetch = globalThis.fetch;
            vi.spyOn(globalThis, "fetch").mockImplementation((input, init) =>
                new URL(input instanceof Request ? input.url : input, location.href).origin ===
                "https://www.ndexbio.org"
                    ? replay(input, init)
                    : realFetch(input, init),
            );
            try {
                const session = await openProject();
                await session.data.import({ source: "ndex", config: { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" } });
                const [{ name }] = session.data.sources();
                const facts = await details(name ?? "NDEx");
                assert.strictEqual(facts.Type, "NDEx");
                assert.include(facts.Address, "ndexbio.org");
                assert.isDefined(facts.Retrieved);
                assert.match(facts.Nodes, /^57/);
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    it("shows no Retrieved for a project saved before it was kept", async () => {
        const session = await openProject();
        await session.project.open(
            JSON.stringify({
                kind: "graphty-document",
                version: 1,
                generator: { name: "graphty-element", version: "3.29.3" },
                requires: ["graphty-data", "graphty-session", "graphty-results"],
                members: [
                    {
                        kind: "graphty-data",
                        version: 1,
                        format: "json",
                        dialect: "node-link",
                        graph: { nodes: [{ id: "a" }], links: [] },
                        source: { type: "csv", config: {} },
                        sources: [
                            {
                                type: "csv",
                                name: "genes.csv",
                                config: {},
                                key: "s1",
                                kind: "file",
                                tables: [],
                                added: { nodes: 1, edges: 0 },
                            },
                        ],
                        provenance: { s1: { nodes: ["a"], edges: [] } },
                    },
                    { kind: "graphty-session", version: 1, config: {} },
                    { kind: "graphty-results", version: 1, runs: [] },
                    { kind: "graphty-sources", version: 1, loads: [] },
                ],
            }),
        );
        const facts = await details("genes.csv");
        assert.strictEqual(facts.Type, "File");
        assert.isUndefined(facts.Retrieved);
    });

    it("keeps Retrieved across a save and reopen", async () => {
        const session = await openProject();
        await session.data.import({ config: { file: new File([PEOPLE], "people.csv") }, name: "people.csv" });
        const [{ loadedAt }] = session.data.sources();
        assert.isDefined(loadedAt);
        const { text } = await session.project.save();
        await session.project.open(text);
        await waitFor(() => {
            assert.strictEqual(session.data.sources()[0]?.loadedAt, loadedAt);
        });
        await details("people.csv");
    });

    it("keeps the panel on its source through a Replace, with the new time", async () => {
        const session = await openProject();
        await session.data.import({ config: { file: new File([PEOPLE], "people.csv") }, name: "people.csv" });
        await session.data.import(
            { config: { file: new File(["id\nZed"], "other.csv") }, name: "other.csv" },
            { mode: "merge" },
        );
        const before = session.data.sources()[0];
        await details("people.csv");
        await waitFor(() => {
            assert.isAbove(Date.now(), new Date(before.loadedAt ?? 0).getTime());
        });
        await session.data.replaceSource(before.key, {
            config: { file: new File(["id\nAna\nBo"], "people.csv") },
            name: "people.csv",
        });
        await waitFor(() => {
            const after = session.data.sources().find((each) => each.key === before.key);
            assert.notStrictEqual(after?.loadedAt, before.loadedAt);
        });
        const heading = await screen.findByRole("complementary", { name: "Inspector" });
        await waitFor(() => {
            assert.include(heading.textContent, "people.csv");
            assert.include(heading.textContent, "File");
        });
    });
});
