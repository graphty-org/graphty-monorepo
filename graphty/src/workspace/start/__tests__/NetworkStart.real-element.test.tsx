/**
 * Network data from the start page on the REAL graphty-element: Open network data pops up the kinds
 * of network, a card opens the app with the form on that kind, and closing the form stays in the
 * app, also across a reload; a refused Load stays in the form; and the Load network data
 * section holds one sample of each kind of source, each of which reads first and lands on the graph
 * with the Style panel up. Every step is real input; NDEx answers from its recording.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { defineSource, type GraphSession, registerSource, replayFetch } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { openBy } from "../../../test/open";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { clearRecent, rememberRecent } from "../../project/recent";
// What www.ndexbio.org answered for WikiPathways WP5483 (graph-io's scripts/record-ndex.ts).
import ndexRecordings from "../../server/__tests__/ndex-wp5483.json";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const NDEX = "https://www.ndexbio.org";
const WP5483 = "86719f5b-1439-11f0-9806-005056ae3c32";
const NETWORK_URL = `${NDEX}/v3/networks/${WP5483}`;

// A server small enough for Test's 25 node cap, read in memory.
registerSource(
    defineSource({
        id: "start-people",
        descriptor: { plainName: "Start people", defaultEndpoint: "https://people.example", params: [] },
        records: () =>
            Promise.resolve({ nodes: [{ id: "Ana" }, { id: "Bo" }], edges: [{ source: "Ana", target: "Bo" }] }),
    }),
);

/** What NDEx answers in a test. */
type Answer = (request: Request) => Promise<Response>;

/**
 * Answers every request to NDEx with this; every other request goes out as usual.
 * @param answer - NDEx's answer.
 * @returns the addresses NDEx was asked for, as they are asked.
 */
function stubNdex(answer: Answer): string[] {
    const asked: string[] = [];
    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
        const url = new URL(input instanceof Request ? input.url : input, location.href);
        if (url.origin !== NDEX) {
            return realFetch(input, init);
        }
        asked.push(url.href);
        return answer(new Request(input, init));
    });
    return asked;
}

/**
 * NDEx answering from its recording.
 * @returns the addresses it was asked for.
 */
function recordedNdex(): string[] {
    const replay = replayFetch(ndexRecordings);
    return stubNdex((request) => replay(request));
}

/**
 * Renders the start page and pops up the chooser from its button.
 * @returns the store and the chooser.
 */
async function openChooser(): Promise<{ store: WorkspaceStore; chooser: HTMLElement }> {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    await userEvent.click(await screen.findByRole("button", { name: "Open network data" }));
    return { store, chooser: await screen.findByRole("dialog", { name: "Open network data" }) };
}

/**
 * Renders the start page and opens the network form through the chooser.
 * @param kind - the card to pick.
 * @returns the store, the opened project's session and the form.
 */
async function openForm(kind: RegExp = /^NDEx/): Promise<{
    store: WorkspaceStore;
    session: GraphSession;
    form: HTMLElement;
}> {
    const { store, chooser } = await openChooser();
    await userEvent.click(within(chooser).getByRole("button", { name: kind }));
    const form = await screen.findByRole("form", { name: "Network data" });
    // The form draws once the project's session exists.
    const session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
        "graphty-element:not([data-start-page])",
    )?.session;
    assert.isDefined(session);
    return { store, session: session, form };
}

/**
 * Types WP5483's UUID into the form.
 * @param form - the form, on its first kind (NDEx).
 */
async function typeWp5483(form: HTMLElement): Promise<void> {
    await userEvent.type(within(form).getByRole("textbox", { name: "Network UUID" }), WP5483);
}

/**
 * Presses Load.
 * @param form - the form.
 */
async function pressLoad(form: HTMLElement): Promise<void> {
    await userEvent.click(within(form).getByRole("button", { name: "Load" }));
}

/**
 * Asserts the opened app shows the loaded graph on the graph place with the Style panel open.
 * @param store - the store.
 * @param session - the opened project's session.
 * @param nodes - how many nodes the graph holds.
 */
async function landedOnStylePanel(store: WorkspaceStore, session: GraphSession, nodes: number): Promise<void> {
    assert.strictEqual(session.data.statistics().nodeCount, nodes);
    assert.strictEqual(store.get().place, "graph");
    const inspector = await screen.findByRole("complementary", { name: "Inspector" });
    await waitFor(() => {
        assert.strictEqual(within(inspector).getByRole("tab", { name: "Style" }).getAttribute("aria-selected"), "true");
    });
    await screen.findByTestId("style-tab");
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    assert.strictEqual(
        within(tree)
            .getByRole("treeitem", { name: /^Everything, / })
            .getAttribute("aria-selected"),
        "true",
    );
}

