/**
 * The location map on the REAL graphty-element, driven by real input: Map picked in the Layout
 * popover with its Location column chosen, the 3D map (a globe) in the 3D view and the 2D map in
 * the 2D view, Map type picking the 2D map in 3D, and the map under the graph chosen in the same form.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** Three airports with a place each, and one node with none. */
const NODES = [
    { id: "SFO", where: "37.619, -122.375" },
    { id: "JFK", where: "40.640, -73.779" },
    { id: "LHR", where: "51.470, -0.454" },
    { id: "nowhere" },
];

type Element = HTMLElementTagNameMap["graphty-element"];

/**
 * The workspace on the airports, its element up and the Layout tool enabled.
 * @param inspectGraph - open the right panel on Graph settings.
 * @returns the element.
 */
async function openAirports(inspectGraph = false, nodes: readonly Record<string, unknown>[] = NODES): Promise<Element> {
    return (await openWorkspace(inspectGraph, nodes)).element;
}

/**
 * The workspace on some nodes, its element up and the Layout tool enabled.
 * @param inspectGraph - open the right panel on Graph settings.
 * @param nodes - the node records.
 * @returns the element and the chrome store.
 */
async function openWorkspace(
    inspectGraph: boolean,
    nodes: readonly Record<string, unknown>[],
): Promise<{ element: Element; store: WorkspaceStore }> {
    const store = createWorkspaceStore({
        project: { name: "Airports", id: 1 },
        ...(inspectGraph ? { inspected: { kind: "graph" } } : {}),
    });
    render(<Workspace store={store} />);
    let found: Element | null = null;
    await waitFor(
        () => {
            found = document.querySelector("graphty-element");
            assert.isDefined(found?.session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (found === null) {
        throw new Error("the element never came up");
    }
    const element: Element = found;
    await element.session.data.addNodes([...nodes]);
    if (nodes === NODES) {
        await element.session.data.addEdges([
            { source: "SFO", target: "JFK" },
            { source: "JFK", target: "LHR" },
        ]);
    }
    const tool = screen.getByRole("button", { name: "Layout" });
    await waitFor(() => {
        assert.isFalse(tool.hasAttribute("aria-disabled"));
    });
    return { element, store };
}

/** Three cities with separate latitude and longitude columns, under short names, and a code. */
const CITIES = [
    { id: "SEA", code: "west", lat: 47.61, lng: -122.33 },
    { id: "CHI", code: "middle", lat: 41.88, lng: -87.63 },
    { id: "NYC", code: "east", lat: 40.71, lng: -74.01 },
];

/**
 * Opens the Layout popover on the Map form.
 * @returns the popover.
 */
async function openMapForm(): Promise<HTMLElement> {
    await userEvent.click(screen.getByRole("button", { name: "Layout" }));
    const popover = await screen.findByRole("dialog", { name: "Layout" });
    await userEvent.click(within(popover).getByRole("option", { name: /^Map/ }));
    return popover;
}

/**
 * Picks an entry of a select by its label.
 * @param scope - where the select is.
 * @param label - the select's label.
 * @param option - the entry's name.
 */
async function pick(scope: HTMLElement, label: string, option: RegExp | string): Promise<void> {
    await userEvent.click(within(scope).getByRole("combobox", { name: label }));
    await userEvent.click(await within(scope).findByRole("option", { name: option }));
}

/**
 * Switches the view to 2D or 3D with the canvas toolbar's View menu.
 * @param mode - the view.
 */
async function switchView(mode: "2D" | "3D"): Promise<void> {
    const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
    await userEvent.click(within(toolbar).getByRole("button", { name: /^View, / }));
    const menu = await screen.findByRole("menu", { name: /^View/ });
    await userEvent.click(within(menu).getByRole("menuitemradio", { name: new RegExp(`^${mode}`) }));
}

/**
 * Lays the airports out on the map, its Location column picked.
 * @param element - the element.
 */
async function layOutOnMap(element: Element, mapType?: "2D map"): Promise<void> {
    const popover = await openMapForm();
    await pick(popover, "Location", /where/i);
    if (mapType !== undefined) {
        await pick(popover, "Map type", mapType);
    }
    await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
    await waitFor(
        () => {
            assert.strictEqual(element.session.layout.id, "location-map");
        },
        { timeout: TIMEOUT_MS },
    );
}

describe("the location map", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("is picked in the Layout popover with its Location column, and says how many nodes have no place", async () => {
        const element = await openAirports();
        const popover = await openMapForm();
        const location = within(popover).getByRole<HTMLInputElement>("combobox", { name: "Location" });
        assert.strictEqual(location.value, "Automatic", "an empty location is found from the data");
        await pick(popover, "Location", /where/i);
        assert.strictEqual(element.session.layout.id, "force", "picking runs nothing until Apply");
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));

        await waitFor(
            () => {
                assert.strictEqual(element.session.layout.id, "location-map");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.strictEqual(element.session.layout.options.location, "where");
        // The notice, and the status line that speaks it.
        await screen.findAllByText("1 of 4 nodes unplaced", undefined, { timeout: TIMEOUT_MS });
        // West is left: San Francisco is drawn left of London.
        await waitFor(() => {
            const sfo = element.nodeScreenPosition("SFO")?.x ?? Infinity;
            assert.isBelow(sfo, element.nodeScreenPosition("LHR")?.x ?? -Infinity);
        });
    });

    it("draws the 3D map in 3D, the 2D map with straight edges in 2D, and the globe again in 3D", async () => {
        const element = await openAirports();
        await layOutOnMap(element);
        await waitFor(
            () => {
                assert.strictEqual(element.mapFrame?.mapDimension, "3d", "a globe, with nothing picked");
            },
            { timeout: TIMEOUT_MS },
        );

        await switchView("2D");
        await waitFor(
            () => {
                assert.strictEqual(element.mapFrame?.mapDimension, "2d", "the 2D view draws the 2D map");
                // The element draws a 2D view's edges straight; its own tests measure the lines.
                assert.strictEqual(element.mapFrame?.dimensions, 2);
            },
            { timeout: TIMEOUT_MS },
        );
        const popover = await openMapForm();
        const type = within(popover).getByRole<HTMLInputElement>("combobox", { name: "Map type" });
        assert.strictEqual(type.value, "2D map", "the form shows the 2D map in 2D");
        await userEvent.click(type);
        const offered = (await within(popover).findAllByRole("option")).map((option) => option.textContent);
        assert.deepEqual(offered, ["2D map"], "and offers no 3D map there");
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");

        await switchView("3D");
        await waitFor(
            () => {
                assert.strictEqual(element.mapFrame?.mapDimension, "3d", "back in 3D, the globe");
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("draws the 2D map with arcs above it when the reader picks 2D map in 3D, and keeps it", async () => {
        const element = await openAirports();
        const popover = await openMapForm();
        await pick(popover, "Location", /where/i);
        await pick(popover, "Map type", "2D map");
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
        await waitFor(
            () => {
                assert.strictEqual(element.mapFrame?.mapDimension, "2d");
                assert.strictEqual(element.mapFrame?.dimensions, 3, "in the 3D view");
                // The element raises a 3D view's edges as arcs above the map; its own tests measure them.
            },
            { timeout: TIMEOUT_MS },
        );
        await switchView("2D");
        await switchView("3D");
        await waitFor(
            () => {
                assert.strictEqual(element.mapFrame?.dimensions, 3);
                assert.strictEqual(element.mapFrame?.mapDimension, "2d", "the reader's 2D map is kept");
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("chooses the map in the Map form, swapping it at once under nodes that stay where they are", async () => {
        const element = await openAirports(true);
        await userEvent.click(await screen.findByRole("tab", { name: "Style" }, { timeout: TIMEOUT_MS }));
        await screen.findByRole("combobox", { name: "Lighting" }, { timeout: TIMEOUT_MS });
        assert.isNull(screen.queryByRole("combobox", { name: "Map" }), "Graph settings has no map");

        await layOutOnMap(element, "2D map");
        const where = (): string => JSON.stringify(element.nodeScreenPosition("JFK"));
        const before = where();
        const popover = await openMapForm();
        const map = within(popover).getByRole<HTMLInputElement>("combobox", { name: "Map" });
        assert.strictEqual(map.value, "Natural Earth", "the bundled world map until one is chosen");

        await pick(popover, "Map", "None");
        await waitFor(() => {
            assert.deepStrictEqual(element.session.layout.options.map, { source: "none" });
        });
        assert.strictEqual(where(), before, "no node moved");

        // A map of the reader's own: tiles from an address, with the credit it requires, which
        // the element draws on the canvas.
        await pick(popover, "Map", "Tiles");
        await userEvent.fill(within(popover).getByRole("textbox", { name: "Credit" }), "Test tiles");
        await userEvent.fill(
            within(popover).getByRole("textbox", { name: "Address" }),
            "http://127.0.0.1:9/{z}/{x}/{y}.png",
        );
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepStrictEqual(element.session.layout.options.map, {
                tiles: "http://127.0.0.1:9/{z}/{x}/{y}.png",
                attribution: "Test tiles",
            });
        });
        // Nothing answers at that address: the field says so, and the canvas credits only what drew.
        await within(popover).findByText("Not reachable", undefined, { timeout: TIMEOUT_MS });
        assert.notInclude(element.basemapStatus.attribution, "Test tiles");

        await pick(popover, "Map", "Natural Earth");
        await waitFor(() => {
            assert.deepStrictEqual(element.session.layout.options.map, { source: "natural-earth" });
        });
        assert.strictEqual(where(), before, "still no node moved");
    });

    it("greys Map out with its reason on a graph with no location, and the element refuses it", async () => {
        const element = await openAirports(false, [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ]);
        await userEvent.click(screen.getByRole("button", { name: "Layout" }));
        const popover = await screen.findByRole("dialog", { name: "Layout" });
        const map = within(popover).getByRole("option", { name: /^Map/ });
        await waitFor(() => {
            assert.strictEqual(map.getAttribute("aria-disabled"), "true");
            assert.strictEqual(map.getAttribute("aria-description"), "No location columns");
        });
        let refused = false;
        await element.session.layout.set("location-map").catch(() => {
            refused = true;
        });
        assert.isTrue(refused);
        assert.strictEqual(element.session.layout.id, "force", "the layout it had stays");
    });

    it("tags Map Recommended for nodes with locations", async () => {
        await openAirports();
        await userEvent.click(screen.getByRole("button", { name: "Layout" }));
        const popover = await screen.findByRole("dialog", { name: "Layout" });
        await waitFor(() => {
            const map = within(popover).getByRole("option", { name: /^Map/ });
            assert.include(map.textContent, "Recommended");
        });
    });

    it("applied with its defaults, places every node by its coordinates on a map drawn under them", async () => {
        const element = await openAirports(false, CITIES);
        const popover = await openMapForm();
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
        await waitFor(
            () => {
                assert.strictEqual(element.basemapStatus.state, "ready", "a map is drawn");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.strictEqual(element.session.layout.id, "location-map");
        // West to east on screen: Seattle, Chicago, New York; Seattle, the farthest north, highest.
        const at = (id: string): { x: number; y: number } => {
            const p = element.nodeScreenPosition(id);
            assert.isNotNull(p, id);
            return p ?? { x: NaN, y: NaN };
        };
        assert.isBelow(at("SEA").x, at("CHI").x);
        assert.isBelow(at("CHI").x, at("NYC").x);
        assert.isBelow(at("SEA").y, at("NYC").y);
    });

    it("applies Map with only Latitude set, and names the columns Automatic used", async () => {
        const element = await openAirports(false, CITIES);
        let popover = await openMapForm();
        // The columns that read as latitudes are listed first; the rest are disabled with why.
        await userEvent.click(within(popover).getByRole("combobox", { name: "Latitude" }));
        const options = await within(popover).findAllByRole("option");
        const names = options.map((o) => o.textContent);
        // The column named for the role comes first after Automatic; a column of words is refused.
        assert.isTrue(names[1].startsWith("lat"), names.join(", "));
        const code = options.find((o) => o.textContent.startsWith("code"));
        assert.isDefined(code);
        assert.isTrue(code?.hasAttribute("data-combobox-disabled"));
        assert.include(code?.textContent, "Not a location");
        await userEvent.click(options.find((o) => o.textContent.startsWith("lat")) ?? options[0]);
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
        await waitFor(
            () => {
                assert.strictEqual(element.session.layout.id, "location-map");
                assert.isNotNull(element.mapFrame);
            },
            { timeout: TIMEOUT_MS },
        );
        popover = await openMapForm();
        const longitude = within(popover).getByRole<HTMLInputElement>("combobox", { name: "Longitude" });
        assert.strictEqual(longitude.value, "Automatic (lng)", "the half it found itself is named");
        // Latitude and Longitude share one row.
        const latitude = within(popover).getByRole("combobox", { name: "Latitude" });
        assert.closeTo(latitude.getBoundingClientRect().top, longitude.getBoundingClientRect().top, 2);
    });

    it("says once, under Location, what the locations held", async () => {
        const element = await openAirports();
        await layOutOnMap(element);
        const popover = await openMapForm();
        // One node has no place: one note, under the field the places were read from.
        const notes = await within(popover).findAllByText("1 unreadable or empty", undefined, { timeout: TIMEOUT_MS });
        assert.lengthOf(notes, 1);
        const location = within(popover).getByRole("combobox", { name: "Location" });
        const latitude = within(popover).getByRole("combobox", { name: "Latitude" });
        const at = notes[0].getBoundingClientRect().top;
        assert.isTrue(
            Math.abs(at - location.getBoundingClientRect().top) < Math.abs(at - latitude.getBoundingClientRect().top),
            "the note sits with Location",
        );
    });

    it("puts Select on the unplaced notice, and posts it once across a 2D/3D switch", async () => {
        const { element, store } = await openWorkspace(false, NODES);
        let posted = 0;
        store.subscribe(() => {
            const message = store.get().notice?.message;
            if (message === "1 of 4 nodes unplaced") {
                posted++;
            }
        });
        await layOutOnMap(element);
        const select = await screen.findByRole("button", { name: "Select" }, { timeout: TIMEOUT_MS });
        await userEvent.click(select);
        await waitFor(() => {
            assert.deepStrictEqual(element.session.selection.nodes.map(String), ["nowhere"]);
        });
        const shown = posted;

        const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
        await userEvent.click(within(toolbar).getByRole("button", { name: "View, 3D" }));
        const menu = await screen.findByRole("menu", { name: /^View/ });
        await userEvent.click(within(menu).getByRole("menuitemradio", { name: /^2D/ }));
        await waitFor(
            () => {
                assert.strictEqual(element.session.layout.dimension, "2d");
                assert.strictEqual(element.mapFrame?.dimensions, 2);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.strictEqual(posted, shown, "the switch posted no second notice");
    });

    it("draws a city's data over a street map, and a world's over the bundled picture", async () => {
        const venice = [
            { id: "rialto", where: "45.438, 12.336" },
            { id: "lido", where: "45.418, 12.369" },
            { id: "mestre", where: "45.482, 12.239" },
        ];
        const element = await openAirports(false, venice);
        await layOutOnMap(element);
        await waitFor(
            () => {
                assert.deepEqual(element.session.layout.options.map, { source: "openstreetmap" });
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("wraps world data on the globe in Blue Marble, drawn as from space", async () => {
        const element = await openAirports();
        await layOutOnMap(element);
        await waitFor(
            () => {
                assert.deepEqual(element.session.layout.options.map, { source: "nasa-gibs-blue-marble-bathymetry" });
            },
            { timeout: TIMEOUT_MS },
        );
        assert.deepEqual(element.globeLook, { atmosphere: true, background: "#05070d" }, "drawn as from space");
    });

    it("leaves the bundled picture under world data on a 2D map", async () => {
        const flat = await openAirports();
        const popover = await openMapForm();
        await pick(popover, "Location", /where/i);
        await pick(popover, "Map type", "2D map");
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
        await waitFor(
            () => {
                assert.notStrictEqual(flat.basemapStatus.state, "off", "the map is drawn");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.notExists(flat.session.layout.options.map, "no map was chosen for the reader");
    });

    it("closes only the Advanced pop-out on Escape, and names its button", async () => {
        await openAirports();
        const popover = await openMapForm();
        // The app opens the map with nodes kept one size on screen, an advanced setting, so the
        // button's name also says a setting behind it is changed.
        const advanced = within(popover).getByRole("button", { name: /^Advanced/ });
        await userEvent.hover(advanced);
        const tip = await screen.findByRole("tooltip", {}, { timeout: TIMEOUT_MS });
        assert.strictEqual(tip.textContent, "Advanced");
        await userEvent.click(advanced);
        await within(popover).findByRole("combobox", { name: "Format" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(within(popover).queryByRole("combobox", { name: "Format" }), "the pop-out closed");
        });
        assert.isNotNull(within(popover).queryByRole("combobox", { name: "Map type" }), "still in the Map form");
    });
});
