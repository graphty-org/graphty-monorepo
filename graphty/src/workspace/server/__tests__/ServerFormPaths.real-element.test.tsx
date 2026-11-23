/**
 * The network data form's less traveled paths on the REAL graphty-element: a Limit of 0, an enum
 * set back to Default, a decimal param, a required API key, a Start the app has no word for, Test
 * with a typed endpoint and key, Expand switched off, a second load into a graph that holds one,
 * Test and Load pressed again while a read runs, an edit that keeps or renames its source, a list
 * param drawn as text, and a received project's loads waiting for Approve. Every server is a source
 * registered in this test, read in memory, so nothing reaches the network. Every step is real
 * input; every assertion reads the element or what is drawn.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { createGraphSession, defineSource, type GraphSession, registerSource } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The element, as the tag map names it. */
type ElementTag = HTMLElementTagNameMap["graphty-element"];

/** What the probe server was last asked. */
const probed: { params?: Record<string, unknown>; calls: number } = { calls: 0 };

/** A server with no default endpoint, a required API key, a Start, a value-less enum and a decimal param. */
const PROBE = "test-probe-server";

registerSource(
    defineSource({
        id: PROBE,
        descriptor: {
            plainName: "Probe server",
            auth: ["api-key"],
            authRequired: "required",
            apiKey: { query: "key" },
            features: ["expand"],
            params: [
                {
                    name: "mode",
                    plainName: "Mode",
                    type: "enum",
                    values: [
                        { value: "sample", label: "A sample" },
                        { value: "all", label: "All of it" },
                    ],
                },
                {
                    name: "format",
                    plainName: "Format",
                    type: "enum",
                    values: [
                        { value: "json", label: "JSON" },
                        { value: "xml", label: "XML" },
                    ],
                },
                { name: "order", plainName: "Order", type: "enum" },
                { name: "weight", plainName: "Weight", type: "number" },
            ],
        },
        records: (params: Record<string, unknown>) => {
            probed.params = params;
            probed.calls++;
            return Promise.resolve({ nodes: [{ id: "p0" }, { id: "p1" }], edges: [{ source: "p0", target: "p1" }] });
        },
        expand: (_request, _sink, ctx) => Promise.resolve(ctx.finish({ next: null })),
    }),
);

/** A server that answers only once the test releases it, counting each read. */
const GATED = "test-gated-server";
const gated = { calls: 0 };
let open: () => void = () => undefined;
const opened = new Promise<void>((resolve) => {
    open = resolve;
});

registerSource(
    defineSource({
        id: GATED,
        descriptor: { plainName: "Gated server", defaultEndpoint: "https://gated.example", params: [] },
        records: async () => {
            gated.calls++;
            await opened;
            return { nodes: [{ id: "g0" }], edges: [] };
        },
    }),
);

/** A server with a default endpoint and one text param, whose loads the tests edit. */
const RETOLD = "test-retold-server";

registerSource(
    defineSource({
        id: RETOLD,
        descriptor: {
            plainName: "Retold server",
            defaultEndpoint: "https://retold.example",
            params: [{ name: "tags", plainName: "Tags", type: "string" }],
        },
        records: (params: Record<string, unknown>) => {
            const { tags } = params;
            const ids = Array.isArray(tags) ? tags.map(String) : (typeof tags === "string" ? tags : "t").split(",");
            return Promise.resolve({ nodes: ids.map((id) => ({ id: id.trim() })), edges: [] });
        },
    }),
);

/** Whether the held server refuses to read, as a server that is down does. */
const held = { refuse: false };

/** A server with no default endpoint, which reads until it is told to refuse. */
const HELD = "test-held-server";

registerSource(
    defineSource({
        id: HELD,
        descriptor: { plainName: "Held server", params: [] },
        records: () =>
            held.refuse
                ? Promise.reject(Object.assign(new Error("down"), { code: "E_SOURCE_TIMEOUT" }))
                : Promise.resolve({ nodes: [{ id: "h0" }], edges: [] }),
    }),
);

/**
 * Renders the workspace on the Data place with a project open and waits for the element.
 * @returns the session.
 */
