/**
 * The selection workspace's counts and search on the REAL graphty-element and Les Miserables,
 * driven by real clicks and keys: a style layer's workspace says its count as a test changes, a
 * long checklist says how many values are not drawn, and the matches strip is searched first.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Every experiment stays off here.
withFeatures([]);

/**
 * Les Miserables in the workspace, and every announcement made.
 * @param place - the place it opens on.
 * @returns The session, the store and the announcements heard.
 */
async function openSample(
    place: "graph" | "data" = "graph",
): Promise<{ session: GraphSession; store: WorkspaceStore; heard: string[] }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place });
    const heard: string[] = [];
    const set = store.set.bind(store);
    store.set = (patch) => {
        const said = (patch as { announcement?: unknown }).announcement;
        if (typeof said === "string" && said !== "") {
            heard.push(said);
        }
        set(patch);
    };
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
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
    return { session, store, heard };
}

/**
 * A reader's layer, selected in the style tree.
 * @param session - The session.
 * @param name - Its name.
 * @param where - Its selection, or everything.
 * @returns The layer's id.
 */
async function openLayer(session: GraphSession, name: string, where?: UnionLeaf): Promise<string> {
    const { id } = await session.styles.add({
        name,
        target: "node",
        selector: where === undefined ? { match: "everything" } : { match: "rule", where },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-rest"));
    });
    return id;
}

/**
 * The open workspace, waited for.
 * @returns it.
 */
async function opened(): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        assert.notStrictEqual(found?.style.visibility, "hidden", "and placed");
        return found;
    });
}

/** Opens the layer's workspace with the sidebar's Edit. */
async function edit(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: /^Style Nodes\.\.\./ }));
    return opened();
}

/** One step: degree at least `min`. */
const degreeAtLeast = (min: number): UnionLeaf => ({
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            id: "a",
            start: "none",
            steps: [{ id: "deg", op: "add", rule: { kind: "range", attribute: "graphty.degree", min } }],
        },
    ],
});

describe("a style layer's workspace", () => {
    it("says its new count as a test changes", async () => {
        const { session, heard } = await openSample();
        await openLayer(session, "Spoken", degreeAtLeast(10));
        const ws = await edit();
        const from = await within(ws).findByRole("textbox", { name: "Degree from, number" });
        await userEvent.click(from);
        await userEvent.keyboard("{Control>}a{/Control}5{Tab}");
        await waitFor(() => {
            assert.isTrue(
                heard.some((each) => /^\d+ of 77 nodes$/.test(each)),
                `the count was said: ${heard.join(" | ")}`,
            );
        });
    });

    it("a long checklist says how many values are not drawn", async () => {
        const { session } = await openSample();
        await openLayer(session, "Listed", {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    id: "a",
                    start: "none",
                    steps: [{ id: "nm", op: "add", rule: { kind: "categories", attribute: "data.name", values: [] } }],
                },
            ],
        });
        const ws = await edit();
        const values = await within(ws).findByRole("group", { name: "name values" });
        const drawn = within(values).getAllByRole("checkbox").length;
        await waitFor(() => {
            assert.isNotNull(within(ws).queryByText(`${String(77 - drawn)} more`));
        });
    });
});

describe("the matches strip", () => {
    it("the matches strip is searched first, and typing finds a match among its rows", async () => {
        const { session } = await openSample();
        await openLayer(session, "Searched", degreeAtLeast(1));
        const ws = await edit();
        const strip = await within(ws).findByRole("region", { name: "Matches" });
        const rows = (): number =>
            Number(strip.querySelector("[aria-rowcount]")?.getAttribute("aria-rowcount") ?? Number.NaN);
        await waitFor(() => {
            assert.isAbove(rows(), 20, "every match is in the strip's table");
        });
        const search = within(strip).getByRole("searchbox", { name: "Search matches" });
        assert.isTrue(
            Boolean(search.compareDocumentPosition(strip.querySelector("table, [role=grid]") ?? strip) & 4),
            "the search comes before the table",
        );
        await userEvent.click(search);
        await userEvent.keyboard("Valjean");
        await waitFor(() => {
            assert.isAtMost(rows(), 3, "the table holds what the search found");
            assert.include(strip.textContent ?? "", "Valjean");
        });
    });
});
