import "../index.ts";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { ViewMode } from "../src/config";
import type { Graphty } from "../src/graphty-element";
import { assertGraphLoaded, assertViewMode, drawn, holds, renderedElement } from "./assertions";
import { eventWaitingDecorator } from "./helpers";

/** Ten cities with their latitude and longitude, the same every load. */
const CITIES = [
    { id: "SEA", latitude: 47.61, longitude: -122.33 },
    { id: "SFO", latitude: 37.77, longitude: -122.42 },
    { id: "LAX", latitude: 34.05, longitude: -118.24 },
    { id: "DEN", latitude: 39.74, longitude: -104.99 },
    { id: "DFW", latitude: 32.78, longitude: -96.8 },
    { id: "CHI", latitude: 41.88, longitude: -87.63 },
    { id: "ATL", latitude: 33.75, longitude: -84.39 },
    { id: "MIA", latitude: 25.76, longitude: -80.19 },
    { id: "NYC", latitude: 40.71, longitude: -74.01 },
    { id: "BOS", latitude: 42.36, longitude: -71.06 },
];

/** Routes between them, long enough that an arc stands clear of the map. */
const ROUTES = [
    { src: "SEA", dst: "NYC" },
    { src: "SFO", dst: "BOS" },
    { src: "LAX", dst: "MIA" },
    { src: "DEN", dst: "ATL" },
    { src: "CHI", dst: "DFW" },
];

interface MapArgs {
    viewMode: ViewMode;
    mapDimension: "2d" | "3d";
}

const meta: Meta<MapArgs> = {
    title: "Layout/Location Map",
    component: "graphty-element",
    decorators: [eventWaitingDecorator],
    argTypes: {
        viewMode: { control: { type: "select" }, options: ["2d", "3d"] },
        mapDimension: { control: { type: "select" }, options: ["2d", "3d"], name: "layoutConfig.mapDimension" },
    },
    render: (args) => {
        const element = document.createElement("graphty-element");
        element.style.cssText = "width: 100%; height: 100%; display: block;";
        element.viewMode = args.viewMode;
        element.nodeData = CITIES;
        element.edgeData = ROUTES;
        // The bundled gray world, so the picture never waits on a tile service.
        element.layoutConfig = { mapDimension: args.mapDimension, map: { source: "natural-earth-gray" } };
        element.layout = "location-map";
        return element;
    },
};
export default meta;

type Story = StoryObj<MapArgs>;

/**
 * Wait until the map under the graph is drawn: the element tells every change of its state as a
 * `basemap-status` event.
 * @param element - The element.
 */
async function mapReady(element: Graphty): Promise<void> {
    if (element.basemapStatus.state === "ready") {
        return;
    }

    await new Promise<void>((resolve) => {
        const listener = (): void => {
            if (element.basemapStatus.state === "ready") {
                element.removeEventListener("basemap-status", listener);
                resolve();
            }
        };
        element.addEventListener("basemap-status", listener);
    });
}

/**
 * Wait for the finished picture, then check the view and the map the element drew.
 * @param canvasElement - Where the story was rendered.
 * @param story - The story's name, for failure messages.
 * @param viewMode - The view the story asks for.
 * @param drawnMap - The map the element should draw there.
 */
async function mapDrawn(
    canvasElement: HTMLElement,
    story: string,
    viewMode: "2d" | "3d",
    drawnMap: "2d" | "3d",
): Promise<void> {
    const element = await renderedElement(canvasElement, `${story}: no <graphty-element>`);
    await mapReady(element);
    const scene = await drawn(canvasElement, `Layout/Location Map ${story}`);
    await assertGraphLoaded(scene, { nodes: CITIES.length, edges: ROUTES.length });
    await assertViewMode(scene, viewMode);
    const drawnDimension = element.mapFrame?.mapDimension;
    await holds(drawnDimension === drawnMap, `${story}: drew the ${String(drawnDimension)} map, not ${drawnMap}`);
}

/** A 2D map in the 2D view: the flat map, with straight edges on it. */
export const FlatMapIn2DView: Story = {
    name: "2D map in the 2D view",
    args: { viewMode: "2d", mapDimension: "2d" },
    play: async ({ canvasElement }) => {
        await mapDrawn(canvasElement, "FlatMapIn2DView", "2d", "2d");
    },
};

/** A 3D map asked for in the 2D view: not available there, so the flat map is drawn. */
export const GlobeAskedIn2DView: Story = {
    name: "3D map asked for in the 2D view",
    args: { viewMode: "2d", mapDimension: "3d" },
    play: async ({ canvasElement }) => {
        await mapDrawn(canvasElement, "GlobeAskedIn2DView", "2d", "2d");
    },
};

/** A 2D map in the 3D view: the flat map, with edges arced above it. */
export const FlatMapIn3DView: Story = {
    name: "2D map in the 3D view",
    args: { viewMode: "3d", mapDimension: "2d" },
    play: async ({ canvasElement }) => {
        await mapDrawn(canvasElement, "FlatMapIn3DView", "3d", "2d");
    },
};

/** A 3D map in the 3D view, the default: a globe, with edges arced above it. */
export const GlobeIn3DView: Story = {
    name: "3D map in the 3D view",
    args: { viewMode: "3d", mapDimension: "3d" },
    play: async ({ canvasElement }) => {
        await mapDrawn(canvasElement, "GlobeIn3DView", "3d", "3d");
    },
};