describe("network data from the start page", () => {
    afterEach(async () => {
        vi.restoreAllMocks();
        await clearRecent();
    });

    it("pops up the four kinds of network, and nothing opens until one is picked", async () => {
        const { store, chooser } = await openChooser();
        assert.deepEqual(
            within(chooser)
                .getAllByRole("button")
                .map((button) => button.textContent)
                .slice(0, 5),
            [
                "",
                "NDNDExPublic biology networks",
                "N4jNeo4jRun a Cypher query",
                "SPSPARQL endpointRun a SPARQL query",
                "APIWeb APIJSON results as nodes and edges",
            ],
        );
        within(chooser).getByPlaceholderText("Web address of a graph file");
        within(chooser).getByRole("button", { name: /^Open a file/ });
        assert.isNull(store.get().project);
    });

    for (const [card, kind] of [
        [/^NDEx/, "NDEx"],
        [/^Neo4j/, "Neo4j"],
        [/^SPARQL/, "SPARQL endpoint"],
        [/^Web API/, "Web API"],
    ] as const) {
        it(`opens the app with the form on ${kind}, with no samples in it`, async () => {
            const { store, form } = await openForm(card);
            assert.strictEqual(store.get().project?.name, "Untitled");
            assert.strictEqual(store.get().place, "data");
            await waitFor(() => {
                assert.isNull(screen.queryByRole("dialog", { name: "Open network data" }));
            });
            assert.strictEqual(within(form).getByRole<HTMLInputElement>("combobox", { name: "Kind" }).value, kind);
            assert.isNull(within(form).queryByRole("combobox", { name: "Example" }));
            assert.isNull(within(form).queryByText("Example"));
        });
    }

    it("stays in the app when the form closes with nothing loaded, also after a reload", async () => {
        sessionStorage.clear();
        const store = createWorkspaceStore({ autosave: true });
        const first = render(<Workspace store={store} />);
        await userEvent.click(await screen.findByRole("button", { name: "Open network data" }));
        const chooser = await screen.findByRole("dialog", { name: "Open network data" });
        await userEvent.click(within(chooser).getByRole("button", { name: /^NDEx/ }));
        await screen.findByRole("form", { name: "Network data" });
        await userEvent.click(screen.getByRole("button", { name: "Close Network data" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Network data" }));
        });
        assert.strictEqual(store.get().project?.name, "Untitled");
        assert.isNull(screen.queryByRole("button", { name: "Open network data" }));

        // The reload: an empty project wrote nothing, and still comes back.
        first.unmount();
        const again = createWorkspaceStore({ autosave: true });
        render(<Workspace store={again} />);
        await waitFor(() => {
            assert.strictEqual(again.get().project?.name, "Untitled");
        });
        assert.strictEqual(again.get().place, "data");
        assert.isNull(screen.queryByRole("button", { name: "Open network data" }));
        sessionStorage.clear();
    });

    it("opens nothing when the chooser is closed with Escape, its X or the backdrop", async () => {
        const { store } = await openChooser();
        const closed = async (): Promise<void> => {
            await waitFor(() => {
                assert.isNull(screen.queryByRole("dialog", { name: "Open network data" }));
            });
            assert.isNull(store.get().project);
        };
        const reopen = async (): Promise<HTMLElement> => {
            await userEvent.click(screen.getByRole("button", { name: "Open network data" }));
            return screen.findByRole("dialog", { name: "Open network data" });
        };

        await userEvent.keyboard("{Escape}");
        await closed();
        await userEvent.click(within(await reopen()).getByRole("button", { name: "Close" }));
        await closed();
        await reopen();
        const backdrop = document.querySelector<HTMLElement>(".mantine-Modal-overlay");
        assert.isNotNull(backdrop);
        await userEvent.click(backdrop, { position: { x: 5, y: 5 } });
        await closed();
    });

    it("stops the Load and stays in the app when the form closes during it", async () => {
        let signal: AbortSignal | undefined;
        stubNdex((request) => {
            ({ signal } = request);
            return new Promise((_resolve, reject) => {
                request.signal.addEventListener("abort", () => {
                    reject(new DOMException("Aborted", "AbortError"));
                });
            });
        });
        const { store, form } = await openForm();
        await typeWp5483(form);
        await pressLoad(form);
        await waitFor(() => {
            assert.isDefined(signal);
        });
        await userEvent.click(screen.getByRole("button", { name: "Close Network data" }));
        await waitFor(() => {
            assert.isTrue(signal?.aborted);
        });
        assert.isNotNull(store.get().project);
        assert.isNull(screen.queryByRole("button", { name: "Open network data" }));
        assert.isNull(store.get().notice);
    });

    it("loads into the opened project, where the form lands on the Data place", async () => {
        const asked = recordedNdex();
        const { store, session, form } = await openForm();
        await typeWp5483(form);
        assert.lengthOf(asked, 0, "typing reads nothing");
        await pressLoad(form);
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Network data" }));
        });
        assert.strictEqual(session.data.statistics().nodeCount, 57);
        assert.strictEqual(store.get().place, "data");
        assert.lengthOf(
            asked.filter((url) => url === NETWORK_URL),
            1,
            "the network is read once",
        );
    });

    it("keeps the sign-in typed into the form for the project", async () => {
        recordedNdex();
        const { store, session, form } = await openForm();
        await userEvent.type(within(form).getByRole("textbox", { name: "User" }), "reader");
        await userEvent.type(within(form).getByLabelText("Password"), "hunter2");
        await typeWp5483(form);
        await pressLoad(form);
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Network data" }));
        });
        assert.strictEqual(session.data.loads()[0]?.credential?.username, "reader");
        assert.notInclude(JSON.stringify(store.get()), "hunter2");
        const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        );
        assert.isDefined(await element?.credentials.lookup("ndex", NDEX, "default"));
    });

    it("keeps the form open with the server's refusal", async () => {
        stubNdex(() => Promise.resolve(new Response("{}", { status: 401 })));
        const { session, form } = await openForm();
        await typeWp5483(form);
        await pressLoad(form);
        const chip = await waitFor(() => {
            const found = form.querySelector('[data-code="E_SOURCE_AUTH"]');
            assert.isNotNull(found);
            return found;
        });
        assert.include(chip?.textContent, "sign-in refused");
        assert.lengthOf(session.data.sources(), 0);
        assert.isNotNull(screen.getByRole("form", { name: "Network data" }));
    });

    it("keeps the form open when the server cannot be reached", async () => {
        stubNdex(() => Promise.reject(new TypeError("Failed to fetch")));
        const { session, form } = await openForm();
        await typeWp5483(form);
        await pressLoad(form);
        await waitFor(() => {
            assert.include(form.querySelector("[data-error]")?.textContent, "unreachable or blocked");
        });
        assert.lengthOf(session.data.sources(), 0);
        assert.isNotNull(screen.getByRole("form", { name: "Network data" }));
    });

    it("previews a network larger than the preview, and names the size past the Limit", async () => {
        recordedNdex();
        const { form } = await openForm();
        await typeWp5483(form);
        await userEvent.click(within(form).getByRole("button", { name: "Test" }));
        const preview = await within(form).findByRole("group", { name: "Preview" });
        assert.include(preview.textContent, "25+");
        assert.isNull(form.querySelector("[data-error]"));

        const limit = within(form).getByLabelText("Limit");
        await userEvent.clear(limit);
        await userEvent.type(limit, "10");
        await userEvent.click(within(form).getByRole("button", { name: "Test" }));
        await waitFor(() => {
            assert.strictEqual(form.querySelector("[data-error]")?.textContent, "57 nodes: over Limit");
        });
    });

    it("closes only the dropdown on Escape, keeping what was typed", async () => {
        const { form } = await openForm();
        await typeWp5483(form);
        await userEvent.click(within(form).getByRole("combobox", { name: "Kind" }));
        await screen.findByRole("option", { name: "Start people" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("option", { name: "Start people" }));
        });
        assert.strictEqual(screen.getByRole<HTMLInputElement>("textbox", { name: "Network UUID" }).value, WP5483);

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Network data" }));
        });
    });

    it("puts Database with the sign-in, above Limit", async () => {
        const { form } = await openForm();
        await userEvent.click(within(form).getByRole("combobox", { name: "Kind" }));
        await userEvent.click(await screen.findByRole("option", { name: /^Neo4j/ }));
        const database = await within(form).findByRole("textbox", { name: "Database" });
        const limit = within(form).getByLabelText("Limit");
        assert.isTrue(Boolean(database.compareDocumentPosition(limit) & Node.DOCUMENT_POSITION_FOLLOWING));
    });

    it("offers Open network data to a returning reader", async () => {
        await rememberRecent({ id: "a", name: "Trade routes", nodes: 40, at: 1 });
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await screen.findByRole("heading", { level: 1, name: "Welcome back." });
        await userEvent.click(await screen.findByRole("button", { name: "Open network data" }));
        await screen.findByRole("dialog", { name: "Open network data" });
        assert.isNull(store.get().project);
    });

    it("shows one sample of each kind of source, before Generate a graph", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        const section = await screen.findByRole("region", { name: "Load network data" });
        const generators = screen.getByRole("region", { name: "Generate a graph" });
        assert.isTrue(
            Boolean(section.compareDocumentPosition(generators) & Node.DOCUMENT_POSITION_FOLLOWING),
            "before the generators",
        );
        const tiles = within(section).getAllByRole("button");
        assert.deepEqual(
            tiles.map((tile) => tile.getAttribute("aria-label")),
            [
                "Load network data: WikiPathways WP5483",
                "Load network data: Neo4j demo: movies",
                "Load network data: UniProt: TP53's protein interactions",
                "Load network data: deps.dev: webpack 5.90.0",
            ],
        );
        assert.deepEqual(
            tiles.map((tile) => tile.querySelector(".ws-land-sample-t")?.textContent),
            ["NDEx", "Neo4j", "SPARQL endpoint", "Web API"],
        );
        assert.include(tiles[0]?.textContent, "57 nodes, 34 edges");
        assert.match(
            tiles[3]?.querySelector("img")?.getAttribute("src") ?? "",
            /samples\/network-rest\.webp$/,
            "a real picture of the graph",
        );
        assert.isNotNull(screen.getByRole("button", { name: "Network" }), "its field filter");
    });

    it("opens a tile on the graph with the Style panel", async () => {
        recordedNdex();
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        const tile = await screen.findByRole("button", { name: "Load network data: WikiPathways WP5483" });
        const session = await openBy(store, () => userEvent.click(tile));
        await landedOnStylePanel(store, session, 57);
        assert.strictEqual(store.get().project?.name, "WikiPathways WP5483");
    });

    it("reads a tile's server before anything opens, showing the tile as busy", async () => {
        const replay = replayFetch(ndexRecordings);
        let release: () => void = () => undefined;
        const held = new Promise<void>((resolve) => {
            release = resolve;
        });
        stubNdex(async (request) => {
            await held;
            return replay(request);
        });
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        const tile = await screen.findByRole("button", { name: "Load network data: WikiPathways WP5483" });
        const session = await openBy(store, async () => {
            await userEvent.click(tile);
            await waitFor(() => {
                assert.strictEqual(tile.getAttribute("aria-busy"), "true");
            });
            assert.isNull(store.get().project, "nothing opens while the server is read");
            release();
        });
        await landedOnStylePanel(store, session, 57);
    });

    it("stops a tile's read when the reader opens something else", async () => {
        let signal: AbortSignal | undefined;
        stubNdex((request) => {
            ({ signal } = request);
            return new Promise((_resolve, reject) => {
                request.signal.addEventListener("abort", () => {
                    reject(new DOMException("Aborted", "AbortError"));
                });
            });
        });
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await userEvent.click(await screen.findByRole("button", { name: "Load network data: WikiPathways WP5483" }));
        await waitFor(() => {
            assert.isDefined(signal);
        });
        await openBy(store, () =>
            userEvent.click(screen.getByRole("button", { name: /^Open the Zachary's karate club sample/ })),
        );
        await waitFor(() => {
            assert.isTrue(signal?.aborted);
        });
        assert.strictEqual(store.get().project?.name, "Zachary's karate club");
        assert.isNull(store.get().notice);
    });

    it("stays on the start page with a notice when a tile's server refuses, and a retry clears it", async () => {
        const replay = replayFetch(ndexRecordings);
        let refuse = true;
        stubNdex((request) => (refuse ? Promise.resolve(new Response("{}", { status: 500 })) : replay(request)));
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        const tile = await screen.findByRole("button", { name: "Load network data: WikiPathways WP5483" });
        await userEvent.click(tile);
        await waitFor(() => {
            assert.isTrue(store.get().notice?.error);
        });
        assert.isNull(store.get().project);
        assert.isNotNull(screen.getByRole("button", { name: "Open network data" }));

        refuse = false;
        const session = await openBy(store, () => userEvent.click(tile));
        await landedOnStylePanel(store, session, 57);
        assert.isNull(store.get().notice);
    });
});
