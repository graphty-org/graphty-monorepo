/**
 * Server sources on the REAL graphty-element (spec section 3.9, acceptance flows 11 and 12): the
 * Sources "+" > Server... pop-over, Test showing preview rows, Load with a limit, the row's Load
 * more, the canvas node menu's Expand... and Collapse, Refresh, NDEx with no Load more, an API key
 * and a counted load's "10 of 171". The
 * server is a source registered in this test, read in memory, so nothing reaches the network.
 * Every step is real input; every assertion reads the element or what is drawn.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { credentials, defineSource, type GraphSession, registerSource } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The element, as the tag map names it. */
type ElementTag = HTMLElementTagNameMap["graphty-element"];

/** The test server: 50 people in pages of 10, each knowing the next; three more neighbors each. */
const SERVER = "test-people-server";
const PEOPLE = 50;
const PAGE = 10;

registerSource(
    defineSource({
        id: SERVER,
        descriptor: {
            plainName: "People server",
            defaultEndpoint: "https://people.example",
            auth: ["basic"],
            authRequired: "optional",
            features: ["expand", "page"],
            params: [
                { name: "query", plainName: "Query", type: "query", language: "cypher" },
                {
                    name: "mode",
                    plainName: "Mode",
                    type: "enum",
                    values: [
                        { value: "query", label: "Query" },
                        { value: "all", label: "Everything" },
                    ],
                },
            ],
        },
        async *records(_params, ctx) {
            for (let page = Number(ctx.cursor?.page ?? 0); page * PAGE < PEOPLE; page++) {
                const ids = Array.from({ length: PAGE }, (_, i) => page * PAGE + i);
                yield await Promise.resolve({
                    nodes: ids.map((i) => ({ id: `p${String(i)}`, name: `Person ${String(i)}`, age: 20 + i })),
                    edges: ids.slice(1).map((i) => ({ source: `p${String(i - 1)}`, target: `p${String(i)}` })),
                    next: (page + 1) * PAGE < PEOPLE ? { page: page + 1 } : null,
                });
            }
        },
        expand(request, sink, ctx) {
            for (const id of request.ids) {
                for (let k = 0; k < 3; k++) {
                    const friend = `${String(id)}-friend${String(k)}`;
                    sink.addNodeRecord(friend, { name: friend });
                    sink.addEdgeRecord(id, friend, {});
                }
            }
            return Promise.resolve(ctx.finish({ next: null }));
        },
    }),
);

/** What the settings server was last asked. */
const edited: { query?: string } = {};

/** A server with a query and a sign-in, which answers with one node per comma-separated name in the query. */
const EDITABLE = "test-editable-server";

registerSource(
    defineSource({
        id: EDITABLE,
        descriptor: {
            plainName: "Editable server",
            defaultEndpoint: "https://editable.example",
            auth: ["basic"],
            authRequired: "optional",
            params: [
                { name: "query", plainName: "Query", type: "query", language: "cypher" },
                {
                    name: "mode",
                    plainName: "Mode",
                    type: "enum",
                    values: [
                        { value: "query", label: "Query" },
                        { value: "all", label: "Everything" },
                    ],
                },
                { name: "database", plainName: "Database", type: "string" },
            ],
        },
        records: (params: Record<string, unknown>) => {
            edited.query = String(params.query);
            return Promise.resolve({
                nodes: String(params.query)
                    .split(",")
                    .map((id) => ({ id })),
                edges: [],
            });
        },
    }),
);

/** A server whose query lives in undeclared template values, as a Web API's does. */
const TEMPLATED = "test-templated-server";

registerSource(
    defineSource({
        id: TEMPLATED,
        descriptor: {
            plainName: "Templated server",
            defaultEndpoint: "https://templated.example",
            params: [{ name: "mapping", plainName: "Mapping", type: "text" }],
        },
        records: (params: Record<string, unknown>) =>
            Promise.resolve({ nodes: [{ id: String(params.package) }], edges: [] }),
    }),
);

