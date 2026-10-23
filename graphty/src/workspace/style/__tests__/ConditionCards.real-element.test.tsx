/**
 * The combined Style panel on the REAL graphty-element and Les Miserables, driven by real clicks
 * and keys: Node and Edge tabs whose arrows change nothing in the layer; each kind's Which picker,
 * collapsed to a row of chips and opened to typed condition cards (number, category, text,
 * yes-or-no), each writing its rule leaf, its chip counting what the element's `scope.count`
 * counts; Escape keeps an edit and one Undo takes the whole open back; Style edges on a layer that
 * picks nodes paints the edges between them, and a node card moves them; on a folder of group
 * layers a card they share edits every layer in one step, a card whose values differ reads
 * <<Layer>> and is read-only, and a card added to all of them survives a re-run; a rule the cards
 * cannot draw opens as the rule in words ("Rule: ...") and is left as it was.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, RuleTree, Selector } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { cardFields } from "../cards";

/**
 * Les Miserables in the workspace, with the starting rows.
 * @returns The session.
 */
async function openSample(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return session;
}

/**
 * A reader's layer at the top of the stack.
 * @param session - The session.
 * @param name - Its name.
 * @param selector - What it picks.
 * @param set - What it sets; none makes a blank layer.
 * @returns The layer.
 */
async function layerOf(
    session: GraphSession,
    name: string,
    selector: Selector = { match: "everything" },
    set: Layer["set"] = { "node.color": "#d55e00" },
): Promise<Layer> {
    const layer = await session.styles.add({ name, target: "node", selector, set });
    await session.styles.settled();
    return layer;
}

/**
 * Select a row of the style tree by clicking it.
 * @param name - The row's name.
 * @param modifier - A key held while clicking (several rows).
 */
async function clickRow(name: string, modifier?: "Control"): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    const row = await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) });
    if (modifier === undefined) {
        await userEvent.click(row);
        return;
    }
    await userEvent.keyboard(`{${modifier}>}`);
    await userEvent.click(row);
    await userEvent.keyboard(`{/${modifier}}`);
}

/**
 * The open tab's collapsed Which row.
 * @param kind - nodes or edges.
 * @returns The row button.
 */
async function whichRow(kind: "nodes" | "edges" = "nodes"): Promise<HTMLElement> {
    return screen.findByRole("button", { name: new RegExp(`^Which ${kind}, `) });
}

/**
 * Open the Which picker and add a condition on a field, by its name in the add menu.
 * @param field - The field's name.
 * @param kind - nodes or edges.
 * @returns The new card.
 */
async function addCard(field: string, kind: "nodes" | "edges" = "nodes"): Promise<HTMLElement> {
    const closed = screen.queryByRole("group", { name: `Which ${kind}` }) === null;
    if (closed) {
        await userEvent.click(await whichRow(kind));
    }
    const region = await screen.findByRole("group", { name: `Which ${kind}` });
    await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(`^${field}(,|$)`) }));
    return waitFor(() => {
        const card = within(region).getByRole("group", { name: new RegExp(`^${field}(,|$)`) });
        // Focus goes to the new card's first control.
        assert.isTrue(card.contains(document.activeElement), "focus is in the added card");
        assert.notMatch(
            document.activeElement?.getAttribute("aria-label") ?? "",
            /^Remove /,
            "focus is on a value control, not the card's remove button",
        );
        return card;
    });
}

/**
 * The only leaf of a layer's rule.
 * @param session - The session.
 * @param id - The layer.
 * @returns The leaf.
 */
function leafOfLayer(session: GraphSession, id: string): RuleTree | undefined {
    const selector = session.styles.get(id)?.selector;
    return selector?.match === "rule" ? selector.where : undefined;
}

/**
 * How many nodes (or edges) one leaf keeps, as the element counts it.
 * @param session - The session.
 * @param leaf - The leaf.
 * @param side - Nodes or edges.
 * @returns The count.
 */
