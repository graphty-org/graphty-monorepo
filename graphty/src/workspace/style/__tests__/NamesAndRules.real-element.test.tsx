/**
 * One name per value, rules in words, on the REAL graphty-element and Les Miserables with Degree,
 * Louvain, Edge betweenness and a route run, driven by real clicks and keys: no Which row prints
 * a raw expression and the route's opens on a yes-or-no card; each run's value has one name in the
 * Style tab, the Values tab and the key; turning a kind on by the keyboard keeps focus on its
 * switch and says so; a new layer counts what its cards match before any value is set; Louvain's Values tab names its groups as the key does, in the key's order.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { findTreeRow } from "../../graph-place/rows";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The scene: the session, the store, and each run's tree row name. */
interface Scene {
    readonly session: GraphSession;
    readonly store: WorkspaceStore;
    readonly rows: Readonly<Record<"degree" | "louvain" | "bridges" | "route", string>>;
}

/**
 * Les Miserables with Degree, Louvain, Edge betweenness and a route from Myriel to Marius.
 * @returns the scene.
 */
async function openScene(): Promise<Scene> {
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
    const idOf = (name: string): string => String(session.data.nodes().find((n) => n.name === name)?.id);
    const run = async (algorithm: string, params: Record<string, unknown> = {}): Promise<string> => {
        const { runId } = await session.runs.start(algorithm, params);
        await session.styles.settled();
        const [layer] = session.runs.bindings(runId);
        const found = session.styles.get(layer);
        return findTreeRow(session.styles.tree(), found?.row ?? layer)?.row.name ?? "";
    };
    const degree = await run("degree");
    const louvain = await run("louvain");
    const bridges = await run("edge-betweenness");
    const route = await run("shortest-path", { source: idOf("Myriel"), target: idOf("Marius") });
    return { session, store, rows: { degree, louvain, bridges, route } };
}

/**
 * A name as a regular expression's literal text.
 * @param name - the name.
 * @returns the escaped text.
 */
function escape(name: string): string {
    return name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Opens a tree row by a click on it, then one of its tabs.
 * @param name - the row's visible name.
 * @param tab - Style or Values.
 * @returns the inspector.
 */
async function openRow(name: string, tab: "Style" | "Values"): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${escape(name)}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const button = await within(inspector).findByRole("tab", { name: tab });
    if (button.getAttribute("aria-selected") !== "true") {
        await userEvent.click(button);
    }
    return inspector;
}

/**
 * The Which nodes (or edges) row at rest of the open Style tab.
 * @returns the row's button.
 */
async function whichLine(): Promise<HTMLElement> {
    return screen.findByRole("button", { name: /^Which (nodes|edges), / });
}

