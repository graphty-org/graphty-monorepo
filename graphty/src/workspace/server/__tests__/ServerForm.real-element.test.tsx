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

import { defineSource, type GraphSession, registerSource } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

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

/**
 * Opens the server form from the Sources "+".
 * @returns the form.
 */
async function openForm(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: "Add source" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Server..." }));
    return screen.findByRole("form", { name: "Server" });
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
    await userEvent.click(await within(form).findByRole("option", { name: option }));
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

describe("server sources on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it("opens Network data... from an open project, and each card opens the form on its own kind", async () => {
        await openDataPlace();
        for (const [card, kind] of [
            ["Web API", "Web API"],
            ["NDEx", "NDEx"],
        ] as const) {
            await userEvent.click(await screen.findByRole("button", { name: "Add source" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Network data..." }));
            const dialog = await screen.findByRole("dialog", { name: "Open network data" });
            // The address box has a label the reader can see.
            assert.isNotNull(within(dialog).getByText("Web address"));
            await userEvent.click(within(dialog).getByRole("button", { name: new RegExp(`^${card}`) }));
            const form = await screen.findByRole("form", { name: "Server" });
            await waitFor(() => {
                assert.equal(within(form).getByRole<HTMLInputElement>("combobox", { name: "Kind" }).value, kind);
            });
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.isNull(screen.queryByRole("form", { name: "Server" }));
            });
        }
    });

    it("adds a graph file at a web address to the open project from Network data...", async () => {
        const { session } = await openDataPlace();
        await userEvent.click(await screen.findByRole("button", { name: "Add source" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Network data..." }));
        const dialog = await screen.findByRole("dialog", { name: "Open network data" });
        const address = within(dialog).getByRole("textbox", { name: /Web address/ });
        await userEvent.type(address, `${new URL("/samples/karate.gml", location.href).href}{Enter}`);
        // The project stays open and the file is taken in as its source, not opened as a new project.
        await waitFor(() => {
            assert.deepEqual(
                session.data.sources().map((source) => source.name),
                ["karate.gml"],
            );
            assert.lengthOf(session.data.nodes(), 34);
        });
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Open network data" }));
        });
        assert.strictEqual(document.querySelector("graphty-element")?.session, session);
    });

    it("tests, loads with a limit, loads more, expands, collapses and refreshes", async () => {
        const { element, session } = await openDataPlace();

        await userEvent.click(await screen.findByRole("button", { name: "Add source" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Server..." }));
        const form = await screen.findByRole("form", { name: "Server" });
        await pick(form, "Kind", "People server");
        // A server with a Start shows it; Query is its first, with the query box.
        assert.isNotNull(within(form).getByRole("radio", { name: "Query" }));
        assert.isNotNull(within(form).getByRole("textbox", { name: "Query" }));
        assert.isNotNull(within(form).getByRole("checkbox", { name: "on double-click" }));
        const limit = within(form).getByRole("textbox", { name: "Limit" });
        await userEvent.clear(limit);
        await userEvent.type(limit, "10");

        await userEvent.click(within(form).getByRole("button", { name: "Test" }));
        const preview = await within(form).findByRole("group", { name: "Preview" });
        assert.include(preview.textContent, "Person 0");
        assert.isNotNull(within(preview).getByRole("list", { name: "Columns" }));
        assert.lengthOf(session.data.sources(), 0, "Test loads nothing");
        // The preview wraps inside the pop-over; it never widens it past Load.
        const dialog = screen.getByRole("dialog", { name: "Server" });
        assert.isAtMost(dialog.getBoundingClientRect().width, 360);
        const loadButton = within(form).getByRole("button", { name: "Load" });
        assert.isAtMost(loadButton.getBoundingClientRect().right, window.innerWidth);

        await userEvent.click(within(form).getByRole("button", { name: "Load" }));
        await waitFor(() => {
            assert.lengthOf(session.data.nodes(), PAGE);
        });
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Server" }), "the form closes once loaded");
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
        await userEvent.click(await screen.findByRole("menuitem", { name: "Server..." }));
        const form = await screen.findByRole("form", { name: "Server" });
        await pick(form, "Kind", "OpenAlex");
        assert.isNull(within(form).queryByRole("radio", { name: "Query" }), "OpenAlex has no Start");
        assert.isNull(within(form).queryByLabelText("Password"));
        assert.isNotNull(within(form).getByLabelText("API key"), "OpenAlex takes an optional API key");
        assert.isNotNull(within(form).getByRole("textbox", { name: "Work" }));

        await pick(form, "Kind", "Neo4j");
        await pick(form, "Example", "Neo4j demo: movies");
        assert.equal(
            within(form).getByRole<HTMLInputElement>("textbox", { name: "Endpoint" }).value,
            "https://demo.neo4jlabs.com:7473",
        );
        assert.equal(within(form).getByRole<HTMLInputElement>("textbox", { name: "User" }).value, "movies");
        await userEvent.click(within(form).getByText("Seed nodes"));
        assert.isNotNull(within(form).getByRole("textbox", { name: "Seed ids" }));
        assert.isNull(within(form).queryByRole("textbox", { name: "Query" }));

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Server" }));
        });
    });

    it("enables Test and Load only once the endpoint is filled, and keeps the Start an example does not own", async () => {
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

        // Rarely used rows wait in Advanced.
        assert.isNull(within(form).queryByRole("textbox", { name: "Database" }));
        await pick(form, "Example", "Hetionet");
        await pick(form, "Example", "Neo4j demo: movies");
        assert.isTrue(within(form).getByRole<HTMLInputElement>("radio", { name: "Query" }).checked);
        await userEvent.click(within(form).getByRole("button", { name: /Advanced/ }));
        assert.equal(within(form).getByRole<HTMLInputElement>("textbox", { name: "Database" }).value, "movies");
        assert.equal(
            within(form).getByRole<HTMLInputElement>("combobox", { name: "Transport" }).value,
            "",
            "Hetionet's Bolt does not carry over",
        );
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
