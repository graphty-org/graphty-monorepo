/**
 * The app's searchable lists on the REAL graphty-element, driven by real keys: Vary by opens with
 * nothing active, so Enter binds nothing; a name that starts with the typed text ranks first; a
 * yes-or-no column wears the yes-or-no icon and a column of node ids is one "Node id" row under
 * Structure, as Add a condition lists it; a value typed on the other kind's tab is pointed there;
 * the analysis filter matches the words its entries show and never makes a disabled one active; the
 * Analyze popover keeps its place as its list shrinks; and a filter step's text box lists every value
 * that matches.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { findValuePicker, render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceState } from "../../state/store";
import { Workspace } from "../../Workspace";
import { FIND_ATTRIBUTE } from "../words";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** Volunteers: an id column kept as data, a yes-or-no, a number, and edges that carry a kind. */
const NODES = ["Ana", "Bo", "Cy", "Di", "Ed", "Flo"].map((name, i) => ({
    id: `v${String(i)}`,
    // Spells each node's own id: the element marks it as holding node ids.
    vid: `v${String(i)}`,
    name,
    online: i % 2 === 0,
    donations: i * 1000,
}));
const EDGES = [
    { src: "v0", dst: "v1", kind: "family" },
    { src: "v1", dst: "v2", kind: "work" },
    { src: "v2", dst: "v3", kind: "family" },
];

/**
 * The workspace on the real element, with a graph in it.
 * @param initial - the store's starting state.
 * @param load - puts the graph in.
 * @returns the session.
 */
async function open(
    initial: Partial<WorkspaceState>,
    load: (session: GraphSession) => Promise<unknown>,
): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Lists", id: 1 }, ...initial });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
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
    await session.styles.settled();
    return session;
}

/**
 * Loads the volunteers.
 * @param session - the session.
 */
async function volunteers(session: GraphSession): Promise<void> {
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
}

/**
 * The Lucide icon class an option draws, such as "lucide-toggle-right".
 * @param option - the option.
 * @returns the class, or undefined.
 */
function iconOf(option: HTMLElement): string | undefined {
    return [...(option.querySelector("svg")?.classList ?? [])].find((c) => c.startsWith("lucide-") && c !== "lucide");
}

/**
 * The name an option is read by, before its fact.
 * @param option - the option.
 * @returns the name.
 */
const nameOf = (option: HTMLElement): string =>
    (option.getAttribute("aria-label") ?? option.textContent ?? "").split(", ")[0];