async function elementCount(session: GraphSession, leaf: RuleTree, side: "node" | "edge" = "node"): Promise<number> {
    const counted = await session.scope.count({ define: { kind: "rule", where: leaf, reading: "clipped" } });
    return side === "node" ? counted.nodes : counted.edges;
}

/**
 * The count a chip shows: the number after its last comma, before its noun ("22 nodes").
 * @param words - The start of the chip's words.
 * @returns The count.
 */
async function chipCount(words: string): Promise<number> {
    return waitFor(() => {
        const chip = [...document.querySelectorAll<HTMLElement>("[data-chip]")].find((each) =>
            (each.textContent ?? "").startsWith(words),
        );
        const n = /, (\d+)\u00a0(?:nodes?|edges?)$/.exec(chip?.textContent ?? "")?.[1];
        assert.isDefined(n, `a counted chip starting "${words}": ${chip?.textContent ?? "none"}`);
        return Number(n);
    });
}

/**
 * Close the open picker with Done, and check focus returns to the row.
 * @param kind - nodes or edges.
 */
async function done(kind: "nodes" | "edges" = "nodes"): Promise<void> {
    const region = await screen.findByRole("group", { name: `Which ${kind}` });
    await userEvent.click(within(region).getByRole("button", { name: "Done" }));
    const row = await whichRow(kind);
    await waitFor(() => {
        assert.strictEqual(document.activeElement, row, "focus returns to the Which row");
    });
    assert.strictEqual(row.getAttribute("aria-expanded"), "false");
}

/**
 * The Louvain folder of group layers, as the app makes it.
 * @param session - The session.
 * @returns The run's id.
 */
async function louvainLayers(session: GraphSession): Promise<string> {
    const run = await session.runs.start(
        "louvain",
        {},
        {
            seed: 1,
            style: {
                groups: "layers",
                name: "Louvain",
                groupName: ({ rank, taken }) => {
                    let n = rank;
                    while (taken.includes(`Group ${String(n)}`)) {
                        n += 1;
                    }
                    return `Group ${String(n)}`;
                },
            },
        },
    );
    await session.styles.settled();
    return run.runId;
}

/**
 * The Louvain folder's layers.
 * @param session - The session.
 * @returns Their ids.
 */
function folderLayers(session: GraphSession): string[] {
    const folder = session.styles.tree().find((each) => each.name === "Louvain");
    return session.styles
        .layersUnder(folder === undefined ? [] : [folder.id])
        .flatMap((reach) => session.styles.parts(reach.row)?.node ?? []);
}

