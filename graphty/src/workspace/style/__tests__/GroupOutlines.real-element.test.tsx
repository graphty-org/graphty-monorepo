/**
 * Group outlines and the Selected and Hovered rows' shaders on the REAL graphty-element, driven by
 * real input (decisions-v2, sections 1 and 2): the Shockwave added to Selected plays once when a
 * real click selects a node; Satellites added to Hovered draw on a node only while the pointer is
 * on it; the gallery badges the group outlines Around the group, and Hull added to the
 * Louvain layer and grouped by Louvain draws one outline per community; a click on an outline
 * selects the layer that draws it; and on the Louvain folder, the bulk edit gives every layer its
 * own outline in one undo step. Every assertion reads what the element reports: its layers and
 * what it draws (`element.drawnShaders()`).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { ShaderUse } from "@graphty/graphty-element/catalog";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { findValuePicker, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

/** A hang guard for the element coming up, a run finishing and a shader compiling, not a timing. */
const TIMEOUT_MS = 90_000;

type Element = HTMLElementTagNameMap["graphty-element"];

/** What a scene holds. */
interface Scene {
    readonly session: GraphSession;
    readonly store: WorkspaceStore;
    readonly element: Element;
}

/**
 * Les Miserables in the workspace with the starting rows, laid out and drawn.
 * @returns the scene.
 */
async function openScene(): Promise<Scene> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const element = await waitFor(
        () => {
            const found = document.querySelector("graphty-element");
            assert.isDefined(found?.session);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (element === null) {
        throw new Error("the element never came up");
    }
    const { session } = element;
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    await session.styles.settled();
    await element.waitForSettled();
    await element.waitForStableFrame();
    return { session, store, element };
}

/**
 * A node's id, by its name.
 * @param session - the session.
 * @param name - the name.
 * @returns the id.
 */
function idOf(session: GraphSession, name: string): string {
    return String(session.data.nodes().find((n) => n.name === name)?.id);
}

/**
 * Opens a tree row's Style tab by a click on the row, and on the Style tab when it opened on Values.
 * @param name - the row's visible name.
 * @returns the Style tab.
 */
async function openStyle(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    const tab = await screen.findByTestId("style-tab");
    await showKind("node");
    return tab;
}

/**
 * A section of the open Style tab's node tab.
 * @param id - the section's id.
 * @returns the section.
 */
function section(id: string): HTMLElement {
    const found = screen.getByTestId("style-tab").querySelector<HTMLElement>(`[data-section="node-${id}"]`);
    if (found === null) {
        throw new Error(`no node ${id} section`);
    }
    return found;
}

/**
 * Opens the open row's Shaders gallery from its "+".
 * @returns the gallery.
 */
async function openGallery(): Promise<HTMLElement> {
    await userEvent.click(within(section("shaders")).getByRole("button", { name: "Add to node shaders" }));
    return screen.findByTestId("shader-gallery", {}, { timeout: TIMEOUT_MS });
}

/**
 * Adds a shader from the open row's Shaders "+" by a click on its tile, and waits for its row.
 * @param name - the shader's name.
 */
async function addShader(name: string): Promise<void> {
    const gallery = await openGallery();
    await userEvent.click(await within(gallery).findByRole("button", { name }));
    await waitFor(() => {
        assert.isNull(screen.queryByTestId("shader-gallery"), "the pick closes the gallery");
    });
}

/**
 * The shader ids a layer's node list holds.
 * @param layer - the layer.
 * @returns the ids, in order.
 */
function shadersOf(layer: Layer | undefined): string[] {
    const uses = layer?.set?.["node.shaders"];
    return Array.isArray(uses) ? (uses as readonly ShaderUse[]).map((use) => use.shader) : [];
}

/**
 * Where a node is drawn on the element, once it is drawn on screen.
 * @param element - the element.
 * @param id - the node.
 * @returns its center and radius, in CSS pixels from the element's corner.
 */
async function nodeAt(element: Element, id: string): Promise<{ x: number; y: number; radius: number }> {
    return waitFor(
        () => {
            const at = element.nodeScreenPosition(id);
            assert.isTrue(at?.visible, `${id} is drawn on screen`);
            return { x: at?.x ?? 0, y: at?.y ?? 0, radius: at?.radius ?? 0 };
        },
        { timeout: TIMEOUT_MS },
    );
}

/**
 * Counts, on every animation frame, how many nodes play a shader's entrance, until stopped.
 * @param element - the element.
 * @param id - the shader.
 * @returns stops it, giving how many times an entrance started (a rise from none to some).
 */
function countEntrances(element: Element, id: string): () => number {
    let rises = 0;
    let was = 0;
    let frame = 0;
    const tick = (): void => {
        const now = element.drawnShaders().nodes.get(id)?.entering ?? 0;
        if (was === 0 && now > 0) {
            rises++;
        }
        was = now;
        frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
        cancelAnimationFrame(frame);
        return rises;
    };
}

/**
 * Runs Louvain and returns the layer that colors its groups, and the path it reads.
 * @param session - the session.
 * @returns the layer and the path.
 */
async function runLouvain(session: GraphSession): Promise<{ layer: Layer; path: string }> {
    const { runId } = await session.runs.start("louvain", {}, { seed: 1 });
    await session.styles.settled();
    const layer = session.styles
        .list()
        .find((l) => session.runs.bindings(runId).includes(l.id) && l.encode?.["node.color"] !== undefined);
    const binding = layer?.encode?.["node.color"];
    if (layer === undefined || binding === undefined || !("by" in binding)) {
        throw new Error("Louvain colored nothing");
    }
    return { layer, path: binding.by };
}

/**
 * The distinct values a path takes over the nodes.
 * @param session - the session.
 * @param path - the path.
 * @returns the values, as strings.
 */
function groupsOf(session: GraphSession, path: string): Set<string> {
    const values = new Set<string>();
    for (const node of session.data.nodes()) {
        const value = session.styles.valueAt({ node: node.id }, path);
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            values.add(String(value));
        }
    }
    return values;
}

