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

import { dragAcross } from "../../../test/real-pointer";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { CommandButton } from "../../frame/CommandButton";
import { historyTip } from "../../frame/historyWords";
import { GLYPHS } from "../../glyphs";
import { REGISTRATIONS } from "../../registrations";
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

/**
 * Opens a select by its name and picks an option by its name.
 * @param field - the select.
 * @param name - the option's name.
 */
async function pickOption(field: HTMLElement, name: string): Promise<void> {
    await userEvent.click(field);
    const options = await screen.findAllByRole("option");
    const found = options.find((o) => (o.getAttribute("aria-label") ?? o.textContent ?? "").trim() === name);
    assert.isDefined(found, `the picker offers ${name}`);
    if (found !== undefined) {
        await userEvent.click(found);
    }
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

        // An edge surface is one of the Pattern row's choices (design 6.1), not a "+" item of its own.
        await userEvent.click(within(line()).getByRole("button", { name: "Add to edge line" }));
        assert.isNull(screen.queryByRole("menuitem", { name: "Surface..." }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Pattern" }));
        await pickOption(await within(line()).findByRole("combobox", { name: /^Edge pattern/ }), "Fiber");
        await waitFor(() => {
            assert.strictEqual(session.styles.get(edges.id)?.set?.["edge.shader"], "fiber-optic");
        });
        assert.isUndefined(session.styles.get(edges.id)?.set?.["edge.style"], "the pattern itself is not written");
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

    it("a row whose shader draws nothing says why, and stops saying it once it runs", async () => {
        const { session, element } = await mountElement();
        const text = [
            "/* graphty-shader 1",
            '{ "id": "user/ring", "name": "Ring", "role": "effect", "reach": 2 }',
            "*/",
            "vec4 shade(NodeInput n) { float r = step(abs(length(n.uv) - 0.8), 0.05); return vec4(r, r, r, r); }",
        ].join("\n");
        const added = await session.shaders.add(text, { source: "content" });
        assert.isTrue(added.ok);
        const ring = await session.styles.add({
            name: "Ring",
            target: "node",
            selector: { match: "everything" },
            set: { "node.effects": { "user/ring": true } },
        });
        renderPanel(session, element, [ring.id]);
        await showKind("node");

        const line = (): HTMLElement | null => section("effects").querySelector('[data-shader="user/ring"]');
        await waitFor(() => {
            assert.include(line()?.textContent ?? "", "Held until you run it");
        });
        await session.shaders.approve("user/ring");
        await waitFor(
            () => {
                assert.isNull(line()?.querySelector("[data-shader-problem]") ?? null);
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("Backspace on a tile in a row's gallery keeps the row; on the row's own button it removes it", async () => {
        const { session, element } = await mountElement();
        const layer = await session.styles.add({
            name: "Top",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shader": "glass-marble" },
        });
        renderPanel(session, element, [layer.id]);
        await showKind("node");

        const pick = within(section("rendering")).getByRole("button", { name: "Material: Glass marble" });
        await userEvent.click(pick);
        await screen.findByTestId("shader-gallery", {}, { timeout: TIMEOUT_MS });
        await userEvent.keyboard("{ArrowDown}");
        assert.isTrue(document.activeElement?.classList.contains("ws-gallery-tile"), "a tile has focus");
        await userEvent.keyboard("{Backspace}");
        assert.strictEqual(session.styles.get(layer.id)?.set?.["node.shader"], "glass-marble", "the row is kept");

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByTestId("shader-gallery"));
        });
        within(section("rendering")).getByRole("button", { name: "Material: Glass marble" }).focus();
        await userEvent.keyboard("{Backspace}");
        await waitFor(() => {
            assert.isUndefined(session.styles.get(layer.id)?.set?.["node.shader"]);
        });
    });

    it("the gallery is one Tab stop: ArrowDown from search enters it, the arrows move and stop at the ends, and the tile in use is current", async () => {
        const { session, element } = await mountElement();
        const layer = await session.styles.add({
            name: "Top",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shader": "pearl" },
        });
        renderPanel(session, element, [layer.id]);
        await showKind("node");

        await userEvent.click(within(section("rendering")).getByRole("button", { name: "Material: Pearl" }));
        const gallery = await screen.findByTestId("shader-gallery", {}, { timeout: TIMEOUT_MS });
        assert.lengthOf(gallery.querySelectorAll('.ws-gallery-tile[tabindex="0"]'), 1, "one Tab stop");
        const pearl = gallery.querySelector<HTMLElement>('.ws-gallery-tile[data-shader="pearl"]');
        assert.isNotNull(pearl);
        assert.strictEqual(pearl.getAttribute("aria-current"), "true");
        assert.isNull(pearl.getAttribute("aria-pressed"));
        assert.strictEqual(pearl.getAttribute("tabindex"), "0", "the tile in use is the stop");

        await userEvent.keyboard("{ArrowDown}");
        assert.strictEqual(document.activeElement, pearl);
        await userEvent.keyboard("{Home}");
        const first = gallery.querySelector<HTMLElement>(".ws-gallery-tile:not([aria-disabled])");
        assert.strictEqual(document.activeElement, first);
        await userEvent.keyboard("{ArrowLeft}{ArrowUp}");
        assert.strictEqual(document.activeElement, first, "the arrows stop at the first tile");
        await userEvent.keyboard("{ArrowRight}");
        assert.notStrictEqual(document.activeElement, first);
        assert.strictEqual(document.activeElement?.getAttribute("tabindex"), "0", "the stop follows focus");
        // The gallery's foot is in view however long the grid is.
        const paste = within(gallery).getByRole("button", { name: "Paste shader..." });
        const panel = paste.closest<HTMLElement>(".cm-popout-body");
        assert.isAtMost(paste.getBoundingClientRect().bottom, (panel?.getBoundingClientRect().bottom ?? 0) + 1);
    });

    it("Shape lists the sprites: Sticker writes node.shader, covers the layer's own Shape row, and Material's '+' says why it adds nothing", async () => {
        const { session, element } = await mountElement();
        const layer = await session.styles.add({
            name: "Top",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "box" },
        });
        renderPanel(session, element, [layer.id]);
        await showKind("node");
        assert.isNull(
            within(section("shape")).queryByRole("menuitem", { name: "Sprite..." }),
            "no sprite gallery in the '+'",
        );

        await pickOption(within(section("shape")).getByRole("combobox", { name: /^Node shape/ }), "Sticker");
        await waitFor(() => {
            assert.strictEqual(session.styles.get(layer.id)?.set?.["node.shader"], "icon-sticker");
        });
        assert.strictEqual(session.styles.get(layer.id)?.set?.["node.shape"], "box", "the shape is kept");
        await waitFor(
            () => {
                const shape = section("shape").querySelector('.ws-row[data-line="node.shape"]');
                assert.include(shape?.querySelector("[data-covered-caption]")?.textContent ?? "", "Covered by Sticker");
            },
            { timeout: TIMEOUT_MS },
        );
        const plus = within(section("rendering")).getByRole("button", { name: "Add to node rendering" });
        assert.strictEqual(plus.getAttribute("aria-disabled"), "true");
        assert.strictEqual(plus.getAttribute("aria-description"), "Sticker is set in Shape");
    });

    it("an effect row names its trigger, its eye keeps one name with its state pressed, and Copy effect then Paste replaces a sprite's", async () => {
        const { session, element } = await mountElement();
        const layer = await session.styles.add({
            name: "Top",
            target: "node",
            selector: { match: "everything" },
            set: { "node.effects": { "change-flash": true }, "node.shader": "icon-sticker" },
        });
        renderPanel(session, element, [layer.id]);
        await showKind("node");

        const pick = await within(section("effects")).findByRole("button", { name: "Effect: Change flash, On change" });
        assert.include(pick.textContent ?? "", "Change flash");
        const eye = within(section("effects")).getByRole("button", { name: "Hide change flash" });
        assert.strictEqual(eye.getAttribute("aria-pressed"), "false");
        await userEvent.click(eye);
        await waitFor(() => {
            const hidden = within(section("effects")).getByRole("button", { name: "Hide change flash" });
            assert.strictEqual(hidden.getAttribute("aria-pressed"), "true");
        });

        // Copy the sticker, swap the sprite for a mandala, then paste the sticker back over it.
        const row = section("shape").querySelector<HTMLElement>('[data-shader="icon-sticker"]');
        assert.isNotNull(row);
        await userEvent.click(row, { button: "right" });
        assert.isNotNull(await screen.findByRole("menuitem", { name: "Copy sprite" }));
        assert.isNotNull(screen.getByRole("menuitem", { name: "Copy code" }));
        await userEvent.click(screen.getByRole("menuitem", { name: "Copy sprite" }));
        await session.styles.update(layer.id, { set: { "node.shader": "mandala" } });
        const swapped = await waitFor(() => {
            const found = section("shape").querySelector<HTMLElement>('[data-shader="mandala"]');
            assert.isNotNull(found);
            return found;
        });
        const steps = session.history.position;
        await userEvent.click(swapped, { button: "right" });
        await userEvent.click(await screen.findByRole("menuitem", { name: "Paste" }));
        await waitFor(() => {
            assert.strictEqual(session.styles.get(layer.id)?.set?.["node.shader"], "icon-sticker");
        });
        assert.strictEqual(session.history.position, steps + 1, "one step");
    });

    it("a '+' that opens a gallery says so and whether it is open", async () => {
        const { session, element } = await mountElement();
        await renderRow(session, element);
        await showKind("node");
        const plus = within(section("rendering")).getByRole("button", { name: "Add to node rendering" });
        assert.strictEqual(plus.getAttribute("aria-haspopup"), "dialog");
        assert.strictEqual(plus.getAttribute("aria-expanded"), "false");
        await userEvent.click(plus);
        await screen.findByTestId("shader-gallery", {}, { timeout: TIMEOUT_MS });
        assert.strictEqual(plus.getAttribute("aria-expanded"), "true");
    });
});

describe("a shader's settings pop-out", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    /**
     * The open pop-out's row for one parameter.
     * @param name - the parameter's id.
     * @returns the row.
     */
    function paramRow(name: string): HTMLElement {
        const row = document.querySelector<HTMLElement>(`.ws-shader-params [data-option="${name}"]`);
        assert.isNotNull(row, `the ${name} row is drawn`);
        return row;
    }

    it("draws property rows: a label column, bounded fields, one minus, Motion as the speed field and a named color chip", async () => {
        const { session, element } = await mountElement();
        const id = await renderRow(session, element);
        await showKind("node");
        await addEffect("Reticle");
        await screen.findByRole("dialog", { name: "Reticle settings" }, { timeout: TIMEOUT_MS });

        // Every parameter is a row of the panel: its name in the label column, beside its field.
        for (const name of ["hudColor", "ticks", "lineWidth"]) {
            assert.isNotNull(paramRow(name).querySelector(".ws-field[data-named] > .ws-field-label"));
        }
        // A number field is bounded by the parameter's range.
        const ticks = within(paramRow("ticks")).getByRole("spinbutton", { name: "Ticks" });
        assert.strictEqual(ticks.getAttribute("aria-valuemin"), "8");
        assert.strictEqual(ticks.getAttribute("aria-valuemax"), "120");
        // Motion is the speed parameter's own field, not its name as words.
        const motion = screen.getByTestId("shader-motion");
        within(motion).getByRole("spinbutton", { name: "Motion" });
        assert.isNull(
            document.querySelector('.ws-shader-params [data-option="spin"]:not([data-testid="shader-motion"] *)'),
        );
        // Nothing set yet: no reset anywhere.
        assert.isNull(screen.queryByRole("button", { name: /^Reset / }));

        await userEvent.clear(ticks);
        await userEvent.type(ticks, "60{Enter}");
        await waitFor(() => {
            assert.deepEqual(session.styles.get(id)?.set?.["node.effects"], { "lock-on-reticle": { ticks: 60 } });
        });
        // One minus, the only reset, on the one parameter set.
        assert.lengthOf(screen.getAllByRole("button", { name: /^Reset / }), 1);
        within(paramRow("ticks")).getByRole("button", { name: "Reset ticks" });

        // A color chip is named after its parameter.
        await closePopout();
        await addEffect("Aura");
        await screen.findByRole("dialog", { name: "Aura settings" }, { timeout: TIMEOUT_MS });
        within(paramRow("auraColor")).getByRole("button", { name: "Pick aura color" });
    });

    it("scrubs a number by its name, inside the parameter's range, as one undo step", async () => {
        const { session, element } = await mountElement();
        const id = await renderRow(session, element);
        await showKind("node");
        await addEffect("Reticle");
        await screen.findByRole("dialog", { name: "Reticle settings" }, { timeout: TIMEOUT_MS });
        const steps = session.history.position;

        const label = paramRow("lineWidth").querySelector(".ws-field-label");
        assert.isNotNull(label);
        // Far past the top of the range: the value stops at the parameter's max.
        await dragAcross(label, 600);
        await waitFor(() => {
            const effects = session.styles.get(id)?.set?.["node.effects"] as Record<string, Record<string, number>>;
            assert.strictEqual(effects["lock-on-reticle"]?.lineWidth, 5);
        });
        assert.strictEqual(session.history.position, steps + 1, "one step for the whole drag");
    });

    it("draws an integer that picks one of a set as its pictures", async () => {
        const { session, element } = await mountElement();
        const layer = await session.styles.add({
            name: "Stickers",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shader": "icon-sticker" },
        });
        renderPanel(session, element, [layer.id]);
        await showKind("node");
        await userEvent.click(await screen.findByRole("button", { name: "Sticker settings" }, { timeout: TIMEOUT_MS }));
        const grid = await screen.findByRole("group", { name: "Icon" });
        assert.isNull(within(paramRow("icon")).queryByRole("spinbutton"), "no bare number box");
        await userEvent.click(within(grid).getByRole("button", { name: "Heart outline" }));
        await waitFor(() => {
            assert.deepEqual(session.styles.get(layer.id)?.set?.["node.shaderParams"], { "icon-sticker": { icon: 8 } });
        });
        assert.strictEqual(
            within(grid).getByRole("button", { name: "Heart outline" }).getAttribute("aria-pressed"),
            "true",
        );
    });

    it("names the effect and the parameter in Undo, and stays open when Undo is pressed", async () => {
        const { session, element } = await mountElement();
        const layer = await session.styles.add({
            name: "Top",
            target: "node",
            selector: { match: "everything" },
            set: { "node.opacity": 1 },
        });
        const value = makeWorkspaceValue(createWorkspaceStore(), createRegistry(REGISTRATIONS), session, element);
        render(
            <WorkspaceContext.Provider value={value}>
                <PopoutManager>
                    <CommandButton id="history.undo" icon={<GLYPHS.undo size={16} aria-hidden />} keepsPopouts />
                    <div style={{ width: 300 }}>
                        <StylePanel layers={[layer.id]} />
                    </div>
                </PopoutManager>
            </WorkspaceContext.Provider>,
        );
        await showKind("node");
        await addEffect("Reticle");
        await screen.findByRole("dialog", { name: "Reticle settings" }, { timeout: TIMEOUT_MS });
        assert.strictEqual(historyTip(session, true), "Undo adding Reticle");

        const ticks = within(paramRow("ticks")).getByRole("spinbutton", { name: "Ticks" });
        await userEvent.clear(ticks);
        await userEvent.type(ticks, "60{Enter}");
        await waitFor(() => {
            assert.strictEqual(historyTip(session, true), "Undo changing Reticle ticks");
        });

        await userEvent.click(screen.getByRole("button", { name: /^Undo/ }));
        await waitFor(() => {
            assert.deepEqual(session.styles.get(layer.id)?.set?.["node.effects"], { "lock-on-reticle": true });
        });
        // The pop-out the change was made in stays open, showing the value taken back.
        screen.getByRole("dialog", { name: "Reticle settings" });
        assert.strictEqual(
            within(paramRow("ticks")).getByRole("spinbutton", { name: "Ticks" }).getAttribute("aria-valuenow"),
            "48",
        );
    });
});
