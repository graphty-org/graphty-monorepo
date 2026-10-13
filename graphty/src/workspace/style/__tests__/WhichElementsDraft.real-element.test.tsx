/**
 * A new layer chooses its elements first, on the REAL graphty-element and the College football
 * sample: the draft shows the whole Which elements editor before anything is written, and the
 * first value paints only what the rule matched, named by its rule; the kind changes after the
 * layer is made; the rule editor reads every readable value, run results included; find says when
 * nothing matches; Escape on a draft discards it and gives focus back to the "+". Every count is
 * the element's, driven by real clicks and keys.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and loading the sample, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * Opens the College football sample from the start screen and waits for its 115 teams.
 * @returns the session and the store.
 */
async function openCollegeFootball(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    await userEvent.click(screen.getByRole("button", { name: "Open the College football sample" }));
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.equal(found?.data.statistics().nodeCount, 115);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return { session, store };
}

/**
 * The reader's own layers.
 * @param session - the element's session.
 * @returns the layers.
 */
function readerLayers(session: GraphSession): Layer[] {
    return session.styles.list().filter((l) => l.source.by === "user");
}

/** Clicks the tree's "+" and Add layer. */
async function addLayer(): Promise<void> {
    await userEvent.click(
        await screen.findByRole("button", { name: "Add a layer or a folder" }, { timeout: TIMEOUT_MS }),
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: "Add layer" }));
}

/**
 * Picks a kind in the open Which elements editor, by its label as a pointer does.
 * @param name - Nodes, Edges or Both.
 */
async function chooseKind(name: string): Promise<void> {
    const radio = within(screen.getByRole("radiogroup", { name: "Paints" })).getByRole("radio", { name });
    await userEvent.click(document.querySelector<HTMLElement>(`label[for="${radio.id}"]`) ?? radio);
}

/**
 * Picks an option of a select by clicking it open.
 * @param select - the select's text box.
 * @param option - the option's name.
 */
async function choose(select: HTMLElement, option: string): Promise<void> {
    await userEvent.click(select);
    await userEvent.click(await screen.findByRole("option", { name: option }));
}

/**
 * Opens a tree row's Style tab and its Which elements editor.
 * @param name - the row's visible name.
 */
async function openEditor(name: string): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${escaped}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    await userEvent.click(await screen.findByRole("button", { name: /^Which elements: / }, { timeout: TIMEOUT_MS }));
}