describe("shaders on the Selected and Hovered rows", () => {
    it("the Shockwave on Selected plays once when a real click selects a node", async () => {
        const { session, element } = await openScene();
        await openStyle("Selected");
        await addShader("Shockwave");
        const selected = session.styles.list().find((layer) => layer.name === "Selected" && layer.target !== "edge");
        assert.include(shadersOf(selected), "shockwave", "the Selected row's node layer carries the shader");
        assert.isUndefined(element.drawnShaders().nodes.get("shockwave"), "nothing is selected, so nothing draws it");

        const stop = countEntrances(element, "shockwave");
        const valjean = idOf(session, "Valjean");
        const at = await nodeAt(element, valjean);
        await userEvent.click(element, { position: { x: at.x, y: at.y } });
        await waitFor(() => {
            assert.deepEqual(session.selection.nodes.map(String), [valjean], "the click selects the node");
        });
        await waitFor(
            () => {
                const drawn = element.drawnShaders().nodes.get("shockwave");
                assert.strictEqual(drawn?.drawn, 1, "the selected node carries the shockwave");
                assert.strictEqual(drawn?.entering, 0, "its ring has run out");
            },
            { timeout: TIMEOUT_MS },
        );
        // A further hundred frames at rest, still selected: the ring does not play again.
        await new Promise<void>((resolve) => {
            let left = 100;
            const tick = (): void => {
                left--;
                if (left === 0) {
                    resolve();
                } else {
                    requestAnimationFrame(tick);
                }
            };
            requestAnimationFrame(tick);
        });
        assert.strictEqual(stop(), 1, "it played once");
    });

    it("Satellites on Hovered draw on a node only while the pointer is on it", async () => {
        const { session, element } = await openScene();
        await openStyle("Hovered");
        await addShader("Satellites");
        assert.isUndefined(element.drawnShaders().nodes.get("orbiting-satellites"), "nothing is hovered yet");

        const at = await nodeAt(element, idOf(session, "Valjean"));
        await userEvent.hover(element, { position: { x: at.x, y: at.y } });
        await waitFor(
            () => {
                assert.strictEqual(
                    element.drawnShaders().nodes.get("orbiting-satellites")?.drawn,
                    1,
                    "on the hovered node",
                );
            },
            { timeout: TIMEOUT_MS },
        );

        await userEvent.hover(screen.getByRole("tree", { name: "Style layers" }));
        await waitFor(
            () => {
                assert.strictEqual(element.drawnShaders().nodes.get("orbiting-satellites")?.drawn ?? 0, 0, "gone");
            },
            { timeout: TIMEOUT_MS },
        );
    });
});