/** A server that sends its graph whole, as NDEx and STRING do: it cannot page. */
const WHOLE = "test-whole-server";

registerSource(
    defineSource({
        id: WHOLE,
        descriptor: { plainName: "Whole server", params: [], features: ["expand"] },
        records: () =>
            Promise.resolve({ nodes: [{ id: "w0" }, { id: "w1" }], edges: [{ source: "w0", target: "w1" }] }),
        expand: (_request, _sink, ctx) => Promise.resolve(ctx.finish({ next: null })),
    }),
);

/** A server that answers only once the test releases it, so a test can look at a busy form. */
const SLOW = "test-slow-server";
let release: () => void = () => undefined;
const released = new Promise<void>((resolve) => {
    release = resolve;
});

registerSource(
    defineSource({
        id: SLOW,
        descriptor: { plainName: "Slow server", defaultEndpoint: "https://slow.example", params: [] },
        records: async () => {
            await released;
            return { nodes: [{ id: "s0" }], edges: [] };
        },
    }),
);

/** A server that takes an API key in its query, as OpenAlex does, and reads nothing from the network. */
const KEYED = "test-keyed-server";

registerSource(
    defineSource({
        id: KEYED,
        descriptor: {
            plainName: "Keyed server",
            defaultEndpoint: "https://keyed.example",
            auth: ["api-key"],
            authRequired: "optional",
            apiKey: { query: "key" },
            params: [],
        },
        records: () => Promise.resolve({ nodes: [{ id: "k0" }, { id: "k1" }], edges: [] }),
    }),
);

/** A server that counts what it holds, as Neo4j's count store does: 10 of its 171 nodes a page. */
const COUNTED = "test-counted-server";

registerSource(
    defineSource({
        id: COUNTED,
        descriptor: { plainName: "Counted server", params: [], features: ["page"] },
        import: (_params, sink, ctx) => {
            for (let i = 0; i < 10; i++) {
                sink.addNodeRecord(`c${String(i)}`, {});
            }
            return Promise.resolve(ctx.finish({ next: { page: 1 }, total: { nodes: 171 } }));
        },
    }),
);

/** A server that is out of quota: it answers 429 to every request it gets. */
const BUSY = "test-busy-server";
const BUSY_ENDPOINT = "https://busy.example";

registerSource(
    defineSource({
        id: BUSY,
        descriptor: { plainName: "Busy server", defaultEndpoint: BUSY_ENDPOINT, params: [] },
        records: async (_params, ctx) => {
            await ctx.fetchJson("/graph");
            return { nodes: [], edges: [] };
        },
    }),
);

/**
 * Opens the server form from the Sources "+".
 * @returns the form.
 */
async function openForm(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: "Add source" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Network data..." }));
    return screen.findByRole("form", { name: "Network data" });
}

/**
 * Renders the workspace on the Data place with a project open and waits for the element.
 * @returns the element and its session.
 */
