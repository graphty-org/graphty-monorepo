/**
 * Tests of the old Style panel, run on the Style panel by part of the drawing (graphty-element's
 * `file-styles` experiment on), on the REAL graphty-element and Les Miserables, driven by real clicks
 * and keys: a just-added Shape line checks no shape in its list; a just-added Fill or Effects item's
 * heading minus takes its waiting lines away, says so and hands focus to the "+"; the Which row of
 * two layers where one holds a card says the card is held by 1 of 2 layers; Delete on the Shape
 * value clears it; the Shaders gallery's Glow tile says it is an Effects option.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession, RuleTree } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

/** The scene: the session and the chrome store. */
interface Scene {
    readonly session: GraphSession;
    readonly store: WorkspaceStore;
}

/**
 * Les Miserables in the workspace with the starting rows, and a "Both" layer on every node and edge
 * that sets nothing.
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
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    await session.styles.addRow({ name: "Both", target: "both", selector: { match: "everything" } });
    await session.styles.settled();
    return { session, store };
}

/**
 * Selects a row of the style tree by clicking it, and shows its Style tab.
 * @param name - the row's name.
 * @param modifier - a key held while clicking (several rows).
 * @returns the Style tab; with a modifier, the Inspector.
 */
async function clickRow(name: string, modifier?: "Control"): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    const row = await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) });
    if (modifier !== undefined) {
        // A second row joins the selection: the panel of several layers, which has no Style tab.
        await userEvent.keyboard(`{${modifier}>}`);
        await userEvent.click(row);
        await userEvent.keyboard(`{/${modifier}}`);
        return screen.getByRole("complementary", { name: "Inspector" });
    }
    await userEvent.click(row);
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    const tab = await screen.findByTestId("style-tab");
    assert.isNotNull(tab.querySelector("[data-style-parts]"), "the panel by part");
    return tab;
}

/**
 * One section of the open Style tab.
 * @param kind - nodes or edges.
 * @param id - the part's id.
 * @returns the section.
 */
function section(kind: "node" | "edge", id: string): HTMLElement {
    const found = screen.getByTestId("style-tab").querySelector<HTMLElement>(`[data-section="${kind}-${id}"]`);
    if (found === null) {
        throw new Error(`no ${kind} ${id} section`);
    }
    return found;
}

/**
 * Adds a line or an item from a section's "+" and its menu, and waits for focus in its first line.
 * @param kind - nodes or edges.
 * @param id - the part's id.
 * @param item - the menu item.
 * @returns the first new line.
 */
async function addFrom(kind: "node" | "edge", id: string, item: string): Promise<HTMLElement> {
    await userEvent.click(within(section(kind, id)).getByRole("button", { name: /^Add to / }));
    await userEvent.click(await screen.findByRole("menuitem", { name: item }));
    return waitFor(() => {
        const line = section(kind, id).querySelector<HTMLElement>(".ws-row[data-line]");
        assert.isNotNull(line, `${kind} ${id}: ${item} added`);
        assert.isTrue(line.contains(document.activeElement), `${kind} ${id}: focus in the new line`);
        return line;
    });
}

/**
 * What the "Both" layer of a kind writes for a channel.
 * @param session - the session.
 * @param channel - the channel.
 * @returns the value, or undefined.
 */
function written(session: GraphSession, channel: Channel): unknown {
    return session.styles.list().find((layer) => layer.name === "Both" && layer.set?.[channel] !== undefined)?.set?.[
        channel
    ];
}

describe("the old Style panel's tests on the panel by part", () => {
    withFeatures(["file-styles"]);

    it("the Shape list checks no shape while none is set", async () => {
        await openScene();
        await clickRow("Both");
        await showKind("node");
        const line = await addFrom("node", "shape", "Shape");
        await userEvent.click(within(line).getByRole("button", { name: /^Node shape(,|$)/ }));
        const options = await screen.findAllByRole("option");
        assert.isAbove(options.length, 1);
        assert.deepEqual(
            options.filter((o) => o.getAttribute("aria-selected") === "true").map((o) => o.textContent),
            [],
            "no shape is checked as if it were set",
        );
    });

    it("Delete on the Shape value clears the shape it set", async () => {
        const { session } = await openScene();
        await clickRow("Both");
        await showKind("node");
        const line = await addFrom("node", "shape", "Shape");
        await userEvent.click(within(line).getByRole("button", { name: /^Node shape(,|$)/ }));
        await userEvent.click(await screen.findByRole("option", { name: /^Octahedron/ }));
        await waitFor(() => {
            assert.equal(written(session, "node.shape"), "octahedron");
        });
        const value = await within(section("node", "shape")).findByRole("button", { name: /^Node shape, Octahedron/ });
        value.focus();
        await userEvent.keyboard("{Delete}");
        await waitFor(() => {
            assert.isUndefined(written(session, "node.shape"));
        });
    });

    it.each([
        ["node", "fill", "Solid"],
        ["node", "effects", "Glow"],
        ["edge", "effects", "Underlay"],
    ] as const)(
        "adds and removes a property in %s %s, with focus and an announcement each way",
        async (kind, id, item) => {
            const { session, store } = await openScene();
            await clickRow("Both");
            await showKind(kind);
            const where = `${kind} ${id}`;
            const line = await addFrom(kind, id, item);
            const channel = line.dataset.line as Channel;
            assert.isUndefined(written(session, channel), `${where}: nothing written before a value`);
            assert.match(store.get().announcement, / added: pick its values$/, where);
            await userEvent.click(
                within(section(kind, id)).getByRole("button", { name: `Remove ${item.toLowerCase()}` }),
            );
            await waitFor(() => {
                assert.isNull(section(kind, id).querySelector(".ws-row"), `${where}: removed`);
                assert.equal(
                    document.activeElement?.getAttribute("aria-label"),
                    `Add to ${kind} ${id}`,
                    `${where}: focus on "+"`,
                );
                assert.match(store.get().announcement, / removed$/, where);
            });
            assert.isUndefined(written(session, channel), `${where}: the layer writes nothing`);
        },
    );

    it("on a layer with a card and one with none: every node, and the card held by 1 of 2 layers", async () => {
        const { session } = await openScene();
        const leaf: RuleTree = { kind: "text", reads: "data.name", mode: "substring", text: "Mme" };
        const add = async (name: string, where?: RuleTree): Promise<void> => {
            await session.styles.add({
                name,
                target: "node",
                selector: where === undefined ? { match: "everything" } : { match: "rule", where },
                set: { "node.color": "#d55e00" },
            });
            await session.styles.settled();
        };
        await add("Some", leaf);
        await add("All");
        await clickRow("Some");
        await clickRow("All", "Control");
        const row = await screen.findByRole("button", { name: /^Which nodes, / });
        await waitFor(() => {
            assert.match(
                row.getAttribute("aria-label") ?? "",
                /^Which nodes, 77 of 77 nodes, name by layer, 1 of 2 layers$/,
            );
        });
    });

    it("the Glow option tile in the Shaders gallery is marked as an Effects option", async () => {
        await openScene();
        await clickRow("Both");
        await showKind("node");
        await userEvent.click(within(section("node", "shaders")).getByRole("button", { name: "Add to node shaders" }));
        const gallery = await screen.findByTestId("shader-gallery");
        await userEvent.keyboard("glow");
        const tile = await within(gallery).findByRole("button", { name: "Glow" });
        assert.include(tile.textContent, "Effects option");
    });
});