describe("one name per value, rules in words", () => {
    it("no Which row is a raw expression, and the route's opens on a yes-or-no card", async () => {
        const { rows } = await openScene();
        for (const row of [rows.degree, rows.louvain, rows.bridges, rows.route]) {
            await openRow(row, "Style");
            const line = await whichLine();
            assert.notMatch(line.textContent, /results\.|==|`/, `${row}: ${line.textContent}`);
        }
        await openRow(rows.route, "Style");
        const line = await whichLine();
        assert.include(line.textContent, "On the route: yes");
        await userEvent.click(line);
        const card = await screen.findByRole("group", { name: /^On the route(,|$)/ });
        const match = within(card).getByRole<HTMLInputElement>("combobox", { name: "On the route is" });
        assert.equal(match.value, "Yes");
        // Nothing in the card is cut at the inspector's width: each field shows its whole value.
        for (const field of card.querySelectorAll("input:not([type=hidden])")) {
            assert.isAtMost(field.scrollWidth, field.clientWidth, field.getAttribute("aria-label") ?? "");
        }
    });

    it("each value has one name in the Style tab, the Values tab and the key", async () => {
        const { rows } = await openScene();
        // A measurement's value and a grouping's go by the algorithm's name, as the tree names runs.
        const expected = { degree: "Degree", louvain: "Louvain", bridges: "Edge betweenness" } as const;
        for (const [run, name] of Object.entries(expected) as [keyof typeof expected, string][]) {
            const style = await openRow(rows[run], "Style");
            await waitFor(() => {
                assert.include(style.textContent, name, `${run}'s Style tab names its value ${name}`);
            });
            const values = await openRow(rows[run], "Values");
            await within(values).findByRole("heading", { name: "Where its look shows" });
            assert.include(values.textContent, name, `${run}'s Values tab names its value ${name}`);
        }
        const key = await screen.findByRole("region", { name: "Legend" });
        assert.notMatch(key.textContent ?? "", /\b(Connections|Bridge edges|Communities)\b/, "the key names the runs");
    });

    it("Style edges by the keyboard on Degree keeps focus on the switch, says so, keeps the name", async () => {
        const { session, store, rows } = await openScene();
        await openRow(rows.degree, "Style");
        const kinds = await screen.findByRole("tablist", { name: "Style for" });
        await userEvent.click(within(kinds).getByRole("tab", { name: /^Edge/ }));
        const edges = await screen.findByRole<HTMLInputElement>("checkbox", { name: "Style edges" });
        assert.isFalse(edges.checked);
        edges.focus();
        await userEvent.keyboard(" ");
        await waitFor(() => {
            assert.equal(store.get().announcement, `${rows.degree} now styles edges`);
        });
        await waitFor(() => {
            const active = document.activeElement as HTMLInputElement | null;
            assert.strictEqual(active, screen.getByRole("checkbox", { name: "Style edges" }), "focus stays on it");
            assert.isTrue(active?.checked);
        });
        const names = session.styles.tree().map((row) => row.name);
        assert.include(names, rows.degree, "the row keeps its name");
    });

    it("a new layer with a name card on 'Mme' counts 6 nodes before any value is set", async () => {
        const { session } = await openScene();
        await userEvent.click(await screen.findByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Layer" }));
        await screen.findByRole("textbox", { name: "Layer name" });
        await userEvent.keyboard("{Escape}");
        // A new layer opens its picker on arrival.
        const region = await screen.findByRole("group", { name: "Which nodes" });
        await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
        await userEvent.click(await screen.findByRole("option", { name: /^name(,|$)/ }));
        const card = await within(region).findByRole("group", { name: /^name(,|$)/ });
        await userEvent.type(within(card).getByRole("combobox", { name: "name: text to match" }), "Mme");
        await waitFor(() => {
            const node = session.styles
                .list()
                .find(
                    (layer) => layer.target === "node" && layer.selector.match === "rule" && layer.source.by === "user",
                );
            assert.isDefined(node);
            assert.equal(session.styles.counts(node?.id ?? "").matched, 6);
            assert.isEmpty(Object.keys(node?.set ?? {}), "no value is set");
        });
    });

    it("Louvain's Values tab lists Group 1 to Group 6 as the key does", async () => {
        const { session, rows } = await openScene();
        const values = await openRow(rows.louvain, "Values");
        const header = await within(values).findByText("Groups, largest first");
        const section = header.closest<HTMLElement>("[role=group]");
        if (section === null) {
            throw new Error("no groups section");
        }
        const more = within(section).queryByRole("button", { name: /^\d+ more$/ });
        if (more !== null) {
            await userEvent.click(more);
        }
        const names = [...section.querySelectorAll(".cm-data-row-name")].map((name) => name.textContent);
        // The key's Louvain block: the one whose rows are ranked groups.
        const groups = session.styles.legend().find((block) => block.swatches.some((s) => s.rank !== undefined));
        const keyNames = (groups?.swatches ?? [])
            .filter((s) => s.rank !== undefined)
            .map((s) => `Group ${String(s.rank)}`);
        assert.isNotEmpty(keyNames);
        assert.deepEqual(names, keyNames);
        assert.deepEqual(names.slice(0, 2), ["Group 1", "Group 2"]);
        for (const title of ["Covers", "Where its look shows"]) {
            assert.lengthOf(within(values).getAllByRole("heading", { name: title }), 1, title);
        }
    });
});