describe("a new layer chooses its elements first", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("finds 'State' in the draft, so Size 3 paints only those 24 teams, names the layer by its rule, and Both adds edges", async () => {
        const { session, store } = await openCollegeFootball();
        const before = readerLayers(session).length;
        await addLayer();
        await chooseKind("Nodes");

        const find = await screen.findByRole("combobox", { name: "Find elements" });
        await userEvent.click(find);
        await userEvent.keyboard("State");
        const live = await screen.findByRole("option", { name: /^.+ contains State, 24 nodes$/ });
        await userEvent.click(live);
        assert.equal(readerLayers(session).length, before, "picking the rule writes nothing yet");

        const tab = await screen.findByTestId("style-tab");
        await userEvent.click(await within(tab).findByRole("combobox", { name: /^Node size, / }));
        await userEvent.keyboard("3{Enter}");
        await waitFor(() => {
            assert.equal(readerLayers(session).length, before + 1, "the first value adds one layer");
        });
        const made = readerLayers(session).at(-1);
        assert.isDefined(made);
        assert.equal((made.set as Record<string, unknown> | undefined)?.["node.size"], 3);
        assert.equal(session.styles.counts(made.id).matched, 24, "only the matched teams change size");
        assert.include(made.name, "State", "named by its rule");

        // The new layer opens as its own row; its kind changes in place.
        await waitFor(() => {
            assert.equal(store.get().inspected?.kind, "layer-row");
        });
        await userEvent.click(await screen.findByRole("button", { name: /^Which elements: / }));
        await chooseKind("Both");
        await waitFor(() => {
            assert.isDefined(session.styles.parts(made.id)?.edge, "an edge part was added");
        });
        assert.isNull(store.get().notice, "no error");
        const edge = session.styles.parts(made.id)?.edge ?? "";
        assert.isAbove(session.styles.counts(edge).matched, 0, "the edges between the 24 teams");
    });

    it("Top N by a run's value: after Degree, Top 12 by its connections matches the 12 teams with the most", async () => {
        const { session, store } = await openCollegeFootball();
        await session.runs.start("degree");
        await session.styles.settled();
        const degree = session.data.readableValues().find((v) => v.from === "run" && v.on === "node");
        assert.isDefined(degree, "the run's value is readable");
        const layer = await session.styles.add({
            name: "Busy",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        store.set({ inspected: { kind: "layer-row", id: layer.id } });
        const style = await screen.findByRole("tab", { name: "Style" }, { timeout: TIMEOUT_MS });
        if (style.getAttribute("aria-selected") !== "true") {
            await userEvent.click(style);
        }
        await userEvent.click(await screen.findByRole("button", { name: /^Which elements: / }));

        await choose(screen.getByRole("combobox", { name: "Rule" }), "Top N by");
        const howMany = screen.getByRole("textbox", { name: "How many" });
        await userEvent.clear(howMany);
        // College football's degrees: 12 teams have 12 games, the most; a tie is taken whole and
        // only when it fits, so Top 12 is the smallest top that holds them.
        await userEvent.type(howMany, "12");
        await choose(screen.getByRole("combobox", { name: "By" }), degree.plainName);
        await waitFor(() => {
            assert.equal(session.styles.counts(layer.id).matched, 12);
        });
    });

    it("says when find matches nothing, and the Attribute list names the node id and an id column apart", async () => {
        const { session } = await openCollegeFootball();
        await addLayer();
        await chooseKind("Nodes");
        await userEvent.click(await screen.findByRole("combobox", { name: "Find elements" }));
        await userEvent.keyboard("Bob");
        await screen.findByText("No element matches Bob");

        await choose(screen.getByRole("combobox", { name: "Rule" }), "Where a value");
        await userEvent.click(screen.getByRole("button", { name: "Add condition" }));
        const attribute = within(screen.getByRole("group", { name: "Condition 1" })).getByRole("combobox", {
            name: "Attribute",
        });
        // Tab onto the list does not open it.
        screen.getByRole("combobox", { name: "Rule" }).focus();
        await userEvent.keyboard("{Tab}");
        assert.equal(document.activeElement, attribute);
        assert.isNull(screen.queryByRole("listbox", { name: "Attribute" }), "the list stays shut on Tab");

        await userEvent.click(attribute);
        const names = (await screen.findAllByRole("option")).map((option) => option.textContent);
        assert.include(names, "Node id");
        const columns = session.data.attributes().filter((a) => a.kind === "node" && a.name === "id");
        if (columns.length > 0) {
            assert.include(names, "id", "a data column named id is its own entry");
        }
    });

    it("Escape on a fresh draft discards it and puts focus on the Add button", async () => {
        const { session } = await openCollegeFootball();
        const before = JSON.stringify(session.styles.tree());
        await addLayer();
        const tree = screen.getByRole("tree", { name: "Style layers" });
        await within(tree).findByRole("treeitem", { name: /^New layer, layer/ });
        await waitFor(() => {
            assert.equal((document.activeElement as HTMLInputElement | null)?.type, "radio");
        });

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(within(tree).queryByRole("treeitem", { name: /^New layer, / }));
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Add a layer or a folder");
        });
        assert.equal(JSON.stringify(session.styles.tree()), before, "nothing was written");
    });

    it("a run's layer shows its rule like any other: Degree's condition reads its value", async () => {
        const { session } = await openCollegeFootball();
        const { runId } = await session.runs.start("degree");
        await session.styles.settled();
        const layer = session.runs
            .bindings(runId)
            .map((id) => session.styles.get(id))
            .find((l) => l !== undefined);
        assert.isDefined(layer);
        assert.equal(layer.selector.match, "has");
        const path = layer.selector.match === "has" ? layer.selector.path : "";
        const value = session.data.readableValues().find((v) => v.path === path);
        assert.isDefined(value);

        await openEditor(layer.name);
        const row = within(screen.getByRole("group", { name: "Condition 1" }));
        assert.equal(row.getByRole<HTMLInputElement>("combobox", { name: "Attribute" }).value, value.plainName);
        assert.equal(row.getByRole<HTMLInputElement>("combobox", { name: "Is" }).value, "has a value");
    });
});
