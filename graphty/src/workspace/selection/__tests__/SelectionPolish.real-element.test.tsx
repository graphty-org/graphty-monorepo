/**
 * The selection editor's polish rounds (design/ui/studio/tier5/decided.md) on the REAL
 * graphty-element, driven by real clicks, keys and hovers: a yes-or-no value picked removes and
 * selects nothing until Yes or No, a data column named rank is listed, a text step takes the
 * reader's typing, "And..." adds a step with the group's verb after a group's first, a value with no test shows no
 * test in its pane, an edge step reading a node value can take either end (in Advanced), a So far
 * step's pane draws its test, a filter card is named as its rows say it, "Or..." then Escape leaves
 * no group, the key names a single group by the selection's title, hovering a group row marks it,
 * and the style tree's rows move with Mod+[ and Mod+].
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, RuleTree, Selector } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Every experiment stays off here.
withFeatures([]);

/**
 * Opens the selection's workspace from the Style tab's Style Nodes... line (issue #6810): a style
 * layer's selection is read and edited there, never in the sidebar.
 * @returns the workspace.
 */
async function openWs(): Promise<HTMLElement> {
    if (document.querySelector(".sel-ws") === null) {
        await userEvent.click(await screen.findByRole("button", { name: /^Style (Nodes|Edges)\.\.\./ }));
    }
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        return found;
    });
}
/**
 * Starts a new step, its value picker open: an empty None selection's Condition row; else, with
 * the workspace closed, Edit (a selection with no step opens on its new step's pane); then the
 * new step's Value field, or the selected row's pane button And... (spec 3.0, 3.2).
 * @param scope - where to look.
 */
async function startCondition(scope?: HTMLElement): Promise<void> {
    const where = scope ?? document.querySelector<HTMLElement>(".sel-ws") ?? document.body;
    const row = within(where).queryByRole("treeitem", { name: /^(And|Add)\.\.\.$/ });
    if (row !== null) {
        await userEvent.click(row);
        return;
    }
    if (document.querySelector(".sel-ws") === null) {
        await userEvent.click(
            within(where).getAllByRole("button", { name: /^(Edit |Style (Nodes|Edges)\.\.\.)/ })[0] ?? document.body,
        );
    }
    const control = await waitFor(() => {
        const ws = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(ws, "the workspace is open");
        const found =
            within(ws ?? document.body).queryByRole("button", { name: "Value" }) ??
            within(ws ?? document.body).queryByRole("button", { name: /^(And|Add)\.\.\.$/ });
        assert.isNotNull(found, "a new step's Value field or And...");
        return found;
    });
    await userEvent.click(control);
}

/**
 * The workspace on a place, with a graph read in.
 * @param place - the place to open on.
 * @param load - reads the graph.
 * @returns The session.
 */
async function open(
    place: "data" | undefined,
    load: (session: GraphSession) => Promise<unknown>,
): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({
        project: { name: "Untitled", id: 1 },
        ...(place === undefined ? {} : { place }),
    });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await load(session);
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return session;
}

const lesMis = (place?: "data"): Promise<GraphSession> =>
    open(place, (session) =>
        session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } }),
    );

/**
 * A reader's layer, selected in the style tree: its Which outline is drawn.
 * @param session - The session.
 * @param name - Its name.
 * @param selector - What it picks.
 * @param target - Nodes or edges.
 * @returns The layer.
 */
async function openLayer(
    session: GraphSession,
    name: string,
    selector: Selector,
    target: "node" | "edge" = "node",
): Promise<Layer> {
    const layer = await session.styles.add({
        name,
        target,
        selector,
        set: target === "node" ? { "node.color": "#d55e00" } : { "edge.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-editor"));
    });
    return layer;
}

/**
 * Picks a value in the open value picker by typing its name and pressing Enter.
 * @param name - What to type.
 */
async function pickValue(name: string): Promise<void> {
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard(name);
    await userEvent.keyboard("{Enter}");
}

