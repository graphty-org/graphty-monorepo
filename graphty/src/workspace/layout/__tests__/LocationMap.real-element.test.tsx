/**
 * The location map on the REAL graphty-element, driven by real input: the location designated in
 * the Data place's Fields (what the element finds preselected), Map picked in the Layout popover
 * reading it, the 3D map (a globe) in the 3D view and the 2D map in the 2D view, Map type picking
 * the 2D map in 3D, and the map under the graph chosen in the same form.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { datasetBase } from "../../start/open";
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
 * @param nodes - the node records, or how to load the graph.
 * @returns the element and the chrome store.
 */
async function openWorkspace(
    inspectGraph: boolean,
    nodes: readonly Record<string, unknown>[] | ((element: Element) => Promise<void>),
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
    await (typeof nodes === "function" ? nodes(element) : element.session.data.addNodes([...nodes]));
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

/**
 * Three cities with separate latitude and longitude columns, under short names, a code, and a
 * second place each, in Europe: Seattle's in Lisbon, Chicago's in Berlin, New York's in Moscow.
 */
const CITIES = [
    { id: "SEA", code: "west", lat: 47.61, lng: -122.33, home: "38.72, -9.14" },
    { id: "CHI", code: "middle", lat: 41.88, lng: -87.63, home: "52.52, 13.4" },
    { id: "NYC", code: "east", lat: 40.71, lng: -74.01, home: "55.76, 37.62" },
];

/**
 * The Data place, opened from the rail as a reader does.
 * @returns queries inside it.
 */
async function openDataPlace(): Promise<ReturnType<typeof within>> {
    await userEvent.click(screen.getByRole("button", { name: "Data" }));
    return within(await screen.findByRole("region", { name: "Data place" }, { timeout: TIMEOUT_MS }));
}

/**
 * Picks a column in one of the Data place's Fields rows.
 * @param place - the Data place.
 * @param row - the row's name.
 * @param column - the column.
 */
async function pickField(place: ReturnType<typeof within>, row: string, column: string): Promise<void> {
    const field = await place.findByRole("combobox", { name: row });
    await userEvent.click(field);
    // Within the field's own list: a role query over a large graph's whole page is slow.
    const list = await waitFor(() => {
        const found = document.getElementById(field.getAttribute("aria-controls") ?? "");
        assert.isNotNull(found);
        return found;
    });
    await userEvent.click(await within(list).findByRole("option", { name: column }));
}

/**
 * Where a node is drawn on screen.
 * @param element - the element.
 * @param id - the node.
 * @returns its position.
 */
function at(element: Element, id: string): { x: number; y: number } {
    const p = element.nodeScreenPosition(id);
    assert.isNotNull(p, id);
    return p ?? { x: NaN, y: NaN };
}

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
 * Picks an entry of a select with the keyboard: opens it, walks the highlight down to the entry
 * and presses Enter. For a list that runs past the popover's visible body, where a click has to
 * scroll the popover and the list moves under the pointer (compact-mantine defect, #4484).
 * @param scope - where the select is.
 * @param label - the select's label.
 * @param option - the entry's name.
 */
async function pickByKeys(scope: HTMLElement, label: string, option: string): Promise<void> {
    await userEvent.click(within(scope).getByRole("combobox", { name: label }));
    const target = await within(scope).findByRole("option", { name: option });
    const highlighted = (): boolean => target.hasAttribute("data-combobox-selected");
    for (const _ of within(scope).getAllByRole("option")) {
        if (highlighted()) {
            break;
        }
        await userEvent.keyboard("{ArrowDown}");
    }
    await waitFor(() => {
        assert.isTrue(highlighted(), `${option} is highlighted`);
    });
    await userEvent.keyboard("{Enter}");
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
 * Lays the airports out on the map, from the location the element finds.
 * @param element - the element.
 */
async function layOutOnMap(element: Element, mapType?: "2D map"): Promise<void> {
    const popover = await openMapForm();
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
    // The map, its camera framing and the nodes' screen size land over several frames after the
    // layout is chosen: read where nodes are drawn, or open the form again, only once they have.
    await element.waitForSettled();
    await element.waitForStableFrame();
}

describe("the location map", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("is picked in the Layout popover, reads the Location the element found, and says how many nodes have no place", async () => {
        const element = await openAirports();
        const popover = await openMapForm();
        const location = within(popover).getByRole("button", { name: "Location" });
        assert.strictEqual(location.textContent, "where", "the column the element found");
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));

        await waitFor(
            () => {
                assert.strictEqual(element.session.layout.id, "location-map");
            },
            { timeout: TIMEOUT_MS },
        );
        await waitFor(() => {
            assert.deepInclude(element.mapFrame?.location, { kind: "location", column: "where" });
        });
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

        await pickByKeys(popover, "Map", "None");
        await waitFor(() => {
            assert.deepStrictEqual(element.session.layout.options.map, { source: "none" });
        });
        await element.waitForStableFrame();
        assert.strictEqual(where(), before, "no node moved");

        // A map of the reader's own: tiles from an address, with the credit it requires, which
        // the element draws on the canvas.
        await pickByKeys(popover, "Map", "Tiles");
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

        await pickByKeys(popover, "Map", "Natural Earth");
        await waitFor(() => {
            assert.deepStrictEqual(element.session.layout.options.map, { source: "natural-earth" });
        });
        await element.waitForStableFrame();
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
        // The app's own choices: nodes one size on screen, on a map six times the element's default.
        assert.strictEqual(element.session.layout.options.nodeScale, "screen");
        assert.strictEqual(element.session.layout.options.mapScale, 6);
        // West to east on screen: Seattle, Chicago, New York; Seattle, the farthest north, highest.
        assert.isBelow(at(element, "SEA").x, at(element, "CHI").x);
        assert.isBelow(at(element, "CHI").x, at(element, "NYC").x);
        assert.isBelow(at(element, "SEA").y, at(element, "NYC").y);
    });

    it("designates Location in Data > Fields over what the element found, and Map reads it", async () => {
        const element = await openAirports(false, CITIES);
        const place = await openDataPlace();
        // Listed with no action from the reader: the pair the element finds by name.
        const latitude = (await place.findByRole("combobox", { name: "Node latitude column" })) as HTMLInputElement;
        assert.strictEqual(latitude.value, "lat");
        assert.strictEqual(
            (place.getByRole("combobox", { name: "Node longitude column" }) as HTMLInputElement).value,
            "lng",
        );

        // One kind replaces another as everywhere else: the minuses, then "+".
        await userEvent.click(place.getByRole("button", { name: "Remove node latitude" }));
        await userEvent.click(await place.findByRole("button", { name: "Remove node longitude" }));
        await waitFor(() => {
            assert.isNull(place.queryByRole("combobox", { name: "Node longitude column" }));
        });
        await userEvent.click(place.getByRole("button", { name: "Add to node fields" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Coordinates" }));
        await userEvent.click(await screen.findByRole("option", { name: "home" }));
        await waitFor(() => {
            assert.deepInclude(element.session.layout.locationColumns(), {
                from: "designated",
                location: "home",
                latitude: null,
                longitude: null,
                role: "coords",
                within: null,
            });
            assert.strictEqual(
                (place.getByRole("combobox", { name: "Node coordinates column" }) as HTMLInputElement).value,
                "home",
            );
            assert.isNull(place.queryByRole("combobox", { name: "Node latitude column" }));
        });

        const popover = await openMapForm();
        assert.strictEqual(within(popover).getByRole("button", { name: "Location" }).textContent, "home");
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
        await waitFor(
            () => {
                assert.deepInclude(element.mapFrame?.location, { kind: "location", column: "home" });
            },
            { timeout: TIMEOUT_MS },
        );
        // Lisbon, Berlin, Moscow from west to east; Moscow, the farthest north, highest.
        await waitFor(() => {
            assert.isBelow(at(element, "SEA").x, at(element, "CHI").x);
            assert.isBelow(at(element, "CHI").x, at(element, "NYC").x);
            assert.isBelow(at(element, "NYC").y, at(element, "SEA").y);
        });
    });

    it("lays a sample out by the Latitude and Longitude picked in Data > Fields", async () => {
        // The contiguous United States, not OpenFlights: the same latitude and longitude columns,
        // and Data > Fields over OpenFlights has its own test (Fields.real-element.test.tsx). The
        // test browser draws on a software GPU, whose cost grows with every node, edge and arrow
        // drawn: one frame of OpenFlights (3,214 nodes, 36,906 edges) held the page 1.4 seconds
        // on an idle machine and 3 under load, and this test draws seven, so it ran past its 15
        // second limit on any busy machine (#3317).
        const { element } = await openWorkspace(false, async (opened) => {
            await opened.session.data.loadDataset("contiguous-usa", datasetBase());
        });
        const place = await openDataPlace();
        await pickField(place, "Node latitude column", "latitude");
        await pickField(place, "Node longitude column", "longitude");
        await waitFor(() => {
            assert.deepInclude(element.session.layout.locationColumns(), {
                from: "designated",
                location: null,
                latitude: "latitude",
                longitude: "longitude",
                role: "coords",
                within: null,
            });
        });

        const popover = await openMapForm();
        assert.strictEqual(
            within(popover).getByRole("button", { name: "Location" }).textContent,
            "latitude, longitude",
        );
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
        await waitFor(
            () => {
                assert.deepInclude(element.mapFrame?.location, {
                    kind: "columns",
                    latitude: "latitude",
                    longitude: "longitude",
                });
            },
            { timeout: TIMEOUT_MS },
        );
        // California, Illinois and New York from west to east; Minnesota north of Florida.
        await waitFor(() => {
            assert.isBelow(at(element, "CA").x, at(element, "IL").x);
            assert.isBelow(at(element, "IL").x, at(element, "NY").x);
            assert.isBelow(at(element, "MN").y, at(element, "FL").y);
        });
    });

    it("opens Data from the Map form's Location", async () => {
        await openAirports(false, CITIES);
        const popover = await openMapForm();
        const location = within(popover).getByRole("button", { name: "Location" });
        assert.strictEqual(location.textContent, "lat, lng");
        await userEvent.click(location);
        await screen.findByRole("region", { name: "Data place" }, { timeout: TIMEOUT_MS });
    });

    it("says once, under Location, what the locations held", async () => {
        const element = await openAirports();
        await layOutOnMap(element);
        const popover = await openMapForm();
        // One node has no place: one note, under Location.
        const notes = await within(popover).findAllByText("1 unreadable or empty", undefined, { timeout: TIMEOUT_MS });
        assert.lengthOf(notes, 1);
        const location = within(popover).getByRole("button", { name: "Location" }).getBoundingClientRect();
        const note = notes[0].getBoundingClientRect();
        assert.isAtLeast(note.top, location.bottom - 1, "the note sits under Location");
        assert.isBelow(note.top - location.bottom, location.height, "right under it");
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
