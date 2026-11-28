import { Color4 } from "@babylonjs/core";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, waitFor, within } from "storybook/test";

import { Globe, mapSources } from "../src/index.js";
import { CITIES, createMapView } from "./scene.js";

interface Args {
    source: "natural-earth" | "natural-earth-gray";
    atmosphere: boolean;
    sun: boolean;
    sunLatitude: number;
    sunLongitude: number;
}

const meta: Meta<Args> = {
    title: "Globe",
    parameters: {
        docs: {
            description: {
                component:
                    "`new Globe(scene, options)` wraps a map round a sphere at the origin; `globe.toScene(point, lift)` " +
                    "places a point on it. Drag to turn the globe and scroll to zoom. The world picture ships in the " +
                    "package, so nothing is fetched from a tile service.",
            },
        },
    },
    argTypes: {
        source: { control: "select", options: ["natural-earth", "natural-earth-gray"] },
        sunLatitude: { control: { type: "range", min: -23.4, max: 23.4, step: 0.1 }, if: { arg: "sun" } },
        sunLongitude: { control: { type: "range", min: -180, max: 180, step: 1 }, if: { arg: "sun" } },
    },
};
export default meta;

/** A globe with the cities marked, the air's glow and an optional sun. */
export const Earth: StoryObj<Args> = {
    args: { source: "natural-earth", atmosphere: true, sun: false, sunLatitude: 23.4, sunLongitude: -30 },
    render: ({ source, atmosphere, sun, sunLatitude, sunLongitude }) => {
        const view = createMapView({ distance: 300, background: new Color4(0.02, 0.02, 0.06, 1) });
        const globe = new Globe(view.scene, {
            radius: 100,
            sources: [mapSources[source]],
            atmosphere,
            sun: sun ? { lat: sunLatitude, lon: sunLongitude } : null,
        });
        view.watch(globe);
        for (const city of Object.values(CITIES)) {
            view.mark(globe.toScene(city, 1), 3);
        }
        return view.element;
    },
    play: async ({ canvasElement }) => {
        const status = await within(canvasElement).findByTestId("status");
        await waitFor(() => expect(status.dataset.state).toBe("ready"));
    },
};
