/**
 * Shader rows in the Style tab's sections, on the REAL graphty-element, driven by real input
 * (shader-styles design, section 6, package A1): the Material row's gallery, the parameters
 * pop-out, effects that bind per element on their own parameter keys, a swap that leaves no old
 * parameter set, the minus handing focus to the section's "+", one Undo per change, and the
 * "Covered by" captions a sprite and a mandala put on the rows they draw in place of. Every
 * assertion reads what the element reports: the layer stack and what the panel shows.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { PopoutManager } from "@graphty/compact-mantine";
import type { LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { createWorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { StylePanel } from "../StylePanel";
import { showKind } from "./kindTab";

/** A hang guard for the element coming up and painting, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

const NODES = [
    { id: "1", uncertainty: 0, degree: 1 },
    { id: "2", uncertainty: 0.5, degree: 2 },
    { id: "3", uncertainty: 1, degree: 1 },
];
const EDGES = [
    { source: "1", target: "2" },
    { source: "2", target: "3" },
];

let host: HTMLElement | null = null;

afterEach(() => {
    host?.remove();
    host = null;
});

/**
 * Puts a real element on the page, waits for its session and loads a small graph.
 * @returns the element and its session.
 */
async function mountElement(): Promise<{ element: HTMLElementTagNameMap["graphty-element"]; session: GraphSession }> {
    host = document.createElement("div");
    host.style.width = "360px";
    host.style.height = "240px";
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "100%";
    element.style.height = "100%";
    host.appendChild(element);
    document.body.appendChild(host);
    await waitFor(
        () => {
            assert.isDefined(element.session);
        },
        { timeout: TIMEOUT_MS },
    );
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    return { element, session: element.session };
}

/**
 * Renders the Style tab of a row of layers.
 * @param session - the element's session.
 * @param element - the element.
 * @param row - the row's layers.
 */
function renderPanel(session: GraphSession, element: HTMLElementTagNameMap["graphty-element"], row: LayerId[]): void {
    const value = makeWorkspaceValue(createWorkspaceStore(), createRegistry([]), session, element);
    render(
        <WorkspaceContext.Provider value={value}>
            <PopoutManager>
                <div style={{ width: 300 }}>
                    <StylePanel layers={row} />
                </div>
            </PopoutManager>
        </WorkspaceContext.Provider>,
    );
}

/**
 * Adds a reader's node layer on top and renders its Style tab.
 * @param session - the element's session.
 * @param element - the element.
 * @returns the layer's id.
 */
async function renderRow(session: GraphSession, element: HTMLElementTagNameMap["graphty-element"]): Promise<LayerId> {
    const layer = await session.styles.add({
        name: "Top",
        target: "node",
        selector: { match: "everything" },
        set: { "node.opacity": 1 },
    });
    renderPanel(session, element, [layer.id]);
    return layer.id;
}

/**
 * A section of the node tab.
 * @param id - the section's id.
 * @returns the section.
 */
function section(id: string): HTMLElement {
    const found = document.querySelector<HTMLElement>(`[data-section="node-${id}"]`);
    assert.isNotNull(found, `the ${id} section is drawn`);
    return found;
}

/**
 * Picks a tile in the open gallery by its name.
 * @param name - the tile's name.
 */
async function pickTile(name: string): Promise<void> {
    const gallery = await screen.findByTestId("shader-gallery", {}, { timeout: TIMEOUT_MS });
    await userEvent.click(within(gallery).getByRole("button", { name: new RegExp(`^${name}`) }));
}

/**
 * Opens the Effects "+" and picks an effect from its gallery.
 * @param name - the effect's name.
 */
async function addEffect(name: string): Promise<void> {
    await userEvent.click(within(section("effects")).getByRole("button", { name: "Add to node effects" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Effect..." }));
    await pickTile(name);
}

/**
 * Closes the settings pop-out the last pick opened.
 */
async function closePopout(): Promise<void> {
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
        assert.isNull(document.querySelector(".ws-shader-params"));
    });
}

/**
 * Binds a parameter from its vary glyph to a column, in the open settings pop-out.
 * @param param - the parameter's name ("Intensity").
 * @param column - the column's name.
 */
async function bindParam(param: string, column: string): Promise<void> {
    await userEvent.click(await screen.findByRole("button", { name: `${param} by attribute` }));
    await userEvent.keyboard(column);
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(`^${column}(,|$)`) }));
}

