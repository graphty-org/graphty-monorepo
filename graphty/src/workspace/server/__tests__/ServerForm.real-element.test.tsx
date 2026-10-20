/**
 * Server sources on the REAL graphty-element (spec section 3.9, acceptance flows 11 and 12): the
 * Sources "+" > Server... pop-over, Test showing preview rows, Load with a limit, the row's Load
 * more, the canvas node menu's Expand... and Collapse, Refresh, and NDEx with no Load more. The
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

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

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

/**
 * Renders the workspace on the Data place with a project open and waits for the element.
 * @returns the element and its session.
 */
async function openDataPlace(): Promise<{ element: ElementTag; session: GraphSession }> {
    const store = createWorkspaceStore({ project: { name: "Server", id: 1 }, place: "data" });
    render(<Workspace store={store} />);
    let element: ElementTag | null = null;
    await waitFor(
        () => {
            element = document.querySelector("graphty-element");
            assert.isDefined(element?.session);
        },
        { timeout: TIMEOUT_MS },
    );
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

    it("tests, loads with a limit, loads more, expands, collapses and refreshes", async () => {
        const { element, session } = await openDataPlace();

        await userEvent.click(await screen.findByRole("button", { name: "Add source" }, { timeout: TIMEOUT_MS }));
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

        await userEvent.click(within(form).getByRole("button", { name: "Load" }));
        await waitFor(() => {
            assert.lengthOf(session.data.nodes(), PAGE);
        });
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Server" }), "the form closes once loaded");
        });

        const row = await screen.findByRole("listitem", { name: /^People server/ });
        await userEvent.click(within(row).getByRole("button", { name: "Load more" }));
        await waitFor(() => {
            assert.lengthOf(session.data.nodes(), 2 * PAGE);
        });

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
            assert.isNotNull(screen.queryByText(/changed/));
        });
    });

    it("offers no Load more for a server that sends its graph whole, as NDEx does", async () => {
        const { session } = await openDataPlace();
        await session.data.import(
            { source: WHOLE, config: {}, name: "Whole" },
            { limits: { maxNodes: 1, onLimit: "stop" } },
        );
        const row = await screen.findByRole("listitem", { name: "Whole" }, { timeout: TIMEOUT_MS });
        await userEvent.hover(row);
        assert.isNotNull(within(row).getByRole("button", { name: "Refresh" }));
        assert.isNull(within(row).queryByRole("button", { name: "Load more" }));
    });

    it("offers no Sign in, Start or Expand rows a source cannot use", async () => {
        await openDataPlace();
        await userEvent.click(await screen.findByRole("button", { name: "Add source" }, { timeout: TIMEOUT_MS }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Server..." }));
        const form = await screen.findByRole("form", { name: "Server" });
        await pick(form, "Kind", "OpenAlex");
        assert.isNull(within(form).queryByRole("radio", { name: "Query" }), "OpenAlex has no Start");
        assert.isNull(within(form).queryByLabelText("Password"));
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
});