async function openDataPlace(): Promise<{ element: ElementTag; session: GraphSession }> {
    const store = createWorkspaceStore({ project: { name: "Server", id: 1 }, place: "data" });
    render(<Workspace store={store} />);
    let element: ElementTag | null = null;
    await waitFor(() => {
        element = document.querySelector("graphty-element");
        assert.isDefined(element?.session);
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    const found: ElementTag = element;
    return { element: found, session: found.session };
}

/**
 * Picks an option of a dropdown in the form by clicking it open and clicking the option.
 * @param form - the form.
 * @param label - the dropdown's label.
 * @param option - the option's text.
 */
async function pick(form: HTMLElement, label: string, option: string): Promise<void> {
    await userEvent.click(within(form).getByRole("combobox", { name: label }));
    // The list opens in a portal, outside the form.
    await userEvent.click(await screen.findByRole("option", { name: option }));
}

/**
 * A point on a node the element says is that node, in CSS pixels from the element's corner.
 * @param element - the element.
 * @param node - the node.
 * @returns the point.
 */
async function pointOn(element: ElementTag, node: string): Promise<{ x: number; y: number }> {
    await element.waitForStableFrame();
    const at = element.nodeScreenPosition(node);
    assert.isTrue(at?.visible, `${node} is on screen`);
    const point = { x: at?.x ?? 0, y: at?.y ?? 0 };
    assert.deepEqual(element.elementAt(point), { kind: "node", id: node });
    return point;
}

/**
 * Opens a workspace with one network load, and shows that load in the right panel.
 * @param source - the load.
 * @returns the session, and the right panel.
 */
async function openLoaded(source: {
    source: string;
    config: Record<string, unknown>;
}): Promise<{ session: GraphSession; panel: HTMLElement }> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Edit", id: 1 }, place: "data" })} />);
    const session = await waitFor(() => {
        const found = document.querySelector<ElementTag>("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    await session.data.import(source);
    const row = await screen.findByRole("listitem", { name: /server/ });
    await userEvent.click(row.querySelector(".dp-source-main") ?? row);
    const panel = await screen.findByRole("complementary", { name: "Inspector" });
    await within(panel).findByRole("button", { name: "Edit source" });
    return { session, panel };
}

describe("editing a network source", () => {
    withFeatures(["network-data"]);

    it("shows what it fetches, opens the form filled in, and Load replaces it in place; Undo restores", async () => {
        const { session, panel } = await openLoaded({
            source: EDITABLE,
            config: { mode: "query", query: "a,b", database: "people" },
        });
        const [{ key }] = session.data.sources();
        await within(panel).findByText("Database");
        within(panel).getByText("people");
        within(panel).getByText("a,b");

        await userEvent.click(within(panel).getByRole("button", { name: "Edit source" }));
        const form = await screen.findByRole("form", { name: "Network data" });
        const query = within(form).getByRole<HTMLTextAreaElement>("textbox", { name: "Query" });
        assert.strictEqual(query.value, "a,b");
        assert.strictEqual(within(form).getByRole<HTMLInputElement>("textbox", { name: "Database" }).value, "people");
        assert.strictEqual(within(form).getByLabelText<HTMLInputElement>("Password").value, "");
        assert.isTrue(within(form).getByRole<HTMLInputElement>("combobox", { name: "Kind" }).disabled);

        await userEvent.clear(query);
        await userEvent.type(query, "x,y,z");
        await userEvent.click(within(form).getByRole("button", { name: "Load" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Network data" }));
        });
        assert.strictEqual(edited.query, "x,y,z");
        assert.strictEqual(session.data.statistics().nodeCount, 3);
        assert.strictEqual(session.data.sources()[0].key, key);

        await userEvent.click(await screen.findByRole("button", { name: "Undo" }));
        await waitFor(() => {
            assert.strictEqual(session.data.sourceSettings(key)?.config.query, "a,b");
        });
        assert.strictEqual(session.data.statistics().nodeCount, 2);
    });

    it("keeps a Web API's template values, shown and sent back", async () => {
        const { session, panel } = await openLoaded({
            source: TEMPLATED,
            config: { mapping: { nodes: "$" }, package: "webpack", version: "5" },
        });
        within(panel).getByText("package");
        await userEvent.click(within(panel).getByRole("button", { name: "Edit source" }));
        const form = await screen.findByRole("form", { name: "Network data" });
        const field = within(form).getByRole<HTMLInputElement>("textbox", { name: "package" });
        assert.strictEqual(field.value, "webpack");
        await userEvent.clear(field);
        await userEvent.type(field, "vite");
        await userEvent.click(within(form).getByRole("button", { name: "Load" }));
        await waitFor(() => {
            assert.isDefined(session.data.node("vite"));
        });
        assert.strictEqual(session.data.sourceSettings(session.data.sources()[0].key)?.config.version, "5");
    });

    it("shows no secret from a mapping in the panel or the form", async () => {
        const { panel } = await openLoaded({
            source: TEMPLATED,
            config: { mapping: { requests: { nodes: { path: "/p?api_key=sekrit&page=1" } } } },
        });
        assert.notInclude(panel.textContent, "sekrit");
        await userEvent.click(within(panel).getByRole("button", { name: "Edit source" }));
        const form = await screen.findByRole("form", { name: "Network data" });
        assert.notInclude(within(form).getByRole<HTMLTextAreaElement>("textbox", { name: "Mapping" }).value, "sekrit");
    });

    it("reuses the remembered login when the password is left empty", async () => {
        const { panel, session } = await openLoaded({ source: EDITABLE, config: { query: "a,b" } });
        const element = document.querySelector<ElementTag>("graphty-element");
        await element?.credentials.remember(
            { source: EDITABLE, endpoint: "https://editable.example" },
            credentials.basic("reader", "hunter2"),
        );
        await userEvent.click(within(panel).getByRole("button", { name: "Edit source" }));
        const form = await screen.findByRole("form", { name: "Network data" });
        // A load saved with a query and no Start still shows its query.
        assert.strictEqual(within(form).getByRole<HTMLTextAreaElement>("textbox", { name: "Query" }).value, "a,b");
        await userEvent.click(within(form).getByRole("button", { name: "Load" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Network data" }));
        });
        assert.strictEqual(session.data.loads()[0]?.credential?.username, "reader");
        assert.notInclude(JSON.stringify(session.data.sourceSettings(session.data.sources()[0].key)), "hunter2");
    });

    it("offers no edit for a file", async () => {
        render(<Workspace store={createWorkspaceStore({ project: { name: "Edit", id: 1 }, place: "data" })} />);
        const session = await waitFor(() => {
            const found = document.querySelector<ElementTag>("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        });
        await session.data.import({ type: "csv", config: { data: "source,target\na,b\n" }, name: "ships.csv" });
        const row = await screen.findByRole("listitem", { name: /ships/ });
        await userEvent.click(row.querySelector(".dp-source-main") ?? row);
        const panel = await screen.findByRole("complementary", { name: "Inspector" });
        await within(panel).findByText("Type");
        assert.isNull(within(panel).queryByRole("button", { name: "Edit source" }));
    });
});

describe("server sources on the real element", () => {
    withFeatures(["network-data"]);

    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it("opens Network data... from an open project, on NDEx, the first listed", async () => {
        await openDataPlace();
        const form = await openForm();
        await waitFor(() => {
            assert.equal(within(form).getByRole<HTMLInputElement>("combobox", { name: "Kind" }).value, "NDEx");
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Network data" }));
        });
    });

    it("tests, loads with a limit, loads more, expands, collapses and refreshes", async () => {
        const { element, session } = await openDataPlace();

        await userEvent.click(await screen.findByRole("button", { name: "Add source" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Network data..." }));
        const form = await screen.findByRole("form", { name: "Network data" });
        await pick(form, "Kind", "People server");
        // A server with a Start shows it; Query is its first, with the query box.
        assert.isNotNull(within(form).getByRole("radio", { name: "Query" }));
        assert.isNotNull(within(form).getByRole("textbox", { name: "Query" }));
        assert.isNotNull(within(form).getByRole("checkbox", { name: "Expand on double-click" }));
        const limit = within(form).getByRole("spinbutton", { name: "Limit" });
        await userEvent.clear(limit);
        // A number field commits on Tab, Enter or blur.
        await userEvent.type(limit, "10{Tab}");

        await userEvent.click(within(form).getByRole("button", { name: "Test" }));
        const preview = await within(form).findByRole("group", { name: "Preview" });
        assert.include(preview.textContent, "Person 0");
        assert.isNotNull(within(preview).getByRole("list", { name: "Columns" }));
        assert.lengthOf(session.data.sources(), 0, "Test loads nothing");
        // The preview wraps inside the pop-over; it never widens it past Load.
        const dialog = screen.getByRole("dialog", { name: "Network data" });
        assert.isAtMost(dialog.getBoundingClientRect().width, 360);
        const loadButton = within(form).getByRole("button", { name: "Load" });
        assert.isAtMost(loadButton.getBoundingClientRect().right, window.innerWidth);

        await userEvent.click(within(form).getByRole("button", { name: "Load" }));
        await waitFor(() => {
            assert.lengthOf(session.data.nodes(), PAGE);
        });
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Network data" }), "the form closes once loaded");
        });

        const row = await screen.findByRole("listitem", { name: /^People server/ });
        // The load takes focus to its new row.
        await waitFor(() => {
            assert.strictEqual(document.activeElement, row.querySelector(".dp-source-main"));
        });
        await userEvent.hover(row);
        await userEvent.click(within(row).getByRole("button", { name: "Load more" }));
        await waitFor(() => {
            assert.lengthOf(session.data.nodes(), 2 * PAGE);
        });
        // A receipt names what Load more brought.
        await screen.findByText(`+${String(PAGE)} nodes`, { selector: ".cm-toast-message" });

        // The node menu: Expand... with its rows, then Collapse.
        await userEvent.click(element, { button: "right", position: await pointOn(element, "p0") });
        await userEvent.click(await screen.findByRole("menuitem", { name: /Expand/ }));
        await userEvent.click(await screen.findByRole("button", { name: "Expand" }));
        await waitFor(() => {
            assert.isDefined(session.data.node("p0-friend0"));
        });
        await userEvent.click(element, { button: "right", position: await pointOn(element, "p0") });
        await userEvent.click(await screen.findByRole("menuitem", { name: "Collapse" }));
        await waitFor(() => {
            assert.isUndefined(session.data.node("p0-friend0"));
        });

        // A double-click expands, as the form asked.
        await userEvent.dblClick(element, { position: await pointOn(element, "p1") });
        await waitFor(() => {
            assert.isDefined(session.data.node("p1-friend2"));
        });

        await userEvent.hover(row);
        await userEvent.click(within(row).getByRole("button", { name: "Refresh" }));
        await waitFor(() => {
            assert.isNotNull(screen.queryByText(/changed/, { selector: ".cm-toast-message" }));
        });
    });

    it("offers no Load more for a server that sends its graph whole, as NDEx does", async () => {
        const { session } = await openDataPlace();
        await session.data.import(
            { source: WHOLE, config: {}, name: "Whole" },
            { limits: { maxNodes: 1, onLimit: "stop" } },
        );
        const row = await screen.findByRole("listitem", { name: "Whole" });
        await userEvent.hover(row);
        assert.isNotNull(within(row).getByRole("button", { name: "Refresh" }));
        assert.isNull(within(row).queryByRole("button", { name: "Load more" }));
    });

    it("sends a typed API key, remembers it on this machine and saves only its slot", async () => {
        const { element, session } = await openDataPlace();
        const form = await openForm();
        await pick(form, "Kind", "Keyed server");
        assert.isNull(within(form).queryByLabelText("Password"), "a key, not a sign-in");
        await userEvent.type(within(form).getByLabelText("API key"), "sekret-key");
        await userEvent.click(within(form).getByRole("button", { name: "Load" }));
        await waitFor(() => {
            assert.lengthOf(session.data.nodes(), 2);
        });

        assert.strictEqual(session.data.loads()[0]?.credential?.kind, "api-key");
        const remembered = await element.credentials.lookup(KEYED, "https://keyed.example");
        assert.strictEqual(remembered?.kind, "api-key");
        const { text } = await session.project.save();
        assert.match(text, /"credentialSlot":\s*"default"/);
        assert.notInclude(text, "sekret-key", "the key is never in the project");
    });

    it("shows a counted server load as 10 of 171 on its row's node chip", async () => {
        const { session } = await openDataPlace();
        await session.data.import({ source: COUNTED, config: {}, name: "Counted" });
        const row = await screen.findByRole("listitem", { name: "Counted" });
        await waitFor(() => {
            assert.strictEqual(row.querySelector('.dp-source-chips [data-kind="node"]')?.textContent, "Node 10 of 171");
        });
    });

    it("offers no Sign in, Start or Expand rows a source cannot use", async () => {
        await openDataPlace();
        await userEvent.click(await screen.findByRole("button", { name: "Add source" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Network data..." }));
        const form = await screen.findByRole("form", { name: "Network data" });
        await pick(form, "Kind", "OpenAlex");
        assert.isNull(within(form).queryByRole("radio", { name: "Query" }), "OpenAlex has no Start");
        assert.isNull(within(form).queryByLabelText("Password"));
        assert.isNotNull(within(form).getByLabelText("API key"), "OpenAlex takes an optional API key");
        assert.isNotNull(within(form).getByRole("textbox", { name: "Work" }));

        await pick(form, "Kind", "Neo4j");
        assert.isNull(within(form).queryByRole("combobox", { name: "Example" }), "samples are never in the form");
        assert.isNotNull(within(form).getByRole("textbox", { name: "User" }));
        await userEvent.click(within(form).getByText("Seed nodes"));
        assert.isNotNull(within(form).getByRole("textbox", { name: "Seed ids" }));
        assert.isNull(within(form).queryByRole("textbox", { name: "Query" }));

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Network data" }));
        });
    });

    it("enables Test and Load only once the endpoint is filled", async () => {
        await openDataPlace();
        const form = await openForm();
        await pick(form, "Kind", "Neo4j");
        const testButton = within(form).getByRole<HTMLButtonElement>("button", { name: "Test" });
        const loadButton = within(form).getByRole<HTMLButtonElement>("button", { name: "Load" });
        assert.isTrue(testButton.disabled, "no endpoint, no Test");
        assert.isTrue(loadButton.disabled, "no endpoint, no Load");
        await userEvent.type(within(form).getByRole("textbox", { name: "Endpoint" }), "https://neo4j.example");
        assert.isFalse(testButton.disabled);
        assert.isFalse(loadButton.disabled);

        // Rarely used rows are drawn in the form too: nothing folds or opens from it.
        assert.isNotNull(within(form).queryByRole("textbox", { name: "Database" }));
        assert.isNull(within(form).queryByRole("button", { name: /Advanced/ }));
        assert.isNull(within(form).queryByRole("button", { name: "Expand settings" }));
        assert.isNotNull(within(form).getByLabelText("Expand limit"));
    });

    it("names the server that answered on the failure chip", async () => {
        const realFetch = globalThis.fetch;
        // Only the busy server's requests are answered here; nothing reaches the network.
        const busy = vi
            .spyOn(globalThis, "fetch")
            .mockImplementation((input, init) =>
                new URL(input instanceof Request ? input.url : input, location.href).origin === BUSY_ENDPOINT
                    ? Promise.resolve(new Response("", { status: 429, headers: { "retry-after": "0" } }))
                    : realFetch(input, init),
            );
        try {
            await openDataPlace();
            const form = await openForm();
            await pick(form, "Kind", "Busy server");
            await userEvent.click(within(form).getByRole("button", { name: "Test" }));
            const chip = await waitFor(() => {
                const found = form.querySelector('[data-code="E_SOURCE_QUOTA"]');
                assert.isNotNull(found);
                return found;
            });
            assert.strictEqual(chip?.textContent, "too many requests: busy.example");
        } finally {
            busy.mockRestore();
        }
    });

    it("keeps focus on Test while it reads", async () => {
        await openDataPlace();
        const form = await openForm();
        await pick(form, "Kind", "Slow server");
        const testButton = within(form).getByRole("button", { name: "Test" });
        await userEvent.click(testButton);
        await waitFor(() => {
            assert.equal(testButton.getAttribute("aria-disabled"), "true");
        });
        assert.equal(document.activeElement, testButton);
        release();
        await within(form).findByRole("group", { name: "Preview" });
        await waitFor(() => {
            assert.equal(testButton.getAttribute("aria-disabled"), "false");
        });
    });
});