describe("the combined Style panel", () => {
    it("Node and Edge tabs: arrows, Home and End move the view and change nothing in the layer", async () => {
        const session = await openSample();
        const layer = await layerOf(session, "Mme", {
            match: "rule",
            where: { kind: "text", reads: "data.name", mode: "substring", text: "Mme" },
        });
        await clickRow("Mme");
        const list = await screen.findByRole("tablist", { name: "Style for" });
        const node = within(list).getByRole("tab", { name: "Node" });
        const edge = within(list).getByRole("tab", { name: /^Edge/ });
        assert.include(edge.textContent ?? "", "not styled", "a kind that is off says so");
        assert.strictEqual(node.getAttribute("aria-selected"), "true");
        const before = JSON.stringify(session.styles.get(layer.id));
        const steps = session.history.position;
        node.focus();
        await userEvent.keyboard("{ArrowRight}");
        await waitFor(() => {
            assert.strictEqual(edge.getAttribute("aria-selected"), "true");
        });
        assert.isNotNull(screen.getByRole("checkbox", { name: "Style edges" }), "the off kind's switch");
        await userEvent.keyboard("{Home}");
        await userEvent.keyboard("{End}");
        await userEvent.keyboard("{ArrowLeft}");
        await waitFor(() => {
            assert.strictEqual(node.getAttribute("aria-selected"), "true");
        });
        assert.strictEqual(JSON.stringify(session.styles.get(layer.id)), before, "the layer is unchanged");
        assert.strictEqual(session.history.position, steps, "no step was recorded");
        assert.isNull(screen.queryByRole("radiogroup", { name: "Paints" }), "the Paints control is gone");
    });

    it("a number card writes a range, its chip counts what the element counts, and Highest takes the top", async () => {
        const session = await openSample();
        await session.runs.start("degree", undefined, { style: false });
        const degree = cardFields(session, "node").find((field) => field.path.endsWith(".value"));
        assert.isDefined(degree);
        const layer = await layerOf(session, "Busy");
        await clickRow("Busy");
        const card = await addCard(degree?.name ?? "");
        const from = within(card).getByRole("textbox", { name: `${degree?.name ?? ""} from, number` });
        await userEvent.clear(from);
        await userEvent.type(from, "10");
        await userEvent.tab();
        await waitFor(() => {
            const leaf = leafOfLayer(session, layer.id);
            assert.strictEqual(leaf?.kind, "range");
            assert.strictEqual(leaf?.kind === "range" ? leaf.min : undefined, 10);
        });
        await done();
        const leaf = leafOfLayer(session, layer.id);
        assert.isDefined(leaf);
        assert.strictEqual(await chipCount(degree?.name ?? ""), await elementCount(session, leaf));
        assert.strictEqual(
            session.styles.counts(layer.id).matched,
            await elementCount(session, leaf),
            "the layer paints exactly those",
        );

        // Highest 5 of all nodes: a threshold leaf.
        await userEvent.click(await whichRow());
        const open = await screen.findByRole("group", { name: new RegExp(`^${degree?.name ?? ""}(,|$)`) });
        await userEvent.click(within(open).getByRole("combobox", { name: `${degree?.name ?? ""}: how to match` }));
        await userEvent.click(await screen.findByRole("option", { name: "Highest" }));
        assert.isNotNull(within(open).getByText("of all nodes"));
        await waitFor(() => {
            const top = leafOfLayer(session, layer.id);
            assert.strictEqual(top?.kind, "threshold");
        });
    });

    it("a category card writes the ticked values, and its chip counts what the element counts", async () => {
        const session = await openSample();
        const run = await session.runs.start("louvain", {}, { style: false, seed: 1 });
        const group = cardFields(session, "node").find((field) => field.path === `results.${run.runId}.group`);
        assert.isDefined(group);
        const layer = await layerOf(session, "Groups");
        await clickRow("Groups");
        const card = await addCard(group?.name ?? "");
        const values = within(card).getByRole("group", { name: `${group?.name ?? ""} values` });
        const boxes = within(values).getAllByRole("checkbox");
        await userEvent.click(boxes[0]);
        await userEvent.click(boxes[1]);
        await waitFor(() => {
            const leaf = leafOfLayer(session, layer.id);
            assert.strictEqual(leaf?.kind, "categories");
            assert.lengthOf(leaf?.kind === "categories" ? leaf.values : [], 2);
        });
        await done();
        const leaf = leafOfLayer(session, layer.id) as RuleTree;
        assert.strictEqual(await chipCount(group?.name ?? ""), await elementCount(session, leaf));
    });

    it("a text card writes 'contains'; Escape keeps the edit and one Undo takes the whole open back", async () => {
        const session = await openSample();
        const layer = await layerOf(session, "Names");
        await clickRow("Names");
        const steps = session.history.position;
        const card = await addCard("name");
        await userEvent.type(within(card).getByRole("combobox", { name: "name: text to match" }), "Mme");
        await waitFor(() => {
            assert.deepEqual(leafOfLayer(session, layer.id), {
                kind: "text",
                reads: "data.name",
                mode: "substring",
                text: "Mme",
            });
        });
        // The first Escape closes the list of names that hold the text; the second keeps the
        // picker open, and Done closes it.
        await userEvent.keyboard("{Escape}{Escape}");
        await userEvent.click(screen.getByRole("button", { name: "Done" }));
        const row = await whichRow();
        await waitFor(() => {
            assert.strictEqual(document.activeElement, row, "Done closes the picker onto its row");
        });
        const leaf = leafOfLayer(session, layer.id) as RuleTree;
        assert.isDefined(leaf, "Escape keeps the edit");
        assert.strictEqual(await chipCount("name contains Mme"), await elementCount(session, leaf));
        assert.strictEqual(session.history.position, steps + 1, "the whole open is one step");
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.deepEqual(session.styles.get(layer.id)?.selector, { match: "everything" }, "one Undo restores it");
        });
    });

    it("a yes-or-no card writes Yes as the value 'true'", async () => {
        const session = await openSample();
        const ids = session.data.nodes().map((node) => node.id);
        await session.data.updateNodes(ids.map((id, at) => ({ id, values: { main: at < 10 } })));
        const layer = await layerOf(session, "Main");
        await clickRow("Main");
        await addCard("main");
        await waitFor(() => {
            assert.deepEqual(leafOfLayer(session, layer.id), {
                kind: "text",
                reads: "data.main",
                mode: "exact",
                text: "true",
                caseSensitive: true,
            });
        });
        await done();
        assert.strictEqual(await chipCount("main: yes"), 10);
    });

    it("Style edges on a layer that picks nodes paints the edges between them, and a node card moves them", async () => {
        const session = await openSample();
        const layer = await layerOf(session, "Thenardiers", {
            match: "rule",
            where: { kind: "text", reads: "data.name", mode: "substring", text: "Thenardier" },
        });
        await clickRow("Thenardiers");
        await userEvent.click(
            within(await screen.findByRole("tablist", { name: "Style for" })).getByRole("tab", { name: /^Edge/ }),
        );
        await userEvent.click(screen.getByRole("checkbox", { name: "Style edges" }));
        const edgePart = await waitFor(() => {
            const id = session.styles.parts(layer.id)?.edge;
            assert.isDefined(id, "an edge part");
            return id ?? "";
        });
        const leaf: RuleTree = { kind: "text", reads: "data.name", mode: "substring", text: "Thenardier" };
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(edgePart).matched, await elementCount(session, leaf, "edge"));
        // The Ends card says so.
        assert.include((await whichRow("edges")).textContent ?? "", "Ends: both in this layer's nodes");

        // A node card edited on the Node tab moves the edges with it.
        await userEvent.click(
            within(screen.getByRole("tablist", { name: "Style for" })).getByRole("tab", { name: "Node" }),
        );
        await userEvent.click(await whichRow());
        const card = await screen.findByRole("group", { name: /^name/ });
        const text = within(card).getByRole("combobox", { name: "name: text to match" });
        await userEvent.clear(text);
        await userEvent.type(text, "Mme");
        await waitFor(() => {
            const edge = session.styles.get(edgePart)?.selector;
            assert.deepEqual(edge, {
                match: "rule",
                where: { kind: "text", reads: "data.name", mode: "substring", text: "Mme" },
            });
        });
    });

    it("on a folder of group layers: a <<Layer>> card is read-only, a card added to all is one step and survives a re-run", async () => {
        const session = await openSample();
        const runId = await louvainLayers(session);
        const layers = folderLayers(session);
        assert.isAbove(layers.length, 2);
        await clickRow("Louvain");
        assert.isNotNull(await screen.findByText(/layers in Louvain/), "the scope line, above the tabs");
        await userEvent.click(await whichRow());
        const region = await screen.findByRole("group", { name: "Which nodes" });
        const byLayer = within(region).getByRole("group", { name: /from each layer/ });
        assert.isNull(
            byLayer.querySelector("input"),
            "a card whose value makes each group a group is not edited in bulk",
        );
        assert.strictEqual(byLayer.querySelector("[data-layer-source]")?.textContent, "\u00ABLayer\u00BB");
        // Each layer's value, top first as the tree lists them, without the field's name again.
        const summary = within(byLayer).getByRole("button", { name: /from each layer/ });
        assert.match(summary.textContent ?? "", /Group 1, Group 2, Group 3, \+\d/);
        await userEvent.click(summary);
        const lines = within(byLayer)
            .getAllByRole("listitem")
            .map((item) => item.textContent ?? "");
        assert.match(lines[0], /^Group 1: Group 1, \d+$/, "the first line is the tree's first layer");
        // The open cards say the union, as the closed row does.
        assert.isNotNull(within(region).getByText(/^77 of 77 nodes$/));

        const steps = session.history.position;
        const card = await addCard("name");
        await userEvent.type(within(card).getByRole("combobox", { name: "name: text to match" }), "e");
        await waitFor(() => {
            for (const id of layers) {
                const selector = session.styles.get(id)?.selector;
                assert.include(JSON.stringify(selector), '"reads":"data.name"', `${id} holds the card`);
            }
        });
        await done();
        assert.strictEqual(session.history.position, steps + 1, "every layer in one step");

        // A re-run realigns each group's own card and leaves the added one alone.
        const run = session.runs.get(runId);
        await session.runs.start("louvain", { ...run?.params }, { as: runId, seed: 1 });
        await session.styles.settled();
        for (const id of folderLayers(session)) {
            assert.include(JSON.stringify(session.styles.get(id)?.selector), '"text":"e"', `${id} keeps the card`);
        }

        // The <<Layer>> card's x removes the field's card from every layer.
        await userEvent.click(await whichRow());
        const open = await screen.findByRole("group", { name: "Which nodes" });
        const groupCard = within(open).getByRole("group", { name: /from each layer/ });
        await userEvent.click(within(groupCard).getByRole("button", { name: /^Remove .* from every layer$/ }));
        await waitFor(() => {
            for (const id of folderLayers(session)) {
                assert.notInclude(JSON.stringify(session.styles.get(id)?.selector), "categories", id);
            }
        });
    });

    it("on two selected layers a card they share is edited in both at once, in one step", async () => {
        const session = await openSample();
        const leaf: RuleTree = { kind: "text", reads: "data.name", mode: "substring", text: "M" };
        const a = await layerOf(session, "Left", { match: "rule", where: leaf });
        const b = await layerOf(session, "Right", { match: "rule", where: leaf });
        await clickRow("Left");
        await clickRow("Right", "Control");
        await userEvent.click(await whichRow());
        const steps = session.history.position;
        const card = await screen.findByRole("group", { name: /^name/ });
        const text = within(card).getByRole("combobox", { name: "name: text to match" });
        await userEvent.type(text, "me");
        await waitFor(() => {
            for (const id of [a.id, b.id]) {
                assert.deepEqual(leafOfLayer(session, id), { ...leaf, text: "Mme" }, id);
            }
        });
        // The names that hold the text are listed under the box; Escape closes the list first.
        await userEvent.keyboard("{Escape}");
        await done();
        assert.strictEqual(session.history.position, steps + 1, "both layers in one step");
    });

    it("a folder's edges turned on follow each group's nodes, and the row says no total it cannot count", async () => {
        const session = await openSample();
        await louvainLayers(session);
        await clickRow("Louvain");
        await userEvent.click(
            within(await screen.findByRole("tablist", { name: "Style for" })).getByRole("tab", { name: /^Edge/ }),
        );
        await userEvent.click(await screen.findByRole("checkbox", { name: "Style edges" }));
        const row = await whichRow("edges");
        assert.match(row.getAttribute("aria-label") ?? "", /^Which edges, Ends/, "no 'of 254 edges' without a number");
        assert.include(row.textContent ?? "", "Ends: both in this layer's nodes");
    });

    it("on a layer with a card and one with none: every node, and the card held by 1 of 2 layers", async () => {
        const session = await openSample();
        const leaf: RuleTree = { kind: "text", reads: "data.name", mode: "substring", text: "Mme" };
        await layerOf(session, "Some", { match: "rule", where: leaf });
        await layerOf(session, "All");
        await clickRow("Some");
        await clickRow("All", "Control");
        const row = await whichRow();
        await waitFor(() => {
            assert.match(
                row.getAttribute("aria-label") ?? "",
                // The token is spoken as what it stands for, never its marks.
                /^Which nodes, 77 of 77 nodes, name: each layer's own value, 1 of 2 layers$/,
            );
        });
        assert.include(row.textContent ?? "", "name: «Layer», 1 of 2 layers");
    });

    it("a rule the cards cannot draw opens as the rule in words and is unchanged on close", async () => {
        const session = await openSample();
        const selector: Selector = { match: "expression", where: "data.name == 'Myriel' || data.name == 'Napoleon'" };
        const layer = await layerOf(session, "Two", selector);
        await clickRow("Two");
        const row = await whichRow();
        const words = "Rule: data.name == 'Myriel' || data.name == 'Napoleon'";
        assert.include(row.textContent ?? "", words);
        await userEvent.click(row);
        const region = await screen.findByRole("group", { name: "Which nodes" });
        assert.isNotNull(within(region).getByRole("group", { name: (name) => name.startsWith(words) }));
        await done();
        assert.deepEqual(session.styles.get(layer.id)?.selector, selector);
    });

    it("Escape in the add menu closes the menu only; the next Escape closes the picker", async () => {
        const session = await openSample();
        await layerOf(session, "Menu");
        await clickRow("Menu");
        // A row with no card opens on Add a condition; Enter there opens its list.
        await userEvent.click(await whichRow());
        const region = await screen.findByRole("group", { name: "Which nodes" });
        const add = within(region).getByRole("button", { name: "Add a condition" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, add);
        });
        await userEvent.keyboard("{Enter}");
        await screen.findByRole("listbox");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listbox"), "the menu closed");
            assert.strictEqual(document.activeElement, add, "focus is back on Add a condition");
        });
        assert.isNotNull(screen.queryByRole("group", { name: "Which nodes" }), "the picker is still open");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.strictEqual(document.activeElement?.getAttribute("aria-expanded"), "false", "closed onto its row");
        });
    });

    it("focus: removing a card goes to the next, else the previous, else Add a condition", async () => {
        const session = await openSample();
        await layerOf(session, "Focus", {
            match: "rule",
            where: {
                kind: "all",
                of: [
                    { kind: "text", reads: "data.name", mode: "substring", text: "M" },
                    { kind: "text", reads: "id", mode: "substring", text: "1" },
                ],
            },
        });
        await clickRow("Focus");
        await userEvent.click(await whichRow());
        const region = await screen.findByRole("group", { name: "Which nodes" });
        const cards = within(region)
            .getAllByRole("group")
            .filter((each) => each.hasAttribute("data-card"));
        assert.lengthOf(cards, 2);
        await userEvent.click(within(cards[0]).getByRole("button", { name: /^Remove / }));
        await waitFor(() => {
            const left = within(region)
                .getAllByRole("group")
                .filter((each) => each.hasAttribute("data-card"));
            assert.lengthOf(left, 1);
            assert.isTrue(left[0].contains(document.activeElement), "focus goes to the next card");
        });
        const last = within(region)
            .getAllByRole("group")
            .filter((each) => each.hasAttribute("data-card"))[0];
        await userEvent.click(within(last).getByRole("button", { name: /^Remove / }));
        await waitFor(() => {
            assert.strictEqual(
                document.activeElement,
                within(region).getByRole("button", { name: "Add a condition" }),
                "with no card left, focus goes to Add a condition",
            );
        });
    });
});