describe("group outlines, Around the group in the gallery", () => {
    it("the gallery badges the outlines Around the group; Hull on the Louvain layer grouped by Louvain draws one outline per community", async () => {
        const { session, store, element } = await openScene();
        const { layer, path } = await runLouvain(session);
        store.set({ inspected: { kind: "layer-row", id: layer.row ?? layer.id } });
        await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        await showKind("node");

        const gallery = await openGallery();
        const tiles = within(within(gallery).getByRole("group", { name: "Shaders" })).getAllByRole("button");
        const outlines = tiles.filter(
            (tile) => tile.querySelector(".ws-place-badge")?.textContent === "Around the group",
        );
        assert.sameMembers(
            outlines.map((tile) => tile.getAttribute("aria-label")),
            ["Hull", "Soap bubble"],
            "the group outlines, each badged Around the group",
        );
        await userEvent.click(within(gallery).getByRole("button", { name: "Hull" }));
        await waitFor(() => {
            assert.deepEqual(session.styles.get(layer.id)?.set?.["node.shaders"], [{ shader: "metaball-hull" }]);
        });
        const row = section("shaders").querySelector<HTMLElement>("[data-shader-row]");
        assert.include(row?.textContent, "Around the group", "one allowed place: a static label");

        await userEvent.click(within(section("shaders")).getByRole("button", { name: "Group by None" }));
        const picker = await findValuePicker({ timeout: TIMEOUT_MS });
        await userEvent.click(within(picker).getByRole("option", { name: /^Louvain(,|$)/ }));
        await waitFor(() => {
            assert.deepEqual(session.styles.get(layer.id)?.set?.["node.shaders"], [
                { shader: "metaball-hull", groupBy: path },
            ]);
        });

        const communities = groupsOf(session, path);
        assert.isAbove(communities.size, 1);
        await waitFor(
            () => {
                const drawn = element.drawnShaders().groupOutlines.find((each) => each.layer === layer.id);
                assert.strictEqual(drawn?.groups.length, communities.size, "one outline per community");
                assert.sameMembers(
                    drawn?.groups.map(String) ?? [],
                    [...communities],
                    "an outline for each community, by its value",
                );
            },
            { timeout: TIMEOUT_MS },
        );
        within(section("shaders")).getByRole("button", { name: "Group by Louvain" });

        await session.undo();
        await waitFor(() => {
            assert.deepEqual(
                session.styles.get(layer.id)?.set?.["node.shaders"],
                [{ shader: "metaball-hull" }],
                "one Undo takes the grouping off",
            );
        });
    });

    it("a click on an outline selects the layer that draws it", async () => {
        const { session, store, element } = await openScene();
        const outlined = await session.styles.add({
            name: "Outlined",
            target: "node",
            // A node with one edge, at the drawing's edge: room around it that is no node and no edge.
            selector: { match: "ids", nodes: [idOf(session, "Napoleon")] },
            set: { "node.shaders": [{ shader: "metaball-hull" }] },
        });
        store.set({ inspected: { kind: "graph" } });
        await waitFor(
            () => {
                assert.isDefined(element.drawnShaders().groupOutlines.find((each) => each.layer === outlined.id));
            },
            { timeout: TIMEOUT_MS },
        );
        const at = await nodeAt(element, idOf(session, "Napoleon"));
        // A point on the outline and off every node and edge, as the element would pick it.
        const point = await waitFor(
            () => {
                for (let step = 1.3; step < 6; step += 0.3) {
                    for (let turn = 0; turn < 32; turn++) {
                        const angle = (turn / 32) * 2 * Math.PI;
                        const x = at.x + Math.cos(angle) * at.radius * step;
                        const y = at.y + Math.sin(angle) * at.radius * step;
                        if (element.groupOutlineAt({ x, y })?.layer === outlined.id) {
                            return { x, y };
                        }
                    }
                }

                throw new Error("no point of the outline is clear of nodes and edges");
            },
            { timeout: TIMEOUT_MS },
        );

        await userEvent.click(element, { position: point });
        await waitFor(() => {
            const { inspected } = store.get();
            assert.deepEqual(inspected, { kind: "layer-row", id: outlined.row ?? outlined.id });
        });
    });

    it("on the Louvain folder, the bulk edit gives every layer its own outline in one undo step", async () => {
        const { session, element } = await openScene();
        await session.runs.start("louvain", {}, { seed: 1, style: { groups: "layers", name: "Louvain" } });
        await session.styles.settled();
        const folder = session.styles.tree().find((row) => row.name === "Louvain");
        assert.isDefined(folder);
        const ids = session.styles.layersUnder([folder?.id ?? ""]).map((each) => session.styles.parts(each.row)?.node);
        const layers = ids.filter((id): id is string => id !== undefined);
        assert.isAbove(layers.length, 1);
        await openStyle("Louvain");
        const steps = session.history.position;

        await addShader("Soap bubble");
        await waitFor(() => {
            for (const id of layers) {
                assert.deepEqual(shadersOf(session.styles.get(id)), ["soap-bubble"], `${id} draws its own`);
            }
        });
        assert.strictEqual(session.history.position, steps + 1, "one undo step");
        await waitFor(
            () => {
                const drawn = element.drawnShaders().groupOutlines.filter((each) => layers.includes(each.layer));
                assert.strictEqual(drawn.length, layers.length, "an outline per layer");
            },
            { timeout: TIMEOUT_MS },
        );

        await session.undo();
        await waitFor(() => {
            for (const id of layers) {
                assert.deepEqual(shadersOf(session.styles.get(id)), [], "one Undo takes every one off");
            }
        });
    });
});