const DEGREE_6_TO_10: RuleTree = { kind: "range", attribute: "graphty.degree", min: 6, max: 10 };

describe("the value picker and the cards a value opens", () => {
    it("a text card puts focus in its text box, so typing fills it", async () => {
        const session = await lesMis();
        await openLayer(session, "Named", { match: "everything" });
        await startCondition();
        await pickValue("name");
        await waitFor(() => {
            const active = document.activeElement;
            assert.isTrue(active instanceof HTMLInputElement && !active.readOnly, "a box to type in has focus");
        });
        await userEvent.keyboard("Val");
        assert.equal((document.activeElement as HTMLInputElement).value, "Val");
    });

    it("a step computed on So far draws its test from its own values, never Computing", async () => {
        const session = await lesMis();
        await openLayer(session, "Top so far", {
            match: "rule",
            where: {
                kind: "union",
                side: "nodes",
                within: "visible",
                branches: [
                    {
                        id: "a",
                        start: "all",
                        steps: [
                            { id: "deg", op: "keep", rule: DEGREE_6_TO_10 },
                            {
                                id: "top",
                                op: "keep",
                                rule: { kind: "measure", algorithm: "degree", field: "value" },
                                computedOn: "so-far",
                            },
                        ],
                    },
                ],
            },
        });
        await openWs();
        const row = await waitFor(() => {
            const found = document.querySelector<HTMLElement>('[data-row="top"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(row?.querySelector(".sel-value") ?? document.body);
        const card = await waitFor(() => {
            const found = document.querySelector<HTMLElement>('[data-step-pane="top"]');
            assert.isNotNull(found);
            return found;
        });
        if (card === null) {
            return;
        }
        await within(card).findByRole("textbox", { name: /from, number$/ });
        assert.notInclude(card.textContent ?? "", "Computing");
    });
});

describe("the editor's verbs, groups and words", () => {
    it("a filter card is named as its rows say its steps", async () => {
        const session = await lesMis("data");
        const valjean = session.data.nodes().find((each) => session.data.name(each.id) === "Valjean")?.id;
        await session.visibility.addCondition({
            id: "near",
            effect: "keep",
            rule: {
                kind: "union",
                side: "nodes",
                within: "graph",
                branches: [
                    {
                        start: "none",
                        steps: [{ op: "add", rule: { kind: "hops", of: { nodes: [valjean ?? ""] }, max: 1 } }],
                    },
                ],
            },
        });
        const card = await screen.findByRole("group", { name: /^Within 1 hop of / });
        assert.match(card.getAttribute("aria-label") ?? "", /^Within 1 hop of /);
        assert.notInclude(card.getAttribute("aria-label") ?? "", "a rule");
    });
});

describe("the style tree's reorder keys", () => {
    it("Mod+[ moves a row up its list and Mod+] down, as a selection's rows", async () => {
        const session = await lesMis();
        const paint = { "node.color": "#0072b2" };
        const low = await session.styles.add({
            name: "Low",
            target: "node",
            selector: { match: "everything" },
            set: paint,
        });
        const high = await session.styles.add({
            name: "High",
            target: "node",
            selector: { match: "everything" },
            set: paint,
        });
        await session.styles.settled();
        const order = (): string[] =>
            session.styles
                .list()
                .filter((each) => each.id === low.id || each.id === high.id)
                .map((each) => each.name);
        assert.deepEqual(order(), ["Low", "High"], "bottom first");
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Low, / }));
        // Figma: Ctrl+] brings forward (up the drawn list), Ctrl+[ sends backward.
        await userEvent.keyboard("{Control>}]{/Control}");
        await waitFor(() => {
            assert.deepEqual(order(), ["High", "Low"], "Low moved up the drawn list");
        });
        await userEvent.keyboard("{Control>}[[{/Control}");
        await waitFor(() => {
            assert.deepEqual(order(), ["Low", "High"], "and back down");
        });
    });
});
