/**
 * The location map on the REAL graphty-element, driven by real input: Map picked in the Layout
 * popover with its Location column chosen, Surface switched between a flat map and a globe, and
 * the map under the graph chosen in Graph settings.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
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
async function openAirports(inspectGraph = false): Promise<Element> {
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
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges([
        { source: "SFO", target: "JFK" },
        { source: "JFK", target: "LHR" },
    ]);
    const tool = screen.getByRole("button", { name: "Layout" });
    await waitFor(() => {
        assert.isFalse(tool.hasAttribute("aria-disabled"));
    });
    return element;
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
 * Lays the airports out on the map, its Location column picked.
 * @param element - the element.
 */
async function layOutOnMap(element: Element): Promise<void> {
    const popover = await openMapForm();
    await pick(popover, "Location", /where/i);
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

    it("switches between a flat map and a globe with Surface", async () => {
        const element = await openAirports();
        await layOutOnMap(element);
        assert.strictEqual(element.session.layout.options.surface ?? "flat", "flat");

        let popover = await openMapForm();
        await pick(popover, "Surface", "Globe");
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
        await waitFor(() => {
            assert.strictEqual(element.session.layout.options.surface, "globe");
        });

        popover = await openMapForm();
        const surface = within(popover).getByRole<HTMLInputElement>("combobox", { name: "Surface" });
        assert.strictEqual(surface.value, "Globe", "the form opens on what is drawn");
        await pick(popover, "Surface", "Flat map");
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
        await waitFor(() => {
            assert.strictEqual(element.session.layout.options.surface, "flat");
        });
    });

    it("chooses the map under the graph in Graph settings, shown only while the layout draws one", async () => {
        const element = await openAirports(true);
        await userEvent.click(await screen.findByRole("tab", { name: "Style" }, { timeout: TIMEOUT_MS }));
        await screen.findByRole("combobox", { name: "Lighting" }, { timeout: TIMEOUT_MS });
        assert.isNull(screen.queryByRole("combobox", { name: "Map" }), "no map under a force layout");

        await layOutOnMap(element);
        const map = await screen.findByRole<HTMLInputElement>("combobox", { name: "Map" });
        assert.strictEqual(map.value, "Natural Earth", "the bundled world map until one is chosen");
        const panel = map.closest("section") ?? document.body;

        await pick(panel, "Map", "None");
        await waitFor(() => {
            assert.deepStrictEqual(element.session.config.basemap, { source: "none" });
        });

        // A map of the reader's own: tiles from an address, with the credit it requires, which
        // the element draws on the canvas.
        await pick(panel, "Map", "Tiles");
        await userEvent.fill(within(panel).getByRole("textbox", { name: "Credit" }), "Test tiles");
        await userEvent.fill(
            within(panel).getByRole("textbox", { name: "Address" }),
            "http://127.0.0.1:9/{z}/{x}/{y}.png",
        );
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepStrictEqual(element.session.config.basemap, {
                tiles: "http://127.0.0.1:9/{z}/{x}/{y}.png",
                attribution: "Test tiles",
            });
        });
        await waitFor(
            () => {
                assert.include(element.basemapStatus.attribution, "Test tiles");
            },
            { timeout: TIMEOUT_MS },
        );

        await pick(panel, "Map", "Natural Earth");
        await waitFor(() => {
            assert.deepStrictEqual(element.session.config.basemap, { source: "natural-earth" });
        });
    });
});