async function openDataPlace(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Server", id: 1 }, place: "data" })} />);
    return waitFor(() => {
        const found = document.querySelector<ElementTag>("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
}

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
 * Waits for the Network data form to close.
 */
async function formClosed(): Promise<void> {
    await waitFor(() => {
        assert.isNull(screen.queryByRole("form", { name: "Network data" }));
    });
}

/**
 * Opens the Inspector on a source row and presses Edit source.
 * @param name - the row's name.
 * @returns the form.
 */
async function editSource(name: string | RegExp): Promise<HTMLElement> {
    const row = await screen.findByRole("listitem", { name });
    await userEvent.click(row.querySelector(".dp-source-main") ?? row);
    const panel = await screen.findByRole("complementary", { name: "Inspector" });
    await userEvent.click(await within(panel).findByRole("button", { name: "Edit source" }));
    return screen.findByRole("form", { name: "Network data" });
}

describe("the network data form's other rows", () => {
    it("tests with a typed endpoint and key, and loads with no cap, Default and no expansion", async () => {
        const session = await openDataPlace();
        const form = await openForm();
        await pick(form, "Kind", "Probe server");

        // A key the source requires asks for a key, not an optional one.
        assert.strictEqual(within(form).getByLabelText("API key").getAttribute("placeholder"), "key");
        // A Start the app has no word for keeps the source's own.
        assert.isNotNull(within(form).getByRole("radio", { name: "A sample" }));
        assert.isNotNull(within(form).getByRole("radio", { name: "Everything" }));
        // An enum with no values offers only Default.
        await userEvent.click(within(form).getByRole("combobox", { name: "Order" }));
        const listbox = await screen.findByRole("listbox");
        assert.deepEqual(
            within(listbox)
                .getAllByRole("option")
                .map((each) => each.textContent),
            ["Default"],
        );
        await userEvent.keyboard("{Escape}");

        await pick(form, "Format", "XML");
        await pick(form, "Format", "Default");
        await userEvent.type(within(form).getByRole("textbox", { name: "Weight" }), "2.5{Tab}");

        const testButton = within(form).getByRole<HTMLButtonElement>("button", { name: "Test" });
        assert.isTrue(testButton.disabled, "no endpoint and no default, no Test");
        await userEvent.type(within(form).getByRole("textbox", { name: "Endpoint" }), "https://probe.example");
        await userEvent.type(within(form).getByLabelText("API key"), "k-123");
        await userEvent.click(testButton);
        await within(form).findByRole("group", { name: "Preview" });
        assert.strictEqual(probed.calls, 1);

        // A Limit of 0 caps nothing, and shows as none.
        const limit = within(form).getByLabelText<HTMLInputElement>("Limit");
        await userEvent.clear(limit);
        await userEvent.type(limit, "0{Tab}");
        assert.strictEqual(limit.value, "");
        // Expand on double-click off takes the expansion rows away.
        await userEvent.click(within(form).getByRole("checkbox", { name: "Expand on double-click" }));
        assert.isNull(within(form).queryByLabelText("Depth"));

        await userEvent.click(within(form).getByRole("button", { name: "Load" }));
        await formClosed();
        assert.lengthOf(session.data.nodes(), 2);
        assert.deepEqual(probed.params, { mode: "sample", weight: 2.5 });
        const settings = session.data.sourceSettings(session.data.sources()[0].key);
        assert.isUndefined(settings?.limits?.maxNodes, "a blank Limit caps nothing");
        assert.isUndefined(settings?.expand, "no expansion once it is switched off");
        assert.strictEqual(settings?.endpoint, "https://probe.example/", "the typed endpoint");
        assert.strictEqual(session.data.loads()[0]?.credential?.kind, "api-key");
    });

    it("joins a second load onto the graph that holds the first", async () => {
        const session = await openDataPlace();
        for (const tags of ["a,b", "c"]) {
            const form = await openForm();
            await pick(form, "Kind", "Retold server");
            await userEvent.type(within(form).getByRole("textbox", { name: "Tags" }), tags);
            await userEvent.click(within(form).getByRole("button", { name: "Load" }));
            await formClosed();
        }
        assert.lengthOf(session.data.sources(), 2);
        assert.sameMembers(
            session.data.nodes().map((each) => String(each.id)),
            ["a", "b", "c"],
        );
    });

    it("starts no second read when Test or Load is pressed while one runs", async () => {
        const session = await openDataPlace();
        const form = await openForm();
        await pick(form, "Kind", "Gated server");
        const testButton = within(form).getByRole("button", { name: "Test" });
        const loadButton = within(form).getByRole("button", { name: "Load" });
        await userEvent.click(testButton);
        await waitFor(() => {
            assert.equal(testButton.getAttribute("aria-disabled"), "true");
        });
        // Test keeps focus while it reads; Enter presses it again, and Enter in the Endpoint submits Load.
        await userEvent.keyboard("{Enter}");
        await userEvent.click(within(form).getByRole("textbox", { name: "Endpoint" }));
        await userEvent.keyboard("{Enter}");
        assert.strictEqual(gated.calls, 1, "one read, the first Test's");
        assert.equal(loadButton.getAttribute("aria-disabled"), "true");
        open();
        await within(form).findByRole("group", { name: "Preview" });
        assert.lengthOf(session.data.sources(), 0, "the Load pressed while busy loaded nothing");
    });
});

describe("editing a network load", () => {
    it("keeps the source's name for the same read and renames it for a changed one", async () => {
        const session = await openDataPlace();
        await session.data.import({ source: RETOLD, config: { tags: "a" }, name: "My retold" });

        // The same read with the Endpoint cleared, so the default answers: the name stays.
        let form = await editSource("My retold");
        await userEvent.clear(within(form).getByRole("textbox", { name: "Endpoint" }));
        await userEvent.click(within(form).getByRole("button", { name: "Load" }));
        await formClosed();
        assert.strictEqual(session.data.sources()[0].name, "My retold");

        // A changed read is named as a new load from the form is.
        form = await editSource("My retold");
        const tags = within(form).getByRole("textbox", { name: "Tags" });
        await userEvent.clear(tags);
        await userEvent.type(tags, "b");
        await userEvent.click(within(form).getByRole("button", { name: "Load" }));
        await formClosed();
        await screen.findByRole("listitem", { name: /^Retold server/ });
        assert.isDefined(session.data.node("b"));
    });

    it("draws a list param as comma-separated text", async () => {
        const session = await openDataPlace();
        await session.data.import({ source: RETOLD, config: { tags: ["x", "y"] }, name: "Listed" });
        const form = await editSource("Listed");
        assert.strictEqual(within(form).getByRole<HTMLInputElement>("textbox", { name: "Tags" }).value, "x, y");
    });
});

describe("a received project's network loads", () => {
    it("wait for Approve, named by kind and host, and say why an approved one failed", async () => {
        // The project, saved by another session: one load with an address, one with none.
        // The address goes on the first load: a second load of the same source and params
        // keeps the first one's endpoint (#9705).
        const other = createGraphSession();
        await other.data.import({ source: HELD, config: {} }, { endpoint: "https://held.example/graph" });
        await other.data.import({ source: HELD, config: {} }, { mode: "merge" });
        assert.sameMembers(
            other.data.sources().map((each) => other.data.sourceSettings(each.key)?.endpoint ?? null),
            [null, "https://held.example/graph"],
        );
        const { text } = await other.project.save();
        other.dispose();

        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await commands.chooseNextFile("received.graphty.json", "application/json", text);
        await userEvent.click(await screen.findByRole("button", { name: /^Open a file/ }));
        await waitFor(() => {
            assert.match(store.get().notice?.message ?? "", /^Opened /);
        });
        await userEvent.click(screen.getByRole("button", { name: "Data" }));

        const list = await screen.findByRole("list", { name: "Waiting loads" });
        const reopened = document.querySelector<ElementTag>("graphty-element")?.session;
        assert.sameMembers(reopened?.data.pendingSourceLoads().map((each) => each.endpoint) ?? [], [
            null,
            "https://held.example/graph",
        ]);
        const rows = within(list).getAllByRole("listitem");
        assert.sameMembers(
            rows.map((each) => each.getAttribute("aria-label")),
            ["Held server", "Held server held.example"],
        );

        held.refuse = true;
        const bare = within(list).getByRole("listitem", { name: "Held server" });
        await userEvent.click(within(bare).getByRole("button", { name: "Approve" }));
        await waitFor(() => {
            assert.isNotNull(bare.querySelector("[data-code]"));
        });
    });
});
