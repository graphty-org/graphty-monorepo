import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, waitFor, within } from "storybook/test";

import { createMapFrame, latLonToSphere, type ProjectionId, projections } from "../src/projection/index.js";
import { CITIES, createOutput } from "./scene.js";

interface Args {
    projection: ProjectionId;
    city: string;
}

const meta: Meta<Args> = {
    title: "Projections",
    parameters: {
        docs: {
            description: {
                component:
                    "`babylonjs-map/projection` never loads Babylon.js. This story draws the graticule (every 15 " +
                    "degrees) and the cities on a 2D canvas with `createMapFrame(...).toScene`, and shows where a " +
                    "city lands in the projection, the frame and on a globe of radius 100 (`latLonToSphere`).",
            },
        },
    },
    argTypes: {
        projection: { control: "inline-radio", options: Object.keys(projections) },
        city: { control: "select", options: Object.keys(CITIES) },
    },
};
export default meta;

/** The world in a projection, and one city's coordinates. */
export const World: StoryObj<Args> = {
    args: { projection: "web-mercator", city: "London" },
    render: ({ projection, city }) => {
        const element = document.createElement("div");
        element.style.cssText = "display: flex; gap: 16px; align-items: flex-start; font-family: sans-serif;";
        const canvas = document.createElement("canvas");
        const output = createOutput("result");
        element.append(canvas, output);

        const frame = createMapFrame({ projection, size: 480 });
        canvas.width = frame.width;
        canvas.height = frame.height;
        canvas.style.border = "1px solid #ccc";
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return element;
        }
        // scene units have y north and the origin in the middle; the canvas has y down from the top left
        const px = (lat: number, lon: number): [number, number] => {
            const { x, y } = frame.toScene({ lat, lon });
            return [x + frame.width / 2, frame.height / 2 - y];
        };
        const [[, south], [, north]] = frame.bounds;
        ctx.strokeStyle = "#99a";
        ctx.beginPath();
        for (let lon = -180; lon <= 180; lon += 15) {
            for (let lat = south; lat <= north; lat += 1) {
                ctx[lat === south ? "moveTo" : "lineTo"](...px(Math.min(lat, north), lon));
            }
        }
        for (let lat = Math.ceil(south / 15) * 15; lat <= north; lat += 15) {
            ctx.moveTo(...px(lat, -180));
            ctx.lineTo(...px(lat, 180));
        }
        ctx.stroke();
        for (const [name, point] of Object.entries(CITIES)) {
            ctx.fillStyle = name === city ? "#d00" : "#333";
            ctx.beginPath();
            ctx.arc(...px(point.lat, point.lon), name === city ? 6 : 3, 0, 2 * Math.PI);
            ctx.fill();
        }

        const point = CITIES[city];
        output.textContent = JSON.stringify(
            {
                point,
                projected: frame.projection.forward(point),
                inFrame: frame.toScene(point),
                onGlobe: latLonToSphere(point, 100, "left"),
            },
            null,
            2,
        );
        output.dataset.state = "done";
        return element;
    },
    play: async ({ canvasElement }) => {
        const result = await within(canvasElement).findByTestId("result");
        await waitFor(() => expect(result.dataset.state).toBe("done"));
        await expect(result.textContent).toContain('"onGlobe"');
    },
};
