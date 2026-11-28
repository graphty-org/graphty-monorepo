import { Color4 } from "@babylonjs/core";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, waitFor, within } from "storybook/test";

import { FlatMap, mapSources } from "../src/index.js";
import { boundsOf, type GeoBounds, longitudeIn, type ProjectionId } from "../src/projection/index.js";
import { CITIES, createMapView } from "./scene.js";

// The boxes the story shows: the whole world, or the box around some of the cities.
const REGIONS: Readonly<Record<string, GeoBounds | undefined>> = {
    World: undefined,
    "London to Nairobi": boundsOf([CITIES.London, CITIES.Nairobi]) ?? undefined,
    // across the date line: the box's east edge passes 180
    "Sydney to Suva": boundsOf([CITIES.Sydney, CITIES.Suva], { margin: 0.5 }) ?? undefined,
};

interface Args {
    region: string;
    projection: ProjectionId;
    source: "natural-earth" | "natural-earth-gray";
    beyond: "clip" | "continue";
}

const meta: Meta<Args> = {
    title: "Flat map",
    parameters: {
        docs: {
            description: {
                component:
                    "`new FlatMap(scene, { frame })` draws a map in the x-y plane, the frame's box centered on the " +
                    "origin and `size` scene units across, so a region uses the same small numbers as the world. " +
                    '`beyond: "continue"` draws the map on past the box. Drag to turn and scroll to zoom.',
            },
        },
    },
    argTypes: {
        region: { control: "select", options: Object.keys(REGIONS) },
        projection: { control: "inline-radio", options: ["web-mercator", "equirectangular"] },
        source: { control: "select", options: ["natural-earth", "natural-earth-gray"] },
        beyond: { control: "inline-radio", options: ["clip", "continue"] },
    },
};
export default meta;

/** A map of a region in a projection, with the cities in it marked. */
export const Region: StoryObj<Args> = {
    args: { region: "World", projection: "web-mercator", source: "natural-earth", beyond: "clip" },
    render: ({ region, projection, source, beyond }) => {
        const view = createMapView({ distance: 140, background: new Color4(1, 1, 1, 1) });
        const bounds = REGIONS[region];
        const map = new FlatMap(view.scene, {
            sources: [mapSources[source]],
            frame: { projection, bounds, size: 100 },
            beyond,
        });
        view.watch(map);
        const box = map.frame.bounds;
        for (const { lat, lon } of Object.values(CITIES)) {
            const point = { lat, lon: longitudeIn(lon, box) };
            if (point.lon >= box[0][0] && point.lon <= box[1][0] && lat >= box[0][1] && lat <= box[1][1]) {
                view.mark(map.toScene(point), 2);
            }
        }
        return view.element;
    },
    play: async ({ canvasElement }) => {
        const status = await within(canvasElement).findByTestId("status");
        await waitFor(() => expect(status.dataset.state).toBe("ready"));
    },
};

/** A box across the date line, drawn from both sides of it. */
export const AcrossTheDateLine: StoryObj<Args> = {
    ...Region,
    args: { region: "Sydney to Suva", projection: "web-mercator", source: "natural-earth", beyond: "continue" },
};