describe("the app's lists", () => {
    it("Vary by opens with nothing active and Enter binds nothing; one icon and one id row as in Add a condition", async () => {
        const session = await open({}, volunteers);
        await session.styles.add({
            name: "Plain",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#cccccc" },
        });
        await session.styles.settled();
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Plain, / }));
        const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        const fill = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('.ws-row[data-line="node.color"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.hover(fill);
        await userEvent.click(within(fill).getByRole("button", { name: "Node color by attribute" }));
        const picker = await findValuePicker();
        const search = within(picker).getByRole("combobox");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, search);
        });
        assert.isNull(search.getAttribute("aria-activedescendant"), "nothing is active on open");
        assert.isNull(picker.querySelector("[data-highlighted]"), "no row is drawn active");
        await userEvent.keyboard("{Enter}");
        const bound = (): boolean =>
            session.styles.list().some((layer) => {
                const binding = layer.encode?.["node.color"];
                return binding !== undefined && "by" in binding;
            });
        assert.isFalse(bound(), "Enter on open colors by nothing");

        // The yes-or-no column wears its own icon; the id column is "Node id", under Structure.
        const onRecord = within(picker).getByRole("option", { name: /^online(,|$)/ });
        assert.strictEqual(iconOf(onRecord), "lucide-toggle-right");
        assert.isNull(within(picker).queryByRole("option", { name: /^vid(,|$)/ }), "the id column is not 'vid'");
        const structure = within(picker).getByRole("group", { name: "Structure" });
        assert.deepEqual(within(structure).getAllByRole("option").map(nameOf), ["Node id"]);

        // A name that starts with the typed text ranks first, and is the active one.
        await userEvent.keyboard("on");
        await waitFor(() => {
            const names = within(picker).getAllByRole("option").map(nameOf);
            assert.strictEqual(names[0], "online", "a name that starts with it first");
            assert.strictEqual(
                search.getAttribute("aria-activedescendant"),
                within(picker).getAllByRole("option")[0].id,
            );
        });
    });

    it("Add a condition: prefix first, the same icons and Node id, and an edge value pointed to the Edge tab", async () => {
        const session = await open({}, volunteers);
        await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
        await session.styles.add({
            name: "Mine",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#d55e00" },
        });
        await session.styles.settled();
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Mine, / }));
        if (screen.queryByRole("group", { name: "Which nodes" }) === null) {
            await userEvent.click(
                await screen.findByRole("button", { name: /^Which nodes, / }, { timeout: TIMEOUT_MS }),
            );
        }
        const region = await screen.findByRole("group", { name: "Which nodes" });
        // A layer with no condition opens its Add a condition list with the picker.
        if (screen.queryByRole("combobox", { name: FIND_ATTRIBUTE }) === null) {
            await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
        }
        const search = await screen.findByRole("combobox", { name: FIND_ATTRIBUTE });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, search);
        });
        const list = await screen.findByRole("listbox", { name: "Attributes" });
        assert.strictEqual(iconOf(within(list).getByRole("option", { name: /^online(,|$)/ })), "lucide-toggle-right");
        within(list).getByRole("option", { name: /^Node id(,|$)/ });

        await userEvent.keyboard("on");
        await waitFor(() => {
            const options = within(list).getAllByRole("option");
            assert.strictEqual(nameOf(options[0]), "online");
            assert.strictEqual(search.getAttribute("aria-activedescendant"), options[0].id);
        });

        await userEvent.clear(search);
        await userEvent.keyboard("kind");
        await screen.findByText("kind is an edge attribute; it is on the Edge tab");
    });

    it("the analysis filter matches its shown words, never activates a disabled entry, and keeps its place", async () => {
        await open({}, (session) =>
            session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } }),
        );
        const tools = await screen.findByRole("toolbar", { name: "Canvas tools" }, { timeout: TIMEOUT_MS });
        await userEvent.click(within(tools).getByRole("button", { name: /^Analyze/ }));
        const filter = await screen.findByRole("combobox", { name: "Filter analyses" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, filter);
        });
        const list = screen.getByRole("listbox", { name: "Analyses" });
        assert.isNull(filter.getAttribute("aria-activedescendant"), "nothing is active before typing");
        const { top } = filter.getBoundingClientRect();

        for (const word of ["connected", "most"]) {
            await userEvent.clear(filter);
            await userEvent.keyboard(word);
            await waitFor(() => {
                within(list).getByRole("option", { name: "Degree" });
            });
            const active = document.getElementById(filter.getAttribute("aria-activedescendant") ?? "");
            assert.isNotNull(active, `"${word}" makes an entry active`);
            assert.notStrictEqual(
                active?.getAttribute("aria-disabled"),
                "true",
                `"${word}" never activates a disabled entry`,
            );
        }
        await userEvent.clear(filter);
        await userEvent.keyboard("louvain");
        await waitFor(() => {
            assert.lengthOf(within(list).getAllByRole("option"), 1);
        });
        assert.closeTo(filter.getBoundingClientRect().top, top, 1, "the filter box stays where it opened");
    });

    it("a filter card's text box lists every value that holds the typed text", async () => {
        const names = [
            ...Array.from({ length: 30 }, (_, i) => `Other ${String(i)}`),
            ...Array.from({ length: 12 }, (_, i) => `Mme ${String.fromCharCode(65 + i)}`),
        ];
        await open({ place: "data" }, (session) =>
            session.data.addNodes(names.map((name, i) => ({ id: `n${String(i)}`, name }))),
        );
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }, { timeout: TIMEOUT_MS }));
        await userEvent.click(await screen.findByRole("option", { name: /^name(,|$)/ }));
        const is = await screen.findByRole("combobox", { name: "name: text to match" });
        await userEvent.type(is, "Mme");
        await waitFor(() => {
            assert.lengthOf(screen.getAllByRole("option", { name: /^Mme / }), 12);
        });
    });
});