describe("shader rows on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it("picking Glass marble in Material writes node.shader and opens its settings with focus in the first field; Undo takes it back in one step", async () => {
        const { session, element } = await mountElement();
        const id = await renderRow(session, element);
        await showKind("node");
        const steps = session.history.position;

        await userEvent.click(within(section("rendering")).getByRole("button", { name: "Add to node rendering" }));
        await pickTile("Glass marble");

        await waitFor(() => {
            assert.strictEqual(session.styles.get(id)?.set?.["node.shader"], "glass-marble");
        });
        await waitFor(() => {
            const field = document.activeElement?.closest("[data-option]");
            assert.strictEqual(field?.getAttribute("data-option"), "twist", "focus is in the first parameter");
        });
        assert.strictEqual(session.history.position, steps + 1, "one step");

        await session.undo();
        await waitFor(() => {
            assert.isUndefined(session.styles.get(id)?.set?.["node.shader"]);
        });
    });

    it("hovering gallery tiles changes nothing on the canvas", async () => {
        const { session, element } = await mountElement();
        const id = await renderRow(session, element);
        await showKind("node");
        const before = JSON.stringify(session.styles.explain({ node: "1" }).merged);
        const steps = session.history.position;

        await userEvent.click(within(section("rendering")).getByRole("button", { name: "Add to node rendering" }));
        const gallery = await screen.findByTestId("shader-gallery", {}, { timeout: TIMEOUT_MS });
        const tiles = within(gallery).getAllByRole("button");
        assert.isAbove(tiles.length, 3);
        for (const tile of tiles.slice(0, 4)) {
            await userEvent.hover(tile);
        }

        assert.strictEqual(JSON.stringify(session.styles.explain({ node: "1" }).merged), before);
        assert.strictEqual(session.history.position, steps);
        assert.isUndefined(session.styles.get(id)?.set?.["node.shader"]);
    });

    it("a sprite above puts 'Covered by' on the Shape row, and a mandala puts it on Fill", async () => {
        const { session, element } = await mountElement();
        const low = await session.styles.add({
            name: "Low",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "box", "node.color": "#FF0000" },
        });
        const sprite = await session.styles.add({
            name: "Stickers",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shader": "icon-sticker" },
        });
        renderPanel(session, element, [low.id]);
        await showKind("node");

        await waitFor(
            () => {
                const shape = section("shape").querySelector('.ws-row[data-line="node.shape"]');
                assert.include(
                    shape?.querySelector("[data-covered-caption]")?.textContent ?? "",
                    "Covered by Stickers",
                );
            },
            { timeout: TIMEOUT_MS },
        );
        // The sticker reads the color beneath, so Fill is not covered by it.
        assert.isNull(section("fill").querySelector("[data-covered-caption]"));

        await session.styles.update(sprite.id, { set: { "node.shader": "mandala" } });
        await waitFor(
            () => {
                const fill = section("fill").querySelector('.ws-row[data-line="node.color"]');
                assert.include(fill?.querySelector("[data-covered-caption]")?.textContent ?? "", "Covered by Stickers");
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("binding a parameter that varies writes encode on its key; Aura and Satellites bind separately", async () => {
        const { session, element } = await mountElement();
        const id = await renderRow(session, element);
        await showKind("node");

        await addEffect("Aura");
        await waitFor(() => {
            assert.deepEqual(session.styles.get(id)?.set?.["node.effects"], { "uncertainty-aura": true });
        });
        await bindParam("Intensity", "uncertainty");
        await waitFor(() => {
            const bound = session.styles.get(id)?.encode?.["node.effects.uncertainty-aura.intensity"];
            assert.isTrue(bound !== undefined && "by" in bound && bound.by === "data.uncertainty");
        });
        await closePopout();

        await addEffect("Satellites");
        await bindParam("Moons", "degree");
        await waitFor(() => {
            const encode = session.styles.get(id)?.encode ?? {};
            const aura = encode["node.effects.uncertainty-aura.intensity"];
            const moons = encode["node.effects.orbiting-satellites.moons"];
            assert.isTrue(aura !== undefined && "by" in aura && aura.by === "data.uncertainty");
            assert.isTrue(moons !== undefined && "by" in moons && moons.by === "data.degree");
        });
        assert.deepEqual(Object.keys(session.styles.get(id)?.set?.["node.effects"] ?? {}), [
            "uncertainty-aura",
            "orbiting-satellites",
        ]);
    });

    it("a swap leaves no old parameter set or binding, as one step that Undo restores", async () => {
        const { session, element } = await mountElement();
        const id = await session.styles.add({
            name: "Top",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shader": "glass-marble", "node.shaderParams": { "glass-marble": { twist: 4 } } },
            encode: { "node.shaderParams.glass-marble.spin": { by: "data.degree" } },
        });
        renderPanel(session, element, [id.id]);
        await showKind("node");
        const steps = session.history.position;

        await userEvent.click(within(section("rendering")).getByRole("button", { name: "Material: Glass marble" }));
        await pickTile("Pearl");

        await waitFor(() => {
            assert.strictEqual(session.styles.get(id.id)?.set?.["node.shader"], "pearl");
        });
        assert.isUndefined(session.styles.get(id.id)?.set?.["node.shaderParams"]);
        assert.isUndefined(session.styles.get(id.id)?.encode?.["node.shaderParams.glass-marble.spin"]);
        assert.strictEqual(session.history.position, steps + 1, "one step");

        await session.undo();
        await waitFor(() => {
            assert.strictEqual(session.styles.get(id.id)?.set?.["node.shader"], "glass-marble");
        });
        assert.deepEqual(session.styles.get(id.id)?.set?.["node.shaderParams"], { "glass-marble": { twist: 4 } });
    });

    it("an effect's eye hides it without losing it, and its minus hands focus to the section's '+'", async () => {
        const { session, element } = await mountElement();
        const id = await renderRow(session, element);
        await showKind("node");
        await addEffect("Aura");
        await closePopout();

        await userEvent.click(within(section("effects")).getByRole("button", { name: "Hide aura" }));
        await waitFor(() => {
            assert.deepEqual(session.styles.get(id)?.set?.["node.effects"], {
                "uncertainty-aura": { visible: false },
            });
        });

        await userEvent.click(within(section("effects")).getByRole("button", { name: "Remove aura" }));
        await waitFor(() => {
            assert.isUndefined(session.styles.get(id)?.set?.["node.effects"]);
        });
        await waitFor(() => {
            assert.strictEqual(document.activeElement?.getAttribute("aria-label"), "Add to node effects");
        });
    });

    it("the Line section adds Taper and Lift rows and an edge surface; a lift outside a flat layout says it is drawn flat", async () => {
        const { session, element } = await mountElement();
        const edges = await session.styles.add({
            name: "Edges",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.opacity": 1 },
        });
        renderPanel(session, element, [edges.id]);
        await showKind("edge");
        const line = (): HTMLElement =>
            document.querySelector<HTMLElement>('[data-section="edge-line"]') as HTMLElement;

        await userEvent.click(within(line()).getByRole("button", { name: "Add to edge line" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Surface..." }));
        await pickTile("Fiber");
        await waitFor(() => {
            assert.strictEqual(session.styles.get(edges.id)?.set?.["edge.shader"], "fiber-optic");
        });
        await closePopout();

        await userEvent.click(within(line()).getByRole("button", { name: "Add to edge line" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Taper" }));
        const taper = await waitFor(() => {
            const box = line().querySelector<HTMLInputElement>('[data-line="edge.taper"] input');
            assert.isNotNull(box);
            return box;
        });
        await userEvent.clear(taper);
        await userEvent.type(taper, "0.5{Enter}");
        await waitFor(() => {
            assert.strictEqual(session.styles.get(edges.id)?.set?.["edge.taper"], 0.5);
        });

        await userEvent.click(within(line()).getByRole("button", { name: "Add to edge line" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Lift" }));
        const lift = await waitFor(() => {
            const box = line().querySelector<HTMLInputElement>('[data-line="edge.lift"] input');
            assert.isNotNull(box);
            return box;
        });
        await userEvent.clear(lift);
        await userEvent.type(lift, "2{Enter}");
        await waitFor(() => {
            assert.strictEqual(session.styles.get(edges.id)?.set?.["edge.lift"], 2);
        });
        await waitFor(
            () => {
                assert.include(
                    line().querySelector('[data-line="edge.lift"] [data-undrawn]')?.textContent ?? "",
                    "Flat in this view",
                );
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("the Effects '+' writes an effect a layer beneath adds off", async () => {
        const { session, element } = await mountElement();
        await session.styles.add({
            name: "Beneath",
            target: "node",
            selector: { match: "everything" },
            set: { "node.effects": { "uncertainty-aura": true } },
        });
        const id = await renderRow(session, element);
        await showKind("node");

        await userEvent.click(within(section("effects")).getByRole("button", { name: "Add to node effects" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Aura off" }));
        await waitFor(() => {
            assert.deepEqual(session.styles.get(id)?.set?.["node.effects"], { "uncertainty-aura": false });
        });
        assert.isNotNull(section("effects").querySelector('[data-line="node.effects:uncertainty-aura"]'));
    });
});
